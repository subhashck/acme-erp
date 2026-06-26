import { aliasedTable, desc, eq, like, lte, sql } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { z } from "zod";
import { db } from "./db/client.ts";
import { auth, type AuthEnv } from "./auth.ts";
import {
  departments,
  leaveRequests,
  leaveTypes,
  roleTypes,
  shifts,
  rosters,
  staff,
  staffSalaries,
  staffDepartments,
  departmentLeaders,
  payslips,
  attendance,
  biometricMappings
} from "./db/schema.ts";

const idParam = z.object({ id: z.coerce.number().int().positive() });
const staffInput = z.object({
  name: z.string().min(2),
  role: z.string().min(2),
  departmentId: z.number().int().positive(),
  supervisorLevel1Id: z.number().int().positive().optional(),
  supervisorLevel2Id: z.number().int().positive().optional(),
  phone: z.string().min(7),
  email: z.string().email(),
  basicSalary: z.number().min(0).default(0),
  hra: z.number().min(0).default(0),
  conveyance: z.number().min(0).default(0),
  medical: z.number().min(0).default(0),
  special: z.number().min(0).default(0),
  epf: z.number().min(0).default(0),
  esi: z.number().min(0).default(0),
  professionalTax: z.number().min(0).default(0),
  otherDeductions: z.number().min(0).default(0),
  salary: z.number().positive(),
  status: z.string().default("Active"),
  aadhar: z.string().regex(/^[2-9]\d{11}$/, "Aadhar must be a valid 12-digit number (cannot start with 0 or 1)"),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, "Invalid PAN format").transform((val) => val.toUpperCase())
});
const leaveRequestInput = z.object({
  staffId: z.number().int().positive(),
  leaveType: z.string().min(2),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().min(3)
}).refine((value) => new Date(value.endDate) >= new Date(value.startDate), {
  path: ["endDate"],
  message: "End date must be on or after start date"
});
const leaveDecisionInput = z.object({
  reviewerNote: z.string().optional()
});
const patientInput = z.object({
  name: z.string().min(2),
  age: z.number().int().min(0).max(120),
  gender: z.string().min(1),
  phone: z.string().min(7),
  address: z.string().min(3),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional()
});
const appointmentInput = z.object({
  patientId: z.number().int().positive(),
  doctorId: z.number().int().positive(),
  departmentId: z.number().int().positive(),
  scheduledAt: z.string().datetime(),
  reason: z.string().min(3)
});
const inventoryInput = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  unit: z.string().min(1),
  quantity: z.number().int().min(0),
  reorderLevel: z.number().int().min(0),
  supplier: z.string().min(2),
  location: z.string().min(2),
  expiryDate: z.string().optional()
});
const medicineInput = z.object({
  name: z.string().min(2),
  genericName: z.string().min(2),
  form: z.string().min(2),
  strength: z.string().min(1),
  stock: z.number().int().min(0),
  reorderLevel: z.number().int().min(0),
  price: z.number().min(0),
  batchNo: z.string().min(2),
  expiryDate: z.string().datetime()
});
const prescriptionInput = z.object({
  patientId: z.number().int().positive(),
  doctorId: z.number().int().positive(),
  encounterId: z.number().int().positive().optional(),
  lines: z.array(
    z.object({
      medicineId: z.number().int().positive(),
      dosage: z.string().min(1),
      duration: z.string().min(1),
      quantity: z.number().int().positive(),
      instructions: z.string().min(1)
    })
  ).min(1)
});

const code = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const jsonBody = async <T extends z.ZodTypeAny>(c: Context, schema: T) =>
  schema.parse(await c.req.json());

const requireAdmin = async (c: Context<AuthEnv>, next: any) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (session?.user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
};

const getCurrentStaff = async (c: Context<AuthEnv>) => {
  const session = c.get("session");
  if (!session?.user.email) {
    return null;
  }
  const staffRecord = db.select().from(staff).where(sql`${staff.email} = ${session.user.email} AND ${staff.active} = 1`).get();
  return staffRecord;
};

const isSupervisorOf = (supervisor: typeof staff.$inferSelect | null | undefined, employee: typeof staff.$inferSelect | null | undefined): boolean => {
  if (!supervisor || !employee) return false;
  return supervisor.id === employee.supervisorLevel1Id || supervisor.id === employee.supervisorLevel2Id;
};

const roleTypeInput = z.object({
  name: z.string().min(2),
  active: z.boolean().default(true)
});

const leaveTypeInput = z.object({
  name: z.string().min(2),
  maxDays: z.number().int().min(0),
  active: z.boolean().default(true),
  payable: z.boolean().default(true),
  paymentRate: z.number().min(0).max(100).default(100.0)
});

const departmentInput = z.object({
  name: z.string().min(2),
  floor: z.string().min(1),
  head: z.string().optional().default(""),
  headStaffId: z.number().int().positive().nullable().optional(),
  subheadStaffId: z.number().int().positive().nullable().optional(),
  active: z.boolean().default(true)
});

const shiftInput = z.object({
  name: z.string().min(2),
  code: z.string().min(1).max(10),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
  active: z.boolean().default(true),
  isOffDay: z.boolean().default(false),
  sortOrder: z.number().int().default(0)
});

const rosterInput = z.object({
  staffId: z.number().int().positive(),
  departmentId: z.number().int().positive(),
  shiftId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  notes: z.string().optional()
}).refine((value) => value.endDate >= value.startDate, {
  path: ["endDate"],
  message: "End date must be on or after start date"
});

function parseDateTime(dateStr: string, timeStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute);
}

function getRosterIntervals(startDateStr: string, endDateStr: string, startTime: string, endTime: string) {
  const intervals: { start: number; end: number }[] = [];
  const curr = new Date(startDateStr + "T00:00:00Z");
  const last = new Date(endDateStr + "T00:00:00Z");

  while (curr <= last) {
    const year = curr.getUTCFullYear();
    const month = String(curr.getUTCMonth() + 1).padStart(2, '0');
    const day = String(curr.getUTCDate()).padStart(2, '0');
    const dStr = `${year}-${month}-${day}`;

    const start = parseDateTime(dStr, startTime);
    let end: number;
    if (startTime < endTime) {
      end = parseDateTime(dStr, endTime);
    } else {
      const nextDay = new Date(curr);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const nextYear = nextDay.getUTCFullYear();
      const nextMonth = String(nextDay.getUTCMonth() + 1).padStart(2, '0');
      const nextDayNum = String(nextDay.getUTCDate()).padStart(2, '0');
      const nextDayStr = `${nextYear}-${nextMonth}-${nextDayNum}`;
      end = parseDateTime(nextDayStr, endTime);
    }
    intervals.push({ start, end });
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return intervals;
}

function doIntervalsOverlap(
  startAStr: string, endAStr: string, startATime: string, endATime: string,
  startBStr: string, endBStr: string, startBTime: string, endBTime: string
): boolean {
  if (startAStr > endBStr || startBStr > endAStr) {
    return false;
  }

  const intervalsA = getRosterIntervals(startAStr, endAStr, startATime, endATime);
  const intervalsB = getRosterIntervals(startBStr, endBStr, startBTime, endBTime);

  for (const a of intervalsA) {
    for (const b of intervalsB) {
      if (a.start < b.end && b.start < a.end) {
        return true;
      }
    }
  }
  return false;
}

export const api = new Hono<AuthEnv>()
  .get("/dashboard", async (c) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const [staffCount, deptCount, pendingLeaves, attendanceToday, shiftsCount] = await Promise.all([
      db.select({ value: sql<number>`count(*)` }).from(staff).where(eq(staff.active, true)).get(),
      db.select({ value: sql<number>`count(*)` }).from(departments).get(),
      db.select({ value: sql<number>`count(*)` }).from(leaveRequests).where(eq(leaveRequests.status, "Pending")).get(),
      db.select({ value: sql<number>`count(*)` }).from(attendance).where(eq(attendance.date, todayStr)).get(),
      db.select({ value: sql<number>`count(*)` }).from(shifts).get(),
    ]);

    return c.json({
      metrics: {
        staff: staffCount?.value ?? 0,
        departments: deptCount?.value ?? 0,
        pendingLeaves: pendingLeaves?.value ?? 0,
        attendanceToday: attendanceToday?.value ?? 0,
        shiftsCount: shiftsCount?.value ?? 0,
      }
    });
  })
  .get("/masters/roles", (c) => c.json(db.select().from(roleTypes).orderBy(roleTypes.name).all()))
  .post("/masters/roles", requireAdmin, async (c) => {
    const input = await jsonBody(c, roleTypeInput);
    const [row] = db.insert(roleTypes).values(input).returning().all();
    return c.json(row, 201);
  })
  .put("/masters/roles/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, roleTypeInput);
    const [row] = db.update(roleTypes).set(input).where(eq(roleTypes.id, id)).returning().all();
    return c.json(row);
  })
  .get("/masters/leave-types", (c) => c.json(db.select().from(leaveTypes).orderBy(leaveTypes.name).all()))
  .post("/masters/leave-types", requireAdmin, async (c) => {
    const input = await jsonBody(c, leaveTypeInput);
    const [row] = db.insert(leaveTypes).values(input).returning().all();
    return c.json(row, 201);
  })
  .put("/masters/leave-types/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, leaveTypeInput);
    const [row] = db.update(leaveTypes).set(input).where(eq(leaveTypes.id, id)).returning().all();
    return c.json(row);
  })
  .get("/masters/departments", (c) => {
    const headStaff = aliasedTable(staff, "head_staff");
    const subheadStaff = aliasedTable(staff, "subhead_staff");
    const rows = db
      .select({
        id: departments.id,
        name: departments.name,
        floor: departments.floor,
        active: departments.active,
        head: departments.head,
        headStaffId: departmentLeaders.headStaffId,
        headName: headStaff.name,
        subheadStaffId: departmentLeaders.subheadStaffId,
        subheadName: subheadStaff.name
      })
      .from(departments)
      .leftJoin(departmentLeaders, eq(departments.id, departmentLeaders.departmentId))
      .leftJoin(headStaff, eq(departmentLeaders.headStaffId, headStaff.id))
      .leftJoin(subheadStaff, eq(departmentLeaders.subheadStaffId, subheadStaff.id))
      .orderBy(departments.name)
      .all();
    return c.json(rows);
  })
  .post("/masters/departments", requireAdmin, async (c) => {
    const input = await jsonBody(c, departmentInput);
    const { headStaffId, subheadStaffId, ...deptData } = input;
    
    let headName = deptData.head || "";
    if (headStaffId) {
      const hStaff = db.select().from(staff).where(eq(staff.id, headStaffId)).get();
      if (hStaff) headName = hStaff.name;
    }
    
    const [row] = db.insert(departments).values({ ...deptData, head: headName }).returning().all();
    
    db.insert(departmentLeaders).values({
      departmentId: row.id,
      headStaffId: headStaffId || null,
      subheadStaffId: subheadStaffId || null
    }).run();
    
    return c.json(row, 201);
  })
  .put("/masters/departments/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, departmentInput);
    const { headStaffId, subheadStaffId, ...deptData } = input;
    
    let headName = deptData.head || "";
    if (headStaffId) {
      const hStaff = db.select().from(staff).where(eq(staff.id, headStaffId)).get();
      if (hStaff) headName = hStaff.name;
    }
    
    const [row] = db.update(departments).set({ ...deptData, head: headName }).where(eq(departments.id, id)).returning().all();
    
    const existingLeader = db.select().from(departmentLeaders).where(eq(departmentLeaders.departmentId, id)).get();
    if (existingLeader) {
      db.update(departmentLeaders)
        .set({
          headStaffId: headStaffId || null,
          subheadStaffId: subheadStaffId || null
        })
        .where(eq(departmentLeaders.departmentId, id))
        .run();
    } else {
      db.insert(departmentLeaders).values({
        departmentId: id,
        headStaffId: headStaffId || null,
        subheadStaffId: subheadStaffId || null
      }).run();
    }
    
    return c.json(row);
  })
  .get("/masters/shifts", (c) => c.json(db.select().from(shifts).orderBy(shifts.sortOrder, shifts.name).all()))
  .post("/masters/shifts", requireAdmin, async (c) => {
    const input = await jsonBody(c, shiftInput);
    const [row] = db.insert(shifts).values(input).returning().all();
    return c.json(row, 201);
  })
  .put("/masters/shifts/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, shiftInput);
    const [row] = db.update(shifts).set(input).where(eq(shifts.id, id)).returning().all();
    return c.json(row);
  })
  .get("/departments", (c) => c.json(db.select().from(departments).orderBy(departments.name).all()))
  .get("/hr/staff", (c) => {
    const manager = aliasedTable(staff, "manager");
    const director = aliasedTable(staff, "director");

    const rows = db
      .select({
        id: staff.id,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentId: staffDepartments.departmentId,
        departmentName: departments.name,
        supervisorLevel1Id: staff.supervisorLevel1Id,
        supervisorLevel1Name: manager.name,
        supervisorLevel2Id: staff.supervisorLevel2Id,
        supervisorLevel2Name: director.name,
        phone: staff.phone,
        email: staff.email,
        basicSalary: staffSalaries.basicSalary,
        hra: staffSalaries.hra,
        conveyance: staffSalaries.conveyance,
        medical: staffSalaries.medical,
        special: staffSalaries.special,
        epf: staffSalaries.epf,
        esi: staffSalaries.esi,
        professionalTax: staffSalaries.professionalTax,
        otherDeductions: staffSalaries.otherDeductions,
        salary: staff.salary,
        status: staff.status,
        aadhar: staff.aadhar,
        pan: staff.pan,
        version: staff.version,
        active: staff.active,
        createdAt: staff.createdAt
      })
      .from(staff)
      .leftJoin(staffDepartments, sql`${staff.id} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`)
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(manager, eq(staff.supervisorLevel1Id, manager.id))
      .leftJoin(director, eq(staff.supervisorLevel2Id, director.id))
      .leftJoin(staffSalaries, eq(staff.id, staffSalaries.staffId))
      .where(eq(staff.active, true))
      .orderBy(desc(staff.createdAt))
      .all();
    return c.json(rows);
  })
  .post("/hr/staff", async (c) => {
    const input = await jsonBody(c, staffInput);
    const session = c.get("session");

    const {
      departmentId,
      basicSalary,
      hra,
      conveyance,
      medical,
      special,
      epf,
      esi,
      professionalTax,
      otherDeductions,
      ...staffData
    } = input;
    const [row] = db.insert(staff).values({ ...staffData, employeeCode: code("EMP"), version: 1, active: true }).returning().all();

    db.insert(staffSalaries).values({
      staffId: row.id,
      basicSalary,
      hra,
      conveyance,
      medical,
      special,
      epf,
      esi,
      professionalTax,
      otherDeductions
    }).run();

    db.insert(staffDepartments).values({
      staffId: row.id,
      departmentId: departmentId,
      version: 1,
      status: "Active",
      changedById: session?.user.id,
      changedByName: session?.user.name,
    }).run();

    return c.json(row, 201);
  })
  .put("/hr/staff/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, staffInput);
    const session = c.get("session");

    const {
      departmentId,
      basicSalary,
      hra,
      conveyance,
      medical,
      special,
      epf,
      esi,
      professionalTax,
      otherDeductions,
      ...staffData
    } = input;

    // Get the current version of the staff
    const currentStaff = db.select().from(staff).where(eq(staff.id, id)).get();
    if (!currentStaff) {
      return c.json({ error: "Staff member not found" }, 404);
    }

    const newVersion = (currentStaff.version || 1) + 1;

    // Filter out undefined properties from staffData to avoid overwriting database values with nulls/undefineds
    const cleanStaffData = Object.fromEntries(
      Object.entries(staffData).filter(([_, v]) => v !== undefined)
    ) as typeof staffData;

    // Mark the previous version as inactive
    db.update(staff)
      .set({ active: false })
      .where(eq(staff.id, id))
      .run();

    // Insert the new active version of the staff
    const [newStaffRow] = db.insert(staff).values({
      supervisorLevel1Id: currentStaff.supervisorLevel1Id,
      supervisorLevel2Id: currentStaff.supervisorLevel2Id,
      ...cleanStaffData,
      employeeCode: currentStaff.employeeCode,
      version: newVersion,
      active: true,
    }).returning().all();

    // Insert a new salary record for the new version
    db.insert(staffSalaries).values({
      staffId: newStaffRow.id,
      basicSalary,
      hra,
      conveyance,
      medical,
      special,
      epf,
      esi,
      professionalTax,
      otherDeductions
    }).run();

    // Handle department change / update
    const currentActive = db.select()
      .from(staffDepartments)
      .where(sql`${staffDepartments.staffId} = ${id} AND ${staffDepartments.status} = 'Active'`)
      .get();

    if (!currentActive || currentActive.departmentId !== departmentId) {
      if (currentActive) {
        db.update(staffDepartments)
          .set({ status: "Inactive" })
          .where(eq(staffDepartments.id, currentActive.id))
          .run();
      }

      const maxVersionRow = db.select({
        maxVersion: sql<number>`max(${staffDepartments.version})`
      })
        .from(staffDepartments)
        .where(eq(staffDepartments.staffId, id))
        .get();

      const newDeptVersion = (maxVersionRow?.maxVersion || 0) + 1;

      db.insert(staffDepartments).values({
        staffId: newStaffRow.id,
        departmentId: departmentId,
        version: newDeptVersion,
        status: "Active",
        changedById: session?.user.id,
        changedByName: session?.user.name,
      }).run();
    } else {
      // Insert matching department mapping for the new staff version (no department change, version remains same)
      db.insert(staffDepartments).values({
        staffId: newStaffRow.id,
        departmentId: departmentId,
        version: currentActive.version,
        status: "Active",
        changedById: session?.user.id,
        changedByName: session?.user.name,
      }).run();
    }

    return c.json(newStaffRow);
  })
  .get("/hr/staff/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const manager = aliasedTable(staff, "manager");
    const director = aliasedTable(staff, "director");

    const row = db
      .select({
        id: staff.id,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentId: staffDepartments.departmentId,
        departmentName: departments.name,
        supervisorLevel1Id: staff.supervisorLevel1Id,
        supervisorLevel1Name: manager.name,
        supervisorLevel2Id: staff.supervisorLevel2Id,
        supervisorLevel2Name: director.name,
        phone: staff.phone,
        email: staff.email,
        basicSalary: staffSalaries.basicSalary,
        hra: staffSalaries.hra,
        conveyance: staffSalaries.conveyance,
        medical: staffSalaries.medical,
        special: staffSalaries.special,
        epf: staffSalaries.epf,
        esi: staffSalaries.esi,
        professionalTax: staffSalaries.professionalTax,
        otherDeductions: staffSalaries.otherDeductions,
        salary: staff.salary,
        status: staff.status,
        aadhar: staff.aadhar,
        pan: staff.pan,
        version: staff.version,
        active: staff.active,
        createdAt: staff.createdAt
      })
      .from(staff)
      .leftJoin(staffDepartments, sql`${staff.id} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`)
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(manager, eq(staff.supervisorLevel1Id, manager.id))
      .leftJoin(director, eq(staff.supervisorLevel2Id, director.id))
      .leftJoin(staffSalaries, eq(staff.id, staffSalaries.staffId))
      .where(eq(staff.id, id))
      .get();

    if (!row) {
      return c.json({ error: "Staff member not found" }, 404);
    }
    return c.json(row);
  })
  .get("/hr/staff/:id/versions", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const targetStaff = db.select({ employeeCode: staff.employeeCode }).from(staff).where(eq(staff.id, id)).get();
    if (!targetStaff) {
      return c.json({ error: "Staff member not found" }, 404);
    }

    const manager = aliasedTable(staff, "manager");
    const director = aliasedTable(staff, "director");

    const rows = db
      .select({
        id: staff.id,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentId: staffDepartments.departmentId,
        departmentName: departments.name,
        supervisorLevel1Id: staff.supervisorLevel1Id,
        supervisorLevel1Name: manager.name,
        supervisorLevel2Id: staff.supervisorLevel2Id,
        supervisorLevel2Name: director.name,
        phone: staff.phone,
        email: staff.email,
        basicSalary: staffSalaries.basicSalary,
        hra: staffSalaries.hra,
        conveyance: staffSalaries.conveyance,
        medical: staffSalaries.medical,
        special: staffSalaries.special,
        epf: staffSalaries.epf,
        esi: staffSalaries.esi,
        professionalTax: staffSalaries.professionalTax,
        otherDeductions: staffSalaries.otherDeductions,
        salary: staff.salary,
        status: staff.status,
        aadhar: staff.aadhar,
        pan: staff.pan,
        version: staff.version,
        active: staff.active,
        createdAt: staff.createdAt
      })
      .from(staff)
      .leftJoin(staffDepartments, sql`${staff.id} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`)
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(manager, eq(staff.supervisorLevel1Id, manager.id))
      .leftJoin(director, eq(staff.supervisorLevel2Id, director.id))
      .leftJoin(staffSalaries, eq(staff.id, staffSalaries.staffId))
      .where(eq(staff.employeeCode, targetStaff.employeeCode))
      .orderBy(desc(staff.version))
      .all();
    return c.json(rows);
  })
  .get("/hr/staff/:id/leave-balance", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const year = new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000;
    const yearEnd = new Date(`${year}-12-31T23:59:59Z`).getTime() / 1000;

    const allLeaveTypes = db.select().from(leaveTypes).where(eq(leaveTypes.active, true)).all();
    const approvedLeaves = db
      .select()
      .from(leaveRequests)
      .where(sql`${leaveRequests.staffId} = ${id} AND ${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} >= ${yearStart} AND ${leaveRequests.startDate} <= ${yearEnd}`)
      .all();

    const daysByType: Record<string, number> = {};
    for (const lr of approvedLeaves) {
      const start = lr.startDate;
      const end = lr.endDate;
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
      daysByType[lr.leaveType] = (daysByType[lr.leaveType] ?? 0) + days;
    }

    const leaveBalance = allLeaveTypes.map((lt) => ({
      leaveType: lt.name,
      maxDays: lt.maxDays,
      takenDays: daysByType[lt.name] ?? 0,
      remainingDays: Math.max(0, lt.maxDays - (daysByType[lt.name] ?? 0))
    }));

    return c.json(leaveBalance);
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

    const rows = db
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
        supervisorLevel2Id: staff.supervisorLevel2Id
      })
      .from(leaveRequests)
      .innerJoin(staff, eq(leaveRequests.staffId, staff.id))
      .orderBy(desc(leaveRequests.createdAt))
      .all();

    // Filter to only show leaves that the current user can approve (for pending ones)
    let filteredRows = rows.filter(row => {
      if (isAdmin) return true;
      if (row.status === "Pending") {
        return currentStaff && (currentStaff.id === row.supervisorLevel1Id || currentStaff.id === row.supervisorLevel2Id);
      }
      if (row.status === "Forwarded") {
        return currentStaff && (currentStaff.id === row.supervisorLevel2Id);
      }
      return true;
    });

    // Apply status filter
    if (status && status !== "All") {
      filteredRows = filteredRows.filter(row => row.status === status);
    }

    // Apply leaveType filter
    if (leaveType && leaveType !== "All") {
      filteredRows = filteredRows.filter(row => row.leaveType === leaveType);
    }

    // Apply search filter
    if (search) {
      const s = search.toLowerCase();
      filteredRows = filteredRows.filter(row => 
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

    return c.json({
      data: paginatedRows,
      total,
      page,
      limit
    });
  })
  .get("/hr/leaves/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const isAdmin = session?.user.role === "admin";
    const currentStaff = await getCurrentStaff(c);

    const manager = aliasedTable(staff, "manager");
    const director = aliasedTable(staff, "director");

    const row = db
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
        subheadStaffId: departmentLeaders.subheadStaffId
      })
      .from(leaveRequests)
      .innerJoin(staff, eq(leaveRequests.staffId, staff.id))
      .leftJoin(staffDepartments, sql`${staff.id} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`)
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(departmentLeaders, eq(departments.id, departmentLeaders.departmentId))
      .leftJoin(manager, eq(staff.supervisorLevel1Id, manager.id))
      .leftJoin(director, eq(staff.supervisorLevel2Id, director.id))
      .where(eq(leaveRequests.id, id))
      .get() as any;

    if (!row) {
      return c.json({ error: "Leave request not found" }, 404);
    }

    // Check authorization: user must be admin, the employee, or a supervisor, or a department head/subhead
    const isEmployee = currentStaff?.id === row.staffId;
    const isSupervisor = currentStaff && (currentStaff.id === row.supervisorLevel1Id || currentStaff.id === row.supervisorLevel2Id);
    const isDeptLeader = currentStaff && (currentStaff.id === row.headStaffId || currentStaff.id === row.subheadStaffId);

    if (!isAdmin && !isEmployee && !isSupervisor && !isDeptLeader) {
      return c.json({ error: "You are not authorized to view this leave request" }, 403);
    }

    return c.json(row);
  })
  .post("/hr/leaves", async (c) => {
    const input = await jsonBody(c, leaveRequestInput);
    const [row] = db.insert(leaveRequests).values({
      ...input,
      requestNo: code("LV"),
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      status: "Pending"
    }).returning().all();
    return c.json(row, 201);
  })
  .post("/hr/leaves/:id/approve", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = leaveDecisionInput.parse(await c.req.json().catch(() => ({})));

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const isAdmin = session?.user.role === "admin";

    // Get current staff member
    const currentStaff = await getCurrentStaff(c);
    if (!currentStaff && !isAdmin) {
      return c.json({ error: "Staff record not found" }, 404);
    }

    // Get leave request and employee
    const leaveRequest = db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).get();
    if (!leaveRequest) {
      return c.json({ error: "Leave request not found" }, 404);
    }

    const employee = db.select().from(staff).where(eq(staff.id, leaveRequest.staffId)).get();
    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    const isSupervisor = isSupervisorOf(currentStaff, employee);

    let isDeptLeader = false;
    if (currentStaff) {
      const activeDepts = db
        .select({ departmentId: staffDepartments.departmentId })
        .from(staffDepartments)
        .where(sql`${staffDepartments.staffId} = ${employee.id} AND ${staffDepartments.status} = 'Active'`)
        .all();
      const deptIds = activeDepts.map(d => d.departmentId);
      if (deptIds.length > 0) {
        const leaders = db
          .select()
          .from(departmentLeaders)
          .where(sql`${departmentLeaders.departmentId} IN ${deptIds}`)
          .all();
        isDeptLeader = leaders.some(l => l.headStaffId === currentStaff.id || l.subheadStaffId === currentStaff.id);
      }
    }

    if (!isAdmin && !isSupervisor && !isDeptLeader) {
      return c.json({ error: "You are not authorized to approve this leave request" }, 403);
    }

    db.update(leaveRequests)
      .set({ status: "Approved", reviewedAt: new Date(), reviewerNote: input.reviewerNote })
      .where(eq(leaveRequests.id, id))
      .run();
    return c.json({ ok: true });
  })
  .post("/hr/leaves/:id/reject", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = leaveDecisionInput.parse(await c.req.json().catch(() => ({})));

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const isAdmin = session?.user.role === "admin";

    // Get current staff member
    const currentStaff = await getCurrentStaff(c);
    if (!currentStaff && !isAdmin) {
      return c.json({ error: "Staff record not found" }, 404);
    }

    // Get leave request and employee
    const leaveRequest = db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).get();
    if (!leaveRequest) {
      return c.json({ error: "Leave request not found" }, 404);
    }

    const employee = db.select().from(staff).where(eq(staff.id, leaveRequest.staffId)).get();
    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    const isSupervisor = isSupervisorOf(currentStaff, employee);

    let isDeptLeader = false;
    if (currentStaff) {
      const activeDepts = db
        .select({ departmentId: staffDepartments.departmentId })
        .from(staffDepartments)
        .where(sql`${staffDepartments.staffId} = ${employee.id} AND ${staffDepartments.status} = 'Active'`)
        .all();
      const deptIds = activeDepts.map(d => d.departmentId);
      if (deptIds.length > 0) {
        const leaders = db
          .select()
          .from(departmentLeaders)
          .where(sql`${departmentLeaders.departmentId} IN ${deptIds}`)
          .all();
        isDeptLeader = leaders.some(l => l.headStaffId === currentStaff.id || l.subheadStaffId === currentStaff.id);
      }
    }

    if (!isAdmin && !isSupervisor && !isDeptLeader) {
      return c.json({ error: "You are not authorized to reject this leave request" }, 403);
    }

    db.update(leaveRequests)
      .set({ status: "Rejected", reviewedAt: new Date(), reviewerNote: input.reviewerNote })
      .where(eq(leaveRequests.id, id))
      .run();
    return c.json({ ok: true });
  })
  .post("/hr/leaves/:id/forward", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = leaveDecisionInput.parse(await c.req.json().catch(() => ({})));

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const isAdmin = session?.user.role === "admin";

    // Get current staff member
    const currentStaff = await getCurrentStaff(c);
    if (!currentStaff && !isAdmin) {
      return c.json({ error: "Staff record not found" }, 404);
    }

    const leaveRequest = db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).get();
    if (!leaveRequest) {
      return c.json({ error: "Leave request not found" }, 404);
    }

    const employee = db.select().from(staff).where(eq(staff.id, leaveRequest.staffId)).get();
    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    if (!isAdmin && currentStaff?.id !== employee.supervisorLevel1Id) {
      return c.json({ error: "Only Level 1 supervisor can forward this leave request" }, 403);
    }

    if (!employee.supervisorLevel2Id || employee.supervisorLevel2Id === employee.supervisorLevel1Id) {
      return c.json({ error: "No next level supervisor configured for this employee" }, 400);
    }

    db.update(leaveRequests)
      .set({ status: "Forwarded", reviewedAt: new Date(), reviewerNote: input.reviewerNote })
      .where(eq(leaveRequests.id, id))
      .run();
    return c.json({ ok: true });
  })
  .get("/hr/attendance", async (c) => {
    const date = c.req.query("date") || new Date().toISOString().split("T")[0];
    const departmentId = c.req.query("departmentId");
    const staffIdFilter = c.req.query("staffId");
    const statusFilter = c.req.query("status");

    let staffQuery = db.select({
      id: staff.id,
      name: staff.name,
      employeeCode: staff.employeeCode,
      status: staff.status
    }).from(staff).where(sql`${staff.status} = 'Active' AND ${staff.active} = 1`).$dynamic();

    if (staffIdFilter) {
      staffQuery = staffQuery.where(eq(staff.id, parseInt(staffIdFilter)));
    }

    let employees = staffQuery.all();

    if (departmentId) {
      const deptStaff = db
        .select({ staffId: staffDepartments.staffId })
        .from(staffDepartments)
        .where(sql`${staffDepartments.departmentId} = ${parseInt(departmentId)} AND ${staffDepartments.status} = 'Active'`)
        .all();
      const staffIds = new Set(deptStaff.map(d => d.staffId));
      employees = employees.filter(e => staffIds.has(e.id));
    }

    const attendanceRecords = db
      .select()
      .from(attendance)
      .where(eq(attendance.date, date))
      .all();
    const attendanceMap = new Map(attendanceRecords.map(r => [r.staffId, r]));

    const activeRosters = db
      .select({
        id: rosters.id,
        staffId: rosters.staffId,
        shiftName: shifts.name,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        isOffDay: shifts.isOffDay
      })
      .from(rosters)
      .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
      .where(sql`${rosters.startDate} <= ${date} AND ${rosters.endDate} >= ${date}`)
      .all();
    const rosterMap = new Map(activeRosters.map(r => [r.staffId, r]));

    const dateTimestamp = new Date(`${date}T12:00:00Z`);
    const dateSeconds = dateTimestamp.getTime() / 1000;
    const approvedLeaves = db
      .select()
      .from(leaveRequests)
      .where(sql`${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} <= ${dateSeconds} AND ${leaveRequests.endDate} >= ${dateSeconds}`)
      .all();
    const leaveMap = new Map(approvedLeaves.map(l => [l.staffId, l]));

    const result = employees.map(emp => {
      const att = attendanceMap.get(emp.id);
      const rost = rosterMap.get(emp.id);
      const leaveReq = leaveMap.get(emp.id);

      let computedStatus = "Off Duty";
      if (att) {
        computedStatus = att.status;
      } else if (rost) {
        if (leaveReq) {
          computedStatus = "Approved Leave";
        } else if (rost.isOffDay) {
          computedStatus = "Off Duty";
        } else {
          computedStatus = "Absent";
        }
      }

      return {
        staffId: emp.id,
        name: emp.name,
        employeeCode: emp.employeeCode,
        date,
        attendanceId: att?.id || null,
        checkIn: att?.checkIn || null,
        checkOut: att?.checkOut || null,
        status: computedStatus,
        notes: att?.notes || null,
        rosteredShift: rost ? {
          name: rost.shiftName,
          startTime: rost.startTime,
          endTime: rost.endTime
        } : null
      };
    });

    if (statusFilter && statusFilter !== "All") {
      return c.json(result.filter(r => r.status === statusFilter));
    }

    return c.json(result);
  })
  .post("/hr/attendance", async (c) => {
    const input = z.object({
      staffId: z.number().int().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
      checkIn: z.string().nullable().optional(),
      checkOut: z.string().nullable().optional(),
      status: z.string().optional(),
      notes: z.string().optional()
    }).parse(await c.req.json());

    const existing = db
      .select()
      .from(attendance)
      .where(sql`${attendance.staffId} = ${input.staffId} AND ${attendance.date} = ${input.date}`)
      .get();

    if (existing) {
      return c.json({ error: "Attendance record already exists for this date." }, 400);
    }

    let finalStatus = input.status || "Present";
    if (!input.status && input.checkIn) {
      const rost = db
        .select({ startTime: shifts.startTime })
        .from(rosters)
        .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
        .where(sql`${rosters.staffId} = ${input.staffId} AND ${rosters.startDate} <= ${input.date} AND ${rosters.endDate} >= ${input.date}`)
        .get();
      if (rost) {
        const [shHour, shMin] = rost.startTime.split(":").map(Number);
        const [chHour, chMin] = input.checkIn.split(":").map(Number);
        const shiftMinutes = shHour * 60 + shMin;
        const checkMinutes = chHour * 60 + chMin;
        if (checkMinutes > shiftMinutes + 15) {
          finalStatus = "Late";
        }
      }
    }

    const [row] = db.insert(attendance).values({
      staffId: input.staffId,
      date: input.date,
      checkIn: input.checkIn || null,
      checkOut: input.checkOut || null,
      status: finalStatus,
      notes: input.notes || null
    }).returning().all();

    return c.json(row, 201);
  })
  .put("/hr/attendance/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = z.object({
      checkIn: z.string().nullable().optional(),
      checkOut: z.string().nullable().optional(),
      status: z.string().optional(),
      notes: z.string().nullable().optional()
    }).parse(await c.req.json());

    const existing = db.select().from(attendance).where(eq(attendance.id, id)).get();
    if (!existing) {
      return c.json({ error: "Attendance log not found" }, 404);
    }

    const updateValues: any = {};
    if (input.checkIn !== undefined) updateValues.checkIn = input.checkIn;
    if (input.checkOut !== undefined) updateValues.checkOut = input.checkOut;
    if (input.notes !== undefined) updateValues.notes = input.notes;
    
    if (input.status) {
      updateValues.status = input.status;
    } else if (input.checkOut && !input.status) {
      const checkInTime = input.checkIn || existing.checkIn;
      if (checkInTime && input.checkOut) {
        const [chInHour, chInMin] = checkInTime.split(":").map(Number);
        const [chOutHour, chOutMin] = input.checkOut.split(":").map(Number);
        const workedMinutes = (chOutHour * 60 + chOutMin) - (chInHour * 60 + chInMin);
        if (workedMinutes > 0 && workedMinutes < 240) {
          updateValues.status = "Half-day";
        } else {
          updateValues.status = existing.status === "Late" ? "Late" : "Present";
        }
      }
    }

    const [row] = db.update(attendance).set(updateValues).where(eq(attendance.id, id)).returning().all();
    return c.json(row);
  })
  .get("/hr/biometric-mappings", (c) => {
    const rows = db
      .select({
        id: biometricMappings.id,
        staffId: biometricMappings.staffId,
        biometricCode: biometricMappings.biometricCode,
        staffName: staff.name,
        employeeCode: staff.employeeCode,
        createdAt: biometricMappings.createdAt,
      })
      .from(biometricMappings)
      .innerJoin(staff, eq(biometricMappings.staffId, staff.id))
      .orderBy(staff.name)
      .all();
    return c.json(rows);
  })
  .post("/hr/biometric-mappings", async (c) => {
    const input = z.object({
      id: z.number().int().optional(),
      staffId: z.number().int().positive(),
      biometricCode: z.string().min(1)
    }).parse(await c.req.json());

    if (input.id) {
      const dupCode = db.select().from(biometricMappings)
        .where(sql`${biometricMappings.biometricCode} = ${input.biometricCode} AND ${biometricMappings.id} != ${input.id}`)
        .get();
      if (dupCode) {
        return c.json({ error: `Biometric code '${input.biometricCode}' is already mapped to another employee.` }, 400);
      }

      const dupStaff = db.select().from(biometricMappings)
        .where(sql`${biometricMappings.staffId} = ${input.staffId} AND ${biometricMappings.id} != ${input.id}`)
        .get();
      if (dupStaff) {
        return c.json({ error: `Selected employee is already mapped to another biometric code.` }, 400);
      }

      const [row] = db.update(biometricMappings)
        .set({ staffId: input.staffId, biometricCode: input.biometricCode, updatedAt: new Date() })
        .where(eq(biometricMappings.id, input.id))
        .returning().all();
      return c.json(row);
    }

    const existingByCode = db.select().from(biometricMappings).where(eq(biometricMappings.biometricCode, input.biometricCode)).get();
    if (existingByCode && existingByCode.staffId !== input.staffId) {
      return c.json({ error: `Biometric code '${input.biometricCode}' is already mapped to another employee.` }, 400);
    }

    const existingByStaff = db.select().from(biometricMappings).where(eq(biometricMappings.staffId, input.staffId)).get();
    if (existingByStaff) {
      const [row] = db.update(biometricMappings)
        .set({ biometricCode: input.biometricCode, updatedAt: new Date() })
        .where(eq(biometricMappings.id, existingByStaff.id))
        .returning().all();
      return c.json(row);
    }

    const [row] = db.insert(biometricMappings)
      .values({ staffId: input.staffId, biometricCode: input.biometricCode })
      .returning().all();
    return c.json(row, 201);
  })
  .delete("/hr/biometric-mappings/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    db.delete(biometricMappings).where(eq(biometricMappings.id, id)).run();
    return c.json({ ok: true });
  })
  .post("/hr/attendance/bulk", async (c) => {
    const input = z.array(z.object({
      staffId: z.number().int().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      checkIn: z.string().nullable().optional(),
      checkOut: z.string().nullable().optional(),
      status: z.string().optional(),
      notes: z.string().optional()
    })).parse(await c.req.json());

    db.transaction(() => {
      for (const item of input) {
        const existing = db.select().from(attendance)
          .where(sql`${attendance.staffId} = ${item.staffId} AND ${attendance.date} = ${item.date}`)
          .get();

        let finalStatus = item.status || "Present";
        if (!item.status && item.checkIn) {
          const rost = db
            .select({ startTime: shifts.startTime })
            .from(rosters)
            .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
            .where(sql`${rosters.staffId} = ${item.staffId} AND ${rosters.startDate} <= ${item.date} AND ${rosters.endDate} >= ${item.date}`)
            .get();
          if (rost) {
            const [shHour, shMin] = rost.startTime.split(":").map(Number);
            const [chHour, chMin] = item.checkIn.split(":").map(Number);
            const shiftMinutes = shHour * 60 + shMin;
            const checkMinutes = chHour * 60 + chMin;
            if (checkMinutes > shiftMinutes + 15) {
              finalStatus = "Late";
            }
          }
        }

        if (item.checkOut && !item.status) {
          const checkInTime = item.checkIn || (existing ? existing.checkIn : null);
          if (checkInTime && item.checkOut) {
            const [chInHour, chInMin] = checkInTime.split(":").map(Number);
            const [chOutHour, chOutMin] = item.checkOut.split(":").map(Number);
            const workedMinutes = (chOutHour * 60 + chOutMin) - (chInHour * 60 + chInMin);
            if (workedMinutes > 0 && workedMinutes < 240) {
              finalStatus = "Half-day";
            } else {
              finalStatus = finalStatus === "Late" ? "Late" : "Present";
            }
          }
        }

        const updateValues = {
          checkIn: item.checkIn,
          checkOut: item.checkOut,
          status: finalStatus,
          notes: item.notes || "Biometric Upload",
          updatedAt: new Date()
        };

        if (existing) {
          db.update(attendance)
            .set(updateValues)
            .where(eq(attendance.id, existing.id))
            .run();
        } else {
          db.insert(attendance)
            .values({
              staffId: item.staffId,
              date: item.date,
              checkIn: item.checkIn,
              checkOut: item.checkOut,
              status: finalStatus,
              notes: item.notes || "Biometric Upload"
            })
            .run();
        }
      }
    });

    return c.json({ ok: true, count: input.length });
  })
  .post("/hr/attendance/simulate", async (c) => {
    const input = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD")
    }).parse(await c.req.json());

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    let simulatedCount = 0;

    db.delete(attendance)
      .where(sql`${attendance.date} >= ${input.startDate} AND ${attendance.date} <= ${input.endDate}`)
      .run();

    const allStaff = db.select().from(staff).where(sql`${staff.status} = 'Active' AND ${staff.active} = 1`).all();

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];

      const activeRosters = db
        .select({
          staffId: rosters.staffId,
          shiftName: shifts.name,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
          isOffDay: shifts.isOffDay
        })
        .from(rosters)
        .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
        .where(sql`${rosters.startDate} <= ${dateStr} AND ${rosters.endDate} >= ${dateStr}`)
        .all();
      const rosterMap = new Map(activeRosters.map(r => [r.staffId, r]));

      const dateSeconds = d.getTime() / 1000;
      const approvedLeaves = db
        .select({ staffId: leaveRequests.staffId })
        .from(leaveRequests)
        .where(sql`${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} <= ${dateSeconds} AND ${leaveRequests.endDate} >= ${dateSeconds}`)
        .all();
      const leaveSet = new Set(approvedLeaves.map(l => l.staffId));

      for (const emp of allStaff) {
        const rost = rosterMap.get(emp.id);
        const onLeave = leaveSet.has(emp.id);

        if (onLeave) continue;
        if (rost?.isOffDay) continue;

        if (rost) {
          const rand = Math.random();
          let checkIn: string | null = null;
          let checkOut: string | null = null;
          let attStatus = "Present";
          let notes: string | null = null;

          const [shHour, shMin] = rost.startTime.split(":").map(Number);
          const [ehHour, ehMin] = rost.endTime.split(":").map(Number);

          if (rand < 0.85) {
            const addMin = Math.floor(Math.random() * 5);
            const checkInMin = shHour * 60 + shMin + addMin;
            checkIn = `${String(Math.floor(checkInMin / 60)).padStart(2, "0")}:${String(checkInMin % 60).padStart(2, "0")}`;
            
            const addOutMin = Math.floor(Math.random() * 10);
            const checkOutMin = ehHour * 60 + ehMin + addOutMin;
            checkOut = `${String(Math.floor(checkOutMin / 60)).padStart(2, "0")}:${String(checkOutMin % 60).padStart(2, "0")}`;
            attStatus = "Present";
          } else if (rand < 0.93) {
            const addMin = 20 + Math.floor(Math.random() * 25);
            const checkInMin = shHour * 60 + shMin + addMin;
            checkIn = `${String(Math.floor(checkInMin / 60)).padStart(2, "0")}:${String(checkInMin % 60).padStart(2, "0")}`;
            checkOut = rost.endTime;
            attStatus = "Late";
            notes = "Checked in late";
          } else if (rand < 0.96) {
            checkIn = rost.startTime;
            const checkOutMin = shHour * 60 + shMin + 240;
            checkOut = `${String(Math.floor(checkOutMin / 60)).padStart(2, "0")}:${String(checkOutMin % 60).padStart(2, "0")}`;
            attStatus = "Half-day";
            notes = "Worked half-day shift";
          } else {
            attStatus = "Absent";
            notes = "Unexcused absence";
          }

          db.insert(attendance).values({
            staffId: emp.id,
            date: dateStr,
            checkIn,
            checkOut,
            status: attStatus,
            notes
          }).run();
          simulatedCount++;
        }
      }
    }

    return c.json({ ok: true, simulatedCount });
  })
  .get("/hr/roster", async (c) => {
    const departmentId = c.req.query("departmentId");
    let query = db.select({
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
      createdAt: rosters.createdAt
    }).from(rosters)
      .innerJoin(staff, eq(rosters.staffId, staff.id))
      .innerJoin(departments, eq(rosters.departmentId, departments.id))
      .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
      .$dynamic();

    if (departmentId) {
      query = query.where(eq(rosters.departmentId, parseInt(departmentId)));
    }

    const rows = query.orderBy(desc(rosters.startDate)).all();
    return c.json(rows);
  })
  .post("/hr/roster", async (c) => {
    const input = await jsonBody(c, rosterInput);

    const proposedShift = db.select().from(shifts).where(eq(shifts.id, input.shiftId)).get();
    if (!proposedShift) {
      return c.json({ error: "Shift not found" }, 404);
    }

    const existingRosters = db.select({
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
      .all();

    for (const r of existingRosters) {
      if (doIntervalsOverlap(
        input.startDate, input.endDate, proposedShift.startTime, proposedShift.endTime,
        r.startDate, r.endDate, r.startTime, r.endTime
      )) {
        return c.json({ error: `Employee is already assigned to shift '${r.shiftName}' (${r.startTime}-${r.endTime}) on an overlapping date during this period.` }, 400);
      }
    }

    const [row] = db.insert(rosters).values(input).returning().all();
    return c.json(row, 201);
  })
  .put("/hr/roster/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, rosterInput);

    const proposedShift = db.select().from(shifts).where(eq(shifts.id, input.shiftId)).get();
    if (!proposedShift) {
      return c.json({ error: "Shift not found" }, 404);
    }

    const existingRosters = db.select({
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
      .all();

    for (const r of existingRosters) {
      if (doIntervalsOverlap(
        input.startDate, input.endDate, proposedShift.startTime, proposedShift.endTime,
        r.startDate, r.endDate, r.startTime, r.endTime
      )) {
        return c.json({ error: `Employee is already assigned to shift '${r.shiftName}' (${r.startTime}-${r.endTime}) on an overlapping date during this period.` }, 400);
      }
    }

    const [row] = db.update(rosters).set(input).where(eq(rosters.id, id)).returning().all();
    return c.json(row);
  })
  .delete("/hr/roster/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    db.delete(rosters).where(eq(rosters.id, id)).run();
    return c.json({ ok: true });
  })
  .get("/hr/payroll/payslips", (c) => {
    const rows = db
      .select({
        id: payslips.id,
        staffId: payslips.staffId,
        month: payslips.month,
        basicSalary: payslips.basicSalary,
        hra: payslips.hra,
        conveyance: payslips.conveyance,
        medical: payslips.medical,
        special: payslips.special,
        epf: payslips.epf,
        esi: payslips.esi,
        professionalTax: payslips.professionalTax,
        otherDeductions: payslips.otherDeductions,
        leaveDaysTaken: payslips.leaveDaysTaken,
        leaveDeduction: payslips.leaveDeduction,
        netSalary: payslips.netSalary,
        version: payslips.version,
        status: payslips.status,
        createdAt: payslips.createdAt,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentName: departments.name
      })
      .from(payslips)
      .innerJoin(staff, eq(payslips.staffId, staff.id))
      .leftJoin(staffDepartments, sql`${staff.id} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`)
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .orderBy(desc(payslips.month), desc(payslips.createdAt))
      .all();
    return c.json(rows);
  })
  .get("/hr/payroll/payslips/:id", (c) => {
    const { id } = idParam.parse(c.req.param());

    const row = db
      .select({
        id: payslips.id,
        staffId: payslips.staffId,
        month: payslips.month,
        basicSalary: payslips.basicSalary,
        hra: payslips.hra,
        conveyance: payslips.conveyance,
        medical: payslips.medical,
        special: payslips.special,
        epf: payslips.epf,
        esi: payslips.esi,
        professionalTax: payslips.professionalTax,
        otherDeductions: payslips.otherDeductions,
        leaveDaysTaken: payslips.leaveDaysTaken,
        leaveDeduction: payslips.leaveDeduction,
        netSalary: payslips.netSalary,
        version: payslips.version,
        status: payslips.status,
        createdAt: payslips.createdAt,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentName: departments.name
      })
      .from(payslips)
      .innerJoin(staff, eq(payslips.staffId, staff.id))
      .leftJoin(staffDepartments, sql`${staff.id} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`)
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .where(eq(payslips.id, id))
      .get();

    if (!row) return c.json({ error: "Payslip not found" }, 404);

    // Leave balance for the employee: current calendar year
    const year = row.month.slice(0, 4);
    const yearStart = new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000;
    const yearEnd = new Date(`${year}-12-31T23:59:59Z`).getTime() / 1000;

    const allLeaveTypes = db.select().from(leaveTypes).where(eq(leaveTypes.active, true)).all();
    const approvedLeaves = db
      .select()
      .from(leaveRequests)
      .where(sql`${leaveRequests.staffId} = ${row.staffId} AND ${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} >= ${yearStart} AND ${leaveRequests.startDate} <= ${yearEnd}`)
      .all();

    // Count days taken per leave type
    const daysByType: Record<string, number> = {};
    for (const lr of approvedLeaves) {
      const start = lr.startDate;
      const end = lr.endDate;
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
      daysByType[lr.leaveType] = (daysByType[lr.leaveType] ?? 0) + days;
    }

    const leaveBalance = allLeaveTypes.map((lt) => ({
      leaveType: lt.name,
      maxDays: lt.maxDays,
      takenDays: daysByType[lt.name] ?? 0,
      remainingDays: Math.max(0, lt.maxDays - (daysByType[lt.name] ?? 0))
    }));

    return c.json({ ...row, leaveBalance });
  })
  .post("/hr/payroll/payslips/:id/edit", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = z.object({
      basicSalary: z.number().min(0),
      hra: z.number().min(0),
      conveyance: z.number().min(0),
      medical: z.number().min(0),
      special: z.number().min(0),
      epf: z.number().min(0),
      esi: z.number().min(0),
      professionalTax: z.number().min(0),
      otherDeductions: z.number().min(0),
      leaveDaysTaken: z.number().min(0),
      leaveDeduction: z.number().min(0)
    }).parse(await c.req.json());

    const existing = db.select().from(payslips).where(eq(payslips.id, id)).get();
    if (!existing) {
      return c.json({ error: "Payslip not found" }, 404);
    }

    const gross = input.basicSalary + input.hra + input.conveyance + input.medical + input.special;
    const statutoryDeductions = input.epf + input.esi + input.professionalTax + input.otherDeductions;
    const net = Math.max(0, gross - statutoryDeductions - input.leaveDeduction);

    db.update(payslips).set({ status: "Superseded" }).where(eq(payslips.id, id)).run();

    const [newRow] = db.insert(payslips).values({
      staffId: existing.staffId,
      month: existing.month,
      basicSalary: input.basicSalary,
      hra: input.hra,
      conveyance: input.conveyance,
      medical: input.medical,
      special: input.special,
      epf: input.epf,
      esi: input.esi,
      professionalTax: input.professionalTax,
      otherDeductions: input.otherDeductions,
      leaveDaysTaken: input.leaveDaysTaken,
      leaveDeduction: input.leaveDeduction,
      netSalary: net,
      version: existing.version + 1,
      status: "Active"
    }).returning().all();

    return c.json(newRow);
  })
  .post("/hr/payroll/generate", async (c) => {
    const { month, staffId, departmentId } = z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/, "Format: YYYY-MM"),
      staffId: z.number().int().positive().optional().nullable(),
      departmentId: z.number().int().positive().optional().nullable()
    }).parse(await c.req.json());

    // Calculate calendar days in the target month
    const [year, mon] = month.split("-").map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate(); // day 0 of next month = last day of this month

    // Month boundaries as Unix seconds
    const monthStart = new Date(`${month}-01T00:00:00Z`).getTime() / 1000;
    const monthEnd = new Date(year, mon, 0, 23, 59, 59).getTime() / 1000; // last day 23:59:59 UTC

    // Get active staff matching filters
    let activeStaff: (typeof staff.$inferSelect)[] = [];
    if (staffId) {
      activeStaff = db.select().from(staff).where(sql`${staff.status} = 'Active' AND ${staff.id} = ${staffId} AND ${staff.active} = 1`).all();
    } else if (departmentId) {
      const rows = db
        .select({ staff })
        .from(staff)
        .innerJoin(staffDepartments, sql`${staff.id} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`)
        .where(sql`${staff.status} = 'Active' AND ${staffDepartments.departmentId} = ${departmentId} AND ${staff.active} = 1`)
        .all();
      activeStaff = rows.map(r => r.staff);
    } else {
      activeStaff = db.select().from(staff).where(sql`${staff.status} = 'Active' AND ${staff.active} = 1`).all();
    }
    // Get all active leave types for deduction lookup
    const allLeaveTypes = db.select().from(leaveTypes).all();
    const leaveTypeMap: Record<string, { payable: boolean; paymentRate: number }> = {};
    for (const lt of allLeaveTypes) {
      leaveTypeMap[lt.name] = { payable: lt.payable, paymentRate: lt.paymentRate };
    }

    let generatedCount = 0;

    for (const employee of activeStaff) {
      // Get salary structure
      const structure = db.select().from(staffSalaries).where(eq(staffSalaries.staffId, employee.id)).get();

      let basic = 0, hra = 0, conveyance = 0, medical = 0, special = 0;
      let epf = 0, esi = 0, profTax = 0, otherDed = 0;

      if (structure) {
        basic = structure.basicSalary;
        hra = structure.hra;
        conveyance = structure.conveyance;
        medical = structure.medical;
        special = structure.special;
        epf = structure.epf;
        esi = structure.esi;
        profTax = structure.professionalTax;
        otherDed = structure.otherDeductions;
      } else {
        const total = employee.salary || 0;
        basic = Math.round(total * 0.5);
        hra = Math.round(total * 0.3);
        conveyance = Math.round(total * 0.1);
        medical = Math.round(total * 0.05);
        special = Math.round(total * 0.05);
      }

      const gross = basic + hra + conveyance + medical + special;
      const dailyRate = gross / daysInMonth;

      // Count approved leave days overlapping with the target month
      const approvedLeaves = db
        .select()
        .from(leaveRequests)
        .where(sql`${leaveRequests.staffId} = ${employee.id} AND ${leaveRequests.status} = 'Approved' AND ${leaveRequests.endDate} >= ${monthStart} AND ${leaveRequests.startDate} <= ${monthEnd}`)
        .all();

      let leaveDaysTaken = 0;
      let leaveDeduction = 0;

      for (const lr of approvedLeaves) {
        const lrStart = lr.startDate.getTime() / 1000;
        const lrEnd = lr.endDate.getTime() / 1000;
        // Clamp to month boundaries and count days
        const overlapStart = Math.max(lrStart, monthStart);
        const overlapEnd = Math.min(lrEnd, monthEnd);
        const days = Math.max(1, Math.round((overlapEnd - overlapStart) / 86400) + 1);
        leaveDaysTaken += days;

        // Deduction: paymentRate = % of daily rate to deduct
        // paymentRate=100 → full deduction, paymentRate=0 → no deduction
        // payable=false → always full deduction (100%)
        const lt = leaveTypeMap[lr.leaveType];
        const deductionRate = lt ? (!lt.payable ? 100 : lt.paymentRate) : 100;
        leaveDeduction += dailyRate * days * (deductionRate / 100);
      }

      // Calculate unexcused absences and half days based on rosters and attendance
      let unexcusedAbsenceDays = 0;
      let halfDayDays = 0;

      const employeeRosters = db
        .select({
          startDate: rosters.startDate,
          endDate: rosters.endDate
        })
        .from(rosters)
        .where(eq(rosters.staffId, employee.id))
        .all();

      const monthStartStr = `${month}-01`;
      const monthEndStr = `${month}-${String(daysInMonth).padStart(2, "0")}`;
      const employeeAttendance = db
        .select({
          date: attendance.date,
          status: attendance.status
        })
        .from(attendance)
        .where(sql`${attendance.staffId} = ${employee.id} AND ${attendance.date} >= ${monthStartStr} AND ${attendance.date} <= ${monthEndStr}`)
        .all();
      const attendanceStatusMap = new Map(employeeAttendance.map(a => [a.date, a.status]));

      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = `${month}-${String(day).padStart(2, "0")}`;
        const dayTimestamp = new Date(`${dayStr}T12:00:00Z`).getTime() / 1000;

        const isRostered = employeeRosters.some(r => r.startDate <= dayStr && r.endDate >= dayStr);
        if (!isRostered) continue;

        const onLeave = approvedLeaves.some(l => {
          const lStart = l.startDate.getTime() / 1000;
          const lEnd = l.endDate.getTime() / 1000;
          return lStart <= dayTimestamp && lEnd >= dayTimestamp;
        });

        if (onLeave) continue;

        const attStatus = attendanceStatusMap.get(dayStr);
        if (attStatus === "Absent") {
          unexcusedAbsenceDays++;
        } else if (attStatus === "Half-day") {
          halfDayDays++;
        } else if (!attStatus) {
          unexcusedAbsenceDays++;
        }
      }

      const attendanceDeduction = dailyRate * (unexcusedAbsenceDays + 0.5 * halfDayDays);
      leaveDaysTaken += (unexcusedAbsenceDays + 0.5 * halfDayDays);
      leaveDeduction += attendanceDeduction;

      leaveDeduction = Math.round(leaveDeduction * 100) / 100;
      const statutoryDeductions = epf + esi + profTax + otherDed;
      const net = Math.max(0, gross - statutoryDeductions - leaveDeduction);

      // Versioning: supersede existing active payslip for same month
      const existing = db
        .select()
        .from(payslips)
        .where(sql`${payslips.staffId} = ${employee.id} AND ${payslips.month} = ${month} AND ${payslips.status} = 'Active'`)
        .get();

      const payslipValues = {
        staffId: employee.id,
        month,
        basicSalary: basic,
        hra,
        conveyance,
        medical,
        special,
        epf,
        esi,
        professionalTax: profTax,
        otherDeductions: otherDed,
        leaveDaysTaken,
        leaveDeduction,
        netSalary: net,
        status: "Active" as const
      };

      if (existing) {
        db.update(payslips).set({ status: "Superseded" }).where(eq(payslips.id, existing.id)).run();
        db.insert(payslips).values({ ...payslipValues, version: existing.version + 1 }).run();
      } else {
        db.insert(payslips).values({ ...payslipValues, version: 1 }).run();
      }
      generatedCount++;
    }

    return c.json({ ok: true, generatedCount });
  })
export type AppType = typeof api;
