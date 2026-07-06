import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Receipt, X, Edit2, Trash2, Plus, DollarSign } from "lucide-react";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { useSystemSettings, usePayrollSettings, useSalaryTemplates, saveSalaryTemplates, type SalaryTemplate } from "../../../lib/settings";
import { DataTable } from "../../../components/DataTable";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../ui/card";
import { Field } from "../../../components/Field";

export const Route = createFileRoute("/_authenticated/masters/salary-templates")({
  component: SalaryTemplatesPage,
});

function SalaryTemplatesPage() {
  const { currencySymbol } = useSystemSettings();
  const payrollSettings = usePayrollSettings();
  const templates = useSalaryTemplates();

  const [showModal, setShowModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<SalaryTemplate | null>(null);

  // Form states
  const [name, setName] = React.useState("");
  const [basic, setBasic] = React.useState(0);
  const [hra, setHra] = React.useState(0);
  const [conveyance, setConveyance] = React.useState(0);
  const [medical, setMedical] = React.useState(0);
  const [special, setSpecial] = React.useState(0);
  const [epf, setEpf] = React.useState(0);
  const [esi, setEsi] = React.useState(0);
  const [pt, setPt] = React.useState(0);
  const [other, setOther] = React.useState(0);

  // Auto calculation helper states
  const [targetGross, setTargetGross] = React.useState(0);
  const [allowDeductions, setAllowDeductions] = React.useState(true);

  React.useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name);
      setBasic(editingTemplate.basicSalary);
      setHra(editingTemplate.hra);
      setConveyance(editingTemplate.conveyance);
      setMedical(editingTemplate.medical);
      setSpecial(editingTemplate.special);
      setEpf(editingTemplate.epf);
      setEsi(editingTemplate.esi);
      setPt(editingTemplate.professionalTax);
      setOther(editingTemplate.otherDeductions);
      setTargetGross(
        editingTemplate.basicSalary +
        editingTemplate.hra +
        editingTemplate.conveyance +
        editingTemplate.medical +
        editingTemplate.special
      );
      setAllowDeductions(true);
    } else {
      setName("");
      setBasic(0);
      setHra(0);
      setConveyance(0);
      setMedical(0);
      setSpecial(0);
      setEpf(0);
      setEsi(0);
      setPt(0);
      setOther(0);
      setTargetGross(0);
      setAllowDeductions(true);
    }
  }, [editingTemplate, showModal]);

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please enter a template name.");
      return;
    }

    const payload: SalaryTemplate = {
      id: editingTemplate?.id ?? Date.now().toString(),
      name: name.trim(),
      basicSalary: basic,
      hra,
      conveyance,
      medical,
      special,
      epf,
      esi,
      professionalTax: pt,
      otherDeductions: other,
    };

    let updated: SalaryTemplate[];
    if (editingTemplate) {
      updated = templates.map((t) => (t.id === editingTemplate.id ? payload : t));
    } else {
      updated = [...templates, payload];
    }

    setIsSubmitting(true);
    setTimeout(() => {
      saveSalaryTemplates(updated);
      setIsSubmitting(false);
      setShowModal(false);
      setEditingTemplate(null);
    }, 400); // Simulate network delay for UI consistency
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      const updated = templates.filter((t) => t.id !== id);
      saveSalaryTemplates(updated);
    }
  };

  const columns = [
    {
      id: "name",
      label: "Template Name",
      render: (row: SalaryTemplate) => <span className="font-semibold text-foreground">{row.name}</span>,
      sortKey: "name" as keyof SalaryTemplate,
    },
    {
      id: "grossSalary",
      label: "Gross Salary",
      render: (row: SalaryTemplate) => {
        const gross = row.basicSalary + row.hra + row.conveyance + row.medical + row.special;
        return <span>{currencySymbol}{gross.toLocaleString("en-IN")}</span>;
      },
    },
    {
      id: "netSalary",
      label: "Net Take-Home",
      render: (row: SalaryTemplate) => {
        const gross = row.basicSalary + row.hra + row.conveyance + row.medical + row.special;
        const ded = row.epf + row.esi + row.professionalTax + row.otherDeductions;
        return <span className="font-semibold text-emerald-600">{currencySymbol}{Math.max(0, gross - ded).toLocaleString("en-IN")}</span>;
      },
    },
    {
      id: "actions",
      label: "Actions",
      render: (row: SalaryTemplate) => (
        <div className="flex items-center gap-1">
          <Button
            onClick={() => {
              setEditingTemplate(row);
              setShowModal(true);
            }}
            variant="ghost"
            size="icon"
            title="Edit Template"
            className="cursor-pointer"
          >
            <Edit2 size={16} />
          </Button>
          <Button
            onClick={() => handleDelete(row.id)}
            variant="ghost"
            size="icon"
            title="Delete Template"
            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ModuleLayout
      title="Salary Templates"
      description="Define standard monthly allowance and statutory deduction templates for fast staff salary setups."
      action={
        <Button
          onClick={() => {
            setEditingTemplate(null);
            setShowModal(true);
          }}
          className="gap-2 cursor-pointer"
        >
          <Plus size={16} /> Create Template
        </Button>
      }
    >
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={templates as any}
            columns={columns as any}
            enablePagination
            enableSorting
            enableFiltering
            filterPlaceholder="Search templates..."
          />
        </CardContent>
      </Card>

      {/* Create/Edit Template Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => {
            setShowModal(false);
            setEditingTemplate(null);
          }}
        >
          <div
            className="relative bg-background rounded-xl border border-border shadow-xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="text-primary h-5 w-5" />
                <h3 className="font-semibold text-lg text-foreground">
                  {editingTemplate ? "Edit Salary Template" : "New Salary Template"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTemplate(null);
                }}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                type="button"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6 relative">
              {isSubmitting && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                    <p className="text-sm font-medium">Submitting...</p>
                  </div>
                </div>
              )}
              <fieldset disabled={isSubmitting}>
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <Field
                    label="Template Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Senior Medical Officer, Grade A Staff Nurse"
                    required
                  />
                </div>

                {/* Auto Calculation helper */}
                <div className="bg-muted/45 p-4 rounded-xl border border-dashed border-border grid gap-4 md:grid-cols-3 md:items-end">
                  <div className="md:col-span-1">
                    <Field
                      label="Target Gross Salary"
                      type="number"
                      value={targetGross || ""}
                      onChange={(e) => setTargetGross(Number(e.target.value))}
                      placeholder="e.g. 75000"
                    />
                  </div>
                  <div className="flex items-center gap-2 h-10">
                    <input
                      type="checkbox"
                      id="tpl-deductions-toggle"
                      checked={allowDeductions}
                      onChange={(e) => setAllowDeductions(e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="tpl-deductions-toggle" className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">
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
                  </div>
                </div>

                {/* Calculation Summary */}
                <div className="border-t pt-4 bg-muted/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-3">Salary Summary</h4>
                  <div className="grid gap-3 grid-cols-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Gross Salary</p>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {currencySymbol}{(basic + hra + conveyance + medical + special).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="border-x">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Total Deductions</p>
                      <p className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        {currencySymbol}{(epf + esi + pt + other).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-primary uppercase font-semibold">Net Take-Home</p>
                      <p className="text-base font-extrabold text-primary mt-0.5">
                        {currencySymbol}{Math.max(0, (basic + hra + conveyance + medical + special) - (epf + esi + pt + other)).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setEditingTemplate(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save Template</Button>
                </div>
              </form>
              </fieldset>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
