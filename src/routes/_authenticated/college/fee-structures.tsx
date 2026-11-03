import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calculator,
  Plus,
  Pencil,
  Trash2,
  Search,
  GraduationCap,
  Home,
  UtensilsCrossed,
  Layers,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/college/fee-structures")({
  component: MonthlyFeeStructuresPage,
});

export const QUOTA_CATEGORIES = [
  { value: "general", label: "General / Standard", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" },
  { value: "management", label: "Management Quota", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  { value: "government", label: "Government (Subsidized)", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  { value: "scholarship", label: "Scholarship / Merit", color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800" },
  { value: "nri", label: "NRI / Foreign National", color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" },
];

export const getQuotaCategory = (val?: string) => {
  const normalized = (val || "general").toLowerCase();
  return QUOTA_CATEGORIES.find((q) => q.value === normalized) || {
    value: normalized,
    label: (val || "General").toUpperCase(),
    color: "bg-slate-100 text-slate-700 border-slate-200",
  };
};

export interface MonthlyFeeStructure {
  id: number;
  courseId: number;
  courseName?: string;
  quotaCategory: string;
  academicYear: string;
  monthlyCourseFee: number;
  monthlyHostelFee: number;
  monthlyMessFee: number;
  monthlyTotal: number;
  tuitionFee?: string;
  hostelFee?: string;
  hostelMessMonthlyFee?: string;
  totalAmount?: string;
}

// Backward compatibility types & helpers for callers
export type FeeStructure = MonthlyFeeStructure;

export interface ComponentFrequencyRow {
  id: string;
  key: string;
  label: string;
  count: number;
  rebatePercent: number;
  surchargePercent: number;
}

export interface FeeComponent {
  id: string;
  name: string;
  amount: number;
  frequencyRows: ComponentFrequencyRow[];
  selectedFrequencyKey: string;
}

export const createDefaultFrequencyRows = (
  selectedKey = "annually",
  defaultRebate = 10,
  defaultSurcharge = 0
): ComponentFrequencyRow[] => [
  { id: "f-monthly", key: "monthly", label: "Monthly", count: 12, rebatePercent: 0, surchargePercent: selectedKey === "monthly" ? defaultSurcharge : 9 },
  { id: "f-quarterly", key: "quarterly", label: "Quarterly", count: 4, rebatePercent: 0, surchargePercent: selectedKey === "quarterly" ? defaultSurcharge : 0 },
  { id: "f-semester", key: "semester", label: "Per-Semester", count: 2, rebatePercent: 0, surchargePercent: 0 },
  { id: "f-annually", key: "annually", label: "Annually", count: 1, rebatePercent: selectedKey === "annually" ? defaultRebate : 0, surchargePercent: 0 },
];

export const createDefaultComponent = (
  id: string,
  name: string,
  amount: number,
  selectedFrequencyKey = "annually",
  defaultRebate = 10,
  defaultSurcharge = 0,
  customRows?: ComponentFrequencyRow[]
): FeeComponent => ({
  id,
  name,
  amount,
  selectedFrequencyKey,
  frequencyRows: customRows || createDefaultFrequencyRows(selectedFrequencyKey, defaultRebate, defaultSurcharge),
});

export function MonthlyFeeStructuresPage() {
  const queryClient = useQueryClient();

  // Filters
  const [selectedAy, setSelectedAy] = React.useState<string>("all");
  const [selectedCourseId, setSelectedCourseId] = React.useState<string>("all");
  const [selectedQuota, setSelectedQuota] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingStructure, setEditingStructure] = React.useState<MonthlyFeeStructure | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = React.useState<MonthlyFeeStructure | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // Form Fields
  const [formAy, setFormAy] = React.useState<string>(() => {
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    const startYear = curMonth >= 6 ? curYear : curYear - 1;
    return `${startYear}-${startYear + 1}`;
  });
  const [formCourseId, setFormCourseId] = React.useState<number | "">("");
  const [formQuota, setFormQuota] = React.useState<string>("general");
  const [formCourseFee, setFormCourseFee] = React.useState<number>(0);
  const [formHostelFee, setFormHostelFee] = React.useState<number>(0);
  const [formMessFee, setFormMessFee] = React.useState<number>(0);

  // Queries
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery<any[]>({
    queryKey: ["nursing", "courses"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/courses");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: structures = [], isLoading: isLoadingStructures } = useQuery<MonthlyFeeStructure[]>({
    queryKey: ["nursing", "fees", "structures"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/fees/structures");
      if (!res.ok) throw new Error("Failed to fetch fee structures");
      return res.json();
    },
  });

  // Extract distinct academic years
  const availableAcademicYears = React.useMemo(() => {
    const set = new Set<string>();
    structures.forEach((s) => {
      if (s.academicYear) set.add(s.academicYear);
    });
    const curYear = new Date().getFullYear();
    set.add(`${curYear}-${curYear + 1}`);
    set.add(`${curYear - 1}-${curYear}`);
    return Array.from(set).sort().reverse();
  }, [structures]);

  // Filtered structures
  const filteredStructures = React.useMemo(() => {
    return structures.filter((s) => {
      if (selectedAy !== "all" && s.academicYear !== selectedAy) return false;
      if (selectedCourseId !== "all" && String(s.courseId) !== selectedCourseId) return false;
      if (selectedQuota !== "all" && (s.quotaCategory || "general").toLowerCase() !== selectedQuota.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const cName = (s.courseName || "").toLowerCase();
        const quota = (s.quotaCategory || "").toLowerCase();
        const ay = (s.academicYear || "").toLowerCase();
        if (!cName.includes(query) && !quota.includes(query) && !ay.includes(query)) return false;
      }
      return true;
    });
  }, [structures, selectedAy, selectedCourseId, selectedQuota, searchQuery]);

  // Aggregate stats
  const stats = React.useMemo(() => {
    const totalCount = filteredStructures.length;
    if (totalCount === 0) {
      return { totalCount: 0, avgCourse: 0, avgHostel: 0, avgMess: 0, avgTotal: 0 };
    }
    const sumCourse = filteredStructures.reduce((acc, s) => acc + (s.monthlyCourseFee || 0), 0);
    const sumHostel = filteredStructures.reduce((acc, s) => acc + (s.monthlyHostelFee || 0), 0);
    const sumMess = filteredStructures.reduce((acc, s) => acc + (s.monthlyMessFee || 0), 0);
    const sumTotal = filteredStructures.reduce((acc, s) => acc + (s.monthlyTotal || 0), 0);
    return {
      totalCount,
      avgCourse: Math.round(sumCourse / totalCount),
      avgHostel: Math.round(sumHostel / totalCount),
      avgMess: Math.round(sumMess / totalCount),
      avgTotal: Math.round(sumTotal / totalCount),
    };
  }, [filteredStructures]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingStructure(null);
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    const startYear = curMonth >= 6 ? curYear : curYear - 1;
    setFormAy(`${startYear}-${startYear + 1}`);
    setFormCourseId(courses.length > 0 ? courses[0].id : "");
    setFormQuota("general");
    setFormCourseFee(0);
    setFormHostelFee(0);
    setFormMessFee(0);
    setFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (struct: MonthlyFeeStructure) => {
    setEditingStructure(struct);
    setFormAy(struct.academicYear);
    setFormCourseId(struct.courseId);
    setFormQuota(struct.quotaCategory || "general");
    setFormCourseFee(struct.monthlyCourseFee || 0);
    setFormHostelFee(struct.monthlyHostelFee || 0);
    setFormMessFee(struct.monthlyMessFee || 0);
    setFormOpen(true);
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/nursing/fees/structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create fee structure");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nursing", "fees", "structures"] });
      toast.success("Monthly fee structure created successfully");
      setFormOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not save fee structure");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/nursing/fees/structures/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update fee structure");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nursing", "fees", "structures"] });
      toast.success("Monthly fee structure updated successfully");
      setFormOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not update fee structure");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/nursing/fees/structures/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete fee structure");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nursing", "fees", "structures"] });
      toast.success("Monthly fee structure deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not delete fee structure");
    },
  });

  // Submit Handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCourseId || typeof formCourseId !== "number") {
      toast.error("Please select a course program");
      return;
    }
    if (!formAy.trim()) {
      toast.error("Please specify an academic year");
      return;
    }

    const payload = {
      courseId: formCourseId,
      academicYear: formAy.trim(),
      quotaCategory: formQuota,
      paymentFrequency: "monthly",
      feeType: "Monthly Fee Structure",
      monthlyCourseFee: Number(formCourseFee) || 0,
      monthlyHostelFee: Number(formHostelFee) || 0,
      monthlyMessFee: Number(formMessFee) || 0,
    };

    if (editingStructure) {
      updateMutation.mutate({ id: editingStructure.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const calculatedMonthlyTotal = (Number(formCourseFee) || 0) + (Number(formHostelFee) || 0) + (Number(formMessFee) || 0);
  const calculatedAnnualTotal = calculatedMonthlyTotal * 12;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-900 text-white p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-teal-500/30 text-teal-100 text-xs px-2.5 py-0.5 rounded-full font-medium border border-teal-400/20">
              College Fee Master
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Monthly Fee Structures</h1>
          <p className="text-teal-100/90 text-sm mt-1 max-w-2xl">
            Configure standardized monthly billing rates for <strong>Course Fee</strong>, <strong>Hostel Fee</strong>, and <strong>Mess Fee</strong>.
            These rates automatically prefill when issuing monthly receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenCreate}
            className="bg-white text-teal-800 hover:bg-teal-50 font-semibold shadow-sm gap-2"
          >
            <Plus className="w-4 h-4" />
            New Monthly Structure
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <Card className="border-border/60 shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Structures</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.totalCount}</p>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Layers className="w-3 h-3" /> Across all programs
            </span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-teal-600 dark:text-teal-400 font-medium uppercase tracking-wider">Avg. Course / Mo</p>
            <p className="text-2xl font-bold text-foreground mt-1">₹{stats.avgCourse.toLocaleString()}</p>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <GraduationCap className="w-3 h-3 text-teal-600" /> ₹{(stats.avgCourse * 12).toLocaleString()}/yr
            </span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium uppercase tracking-wider">Avg. Hostel / Mo</p>
            <p className="text-2xl font-bold text-foreground mt-1">₹{stats.avgHostel.toLocaleString()}</p>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Home className="w-3 h-3 text-indigo-600" /> ₹{(stats.avgHostel * 12).toLocaleString()}/yr
            </span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">Avg. Mess / Mo</p>
            <p className="text-2xl font-bold text-foreground mt-1">₹{stats.avgMess.toLocaleString()}</p>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <UtensilsCrossed className="w-3 h-3 text-amber-600" /> ₹{(stats.avgMess * 12).toLocaleString()}/yr
            </span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-teal-50/50 dark:bg-teal-950/20 col-span-2 md:col-span-1 border-teal-200/60 dark:border-teal-800/40">
          <CardContent className="p-4">
            <p className="text-xs text-teal-700 dark:text-teal-300 font-bold uppercase tracking-wider">Full Package / Mo</p>
            <p className="text-2xl font-black text-teal-900 dark:text-teal-100 mt-1">₹{stats.avgTotal.toLocaleString()}</p>
            <span className="text-[11px] text-teal-700/80 dark:text-teal-300/80 flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3" /> Average monthly total
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search program, year, quota..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Academic Year Filter */}
            <Select value={selectedAy} onValueChange={setSelectedAy}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Academic Years</SelectItem>
                {availableAcademicYears.map((ay) => (
                  <SelectItem key={ay} value={ay}>
                    AY {ay}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Course Filter */}
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Course Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Course Programs</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} ({c.code || "Course"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Quota Filter */}
            <Select value={selectedQuota} onValueChange={setSelectedQuota}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Quota Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quotas</SelectItem>
                {QUOTA_CATEGORIES.map((q) => (
                  <SelectItem key={q.value} value={q.value}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Fee Structures Table / Cards */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Active Monthly Fee Tariffs</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Showing {filteredStructures.length} of {structures.length} defined configurations
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingStructures ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              Loading monthly fee structures...
            </div>
          ) : filteredStructures.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">No Fee Structures Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {structures.length === 0
                  ? "Get started by configuring your first monthly fee tariff for a course program and student quota."
                  : "No fee structures match your search or filter criteria. Try resetting filters."}
              </p>
              {structures.length === 0 && (
                <Button
                  onClick={handleOpenCreate}
                  className="mt-4 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Configure First Structure
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Course Program</th>
                    <th className="py-3 px-3 font-semibold">Academic Year</th>
                    <th className="py-3 px-3 font-semibold">Quota Category</th>
                    <th className="py-3 px-3 font-semibold text-right">Course Fee / Mo</th>
                    <th className="py-3 px-3 font-semibold text-right">Hostel Fee / Mo</th>
                    <th className="py-3 px-3 font-semibold text-right">Mess Fee / Mo</th>
                    <th className="py-3 px-4 font-bold text-right text-teal-700 dark:text-teal-300">Total / Mo</th>
                    <th className="py-3 px-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredStructures.map((s) => {
                    const quotaInfo = getQuotaCategory(s.quotaCategory);
                    const courseName = s.courseName || courses.find((c) => c.id === s.courseId)?.name || `Course #${s.courseId}`;

                    return (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-teal-600 shrink-0" />
                            <span>{courseName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            {s.academicYear}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border", quotaInfo.color)}>
                            {quotaInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap font-medium text-foreground">
                          ₹{Number(s.monthlyCourseFee || 0).toLocaleString()}
                          <span className="text-[10px] text-muted-foreground block">
                            (₹{(Number(s.monthlyCourseFee || 0) * 12).toLocaleString()}/yr)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap font-medium text-foreground">
                          {Number(s.monthlyHostelFee || 0) > 0 ? (
                            <>
                              ₹{Number(s.monthlyHostelFee).toLocaleString()}
                              <span className="text-[10px] text-muted-foreground block">
                                (₹{(Number(s.monthlyHostelFee) * 12).toLocaleString()}/yr)
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap font-medium text-foreground">
                          {Number(s.monthlyMessFee || 0) > 0 ? (
                            <>
                              ₹{Number(s.monthlyMessFee).toLocaleString()}
                              <span className="text-[10px] text-muted-foreground block">
                                (₹{(Number(s.monthlyMessFee) * 12).toLocaleString()}/yr)
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800 text-sm">
                            ₹{Number(s.monthlyTotal || 0).toLocaleString()}
                            <span className="text-[10px] font-normal text-teal-600/80 dark:text-teal-400/80 block">
                              / month
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(s)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Edit Structure"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget(s);
                                setDeleteOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              title="Delete Structure"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Calculator className="w-5 h-5 text-teal-600" />
              {editingStructure ? "Edit Monthly Fee Structure" : "New Monthly Fee Structure"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the standardized monthly rates per fee head. These values will automatically populate in the fees payment dialog.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* Academic Year and Course */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Academic Session / Year <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2026-2027"
                  value={formAy}
                  onChange={(e) => setFormAy(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Course Program <span className="text-destructive">*</span>
                </label>
                <Select
                  value={formCourseId ? String(formCourseId) : ""}
                  onValueChange={(val) => setFormCourseId(Number(val))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select course..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} ({c.code || "Course"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quota Category */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Student Quota Category <span className="text-destructive">*</span>
              </label>
              <Select value={formQuota} onValueChange={setFormQuota}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select quota..." />
                </SelectTrigger>
                <SelectContent>
                  {QUOTA_CATEGORIES.map((q) => (
                    <SelectItem key={q.value} value={q.value}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Monthly Fee Rates Grid */}
            <div className="rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/40 dark:bg-teal-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-teal-200/60 dark:border-teal-800/60 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Standard Monthly Rates (₹ / month)
                </span>
                <span className="text-[11px] text-muted-foreground">Billed strictly per month</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {/* Course Fee */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-teal-600" /> Course / Tuition
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-medium text-muted-foreground">₹</span>
                    <input
                      type="number"
                      min={0}
                      value={formCourseFee === 0 ? "" : formCourseFee}
                      onChange={(e) => setFormCourseFee(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    = ₹{(formCourseFee * 12).toLocaleString()}/yr
                  </span>
                </div>

                {/* Hostel Fee */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                    <Home className="w-3.5 h-3.5 text-indigo-600" /> Hostel Room
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-medium text-muted-foreground">₹</span>
                    <input
                      type="number"
                      min={0}
                      value={formHostelFee === 0 ? "" : formHostelFee}
                      onChange={(e) => setFormHostelFee(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    = ₹{(formHostelFee * 12).toLocaleString()}/yr
                  </span>
                </div>

                {/* Mess Fee */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" /> Mess & Food
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-medium text-muted-foreground">₹</span>
                    <input
                      type="number"
                      min={0}
                      value={formMessFee === 0 ? "" : formMessFee}
                      onChange={(e) => setFormMessFee(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    = ₹{(formMessFee * 12).toLocaleString()}/yr
                  </span>
                </div>
              </div>

              {/* Total Live Preview */}
              <div className="mt-3 p-3 rounded-lg bg-teal-100/70 dark:bg-teal-900/50 border border-teal-300 dark:border-teal-700/60 flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal-800 dark:text-teal-200 font-bold uppercase tracking-wider">
                    Total Monthly Package
                  </p>
                  <p className="text-[11px] text-teal-700 dark:text-teal-300">
                    Annual Equivalent: ₹{calculatedAnnualTotal.toLocaleString()} / year
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-teal-900 dark:text-teal-100">
                    ₹{calculatedMonthlyTotal.toLocaleString()}
                  </span>
                  <span className="text-xs text-teal-700 dark:text-teal-300 block">/ month</span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5"
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingStructure ? "Save Changes" : "Create Fee Structure"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" /> Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Are you sure you want to delete this monthly fee structure? This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
              <p><strong>Course:</strong> {deleteTarget.courseName || `Course #${deleteTarget.courseId}`}</p>
              <p><strong>Academic Year:</strong> {deleteTarget.academicYear}</p>
              <p><strong>Quota:</strong> {deleteTarget.quotaCategory}</p>
              <p><strong>Monthly Total:</strong> ₹{Number(deleteTarget.monthlyTotal || 0).toLocaleString()} / mo</p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="text-xs font-semibold"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Structure"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
