import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Stethoscope,
  Clock,
  Timer,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Flag,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  FileCheck,
  Award,
  ChevronRight,
  Sparkles,
  BookOpen,
  Calendar,
  User,
  History,
  ShieldCheck,
  Lock,
  Unlock,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

function stripOptionPrefix(text: string): string {
  if (typeof text !== "string") return text;
  return text.replace(/^(\([A-Da-d]\)|[A-Da-d][.)])\s*/, "");
}

function formatExamDateTime(isoString?: string | null) {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export const Route = createFileRoute("/_authenticated/doctor-cbt/cbt")({
  component: DoctorCbtExamPage,
});

function DoctorCbtExamPage() {
  const queryClient = useQueryClient();

  // Active taking session state
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [reviewResult, setReviewResult] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"assessments" | "history" | "admin_matrix">("assessments");
  const [reviewFilter, setReviewFilter] = useState<"all" | "correct" | "incorrect" | "unanswered">("all");

  // Admin Duration Setting Dialog State
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const [durationExamType, setDurationExamType] = useState<"pre_test" | "exit_test">("pre_test");
  const [targetDurationMinutes, setTargetDurationMinutes] = useState(20);

  const openDurationDialog = (examType: "pre_test" | "exit_test", currentDuration: number) => {
    setDurationExamType(examType);
    setTargetDurationMinutes(currentDuration || 20);
    setIsDurationModalOpen(true);
  };

  const overviewQuery = useQuery({
    queryKey: ["doctor-cbt-overview"],
    queryFn: async () => {
      const res = await fetch("/api/doctor-cbt/cbt/overview");
      if (!res.ok) throw new Error("Failed to load CBT overview");
      return res.json();
    },
  });

  const startMutation = useMutation({
    mutationFn: async (examType: "pre_test" | "exit_test") => {
      const res = await fetch("/api/doctor-cbt/cbt/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to start exam session");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setActiveSession(data);
      setCurrentQuestionIdx(0);
      setRemainingTime(data.remainingSeconds);
      // Populate existing answers if resumed
      const initialAns: Record<string, number> = {};
      if (data.answers) {
        for (const [qid, opt] of Object.entries(data.answers)) {
          initialAns[String(qid)] = opt as number;
        }
      }
      setAnswers(initialAns);

      const initialFlags: Record<string, boolean> = {};
      if (data.flaggedQuestions) {
        for (const qid of data.flaggedQuestions) {
          initialFlags[String(qid)] = true;
        }
      }
      setFlagged(initialFlags);

      toast.success(data.resumed ? "Resumed in-progress examination" : "Exam session started. Good luck!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not launch exam");
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) return;
      const res = await fetch(`/api/doctor-cbt/cbt/session/${activeSession.sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit exam");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setIsSubmitModalOpen(false);
      setActiveSession(null);
      setReviewResult(data);
      queryClient.invalidateQueries({ queryKey: ["doctor-cbt-overview"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-cbt-me"] });
      toast.success("Examination submitted and scored successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit examination");
    },
  });

  const viewResultQuery = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await fetch(`/api/doctor-cbt/cbt/session/${sessionId}/result`);
      if (!res.ok) throw new Error("Failed to load result");
      return res.json();
    },
    onSuccess: (data) => {
      setReviewResult(data);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to load examination result");
    },
  });

  const updateExamSettingsMutation = useMutation({
    mutationFn: async ({
      examType,
      active,
      durationMinutes,
      allowRetakes,
    }: {
      examType: "pre_test" | "exit_test";
      active?: boolean;
      durationMinutes?: number;
      allowRetakes?: boolean;
    }) => {
      const res = await fetch(`/api/doctor-cbt/cbt/exams/${examType}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active, durationMinutes, allowRetakes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update exam settings");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["doctor-cbt-overview"] });
      toast.success(data.message);
      setIsDurationModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update exam settings");
    },
  });

  const allowCandidateRetakeMutation = useMutation({
    mutationFn: async ({
      enrollmentId,
      examType,
      allowed,
    }: {
      enrollmentId: number;
      examType: "pre_test" | "exit_test";
      allowed: boolean;
    }) => {
      const res = await fetch(`/api/doctor-cbt/cbt/candidates/${enrollmentId}/allow-retake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType, allowed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update retake authorization");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["doctor-cbt-overview"] });
      toast.success(data.message);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update retake authorization");
    },
  });

  // Timer countdown
  useEffect(() => {
    if (!activeSession || remainingTime <= 0) return;
    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          toast.warning("Time has elapsed! Submitting your answers automatically...");
          submitMutation.mutate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession, remainingTime]);

  const handleSelectOption = (questionId: number, optionIdx: number) => {
    setAnswers((prev) => ({ ...prev, [String(questionId)]: optionIdx }));
    // Auto-save answer to backend
    if (activeSession) {
      fetch(`/api/doctor-cbt/cbt/session/${activeSession.sessionId}/save-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          selectedOptionIndex: optionIdx,
          flaggedForReview: Boolean(flagged[String(questionId)]),
        }),
      }).catch(() => {});
    }
  };

  const handleToggleFlag = (questionId: number) => {
    const nextFlag = !flagged[String(questionId)];
    setFlagged((prev) => ({ ...prev, [String(questionId)]: nextFlag }));
    if (activeSession) {
      fetch(`/api/doctor-cbt/cbt/session/${activeSession.sessionId}/save-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          selectedOptionIndex: answers[String(questionId)] ?? null,
          flaggedForReview: nextFlag,
        }),
      }).catch(() => {});
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const data = overviewQuery.data;
  const program = data?.program;
  const candidate = data?.candidate;
  const preTest = candidate?.preTest;
  const exitTest = candidate?.exitTest;
  const preTestBp = data?.blueprints?.preTest || preTest?.blueprint;
  const exitTestBp = data?.blueprints?.exitTest || exitTest?.blueprint;
  const allAttempts = candidate?.allAttempts || [];
  const adminOverview = data?.adminOverview || [];
  const isAdmin = data?.isAdmin;

  // ---------------------------------------------------------------------------
  // ACTIVE EXAM SESSION VIEW
  // ---------------------------------------------------------------------------
  if (activeSession) {
    const questions = activeSession.questions || [];
    const currentQ = questions[currentQuestionIdx];
    const answeredCount = Object.keys(answers).length;
    const isLast = currentQuestionIdx === questions.length - 1;
    const isFirst = currentQuestionIdx === 0;

    return (
      <div className="space-y-4 max-w-5xl mx-auto pb-12">
        {/* Sticky Exam Header */}
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 bg-background/95 backdrop-blur-md p-3 sm:p-4 rounded-xl border shadow-sm">
          <div className="min-w-0 max-w-[60%] sm:max-w-none">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] sm:text-xs">
                {activeSession.examType === "pre_test" ? "Pre-Test" : "Exit-Test"}
              </Badge>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-mono">{activeSession.attemptNo}</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-foreground mt-0.5 truncate">{activeSession.title}</h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border font-mono font-bold text-xs sm:text-sm ${
                remainingTime < 300
                  ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
                  : "bg-muted text-foreground"
              }`}
            >
              <Clock className="size-3.5 sm:size-4 shrink-0" />
              <span>{formatTimer(remainingTime)}</span>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => setIsSubmitModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3"
            >
              <FileCheck className="size-3.5 sm:size-4 mr-1 sm:mr-1.5" />
              <span>Submit</span>
            </Button>
          </div>
        </div>

        {/* Exam Body Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Panel (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Question {currentQuestionIdx + 1} of {questions.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleFlag(currentQ.id)}
                    className={`text-xs gap-1.5 ${
                      flagged[String(currentQ.id)]
                        ? "text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/30"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Flag className={`size-3.5 ${flagged[String(currentQ.id)] ? "fill-amber-500" : ""}`} />
                    {flagged[String(currentQ.id)] ? "Flagged for Review" : "Flag for Review"}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                {/* Clinical Vignette */}
                <div className="p-4 rounded-xl border bg-muted/30 text-sm leading-relaxed text-foreground font-medium">
                  <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Stethoscope className="size-3.5" />
                    Clinical Question Vignette
                  </div>
                  {currentQ.clinicalVignette}
                </div>

                {/* Multiple Choice Options */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-muted-foreground uppercase">Select One Option:</div>
                  {currentQ.options?.map((opt: string, optIdx: number) => {
                    const isSelected = answers[String(currentQ.id)] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(currentQ.id, optIdx)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 text-sm cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-1 ring-primary font-semibold text-primary"
                            : "border-border hover:bg-muted/50 text-foreground"
                        }`}
                      >
                        <div
                          className={`size-5 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </div>
                        <span className="leading-snug">{stripOptionPrefix(opt)}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t p-3 sm:p-6 pt-3 sm:pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isFirst}
                  onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                  className="order-2 sm:order-1"
                >
                  <ArrowLeft className="size-4 mr-1.5" /> Previous
                </Button>

                <div className="flex items-center justify-between sm:justify-end gap-2 order-1 sm:order-2">
                  {answers[String(currentQ.id)] !== undefined && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const copy = { ...answers };
                        delete copy[String(currentQ.id)];
                        setAnswers(copy);
                        handleSelectOption(currentQ.id, -1);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear Selection
                    </Button>
                  )}

                  <Button
                    variant={isLast ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isLast) {
                        setIsSubmitModalOpen(true);
                      } else {
                        setCurrentQuestionIdx((prev) => Math.min(questions.length - 1, prev + 1));
                      }
                    }}
                    className={isLast ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                  >
                    {isLast ? "Review & Submit" : "Next"}
                    {!isLast && <ArrowRight className="size-4 ml-1.5" />}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Palette Sidebar (1 col) */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-xs font-bold uppercase tracking-wider">Question Palette</CardTitle>
                <CardDescription className="text-xs">
                  {answeredCount} of {questions.length} answered
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-5 gap-1.5">
                  {questions.map((q: any, idx: number) => {
                    const isCurrent = currentQuestionIdx === idx;
                    const isAnswered = answers[String(q.id)] !== undefined && answers[String(q.id)] >= 0;
                    const isFlagged = flagged[String(q.id)];

                    let btnClass = "border-border bg-card text-muted-foreground hover:bg-muted";
                    if (isAnswered) {
                      btnClass = "bg-primary text-primary-foreground border-primary font-bold";
                    } else if (isFlagged) {
                      btnClass = "bg-amber-100 dark:bg-amber-950 text-amber-700 border-amber-400 font-bold";
                    }

                    if (isCurrent) {
                      btnClass += " ring-2 ring-primary ring-offset-2";
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentQuestionIdx(idx)}
                        className={`size-8 rounded-lg text-xs flex items-center justify-center transition border cursor-pointer relative ${btnClass}`}
                      >
                        {idx + 1}
                        {isFlagged && (
                          <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-500 border border-background" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t space-y-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-primary" />
                    <span>Answered ({answeredCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-card border" />
                    <span>Unanswered ({questions.length - answeredCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-amber-500" />
                    <span>Flagged for Review ({Object.values(flagged).filter(Boolean).length})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Confirmation Dialog */}
        <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
          <DialogContent
            showCloseButton={false}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            className="w-[95vw] max-w-lg sm:max-w-xl md:max-w-2xl p-4 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-foreground">
                <FileCheck className="size-5 sm:size-6 text-emerald-600 shrink-0" />
                <span>Submit Examination?</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Please verify your progress before final scoring submission. Once submitted, your answers will be locked and graded immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 sm:py-4 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border bg-muted/40 text-center">
                <div className="p-2.5 sm:p-3 rounded-xl bg-background border shadow-xs">
                  <div className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-semibold">Total</div>
                  <div className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">{questions.length}</div>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl bg-background border shadow-xs">
                  <div className="text-[10px] sm:text-[11px] text-emerald-600 uppercase font-semibold">Answered</div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-0.5 sm:mt-1">{answeredCount}</div>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl bg-background border shadow-xs">
                  <div className="text-[10px] sm:text-[11px] text-rose-600 uppercase font-semibold">Unanswered</div>
                  <div className="text-xl sm:text-2xl font-bold text-rose-600 mt-0.5 sm:mt-1">{questions.length - answeredCount}</div>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl bg-background border shadow-xs">
                  <div className="text-[10px] sm:text-[11px] text-amber-600 uppercase font-semibold">Flagged</div>
                  <div className="text-xl sm:text-2xl font-bold text-amber-600 mt-0.5 sm:mt-1">{Object.values(flagged).filter(Boolean).length}</div>
                </div>
              </div>

              {questions.length - answeredCount > 0 && (
                <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs">
                  <AlertCircle className="size-4 sm:size-5 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <div className="font-bold">You have {questions.length - answeredCount} unanswered questions!</div>
                    <div className="mt-0.5 text-amber-700/90 dark:text-amber-300/80 leading-relaxed text-[11px] sm:text-xs">
                      Unanswered questions receive 0 marks. You can return to the examination to answer them, or confirm final submission now.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsSubmitModalOpen(false)} className="w-full sm:w-auto">
                Return to Exam
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
              >
                {submitMutation.isPending ? "Grading Attempt..." : "Confirm & Submit Examination"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN HUB / DASHBOARD VIEW
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                Online CBT Portal
              </Badge>
              {program && (
                <span className="text-xs text-muted-foreground font-mono">
                  {program.code} • {program.title}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Computer-Based Examination (CBT)</h1>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Mandatory clinical competency assessments for doctors enrolled in the skill upgradation fellowship.
              Candidates complete both a <strong>Pre-Test</strong> (baseline evaluation) and an <strong>Exit-Test</strong> (summative mastery certification).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => overviewQuery.refetch()}
              disabled={overviewQuery.isLoading}
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${overviewQuery.isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b pb-2 overflow-x-auto no-scrollbar whitespace-nowrap">
        <Button
          variant={activeTab === "assessments" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("assessments")}
          className="text-xs font-bold shrink-0"
        >
          <Stethoscope className="size-3.5 mr-1.5" />
          Pre-Test & Exit-Test
        </Button>
        <Button
          variant={activeTab === "history" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("history")}
          className="text-xs font-bold shrink-0"
        >
          <History className="size-3.5 mr-1.5" />
          Attempt History ({allAttempts.length})
        </Button>
        {isAdmin && (
          <Button
            variant={activeTab === "admin_matrix" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("admin_matrix")}
            className="text-xs font-bold shrink-0"
          >
            <User className="size-3.5 mr-1.5" />
            Candidate Results Matrix ({adminOverview.length})
          </Button>
        )}
      </div>

      {/* Loading / Error States */}
      {overviewQuery.isLoading && (
        <div className="p-12 text-center text-sm text-muted-foreground">Loading examination profile and status...</div>
      )}

      {overviewQuery.isError && (
        <div className="p-6 text-center text-sm text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
          Failed to load examination status. Please retry.
        </div>
      )}

      {/* TAB 1: PRE-TEST & EXIT-TEST CARDS */}
      {activeTab === "assessments" && !overviewQuery.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Pre-Test */}
          <Card className="flex flex-col justify-between shadow-xs border-primary/20 bg-gradient-to-b from-primary/[0.02] to-background">
            <CardHeader>
              <div className="flex items-center justify-between gap-2 mb-2">
                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 font-bold text-xs">
                  Phase 1: Baseline
                </Badge>
                {!preTestBp?.active ? (
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 font-bold text-xs">
                    <Lock className="size-3 mr-1" />
                    Closed by Admin
                  </Badge>
                ) : preTest?.status === "completed" ? (
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-emerald-600 text-white font-semibold text-xs">
                      <CheckCircle2 className="size-3 mr-1" />
                      Completed ({preTest.latestAttempt?.scorePercentage}%)
                    </Badge>
                    {preTest.retakeAllowed ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-semibold">
                        Retake Authorized
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[10px]">
                        <Lock className="size-2.5 mr-1" />
                        Retake Locked
                      </Badge>
                    )}
                  </div>
                ) : preTest?.status === "in_progress" ? (
                  <Badge className="bg-amber-500 text-white font-semibold text-xs animate-pulse">
                    <Clock className="size-3 mr-1" />
                    In Progress
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Not Attempted
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg font-bold text-foreground">Pre-Training Assessment (Pre-Test)</CardTitle>
              <CardDescription className="text-xs">
                Baseline assessment to identify clinical knowledge gaps across reproductive endocrinology, andrology, and ART.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Admin Exam Control Switch & Duration */}
              {isAdmin && (
                <div className="p-3 rounded-xl border bg-muted/30 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" />
                      <div>
                        <div className="font-semibold text-foreground">Admin Exam Control:</div>
                        <div className={preTestBp?.active ? "text-emerald-600 font-bold text-[11px]" : "text-rose-600 font-bold text-[11px]"}>
                          {preTestBp?.active ? "● Open for candidates" : "○ Disabled / Closed"}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={preTestBp?.active ? "outline" : "default"}
                      disabled={updateExamSettingsMutation.isPending}
                      onClick={() =>
                        updateExamSettingsMutation.mutate({
                          examType: "pre_test",
                          active: !preTestBp?.active,
                        })
                      }
                      className={`h-7 px-3 text-xs font-semibold ${
                        preTestBp?.active
                          ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {preTestBp?.active ? (
                        <>
                          <Lock className="size-3 mr-1" /> Disable Pre-Test
                        </>
                      ) : (
                        <>
                          <Unlock className="size-3 mr-1" /> Enable Pre-Test
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="size-3.5 text-primary" />
                      <span>Exam Duration:</span>
                      <span className="font-bold text-foreground">{preTestBp?.durationMinutes || 20} mins</span>
                      <span className="text-[10px] text-muted-foreground">(Default: 20m)</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px] font-semibold"
                      onClick={() => openDurationDialog("pre_test", preTestBp?.durationMinutes || 20)}
                    >
                      <Timer className="size-3 mr-1 text-primary" />
                      Set Duration
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <RotateCcw className="size-3.5 text-primary" />
                      <span>Cohort Retake Policy:</span>
                      <span className={preTestBp?.allowRetakes ? "font-bold text-amber-600" : "font-bold text-slate-700 dark:text-slate-300"}>
                        {preTestBp?.allowRetakes ? "Retakes Allowed" : "Locked by Default"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={preTestBp?.allowRetakes ? "destructive" : "outline"}
                      className="h-6 px-2 text-[11px] font-semibold"
                      disabled={updateExamSettingsMutation.isPending}
                      onClick={() =>
                        updateExamSettingsMutation.mutate({
                          examType: "pre_test",
                          allowRetakes: !preTestBp?.allowRetakes,
                        })
                      }
                    >
                      {preTestBp?.allowRetakes ? (
                        <>
                          <Lock className="size-3 mr-1" /> Lock Retakes
                        </>
                      ) : (
                        <>
                          <RotateCcw className="size-3 mr-1" /> Allow Retakes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl border bg-muted/40 text-center">
                <div>
                  <div className="text-[11px] text-muted-foreground">Questions</div>
                  <div className="text-base font-bold text-foreground">{preTestBp?.totalQuestions || 50}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Time Limit</div>
                  <div className="text-base font-bold text-foreground">{preTestBp?.durationMinutes || 20}m</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Passing Benchmark</div>
                  <div className="text-base font-bold text-emerald-600">≥ {preTestBp?.passingPercentage || 70}%</div>
                </div>
              </div>

              {/* Latest score banner if completed */}
              {preTest?.latestAttempt && (
                <div className="p-3.5 rounded-xl border bg-card space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Recorded Score:</span>
                    <span className="font-bold text-sm text-foreground">
                      {preTest.latestAttempt.scorePercentage}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span>Correct / Total:</span>
                    <span>
                      {preTest.latestAttempt.correctCount} / {preTest.latestAttempt.totalPossibleMarks || 50}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span>Completed On:</span>
                    <span>
                      {preTest.latestAttempt.completedAt
                        ? new Date(preTest.latestAttempt.completedAt).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-3 border-t">
              <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                {preTest?.status === "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewResultQuery.mutate(preTest.latestAttempt.id)}
                    className="w-full sm:w-auto text-xs"
                  >
                    <BookOpen className="size-3.5 mr-1.5" />
                    Review Rationales
                  </Button>
                )}

                {!preTestBp?.active && !isAdmin ? (
                  <Button disabled size="sm" variant="outline" className="w-full sm:w-auto sm:ml-auto text-xs text-muted-foreground opacity-60">
                    <Lock className="size-3.5 mr-1.5" />
                    Exam Closed
                  </Button>
                ) : preTest?.status === "completed" && !preTest?.retakeAllowed && !isAdmin ? (
                  <Button disabled size="sm" variant="outline" className="w-full sm:w-auto sm:ml-auto text-xs text-muted-foreground opacity-70 cursor-not-allowed">
                    <Lock className="size-3.5 mr-1.5" />
                    Retake Locked (Admin Permission Required)
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={startMutation.isPending}
                    onClick={() => startMutation.mutate("pre_test")}
                    className={`w-full sm:w-auto sm:ml-auto font-semibold text-xs ${
                      preTest?.status === "in_progress"
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : preTest?.status === "completed"
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {preTest?.status === "in_progress"
                      ? "Resume Pre-Test"
                      : preTest?.status === "completed"
                      ? "Retake Pre-Test (Authorized)"
                      : "Start Pre-Test"}
                    {preTest?.status === "completed" ? (
                      <RotateCcw className="size-3.5 ml-1.5" />
                    ) : (
                      <ArrowRight className="size-3.5 ml-1.5" />
                    )}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>

          {/* Card 2: Exit-Test */}
          <Card className="flex flex-col justify-between shadow-xs border-primary/20 bg-gradient-to-b from-primary/[0.02] to-background">
            <CardHeader>
              <div className="flex items-center justify-between gap-2 mb-2">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 font-bold text-xs">
                  Phase 2: Final Exit Exam
                </Badge>
                {!exitTestBp?.active ? (
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 font-bold text-xs">
                    <Lock className="size-3 mr-1" />
                    Closed by Admin
                  </Badge>
                ) : exitTest?.status === "completed" ? (
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-emerald-600 text-white font-semibold text-xs">
                      <Award className="size-3 mr-1" />
                      Certified ({exitTest.latestAttempt?.scorePercentage}%)
                    </Badge>
                    {exitTest.retakeAllowed ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-semibold">
                        Retake Authorized
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[10px]">
                        <Lock className="size-2.5 mr-1" />
                        Retake Locked
                      </Badge>
                    )}
                  </div>
                ) : exitTest?.status === "in_progress" ? (
                  <Badge className="bg-amber-500 text-white font-semibold text-xs animate-pulse">
                    <Clock className="size-3 mr-1" />
                    In Progress
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Not Attempted
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg font-bold text-foreground">Post-Training Exit Examination (Exit-Test)</CardTitle>
              <CardDescription className="text-xs">
                Summative mastery examination required for fellowship completion and issuance of CME certificates.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Admin Exam Control Switch & Duration */}
              {isAdmin && (
                <div className="p-3 rounded-xl border bg-muted/30 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" />
                      <div>
                        <div className="font-semibold text-foreground">Admin Exam Control:</div>
                        <div className={exitTestBp?.active ? "text-emerald-600 font-bold text-[11px]" : "text-rose-600 font-bold text-[11px]"}>
                          {exitTestBp?.active ? "● Open for candidates" : "○ Disabled / Closed"}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={exitTestBp?.active ? "outline" : "default"}
                      disabled={updateExamSettingsMutation.isPending}
                      onClick={() =>
                        updateExamSettingsMutation.mutate({
                          examType: "exit_test",
                          active: !exitTestBp?.active,
                        })
                      }
                      className={`h-7 px-3 text-xs font-semibold ${
                        exitTestBp?.active
                          ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {exitTestBp?.active ? (
                        <>
                          <Lock className="size-3 mr-1" /> Disable Exit-Test
                        </>
                      ) : (
                        <>
                          <Unlock className="size-3 mr-1" /> Enable Exit-Test
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="size-3.5 text-primary" />
                      <span>Exam Duration:</span>
                      <span className="font-bold text-foreground">{exitTestBp?.durationMinutes || 20} mins</span>
                      <span className="text-[10px] text-muted-foreground">(Default: 20m)</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px] font-semibold"
                      onClick={() => openDurationDialog("exit_test", exitTestBp?.durationMinutes || 20)}
                    >
                      <Timer className="size-3 mr-1 text-primary" />
                      Set Duration
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <RotateCcw className="size-3.5 text-primary" />
                      <span>Cohort Retake Policy:</span>
                      <span className={exitTestBp?.allowRetakes ? "font-bold text-amber-600" : "font-bold text-slate-700 dark:text-slate-300"}>
                        {exitTestBp?.allowRetakes ? "Retakes Allowed" : "Locked by Default"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={exitTestBp?.allowRetakes ? "destructive" : "outline"}
                      className="h-6 px-2 text-[11px] font-semibold"
                      disabled={updateExamSettingsMutation.isPending}
                      onClick={() =>
                        updateExamSettingsMutation.mutate({
                          examType: "exit_test",
                          allowRetakes: !exitTestBp?.allowRetakes,
                        })
                      }
                    >
                      {exitTestBp?.allowRetakes ? (
                        <>
                          <Lock className="size-3 mr-1" /> Lock Retakes
                        </>
                      ) : (
                        <>
                          <RotateCcw className="size-3 mr-1" /> Allow Retakes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl border bg-muted/40 text-center">
                <div>
                  <div className="text-[11px] text-muted-foreground">Questions</div>
                  <div className="text-base font-bold text-foreground">{exitTestBp?.totalQuestions || 50}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Time Limit</div>
                  <div className="text-base font-bold text-foreground">{exitTestBp?.durationMinutes || 20}m</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Passing Benchmark</div>
                  <div className="text-base font-bold text-emerald-600">≥ {exitTestBp?.passingPercentage || 70}%</div>
                </div>
              </div>

              {/* Latest score banner if completed */}
              {exitTest?.latestAttempt && (
                <div className="p-3.5 rounded-xl border bg-card space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Recorded Score:</span>
                    <span className="font-bold text-sm text-foreground">
                      {exitTest.latestAttempt.scorePercentage}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span>Correct / Total:</span>
                    <span>
                      {exitTest.latestAttempt.correctCount} / {exitTest.latestAttempt.totalPossibleMarks || 50}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span>Completed On:</span>
                    <span>
                      {exitTest.latestAttempt.completedAt
                        ? new Date(exitTest.latestAttempt.completedAt).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-3 border-t">
              <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                {exitTest?.status === "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewResultQuery.mutate(exitTest.latestAttempt.id)}
                    className="w-full sm:w-auto text-xs"
                  >
                    <BookOpen className="size-3.5 mr-1.5" />
                    Review Rationales
                  </Button>
                )}

                {!exitTestBp?.active && !isAdmin ? (
                  <Button disabled size="sm" variant="outline" className="w-full sm:w-auto sm:ml-auto text-xs text-muted-foreground opacity-60">
                    <Lock className="size-3.5 mr-1.5" />
                    Exam Closed
                  </Button>
                ) : exitTest?.status === "completed" && !exitTest?.retakeAllowed && !isAdmin ? (
                  <Button disabled size="sm" variant="outline" className="w-full sm:w-auto sm:ml-auto text-xs text-muted-foreground opacity-70 cursor-not-allowed">
                    <Lock className="size-3.5 mr-1.5" />
                    Retake Locked (Admin Permission Required)
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={startMutation.isPending}
                    onClick={() => startMutation.mutate("exit_test")}
                    className={`w-full sm:w-auto sm:ml-auto font-semibold text-xs ${
                      exitTest?.status === "in_progress"
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : exitTest?.status === "completed"
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {exitTest?.status === "in_progress"
                      ? "Resume Exit-Test"
                      : exitTest?.status === "completed"
                      ? "Retake Exit-Test (Authorized)"
                      : "Start Exit-Test"}
                    {exitTest?.status === "completed" ? (
                      <RotateCcw className="size-3.5 ml-1.5" />
                    ) : (
                      <ArrowRight className="size-3.5 ml-1.5" />
                    )}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* TAB 2: ATTEMPT HISTORY */}
      {activeTab === "history" && (
        <Card className="border rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">Your Examination History</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Complete audit trail of all Pre-Test and Exit-Test sessions completed.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono text-xs shrink-0">
                {allAttempts.length} {allAttempts.length === 1 ? "Attempt" : "Attempts"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {allAttempts.length === 0 ? (
              <div className="text-center py-10 px-4 border rounded-xl bg-muted/10 space-y-2">
                <History className="size-8 text-muted-foreground/40 mx-auto" />
                <div className="text-sm font-semibold text-foreground">No attempts recorded yet</div>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  You have not completed any Pre-Test or Exit-Test sessions yet. Take an assessment from the Pre-Test & Exit-Test tab to see your performance history.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("assessments")}
                  className="mt-2 text-xs font-semibold"
                >
                  <Stethoscope className="size-3.5 mr-1 text-primary" />
                  <span>Go to Assessments</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {/* Mobile & Desktop Performance KPI Strip */}
                {(() => {
                  const completedPre = allAttempts.filter((a: any) => a.examType === "pre_test" && (a.status === "completed" || a.status === "timed_out"));
                  const completedExit = allAttempts.filter((a: any) => a.examType === "exit_test" && (a.status === "completed" || a.status === "timed_out"));
                  const bestPre = completedPre.length > 0 ? Math.max(...completedPre.map((a: any) => Number(a.scorePercentage) || 0)) : null;
                  const bestExit = completedExit.length > 0 ? Math.max(...completedExit.map((a: any) => Number(a.scorePercentage) || 0)) : null;

                  return (
                    <div className="grid grid-cols-3 gap-2 p-2.5 sm:p-3 rounded-xl bg-muted/30 border text-center">
                      <div className="p-2 sm:p-2.5 rounded-lg bg-background border shadow-2xs">
                        <div className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-semibold">Total Attempts</div>
                        <div className="text-base sm:text-xl font-bold text-foreground mt-0.5">{allAttempts.length}</div>
                      </div>
                      <div className="p-2 sm:p-2.5 rounded-lg bg-background border shadow-2xs">
                        <div className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-semibold truncate">Pre-Test Best</div>
                        <div className="text-base sm:text-xl font-bold text-primary mt-0.5">
                          {bestPre !== null ? `${bestPre}%` : "—"}
                        </div>
                      </div>
                      <div className="p-2 sm:p-2.5 rounded-lg bg-background border shadow-2xs">
                        <div className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-semibold truncate">Exit-Test Best</div>
                        <div className="text-base sm:text-xl font-bold text-emerald-600 mt-0.5">
                          {bestExit !== null ? `${bestExit}%` : "—"}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Individual Attempt Cards */}
                <div className="divide-y border rounded-xl overflow-hidden bg-card">
                  {allAttempts.map((att: any) => (
                    <div
                      key={att.id}
                      className="p-3.5 sm:p-4 hover:bg-muted/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Left: Badges, Attempt ID, Timestamps */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] sm:text-xs font-semibold ${
                              att.examType === "exit_test"
                                ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800"
                                : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800"
                            }`}
                          >
                            {att.examType === "pre_test" ? "Pre-Test" : "Exit-Test"}
                          </Badge>

                          <Badge
                            className={`text-[10px] px-2 py-0 font-bold ${
                              att.passed
                                ? "bg-emerald-600 text-white"
                                : att.status === "in_progress"
                                ? "bg-amber-500 text-white"
                                : "bg-rose-600 text-white"
                            }`}
                          >
                            {att.passed ? "Passed" : att.status === "in_progress" ? "In Progress" : "Needs Review"}
                          </Badge>

                          <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[170px] sm:max-w-none">
                            {att.attemptNo}
                          </span>
                        </div>

                        {/* Dates & Duration with small icons */}
                        <div className="text-[11px] sm:text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3 text-muted-foreground/70 shrink-0" />
                            <span>Started: {formatExamDateTime(att.startedAt)}</span>
                          </span>
                          {att.completedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3 text-muted-foreground/70 shrink-0" />
                              <span>Finished: {formatExamDateTime(att.completedAt)}</span>
                            </span>
                          )}
                          {att.timeSpentSeconds > 0 && (
                            <span className="flex items-center gap-1">
                              <Timer className="size-3 text-muted-foreground/70 shrink-0" />
                              <span>Duration: {formatDuration(att.timeSpentSeconds)}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Score breakdown and Action Button */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-dashed border-border/80 w-full sm:w-auto">
                        <div className="text-left sm:text-right">
                          {att.status === "in_progress" ? (
                            <div>
                              <div className="text-xs font-bold text-amber-600 dark:text-amber-400">In Progress</div>
                              <div className="text-[10px] text-muted-foreground">Session active</div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-baseline gap-1 sm:justify-end">
                                <span className={`text-base sm:text-lg font-extrabold ${att.passed ? "text-emerald-600" : "text-rose-600"}`}>
                                  {att.scorePercentage}%
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  ({att.correctCount}/{att.totalPossibleMarks || 20})
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {att.passed ? "Passed Benchmark" : "Below 70% threshold"}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        {att.status === "completed" || att.status === "timed_out" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewResultQuery.mutate(att.id)}
                            disabled={viewResultQuery.isPending}
                            className="h-8 px-3 text-xs font-semibold shrink-0"
                          >
                            <FileCheck className="size-3.5 mr-1 text-primary" />
                            <span>Review</span>
                          </Button>
                        ) : att.status === "in_progress" ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => startMutation.mutate(att.examType)}
                            disabled={startMutation.isPending}
                            className="h-8 px-3 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                          >
                            <RotateCcw className="size-3.5 mr-1" />
                            <span>Resume</span>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: ADMIN RESULTS MATRIX */}
      {isAdmin && activeTab === "admin_matrix" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Candidate Pre-Test vs Exit-Test Matrix</CardTitle>
            <CardDescription className="text-xs">
              Live comparison of baseline (Pre-Test) and final mastery (Exit-Test) scores for all enrolled doctors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {adminOverview.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No enrolled candidates found.</p>
            ) : (
              <div className="space-y-2">
                <div className="sm:hidden text-[11px] text-muted-foreground flex items-center gap-1">
                  <span>👉 Swipe table horizontally to view scores & retake controls</span>
                </div>
                <div className="border rounded-xl overflow-x-auto">
                  <table className="w-full text-xs text-left min-w-[680px]">
                    <thead className="bg-muted/50 border-b font-bold text-muted-foreground uppercase whitespace-nowrap">
                      <tr>
                        <th className="p-3">Candidate ID</th>
                        <th className="p-3">Doctor Name</th>
                        <th className="p-3">Email / Mobile</th>
                        <th className="p-3 text-center">Pre-Test Baseline</th>
                        <th className="p-3 text-center">Exit-Test Final</th>
                        <th className="p-3 text-center">Improvement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {adminOverview.map((cand: any) => {
                        const preScore = cand.preTest?.score;
                        const exitScore = cand.exitTest?.score;
                        const diff =
                          preScore !== undefined && exitScore !== undefined
                            ? (exitScore - preScore).toFixed(1)
                            : null;

                        return (
                          <tr key={cand.id} className="hover:bg-muted/20">
                            <td className="p-3 font-mono font-bold text-primary whitespace-nowrap">{cand.candidateId}</td>
                            <td className="p-3 font-semibold text-foreground whitespace-nowrap">{cand.fullName}</td>
                            <td className="p-3 text-muted-foreground whitespace-nowrap">
                              <div>{cand.email}</div>
                              <div className="text-[11px]">{cand.mobile || "N/A"}</div>
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              {cand.preTest ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="font-bold text-foreground">
                                    {cand.preTest.score}%
                                  </span>
                                  {cand.preTestRetakeAllowed ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-5 px-1.5 text-[10px] font-semibold text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100"
                                      disabled={allowCandidateRetakeMutation.isPending}
                                      onClick={() =>
                                        allowCandidateRetakeMutation.mutate({
                                          enrollmentId: cand.enrollmentId,
                                          examType: "pre_test",
                                          allowed: false,
                                        })
                                      }
                                      title="Retake permission granted. Click to revoke."
                                    >
                                      Retake Authorized ✕
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/10"
                                      disabled={allowCandidateRetakeMutation.isPending}
                                      onClick={() =>
                                        allowCandidateRetakeMutation.mutate({
                                          enrollmentId: cand.enrollmentId,
                                          examType: "pre_test",
                                          allowed: true,
                                        })
                                      }
                                      title="Authorize candidate to retake Pre-Test"
                                    >
                                      <RotateCcw className="size-2.5 mr-1" />
                                      Allow Retake
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">Not Taken</span>
                              )}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              {cand.exitTest ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="font-bold text-emerald-600">
                                    {cand.exitTest.score}%
                                  </span>
                                  {cand.exitTestRetakeAllowed ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-5 px-1.5 text-[10px] font-semibold text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100"
                                      disabled={allowCandidateRetakeMutation.isPending}
                                      onClick={() =>
                                        allowCandidateRetakeMutation.mutate({
                                          enrollmentId: cand.enrollmentId,
                                          examType: "exit_test",
                                          allowed: false,
                                        })
                                      }
                                      title="Retake permission granted. Click to revoke."
                                    >
                                      Retake Authorized ✕
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/10"
                                      disabled={allowCandidateRetakeMutation.isPending}
                                      onClick={() =>
                                        allowCandidateRetakeMutation.mutate({
                                          enrollmentId: cand.enrollmentId,
                                          examType: "exit_test",
                                          allowed: true,
                                        })
                                      }
                                      title="Authorize candidate to retake Exit-Test"
                                    >
                                      <RotateCcw className="size-2.5 mr-1" />
                                      Allow Retake
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">Not Taken</span>
                              )}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              {diff !== null ? (
                                <Badge
                                  variant="outline"
                                  className={
                                    parseFloat(diff) >= 0
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-rose-50 text-rose-700 border-rose-200"
                                  }
                                >
                                  {parseFloat(diff) >= 0 ? `+${diff}%` : `${diff}%`}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* RESULT & RATIONALE REVIEW MODAL */}
      <Dialog open={Boolean(reviewResult)} onOpenChange={(open) => !open && setReviewResult(null)}>
        <DialogContent
          showCloseButton={false}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="w-[96vw] max-w-5xl lg:max-w-6xl xl:max-w-7xl h-[94vh] max-h-[94vh] flex flex-col p-0 overflow-hidden rounded-2xl border shadow-2xl"
        >
          {reviewResult && (() => {
            const allReviewQuestions = reviewResult.review || [];
            const filteredQuestions = allReviewQuestions.filter((q: any) => {
              if (reviewFilter === "correct") return q.isCorrect;
              if (reviewFilter === "incorrect") return !q.isCorrect && q.selectedOptionIndex !== -1;
              if (reviewFilter === "unanswered") return q.selectedOptionIndex === -1;
              return true;
            });

            return (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Header: Ultra-slim on Mobile (~40px), Full on Desktop */}
                <div className="border-b bg-card/95 backdrop-blur-md shrink-0">
                  {/* Mobile Top Bar */}
                  <div className="sm:hidden px-3 py-2 flex items-center justify-between gap-2 border-b">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Badge variant="outline" className="text-[10px] font-semibold shrink-0">
                        {reviewResult.examType === "pre_test" ? "Pre-Test" : "Exit-Test"}
                      </Badge>
                      <span className="font-bold text-xs text-foreground truncate">
                        {reviewResult.scorePercentage}%
                      </span>
                      <Badge
                        className={`text-[9px] px-1.5 py-0 font-bold shrink-0 ${
                          reviewResult.passed
                            ? "bg-emerald-600 text-white"
                            : "bg-rose-600 text-white"
                        }`}
                      >
                        {reviewResult.passed ? "Passed" : "Review"}
                      </Badge>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReviewResult(null)}
                      className="h-7 px-2 text-xs font-semibold text-red-700 hover:text-foreground shrink-0"
                    >
                      Close
                    </Button>
                  </div>

                  {/* Desktop Header (>= sm) */}
                  <div className="hidden sm:block p-4 lg:p-6 pb-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 pr-8">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs font-semibold">
                            {reviewResult.examType === "pre_test" ? "Pre-Test Scorecard" : "Exit-Test Scorecard"}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">{reviewResult.attemptNo}</span>
                          <Badge
                            className={`text-xs px-2.5 py-0.5 font-bold ${
                              reviewResult.passed
                                ? "bg-emerald-600 text-white"
                                : "bg-rose-600 text-white"
                            }`}
                          >
                            {reviewResult.passed ? "Passed Benchmark" : "Needs Review"}
                          </Badge>
                        </div>
                        <DialogTitle className="text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">
                          {reviewResult.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground line-clamp-1">
                          Comprehensive clinical examination performance report and answer rationales.
                        </DialogDescription>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewResult(null)}
                        className="shrink-0 text-xs font-semibold"
                      >
                        Close
                      </Button>
                    </div>

                    {/* Desktop 5-Card Metrics Strip */}
                    <div className="grid grid-cols-5 gap-2 text-center pt-1">
                      <div className="p-2.5 rounded-xl border bg-primary/5 border-primary/20">
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">Final Score</div>
                        <div className="text-2xl font-extrabold text-primary mt-0.5">{reviewResult.scorePercentage}%</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Benchmark ≥ 70%</div>
                      </div>
                      <div className="p-2.5 rounded-xl border bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900">
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-semibold">Correct</div>
                        <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">{reviewResult.correctCount}</div>
                        <div className="text-[10px] text-emerald-600 mt-0.5">+{reviewResult.correctCount} marks</div>
                      </div>
                      <div className="p-2.5 rounded-xl border bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900">
                        <div className="text-[10px] text-rose-700 dark:text-rose-300 uppercase font-semibold">Incorrect</div>
                        <div className="text-2xl font-extrabold text-rose-600 mt-0.5">{reviewResult.incorrectCount}</div>
                        <div className="text-[10px] text-rose-600 mt-0.5">0 marks</div>
                      </div>
                      <div className="p-2.5 rounded-xl border bg-muted/40">
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">Unanswered</div>
                        <div className="text-2xl font-extrabold text-muted-foreground mt-0.5">{reviewResult.unansweredCount}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Skipped</div>
                      </div>
                      <div className="p-2.5 rounded-xl border bg-muted/40">
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">Time Spent</div>
                        <div className="text-xl font-bold text-foreground mt-0.5">
                          {Math.floor(reviewResult.timeSpentSeconds / 60)}m {reviewResult.timeSpentSeconds % 60}s
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">of limit</div>
                      </div>
                    </div>
                  </div>

                  {/* Filter Selector Bar (Slim & Pinned on both mobile & desktop) */}
                  <div className="px-3 sm:px-6 py-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 sm:gap-1.5 bg-muted/60 p-0.5 sm:p-1 rounded-lg border overflow-x-auto no-scrollbar whitespace-nowrap max-w-full">
                      <Button
                        variant={reviewFilter === "all" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setReviewFilter("all")}
                        className="h-6 sm:h-7 text-[11px] sm:text-xs font-semibold px-2 sm:px-3 shrink-0"
                      >
                        All ({allReviewQuestions.length})
                      </Button>
                      <Button
                        variant={reviewFilter === "correct" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setReviewFilter("correct")}
                        className={`h-6 sm:h-7 text-[11px] sm:text-xs font-semibold px-2 sm:px-3 shrink-0 ${
                          reviewFilter === "correct" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        Correct ({reviewResult.correctCount})
                      </Button>
                      <Button
                        variant={reviewFilter === "incorrect" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setReviewFilter("incorrect")}
                        className={`h-6 sm:h-7 text-[11px] sm:text-xs font-semibold px-2 sm:px-3 shrink-0 ${
                          reviewFilter === "incorrect" ? "bg-rose-600 text-white hover:bg-rose-700" : "text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        Incorrect ({reviewResult.incorrectCount})
                      </Button>
                      <Button
                        variant={reviewFilter === "unanswered" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setReviewFilter("unanswered")}
                        className="h-6 sm:h-7 text-[11px] sm:text-xs font-semibold px-2 sm:px-3 shrink-0 text-muted-foreground"
                      >
                        Unanswered ({reviewResult.unansweredCount})
                      </Button>
                    </div>

                    <span className="text-[11px] sm:text-xs text-muted-foreground shrink-0 hidden xs:inline">
                      <strong>{filteredQuestions.length}</strong> / {allReviewQuestions.length}
                    </span>
                  </div>
                </div>

                {/* Scrollable Questions Area */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
                  {/* Mobile-Only Summary Card (Inside scroll area so it scrolls away naturally, freeing the entire screen!) */}
                  <div className="sm:hidden space-y-2 p-3 rounded-xl border bg-muted/30">
                    <div className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>Performance Breakdown</span>
                      <span className="text-[11px] text-muted-foreground font-mono">{reviewResult.attemptNo}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-background border">
                        <div className="text-[10px] text-muted-foreground uppercase">Score</div>
                        <div className="text-base font-extrabold text-primary">{reviewResult.scorePercentage}%</div>
                      </div>
                      <div className="p-2 rounded-lg bg-background border">
                        <div className="text-[10px] text-emerald-600 uppercase">Correct</div>
                        <div className="text-base font-extrabold text-emerald-600">{reviewResult.correctCount} / {allReviewQuestions.length}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-background border">
                        <div className="text-[10px] text-rose-600 uppercase">Incorrect</div>
                        <div className="text-base font-extrabold text-rose-600">{reviewResult.incorrectCount}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-background border">
                        <div className="text-[10px] text-muted-foreground uppercase">Time Spent</div>
                        <div className="text-xs font-bold text-foreground mt-0.5">
                          {Math.floor(reviewResult.timeSpentSeconds / 60)}m {reviewResult.timeSpentSeconds % 60}s
                        </div>
                      </div>
                    </div>
                  </div>

                  {filteredQuestions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground border rounded-xl">
                      No questions match the selected filter.
                    </div>
                  ) : (
                    filteredQuestions.map((q: any) => {
                      const originalIdx = allReviewQuestions.findIndex((item: any) => item.id === q.id);
                      return (
                        <div
                          key={q.id}
                          className={`p-3.5 sm:p-5 rounded-2xl border space-y-3 sm:space-y-3.5 transition-all ${
                            q.isCorrect
                              ? "bg-emerald-50/30 border-emerald-200 dark:bg-emerald-950/15 dark:border-emerald-900"
                              : q.selectedOptionIndex === -1
                              ? "bg-muted/30 border-border"
                              : "bg-rose-50/30 border-rose-200 dark:bg-rose-950/15 dark:border-rose-900"
                          }`}
                        >
                          {/* Header of Item */}
                          <div className="flex items-center justify-between gap-2 border-b pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-foreground">
                                Question {originalIdx >= 0 ? originalIdx + 1 : q.id}
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {q.code}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                q.isCorrect
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold"
                                  : q.selectedOptionIndex === -1
                                  ? "bg-muted text-muted-foreground text-xs"
                                  : "bg-rose-100 text-rose-800 border-rose-300 text-xs font-bold"
                              }
                            >
                              {q.isCorrect ? "Correct (+1)" : q.selectedOptionIndex === -1 ? "Unanswered (0)" : "Incorrect (0)"}
                            </Badge>
                          </div>

                          {/* Clinical Vignette */}
                          {q.clinicalVignette && (
                            <div className="p-3 sm:p-3.5 rounded-xl bg-background/80 border text-xs leading-relaxed text-foreground">
                              <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <Stethoscope className="size-3" />
                                Clinical Scenario
                              </div>
                              {q.clinicalVignette}
                            </div>
                          )}

                          {/* Options grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                            <div
                              className={`p-3 rounded-xl border text-xs ${
                                q.isCorrect
                                  ? "bg-emerald-50/60 border-emerald-300 dark:bg-emerald-950/40"
                                  : q.selectedOptionIndex === -1
                                  ? "bg-muted/40 border-border text-muted-foreground"
                                  : "bg-rose-50/60 border-rose-300 dark:bg-rose-950/40"
                              }`}
                            >
                              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                Your Selection:
                              </div>
                              <div className={`font-semibold text-sm ${q.isCorrect ? "text-emerald-700 dark:text-emerald-300" : q.selectedOptionIndex === -1 ? "text-muted-foreground italic" : "text-rose-700 dark:text-rose-300"}`}>
                                {q.selectedOptionIndex >= 0
                                  ? `${String.fromCharCode(65 + q.selectedOptionIndex)}. ${stripOptionPrefix(q.options[q.selectedOptionIndex])}`
                                  : "None Selected (Unanswered)"}
                              </div>
                            </div>

                            <div className="p-3 rounded-xl border bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/30 text-xs">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                                Correct Answer:
                              </div>
                              <div className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">
                                {String.fromCharCode(65 + q.correctOptionIndex)}. {stripOptionPrefix(q.options[q.correctOptionIndex])}
                              </div>
                            </div>
                          </div>

                          {/* All options expansion preview */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                            {q.options?.map((opt: string, optIdx: number) => {
                              const isCorrectKey = optIdx === q.correctOptionIndex;
                              const isCandidateChoice = optIdx === q.selectedOptionIndex;
                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2.5 rounded-lg border text-[11px] flex items-start gap-2 ${
                                    isCorrectKey
                                      ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/40 font-semibold text-emerald-800 dark:text-emerald-200"
                                      : isCandidateChoice
                                      ? "border-rose-400 bg-rose-50/40 dark:bg-rose-950/40 font-semibold text-rose-800 dark:text-rose-200"
                                      : "border-border/60 bg-background/50 text-muted-foreground"
                                  }`}
                                >
                                  <span className="font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                                  <span className="leading-snug">{stripOptionPrefix(opt)}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Clinical Rationale & Explanation */}
                          {q.clinicalExplanation && (
                            <div className="p-3.5 sm:p-4 rounded-xl bg-background border text-xs leading-relaxed space-y-1">
                              <div className="font-bold text-foreground text-xs flex items-center gap-1.5 text-primary">
                                <BookOpen className="size-3.5" />
                                Clinical Rationale & Discussion:
                              </div>
                              <p className="text-muted-foreground leading-relaxed pt-0.5">
                                {q.clinicalExplanation}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Mobile Bottom Close Button at end of scroll */}
                  <div className="sm:hidden pt-3 pb-6">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setReviewResult(null)}
                      className="w-full font-semibold text-xs h-10"
                    >
                      Close Scorecard
                    </Button>
                  </div>
                </div>

                {/* Fixed Bottom Footer (Desktop only) */}
                <div className="hidden sm:flex p-3 sm:p-4 border-t bg-card/95 backdrop-blur-md items-center justify-between gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground font-mono">
                    Attempt ID: {reviewResult.attemptNo} • Total: {allReviewQuestions.length} Questions
                  </span>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setReviewResult(null)}
                    className="w-full sm:w-auto font-semibold text-xs px-6"
                  >
                    Close Scorecard
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Admin Set Duration Modal */}
      <Dialog open={isDurationModalOpen} onOpenChange={setIsDurationModalOpen}>
        <DialogContent
          showCloseButton={false}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="w-[95vw] max-w-md p-4 sm:p-6"
        >
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                Admin Exam Control
              </Badge>
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Clock className="size-4 sm:size-5 text-primary" />
              Set Duration — {durationExamType === "exit_test" ? "Exit-Test Exam" : "Pre-Test Assessment"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure the total duration permitted for candidates completing this assessment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quick Presets */}
            <div>
              <div className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
                <span>Quick Preset Durations:</span>
                <span className="text-[11px] text-muted-foreground font-normal">Default: 20 mins</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: "10 mins", mins: 10 },
                  { label: "15 mins", mins: 15 },
                  { label: "20m (Default)", mins: 20 },
                  { label: "30 mins", mins: 30 },
                  { label: "45 mins", mins: 45 },
                  { label: "60 mins", mins: 60 },
                ].map((preset) => (
                  <Button
                    key={preset.mins}
                    type="button"
                    size="sm"
                    variant={targetDurationMinutes === preset.mins ? "default" : "outline"}
                    className={`h-8 text-xs font-medium ${
                      targetDurationMinutes === preset.mins
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setTargetDurationMinutes(preset.mins)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Minutes Input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Custom Duration (Minutes):</span>
                <span className="text-[11px] text-muted-foreground font-mono">1 – 360 mins</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={360}
                  value={targetDurationMinutes}
                  onChange={(e) => setTargetDurationMinutes(Math.max(1, Math.min(360, Number(e.target.value) || 1)))}
                  className="font-mono text-sm font-semibold"
                />
                <span className="text-xs font-semibold text-muted-foreground shrink-0">minutes</span>
              </div>
            </div>

            {/* Live Calculation Metric Card */}
            <div className="p-3 rounded-xl bg-muted/40 border text-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Total Assessment Questions:</span>
                <span className="font-semibold text-foreground">50 MCQs</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Calculated Time per Question:</span>
                <span className="font-bold text-primary">
                  ≈ {Math.round((targetDurationMinutes * 60) / 50)} seconds / question
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/40 text-[11px]">
                <span>Applies to:</span>
                <span className="text-foreground">All upcoming examination attempts</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDurationModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={updateExamSettingsMutation.isPending || targetDurationMinutes < 1}
              onClick={() => {
                updateExamSettingsMutation.mutate({
                  examType: durationExamType,
                  durationMinutes: targetDurationMinutes,
                });
                setIsDurationModalOpen(false);
              }}
              className="w-full sm:w-auto bg-primary text-primary-foreground font-semibold"
            >
              {updateExamSettingsMutation.isPending ? "Saving..." : `Set Duration to ${targetDurationMinutes}m`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
