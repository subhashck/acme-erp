import * as React from "react";
import { Sunrise, Sun, Sunset, Moon, Clock } from "lucide-react";
import type { RosterRow } from "../types";

// ── Shift configuration ──────────────────────────────────────────────────────

export const SHIFT_CONFIG: Record<string, { 
  colorClass: string; 
  bgClass: string; 
  borderClass: string; 
  textColorClass: string; 
  gradientClass: string; 
  Icon: React.ComponentType<{ size?: number }> 
}> = {
  Morning:   { colorClass: "text-sky-500 dark:text-sky-400", bgClass: "bg-sky-50 dark:bg-sky-950/20", borderClass: "border-sky-200 dark:border-sky-900/30", textColorClass: "text-sky-700 dark:text-sky-400", gradientClass: "from-sky-50 to-white dark:from-sky-950/20 dark:to-card", Icon: Sunrise },
  Afternoon: { colorClass: "text-blue-600 dark:text-blue-400", bgClass: "bg-blue-50 dark:bg-blue-950/20", borderClass: "border-blue-200 dark:border-blue-900/30", textColorClass: "text-blue-800 dark:text-blue-400", gradientClass: "from-blue-50 to-white dark:from-blue-950/20 dark:to-card", Icon: Sun },
  Evening:   { colorClass: "text-orange-600 dark:text-orange-400", bgClass: "bg-orange-50 dark:bg-orange-950/20", borderClass: "border-orange-200 dark:border-orange-900/30", textColorClass: "text-orange-800 dark:text-orange-400", gradientClass: "from-orange-50 to-white dark:from-orange-950/20 dark:to-card", Icon: Sunset },
  Night:     { colorClass: "text-purple-600 dark:text-purple-400", bgClass: "bg-purple-50 dark:bg-purple-950/20", borderClass: "border-purple-200 dark:border-purple-900/30", textColorClass: "text-purple-800 dark:text-purple-400", gradientClass: "from-purple-50 to-white dark:from-purple-950/20 dark:to-card", Icon: Moon },
};

export const getShiftConfig = (shift: string) =>
  SHIFT_CONFIG[shift] ?? { 
    colorClass: "text-slate-550 dark:text-slate-400", 
    bgClass: "bg-slate-50 dark:bg-slate-900/30", 
    borderClass: "border-slate-200 dark:border-slate-800/50", 
    textColorClass: "text-slate-700 dark:text-slate-400", 
    gradientClass: "from-slate-50 to-white dark:from-slate-900/20 dark:to-card", 
    Icon: Clock 
  };

// ── Date helpers ─────────────────────────────────────────────────────────────

export const today = () => new Date().toISOString().split("T")[0];
export const currentYearMonth = () => new Date().toISOString().slice(0, 7);

export const isoDate = (offsetDays = 0) => {
  const d = new Date(); 
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
};

export const shortDay = (dateStr: string) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });

export const rollingWeek = (startOffset = 0): string[] =>
  Array.from({ length: 7 }, (_, i) => isoDate(startOffset + i));

export const isActiveToday = (r: RosterRow, date = today()) =>
  r.startDate <= date && r.endDate >= date;
