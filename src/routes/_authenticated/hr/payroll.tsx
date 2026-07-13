import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Receipt, RefreshCw, Eye, AlertCircle, FileDown, Plus, X, Edit2, DollarSign } from "lucide-react";
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
import { Autocomplete } from "../../../ui/autocomplete";
import { cn } from "@/utils/cn";

export const Route = createFileRoute("/_authenticated/hr/payroll")({
  component: PayrollPage,
});

interface PayslipRow extends Record<string, unknown> {
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
}

function PayrollPage() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const isAdminOrHr = session.data?.user?.role === "admin" || session.data?.user?.role === "hr";

  const { currencySymbol } = useSystemSettings();
  const [activeTab, setActiveTab] = React.useState<"payslips" | "salaries">("payslips");
  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [generating, setGenerating] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [generationResult, setGenerationResult] = React.useState<{ success: boolean; message: string } | null>(null);
  const [showSuperseded, setShowSuperseded] = React.useState(false);
  const [filterMonth, setFilterMonth] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);

  const [selectedDeptId, setSelectedDeptId] = React.useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>("");

  const payrollSettings = usePayrollSettings();

  // Edit Salary Structure state
  const [editingSalaryStaff, setEditingSalaryStaff] = React.useState<StaffRow | null>(null);
  const [basic, setBasic] = React.useState(0);
  const [hra, setHra] = React.useState(0);
  const [conveyance, setConveyance] = React.useState(0);
  const [medical, setMedical] = React.useState(0);
  const [special, setSpecial] = React.useState(0);
  const [epf, setEpf] = React.useState(0);
  const [esi, setEsi] = React.useState(0);
  const [pt, setPt] = React.useState(0);
  const [other, setOther] = React.useState(0);
  const [lateAttendance, setLateAttendance] = React.useState(0);

  const [targetGross, setTargetGross] = React.useState(0);
  const [allowDeductions, setAllowDeductions] = React.useState(true);

  const handleAutoCalculate = () => {
    const basicPct = payrollSettings.basicPct ?? 50;
    const hraPct = payrollSettings.hraPct ?? 30;
    const conveyancePct = payrollSettings.conveyancePct ?? 10;
    const medicalPct = payrollSettings.medicalPct ?? 5;
    const specialPct = payrollSettings.specialPct ?? 5;

    const computedBasic = Math.round((basicPct / 100) * targetGross);
    const computedHra = Math.round((hraPct / 100) * targetGross);
    const computedConveyance = Math.round((conveyancePct / 100) * targetGross);
    const computedMedical = Math.round((medicalPct / 100) * targetGross);
    const computedSpecial = Math.round((specialPct / 100) * targetGross);

    setBasic(computedBasic);
    setHra(computedHra);
    setConveyance(computedConveyance);
    setMedical(computedMedical);
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
    } else {
      setEpf(0);
      setEsi(0);
      setPt(0);
    }
  };

  const payslipsQuery = useRpcQuery<PayslipRow[]>(["payslips"], () =>
    client.hr.payroll.payslips.$get()
  );

  const departmentsQuery = useRpcQuery<{ id: number; name: string }[]>(["departments"], () =>
    client.departments.$get()
  );

  const staffQuery = useRpcQuery<StaffRow[]>(["staff"], () =>
    client.hr.staff.$get()
  );

  const templates = useSalaryTemplates();

  React.useEffect(() => {
    if (editingSalaryStaff) {
      const bVal = Number(editingSalaryStaff.basicSalary ?? 0);
      const hVal = Number(editingSalaryStaff.hra ?? 0);
      const cVal = Number(editingSalaryStaff.conveyance ?? 0);
      const mVal = Number(editingSalaryStaff.medical ?? 0);
      const sVal = Number(editingSalaryStaff.special ?? 0);
      setBasic(bVal);
      setHra(hVal);
      setConveyance(cVal);
      setMedical(mVal);
      setSpecial(sVal);
      setEpf(Number(editingSalaryStaff.epf ?? 0));
      setEsi(Number(editingSalaryStaff.esi ?? 0));
      setPt(Number(editingSalaryStaff.professionalTax ?? 0));
      setOther(Number(editingSalaryStaff.otherDeductions ?? 0));
      setLateAttendance(Number(editingSalaryStaff.lateAttendance ?? 0));

      setTargetGross(bVal + hVal + cVal + mVal + sVal);
      setAllowDeductions(true);
    }
  }, [editingSalaryStaff]);

  const filteredStaff = React.useMemo(() => {
    const allStaff = staffQuery.data ?? [];
    if (!selectedDeptId) return allStaff;
    return allStaff.filter(s => s.departmentId === Number(selectedDeptId));
  }, [staffQuery.data, selectedDeptId]);

  const prevDeptId = React.useRef(selectedDeptId);
  React.useEffect(() => {
    if (prevDeptId.current !== selectedDeptId) {
      setSelectedStaffId("");
      prevDeptId.current = selectedDeptId;
    }
  }, [selectedDeptId]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGenerationResult(null);
    try {
      const res = await client.hr.payroll.generate.$post({
        json: {
          month: selectedMonth,
          staffId: selectedStaffId ? Number(selectedStaffId) : null,
          departmentId: selectedDeptId ? Number(selectedDeptId) : null
        }
      });
      const data = (await res.json()) as any;
      if (res.ok) {
        let msg = `Successfully generated ${data.generatedCount} payslips for ${selectedMonth}.`;
        if (data.skippedEmployees && data.skippedEmployees.length > 0) {
          msg += ` Warning: Skipped ${data.skippedEmployees.length} employees due to pending leaves (${data.skippedEmployees.join(', ')}).`;
        }
        setGenerationResult({ success: true, message: msg });
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
      const gross = basic + hra + conveyance + medical + special;
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
        medical: Number(medical),
        special: Number(special),
        epf: Number(epf),
        esi: Number(esi),
        professionalTax: Number(pt),
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
      } else {
        const err = await res.json().catch(() => null) as any;
        alert("Failed to save: " + (err?.error || `HTTP error ${res.status}`));
      }
    } catch (err) {
      alert("Error saving: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const filteredPayslips = React.useMemo(() => {
    const data = payslipsQuery.data ?? [];
    const byStatus = showSuperseded ? data : data.filter((p) => p.status === "Active");
    if (!filterMonth) return byStatus;
    return byStatus.filter((p) => p.month === filterMonth);
  }, [payslipsQuery.data, showSuperseded, filterMonth]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      exportPayrollToExcel({ payslips: filteredPayslips, filterMonth });
    } catch (err) {
      console.error("Excel export failed:", err);
      alert("Failed to export Excel. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (session.isPending) {
    return (
      <ModuleLayout title="Payroll Management" description="Loading...">
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </ModuleLayout>
    );
  }

  const columns = [
    {
      id: "employeeCode",
      label: "Code",
      render: (row: PayslipRow) => <span>{row.employeeCode}</span>,
      sortKey: "employeeCode" as keyof PayslipRow,
    },
    {
      id: "name",
      label: "Name",
      render: (row: PayslipRow) => <span className="font-medium">{row.name}</span>,
      sortKey: "name" as keyof PayslipRow,
    },
    {
      id: "month",
      label: "Month",
      render: (row: PayslipRow) => <span>{row.month}</span>,
      sortKey: "month" as keyof PayslipRow,
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      id: "netSalary",
      label: "Net Salary",
      render: (row: PayslipRow) => (
        <span className="font-medium text-emerald-600">
          {currencySymbol}{row.netSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
      sortKey: "netSalary" as keyof PayslipRow,
    },
    {
      id: "leaveDaysTaken",
      label: "Leave Days",
      render: (row: PayslipRow) => (
        <span className={row.leaveDaysTaken > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
          {row.leaveDaysTaken}
        </span>
      ),
      sortKey: "leaveDaysTaken" as keyof PayslipRow,
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      id: "version",
      label: "Ver",
      render: (row: PayslipRow) => <span>v{row.version}</span>,
      sortKey: "version" as keyof PayslipRow,
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      id: "status",
      label: "Status",
      render: (row: PayslipRow) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          row.status === "Active"
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
            : "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/15"
        }`}>
          {row.status}
        </span>
      ),
      sortKey: "status" as keyof PayslipRow,
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      id: "actions",
      label: "Actions",
      render: (row: PayslipRow) => (
        <Link to="/hr/view-payslip" search={{ payslipId: row.id }}>
          <Button variant="outline" size="default" className="h-8 gap-1">
            <Eye size={14} /> View
          </Button>
        </Link>
      ),
    },
  ];

  const salaryColumns = [
    {
      id: "employeeCode",
      label: "Code",
      render: (row: StaffRow) => <span>{row.employeeCode}</span>,
      sortKey: "employeeCode" as keyof StaffRow,
    },
    {
      id: "name",
      label: "Name",
      render: (row: StaffRow) => <span className="font-medium">{row.name}</span>,
      sortKey: "name" as keyof StaffRow,
    },
    {
      id: "role",
      label: "Role/Dept",
      render: (row: StaffRow) => <span className="text-muted-foreground text-xs">{row.role} &middot; {row.departmentName || "No Dept"}</span>,
      sortKey: "role" as keyof StaffRow,
    },
    {
      id: "grossSalary",
      label: "Gross Salary",
      render: (row: StaffRow) => {
        const b = Number(row.basicSalary ?? 0);
        const h = Number(row.hra ?? 0);
        const c = Number(row.conveyance ?? 0);
        const m = Number(row.medical ?? 0);
        const s = Number(row.special ?? 0);
        const gross = b + h + c + m + s;
        if (gross === 0) {
          return (
            <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-600/20">
              Not Configured
            </span>
          );
        }
        return <span className="font-semibold text-foreground">{currencySymbol}{gross.toLocaleString("en-IN")}</span>;
      }
    },
    {
      id: "netSalary",
      label: "Net Take-Home",
      render: (row: StaffRow) => {
        const b = Number(row.basicSalary ?? 0);
        const h = Number(row.hra ?? 0);
        const c = Number(row.conveyance ?? 0);
        const m = Number(row.medical ?? 0);
        const s = Number(row.special ?? 0);
        const ep = Number(row.epf ?? 0);
        const es = Number(row.esi ?? 0);
        const p = Number(row.professionalTax ?? 0);
        const od = Number(row.otherDeductions ?? 0);
        const la = Number(row.lateAttendance ?? 0);
        const gross = b + h + c + m + s;
        if (gross === 0) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const net = Math.max(0, gross - (ep + es + p + od + la));
        return <span className="font-semibold text-emerald-600">{currencySymbol}{net.toLocaleString("en-IN")}</span>;
      }
    },
    {
      id: "actions",
      label: "Actions",
      render: (row: StaffRow) => {
        const b = Number(row.basicSalary ?? 0);
        const h = Number(row.hra ?? 0);
        const c = Number(row.conveyance ?? 0);
        const m = Number(row.medical ?? 0);
        const s = Number(row.special ?? 0);
        const hasSalary = (b + h + c + m + s) > 0;
        return (
          <Button onClick={() => setEditingSalaryStaff(row)} variant={hasSalary ? "outline" : "default"} size="default" className="h-8 gap-1 cursor-pointer">
            {hasSalary ? <Edit2 size={14} /> : <Plus size={14} />}
            {hasSalary ? "Manage Salary" : "Setup Salary"}
          </Button>
        );
      },
    }
  ];

  return (
    <ModuleLayout
      title="Payroll & Payslips"
      description="Generate monthly payroll, access generated payslips, and manage employee salary structures."
      action={
        isAdminOrHr && activeTab === "payslips" ? (
          <Button onClick={() => { setGenerationResult(null); setShowForm(true); }} className="gap-2">
            <Plus size={16} /> Generate Payroll
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => setActiveTab("payslips")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all -mb-px cursor-pointer ${
              activeTab === "payslips"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Payslip Register
          </button>
          {isAdminOrHr && (
            <button
              onClick={() => setActiveTab("salaries")}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all -mb-px cursor-pointer ${
                activeTab === "salaries"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Salary Structures
            </button>
          )}
        </div>

        {/* Payslip Register Tab */}
        {activeTab === "payslips" && (
          <Card className="border-0 shadow-none md:border md:shadow-sm bg-transparent md:bg-white/70 dark:md:bg-slate-900/40 backdrop-blur">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 gap-4 border-b px-0 md:px-6">
              <div>
                <CardTitle className="text-base">Payslip Register</CardTitle>
                <CardDescription>View, print, and search generated payslips.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <MonthPicker
                  value={filterMonth}
                  onChange={setFilterMonth}
                  placeholder="All months"
                  clearable
                />
                {isAdminOrHr && (
                  <Button
                    variant="outline"
                    size="default"
                    className="gap-1.5 h-8 text-xs"
                    onClick={handleExportExcel}
                    disabled={exporting || filteredPayslips.length === 0}
                  >
                    <FileDown size={14} className={exporting ? "animate-bounce" : ""} />
                    {exporting ? "Exporting..." : "Export Excel"}
                  </Button>
                )}
                {isAdminOrHr && (
                  <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSuperseded}
                      onChange={(e) => setShowSuperseded(e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Show superseded</span>
                  </label>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                rows={filteredPayslips}
                columns={columns as any}
                enablePagination
                enableSorting
                enableFiltering
                filterPlaceholder="Search payslips..."
                isLoading={payslipsQuery.isLoading}
                renderMobileCard={(row: PayslipRow) => (
                  <Card className="border border-border shadow-xs hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 space-y-3.5">
                      {/* Header: Name, Code & Month */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold text-xs border shadow-inner">
                          {row.name.split(" ").map((n) => n[0] || "").join("").toUpperCase().slice(0, 2) || "P"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-foreground text-sm truncate">{row.name}</h4>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{row.employeeCode} &middot; {row.month}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${
                          row.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-250 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30 font-bold"
                            : "bg-slate-50 text-slate-600 border-slate-200 ring-1 ring-inset ring-slate-500/10 dark:bg-slate-850 dark:text-slate-400 dark:border-slate-800 font-semibold"
                        }`}>
                          {row.status}
                        </span>
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
        )}

        {/* Salary Structures Tab */}
        {activeTab === "salaries" && isAdminOrHr && (
          <Card className="border-0 shadow-none md:border md:shadow-sm bg-transparent md:bg-white/70 dark:md:bg-slate-900/40 backdrop-blur">
            <CardHeader className="border-b pb-4 px-0 md:px-6">
              <CardTitle className="text-base">Employee Salary Structures</CardTitle>
              <CardDescription>Configure monthly earnings allowances and statutory deductions for staff.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                rows={staffQuery.data ?? []}
                columns={salaryColumns as any}
                enablePagination
                enableSorting
                enableFiltering
                filterPlaceholder="Search staff salaries..."
                isLoading={staffQuery.isLoading}
                renderMobileCard={(row: StaffRow) => {
                  const b = row.basicSalary ?? 0;
                  const h = row.hra ?? 0;
                  const c = row.conveyance ?? 0;
                  const m = row.medical ?? 0;
                  const s = row.special ?? 0;
                  const gross = b + h + c + m + s;

                  const ep = row.epf ?? 0;
                  const es = row.esi ?? 0;
                  const p = row.professionalTax ?? 0;
                  const od = row.otherDeductions ?? 0;
                  const la = row.lateAttendance ?? 0;
                  const net = Math.max(0, gross - (ep + es + p + od + la));

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
                      </CardContent>
                    </Card>
                  );
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generate Payroll Left-side Panel */}
      {showForm && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setShowForm(false)}
          />
          <div 
            className="fixed inset-y-0 left-0 z-50 w-full sm:w-96 bg-background border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-300"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="text-primary h-5 w-5" />
                <h3 className="font-semibold text-lg text-foreground">Run Monthly Payroll</h3>
              </div>
              <button 
                onClick={() => setShowForm(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                type="button"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm text-muted-foreground mb-6">
                Process salary components and generate payslips for all active staff. Approved leaves are automatically factored in.
              </p>
              <form onSubmit={handleGenerate} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Select Month</label>
                  <MonthPicker
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    placeholder="Pick a month"
                    className="w-full"
                  />
                </div>
                <Autocomplete
                  label="Department (Optional)"
                  value={selectedDeptId}
                  onChange={setSelectedDeptId}
                  options={(departmentsQuery.data ?? []).map(d => [String(d.id), d.name])}
                  placeholder="Select department..."
                />
                <Autocomplete
                  label="Employee (Optional)"
                  value={selectedStaffId}
                  onChange={setSelectedStaffId}
                  options={filteredStaff.map(s => [String(s.staffId), `${s.name} (${s.employeeCode})`])}
                  placeholder="Select employee..."
                />
                <Button type="submit" className="w-full mt-4" disabled={generating}>
                  {generating ? (
                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                  ) : "Generate Payroll"}
                </Button>
                {generationResult && (
                  <div className={`mt-4 p-3 rounded-lg border text-xs flex gap-2 items-start ${
                    generationResult.success
                       ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                       : "bg-red-50 border-red-200 text-red-800"
                  }`}>
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{generationResult.message}</span>
                  </div>
                )}
              </form>
            </div>
          </div>
        </>
      )}

      {/* Edit Salary Structure Modal */}
      {editingSalaryStaff && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setEditingSalaryStaff(null)}
        >
          <div 
            className="relative bg-background rounded-xl border border-border shadow-xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="text-primary h-5 w-5" />
                <h3 className="font-semibold text-lg text-foreground">Manage Salary Structure</h3>
              </div>
              <button 
                onClick={() => setEditingSalaryStaff(null)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                type="button"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
              <div>
                <p className="text-sm font-semibold text-foreground">{editingSalaryStaff.name} ({editingSalaryStaff.employeeCode})</p>
                <p className="text-xs text-muted-foreground">{editingSalaryStaff.role} &middot; {editingSalaryStaff.departmentName || "No Department assigned"}</p>
              </div>

              {/* Auto Calculation Helper */}
              <div className="bg-muted/40 p-4 rounded-xl border border-dashed border-border grid gap-4 md:grid-cols-3 md:items-end animate-in fade-in duration-300">
                <div className="md:col-span-1">
                  <Field 
                    label="Target Gross Salary" 
                    type="number" 
                    value={targetGross || ""} 
                    onChange={(e) => setTargetGross(Number(e.target.value))} 
                    placeholder="e.g. 50000"
                  />
                </div>
                <div className="flex items-center gap-2 h-10">
                  <input
                    type="checkbox"
                    id="calc-deductions-toggle"
                    checked={allowDeductions}
                    onChange={(e) => setAllowDeductions(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="calc-deductions-toggle" className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                    Calculate Deductions
                  </label>
                </div>
                <div className="text-right">
                  <Button 
                    type="button" 
                    onClick={handleAutoCalculate}
                    variant="outline"
                    className="w-full md:w-auto cursor-pointer font-semibold"
                  >
                    Auto-Calculate
                  </Button>
                </div>
              </div>

              {/* Select and Apply Template */}
              {templates.length > 0 && (
                <div className="bg-muted/40 p-4 rounded-xl border border-border animate-in fade-in duration-300">
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
                        setMedical(Number(tpl.medical));
                        setSpecial(Number(tpl.special));
                        setEpf(Number(tpl.epf));
                        setEsi(Number(tpl.esi));
                        setPt(Number(tpl.professionalTax));
                        setOther(Number(tpl.otherDeductions));
                        setLateAttendance(Number(tpl.lateAttendance ?? 0));
                        setTargetGross(Number(tpl.basicSalary) + Number(tpl.hra) + Number(tpl.conveyance) + Number(tpl.medical) + Number(tpl.special));
                      }
                    }}
                    options={[
                      ["", "Select a template to apply..."] as [string, string],
                      ...templates.map(t => [t.id, t.name] as [string, string])
                    ]}
                  />
                </div>
              )}
              
              <form onSubmit={handleSaveSalary} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Earnings */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 border-b pb-1">Earnings (Allowances)</h4>
                    <Field label="Basic Salary" type="number" value={basic} onChange={(e) => setBasic(Number(e.target.value))} />
                    <Field label="House Rent Allowance (HRA)" type="number" value={hra} onChange={(e) => setHra(Number(e.target.value))} />
                    <Field label="Conveyance Allowance" type="number" value={conveyance} onChange={(e) => setConveyance(Number(e.target.value))} />
                    <Field label="Medical Allowance" type="number" value={medical} onChange={(e) => setMedical(Number(e.target.value))} />
                    <Field label="Special Allowance" type="number" value={special} onChange={(e) => setSpecial(Number(e.target.value))} />
                  </div>

                  {/* Deductions */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-rose-600 dark:text-rose-400 border-b pb-1">Deductions (Monthly)</h4>
                    <Field label="EPF (Provident Fund)" type="number" value={epf} onChange={(e) => setEpf(Number(e.target.value))} />
                    <Field label="ESI (State Insurance)" type="number" value={esi} onChange={(e) => setEsi(Number(e.target.value))} />
                    <Field label="Professional Tax" type="number" value={pt} onChange={(e) => setPt(Number(e.target.value))} />
                    <Field label="Other Deductions" type="number" value={other} onChange={(e) => setOther(Number(e.target.value))} />
                    <Field label="Late Attendance" type="number" value={lateAttendance} onChange={(e) => setLateAttendance(Number(e.target.value))} />
                  </div>
                </div>

                {/* Calculation Summary */}
                <div className="border-t pt-4 bg-muted/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-3">Salary Summary</h4>
                  <div className="grid gap-3 grid-cols-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Gross Salary</p>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {currencySymbol}{(Number(basic) + Number(hra) + Number(conveyance) + Number(medical) + Number(special)).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="border-x">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Total Deductions</p>
                      <p className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        {currencySymbol}{(Number(epf) + Number(esi) + Number(pt) + Number(other) + Number(lateAttendance)).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-primary uppercase font-semibold">Net Take-Home</p>
                      <p className="text-base font-extrabold text-primary mt-0.5">
                        {currencySymbol}{Math.max(0, (Number(basic) + Number(hra) + Number(conveyance) + Number(medical) + Number(special)) - (Number(epf) + Number(esi) + Number(pt) + Number(other) + Number(lateAttendance))).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setEditingSalaryStaff(null)}>Cancel</Button>
                  <Button type="submit">Save Salary Structure</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
