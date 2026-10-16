import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/hr/question-bank")({
  beforeLoad: () => { throw redirect({ to: "/assessments/question-bank", replace: true }); },
});
