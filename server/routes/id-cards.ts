import { Hono } from "hono";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import { db, pool } from "../db/client.ts";
import type { AuthEnv } from "../auth.ts";
import {
  staff,
  departments,
  staffDepartments,
  staffHrProfiles,
  nursingStudents,
  nursingBatches,
  nursingCourses,
  idCardTemplates,
  idCardIssuances,
  type IdCardLayoutConfig,
} from "../db/schema.ts";
import {
  jsonBody,
  requireAdmin,
  hasCollegeAccess,
  hasHrOrAccountsViewAccess,
} from "./shared.ts";
import {
  saveProfilePhoto,
  saveSignatureImage,
  saveCardBackgroundTemplate,
  getDocumentStream,
} from "../utils/upload.ts";
import { getHospitalSettingsFromDb } from "../services/hospital-settings.ts";

export const idCardRoutes = new Hono<AuthEnv>();

// ---------------------------------------------------------------------------
// Authorization middleware for ID card operations
// ---------------------------------------------------------------------------
const requireIdCardAccess = async (c: any, next: any) => {
  const session = c.get("session");
  const role = session?.user?.role;
  if (role === "admin") {
    return next();
  }
  const isHrOrAccounts = await hasHrOrAccountsViewAccess(c);
  const isCollege = await hasCollegeAccess(c);
  if (isHrOrAccounts || isCollege) {
    return next();
  }
  return c.json({ error: "Access denied. ID card operations require HR, College, or Admin privileges." }, 403);
};

// ---------------------------------------------------------------------------
// Helpers: Serial Number & Token Generation
// ---------------------------------------------------------------------------
async function generateCardSerialNo(tx?: any): Promise<string> {
  const year = new Date().getFullYear();
  const res = await (tx || pool).query(
    `SELECT COUNT(*) FROM "id_card_issuances" WHERE "card_serial_no" LIKE $1`,
    [`IDC-${year}-%`]
  );
  const count = parseInt(res.rows[0].count, 10) + 1;
  return `IDC-${year}-${count.toString().padStart(5, "0")}`;
}

function generateSecureToken(): string {
  return crypto.randomBytes(18).toString("base64url");
}

// ---------------------------------------------------------------------------
// 1. Template Management Routes
// ---------------------------------------------------------------------------

// List templates
idCardRoutes.get("/id-cards/templates", requireIdCardAccess, async (c) => {
  const targetType = c.req.query("targetType");
  const conditions = [eq(idCardTemplates.active, true)];
  if (targetType === "staff" || targetType === "student") {
    conditions.push(eq(idCardTemplates.targetType, targetType));
  }

  const templates = await db
    .select()
    .from(idCardTemplates)
    .where(and(...conditions))
    .orderBy(desc(idCardTemplates.isDefault), desc(idCardTemplates.createdAt));

  return c.json(templates);
});

// Get single template
idCardRoutes.get("/id-cards/templates/:id", requireIdCardAccess, async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid template ID" }, 400);

  const [template] = await db
    .select()
    .from(idCardTemplates)
    .where(eq(idCardTemplates.id, id))
    .limit(1);

  if (!template) return c.json({ error: "Template not found" }, 404);
  return c.json(template);
});

// Create template (Admin only)
const createTemplateSchema = z.object({
  name: z.string().min(2),
  targetType: z.enum(["staff", "student"]),
  orientation: z.enum(["portrait", "landscape"]).default("portrait"),
  isDefault: z.boolean().default(false),
  layoutConfig: z.record(z.string(), z.any()),
});

idCardRoutes.post("/id-cards/templates", requireAdmin, async (c) => {
  const data = await jsonBody(c, createTemplateSchema);
  const session = c.get("session");

  // If set to default, clear other defaults for the same targetType
  if (data.isDefault) {
    await db
      .update(idCardTemplates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(idCardTemplates.targetType, data.targetType));
  }

  const [newTemplate] = await db
    .insert(idCardTemplates)
    .values({
      name: data.name,
      targetType: data.targetType,
      orientation: data.orientation,
      isDefault: data.isDefault,
      layoutConfig: data.layoutConfig as IdCardLayoutConfig,
      createdById: session?.user?.id,
      updatedAt: new Date(),
    })
    .returning();

  return c.json(newTemplate, 201);
});

// Update template (Admin only)
const updateTemplateSchema = z.object({
  name: z.string().min(2).optional(),
  orientation: z.enum(["portrait", "landscape"]).optional(),
  isDefault: z.boolean().optional(),
  layoutConfig: z.record(z.string(), z.any()).optional(),
  active: z.boolean().optional(),
});

idCardRoutes.put("/id-cards/templates/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid template ID" }, 400);

  const data = await jsonBody(c, updateTemplateSchema);

  const [existing] = await db
    .select()
    .from(idCardTemplates)
    .where(eq(idCardTemplates.id, id))
    .limit(1);
  if (!existing) return c.json({ error: "Template not found" }, 404);

  if (data.isDefault) {
    await db
      .update(idCardTemplates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(idCardTemplates.targetType, existing.targetType));
  }

  const [updated] = await db
    .update(idCardTemplates)
    .set({
      ...(data.name ? { name: data.name } : {}),
      ...(data.orientation ? { orientation: data.orientation } : {}),
      ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
      ...(data.layoutConfig ? { layoutConfig: data.layoutConfig as IdCardLayoutConfig } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      updatedAt: new Date(),
    })
    .where(eq(idCardTemplates.id, id))
    .returning();

  return c.json(updated);
});

// Clone template
idCardRoutes.post("/id-cards/templates/:id/duplicate", requireAdmin, async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid template ID" }, 400);

  const [source] = await db
    .select()
    .from(idCardTemplates)
    .where(eq(idCardTemplates.id, id))
    .limit(1);
  if (!source) return c.json({ error: "Template not found" }, 404);

  const session = c.get("session");
  const [cloned] = await db
    .insert(idCardTemplates)
    .values({
      name: `${source.name} (Copy)`,
      targetType: source.targetType,
      orientation: source.orientation,
      isDefault: false,
      layoutConfig: source.layoutConfig,
      createdById: session?.user?.id,
      updatedAt: new Date(),
    })
    .returning();

  return c.json(cloned, 201);
});

// ---------------------------------------------------------------------------
// 2. Issuances & Audit Ledger
// ---------------------------------------------------------------------------

// List issued cards with search, filters, and pagination
idCardRoutes.get("/id-cards/issuances", requireIdCardAccess, async (c) => {
  const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(5, parseInt(c.req.query("pageSize") || "20", 10)));
  const search = c.req.query("search")?.trim();
  const entityType = c.req.query("entityType")?.trim();
  const status = c.req.query("status")?.trim();

  const conditions: any[] = [];
  if (entityType === "staff" || entityType === "student") {
    conditions.push(eq(idCardIssuances.entityType, entityType));
  }
  if (status) {
    conditions.push(eq(idCardIssuances.status, status));
  }
  if (search) {
    conditions.push(
      or(
        ilike(idCardIssuances.cardSerialNo, `%${search}%`),
        ilike(idCardIssuances.printedName, `%${search}%`),
        ilike(idCardIssuances.printedCode, `%${search}%`),
        ilike(idCardIssuances.printedDepartment, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(idCardIssuances)
    .where(whereClause);

  const totalRecords = totalRes?.count || 0;
  const offset = (page - 1) * pageSize;

  const records = await db
    .select({
      issuance: idCardIssuances,
      templateName: idCardTemplates.name,
      templateOrientation: idCardTemplates.orientation,
    })
    .from(idCardIssuances)
    .leftJoin(idCardTemplates, eq(idCardIssuances.templateId, idCardTemplates.id))
    .where(whereClause)
    .orderBy(desc(idCardIssuances.createdAt))
    .limit(pageSize)
    .offset(offset);

  return c.json({
    data: records.map((r) => ({
      ...r.issuance,
      templateName: r.templateName,
      templateOrientation: r.templateOrientation,
    })),
    pagination: {
      page,
      pageSize,
      totalRecords,
      totalPages: Math.ceil(totalRecords / pageSize),
    },
  });
});

// Single Issue Card
const issueSingleSchema = z.object({
  entityType: z.enum(["staff", "student"]),
  id: z.number().int().positive(),
  templateId: z.number().int().positive().optional(),
  validUntil: z.string().optional(),
  photoUrl: z.string().optional(),
});

idCardRoutes.post("/id-cards/issue-single", requireIdCardAccess, async (c) => {
  const data = await jsonBody(c, issueSingleSchema);
  const session = c.get("session");

  // 1. Resolve Template
  let templateId = data.templateId;
  if (!templateId) {
    const [defaultTemplate] = await db
      .select({ id: idCardTemplates.id })
      .from(idCardTemplates)
      .where(and(eq(idCardTemplates.targetType, data.entityType), eq(idCardTemplates.isDefault, true)))
      .limit(1);
    if (!defaultTemplate) {
      const [anyTemplate] = await db
        .select({ id: idCardTemplates.id })
        .from(idCardTemplates)
        .where(eq(idCardTemplates.targetType, data.entityType))
        .limit(1);
      if (!anyTemplate) return c.json({ error: `No active template found for ${data.entityType}` }, 400);
      templateId = anyTemplate.id;
    } else {
      templateId = defaultTemplate.id;
    }
  }

  // 2. Fetch Entity Data Snapshot
  let name = "";
  let code = "";
  let department = "";
  let role = "";
  let bloodGroup = "";
  let emergencyContact = "";
  let photoUrl = data.photoUrl || "";

  if (data.entityType === "staff") {
    const res = await pool.query(
      `SELECT s.*, 
              d.name AS department_name,
              p.blood_group, p.emergency_contact_phone, p.emergency_contact_name
       FROM "staff" s
       LEFT JOIN "staff_departments" sd ON sd.staff_id = s.staff_id AND sd.staff_version = s.version
       LEFT JOIN "departments" d ON d.id = sd.department_id
       LEFT JOIN "staff_hr_profiles" p ON p.staff_id = s.staff_id AND p.staff_version = s.version
       WHERE s.staff_id = $1 AND s.active = true
       LIMIT 1`,
      [data.id]
    );
    const staffRow = res.rows[0];
    if (!staffRow) return c.json({ error: "Staff member not found or inactive" }, 404);

    name = staffRow.name;
    code = staffRow.employee_code;
    department = staffRow.department_name || staffRow.role || "Hospital Staff";
    role = staffRow.role || "Staff";
    bloodGroup = staffRow.blood_group || "";
    emergencyContact = staffRow.emergency_contact_phone || staffRow.phone || "";
    photoUrl = photoUrl || staffRow.photo_url || "";

    // If a photoUrl was provided and staff row doesn't have it, update it
    if (data.photoUrl && !staffRow.photo_url) {
      await pool.query(`UPDATE "staff" SET "photo_url" = $1 WHERE "staff_id" = $2`, [data.photoUrl, data.id]);
    }
  } else {
    // Nursing student
    const res = await pool.query(
      `SELECT ns.*, 
              CONCAT(COALESCE(nc.name, 'Batch'), ' - ', nb.academic_year, ' (', nb.section, ')') AS batch_name, 
              nc.name AS course_name, nc.code AS course_code
       FROM "nursing_students" ns
       LEFT JOIN "nursing_batches" nb ON nb.id = ns.batch_id
       LEFT JOIN "nursing_courses" nc ON nc.id = nb.course_id
       WHERE ns.id = $1
       LIMIT 1`,
      [data.id]
    );
    const studentRow = res.rows[0];
    if (!studentRow) return c.json({ error: "Student not found" }, 404);

    name = studentRow.name;
    code = studentRow.enrollment_no;
    department = studentRow.batch_name || "Nursing Batch";
    role = studentRow.course_name || "Nursing Student";
    bloodGroup = studentRow.blood_group || "";
    emergencyContact = studentRow.father_phone?.trim() || studentRow.mother_phone?.trim() || studentRow.guardian_phone?.trim() || studentRow.phone?.trim() || "";
    photoUrl = photoUrl || studentRow.photo_url || "";

    if (data.photoUrl && !studentRow.photo_url) {
      await pool.query(`UPDATE "nursing_students" SET "photo_url" = $1 WHERE "id" = $2`, [data.photoUrl, data.id]);
    }
  }

  // 3. Issue Card & Store Snapshot
  const cardSerialNo = await generateCardSerialNo();
  const qrVerifyToken = generateSecureToken();
  const issueDate = new Date().toISOString().split("T")[0];

  const [issuance] = await db
    .insert(idCardIssuances)
    .values({
      cardSerialNo,
      templateId,
      entityType: data.entityType,
      staffId: data.entityType === "staff" ? data.id : null,
      studentId: data.entityType === "student" ? data.id : null,
      printedName: name,
      printedCode: code,
      printedDepartment: department,
      printedRole: role,
      printedBloodGroup: bloodGroup,
      printedEmergencyContact: emergencyContact,
      photoUrl,
      issueDate,
      validUntil: data.validUntil || null,
      qrVerifyToken,
      status: "active",
      printCount: 1,
      lastPrintedAt: new Date(),
      issuedById: session?.user?.id,
      updatedAt: new Date(),
    })
    .returning();

  return c.json(issuance, 201);
});

// Batch Issue Cards
const issueBatchSchema = z.object({
  entityType: z.enum(["staff", "student"]),
  ids: z.array(z.number().int().positive()).optional(),
  departmentId: z.number().int().positive().optional(),
  batchId: z.number().int().positive().optional(),
  courseId: z.number().int().positive().optional(),
  templateId: z.number().int().positive().optional(),
  validUntil: z.string().optional(),
});

idCardRoutes.post("/id-cards/issue-batch", requireIdCardAccess, async (c) => {
  const data = await jsonBody(c, issueBatchSchema);
  const session = c.get("session");

  // 1. Resolve Template
  let templateId = data.templateId;
  if (!templateId) {
    const [defaultTemplate] = await db
      .select({ id: idCardTemplates.id })
      .from(idCardTemplates)
      .where(and(eq(idCardTemplates.targetType, data.entityType), eq(idCardTemplates.isDefault, true)))
      .limit(1);
    if (!defaultTemplate) return c.json({ error: `No active default template found for ${data.entityType}` }, 400);
    templateId = defaultTemplate.id;
  }

  // 2. Resolve Target List
  let targetIds = data.ids || [];
  if (targetIds.length === 0) {
    if (data.entityType === "staff") {
      let queryStr = `SELECT s.staff_id FROM "staff" s WHERE s.active = true`;
      const params: any[] = [];
      if (data.departmentId) {
        queryStr = `SELECT s.staff_id FROM "staff" s 
                    JOIN "staff_departments" sd ON sd.staff_id = s.staff_id AND sd.staff_version = s.version
                    WHERE s.active = true AND sd.department_id = $1`;
        params.push(data.departmentId);
      }
      const res = await pool.query(queryStr, params);
      targetIds = res.rows.map((r) => r.staff_id);
    } else {
      let queryStr = `SELECT ns.id FROM "nursing_students" ns WHERE ns.status = 'active'`;
      const params: any[] = [];
      if (data.batchId) {
        queryStr += ` AND ns.batch_id = $1`;
        params.push(data.batchId);
      } else if (data.courseId) {
        queryStr = `SELECT ns.id FROM "nursing_students" ns 
                    JOIN "nursing_batches" nb ON nb.id = ns.batch_id
                    WHERE ns.status = 'active' AND nb.course_id = $1`;
        params.push(data.courseId);
      }
      const res = await pool.query(queryStr, params);
      targetIds = res.rows.map((r) => r.id);
    }
  }

  if (targetIds.length === 0) {
    return c.json({ error: "No matching entities found for batch issuance" }, 400);
  }

  const results: any[] = [];
  const issueDate = new Date().toISOString().split("T")[0];

  for (const id of targetIds) {
    let name = "";
    let code = "";
    let department = "";
    let role = "";
    let bloodGroup = "";
    let emergencyContact = "";
    let photoUrl = "";

    if (data.entityType === "staff") {
      const res = await pool.query(
        `SELECT s.*, 
                d.name AS department_name,
                p.blood_group, p.emergency_contact_phone, p.emergency_contact_name
         FROM "staff" s
         LEFT JOIN "staff_departments" sd ON sd.staff_id = s.staff_id AND sd.staff_version = s.version
         LEFT JOIN "departments" d ON d.id = sd.department_id
         LEFT JOIN "staff_hr_profiles" p ON p.staff_id = s.staff_id AND p.staff_version = s.version
         WHERE s.staff_id = $1 AND s.active = true
         LIMIT 1`,
        [id]
      );
      const staffRow = res.rows[0];
      if (!staffRow) continue;
      name = staffRow.name;
      code = staffRow.employee_code;
      department = staffRow.department_name || staffRow.role || "Hospital Staff";
      role = staffRow.role || "Staff";
      bloodGroup = staffRow.blood_group || "";
      emergencyContact = staffRow.emergency_contact_phone || staffRow.phone || "";
      photoUrl = staffRow.photo_url || "";
    } else {
      const res = await pool.query(
        `SELECT ns.*, 
                CONCAT(COALESCE(nc.name, 'Batch'), ' - ', nb.academic_year, ' (', nb.section, ')') AS batch_name, 
                nc.name AS course_name, nc.code AS course_code
         FROM "nursing_students" ns
         LEFT JOIN "nursing_batches" nb ON nb.id = ns.batch_id
         LEFT JOIN "nursing_courses" nc ON nc.id = nb.course_id
         WHERE ns.id = $1
         LIMIT 1`,
        [id]
      );
      const studentRow = res.rows[0];
      if (!studentRow) continue;
      name = studentRow.name;
      code = studentRow.enrollment_no;
      department = studentRow.batch_name || "Nursing Batch";
      role = studentRow.course_name || "Nursing Student";
      bloodGroup = studentRow.blood_group || "";
      emergencyContact = studentRow.father_phone || studentRow.guardian_phone || studentRow.phone || "";
      photoUrl = studentRow.photo_url || "";
    }

    const cardSerialNo = await generateCardSerialNo();
    const qrVerifyToken = generateSecureToken();

    const [issuance] = await db
      .insert(idCardIssuances)
      .values({
        cardSerialNo,
        templateId,
        entityType: data.entityType,
        staffId: data.entityType === "staff" ? id : null,
        studentId: data.entityType === "student" ? id : null,
        printedName: name,
        printedCode: code,
        printedDepartment: department,
        printedRole: role,
        printedBloodGroup: bloodGroup,
        printedEmergencyContact: emergencyContact,
        photoUrl,
        issueDate,
        validUntil: data.validUntil || null,
        qrVerifyToken,
        status: "active",
        printCount: 1,
        lastPrintedAt: new Date(),
        issuedById: session?.user?.id,
        updatedAt: new Date(),
      })
      .returning();

    results.push(issuance);
  }

  return c.json({ count: results.length, data: results }, 201);
});

// Update issuance status (e.g. mark lost, revoked, expired)
const updateStatusSchema = z.object({
  status: z.enum(["active", "lost", "revoked", "expired"]),
});

idCardRoutes.post("/id-cards/issuances/:id/status", requireIdCardAccess, async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid issuance ID" }, 400);

  const { status } = await jsonBody(c, updateStatusSchema);

  const [updated] = await db
    .update(idCardIssuances)
    .set({ status, updatedAt: new Date() })
    .where(eq(idCardIssuances.id, id))
    .returning();

  if (!updated) return c.json({ error: "Issuance record not found" }, 404);
  return c.json(updated);
});

// Increment print count
idCardRoutes.post("/id-cards/issuances/:id/record-print", requireIdCardAccess, async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid issuance ID" }, 400);

  const [updated] = await db
    .update(idCardIssuances)
    .set({
      printCount: sql`${idCardIssuances.printCount} + 1`,
      lastPrintedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(idCardIssuances.id, id))
    .returning();

  return c.json(updated || { success: true });
});

// ---------------------------------------------------------------------------
// 3. Photo & Signature Media Uploads and Streaming
// ---------------------------------------------------------------------------

// Upload photo
idCardRoutes.post("/id-cards/upload-photo", requireIdCardAccess, async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  const entityType = body["entityType"] as "staff" | "student";
  const rawId = body["id"];

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No image file provided" }, 400);
  }
  if (!entityType || (entityType !== "staff" && entityType !== "student")) {
    return c.json({ error: "Invalid entityType" }, 400);
  }

  const id = parseInt(String(rawId), 10);
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

  const objectKey = await saveProfilePhoto(file, entityType, id);
  const photoUrl = `/api/id-cards/media/${objectKey}`;

  // Update entity record directly in DB
  if (entityType === "staff") {
    await pool.query(`UPDATE "staff" SET "photo_url" = $1 WHERE "staff_id" = $2`, [photoUrl, id]);
  } else {
    await pool.query(`UPDATE "nursing_students" SET "photo_url" = $1 WHERE "id" = $2`, [photoUrl, id]);
  }

  return c.json({ photoUrl, objectKey, success: true });
});

// Upload authorized signature
idCardRoutes.post("/id-cards/upload-signature", requireAdmin, async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  const identifier = (body["identifier"] as string) || "authorized-signatory";

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No signature image file provided" }, 400);
  }

  const objectKey = await saveSignatureImage(file, identifier);
  const signatureUrl = `/api/id-cards/media/${objectKey}`;

  return c.json({ signatureUrl, objectKey, success: true });
});

// Upload background template image (front or back)
idCardRoutes.post("/id-cards/templates/:id/upload-background", requireIdCardAccess, async (c) => {
  const templateId = parseInt(c.req.param("id"), 10);
  if (isNaN(templateId)) return c.json({ error: "Invalid template ID" }, 400);

  const body = await c.req.parseBody();
  const file = body["file"];
  const side = ((body["side"] as string) || "front").toLowerCase();

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No image file provided" }, 400);
  }
  if (side !== "front" && side !== "back") {
    return c.json({ error: "Side must be 'front' or 'back'" }, 400);
  }

  const [template] = await db
    .select()
    .from(idCardTemplates)
    .where(eq(idCardTemplates.id, templateId));
  if (!template) return c.json({ error: "Template not found" }, 404);

  try {
    const objectKey = await saveCardBackgroundTemplate(file, templateId, side as "front" | "back");
    const imageUrl = `/api/id-cards/media/${objectKey}`;

    const currentConfig = (template.layoutConfig as IdCardLayoutConfig) || {};
    const updatedConfig: IdCardLayoutConfig = {
      ...currentConfig,
      background: {
        ...currentConfig.background,
        useCustomBackground: true,
        ...(side === "front" ? { frontImageUrl: imageUrl } : { backImageUrl: imageUrl }),
      },
    };

    const [updated] = await db
      .update(idCardTemplates)
      .set({
        layoutConfig: updatedConfig,
        updatedAt: new Date(),
      })
      .where(eq(idCardTemplates.id, templateId))
      .returning();

    return c.json({ data: updated, imageUrl, success: true });
  } catch (err: any) {
    console.error("Failed to upload background template:", err);
    return c.json({ error: err.message || "Failed to upload background" }, 500);
  }
});

// Stream media from MinIO
idCardRoutes.get("/id-cards/media/:key{.+}", async (c) => {
  const key = c.req.param("key");
  if (!key) return c.json({ error: "Missing media key" }, 400);

  const doc = await getDocumentStream(key);
  if (!doc) return c.json({ error: "Media not found" }, 404);

  return new Response(doc.stream as any, {
    headers: {
      "Content-Type": doc.mimeType,
      "Cache-Control": "public, max-age=86400",
    },
  });
});

// ---------------------------------------------------------------------------
// 4. Live Entity Selectors for Batch Print Hub
// ---------------------------------------------------------------------------

// List staff with filter for ID Card Generator
idCardRoutes.get("/id-cards/entities/staff", requireIdCardAccess, async (c) => {
  const departmentId = c.req.query("departmentId");
  const search = c.req.query("search")?.trim();

  let queryStr = `
    SELECT s.staff_id, s.employee_code, s.name, s.role, s.photo_url,
           d.id AS department_id, d.name AS department_name,
           p.blood_group, p.emergency_contact_phone,
           (SELECT card_serial_no FROM "id_card_issuances" 
            WHERE staff_id = s.staff_id AND status = 'active' 
            ORDER BY created_at DESC LIMIT 1) AS active_card_serial_no
    FROM "staff" s
    LEFT JOIN "staff_departments" sd ON sd.staff_id = s.staff_id AND sd.staff_version = s.version
    LEFT JOIN "departments" d ON d.id = sd.department_id
    LEFT JOIN "staff_hr_profiles" p ON p.staff_id = s.staff_id AND p.staff_version = s.version
    WHERE s.active = true
  `;
  const params: any[] = [];

  if (departmentId) {
    params.push(parseInt(departmentId, 10));
    queryStr += ` AND sd.department_id = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    queryStr += ` AND (s.name ILIKE $${params.length} OR s.employee_code ILIKE $${params.length} OR s.role ILIKE $${params.length})`;
  }

  queryStr += ` ORDER BY s.name ASC LIMIT 200`;

  const res = await pool.query(queryStr, params);
  return c.json(res.rows);
});

// List students with filter for ID Card Generator
idCardRoutes.get("/id-cards/entities/students", requireIdCardAccess, async (c) => {
  const batchId = c.req.query("batchId");
  const courseId = c.req.query("courseId");
  const search = c.req.query("search")?.trim();

  let queryStr = `
    SELECT ns.id, ns.enrollment_no, ns.name, ns.gender, ns.dob, ns.photo_url,
           ns.father_name, ns.mother_name, ns.father_deceased, ns.blood_group,
           COALESCE(ns.present_address, ns.address, ns.permanent_address) AS address,
           ns.father_phone, ns.mother_phone, ns.guardian_phone, ns.phone,
           nb.id AS batch_id, nb.academic_year,
           CONCAT(COALESCE(nc.name, 'Batch'), ' - ', nb.academic_year, ' (', nb.section, ')') AS batch_name,
           nc.id AS course_id, nc.name AS course_name, nc.code AS course_code,
           (SELECT card_serial_no FROM "id_card_issuances" 
            WHERE student_id = ns.id AND status = 'active' 
            ORDER BY created_at DESC LIMIT 1) AS active_card_serial_no
    FROM "nursing_students" ns
    LEFT JOIN "nursing_batches" nb ON nb.id = ns.batch_id
    LEFT JOIN "nursing_courses" nc ON nc.id = nb.course_id
    WHERE ns.status = 'active'
  `;
  const params: any[] = [];

  if (batchId) {
    params.push(parseInt(batchId, 10));
    queryStr += ` AND ns.batch_id = $${params.length}`;
  } else if (courseId) {
    params.push(parseInt(courseId, 10));
    queryStr += ` AND nb.course_id = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    queryStr += ` AND (ns.name ILIKE $${params.length} OR ns.enrollment_no ILIKE $${params.length})`;
  }

  queryStr += ` ORDER BY ns.name ASC LIMIT 200`;

  const res = await pool.query(queryStr, params);
  return c.json(res.rows);
});

// ---------------------------------------------------------------------------
// 5. Public Verification Endpoint (No Authentication Required!)
// ---------------------------------------------------------------------------
idCardRoutes.get("/public/id-verify/:token", async (c) => {
  const token = c.req.param("token");
  if (!token) return c.json({ valid: false, error: "Missing verification token" }, 400);

  const [issuance] = await db
    .select({
      issuance: idCardIssuances,
      template: idCardTemplates,
    })
    .from(idCardIssuances)
    .leftJoin(idCardTemplates, eq(idCardIssuances.templateId, idCardTemplates.id))
    .where(eq(idCardIssuances.qrVerifyToken, token))
    .limit(1);

  if (!issuance) {
    return c.json({
      valid: false,
      error: "Identity card record not found. This credential may be counterfeit or invalid.",
    }, 404);
  }

  const hospital = await getHospitalSettingsFromDb();

  return c.json({
    valid: issuance.issuance.status === "active",
    status: issuance.issuance.status,
    cardSerialNo: issuance.issuance.cardSerialNo,
    entityType: issuance.issuance.entityType,
    name: issuance.issuance.printedName,
    code: issuance.issuance.printedCode,
    department: issuance.issuance.printedDepartment,
    role: issuance.issuance.printedRole,
    bloodGroup: issuance.issuance.printedBloodGroup,
    photoUrl: issuance.issuance.photoUrl,
    issueDate: issuance.issuance.issueDate,
    validUntil: issuance.issuance.validUntil,
    institution: {
      name: issuance.issuance.entityType === "student" ? "ACME College of Nursing (ACON)" : hospital.name,
      tagline: hospital.tagline,
      address: hospital.address,
      phone: hospital.phone,
      logoUrl: hospital.logoUrl,
    },
    verifiedAt: new Date().toISOString(),
  });
});
