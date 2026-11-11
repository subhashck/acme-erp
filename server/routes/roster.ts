import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  departments,
  rosters,
  shifts,
  staff,
  staffOffDayRequests,
  staffWeeklyOffDays,
  user,
} from "../db/schema.ts";
import { sendNotification } from "../utils/notifier.ts";
import {
  idParam,
  jsonBody,
  rosterInput,
  rosterUpdateInput,
} from "./shared.ts";

/** Expand a YYYY-MM-DD range into an array of individual date strings. */
function expandDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const curr = new Date(startDate + "T00:00:00Z");
  const last = new Date(endDate + "T00:00:00Z");
  while (curr <= last) {
    dates.push(curr.toISOString().slice(0, 10));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

export const rosterRoutes = new Hono<AuthEnv>()
  // ── GET /hr/roster ───────────────────────────────────────────────────────────
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
        date: rosters.date,
        notes: rosters.notes,
        createdAt: rosters.createdAt,
      })
      .from(rosters)
      .innerJoin(staff, sql`${rosters.staffId} = ${staff.staffId} AND ${staff.active} = true`)
      .innerJoin(departments, eq(rosters.departmentId, departments.id))
      .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
      .$dynamic();

    if (departmentId) {
      query = query.where(eq(rosters.departmentId, parseInt(departmentId)));
    }

    const rows = await query.orderBy(desc(rosters.date)).execute();
    return c.json(rows);
  })

  // ── POST /hr/roster ──────────────────────────────────────────────────────────
  // Accepts startDate + endDate (inclusive range). Inserts one row per day.
  // Option C: If ANY day in the range already has an assignment for this staff,
  // returns 400 with a list of conflicting dates — nothing is inserted.
  .post("/hr/roster", async (c) => {
    const input = await jsonBody(c, rosterInput);

    // Validate shift exists
    const proposedShift = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, input.shiftId))
      .limit(1)
      .then((res: any) => res[0]);
    if (!proposedShift) {
      return c.json({ error: "Shift not found" }, 404);
    }

    // Expand the date range to individual days
    const dates = expandDateRange(input.startDate, input.endDate);

    // Fetch off-day rules and approved off-day swap requests for this staff
    const weeklyOffDays = await db
      .select()
      .from(staffWeeklyOffDays)
      .where(eq(staffWeeklyOffDays.staffId, input.staffId))
      .execute();

    const approvedOffDayRequests = await db
      .select()
      .from(staffOffDayRequests)
      .where(
        and(
          eq(staffOffDayRequests.staffId, input.staffId),
          eq(staffOffDayRequests.status, "Approved")
        )
      )
      .execute();

    const checkIsOffDay = (dateStr: string) => {
      for (const req of approvedOffDayRequests) {
        if (req.originalDate === dateStr) return false;
        if (req.requestedDate === dateStr) return true;
      }
      const d = new Date(dateStr + "T00:00:00Z");
      const dayOfWeek = d.getUTCDay();
      for (const rule of weeklyOffDays) {
        if (
          dateStr >= rule.effectiveFrom &&
          (!rule.effectiveTo || dateStr <= rule.effectiveTo)
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
          if (days.includes(dayOfWeek)) return true;
        }
      }
      return false;
    };

    // Filter out dates that are scheduled off-days for the staff member
    const workableDates = dates.filter((d) => !checkIsOffDay(d));

    if (dates.length === 1 && workableDates.length === 0) {
      return c.json(
        { error: `Cannot assign shift: ${dates[0]} is a scheduled off-day for this staff member.` },
        400
      );
    }

    if (workableDates.length === 0) {
      return c.json(
        { error: "Cannot assign shift: All selected dates are scheduled off-days for this staff member." },
        400
      );
    }

    // Option C: Error if ANY workable day is already assigned for this staff
    const conflicting = await db
      .select({ date: rosters.date })
      .from(rosters)
      .where(and(eq(rosters.staffId, input.staffId), inArray(rosters.date, workableDates)))
      .execute();

    if (conflicting.length > 0) {
      const conflictDates = conflicting
        .map((r) => r.date)
        .sort()
        .join(", ");
      return c.json(
        { error: `Staff already has assignments on: ${conflictDates}. Remove those entries first.` },
        400
      );
    }

    // Insert one row per workable day
    const values = workableDates.map((date) => ({
      staffId: input.staffId,
      departmentId: input.departmentId,
      shiftId: input.shiftId,
      date,
      notes: input.notes,
    }));

    const inserted = await db.insert(rosters).values(values).returning().execute();

    // Notify employee (one notification per assignment batch)
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
            message:
              dates.length === 1
                ? `You have been assigned to a shift on ${dates[0]}.`
                : `You have been assigned to shifts from ${input.startDate} to ${input.endDate}.`,
            type: "info",
            link: "/hr/roster",
          });
        }
      }
    } catch (err) {
      console.error("Failed to send roster assignment notification:", err);
    }

    return c.json(inserted, 201);
  })

  // ── PUT /hr/roster/:id ───────────────────────────────────────────────────────
  // Updates shiftId and/or notes for a specific per-day roster row.
  // The date is immutable — delete and re-create to move an assignment to a different day.
  .put("/hr/roster/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, rosterUpdateInput);

    const [row] = await db
      .update(rosters)
      .set({ shiftId: input.shiftId, notes: input.notes })
      .where(eq(rosters.id, id))
      .returning()
      .execute();

    if (!row) return c.json({ error: "Roster entry not found" }, 404);
    return c.json(row);
  })

  // ── DELETE /hr/roster/:id ────────────────────────────────────────────────────
  .delete("/hr/roster/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    await db.delete(rosters).where(eq(rosters.id, id)).execute();
    return c.json({ ok: true });
  });
