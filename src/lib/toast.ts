import { Store } from "@tanstack/react-store";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

export const toastStore = new Store<{ toasts: Toast[] }>({ toasts: [] });

export const toast = {
  show: (message: string, type: Toast["type"] = "info", duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    toastStore.setState((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, duration);
    }
  },
  success: (message: string, duration?: number) => toast.show(message, "success", duration),
  error: (message: string, duration?: number) => toast.show(message, "error", duration),
  warning: (message: string, duration?: number) => toast.show(message, "warning", duration),
  info: (message: string, duration?: number) => toast.show(message, "info", duration),
  dismiss: (id: string) => {
    toastStore.setState((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
};
