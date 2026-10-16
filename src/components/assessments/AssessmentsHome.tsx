import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, Clock, GraduationCap, RefreshCw } from "lucide-react";
import { ModuleLayout } from "../ModuleLayout";
import { Button } from "../../ui/button";
import { useUserPermissions } from "../../lib/permissions";
import { AssessmentWorkspaceModal, SkillAssessmentsPage, STATUS_CONFIG, fmtDate } from "./SkillAssessmentsPage";
import { canPrintCbtCertificate } from "../../lib/cbt-certificate";

export async function assessmentJson(url: string) {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Could not load assessments. Please try again.");
  return body;
}

export const assessmentPermissionsQuery = {
  queryKey: ["skill-assessment-my-permissions"],
  queryFn: () => assessmentJson("/api/skill-assessment/my-permissions"),
};

type HistoryRecord = {
  id: number; assessmentNo: string; status: string; cycleTitle?: string;
  startDate?: string; endDate?: string; cycleStartDate?: string; cycleEndDate?: string;
  createdAt: string; finalScore?: string | number | null; competencyLevel?: string;
  hrCompletedAt?: string; nextAssessmentDueDate?: string;
};

/** Presentational history is also used to exercise error/empty/score states without a live session. */
export function StaffAssessmentHistory({ records, loading, error, onRetry, onOpen }: {
  records: HistoryRecord[]; loading: boolean; error?: string;
  onRetry: () => void; onOpen: (id: number) => void;
}) {
  if (loading) return <p role="status" className="p-6 text-muted-foreground">Loading your assessment history...</p>;
  if (error) return <div role="alert" className="rounded-xl border border-destructive p-5 space-y-3">
    <p>{error}</p><Button variant="outline" onClick={onRetry}>Retry</Button>
  </div>;
  if (!records.length) return <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
    <Award className="mx-auto text-muted-foreground" />
    <p className="font-semibold">No assessments found</p>
    <p className="text-sm text-muted-foreground">Your assessments will appear here after you or your reviewer starts one.</p>
  </div>;
  return <div className="space-y-3">{records.map(record => {
    const status = STATUS_CONFIG[record.status];
    const finalized = ["completed", "training_required"].includes(record.status);
    return <article key={record.id} className="rounded-xl border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold">{record.assessmentNo}</span>
          <span className={`rounded-full px-2.5 py-1 text-xs ${status?.bg || "bg-muted"} ${status?.color || "text-muted-foreground"}`}>{status?.label || record.status}</span>
        </div>
        <p className="font-medium">{record.cycleTitle || "Individual assessment"}</p>
        <p className="text-sm text-muted-foreground">{record.startDate || record.cycleStartDate
          ? `${fmtDate(record.startDate || record.cycleStartDate)} – ${fmtDate(record.endDate || record.cycleEndDate)}`
          : `Started ${fmtDate(record.createdAt)}`}</p>
        {finalized && <p className="text-sm">Final score: <strong>{record.finalScore == null ? "—" : `${Number(record.finalScore).toFixed(1)}/5`}</strong>{record.competencyLevel ? ` · ${record.competencyLevel}` : ""}</p>}
        {record.hrCompletedAt && <p className="text-xs text-muted-foreground">Reviewed {fmtDate(record.hrCompletedAt)}</p>}
        {record.nextAssessmentDueDate && <p className="text-xs text-muted-foreground">Next assessment due {fmtDate(record.nextAssessmentDueDate)}</p>}
      </div>
      <Button variant="outline" onClick={() => onOpen(record.id)} className="shrink-0">{["draft", "revision_requested"].includes(record.status) ? "Continue assessment" : "View assessment"}</Button>
    </article>;
  })}</div>;
}

export function AssessmentsHomePage() {
  const permissions = useUserPermissions();
  const metadata = useQuery(assessmentPermissionsQuery);
  if (permissions.isAdmin || permissions.isHr || metadata.data?.isAdmin || metadata.data?.isHr) return <SkillAssessmentsPage />;
  if (metadata.isLoading) return <p role="status">Loading Assessments...</p>;
  if (metadata.isError) return <ModuleLayout title="Assessments" description="Your assessment history and current work.">
    <div role="alert" className="rounded-xl border p-5 space-y-3"><p>{metadata.error.message}</p><Button onClick={() => metadata.refetch()}>Retry</Button></div>
  </ModuleLayout>;
  if (!metadata.data?.canAccessModule) return <ModuleLayout title="Assessments" description="Your assessment history and current work.">
    <p className="rounded-xl border p-6 text-muted-foreground">Assessment access is currently paused by hospital administration. Contact HR for assistance.</p>
  </ModuleLayout>;
  if (!metadata.data.currentStaff?.staffId) return <ModuleLayout title="Assessments" description="Your assessment history and current work.">
    <p className="rounded-xl border p-6 text-muted-foreground">A linked staff profile is needed to see your assessment history. Contact HR to link your account.</p>
  </ModuleLayout>;
  return <StaffAssessmentsHome myPerms={metadata.data} />;
}

function StaffAssessmentsHome({ myPerms }: { myPerms: any }) {
  const queryClient = useQueryClient();
  const staffId = myPerms.currentStaff.staffId;
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const history = useQuery({
    queryKey: ["skill-assessments-list", "staff-home", staffId, page, status],
    queryFn: () => assessmentJson(`/api/skill-assessment/list?${new URLSearchParams({ tab: "my", page: String(page), pageSize: "10", status })}`),
  });
  const cycles = useQuery({ queryKey: ["skill-assessment-cycles"], queryFn: () => assessmentJson("/api/skill-assessment/cycles") });
  const activeCycle = cycles.data?.find((cycle: any) => cycle.status === "active");
  const current = useQuery({
    queryKey: ["skill-assessments-list", "own-active-cycle", activeCycle?.id, staffId],
    queryFn: () => assessmentJson(`/api/skill-assessment/list?tab=my&page=1&pageSize=1&cycleId=${activeCycle.id}`),
    enabled: Boolean(activeCycle?.id),
  });
  const currentAssessment = current.data?.data?.[0];
  const attempts = useQuery({
    queryKey: ["assessment-exam-attempts", staffId],
    // Supervisors use this same home; explicitly scope even privileged readers to themselves.
    queryFn: () => assessmentJson(`/api/skill-assessment/exam/attempts?staffId=${staffId}`),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["skill-assessments-list"] });
    queryClient.invalidateQueries({ queryKey: ["assessment-exam-attempts"] });
    queryClient.invalidateQueries({ queryKey: ["skill-assessment-cycles"] });
  };
  const start = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/skill-assessment/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId: activeCycle?.id }),
      });
      const data = await response.json().catch(() => ({}));
      const id = data.assessmentId || data.assessment?.id;
      if (!response.ok && !(response.status === 409 && id)) throw new Error(data.error || "Could not start your assessment.");
      if (!id) throw new Error("The assessment could not be opened. Refresh and try again.");
      return Number(id);
    },
    onSuccess: id => { refresh(); setSelectedId(id); },
    onError: error => toast.error(error.message),
  });
  const editableCurrent = !currentAssessment || ["draft", "revision_requested"].includes(currentAssessment.status);
  const pagination = history.data?.pagination;
  return <ModuleLayout title="Assessments" description="Track your assessments, open previous results, and continue your current self-assessment."
    action={<Button variant="outline" onClick={refresh}><RefreshCw size={14} className="mr-2" />Refresh</Button>}>
    <section className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 font-semibold"><Clock size={18} />Current assessment</div>
      {cycles.isLoading || (activeCycle && current.isLoading) ? <p role="status">Loading current assessment...</p>
        : cycles.isError || current.isError ? <div role="alert" className="space-y-2"><p>Could not load your current assessment.</p><Button variant="outline" onClick={() => { cycles.refetch(); if (activeCycle) current.refetch(); }}>Retry</Button></div>
        : <>
          <p className="text-sm text-muted-foreground">{activeCycle?.title || "No active assessment period. Contact HR to arrange your next assessment."}</p>
          <div className="flex flex-wrap gap-2">
            {currentAssessment ? <Button onClick={() => setSelectedId(currentAssessment.id)}>{editableCurrent ? "Continue self-assessment" : "View current assessment"}</Button>
              : <Button disabled={!activeCycle || start.isPending} onClick={() => start.mutate()}>{start.isPending ? "Starting..." : "Start self-assessment"}</Button>}
            <Button asChild variant="outline"><Link to="/assessments/online-cbt" search={editableCurrent && currentAssessment ? { assessmentId: currentAssessment.id } : {}}><GraduationCap size={16} className="mr-2" />Online CBT exam</Link></Button>
          </div>
          <p className="text-xs text-muted-foreground">One CBT exam per calendar month (India time). Starting an exam uses that month’s attempt; an in-progress exam can be resumed.</p>
        </>}
    </section>
    <section className="space-y-4 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">My assessment history</h2>
        <div><label htmlFor="my-assessment-status" className="sr-only">Filter assessment history by status</label>
          <select id="my-assessment-status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="rounded-lg border bg-background p-2 text-sm">
            <option value="all">All statuses</option>{Object.entries(STATUS_CONFIG).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
          </select>
        </div>
      </div>
      <StaffAssessmentHistory records={history.data?.data || []} loading={history.isLoading} error={history.isError ? history.error.message : undefined} onRetry={() => history.refetch()} onOpen={setSelectedId} />
      {!history.isError && pagination?.totalRecords > 0 && <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>{pagination.totalRecords} assessment{pagination.totalRecords === 1 ? "" : "s"} · Page {page} of {pagination.totalPages}</p>
        <div className="flex gap-2"><Button variant="outline" disabled={page <= 1 || history.isFetching} onClick={() => setPage(p => p - 1)}>Previous</Button><Button variant="outline" disabled={page >= pagination.totalPages || history.isFetching} onClick={() => setPage(p => p + 1)}>Next</Button></div>
      </div>}
    </section>
    <section className="mt-6 space-y-3">
      <h2 className="text-lg font-semibold">My online exam history</h2>
      <p className="text-sm text-muted-foreground">Your latest 50 CBT attempts, including exams taken separately from a skill assessment.</p>
      {attempts.isLoading ? <p role="status">Loading your online exams...</p>
        : attempts.isError ? <div role="alert"><p>{attempts.error.message}</p><Button variant="outline" onClick={() => attempts.refetch()}>Retry</Button></div>
        : !attempts.data?.length ? <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">You have not taken an online exam yet.</p>
        : <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm text-left"><thead className="bg-muted"><tr><th className="p-3">Exam</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3 text-right">Score</th><th className="p-3">Certificate</th></tr></thead>
          <tbody>{attempts.data.map((attempt: any) => <tr key={attempt.id} className="border-t"><td className="p-3 font-mono">{attempt.attemptNo}</td><td className="p-3 whitespace-nowrap">{fmtDate(attempt.startedAt)}</td><td className="p-3">{({ in_progress: "In progress", completed: "Completed", timed_out: "Timed out", abandoned: "Abandoned" } as Record<string, string>)[attempt.status] || attempt.status}</td><td className="p-3 text-right">{canPrintCbtCertificate(attempt.status) ? `${Number(attempt.score).toFixed(1)}%` : "—"}</td><td className="p-3">{canPrintCbtCertificate(attempt.status) ? <Button variant="outline" size="sm" asChild><Link to="/assessments/certificates/$attemptId" params={{ attemptId: String(attempt.id) }} target="_blank" rel="noopener noreferrer">Print certificate</Link></Button> : "—"}</td></tr>)}</tbody>
        </table></div>}
    </section>
    {selectedId != null && <AssessmentWorkspaceModal assessmentId={selectedId} myPerms={myPerms} onClose={() => { setSelectedId(null); refresh(); }} />}
  </ModuleLayout>;
}
