import { aliasedTable, eq, sql, and } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  banks,
  departmentLeaders,
  departments,
  designations,
  leaveTypes,
  shifts,
  staff,
} from "../db/schema.ts";
import {
  bankInput,
  departmentInput,
  idParam,
  jsonBody,
  leaveTypeInput,
  requireAdmin,
  roleTypeInput,
  shiftInput,
} from "./shared.ts";

export const mastersRoutes = new Hono<AuthEnv>()
  // -------------------------------------------------------------------------
  // Roles (designations)
  // -------------------------------------------------------------------------
  .get("/masters/roles", async (c) =>
    c.json(
      await db
        .select()
        .from(designations)
        .orderBy(designations.name)
        .execute()
    )
  )
  .post("/masters/roles", requireAdmin, async (c) => {
    const input = await jsonBody(c, roleTypeInput);
    const [row] = await db
      .insert(designations)
      .values(input)
      .returning()
      .execute();
    return c.json(row, 201);
  })
  .put("/masters/roles/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, roleTypeInput);
    const [row] = await db
      .update(designations)
      .set(input)
      .where(eq(designations.id, id))
      .returning()
      .execute();
    return c.json(row);
  })

  // -------------------------------------------------------------------------
  // Leave types
  // -------------------------------------------------------------------------
  .get("/masters/leave-types", async (c) =>
    c.json(
      await db.select().from(leaveTypes).orderBy(leaveTypes.name).execute()
    )
  )
  .post("/masters/leave-types", requireAdmin, async (c) => {
    const input = await jsonBody(c, leaveTypeInput);
    const [row] = await db
      .insert(leaveTypes)
      .values({
        ...input,
        paymentRate: String(input.paymentRate),
      })
      .returning()
      .execute();
    return c.json(row, 201);
  })
  .put("/masters/leave-types/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, leaveTypeInput);
    const [row] = await db
      .update(leaveTypes)
      .set({
        ...input,
        paymentRate: String(input.paymentRate),
      })
      .where(eq(leaveTypes.id, id))
      .returning()
      .execute();
    return c.json(row);
  })

  // -------------------------------------------------------------------------
  // Departments
  // -------------------------------------------------------------------------
  .get("/masters/departments", async (c) => {
    const headStaff = aliasedTable(staff, "head_staff");
    const subheadStaff = aliasedTable(staff, "subhead_staff");
    const rows = await db
      .select({
        id: departments.id,
        name: departments.name,
        floor: departments.floor,
        active: departments.active,
        head: departments.head,
        headStaffId: departmentLeaders.headStaffId,
        headName: headStaff.name,
        subheadStaffId: departmentLeaders.subheadStaffId,
        subheadName: subheadStaff.name,
      })
      .from(departments)
      .leftJoin(departmentLeaders, eq(departments.id, departmentLeaders.departmentId))
      .leftJoin(headStaff, and(eq(departmentLeaders.headStaffId, headStaff.staffId), eq(headStaff.active, true)))
      .leftJoin(subheadStaff, and(eq(departmentLeaders.subheadStaffId, subheadStaff.staffId), eq(subheadStaff.active, true)))
      .orderBy(departments.name)
      .execute();
    return c.json(rows);
  })
  .post("/masters/departments", requireAdmin, async (c) => {
    const input = await jsonBody(c, departmentInput);
    const { headStaffId, subheadStaffId, ...deptData } = input;

    let headName = deptData.head || "";
    if (headStaffId) {
      const hStaff = await db
        .select()
        .from(staff)
        .where(sql`${staff.staffId} = ${headStaffId} AND ${staff.active} = true`)
        .limit(1)
        .then((res: any) => res[0]);
      if (hStaff) headName = hStaff.name;
    }

    const [row] = await db
      .insert(departments)
      .values({ ...deptData, head: headName })
      .returning()
      .execute();

    await db
      .insert(departmentLeaders)
      .values({
        departmentId: row.id,
        headStaffId: headStaffId || null,
        subheadStaffId: subheadStaffId || null,
      })
      .execute();

    return c.json(row, 201);
  })
  .put("/masters/departments/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, departmentInput);
    const { headStaffId, subheadStaffId, ...deptData } = input;

    let headName = deptData.head || "";
    if (headStaffId) {
      const hStaff = await db
        .select()
        .from(staff)
        .where(sql`${staff.staffId} = ${headStaffId} AND ${staff.active} = true`)
        .limit(1)
        .then((res: any) => res[0]);
      if (hStaff) headName = hStaff.name;
    }

    const [row] = await db
      .update(departments)
      .set({ ...deptData, head: headName })
      .where(eq(departments.id, id))
      .returning()
      .execute();

    const existingLeader = await db
      .select()
      .from(departmentLeaders)
      .where(eq(departmentLeaders.departmentId, id))
      .limit(1)
      .then((res: any) => res[0]);

    if (existingLeader) {
      await db
        .update(departmentLeaders)
        .set({
          headStaffId: headStaffId || null,
          subheadStaffId: subheadStaffId || null,
        })
        .where(eq(departmentLeaders.departmentId, id))
        .execute();
    } else {
      await db
        .insert(departmentLeaders)
        .values({
          departmentId: id,
          headStaffId: headStaffId || null,
          subheadStaffId: subheadStaffId || null,
        })
        .execute();
    }

    return c.json(row);
  })

  // -------------------------------------------------------------------------
  // Shifts
  // -------------------------------------------------------------------------
  .get("/masters/shifts", async (c) =>
    c.json(
      await db
        .select()
        .from(shifts)
        .orderBy(shifts.sortOrder, shifts.name)
        .execute()
    )
  )
  .post("/masters/shifts", requireAdmin, async (c) => {
    const input = await jsonBody(c, shiftInput);
    const [row] = await db.insert(shifts).values(input).returning().execute();
    return c.json(row, 201);
  })
  .put("/masters/shifts/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, shiftInput);
    const [row] = await db
      .update(shifts)
      .set(input)
      .where(eq(shifts.id, id))
      .returning()
      .execute();
    return c.json(row);
  })

  // -------------------------------------------------------------------------
  // Banks
  // -------------------------------------------------------------------------
  .get("/masters/banks", async (c) =>
    c.json(await db.select().from(banks).orderBy(banks.name).execute())
  )
  .post("/masters/banks", requireAdmin, async (c) => {
    const input = await jsonBody(c, bankInput);
    const [row] = await db.insert(banks).values(input).returning().execute();
    return c.json(row, 201);
  })
  .put("/masters/banks/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, bankInput);
    const [row] = await db
      .update(banks)
      .set(input)
      .where(eq(banks.id, id))
      .returning()
      .execute();
    return c.json(row);
  })

  // -------------------------------------------------------------------------
  // Departments shortcut (used by dropdowns)
  // -------------------------------------------------------------------------
  .get("/departments", async (c) =>
    c.json(
      await db.select().from(departments).orderBy(departments.name).execute()
    )
  );
