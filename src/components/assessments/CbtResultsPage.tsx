import React, { useState, useId } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import { ModuleLayout } from "../ModuleLayout";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { cn } from "@/utils/cn";
import { assessmentJson, assessmentPermissionsQuery } from "./AssessmentsHome";
import { canPrintCbtCertificate } from "@/lib/cbt-certificate";
import { fmtDate } from "./SkillAssessmentsPage";

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
  const permissions = useQuery(assessmentPermissionsQuery);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [outcome, setOutcome] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);

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

      return assessmentJson(`/api/skill-assessment/exam/attempts?${params.toString()}`);
    },
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
    setPage(1);
  };

  // Export filtered attempts to CSV
  const handleExportCsv = () => {
    const records: AttemptRecord[] = attemptsQuery.data?.data || [];
    if (!records.length) {
      toast.error("No attempts to export");
      return;
    }

    const headers = [
      "Attempt No",
      "Candidate Name",
      "Employee Code",
      "Designation",
      "Department",
      "Started At",
      "Completed At",
      "Duration",
      "Total Questions",
      "Correct",
      "Incorrect",
      "Unanswered",
      "Score (%)",
      "Benchmark (%)",
      "Rating (out of 5)",
      "Status",
      "Outcome",
    ];

    const rows = records.map((r) => {
      const scoreNum = Number(r.score ?? 0);
      const benchmarkNum = Number(r.passPercentage ?? 60);
      const isPassed = scoreNum >= benchmarkNum;
      const outcomeText = ["completed", "timed_out"].includes(r.status)
        ? isPassed
          ? "PASSED"
          : "FAILED"
        : r.status.toUpperCase();

      return [
        `"${r.attemptNo}"`,
        `"${r.staffName || ""}"`,
        `"${r.employeeCode || ""}"`,
        `"${r.designation || ""}"`,
        `"${r.departmentName || ""}"`,
        `"${formatDateTime(r.startedAt)}"`,
        `"${formatDateTime(r.completedAt)}"`,
        `"${formatDuration(r.timeSpentSeconds)}"`,
        r.totalQuestions,
        r.correctCount ?? 0,
        r.incorrectCount ?? 0,
        r.unansweredCount ?? 0,
        r.score ?? "0.00",
        r.passPercentage ?? "60.00",
        r.theoreticalRating ?? "0.00",
        `"${r.status}"`,
        `"${outcomeText}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `cbt-results-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${records.length} records to CSV`);
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
    outcome !== "all";

  return (
    <ModuleLayout
      title="CBT Examination Results"
      description="Track staff online theoretical examination attempts, audit scorecards and domain breakdowns, and issue verification certificates."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-2">
            <Download size={14} />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
            <RefreshCw size={14} className={attemptsQuery.isFetching ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      }
    >
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
          <div className="lg:col-span-2 relative">
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
                  const benchmark = Number(attempt.passPercentage ?? 60);
                  const isCompleted = ["completed", "timed_out"].includes(attempt.status);
                  const isPassed = isCompleted && scoreNum >= benchmark;
                  const canPrint = canPrintCbtCertificate(attempt.status);

                  return (
                    <tr
                      key={attempt.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Attempt No */}
                      <td className="p-3.5 font-mono font-semibold text-foreground whitespace-nowrap">
                        {attempt.attemptNo}
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
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-foreground">
                          <Building2 size={12} className="text-muted-foreground" />
                          {attempt.departmentName || "General"}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(attempt.startedAt)}
                      </td>

                      {/* Duration */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-muted-foreground">
                        {formatDuration(attempt.timeSpentSeconds)}
                      </td>

                      {/* Questions */}
                      <td className="p-3.5 text-center whitespace-nowrap font-mono">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {attempt.correctCount ?? 0}
                        </span>
                        <span className="text-muted-foreground"> / {attempt.totalQuestions}</span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            attempt.status === "completed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : attempt.status === "timed_out"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : attempt.status === "in_progress"
                              ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {attempt.status.replace("_", " ")}
                        </span>
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
                        ) : (
                          <span className="text-muted-foreground text-[10px]">IN PROGRESS</span>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="p-3.5 text-right whitespace-nowrap font-mono font-bold text-foreground">
                        {attempt.theoreticalRating != null
                          ? `${Number(attempt.theoreticalRating).toFixed(2)}/5`
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
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
      {selectedAttemptId != null && (
        <AttemptReviewModal
          attemptId={selectedAttemptId}
          onClose={() => setSelectedAttemptId(null)}
        />
      )}
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
  const benchmark = Number(attempt?.passPercentage ?? 60);
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
