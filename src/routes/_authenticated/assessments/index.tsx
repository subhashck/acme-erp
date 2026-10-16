import { createFileRoute } from "@tanstack/react-router";
import { AssessmentsHomePage } from "../../../components/assessments/AssessmentsHome";

export const Route = createFileRoute("/_authenticated/assessments/")({ component: AssessmentsHomePage });
