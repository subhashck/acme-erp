import { aliasedTable, desc, eq, sql, and, lte, gte, ne, like } from "drizzle-orm";
import { Hono } from "hono";
import { auth } from "../auth.ts";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  departmentLeaders,
  departments,
  leaveRequests,
  nursingSupers,
  staff,
  staffDepartments,
  staffSupervisors,
  user,
  shifts,
  rosters,
} from "../db/schema.ts";
import { sendNotification } from "../utils/notifier.ts";
import { saveLeaveDocument, getLeaveDocumentStream } from "../utils/upload.ts";
import {
  code,
  getCurrentStaff,
  idParam,
  isManagementApprover,
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
    // Use Hono's parseBody() — compatible with @hono/node-server multipart handling
    const body = await c.req.parseBody();

    const rawInput = {
      staffId: Number(body["staffId"]),
      leaveType: String(body["leaveType"] ?? ""),
      isHalfDay: body["isHalfDay"] === "true",
      startDate: String(body["startDate"] ?? ""),
      endDate: String(body["endDate"] ?? ""),
      reason: String(body["reason"] ?? ""),
    };

    const input = leaveRequestInput.parse(rawInput);

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

    const employee = await db
      .select()
      .from(staff)
      .where(sql`${staff.staffId} = ${input.staffId} AND ${staff.active} = true`)
      .limit(1)
      .then((res: any) => res[0]);

    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    const leaders = await getDeptLeaders(employee.staffId);
    const empIsHead = leaders?.headStaffId === employee.staffId;

    let computedApproverIds: number[] = [];
    if (empIsHead) {
      const supervisors = await db
        .select()
        .from(staffSupervisors)
        .where(sql`${staffSupervisors.staffId} = ${employee.staffId} AND ${staffSupervisors.staffVersion} = ${employee.version}`)
        .limit(1)
        .then((res: any) => res[0]);
      if (supervisors) {
        if (supervisors.supervisor1Id) computedApproverIds.push(supervisors.supervisor1Id);
        if (supervisors.supervisor2Id) computedApproverIds.push(supervisors.supervisor2Id);
      }
    } else {
      if (leaders?.headStaffId) computedApproverIds.push(leaders.headStaffId);
      if (leaders?.subheadStaffId) computedApproverIds.push(leaders.subheadStaffId);
    }

    computedApproverIds = Array.from(new Set(computedApproverIds)).filter(id => id !== employee.staffId);

    // Generate request number first so we can use it in the filename
    const requestNo = code("LV");

    // Handle optional file upload — save to disk, store relative path
    let supportingDocumentPath: string | null = null;
    const fileEntry = body["supportingDocument"];
    if (fileEntry && fileEntry instanceof File && fileEntry.size > 0) {
      try {
        supportingDocumentPath = await saveLeaveDocument(fileEntry, requestNo);
      } catch (err) {
        console.error("Failed to save supporting document:", err);
        return c.json({ error: "Failed to save supporting document" }, 500);
      }
    }

    const [row] = await db
      .insert(leaveRequests)
      .values({
        ...input,
        requestNo,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: "Pending",
        approverIds: JSON.stringify(computedApproverIds),
        supportingDocument: supportingDocumentPath,
      })
      .returning()
      .execute();

    try {
      const msg = `${employee.name} requested leave: ${row.requestNo} (${input.leaveType})`;
      if (computedApproverIds.length > 0) {
        for (const appRowId of computedApproverIds) {
          await notifyStaffById(appRowId, "New Leave Request", msg);
        }
      } else {
        await notifyAdmins("New Leave Request", msg);
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
    const isHrUser = session?.user.role === "hr" || currentStaff?.role === "hr";
    const isMgtApprover = await isManagementApprover(c);

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
        isClinical: departments.isClinical,
        forwardedToStaffId: leaveRequests.forwardedToStaffId,
        approverIds: leaveRequests.approverIds,
        supportingDocument: leaveRequests.supportingDocument,
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

    const isNursingSuper = currentStaff
      ? await db
          .select()
          .from(nursingSupers)
          .where(and(eq(nursingSupers.staffId, currentStaff.staffId), eq(nursingSupers.active, true)))
          .limit(1)
          .then((res: any) => !!res[0])
      : false;

    // Visibility rules:
    //   Admin           → all leaves
    //   Requester       → their own leaves
    //   Nursing Super   → leaves for staff in clinical departments
    //   HR User         → leaves for staff in non-clinical departments
    //   Approver        → Pending or Pending Payroll Approval leaves where they are in approverIds
    //   Forward Target  → Forwarded leaves where they are the forwardedToStaffId
    //   Resolved        → Approved/Rejected history visible to all staff
    let filteredRows = rows.filter((row) => {
      if (isAdmin || isHrUser || isMgtApprover) return true;
      if (!currentStaff) return false;

      // Requester sees their own leaves
      if (currentStaff.staffId === row.staffId) return true;

      // Nursing Supers see leaves for staff in clinical departments
      if (isNursingSuper && row.isClinical) return true;

      // Dept head/subhead sees their department's leaves
      const isDeptLeader = currentStaff.staffId === row.headStaffId || currentStaff.staffId === row.subheadStaffId;
      if (isDeptLeader) return true;

      // Supervisor sees their subordinates' leaves
      const isSupervisor = currentStaff.staffId === row.supervisorLevel1Id || currentStaff.staffId === row.supervisorLevel2Id;
      if (isSupervisor) return true;

      // Check if current staff is in approverIds list
      let isApprover = false;
      try {
        const apps = JSON.parse(row.approverIds ?? "[]");
        if (Array.isArray(apps) && apps.includes(currentStaff.staffId)) {
          isApprover = true;
        }
      } catch (e) {}

      // Forward target sees forwarded leaves
      const isForwardedTarget = row.forwardedToStaffId !== null && currentStaff.staffId === row.forwardedToStaffId;

      return isApprover || isForwardedTarget;
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
    const isHrUser = session?.user.role === "hr" || currentStaff?.role === "hr";
    const isMgtApprover = await isManagementApprover(c);

    const isNursingSuper = currentStaff
      ? await db
          .select()
          .from(nursingSupers)
          .where(and(eq(nursingSupers.staffId, currentStaff.staffId), eq(nursingSupers.active, true)))
          .limit(1)
          .then((res: any) => !!res[0])
      : false;

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
        isClinical: departments.isClinical,
        supervisorLevel1Id: manager.staffId,
        supervisorLevel1Name: manager.name,
        supervisorLevel2Id: director.staffId,
        supervisorLevel2Name: director.name,
        headStaffId: departmentLeaders.headStaffId,
        subheadStaffId: departmentLeaders.subheadStaffId,
        forwardedToStaffId: leaveRequests.forwardedToStaffId,
        forwardedToStaffName: forwardedTarget.name,
        approverIds: leaveRequests.approverIds,
        supportingDocument: leaveRequests.supportingDocument,
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

    const isEmployee = currentStaff && currentStaff.staffId === row.staffId;
    let isApprover = false;
    try {
      const apps = JSON.parse(row.approverIds ?? "[]");
      if (Array.isArray(apps) && currentStaff && apps.includes(currentStaff.staffId)) {
        isApprover = true;
      }
    } catch (e) {}

    const isForwardedTarget = currentStaff && row.forwardedToStaffId !== null && currentStaff.staffId === row.forwardedToStaffId;
    const isClinicalDept = row.isClinical === true;

    const canView =
      isAdmin ||
      isHrUser ||
      isMgtApprover ||
      (isNursingSuper && isClinicalDept) ||
      isEmployee ||
      isApprover ||
      isForwardedTarget;

    if (!canView) {
      return c.json({ error: "You are not authorized to view this leave request" }, 403);
    }

    return c.json(row);
  })
  // -------------------------------------------------------------------------
  // GET /hr/leaves/:id/document — stream the supporting document file
  // -------------------------------------------------------------------------
  .get("/hr/leaves/:id/document", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const isAdmin = session?.user.role === "admin";
    const currentStaff = await getCurrentStaff(c);
    const isHrUser = session?.user.role === "hr" || currentStaff?.role === "hr";
    const isMgtApprover = await isManagementApprover(c);

    const isNursingSuper = currentStaff
      ? await db
          .select()
          .from(nursingSupers)
          .where(and(eq(nursingSupers.staffId, currentStaff.staffId), eq(nursingSupers.active, true)))
          .limit(1)
          .then((res: any) => !!res[0])
      : false;

    const leaveRequest = await db
      .select({
        id: leaveRequests.id,
        staffId: leaveRequests.staffId,
        approverIds: leaveRequests.approverIds,
        forwardedToStaffId: leaveRequests.forwardedToStaffId,
        supportingDocument: leaveRequests.supportingDocument,
        isClinical: departments.isClinical,
      })
      .from(leaveRequests)
      .innerJoin(staff, eq(leaveRequests.staffId, staff.staffId))
      .leftJoin(
        staffDepartments,
        sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staff.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .where(eq(leaveRequests.id, id))
      .limit(1)
      .then((res: any) => res[0]);

    if (!leaveRequest) {
      return c.json({ error: "Leave request not found" }, 404);
    }

    // Auth: same rules as GET /hr/leaves/:id
    const isEmployee = currentStaff && currentStaff.staffId === leaveRequest.staffId;
    let isApprover = false;
    try {
      const apps = JSON.parse(leaveRequest.approverIds ?? "[]");
      if (Array.isArray(apps) && currentStaff && apps.includes(currentStaff.staffId)) {
        isApprover = true;
      }
    } catch (e) {}
    const isForwardedTarget =
      currentStaff &&
      leaveRequest.forwardedToStaffId !== null &&
      currentStaff.staffId === leaveRequest.forwardedToStaffId;

    const isClinicalDept = leaveRequest.isClinical === true;

    const canView =
      isAdmin ||
      isHrUser ||
      isMgtApprover ||
      (isNursingSuper && isClinicalDept) ||
      isEmployee ||
      isApprover ||
      isForwardedTarget;

    if (!canView) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    if (!leaveRequest.supportingDocument) {
      return c.json({ error: "No supporting document attached" }, 404);
    }

    const docResult = await getLeaveDocumentStream(leaveRequest.supportingDocument);
    if (!docResult) {
      return c.json({ error: "Document file not found on storage" }, 404);
    }

    const isDownload = c.req.query("download") === "1";
    const headers: Record<string, string> = {
      "Content-Type": docResult.mimeType,
      "Content-Disposition": isDownload
        ? `attachment; filename="${docResult.filename}"`
        : `inline; filename="${docResult.filename}"`,
    };

    return new Response(docResult.stream as any, { headers });
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
    const isHrUser = session?.user.role === "hr" || currentStaff?.role === "hr";

    if (!currentStaff && !isAdmin && !isHrUser) return c.json({ error: "Staff record not found" }, 404);

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

    const isNursingSuper = currentStaff
      ? await db
          .select()
          .from(nursingSupers)
          .where(and(eq(nursingSupers.staffId, currentStaff.staffId), eq(nursingSupers.active, true)))
          .limit(1)
          .then((res: any) => !!res[0])
      : false;

    const empDept = await db
      .select({ isClinical: departments.isClinical })
      .from(staffDepartments)
      .innerJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .where(sql`${staffDepartments.staffId} = ${employee.staffId} AND ${staffDepartments.status} = 'Active'`)
      .limit(1)
      .then((res: any) => res[0]);

    const isClinicalDept = empDept?.isClinical === true;

    const canAct = (() => {
      if (leaveRequest.status === "Pending Payroll Approval") {
        return isAdmin || isHrUser;
      }

      if (isAdmin || isHrUser) return true;
      if (!currentStaff) return false;

      if (isNursingSuper && isClinicalDept) return true;

      if (leaveRequest.status === "Pending") {
        try {
          const apps = JSON.parse(leaveRequest.approverIds ?? "[]");
          return Array.isArray(apps) && apps.includes(currentStaff.staffId);
        } catch (e) {
          return false;
        }
      }

      if (leaveRequest.status === "Forwarded") {
        return leaveRequest.forwardedToStaffId !== null && currentStaff.staffId === leaveRequest.forwardedToStaffId;
      }

      return false;
    })();

    if (!canAct) return c.json({ error: "You are not authorized to approve this leave request" }, 403);

    let nextStatus = "Approved";
    if (!isAdmin && !isHrUser) {
      nextStatus = "Pending Payroll Approval";
    }

    await db
      .update(leaveRequests)
      .set({ status: nextStatus, reviewedAt: new Date(), reviewerNote: input.reviewerNote })
      .where(eq(leaveRequests.id, id))
      .execute();

    try {
      const shiftName = leaveRequest.isHalfDay ? 'Half Day Leave' : 'Leave';
      const shiftCode = leaveRequest.isHalfDay ? 'HDLV' : 'LV';
      const isOffDay = !leaveRequest.isHalfDay;

      let leaveShift = await db.select().from(shifts).where(eq(shifts.name, shiftName)).limit(1).then((res: any) => res[0]);
      if (!leaveShift) {
        const [insertedShift] = await db.insert(shifts).values({
          name: shiftName,
          code: shiftCode,
          startTime: '00:00',
          endTime: '23:59',
          active: true,
          isOffDay: isOffDay,
        }).returning().execute();
        leaveShift = insertedShift;
      }

      const activeDept = await db
        .select({ departmentId: staffDepartments.departmentId })
        .from(staffDepartments)
        .where(
          sql`${staffDepartments.staffId} = ${employee.staffId}
            AND ${staffDepartments.staffVersion} = ${employee.version}
            AND ${staffDepartments.status} = 'Active'`
        )
        .limit(1)
        .then((res: any) => res[0]);

      if (leaveShift && activeDept) {
        // Fix for one day gap: use local date string instead of toISOString() which returns UTC
        const getLocalDateStr = (d: string | Date) => {
          const date = new Date(d);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const startDateStr = getLocalDateStr(leaveRequest.startDate);
        const endDateStr = getLocalDateStr(leaveRequest.endDate);

        // Expand the leave date range to individual per-day roster rows
        const leaveDates: string[] = [];
        const curr = new Date(startDateStr + "T00:00:00Z");
        const last = new Date(endDateStr + "T00:00:00Z");
        while (curr <= last) {
          leaveDates.push(curr.toISOString().slice(0, 10));
          curr.setUTCDate(curr.getUTCDate() + 1);
        }

        if (leaveDates.length > 0) {
          const leaveRosterValues = leaveDates.map((date) => ({
            staffId: employee.staffId,
            departmentId: activeDept.departmentId,
            shiftId: leaveShift.id,
            date,
            notes: `Leave Request: ${leaveRequest.requestNo}`,
          }));
          await db.insert(rosters).values(leaveRosterValues).onConflictDoNothing().execute();
        }
      }
    } catch (err) {
      console.error("Failed to add leave to shift roster:", err);
    }

    try {
      let u: any = null;
      if ((employee as any).userId) {
        u = await db.select().from(user).where(eq(user.id, (employee as any).userId)).limit(1).then((res: any) => res[0]);
      }
      if (!u) {
        u = await db.select().from(user).where(eq(user.email, employee.email)).limit(1).then((res: any) => res[0]);
      }
      if (u) {
        const title = nextStatus === "Approved" ? "Leave Approved" : "Leave Approved by Supervisor";
        const message = nextStatus === "Approved"
          ? `Your leave request ${leaveRequest.requestNo} has been fully approved.`
          : `Your leave request ${leaveRequest.requestNo} has been approved by your supervisor and is pending final HR/payroll clearance.`;
        await sendNotification({ userId: u.id, title, message, type: "success", link: "/hr/leaves" });
      }

      if (nextStatus === "Pending Payroll Approval") {
        await notifyAdmins(
          "Leave Pending HR Approval",
          `Supervisor approved leave request ${leaveRequest.requestNo} for ${employee.name}. It is now pending HR/payroll clearance.`
        );
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
    const isHrUser = session?.user.role === "hr" || currentStaff?.role === "hr";

    if (!currentStaff && !isAdmin && !isHrUser) return c.json({ error: "Staff record not found" }, 404);

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

    const isNursingSuper = currentStaff
      ? await db
          .select()
          .from(nursingSupers)
          .where(and(eq(nursingSupers.staffId, currentStaff.staffId), eq(nursingSupers.active, true)))
          .limit(1)
          .then((res: any) => !!res[0])
      : false;

    const empDept = await db
      .select({ isClinical: departments.isClinical })
      .from(staffDepartments)
      .innerJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .where(sql`${staffDepartments.staffId} = ${employee.staffId} AND ${staffDepartments.status} = 'Active'`)
      .limit(1)
      .then((res: any) => res[0]);

    const isClinicalDept = empDept?.isClinical === true;

    const canAct = (() => {
      if (leaveRequest.status === "Pending Payroll Approval") {
        return isAdmin || isHrUser;
      }

      if (isAdmin || isHrUser) return true;
      if (!currentStaff) return false;

      if (isNursingSuper && isClinicalDept) return true;

      if (leaveRequest.status === "Pending") {
        try {
          const apps = JSON.parse(leaveRequest.approverIds ?? "[]");
          return Array.isArray(apps) && apps.includes(currentStaff.staffId);
        } catch (e) {
          return false;
        }
      }

      if (leaveRequest.status === "Forwarded") {
        return leaveRequest.forwardedToStaffId !== null && currentStaff.staffId === leaveRequest.forwardedToStaffId;
      }

      return false;
    })();

    if (!canAct) return c.json({ error: "You are not authorized to reject this leave request" }, 403);

    await db
      .update(leaveRequests)
      .set({ status: "Rejected", reviewedAt: new Date(), reviewerNote: input.reviewerNote })
      .where(eq(leaveRequests.id, id))
      .execute();

    // Remove any shift roster entry if it was previously approved
    await db.delete(rosters).where(like(rosters.notes, `Leave Request: ${leaveRequest.requestNo}`)).execute();

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
  // POST /hr/leaves/:id/cancel
  // -------------------------------------------------------------------------
  .post("/hr/leaves/:id/cancel", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const currentStaff = await getCurrentStaff(c);

    if (!currentStaff) return c.json({ error: "Staff record not found" }, 404);

    const leaveRequest = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id))
      .limit(1)
      .then((res: any) => res[0]);
    if (!leaveRequest) return c.json({ error: "Leave request not found" }, 404);

    const isHrOrAdmin = session?.user.role === "admin" || session?.user.role === "hr";

    if (leaveRequest.staffId !== currentStaff.staffId && !isHrOrAdmin) {
      return c.json({ error: "You are not authorized to cancel this leave request" }, 403);
    }

    if (["Approved", "Rejected", "Cancelled"].includes(leaveRequest.status)) {
      if (!isHrOrAdmin) {
        return c.json({ error: "Cannot cancel a leave that is already processed" }, 400);
      }
    }

    await db
      .update(leaveRequests)
      .set({ status: "Cancelled", reviewedAt: new Date(), reviewerNote: "Cancelled" })
      .where(eq(leaveRequests.id, id))
      .execute();

    // Remove any shift roster entry if it was previously approved
    await db.delete(rosters).where(like(rosters.notes, `Leave Request: ${leaveRequest.requestNo}`)).execute();

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
    const isHrOrAdmin = session?.user.role === "admin" || session?.user.role === "hr";
    const currentStaff = await getCurrentStaff(c);

    if (!currentStaff && !isHrOrAdmin) return c.json({ error: "Staff record not found" }, 404);

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

    if (!input.forwardToStaffId) {
      return c.json({ error: "Missing target supervisor to forward to" }, 400);
    }

    // Verify target staff is an active executive level staff
    const targetStaff = await db
      .select()
      .from(staff)
      .where(sql`${staff.staffId} = ${input.forwardToStaffId} AND ${staff.active} = true AND ${staff.isExecutive} = true`)
      .limit(1)
      .then((res: any) => res[0]);

    if (!targetStaff) {
      return c.json({ error: "Target staff must be an active executive level staff member" }, 400);
    }

    const canAct = (() => {
      if (isHrOrAdmin) return true;
      if (!currentStaff) return false;
      try {
        const apps = JSON.parse(leaveRequest.approverIds ?? "[]");
        return Array.isArray(apps) && apps.includes(currentStaff.staffId);
      } catch (e) {
        return false;
      }
    })();

    if (!canAct) {
      return c.json({ error: "Only an authorized approver can forward this leave request" }, 403);
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
