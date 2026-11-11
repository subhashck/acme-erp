import crypto from "crypto";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "../db/client.ts";
import { desktopAuthPins, session, staff, user, departments, staffDepartments } from "../db/schema.ts";
import { auth } from "../auth.ts";

const SERVER_SECRET = process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me-dev-secret-change-me";
const PIN_EXPIRATION_SECONDS = 90;

export interface GeneratedPinResult {
  pin: string;
  expiresInSeconds: number;
  expiresAt: string;
}

export interface VerifyPinResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string | null;
  };
  session?: {
    id: string;
    expiresAt: Date;
    token: string;
  };
  cookie?: {
    name: string;
    value: string;
    options: {
      path: string;
      httpOnly: boolean;
      sameSite: "Lax" | "Strict" | "None";
      secure: boolean;
      maxAge: number;
    };
  };
}

export interface StationStaffCard {
  userId: string;
  name: string;
  employeeCode: string;
  role: string;
  department: string;
  image: string | null;
}

/**
 * Hash a 6-digit PIN with a per-record salt and server secret.
 */
function hashPin(pin: string, salt: string): string {
  return crypto
    .createHmac("sha256", SERVER_SECRET)
    .update(`${pin}:${salt}`)
    .digest("hex");
}

/**
 * Sign session token for Better-Auth cookie format: `${token}.${base64Hmac}`
 */
function signSessionToken(token: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret).update(token).digest("base64");
  return `${token}.${hmac}`;
}

/**
 * Generate a single-use 6-digit numeric PIN for the authenticated user.
 */
export async function generateDesktopPin(params: {
  userId: string;
  clientIp?: string;
  deviceName?: string;
}): Promise<GeneratedPinResult> {
  const { userId, clientIp, deviceName } = params;

  // 1. Invalidate any existing unconsumed PINs for this user
  await db
    .update(desktopAuthPins)
    .set({
      consumedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(desktopAuthPins.userId, userId),
        isNull(desktopAuthPins.consumedAt)
      )
    );

  // 2. Generate secure 6-digit numeric PIN (100000 - 999999)
  const pinNum = crypto.randomInt(100000, 1000000);
  const pin = String(pinNum);

  // 3. Salt and hash
  const salt = crypto.randomBytes(16).toString("hex");
  const pinHash = hashPin(pin, salt);
  const expiresAt = new Date(Date.now() + PIN_EXPIRATION_SECONDS * 1000);

  // 4. Save record
  await db.insert(desktopAuthPins).values({
    userId,
    pinHash,
    pinSalt: salt,
    expiresAt,
    consumedAt: null,
    attemptsCount: 0,
    clientIp: clientIp || null,
    deviceName: deviceName || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    pin,
    expiresInSeconds: PIN_EXPIRATION_SECONDS,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Verify a 6-digit PIN from desktop workstation and mint an independent Better-Auth session.
 */
export async function verifyDesktopPin(params: {
  userId?: string;
  identifier?: string;
  pin: string;
  clientIp?: string;
  userAgent?: string;
  isHttps?: boolean;
}): Promise<VerifyPinResult> {
  const { userId: providedUserId, identifier, pin, clientIp, userAgent, isHttps } = params;

  const cleanPin = (pin || "").trim().replace(/\s+/g, "");
  if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
    return { success: false, error: "Please enter a valid 6-digit numeric PIN." };
  }

  // 1. Resolve user
  let targetUserId = providedUserId;

  if (!targetUserId && identifier) {
    const trimmed = identifier.trim();
    // Search user table by email, id, or username
    const [matchedUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(or(eq(user.email, trimmed.toLowerCase()), eq(user.id, trimmed)))
      .limit(1);

    if (matchedUser) {
      targetUserId = matchedUser.id;
    } else {
      // Search staff table by employeeCode or phone or email
      const [matchedStaff] = await db
        .select({ userId: staff.userId })
        .from(staff)
        .where(
          and(
            eq(staff.active, true),
            or(
              sql`LOWER(${staff.employeeCode}) = LOWER(${trimmed})`,
              eq(staff.phone, trimmed),
              sql`LOWER(${staff.email}) = LOWER(${trimmed})`
            )
          )
        )
        .limit(1);

      if (matchedStaff && matchedStaff.userId) {
        targetUserId = matchedStaff.userId;
      }
    }
  }

  if (!targetUserId) {
    return { success: false, error: "Staff account not found. Please select or verify your profile." };
  }

  // 2. Fetch active PIN record
  const [pinRecord] = await db
    .select()
    .from(desktopAuthPins)
    .where(
      and(
        eq(desktopAuthPins.userId, targetUserId),
        isNull(desktopAuthPins.consumedAt),
        gt(desktopAuthPins.expiresAt, new Date())
      )
    )
    .orderBy(desc(desktopAuthPins.createdAt))
    .limit(1);

  if (!pinRecord) {
    return {
      success: false,
      error: "PIN expired or not found. Please tap 'Desktop PIN' on your mobile to generate a fresh code.",
    };
  }

  // Check rate limit on this PIN
  if (pinRecord.attemptsCount >= 3) {
    await db
      .update(desktopAuthPins)
      .set({ consumedAt: new Date(), updatedAt: new Date() })
      .where(eq(desktopAuthPins.id, pinRecord.id));

    return {
      success: false,
      error: "Maximum failed attempts exceeded. Please generate a new PIN on your mobile device.",
    };
  }

  // 3. Verify PIN hash
  const computedHash = hashPin(cleanPin, pinRecord.pinSalt);
  const isValid = crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(pinRecord.pinHash, "hex")
  );

  if (!isValid) {
    const newAttempts = pinRecord.attemptsCount + 1;
    const isNowLocked = newAttempts >= 3;

    await db
      .update(desktopAuthPins)
      .set({
        attemptsCount: newAttempts,
        consumedAt: isNowLocked ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(desktopAuthPins.id, pinRecord.id));

    const remaining = 3 - newAttempts;
    return {
      success: false,
      error: isNowLocked
        ? "PIN invalid. Maximum 3 attempts exceeded. Please generate a fresh PIN."
        : `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    };
  }

  // 4. Burn the PIN immediately (single-use)
  await db
    .update(desktopAuthPins)
    .set({
      consumedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(desktopAuthPins.id, pinRecord.id));

  // 5. Mint independent Better-Auth desktop session
  const [userData] = await db.select().from(user).where(eq(user.id, targetUserId)).limit(1);
  if (!userData) {
    return { success: false, error: "User account could not be found." };
  }

  if (userData.banned) {
    return { success: false, error: `Account is restricted: ${userData.banReason || "Contact administrator."}` };
  }

  const authCtx = await (auth as any).$context;
  const newSession = await authCtx.internalAdapter.createSession(targetUserId);

  // Link session to pin record for tracking & remote revocation
  if (newSession && newSession.id) {
    await db
      .update(desktopAuthPins)
      .set({
        desktopSessionId: newSession.id,
        updatedAt: new Date(),
      })
      .where(eq(desktopAuthPins.id, pinRecord.id));
  }

  // 6. Sign and format cookie
  const cookieName = authCtx.authCookies.sessionToken.name;
  const signedToken = signSessionToken(newSession.token, authCtx.secret);
  const cookieValue = signedToken;

  return {
    success: true,
    user: {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
    },
    session: {
      id: newSession.id,
      expiresAt: newSession.expiresAt,
      token: newSession.token,
    },
    cookie: {
      name: cookieName,
      value: cookieValue,
      options: {
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        secure: isHttps ?? false,
        maxAge: authCtx.sessionConfig.expiresIn || 604800,
      },
    },
  };
}

/**
 * List active desktop sessions created via PIN for the authenticated user.
 */
export async function getActiveDesktopSessions(userId: string) {
  const records = await db
    .select({
      pinId: desktopAuthPins.id,
      desktopSessionId: desktopAuthPins.desktopSessionId,
      createdAt: desktopAuthPins.createdAt,
      clientIp: desktopAuthPins.clientIp,
      deviceName: desktopAuthPins.deviceName,
      expiresAt: session.expiresAt,
    })
    .from(desktopAuthPins)
    .innerJoin(session, eq(desktopAuthPins.desktopSessionId, session.id))
    .where(
      and(
        eq(desktopAuthPins.userId, userId),
        gt(session.expiresAt, new Date())
      )
    )
    .orderBy(desc(desktopAuthPins.createdAt))
    .limit(10);

  return records;
}

/**
 * Revoke an active desktop session remotely from mobile device.
 */
export async function revokeDesktopSession(userId: string, sessionId: string) {
  const [sess] = await db
    .select()
    .from(session)
    .where(and(eq(session.id, sessionId), eq(session.userId, userId)))
    .limit(1);

  if (!sess) {
    return { success: false, error: "Session not found or already ended." };
  }

  const authCtx = await (auth as any).$context;
  await authCtx.internalAdapter.deleteSession(sess.token);

  await db
    .update(desktopAuthPins)
    .set({ desktopSessionId: null, updatedAt: new Date() })
    .where(eq(desktopAuthPins.desktopSessionId, sessionId));

  return { success: true };
}

/**
 * Public directory search for workstation user quick-picker.
 * Excludes sensitive fields (salary, pan, aadhar, password).
 */
export async function searchStationStaff(query?: string): Promise<StationStaffCard[]> {
  const cleanQ = (query || "").trim().toLowerCase();

  const queryBuilder = db
    .select({
      userId: user.id,
      name: staff.name,
      employeeCode: staff.employeeCode,
      role: staff.role,
      image: user.image,
      deptName: departments.name,
    })
    .from(staff)
    .innerJoin(user, eq(staff.userId, user.id))
    .leftJoin(staffDepartments, eq(staff.staffId, staffDepartments.staffId))
    .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
    .where(
      and(
        eq(staff.active, true),
        eq(staff.status, "Active"),
        cleanQ
          ? or(
              sql`LOWER(${staff.name}) LIKE ${"%" + cleanQ + "%"}`,
              sql`LOWER(${staff.employeeCode}) LIKE ${"%" + cleanQ + "%"}`,
              sql`LOWER(${staff.role}) LIKE ${"%" + cleanQ + "%"}`
            )
          : undefined
      )
    )
    .orderBy(staff.name)
    .limit(cleanQ ? 25 : 30);

  const rows = await queryBuilder;

  // Deduplicate by userId if staff member is mapped to multiple departments
  const seen = new Set<string>();
  const cards: StationStaffCard[] = [];

  for (const row of rows) {
    if (!seen.has(row.userId)) {
      seen.add(row.userId);
      cards.push({
        userId: row.userId,
        name: row.name,
        employeeCode: row.employeeCode,
        role: row.role,
        department: row.deptName || "General",
        image: row.image,
      });
    }
  }

  return cards;
}
