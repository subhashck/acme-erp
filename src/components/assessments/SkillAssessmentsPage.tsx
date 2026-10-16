import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  ShieldCheck,
  Filter,
  Search,
  Plus,
  BookOpen,
  BarChart3,
  Building2,
  Calendar,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Info,
  CheckCircle,
  XCircle,
  Printer,
  TrendingUp,
  GraduationCap,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Stethoscope,
  ListChecks,
  FileQuestion,
  Edit3,
  Trash2,
  FolderPlus,
  ToggleLeft,
  ToggleRight,
  Check,
  UserPlus,
  CalendarDays,
  Lock,
  Unlock,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { ModuleLayout } from "../../components/ModuleLayout";
import { useUserPermissions } from "../../lib/permissions";
import { cn } from "../../utils/cn";


// Helper for formatting dates with zero timezone shift on YYYY-MM-DD
export function fmtDate(d?: string | Date | null) {
  if (!d) return "—";
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, day] = s.slice(0, 10).split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, day));
    return dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Status display meta
export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; border: string; bg: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Self Assessment (Draft)",
    color: "text-amber-700 dark:text-amber-400",
    border: "border-amber-300 dark:border-amber-700/50",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    icon: <Clock size={13} />,
  },
  submitted_to_incharge: {
    label: "Pending Dept Incharge",
    color: "text-blue-700 dark:text-blue-400",
    border: "border-blue-300 dark:border-blue-700/50",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    icon: <UserCheck size={13} />,
  },
  submitted_to_nursing_super: {
    label: "Pending Nursing Super",
    color: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-300 dark:border-indigo-700/50",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    icon: <Award size={13} />,
  },
  submitted_to_hr: {
    label: "Pending HR Sign-Off",
    color: "text-purple-700 dark:text-purple-400",
    border: "border-purple-300 dark:border-purple-700/50",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    icon: <ShieldCheck size={13} />,
  },
  completed: {
    label: "Competent & Finalized",
    color: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-300 dark:border-emerald-700/50",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    icon: <CheckCircle2 size={13} />,
  },
  training_required: {
    label: "Training Assigned",
    color: "text-orange-700 dark:text-orange-400",
    border: "border-orange-300 dark:border-orange-700/50",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    icon: <GraduationCap size={13} />,
  },
  revision_requested: {
    label: "Revision Requested",
    color: "text-rose-700 dark:text-rose-400",
    border: "border-rose-300 dark:border-rose-700/50",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    icon: <AlertTriangle size={13} />,
  },
};

export function SkillAssessmentsPage() {
  const queryClient = useQueryClient();
  const permissions = useUserPermissions();
  const currentStaff = permissions.currentStaff;

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<
    "my" | "incharge" | "nursing_super" | "hr" | "all" | "rubrics" | "analytics"
  >("my");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Active Assessment Detail Modal
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const [isInitiateDialogOpen, setIsInitiateDialogOpen] = useState(false);

  // Fetch reviewer permissions metadata
  const { data: myReviewPerms } = useQuery({
    queryKey: ["skill-assessment-my-permissions"],
    queryFn: async () => {
      const res = await fetch("/api/skill-assessment/my-permissions");
      if (!res.ok) throw new Error("Failed to load permissions");
      return res.json();
    },
  });

  // Fetch pending review counts for badge tabs
  const { data: pendingCounts, refetch: refetchCounts } = useQuery({
    queryKey: ["skill-assessment-pending-counts"],
    queryFn: async () => {
      const res = await fetch("/api/skill-assessment/pending-counts");
      if (!res.ok) return { pendingIncharge: 0, pendingNursingSuper: 0, pendingHr: 0, myAssessments: 0 };
      return res.json();
    },
  });

  // Fetch departments for filtering
  const { data: departmentsList = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const res = await fetch("/api/masters/departments");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch active cycle
  const { data: cyclesList = [] } = useQuery({
    queryKey: ["skill-assessment-cycles"],
    queryFn: async () => {
      const res = await fetch("/api/skill-assessment/cycles");
      if (!res.ok) return [];
      return res.json();
    },
  });
  const activeCycle = cyclesList.find((c: any) => c.status === "active") || cyclesList[0];

  // Fetch Assessment List with pagination and filters
  const {
    data: assessmentsData,
    isLoading: isLoadingAssessments,
    refetch: refetchList,
  } = useQuery({
    queryKey: [
      "skill-assessments-list",
      activeTab,
      statusFilter,
      deptFilter,
      searchTerm,
      page,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        tab: activeTab === "all" || activeTab === "rubrics" || activeTab === "analytics" ? "all" : activeTab,
        status: statusFilter,
        departmentId: deptFilter,
        search: searchTerm,
        page: String(page),
        pageSize: "15",
      });
      const res = await fetch(`/api/skill-assessment/list?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load assessments");
      return res.json();
    },
    enabled: activeTab !== "rubrics" && activeTab !== "analytics",
  });

  // Resolve the candidate's assessment independently of visible list filters/pages.
  const { data: myAssessmentsData } = useQuery({
    queryKey: ["skill-assessments-list", "own-active-cycle", activeCycle?.id, myReviewPerms?.currentStaff?.staffId],
    queryFn: async () => {
      const params = new URLSearchParams({ tab: "my", page: "1", pageSize: "1", cycleId: String(activeCycle.id) });
      const res = await fetch(`/api/skill-assessment/list?${params}`);
      if (!res.ok) throw new Error("Failed to load your assessment");
      return res.json();
    },
    enabled: Boolean(activeCycle?.id && myReviewPerms?.currentStaff?.staffId),
  });
  const myExistingAssessment = myAssessmentsData?.data?.[0] ?? null;

  // Fetch Rubrics Catalog
  const { data: rubricsData, refetch: refetchRubrics } = useQuery({
    queryKey: ["skill-assessment-rubrics"],
    queryFn: async () => {
      const res = await fetch("/api/skill-assessment/rubrics?includeInactive=true");
      if (!res.ok) throw new Error("Failed to load rubrics");
      return res.json();
    },
    enabled: activeTab === "rubrics" || !!selectedAssessmentId,
  });

  // Fetch Analytics
  const { data: analyticsData } = useQuery({
    queryKey: ["skill-assessment-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/skill-assessment/analytics");
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
    enabled: activeTab === "analytics",
  });

  // Initiate Assessment Mutation (Handles Uniqueness & Period Dates)
  const initiateMutation = useMutation({
    mutationFn: async (payload: { staffId?: number; cycleId?: number; startDate?: string; endDate?: string }) => {
      const res = await fetch("/api/skill-assessment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409 && (data.assessmentId || data.assessment?.id)) {
          return {
            ...data,
            alreadyExists: true,
            targetId: data.assessmentId || data.assessment?.id,
          };
        }
        throw new Error(data.error || "Failed to start assessment");
      }
      return data;
    },
    onSuccess: (data) => {
      if (data.alreadyExists) {
        toast.info(data.error || "Assessment already active for this period. Opening existing workspace.");
        setIsInitiateDialogOpen(false);
        if (data.targetId) setSelectedAssessmentId(data.targetId);
        return;
      }
      toast.success(data.message || "Skill assessment initiated successfully!");
      setIsInitiateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["skill-assessments-list"] });
      queryClient.invalidateQueries({ queryKey: ["skill-assessment-pending-counts"] });
      if (data.assessment?.id) {
        setSelectedAssessmentId(data.assessment.id);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to initiate assessment");
    },
  });

  // Delete Draft Assessment Mutation (Admin Only)
  const deleteDraftMutation = useMutation({
    mutationFn: async (assessmentId: number) => {
      const res = await fetch(`/api/skill-assessment/${assessmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete draft assessment");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Draft assessment deleted successfully");
      refetchList();
      refetchCounts();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete assessment");
    },
  });

  // Module Access Lockout for regular staff when disabled by Hospital Administration
  if (myReviewPerms && myReviewPerms.isStaffCompetencyModuleEnabled === false && !myReviewPerms.canAccessModule) {
    return (
      <ModuleLayout
        title="Skill Assessments (NABH)"
        description="Clinical & Nursing Competency Framework measuring theoretical and practical skills."
      >
        <div className="max-w-2xl mx-auto my-12 p-8 bg-card border border-amber-200 dark:border-amber-900/40 rounded-2xl shadow-sm text-center space-y-4">
          <div className="size-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Lock size={32} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-foreground">Competency Module Access Restricted</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
              The Clinical Staff Competency Assessment module is currently restricted by hospital administration. Normal staff self-evaluations and online theoretical CBT examinations are temporarily paused.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/30 text-xs text-amber-800 dark:text-amber-300 max-w-md mx-auto">
            <span className="font-semibold">Authorized Personnel:</span> Nursing Supervisors, HR Officers, and System Administrators retain operational management privileges during this restricted period.
          </div>
          <div className="pt-2 text-xs text-muted-foreground">
            If you need urgent assistance or an off-cycle assessment, please contact the <span className="font-medium text-foreground">Nursing Administration Office</span> or <span className="font-medium text-foreground">HR Department</span>.
          </div>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Skill Assessments (NABH)"
      description="Clinical & Nursing Competency Framework measuring theoretical and practical skills."
    >
      <div className="space-y-6 pb-12">
        {/* Top Header Card */}
        <div className="relative overflow-hidden rounded-2xl border border-teal-200/60 dark:border-teal-900/50 bg-gradient-to-br from-teal-500/10 via-background to-teal-950/5 p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 dark:bg-teal-950/80 px-2.5 py-0.5 text-xs font-semibold text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  <ShieldCheck size={13} className="text-teal-600 dark:text-teal-400" />
                  NABH 5th Edition Standard
                </span>
                {activeCycle && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/80 px-2.5 py-0.5 text-[11px] sm:text-xs font-medium text-muted-foreground border">
                    <Calendar size={12} className="text-teal-600 dark:text-teal-400" />
                    <span className="truncate max-w-64 sm:max-w-none">
                      {activeCycle.title} ({fmtDate(activeCycle.startDate)} – {fmtDate(activeCycle.endDate)})
                    </span>
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Award className="size-6 sm:size-7 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>Clinical Staff Skill Assessment</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                Multi-evaluator clinical competency framework measuring theoretical knowledge and practical hands-on demonstrations across infection control, patient safety, medication administration, and BLS.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchList();
                  refetchCounts();
                }}
                className="gap-1.5 justify-center"
              >
                <RefreshCw size={14} />
                Refresh
              </Button>

              {Boolean(myReviewPerms?.isAdmin || myReviewPerms?.isHr || permissions.isAdmin || permissions.isHr) && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-1.5 justify-center border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  title="Manage theoretical examination question bank (Admin & HR only)"
                >
                  <Link to="/assessments/question-bank">
                    <FileQuestion size={14} />
                    Question Bank
                  </Link>
                </Button>
              )}

              {Boolean(myReviewPerms?.isAdmin || myReviewPerms?.isHr) && (
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link to="/assessments/settings"><SlidersHorizontal size={14} />Settings</Link>
                </Button>
              )}

              {Boolean(
                myReviewPerms?.isAdmin ||
                  myReviewPerms?.isHr ||
                  myReviewPerms?.isDeptIncharge ||
                  myReviewPerms?.isNursingSuper
              ) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInitiateDialogOpen(true)}
                  className="gap-1.5 justify-center border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                >
                  <UserPlus size={14} />
                  Initiate Staff Assessment
                </Button>
              )}

              <Button asChild variant="outline" size="sm" className="gap-1.5 justify-center border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-300">
                <Link to="/assessments/online-cbt" search={myExistingAssessment && ["draft", "revision_requested"].includes(myExistingAssessment.status) ? { assessmentId: myExistingAssessment.id } : {}}>
                  <GraduationCap size={15} />Online CBT Exam
                </Link>
              </Button>

              {myExistingAssessment ? (
                <Button
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white shadow-xs gap-1.5 justify-center"
                  onClick={() => setSelectedAssessmentId(myExistingAssessment.id)}
                >
                  <Eye size={15} />
                  Open My Self-Assessment ({myExistingAssessment.assessmentNo})
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white shadow-xs gap-1.5 justify-center"
                  onClick={() => initiateMutation.mutate({ cycleId: activeCycle?.id })}
                  disabled={initiateMutation.isPending}
                >
                  <Plus size={15} />
                  Start My Self-Assessment
                </Button>
              )}
            </div>
          </div>

          {/* Workflow Stepper Visual Banner */}
          <div className="mt-5 pt-4 sm:pt-5 border-t border-border/60">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              NABH Multi-Stage Evaluation Pipeline
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-background/80 border border-border shadow-2xs">
                <div className="size-8 rounded-lg bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">1. Clinical Staff</div>
                  <div className="text-[11px] text-muted-foreground truncate">Self-Rating (Theory & Practical)</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-background/80 border border-border shadow-2xs">
                <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">2. Dept Incharge</div>
                  <div className="text-[11px] text-muted-foreground truncate">Observation & Review</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-background/80 border border-border shadow-2xs">
                <div className="size-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">3. Nursing Supervisor</div>
                  <div className="text-[11px] text-muted-foreground truncate">Supervisory Verification & CNE</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-background/80 border border-border shadow-2xs">
                <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                  4
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">4. HR Sign-Off</div>
                  <div className="text-[11px] text-muted-foreground truncate">Final Audit & Certification</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Horizontal Touch Scroll on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border -mx-2 px-2 sm:mx-0 sm:px-0 touch-pan-x scrollbar-none">
          <button
            onClick={() => {
              setActiveTab("my");
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer whitespace-nowrap",
              activeTab === "my"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <UserCheck size={14} />
            <span>My Assessments</span>
            {pendingCounts?.myAssessments > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-bold">
                {pendingCounts.myAssessments}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("incharge");
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer whitespace-nowrap",
              activeTab === "incharge"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Clock size={14} />
            <span>Pending Incharge Review</span>
            {pendingCounts?.pendingIncharge > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500 text-white font-bold">
                {pendingCounts.pendingIncharge}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("nursing_super");
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer whitespace-nowrap",
              activeTab === "nursing_super"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Award size={14} />
            <span>Pending Nursing Super</span>
            {pendingCounts?.pendingNursingSuper > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500 text-white font-bold">
                {pendingCounts.pendingNursingSuper}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("hr");
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer whitespace-nowrap",
              activeTab === "hr"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <ShieldCheck size={14} />
            <span>HR Review Queue</span>
            {pendingCounts?.pendingHr > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500 text-white font-bold">
                {pendingCounts.pendingHr}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("all");
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer whitespace-nowrap",
              activeTab === "all"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <FileText size={14} />
            <span>All Records</span>
          </button>

          <button
            onClick={() => setActiveTab("rubrics")}
            className={cn(
              "px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer whitespace-nowrap",
              activeTab === "rubrics"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <BookOpen size={14} />
            <span>NABH Guidelines</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={cn(
              "px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 cursor-pointer whitespace-nowrap",
              activeTab === "analytics"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <BarChart3 size={14} />
            <span>Analytics & Gap Matrix</span>
          </button>
        </div>

        {/* Content based on Active Tab */}
        {activeTab === "rubrics" ? (
          <RubricsCatalogView
            rubrics={rubricsData?.grouped || []}
            domainsList={rubricsData?.domains || []}
            canManage={false}
            onRefetch={refetchRubrics}
          />
        ) : activeTab === "analytics" ? (
          <AnalyticsDashboardView analytics={analyticsData} />
        ) : (
          <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 bg-muted/30 p-2.5 sm:p-3 rounded-xl border">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search staff, code, assessment ID..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 sm:py-1.5 text-xs rounded-lg border bg-background focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:w-auto shrink-0">
                <select
                  value={deptFilter}
                  onChange={(e) => {
                    setDeptFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-2 sm:py-1.5 text-xs rounded-lg border bg-background text-foreground"
                >
                  <option value="all">All Departments</option>
                  {departmentsList.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-2 sm:py-1.5 text-xs rounded-lg border bg-background text-foreground"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Self Assessment (Draft)</option>
                  <option value="submitted_to_incharge">Pending Dept Incharge</option>
                  <option value="submitted_to_nursing_super">Pending Nursing Super</option>
                  <option value="submitted_to_hr">Pending HR Sign-Off</option>
                  <option value="completed">Completed & Competent</option>
                  <option value="training_required">Training Assigned</option>
                  <option value="revision_requested">Revision Requested</option>
                </select>
              </div>
            </div>

            {/* Assessment Cards / Table */}
            {isLoadingAssessments ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-teal-600" />
                Loading skill assessments...
              </div>
            ) : !assessmentsData?.data || assessmentsData.data.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-dashed text-muted-foreground bg-muted/20">
                <Award className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                <h3 className="text-sm font-semibold text-foreground">No Skill Assessments Found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  {activeTab === "my"
                    ? "You do not have any skill assessments initiated for your profile yet. Click 'Start My Self-Assessment' above."
                    : activeTab === "incharge"
                    ? "No assessments currently pending your review as Department Incharge."
                    : activeTab === "nursing_super"
                    ? "No assessments currently awaiting Nursing Supervisor review."
                    : "No assessment records match the current filter criteria."}
                </p>
                {activeTab === "my" && (
                  <Button
                    size="sm"
                    className="mt-4 bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => initiateMutation.mutate({})}
                  >
                    Start Self-Assessment
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {assessmentsData.data.map((item: any) => {
                  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedAssessmentId(item.id)}
                      className="group p-3.5 sm:p-4 rounded-xl border bg-card hover:bg-muted/40 transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400">
                            {item.assessmentNo}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border",
                              cfg.bg,
                              cfg.color,
                              cfg.border
                            )}
                          >
                            {cfg.icon}
                            {cfg.label}
                          </span>
                          {item.competencyLevel && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                              {item.competencyLevel}
                            </span>
                          )}
                          {(item.cycleTitle || item.startDate || item.cycleStartDate) && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground border">
                              <Calendar size={11} className="text-teal-600 dark:text-teal-400" />
                              <span>
                                {item.cycleTitle || "Period"}: {fmtDate(item.startDate || item.cycleStartDate)} – {fmtDate(item.endDate || item.cycleEndDate)}
                              </span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {item.staffName}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            ({item.employeeCode})
                          </span>
                          <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                          <span className="text-xs font-medium text-muted-foreground">
                            {item.departmentName}
                          </span>
                          <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                          <span className="text-xs text-muted-foreground">
                            {item.designation}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4 text-[11px] text-muted-foreground pt-1 flex-wrap">
                          <span>Initiated: {fmtDate(item.createdAt)}</span>
                          {item.selfAssessedAt && (
                            <span className="text-teal-700 dark:text-teal-400">
                              Self:{" "}
                              {permissions.isAdmin ||
                              permissions.isHr ||
                              item.status === "completed" ||
                              item.status === "training_required" ||
                              item.status === "submitted_to_hr" ||
                              myReviewPerms?.currentStaff?.staffId === item.staffId
                                ? `${Number(item.selfOverallScore || 0).toFixed(1)}/5`
                                : "Completed"}
                            </span>
                          )}
                          {item.inchargeAssessedAt && (
                            <span className="text-blue-700 dark:text-blue-400">
                              Incharge:{" "}
                              {permissions.isAdmin ||
                              permissions.isHr ||
                              item.status === "completed" ||
                              item.status === "training_required" ||
                              item.status === "submitted_to_hr" ||
                              myReviewPerms?.canAssessAsIncharge
                                ? `${Number(item.inchargeOverallScore || 0).toFixed(1)}/5`
                                : "Verified"}
                            </span>
                          )}
                          {item.nursingSuperAssessedAt && (
                            <span className="text-indigo-700 dark:text-indigo-400">
                              Super:{" "}
                              {permissions.isAdmin ||
                              permissions.isHr ||
                              item.status === "completed" ||
                              item.status === "training_required" ||
                              item.status === "submitted_to_hr" ||
                              myReviewPerms?.canVerifyAsNursingSuper
                                ? `${Number(item.nursingSuperOverallScore || 0).toFixed(1)}/5`
                                : "Verified"}
                            </span>
                          )}
                          {item.finalScore && Number(item.finalScore) > 0 && (
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              Final: {Number(item.finalScore).toFixed(1)}/5
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto justify-center gap-1 text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        >
                          <Eye size={14} />
                          Open Workspace
                          <ChevronRight size={14} />
                        </Button>
                        {item.status === "draft" &&
                          (permissions.isAdmin ||
                            myReviewPerms?.isAdmin ||
                            myReviewPerms?.currentStaff?.staffId === item.staffId) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const isSelf = myReviewPerms?.currentStaff?.staffId === item.staffId;
                              if (
                                window.confirm(
                                  `Permanently delete ${
                                    isSelf
                                      ? "your draft self-assessment"
                                      : `DRAFT assessment for ${item.staffName}`
                                  } (${item.assessmentNo})? This action cannot be undone.`
                                )
                              ) {
                                deleteDraftMutation.mutate(item.id);
                              }
                            }}
                            disabled={deleteDraftMutation.isPending}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2 h-8"
                            title={
                              myReviewPerms?.currentStaff?.staffId === item.staffId
                                ? "Delete My Draft Self-Assessment"
                                : "Delete Draft Assessment (Admin Only)"
                            }
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Pagination footer */}
                {assessmentsData.pagination && assessmentsData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t text-xs text-muted-foreground">
                    <div>
                      Page {assessmentsData.pagination.page} of {assessmentsData.pagination.totalPages} ({assessmentsData.pagination.totalRecords} total)
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= assessmentsData.pagination.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal: Assessment Multi-Evaluator Workspace */}
        {selectedAssessmentId && (
          <AssessmentWorkspaceModal
            assessmentId={selectedAssessmentId}
            onClose={() => {
              setSelectedAssessmentId(null);
              refetchList();
              refetchCounts();
            }}
            myPerms={myReviewPerms}
          />
        )}

        {/* Modal: Initiate Staff Assessment */}
        <InitiateAssessmentModal
          isOpen={isInitiateDialogOpen}
          onClose={() => setIsInitiateDialogOpen(false)}
          cyclesList={cyclesList}
          activeCycle={activeCycle}
          onInitiate={(payload) => initiateMutation.mutate(payload)}
          isPending={initiateMutation.isPending}
          assessmentsList={assessmentsData?.data || []}
          onSelectExisting={(id) => {
            setIsInitiateDialogOpen(false);
            setSelectedAssessmentId(id);
          }}
        />

      </div>
    </ModuleLayout>
  );
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Component: Rubrics Catalog Knowledge Explorer & Management
// ---------------------------------------------------------------------------
interface RubricsCatalogViewProps {
  rubrics: any[];
  domainsList?: any[];
  canManage?: boolean;
  onRefetch?: () => void;
}

export function RubricsCatalogView({
  rubrics,
  domainsList = [],
  canManage = false,
  onRefetch,
}: RubricsCatalogViewProps) {
  const [selectedDomainCode, setSelectedDomainCode] = useState<string>("all");
  const [skillTypeFilter, setSkillTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal states
  const [isCriterionModalOpen, setIsCriterionModalOpen] = useState(false);
  const [selectedCriterionForEdit, setSelectedCriterionForEdit] = useState<any | null>(null);
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (criterionId: number) => {
      const res = await fetch(`/api/skill-assessment/criteria/${criterionId}/toggle`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to toggle status");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      onRefetch?.();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Filter criteria
  const filtered = useMemo(() => {
    let result = rubrics;
    if (selectedDomainCode !== "all") {
      result = result.filter((d) => d.code === selectedDomainCode);
    }

    // Filter criteria within each domain
    return result
      .map((dom) => {
        const matchingCriteria = (dom.criteria || []).filter((cr: any) => {
          if (skillTypeFilter !== "all" && cr.skillType !== skillTypeFilter) {
            return false;
          }
          if (statusFilter === "active" && !cr.active) return false;
          if (statusFilter === "inactive" && cr.active) return false;

          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const text = `${cr.code} ${cr.title} ${cr.description} ${cr.clinicalScenario || ""} ${cr.theoreticalGuideline} ${cr.practicalGuideline}`.toLowerCase();
            if (!text.includes(q)) return false;
          }

          return true;
        });

        return {
          ...dom,
          criteria: matchingCriteria,
        };
      })
      .filter((dom) => dom.criteria.length > 0 || (selectedDomainCode === dom.code && !searchQuery));
  }, [rubrics, selectedDomainCode, skillTypeFilter, statusFilter, searchQuery]);

  // Aggregate count of objectives
  const totalObjectivesCount = useMemo(() => {
    return rubrics.reduce((acc, dom) => acc + (dom.criteria?.length || 0), 0);
  }, [rubrics]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-muted/30 p-4 sm:p-5 rounded-2xl border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                NABH Competency Guidelines, Scenarios & Questionnaires
              </h2>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200">
                {totalObjectivesCount} Objectives
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Standard clinical benchmarks, simulation scenarios, viva questionnaires, and practical OSCE demonstration rubrics.
            </p>
          </div>

          {canManage && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDomainModalOpen(true)}
                className="gap-1.5 text-xs h-8"
              >
                <FolderPlus size={14} />
                New Domain
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedCriterionForEdit(null);
                  setIsCriterionModalOpen(true);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs h-8"
              >
                <Plus size={14} />
                Add Objective & Scenario
              </Button>
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search scenario, objective, questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border bg-background text-foreground"
            />
          </div>

          <div>
            <select
              value={selectedDomainCode}
              onChange={(e) => setSelectedDomainCode(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border bg-background text-foreground"
            >
              <option value="all">All Domains ({rubrics.length} Categories)</option>
              {rubrics.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name} ({d.criteria?.length || 0})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={skillTypeFilter}
              onChange={(e) => setSkillTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border bg-background text-foreground"
            >
              <option value="all">All Skill Types</option>
              <option value="both">Comprehensive (Theory + Practical)</option>
              <option value="theoretical">Theoretical Viva Only</option>
              <option value="practical">Practical OSCE Only</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border bg-background text-foreground"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Benchmarks</option>
              <option value="inactive">Inactive / Drafts</option>
            </select>
          </div>
        </div>
      </div>

      {/* Domain Groups & Objectives List */}
      <div className="space-y-6">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed bg-muted/20 text-muted-foreground">
            <BookOpen className="size-10 mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-semibold text-foreground">No Competency Objectives Match Filters</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Try adjusting your search keywords, domain selector, or skill evaluation type filter.
            </p>
            {canManage && (
              <Button
                size="sm"
                onClick={() => {
                  setSelectedCriterionForEdit(null);
                  setIsCriterionModalOpen(true);
                }}
                className="mt-4 bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs"
              >
                <Plus size={14} />
                Create New Objective
              </Button>
            )}
          </div>
        ) : (
          filtered.map((dom) => (
            <div key={dom.id} className="rounded-2xl border bg-card overflow-hidden shadow-2xs">
              {/* Domain Header */}
              <div className="bg-gradient-to-r from-teal-500/10 via-background to-transparent p-3.5 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-400">
                      [{dom.code}]
                    </span>
                    <span className="font-bold text-base text-foreground">{dom.name}</span>
                    {dom.nabhStandardRef && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200">
                        {dom.nabhStandardRef}
                      </span>
                    )}
                  </div>
                  {dom.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{dom.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <span className="text-xs font-bold px-2 py-1 rounded-md bg-muted text-muted-foreground">
                    {dom.criteria?.length || 0} Objectives
                  </span>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCriterionForEdit({ domainId: dom.id });
                        setIsCriterionModalOpen(true);
                      }}
                      className="h-7 text-xs text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                    >
                      <Plus size={13} />
                      Add to {dom.code}
                    </Button>
                  )}
                </div>
              </div>

              {/* Criteria in Domain */}
              <div className="divide-y divide-border">
                {dom.criteria?.map((cr: any) => (
                  <div key={cr.id} className="p-4 sm:p-5 hover:bg-muted/15 transition-colors space-y-3">
                    {/* Criterion Title Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-muted-foreground">
                            {cr.code}
                          </span>
                          <span className="font-bold text-sm text-foreground">
                            {cr.title}
                          </span>
                          {!cr.active && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{cr.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted border text-muted-foreground">
                          Target: {cr.targetScore} / 5.0
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 uppercase">
                          {cr.skillType}
                        </span>

                        {canManage && (
                          <div className="flex items-center gap-1 ml-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCriterionForEdit(cr);
                                setIsCriterionModalOpen(true);
                              }}
                              className="h-7 px-2 text-xs gap-1 text-foreground"
                            >
                              <Edit3 size={12} />
                              <span>Edit</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleStatusMutation.mutate(cr.id)}
                              title={cr.active ? "Deactivate" : "Activate"}
                              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            >
                              {cr.active ? (
                                <ToggleRight size={16} className="text-teal-600" />
                              ) : (
                                <ToggleLeft size={16} className="text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Clinical Case Simulation Scenario */}
                    {cr.clinicalScenario ? (
                      <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                        <div className="font-bold text-amber-900 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                          <Stethoscope size={13} className="text-amber-600 dark:text-amber-400" />
                          <span>Clinical Case Simulation Scenario:</span>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {cr.clinicalScenario}
                        </p>
                      </div>
                    ) : canManage ? (
                      <div className="p-2 px-3 rounded-lg border border-dashed text-[11px] text-muted-foreground/80 flex items-center justify-between bg-muted/10">
                        <span className="italic flex items-center gap-1.5">
                          <Stethoscope size={13} className="text-muted-foreground/50" />
                          No clinical simulation scenario configured yet.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCriterionForEdit(cr);
                            setIsCriterionModalOpen(true);
                          }}
                          className="text-teal-600 dark:text-teal-400 hover:underline font-semibold text-[11px] cursor-pointer"
                        >
                          + Add Scenario
                        </button>
                      </div>
                    ) : null}

                    {/* Questionnaires and Demonstration Rubrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                        <div className="font-bold text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                          <FileQuestion size={13} />
                          Theoretical Questionnaire & Viva Benchmarks
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed whitespace-pre-line">
                          {cr.theoreticalGuideline}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40">
                        <div className="font-bold text-teal-900 dark:text-teal-300 mb-1 flex items-center gap-1.5">
                          <ListChecks size={13} />
                          Practical Demonstration Checklist & OSCE Rubric
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed whitespace-pre-line">
                          {cr.practicalGuideline}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Criterion, Scenario & Questionnaire Management Form */}
      {isCriterionModalOpen && (
        <CriterionManageModal
          criterion={selectedCriterionForEdit}
          domainsList={domainsList.length > 0 ? domainsList : rubrics}
          isOpen={isCriterionModalOpen}
          onClose={() => {
            setIsCriterionModalOpen(false);
            setSelectedCriterionForEdit(null);
          }}
          onSaved={() => {
            setIsCriterionModalOpen(false);
            setSelectedCriterionForEdit(null);
            onRefetch?.();
          }}
          onOpenDomainModal={() => setIsDomainModalOpen(true)}
        />
      )}

      {/* Modal: Competency Domain Category Form */}
      {isDomainModalOpen && (
        <DomainManageModal
          isOpen={isDomainModalOpen}
          onClose={() => setIsDomainModalOpen(false)}
          onSaved={() => {
            setIsDomainModalOpen(false);
            onRefetch?.();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sample Scenarios & Questionnaires Presets for Clinical Educators
// ---------------------------------------------------------------------------
const SCENARIO_PRESETS = [
  {
    name: "Blood Transfusion Reaction",
    domainCode: "PROCEDURES",
    code: "PROC-07",
    title: "Bedside Blood Transfusion Verification & Acute Reaction Protocol",
    description: "Multi-nurse verification of cross-matched blood products and immediate management of acute transfusion reactions.",
    clinicalScenario: "A 56-year-old post-op patient is receiving their first unit of PRBC. At the 15-minute mark, the patient complains of sudden chills, lumbar back pain, and chest tightness. Vitals reveal BP 88/50 mmHg, HR 122 bpm, Temp 38.6°C (101.5°F).",
    skillType: "both",
    theoreticalGuideline: "1. State the bedside dual-independent verification checklist (patient name, UHID, blood group, donor unit number, expiry date, compatibility certificate).\n2. Explain the pathophysiological difference between febrile non-hemolytic reaction and acute hemolytic reaction.\n3. List mandatory diagnostic specimens to be sent back to the blood bank in an adverse reaction.",
    practicalGuideline: "1. Stop the blood transfusion immediately while preserving IV patency with a fresh normal saline infusion.\n2. Re-check patient wristband identity, blood unit tag, and laboratory cross-match documents.\n3. Measure vital signs immediately, notify the attending clinician and blood bank officer.\n4. Send the discontinued blood pack with intact administration set and post-reaction blood/urine samples to the blood bank.\n5. Complete the hospital Transfusion Adverse Reaction Notification Form.",
  },
  {
    name: "Drug Anaphylaxis Shock",
    domainCode: "MOM",
    code: "MOM-07",
    title: "Anaphylactic Shock Recognition & Intramuscular Epinephrine Protocol",
    description: "Rapid clinical recognition of severe drug anaphylaxis and emergency intramuscular epinephrine administration.",
    clinicalScenario: "A 32-year-old female patient receives their first dose of IV Ceftriaxone in the day-care infusion suite. Within 3 minutes, she develops facial angioedema, inspiratory stridor, diffuse wheezing, and a blood pressure drop to 78/40 mmHg.",
    skillType: "both",
    theoreticalGuideline: "1. State clinical criteria for anaphylaxis (mucocutaneous manifestations + acute airway/breathing compromise or hypotension).\n2. State first-line drug of choice, standard concentration (1:1000 vs 1:10,000), adult dose (0.5 mg / 0.5 mL), and route.\n3. Explain why the anterolateral thigh (vastus lateralis) provides faster peak plasma concentration than the deltoid.",
    practicalGuideline: "1. Stop the antibiotic infusion immediately.\n2. Call for emergency assistance / activate Code Blue / Medical Emergency Team.\n3. Administer IM Epinephrine 1:1000 (0.5 mg) into anterolateral thigh immediately without delay.\n4. Place patient recumbent with legs elevated (unless airway or breathing compromised).\n5. Deliver high-flow oxygen via non-rebreather mask and establish large-bore IV access for fluid resuscitation.",
  },
  {
    name: "High-Alert Electrolyte Verify",
    domainCode: "MOM",
    code: "MOM-08",
    title: "High-Alert IV Potassium Chloride Dilution & Dual Nurse Independent Check",
    description: "Safe preparation, dilution, programmable infusion pump setup, and independent double-check of concentrated IV electrolytes.",
    clinicalScenario: "Physician prescribes IV Potassium Chloride (KCl) 20 mEq in 500 mL Normal Saline to infuse over 4 hours for a patient with serum potassium of 2.8 mEq/L in the step-down unit.",
    skillType: "both",
    theoreticalGuideline: "1. State ISMP guidelines regarding concentrated KCl storage restrictions in general inpatient wards.\n2. State maximum peripheral IV potassium infusion rate (10 mEq/hour) and maximum peripheral concentration (40 mEq/L).\n3. Detail what constitutes an 'independent double-check' versus a passive confirmation.",
    practicalGuideline: "1. Verify physician prescription with lab report (serum potassium level) and check ampoule concentration.\n2. Invert infusion bag multiple times to ensure thorough mixing and apply fluorescent high-alert auxiliary label.\n3. Perform independent dual-nurse verification of calculation, volume, diluent, patient UHID, and infusion pump programming.\n4. Connect to infusion pump, set rate (125 mL/hr for 4 hours), monitor IV site for phlebitis, and place patient on cardiac monitor.",
  },
  {
    name: "Adult Code Blue CPR",
    domainCode: "COP_BLS",
    code: "BLS-06",
    title: "Adult In-Hospital Cardiac Arrest Response & Crash Cart Deployment",
    description: "Immediate recognition of unresponsiveness, Code Blue activation, high-quality chest compressions, and AED/defibrillator pad placement.",
    clinicalScenario: "While checking morning vitals, nurse finds a 68-year-old cardiac patient collapsed and unresponsive on the hospital bed, with agonal gasping and no palpable carotid pulse.",
    skillType: "both",
    theoreticalGuideline: "1. State AHA/NABH 2020-2025 BLS CPR sequence (C-A-B).\n2. State compression parameters for adult CPR: rate 100-120/min, depth 5-6 cm (2-2.4 in), full chest recoil, minimal interruptions (<10 sec).\n3. State shockable versus non-shockable cardiac arrest rhythms (VF / Pulseless VT vs Asystole / PEA).",
    practicalGuideline: "1. Check responsiveness and call Code Blue emergency team immediately.\n2. Check carotid pulse and breathing simultaneously for 5-10 seconds.\n3. Position cardiac backboard and initiate high-quality chest compressions (rate 100-120/min, 30:2 ratio).\n4. Direct second rescuer to bring crash cart and AED / defibrillator.\n5. Attach defibrillator pads in anterior-lateral position without interrupting compressions, follow voice prompts for shock delivery.",
  },
];

// ---------------------------------------------------------------------------
// Component: Modal Form to Manage Objectives, Scenarios & Questionnaires
// ---------------------------------------------------------------------------
interface CriterionManageModalProps {
  criterion?: any | null;
  domainsList: any[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onOpenDomainModal: () => void;
}

function CriterionManageModal({
  criterion,
  domainsList,
  isOpen,
  onClose,
  onSaved,
  onOpenDomainModal,
}: CriterionManageModalProps) {
  const isEdit = Boolean(criterion?.id);

  // Form State
  const [domainId, setDomainId] = useState<number>(
    criterion?.domainId || (domainsList[0]?.id || 1)
  );
  const [code, setCode] = useState<string>(criterion?.code || "");
  const [title, setTitle] = useState<string>(criterion?.title || "");
  const [description, setDescription] = useState<string>(criterion?.description || "");
  const [clinicalScenario, setClinicalScenario] = useState<string>(
    criterion?.clinicalScenario || ""
  );
  const [skillType, setSkillType] = useState<string>(criterion?.skillType || "both");
  const [theoreticalGuideline, setTheoreticalGuideline] = useState<string>(
    criterion?.theoreticalGuideline || ""
  );
  const [practicalGuideline, setPracticalGuideline] = useState<string>(
    criterion?.practicalGuideline || ""
  );
  const [targetScore, setTargetScore] = useState<number>(
    Number(criterion?.targetScore || 4.0)
  );
  const [weightage, setWeightage] = useState<number>(
    Number(criterion?.weightage || 1.0)
  );
  const [displayOrder, setDisplayOrder] = useState<number>(
    Number(criterion?.displayOrder || 0)
  );
  const [active, setActive] = useState<boolean>(
    criterion?.active !== undefined ? Boolean(criterion.active) : true
  );

  // Mutation for creating or updating
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!code.trim()) throw new Error("Objective code is required (e.g. HIC-05)");
      if (!title.trim()) throw new Error("Objective title is required");
      if (!description.trim()) throw new Error("Description / Scope is required");
      if (!theoreticalGuideline.trim())
        throw new Error("Theoretical questionnaire & benchmarks are required");
      if (!practicalGuideline.trim())
        throw new Error("Practical demonstration checklist & OSCE rubrics are required");

      const payload = {
        domainId: Number(domainId),
        code: code.trim().toUpperCase(),
        title: title.trim(),
        description: description.trim(),
        clinicalScenario: clinicalScenario.trim() || null,
        skillType,
        theoreticalGuideline: theoreticalGuideline.trim(),
        practicalGuideline: practicalGuideline.trim(),
        targetScore: Number(targetScore),
        weightage: Number(weightage),
        displayOrder: Number(displayOrder),
        active,
      };

      const url = isEdit
        ? `/api/skill-assessment/criteria/${criterion.id}`
        : "/api/skill-assessment/criteria";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save objective");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Objective and scenario saved successfully!");
      onSaved();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Apply scenario preset
  const handleApplyPreset = (preset: (typeof SCENARIO_PRESETS)[0]) => {
    // Find matching domain if possible
    const matchDom = domainsList.find((d) => d.code === preset.domainCode);
    if (matchDom) setDomainId(matchDom.id);
    if (!isEdit) setCode(preset.code);
    setTitle(preset.title);
    setDescription(preset.description);
    setClinicalScenario(preset.clinicalScenario);
    setSkillType(preset.skillType);
    setTheoreticalGuideline(preset.theoreticalGuideline);
    setPracticalGuideline(preset.practicalGuideline);
    toast.info(`Applied template: ${preset.name}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex sm:items-center sm:justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-background sm:rounded-2xl border-0 sm:border shadow-2xl w-full max-w-4xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b bg-muted/20 flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                <Stethoscope size={18} />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {isEdit ? `Edit Competency Objective: ${criterion.code}` : "New Competency Objective & Scenario"}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              NABH clinical guidelines measuring theoretical viva knowledge, simulated scenarios, and practical OSCE checklists.
            </p>
          </div>

          <Button variant="ghost" size="sm" onClick={onClose} className="size-8 p-0 rounded-lg">
            <XCircle size={18} />
          </Button>
        </div>

        {/* Modal Body - Scrollable Form */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Quick Preset Selector for Rapid Setup */}
          {!isEdit && (
            <div className="p-3.5 rounded-xl border bg-teal-50/40 dark:bg-teal-950/20 border-teal-200/60 dark:border-teal-900/40 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-teal-600" />
                  Load Standard NABH Simulation Scenario Template
                </span>
                <span className="text-[10px] text-muted-foreground">Click to prefill</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {SCENARIO_PRESETS.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-background hover:bg-teal-100 dark:hover:bg-teal-900/40 border border-teal-200/80 text-foreground transition-colors cursor-pointer"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 1: Domain & Objective Definition */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              1. Objective & Competency Domain
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Competency Domain <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={onOpenDomainModal}
                    className="text-[10px] text-teal-600 hover:underline font-semibold cursor-pointer"
                  >
                    + New Domain
                  </button>
                </div>
                <select
                  value={domainId}
                  onChange={(e) => setDomainId(Number(e.target.value))}
                  className="w-full p-2 text-xs rounded-lg border bg-background text-foreground"
                >
                  {domainsList.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Objective Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. HIC-05, MOM-03, BLS-02"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border bg-background font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Skill Evaluation Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={skillType}
                  onChange={(e) => setSkillType(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border bg-background text-foreground"
                >
                  <option value="both">Comprehensive (Theory + Practical OSCE)</option>
                  <option value="theoretical">Theoretical Knowledge / Viva Only</option>
                  <option value="practical">Practical Hands-on Skill Only</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Objective Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Peripheral Intravenous Line Insertion & Aseptic Cannulation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border bg-background font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Clinical Description & Scope <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Brief summary of the clinical competence benchmark and expected standard of patient care..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border bg-background leading-relaxed"
              />
            </div>
          </div>

          {/* Section 2: Clinical Simulation Scenario */}
          <div className="space-y-2 p-4 rounded-xl border bg-amber-50/30 dark:bg-amber-950/15 border-amber-200/60 dark:border-amber-900/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Stethoscope size={14} className="text-amber-600 dark:text-amber-400" />
                2. Clinical Case Simulation Scenario (Optional but Recommended)
              </label>
              <span className="text-[10px] text-muted-foreground">Presented to staff during audit</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Describe a simulated patient condition or realistic bedside scenario that staff must evaluate, react to, and demonstrate skills on.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. A 64-year-old post-op patient with a central venous catheter develops rigors and a temperature spike to 39.1°C. Walk through blood culture collection, catheter hub scrub the hub protocol, and notification of the physician..."
              value={clinicalScenario}
              onChange={(e) => setClinicalScenario(e.target.value)}
              className="w-full p-2.5 text-xs rounded-lg border bg-background leading-relaxed"
            />
          </div>

          {/* Section 3: Questionnaires & Benchmarks */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              3. Questionnaires & Evaluation Rubrics
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Theoretical Viva Questionnaire */}
              <div className="space-y-1.5 p-3.5 rounded-xl border bg-blue-50/20 dark:bg-blue-950/10 border-blue-200/60 dark:border-blue-900/40">
                <label className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <FileQuestion size={14} />
                  Theoretical Questionnaire & Viva Benchmarks <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Key questions, physiological concepts, pharmacological doses, or NABH guidelines staff must answer verbally or in writing.
                </p>
                <textarea
                  rows={4}
                  placeholder="1. What are the 5 moments of hand hygiene?\n2. What is the minimum contact time for hand rubbing vs hand washing?\n3. When are gloves mandatory vs hand rub alone?"
                  value={theoreticalGuideline}
                  onChange={(e) => setTheoreticalGuideline(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg border bg-background font-sans leading-relaxed"
                />
              </div>

              {/* Practical OSCE Demonstration Checklist */}
              <div className="space-y-1.5 p-3.5 rounded-xl border bg-teal-50/20 dark:bg-teal-950/10 border-teal-200/60 dark:border-teal-900/40">
                <label className="text-xs font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                  <ListChecks size={14} />
                  Practical Demonstration Checklist & OSCE Rubric <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Hands-on observable procedural steps, aseptic technique verification, and critical safety actions to observe.
                </p>
                <textarea
                  rows={4}
                  placeholder="1. Verifies patient identification using 2 identifiers (Name + UHID).\n2. Gathers and inspects all supplies for sterility.\n3. Demonstrates step-by-step 6-step aseptic hand hygiene before touching patient.\n4. Discards sharps into puncture-proof white container immediately without recapping."
                  value={practicalGuideline}
                  onChange={(e) => setPracticalGuideline(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg border bg-background font-sans leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Scoring Benchmarks & Weights */}
          <div className="space-y-3 pt-1">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              4. Scoring Target & Order
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Target Benchmark Score (1-5)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={targetScore}
                  onChange={(e) => setTargetScore(parseFloat(e.target.value) || 4.0)}
                  className="w-full p-2 text-xs rounded-lg border bg-background font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Weightage Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={weightage}
                  onChange={(e) => setWeightage(parseFloat(e.target.value) || 1.0)}
                  className="w-full p-2 text-xs rounded-lg border bg-background font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Display Order
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2 text-xs rounded-lg border bg-background font-mono"
                />
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <label className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="size-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Active Benchmark</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t bg-muted/10 flex items-center justify-end gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saveMutation.isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending && <RefreshCw size={13} className="animate-spin" />}
            {isEdit ? "Update Objective & Scenario" : "Create Objective & Scenario"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: Modal Form to Create a Competency Domain Category
// ---------------------------------------------------------------------------
interface DomainManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function DomainManageModal({ isOpen, onClose, onSaved }: DomainManageModalProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [nabhStandardRef, setNabhStandardRef] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);

  const createDomainMutation = useMutation({
    mutationFn: async () => {
      if (!code.trim()) throw new Error("Domain code is required (e.g. COP_ICU)");
      if (!name.trim()) throw new Error("Domain name is required");

      const res = await fetch("/api/skill-assessment/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          nabhStandardRef: nabhStandardRef.trim() || null,
          description: description.trim() || null,
          displayOrder: Number(displayOrder) || 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create domain");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Domain created successfully!");
      onSaved();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex sm:items-center sm:justify-center p-0 sm:p-4 overflow-hidden">
      <div className="bg-background sm:rounded-2xl border-0 sm:border shadow-2xl w-full max-w-lg h-full sm:h-auto flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
        <div className="p-4 sm:p-5 border-b bg-muted/20 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
              <FolderPlus size={18} />
            </span>
            <h2 className="text-base font-bold text-foreground">New Competency Domain</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="size-8 p-0 rounded-lg">
            <XCircle size={18} />
          </Button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Domain Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. COP_ICU, EMER_TRAUMA, NICU_CARE"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border bg-background font-mono font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Domain Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Intensive Care & Mechanical Ventilation Protocols"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border bg-background font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              NABH Standard Reference
            </label>
            <input
              type="text"
              placeholder="e.g. NABH 5th Ed: COP.8, COP.9"
              value={nabhStandardRef}
              onChange={(e) => setNabhStandardRef(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border bg-background"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Domain Scope & Description
            </label>
            <textarea
              rows={3}
              placeholder="High-level description of clinical competencies covered under this domain..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border bg-background leading-relaxed"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Display Order</label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
              className="w-full p-2 text-xs rounded-lg border bg-background font-mono"
            />
          </div>
        </div>

        <div className="p-4 border-t bg-muted/10 flex items-center justify-end gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={createDomainMutation.isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
            onClick={() => createDomainMutation.mutate()}
            disabled={createDomainMutation.isPending}
          >
            {createDomainMutation.isPending && <RefreshCw size={13} className="animate-spin" />}
            Save Domain
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: Analytics & Competency Training Dashboard
// ---------------------------------------------------------------------------
function AnalyticsDashboardView({ analytics }: { analytics: any }) {
  if (!analytics) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground">
        Loading analytics...
      </div>
    );
  }

  const { kpis, levelCounts, departmentStats } = analytics;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <div className="p-3 sm:p-4 rounded-xl border bg-card shadow-2xs">
          <div className="text-xs text-muted-foreground">Total Audits</div>
          <div className="text-xl sm:text-2xl font-bold text-foreground mt-1">{kpis.total}</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border bg-card shadow-2xs">
          <div className="text-xs text-muted-foreground">Finalized & Certified</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis.completed}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border bg-card shadow-2xs">
          <div className="text-xs text-muted-foreground">Pending Incharge</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {kpis.pendingIncharge}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border bg-card shadow-2xs">
          <div className="text-xs text-muted-foreground">Pending Super</div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {kpis.pendingSuper}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border bg-card shadow-2xs">
          <div className="text-xs text-muted-foreground">Pending HR</div>
          <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {kpis.pendingHr}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border bg-card shadow-2xs">
          <div className="text-xs text-muted-foreground">NABH Compliance</div>
          <div className="text-xl sm:text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">
            {kpis.complianceRate}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Competency Level Distribution */}
        <div className="p-5 rounded-2xl border bg-card space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp size={16} className="text-teal-600" />
            Clinical Competency Level Distribution
          </h3>

          <div className="space-y-3">
            {Object.entries(levelCounts || {}).map(([level, count]: any) => (
              <div key={level} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{level}</span>
                  <span className="text-muted-foreground">{count} Staff</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      level === "Exemplary"
                        ? "bg-emerald-500"
                        : level === "Competent"
                        ? "bg-teal-500"
                        : level === "Developing"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    )}
                    style={{
                      width: `${kpis.completed > 0 ? (count / kpis.completed) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department-wise Competency Average */}
        <div className="p-5 rounded-2xl border bg-card space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Building2 size={16} className="text-teal-600" />
            Department Clinical Score Index
          </h3>

          <div className="divide-y divide-border">
            {(departmentStats || []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No finalized departmental score records yet.
              </p>
            ) : (
              (departmentStats || []).map((ds: any) => (
                <div key={ds.department} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-foreground">{ds.department}</span>
                    <span className="text-[11px] text-muted-foreground ml-2">
                      ({ds.assessedStaff} assessed)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                      {ds.averageScore} / 5.0
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: Interactive Multi-Evaluator Workspace Modal
// ---------------------------------------------------------------------------
export function AssessmentWorkspaceModal({
  assessmentId,
  onClose,
  myPerms,
}: {
  assessmentId: number;
  onClose: () => void;
  myPerms: any;
}) {
  const queryClient = useQueryClient();

  // Fetch full assessment record
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["skill-assessment-detail", assessmentId],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const res = await fetch(`/api/skill-assessment/${assessmentId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load assessment details");
      }
      return res.json();
    },
  });

  const assessment = data?.assessment;
  const initialItems = useMemo(() => data?.items || [], [data?.items]);
  const cbtTheoryScore = data?.cbtTheoryScore ?? null;
  const cbtDomainRatings = useMemo<Record<string, number>>(() => data?.cbtDomainRatings ?? {}, [data?.cbtDomainRatings]);

  // Local state for scores per criterion item
  const [itemsState, setItemsState] = useState<Record<number, any>>({});
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>("all");

  // Review decision states
  const [selfRemarks, setSelfRemarks] = useState("");
  const [inchargeDecision, setInchargeDecision] = useState("recommended");
  const [inchargeRemarks, setInchargeRemarks] = useState("");
  const [superDecision, setSuperDecision] = useState("verified_competent");
  const [superRemarks, setSuperRemarks] = useState("");
  const [clinicalStrengths, setClinicalStrengths] = useState("");
  const [improvementAreas, setImprovementAreas] = useState("");
  const [hrDecision, setHrDecision] = useState("approved");
  const [competencyLevel, setCompetencyLevel] = useState("Competent");
  const [assignedTrainings, setAssignedTrainings] = useState<string[]>([]);
  const [hrRemarks, setHrRemarks] = useState("");
  const [showAllStagesAdmin, setShowAllStagesAdmin] = useState(false);

  // Sync state when data loads
  React.useEffect(() => {
    if (initialItems.length > 0) {
      const map: Record<number, any> = {};
      initialItems.forEach((it: any) => {
        map[it.criterionId] = {
          criterionId: it.criterionId,
          selfTheoreticalScore: ["draft", "revision_requested"].includes(assessment?.status)
            ? cbtDomainRatings[it.domainCode] ?? null : it.selfTheoreticalScore == null ? null : Number(it.selfTheoreticalScore),
          selfPracticalScore: Number(it.selfPracticalScore) > 0 ? Number(it.selfPracticalScore) : null,
          selfComments: it.selfComments || "",
          inchargeTheoreticalScore: Number(it.inchargeTheoreticalScore) > 0 ? Number(it.inchargeTheoreticalScore) : null,
          inchargePracticalScore: Number(it.inchargePracticalScore) > 0 ? Number(it.inchargePracticalScore) : null,
          inchargeComments: it.inchargeComments || "",
          nursingSuperTheoreticalScore: Number(it.nursingSuperTheoreticalScore) > 0 ? Number(it.nursingSuperTheoreticalScore) : null,
          nursingSuperPracticalScore: Number(it.nursingSuperPracticalScore) > 0 ? Number(it.nursingSuperPracticalScore) : null,
          nursingSuperComments: it.nursingSuperComments || "",
        };
      });
      setItemsState(map);
    }
    if (assessment) {
      setSelfRemarks(assessment.selfRemarks || "");
      setInchargeDecision(assessment.inchargeDecision || "recommended");
      setInchargeRemarks(assessment.inchargeRemarks || "");
      setSuperDecision(assessment.nursingSuperDecision || "verified_competent");
      setSuperRemarks(assessment.nursingSuperRemarks || "");
      setClinicalStrengths(assessment.clinicalStrengths || "");
      setImprovementAreas(assessment.improvementAreas || "");
      setHrDecision(assessment.hrDecision || "approved");
      setCompetencyLevel(assessment.competencyLevel || "Competent");
      setAssignedTrainings(assessment.assignedTrainings || []);
      setHrRemarks(assessment.hrRemarks || "");
    }
  }, [assessment, initialItems, cbtTheoryScore, cbtDomainRatings]);

  // Stage 1: Self Submit
  const selfSubmitMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      const itemsPayload = Object.values(itemsState).map((it) => ({
        criterionId: it.criterionId,
        selfTheoreticalScore: it.selfTheoreticalScore ?? null,
        selfPracticalScore: it.selfPracticalScore ?? null,
        selfComments: it.selfComments || null,
      }));
      const res = await fetch(`/api/skill-assessment/${assessmentId}/self-submit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsPayload,
          selfRemarks,
          isDraftOnly: isDraft,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit self-assessment");
      }
      return res.json();
    },
    onSuccess: (res) => {
      toast.success(res.message);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["skill-assessments-list"] });
      queryClient.invalidateQueries({ queryKey: ["skill-assessment-pending-counts"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Stage 2: Incharge Submit
  const inchargeSubmitMutation = useMutation({
    mutationFn: async () => {
      const itemsPayload = Object.values(itemsState).map((it) => ({
        criterionId: it.criterionId,
        inchargeTheoreticalScore: it.inchargeTheoreticalScore ?? null,
        inchargePracticalScore: it.inchargePracticalScore ?? null,
        inchargeComments: it.inchargeComments || null,
      }));
      const res = await fetch(`/api/skill-assessment/${assessmentId}/incharge-submit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsPayload,
          decision: inchargeDecision,
          inchargeRemarks,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit incharge evaluation");
      }
      return res.json();
    },
    onSuccess: (res) => {
      toast.success(res.message);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["skill-assessments-list"] });
      queryClient.invalidateQueries({ queryKey: ["skill-assessment-pending-counts"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Stage 3: Nursing Super Submit
  const superSubmitMutation = useMutation({
    mutationFn: async () => {
      const itemsPayload = Object.values(itemsState).map((it) => ({
        criterionId: it.criterionId,
        nursingSuperTheoreticalScore: it.nursingSuperTheoreticalScore ?? null,
        nursingSuperPracticalScore: it.nursingSuperPracticalScore ?? null,
        nursingSuperComments: it.nursingSuperComments || null,
      }));
      const res = await fetch(`/api/skill-assessment/${assessmentId}/nursing-super-submit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsPayload,
          decision: superDecision,
          nursingSuperRemarks: superRemarks,
          clinicalStrengths,
          improvementAreas,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit nursing supervisor review");
      }
      return res.json();
    },
    onSuccess: (res) => {
      toast.success(res.message);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["skill-assessments-list"] });
      queryClient.invalidateQueries({ queryKey: ["skill-assessment-pending-counts"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Stage 4: HR Final Sign-off
  const hrSignoffMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/skill-assessment/${assessmentId}/hr-signoff`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hrDecision,
          competencyLevel,
          assignedTrainings,
          hrRemarks,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to finalize HR sign-off");
      }
      return res.json();
    },
    onSuccess: (res) => {
      toast.success(res.message);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["skill-assessments-list"] });
      queryClient.invalidateQueries({ queryKey: ["skill-assessment-pending-counts"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete Draft Assessment Mutation (Admin Only)
  const deleteDraftMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/skill-assessment/${assessmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete assessment");
      }
      return res.json();
    },
    onSuccess: (res) => {
      toast.success(res.message || "Draft assessment deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["skill-assessments-list"] });
      queryClient.invalidateQueries({ queryKey: ["skill-assessment-pending-counts"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isError || (!isLoading && !assessment)) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div role="alert" className="bg-background rounded-2xl p-6 border shadow-xl text-center space-y-4 max-w-md">
          <AlertTriangle className="size-8 mx-auto text-amber-600" />
          <p className="text-sm font-semibold">Unable to load assessment</p>
          <p className="text-xs text-muted-foreground">{error?.message || "The assessment is unavailable."}</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !assessment) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-background rounded-2xl p-6 border shadow-xl text-center space-y-2">
          <RefreshCw className="size-8 animate-spin mx-auto text-teal-600" />
          <p className="text-sm font-semibold">Loading Assessment Workspace...</p>
        </div>
      </div>
    );
  }

  const isCandidateSelf =
    myPerms?.currentStaff?.staffId === assessment.staffId || myPerms?.isAdmin;
  const canInchargeReview =
    assessment.status === "submitted_to_incharge" &&
    (myPerms?.canAssessAsIncharge || myPerms?.isAdmin);
  const canSuperReview =
    assessment.status === "submitted_to_nursing_super" &&
    (myPerms?.canVerifyAsNursingSuper || myPerms?.isAdmin);
  const canHrSignOff =
    assessment.status === "submitted_to_hr" &&
    (myPerms?.canSignOffAsHr || myPerms?.isAdmin);

  const canToggleAllStages = Boolean(myPerms?.isAdmin || myPerms?.canSignOffAsHr);

  // Stage & step isolation rules:
  // Hide assessment scores that do not belong to the current evaluation step,
  // enabling strict blind, unbiased assessment per NABH workflow.
  const isCompletedOrHrReview =
    assessment.status === "submitted_to_hr" ||
    assessment.status === "completed" ||
    assessment.status === "training_required";

  const isStep1Self = assessment.status === "draft" || assessment.status === "revision_requested";
  const isSelfAssessmentView = isStep1Self && myPerms?.currentStaff?.staffId === assessment.staffId && !showAllStagesAdmin;
  const isStep2Incharge = assessment.status === "submitted_to_incharge";
  const isStep3Super = assessment.status === "submitted_to_nursing_super";

  const showSelfStage =
    showAllStagesAdmin ||
    isCompletedOrHrReview ||
    isStep1Self ||
    (isCandidateSelf && !canInchargeReview && !canSuperReview && !canHrSignOff);

  const showInchargeStage =
    showAllStagesAdmin ||
    isCompletedOrHrReview ||
    isStep2Incharge;

  const showSuperStage =
    showAllStagesAdmin ||
    isCompletedOrHrReview ||
    isStep3Super;

  const visibleStagesCount = [showSelfStage, showInchargeStage, showSuperStage].filter(Boolean).length;

  const cfg = STATUS_CONFIG[assessment.status] || STATUS_CONFIG.draft;

  // Filter items by domain tab
  const domainTabs = Array.from(
    new Set(initialItems.map((it: any) => it.domainCode))
  ) as string[];

  const filteredItems = initialItems.filter((it: any) => {
    if (selectedDomainFilter === "all") return true;
    return it.domainCode === selectedDomainFilter;
  });

  return (
    <div id="printable-assessment" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex sm:items-center sm:justify-center p-0 sm:p-4 overflow-hidden">
      <div className="assessment-print-dialog bg-background sm:rounded-2xl border-0 sm:border shadow-2xl w-full max-w-6xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400">
                {assessment.assessmentNo}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] sm:text-xs font-semibold border",
                  cfg.bg,
                  cfg.color,
                  cfg.border
                )}
              >
                {cfg.icon}
                {cfg.label}
              </span>
              {assessment.competencyLevel && (
                <span className="text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                  Level: {assessment.competencyLevel}
                </span>
              )}
              {(assessment.cycleTitle || assessment.startDate || assessment.cycleStartDate) && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] sm:text-xs font-medium bg-muted text-muted-foreground border">
                  <Calendar size={11} className="text-teal-600 dark:text-teal-400" />
                  <span>
                    {assessment.cycleTitle || "Period"}: {fmtDate(assessment.startDate || assessment.cycleStartDate)} – {fmtDate(assessment.endDate || assessment.cycleEndDate)}
                  </span>
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span>{assessment.staffName}</span>
              <span className="text-xs text-muted-foreground font-mono">
                ({assessment.employeeCode})
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
              <span className="text-xs font-medium text-muted-foreground">
                {assessment.departmentName}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
              <span className="text-xs text-muted-foreground">
                {assessment.designation}
              </span>
            </h2>
          </div>

          <div className="print:hidden flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
            {canToggleAllStages && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllStagesAdmin((prev) => !prev)}
                className="gap-1.5 text-xs h-8 border-dashed"
                title={showAllStagesAdmin ? "Switch to Blind Step View" : "Admin/HR: Show All Evaluator Stages"}
              >
                {showAllStagesAdmin ? (
                  <EyeOff size={13} className="text-amber-600" />
                ) : (
                  <Eye size={13} className="text-teal-600" />
                )}
                <span className="hidden sm:inline">
                  {showAllStagesAdmin ? "Audit View (All Stages)" : "Blind Step View"}
                </span>
              </Button>
            )}
            {(myPerms?.isAdmin || myPerms?.isHr) && <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs h-8"
            >
              <Printer size={13} />
              <span className="hidden sm:inline">Print NABH Form</span>
              <span className="sm:hidden">Print</span>
            </Button>}
            <Button variant="ghost" size="sm" onClick={onClose} className="size-8 p-0 rounded-lg">
              <XCircle size={18} />
            </Button>
          </div>
        </div>

        {/* Modal Content - Scrollable Body */}
        <div className="assessment-print-content flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 sm:space-y-6">
          {/* Audit Stepper Banner */}
          <div className="p-3 sm:p-4 rounded-xl border bg-muted/20 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 text-xs">
            <div>
              <div className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase">1. Staff Self Rating</div>
              <div className="mt-1 font-semibold text-foreground text-[11px] sm:text-xs">
                {assessment.selfAssessedAt ? (
                  showSelfStage ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Done ({fmtDate(assessment.selfAssessedAt)}) • {Number(assessment.selfOverallScore).toFixed(1)}/5
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Submitted ({fmtDate(assessment.selfAssessedAt)}) • <span className="text-muted-foreground font-normal italic">Score Masked</span>
                    </span>
                  )
                ) : (
                  <span className="text-amber-600">Pending Candidate</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase">2. Dept Incharge</div>
              <div className="mt-1 font-semibold text-foreground text-[11px] sm:text-xs">
                {assessment.inchargeAssessedAt ? (
                  showInchargeStage ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Verified ({fmtDate(assessment.inchargeAssessedAt)}) • {Number(assessment.inchargeOverallScore).toFixed(1)}/5
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Verified ({fmtDate(assessment.inchargeAssessedAt)}) • <span className="text-muted-foreground font-normal italic">Score Masked</span>
                    </span>
                  )
                ) : (
                  <span className="text-muted-foreground">Pending Review</span>
                )}
              </div>
              {assessment.inchargeName && (
                <div className="text-[10px] text-muted-foreground">By: {assessment.inchargeName}</div>
              )}
            </div>

            <div>
              <div className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase">3. Nursing Supervisor</div>
              <div className="mt-1 font-semibold text-foreground text-[11px] sm:text-xs">
                {assessment.nursingSuperAssessedAt ? (
                  showSuperStage ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Verified ({fmtDate(assessment.nursingSuperAssessedAt)}) • {Number(assessment.nursingSuperOverallScore).toFixed(1)}/5
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Verified ({fmtDate(assessment.nursingSuperAssessedAt)}) • <span className="text-muted-foreground font-normal italic">Score Masked</span>
                    </span>
                  )
                ) : (
                  <span className="text-muted-foreground">Pending Super</span>
                )}
              </div>
              {assessment.nursingSuperName && (
                <div className="text-[10px] text-muted-foreground">By: {assessment.nursingSuperName}</div>
              )}
            </div>

            <div>
              <div className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase">4. HR Final Sign-Off</div>
              <div className="mt-1 font-semibold text-foreground text-[11px] sm:text-xs">
                {assessment.hrCompletedAt ? (
                  <span className="text-purple-600 dark:text-purple-400 font-bold">
                    Archived ({fmtDate(assessment.hrCompletedAt)}) • {assessment.competencyLevel}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Pending Sign-off</span>
                )}
              </div>
              {assessment.hrUserName && (
                <div className="text-[10px] text-muted-foreground">By: {assessment.hrUserName}</div>
              )}
            </div>
          </div>

          {/* Compact objective filters wrap within the modal instead of scrolling horizontally. */}
          <div className="print:hidden flex flex-wrap items-start gap-1.5 max-w-full">
            <button
              type="button"
              aria-pressed={selectedDomainFilter === "all"}
              onClick={() => setSelectedDomainFilter("all")}
              className={cn(
                "max-w-full px-2.5 py-1 text-[8px] leading-snug font-medium rounded-full border transition-colors cursor-pointer whitespace-normal text-left break-words",
                selectedDomainFilter === "all"
                  ? "bg-teal-600 border-teal-600 text-white"
                  : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
              )}
            >
              All Objectives ({initialItems.length})
            </button>
            {domainTabs.map((dCode) => {
              const domName = initialItems.find((it: any) => it.domainCode === dCode)?.domainName || dCode;
              return (
                <button
                  key={dCode}
                  type="button"
                  aria-pressed={selectedDomainFilter === dCode}
                  onClick={() => setSelectedDomainFilter(dCode)}
                  className={cn(
                    "max-w-full px-2.5 py-1 text-[8px] leading-snug font-medium rounded-full border transition-colors cursor-pointer whitespace-normal text-left break-words",
                    selectedDomainFilter === dCode
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {domName}
                </button>
              );
            })}
          </div>

          {/* Criteria Evaluation List */}
          <div className="space-y-4">
            {filteredItems.map((item: any) => {
              const state = itemsState[item.criterionId] || {};
              const editableSelf =
                (assessment.status === "draft" || assessment.status === "revision_requested") &&
                isCandidateSelf;
              const editableIncharge = canInchargeReview;
              const editableSuper = canSuperReview;
              const domainTheory = isStep1Self ? cbtDomainRatings[item.domainCode] ?? null : state.selfTheoreticalScore ?? null;

              return (
                <div
                  key={item.criterionId}
                  className="assessment-print-item p-3.5 sm:p-4 rounded-xl border bg-card space-y-3 shadow-2xs"
                >
                  {/* Criterion Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400">
                          {item.criterionCode}
                        </span>
                        <span className="max-w-full rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[8px] font-medium leading-snug text-foreground break-words">
                          {item.criterionTitle}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 uppercase">
                          {item.skillType}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {item.criterionDescription}
                      </p>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-[11px] font-mono font-semibold text-muted-foreground">
                        Domain: {item.domainCode} ({item.nabhStandardRef})
                      </span>
                    </div>
                  </div>

                  {/* Clinical Case Simulation Scenario */}
                  {item.clinicalScenario && (
                    <div className="p-2 sm:p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px]">
                      <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5 flex items-center gap-1.5">
                        <Stethoscope size={13} className="text-amber-600 dark:text-amber-400" />
                        Clinical Case Simulation Scenario:
                      </span>
                      <span className="text-muted-foreground leading-relaxed">
                        {item.clinicalScenario}
                      </span>
                    </div>
                  )}

                  {/* Benchmark Guidelines Box */}
                  <div className={cn("grid grid-cols-1 gap-2 text-xs", !isSelfAssessmentView && "md:grid-cols-2")}>
                    {!isSelfAssessmentView && <div className="p-2 sm:p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 text-[11px]">
                      <span className="font-bold text-blue-900 dark:text-blue-300 block mb-0.5">
                        📘 Theoretical Knowledge Benchmark:
                      </span>
                      <span className="text-muted-foreground leading-relaxed">{item.theoreticalGuideline}</span>
                    </div>}

                    <div className="p-2 sm:p-2.5 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/50 text-[11px]">
                      <span className="font-bold text-teal-900 dark:text-teal-300 block mb-0.5">
                        {isSelfAssessmentView ? "What you should be able to demonstrate" : "🛠️ Practical Skill Demonstration:"}
                      </span>
                      <span className="text-muted-foreground leading-relaxed">{item.practicalGuideline}</span>
                    </div>
                  </div>

                  {/* Multi-Evaluator Scoring Grid */}
                  <div
                    className={cn(
                      "grid gap-2.5 sm:gap-3 pt-2 border-t",
                      visibleStagesCount === 1
                        ? "grid-cols-1"
                        : visibleStagesCount === 2
                        ? "grid-cols-1 md:grid-cols-2"
                        : "grid-cols-1 lg:grid-cols-3"
                    )}
                  >
                    {/* Evaluator 1: Candidate Self */}
                    {showSelfStage && (
                      <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
                        <div className="text-xs font-bold text-foreground flex items-center justify-between">
                          <span>1. Staff Self Assessment</span>
                          <span className="text-[11px] text-teal-700 dark:text-teal-400 font-mono">
                            {domainTheory === null ? (cbtTheoryScore === null ? "Pending CBT" : "Theory not assessed") : `Avg: ${((domainTheory + (state.selfPracticalScore || 0)) / 2).toFixed(1)}/5`}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground shrink-0">Theory:</span>
                            <span className="text-xs font-mono" title="Theory uses the CBT questions in this objective's domain, not the overall exam score.">
                              {domainTheory === null
                                ? (cbtTheoryScore === null ? "Pending CBT" : "Not assessed in CBT")
                                : `${Number(domainTheory).toFixed(1)}/5${cbtTheoryScore !== null ? " (CBT)" : ""}`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground shrink-0">Practical:</span>
                            <ScorePicker
                              value={state.selfPracticalScore || 0}
                              onChange={(val) => {
                                if (!editableSelf) return;
                                setItemsState((prev) => ({
                                  ...prev,
                                  [item.criterionId]: {
                                    ...prev[item.criterionId],
                                    selfPracticalScore: val,
                                  },
                                }));
                              }}
                              disabled={!editableSelf}
                            />
                          </div>

                          {editableSelf ? (
                            <input
                              type="text"
                              placeholder="Optional self remarks..."
                              value={state.selfComments || ""}
                              onChange={(e) =>
                                setItemsState((prev) => ({
                                  ...prev,
                                  [item.criterionId]: {
                                    ...prev[item.criterionId],
                                    selfComments: e.target.value,
                                  },
                                }))
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded border bg-background"
                            />
                          ) : state.selfComments ? (
                            <p className="text-[10px] text-muted-foreground italic">
                              "{state.selfComments}"
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Evaluator 2: Dept Incharge */}
                    {showInchargeStage && (
                      <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
                        <div className="text-xs font-bold text-foreground flex items-center justify-between">
                          <span>2. Dept Incharge</span>
                          <span className="text-[11px] text-blue-700 dark:text-blue-400 font-mono">
                            Avg: {(((state.inchargeTheoreticalScore || 0) + (state.inchargePracticalScore || 0)) / 2).toFixed(1)}/5
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground shrink-0">Theory:</span>
                            <ScorePicker
                              value={state.inchargeTheoreticalScore || 0}
                              onChange={(val) => {
                                if (!editableIncharge) return;
                                setItemsState((prev) => ({
                                  ...prev,
                                  [item.criterionId]: {
                                    ...prev[item.criterionId],
                                    inchargeTheoreticalScore: val,
                                  },
                                }));
                              }}
                              disabled={!editableIncharge}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground shrink-0">Practical:</span>
                            <ScorePicker
                              value={state.inchargePracticalScore || 0}
                              onChange={(val) => {
                                if (!editableIncharge) return;
                                setItemsState((prev) => ({
                                  ...prev,
                                  [item.criterionId]: {
                                    ...prev[item.criterionId],
                                    inchargePracticalScore: val,
                                  },
                                }));
                              }}
                              disabled={!editableIncharge}
                            />
                          </div>

                          {editableIncharge ? (
                            <input
                              type="text"
                              placeholder="Incharge observations..."
                              value={state.inchargeComments || ""}
                              onChange={(e) =>
                                setItemsState((prev) => ({
                                  ...prev,
                                  [item.criterionId]: {
                                    ...prev[item.criterionId],
                                    inchargeComments: e.target.value,
                                  },
                                }))
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded border bg-background"
                            />
                          ) : state.inchargeComments ? (
                            <p className="text-[10px] text-muted-foreground italic">
                              "{state.inchargeComments}"
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Evaluator 3: Nursing Supervisor */}
                    {showSuperStage && (
                      <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
                        <div className="text-xs font-bold text-foreground flex items-center justify-between">
                          <span>3. Nursing Supervisor</span>
                          <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-mono">
                            Avg: {(((state.nursingSuperTheoreticalScore || 0) + (state.nursingSuperPracticalScore || 0)) / 2).toFixed(1)}/5
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground shrink-0">Theory:</span>
                            <ScorePicker
                              value={state.nursingSuperTheoreticalScore || 0}
                              onChange={(val) => {
                                if (!editableSuper) return;
                                setItemsState((prev) => ({
                                  ...prev,
                                  [item.criterionId]: {
                                    ...prev[item.criterionId],
                                    nursingSuperTheoreticalScore: val,
                                  },
                                }));
                              }}
                              disabled={!editableSuper}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground shrink-0">Practical:</span>
                            <ScorePicker
                              value={state.nursingSuperPracticalScore || 0}
                              onChange={(val) => {
                                if (!editableSuper) return;
                                setItemsState((prev) => ({
                                  ...prev,
                                  [item.criterionId]: {
                                    ...prev[item.criterionId],
                                    nursingSuperPracticalScore: val,
                                  },
                                }));
                              }}
                              disabled={!editableSuper}
                            />
                          </div>

                          {editableSuper ? (
                            <input
                              type="text"
                              placeholder="Supervisor remarks..."
                              value={state.nursingSuperComments || ""}
                              onChange={(e) =>
                                setItemsState((prev) => ({
                                  ...prev,
                                  [item.criterionId]: {
                                    ...prev[item.criterionId],
                                    nursingSuperComments: e.target.value,
                                  },
                                }))
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded border bg-background"
                            />
                          ) : state.nursingSuperComments ? (
                            <p className="text-[10px] text-muted-foreground italic">
                              "{state.nursingSuperComments}"
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Workflow Action Panel Based on Role & State */}
          <div className="p-3.5 sm:p-5 rounded-2xl border bg-muted/30 space-y-4">
            <h3 className="text-sm font-bold text-foreground">
              Workflow Stage Actions & Remarks
            </h3>

            {/* Stage 1 Actions (Staff Self) */}
            {isCandidateSelf && (assessment.status === "draft" || assessment.status === "revision_requested") && (
              <div className="space-y-3">
                {cbtTheoryScore === null && <p className="text-xs text-muted-foreground">Theory is pending your online CBT result. You can save practical ratings as a draft; complete the CBT before submitting.</p>}
                {cbtTheoryScore !== null && <p className="text-xs text-muted-foreground">Theory averages {data?.cbtAttemptCount ?? 0} completed CBT exams within this assessment period, separately for each objective’s domain. Domains without exam questions remain unassessed; you can still submit completed practical ratings.</p>}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Candidate Self Remarks / Learning Needs
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter any self-observed learning needs or comments before submitting to Dept Incharge..."
                    value={selfRemarks}
                    onChange={(e) => setSelfRemarks(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-lg border bg-background"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto justify-center"
                    onClick={() => selfSubmitMutation.mutate(true)}
                    disabled={selfSubmitMutation.isPending}
                  >
                    Save Draft
                  </Button>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto justify-center bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => selfSubmitMutation.mutate(false)}
                    disabled={selfSubmitMutation.isPending || cbtTheoryScore === null}
                    title={cbtTheoryScore === null ? "Complete the online CBT exam before submitting. You can still save a draft." : undefined}
                  >
                    Submit Self-Assessment to Dept Incharge
                  </Button>
                </div>
              </div>
            )}

            {/* Stage 2 Actions (Dept Incharge) */}
            {canInchargeReview && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Incharge Evaluation Decision
                    </label>
                    <select
                      value={inchargeDecision}
                      onChange={(e) => setInchargeDecision(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg border bg-background"
                    >
                      <option value="recommended">Recommended as Competent (Forward to Nursing Super)</option>
                      <option value="needs_supervised_practice">Requires Supervised Practice</option>
                      <option value="remedial_training_needed">Remedial In-Service Training Needed</option>
                      <option value="revision_requested">Request Revision from Staff</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Incharge Clinical Observations & Remarks
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Procedural skills observed, adherence to hospital protocols..."
                      value={inchargeRemarks}
                      onChange={(e) => setInchargeRemarks(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg border bg-background"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end">
                  <Button
                    size="sm"
                    className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => inchargeSubmitMutation.mutate()}
                    disabled={inchargeSubmitMutation.isPending || !inchargeRemarks}
                  >
                    Submit Incharge Evaluation
                  </Button>
                </div>
              </div>
            )}

            {/* Stage 3 Actions (Nursing Supervisor) */}
            {canSuperReview && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Nursing Supervisor Recommendation
                    </label>
                    <select
                      value={superDecision}
                      onChange={(e) => setSuperDecision(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg border bg-background"
                    >
                      <option value="verified_competent">Verified Competent (Forward to HR)</option>
                      <option value="conditional_training">Conditional Approval with Mandatory CNE</option>
                      <option value="reassessment_recommended">Re-assessment Recommended</option>
                      <option value="revision_requested">Return for Revision</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Clinical Strengths
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Excellent aseptic technique, swift BLS response"
                      value={clinicalStrengths}
                      onChange={(e) => setClinicalStrengths(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg border bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Identified Improvement Areas
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Needs CNE in high-alert drug dosage calculation"
                      value={improvementAreas}
                      onChange={(e) => setImprovementAreas(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg border bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Supervisory Review Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Supervisory assessment notes..."
                    value={superRemarks}
                    onChange={(e) => setSuperRemarks(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-lg border bg-background"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end">
                  <Button
                    size="sm"
                    className="w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => superSubmitMutation.mutate()}
                    disabled={superSubmitMutation.isPending || !superRemarks}
                  >
                    Submit Supervisor Verification & Forward to HR
                  </Button>
                </div>
              </div>
            )}

            {/* Stage 4 Actions (HR Final Sign-Off) */}
            {canHrSignOff && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      HR Decision
                    </label>
                    <select
                      value={hrDecision}
                      onChange={(e) => setHrDecision(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg border bg-background"
                    >
                      <option value="approved">Approved & Finalized (Meets Standards)</option>
                      <option value="training_assigned">Approved with Assigned Training Modules</option>
                      <option value="needs_reassessment">Needs Re-assessment</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      NABH Competency Band
                    </label>
                    <select
                      value={competencyLevel}
                      onChange={(e) => setCompetencyLevel(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg border bg-background"
                    >
                      <option value="Exemplary">Exemplary (Score &gt;= 4.5)</option>
                      <option value="Competent">Competent (Score 3.5 - 4.4)</option>
                      <option value="Developing">Developing (Score 2.5 - 3.4)</option>
                      <option value="Needs Immediate Training">Needs Immediate Training (&lt; 2.5)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Assign Mandatory Training Topics
                    </label>
                    <div className="flex gap-1.5 flex-wrap">
                      {["Infection Control (HIC)", "BLS & Resuscitation", "High-Alert Drugs", "ISBAR Handover"].map(
                        (tag) => {
                          const isSel = assignedTrainings.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                if (isSel) {
                                  setAssignedTrainings(assignedTrainings.filter((t) => t !== tag));
                                } else {
                                  setAssignedTrainings([...assignedTrainings, tag]);
                                }
                              }}
                              className={cn(
                                "text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer",
                                isSel
                                  ? "bg-purple-600 text-white border-purple-600 font-bold"
                                  : "bg-background text-muted-foreground border-border hover:bg-muted"
                              )}
                            >
                              {tag}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    HR Sign-Off Remarks & Validity Confirmation
                  </label>
                  <textarea
                    rows={2}
                    placeholder="HR audit sign-off confirmation, annual compliance note..."
                    value={hrRemarks}
                    onChange={(e) => setHrRemarks(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-lg border bg-background"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end">
                  <Button
                    size="sm"
                    className="w-full sm:w-auto justify-center bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => hrSignoffMutation.mutate()}
                    disabled={hrSignoffMutation.isPending || !hrRemarks}
                  >
                    Finalize HR Audit & Complete Assessment
                  </Button>
                </div>
              </div>
            )}

            {/* Read-Only State for Finalized Records */}
            {assessment.status === "completed" && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle size={15} className="text-emerald-600" />
                  Assessment Successfully Finalized & Certified
                </div>
                <p className="mt-1 text-[11px]">
                  Composite Final Score: <strong>{Number(assessment.finalScore).toFixed(1)} / 5.0</strong> • Level: <strong>{assessment.competencyLevel}</strong> • Valid until: {fmtDate(assessment.nextAssessmentDueDate)}
                </p>
                {assessment.hrRemarks && (
                  <p className="mt-1 text-[11px] italic">HR Remarks: "{assessment.hrRemarks}"</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="print:hidden p-3 sm:p-4 border-t bg-muted/10 flex items-center justify-between gap-2 shrink-0">
          <div>
            {(myPerms?.isAdmin || isCandidateSelf) && assessment.status === "draft" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const isSelf = myPerms?.currentStaff?.staffId === assessment.staffId;
                  if (
                    window.confirm(
                      `Permanently delete ${
                        isSelf
                          ? "your draft self-assessment"
                          : `DRAFT assessment for ${assessment.staffName}`
                      } (${assessment.assessmentNo})? This cannot be undone.`
                    )
                  ) {
                    deleteDraftMutation.mutate();
                  }
                }}
                disabled={deleteDraftMutation.isPending}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5 text-xs"
              >
                <Trash2 size={13} />
                {myPerms?.currentStaff?.staffId === assessment.staffId
                  ? "Delete Draft Self-Assessment"
                  : "Delete Draft Assessment"}
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto justify-center">
            Close Workspace
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: Simple 1-5 Score Picker (Touch-Friendly for Mobile)
// ---------------------------------------------------------------------------
function ScorePicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      <span className="hidden print:block">{value == null ? "—" : `${value}/5`}</span>
      {[1, 2, 3, 4, 5].map((score) => {
        const isSelected = Math.round(value) === score;
        return (
          <button
            key={score}
            type="button"
            disabled={disabled}
            onClick={() => onChange(score)}
            className={cn(
              "size-7 sm:size-6 rounded-md text-xs sm:text-[11px] font-bold transition-all touch-manipulation",
              isSelected
                ? "bg-teal-600 text-white shadow-2xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
              disabled && "cursor-not-allowed opacity-75"
            )}
            title={`Score ${score}: ${
              score === 1
                ? "Novice"
                : score === 2
                ? "Developing"
                : score === 3
                ? "Competent"
                : score === 4
                ? "Proficient"
                : "Expert"
            }`}
          >
            {score}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: Initiate Staff Assessment Modal (With Duplicate Prevention)
// ---------------------------------------------------------------------------
interface InitiateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cyclesList: any[];
  activeCycle: any;
  onInitiate: (payload: { staffId?: number; cycleId?: number }) => void;
  isPending: boolean;
  assessmentsList: any[];
  onSelectExisting: (id: number) => void;
}

function InitiateAssessmentModal({
  isOpen,
  onClose,
  cyclesList,
  activeCycle,
  onInitiate,
  isPending,
  assessmentsList,
  onSelectExisting,
}: InitiateAssessmentModalProps) {
  const [selectedCycleId, setSelectedCycleId] = useState<string>(
    activeCycle?.id ? String(activeCycle.id) : cyclesList?.[0]?.id ? String(cyclesList[0].id) : ""
  );
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [staffSearch, setStaffSearch] = useState("");

  // Update selectedCycleId if activeCycle loads later
  React.useEffect(() => {
    if (!selectedCycleId && activeCycle?.id) {
      setSelectedCycleId(String(activeCycle.id));
    }
  }, [activeCycle, selectedCycleId]);

  // Load active clinical staff directory
  const { data: staffList = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ["staff-directory-clinical-active"],
    queryFn: async () => {
      const res = await fetch("/api/staff?pageSize=500");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json.data || [];
    },
    enabled: isOpen,
  });

  const filteredStaff = useMemo(() => {
    if (!staffSearch) return staffList;
    const q = staffSearch.toLowerCase().trim();
    return staffList.filter((s: any) =>
      (s.name || "").toLowerCase().includes(q) ||
      (s.employeeCode || "").toLowerCase().includes(q) ||
      (s.department || s.departmentName || "").toLowerCase().includes(q) ||
      (s.designation || s.role || "").toLowerCase().includes(q)
    );
  }, [staffList, staffSearch]);

  const currentCycle = useMemo(() => {
    return cyclesList.find((c: any) => String(c.id) === String(selectedCycleId)) || activeCycle;
  }, [cyclesList, selectedCycleId, activeCycle]);

  // Check if an assessment already exists for selected staff + cycle
  const existingAssessment = useMemo(() => {
    if (!selectedStaffId || !selectedCycleId) return null;
    return assessmentsList.find(
      (a: any) =>
        String(a.staffId) === String(selectedStaffId) &&
        String(a.cycleId) === String(selectedCycleId)
    );
  }, [assessmentsList, selectedStaffId, selectedCycleId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId || !selectedCycleId) {
      toast.error("Please select both a staff member and an evaluation period");
      return;
    }
    if (existingAssessment) {
      toast.error("An assessment already exists for this staff member in this cycle.");
      return;
    }
    onInitiate({
      staffId: Number(selectedStaffId),
      cycleId: Number(selectedCycleId),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-background rounded-2xl border shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in-50 zoom-in-95 my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b bg-muted/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <UserPlus className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Initiate Clinical Assessment</h3>
              <p className="text-xs text-muted-foreground">
                Assign a NABH evaluation to a clinical staff member
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg px-2 py-1 rounded-md"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Assessment Cycle / Evaluation Period */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-teal-600 dark:text-teal-400" />
                Assessment Period / Cycle
              </span>
              {currentCycle && (
                <span className="text-[11px] font-normal text-muted-foreground">
                  Window: {fmtDate(currentCycle.startDate)} – {fmtDate(currentCycle.endDate)}
                </span>
              )}
            </label>
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-teal-500/20"
              required
            >
              {cyclesList.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({fmtDate(c.startDate)} – {fmtDate(c.endDate)})
                  {c.status === "active" ? " ★ Active" : ` (${c.status})`}
                </option>
              ))}
            </select>
          </div>

          {/* Clinical Staff Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Stethoscope className="size-3.5 text-teal-600 dark:text-teal-400" />
                Select Clinical Staff
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {isLoadingStaff ? "Loading staff..." : `${filteredStaff.length} staff found`}
              </span>
            </label>

            {/* Quick search filter */}
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search staff by name, ID or department..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border bg-background text-foreground"
              />
            </div>

            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              size={6}
              className="w-full p-2 text-xs rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-teal-500/20 divide-y divide-border"
              required
            >
              <option value="" disabled>
                -- Select Staff Member --
              </option>
              {filteredStaff.map((s: any) => (
                <option key={s.id || s.staffId} value={s.id || s.staffId} className="py-1">
                  {s.name} ({s.employeeCode || "No Code"}) — {s.department || s.departmentName || "No Dept"} ({s.designation || s.role || "Staff"})
                </option>
              ))}
            </select>
          </div>

          {/* Uniqueness Alert if duplicate detected */}
          {existingAssessment && (
            <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 space-y-2 animate-in fade-in-50">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    Assessment Already Exists for this Evaluation Cycle
                  </p>
                  <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    This staff member already has an assessment (
                    <span className="font-mono font-bold">{existingAssessment.assessmentNo}</span>)
                    in <span className="font-semibold">{currentCycle?.title || "this period"}</span>. Assessments must be unique per staff member and cycle period.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onSelectExisting(existingAssessment.id)}
                  className="gap-1.5 text-xs bg-background hover:bg-muted"
                >
                  <Eye size={13} />
                  Open Existing Assessment
                </Button>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-3 border-t flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !selectedStaffId || !selectedCycleId || Boolean(existingAssessment)}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 shadow-xs"
            >
              {isPending ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Initiating...
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  Initiate Assessment
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: Assessment Periods & Evaluation Cycles Manager Modal
// ---------------------------------------------------------------------------
interface CycleManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  cyclesList: any[];
  onRefetchCycles: () => void;
}

export function CycleManageModal({
  isOpen,
  onClose,
  cyclesList,
  onRefetchCycles,
}: CycleManageModalProps) {
  const [editingCycle, setEditingCycle] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    year: new Date().getFullYear(),
    quarter: "Annual",
    startDate: "",
    endDate: "",
    status: "active",
    description: "",
  });
  const [dateError, setDateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill form when editing
  React.useEffect(() => {
    if (editingCycle) {
      setFormData({
        title: editingCycle.title || "",
        year: editingCycle.year || new Date().getFullYear(),
        quarter: editingCycle.quarter || "Annual",
        startDate: editingCycle.startDate ? String(editingCycle.startDate).slice(0, 10) : "",
        endDate: editingCycle.endDate ? String(editingCycle.endDate).slice(0, 10) : "",
        status: editingCycle.status || "active",
        description: editingCycle.description || "",
      });
      setDateError(null);
    } else {
      setFormData({
        title: "",
        year: new Date().getFullYear(),
        quarter: "Annual",
        startDate: "",
        endDate: "",
        status: "active",
        description: "",
      });
      setDateError(null);
    }
  }, [editingCycle]);

  const handleStartDateChange = (val: string) => {
    setFormData((prev) => ({ ...prev, startDate: val }));
    if (formData.endDate && val && val > formData.endDate) {
      setDateError("End date must be on or after start date");
    } else {
      setDateError(null);
    }
  };

  const handleEndDateChange = (val: string) => {
    setFormData((prev) => ({ ...prev, endDate: val }));
    if (formData.startDate && val && val < formData.startDate) {
      setDateError("End date must be on or after start date");
    } else {
      setDateError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Cycle title is required");
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error("Both start date and end date are required");
      return;
    }
    if (formData.endDate < formData.startDate) {
      toast.error("End date must be on or after start date");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingCycle
        ? `/api/skill-assessment/cycles/${editingCycle.id}`
        : "/api/skill-assessment/cycles";
      const method = editingCycle ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save assessment cycle");
      }

      toast.success(
        editingCycle
          ? "Assessment cycle updated successfully"
          : "Assessment cycle created successfully"
      );
      setEditingCycle(null);
      onRefetchCycles();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-background rounded-2xl border shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in-50 zoom-in-95 my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b bg-muted/20 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Assessment Periods & Evaluation Cycles
              </h3>
              <p className="text-xs text-muted-foreground">
                Define audit time windows and enforce evaluation periods across staff
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg px-2 py-1 rounded-md"
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Two Columns on Desktop */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column: Cycles List */}
          <div className="md:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Configured Periods ({cyclesList.length})
              </h4>
              {editingCycle && (
                <button
                  type="button"
                  onClick={() => setEditingCycle(null)}
                  className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline"
                >
                  + Create New
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {cyclesList.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No cycles configured yet.
                </div>
              ) : (
                cyclesList.map((c: any) => {
                  const isCurrent = editingCycle?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "p-3 rounded-xl border transition-all text-xs space-y-1.5",
                        isCurrent
                          ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30"
                          : "bg-card hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground truncate">{c.title}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase font-bold",
                            c.status === "active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                              : c.status === "closed"
                              ? "bg-muted text-muted-foreground"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
                          )}
                        >
                          {c.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                        <Calendar size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
                        <span>
                          {fmtDate(c.startDate)} – {fmtDate(c.endDate)}
                        </span>
                        <span>•</span>
                        <span>{c.quarter} {c.year}</span>
                      </div>

                      {c.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {c.description}
                        </p>
                      )}

                      <div className="pt-1 flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCycle(c)}
                          className="h-7 text-xs gap-1 text-teal-700 dark:text-teal-300 hover:bg-teal-100/50"
                        >
                          <Edit3 size={12} />
                          Edit Period
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="md:col-span-6 bg-muted/20 p-4 rounded-xl border space-y-3">
            <h4 className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>{editingCycle ? "Edit Period / Cycle" : "Create New Evaluation Period"}</span>
              {editingCycle && (
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">
                  ID: #{editingCycle.id}
                </span>
              )}
            </h4>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Cycle Title</label>
                <input
                  type="text"
                  placeholder="e.g. 2026 Q1 NABH Clinical Evaluation"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-background text-foreground"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Audit Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: parseInt(e.target.value, 10) || 2026 })
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-background text-foreground"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Quarter / Term</label>
                  <select
                    value={formData.quarter}
                    onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-background text-foreground"
                  >
                    <option value="Annual">Annual</option>
                    <option value="Q1">Q1 (Jan - Mar)</option>
                    <option value="Q2">Q2 (Apr - Jun)</option>
                    <option value="Q3">Q3 (Jul - Sep)</option>
                    <option value="Q4">Q4 (Oct - Dec)</option>
                    <option value="Mid-Year">Mid-Year</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-background text-foreground"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-background text-foreground"
                    required
                  />
                </div>
              </div>

              {dateError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {dateError}
                </p>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-background text-foreground"
                >
                  <option value="active">Active (Permits Submissions)</option>
                  <option value="draft">Draft (Planning)</option>
                  <option value="closed">Closed (Audits Locked)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional scope or audit guidelines..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-background text-foreground"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                {editingCycle && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingCycle(null)}
                  >
                    Cancel Edit
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || Boolean(dateError)}
                  className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
                >
                  {isSubmitting ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  {editingCycle ? "Update Period" : "Save Period"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t bg-muted/10 flex items-center justify-end shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
