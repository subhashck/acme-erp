import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  attendance,
  departments,
  leaveRequests,
  shifts,
  staff,
} from "../db/schema.ts";

export const dashboardRoutes = new Hono<AuthEnv>().get(
  "/dashboard",
  async (c) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const [staffCount, deptCount, pendingLeaves, attendanceToday, shiftsCount] =
      await Promise.all([
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
      ]);

    return c.json({
      metrics: {
        staff: staffCount?.value ?? 0,
        departments: deptCount?.value ?? 0,
        pendingLeaves: pendingLeaves?.value ?? 0,
        attendanceToday: attendanceToday?.value ?? 0,
        shiftsCount: shiftsCount?.value ?? 0,
      },
    });
  }
);
