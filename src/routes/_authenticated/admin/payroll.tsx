import * as React from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/services/auth";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Field } from "@/components/Field";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { Percent, Save, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  usePayrollSettings,
  savePayrollSettings,
  type PayrollSettings
} from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/admin/payroll")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data?.user.role !== "admin") {
      throw redirect({
        to: "/"
      });
    }
  },
  component: PayrollStatutoryPage
});

function PayrollStatutoryPage() {
  const payrollSettings = usePayrollSettings();

  const [payEpf, setPayEpf] = React.useState(0);
  const [payEsi, setPayEsi] = React.useState(0);
  const [payPt, setPayPt] = React.useState(0);
  const [payBasic, setPayBasic] = React.useState(0);
  const [payHra, setPayHra] = React.useState(0);
  const [payConveyance, setPayConveyance] = React.useState(0);
  const [paySkill, setPaySkill] = React.useState(0);
  const [paySpecial, setPaySpecial] = React.useState(0);
  const [payrollMessage, setPayrollMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    setPayEpf(payrollSettings.epfRate);
    setPayEsi(payrollSettings.esiRate);
    setPayPt(payrollSettings.ptDefault);
    setPayBasic(payrollSettings.basicPct);
    setPayHra(payrollSettings.hraPct);
    setPayConveyance(payrollSettings.conveyancePct);
    setPaySkill(payrollSettings.skillAllowancePct ?? 5);
    setPaySpecial(payrollSettings.specialPct);
  }, [payrollSettings]);

  const handleSavePayrollSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const sum = Number(payBasic) + Number(payHra) + Number(payConveyance) + Number(paySkill) + Number(paySpecial);
    if (sum !== 100) {
      setPayrollMessage({ type: "error", text: `Salary component splits must add up to exactly 100%. Currently they equal ${sum}%.` });
      return;
    }
    const settings: PayrollSettings = {
      epfRate: Number(payEpf) || 0,
      esiRate: Number(payEsi) || 0,
      ptDefault: Number(payPt) || 0,
      basicPct: Number(payBasic) || 0,
      hraPct: Number(payHra) || 0,
      conveyancePct: Number(payConveyance) || 0,
      skillAllowancePct: Number(paySkill) || 0,
      specialPct: Number(paySpecial) || 0
    };
    savePayrollSettings(settings);
    setPayrollMessage({ type: "success", text: "Payroll defaults updated successfully!" });
    setTimeout(() => setPayrollMessage(null), 3000);
  };

  return (
    <ModuleLayout
      title="Payroll Statutory Defaults"
      description="Define default tax rates, deductions, and allocation percentages for hospital staff salaries."
    >
      <div className="max-w-4xl mt-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="text-primary" size={18} />
              Statutory Deductions & Payroll Defaults
            </CardTitle>
            <CardDescription>Define default tax configurations and percentage splits for staff salaries.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSavePayrollSettings} className="space-y-6">
              {/* Part 1: Statutory % settings */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Statutory Tax Defaults</h4>
                <div className="grid gap-4 grid-cols-3">
                  <Field
                    label="EPF Contribution (%)"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={payEpf}
                    onChange={(e) => setPayEpf(Number(e.target.value))}
                  />
                  <Field
                    label="ESI Contribution (%)"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={payEsi}
                    onChange={(e) => setPayEsi(Number(e.target.value))}
                  />
                  <Field
                    label="Professional Tax Default (₹)"
                    type="number"
                    min="0"
                    value={payPt}
                    onChange={(e) => setPayPt(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="w-full h-px bg-border my-4" />

              {/* Part 2: Percentage allocations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Default Salary Splits (Percentage % of Gross)</h4>
                  <Badge variant="default" className={`py-1 px-2.5 font-bold ${
                    (Number(payBasic) + Number(payHra) + Number(payConveyance) + Number(paySkill) + Number(paySpecial)) === 100
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900"
                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900 animate-pulse"
                  }`}>
                    Total: {Number(payBasic) + Number(payHra) + Number(payConveyance) + Number(paySkill) + Number(paySpecial)}% / 100%
                  </Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-5">
                  <Field
                    label="Basic (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={payBasic}
                    onChange={(e) => setPayBasic(Number(e.target.value))}
                  />
                  <Field
                    label="HRA (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={payHra}
                    onChange={(e) => setPayHra(Number(e.target.value))}
                  />
                  <Field
                    label="Conveyance (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={payConveyance}
                    onChange={(e) => setPayConveyance(Number(e.target.value))}
                  />
                  <Field
                    label="Skill Allowance (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={paySkill}
                    onChange={(e) => setPaySkill(Number(e.target.value))}
                  />
                  <Field
                    label="Special (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={paySpecial}
                    onChange={(e) => setPaySpecial(Number(e.target.value))}
                  />
                </div>
              </div>

              {payrollMessage && (
                <div className={`p-3 rounded-lg border text-xs flex gap-2 items-center ${
                  payrollMessage.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-300"
                    : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-300"
                }`}>
                  {payrollMessage.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                  <span>{payrollMessage.text}</span>
                </div>
              )}

              <Button type="submit" className="font-bold bg-slate-900 hover:bg-slate-800 text-white gap-2 h-10 px-4">
                <Save size={14} />
                Save payroll defaults
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
