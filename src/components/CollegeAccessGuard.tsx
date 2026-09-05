import * as React from "react";

/**
 * @deprecated College access is now enforced at the route level via beforeLoad in /_authenticated/college.tsx.
 * This component remains as a transparent passthrough for backward compatibility.
 */
export function CollegeAccessGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

