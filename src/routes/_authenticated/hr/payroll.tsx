import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Receipt, RefreshCw, Eye, AlertCircle, FileDown, Plus, X, Edit2, DollarSign, ShieldCheck, ArrowRightLeft, Banknote, FileText, Coins, Landmark, ArrowUpDown, ArrowUp, ArrowDown, Search, CheckCircle2 } from "lucide-react";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { useSystemSettings, usePayrollSettings, useSalaryTemplates } from "../../../lib/settings";
import { DataTable } from "../../../components/DataTable";
import { useRpcQuery, queryClient } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../ui/card";
import { MonthPicker } from "../../../components/ui/month-picker";
import { Select } from "../../../ui/select";
import { Field } from "../../../components/Field";
import { exportPayrollToExcel } from "../../../lib/payroll-export";
import type { StaffRow } from "../../../types";
import { authClient } from "../../../services/auth";
import { useUserPermissions } from "../../../lib/permissions";
import { Autocomplete } from "../../../ui/autocomplete";
import { cn } from "@/utils/cn";
import { PayrollWorkflowApprovals } from "../../../components/hr/PayrollWorkflowApprovals";

export const Route = createFileRoute("/_authenticated/hr/payroll")({
  validateSearch: (search: Record<string, unknown>): { tab?: "security-deposit" } =>
    search.tab === "security-deposit" ? { tab: "security-deposit" } : {},
  component: PayrollPage,
});

interface PayslipRow extends Record<string, unknown> {
  id: number;
  staffId: number;
  month: string;
  basicSalary: number;
  hra: number;
  conveyance: number;
  skillAllowance: number;
  special: number;
  earnedLeaveEncashment?: number;
  extraDayAllowance?: number;
  epf: number;
  esi: number;
  professionalTax: number;
  tds?: number;
  securityDeposit?: number;
  otherDeductions: number;
  lateAttendance: number;
  leaveDaysTaken: number;
  leaveDeduction: number;
  netSalary: number;
  version: number;
  status: string;
  paymentMode?: string;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  chequeNumber?: string | null;
  chequeDate?: string | null;
  createdAt: string;
  employeeCode: string;
  name: string;
  role: string;
  departmentName: string | null;
}

interface SecurityDepositStaffItem {
  staffId: number;
  version: number;
  employeeCode: string;
  name: string;
  role: string;
  departmentName: string | null;
  openingBalance: number;
  pendingDeduction: number;
  targetAmount: number;
  monthlyDeduction: number;
  securityDepositStartMonth?: string | null;
  totalDeducted: number;
  totalRefunded: number;
  netHeld: number;
  status: string;
  refundHistory: Array<{
    id: number;
    amount: number;
    refundDate: string;
    notes: string | null;
    createdAt: string;
  }>;
}

type SecSortKey =
  | "employee"
  | "department"
  | "targetAmount"
  | "monthlyDeduction"
  | "totalDeducted"
  | "totalRefunded"
  | "netHeld"
  | "status";

export function formatMonthMonYy(monthStr: string | null | undefined): string {
  if (!monthStr) return "";
  const trimmed = monthStr.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})/);
  if (isoMatch) {
    const fullYear = isoMatch[1];
    const monthNum = parseInt(isoMatch[2], 10);
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    if (monthNum >= 1 && monthNum <= 12) {
      return `${fullYear}-${months[monthNum - 1]}`;
    }
  }
  const nameMatch = trimmed.match(/^([A-Za-z]+)[\s-]+(\d{2,4})$/);
  if (nameMatch) {
    const mon = nameMatch[1].slice(0, 3).toUpperCase();
    let yr = nameMatch[2];
    if (yr.length === 2) {
      yr = `20${yr}`;
    }
    return `${yr}-${mon}`;
  }
  return monthStr;
}

function PayrollPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const { currentStaff, isAdmin, isHr, isManagementApprover } = useUserPermissions();
  const isAdminOrHr = isAdmin || isHr;
  const canViewAll = isAdminOrHr || isManagementApprover;

  const staffQuery = useRpcQuery<StaffRow[]>(["staff"], () =>
    client.hr.staff.$get()
  );



  const isAccounts = currentStaff?.departmentName === "Accounts";

  const { currencySymbol } = useSystemSettings();
  const [activeTab, setActiveTab] = React.useState<"payslips" | "salaries" | "workflow" | "security-deposit">(tab || "payslips");
  const getPreviousMonth = () => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const [selectedMonth, setSelectedMonth] = React.useState(getPreviousMonth);

  const [generating, setGenerating] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [generationResult, setGenerationResult] = React.useState<{ success: boolean; message: string } | null>(null);
  const [showSuperseded, setShowSuperseded] = React.useState(false);
  const [filterMonth, setFilterMonth] = React.useState(getPreviousMonth);
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [filterPaymentMode, setFilterPaymentMode] = React.useState<string>("all");
  const [showForm, setShowForm] = React.useState(false);

  const [selectedDeptId, setSelectedDeptId] = React.useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>("");

  const payrollSettings = usePayrollSettings();

  const [editingSalaryStaff, setEditingSalaryStaff] = React.useState<StaffRow | null>(null);
  const [basic, setBasic] = React.useState(0);
  const [hra, setHra] = React.useState(0);
  const [conveyance, setConveyance] = React.useState(0);
  const [skillAllowance, setSkillAllowance] = React.useState(0);
  const [special, setSpecial] = React.useState(0);
  const [epf, setEpf] = React.useState(0);
  const [esi, setEsi] = React.useState(0);
  const [pt, setPt] = React.useState(0);
  const [deductTds, setDeductTds] = React.useState(false);
  const [tdsPercent, setTdsPercent] = React.useState(10);
  const [tds, setTds] = React.useState(0);
  const [securityDepositTotal, setSecurityDepositTotal] = React.useState<number | string>(0);
  const [securityDeposit, setSecurityDeposit] = React.useState<number | string>(0);
  const [securityDepositStartMonth, setSecurityDepositStartMonth] = React.useState("");
  const [other, setOther] = React.useState(0);
  const [lateAttendance, setLateAttendance] = React.useState(0);

  const [targetGross, setTargetGross] = React.useState(0);
  const [allowDeductions, setAllowDeductions] = React.useState(true);

  const [secDepTargetStaff, setSecDepTargetStaff] = React.useState<SecurityDepositStaffItem | null>(null);
  const [secDepRefundStaff, setSecDepRefundStaff] = React.useState<SecurityDepositStaffItem | null>(null);
  const [secTargetInput, setSecTargetInput] = React.useState<number | string>(0);
  const [secMonthlyInput, setSecMonthlyInput] = React.useState<number | string>(0);
  const [secOpeningInput, setSecOpeningInput] = React.useState<number | string>(0);
  const [secStartMonthInput, setSecStartMonthInput] = React.useState("");
  const [refundAmount, setRefundAmount] = React.useState<number | string>(0);
  const [refundDate, setRefundDate] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [refundNotes, setRefundNotes] = React.useState("");
  const [submittingSecModal, setSubmittingSecModal] = React.useState(false);
  const [secSearchQuery, setSecSearchQuery] = React.useState("");
  const [secSortKey, setSecSortKey] = React.useState<SecSortKey | null>(null);
  const [secSortDirection, setSecSortDirection] = React.useState<"asc" | "desc">("asc");

  const handleSecSort = (key: SecSortKey) => {
    if (secSortKey === key) {
      if (secSortDirection === "asc") {
        setSecSortDirection("desc");
      } else if (secSortDirection === "desc") {
        setSecSortKey(null);
        setSecSortDirection("asc");
      }
    } else {
      setSecSortKey(key);
      setSecSortDirection("asc");
    }
  };

  const renderSortIcon = (key: SecSortKey) => {
    if (secSortKey !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />;
    }
    return secSortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
    );
  };

  const handleAutoCalculate = () => {
    const basicPct = payrollSettings.basicPct ?? 50;
    const hraPct = payrollSettings.hraPct ?? 30;
    const conveyancePct = payrollSettings.conveyancePct ?? 10;
    const skillPct = payrollSettings.skillAllowancePct ?? 5;
    const specialPct = payrollSettings.specialPct ?? 5;

    const computedBasic = Math.round((basicPct / 100) * targetGross);
    const computedHra = Math.round((hraPct / 100) * targetGross);
    const computedConveyance = Math.round((conveyancePct / 100) * targetGross);
    const computedSkill = Math.round((skillPct / 100) * targetGross);
    const computedSpecial = Math.round((specialPct / 100) * targetGross);

    setBasic(computedBasic);
    setHra(computedHra);
    setConveyance(computedConveyance);
    setSkillAllowance(computedSkill);
    setSpecial(computedSpecial);

    if (allowDeductions) {
      const epfRate = payrollSettings.epfRate ?? 12;
      const esiRate = payrollSettings.esiRate ?? 1.75;
      const ptDefault = payrollSettings.ptDefault ?? 200;

      const computedEpf = Math.round((epfRate / 100) * computedBasic);
      const computedEsi = Math.round((esiRate / 100) * targetGross);

      setEpf(computedEpf);
      setEsi(computedEsi);
      setPt(ptDefault);

      if (deductTds) {
        setTds(Math.round(((tdsPercent || 10) / 100) * targetGross));
      }
    } else {
      setEpf(0);
      setEsi(0);
      setPt(0);
      setTds(0);
    }
  };

  const payslipsQuery = useRpcQuery<PayslipRow[]>(["payslips"], () =>
    client.hr.payroll.payslips.$get()
  );

  const securityDepositsQuery = useRpcQuery<{
    summary: { totalTarget: number; totalCollected: number; totalOutstanding?: number; totalRefunded: number; totalNetHeld: number };
    list: SecurityDepositStaffItem[];
  }>(["security-deposits"], () =>
    client.hr["security-deposits"].$get()
  );

  const departmentsQuery = useRpcQuery<{ id: number; name: string }[]>(["departments"], () =>
    client.departments.$get()
  );

  const templates = useSalaryTemplates();

  React.useEffect(() => {
    if (editingSalaryStaff) {
      const bVal = Number(editingSalaryStaff.basicSalary ?? 0);
      const hVal = Number(editingSalaryStaff.hra ?? 0);
      const cVal = Number(editingSalaryStaff.conveyance ?? 0);
      const skVal = Number(editingSalaryStaff.skillAllowance ?? 0);
      const sVal = Number(editingSalaryStaff.special ?? 0);
      setBasic(bVal);
      setHra(hVal);
      setConveyance(cVal);
      setSkillAllowance(skVal);
      setSpecial(sVal);
      setEpf(Number(editingSalaryStaff.epf ?? 0));
      setEsi(Number(editingSalaryStaff.esi ?? 0));
      setPt(Number(editingSalaryStaff.professionalTax ?? 0));
      setDeductTds(Boolean(editingSalaryStaff.deductTds ?? false));
      setTdsPercent(Number(editingSalaryStaff.tdsPercent ?? 10));
      setTds(Number(editingSalaryStaff.tds ?? 0));
      setSecurityDepositTotal(Number(editingSalaryStaff.securityDepositTotal ?? 0));
      setSecurityDeposit(Number(editingSalaryStaff.securityDeposit ?? 0));
      setSecurityDepositStartMonth(editingSalaryStaff.securityDepositStartMonth ?? "");
      setOther(Number(editingSalaryStaff.otherDeductions ?? 0));
      setLateAttendance(Number(editingSalaryStaff.lateAttendance ?? 0));

      const totalG = bVal + hVal + cVal + skVal + sVal;
      setTargetGross(totalG);
      setAllowDeductions(true);
    } else {
      setBasic(0);
      setHra(0);
      setConveyance(0);
      setSkillAllowance(0);
      setSpecial(0);
      setEpf(0);
      setEsi(0);
      setPt(0);
      setDeductTds(false);
      setTdsPercent(10);
      setTds(0);
      setSecurityDepositTotal(0);
      setSecurityDeposit(0);
      setSecurityDepositStartMonth("");
      setOther(0);
      setLateAttendance(0);
      setTargetGross(0);
      setAllowDeductions(true);
    }
  }, [editingSalaryStaff]);

  const handleGeneratePayroll = async () => {
    setGenerating(true);
    setGenerationResult(null);
    try {
      const res = await client.hr.payroll.generate.$post({
        json: {
          month: selectedMonth,
          departmentId: selectedDeptId ? Number(selectedDeptId) : undefined,
          staffId: selectedStaffId ? Number(selectedStaffId) : undefined,
        },
      });

      const data = (await res.json()) as any;
      if (res.ok && data.ok) {
        let msg = `Successfully generated ${data.generatedCount} payslips for ${selectedMonth}.`;
        if (data.skippedEmployees && data.skippedEmployees.length > 0) {
          msg += ` Skipped ${data.skippedEmployees.length} employee(s) already approved/paid: ${data.skippedEmployees.join(", ")}`;
        }
        setGenerationResult({ success: true, message: msg });
        queryClient.invalidateQueries({ queryKey: ["security-deposits"] });
        queryClient.invalidateQueries({ queryKey: ["payslips"] });
      } else {
        setGenerationResult({ success: false, message: data.error || "Failed to generate payroll." });
      }
    } catch (err) {
      setGenerationResult({ success: false, message: err instanceof Error ? err.message : "An unexpected error occurred." });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalaryStaff) return;
    try {
      const gross = basic + hra + conveyance + skillAllowance + special;
      const payload = {
        name: editingSalaryStaff.name,
        role: editingSalaryStaff.role,
        departmentId: editingSalaryStaff.departmentId ?? 1,
        phone: editingSalaryStaff.phone ?? "",
        email: editingSalaryStaff.email ?? "",
        status: editingSalaryStaff.status ?? "Active",
        aadhar: editingSalaryStaff.aadhar ?? "",
        pan: editingSalaryStaff.pan ?? "",
        supervisorLevel1Id: editingSalaryStaff.supervisorLevel1Id ?? undefined,
        supervisorLevel2Id: editingSalaryStaff.supervisorLevel2Id ?? undefined,
        basicSalary: Number(basic),
        hra: Number(hra),
        conveyance: Number(conveyance),
        skillAllowance: Number(skillAllowance),
        special: Number(special),
        epf: Number(epf),
        esi: Number(esi),
        professionalTax: Number(pt),
        deductTds: Boolean(deductTds),
        tdsPercent: Number(tdsPercent),
        tds: deductTds ? Number(tds) : 0,
        securityDepositTotal: Number(securityDepositTotal),
        securityDeposit: Number(securityDeposit),
        securityDepositStartMonth: securityDepositStartMonth || null,
        otherDeductions: Number(other),
        lateAttendance: Number(lateAttendance),
        salary: Math.max(1, Number(gross))
      };
      const res = await client.hr.staff[":id"].$put({
        param: { id: String(editingSalaryStaff.staffId) },
        json: payload
      } as any);
      if (res.ok) {
        alert("Salary structure updated successfully.");
        setEditingSalaryStaff(null);
        queryClient.invalidateQueries({ queryKey: ["staff"] });
        queryClient.invalidateQueries({ queryKey: ["payslips"] });
        queryClient.invalidateQueries({ queryKey: ["security-deposits"] });
      } else {
        const err = await res.json().catch(() => null) as any;
        alert("Failed to save: " + (err?.error || `HTTP error ${res.status}`));
      }
    } catch (err) {
      alert("Error saving salary structure: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSaveSecTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secDepTargetStaff) return;
    setSubmittingSecModal(true);
    try {
      const res = await fetch(`/api/hr/security-deposits/${secDepTargetStaff.staffId}/target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          securityDepositTotal: Number(secTargetInput),
          securityDeposit: Number(secMonthlyInput),
          securityDepositStartMonth: secStartMonthInput || null,
          securityDepositOpeningBalance: Number(secOpeningInput),
        }),
      });
      if (res.ok) {
        setSecDepTargetStaff(null);
        queryClient.invalidateQueries({ queryKey: ["security-deposits"] });
        queryClient.invalidateQueries({ queryKey: ["staff"] });
      } else {
        const err = await res.json();
        alert("Failed to update security deposit target: " + (err.error || "Error"));
      }
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmittingSecModal(false);
    }
  };

  const handleSaveRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secDepRefundStaff) return;
    setSubmittingSecModal(true);
    try {
      const res = await fetch(`/api/hr/security-deposits/${secDepRefundStaff.staffId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(refundAmount),
          refundDate,
          notes: refundNotes,
        }),
      });
      if (res.ok) {
        setSecDepRefundStaff(null);
        setRefundAmount(0);
        setRefundNotes("");
        queryClient.invalidateQueries({ queryKey: ["security-deposits"] });
      } else {
        const err = await res.json();
        alert("Failed to record refund: " + (err.error || "Error"));
      }
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmittingSecModal(false);
    }
  };

  const availableStatuses = React.useMemo(() => {
    const defaultStatuses = [
      "Draft",
      "Active",
      "Approved by HR",
      "Approved by Management",
      "Approved by COO",
      "Paid",
      "Cancelled",
      "Superseded",
    ];
    const data = payslipsQuery.data ?? [];
    const set = new Set(defaultStatuses);
    data.forEach((p) => {
      if (p.status) set.add(p.status);
    });
    return Array.from(set);
  }, [payslipsQuery.data]);

  const availablePaymentModes = React.useMemo(() => {
    const defaultModes = ["Bank Transfer", "Cheque", "Cash"];
    const data = payslipsQuery.data ?? [];
    const set = new Set(defaultModes);
    data.forEach((p) => {
      if (p.paymentMode) set.add(p.paymentMode);
    });
    return Array.from(set);
  }, [payslipsQuery.data]);

  const filteredPayslips = React.useMemo(() => {
    const data = payslipsQuery.data ?? [];
    return data.filter((p) => {
      if (!showSuperseded && p.status === "Superseded" && filterStatus !== "Superseded") return false;
      if (filterMonth && p.month !== filterMonth) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterPaymentMode !== "all") {
        const mode = p.paymentMode || "Bank Transfer";
        if (mode !== filterPaymentMode) return false;
      }
      return true;
    });
  }, [payslipsQuery.data, showSuperseded, filterMonth, filterStatus, filterPaymentMode]);

  const payslipSummary = React.useMemo(() => {
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let paidCount = 0;
    let pendingCount = 0;

    for (const row of filteredPayslips) {
      const g = Number(row.basicSalary) + Number(row.hra) + Number(row.conveyance) + Number(row.skillAllowance ?? 0) + Number(row.special) + Number(row.earnedLeaveEncashment ?? 0) + Number(row.extraDayAllowance ?? 0);
      const d = Number(row.epf) + Number(row.esi) + Number(row.professionalTax) + Number(row.tds ?? 0) + Number(row.securityDeposit ?? 0) + Number(row.otherDeductions) + Number(row.lateAttendance) + Number(row.leaveDeduction);
      const n = Number(row.netSalary);

      totalGross += g;
      totalDeductions += d;
      totalNet += n;

      if (row.status === "Paid") {
        paidCount++;
      } else if (row.status !== "Cancelled" && row.status !== "Superseded") {
        pendingCount++;
      }
    }

    return { totalGross, totalDeductions, totalNet, totalCount: filteredPayslips.length, paidCount, pendingCount };
  }, [filteredPayslips]);

  const handleExport = () => {
    if (!filterMonth) {
      alert("Please select a specific month to export. Payroll export is restricted to a particular month.");
      return;
    }
    setExporting(true);
    try {
      exportPayrollToExcel({ payslips: filteredPayslips, filterMonth });
    } finally {
      setExporting(false);
    }
  };

  const payslipColumns = [
    {
      id: "month",
      label: "Month",
      render: (row: PayslipRow) => (
        <span className="font-semibold text-foreground">{formatMonthMonYy(row.month)}</span>
      ),
      sortKey: "month" as keyof PayslipRow,
    },
    {
      id: "employeeCode",
      label: "Code",
      render: (row: PayslipRow) => <span>{row.employeeCode}</span>,
      sortKey: "employeeCode" as keyof PayslipRow,
    },
    {
      id: "name",
      label: "Name / Role",
      render: (row: PayslipRow) => (
        <div>
          <span className="font-medium block text-foreground">{row.name}</span>
          <span className="text-muted-foreground text-xs">{row.role} &middot; {row.departmentName || "General"}</span>
        </div>
      ),
      sortKey: "name" as keyof PayslipRow,
    },
    {
      id: "gross",
      label: "Gross",
      className: "text-right",
      headerClassName: "text-right",
      render: (row: PayslipRow) => {
        const g = Number(row.basicSalary) + Number(row.hra) + Number(row.conveyance) + Number(row.skillAllowance ?? 0) + Number(row.special) + Number(row.earnedLeaveEncashment ?? 0) + Number(row.extraDayAllowance ?? 0);
        return <span className="tabular-nums font-medium">{currencySymbol}{g.toLocaleString("en-IN")}</span>;
      },
    },
    {
      id: "deductions",
      label: "Deductions",
      className: "text-right",
      headerClassName: "text-right",
      render: (row: PayslipRow) => {
        const d = Number(row.epf) + Number(row.esi) + Number(row.professionalTax) + Number(row.tds ?? 0) + Number(row.securityDeposit ?? 0) + Number(row.otherDeductions) + Number(row.lateAttendance) + Number(row.leaveDeduction);
        return <span className="tabular-nums text-rose-600 dark:text-rose-400 font-medium">{currencySymbol}{d.toLocaleString("en-IN")}</span>;
      },
    },
    {
      id: "netSalary",
      label: "Net Salary",
      className: "text-right",
      headerClassName: "text-right",
      render: (row: PayslipRow) => (
        <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
          {currencySymbol}{Number(row.netSalary).toLocaleString("en-IN")}
        </span>
      ),
      sortKey: "netSalary" as keyof PayslipRow,
    },
    {
      id: "paymentMode",
      label: "Payment Mode",
      render: (row: PayslipRow) => {
        const mode = row.paymentMode || "Bank Transfer";
        return (
          <span className="text-xs font-semibold">
            {mode === "Cheque" ? (
              <span className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-300">
                <FileText size={12} /> Cheque {row.chequeNumber ? `(#${row.chequeNumber})` : ""}
              </span>
            ) : mode === "Cash" ? (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                <Coins size={12} /> Cash
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                <Landmark size={12} /> Bank Transfer
              </span>
            )}
          </span>
        );
      },
    },
    {
      id: "status",
      label: "Status",
      render: (row: PayslipRow) => {
        const statusColors: Record<string, string> = {
          Draft: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300",
          "Approved by Management": "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300",
          "Approved by COO": "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-300",
          Paid: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300",
          Superseded: "bg-gray-100 text-gray-500 border-gray-200 line-through",
        };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${statusColors[row.status] || "bg-gray-100 text-gray-800"}`}>
            {row.status}
          </span>
        );
      },
      sortKey: "status" as keyof PayslipRow,
    },
    {
      id: "actions",
      label: "Actions",
      render: (row: PayslipRow) => (
        <Link to="/hr/view-payslip" search={{ payslipId: row.id }}>
          <Button variant="ghost" size="default" className="h-8 gap-1 text-xs cursor-pointer">
            <Eye size={14} /> View
          </Button>
        </Link>
      ),
    },
  ];

  const staffSalaryColumns = [
    {
      id: "employeeCode",
      label: "Code",
      render: (row: StaffRow) => <span>{row.employeeCode}</span>,
      sortKey: "employeeCode" as keyof StaffRow,
    },
    {
      id: "name",
      label: "Name / Dept",
      render: (row: StaffRow) => (
        <div>
          <span className="font-semibold block">{row.name}</span>
          <span className="text-muted-foreground text-xs">{row.departmentName || "No Dept"}</span>
        </div>
      ),
      sortKey: "name" as keyof StaffRow,
    },
    {
      id: "grossSalary",
      label: "Gross Salary",
      className: "text-right",
      headerClassName: "text-right",
      render: (row: StaffRow) => {
        const b = Number(row.basicSalary ?? 0);
        const h = Number(row.hra ?? 0);
        const c = Number(row.conveyance ?? 0);
        const sk = Number(row.skillAllowance ?? 0);
        const s = Number(row.special ?? 0);
        const gross = b + h + c + sk + s;
        if (gross === 0) {
          return (
            <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-600/20">
              Not Configured
            </span>
          );
        }
        return <span className="tabular-nums font-semibold text-foreground">{currencySymbol}{gross.toLocaleString("en-IN")}</span>;
      }
    },
    {
      id: "deductionsSummary",
      label: "Deductions",
      className: "text-right",
      headerClassName: "text-right",
      render: (row: StaffRow) => {
        const ep = Number(row.epf ?? 0);
        const es = Number(row.esi ?? 0);
        const p = Number(row.professionalTax ?? 0);
        const tdsVal = Boolean(row.deductTds) ? Number(row.tds ?? 0) : 0;
        const secDep = Number(row.securityDeposit ?? 0);
        const od = Number(row.otherDeductions ?? 0);
        const total = ep + es + p + tdsVal + secDep + od;
        return <span className="tabular-nums text-xs text-rose-600 font-medium">{currencySymbol}{total.toLocaleString("en-IN")}</span>;
      }
    },
    {
      id: "netSalary",
      label: "Net Take-Home",
      className: "text-right",
      headerClassName: "text-right",
      render: (row: StaffRow) => {
        const b = Number(row.basicSalary ?? 0);
        const h = Number(row.hra ?? 0);
        const c = Number(row.conveyance ?? 0);
        const sk = Number(row.skillAllowance ?? 0);
        const s = Number(row.special ?? 0);
        const ep = Number(row.epf ?? 0);
        const es = Number(row.esi ?? 0);
        const p = Number(row.professionalTax ?? 0);
        const tdsVal = Boolean(row.deductTds) ? Number(row.tds ?? 0) : 0;
        const secDep = Number(row.securityDeposit ?? 0);
        const od = Number(row.otherDeductions ?? 0);
        const la = Number(row.lateAttendance ?? 0);
        const gross = b + h + c + sk + s;
        if (gross === 0) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const net = Math.max(0, gross - (ep + es + p + tdsVal + secDep + od + la));
        return <span className="tabular-nums font-semibold text-emerald-600">{currencySymbol}{net.toLocaleString("en-IN")}</span>;
      }
    },
    {
      id: "actions",
      label: "Actions",
      className: "text-right",
      headerClassName: "text-right",
      render: (row: StaffRow) => {
        if (!isAdminOrHr) return null;
        const b = Number(row.basicSalary ?? 0);
        const h = Number(row.hra ?? 0);
        const c = Number(row.conveyance ?? 0);
        const sk = Number(row.skillAllowance ?? 0);
        const s = Number(row.special ?? 0);
        const hasSalary = (b + h + c + sk + s) > 0;
        return (
          <Button onClick={() => setEditingSalaryStaff(row)} variant={hasSalary ? "outline" : "default"} size="default" className="h-8 gap-1 cursor-pointer">
            {hasSalary ? <Edit2 size={14} /> : <Plus size={14} />}
            {hasSalary ? "Manage Salary" : "Setup Salary"}
          </Button>
        );
      },
    }
  ];

  const secData = securityDepositsQuery.data;
  const secSummary = React.useMemo(() => {
    const s = secData?.summary ?? { totalTarget: 0, totalCollected: 0, totalRefunded: 0, totalNetHeld: 0 };
    const list = secData?.list ?? [];
    const totalOutstanding =
      s.totalOutstanding ??
      list.reduce((acc, curr) => acc + Math.max(0, curr.targetAmount - curr.totalDeducted), 0);
    return { ...s, totalOutstanding };
  }, [secData]);
  const filteredSecList = React.useMemo(() => {
    const list = secData?.list ?? [];
    let result = list;
    if (secSearchQuery.trim()) {
      const q = secSearchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.employeeCode.toLowerCase().includes(q) ||
          (item.departmentName && item.departmentName.toLowerCase().includes(q))
      );
    }
    if (!secSortKey) return result;

    return [...result].sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      switch (secSortKey) {
        case "employee":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "department":
          aVal = (a.departmentName || "").toLowerCase();
          bVal = (b.departmentName || "").toLowerCase();
          break;
        case "targetAmount":
          aVal = a.targetAmount;
          bVal = b.targetAmount;
          break;
        case "monthlyDeduction":
          aVal = a.monthlyDeduction;
          bVal = b.monthlyDeduction;
          break;
        case "totalDeducted":
          aVal = a.totalDeducted;
          bVal = b.totalDeducted;
          break;
        case "totalRefunded":
          aVal = a.totalRefunded;
          bVal = b.totalRefunded;
          break;
        case "netHeld":
          aVal = a.netHeld;
          bVal = b.netHeld;
          break;
        case "status":
          aVal = a.status.toLowerCase();
          bVal = b.status.toLowerCase();
          break;
      }

      if (aVal < bVal) return secSortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return secSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [secData?.list, secSearchQuery, secSortKey, secSortDirection]);

  return (
    <ModuleLayout
      title="Payroll & Payslips"
      description="Generate monthly payroll, access generated payslips, and manage employee salary structures & security deposits."
      action={
        activeTab === "payslips" ? (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExport}
              disabled={exporting || !filterMonth || filteredPayslips.length === 0}
              variant="outline"
              size="default"
              className="gap-2 text-xs h-9 rounded-xl font-medium shadow-2xs hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 dark:hover:border-emerald-800 transition-colors cursor-pointer"
              title={!filterMonth ? "Select a month to enable Excel export" : `Export payroll for ${formatMonthMonYy(filterMonth)}`}
            >
              <FileDown size={14} className={exporting ? "animate-bounce" : ""} />
              {exporting ? "Exporting..." : filterMonth ? `Export Excel (${formatMonthMonYy(filterMonth)})` : "Export Excel"}
            </Button>

            {isAdminOrHr && (
              <Button onClick={() => { setGenerationResult(null); setShowForm(true); }} className="gap-2 h-9 rounded-xl shadow-2xs cursor-pointer">
                <Plus size={16} /> Generate Payroll
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-muted/50 dark:bg-muted/30 backdrop-blur-xs rounded-2xl border border-border/70 overflow-x-auto overflow-y-hidden shadow-2xs">
          <button
            onClick={() => setActiveTab("payslips")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap",
              activeTab === "payslips"
                ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
          >
            <Receipt className={cn("size-4", activeTab === "payslips" ? "text-primary" : "text-muted-foreground")} />
            <span>Payslip Register</span>
            {filteredPayslips.length > 0 && (
              <span className={cn(
                "ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums inline-flex items-center gap-1",
                activeTab === "payslips" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <span>{filteredPayslips.length}</span>
                <span className="opacity-40">&middot;</span>
                <span>{currencySymbol}{payslipSummary.totalNet.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("workflow")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap",
              activeTab === "workflow"
                ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
          >
            <ShieldCheck className={cn("size-4", activeTab === "workflow" ? "text-primary" : "text-muted-foreground")} />
            <span>Workflow Approvals</span>
          </button>

          {canViewAll && (
            <button
              onClick={() => setActiveTab("salaries")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap",
                activeTab === "salaries"
                  ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              )}
            >
              <Landmark className={cn("size-4", activeTab === "salaries" ? "text-primary" : "text-muted-foreground")} />
              <span>Salary Structures</span>
              {staffQuery.data && staffQuery.data.length > 0 && (
                <span className={cn(
                  "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums",
                  activeTab === "salaries" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {staffQuery.data.length}
                </span>
              )}
            </button>
          )}

          {canViewAll && (
            <button
              onClick={() => setActiveTab("security-deposit")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap",
                activeTab === "security-deposit"
                  ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              )}
            >
              <Coins className={cn("size-4", activeTab === "security-deposit" ? "text-primary" : "text-muted-foreground")} />
              <span>Security Deposit Dashboard</span>
              {filteredSecList.length > 0 && (
                <span className={cn(
                  "ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums inline-flex items-center gap-1",
                  activeTab === "security-deposit" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <span>{filteredSecList.length}</span>
                  <span className="opacity-40">&middot;</span>
                  <span>{currencySymbol}{secSummary.totalNetHeld.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </span>
              )}
            </button>
          )}
        </div>

        {/* Workflow Approvals Tab */}
        {activeTab === "workflow" && (
          <PayrollWorkflowApprovals />
        )}

        {/* Payslip Register Tab */}
        {activeTab === "payslips" && (
          <div className="space-y-6">
            {/* Metric Summary Cards for Payslip Register */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card/70 backdrop-blur-xs border-border/70 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Banknote className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Net Payout</p>
                    <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5 tabular-nums truncate">
                      {currencySymbol}{payslipSummary.totalNet.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      {payslipSummary.totalCount} staff in selection
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/70 backdrop-blur-xs border-border/70 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
                    <DollarSign className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gross Earnings</p>
                    <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5 tabular-nums truncate">
                      {currencySymbol}{payslipSummary.totalGross.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      Total earned allowances
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/70 backdrop-blur-xs border-border/70 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
                    <Receipt className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Deductions</p>
                    <p className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums truncate">
                      {currencySymbol}{payslipSummary.totalDeductions.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      EPF, ESI, TDS, Deposit & PT
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/70 backdrop-blur-xs border-border/70 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Disbursement Status</p>
                    <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5 tabular-nums truncate">
                      {payslipSummary.paidCount} Paid
                    </p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                      {payslipSummary.pendingCount} Pending / In-Review
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Table Card */}
            <Card className="border shadow-xs bg-card/90 backdrop-blur-sm overflow-hidden rounded-2xl">
              <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-4 gap-4 border-b bg-muted/20 px-4 sm:px-6">
                <div>
                  <CardTitle className="text-base font-bold tracking-tight">Payslip Register</CardTitle>
                  <CardDescription className="text-xs">
                    Review and audit processed employee compensation for <span className="font-semibold text-foreground">{filterMonth ? formatMonthMonYy(filterMonth) : "All Months"}</span>.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-xl px-2.5 py-1 shadow-2xs">
                    <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Month:</span>
                    <MonthPicker
                      value={filterMonth}
                      onChange={(val) => setFilterMonth(val)}
                    />
                    {filterMonth && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => setFilterMonth("")}
                        title="Clear month filter"
                      >
                        <X size={13} />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-xl px-2.5 py-1 shadow-2xs">
                    <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Status:</span>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="h-7 text-xs bg-transparent text-foreground focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="all">All Statuses</option>
                      {availableStatuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {filterStatus !== "all" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => setFilterStatus("all")}
                        title="Reset status filter"
                      >
                        <X size={12} />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-xl px-2.5 py-1 shadow-2xs">
                    <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Mode:</span>
                    <select
                      value={filterPaymentMode}
                      onChange={(e) => setFilterPaymentMode(e.target.value)}
                      className="h-7 text-xs bg-transparent text-foreground focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="all">All Modes</option>
                      {availablePaymentModes.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    {filterPaymentMode !== "all" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => setFilterPaymentMode("all")}
                        title="Reset payment mode filter"
                      >
                        <X size={12} />
                      </Button>
                    )}
                  </div>

                  <label className="flex items-center gap-2 bg-background border border-border/80 rounded-xl px-2.5 py-1.5 shadow-2xs cursor-pointer select-none hover:bg-muted/30 transition-colors">
                    <input
                      type="checkbox"
                      id="show-superseded"
                      checked={showSuperseded}
                      onChange={(e) => setShowSuperseded(e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground">
                      Superseded
                    </span>
                  </label>
                </div>
              </CardHeader>
            <CardContent className="p-0">
              <DataTable
                rows={filteredPayslips}
                showSerialNumber
                columns={payslipColumns as any}
                enablePagination
                enableSorting
                enableFiltering
                filterPlaceholder="Search payslips..."
                isLoading={payslipsQuery.isLoading}
                renderMobileCard={(row: PayslipRow) => (
                  <Card className="border border-border shadow-xs hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 space-y-3.5">
                      {/* Status at top before employee name */}
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          row.status === "Cancelled"
                            ? "bg-red-50 text-red-700 border-red-200 ring-1 ring-inset ring-red-600/10 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/30 font-bold"
                            : row.status === "Draft"
                            ? "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-inset ring-amber-600/10 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30 font-bold"
                            : row.status === "Active" || row.status === "Approved by HR" || row.status === "Approved by Management" || row.status === "Approved by COO" || row.status === "Paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-250 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30 font-bold"
                            : "bg-slate-50 text-slate-600 border-slate-200 ring-1 ring-inset ring-slate-500/10 dark:bg-slate-850 dark:text-slate-400 dark:border-slate-800 font-semibold"
                        }`}>
                          {row.status}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">{formatMonthMonYy(row.month)}</span>
                      </div>

                      {/* Employee info: Avatar, Name & Code */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold text-xs border shadow-inner">
                          {row.name.split(" ").map((n) => n[0] || "").join("").toUpperCase().slice(0, 2) || "P"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-foreground text-sm truncate">{row.name}</h4>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{row.employeeCode} &middot; {row.departmentName || row.role}</p>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-border/60">
                        <div className="space-y-1">
                          <span className="text-muted-foreground font-semibold block">Net Salary</span>
                          <span className="font-extrabold text-emerald-600 block">{currencySymbol}{row.netSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-muted-foreground font-semibold block">Leave Days Taken</span>
                          <span className={cn("font-medium block", row.leaveDaysTaken > 0 ? "text-amber-600 font-bold" : "text-muted-foreground")}>
                            {row.leaveDaysTaken} days
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-muted-foreground font-semibold block">Version</span>
                          <span className="text-foreground block font-medium">v{row.version}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-muted-foreground font-semibold block">Role</span>
                          <span className="text-foreground block truncate font-medium">{row.role}</span>
                        </div>
                      </div>

                      {/* Actions buttons */}
                      <div className="pt-3 border-t border-border/60">
                        <Button variant="outline" size="default" asChild className="w-full font-semibold h-9" title="View Payslip">
                          <Link to="/hr/view-payslip" search={{ payslipId: row.id }}>
                            <Eye size={14} className="mr-1.5 text-muted-foreground" /> View Payslip
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              />
            </CardContent>
          </Card>
          </div>
        )}

        {/* Salary Structures Tab */}
        {activeTab === "salaries" && canViewAll && (
          <Card className="border shadow-xs bg-card/90 backdrop-blur-sm overflow-hidden rounded-2xl">
            <CardHeader className="border-b pb-4 bg-muted/20 px-4 sm:px-6">
              <CardTitle className="text-base font-bold tracking-tight">Employee Salary Structures</CardTitle>
              <CardDescription className="text-xs">Configure monthly earnings allowances and statutory deductions for staff.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                rows={staffQuery.data ?? []}
                columns={staffSalaryColumns as any}
                showSerialNumber
                enablePagination
                enableSorting
                enableFiltering
                filterPlaceholder="Search staff salaries..."
                isLoading={staffQuery.isLoading}
                renderMobileCard={(row: StaffRow) => {
                  const b = row.basicSalary ?? 0;
                  const h = row.hra ?? 0;
                  const c = row.conveyance ?? 0;
                  const sk = row.skillAllowance ?? 0;
                  const s = row.special ?? 0;
                  const gross = b + h + c + sk + s;

                  const ep = row.epf ?? 0;
                  const es = row.esi ?? 0;
                  const p = row.professionalTax ?? 0;
                  const tdsVal = Boolean(row.deductTds) ? (row.tds ?? 0) : 0;
                  const secDep = row.securityDeposit ?? 0;
                  const od = row.otherDeductions ?? 0;
                  const la = row.lateAttendance ?? 0;
                  const net = Math.max(0, gross - (ep + es + p + tdsVal + secDep + od + la));

                  return (
                    <Card className="border border-border shadow-xs hover:shadow-sm transition-shadow">
                      <CardContent className="p-4 space-y-3.5">
                        {/* Header: Name, Code & Role */}
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold text-xs border shadow-inner">
                            {row.name.split(" ").map((n) => n[0] || "").join("").toUpperCase().slice(0, 2) || "S"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-foreground text-sm truncate">{row.name}</h4>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{row.employeeCode} &middot; {row.role}</p>
                          </div>
                          {gross === 0 ? (
                            <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-xs font-semibold text-amber-850 dark:text-amber-300 ring-1 ring-inset ring-amber-600/10 font-bold border border-amber-200">
                              Unconfigured
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 ring-1 ring-inset ring-emerald-600/10 font-bold border border-emerald-250">
                              Configured
                            </span>
                          )}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-border/60">
                          <div className="space-y-1">
                            <span className="text-muted-foreground font-semibold block">Gross Salary</span>
                            {gross === 0 ? (
                              <span className="font-semibold text-slate-400 block">—</span>
                            ) : (
                              <span className="font-bold text-foreground block">{currencySymbol}{gross.toLocaleString("en-IN")}</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground font-semibold block">Net Take-Home</span>
                            {gross === 0 ? (
                              <span className="font-semibold text-slate-400 block">—</span>
                            ) : (
                              <span className="font-bold text-emerald-650 block">{currencySymbol}{net.toLocaleString("en-IN")}</span>
                            )}
                          </div>
                          <div className="space-y-1 col-span-2">
                            <span className="text-muted-foreground font-semibold block">Department</span>
                            <span className="text-foreground block truncate font-medium">{row.departmentName || "No Department assigned"}</span>
                          </div>
                        </div>

                        {/* Actions buttons */}
                        {isAdminOrHr && (
                          <div className="pt-3 border-t border-border/60">
                            <Button 
                              onClick={() => setEditingSalaryStaff(row)} 
                              variant={gross > 0 ? "outline" : "default"} 
                              size="default" 
                              className="w-full font-semibold h-9 gap-1.5"
                            >
                              {gross > 0 ? <Edit2 size={14} /> : <Plus size={14} />}
                              {gross > 0 ? "Manage Salary Structure" : "Setup Salary Structure"}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* HR Security Deposit Dashboard Tab */}
        {activeTab === "security-deposit" && canViewAll && (
          <div className="space-y-6">
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <Card className="bg-card/70 backdrop-blur-xs border-border/70 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Total Deposit</p>
                    <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5 tabular-nums truncate">{currencySymbol}{secSummary.totalTarget.toLocaleString("en-IN")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/70 backdrop-blur-xs border-border/70 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Banknote className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Collected to Date</p>
                    <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums truncate">{currencySymbol}{secSummary.totalCollected.toLocaleString("en-IN")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/70 backdrop-blur-xs border-border/70 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
                    <AlertCircle className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outstanding Total</p>
                    <p className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums truncate">{currencySymbol}{secSummary.totalOutstanding.toLocaleString("en-IN")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/70 backdrop-blur-xs border-border/70 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                    <ArrowRightLeft className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Refunded</p>
                    <p className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums truncate">{currencySymbol}{secSummary.totalRefunded.toLocaleString("en-IN")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/70 backdrop-blur-xs border-border/70 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                    <DollarSign className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Deposit Held</p>
                    <p className="text-lg sm:text-xl font-bold text-primary mt-0.5 tabular-nums truncate">{currencySymbol}{secSummary.totalNetHeld.toLocaleString("en-IN")}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Staff Security Deposit Table Card */}
            <Card className="border shadow-xs bg-card/90 backdrop-blur-sm overflow-hidden rounded-2xl">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b bg-muted/20 px-4 sm:px-6 gap-3">
                <div>
                  <CardTitle className="text-base font-bold tracking-tight">Staff Security Deposits</CardTitle>
                  <CardDescription className="text-xs">Collected funds include the opening balance and paid payroll deductions. Unpaid deductions remain pending.</CardDescription>
                </div>
                <div className="w-full sm:w-64 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search employee or dept..."
                    value={secSearchQuery}
                    onChange={(e) => setSecSearchQuery(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground border-b uppercase font-semibold">
                      <tr>
                        <th scope="col" className="p-3 whitespace-nowrap">Sl. No.</th>
                        <th
                          scope="col"
                          className="p-3 cursor-pointer select-none hover:bg-muted/70 transition-colors group"
                          onClick={() => handleSecSort("employee")}
                          aria-sort={secSortKey === "employee" ? (secSortDirection === "asc" ? "ascending" : "descending") : "none"}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Employee</span>
                            {renderSortIcon("employee")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="p-3 cursor-pointer select-none hover:bg-muted/70 transition-colors group"
                          onClick={() => handleSecSort("department")}
                          aria-sort={secSortKey === "department" ? (secSortDirection === "asc" ? "ascending" : "descending") : "none"}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Department</span>
                            {renderSortIcon("department")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="p-3 text-right cursor-pointer select-none hover:bg-muted/70 transition-colors group"
                          onClick={() => handleSecSort("targetAmount")}
                          aria-sort={secSortKey === "targetAmount" ? (secSortDirection === "asc" ? "ascending" : "descending") : "none"}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Target Amount</span>
                            {renderSortIcon("targetAmount")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="p-3 text-right cursor-pointer select-none hover:bg-muted/70 transition-colors group"
                          onClick={() => handleSecSort("monthlyDeduction")}
                          aria-sort={secSortKey === "monthlyDeduction" ? (secSortDirection === "asc" ? "ascending" : "descending") : "none"}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Monthly Rate</span>
                            {renderSortIcon("monthlyDeduction")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="p-3 text-right cursor-pointer select-none hover:bg-muted/70 transition-colors group"
                          onClick={() => handleSecSort("totalDeducted")}
                          aria-sort={secSortKey === "totalDeducted" ? (secSortDirection === "asc" ? "ascending" : "descending") : "none"}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Collected / Pending</span>
                            {renderSortIcon("totalDeducted")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="p-3 text-right cursor-pointer select-none hover:bg-muted/70 transition-colors group"
                          onClick={() => handleSecSort("totalRefunded")}
                          aria-sort={secSortKey === "totalRefunded" ? (secSortDirection === "asc" ? "ascending" : "descending") : "none"}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Refunded</span>
                            {renderSortIcon("totalRefunded")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="p-3 text-right cursor-pointer select-none hover:bg-muted/70 transition-colors group"
                          onClick={() => handleSecSort("netHeld")}
                          aria-sort={secSortKey === "netHeld" ? (secSortDirection === "asc" ? "ascending" : "descending") : "none"}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Net Held</span>
                            {renderSortIcon("netHeld")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="p-3 text-center whitespace-nowrap cursor-pointer select-none hover:bg-muted/70 transition-colors group"
                          onClick={() => handleSecSort("status")}
                          aria-sort={secSortKey === "status" ? (secSortDirection === "asc" ? "ascending" : "descending") : "none"}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Status</span>
                            {renderSortIcon("status")}
                          </div>
                        </th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {securityDepositsQuery.isLoading ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-muted-foreground animate-pulse">
                            Loading security deposits data...
                          </td>
                        </tr>
                      ) : securityDepositsQuery.isError ? (
                        <tr><td colSpan={10} className="p-8 text-center text-destructive">Unable to load security deposits. Please refresh and try again.</td></tr>
                      ) : filteredSecList.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-muted-foreground">
                            No security deposit records found.
                          </td>
                        </tr>
                      ) : (
                        filteredSecList.map((item, index) => {
                          const pct = item.targetAmount > 0 ? Math.min(100, Math.round((item.totalDeducted / item.targetAmount) * 100)) : 0;
                          return (
                            <tr key={item.staffId} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3 tabular-nums text-muted-foreground">{index + 1}</td>
                              <td className="p-3 font-medium">
                                <div className="text-foreground font-semibold">{item.name}</div>
                                <div className="text-muted-foreground text-[11px]">{item.employeeCode} &middot; {item.role}</div>
                              </td>
                              <td className="p-3 text-muted-foreground">{item.departmentName || "General"}</td>
                              <td className="p-3 text-right font-semibold">{currencySymbol}{item.targetAmount.toLocaleString("en-IN")}</td>
                              <td className="p-3 text-right">
                                <div className="text-muted-foreground">{currencySymbol}{item.monthlyDeduction.toLocaleString("en-IN")}/mo</div>
                                {item.monthlyDeduction > 0 && item.targetAmount === 0 && (
                                  <div className="text-[10px] text-amber-600">No target set; deductions off</div>
                                )}
                                {item.securityDepositStartMonth && (
                                  <div className="text-[10px] text-primary font-medium">Start: {item.securityDepositStartMonth}</div>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <span className="font-semibold text-emerald-600">{currencySymbol}{item.totalDeducted.toLocaleString("en-IN")}</span>
                                <div className="text-[10px] text-muted-foreground">Opening: {currencySymbol}{item.openingBalance.toLocaleString("en-IN")}</div>
                                <div className="text-[10px] text-amber-600">Pending: {currencySymbol}{item.pendingDeduction.toLocaleString("en-IN")}</div>
                                {item.targetAmount > 0 && (
                                  <div className="w-full bg-muted h-1 rounded-full mt-1 overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-right text-amber-600 font-medium">{currencySymbol}{item.totalRefunded.toLocaleString("en-IN")}</td>
                              <td className="p-3 text-right font-bold text-foreground">{currencySymbol}{item.netHeld.toLocaleString("en-IN")}</td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <span className={cn("inline-block whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-semibold border", {
                                  "text-gray-700 border-gray-300 dark:text-gray-300 dark:border-gray-700": item.status === "Not Started",
                                  "text-blue-700 border-blue-300 dark:text-blue-400 dark:border-blue-800": item.status === "In Progress",
                                  "text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-800": item.status === "Fully Collected",
                                  "text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-800": item.status === "Partially Refunded",
                                  "text-purple-700 border-purple-300 dark:text-purple-400 dark:border-purple-800": item.status === "Fully Refunded",
                                })}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                {isAdminOrHr ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="outline"
                                      size="default"
                                      className="h-7 text-xs px-2 gap-1 cursor-pointer"
                                      onClick={() => {
                                        setSecDepTargetStaff(item);
                                        setSecTargetInput(item.targetAmount);
                                        setSecMonthlyInput(item.monthlyDeduction);
                                        setSecStartMonthInput(item.securityDepositStartMonth ?? "");
                                        setSecOpeningInput(item.openingBalance);
                                      }}
                                    >
                                      <Edit2 size={12} /> Set Target
                                    </Button>

                                    <Button
                                      variant="outline"
                                      size="default"
                                      className="h-7 text-xs px-2 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                      disabled={item.netHeld <= 0}
                                      onClick={() => {
                                        setSecDepRefundStaff(item);
                                        setRefundAmount(item.netHeld);
                                        setRefundDate(new Date().toISOString().split("T")[0]);
                                        setRefundNotes("");
                                      }}
                                    >
                                      <ArrowRightLeft size={12} /> Refund
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {filteredSecList.length > 0 && (
                      <tfoot className="border-t-2 border-border/80 bg-muted/60 dark:bg-muted/40 font-semibold text-foreground">
                        <tr>
                          <td className="p-3"></td>
                          <td className="p-3">
                            <span className="font-bold">Total</span>
                            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                              ({filteredSecList.length} staff)
                            </span>
                          </td>
                          <td className="p-3"></td>
                          <td className="p-3 text-right tabular-nums whitespace-nowrap font-bold text-foreground">
                            {currencySymbol}
                            {filteredSecList.reduce((sum, i) => sum + i.targetAmount, 0).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-right tabular-nums whitespace-nowrap font-bold text-foreground">
                            {currencySymbol}
                            {filteredSecList.reduce((sum, i) => sum + i.monthlyDeduction, 0).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-right tabular-nums whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                            {currencySymbol}
                            {filteredSecList.reduce((sum, i) => sum + i.totalDeducted, 0).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-right tabular-nums whitespace-nowrap font-bold text-amber-600 dark:text-amber-400">
                            {currencySymbol}
                            {filteredSecList.reduce((sum, i) => sum + i.totalRefunded, 0).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-right tabular-nums whitespace-nowrap font-bold text-primary">
                            {currencySymbol}
                            {filteredSecList.reduce((sum, i) => sum + i.netHeld, 0).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3"></td>
                          <td className="p-3"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Generate Payroll Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-background rounded-xl border border-border shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-lg text-foreground">Generate Monthly Payroll</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {generationResult && (
              <div className={`p-3 rounded-lg text-xs font-medium ${generationResult.success ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-destructive/15 text-destructive"}`}>
                {generationResult.message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Target Month</label>
                <MonthPicker value={selectedMonth} onChange={(val) => setSelectedMonth(val)} className="w-full" />
              </div>

              <div>
                <Select
                  label="Filter by Department (Optional)"
                  value={selectedDeptId}
                  onChange={(e) => {
                    setSelectedDeptId(e.target.value);
                    setSelectedStaffId("");
                  }}
                  options={[
                    ["", "All Departments"],
                    ...(departmentsQuery.data ?? []).map((d) => [String(d.id), d.name] as [string, string]),
                  ]}
                />
              </div>

              <div>
                <Autocomplete
                  label="Filter by Staff Member (Optional)"
                  options={(staffQuery.data ?? [])
                    .filter((s) => !selectedDeptId || String(s.departmentId) === selectedDeptId)
                    .map((s) => [String(s.staffId), `${s.name} (${s.employeeCode})`] as [string, string])}
                  value={selectedStaffId}
                  onChange={(val) => setSelectedStaffId(val)}
                  placeholder="Search staff by name or code..."
                />
              </div>

              <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg">
                Process salary components and generate payslips for active staff. Skill allowances, statutory deductions, TDS, and security deposits will be auto-calculated.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleGeneratePayroll} disabled={generating} className="gap-2">
                  <RefreshCw size={14} className={generating ? "animate-spin" : ""} />
                  {generating ? "Generating..." : "Run Generator"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Salary Structure Modal */}
      {editingSalaryStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200" onClick={() => setEditingSalaryStaff(null)}>
          <div className="bg-background rounded-xl border border-border shadow-xl max-w-4xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 p-4 sm:px-6 border-b flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2">
                <Receipt className="text-primary h-5 w-5" />
                <div>
                  <h3 className="font-semibold text-base sm:text-lg text-foreground">Edit Salary Structure</h3>
                  <p className="text-xs text-muted-foreground break-words">{editingSalaryStaff.name} &middot; {editingSalaryStaff.employeeCode}</p>
                </div>
              </div>
              <button onClick={() => setEditingSalaryStaff(null)} aria-label="Close salary structure" className="shrink-0 text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5">
              {/* Auto Calculate Helper */}
              <div className="bg-muted/45 p-4 rounded-xl border border-dashed grid gap-4 md:grid-cols-3 md:items-end">
                <div className="md:col-span-1">
                  <Field label="Target Gross Salary" type="number" value={targetGross || ""} onChange={(e) => setTargetGross(Number(e.target.value))} placeholder="e.g. 75000" />
                </div>
                <div className="flex items-center gap-2 h-10">
                  <input
                    type="checkbox"
                    id="deductions-toggle"
                    checked={allowDeductions}
                    onChange={(e) => setAllowDeductions(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="deductions-toggle" className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                    Calculate Deductions
                  </label>
                </div>
                <div className="text-right">
                  <Button type="button" onClick={handleAutoCalculate} variant="outline" className="w-full md:w-auto cursor-pointer font-semibold">
                    Auto-Calculate
                  </Button>
                </div>
              </div>

              {/* Select and Apply Template */}
              {templates.length > 0 && (
                <div className="bg-muted/40 p-4 rounded-xl border border-border">
                  <Select
                    label="Apply Salary Template"
                    value=""
                    onChange={(e) => {
                      const selectedTplId = e.target.value;
                      if (!selectedTplId) return;
                      const tpl = templates.find(t => t.id === selectedTplId);
                      if (tpl) {
                        setBasic(Number(tpl.basicSalary));
                        setHra(Number(tpl.hra));
                        setConveyance(Number(tpl.conveyance));
                        setSkillAllowance(Number(tpl.skillAllowance ?? 0));
                        setSpecial(Number(tpl.special));
                        setEpf(Number(tpl.epf));
                        setEsi(Number(tpl.esi));
                        setPt(Number(tpl.professionalTax));
                        setDeductTds(Boolean(tpl.deductTds ?? false));
                        setTdsPercent(Number(tpl.tdsPercent ?? 10));
                        setTds(Number(tpl.tds ?? 0));
                        setSecurityDepositTotal(Number(tpl.securityDepositTotal ?? 0));
                        setSecurityDeposit(Number(tpl.securityDeposit ?? 0));
                        setOther(Number(tpl.otherDeductions));
                        setLateAttendance(Number(tpl.lateAttendance ?? 0));
                        setTargetGross(Number(tpl.basicSalary) + Number(tpl.hra) + Number(tpl.conveyance) + Number(tpl.skillAllowance ?? 0) + Number(tpl.special));
                      }
                    }}
                    options={[
                      ["", "Select a template to apply..."] as [string, string],
                      ...templates.map(t => [t.id, t.name] as [string, string])
                    ]}
                  />
                </div>
              )}
              
              <form id="salary-structure-form" onSubmit={handleSaveSalary} className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2 md:gap-6">
                  {/* Earnings */}
                  <div className="min-w-0 space-y-4">
                    <h4 className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 border-b pb-1">Earnings (Allowances)</h4>
                    <Field label="Basic Salary" type="number" value={basic} onChange={(e) => setBasic(Number(e.target.value))} />
                    <Field label="House Rent Allowance (HRA)" type="number" value={hra} onChange={(e) => setHra(Number(e.target.value))} />
                    <Field label="Conveyance Allowance" type="number" value={conveyance} onChange={(e) => setConveyance(Number(e.target.value))} />
                    <Field label="Skill Allowance" type="number" value={skillAllowance} onChange={(e) => setSkillAllowance(Number(e.target.value))} />
                    <Field label="Special Allowance" type="number" value={special} onChange={(e) => setSpecial(Number(e.target.value))} />
                  </div>

                  {/* Deductions */}
                  <div className="min-w-0 space-y-4">
                    <h4 className="font-semibold text-sm text-rose-600 dark:text-rose-400 border-b pb-1">Deductions (Monthly)</h4>
                    <Field label="EPF (Provident Fund)" type="number" value={epf} onChange={(e) => setEpf(Number(e.target.value))} />
                    <Field label="ESI (State Insurance)" type="number" value={esi} onChange={(e) => setEsi(Number(e.target.value))} />
                    <Field label="Professional Tax" type="number" value={pt} onChange={(e) => setPt(Number(e.target.value))} />
                    
                    {/* TDS Toggle & Inputs */}
                    <div className="border border-border/80 p-3 rounded-lg bg-muted/20 space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="deduct-tds-staff"
                          checked={deductTds}
                          onChange={(e) => {
                            setDeductTds(e.target.checked);
                            if (e.target.checked && tds === 0) {
                              const grossTemp = basic + hra + conveyance + skillAllowance + special;
                              setTds(Math.round(((tdsPercent || 10) / 100) * grossTemp));
                            }
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                        <label htmlFor="deduct-tds-staff" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                          Deduct Tax at Source (TDS)
                        </label>
                      </div>
                      {deductTds && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Field
                            label="TDS Target %"
                            type="number"
                            value={tdsPercent}
                            onChange={(e) => {
                              const pct = Number(e.target.value);
                              setTdsPercent(pct);
                              const grossTemp = basic + hra + conveyance + skillAllowance + special;
                              setTds(Math.round((pct / 100) * grossTemp));
                            }}
                          />
                          <Field
                            label="TDS Amount (₹)"
                            type="number"
                            value={tds}
                            onChange={(e) => setTds(Number(e.target.value))}
                          />
                        </div>
                      )}
                    </div>

                    <Field label="Other Deductions" type="number" value={other} onChange={(e) => setOther(Number(e.target.value))} />
                    <Field label="Late Attendance" type="number" value={lateAttendance} onChange={(e) => setLateAttendance(Number(e.target.value))} />
                  </div>
                </div>

                {/* Security Deposit Setup */}
                <div className="border border-border/80 p-3 sm:p-4 rounded-lg bg-muted/20 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Security Deposit Setup</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
                    <Field
                      label="Target Total (₹)"
                      type="number"
                      value={securityDepositTotal}
                      onChange={(e) => setSecurityDepositTotal(e.target.value)}
                      placeholder="e.g. 10000"
                    />
                    <Field
                      label="Monthly Deduction (₹)"
                      type="number"
                      value={securityDeposit}
                      onChange={(e) => setSecurityDeposit(e.target.value)}
                      placeholder="e.g. 2000"
                    />
                    <Field label="First Deduction Month" className="min-w-0 sm:col-span-2 lg:col-span-1">
                      <MonthPicker
                        value={securityDepositStartMonth}
                        onChange={setSecurityDepositStartMonth}
                        clearable
                        className="h-10 w-full min-w-0"
                      />
                    </Field>
                  </div>
                  <p className="text-xs text-muted-foreground">Start month is the first deduction month. Earlier collections must be recorded explicitly using Set Target in Security Deposit Dashboard.</p>
                </div>

                {/* Calculation Summary */}
                <div className="border-t pt-4 bg-muted/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-3">Salary Summary</h4>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Gross Salary</p>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {currencySymbol}{(Number(basic) + Number(hra) + Number(conveyance) + Number(skillAllowance) + Number(special)).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="border-y py-3 sm:border-y-0 sm:border-x sm:py-0 sm:px-3">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Total Deductions</p>
                      <p className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        {currencySymbol}{(Number(epf) + Number(esi) + Number(pt) + (deductTds ? Number(tds) : 0) + Number(securityDeposit) + Number(other) + Number(lateAttendance)).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-primary uppercase font-semibold">Net Take-Home</p>
                      <p className="text-base font-extrabold text-primary mt-0.5">
                        {currencySymbol}{Math.max(0, (Number(basic) + Number(hra) + Number(conveyance) + Number(skillAllowance) + Number(special)) - (Number(epf) + Number(esi) + Number(pt) + (deductTds ? Number(tds) : 0) + Number(securityDeposit) + Number(other) + Number(lateAttendance))).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>

              </form>
            </div>
            <div className="shrink-0 flex flex-col-reverse gap-2 border-t bg-background p-4 sm:flex-row sm:justify-end sm:px-6">
              <Button type="button" variant="outline" onClick={() => setEditingSalaryStaff(null)}>Cancel</Button>
              <Button type="submit" form="salary-structure-form">Save Salary Structure</Button>
            </div>
          </div>
        </div>
      )}

      {/* Set Security Deposit Target Modal */}
      {secDepTargetStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-background rounded-xl border border-border shadow-xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-semibold text-lg text-foreground">Set Security Deposit Rules</h3>
                <p className="text-xs text-muted-foreground">{secDepTargetStaff.name} ({secDepTargetStaff.employeeCode})</p>
              </div>
              <button onClick={() => setSecDepTargetStaff(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSecTarget} className="space-y-4">
              <Field
                label="Target Total Security Deposit (₹)"
                type="number"
                min="0"
                step="0.01"
                value={secTargetInput}
                onChange={(e) => setSecTargetInput(e.target.value)}
                placeholder="e.g. 10000"
                required
              />
              <Field
                label="Monthly Deduction Amount (₹)"
                type="number"
                min="0"
                step="0.01"
                value={secMonthlyInput}
                onChange={(e) => setSecMonthlyInput(e.target.value)}
                placeholder="e.g. 2000"
                required
              />
              <Field label="First Deduction Month">
                <MonthPicker
                  value={secStartMonthInput}
                  onChange={setSecStartMonthInput}
                  clearable
                  className="w-full"
                />
              </Field>
              <Field
                label="Opening Balance Already Collected (₹)"
                type="number" min="0" step="0.01"
                value={secOpeningInput}
                onChange={(e) => setSecOpeningInput(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg">
                Enter earlier collections missing from paid payslips as the opening balance. Collected and pending deductions together are capped at {currencySymbol}{Number(secTargetInput).toLocaleString("en-IN")} when generating payroll.
              </p>
              <p className="text-xs text-muted-foreground">Existing payslips are unchanged. Regenerate eligible drafts to apply new rules.</p>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setSecDepTargetStaff(null)}>Cancel</Button>
                <Button type="submit" disabled={submittingSecModal}>
                  {submittingSecModal ? "Saving..." : "Save Target Rules"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Security Deposit Refund Modal */}
      {secDepRefundStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-background rounded-xl border border-border shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-semibold text-lg text-foreground">Record Deposit Refund</h3>
                <p className="text-xs text-muted-foreground">{secDepRefundStaff.name} ({secDepRefundStaff.employeeCode})</p>
              </div>
              <button onClick={() => setSecDepRefundStaff(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRefund} className="space-y-4">
              <div className="bg-muted/40 p-3 rounded-lg space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Deducted:</span>
                  <span className="font-semibold text-foreground">{currencySymbol}{secDepRefundStaff.totalDeducted.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previously Refunded:</span>
                  <span className="font-semibold text-amber-600">{currencySymbol}{secDepRefundStaff.totalRefunded.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>Available Net Held:</span>
                  <span className="text-primary">{currencySymbol}{secDepRefundStaff.netHeld.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <Field
                label="Refund Amount (₹)"
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Enter refund amount"
                required
              />

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Refund Date</label>
                <input
                  type="date"
                  value={refundDate}
                  onChange={(e) => setRefundDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Reason / HR Notes</label>
                <textarea
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="e.g. Employee proper exit refund approved by HR Director"
                  className="w-full text-xs p-2.5 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-20"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setSecDepRefundStaff(null)}>Cancel</Button>
                <Button type="submit" disabled={submittingSecModal || Number(refundAmount) <= 0 || Number(refundAmount) > secDepRefundStaff.netHeld || !refundNotes.trim()}>
                  {submittingSecModal ? "Processing..." : "Confirm & Process Refund"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
