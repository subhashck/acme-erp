import { Hono } from "hono";
import { z } from "zod";
import { eq, sql, and, or, desc, asc, ilike } from "drizzle-orm";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import { user, staff, account } from "../db/schema.ts";
import {
  doctorProfiles,
  doctorEnrollments,
  moduleUsers,
  moduleSettings,
  programs,
  clinicalTopics,
  questionBank,
  assessmentBlueprints,
  examSessions,
  examSessionAnswers,
  doctorCertificates,
  doctorPayments,
} from "../db/schema-doctor-cbt.ts";
import {
  requireDoctorCbtAdmin,
  requireDoctorCbtAccess,
  getCurrentDoctorProfile,
  getCurrentStaff,
} from "./shared.ts";
import {
  isDoctorEmailWhitelisted,
  preEnrollDoctorCandidate,
  isDoctorCbtAdmin as checkIsDoctorCbtAdmin,
} from "../services/doctor-cbt-auth.ts";
import { hashPassword } from "better-auth/crypto";

function stripOptionPrefix(text: string): string {
  if (typeof text !== "string") return text;
  return text.replace(/^(\([A-Da-d]\)|[A-Da-d][.)])\s*/, "");
}

function sanitizeOptions(options: any): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((opt) => stripOptionPrefix(String(opt)));
}

/**
 * Fisher-Yates (Knuth) shuffle algorithm to randomize question sequences
 * with uniform probability for every newly initiated test instance.
 */
export function shuffleArray<T>(array: T[], rng: () => number = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

export const doctorCbtRoutes = new Hono<AuthEnv>()

  // ---------------------------------------------------------------------------
  // 1. Current Session Context & Access
  // ---------------------------------------------------------------------------
  .get("/doctor-cbt/me", async (c) => {
    const session = c.get("session");
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const role = (session.user.role || "").trim().toLowerCase();
    const isAdmin = role === "admin";

    const isModuleAdmin = isAdmin || (await checkIsDoctorCbtAdmin(userId, userEmail));
    const profile = await getCurrentDoctorProfile(c);
    const staffRecord = await getCurrentStaff(c);

    let enrollments: any[] = [];
    if (profile) {
      enrollments = await db
        .select({
          id: doctorEnrollments.id,
          programId: doctorEnrollments.programId,
          programCode: programs.code,
          programTitle: programs.title,
          programSpecialty: programs.specialty,
          batchCode: doctorEnrollments.batchCode,
          status: doctorEnrollments.status,
          enrolledAt: doctorEnrollments.enrolledAt,
          completedAt: doctorEnrollments.completedAt,
        })
        .from(doctorEnrollments)
        .innerJoin(programs, eq(doctorEnrollments.programId, programs.id))
        .where(eq(doctorEnrollments.doctorId, profile.id))
        .orderBy(desc(doctorEnrollments.enrolledAt));
    }

    return c.json({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
      doctorProfile: profile,
      staffRecord: staffRecord ? { staffId: staffRecord.staffId, name: staffRecord.name } : null,
      enrollments,
      isDoctorCbtAdmin: isModuleAdmin,
      canManage: isModuleAdmin,
      isCandidate: Boolean(profile) || role === "doctor_candidate",
    });
  })

  // ---------------------------------------------------------------------------
  // 1b. Update Current User's Doctor Profile
  // ---------------------------------------------------------------------------
  .patch("/doctor-cbt/me/profile", async (c) => {
    const session = c.get("session");
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await getCurrentDoctorProfile(c);
    if (!profile) {
      return c.json({ error: "No doctor profile associated with this account." }, 404);
    }

    const schema = z.object({
      fullName: z.string().min(2, "Full name must be at least 2 characters").optional(),
      email: z.string().email("Valid email required").optional(),
      mobile: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      universityInstitute: z.string().optional().nullable(),
      yearOfPassing: z.string().optional().nullable(),
      experience: z.string().optional().nullable(),
      nmcSmcNumber: z.string().optional().nullable(),
      qualifications: z.string().optional().nullable(),
      primarySpecialty: z.string().optional().nullable(),
      institutionName: z.string().optional().nullable(),
    });

    const body = schema.parse(await c.req.json());

    const now = new Date();
    const cleanEmail = body.email ? body.email.trim().toLowerCase() : undefined;
    const cleanName = body.fullName ? body.fullName.trim() : undefined;
    const isEmailChanging = cleanEmail !== undefined && cleanEmail !== profile.email.toLowerCase().trim();

    // Verify email collisions if email is changing
    if (isEmailChanging && cleanEmail) {
      const [emailConflictProfile] = await db
        .select({ id: doctorProfiles.id })
        .from(doctorProfiles)
        .where(
          and(
            sql`LOWER(TRIM(${doctorProfiles.email})) = ${cleanEmail}`,
            sql`${doctorProfiles.id} != ${profile.id}`
          )
        )
        .limit(1);

      if (emailConflictProfile) {
        return c.json(
          { error: `The email "${cleanEmail}" is already registered to another doctor candidate.` },
          400
        );
      }

      const [emailConflictUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(
          and(
            sql`LOWER(TRIM(${user.email})) = ${cleanEmail}`,
            profile.userId ? sql`${user.id} != ${profile.userId}` : sql`TRUE`
          )
        )
        .limit(1);

      if (emailConflictUser) {
        return c.json(
          { error: `The email "${cleanEmail}" is already associated with another system account.` },
          400
        );
      }
    }

    // Synchronize Better-Auth user & account tables if userId is linked
    if (profile.userId) {
      const userUpdates: any = { updatedAt: now };
      if (isEmailChanging && cleanEmail) {
        userUpdates.email = cleanEmail;
      }
      if (cleanName && cleanName !== profile.fullName) {
        userUpdates.name = cleanName;
      }
      await db
        .update(user)
        .set(userUpdates)
        .where(eq(user.id, profile.userId));

      if (isEmailChanging && cleanEmail) {
        await db
          .update(account)
          .set({ accountId: cleanEmail, updatedAt: now })
          .where(
            and(
              eq(account.userId, profile.userId),
              eq(account.providerId, "credential")
            )
          );
      }
    }

    // Update doctorProfiles
    const profileUpdates: any = {
      updatedAt: now,
    };
    if (cleanName) profileUpdates.fullName = cleanName;
    if (isEmailChanging && cleanEmail) profileUpdates.email = cleanEmail;
    if (body.mobile !== undefined) profileUpdates.mobile = body.mobile ? body.mobile.trim() : null;
    if (body.address !== undefined) profileUpdates.address = body.address ? body.address.trim() : null;
    if (body.universityInstitute !== undefined)
      profileUpdates.universityInstitute = body.universityInstitute ? body.universityInstitute.trim() : null;
    if (body.yearOfPassing !== undefined)
      profileUpdates.yearOfPassing = body.yearOfPassing ? body.yearOfPassing.trim() : null;
    if (body.experience !== undefined)
      profileUpdates.experience = body.experience ? body.experience.trim() : null;
    if (body.nmcSmcNumber !== undefined)
      profileUpdates.nmcSmcNumber = body.nmcSmcNumber ? body.nmcSmcNumber.trim() : null;
    if (body.qualifications !== undefined)
      profileUpdates.qualifications = body.qualifications ? body.qualifications.trim() : null;
    if (body.primarySpecialty !== undefined)
      profileUpdates.primarySpecialty = body.primarySpecialty ? body.primarySpecialty.trim() : null;
    if (body.institutionName !== undefined)
      profileUpdates.institutionName = body.institutionName ? body.institutionName.trim() : null;

    const [updatedProfile] = await db
      .update(doctorProfiles)
      .set(profileUpdates)
      .where(eq(doctorProfiles.id, profile.id))
      .returning();

    return c.json({
      success: true,
      message: "Doctor profile updated successfully.",
      profile: updatedProfile,
    });
  })

  // ---------------------------------------------------------------------------
  // 2. Module Settings & Administration Configuration
  // ---------------------------------------------------------------------------
  .get("/doctor-cbt/settings", requireDoctorCbtAdmin, async (c) => {
    const settingsRows = await db.select().from(moduleSettings);
    const settingsMap: Record<string, any> = {};
    for (const row of settingsRows) {
      settingsMap[row.settingKey] = row.settingValue;
    }
    return c.json({
      assigned_module_admins: settingsMap.assigned_module_admins ?? [],
      default_pass_percentage: settingsMap.default_pass_percentage ?? 75.0,
      enable_google_whitelist: settingsMap.enable_google_whitelist ?? true,
      default_negative_marking: settingsMap.default_negative_marking ?? { enabled: false, penalty: 0.25 },
    });
  })

  .patch("/doctor-cbt/settings", requireDoctorCbtAdmin, async (c) => {
    const session = c.get("session")!;
    const body = await c.req.json();

    const allowedKeys = [
      "assigned_module_admins",
      "default_pass_percentage",
      "enable_google_whitelist",
      "default_negative_marking",
    ];

    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        const [existing] = await db
          .select({ id: moduleSettings.id })
          .from(moduleSettings)
          .where(eq(moduleSettings.settingKey, key))
          .limit(1);

        if (existing) {
          await db
            .update(moduleSettings)
            .set({
              settingValue: body[key],
              updatedByUserId: session.user.id,
              updatedAt: new Date(),
            })
            .where(eq(moduleSettings.id, existing.id));
        } else {
          await db.insert(moduleSettings).values({
            settingKey: key,
            settingValue: body[key],
            updatedByUserId: session.user.id,
          });
        }
      }
    }

    return c.json({ success: true, message: "Settings updated successfully." });
  })

  // ---------------------------------------------------------------------------
  // 3. Master Table of Module Users (Staff + External Faculty / Assessors)
  // ---------------------------------------------------------------------------
  .get("/doctor-cbt/module-users", requireDoctorCbtAdmin, async (c) => {
    const search = c.req.query("search")?.trim().toLowerCase();
    const roleFilter = c.req.query("role")?.trim();

    let query = db
      .select({
        id: moduleUsers.id,
        userId: moduleUsers.userId,
        staffId: moduleUsers.staffId,
        fullName: moduleUsers.fullName,
        email: moduleUsers.email,
        mobile: moduleUsers.mobile,
        roleInModule: moduleUsers.roleInModule,
        isExternal: moduleUsers.isExternal,
        institution: moduleUsers.institution,
        designationTitle: moduleUsers.designationTitle,
        notes: moduleUsers.notes,
        active: moduleUsers.active,
        createdAt: moduleUsers.createdAt,
      })
      .from(moduleUsers)
      .orderBy(asc(moduleUsers.fullName));

    const rows = await query;
    let filtered = rows;

    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.fullName.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          (u.institution && u.institution.toLowerCase().includes(search))
      );
    }
    if (roleFilter) {
      filtered = filtered.filter((u) => u.roleInModule === roleFilter);
    }

    return c.json(filtered);
  })

  .post("/doctor-cbt/module-users", requireDoctorCbtAdmin, async (c) => {
    const schema = z.object({
      fullName: z.string().min(2, "Full name is required"),
      email: z.string().email("Valid email required"),
      mobile: z.string().optional().nullable(),
      roleInModule: z.enum(["module_admin", "faculty_author", "assessor"]).default("faculty_author"),
      isExternal: z.boolean().default(false),
      institution: z.string().optional().nullable(),
      designationTitle: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      staffId: z.number().int().positive().optional().nullable(),
      userId: z.string().optional().nullable(),
    });

    const parsed = schema.parse(await c.req.json());
    const cleanEmail = parsed.email.trim().toLowerCase();

    // Check if email already exists in module_users
    const [existing] = await db
      .select({ id: moduleUsers.id })
      .from(moduleUsers)
      .where(sql`LOWER(TRIM(${moduleUsers.email})) = ${cleanEmail}`)
      .limit(1);

    if (existing) {
      return c.json({ error: "A module user with this email already exists." }, 400);
    }

    // Attempt to link userId if user exists
    let resolvedUserId = parsed.userId ?? null;
    if (!resolvedUserId) {
      const [u] = await db
        .select({ id: user.id })
        .from(user)
        .where(sql`LOWER(TRIM(${user.email})) = ${cleanEmail}`)
        .limit(1);
      if (u) resolvedUserId = u.id;
    }

    const [created] = await db
      .insert(moduleUsers)
      .values({
        userId: resolvedUserId,
        staffId: parsed.staffId ?? null,
        fullName: parsed.fullName.trim(),
        email: cleanEmail,
        mobile: parsed.mobile ?? null,
        roleInModule: parsed.roleInModule,
        isExternal: parsed.isExternal,
        institution: parsed.institution ?? null,
        designationTitle: parsed.designationTitle ?? null,
        notes: parsed.notes ?? null,
        active: true,
      })
      .returning();

    return c.json(created, 201);
  })

  .patch("/doctor-cbt/module-users/:id", requireDoctorCbtAdmin, async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id) || id <= 0) return c.json({ error: "Invalid ID" }, 400);

    const schema = z.object({
      roleInModule: z.enum(["module_admin", "faculty_author", "assessor"]).optional(),
      institution: z.string().optional().nullable(),
      designationTitle: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      active: z.boolean().optional(),
    });

    const parsed = schema.parse(await c.req.json());

    const [updated] = await db
      .update(moduleUsers)
      .set({
        ...parsed,
        updatedAt: new Date(),
      })
      .where(eq(moduleUsers.id, id))
      .returning();

    if (!updated) return c.json({ error: "Module user not found" }, 404);
    return c.json(updated);
  })

  .delete("/doctor-cbt/module-users/:id", requireDoctorCbtAdmin, async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id) || id <= 0) return c.json({ error: "Invalid ID" }, 400);

    // Soft-deactivate
    const [updated] = await db
      .update(moduleUsers)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(moduleUsers.id, id))
      .returning();

    if (!updated) return c.json({ error: "Module user not found" }, 404);
    return c.json({ success: true, message: "Module user deactivated." });
  })

  // ---------------------------------------------------------------------------
  // 4. Doctor Candidate Pre-Enrollment & Whitelist Directory
  // ---------------------------------------------------------------------------
  .get("/doctor-cbt/candidates", requireDoctorCbtAdmin, async (c) => {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(c.req.query("pageSize")) || 20));
    const search = c.req.query("search")?.trim().toLowerCase();
    const status = c.req.query("status")?.trim();
    const programId = Number(c.req.query("programId"));

    let conditions = [];

    if (search) {
      conditions.push(
        sql`(${ilike(doctorProfiles.fullName, `%${search}%`)} OR ${ilike(doctorProfiles.email, `%${search}%`)} OR ${ilike(doctorProfiles.nmcSmcNumber, `%${search}%`)})`
      );
    }
    if (status) {
      conditions.push(eq(doctorProfiles.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(doctorProfiles)
      .where(whereClause);

    const totalRecords = Number(countResult?.count || 0);
    const totalPages = Math.ceil(totalRecords / pageSize);

    const rows = await db
      .select({
        id: doctorProfiles.id,
        userId: doctorProfiles.userId,
        staffId: doctorProfiles.staffId,
        candidateId: doctorProfiles.candidateId,
        fullName: doctorProfiles.fullName,
        email: doctorProfiles.email,
        mobile: doctorProfiles.mobile,
        address: doctorProfiles.address,
        universityInstitute: doctorProfiles.universityInstitute,
        yearOfPassing: doctorProfiles.yearOfPassing,
        experience: doctorProfiles.experience,
        nmcSmcNumber: doctorProfiles.nmcSmcNumber,
        qualifications: doctorProfiles.qualifications,
        primarySpecialty: doctorProfiles.primarySpecialty,
        institutionName: doctorProfiles.institutionName,
        candidateType: doctorProfiles.candidateType,
        status: doctorProfiles.status,
        createdAt: doctorProfiles.createdAt,
      })
      .from(doctorProfiles)
      .where(whereClause)
      .orderBy(desc(doctorProfiles.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // Fetch payments for these candidates
    const candidateIds = rows.map((r) => r.id);
    const paymentsList =
      candidateIds.length > 0
        ? await db
            .select()
            .from(doctorPayments)
            .where(
              sql`${doctorPayments.doctorId} IN (${sql.join(
                candidateIds.map((id) => sql`${id}`),
                sql`, `
              )})`
            )
            .orderBy(desc(doctorPayments.paymentDate))
        : [];

    // Fetch enrollments for these candidates
    const enrollmentsList =
      candidateIds.length > 0
        ? await db
            .select({
              id: doctorEnrollments.id,
              doctorId: doctorEnrollments.doctorId,
              programId: doctorEnrollments.programId,
              batchCode: doctorEnrollments.batchCode,
              status: doctorEnrollments.status,
              programTitle: programs.title,
              programCode: programs.code,
            })
            .from(doctorEnrollments)
            .leftJoin(programs, eq(doctorEnrollments.programId, programs.id))
            .where(
              sql`${doctorEnrollments.doctorId} IN (${sql.join(
                candidateIds.map((id) => sql`${id}`),
                sql`, `
              )})`
            )
        : [];

    const enrichedRows = rows.map((r) => {
      const candidatePayments = paymentsList.filter((p) => p.doctorId === r.id);
      const totalPaid = candidatePayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const candidateEnrollment = enrollmentsList.find((e) => e.doctorId === r.id) || null;
      return {
        ...r,
        payments: candidatePayments,
        totalPaid,
        latestPayment: candidatePayments[0] || null,
        enrollment: candidateEnrollment,
        programId: candidateEnrollment?.programId || null,
        batchCode: candidateEnrollment?.batchCode || null,
      };
    });

    return c.json({
      data: enrichedRows,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages,
      },
    });
  })

  .post("/doctor-cbt/candidates/pre-enroll", requireDoctorCbtAdmin, async (c) => {
    const schema = z.object({
      fullName: z.string().min(2, "Full name is required"),
      email: z.string().email("Valid email required"),
      mobile: z.string().optional().nullable(),
      candidateId: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      universityInstitute: z.string().optional().nullable(),
      yearOfPassing: z.string().optional().nullable(),
      experience: z.string().optional().nullable(),
      nmcSmcNumber: z.string().optional().nullable(),
      qualifications: z.string().optional().nullable(),
      primarySpecialty: z.string().optional().nullable(),
      institutionName: z.string().optional().nullable(),
      candidateType: z.enum(["internal_staff", "external_trainee"]).default("external_trainee"),
      staffId: z.number().int().positive().optional().nullable(),
      programId: z.number().int().positive("Program is required"),
      batchCode: z.string().default("2026-Q1"),
      initialPassword: z.string().min(6, "Password must be at least 6 characters").optional().nullable(),
      notes: z.string().optional().nullable(),
    });

    const parsed = schema.parse(await c.req.json());

    try {
      const result = await preEnrollDoctorCandidate(parsed);
      return c.json(result, 201);
    } catch (err: any) {
      return c.json({ error: err.message || "Failed to pre-enroll candidate" }, 400);
    }
  })

  .post("/doctor-cbt/candidates/bulk-pre-enroll", requireDoctorCbtAdmin, async (c) => {
    const schema = z.object({
      programId: z.number().int().positive("Program is required"),
      batchCode: z.string().default("2026-Q1"),
      candidates: z
        .array(
          z.object({
            fullName: z.string().min(2),
            email: z.string().email(),
            mobile: z.string().optional().nullable(),
            nmcSmcNumber: z.string().optional().nullable(),
            qualifications: z.string().optional().nullable(),
            primarySpecialty: z.string().optional().nullable(),
            institutionName: z.string().optional().nullable(),
            initialPassword: z.string().optional().nullable(),
          })
        )
        .min(1, "At least one candidate is required"),
    });

    const { programId, batchCode, candidates } = schema.parse(await c.req.json());

    const results = [];
    const errors = [];

    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      try {
        const res = await preEnrollDoctorCandidate({
          ...cand,
          programId,
          batchCode,
          candidateType: "external_trainee",
        });
        results.push(res);
      } catch (err: any) {
        errors.push({ index: i, email: cand.email, error: err.message });
      }
    }

    return c.json({
      success: true,
      enrolledCount: results.length,
      errorsCount: errors.length,
      results,
      errors,
    });
  })

  .patch("/doctor-cbt/candidates/:id/status", requireDoctorCbtAdmin, async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id) || id <= 0) return c.json({ error: "Invalid ID" }, 400);

    const schema = z.object({
      status: z.enum(["enrolled", "active", "alumni", "suspended"]),
      notes: z.string().optional(),
    });

    const { status: newStatus, notes } = schema.parse(await c.req.json());

    const [updated] = await db
      .update(doctorProfiles)
      .set({
        status: newStatus,
        notes: notes ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(doctorProfiles.id, id))
      .returning();

    if (!updated) return c.json({ error: "Candidate not found" }, 404);

    // If suspended, also ban user record to prevent ongoing login
    if (newStatus === "suspended" && updated.userId) {
      await db
        .update(user)
        .set({
          banned: true,
          banReason: "Suspended from Doctor Skill Upgradation Program",
          updatedAt: new Date(),
        })
        .where(eq(user.id, updated.userId));
    } else if (newStatus === "active" && updated.userId) {
      await db
        .update(user)
        .set({
          banned: false,
          banReason: null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, updated.userId));
    }

    return c.json(updated);
  })

  // Full Edit for Doctor Candidate Profile & Linked Auth Account
  .patch("/doctor-cbt/candidates/:id", requireDoctorCbtAdmin, async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id) || id <= 0) return c.json({ error: "Invalid candidate ID" }, 400);

    const schema = z.object({
      fullName: z.string().min(2, "Full name is required").optional(),
      email: z.string().email("Valid email required").optional(),
      mobile: z.string().optional().nullable(),
      candidateId: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      universityInstitute: z.string().optional().nullable(),
      yearOfPassing: z.string().optional().nullable(),
      experience: z.string().optional().nullable(),
      nmcSmcNumber: z.string().optional().nullable(),
      qualifications: z.string().optional().nullable(),
      primarySpecialty: z.string().optional().nullable(),
      institutionName: z.string().optional().nullable(),
      candidateType: z.enum(["internal_staff", "external_trainee"]).optional(),
      status: z.enum(["enrolled", "active", "alumni", "suspended"]).optional(),
      programId: z.number().int().positive().optional().nullable(),
      batchCode: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    });

    const body = schema.parse(await c.req.json());

    // 1. Fetch current profile
    const [profile] = await db
      .select()
      .from(doctorProfiles)
      .where(eq(doctorProfiles.id, id))
      .limit(1);

    if (!profile) return c.json({ error: "Doctor candidate not found" }, 404);

    const now = new Date();
    const cleanEmail = body.email ? body.email.trim().toLowerCase() : undefined;
    const cleanName = body.fullName ? body.fullName.trim() : undefined;
    const isEmailChanging = cleanEmail !== undefined && cleanEmail !== profile.email.toLowerCase().trim();

    // 2. If email is changing, verify collisions
    if (isEmailChanging && cleanEmail) {
      // Check collision in doctorProfiles
      const [emailConflictProfile] = await db
        .select({ id: doctorProfiles.id })
        .from(doctorProfiles)
        .where(
          and(
            sql`LOWER(TRIM(${doctorProfiles.email})) = ${cleanEmail}`,
            sql`${doctorProfiles.id} != ${id}`
          )
        )
        .limit(1);

      if (emailConflictProfile) {
        return c.json(
          { error: `The email "${cleanEmail}" is already registered to another doctor candidate.` },
          400
        );
      }

      // Check collision in user table (with other users)
      const [emailConflictUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(
          and(
            sql`LOWER(TRIM(${user.email})) = ${cleanEmail}`,
            profile.userId ? sql`${user.id} != ${profile.userId}` : sql`TRUE`
          )
        )
        .limit(1);

      if (emailConflictUser) {
        return c.json(
          { error: `The email "${cleanEmail}" is already associated with another system account.` },
          400
        );
      }
    }

    // 3. Update Better-Auth user & account tables if userId is linked
    if (profile.userId) {
      const userUpdates: any = { updatedAt: now };
      if (isEmailChanging && cleanEmail) {
        userUpdates.email = cleanEmail;
      }
      if (cleanName && cleanName !== profile.fullName) {
        userUpdates.name = cleanName;
      }
      if (body.status === "suspended") {
        userUpdates.banned = true;
        userUpdates.banReason = "Suspended from Doctor Skill Upgradation Program";
      } else if (body.status && body.status !== "suspended") {
        userUpdates.banned = false;
        userUpdates.banReason = null;
      }

      if (Object.keys(userUpdates).length > 1) {
        await db.update(user).set(userUpdates).where(eq(user.id, profile.userId));
      }

      // Synchronize credential accountId if email changed
      if (isEmailChanging && cleanEmail) {
        await db
          .update(account)
          .set({ accountId: cleanEmail, updatedAt: now })
          .where(and(eq(account.userId, profile.userId), eq(account.providerId, "credential")));
      }
    }

    // 4. Update doctorProfiles
    const profileUpdates: any = { updatedAt: now };
    if (cleanName) profileUpdates.fullName = cleanName;
    if (cleanEmail) profileUpdates.email = cleanEmail;
    if (body.mobile !== undefined) profileUpdates.mobile = body.mobile;
    if (body.candidateId !== undefined) profileUpdates.candidateId = body.candidateId;
    if (body.address !== undefined) profileUpdates.address = body.address;
    if (body.universityInstitute !== undefined) profileUpdates.universityInstitute = body.universityInstitute;
    if (body.yearOfPassing !== undefined) profileUpdates.yearOfPassing = body.yearOfPassing;
    if (body.experience !== undefined) profileUpdates.experience = body.experience;
    if (body.nmcSmcNumber !== undefined) profileUpdates.nmcSmcNumber = body.nmcSmcNumber;
    if (body.qualifications !== undefined) profileUpdates.qualifications = body.qualifications;
    if (body.primarySpecialty !== undefined) profileUpdates.primarySpecialty = body.primarySpecialty;
    if (body.institutionName !== undefined) profileUpdates.institutionName = body.institutionName;
    if (body.candidateType !== undefined) profileUpdates.candidateType = body.candidateType;
    if (body.status !== undefined) profileUpdates.status = body.status;
    if (body.notes !== undefined) profileUpdates.notes = body.notes;

    const [updatedProfile] = await db
      .update(doctorProfiles)
      .set(profileUpdates)
      .where(eq(doctorProfiles.id, id))
      .returning();

    // 5. Update or link program enrollment if programId is provided
    if (body.programId) {
      const [existingEnrollment] = await db
        .select({ id: doctorEnrollments.id })
        .from(doctorEnrollments)
        .where(eq(doctorEnrollments.doctorId, id))
        .limit(1);

      if (existingEnrollment) {
        await db
          .update(doctorEnrollments)
          .set({
            programId: body.programId,
            batchCode: body.batchCode || undefined,
            updatedAt: now,
          })
          .where(eq(doctorEnrollments.id, existingEnrollment.id));
      } else {
        await db.insert(doctorEnrollments).values({
          doctorId: id,
          programId: body.programId,
          batchCode: body.batchCode || "2026-Q1",
        });
      }
    }

    return c.json({
      success: true,
      message: `Candidate ${updatedProfile.fullName} updated successfully.${isEmailChanging ? ` Login email updated to ${cleanEmail}.` : ""}`,
      data: updatedProfile,
    });
  })

  .post("/doctor-cbt/candidates/:id/reset-password", requireDoctorCbtAdmin, async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id) || id <= 0) return c.json({ error: "Invalid ID" }, 400);

    const { newPassword } = z
      .object({ newPassword: z.string().min(6, "Password must be at least 6 characters") })
      .parse(await c.req.json());

    const [profile] = await db
      .select({ id: doctorProfiles.id, userId: doctorProfiles.userId, email: doctorProfiles.email })
      .from(doctorProfiles)
      .where(eq(doctorProfiles.id, id))
      .limit(1);

    if (!profile) return c.json({ error: "Candidate not found" }, 404);
    if (!profile.userId) return c.json({ error: "No user account linked to this candidate" }, 400);

    const hashedPassword = await hashPassword(newPassword);

    // Update credential account
    const [existingAccount] = await db
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, profile.userId), eq(account.providerId, "credential")))
      .limit(1);

    const now = new Date();
    if (existingAccount) {
      await db
        .update(account)
        .set({ password: hashedPassword, updatedAt: now })
        .where(eq(account.id, existingAccount.id));
    } else {
      await db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: profile.email,
        providerId: "credential",
        userId: profile.userId,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Set mustChangePassword
    await db
      .update(user)
      .set({ mustChangePassword: true, updatedAt: now })
      .where(eq(user.id, profile.userId));

    return c.json({ success: true, message: "Password updated successfully." });
  })

  // ---------------------------------------------------------------------------
  // 5. Programs / Fellowships Master & Curriculum Topics
  // ---------------------------------------------------------------------------
  .get("/doctor-cbt/programs", requireDoctorCbtAccess, async (c) => {
    const rows = await db
      .select()
      .from(programs)
      .where(eq(programs.active, true))
      .orderBy(asc(programs.title));
    return c.json(rows);
  })

  .post("/doctor-cbt/programs", requireDoctorCbtAdmin, async (c) => {
    const schema = z.object({
      code: z.string().min(2, "Code is required"),
      title: z.string().min(3, "Title is required"),
      specialty: z.string().min(2, "Specialty is required"),
      durationMonths: z.number().int().min(1).default(6),
      totalCmeCredits: z.coerce.number().min(0).default(10),
      description: z.string().optional().nullable(),
    });

    const parsed = schema.parse(await c.req.json());

    const [created] = await db
      .insert(programs)
      .values({
        code: parsed.code.trim().toUpperCase(),
        title: parsed.title.trim(),
        specialty: parsed.specialty.trim(),
        durationMonths: parsed.durationMonths,
        totalCmeCredits: parsed.totalCmeCredits.toString(),
        description: parsed.description ?? null,
        active: true,
      })
      .returning();

    return c.json(created, 201);
  })

  .get("/doctor-cbt/programs/:id/topics", requireDoctorCbtAccess, async (c) => {
    const programId = Number(c.req.param("id"));
    if (isNaN(programId) || programId <= 0) return c.json({ error: "Invalid program ID" }, 400);

    const rows = await db
      .select()
      .from(clinicalTopics)
      .where(and(eq(clinicalTopics.programId, programId), eq(clinicalTopics.active, true)))
      .orderBy(asc(clinicalTopics.displayOrder), asc(clinicalTopics.title));

    return c.json(rows);
  })

  .post("/doctor-cbt/programs/:id/topics", requireDoctorCbtAdmin, async (c) => {
    const programId = Number(c.req.param("id"));
    if (isNaN(programId) || programId <= 0) return c.json({ error: "Invalid program ID" }, 400);

    const schema = z.object({
      code: z.string().min(2, "Code is required"),
      title: z.string().min(3, "Title is required"),
      description: z.string().optional().nullable(),
      cmeCredits: z.coerce.number().min(0).default(1.0),
      displayOrder: z.number().int().default(0),
    });

    const parsed = schema.parse(await c.req.json());

    const [created] = await db
      .insert(clinicalTopics)
      .values({
        programId,
        code: parsed.code.trim().toUpperCase(),
        title: parsed.title.trim(),
        description: parsed.description ?? null,
        cmeCredits: parsed.cmeCredits.toString(),
        displayOrder: parsed.displayOrder,
        active: true,
      })
      .returning();

    return c.json(created, 201);
  })

  // ---------------------------------------------------------------------------
  // 6. Online CBT Examination Hub (Pre-Test & Exit-Test)
  // ---------------------------------------------------------------------------
  .get("/doctor-cbt/cbt/overview", requireDoctorCbtAccess, async (c) => {
    const session = c.get("session")!;
    const profile = await getCurrentDoctorProfile(c);
    const role = (session.user.role || "").trim().toLowerCase();
    const isAdmin = role === "admin" || (await checkIsDoctorCbtAdmin(session.user.id, session.user.email));

    // 1. Get default or active program (ACME-BRM-2601)
    const [program] = await db
      .select()
      .from(programs)
      .where(eq(programs.active, true))
      .orderBy(asc(programs.id))
      .limit(1);

    if (!program) {
      return c.json({ error: "No active course programs found." }, 404);
    }

    // 2. Fetch Pre-test and Exit-test blueprints
    const blueprints = await db
      .select()
      .from(assessmentBlueprints);

    const preTestBp = blueprints.find((b) => b.examType === "pre_test") || blueprints[0];
    const exitTestBp = blueprints.find((b) => b.examType === "exit_test") || blueprints[1] || blueprints[0];

    // If viewing as candidate
    let candidateData = null;
    if (profile) {
      const [enrollment] = await db
        .select()
        .from(doctorEnrollments)
        .where(
          and(
            eq(doctorEnrollments.doctorId, profile.id),
            eq(doctorEnrollments.programId, program.id)
          )
        )
        .limit(1);

      if (enrollment) {
        // Fetch all exam sessions for this candidate
        const sessions = await db
          .select({
            id: examSessions.id,
            attemptNo: examSessions.attemptNo,
            blueprintId: examSessions.blueprintId,
            examType: examSessions.examType,
            status: examSessions.status,
            startedAt: examSessions.startedAt,
            completedAt: examSessions.completedAt,
            timeSpentSeconds: examSessions.timeSpentSeconds,
            scorePercentage: examSessions.scorePercentage,
            rawScore: examSessions.rawScore,
            totalPossibleMarks: examSessions.totalPossibleMarks,
            passed: examSessions.passed,
            correctCount: examSessions.correctCount,
            incorrectCount: examSessions.incorrectCount,
            unansweredCount: examSessions.unansweredCount,
          })
          .from(examSessions)
          .where(eq(examSessions.enrollmentId, enrollment.id))
          .orderBy(desc(examSessions.startedAt));

        const preSessions = sessions.filter((s) => s.examType === "pre_test");
        const exitSessions = sessions.filter((s) => s.examType === "exit_test");

        const activePre = preSessions.find((s) => s.status === "in_progress");
        const completedPre = preSessions.find((s) => s.status === "completed" || s.status === "timed_out");

        const activeExit = exitSessions.find((s) => s.status === "in_progress");
        const completedExit = exitSessions.find((s) => s.status === "completed" || s.status === "timed_out");

        candidateData = {
          profile: {
            id: profile.id,
            candidateId: profile.candidateId,
            fullName: profile.fullName,
            email: profile.email,
          },
          enrollmentId: enrollment.id,
          preTest: {
            blueprint: preTestBp,
            status: activePre ? "in_progress" : completedPre ? "completed" : "not_started",
            inProgressSessionId: activePre?.id ?? null,
            latestAttempt: completedPre || activePre || null,
            attemptsCount: preSessions.filter((s) => s.status !== "in_progress").length,
            retakeAllowed: Boolean(preTestBp.allowRetakes || enrollment.preTestRetakeAllowed),
          },
          exitTest: {
            blueprint: exitTestBp,
            status: activeExit ? "in_progress" : completedExit ? "completed" : "not_started",
            inProgressSessionId: activeExit?.id ?? null,
            latestAttempt: completedExit || activeExit || null,
            attemptsCount: exitSessions.filter((s) => s.status !== "in_progress").length,
            retakeAllowed: Boolean(exitTestBp.allowRetakes || enrollment.exitTestRetakeAllowed),
          },
          allAttempts: sessions,
        };
      }
    }

    // If admin, also get summary list of all enrolled candidates and their pre/exit test scores
    let adminOverview: any[] = [];
    if (isAdmin) {
      const candidatesList = await db
        .select({
          id: doctorProfiles.id,
          candidateId: doctorProfiles.candidateId,
          fullName: doctorProfiles.fullName,
          email: doctorProfiles.email,
          mobile: doctorProfiles.mobile,
          enrollmentId: doctorEnrollments.id,
          preTestRetakeAllowed: doctorEnrollments.preTestRetakeAllowed,
          exitTestRetakeAllowed: doctorEnrollments.exitTestRetakeAllowed,
          status: doctorProfiles.status,
        })
        .from(doctorProfiles)
        .innerJoin(doctorEnrollments, eq(doctorProfiles.id, doctorEnrollments.doctorId))
        .where(eq(doctorEnrollments.programId, program.id))
        .orderBy(asc(doctorProfiles.candidateId));

      const allSessions = await db
        .select({
          id: examSessions.id,
          doctorId: examSessions.doctorId,
          examType: examSessions.examType,
          status: examSessions.status,
          scorePercentage: examSessions.scorePercentage,
          passed: examSessions.passed,
          completedAt: examSessions.completedAt,
        })
        .from(examSessions)
        .where(eq(examSessions.status, "completed"));

      adminOverview = candidatesList.map((cand) => {
        const candSessions = allSessions.filter((s) => s.doctorId === cand.id);
        const pre = candSessions.filter((s) => s.examType === "pre_test")[0] || null;
        const exit = candSessions.filter((s) => s.examType === "exit_test")[0] || null;
        return {
          ...cand,
          preTest: pre
            ? { score: parseFloat(pre.scorePercentage || "0"), passed: pre.passed, completedAt: pre.completedAt }
            : null,
          exitTest: exit
            ? { score: parseFloat(exit.scorePercentage || "0"), passed: exit.passed, completedAt: exit.completedAt }
            : null,
          preTestRetakeAllowed: Boolean(cand.preTestRetakeAllowed),
          exitTestRetakeAllowed: Boolean(cand.exitTestRetakeAllowed),
        };
      });
    }

    return c.json({
      program,
      blueprints: {
        preTest: preTestBp,
        exitTest: exitTestBp,
      },
      candidate: candidateData,
      adminOverview,
      isAdmin,
    });
  })

  // Start or resume an exam
  .post("/doctor-cbt/cbt/start", requireDoctorCbtAccess, async (c) => {
    const session = c.get("session")!;
    const profile = await getCurrentDoctorProfile(c);
    const body = await c.req.json().catch(() => ({}));

    const examType = body.examType === "exit_test" ? "exit_test" : "pre_test";

    // Target doctor ID (can be self for candidate, or specified by admin for testing)
    const doctorId = profile?.id ?? body.doctorId;
    if (!doctorId) {
      return c.json({ error: "Doctor profile not found." }, 403);
    }

    // Find enrollment
    const [enrollment] = await db
      .select()
      .from(doctorEnrollments)
      .where(eq(doctorEnrollments.doctorId, doctorId))
      .limit(1);

    if (!enrollment) {
      return c.json({ error: "Candidate is not enrolled in any program." }, 400);
    }

    // Find matching blueprint
    const [blueprint] = await db
      .select()
      .from(assessmentBlueprints)
      .where(eq(assessmentBlueprints.examType, examType))
      .limit(1);

    if (!blueprint) {
      return c.json({ error: `Assessment blueprint for ${examType} not found.` }, 404);
    }

    if (!blueprint.active) {
      return c.json(
        {
          error: `The ${examType === "exit_test" ? "Exit-Test Examination" : "Pre-Test Assessment"} is currently disabled by administration.`,
        },
        403
      );
    }

    // Check if an in-progress session already exists
    const [inProgressSession] = await db
      .select()
      .from(examSessions)
      .where(
        and(
          eq(examSessions.enrollmentId, enrollment.id),
          eq(examSessions.blueprintId, blueprint.id),
          eq(examSessions.doctorId, doctorId),
          eq(examSessions.status, "in_progress")
        )
      )
      .limit(1);

    if (inProgressSession) {
      // Fetch saved answers
      const savedAnswers = await db
        .select()
        .from(examSessionAnswers)
        .where(eq(examSessionAnswers.sessionId, inProgressSession.id));

      const answersMap: Record<number, number> = {};
      const flaggedSet: number[] = [];
      for (const ans of savedAnswers) {
        if (ans.selectedOptionIndex !== null) answersMap[ans.questionId] = ans.selectedOptionIndex;
        if (ans.flaggedForReview) flaggedSet.push(ans.questionId);
      }

      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(inProgressSession.startedAt).getTime()) / 1000
      );
      const remainingSeconds = Math.max(0, blueprint.durationMinutes * 60 - elapsedSeconds);

      const sanitizedQuestions = (inProgressSession.questionSnapshots as any[]).map((q, idx) => ({
        id: q.id,
        index: idx + 1,
        code: q.code,
        clinicalVignette: q.clinicalVignette,
        questionPrompt: q.questionPrompt,
        options: sanitizeOptions(q.options),
      }));

      return c.json({
        sessionId: inProgressSession.id,
        attemptNo: inProgressSession.attemptNo,
        examType: inProgressSession.examType,
        title: blueprint.title,
        durationMinutes: blueprint.durationMinutes,
        remainingSeconds,
        totalQuestions: sanitizedQuestions.length,
        startedAt: inProgressSession.startedAt,
        questions: sanitizedQuestions,
        answers: answersMap,
        flaggedQuestions: flaggedSet,
        resumed: true,
      });
    }

    // Check if the candidate has already completed this exam
    const completedSessions = await db
      .select({ id: examSessions.id })
      .from(examSessions)
      .where(
        and(
          eq(examSessions.enrollmentId, enrollment.id),
          eq(examSessions.blueprintId, blueprint.id),
          eq(examSessions.doctorId, doctorId),
          or(eq(examSessions.status, "completed"), eq(examSessions.status, "timed_out"))
        )
      );

    if (completedSessions.length > 0) {
      const userRole = (session?.user?.role || "").trim().toLowerCase();
      const isAdminUser = userRole === "admin";
      const isRetakePermitted =
        Boolean(blueprint.allowRetakes) ||
        (examType === "exit_test" ? Boolean(enrollment.exitTestRetakeAllowed) : Boolean(enrollment.preTestRetakeAllowed)) ||
        isAdminUser;

      if (!isRetakePermitted) {
        return c.json(
          {
            error: `Retakes are locked by default. You have already completed the ${examType === "exit_test" ? "Exit-Test Examination" : "Pre-Test Assessment"}. Retaking requires administrative authorization.`,
          },
          403
        );
      }
    }

    // Start a fresh session: Load questions from questionBank for this program
    const topics = await db
      .select({ id: clinicalTopics.id })
      .from(clinicalTopics)
      .where(eq(clinicalTopics.programId, enrollment.programId));

    const topicIds = topics.map((t) => t.id);
    if (topicIds.length === 0) {
      return c.json({ error: "No topics configured for this program." }, 400);
    }

    const questionsList = await db
      .select()
      .from(questionBank)
      .where(
        and(
          sql`${questionBank.topicId} IN (${sql.join(topicIds.map((id) => sql`${id}`), sql`, `)})`,
          eq(questionBank.active, true),
          eq(questionBank.status, "approved")
        )
      )
      .orderBy(asc(questionBank.code));

    if (questionsList.length === 0) {
      return c.json({ error: "No questions available in question bank." }, 400);
    }

    // Randomize the question sequence for every test instance using Fisher-Yates shuffle
    const shuffledQuestions = shuffleArray(questionsList).slice(0, blueprint.totalQuestions);

    const questionSnapshots = shuffledQuestions.map((q) => ({
      id: q.id,
      code: q.code,
      clinicalVignette: q.clinicalVignette,
      questionPrompt: q.questionPrompt,
      options: sanitizeOptions(q.options),
      correctOptionIndex: q.correctOptionIndex,
      clinicalExplanation: q.clinicalExplanation,
    }));

    const attemptNo = `DOC-CBT-${examType === "exit_test" ? "EXIT" : "PRE"}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

    const [newSession] = await db
      .insert(examSessions)
      .values({
        attemptNo,
        enrollmentId: enrollment.id,
        blueprintId: blueprint.id,
        doctorId,
        examType,
        status: "in_progress",
        startedAt: new Date(),
        totalPossibleMarks: questionsList.length.toString(),
        questionSnapshots,
      })
      .returning();

    const sanitizedQuestions = questionSnapshots.map((q, idx) => ({
      id: q.id,
      index: idx + 1,
      code: q.code,
      clinicalVignette: q.clinicalVignette,
      questionPrompt: q.questionPrompt,
      options: sanitizeOptions(q.options),
    }));

    return c.json({
      sessionId: newSession.id,
      attemptNo: newSession.attemptNo,
      examType: newSession.examType,
      title: blueprint.title,
      durationMinutes: blueprint.durationMinutes,
      remainingSeconds: blueprint.durationMinutes * 60,
      totalQuestions: sanitizedQuestions.length,
      startedAt: newSession.startedAt,
      questions: sanitizedQuestions,
      answers: {},
      flaggedQuestions: [],
      resumed: false,
    }, 201);
  })

  // Admin toggle to enable/disable exams, set duration, and toggle cohort-wide retake policy
  .patch("/doctor-cbt/cbt/exams/:examType/status", requireDoctorCbtAdmin, async (c) => {
    const examType = c.req.param("examType");
    if (examType !== "pre_test" && examType !== "exit_test") {
      return c.json({ error: "Invalid exam type" }, 400);
    }

    const schema = z.object({
      active: z.boolean().optional(),
      durationMinutes: z.number().int().min(1).max(360).optional(),
      allowRetakes: z.boolean().optional(),
    });
    const { active, durationMinutes, allowRetakes } = schema.parse(await c.req.json());

    if (active === undefined && durationMinutes === undefined && allowRetakes === undefined) {
      return c.json({ error: "No fields provided to update" }, 400);
    }

    const updateFields: any = { updatedAt: new Date() };
    if (active !== undefined) updateFields.active = active;
    if (durationMinutes !== undefined) updateFields.durationMinutes = durationMinutes;
    if (allowRetakes !== undefined) updateFields.allowRetakes = allowRetakes;

    const [updated] = await db
      .update(assessmentBlueprints)
      .set(updateFields)
      .where(eq(assessmentBlueprints.examType, examType))
      .returning();

    if (!updated) {
      return c.json({ error: `Blueprint for ${examType} not found.` }, 404);
    }

    const examTitle = examType === "exit_test" ? "Exit-Test Examination" : "Pre-Test Assessment";
    let message = "";
    if (allowRetakes !== undefined) {
      message = `${examTitle} retakes are now ${updated.allowRetakes ? "permitted cohort-wide" : "locked down (admin authorization required)"}.`;
    } else if (active !== undefined && durationMinutes !== undefined) {
      message = `${examTitle} has been ${updated.active ? "enabled" : "disabled"} and duration set to ${updated.durationMinutes} minutes.`;
    } else if (durationMinutes !== undefined) {
      message = `${examTitle} duration set to ${updated.durationMinutes} minutes.`;
    } else {
      message = `${examTitle} has been ${updated.active ? "enabled" : "disabled"}.`;
    }

    return c.json({
      success: true,
      examType,
      active: updated.active,
      durationMinutes: updated.durationMinutes,
      allowRetakes: updated.allowRetakes,
      message,
    });
  })

  // Admin action: Grant or Revoke Retake Authorization for a Candidate
  .post("/doctor-cbt/cbt/candidates/:enrollmentId/allow-retake", requireDoctorCbtAdmin, async (c) => {
    const enrollmentId = Number(c.req.param("enrollmentId"));
    if (isNaN(enrollmentId) || enrollmentId <= 0) return c.json({ error: "Invalid enrollment ID" }, 400);

    const schema = z.object({
      examType: z.enum(["pre_test", "exit_test"]),
      allowed: z.boolean(),
    });

    const { examType, allowed } = schema.parse(await c.req.json());

    const updateField =
      examType === "exit_test"
        ? { exitTestRetakeAllowed: allowed, updatedAt: new Date() }
        : { preTestRetakeAllowed: allowed, updatedAt: new Date() };

    const [updated] = await db
      .update(doctorEnrollments)
      .set(updateField)
      .where(eq(doctorEnrollments.id, enrollmentId))
      .returning();

    if (!updated) return c.json({ error: "Candidate enrollment not found" }, 404);

    return c.json({
      success: true,
      enrollmentId,
      examType,
      allowed,
      message: `${examType === "exit_test" ? "Exit-Test" : "Pre-Test"} retake has been ${allowed ? "authorized" : "locked"} for candidate.`,
    });
  })

  // Save candidate's selected answer during exam
  .post("/doctor-cbt/cbt/session/:sessionId/save-answer", requireDoctorCbtAccess, async (c) => {
    const sessionId = Number(c.req.param("sessionId"));
    if (isNaN(sessionId) || sessionId <= 0) return c.json({ error: "Invalid session ID" }, 400);

    const schema = z.object({
      questionId: z.number().int().positive(),
      selectedOptionIndex: z.number().int().min(-1).max(10).nullable(),
      flaggedForReview: z.boolean().optional(),
    });

    const { questionId, selectedOptionIndex, flaggedForReview } = schema.parse(await c.req.json());

    const [session] = await db
      .select({ id: examSessions.id, status: examSessions.status })
      .from(examSessions)
      .where(eq(examSessions.id, sessionId))
      .limit(1);

    if (!session || session.status !== "in_progress") {
      return c.json({ error: "Exam session is not in progress." }, 409);
    }

    const [existing] = await db
      .select({ id: examSessionAnswers.id })
      .from(examSessionAnswers)
      .where(
        and(
          eq(examSessionAnswers.sessionId, sessionId),
          eq(examSessionAnswers.questionId, questionId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(examSessionAnswers)
        .set({
          selectedOptionIndex: selectedOptionIndex === -1 ? null : selectedOptionIndex,
          flaggedForReview: flaggedForReview ?? false,
          updatedAt: new Date(),
        })
        .where(eq(examSessionAnswers.id, existing.id));
    } else {
      await db.insert(examSessionAnswers).values({
        sessionId,
        questionId,
        selectedOptionIndex: selectedOptionIndex === -1 ? null : selectedOptionIndex,
        flaggedForReview: flaggedForReview ?? false,
      });
    }

    return c.json({ success: true });
  })

  // Submit and grade the exam using simple staff CBT scoring
  .post("/doctor-cbt/cbt/session/:sessionId/submit", requireDoctorCbtAccess, async (c) => {
    const sessionId = Number(c.req.param("sessionId"));
    if (isNaN(sessionId) || sessionId <= 0) return c.json({ error: "Invalid session ID" }, 400);

    const body = await c.req.json().catch(() => ({}));
    const answersMap: Record<string, number> = body.answers || {};

    const [session] = await db
      .select()
      .from(examSessions)
      .where(eq(examSessions.id, sessionId))
      .limit(1);

    if (!session) return c.json({ error: "Exam session not found." }, 404);
    if (session.status === "completed") {
      return c.json({ error: "This exam has already been submitted." }, 409);
    }

    const [blueprint] = await db
      .select()
      .from(assessmentBlueprints)
      .where(eq(assessmentBlueprints.id, session.blueprintId))
      .limit(1);

    const snapshots = (session.questionSnapshots as any[]) || [];
    let correctCount = 0;
    let unansweredCount = 0;

    const review = snapshots.map((q) => {
      const raw = answersMap[String(q.id)] ?? answersMap[q.id];
      const selectedOptionIndex = typeof raw === "number" && raw >= 0 ? raw : -1;
      const isCorrect = selectedOptionIndex === q.correctOptionIndex;

      if (selectedOptionIndex === -1) {
        unansweredCount++;
      } else if (isCorrect) {
        correctCount++;
      }

      return {
        id: q.id,
        code: q.code,
        clinicalVignette: q.clinicalVignette,
        questionPrompt: q.questionPrompt,
        options: sanitizeOptions(q.options),
        selectedOptionIndex,
        correctOptionIndex: q.correctOptionIndex,
        isCorrect,
        clinicalExplanation: q.clinicalExplanation,
      };
    });

    const totalQuestions = snapshots.length;
    const incorrectCount = totalQuestions - correctCount - unansweredCount;
    // Simple Percentage: (correct / total) * 100
    const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 10000) / 100 : 0;
    const passingThreshold = blueprint ? parseFloat(blueprint.passingPercentage) || 70.0 : 70.0;
    const passed = scorePercentage >= passingThreshold;

    const now = new Date();
    const timeSpentSeconds = Math.min(
      (blueprint?.durationMinutes || 60) * 60,
      Math.max(1, Math.floor((now.getTime() - new Date(session.startedAt).getTime()) / 1000))
    );

    // Save final answers into examSessionAnswers table for record keeping
    for (const r of review) {
      const [existing] = await db
        .select({ id: examSessionAnswers.id })
        .from(examSessionAnswers)
        .where(
          and(
            eq(examSessionAnswers.sessionId, sessionId),
            eq(examSessionAnswers.questionId, r.id)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(examSessionAnswers)
          .set({
            selectedOptionIndex: r.selectedOptionIndex === -1 ? null : r.selectedOptionIndex,
            isCorrect: r.isCorrect,
            marksAwarded: r.isCorrect ? "1.00" : "0.00",
            updatedAt: now,
          })
          .where(eq(examSessionAnswers.id, existing.id));
      } else {
        await db.insert(examSessionAnswers).values({
          sessionId,
          questionId: r.id,
          selectedOptionIndex: r.selectedOptionIndex === -1 ? null : r.selectedOptionIndex,
          isCorrect: r.isCorrect,
          marksAwarded: r.isCorrect ? "1.00" : "0.00",
        });
      }
    }

    await db
      .update(examSessions)
      .set({
        status: "completed",
        completedAt: now,
        timeSpentSeconds,
        scorePercentage: scorePercentage.toFixed(2),
        rawScore: correctCount.toString(),
        totalPossibleMarks: totalQuestions.toString(),
        passed,
        correctCount,
        incorrectCount,
        unansweredCount,
        updatedAt: now,
      })
      .where(eq(examSessions.id, sessionId));

    // Lock down retake for this candidate by resetting individual authorization back to locked
    if (session.enrollmentId) {
      if (session.examType === "exit_test") {
        await db
          .update(doctorEnrollments)
          .set({ exitTestRetakeAllowed: false, updatedAt: now })
          .where(eq(doctorEnrollments.id, session.enrollmentId));
      } else {
        await db
          .update(doctorEnrollments)
          .set({ preTestRetakeAllowed: false, updatedAt: now })
          .where(eq(doctorEnrollments.id, session.enrollmentId));
      }
    }

    return c.json({
      sessionId,
      attemptNo: session.attemptNo,
      examType: session.examType,
      title: blueprint?.title || "Doctor CBT Exam",
      totalQuestions,
      correctCount,
      incorrectCount,
      unansweredCount,
      scorePercentage,
      passed,
      timeSpentSeconds,
      completedAt: now,
      review,
    });
  })

  // Get scorecard and question review of a completed session
  .get("/doctor-cbt/cbt/session/:sessionId/result", requireDoctorCbtAccess, async (c) => {
    const sessionId = Number(c.req.param("sessionId"));
    if (isNaN(sessionId) || sessionId <= 0) return c.json({ error: "Invalid session ID" }, 400);

    const [session] = await db
      .select()
      .from(examSessions)
      .where(eq(examSessions.id, sessionId))
      .limit(1);

    if (!session) return c.json({ error: "Session not found" }, 404);

    const [blueprint] = await db
      .select()
      .from(assessmentBlueprints)
      .where(eq(assessmentBlueprints.id, session.blueprintId))
      .limit(1);

    const answersList = await db
      .select()
      .from(examSessionAnswers)
      .where(eq(examSessionAnswers.sessionId, sessionId));

    const ansMap: Record<number, number> = {};
    for (const a of answersList) {
      if (a.selectedOptionIndex !== null) ansMap[a.questionId] = a.selectedOptionIndex;
    }

    const snapshots = (session.questionSnapshots as any[]) || [];
    const review = snapshots.map((q) => {
      const selectedOptionIndex = ansMap[q.id] ?? -1;
      const isCorrect = selectedOptionIndex === q.correctOptionIndex;
      return {
        id: q.id,
        code: q.code,
        clinicalVignette: q.clinicalVignette,
        questionPrompt: q.questionPrompt,
        options: sanitizeOptions(q.options),
        selectedOptionIndex,
        correctOptionIndex: q.correctOptionIndex,
        isCorrect,
        clinicalExplanation: q.clinicalExplanation,
      };
    });

    return c.json({
      sessionId: session.id,
      attemptNo: session.attemptNo,
      examType: session.examType,
      title: blueprint?.title || "Doctor CBT Exam",
      totalQuestions: snapshots.length,
      correctCount: session.correctCount ?? 0,
      incorrectCount: session.incorrectCount ?? 0,
      unansweredCount: session.unansweredCount ?? 0,
      scorePercentage: parseFloat(session.scorePercentage || "0"),
      passed: session.passed ?? false,
      timeSpentSeconds: session.timeSpentSeconds,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      review,
    });
  });
