import * as React from "react";
import { cn } from "../utils/cn";

export function Badge({ className, variant = "default", ...props }: React.ComponentProps<"span"> & { variant?: "default" | "destructive" | "outline" | "secondary" }) {
  const variantClass =
    variant === "destructive"
      ? "bg-destructive text-destructive-foreground"
      : variant === "outline"
      ? "border border-border bg-transparent text-foreground"
      : variant === "secondary"
      ? "bg-secondary text-secondary-foreground"
      : "bg-secondary text-secondary-foreground";
  return <span className={cn("inline-flex items-center rounded px-2 py-1 text-xs font-medium", variantClass, className)} {...props} />;
}
