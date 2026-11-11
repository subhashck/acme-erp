import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { z } from "zod";
import { auth } from "../auth.ts";
import {
  generateDesktopPin,
  verifyDesktopPin,
  getActiveDesktopSessions,
  revokeDesktopSession,
  searchStationStaff,
} from "../services/mobile-pin-auth.ts";

export const mobilePinAuthRoutes = new Hono();

// ---------------------------------------------------------------------------
// 1. Authenticated Mobile Routes (Requires active staff/user session)
// ---------------------------------------------------------------------------

/**
 * Helper to get authenticated user from session headers
 */
async function getSessionUser(c: any) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return null;
  }
  return session.user;
}

/**
 * POST /api/mobile-pin-auth/generate
 * Mobile user generates a 6-digit desktop PIN (90s lifetime).
 */
mobilePinAuthRoutes.post("/generate", async (c) => {
  const user = await getSessionUser(c);
  if (!user) {
    return c.json({ error: "Unauthorized. Please log in on your mobile device." }, 401);
  }

  const clientIp = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("cf-connecting-ip");
  const userAgent = c.req.header("user-agent");

  try {
    const result = await generateDesktopPin({
      userId: user.id,
      clientIp,
      deviceName: userAgent ? userAgent.slice(0, 100) : "Mobile Device",
    });

    return c.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Failed to generate desktop PIN:", err);
    return c.json({ error: "Failed to generate PIN. Please try again." }, 500);
  }
});

/**
 * GET /api/mobile-pin-auth/active-sessions
 * Mobile user views active desktop sessions created via PIN.
 */
mobilePinAuthRoutes.get("/active-sessions", async (c) => {
  const user = await getSessionUser(c);
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const sessions = await getActiveDesktopSessions(user.id);
    return c.json({ success: true, sessions });
  } catch (err) {
    console.error("Failed to fetch active desktop sessions:", err);
    return c.json({ error: "Failed to fetch active desktop sessions" }, 500);
  }
});

/**
 * POST /api/mobile-pin-auth/revoke-session
 * Mobile user remotely revokes a desktop session.
 */
mobilePinAuthRoutes.post("/revoke-session", async (c) => {
  const user = await getSessionUser(c);
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json().catch(() => ({}));
  const sessionId = body?.sessionId;
  if (!sessionId || typeof sessionId !== "string") {
    return c.json({ error: "Session ID is required" }, 400);
  }

  try {
    const result = await revokeDesktopSession(user.id, sessionId);
    if (!result.success) {
      return c.json({ error: result.error || "Failed to revoke session" }, 400);
    }
    return c.json({ success: true, message: "Desktop session ended successfully." });
  } catch (err) {
    console.error("Failed to revoke desktop session:", err);
    return c.json({ error: "Failed to revoke desktop session" }, 500);
  }
});

// ---------------------------------------------------------------------------
// 2. Public Desktop Workstation Routes (No previous auth required)
// ---------------------------------------------------------------------------

export const publicStationRoutes = new Hono();

/**
 * GET /api/public/station-staff
 * Searches active hospital staff directory for workstation picker.
 */
publicStationRoutes.get("/station-staff", async (c) => {
  const query = c.req.query("q") || "";
  try {
    const staffList = await searchStationStaff(query);
    return c.json({ data: staffList });
  } catch (err) {
    console.error("Failed to search station staff:", err);
    return c.json({ error: "Failed to search staff directory" }, 500);
  }
});

/**
 * POST /api/public/station-login/verify-pin
 * Desktop workstation enters 6-digit mobile PIN to authenticate.
 */
publicStationRoutes.post("/station-login/verify-pin", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { userId, identifier, pin } = body;

  if (!pin || typeof pin !== "string") {
    return c.json({ error: "6-digit PIN is required." }, 400);
  }

  if (!userId && !identifier) {
    return c.json({ error: "Please select a staff profile or enter Employee ID / Email." }, 400);
  }

  const clientIp = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("cf-connecting-ip");
  const userAgent = c.req.header("user-agent");
  const proto = c.req.header("x-forwarded-proto") || "";
  const isHttps = proto.toLowerCase() === "https" || c.req.url.startsWith("https://");

  try {
    const result = await verifyDesktopPin({
      userId,
      identifier,
      pin,
      clientIp,
      userAgent,
      isHttps,
    });

    if (!result.success || !result.cookie) {
      return c.json({ error: result.error || "Authentication failed." }, 401);
    }

    // Set Better-Auth session cookie on desktop browser
    setCookie(
      c,
      result.cookie.name,
      result.cookie.value,
      result.cookie.options as any
    );

    return c.json({
      success: true,
      user: result.user,
      session: {
        id: result.session?.id,
        expiresAt: result.session?.expiresAt,
      },
      message: "Successfully signed in to workstation.",
    });
  } catch (err) {
    console.error("Error during desktop PIN verification:", err);
    return c.json({ error: "Verification failed. Please try again." }, 500);
  }
});
