import React, { useState, useId } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  GraduationCap,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
  Sparkles,
  HelpCircle,
  FileQuestion,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
} from "lucide-react";
import { ModuleLayout } from "../ModuleLayout";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { cn } from "@/utils/cn";
import { assessmentJson, assessmentPermissionsQuery } from "./AssessmentsHome";
import { canPrintCbtCertificate } from "@/lib/cbt-certificate";
import { fmtDate } from "./SkillAssessmentsPage";
import { exportCbtResultsToExcel } from "@/lib/cbt-results-export";
import { AssignCrossDeptTrackModal } from "./AssignCrossDeptTrackModal";

interface AttemptRecord {
  id: number;
  attemptNo: string;
  assessmentId: number | null;
  staffId: number;
  staffName: string | null;
  employeeCode: string | null;
  designation: string | null;
  departmentId: number | null;
  departmentName: string | null;
  targetDepartmentId?: number | null;
  homeDepartmentId?: number | null;
  homeDepartmentName?: string | null;
  examPurpose?: string | null;
  enrollmentId?: number | null;
  status: string;
  totalQuestions: number;
  score: string | number | null;
  passPercentage: string | number | null;
  theoreticalRating: string | number | null;
  correctCount: number | null;
  incorrectCount: number | null;
  unansweredCount: number | null;
  timeSpentSeconds: number | null;
  startedAt: string;
  completedAt: string | null;
  isRetest?: boolean;
  retestAuthorized?: boolean;
  retestAuthorizedAt?: string | null;
  retestAuthorizedBy?: string | null;
  retestReason?: string | null;
  answeredCount?: number;
  remainingSeconds?: number;
}

interface SummaryData {
  totalAttempts: number;
  completedCount: number;
  passedCount: number;
  failedCount: number;
  inProgressCount: number;
  averageScore: string;
  averageRating: string;
  passRate: string;
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || isNaN(seconds) || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
}

export function CbtResultsPage() {
  const queryClient = useQueryClient();
  const searchInputId = useId();
  const departmentSelectId = useId();
  const statusSelectId = useId();
  const outcomeSelectId = useId();
  const trackSelectId = useId();
  const permissions = useQuery(assessmentPermissionsQuery);

  const isAdmin = Boolean(permissions.data?.isAdmin);
  const isHr = Boolean(permissions.data?.isHr || isAdmin);
  const isNursingSuper = Boolean(permissions.data?.isNursingSuper);
  const isPrivileged = isHr || isNursingSuper;
  const isStaffCompetencyModuleEnabled = Boolean(
    permissions.data?.isStaffCompetencyModuleEnabled ?? true
  );
  // When Staff access is restricted for CBT, hide the "Review" button for regular staff
  const canReview = isPrivileged || isStaffCompetencyModuleEnabled;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [outcome, setOutcome] = useState<string>("all");
  const [examPurpose, setExamPurpose] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);
  const [retestAttempt, setRetestAttempt] = useState<AttemptRecord | null>(null);
  const [retestReasonInput, setRetestReasonInput] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);

  const authorizeRetestMutation = useMutation({
    mutationFn: async ({ attemptId, reason }: { attemptId: number; reason: string }) => {
      const res = await fetch("/api/skill-assessment/exam/authorize-retest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to authorize retest.");
      return body;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Retest successfully authorized.");
      queryClient.invalidateQueries({ queryKey: ["cbt-results-list"] });
      setRetestAttempt(null);
      setRetestReasonInput("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not authorize retest.");
    },
  });

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load department options
  const departmentsQuery = useQuery({
    queryKey: ["masters-departments-list"],
    queryFn: () => assessmentJson("/api/masters/departments").catch(() => []),
  });

  // Query paginated CBT attempts
  const attemptsQuery = useQuery({
    queryKey: [
      "cbt-results-list",
      page,
      pageSize,
      debouncedSearch,
      departmentId,
      status,
      outcome,
      examPurpose,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (departmentId !== "all") params.set("departmentId", departmentId);
      if (status !== "all") params.set("status", status);
      if (outcome !== "all") params.set("outcome", outcome);
      if (examPurpose !== "all") params.set("examPurpose", examPurpose);

      return assessmentJson(`/api/skill-assessment/exam/attempts?${params.toString()}`);
    },
    refetchInterval: (query) => {
      const inProgressCount = query.state.data?.summary?.inProgressCount || 0;
      // Auto-refresh every 3s if any attempt is currently in progress, otherwise every 10s
      return inProgressCount > 0 ? 3000 : 10000;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["cbt-results-list"] });
    toast.success("CBT results refreshed");
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setDepartmentId("all");
    setStatus("all");
    setOutcome("all");
    setExamPurpose("all");
    setPage(1);
  };

  const [isExporting, setIsExporting] = useState(false);

  // Export filtered attempts to a styled Excel workbook with executive dashboard
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast.info("Preparing Excel export with executive dashboard...");

      // Fetch all matching records across pages for the active filter set
      const params = new URLSearchParams({
        page: "1",
        export: "true",
        pageSize: "all",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (departmentId !== "all") params.set("departmentId", departmentId);
      if (status !== "all") params.set("status", status);
      if (outcome !== "all") params.set("outcome", outcome);
      if (examPurpose !== "all") params.set("examPurpose", examPurpose);

      let records: AttemptRecord[] = [];
      let summaryData: SummaryData | undefined = attemptsQuery.data?.summary;

      try {
        const res = await assessmentJson(`/api/skill-assessment/exam/attempts?${params.toString()}`);
        records = Array.isArray(res) ? res : res.data || [];
        if (res.summary) summaryData = res.summary;
      } catch (err) {
        records = attemptsQuery.data?.data || [];
      }

      if (!records.length) {
        toast.error("No attempts found to export.");
        return;
      }

      const activeDept = (departmentsQuery.data || []).find(
        (d: any) => String(d.id) === String(departmentId)
      );

      exportCbtResultsToExcel({
        records,
        summary: summaryData,
        filters: {
          search: debouncedSearch || undefined,
          departmentName: activeDept?.name,
          status: status !== "all" ? status : undefined,
          outcome: outcome !== "all" ? outcome : undefined,
        },
      });

      toast.success(`Exported ${records.length} examination records to Excel workbook.`);
    } catch (err: any) {
      console.error("CBT Excel export error:", err);
      toast.error(err.message || "Failed to generate Excel export.");
    } finally {
      setIsExporting(false);
    }
  };

  const attempts: AttemptRecord[] = attemptsQuery.data?.data || [];
  const pagination = attemptsQuery.data?.pagination;
  const summary: SummaryData | undefined = attemptsQuery.data?.summary;

  if (permissions.isLoading) return <p role="status" className="p-6">Loading CBT access...</p>;
  if (permissions.isError) {
    return (
      <ModuleLayout
        title="CBT Examination Results"
        description="Review online competency examination attempts, scorecards, and certificates."
      >
        <div role="alert" className="rounded-xl border p-5 space-y-3">
          <p>{permissions.error.message}</p>
          <Button onClick={() => permissions.refetch()}>Retry</Button>
        </div>
      </ModuleLayout>
    );
  }

  const isFilterActive =
    search.trim() !== "" ||
    departmentId !== "all" ||
    status !== "all" ||
    outcome !== "all" ||
    examPurpose !== "all";

  return (
    <ModuleLayout
      title="CBT Examination Results"
      description="Track staff online theoretical examination attempts, audit scorecards and domain breakdowns, and issue verification certificates."
      action={
        <div className="flex flex-wrap items-center gap-2">
          {isPrivileged && (
            <Button
              size="sm"
              onClick={() => setShowAssignModal(true)}
              className="gap-2 bg-primary text-primary-foreground font-semibold shadow-xs"
              title="Assign an employee to a cross-department clinical exam track (rotation, transfer vetting, certification)"
            >
              <Building2 size={14} />
              Assign Cross-Dept Track
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="gap-2 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-medium"
            title="Export filtered attempts and KPI dashboard to an Excel workbook (.xlsx)"
          >
            <FileSpreadsheet size={14} className={isExporting ? "animate-spin" : "text-emerald-600 dark:text-emerald-400"} />
            {isExporting ? "Exporting..." : "Export Excel"}
          </Button>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs"
            title="Real-time test tracking active (auto-refreshes every 3-10s)"
          >
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline">Live Sync</span>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
            <RefreshCw size={14} className={attemptsQuery.isFetching ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      }
    >
      {/* Real-Time Live Examination Alert Banner */}
      {summary && summary.inProgressCount > 0 && (
        <div className="p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-500/10 dark:bg-emerald-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="relative flex size-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-3 bg-emerald-500"></span>
            </span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  {summary.inProgressCount} Live CBT Examination{summary.inProgressCount > 1 ? "s" : ""} Currently In Progress
                </span>
                <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5 uppercase font-bold animate-pulse">
                  Live
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Candidates are actively taking their theoretical assessments right now. Progress, answers, and timers update in real time.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {status !== "in_progress" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setStatus("in_progress");
                  setPage(1);
                }}
                className="text-xs bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white border-none shadow-xs font-semibold"
              >
                Filter Live Tests ({summary.inProgressCount})
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setStatus("all");
                  setPage(1);
                }}
                className="text-xs"
              >
                Show All Statuses
              </Button>
            )}
          </div>
        </div>
      )}
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Attempts */}
        <div className="rounded-2xl border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total CBT Attempts</span>
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <GraduationCap size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight font-mono">
              {summary ? summary.totalAttempts : "—"}
            </span>
            {summary && summary.inProgressCount > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                ({summary.inProgressCount} in progress)
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary ? `${summary.completedCount} completed sessions` : "Loading aggregates..."}
          </p>
        </div>

        {/* Passed Count & Rate */}
        <div className="rounded-2xl border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Benchmark Passed</span>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
              {summary ? summary.passedCount : "—"}
            </span>
            {summary && (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold border-emerald-300">
                {summary.passRate}% Pass Rate
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Exams achieving standard benchmark
          </p>
        </div>

        {/* Failed / Needs Remediation */}
        <div className="rounded-2xl border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Needs Improvement</span>
            <div className="size-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight font-mono text-rose-600 dark:text-rose-400">
              {summary ? summary.failedCount : "—"}
            </span>
            <span className="text-xs text-muted-foreground font-medium">Below benchmark</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Recommended for targeted clinical training
          </p>
        </div>

        {/* Average Score */}
        <div className="rounded-2xl border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Score</span>
            <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Award size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight font-mono text-sky-600 dark:text-sky-400">
              {summary ? `${summary.averageScore}%` : "—"}
            </span>
            {summary && (
              <span className="text-xs font-semibold text-muted-foreground">
                ({summary.averageRating} / 5.0)
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Overall average across completed exams
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <label htmlFor={searchInputId} className="sr-only">
              Search by candidate, code, or attempt
            </label>
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id={searchInputId}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by candidate, employee code, attempt no..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Department Filter */}
          <div>
            <label htmlFor={departmentSelectId} className="sr-only">
              Filter by department
            </label>
            <select
              id={departmentSelectId}
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 text-sm rounded-xl border bg-background"
            >
              <option value="all">All Departments</option>
              {departmentsQuery.data?.map((dept: any) => (
                <option key={dept.id} value={String(dept.id)}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Track Purpose Filter */}
          <div>
            <label htmlFor={trackSelectId} className="sr-only">
              Filter by exam track purpose
            </label>
            <select
              id={trackSelectId}
              value={examPurpose}
              onChange={(e) => {
                setExamPurpose(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 text-sm rounded-xl border bg-background"
            >
              <option value="all">All Tracks / Purp.</option>
              <option value="core_monthly">Core Monthly Only</option>
              <option value="rotation">Clinical Rotations</option>
              <option value="transfer_vetting">Transfer Vetting</option>
              <option value="hospital_wide_certification">Hospital Certifications</option>
              <option value="voluntary">Elective Upskilling</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor={statusSelectId} className="sr-only">
              Filter by exam status
            </label>
            <select
              id={statusSelectId}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 text-sm rounded-xl border bg-background"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="timed_out">Timed Out</option>
              <option value="in_progress">In Progress</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>

          {/* Outcome Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor={outcomeSelectId} className="sr-only">
              Filter by outcome
            </label>
            <select
              id={outcomeSelectId}
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 text-sm rounded-xl border bg-background"
            >
              <option value="all">All Outcomes</option>
              <option value="passed">Passed Only</option>
              <option value="failed">Needs Improvement</option>
            </select>

            {isFilterActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                title="Reset filters"
              >
                <RotateCcw size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-2xs">
        {attemptsQuery.isLoading ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <RefreshCw size={24} className="mx-auto animate-spin text-primary" />
            <p className="text-sm">Loading examination results...</p>
          </div>
        ) : attemptsQuery.isError ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle size={28} className="mx-auto text-destructive" />
            <p className="font-semibold text-destructive">
              Could not load CBT results: {attemptsQuery.error.message}
            </p>
            <Button variant="outline" size="sm" onClick={() => attemptsQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : !attempts.length ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <GraduationCap size={36} className="mx-auto text-muted-foreground/60" />
            <h4 className="font-semibold text-foreground">No examination results found</h4>
            <p className="text-xs max-w-sm mx-auto">
              {isFilterActive
                ? "No exam attempts matched your current filter criteria. Try resetting filters."
                : "No CBT examinations have been recorded in the system yet."}
            </p>
            {isFilterActive && (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">Attempt No</th>
                  <th className="p-3.5">Candidate</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5 whitespace-nowrap">Date & Time</th>
                  <th className="p-3.5 whitespace-nowrap">Duration</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Questions</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Score</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Outcome</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Rating</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attempts.map((attempt) => {
                  const scoreNum = Number(attempt.score ?? 0);
                  const benchmark = Number(attempt.passPercentage ?? 80);
                  const isCompleted = ["completed", "timed_out"].includes(attempt.status);
                  const isPassed = isCompleted && scoreNum >= benchmark;
                  const canPrint = canPrintCbtCertificate(attempt.status);

                  return (
                    <tr
                      key={attempt.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        attempt.status === "in_progress" && "bg-emerald-500/5 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500"
                      )}
                    >
                      {/* Attempt No */}
                      <td className="p-3.5 font-mono font-semibold text-foreground whitespace-nowrap">
                        <div className="flex flex-col items-start gap-0.5">
                          <span>{attempt.attemptNo}</span>
                          {attempt.isRetest && (
                            <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              Attempt 2 (Retest)
                            </span>
                          )}
                          {attempt.retestAuthorized && (
                            <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Retest Authorized
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Candidate */}
                      <td className="p-3.5">
                        <div className="space-y-0.5 min-w-[140px]">
                          <div className="font-semibold text-foreground">
                            {attempt.staffName || "Staff #" + attempt.staffId}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {attempt.employeeCode ? `${attempt.employeeCode} • ` : ""}
                            {attempt.designation || "Clinical Staff"}
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-foreground">
                            <Building2 size={12} className="text-muted-foreground" />
                            {attempt.departmentName || "General"}
                          </span>
                          {attempt.homeDepartmentName && attempt.homeDepartmentName !== attempt.departmentName && (
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span>Home: {attempt.homeDepartmentName}</span>
                              <Badge className="bg-sky-600 text-white text-[8px] py-0 px-1 font-semibold">
                                {attempt.examPurpose === "rotation"
                                  ? "Rotation"
                                  : attempt.examPurpose === "transfer_vetting"
                                  ? "Transfer"
                                  : attempt.examPurpose === "hospital_wide_certification"
                                  ? "Cert"
                                  : "Cross-Dept"}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(attempt.startedAt)}
                      </td>

                      {/* Duration */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-muted-foreground">
                        {attempt.status === "in_progress" ? (
                          <div className="flex flex-col items-start font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                            <span className="flex items-center gap-1">
                              <Clock size={11} className="animate-spin text-emerald-600" />
                              {formatDuration(attempt.timeSpentSeconds)}
                            </span>
                            {attempt.remainingSeconds !== undefined && attempt.remainingSeconds > 0 && (
                              <span className="text-[10px] text-muted-foreground font-normal">
                                {formatDuration(attempt.remainingSeconds)} left
                              </span>
                            )}
                          </div>
                        ) : (
                          formatDuration(attempt.timeSpentSeconds)
                        )}
                      </td>

                      {/* Questions */}
                      <td className="p-3.5 text-center whitespace-nowrap font-mono">
                        {attempt.status === "in_progress" ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                              {attempt.answeredCount ?? 0} / {attempt.totalQuestions}
                            </span>
                            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-300"
                                style={{
                                  width: `${Math.round(((attempt.answeredCount ?? 0) / (attempt.totalQuestions || 1)) * 100)}%`
                                }}
                              />
                            </div>
                            <span className="text-[9px] text-muted-foreground uppercase font-medium">
                              {Math.round(((attempt.answeredCount ?? 0) / (attempt.totalQuestions || 1)) * 100)}% answered
                            </span>
                          </div>
                        ) : (
                          <>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              {attempt.correctCount ?? 0}
                            </span>
                            <span className="text-muted-foreground"> / {attempt.totalQuestions}</span>
                          </>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {attempt.status === "in_progress" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                            Testing Now
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                              attempt.status === "completed"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : attempt.status === "timed_out"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {attempt.status.replace("_", " ")}
                          </span>
                        )}
                      </td>

                      {/* Score */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        {isCompleted ? (
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-sm">
                              {Number(attempt.score).toFixed(1)}%
                            </span>
                            <div className="text-[10px] text-muted-foreground">
                              Pass: {benchmark}%
                            </div>
                          </div>
                        ) : attempt.status === "in_progress" ? (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
                            Live In-Progress
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Outcome Badge */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {isCompleted ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px]",
                              isPassed
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                            )}
                          >
                            {isPassed ? (
                              <>
                                <CheckCircle2 size={12} />
                                PASSED
                              </>
                            ) : (
                              <>
                                <XCircle size={12} />
                                NEEDS TRAINING
                              </>
                            )}
                          </span>
                        ) : attempt.status === "in_progress" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse">
                            <span className="size-1.5 rounded-full bg-emerald-500"></span>
                            IN PROGRESS
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">IN PROGRESS</span>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="p-3.5 text-right whitespace-nowrap font-mono font-bold text-foreground">
                        {isCompleted && attempt.theoreticalRating != null ? (
                          `${Number(attempt.theoreticalRating).toFixed(2)}/5`
                        ) : attempt.status === "in_progress" ? (
                          <span className="text-[10px] text-muted-foreground font-mono font-normal">
                            Pending submit
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {canReview && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAttemptId(attempt.id)}
                              className="h-8 px-2.5 text-xs gap-1"
                              title="View question-by-question review"
                            >
                              <Eye size={13} />
                              Review
                            </Button>
                          )}

                          {isHr && isCompleted && !isPassed && (
                            attempt.retestAuthorized ? (
                              <span
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                                title={`Retest authorized by ${attempt.retestAuthorizedBy || "HR"}`}
                              >
                                <RotateCcw size={12} />
                                Retest Unlocked
                              </span>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRetestAttempt(attempt);
                                  setRetestReasonInput("");
                                }}
                                className="h-8 px-2.5 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5"
                                title="Authorize Same-Month Retest (Admin & HR Only)"
                              >
                                <RotateCcw size={12} />
                                Retest
                              </Button>
                            )
                          )}

                          {canPrint ? (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-8 px-2.5 text-xs gap-1"
                              title="Print NABH CBT Certificate"
                            >
                              <Link
                                to="/assessments/certificates/$attemptId"
                                params={{ attemptId: String(attempt.id) }}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Printer size={13} />
                                Cert
                              </Link>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled
                              className="h-8 px-2.5 text-xs text-muted-foreground"
                            >
                              —
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Footer */}
        {pagination && pagination.totalRecords > 0 && (
          <div className="px-4 py-3 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, pagination.totalRecords)} of{" "}
                <strong>{pagination.totalRecords}</strong> attempts
              </span>
              <span className="text-muted-foreground">•</span>
              <label htmlFor="cbt-page-size-select" className="sr-only">
                Rows per page
              </label>
              <select
                id="cbt-page-size-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-md border bg-background px-2 py-1 text-xs"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || attemptsQuery.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 text-xs gap-1"
              >
                <ChevronLeft size={13} />
                Previous
              </Button>
              <span className="px-2 font-medium">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages || attemptsQuery.isFetching}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 text-xs gap-1"
              >
                Next
                <ChevronRight size={13} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Attempt Review Modal */}
      {selectedAttemptId != null && canReview && (
        <AttemptReviewModal
          attemptId={selectedAttemptId}
          onClose={() => setSelectedAttemptId(null)}
        />
      )}

      {/* Authorize Retest Modal (Admin & HR Only) */}
      {retestAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Authorize CBT Retest</h3>
                  <p className="text-xs text-muted-foreground">Admin & HR Governance Workflow</p>
                </div>
              </div>
              <button
                onClick={() => setRetestAttempt(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                title="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Candidate:</span>
                  <span className="font-semibold text-foreground">{retestAttempt.staffName || `Staff #${retestAttempt.staffId}`}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Employee Code:</span>
                  <span className="font-mono text-foreground">{retestAttempt.employeeCode || "—"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Department:</span>
                  <span className="text-foreground">{retestAttempt.departmentName || "—"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Attempt 1 Score:</span>
                  <span className="font-bold text-destructive">
                    {retestAttempt.score != null ? `${Number(retestAttempt.score).toFixed(1)}%` : "0%"} (Below {retestAttempt.passPercentage || 60}% Benchmark)
                  </span>
                </div>
              </div>

              <div className="rounded-lg p-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle size={13} />
                  NABH Competency & Cooling Period Governance
                </p>
                <p>
                  Standard policy mandates a <strong>10-day minimum</strong> remediation period between attempts. Authorizing this retest will immediately allow the candidate to take Attempt 2 within the current calendar month.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Authorization Reason / In-Service Remediation Note <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={retestReasonInput}
                  onChange={(e) => setRetestReasonInput(e.target.value)}
                  placeholder="e.g., Completed 10-day clinical remediation on medication safety guidelines, or emergency technical disruption waiver."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setRetestReasonInput("Completed 10-day clinical remediation & protocol review.")}
                    className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground border border-border"
                  >
                    + 10-day remediation completed
                  </button>
                  <button
                    type="button"
                    onClick={() => setRetestReasonInput("Technical disruption / connection timeout waiver.")}
                    className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground border border-border"
                  >
                    + Technical disruption waiver
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRetestAttempt(null)}
                disabled={authorizeRetestMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!retestReasonInput.trim()) {
                    toast.error("Please enter a valid authorization reason.");
                    return;
                  }
                  authorizeRetestMutation.mutate({
                    attemptId: retestAttempt.id,
                    reason: retestReasonInput.trim(),
                  });
                }}
                disabled={authorizeRetestMutation.isPending || retestReasonInput.trim().length < 3}
                className="gap-1.5 bg-primary text-primary-foreground"
              >
                {authorizeRetestMutation.isPending ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <RotateCcw size={13} />
                    Confirm & Unlock Retest
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Cross-Department Track Modal (Model C) */}
      <AssignCrossDeptTrackModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
      />
    </ModuleLayout>
  );
}

// ---------------------------------------------------------------------------
// Scorecard & Review Breakdown Modal
// ---------------------------------------------------------------------------
function AttemptReviewModal({
  attemptId,
  onClose,
}: {
  attemptId: number;
  onClose: () => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const reviewQuery = useQuery({
    queryKey: ["cbt-attempt-review", attemptId],
    queryFn: () =>
      assessmentJson(`/api/skill-assessment/exam/attempts/${attemptId}`),
  });

  const data = reviewQuery.data;
  const attempt = data?.attempt;
  const review = data?.review || [];
  const domainResults = data?.domainResults || [];

  const scoreNum = Number(attempt?.score ?? 0);
  const benchmark = Number(attempt?.passPercentage ?? 80);
  const isPassed = scoreNum >= benchmark;
  const canPrint = attempt ? canPrintCbtCertificate(attempt.status) : false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-dialog-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
    >
      <div className="bg-card border border-border w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-muted/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <Award size={20} />
            </div>
            <div>
              <h3 id="review-dialog-title" className="text-sm font-bold text-foreground">
                CBT Scorecard & Detailed Review
              </h3>
              <p className="text-xs text-muted-foreground">
                {attempt ? `Attempt No: ${attempt.attemptNo} • Benchmark: ${benchmark}%` : "Loading scorecard..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canPrint && (
              <Button size="sm" variant="outline" asChild className="gap-1.5 text-xs">
                <Link
                  to="/assessments/certificates/$attemptId"
                  params={{ attemptId: String(attemptId) }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Printer size={14} />
                  Print Certificate
                </Link>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {reviewQuery.isLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw size={28} className="mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading examination review and questions...</p>
            </div>
          ) : reviewQuery.isError ? (
            <div className="p-6 text-center space-y-3">
              <AlertTriangle size={28} className="mx-auto text-destructive" />
              <p className="font-semibold text-destructive">{reviewQuery.error.message}</p>
              <Button variant="outline" size="sm" onClick={() => reviewQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : !attempt ? (
            <p className="text-sm text-muted-foreground text-center py-10">Attempt details not available.</p>
          ) : (
            <>
              {/* Score Hero Banner */}
              <div
                className={cn(
                  "p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-5",
                  isPassed
                    ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-950 dark:text-emerald-100"
                    : "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-950 dark:text-rose-100"
                )}
              >
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <Badge
                      className={cn(
                        "text-xs px-2.5 py-0.5 font-bold uppercase",
                        isPassed ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                      )}
                    >
                      {isPassed ? "Pass Benchmark Achieved" : "Improvement Needed"}
                    </Badge>
                    <span className="text-xs font-mono font-medium">
                      Time Spent: {formatDuration(attempt.timeSpentSeconds)}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold">
                    Score: {scoreNum}% ({attempt.correctCount ?? 0} / {attempt.totalQuestions} Correct)
                  </h2>
                  <p className="text-xs opacity-90">
                    Scaled Theoretical Competency Rating: <strong>{Number(attempt.theoreticalRating ?? 0).toFixed(2)} / 5.0</strong>
                  </p>
                </div>

                <div className="flex items-center gap-4 text-center">
                  <div className="size-20 rounded-2xl bg-background border shadow-xs flex flex-col items-center justify-center p-2">
                    <span className="text-2xl font-black text-foreground font-mono">
                      {Number(attempt.theoreticalRating ?? 0).toFixed(2)}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Out of 5.0</span>
                  </div>
                </div>
              </div>

              {/* Domain Breakdown Table */}
              {domainResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Competency Domain Breakdown
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      NABH Quality & Safety Objectives
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2.5">Domain Code</th>
                          <th className="p-2.5 text-center">Questions</th>
                          <th className="p-2.5 text-center">Correct</th>
                          <th className="p-2.5 text-right">Score (%)</th>
                          <th className="p-2.5 text-right">Theory Rating (out of 5)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {domainResults.map((domain: any) => (
                          <tr key={domain.domainCode} className="hover:bg-muted/20">
                            <td className="p-2.5 font-bold font-mono text-foreground">
                              {domain.domainCode}
                            </td>
                            <td className="p-2.5 text-center font-mono">{domain.totalQuestions}</td>
                            <td className="p-2.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              {domain.correctCount}
                            </td>
                            <td className="p-2.5 text-right font-mono font-semibold">
                              {domain.score}%
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-foreground">
                              {Number(domain.theoreticalRating).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Question Review List */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Detailed Question Review & Guidelines
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {attempt.correctCount ?? 0} Correct • {attempt.incorrectCount ?? 0} Incorrect • {attempt.unansweredCount ?? 0} Unanswered
                  </span>
                </div>

                <div className="space-y-3">
                  {review.map((item: any, idx: number) => {
                    const isExpanded = expandedId === item.id;
                    const letters = ["A", "B", "C", "D"];

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-xl border p-4 text-xs transition-colors",
                          item.isCorrect
                            ? "border-emerald-200 dark:border-emerald-800/40 bg-card"
                            : "border-rose-200 dark:border-rose-800/40 bg-rose-50/10 dark:bg-rose-950/10"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted">
                                Q{idx + 1}
                              </span>
                              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                {item.code}
                              </Badge>
                              <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                                [{item.domainCode}]
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                                  item.isCorrect
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : item.selectedOptionIndex === -1
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                )}
                              >
                                {item.isCorrect
                                  ? "Correct"
                                  : item.selectedOptionIndex === -1
                                  ? "Unanswered"
                                  : "Incorrect"}
                              </span>
                            </div>
                            <p className="font-semibold text-foreground text-sm leading-relaxed">
                              {item.question}
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            className="size-8 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </Button>
                        </div>

                        {/* Options */}
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.options?.map((opt: string, optIdx: number) => {
                            const isChosen = item.selectedOptionIndex === optIdx;
                            const isCorrectOpt = item.correctOptionIndex === optIdx;

                            return (
                              <div
                                key={optIdx}
                                className={cn(
                                  "p-2.5 rounded-lg border text-xs flex items-center gap-2",
                                  isCorrectOpt
                                    ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 font-medium"
                                    : isChosen && !isCorrectOpt
                                    ? "border-rose-400 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-medium"
                                    : "border-border/60 bg-muted/20 text-muted-foreground"
                                )}
                              >
                                <span
                                  className={cn(
                                    "size-5 rounded flex items-center justify-center font-bold text-[10px] shrink-0",
                                    isCorrectOpt
                                      ? "bg-emerald-600 text-white"
                                      : isChosen
                                      ? "bg-rose-600 text-white"
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {letters[optIdx]}
                                </span>
                                <span className="flex-1 leading-snug">{opt}</span>
                                {isCorrectOpt && (
                                  <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                )}
                                {isChosen && !isCorrectOpt && (
                                  <XCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Clinical Guidelines / Explanation (collapsible or visible on expand) */}
                        {isExpanded && item.explanation && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border/80 text-[11px] space-y-1">
                            <span className="font-bold text-foreground block">
                              Clinical Rationale & Guidelines:
                            </span>
                            <p className="text-muted-foreground leading-relaxed">
                              {item.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-end gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
