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
  DollarSign,
  ShieldCheck,
  Ban,
  Building2,
  Landmark,
  Coins,
  Wallet,
  CreditCard,
  AlertCircle,
  FileText,
} from "lucide-react";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { useRpcQuery, queryClient } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { authClient } from "../../../services/auth";
import { Button } from "../../../ui/button";
import { Badge } from "../../../ui/badge";
import { useSystemSettings, useHospitalSettings } from "../../../lib/settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Calendar } from "../../../components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "../../../utils/cn";
import type { StaffRow } from "../../../types";

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
  hrNotes: string | null;
  cooNotes: string | null;
  accountsNotes: string | null;
  createdAt: string;
  employeeCode: string;
  name: string;
  role: string;
  departmentName: string | null;
  leaveBalance: LeaveBalance[];
}



type SalaryTuple = [string, number, React.Dispatch<React.SetStateAction<number>>];



function ViewPayslipPage() {
  const { payslipId } = Route.useSearch();
  const { currencySymbol } = useSystemSettings();
  const hospital = useHospitalSettings();
  const fmt = (n: number) => `${currencySymbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  const session = authClient.useSession();
  const currentUserEmail = session.data?.user.email || "Unknown User";
  const isHrOrAdmin = session.data?.user.role === "admin" || session.data?.user.role === "hr";

  const query = useRpcQuery<PayslipDetail>(["payslip", payslipId], () =>
    (client.hr.payroll.payslips as any)[":id"].$get({ param: { id: String(payslipId) } })
  );

  const p = query.data;

  const staffQuery = useRpcQuery<StaffRow[]>(["staff"], () => client.hr.staff.$get());
  const currentStaff = (staffQuery.data ?? []).find(
    (s: StaffRow) => s.email?.toLowerCase() === session.data?.user.email?.toLowerCase()
  );

  const managementApproversQuery = useRpcQuery<Array<{ id?: number; staffId: number; active: boolean }>>(
    ["masters-management-approvers"],
    () => (client.masters as any)["management-approvers"].$get()
  );

  const isManagementApprover = React.useMemo(() => {
    if (!currentStaff) return false;
    const list = managementApproversQuery.data ?? [];
    return list.some((a) => a.staffId === currentStaff.staffId && a.active);
  }, [currentStaff, managementApproversQuery.data]);

  const canApproveManagement =
    session.data?.user.role === "admin" ||
    isManagementApprover ||
    currentStaff?.role === "Chief Operating Officer";

  const navigate = useNavigate();
  const [isEditing, setIsEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [downloadingPdf, setDownloadingPdf] = React.useState(false);

  // Editable fields
  const [basicSalary, setBasicSalary] = React.useState(0);
  const [hra, setHra] = React.useState(0);
  const [conveyance, setConveyance] = React.useState(0);
  const [skillAllowance, setSkillAllowance] = React.useState(0);
  const [special, setSpecial] = React.useState(0);
  const [earnedLeaveEncashment, setEarnedLeaveEncashment] = React.useState(0);
  const [extraDayAllowance, setExtraDayAllowance] = React.useState(0);
  const [epf, setEpf] = React.useState(0);
  const [esi, setEsi] = React.useState(0);
  const [professionalTax, setProfessionalTax] = React.useState(0);
  const [tds, setTds] = React.useState(0);
  const [securityDeposit, setSecurityDeposit] = React.useState(0);
  const [otherDeductions, setOtherDeductions] = React.useState(0);
  const [lateAttendance, setLateAttendance] = React.useState(0);
  const [leaveDaysTaken, setLeaveDaysTaken] = React.useState(0);
  const [leaveDeduction, setLeaveDeduction] = React.useState(0);
  const [hrNotes, setHrNotes] = React.useState("");

  const isAccountsOrAdmin =
    session.data?.user.role === "admin" ||
    currentStaff?.departmentName === "Accounts";

  const canEditPaymentDetails = isAccountsOrAdmin || session.data?.user.role === "hr";

  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [editPaymentMode, setEditPaymentMode] = React.useState<"Cash" | "Bank Transfer" | "Cheque">("Bank Transfer");
  const [editBankName, setEditBankName] = React.useState("");
  const [editAccountNumber, setEditAccountNumber] = React.useState("");
  const [editIfscCode, setEditIfscCode] = React.useState("");
  const [editChequeNumber, setEditChequeNumber] = React.useState("");
  const [editChequeDate, setEditChequeDate] = React.useState("");
  const [savingPaymentDetails, setSavingPaymentDetails] = React.useState(false);

  const banksQuery = useRpcQuery<Array<{ id: number; name: string }>>(["masters-banks"], () => (client.masters as any).banks.$get());
  const bankOptions = banksQuery.data ?? [];

  // Initialize edit fields when data is loaded
  React.useEffect(() => {
    if (p) {
      setBasicSalary(Number(p.basicSalary ?? 0));
      setHra(Number(p.hra ?? 0));
      setConveyance(Number(p.conveyance ?? 0));
      setSkillAllowance(Number(p.skillAllowance ?? 0));
      setSpecial(Number(p.special ?? 0));
      setEarnedLeaveEncashment(Number(p.earnedLeaveEncashment ?? 0));
      setExtraDayAllowance(Number(p.extraDayAllowance ?? 0));
      setEpf(Number(p.epf ?? 0));
      setEsi(Number(p.esi ?? 0));
      setProfessionalTax(Number(p.professionalTax ?? 0));
      setTds(Number(p.tds ?? 0));
      setSecurityDeposit(Number(p.securityDeposit ?? 0));
      setOtherDeductions(Number(p.otherDeductions ?? 0));
      setLateAttendance(Number(p.lateAttendance ?? 0));
      setLeaveDaysTaken(Number(p.leaveDaysTaken ?? 0));
      setLeaveDeduction(Number(p.leaveDeduction ?? 0));
      setHrNotes(p.hrNotes || "");
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

  const currentBasic = Number(isEditing ? basicSalary : p.basicSalary);
  const currentHra = Number(isEditing ? hra : p.hra);
  const currentConveyance = Number(isEditing ? conveyance : p.conveyance);
  const currentSkill = Number(isEditing ? skillAllowance : (p.skillAllowance ?? 0));
  const currentSpecial = Number(isEditing ? special : p.special);
  const currentEarnedLeave = Number(isEditing ? earnedLeaveEncashment : (p.earnedLeaveEncashment ?? 0));
  const currentExtraDay = Number(isEditing ? extraDayAllowance : (p.extraDayAllowance ?? 0));

  const currentEpf = Number(isEditing ? epf : p.epf);
  const currentEsi = Number(isEditing ? esi : p.esi);
  const currentProfTax = Number(isEditing ? professionalTax : p.professionalTax);
  const currentTds = Number(isEditing ? tds : (p.tds ?? 0));
  const currentSecDep = Number(isEditing ? securityDeposit : (p.securityDeposit ?? 0));
  const currentOtherDed = Number(isEditing ? otherDeductions : p.otherDeductions);
  const currentLateAttendance = Number(isEditing ? lateAttendance : p.lateAttendance);
  const currentLeaveDays = Number(isEditing ? leaveDaysTaken : p.leaveDaysTaken);
  const currentLeaveDeduction = Number(isEditing ? leaveDeduction : p.leaveDeduction);

  const gross = currentBasic + currentHra + currentConveyance + currentSkill + currentSpecial + currentEarnedLeave + currentExtraDay;
  const statutoryDeductions = currentEpf + currentEsi + currentProfTax + currentTds + currentSecDep + currentOtherDed + currentLateAttendance;
  const totalDeductions = statutoryDeductions + currentLeaveDeduction;
  const netSalary = Math.max(0, gross - totalDeductions);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await (client.hr.payroll.payslips as any)[":id"].edit.$post({
        param: { id: String(payslipId) },
        json: {
          basicSalary: Number(basicSalary),
          hra: Number(hra),
          conveyance: Number(conveyance),
          skillAllowance: Number(skillAllowance),
          special: Number(special),
          earnedLeaveEncashment: Number(earnedLeaveEncashment),
          extraDayAllowance: Number(extraDayAllowance),
          epf: Number(epf),
          esi: Number(esi),
          professionalTax: Number(professionalTax),
          tds: Number(tds),
          securityDeposit: Number(securityDeposit),
          otherDeductions: Number(otherDeductions),
          lateAttendance: Number(lateAttendance),
          leaveDaysTaken: Number(leaveDaysTaken),
          leaveDeduction: Number(leaveDeduction),
          hrNotes: hrNotes.trim() || null,
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

  const handleApprove = async (targetStatus: "Approved by HR" | "Approved by Management" | "Approved by COO" | "Paid" | "Cancelled") => {
    if (targetStatus === "Paid" && (p?.paymentMode || "Bank Transfer").toLowerCase() === "cash") {
      const confirmPaid = window.confirm(
        "Mark this payslip as PAID?\n\nSince the payment mode is CASH, an expense item will be automatically created in today's Accounts Daily Closing Report."
      );
      if (!confirmPaid) return;
    }

    const promptMsg = {
      "Approved by HR": "Enter optional HR approval narration / note:",
      "Approved by Management": "Enter optional Management approval narration / note:",
      "Approved by COO": "Enter optional Management approval narration / note:",
      "Paid": "Enter optional payment reference or Accounts note:",
      "Cancelled": "Enter reason for cancellation:"
    }[targetStatus];

    const note = window.prompt(promptMsg);
    if (note === null) return; // cancelled

    setSaving(true);
    try {
      const res = await (client.hr.payroll.payslips as any)[":id"].approve.$post({
        param: { id: String(payslipId) },
        json: { targetStatus, note }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      queryClient.invalidateQueries({ queryKey: ["payslips"] });
      queryClient.invalidateQueries({ queryKey: ["payslip", payslipId] });
      if (targetStatus === "Paid" && (p?.paymentMode || "Bank Transfer").toLowerCase() === "cash") {
        alert("Payslip marked as Paid. A Cash Salary Expense item has been automatically added to today's Daily Closing Report.");
      }
    } catch (err) {
      alert("Failed to update status: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaymentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPaymentDetails(true);
    try {
      const res = await fetch(`/api/hr/payroll/payslips/${p.id}/payment-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMode: editPaymentMode,
          bankName: editPaymentMode !== "Cash" ? editBankName : null,
          accountNumber: editPaymentMode === "Bank Transfer" ? editAccountNumber : null,
          ifscCode: editPaymentMode === "Bank Transfer" ? editIfscCode : null,
          chequeNumber: editPaymentMode === "Cheque" ? editChequeNumber : null,
          chequeDate: editPaymentMode === "Cheque" ? editChequeDate : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save payment details");

      alert("Payment details updated successfully");
      setShowPaymentModal(false);
      queryClient.invalidateQueries({ queryKey: ["payslips"] });
      queryClient.invalidateQueries({ queryKey: ["payslip", p.id] });
    } catch (err: any) {
      alert(err.message || "Failed to update payment details");
    } finally {
      setSavingPaymentDetails(false);
    }
  };  const handlePdfAction = async (action: "save" | "print") => {
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
          const watermark = clonedDoc.getElementById("payslip-watermark");
          if (watermark) {
            watermark.style.display = "block";
          }
          // Force a stylesheet to override all dark mode backgrounds to light for PDF generation
          const style = clonedDoc.createElement("style");
          style.innerHTML = `
            #printable-payslip {
              background-color: #f8fafc !important;
              color: #0f172a !important;
            }
            #printable-payslip .print\\:hidden {
              display: none !important;
            }
            #printable-payslip .bg-card, #printable-payslip > div {
              background-color: white !important;
              color: #0f172a !important;
              border-color: #e2e8f0 !important;
            }
            #printable-payslip .bg-slate-50\\/50, 
            #printable-payslip .dark\\:bg-slate-900\\/50, 
            #printable-payslip .bg-slate-50, 
            #printable-payslip .dark\\:bg-slate-900\\/40,
            #printable-payslip .payslip-payment-details {
              background-color: #f1f5f9 !important;
              border-color: #cbd5e1 !important;
            }
            #printable-payslip .payslip-payment-details > div > div {
              background-color: #ffffff !important;
              border-color: #e2e8f0 !important;
            }
            #printable-payslip .payslip-remarks {
              background-color: #fafafa !important;
              border-color: #e2e8f0 !important;
            }
            #printable-payslip .payslip-remarks > div {
              background-color: #f3f4f6 !important;
              border-color: #e5e7eb !important;
              color: #1f2937 !important;
            }
            #printable-payslip .text-foreground, 
            #printable-payslip td, 
            #printable-payslip th, 
            #printable-payslip h1, 
            #printable-payslip h2, 
            #printable-payslip h3, 
            #printable-payslip h4, 
            #printable-payslip p, 
            #printable-payslip span {
              color: #0f172a !important;
            }
            #printable-payslip .text-muted-foreground, 
            #printable-payslip .text-slate-500 {
              color: #64748b !important;
            }
            #printable-payslip .border-border, 
            #printable-payslip .border-border\\/60, 
            #printable-payslip tr, 
            #printable-payslip td {
              border-color: #e2e8f0 !important;
            }
            #printable-payslip .bg-muted {
              background-color: #f1f5f9 !important;
            }
            #printable-payslip .payslip-header, 
            #printable-payslip .payslip-footer {
              background-color: #f1f5f9 !important;
              color: #0f172a !important;
              border-color: #e2e8f0 !important;
            }
            #printable-payslip .payslip-header *, 
            #printable-payslip .payslip-footer * {
              color: #0f172a !important;
            }
            #printable-payslip .payslip-leave-balance {
              break-before: avoid !important;
              page-break-before: avoid !important;
            }
            #payslip-watermark {
              display: block !important;
            }
          `;
          clonedDoc.head.appendChild(style);
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

      if (action === "save") {
        pdf.save(`payslip-${p.employeeCode}-${p.month.replace(/\s+/g, "-")}.pdf`);
      } else {
        pdf.autoPrint();
        const blobUrl = pdf.output("bloburl");
        window.open(blobUrl, "_blank");
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF.");
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
                  p.status === "Cancelled"
                    ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                    : p.status === "Active" || p.status === "Draft"
                    ? ""
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {p.status} (v{p.version})
              </Badge>
              {isHrOrAdmin && (p.status === "Active" || p.status === "Draft") && (
                <Button
                  variant="outline"
                  size="default"
                  className="gap-1 cursor-pointer"
                  onClick={() => setIsEditing(true)}
                  disabled={saving}
                >
                  <Pencil size={13} /> Edit
                </Button>
              )}
              {isHrOrAdmin && (p.status === "Active" || p.status === "Draft") && (
                <Button
                  variant="default"
                  size="default"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  onClick={() => handleApprove("Approved by HR")}
                  disabled={saving}
                >
                  <CheckCircle2 size={14} /> Approve as HR
                </Button>
              )}
              {canApproveManagement && p.status === "Approved by HR" && (
                <Button
                  variant="default"
                  size="default"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  onClick={() => handleApprove("Approved by Management")}
                  disabled={saving}
                >
                  <CheckCircle2 size={14} /> Approve as Management
                </Button>
              )}
              {(currentStaff?.departmentName === "Accounts" || session.data?.user.role === "admin") && (p.status === "Approved by Management" || p.status === "Approved by COO") && (
                <Button
                  variant="default"
                  size="default"
                  className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                  onClick={() => handleApprove("Paid")}
                  disabled={saving}
                >
                  <DollarSign size={14} /> Mark as Paid
                </Button>
              )}
              {(
                (isHrOrAdmin && (p.status === "Draft" || p.status === "Active")) ||
                ((isHrOrAdmin || canApproveManagement) && p.status === "Approved by HR")
              ) && (
                <Button
                  variant="outline"
                  size="default"
                  className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                  onClick={() => handleApprove("Cancelled")}
                  disabled={saving}
                >
                  <Ban size={14} /> Cancel Payslip
                </Button>
              )}
              <Button
                variant="outline"
                size="default"
                className="gap-1.5"
                onClick={() => handlePdfAction("save")}
                disabled={downloadingPdf || saving}
              >
                <Download size={15} className={downloadingPdf ? "animate-spin" : ""} />
                {downloadingPdf ? "Generating..." : "Save PDF"}
              </Button>
              <Button
                variant="outline"
                size="default"
                className="gap-1.5"
                onClick={() => handlePdfAction("print")}
                disabled={downloadingPdf || saving}
              >
                <Printer size={15} className={downloadingPdf ? "animate-spin" : ""} />
                Print Payslip
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Accounts Control & Notification Banner */}
      {p.status === "Approved by Management" && (
        <Card className="max-w-4xl mx-auto mb-6 border-teal-200 bg-teal-50/70 dark:bg-teal-950/40 dark:border-teal-900 print:hidden">
          <CardContent className="py-4 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-teal-600 text-white shrink-0 mt-0.5">
                <DollarSign size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-teal-950 dark:text-teal-200">
                  Passed to Accounts for Payment Processing
                </h4>
                <p className="text-xs text-teal-800 dark:text-teal-300 mt-0.5">
                  Management approval is complete. Accounts can modify payment & banking details below, then click <strong>"Mark as Paid"</strong> to disburse salary.
                  {p.paymentMode === "Cash" && (
                    <span className="block mt-1 font-semibold text-amber-700 dark:text-amber-400">
                      ⚡ Payment mode is set to CASH. Marking as Paid will automatically add a Cash Salary Expense entry in today's Daily Closing Report.
                    </span>
                  )}
                </p>
              </div>
            </div>
            {isAccountsOrAdmin && (
              <Button
                variant="default"
                size="default"
                className="bg-teal-600 hover:bg-teal-700 text-white shrink-0 gap-1.5 cursor-pointer"
                onClick={() => handleApprove("Paid")}
                disabled={saving}
              >
                <DollarSign size={14} /> Mark as Paid
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Printable payslip document */}
      <div id="printable-payslip" className="max-w-4xl mx-auto space-y-6">

        {/* ── Corporate Payslip Card ── */}
        <div className="rounded-xl border bg-card text-foreground border-border shadow-sm overflow-hidden">
          {/* Header band */}
          <div className="payslip-header bg-slate-900 dark:bg-slate-950 text-white px-4 sm:px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 print:border-b print:border-slate-200">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">{hospital.name.toUpperCase()}</h1>
              <p className="text-xs text-slate-400 mt-0.5 print:text-slate-500">{hospital.address}</p>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest print:text-slate-500">Salary Slip</p>
              <p className="text-lg font-bold">{p.month}</p>
              <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                p.status === "Active" || p.status === "Draft" ? "bg-emerald-500/20 text-emerald-300 print:bg-emerald-100 print:text-emerald-800" : "bg-slate-500/30 text-slate-300 print:bg-slate-100 print:text-slate-700"
              }`}>
                {p.status} · v{p.version}
              </span>
            </div>
          </div>

          {/* Employee meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 sm:px-8 py-5 border-b border-border bg-slate-50/50 dark:bg-slate-900/50 text-xs">
            <table>
              <tbody>
                {[
                  ["Employee Code", p.employeeCode],
                  ["Name", p.name],
                  ["Designation", p.role],
                  ["Department", p.departmentName ?? "General"],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td className="text-muted-foreground font-semibold py-1 pr-4 w-32">{label}</td>
                    <td className="text-foreground py-1 font-medium">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table>
              <tbody>
                {[
                  ["Payment Mode", p.paymentMode || "Bank Transfer"],
                  ["Generated On", new Date(p.createdAt).toLocaleDateString("en-IN")],
                  ["Leave Days Taken", String(currentLeaveDays)],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td className="text-muted-foreground font-semibold py-1 pr-4 w-32">{label}</td>
                    <td className={`py-1 font-medium ${label === "Leave Days Taken" && currentLeaveDays > 0 ? "text-amber-600 font-bold" : "text-foreground"}`}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Earnings & Deductions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-0 px-4 sm:px-8 py-6 text-xs border-b border-border">
            {/* Earnings */}
            <div className="pr-0 md:pr-8 border-b md:border-b-0 md:border-r border-border pb-6 md:pb-0">
              <h4 className="font-bold uppercase tracking-widest text-muted-foreground mb-3">Earnings</h4>
              <table className="w-full">
                <tbody>
                  {([
                    ["Basic Salary", currentBasic, setBasicSalary],
                    ["House Rent Allowance (HRA)", currentHra, setHra],
                    ["Conveyance Allowance", currentConveyance, setConveyance],
                    ["Skill Allowance", currentSkill, setSkillAllowance],
                    ["Special Allowance", currentSpecial, setSpecial],
                    ["Earned Leave Encashment", currentEarnedLeave, setEarnedLeaveEncashment],
                    ["Extra Day Allowance", currentExtraDay, setExtraDayAllowance],
                  ] as SalaryTuple[]).map(([label, val, setter]) => (
                    <tr key={label as string} className="border-b border-border/60">
                      <td className="py-1.5 text-muted-foreground">{label}</td>
                      <td className="py-1.5 text-right text-foreground font-medium">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={val as number}
                            onChange={(e) => (setter as any)(Number(e.target.value))}
                            className="w-24 text-right border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary text-xs bg-background text-foreground"
                          />
                        ) : (
                          fmt(val as number)
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold text-foreground border-t border-border">
                    <td className="pt-3 pb-1">Gross Earnings (A)</td>
                    <td className="pt-3 pb-1 text-right">{fmt(gross)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions */}
            <div className="pl-0 md:pl-8 pt-6 md:pt-0">
              <h4 className="font-bold uppercase tracking-widest text-muted-foreground mb-3">Deductions</h4>
              <table className="w-full">
                <tbody>
                  {([
                    ["Employee Provident Fund (EPF)", currentEpf, setEpf],
                    ["Employee State Insurance (ESI)", currentEsi, setEsi],
                    ["Professional Tax (PT)", currentProfTax, setProfessionalTax],
                    ["Tax Deducted at Source (TDS)", currentTds, setTds],
                    ["Security Deposit", currentSecDep, setSecurityDeposit],
                    ["Other Deductions", currentOtherDed, setOtherDeductions],
                    ["Late Attendance", currentLateAttendance, setLateAttendance],
                  ] as SalaryTuple[]).map(([label, val, setter]) => (
                    <tr key={label as string} className="border-b border-border/60">
                      <td className="py-1.5 text-muted-foreground">{label}</td>
                      <td className="py-1.5 text-right text-foreground font-medium">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={val as number}
                            onChange={(e) => (setter as any)(Number(e.target.value))}
                            className="w-24 text-right border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary text-xs bg-background text-foreground"
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
                      <tr className="border-b border-amber-250/30 bg-amber-500/5 dark:bg-amber-950/10 text-amber-700 dark:text-amber-300">
                        <td className="py-1.5 font-medium">
                          Leave Deduction
                        </td>
                        <td className="py-1.5 text-right font-medium">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={currentLeaveDeduction}
                            onChange={(e) => setLeaveDeduction(Number(e.target.value))}
                            className="w-24 text-right border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary text-xs bg-background text-foreground"
                          />
                        </td>
                      </tr>
                    </>
                  ) : (
                    currentLeaveDays > 0 && (
                      <tr className="border-b border-amber-250/30 bg-amber-500/5 dark:bg-amber-950/10 text-amber-700 dark:text-amber-300">
                        <td className="py-1.5 font-medium">
                          Leave Deduction ({currentLeaveDays} day{currentLeaveDays !== 1 ? "s" : ""})
                        </td>
                        <td className="py-1.5 text-right font-semibold">
                          {fmt(currentLeaveDeduction)}
                        </td>
                      </tr>
                    )
                  )}
                  <tr className="font-bold text-foreground border-t border-border">
                    <td className="pt-3 pb-1">Total Deductions (B)</td>
                    <td className="pt-3 pb-1 text-right">{fmt(totalDeductions)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Comment / Narration Field (Only when editing) */}
          {isEditing && (
            <div className="px-4 sm:px-8 py-4 border-t border-border bg-amber-500/5 dark:bg-amber-950/10 space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Comment / Narration (Reason for Adjustment)
              </label>
              <textarea
                value={hrNotes}
                onChange={(e) => setHrNotes(e.target.value)}
                placeholder="Enter comment or narration for modifying this payslip (e.g. Annual leave encashment added, manual adjustment)..."
                className="w-full text-xs p-2.5 border border-amber-300 dark:border-amber-800 rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 h-20"
              />
            </div>
          )}

          {/* Payment & Banking Details Section */}
          <div className="payslip-payment-details px-4 sm:px-8 py-4 border-t border-border bg-slate-100 dark:bg-slate-900/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-teal-600 dark:text-teal-400" />
                <h4 className="font-bold text-xs uppercase tracking-widest text-foreground">
                  Payment & Banking Details
                </h4>
              </div>
              {canEditPaymentDetails && p.status !== "Paid" && p.status !== "Cancelled" && (
                <Button
                  variant="outline"
                  size="default"
                  className="h-7 px-2.5 text-xs gap-1 cursor-pointer print:hidden border-teal-600/30 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50"
                  onClick={() => {
                    setEditPaymentMode(p.paymentMode === "Cheque" ? "Cheque" : p.paymentMode === "Cash" ? "Cash" : "Bank Transfer");
                    setEditBankName(p.bankName || "");
                    setEditAccountNumber(p.accountNumber || "");
                    setEditIfscCode(p.ifscCode || "");
                    setEditChequeNumber(p.chequeNumber || "");
                    setEditChequeDate(p.chequeDate || "");
                    setShowPaymentModal(true);
                  }}
                >
                  <Pencil size={12} /> Edit Payment Details
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg border bg-background/80 shadow-2xs">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
                  Payment Mode
                </p>
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  {p.paymentMode === "Cash" ? (
                    <Coins size={14} className="text-amber-600" />
                  ) : p.paymentMode === "Cheque" ? (
                    <FileText size={14} className="text-purple-600" />
                  ) : (
                    <Landmark size={14} className="text-emerald-600" />
                  )}
                  <span>{p.paymentMode || "Bank Transfer"}</span>
                </div>
              </div>

              {p.paymentMode === "Bank Transfer" ? (
                <>
                  <div className="p-2.5 rounded-lg border bg-background/80 shadow-2xs">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
                      Bank Name
                    </p>
                    <p className="font-semibold text-foreground truncate">{p.bankName || "N/A"}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-background/80 shadow-2xs">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
                      Account Number
                    </p>
                    <p className="font-mono font-semibold text-foreground">{p.accountNumber || "N/A"}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-background/80 shadow-2xs">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
                      IFSC Code
                    </p>
                    <p className="font-mono font-semibold text-foreground uppercase">{p.ifscCode || "N/A"}</p>
                  </div>
                </>
              ) : p.paymentMode === "Cheque" ? (
                <>
                  <div className="p-2.5 rounded-lg border bg-background/80 shadow-2xs">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
                      Bank Name
                    </p>
                    <p className="font-semibold text-foreground truncate">{p.bankName || "N/A"}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-background/80 shadow-2xs">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
                      Cheque Number
                    </p>
                    <p className="font-mono font-semibold text-foreground">{p.chequeNumber || "N/A"}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-background/80 shadow-2xs">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
                      Cheque Value Date
                    </p>
                    <p className="font-mono font-semibold text-foreground">{p.chequeDate || "N/A"}</p>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-3 p-2.5 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 flex items-center gap-2">
                  <Coins size={16} className="text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                    Disbursement via CASH. (Auto-creates Cash Salary Expense entry in Daily Closing Report upon payment).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Remarks / HR Narration Section (Included in PDF / Print) */}
          {(p.hrNotes || (isEditing && hrNotes)) && (
            <div className="payslip-remarks px-4 sm:px-8 py-3.5 border-t border-border bg-gray-50/50 dark:bg-slate-900/40 text-xs">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5">
                Remarks / HR Narration
              </p>
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700 text-foreground italic leading-relaxed">
                "{isEditing ? hrNotes : p.hrNotes}"
              </div>
            </div>
          )}

          {/* Net Salary */}
          <div className="payslip-footer px-4 sm:px-8 py-4 bg-slate-100/80 dark:bg-slate-900/50 border-t border-border text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Net Take-Home (A − B)
              </p>
              <p className="text-2xl font-extrabold mt-0.5 text-emerald-600 dark:text-emerald-400">{fmt(netSalary)}</p>
            </div>
            <p className="text-[12px] italic text-muted-foreground max-w-xs text-left sm:text-right leading-relaxed">
              This is a computer-generated payslip and does not require a physical signature.
            </p>
          </div>
        </div>

        {/* ── Leave Balance Card ── */}
        <div className="rounded-xl border bg-card border-border shadow-sm overflow-hidden payslip-leave-balance mt-4">
          <div className="px-4 sm:px-8 py-4 border-b border-border flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">
              Annual Leave Balance — {p.month.slice(0, 4)}
            </h2>
          </div>
          {p.leaveBalance.length === 0 ? (
            <div className="px-4 sm:px-8 py-6 text-sm text-muted-foreground">No leave types configured.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="text-left px-4 sm:px-8 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Leave Type</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Entitlement</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Taken (YTD)</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Remaining</th>
                    <th className="hidden sm:table-cell px-4 sm:px-8 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {p.leaveBalance.map((lb) => {
                    const pct = lb.maxDays > 0 ? Math.min(100, (lb.takenDays / lb.maxDays) * 100) : 0;
                    const isExhausted = lb.remainingDays === 0 && lb.maxDays > 0;
                    return (
                      <tr key={lb.leaveType} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-4 sm:px-8 py-3 font-medium text-foreground">{lb.leaveType}</td>
                        <td className="text-center px-4 py-3 text-muted-foreground">{lb.maxDays}</td>
                        <td className="text-center px-4 py-3">
                          <span className={lb.takenDays > 0 ? "font-semibold text-amber-600" : "text-muted-foreground"}>
                            {lb.takenDays}
                          </span>
                        </td>
                        <td className="text-center px-4 py-3">
                          <span className={`font-semibold ${isExhausted ? "text-red-650" : "text-emerald-600"}`}>
                            {lb.remainingDays}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-4 sm:px-8 py-3 w-48">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
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

        {/* Unified Watermark for both PDF and Print */}
        <p id="payslip-watermark" style={{ display: "none" }} className="text-center text-[10px] text-muted-foreground mt-4">
          Generated by Acme Hospital ERP · Issued on {new Date().toLocaleString("en-IN")} by {currentUserEmail} · Confidential
        </p>
      </div>

      {/* Approval History Timeline (Screen-only, hidden on print) */}
      <Card className="max-w-4xl mx-auto mt-6 border border-border shadow-xs print:hidden">
        <CardHeader className="py-4 border-b border-border bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-teal-600" />
          <div>
            <CardTitle className="text-sm font-semibold">Workflow & Approval History</CardTitle>
            <CardDescription className="text-[10px]">Track the validation and payment status of this payslip.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="py-5 space-y-4">
          <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 pl-6 space-y-5 text-xs">
            {/* Active / Generation */}
            <div className="relative">
              <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-[9px] font-bold text-slate-600 ring-2 ring-background">
                ✓
              </span>
              <p className="font-semibold text-foreground">Payslip Generated (Active)</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Generated on {new Date(p.createdAt).toLocaleString("en-IN")}
              </p>
            </div>

            {/* Approved by HR */}
            <div className="relative">
              <span className={`absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-background ${
                p.hrNotes || p.status === "Approved by HR" || p.status === "Approved by Management" || p.status === "Approved by COO" || p.status === "Paid"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-900"
              }`}>
                {p.status === "Approved by HR" || p.status === "Approved by Management" || p.status === "Approved by COO" || p.status === "Paid" ? "✓" : "—"}
              </span>
              <p className={`font-semibold ${p.status === "Approved by HR" || p.status === "Approved by Management" || p.status === "Approved by COO" || p.status === "Paid" ? "text-foreground" : "text-muted-foreground"}`}>
                Approved by HR
              </p>
              {p.hrNotes ? (
                <p className="mt-1 p-2 rounded-md bg-muted/60 text-foreground italic border border-border/40">
                  "{p.hrNotes}"
                </p>
              ) : (
                (p.status === "Approved by HR" || p.status === "Approved by Management" || p.status === "Approved by COO" || p.status === "Paid") && (
                  <p className="text-[10px] text-muted-foreground italic mt-0.5">No comments added.</p>
                )
              )}
            </div>

            {/* Approved by Management */}
            <div className="relative">
              <span className={`absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-background ${
                p.cooNotes || p.status === "Approved by Management" || p.status === "Approved by COO" || p.status === "Paid"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-900"
              }`}>
                {p.status === "Approved by Management" || p.status === "Approved by COO" || p.status === "Paid" ? "✓" : "—"}
              </span>
              <p className={`font-semibold ${p.status === "Approved by Management" || p.status === "Approved by COO" || p.status === "Paid" ? "text-foreground" : "text-muted-foreground"}`}>
                Approved by Management
              </p>
              {p.cooNotes ? (
                <p className="mt-1 p-2 rounded-md bg-muted/60 text-foreground italic border border-border/40">
                  "{p.cooNotes}"
                </p>
              ) : (
                (p.status === "Approved by Management" || p.status === "Approved by COO" || p.status === "Paid") && (
                  <p className="text-[10px] text-muted-foreground italic mt-0.5">No comments added.</p>
                )
              )}
            </div>

            {/* Paid */}
            <div className="relative">
              <span className={`absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-background ${
                p.status === "Paid"
                  ? "bg-teal-500 text-white"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-900"
              }`}>
                {p.status === "Paid" ? "✓" : "—"}
              </span>
              <p className={`font-semibold ${p.status === "Paid" ? "text-foreground" : "text-muted-foreground"}`}>
                Paid
              </p>
              {p.accountsNotes ? (
                <p className="mt-1 p-2 rounded-md bg-muted/60 text-foreground italic border border-border/40">
                  "{p.accountsNotes}"
                </p>
              ) : (
                p.status === "Paid" && (
                  <p className="text-[10px] text-muted-foreground italic mt-0.5">No comments added.</p>
                )
              )}
            </div>

            {/* Cancelled */}
            {p.status === "Cancelled" && (
              <div className="relative border-t border-destructive/20 pt-3">
                <span className="absolute -left-[31px] top-3.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-red-700 text-[9px] font-bold ring-2 ring-background dark:bg-red-950/40 dark:text-red-300">
                  ✕
                </span>
                <p className="font-semibold text-destructive">Cancelled</p>
                {(p.accountsNotes || p.cooNotes || p.hrNotes) ? (
                  <p className="mt-1 p-2 rounded-md bg-red-50 dark:bg-red-950/30 text-destructive italic border border-red-200 dark:border-red-900/30">
                    "{p.accountsNotes || p.cooNotes || p.hrNotes}"
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic mt-0.5">No cancellation notes added.</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Payment Details Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-background border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="text-teal-600 h-5 w-5" />
                <h3 className="font-semibold text-base text-foreground">Edit Payment & Banking Details</h3>
              </div>
              <Button
                variant="ghost"
                size="default"
                className="h-8 w-8 p-0 cursor-pointer"
                onClick={() => setShowPaymentModal(false)}
              >
                <X size={16} />
              </Button>
            </div>

            <form onSubmit={handleSavePaymentDetails} className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Payment Mode *</label>
                <select
                  value={editPaymentMode}
                  onChange={(e) => setEditPaymentMode(e.target.value as "Cash" | "Bank Transfer" | "Cheque")}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              {editPaymentMode === "Bank Transfer" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Bank Name</label>
                    <input
                      type="text"
                      list="bank-options-list"
                      placeholder="e.g. State Bank of India"
                      value={editBankName}
                      onChange={(e) => setEditBankName(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <datalist id="bank-options-list">
                      {bankOptions.map((b: any) => (
                        <option key={b.id} value={b.name} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Account Number</label>
                    <input
                      type="text"
                      placeholder="Enter account number"
                      value={editAccountNumber}
                      onChange={(e) => setEditAccountNumber(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN0001234"
                      value={editIfscCode}
                      onChange={(e) => setEditIfscCode(e.target.value.toUpperCase())}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </>
              )}

              {editPaymentMode === "Cheque" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Bank Name *</label>
                    <input
                      type="text"
                      list="bank-options-list"
                      placeholder="e.g. State Bank of India / HDFC"
                      value={editBankName}
                      onChange={(e) => setEditBankName(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <datalist id="bank-options-list">
                      {bankOptions.map((b: any) => (
                        <option key={b.id} value={b.name} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Cheque Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. 000124"
                      value={editChequeNumber}
                      onChange={(e) => setEditChequeNumber(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground block">Cheque Value Date *</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="default"
                          type="button"
                          className={cn(
                            "w-full justify-start text-left font-normal border border-input h-9 px-3 py-1 bg-background text-xs cursor-pointer",
                            !editChequeDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarDays className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                          {editChequeDate ? format(parseISO(editChequeDate), "PPP") : <span>Select cheque value date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-60" align="start">
                        <Calendar
                          mode="single"
                          selected={editChequeDate ? parseISO(editChequeDate) : undefined}
                          onSelect={(date) => setEditChequeDate(date ? format(date, "yyyy-MM-dd") : "")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {editPaymentMode === "Cash" && (
                <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-semibold">Cash Disbursement Selected</p>
                  <p className="mt-0.5 text-[11px]">
                    When Accounts marks this payslip as Paid, a Cash Salary Expense entry will be automatically added to today's Daily Closing Report.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={savingPaymentDetails}
                >
                  Cancel
                </Button>
                <Button type="submit" size="default" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={savingPaymentDetails}>
                  {savingPaymentDetails ? "Saving..." : "Save Details"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
