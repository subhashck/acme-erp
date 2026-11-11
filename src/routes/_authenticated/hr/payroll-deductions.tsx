import * as React from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Tabs } from "radix-ui";
import {
  FileDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ShieldCheck,
  Receipt,
  Landmark,
  Coins,
  Users,
  Banknote,
  DollarSign,
  AlertCircle,
  X,
  Edit2,
} from "lucide-react";
import {
  deductionFields as fields,
  deductionTabs,
  type DeductionTab,
  type DeductionAmountKey as AmountKey,
} from "../../../lib/payroll-deductions";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { Field } from "../../../components/Field";
import { MonthPicker } from "../../../components/ui/month-picker";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { useRpcQuery, queryClient } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { authClient } from "../../../services/auth";
import { useSystemSettings } from "../../../lib/settings";
import { cn } from "@/utils/cn";

export const Route = createFileRoute("/_authenticated/hr/payroll-deductions")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!["admin", "hr"].includes(session.data?.user.role ?? "")) throw redirect({ to: "/" });
  },
  component: PayrollDeductionsPage,
});

type Row = {
  salaryId: number | null;
  staffId: number;
  version: number;
  name: string;
  employeeCode: string;
  departmentName: string | null;
  securityDepositStartMonth: string | null;
} & Record<AmountKey, string | null>;

type Draft = Record<AmountKey, string> & { securityDepositStartMonth: string };
const fmt = (value: string | null) =>
  Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function PayrollDeductionsPage() {
  const { currencySymbol } = useSystemSettings();
  const rowsQuery = useRpcQuery<Row[]>(["payroll-deductions"], () => client.hr["payroll-deductions"].staff.$get());
  const [activeTab, setActiveTab] = React.useState<DeductionTab>("epf");
  const [exporting, setExporting] = React.useState(false);
  const tab = deductionTabs.find((item) => item.id === activeTab)!;
  const visibleFields = fields.filter(([key]) => tab.fields.includes(key));
  const [search, setSearch] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");
  const [employee, setEmployee] = React.useState<Row | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const editor = React.useRef<HTMLDivElement>(null);
  const rows = rowsQuery.data ?? [];
  const departments = [...new Set(rows.map((row) => row.departmentName || "Unassigned"))].sort();

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (key: string) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
    );
  };

  const filtered = React.useMemo(() => {
    const list = rows.filter(
      (row) =>
        (activeTab === "securityDeposit" || Number(row[activeTab] || 0) > 0) &&
        (!department || (row.departmentName || "Unassigned") === department) &&
        `${row.name} ${row.employeeCode} ${row.departmentName || ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
    );

    if (!sortKey) return list;

    return [...list].sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      if (sortKey === "employee") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortKey === "startMonth") {
        aVal = a.securityDepositStartMonth || "";
        bVal = b.securityDepositStartMonth || "";
      } else {
        aVal = Number(a[sortKey as AmountKey] || 0);
        bVal = Number(b[sortKey as AmountKey] || 0);
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, activeTab, department, search, sortKey, sortDirection]);

  const deductionSummary = React.useMemo(() => {
    let totalMonthly = 0;
    let totalTarget = 0;
    let totalOpening = 0;
    let enrolledCount = 0;

    for (const r of filtered) {
      const m = Number(r[activeTab === "securityDeposit" ? "securityDeposit" : activeTab] || 0);
      if (m > 0) enrolledCount++;
      totalMonthly += m;
      if (activeTab === "securityDeposit") {
        totalTarget += Number(r.securityDepositTotal || 0);
        totalOpening += Number(r.securityDepositOpeningBalance || 0);
      }
    }
    const avgDeduction = enrolledCount > 0 ? totalMonthly / enrolledCount : 0;
    const totalOutstanding = Math.max(0, totalTarget - totalOpening);
    return {
      totalMonthly,
      totalTarget,
      totalOpening,
      totalOutstanding,
      enrolledCount,
      totalCount: filtered.length,
      avgDeduction,
    };
  }, [filtered, activeTab]);

  React.useEffect(() => {
    if (!employee) return;
    editor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    editor.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  }, [employee]);

  function edit(row: Row) {
    setEmployee(row);
    setDraft({
      ...Object.fromEntries(fields.map(([key]) => [key, row[key] ?? "0"])),
      securityDepositStartMonth: row.securityDepositStartMonth || "",
    } as Draft);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!employee || !draft || saving) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/hr/payroll-deductions/staff/${employee.staffId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: employee.version,
          expected: {
            ...Object.fromEntries(fields.map(([key]) => [key, Number(employee[key] || 0)])),
            securityDepositStartMonth: employee.securityDepositStartMonth,
          },
          ...Object.fromEntries(fields.map(([key]) => [key, Number(draft[key])])),
          securityDepositStartMonth: draft.securityDepositStartMonth || null,
        }),
      });
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || "Unable to save deductions");
      }
      for (const key of ["payroll-deductions", "staff", "security-deposits"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      setEmployee(null);
      setDraft(null);
      toast.success("Payroll deduction rules saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save deductions");
    } finally {
      setSaving(false);
    }
  }

  function changeTab(value: string) {
    if (employee && draft) {
      const dirty =
        fields.some(([key]) => Number(draft[key]) !== Number(employee[key] || 0)) ||
        draft.securityDepositStartMonth !== (employee.securityDepositStartMonth || "");
      if (dirty && !window.confirm("Discard unsaved deduction changes and switch tabs?")) return;
    }
    const targetTab = deductionTabs.find((t) => t.id === value);
    if (
      sortKey &&
      sortKey !== "employee" &&
      (!targetTab ||
        (!targetTab.fields.includes(sortKey as AmountKey) &&
          (value !== "securityDeposit" || sortKey !== "startMonth")))
    ) {
      setSortKey(null);
      setSortDirection("asc");
    }
    setEmployee(null);
    setDraft(null);
    setActiveTab(value as DeductionTab);
  }

  async function exportExcel() {
    if (exporting || !filtered.length || rowsQuery.isError) return;
    setExporting(true);
    try {
      const { exportPayrollDeductions } = await import("../../../lib/payroll-deductions-export");
      exportPayrollDeductions(filtered, activeTab);
    } catch {
      toast.error("Unable to export deductions. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <ModuleLayout
      title="Payroll Deductions"
      description="Manage monthly employee PF, ESI, professional tax and security deposit rules. Access is restricted to HR and Admin."
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={exporting || rowsQuery.isLoading || rowsQuery.isError || !filtered.length}
            onClick={exportExcel}
            className="gap-2 text-xs h-9 rounded-xl font-medium shadow-2xs hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 dark:hover:border-emerald-800 transition-colors cursor-pointer"
            title={`Export ${tab.label} deductions to Excel`}
          >
            <FileDown size={14} className={exporting ? "animate-bounce" : ""} />
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>

          <Button asChild variant="outline" className="gap-1.5 text-xs h-9 rounded-xl shadow-2xs cursor-pointer">
            <Link to="/hr/payroll" search={{ tab: "security-deposit" }}>
              <Coins size={14} className="text-muted-foreground" />
              <span>Deposit Balances &amp; Refunds</span>
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <Tabs.Root value={activeTab} onValueChange={changeTab}>
          {/* Navigation Tabs */}
          <Tabs.List
            aria-label="Deduction type"
            className="flex items-center gap-1.5 p-1.5 bg-muted/50 dark:bg-muted/30 backdrop-blur-xs rounded-2xl border border-border/70 overflow-x-auto overflow-y-hidden shadow-2xs mb-6"
          >
            {deductionTabs.map((item) => {
              const count = rows.filter(
                (row) => item.id === "securityDeposit" || Number(row[item.id] || 0) > 0
              ).length;
              const tabTotal = rows.reduce(
                (sum, row) => sum + Number(row[item.id === "securityDeposit" ? "securityDeposit" : item.id] || 0),
                0
              );
              const icon =
                item.id === "epf" ? (
                  <ShieldCheck className="size-4" />
                ) : item.id === "esi" ? (
                  <Receipt className="size-4" />
                ) : item.id === "professionalTax" ? (
                  <Landmark className="size-4" />
                ) : (
                  <Coins className="size-4" />
                );

              return (
                <Tabs.Trigger
                  key={item.id}
                  value={item.id}
                  disabled={saving}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap",
                    "text-muted-foreground hover:text-foreground hover:bg-background/40",
                    "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-border/50",
                    "focus-visible:outline-none"
                  )}
                >
                  <span className={cn(activeTab === item.id ? "text-primary" : "text-muted-foreground")}>{icon}</span>
                  <span>{item.label}</span>
                  <span
                    className={cn(
                      "ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums inline-flex items-center gap-1",
                      activeTab === item.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <span>{count}</span>
                    <span className="opacity-40">&middot;</span>
                    <span>{currencySymbol}{Number(tabTotal).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                  </span>
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>

          <Tabs.Content
            value={activeTab}
            className="space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* Metric Summary Cards */}
            <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", activeTab === "securityDeposit" ? "lg:grid-cols-3 xl:grid-cols-5" : "lg:grid-cols-4")}>
              <Card className="bg-card/70 backdrop-blur-xs border-border/70 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Banknote className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Monthly {tab.label}
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5 tabular-nums truncate">
                      {currencySymbol}
                      {deductionSummary.totalMonthly.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      Across {deductionSummary.enrolledCount} enrolled staff
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/70 backdrop-blur-xs border-border/70 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
                    <Users className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Enrolled Staff
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5 tabular-nums truncate">
                      {deductionSummary.enrolledCount} of {rows.length}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      {Math.round((deductionSummary.enrolledCount / (rows.length || 1)) * 100)}% participation rate
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/70 backdrop-blur-xs border-border/70 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400 shrink-0">
                    <DollarSign className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Average Deduction
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5 tabular-nums truncate">
                      {currencySymbol}
                      {deductionSummary.avgDeduction.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      Per enrolled employee
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/70 backdrop-blur-xs border-border/70 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                    {activeTab === "securityDeposit" ? <Coins className="size-5" /> : <Landmark className="size-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {activeTab === "securityDeposit" ? "Total Target Cap" : "Department Scope"}
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5 tabular-nums truncate">
                      {activeTab === "securityDeposit"
                        ? `${currencySymbol}${deductionSummary.totalTarget.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                        : `${departments.length} Departments`}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      {activeTab === "securityDeposit" ? "Cumulative deposit goal" : "Organization-wide coverage"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {activeTab === "securityDeposit" && (
                <Card className="bg-card/70 backdrop-blur-xs border-border/70 shadow-2xs hover:shadow-xs transition-all rounded-2xl">
                  <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
                      <AlertCircle className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Outstanding Total
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums truncate">
                        {currencySymbol}
                        {deductionSummary.totalOutstanding.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        Target less opening funds
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Edit Drawer/Card */}
            {employee && draft && (
              <Card ref={editor} className="scroll-mt-6 border shadow-md bg-card/95 backdrop-blur-md overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200">
                <CardHeader className="border-b bg-muted/20 pb-4 px-4 sm:px-6 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold tracking-tight">Edit {tab.label}: {employee.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {employee.employeeCode} &middot; {employee.departmentName || "Unassigned"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => { setEmployee(null); setDraft(null); }}>
                    <X size={16} />
                  </Button>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <form onSubmit={save} className="space-y-4">
                    <fieldset disabled={saving} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
                      {visibleFields.map(([key, label]) => (
                        <Field
                          key={key}
                          label={`${label} (INR)`}
                          type="number"
                          min="0"
                          step="0.01"
                          max="9999999999.99"
                          required
                          value={draft[key]}
                          onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                        />
                      ))}
                      {activeTab === "securityDeposit" && (
                        <Field label="First Security Deposit Deduction Month">
                          <MonthPicker
                            value={draft.securityDepositStartMonth}
                            onChange={(value) => setDraft({ ...draft, securityDepositStartMonth: value })}
                            clearable
                            className="h-10 w-full"
                          />
                        </Field>
                      )}
                    </fieldset>
                    {activeTab === "securityDeposit" && (
                      <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl">
                        Opening balance is money already collected outside paid ERP payslips. No collections are assumed before the first deduction month. Pending payslip deductions reserve part of the target.
                      </p>
                    )}
                    {activeTab === "securityDeposit" && Number(draft.securityDeposit) > 0 && Number(draft.securityDepositTotal) === 0 && (
                      <p className="text-sm font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40">
                        Set a security deposit target to enable monthly deductions.
                      </p>
                    )}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={saving}
                        className="rounded-xl"
                        onClick={() => {
                          setEmployee(null);
                          setDraft(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving} className="rounded-xl gap-1.5">
                        {saving ? "Saving..." : "Save Deductions"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Table Card */}
            <Card className="border shadow-xs bg-card/90 backdrop-blur-sm overflow-hidden rounded-2xl">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b bg-muted/20 px-4 sm:px-6 gap-3">
                <div>
                  <CardTitle className="text-base font-bold tracking-tight">{tab.label} Deduction Rules</CardTitle>
                  <CardDescription className="text-xs">
                    {filtered.length} staff match active filters. Configured changes apply when generating monthly payroll.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="w-full sm:w-64 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search name or code..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="w-full text-xs pl-8 pr-8 py-2 border rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div className="w-full sm:w-48">
                    <Select
                      value={department ? `department:${department}` : "all"}
                      onValueChange={(value) => setDepartment(value === "all" ? "" : value.slice(11))}
                    >
                      <SelectTrigger id="deductions-department" className="h-9 text-xs rounded-xl bg-background shadow-2xs">
                        <SelectValue placeholder="All departments" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 rounded-xl">
                        {[
                          { value: "all", label: "All departments" },
                          ...departments.map((name) => ({ value: `department:${name}`, label: name })),
                        ].map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="cursor-pointer text-xs transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[state=checked]:bg-primary/5 data-[state=checked]:font-medium"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(search || department) && (
                    <Button
                      variant="ghost"
                      size="default"
                      className="h-9 text-xs px-2.5 text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                      onClick={() => {
                        setSearch("");
                        setDepartment("");
                      }}
                      title="Clear filters"
                    >
                      <X size={13} />
                      <span>Reset</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {rowsQuery.isLoading ? (
                  <p role="status" className="p-8 text-center text-muted-foreground animate-pulse text-xs">
                    Loading deduction rules...
                  </p>
                ) : rowsQuery.isError ? (
                  <div role="alert" className="p-8 text-center space-y-3">
                    <p className="text-destructive text-sm font-medium">Unable to load deduction rules.</p>
                    <Button variant="outline" size="default" onClick={() => rowsQuery.refetch()}>
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground border-b uppercase font-semibold">
                        <tr>
                          <th scope="col" className="p-3 whitespace-nowrap">Sl. No.</th>
                          <th
                            scope="col"
                            className="p-3 cursor-pointer select-none hover:bg-muted/70 transition-colors group"
                            onClick={() => handleSort("employee")}
                            aria-sort={sortKey === "employee" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Employee</span>
                              {renderSortIcon("employee")}
                            </div>
                          </th>
                          {tab.fields.map((key) => {
                            const fieldLabel = fields.find(([field]) => field === key)?.[1] || key;
                            return (
                              <th
                                key={key}
                                scope="col"
                                className="p-3 text-right cursor-pointer select-none hover:bg-muted/70 transition-colors group"
                                onClick={() => handleSort(key)}
                                aria-sort={sortKey === key ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                              >
                                <div className="flex items-center justify-end gap-1.5">
                                  <span>{fieldLabel}</span>
                                  {renderSortIcon(key)}
                                </div>
                              </th>
                            );
                          })}
                          {activeTab === "securityDeposit" && (
                            <th
                              scope="col"
                              className="p-3 cursor-pointer select-none hover:bg-muted/70 transition-colors group"
                              onClick={() => handleSort("startMonth")}
                              aria-sort={sortKey === "startMonth" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                            >
                              <div className="flex items-center gap-1.5">
                                <span>First Deduction Month</span>
                                {renderSortIcon("startMonth")}
                              </div>
                            </th>
                          )}
                          <th scope="col" className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filtered.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3 + tab.fields.length + (activeTab === "securityDeposit" ? 1 : 0)}
                              className="p-8 text-center text-muted-foreground"
                            >
                              No staff match your filters.
                            </td>
                          </tr>
                        ) : (
                          filtered.map((row, index) => (
                            <tr key={row.staffId} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3 tabular-nums text-muted-foreground whitespace-nowrap">{index + 1}</td>
                              <td className="p-3">
                                <p className="font-medium text-foreground">{row.name}</p>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  {row.employeeCode} &middot; {row.departmentName || "Unassigned"}
                                </p>
                              </td>
                              {tab.fields.map((key) => (
                                <td key={key} className="p-3 text-right tabular-nums whitespace-nowrap">
                                  <span className="font-semibold">{currencySymbol}{fmt(row[key as AmountKey])}</span>
                                  {key === "securityDeposit" &&
                                    Number(row.securityDeposit) > 0 &&
                                    !Number(row.securityDepositTotal) && (
                                      <p className="text-[10px] text-amber-600 font-medium">No target set; deductions off</p>
                                    )}
                                </td>
                              ))}
                              {activeTab === "securityDeposit" && (
                                <td className="p-3 whitespace-nowrap font-medium text-muted-foreground">
                                  {row.securityDepositStartMonth ? (
                                    <span className="text-primary">{row.securityDepositStartMonth}</span>
                                  ) : (
                                    <span>Any payroll month</span>
                                  )}
                                </td>
                              )}
                              <td className="p-3 text-right">
                                {row.salaryId ? (
                                  <Button
                                    variant="outline"
                                    size="default"
                                    disabled={saving}
                                    onClick={() => edit(row)}
                                    aria-label={`Edit deductions for ${row.name}`}
                                    className="h-7 text-xs px-2 gap-1 rounded-lg cursor-pointer"
                                  >
                                    <Edit2 size={12} /> Edit
                                  </Button>
                                ) : (
                                  <Link className="text-xs font-semibold text-primary underline" to="/hr/payroll">
                                    Set up salary
                                  </Link>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {filtered.length > 0 && (
                        <tfoot className="border-t-2 border-border/80 bg-muted/60 dark:bg-muted/40 font-semibold text-foreground">
                          <tr>
                            <td className="p-3"></td>
                            <td className="p-3">
                              <span className="font-bold">Total</span>
                              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                                ({filtered.length} staff)
                              </span>
                            </td>
                            {tab.fields.map((key) => {
                              const sum = filtered.reduce((acc, row) => acc + Number(row[key as AmountKey] || 0), 0);
                              return (
                                <td key={key} className="p-3 text-right tabular-nums whitespace-nowrap">
                                  <span className="font-bold text-foreground">
                                    {currencySymbol}{fmt(String(sum))}
                                  </span>
                                </td>
                              );
                            })}
                            {activeTab === "securityDeposit" && <td className="p-3"></td>}
                            <td className="p-3"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </ModuleLayout>
  );
}
