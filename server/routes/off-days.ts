import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import { staff, staffDepartments, staffOffDayRequests, staffWeeklyOffDays, user } from "../db/schema.ts";
import { sendNotification } from "../utils/notifier.ts";
import {
  getCurrentStaff,
  idParam,
  jsonBody,
  offDayRequestInput,
  offDayReviewInput,
  weeklyOffDayInput,
} from "./shared.ts";

export const offDaysRoutes = new Hono<AuthEnv>()

  /**
   * GET /hr/weekly-off-days/my
   * Get active weekly off-day rules for current logged in staff.
   */
  .get("/hr/weekly-off-days/my", async (c) => {
    const currentStaff = await getCurrentStaff(c);
    if (!currentStaff) return c.json([]);

    const rows = await db
      .select()
      .from(staffWeeklyOffDays)
      .where(eq(staffWeeklyOffDays.staffId, currentStaff.staffId))
      .orderBy(desc(staffWeeklyOffDays.effectiveFrom))
      .execute();

    return c.json(rows);
  })

  /**
   * GET /hr/weekly-off-days
   * List all weekly off-day rules.
   */
  .get("/hr/weekly-off-days", async (c) => {
    const staffIdFilter = c.req.query("staffId");
    const departmentIdFilter = c.req.query("departmentId");

    const conditions: any[] = [];
    if (staffIdFilter) {
      conditions.push(eq(staffWeeklyOffDays.staffId, parseInt(staffIdFilter)));
    }
    if (departmentIdFilter) {
      conditions.push(eq(staffDepartments.departmentId, parseInt(departmentIdFilter)));
    }

    const rows = await db
      .select({
        id: staffWeeklyOffDays.id,
        staffId: staffWeeklyOffDays.staffId,
        staffName: staff.name,
        employeeCode: staff.employeeCode,
        daysOfWeek: staffWeeklyOffDays.daysOfWeek,
        effectiveFrom: staffWeeklyOffDays.effectiveFrom,
        effectiveTo: staffWeeklyOffDays.effectiveTo,
        notes: staffWeeklyOffDays.notes,
        createdAt: staffWeeklyOffDays.createdAt,
      })
      .from(staffWeeklyOffDays)
      .innerJoin(
        staff,
        sql`${staffWeeklyOffDays.staffId} = ${staff.staffId} AND ${staff.active} = true`
      )
      .leftJoin(
        staffDepartments,
        sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staff.version} = ${staffDepartments.staffVersion} AND ${staffDepartments.status} = 'Active'`
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(staffWeeklyOffDays.effectiveFrom))
      .execute();

    return c.json(rows);
  })

  /**
   * POST /hr/weekly-off-days
   * Create a new weekly off day rule for a staff member (HR/Admin).
   */
  .post("/hr/weekly-off-days", async (c) => {
    const session = c.get("session");
    const isAdminOrHr = session?.user?.role === "admin" || session?.user?.role === "hr";
    if (!isAdminOrHr) return c.json({ error: "Forbidden" }, 403);

    const input = await jsonBody(c, weeklyOffDayInput);

    const targetStaff = await db
      .select({ name: staff.name })
      .from(staff)
      .where(and(eq(staff.staffId, input.staffId), eq(staff.active, true)))
      .limit(1)
      .then((res: any) => res[0]);

    if (!targetStaff) {
      return c.json({ error: "Employee not found or inactive" }, 404);
    }

    const [row] = await db
      .insert(staffWeeklyOffDays)
      .values({
        staffId: input.staffId,
        daysOfWeek: input.daysOfWeek,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo || null,
        notes: input.notes,
      })
      .returning()
      .execute();

    return c.json(row, 201);
  })

  /**
   * PUT /hr/weekly-off-days/:id
   * Update a weekly off day rule (HR/Admin).
   */
  .put("/hr/weekly-off-days/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const session = c.get("session");
    const isAdminOrHr = session?.user?.role === "admin" || session?.user?.role === "hr";
    if (!isAdminOrHr) return c.json({ error: "Forbidden" }, 403);

    const input = await jsonBody(c, weeklyOffDayInput);

    const [updated] = await db
      .update(staffWeeklyOffDays)
      .set({
        daysOfWeek: input.daysOfWeek,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo || null,
        notes: input.notes,
      })
      .where(eq(staffWeeklyOffDays.id, id))
      .returning()
      .execute();

    if (!updated) {
      return c.json({ error: "Weekly off-day rule not found" }, 404);
    }

    return c.json(updated);
  })

  /**
   * DELETE /hr/weekly-off-days/:id
   * Delete a weekly off day rule (HR/Admin).
   */
  .delete("/hr/weekly-off-days/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const session = c.get("session");
    const isAdminOrHr = session?.user?.role === "admin" || session?.user?.role === "hr";
    if (!isAdminOrHr) return c.json({ error: "Forbidden" }, 403);

    await db.delete(staffWeeklyOffDays).where(eq(staffWeeklyOffDays.id, id)).execute();
    return c.json({ ok: true });
  })

  /**
   * GET /hr/off-day-requests
   * List off-day change requests.
   * - HR/admin: see all (filterable by status, staffId).
   * - Staff: see only their own.
   */
  .get("/hr/off-day-requests", async (c) => {
    const statusFilter = c.req.query("status");
    const staffIdFilter = c.req.query("staffId");
    const departmentIdFilter = c.req.query("departmentId");

    const conditions: any[] = [];

    if (statusFilter) conditions.push(eq(staffOffDayRequests.status, statusFilter));
    if (staffIdFilter) conditions.push(eq(staffOffDayRequests.staffId, parseInt(staffIdFilter)));
    if (departmentIdFilter) conditions.push(eq(staffDepartments.departmentId, parseInt(departmentIdFilter)));

    const rows = await db
      .select({
        id: staffOffDayRequests.id,
        staffId: staffOffDayRequests.staffId,
        staffName: staff.name,
        employeeCode: staff.employeeCode,
        originalDate: staffOffDayRequests.originalDate,
        requestedDate: staffOffDayRequests.requestedDate,
        reason: staffOffDayRequests.reason,
        status: staffOffDayRequests.status,
        reviewedById: staffOffDayRequests.reviewedById,
        reviewerNote: staffOffDayRequests.reviewerNote,
        createdAt: staffOffDayRequests.createdAt,
        updatedAt: staffOffDayRequests.updatedAt,
      })
      .from(staffOffDayRequests)
      .innerJoin(
        staff,
        sql`${staffOffDayRequests.staffId} = ${staff.staffId} AND ${staff.active} = true`
      )
      .leftJoin(
        staffDepartments,
        sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staff.version} = ${staffDepartments.staffVersion} AND ${staffDepartments.status} = 'Active'`
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(staffOffDayRequests.createdAt))
      .execute();

    return c.json(rows);
  })

  /**
   * POST /hr/off-day-requests
   * Staff submits a new off-day change request.
   * Body: { originalDate, requestedDate, reason? }
   */
  .post("/hr/off-day-requests", async (c) => {
    const session = c.get("session");
    const isAdminOrHr = session?.user?.role === "admin" || session?.user?.role === "hr";

    const input = await jsonBody(c, offDayRequestInput);

    let targetStaffId: number;
    let targetStaffName: string = "";

    if (isAdminOrHr && input.staffId) {
      targetStaffId = input.staffId;
      const targetStaff = await db
        .select({ name: staff.name })
        .from(staff)
        .where(sql`${staff.staffId} = ${targetStaffId} AND ${staff.active} = true`)
        .limit(1)
        .then((res: any) => res[0]);

      if (!targetStaff) {
        return c.json({ error: "Target employee not found" }, 404);
      }
      targetStaffName = targetStaff.name;
    } else {
      const currentStaff = await getCurrentStaff(c);
      if (!currentStaff) {
        return c.json({ error: "No staff record found for your account" }, 400);
      }
      targetStaffId = currentStaff.staffId;
      targetStaffName = currentStaff.name;
    }

    // Prevent duplicate pending request for the same original date
    const existing = await db
      .select({ id: staffOffDayRequests.id })
      .from(staffOffDayRequests)
      .where(
        and(
          eq(staffOffDayRequests.staffId, targetStaffId),
          eq(staffOffDayRequests.originalDate, input.originalDate),
          eq(staffOffDayRequests.status, "Pending")
        )
      )
      .limit(1)
      .then((res: any) => res[0]);

    if (existing) {
      return c.json(
        { error: "A pending request already exists for that off day" },
        400
      );
    }

    const [row] = await db
      .insert(staffOffDayRequests)
      .values({
        staffId: targetStaffId,
        originalDate: input.originalDate,
        requestedDate: input.requestedDate,
        reason: input.reason,
        status: "Pending",
      })
      .returning()
      .execute();

    // Notify HR/admin users
    try {
      const hrUsers = await db
        .select({ id: user.id })
        .from(user)
        .where(sql`${user.role} IN ('admin', 'hr')`)
        .execute();
      for (const u of hrUsers) {
        await sendNotification({
          userId: u.id,
          title: "Off-Day Change Request",
          message: `${targetStaffName} has requested to move their off day from ${input.originalDate} to ${input.requestedDate}.`,
          type: "info",
          link: "/hr/off-day-requests",
        });
      }
    } catch (err) {
      console.error("Failed to send off-day request notification:", err);
    }

    return c.json(row, 201);
  })

  /**
   * PUT /hr/off-day-requests/:id
   * - Staff: cancel their own pending request (status: "Cancelled")
   * - HR/admin: approve or reject (status: "Approved" | "Rejected")
   */
  .put("/hr/off-day-requests/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const session = c.get("session");
    const isAdminOrHr =
      session?.user?.role === "admin" || session?.user?.role === "hr";

    const body = await c.req.json();

    const existing = await db
      .select()
      .from(staffOffDayRequests)
      .where(eq(staffOffDayRequests.id, id))
      .limit(1)
      .then((res: any) => res[0]);

    if (!existing) return c.json({ error: "Request not found" }, 404);

    // Staff cancelling their own pending request
    if (body.status === "Cancelled") {
      const currentStaff = await getCurrentStaff(c);
      if (!currentStaff || existing.staffId !== currentStaff.staffId) {
        return c.json({ error: "Forbidden" }, 403);
      }
      if (existing.status !== "Pending") {
        return c.json({ error: "Only pending requests can be cancelled" }, 400);
      }
      const [updated] = await db
        .update(staffOffDayRequests)
        .set({ status: "Cancelled" })
        .where(eq(staffOffDayRequests.id, id))
        .returning()
        .execute();
      return c.json(updated);
    }

    // HR/admin approving or rejecting
    if (!isAdminOrHr) return c.json({ error: "Forbidden" }, 403);
    if (existing.status !== "Pending") {
      return c.json({ error: "Only pending requests can be reviewed" }, 400);
    }

    const input = offDayReviewInput.parse(body);

    const [updated] = await db
      .update(staffOffDayRequests)
      .set({
        status: input.status,
        reviewedById: session.user.id,
        reviewerNote: input.reviewerNote,
      })
      .where(eq(staffOffDayRequests.id, id))
      .returning()
      .execute();

    // Notify the staff member
    try {
      const staffRow = await db
        .select({ userId: staff.userId })
        .from(staff)
        .where(sql`${staff.staffId} = ${existing.staffId} AND ${staff.active} = true`)
        .limit(1)
        .then((res: any) => res[0]);

      if (staffRow?.userId) {
        await sendNotification({
          userId: staffRow.userId,
          title: `Off-Day Request ${input.status}`,
          message:
            input.status === "Approved"
              ? `Your request to move your off day from ${existing.originalDate} to ${existing.requestedDate} has been approved.`
              : `Your request to move your off day from ${existing.originalDate} to ${existing.requestedDate} has been rejected.${input.reviewerNote ? ` Note: ${input.reviewerNote}` : ""}`,
          type: input.status === "Approved" ? "success" : "warning",
          link: "/hr/off-day-requests",
        });
      }
    } catch (err) {
      console.error("Failed to send review notification:", err);
    }

    return c.json(updated);
  });

