import * as React from "react";
import { cn } from "../utils/cn";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900/80 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:border-slate-300 dark:disabled:border-slate-700/80 disabled:border-dashed disabled:shadow-none",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
