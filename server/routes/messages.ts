import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import { messages, staff, staffDepartments, user } from "../db/schema.ts";
import { chatEmitter, dispatchMessage } from "../utils/chat-notifier.ts";

export const messagesRoutes = new Hono<AuthEnv>()
  .get("/colleagues", async (c) => {
    const session = c.get("session");
    const currentUserId = session.user.id;
    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(user)
      .where(sql`${user.id} != ${currentUserId}`)
      .execute();
    return c.json(rows);
  })
  .get("/messages/stream", async (c) => {
    const session = c.get("session");
    const userId = session.user.id;
    const email = session.user.email;

    let deptId: number | null = null;
    try {
      const staffMember = await db
        .select()
        .from(staff)
        .where(eq(staff.email, email))
        .limit(1)
        .then((res: any) => res[0]);
      if (staffMember) {
        const deptMap = await db
          .select()
          .from(staffDepartments)
          .where(eq(staffDepartments.staffId, staffMember.id))
          .limit(1)
          .then((res: any) => res[0]);
        if (deptMap) {
          deptId = deptMap.departmentId;
        }
      }
    } catch (err) {
      console.error("Error retrieving user department:", err);
    }

    return streamSSE(c, async (stream) => {
      const orgListener = async (msg: any) => {
        try {
          await stream.writeSSE({ event: "message", data: JSON.stringify(msg) });
        } catch {
          cleanup();
        }
      };
      const deptListener = async (msg: any) => {
        try {
          await stream.writeSSE({ event: "message", data: JSON.stringify(msg) });
        } catch {
          cleanup();
        }
      };
      const directListener = async (msg: any) => {
        try {
          await stream.writeSSE({ event: "message", data: JSON.stringify(msg) });
        } catch {
          cleanup();
        }
      };

      const cleanup = () => {
        chatEmitter.off("organization", orgListener);
        if (deptId) {
          chatEmitter.off(`department:${deptId}`, deptListener);
        }
        chatEmitter.off(`user:${userId}`, directListener);
      };

      chatEmitter.on("organization", orgListener);
      if (deptId) {
        chatEmitter.on(`department:${deptId}`, deptListener);
      }
      chatEmitter.on(`user:${userId}`, directListener);

      const ping = setInterval(async () => {
        try {
          await stream.writeSSE({ event: "ping", data: "heartbeat" });
        } catch {
          clearInterval(ping);
          cleanup();
        }
      }, 15000);

      stream.onAbort(() => {
        clearInterval(ping);
        cleanup();
      });

      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          resolve();
        });
      });
    });
  })
  .get("/messages", async (c) => {
    const session = c.get("session");
    const userId = session.user.id;
    const channelType = c.req.query("channelType") || "organization";
    const departmentIdStr = c.req.query("departmentId");
    const colleagueId = c.req.query("colleagueId");

    let rows: any[] = [];
    if (channelType === "organization") {
      rows = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          senderName: user.name,
          senderImage: user.image,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .innerJoin(user, eq(messages.senderId, user.id))
        .where(eq(messages.channelType, "organization"))
        .orderBy(messages.createdAt)
        .execute();
    } else if (channelType === "department" && departmentIdStr) {
      const deptId = Number(departmentIdStr);
      rows = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          senderName: user.name,
          senderImage: user.image,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .innerJoin(user, eq(messages.senderId, user.id))
        .where(
          sql`${messages.channelType} = 'department' AND ${messages.departmentId} = ${deptId}`
        )
        .orderBy(messages.createdAt)
        .execute();
    } else if (channelType === "direct" && colleagueId) {
      rows = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          senderName: user.name,
          senderImage: user.image,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .innerJoin(user, eq(messages.senderId, user.id))
        .where(
          sql`${messages.channelType} = 'direct' AND ((${messages.senderId} = ${userId} AND ${messages.receiverId} = ${colleagueId}) OR (${messages.senderId} = ${colleagueId} AND ${messages.receiverId} = ${userId}))`
        )
        .orderBy(messages.createdAt)
        .execute();
    }

    return c.json(rows);
  })
  // ── GET /messages/conversations ──────────────────────────────────────────
  // Returns all users the current user has had a direct message exchange with,
  // plus the latest message preview and number of unread messages.
  .get("/messages/conversations", async (c) => {
    const session = c.get("session");
    const userId = session.user.id;

    // Find every distinct user that has sent to or received from the current user
    const rows = await db.execute(sql`
      SELECT
        u.id,
        u.name,
        u.email,
        u.image,
        lm.content   AS "lastMessage",
        lm.created_at AS "lastMessageAt",
        COALESCE(ur.unread, 0) AS unread
      FROM (
        SELECT DISTINCT
          CASE WHEN sender_id = ${userId} THEN receiver_id ELSE sender_id END AS partner_id
        FROM messages
        WHERE channel_type = 'direct'
          AND (sender_id = ${userId} OR receiver_id = ${userId})
      ) AS partners
      INNER JOIN "user" u ON u.id = partners.partner_id
      -- latest message in this conversation
      INNER JOIN LATERAL (
        SELECT content, created_at
        FROM messages
        WHERE channel_type = 'direct'
          AND (
            (sender_id = ${userId} AND receiver_id = partners.partner_id)
            OR (sender_id = partners.partner_id AND receiver_id = ${userId})
          )
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON true
      -- unread: messages sent TO current user that are unread
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS unread
        FROM messages
        WHERE channel_type = 'direct'
          AND sender_id = partners.partner_id
          AND receiver_id = ${userId}
          AND read_at IS NULL
      ) ur ON true
      ORDER BY lm.created_at DESC
    `);

    return c.json(rows.rows ?? rows);
  })
  // ── POST /messages/read/:userId ──────────────────────────────────────────
  // Marks all unread direct messages from a specific user as read.
  .post("/messages/read/:userId", async (c) => {
    const session = c.get("session");
    const currentUserId = session.user.id;
    const { userId: senderId } = c.req.param();

    await db.execute(sql`
      UPDATE messages
      SET read_at = NOW()
      WHERE channel_type = 'direct'
        AND sender_id = ${senderId}
        AND receiver_id = ${currentUserId}
        AND read_at IS NULL
    `);

    return c.json({ ok: true });
  })
  .post("/messages", async (c) => {
    const session = c.get("session");
    const userId = session.user.id;
    const body = await c.req.json();

    const [inserted] = await db
      .insert(messages)
      .values({
        senderId: userId,
        receiverId: body.receiverId || null,
        channelType: body.channelType || "organization",
        departmentId: body.departmentId ? Number(body.departmentId) : null,
        content: body.content,
      })
      .returning();

    const sender = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
      .then((res: any) => res[0]);

    const newMsg = {
      id: inserted.id,
      senderId: userId,
      senderName: sender?.name || "Colleague",
      senderImage: sender?.image || null,
      receiverId: body.receiverId || null,
      channelType: body.channelType || "organization",
      departmentId: body.departmentId ? Number(body.departmentId) : null,
      content: body.content,
      createdAt: inserted.createdAt,
    };

    dispatchMessage(newMsg);

    return c.json(newMsg);
  });
