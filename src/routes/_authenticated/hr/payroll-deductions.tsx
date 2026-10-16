import * as React from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Tabs } from "radix-ui";
import { FileDown } from "lucide-react";
import { deductionFields as fields, deductionTabs, type DeductionTab, type DeductionAmountKey as AmountKey } from "../../../lib/payroll-deductions";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { Field } from "../../../components/Field";
import { MonthPicker } from "../../../components/ui/month-picker";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { useRpcQuery, queryClient } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { authClient } from "../../../services/auth";

export const Route = createFileRoute("/_authenticated/hr/payroll-deductions")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!["admin", "hr"].includes(session.data?.user.role ?? "")) throw redirect({ to: "/" });
  },
  component: PayrollDeductionsPage,
});

type Row = { salaryId: number | null; staffId: number; version: number; name: string; employeeCode: string; departmentName: string | null; securityDepositStartMonth: string | null } & Record<AmountKey, string | null>;
type Draft = Record<AmountKey, string> & { securityDepositStartMonth: string };
const fmt = (value: string | null) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function PayrollDeductionsPage() {
  const rowsQuery = useRpcQuery<Row[]>(["payroll-deductions"], () => client.hr["payroll-deductions"].staff.$get());
  const [activeTab, setActiveTab] = React.useState<DeductionTab>("epf");
  const [exporting, setExporting] = React.useState(false);
  const tab = deductionTabs.find(item => item.id === activeTab)!;
  const visibleFields = fields.filter(([key]) => tab.fields.includes(key));
  const [search, setSearch] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [employee, setEmployee] = React.useState<Row | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const editor = React.useRef<HTMLDivElement>(null);
  const rows = rowsQuery.data ?? [];
  const departments = [...new Set(rows.map(row => row.departmentName || "Unassigned"))].sort();
  const filtered = rows.filter(row => (activeTab === "securityDeposit" || Number(row[activeTab] || 0) > 0) &&
    (!department || (row.departmentName || "Unassigned") === department) &&
    `${row.name} ${row.employeeCode} ${row.departmentName || ""}`.toLowerCase().includes(search.trim().toLowerCase()));

  React.useEffect(() => {
    if (!employee) return;
    editor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    editor.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  }, [employee]);

  function edit(row: Row) {
    setEmployee(row);
    setDraft({ ...Object.fromEntries(fields.map(([key]) => [key, row[key] ?? "0"])), securityDepositStartMonth: row.securityDepositStartMonth || "" } as Draft);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!employee || !draft || saving) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/hr/payroll-deductions/staff/${employee.staffId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: employee.version,
          expected: { ...Object.fromEntries(fields.map(([key]) => [key, Number(employee[key] || 0)])), securityDepositStartMonth: employee.securityDepositStartMonth },
          ...Object.fromEntries(fields.map(([key]) => [key, Number(draft[key])])), securityDepositStartMonth: draft.securityDepositStartMonth || null }),
      });
      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error || "Unable to save deductions");
      }
      for (const key of ["payroll-deductions", "staff", "security-deposits"]) queryClient.invalidateQueries({ queryKey: [key] });
      setEmployee(null); setDraft(null);
      toast.success("Payroll deduction rules saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save deductions"); }
    finally { setSaving(false); }
  }

  function changeTab(value: string) {
    if (employee && draft) {
      const dirty = fields.some(([key]) => Number(draft[key]) !== Number(employee[key] || 0)) || draft.securityDepositStartMonth !== (employee.securityDepositStartMonth || "");
      if (dirty && !window.confirm("Discard unsaved deduction changes and switch tabs?")) return;
    }
    setEmployee(null); setDraft(null); setActiveTab(value as DeductionTab);
  }
  async function exportExcel() {
    if (exporting || !filtered.length || rowsQuery.isError) return;
    setExporting(true);
    try {
      const { exportPayrollDeductions } = await import("../../../lib/payroll-deductions-export");
      exportPayrollDeductions(filtered, activeTab);
    } catch { toast.error("Unable to export deductions. Please try again."); }
    finally { setExporting(false); }
  }

  return <ModuleLayout title="Payroll Deductions" description="Manage monthly employee PF, ESI, professional tax and security deposit rules. Access is restricted to HR and Admin."
    action={<Button asChild variant="outline"><Link to="/hr/payroll" search={{ tab: "security-deposit" }}>Deposit Balances &amp; Refunds</Link></Button>}>
    <div className="space-y-5">
      <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">Amounts are in INR. Changes apply when payroll is generated. Existing payslips are unchanged. Security deposits stop at the target; a zero target disables new deductions.</p>
      <Tabs.Root value={activeTab} onValueChange={changeTab}>
        <Tabs.List aria-label="Deduction type" className="mb-5 flex gap-1 overflow-x-auto border-b">
          {deductionTabs.map(item => <Tabs.Trigger key={item.id} value={item.id} disabled={saving} className="shrink-0 border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:border-primary data-[state=active]:text-primary">{item.label}</Tabs.Trigger>)}
        </Tabs.List>
        <Tabs.Content value={activeTab} className="space-y-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {employee && draft && <Card ref={editor} className="scroll-mt-6">
        <CardHeader><CardTitle>Edit {tab.label}: {employee.name}</CardTitle><p className="text-sm text-muted-foreground">{employee.employeeCode} · {employee.departmentName || "Unassigned"}</p></CardHeader>
        <CardContent><form onSubmit={save} className="space-y-4">
          <fieldset disabled={saving} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
            {visibleFields.map(([key, label]) => <Field key={key} label={`${label} (INR)`} type="number" min="0" step="0.01" max="9999999999.99" required value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} />)}
            {activeTab === "securityDeposit" && <Field label="First Security Deposit Deduction Month"><MonthPicker value={draft.securityDepositStartMonth} onChange={value => setDraft({ ...draft, securityDepositStartMonth: value })} clearable className="h-10 w-full" /></Field>}
          </fieldset>
          {activeTab === "securityDeposit" && <p className="text-xs text-muted-foreground">Opening balance is money already collected outside paid ERP payslips. No collections are assumed before the first deduction month. Pending payslip deductions reserve part of the target.</p>}
          {activeTab === "securityDeposit" && Number(draft.securityDeposit) > 0 && Number(draft.securityDepositTotal) === 0 && <p className="text-sm text-amber-600">Set a security deposit target to enable monthly deductions.</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => { setEmployee(null); setDraft(null); }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Deductions"}</Button></div>
        </form></CardContent>
      </Card>}
      <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{tab.label} deduction rules</CardTitle><Button variant="outline" disabled={exporting || rowsQuery.isLoading || rowsQuery.isError || !filtered.length} onClick={exportExcel}><FileDown className="mr-2 size-4" />{exporting ? "Exporting..." : "Export Excel"}</Button></div><div className="grid gap-3 sm:grid-cols-2">
        <Field label="Search staff" placeholder="Name or employee code" value={search} onChange={event => setSearch(event.target.value)} />
        <div>
          <label htmlFor="deductions-department" className="mb-1.5 block text-xs font-medium uppercase text-muted-foreground">Department</label>
          <Select value={department ? `department:${department}` : "all"} onValueChange={value => setDepartment(value === "all" ? "" : value.slice(11))}>
            <SelectTrigger id="deductions-department" className="h-10 bg-background"><SelectValue placeholder="All departments" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {[{ value: "all", label: "All departments" }, ...departments.map(name => ({ value: `department:${name}`, label: name }))].map(option => (
                <SelectItem key={option.value} value={option.value} className="cursor-pointer transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[state=checked]:bg-primary/5 data-[state=checked]:font-medium">{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div></CardHeader><CardContent>
        {rowsQuery.isLoading ? <p role="status">Loading deduction rules...</p> : rowsQuery.isError ? <div role="alert" className="space-y-3"><p>Unable to load deduction rules.</p><Button variant="outline" onClick={() => rowsQuery.refetch()}>Try Again</Button></div> : <>
          <p className="mb-3 text-xs text-muted-foreground">{filtered.length} staff shown. Excel export uses this filtered list for {tab.label}.</p>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-3">Employee</th>{tab.fields.map(key => <th key={key} className="p-3 text-right">{fields.find(([field]) => field === key)?.[1]}</th>)}{activeTab === "securityDeposit" && <th className="p-3">First Deduction Month</th>}<th className="p-3">Actions</th></tr></thead><tbody>
            {filtered.length === 0 ? <tr><td colSpan={2 + tab.fields.length + (activeTab === "securityDeposit" ? 1 : 0)} className="p-8 text-center text-muted-foreground">No staff match your filters.</td></tr> : filtered.map(row => <tr key={row.staffId} className="border-b"><td className="p-3"><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.employeeCode} · {row.departmentName || "Unassigned"}</p></td>
              {tab.fields.map(key => <td key={key} className="p-3 text-right tabular-nums whitespace-nowrap">{fmt(row[key as AmountKey])}{key === "securityDeposit" && Number(row.securityDeposit) > 0 && !Number(row.securityDepositTotal) && <p className="text-xs text-amber-600">No target; off</p>}</td>)}
              {activeTab === "securityDeposit" && <td className="p-3 whitespace-nowrap">{row.securityDepositStartMonth || "Any payroll month"}</td>}
              <td className="p-3">{row.salaryId ? <Button variant="outline" disabled={saving} onClick={() => edit(row)} aria-label={`Edit deductions for ${row.name}`}>Edit</Button> : <Link className="text-primary underline" to="/hr/payroll">Set up salary</Link>}</td></tr>)}
          </tbody></table></div>
        </>}
      </CardContent></Card>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  </ModuleLayout>;
}
