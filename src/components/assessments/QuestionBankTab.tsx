import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
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
} from "lucide-react";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { cn } from "@/utils/cn";

const CLINICAL_DEPTS = [
  "ICU/HDU",
  "OT",
  "Ward",
  "NICU",
  "OPD",
  "CSSD",
  "Radiology",
  "ART",
  "Nursing Central",
  "Emergency",
];

const COMPETENCY_DOMAINS = [
  { code: "HIC", name: "Hospital Infection Control" },
  { code: "PSQ", name: "Patient Safety & Quality" },
  { code: "MOM", name: "Medication Management" },
  { code: "COP_BLS", name: "BLS & Emergency Protocols" },
  { code: "PROCEDURES", name: "Core Clinical Procedures" },
  { code: "DOC_COMM", name: "Clinical Documentation" },
  { code: "HR_POLICY", name: "Hospital HR Policies & Code of Conduct" },
];

export function QuestionBankTab() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input to avoid refetching on every keystroke
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [isQuestionFormOpen, setIsQuestionFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);

  // Form states for creating/editing question
  const [code, setCode] = useState("");
  const [domainCode, setDomainCode] = useState("HIC");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [departmentTags, setDepartmentTags] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<"basic" | "medium" | "advanced">("medium");
  const [defaultTimeSeconds, setDefaultTimeSeconds] = useState(60);

  // Fetch Questions (Server-side Paginated)
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: [
      "skill-assessment-questions",
      page,
      pageSize,
      selectedDept,
      selectedDomain,
      selectedDifficulty,
      debouncedSearch,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (selectedDept !== "all") params.set("department", selectedDept);
      if (selectedDomain !== "all") params.set("domainCode", selectedDomain);
      if (selectedDifficulty !== "all") params.set("difficulty", selectedDifficulty);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/skill-assessment/questions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load questions");
      return res.json();
    },
  });

  const questions: any[] = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
    ? response.data
    : [];

  const pagination =
    response && !Array.isArray(response) && response.pagination
      ? response.pagination
      : {
          page,
          pageSize,
          totalRecords: questions.length,
          totalPages: Math.max(1, Math.ceil(questions.length / (pageSize === 0 ? questions.length || 1 : pageSize))),
        };

  const totalRecords: number = pagination.totalRecords ?? questions.length;
  const totalPages: number = pagination.totalPages ?? 1;

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
          : "New theoretical question added to question bank"
      );
      queryClient.invalidateQueries({ queryKey: ["skill-assessment-questions"] });
      setIsQuestionFormOpen(false);
      setEditingQuestion(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save question");
    },
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
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to deactivate question");
    },
  });

  const openCreateModal = () => {
    setEditingQuestion(null);
    setCode(`MCQ-${selectedDomain !== "all" ? selectedDomain : "GEN"}-${String(totalRecords + 1).padStart(2, "0")}`);
    setDomainCode(selectedDomain !== "all" ? selectedDomain : "HIC");
    setQuestionText("");
    setOptions(["", "", "", ""]);
    setCorrectOptionIndex(0);
    setExplanation("");
    setDepartmentTags(selectedDept !== "all" ? [selectedDept] : []);
    setDifficulty("medium");
    setDefaultTimeSeconds(60);
    setIsQuestionFormOpen(true);
  };

  const openEditModal = (q: any) => {
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
    setDepartmentTags((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
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
    <div className="space-y-4">
      {/* Top Action & KPI Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card shadow-2xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BookOpen size={16} className="text-teal-600 dark:text-teal-400" />
              NABH Theoretical Question Bank
            </h3>
            <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono">
              {totalRecords} Questions
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Curated clinical questions tagged by clinical departments and competency domains for online CBT examination.
          </p>
        </div>

        <div className="flex items-center gap-2">


          <Button
            size="sm"
            onClick={openCreateModal}
            className="text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-2xs"
          >
            <Plus size={14} />
            Add Question
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-xl border border-border bg-muted/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search questions or codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8.5 pl-8 pr-3 rounded-lg border border-border bg-background text-xs focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setPage(1);
            }}
            className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-background text-xs"
          >
            <option value="all">All Clinical Departments</option>
            {CLINICAL_DEPTS.map((d) => (
              <option key={d} value={d}>
                {d}
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
            {COMPETENCY_DOMAINS.map((dm) => (
              <option key={dm.code} value={dm.code}>
                {dm.code} - {dm.name}
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
            <option value="all">All Difficulty Levels</option>
            <option value="basic">Basic (Foundational)</option>
            <option value="medium">Medium (Clinical Standard)</option>
            <option value="advanced">Advanced (Critical Care / Complex)</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
          Loading question bank...
        </div>
      ) : questions.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-border rounded-xl space-y-2">
          <FileQuestion size={28} className="mx-auto text-muted-foreground/60" />
          <p className="text-xs font-semibold text-foreground">No questions found matching criteria</p>
          <p className="text-[11px] text-muted-foreground">
            Try adjusting your search filters or click "Add Question" to create one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q: any) => {
            const isExpanded = expandedQuestionId === q.id;
            const tags = Array.isArray(q.departmentTags) ? (q.departmentTags as string[]) : [];
            const opts = Array.isArray(q.options) ? q.options : [];

            return (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-border bg-card shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {q.code}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-medium border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-300">
                      {q.domainCode}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-medium",
                        q.difficulty === "advanced"
                          ? "border-rose-300 text-rose-700 dark:text-rose-400"
                          : q.difficulty === "basic"
                          ? "border-blue-300 text-blue-700 dark:text-blue-400"
                          : "border-slate-300 text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {q.difficulty}
                    </Badge>

                    {tags.length === 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
                        Hospital-Wide (All Depts)
                      </span>
                    ) : (
                      tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium"
                        >
                          {t}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] text-muted-foreground mr-1 flex items-center gap-1 font-mono">
                      <Clock size={11} />
                      {q.defaultTimeSeconds || 60}s
                    </span>
                    <button
                      onClick={() => openEditModal(q)}
                      className="size-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                      title="Edit question"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Deactivate question ${q.code}?`)) {
                          deleteQuestionMutation.mutate(q.id);
                        }
                      }}
                      className="size-7 rounded-md text-muted-foreground hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                      title="Deactivate question"
                    >
                      <Trash2 size={13} />
                    </button>
                    <button
                      onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                      className="size-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Question Statement */}
                <div className="text-xs font-semibold text-foreground leading-relaxed">
                  {q.question}
                </div>

                {/* Options Preview (Expandable or Preview) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  {opts.map((opt: string, idx: number) => {
                    const isCorrect = idx === q.correctOptionIndex;
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "p-2 rounded-lg border text-[11px] flex items-center gap-2 transition-colors",
                          isCorrect
                            ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-medium"
                            : "border-border bg-background/50 text-muted-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "size-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                            isCorrect
                              ? "bg-emerald-600 text-white"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {letter}
                        </span>
                        <span className="truncate flex-1">{opt}</span>
                        {isCorrect && (
                          <Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Expanded Details & Guidelines */}
                {isExpanded && q.explanation && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-border text-[11px] space-y-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Clinical Guideline / Rationale:
                    </span>
                    <p className="text-muted-foreground leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && totalRecords > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card shadow-2xs text-xs">
          <div className="text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {pageSize === 0 ? (totalRecords === 0 ? 0 : 1) : (page - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-foreground">
              {pageSize === 0 ? totalRecords : Math.min((page - 1) * pageSize + questions.length, totalRecords)}
            </span>{" "}
            of <span className="font-semibold text-foreground">{totalRecords}</span> questions
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-muted-foreground text-[11px]">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-7 px-2 rounded-md border border-border bg-background text-xs cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={0}>All ({totalRecords})</option>
              </select>
            </div>

            {pageSize > 0 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="h-7 px-2 text-xs gap-1 cursor-pointer"
                >
                  <ChevronLeft size={13} />
                  Prev
                </Button>

                <span className="px-2 font-mono text-xs text-muted-foreground">
                  {page} / {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="h-7 px-2 text-xs gap-1 cursor-pointer"
                >
                  Next
                  <ChevronRight size={13} />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Question Modal */}
      {isQuestionFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <FileQuestion size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {editingQuestion ? "Edit Theoretical Question" : "Add Theoretical Question"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Define clinical scenario, MCQ options, correct choice, and departmental tags
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuestionFormOpen(false)}
                className="size-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Question Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full h-8.5 px-3 rounded-lg border border-border bg-background text-xs font-mono"
                    placeholder="e.g. MCQ-ICU-05"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-foreground">Competency Domain</label>
                  <select
                    value={domainCode}
                    onChange={(e) => setDomainCode(e.target.value)}
                    className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-background text-xs"
                  >
                    {COMPETENCY_DOMAINS.map((dm) => (
                      <option key={dm.code} value={dm.code}>
                        {dm.code} - {dm.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-foreground">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-background text-xs"
                  >
                    <option value="basic">Basic (Foundational)</option>
                    <option value="medium">Medium (Standard Clinical)</option>
                    <option value="advanced">Advanced (Complex Protocol)</option>
                  </select>
                </div>
              </div>

              {/* Department Tagging */}
              <div className="space-y-1.5 p-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/30">
                <label className="font-semibold block text-foreground">
                  Clinical Department Tagging
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Select one or more departments this question applies to. If none are selected, it becomes <strong>Hospital-Wide</strong> (accessible to all departments).
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CLINICAL_DEPTS.map((dept) => {
                    const isSelected = departmentTags.includes(dept);
                    return (
                      <button
                        type="button"
                        key={dept}
                        onClick={() => toggleDeptTag(dept)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {dept}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="font-semibold block mb-1 text-foreground">
                  Question Statement / Clinical Scenario
                </label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-lg border border-border bg-background text-xs leading-relaxed focus:ring-1 focus:ring-primary"
                  placeholder="Enter clear clinical question or patient scenario..."
                  required
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="font-semibold block text-foreground">
                  Options & Correct Answer
                </label>
                <span className="text-[11px] text-muted-foreground block -mt-1 mb-2">
                  Click the radio button corresponding to the correct answer.
                </span>

                <div className="space-y-2">
                  {options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isCorrect = correctOptionIndex === idx;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center gap-2.5 p-2 rounded-lg border transition-colors",
                          isCorrect
                            ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30"
                            : "border-border bg-background"
                        )}
                      >
                        <input
                          type="radio"
                          name="correctOption"
                          checked={isCorrect}
                          onChange={() => setCorrectOptionIndex(idx)}
                          className="size-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span
                          className={cn(
                            "size-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0",
                            isCorrect
                              ? "bg-emerald-600 text-white"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {letter}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...options];
                            updated[idx] = e.target.value;
                            setOptions(updated);
                          }}
                          placeholder={`Option ${letter} text...`}
                          className="flex-1 h-8 px-2.5 rounded border border-border bg-background text-xs focus:ring-1 focus:ring-primary"
                          required
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="font-semibold block mb-1 text-foreground">
                  Clinical Guideline & Rationale (Educational feedback after submit)
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-xs leading-relaxed"
                  placeholder="Explain why this option is correct based on NABH / hospital protocols..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQuestionFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saveQuestionMutation.isPending}
                  className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
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
