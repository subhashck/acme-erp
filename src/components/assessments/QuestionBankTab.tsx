import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  Calendar,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Tag,
  Building2,
  Clock,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileQuestion,
  GraduationCap,
  Copy,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
  Eye,
  CheckSquare,
  Square,
  BarChart3,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { cn } from "@/utils/cn";

const COMPETENCY_DOMAINS = [
  { code: "HIC", name: "Hospital Infection Control" },
  { code: "PSQ", name: "Patient Safety & Quality" },
  { code: "MOM", name: "Medication Management" },
  { code: "COP_BLS", name: "BLS & Emergency Protocols" },
  { code: "PROCEDURES", name: "Core Clinical Procedures" },
  { code: "DOC_COMM", name: "Clinical Documentation" },
  { code: "HR_POLICY", name: "Hospital HR Policies & Code of Conduct" },
];

function getFormattedMonthYear(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthLabel(monthYear: string): string {
  if (!monthYear || !monthYear.includes("-")) return monthYear;
  const [yStr, mStr] = monthYear.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10) - 1;
  const d = new Date(y, m, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function shiftMonth(monthYear: string, offset: number): string {
  if (!monthYear || !monthYear.includes("-")) return getFormattedMonthYear();
  const [yStr, mStr] = monthYear.split("-");
  let y = parseInt(yStr, 10);
  let m = parseInt(mStr, 10) + offset;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function QuestionBankTab() {
  const queryClient = useQueryClient();

  // Tab View Mode: 'monthly' (Department Monthly Question Banks) vs 'master' (Master Questions Pool)
  const [activeTab, setActiveTab] = useState<"monthly" | "master">("monthly");

  // Current selected month in YYYY-MM format
  const [selectedMonth, setSelectedMonth] = useState<string>(getFormattedMonthYear());
  // Department filter for monthly view ("all" or specific department name)
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all");

  // Bank currently opened for detailed editing/viewing
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceMonth, setCopySourceMonth] = useState<string>(shiftMonth(getFormattedMonthYear(), -1));
  const [copyOverwrite, setCopyOverwrite] = useState(false);

  // Master Questions State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [masterDeptFilter, setMasterDeptFilter] = useState("all");
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [isQuestionFormOpen, setIsQuestionFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);

  // Question Form State
  const [code, setCode] = useState("");
  const [domainCode, setDomainCode] = useState("HIC");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [departmentTags, setDepartmentTags] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<"basic" | "medium" | "advanced">("medium");
  const [defaultTimeSeconds, setDefaultTimeSeconds] = useState(60);

  // Debounce search
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // 1. Fetch Hospital Departments
  const { data: deptsData } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json.data || [];
    },
  });

  const departmentList: { id: number; name: string; isClinical?: boolean }[] = useMemo(() => {
    if (!Array.isArray(deptsData)) return [];
    return deptsData
      .map((d: any) => ({ id: d.id, name: d.name, isClinical: Boolean(d.isClinical) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [deptsData]);

  // 2. Fetch Monthly Banks for selected month
  const {
    data: monthlyBanks,
    isLoading: isLoadingMonthlyBanks,
  } = useQuery({
    queryKey: ["department-monthly-banks", selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/skill-assessment/monthly-banks?monthYear=${selectedMonth}`);
      if (!res.ok) throw new Error("Failed to load department monthly banks");
      return res.json();
    },
  });

  const banksList: any[] = Array.isArray(monthlyBanks) ? monthlyBanks : [];

  // 3. Fetch Single Bank Details when a specific bank is selected
  const {
    data: activeBankDetail,
    isLoading: isLoadingActiveBank,
  } = useQuery({
    queryKey: ["department-monthly-bank-detail", selectedBankId],
    queryFn: async () => {
      if (!selectedBankId) return null;
      const res = await fetch(`/api/skill-assessment/monthly-banks/${selectedBankId}`);
      if (!res.ok) throw new Error("Failed to load bank detail");
      return res.json();
    },
    enabled: Boolean(selectedBankId),
  });

  // 4. Fetch All Master Questions (used for Master Tab and for Question Picker Modal)
  const {
    data: questionsResponse,
    isLoading: isLoadingQuestions,
  } = useQuery({
    queryKey: [
      "skill-assessment-questions",
      page,
      pageSize,
      masterDeptFilter,
      selectedDomain,
      selectedDifficulty,
      debouncedSearch,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (masterDeptFilter !== "all") params.set("department", masterDeptFilter);
      if (selectedDomain !== "all") params.set("domainCode", selectedDomain);
      if (selectedDifficulty !== "all") params.set("difficulty", selectedDifficulty);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/skill-assessment/questions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load questions");
      return res.json();
    },
  });

  // Query all active questions without pagination for the assignment dialog picker
  const { data: allActiveQuestionsData } = useQuery({
    queryKey: ["all-active-questions-for-assignment"],
    queryFn: async () => {
      const res = await fetch(`/api/skill-assessment/questions`);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json.data || [];
    },
    enabled: isAssignModalOpen,
  });

  const allActiveQuestions: any[] = Array.isArray(allActiveQuestionsData) ? allActiveQuestionsData : [];

  const masterQuestions: any[] = Array.isArray(questionsResponse)
    ? questionsResponse
    : Array.isArray(questionsResponse?.data)
    ? questionsResponse.data
    : [];

  const pagination =
    questionsResponse && !Array.isArray(questionsResponse) && questionsResponse.pagination
      ? questionsResponse.pagination
      : {
          page,
          pageSize,
          totalRecords: masterQuestions.length,
          totalPages: Math.max(1, Math.ceil(masterQuestions.length / (pageSize === 0 ? masterQuestions.length || 1 : pageSize))),
        };

  const totalRecords: number = pagination.totalRecords ?? masterQuestions.length;
  const totalPages: number = pagination.totalPages ?? 1;

  // Active Bank Data Helpers
  const activeBank = activeBankDetail?.bank || banksList.find((b) => b.id === selectedBankId);

  // Mutations
  const autoFillMutation = useMutation({
    mutationFn: async ({ departmentName, departmentId }: { departmentName: string; departmentId?: number }) => {
      const res = await fetch("/api/skill-assessment/monthly-banks/auto-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentName,
          monthYear: selectedMonth,
          departmentId,
          includeGeneral: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to auto-fill question bank");
      }
      return res.json();
    },
    onSuccess: (data, vars) => {
      toast.success(`Auto-filled ${data.totalAdded} questions for ${vars.departmentName} (${selectedMonth})`);
      queryClient.invalidateQueries({ queryKey: ["department-monthly-banks"] });
      if (selectedBankId) {
        queryClient.invalidateQueries({ queryKey: ["department-monthly-bank-detail", selectedBankId] });
      }
    },
    onError: (err: any) => toast.error(err.message || "Auto-fill failed"),
  });

  const assignQuestionsMutation = useMutation({
    mutationFn: async ({ bankId, questionIds }: { bankId: number; questionIds: number[] }) => {
      const res = await fetch(`/api/skill-assessment/monthly-banks/${bankId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds, action: "set" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update assigned questions");
      }
      return res.json();
    },
    onSuccess: (updated) => {
      toast.success(`Question bank updated (${updated.totalQuestions} questions assigned)`);
      queryClient.invalidateQueries({ queryKey: ["department-monthly-banks"] });
      queryClient.invalidateQueries({ queryKey: ["department-monthly-bank-detail", updated.id] });
      setIsAssignModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update questions"),
  });

  const updateBankStatusMutation = useMutation({
    mutationFn: async ({ bankId, status }: { bankId: number; status: "active" | "draft" | "archived" }) => {
      const res = await fetch(`/api/skill-assessment/monthly-banks/${bankId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Bank status updated");
      queryClient.invalidateQueries({ queryKey: ["department-monthly-banks"] });
      if (selectedBankId) {
        queryClient.invalidateQueries({ queryKey: ["department-monthly-bank-detail", selectedBankId] });
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to update status"),
  });

  const copyMonthMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/skill-assessment/monthly-banks/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromMonthYear: copySourceMonth,
          toMonthYear: selectedMonth,
          overwrite: copyOverwrite,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to copy monthly banks");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || `Successfully copied ${data.copiedCount} department banks`);
      queryClient.invalidateQueries({ queryKey: ["department-monthly-banks"] });
      setIsCopyModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to copy banks"),
  });

  const saveQuestionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingQuestion
        ? `/api/skill-assessment/questions/${editingQuestion.id}`
        : `/api/skill-assessment/questions`;
      const method = editingQuestion ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save question");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(
        editingQuestion
          ? "Question updated successfully"
          : "New theoretical question added to master pool"
      );
      queryClient.invalidateQueries({ queryKey: ["skill-assessment-questions"] });
      queryClient.invalidateQueries({ queryKey: ["all-active-questions-for-assignment"] });
      setIsQuestionFormOpen(false);
      setEditingQuestion(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to save question"),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/skill-assessment/questions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to deactivate question");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Question deactivated successfully");
      queryClient.invalidateQueries({ queryKey: ["skill-assessment-questions"] });
      queryClient.invalidateQueries({ queryKey: ["all-active-questions-for-assignment"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to deactivate question"),
  });

  // Filtered banks for the matrix view
  const filteredBanks = useMemo(() => {
    if (selectedDeptFilter === "all") return banksList;
    return banksList.filter(
      (b) => b.departmentName.trim().toLowerCase() === selectedDeptFilter.trim().toLowerCase()
    );
  }, [banksList, selectedDeptFilter]);

  // Open Question Edit Modal
  const openCreateQuestionModal = () => {
    setEditingQuestion(null);
    setCode(`MCQ-${selectedDomain !== "all" ? selectedDomain : "GEN"}-${String(totalRecords + 1).padStart(2, "0")}`);
    setDomainCode(selectedDomain !== "all" ? selectedDomain : "HIC");
    setQuestionText("");
    setOptions(["", "", "", ""]);
    setCorrectOptionIndex(0);
    setExplanation("");
    setDepartmentTags(masterDeptFilter !== "all" ? [masterDeptFilter] : []);
    setDifficulty("medium");
    setDefaultTimeSeconds(60);
    setIsQuestionFormOpen(true);
  };

  const openEditQuestionModal = (q: any) => {
    setEditingQuestion(q);
    setCode(q.code);
    setDomainCode(q.domainCode);
    setQuestionText(q.question);
    setOptions(Array.isArray(q.options) ? q.options : ["", "", "", ""]);
    setCorrectOptionIndex(q.correctOptionIndex);
    setExplanation(q.explanation || "");
    setDepartmentTags(Array.isArray(q.departmentTags) ? q.departmentTags : []);
    setDifficulty(q.difficulty || "medium");
    setDefaultTimeSeconds(q.defaultTimeSeconds || 60);
    setIsQuestionFormOpen(true);
  };

  const toggleDeptTag = (dept: string) => {
    const trimmed = dept.trim();
    setDepartmentTags((prev) =>
      prev.some((d) => d.toLowerCase() === trimmed.toLowerCase())
        ? prev.filter((d) => d.toLowerCase() !== trimmed.toLowerCase())
        : [...prev, trimmed]
    );
  };

  const handleQuestionFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      toast.error("Please enter the question text");
      return;
    }
    const cleanOptions = options.map((o) => o.trim());
    if (cleanOptions.some((o) => !o)) {
      toast.error("All 4 options must be filled out");
      return;
    }

    saveQuestionMutation.mutate({
      code,
      domainCode,
      question: questionText.trim(),
      options: cleanOptions,
      correctOptionIndex,
      explanation: explanation.trim() || null,
      departmentTags,
      difficulty,
      defaultTimeSeconds,
    });
  };

  return (
    <div className="space-y-5">
      {/* Top Navigation Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/80 w-fit">
          <button
            onClick={() => {
              setActiveTab("monthly");
              setSelectedBankId(null);
            }}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeTab === "monthly"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar size={14} className={activeTab === "monthly" ? "text-teal-600" : ""} />
            <span>Monthly Department Banks</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {formatMonthLabel(selectedMonth)}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab("master")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeTab === "master"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen size={14} className={activeTab === "master" ? "text-teal-600" : ""} />
            <span>Master Repository</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
              581 Total
            </Badge>
          </button>
        </div>

        {/* Global Action on the right */}
        {activeTab === "master" ? (
          <Button
            size="sm"
            onClick={openCreateQuestionModal}
            className="text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-2xs"
          >
            <Plus size={14} />
            Add Master Question
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCopyModalOpen(true)}
              className="text-xs gap-1.5"
            >
              <Copy size={13} />
              Copy from Month...
            </Button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. MONTHLY DEPARTMENT BANKS WORKSPACE */}
      {/* ========================================================================= */}
      {activeTab === "monthly" && (
        <div className="space-y-4">
          {/* Controls Bar: Month Picker & Department Selector */}
          <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Month Navigator */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calendar size={14} className="text-teal-600" />
                Target Month:
              </span>

              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border border-border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
                  title="Previous Month"
                >
                  <ChevronLeft size={14} />
                </Button>

                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    if (e.target.value) setSelectedMonth(e.target.value);
                  }}
                  className="h-7 px-2 bg-background border border-border rounded text-xs font-semibold focus:outline-none"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
                  title="Next Month"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>

              <span className="text-xs font-bold text-foreground pl-1">
                {formatMonthLabel(selectedMonth)}
              </span>
            </div>

            {/* Department Quick Filter */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">Department:</span>
              <select
                value={selectedDeptFilter}
                onChange={(e) => {
                  setSelectedDeptFilter(e.target.value);
                  setSelectedBankId(null);
                }}
                className="h-8.5 px-3 rounded-lg border border-border bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Departments ({departmentList.length})</option>
                {departmentList.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name.trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* VIEW A: Single Department Monthly Bank Selected */}
          {selectedBankId ? (
            <SingleBankWorkspace
              bankId={selectedBankId}
              bankDetail={activeBankDetail}
              isLoading={isLoadingActiveBank}
              onBack={() => setSelectedBankId(null)}
              onOpenAssign={() => setIsAssignModalOpen(true)}
              onAutoFill={() => {
                if (activeBank) {
                  autoFillMutation.mutate({
                    departmentName: activeBank.departmentName,
                    departmentId: activeBank.departmentId,
                  });
                }
              }}
              onToggleStatus={(status) => {
                updateBankStatusMutation.mutate({ bankId: selectedBankId, status });
              }}
              onRemoveQuestion={(questionId) => {
                if (!activeBank) return;
                const currentIds = (Array.isArray(activeBank.questionIds) ? activeBank.questionIds : []) as number[];
                const updatedIds = currentIds.filter((id) => id !== questionId);
                assignQuestionsMutation.mutate({ bankId: selectedBankId, questionIds: updatedIds });
              }}
            />
          ) : (
            /* VIEW B: All Departments Grid / Matrix */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  Showing configured question banks for <strong>{formatMonthLabel(selectedMonth)}</strong> ({filteredBanks.length} departments)
                </span>
                <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-medium">
                  <Sparkles size={13} />
                  Active banks are automatically served during staff CBT examinations
                </span>
              </div>

              {isLoadingMonthlyBanks ? (
                <div className="p-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  Loading department monthly banks...
                </div>
              ) : filteredBanks.length === 0 ? (
                <div className="p-12 text-center border border-dashed rounded-xl bg-card space-y-3">
                  <Calendar size={32} className="mx-auto text-muted-foreground opacity-40" />
                  <p className="text-sm font-semibold text-foreground">
                    No question banks configured for {formatMonthLabel(selectedMonth)}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    You can copy over question banks from a previous month or auto-fill questions from the master question bank.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => setIsCopyModalOpen(true)}
                      className="text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <Copy size={13} />
                      Copy from Previous Month
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredBanks.map((bank) => {
                    const qCount = bank.totalQuestions || (Array.isArray(bank.questionIds) ? bank.questionIds.length : 0);
                    const isActive = bank.status === "active";

                    return (
                      <div
                        key={bank.id}
                        className={cn(
                          "rounded-xl border bg-card p-4 transition-all hover:shadow-xs flex flex-col justify-between gap-3",
                          isActive ? "border-border" : "border-border/60 opacity-80"
                        )}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                <Building2 size={15} className="text-teal-600 shrink-0" />
                                {bank.departmentName.trim()}
                              </h4>
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                {bank.title || `${bank.departmentName.trim()} - ${bank.monthYear}`}
                              </p>
                            </div>

                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0 uppercase font-semibold",
                                isActive
                                  ? "border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                                  : "border-muted text-muted-foreground bg-muted/40"
                              )}
                            >
                              {bank.status}
                            </Badge>
                          </div>

                          {/* Metric Pill */}
                          <div className="flex items-center gap-2 pt-1 text-xs">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className={cn(
                                "size-6 rounded-md flex items-center justify-center font-mono text-xs",
                                qCount > 0 ? "bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300" : "bg-rose-100 text-rose-800"
                              )}>
                                {qCount}
                              </span>
                              <span className="text-foreground">Questions</span>
                            </div>

                            <span className="text-muted-foreground">•</span>
                            <span className="text-[11px] text-muted-foreground font-mono">{bank.monthYear}</span>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              autoFillMutation.mutate({
                                departmentName: bank.departmentName,
                                departmentId: bank.departmentId,
                              });
                            }}
                            className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
                            title="Auto-fill questions matching this department tag"
                          >
                            <Sparkles size={11} className="text-teal-600" />
                            Auto-Fill
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => setSelectedBankId(bank.id)}
                            className="text-xs h-7 px-2.5 gap-1 bg-teal-600/10 text-teal-800 dark:text-teal-300 hover:bg-teal-600 hover:text-white"
                          >
                            <span>Manage Questions</span>
                            <ArrowRight size={12} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MASTER QUESTIONS REPOSITORY TAB */}
      {/* ========================================================================= */}
      {activeTab === "master" && (
        <div className="space-y-4">
          {/* Top Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card shadow-2xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BookOpen size={16} className="text-teal-600 dark:text-teal-400" />
                  Master Theoretical Question Pool
                </h3>
                <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono">
                  {totalRecords} Active Questions
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Hospital-wide repository of NABH-compliant theoretical questions. Questions here can be assigned to department monthly banks.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search questions, codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8.5 pl-8 pr-3 rounded-lg border border-border bg-background text-xs focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <select
                value={masterDeptFilter}
                onChange={(e) => {
                  setMasterDeptFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-background text-xs"
              >
                <option value="all">All Departments / Tags</option>
                <option value="Clinical">🏥 Clinical (All Clinical Depts)</option>
                {departmentList.map((d) => (
                  <option key={d.id} value={d.name.trim()}>
                    {d.name.trim()}{d.isClinical ? " (Clinical)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedDomain}
                onChange={(e) => {
                  setSelectedDomain(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-background text-xs"
              >
                <option value="all">All Competency Domains</option>
                {COMPETENCY_DOMAINS.map((dom) => (
                  <option key={dom.code} value={dom.code}>
                    {dom.code} - {dom.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedDifficulty}
                onChange={(e) => {
                  setSelectedDifficulty(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-background text-xs"
              >
                <option value="all">All Difficulties</option>
                <option value="basic">Basic</option>
                <option value="medium">Medium</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Master Questions Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
            {isLoadingQuestions ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                Loading questions from repository...
              </div>
            ) : masterQuestions.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FileQuestion size={32} className="mx-auto text-muted-foreground opacity-40" />
                <p className="text-sm font-semibold text-foreground">No questions found</p>
                <p className="text-xs text-muted-foreground">
                  Try adjusting your search criteria or add a new question to the pool.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {masterQuestions.map((q) => {
                  const isExpanded = expandedQuestionId === q.id;
                  const tags = Array.isArray(q.departmentTags) ? q.departmentTags : [];

                  return (
                    <div key={q.id} className="p-4 transition-colors hover:bg-muted/20 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-[11px]">
                              {q.code}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {q.domainCode}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] px-1.5 py-0 capitalize",
                                q.difficulty === "basic"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : q.difficulty === "medium"
                                  ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"
                                  : "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400"
                              )}
                            >
                              {q.difficulty}
                            </Badge>

                            {tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                {tags.map((t: string) => {
                                  const isClin = t.trim().toLowerCase() === "clinical";
                                  return (
                                    <Badge
                                      key={t}
                                      variant={isClin ? "default" : "outline"}
                                      className={cn(
                                        "text-[9px] px-1.5 py-0",
                                        isClin
                                          ? "bg-teal-600 hover:bg-teal-700 text-white font-semibold border-teal-600 shadow-2xs"
                                          : "text-muted-foreground"
                                      )}
                                    >
                                      {isClin ? "🏥 Clinical" : t.trim()}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <p className="text-xs font-medium text-foreground leading-relaxed pt-0.5">
                            {q.question}
                          </p>
                        </div>

                        {/* Row Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                            title={isExpanded ? "Collapse" : "View Options & Answer"}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditQuestionModal(q)}
                            title="Edit Question"
                          >
                            <Edit2 size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => {
                              if (window.confirm(`Deactivate question ${q.code}?`)) {
                                deleteQuestionMutation.mutate(q.id);
                              }
                            }}
                            title="Deactivate Question"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>

                      {/* Expandable Options & Explanation */}
                      {isExpanded && (
                        <div className="mt-2.5 pt-2.5 border-t border-border/60 space-y-2 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {q.options?.map((opt: string, optIdx: number) => {
                              const isCorrect = optIdx === q.correctOptionIndex;
                              return (
                                <div
                                  key={optIdx}
                                  className={cn(
                                    "p-2 rounded-lg border flex items-center gap-2",
                                    isCorrect
                                      ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold"
                                      : "bg-muted/30 border-border text-muted-foreground"
                                  )}
                                >
                                  <span className="font-bold text-[10px] size-4 rounded bg-background border flex items-center justify-center shrink-0">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span className="flex-1">{opt}</span>
                                  {isCorrect && <Check size={13} className="text-emerald-600 shrink-0" />}
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-muted-foreground text-[11px] leading-relaxed">
                              <strong className="text-foreground">Clinical Rationale: </strong>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-border flex items-center justify-between gap-3 text-xs bg-muted/20">
                <span className="text-muted-foreground">
                  Page {page} of {totalPages} ({totalRecords} total questions)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-7 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-7 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ASSIGN QUESTIONS MODAL (Pick questions from Master Pool to Monthly Bank) */}
      {/* ========================================================================= */}
      {isAssignModalOpen && activeBank && (
        <AssignQuestionsDialog
          bank={activeBank}
          allQuestions={allActiveQuestions}
          departmentList={departmentList}
          onClose={() => setIsAssignModalOpen(false)}
          onSave={(selectedIds) => {
            assignQuestionsMutation.mutate({
              bankId: activeBank.id,
              questionIds: selectedIds,
            });
          }}
          isSaving={assignQuestionsMutation.isPending}
        />
      )}

      {/* ========================================================================= */}
      {/* COPY MONTH MODAL (Roll over question banks across months) */}
      {/* ========================================================================= */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Copy size={16} className="text-teal-600" />
                Copy Question Banks Across Months
              </h3>
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Duplicate all department question banks from a prior month into your target month without manually re-assigning questions.
            </p>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Source Month (Copy From):</label>
                <input
                  type="month"
                  value={copySourceMonth}
                  onChange={(e) => setCopySourceMonth(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-border bg-background"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Target Month (Copy To):</label>
                <div className="p-2 rounded-lg bg-muted/50 border border-border font-bold">
                  {formatMonthLabel(selectedMonth)} ({selectedMonth})
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="overwrite-check"
                  checked={copyOverwrite}
                  onChange={(e) => setCopyOverwrite(e.target.checked)}
                  className="rounded border-border text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="overwrite-check" className="text-muted-foreground cursor-pointer">
                  Overwrite existing question banks in {selectedMonth}
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCopyModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => copyMonthMutation.mutate()}
                disabled={copyMonthMutation.isPending || !copySourceMonth}
                className="text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
              >
                {copyMonthMutation.isPending ? "Copying..." : "Execute Copy"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE / EDIT MASTER QUESTION MODAL */}
      {/* ========================================================================= */}
      {isQuestionFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">
                {editingQuestion ? "Edit Master Question" : "Add New Master Question"}
              </h3>
              <button
                onClick={() => setIsQuestionFormOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleQuestionFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Question Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="w-full h-8 px-2.5 rounded-lg border border-border bg-background font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Competency Domain</label>
                  <select
                    value={domainCode}
                    onChange={(e) => setDomainCode(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-border bg-background"
                  >
                    {COMPETENCY_DOMAINS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full h-8 px-2.5 rounded-lg border border-border bg-background"
                  >
                    <option value="basic">Basic (Entry Level)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="advanced">Advanced (Critical / Super-Specialty)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Question Statement</label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  rows={3}
                  required
                  placeholder="Enter clinical question scenario or prompt..."
                  className="w-full p-2.5 rounded-lg border border-border bg-background"
                />
              </div>

              {/* 4 MCQ Options */}
              <div className="space-y-2">
                <label className="font-semibold text-foreground">
                  Answer Options (Select radio to set the correct answer)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct-option"
                        checked={correctOptionIndex === idx}
                        onChange={() => setCorrectOptionIndex(idx)}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-bold text-muted-foreground w-4 text-center">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...options];
                          newOpts[idx] = e.target.value;
                          setOptions(newOpts);
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                        required
                        className="flex-1 h-8 px-2.5 rounded-lg border border-border bg-background"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Department Tag Badges */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground">Department Tags</label>
                  <span className="text-[10px] text-muted-foreground">Select "Clinical" for all clinical departments, or specific departments</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-lg border border-border bg-muted/20">
                  {/* Dedicated Clinical Tag Button */}
                  <button
                    type="button"
                    onClick={() => toggleDeptTag("Clinical")}
                    className={cn(
                      "px-2.5 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1",
                      departmentTags.some((t) => t.toLowerCase() === "clinical")
                        ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                        : "bg-teal-50/70 border-teal-300 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700 hover:bg-teal-100"
                    )}
                    title="Applicable to all departments marked as Clinical in department master"
                  >
                    🏥 Clinical (All Clinical Depts)
                  </button>

                  {/* Dedicated All Tag Button */}
                  <button
                    type="button"
                    onClick={() => toggleDeptTag("all")}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer",
                      departmentTags.some((t) => t.toLowerCase() === "all")
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    🌐 All
                  </button>

                  {departmentList.map((d) => {
                    const isSelected = departmentTags.some((t) => t.toLowerCase() === d.name.trim().toLowerCase());
                    return (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => toggleDeptTag(d.name.trim())}
                        className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer",
                          isSelected
                            ? "bg-teal-600 text-white border-teal-600"
                            : "bg-background border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {d.name.trim()}
                        {d.isClinical && <span className="ml-1 text-[9px] opacity-75 font-normal">(Clin)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Clinical Rationale & Explanation</label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={2}
                  placeholder="NABH protocol guidelines or clinical rationale..."
                  className="w-full p-2.5 rounded-lg border border-border bg-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQuestionFormOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saveQuestionMutation.isPending}
                  className="text-xs bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {saveQuestionMutation.isPending ? "Saving..." : "Save Question"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENT: Single Department Monthly Bank Workspace
// ---------------------------------------------------------------------------
interface SingleBankWorkspaceProps {
  bankId: number;
  bankDetail: any;
  isLoading: boolean;
  onBack: () => void;
  onOpenAssign: () => void;
  onAutoFill: () => void;
  onToggleStatus: (status: "active" | "draft" | "archived") => void;
  onRemoveQuestion: (questionId: number) => void;
}

function SingleBankWorkspace({
  bankDetail,
  isLoading,
  onBack,
  onOpenAssign,
  onAutoFill,
  onToggleStatus,
  onRemoveQuestion,
}: SingleBankWorkspaceProps) {
  const bank = bankDetail?.bank;
  const questions: any[] = bankDetail?.questions || [];
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading || !bank) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
        Loading question bank details...
      </div>
    );
  }

  const isActive = bank.status === "active";

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="text-xs h-8 px-2 gap-1"
            >
              <ChevronLeft size={14} />
              All Departments
            </Button>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  {bank.departmentName.trim()}
                </h3>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 uppercase font-semibold",
                    isActive
                      ? "border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                      : "border-muted text-muted-foreground bg-muted/40"
                  )}
                >
                  {bank.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {bank.title || `${bank.departmentName.trim()} - ${bank.monthYear} Question Bank`} • {formatMonthLabel(bank.monthYear)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onAutoFill}
              className="text-xs gap-1.5"
              title="Automatically match questions tagged for this department"
            >
              <Sparkles size={13} className="text-teal-600" />
              Auto-Fill Tagged
            </Button>

            <Button
              size="sm"
              onClick={onOpenAssign}
              className="text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-2xs"
            >
              <Plus size={14} />
              Add / Assign Questions ({questions.length})
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleStatus(isActive ? "draft" : "active")}
              className="text-xs"
            >
              Set to {isActive ? "Draft" : "Active"}
            </Button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60 text-xs">
          <div>
            <span className="text-muted-foreground">Total Questions:</span>
            <div className="font-bold text-foreground text-sm font-mono">{questions.length}</div>
          </div>

          <div>
            <span className="text-muted-foreground">Month:</span>
            <div className="font-semibold text-foreground">{formatMonthLabel(bank.monthYear)}</div>
          </div>

          <div>
            <span className="text-muted-foreground">Status:</span>
            <div className="font-semibold text-foreground capitalize">{bank.status}</div>
          </div>

          <div>
            <span className="text-muted-foreground">CBT Exam Serving:</span>
            <div className={cn("font-semibold", isActive ? "text-emerald-600" : "text-amber-600")}>
              {isActive ? "Serving Candidates" : "Paused / Draft"}
            </div>
          </div>
        </div>
      </div>

      {/* List of Assigned Questions */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">
            Questions in this Monthly Bank ({questions.length})
          </span>
          <span className="text-muted-foreground">
            Candidates from {bank.departmentName.trim()} will be evaluated on these questions
          </span>
        </div>

        {questions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileQuestion size={32} className="mx-auto text-muted-foreground opacity-40" />
            <p className="text-sm font-semibold text-foreground">No questions assigned to this bank yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Click "Add / Assign Questions" to select from the 581 master questions, or click "Auto-Fill Tagged" to immediately load questions matching this department.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={onAutoFill}
                variant="outline"
                className="text-xs gap-1.5"
              >
                <Sparkles size={13} className="text-teal-600" />
                Auto-Fill Matching Questions
              </Button>
              <Button
                size="sm"
                onClick={onOpenAssign}
                className="text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Plus size={14} />
                Select Questions
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {questions.map((q, idx) => {
              const isExpanded = expandedId === q.id;

              return (
                <div key={q.id} className="p-4 transition-colors hover:bg-muted/20 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-mono text-muted-foreground text-[10px]">#{idx + 1}</span>
                        <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-[11px]">
                          {q.code}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {q.domainCode}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] px-1.5 py-0 capitalize",
                            q.difficulty === "basic"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : q.difficulty === "medium"
                              ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"
                              : "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400"
                          )}
                        >
                          {q.difficulty}
                        </Badge>
                      </div>

                      <p className="text-xs font-medium text-foreground pt-0.5 leading-relaxed">
                        {q.question}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setExpandedId(isExpanded ? null : q.id)}
                        title="Toggle options"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => {
                          if (window.confirm(`Remove question ${q.code} from this monthly bank?`)) {
                            onRemoveQuestion(q.id);
                          }
                        }}
                        title="Remove from Bank"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Options */}
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-border/60 space-y-2 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {q.options?.map((opt: string, optIdx: number) => {
                          const isCorrect = optIdx === q.correctOptionIndex;
                          return (
                            <div
                              key={optIdx}
                              className={cn(
                                "p-2 rounded-lg border flex items-center gap-2",
                                isCorrect
                                  ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold"
                                  : "bg-muted/30 border-border text-muted-foreground"
                              )}
                            >
                              <span className="font-bold text-[10px] size-4 rounded bg-background border flex items-center justify-center shrink-0">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="flex-1">{opt}</span>
                              {isCorrect && <Check size={13} className="text-emerald-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-muted-foreground text-[11px] leading-relaxed">
                          <strong className="text-foreground">Clinical Rationale: </strong>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENT: Assign Questions Dialog (Selector from Master Pool)
// ---------------------------------------------------------------------------
interface AssignQuestionsDialogProps {
  bank: any;
  allQuestions: any[];
  departmentList: { id: number; name: string; isClinical?: boolean }[];
  onClose: () => void;
  onSave: (selectedIds: number[]) => void;
  isSaving: boolean;
}

function AssignQuestionsDialog({
  bank,
  allQuestions,
  departmentList,
  onClose,
  onSave,
  isSaving,
}: AssignQuestionsDialogProps) {
  const initialIds = useMemo(() => {
    return new Set<number>((Array.isArray(bank.questionIds) ? bank.questionIds : []) as number[]);
  }, [bank]);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(initialIds);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDeptScope, setFilterDeptScope] = useState<"all" | "recommended" | "clinical">("all");
  const [filterDomain, setFilterDomain] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");

  const isBankDeptClinical = useMemo(() => {
    const d = departmentList.find(
      (item) => item.name.trim().toLowerCase() === bank.departmentName.trim().toLowerCase()
    );
    return d?.isClinical ?? false;
  }, [departmentList, bank.departmentName]);

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      if (filterDomain !== "all" && q.domainCode !== filterDomain) return false;
      if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) return false;
      if (filterSearch.trim()) {
        const s = filterSearch.toLowerCase().trim();
        const matchesCode = (q.code || "").toLowerCase().includes(s);
        const matchesText = (q.question || "").toLowerCase().includes(s);
        if (!matchesCode && !matchesText) return false;
      }
      if (filterDeptScope !== "all") {
        const tags = Array.isArray(q.departmentTags) ? q.departmentTags : [];
        if (filterDeptScope === "clinical") {
          return tags.some((t: string) => t.trim().toLowerCase() === "clinical");
        }
        if (filterDeptScope === "recommended") {
          const deptLower = bank.departmentName.trim().toLowerCase();
          return tags.some((t: string) => {
            const tLow = t.trim().toLowerCase();
            if (tLow === deptLower || tLow === "all") return true;
            if (isBankDeptClinical && tLow === "clinical") return true;
            return false;
          });
        }
      }
      return true;
    });
  }, [allQuestions, filterSearch, filterDomain, filterDifficulty, filterDeptScope, bank.departmentName, isBankDeptClinical]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredQuestions.forEach((q) => next.add(q.id));
      return next;
    });
  };

  const deselectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredQuestions.forEach((q) => next.delete(q.id));
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Dialog Header */}
        <div className="px-5 py-4 border-b border-border bg-card flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CheckSquare size={16} className="text-teal-600" />
              Assign Questions • {bank.departmentName.trim()} ({formatMonthLabel(bank.monthYear)})
              {isBankDeptClinical && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 font-semibold">
                  Clinical Department
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              Select questions from the master question pool to include in this department's monthly examination.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-3 border-b border-border bg-muted/30 grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs shrink-0">
          <div className="relative sm:col-span-2">
            <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by code or keywords..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs"
            />
          </div>

          <div>
            <select
              value={filterDeptScope}
              onChange={(e) => setFilterDeptScope(e.target.value as any)}
              className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs font-medium"
            >
              <option value="all">Scope: All Questions</option>
              <option value="recommended">
                ⭐ Recommended ({bank.departmentName.trim()}{isBankDeptClinical ? " + Clinical + All" : " + All"})
              </option>
              <option value="clinical">🏥 "Clinical" Tag Only</option>
            </select>
          </div>

          <div>
            <select
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs"
            >
              <option value="all">All Domains</option>
              {COMPETENCY_DOMAINS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs"
            >
              <option value="all">All Difficulties</option>
              <option value="basic">Basic</option>
              <option value="medium">Medium</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Bulk select action strip */}
        <div className="px-5 py-2 border-b border-border/60 bg-muted/10 flex items-center justify-between text-xs shrink-0">
          <span className="text-muted-foreground">
            Showing {filteredQuestions.length} questions • <strong>{selectedIds.size}</strong> selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllFiltered}
              className="text-teal-600 dark:text-teal-400 font-semibold hover:underline"
            >
              Select All Filtered ({filteredQuestions.length})
            </button>
            <span>•</span>
            <button
              onClick={deselectAllFiltered}
              className="text-rose-600 hover:underline"
            >
              Clear Selection
            </button>
          </div>
        </div>

        {/* Scrollable Questions List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border p-3 space-y-1">
          {filteredQuestions.map((q) => {
            const isChecked = selectedIds.has(q.id);
            const tags = Array.isArray(q.departmentTags) ? q.departmentTags : [];

            return (
              <div
                key={q.id}
                onClick={() => toggleSelect(q.id)}
                className={cn(
                  "p-3 rounded-lg border transition-colors flex items-start gap-3 cursor-pointer text-xs",
                  isChecked
                    ? "bg-teal-50/60 dark:bg-teal-950/30 border-teal-300 dark:border-teal-800"
                    : "bg-card border-border/60 hover:bg-muted/30"
                )}
              >
                <div className="pt-0.5 shrink-0">
                  {isChecked ? (
                    <CheckSquare size={16} className="text-teal-600" />
                  ) : (
                    <Square size={16} className="text-muted-foreground" />
                  )}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-[10px]">
                      {q.code}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      {q.domainCode}
                    </Badge>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 capitalize">
                      {q.difficulty}
                    </Badge>

                    {tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        {tags.map((t: string) => {
                          const isClin = t.trim().toLowerCase() === "clinical";
                          return (
                            <Badge
                              key={t}
                              variant={isClin ? "default" : "outline"}
                              className={cn(
                                "text-[8px] px-1 py-0",
                                isClin
                                  ? "bg-teal-600 text-white border-teal-600 font-semibold"
                                  : "text-muted-foreground"
                              )}
                            >
                              {isClin ? "🏥 Clinical" : t.trim()}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <p className="text-foreground leading-relaxed font-medium">
                    {q.question}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-card flex items-center justify-between shrink-0">
          <div className="text-xs font-semibold text-foreground">
            Selected: <span className="font-bold text-teal-600 font-mono text-sm">{selectedIds.size}</span> questions
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => onSave(Array.from(selectedIds))}
              disabled={isSaving}
              className="text-xs bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
            >
              {isSaving ? "Saving..." : `Save Question Bank (${selectedIds.size})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
