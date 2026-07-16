import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import { user, staff } from "../db/schema.ts";
import { eq, and } from "drizzle-orm";

export const adminUserRoutes = new Hono<AuthEnv>()

  /**
   * PATCH /admin/users/:id/email
   * Changes the email address for a user. Admin only.
   * Also syncs the linked staff record's email if one exists.
   */
  .patch("/admin/users/:id/email", async (c) => {
    const session = c.get("session");
    const role = session?.user.role;
    if (!session || (role !== "admin" && role !== "hr")) {
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
  });
