import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CollegeAccessGuard } from "@/components/CollegeAccessGuard";

export const Route = createFileRoute("/_authenticated/college/reports/")({
  component: () => (
    <CollegeAccessGuard>
      <CollegeReportsIndex />
    </CollegeAccessGuard>
  ),
});

function CollegeReportsIndex() {
  const navigate = useNavigate();

  React.useEffect(() => {
    navigate({ to: "/college/reports/daily-income-expenses" });
  }, [navigate]);

  return (
    <div className="p-8 text-center text-muted-foreground text-sm">
      Loading Nursing College Reports...
    </div>
  );
}

export default CollegeReportsIndex;
