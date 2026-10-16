import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useUserPermissions } from "../../lib/permissions";
import { assessmentPermissionsQuery } from "../../components/assessments/AssessmentsHome";

export const Route = createFileRoute("/_authenticated/assessments")({ component: AssessmentsModule });

function AssessmentsModule() {
  const permissions = useUserPermissions();
  const metadata = useQuery(assessmentPermissionsQuery);
  const manager = permissions.isAdmin || permissions.isHr || metadata.data?.isAdmin || metadata.data?.isHr;
  const reviewer = manager || metadata.data?.isDeptIncharge || metadata.data?.isNursingSuper;
  const linkClass = "rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted";
  return <div className="space-y-5">
    <nav aria-label="Assessments" className="flex flex-wrap gap-2 border-b pb-3">
      <Link to="/assessments" activeOptions={{ exact: true }} className={linkClass} activeProps={{ className: "bg-muted text-primary" }}>Assessments home</Link>
      <Link to="/assessments/online-cbt" className={linkClass} activeProps={{ className: "bg-muted text-primary" }}>Online CBT</Link>
      {reviewer && <Link to="/assessments/skill-assessments" className={linkClass} activeProps={{ className: "bg-muted text-primary" }}>Skill assessments</Link>}
      {manager && <Link to="/assessments/question-bank" className={linkClass} activeProps={{ className: "bg-muted text-primary" }}>Question bank</Link>}
      {manager && <Link to="/assessments/settings" className={linkClass} activeProps={{ className: "bg-muted text-primary" }}>Settings</Link>}
    </nav>
    <Outlet />
  </div>;
}
