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
