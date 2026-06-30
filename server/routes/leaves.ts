import { aliasedTable, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { auth } from "../auth.ts";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  departmentLeaders,
  departments,
  leaveRequests,
  staff,
  staffDepartments,
  user,
} from "../db/schema.ts";
import { sendNotification } from "../utils/notifier.ts";
import {
  code,
  getCurrentStaff,
  idParam,
  isSupervisorOf,
  jsonBody,
  leaveDecisionInput,
  leaveRequestInput,
} from "./shared.ts";

export const leavesRoutes = new Hono<AuthEnv>()
  .post("/hr/leaves", async (c) => {
    const input = await jsonBody(c, leaveRequestInput);
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

    // Trigger Notification for Supervisors & Admin
    try {
      const employee = await db
        .select()
        .from(staff)
        .where(eq(staff.id, input.staffId))
        .limit(1)
        .then((res: any) => res[0]);
      if (employee) {
        const supervisorIds = [];
        if (employee.supervisorLevel1Id)
          supervisorIds.push(employee.supervisorLevel1Id);
        if (employee.supervisorLevel2Id)
          supervisorIds.push(employee.supervisorLevel2Id);

        for (const supId of supervisorIds) {
          const sup = await db
            .select()
            .from(staff)
            .where(eq(staff.id, supId))
            .limit(1)
            .then((res: any) => res[0]);
          if (sup) {
            const u = await db
              .select()
              .from(user)
              .where(eq(user.email, sup.email))
              .limit(1)
              .then((res: any) => res[0]);
            if (u) {
              await sendNotification({
                userId: u.id,
                title: "New Leave Request",
                message: `${employee.name} requested leave: ${row.requestNo} (${input.leaveType})`,
                type: "info",
                link: `/hr/leaves`,
              });
            }
          }
        }

        // Also notify all admins
        const admins = await db
          .select()
          .from(user)
          .where(eq(user.role, "admin"))
          .execute();
        for (const adm of admins) {
          await sendNotification({
            userId: adm.id,
            title: "New Leave Request",
            message: `${employee.name} requested leave: ${row.requestNo} (${input.leaveType})`,
            type: "info",
            link: `/hr/leaves`,
          });
        }
      }
    } catch (err) {
      console.error("Failed to send leave submission notification:", err);
    }

    return c.json(row, 201);
  })
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
        supervisorLevel1Id: staff.supervisorLevel1Id,
        supervisorLevel2Id: staff.supervisorLevel2Id,
      })
      .from(leaveRequests)
      .innerJoin(staff, eq(leaveRequests.staffId, staff.id))
      .orderBy(desc(leaveRequests.createdAt))
      .execute();

    // Filter to only show leaves that the current user can approve (for pending ones)
    let filteredRows = rows.filter((row) => {
      if (isAdmin) return true;
      if (row.status === "Pending") {
        return (
          currentStaff &&
          (currentStaff.id === row.supervisorLevel1Id ||
            currentStaff.id === row.supervisorLevel2Id)
        );
      }
      if (row.status === "Forwarded") {
        return currentStaff && currentStaff.id === row.supervisorLevel2Id;
      }
      return true;
    });

    // Apply status filter
    if (status && status !== "All") {
      filteredRows = filteredRows.filter((row) => row.status === status);
    }

    // Apply leaveType filter
    if (leaveType && leaveType !== "All") {
      filteredRows = filteredRows.filter((row) => row.leaveType === leaveType);
    }

    // Apply search filter
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

    // Apply sorting
    filteredRows.sort((a, b) => {
      let valA = a[sortBy as keyof typeof a];
      let valB = b[sortBy as keyof typeof b];

      if (
        sortBy === "createdAt" ||
        sortBy === "startDate" ||
        sortBy === "endDate"
      ) {
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
  .get("/hr/leaves/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const isAdmin = session?.user.role === "admin";
    const currentStaff = await getCurrentStaff(c);

    const manager = aliasedTable(staff, "manager");
    const director = aliasedTable(staff, "director");

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
        staffId: staff.id,
        employeeCode: staff.employeeCode,
        staffName: staff.name,
        staffEmail: staff.email,
        staffPhone: staff.phone,
        staffRole: staff.role,
        departmentName: departments.name,
        supervisorLevel1Id: manager.id,
        supervisorLevel1Name: manager.name,
        supervisorLevel2Id: director.id,
        supervisorLevel2Name: director.name,
        headStaffId: departmentLeaders.headStaffId,
        subheadStaffId: departmentLeaders.subheadStaffId,
      })
      .from(leaveRequests)
      .innerJoin(staff, eq(leaveRequests.staffId, staff.id))
      .leftJoin(
        staffDepartments,
        sql`${staff.id} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(departmentLeaders, eq(departments.id, departmentLeaders.departmentId))
      .leftJoin(manager, eq(staff.supervisorLevel1Id, manager.id))
      .leftJoin(director, eq(staff.supervisorLevel2Id, director.id))
      .where(eq(leaveRequests.id, id))
      .limit(1)
      .then((res: any) => res[0]) as any;

    if (!row) {
      return c.json({ error: "Leave request not found" }, 404);
    }

    // Check authorization: user must be admin, the employee, or a supervisor, or a department head/subhead
    const isEmployee = currentStaff?.id === row.staffId;
    const isSupervisor =
      currentStaff &&
      (currentStaff.id === row.supervisorLevel1Id ||
        currentStaff.id === row.supervisorLevel2Id);
    const isDeptLeader =
      currentStaff &&
      (currentStaff.id === row.headStaffId ||
        currentStaff.id === row.subheadStaffId);

    if (!isAdmin && !isEmployee && !isSupervisor && !isDeptLeader) {
      return c.json(
        { error: "You are not authorized to view this leave request" },
        403
      );
    }

    return c.json(row);
  })
  .post("/hr/leaves/:id/approve", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = leaveDecisionInput.parse(
      await c.req.json().catch(() => ({}))
    );

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const isAdmin = session?.user.role === "admin";

    const currentStaff = await getCurrentStaff(c);
    if (!currentStaff && !isAdmin) {
      return c.json({ error: "Staff record not found" }, 404);
    }

    const leaveRequest = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id))
      .limit(1)
      .then((res: any) => res[0]);
    if (!leaveRequest) {
      return c.json({ error: "Leave request not found" }, 404);
    }

    const employee = await db
      .select()
      .from(staff)
      .where(eq(staff.id, leaveRequest.staffId))
      .limit(1)
      .then((res: any) => res[0]);
    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    const isSupervisorFlag = isSupervisorOf(currentStaff, employee);

    let isDeptLeader = false;
    if (currentStaff) {
      const activeDepts = await db
        .select({ departmentId: staffDepartments.departmentId })
        .from(staffDepartments)
        .where(
          sql`${staffDepartments.staffId} = ${employee.id} AND ${staffDepartments.status} = 'Active'`
        )
        .execute();
      const deptIds = activeDepts.map((d) => d.departmentId);
      if (deptIds.length > 0) {
        const leaders = await db
          .select()
          .from(departmentLeaders)
          .where(sql`${departmentLeaders.departmentId} IN ${deptIds}`)
          .execute();
        isDeptLeader = leaders.some(
          (l) =>
            l.headStaffId === currentStaff.id ||
            l.subheadStaffId === currentStaff.id
        );
      }
    }

    if (!isAdmin && !isSupervisorFlag && !isDeptLeader) {
      return c.json(
        { error: "You are not authorized to approve this leave request" },
        403
      );
    }

    await db
      .update(leaveRequests)
      .set({
        status: "Approved",
        reviewedAt: new Date(),
        reviewerNote: input.reviewerNote,
      })
      .where(eq(leaveRequests.id, id))
      .execute();

    // Trigger Notification for the Employee
    try {
      const u = await db
        .select()
        .from(user)
        .where(eq(user.email, employee.email))
        .limit(1)
        .then((res: any) => res[0]);
      if (u) {
        await sendNotification({
          userId: u.id,
          title: "Leave Approved",
          message: `Your leave request ${leaveRequest.requestNo} has been approved.`,
          type: "success",
          link: "/hr/leaves",
        });
      }
    } catch (err) {
      console.error("Failed to send leave approval notification:", err);
    }

    return c.json({ ok: true });
  })
  .post("/hr/leaves/:id/reject", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = leaveDecisionInput.parse(
      await c.req.json().catch(() => ({}))
    );

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const isAdmin = session?.user.role === "admin";

    const currentStaff = await getCurrentStaff(c);
    if (!currentStaff && !isAdmin) {
      return c.json({ error: "Staff record not found" }, 404);
    }

    const leaveRequest = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id))
      .limit(1)
      .then((res: any) => res[0]);
    if (!leaveRequest) {
      return c.json({ error: "Leave request not found" }, 404);
    }

    const employee = await db
      .select()
      .from(staff)
      .where(eq(staff.id, leaveRequest.staffId))
      .limit(1)
      .then((res: any) => res[0]);
    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    const isSupervisorFlag = isSupervisorOf(currentStaff, employee);

    let isDeptLeader = false;
    if (currentStaff) {
      const activeDepts = await db
        .select({ departmentId: staffDepartments.departmentId })
        .from(staffDepartments)
        .where(
          sql`${staffDepartments.staffId} = ${employee.id} AND ${staffDepartments.status} = 'Active'`
        )
        .execute();
      const deptIds = activeDepts.map((d) => d.departmentId);
      if (deptIds.length > 0) {
        const leaders = await db
          .select()
          .from(departmentLeaders)
          .where(sql`${departmentLeaders.departmentId} IN ${deptIds}`)
          .execute();
        isDeptLeader = leaders.some(
          (l) =>
            l.headStaffId === currentStaff.id ||
            l.subheadStaffId === currentStaff.id
        );
      }
    }

    if (!isAdmin && !isSupervisorFlag && !isDeptLeader) {
      return c.json(
        { error: "You are not authorized to reject this leave request" },
        403
      );
    }

    await db
      .update(leaveRequests)
      .set({
        status: "Rejected",
        reviewedAt: new Date(),
        reviewerNote: input.reviewerNote,
      })
      .where(eq(leaveRequests.id, id))
      .execute();

    // Trigger Notification for the Employee
    try {
      const u = await db
        .select()
        .from(user)
        .where(eq(user.email, employee.email))
        .limit(1)
        .then((res: any) => res[0]);
      if (u) {
        await sendNotification({
          userId: u.id,
          title: "Leave Rejected",
          message: `Your leave request ${leaveRequest.requestNo} has been rejected.`,
          type: "error",
          link: "/hr/leaves",
        });
      }
    } catch (err) {
      console.error("Failed to send leave rejection notification:", err);
    }

    return c.json({ ok: true });
  })
  .post("/hr/leaves/:id/forward", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = leaveDecisionInput.parse(
      await c.req.json().catch(() => ({}))
    );

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const isAdmin = session?.user.role === "admin";

    const currentStaff = await getCurrentStaff(c);
    if (!currentStaff && !isAdmin) {
      return c.json({ error: "Staff record not found" }, 404);
    }

    const leaveRequest = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id))
      .limit(1)
      .then((res: any) => res[0]);
    if (!leaveRequest) {
      return c.json({ error: "Leave request not found" }, 404);
    }

    const employee = await db
      .select()
      .from(staff)
      .where(eq(staff.id, leaveRequest.staffId))
      .limit(1)
      .then((res: any) => res[0]);
    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    if (!isAdmin && currentStaff?.id !== employee.supervisorLevel1Id) {
      return c.json(
        { error: "Only Level 1 supervisor can forward this leave request" },
        403
      );
    }

    if (
      !employee.supervisorLevel2Id ||
      employee.supervisorLevel2Id === employee.supervisorLevel1Id
    ) {
      return c.json(
        { error: "No next level supervisor configured for this employee" },
        400
      );
    }

    await db
      .update(leaveRequests)
      .set({
        status: "Forwarded",
        reviewedAt: new Date(),
        reviewerNote: input.reviewerNote,
      })
      .where(eq(leaveRequests.id, id))
      .execute();
    return c.json({ ok: true });
  });
