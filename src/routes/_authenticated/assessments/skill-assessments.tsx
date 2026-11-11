import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SkillAssessmentsPage } from "../../../components/assessments/SkillAssessmentsPage";
import { assessmentPermissionsQuery } from "../../../components/assessments/AssessmentsHome";
import { useUserPermissions } from "../../../lib/permissions";
import { Button } from "../../../ui/button";

export const Route = createFileRoute("/_authenticated/assessments/skill-assessments")({ component: AssessmentWorkspacePage });

function AssessmentWorkspacePage() {
  const permissions = useUserPermissions();
  const metadata = useQuery(assessmentPermissionsQuery);
  if (permissions.isAdmin || permissions.isHr) return <SkillAssessmentsPage />;
  if (metadata.isLoading) return <p role="status">Loading assessment workspace...</p>;
  if (metadata.isError) return <div role="alert"><p>{metadata.error.message}</p><Button onClick={() => metadata.refetch()}>Retry</Button></div>;
  if (metadata.data?.isAdmin || metadata.data?.isHr || metadata.data?.isDeptIncharge || metadata.data?.isNursingSuper) return <SkillAssessmentsPage />;
  return <Navigate to="/assessments" replace />;
}
