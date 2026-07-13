import { and, desc, eq, inArray, sql } from "drizzle-orm";
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
} from "../db/schema.ts";
import { idParam, getCurrentStaff } from "./shared.ts";

export const payrollRoutes = new Hono<AuthEnv>()
  .get("/hr/payroll/payslips", async (c) => {
    const session = c.get("session");
    const isHrOrAdmin = session?.user.role === "admin" || session?.user.role === "hr";
    const currentStaff = await getCurrentStaff(c);

    let whereClause = undefined;
    if (!isHrOrAdmin) {
      if (!currentStaff) {
        return c.json([]);
      }
      whereClause = eq(payslips.staffId, currentStaff.staffId);
    }

    const rows = await db
      .select({
        id: payslips.id,
        staffId: payslips.staffId,
        month: payslips.month,
        basicSalary: payslips.basicSalary,
        hra: payslips.hra,
        conveyance: payslips.conveyance,
        medical: payslips.medical,
        special: payslips.special,
        epf: payslips.epf,
        esi: payslips.esi,
        professionalTax: payslips.professionalTax,
        otherDeductions: payslips.otherDeductions,
        lateAttendance: payslips.lateAttendance,
        leaveDaysTaken: payslips.leaveDaysTaken,
        leaveDeduction: payslips.leaveDeduction,
        netSalary: payslips.netSalary,
        version: payslips.version,
        status: payslips.status,
        hrNotes: payslips.hrNotes,
        cooNotes: payslips.cooNotes,
        accountsNotes: payslips.accountsNotes,
        createdAt: payslips.createdAt,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentName: departments.name,
      })
      .from(payslips)
      .innerJoin(staff, sql`${payslips.staffId} = ${staff.staffId} AND ${staff.active} = true`)
      .leftJoin(staffDepartments, sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active' AND ${staffDepartments.staffVersion} = ${staff.version}`)
      .leftJoin(departments, sql`${staffDepartments.departmentId} = ${departments.id} AND ${departments.active} = true`)
      .where(whereClause)
      .orderBy(desc(payslips.month), desc(payslips.createdAt))
      .execute();
    return c.json(rows);
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
        medical: payslips.medical,
        special: payslips.special,
        epf: payslips.epf,
        esi: payslips.esi,
        professionalTax: payslips.professionalTax,
        otherDeductions: payslips.otherDeductions,
        lateAttendance: payslips.lateAttendance,
        leaveDaysTaken: payslips.leaveDaysTaken,
        leaveDeduction: payslips.leaveDeduction,
        netSalary: payslips.netSalary,
        version: payslips.version,
        status: payslips.status,
        hrNotes: payslips.hrNotes,
        cooNotes: payslips.cooNotes,
        accountsNotes: payslips.accountsNotes,
        createdAt: payslips.createdAt,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentName: departments.name,
      })
      .from(payslips)
      .innerJoin(staff, sql`${payslips.staffId} = ${staff.staffId} AND ${staff.active} = true`)
      .leftJoin(
        staffDepartments,
        sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .where(eq(payslips.id, id))
      .limit(1)
      .then((res: any) => res[0]);

    if (!row) return c.json({ error: "Payslip not found" }, 404);

    const session = c.get("session");
    const isHrOrAdmin = session?.user.role === "admin" || session?.user.role === "hr";
    const currentStaff = await getCurrentStaff(c);

    if (!isHrOrAdmin) {
      if (!currentStaff || row.staffId !== currentStaff.staffId) {
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

    return c.json({ ...row, leaveBalance });
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
        medical: z.coerce.number().min(0),
        special: z.coerce.number().min(0),
        epf: z.coerce.number().min(0),
        esi: z.coerce.number().min(0),
        professionalTax: z.coerce.number().min(0),
        otherDeductions: z.coerce.number().min(0),
        lateAttendance: z.coerce.number().min(0),
        leaveDaysTaken: z.coerce.number().min(0),
        leaveDeduction: z.coerce.number().min(0),
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
    if (existing.status !== "Active") {
      return c.json({ error: `Cannot edit a payslip with status: ${existing.status}` }, 400);
    }

    const gross =
      input.basicSalary +
      input.hra +
      input.conveyance +
      input.medical +
      input.special;
    const statutoryDeductions =
      input.epf + input.esi + input.professionalTax + input.otherDeductions + input.lateAttendance;
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
        medical: String(input.medical),
        special: String(input.special),
        epf: String(input.epf),
        esi: String(input.esi),
        professionalTax: String(input.professionalTax),
        otherDeductions: String(input.otherDeductions),
        lateAttendance: String(input.lateAttendance),
        leaveDaysTaken: String(input.leaveDaysTaken),
        leaveDeduction: String(input.leaveDeduction),
        netSalary: String(net),
        version: existing.version + 1,
        status: "Active",
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
        targetStatus: z.enum(["Approved by HR", "Approved by COO", "Paid"]),
        note: z.string().optional().nullable(),
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

    const currentStaff = await getCurrentStaff(c);

    if (targetStatus === "Approved by HR") {
      if (existing.status !== "Active") {
        return c.json({ error: "Payslip must be Active to be approved by HR." }, 400);
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
    
    if (targetStatus === "Approved by COO") {
      if (existing.status !== "Approved by HR") {
        return c.json({ error: "Payslip must be Approved by HR to be approved by COO." }, 400);
      }
      if (!currentStaff || currentStaff.role !== "Chief Operating Officer") {
        return c.json({ error: "Only the Chief Operating Officer can approve payslips." }, 403);
      }
      
      const [updated] = await db
        .update(payslips)
        .set({ status: targetStatus, cooNotes: note })
        .where(eq(payslips.id, id))
        .returning()
        .execute();
      return c.json(updated);
    }

    if (targetStatus === "Paid") {
      if (existing.status !== "Approved by COO") {
        return c.json({ error: "Payslip must be Approved by COO before marking as Paid." }, 400);
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
      return c.json(updated);
    }

    return c.json({ error: "Invalid target status" }, 400);
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

      let basic = 0,
        hra = 0,
        conveyance = 0,
        medical = 0,
        special = 0;
      let epf = 0,
        esi = 0,
        profTax = 0,
        otherDed = 0,
        lateAtt = 0;

      if (structure) {
        basic = Number(structure.basicSalary || 0);
        hra = Number(structure.hra || 0);
        conveyance = Number(structure.conveyance || 0);
        medical = Number(structure.medical || 0);
        special = Number(structure.special || 0);
        epf = Number(structure.epf || 0);
        esi = Number(structure.esi || 0);
        profTax = Number(structure.professionalTax || 0);
        otherDed = Number(structure.otherDeductions || 0);
        lateAtt = Number(structure.lateAttendance || 0);
      } else {
        const total = Number(employee.salary || 0);
        basic = Math.round(total * 0.5);
        hra = Math.round(total * 0.3);
        conveyance = Math.round(total * 0.1);
        medical = Math.round(total * 0.05);
        special = Math.round(total * 0.05);
      }

      const gross = basic + hra + conveyance + medical + special;
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
      const statutoryDeductions = epf + esi + profTax + otherDed + lateAtt;
      const net = Math.max(0, gross - statutoryDeductions - leaveDeduction);

      // Versioning: supersede existing active payslip for same month
      const existing = await db
        .select()
        .from(payslips)
        .where(
          sql`${payslips.staffId} = ${employee.staffId} AND ${payslips.month} = ${month} AND ${payslips.status} = 'Active'`
        )
        .limit(1)
        .then((res: any) => res[0]);

      const payslipValues = {
        staffId: employee.staffId,
        month,
        basicSalary: String(basic),
        hra: String(hra),
        conveyance: String(conveyance),
        medical: String(medical),
        special: String(special),
        epf: String(epf),
        esi: String(esi),
        professionalTax: String(profTax),
        otherDeductions: String(otherDed),
        lateAttendance: String(lateAtt),
        leaveDaysTaken: String(leaveDaysTaken),
        leaveDeduction: String(leaveDeduction),
        netSalary: String(net),
        status: "Active" as const,
      };

      if (existing) {
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
  });
