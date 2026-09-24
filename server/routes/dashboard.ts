import { and, eq, inArray, sql } from "drizzle-orm";
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
import { labOrders } from "../db/schema-lab.ts";
import { getCurrentStaff } from "./shared.ts";

export const dashboardRoutes = new Hono<AuthEnv>().get(
  "/dashboard",
  async (c) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const requestedScheduleDate = c.req.query("scheduleDate");
    const parsedScheduleDate = requestedScheduleDate
      ? new Date(`${requestedScheduleDate}T00:00:00Z`)
      : null;
    const scheduleAnchorDate = requestedScheduleDate
      && /^\d{4}-\d{2}-\d{2}$/.test(requestedScheduleDate)
      && parsedScheduleDate
      && !Number.isNaN(parsedScheduleDate.getTime())
      && parsedScheduleDate?.toISOString().slice(0, 10) === requestedScheduleDate
      ? requestedScheduleDate
      : todayStr;
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
      pendingLabOrders,
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
          sql`${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} <= ${todayStr} AND ${leaveRequests.endDate} >= ${todayStr}`
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
      db
        .select({ value: sql<number>`count(*)` })
        .from(labOrders)
        .where(inArray(labOrders.status, ["Ordered", "Collected", "InProgress"]))
        .limit(1)
        .then((res: any) => res[0])
        .catch(() => ({ value: 0 })),
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

    const session = c.get("session");
    const userRole = (session?.user?.role || "").toLowerCase();
    const canViewWorkforceSchedule = userRole === "admin" || userRole === "hr";
    let workforceSchedule: Array<{
      departmentId: number | null;
      departmentName: string;
      days: Array<{
        date: string;
        entries: Array<{
          staffId: number;
          employeeCode: string;
          staffName: string;
          status: "leave" | "off" | "roster";
          label: string;
          startTime?: string;
          endTime?: string;
          isPreviousDayCarryOver?: boolean;
        }>;
      }>;
    }> = [];

    if (canViewWorkforceSchedule) {
      const addDays = (date: string, amount: number) => {
        const value = new Date(`${date}T00:00:00Z`);
        value.setUTCDate(value.getUTCDate() + amount);
        return value.toISOString().slice(0, 10);
      };
      const scheduleDates = Array.from({ length: 3 }, (_, index) => addDays(scheduleAnchorDate, index - 1));
      const rangeStart = scheduleDates[0];
      const rangeEnd = scheduleDates[2];
      const rosterRangeStart = addDays(rangeStart, -1);

      const [rangeLeaves, rangeAttendance, rangeRosters, activeDepartments] = await Promise.all([
        db
          .select({
            staffId: leaveRequests.staffId,
            startDate: leaveRequests.startDate,
            endDate: leaveRequests.endDate,
            leaveType: leaveRequests.leaveType,
            isHalfDay: leaveRequests.isHalfDay,
          })
          .from(leaveRequests)
          .where(sql`${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} <= ${rangeEnd} AND ${leaveRequests.endDate} >= ${rangeStart}`),
        db
          .select({ staffId: attendance.staffId, date: attendance.date, status: attendance.status })
          .from(attendance)
          .where(sql`${attendance.date} BETWEEN ${rangeStart} AND ${rangeEnd} AND ${attendance.status} IN ('Off Duty', 'Approved Leave')`),
        db
          .select({
            staffId: rosters.staffId,
            departmentId: rosters.departmentId,
            date: rosters.date,
            shiftName: shifts.name,
            shiftCode: shifts.code,
            startTime: shifts.startTime,
            endTime: shifts.endTime,
            isOffDay: shifts.isOffDay,
          })
          .from(rosters)
          .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
          .where(sql`${rosters.date} BETWEEN ${rosterRangeStart} AND ${rangeEnd}`),
        db
          .select({ id: departments.id, name: departments.name })
          .from(departments)
          .where(eq(departments.active, true))
          .orderBy(departments.name),
      ]);

      const staffDetails = await db
        .select({
          staffId: staff.staffId,
          employeeCode: staff.employeeCode,
          staffName: staff.name,
          departmentId: staffDepartments.departmentId,
          departmentName: departments.name,
        })
        .from(staff)
        .leftJoin(
          staffDepartments,
          sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staff.version} = ${staffDepartments.staffVersion} AND ${staffDepartments.status} = 'Active'`
        )
        .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
        .where(eq(staff.active, true));

      type ScheduleEntry = {
        staffId: number;
        employeeCode: string;
        staffName: string;
        status: "leave" | "off" | "roster";
        label: string;
        startTime?: string;
        endTime?: string;
        isPreviousDayCarryOver?: boolean;
      };
      const priority: Record<ScheduleEntry["status"], number> = { roster: 1, off: 2, leave: 3 };
      const entryMap = new Map<string, ScheduleEntry>();
      const staffById = new Map<number, typeof staffDetails>();
      for (const detail of staffDetails) {
        const values = staffById.get(detail.staffId) || [];
        values.push(detail);
        staffById.set(detail.staffId, values);
      }
      const putEntry = (departmentId: number | null, date: string, entry: ScheduleEntry) => {
        const key = `${departmentId ?? "none"}:${date}:${entry.staffId}:${entry.isPreviousDayCarryOver ? "carry" : "primary"}`;
        const existing = entryMap.get(key);
        if (!existing || priority[entry.status] > priority[existing.status]) entryMap.set(key, entry);
      };
      const putForStaffDepartments = (staffId: number, date: string, entry: Omit<ScheduleEntry, "staffId" | "employeeCode" | "staffName">) => {
        for (const detail of staffById.get(staffId) || []) {
          putEntry(detail.departmentId, date, {
            staffId,
            employeeCode: detail.employeeCode,
            staffName: detail.staffName,
            ...entry,
          });
        }
      };

      for (const roster of rangeRosters) {
        const detail = (staffById.get(roster.staffId) || []).find((item) => item.departmentId === roster.departmentId)
          || (staffById.get(roster.staffId) || [])[0];
        if (!detail) continue;
        if (scheduleDates.includes(roster.date)) {
          putEntry(roster.departmentId, roster.date, {
            staffId: roster.staffId,
            employeeCode: detail.employeeCode,
            staffName: detail.staffName,
            status: roster.isOffDay ? "off" : "roster",
            label: roster.isOffDay ? "Rostered Off" : roster.shiftName,
            startTime: roster.isOffDay ? undefined : roster.startTime,
            endTime: roster.isOffDay ? undefined : roster.endTime,
          });
        }

        if (!roster.isOffDay && roster.endTime <= roster.startTime) {
          const carryDate = addDays(roster.date, 1);
          if (scheduleDates.includes(carryDate)) {
            putEntry(roster.departmentId, carryDate, {
              staffId: roster.staffId,
              employeeCode: detail.employeeCode,
              staffName: detail.staffName,
              status: "roster",
              label: roster.shiftName,
              startTime: roster.startTime,
              endTime: roster.endTime,
              isPreviousDayCarryOver: true,
            });
          }
        }
      }

      for (const leave of rangeLeaves) {
        for (const date of scheduleDates) {
          if (date >= leave.startDate && date <= leave.endDate) {
            putForStaffDepartments(leave.staffId, date, {
              status: "leave",
              label: leave.isHalfDay ? `${leave.leaveType} (Half Day)` : leave.leaveType,
            });
          }
        }
      }

      for (const record of rangeAttendance) {
        putForStaffDepartments(record.staffId, record.date, {
          status: record.status === "Approved Leave" ? "leave" : "off",
          label: record.status,
        });
      }

      for (const request of offDayRequests) {
        if (request.requestedDate >= rangeStart && request.requestedDate <= rangeEnd) {
          putForStaffDepartments(request.staffId, request.requestedDate, { status: "off", label: "Approved Off" });
        }
      }

      for (const rule of weeklyOffRules) {
        let days: number[] = [];
        if (Array.isArray(rule.daysOfWeek)) days = rule.daysOfWeek;
        else if (typeof rule.daysOfWeek === "string") {
          try { days = JSON.parse(rule.daysOfWeek); } catch { days = []; }
        }
        for (const date of scheduleDates) {
          const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
          const active = date >= rule.effectiveFrom && (!rule.effectiveTo || date <= rule.effectiveTo);
          const swappedAway = offDayRequests.some((request) => request.staffId === rule.staffId && request.originalDate === date);
          if (active && days.includes(weekday) && !swappedAway) {
            putForStaffDepartments(rule.staffId, date, { status: "off", label: "Weekly Off" });
          }
        }
      }

      const departmentMap = new Map<number | null, { name: string; staffCount: number }>();
      for (const department of activeDepartments) {
        departmentMap.set(department.id, { name: department.name, staffCount: 0 });
      }
      for (const detail of staffDetails) {
        if (!departmentMap.has(detail.departmentId)) {
          departmentMap.set(detail.departmentId, { name: detail.departmentName || "Unassigned", staffCount: 0 });
        }
        departmentMap.get(detail.departmentId)!.staffCount += 1;
      }
      workforceSchedule = [...departmentMap.entries()]
        .map(([departmentId, department]) => ({
          departmentId,
          departmentName: department.name,
          days: scheduleDates.map((date) => ({
            date,
            entries: [...entryMap.entries()]
              .filter(([key]) => key.startsWith(`${departmentId ?? "none"}:${date}:`))
              .map(([, entry]) => entry)
              .sort((a, b) => {
                const rank = (entry: ScheduleEntry) => {
                  if (entry.status === "leave") return 0;
                  if (entry.isPreviousDayCarryOver) return 1;
                  if (entry.status === "off") return 2;
                  return 3;
                };
                const rankDifference = rank(a) - rank(b);
                if (rankDifference !== 0) return rankDifference;
                if (a.status === "roster" && b.status === "roster") {
                  const timeDifference = (a.startTime || "99:99").localeCompare(b.startTime || "99:99");
                  if (timeDifference !== 0) return timeDifference;
                }
                return a.staffName.localeCompare(b.staffName);
              }),
          })),
        }))
        .sort((a, b) => a.departmentName.localeCompare(b.departmentName));
    }

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
        pendingLabOrders: pendingLabOrders?.value ?? 0,
      },
      workforceSchedule,
    });
  }
);
