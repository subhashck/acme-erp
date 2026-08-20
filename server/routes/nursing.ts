import { and, desc, eq, ne, sql, like, gte, lte, count } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  nursingCourses,
  nursingBatches,
  nursingApplicants,
  nursingStudents,
  nursingStudentDocuments,
  nursingFeeStructures,
  nursingFeeTransactions,
  nursingStudentFeeFrequencies,
  nursingAttendanceRecords,
  nursingAuditLogs,
  nursingSubjects,
  nursingAcademicSchedules,
  user,
} from "../db/schema.ts";
import { jsonBody, idParam, code, requireCollegeAccess } from "./shared.ts";

function toNum(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function parseRemarks(remarks: unknown): any {
  if (!remarks) return null;
  if (typeof remarks === "object") return remarks;
  if (typeof remarks === "string") {
    try {
      return JSON.parse(remarks);
    } catch {
      return null;
    }
  }
  return null;
}

export function getAcademicYear(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  const month = isNaN(d.getMonth()) ? new Date().getMonth() + 1 : d.getMonth() + 1;
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export async function generateNextEnrollmentNo(batchStartYear: string): Promise<string> {
  const existing = await db
    .select({ enrollmentNo: nursingStudents.enrollmentNo })
    .from(nursingStudents)
    .execute();

  const existingSet = new Set(existing.map((e) => (e.enrollmentNo || "").trim().toUpperCase()));
  const prefix = `NUR-STU-${batchStartYear}-`;

  let maxSeq = 0;
  for (const item of existing) {
    const en = (item.enrollmentNo || "").trim();
    if (en.toUpperCase().startsWith(prefix.toUpperCase())) {
      const suffix = en.slice(prefix.length);
      const num = parseInt(suffix, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  let candidateSeq = Math.max(maxSeq + 1, existing.length + 1);
  let candidate = `${prefix}${String(candidateSeq).padStart(4, "0")}`;

  while (existingSet.has(candidate.toUpperCase())) {
    candidateSeq++;
    candidate = `${prefix}${String(candidateSeq).padStart(4, "0")}`;
  }

  return candidate;
}

export const nursingRoutes = new Hono<AuthEnv>()
  .use("*", requireCollegeAccess)
  // -------------------------------------------------------------------------
  // Dashboard / Analytics Stats
  // -------------------------------------------------------------------------
  .get("/nursing/dashboard/stats", async (c) => {
    const totalApplicants = await db.select({ val: count() }).from(nursingApplicants).then(res => res[0]?.val ?? 0);
    const totalStudents = await db.select({ val: count() }).from(nursingStudents).then(res => res[0]?.val ?? 0);

    const feeTxRows = await db.select().from(nursingFeeTransactions).execute();
    const totalFeeCollected = feeTxRows.reduce((sum, tx) => sum + toNum(tx.amount), 0);

    const totalAttendance = await db.select({ val: count() }).from(nursingAttendanceRecords).then(res => res[0]?.val ?? 0);
    const presentAttendance = await db.select({ val: count() }).from(nursingAttendanceRecords).where(eq(nursingAttendanceRecords.status, "present")).then(res => res[0]?.val ?? 0);
    const avgAttendancePercent = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;

    // Monthly Fee Collection Trend (group by YYYY-MM)
    const monthlyFeeMap: Record<string, number> = {};
    feeTxRows.forEach(tx => {
      if (tx.paymentDate) {
        const monthKey = tx.paymentDate.slice(0, 7); // "YYYY-MM"
        monthlyFeeMap[monthKey] = (monthlyFeeMap[monthKey] || 0) + toNum(tx.amount);
      }
    });
    const feeTrend = Object.keys(monthlyFeeMap).sort().map(month => ({
      month,
      amount: monthlyFeeMap[month],
    }));

    // Quota Seat Occupancy
    const applicantsList = await db.select().from(nursingApplicants).execute();
    const quotaMap = {
      general: applicantsList.filter(a => a.quotaCategory === "general").length,
      reserved: applicantsList.filter(a => a.quotaCategory === "reserved").length,
      management: applicantsList.filter(a => a.quotaCategory === "management").length,
    };

    return c.json({
      totalApplicants,
      totalStudents,
      totalFeeCollected,
      avgAttendancePercent,
      feeTrend,
      quotaMap,
    });
  })

  // -------------------------------------------------------------------------
  // Courses CRUD
  // -------------------------------------------------------------------------
  .get("/nursing/courses", async (c) => {
    const rows = await db.select().from(nursingCourses).orderBy(desc(nursingCourses.id)).execute();
    return c.json(rows);
  })

  .post("/nursing/courses", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        durationYears: z.number().int().positive().default(3),
        totalSeats: z.number().int().positive().default(60),
        regulatoryBody: z.string().default("INC / State Council"),
      })
    );

    const [row] = await db.insert(nursingCourses).values(input).returning().execute();

    const session = c.get("session");
    await db.insert(nursingAuditLogs).values({
      entity: "nursing_courses",
      entityId: String(row.id),
      action: "CREATE",
      changedBy: session?.user?.id,
      diff: row,
    }).execute();

    return c.json(row, 201);
  })

  .put("/nursing/courses/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!id || isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const input = await jsonBody(
      c,
      z.object({
        code: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        durationYears: z.number().int().positive().optional(),
        totalSeats: z.number().int().positive().optional(),
        regulatoryBody: z.string().optional(),
        active: z.boolean().optional(),
      })
    );

    const [updated] = await db
      .update(nursingCourses)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(nursingCourses.id, id))
      .returning()
      .execute();

    if (!updated) {
      return c.json({ error: "Course not found" }, 404);
    }

    const session = c.get("session");
    await db.insert(nursingAuditLogs).values({
      entity: "nursing_courses",
      entityId: String(id),
      action: "UPDATE",
      changedBy: session?.user?.id,
      diff: updated,
    }).execute();

    return c.json(updated);
  })

  .delete("/nursing/courses/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!id || isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    try {
      const [deleted] = await db
        .delete(nursingCourses)
        .where(eq(nursingCourses.id, id))
        .returning()
        .execute();

      if (!deleted) {
        return c.json({ error: "Course not found" }, 404);
      }

      const session = c.get("session");
      await db.insert(nursingAuditLogs).values({
        entity: "nursing_courses",
        entityId: String(id),
        action: "DELETE",
        changedBy: session?.user?.id,
        diff: deleted,
      }).execute();

      return c.json({ success: true, message: "Course deleted successfully" });
    } catch (err: any) {
      if (err.code === "23503" || err.message?.includes("foreign key")) {
        return c.json(
          { error: "Cannot delete course as it is referenced by existing academic batches, applicants, or fee structures." },
          400
        );
      }
      throw err;
    }
  })

  // -------------------------------------------------------------------------
  // Batches CRUD
  // -------------------------------------------------------------------------
  .get("/nursing/batches", async (c) => {
    const rows = await db
      .select({
        id: nursingBatches.id,
        courseId: nursingBatches.courseId,
        courseName: nursingCourses.name,
        courseCode: nursingCourses.code,
        academicYear: nursingBatches.academicYear,
        section: nursingBatches.section,
        maxSeats: nursingBatches.maxSeats,
        startDate: nursingBatches.startDate,
        endDate: nursingBatches.endDate,
        active: nursingBatches.active,
      })
      .from(nursingBatches)
      .leftJoin(nursingCourses, eq(nursingBatches.courseId, nursingCourses.id))
      .orderBy(desc(nursingBatches.id))
      .execute();
    return c.json(rows);
  })

  .post("/nursing/batches", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        courseId: z.number().int().positive(),
        academicYear: z.string().min(1),
        section: z.string().default("A"),
        maxSeats: z.number().int().positive().default(60),
        startDate: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
      })
    );

    const [row] = await db.insert(nursingBatches).values(input).returning().execute();

    const session = c.get("session");
    await db.insert(nursingAuditLogs).values({
      entity: "nursing_batches",
      entityId: String(row.id),
      action: "CREATE",
      changedBy: session?.user?.id,
      diff: row,
    }).execute();

    return c.json(row, 201);
  })

  .put("/nursing/batches/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const input = await jsonBody(
      c,
      z.object({
        courseId: z.number().int().positive().optional(),
        academicYear: z.string().min(1).optional(),
        section: z.string().optional(),
        maxSeats: z.number().int().positive().optional(),
        active: z.boolean().optional(),
      })
    );

    const [updated] = await db
      .update(nursingBatches)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(nursingBatches.id, id))
      .returning()
      .execute();

    if (!updated) {
      return c.json({ error: "Batch not found" }, 404);
    }

    const session = c.get("session");
    await db.insert(nursingAuditLogs).values({
      entity: "nursing_batches",
      entityId: String(id),
      action: "UPDATE",
      changedBy: session?.user?.id,
      diff: updated,
    }).execute();

    return c.json(updated);
  })

  .delete("/nursing/batches/:id", async (c) => {
    const id = Number(c.req.param("id"));

    const [deleted] = await db
      .delete(nursingBatches)
      .where(eq(nursingBatches.id, id))
      .returning()
      .execute();

    if (!deleted) {
      return c.json({ error: "Batch not found" }, 404);
    }

    const session = c.get("session");
    await db.insert(nursingAuditLogs).values({
      entity: "nursing_batches",
      entityId: String(id),
      action: "DELETE",
      changedBy: session?.user?.id,
      diff: deleted,
    }).execute();

    return c.json({ success: true, message: "Batch deleted successfully" });
  })

  // -------------------------------------------------------------------------
  // Applicants & Admissions CRUD
  // -------------------------------------------------------------------------
  .get("/nursing/applicants", async (c) => {
    const status = c.req.query("status");
    const courseId = c.req.query("courseId");
    const quotaCategory = c.req.query("quotaCategory");
    const search = c.req.query("search")?.trim().toLowerCase();
    const academicYear = c.req.query("academicYear");
    const pageParam = c.req.query("page");
    const pageSizeParam = c.req.query("pageSize");

    let query = db
      .select({
        id: nursingApplicants.id,
        applicationNo: nursingApplicants.applicationNo,
        courseId: nursingApplicants.courseId,
        courseName: nursingCourses.name,
        academicYear: nursingApplicants.academicYear,
        name: nursingApplicants.name,
        email: nursingApplicants.email,
        phone: nursingApplicants.phone,
        aadharNo: nursingApplicants.aadharNo,
        gender: nursingApplicants.gender,
        dob: nursingApplicants.dob,
        address: nursingApplicants.address,
        // Parents Information
        fatherName: nursingApplicants.fatherName,
        fatherPhone: nursingApplicants.fatherPhone,
        fatherAadharNo: nursingApplicants.fatherAadharNo,
        fatherOccupation: nursingApplicants.fatherOccupation,
        fatherOrganization: nursingApplicants.fatherOrganization,
        fatherAnnualIncome: nursingApplicants.fatherAnnualIncome,
        motherName: nursingApplicants.motherName,
        motherPhone: nursingApplicants.motherPhone,
        motherAadharNo: nursingApplicants.motherAadharNo,
        motherOccupation: nursingApplicants.motherOccupation,
        motherOrganization: nursingApplicants.motherOrganization,
        motherAnnualIncome: nursingApplicants.motherAnnualIncome,
        // Addresses
        presentAddress: nursingApplicants.presentAddress,
        presentDistrict: nursingApplicants.presentDistrict,
        presentPincode: nursingApplicants.presentPincode,
        presentState: nursingApplicants.presentState,
        permanentAddress: nursingApplicants.permanentAddress,
        permanentDistrict: nursingApplicants.permanentDistrict,
        permanentPincode: nursingApplicants.permanentPincode,
        permanentState: nursingApplicants.permanentState,
        // Academic History
        academicHistory: nursingApplicants.academicHistory,
        entranceMeritScore: nursingApplicants.entranceMeritScore,
        quotaCategory: nursingApplicants.quotaCategory,
        status: nursingApplicants.status,
        notes: nursingApplicants.notes,
        seatBookingAmount: nursingApplicants.seatBookingAmount,
        seatBookingStatus: nursingApplicants.seatBookingStatus,
        seatBookingReceiptNo: nursingApplicants.seatBookingReceiptNo,
        seatBookingDate: nursingApplicants.seatBookingDate,
        seatBookingPaymentMode: nursingApplicants.seatBookingPaymentMode,
        seatBookingNotes: nursingApplicants.seatBookingNotes,
        createdAt: nursingApplicants.createdAt,
      })
      .from(nursingApplicants)
      .leftJoin(nursingCourses, eq(nursingApplicants.courseId, nursingCourses.id));

    const rows = await query.orderBy(desc(nursingApplicants.id)).execute();

    let filtered = rows;
    if (status && status !== "all") filtered = filtered.filter(r => r.status === status);
    if (courseId && courseId !== "0" && courseId !== "all") filtered = filtered.filter(r => r.courseId === Number(courseId));
    if (quotaCategory && quotaCategory !== "all") filtered = filtered.filter(r => r.quotaCategory === quotaCategory);
    if (academicYear && academicYear !== "all") filtered = filtered.filter(r => r.academicYear === academicYear);
    if (search) {
      filtered = filtered.filter(r =>
        (r.name || "").toLowerCase().includes(search) ||
        (r.applicationNo || "").toLowerCase().includes(search) ||
        (r.email || "").toLowerCase().includes(search) ||
        (r.phone || "").toLowerCase().includes(search) ||
        (r.aadharNo || "").toLowerCase().includes(search) ||
        (r.fatherName || "").toLowerCase().includes(search) ||
        (r.fatherPhone || "").toLowerCase().includes(search) ||
        (r.motherPhone || "").toLowerCase().includes(search)
      );
    }

    if (pageParam !== undefined || pageSizeParam !== undefined) {
      const page = Math.max(1, Number(pageParam) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(pageSizeParam) || 10));
      const totalRecords = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
      const safePage = Math.min(page, totalPages);
      const offset = (safePage - 1) * pageSize;
      const paginatedRows = filtered.slice(offset, offset + pageSize);

      return c.json({
        data: paginatedRows,
        pagination: {
          page: safePage,
          pageSize,
          totalRecords,
          totalPages,
        },
      });
    }

    return c.json(filtered);
  })

  .post("/nursing/applicants", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        courseId: z.coerce.number().int().positive("Select a valid program course"),
        academicYear: z.string().min(1).default(() => { const y = new Date().getFullYear(); return `${y}-${y + 4}`; }),
        name: z.string().min(1, "Applicant name is required"),
        email: z.string().optional().or(z.literal("")).nullable(),
        phone: z.string().transform((v) => (v ? v.replace(/\D/g, "") : "")).refine((v) => v.length === 10, "Student contact number must be exactly 10 digits"),
        aadharNo: z.string().transform((v) => (v ? v.replace(/\D/g, "") : "")).refine((v) => v.length === 12, "Student Aadhar number must be exactly 12 digits"),
        gender: z.string().default("Female"),
        dob: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        // Parents Information
        fatherName: z.string().optional().nullable(),
        fatherPhone: z.string().transform((v) => (v ? v.replace(/\D/g, "") : "")).refine((v) => v.length === 10, "Father's contact number must be exactly 10 digits"),
        fatherAadharNo: z.string().transform((v) => (v ? v.replace(/\D/g, "") : "")).refine((v) => v.length === 12, "Father's Aadhar number must be exactly 12 digits"),
        fatherOccupation: z.string().optional().nullable(),
        fatherOrganization: z.string().optional().nullable(),
        fatherAnnualIncome: z.coerce.number().optional().nullable(),
        motherName: z.string().optional().nullable(),
        motherPhone: z.string().transform((v) => (v ? v.replace(/\D/g, "") : "")).refine((v) => v.length === 10, "Mother's contact number must be exactly 10 digits"),
        motherAadharNo: z.string().transform((v) => (v ? v.replace(/\D/g, "") : "")).refine((v) => v.length === 12, "Mother's Aadhar number must be exactly 12 digits"),
        motherOccupation: z.string().optional().nullable(),
        motherOrganization: z.string().optional().nullable(),
        motherAnnualIncome: z.coerce.number().optional().nullable(),
        // Addresses
        presentAddress: z.string().optional().nullable(),
        presentDistrict: z.string().optional().nullable(),
        presentPincode: z.string().optional().nullable(),
        presentState: z.string().optional().nullable(),
        permanentAddress: z.string().optional().nullable(),
        permanentDistrict: z.string().optional().nullable(),
        permanentPincode: z.string().optional().nullable(),
        permanentState: z.string().optional().nullable(),
        // Exams History
        academicHistory: z.any().optional().nullable(),
        entranceMeritScore: z.coerce
          .number({ message: "Entrance / Merit Score must be a valid number" })
          .min(0, "Entrance / Merit Score (%) must be at least 0%")
          .max(100, "Entrance / Merit Score (%) cannot exceed 100%")
          .default(0),
        quotaCategory: z.enum(["general", "reserved", "management"]).default("general"),
        notes: z.string().optional().nullable(),
      })
    );

    const appStartYear = input.academicYear
      ? input.academicYear.split(/[-/]/)[0].trim()
      : String(new Date().getFullYear());
    const applicationNo = code(`NUR-APP-${appStartYear}`);
    const meritScore = typeof input.entranceMeritScore === "number" && !isNaN(input.entranceMeritScore)
      ? input.entranceMeritScore.toFixed(2)
      : "0.00";

    const [row] = await db
      .insert(nursingApplicants)
      .values({
        courseId: input.courseId,
        academicYear: input.academicYear,
        name: input.name.trim().toUpperCase(),
        email: input.email || "",
        phone: input.phone,
        aadharNo: input.aadharNo,
        gender: input.gender,
        dob: input.dob || null,
        address: input.address || input.presentAddress || null,
        fatherName: input.fatherName || null,
        fatherPhone: input.fatherPhone,
        fatherAadharNo: input.fatherAadharNo,
        fatherOccupation: input.fatherOccupation || null,
        fatherOrganization: input.fatherOrganization || null,
        fatherAnnualIncome: input.fatherAnnualIncome != null ? String(input.fatherAnnualIncome) : null,
        motherName: input.motherName || null,
        motherPhone: input.motherPhone,
        motherAadharNo: input.motherAadharNo,
        motherOccupation: input.motherOccupation || null,
        motherOrganization: input.motherOrganization || null,
        motherAnnualIncome: input.motherAnnualIncome != null ? String(input.motherAnnualIncome) : null,
        presentAddress: input.presentAddress || null,
        presentDistrict: input.presentDistrict || null,
        presentPincode: input.presentPincode || null,
        presentState: input.presentState || null,
        permanentAddress: input.permanentAddress || null,
        permanentDistrict: input.permanentDistrict || null,
        permanentPincode: input.permanentPincode || null,
        permanentState: input.permanentState || null,
        academicHistory: input.academicHistory || null,
        entranceMeritScore: meritScore,
        quotaCategory: input.quotaCategory,
        notes: input.notes || null,
        applicationNo,
        status: "pending",
      })
      .returning()
      .execute();

    const session = c.get("session");
    await db.insert(nursingAuditLogs).values({
      entity: "nursing_applicants",
      entityId: String(row.id),
      action: "CREATE",
      changedBy: session?.user?.id,
      diff: row,
    }).execute();

    return c.json(row, 201);
  })

  .put("/nursing/applicants/:id/status", async (c) => {
    const id = Number(c.req.param("id"));
    if (!id || isNaN(id)) return c.json({ error: "Invalid applicant ID" }, 400);

    const { status, notes } = await jsonBody(
      c,
      z.object({
        status: z.enum(["pending", "approved", "rejected", "converted"]),
        notes: z.string().optional().nullable(),
      })
    );

    const [updated] = await db
      .update(nursingApplicants)
      .set({ status, notes, updatedAt: new Date() })
      .where(eq(nursingApplicants.id, id))
      .returning()
      .execute();

    const session = c.get("session");
    await db.insert(nursingAuditLogs).values({
      entity: "nursing_applicants",
      entityId: String(id),
      action: "UPDATE_STATUS",
      changedBy: session?.user?.id,
      diff: { status, notes },
    }).execute();

    return c.json(updated);
  })

  .put("/nursing/applicants/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!id || isNaN(id)) return c.json({ error: "Invalid applicant ID" }, 400);

    const input = await jsonBody(
      c,
      z.object({
        courseId: z.coerce.number().int().positive("Select a valid program course").optional(),
        academicYear: z.string().min(1).optional(),
        name: z.string().min(1, "Applicant name is required").optional(),
        email: z.string().optional().or(z.literal("")).nullable(),
        phone: z.string().transform((v) => (v ? v.replace(/\D/g, "") : "")).refine((v) => !v || v.length === 10, "Student contact number must be exactly 10 digits").optional(),
        aadharNo: z.string().transform((v) => (v ? v.replace(/\D/g, "") : "")).refine((v) => !v || v.length === 12, "Student Aadhar number must be exactly 12 digits").optional(),
        gender: z.string().optional(),
        dob: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        // Parents Information
        fatherName: z.string().optional().nullable(),
        fatherPhone: z.string().transform((v) => (v ? v.replace(/\D/g, "") : "")).refine((v) => !v || v.length === 10, "Father's contact number must be exactly 10 digits").optional(),
        fatherAadharNo: z.string().transform((v) => (v ? v.replace(/\D/g, "") : "")).refine((v) => !v || v.length === 12, "Father's Aadhar number must be exactly 12 digits").optional(),
        fatherOccupation: z.string().optional().nullable(),
        fatherOrganization: z.string().optional().nullable(),
        fatherAnnualIncome: z.coerce.number().optional().nullable(),
        motherName: z.string().optional().nullable(),
        motherPhone: z.string().transform((v) => (v ? v.replace(/\D/g, "") : "")).refine((v) => !v || v.length === 10, "Mother's contact number must be exactly 10 digits").optional(),
        motherAadharNo: z.string().transform((v) => (v ? v.replace(/\D/g, "") : "")).refine((v) => !v || v.length === 12, "Mother's Aadhar number must be exactly 12 digits").optional(),
        motherOccupation: z.string().optional().nullable(),
        motherOrganization: z.string().optional().nullable(),
        motherAnnualIncome: z.coerce.number().optional().nullable(),
        // Addresses
        presentAddress: z.string().optional().nullable(),
        presentDistrict: z.string().optional().nullable(),
        presentPincode: z.string().optional().nullable(),
        presentState: z.string().optional().nullable(),
        permanentAddress: z.string().optional().nullable(),
        permanentDistrict: z.string().optional().nullable(),
        permanentPincode: z.string().optional().nullable(),
        permanentState: z.string().optional().nullable(),
        // Exams History
        academicHistory: z.any().optional().nullable(),
        entranceMeritScore: z.coerce
          .number({ message: "Entrance / Merit Score must be a valid number" })
          .min(0, "Entrance / Merit Score (%) must be at least 0%")
          .max(100, "Entrance / Merit Score (%) cannot exceed 100%")
          .optional(),
        quotaCategory: z.enum(["general", "reserved", "management"]).optional(),
        status: z.enum(["pending", "approved", "rejected", "converted"]).optional(),
        notes: z.string().optional().nullable(),
      })
    );

    const updatePayload: Record<string, any> = { updatedAt: new Date() };

    if (input.courseId !== undefined) updatePayload.courseId = input.courseId;
    if (input.academicYear !== undefined) updatePayload.academicYear = input.academicYear;
    if (input.name !== undefined) updatePayload.name = input.name.trim().toUpperCase();
    if (input.email !== undefined) updatePayload.email = input.email || "";
    if (input.phone !== undefined) updatePayload.phone = input.phone || "";
    if (input.aadharNo !== undefined) updatePayload.aadharNo = input.aadharNo ? input.aadharNo.trim().toUpperCase() : null;
    if (input.gender !== undefined) updatePayload.gender = input.gender;
    if (input.dob !== undefined) updatePayload.dob = input.dob || null;
    if (input.address !== undefined) updatePayload.address = input.address || null;
    if (input.fatherName !== undefined) updatePayload.fatherName = input.fatherName || null;
    if (input.fatherPhone !== undefined) updatePayload.fatherPhone = input.fatherPhone ? input.fatherPhone.trim() : null;
    if (input.fatherAadharNo !== undefined) updatePayload.fatherAadharNo = input.fatherAadharNo ? input.fatherAadharNo.trim().toUpperCase() : null;
    if (input.fatherOccupation !== undefined) updatePayload.fatherOccupation = input.fatherOccupation || null;
    if (input.fatherOrganization !== undefined) updatePayload.fatherOrganization = input.fatherOrganization || null;
    if (input.fatherAnnualIncome !== undefined) updatePayload.fatherAnnualIncome = input.fatherAnnualIncome != null ? String(input.fatherAnnualIncome) : null;
    if (input.motherName !== undefined) updatePayload.motherName = input.motherName || null;
    if (input.motherPhone !== undefined) updatePayload.motherPhone = input.motherPhone ? input.motherPhone.trim() : null;
    if (input.motherAadharNo !== undefined) updatePayload.motherAadharNo = input.motherAadharNo ? input.motherAadharNo.trim().toUpperCase() : null;
    if (input.motherOccupation !== undefined) updatePayload.motherOccupation = input.motherOccupation || null;
    if (input.motherOrganization !== undefined) updatePayload.motherOrganization = input.motherOrganization || null;
    if (input.motherAnnualIncome !== undefined) updatePayload.motherAnnualIncome = input.motherAnnualIncome != null ? String(input.motherAnnualIncome) : null;
    if (input.presentAddress !== undefined) updatePayload.presentAddress = input.presentAddress || null;
    if (input.presentDistrict !== undefined) updatePayload.presentDistrict = input.presentDistrict || null;
    if (input.presentPincode !== undefined) updatePayload.presentPincode = input.presentPincode || null;
    if (input.presentState !== undefined) updatePayload.presentState = input.presentState || null;
    if (input.permanentAddress !== undefined) updatePayload.permanentAddress = input.permanentAddress || null;
    if (input.permanentDistrict !== undefined) updatePayload.permanentDistrict = input.permanentDistrict || null;
    if (input.permanentPincode !== undefined) updatePayload.permanentPincode = input.permanentPincode || null;
    if (input.permanentState !== undefined) updatePayload.permanentState = input.permanentState || null;
    if (input.academicHistory !== undefined) updatePayload.academicHistory = input.academicHistory || null;
    if (input.entranceMeritScore !== undefined) {
      updatePayload.entranceMeritScore = !isNaN(input.entranceMeritScore)
        ? input.entranceMeritScore.toFixed(2)
        : "0.00";
    }
    if (input.quotaCategory !== undefined) updatePayload.quotaCategory = input.quotaCategory;
    if (input.status !== undefined) updatePayload.status = input.status;
    if (input.notes !== undefined) updatePayload.notes = input.notes || null;

    const [updated] = await db
      .update(nursingApplicants)
      .set(updatePayload)
      .where(eq(nursingApplicants.id, id))
      .returning()
      .execute();

    if (!updated) {
      return c.json({ error: "Applicant not found" }, 404);
    }

    const session = c.get("session");
    await db.insert(nursingAuditLogs).values({
      entity: "nursing_applicants",
      entityId: String(id),
      action: "UPDATE",
      changedBy: session?.user?.id,
      diff: updated,
    }).execute();

    return c.json(updated);
  })

  // Record Seat Booking Advance Payment for an Applicant
  .post("/nursing/applicants/:id/seat-booking", async (c) => {
    const applicantId = Number(c.req.param("id"));
    const input = await jsonBody(
      c,
      z.object({
        amount: z.number().positive("Seat booking advance amount must be greater than 0"),
        paymentMode: z.enum(["cash", "bank_transfer", "upi", "card", "cheque"]).default("cash"),
        paymentDate: z.string().default(() => new Date().toISOString().split("T")[0]),
        notes: z.string().optional().nullable(),
      })
    );

    const [applicant] = await db
      .select({
        id: nursingApplicants.id,
        applicationNo: nursingApplicants.applicationNo,
        name: nursingApplicants.name,
        courseId: nursingApplicants.courseId,
        courseName: nursingCourses.name,
        academicYear: nursingApplicants.academicYear,
        status: nursingApplicants.status,
        seatBookingStatus: nursingApplicants.seatBookingStatus,
        seatBookingAmount: nursingApplicants.seatBookingAmount,
      })
      .from(nursingApplicants)
      .leftJoin(nursingCourses, eq(nursingApplicants.courseId, nursingCourses.id))
      .where(eq(nursingApplicants.id, applicantId))
      .execute();

    if (!applicant) {
      return c.json({ error: "Applicant not found" }, 404);
    }

    if (applicant.status === "rejected") {
      return c.json({ error: "Cannot record seat booking for a rejected application." }, 400);
    }

    const currentYear = new Date().getFullYear();
    const invoiceNo = code(`INV-ADV-${currentYear}`);
    const receiptNumber = code(`RCP-ADV-${currentYear}`);
    const session = c.get("session");

    // Check if applicant is already converted to a student
    const [existingStudent] = await db
      .select({ id: nursingStudents.id })
      .from(nursingStudents)
      .where(eq(nursingStudents.applicantId, applicantId))
      .execute();

    // 1. Record in nursingFeeTransactions
    const [tx] = await db
      .insert(nursingFeeTransactions)
      .values({
        studentId: existingStudent?.id ?? null,
        applicantId: applicant.id,
        feeType: "Seat Booking Advance",
        paymentFrequency: "one_time",
        invoiceNo,
        receiptNumber,
        amount: input.amount.toFixed(2),
        paymentMode: input.paymentMode,
        paymentDate: input.paymentDate,
        status: "paid",
        remarks: JSON.stringify({
          isSeatBookingAdvance: true,
          applicationNo: applicant.applicationNo,
          applicantName: applicant.name,
          courseName: applicant.courseName,
          academicYear: applicant.academicYear,
          notes: input.notes ?? null,
        }),
        collectedBy: session?.user?.id,
      })
      .returning()
      .execute();

    // 2. Update nursingApplicants
    const [updatedApplicant] = await db
      .update(nursingApplicants)
      .set({
        seatBookingAmount: input.amount.toFixed(2),
        seatBookingStatus: "unadjusted",
        seatBookingReceiptNo: receiptNumber,
        seatBookingDate: input.paymentDate,
        seatBookingPaymentMode: input.paymentMode,
        seatBookingNotes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(nursingApplicants.id, applicantId))
      .returning()
      .execute();

    await db.insert(nursingAuditLogs).values({
      entity: "nursing_applicants",
      entityId: String(applicantId),
      action: "BOOK_SEAT_ADVANCE",
      changedBy: session?.user?.id,
      diff: { amount: input.amount, receiptNumber, paymentMode: input.paymentMode },
    }).execute();

    return c.json({
      transaction: tx,
      applicant: updatedApplicant,
    }, 201);
  })

  // Get Next Suggested Sequential Enrollment Number
  .get("/nursing/next-enrollment-no", async (c) => {
    const batchId = c.req.query("batchId");
    let batchStartYear = String(new Date().getFullYear());
    if (batchId) {
      const [batch] = await db.select().from(nursingBatches).where(eq(nursingBatches.id, Number(batchId))).execute();
      if (batch) {
        batchStartYear = batch.academicYear
          ? batch.academicYear.split(/[-/]/)[0].trim()
          : batch.startDate
          ? batch.startDate.slice(0, 4)
          : String(new Date().getFullYear());
      }
    }
    const enrollmentNo = await generateNextEnrollmentNo(batchStartYear);
    return c.json({ enrollmentNo });
  })

  // Transactionally Convert Applicant to Student
  .post("/nursing/applicants/:id/convert-to-student", async (c) => {
    const applicantId = Number(c.req.param("id"));
    const { batchId, enrollmentNo: userEnrollmentNo, guardianName, guardianPhone, guardianRelation } = await jsonBody(
      c,
      z.object({
        batchId: z.number().int().positive(),
        enrollmentNo: z.string().optional().nullable(),
        guardianName: z.string().optional().nullable(),
        guardianPhone: z.string().optional().nullable(),
        guardianRelation: z.string().optional().nullable(),
      })
    );

    const [applicant] = await db.select().from(nursingApplicants).where(eq(nursingApplicants.id, applicantId)).execute();
    if (!applicant) {
      return c.json({ error: "Applicant not found" }, 404);
    }
    if (applicant.status === "converted") {
      return c.json({ error: "Applicant is already converted to student" }, 400);
    }

    // Check batch seat capacity
    const [batch] = await db.select().from(nursingBatches).where(eq(nursingBatches.id, batchId)).execute();
    if (!batch) {
      return c.json({ error: "Selected batch not found" }, 404);
    }

    const currentEnrolledCount = await db
      .select({ val: count() })
      .from(nursingStudents)
      .where(eq(nursingStudents.batchId, batchId))
      .then(res => res[0]?.val ?? 0);

    if (currentEnrolledCount >= batch.maxSeats) {
      return c.json({ error: `Batch maximum seat capacity (${batch.maxSeats}) reached.` }, 400);
    }

    const batchStartYear = batch.academicYear
      ? batch.academicYear.split(/[-/]/)[0].trim()
      : batch.startDate
      ? batch.startDate.slice(0, 4)
      : String(new Date().getFullYear());

    let finalEnrollmentNo = (userEnrollmentNo || "").trim();
    if (finalEnrollmentNo) {
      // User provided custom enrollment number -> verify uniqueness
      const [existingStudent] = await db
        .select({ id: nursingStudents.id })
        .from(nursingStudents)
        .where(sql`LOWER(${nursingStudents.enrollmentNo}) = LOWER(${finalEnrollmentNo})`)
        .execute();

      if (existingStudent) {
        return c.json({ error: `Enrollment number "${finalEnrollmentNo}" is already in use. Please provide a unique enrollment number.` }, 400);
      }
    } else {
      // Default to next auto sequence
      finalEnrollmentNo = await generateNextEnrollmentNo(batchStartYear);
    }

    const admissionDate = new Date().toISOString().split("T")[0];

    // Transactional conversion
    const [student] = await db
      .insert(nursingStudents)
      .values({
        applicantId: applicant.id,
        batchId,
        enrollmentNo: finalEnrollmentNo,
        name: applicant.name,
        email: applicant.email,
        phone: applicant.phone,
        aadharNo: applicant.aadharNo,
        gender: applicant.gender,
        dob: applicant.dob,
        address: applicant.address,
        fatherName: applicant.fatherName,
        fatherPhone: applicant.fatherPhone,
        fatherAadharNo: applicant.fatherAadharNo,
        fatherOccupation: applicant.fatherOccupation,
        fatherOrganization: applicant.fatherOrganization,
        fatherAnnualIncome: applicant.fatherAnnualIncome,
        motherName: applicant.motherName,
        motherPhone: applicant.motherPhone,
        motherAadharNo: applicant.motherAadharNo,
        motherOccupation: applicant.motherOccupation,
        motherOrganization: applicant.motherOrganization,
        motherAnnualIncome: applicant.motherAnnualIncome,
        presentAddress: applicant.presentAddress,
        presentDistrict: applicant.presentDistrict,
        presentPincode: applicant.presentPincode,
        presentState: applicant.presentState,
        permanentAddress: applicant.permanentAddress,
        permanentDistrict: applicant.permanentDistrict,
        permanentPincode: applicant.permanentPincode,
        permanentState: applicant.permanentState,
        academicHistory: applicant.academicHistory,
        guardianName: guardianName ?? (applicant.fatherName || applicant.motherName || null),
        guardianPhone: guardianPhone ?? (applicant.fatherPhone || applicant.motherPhone || applicant.phone || null),
        guardianRelation: guardianRelation ?? "Parent",
        status: "active",
        admissionDate,
      })
      .returning()
      .execute();

    // Link student documents from applicant if any
    await db
      .update(nursingStudentDocuments)
      .set({ studentId: student.id })
      .where(eq(nursingStudentDocuments.applicantId, applicant.id))
      .execute();

    // Link any fee transactions (e.g. seat booking advance) from applicant to student
    await db
      .update(nursingFeeTransactions)
      .set({ studentId: student.id })
      .where(eq(nursingFeeTransactions.applicantId, applicant.id))
      .execute();

    // Mark applicant status as converted
    await db
      .update(nursingApplicants)
      .set({ status: "converted", updatedAt: new Date() })
      .where(eq(nursingApplicants.id, applicant.id))
      .execute();

    const session = c.get("session");
    await db.insert(nursingAuditLogs).values({
      entity: "nursing_students",
      entityId: String(student.id),
      action: "CONVERT_TO_STUDENT",
      changedBy: session?.user?.id,
      diff: { applicantId: applicant.id, studentId: student.id, enrollmentNo: finalEnrollmentNo },
    }).execute();

    return c.json(student, 201);
  })

  // -------------------------------------------------------------------------
  // Student Master & Profile
  // -------------------------------------------------------------------------
  .get("/nursing/students", async (c) => {
    const batchId = c.req.query("batchId");
    const courseId = c.req.query("courseId");
    const status = c.req.query("status");
    const gender = c.req.query("gender");
    const search = c.req.query("search")?.trim().toLowerCase();
    const academicYear = c.req.query("academicYear");
    const pageParam = c.req.query("page");
    const pageSizeParam = c.req.query("pageSize");

    const rows = await db
      .select({
        id: nursingStudents.id,
        applicantId: nursingStudents.applicantId,
        enrollmentNo: nursingStudents.enrollmentNo,
        name: nursingStudents.name,
        email: nursingStudents.email,
        phone: nursingStudents.phone,
        aadharNo: nursingStudents.aadharNo,
        gender: nursingStudents.gender,
        dob: nursingStudents.dob,
        address: nursingStudents.address,
        fatherName: nursingStudents.fatherName,
        fatherPhone: nursingStudents.fatherPhone,
        fatherAadharNo: nursingStudents.fatherAadharNo,
        fatherOccupation: nursingStudents.fatherOccupation,
        fatherOrganization: nursingStudents.fatherOrganization,
        fatherAnnualIncome: nursingStudents.fatherAnnualIncome,
        motherName: nursingStudents.motherName,
        motherPhone: nursingStudents.motherPhone,
        motherAadharNo: nursingStudents.motherAadharNo,
        motherOccupation: nursingStudents.motherOccupation,
        motherOrganization: nursingStudents.motherOrganization,
        motherAnnualIncome: nursingStudents.motherAnnualIncome,
        presentAddress: nursingStudents.presentAddress,
        presentDistrict: nursingStudents.presentDistrict,
        presentPincode: nursingStudents.presentPincode,
        presentState: nursingStudents.presentState,
        permanentAddress: nursingStudents.permanentAddress,
        permanentDistrict: nursingStudents.permanentDistrict,
        permanentPincode: nursingStudents.permanentPincode,
        permanentState: nursingStudents.permanentState,
        academicHistory: nursingStudents.academicHistory,
        guardianName: nursingStudents.guardianName,
        guardianPhone: nursingStudents.guardianPhone,
        guardianRelation: nursingStudents.guardianRelation,
        status: nursingStudents.status,
        batchId: nursingStudents.batchId,
        academicYear: nursingBatches.academicYear,
        section: nursingBatches.section,
        courseId: nursingBatches.courseId,
        courseName: nursingCourses.name,
        admissionDate: nursingStudents.admissionDate,
        applicationNo: nursingApplicants.applicationNo,
        quotaCategory: nursingApplicants.quotaCategory,
        entranceMeritScore: nursingApplicants.entranceMeritScore,
        applicantNotes: nursingApplicants.notes,
        seatBookingAmount: nursingApplicants.seatBookingAmount,
        seatBookingStatus: nursingApplicants.seatBookingStatus,
      })
      .from(nursingStudents)
      .leftJoin(nursingBatches, eq(nursingStudents.batchId, nursingBatches.id))
      .leftJoin(nursingCourses, eq(nursingBatches.courseId, nursingCourses.id))
      .leftJoin(nursingApplicants, eq(nursingStudents.applicantId, nursingApplicants.id))
      .orderBy(desc(nursingStudents.id))
      .execute();

    let filtered = rows;
    if (batchId && batchId !== "all" && batchId !== "0") filtered = filtered.filter(r => r.batchId === Number(batchId));
    if (courseId && courseId !== "all" && courseId !== "0") filtered = filtered.filter(r => r.courseId === Number(courseId));
    if (status && status !== "all") filtered = filtered.filter(r => r.status === status);
    if (gender && gender !== "all") filtered = filtered.filter(r => (r.gender || "").toLowerCase() === gender.toLowerCase());
    if (academicYear && academicYear !== "all") filtered = filtered.filter(r => r.academicYear === academicYear);
    if (search) {
      filtered = filtered.filter(r =>
        (r.name || "").toLowerCase().includes(search) ||
        (r.enrollmentNo || "").toLowerCase().includes(search) ||
        (r.email || "").toLowerCase().includes(search) ||
        (r.phone || "").toLowerCase().includes(search) ||
        (r.aadharNo || "").toLowerCase().includes(search) ||
        (r.applicationNo || "").toLowerCase().includes(search) ||
        (r.fatherName || "").toLowerCase().includes(search) ||
        (r.motherName || "").toLowerCase().includes(search)
      );
    }

    if (pageParam !== undefined || pageSizeParam !== undefined) {
      const page = Math.max(1, Number(pageParam) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(pageSizeParam) || 10));
      const totalRecords = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
      const safePage = Math.min(page, totalPages);
      const offset = (safePage - 1) * pageSize;
      const paginatedRows = filtered.slice(offset, offset + pageSize);

      return c.json({
        data: paginatedRows,
        pagination: {
          page: safePage,
          pageSize,
          totalRecords,
          totalPages,
        },
      });
    }

    return c.json(filtered);
  })

  .get("/nursing/students/:id", async (c) => {
    const id = Number(c.req.param("id"));

    const [student] = await db
      .select({
        id: nursingStudents.id,
        applicantId: nursingStudents.applicantId,
        batchId: nursingStudents.batchId,
        enrollmentNo: nursingStudents.enrollmentNo,
        name: nursingStudents.name,
        email: nursingStudents.email,
        phone: nursingStudents.phone,
        aadharNo: nursingStudents.aadharNo,
        gender: nursingStudents.gender,
        dob: nursingStudents.dob,
        address: nursingStudents.address,
        fatherName: nursingStudents.fatherName,
        fatherPhone: nursingStudents.fatherPhone,
        fatherAadharNo: nursingStudents.fatherAadharNo,
        fatherOccupation: nursingStudents.fatherOccupation,
        fatherOrganization: nursingStudents.fatherOrganization,
        fatherAnnualIncome: nursingStudents.fatherAnnualIncome,
        motherName: nursingStudents.motherName,
        motherPhone: nursingStudents.motherPhone,
        motherAadharNo: nursingStudents.motherAadharNo,
        motherOccupation: nursingStudents.motherOccupation,
        motherOrganization: nursingStudents.motherOrganization,
        motherAnnualIncome: nursingStudents.motherAnnualIncome,
        presentAddress: nursingStudents.presentAddress,
        presentDistrict: nursingStudents.presentDistrict,
        presentPincode: nursingStudents.presentPincode,
        presentState: nursingStudents.presentState,
        permanentAddress: nursingStudents.permanentAddress,
        permanentDistrict: nursingStudents.permanentDistrict,
        permanentPincode: nursingStudents.permanentPincode,
        permanentState: nursingStudents.permanentState,
        academicHistory: nursingStudents.academicHistory,
        guardianName: nursingStudents.guardianName,
        guardianPhone: nursingStudents.guardianPhone,
        guardianRelation: nursingStudents.guardianRelation,
        status: nursingStudents.status,
        admissionDate: nursingStudents.admissionDate,
        createdAt: nursingStudents.createdAt,
        updatedAt: nursingStudents.updatedAt,
        batchYear: nursingBatches.academicYear,
        batchSection: nursingBatches.section,
        courseId: nursingBatches.courseId,
        courseName: nursingCourses.name,
        courseCode: nursingCourses.code,
        applicationNo: nursingApplicants.applicationNo,
        entranceMeritScore: nursingApplicants.entranceMeritScore,
        quotaCategory: nursingApplicants.quotaCategory,
        applicantNotes: nursingApplicants.notes,
        seatBookingAmount: nursingApplicants.seatBookingAmount,
        seatBookingStatus: nursingApplicants.seatBookingStatus,
        seatBookingReceiptNo: nursingApplicants.seatBookingReceiptNo,
        seatBookingDate: nursingApplicants.seatBookingDate,
        seatBookingPaymentMode: nursingApplicants.seatBookingPaymentMode,
        seatBookingNotes: nursingApplicants.seatBookingNotes,
      })
      .from(nursingStudents)
      .leftJoin(nursingBatches, eq(nursingStudents.batchId, nursingBatches.id))
      .leftJoin(nursingCourses, eq(nursingBatches.courseId, nursingCourses.id))
      .leftJoin(nursingApplicants, eq(nursingStudents.applicantId, nursingApplicants.id))
      .where(eq(nursingStudents.id, id))
      .execute();

    if (!student) {
      return c.json({ error: "Student not found" }, 404);
    }

    const documents = await db.select().from(nursingStudentDocuments).where(eq(nursingStudentDocuments.studentId, id)).execute();
    const feeTransactions = await db.select().from(nursingFeeTransactions).where(eq(nursingFeeTransactions.studentId, id)).orderBy(desc(nursingFeeTransactions.id)).execute();
    const attendanceRecords = await db.select().from(nursingAttendanceRecords).where(eq(nursingAttendanceRecords.studentId, id)).orderBy(desc(nursingAttendanceRecords.sessionDate)).execute();

    const totalSessions = attendanceRecords.length;
    const presentSessions = attendanceRecords.filter(r => r.status === "present").length;
    const attendancePercent = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

    return c.json({
      ...student,
      documents,
      feeTransactions,
      attendanceRecords,
      attendanceStats: {
        totalSessions,
        presentSessions,
        attendancePercent,
      },
    });
  })

  .patch("/nursing/students/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const input = await jsonBody(
      c,
      z.object({
        name: z.string().min(1).optional(),
        email: z.string().optional().nullable().transform((v) => v?.trim() || ""),
        phone: z.string().min(1).optional(),
        aadharNo: z.string().nullable().optional(),
        gender: z.string().optional(),
        dob: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        fatherName: z.string().nullable().optional(),
        fatherPhone: z.string().nullable().optional(),
        fatherAadharNo: z.string().nullable().optional(),
        fatherOccupation: z.string().nullable().optional(),
        fatherOrganization: z.string().nullable().optional(),
        fatherAnnualIncome: z.union([z.string(), z.number()]).nullable().optional(),
        motherName: z.string().nullable().optional(),
        motherPhone: z.string().nullable().optional(),
        motherAadharNo: z.string().nullable().optional(),
        motherOccupation: z.string().nullable().optional(),
        motherOrganization: z.string().nullable().optional(),
        motherAnnualIncome: z.union([z.string(), z.number()]).nullable().optional(),
        presentAddress: z.string().nullable().optional(),
        presentDistrict: z.string().nullable().optional(),
        presentPincode: z.string().nullable().optional(),
        presentState: z.string().nullable().optional(),
        permanentAddress: z.string().nullable().optional(),
        permanentDistrict: z.string().nullable().optional(),
        permanentPincode: z.string().nullable().optional(),
        permanentState: z.string().nullable().optional(),
        academicHistory: z.any().optional(),
        guardianName: z.string().nullable().optional(),
        guardianPhone: z.string().nullable().optional(),
        guardianRelation: z.string().nullable().optional(),
        batchId: z.coerce.number().optional(),
        status: z.enum(["active", "promoted", "graduated", "dropped", "transferred"]).optional(),
        admissionDate: z.string().nullable().optional(),
        enrollmentNo: z.string().min(1).optional(),
        quotaCategory: z.enum(["general", "reserved", "management"]).optional(),
        entranceMeritScore: z.union([z.string(), z.number()]).optional(),
        applicantNotes: z.string().nullable().optional(),
      })
    );

    const [existing] = await db
      .select()
      .from(nursingStudents)
      .where(eq(nursingStudents.id, id))
      .execute();

    if (!existing) {
      return c.json({ error: "Student not found" }, 404);
    }

    if (input.enrollmentNo) {
      const trimmed = input.enrollmentNo.trim();
      const [duplicate] = await db
        .select({ id: nursingStudents.id })
        .from(nursingStudents)
        .where(
          and(
            sql`LOWER(${nursingStudents.enrollmentNo}) = LOWER(${trimmed})`,
            ne(nursingStudents.id, id)
          )
        )
        .execute();

      if (duplicate) {
        return c.json({ error: `Enrollment number "${trimmed}" is already assigned to another student.` }, 400);
      }
      input.enrollmentNo = trimmed;
    }

    const { quotaCategory, entranceMeritScore, applicantNotes, ...studentFields } = input;

    const [updated] = await db
      .update(nursingStudents)
      .set({
        ...studentFields,
        updatedAt: new Date(),
      })
      .where(eq(nursingStudents.id, id))
      .returning()
      .execute();

    if (existing.applicantId && (quotaCategory !== undefined || entranceMeritScore !== undefined || applicantNotes !== undefined)) {
      const applicantUpdates: any = {};
      if (quotaCategory !== undefined) applicantUpdates.quotaCategory = quotaCategory;
      if (entranceMeritScore !== undefined) applicantUpdates.entranceMeritScore = String(entranceMeritScore);
      if (applicantNotes !== undefined) applicantUpdates.notes = applicantNotes;
      applicantUpdates.updatedAt = new Date();

      await db
        .update(nursingApplicants)
        .set(applicantUpdates)
        .where(eq(nursingApplicants.id, existing.applicantId))
        .execute();
    }

    return c.json(updated);
  })

  // Documents Endpoint
  .post("/nursing/students/:id/documents", async (c) => {
    const studentId = Number(c.req.param("id"));
    const input = await jsonBody(
      c,
      z.object({
        documentType: z.string().min(1),
        title: z.string().min(1),
        fileUrl: z.string().min(1),
      })
    );

    const [doc] = await db
      .insert(nursingStudentDocuments)
      .values({
        studentId,
        ...input,
        verificationStatus: "pending",
      })
      .returning()
      .execute();

    return c.json(doc, 201);
  })

  .patch("/nursing/documents/:id/verify", async (c) => {
    const id = Number(c.req.param("id"));
    const { verificationStatus } = await jsonBody(
      c,
      z.object({
        verificationStatus: z.enum(["verified", "rejected"]),
      })
    );

    const session = c.get("session");
    const [updated] = await db
      .update(nursingStudentDocuments)
      .set({
        verificationStatus,
        verifiedBy: session?.user?.id,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(nursingStudentDocuments.id, id))
      .returning()
      .execute();

    return c.json(updated);
  })

  // -------------------------------------------------------------------------
  // Fee Structures & Transactions
  // -------------------------------------------------------------------------
  .get("/nursing/fees/structures", async (c) => {
    const rows = await db
      .select({
        id: nursingFeeStructures.id,
        courseId: nursingFeeStructures.courseId,
        courseName: nursingCourses.name,
        quotaCategory: nursingFeeStructures.quotaCategory,
        academicYear: nursingFeeStructures.academicYear,
        feeType: nursingFeeStructures.feeType,
        paymentFrequency: nursingFeeStructures.paymentFrequency,
        oneTimeRebatePercent: nursingFeeStructures.oneTimeRebatePercent,
        tuitionFee: nursingFeeStructures.tuitionFee,
        admissionFee: nursingFeeStructures.admissionFee,
        securityDeposit: nursingFeeStructures.securityDeposit,
        uniformFee: nursingFeeStructures.uniformFee,
        hostelFee: nursingFeeStructures.hostelFee,
        hostelMessMonthlyFee: nursingFeeStructures.hostelMessMonthlyFee,
        examFee: nursingFeeStructures.examFee,
        miscFee: nursingFeeStructures.miscFee,
        rebatesConfig: nursingFeeStructures.rebatesConfig,
        surchargesConfig: nursingFeeStructures.surchargesConfig,
        componentsConfig: nursingFeeStructures.componentsConfig,
        totalAmount: nursingFeeStructures.totalAmount,
      })
      .from(nursingFeeStructures)
      .leftJoin(nursingCourses, eq(nursingFeeStructures.courseId, nursingCourses.id))
      .orderBy(desc(nursingFeeStructures.id))
      .execute();
    return c.json(rows);
  })

  .post("/nursing/fees/structures", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        courseId: z.number().int().positive(),
        quotaCategory: z.string().default("general"),
        academicYear: z.string().min(1).default(() => { const y = new Date().getFullYear(); return `${y}-${y + 4}`; }),
        feeType: z.string().min(1).default("Composite Course Fee"),
        paymentFrequency: z.string().default("yearly"),
        oneTimeRebatePercent: z.number().min(0).max(100).default(10),
        totalAnnualFees: z.number().min(0).optional(),
        tuitionFee: z.number().min(0).default(0),
        admissionFee: z.number().min(0).default(0),
        securityDeposit: z.number().min(0).default(0),
        uniformFee: z.number().min(0).default(0),
        hostelFee: z.number().min(0).default(0),
        hostelMessMonthlyFee: z.number().min(0).default(0),
        examFee: z.number().min(0).default(0),
        miscFee: z.number().min(0).default(0),
        rebatesConfig: z.string().optional(),
        surchargesConfig: z.string().optional(),
        componentsConfig: z.string().optional(),
        totalAmount: z.union([z.number(), z.string()]).optional(),
      })
    );

    // Duplicate check for (courseId, academicYear, quotaCategory)
    const existing = await db
      .select({ id: nursingFeeStructures.id })
      .from(nursingFeeStructures)
      .where(
        and(
          eq(nursingFeeStructures.courseId, input.courseId),
          eq(nursingFeeStructures.academicYear, input.academicYear),
          eq(nursingFeeStructures.quotaCategory, input.quotaCategory)
        )
      )
      .execute();

    if (existing.length > 0) {
      return c.json(
        { error: `A fee structure for this course program, academic batch (${input.academicYear}), and quota category already exists.` },
        400
      );
    }

    const calculatedAnnualTotal =
      input.tuitionFee +
      input.admissionFee +
      input.securityDeposit +
      input.uniformFee +
      input.hostelFee +
      (input.hostelMessMonthlyFee * 12) +
      input.examFee +
      input.miscFee;

    const totalAnnual = input.totalAmount != null
      ? Number(input.totalAmount)
      : input.totalAnnualFees && input.totalAnnualFees > 0
      ? input.totalAnnualFees
      : calculatedAnnualTotal;

    const rebatePercent = input.oneTimeRebatePercent ?? 10;

    try {
      const [row] = await db
        .insert(nursingFeeStructures)
        .values({
          courseId: input.courseId,
          quotaCategory: input.quotaCategory,
          academicYear: input.academicYear,
          feeType: input.feeType,
          paymentFrequency: input.paymentFrequency,
          oneTimeRebatePercent: rebatePercent.toFixed(2),
          tuitionFee: input.tuitionFee.toFixed(2),
          admissionFee: input.admissionFee.toFixed(2),
          securityDeposit: input.securityDeposit.toFixed(2),
          uniformFee: input.uniformFee.toFixed(2),
          hostelFee: input.hostelFee.toFixed(2),
          hostelMessMonthlyFee: input.hostelMessMonthlyFee.toFixed(2),
          examFee: input.examFee.toFixed(2),
          miscFee: input.miscFee.toFixed(2),
          rebatesConfig: input.rebatesConfig || null,
          surchargesConfig: input.surchargesConfig || null,
          componentsConfig: input.componentsConfig || null,
          totalAmount: totalAnnual.toFixed(2),
        })
        .returning()
        .execute();

      return c.json(row, 201);
    } catch (err: any) {
      if (err.code === "23505" || err.message?.includes("unique") || err.message?.includes("duplicate")) {
        return c.json(
          { error: `A fee structure for this course program, academic batch (${input.academicYear}), and quota category already exists.` },
          400
        );
      }
      return c.json({ error: err.message || "Failed to create fee structure" }, 500);
    }
  })

  .put("/nursing/fees/structures/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    if (!id || isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const input = await jsonBody(
      c,
      z.object({
        courseId: z.number().int().positive().optional(),
        quotaCategory: z.string().optional(),
        academicYear: z.string().optional(),
        feeType: z.string().optional(),
        paymentFrequency: z.string().optional(),
        oneTimeRebatePercent: z.number().min(0).max(100).optional(),
        totalAnnualFees: z.number().min(0).optional(),
        totalAmount: z.union([z.number(), z.string()]).optional(),
        tuitionFee: z.number().min(0).optional(),
        admissionFee: z.number().min(0).optional(),
        securityDeposit: z.number().min(0).optional(),
        uniformFee: z.number().min(0).optional(),
        hostelFee: z.number().min(0).optional(),
        hostelMessMonthlyFee: z.number().min(0).optional(),
        examFee: z.number().min(0).optional(),
        miscFee: z.number().min(0).optional(),
        rebatesConfig: z.string().optional(),
        surchargesConfig: z.string().optional(),
        componentsConfig: z.string().optional(),
      })
    );

    if (input.courseId || input.academicYear || input.quotaCategory) {
      const current = await db
        .select({
          courseId: nursingFeeStructures.courseId,
          academicYear: nursingFeeStructures.academicYear,
          quotaCategory: nursingFeeStructures.quotaCategory,
        })
        .from(nursingFeeStructures)
        .where(eq(nursingFeeStructures.id, id))
        .execute();

      if (current.length > 0) {
        const cId = input.courseId ?? current[0].courseId;
        const aYear = input.academicYear ?? current[0].academicYear;
        const qCat = input.quotaCategory ?? current[0].quotaCategory;

        const existing = await db
          .select({ id: nursingFeeStructures.id })
          .from(nursingFeeStructures)
          .where(
            and(
              ne(nursingFeeStructures.id, id),
              eq(nursingFeeStructures.courseId, cId),
              eq(nursingFeeStructures.academicYear, aYear),
              eq(nursingFeeStructures.quotaCategory, qCat)
            )
          )
          .execute();

        if (existing.length > 0) {
          return c.json(
            { error: `A fee structure for this course program, academic batch (${aYear}), and quota category already exists.` },
            400
          );
        }
      }
    }

    const tuition = input.tuitionFee ?? 0;
    const admission = input.admissionFee ?? 0;
    const deposit = input.securityDeposit ?? 0;
    const uniform = input.uniformFee ?? 0;
    const hostel = input.hostelFee ?? 0;
    const hostelMessMonthly = input.hostelMessMonthlyFee ?? 0;
    const exam = input.examFee ?? 0;
    const misc = input.miscFee ?? 0;

    const calculatedTotal =
      tuition + admission + deposit + uniform + hostel + (hostelMessMonthly * 12) + exam + misc;

    const totalAnnual = input.totalAmount != null
      ? Number(input.totalAmount)
      : input.totalAnnualFees && input.totalAnnualFees > 0
      ? input.totalAnnualFees
      : calculatedTotal;

    try {
      const [row] = await db
        .update(nursingFeeStructures)
        .set({
          ...(input.courseId ? { courseId: input.courseId } : {}),
          ...(input.quotaCategory ? { quotaCategory: input.quotaCategory } : {}),
          ...(input.academicYear ? { academicYear: input.academicYear } : {}),
          ...(input.feeType ? { feeType: input.feeType } : {}),
          ...(input.paymentFrequency ? { paymentFrequency: input.paymentFrequency } : {}),
          ...(input.oneTimeRebatePercent !== undefined ? { oneTimeRebatePercent: input.oneTimeRebatePercent.toFixed(2) } : {}),
          tuitionFee: tuition.toFixed(2),
          admissionFee: admission.toFixed(2),
          securityDeposit: deposit.toFixed(2),
          uniformFee: uniform.toFixed(2),
          hostelFee: hostel.toFixed(2),
          hostelMessMonthlyFee: hostelMessMonthly.toFixed(2),
          examFee: exam.toFixed(2),
          miscFee: misc.toFixed(2),
          ...(input.rebatesConfig !== undefined ? { rebatesConfig: input.rebatesConfig } : {}),
          ...(input.surchargesConfig !== undefined ? { surchargesConfig: input.surchargesConfig } : {}),
          ...(input.componentsConfig !== undefined ? { componentsConfig: input.componentsConfig } : {}),
          totalAmount: totalAnnual.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(nursingFeeStructures.id, id))
        .returning()
        .execute();

      if (!row) return c.json({ error: "Fee structure not found" }, 404);
      return c.json(row);
    } catch (err: any) {
      if (err.code === "23505" || err.message?.includes("unique") || err.message?.includes("duplicate")) {
        return c.json(
          { error: `A fee structure for this course program, academic batch, and quota category already exists.` },
          400
        );
      }
      return c.json({ error: err.message || "Failed to update fee structure" }, 500);
    }
  })

  .delete("/nursing/fees/structures/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!id || isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const [deleted] = await db
      .delete(nursingFeeStructures)
      .where(eq(nursingFeeStructures.id, id))
      .returning()
      .execute();

    if (!deleted) return c.json({ error: "Fee structure not found" }, 404);
    return c.json({ success: true, id });
  })

  .get("/nursing/students/:id/advance-balance", async (c) => {
    const studentId = Number(c.req.param("id"));
    if (!studentId || isNaN(studentId)) return c.json({ hasAdvance: false, advanceAmount: 0 });

    const [student] = await db
      .select({
        id: nursingStudents.id,
        applicantId: nursingStudents.applicantId,
        seatBookingAmount: nursingApplicants.seatBookingAmount,
        seatBookingStatus: nursingApplicants.seatBookingStatus,
        seatBookingReceiptNo: nursingApplicants.seatBookingReceiptNo,
        seatBookingDate: nursingApplicants.seatBookingDate,
        seatBookingPaymentMode: nursingApplicants.seatBookingPaymentMode,
      })
      .from(nursingStudents)
      .leftJoin(nursingApplicants, eq(nursingStudents.applicantId, nursingApplicants.id))
      .where(eq(nursingStudents.id, studentId))
      .execute();

    if (!student) {
      return c.json({ hasAdvance: false, advanceAmount: 0 }, 404);
    }

    const advanceAmt = toNum(student.seatBookingAmount);
    const isUnadjusted = student.seatBookingStatus === "unadjusted" && advanceAmt > 0;

    return c.json({
      hasAdvance: isUnadjusted,
      advanceAmount: isUnadjusted ? advanceAmt : 0,
      seatBookingStatus: student.seatBookingStatus || "none",
      receiptNumber: student.seatBookingReceiptNo || null,
      paymentDate: student.seatBookingDate || null,
      paymentMode: student.seatBookingPaymentMode || null,
      applicantId: student.applicantId || null,
    });
  })

  .get("/nursing/fees/transactions", async (c) => {
    const studentId = c.req.query("studentId");
    const paymentMode = c.req.query("paymentMode");
    const search = c.req.query("search")?.trim().toLowerCase() || "";
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const pageParam = c.req.query("page");
    const pageSizeParam = c.req.query("pageSize");

    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeParam) || 10));

    const rows = await db
      .select({
        id: nursingFeeTransactions.id,
        studentId: nursingFeeTransactions.studentId,
        applicantId: nursingFeeTransactions.applicantId,
        studentName: sql<string>`COALESCE(${nursingStudents.name}, ${nursingApplicants.name})`,
        enrollmentNo: sql<string>`COALESCE(${nursingStudents.enrollmentNo}, ${nursingApplicants.applicationNo})`,
        invoiceNo: nursingFeeTransactions.invoiceNo,
        receiptNumber: nursingFeeTransactions.receiptNumber,
        feeType: nursingFeeTransactions.feeType,
        paymentFrequency: nursingFeeTransactions.paymentFrequency,
        amount: nursingFeeTransactions.amount,
        paymentMode: nursingFeeTransactions.paymentMode,
        paymentDate: nursingFeeTransactions.paymentDate,
        status: nursingFeeTransactions.status,
        remarks: nursingFeeTransactions.remarks,
        createdAt: nursingFeeTransactions.createdAt,
      })
      .from(nursingFeeTransactions)
      .leftJoin(nursingStudents, eq(nursingFeeTransactions.studentId, nursingStudents.id))
      .leftJoin(nursingApplicants, eq(nursingFeeTransactions.applicantId, nursingApplicants.id))
      .orderBy(desc(nursingFeeTransactions.id))
      .execute();

    // High-level aggregate metrics across all transactions in system
    const totalTransactions = rows.length;
    const totalCollectedAmount = rows.reduce((sum, tx) => sum + toNum(tx.amount), 0);

    let filtered = rows;
    if (studentId && !isNaN(Number(studentId))) {
      filtered = filtered.filter(r => r.studentId === Number(studentId));
    }
    if (paymentMode && paymentMode !== "all") {
      filtered = filtered.filter(r => (r.paymentMode || "").toLowerCase() === paymentMode.toLowerCase());
    }
    if (startDate) {
      filtered = filtered.filter(r => (r.paymentDate || "") >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(r => (r.paymentDate || "") <= endDate);
    }
    if (search) {
      filtered = filtered.filter(r => {
        const studentName = (r.studentName || "").toLowerCase();
        const enrollmentNo = (r.enrollmentNo || "").toLowerCase();
        const receiptNo = (r.receiptNumber || "").toLowerCase();
        const invoiceNo = (r.invoiceNo || "").toLowerCase();
        const feeType = (r.feeType || "").toLowerCase();
        let remarksStr = "";
        if (typeof r.remarks === "string") {
          remarksStr = r.remarks.toLowerCase();
        } else if (r.remarks) {
          remarksStr = JSON.stringify(r.remarks).toLowerCase();
        }
        return (
          studentName.includes(search) ||
          enrollmentNo.includes(search) ||
          receiptNo.includes(search) ||
          invoiceNo.includes(search) ||
          feeType.includes(search) ||
          remarksStr.includes(search)
        );
      });
    }

    const filteredCollectedAmount = filtered.reduce((sum, tx) => sum + toNum(tx.amount), 0);
    const totalRecords = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;
    const paginatedRows = filtered.slice(offset, offset + pageSize);

    return c.json({
      transactions: paginatedRows,
      pagination: {
        page: safePage,
        pageSize,
        totalRecords,
        totalPages,
      },
      metrics: {
        totalTransactions,
        totalCollectedAmount,
        filteredCollectedAmount,
      },
    });
  })

  .get("/nursing/fees/student-frequencies", async (c) => {
    const studentId = c.req.query("studentId");
    const academicYear = c.req.query("academicYear") || getAcademicYear();
    if (!studentId || isNaN(Number(studentId))) return c.json([]);

    const rows = await db
      .select()
      .from(nursingStudentFeeFrequencies)
      .where(
        and(
          eq(nursingStudentFeeFrequencies.studentId, Number(studentId)),
          eq(nursingStudentFeeFrequencies.academicYear, academicYear)
        )
      )
      .execute();

    const sanitizedRows = rows.map((r) => {
      const count = Number(r.installmentCount || (r.frequencyKey === "monthly" ? 12 : r.frequencyKey === "quarterly" ? 4 : r.frequencyKey === "semester" ? 2 : 1));
      const baseAmt = toNum(r.baseAmount);
      const instAmt = toNum(r.installmentAmount);
      let safeInst = instAmt;
      if (count > 1 && baseAmt > 0 && instAmt > (baseAmt / count) * 1.5) {
        safeInst = Math.round((baseAmt / count) * 100) / 100;
      }
      return {
        ...r,
        installmentAmount: safeInst.toFixed(2),
        frequencyLabel: r.frequencyLabel ? r.frequencyLabel.replace(/\s*\(×\d+\)/, "") : r.frequencyLabel,
      };
    });

    return c.json(sanitizedRows);
  })

  .post("/nursing/fees/transactions", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        studentId: z.number().int().positive(),
        feeStructureId: z.number().int().positive().optional().nullable(),
        feeType: z.string().optional().nullable(),
        paymentFrequency: z.string().optional().nullable(),
        amount: z.number().min(0, "Payment amount cannot be negative"),
        paymentMode: z.enum(["cash", "bank_transfer", "upi", "card", "cheque"]).default("cash"),
        paymentDate: z.string().default(() => new Date().toISOString().split("T")[0]),
        remarks: z.string().optional().nullable(),
      })
    );

    // 1. Validate student exists and is active
    const [student] = await db
      .select()
      .from(nursingStudents)
      .where(eq(nursingStudents.id, input.studentId))
      .execute();

    if (!student) {
      return c.json({ error: "Student not found" }, 404);
    }

    if (student.status !== "active") {
      return c.json(
        { error: `Cannot record fee payment for a student with status '${student.status}'. Student must be active.` },
        400
      );
    }

    // 2. Validate payment date is reasonable (not > 7 days in future)
    const paymentDateObj = new Date(input.paymentDate + "T00:00:00");
    if (isNaN(paymentDateObj.getTime())) {
      return c.json({ error: "Invalid payment date format" }, 400);
    }
    const maxFutureDate = new Date();
    maxFutureDate.setDate(maxFutureDate.getDate() + 7);
    if (paymentDateObj.getTime() > maxFutureDate.getTime()) {
      return c.json({ error: "Payment date cannot be more than 7 days in the future." }, 400);
    }

    // 3. Parse remarks and validate discounts/advance adjustments/gross subtotals
    let parsedRemarks: any = null;
    if (input.remarks) {
      try {
        parsedRemarks = JSON.parse(input.remarks);
      } catch (e) {
        parsedRemarks = null;
      }
    }

    let advanceAdjustedAmount = 0;
    if (parsedRemarks && typeof parsedRemarks === "object") {
      const gross = Number(parsedRemarks.grossSubtotal || 0);
      const discount = Number(parsedRemarks.discountAmount || 0);
      const discountReason = (parsedRemarks.discountReason || "").trim();
      advanceAdjustedAmount = Number(parsedRemarks.advanceAdjustedAmount || 0);

      if (discount > 0) {
        if (!discountReason) {
          return c.json({ error: "A valid reason is required whenever a discount or fee concession is applied." }, 400);
        }
        if (gross > 0 && discount > gross) {
          return c.json(
            { error: `Discount amount (₹${discount.toLocaleString()}) cannot exceed the gross fee subtotal (₹${gross.toLocaleString()}).` },
            400
          );
        }
      }

      if (advanceAdjustedAmount > 0) {
        const remainingPayableBeforeAdvance = Math.max(0, gross - discount);
        if (gross > 0 && advanceAdjustedAmount > remainingPayableBeforeAdvance) {
          return c.json(
            { error: `Advance adjusted amount (₹${advanceAdjustedAmount.toLocaleString()}) cannot exceed remaining fee subtotal (₹${remainingPayableBeforeAdvance.toLocaleString()}).` },
            400
          );
        }
      }

      if (gross > 0) {
        const expectedNet = Math.max(0, gross - discount - advanceAdjustedAmount);
        if (Math.abs(expectedNet - input.amount) > 1) {
          return c.json(
            { error: `Payment amount (₹${input.amount.toLocaleString()}) does not match gross subtotal (₹${gross.toLocaleString()}) minus discount (₹${discount.toLocaleString()}) minus advance adjustment (₹${advanceAdjustedAmount.toLocaleString()}). Expected ₹${expectedNet.toLocaleString()}.` },
            400
          );
        }
      }

      // Validate that Hostel & Mess Fee cannot be clubbed with other fee components
      if (Array.isArray(parsedRemarks.breakdown) && parsedRemarks.breakdown.length > 1) {
        const isHostelComp = (name: string) => {
          const n = (name || "").toLowerCase();
          return n.includes("hostel") || n.includes("mess");
        };
        const hasHostel = parsedRemarks.breakdown.some((b: any) => isHostelComp(b.name));
        const hasNonHostel = parsedRemarks.breakdown.some((b: any) => !isHostelComp(b.name));
        if (hasHostel && hasNonHostel) {
          return c.json(
            { error: "Hostel & Mess Fee cannot be clubbed with any other fee payment. Please record hostel/mess fees as a separate transaction." },
            400
          );
        }
      }
      // 3.6 Validate duplicate period payments for the same academic year
      const targetAy = parsedRemarks.academicYear;
      const targetPeriods: string[] = Array.isArray(parsedRemarks.selectedPeriods)
        ? parsedRemarks.selectedPeriods
        : (parsedRemarks.billingPeriodValue ? [parsedRemarks.billingPeriodValue] : []);

      const isHostelTarget = (input.feeType || "").toLowerCase().includes("hostel") || (input.feeType || "").toLowerCase().includes("mess");

      if (targetPeriods.length > 0 && targetAy) {
        const studentPastTxs = await db
          .select({
            id: nursingFeeTransactions.id,
            receiptNumber: nursingFeeTransactions.receiptNumber,
            feeType: nursingFeeTransactions.feeType,
            status: nursingFeeTransactions.status,
            remarks: nursingFeeTransactions.remarks,
          })
          .from(nursingFeeTransactions)
          .where(
            and(
              eq(nursingFeeTransactions.studentId, input.studentId),
              ne(nursingFeeTransactions.status, "refunded")
            )
          )
          .execute();

        for (const pastTx of studentPastTxs) {
          const pastRemarks = parseRemarks(pastTx.remarks);
          if (!pastRemarks) continue;
          if (pastRemarks.academicYear && pastRemarks.academicYear !== targetAy) continue;

          const isHostelPast = (pastTx.feeType || "").toLowerCase().includes("hostel") || (pastTx.feeType || "").toLowerCase().includes("mess");
          if (isHostelTarget !== isHostelPast) {
            // One is hostel and the other is academic; different fee categories
            continue;
          }

          // Validate that period interval type cannot be changed mid-year for Course Fee if a prior Course Fee payment was already made
          const isTuitionName = (name: string) => {
            const n = (name || "").toLowerCase();
            return n.includes("course") || n.includes("tuition");
          };

          const targetHasCourseFee =
            isTuitionName(input.feeType || "") ||
            (Array.isArray(parsedRemarks.items) && parsedRemarks.items.some((i: any) => isTuitionName(i.name)));

          const pastHasCourseFee =
            isTuitionName(pastTx.feeType || "") ||
            (Array.isArray(pastRemarks.items) && pastRemarks.items.some((i: any) => isTuitionName(i.name)));

          const targetPeriodType = parsedRemarks.billingPeriodType;
          if (
            targetHasCourseFee &&
            pastHasCourseFee &&
            targetPeriodType &&
            pastRemarks.billingPeriodType &&
            pastRemarks.billingPeriodType !== targetPeriodType
          ) {
            return c.json(
              {
                error: `Period interval type cannot be changed from '${pastRemarks.billingPeriodType}' for AY ${targetAy} because prior Course Fee payments were already recorded under that schedule (Receipt: ${pastTx.receiptNumber}).`
              },
              400
            );
          }

          const pastPeriods: string[] = [];
          if (Array.isArray(pastRemarks.selectedPeriods)) {
            pastRemarks.selectedPeriods.forEach((p: any) => {
              if (typeof p === "string") pastPeriods.push(p.trim().toLowerCase());
            });
          }
          const pastBpVal = (pastRemarks.billingPeriodValue || "").trim();
          if (pastBpVal) {
            const clean = pastBpVal.replace(/\s*\(\d+[^)]*\)/g, "");
            clean.split(",").forEach((s: string) => {
              if (s.trim()) pastPeriods.push(s.trim().toLowerCase());
            });
          }

          for (const reqPeriod of targetPeriods) {
            const reqClean = reqPeriod.replace(/\s*\(\d+[^)]*\)/g, "").toLowerCase().trim();
            if (pastPeriods.includes(reqClean) || pastPeriods.includes(reqPeriod.toLowerCase().trim())) {
              return c.json(
                {
                  error: `Duplicate payment error: '${reqPeriod}' has already been paid for AY ${targetAy} in receipt ${pastTx.receiptNumber}. Duplicate payments for the same period are not allowed.`
                },
                400
              );
            }
          }
        }
      }
    }

    // 4. Duplicate payment prevention (idempotency check within last 2 minutes)
    const recentDuplicates = await db
      .select({ id: nursingFeeTransactions.id, receiptNumber: nursingFeeTransactions.receiptNumber })
      .from(nursingFeeTransactions)
      .where(
        and(
          eq(nursingFeeTransactions.studentId, input.studentId),
          eq(nursingFeeTransactions.feeType, input.feeType ?? "Course Fee"),
          ...(input.feeStructureId ? [eq(nursingFeeTransactions.feeStructureId, input.feeStructureId)] : []),
          eq(nursingFeeTransactions.amount, input.amount.toFixed(2)),
        )
      )
      .execute();

    if (recentDuplicates.length > 0) {
      return c.json(
        {
          error: `Duplicate payment detected. An identical payment of ₹${input.amount.toLocaleString()} was already recorded moments ago (Receipt: ${recentDuplicates[0].receiptNumber}).`
        },
        400
      );
    }

    const currentYear = new Date().getFullYear();
    const invoiceNo = code(`INV-${currentYear}`);
    const receiptNumber = code(`RCP-${currentYear}`);
    const session = c.get("session");

    const [tx] = await db
      .insert(nursingFeeTransactions)
      .values({
        studentId: input.studentId,
        applicantId: student.applicantId ?? null,
        feeStructureId: input.feeStructureId ?? null,
        feeType: input.feeType ?? "Course Fee",
        paymentFrequency: input.paymentFrequency ?? "yearly",
        invoiceNo,
        receiptNumber,
        amount: input.amount.toFixed(2),
        paymentMode: input.paymentMode,
        paymentDate: input.paymentDate,
        status: "paid",
        remarks: input.remarks ?? null,
        collectedBy: session?.user?.id,
      })
      .returning()
      .execute();

    // If advance payment was adjusted, mark the applicant seat booking as adjusted
    if (advanceAdjustedAmount > 0 && student.applicantId) {
      await db
        .update(nursingApplicants)
        .set({
          seatBookingStatus: "adjusted",
          notes: sql`CONCAT(COALESCE(${nursingApplicants.notes}, ''), ' | Seat booking advance of ₹' || ${advanceAdjustedAmount} || ' adjusted against Fee Receipt ' || ${receiptNumber})`,
          updatedAt: new Date(),
        })
        .where(eq(nursingApplicants.id, student.applicantId))
        .execute();
    }

    // Lock student payment frequencies for each component in this academic year
    let academicYear = getAcademicYear(input.paymentDate);
    if (input.remarks) {
      try {
        const parsed = JSON.parse(input.remarks);
        if (parsed?.academicYear) {
          academicYear = String(parsed.academicYear).trim();
        }
        const items = Array.isArray(parsed) ? parsed : parsed?.items || [];
        for (const item of items) {
          if (item && item.name) {
            const compName = String(item.name).trim();
            const freqKey = String(item.frequencyKey || (typeof item.frequency === "string" ? item.frequency.toLowerCase().replace(/[^a-z0-9_]/g, "_") : "annually"));
            const freqLabel = String(item.frequencyLabel || (typeof item.frequency === "string" ? item.frequency.replace(/\s*\(×\d+\)/, "") : "Annual"));
            const instCount = Number(item.installmentCount || (freqKey === "monthly" ? 12 : freqKey === "quarterly" ? 4 : freqKey === "semester" ? 2 : 1));
            const baseAmt = toNum(item.baseAmount || 0);
            const mult = toNum(item.multiplier || item.quantity || 1) || 1;
            const rawInstAmt = toNum(item.unitAmount || (item.amount && mult > 0 ? item.amount / mult : item.amount) || 0);
            const instAmt = (instCount > 1 && baseAmt > 0 && rawInstAmt > (baseAmt / instCount) * 1.5)
              ? Math.round((baseAmt / instCount) * 100) / 100
              : rawInstAmt;

            const existingLock = await db
              .select()
              .from(nursingStudentFeeFrequencies)
              .where(
                and(
                  eq(nursingStudentFeeFrequencies.studentId, input.studentId),
                  eq(nursingStudentFeeFrequencies.academicYear, academicYear),
                  eq(nursingStudentFeeFrequencies.componentName, compName)
                )
              )
              .execute();

            if (existingLock.length === 0) {
              await db
                .insert(nursingStudentFeeFrequencies)
                .values({
                  studentId: input.studentId,
                  academicYear,
                  componentId: item.componentId ? String(item.componentId) : null,
                  componentName: compName,
                  frequencyKey: freqKey,
                  frequencyLabel: freqLabel,
                  installmentCount: instCount,
                  baseAmount: baseAmt.toFixed(2),
                  installmentAmount: instAmt.toFixed(2),
                })
                .execute();
            } else {
              await db
                .update(nursingStudentFeeFrequencies)
                .set({
                  frequencyKey: freqKey,
                  frequencyLabel: freqLabel,
                  installmentCount: instCount,
                  baseAmount: baseAmt > 0 ? baseAmt.toFixed(2) : existingLock[0].baseAmount,
                  installmentAmount: instAmt > 0 ? instAmt.toFixed(2) : existingLock[0].installmentAmount,
                })
                .where(eq(nursingStudentFeeFrequencies.id, existingLock[0].id))
                .execute();
            }
          }
        }
      } catch (e) {
        console.error("Error locking student fee frequencies:", e);
      }
    }

    await db.insert(nursingAuditLogs).values({
      entity: "nursing_fee_transactions",
      entityId: String(tx.id),
      action: "FEE_PAYMENT",
      changedBy: session?.user?.id,
      diff: tx,
    }).execute();

    return c.json(tx, 201);
  })

  // -------------------------------------------------------------------------
  // Attendance Records
  // -------------------------------------------------------------------------
  .post("/nursing/attendance/bulk", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        batchId: z.number().int().positive(),
        sessionDate: z.string(),
        subjectName: z.string().optional().nullable(),
        sessionType: z.enum(["theory", "practical"]).default("theory"),
        records: z.array(
          z.object({
            studentId: z.number().int().positive(),
            status: z.enum(["present", "absent", "late", "leave"]),
          })
        ),
      })
    );

    const session = c.get("session");
    const insertedRecords = [];

    for (const rec of input.records) {
      const [inserted] = await db
        .insert(nursingAttendanceRecords)
        .values({
          batchId: input.batchId,
          studentId: rec.studentId,
          sessionDate: input.sessionDate,
          subjectName: input.subjectName ?? "General Session",
          sessionType: input.sessionType,
          status: rec.status,
          markedBy: session?.user?.id,
        })
        .returning()
        .execute();
      insertedRecords.push(inserted);
    }

    await db.insert(nursingAuditLogs).values({
      entity: "nursing_attendance_records",
      entityId: `batch-${input.batchId}-${input.sessionDate}`,
      action: "MARK_ATTENDANCE",
      changedBy: session?.user?.id,
      diff: { count: insertedRecords.length, batchId: input.batchId, date: input.sessionDate },
    }).execute();

    return c.json({ success: true, count: insertedRecords.length }, 201);
  })

  .get("/nursing/attendance/summary", async (c) => {
    const batchId = c.req.query("batchId");
    if (!batchId) {
      return c.json({ error: "batchId parameter required" }, 400);
    }

    const studentsList = await db
      .select()
      .from(nursingStudents)
      .where(eq(nursingStudents.batchId, Number(batchId)))
      .execute();

    const attendanceRecords = await db
      .select()
      .from(nursingAttendanceRecords)
      .where(eq(nursingAttendanceRecords.batchId, Number(batchId)))
      .execute();

    const summary = studentsList.map(s => {
      const studentRecords = attendanceRecords.filter(r => r.studentId === s.id);
      const totalSessions = studentRecords.length;
      const presentCount = studentRecords.filter(r => r.status === "present").length;
      const attendancePercent = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
      return {
        studentId: s.id,
        studentName: s.name,
        enrollmentNo: s.enrollmentNo,
        totalSessions,
        presentCount,
        attendancePercent,
        eligibleForExam: attendancePercent >= 75,
      };
    });

    return c.json(summary);
  })

  // -------------------------------------------------------------------------
  // Nursing Subjects Master
  // -------------------------------------------------------------------------
  .get("/nursing/subjects", async (c) => {
    const courseId = c.req.query("courseId");
    const semester = c.req.query("semester");
    const year = c.req.query("year");
    const search = c.req.query("search");

    const rows = await db
      .select({
        id: nursingSubjects.id,
        courseId: nursingSubjects.courseId,
        courseName: nursingCourses.name,
        code: nursingSubjects.code,
        name: nursingSubjects.name,
        year: nursingSubjects.year,
        semester: nursingSubjects.semester,
        theoryMaxMarks: nursingSubjects.theoryMaxMarks,
        practicalMaxMarks: nursingSubjects.practicalMaxMarks,
        credits: nursingSubjects.credits,
        active: nursingSubjects.active,
      })
      .from(nursingSubjects)
      .leftJoin(nursingCourses, eq(nursingSubjects.courseId, nursingCourses.id))
      .orderBy(nursingSubjects.semester, nursingSubjects.id)
      .execute();

    let filtered = rows;
    if (courseId && Number(courseId) > 0) {
      const match = rows.filter(r => r.courseId === Number(courseId));
      if (match.length > 0) {
        filtered = match;
      }
    }
    if (semester) filtered = filtered.filter(r => r.semester === Number(semester));
    if (year) filtered = filtered.filter(r => r.year === Number(year));
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
    }

    return c.json(filtered);
  })

  .post("/nursing/subjects", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        courseId: z.number().int().positive(),
        code: z.string().min(1),
        name: z.string().min(1),
        year: z.number().int().min(1).max(4).default(1),
        semester: z.number().int().min(1).max(8).default(1),
        theoryMaxMarks: z.number().int().default(75),
        practicalMaxMarks: z.number().int().default(25),
        credits: z.number().int().default(0),
      })
    );

    const [row] = await db.insert(nursingSubjects).values(input).returning().execute();
    return c.json(row, 201);
  })

  .put("/nursing/subjects/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const input = await jsonBody(
      c,
      z.object({
        courseId: z.number().int().positive().optional(),
        code: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        year: z.number().int().min(1).max(4).optional(),
        semester: z.number().int().min(1).max(8).optional(),
        theoryMaxMarks: z.number().int().optional(),
        practicalMaxMarks: z.number().int().optional(),
        credits: z.number().int().optional(),
        active: z.boolean().optional(),
      })
    );

    const [updated] = await db
      .update(nursingSubjects)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(nursingSubjects.id, id))
      .returning()
      .execute();

    if (!updated) {
      return c.json({ error: "Subject not found" }, 404);
    }

    const session = c.get("session");
    await db.insert(nursingAuditLogs).values({
      entity: "nursing_subjects",
      entityId: String(id),
      action: "UPDATE",
      changedBy: session?.user?.id,
      diff: updated,
    }).execute();

    return c.json(updated);
  })

  .delete("/nursing/subjects/:id", async (c) => {
    const id = Number(c.req.param("id"));

    const [deleted] = await db
      .delete(nursingSubjects)
      .where(eq(nursingSubjects.id, id))
      .returning()
      .execute();

    if (!deleted) {
      return c.json({ error: "Subject not found" }, 404);
    }

    const session = c.get("session");
    await db.insert(nursingAuditLogs).values({
      entity: "nursing_subjects",
      entityId: String(id),
      action: "DELETE",
      changedBy: session?.user?.id,
      diff: deleted,
    }).execute();

    return c.json({ success: true, message: "Subject deleted successfully" });
  })

  // Seed B.Sc Nursing Syllabus according to INC / Manipur Nursing Council Guidelines
  .post("/nursing/subjects/seed-bsc", async (c) => {
    // Reuse any existing course first (or find BSC_NURSING / BSC-NURS), only create if none exist
    const allCourses = await db.select().from(nursingCourses).execute();
    let bscCourse = allCourses.find(c => c.code === "BSC_NURSING" || c.code === "BSC-NURS") || allCourses[0];

    if (!bscCourse) {
      [bscCourse] = await db
        .insert(nursingCourses)
        .values({
          code: "BSC_NURSING",
          name: "B.Sc Nursing",
          durationYears: 4,
          totalSeats: 30,
          regulatoryBody: "Manipur Nursing Council",
        })
        .returning()
        .execute();
    }

    // Official Manipur Nursing Council / INC Semester-wise B.Sc Nursing Curriculum
    const standardSyllabus = [
      // Semester I (Year 1)
      { code: "NURS-101", name: "Communicative English", year: 1, semester: 1, theoryMaxMarks: 50, practicalMaxMarks: 0, credits: 3 },
      { code: "NURS-102", name: "Applied Anatomy & Applied Physiology", year: 1, semester: 1, theoryMaxMarks: 75, practicalMaxMarks: 25, credits: 6 },
      { code: "NURS-103", name: "Applied Sociology & Applied Psychology", year: 1, semester: 1, theoryMaxMarks: 75, practicalMaxMarks: 25, credits: 6 },
      { code: "NURS-104", name: "Nursing Foundation I (Theory & Practical)", year: 1, semester: 1, theoryMaxMarks: 75, practicalMaxMarks: 100, credits: 10 },

      // Semester II (Year 1)
      { code: "NURS-201", name: "Applied Biochemistry & Applied Nutrition & Dietetics", year: 1, semester: 2, theoryMaxMarks: 75, practicalMaxMarks: 25, credits: 5 },
      { code: "NURS-202", name: "Nursing Foundation II (Theory & Clinical)", year: 1, semester: 2, theoryMaxMarks: 75, practicalMaxMarks: 100, credits: 12 },
      { code: "NURS-203", name: "Health/Nursing Informatics & Technology", year: 1, semester: 2, theoryMaxMarks: 50, practicalMaxMarks: 50, credits: 3 },

      // Semester III (Year 2)
      { code: "NURS-301", name: "Applied Microbiology & Infection Control & Safety", year: 2, semester: 3, theoryMaxMarks: 75, practicalMaxMarks: 25, credits: 4 },
      { code: "NURS-302", name: "Pharmacology I, Pathology I & Genetics", year: 2, semester: 3, theoryMaxMarks: 75, practicalMaxMarks: 25, credits: 5 },
      { code: "NURS-303", name: "Adult Health Nursing I (Medical Surgical Nursing I)", year: 2, semester: 3, theoryMaxMarks: 75, practicalMaxMarks: 100, credits: 12 },

      // Semester IV (Year 2)
      { code: "NURS-401", name: "Pharmacology II & Pathology II", year: 2, semester: 4, theoryMaxMarks: 75, practicalMaxMarks: 25, credits: 5 },
      { code: "NURS-402", name: "Adult Health Nursing II (Medical Surgical Nursing II)", year: 2, semester: 4, theoryMaxMarks: 75, practicalMaxMarks: 100, credits: 12 },
      { code: "NURS-403", name: "Professionalism, Professional Values & Ethics", year: 2, semester: 4, theoryMaxMarks: 50, practicalMaxMarks: 0, credits: 2 },

      // Semester V (Year 3)
      { code: "NURS-501", name: "Child Health Nursing I (Pediatric Nursing I)", year: 3, semester: 5, theoryMaxMarks: 75, practicalMaxMarks: 50, credits: 6 },
      { code: "NURS-502", name: "Mental Health Nursing I (Psychiatric Nursing I)", year: 3, semester: 5, theoryMaxMarks: 75, practicalMaxMarks: 50, credits: 6 },
      { code: "NURS-503", name: "Community Health Nursing I", year: 3, semester: 5, theoryMaxMarks: 75, practicalMaxMarks: 50, credits: 6 },
      { code: "NURS-504", name: "Educational Technology / Nursing Education", year: 3, semester: 5, theoryMaxMarks: 75, practicalMaxMarks: 25, credits: 3 },

      // Semester VI (Year 3)
      { code: "NURS-601", name: "Child Health Nursing II (Pediatric Nursing II)", year: 3, semester: 6, theoryMaxMarks: 75, practicalMaxMarks: 50, credits: 4 },
      { code: "NURS-602", name: "Mental Health Nursing II (Psychiatric Nursing II)", year: 3, semester: 6, theoryMaxMarks: 75, practicalMaxMarks: 50, credits: 4 },
      { code: "NURS-603", name: "Nursing Management & Leadership", year: 3, semester: 6, theoryMaxMarks: 75, practicalMaxMarks: 25, credits: 4 },
      { code: "NURS-604", name: "Midwifery & Obstetrical Nursing I", year: 3, semester: 6, theoryMaxMarks: 75, practicalMaxMarks: 50, credits: 6 },

      // Semester VII (Year 4)
      { code: "NURS-701", name: "Community Health Nursing II", year: 4, semester: 7, theoryMaxMarks: 75, practicalMaxMarks: 50, credits: 6 },
      { code: "NURS-702", name: "Midwifery & Obstetrical Nursing II", year: 4, semester: 7, theoryMaxMarks: 75, practicalMaxMarks: 50, credits: 6 },
      { code: "NURS-703", name: "Nursing Research & Statistics", year: 4, semester: 7, theoryMaxMarks: 75, practicalMaxMarks: 25, credits: 4 },

      // Semester VIII (Year 4)
      { code: "NURS-801", name: "Intensive Clinical Practicum / Internship", year: 4, semester: 8, theoryMaxMarks: 0, practicalMaxMarks: 200, credits: 16 },
    ];

    const inserted = [];
    for (const sub of standardSyllabus) {
      const [existing] = await db.select().from(nursingSubjects).where(eq(nursingSubjects.code, sub.code)).execute();
      if (!existing) {
        const [row] = await db
          .insert(nursingSubjects)
          .values({
            courseId: bscCourse.id,
            ...sub,
          })
          .returning()
          .execute();
        inserted.push(row);
      } else {
        await db
          .update(nursingSubjects)
          .set({
            courseId: bscCourse.id,
            name: sub.name,
            year: sub.year,
            semester: sub.semester,
            theoryMaxMarks: sub.theoryMaxMarks,
            practicalMaxMarks: sub.practicalMaxMarks,
            credits: sub.credits,
          })
          .where(eq(nursingSubjects.id, existing.id))
          .execute();
        inserted.push(existing);
      }
    }

    return c.json({ success: true, count: inserted.length, message: `Seeded ${inserted.length} B.Sc Nursing subjects under Manipur Nursing Council guidelines.` });
  })

  // -------------------------------------------------------------------------
  // Academic Schedules & Term Dates CRUD
  // -------------------------------------------------------------------------
  .get("/nursing/academic-schedules", async (c) => {
    const batchId = c.req.query("batchId");
    const academicYear = c.req.query("academicYear");

    const rows = await db
      .select({
        id: nursingAcademicSchedules.id,
        batchId: nursingAcademicSchedules.batchId,
        courseId: nursingBatches.courseId,
        courseName: nursingCourses.name,
        courseCode: nursingCourses.code,
        batchAcademicYear: nursingBatches.academicYear,
        section: nursingBatches.section,
        academicYear: nursingAcademicSchedules.academicYear,
        semester: nursingAcademicSchedules.semester,
        startDate: nursingAcademicSchedules.startDate,
        endDate: nursingAcademicSchedules.endDate,
        feeDueDate: nursingAcademicSchedules.feeDueDate,
        feeDueOffsetDays: nursingAcademicSchedules.feeDueOffsetDays,
        remarks: nursingAcademicSchedules.remarks,
        createdAt: nursingAcademicSchedules.createdAt,
      })
      .from(nursingAcademicSchedules)
      .leftJoin(nursingBatches, eq(nursingAcademicSchedules.batchId, nursingBatches.id))
      .leftJoin(nursingCourses, eq(nursingBatches.courseId, nursingCourses.id))
      .orderBy(desc(nursingAcademicSchedules.id))
      .execute();

    let filtered = rows;
    if (batchId && Number(batchId) > 0) {
      filtered = filtered.filter((r) => r.batchId === Number(batchId));
    }
    if (academicYear) {
      filtered = filtered.filter((r) => r.academicYear === academicYear);
    }

    return c.json(filtered);
  })

  .post("/nursing/academic-schedules", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        batchId: z.coerce.number().int().positive("Select a valid batch"),
        academicYear: z.string().min(1, "Academic year is required"),
        semester: z.coerce.number().int().min(1).max(8).default(1),
        startDate: z.string().min(1, "Start date is required"),
        endDate: z.string().min(1, "End date is required"),
        feeDueDate: z.string().optional().nullable(),
        feeDueOffsetDays: z.coerce.number().int().min(0).default(15),
        remarks: z.string().optional().nullable(),
      })
    );

    let feeDueDate = input.feeDueDate;
    if (!feeDueDate && input.startDate) {
      const start = new Date(input.startDate + "T00:00:00");
      if (!isNaN(start.getTime())) {
        start.setDate(start.getDate() + input.feeDueOffsetDays);
        const yyyy = start.getFullYear();
        const mm = String(start.getMonth() + 1).padStart(2, "0");
        const dd = String(start.getDate()).padStart(2, "0");
        feeDueDate = `${yyyy}-${mm}-${dd}`;
      }
    }

    const [row] = await db
      .insert(nursingAcademicSchedules)
      .values({
        batchId: input.batchId,
        academicYear: input.academicYear,
        semester: input.semester,
        startDate: input.startDate,
        endDate: input.endDate,
        feeDueDate: feeDueDate || null,
        feeDueOffsetDays: input.feeDueOffsetDays,
        remarks: input.remarks || null,
      })
      .returning()
      .execute();

    if (input.semester === 1) {
      await db
        .update(nursingBatches)
        .set({ startDate: input.startDate, endDate: input.endDate, updatedAt: new Date() })
        .where(eq(nursingBatches.id, input.batchId))
        .execute();
    }

    const session = c.get("session");
    await db.insert(nursingAuditLogs).values({
      entity: "nursing_academic_schedules",
      entityId: String(row.id),
      action: "CREATE",
      changedBy: session?.user?.id,
      diff: row,
    }).execute();

    return c.json(row, 201);
  })

  .put("/nursing/academic-schedules/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!id || isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const input = await jsonBody(
      c,
      z.object({
        batchId: z.coerce.number().int().positive("Select a valid batch").optional(),
        academicYear: z.string().min(1, "Academic year is required").optional(),
        semester: z.coerce.number().int().min(1).max(8).optional(),
        startDate: z.string().min(1, "Start date is required").optional(),
        endDate: z.string().min(1, "End date is required").optional(),
        feeDueDate: z.string().optional().nullable(),
        feeDueOffsetDays: z.coerce.number().int().min(0).optional(),
        remarks: z.string().optional().nullable(),
      })
    );

    const [existing] = await db
      .select()
      .from(nursingAcademicSchedules)
      .where(eq(nursingAcademicSchedules.id, id))
      .execute();

    if (!existing) return c.json({ error: "Schedule not found" }, 404);

    const offsetDays = input.feeDueOffsetDays !== undefined ? input.feeDueOffsetDays : existing.feeDueOffsetDays;
    const startDate = input.startDate || existing.startDate;
    let feeDueDate = input.feeDueDate;

    if (!feeDueDate && startDate) {
      const start = new Date(startDate + "T00:00:00");
      if (!isNaN(start.getTime())) {
        start.setDate(start.getDate() + offsetDays);
        const yyyy = start.getFullYear();
        const mm = String(start.getMonth() + 1).padStart(2, "0");
        const dd = String(start.getDate()).padStart(2, "0");
        feeDueDate = `${yyyy}-${mm}-${dd}`;
      }
    }

    const [updated] = await db
      .update(nursingAcademicSchedules)
      .set({
        ...(input.batchId ? { batchId: input.batchId } : {}),
        ...(input.academicYear ? { academicYear: input.academicYear } : {}),
        ...(input.semester !== undefined ? { semester: input.semester } : {}),
        ...(input.startDate ? { startDate: input.startDate } : {}),
        ...(input.endDate ? { endDate: input.endDate } : {}),
        feeDueDate: feeDueDate !== undefined ? feeDueDate : existing.feeDueDate,
        ...(input.feeDueOffsetDays !== undefined ? { feeDueOffsetDays: input.feeDueOffsetDays } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
      })
      .where(eq(nursingAcademicSchedules.id, id))
      .returning()
      .execute();

    const session = c.get("session");
    await db.insert(nursingAuditLogs).values({
      entity: "nursing_academic_schedules",
      entityId: String(updated.id),
      action: "UPDATE",
      changedBy: session?.user?.id,
      diff: updated,
    }).execute();

    return c.json(updated);
  })

  .delete("/nursing/academic-schedules/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!id || isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const [deleted] = await db
      .delete(nursingAcademicSchedules)
      .where(eq(nursingAcademicSchedules.id, id))
      .returning()
      .execute();

    if (!deleted) return c.json({ error: "Schedule not found" }, 404);

    return c.json({ success: true, message: "Academic schedule deleted" });
  })

  // -------------------------------------------------------------------------
  // Fee Due Dates Dashboard (Batch-wise & Student-wise)
  // -------------------------------------------------------------------------
  .get("/nursing/fees/due-dashboard", async (c) => {
    const batchIdParam = c.req.query("batchId");
    const pageParam = c.req.query("page");
    const pageSizeParam = c.req.query("pageSize");
    const searchParam = c.req.query("search")?.trim().toLowerCase() || "";
    const dueStatusParam = c.req.query("dueStatus") || "all";

    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeParam) || 20));

    const batches = await db
      .select({
        id: nursingBatches.id,
        courseId: nursingBatches.courseId,
        courseName: nursingCourses.name,
        courseCode: nursingCourses.code,
        durationYears: nursingCourses.durationYears,
        academicYear: nursingBatches.academicYear,
        section: nursingBatches.section,
        maxSeats: nursingBatches.maxSeats,
        startDate: nursingBatches.startDate,
        endDate: nursingBatches.endDate,
      })
      .from(nursingBatches)
      .leftJoin(nursingCourses, eq(nursingBatches.courseId, nursingCourses.id))
      .execute();

    const students = await db
      .select({
        id: nursingStudents.id,
        applicantId: nursingStudents.applicantId,
        batchId: nursingStudents.batchId,
        enrollmentNo: nursingStudents.enrollmentNo,
        name: nursingStudents.name,
        email: nursingStudents.email,
        phone: nursingStudents.phone,
        status: nursingStudents.status,
        quotaCategory: nursingApplicants.quotaCategory,
      })
      .from(nursingStudents)
      .leftJoin(nursingApplicants, eq(nursingStudents.applicantId, nursingApplicants.id))
      .execute();

    const feeStructures = await db.select().from(nursingFeeStructures).execute();
    const feeTx = await db.select().from(nursingFeeTransactions).where(eq(nursingFeeTransactions.status, "paid")).execute();
    const schedules = await db.select().from(nursingAcademicSchedules).execute();
    const studentFreqs = await db.select().from(nursingStudentFeeFrequencies).execute();

    const todayStr = new Date().toISOString().split("T")[0];
    const todayTs = new Date(todayStr + "T00:00:00").getTime();
    const currentYear = new Date().getFullYear();

    const studentDues = students
      .filter((s) => s.status === "active" && (!batchIdParam || Number(batchIdParam) === 0 || s.batchId === Number(batchIdParam)))
      .map((st) => {
        const batch = batches.find((b) => b.id === st.batchId);
        const courseId = batch?.courseId;
        const durationYears = batch?.durationYears || 4;

        // Parse initial batch start year (e.g. 2024 from "2024-2025" or "2024-08-01")
        const batchStartYear = batch?.academicYear
          ? parseInt(batch.academicYear.split(/[-/]/)[0].trim(), 10)
          : batch?.startDate
          ? parseInt(batch.startDate.slice(0, 4), 10)
          : currentYear;

        const matchQuota = (fsQuota?: string | null, studentQuota?: string | null) => {
          const q1 = (fsQuota || "general").toLowerCase();
          const q2 = (studentQuota || "general").toLowerCase();
          if (q1 === "none" && (q2 === "none" || q2 === "general")) return true;
          if (q2 === "none" && (q1 === "none" || q1 === "general")) return true;
          return q1 === q2;
        };

        const batchAy = batch?.academicYear || "";

        // Find applicable base fee structure for course & quota
        const baseFeeStruct =
          feeStructures.find((fs) => fs.courseId === courseId && (fs.academicYear === batchAy || !batchAy) && matchQuota(fs.quotaCategory, st.quotaCategory)) ||
          feeStructures.find((fs) => fs.courseId === courseId && matchQuota(fs.quotaCategory, st.quotaCategory)) ||
          feeStructures.find((fs) => fs.courseId === courseId && (fs.academicYear === batchAy || !batchAy) && matchQuota(fs.quotaCategory, "general")) ||
          feeStructures.find((fs) => fs.courseId === courseId && matchQuota(fs.quotaCategory, "general")) ||
          feeStructures.find((fs) => fs.courseId === courseId);

        // If no fee structure exists for this course, don't use an arbitrary fallback amount; use 0
        const annualFeeAmount = baseFeeStruct ? toNum(baseFeeStruct.totalAmount) : 0;

        // Retrieve all schedules configured for this batch, sorted chronologically by semester / start date
        const batchSchedules = schedules
          .filter((sch) => sch.batchId === st.batchId)
          .sort((a, b) => (a.semester || 1) - (b.semester || 1));

        // Total fees collected and concessions recorded for this student across all transactions
        let paidAmount = 0;
        let totalDiscountConcessions = 0;
        const studentTxList = feeTx.filter((tx) => tx.studentId === st.id);
        for (const tx of studentTxList) {
          paidAmount += toNum(tx.amount);
          if (tx.remarks) {
            const parsed = parseRemarks(tx.remarks);
            if (parsed && Number(parsed.discountAmount) > 0) {
              totalDiscountConcessions += Number(parsed.discountAmount);
            }
          }
        }

        // Build list of terms from initial batch start
        interface TermItem {
          semester: number;
          academicYear: string;
          startDate: string;
          feeDueDate: string;
          expectedFee: number;
        }

        const terms: TermItem[] = [];

        if (batchSchedules.length > 0) {
          batchSchedules.forEach((sch) => {
            const termFs =
              feeStructures.find(
                (fs) =>
                  fs.courseId === courseId &&
                  fs.academicYear === sch.academicYear &&
                  (fs.quotaCategory === (st.quotaCategory || "general") || fs.quotaCategory === "general")
              ) || baseFeeStruct;

            const baseAmount = termFs ? toNum(termFs.totalAmount) : annualFeeAmount;
            const termAcademicYear = sch.academicYear || getAcademicYear(sch.startDate);

            // Check if student has locked component frequencies for this academic year
            const lockedFreqsForYear = studentFreqs.filter(
              (f) => f.studentId === st.id && f.academicYear === termAcademicYear
            );

            let termFee = baseAmount / 2;
            if (lockedFreqsForYear.length > 0) {
              const termExpectedFromLocked = lockedFreqsForYear.reduce((sum, f) => {
                const count = Number(f.installmentCount || (f.frequencyKey === "monthly" ? 12 : f.frequencyKey === "quarterly" ? 4 : f.frequencyKey === "semester" ? 2 : 1));
                const baseAmt = toNum(f.baseAmount || 0);
                const rawInst = toNum(f.installmentAmount);
                const instAmt = (count > 1 && baseAmt > 0 && rawInst > (baseAmt / count) * 1.5)
                  ? (baseAmt / count)
                  : (rawInst > 0 ? rawInst : (baseAmt > 0 && count > 0 ? baseAmt / count : 0));

                if (f.frequencyKey === "monthly") return sum + (instAmt * 6);
                if (f.frequencyKey === "quarterly") return sum + (instAmt * 2);
                if (f.frequencyKey === "semester") return sum + instAmt;
                if (f.frequencyKey === "one_time") return (sch.semester || 1) === 1 ? sum + instAmt : sum;
                return sum + (instAmt / 2);
              }, 0);
              termFee = termExpectedFromLocked > 0 ? termExpectedFromLocked : (baseAmount / 2);
            } else {
              const isSemesterFreq = termFs?.paymentFrequency === "semester";
              termFee = isSemesterFreq ? baseAmount : baseAmount / 2;
            }

            const sDate = sch.startDate || batch?.startDate || `${batchStartYear}-08-01`;
            const dDate = sch.feeDueDate || sDate;

            terms.push({
              semester: sch.semester || 1,
              academicYear: sch.academicYear,
              startDate: sDate,
              feeDueDate: dDate,
              expectedFee: termFee,
            });
          });
        } else {
          // If no specific schedules have been added yet, synthesize terms based on elapsed years from initial batch start
          const elapsedYears = Math.min(durationYears, Math.max(1, currentYear - batchStartYear + 1));
          for (let y = 0; y < elapsedYears; y++) {
            const yStart = batchStartYear + y;
            const yEnd = yStart + 1;
            const acadYear = `${yStart}-${yEnd}`;
            const sDate = `${yStart}-08-01`;
            const dDate = `${yStart}-08-15`;

            terms.push({
              semester: (y + 1) * 2 - 1,
              academicYear: acadYear,
              startDate: sDate,
              feeDueDate: dDate,
              expectedFee: annualFeeAmount,
            });
          }
        }

        // Cumulative gross expected fee from initial batch start across all elapsed/configured terms
        const grossTotalFee = terms.reduce((sum, t) => sum + t.expectedFee, 0);
        // Net expected fee accounting for verified concessions/scholarships
        const totalFee = Math.max(0, grossTotalFee - totalDiscountConcessions);

        // Calculate cumulative due fee for all terms whose due date has passed
        let earliestOverdueTerm: TermItem | null = null;
        let nextUpcomingTerm: TermItem | null = null;

        let runningExpected = 0;
        for (const t of terms) {
          const dueTs = new Date(t.feeDueDate + "T00:00:00").getTime();
          const isDue = dueTs <= todayTs;
          runningExpected += t.expectedFee;

          // Effective running liability after discounts
          const effectiveRunningExpected = Math.max(0, runningExpected - totalDiscountConcessions);

          // If student's total paidAmount is less than running expected fee for this due term, it's overdue
          if (isDue && paidAmount < effectiveRunningExpected && !earliestOverdueTerm) {
            earliestOverdueTerm = t;
          }

          if (!isDue && !nextUpcomingTerm) {
            nextUpcomingTerm = t;
          }
        }

        const balanceDue = Math.max(0, totalFee - paidAmount);

        // Active term for display
        const activeTerm = earliestOverdueTerm || nextUpcomingTerm || terms[terms.length - 1] || null;
        const termStartDate = activeTerm?.startDate || batch?.startDate || null;
        const feeDueDate = activeTerm?.feeDueDate || (termStartDate ? termStartDate : null);
        const semester = activeTerm?.semester || terms[terms.length - 1]?.semester || 1;

        let dueStatus: "paid" | "upcoming" | "overdue" = "upcoming";
        let daysDiffText = "Scheduled";

        if (balanceDue <= 0) {
          dueStatus = "paid";
          daysDiffText = "Fully Paid";
        } else if (earliestOverdueTerm) {
          dueStatus = "overdue";
          const dueTs = new Date(earliestOverdueTerm.feeDueDate + "T00:00:00").getTime();
          const diffDays = Math.max(1, Math.round((todayTs - dueTs) / (1000 * 60 * 60 * 24)));
          daysDiffText = `Overdue by ${diffDays} day${diffDays === 1 ? "" : "s"}`;
        } else if (nextUpcomingTerm) {
          dueStatus = "upcoming";
          const dueTs = new Date(nextUpcomingTerm.feeDueDate + "T00:00:00").getTime();
          const diffDays = Math.round((dueTs - todayTs) / (1000 * 60 * 60 * 24));
          if (diffDays <= 0) {
            daysDiffText = "Due Today";
          } else {
            daysDiffText = `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
          }
        } else {
          if (feeDueDate) {
            const dueTs = new Date(feeDueDate + "T00:00:00").getTime();
            const diffDays = Math.round((dueTs - todayTs) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
              dueStatus = "overdue";
              daysDiffText = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
            } else if (diffDays === 0) {
              dueStatus = "upcoming";
              daysDiffText = "Due Today";
            } else {
              dueStatus = "upcoming";
              daysDiffText = `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
            }
          }
        }

        // Build detailed term schedule with per-term status
        let cumulativeExpected = 0;
        let cumulativePaid = 0;
        const termDetails = terms.map((t) => {
          const dueTs = new Date(t.feeDueDate + "T00:00:00").getTime();
          const isDue = dueTs <= todayTs;
          cumulativeExpected += t.expectedFee;
          const effectiveCumulativeExpected = Math.max(0, cumulativeExpected - totalDiscountConcessions);

          // Figure out how much of paidAmount applies to this term
          const termPaidSoFar = Math.min(paidAmount, effectiveCumulativeExpected);
          const termExpectedAfterDiscount = Math.max(0, t.expectedFee - (cumulativeExpected <= totalDiscountConcessions ? t.expectedFee : Math.max(0, totalDiscountConcessions - (cumulativeExpected - t.expectedFee))));
          const termOwed = Math.max(0, effectiveCumulativeExpected - paidAmount);

          let termStatus: "paid" | "upcoming" | "overdue" = "upcoming";
          let termDaysDiffText = "Scheduled";
          if (paidAmount >= effectiveCumulativeExpected) {
            termStatus = "paid";
            termDaysDiffText = "Paid";
          } else if (isDue) {
            termStatus = "overdue";
            const diffDays = Math.max(1, Math.round((todayTs - dueTs) / (1000 * 60 * 60 * 24)));
            termDaysDiffText = `Overdue by ${diffDays} day${diffDays === 1 ? "" : "s"}`;
          } else {
            const diffDays = Math.round((dueTs - todayTs) / (1000 * 60 * 60 * 24));
            if (diffDays <= 0) {
              termDaysDiffText = "Due Today";
            } else {
              termDaysDiffText = `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
            }
          }

          return {
            semester: t.semester,
            academicYear: t.academicYear,
            startDate: t.startDate,
            feeDueDate: t.feeDueDate,
            expectedFee: t.expectedFee,
            cumulativeExpected: effectiveCumulativeExpected,
            status: termStatus,
            daysDiffText: termDaysDiffText,
          };
        });

        // Collect distinct academic years in chronological order
        const distinctAcademicYears: string[] = [];
        terms.forEach((t) => {
          if (t.academicYear && !distinctAcademicYears.includes(t.academicYear)) {
            distinctAcademicYears.push(t.academicYear);
          }
        });
        if (distinctAcademicYears.length === 0) {
          distinctAcademicYears.push(`${batchStartYear}-${batchStartYear + 1}`);
        }

        // Build yearly component breakdown per academic year
        const yearlyComponentDues = distinctAcademicYears.map((acadYear, yIdx) => {
          const yearNum = yIdx + 1;
          const isFirstYear = yearNum === 1;

          // Find fee structure for this specific academic year or fallback to base
          const yearFs =
            feeStructures.find(
              (fs) =>
                fs.courseId === courseId &&
                fs.academicYear === acadYear &&
                matchQuota(fs.quotaCategory, st.quotaCategory)
            ) ||
            feeStructures.find(
              (fs) =>
                fs.courseId === courseId &&
                fs.academicYear === acadYear &&
                matchQuota(fs.quotaCategory, "general")
            ) ||
            baseFeeStruct;

          let yearMasterComps: Array<{ name: string; amount: number; frequency: string; frequencyKey: string }> = [];
          if (yearFs?.componentsConfig) {
            try {
              const parsed = JSON.parse(yearFs.componentsConfig);
              if (Array.isArray(parsed) && parsed.length > 0) {
                yearMasterComps = parsed.map((c: any) => {
                  let cName = (c.name || "").trim();
                  if (cName.toLowerCase() === "tuition fee" || cName.toLowerCase() === "tuition & composite fee") {
                    cName = "Course Fee";
                  }
                  const freqKey = c.selectedFrequencyKey || "annually";
                  let freqLabel = "Annual";
                  if (freqKey === "monthly") freqLabel = "Monthly";
                  else if (freqKey === "quarterly") freqLabel = "Quarterly";
                  else if (freqKey === "semester") freqLabel = "Per-Semester";
                  else if (freqKey === "one_time") freqLabel = "One-Time";

                  return {
                    name: cName,
                    amount: toNum(c.amount),
                    frequency: freqLabel,
                    frequencyKey: freqKey,
                  };
                });
              }
            } catch (e) {}
          }

          if (yearMasterComps.length === 0 && yearFs) {
            yearMasterComps = [
              { name: "Course Fee", amount: toNum(yearFs.tuitionFee), frequency: "Annual", frequencyKey: "annually" },
              { name: "Admission Fee", amount: isFirstYear ? toNum(yearFs.admissionFee) : 0, frequency: "Annual / Initial", frequencyKey: "annually" },
              { name: "Uniform & Kit Fee", amount: isFirstYear ? toNum(yearFs.uniformFee) : 0, frequency: "Annual / Initial", frequencyKey: "annually" },
              { name: "Hostel & Mess Fee", amount: toNum(yearFs.hostelMessMonthlyFee) * 12, frequency: "Monthly", frequencyKey: "monthly" },
              { name: "Examination Fee", amount: toNum(yearFs.examFee), frequency: "Semester", frequencyKey: "semester" },
              { name: "Security Deposit", amount: isFirstYear ? toNum(yearFs.securityDeposit) : 0, frequency: "One-Time", frequencyKey: "one_time" },
              { name: "Library & Misc Fee", amount: toNum(yearFs.miscFee), frequency: "Annual", frequencyKey: "annually" },
            ].filter((c) => c.amount > 0);
          } else if (!isFirstYear) {
            yearMasterComps = yearMasterComps.filter((c) => c.frequencyKey !== "one_time");
          }

          // Compute total expected for all components this year (needed for proportional distribution)
          const yearTotalExpectedForProportion = yearMasterComps.reduce((sum, c) => {
            const lk = studentFreqs.find(
              (f) => f.studentId === st.id && f.academicYear === acadYear && f.componentName.toLowerCase() === c.name.toLowerCase()
            );
            return sum + (lk && toNum(lk.baseAmount) > 0 ? toNum(lk.baseAmount) : c.amount);
          }, 0);

          const comps = yearMasterComps.map((comp) => {
            const locked = studentFreqs.find(
              (f) => f.studentId === st.id && f.academicYear === acadYear && f.componentName.toLowerCase() === comp.name.toLowerCase()
            );

            const freqLabel = locked?.frequencyLabel || comp.frequency;
            const freqKey = locked?.frequencyKey || comp.frequencyKey;
            const baseCompAmount = locked && toNum(locked.baseAmount) > 0 ? toNum(locked.baseAmount) : comp.amount;
            const expectedCompAmount = baseCompAmount;

            // Collect individual payment records attributed to this component
            let paidForComp = 0;
            const compPayments: Array<{
              receiptNumber: string;
              paymentDate: string;
              amount: number;
              paymentMode: string;
              targetPeriod: string | null;
              isProportional: boolean;
            }> = [];

            for (const tx of studentTxList) {
              let txTargetAcadYear = getAcademicYear(tx.paymentDate);
              let hasItemizedBreakdown = false;
              let txTargetPeriod: string | null = null;
              const parsed = tx.remarks ? parseRemarks(tx.remarks) : null;

              if (parsed) {
                if (parsed.academicYear) {
                  txTargetAcadYear = String(parsed.academicYear).trim();
                }
                txTargetPeriod = parsed.periodLabel || (parsed.academicYear ? `AY ${parsed.academicYear}${parsed.billingPeriodValue ? ` • ${parsed.billingPeriodValue}` : ""}` : null);

                const matchesYear = txTargetAcadYear === acadYear || distinctAcademicYears.length === 1;

                if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
                  hasItemizedBreakdown = true;
                  const item = parsed.items.find(
                    (i: any) => {
                      const iname = String(i.name || "").toLowerCase().trim();
                      const cname = comp.name.toLowerCase().trim();
                      return iname === cname ||
                        ((iname.includes("course") || iname.includes("tuition")) && (cname.includes("course") || cname.includes("tuition")));
                    }
                  );
                  if (item && matchesYear) {
                    const amt = toNum(item.amount);
                    paidForComp += amt;
                    compPayments.push({
                      receiptNumber: tx.receiptNumber,
                      paymentDate: tx.paymentDate,
                      amount: amt,
                      paymentMode: tx.paymentMode,
                      targetPeriod: txTargetPeriod,
                      isProportional: false,
                    });
                  }
                } else if (matchesYear && !hasItemizedBreakdown) {
                  if (yearTotalExpectedForProportion > 0) {
                    const proportion = expectedCompAmount / yearTotalExpectedForProportion;
                    const amt = Math.round(toNum(tx.amount) * proportion * 100) / 100;
                    paidForComp += amt;
                    compPayments.push({
                      receiptNumber: tx.receiptNumber,
                      paymentDate: tx.paymentDate,
                      amount: amt,
                      paymentMode: tx.paymentMode,
                      targetPeriod: txTargetPeriod,
                      isProportional: true,
                    });
                  }
                }
              } else {
                const fallbackAcadYear = getAcademicYear(tx.paymentDate);
                if (fallbackAcadYear === acadYear || distinctAcademicYears.length === 1) {
                  if (yearTotalExpectedForProportion > 0) {
                    const proportion = expectedCompAmount / yearTotalExpectedForProportion;
                    const amt = Math.round(toNum(tx.amount) * proportion * 100) / 100;
                    paidForComp += amt;
                    compPayments.push({
                      receiptNumber: tx.receiptNumber,
                      paymentDate: tx.paymentDate,
                      amount: amt,
                      paymentMode: tx.paymentMode,
                      targetPeriod: null,
                      isProportional: true,
                    });
                  }
                }
              }
            }
            paidForComp = Math.round(paidForComp * 100) / 100;

            // Build installment-level breakdown based on frequency
            // Shows what's expected per period and how much has been covered
            const acadYearStartNum = parseInt(acadYear.split(/[-/]/)[0].trim(), 10) || batchStartYear;

            interface InstallmentPeriod {
              period: string;
              expectedAmount: number;
              paidAmount: number;
              dueAmount: number;
              status: "paid" | "partial" | "due";
            }
            const installments: InstallmentPeriod[] = [];

            const monthNames = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];

            if (freqKey === "monthly") {
              const rawInst = locked ? toNum(locked.installmentAmount) : 0;
              const count = 12;
              const safeInst = (rawInst > 0 && expectedCompAmount > 0 && rawInst <= expectedCompAmount / 6)
                ? rawInst
                : Math.round((expectedCompAmount / count) * 100) / 100;
              const instAmt = safeInst > 0 ? safeInst : Math.round((expectedCompAmount / count) * 100) / 100;
              for (let m = 0; m < 12; m++) {
                const mName = monthNames[m];
                const mYear = m < 7 ? acadYearStartNum : acadYearStartNum + 1;
                installments.push({
                  period: `${mName} ${mYear}`,
                  expectedAmount: instAmt,
                  paidAmount: 0,
                  dueAmount: instAmt,
                  status: "due",
                });
              }
            } else if (freqKey === "quarterly") {
              const rawInst = locked ? toNum(locked.installmentAmount) : 0;
              const count = 4;
              const safeInst = (rawInst > 0 && expectedCompAmount > 0 && rawInst <= expectedCompAmount / 2)
                ? rawInst
                : Math.round((expectedCompAmount / count) * 100) / 100;
              const instAmt = safeInst > 0 ? safeInst : Math.round((expectedCompAmount / count) * 100) / 100;
              const quarters = [`Q1 (Jun-Aug ${acadYearStartNum})`, `Q2 (Sep-Nov ${acadYearStartNum})`, `Q3 (Dec ${acadYearStartNum}-Feb ${acadYearStartNum + 1})`, `Q4 (Mar-May ${acadYearStartNum + 1})`];
              for (const q of quarters) {
                installments.push({
                  period: q,
                  expectedAmount: instAmt,
                  paidAmount: 0,
                  dueAmount: instAmt,
                  status: "due",
                });
              }
            } else if (freqKey === "semester") {
              const rawInst = locked ? toNum(locked.installmentAmount) : 0;
              const count = 2;
              const safeInst = (rawInst > 0 && expectedCompAmount > 0 && rawInst <= expectedCompAmount * 0.75)
                ? rawInst
                : Math.round((expectedCompAmount / count) * 100) / 100;
              const instAmt = safeInst > 0 ? safeInst : Math.round((expectedCompAmount / count) * 100) / 100;
              installments.push({
                period: `Sem 1 (Jun-Nov ${acadYearStartNum})`,
                expectedAmount: instAmt,
                paidAmount: 0,
                dueAmount: instAmt,
                status: "due",
              });
              installments.push({
                period: `Sem 2 (Dec ${acadYearStartNum}-May ${acadYearStartNum + 1})`,
                expectedAmount: instAmt,
                paidAmount: 0,
                dueAmount: instAmt,
                status: "due",
              });
            } else if (freqKey === "one_time") {
              installments.push({
                period: `One-Time (Year ${yearNum})`,
                expectedAmount: expectedCompAmount,
                paidAmount: 0,
                dueAmount: expectedCompAmount,
                status: "due",
              });
            } else {
              // annually or default
              installments.push({
                period: `AY ${acadYear}`,
                expectedAmount: expectedCompAmount,
                paidAmount: 0,
                dueAmount: expectedCompAmount,
                status: "due",
              });
            }

            // Distribute paid amount across installments chronologically
            let remainingPaid = paidForComp;
            for (const inst of installments) {
              if (remainingPaid <= 0) break;
              const applied = Math.min(remainingPaid, inst.expectedAmount);
              inst.paidAmount = Math.round(applied * 100) / 100;
              inst.dueAmount = Math.max(0, Math.round((inst.expectedAmount - inst.paidAmount) * 100) / 100);
              inst.status = inst.paidAmount >= inst.expectedAmount ? "paid" : inst.paidAmount > 0 ? "partial" : "due";
              remainingPaid -= applied;
            }

            const dueAmount = Math.max(0, expectedCompAmount - paidForComp);
            let compStatus: "paid" | "partial" | "due" = "due";
            if (paidForComp >= expectedCompAmount && expectedCompAmount > 0) {
              compStatus = "paid";
            } else if (paidForComp > 0) {
              compStatus = "partial";
            }

            return {
              name: comp.name,
              frequency: freqLabel,
              frequencyKey: freqKey,
              expectedAmount: expectedCompAmount,
              paidAmount: paidForComp,
              dueAmount,
              status: compStatus,
              payments: compPayments.sort((a, b) => (a.paymentDate || "").localeCompare(b.paymentDate || "")),
              installments,
            };
          });

          const yearTotalExpected = comps.reduce((sum, c) => sum + c.expectedAmount, 0);
          const yearTotalPaid = comps.reduce((sum, c) => sum + c.paidAmount, 0);
          const yearTotalDue = Math.max(0, yearTotalExpected - yearTotalPaid);

          return {
            academicYear: acadYear,
            yearNumber: yearNum,
            totalExpected: yearTotalExpected,
            totalPaid: yearTotalPaid,
            totalDue: yearTotalDue,
            components: comps,
          };
        });

        const allFlatComponentDues = yearlyComponentDues.flatMap((y) => y.components);

        // Build compact payment history for this student
        const paymentHistory = studentTxList
          .sort((a, b) => (a.paymentDate || "").localeCompare(b.paymentDate || ""))
          .map((tx) => {
            let components = "";
            let discountAmt = 0;
            let grossAmt = 0;
            let targetPeriod: string | null = null;
            if (tx.remarks) {
              const parsed = parseRemarks(tx.remarks);
              if (parsed) {
                discountAmt = Number(parsed.discountAmount || 0);
                grossAmt = Number(parsed.grossSubtotal || 0);
                const items = parsed.items || [];
                components = items.map((i: any) => i.name).join(", ");
                targetPeriod = parsed.periodLabel || (parsed.academicYear ? `AY ${parsed.academicYear}${parsed.billingPeriodValue ? ` • ${parsed.billingPeriodValue}` : ""}` : null);
              }
            }
            let feeTypeDisplay = tx.feeType || components || "Course Fee";
            if (feeTypeDisplay.toLowerCase().includes("tuition")) {
              feeTypeDisplay = feeTypeDisplay.replace(/tuition/gi, "Course Fee");
            }

            return {
              id: tx.id,
              receiptNumber: tx.receiptNumber,
              paymentDate: tx.paymentDate,
              amount: toNum(tx.amount),
              grossAmount: grossAmt || toNum(tx.amount),
              discountAmount: discountAmt,
              paymentMode: tx.paymentMode,
              feeType: feeTypeDisplay,
              components,
              targetPeriod,
            };
          });

        return {
          studentId: st.id,
          name: st.name,
          enrollmentNo: st.enrollmentNo,
          email: st.email,
          phone: st.phone,
          batchId: st.batchId,
          batchName: batch ? `${batch.courseName} (${batch.academicYear})` : "N/A",
          courseName: batch?.courseName || "B.Sc Nursing",
          quotaCategory: st.quotaCategory || "general",
          semester,
          totalFee,
          paidAmount,
          balanceDue,
          totalDiscountConcessions,
          termStartDate,
          feeDueDate,
          dueStatus,
          daysDiffText,
          termDetails,
          componentDues: allFlatComponentDues,
          yearlyComponentDues,
          paymentHistory,
        };
      });

    const batchSummaries = batches.map((b) => {
      const batchStudents = studentDues.filter((s) => s.batchId === b.id);
      const batchSchedules = schedules
        .filter((sch) => sch.batchId === b.id)
        .sort((a, b) => (b.semester || 1) - (a.semester || 1));
      const latestSchedule = batchSchedules[0];

      const totalExpected = batchStudents.reduce((sum, s) => sum + s.totalFee, 0);
      const totalCollected = batchStudents.reduce((sum, s) => sum + s.paidAmount, 0);
      const totalBalanceDue = Math.max(0, totalExpected - totalCollected);
      const overdueCount = batchStudents.filter((s) => s.dueStatus === "overdue").length;

      let status: "on_track" | "due_soon" | "overdue" = "on_track";
      if (overdueCount > 0) status = "overdue";
      else if (totalBalanceDue > 0) status = "due_soon";

      return {
        batchId: b.id,
        batchName: `${b.courseName} (${b.academicYear})`,
        courseName: b.courseName,
        academicYear: b.academicYear,
        section: b.section,
        totalStudents: batchStudents.length,
        termStartDate: latestSchedule?.startDate || b.startDate || null,
        termEndDate: latestSchedule?.endDate || b.endDate || null,
        feeDueDate: latestSchedule?.feeDueDate || null,
        totalExpected,
        totalCollected,
        totalBalanceDue,
        overdueCount,
        status,
      };
    });

    // Compute aggregate metrics from ALL student dues (before filtering/pagination)
    const metrics = {
      totalStudents: studentDues.length,
      totalExpected: studentDues.reduce((sum, s) => sum + s.totalFee, 0),
      totalCollected: studentDues.reduce((sum, s) => sum + s.paidAmount, 0),
      totalBalanceDue: studentDues.reduce((sum, s) => sum + s.balanceDue, 0),
      overdueCount: studentDues.filter((s) => s.dueStatus === "overdue").length,
    };

    // Apply search and due-status filters
    let filteredDues = studentDues;
    if (searchParam) {
      filteredDues = filteredDues.filter((s) =>
        s.name.toLowerCase().includes(searchParam) ||
        s.enrollmentNo.toLowerCase().includes(searchParam) ||
        s.batchName.toLowerCase().includes(searchParam) ||
        s.courseName.toLowerCase().includes(searchParam)
      );
    }
    if (dueStatusParam !== "all") {
      filteredDues = filteredDues.filter((s) => s.dueStatus === dueStatusParam);
    }

    const totalRecords = filteredDues.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;
    const paginatedDues = filteredDues.slice(offset, offset + pageSize);

    return c.json({
      batchSummaries,
      studentDues: paginatedDues,
      pagination: {
        page: safePage,
        pageSize,
        totalRecords,
        totalPages,
      },
      metrics,
    });
  });

