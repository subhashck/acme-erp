import { createFileRoute } from "@tanstack/react-router";
import { CbtResultsPage } from "../../../components/assessments/CbtResultsPage";

export const Route = createFileRoute("/_authenticated/assessments/cbt-results")({
  component: CbtResultsPage,
});
