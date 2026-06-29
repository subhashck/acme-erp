import * as React from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export const Field = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }>(
  ({ label, className, error, ...props }, ref) => {
    return (
      <div className={className}>
        {label && <Label>{label}</Label>}
        <Input ref={ref} {...props} />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }
);
Field.displayName = "Field";
