import { aliasedTable, desc, eq, like, lte, sql } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { z } from "zod";
import { db } from "./db/client.ts";
import { auth, type AuthEnv } from "./auth.ts";
import {
  departments,
  immunizationRecords,
  immunizationSchedules,
  leaveRequests,
  leaveTypes,
  patients,
  designations,
  shifts,
  rosters,
  staff,
  staffHrProfiles,
  staffSalaries,
  staffDepartments,
  departmentLeaders,
  payslips,
  attendance,
  biometricMappings,
  banks,
  notifications,
  user,
  messages
} from "./db/schema.ts";
import { streamSSE } from "hono/streaming";
import { notificationEmitter, sendNotification } from "./utils/notifier.ts";
import { chatEmitter, dispatchMessage } from "./utils/chat-notifier.ts";

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
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  salary: z.number().positive().default(1),
  status: z.string().default("Active"),
  aadhar: z.string().regex(/^[2-9]\d{11}$/, "Aadhar must be a valid 12-digit number (cannot start with 0 or 1)"),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, "Invalid PAN format").transform((val) => val.toUpperCase()),
  hrProfile: z.object({
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    maritalStatus: z.string().optional(),
    bloodGroup: z.string().optional(),
    fatherName: z.string().optional(),
    motherName: z.string().optional(),
    spouseName: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    currentAddress: z.string().optional(),
    permanentAddress: z.string().optional(),
    educationHistory: z.array(z.object({
      qualification: z.string().optional(),
      institution: z.string().optional(),
      year: z.string().optional(),
      grade: z.string().optional()
    })).default([]),
    professionalHistory: z.array(z.object({
      employer: z.string().optional(),
      designation: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      responsibilities: z.string().optional()
    })).default([]),
    uan: z.string().optional(),
    epfNumber: z.string().optional(),
    esiNumber: z.string().optional(),
    dateOfJoining: z.string().optional(),
    lastWorkingDate: z.string().optional()
  }).optional()
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
const immunizationRecordInput = z.object({
  patientId: z.number().int().positive(),
  scheduleId: z.number().int().positive().optional().nullable(),
  vaccineCode: z.string().min(1),
  vaccineName: z.string().min(2),
  doseLabel: z.string().min(1),
  administeredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  administeredByStaffId: z.number().int().positive().optional().nullable(),
  batchNo: z.string().optional(),
  manufacturer: z.string().optional(),
  site: z.string().optional(),
  route: z.string().optional(),
  adverseEvent: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().default("Administered")
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
  const staffRecord = await db.select().from(staff).where(sql`${staff.email} = ${session.user.email} AND ${staff.active} = true`).limit(1).then((res: any) => res[0]);
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

const bankInput = z.object({
  name: z.string().min(2),
  active: z.boolean().default(true)
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

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToDate(date: Date, days: number) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function inferDateOfBirth(row: typeof patients.$inferSelect) {
  const created = row.createdAt instanceof Date ? row.createdAt : new Date();
  const dob = new Date(Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate()));
  dob.setUTCFullYear(dob.getUTCFullYear() - row.age);
  return dob;
}

export const api = new Hono<AuthEnv>()
  .get("/dashboard", async (c) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const [staffCount, deptCount, pendingLeaves, attendanceToday, shiftsCount] = await Promise.all([
      db.select({ value: sql<number>`count(*)` }).from(staff).where(eq(staff.active, true)).limit(1).then((res: any) => res[0]),
      db.select({ value: sql<number>`count(*)` }).from(departments).limit(1).then((res: any) => res[0]),
      db.select({ value: sql<number>`count(*)` }).from(leaveRequests).where(eq(leaveRequests.status, "Pending")).limit(1).then((res: any) => res[0]),
      db.select({ value: sql<number>`count(*)` }).from(attendance).where(eq(attendance.date, todayStr)).limit(1).then((res: any) => res[0]),
      db.select({ value: sql<number>`count(*)` }).from(shifts).limit(1).then((res: any) => res[0]),
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
  .get("/notifications/stream", async (c) => {
    const session = c.get("session");
    const userId = session.user.id;

    return streamSSE(c, async (stream) => {
      const eventName = `user:${userId}`;

      const listener = async (n: any) => {
        try {
          await stream.writeSSE({ event: "notification", data: JSON.stringify(n) });
        } catch (e) {
          notificationEmitter.off(eventName, listener);
        }
      };

      notificationEmitter.on(eventName, listener);

      // Send initial unread notifications
      try {
        const unreads = await db
          .select()
          .from(notifications)
          .where(sql`${notifications.userId} = ${userId} AND ${notifications.read} = false`)
          .orderBy(desc(notifications.createdAt))
          .execute();

        for (const n of unreads) {
          await stream.writeSSE({ event: "notification", data: JSON.stringify(n) });
        }
      } catch (err) {
        console.error("Error streaming initial notifications:", err);
      }

      const ping = setInterval(async () => {
        try {
          await stream.writeSSE({ event: "ping", data: "heartbeat" });
        } catch {
          clearInterval(ping);
          notificationEmitter.off(eventName, listener);
        }
      }, 15000);

      stream.onAbort(() => {
        clearInterval(ping);
        notificationEmitter.off(eventName, listener);
      });

      // Keep stream open by waiting for abort
      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          resolve();
        });
      });
    });
  })
  .get("/notifications", async (c) => {
    const session = c.get("session");
    const userId = session.user.id;
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .execute();
    return c.json(rows);
  })
  .post("/notifications/:id/clear", async (c) => {
    const session = c.get("session");
    const userId = session.user.id;
    const id = Number(c.req.param("id"));

    await db.update(notifications)
      .set({ read: true })
      .where(sql`${notifications.id} = ${id} AND ${notifications.userId} = ${userId}`)
      .execute();

    return c.json({ ok: true });
  })
  .post("/notifications/clear-all", async (c) => {
    const session = c.get("session");
    const userId = session.user.id;

    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId))
      .execute();

    return c.json({ ok: true });
  })
  .get("/immunization/schedule", async (c) => {
    const rows = await db
      .select()
      .from(immunizationSchedules)
      .where(eq(immunizationSchedules.active, true))
      .orderBy(immunizationSchedules.sortOrder, immunizationSchedules.id)
      .execute();
    return c.json(rows);
  })
  .get("/immunization/patients", async (c) => {
    const search = c.req.query("search")?.trim();
    let query = db
      .select({
        id: patients.id,
        mrn: patients.mrn,
        name: patients.name,
        age: patients.age,
        gender: patients.gender,
        phone: patients.phone
      })
      .from(patients)
      .$dynamic();

    if (search) {
      query = query.where(sql`${patients.name} LIKE ${`%${search}%`} OR ${patients.mrn} LIKE ${`%${search}%`} OR ${patients.phone} LIKE ${`%${search}%`}`);
    }

    return c.json(await query.orderBy(desc(patients.createdAt)).limit(50).execute());
  })
  .get("/immunization/patients/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const patient = await db.select().from(patients).where(eq(patients.id, id)).limit(1).then((res: any) => res[0]);
    if (!patient) return c.json({ error: "Patient not found" }, 404);

    const schedule = await db.select().from(immunizationSchedules).where(eq(immunizationSchedules.active, true)).orderBy(immunizationSchedules.sortOrder).execute();
    const records = await db
      .select({
        id: immunizationRecords.id,
        patientId: immunizationRecords.patientId,
        scheduleId: immunizationRecords.scheduleId,
        vaccineCode: immunizationRecords.vaccineCode,
        vaccineName: immunizationRecords.vaccineName,
        doseLabel: immunizationRecords.doseLabel,
        administeredAt: immunizationRecords.administeredAt,
        administeredByStaffId: immunizationRecords.administeredByStaffId,
        batchNo: immunizationRecords.batchNo,
        manufacturer: immunizationRecords.manufacturer,
        site: immunizationRecords.site,
        route: immunizationRecords.route,
        adverseEvent: immunizationRecords.adverseEvent,
        notes: immunizationRecords.notes,
        status: immunizationRecords.status,
        staffName: staff.name
      })
      .from(immunizationRecords)
      .leftJoin(staff, eq(immunizationRecords.administeredByStaffId, staff.id))
      .where(eq(immunizationRecords.patientId, id))
      .orderBy(desc(immunizationRecords.administeredAt), desc(immunizationRecords.createdAt))
      .execute();

    const completed = new Set(records.map((record) => record.scheduleId).filter(Boolean));
    const dob = inferDateOfBirth(patient);
    const today = todayIsoDate();
    const due = schedule
      .filter((item) => item.beneficiaryType === "Child" && item.dueAgeDays !== null && !completed.has(item.id))
      .map((item) => {
        const dueDate = addDaysToDate(dob, item.dueAgeDays ?? 0);
        const overdue = dueDate < today;
        return { ...item, dueDate, status: overdue ? "Overdue" : "Due" };
      })
      .filter((item) => item.dueDate <= today || item.status === "Due")
      .slice(0, 12);

    return c.json({ patient, records, due });
  })
  .post("/immunization/records", async (c) => {
    const input = await jsonBody(c, immunizationRecordInput);
    const schedule = input.scheduleId
      ? await db.select().from(immunizationSchedules).where(eq(immunizationSchedules.id, input.scheduleId)).limit(1).then((res: any) => res[0])
      : null;

    const [row] = await db
      .insert(immunizationRecords)
      .values({
        ...input,
        scheduleId: input.scheduleId ?? null,
        administeredByStaffId: input.administeredByStaffId ?? null,
        batchNo: input.batchNo ?? null,
        manufacturer: input.manufacturer ?? null,
        site: input.site || schedule?.site || null,
        route: input.route || schedule?.route || null,
        adverseEvent: input.adverseEvent ?? null,
        notes: input.notes ?? null
      })
      .returning()
      .execute();
    return c.json(row, 201);
  })
  .get("/masters/roles", async (c) => c.json(await db.select().from(designations).orderBy(designations.name).execute()))
  .post("/masters/roles", requireAdmin, async (c) => {
    const input = await jsonBody(c, roleTypeInput);
    const [row] = await db.insert(designations).values(input).returning().execute();
    return c.json(row, 201);
  })
  .put("/masters/roles/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, roleTypeInput);
    const [row] = await db.update(designations).set(input).where(eq(designations.id, id)).returning().execute();
    return c.json(row);
  })
  .get("/masters/leave-types", async (c) => c.json(await db.select().from(leaveTypes).orderBy(leaveTypes.name).execute()))
  .post("/masters/leave-types", requireAdmin, async (c) => {
    const input = await jsonBody(c, leaveTypeInput);
    const [row] = await db.insert(leaveTypes).values(input).returning().execute();
    return c.json(row, 201);
  })
  .post("/hr/leaves", async (c) => {
    const input = await jsonBody(c, leaveRequestInput);
    const [row] = await db.insert(leaveRequests).values({
      ...input,
      requestNo: code("LV"),
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      status: "Pending"
    }).returning().execute();

    // Trigger Notification for Supervisors & Admin
    try {
      const employee = await db.select().from(staff).where(eq(staff.id, input.staffId)).limit(1).then((res: any) => res[0]);
      if (employee) {
        const supervisorIds = [];
        if (employee.supervisorLevel1Id) supervisorIds.push(employee.supervisorLevel1Id);
        if (employee.supervisorLevel2Id) supervisorIds.push(employee.supervisorLevel2Id);

        for (const supId of supervisorIds) {
          const sup = await db.select().from(staff).where(eq(staff.id, supId)).limit(1).then((res: any) => res[0]);
          if (sup) {
            const u = await db.select().from(user).where(eq(user.email, sup.email)).limit(1).then((res: any) => res[0]);
            if (u) {
              await sendNotification({
                userId: u.id,
                title: "New Leave Request",
                message: `${employee.name} requested leave: ${row.requestNo} (${input.leaveType})`,
                type: "info",
                link: `/hr/leaves`
              });
            }
          }
        }

        // Also notify all admins
        const admins = await db.select().from(user).where(eq(user.role, "admin")).execute();
        for (const adm of admins) {
          await sendNotification({
            userId: adm.id,
            title: "New Leave Request",
            message: `${employee.name} requested leave: ${row.requestNo} (${input.leaveType})`,
            type: "info",
            link: `/hr/leaves`
          });
        }
      }
    } catch (err) {
      console.error("Failed to send leave submission notification:", err);
    }

    return c.json(row, 201);
  })
  .put("/masters/leave-types/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, leaveTypeInput);
    const [row] = await db.update(leaveTypes).set(input).where(eq(leaveTypes.id, id)).returning().execute();
    return c.json(row);
  })
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
        subheadName: subheadStaff.name
      })
      .from(departments)
      .leftJoin(departmentLeaders, eq(departments.id, departmentLeaders.departmentId))
      .leftJoin(headStaff, eq(departmentLeaders.headStaffId, headStaff.id))
      .leftJoin(subheadStaff, eq(departmentLeaders.subheadStaffId, subheadStaff.id))
      .orderBy(departments.name)
      .execute();
    return c.json(rows);
  })
  .post("/masters/departments", requireAdmin, async (c) => {
    const input = await jsonBody(c, departmentInput);
    const { headStaffId, subheadStaffId, ...deptData } = input;

    let headName = deptData.head || "";
    if (headStaffId) {
      const hStaff = await db.select().from(staff).where(eq(staff.id, headStaffId)).limit(1).then((res: any) => res[0]);
      if (hStaff) headName = hStaff.name;
    }

    const [row] = await db.insert(departments).values({ ...deptData, head: headName }).returning().execute();

    await db.insert(departmentLeaders).values({
      departmentId: row.id,
      headStaffId: headStaffId || null,
      subheadStaffId: subheadStaffId || null
    }).execute();

    return c.json(row, 201);
  })
  .put("/masters/departments/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, departmentInput);
    const { headStaffId, subheadStaffId, ...deptData } = input;

    let headName = deptData.head || "";
    if (headStaffId) {
      const hStaff = await db.select().from(staff).where(eq(staff.id, headStaffId)).limit(1).then((res: any) => res[0]);
      if (hStaff) headName = hStaff.name;
    }

    const [row] = await db.update(departments).set({ ...deptData, head: headName }).where(eq(departments.id, id)).returning().execute();

    const existingLeader = await db.select().from(departmentLeaders).where(eq(departmentLeaders.departmentId, id)).limit(1).then((res: any) => res[0]);
    if (existingLeader) {
      await db.update(departmentLeaders)
        .set({
          headStaffId: headStaffId || null,
          subheadStaffId: subheadStaffId || null
        })
        .where(eq(departmentLeaders.departmentId, id))
        .execute();
    } else {
      await db.insert(departmentLeaders).values({
        departmentId: id,
        headStaffId: headStaffId || null,
        subheadStaffId: subheadStaffId || null
      }).execute();
    }

    return c.json(row);
  })
  .get("/masters/shifts", async (c) => c.json(await db.select().from(shifts).orderBy(shifts.sortOrder, shifts.name).execute()))
  .post("/masters/shifts", requireAdmin, async (c) => {
    const input = await jsonBody(c, shiftInput);
    const [row] = await db.insert(shifts).values(input).returning().execute();
    return c.json(row, 201);
  })
  .put("/masters/shifts/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, shiftInput);
    const [row] = await db.update(shifts).set(input).where(eq(shifts.id, id)).returning().execute();
    return c.json(row);
  })
  .get("/masters/banks", async (c) => c.json(await db.select().from(banks).orderBy(banks.name).execute()))
  .post("/masters/banks", requireAdmin, async (c) => {
    const input = await jsonBody(c, bankInput);
    const [row] = await db.insert(banks).values(input).returning().execute();
    return c.json(row, 201);
  })
  .put("/masters/banks/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, bankInput);
    const [row] = await db.update(banks).set(input).where(eq(banks.id, id)).returning().execute();
    return c.json(row);
  })
  .get("/departments", async (c) => c.json(await db.select().from(departments).orderBy(departments.name).execute()))
  .get("/hr/staff", async (c) => {
    const manager = aliasedTable(staff, "manager");
    const director = aliasedTable(staff, "director");

    const rows = await db
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
        bankName: staffSalaries.bankName,
        accountNumber: staffSalaries.accountNumber,
        ifscCode: staffSalaries.ifscCode,
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
      .execute();
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
      bankName,
      accountNumber,
      ifscCode,
      hrProfile,
      ...staffData
    } = input;
    const [row] = await db.insert(staff).values({ ...staffData, employeeCode: code("EMP"), version: 1, active: true }).returning().execute();

    await db.insert(staffSalaries).values({
      staffId: row.id,
      basicSalary,
      hra,
      conveyance,
      medical,
      special,
      epf,
      esi,
      professionalTax,
      otherDeductions,
      bankName,
      accountNumber,
      ifscCode
    }).execute();

    await db.insert(staffDepartments).values({
      staffId: row.id,
      departmentId: departmentId,
      version: 1,
      status: "Active",
      changedById: session?.user.id,
      changedByName: session?.user.name,
    }).execute();

    if (hrProfile) {
      await db.insert(staffHrProfiles).values({
        staffId: row.id,
        ...hrProfile,
        educationHistory: hrProfile.educationHistory ? JSON.stringify(hrProfile.educationHistory) : "[]",
        professionalHistory: hrProfile.professionalHistory ? JSON.stringify(hrProfile.professionalHistory) : "[]"
      }).execute();
    }

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
      bankName,
      accountNumber,
      ifscCode,
      hrProfile,
      ...staffData
    } = input;

    // Get the current version of the staff
    const currentStaff = await db.select().from(staff).where(eq(staff.id, id)).limit(1).then((res: any) => res[0]);
    if (!currentStaff) {
      return c.json({ error: "Staff member not found" }, 404);
    }

    const newVersion = (currentStaff.version || 1) + 1;

    // Filter out undefined properties from staffData to avoid overwriting database values with nulls/undefineds
    const cleanStaffData = Object.fromEntries(
      Object.entries(staffData).filter(([_, v]) => v !== undefined)
    ) as typeof staffData;

    // Mark the previous version as inactive
    await db.update(staff)
      .set({ active: false })
      .where(eq(staff.id, id))
      .execute();

    // Insert the new active version of the staff
    const [newStaffRow] = await db.insert(staff).values({
      supervisorLevel1Id: currentStaff.supervisorLevel1Id,
      supervisorLevel2Id: currentStaff.supervisorLevel2Id,
      ...cleanStaffData,
      employeeCode: currentStaff.employeeCode,
      version: newVersion,
      active: true,
    }).returning().execute();

    // Insert a new salary record for the new version
    await db.insert(staffSalaries).values({
      staffId: newStaffRow.id,
      basicSalary,
      hra,
      conveyance,
      medical,
      special,
      epf,
      esi,
      professionalTax,
      otherDeductions,
      bankName,
      accountNumber,
      ifscCode
    }).execute();

    // Handle department change / update
    const currentActive = await db.select()
      .from(staffDepartments)
      .where(sql`${staffDepartments.staffId} = ${id} AND ${staffDepartments.status} = 'Active'`)
      .limit(1).then((res: any) => res[0]);

    if (!currentActive || currentActive.departmentId !== departmentId) {
      if (currentActive) {
        await db.update(staffDepartments)
          .set({ status: "Inactive" })
          .where(eq(staffDepartments.id, currentActive.id))
          .execute();
      }

      const maxVersionRow = await db.select({
        maxVersion: sql<number>`max(${staffDepartments.version})`
      })
        .from(staffDepartments)
        .where(eq(staffDepartments.staffId, id))
        .limit(1).then((res: any) => res[0]);

      const newDeptVersion = (maxVersionRow?.maxVersion || 0) + 1;

      await db.insert(staffDepartments).values({
        staffId: newStaffRow.id,
        departmentId: departmentId,
        version: newDeptVersion,
        status: "Active",
        changedById: session?.user.id,
        changedByName: session?.user.name,
      }).execute();
    } else {
      // Insert matching department mapping for the new staff version (no department change, version remains same)
      await db.insert(staffDepartments).values({
        staffId: newStaffRow.id,
        departmentId: departmentId,
        version: currentActive.version,
        status: "Active",
        changedById: session?.user.id,
        changedByName: session?.user.name,
      }).execute();
    }

    const oldProfile = await db.select().from(staffHrProfiles).where(eq(staffHrProfiles.staffId, id)).limit(1).then((res: any) => res[0]);

    await db.insert(staffHrProfiles).values({
      staffId: newStaffRow.id,
      dateOfBirth: hrProfile?.dateOfBirth ?? oldProfile?.dateOfBirth,
      gender: hrProfile?.gender ?? oldProfile?.gender,
      maritalStatus: hrProfile?.maritalStatus ?? oldProfile?.maritalStatus,
      bloodGroup: hrProfile?.bloodGroup ?? oldProfile?.bloodGroup,
      fatherName: hrProfile?.fatherName ?? oldProfile?.fatherName,
      motherName: hrProfile?.motherName ?? oldProfile?.motherName,
      spouseName: hrProfile?.spouseName ?? oldProfile?.spouseName,
      emergencyContactName: hrProfile?.emergencyContactName ?? oldProfile?.emergencyContactName,
      emergencyContactPhone: hrProfile?.emergencyContactPhone ?? oldProfile?.emergencyContactPhone,
      currentAddress: hrProfile?.currentAddress ?? oldProfile?.currentAddress,
      permanentAddress: hrProfile?.permanentAddress ?? oldProfile?.permanentAddress,
      uan: oldProfile?.uan,
      epfNumber: hrProfile?.epfNumber ?? oldProfile?.epfNumber,
      esiNumber: hrProfile?.esiNumber ?? oldProfile?.esiNumber,
      educationHistory: hrProfile?.educationHistory ? JSON.stringify(hrProfile.educationHistory) : (oldProfile?.educationHistory ?? "[]"),
      professionalHistory: hrProfile?.professionalHistory ? JSON.stringify(hrProfile.professionalHistory) : (oldProfile?.professionalHistory ?? "[]"),
    }).execute();

    return c.json(newStaffRow);
  })
  .get("/hr/staff/:id/profile", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const profile = await db.select().from(staffHrProfiles).where(eq(staffHrProfiles.staffId, id)).limit(1).then((res: any) => res[0]);

    if (profile) {
      return c.json({
        ...profile,
        educationHistory: JSON.parse(profile.educationHistory || "[]"),
        professionalHistory: JSON.parse(profile.professionalHistory || "[]")
      });
    }

    return c.json({
      fatherName: "",
      motherName: "",
      epfNumber: "",
      esiNumber: "",
      educationHistory: [],
      professionalHistory: []
    });
  })
  .get("/hr/staff/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const manager = aliasedTable(staff, "manager");
    const director = aliasedTable(staff, "director");

    const row = await db
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
        bankName: staffSalaries.bankName,
        accountNumber: staffSalaries.accountNumber,
        ifscCode: staffSalaries.ifscCode,
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
      .limit(1).then((res: any) => res[0]);

    if (!row) {
      return c.json({ error: "Staff member not found" }, 404);
    }
    return c.json(row);
  })
  .get("/hr/staff/:id/versions", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const targetStaff = await db.select({ employeeCode: staff.employeeCode }).from(staff).where(eq(staff.id, id)).limit(1).then((res: any) => res[0]);
    if (!targetStaff) {
      return c.json({ error: "Staff member not found" }, 404);
    }

    const manager = aliasedTable(staff, "manager");
    const director = aliasedTable(staff, "director");

    const rows = await db
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
        bankName: staffSalaries.bankName,
        accountNumber: staffSalaries.accountNumber,
        ifscCode: staffSalaries.ifscCode,
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
      .execute();
    return c.json(rows);
  })
  .get("/hr/staff/:id/leave-balance", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const year = new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000;
    const yearEnd = new Date(`${year}-12-31T23:59:59Z`).getTime() / 1000;

    const allLeaveTypes = await db.select().from(leaveTypes).where(eq(leaveTypes.active, true)).execute();
    const approvedLeaves = await db
      .select()
      .from(leaveRequests)
      .where(sql`${leaveRequests.staffId} = ${id} AND ${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} >= ${yearStart} AND ${leaveRequests.startDate} <= ${yearEnd}`)
      .execute();

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
        supervisorLevel2Id: staff.supervisorLevel2Id
      })
      .from(leaveRequests)
      .innerJoin(staff, eq(leaveRequests.staffId, staff.id))
      .orderBy(desc(leaveRequests.createdAt))
      .execute();

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
      .limit(1).then((res: any) => res[0]) as any;

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
    const [row] = await db.insert(leaveRequests).values({
      ...input,
      requestNo: code("LV"),
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      status: "Pending"
    }).returning().execute();
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
    const leaveRequest = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1).then((res: any) => res[0]);
    if (!leaveRequest) {
      return c.json({ error: "Leave request not found" }, 404);
    }

    const employee = await db.select().from(staff).where(eq(staff.id, leaveRequest.staffId)).limit(1).then((res: any) => res[0]);
    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    const isSupervisor = isSupervisorOf(currentStaff, employee);

    let isDeptLeader = false;
    if (currentStaff) {
      const activeDepts = await db
        .select({ departmentId: staffDepartments.departmentId })
        .from(staffDepartments)
        .where(sql`${staffDepartments.staffId} = ${employee.id} AND ${staffDepartments.status} = 'Active'`)
        .execute();
      const deptIds = activeDepts.map(d => d.departmentId);
      if (deptIds.length > 0) {
        const leaders = await db
          .select()
          .from(departmentLeaders)
          .where(sql`${departmentLeaders.departmentId} IN ${deptIds}`)
          .execute();
        isDeptLeader = leaders.some(l => l.headStaffId === currentStaff.id || l.subheadStaffId === currentStaff.id);
      }
    }

    if (!isAdmin && !isSupervisor && !isDeptLeader) {
      return c.json({ error: "You are not authorized to approve this leave request" }, 403);
    }

    await db.update(leaveRequests)
      .set({ status: "Approved", reviewedAt: new Date(), reviewerNote: input.reviewerNote })
      .where(eq(leaveRequests.id, id))
      .execute();

    // Trigger Notification for the Employee
    try {
      const u = await db.select().from(user).where(eq(user.email, employee.email)).limit(1).then((res: any) => res[0]);
      if (u) {
        await sendNotification({
          userId: u.id,
          title: "Leave Approved",
          message: `Your leave request ${leaveRequest.requestNo} has been approved.`,
          type: "success",
          link: "/hr/leaves"
        });
      }
    } catch (err) {
      console.error("Failed to send leave approval notification:", err);
    }

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
    const leaveRequest = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1).then((res: any) => res[0]);
    if (!leaveRequest) {
      return c.json({ error: "Leave request not found" }, 404);
    }

    const employee = await db.select().from(staff).where(eq(staff.id, leaveRequest.staffId)).limit(1).then((res: any) => res[0]);
    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    const isSupervisor = isSupervisorOf(currentStaff, employee);

    let isDeptLeader = false;
    if (currentStaff) {
      const activeDepts = await db
        .select({ departmentId: staffDepartments.departmentId })
        .from(staffDepartments)
        .where(sql`${staffDepartments.staffId} = ${employee.id} AND ${staffDepartments.status} = 'Active'`)
        .execute();
      const deptIds = activeDepts.map(d => d.departmentId);
      if (deptIds.length > 0) {
        const leaders = await db
          .select()
          .from(departmentLeaders)
          .where(sql`${departmentLeaders.departmentId} IN ${deptIds}`)
          .execute();
        isDeptLeader = leaders.some(l => l.headStaffId === currentStaff.id || l.subheadStaffId === currentStaff.id);
      }
    }

    if (!isAdmin && !isSupervisor && !isDeptLeader) {
      return c.json({ error: "You are not authorized to reject this leave request" }, 403);
    }

    await db.update(leaveRequests)
      .set({ status: "Rejected", reviewedAt: new Date(), reviewerNote: input.reviewerNote })
      .where(eq(leaveRequests.id, id))
      .execute();

    // Trigger Notification for the Employee
    try {
      const u = await db.select().from(user).where(eq(user.email, employee.email)).limit(1).then((res: any) => res[0]);
      if (u) {
        await sendNotification({
          userId: u.id,
          title: "Leave Rejected",
          message: `Your leave request ${leaveRequest.requestNo} has been rejected.`,
          type: "error",
          link: "/hr/leaves"
        });
      }
    } catch (err) {
      console.error("Failed to send leave rejection notification:", err);
    }

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

    const leaveRequest = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1).then((res: any) => res[0]);
    if (!leaveRequest) {
      return c.json({ error: "Leave request not found" }, 404);
    }

    const employee = await db.select().from(staff).where(eq(staff.id, leaveRequest.staffId)).limit(1).then((res: any) => res[0]);
    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    if (!isAdmin && currentStaff?.id !== employee.supervisorLevel1Id) {
      return c.json({ error: "Only Level 1 supervisor can forward this leave request" }, 403);
    }

    if (!employee.supervisorLevel2Id || employee.supervisorLevel2Id === employee.supervisorLevel1Id) {
      return c.json({ error: "No next level supervisor configured for this employee" }, 400);
    }

    await db.update(leaveRequests)
      .set({ status: "Forwarded", reviewedAt: new Date(), reviewerNote: input.reviewerNote })
      .where(eq(leaveRequests.id, id))
      .execute();
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
    }).from(staff).where(sql`${staff.status} = 'Active' AND ${staff.active} = true`).$dynamic();

    if (staffIdFilter) {
      staffQuery = staffQuery.where(eq(staff.id, parseInt(staffIdFilter)));
    }

    let employees = await staffQuery.execute();

    if (departmentId) {
      const deptStaff = await db
        .select({ staffId: staffDepartments.staffId })
        .from(staffDepartments)
        .where(sql`${staffDepartments.departmentId} = ${parseInt(departmentId)} AND ${staffDepartments.status} = 'Active'`)
        .execute();
      const staffIds = new Set(deptStaff.map(d => d.staffId));
      employees = employees.filter(e => staffIds.has(e.id));
    }

    const attendanceRecords = await db
      .select()
      .from(attendance)
      .where(eq(attendance.date, date))
      .execute();
    const attendanceMap = new Map(attendanceRecords.map(r => [r.staffId, r]));

    const activeRosters = await db
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
      .execute();
    const rosterMap = new Map(activeRosters.map(r => [r.staffId, r]));

    const dateTimestamp = new Date(`${date}T12:00:00Z`);
    const dateSeconds = dateTimestamp.getTime() / 1000;
    const approvedLeaves = await db
      .select()
      .from(leaveRequests)
      .where(sql`${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} <= ${dateSeconds} AND ${leaveRequests.endDate} >= ${dateSeconds}`)
      .execute();
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

    const existing = await db
      .select()
      .from(attendance)
      .where(sql`${attendance.staffId} = ${input.staffId} AND ${attendance.date} = ${input.date}`)
      .limit(1).then((res: any) => res[0]);

    if (existing) {
      return c.json({ error: "Attendance record already exists for this date." }, 400);
    }

    let finalStatus = input.status || "Present";
    if (!input.status && input.checkIn) {
      const rost = await db
        .select({ startTime: shifts.startTime })
        .from(rosters)
        .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
        .where(sql`${rosters.staffId} = ${input.staffId} AND ${rosters.startDate} <= ${input.date} AND ${rosters.endDate} >= ${input.date}`)
        .limit(1).then((res: any) => res[0]);
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

    const [row] = await db.insert(attendance).values({
      staffId: input.staffId,
      date: input.date,
      checkIn: input.checkIn || null,
      checkOut: input.checkOut || null,
      status: finalStatus,
      notes: input.notes || null
    }).returning().execute();

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

    const existing = await db.select().from(attendance).where(eq(attendance.id, id)).limit(1).then((res: any) => res[0]);
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

    const [row] = await db.update(attendance).set(updateValues).where(eq(attendance.id, id)).returning().execute();
    return c.json(row);
  })
  .get("/hr/biometric-mappings", async (c) => {
    const rows = await db
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
      .execute();
    return c.json(rows);
  })
  .post("/hr/biometric-mappings", async (c) => {
    const input = z.object({
      id: z.number().int().optional(),
      staffId: z.number().int().positive(),
      biometricCode: z.string().min(1)
    }).parse(await c.req.json());

    if (input.id) {
      const dupCode = await db.select().from(biometricMappings)
        .where(sql`${biometricMappings.biometricCode} = ${input.biometricCode} AND ${biometricMappings.id} != ${input.id}`)
        .limit(1).then((res: any) => res[0]);
      if (dupCode) {
        return c.json({ error: `Biometric code '${input.biometricCode}' is already mapped to another employee.` }, 400);
      }

      const dupStaff = await db.select().from(biometricMappings)
        .where(sql`${biometricMappings.staffId} = ${input.staffId} AND ${biometricMappings.id} != ${input.id}`)
        .limit(1).then((res: any) => res[0]);
      if (dupStaff) {
        return c.json({ error: `Selected employee is already mapped to another biometric code.` }, 400);
      }

      const [row] = await db.update(biometricMappings)
        .set({ staffId: input.staffId, biometricCode: input.biometricCode, updatedAt: new Date() })
        .where(eq(biometricMappings.id, input.id))
        .returning().execute();
      return c.json(row);
    }

    const existingByCode = await db.select().from(biometricMappings).where(eq(biometricMappings.biometricCode, input.biometricCode)).limit(1).then((res: any) => res[0]);
    if (existingByCode && existingByCode.staffId !== input.staffId) {
      return c.json({ error: `Biometric code '${input.biometricCode}' is already mapped to another employee.` }, 400);
    }

    const existingByStaff = await db.select().from(biometricMappings).where(eq(biometricMappings.staffId, input.staffId)).limit(1).then((res: any) => res[0]);
    if (existingByStaff) {
      const [row] = await db.update(biometricMappings)
        .set({ biometricCode: input.biometricCode, updatedAt: new Date() })
        .where(eq(biometricMappings.id, existingByStaff.id))
        .returning().execute();
      return c.json(row);
    }

    const [row] = await db.insert(biometricMappings)
      .values({ staffId: input.staffId, biometricCode: input.biometricCode })
      .returning().execute();
    return c.json(row, 201);
  })
  .delete("/hr/biometric-mappings/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    await db.delete(biometricMappings).where(eq(biometricMappings.id, id)).execute();
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

    await db.transaction(async () => {
      for (const item of input) {
        const existing = await db.select().from(attendance)
          .where(sql`${attendance.staffId} = ${item.staffId} AND ${attendance.date} = ${item.date}`)
          .limit(1).then((res: any) => res[0]);

        let finalStatus = item.status || "Present";
        if (!item.status && item.checkIn) {
          const rost = await db
            .select({ startTime: shifts.startTime })
            .from(rosters)
            .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
            .where(sql`${rosters.staffId} = ${item.staffId} AND ${rosters.startDate} <= ${item.date} AND ${rosters.endDate} >= ${item.date}`)
            .limit(1).then((res: any) => res[0]);
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
          await db.update(attendance)
            .set(updateValues)
            .where(eq(attendance.id, existing.id))
            .execute();
        } else {
          await db.insert(attendance)
            .values({
              staffId: item.staffId,
              date: item.date,
              checkIn: item.checkIn,
              checkOut: item.checkOut,
              status: finalStatus,
              notes: item.notes || "Biometric Upload"
            })
            .execute();
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

    await db.delete(attendance)
      .where(sql`${attendance.date} >= ${input.startDate} AND ${attendance.date} <= ${input.endDate}`)
      .execute();

    const allStaff = await db.select().from(staff).where(sql`${staff.status} = 'Active' AND ${staff.active} = true`).execute();

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];

      const activeRosters = await db
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
        .execute();
      const rosterMap = new Map(activeRosters.map(r => [r.staffId, r]));

      const dateSeconds = d.getTime() / 1000;
      const approvedLeaves = await db
        .select({ staffId: leaveRequests.staffId })
        .from(leaveRequests)
        .where(sql`${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} <= ${dateSeconds} AND ${leaveRequests.endDate} >= ${dateSeconds}`)
        .execute();
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

          await db.insert(attendance).values({
            staffId: emp.id,
            date: dateStr,
            checkIn,
            checkOut,
            status: attStatus,
            notes
          }).execute();
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

    const rows = await query.orderBy(desc(rosters.startDate)).execute();
    return c.json(rows);
  })
  .post("/hr/roster", async (c) => {
    const input = await jsonBody(c, rosterInput);

    const proposedShift = await db.select().from(shifts).where(eq(shifts.id, input.shiftId)).limit(1).then((res: any) => res[0]);
    if (!proposedShift) {
      return c.json({ error: "Shift not found" }, 404);
    }

    const existingRosters = await db.select({
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
      if (doIntervalsOverlap(
        input.startDate, input.endDate, proposedShift.startTime, proposedShift.endTime,
        r.startDate, r.endDate, r.startTime, r.endTime
      )) {
        return c.json({ error: `Employee is already assigned to shift '${r.shiftName}' (${r.startTime}-${r.endTime}) on an overlapping date during this period.` }, 400);
      }
    }

    const [row] = await db.insert(rosters).values(input).returning().execute();

    // Trigger notification for the employee
    try {
      const employee = await db.select().from(staff).where(eq(staff.id, input.staffId)).limit(1).then((res: any) => res[0]);
      if (employee) {
        const u = await db.select().from(user).where(eq(user.email, employee.email)).limit(1).then((res: any) => res[0]);
        if (u) {
          await sendNotification({
            userId: u.id,
            title: "New Shift Schedule",
            message: `You have been assigned a new shift starting from ${input.startDate} to ${input.endDate}.`,
            type: "info",
            link: "/hr/roster"
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

    const proposedShift = await db.select().from(shifts).where(eq(shifts.id, input.shiftId)).limit(1).then((res: any) => res[0]);
    if (!proposedShift) {
      return c.json({ error: "Shift not found" }, 404);
    }

    const existingRosters = await db.select({
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
      if (doIntervalsOverlap(
        input.startDate, input.endDate, proposedShift.startTime, proposedShift.endTime,
        r.startDate, r.endDate, r.startTime, r.endTime
      )) {
        return c.json({ error: `Employee is already assigned to shift '${r.shiftName}' (${r.startTime}-${r.endTime}) on an overlapping date during this period.` }, 400);
      }
    }

    const [row] = await db.update(rosters).set(input).where(eq(rosters.id, id)).returning().execute();
    return c.json(row);
  })
  .delete("/hr/roster/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    await db.delete(rosters).where(eq(rosters.id, id)).execute();
    return c.json({ ok: true });
  })
  .get("/hr/payroll/payslips", async (c) => {
    const rows = await db
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
      .execute();
    return c.json(rows);
  })
  .get("/hr/payroll/payslips/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());

    const row = await db
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
      .limit(1).then((res: any) => res[0]);

    if (!row) return c.json({ error: "Payslip not found" }, 404);

    // Leave balance for the employee: current calendar year
    const year = row.month.slice(0, 4);
    const yearStart = new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000;
    const yearEnd = new Date(`${year}-12-31T23:59:59Z`).getTime() / 1000;

    const allLeaveTypes = await db.select().from(leaveTypes).where(eq(leaveTypes.active, true)).execute();
    const approvedLeaves = await db
      .select()
      .from(leaveRequests)
      .where(sql`${leaveRequests.staffId} = ${row.staffId} AND ${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} >= ${yearStart} AND ${leaveRequests.startDate} <= ${yearEnd}`)
      .execute();

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

    const existing = await db.select().from(payslips).where(eq(payslips.id, id)).limit(1).then((res: any) => res[0]);
    if (!existing) {
      return c.json({ error: "Payslip not found" }, 404);
    }

    const gross = input.basicSalary + input.hra + input.conveyance + input.medical + input.special;
    const statutoryDeductions = input.epf + input.esi + input.professionalTax + input.otherDeductions;
    const net = Math.max(0, gross - statutoryDeductions - input.leaveDeduction);

    await db.update(payslips).set({ status: "Superseded" }).where(eq(payslips.id, id)).execute();

    const [newRow] = await db.insert(payslips).values({
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
    }).returning().execute();

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
      activeStaff = await db.select().from(staff).where(sql`${staff.status} = 'Active' AND ${staff.id} = ${staffId} AND ${staff.active} = true`).execute();
    } else if (departmentId) {
      const rows = await db
        .select({ staff })
        .from(staff)
        .innerJoin(staffDepartments, sql`${staff.id} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`)
        .where(sql`${staff.status} = 'Active' AND ${staffDepartments.departmentId} = ${departmentId} AND ${staff.active} = true`)
        .execute();
      activeStaff = rows.map(r => r.staff);
    } else {
      activeStaff = await db.select().from(staff).where(sql`${staff.status} = 'Active' AND ${staff.active} = true`).execute();
    }
    // Get all active leave types for deduction lookup
    const allLeaveTypes = await db.select().from(leaveTypes).execute();
    const leaveTypeMap: Record<string, { payable: boolean; paymentRate: number }> = {};
    for (const lt of allLeaveTypes) {
      leaveTypeMap[lt.name] = { payable: lt.payable, paymentRate: lt.paymentRate };
    }

    let generatedCount = 0;

    for (const employee of activeStaff) {
      // Get salary structure
      const structure = await db.select().from(staffSalaries).where(eq(staffSalaries.staffId, employee.id)).limit(1).then((res: any) => res[0]);

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
      const approvedLeaves = await db
        .select()
        .from(leaveRequests)
        .where(sql`${leaveRequests.staffId} = ${employee.id} AND ${leaveRequests.status} = 'Approved' AND ${leaveRequests.endDate} >= ${monthStart} AND ${leaveRequests.startDate} <= ${monthEnd}`)
        .execute();

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

      const employeeRosters = await db
        .select({
          startDate: rosters.startDate,
          endDate: rosters.endDate
        })
        .from(rosters)
        .where(eq(rosters.staffId, employee.id))
        .execute();

      const monthStartStr = `${month}-01`;
      const monthEndStr = `${month}-${String(daysInMonth).padStart(2, "0")}`;
      const employeeAttendance = await db
        .select({
          date: attendance.date,
          status: attendance.status
        })
        .from(attendance)
        .where(sql`${attendance.staffId} = ${employee.id} AND ${attendance.date} >= ${monthStartStr} AND ${attendance.date} <= ${monthEndStr}`)
        .execute();
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
      const existing = await db
        .select()
        .from(payslips)
        .where(sql`${payslips.staffId} = ${employee.id} AND ${payslips.month} = ${month} AND ${payslips.status} = 'Active'`)
        .limit(1).then((res: any) => res[0]);

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
        await db.update(payslips).set({ status: "Superseded" }).where(eq(payslips.id, existing.id)).execute();
        await db.insert(payslips).values({ ...payslipValues, version: existing.version + 1 }).execute();
      } else {
        await db.insert(payslips).values({ ...payslipValues, version: 1 }).execute();
      }
      generatedCount++;
    }

    return c.json({ ok: true, generatedCount });
  })
  .get("/colleagues", async (c) => {
    const session = c.get("session");
    const currentUserId = session.user.id;
    const rows = await db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image
    })
      .from(user)
      .where(sql`${user.id} != ${currentUserId}`)
      .execute();
    return c.json(rows);
  })
  .get("/messages/stream", async (c) => {
    const session = c.get("session");
    const userId = session.user.id;
    const email = session.user.email;

    let deptId: number | null = null;
    try {
      const staffMember = await db.select().from(staff).where(eq(staff.email, email)).limit(1).then((res: any) => res[0]);
      if (staffMember) {
        const deptMap = await db.select().from(staffDepartments).where(eq(staffDepartments.staffId, staffMember.id)).limit(1).then((res: any) => res[0]);
        if (deptMap) {
          deptId = deptMap.departmentId;
        }
      }
    } catch (err) {
      console.error("Error retrieving user department:", err);
    }

    return streamSSE(c, async (stream) => {
      const orgListener = async (msg: any) => {
        try { await stream.writeSSE({ event: "message", data: JSON.stringify(msg) }); } catch { cleanup(); }
      };
      const deptListener = async (msg: any) => {
        try { await stream.writeSSE({ event: "message", data: JSON.stringify(msg) }); } catch { cleanup(); }
      };
      const directListener = async (msg: any) => {
        try { await stream.writeSSE({ event: "message", data: JSON.stringify(msg) }); } catch { cleanup(); }
      };

      const cleanup = () => {
        chatEmitter.off("organization", orgListener);
        if (deptId) {
          chatEmitter.off(`department:${deptId}`, deptListener);
        }
        chatEmitter.off(`user:${userId}`, directListener);
      };

      chatEmitter.on("organization", orgListener);
      if (deptId) {
        chatEmitter.on(`department:${deptId}`, deptListener);
      }
      chatEmitter.on(`user:${userId}`, directListener);

      const ping = setInterval(async () => {
        try {
          await stream.writeSSE({ event: "ping", data: "heartbeat" });
        } catch {
          clearInterval(ping);
          cleanup();
        }
      }, 15000);

      stream.onAbort(() => {
        clearInterval(ping);
        cleanup();
      });

      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          resolve();
        });
      });
    });
  })
  .get("/messages", async (c) => {
    const session = c.get("session");
    const userId = session.user.id;
    const channelType = c.req.query("channelType") || "organization";
    const departmentIdStr = c.req.query("departmentId");
    const colleagueId = c.req.query("colleagueId");

    let rows: any[] = [];
    if (channelType === "organization") {
      rows = await db.select({
        id: messages.id,
        senderId: messages.senderId,
        senderName: user.name,
        senderImage: user.image,
        content: messages.content,
        createdAt: messages.createdAt
      })
        .from(messages)
        .innerJoin(user, eq(messages.senderId, user.id))
        .where(eq(messages.channelType, "organization"))
        .orderBy(messages.createdAt)
        .execute();
    } else if (channelType === "department" && departmentIdStr) {
      const deptId = Number(departmentIdStr);
      rows = await db.select({
        id: messages.id,
        senderId: messages.senderId,
        senderName: user.name,
        senderImage: user.image,
        content: messages.content,
        createdAt: messages.createdAt
      })
        .from(messages)
        .innerJoin(user, eq(messages.senderId, user.id))
        .where(sql`${messages.channelType} = 'department' AND ${messages.departmentId} = ${deptId}`)
        .orderBy(messages.createdAt)
        .execute();
    } else if (channelType === "direct" && colleagueId) {
      rows = await db.select({
        id: messages.id,
        senderId: messages.senderId,
        senderName: user.name,
        senderImage: user.image,
        content: messages.content,
        createdAt: messages.createdAt
      })
        .from(messages)
        .innerJoin(user, eq(messages.senderId, user.id))
        .where(sql`${messages.channelType} = 'direct' AND ((${messages.senderId} = ${userId} AND ${messages.receiverId} = ${colleagueId}) OR (${messages.senderId} = ${colleagueId} AND ${messages.receiverId} = ${userId}))`)
        .orderBy(messages.createdAt)
        .execute();
    }

    return c.json(rows);
  })
  .post("/messages", async (c) => {
    const session = c.get("session");
    const userId = session.user.id;
    const body = await c.req.json();

    const [inserted] = await db.insert(messages).values({
      senderId: userId,
      receiverId: body.receiverId || null,
      channelType: body.channelType || "organization",
      departmentId: body.departmentId ? Number(body.departmentId) : null,
      content: body.content
    }).returning();

    const sender = await db.select().from(user).where(eq(user.id, userId)).limit(1).then((res: any) => res[0]);
    const newMsg = {
      id: inserted.id,
      senderId: userId,
      senderName: sender?.name || "Colleague",
      senderImage: sender?.image || null,
      receiverId: body.receiverId || null,
      channelType: body.channelType || "organization",
      departmentId: body.departmentId ? Number(body.departmentId) : null,
      content: body.content,
      createdAt: inserted.createdAt
    };

    dispatchMessage(newMsg);

    return c.json(newMsg);
  })

export type AppType = typeof api;
