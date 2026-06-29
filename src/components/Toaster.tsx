import { useStore } from "@tanstack/react-store";
import { toastStore, toast } from "../lib/toast";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "../utils/cn";

export function Toaster() {
  const { toasts } = useStore(toastStore);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const Icon = {
          success: CheckCircle,
          error: AlertCircle,
          warning: AlertTriangle,
          info: Info,
        }[t.type];

        return (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4 shadow-lg pointer-events-auto transition-all duration-300 animate-page-transition",
              t.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/70 dark:border-emerald-800/30 dark:text-emerald-300",
              t.type === "error" && "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/70 dark:border-rose-800/30 dark:text-rose-300",
              t.type === "warning" && "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/70 dark:border-amber-800/30 dark:text-amber-300",
              t.type === "info" && "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/70 dark:border-blue-800/30 dark:text-blue-300"
            )}
          >
            <Icon className="size-5 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-medium">{t.message}</div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="size-4 opacity-75 hover:opacity-100" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
