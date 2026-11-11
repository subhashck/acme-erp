import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Lock, Save } from "lucide-react";
import { useUserPermissions } from "../../lib/permissions";
import { ModuleLayout } from "../ModuleLayout";
import { Button } from "../../ui/button";
import { assessmentJson, assessmentPermissionsQuery } from "./AssessmentsHome";
import { CycleManageModal, RubricsCatalogView, fmtDate } from "./SkillAssessmentsPage";
import { ExamConfigModal } from "./ExamConfigModal";

export function AssessmentSettingsPage() {
  const permissions = useUserPermissions();
  const metadata = useQuery(assessmentPermissionsQuery);
  if (permissions.isAdmin || permissions.isHr || metadata.data?.isAdmin || metadata.data?.isHr) {
    return <AssessmentSettingsContent />;
  }
  if (metadata.isLoading || permissions.isLoading) return <p role="status">Checking assessment settings access...</p>;
  if (metadata.isError) return <div role="alert" className="space-y-3"><p>Could not check settings access.</p><Button onClick={() => metadata.refetch()}>Retry</Button></div>;
  return <div role="alert" className="rounded-xl border p-6 space-y-3">
    <Lock aria-hidden="true" /><h1 className="text-lg font-semibold">Assessment settings access restricted</h1>
    <p className="text-sm text-muted-foreground">Only HR and Admin can access assessment settings.</p>
    <Button asChild variant="outline"><Link to="/assessments">Return to Assessments</Link></Button>
  </div>;
}

function AssessmentSettingsContent() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"general" | "exam" | "rubrics">("general");
  const [periodsOpen, setPeriodsOpen] = useState(false);
  const [staffAccess, setStaffAccess] = useState<boolean | null>(null);
  const settings = useQuery({
    queryKey: ["assessment-settings"], queryFn: () => assessmentJson("/api/skill-assessment/settings"),
    enabled: tab === "general",
  });
  const cycles = useQuery({
    queryKey: ["skill-assessment-cycles"], queryFn: () => assessmentJson("/api/skill-assessment/cycles"),
    enabled: tab === "general",
  });
  const rubrics = useQuery({
    queryKey: ["skill-assessment-rubrics"], queryFn: () => assessmentJson("/api/skill-assessment/rubrics?includeInactive=true"),
    enabled: tab === "rubrics",
  });
  const saveAccess = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch("/api/skill-assessment/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableStaffCompetencyModule: enabled }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not save staff access.");
      return body;
    },
    onSuccess: data => {
      queryClient.setQueryData(["assessment-settings"], data);
      queryClient.invalidateQueries({ queryKey: ["skill-assessment-my-permissions"] });
      setStaffAccess(null);
      toast.success("Staff assessment access updated.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const tabs = [{ id: "general", label: "Access & assessment periods" }, { id: "exam", label: "CBT exam" }, { id: "rubrics", label: "Domains, objectives & scenarios" }] as const;
  const enabled = staffAccess ?? settings.data?.enableStaffCompetencyModule ?? false;
  return <ModuleLayout title="Assessment Settings" description="Manage staff access, assessment periods, CBT rules and competency rubrics. Available to HR and Admin.">
    <div className="space-y-5">
      <div role="tablist" aria-label="Assessment settings sections" className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map((item, index) => <button key={item.id} type="button" role="tab" id={`settings-tab-${item.id}`} aria-selected={tab === item.id}
          tabIndex={tab === item.id ? 0 : -1} aria-controls={`settings-panel-${item.id}`} onClick={() => setTab(item.id)}
          onKeyDown={event => {
            const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length
              : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
            if (next === null) return;
            event.preventDefault(); setTab(tabs[next].id);
            document.getElementById(`settings-tab-${tabs[next].id}`)?.focus();
          }}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{item.label}</button>)}
      </div>
      <div role="tabpanel" id={`settings-panel-${tab}`} aria-labelledby={`settings-tab-${tab}`}>
        {tab === "general" && <div className="space-y-5">
          <section className="rounded-xl border bg-card p-5 space-y-4">
            <div><h2 className="font-semibold">Staff assessment access</h2><p className="text-sm text-muted-foreground mt-1">Control access to self-assessments and online CBT exams. When restricted, Nursing Supervisors, HR and Admin retain the existing review access.</p></div>
            {settings.isLoading ? <p role="status">Loading access settings...</p>
              : settings.isError ? <div role="alert"><p>Could not load access settings.</p><Button variant="outline" onClick={() => settings.refetch()}>Retry</Button></div>
                : <form className="space-y-4" onSubmit={event => { event.preventDefault(); saveAccess.mutate(enabled); }}>
                  <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={enabled} disabled={saveAccess.isPending} onChange={event => setStaffAccess(event.target.checked)} className="size-4" />Allow normal staff to access assessments and CBT exams</label>
                  <Button type="submit" disabled={saveAccess.isPending} className="gap-2"><Save size={15} />{saveAccess.isPending ? "Saving..." : "Save staff access"}</Button>
                </form>}
          </section>
          <section className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Assessment periods</h2><p className="text-sm text-muted-foreground mt-1">Manage cycles and dates used for assessments and averaging CBT results.</p></div>
              <Button variant="outline" disabled={cycles.isLoading || cycles.isError} onClick={() => setPeriodsOpen(true)} className="gap-2"><CalendarDays size={15} />Manage assessment periods</Button></div>
            {cycles.isLoading ? <p role="status">Loading assessment periods...</p>
              : cycles.isError ? <div role="alert"><p>Could not load assessment periods.</p><Button variant="outline" onClick={() => cycles.refetch()}>Retry</Button></div>
                : !cycles.data?.length ? <p className="text-sm text-muted-foreground">No assessment periods configured. Create one using Manage assessment periods.</p>
                  : <div className="grid gap-3 sm:grid-cols-2">{cycles.data.map((cycle: any) => <article key={cycle.id} className="rounded-lg border p-3 text-sm"><div className="font-medium">{cycle.title}</div><p className="text-muted-foreground">{fmtDate(cycle.startDate)} – {fmtDate(cycle.endDate)}</p><p className="mt-1 capitalize">{cycle.status}</p></article>)}</div>}
          </section>
        </div>}
        {tab === "exam" && <div className="space-y-4"><ExamConfigModal isOpen embedded onClose={() => {}} /><p className="text-sm text-muted-foreground">Staff can start one CBT per calendar month. Theory averages eligible completed CBTs within the assessment period, separately by domain.</p></div>}
        {tab === "rubrics" && (rubrics.isLoading ? <p role="status">Loading domains and objectives...</p>
          : rubrics.isError ? <div role="alert"><p>Could not load domains and objectives.</p><Button variant="outline" onClick={() => rubrics.refetch()}>Retry</Button></div>
            : <RubricsCatalogView rubrics={rubrics.data?.grouped || []} domainsList={rubrics.data?.domains || []} canManage onRefetch={() => { rubrics.refetch(); }} />)}
      </div>
      {periodsOpen && <CycleManageModal isOpen onClose={() => setPeriodsOpen(false)} cyclesList={cycles.data || []}
        onRefetchCycles={() => { queryClient.invalidateQueries({ queryKey: ["skill-assessment-cycles"] }); }} />}
    </div>
  </ModuleLayout>;
}
