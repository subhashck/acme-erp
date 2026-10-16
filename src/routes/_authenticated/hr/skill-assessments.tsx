import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/hr/skill-assessments")({
  beforeLoad: () => { throw redirect({ to: "/assessments", replace: true }); },
});
