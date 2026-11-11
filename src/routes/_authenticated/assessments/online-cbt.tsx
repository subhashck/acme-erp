import { createFileRoute } from "@tanstack/react-router";
import { OnlineCbtPage } from "../../../components/assessments/OnlineCbtPage";
import { validateOnlineCbtSearch } from "../../../lib/online-cbt";

export const Route = createFileRoute("/_authenticated/assessments/online-cbt")({
  validateSearch: validateOnlineCbtSearch,
  component: OnlineCbtRoute,
});

function OnlineCbtRoute() {
  const { assessmentId } = Route.useSearch();
  return <OnlineCbtPage assessmentId={assessmentId} />;
}
