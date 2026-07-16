import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import { user, staff, session, account } from "../db/schema.ts";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

const adminOrHr = (role: string | undefined | null) =>
  role === "admin" || role === "hr";

export const adminUserRoutes = new Hono<AuthEnv>()

  /**
   * GET /admin/users
   * Lists all user accounts. Admin or HR only.
   */
  .get("/admin/users", async (c) => {
    const session_ctx = c.get("session");
    if (!session_ctx || !adminOrHr(session_ctx.user.role)) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        banExpires: user.banExpires,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .orderBy(user.createdAt)
      .execute();

    return c.json(users);
  })

  /**
   * PATCH /admin/users/:id/email
   * Changes the email address for a user. Admin or HR only.
   * Also syncs the linked staff record's email if one exists.
   */
  .patch("/admin/users/:id/email", async (c) => {
    const session_ctx = c.get("session");
    if (!session_ctx || !adminOrHr(session_ctx.user.role)) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const userId = c.req.param("id");
    const { newEmail } = z
      .object({ newEmail: z.string().email("Invalid email address") })
      .parse(await c.req.json());

    // Check uniqueness — ensure no other user already has this email
    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, newEmail))
      .limit(1)
      .then((r) => r[0]);

    if (existing && existing.id !== userId) {
      return c.json({ error: "Email address is already in use by another account" }, 409);
    }

    // Update the user's email in the auth user table
    const [updated] = await db
      .update(user)
      .set({ email: newEmail, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning();

    if (!updated) {
      return c.json({ error: "User not found" }, 404);
    }

    // Sync the linked staff record's email if one exists
    await db
      .update(staff)
      .set({ email: newEmail })
      .where(and(eq(staff.userId, userId), eq(staff.active, true)))
      .execute();

    return c.json({ success: true, email: updated.email });
  })

  /**
   * PATCH /admin/users/:id/ban
   * Bans a user and revokes all their active sessions. Admin or HR only.
   */
  .patch("/admin/users/:id/ban", async (c) => {
    const session_ctx = c.get("session");
    if (!session_ctx || !adminOrHr(session_ctx.user.role)) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const userId = c.req.param("id");
    const body = z
      .object({
        banReason: z.string().optional(),
        banExpiresIn: z.number().optional(), // seconds, omit for permanent
      })
      .parse(await c.req.json().catch(() => ({})));

    const banExpires = body.banExpiresIn
      ? new Date(Date.now() + body.banExpiresIn * 1000)
      : null;

    const [updated] = await db
      .update(user)
      .set({
        banned: true,
        banReason: body.banReason ?? null,
        banExpires,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning();

    if (!updated) {
      return c.json({ error: "User not found" }, 404);
    }

    // Revoke all active sessions for this user
    await db
      .delete(session)
      .where(eq(session.userId, userId))
      .execute();

    return c.json({ success: true });
  })

  /**
   * PATCH /admin/users/:id/unban
   * Removes a ban from a user. Admin or HR only.
   */
  .patch("/admin/users/:id/unban", async (c) => {
    const session_ctx = c.get("session");
    if (!session_ctx || !adminOrHr(session_ctx.user.role)) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const userId = c.req.param("id");

    const [updated] = await db
      .update(user)
      .set({ banned: false, banReason: null, banExpires: null, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning();

    if (!updated) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({ success: true });
  })

  /**
   * PATCH /admin/users/:id/role
   * Changes the system role for a user. Admin or HR only.
   * HR callers cannot promote a user to admin.
   */
  .patch("/admin/users/:id/role", async (c) => {
    const session_ctx = c.get("session");
    if (!session_ctx || !adminOrHr(session_ctx.user.role)) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const userId = c.req.param("id");
    const { role: newRole } = z
      .object({ role: z.enum(["admin", "hr", "staff"]) })
      .parse(await c.req.json());

    // HR users cannot promote anyone to admin
    if (session_ctx.user.role === "hr" && newRole === "admin") {
      return c.json({ error: "HR users cannot assign the admin role" }, 403);
    }

    const [updated] = await db
      .update(user)
      .set({ role: newRole, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning();

    if (!updated) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({ success: true, role: updated.role });
  })

  /**
   * PATCH /admin/users/:id/password
   * Resets a user's password using better-auth's own hasher. Admin or HR only.
   * Also sets mustChangePassword = true so the user is forced to change on next login.
   */
  .patch("/admin/users/:id/password", async (c) => {
    const session_ctx = c.get("session");
    if (!session_ctx || !adminOrHr(session_ctx.user.role)) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const userId = c.req.param("id");
    const { newPassword } = z
      .object({ newPassword: z.string().min(6, "Password must be at least 6 characters") })
      .parse(await c.req.json());

    const hashed = await hashPassword(newPassword);

    // Update the credential account record
    const result = await db
      .update(account)
      .set({ password: hashed, updatedAt: new Date() })
      .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
      .returning({ id: account.id });

    if (result.length === 0) {
      return c.json({ error: "No credential account found for this user" }, 404);
    }

    // Force user to change password on next login
    await db
      .update(user)
      .set({ mustChangePassword: true, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .execute();

    return c.json({ success: true });
  })

  /**
   * PATCH /admin/users/:id/must-change-password
   * Sets the mustChangePassword flag for a user. Admin or HR only.
   * Used after creating a new user with the default password.
   */
  .patch("/admin/users/:id/must-change-password", async (c) => {
    const session_ctx = c.get("session");
    if (!session_ctx || !adminOrHr(session_ctx.user.role)) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const userId = c.req.param("id");

    const [updated] = await db
      .update(user)
      .set({ mustChangePassword: true, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning({ id: user.id });

    if (!updated) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({ success: true });
  })

  /**
   * PATCH /change-password
   * Self-service endpoint — any authenticated user can call this.
   * Updates their own password and clears the mustChangePassword flag.
   */
  .patch("/change-password", async (c) => {
    const session_ctx = c.get("session");
    if (!session_ctx) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = session_ctx.user.id;
    const { newPassword } = z
      .object({ newPassword: z.string().min(8, "Password must be at least 8 characters") })
      .parse(await c.req.json());

    const hashed = await hashPassword(newPassword);

    const result = await db
      .update(account)
      .set({ password: hashed, updatedAt: new Date() })
      .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
      .returning({ id: account.id });

    if (result.length === 0) {
      return c.json({ error: "No credential account found" }, 404);
    }

    // Clear the forced-change flag
    await db
      .update(user)
      .set({ mustChangePassword: false, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .execute();

    return c.json({ success: true });
  });

