import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";
import { db } from "../db/client.ts";
import { auth, type AuthEnv } from "../auth.ts";
import { staff, patients } from "../db/schema.ts";

// ---------------------------------------------------------------------------
// Simple helpers
// ---------------------------------------------------------------------------

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const code = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

export const jsonBody = async <T extends z.ZodTypeAny>(c: Context, schema: T) =>
  schema.parse(await c.req.json());

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export const requireAdmin = async (c: Context<AuthEnv>, next: any) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (session?.user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
};

export const getCurrentStaff = async (c: Context<AuthEnv>) => {
  const session = c.get("session");
  if (!session?.user) {
    return null;
  }
  const staffRecord = await db
    .select()
    .from(staff)
    .where(
      sql`(${staff.userId} = ${session.user.id} OR ${staff.email} = ${session.user.email}) AND ${staff.active} = true`
    )
    .limit(1)
    .then((res: any) => res[0]);
  return staffRecord;
};

export const isSupervisorOf = (
  supervisor: typeof staff.$inferSelect | null | undefined,
  employee: typeof staff.$inferSelect | null | undefined
): boolean => {
  if (!supervisor || !employee) return false;
  // staffSupervisors stores stable staffIds for supervisor references
  // This check is a fallback — prefer using staffSupervisors table queries
  return false;
};

// ---------------------------------------------------------------------------
// Date / roster utilities
// ---------------------------------------------------------------------------

export function parseDateTime(dateStr: string, timeStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute);
}

export function getRosterIntervals(
  startDateStr: string,
  endDateStr: string,
  startTime: string,
  endTime: string
) {
  const intervals: { start: number; end: number }[] = [];
  const curr = new Date(startDateStr + "T00:00:00Z");
  const last = new Date(endDateStr + "T00:00:00Z");

  while (curr <= last) {
    const year = curr.getUTCFullYear();
    const month = String(curr.getUTCMonth() + 1).padStart(2, "0");
    const day = String(curr.getUTCDate()).padStart(2, "0");
    const dStr = `${year}-${month}-${day}`;

    const start = parseDateTime(dStr, startTime);
    let end: number;
    if (startTime < endTime) {
      end = parseDateTime(dStr, endTime);
    } else {
      const nextDay = new Date(curr);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const nextYear = nextDay.getUTCFullYear();
      const nextMonth = String(nextDay.getUTCMonth() + 1).padStart(2, "0");
      const nextDayNum = String(nextDay.getUTCDate()).padStart(2, "0");
      const nextDayStr = `${nextYear}-${nextMonth}-${nextDayNum}`;
      end = parseDateTime(nextDayStr, endTime);
    }
    intervals.push({ start, end });
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return intervals;
}

export function doIntervalsOverlap(
  startAStr: string,
  endAStr: string,
  startATime: string,
  endATime: string,
  startBStr: string,
  endBStr: string,
  startBTime: string,
  endBTime: string
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

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysToDate(date: Date, days: number) {
  const next = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function inferDateOfBirth(row: typeof patients.$inferSelect) {
  const created =
    row.createdAt instanceof Date ? row.createdAt : new Date();
  const dob = new Date(
    Date.UTC(
      created.getUTCFullYear(),
      created.getUTCMonth(),
      created.getUTCDate()
    )
  );
  dob.setUTCFullYear(dob.getUTCFullYear() - row.age);
  return dob;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const staffInput = z.object({
  name: z.string().min(2),
  role: z.string().min(2),
  departmentId: z.coerce.number().int().positive(),
  supervisorLevel1Id: z.coerce.number().int().positive().optional(),
  supervisorLevel2Id: z.coerce.number().int().positive().optional(),
  phone: z.string().min(7),
  email: z.string().email(),
  basicSalary: z.coerce.number().min(0).default(0),
  hra: z.coerce.number().min(0).default(0),
  conveyance: z.coerce.number().min(0).default(0),
  medical: z.coerce.number().min(0).default(0),
  special: z.coerce.number().min(0).default(0),
  epf: z.coerce.number().min(0).default(0),
  esi: z.coerce.number().min(0).default(0),
  professionalTax: z.coerce.number().min(0).default(0),
  otherDeductions: z.coerce.number().min(0).default(0),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  salary: z.coerce.number().positive().default(1),
  status: z.string().default("Active"),
  isExecutive: z.boolean().optional().default(false),
  aadhar: z
    .string()
    .regex(
      /^[2-9]\d{11}$/,
      "Aadhar must be a valid 12-digit number (cannot start with 0 or 1)"
    ),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, "Invalid PAN format")
    .transform((val) => val.toUpperCase()),
  hrProfile: z
    .object({
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
      educationHistory: z
        .array(
          z.object({
            qualification: z.string().optional(),
            institution: z.string().optional(),
            year: z.string().optional(),
            grade: z.string().optional(),
          })
        )
        .default([]),
      professionalHistory: z
        .array(
          z.object({
            employer: z.string().optional(),
            designation: z.string().optional(),
            from: z.string().optional(),
            to: z.string().optional(),
            responsibilities: z.string().optional(),
          })
        )
        .default([]),
      uan: z.string().optional(),
      epfNumber: z.string().optional(),
      esiNumber: z.string().optional(),
      dateOfJoining: z.string().optional(),
      lastWorkingDate: z.string().optional(),
    })
    .optional(),
});

export const leaveRequestInput = z
  .object({
    staffId: z.number().int().positive(),
    leaveType: z.string().min(2),
    isHalfDay: z.boolean().default(false),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    reason: z.string().min(3),
    // supportingDocument is handled as a multipart file upload, not a JSON field
  })
  .refine(
    (value) => {
      const start = new Date(value.startDate);
      const end = new Date(value.endDate);
      if (value.isHalfDay) {
        // For half day leaves, start and end dates must be the exact same calendar day
        return start.toISOString().split("T")[0] === end.toISOString().split("T")[0];
      }
      return end >= start;
    },
    {
      path: ["endDate"],
      message: "End date must be on or after start date. For half-day leaves, they must be the same date.",
    }
  );

export const leaveDecisionInput = z.object({
  reviewerNote: z.string().optional(),
  forwardToStaffId: z.number().optional(),
});

export const patientInput = z.object({
  name: z.string().min(2),
  age: z.number().int().min(0).max(120),
  gender: z.string().min(1),
  phone: z.string().min(7),
  address: z.string().min(3),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
});

export const appointmentInput = z.object({
  patientId: z.number().int().positive(),
  doctorId: z.number().int().positive(),
  departmentId: z.number().int().positive(),
  scheduledAt: z.string().datetime(),
  reason: z.string().min(3),
});

export const inventoryInput = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  unit: z.string().min(1),
  quantity: z.number().int().min(0),
  reorderLevel: z.number().int().min(0),
  supplier: z.string().min(2),
  location: z.string().min(2),
  expiryDate: z.string().optional(),
});

export const medicineInput = z.object({
  name: z.string().min(2),
  genericName: z.string().min(2),
  form: z.string().min(2),
  strength: z.string().min(1),
  stock: z.number().int().min(0),
  reorderLevel: z.number().int().min(0),
  price: z.number().min(0),
  batchNo: z.string().min(2),
  expiryDate: z.string().datetime(),
});

export const prescriptionInput = z.object({
  patientId: z.number().int().positive(),
  doctorId: z.number().int().positive(),
  encounterId: z.number().int().positive().optional(),
  lines: z
    .array(
      z.object({
        medicineId: z.number().int().positive(),
        dosage: z.string().min(1),
        duration: z.string().min(1),
        quantity: z.number().int().positive(),
        instructions: z.string().min(1),
      })
    )
    .min(1),
});

export const immunizationRecordInput = z.object({
  patientId: z.number().int().positive(),
  scheduleId: z.number().int().positive().optional().nullable(),
  vaccineCode: z.string().min(1),
  vaccineName: z.string().min(2),
  doseLabel: z.string().min(1),
  administeredAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  administeredByStaffId: z.number().int().positive().optional().nullable(),
  batchNo: z.string().optional(),
  manufacturer: z.string().optional(),
  site: z.string().optional(),
  route: z.string().optional(),
  adverseEvent: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().default("Administered"),
});

export const roleTypeInput = z.object({
  name: z.string().min(2),
  active: z.boolean().default(true),
});

export const leaveTypeInput = z.object({
  name: z.string().min(2),
  maxDays: z.number().int().min(0),
  active: z.boolean().default(true),
  payable: z.boolean().default(true),
  paymentRate: z.number().min(0).max(100).default(100.0),
});

export const departmentInput = z.object({
  name: z.string().min(2),
  floor: z.string().min(1),
  head: z.string().optional().default(""),
  headStaffId: z.number().int().positive().nullable().optional(),
  subheadStaffId: z.number().int().positive().nullable().optional(),
  active: z.boolean().default(true),
});

export const shiftInput = z.object({
  name: z.string().min(2),
  code: z.string().min(1).max(10),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
  active: z.boolean().default(true),
  isOffDay: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const bankInput = z.object({
  name: z.string().min(2),
  active: z.boolean().default(true),
});

export const rosterInput = z
  .object({
    staffId: z.number().int().positive(),
    departmentId: z.number().int().positive(),
    shiftId: z.number().int().positive(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    notes: z.string().optional(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "End date must be on or after start date",
  });
