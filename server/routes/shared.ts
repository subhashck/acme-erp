import { and, eq, sql } from "drizzle-orm";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { db } from "../db/client.ts";
import { auth, type AuthEnv } from "../auth.ts";
import { staff, patients, managementApprovers, departments, staffDepartments, unitTypes, unitConversions, items, departmentLeaders } from "../db/schema.ts";
import { stores } from "../db/schema-inventory.ts";

// ---------------------------------------------------------------------------
// Simple helpers
// ---------------------------------------------------------------------------

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const code = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

// Helper to resolve unitId from either numeric FK or string symbol/name
export async function resolveUnitId(tx: any, unitId?: number | null, unitStr?: string | null): Promise<number> {
  if (unitId && typeof unitId === "number" && unitId > 0) {
    const [exists] = await tx
      .select({ id: unitTypes.id })
      .from(unitTypes)
      .where(eq(unitTypes.id, unitId))
      .limit(1);
    if (exists) return exists.id;
  }
  if (unitStr && typeof unitStr === "string" && unitStr.trim()) {
    const clean = unitStr.trim();
    const [found] = await tx
      .select({ id: unitTypes.id })
      .from(unitTypes)
      .where(sql`lower(${unitTypes.symbol}) = lower(${clean}) or lower(${unitTypes.name}) = lower(${clean})`)
      .limit(1);
    if (found) return found.id;
  }
  const [first] = await tx.select({ id: unitTypes.id }).from(unitTypes).limit(1);
  if (!first) {
    const [created] = await tx
      .insert(unitTypes)
      .values({ name: unitStr?.trim() || "Unit", symbol: unitStr?.trim() || "unit" })
      .returning({ id: unitTypes.id });
    return created.id;
  }
  return first.id;
}

// Helper to get unit conversion multiplier from fromUnitId to toUnitId
export async function getUnitConversionMultiplier(
  tx: any,
  fromUnitId?: number | null,
  toUnitId?: number | null
): Promise<number> {
  if (!fromUnitId || !toUnitId || fromUnitId === toUnitId) {
    return 1;
  }

  // Check direct conversion
  const [direct] = await tx
    .select({ multiplier: unitConversions.multiplier })
    .from(unitConversions)
    .where(and(eq(unitConversions.fromUnitId, fromUnitId), eq(unitConversions.toUnitId, toUnitId)))
    .limit(1);

  if (direct && Number(direct.multiplier) > 0) {
    return Number(direct.multiplier);
  }

  // Check inverse conversion
  const [inverse] = await tx
    .select({ multiplier: unitConversions.multiplier })
    .from(unitConversions)
    .where(and(eq(unitConversions.fromUnitId, toUnitId), eq(unitConversions.toUnitId, fromUnitId)))
    .limit(1);

  if (inverse && Number(inverse.multiplier) > 0) {
    return 1 / Number(inverse.multiplier);
  }

  // Multi-step conversion via all rules (BFS search)
  const allConversions = await tx
    .select({
      fromUnitId: unitConversions.fromUnitId,
      toUnitId: unitConversions.toUnitId,
      multiplier: unitConversions.multiplier,
    })
    .from(unitConversions);

  const adj = new Map<number, Array<{ to: number; factor: number }>>();
  for (const c of allConversions) {
    const f = Number(c.fromUnitId);
    const t = Number(c.toUnitId);
    const m = Number(c.multiplier);
    if (m > 0) {
      if (!adj.has(f)) adj.set(f, []);
      if (!adj.has(t)) adj.set(t, []);
      adj.get(f)!.push({ to: t, factor: m });
      adj.get(t)!.push({ to: f, factor: 1 / m });
    }
  }

  const queue: Array<{ unitId: number; cumulativeFactor: number }> = [
    { unitId: fromUnitId, cumulativeFactor: 1 },
  ];
  const visited = new Set<number>([fromUnitId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.unitId === toUnitId) {
      return current.cumulativeFactor;
    }

    const neighbors = adj.get(current.unitId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.to)) {
        visited.add(neighbor.to);
        queue.push({
          unitId: neighbor.to,
          cumulativeFactor: current.cumulativeFactor * neighbor.factor,
        });
      }
    }
  }

  return 1;
}

// Helper to convert an item's quantity to its base unit
export async function convertItemQuantityToBase(
  tx: any,
  itemId: number,
  quantity: number,
  fromUnitId?: number | null,
  fromUnitStr?: string | null
): Promise<{ baseQuantity: number; factor: number; baseUnitId: number }> {
  const [item] = await tx
    .select({
      id: items.id,
      baseUnitId: items.baseUnitId,
      purchaseUnitId: items.purchaseUnitId,
      saleUnitId: items.saleUnitId,
    })
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);

  if (!item) {
    return { baseQuantity: quantity, factor: 1, baseUnitId: fromUnitId || 1 };
  }

  const effectiveFromUnitId = await resolveUnitId(tx, fromUnitId, fromUnitStr);
  const effectiveBaseUnitId =
    item.baseUnitId ||
    (await resolveUnitId(tx, item.purchaseUnitId || item.saleUnitId, null));

  const factor = await getUnitConversionMultiplier(tx, effectiveFromUnitId, effectiveBaseUnitId);
  return {
    baseQuantity: Number((quantity * factor).toFixed(4)),
    factor,
    baseUnitId: effectiveBaseUnitId,
  };
}

export const jsonBody = async <T extends z.ZodTypeAny>(c: Context, schema: T) => {
  try {
    const body = await c.req.json();
    return schema.parse(body);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const message = err.issues.map((i) => i.message).join(", ");
      throw new HTTPException(400, { message, cause: err });
    }
    throw err;
  }
};

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

export const isManagementApprover = async (c: Context<AuthEnv>): Promise<boolean> => {
  const currentStaff = await getCurrentStaff(c);
  if (!currentStaff) return false;

  const row = await db
    .select()
    .from(managementApprovers)
    .where(
      and(
        eq(managementApprovers.staffId, currentStaff.staffId),
        eq(managementApprovers.active, true)
      )
    )
    .limit(1)
    .then((res: any) => res[0]);

  return !!row;
};

export const hasHrOrAccountsViewAccess = async (c: Context<AuthEnv>): Promise<boolean> => {
  const session = c.get("session");
  const userRole = session?.user?.role?.toLowerCase();
  if (userRole === "admin" || userRole === "hr" || userRole === "management" || userRole === "mgt" || userRole === "management_approver") return true;

  const currentStaff = await getCurrentStaff(c);
  if (!currentStaff) return false;

  const isAccounts = await db
    .select({ name: departments.name })
    .from(staffDepartments)
    .innerJoin(departments, eq(staffDepartments.departmentId, departments.id))
    .where(
      and(
        eq(staffDepartments.staffId, currentStaff.staffId),
        eq(departments.name, "Accounts")
      )
    )
    .limit(1)
    .then((res: any) => res.length > 0);

  if (isAccounts) return true;

  return await isManagementApprover(c);
};

export const hasCollegeAccess = async (c: Context<AuthEnv>): Promise<boolean> => {
  const session: any = c.get("session") || (await auth.api.getSession({ headers: c.req.raw.headers }));
  if (!session?.user) return false;

  const userRole = (session.user.role || "").trim().toLowerCase();
  if (userRole === "admin" || userRole === "accounts" || userRole === "acon") return true;

  const currentStaff = await getCurrentStaff(c);
  if (!currentStaff) return false;

  const staffRole = (currentStaff.role || "").trim().toLowerCase();
  if (staffRole === "admin" || staffRole === "accounts" || staffRole === "acon") return true;

  // Check active department assignment in staffDepartments
  const activeStaffDepts = await db
    .select({ name: departments.name })
    .from(staffDepartments)
    .innerJoin(departments, eq(staffDepartments.departmentId, departments.id))
    .where(
      and(
        eq(staffDepartments.staffId, currentStaff.staffId),
        eq(staffDepartments.status, "Active")
      )
    )
    .execute();

  const hasAllowedDept = activeStaffDepts.some((d) => {
    const deptName = (d.name || "").trim().toUpperCase();
    return deptName === "ACCOUNTS" || deptName === "ACON";
  });

  if (hasAllowedDept) return true;

  // Fallback: check direct departmentId on currentStaff if set
  if (currentStaff.departmentId) {
    const [dept] = await db
      .select({ name: departments.name })
      .from(departments)
      .where(eq(departments.id, currentStaff.departmentId))
      .execute();
    if (dept) {
      const deptName = (dept.name || "").trim().toUpperCase();
      if (deptName === "ACCOUNTS" || deptName === "ACON") return true;
    }
  }

  return false;
};

export const requireCollegeAccess = async (c: Context<AuthEnv>, next: any) => {
  const allowed = await hasCollegeAccess(c);
  if (!allowed) {
    return c.json(
      { error: "Forbidden: Access to College Module is restricted to Admin, Accounts, and ACON department." },
      403
    );
  }
  await next();
};

export const hasFrontOfficeAccess = async (c: Context<AuthEnv>): Promise<boolean> => {
  const session: any = c.get("session") || (await auth.api.getSession({ headers: c.req.raw.headers }));
  if (!session?.user) return false;

  const userRole = (session.user.role || "").trim().toLowerCase();
  if (userRole === "admin") return true;

  const currentStaff = await getCurrentStaff(c);
  if (!currentStaff) return false;

  const staffRole = (currentStaff.role || "").trim().toLowerCase();
  if (staffRole === "admin") return true;

  const isFrontOfficeDept = (name: string) =>
    (name || "").replace(/\s+/g, " ").trim().toUpperCase() === "FRONT OFFICE";

  // Check active department assignment in staffDepartments
  const activeStaffDepts = await db
    .select({ name: departments.name })
    .from(staffDepartments)
    .innerJoin(departments, eq(staffDepartments.departmentId, departments.id))
    .where(
      and(
        eq(staffDepartments.staffId, currentStaff.staffId),
        eq(staffDepartments.status, "Active")
      )
    )
    .execute();

  if (activeStaffDepts.some((d) => isFrontOfficeDept(d.name))) return true;

  // Fallback: check direct departmentId on currentStaff if set
  if (currentStaff.departmentId) {
    const [dept] = await db
      .select({ name: departments.name })
      .from(departments)
      .where(eq(departments.id, currentStaff.departmentId))
      .execute();
    if (dept && isFrontOfficeDept(dept.name)) return true;
  }

  return false;
};

export const requireFrontOfficeAccess = async (c: Context<AuthEnv>, next: any) => {
  const allowed = await hasFrontOfficeAccess(c);
  if (!allowed) {
    return c.json(
      { error: "Forbidden: Access to Front Office Module is restricted to Admin and Front Office department staff." },
      403
    );
  }
  await next();
};

export const hasInventoryAccess = async (c: Context<AuthEnv>): Promise<boolean> => {
  const session: any = c.get("session") || (await auth.api.getSession({ headers: c.req.raw.headers }));
  if (!session?.user) return false;

  const userRole = (session.user.role || "").trim().toLowerCase();
  if (userRole === "admin" || userRole === "inventory" || userRole === "store" || userRole === "pharmacist") return true;

  const currentStaff = await getCurrentStaff(c);
  if (!currentStaff) return false;

  const staffRole = (currentStaff.role || "").trim().toLowerCase();
  const dept = (currentStaff.departmentName || "").replace(/\s+/g, " ").trim().toUpperCase();
  if (
    dept === "PURCHASE AND STORE" ||
    dept === "PURCHASE & STORE" ||
    dept.startsWith("PURCHASE AND STORE") ||
    dept === "DISPENSARY" ||
    dept.startsWith("DISPENSARY")
  ) {
    return true;
  }

  return false;
};

export const requireInventoryAccess = async (c: Context<AuthEnv>, next: any) => {
  const allowed = await hasInventoryAccess(c);
  if (!allowed) {
    return c.json(
      { error: "Forbidden: Access to Inventory Module requires active store access." },
      403
    );
  }
  await next();
};

export const canPostConsumptionVoucher = async (
  c: Context<AuthEnv>,
  storeId: number
): Promise<boolean> => {
  const session: any = c.get("session") || (await auth.api.getSession({ headers: c.req.raw.headers }));
  if (!session?.user) return false;

  const userRole = (session.user.role || "").trim().toLowerCase();
  if (userRole === "admin") return true;

  const currentStaff = await getCurrentStaff(c);
  if (!currentStaff) return false;

  const staffRole = (currentStaff.role || "").trim().toLowerCase();
  if (staffRole === "admin") return true;

  // Look up store to find its department
  const [store] = await db
    .select({ id: stores.id, departmentId: stores.departmentId })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);

  if (!store || !store.departmentId) {
    return userRole === "admin" || staffRole === "admin" || userRole === "inventory" || staffRole === "inventory";
  }

  // Look up departmentLeaders for this department
  const [leader] = await db
    .select()
    .from(departmentLeaders)
    .where(eq(departmentLeaders.departmentId, store.departmentId))
    .limit(1);

  if (!leader) return false;

  const isHead = leader.headStaffId != null && leader.headStaffId === currentStaff.staffId;
  const isSubhead = leader.subheadStaffId != null && leader.subheadStaffId === currentStaff.staffId;

  return isHead || isSubhead;
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
  skillAllowance: z.coerce.number().min(0).default(0),
  special: z.coerce.number().min(0).default(0),
  epf: z.coerce.number().min(0).default(0),
  esi: z.coerce.number().min(0).default(0),
  professionalTax: z.coerce.number().min(0).default(0),
  deductTds: z.boolean().optional().default(false),
  tdsPercent: z.coerce.number().min(0).max(100).optional().default(10),
  tds: z.coerce.number().min(0).optional().default(0),
  securityDepositTotal: z.coerce.number().min(0).optional().default(0),
  securityDeposit: z.coerce.number().min(0).optional().default(0),
  securityDepositStartMonth: z.string().optional().nullable(),
  otherDeductions: z.coerce.number().min(0).default(0),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  salary: z.coerce.number().positive().default(1),
  status: z.string().default("Active"),
  isExecutive: z.boolean().optional().default(false),
  employmentType: z.enum(["Permanent", "Contract", "Probation", "Intern"]).default("Permanent"),
  effectiveDate: z.string().optional(),
  permanentConfirmationDate: z.string().optional(),
  employmentStartDate: z.string().optional(),
  employmentEndDate: z.string().optional(),
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
      nationality: z.string().optional(),
      landmarkCurrentAddress: z.string().optional(),
      landmarkPermanentAddress: z.string().optional(),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
      currentAddress: z.string().min(1, "Current address is required"),
      permanentAddress: z.string().min(1, "Permanent address is required"),
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
      religion: z.string().optional(),
      nominees: z
        .array(
          z.object({
            name: z.string().optional(),
            percentage: z.coerce.number().optional(),
            relationship: z.string().optional(),
          })
        )
        .default([]),
      certifications: z
        .array(
          z.object({
            name: z.string().optional(),
            issuingOrganization: z.string().optional(),
            validityPeriod: z.string().optional(),
            certificateNumber: z.string().optional(),
          })
        )
        .default([]),
      familyMembers: z
        .array(
          z.object({
            name: z.string().optional(),
            relationship: z.string().optional(),
            ageDob: z.string().optional(),
            contactNo: z.string().optional(),
          })
        )
        .default([]),
      mncRegistrationNo: z.string().optional(),
      mncValidityUpto: z.string().optional(),
      mmcRegistrationNo: z.string().optional(),
      mmcValidityUpto: z.string().optional(),
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
  isClinical: z.boolean().default(false),
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
    /** startDate and endDate define the range; server expands to per-day rows. */
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    notes: z.string().optional(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "End date must be on or after start date",
  });

/** Used by PUT /hr/roster/:id — only shift and notes are editable on a per-day row. */
export const rosterUpdateInput = z.object({
  shiftId: z.number().int().positive(),
  notes: z.string().optional(),
});

export const offDayRequestInput = z.object({
  staffId: z.number().int().positive().optional(),
  originalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  reason: z.string().optional(),
});

export const offDayReviewInput = z.object({
  status: z.enum(["Approved", "Rejected"]),
  reviewerNote: z.string().optional(),
});

export const weeklyOffDayInput = z.object({
  staffId: z.number().int().positive(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1, "Select at least one off day"),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  effectiveTo: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").nullable().optional()
  ),
  notes: z.string().optional(),
});
