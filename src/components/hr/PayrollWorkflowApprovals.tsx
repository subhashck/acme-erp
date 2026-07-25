import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  DollarSign,
  Eye,
  Building2,
  UserCheck,
  ShieldCheck,
  Ban,
  Coins,
  Landmark,
  Layers,
  Search,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import { useRpcQuery, queryClient } from "../../lib/query";
import { client } from "../../services/rpc";
import { authClient } from "../../services/auth";
import { useSystemSettings } from "../../lib/settings";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Card, CardContent } from "../../ui/card";
import { MonthPicker } from "../ui/month-picker";
import { Select } from "../../ui/select";
import type { StaffRow } from "../../types";
import { cn } from "@/utils/cn";

export interface PayslipRow extends Record<string, unknown> {
  id: number;
  staffId: number;
  month: string;
  basicSalary: number;
  hra: number;
  conveyance: number;
  medical: number;
  special: number;
  epf: number;
  esi: number;
  professionalTax: number;
  otherDeductions: number;
  lateAttendance: number;
  leaveDaysTaken: number;
  leaveDeduction: number;
  netSalary: number;
  version: number;
  status: string;
  createdAt: string;
  employeeCode: string;
  name: string;
  role: string;
  departmentName: string | null;
  paymentMode?: string;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  hrNotes?: string | null;
  cooNotes?: string | null;
  accountsNotes?: string | null;
}

export function PayrollWorkflowApprovals() {
  const session = authClient.useSession();
  const { currencySymbol } = useSystemSettings();
  const fmt = (n: number) => `${currencySymbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [selectedStage, setSelectedStage] = React.useState<"all" | "hr" | "management" | "accounts" | "completed">("all");
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState("");

  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [expandedRowIds, setExpandedRowIds] = React.useState<Set<number>>(new Set());
  const [perStaffNotes, setPerStaffNotes] = React.useState<Record<number, string>>({});
  const [globalNote, setGlobalNote] = React.useState("");
  const [processing, setProcessing] = React.useState(false);

  // Queries
  const payslipsQuery = useRpcQuery<PayslipRow[]>(["payslips"], () => client.hr.payroll.payslips.$get());
  const departmentsQuery = useRpcQuery<{ id: number; name: string }[]>(["departments"], () => client.departments.$get());
  const staffQuery = useRpcQuery<StaffRow[]>(["staff"], () => client.hr.staff.$get());
  const managementApproversQuery = useRpcQuery<Array<{ id?: number; staffId: number; active: boolean }>>(
    ["masters-management-approvers"],
    () => (client.masters as any)["management-approvers"].$get()
  );

  const currentStaff = React.useMemo(() => {
    const list = staffQuery.data ?? [];
    return list.find(
      (s) =>
        s.email?.toLowerCase() === session.data?.user?.email?.toLowerCase() ||
        (s.userId && s.userId === session.data?.user?.id)
    );
  }, [staffQuery.data, session.data?.user]);

  // Authorization checks
  const isHrOrAdmin = session.data?.user?.role === "admin" || session.data?.user?.role === "hr";

  const isManagementApprover = React.useMemo(() => {
    if (!currentStaff) return false;
    const list = managementApproversQuery.data ?? [];
    return list.some((a) => a.staffId === currentStaff.staffId && a.active);
  }, [currentStaff, managementApproversQuery.data]);

  const canApproveManagement =
    session.data?.user?.role === "admin" ||
    isManagementApprover ||
    currentStaff?.role === "Chief Operating Officer";

  const isAccountsOrAdmin =
    session.data?.user?.role === "admin" ||
    currentStaff?.departmentName === "Accounts";

  // Filter payslips by Month
  const monthPayslips = React.useMemo(() => {
    const all = payslipsQuery.data ?? [];
    return all.filter((p) => p.month === selectedMonth && p.status !== "Superseded");
  }, [payslipsQuery.data, selectedMonth]);

  // Counts by stage
  const counts = React.useMemo(() => {
    let pendingHr = 0;
    let pendingMgmt = 0;
    let pendingAccounts = 0;
    let paid = 0;
    let cancelled = 0;
    let totalNet = 0;

    monthPayslips.forEach((p) => {
      totalNet += Number(p.netSalary ?? 0);
      if (p.status === "Draft" || p.status === "Active") pendingHr++;
      else if (p.status === "Approved by HR") pendingMgmt++;
      else if (p.status === "Approved by Management" || p.status === "Approved by COO") pendingAccounts++;
      else if (p.status === "Paid") paid++;
      else if (p.status === "Cancelled") cancelled++;
    });

    return {
      total: monthPayslips.length,
      pendingHr,
      pendingMgmt,
      pendingAccounts,
      paid,
      cancelled,
      totalNet,
    };
  }, [monthPayslips]);

  // Filtered payslips based on Stage & Department & Search
  const filteredPayslips = React.useMemo(() => {
    return monthPayslips.filter((p) => {
      // Stage filter
      if (selectedStage === "hr" && !(p.status === "Draft" || p.status === "Active")) return false;
      if (selectedStage === "management" && p.status !== "Approved by HR") return false;
      if (selectedStage === "accounts" && !(p.status === "Approved by Management" || p.status === "Approved by COO")) return false;
      if (selectedStage === "completed" && p.status !== "Paid") return false;

      // Dept filter
      if (selectedDeptId) {
        const targetDept = (departmentsQuery.data ?? []).find((d) => String(d.id) === selectedDeptId);
        if (targetDept && p.departmentName !== targetDept.name) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name?.toLowerCase().includes(q);
        const matchesCode = p.employeeCode?.toLowerCase().includes(q);
        const matchesDept = p.departmentName?.toLowerCase().includes(q);
        const matchesRole = p.role?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDept && !matchesRole) return false;
      }

      return true;
    });
  }, [monthPayslips, selectedStage, selectedDeptId, searchQuery, departmentsQuery.data]);

  // Group filtered payslips department-wise
  const departmentGroups = React.useMemo(() => {
    const map = new Map<string, PayslipRow[]>();
    filteredPayslips.forEach((p) => {
      const deptName = p.departmentName || "Unassigned / General";
      if (!map.has(deptName)) map.set(deptName, []);
      map.get(deptName)!.push(p);
    });

    // Sort departments alphabetically
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPayslips]);

  // Selection handlers
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectDept = (deptRows: PayslipRow[]) => {
    const deptIds = deptRows.map((r) => r.id);
    const allSelected = deptIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        deptIds.forEach((id) => next.delete(id));
      } else {
        deptIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleToggleExpand = (id: number) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk Approval submit
  const handleBulkAction = async (targetStatus: "Approved by HR" | "Approved by Management" | "Paid" | "Cancelled") => {
    if (selectedIds.size === 0) return;

    if (targetStatus === "Paid") {
      const hasCash = Array.from(selectedIds).some((id) => {
        const row = monthPayslips.find((p) => p.id === id);
        return (row?.paymentMode || "Bank Transfer").toLowerCase() === "cash";
      });
      if (hasCash) {
        const confirmCash = window.confirm(
          `Mark ${selectedIds.size} selected payslip(s) as PAID?\n\nFor any CASH payments, Cash Salary Expense entries will be automatically logged in today's Daily Closing Report.`
        );
        if (!confirmCash) return;
      }
    }

    if (targetStatus === "Cancelled") {
      const confirmCancel = window.confirm(`Are you sure you want to CANCEL ${selectedIds.size} selected payslip(s)?`);
      if (!confirmCancel) return;
    }

    setProcessing(true);
    try {
      const items = Array.from(selectedIds).map((id) => ({
        id,
        note: perStaffNotes[id]?.trim() || globalNote.trim() || null,
      }));

      const res = await fetch("/api/hr/payroll/payslips/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, targetStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process bulk approval");

      alert(`Successfully processed ${data.count} payslips (${targetStatus}).`);

      setSelectedIds(new Set());
      setGlobalNote("");
      queryClient.invalidateQueries({ queryKey: ["payslips"] });
    } catch (err: any) {
      alert("Error: " + (err.message || String(err)));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card
          onClick={() => setSelectedStage("all")}
          className={cn(
            "cursor-pointer transition-all border-l-4",
            selectedStage === "all" ? "border-l-primary bg-primary/5 shadow-xs" : "border-l-slate-300 hover:border-l-primary"
          )}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Payslips</p>
              <h3 className="text-xl font-extrabold text-foreground mt-0.5">{counts.total}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium truncate">{fmt(counts.totalNet)}</p>
            </div>
            <Layers className="h-5 w-5 text-slate-400 shrink-0" />
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedStage("hr")}
          className={cn(
            "cursor-pointer transition-all border-l-4",
            selectedStage === "hr" ? "border-l-amber-500 bg-amber-500/5 shadow-xs" : "border-l-amber-300 hover:border-l-amber-500"
          )}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">1. HR Approval</p>
              <h3 className="text-xl font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">{counts.pendingHr}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Pending Draft/Active</p>
            </div>
            <UserCheck className="h-5 w-5 text-amber-500 shrink-0" />
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedStage("management")}
          className={cn(
            "cursor-pointer transition-all border-l-4",
            selectedStage === "management" ? "border-l-emerald-500 bg-emerald-500/5 shadow-xs" : "border-l-emerald-300 hover:border-l-emerald-500"
          )}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">2. Management</p>
              <h3 className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">{counts.pendingMgmt}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Approved by HR</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedStage("accounts")}
          className={cn(
            "cursor-pointer transition-all border-l-4",
            selectedStage === "accounts" ? "border-l-teal-500 bg-teal-500/5 shadow-xs" : "border-l-teal-300 hover:border-l-teal-500"
          )}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">3. Accounts</p>
              <h3 className="text-xl font-extrabold text-teal-700 dark:text-teal-400 mt-0.5">{counts.pendingAccounts}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Ready for Payment</p>
            </div>
            <DollarSign className="h-5 w-5 text-teal-500 shrink-0" />
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedStage("completed")}
          className={cn(
            "cursor-pointer transition-all border-l-4 col-span-2 sm:col-span-1",
            selectedStage === "completed" ? "border-l-blue-500 bg-blue-500/5 shadow-xs" : "border-l-blue-300 hover:border-l-blue-500"
          )}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Paid / Completed</p>
              <h3 className="text-xl font-extrabold text-blue-700 dark:text-blue-400 mt-0.5">{counts.paid}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Disbursed</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" />
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & Stage Selector Toolbar ── */}
      <Card className="border shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Month</span>
              <MonthPicker value={selectedMonth} onChange={setSelectedMonth} placeholder="Select month" />
            </div>

            <div className="space-y-1 min-w-45">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Department</span>
              <Select
                value={selectedDeptId}
                label="Department"
                onChange={(e) => setSelectedDeptId(e.target.value)}
                options={[
                  ["", "All Departments"],
                  ...(departmentsQuery.data ?? []).map((d) => [String(d.id), d.name] as [string, string]),
                ]}
              />
            </div>

            <div className="space-y-1 flex-1 min-w-50">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Search Staff</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, code, role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end md:self-center border bg-muted/30 p-1 rounded-lg">
            <button
              onClick={() => setSelectedStage("all")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                selectedStage === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Stages
            </button>
            <button
              onClick={() => setSelectedStage("hr")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1",
                selectedStage === "hr" ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              HR ({counts.pendingHr})
            </button>
            <button
              onClick={() => setSelectedStage("management")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1",
                selectedStage === "management" ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mgmt ({counts.pendingMgmt})
            </button>
            <button
              onClick={() => setSelectedStage("accounts")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1",
                selectedStage === "accounts" ? "bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Accounts ({counts.pendingAccounts})
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Bulk Actions Floating / Fixed Sticky Header Bar ── */}
      {selectedIds.size > 0 && (
        <Card className="border border-teal-300 dark:border-teal-900 bg-teal-50/90 dark:bg-teal-950/60 shadow-lg animate-in slide-in-from-top-2 duration-200 sticky top-2 z-30 backdrop-blur">
          <CardContent className="p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-full bg-teal-600 text-white font-extrabold text-xs">
                {selectedIds.size} Selected
              </span>
              <Button
                variant="ghost"
                size="default"
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear Selection
              </Button>
            </div>

            <div className="flex-1 max-w-lg">
              <input
                type="text"
                placeholder="Global Approval Comment / Batch Narration (applies to all selected unless row comment is set)..."
                value={globalNote}
                onChange={(e) => setGlobalNote(e.target.value)}
                className="w-full h-8 px-3 text-xs rounded-md border border-teal-300 dark:border-teal-800 bg-background focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {isHrOrAdmin && (
                <Button
                  variant="default"
                  size="default"
                  className="h-8 px-3 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                  onClick={() => handleBulkAction("Approved by HR")}
                  disabled={processing}
                >
                  <CheckCircle2 size={13} /> Approve Stage 1 (HR)
                </Button>
              )}

              {canApproveManagement && (
                <Button
                  variant="default"
                  size="default"
                  className="h-8 px-3 text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                  onClick={() => handleBulkAction("Approved by Management")}
                  disabled={processing}
                >
                  <ShieldCheck size={13} /> Approve Stage 2 (Mgmt)
                </Button>
              )}

              {isAccountsOrAdmin && (
                <Button
                  variant="default"
                  size="default"
                  className="h-8 px-3 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer"
                  onClick={() => handleBulkAction("Paid")}
                  disabled={processing}
                >
                  <DollarSign size={13} /> Mark Paid (Accounts)
                </Button>
              )}

              <Button
                variant="outline"
                size="default"
                className="h-8 px-2.5 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                onClick={() => handleBulkAction("Cancelled")}
                disabled={processing}
              >
                <Ban size={13} /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Department-Wise Tabular Approval Sections ── */}
      {departmentGroups.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h4 className="font-semibold text-foreground text-sm">No Payslips Found</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            No payslips match the selected month ({selectedMonth}), department, and workflow stage filters.
          </p>
        </Card>
      ) : (
        departmentGroups.map(([deptName, rows]) => {
          const deptIds = rows.map((r) => r.id);
          const isDeptAllSelected = deptIds.every((id) => selectedIds.has(id));
          const isDeptSomeSelected = deptIds.some((id) => selectedIds.has(id)) && !isDeptAllSelected;
          const deptTotalNet = rows.reduce((sum, r) => sum + Number(r.netSalary ?? 0), 0);

          return (
            <Card key={deptName} className="border shadow-2xs overflow-hidden">
              {/* Department Group Header */}
              <div className="px-4 py-3 bg-muted/40 border-b flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isDeptAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isDeptSomeSelected;
                    }}
                    onChange={() => handleToggleSelectDept(rows)}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-teal-600 dark:text-teal-400" />
                    <h3 className="font-bold text-sm text-foreground">{deptName}</h3>
                    <Badge variant="default" className="text-[11px] h-5 px-2">
                      {rows.length} Staff
                    </Badge>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="text-muted-foreground font-semibold mr-1.5">Dept Total Payroll:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(deptTotalNet)}</span>
                </div>
              </div>

              {/* Payslip Rows Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-background text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-2.5 px-3 w-8 text-center">Sel</th>
                      <th className="py-2.5 px-3">Employee & Role</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Salary Components (Earnings)</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Deductions Breakdown</th>
                      <th className="py-2.5 px-3 text-right">Net Take-Home</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Payment Details</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Approval Comment / Narration</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {rows.map((r) => {
                      const isSelected = selectedIds.has(r.id);
                      const isExpanded = expandedRowIds.has(r.id);

                      const basic = Number(r.basicSalary ?? 0);
                      const hra = Number(r.hra ?? 0);
                      const conveyance = Number(r.conveyance ?? 0);
                      const medical = Number(r.medical ?? 0);
                      const special = Number(r.special ?? 0);
                      const gross = basic + hra + conveyance + medical + special;

                      const epf = Number(r.epf ?? 0);
                      const esi = Number(r.esi ?? 0);
                      const pt = Number(r.professionalTax ?? 0);
                      const other = Number(r.otherDeductions ?? 0);
                      const leaveDed = Number(r.leaveDeduction ?? 0);
                      const lateAtt = Number(r.lateAttendance ?? 0);
                      const totalDeductions = epf + esi + pt + other + leaveDed + lateAtt;

                      return (
                        <React.Fragment key={r.id}>
                          <tr
                            className={cn(
                              "hover:bg-muted/30 transition-colors",
                              isSelected && "bg-teal-50/50 dark:bg-teal-950/20",
                              isExpanded && "bg-slate-50/80 dark:bg-slate-900/40"
                            )}
                          >
                            {/* Checkbox */}
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(r.id)}
                                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                              />
                            </td>

                            {/* Employee Info & Role */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleExpand(r.id)}
                                  className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded"
                                  title={isExpanded ? "Hide detailed breakdown" : "View itemized breakdown"}
                                >
                                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                                <div>
                                  <Link to="/hr/view-payslip" search={{ payslipId: r.id }} className="font-semibold text-foreground hover:text-primary hover:underline">
                                    {r.name}
                                  </Link>
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    {r.employeeCode} &middot; <span className="font-sans">{r.role}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Salary Components (Earnings) */}
                            <td className="py-2.5 px-3">
                              <div className="space-y-0.5 text-[11px]">
                                <div className="flex items-center justify-between font-bold text-foreground border-b border-border/40 pb-0.5">
                                  <span>Gross Salary:</span>
                                  <span>{fmt(gross)}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 pt-0.5">
                                  <span>Basic: <strong className="text-foreground">{fmt(basic)}</strong></span>
                                  {hra > 0 && <span>HRA: <strong className="text-foreground">{fmt(hra)}</strong></span>}
                                  {conveyance > 0 && <span>Conv: <strong className="text-foreground">{fmt(conveyance)}</strong></span>}
                                  {medical > 0 && <span>Med: <strong className="text-foreground">{fmt(medical)}</strong></span>}
                                  {special > 0 && <span>Spec: <strong className="text-foreground">{fmt(special)}</strong></span>}
                                </div>
                              </div>
                            </td>

                            {/* Deductions Breakdown */}
                            <td className="py-2.5 px-3">
                              <div className="space-y-0.5 text-[11px]">
                                <div className="flex items-center justify-between font-bold text-rose-600 dark:text-rose-400 border-b border-border/40 pb-0.5">
                                  <span>Total Deductions:</span>
                                  <span>{fmt(totalDeductions)}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 pt-0.5">
                                  {epf > 0 && <span>EPF: <strong className="text-foreground">{fmt(epf)}</strong></span>}
                                  {esi > 0 && <span>ESI: <strong className="text-foreground">{fmt(esi)}</strong></span>}
                                  {pt > 0 && <span>PT: <strong className="text-foreground">{fmt(pt)}</strong></span>}
                                  {leaveDed > 0 && (
                                    <span className="text-amber-700 dark:text-amber-400">
                                      Leave ({r.leaveDaysTaken}d): <strong>{fmt(leaveDed)}</strong>
                                    </span>
                                  )}
                                  {lateAtt > 0 && <span>Late: <strong className="text-foreground">{fmt(lateAtt)}</strong></span>}
                                  {other > 0 && <span>Other: <strong className="text-foreground">{fmt(other)}</strong></span>}
                                </div>
                              </div>
                            </td>

                            {/* Net Salary */}
                            <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                              {fmt(r.netSalary)}
                            </td>

                            {/* Payment Details */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                {r.paymentMode === "Cash" ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/60">
                                    <Coins size={12} className="text-amber-600" /> Cash Payment
                                  </span>
                                ) : (
                                  <div className="text-[11px] space-y-0.5">
                                    <div className="font-semibold text-foreground flex items-center gap-1">
                                      <Landmark size={11} className="text-emerald-600 shrink-0" />
                                      <span className="truncate max-w-[120px]">{r.bankName || "Bank Transfer"}</span>
                                    </div>
                                    <div className="text-[10px] font-mono text-muted-foreground truncate max-w-[140px]">
                                      {r.accountNumber ? `A/C: ${r.accountNumber}` : "No A/C info"}
                                      {r.ifscCode ? ` (${r.ifscCode})` : ""}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border",
                                  r.status === "Cancelled" && "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300",
                                  (r.status === "Draft" || r.status === "Active") && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
                                  r.status === "Approved by HR" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
                                  (r.status === "Approved by Management" || r.status === "Approved by COO") && "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300",
                                  r.status === "Paid" && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                                )}
                              >
                                {r.status}
                              </span>
                            </td>

                            {/* Row Comment */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                placeholder="Row comment (optional)..."
                                value={perStaffNotes[r.id] ?? ""}
                                onChange={(e) => setPerStaffNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                className="w-full h-7 px-2 text-[11px] rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-teal-500"
                              />
                              {(r.hrNotes || r.cooNotes || r.accountsNotes) && (
                                <div className="text-[10px] text-muted-foreground italic truncate mt-0.5 max-w-[220px]" title={`HR: ${r.hrNotes || '-'}, COO: ${r.cooNotes || '-'}, Acc: ${r.accountsNotes || '-'}`}>
                                  Note: {r.accountsNotes || r.cooNotes || r.hrNotes}
                                </div>
                              )}
                            </td>

                            {/* Action */}
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="default"
                                  className="h-7 w-7 p-0 cursor-pointer shrink-0"
                                  onClick={() => handleToggleExpand(r.id)}
                                  title={isExpanded ? "Collapse breakdown" : "Expand all components & details"}
                                >
                                  <Info size={14} className={isExpanded ? "text-primary" : "text-muted-foreground"} />
                                </Button>
                                <Link to="/hr/view-payslip" search={{ payslipId: r.id }}>
                                  <Button variant="outline" size="default" className="h-7 px-2 text-[11px] gap-1 cursor-pointer whitespace-nowrap">
                                    <Eye size={12} /> View Payslip
                                  </Button>
                                </Link>
                              </div>
                            </td>
                          </tr>

                          {/* Collapsible Itemized Breakdown Grid Panel */}
                          {isExpanded && (
                            <tr key={`${r.id}-expanded`} className="bg-slate-100/70 dark:bg-slate-900/60 border-b">
                              <td colSpan={10} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                                  {/* Card 1: Earnings */}
                                  <div className="p-3 rounded-lg border bg-background space-y-1.5 shadow-2xs">
                                    <h5 className="font-bold text-xs text-emerald-600 dark:text-emerald-400 border-b pb-1 flex items-center justify-between">
                                      <span>Salary Components</span>
                                      <span>{fmt(gross)}</span>
                                    </h5>
                                    <div className="space-y-1 text-[11px] pt-1">
                                      <div className="flex justify-between"><span className="text-muted-foreground">Basic Salary:</span><span className="font-medium">{fmt(basic)}</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">House Rent (HRA):</span><span className="font-medium">{fmt(hra)}</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">Conveyance:</span><span className="font-medium">{fmt(conveyance)}</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">Medical:</span><span className="font-medium">{fmt(medical)}</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">Special Allowance:</span><span className="font-medium">{fmt(special)}</span></div>
                                    </div>
                                  </div>

                                  {/* Card 2: Deductions */}
                                  <div className="p-3 rounded-lg border bg-background space-y-1.5 shadow-2xs">
                                    <h5 className="font-bold text-xs text-rose-600 dark:text-rose-400 border-b pb-1 flex items-center justify-between">
                                      <span>Deductions Breakdown</span>
                                      <span>{fmt(totalDeductions)}</span>
                                    </h5>
                                    <div className="space-y-1 text-[11px] pt-1">
                                      <div className="flex justify-between"><span className="text-muted-foreground">EPF (Provident Fund):</span><span className="font-medium">{fmt(epf)}</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">ESI (State Insurance):</span><span className="font-medium">{fmt(esi)}</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">Professional Tax:</span><span className="font-medium">{fmt(pt)}</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">Leave Deduction ({r.leaveDaysTaken} days):</span><span className="font-medium text-amber-600">{fmt(leaveDed)}</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">Late Attendance:</span><span className="font-medium">{fmt(lateAtt)}</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">Other Deductions:</span><span className="font-medium">{fmt(other)}</span></div>
                                    </div>
                                  </div>

                                  {/* Card 3: Payment & Banking */}
                                  <div className="p-3 rounded-lg border bg-background space-y-1.5 shadow-2xs">
                                    <h5 className="font-bold text-xs text-foreground border-b pb-1">Payment & Banking</h5>
                                    <div className="space-y-1 text-[11px] pt-1">
                                      <div className="flex justify-between"><span className="text-muted-foreground">Payment Mode:</span><span className="font-semibold">{r.paymentMode || "Bank Transfer"}</span></div>
                                      {r.paymentMode !== "Cash" ? (
                                        <>
                                          <div className="flex justify-between"><span className="text-muted-foreground">Bank Name:</span><span className="font-medium truncate max-w-[120px]">{r.bankName || "N/A"}</span></div>
                                          <div className="flex justify-between"><span className="text-muted-foreground">Account Number:</span><span className="font-mono font-medium">{r.accountNumber || "N/A"}</span></div>
                                          <div className="flex justify-between"><span className="text-muted-foreground">IFSC Code:</span><span className="font-mono font-medium uppercase">{r.ifscCode || "N/A"}</span></div>
                                        </>
                                      ) : (
                                        <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 italic">
                                          Disbursement via Cash. Auto-creates Cash Salary Expense entry upon payment.
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Card 4: Workflow History & Notes */}
                                  <div className="p-3 rounded-lg border bg-background space-y-1.5 shadow-2xs">
                                    <h5 className="font-bold text-xs text-foreground border-b pb-1">Workflow Notes History</h5>
                                    <div className="space-y-1 text-[11px] pt-1">
                                      <div><span className="text-muted-foreground font-semibold">HR Note:</span> <span className="italic">{r.hrNotes || "None"}</span></div>
                                      <div><span className="text-muted-foreground font-semibold">Management Note:</span> <span className="italic">{r.cooNotes || "None"}</span></div>
                                      <div><span className="text-muted-foreground font-semibold">Accounts Note:</span> <span className="italic">{r.accountsNotes || "None"}</span></div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
