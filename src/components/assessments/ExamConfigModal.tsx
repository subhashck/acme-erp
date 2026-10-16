import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  HelpCircle,
  FileQuestion,
} from "lucide-react";
import { Button } from "@/ui/button";
import { DEFAULT_EXAM_MIX, difficultyCounts } from "@/lib/exam-question-mix";

interface ExamConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
}

export function ExamConfigModal({ isOpen, onClose, embedded = false }: ExamConfigModalProps) {
  const queryClient = useQueryClient();

  const { data: config, isLoading, isError, refetch } = useQuery({
    queryKey: ["skill-assessment-exam-config"],
    queryFn: async () => {
      const res = await fetch("/api/skill-assessment/exam/config");
      if (!res.ok) throw new Error("Failed to load exam configuration");
      return res.json();
    },
    enabled: isOpen,
  });

  const [title, setTitle] = useState("Clinical Staff NABH Theoretical Examination");
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [totalTimeMinutes, setTotalTimeMinutes] = useState(20);
  const [perQuestionSeconds, setPerQuestionSeconds] = useState(60);
  const [passPercentage, setPassPercentage] = useState(60);
  const [mix, setMix] = useState(DEFAULT_EXAM_MIX);
  const difficultyTotal = mix.basicPercentage + mix.mediumPercentage + mix.advancedPercentage;
  const mixValid = Object.values(mix).every(v => Number.isInteger(v) && v >= 0 && v <= 100) && difficultyTotal === 100;
  const preview = mixValid && Number.isInteger(totalQuestions) && totalQuestions >= 5 && totalQuestions <= 100
    ? difficultyCounts(totalQuestions, mix) : null;

  useEffect(() => {
    if (config) {
      if (config.title) setTitle(config.title);
      if (config.totalQuestions) setTotalQuestions(config.totalQuestions);
      if (config.totalTimeSeconds) setTotalTimeMinutes(Math.round(config.totalTimeSeconds / 60));
      if (config.perQuestionTimeSeconds) setPerQuestionSeconds(config.perQuestionTimeSeconds);
      if (config.passPercentage) setPassPercentage(Number(config.passPercentage) || 60);
      setMix({
        basicPercentage: config.basicPercentage ?? DEFAULT_EXAM_MIX.basicPercentage,
        mediumPercentage: config.mediumPercentage ?? DEFAULT_EXAM_MIX.mediumPercentage,
        advancedPercentage: config.advancedPercentage ?? DEFAULT_EXAM_MIX.advancedPercentage,
        departmentPercentage: config.departmentPercentage ?? DEFAULT_EXAM_MIX.departmentPercentage,
      });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/skill-assessment/exam/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update exam configuration");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Exam settings and question mix updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["skill-assessment-exam-config"] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save configuration");
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mixValid || isLoading || isError) {
      toast.error("Enter percentages from 0 to 100. Difficulty percentages must total 100%.");
      return;
    }
    if (totalQuestions < 5) {
      toast.error("Total questions must be at least 5 (recommended 20)");
      return;
    }
    if (totalTimeMinutes < 2) {
      toast.error("Total exam duration must be at least 2 minutes");
      return;
    }
    if (perQuestionSeconds < 15) {
      toast.error("Per-question timer must be at least 15 seconds");
      return;
    }

    updateMutation.mutate({
      title,
      totalQuestions: Number(totalQuestions),
      totalTimeSeconds: Number(totalTimeMinutes) * 60,
      perQuestionTimeSeconds: Number(perQuestionSeconds),
      passPercentage: Number(passPercentage),
      ...mix,
    });
  };

  return (
    <div className={embedded ? "w-full" : "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"}>
      <div className={embedded ? "bg-card border border-border w-full rounded-2xl overflow-hidden" : "bg-card border border-border w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200"}>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <Sliders size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Configure Theoretical CBT Exam</h3>
              <p className="text-[11px] text-muted-foreground">
                Set question mix, counts, duration, and timers
              </p>
            </div>
          </div>
          {!embedded && <button
            onClick={onClose}
            className="size-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {isError && <div role="alert" className="rounded-lg border border-destructive p-3 text-destructive">
            Exam settings could not be loaded. <button type="button" className="underline" onClick={() => refetch()}>Retry</button>
          </div>}
          {isLoading && <p role="status">Loading exam settings...</p>}
          <div>
            <label className="font-semibold block mb-1 text-foreground">Exam Title / Header</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold block mb-1 text-foreground">
                Questions per Exam
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs focus:ring-1 focus:ring-primary font-mono"
                required
              />
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                Randomly pulled from question bank (Standard: 20)
              </span>
            </div>

            <div>
              <label className="font-semibold block mb-1 text-foreground">
                Passing Benchmark (%)
              </label>
              <input
                type="number"
                min="30"
                max="100"
                value={passPercentage}
                onChange={(e) => setPassPercentage(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs focus:ring-1 focus:ring-primary font-mono"
                required
              />
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                Standard NABH benchmark: 60%
              </span>
            </div>
          </div>

          <fieldset disabled={isLoading || isError || updateMutation.isPending} className="p-3.5 rounded-xl border border-border space-y-3 disabled:opacity-60">
            <legend className="px-1 font-semibold">Question mix</legend>
            <p className="text-muted-foreground">Difficulty percentages must add up to 100%.</p>
            <div className="grid grid-cols-3 gap-3">
              {([['basicPercentage', 'Basic'], ['mediumPercentage', 'Medium'], ['advancedPercentage', 'Advanced']] as const).map(([key, label]) => (
                <div key={key}>
                  <label htmlFor={`exam-${key}`} className="block font-medium mb-1">{label} (%)</label>
                  <input id={`exam-${key}`} type="number" min={0} max={100} step={1} required value={Number.isNaN(mix[key]) ? "" : mix[key]}
                    onChange={e => setMix(previous => ({ ...previous, [key]: e.target.valueAsNumber }))}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background font-mono" />
                </div>
              ))}
            </div>
            {!mixValid && <p role="alert" className="text-destructive">Enter whole percentages from 0 to 100. Difficulty total: {Number.isFinite(difficultyTotal) ? difficultyTotal : '—'}%.</p>}
            {preview && <p className="text-muted-foreground">For {totalQuestions} questions: {preview[0]} basic, {preview[1]} medium, {preview[2]} advanced.</p>}
            <div>
              <label htmlFor="exam-department-percentage" className="block font-medium mb-1">Candidate’s department questions (%)</label>
              <input id="exam-department-percentage" type="number" min={0} max={100} step={1} required value={Number.isNaN(mix.departmentPercentage) ? "" : mix.departmentPercentage}
                onChange={e => setMix(previous => ({ ...previous, departmentPercentage: e.target.valueAsNumber }))}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background font-mono" />
              {mixValid && <p className="mt-1 text-muted-foreground">Target: {Math.round(totalQuestions * mix.departmentPercentage / 100)} from the candidate’s department; the remainder prefers hospital-wide questions.</p>}
            </div>
            <p className="text-muted-foreground">Applies to new exams. Counts are rounded to whole questions. If the bank cannot meet both targets, difficulty takes priority and available questions fill shortages without repeats.</p>
          </fieldset>

          <div className="p-3.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/40 space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Clock size={14} className="text-primary" />
              Timing Parameters
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium block mb-1 text-muted-foreground">
                  Total Exam Time (Minutes)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="2"
                    max="180"
                    value={totalTimeMinutes}
                    onChange={(e) => setTotalTimeMinutes(Number(e.target.value))}
                    className="w-full h-9 px-3 pr-10 rounded-lg border border-border bg-background text-xs focus:ring-1 focus:ring-primary font-mono"
                    required
                  />
                  <span className="absolute right-2.5 top-2 text-[11px] text-muted-foreground font-medium">
                    mins
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Overall exam countdown timer
                </span>
              </div>

              <div>
                <label className="font-medium block mb-1 text-muted-foreground">
                  Per-Question Timer (Seconds)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="15"
                    max="300"
                    value={perQuestionSeconds}
                    onChange={(e) => setPerQuestionSeconds(Number(e.target.value))}
                    className="w-full h-9 px-3 pr-10 rounded-lg border border-border bg-background text-xs focus:ring-1 focus:ring-primary font-mono"
                    required
                  />
                  <span className="absolute right-2.5 top-2 text-[11px] text-muted-foreground font-medium">
                    secs
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Active timer progress per question
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/30 text-[11px] text-teal-800 dark:text-teal-300 flex items-start gap-2">
            <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
            <div>
              <strong>Score Synchronization:</strong> Completed CBT results within the assessment period are averaged for self-assessment theory, separately for each objective's domain on a 0-5 scale.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            {!embedded && <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>}
            <Button
              type="submit"
              size="sm"
              disabled={updateMutation.isPending || isLoading || isError || !mixValid}
              className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
            >
              <Save size={13} />
              {updateMutation.isPending ? "Saving..." : "Save Exam Settings"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
