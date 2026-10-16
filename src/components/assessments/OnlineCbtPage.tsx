import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { ModuleLayout } from "../ModuleLayout";
import { Button } from "../../ui/button";
import { assessmentJson, assessmentPermissionsQuery } from "./AssessmentsHome";
import { OnlineCbtSession } from "./OnlineCbtSession";

export function OnlineCbtPage({ assessmentId }: { assessmentId?: number }) {
  const permissions = useQuery(assessmentPermissionsQuery);
  if (permissions.isLoading) return <p role="status">Loading online CBT access...</p>;
  if (permissions.isError) return <div role="alert" className="space-y-3"><p>Could not load online CBT access.</p><Button onClick={() => permissions.refetch()}>Retry</Button></div>;
  if (!permissions.data?.canAccessModule) return <ModuleLayout title="Online CBT" description="Your online competency examination."><p className="rounded-xl border p-5">Online CBT access is currently paused by hospital administration. Contact HR for assistance.</p></ModuleLayout>;
  if (!permissions.data.currentStaff?.staffId) return <ModuleLayout title="Online CBT" description="Your online competency examination."><p className="rounded-xl border p-5">A linked staff profile is required to take an online CBT. Contact HR to link your account.</p></ModuleLayout>;
  return <CandidateOnlineCbt key={assessmentId ?? "standalone"} staffId={permissions.data.currentStaff.staffId} assessmentId={assessmentId} />;
}

function CandidateOnlineCbt({ staffId, assessmentId }: { staffId: number; assessmentId?: number }) {
  const queryClient = useQueryClient();
  const [started, setStarted] = useState(false);
  const config = useQuery({ queryKey: ["skill-assessment-exam-config"], queryFn: () => assessmentJson("/api/skill-assessment/exam/config") });
  const attempts = useQuery({
    queryKey: ["assessment-exam-attempts", staffId],
    queryFn: () => assessmentJson(`/api/skill-assessment/exam/attempts?staffId=${staffId}`),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["assessment-exam-attempts"] });
  const activeAttempt = attempts.data?.find((attempt: any) => attempt.status === "in_progress");
  return <ModuleLayout title="Online CBT" description="Take or resume your own competency examination and view the result.">
    {started ? <OnlineCbtSession assessmentId={assessmentId} onClose={() => { setStarted(false); refresh(); }} />
      : <section className="min-w-0 max-w-3xl break-words rounded-2xl border bg-card p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3"><GraduationCap className="text-primary" /><h2 className="text-lg font-semibold">Before you begin</h2></div>
        {config.isLoading || attempts.isLoading ? <p role="status">Loading exam details...</p>
          : config.isError || attempts.isError ? <div role="alert" className="space-y-3"><p>Could not load exam details.</p><Button variant="outline" onClick={() => { config.refetch(); attempts.refetch(); }}>Retry</Button></div>
            : <>
              <p className="font-medium">{config.data?.title}</p>
              {activeAttempt ? <p className="rounded-lg bg-muted p-3 text-sm">You have an in-progress exam ({activeAttempt.attemptNo}). Resume it to continue with its saved questions and original deadline.</p>
                : <dl className="grid gap-4 grid-cols-2 sm:grid-cols-3 text-sm"><div><dt className="text-muted-foreground">Questions</dt><dd className="font-semibold">{config.data?.totalQuestions}</dd></div><div><dt className="text-muted-foreground">Duration</dt><dd className="font-semibold">{Math.round((config.data?.totalTimeSeconds ?? 0) / 60)} minutes</dd></div><div><dt className="text-muted-foreground">Pass mark</dt><dd className="font-semibold">{Number(config.data?.passPercentage)}%</dd></div></dl>}
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>One new CBT attempt is allowed per calendar month in India time. Only starting the exam uses your monthly attempt.</li>
                <li>Answers are saved as you work. The timer keeps running if you leave or refresh; return here to resume.</li>
                <li>Check your answers before submitting. Unanswered questions receive zero marks.</li>
                <li>Completed CBT ratings within your assessment period are averaged separately for each domain.</li>
              </ul>
              {assessmentId && !activeAttempt && <p className="text-sm text-muted-foreground">This exam will be linked to your selected self-assessment.</p>}
              <Button onClick={() => setStarted(true)} className="min-h-11 w-full sm:w-auto gap-2"><GraduationCap size={16} />{activeAttempt ? "Resume CBT" : "Start CBT"}</Button>
            </>}
      </section>}
  </ModuleLayout>;
}
