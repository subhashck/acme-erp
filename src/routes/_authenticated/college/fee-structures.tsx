import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import {
  Tag,
  Calculator,
  Pencil,
  Trash2,
  Layers,
  Plus,
  Receipt,
  BookOpen,
  Calendar,
  Percent,
  Search,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Eye,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/Field";
import { toast } from "@/lib/toast";
import { toNum } from "@/utils/math";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CollegeAccessGuard } from "@/components/CollegeAccessGuard";

export const Route = createFileRoute("/_authenticated/college/fee-structures")({
  component: () => (
    <CollegeAccessGuard>
      <FeeStructureMasterPage />
    </CollegeAccessGuard>
  ),
});

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

export interface FrequencyTemplate {
  key: string;
  label: string;
  count: number;
}

export const STANDARD_FREQUENCY_TEMPLATES: FrequencyTemplate[] = [
  { key: "one_time", label: "One-Time (Course Duration)", count: 1 },
  { key: "monthly", label: "Monthly", count: 12 },
  { key: "quarterly", label: "Quarterly", count: 4 },
  { key: "semester", label: "Per-Semester", count: 2 },
  { key: "annually", label: "Annually", count: 1 },
];

export const QUOTA_CATEGORIES = [
  { value: "none", label: "General / Standard" },
  { value: "scholarship", label: "Scholarship / Merit / Concession" },
  { value: "government", label: "Government Quota (Subsidized)" },
  { value: "management", label: "Management / Institutional Quota" },
  { value: "nri", label: "NRI / Foreign National" },
];

export const getQuotaCategoryLabel = (quota?: string) => {
  const found = QUOTA_CATEGORIES.find((q) => q.value === (quota || "none"));
  return found ? found.label : (quota ? quota.toUpperCase() : "General / Standard");
};

export const createAllFrequencyRows = (
  selectedKey = "annually",
  defaultRebate = 10,
  defaultSurcharge = 0
): ComponentFrequencyRow[] => [
  { id: "f-monthly", key: "monthly", label: "Monthly", count: 12, rebatePercent: 0, surchargePercent: selectedKey === "monthly" ? defaultSurcharge : 9 },
  { id: "f-quarterly", key: "quarterly", label: "Quarterly", count: 4, rebatePercent: 0, surchargePercent: selectedKey === "quarterly" ? defaultSurcharge : 0 },
  { id: "f-semester", key: "semester", label: "Per-Semester", count: 2, rebatePercent: 0, surchargePercent: 0 },
  { id: "f-annually", key: "annually", label: "Annually", count: 1, rebatePercent: selectedKey === "annually" ? defaultRebate : 0, surchargePercent: 0 },
];

export const createDefaultFrequencyRows = (
  selectedKey = "annually",
  defaultRebate = 0,
  defaultSurcharge = 0
): ComponentFrequencyRow[] => {
  const tmpl = STANDARD_FREQUENCY_TEMPLATES.find((t) => t.key === selectedKey) || STANDARD_FREQUENCY_TEMPLATES.find((t) => t.key === "annually") || STANDARD_FREQUENCY_TEMPLATES[0];
  return [
    {
      id: `f-${tmpl.key}`,
      key: tmpl.key,
      label: tmpl.label,
      count: tmpl.count,
      rebatePercent: defaultRebate,
      surchargePercent: defaultSurcharge,
    },
  ];
};

export const createDefaultComponent = (
  id: string,
  name: string,
  amount: number,
  selectedKey = "annually",
  defaultRebate = 0,
  defaultSurcharge = 0,
  customRows?: ComponentFrequencyRow[]
): FeeComponent => ({
  id,
  name,
  amount,
  selectedFrequencyKey: selectedKey,
  frequencyRows: customRows || createDefaultFrequencyRows(selectedKey, defaultRebate, defaultSurcharge),
});

export const DEFAULT_FEE_COMPONENTS: FeeComponent[] = [
  createDefaultComponent("c1", "Course Fee", 100000, "annually", 10, 0, createAllFrequencyRows("annually", 10, 0)),
  createDefaultComponent("c2", "Admission Fee", 10000, "annually", 0, 0),
  createDefaultComponent("c4", "Uniform & Kit Fee", 5000, "annually", 0, 0),
  createDefaultComponent("c5", "Hostel Fee", 36000, "monthly", 0, 0, [
    { id: "f-monthly", key: "monthly", label: "Monthly", count: 12, rebatePercent: 0, surchargePercent: 0 },
    { id: "f-annually", key: "annually", label: "Annually (5% Rebate)", count: 1, rebatePercent: 5, surchargePercent: 0 },
  ]),
  createDefaultComponent("c6", "Mess Fee", 24000, "monthly", 0, 0, [
    { id: "f-monthly", key: "monthly", label: "Monthly", count: 12, rebatePercent: 0, surchargePercent: 0 },
    { id: "f-quarterly", key: "quarterly", label: "Quarterly", count: 4, rebatePercent: 0, surchargePercent: 0 },
    { id: "f-semester", key: "semester", label: "Per-Semester", count: 2, rebatePercent: 0, surchargePercent: 0 },
    { id: "f-annually", key: "annually", label: "Annually", count: 1, rebatePercent: 0, surchargePercent: 0 },
  ]),
  createDefaultComponent("c7", "Examination Fee", 3000, "semester", 0, 0),
  createDefaultComponent("c8", "Library & Misc Fee", 2000, "annually", 0, 0),
];

export interface FeeStructure {
  id: number;
  courseId: number;
  courseName: string;
  quotaCategory: string;
  academicYear: string;
  feeType: string;
  paymentFrequency: string;
  oneTimeRebatePercent: string;
  tuitionFee: string;
  admissionFee: string;
  securityDeposit: string;
  uniformFee: string;
  hostelFee: string;
  hostelMessMonthlyFee: string;
  examFee: string;
  miscFee: string;
  rebatesConfig: string | null;
  surchargesConfig: string | null;
  componentsConfig: string | null;
  totalAmount: string;
}

export const getStructureComponents = (st: FeeStructure): FeeComponent[] => {
  if (st.componentsConfig) {
    try {
      const parsed = JSON.parse(st.componentsConfig);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((comp: FeeComponent) => {
          const isHostelOnly = comp.name?.toLowerCase().includes("hostel") && !comp.name?.toLowerCase().includes("mess");
          if (isHostelOnly && Array.isArray(comp.frequencyRows)) {
            const hasAnnual = comp.frequencyRows.some((r) => r.key === "annually");
            if (!hasAnnual) {
              return {
                ...comp,
                frequencyRows: [
                  ...comp.frequencyRows,
                  { id: "f-annually", key: "annually", label: "Annually (5% Rebate)", count: 1, rebatePercent: 5, surchargePercent: 0 },
                ],
              };
            }
          }
          return comp;
        });
      }
    } catch (e) {
      // Fallback below
    }
  }
  return [
    createDefaultComponent("1", "Course Fee", toNum(st.tuitionFee), "annually", toNum(st.oneTimeRebatePercent), 0, createAllFrequencyRows("annually", toNum(st.oneTimeRebatePercent), 0)),
    createDefaultComponent("2", "Admission Fee", toNum(st.admissionFee), "annually", 0, 0),
    createDefaultComponent("4", "Uniform Fee", toNum(st.uniformFee), "annually", 0, 0),
    createDefaultComponent("5", "Hostel Fee", toNum(st.hostelFee) > 0 ? toNum(st.hostelFee) : (toNum(st.hostelMessMonthlyFee) > 0 ? toNum(st.hostelMessMonthlyFee) * 12 * 0.6 : 36000), "monthly", 0, 0, [
      { id: "f-monthly", key: "monthly", label: "Monthly", count: 12, rebatePercent: 0, surchargePercent: 0 },
      { id: "f-annually", key: "annually", label: "Annually (5% Rebate)", count: 1, rebatePercent: 5, surchargePercent: 0 },
    ]),
    createDefaultComponent("6", "Mess Fee", toNum(st.hostelMessMonthlyFee) > 0 ? toNum(st.hostelMessMonthlyFee) * 12 * 0.4 : 24000, "monthly", 0, 0, [
      { id: "f-monthly", key: "monthly", label: "Monthly", count: 12, rebatePercent: 0, surchargePercent: 0 },
      { id: "f-quarterly", key: "quarterly", label: "Quarterly", count: 4, rebatePercent: 0, surchargePercent: 0 },
      { id: "f-semester", key: "semester", label: "Per-Semester", count: 2, rebatePercent: 0, surchargePercent: 0 },
      { id: "f-annually", key: "annually", label: "Annually", count: 1, rebatePercent: 0, surchargePercent: 0 },
    ]),
    createDefaultComponent("7", "Exam Fee", toNum(st.examFee), "semester", 0, 0),
    createDefaultComponent("8", "Misc Fee", toNum(st.miscFee), "annually", 0, 0),
  ].filter((c) => c.amount > 0);
};

export const calculateStructureTotal = (comps: FeeComponent[]): number => {
  return comps.reduce((sum, item) => {
    const selRow =
      item.frequencyRows?.find((r) => r.key === item.selectedFrequencyKey) || item.frequencyRows?.[0];
    // Omit one-time fees from annual fees calculation
    if (selRow?.key === "one_time" || item.selectedFrequencyKey === "one_time") {
      return sum;
    }
    const amt = Number(item.amount || 0);
    const reb = Number(selRow?.rebatePercent || 0);
    const sur = Number(selRow?.surchargePercent || 0);
    const disc = (amt * reb) / 100;
    const extra = (amt * sur) / 100;
    return sum + Math.max(0, amt - disc + extra);
  }, 0);
};

export const calculateOneTimeTotal = (comps: FeeComponent[]): number => {
  return comps.reduce((sum, item) => {
    const selRow =
      item.frequencyRows?.find((r) => r.key === item.selectedFrequencyKey) || item.frequencyRows?.[0];
    if (selRow?.key === "one_time" || item.selectedFrequencyKey === "one_time") {
      const amt = Number(item.amount || 0);
      const reb = Number(selRow?.rebatePercent || 0);
      const sur = Number(selRow?.surchargePercent || 0);
      const disc = (amt * reb) / 100;
      const extra = (amt * sur) / 100;
      return sum + Math.max(0, amt - disc + extra);
    }
    return sum;
  }, 0);
};

interface FeeStructureCardDetailProps {
  structure: FeeStructure;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

export function FeeStructureCardDetail({
  structure: st,
  onEdit,
  onDelete,
  onClose,
  isModal = false,
}: FeeStructureCardDetailProps) {
  const comps = getStructureComponents(st);
  const grandTotal = calculateStructureTotal(comps);
  const oneTimeTotal = calculateOneTimeTotal(comps);

  return (
    <div className={cn("space-y-4", !isModal && "p-4 border rounded-xl bg-card shadow-xs")}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <span className="font-bold text-lg text-teal-600 block">{st.courseName}</span>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium mt-1">
            <Tag size={13} /> {st.feeType || "Composite Course Fee"}
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
                st.quotaCategory === "scholarship"
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                  : st.quotaCategory === "government"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : st.quotaCategory === "management"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  : st.quotaCategory === "nri"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  : "bg-muted text-foreground border"
              )}
            >
              {getQuotaCategoryLabel(st.quotaCategory)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">
            Academic Year: {st.academicYear}
          </span>
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 border border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950 text-teal-700 dark:text-teal-300"
              title="Edit Fee Structure"
              onClick={onEdit}
            >
              <Pencil size={14} />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400"
              title="Delete Fee Structure"
              onClick={onDelete}
            >
              <Trash2 size={14} />
            </Button>
          )}
          {onClose && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              Collapse ✕
            </Button>
          )}
        </div>
      </div>

      {/* Per-Component Tabular Breakup Tables */}
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-muted/60 px-3 py-2 rounded-lg border">
          <span className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
            Itemized Component Schedule Breakups ({comps.length} Components)
          </span>
          <div className="text-right">
            <span className="text-sm font-bold text-teal-700 dark:text-teal-300 block">
              Annual Fee: ₹{Math.round(grandTotal).toLocaleString()}
            </span>
            {oneTimeTotal > 0 && (
              <span className="text-[11px] text-muted-foreground font-medium">
                + One-Time Fee: ₹{Math.round(oneTimeTotal).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {comps.map((comp) => {
            const baseAmt = Number(comp.amount || 0);
            const rows = comp.frequencyRows || [];

            return (
              <div key={comp.id} className="border rounded-xl bg-card overflow-hidden shadow-xs">
                <div className="bg-teal-50/70 dark:bg-teal-950/40 px-3 py-2 border-b flex justify-between items-center">
                  <div>
                    <span className="font-bold text-xs text-teal-800 dark:text-teal-300 block">{comp.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      Base Amount: ₹{baseAmt.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 px-2 py-0.5 rounded capitalize">
                    Default: {comp.selectedFrequencyKey || "annually"}
                  </span>
                </div>

                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground border-b text-[10px] font-semibold uppercase">
                      <th className="p-2">Frequency</th>
                      <th className="p-2 text-center">Payments</th>
                      <th className="p-2 text-center">Adjustment</th>
                      <th className="p-2 text-right">Net Amount</th>
                      <th className="p-2 text-right">Per Installment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-[11px]">
                    {rows.map((row) => {
                      const r = Number(row.rebatePercent || 0);
                      const s = Number(row.surchargePercent || 0);
                      const disc = (baseAmt * r) / 100;
                      const extra = (baseAmt * s) / 100;
                      const net = Math.max(0, baseAmt - disc + extra);
                      const count = row.count || 1;
                      const perInstallment = net / count;
                      const isSelected = comp.selectedFrequencyKey === row.key;

                      return (
                        <tr
                          key={row.id}
                          className={
                            isSelected
                              ? "bg-teal-50/50 dark:bg-teal-950/20 font-semibold"
                              : "hover:bg-muted/30 font-normal"
                          }
                        >
                          <td className="p-2 text-foreground font-medium">
                            {row.label}
                            {isSelected && (
                              <span className="text-[9px] bg-teal-600 text-white px-1 py-0.5 rounded ml-1 font-bold">
                                Default
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-semibold">{count}</td>
                          <td className="p-2 text-center font-semibold">
                            {r > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">-{r}% Rebate</span>
                            ) : s > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400">+{s}% Surcharge</span>
                            ) : (
                              <span className="text-muted-foreground font-normal">None</span>
                            )}
                          </td>
                          <td className="p-2 text-right font-bold text-foreground">₹{Math.round(net).toLocaleString()}</td>
                          <td className="p-2 text-right font-bold text-teal-700 dark:text-teal-300">
                            ₹{Math.round(perInstallment).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FeeStructureMasterPage() {
  const queryClient = useQueryClient();
  const [structureModalOpen, setStructureModalOpen] = React.useState(false);
  const [editingStructure, setEditingStructure] = React.useState<FeeStructure | null>(null);
  const [dynamicComponents, setDynamicComponents] = React.useState<FeeComponent[]>(DEFAULT_FEE_COMPONENTS);
  const [courseFilter, setCourseFilter] = React.useState<number>(0);
  const [batchFilter, setBatchFilter] = React.useState<string>("all");
  const [quotaFilter, setQuotaFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [expandedIds, setExpandedIds] = React.useState<Record<number, boolean>>({});
  const [viewDetailModalOpen, setViewDetailModalOpen] = React.useState(false);
  const [viewingStructure, setViewingStructure] = React.useState<FeeStructure | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenDetailModal = (st: FeeStructure) => {
    setViewingStructure(st);
    setViewDetailModalOpen(true);
  };

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["nursing", "courses"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/courses");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: feeStructures = [], isLoading: isLoadingStructures } = useQuery<FeeStructure[]>({
    queryKey: ["nursing", "fee-structures"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/fees/structures");
      if (!res.ok) throw new Error("Failed to fetch fee structures");
      return res.json();
    },
  });

  const { data: batches = [], isLoading: isLoadingBatches } = useQuery<any[]>({
    queryKey: ["nursing", "batches"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/batches");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const currentYear = new Date().getFullYear();
  const defaultAcademicYear = `${currentYear}-${currentYear + 4}`;

  const structureForm = useForm({
    defaultValues: {
      courseId: 1,
      quotaCategory: "none",
      academicYear: defaultAcademicYear,
      feeType: "Composite Course Fee",
    },
  });

  const watchedCourseId = structureForm.watch("courseId");

  const availableBatches = React.useMemo(() => {
    if (!watchedCourseId) return batches;
    const filtered = batches.filter((b) => Number(b.courseId) === Number(watchedCourseId));
    return filtered.length > 0 ? filtered : batches;
  }, [batches, watchedCourseId]);

  const batchOptions = React.useMemo(() => {
    const list: { value: string; label: string; subtext?: string }[] = [];
    const seen = new Set<string>();

    for (const b of availableBatches) {
      const val = b.academicYear || b.name;
      if (val && !seen.has(val)) {
        seen.add(val);
        const sections = availableBatches
          .filter((item) => (item.academicYear || item.name) === val)
          .map((item) => item.section)
          .filter(Boolean)
          .join(", ");

        list.push({
          value: val,
          label: b.name && b.name !== val ? `${val} (${b.name})` : val,
          subtext: sections ? `Section ${sections}` : b.courseName,
        });
      }
    }
    return list;
  }, [availableBatches]);

  const filterBatchOptions = React.useMemo(() => {
    const relevantBatches =
      courseFilter > 0
        ? batches.filter((b) => Number(b.courseId) === Number(courseFilter))
        : batches;

    const list: { value: string; label: string; subtext?: string }[] = [];
    const seen = new Set<string>();

    for (const b of relevantBatches) {
      const val = b.academicYear || b.name;
      if (val && !seen.has(val)) {
        seen.add(val);
        const sections = relevantBatches
          .filter((item) => (item.academicYear || item.name) === val)
          .map((item) => item.section)
          .filter(Boolean)
          .join(", ");

        list.push({
          value: val,
          label: val,
          subtext: sections ? `Sec ${sections}` : (b.courseName || undefined),
        });
      }
    }
    return list;
  }, [batches, courseFilter]);

  // Calculate live total annual recurring package across selected default frequency row (omitting one-time fees)
  const computedTotalPackage = React.useMemo(() => {
    return dynamicComponents.reduce((sum, item) => {
      const selRow =
        item.frequencyRows.find((r) => r.key === item.selectedFrequencyKey) || item.frequencyRows[0];
      if (selRow?.key === "one_time" || item.selectedFrequencyKey === "one_time") {
        return sum;
      }
      const amt = Number(item.amount || 0);
      const reb = Number(selRow?.rebatePercent || 0);
      const sur = Number(selRow?.surchargePercent || 0);
      const disc = (amt * reb) / 100;
      const extra = (amt * sur) / 100;
      return sum + Math.max(0, amt - disc + extra);
    }, 0);
  }, [dynamicComponents]);

  const computedOneTimeTotal = React.useMemo(() => {
    return dynamicComponents.reduce((sum, item) => {
      const selRow =
        item.frequencyRows.find((r) => r.key === item.selectedFrequencyKey) || item.frequencyRows[0];
      if (selRow?.key === "one_time" || item.selectedFrequencyKey === "one_time") {
        const amt = Number(item.amount || 0);
        const reb = Number(selRow?.rebatePercent || 0);
        const sur = Number(selRow?.surchargePercent || 0);
        const disc = (amt * reb) / 100;
        const extra = (amt * sur) / 100;
        return sum + Math.max(0, amt - disc + extra);
      }
      return sum;
    }, 0);
  }, [dynamicComponents]);

  const handleAddComponent = () => {
    setDynamicComponents((prev) => [
      ...prev,
      createDefaultComponent(
        "comp-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        "Custom Fee Component",
        5000,
        "annually"
      ),
    ]);
  };

  const handleRemoveComponent = (compId: string) => {
    if (dynamicComponents.length <= 1) {
      toast.error("At least one fee component is required.");
      return;
    }
    setDynamicComponents((prev) => prev.filter((item) => item.id !== compId));
  };

  const handleUpdateComponentBasic = (
    compId: string,
    field: "name" | "amount" | "selectedFrequencyKey",
    val: any
  ) => {
    setDynamicComponents((prev) =>
      prev.map((item) => {
        if (item.id !== compId) return item;
        if (field === "selectedFrequencyKey") {
          const exists = item.frequencyRows.some((r) => r.key === val);
          if (!exists) {
            const tmpl = STANDARD_FREQUENCY_TEMPLATES.find((t) => t.key === val);
            if (tmpl) {
              const newRow: ComponentFrequencyRow = {
                id: `f-${tmpl.key}-${Date.now()}`,
                key: tmpl.key,
                label: tmpl.label,
                count: tmpl.count,
                rebatePercent: 0,
                surchargePercent: 0,
              };
              return {
                ...item,
                selectedFrequencyKey: val,
                frequencyRows: [...item.frequencyRows, newRow],
              };
            }
          }
        }
        return { ...item, [field]: val };
      })
    );
  };

  const handleUpdateFrequencyRow = (
    compId: string,
    rowId: string,
    field: "rebatePercent" | "surchargePercent",
    val: number
  ) => {
    setDynamicComponents((prev) =>
      prev.map((item) => {
        if (item.id !== compId) return item;
        const updatedRows = item.frequencyRows.map((r) => {
          if (r.id !== rowId) return r;
          const updated = { ...r, [field]: val };
          if (field === "rebatePercent" && val > 0) updated.surchargePercent = 0;
          if (field === "surchargePercent" && val > 0) updated.rebatePercent = 0;
          return updated;
        });
        return { ...item, frequencyRows: updatedRows };
      })
    );
  };

  const handleDeleteFrequencyRow = (compId: string, rowId: string) => {
    setDynamicComponents((prev) =>
      prev.map((item) => {
        if (item.id !== compId) return item;
        if (item.frequencyRows.length <= 1) {
          toast.error("At least one frequency row must be retained.");
          return item;
        }
        const remaining = item.frequencyRows.filter((r) => r.id !== rowId);
        const newSel =
          remaining.some((r) => r.key === item.selectedFrequencyKey)
            ? item.selectedFrequencyKey
            : remaining[0].key;
        return {
          ...item,
          frequencyRows: remaining,
          selectedFrequencyKey: newSel,
        };
      })
    );
  };

  const handleAddFrequencyRow = (compId: string, templateKey: string) => {
    const tmpl = STANDARD_FREQUENCY_TEMPLATES.find((t) => t.key === templateKey);
    if (!tmpl) return;

    setDynamicComponents((prev) =>
      prev.map((item) => {
        if (item.id !== compId) return item;
        if (item.frequencyRows.some((r) => r.key === templateKey)) {
          toast.error(`${tmpl.label} frequency option is already added.`);
          return item;
        }
        const newRow: ComponentFrequencyRow = {
          id: "f-" + templateKey + "-" + Date.now(),
          key: tmpl.key,
          label: tmpl.label,
          count: tmpl.count,
          rebatePercent: 0,
          surchargePercent: 0,
        };
        return {
          ...item,
          frequencyRows: [...item.frequencyRows, newRow],
        };
      })
    );
  };

  const createStructureMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/nursing/fees/structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to create fee structure");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Fee structure & component schedule configured successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "fee-structures"] });
      setStructureModalOpen(false);
      setEditingStructure(null);
      structureForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create fee structure");
    },
  });

  const updateStructureMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: any }) => {
      const res = await fetch(`/api/nursing/fees/structures/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to update fee structure");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Fee structure updated successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "fee-structures"] });
      setStructureModalOpen(false);
      setEditingStructure(null);
      structureForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update fee structure");
    },
  });

  const deleteStructureMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/nursing/fees/structures/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete fee structure");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Fee structure deleted");
      queryClient.invalidateQueries({ queryKey: ["nursing", "fee-structures"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete fee structure");
    },
  });

  const filteredStructures = feeStructures.filter((st) => {
    if (courseFilter > 0 && st.courseId !== courseFilter) return false;
    if (batchFilter !== "all" && st.academicYear.trim().toLowerCase() !== batchFilter.trim().toLowerCase()) return false;
    if (quotaFilter !== "all") {
      const stQuota = (st.quotaCategory || "none").toLowerCase();
      if (stQuota !== quotaFilter.toLowerCase()) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        st.courseName.toLowerCase().includes(q) ||
        st.academicYear.toLowerCase().includes(q) ||
        (st.quotaCategory || "").toLowerCase().includes(q) ||
        (st.feeType || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-teal-600" />
            Fee Structures & Master Schedules
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure course-wise fee structures, itemized components, installment frequencies, rebates, and surcharges.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild size="sm">
            <Link to="/college/fees" className="flex items-center gap-1.5 text-xs text-teal-600 border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950">
              <Receipt size={14} /> Fee Collection & Ledger
            </Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link to="/college/academic-schedules" className="flex items-center gap-1.5 text-xs">
              <Calendar size={14} /> Academic Schedules
            </Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link to="/college/courses" className="flex items-center gap-1.5 text-xs">
              <BookOpen size={14} /> Courses
            </Link>
          </Button>

          {/* Configure Fee Structure Modal */}
          <Dialog
            open={structureModalOpen}
            onOpenChange={(open) => {
              setStructureModalOpen(open);
              if (!open) {
                setEditingStructure(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2"
                onClick={() => {
                  setEditingStructure(null);
                  const firstCourseId = courses[0]?.id || 1;
                  const courseBatches = batches.filter((b) => Number(b.courseId) === Number(firstCourseId));
                  const initialBatch = (courseBatches[0] || batches[0])?.academicYear || "";
                  structureForm.reset({
                    courseId: firstCourseId,
                    quotaCategory: "none",
                    academicYear: initialBatch,
                    feeType: "Composite Course Fee",
                  });
                  setDynamicComponents(DEFAULT_FEE_COMPONENTS);
                }}
              >
                <Plus size={16} /> Create Fee Structure
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-230"
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-teal-600">
                  <Calculator size={20} /> {editingStructure ? "Modify Fee Structure & Frequency Breakups" : "Fee Structure & Per-Component Frequency Builder"}
                </DialogTitle>
              </DialogHeader>

              <form
                onSubmit={structureForm.handleSubmit((data) => {
                  const targetCourseId = Number(data.courseId);
                  const targetAcademicYear = data.academicYear.trim();

                  const targetQuotaCategory = data.quotaCategory || "none";
                  const duplicate = feeStructures.find(
                    (st) =>
                      st.courseId === targetCourseId &&
                      st.academicYear.trim().toLowerCase() === targetAcademicYear.toLowerCase() &&
                      (st.quotaCategory || "none").toLowerCase() === targetQuotaCategory.toLowerCase() &&
                      (!editingStructure || st.id !== editingStructure.id)
                  );

                  if (duplicate) {
                    toast.error(
                      `A fee structure for this course program, academic batch (${targetAcademicYear}), and quota (${getQuotaCategoryLabel(targetQuotaCategory)}) already exists.`
                    );
                    return;
                  }

                  const payload = {
                    courseId: targetCourseId,
                    quotaCategory: targetQuotaCategory,
                    academicYear: targetAcademicYear,
                    feeType: data.feeType,
                    tuitionFee: Number(dynamicComponents.find((c) => c.name.toLowerCase().includes("course") || c.name.toLowerCase().includes("tuition"))?.amount || 0),
                    admissionFee: Number(dynamicComponents.find((c) => c.name.toLowerCase().includes("admission"))?.amount || 0),
                    securityDeposit: Number(dynamicComponents.find((c) => c.name.toLowerCase().includes("security"))?.amount || 0),
                    uniformFee: Number(dynamicComponents.find((c) => c.name.toLowerCase().includes("uniform"))?.amount || 0),
                    hostelFee: Number(dynamicComponents.find((c) => c.name.toLowerCase().includes("hostel") && !c.name.toLowerCase().includes("mess"))?.amount || 0),
                    hostelMessMonthlyFee: Number(dynamicComponents.find((c) => c.name.toLowerCase().includes("mess") && !c.name.toLowerCase().includes("hostel"))?.amount || 0) / 12,
                    examFee: Number(dynamicComponents.find((c) => c.name.toLowerCase().includes("exam"))?.amount || 0),
                    miscFee: Number(dynamicComponents.find((c) => c.name.toLowerCase().includes("misc") || c.name.toLowerCase().includes("library"))?.amount || 0),
                    oneTimeRebatePercent: Number(dynamicComponents[0]?.frequencyRows.find((r) => r.key === "annually")?.rebatePercent || 0),
                    paymentFrequency: "yearly",
                    componentsConfig: JSON.stringify(dynamicComponents),
                    totalAmount: computedTotalPackage,
                  };

                  if (editingStructure) {
                    updateStructureMutation.mutate({ id: editingStructure.id, values: payload });
                  } else {
                    createStructureMutation.mutate(payload);
                  }
                })}
                className="space-y-4 py-2 max-h-[80vh] overflow-y-auto pr-1"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Degree Course Program *</label>
                    <Controller
                      control={structureForm.control}
                      name="courseId"
                      render={({ field }) => (
                        <Select
                          value={String(field.value)}
                          onValueChange={(val) => field.onChange(Number(val))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Course Program" />
                          </SelectTrigger>
                          <SelectContent>
                            {courses.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.name} ({c.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Quota / Category</label>
                    <Controller
                      control={structureForm.control}
                      name="quotaCategory"
                      render={({ field }) => (
                        <Select
                          value={field.value || "none"}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Quota Category" />
                          </SelectTrigger>
                          <SelectContent className="z-[99999]">
                            {QUOTA_CATEGORIES.map((q) => (
                              <SelectItem key={q.value} value={q.value}>
                                {q.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Target Academic Batch *</label>
                    <Controller
                      control={structureForm.control}
                      name="academicYear"
                      rules={{ required: "Academic batch is required" }}
                      render={({ field, fieldState }) => (
                        <div>
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className={cn("w-full", fieldState.error && "border-red-500 bg-red-50/20")}>
                              <SelectValue placeholder={isLoadingBatches ? "Loading batches..." : "Select Academic Batch"} />
                            </SelectTrigger>
                            <SelectContent className="z-99999">
                              {batchOptions.length === 0 ? (
                                <div className="p-2 text-xs text-muted-foreground text-center">
                                  {isLoadingBatches ? "Loading academic batches..." : "No academic batches configured"}
                                </div>
                              ) : (
                                batchOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <div className="flex items-center justify-between gap-3 w-full">
                                      <span className="font-medium">{opt.label}</span>
                                      {opt.subtext && (
                                        <span className="text-[11px] text-muted-foreground">({opt.subtext})</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                              {field.value && !batchOptions.some((opt) => opt.value === field.value) && (
                                <SelectItem value={field.value}>
                                  {field.value} (Current / Custom)
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {fieldState.error && (
                            <p className="text-xs text-red-500 font-medium mt-1">{fieldState.error.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  <Controller
                    control={structureForm.control}
                    name="feeType"
                    render={({ field, fieldState }) => (
                      <Field label="Fee Package Type Title" placeholder="e.g. Composite Course Fee" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>

                {/* Dynamic Itemized Components with Frequency Matrices */}
                <div className="border rounded-xl p-3 bg-muted/20 space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div>
                      <h4 className="text-sm font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                        <Layers size={16} /> Itemized Fee Components & Payment Frequencies
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Customize base amounts, add/remove frequencies (Monthly, Quarterly, Semester, Annually), and apply custom rebate/surcharge percentages.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddComponent}
                      className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Component
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {dynamicComponents.map((comp, idx) => (
                      <div key={comp.id} className="border rounded-xl p-3 bg-card space-y-3 shadow-xs">
                        <div className="flex items-center justify-between gap-3 border-b pb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-xs font-bold text-muted-foreground w-6">#{idx + 1}</span>
                            <input
                              type="text"
                              className="font-semibold text-sm border rounded px-2 py-1 flex-1 bg-background text-foreground focus:ring-1 focus:ring-teal-500"
                              value={comp.name}
                              onChange={(e) => handleUpdateComponentBasic(comp.id, "name", e.target.value)}
                              placeholder="Component Name (e.g. Course Fee)"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-semibold text-muted-foreground">Base ₹:</span>
                              <input
                                type="number"
                                min="0"
                                className="w-24 border rounded px-2 py-1 text-sm font-bold bg-background text-foreground text-right focus:ring-1 focus:ring-teal-500"
                                value={comp.amount}
                                onChange={(e) => handleUpdateComponentBasic(comp.id, "amount", Number(e.target.value))}
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">Default:</span>
                              <select
                                className="border rounded px-2 py-1 text-xs bg-background text-foreground font-medium"
                                value={comp.selectedFrequencyKey}
                                onChange={(e) => handleUpdateComponentBasic(comp.id, "selectedFrequencyKey", e.target.value)}
                              >
                                {STANDARD_FREQUENCY_TEMPLATES.filter(
                                  (tmpl) => !((comp.name.toLowerCase().includes("course") || comp.name.toLowerCase().includes("tuition")) && tmpl.key === "one_time")
                                ).map((tmpl) => (
                                  <option key={tmpl.key} value={tmpl.key}>
                                    {tmpl.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              title="Delete Component"
                              onClick={() => handleRemoveComponent(comp.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>

                        {/* Frequency Breakup Matrix Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-muted/50 text-muted-foreground border-b text-[11px] font-semibold uppercase">
                                <th className="p-2">Installment Frequency</th>
                                <th className="p-2 text-center">Installments / Year</th>
                                <th className="p-2 text-center">Rebate % (Discount)</th>
                                <th className="p-2 text-center">Surcharge % (Extra)</th>
                                <th className="p-2 text-right">Net Annual Payable</th>
                                <th className="p-2 text-right">Per-Installment Amt</th>
                                <th className="p-2 text-center w-8"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y text-[11px]">
                              {comp.frequencyRows.map((row) => {
                                const baseAmt = Number(comp.amount || 0);
                                const r = Number(row.rebatePercent || 0);
                                const s = Number(row.surchargePercent || 0);
                                const disc = (baseAmt * r) / 100;
                                const extra = (baseAmt * s) / 100;
                                const net = Math.max(0, baseAmt - disc + extra);
                                const count = row.count || 1;
                                const perInstallment = net / count;
                                const isSelected = comp.selectedFrequencyKey === row.key;

                                return (
                                  <tr
                                    key={row.id}
                                    className={
                                      isSelected
                                        ? "bg-teal-50/60 dark:bg-teal-950/30 font-semibold"
                                        : "hover:bg-muted/30 font-normal"
                                    }
                                  >
                                    <td className="p-2 font-medium text-foreground flex items-center gap-1">
                                      {row.label}
                                      {isSelected && (
                                        <span className="text-[9px] bg-teal-600 text-white px-1.5 py-0.5 rounded font-bold">
                                          Default
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2 text-center font-bold text-muted-foreground">{count}</td>
                                    <td className="p-2 text-center">
                                      <div className="inline-flex items-center gap-1">
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          className="w-12 border rounded px-1 py-0.5 text-center text-xs bg-background text-emerald-600 font-bold focus:ring-1 focus:ring-teal-500"
                                          value={row.rebatePercent}
                                          onChange={(e) =>
                                            handleUpdateFrequencyRow(comp.id, row.id, "rebatePercent", Number(e.target.value))
                                          }
                                        />
                                        <span className="text-[10px] text-muted-foreground">%</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-center">
                                      <div className="inline-flex items-center gap-1">
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          className="w-12 border rounded px-1 py-0.5 text-center text-xs bg-background text-amber-600 font-bold focus:ring-1 focus:ring-teal-500"
                                          value={row.surchargePercent}
                                          onChange={(e) =>
                                            handleUpdateFrequencyRow(comp.id, row.id, "surchargePercent", Number(e.target.value))
                                          }
                                        />
                                        <span className="text-[10px] text-muted-foreground">%</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right font-bold text-foreground">₹{Math.round(net).toLocaleString()}</td>
                                    <td className="p-2 text-right font-bold text-teal-600 dark:text-teal-400">
                                      ₹{Math.round(perInstallment).toLocaleString()}
                                    </td>
                                    <td className="p-2 text-center">
                                      {comp.frequencyRows.length > 1 && (
                                        <button
                                          type="button"
                                          className="text-muted-foreground hover:text-red-500 text-xs"
                                          title="Remove frequency row"
                                          onClick={() => handleDeleteFrequencyRow(comp.id, row.id)}
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Add remaining standard templates dropdown if any available */}
                        {STANDARD_FREQUENCY_TEMPLATES.some(
                          (t) => !((comp.name.toLowerCase().includes("course") || comp.name.toLowerCase().includes("tuition")) && t.key === "one_time") && !comp.frequencyRows.some((r) => r.key === t.key)
                        ) && (
                          <div className="flex items-center gap-2 pt-1 border-t">
                            <span className="text-[11px] text-muted-foreground">+ Add Frequency Option:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {STANDARD_FREQUENCY_TEMPLATES.filter(
                                (t) => !((comp.name.toLowerCase().includes("course") || comp.name.toLowerCase().includes("tuition")) && t.key === "one_time") && !comp.frequencyRows.some((r) => r.key === t.key)
                              ).map((t) => (
                                <Button
                                  key={t.key}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] px-2"
                                  onClick={() => handleAddFrequencyRow(comp.id, t.key)}
                                >
                                  + {t.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Package Summary Banner */}
                <div className="flex justify-between items-center p-3 bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 rounded-xl">
                  <div>
                    <span className="text-xs font-semibold text-teal-800 dark:text-teal-300 block">
                      Calculated Annual Package (Excl. One-Time Fees)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Sum of annual recurring components based on default installment choices
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-teal-700 dark:text-teal-300">
                      ₹{Math.round(computedTotalPackage).toLocaleString()}
                    </span>
                    {computedOneTimeTotal > 0 && (
                      <span className="block text-[11px] text-muted-foreground font-medium">
                        + One-time fees: ₹{Math.round(computedOneTimeTotal).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setStructureModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                    disabled={createStructureMutation.isPending || updateStructureMutation.isPending}
                  >
                    {editingStructure
                      ? updateStructureMutation.isPending
                        ? "Updating..."
                        : "Update Fee Structure"
                      : createStructureMutation.isPending
                      ? "Saving..."
                      : "Save Fee Structure"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Course, Academic Batch & Search Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search course, quota, or year..."
                className="pl-8 pr-3 py-1.5 border rounded-md text-xs bg-background w-full h-8 focus:ring-1 focus:ring-teal-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Course Program Filter */}
            <Select
              value={String(courseFilter)}
              onValueChange={(val) => {
                setCourseFilter(Number(val));
                setBatchFilter("all");
              }}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="All Degree Courses" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="0">All Degree Courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Academic Batch Filter */}
            <Select
              value={batchFilter}
              onValueChange={setBatchFilter}
            >
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder={isLoadingBatches ? "Loading batches..." : "All Academic Batches"} />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="all">All Academic Batches</SelectItem>
                {filterBatchOptions.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span>{b.label}</span>
                      {b.subtext && (
                        <span className="text-[10px] text-muted-foreground">({b.subtext})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Quota Category Filter */}
            <Select
              value={quotaFilter}
              onValueChange={setQuotaFilter}
            >
              <SelectTrigger className="w-45 h-8 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="all">All Categories</SelectItem>
                {QUOTA_CATEGORIES.map((q) => (
                  <SelectItem key={q.value} value={q.value}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(courseFilter > 0 || batchFilter !== "all" || quotaFilter !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setCourseFilter(0);
                  setBatchFilter("all");
                  setQuotaFilter("all");
                  setSearchQuery("");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground font-medium whitespace-nowrap">
            Showing <strong className="text-foreground">{filteredStructures.length}</strong> configured fee schedule{filteredStructures.length === 1 ? "" : "s"}
          </div>
        </CardContent>
      </Card>

      {/* Fee Structures Master Table View */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Tag size={18} className="text-teal-600" /> Active Course Fee Schedules
            </CardTitle>
            <CardDescription>Master roster of course fee structures with itemized installment and rebate configurations</CardDescription>
          </div>
          {filteredStructures.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  const allExpanded = filteredStructures.every((st) => expandedIds[st.id]);
                  if (allExpanded) {
                    setExpandedIds({});
                  } else {
                    const next: Record<number, boolean> = {};
                    filteredStructures.forEach((st) => (next[st.id] = true));
                    setExpandedIds(next);
                  }
                }}
              >
                <ChevronsUpDown size={14} />
                {filteredStructures.every((st) => expandedIds[st.id]) ? "Collapse All Cards" : "Expand All Cards"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingStructures ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading fee structures...</div>
          ) : filteredStructures.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {feeStructures.length === 0
                ? 'No fee structures configured yet. Click "+ Create Fee Structure" above to build your first schedule.'
                : "No fee structures found matching your filter criteria."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-y bg-muted/40 text-xs font-semibold text-muted-foreground">
                    <th className="p-3 w-10 text-center"></th>
                    <th className="p-3">Course Program</th>
                    <th className="p-3">Target Batch</th>
                    <th className="p-3">Quota Category</th>
                    <th className="p-3">Fee Package Title</th>
                    <th className="p-3 text-center">Components</th>
                    <th className="p-3 text-right">Annual Package</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStructures.map((st) => {
                    const comps = getStructureComponents(st);
                    const grandTotal = calculateStructureTotal(comps);
                    const isExpanded = !!expandedIds[st.id];

                    return (
                      <React.Fragment key={st.id}>
                        <tr className={cn("hover:bg-muted/30 transition-colors", isExpanded && "bg-muted/20")}>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-transform"
                              title={isExpanded ? "Collapse card layout" : "Expand card layout"}
                              onClick={() => toggleExpand(st.id)}
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </td>
                          <td className="p-3 font-semibold text-teal-600 dark:text-teal-400">
                            {st.courseName}
                          </td>
                          <td className="p-3 font-medium">
                            <span className="inline-block px-2.5 py-0.5 rounded text-xs bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                              {st.academicYear}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide inline-block",
                                st.quotaCategory === "scholarship"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                  : st.quotaCategory === "government"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : st.quotaCategory === "management"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                  : st.quotaCategory === "nri"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                  : "bg-muted text-foreground border"
                              )}
                            >
                              {getQuotaCategoryLabel(st.quotaCategory)}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-foreground font-medium">
                            {st.feeType || "Composite Course Fee"}
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-xs bg-muted font-medium">
                              {comps.length} components
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-foreground">
                            ₹{Math.round(grandTotal).toLocaleString()}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950 flex items-center gap-1"
                                onClick={() => handleOpenDetailModal(st)}
                                title="View Full Schedule Breakdown"
                              >
                                <Eye size={14} /> View
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950"
                                title="Edit Fee Structure"
                                onClick={() => {
                                  setEditingStructure(st);
                                  structureForm.reset({
                                    courseId: st.courseId,
                                    quotaCategory: st.quotaCategory || "none",
                                    academicYear: st.academicYear,
                                    feeType: st.feeType || "Composite Course Fee",
                                  });
                                  const editComps = getStructureComponents(st);
                                  setDynamicComponents(editComps.length > 0 ? editComps : DEFAULT_FEE_COMPONENTS);
                                  setStructureModalOpen(true);
                                }}
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                                title="Delete Fee Structure"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete the fee structure for ${st.courseName}?`)) {
                                    deleteStructureMutation.mutate(st.id);
                                  }
                                }}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Full Card Details Panel */}
                        {isExpanded && (
                          <tr className="bg-muted/10">
                            <td colSpan={8} className="p-4 bg-muted/5 border-b">
                              <FeeStructureCardDetail
                                structure={st}
                                onEdit={() => {
                                  setEditingStructure(st);
                                  structureForm.reset({
                                    courseId: st.courseId,
                                    quotaCategory: st.quotaCategory || "none",
                                    academicYear: st.academicYear,
                                    feeType: st.feeType || "Composite Course Fee",
                                  });
                                  const editComps = getStructureComponents(st);
                                  setDynamicComponents(editComps.length > 0 ? editComps : DEFAULT_FEE_COMPONENTS);
                                  setStructureModalOpen(true);
                                }}
                                onDelete={() => {
                                  if (confirm(`Are you sure you want to delete the fee structure for ${st.courseName}?`)) {
                                    deleteStructureMutation.mutate(st.id);
                                  }
                                }}
                                onClose={() => toggleExpand(st.id)}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog for View Full Breakdown on User Action */}
      <Dialog
        open={viewDetailModalOpen}
        onOpenChange={(open) => {
          setViewDetailModalOpen(open);
          if (!open) setViewingStructure(null);
        }}
      >
        <DialogContent className="sm:max-w-[920px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-600">
              <Calculator size={20} /> Fee Structure & Per-Component Frequency Schedule
            </DialogTitle>
          </DialogHeader>
          {viewingStructure && (
            <FeeStructureCardDetail
              structure={viewingStructure}
              isModal={true}
              onEdit={() => {
                const target = viewingStructure;
                setViewDetailModalOpen(false);
                setViewingStructure(null);
                setEditingStructure(target);
                structureForm.reset({
                  courseId: target.courseId,
                  quotaCategory: target.quotaCategory || "none",
                  academicYear: target.academicYear,
                  feeType: target.feeType || "Composite Course Fee",
                });
                const editComps = getStructureComponents(target);
                setDynamicComponents(editComps.length > 0 ? editComps : DEFAULT_FEE_COMPONENTS);
                setStructureModalOpen(true);
              }}
              onDelete={() => {
                const target = viewingStructure;
                if (confirm(`Are you sure you want to delete the fee structure for ${target.courseName}?`)) {
                  setViewDetailModalOpen(false);
                  setViewingStructure(null);
                  deleteStructureMutation.mutate(target.id);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
