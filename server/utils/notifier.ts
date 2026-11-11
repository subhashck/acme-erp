import { sql } from "drizzle-orm";
import { pushConfig } from "../services/push.ts";
import { EventEmitter } from "node:events";
import { db } from "../db/client.ts";
import { notifications } from "../db/schema.ts";

class NotificationEmitter extends EventEmitter {}
export const notificationEmitter = new NotificationEmitter();

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  link?: string;
}

/**
 * Creates a notification in the database and dispatches it in real-time
 * to any connected clients via SSE.
 */
export async function sendNotification(params: CreateNotificationParams) {
  try {
    const values = {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type ?? "info",
      link: params.link,
      read: false,
    };

    // Insert to DB using Drizzle
    const inserted = await db.transaction(async tx => {
      const [notification] = await tx.insert(notifications).values(values).returning();
      if (notification && pushConfig()) {
        await tx.execute(sql`INSERT INTO push_deliveries (notification_id, subscription_id)
          SELECT ${notification.id}, p.id FROM push_subscriptions p
          JOIN session s ON s.id = p.session_id AND s."expiresAt" > NOW()
          WHERE p.user_id = ${params.userId}
          ON CONFLICT DO NOTHING`);
      }
      return notification;
    });

    if (inserted) {
      // Emit to active SSE listeners
      notificationEmitter.emit(`user:${params.userId}`, inserted);
    }
    
    return inserted;
  } catch (error) {
    console.error("Failed to create/dispatch notification:", error);
    return null;
  }
}
