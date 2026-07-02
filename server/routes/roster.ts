import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  departments,
  rosters,
  shifts,
  staff,
  user,
} from "../db/schema.ts";
import { sendNotification } from "../utils/notifier.ts";
import {
  doIntervalsOverlap,
  idParam,
  jsonBody,
  rosterInput,
} from "./shared.ts";

export const rosterRoutes = new Hono<AuthEnv>()
  .get("/hr/roster", async (c) => {
    const departmentId = c.req.query("departmentId");
    let query = db
      .select({
        id: rosters.id,
        staffId: rosters.staffId,
        staffName: staff.name,
        departmentId: rosters.departmentId,
        departmentName: departments.name,
        shiftId: rosters.shiftId,
        shift: shifts.name,
        isOffDay: shifts.isOffDay,
        startDate: rosters.startDate,
        endDate: rosters.endDate,
        notes: rosters.notes,
        createdAt: rosters.createdAt,
      })
      .from(rosters)
      .innerJoin(staff, eq(rosters.staffId, staff.staffId))
      .innerJoin(departments, eq(rosters.departmentId, departments.id))
      .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
      .$dynamic();

    if (departmentId) {
      query = query.where(eq(rosters.departmentId, parseInt(departmentId)));
    }

    const rows = await query.orderBy(desc(rosters.startDate)).execute();
    return c.json(rows);
  })
  .post("/hr/roster", async (c) => {
    const input = await jsonBody(c, rosterInput);

    const proposedShift = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, input.shiftId))
      .limit(1)
      .then((res: any) => res[0]);
    if (!proposedShift) {
      return c.json({ error: "Shift not found" }, 404);
    }

    const existingRosters = await db
      .select({
        id: rosters.id,
        startDate: rosters.startDate,
        endDate: rosters.endDate,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        shiftName: shifts.name,
      })
      .from(rosters)
      .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
      .where(eq(rosters.staffId, input.staffId))
      .execute();

    for (const r of existingRosters) {
      if (
        doIntervalsOverlap(
          input.startDate,
          input.endDate,
          proposedShift.startTime,
          proposedShift.endTime,
          r.startDate,
          r.endDate,
          r.startTime,
          r.endTime
        )
      ) {
        return c.json(
          {
            error: `Employee is already assigned to shift '${r.shiftName}' (${r.startTime}-${r.endTime}) on an overlapping date during this period.`,
          },
          400
        );
      }
    }

    const [row] = await db.insert(rosters).values(input).returning().execute();

    // Trigger notification for the employee
    try {
      const employee = await db
        .select()
        .from(staff)
        .where(sql`${staff.staffId} = ${input.staffId} AND ${staff.active} = true`)
        .limit(1)
        .then((res: any) => res[0]);
      if (employee) {
        const u = await db
          .select()
          .from(user)
          .where(eq(user.email, employee.email))
          .limit(1)
          .then((res: any) => res[0]);
        if (u) {
          await sendNotification({
            userId: u.id,
            title: "New Shift Schedule",
            message: `You have been assigned a new shift starting from ${input.startDate} to ${input.endDate}.`,
            type: "info",
            link: "/hr/roster",
          });
        }
      }
    } catch (err) {
      console.error("Failed to send roster assignment notification:", err);
    }

    return c.json(row, 201);
  })
  .put("/hr/roster/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, rosterInput);

    const proposedShift = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, input.shiftId))
      .limit(1)
      .then((res: any) => res[0]);
    if (!proposedShift) {
      return c.json({ error: "Shift not found" }, 404);
    }

    const existingRosters = await db
      .select({
        id: rosters.id,
        startDate: rosters.startDate,
        endDate: rosters.endDate,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        shiftName: shifts.name,
      })
      .from(rosters)
      .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
      .where(sql`${rosters.staffId} = ${input.staffId} AND ${rosters.id} != ${id}`)
      .execute();

    for (const r of existingRosters) {
      if (
        doIntervalsOverlap(
          input.startDate,
          input.endDate,
          proposedShift.startTime,
          proposedShift.endTime,
          r.startDate,
          r.endDate,
          r.startTime,
          r.endTime
        )
      ) {
        return c.json(
          {
            error: `Employee is already assigned to shift '${r.shiftName}' (${r.startTime}-${r.endTime}) on an overlapping date during this period.`,
          },
          400
        );
      }
    }

    const [row] = await db
      .update(rosters)
      .set(input)
      .where(eq(rosters.id, id))
      .returning()
      .execute();
    return c.json(row);
  })
  .delete("/hr/roster/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    await db.delete(rosters).where(eq(rosters.id, id)).execute();
    return c.json({ ok: true });
  });
