import * as React from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  children?: React.ReactNode;
}

export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, className, error, children, ...props }, ref) => {
    return (
      <div className={className}>
        {label && <Label>{label}</Label>}
        {children ? children : <Input ref={ref} {...props} />}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }
);
Field.displayName = "Field";

