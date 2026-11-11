import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Building2, CheckCircle2, Clock, AlertTriangle, Sparkles } from "lucide-react";
import { ModuleLayout } from "../ModuleLayout";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
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
  const [selectedTrackIdx, setSelectedTrackIdx] = useState(0);

  const config = useQuery({
    queryKey: ["skill-assessment-exam-config"],
    queryFn: () => assessmentJson("/api/skill-assessment/exam/config"),
  });

  const tracksQuery = useQuery({
    queryKey: ["my-cbt-exam-tracks"],
    queryFn: () => assessmentJson("/api/skill-assessment/exam/my-tracks"),
  });

  const attempts = useQuery({
    queryKey: ["assessment-exam-attempts", staffId],
    queryFn: () => assessmentJson(`/api/skill-assessment/exam/attempts?staffId=${staffId}`),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["assessment-exam-attempts"] });
    queryClient.invalidateQueries({ queryKey: ["my-cbt-exam-tracks"] });
  };

  const tracks = (tracksQuery.data?.tracks || []) as any[];
  const selectedTrack = tracks[selectedTrackIdx] || tracks[0];

  const activeAttempt = selectedTrack?.inProgressAttemptId
    ? attempts.data?.find((attempt: any) => attempt.id === selectedTrack.inProgressAttemptId)
    : attempts.data?.find((attempt: any) => attempt.status === "in_progress");

  return (
    <ModuleLayout title="Online CBT" description="Take or resume your own competency examination and view the result.">
      {started ? (
        <OnlineCbtSession
          assessmentId={assessmentId}
          targetDepartmentId={selectedTrack?.targetDepartmentId}
          purpose={selectedTrack?.purpose}
          enrollmentId={selectedTrack?.enrollmentId}
          onClose={() => {
            setStarted(false);
            refresh();
          }}
        />
      ) : (
        <section className="min-w-0 max-w-3xl break-words rounded-2xl border bg-card p-5 sm:p-6 space-y-6">
          <div className="flex items-center gap-3">
            <GraduationCap className="text-primary size-6" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Before you begin</h2>
              <p className="text-xs text-muted-foreground">
                Clinical theoretical examination session and domain verification
              </p>
            </div>
          </div>

          {config.isLoading || tracksQuery.isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">Loading examination profile and tracks...</p>
          ) : config.isError || tracksQuery.isError ? (
            <div role="alert" className="space-y-3">
              <p className="text-sm text-rose-600">Could not load examination tracks.</p>
              <Button variant="outline" size="sm" onClick={() => { config.refetch(); tracksQuery.refetch(); }}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              {/* Exam Title & Benchmarks */}
              <div className="space-y-2">
                <p className="font-semibold text-foreground text-base">{config.data?.title}</p>
                <dl className="grid gap-3 grid-cols-2 sm:grid-cols-3 text-xs bg-muted/30 p-3.5 rounded-xl border">
                  <div>
                    <dt className="text-muted-foreground">Questions</dt>
                    <dd className="font-bold text-sm text-foreground">{config.data?.totalQuestions}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Duration</dt>
                    <dd className="font-bold text-sm text-foreground">{Math.round((config.data?.totalTimeSeconds ?? 0) / 60)} minutes</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Passing Benchmark</dt>
                    <dd className="font-bold text-sm text-emerald-600 dark:text-emerald-400">≥ {Number(config.data?.passPercentage)}%</dd>
                  </div>
                </dl>
              </div>

              {/* Model C: Examination Track Selection (When staff has multiple tracks) */}
              {tracks.length > 1 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Building2 size={14} className="text-primary" />
                      Select Examination Track ({tracks.length} Assigned)
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Each track has its own isolated monthly attempt quota
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tracks.map((t: any, idx: number) => {
                      const isSelected = selectedTrackIdx === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedTrackIdx(idx)}
                          className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-bold text-xs text-foreground line-clamp-1">
                                {t.targetDepartmentName}
                              </span>
                              <Badge
                                className={
                                  t.isHome
                                    ? "bg-primary/10 text-primary border-primary/20 text-[9px] py-0"
                                    : "bg-sky-600 text-white text-[9px] py-0"
                                }
                              >
                                {t.isHome ? "Home Dept" : t.purposeLabel}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {t.notes || t.purposeLabel}
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px]">
                            <span
                              className={`font-semibold flex items-center gap-1 ${
                                t.inProgressAttemptId
                                  ? "text-teal-600 dark:text-teal-400"
                                  : t.canStart
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : t.hasPassed
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {t.inProgressAttemptId
                                ? "In Progress"
                                : t.canStart
                                ? "Ready to Start"
                                : t.hasPassed
                                ? "Benchmark Passed"
                                : "Cooling / Locked"}
                            </span>
                            <span className="text-muted-foreground font-mono text-[10px]">
                              Attempt {t.attemptsCount}/2
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active In-Progress Banner */}
              {activeAttempt && (
                <div className="rounded-xl border border-teal-300 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 p-4 text-xs space-y-1">
                  <div className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <Clock size={14} className="text-teal-600" />
                    In-Progress Examination Found ({activeAttempt.attemptNo})
                  </div>
                  <p className="text-teal-800 dark:text-teal-300">
                    You have an ongoing examination for <strong>{activeAttempt.departmentName}</strong>. Resuming will return you to your saved answers with your original deadline intact.
                  </p>
                </div>
              )}

              {/* Lockout / Cooling warning banner */}
              {selectedTrack && !selectedTrack.canStart && !activeAttempt && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 p-4 text-xs space-y-1">
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-600" />
                    Examination Track Unavailable
                  </div>
                  <p className="text-amber-800 dark:text-amber-300">
                    {selectedTrack.lockReason}
                  </p>
                </div>
              )}

              <ul className="list-disc pl-5 space-y-2 text-xs text-muted-foreground">
                <li>One initial attempt and one remediation retest are allowed per calendar month in India time.</li>
                <li><strong>Model C Quota Isolation:</strong> Tests taken for rotations or transfer evaluations do not consume your primary department's monthly attempt quota.</li>
                <li>Answers auto-save continuously in real time. The timer keeps running if you refresh or switch tabs.</li>
                <li>Unanswered questions receive zero marks. Ensure all questions are addressed before submitting.</li>
              </ul>

              {assessmentId && !activeAttempt && (
                <p className="text-xs text-muted-foreground italic">
                  This examination will be linked to your active self-assessment record.
                </p>
              )}

              {/* Action Button */}
              {activeAttempt ? (
                <Button onClick={() => setStarted(true)} className="min-h-11 w-full sm:w-auto gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                  <GraduationCap size={16} /> Resume Examination ({activeAttempt.departmentName || "CBT"})
                </Button>
              ) : selectedTrack && !selectedTrack.canStart ? (
                <Button disabled variant="outline" className="min-h-11 w-full sm:w-auto opacity-70 text-xs">
                  {selectedTrack.lockReason || "Examination Locked"}
                </Button>
              ) : (
                <Button onClick={() => setStarted(true)} className="min-h-11 w-full sm:w-auto gap-2 font-semibold">
                  <GraduationCap size={16} /> Start Examination ({selectedTrack?.targetDepartmentName || "CBT"})
                </Button>
              )}
            </>
          )}
        </section>
      )}
    </ModuleLayout>
  );
}

