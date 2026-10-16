import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth.ts";
import { db, pool } from "../db/client.ts";
import {
  competencyDomains,
  competencyCriteria,
  assessmentCycles,
  staffSkillAssessments,
  staffSkillAssessmentItems,
  theoreticalQuestions,
  examConfigs,
  examAttempts,
} from "../db/schema-skill-assessment.ts";
import {
  staff,
  departments,
  departmentLeaders,
  staffDepartments,
  nursingSupers,
  user,
} from "../db/schema.ts";
import { getCurrentStaff, hasHrOrAccountsViewAccess } from "./shared.ts";
import { getHospitalSettingsFromDb, updateHospitalSettingsInDb } from "../services/hospital-settings.ts";
import { DEFAULT_EXAM_MIX, selectExamQuestions } from "../../src/lib/exam-question-mix.ts";
import { canPrintCbtCertificate, type CbtCertificate } from "../../src/lib/cbt-certificate.ts";
import {
  examRemainingSeconds, examSelectedAnswers, gradeExam, publicExamQuestions,
  snapshotExamQuestions, validateAssessmentRatings, cbtCalendarMonthWindow, assessmentCbtPeriod, averageAssessmentCbtResults,
} from "../services/skill-assessment-engine.ts";

async function canManageAssessmentSettings(c: Context<AuthEnv>) {
  const role = (c.get("session")?.user?.role || "").toLowerCase();
  if (role === "admin" || role === "hr") return true;
  return (await getCurrentStaff(c))?.role?.toLowerCase() === "hr";
}

async function getAssessmentActor(c: Context<AuthEnv>) {
  const currentStaff = await getCurrentStaff(c);
  const role = (c.get("session")?.user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isHr = isAdmin || role === "hr" || currentStaff?.role?.toLowerCase() === "hr";
  const isSuper = isAdmin || (currentStaff ? await isStaffNursingSuper(currentStaff.staffId) : false);
  return { currentStaff, isAdmin, isHr, isSuper };
}

async function assessmentCbtResult(assessment: { id: number; staffId: number; startDate?: string | null; endDate?: string | null; cycleId?: number | null }, executor: Pick<typeof db, "select"> = db) {
  let startDate = assessment.startDate;
  let endDate = assessment.endDate;
  if ((!startDate || !endDate) && assessment.cycleId) {
    const [cycle] = await executor.select().from(assessmentCycles).where(eq(assessmentCycles.id, assessment.cycleId)).limit(1);
    startDate ||= cycle?.startDate;
    endDate ||= cycle?.endDate;
  }
  const window = assessmentCbtPeriod(startDate, endDate);
  const attempts = await executor.select({ theoreticalRating: examAttempts.theoreticalRating,
    questionSnapshot: examAttempts.questionSnapshot, answers: examAttempts.answers })
    .from(examAttempts).where(and(
      eq(examAttempts.staffId, assessment.staffId),
      inArray(examAttempts.status, ["completed", "timed_out"]),
      window ? and(
        gte(examAttempts.startedAt, sql`${window.start.toISOString()}::timestamptz`),
        sql`${examAttempts.startedAt} < ${window.next.toISOString()}::timestamptz`,
      ) : eq(examAttempts.assessmentId, assessment.id),
    ));
  return averageAssessmentCbtResults(attempts);
}

async function canReadAssessment(c: Context<AuthEnv>, record: { staffId: number; departmentId: number | null }) {
  const actor = await getAssessmentActor(c);
  return actor.isHr || actor.isSuper || actor.currentStaff?.staffId === record.staffId ||
    Boolean(actor.currentStaff && record.departmentId && await isStaffDeptIncharge(actor.currentStaff.staffId, record.departmentId));
}

function toNum(v: unknown): number {
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]+/g, ""));
  return isNaN(n) ? 0 : n;
}

// Helper to determine if a staff member is Incharge of a given department
async function isStaffDeptIncharge(staffId: number, departmentId: number, executor: Pick<typeof db, "select"> = db): Promise<boolean> {
  const leaders = await executor
    .select()
    .from(departmentLeaders)
    .where(eq(departmentLeaders.departmentId, departmentId))
    .limit(1)
    .then((r) => r[0]);

  if (leaders && (leaders.headStaffId === staffId || leaders.subheadStaffId === staffId)) {
    return true;
  }

  // Check department head name match or designation
  const dept = await executor
    .select()
    .from(departments)
    .where(eq(departments.id, departmentId))
    .limit(1)
    .then((r) => r[0]);

  const s = await executor
    .select()
    .from(staff)
    .where(sql`${staff.staffId} = ${staffId} AND ${staff.active} = true`)
    .limit(1)
    .then((r) => r[0]);

  if (dept && s && dept.head && s.name && dept.head.toLowerCase().trim() === s.name.toLowerCase().trim()) {
    return true;
  }

  if (s?.role && /incharge|head|lead|supervisor/i.test(s.role)) {
    const [assignment] = await executor.select({ id: staffDepartments.id }).from(staffDepartments)
      .where(and(eq(staffDepartments.staffId, staffId), eq(staffDepartments.departmentId, departmentId), eq(staffDepartments.status, "Active")))
      .limit(1);
    return Boolean(assignment);
  }

  return false;
}

// Helper to check if staff member is an active Nursing Supervisor
async function isStaffNursingSuper(staffId: number, executor: Pick<typeof db, "select"> = db): Promise<boolean> {
  const superRecord = await executor
    .select()
    .from(nursingSupers)
    .where(sql`${nursingSupers.staffId} = ${staffId} AND ${nursingSupers.active} = true`)
    .limit(1)
    .then((r) => r[0]);

  if (superRecord) return true;

  const s = await executor
    .select()
    .from(staff)
    .where(sql`${staff.staffId} = ${staffId} AND ${staff.active} = true`)
    .limit(1)
    .then((r) => r[0]);

  if (s?.role && /nursing super|matron|nursing director/i.test(s.role)) {
    return true;
  }

  return false;
}

/**
 * Atomically generates the next unique assessment number using the PostgreSQL database sequence:
 * SKL-YYYY-XXXX (e.g. SKL-2026-0004)
 */
async function getNextAssessmentNo(year: number = new Date().getFullYear()): Promise<string> {
  const res = await pool.query(`SELECT nextval('skill_assessment.staff_skill_assessments_seq') AS next_val`);
  const seq = parseInt(res.rows[0].next_val, 10);
  return `SKL-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Atomically generates the next unique CBT exam attempt number using the PostgreSQL database sequence:
 * EXAM-YYYY-XXXX (e.g. EXAM-2026-0001)
 */
async function getNextExamAttemptNo(year: number = new Date().getFullYear(), executor: Pick<typeof db, "execute"> = db): Promise<string> {
  const res = await executor.execute<{ next_val: string }>(sql`SELECT nextval('skill_assessment.exam_attempts_seq') AS next_val`);
  const seq = parseInt(res.rows[0].next_val, 10);
  return `EXAM-${year}-${String(seq).padStart(4, "0")}`;
}

import { createSkillAssessmentSchemaAndTables } from "../db/setup-skill-assessment-db.ts";

let tablesInitialized = false;
let initPromise: Promise<void> | null = null;
async function ensureTablesExist() {
  if (tablesInitialized) return;
  if (!initPromise) {
    initPromise = createSkillAssessmentSchemaAndTables()
      .then(() => {
        tablesInitialized = true;
      })
      .catch((err) => {
        initPromise = null;
        throw err;
      });
  }
  await initPromise;
}

export const skillAssessmentRoutes = new Hono<AuthEnv>()
  .use("/skill-assessment/*", async (c, next) => {
    await ensureTablesExist();

    const path = c.req.path;
    // Allow checking permissions and rubrics without blocking so frontend can read restriction status
    if (path.endsWith("/my-permissions") || path.endsWith("/rubrics")) {
      return next();
    }

    const hospitalSettings = await getHospitalSettingsFromDb();
    if (!hospitalSettings.enableStaffCompetencyModule) {
      const userRole = (c.get("session")?.user?.role || "").toLowerCase();
      const isAdmin = userRole === "admin";
      const currentStaff = await getCurrentStaff(c);
      const isHr = isAdmin || userRole === "hr" || (currentStaff?.role || "").toLowerCase() === "hr";
      const isNursingSuper = isAdmin || (currentStaff ? await isStaffNursingSuper(currentStaff.staffId) : false);

      if (!isAdmin && !isHr && !isNursingSuper) {
        return c.json(
          {
            error:
              "The Clinical Staff Competency Assessment module is temporarily restricted to Nursing Supervisors, HR, and Admin by hospital administration.",
            isModuleDisabled: true,
          },
          403
        );
      }
    }

    return next();
  })

  .use("/skill-assessment/*", async (c, next) => {
    const path = c.req.path;
    const settingsRequest = path.endsWith("/skill-assessment/settings")
      || (c.req.method !== "GET" && /\/skill-assessment\/(criteria|domains|cycles)(\/|$)/.test(path))
      || (c.req.method !== "GET" && path.endsWith("/skill-assessment/exam/config"));
    if (settingsRequest && !(await canManageAssessmentSettings(c))) {
      return c.json({ error: "Only HR and Admin can manage assessment settings." }, 403);
    }
    return next();
  })
  .get("/skill-assessment/settings", async (c) => {
    const settings = await getHospitalSettingsFromDb();
    return c.json({ enableStaffCompetencyModule: settings.enableStaffCompetencyModule });
  })
  .put("/skill-assessment/settings", async (c) => {
    const parsed = z.object({ enableStaffCompetencyModule: z.boolean() }).strict().safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Provide a valid staff assessment access setting." }, 400);
    const settings = await updateHospitalSettingsInDb(parsed.data);
    return c.json({ enableStaffCompetencyModule: settings.enableStaffCompetencyModule });
  })

  // ---------------------------------------------------------------------------
  // 1. Get NABH Competency Domains & Criteria Catalog (With optional inactive items)
  // ---------------------------------------------------------------------------
  .get("/skill-assessment/rubrics", async (c) => {
    const includeInactive = c.req.query("includeInactive") === "true";

    const domains = await db
      .select()
      .from(competencyDomains)
      .where(includeInactive ? undefined : eq(competencyDomains.active, true))
      .orderBy(asc(competencyDomains.displayOrder), asc(competencyDomains.name));

    const criteria = await db
      .select()
      .from(competencyCriteria)
      .where(includeInactive ? undefined : eq(competencyCriteria.active, true))
      .orderBy(asc(competencyCriteria.displayOrder), asc(competencyCriteria.code));

    const grouped = domains.map((d) => ({
      ...d,
      criteria: criteria.filter((cr) => cr.domainId === d.id),
    }));

    return c.json({
      domains,
      criteria,
      grouped,
    });
  })

  // ---------------------------------------------------------------------------
  // 1b. Get Single Criterion Details
  // ---------------------------------------------------------------------------
  .get("/skill-assessment/criteria/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid criterion ID" }, 400);

    const criterion = await db
      .select({
        id: competencyCriteria.id,
        domainId: competencyCriteria.domainId,
        code: competencyCriteria.code,
        title: competencyCriteria.title,
        description: competencyCriteria.description,
        clinicalScenario: competencyCriteria.clinicalScenario,
        skillType: competencyCriteria.skillType,
        theoreticalGuideline: competencyCriteria.theoreticalGuideline,
        practicalGuideline: competencyCriteria.practicalGuideline,
        targetScore: competencyCriteria.targetScore,
        weightage: competencyCriteria.weightage,
        displayOrder: competencyCriteria.displayOrder,
        active: competencyCriteria.active,
        domainCode: competencyDomains.code,
        domainName: competencyDomains.name,
      })
      .from(competencyCriteria)
      .innerJoin(competencyDomains, eq(competencyCriteria.domainId, competencyDomains.id))
      .where(eq(competencyCriteria.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!criterion) {
      return c.json({ error: "Criterion not found" }, 404);
    }

    return c.json(criterion);
  })

  // ---------------------------------------------------------------------------
  // 1c. Create Competency Objective, Clinical Scenario & Questionnaire
  // ---------------------------------------------------------------------------
  .post("/skill-assessment/criteria", async (c) => {
    if (!(await canManageAssessmentSettings(c))) {
      return c.json({ error: "Only HR and Admin can manage assessment settings." }, 403);
    }

    const body = await c.req.json();
    const schema = z.object({
      domainId: z.number().int().positive("Competency Domain is required"),
      code: z.string().min(2, "Criterion code is required").max(50),
      title: z.string().min(3, "Objective title is required"),
      description: z.string().min(3, "Objective description is required"),
      clinicalScenario: z.string().optional().nullable(),
      skillType: z.enum(["theoretical", "practical", "both"]).default("both"),
      theoreticalGuideline: z.string().min(3, "Theoretical questionnaire / benchmarks required"),
      practicalGuideline: z.string().min(3, "Practical demonstration checklist / OSCE rubric required"),
      targetScore: z.number().min(1).max(5).default(4.0),
      weightage: z.number().min(0.1).max(10).default(1.0),
      displayOrder: z.number().int().default(0),
      active: z.boolean().default(true),
    });

    const parsed = schema.parse(body);
    const normalizedCode = parsed.code.trim().toUpperCase();

    // Check duplicate code
    const existing = await db
      .select({ id: competencyCriteria.id })
      .from(competencyCriteria)
      .where(eq(competencyCriteria.code, normalizedCode))
      .limit(1)
      .then((r) => r[0]);

    if (existing) {
      return c.json({ error: `Objective with code '${normalizedCode}' already exists.` }, 400);
    }

    const [created] = await db
      .insert(competencyCriteria)
      .values({
        domainId: parsed.domainId,
        code: normalizedCode,
        title: parsed.title.trim(),
        description: parsed.description.trim(),
        clinicalScenario: parsed.clinicalScenario?.trim() || null,
        skillType: parsed.skillType,
        theoreticalGuideline: parsed.theoreticalGuideline.trim(),
        practicalGuideline: parsed.practicalGuideline.trim(),
        targetScore: String(parsed.targetScore),
        weightage: String(parsed.weightage),
        displayOrder: parsed.displayOrder,
        active: parsed.active,
      })
      .returning();

    return c.json(
      {
        message: "Objective, scenario, and questionnaires created successfully",
        criterion: created,
      },
      201
    );
  })

  // ---------------------------------------------------------------------------
  // 1d. Update Competency Objective, Clinical Scenario & Questionnaire
  // ---------------------------------------------------------------------------
  .put("/skill-assessment/criteria/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid criterion ID" }, 400);

    if (!(await canManageAssessmentSettings(c))) {
      return c.json({ error: "Only HR and Admin can manage assessment settings." }, 403);
    }

    const body = await c.req.json();
    const schema = z.object({
      domainId: z.number().int().positive().optional(),
      code: z.string().min(2).max(50).optional(),
      title: z.string().min(3).optional(),
      description: z.string().min(3).optional(),
      clinicalScenario: z.string().optional().nullable(),
      skillType: z.enum(["theoretical", "practical", "both"]).optional(),
      theoreticalGuideline: z.string().min(3).optional(),
      practicalGuideline: z.string().min(3).optional(),
      targetScore: z.number().min(1).max(5).optional(),
      weightage: z.number().min(0.1).max(10).optional(),
      displayOrder: z.number().int().optional(),
      active: z.boolean().optional(),
    });

    const parsed = schema.parse(body);

    if (parsed.code) {
      const normalizedCode = parsed.code.trim().toUpperCase();
      const duplicate = await db
        .select({ id: competencyCriteria.id })
        .from(competencyCriteria)
        .where(and(eq(competencyCriteria.code, normalizedCode), sql`${competencyCriteria.id} != ${id}`))
        .limit(1)
        .then((r) => r[0]);

      if (duplicate) {
        return c.json({ error: `Objective with code '${normalizedCode}' already exists.` }, 400);
      }
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (parsed.domainId !== undefined) updateData.domainId = parsed.domainId;
    if (parsed.code !== undefined) updateData.code = parsed.code.trim().toUpperCase();
    if (parsed.title !== undefined) updateData.title = parsed.title.trim();
    if (parsed.description !== undefined) updateData.description = parsed.description.trim();
    if (parsed.clinicalScenario !== undefined) updateData.clinicalScenario = parsed.clinicalScenario?.trim() || null;
    if (parsed.skillType !== undefined) updateData.skillType = parsed.skillType;
    if (parsed.theoreticalGuideline !== undefined) updateData.theoreticalGuideline = parsed.theoreticalGuideline.trim();
    if (parsed.practicalGuideline !== undefined) updateData.practicalGuideline = parsed.practicalGuideline.trim();
    if (parsed.targetScore !== undefined) updateData.targetScore = String(parsed.targetScore);
    if (parsed.weightage !== undefined) updateData.weightage = String(parsed.weightage);
    if (parsed.displayOrder !== undefined) updateData.displayOrder = parsed.displayOrder;
    if (parsed.active !== undefined) updateData.active = parsed.active;

    const [updated] = await db
      .update(competencyCriteria)
      .set(updateData)
      .where(eq(competencyCriteria.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Criterion not found" }, 404);
    }

    return c.json({
      message: "Objective, scenario, and questionnaires updated successfully",
      criterion: updated,
    });
  })

  // ---------------------------------------------------------------------------
  // 1e. Toggle Active Status / Deactivate Criterion
  // ---------------------------------------------------------------------------
  .patch("/skill-assessment/criteria/:id/toggle", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid criterion ID" }, 400);

    if (!(await canManageAssessmentSettings(c))) {
      return c.json({ error: "Only HR and Admin can manage assessment settings." }, 403);
    }

    const current = await db
      .select({ id: competencyCriteria.id, active: competencyCriteria.active })
      .from(competencyCriteria)
      .where(eq(competencyCriteria.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!current) return c.json({ error: "Criterion not found" }, 404);

    const [updated] = await db
      .update(competencyCriteria)
      .set({ active: !current.active, updatedAt: new Date() })
      .where(eq(competencyCriteria.id, id))
      .returning();

    return c.json({
      message: `Criterion is now ${updated.active ? "Active" : "Inactive"}`,
      criterion: updated,
    });
  })

  // ---------------------------------------------------------------------------
  // 1f. Delete Criterion (Soft-deactivates if referenced by assessments)
  // ---------------------------------------------------------------------------
  .delete("/skill-assessment/criteria/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid criterion ID" }, 400);

    if (!(await canManageAssessmentSettings(c))) {
      return c.json({ error: "Only HR and Admin can manage assessment settings." }, 403);
    }

    // Check if any assessment line items reference this criterion
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(staffSkillAssessmentItems)
      .where(eq(staffSkillAssessmentItems.criterionId, id));

    const isReferenced = Number(countResult[0]?.count || 0) > 0;

    if (isReferenced) {
      // Soft-delete to preserve audit trail
      await db
        .update(competencyCriteria)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(competencyCriteria.id, id));

      return c.json({
        message: "Criterion is referenced in historical assessments; deactivated successfully.",
        deactivated: true,
      });
    }

    await db.delete(competencyCriteria).where(eq(competencyCriteria.id, id));
    return c.json({ message: "Criterion deleted permanently.", deleted: true });
  })

  // ---------------------------------------------------------------------------
  // 1g. Create / Manage Competency Domain Category
  // ---------------------------------------------------------------------------
  .post("/skill-assessment/domains", async (c) => {
    if (!(await canManageAssessmentSettings(c))) {
      return c.json({ error: "Only Admin or HR can create competency domains." }, 403);
    }

    const body = await c.req.json();
    const schema = z.object({
      code: z.string().min(2, "Domain code is required").max(20),
      name: z.string().min(3, "Domain name is required"),
      nabhStandardRef: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      displayOrder: z.number().int().default(0),
    });

    const parsed = schema.parse(body);
    const normalizedCode = parsed.code.trim().toUpperCase();

    const existing = await db
      .select({ id: competencyDomains.id })
      .from(competencyDomains)
      .where(eq(competencyDomains.code, normalizedCode))
      .limit(1)
      .then((r) => r[0]);

    if (existing) {
      return c.json({ error: `Domain with code '${normalizedCode}' already exists.` }, 400);
    }

    const [domain] = await db
      .insert(competencyDomains)
      .values({
        code: normalizedCode,
        name: parsed.name.trim(),
        nabhStandardRef: parsed.nabhStandardRef?.trim() || null,
        description: parsed.description?.trim() || null,
        displayOrder: parsed.displayOrder,
        active: true,
      })
      .returning();

    return c.json({ message: "Domain created successfully", domain }, 201);
  })

  // ---------------------------------------------------------------------------
  // 2. Assessment Cycles (Periodic NABH Audit Cycles)
  // ---------------------------------------------------------------------------
  .get("/skill-assessment/cycles", async (c) => {
    const cycles = await db
      .select()
      .from(assessmentCycles)
      .orderBy(desc(assessmentCycles.year), desc(assessmentCycles.startDate));

    const formatted = cycles.map((cycle) => ({
      ...cycle,
      startDate: cycle.startDate ? String(cycle.startDate).slice(0, 10) : "",
      endDate: cycle.endDate ? String(cycle.endDate).slice(0, 10) : "",
    }));

    return c.json(formatted);
  })

  .post("/skill-assessment/cycles", async (c) => {
    if (!(await canManageAssessmentSettings(c))) {
      return c.json({ error: "Only Admin or HR can manage assessment cycles" }, 403);
    }

    const body = await c.req.json();
    const inputSchema = z
      .object({
        title: z.string().min(2, "Cycle title is required"),
        year: z.number().int().default(new Date().getFullYear()),
        quarter: z.string().default("Annual"),
        startDate: z.string().min(1, "Start date is required"),
        endDate: z.string().min(1, "End date is required"),
        status: z.enum(["draft", "active", "closed"]).default("active"),
        description: z.string().optional().nullable(),
      })
      .refine(
        (data) => {
          return new Date(data.endDate) >= new Date(data.startDate);
        },
        {
          message: "End date must be on or after start date",
          path: ["endDate"],
        }
      );

    const validated = inputSchema.parse(body);

    const [inserted] = await db
      .insert(assessmentCycles)
      .values(validated)
      .onConflictDoUpdate({
        target: assessmentCycles.title,
        set: {
          year: validated.year,
          quarter: validated.quarter,
          startDate: validated.startDate,
          endDate: validated.endDate,
          status: validated.status,
          description: validated.description,
          updatedAt: new Date(),
        },
      })
      .returning();

    return c.json({
      ...inserted,
      startDate: inserted.startDate ? String(inserted.startDate).slice(0, 10) : "",
      endDate: inserted.endDate ? String(inserted.endDate).slice(0, 10) : "",
    });
  })

  .put("/skill-assessment/cycles/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid cycle ID" }, 400);

    if (!(await canManageAssessmentSettings(c))) {
      return c.json({ error: "Only Admin or HR can manage assessment cycles" }, 403);
    }

    const body = await c.req.json();
    const inputSchema = z.object({
      title: z.string().min(2).optional(),
      year: z.number().int().optional(),
      quarter: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.enum(["draft", "active", "closed"]).optional(),
      description: z.string().optional().nullable(),
    });

    const parsed = inputSchema.parse(body);
    if (parsed.startDate && parsed.endDate && new Date(parsed.endDate) < new Date(parsed.startDate)) {
      return c.json({ error: "End date must be on or after start date" }, 400);
    }

    const [updated] = await db
      .update(assessmentCycles)
      .set({
        ...parsed,
        updatedAt: new Date(),
      })
      .where(eq(assessmentCycles.id, id))
      .returning();

    if (!updated) return c.json({ error: "Assessment cycle not found" }, 404);

    return c.json({
      ...updated,
      startDate: updated.startDate ? String(updated.startDate).slice(0, 10) : "",
      endDate: updated.endDate ? String(updated.endDate).slice(0, 10) : "",
    });
  })

  // ---------------------------------------------------------------------------
  // 3. User Role & Reviewer Access Meta
  // ---------------------------------------------------------------------------
  .get("/skill-assessment/my-permissions", async (c) => {
    const currentStaff = await getCurrentStaff(c);
    const userRole = (c.get("session")?.user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    const isHr = isAdmin || userRole === "hr" || (currentStaff?.role || "").toLowerCase() === "hr";

    let isNursingSuper = isAdmin;
    let isDeptIncharge = isAdmin;

    if (currentStaff?.staffId) {
      if (!isNursingSuper) {
        isNursingSuper = await isStaffNursingSuper(currentStaff.staffId);
      }
      // Check if user is incharge of ANY department
      const ledDepts = await db
        .select({ deptId: departmentLeaders.departmentId })
        .from(departmentLeaders)
        .where(
          or(
            eq(departmentLeaders.headStaffId, currentStaff.staffId),
            eq(departmentLeaders.subheadStaffId, currentStaff.staffId)
          )
        );
      isDeptIncharge = isAdmin || ledDepts.length > 0 || /incharge|head|lead/i.test(currentStaff.role || "");
    }

    const hospitalSettings = await getHospitalSettingsFromDb();
    const isStaffCompetencyModuleEnabled = hospitalSettings.enableStaffCompetencyModule;
    const canAccessModule = isStaffCompetencyModuleEnabled || isAdmin || isHr || isNursingSuper;

    return c.json({
      currentStaff,
      isAdmin,
      isHr,
      isNursingSuper,
      isDeptIncharge,
      canAssessAsIncharge: isDeptIncharge || isAdmin || isHr,
      canVerifyAsNursingSuper: isNursingSuper || isAdmin,
      canSignOffAsHr: isHr || isAdmin,
      isStaffCompetencyModuleEnabled,
      canAccessModule,
    });
  })

  // ---------------------------------------------------------------------------
  // 4. Pending Review Counts for Workflow Stages
  // ---------------------------------------------------------------------------
  .get("/skill-assessment/pending-counts", async (c) => {
    const currentStaff = await getCurrentStaff(c);
    const userRole = (c.get("session")?.user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    const isHr = isAdmin || userRole === "hr";

    // Dept Incharge pending count
    let pendingInchargeCount = 0;
    if (isAdmin || isHr) {
      const [res] = await db
        .select({ count: sql<number>`count(*)` })
        .from(staffSkillAssessments)
        .where(eq(staffSkillAssessments.status, "submitted_to_incharge"));
      pendingInchargeCount = Number(res?.count || 0);
    } else if (currentStaff?.staffId) {
      // Find departments this user leads
      const ledDepts = await db
        .select({ deptId: departmentLeaders.departmentId })
        .from(departmentLeaders)
        .where(
          or(
            eq(departmentLeaders.headStaffId, currentStaff.staffId),
            eq(departmentLeaders.subheadStaffId, currentStaff.staffId)
          )
        );
      const deptIds = ledDepts.map((d) => d.deptId);
      if (deptIds.length > 0) {
        const [res] = await db
          .select({ count: sql<number>`count(*)` })
          .from(staffSkillAssessments)
          .where(
            and(
              eq(staffSkillAssessments.status, "submitted_to_incharge"),
              inArray(staffSkillAssessments.departmentId, deptIds)
            )
          );
        pendingInchargeCount = Number(res?.count || 0);
      }
    }

    // Nursing Supervisor pending count
    let pendingNursingSuperCount = 0;
    const isNursingSuper = isAdmin || (currentStaff ? await isStaffNursingSuper(currentStaff.staffId) : false);
    if (isNursingSuper) {
      const [res] = await db
        .select({ count: sql<number>`count(*)` })
        .from(staffSkillAssessments)
        .where(eq(staffSkillAssessments.status, "submitted_to_nursing_super"));
      pendingNursingSuperCount = Number(res?.count || 0);
    }

    // HR pending count
    let pendingHrCount = 0;
    if (isHr) {
      const [res] = await db
        .select({ count: sql<number>`count(*)` })
        .from(staffSkillAssessments)
        .where(eq(staffSkillAssessments.status, "submitted_to_hr"));
      pendingHrCount = Number(res?.count || 0);
    }

    // My active draft / submitted
    let myAssessmentsCount = 0;
    if (currentStaff?.staffId) {
      const [res] = await db
        .select({ count: sql<number>`count(*)` })
        .from(staffSkillAssessments)
        .where(eq(staffSkillAssessments.staffId, currentStaff.staffId));
      myAssessmentsCount = Number(res?.count || 0);
    }

    return c.json({
      pendingIncharge: pendingInchargeCount,
      pendingNursingSuper: pendingNursingSuperCount,
      pendingHr: pendingHrCount,
      myAssessments: myAssessmentsCount,
    });
  })

  // ---------------------------------------------------------------------------
  // 5. List Assessments with Role-Aware Filters and Pagination
  // ---------------------------------------------------------------------------
  .get("/skill-assessment/list", async (c) => {
    const currentStaff = await getCurrentStaff(c);
    const userRole = (c.get("session")?.user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    const isHr = isAdmin || userRole === "hr";

    const queryTab = c.req.query("tab") || "all"; // "my", "incharge", "nursing_super", "hr", "all"
    const status = c.req.query("status");
    const departmentId = c.req.query("departmentId");
    const cycleId = c.req.query("cycleId");
    const search = c.req.query("search")?.trim();
    const page = parseInt(c.req.query("page") || "1", 10);
    const pageSize = parseInt(c.req.query("pageSize") || "20", 10);
    const offset = (page - 1) * pageSize;

    const conditions: any[] = [];

    // Every tab/filter must stay inside the caller's assessment visibility.
    const actor = await getAssessmentActor(c);
    if (!actor.isHr && !actor.isSuper) {
      if (!currentStaff) return c.json({ error: "Staff profile required" }, 403);
      const ledDepartments = await db.select({ id: departmentLeaders.departmentId }).from(departmentLeaders)
        .where(or(eq(departmentLeaders.headStaffId, currentStaff.staffId), eq(departmentLeaders.subheadStaffId, currentStaff.staffId)));
      const namedDepartments = await db.select({ id: departments.id }).from(departments).where(or(
        currentStaff.name?.trim() ? sql`lower(trim(${departments.head})) = ${currentStaff.name.trim().toLowerCase()}` : sql`false`,
        /incharge|head|lead|supervisor/i.test(currentStaff.role || "")
          ? sql`${departments.id} in (select ${staffDepartments.departmentId} from ${staffDepartments}
              where ${staffDepartments.staffId} = ${currentStaff.staffId} and ${staffDepartments.status} = 'Active')`
          : sql`false`,
      ));
      const deptIds = [...new Set([...ledDepartments, ...namedDepartments].map((dept) => dept.id))];
      conditions.push(or(eq(staffSkillAssessments.staffId, currentStaff.staffId),
        deptIds.length ? inArray(staffSkillAssessments.departmentId, deptIds) : sql`false`));
    }

    // Filter by Tab / Scope
    if (queryTab === "my") {
      if (!currentStaff?.staffId) {
        return c.json({ data: [], pagination: { page: 1, pageSize, totalRecords: 0, totalPages: 0 } });
      }
      conditions.push(eq(staffSkillAssessments.staffId, currentStaff.staffId));
    } else if (queryTab === "incharge") {
      conditions.push(eq(staffSkillAssessments.status, "submitted_to_incharge"));
      if (!isAdmin && !isHr && currentStaff?.staffId) {
        const ledDepts = await db
          .select({ deptId: departmentLeaders.departmentId })
          .from(departmentLeaders)
          .where(
            or(
              eq(departmentLeaders.headStaffId, currentStaff.staffId),
              eq(departmentLeaders.subheadStaffId, currentStaff.staffId)
            )
          );
        const deptIds = ledDepts.map((d) => d.deptId);
        if (deptIds.length > 0) {
          conditions.push(inArray(staffSkillAssessments.departmentId, deptIds));
        } else {
          return c.json({ data: [], pagination: { page: 1, pageSize, totalRecords: 0, totalPages: 0 } });
        }
      }
    } else if (queryTab === "nursing_super") {
      conditions.push(eq(staffSkillAssessments.status, "submitted_to_nursing_super"));
    } else if (queryTab === "hr") {
      conditions.push(
        or(
          eq(staffSkillAssessments.status, "submitted_to_hr"),
          eq(staffSkillAssessments.status, "completed"),
          eq(staffSkillAssessments.status, "training_required")
        )
      );
    }

    if (status && status !== "all") {
      conditions.push(eq(staffSkillAssessments.status, status));
    }
    if (departmentId && departmentId !== "all") {
      conditions.push(eq(staffSkillAssessments.departmentId, parseInt(departmentId, 10)));
    }
    if (cycleId && cycleId !== "all") {
      conditions.push(eq(staffSkillAssessments.cycleId, parseInt(cycleId, 10)));
    }

    // Join staff for name and department
    const baseQuery = db
      .select({
        id: staffSkillAssessments.id,
        assessmentNo: staffSkillAssessments.assessmentNo,
        cycleId: staffSkillAssessments.cycleId,
        staffId: staffSkillAssessments.staffId,
        departmentId: staffSkillAssessments.departmentId,
        designation: staffSkillAssessments.designation,
        status: staffSkillAssessments.status,
        selfAssessedAt: staffSkillAssessments.selfAssessedAt,
        selfOverallScore: staffSkillAssessments.selfOverallScore,
        selfTheoreticalScore: staffSkillAssessments.selfTheoreticalScore,
        selfPracticalScore: staffSkillAssessments.selfPracticalScore,
        inchargeStaffId: staffSkillAssessments.inchargeStaffId,
        inchargeAssessedAt: staffSkillAssessments.inchargeAssessedAt,
        inchargeOverallScore: staffSkillAssessments.inchargeOverallScore,
        inchargeDecision: staffSkillAssessments.inchargeDecision,
        nursingSuperStaffId: staffSkillAssessments.nursingSuperStaffId,
        nursingSuperAssessedAt: staffSkillAssessments.nursingSuperAssessedAt,
        nursingSuperOverallScore: staffSkillAssessments.nursingSuperOverallScore,
        nursingSuperDecision: staffSkillAssessments.nursingSuperDecision,
        hrCompletedAt: staffSkillAssessments.hrCompletedAt,
        finalScore: staffSkillAssessments.finalScore,
        competencyLevel: staffSkillAssessments.competencyLevel,
        hrDecision: staffSkillAssessments.hrDecision,
        nextAssessmentDueDate: staffSkillAssessments.nextAssessmentDueDate,
        createdAt: staffSkillAssessments.createdAt,
        updatedAt: staffSkillAssessments.updatedAt,
        startDate: staffSkillAssessments.startDate,
        endDate: staffSkillAssessments.endDate,
        // Joined details
        staffName: staff.name,
        employeeCode: staff.employeeCode,
        departmentName: departments.name,
        cycleTitle: assessmentCycles.title,
        cycleStartDate: assessmentCycles.startDate,
        cycleEndDate: assessmentCycles.endDate,
      })
      .from(staffSkillAssessments)
      .innerJoin(
        staff,
        sql`${staffSkillAssessments.staffId} = ${staff.staffId} AND ${staff.active} = true`
      )
      .innerJoin(departments, eq(staffSkillAssessments.departmentId, departments.id))
      .leftJoin(assessmentCycles, eq(staffSkillAssessments.cycleId, assessmentCycles.id));

    if (search) {
      const q = `%${search}%`;
      conditions.push(
        or(
          ilike(staffSkillAssessments.assessmentNo, q),
          ilike(staff.name, q),
          ilike(staff.employeeCode, q),
          ilike(staffSkillAssessments.designation, q),
          ilike(departments.name, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(staffSkillAssessments)
      .innerJoin(
        staff,
        sql`${staffSkillAssessments.staffId} = ${staff.staffId} AND ${staff.active} = true`
      )
      .innerJoin(departments, eq(staffSkillAssessments.departmentId, departments.id))
      .where(whereClause);

    const totalRecords = Number(count || 0);

    const rows = await baseQuery
      .where(whereClause)
      .orderBy(desc(staffSkillAssessments.createdAt))
      .limit(pageSize)
      .offset(offset);

    return c.json({
      data: rows,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize),
      },
    });
  })

  // ---------------------------------------------------------------------------
  // 5b. Analytics & NABH Competency Training Gap Matrix
  // ---------------------------------------------------------------------------
  // 5. NABH Analytics & Competency Gap Metrics
  // ---------------------------------------------------------------------------
  .get("/skill-assessment/analytics", async (c) => {
    const cycleId = c.req.query("cycleId");

    const conditions: any[] = [];
    if (cycleId && cycleId !== "all") {
      conditions.push(eq(staffSkillAssessments.cycleId, parseInt(cycleId, 10)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total counts by status
    const allAssessments = await db
      .select({
        id: staffSkillAssessments.id,
        status: staffSkillAssessments.status,
        finalScore: staffSkillAssessments.finalScore,
        competencyLevel: staffSkillAssessments.competencyLevel,
        departmentId: staffSkillAssessments.departmentId,
        departmentName: departments.name,
      })
      .from(staffSkillAssessments)
      .innerJoin(departments, eq(staffSkillAssessments.departmentId, departments.id))
      .where(whereClause);

    const total = allAssessments.length;
    const completed = allAssessments.filter(
      (a) => a.status === "completed" || a.status === "training_required"
    ).length;
    const pendingIncharge = allAssessments.filter(
      (a) => a.status === "submitted_to_incharge"
    ).length;
    const pendingSuper = allAssessments.filter(
      (a) => a.status === "submitted_to_nursing_super"
    ).length;
    const pendingHr = allAssessments.filter(
      (a) => a.status === "submitted_to_hr"
    ).length;
    const inDraft = allAssessments.filter((a) => a.status === "draft").length;

    // Competency Level Distribution
    const levelCounts: Record<string, number> = {
      Exemplary: 0,
      Competent: 0,
      Developing: 0,
      "Needs Immediate Training": 0,
    };
    allAssessments.forEach((a) => {
      if (a.competencyLevel && levelCounts[a.competencyLevel] !== undefined) {
        levelCounts[a.competencyLevel]++;
      }
    });

    // Department-wise averages
    const deptMap = new Map<string, { total: number; sumScore: number }>();
    allAssessments.forEach((a) => {
      if (toNum(a.finalScore) > 0) {
        const cur = deptMap.get(a.departmentName) || { total: 0, sumScore: 0 };
        cur.total += 1;
        cur.sumScore += toNum(a.finalScore);
        deptMap.set(a.departmentName, cur);
      }
    });

    const departmentStats = Array.from(deptMap.entries()).map(([dept, val]) => ({
      department: dept,
      assessedStaff: val.total,
      averageScore: (val.sumScore / val.total).toFixed(2),
    }));

    return c.json({
      kpis: {
        total,
        completed,
        pendingIncharge,
        pendingSuper,
        pendingHr,
        inDraft,
        complianceRate: total > 0 ? ((completed / total) * 100).toFixed(1) + "%" : "0%",
      },
      levelCounts,
      departmentStats,
    });
  })

  // ---------------------------------------------------------------------------
  // 6. Question Bank: List Questions
  // ---------------------------------------------------------------------------
  .get("/skill-assessment/questions", async (c) => {
    const userRole = (c.get("session")?.user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    let isHr = isAdmin || userRole === "hr";
    if (!isHr) {
      const currentStaff = await getCurrentStaff(c);
      isHr =
        (currentStaff?.role || "").toLowerCase() === "hr" ||
        (currentStaff?.department || "").toLowerCase() === "hr";
    }

    if (!isHr) {
      return c.json({ error: "Unauthorized. HR or Admin role required to access the Question Bank." }, 403);
    }

    const department = c.req.query("department");
    const domainCode = c.req.query("domainCode");
    const difficulty = c.req.query("difficulty");
    const search = c.req.query("search");
    const includeInactive = c.req.query("includeInactive") === "true";

    const questions = await db
      .select()
      .from(theoreticalQuestions)
      .where(includeInactive ? undefined : eq(theoreticalQuestions.active, true))
      .orderBy(asc(theoreticalQuestions.code));

    let filtered = questions;

    if (department && department !== "all") {
      filtered = filtered.filter((q) => {
        const tags = Array.isArray(q.departmentTags) ? (q.departmentTags as string[]) : [];
        return tags.some((t) => t.toLowerCase().includes(department.toLowerCase()) || t.toLowerCase() === "all");
      });
    }

    if (domainCode && domainCode !== "all") {
      filtered = filtered.filter((q) => q.domainCode.toUpperCase() === domainCode.toUpperCase());
    }

    if (difficulty && difficulty !== "all") {
      filtered = filtered.filter((q) => q.difficulty.toLowerCase() === difficulty.toLowerCase());
    }

    if (search && search.trim()) {
      const qLower = search.toLowerCase().trim();
      filtered = filtered.filter(
        (q) =>
          q.code.toLowerCase().includes(qLower) ||
          q.question.toLowerCase().includes(qLower) ||
          q.domainCode.toLowerCase().includes(qLower)
      );
    }

    const pageStr = c.req.query("page");
    const pageSizeStr = c.req.query("pageSize");

    // If page parameter is supplied, return standard server-side pagination envelope
    if (pageStr !== undefined) {
      const page = Math.max(1, parseInt(pageStr, 10) || 1);
      const rawPageSize = parseInt(pageSizeStr || "25", 10);
      const pageSize = isNaN(rawPageSize) ? 25 : rawPageSize;
      const totalRecords = filtered.length;

      if (pageSize <= 0) {
        return c.json({
          data: filtered,
          pagination: {
            page: 1,
            pageSize: totalRecords,
            totalRecords,
            totalPages: 1,
          },
        });
      }

      const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
      const offset = (page - 1) * pageSize;
      const paginated = filtered.slice(offset, offset + pageSize);

      return c.json({
        data: paginated,
        pagination: {
          page,
          pageSize,
          totalRecords,
          totalPages,
        },
      });
    }

    return c.json(filtered);
  })

  // ---------------------------------------------------------------------------
  // 7. Question Bank: Create Question
  // ---------------------------------------------------------------------------
  .post("/skill-assessment/questions", async (c) => {
    const userRole = (c.get("session")?.user?.role || "").toLowerCase();
    const currentStaff = await getCurrentStaff(c);
    const isAdmin = userRole === "admin";
    const isHr =
      isAdmin ||
      userRole === "hr" ||
      (currentStaff?.role || "").toLowerCase() === "hr" ||
      (currentStaff?.department || "").toLowerCase() === "hr";

    if (!isHr) {
      return c.json({ error: "Unauthorized. HR or Admin role required." }, 403);
    }

    const body = await c.req.json();
    const schema = z.object({
      code: z.string().min(3).max(50),
      domainCode: z.string().min(2).max(50),
      question: z.string().min(5, "Question text must be at least 5 characters"),
      options: z.array(z.string().min(1)).min(2).max(6),
      correctOptionIndex: z.number().int().min(0).max(5),
      explanation: z.string().optional().nullable(),
      departmentTags: z.array(z.string()).default([]),
      difficulty: z.enum(["basic", "medium", "advanced"]).default("medium"),
      defaultTimeSeconds: z.number().int().min(15).max(300).default(60),
      active: z.boolean().default(true),
    });

    const parsed = schema.parse(body);

    if (parsed.correctOptionIndex >= parsed.options.length) {
      return c.json({ error: "Correct option index must point to one of the provided options" }, 400);
    }

    // Check unique code
    const existing = await db
      .select({ id: theoreticalQuestions.id })
      .from(theoreticalQuestions)
      .where(eq(theoreticalQuestions.code, parsed.code.trim().toUpperCase()))
      .limit(1)
      .then((r) => r[0]);

    if (existing) {
      return c.json({ error: `Question with code '${parsed.code.trim().toUpperCase()}' already exists` }, 400);
    }

    const [created] = await db
      .insert(theoreticalQuestions)
      .values({
        code: parsed.code.trim().toUpperCase(),
        domainCode: parsed.domainCode.trim().toUpperCase(),
        question: parsed.question.trim(),
        options: parsed.options,
        correctOptionIndex: parsed.correctOptionIndex,
        explanation: parsed.explanation || null,
        departmentTags: parsed.departmentTags,
        difficulty: parsed.difficulty,
        defaultTimeSeconds: parsed.defaultTimeSeconds,
        active: parsed.active,
      })
      .returning();

    return c.json(created, 201);
  })

  // ---------------------------------------------------------------------------
  // 8. Question Bank: Update Question
  // ---------------------------------------------------------------------------
  .put("/skill-assessment/questions/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid question ID" }, 400);

    const userRole = (c.get("session")?.user?.role || "").toLowerCase();
    const currentStaff = await getCurrentStaff(c);
    const isAdmin = userRole === "admin";
    const isHr =
      isAdmin ||
      userRole === "hr" ||
      (currentStaff?.role || "").toLowerCase() === "hr" ||
      (currentStaff?.department || "").toLowerCase() === "hr";

    if (!isHr) {
      return c.json({ error: "Unauthorized. HR or Admin role required." }, 403);
    }

    const body = await c.req.json();
    const schema = z.object({
      code: z.string().min(3).max(50).optional(),
      domainCode: z.string().min(2).max(50).optional(),
      question: z.string().min(5).optional(),
      options: z.array(z.string().min(1)).min(2).max(6).optional(),
      correctOptionIndex: z.number().int().min(0).max(5).optional(),
      explanation: z.string().optional().nullable(),
      departmentTags: z.array(z.string()).optional(),
      difficulty: z.enum(["basic", "medium", "advanced"]).optional(),
      defaultTimeSeconds: z.number().int().min(15).max(300).optional(),
      active: z.boolean().optional(),
    });

    const parsed = schema.parse(body);

    const [updated] = await db
      .update(theoreticalQuestions)
      .set({
        ...(parsed.code ? { code: parsed.code.trim().toUpperCase() } : {}),
        ...(parsed.domainCode ? { domainCode: parsed.domainCode.trim().toUpperCase() } : {}),
        ...(parsed.question ? { question: parsed.question.trim() } : {}),
        ...(parsed.options ? { options: parsed.options } : {}),
        ...(parsed.correctOptionIndex !== undefined ? { correctOptionIndex: parsed.correctOptionIndex } : {}),
        ...(parsed.explanation !== undefined ? { explanation: parsed.explanation } : {}),
        ...(parsed.departmentTags !== undefined ? { departmentTags: parsed.departmentTags } : {}),
        ...(parsed.difficulty ? { difficulty: parsed.difficulty } : {}),
        ...(parsed.defaultTimeSeconds ? { defaultTimeSeconds: parsed.defaultTimeSeconds } : {}),
        ...(parsed.active !== undefined ? { active: parsed.active } : {}),
        updatedAt: new Date(),
      })
      .where(eq(theoreticalQuestions.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Question not found" }, 404);
    }

    return c.json(updated);
  })

  // ---------------------------------------------------------------------------
  // 9. Question Bank: Delete / Deactivate Question
  // ---------------------------------------------------------------------------
  .delete("/skill-assessment/questions/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid question ID" }, 400);

    const userRole = (c.get("session")?.user?.role || "").toLowerCase();
    const currentStaff = await getCurrentStaff(c);
    const isAdmin = userRole === "admin";
    const isHr =
      isAdmin ||
      userRole === "hr" ||
      (currentStaff?.role || "").toLowerCase() === "hr" ||
      (currentStaff?.department || "").toLowerCase() === "hr";

    if (!isHr) {
      return c.json({ error: "Unauthorized. HR or Admin role required." }, 403);
    }

    const [deleted] = await db
      .update(theoreticalQuestions)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(theoreticalQuestions.id, id))
      .returning();

    if (!deleted) {
      return c.json({ error: "Question not found" }, 404);
    }

    return c.json({ success: true, message: "Question deactivated successfully" });
  })

  // ---------------------------------------------------------------------------
  // 10. Exam Configuration: Get Active Settings
  // ---------------------------------------------------------------------------
  .get("/skill-assessment/exam/config", async (c) => {
    const [cfg] = await db
      .select()
      .from(examConfigs)
      .where(eq(examConfigs.active, true))
      .orderBy(asc(examConfigs.id))
      .limit(1);

    if (cfg) {
      return c.json(cfg);
    }

    // Default configuration: 20 questions, 20 mins total (1200s), 60s per question
    return c.json({
      title: "Clinical Staff NABH Theoretical Examination",
      totalQuestions: 20,
      totalTimeSeconds: 1200,
      perQuestionTimeSeconds: 60,
      passPercentage: "60.00",
      ...DEFAULT_EXAM_MIX,
      active: true,
    });
  })

  // ---------------------------------------------------------------------------
  // 11. Exam Configuration: Update Settings (Admin and HR)
  // ---------------------------------------------------------------------------
  .put("/skill-assessment/exam/config", async (c) => {
    if (!(await canManageAssessmentSettings(c))) {
      return c.json({ error: "Only HR and Admin can manage assessment settings." }, 403);
    }

    const body = await c.req.json();
    const schema = z.object({
      title: z.string().min(3).optional(),
      totalQuestions: z.number().int().min(5).max(100).default(20),
      totalTimeSeconds: z.number().int().min(120).max(7200).default(1200),
      perQuestionTimeSeconds: z.number().int().min(15).max(600).default(60),
      passPercentage: z.number().min(30).max(100).default(60),
      basicPercentage: z.number().int().min(0).max(100).default(DEFAULT_EXAM_MIX.basicPercentage),
      mediumPercentage: z.number().int().min(0).max(100).default(DEFAULT_EXAM_MIX.mediumPercentage),
      advancedPercentage: z.number().int().min(0).max(100).default(DEFAULT_EXAM_MIX.advancedPercentage),
      departmentPercentage: z.number().int().min(0).max(100).default(DEFAULT_EXAM_MIX.departmentPercentage),
    }).refine(v => v.basicPercentage + v.mediumPercentage + v.advancedPercentage === 100, {
      message: "Basic, medium and advanced percentages must total 100%.",
    });

    const result = schema.safeParse(body);
    if (!result.success) return c.json({ error: result.error.issues.map(i => i.message).join(" ") }, 400);
    const parsed = result.data;

    const [existing] = await db
      .select()
      .from(examConfigs)
      .where(eq(examConfigs.active, true))
      .orderBy(asc(examConfigs.id))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(examConfigs)
        .set({
          ...(parsed.title ? { title: parsed.title } : {}),
          totalQuestions: parsed.totalQuestions,
          basicPercentage: parsed.basicPercentage,
          mediumPercentage: parsed.mediumPercentage,
          advancedPercentage: parsed.advancedPercentage,
          departmentPercentage: parsed.departmentPercentage,
          totalTimeSeconds: parsed.totalTimeSeconds,
          perQuestionTimeSeconds: parsed.perQuestionTimeSeconds,
          passPercentage: parsed.passPercentage.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(examConfigs.id, existing.id))
        .returning();
      return c.json(updated);
    }

    const [created] = await db
      .insert(examConfigs)
      .values({
        title: parsed.title || "Clinical Staff NABH Theoretical Examination",
        totalQuestions: parsed.totalQuestions,
        basicPercentage: parsed.basicPercentage,
        mediumPercentage: parsed.mediumPercentage,
        advancedPercentage: parsed.advancedPercentage,
        departmentPercentage: parsed.departmentPercentage,
        totalTimeSeconds: parsed.totalTimeSeconds,
        perQuestionTimeSeconds: parsed.perQuestionTimeSeconds,
        passPercentage: parsed.passPercentage.toFixed(2),
        active: true,
      })
      .returning();

    return c.json(created);
  })

  // ---------------------------------------------------------------------------
  // 12. Online Exam: Start Assessment Session (Configured question count)
  // ---------------------------------------------------------------------------
  .post("/skill-assessment/exam/start", async (c) => {
    const currentStaff = await getCurrentStaff(c);

    if (!currentStaff) {
      return c.json({ error: "A linked staff profile is required to take an examination." }, 403);
    }

    const parsed = z.object({ assessmentId: z.number().int().positive().nullish() }).safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: "Invalid assessment ID" }, 400);
    const assessmentId = parsed.data.assessmentId ?? null;

    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(72419, ${currentStaff.staffId})`);

      const targetStaffId = currentStaff.staffId;
      let candidateDeptId: number | null = null;
      let candidateDeptName: string | null = null;

      if (assessmentId) {
        const [assessment] = await tx
          .select({
            id: staffSkillAssessments.id,
            staffId: staffSkillAssessments.staffId,
            status: staffSkillAssessments.status,
            departmentId: staffSkillAssessments.departmentId,
            departmentName: departments.name,
          })
          .from(staffSkillAssessments)
          .innerJoin(departments, eq(staffSkillAssessments.departmentId, departments.id))
          .where(eq(staffSkillAssessments.id, assessmentId))
          .limit(1);

        if (!assessment) return c.json({ error: "Assessment not found" }, 404);
        if (assessment.staffId !== targetStaffId) return c.json({ error: "You can only take your own examination." }, 403);
        if (!["draft", "revision_requested"].includes(assessment.status)) {
          return c.json({ error: "Examinations can only be taken during self-assessment." }, 409);
        }
        candidateDeptId = assessment.departmentId;
        candidateDeptName = assessment.departmentName;
      }

      if (!candidateDeptName && currentStaff) {
        // Find staff's department
        const [deptRecord] = await tx
          .select({ id: departments.id, name: departments.name })
          .from(staffDepartments)
          .innerJoin(departments, eq(staffDepartments.departmentId, departments.id))
          .where(and(eq(staffDepartments.staffId, currentStaff.staffId), eq(staffDepartments.status, "Active")))
          .limit(1);

        if (deptRecord) {
          candidateDeptId = deptRecord.id;
          candidateDeptName = deptRecord.name;
        } else {
          candidateDeptName = "General Nursing";
        }
      }

      // -------------------------------------------------------------------------
      // Anti-Misuse & Progress Resumption: Check for existing IN-PROGRESS attempt
      // -------------------------------------------------------------------------
      const [existingAttempt] = await tx
        .select()
        .from(examAttempts)
        .where(
          and(
            eq(examAttempts.staffId, targetStaffId),
            eq(examAttempts.status, "in_progress")
          )
        )
        .orderBy(desc(examAttempts.startedAt))
        .limit(1);

      if (existingAttempt) {
        const remainingSeconds = examRemainingSeconds(existingAttempt.startedAt, existingAttempt.totalTimeSeconds);
        const questions = existingAttempt.questionSnapshot;
        if (!questions?.length || questions.length !== (existingAttempt.questionIds as number[]).length) {
          return c.json({ error: "This attempt has incomplete question history. Please contact HR." }, 409);
        }
        // Expired sessions resume with zero time so saved answers are graded by submit.
        return c.json({
          attemptId: existingAttempt.id,
          attemptNo: existingAttempt.attemptNo,
          assessmentId: existingAttempt.assessmentId,
          departmentName: existingAttempt.departmentName || candidateDeptName,
          totalQuestions: existingAttempt.totalQuestions,
          totalTimeSeconds: existingAttempt.totalTimeSeconds,
          remainingSeconds,
          perQuestionTimeSeconds: existingAttempt.perQuestionTimeSeconds,
          passPercentage: existingAttempt.passPercentage,
          isResumed: true,
          savedAnswers: examSelectedAnswers(questions, (existingAttempt.answers || {}) as Record<string, unknown>),
          questions: publicExamQuestions(questions),
        });
      }

      // One new attempt per staff member per India calendar month, irrespective
      // of linked assessment or outcome. The staff advisory lock above serializes
      // this check with creation; resuming an existing session consumes no new slot.
      const startedAt = new Date();
      const month = cbtCalendarMonthWindow(startedAt);
      const [monthlyAttempt] = await tx.select({ id: examAttempts.id })
        .from(examAttempts)
        .where(and(
          eq(examAttempts.staffId, targetStaffId),
          // timestamptz bounds keep India midnight correct against the database
          // session's timestamp convention (started_at is timestamp without TZ).
          gte(examAttempts.startedAt, sql`${month.start.toISOString()}::timestamptz`),
          sql`${examAttempts.startedAt} < ${month.next.toISOString()}::timestamptz`,
        ))
        .limit(1);
      if (monthlyAttempt) {
        const nextDate = month.next.toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric",
        });
        return c.json({
          code: "CBT_MONTHLY_LIMIT",
          error: `Only one CBT exam is allowed per calendar month (India time). Your next exam is available on ${nextDate}.`,
          nextEligibleAt: month.next.toISOString(),
        }, 429);
      }

      // Load active exam configuration
      const [config] = await tx
        .select()
        .from(examConfigs)
        .where(eq(examConfigs.active, true))
        .orderBy(asc(examConfigs.id))
        .limit(1);

      const targetQuestionsCount = config?.totalQuestions || 20;
      const totalTimeSeconds = config?.totalTimeSeconds || 1200;
      const perQuestionTimeSeconds = config?.perQuestionTimeSeconds || 60;
      const passPercentage = config?.passPercentage || "60.00";

      // Fetch all active questions from question bank
      const allQuestions = await tx
        .select()
        .from(theoreticalQuestions)
        .where(eq(theoreticalQuestions.active, true));

      if (allQuestions.length === 0) {
        return c.json({ error: "No active questions found in the question bank." }, 400);
      }

      const finalExamQuestions = selectExamQuestions(allQuestions, targetQuestionsCount, candidateDeptName || "", {
        basicPercentage: config?.basicPercentage ?? DEFAULT_EXAM_MIX.basicPercentage,
        mediumPercentage: config?.mediumPercentage ?? DEFAULT_EXAM_MIX.mediumPercentage,
        advancedPercentage: config?.advancedPercentage ?? DEFAULT_EXAM_MIX.advancedPercentage,
        departmentPercentage: config?.departmentPercentage ?? DEFAULT_EXAM_MIX.departmentPercentage,
      });

      // Generate unique sequential attempt number using PostgreSQL database sequence: EXAM-YYYY-XXXX
      const year = new Date().getFullYear();
      const attemptNo = await getNextExamAttemptNo(year, tx);

      // Record the attempt in database
      const [attempt] = await tx
        .insert(examAttempts)
        .values({
          attemptNo,
          assessmentId: assessmentId || null,
          staffId: targetStaffId,
          departmentId: candidateDeptId || null,
          departmentName: candidateDeptName || null,
          status: "in_progress",
          startedAt,
          totalQuestions: finalExamQuestions.length,
          totalTimeSeconds,
          perQuestionTimeSeconds,
          questionIds: finalExamQuestions.map((q) => q.id),
          questionSnapshot: snapshotExamQuestions(finalExamQuestions),
          passPercentage: String(passPercentage),
          answers: {},
        })
        .returning();

      // Return sanitized questions to client (STRIP correctOptionIndex and explanation!)
      return c.json({
        attemptId: attempt.id,
        attemptNo: attempt.attemptNo,
        assessmentId: attempt.assessmentId,
        departmentName: candidateDeptName,
        totalQuestions: finalExamQuestions.length,
        totalTimeSeconds,
        perQuestionTimeSeconds,
        passPercentage,
        questions: finalExamQuestions.map((q, idx) => ({
          id: q.id,
          index: idx + 1,
          code: q.code,
          domainCode: q.domainCode,
          question: q.question,
          options: q.options,
          difficulty: q.difficulty,
          defaultTimeSeconds: q.defaultTimeSeconds || perQuestionTimeSeconds,
        })),
      });
    });
  })

  // ---------------------------------------------------------------------------
  // 12b. Online Exam: Real-Time Progress Auto-Save & Heartbeat
  // ---------------------------------------------------------------------------
  .patch("/skill-assessment/exam/:attemptId/progress", async (c) => {
    const attemptId = Number(c.req.param("attemptId"));
    if (!Number.isInteger(attemptId) || attemptId <= 0) return c.json({ error: "Invalid attempt ID" }, 400);
    const currentStaff = await getCurrentStaff(c);
    const body = await c.req.json().catch(() => ({}));
    return db.transaction(async (tx) => {
      const [attempt] = await tx.select().from(examAttempts).where(eq(examAttempts.id, attemptId)).for("update");
      if (!attempt) return c.json({ error: "Attempt not found" }, 404);
      if (!currentStaff || currentStaff.staffId !== attempt.staffId) {
        return c.json({ error: "You can only save your own examination." }, 403);
      }
      if (attempt.status !== "in_progress") return c.json({ error: "Attempt is no longer in progress" }, 409);
      const remainingSeconds = examRemainingSeconds(attempt.startedAt, attempt.totalTimeSeconds);
      if (remainingSeconds > 0) {
        const parsed = z.object({ answers: z.record(z.string(), z.number().int().min(-1).max(5)) }).safeParse(body);
        if (!parsed.success) return c.json({ error: "Invalid examination answers" }, 400);
        const answers = examSelectedAnswers(attempt.questionSnapshot || [], parsed.data.answers);
        await tx.update(examAttempts).set({
          answers, timeSpentSeconds: attempt.totalTimeSeconds - remainingSeconds, updatedAt: new Date(),
        }).where(eq(examAttempts.id, attemptId));
      }
      return c.json({ success: true, remainingSeconds, isExpired: remainingSeconds <= 0 });
    });
  })

  // Grade with the immutable question version and the attempt's passing threshold.
  .post("/skill-assessment/exam/:attemptId/submit", async (c) => {
    const attemptId = Number(c.req.param("attemptId"));
    if (!Number.isInteger(attemptId) || attemptId <= 0) return c.json({ error: "Invalid attempt ID" }, 400);
    const currentStaff = await getCurrentStaff(c);
    const body = await c.req.json().catch(() => ({}));
    return db.transaction(async (tx) => {
      const [attempt] = await tx.select().from(examAttempts).where(eq(examAttempts.id, attemptId)).for("update");
      if (!attempt) return c.json({ error: "Exam attempt not found" }, 404);
      if (!currentStaff || currentStaff.staffId !== attempt.staffId) {
        return c.json({ error: "You can only submit your own examination." }, 403);
      }
      if (attempt.status !== "in_progress") return c.json({ error: "This exam attempt has already ended." }, 409);
      const questions = attempt.questionSnapshot;
      if (!questions?.length || questions.length !== (attempt.questionIds as number[]).length) {
        return c.json({ error: "This attempt has incomplete question history. Please contact HR." }, 409);
      }
      const remainingSeconds = examRemainingSeconds(attempt.startedAt, attempt.totalTimeSeconds);
      const expired = remainingSeconds <= 0;
      const answerSchema = z.record(z.string(), z.union([
        z.number().int().min(-1).max(5),
        z.object({ selectedOptionIndex: z.number().int().min(-1).max(5), timeSpentSeconds: z.number().nonnegative().optional() }),
      ]));
      const parsed = answerSchema.safeParse(body.answers || {});
      if (!expired && !parsed.success) return c.json({ error: "Invalid examination answers" }, 400);
      // Never accept new answers after the deadline, including late browser auto-submit.
      const answers = expired ? attempt.answers || {} : parsed.success ? parsed.data : {};
      const result = gradeExam(questions, answers as Record<string, unknown>, Number(attempt.passPercentage));
      const timeSpentSeconds = attempt.totalTimeSeconds - remainingSeconds;
      const processedAnswers = Object.fromEntries(result.review.map((q) => [String(q.id), {
        selectedOptionIndex: q.selectedOptionIndex, isCorrect: q.isCorrect, correctOptionIndex: q.correctOptionIndex,
      }]));
      await tx.update(examAttempts).set({
        status: expired ? "timed_out" : "completed", completedAt: new Date(), updatedAt: new Date(),
        timeSpentSeconds, score: result.score.toFixed(2), theoreticalRating: result.theoreticalRating.toFixed(2),
        correctCount: result.correctCount, incorrectCount: result.incorrectCount,
        unansweredCount: result.unansweredCount, answers: processedAnswers,
      }).where(eq(examAttempts.id, attemptId));

      let syncedAssessment = null;
      if (attempt.assessmentId) {
        // Lock the header before changing items; workflow transitions use the same lock.
        const [assessment] = await tx.select().from(staffSkillAssessments)
          .where(eq(staffSkillAssessments.id, attempt.assessmentId)).for("update");
        if (assessment && assessment.staffId === attempt.staffId && ["draft", "revision_requested"].includes(assessment.status)) {
          const aggregate = await assessmentCbtResult(assessment, tx);
          if (!aggregate) return c.json({ ...result, attemptId, attemptNo: attempt.attemptNo, timeSpentSeconds, expired, syncedToAssessmentId: null, syncedAssessment: null });
          const practical = toNum(assessment.selfPracticalScore);
          [syncedAssessment] = await tx.update(staffSkillAssessments).set({
            selfTheoreticalScore: aggregate.theoreticalRating.toFixed(2),
            selfOverallScore: ((aggregate.theoreticalRating + practical) / 2).toFixed(2), updatedAt: new Date(),
          }).where(eq(staffSkillAssessments.id, assessment.id)).returning();
          const criteria = await tx.select({ criterionId: staffSkillAssessmentItems.criterionId, domainCode: competencyDomains.code })
            .from(staffSkillAssessmentItems)
            .innerJoin(competencyCriteria, eq(staffSkillAssessmentItems.criterionId, competencyCriteria.id))
            .innerJoin(competencyDomains, eq(competencyCriteria.domainId, competencyDomains.id))
            .where(eq(staffSkillAssessmentItems.assessmentId, assessment.id));
          for (const criterion of criteria) {
            const rating = aggregate.domainRatings[criterion.domainCode];
            await tx.update(staffSkillAssessmentItems).set({
              selfTheoreticalScore: rating == null ? null : rating.toFixed(2), updatedAt: new Date(),
            }).where(and(eq(staffSkillAssessmentItems.assessmentId, assessment.id), eq(staffSkillAssessmentItems.criterionId, criterion.criterionId)));
          }
        }
      }
      return c.json({
        ...result, attemptId, attemptNo: attempt.attemptNo, timeSpentSeconds, expired,
        syncedToAssessmentId: syncedAssessment?.id ?? null, syncedAssessment,
      });
    });
  })

  // ---------------------------------------------------------------------------
  // 14. Online Exam: Get Attempts List
  // ---------------------------------------------------------------------------
  .get("/skill-assessment/exam/attempts", async (c) => {
    const currentStaff = await getCurrentStaff(c);
    const userRole = (c.get("session")?.user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    const isHr = isAdmin || userRole === "hr" || (currentStaff?.role || "").toLowerCase() === "hr";
    const isSuper = isAdmin || (currentStaff ? await isStaffNursingSuper(currentStaff.staffId) : false);

    const assessmentId = c.req.query("assessmentId") ? parseInt(c.req.query("assessmentId")!, 10) : null;
    const staffIdParam = c.req.query("staffId") ? parseInt(c.req.query("staffId")!, 10) : null;

    let query = db
      .select({
        id: examAttempts.id,
        attemptNo: examAttempts.attemptNo,
        assessmentId: examAttempts.assessmentId,
        staffId: examAttempts.staffId,
        staffName: staff.name,
        departmentName: examAttempts.departmentName,
        status: examAttempts.status,
        totalQuestions: examAttempts.totalQuestions,
        score: examAttempts.score,
        theoreticalRating: examAttempts.theoreticalRating,
        correctCount: examAttempts.correctCount,
        incorrectCount: examAttempts.incorrectCount,
        unansweredCount: examAttempts.unansweredCount,
        timeSpentSeconds: examAttempts.timeSpentSeconds,
        startedAt: examAttempts.startedAt,
        completedAt: examAttempts.completedAt,
      })
      .from(examAttempts)
      // staff_id is versioned; historical profile rows must not multiply attempts.
      .leftJoin(staff, and(eq(examAttempts.staffId, staff.staffId), eq(staff.active, true)))
      .orderBy(desc(examAttempts.startedAt), desc(examAttempts.id))
      .$dynamic();

    const conditions = [];

    if (assessmentId) {
      conditions.push(eq(examAttempts.assessmentId, assessmentId));
    }

    if (!isAdmin && !isHr && !isSuper) {
      if (!currentStaff) return c.json({ error: "Staff profile required" }, 403);
      conditions.push(eq(examAttempts.staffId, currentStaff.staffId));
    }
    if (staffIdParam) conditions.push(eq(examAttempts.staffId, staffIdParam));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const attempts = await query.limit(50);
    return c.json(attempts);
  })

  // ---------------------------------------------------------------------------
  // Printable result certificates contain saved result metadata only, never keys.
  .get("/skill-assessment/exam/attempts/:attemptId/certificate", async (c) => {
    const id = Number(c.req.param("attemptId"));
    if (!Number.isInteger(id) || id <= 0) return c.json({ error: "Invalid attempt ID" }, 400);
    const [attempt] = await db.select({
      staffId: examAttempts.staffId, attemptNo: examAttempts.attemptNo,
      status: examAttempts.status, completedAt: examAttempts.completedAt,
      score: examAttempts.score, passPercentage: examAttempts.passPercentage,
      departmentName: examAttempts.departmentName, totalQuestions: examAttempts.totalQuestions,
      correctCount: examAttempts.correctCount, theoreticalRating: examAttempts.theoreticalRating,
    }).from(examAttempts).where(eq(examAttempts.id, id)).limit(1);
    if (!attempt) return c.json({ error: "Exam attempt not found" }, 404);
    const currentStaff = await getCurrentStaff(c);
    const role = (c.get("session")?.user?.role || "").toLowerCase();
    const manager = role === "admin" || role === "hr" || currentStaff?.role?.toLowerCase() === "hr";
    if (currentStaff?.staffId !== attempt.staffId && !manager) {
      return c.json({ error: "You can only print your own CBT result certificate." }, 403);
    }
    if (!canPrintCbtCertificate(attempt.status) || !attempt.completedAt) {
      return c.json({ error: "A certificate is available only after the exam result has been finalized." }, 409);
    }
    const score = Number(attempt.score);
    const benchmark = Number(attempt.passPercentage);
    if (attempt.score == null || attempt.passPercentage == null || !Number.isFinite(score) ||
      !Number.isFinite(benchmark) || score < 0 || score > 100 || benchmark < 0 || benchmark > 100) {
      return c.json({ error: "This attempt has incomplete result information. Please contact HR." }, 409);
    }
    const [employee] = await db.select({ name: staff.name, code: staff.employeeCode })
      .from(staff).where(and(eq(staff.staffId, attempt.staffId), eq(staff.active, true)))
      .orderBy(desc(staff.version)).limit(1);
    if (!employee) return c.json({ error: "The employee record could not be found. Please contact HR." }, 404);
    const hospital = await getHospitalSettingsFromDb();
    const certificate: CbtCertificate = {
      reference: `CBT-${attempt.attemptNo}`,
      hospital: { name: hospital.name, address: hospital.address || null },
      employee: { name: employee.name, code: employee.code, department: attempt.departmentName },
      exam: {
        attemptNo: attempt.attemptNo, completedAt: attempt.completedAt.toISOString(), status: attempt.status,
        score, passPercentage: benchmark, passed: score >= benchmark,
        totalQuestions: attempt.totalQuestions, correctCount: attempt.correctCount ?? 0,
        theoreticalRating: Number(attempt.theoreticalRating ?? 0),
      },
    };
    c.header("Cache-Control", "private, no-store");
    return c.json(certificate);
  })

  // 15. Online Exam: Get Attempt Review Details
  // ---------------------------------------------------------------------------
  .get("/skill-assessment/exam/attempts/:attemptId", async (c) => {
    const attemptId = Number(c.req.param("attemptId"));
    if (!Number.isInteger(attemptId) || attemptId <= 0) return c.json({ error: "Invalid attempt ID" }, 400);
    const [attempt] = await db.select().from(examAttempts).where(eq(examAttempts.id, attemptId)).limit(1);
    if (!attempt) return c.json({ error: "Attempt not found" }, 404);
    if (!await canReadAssessment(c, attempt)) return c.json({ error: "Access denied" }, 403);
    const { questionSnapshot, answers, ...metadata } = attempt;
    const questions = questionSnapshot || [];
    // Never serialize the private snapshot or processed answer keys for a live exam.
    if (attempt.status === "in_progress") {
      return c.json({
        attempt: { ...metadata, answers: examSelectedAnswers(questions, (answers || {}) as Record<string, unknown>) },
        review: publicExamQuestions(questions),
      });
    }
    const result = gradeExam(questions, (answers || {}) as Record<string, unknown>, Number(attempt.passPercentage));
    return c.json({ attempt: { ...metadata, answers }, review: result.review, domainResults: result.domainResults });
  })

  // ---------------------------------------------------------------------------
  // 16. Get Assessment Detail (Full 360° View with All Line Items & Rubrics)
  // ---------------------------------------------------------------------------
  .get("/skill-assessment/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid assessment ID" }, 400);

    const header = await db
      .select({
        id: staffSkillAssessments.id,
        assessmentNo: staffSkillAssessments.assessmentNo,
        cycleId: staffSkillAssessments.cycleId,
        staffId: staffSkillAssessments.staffId,
        departmentId: staffSkillAssessments.departmentId,
        designation: staffSkillAssessments.designation,
        status: staffSkillAssessments.status,
        selfAssessedAt: staffSkillAssessments.selfAssessedAt,
        selfOverallScore: staffSkillAssessments.selfOverallScore,
        selfTheoreticalScore: staffSkillAssessments.selfTheoreticalScore,
        selfPracticalScore: staffSkillAssessments.selfPracticalScore,
        selfRemarks: staffSkillAssessments.selfRemarks,
        inchargeStaffId: staffSkillAssessments.inchargeStaffId,
        inchargeAssessedAt: staffSkillAssessments.inchargeAssessedAt,
        inchargeOverallScore: staffSkillAssessments.inchargeOverallScore,
        inchargeTheoreticalScore: staffSkillAssessments.inchargeTheoreticalScore,
        inchargePracticalScore: staffSkillAssessments.inchargePracticalScore,
        inchargeDecision: staffSkillAssessments.inchargeDecision,
        inchargeRemarks: staffSkillAssessments.inchargeRemarks,
        nursingSuperStaffId: staffSkillAssessments.nursingSuperStaffId,
        nursingSuperAssessedAt: staffSkillAssessments.nursingSuperAssessedAt,
        nursingSuperOverallScore: staffSkillAssessments.nursingSuperOverallScore,
        nursingSuperTheoreticalScore: staffSkillAssessments.nursingSuperTheoreticalScore,
        nursingSuperPracticalScore: staffSkillAssessments.nursingSuperPracticalScore,
        nursingSuperDecision: staffSkillAssessments.nursingSuperDecision,
        nursingSuperRemarks: staffSkillAssessments.nursingSuperRemarks,
        clinicalStrengths: staffSkillAssessments.clinicalStrengths,
        improvementAreas: staffSkillAssessments.improvementAreas,
        hrUserId: staffSkillAssessments.hrUserId,
        hrCompletedAt: staffSkillAssessments.hrCompletedAt,
        finalScore: staffSkillAssessments.finalScore,
        competencyLevel: staffSkillAssessments.competencyLevel,
        hrDecision: staffSkillAssessments.hrDecision,
        assignedTrainings: staffSkillAssessments.assignedTrainings,
        nextAssessmentDueDate: staffSkillAssessments.nextAssessmentDueDate,
        hrRemarks: staffSkillAssessments.hrRemarks,
        createdAt: staffSkillAssessments.createdAt,
        updatedAt: staffSkillAssessments.updatedAt,
        startDate: staffSkillAssessments.startDate,
        endDate: staffSkillAssessments.endDate,
        // Joined details
        staffName: staff.name,
        employeeCode: staff.employeeCode,
        departmentName: departments.name,
        cycleTitle: assessmentCycles.title,
        cycleStartDate: assessmentCycles.startDate,
        cycleEndDate: assessmentCycles.endDate,
      })
      .from(staffSkillAssessments)
      .innerJoin(
        staff,
        sql`${staffSkillAssessments.staffId} = ${staff.staffId} AND ${staff.active} = true`
      )
      .innerJoin(departments, eq(staffSkillAssessments.departmentId, departments.id))
      .leftJoin(assessmentCycles, eq(staffSkillAssessments.cycleId, assessmentCycles.id))
      .where(eq(staffSkillAssessments.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!header) {
      return c.json({ error: "Assessment record not found" }, 404);
    }

    if (!await canReadAssessment(c, header)) return c.json({ error: "Access denied" }, 403);

    // Fetch line items with competency criteria and domain info
    const items = await db
      .select({
        id: staffSkillAssessmentItems.id,
        assessmentId: staffSkillAssessmentItems.assessmentId,
        criterionId: staffSkillAssessmentItems.criterionId,
        selfTheoreticalScore: staffSkillAssessmentItems.selfTheoreticalScore,
        selfPracticalScore: staffSkillAssessmentItems.selfPracticalScore,
        selfComments: staffSkillAssessmentItems.selfComments,
        inchargeTheoreticalScore: staffSkillAssessmentItems.inchargeTheoreticalScore,
        inchargePracticalScore: staffSkillAssessmentItems.inchargePracticalScore,
        inchargeComments: staffSkillAssessmentItems.inchargeComments,
        nursingSuperTheoreticalScore: staffSkillAssessmentItems.nursingSuperTheoreticalScore,
        nursingSuperPracticalScore: staffSkillAssessmentItems.nursingSuperPracticalScore,
        nursingSuperComments: staffSkillAssessmentItems.nursingSuperComments,
        isSatisfactory: staffSkillAssessmentItems.isSatisfactory,
        // Criterion details
        criterionCode: competencyCriteria.code,
        criterionTitle: competencyCriteria.title,
        criterionDescription: competencyCriteria.description,
        clinicalScenario: competencyCriteria.clinicalScenario,
        skillType: competencyCriteria.skillType,
        theoreticalGuideline: competencyCriteria.theoreticalGuideline,
        practicalGuideline: competencyCriteria.practicalGuideline,
        targetScore: competencyCriteria.targetScore,
        weightage: competencyCriteria.weightage,
        domainId: competencyCriteria.domainId,
        domainCode: competencyDomains.code,
        domainName: competencyDomains.name,
        nabhStandardRef: competencyDomains.nabhStandardRef,
      })
      .from(staffSkillAssessmentItems)
      .innerJoin(competencyCriteria, eq(staffSkillAssessmentItems.criterionId, competencyCriteria.id))
      .innerJoin(competencyDomains, eq(competencyCriteria.domainId, competencyDomains.id))
      .where(eq(staffSkillAssessmentItems.assessmentId, id))
      .orderBy(asc(competencyDomains.displayOrder), asc(competencyCriteria.displayOrder));

    // Evaluator name lookups if available
    let inchargeName = null;
    if (header.inchargeStaffId) {
      const inchargeStaff = await db
        .select({ name: staff.name })
        .from(staff)
        .where(sql`${staff.staffId} = ${header.inchargeStaffId} AND ${staff.active} = true`)
        .limit(1)
        .then((r) => r[0]);
      inchargeName = inchargeStaff?.name;
    }

    let nursingSuperName = null;
    if (header.nursingSuperStaffId) {
      const superStaff = await db
        .select({ name: staff.name })
        .from(staff)
        .where(sql`${staff.staffId} = ${header.nursingSuperStaffId} AND ${staff.active} = true`)
        .limit(1)
        .then((r) => r[0]);
      nursingSuperName = superStaff?.name;
    }

    let hrUserName = null;
    if (header.hrUserId) {
      const hrUser = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, header.hrUserId))
        .limit(1)
        .then((r) => r[0]);
      hrUserName = hrUser?.name;
    }

    const cbtAttempt = await assessmentCbtResult({ ...header, id });

    return c.json({
      cbtTheoryScore: cbtAttempt ? Number(cbtAttempt.theoreticalRating) : null,
      cbtDomainRatings: cbtAttempt?.domainRatings ?? {},
      cbtAttemptCount: cbtAttempt?.attemptCount ?? 0,
      assessment: {
        ...header,
        inchargeName,
        nursingSuperName,
        hrUserName,
      },
      items,
    });
  })

  // ---------------------------------------------------------------------------
  // 7. Start / Initiate a New Skill Assessment
  // ---------------------------------------------------------------------------
  .post("/skill-assessment/start", async (c) => {
    const currentStaff = await getCurrentStaff(c);
    const userRole = (c.get("session")?.user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    const isHr = isAdmin || userRole === "hr";

    const body = await c.req.json();
    const inputSchema = z.object({
      staffId: z.number().int().positive().optional(), // If omitted, defaults to current staff (self)
      cycleId: z.number().int().positive().optional(),
      startDate: z.string().optional().nullable(),
      endDate: z.string().optional().nullable(),
    });
    const parsed = inputSchema.parse(body);

    const targetStaffId = parsed.staffId || currentStaff?.staffId;
    if (!targetStaffId) {
      return c.json({ error: "Staff member identity required to initiate assessment" }, 400);
    }

    // Only HR/Admin can initiate on behalf of other staff
    if (parsed.staffId && parsed.staffId !== currentStaff?.staffId && !isHr && !isAdmin) {
      // Check if current user is dept incharge of candidate
      // We allow incharge to initiate for staff in their dept
    }

    // Lookup staff profile & department
    const targetStaff = await db
      .select({
        staffId: staff.staffId,
        name: staff.name,
        role: staff.role,
      })
      .from(staff)
      .where(sql`${staff.staffId} = ${targetStaffId} AND ${staff.active} = true`)
      .limit(1)
      .then((r) => r[0]);

    if (!targetStaff) {
      return c.json({ error: "Active staff record not found" }, 404);
    }

    // Find active department of staff
    const deptRow = await db.execute(sql`
      SELECT sd.department_id, d.name as department_name
      FROM staff_departments sd
      JOIN staff s ON s.staff_id = sd.staff_id AND s.version = sd.staff_version
      JOIN departments d ON d.id = sd.department_id
      WHERE sd.staff_id = ${targetStaffId} AND s.active = true AND sd.status = 'Active'
      ORDER BY sd.id DESC LIMIT 1
    `);

    const deptId = (deptRow.rows[0] as any)?.department_id;
    if (!deptId) {
      return c.json({ error: "Staff member has no active department assignment" }, 400);
    }

    // Resolve assessment cycle / period
    let targetCycle: any = null;
    if (parsed.cycleId) {
      targetCycle = await db
        .select()
        .from(assessmentCycles)
        .where(eq(assessmentCycles.id, parsed.cycleId))
        .limit(1)
        .then((r) => r[0]);
    }
    if (!targetCycle) {
      targetCycle = await db
        .select()
        .from(assessmentCycles)
        .where(eq(assessmentCycles.status, "active"))
        .limit(1)
        .then((r) => r[0]);
    }

    if (!targetCycle) {
      return c.json(
        { error: "No active assessment period found. Please configure an assessment cycle first." },
        400
      );
    }

    const cycleId = targetCycle.id;

    // Enforce uniqueness: only 1 assessment per staff member per assessment period
    const existing = await db
      .select({
        id: staffSkillAssessments.id,
        assessmentNo: staffSkillAssessments.assessmentNo,
        status: staffSkillAssessments.status,
      })
      .from(staffSkillAssessments)
      .where(and(eq(staffSkillAssessments.staffId, targetStaffId), eq(staffSkillAssessments.cycleId, cycleId)))
      .limit(1)
      .then((r) => r[0]);

    if (existing) {
      return c.json(
        {
          error: `An assessment (${existing.assessmentNo}) already exists for this staff member in ${targetCycle.title}. Each staff member can only have one assessment per assessment period.`,
          assessment: existing,
          assessmentId: existing.id,
          alreadyExists: true,
        },
        409
      );
    }

    // Determine assessment start and end dates
    const startDate = parsed.startDate || (targetCycle.startDate ? String(targetCycle.startDate).slice(0, 10) : null);
    const endDate = parsed.endDate || (targetCycle.endDate ? String(targetCycle.endDate).slice(0, 10) : null);

    // Generate unique assessment number using PostgreSQL database sequence: SKL-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const assessmentNo = await getNextAssessmentNo(currentYear);

    // Create assessment header
    const [newAssessment] = await db
      .insert(staffSkillAssessments)
      .values({
        assessmentNo,
        cycleId,
        staffId: targetStaffId,
        departmentId: deptId,
        designation: targetStaff.role || "Clinical Staff",
        status: "draft",
        startDate,
        endDate,
      })
      .returning();

    // Populate all active competency criteria line items
    const allCriteria = await db
      .select({ id: competencyCriteria.id })
      .from(competencyCriteria)
      .where(eq(competencyCriteria.active, true))
      .orderBy(asc(competencyCriteria.displayOrder));

    if (allCriteria.length > 0) {
      const itemsToInsert = allCriteria.map((cr) => ({
        assessmentId: newAssessment.id,
        criterionId: cr.id,
        selfTheoreticalScore: "0",
        selfPracticalScore: "0",
      }));
      await db.insert(staffSkillAssessmentItems).values(itemsToInsert);
    }

    return c.json({
      ok: true,
      assessment: newAssessment,
      message: `Skill assessment ${assessmentNo} initiated successfully.`,
    });
  })

  // ---------------------------------------------------------------------------
  // 7b. Delete Draft Assessment (Admin or Candidate User Before Incharge Submission)
  // ---------------------------------------------------------------------------
  .delete("/skill-assessment/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid assessment ID" }, 400);

    const userRole = (c.get("session")?.user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    const currentStaff = await getCurrentStaff(c);

    const assessment = await db
      .select({
        id: staffSkillAssessments.id,
        assessmentNo: staffSkillAssessments.assessmentNo,
        status: staffSkillAssessments.status,
        staffId: staffSkillAssessments.staffId,
      })
      .from(staffSkillAssessments)
      .where(eq(staffSkillAssessments.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!assessment) {
      return c.json({ error: "Assessment record not found" }, 404);
    }

    const isOwnSelfAssessment = Boolean(
      currentStaff?.staffId && currentStaff.staffId === assessment.staffId
    );

    if (!isAdmin && !isOwnSelfAssessment) {
      return c.json(
        {
          error:
            "Unauthorized. Only administrators or the candidate staff member can delete a draft self-assessment.",
        },
        403
      );
    }

    if (assessment.status !== "draft") {
      return c.json(
        {
          error: `Only draft self-assessments can be deleted before submission to the Department Incharge. Assessment '${assessment.assessmentNo}' is currently in '${assessment.status}' status and cannot be deleted to preserve the workflow audit trail.`,
        },
        400
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(staffSkillAssessmentItems)
        .where(eq(staffSkillAssessmentItems.assessmentId, id));

      await tx
        .delete(staffSkillAssessments)
        .where(eq(staffSkillAssessments.id, id));
    });

    return c.json({
      ok: true,
      message: `Draft self-assessment ${assessment.assessmentNo} deleted successfully.`,
      deletedId: id,
    });
  })

  // ---------------------------------------------------------------------------
  // 8. Stage 1: Clinical Staff Self-Assessment Submission
  // Clinical Staff -> Dept Incharge
  // ---------------------------------------------------------------------------
  .put("/skill-assessment/:id/self-submit", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    const currentStaff = await getCurrentStaff(c);
    const userRole = (c.get("session")?.user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin";

    return db.transaction(async (tx) => {
      const record = await tx
        .select()
        .from(staffSkillAssessments)
        .where(eq(staffSkillAssessments.id, id))
        .for("update")
        .limit(1)
        .then((r) => r[0]);

      if (!record) return c.json({ error: "Assessment not found" }, 404);

      // Verify candidate identity
      if (!isAdmin && record.staffId !== currentStaff?.staffId) {
        return c.json({ error: "You can only submit your own self-assessment" }, 403);
      }

      if (record.status !== "draft" && record.status !== "revision_requested") {
        return c.json({ error: `Cannot submit self-assessment in current status: ${record.status}` }, 400);
      }

      const itemSchema = z.object({
        criterionId: z.number().int().positive(),
        selfTheoreticalScore: z.number().min(0).max(5).nullable(),
        selfPracticalScore: z.number().min(1).max(5).nullable(),
        selfComments: z.string().optional().nullable(),
      });

      const bodySchema = z.object({
        items: z.array(itemSchema).min(1, "At least one evaluation item is required"),
        selfRemarks: z.string().optional().nullable(),
        isDraftOnly: z.boolean().default(false),
      });

      const parsedBody = bodySchema.safeParse(await c.req.json());
      if (!parsedBody.success) return c.json({ error: parsedBody.error.issues[0]?.message || "Invalid assessment ratings" }, 400);
      const body = parsedBody.data;
      const expectedItems = await tx.select({ criterionId: staffSkillAssessmentItems.criterionId, domainCode: competencyDomains.code })
        .from(staffSkillAssessmentItems)
        .innerJoin(competencyCriteria, eq(staffSkillAssessmentItems.criterionId, competencyCriteria.id))
        .innerJoin(competencyDomains, eq(competencyCriteria.domainId, competencyDomains.id))
        .where(eq(staffSkillAssessmentItems.assessmentId, id));

      const cbtAttempt = await assessmentCbtResult(record, tx);
      if (!cbtAttempt && !body.isDraftOnly) return c.json({ error: "Complete your online CBT exam before submitting the self-assessment." }, 400);
      // Theory is never supplied by the candidate. Drafts without CBT remain unrated.
      body.items.forEach(item => {
        const domain = expectedItems.find(criterion => criterion.criterionId === item.criterionId)?.domainCode;
        item.selfTheoreticalScore = domain ? cbtAttempt?.domainRatings[domain] ?? null : null;
      });
      const unassessed = new Set(expectedItems.filter(item => cbtAttempt && cbtAttempt.domainRatings[item.domainCode] == null).map(item => item.criterionId));
      const ratingError = validateAssessmentRatings(expectedItems.map((it) => it.criterionId),
        body.items.map((it) => ({ criterionId: it.criterionId, theory: it.selfTheoreticalScore, practical: it.selfPracticalScore })),
        body.isDraftOnly, Boolean(cbtAttempt), unassessed);
      if (ratingError) return c.json({ error: ratingError }, 400);

      // Update line items
      let totalPractical = 0;

      for (const item of body.items) {
        totalPractical += item.selfPracticalScore ?? 0;

        await tx
          .update(staffSkillAssessmentItems)
          .set({
            selfTheoreticalScore: item.selfTheoreticalScore?.toFixed(2) ?? null,
            selfPracticalScore: item.selfPracticalScore?.toFixed(2) ?? null,
            selfComments: item.selfComments || null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(staffSkillAssessmentItems.assessmentId, id),
              eq(staffSkillAssessmentItems.criterionId, item.criterionId)
            )
          );
      }

      const avgTheory = cbtAttempt ? Number(cbtAttempt.theoreticalRating) : 0;
      const practicalCount = body.items.filter((it) => it.selfPracticalScore !== null).length;
      const avgPractical = practicalCount > 0 ? totalPractical / practicalCount : 0;
      const overallSelf = (avgTheory + avgPractical) / 2;

      const nextStatus = body.isDraftOnly ? record.status : "submitted_to_incharge";

      const [updated] = await tx
        .update(staffSkillAssessments)
        .set({
          selfAssessedAt: new Date(),
          selfTheoreticalScore: avgTheory.toFixed(2),
          selfPracticalScore: avgPractical.toFixed(2),
          selfOverallScore: overallSelf.toFixed(2),
          selfRemarks: body.selfRemarks || null,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(staffSkillAssessments.id, id))
        .returning();

      return c.json({
        ok: true,
        assessment: updated,
        message: body.isDraftOnly
          ? "Draft self-assessment saved."
          : "Self-assessment successfully submitted to Department Incharge for review.",
      });
    });
  })

  // ---------------------------------------------------------------------------
  // 9. Stage 2: Dept Incharge Assessment & Forwarding
  // Dept Incharge -> Nursing Supervisor
  // ---------------------------------------------------------------------------
  .put("/skill-assessment/:id/incharge-submit", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    const currentStaff = await getCurrentStaff(c);
    const userRole = (c.get("session")?.user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    const isHr = isAdmin || userRole === "hr" || currentStaff?.role?.toLowerCase() === "hr";

    return db.transaction(async (tx) => {
      const record = await tx
        .select()
        .from(staffSkillAssessments)
        .where(eq(staffSkillAssessments.id, id))
        .for("update")
        .limit(1)
        .then((r) => r[0]);

      if (!record) return c.json({ error: "Assessment not found" }, 404);

      if (record.status !== "submitted_to_incharge") {
        return c.json(
          { error: `Assessment is not currently awaiting Dept Incharge review (status: ${record.status})` },
          400
        );
      }

      // Check incharge permissions
      if (!isAdmin && !isHr) {
        if (!currentStaff?.staffId) return c.json({ error: "Unauthorized" }, 403);
        const isLead = await isStaffDeptIncharge(currentStaff.staffId, record.departmentId, tx);
        if (!isLead) {
          return c.json({ error: "You are not designated as Dept Incharge for this department" }, 403);
        }
      }

      const itemSchema = z.object({
        criterionId: z.number().int().positive(),
        inchargeTheoreticalScore: z.number().min(1).max(5),
        inchargePracticalScore: z.number().min(1).max(5),
        inchargeComments: z.string().optional().nullable(),
      });

      const bodySchema = z.object({
        items: z.array(itemSchema).min(1, "Evaluation scores required"),
        decision: z.enum([
          "recommended",
          "needs_supervised_practice",
          "remedial_training_needed",
          "revision_requested",
        ]),
        inchargeRemarks: z.string().min(1, "Incharge remarks/observations are required"),
      });

      const parsedBody = bodySchema.safeParse(await c.req.json());
      if (!parsedBody.success) return c.json({ error: parsedBody.error.issues[0]?.message || "Invalid assessment ratings" }, 400);
      const body = parsedBody.data;
      const expectedItems = await tx.select({ criterionId: staffSkillAssessmentItems.criterionId })
        .from(staffSkillAssessmentItems).where(eq(staffSkillAssessmentItems.assessmentId, id));

      const ratingError = validateAssessmentRatings(expectedItems.map((it) => it.criterionId),
        body.items.map((it) => ({ criterionId: it.criterionId, theory: it.inchargeTheoreticalScore, practical: it.inchargePracticalScore })), false);
      if (ratingError) return c.json({ error: ratingError }, 400);

      // Update line items with incharge scores
      let totalTheory = 0;
      let totalPractical = 0;
      let count = 0;

      for (const item of body.items) {
        totalTheory += item.inchargeTheoreticalScore;
        totalPractical += item.inchargePracticalScore;
        count++;

        await tx
          .update(staffSkillAssessmentItems)
          .set({
            inchargeTheoreticalScore: item.inchargeTheoreticalScore.toFixed(2),
            inchargePracticalScore: item.inchargePracticalScore.toFixed(2),
            inchargeComments: item.inchargeComments || null,
            isSatisfactory:
              item.inchargeTheoreticalScore >= 3 && item.inchargePracticalScore >= 3,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(staffSkillAssessmentItems.assessmentId, id),
              eq(staffSkillAssessmentItems.criterionId, item.criterionId)
            )
          );
      }

      const avgTheory = count > 0 ? totalTheory / count : 0;
      const avgPractical = count > 0 ? totalPractical / count : 0;
      const overallIncharge = (avgTheory + avgPractical) / 2;

      const nextStatus =
        body.decision === "revision_requested"
          ? "revision_requested"
          : "submitted_to_nursing_super";

      const [updated] = await tx
        .update(staffSkillAssessments)
        .set({
          inchargeStaffId: currentStaff?.staffId || null,
          inchargeAssessedAt: new Date(),
          inchargeTheoreticalScore: avgTheory.toFixed(2),
          inchargePracticalScore: avgPractical.toFixed(2),
          inchargeOverallScore: overallIncharge.toFixed(2),
          inchargeDecision: body.decision,
          inchargeRemarks: body.inchargeRemarks,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(staffSkillAssessments.id, id))
        .returning();

      return c.json({
        ok: true,
        assessment: updated,
        message:
          body.decision === "revision_requested"
            ? "Assessment sent back to staff for revision."
            : "Assessment successfully verified by Incharge and forwarded to Nursing Supervisor.",
      });
    });
  })

  // ---------------------------------------------------------------------------
  // 10. Stage 3: Nursing Supervisor Verification & Forwarding
  // Nursing Supervisor -> HR
  // ---------------------------------------------------------------------------
  .put("/skill-assessment/:id/nursing-super-submit", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    const currentStaff = await getCurrentStaff(c);
    const userRole = (c.get("session")?.user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    const isHr = isAdmin || userRole === "hr" || currentStaff?.role?.toLowerCase() === "hr";

    return db.transaction(async (tx) => {
      const record = await tx
        .select()
        .from(staffSkillAssessments)
        .where(eq(staffSkillAssessments.id, id))
        .for("update")
        .limit(1)
        .then((r) => r[0]);

      if (!record) return c.json({ error: "Assessment not found" }, 404);

      if (record.status !== "submitted_to_nursing_super") {
        return c.json(
          { error: `Assessment is not currently awaiting Nursing Supervisor review (status: ${record.status})` },
          400
        );
      }

      // Check nursing supervisor access
      if (!isAdmin && !isHr) {
        if (!currentStaff?.staffId) return c.json({ error: "Unauthorized" }, 403);
        const isSuper = await isStaffNursingSuper(currentStaff.staffId, tx);
        if (!isSuper) {
          return c.json({ error: "You are not designated as an active Nursing Supervisor" }, 403);
        }
      }

      const itemSchema = z.object({
        criterionId: z.number().int().positive(),
        nursingSuperTheoreticalScore: z.number().min(1).max(5),
        nursingSuperPracticalScore: z.number().min(1).max(5),
        nursingSuperComments: z.string().optional().nullable(),
      });

      const bodySchema = z.object({
        items: z.array(itemSchema).min(1, "Supervisor verification scores required"),
        decision: z.enum([
          "verified_competent",
          "conditional_training",
          "reassessment_recommended",
          "revision_requested",
        ]),
        nursingSuperRemarks: z.string().min(1, "Nursing supervisor verification remarks are required"),
        clinicalStrengths: z.string().optional().nullable(),
        improvementAreas: z.string().optional().nullable(),
      });

      const parsedBody = bodySchema.safeParse(await c.req.json());
      if (!parsedBody.success) return c.json({ error: parsedBody.error.issues[0]?.message || "Invalid assessment ratings" }, 400);
      const body = parsedBody.data;
      const expectedItems = await tx.select({ criterionId: staffSkillAssessmentItems.criterionId })
        .from(staffSkillAssessmentItems).where(eq(staffSkillAssessmentItems.assessmentId, id));

      const ratingError = validateAssessmentRatings(expectedItems.map((it) => it.criterionId),
        body.items.map((it) => ({ criterionId: it.criterionId, theory: it.nursingSuperTheoreticalScore, practical: it.nursingSuperPracticalScore })), false);
      if (ratingError) return c.json({ error: ratingError }, 400);

      let totalTheory = 0;
      let totalPractical = 0;
      let count = 0;

      for (const item of body.items) {
        totalTheory += item.nursingSuperTheoreticalScore;
        totalPractical += item.nursingSuperPracticalScore;
        count++;

        await tx
          .update(staffSkillAssessmentItems)
          .set({
            nursingSuperTheoreticalScore: item.nursingSuperTheoreticalScore.toFixed(2),
            nursingSuperPracticalScore: item.nursingSuperPracticalScore.toFixed(2),
            nursingSuperComments: item.nursingSuperComments || null,
            isSatisfactory:
              item.nursingSuperTheoreticalScore >= 3 && item.nursingSuperPracticalScore >= 3,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(staffSkillAssessmentItems.assessmentId, id),
              eq(staffSkillAssessmentItems.criterionId, item.criterionId)
            )
          );
      }

      const avgTheory = count > 0 ? totalTheory / count : 0;
      const avgPractical = count > 0 ? totalPractical / count : 0;
      const overallSuper = (avgTheory + avgPractical) / 2;

      const nextStatus =
        body.decision === "revision_requested"
          ? "revision_requested"
          : "submitted_to_hr";

      const [updated] = await tx
        .update(staffSkillAssessments)
        .set({
          nursingSuperStaffId: currentStaff?.staffId || null,
          nursingSuperAssessedAt: new Date(),
          nursingSuperTheoreticalScore: avgTheory.toFixed(2),
          nursingSuperPracticalScore: avgPractical.toFixed(2),
          nursingSuperOverallScore: overallSuper.toFixed(2),
          nursingSuperDecision: body.decision,
          nursingSuperRemarks: body.nursingSuperRemarks,
          clinicalStrengths: body.clinicalStrengths || null,
          improvementAreas: body.improvementAreas || null,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(staffSkillAssessments.id, id))
        .returning();

      return c.json({
        ok: true,
        assessment: updated,
        message:
          body.decision === "revision_requested"
            ? "Assessment sent back for revision."
            : "Assessment verified by Nursing Supervisor and forwarded to HR for final sign-off.",
      });
    });
  })

  // ---------------------------------------------------------------------------
  // 11. Stage 4: HR Final Review & Sign-Off
  // HR -> Completed / Training Required
  // ---------------------------------------------------------------------------
  .put("/skill-assessment/:id/hr-signoff", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    const currentStaff = await getCurrentStaff(c);
    const session = c.get("session");
    const userRole = (session?.user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    const isHr = isAdmin || userRole === "hr" || currentStaff?.role?.toLowerCase() === "hr";

    if (!isHr && !isAdmin) {
      return c.json({ error: "Only HR or Administrator can execute final sign-off" }, 403);
    }

    return db.transaction(async (tx) => {
      const record = await tx
        .select()
        .from(staffSkillAssessments)
        .where(eq(staffSkillAssessments.id, id))
        .for("update")
        .limit(1)
        .then((r) => r[0]);

      if (!record) return c.json({ error: "Assessment not found" }, 404);

      if (record.status !== "submitted_to_hr") {
        return c.json(
          { error: `Assessment is not currently awaiting HR sign-off (status: ${record.status})` },
          400
        );
      }

      const bodySchema = z.object({
        hrDecision: z.enum(["approved", "training_assigned", "needs_reassessment"]),
        competencyLevel: z.enum(["Exemplary", "Competent", "Developing", "Needs Immediate Training"]),
        assignedTrainings: z.array(z.string()).default([]),
        nextAssessmentDueDate: z.string().optional().nullable(),
        hrRemarks: z.string().min(1, "HR sign-off remarks are required"),
      });

      const body = bodySchema.parse(await c.req.json());

      // Consolidated Final Score:
      // Weighted formula: 20% Self + 40% Incharge + 40% Nursing Super
      const sSelf = toNum(record.selfOverallScore);
      const sIncharge = toNum(record.inchargeOverallScore);
      const sSuper = toNum(record.nursingSuperOverallScore);

      let compositeScore = 0;
      if (sIncharge > 0 && sSuper > 0 && sSelf > 0) {
        compositeScore = sSelf * 0.2 + sIncharge * 0.4 + sSuper * 0.4;
      } else if (sIncharge > 0 && sSuper > 0) {
        compositeScore = sIncharge * 0.5 + sSuper * 0.5;
      } else {
        compositeScore = sSuper || sIncharge || sSelf;
      }

      const nextStatus =
        body.hrDecision === "training_assigned"
          ? "training_required"
          : body.hrDecision === "needs_reassessment"
          ? "revision_requested"
          : "completed";

      // Default next assessment due date: 1 year from now (NABH standard)
      const dueDate =
        body.nextAssessmentDueDate ||
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const [updated] = await tx
        .update(staffSkillAssessments)
        .set({
          hrUserId: session?.user?.id || null,
          hrCompletedAt: new Date(),
          finalScore: compositeScore.toFixed(2),
          competencyLevel: body.competencyLevel,
          hrDecision: body.hrDecision,
          assignedTrainings: body.assignedTrainings,
          nextAssessmentDueDate: dueDate,
          hrRemarks: body.hrRemarks,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(staffSkillAssessments.id, id))
        .returning();

      return c.json({
        ok: true,
        assessment: updated,
        message: `Skill assessment ${record.assessmentNo} finalized and archived in HR staff records.`,
      });
    });
  });

