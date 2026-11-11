import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { messagesRoutes } from "../../server/routes/messages";
import { db } from "../../server/db/client";
import type { AuthEnv } from "../../server/auth";

describe("Messages Clear and Delete Endpoints", () => {
  let mockSession: any = {
    user: {
      id: "user-1",
      email: "user1@acme.org",
      name: "Dr. Alice",
      role: "staff",
    },
  };

  const app = new Hono<AuthEnv>();
  app.use("*", async (c, next) => {
    c.set("session", mockSession);
    await next();
  });
  app.route("/", messagesRoutes);

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSession = {
      user: {
        id: "user-1",
        email: "user1@acme.org",
        name: "Dr. Alice",
        role: "staff",
      },
    };
  });

  describe("DELETE /messages/direct/:colleagueId", () => {
    it("clears direct messages between current user and colleague", async () => {
      const deleteSpy = vi.spyOn(db, "delete").mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue({ rowCount: 5 }),
        }),
      } as any);

      const res = await app.request("/messages/direct/colleague-99", {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(deleteSpy).toHaveBeenCalled();
    });
  });

  describe("DELETE /messages/:id", () => {
    it("allows deleting an org message sent within 1 hour by the author", async () => {
      const recentTime = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago
      const mockMsg = {
        id: 101,
        senderId: "user-1",
        channelType: "organization",
        content: "Recent announcement",
        createdAt: recentTime.toISOString(),
      };

      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMsg]),
          }),
        }),
      } as any);

      const deleteSpy = vi.spyOn(db, "delete").mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue({ rowCount: 1 }),
        }),
      } as any);

      const res = await app.request("/messages/101", { method: "DELETE" });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.id).toBe(101);
      expect(deleteSpy).toHaveBeenCalled();
    });

    it("rejects deleting an org message older than 1 hour", async () => {
      const oldTime = new Date(Date.now() - 65 * 60 * 1000); // 65 mins ago (> 1 hr)
      const mockMsg = {
        id: 102,
        senderId: "user-1",
        channelType: "organization",
        content: "Old announcement",
        createdAt: oldTime.toISOString(),
      };

      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMsg]),
          }),
        }),
      } as any);

      const deleteSpy = vi.spyOn(db, "delete");

      const res = await app.request("/messages/102", { method: "DELETE" });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("within 1 hour of sending");
      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it("rejects deleting another user's org message if not admin", async () => {
      const recentTime = new Date(Date.now() - 10 * 60 * 1000);
      const mockMsg = {
        id: 103,
        senderId: "user-other",
        channelType: "organization",
        content: "Someone else message",
        createdAt: recentTime.toISOString(),
      };

      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMsg]),
          }),
        }),
      } as any);

      const res = await app.request("/messages/103", { method: "DELETE" });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("only delete your own messages");
    });

    it("allows admin to delete another user's org message within 1 hour", async () => {
      mockSession.user.role = "admin";
      const recentTime = new Date(Date.now() - 20 * 60 * 1000);
      const mockMsg = {
        id: 104,
        senderId: "user-other",
        channelType: "organization",
        content: "Staff announcement",
        createdAt: recentTime.toISOString(),
      };

      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMsg]),
          }),
        }),
      } as any);

      vi.spyOn(db, "delete").mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue({ rowCount: 1 }),
        }),
      } as any);

      const res = await app.request("/messages/104", { method: "DELETE" });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it("allows direct message participant to delete their direct message", async () => {
      const mockMsg = {
        id: 105,
        senderId: "user-1",
        receiverId: "user-2",
        channelType: "direct",
        content: "Hello private",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days old (no 1h limit on direct)
      };

      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMsg]),
          }),
        }),
      } as any);

      vi.spyOn(db, "delete").mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue({ rowCount: 1 }),
        }),
      } as any);

      const res = await app.request("/messages/105", { method: "DELETE" });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });
});
