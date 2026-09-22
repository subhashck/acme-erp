import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { CalendarOff, Plus, Check, X, Clock, Ban, Trash2, Edit2, Repeat, Eye, Filter, Calendar as CalendarIcon } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { DataTable, type ColumnDef } from "../../../components/DataTable";
import { queryClient } from "../../../lib/query";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "../../../services/auth";
import { useUserPermissions } from "../../../lib/permissions";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Label } from "../../../ui/label";
import { Select } from "../../../ui/select";
import { Autocomplete } from "../../../ui/autocomplete";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Calendar } from "../../../components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/ui/dialog";
import { cn } from "../../../lib/utils";
import type { StaffRow } from "../../../types";
import { Field } from "../../../components/Field";

export const Route = createFileRoute("/_authenticated/hr/off-day-requests")({
  component: OffDayRequests,
});

type OffDayRequest = {
  id: number;
  staffId: number;
  staffName: string;
  employeeCode: string;
  originalDate: string;
  requestedDate: string;
  reason: string | null;
  status: string;
  reviewedById: string | null;
  reviewerNote: string | null;
  createdAt: string;
};

type WeeklyOffDayRule = {
  id: number;
  staffId: number;
  staffName: string;
  employeeCode: string;
  daysOfWeek: number[];
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
  createdAt: string;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const requestSchema = z.object({
  staffId: z.number().optional(),
  originalDate: z.string().min(1, "Select the off day you want to change"),
  requestedDate: z.string().min(1, "Select the new off day you would like"),
  reason: z.string().optional(),
});

const reviewSchema = z.object({
  status: z.enum(["Approved", "Rejected"]),
  reviewerNote: z.string().optional(),
});

const weeklyRuleSchema = z.object({
  staffId: z.number().positive("Select an employee"),
  daysOfWeek: z.array(z.number()).min(1, "Select at least one off day"),
  effectiveFrom: z.string().min(1, "Select effective from date"),
  effectiveTo: z.string().optional(),
  notes: z.string().optional(),
});

type RequestInput = z.infer<typeof requestSchema>;
type ReviewInput = z.infer<typeof reviewSchema>;
type WeeklyRuleInput = z.infer<typeof weeklyRuleSchema>;

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  Cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={cn("px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap", STATUS_COLORS[status] ?? STATUS_COLORS.Pending)}>
    {status}
  </span>
);

/** Renders "YYYY-MM-DD (DayName)" from an ISO date string like "2026-07-22" */
function dateWithDay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${dateStr} (${DAY_NAMES[d.getDay()]})`;
}

function DatePickerField({
  value,
  onChange,
  placeholder,
  error,
  disabledDate,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
  disabledDate?: (date: Date) => boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-background px-3", !value && "text-muted-foreground")}>
            <CalendarOff className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            {value ? format(new Date(value + "T00:00:00"), "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            startMonth={new Date(new Date().getFullYear() - 1, 0)}
            endMonth={new Date(new Date().getFullYear() + 1, 11)}
            disabled={disabledDate}
            selected={value ? new Date(value + "T00:00:00") : undefined}
            onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function OffDayRequests() {
  const { currentStaff, isAdmin, isHr, isManagementApprover } = useUserPermissions();
  const isAdminOrHr = isAdmin || isHr;
  const canViewAll = isAdminOrHr || isManagementApprover;

  const [activeTab, setActiveTab] = React.useState<"requests" | "weekly">("requests");

  // Requests state
  const [statusFilter, setStatusFilter] = React.useState("");
  const [staffFilter, setStaffFilter] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(false);
  const [showNewDialog, setShowNewDialog] = React.useState(false);
  const [reviewTarget, setReviewTarget] = React.useState<OffDayRequest | null>(null);
  const [viewTarget, setViewTarget] = React.useState<OffDayRequest | null>(null);

  // Weekly rules state
  const [weeklyStaffFilter, setWeeklyStaffFilter] = React.useState("");
  const [weeklyShowFilters, setWeeklyShowFilters] = React.useState(false);
  const [showRuleDialog, setShowRuleDialog] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<WeeklyOffDayRule | null>(null);

  const [submitting, setSubmitting] = React.useState(false);

  const hasActiveRequestFilters = !!(statusFilter || staffFilter || dateFrom || dateTo);
  const hasActiveWeeklyFilters = !!weeklyStaffFilter;

  // ── Queries ──
  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);
  if (canViewAll && staffFilter) params.set("staffId", staffFilter);

  const requestsQuery = useQuery<OffDayRequest[], Error>({
    queryKey: ["off-day-requests", statusFilter, staffFilter],
    queryFn: async () => {
      const res = await fetch(`/api/hr/off-day-requests${params.toString() ? "?" + params.toString() : ""}`);
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
  });

  const weeklyRulesQuery = useQuery<WeeklyOffDayRule[], Error>({
    queryKey: ["weekly-off-days", weeklyStaffFilter],
    queryFn: async () => {
      const q = weeklyStaffFilter ? `?staffId=${weeklyStaffFilter}` : "";
      const res = await fetch(`/api/hr/weekly-off-days${q}`);
      if (!res.ok) throw new Error("Failed to fetch weekly rules");
      return res.json();
    },
  });

  const myWeeklyRulesQuery = useQuery<WeeklyOffDayRule[], Error>({
    queryKey: ["weekly-off-days-my"],
    queryFn: async () => {
      const res = await fetch("/api/hr/weekly-off-days/my");
      if (!res.ok) throw new Error("Failed to fetch my weekly off days");
      return res.json();
    },
  });

  const nursingSupersQuery = useQuery<any[]>({
    queryKey: ["masters-nursing-supers"],
    queryFn: async () => {
      const res = await fetch("/api/masters/nursing-supers");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deptsQuery = useQuery<any[]>({
    queryKey: ["masters-departments"],
    queryFn: async () => {
      const res = await fetch("/api/masters/departments");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const staffQuery = useQuery<StaffRow[], Error>({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await fetch("/api/hr/staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    },
  });



  const isNursingSuper = (nursingSupersQuery.data ?? []).some(
    (ns: any) => currentStaff?.staffId && ns.staffId === currentStaff.staffId && ns.active
  );

  const requests = React.useMemo(() => {
    let data = requestsQuery.data ?? [];
    if (dateFrom) data = data.filter((r) => r.originalDate >= dateFrom || r.requestedDate >= dateFrom);
    if (dateTo) data = data.filter((r) => r.originalDate <= dateTo || r.requestedDate <= dateTo);
    return data;
  }, [requestsQuery.data, dateFrom, dateTo]);
  const weeklyRules = weeklyRulesQuery.data ?? [];
  const myWeeklyRules = myWeeklyRulesQuery.data ?? [];
  const staffList = staffQuery.data ?? [];
  const staffOptions: [string, string][] = staffList.map((s) => [String(s.staffId), `${s.name} (${s.employeeCode})`]);

  // Forms
  const requestForm = useForm<RequestInput>({ resolver: zodResolver(requestSchema), defaultValues: { staffId: undefined, originalDate: "", requestedDate: "", reason: "" } });
  const reviewForm = useForm<ReviewInput>({ resolver: zodResolver(reviewSchema), defaultValues: { status: "Approved", reviewerNote: "" } });
  const ruleForm = useForm<WeeklyRuleInput>({
    resolver: zodResolver(weeklyRuleSchema),
    defaultValues: { staffId: 0, daysOfWeek: [0], effectiveFrom: format(new Date(), "yyyy-MM-dd"), effectiveTo: "", notes: "" },
  });

  const formStaffId = requestForm.watch("staffId");

  // Helper function to check if a date is a weekly off day for the current or selected user
  const isWeeklyOffDay = React.useCallback(
    (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

      let rulesToUse: WeeklyOffDayRule[];

      if (canViewAll) {
        if (formStaffId) {
          rulesToUse = weeklyRules.filter((r) => r.staffId === formStaffId);
        } else {
          rulesToUse = weeklyRules;
        }
      } else {
        rulesToUse = myWeeklyRules;
      }

      const activeRules = rulesToUse.filter((rule) => {
        if (rule.effectiveFrom > dateStr) return false;
        if (rule.effectiveTo && rule.effectiveTo < dateStr) return false;
        return true;
      });

      if (activeRules.length === 0) return false;
      return activeRules.some((rule) => Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.includes(dayOfWeek));
    },
    [myWeeklyRules, weeklyRules, canViewAll, formStaffId]
  );

  // Submit request
  const handleSubmitRequest = requestForm.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/hr/off-day-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      // console.log("trying to submit")
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");
      toast.success("Request submitted successfully");
      setShowNewDialog(false);
      requestForm.reset();
      queryClient.invalidateQueries({ queryKey: ["off-day-requests"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  });

  // Review request
  const handleReview = reviewForm.handleSubmit(async (values) => {
    if (!reviewTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/hr/off-day-requests/${reviewTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to review");
      toast.success(`Request ${values.status}`);
      setReviewTarget(null);
      reviewForm.reset();
      queryClient.invalidateQueries({ queryKey: ["off-day-requests"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  });

  // Cancel own request
  const handleCancel = async (id: number) => {
    try {
      const res = await fetch(`/api/hr/off-day-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Cancelled" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel");
      toast.success("Request cancelled");
      queryClient.invalidateQueries({ queryKey: ["off-day-requests"] });
    } catch (e: any) { toast.error(e.message); }
  };

  // Submit weekly rule
  const handleSubmitRule = ruleForm.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const url = editingRule ? `/api/hr/weekly-off-days/${editingRule.id}` : "/api/hr/weekly-off-days";
      const method = editingRule ? "PUT" : "POST";

      const payload = {
        ...values,
        effectiveTo: values.effectiveTo ? values.effectiveTo : null,
      };

      console.log('Submitting rule: ',url,method,payload)

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save rule");
      toast.success(editingRule ? "Weekly off-day rule updated" : "Weekly off-day rule created");
      setShowRuleDialog(false);
      setEditingRule(null);
      ruleForm.reset();
      queryClient.invalidateQueries({ queryKey: ["weekly-off-days"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-off-days-my"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  });

  // Delete weekly rule
  const handleDeleteRule = async (id: number) => {
    if (!confirm("Are you sure you want to delete this weekly off-day rule?")) return;
    try {
      const res = await fetch(`/api/hr/weekly-off-days/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete rule");
      toast.success("Weekly off-day rule deleted");
      queryClient.invalidateQueries({ queryKey: ["weekly-off-days"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-off-days-my"] });
    } catch (e: any) { toast.error(e.message); }
  };

  // ── Columns for Off-Day Requests ──
  const requestColumns: ColumnDef<Record<string, unknown>>[] = React.useMemo(() => {
    const cols: ColumnDef<Record<string, unknown>>[] = [];
    if (canViewAll || isNursingSuper) {
      cols.push({
        id: "employee", label: "Employee",
        render: (row: any) => (
          <div>
            <p className="font-medium text-sm">{row.staffName}</p>
            <p className="text-xs text-muted-foreground font-mono">{row.employeeCode}</p>
          </div>
        ),
      });
    }
    cols.push(
      { id: "originalDate", label: "Original Off Day", render: (row: any) => <span className="font-mono text-sm whitespace-nowrap">{dateWithDay(row.originalDate)}</span> },
      { id: "requestedDate", label: "Requested Off Day", render: (row: any) => <span className="font-mono text-sm text-primary font-semibold whitespace-nowrap">{dateWithDay(row.requestedDate)}</span> },
      { id: "reason", label: "Reason", render: (row: any) => <span className="text-sm text-muted-foreground">{row.reason || "—"}</span> },
      { id: "status", label: "Status", render: (row: any) => <StatusBadge status={row.status} /> },
      { id: "reviewerNote", label: "Review Note", render: (row: any) => <span className="text-xs text-muted-foreground">{row.reviewerNote || "—"}</span> },
      { id: "submitted", label: "Submitted", render: (row: any) => <span className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span> },
      {
        id: "actions", label: "Actions",
        render: (row: any) => {
          const req = row as OffDayRequest;
          const reqStaff = staffList.find((s) => s.staffId === req.staffId);
          const reqDept = (deptsQuery.data ?? []).find((d) => d.name === reqStaff?.departmentName);
          const isClinical = reqDept?.isClinical === true;
          const isHrUser = isHr;
          const canReviewReq = isAdmin || (isNursingSuper && isClinical) || (isHrUser && !isClinical);

          return (
            <div className="flex gap-2">
              {canReviewReq && req.status === "Pending" && (
                <Button variant="outline" className="h-7 px-2 text-xs" onClick={() => { setReviewTarget(req); reviewForm.reset({ status: "Approved", reviewerNote: "" }); }}>
                  <Check size={12} className="mr-1" /> Review
                </Button>
              )}
              {!canReviewReq && req.status === "Pending" && currentStaff?.staffId === req.staffId && (
                <Button variant="outline" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => handleCancel(req.id)}>
                  <Ban size={12} className="mr-1" /> Cancel
                </Button>
              )}
              {req.status !== "Pending" && (
                <Button variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setViewTarget(req)}>
                  <Eye size={12} className="mr-1" /> View
                </Button>
              )}
            </div>
          );
        },
      }
    );
    return cols;
  }, [canViewAll, isNursingSuper, staffList, deptsQuery.data, currentStaff]);

  // ── Columns for Weekly Off-Day Rules ──
  const ruleColumns: ColumnDef<Record<string, unknown>>[] = React.useMemo(() => {
    const cols: ColumnDef<Record<string, unknown>>[] = [];
    if (isAdminOrHr) {
      cols.push({
        id: "employee", label: "Employee",
        render: (row: any) => (
          <div>
            <p className="font-medium text-sm">{row.staffName}</p>
            <p className="text-xs text-muted-foreground font-mono">{row.employeeCode}</p>
          </div>
        ),
      });
    }
    cols.push(
      {
        id: "daysOfWeek", label: "Recurring Off Days",
        render: (row: any) => {
          const days: number[] = row.daysOfWeek || [];
          return (
            <div className="flex flex-wrap gap-1">
              {days.map((d) => (
                <span key={d} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                  {DAY_NAMES[d]}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: "effectiveFrom", label: "Effective From",
        render: (row: any) => <span className="font-mono text-sm">{row.effectiveFrom}</span>,
      },
      {
        id: "effectiveTo", label: "Effective To",
        render: (row: any) => <span className="font-mono text-sm">{row.effectiveTo || "Ongoing"}</span>,
      },
      {
        id: "notes", label: "Notes",
        render: (row: any) => <span className="text-sm text-muted-foreground">{row.notes || "—"}</span>,
      }
    );
    if (isAdminOrHr) {
      cols.push({
        id: "actions", label: "Actions",
        render: (row: any) => {
          const rule = row as WeeklyOffDayRule;
          return (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setEditingRule(rule);
                  ruleForm.reset({
                    staffId: rule.staffId,
                    daysOfWeek: rule.daysOfWeek,
                    effectiveFrom: rule.effectiveFrom,
                    effectiveTo: rule.effectiveTo || "",
                    notes: rule.notes || "",
                  });
                  setShowRuleDialog(true);
                }}
              >
                <Edit2 size={12} className="mr-1" /> Edit
              </Button>
              <Button variant="outline" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => handleDeleteRule(rule.id)}>
                <Trash2 size={12} className="mr-1" /> Delete
              </Button>
            </div>
          );
        },
      });
    }
    return cols;
  }, [isAdminOrHr]);

  const pending = requests.filter((r) => r.status === "Pending").length;
  const approved = requests.filter((r) => r.status === "Approved").length;
  const rejected = requests.filter((r) => r.status === "Rejected").length;

  return (
    <ModuleLayout
      title="Off-Day Management"
      description="Manage staff recurring weekly off days and off-day change requests"
      action={
        <div className="flex gap-2">
          {activeTab === "requests" && (
            <Button variant="outline" onClick={() => setShowFilters(true)}>
              <Filter className={cn("h-4 w-4 mr-1", hasActiveRequestFilters && "text-primary fill-primary/10")} />
              Filters
              {hasActiveRequestFilters && <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-bold border border-primary/20">Active</span>}
            </Button>
          )}
          {activeTab === "weekly" && isAdminOrHr && (
            <Button variant="outline" onClick={() => setWeeklyShowFilters(true)}>
              <Filter className={cn("h-4 w-4 mr-1", hasActiveWeeklyFilters && "text-primary fill-primary/10")} />
              Filters
              {hasActiveWeeklyFilters && <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-bold border border-primary/20">Active</span>}
            </Button>
          )}
          {isAdminOrHr && activeTab === "weekly" && (
            <Button onClick={() => { setEditingRule(null); setShowRuleDialog(true); ruleForm.reset({ staffId: 0, daysOfWeek: [0], effectiveFrom: format(new Date(), "yyyy-MM-dd"), effectiveTo: "", notes: "" }); }}>
              <Plus size={16} className="mr-2" /> Add Weekly Off Day
            </Button>
          )}
          {activeTab === "requests" && (
            <Button onClick={() => { setShowNewDialog(true); requestForm.reset(); }}>
              <Plus size={16} className="mr-2" /> New Change Request
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border gap-6">
          <button
            className={cn("pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer", activeTab === "requests" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            onClick={() => setActiveTab("requests")}
          >
            <CalendarOff size={16} />
            Off-Day Change Requests
            {pending > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-500 text-white font-bold">{pending}</span>}
          </button>
          <button
            className={cn("pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer", activeTab === "weekly" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            onClick={() => setActiveTab("weekly")}
          >
            <Repeat size={16} />
            Weekly Off-Day Rules
          </button>
        </div>

        {activeTab === "requests" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-amber-200 dark:border-amber-800">
                <CardContent className="pt-4 pb-4 flex items-center gap-3">
                  <Clock className="text-amber-500" size={22} />
                  <div><p className="text-2xl font-bold">{pending}</p><p className="text-xs text-muted-foreground">Pending</p></div>
                </CardContent>
              </Card>
              <Card className="border-emerald-200 dark:border-emerald-800">
                <CardContent className="pt-4 pb-4 flex items-center gap-3">
                  <Check className="text-emerald-500" size={22} />
                  <div><p className="text-2xl font-bold">{approved}</p><p className="text-xs text-muted-foreground">Approved</p></div>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-800">
                <CardContent className="pt-4 pb-4 flex items-center gap-3">
                  <X className="text-red-500" size={22} />
                  <div><p className="text-2xl font-bold">{rejected}</p><p className="text-xs text-muted-foreground">Rejected</p></div>
                </CardContent>
              </Card>
            </div>

            {/* Table */}
            <Card>
              <CardHeader><CardTitle className="text-base">Change Requests {requests.length > 0 && `(${requests.length})`}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={requestColumns}
                  rows={requests as any}
                  isLoading={requestsQuery.isLoading}
                  enablePagination
                  enableSorting
                />
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "weekly" && (
          <>
            {/* Weekly Rules Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex justify-between items-center">
                  <span>Recurring Weekly Off-Day Rules {weeklyRules.length > 0 && `(${weeklyRules.length})`}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={ruleColumns}
                  rows={weeklyRules as any}
                  isLoading={weeklyRulesQuery.isLoading}
                  enablePagination
                  enableSorting
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Requests Filter Sidebar ── */}
      {showFilters && (
        <>
          <div
            onClick={() => setShowFilters(false)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-full sm:w-96 bg-background border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="text-primary" size={18} />
                <h3 className="font-semibold text-lg text-foreground">Filter Requests</h3>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                type="button"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Status</Label>
                <select
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Employee (admin/hr only) */}
              {isAdminOrHr && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Employee</Label>
                  <Autocomplete
                    value={staffFilter}
                    onChange={setStaffFilter}
                    options={[["", "All Staff"] as [string, string], ...staffOptions]}
                    placeholder="Search employee…" label={""}                  />
                </div>
              )}

              {/* Original / Requested date range */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Date From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 px-3", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(new Date(dateFrom + "T00:00:00"), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      startMonth={new Date(new Date().getFullYear() - 5, 0)}
                      endMonth={new Date(new Date().getFullYear() + 2, 11)}
                      selected={dateFrom ? new Date(dateFrom + "T00:00:00") : undefined}
                      onSelect={(d) => setDateFrom(d ? format(d, "yyyy-MM-dd") : "")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Date To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 px-3", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(new Date(dateTo + "T00:00:00"), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      startMonth={new Date(new Date().getFullYear() - 5, 0)}
                      endMonth={new Date(new Date().getFullYear() + 2, 11)}
                      selected={dateTo ? new Date(dateTo + "T00:00:00") : undefined}
                      onSelect={(d) => setDateTo(d ? format(d, "yyyy-MM-dd") : "")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => { setStatusFilter(""); setStaffFilter(""); setDateFrom(""); setDateTo(""); }}
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── Weekly Rules Filter Sidebar ── */}
      {weeklyShowFilters && (
        <>
          <div
            onClick={() => setWeeklyShowFilters(false)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-full sm:w-96 bg-background border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="text-primary" size={18} />
                <h3 className="font-semibold text-lg text-foreground">Filter Weekly Rules</h3>
              </div>
              <button
                onClick={() => setWeeklyShowFilters(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                type="button"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Employee</Label>
                <Autocomplete
                  value={weeklyStaffFilter}
                  onChange={setWeeklyStaffFilter}
                  options={[["", "All Staff"] as [string, string], ...staffOptions]}
                  placeholder="Search employee…" label={""}                />
              </div>
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => setWeeklyStaffFilter("")}
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── New Off-Day Change Request Dialog ── */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Off-Day Change Request</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitRequest} className="space-y-4 pt-1">
            {isAdminOrHr && (
              <div>
                <Controller
                  control={requestForm.control}
                  name="staffId"
                  render={({ field }) => (
                    <Autocomplete
                      label="Select Employee *"
                      value={field.value ? String(field.value) : ""}
                      onChange={(v) => field.onChange(Number(v))}
                      options={staffOptions}
                      placeholder="Search employee for this request"
                      error={requestForm.formState.errors.staffId?.message}
                    />
                  )}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded border">
              ℹ️ Only dates configured as active recurring weekly off days are selectable as the <strong>Original Off Day</strong>.
            </p>
            <div>
              <Label className="mb-1 block text-sm">Original Off Day (Current Off Day) <span className="text-destructive">*</span></Label>
              <Controller
                control={requestForm.control}
                name="originalDate"
                render={({ field }) => (
                  <DatePickerField
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select current weekly off day"
                    disabledDate={(date) => !isWeeklyOffDay(date)}
                    error={requestForm.formState.errors.originalDate?.message}
                  />
                )}
              />
            </div>
            <div>
              <Label className="mb-1 block text-sm">New Requested Off Day <span className="text-destructive">*</span></Label>
              <Controller
                control={requestForm.control}
                name="requestedDate"
                render={({ field }) => (
                  <DatePickerField
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select the day off instead"
                    disabledDate={(date) => isWeeklyOffDay(date)}
                    error={requestForm.formState.errors.requestedDate?.message}
                  />
                )}
              />
            </div>
            <Field label="Reason (optional)" placeholder="Briefly explain why this off day is being changed" {...requestForm.register("reason")} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewDialog(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Review Dialog (HR only) ── */}
      <Dialog open={!!reviewTarget} onOpenChange={(o) => { if (!o) setReviewTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Review Off-Day Request</DialogTitle></DialogHeader>
          {reviewTarget && (
            <div className="space-y-4 pt-1">
              <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Employee</span><span className="font-semibold">{reviewTarget.staffName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Original Off Day</span><span className="font-mono">{dateWithDay(reviewTarget.originalDate)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Requested Off Day</span><span className="font-mono text-primary font-semibold">{dateWithDay(reviewTarget.requestedDate)}</span></div>
                {reviewTarget.reason && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Reason</span><span className="text-right">{reviewTarget.reason}</span></div>}
              </div>
              <form onSubmit={handleReview} className="space-y-4">
                <Controller control={reviewForm.control} name="status" render={({ field }) => (
                  <Select label="Decision" value={field.value} onChange={(e) => field.onChange(e.target.value)} options={["Approved", "Rejected"]} />
                )} />
                <Field label="Note (optional)" placeholder="Add a note for the employee" {...reviewForm.register("reviewerNote")} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setReviewTarget(null)} disabled={submitting}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Submit Decision"}</Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── View Request Dialog (read-only) ── */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => { if (!o) setViewTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Off-Day Request Details</DialogTitle></DialogHeader>
          {viewTarget && (
            <div className="space-y-4 pt-1">
              <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-3">
                {isAdminOrHr && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employee</span>
                    <div className="text-right">
                      <p className="font-semibold">{viewTarget.staffName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{viewTarget.employeeCode}</p>
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Off Day</span>
                  <span className="font-mono">{dateWithDay(viewTarget.originalDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested Off Day</span>
                  <span className="font-mono text-primary font-semibold">{dateWithDay(viewTarget.requestedDate)}</span>
                </div>
                {viewTarget.reason && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Reason</span>
                    <span className="text-right">{viewTarget.reason}</span>
                  </div>
                )}
                <div className="border-t pt-3 mt-1 flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={viewTarget.status} />
                </div>
                {viewTarget.reviewerNote && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Reviewer Note</span>
                    <span className="text-right text-sm">{viewTarget.reviewerNote}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="text-xs">{new Date(viewTarget.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewTarget(null)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit Weekly Off-Day Rule Dialog ── */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingRule ? "Edit Weekly Off-Day Rule" : "Add Weekly Off-Day Rule"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitRule} className="space-y-4 pt-1">
            {!editingRule && (
              <div>
                <Controller
                  control={ruleForm.control}
                  name="staffId"
                  render={({ field }) => (
                    <Autocomplete
                      label="Select Employee *"
                      value={field.value ? String(field.value) : ""}
                      onChange={(v) => field.onChange(Number(v))}
                      options={staffOptions}
                      placeholder="Search employee"
                      error={ruleForm.formState.errors.staffId?.message}
                    />
                  )}
                />
              </div>
            )}
            <div>
              <Label className="mb-2 block text-sm">Weekly Off Days <span className="text-destructive">*</span></Label>
              <Controller
                control={ruleForm.control}
                name="daysOfWeek"
                render={({ field }) => {
                  const currentDays: number[] = field.value || [];
                  const toggleDay = (dayIndex: number) => {
                    if (currentDays.includes(dayIndex)) {
                      field.onChange(currentDays.filter((d) => d !== dayIndex));
                    } else {
                      field.onChange([...currentDays, dayIndex]);
                    }
                  };
                  return (
                    <div className="grid grid-cols-4 gap-2">
                      {DAY_NAMES.map((name, index) => {
                        const isSelected = currentDays.includes(index);
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => toggleDay(index)}
                            className={cn(
                              "px-2 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer",
                              isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"
                            )}
                          >
                            {DAY_SHORT[index]}
                          </button>
                        );
                      })}
                    </div>
                  );
                }}
              />
              {ruleForm.formState.errors.daysOfWeek && <p className="text-xs text-destructive mt-1">{ruleForm.formState.errors.daysOfWeek.message}</p>}
            </div>
            <div>
              <Label className="mb-1 block text-sm">Effective From <span className="text-destructive">*</span></Label>
              <Controller
                control={ruleForm.control}
                name="effectiveFrom"
                render={({ field }) => (
                  <DatePickerField
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select effective from date"
                    error={ruleForm.formState.errors.effectiveFrom?.message}
                  />
                )}
              />
            </div>
            <div>
              <Label className="mb-1 block text-sm">Effective To (optional, leave blank for ongoing)</Label>
              <Controller
                control={ruleForm.control}
                name="effectiveTo"
                render={({ field }) => (
                  <DatePickerField
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Ongoing if empty"
                    error={ruleForm.formState.errors.effectiveTo?.message}
                  />
                )}
              />
            </div>
            <Field label="Notes (optional)" placeholder="e.g. Standard Sunday off rule" {...ruleForm.register("notes")} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRuleDialog(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Rule"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
