import * as React from "react";
import { cn } from "../utils/cn";
import { Label } from "./label";

type Option = string | [string, string];

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select"> & { label: string; options: Option[]; error?: string }>(
  ({ label, options, className, error, ...props }, ref) => (
    <div className={className}>
      <Label>{label}</Label>
      <select ref={ref} className={cn("flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring")} {...props}>
        <option value="">Select</option>
        {options.map((option) => {
          const [value, text] = Array.isArray(option) ? option : [option, option];
          return <option key={value} value={value}>{text}</option>;
        })}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
);
Select.displayName = "Select";
