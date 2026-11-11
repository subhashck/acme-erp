import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseMonthTokens, formatMonthToken } from "@/lib/college-receipt-pdf";

export { parseMonthTokens, formatMonthToken };

export interface MonthBoxProps {
  month: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  showCheck?: boolean;
}

export function MonthBox({
  month,
  size = "md",
  className,
  showCheck = true,
}: MonthBoxProps) {
  const { short, full } = formatMonthToken(month);
  return (
    <span
      title={full}
      className={cn(
        "inline-flex items-center gap-1 rounded font-semibold font-mono border transition-all shadow-2xs select-none",
        "bg-teal-600 text-white border-teal-600",
        size === "xs" && "px-1 py-0.2 text-[9.5px]",
        size === "sm" && "px-1.5 py-0.5 text-[10.5px]",
        size === "md" && "px-2 py-0.5 text-[11px]",
        className
      )}
    >
      <span>{short}</span>
      {showCheck && (
        <Check
          className={cn(
            "shrink-0 stroke-[2.5]",
            size === "xs" && "h-2 w-2",
            size === "sm" && "h-2.5 w-2.5",
            size === "md" && "h-2.5 w-2.5"
          )}
        />
      )}
    </span>
  );
}

export interface MonthBoxListProps {
  months: string | string[] | undefined | null;
  size?: "xs" | "sm" | "md";
  className?: string;
  showCheck?: boolean;
}

export function MonthBoxList({
  months,
  size = "md",
  className,
  showCheck = true,
}: MonthBoxListProps) {
  const tokens = parseMonthTokens(months);
  if (tokens.length === 0) return null;

  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {tokens.map((m, i) => (
        <MonthBox key={`${m}-${i}`} month={m} size={size} showCheck={showCheck} />
      ))}
    </div>
  );
}

