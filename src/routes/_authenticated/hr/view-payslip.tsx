import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
  ArrowLeft,
  Printer,
  CalendarDays,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Check,
  X,
  Download,
} from "lucide-react";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { useRpcQuery, queryClient } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { authClient } from "../../../services/auth";
import { Button } from "../../../ui/button";
import { Badge } from "../../../ui/badge";
import { useSystemSettings } from "../../../lib/settings";

export const Route = createFileRoute("/_authenticated/hr/view-payslip")({
  validateSearch: z.object({ payslipId: z.number().int().positive() }),
  component: ViewPayslipPage,
});

interface LeaveBalance {
  leaveType: string;
  maxDays: number;
  takenDays: number;
  remainingDays: number;
}

interface PayslipDetail {
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
  leaveBalance: LeaveBalance[];
}



type SalaryTuple = [string, number, React.Dispatch<React.SetStateAction<number>>];

function PrintButton({ userEmail }: { userEmail: string }) {
  const handlePrint = () => {
    if (typeof window === "undefined" || typeof window.print !== "function") {
      alert(
        "Printing is not supported in this environment. Please use the 'Save PDF' button instead."
      );
      return;
    }

    // Reveal the print watermark just before printing
    const printWatermark = document.getElementById("print-watermark");
    if (printWatermark) printWatermark.style.display = "block";

    // Hide it again after printing is done or cancelled
    const onAfterPrint = () => {
      if (printWatermark) printWatermark.style.display = "none";
      window.removeEventListener("afterprint", onAfterPrint);
    };
    window.addEventListener("afterprint", onAfterPrint, { once: true });

    // Firefox silently ignores window.print() without throwing — so we detect
    // failure by checking if the beforeprint event fires within a timeout.
    let printDialogOpened = false;
    const onBeforePrint = () => { printDialogOpened = true; };
    window.addEventListener("beforeprint", onBeforePrint, { once: true });

    try {
      window.print();
    } catch (err) {
      // Thrown in some edge cases (e.g. sandboxed iframes)
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      if (printWatermark) printWatermark.style.display = "none";
      console.error("Print failed:", err);
      alert(
        "Printing is blocked or restricted in your browser. Please use the 'Save PDF' button to download a copy instead."
      );
      return;
    }

    // Give the browser a moment to fire beforeprint. If it doesn't, print was silently blocked.
    setTimeout(() => {
      window.removeEventListener("beforeprint", onBeforePrint);
      if (!printDialogOpened) {
        window.removeEventListener("afterprint", onAfterPrint);
        if (printWatermark) printWatermark.style.display = "none";
        alert(
          "It looks like your browser blocked the print dialog (this can happen in Firefox or restricted environments). Please use the 'Save PDF' button to download a copy instead."
        );
      }
    }, 500);
  };

  return (
    <Button
      variant="outline"
      size="default"
      className="gap-1.5"
      onClick={handlePrint}
    >
      <Printer size={15} /> Print Payslip
    </Button>
  );
}

function ViewPayslipPage() {
  const { payslipId } = Route.useSearch();
  const { currencySymbol } = useSystemSettings();
  const fmt = (n: number) => `${currencySymbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  const session = authClient.useSession();
  const currentUserEmail = session.data?.user.email || "Unknown User";
  const isHrOrAdmin = session.data?.user.role === "admin" || session.data?.user.role === "hr";

  const query = useRpcQuery<PayslipDetail>(["payslip", payslipId], () =>
    (client.hr.payroll.payslips as any)[":id"].$get({ param: { id: String(payslipId) } })
  );

  const p = query.data;

  const navigate = useNavigate();
  const [isEditing, setIsEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [downloadingPdf, setDownloadingPdf] = React.useState(false);

  // Editable fields
  const [basicSalary, setBasicSalary] = React.useState(0);
  const [hra, setHra] = React.useState(0);
  const [conveyance, setConveyance] = React.useState(0);
  const [medical, setMedical] = React.useState(0);
  const [special, setSpecial] = React.useState(0);
  const [epf, setEpf] = React.useState(0);
  const [esi, setEsi] = React.useState(0);
  const [professionalTax, setProfessionalTax] = React.useState(0);
  const [otherDeductions, setOtherDeductions] = React.useState(0);
  const [leaveDaysTaken, setLeaveDaysTaken] = React.useState(0);
  const [leaveDeduction, setLeaveDeduction] = React.useState(0);

  // Initialize edit fields when data is loaded
  React.useEffect(() => {
    if (p) {
      setBasicSalary(p.basicSalary);
      setHra(p.hra);
      setConveyance(p.conveyance);
      setMedical(p.medical);
      setSpecial(p.special);
      setEpf(p.epf);
      setEsi(p.esi);
      setProfessionalTax(p.professionalTax);
      setOtherDeductions(p.otherDeductions);
      setLeaveDaysTaken(p.leaveDaysTaken);
      setLeaveDeduction(p.leaveDeduction);
    }
  }, [p, isEditing]);

  if (query.isLoading) {
    return (
      <ModuleLayout title="Payslip" description="Loading payslip details...">
        <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
          Loading payslip…
        </div>
      </ModuleLayout>
    );
  }

  if (query.isError || !p) {
    return (
      <ModuleLayout title="Payslip" description="Could not load payslip.">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <p className="text-muted-foreground">Payslip not found or an error occurred.</p>
          <Link to="/hr/payroll">
            <Button variant="outline"><ArrowLeft size={14} className="mr-1" /> Back to Payroll</Button>
          </Link>
        </div>
      </ModuleLayout>
    );
  }

  const currentBasic = isEditing ? basicSalary : p.basicSalary;
  const currentHra = isEditing ? hra : p.hra;
  const currentConveyance = isEditing ? conveyance : p.conveyance;
  const currentMedical = isEditing ? medical : p.medical;
  const currentSpecial = isEditing ? special : p.special;
  const currentEpf = isEditing ? epf : p.epf;
  const currentEsi = isEditing ? esi : p.esi;
  const currentProfTax = isEditing ? professionalTax : p.professionalTax;
  const currentOtherDed = isEditing ? otherDeductions : p.otherDeductions;
  const currentLeaveDays = isEditing ? leaveDaysTaken : p.leaveDaysTaken;
  const currentLeaveDeduction = isEditing ? leaveDeduction : p.leaveDeduction;

  const gross = currentBasic + currentHra + currentConveyance + currentMedical + currentSpecial;
  const statutoryDeductions = currentEpf + currentEsi + currentProfTax + currentOtherDed;
  const totalDeductions = statutoryDeductions + currentLeaveDeduction;
  const netSalary = Math.max(0, gross - totalDeductions);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await (client.hr.payroll.payslips as any)[":id"].edit.$post({
        param: { id: String(payslipId) },
        json: {
          basicSalary,
          hra,
          conveyance,
          medical,
          special,
          epf,
          esi,
          professionalTax,
          otherDeductions,
          leaveDaysTaken,
          leaveDeduction
        }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      const newPayslip = await res.json();
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["payslips"] });
      queryClient.invalidateQueries({ queryKey: ["payslip", newPayslip.id] });
      navigate({ to: "/hr/view-payslip", search: { payslipId: newPayslip.id } });
    } catch (err) {
      alert("Failed to save changes: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const saveAsPdf = async () => {
    const element = document.getElementById("printable-payslip");
    if (!element) return;

    setDownloadingPdf(true);
    try {
      // @ts-ignore
      const html2canvas = (await import("html2canvas-pro")).default;
      // @ts-ignore
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#f8fafc",
        onclone: (clonedDoc: Document) => {
          const watermark = clonedDoc.getElementById("pdf-watermark");
          if (watermark) {
            watermark.style.display = "block";
          }
        }
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const imgWidth = 190; // A4 is 210mm wide, leaving 10mm margin on each side
      const pageHeight = 277; // A4 is 297mm high, leaving room for margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10; // Start with 10mm top margin

      pdf.addImage(imgData, "JPEG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10; // offset for subsequent pages
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`payslip-${p.employeeCode}-${p.month.replace(/\s+/g, "-")}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try printing the page instead.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <ModuleLayout
      title="Salary Slip"
      description={`${p.name} · ${p.month}`}
    >
      {/* Action Bar (hidden on print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <Link to="/hr/payroll">
          <Button variant="ghost" className="gap-1.5 -ml-2" disabled={saving}>
            <ArrowLeft size={15} /> Back to Payroll
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="default"
                className="gap-1 text-slate-500"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                <X size={14} /> Cancel
              </Button>
              <Button
                variant="default"
                size="default"
                className="gap-1"
                onClick={handleSave}
                disabled={saving}
              >
                <Check size={14} /> Save Changes
              </Button>
            </>
          ) : (
            <>
              <Badge
                className={`capitalize ${
                  p.status === "Active"
                    ? ""
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {p.status} (v{p.version})
              </Badge>
              {isHrOrAdmin && p.status === "Active" && (
                <Button
                  variant="outline"
                  size="default"
                  className="gap-1"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil size={13} /> Edit
                </Button>
              )}
              <Button
                variant="outline"
                size="default"
                className="gap-1.5"
                onClick={saveAsPdf}
                disabled={downloadingPdf}
              >
                <Download size={15} className={downloadingPdf ? "animate-spin" : ""} />
                {downloadingPdf ? "Generating..." : "Save PDF"}
              </Button>
              <PrintButton userEmail={currentUserEmail} />
            </>
          )}
        </div>
      </div>

      {/* Printable payslip document */}
      <div id="printable-payslip" className="max-w-4xl mx-auto space-y-6">

        {/* ── Corporate Payslip Card ── */}
        <div className="rounded-xl border bg-white text-slate-900 shadow-sm overflow-hidden">
          {/* Header band */}
          <div className="bg-slate-900 text-white px-4 sm:px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 print:bg-white print:text-slate-900 print:border-b print:border-slate-200">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">ACME HOSPITAL GROUP</h1>
              <p className="text-xs text-slate-400 mt-0.5 print:text-slate-500">12, Healthcare Blvd, Medical District, New Delhi – 110001</p>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest print:text-slate-500">Salary Slip</p>
              <p className="text-lg font-bold">{p.month}</p>
              <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                p.status === "Active" ? "bg-emerald-500/20 text-emerald-300 print:bg-emerald-100 print:text-emerald-800" : "bg-slate-500/30 text-slate-300 print:bg-slate-100 print:text-slate-700"
              }`}>
                {p.status} · v{p.version}
              </span>
            </div>
          </div>

          {/* Employee meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 sm:px-8 py-5 border-b bg-slate-50 text-xs">
            <table>
              <tbody>
                {[
                  ["Employee Code", p.employeeCode],
                  ["Name", p.name],
                  ["Designation", p.role],
                  ["Department", p.departmentName ?? "General"],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td className="text-slate-500 font-semibold py-1 pr-4 w-32">{label}</td>
                    <td className="text-slate-800 py-1 font-medium">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table>
              <tbody>
                {[
                  ["Payment Mode", "Bank Transfer"],
                  ["Generated On", new Date(p.createdAt).toLocaleDateString("en-IN")],
                  ["Leave Days Taken", String(currentLeaveDays)],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td className="text-slate-500 font-semibold py-1 pr-4 w-32">{label}</td>
                    <td className={`py-1 font-medium ${label === "Leave Days Taken" && currentLeaveDays > 0 ? "text-amber-600" : "text-slate-800"}`}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Earnings & Deductions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-0 px-4 sm:px-8 py-6 text-xs border-b">
            {/* Earnings */}
            <div className="pr-0 md:pr-8 border-b md:border-b-0 md:border-r pb-6 md:pb-0">
              <h4 className="font-bold uppercase tracking-widest text-slate-500 mb-3">Earnings</h4>
              <table className="w-full">
                <tbody>
                  {([
                    ["Basic Salary", currentBasic, setBasicSalary],
                    ["House Rent Allowance (HRA)", currentHra, setHra],
                    ["Conveyance Allowance", currentConveyance, setConveyance],
                    ["Medical Reimbursement", currentMedical, setMedical],
                    ["Special Allowance", currentSpecial, setSpecial],
                  ] as SalaryTuple[]).map(([label, val, setter]) => (
                    <tr key={label as string} className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-600">{label}</td>
                      <td className="py-1.5 text-right text-slate-800 font-medium">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={val as number}
                            onChange={(e) => (setter as any)(Number(e.target.value))}
                            className="w-24 text-right border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                          />
                        ) : (
                          fmt(val as number)
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold text-slate-800 border-t border-slate-300">
                    <td className="pt-3 pb-1">Gross Earnings (A)</td>
                    <td className="pt-3 pb-1 text-right">{fmt(gross)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions */}
            <div className="pl-0 md:pl-8 pt-6 md:pt-0">
              <h4 className="font-bold uppercase tracking-widest text-slate-500 mb-3">Deductions</h4>
              <table className="w-full">
                <tbody>
                  {([
                    ["Employee Provident Fund (EPF)", currentEpf, setEpf],
                    ["Employee State Insurance (ESI)", currentEsi, setEsi],
                    ["Professional Tax (PT)", currentProfTax, setProfessionalTax],
                    ["Other Deductions", currentOtherDed, setOtherDeductions],
                  ] as SalaryTuple[]).map(([label, val, setter]) => (
                    <tr key={label as string} className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-600">{label}</td>
                      <td className="py-1.5 text-right text-slate-800 font-medium">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={val as number}
                            onChange={(e) => (setter as any)(Number(e.target.value))}
                            className="w-24 text-right border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                          />
                        ) : (
                          fmt(val as number)
                        )}
                      </td>
                    </tr>
                  ))}
                  {isEditing ? (
                    <>
                      <tr className="border-b border-amber-100 bg-amber-50/50">
                        <td className="py-1.5 text-amber-700 font-medium">
                          Leave Days Taken
                        </td>
                        <td className="py-1.5 text-right font-medium">
                          <input
                            type="number"
                            min="0"
                            value={currentLeaveDays}
                            onChange={(e) => setLeaveDaysTaken(Number(e.target.value))}
                            className="w-24 text-right border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-amber-100 bg-amber-50/50">
                        <td className="py-1.5 text-amber-700 font-medium">
                          Leave Deduction
                        </td>
                        <td className="py-1.5 text-right font-medium">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={currentLeaveDeduction}
                            onChange={(e) => setLeaveDeduction(Number(e.target.value))}
                            className="w-24 text-right border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                          />
                        </td>
                      </tr>
                    </>
                  ) : (
                    currentLeaveDays > 0 && (
                      <tr className="border-b border-amber-100 bg-amber-50/50">
                        <td className="py-1.5 text-amber-700 font-medium">
                          Leave Deduction ({currentLeaveDays} day{currentLeaveDays !== 1 ? "s" : ""})
                        </td>
                        <td className="py-1.5 text-right text-amber-700 font-semibold">
                          {fmt(currentLeaveDeduction)}
                        </td>
                      </tr>
                    )
                  )}
                  <tr className="font-bold text-slate-800 border-t border-slate-300">
                    <td className="pt-3 pb-1">Total Deductions (B)</td>
                    <td className="pt-3 pb-1 text-right">{fmt(totalDeductions)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Salary */}
          <div className="px-4 sm:px-8 py-5 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 print:bg-slate-50 print:text-slate-900 print:border-t print:border-slate-200">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest print:text-slate-500">
                Net Take-Home (A − B)
              </p>
              <p className="text-2xl font-extrabold mt-0.5 print:text-slate-950">{fmt(netSalary)}</p>
            </div>
            <p className="text-[10px] text-slate-500 max-w-xs text-left sm:text-right leading-relaxed print:text-slate-600">
              This is a computer-generated payslip and does not require a physical signature.
            </p>
          </div>
        </div>

        {/* ── Leave Balance Card ── */}
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-4 sm:px-8 py-4 border-b flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm text-slate-800">
              Annual Leave Balance — {p.month.slice(0, 4)}
            </h2>
          </div>
          {p.leaveBalance.length === 0 ? (
            <div className="px-4 sm:px-8 py-6 text-sm text-muted-foreground">No leave types configured.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-4 sm:px-8 py-3 font-semibold text-slate-500 uppercase tracking-wider">Leave Type</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider">Entitlement</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider">Taken (YTD)</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider">Remaining</th>
                    <th className="hidden sm:table-cell px-4 sm:px-8 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {p.leaveBalance.map((lb) => {
                    const pct = lb.maxDays > 0 ? Math.min(100, (lb.takenDays / lb.maxDays) * 100) : 0;
                    const isExhausted = lb.remainingDays === 0 && lb.maxDays > 0;
                    return (
                      <tr key={lb.leaveType} className="border-b last:border-0 hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 sm:px-8 py-3 font-medium text-slate-800">{lb.leaveType}</td>
                        <td className="text-center px-4 py-3 text-slate-600">{lb.maxDays}</td>
                        <td className="text-center px-4 py-3">
                          <span className={lb.takenDays > 0 ? "font-semibold text-amber-600" : "text-slate-400"}>
                            {lb.takenDays}
                          </span>
                        </td>
                        <td className="text-center px-4 py-3">
                          <span className={`font-semibold ${isExhausted ? "text-red-600" : "text-emerald-600"}`}>
                            {lb.remainingDays}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-4 sm:px-8 py-3 w-48">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isExhausted ? "bg-red-500" : pct > 75 ? "bg-amber-400" : "bg-emerald-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {isExhausted ? (
                              <TrendingDown size={13} className="text-red-500 shrink-0" />
                            ) : (
                              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PDF-only watermark, hidden on screen & standard print — revealed via onclone in saveAsPdf */}
        <p id="pdf-watermark" style={{ display: "none" }} className="text-center text-[10px] text-muted-foreground mt-4">
          Generated by Acme Hospital ERP · Exported on {new Date().toLocaleString("en-IN")} by {currentUserEmail} · Confidential
        </p>

        {/* Print-only watermark, hidden on screen — revealed via beforeprint in PrintButton, hidden via afterprint */}
        <p id="print-watermark" style={{ display: "none" }} className="text-center text-[10px] text-muted-foreground mt-4">
          Generated by Acme Hospital ERP · Printed on {new Date().toLocaleString("en-IN")} by {currentUserEmail} · Confidential
        </p>
      </div>
    </ModuleLayout>
  );
}
