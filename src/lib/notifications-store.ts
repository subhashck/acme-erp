import { Store } from "@tanstack/react-store";
import { toast } from "./toast";

export interface DBNotification {
  id: number;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  link?: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotificationsState {
  notifications: DBNotification[];
  isConnected: boolean;
}

export const notificationsStore = new Store<NotificationsState>({
  notifications: [],
  isConnected: false,
});

let eventSource: EventSource | null = null;

export const notificationsActions = {
  // Fetch recent notifications via standard HTTP call
  fetchNotifications: async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        notificationsStore.setState((state) => ({
          ...state,
          notifications: data,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  },

  // Setup SSE stream
  connectSSE: () => {
    if (eventSource) return;

    eventSource = new EventSource("/api/notifications/stream");
    
    notificationsStore.setState((state) => ({
      ...state,
      isConnected: true,
    }));

    eventSource.addEventListener("notification", (event) => {
      try {
        const newNotif: DBNotification = JSON.parse(event.data);
        
        notificationsStore.setState((state) => {
          // Prevent duplicates
          const exists = state.notifications.some((n) => n.id === newNotif.id);
          if (exists) return state;

          return {
            ...state,
            notifications: [newNotif, ...state.notifications],
          };
        });

        // Trigger visual toast overlay for real-time notification
        toast.show(newNotif.message, newNotif.type, 5000);
      } catch (err) {
        console.error("Failed to parse SSE notification:", err);
      }
    });

    eventSource.addEventListener("error", (err) => {
      console.error("SSE stream error, reconnecting...", err);
      notificationsStore.setState((state) => ({
        ...state,
        isConnected: false,
      }));
    });
  },

  // Disconnect SSE stream
  disconnectSSE: () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    notificationsStore.setState((state) => ({
      ...state,
      isConnected: false,
    }));
  },

  // Clear single notification
  clearNotification: async (id: number) => {
    try {
      // Optimistically update
      notificationsStore.setState((state) => ({
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      }));

      const res = await fetch(`/api/notifications/${id}/clear`, { method: "POST" });
      if (!res.ok) {
        // Rollback on error by re-fetching
        notificationsActions.fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to clear notification:", err);
      notificationsActions.fetchNotifications();
    }
  },

  // Clear all notifications
  clearAll: async () => {
    try {
      // Optimistically update
      notificationsStore.setState((state) => ({
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      }));

      const res = await fetch("/api/notifications/clear-all", { method: "POST" });
      if (!res.ok) {
        // Rollback on error
        notificationsActions.fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to clear all notifications:", err);
      notificationsActions.fetchNotifications();
    }
  },

  // Delete single notification
  deleteNotification: async (id: number) => {
    try {
      // Optimistically update
      notificationsStore.setState((state) => ({
        ...state,
        notifications: state.notifications.filter((n) => n.id !== id),
      }));

      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (!res.ok) {
        // Rollback on error
        notificationsActions.fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
      notificationsActions.fetchNotifications();
    }
  },

  // Delete all notifications
  deleteAll: async () => {
    try {
      // Optimistically update
      notificationsStore.setState((state) => ({
        ...state,
        notifications: [],
      }));

      const res = await fetch("/api/notifications", { method: "DELETE" });
      if (!res.ok) {
        // Rollback on error
        notificationsActions.fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to delete all notifications:", err);
      notificationsActions.fetchNotifications();
    }
  },
};

