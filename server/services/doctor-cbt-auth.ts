import { db } from "../db/client.ts";
import { eq, sql, and } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { user, account, staff } from "../db/schema.ts";
import {
  doctorProfiles,
  doctorEnrollments,
  moduleUsers,
  moduleSettings,
  programs,
} from "../db/schema-doctor-cbt.ts";
import { randomUUID } from "crypto";

export interface WhitelistCheckResult {
  whitelisted: boolean;
  status?: string;
  candidateType?: string;
  profileId?: number;
  fullName?: string;
  email?: string;
  reason?: string;
}

/**
 * Checks whether an email is enrolled and active in the Doctor Skill Upgradation Program.
 */
export async function isDoctorEmailWhitelisted(email: string): Promise<WhitelistCheckResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { whitelisted: false, reason: "Email is required." };
  }

  const [profile] = await db
    .select({
      id: doctorProfiles.id,
      fullName: doctorProfiles.fullName,
      email: doctorProfiles.email,
      status: doctorProfiles.status,
      candidateType: doctorProfiles.candidateType,
      userId: doctorProfiles.userId,
    })
    .from(doctorProfiles)
    .where(sql`LOWER(TRIM(${doctorProfiles.email})) = ${cleanEmail}`)
    .limit(1);

  if (!profile) {
    return {
      whitelisted: false,
      reason: "This email is not enrolled in any Doctor Skill Upgradation Program.",
    };
  }

  if (profile.status === "suspended") {
    return {
      whitelisted: false,
      status: profile.status,
      profileId: profile.id,
      fullName: profile.fullName,
      reason: "This doctor candidate profile is suspended. Please contact the Academic Coordinator.",
    };
  }

  return {
    whitelisted: true,
    status: profile.status,
    candidateType: profile.candidateType,
    profileId: profile.id,
    fullName: profile.fullName,
    email: profile.email,
  };
}

export interface PreEnrollCandidateParams {
  fullName: string;
  email: string;
  mobile?: string | null;
  candidateId?: string | null;
  address?: string | null;
  universityInstitute?: string | null;
  yearOfPassing?: string | null;
  experience?: string | null;
  nmcSmcNumber?: string | null;
  qualifications?: string | null;
  primarySpecialty?: string | null;
  institutionName?: string | null;
  candidateType?: "internal_staff" | "external_trainee";
  staffId?: number | null;
  programId: number;
  batchCode?: string;
  initialPassword?: string | null;
  notes?: string | null;
}

/**
 * Pre-enrolls a doctor candidate:
 * 1. Creates/updates `doctor_cbt.doctor_profiles`.
 * 2. Provisions or links a `user` account with role `doctor_candidate` (or links to existing staff user).
 * 3. If initialPassword is provided, creates/updates credential `account` with hashed password.
 * 4. Creates `doctor_cbt.doctor_enrollments` record for the designated program.
 */
export async function preEnrollDoctorCandidate(params: PreEnrollCandidateParams) {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.fullName.trim();
  const batch = (params.batchCode || "2026-Q1").trim();

  // 1. Verify program exists
  const [prog] = await db
    .select({ id: programs.id, title: programs.title })
    .from(programs)
    .where(eq(programs.id, params.programId))
    .limit(1);

  if (!prog) {
    throw new Error(`Program with ID ${params.programId} does not exist.`);
  }

  // 2. Check if user record already exists for this email
  let [existingUser] = await db
    .select({ id: user.id, email: user.email, role: user.role, banned: user.banned })
    .from(user)
    .where(sql`LOWER(TRIM(${user.email})) = ${cleanEmail}`)
    .limit(1);

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    // If existing user has generic role and no staff link, ensure role is at least doctor_candidate
    if (existingUser.role === "user" || !existingUser.role) {
      await db
        .update(user)
        .set({ role: "doctor_candidate", updatedAt: new Date() })
        .where(eq(user.id, userId));
    }
  } else {
    // Create new user account for the candidate doctor
    userId = randomUUID();
    const now = new Date();
    await db.insert(user).values({
      id: userId,
      name: cleanName,
      email: cleanEmail,
      emailVerified: true,
      role: "doctor_candidate",
      mustChangePassword: Boolean(params.initialPassword),
      createdAt: now,
      updatedAt: now,
    });
  }

  // 3. If initial password provided, setup credential account
  if (params.initialPassword && params.initialPassword.length >= 6) {
    const hashedPassword = await hashPassword(params.initialPassword);
    const [existingAccount] = await db
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
      .limit(1);

    const now = new Date();
    if (existingAccount) {
      await db
        .update(account)
        .set({ password: hashedPassword, updatedAt: now })
        .where(eq(account.id, existingAccount.id));
    } else {
      await db.insert(account).values({
        id: randomUUID(),
        accountId: cleanEmail,
        providerId: "credential",
        userId,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // 4. Create or update doctor profile
  let [profile] = await db
    .select({ id: doctorProfiles.id })
    .from(doctorProfiles)
    .where(sql`LOWER(TRIM(${doctorProfiles.email})) = ${cleanEmail}`)
    .limit(1);

  if (profile) {
    await db
      .update(doctorProfiles)
      .set({
        userId,
        staffId: params.staffId ?? null,
        fullName: cleanName,
        mobile: params.mobile ?? null,
        candidateId: params.candidateId ?? undefined,
        address: params.address ?? undefined,
        universityInstitute: params.universityInstitute ?? undefined,
        yearOfPassing: params.yearOfPassing ?? undefined,
        experience: params.experience ?? undefined,
        nmcSmcNumber: params.nmcSmcNumber ?? null,
        qualifications: params.qualifications ?? null,
        primarySpecialty: params.primarySpecialty ?? null,
        institutionName: params.institutionName ?? null,
        candidateType: params.candidateType ?? (params.staffId ? "internal_staff" : "external_trainee"),
        status: "enrolled",
        notes: params.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(doctorProfiles.id, profile.id));
  } else {
    const [inserted] = await db
      .insert(doctorProfiles)
      .values({
        userId,
        staffId: params.staffId ?? null,
        fullName: cleanName,
        email: cleanEmail,
        mobile: params.mobile ?? null,
        candidateId: params.candidateId ?? null,
        address: params.address ?? null,
        universityInstitute: params.universityInstitute ?? null,
        yearOfPassing: params.yearOfPassing ?? null,
        experience: params.experience ?? null,
        nmcSmcNumber: params.nmcSmcNumber ?? null,
        qualifications: params.qualifications ?? null,
        primarySpecialty: params.primarySpecialty ?? null,
        institutionName: params.institutionName ?? null,
        candidateType: params.candidateType ?? (params.staffId ? "internal_staff" : "external_trainee"),
        status: "enrolled",
        notes: params.notes ?? null,
      })
      .returning({ id: doctorProfiles.id });
    profile = inserted;
  }

  // 5. Enroll in program
  const [existingEnrollment] = await db
    .select({ id: doctorEnrollments.id })
    .from(doctorEnrollments)
    .where(
      and(
        eq(doctorEnrollments.doctorId, profile.id),
        eq(doctorEnrollments.programId, params.programId),
        eq(doctorEnrollments.batchCode, batch)
      )
    )
    .limit(1);

  let enrollmentId: number;
  if (existingEnrollment) {
    enrollmentId = existingEnrollment.id;
  } else {
    const [insertedEnrollment] = await db
      .insert(doctorEnrollments)
      .values({
        doctorId: profile.id,
        programId: params.programId,
        batchCode: batch,
        status: "enrolled",
      })
      .returning({ id: doctorEnrollments.id });
    enrollmentId = insertedEnrollment.id;
  }

  return {
    success: true,
    profileId: profile.id,
    userId,
    enrollmentId,
    email: cleanEmail,
    fullName: cleanName,
    programTitle: prog.title,
    batchCode: batch,
  };
}

/**
 * Checks whether a given user is designated as a Doctor CBT Module Admin.
 */
export async function isDoctorCbtAdmin(userId: string | null | undefined, userEmail?: string | null): Promise<boolean> {
  if (!userId && !userEmail) return false;

  // Check 1: Is user in doctor_cbt.module_users with role_in_module = 'module_admin'?
  const conditions = [];
  if (userId) conditions.push(eq(moduleUsers.userId, userId));
  if (userEmail) conditions.push(sql`LOWER(TRIM(${moduleUsers.email})) = ${userEmail.trim().toLowerCase()}`);

  const [modUser] = await db
    .select({ id: moduleUsers.id, roleInModule: moduleUsers.roleInModule, active: moduleUsers.active })
    .from(moduleUsers)
    .where(and(sql`(${sql.join(conditions, sql` OR `)})`, eq(moduleUsers.active, true)))
    .limit(1);

  if (modUser && modUser.roleInModule === "module_admin") {
    return true;
  }

  // Check 2: Check module_settings.assigned_module_admins list
  const [adminSetting] = await db
    .select({ settingValue: moduleSettings.settingValue })
    .from(moduleSettings)
    .where(eq(moduleSettings.settingKey, "assigned_module_admins"))
    .limit(1);

  if (adminSetting?.settingValue && Array.isArray(adminSetting.settingValue)) {
    const assignedIds = adminSetting.settingValue as (string | number)[];
    if (userId && assignedIds.some((id) => String(id) === String(userId))) {
      return true;
    }
  }

  return false;
}

export interface GoogleAuthVerificationResult {
  authorized: boolean;
  code?: string;
  reason?: string;
  user?: {
    email: string;
    name: string;
    image?: string | null;
    emailVerified: boolean;
    role: string;
  };
  matchedSource?: "doctor_profile" | "module_user" | "staff";
}

/**
 * Validates Google OAuth users against Doctor CBT active candidates/users and the Staff directory:
 * 1. Checks if configured and active in Doctor CBT (doctorProfiles status != 'suspended', or active moduleUsers).
 * 2. If not found in Doctor CBT, checks active staff directory (staff.active = true, status = 'active').
 * 3. Rejects if found in neither or if doctor candidate profile is suspended.
 */
export async function verifyAndAuthorizeGoogleUser(profile: {
  email?: string | null;
  email_verified?: boolean;
  name?: string | null;
  picture?: string | null;
}): Promise<GoogleAuthVerificationResult> {
  const cleanEmail = profile.email?.trim().toLowerCase() ?? "";
  if (!cleanEmail || profile.email_verified !== true) {
    return {
      authorized: false,
      code: "account_not_allowed",
      reason: "Use a verified Google account to sign in.",
    };
  }

  // 1. Check Doctor CBT - Candidate Profiles
  const [candidate] = await db
    .select({
      id: doctorProfiles.id,
      fullName: doctorProfiles.fullName,
      status: doctorProfiles.status,
      candidateType: doctorProfiles.candidateType,
      userId: doctorProfiles.userId,
    })
    .from(doctorProfiles)
    .where(sql`LOWER(TRIM(${doctorProfiles.email})) = ${cleanEmail}`)
    .limit(1);

  if (candidate) {
    if (candidate.status === "suspended") {
      return {
        authorized: false,
        code: "account_suspended",
        reason: "This doctor candidate profile is suspended. Please contact the Academic Coordinator.",
      };
    }

    return {
      authorized: true,
      matchedSource: "doctor_profile",
      user: {
        email: cleanEmail,
        name: candidate.fullName || profile.name || cleanEmail.split("@")[0],
        image: profile.picture ?? null,
        emailVerified: true,
        role: "doctor_candidate",
      },
    };
  }

  // 2. Check Doctor CBT - Module Users (faculty / admins / assessors)
  const [modUser] = await db
    .select({
      id: moduleUsers.id,
      fullName: moduleUsers.fullName,
      roleInModule: moduleUsers.roleInModule,
      active: moduleUsers.active,
      userId: moduleUsers.userId,
    })
    .from(moduleUsers)
    .where(and(sql`LOWER(TRIM(${moduleUsers.email})) = ${cleanEmail}`, eq(moduleUsers.active, true)))
    .limit(1);

  if (modUser) {
    return {
      authorized: true,
      matchedSource: "module_user",
      user: {
        email: cleanEmail,
        name: modUser.fullName || profile.name || cleanEmail.split("@")[0],
        image: profile.picture ?? null,
        emailVerified: true,
        role: modUser.roleInModule === "module_admin" ? "staff" : "doctor_candidate",
      },
    };
  }

  // 3. Check Hospital Staff Directory
  const [staffMember] = await db
    .select({
      staffId: staff.staffId,
      name: staff.name,
      role: staff.role,
      status: staff.status,
      active: staff.active,
      userId: staff.userId,
    })
    .from(staff)
    .where(
      and(
        sql`LOWER(TRIM(${staff.email})) = ${cleanEmail}`,
        eq(staff.active, true),
        sql`LOWER(TRIM(${staff.status})) = 'active'`
      )
    )
    .limit(1);

  if (staffMember) {
    return {
      authorized: true,
      matchedSource: "staff",
      user: {
        email: cleanEmail,
        name: staffMember.name || profile.name || cleanEmail.split("@")[0],
        image: profile.picture ?? null,
        emailVerified: true,
        role: staffMember.role || "staff",
      },
    };
  }

  // 4. Not configured in Doctor CBT or Staff Directory
  return {
    authorized: false,
    code: "user_not_found",
    reason: "This Google account is not configured in Doctor CBT or Hospital Staff directory. Please contact the administrator to enroll.",
  };
}
