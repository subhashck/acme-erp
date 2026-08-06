import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  departments,
  leaveRequests,
  leaveTypes,
  payslips,
  staff,
  staffDepartments,
  staffSalaries,
  rosters,
  attendance,
  dailyStaffAdvances,
  dailyClosingReports,
  dailyExpenditures,
  managementApprovers,
  securityDepositRefunds,
} from "../db/schema.ts";
import { idParam, getCurrentStaff, isManagementApprover } from "./shared.ts";

function formatPayslipWithBankDetails(row: any) {
  if (!row) return row;
  const bankName = (row.bankName || row.staffBankName || "").trim();
  const accountNumber = (row.accountNumber || row.staffAccountNumber || "").trim();
  const ifscCode = (row.ifscCode || row.staffIfscCode || "").trim();

  const hasBankInfo = Boolean(bankName && accountNumber);

  let paymentMode = row.paymentMode;
  if (!paymentMode) {
    paymentMode = hasBankInfo ? "Bank Transfer" : "Cash";
  }

  return {
    ...row,
    paymentMode,
    bankName: paymentMode === "Cash" ? null : (row.bankName || (paymentMode === "Bank Transfer" ? (bankName || null) : null)),
    accountNumber: paymentMode === "Bank Transfer" ? (accountNumber || null) : null,
    ifscCode: paymentMode === "Bank Transfer" ? (ifscCode || null) : null,
    chequeNumber: paymentMode === "Cheque" ? (row.chequeNumber || null) : null,
    chequeDate: paymentMode === "Cheque" ? (row.chequeDate || null) : null,
  };
}

export const payrollRoutes = new Hono<AuthEnv>()
  .get("/hr/payroll/payslips", async (c) => {
    const session = c.get("session");
    const isMgtApprover = await isManagementApprover(c);
    const isHrOrAdmin = session?.user.role === "admin" || session?.user.role === "hr" || isMgtApprover;
    const currentStaff = await getCurrentStaff(c);

    let whereClause = undefined;
    if (!isHrOrAdmin) {
      if (!currentStaff) {
        return c.json([]);
      }

      const isAccounts = await db
        .select({ name: departments.name })
        .from(staffDepartments)
        .innerJoin(departments, eq(staffDepartments.departmentId, departments.id))
        .where(
          and(
            eq(staffDepartments.staffId, currentStaff.staffId),
            eq(staffDepartments.status, "Active"),
            eq(departments.name, "Accounts")
          )
        )
        .limit(1)
        .then((res: any) => res.length > 0);

      if (isAccounts) {
        whereClause = or(
          eq(payslips.staffId, currentStaff.staffId),
          inArray(payslips.status, ["Approved by Management", "Approved by COO", "Paid"])
        );
      } else {
        whereClause = eq(payslips.staffId, currentStaff.staffId);
      }
    }

    const rows = await db
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
        version: payslips.version,
        status: payslips.status,
        paymentMode: payslips.paymentMode,
        bankName: payslips.bankName,
        accountNumber: payslips.accountNumber,
        ifscCode: payslips.ifscCode,
        chequeNumber: payslips.chequeNumber,
        chequeDate: payslips.chequeDate,
        hrNotes: payslips.hrNotes,
        cooNotes: payslips.cooNotes,
        accountsNotes: payslips.accountsNotes,
        createdAt: payslips.createdAt,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentName: departments.name,
        staffBankName: staffSalaries.bankName,
        staffAccountNumber: staffSalaries.accountNumber,
        staffIfscCode: staffSalaries.ifscCode,
      })
      .from(payslips)
      .innerJoin(staff, sql`${payslips.staffId} = ${staff.staffId} AND ${staff.active} = true`)
      .leftJoin(staffDepartments, sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active' AND ${staffDepartments.staffVersion} = ${staff.version}`)
      .leftJoin(departments, sql`${staffDepartments.departmentId} = ${departments.id} AND ${departments.active} = true`)
      .leftJoin(staffSalaries, sql`${staff.staffId} = ${staffSalaries.staffId} AND ${staff.version} = ${staffSalaries.staffVersion}`)
      .where(whereClause)
      .orderBy(desc(payslips.month), desc(payslips.createdAt))
      .execute();
    return c.json(rows.map(formatPayslipWithBankDetails));
  })
  .get("/hr/payroll/payslips/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());

    const row = await db
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
        version: payslips.version,
        status: payslips.status,
        paymentMode: payslips.paymentMode,
        bankName: payslips.bankName,
        accountNumber: payslips.accountNumber,
        ifscCode: payslips.ifscCode,
        chequeNumber: payslips.chequeNumber,
        chequeDate: payslips.chequeDate,
        hrNotes: payslips.hrNotes,
        cooNotes: payslips.cooNotes,
        accountsNotes: payslips.accountsNotes,
        createdAt: payslips.createdAt,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentName: departments.name,
        staffBankName: staffSalaries.bankName,
        staffAccountNumber: staffSalaries.accountNumber,
        staffIfscCode: staffSalaries.ifscCode,
      })
      .from(payslips)
      .innerJoin(staff, sql`${payslips.staffId} = ${staff.staffId} AND ${staff.active} = true`)
      .leftJoin(
        staffDepartments,
        sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(staffSalaries, sql`${staff.staffId} = ${staffSalaries.staffId} AND ${staff.version} = ${staffSalaries.staffVersion}`)
      .where(eq(payslips.id, id))
      .limit(1)
      .then((res: any) => res[0]);

    if (!row) return c.json({ error: "Payslip not found" }, 404);

    const formattedRow = formatPayslipWithBankDetails(row);

    const session = c.get("session");
    const isMgtApprover = await isManagementApprover(c);
    const isHrOrAdmin = session?.user.role === "admin" || session?.user.role === "hr" || isMgtApprover;
    const currentStaff = await getCurrentStaff(c);

    if (!isHrOrAdmin) {
      if (!currentStaff) {
        return c.json({ error: "Unauthorized" }, 403);
      }

      let isAccounts = false;
      if (currentStaff) {
        isAccounts = await db
          .select({ name: departments.name })
          .from(staffDepartments)
          .innerJoin(departments, eq(staffDepartments.departmentId, departments.id))
          .where(
            and(
              eq(staffDepartments.staffId, currentStaff.staffId),
              eq(staffDepartments.status, "Active"),
              eq(departments.name, "Accounts")
            )
          )
          .limit(1)
          .then((res: any) => res.length > 0);
      }

      const isApprovedOrPaid =
        row.status === "Approved by Management" ||
        row.status === "Approved by COO" ||
        row.status === "Paid";
      const isOwnPayslip = row.staffId === currentStaff.staffId;

      if (!isOwnPayslip && !(isAccounts && isApprovedOrPaid)) {
        return c.json({ error: "Unauthorized" }, 403);
      }
    }

    // Leave balance for the employee: current calendar year
    const year = row.month.slice(0, 4);
    const yearStart = new Date(`${year}-01-01T00:00:00Z`);
    const yearEnd = new Date(`${year}-12-31T23:59:59Z`);

    const allLeaveTypes = await db
      .select()
      .from(leaveTypes)
      .where(eq(leaveTypes.active, true))
      .execute();
    const queryYearStart = new Date(yearStart.getTime() - 24 * 60 * 60 * 1000);
    const queryYearEnd = new Date(yearEnd.getTime() + 24 * 60 * 60 * 1000);

    const approvedLeaves = await db
      .select()
      .from(leaveRequests)
      .where(
        sql`${leaveRequests.staffId} = ${row.staffId} AND ${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} >= ${queryYearStart.toISOString()} AND ${leaveRequests.startDate} <= ${queryYearEnd.toISOString()}`
      )
      .execute();

    const getLocalDateStr = (d: Date) => {
      return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    };
    const yearStartStr = `${year}-01-01`;
    const yearEndStr = `${year}-12-31`;

    // Count days taken per leave type
    const daysByType: Record<string, number> = {};
    for (const lr of approvedLeaves) {
      const lrStartStr = getLocalDateStr(lr.startDate);
      const lrEndStr = getLocalDateStr(lr.endDate);
      if (lrEndStr < yearStartStr || lrStartStr > yearEndStr) {
        continue;
      }
      const overlapStartStr = lrStartStr < yearStartStr ? yearStartStr : lrStartStr;
      const overlapEndStr = lrEndStr > yearEndStr ? yearEndStr : lrEndStr;
      const d1 = new Date(`${overlapStartStr}T00:00:00Z`);
      const d2 = new Date(`${overlapEndStr}T00:00:00Z`);
      const days = lr.isHalfDay
        ? 0.5
        : Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
      daysByType[lr.leaveType] = (daysByType[lr.leaveType] ?? 0) + days;
    }

    const leaveBalance = allLeaveTypes.map((lt) => ({
      leaveType: lt.name,
      maxDays: lt.maxDays,
      takenDays: daysByType[lt.name] ?? 0,
      remainingDays: Math.max(0, lt.maxDays - (daysByType[lt.name] ?? 0)),
    }));

    return c.json({ ...formattedRow, leaveBalance });
  })
  .post("/hr/payroll/payslips/:id/edit", async (c) => {
    const session = c.get("session");
    if (!session || (session.user.role !== "admin" && session.user.role !== "hr")) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    const { id } = idParam.parse(c.req.param());
    const input = z
      .object({
        basicSalary: z.coerce.number().min(0),
        hra: z.coerce.number().min(0),
        conveyance: z.coerce.number().min(0),
        skillAllowance: z.coerce.number().min(0).default(0),
        special: z.coerce.number().min(0),
        earnedLeaveEncashment: z.coerce.number().min(0).default(0),
        extraDayAllowance: z.coerce.number().min(0).default(0),
        epf: z.coerce.number().min(0),
        esi: z.coerce.number().min(0),
        professionalTax: z.coerce.number().min(0),
        tds: z.coerce.number().min(0).default(0),
        securityDeposit: z.coerce.number().min(0).default(0),
        otherDeductions: z.coerce.number().min(0),
        lateAttendance: z.coerce.number().min(0),
        leaveDaysTaken: z.coerce.number().min(0),
        leaveDeduction: z.coerce.number().min(0),
        hrNotes: z.string().optional().nullable(),
      })
      .parse(await c.req.json());

    const existing = await db
      .select()
      .from(payslips)
      .where(eq(payslips.id, id))
      .limit(1)
      .then((res: any) => res[0]);
    if (!existing) {
      return c.json({ error: "Payslip not found" }, 404);
    }
    if (existing.status !== "Active" && existing.status !== "Draft") {
      return c.json({ error: `Cannot edit a payslip with status '${existing.status}'. Once approved by Management or processed further, payslips cannot be modified.` }, 400);
    }

    const gross =
      input.basicSalary +
      input.hra +
      input.conveyance +
      input.skillAllowance +
      input.special +
      input.earnedLeaveEncashment +
      input.extraDayAllowance;
    const statutoryDeductions =
      input.epf +
      input.esi +
      input.professionalTax +
      input.tds +
      input.securityDeposit +
      input.otherDeductions +
      input.lateAttendance;
    const net = Math.max(0, gross - statutoryDeductions - input.leaveDeduction);

    await db
      .update(payslips)
      .set({ status: "Superseded" })
      .where(eq(payslips.id, id))
      .execute();

    const [newRow] = await db
      .insert(payslips)
      .values({
        staffId: existing.staffId,
        month: existing.month,
        basicSalary: String(input.basicSalary),
        hra: String(input.hra),
        conveyance: String(input.conveyance),
        skillAllowance: String(input.skillAllowance),
        special: String(input.special),
        earnedLeaveEncashment: String(input.earnedLeaveEncashment),
        extraDayAllowance: String(input.extraDayAllowance),
        epf: String(input.epf),
        esi: String(input.esi),
        professionalTax: String(input.professionalTax),
        tds: String(input.tds),
        securityDeposit: String(input.securityDeposit),
        otherDeductions: String(input.otherDeductions),
        lateAttendance: String(input.lateAttendance),
        leaveDaysTaken: String(input.leaveDaysTaken),
        leaveDeduction: String(input.leaveDeduction),
        netSalary: String(net),
        hrNotes: input.hrNotes !== undefined ? (input.hrNotes || null) : existing.hrNotes,
        cooNotes: existing.cooNotes,
        accountsNotes: existing.accountsNotes,
        version: existing.version + 1,
        status: "Draft",
      })
      .returning()
      .execute();

    return c.json(newRow);
  })
  .post("/hr/payroll/payslips/:id/approve", async (c) => {
    const session = c.get("session");
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const { id } = idParam.parse(c.req.param());
    const { targetStatus, note } = z
      .object({
        targetStatus: z.enum(["Approved by HR", "Approved by Management", "Approved by COO", "Paid", "Cancelled"]),
        note: z.string().optional().nullable(),
      })
      .parse(await c.req.json());

    const existing = await db
      .select({
        id: payslips.id,
        staffId: payslips.staffId,
        month: payslips.month,
        netSalary: payslips.netSalary,
        status: payslips.status,
        paymentMode: payslips.paymentMode,
        name: staff.name,
        employeeCode: staff.employeeCode,
        departmentName: departments.name,
      })
      .from(payslips)
      .leftJoin(staff, eq(payslips.staffId, staff.staffId))
      .leftJoin(
        staffDepartments,
        sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .where(eq(payslips.id, id))
      .limit(1)
      .then((res: any) => res[0]);

    if (!existing) {
      return c.json({ error: "Payslip not found" }, 404);
    }

    const currentStaff = await getCurrentStaff(c);

    // Check management approval authorization
    const isManagementApprover = currentStaff
      ? await db
          .select()
          .from(managementApprovers)
          .where(
            and(
              eq(managementApprovers.staffId, currentStaff.staffId),
              eq(managementApprovers.active, true)
            )
          )
          .limit(1)
          .then((res: any) => res.length > 0)
      : false;

    const isAuthorizedManagement =
      session.user.role === "admin" ||
      isManagementApprover ||
      currentStaff?.role === "Chief Operating Officer";

    if (targetStatus === "Cancelled") {
      if (
        existing.status === "Approved by Management" ||
        existing.status === "Approved by COO" ||
        existing.status === "Paid" ||
        existing.status === "Cancelled" ||
        existing.status === "Superseded"
      ) {
        return c.json({ error: `Cannot cancel a payslip with status '${existing.status}'. Once approved by Management, cancellation is not allowed.` }, 400);
      }

      const isHrOrAdmin = session.user.role === "admin" || session.user.role === "hr";

      let canCancel = false;
      let noteField: "hrNotes" | "cooNotes" = "hrNotes";

      if (existing.status === "Draft" || existing.status === "Active") {
        canCancel = isHrOrAdmin;
        noteField = "hrNotes";
      } else if (existing.status === "Approved by HR") {
        canCancel = isHrOrAdmin || isAuthorizedManagement;
        noteField = isAuthorizedManagement ? "cooNotes" : "hrNotes";
      }

      if (!canCancel) {
        return c.json({ error: "You are not authorized to cancel this payslip." }, 403);
      }

      const [updated] = await db
        .update(payslips)
        .set({ status: "Cancelled", [noteField]: note || "Cancelled" })
        .where(eq(payslips.id, id))
        .returning()
        .execute();
      return c.json(updated);
    }

    if (targetStatus === "Approved by HR") {
      if (existing.status !== "Active" && existing.status !== "Draft") {
        return c.json({ error: "Payslip must be Draft or Active to be approved by HR." }, 400);
      }
      const isHrOrAdmin = session.user.role === "admin" || session.user.role === "hr";
      if (!isHrOrAdmin) {
        return c.json({ error: "Only HR or Admin staff can approve payslips as HR." }, 403);
      }
      
      const [updated] = await db
        .update(payslips)
        .set({ status: targetStatus, hrNotes: note })
        .where(eq(payslips.id, id))
        .returning()
        .execute();
      return c.json(updated);
    } 
    
    if (targetStatus === "Approved by Management" || targetStatus === "Approved by COO") {
      if (existing.status !== "Approved by HR") {
        return c.json({ error: "Payslip must be Approved by HR to be approved by Management." }, 400);
      }
      if (!isAuthorizedManagement) {
        return c.json({ error: "Only designated Management Approvers or Admins can approve payslips at this stage." }, 403);
      }
      
      const [updated] = await db
        .update(payslips)
        .set({ status: "Approved by Management", cooNotes: note })
        .where(eq(payslips.id, id))
        .returning()
        .execute();
      return c.json(updated);
    }

    if (targetStatus === "Paid") {
      if (existing.status !== "Approved by Management" && existing.status !== "Approved by COO") {
        return c.json({ error: "Payslip must be Approved by Management before marking as Paid." }, 400);
      }
      if (!currentStaff) {
        return c.json({ error: "Staff profile required to approve payments." }, 403);
      }
      
      const isAccounts = await db
        .select({ name: departments.name })
        .from(staffDepartments)
        .innerJoin(departments, eq(staffDepartments.departmentId, departments.id))
        .where(
          and(
            eq(staffDepartments.staffId, currentStaff.staffId),
            eq(staffDepartments.status, "Active"),
            eq(departments.name, "Accounts")
          )
        )
        .limit(1)
        .then((res: any) => res.length > 0);

      const isAuthorized = session.user.role === "admin" || isAccounts;
      if (!isAuthorized) {
        return c.json({ error: "Only staff from the Accounts department can mark payslips as Paid." }, 403);
      }

      const [updated] = await db
        .update(payslips)
        .set({ status: targetStatus, accountsNotes: note })
        .where(eq(payslips.id, id))
        .returning()
        .execute();

      // If CASH payment mode, auto-create expense item in Accounts Daily Closing Report
      const paymentMode = (updated.paymentMode || "Bank Transfer").trim();
      if (paymentMode.toLowerCase() === "cash") {
        const todayStr = new Date().toISOString().slice(0, 10);
        let report = await db
          .select()
          .from(dailyClosingReports)
          .where(eq(dailyClosingReports.reportDate, todayStr))
          .limit(1)
          .then((res: any) => res[0]);

        if (!report) {
          const [newReport] = await db
            .insert(dailyClosingReports)
            .values({
              reportDate: todayStr,
              createdBy: session.user.id,
              openingBalance: "0",
              status: "draft",
            })
            .returning()
            .execute();
          report = newReport;
        }

        if (report) {
          const staffName = existing.name || "Staff";
          const empCodeStr = existing.employeeCode ? ` (${existing.employeeCode})` : "";
          const deptStr = existing.departmentName ? ` - ${existing.departmentName}` : "";

          await db
            .insert(dailyExpenditures)
            .values({
              reportId: report.id,
              category: "Salary",
              details: `Salary Payment - ${staffName}${empCodeStr}${deptStr} - ${existing.month}`,
              amount: String(updated.netSalary || existing.netSalary),
              narration: `Cash salary payment for ${staffName}${existing.departmentName ? ` (${existing.departmentName})` : ""}${existing.employeeCode ? ` [${existing.employeeCode}]` : ""} for ${existing.month} (Payslip #${existing.id})`,
            })
            .execute();
        }
      }

      return c.json(updated);
    }

    return c.json({ error: "Invalid target status" }, 400);
  })
  .post("/hr/payroll/payslips/bulk-approve", async (c) => {
    const session = c.get("session");
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const { items, targetStatus } = z
      .object({
        items: z.array(
          z.object({
            id: z.number().int().positive(),
            note: z.string().optional().nullable(),
          })
        ),
        targetStatus: z.enum([
          "Approved by HR",
          "Approved by Management",
          "Approved by COO",
          "Paid",
          "Cancelled",
        ]),
      })
      .parse(await c.req.json());

    if (items.length === 0) {
      return c.json({ count: 0, updated: [] });
    }

    const currentStaff = await getCurrentStaff(c);

    // Authorization checks
    const isHrOrAdmin = session.user.role === "admin" || session.user.role === "hr";

    const isManagementApprover = currentStaff
      ? await db
          .select()
          .from(managementApprovers)
          .where(
            and(
              eq(managementApprovers.staffId, currentStaff.staffId),
              eq(managementApprovers.active, true)
            )
          )
          .limit(1)
          .then((res: any) => res.length > 0)
      : false;

    const isAuthorizedManagement =
      session.user.role === "admin" ||
      isManagementApprover ||
      currentStaff?.role === "Chief Operating Officer";

    const isAccounts = currentStaff
      ? await db
          .select({ name: departments.name })
          .from(staffDepartments)
          .innerJoin(departments, eq(staffDepartments.departmentId, departments.id))
          .where(
            and(
              eq(staffDepartments.staffId, currentStaff.staffId),
              eq(staffDepartments.status, "Active"),
              eq(departments.name, "Accounts")
            )
          )
          .limit(1)
          .then((res: any) => res.length > 0)
      : false;

    const isAuthorizedAccounts = session.user.role === "admin" || isAccounts;

    if (targetStatus === "Approved by HR" && !isHrOrAdmin) {
      return c.json({ error: "Only HR or Admin staff can approve payslips as HR." }, 403);
    }
    if (
      (targetStatus === "Approved by Management" || targetStatus === "Approved by COO") &&
      !isAuthorizedManagement
    ) {
      return c.json({ error: "Only Management Approvers or Admins can approve payslips at Management stage." }, 403);
    }
    if (targetStatus === "Paid" && !isAuthorizedAccounts) {
      return c.json({ error: "Only Accounts staff or Admins can mark payslips as Paid." }, 403);
    }

    const ids = items.map((i) => i.id);
    const existingList = await db
      .select({
        id: payslips.id,
        staffId: payslips.staffId,
        month: payslips.month,
        netSalary: payslips.netSalary,
        status: payslips.status,
        paymentMode: payslips.paymentMode,
        name: staff.name,
        employeeCode: staff.employeeCode,
        departmentName: departments.name,
      })
      .from(payslips)
      .leftJoin(staff, eq(payslips.staffId, staff.staffId))
      .leftJoin(
        staffDepartments,
        sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .where(inArray(payslips.id, ids));

    const itemNoteMap = new Map(items.map((i) => [i.id, i.note]));

    const updatedResults = [];
    for (const existing of existingList) {
      const note = itemNoteMap.get(existing.id) ?? null;

      if (targetStatus === "Approved by HR") {
        if (existing.status !== "Active" && existing.status !== "Draft") continue;
        const [up] = await db
          .update(payslips)
          .set({ status: targetStatus, hrNotes: note })
          .where(eq(payslips.id, existing.id))
          .returning()
          .execute();
        updatedResults.push(up);
      } else if (
        targetStatus === "Approved by Management" ||
        targetStatus === "Approved by COO"
      ) {
        if (existing.status !== "Approved by HR") continue;
        const [up] = await db
          .update(payslips)
          .set({ status: "Approved by Management", cooNotes: note })
          .where(eq(payslips.id, existing.id))
          .returning()
          .execute();
        updatedResults.push(up);
      } else if (targetStatus === "Paid") {
        if (
          existing.status !== "Approved by Management" &&
          existing.status !== "Approved by COO"
        )
          continue;
        const [up] = await db
          .update(payslips)
          .set({ status: "Paid", accountsNotes: note })
          .where(eq(payslips.id, existing.id))
          .returning()
          .execute();

        // If CASH payment mode, auto-create expense item in Accounts Daily Closing Report
        const paymentMode = (up.paymentMode || "Bank Transfer").trim();
        if (paymentMode.toLowerCase() === "cash") {
          const todayStr = new Date().toISOString().slice(0, 10);
          let report = await db
            .select()
            .from(dailyClosingReports)
            .where(eq(dailyClosingReports.reportDate, todayStr))
            .limit(1)
            .then((res: any) => res[0]);

          if (!report) {
            const [newReport] = await db
              .insert(dailyClosingReports)
              .values({
                reportDate: todayStr,
                createdBy: session.user.id,
                openingBalance: "0",
                status: "draft",
              })
              .returning()
              .execute();
            report = newReport;
          }

          if (report) {
            const staffName = existing.name || "Staff";
            const empCodeStr = existing.employeeCode ? ` (${existing.employeeCode})` : "";
            const deptStr = existing.departmentName ? ` - ${existing.departmentName}` : "";

            await db
              .insert(dailyExpenditures)
              .values({
                reportId: report.id,
                category: "Salary",
                details: `Salary Payment - ${staffName}${empCodeStr}${deptStr} - ${existing.month}`,
                amount: String(up.netSalary || existing.netSalary),
                narration: `Cash salary payment for ${staffName}${existing.departmentName ? ` (${existing.departmentName})` : ""}${existing.employeeCode ? ` [${existing.employeeCode}]` : ""} for ${existing.month} (Payslip #${existing.id})`,
              })
              .execute();
          }
        }
        updatedResults.push(up);
      } else if (targetStatus === "Cancelled") {
        if (
          existing.status === "Approved by Management" ||
          existing.status === "Approved by COO" ||
          existing.status === "Paid" ||
          existing.status === "Cancelled" ||
          existing.status === "Superseded"
        )
          continue;

        let noteField: "hrNotes" | "cooNotes" = "hrNotes";
        if (existing.status === "Approved by HR") {
          noteField = isAuthorizedManagement ? "cooNotes" : "hrNotes";
        }
        const [up] = await db
          .update(payslips)
          .set({ status: "Cancelled", [noteField]: note || "Cancelled" })
          .where(eq(payslips.id, existing.id))
          .returning()
          .execute();
        updatedResults.push(up);
      }
    }

    return c.json({ count: updatedResults.length, updated: updatedResults });
  })
  .post("/hr/payroll/payslips/:id/payment-details", async (c) => {
    const session = c.get("session");
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const { id } = idParam.parse(c.req.param());
    const input = z
      .object({
        paymentMode: z.enum(["Cash", "Bank Transfer", "Cheque"]),
        bankName: z.string().optional().nullable(),
        accountNumber: z.string().optional().nullable(),
        ifscCode: z.string().optional().nullable(),
        chequeNumber: z.string().optional().nullable(),
        chequeDate: z.string().optional().nullable(),
      })
      .parse(await c.req.json());

    const existing = await db
      .select()
      .from(payslips)
      .where(eq(payslips.id, id))
      .limit(1)
      .then((res: any) => res[0]);

    if (!existing) {
      return c.json({ error: "Payslip not found" }, 404);
    }

    if (existing.status === "Paid" || existing.status === "Cancelled" || existing.status === "Superseded") {
      return c.json({ error: `Cannot update payment details for payslip with status: ${existing.status}` }, 400);
    }

    const currentStaff = await getCurrentStaff(c);
    const isHrOrAdmin = session.user.role === "admin" || session.user.role === "hr";

    let isAccounts = false;
    if (currentStaff) {
      isAccounts = await db
        .select({ name: departments.name })
        .from(staffDepartments)
        .innerJoin(departments, eq(staffDepartments.departmentId, departments.id))
        .where(
          and(
            eq(staffDepartments.staffId, currentStaff.staffId),
            eq(staffDepartments.status, "Active"),
            eq(departments.name, "Accounts")
          )
        )
        .limit(1)
        .then((res: any) => res.length > 0);
    }

    if (!isHrOrAdmin && !isAccounts) {
      return c.json({ error: "Only Accounts or HR/Admin staff can update payslip payment details." }, 403);
    }

    const [updated] = await db
      .update(payslips)
      .set({
        paymentMode: input.paymentMode,
        bankName: input.paymentMode === "Cash" ? null : input.bankName || null,
        accountNumber: input.paymentMode === "Bank Transfer" ? input.accountNumber || null : null,
        ifscCode: input.paymentMode === "Bank Transfer" ? input.ifscCode || null : null,
        chequeNumber: input.paymentMode === "Cheque" ? input.chequeNumber || null : null,
        chequeDate: input.paymentMode === "Cheque" ? input.chequeDate || null : null,
      })
      .where(eq(payslips.id, id))
      .returning()
      .execute();

    return c.json(updated);
  })
  .post("/hr/payroll/generate", async (c) => {
    const session = c.get("session");
    if (!session || (session.user.role !== "admin" && session.user.role !== "hr")) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    const { month, staffId, departmentId } = z
      .object({
        month: z.string().regex(/^\d{4}-\d{2}$/, "Format: YYYY-MM"),
        staffId: z.number().int().positive().optional().nullable(),
        departmentId: z.number().int().positive().optional().nullable(),
      })
      .parse(await c.req.json());

    // Calculate calendar days in the target month
    const [year, mon] = month.split("-").map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();

    // Month boundaries as Unix seconds
    const monthStart = new Date(`${month}-01T00:00:00Z`);
    const monthEnd = new Date(year, mon, 0, 23, 59, 59);

    // Get active staff matching filters
    let activeStaff: (typeof staff.$inferSelect)[] = [];
    if (staffId) {
      activeStaff = await db
        .select()
        .from(staff)
        .where(
          sql`${staff.status} = 'Active' AND ${staff.staffId} = ${staffId} AND ${staff.active} = true`
        )
        .execute();
    } else if (departmentId) {
      const rows = await db
        .select({ staff })
        .from(staff)
        .innerJoin(
          staffDepartments,
          sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`
        )
        .where(
          sql`${staff.status} = 'Active' AND ${staffDepartments.departmentId} = ${departmentId} AND ${staff.active} = true`
        )
        .execute();
      activeStaff = rows.map((r) => r.staff);
    } else {
      activeStaff = await db
        .select()
        .from(staff)
        .where(sql`${staff.status} = 'Active' AND ${staff.active} = true`)
        .execute();
    }

    const getLocalDateStr = (d: Date) => {
      return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    };
    const monthStartStr = `${month}-01`;
    const monthEndStr = `${month}-${String(daysInMonth).padStart(2, "0")}`;

    // Broaden UTC range by 1 day on both ends to capture timezone border leaves
    const queryStart = new Date(monthStart.getTime() - 24 * 60 * 60 * 1000);
    const queryEnd = new Date(monthEnd.getTime() + 24 * 60 * 60 * 1000);

    const staffIds = activeStaff.map((s) => s.staffId);
    if (staffIds.length === 0) {
      return c.json({ error: "No active employees found to generate payroll." }, 400);
    }

    const pendingLeaves = await db
      .select()
      .from(leaveRequests)
      .where(
        sql`${leaveRequests.status} IN ('Pending', 'Forwarded', 'Pending Payroll Approval') AND ${leaveRequests.endDate} >= ${queryStart.toISOString()} AND ${leaveRequests.startDate} <= ${queryEnd.toISOString()}`
      )
      .execute();

    const staffIdsSet = new Set(staffIds);
    const overlappingPendingLeaves = pendingLeaves.filter((lr) => {
      if (!staffIdsSet.has(lr.staffId)) return false;
      const lrStartStr = getLocalDateStr(lr.startDate);
      const lrEndStr = getLocalDateStr(lr.endDate);
      return lrEndStr >= monthStartStr && lrStartStr <= monthEndStr;
    });

    if (overlappingPendingLeaves.length > 0) {
      const staffMap = new Map(activeStaff.map((s) => [s.staffId, s.name]));
      const details = overlappingPendingLeaves
        .map((lr) => {
          const empName = staffMap.get(lr.staffId) || `Staff ID ${lr.staffId}`;
          return `${empName} (Leave request ${lr.requestNo || lr.id})`;
        })
        .join(", ");
      return c.json(
        {
          error: `Cannot generate payroll: Pending leave requests exist for target month: ${details}. Please approve or reject them first.`
        },
        400
      );
    }

    // Guardrail against undefined salary structures
    const staffLackingSalary = await db
      .select({
        staffId: staff.staffId,
        name: staff.name,
      })
      .from(staff)
      .leftJoin(
        staffSalaries,
        sql`${staff.staffId} = ${staffSalaries.staffId} AND ${staff.version} = ${staffSalaries.staffVersion}`
      )
      .where(
        and(
          inArray(staff.staffId, staffIds),
          eq(staff.active, true),
          sql`${staffSalaries.id} IS NULL`
        )
      )
      .execute();

    if (staffLackingSalary.length > 0) {
      const names = staffLackingSalary.map((s) => s.name).join(", ");
      return c.json(
        {
          error: `Cannot generate payroll: Salary structure is not defined for active staff: ${names}. Please define salary structures first.`
        },
        400
      );
    }

    // Get all active leave types for deduction lookup
    const allLeaveTypes = await db.select().from(leaveTypes).execute();
    const leaveTypeMap: Record<string, { payable: boolean; paymentRate: number }> =
      {};
    for (const lt of allLeaveTypes) {
      leaveTypeMap[lt.name] = {
        payable: lt.payable,
        paymentRate: Number(lt.paymentRate || 0),
      };
    }

    let generatedCount = 0;
    const skippedEmployees: string[] = [];

    for (const employee of activeStaff) {
      // Get salary structure
      const structure = await db
        .select()
        .from(staffSalaries)
        .where(and(eq(staffSalaries.staffId, employee.staffId), eq(staffSalaries.staffVersion, employee.version)))
        .limit(1)
        .then((res: any) => res[0]);

      // Get monthly advances for this staff member
      const advancesRows = await db
        .select({ amount: dailyStaffAdvances.amount })
        .from(dailyStaffAdvances)
        .innerJoin(dailyClosingReports, eq(dailyStaffAdvances.reportId, dailyClosingReports.id))
        .where(
          and(
            eq(dailyStaffAdvances.staffId, employee.staffId),
            sql`${dailyClosingReports.reportDate} LIKE ${month + "-%"}`
          )
        )
        .execute();

      const totalAdvances = advancesRows.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

      let basic = 0,
        hra = 0,
        conveyance = 0,
        skillAllowance = 0,
        special = 0;
      let epf = 0,
        esi = 0,
        profTax = 0,
        tds = 0,
        securityDeposit = 0,
        otherDed = 0,
        lateAtt = 0;

      if (structure) {
        basic = Number(structure.basicSalary || 0);
        hra = Number(structure.hra || 0);
        conveyance = Number(structure.conveyance || 0);
        skillAllowance = Number(structure.skillAllowance || 0);
        special = Number(structure.special || 0);
        epf = Number(structure.epf || 0);
        esi = Number(structure.esi || 0);
        profTax = Number(structure.professionalTax || 0);
        otherDed = Number(structure.otherDeductions || 0);
        lateAtt = Number(structure.lateAttendance || 0);

        // TDS calculation
        if (structure.deductTds) {
          const explicitTds = Number(structure.tds || 0);
          const tdsPct = Number(structure.tdsPercent ?? 10);
          const grossTemp = basic + hra + conveyance + skillAllowance + special;
          tds = explicitTds > 0 ? explicitTds : Math.round((tdsPct / 100) * grossTemp);
        }

        // Security Deposit calculation
        const secTotal = Number(structure.securityDepositTotal || 0);
        const secMonthly = Number(structure.securityDeposit || 0);
        const startMonth = structure.securityDepositStartMonth;

        if (secTotal > 0 && secMonthly > 0) {
          if (startMonth && month < startMonth) {
            securityDeposit = 0;
          } else {
            let precedingPaid = 0;
            if (startMonth) {
              const joinDateStr = employee.employmentStartDate || employee.createdAt;
              const joinMonth = joinDateStr ? getLocalDateStr(new Date(joinDateStr)).slice(0, 7) : startMonth;
              if (joinMonth < startMonth) {
                const [jY, jM] = joinMonth.split("-").map(Number);
                const [sY, sM] = startMonth.split("-").map(Number);
                const precedingMonthsCount = Math.max(0, (sY - jY) * 12 + (sM - jM));
                precedingPaid = Math.min(secTotal, precedingMonthsCount * secMonthly);
              }
            }

            const pastPayslips = await db
              .select({ secDep: payslips.securityDeposit })
              .from(payslips)
              .where(
                and(
                  eq(payslips.staffId, employee.staffId),
                  sql`${payslips.status} != 'Superseded'`,
                  sql`${payslips.month} != ${month}`
                )
              )
              .execute();
            const actualDeducted = pastPayslips.reduce((s, p) => s + Number(p.secDep || 0), 0);
            const alreadyCollected = Math.min(secTotal, precedingPaid + actualDeducted);
            const remainingSec = Math.max(0, secTotal - alreadyCollected);
            securityDeposit = Math.min(secMonthly, remainingSec);
          }
        }
      } else {
        const total = Number(employee.salary || 0);
        basic = Math.round(total * 0.5);
        hra = Math.round(total * 0.3);
        conveyance = Math.round(total * 0.1);
        skillAllowance = Math.round(total * 0.05);
        special = Math.round(total * 0.05);
      }

      otherDed += totalAdvances;

      const gross = basic + hra + conveyance + skillAllowance + special;
      const dailyRate = gross / daysInMonth;

      const queryStart = new Date(monthStart.getTime() - 24 * 60 * 60 * 1000);
      const queryEnd = new Date(monthEnd.getTime() + 24 * 60 * 60 * 1000);

      // Count approved leave days overlapping with the target month
      const approvedLeaves = await db
        .select()
        .from(leaveRequests)
        .where(
          sql`${leaveRequests.staffId} = ${employee.staffId} AND ${leaveRequests.status} = 'Approved' AND ${leaveRequests.endDate} >= ${queryStart.toISOString()} AND ${leaveRequests.startDate} <= ${queryEnd.toISOString()}`
        )
        .execute();

      let leaveDaysTaken = 0;
      let leaveDeduction = 0;

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
        leaveDaysTaken += days;

        const lt = leaveTypeMap[lr.leaveType];
        const deductionRate = lt ? (!lt.payable ? 100 : lt.paymentRate) : 100;
        leaveDeduction += dailyRate * days * (deductionRate / 100);
      }

      leaveDeduction = Math.round(leaveDeduction * 100) / 100;
      const statutoryDeductions = epf + esi + profTax + tds + securityDeposit + otherDed + lateAtt;
      const net = Math.max(0, gross - statutoryDeductions - leaveDeduction);

      // Versioning: supersede existing active/draft payslip for same month
      const existing = await db
        .select()
        .from(payslips)
        .where(
          sql`${payslips.staffId} = ${employee.staffId} AND ${payslips.month} = ${month} AND ${payslips.status} != 'Superseded'`
        )
        .limit(1)
        .then((res: any) => res[0]);

      const bankName = structure?.bankName || null;
      const accountNumber = structure?.accountNumber || null;
      const ifscCode = structure?.ifscCode || null;
      const paymentMode = bankName && accountNumber ? "Bank Transfer" : "Cash";

      const payslipValues = {
        staffId: employee.staffId,
        month,
        basicSalary: String(basic),
        hra: String(hra),
        conveyance: String(conveyance),
        skillAllowance: String(skillAllowance),
        special: String(special),
        earnedLeaveEncashment: "0",
        extraDayAllowance: "0",
        epf: String(epf),
        esi: String(esi),
        professionalTax: String(profTax),
        tds: String(tds),
        securityDeposit: String(securityDeposit),
        otherDeductions: String(otherDed),
        lateAttendance: String(lateAtt),
        leaveDaysTaken: String(leaveDaysTaken),
        leaveDeduction: String(leaveDeduction),
        netSalary: String(net),
        status: "Draft" as const,
        paymentMode,
        bankName,
        accountNumber,
        ifscCode,
      };

      if (existing) {
        if (
          existing.status === "Approved by Management" ||
          existing.status === "Approved by COO" ||
          existing.status === "Paid"
        ) {
          skippedEmployees.push(`${employee.name} (${existing.status})`);
          continue;
        }

        await db
          .update(payslips)
          .set({ status: "Superseded" })
          .where(eq(payslips.id, existing.id))
          .execute();
        await db
          .insert(payslips)
          .values({ ...payslipValues, version: existing.version + 1 })
          .execute();
      } else {
        await db
          .insert(payslips)
          .values({ ...payslipValues, version: 1 })
          .execute();
      }
      generatedCount++;
    }

    return c.json({ ok: true, generatedCount, skippedEmployees });
  })
  /**
   * GET /hr/security-deposits
   * Returns list of staff with security deposit targets, total collected, total refunded, and net balance.
   */
  .get("/hr/security-deposits", async (c) => {
    const session = c.get("session");
    const isMgtApprover = await isManagementApprover(c);
    if (!session || (session.user.role !== "admin" && session.user.role !== "hr" && !isMgtApprover)) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const activeStaff = await db
      .select({
        staffId: staff.staffId,
        version: staff.version,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        status: staff.status,
        employmentStartDate: staff.employmentStartDate,
        createdAt: staff.createdAt,
        departmentName: departments.name,
        securityDepositTotal: staffSalaries.securityDepositTotal,
        securityDeposit: staffSalaries.securityDeposit,
        securityDepositStartMonth: staffSalaries.securityDepositStartMonth,
      })
      .from(staff)
      .leftJoin(
        staffDepartments,
        sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staff.version} = ${staffDepartments.staffVersion} AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(
        staffSalaries,
        sql`${staff.staffId} = ${staffSalaries.staffId} AND ${staff.version} = ${staffSalaries.staffVersion}`
      )
      .where(eq(staff.active, true))
      .orderBy(staff.name)
      .execute();

    const allDeductions = await db
      .select({
        staffId: payslips.staffId,
        securityDeposit: payslips.securityDeposit,
      })
      .from(payslips)
      .where(sql`${payslips.status} != 'Superseded'`)
      .execute();

    const deductionsByStaff: Record<number, number> = {};
    for (const p of allDeductions) {
      deductionsByStaff[p.staffId] = (deductionsByStaff[p.staffId] || 0) + Number(p.securityDeposit || 0);
    }

    const allRefunds = await db
      .select({
        id: securityDepositRefunds.id,
        staffId: securityDepositRefunds.staffId,
        amount: securityDepositRefunds.amount,
        refundDate: securityDepositRefunds.refundDate,
        notes: securityDepositRefunds.notes,
        createdAt: securityDepositRefunds.createdAt,
      })
      .from(securityDepositRefunds)
      .orderBy(desc(securityDepositRefunds.createdAt))
      .execute();

    const refundsByStaff: Record<number, number> = {};
    for (const r of allRefunds) {
      refundsByStaff[r.staffId] = (refundsByStaff[r.staffId] || 0) + Number(r.amount || 0);
    }

    const list = activeStaff.map((s) => {
      const target = Number(s.securityDepositTotal || 0);
      const monthlyDeduction = Number(s.securityDeposit || 0);
      const startMonth = s.securityDepositStartMonth;

      let precedingPaid = 0;
      if (target > 0 && monthlyDeduction > 0 && startMonth) {
        const joinDateStr = s.employmentStartDate || s.createdAt;
        const joinMonth = joinDateStr ? String(joinDateStr).slice(0, 7) : startMonth;
        if (joinMonth < startMonth) {
          const [jY, jM] = joinMonth.split("-").map(Number);
          const [sY, sM] = startMonth.split("-").map(Number);
          const precedingMonthsCount = Math.max(0, (sY - jY) * 12 + (sM - jM));
          precedingPaid = Math.min(target, precedingMonthsCount * monthlyDeduction);
        }
      }

      const actualDeducted = deductionsByStaff[s.staffId] || 0;
      const totalDeducted = Math.min(target, precedingPaid + actualDeducted);
      const totalRefunded = refundsByStaff[s.staffId] || 0;
      const netHeld = Math.max(0, totalDeducted - totalRefunded);

      let status = "Not Started";
      if (totalRefunded > 0 && netHeld === 0) {
        status = "Fully Refunded";
      } else if (totalRefunded > 0) {
        status = "Partially Refunded";
      } else if (target > 0 && totalDeducted >= target) {
        status = "Fully Collected";
      } else if (totalDeducted > 0) {
        status = "In Progress";
      }

      return {
        staffId: s.staffId,
        version: s.version,
        employeeCode: s.employeeCode,
        name: s.name,
        role: s.role,
        departmentName: s.departmentName,
        targetAmount: target,
        monthlyDeduction,
        securityDepositStartMonth: startMonth,
        totalDeducted,
        totalRefunded,
        netHeld,
        status,
        refundHistory: allRefunds.filter((r) => r.staffId === s.staffId),
      };
    });

    const summary = {
      totalTarget: list.reduce((acc, curr) => acc + curr.targetAmount, 0),
      totalCollected: list.reduce((acc, curr) => acc + curr.totalDeducted, 0),
      totalRefunded: list.reduce((acc, curr) => acc + curr.totalRefunded, 0),
      totalNetHeld: list.reduce((acc, curr) => acc + curr.netHeld, 0),
    };

    return c.json({ summary, list });
  })
  /**
   * POST /hr/security-deposits/:staffId/target
   * Form endpoint to set or update the Security Deposit target total and monthly deduction for a staff member.
   */
  .post("/hr/security-deposits/:staffId/target", async (c) => {
    const session = c.get("session");
    if (!session || (session.user.role !== "admin" && session.user.role !== "hr")) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    const staffId = parseInt(c.req.param("staffId"), 10);
    const { securityDepositTotal, securityDeposit, securityDepositStartMonth } = z
      .object({
        securityDepositTotal: z.coerce.number().min(0),
        securityDeposit: z.coerce.number().min(0),
        securityDepositStartMonth: z.string().optional().nullable(),
      })
      .parse(await c.req.json());

    const activeStaff = await db
      .select()
      .from(staff)
      .where(and(eq(staff.staffId, staffId), eq(staff.active, true)))
      .limit(1)
      .then((res: any) => res[0]);

    if (!activeStaff) {
      return c.json({ error: "Staff member not found" }, 404);
    }

    const currentSalary = await db
      .select()
      .from(staffSalaries)
      .where(and(eq(staffSalaries.staffId, staffId), eq(staffSalaries.staffVersion, activeStaff.version)))
      .limit(1)
      .then((res: any) => res[0]);

    if (currentSalary) {
      await db
        .update(staffSalaries)
        .set({
          securityDepositTotal: String(securityDepositTotal),
          securityDeposit: String(securityDeposit),
          securityDepositStartMonth: securityDepositStartMonth || null,
        })
        .where(eq(staffSalaries.id, currentSalary.id))
        .execute();
    } else {
      await db
        .insert(staffSalaries)
        .values({
          staffId,
          staffVersion: activeStaff.version,
          securityDepositTotal: String(securityDepositTotal),
          securityDeposit: String(securityDeposit),
          securityDepositStartMonth: securityDepositStartMonth || null,
        })
        .execute();
    }

    return c.json({ ok: true, staffId, securityDepositTotal, securityDeposit });
  })
  /**
   * POST /hr/security-deposits/:staffId/refund
   * Records a security deposit refund to staff.
   */
  .post("/hr/security-deposits/:staffId/refund", async (c) => {
    const session = c.get("session");
    if (!session || (session.user.role !== "admin" && session.user.role !== "hr")) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    const staffId = parseInt(c.req.param("staffId"), 10);
    const { amount, refundDate, notes } = z
      .object({
        amount: z.coerce.number().positive(),
        refundDate: z.string().min(1),
        notes: z.string().optional(),
      })
      .parse(await c.req.json());

    const [row] = await db
      .insert(securityDepositRefunds)
      .values({
        staffId,
        amount: String(amount),
        refundDate,
        notes: notes || null,
        processedBy: session.user.id,
      })
      .returning()
      .execute();

    return c.json(row);
  });
