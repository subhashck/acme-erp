import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../server/db/client.ts";
import {
  leaveRequests,
  leaveTypes,
  payslips,
  staff,
  departments,
  staffDepartments,
} from "../server/db/schema.ts";
import { calculateLeaveDeductionRate } from "../server/routes/payroll.ts";

function getLocalDateStr(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

interface Options {
  dryRun: boolean;
  month?: string;
  staffId?: number;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  let dryRun = true; // Default to safe dry-run mode unless --apply is passed
  let month: string | undefined;
  let staffId: number | undefined;

  for (const arg of args) {
    if (arg === "--apply") {
      dryRun = false;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg.startsWith("--month=")) {
      month = arg.split("=")[1]?.trim();
    } else if (arg.startsWith("--staff-id=")) {
      staffId = Number(arg.split("=")[1]?.trim());
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: tsx scripts/recalculate_payslip_leave_deductions.ts [options]

Options:
  --dry-run       Preview changes without updating database (default)
  --apply         Apply changes to database
  --month=YYYY-MM Filter by target month (e.g. --month=2026-09)
  --staff-id=ID   Filter by specific staff ID
  --help, -h      Show this help message
`);
      process.exit(0);
    }
  }

  return { dryRun, month, staffId };
}

export async function recalculatePayslipLeaveDeductions(options: Options) {
  const { dryRun, month, staffId } = options;

  console.log("==========================================================");
  console.log(`Payslip Leave Deduction Recalculation Script`);
  console.log(`Mode: ${dryRun ? "DRY-RUN (No database writes)" : "APPLY (Writing changes to database)"}`);
  if (month) console.log(`Filter Month: ${month}`);
  if (staffId) console.log(`Filter Staff ID: ${staffId}`);
  console.log("==========================================================\n");

  // 1. Fetch leave types map
  const allLeaveTypes = await db.select().from(leaveTypes).execute();
  const leaveTypeMap: Record<string, { payable: boolean; paymentRate: number }> = {};
  for (const lt of allLeaveTypes) {
    leaveTypeMap[lt.name] = {
      payable: lt.payable,
      paymentRate: Number(lt.paymentRate || 0),
    };
  }

  console.log(`Loaded ${allLeaveTypes.length} leave types:`);
  for (const [name, info] of Object.entries(leaveTypeMap)) {
    const dedRate = calculateLeaveDeductionRate(info);
    console.log(`  • ${name}: payable=${info.payable}, paymentRate=${info.paymentRate}% -> deductionRate=${dedRate}%`);
  }
  console.log("");

  // 2. Query payslips to evaluate (excluding Superseded and Cancelled)
  let query = db
    .select({
      id: payslips.id,
      staffId: payslips.staffId,
      month: payslips.month,
      basicSalary: payslips.basicSalary,
      hra: payslips.hra,
      conveyance: payslips.conveyance,
      skillAllowance: payslips.skillAllowance,
      special: payslips.special,
      earnedLeaveEncashment: payslips.earnedLeaveEncashment,
      extraDayAllowance: payslips.extraDayAllowance,
      epf: payslips.epf,
      esi: payslips.esi,
      professionalTax: payslips.professionalTax,
      tds: payslips.tds,
      securityDeposit: payslips.securityDeposit,
      otherDeductions: payslips.otherDeductions,
      lateAttendance: payslips.lateAttendance,
      leaveDaysTaken: payslips.leaveDaysTaken,
      leaveDeduction: payslips.leaveDeduction,
      netSalary: payslips.netSalary,
      status: payslips.status,
      employeeName: staff.name,
      employeeCode: staff.employeeCode,
    })
    .from(payslips)
    .leftJoin(staff, sql`${payslips.staffId} = ${staff.staffId} AND ${staff.active} = true`)
    .where(
      sql`${payslips.status} NOT IN ('Superseded', 'Cancelled')`
    )
    .$dynamic();

  const conditions: any[] = [];
  if (month) {
    conditions.push(eq(payslips.month, month));
  }
  if (staffId) {
    conditions.push(eq(payslips.staffId, staffId));
  }
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const rows = await query.execute();
  console.log(`Found ${rows.length} non-superseded payslips to check.\n`);

  let checkedCount = 0;
  let affectedCount = 0;
  const updatesToApply: Array<{
    id: number;
    staffId: number;
    month: string;
    employeeName: string;
    status: string;
    oldLeaveDeduction: number;
    newLeaveDeduction: number;
    oldNetSalary: number;
    newNetSalary: number;
    newLeaveDaysTaken: number;
  }> = [];

  for (const p of rows) {
    checkedCount++;
    const [yStr, mStr] = p.month.split("-");
    const year = Number(yStr);
    const mon = Number(mStr);
    const daysInMonth = new Date(year, mon, 0).getDate();
    const monthStartStr = `${p.month}-01`;
    const monthEndStr = `${p.month}-${String(daysInMonth).padStart(2, "0")}`;

    const basic = Number(p.basicSalary || 0);
    const hra = Number(p.hra || 0);
    const conveyance = Number(p.conveyance || 0);
    const skillAllowance = Number(p.skillAllowance || 0);
    const special = Number(p.special || 0);
    const earnedLeaveEncashment = Number(p.earnedLeaveEncashment || 0);
    const extraDayAllowance = Number(p.extraDayAllowance || 0);

    const grossEarnings = basic + hra + conveyance + skillAllowance + special;
    const dailyRate = grossEarnings / daysInMonth;
    const totalGross = grossEarnings + earnedLeaveEncashment + extraDayAllowance;

    const statutoryDeductions =
      Number(p.epf || 0) +
      Number(p.esi || 0) +
      Number(p.professionalTax || 0) +
      Number(p.tds || 0) +
      Number(p.securityDeposit || 0) +
      Number(p.otherDeductions || 0) +
      Number(p.lateAttendance || 0);

    // Fetch approved leaves overlapping this target month
    const approvedLeaves = await db
      .select()
      .from(leaveRequests)
      .where(
        sql`${leaveRequests.staffId} = ${p.staffId} AND ${leaveRequests.status} = 'Approved' AND ${leaveRequests.endDate} >= ${monthStartStr} AND ${leaveRequests.startDate} <= ${monthEndStr}`
      )
      .execute();

    let newLeaveDaysTaken = 0;
    let newLeaveDeduction = 0;

    for (const lr of approvedLeaves) {
      const lrStartStr = getLocalDateStr(lr.startDate);
      const lrEndStr = getLocalDateStr(lr.endDate);
      if (lrEndStr < monthStartStr || lrStartStr > monthEndStr) {
        continue;
      }

      const overlapStartStr = lrStartStr < monthStartStr ? monthStartStr : lrStartStr;
      const overlapEndStr = lrEndStr > monthEndStr ? monthEndStr : lrEndStr;
      const d1 = new Date(`${overlapStartStr}T00:00:00Z`);
      const d2 = new Date(`${overlapEndStr}T00:00:00Z`);

      const days = lr.isHalfDay ? 0.5 : Math.max(
        1,
        Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1
      );
      newLeaveDaysTaken += days;

      const lt = leaveTypeMap[lr.leaveType];
      const deductionRate = calculateLeaveDeductionRate(lt);
      newLeaveDeduction += dailyRate * days * (deductionRate / 100);
    }

    newLeaveDeduction = Math.round(newLeaveDeduction * 100) / 100;
    const newNetSalary = Math.max(0, totalGross - statutoryDeductions - newLeaveDeduction);

    const oldLeaveDeduction = Number(p.leaveDeduction || 0);
    const oldNetSalary = Number(p.netSalary || 0);

    const isDeductionDiff = Math.abs(oldLeaveDeduction - newLeaveDeduction) >= 0.01;
    const isNetDiff = Math.abs(oldNetSalary - newNetSalary) >= 0.01;

    if (isDeductionDiff || isNetDiff) {
      affectedCount++;
      updatesToApply.push({
        id: p.id,
        staffId: p.staffId,
        month: p.month,
        employeeName: p.employeeName || `Staff #${p.staffId}`,
        status: p.status,
        oldLeaveDeduction,
        newLeaveDeduction,
        oldNetSalary,
        newNetSalary,
        newLeaveDaysTaken,
      });
    }
  }

  console.log(`Summary of findings:`);
  console.log(`  Total payslips checked: ${checkedCount}`);
  console.log(`  Payslips requiring correction: ${affectedCount}\n`);

  if (updatesToApply.length === 0) {
    console.log("No affected payslips found! All payslips are already consistent.");
    return { affectedCount: 0, updatedCount: 0 };
  }

  console.log(`Details of affected payslips:`);
  console.log(`--------------------------------------------------------------------------------`);
  for (const item of updatesToApply) {
    const diff = item.newNetSalary - item.oldNetSalary;
    const diffStr = diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
    console.log(
      `Payslip #${item.id} | ${item.month} | ${item.employeeName} (Status: ${item.status})`
    );
    console.log(
      `   Leave Deduction: ₹${item.oldLeaveDeduction.toFixed(2)} -> ₹${item.newLeaveDeduction.toFixed(2)}`
    );
    console.log(
      `   Net Salary:      ₹${item.oldNetSalary.toFixed(2)} -> ₹${item.newNetSalary.toFixed(2)} (${diffStr})`
    );
    if (item.status === "Paid") {
      console.log(`   [WARNING] Payslip is marked as PAID. Updating record will adjust ledger totals.`);
    }
    console.log(`--------------------------------------------------------------------------------`);
  }

  if (dryRun) {
    console.log("\n[DRY-RUN] No changes were written to the database.");
    console.log("To apply these changes, re-run with --apply:");
    console.log("   pnpm exec tsx scripts/recalculate_payslip_leave_deductions.ts --apply\n");
    return { affectedCount, updatedCount: 0 };
  }

  console.log(`\nApplying updates to ${updatesToApply.length} payslips...`);
  let updatedCount = 0;
  for (const item of updatesToApply) {
    await db
      .update(payslips)
      .set({
        leaveDaysTaken: String(item.newLeaveDaysTaken),
        leaveDeduction: String(item.newLeaveDeduction),
        netSalary: String(item.newNetSalary),
      })
      .where(eq(payslips.id, item.id))
      .execute();
    updatedCount++;
  }

  console.log(`Successfully updated ${updatedCount} payslips in the database.`);
  return { affectedCount, updatedCount };
}

// Direct execution from CLI
if (process.argv[1]?.includes("recalculate_payslip_leave_deductions")) {
  const options = parseArgs();
  recalculatePayslipLeaveDeductions(options)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error executing script:", err);
      process.exit(1);
    });
}
