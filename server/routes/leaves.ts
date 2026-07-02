import { aliasedTable, desc, eq, sql, and, lte, gte, ne } from "drizzle-orm";
import { Hono } from "hono";
import { auth } from "../auth.ts";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  departmentLeaders,
  departments,
  leaveRequests,
  // leaveTypes,
  staff,
  staffDepartments,
  staffSupervisors,
  user,
} from "../db/schema.ts";
import { sendNotification } from "../utils/notifier.ts";
import {
  code,
  getCurrentStaff,
  idParam,
  jsonBody,
  leaveDecisionInput,
  leaveRequestInput,
} from "./shared.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the departmentLeaders row for an employee's active department. */
async function getDeptLeaders(employeeStaffId: number) {
  // First find the active version number for this staffId
  const activeStaff = await db
    .select({ version: staff.version })
    .from(staff)
    .where(sql`${staff.staffId} = ${employeeStaffId} AND ${staff.active} = true`)
    .limit(1)
    .then((res: any) => res[0]);

  if (!activeStaff) return null;

  const activeDept = await db
    .select({ departmentId: staffDepartments.departmentId })
    .from(staffDepartments)
    .where(
      sql`${staffDepartments.staffId} = ${employeeStaffId}
        AND ${staffDepartments.staffVersion} = ${activeStaff.version}
        AND ${staffDepartments.status} = 'Active'`
    )
    .limit(1)
    .then((res: any) => res[0]);

  if (!activeDept) return null;

  return db
    .select()
    .from(departmentLeaders)
    .where(eq(departmentLeaders.departmentId, activeDept.departmentId))
    .limit(1)
    .then((res: any) => res[0] ?? null);
}

/**
 * Send a notification to a staff member identified by their staff ID.
 * Prefers the `userId` FK link; falls back to an email match on the `user` table.
 */
async function notifyStaffById(
  staffId: number,
  title: string,
  message: string,
  link = "/hr/leaves"
) {
  const s = await db
    .select()
    .from(staff)
    .where(sql`${staff.staffId} = ${staffId} AND ${staff.active} = true`)
    .limit(1)
    .then((res: any) => res[0]);
  if (!s) return;

  let u: any = null;
  if ((s as any).userId) {
    u = await db
      .select()
      .from(user)
      .where(eq(user.id, (s as any).userId))
      .limit(1)
      .then((res: any) => res[0]);
  }
  if (!u) {
    u = await db
      .select()
      .from(user)
      .where(eq(user.email, s.email))
      .limit(1)
      .then((res: any) => res[0]);
  }
  if (u) {
    await sendNotification({ userId: u.id, title, message, type: "info", link });
  }
}

/** Notify all users with the `admin` role. */
async function notifyAdmins(title: string, message: string, link = "/hr/leaves") {
  const admins = await db
    .select()
    .from(user)
    .where(eq(user.role, "admin"))
    .execute();
  for (const adm of admins) {
    await sendNotification({ userId: adm.id, title, message, type: "info", link });
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const leavesRoutes = new Hono<AuthEnv>()
  // -------------------------------------------------------------------------
  // POST /hr/leaves — submit a leave request
  // Routing:
  //   Dept head's leave    → notify admins
  //   Dept sub-head's leave → notify dept head (fallback: admins)
  //   Regular staff's leave → notify both head & sub-head (fallback: admins)
  // -------------------------------------------------------------------------
  .post("/hr/leaves", async (c) => {
    const input = await jsonBody(c, leaveRequestInput);
    
    // Check for overlapping leaves
    const reqStart = new Date(input.startDate);
    const reqEnd = new Date(input.endDate);
    
    const existingLeaves = await db
      .select()
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.staffId, input.staffId),
          ne(leaveRequests.status, "Rejected"),
          ne(leaveRequests.status, "Cancelled"),
          lte(leaveRequests.startDate, reqEnd),
          gte(leaveRequests.endDate, reqStart)
        )
      )
      .limit(1)
      .execute();

    if (existingLeaves.length > 0) {
      return c.json({ error: "You already have a leave request overlapping with these dates." }, 400);
    }

    const [row] = await db
      .insert(leaveRequests)
      .values({
        ...input,
        requestNo: code("LV"),
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: "Pending",
      })
      .returning()
      .execute();

    try {
      const employee = await db
        .select()
        .from(staff)
        .where(sql`${staff.staffId} = ${input.staffId} AND ${staff.active} = true`)
        .limit(1)
        .then((res: any) => res[0]);

      if (employee) {
        const leaders = await getDeptLeaders(employee.staffId);
        const empIsHead = leaders?.headStaffId === employee.staffId;
        const empIsSubhead = leaders?.subheadStaffId === employee.staffId;
        const msg = `${employee.name} requested leave: ${row.requestNo} (${input.leaveType})`;

        if (empIsHead) {
          // Dept head's leave → notify admins
          await notifyAdmins("New Leave Request", msg);
        } else if (empIsSubhead) {
          // Sub-head's leave → notify dept head (fallback: admins)
          if (leaders?.headStaffId) {
            await notifyStaffById(leaders.headStaffId, "New Leave Request", msg);
          } else {
            await notifyAdmins("New Leave Request", msg);
          }
        } else {
          // Regular staff → notify head + sub-head (fallback: admins)
          let notified = false;
          if (leaders?.headStaffId) {
            await notifyStaffById(leaders.headStaffId, "New Leave Request", msg);
            notified = true;
          }
          if (leaders?.subheadStaffId) {
            await notifyStaffById(leaders.subheadStaffId, "New Leave Request", msg);
            notified = true;
          }
          if (!notified) {
            await notifyAdmins("New Leave Request", msg);
          }
        }
      }
    } catch (err) {
      console.error("Failed to send leave submission notification:", err);
    }

    return c.json(row, 201);
  })
  // -------------------------------------------------------------------------
  // GET /hr/leaves — list leaves with dept-hierarchy-based visibility
  // -------------------------------------------------------------------------
  .get("/hr/leaves", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const isAdmin = session?.user.role === "admin";
    const currentStaff = await getCurrentStaff(c);

    const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10));
    const limit = Math.max(1, parseInt(c.req.query("limit") ?? "10", 10));
    const search = c.req.query("search");
    const status = c.req.query("status");
    const leaveType = c.req.query("leaveType");
    const sortBy = c.req.query("sortBy") ?? "createdAt";
    const sortOrder = c.req.query("sortOrder") ?? "desc";

    // Join dept leader info so we can apply role-based visibility in-memory
    const rows = await db
      .select({
        id: leaveRequests.id,
        requestNo: leaveRequests.requestNo,
        leaveType: leaveRequests.leaveType,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        reviewerNote: leaveRequests.reviewerNote,
        createdAt: leaveRequests.createdAt,
        employeeCode: staff.employeeCode,
        staffName: staff.name,
        staffId: leaveRequests.staffId,
        supervisorLevel1Id: staffSupervisors.supervisor1Id,
        supervisorLevel2Id: staffSupervisors.supervisor2Id,
        headStaffId: departmentLeaders.headStaffId,
        subheadStaffId: departmentLeaders.subheadStaffId,
        departmentName: departments.name,
        forwardedToStaffId: leaveRequests.forwardedToStaffId,
      })
      .from(leaveRequests)
      .innerJoin(staff, eq(leaveRequests.staffId, staff.staffId))
      .leftJoin(
        staffSupervisors,
        sql`${staff.staffId} = ${staffSupervisors.staffId} AND ${staff.version} = ${staffSupervisors.staffVersion}`
      )
      .leftJoin(
        staffDepartments,
        sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staff.version} = ${staffDepartments.staffVersion} AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(departmentLeaders, eq(departments.id, departmentLeaders.departmentId))
      .where(eq(staff.active, true))
      .orderBy(desc(leaveRequests.createdAt))
      .execute();

    // Visibility rules:
    //   Admin           → all leaves
    //   Dept head       → Pending (regular staff + sub-head) + Forwarded from their dept + all history
    //   Dept sub-head   → Pending (regular staff only) from their dept + all history
    //   Others          → Approved / Rejected history iewonly
    let filteredRows = rows.filter((row) => {
      if (isAdmin) return true;
      if (!currentStaff) return row.status !== "Pending" && row.status !== "Forwarded";

      // Staff always see their own leaves regardless of status
      if (currentStaff.staffId === row.staffId) return true;

      const empIsHead = row.headStaffId !== null && row.headStaffId === row.staffId;
      const empIsSubhead = row.subheadStaffId !== null && row.subheadStaffId === row.staffId;
      const currentIsHead = currentStaff.staffId === row.headStaffId;
      const currentIsSubhead = currentStaff.staffId === row.subheadStaffId;
      const currentIsDirectSupervisor =
        currentStaff.staffId === row.supervisorLevel1Id ||
        currentStaff.staffId === row.supervisorLevel2Id;

      const currentIsForwardedTarget = row.forwardedToStaffId !== null && currentStaff.staffId === row.forwardedToStaffId;

      // Supervisor or Forwarded Target sees all leaves for their subordinates
      if (currentIsDirectSupervisor || currentIsForwardedTarget) return true;

      if (row.status === "Pending") {
        if (empIsHead) return false; 
        if (empIsSubhead) return currentIsHead;
        // Regular staff: both head and sub-head see it
        return currentIsHead || currentIsSubhead;
      }

      if (row.status === "Forwarded") {
        return currentIsHead; 
      }

      return true; // Approved / Rejected: visible to all
    });

    if (status && status !== "All") {
      filteredRows = filteredRows.filter((row) => row.status === status);
    }
    if (leaveType && leaveType !== "All") {
      filteredRows = filteredRows.filter((row) => row.leaveType === leaveType);
    }
    if (search) {
      const s = search.toLowerCase();
      filteredRows = filteredRows.filter(
        (row) =>
          row.staffName.toLowerCase().includes(s) ||
          row.employeeCode.toLowerCase().includes(s) ||
          row.requestNo.toLowerCase().includes(s) ||
          row.reason.toLowerCase().includes(s)
      );
    }

    filteredRows.sort((a, b) => {
      const valA = a[sortBy as keyof typeof a];
      const valB = b[sortBy as keyof typeof b];

      if (sortBy === "createdAt" || sortBy === "startDate" || sortBy === "endDate") {
        const timeA = valA ? new Date(valA as string).getTime() : 0;
        const timeB = valB ? new Date(valB as string).getTime() : 0;
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }

      const strA = String(valA ?? "").toLowerCase();
      const strB = String(valB ?? "").toLowerCase();
      if (strA < strB) return sortOrder === "asc" ? -1 : 1;
      if (strA > strB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const total = filteredRows.length;
    const startIndex = (page - 1) * limit;
    const paginatedRows = filteredRows.slice(startIndex, startIndex + limit);

    return c.json({ data: paginatedRows, total, page, limit });
  })
  // -------------------------------------------------------------------------
  // GET /hr/leaves/:id — leave detail
  // -------------------------------------------------------------------------
  .get("/hr/leaves/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const isAdmin = session?.user.role === "admin";
    const currentStaff = await getCurrentStaff(c);

    const manager = aliasedTable(staff, "manager");
    const director = aliasedTable(staff, "director");
    const forwardedTarget = aliasedTable(staff, "forwardedTarget");

    const row = await db
      .select({
        id: leaveRequests.id,
        requestNo: leaveRequests.requestNo,
        leaveType: leaveRequests.leaveType,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        reviewerNote: leaveRequests.reviewerNote,
        reviewedAt: leaveRequests.reviewedAt,
        createdAt: leaveRequests.createdAt,
        staffId: staff.staffId,
        employeeCode: staff.employeeCode,
        staffName: staff.name,
        staffEmail: staff.email,
        staffPhone: staff.phone,
        staffRole: staff.role,
        departmentName: departments.name,
        supervisorLevel1Id: manager.staffId,
        supervisorLevel1Name: manager.name,
        supervisorLevel2Id: director.staffId,
        supervisorLevel2Name: director.name,
        headStaffId: departmentLeaders.headStaffId,
        subheadStaffId: departmentLeaders.subheadStaffId,
        forwardedToStaffId: leaveRequests.forwardedToStaffId,
        forwardedToStaffName: forwardedTarget.name,
      })
      .from(leaveRequests)
      .innerJoin(staff, eq(leaveRequests.staffId, staff.staffId))
      .leftJoin(
        staffSupervisors,
        sql`${staff.staffId} = ${staffSupervisors.staffId} AND ${staff.version} = ${staffSupervisors.staffVersion}`
      )
      .leftJoin(
        staffDepartments,
        sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staff.version} = ${staffDepartments.staffVersion} AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(departmentLeaders, eq(departments.id, departmentLeaders.departmentId))
      .leftJoin(manager, eq(staffSupervisors.supervisor1Id, manager.staffId))
      .leftJoin(director, eq(staffSupervisors.supervisor2Id, director.staffId))
      .leftJoin(forwardedTarget, eq(leaveRequests.forwardedToStaffId, forwardedTarget.staffId))
      .where(and(eq(leaveRequests.id, id),eq(staff.active, true)))
      .limit(1)
      .then((res: any) => res[0]) as any;

    if (!row) {
      return c.json({ error: "Leave request not found" }, 404);
    }

    const isEmployee = currentStaff?.id === row.staffId;
    const isDeptLeader =
      currentStaff &&
      (currentStaff.staffId === row.headStaffId || currentStaff.staffId === row.subheadStaffId);
    const isSupervisor =
      currentStaff &&
      (currentStaff.staffId === row.supervisorLevel1Id || currentStaff.staffId === row.supervisorLevel2Id || currentStaff.staffId === row.forwardedToStaffId);

    if (!isAdmin && !isEmployee && !isSupervisor && !isDeptLeader) {
      return c.json({ error: "You are not authorized to view this leave request" }, 403);
    }

    return c.json(row);
  })
  // -------------------------------------------------------------------------
  // POST /hr/leaves/:id/approve
  // Authorization:
  //   Dept head's leave   → admin only
  //   Sub-head's leave    → dept head (or admin)
  //   Regular staff leave → dept head OR sub-head on Pending; head only on Forwarded
  // -------------------------------------------------------------------------
  .post("/hr/leaves/:id/approve", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = leaveDecisionInput.parse(await c.req.json().catch(() => ({})));
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const isAdmin = session?.user.role === "admin";
    const currentStaff = await getCurrentStaff(c);

    if (!currentStaff && !isAdmin) return c.json({ error: "Staff record not found" }, 404);

    const leaveRequest = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id))
      .limit(1)
      .then((res: any) => res[0]);
    if (!leaveRequest) return c.json({ error: "Leave request not found" }, 404);

    const employee = await db
      .select()
      .from(staff)
      .where(sql`${staff.staffId} = ${leaveRequest.staffId} AND ${staff.active} = true`)
      .limit(1)
      .then((res: any) => res[0]);
    if (!employee) return c.json({ error: "Employee not found" }, 404);

    const leaders = await getDeptLeaders(employee.staffId);
    const empIsHead = leaders?.headStaffId === employee.staffId;
    const empIsSubhead = leaders?.subheadStaffId === employee.staffId;

    const supervisors = await db
      .select()
      .from(staffSupervisors)
      .where(sql`${staffSupervisors.staffId} = ${employee.staffId} AND ${staffSupervisors.staffVersion} = ${employee.version}`)
      .limit(1)
      .then((res: any) => res[0]);

    const isDirectSupervisor = currentStaff && (
      (supervisors && (currentStaff.staffId === supervisors.supervisor1Id || currentStaff.staffId === supervisors.supervisor2Id)) ||
      currentStaff.staffId === leaveRequest.forwardedToStaffId
    );

    const canAct = (() => {
      if (isAdmin) return true;
      if (!currentStaff) return false;
      if (empIsHead) return isDirectSupervisor; // Supervisor or Admin acts on dept head's leave
      if (empIsSubhead) return isDirectSupervisor || currentStaff.staffId === leaders?.headStaffId;
      // Regular staff
      if (leaveRequest.status === "Pending")
        return isDirectSupervisor || currentStaff.staffId === leaders?.headStaffId || currentStaff.staffId === leaders?.subheadStaffId;
      if (leaveRequest.status === "Forwarded")
        return isDirectSupervisor || currentStaff.staffId === leaders?.headStaffId;
      return false;
    })();

    if (!canAct) return c.json({ error: "You are not authorized to approve this leave request" }, 403);

    await db
      .update(leaveRequests)
      .set({ status: "Approved", reviewedAt: new Date(), reviewerNote: input.reviewerNote })
      .where(eq(leaveRequests.id, id))
      .execute();

    try {
      let u: any = null;
      if ((employee as any).userId) {
        u = await db.select().from(user).where(eq(user.id, (employee as any).userId)).limit(1).then((res: any) => res[0]);
      }
      if (!u) {
        u = await db.select().from(user).where(eq(user.email, employee.email)).limit(1).then((res: any) => res[0]);
      }
      if (u) {
        await sendNotification({ userId: u.id, title: "Leave Approved", message: `Your leave request ${leaveRequest.requestNo} has been approved.`, type: "success", link: "/hr/leaves" });
      }
    } catch (err) {
      console.error("Failed to send leave approval notification:", err);
    }

    return c.json({ ok: true });
  })
  // -------------------------------------------------------------------------
  // POST /hr/leaves/:id/reject — same auth rules as approve
  // -------------------------------------------------------------------------
  .post("/hr/leaves/:id/reject", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = leaveDecisionInput.parse(await c.req.json().catch(() => ({})));
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const isAdmin = session?.user.role === "admin";
    const currentStaff = await getCurrentStaff(c);

    if (!currentStaff && !isAdmin) return c.json({ error: "Staff record not found" }, 404);

    const leaveRequest = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id))
      .limit(1)
      .then((res: any) => res[0]);
    if (!leaveRequest) return c.json({ error: "Leave request not found" }, 404);

    const employee = await db
      .select()
      .from(staff)
      .where(sql`${staff.staffId} = ${leaveRequest.staffId} AND ${staff.active} = true`)
      .limit(1)
      .then((res: any) => res[0]);
    if (!employee) return c.json({ error: "Employee not found" }, 404);

    const leaders = await getDeptLeaders(employee.staffId);
    const empIsHead = leaders?.headStaffId === employee.staffId;
    const empIsSubhead = leaders?.subheadStaffId === employee.staffId;

    const supervisors = await db
      .select()
      .from(staffSupervisors)
      .where(sql`${staffSupervisors.staffId} = ${employee.staffId} AND ${staffSupervisors.staffVersion} = ${employee.version}`)
      .limit(1)
      .then((res: any) => res[0]);

    const isDirectSupervisor = currentStaff && (
      (supervisors && (currentStaff.staffId === supervisors.supervisor1Id || currentStaff.staffId === supervisors.supervisor2Id)) ||
      currentStaff.staffId === leaveRequest.forwardedToStaffId
    );

    const canAct = (() => {
      if (isAdmin) return true;
      if (!currentStaff) return false;
      if (empIsHead) return isDirectSupervisor;
      if (empIsSubhead) return isDirectSupervisor || currentStaff.staffId === leaders?.headStaffId;
      if (leaveRequest.status === "Pending")
        return isDirectSupervisor || currentStaff.staffId === leaders?.headStaffId || currentStaff.staffId === leaders?.subheadStaffId;
      if (leaveRequest.status === "Forwarded")
        return isDirectSupervisor || currentStaff.staffId === leaders?.headStaffId;
      return false;
    })();

    if (!canAct) return c.json({ error: "You are not authorized to reject this leave request" }, 403);

    await db
      .update(leaveRequests)
      .set({ status: "Rejected", reviewedAt: new Date(), reviewerNote: input.reviewerNote })
      .where(eq(leaveRequests.id, id))
      .execute();

    try {
      let u: any = null;
      if ((employee as any).userId) {
        u = await db.select().from(user).where(eq(user.id, (employee as any).userId)).limit(1).then((res: any) => res[0]);
      }
      if (!u) {
        u = await db.select().from(user).where(eq(user.email, employee.email)).limit(1).then((res: any) => res[0]);
      }
      if (u) {
        await sendNotification({ userId: u.id, title: "Leave Rejected", message: `Your leave request ${leaveRequest.requestNo} has been rejected.`, type: "error", link: "/hr/leaves" });
      }
    } catch (err) {
      console.error("Failed to send leave rejection notification:", err);
    }

    return c.json({ ok: true });
  })
  // -------------------------------------------------------------------------
  // POST /hr/leaves/:id/forward
  // Only the dept sub-head can forward a regular staff member's Pending leave
  // to the dept head for final review.
  // -------------------------------------------------------------------------
  .post("/hr/leaves/:id/forward", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = leaveDecisionInput.parse(await c.req.json().catch(() => ({})));
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const isAdmin = session?.user.role === "admin";
    const currentStaff = await getCurrentStaff(c);

    if (!currentStaff && !isAdmin) return c.json({ error: "Staff record not found" }, 404);

    const leaveRequest = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id))
      .limit(1)
      .then((res: any) => res[0]);
    if (!leaveRequest) return c.json({ error: "Leave request not found" }, 404);

    if (leaveRequest.status !== "Pending") {
      return c.json({ error: "Only pending leave requests can be forwarded" }, 400);
    }

    const employee = await db
      .select()
      .from(staff)
      .where(sql`${staff.staffId} = ${leaveRequest.staffId} AND ${staff.active} = true`)
      .limit(1)
      .then((res: any) => res[0]);
    if (!employee) return c.json({ error: "Employee not found" }, 404);

    const leaders = await getDeptLeaders(employee.staffId);
    const empIsHead = leaders?.headStaffId === employee.staffId;
    const empIsSubhead = leaders?.subheadStaffId === employee.staffId;

    const supervisors = await db
      .select()
      .from(staffSupervisors)
      .where(sql`${staffSupervisors.staffId} = ${employee.staffId} AND ${staffSupervisors.staffVersion} = ${employee.version}`)
      .limit(1)
      .then((res: any) => res[0]);

    const isDirectSupervisor = currentStaff && (
      (supervisors && (currentStaff.staffId === supervisors.supervisor1Id || currentStaff.staffId === supervisors.supervisor2Id)) ||
      currentStaff.staffId === leaveRequest.forwardedToStaffId
    );

    if (!input.forwardToStaffId) {
      return c.json({ error: "Missing target supervisor to forward to" }, 400);
    }

    // Any supervisor (or admin) can forward
    const isCurrentSubhead = currentStaff?.staffId === leaders?.subheadStaffId;
    if (!isAdmin && !isCurrentSubhead && !isDirectSupervisor) {
      return c.json({ error: "Only a supervisor can forward a leave request" }, 403);
    }

    await db
      .update(leaveRequests)
      .set({ status: "Forwarded", reviewedAt: new Date(), reviewerNote: input.reviewerNote, forwardedToStaffId: input.forwardToStaffId })
      .where(eq(leaveRequests.id, id))
      .execute();

    // Notify the target supervisor
    try {
      await notifyStaffById(
        input.forwardToStaffId,
        "Leave Request Forwarded",
        `${employee.name}'s leave request ${leaveRequest.requestNo} has been forwarded to you for final review.`
      );
    } catch (err) {
      console.error("Failed to send forward notification:", err);
    }

    return c.json({ ok: true });
  });
