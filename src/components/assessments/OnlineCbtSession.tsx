import React, { useState, useEffect, useRef } from "react";
import { Link, useBlocker } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Flag,
  RotateCcw,
  Send,
  Award,
  Sparkles,
  HelpCircle,
  FileQuestion,
  Check,
  Building2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { cn } from "@/utils/cn";

interface OnlineCbtSessionProps {
  onClose: () => void;
  assessmentId?: number | null;
  onFinished?: (result: any) => void;
}

export function OnlineCbtSession({
  onClose,
  assessmentId,
  onFinished,
}: OnlineCbtSessionProps) {
  const queryClient = useQueryClient();

  const [isLoadingExam, setIsLoadingExam] = useState(true);
  const [startError, setStartError] = useState<string | null>(null);
  const [examSession, setExamSession] = useState<any | null>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [showNavigator, setShowNavigator] = useState(false);
  const questionHeadingRef = useRef<HTMLDivElement>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<number, number>>({});
  const [flaggedIds, setFlaggedIds] = useState<Set<number>>(new Set());
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Timers
  const [totalSecondsLeft, setTotalSecondsLeft] = useState(1200);
  const [questionSecondsLeft, setQuestionSecondsLeft] = useState(60);
  const [perQuestionTotal, setPerQuestionTotal] = useState(60);

  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [examResult, setExamResult] = useState<any | null>(null);
  const [expandedReviewId, setExpandedReviewId] = useState<number | null>(null);

  const totalTimeSpentRef = useRef(0);
  const timerIntervalRef = useRef<any>(null);
  const heartbeatCounterRef = useRef(0);
  const deadlineRef = useRef(0);
  const submittingRef = useRef(false);
  const progressQueueRef = useRef<Promise<void>>(Promise.resolve());
  const currentIdxRef = useRef(currentIdx);
  currentIdxRef.current = currentIdx;

  useBlocker({
    disabled: !isLoadingExam && (!examSession || Boolean(examResult)),
    enableBeforeUnload: () => isLoadingExam || Boolean(examSession && !examResult),
    shouldBlockFn: async () => {
      if (!window.confirm("Leave the online CBT? Your exam timer continues running. Saved answers can be resumed from Online CBT.")) return true;
      await progressQueueRef.current;
      return false;
    },
  });

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!examSession) return;
      await progressQueueRef.current;
      const formattedAnswers: Record<string, { selectedOptionIndex: number; timeSpentSeconds: number }> = {};
      examSession.questions?.forEach((q: any) => {
        formattedAnswers[String(q.id)] = {
          selectedOptionIndex: answers[q.id] !== undefined ? answers[q.id] : -1,
          timeSpentSeconds: questionTimeSpent[q.id] || 0,
        };
      });

      const res = await fetch(`/api/skill-assessment/exam/${examSession.attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: formattedAnswers,
          totalTimeSpentSeconds: totalTimeSpentRef.current,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit exam");
      }
      return res.json();
    },
    onSuccess: (result) => {
      clearInterval(timerIntervalRef.current);
      setExamResult(result);
      setShowConfirmSubmit(false);
      if (examSession?.attemptId) {
        try {
          sessionStorage.removeItem(`cbt_exam_answers_${examSession.attemptId}`);
        } catch (_) {}
      }
      toast.success(
        `Exam finished! Score: ${result.score}% (${result.theoreticalRating}/5.0).${result.syncedToAssessmentId ? " Saved to your assessment." : " Result saved."}`
      );
      queryClient.invalidateQueries({ queryKey: ["skill-assessments-list"] });
      queryClient.invalidateQueries({ queryKey: ["skill-assessment-detail"] });
      queryClient.invalidateQueries({ queryKey: ["skill-assessment-pending-counts"] });
      queryClient.invalidateQueries({ queryKey: ["assessment-exam-attempts"] });
      if (onFinished) {
        onFinished(result);
      }
    },
    onError: (err: any) => {
      submittingRef.current = false;
      toast.error(err.message || "Failed to submit exam");
    },
  });

  const submitExam = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    submitMutation.mutate();
  };

  const handleAutoSubmitOnTimeout = () => {
    if (submittingRef.current) return;
    toast.warning("Time limit expired! Automatically grading and submitting your examination...");
    submitExam();
  };

  // Background auto-save helper
  const syncProgressToServer = (
    attemptId: number,
    currentAnswers: Record<number, number>,
    timeSpent: number
  ) => {
    try {
      sessionStorage.setItem(`cbt_exam_answers_${attemptId}`, JSON.stringify(currentAnswers));
    } catch (_) {}
    progressQueueRef.current = progressQueueRef.current.then(async () => {
      try {
        const res = await fetch(`/api/skill-assessment/exam/${attemptId}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: currentAnswers,
            timeSpentSeconds: timeSpent,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.isExpired) {
            handleAutoSubmitOnTimeout();
          }
        }
      } catch (e) {
        console.warn("CBT exam progress auto-save background sync failed", e);
      }
    });
    return progressQueueRef.current;
  };

  // Initialize and start exam session
  useEffect(() => {
    const controller = new AbortController();
    submittingRef.current = false;
    heartbeatCounterRef.current = 0;
    setShowConfirmSubmit(false);
    setIsLoadingExam(true);
    fetch("/api/skill-assessment/exam/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Failed to start online examination session");
        return body;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        deadlineRef.current = Date.now() + (data.remainingSeconds ?? data.totalTimeSeconds ?? 1200) * 1000;
        setExamSession(data);
        const perQ = data.perQuestionTimeSeconds || 60;
        setPerQuestionTotal(perQ);
        setQuestionSecondsLeft(perQ);

        if (data.isResumed) {
          const remaining = Math.max(0, data.remainingSeconds ?? 1200);
          setTotalSecondsLeft(remaining);
          const totalDuration = data.totalTimeSeconds || 1200;
          totalTimeSpentRef.current = Math.max(0, totalDuration - remaining);

          // Restore saved answers from server or fallback to sessionStorage
          const restoredAnswers: Record<number, number> = {};
          if (data.savedAnswers && typeof data.savedAnswers === "object") {
            Object.entries(data.savedAnswers).forEach(([k, v]) => {
              const optVal =
                typeof v === "object" && v !== null && "selectedOptionIndex" in v
                  ? (v as any).selectedOptionIndex
                  : Number(v);
              if (optVal !== -1 && !isNaN(optVal)) {
                restoredAnswers[Number(k)] = optVal;
              }
            });
          }

          // Merge with sessionStorage if any recent unsynced answers exist
          try {
            const localSaved = sessionStorage.getItem(`cbt_exam_answers_${data.attemptId}`);
            if (localSaved) {
              const parsed = JSON.parse(localSaved);
              Object.entries(parsed).forEach(([k, v]) => {
                restoredAnswers[Number(k)] = Number(v);
              });
            }
          } catch (_) {}

          setAnswers(restoredAnswers);
          const m = Math.floor(remaining / 60);
          const s = remaining % 60;
          toast.info(
            `Resumed active examination session (${data.attemptNo || `EXAM #${data.attemptId}`}). ${m}m ${s}s remaining.`
          );
        } else {
          setTotalSecondsLeft(data.totalTimeSeconds || 1200);
          totalTimeSpentRef.current = 0;
          try {
            sessionStorage.removeItem(`cbt_exam_answers_${data.attemptId}`);
          } catch (_) {}
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        toast.error(err.message || "Could not launch examination.");
        setStartError(err.message || "Could not start the examination.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingExam(false);
      });
    return () => controller.abort();
  }, [assessmentId]);

  // Dual Timer Clock Effect & Periodic 15s Heartbeat
  useEffect(() => {
    if (!examSession || examResult) {
      clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      totalTimeSpentRef.current += 1;
      heartbeatCounterRef.current += 1;

      // Update question time spent
      const curQ = examSession.questions?.[currentIdxRef.current];
      if (curQ) {
        setQuestionTimeSpent((prev) => ({
          ...prev,
          [curQ.id]: (prev[curQ.id] || 0) + 1,
        }));
      }

      // Decrement Per-Question Timer & Auto-advance on Timeout
      setQuestionSecondsLeft((prev) => {
        if (prev <= 0) return 0;
        if (prev <= 1) {
          const cIdx = currentIdxRef.current;
          const totalQ = examSession.questions?.length || 0;
          if (cIdx < totalQ - 1) {
            const nextIdx = cIdx + 1;
            currentIdxRef.current = nextIdx;
            setCurrentIdx(nextIdx);
            const nextQ = examSession.questions[nextIdx];
            const nextLimit = nextQ?.defaultTimeSeconds || examSession.perQuestionTimeSeconds || 60;
            setPerQuestionTotal(nextLimit);
            toast.info(`Time up for Question ${cIdx + 1}! Automatically advancing to Question ${nextIdx + 1}.`, {
              duration: 3000,
            });
            return nextLimit;
          } else {
            toast.warning("Time expired for the final question. Please review and submit your examination.", {
              duration: 4000,
            });
            setShowConfirmSubmit(true);
            return 0;
          }
        }
        return prev - 1;
      });

      // Decrement Overall Exam Timer
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setTotalSecondsLeft(remaining);
      if (remaining === 0) {
        clearInterval(timerIntervalRef.current);
        handleAutoSubmitOnTimeout();
      }

      // Heartbeat: every 15 seconds, auto-sync progress to server
      if (heartbeatCounterRef.current % 15 === 0 && examSession?.attemptId) {
        syncProgressToServer(examSession.attemptId, answers, totalTimeSpentRef.current);
      }
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [examSession, examResult, currentIdx, answers]);

  // Tab switching anti-cheat monitoring
  useEffect(() => {
    if (!examSession || examResult) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const nextCount = prev + 1;
          toast.warning(
            `⚠️ Proctoring Warning: Tab switch detected (Count: ${nextCount}). CBT sessions track window focus and tab changes.`,
            { duration: 5000 }
          );
          return nextCount;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [examSession, examResult]);

  // Reset per-question countdown whenever candidate changes question
  const goToQuestion = (idx: number) => {
    if (!examSession?.questions) return;
    if (idx < 0 || idx >= examSession.questions.length) return;
    currentIdxRef.current = idx;
    setCurrentIdx(idx);
    const q = examSession.questions[idx];
    const qLimit = q.defaultTimeSeconds || examSession.perQuestionTimeSeconds || 60;
    setPerQuestionTotal(qLimit);
    setQuestionSecondsLeft(qLimit);
    if (window.matchMedia("(max-width: 767px)").matches) {
      requestAnimationFrame(() => {
        questionHeadingRef.current?.focus({ preventScroll: true });
        questionHeadingRef.current?.scrollIntoView({ block: "start" });
      });
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (!currentQuestion || !examSession?.attemptId || submittingRef.current || totalSecondsLeft <= 0) return;
    const updatedAnswers = {
      ...answers,
      [currentQuestion.id]: optionIndex,
    };
    setAnswers(updatedAnswers);
    // Instant background auto-save
    syncProgressToServer(examSession.attemptId, updatedAnswers, totalTimeSpentRef.current);
  };

  const handleToggleFlag = () => {
    if (!currentQuestion) return;
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id);
      } else {
        next.add(currentQuestion.id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    if (!currentQuestion || !examSession?.attemptId) return;
    const updatedAnswers = { ...answers };
    delete updatedAnswers[currentQuestion.id];
    setAnswers(updatedAnswers);
    // Instant background auto-save
    syncProgressToServer(examSession.attemptId, updatedAnswers, totalTimeSpentRef.current);
  };

  const currentQuestion = examSession?.questions?.[currentIdx];
  const totalQuestions = examSession?.questions?.length || 0;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;

  // Formatting seconds into mm:ss
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Question progress percentage
  const questionTimerPercent = Math.max(
    0,
    Math.min(100, Math.round((questionSecondsLeft / perQuestionTotal) * 100))
  );

  return (
    <section aria-label="Online CBT examination" className="online-cbt-session w-full min-w-0 [overflow-wrap:anywhere]">
      <div className="bg-card border border-border w-full min-w-0 md:h-[calc(100dvh-13rem)] md:min-h-[34rem] rounded-2xl flex flex-col overflow-hidden">
        {startError && <div role="alert" className="p-6 space-y-4"><h2 className="font-semibold">Unable to start CBT</h2><p>{startError}</p><Button variant="outline" onClick={onClose}>Back to Online CBT</Button></div>}
        {/* Loading State */}
        {isLoadingExam && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
            <GraduationCap size={40} className="animate-bounce text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-foreground">
              Preparing Your Theoretical Examination...
            </h3>
            <p className="text-xs text-muted-foreground text-center max-w-md">
              Loading your saved attempt or preparing questions using the configured question mix.
            </p>
          </div>
        )}

        {/* Post-Submit Result View */}
        {!isLoadingExam && examResult && (
          <div className="min-w-0 flex-1 flex flex-col md:overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-border bg-muted/40 flex flex-wrap gap-3 items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-xl bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Examination Scorecard & Review</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Attempt No: {examResult.attemptNo} • Benchmark: {Number(examSession?.passPercentage ?? 60)}%
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
              {(examResult.attemptId || examSession?.attemptId) && <Button size="sm" variant="outline" asChild><Link to="/assessments/certificates/$attemptId" params={{ attemptId: String(examResult.attemptId || examSession.attemptId) }} target="_blank" rel="noopener noreferrer">Print certificate</Link></Button>}
              <Button size="sm" variant="outline" onClick={onClose} className="text-xs">
                Back to Online CBT
              </Button>
              </div>
            </div>

            <div className="min-w-0 flex-1 md:overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Score Hero Banner */}
              <div
                className={cn(
                  "p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-6",
                  examResult.passed
                    ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-100"
                    : "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-100"
                )}
              >
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <Badge
                      className={cn(
                        "text-xs px-2.5 py-0.5 font-bold uppercase",
                        examResult.passed ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                      )}
                    >
                      {examResult.passed ? "Pass Benchmark Achieved" : "Improvement Needed"}
                    </Badge>
                    <span className="text-xs font-mono font-medium">
                      Time Spent: {Math.round(examResult.timeSpentSeconds / 60)}m {examResult.timeSpentSeconds % 60}s
                    </span>
                  </div>
                  <h2 className="text-xl font-bold">
                    Score: {examResult.score}% ({examResult.correctCount} / {examResult.totalQuestions} Correct)
                  </h2>
                  <p className="text-xs opacity-90">
                    Scaled Competency Rating: <strong>{examResult.theoreticalRating} / 5.0</strong>
                  </p>
                </div>

                <div className="flex items-center gap-4 text-center">
                  <div className="size-20 rounded-2xl bg-background border shadow-xs flex flex-col items-center justify-center p-2">
                    <span className="text-2xl font-black text-foreground font-mono">
                      {examResult.theoreticalRating}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Out of 5.0</span>
                  </div>
                </div>
              </div>

              {examResult.domainResults?.length > 0 && <section className="space-y-2">
                <h4 className="text-sm font-semibold">Results by domain</h4>
                <div className="overflow-x-auto rounded-lg border"><table className="w-full text-xs text-left">
                  <thead className="bg-muted"><tr><th className="p-2">Domain</th><th className="p-2">Correct / Questions</th><th className="p-2">Score</th><th className="p-2">Theory rating</th></tr></thead>
                  <tbody>{examResult.domainResults.map((domain: any) => <tr key={domain.domainCode} className="border-t"><td className="p-2 font-medium">{domain.domainCode}</td><td className="p-2">{domain.correctCount} / {domain.totalQuestions}</td><td className="p-2">{domain.score}%</td><td className="p-2">{domain.theoreticalRating.toFixed(1)} / 5</td></tr>)}</tbody>
                </table></div>
              </section>}

              {/* Automatic Sync Notice */}
              {examResult.syncedToAssessmentId && (
                <div className="p-3.5 rounded-xl border border-teal-200 dark:border-teal-900/40 bg-teal-50 dark:bg-teal-950/30 text-xs text-teal-800 dark:text-teal-300 flex items-start gap-2.5">
                  <Sparkles size={16} className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 leading-relaxed">
                    <span className="font-semibold block">Automatic Score Synchronization Completed:</span>
                    <span>
                      Your overall theoretical rating is <strong>{examResult.theoreticalRating} / 5.0</strong>. Your assessment averages all completed CBTs within its assessment period, separately for each domain. Domains absent from the exam remain unassessed.
                    </span>
                  </div>
                </div>
              )}

              {/* Review Section */}
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Detailed Question Review & Clinical Guidelines
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {examResult.correctCount} Correct • {examResult.incorrectCount} Incorrect • {examResult.unansweredCount} Unanswered
                  </span>
                </div>

                <div className="space-y-2.5">
                  {examResult.review?.map((item: any, idx: number) => {
                    const isExpanded = expandedReviewId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-3.5 rounded-xl border text-xs transition-colors",
                          item.isCorrect
                            ? "bg-card border-border hover:border-emerald-300 dark:hover:border-emerald-800"
                            : "bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted">
                                Q{idx + 1} • {item.code}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {item.domainCode}
                              </Badge>
                              {item.isCorrect ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] py-0">Correct</Badge>
                              ) : item.selectedOptionIndex === -1 ? (
                                <Badge variant="outline" className="border-amber-400 text-amber-700 text-[10px] py-0">
                                  Unanswered
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-600 text-white text-[10px] py-0">Incorrect</Badge>
                              )}
                            </div>
                            <div className="font-medium text-foreground pt-1">{item.question}</div>
                          </div>

                          <button
                            onClick={() => setExpandedReviewId(isExpanded ? null : item.id)}
                            aria-label={isExpanded ? "Hide explanation" : "Show explanation"}
                            aria-expanded={isExpanded}
                            className="size-11 rounded-md text-muted-foreground hover:bg-muted flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>

                        {/* Options breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 text-[11px]">
                          {item.options?.map((opt: string, optIdx: number) => {
                            const isCorrectOpt = optIdx === item.correctOptionIndex;
                            const isUserSelected = optIdx === item.selectedOptionIndex;
                            return (
                              <div
                                key={optIdx}
                                className={cn(
                                  "p-2 rounded-lg border flex items-center gap-2",
                                  isCorrectOpt
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-semibold"
                                    : isUserSelected
                                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                                    : "bg-background border-border text-muted-foreground opacity-70"
                                )}
                              >
                                <span className="font-bold text-[10px] size-4.5 shrink-0 rounded flex items-center justify-center bg-muted">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="min-w-0 flex-1 whitespace-normal break-words">{opt}</span>
                                {isCorrectOpt && <Check size={12} className="text-emerald-600 shrink-0" />}
                                {isUserSelected && !isCorrectOpt && <X size={12} className="text-rose-600 shrink-0" />}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        {isExpanded && item.explanation && (
                          <div className="mt-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border text-[11px] space-y-1">
                            <span className="font-semibold text-foreground block">
                              Clinical Guideline Rationale:
                            </span>
                            <p className="text-muted-foreground leading-relaxed">{item.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-border bg-muted/20 flex justify-end shrink-0">
              <Button size="sm" onClick={onClose} className="bg-slate-900 text-white hover:bg-slate-800">
                Finish examination
              </Button>
            </div>
          </div>
        )}

        {/* Active CBT Exam Experience */}
        {!isLoadingExam && examSession && !examResult && (
          <div
            className="min-w-0 flex-1 flex flex-col md:overflow-hidden select-none"
            onCopy={(e) => {
              e.preventDefault();
              toast.error("Copying exam questions or options is disabled for integrity.");
            }}
            onCut={(e) => {
              e.preventDefault();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
            }}
          >
            {/* Top Navigation & Dual Timers Header */}
            <div className="px-4 sm:px-6 py-3 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                  CBT
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-foreground">
                      Theoretical Assessment ({examSession.attemptNo})
                    </h3>
                    {tabSwitchCount === 0 ? (
                      <Badge
                        variant="outline"
                        className="hidden md:inline-flex text-[9px] py-0 px-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 gap-1 font-medium"
                      >
                        <ShieldCheck size={10} /> Proctored
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[9px] py-0 px-1.5 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 gap-1 font-semibold animate-pulse"
                      >
                        <AlertTriangle size={10} /> {tabSwitchCount} Tab Switch{tabSwitchCount > 1 ? "es" : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                    <span>{examSession.departmentName || "General Nursing"}</span>
                    <span>•</span>
                    <span>
                      Question {currentIdx + 1} of {totalQuestions}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <Sparkles size={9} /> Auto-saved
                    </span>
                  </div>
                </div>
              </div>

              {/* Dual Timers */}
              <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto">
                {/* Per-Question Countdown */}
                <div className="flex flex-col sm:items-end sm:text-right">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Question Timer
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
                    <span>{questionSecondsLeft}s</span>
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          questionSecondsLeft <= 10 ? "bg-rose-500" : "bg-teal-500"
                        )}
                        style={{ width: `${questionTimerPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Overall Exam Countdown */}
                <div
                  className={cn(
                    "px-3 py-1.5 rounded-xl border flex items-center gap-2 font-mono font-bold text-xs shadow-2xs",
                    totalSecondsLeft <= 120
                      ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-700 dark:text-rose-400 animate-pulse"
                      : totalSecondsLeft <= 300
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-700 dark:text-amber-400"
                      : "bg-slate-100 dark:bg-slate-800 border-border text-foreground"
                  )}
                  title="Total exam time remaining"
                >
                  <Clock size={14} />
                  <span>{formatTime(totalSecondsLeft)}</span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="text-xs border-teal-300 text-teal-800 dark:text-teal-300 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 font-semibold"
                >
                  Submit Exam
                </Button>
              </div>
            </div>

            {/* Main Interactive Stage & Question Palette */}
            <div className="min-w-0 flex-1 flex flex-col md:flex-row md:overflow-hidden">
              {/* Question Workspace */}
              <div className="min-w-0 flex-1 flex flex-col md:overflow-y-auto p-4 sm:p-6 space-y-5">
                {currentQuestion && (
                  <>
                    {/* Question Header & Meta */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground">
                          Question {currentIdx + 1}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {currentQuestion.domainCode}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            currentQuestion.difficulty === "advanced"
                              ? "text-rose-700 border-rose-300"
                              : "text-slate-700 border-slate-300"
                          )}
                        >
                          {currentQuestion.difficulty}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleToggleFlag}
                          aria-pressed={currentQuestion ? flaggedIds.has(currentQuestion.id) : false}
                          className={cn(
                            "min-h-11 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border",
                            flaggedIds.has(currentQuestion.id)
                              ? "bg-amber-100 dark:bg-amber-950/60 border-amber-300 text-amber-800 dark:text-amber-300"
                              : "border-border text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <Flag size={12} />
                          <span>{flaggedIds.has(currentQuestion.id) ? "Flagged" : "Flag"}</span>
                        </button>

                        <button
                          onClick={handleClearSelection}
                          aria-label="Clear option selection"
                          className="min-h-11 min-w-11 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          title="Clear option selection"
                        >
                          <RotateCcw size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Question Statement */}
                    <div ref={questionHeadingRef} tabIndex={-1} className="scroll-mt-4 text-base font-semibold text-foreground leading-relaxed pt-1">
                      {currentQuestion.question}
                    </div>

                    {/* 4 Selectable Options */}
                    <div className="space-y-2.5 pt-2">
                      {currentQuestion.options?.map((opt: string, optIdx: number) => {
                        const isSelected = answers[currentQuestion.id] === optIdx;
                        const letter = String.fromCharCode(65 + optIdx);
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectOption(optIdx)}
                            aria-pressed={isSelected}
                            disabled={submitMutation.isPending || totalSecondsLeft <= 0}
                            className={cn(
                              "w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer group",
                              isSelected
                                ? "border-teal-500 bg-teal-50/70 dark:bg-teal-950/30 text-teal-950 dark:text-teal-100 ring-1 ring-teal-500 shadow-2xs"
                                : "border-border bg-card hover:bg-muted/50 text-foreground"
                            )}
                          >
                            <span
                              className={cn(
                                "size-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors",
                                isSelected
                                  ? "bg-teal-600 text-white"
                                  : "bg-muted text-muted-foreground group-hover:text-foreground"
                              )}
                            >
                              {letter}
                            </span>
                            <span className="min-w-0 text-sm leading-relaxed flex-1">{opt}</span>
                            {isSelected && (
                              <CheckCircle2 size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Question Palette Sidebar */}
              <div className="w-full md:w-64 md:overflow-y-auto border-t md:border-t-0 md:border-l border-border bg-muted/20 p-4 flex flex-col justify-between shrink-0">
                <div className="order-2 md:order-none space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-foreground">Question Navigator</span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {answeredCount}/{totalQuestions} Answered
                    </span>
                  </div>

                  <button type="button" className="md:hidden min-h-11 w-full rounded-lg border px-3 text-sm font-medium flex items-center justify-between" aria-expanded={showNavigator} aria-controls="cbt-question-palette" onClick={() => setShowNavigator(value => !value)}>
                    {showNavigator ? "Hide question grid" : "Jump to a question"}
                    {showNavigator ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {/* Palette Grid */}
                  <div id="cbt-question-palette" className={cn("grid-cols-5 gap-2 max-h-64 md:max-h-80 overflow-y-auto p-1", showNavigator ? "grid" : "hidden md:grid")}>
                    {examSession.questions?.map((q: any, idx: number) => {
                      const isCurrent = idx === currentIdx;
                      const isAnswered = answers[q.id] !== undefined;
                      const isFlagged = flaggedIds.has(q.id);

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => { goToQuestion(idx); setShowNavigator(false); }}
                          aria-label={`Question ${idx + 1}, ${isAnswered ? "answered" : "unanswered"}${isFlagged ? ", flagged" : ""}`}
                          aria-current={isCurrent ? "step" : undefined}
                          className={cn(
                            "min-h-11 rounded-lg text-sm font-bold flex items-center justify-center relative transition-all cursor-pointer",
                            isCurrent && "ring-2 ring-primary ring-offset-1",
                            isAnswered
                              ? "bg-teal-600 text-white hover:bg-teal-700"
                              : isFlagged
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                              : "bg-background border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {idx + 1}
                          {isFlagged && (
                            <span className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="pt-2 border-t border-border/60 text-[10px] space-y-1 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded bg-teal-600 shrink-0" />
                      <span>Answered ({answeredCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded bg-amber-400 shrink-0" />
                      <span>Flagged for Review ({flaggedIds.size})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded border border-border bg-background shrink-0" />
                      <span>Unanswered ({unansweredCount})</span>
                    </div>
                  </div>
                </div>

                {/* Prev / Next Buttons */}
                <div className="order-1 md:order-none pb-4 md:pb-0 md:pt-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => goToQuestion(currentIdx - 1)}
                    disabled={currentIdx === 0}
                    className="min-h-11 min-w-0 flex-1 text-xs gap-1"
                  >
                    <ChevronLeft size={13} />
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (currentIdx < totalQuestions - 1) {
                        goToQuestion(currentIdx + 1);
                      } else {
                        setShowConfirmSubmit(true);
                      }
                    }}
                    className="min-h-11 min-w-0 flex-1 text-xs gap-1 bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {currentIdx < totalQuestions - 1 ? (
                      <>
                        Next
                        <ChevronRight size={13} />
                      </>
                    ) : (
                      "Review & Submit"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Confirmation Dialog */}
        {showConfirmSubmit && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="cbt-submit-title"
              className="bg-card border border-border w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <Send size={18} />
                </div>
                <div>
                  <h3 id="cbt-submit-title" className="text-sm font-bold text-foreground">Confirm Exam Submission</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Review your answers before finalizing submission
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-muted/30 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Questions:</span>
                  <span className="font-semibold text-foreground font-mono">{totalQuestions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Answered:</span>
                  <span className="font-semibold text-teal-600 font-mono">{answeredCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unanswered:</span>
                  <span className="font-semibold text-rose-600 font-mono">{unansweredCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time Remaining:</span>
                  <span className="font-semibold text-foreground font-mono">
                    {formatTime(totalSecondsLeft)}
                  </span>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>
                    You have <strong>{unansweredCount} unanswered questions</strong>. Any questions left unanswered will receive zero marks.
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowConfirmSubmit(false)}
                  disabled={submitMutation.isPending}
                >
                  Return to Exam
                </Button>
                <Button
                  size="sm"
                  onClick={submitExam}
                  disabled={submitMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                >
                  {submitMutation.isPending ? "Grading..." : "Confirm & Submit Exam"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
