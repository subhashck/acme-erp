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
    const [inserted] = db.insert(notifications).values(values).returning().all();

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
