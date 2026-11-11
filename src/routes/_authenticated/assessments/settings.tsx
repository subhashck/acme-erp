import { createFileRoute } from "@tanstack/react-router";
import { AssessmentSettingsPage } from "../../../components/assessments/AssessmentSettingsPage";

export const Route = createFileRoute("/_authenticated/assessments/settings")({ component: AssessmentSettingsPage });
