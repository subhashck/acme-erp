import * as React from "react";
import { cn } from "../utils/cn";

export function Badge({ className, variant = "default", ...props }: React.ComponentProps<"span"> & { variant?: "default" | "destructive" }) {
  return <span className={cn("inline-flex items-center rounded px-2 py-1 text-xs font-medium", variant === "destructive" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground", className)} {...props} />;
}
