import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  attendance,
  departments,
  leaveRequests,
  nursingSupers,
  rosters,
  shifts,
  staff,
  staffDepartments,
  staffOffDayRequests,
  staffWeeklyOffDays,
} from "../db/schema.ts";
import { getCurrentStaff } from "./shared.ts";

export const dashboardRoutes = new Hono<AuthEnv>().get(
  "/dashboard",
  async (c) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const dateTimestamp = new Date(`${todayStr}T12:00:00Z`);
    const dayOfWeek = new Date(todayStr + "T00:00:00Z").getUTCDay();

    const [
      staffCount,
      deptCount,
      pendingLeaves,
      attendanceToday,
      shiftsCount,
      currentStaff,
      activeStaffRows,
      approvedLeaves,
      offAttendance,
      offRosters,
      offDayRequests,
      weeklyOffRules,
      activeNursingSupers,
      clinicalDepts,
    ] = await Promise.all([
      db
        .select({ value: sql<number>`count(*)` })
        .from(staff)
        .where(eq(staff.active, true))
        .limit(1)
        .then((res: any) => res[0]),
      db
        .select({ value: sql<number>`count(*)` })
        .from(departments)
        .limit(1)
        .then((res: any) => res[0]),
      db
        .select({ value: sql<number>`count(*)` })
        .from(leaveRequests)
        .where(eq(leaveRequests.status, "Pending"))
        .limit(1)
        .then((res: any) => res[0]),
      db
        .select({ value: sql<number>`count(*)` })
        .from(attendance)
        .where(eq(attendance.date, todayStr))
        .limit(1)
        .then((res: any) => res[0]),
      db
        .select({ value: sql<number>`count(*)` })
        .from(shifts)
        .limit(1)
        .then((res: any) => res[0]),
      getCurrentStaff(c),
      db
        .select({
          staffId: staff.staffId,
          departmentId: staffDepartments.departmentId,
          departmentName: departments.name,
          isClinical: departments.isClinical,
        })
        .from(staff)
        .leftJoin(
          staffDepartments,
          sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staff.version} = ${staffDepartments.staffVersion} AND ${staffDepartments.status} = 'Active'`
        )
        .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
        .where(eq(staff.active, true)),
      db
        .select({ staffId: leaveRequests.staffId })
        .from(leaveRequests)
        .where(
          sql`${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} <= ${dateTimestamp} AND ${leaveRequests.endDate} >= ${dateTimestamp}`
        ),
      db
        .select({ staffId: attendance.staffId })
        .from(attendance)
        .where(
          and(
            eq(attendance.date, todayStr),
            sql`${attendance.status} IN ('Off Duty', 'Approved Leave')`
          )
        ),
      db
        .select({ staffId: rosters.staffId })
        .from(rosters)
        .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
        .where(
          and(
            eq(rosters.date, todayStr),
            eq(shifts.isOffDay, true)
          )
        ),
      db
        .select({
          staffId: staffOffDayRequests.staffId,
          originalDate: staffOffDayRequests.originalDate,
          requestedDate: staffOffDayRequests.requestedDate,
        })
        .from(staffOffDayRequests)
        .where(eq(staffOffDayRequests.status, "Approved")),
      db
        .select()
        .from(staffWeeklyOffDays),
      db
        .select({ id: nursingSupers.id, staffId: nursingSupers.staffId })
        .from(nursingSupers)
        .where(eq(nursingSupers.active, true)),
      db
        .select({ id: departments.id })
        .from(departments)
        .where(and(eq(departments.active, true), eq(departments.isClinical, true))),
    ]);

    const offOrLeaveStaffIds = new Set<number>();

    // 1. Approved leave requests
    for (const l of approvedLeaves) {
      offOrLeaveStaffIds.add(l.staffId);
    }

    // 2. Attendance marked as Off Duty or Approved Leave
    for (const a of offAttendance) {
      offOrLeaveStaffIds.add(a.staffId);
    }

    // 3. Rostered on an off-day shift
    for (const r of offRosters) {
      offOrLeaveStaffIds.add(r.staffId);
    }

    // 4. Approved swap requests TO today
    for (const s of offDayRequests) {
      if (s.requestedDate === todayStr) {
        offOrLeaveStaffIds.add(s.staffId);
      }
    }

    // 5. Weekly off-day rules
    for (const rule of weeklyOffRules) {
      if (
        todayStr >= rule.effectiveFrom &&
        (!rule.effectiveTo || todayStr <= rule.effectiveTo)
      ) {
        let days: number[] = [];
        if (Array.isArray(rule.daysOfWeek)) {
          days = rule.daysOfWeek;
        } else if (typeof rule.daysOfWeek === "string") {
          try {
            days = JSON.parse(rule.daysOfWeek);
          } catch {
            days = [];
          }
        }
        if (days.includes(dayOfWeek)) {
          const swappedAway = offDayRequests.some(
            (s) => s.staffId === rule.staffId && s.originalDate === todayStr
          );
          if (!swappedAway) {
            offOrLeaveStaffIds.add(rule.staffId);
          }
        }
      }
    }

    // Only count staff who are active
    const activeStaffIds = new Set(activeStaffRows.map((s) => s.staffId));
    const validOffOrLeaveStaffIds = new Set(
      [...offOrLeaveStaffIds].filter((id) => activeStaffIds.has(id))
    );

    const onLeaveOrOffToday = validOffOrLeaveStaffIds.size;

    // Determine current user's department
    let userDepartmentId: number | null = null;
    let userDepartmentName: string | null = null;
    let userDepartmentStaffCount = 0;
    let deptOnLeaveOrOffToday = 0;

    if (currentStaff) {
      const userDeptRow = activeStaffRows.find(
        (s) => s.staffId === currentStaff.staffId && s.departmentId
      );
      if (userDeptRow?.departmentId) {
        userDepartmentId = userDeptRow.departmentId;
        userDepartmentName = userDeptRow.departmentName || null;

        const deptStaff = activeStaffRows.filter(
          (s) => s.departmentId === userDepartmentId
        );
        userDepartmentStaffCount = deptStaff.length;
        deptOnLeaveOrOffToday = deptStaff.filter((s) =>
          validOffOrLeaveStaffIds.has(s.staffId)
        ).length;
      }
    }

    const isNursingSuper = currentStaff
      ? activeNursingSupers.some((ns) => ns.staffId === currentStaff.staffId)
      : false;

    const clinicalDeptCount = clinicalDepts.length;

    // Filter staff belonging to clinical departments
    const clinicalStaffRows = activeStaffRows.filter((s) => s.isClinical === true);
    const clinicalStaffIds = new Set(clinicalStaffRows.map((s) => s.staffId));
    const clinicalStaffCount = clinicalStaffIds.size;

    const clinicalOnLeaveOrOffToday = [...clinicalStaffIds].filter((id) =>
      validOffOrLeaveStaffIds.has(id)
    ).length;

    return c.json({
      metrics: {
        staff: staffCount?.value ?? 0,
        departments: deptCount?.value ?? 0,
        pendingLeaves: pendingLeaves?.value ?? 0,
        attendanceToday: attendanceToday?.value ?? 0,
        shiftsCount: shiftsCount?.value ?? 0,
        onLeaveOrOffToday,
        deptOnLeaveOrOffToday,
        userDepartmentName,
        userDepartmentStaffCount,
        isNursingSuper,
        clinicalStaffCount,
        clinicalDeptCount,
        clinicalOnLeaveOrOffToday,
      },
    });
  }
);
