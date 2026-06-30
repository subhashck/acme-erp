import { desc, eq, sql } from "drizzle-orm";
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
import { idParam } from "./shared.ts";

export const payrollRoutes = new Hono<AuthEnv>()
  .get("/hr/payroll/payslips", async (c) => {
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
        leaveDaysTaken: payslips.leaveDaysTaken,
        leaveDeduction: payslips.leaveDeduction,
        netSalary: payslips.netSalary,
        version: payslips.version,
        status: payslips.status,
        createdAt: payslips.createdAt,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentName: departments.name,
      })
      .from(payslips)
      .innerJoin(staff, eq(payslips.staffId, staff.id))
      .leftJoin(
        staffDepartments,
        sql`${staff.id} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
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
        leaveDaysTaken: payslips.leaveDaysTaken,
        leaveDeduction: payslips.leaveDeduction,
        netSalary: payslips.netSalary,
        version: payslips.version,
        status: payslips.status,
        createdAt: payslips.createdAt,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentName: departments.name,
      })
      .from(payslips)
      .innerJoin(staff, eq(payslips.staffId, staff.id))
      .leftJoin(
        staffDepartments,
        sql`${staff.id} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .where(eq(payslips.id, id))
      .limit(1)
      .then((res: any) => res[0]);

    if (!row) return c.json({ error: "Payslip not found" }, 404);

    // Leave balance for the employee: current calendar year
    const year = row.month.slice(0, 4);
    const yearStart = new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000;
    const yearEnd = new Date(`${year}-12-31T23:59:59Z`).getTime() / 1000;

    const allLeaveTypes = await db
      .select()
      .from(leaveTypes)
      .where(eq(leaveTypes.active, true))
      .execute();
    const approvedLeaves = await db
      .select()
      .from(leaveRequests)
      .where(
        sql`${leaveRequests.staffId} = ${row.staffId} AND ${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} >= ${yearStart} AND ${leaveRequests.startDate} <= ${yearEnd}`
      )
      .execute();

    // Count days taken per leave type
    const daysByType: Record<string, number> = {};
    for (const lr of approvedLeaves) {
      const start = lr.startDate;
      const end = lr.endDate;
      const days = Math.max(
        1,
        Math.round((end.getTime() - start.getTime()) / 86400000) + 1
      );
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
    const { id } = idParam.parse(c.req.param());
    const input = z
      .object({
        basicSalary: z.number().min(0),
        hra: z.number().min(0),
        conveyance: z.number().min(0),
        medical: z.number().min(0),
        special: z.number().min(0),
        epf: z.number().min(0),
        esi: z.number().min(0),
        professionalTax: z.number().min(0),
        otherDeductions: z.number().min(0),
        leaveDaysTaken: z.number().min(0),
        leaveDeduction: z.number().min(0),
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

    const gross =
      input.basicSalary +
      input.hra +
      input.conveyance +
      input.medical +
      input.special;
    const statutoryDeductions =
      input.epf + input.esi + input.professionalTax + input.otherDeductions;
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
        basicSalary: input.basicSalary,
        hra: input.hra,
        conveyance: input.conveyance,
        medical: input.medical,
        special: input.special,
        epf: input.epf,
        esi: input.esi,
        professionalTax: input.professionalTax,
        otherDeductions: input.otherDeductions,
        leaveDaysTaken: input.leaveDaysTaken,
        leaveDeduction: input.leaveDeduction,
        netSalary: net,
        version: existing.version + 1,
        status: "Active",
      })
      .returning()
      .execute();

    return c.json(newRow);
  })
  .post("/hr/payroll/generate", async (c) => {
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
    const monthStart = new Date(`${month}-01T00:00:00Z`).getTime() / 1000;
    const monthEnd = new Date(year, mon, 0, 23, 59, 59).getTime() / 1000;

    // Get active staff matching filters
    let activeStaff: (typeof staff.$inferSelect)[] = [];
    if (staffId) {
      activeStaff = await db
        .select()
        .from(staff)
        .where(
          sql`${staff.status} = 'Active' AND ${staff.id} = ${staffId} AND ${staff.active} = true`
        )
        .execute();
    } else if (departmentId) {
      const rows = await db
        .select({ staff })
        .from(staff)
        .innerJoin(
          staffDepartments,
          sql`${staff.id} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`
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

    // Get all active leave types for deduction lookup
    const allLeaveTypes = await db.select().from(leaveTypes).execute();
    const leaveTypeMap: Record<string, { payable: boolean; paymentRate: number }> =
      {};
    for (const lt of allLeaveTypes) {
      leaveTypeMap[lt.name] = {
        payable: lt.payable,
        paymentRate: lt.paymentRate,
      };
    }

    let generatedCount = 0;

    for (const employee of activeStaff) {
      // Get salary structure
      const structure = await db
        .select()
        .from(staffSalaries)
        .where(eq(staffSalaries.staffId, employee.id))
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
        otherDed = 0;

      if (structure) {
        basic = structure.basicSalary;
        hra = structure.hra;
        conveyance = structure.conveyance;
        medical = structure.medical;
        special = structure.special;
        epf = structure.epf;
        esi = structure.esi;
        profTax = structure.professionalTax;
        otherDed = structure.otherDeductions;
      } else {
        const total = employee.salary || 0;
        basic = Math.round(total * 0.5);
        hra = Math.round(total * 0.3);
        conveyance = Math.round(total * 0.1);
        medical = Math.round(total * 0.05);
        special = Math.round(total * 0.05);
      }

      const gross = basic + hra + conveyance + medical + special;
      const dailyRate = gross / daysInMonth;

      // Count approved leave days overlapping with the target month
      const approvedLeaves = await db
        .select()
        .from(leaveRequests)
        .where(
          sql`${leaveRequests.staffId} = ${employee.id} AND ${leaveRequests.status} = 'Approved' AND ${leaveRequests.endDate} >= ${monthStart} AND ${leaveRequests.startDate} <= ${monthEnd}`
        )
        .execute();

      let leaveDaysTaken = 0;
      let leaveDeduction = 0;

      for (const lr of approvedLeaves) {
        const lrStart = lr.startDate.getTime() / 1000;
        const lrEnd = lr.endDate.getTime() / 1000;
        const overlapStart = Math.max(lrStart, monthStart);
        const overlapEnd = Math.min(lrEnd, monthEnd);
        const days = Math.max(
          1,
          Math.round((overlapEnd - overlapStart) / 86400) + 1
        );
        leaveDaysTaken += days;

        const lt = leaveTypeMap[lr.leaveType];
        const deductionRate = lt ? (!lt.payable ? 100 : lt.paymentRate) : 100;
        leaveDeduction += dailyRate * days * (deductionRate / 100);
      }

      // Calculate unexcused absences and half days based on rosters and attendance
      let unexcusedAbsenceDays = 0;
      let halfDayDays = 0;

      const employeeRosters = await db
        .select({ startDate: rosters.startDate, endDate: rosters.endDate })
        .from(rosters)
        .where(eq(rosters.staffId, employee.id))
        .execute();

      const monthStartStr = `${month}-01`;
      const monthEndStr = `${month}-${String(daysInMonth).padStart(2, "0")}`;
      const employeeAttendance = await db
        .select({ date: attendance.date, status: attendance.status })
        .from(attendance)
        .where(
          sql`${attendance.staffId} = ${employee.id} AND ${attendance.date} >= ${monthStartStr} AND ${attendance.date} <= ${monthEndStr}`
        )
        .execute();
      const attendanceStatusMap = new Map(
        employeeAttendance.map((a) => [a.date, a.status])
      );

      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = `${month}-${String(day).padStart(2, "0")}`;
        const dayTimestamp =
          new Date(`${dayStr}T12:00:00Z`).getTime() / 1000;

        const isRostered = employeeRosters.some(
          (r) => r.startDate <= dayStr && r.endDate >= dayStr
        );
        if (!isRostered) continue;

        const onLeave = approvedLeaves.some((l) => {
          const lStart = l.startDate.getTime() / 1000;
          const lEnd = l.endDate.getTime() / 1000;
          return lStart <= dayTimestamp && lEnd >= dayTimestamp;
        });

        if (onLeave) continue;

        const attStatus = attendanceStatusMap.get(dayStr);
        if (attStatus === "Absent") {
          unexcusedAbsenceDays++;
        } else if (attStatus === "Half-day") {
          halfDayDays++;
        } else if (!attStatus) {
          unexcusedAbsenceDays++;
        }
      }

      const attendanceDeduction =
        dailyRate * (unexcusedAbsenceDays + 0.5 * halfDayDays);
      leaveDaysTaken += unexcusedAbsenceDays + 0.5 * halfDayDays;
      leaveDeduction += attendanceDeduction;

      leaveDeduction = Math.round(leaveDeduction * 100) / 100;
      const statutoryDeductions = epf + esi + profTax + otherDed;
      const net = Math.max(0, gross - statutoryDeductions - leaveDeduction);

      // Versioning: supersede existing active payslip for same month
      const existing = await db
        .select()
        .from(payslips)
        .where(
          sql`${payslips.staffId} = ${employee.id} AND ${payslips.month} = ${month} AND ${payslips.status} = 'Active'`
        )
        .limit(1)
        .then((res: any) => res[0]);

      const payslipValues = {
        staffId: employee.id,
        month,
        basicSalary: basic,
        hra,
        conveyance,
        medical,
        special,
        epf,
        esi,
        professionalTax: profTax,
        otherDeductions: otherDed,
        leaveDaysTaken,
        leaveDeduction,
        netSalary: net,
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

    return c.json({ ok: true, generatedCount });
  });
