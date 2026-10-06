import { Loader2 } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

export function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return <Loader2 role="status" aria-label="Loading" className={cn("animate-spin", className)} {...props} />;
}
