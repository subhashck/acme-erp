import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import { notifications } from "../db/schema.ts";
import { notificationEmitter } from "../utils/notifier.ts";

export const notificationRoutes = new Hono<AuthEnv>()
  .get("/notifications/stream", async (c) => {
    const session = c.get("session");
    const userId = session.user.id;

    return streamSSE(c, async (stream) => {
      const eventName = `user:${userId}`;

      const listener = async (n: any) => {
        try {
          await stream.writeSSE({ event: "notification", data: JSON.stringify(n) });
        } catch (e) {
          notificationEmitter.off(eventName, listener);
        }
      };

      notificationEmitter.on(eventName, listener);

      // Send initial unread notifications
      try {
        const unreads = await db
          .select()
          .from(notifications)
          .where(
            sql`${notifications.userId} = ${userId} AND ${notifications.read} = false`
          )
          .orderBy(desc(notifications.createdAt))
          .execute();

        for (const n of unreads) {
          await stream.writeSSE({ event: "notification", data: JSON.stringify(n) });
        }
      } catch (err) {
        console.error("Error streaming initial notifications:", err);
      }

      const ping = setInterval(async () => {
        try {
          await stream.writeSSE({ event: "ping", data: "heartbeat" });
        } catch {
          clearInterval(ping);
          notificationEmitter.off(eventName, listener);
        }
      }, 15000);

      stream.onAbort(() => {
        clearInterval(ping);
        notificationEmitter.off(eventName, listener);
      });

      // Keep stream open by waiting for abort
      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          resolve();
        });
      });
    });
  })
  .get("/notifications", async (c) => {
    const session = c.get("session");
    const userId = session.user.id;
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .execute();
    return c.json(rows);
  })
  .post("/notifications/:id/clear", async (c) => {
    const session = c.get("session");
    const userId = session.user.id;
    const id = Number(c.req.param("id"));

    await db
      .update(notifications)
      .set({ read: true })
      .where(
        sql`${notifications.id} = ${id} AND ${notifications.userId} = ${userId}`
      )
      .execute();

    return c.json({ ok: true });
  })
  .post("/notifications/clear-all", async (c) => {
    const session = c.get("session");
    const userId = session.user.id;

    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId))
      .execute();

    return c.json({ ok: true });
  });
