import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Receipt,
  Plus,
  Check,
  Printer,
  CheckCircle,
  Tag,
  Layers,
  Percent,
  Calendar as CalendarIcon,
  Download,
  Search,
  ArrowUpRight,
  DollarSign,
  Calendar,
  CalendarDays,
  Clock,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  RotateCcw,
  Filter,
  Info,
  AlertCircle,
  MessageCircle,
  Copy,
  Send,
  FileText,
  Share2,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Autocomplete } from "@/ui/autocomplete";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/Field";
import { toast } from "@/lib/toast";
import { toNum } from "@/utils/math";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ComponentFrequencyRow,
  FeeComponent,
  FeeStructure,
  createDefaultComponent,
  createDefaultFrequencyRows,
} from "./fee-structures";

import { CollegeAccessGuard } from "@/components/CollegeAccessGuard";
import { authClient } from "@/services/auth";

export const Route = createFileRoute("/_authenticated/college/fees")({
  component: () => (
    <CollegeAccessGuard>
      <FeeManagementPage />
    </CollegeAccessGuard>
  ),
});

export const getAcademicYear = (dateStr?: string): string => {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  const month = isNaN(d.getMonth()) ? new Date().getMonth() + 1 : d.getMonth() + 1;
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

export interface CollectFeeItem {
  componentId: string;
  name: string;
  selected: boolean;
  baseAmount: number;
  availableFrequencies: ComponentFrequencyRow[];
  selectedFrequencyKey: string;
  unitAmount: number;
  multiplier: number;
  amount: number;
  isFrequencyLocked?: boolean;
  lockedFrequencyLabel?: string;
  isOneTimePaid?: boolean;
  paidReceiptNumber?: string;
  paidDate?: string;
}

const calcInstallmentAmount = (baseAmt: number, row?: ComponentFrequencyRow) => {
  if (!row) return baseAmt;
  const r = Number(row.rebatePercent || 0);
  const s = Number(row.surchargePercent || 0);
  const disc = (baseAmt * r) / 100;
  const extra = (baseAmt * s) / 100;
  const net = Math.max(0, baseAmt - disc + extra);
  const count = row.count || 1;
  return Math.round(net / count);
};

const billingPeriodToFreqKey = (periodType: string): string => {
  switch (periodType) {
    case "month": return "monthly";
    case "semester": return "semester";
    case "quarter": return "quarterly";
    case "academic_year": return "annually";
    default: return "annually";
  }
};

const isTuitionFee = (name: string): boolean => name.toLowerCase().includes("course") || name.toLowerCase().includes("tuition");
const isHostelOnlyFee = (name: string): boolean => {
  const n = (name || "").toLowerCase();
  return n.includes("hostel") && !n.includes("mess");
};
const isMessOnlyFee = (name: string): boolean => {
  const n = (name || "").toLowerCase();
  return n.includes("mess") && !n.includes("hostel");
};
const isHostelOrMessFee = (name: string): boolean => {
  const n = (name || "").toLowerCase();
  return n.includes("hostel") || n.includes("mess");
};
const isAcademicFee = (name: string): boolean => !isHostelOrMessFee(name);

const allowsPeriodMultiplier = (name: string, freqKey?: string): boolean => {
  if (freqKey === "annually" || freqKey === "one_time") return false;
  return isTuitionFee(name) || isHostelOrMessFee(name);
};

const getPeriodIntervalLabel = (type: string | null | undefined): string => {
  switch (type) {
    case "month": return "Monthly";
    case "semester": return "Semester-wise";
    case "quarter": return "Quarterly";
    case "academic_year": return "Annual (Full Year)";
    default: return type || "Semester-wise";
  }
};

export function parseRemarks(remarks: unknown): any {
  if (!remarks) return null;
  if (typeof remarks === "object") return remarks;
  if (typeof remarks === "string") {
    try {
      return JSON.parse(remarks);
    } catch {
      return null;
    }
  }
  return null;
}

export interface FeeTransaction {
  id: number;
  studentId: number;
  studentName: string;
  enrollmentNo: string;
  invoiceNo: string;
  receiptNumber: string;
  feeType?: string;
  paymentFrequency?: string;
  amount: string;
  paymentMode: string;
  paymentDate: string;
  status: string;
  remarks?: any;
  createdAt: string;
}

export interface PaidPeriodInfo {
  period: string;
  receiptNumber: string;
  paymentDate: string;
  feeType: string;
  isHostel: boolean;
  isMess: boolean;
  isAcademic: boolean;
  components: string[];
}

function extractPaidPeriodsFromTx(
  tx: FeeTransaction,
  allPeriodOptions: string[],
  targetPeriodType: string
): PaidPeriodInfo[] {
  const r = parseRemarks(tx.remarks);
  const receiptNumber = tx.receiptNumber;
  const paymentDate = tx.paymentDate;
  const feeType = tx.feeType || "Course Fee";
  const items = Array.isArray(r?.items) ? r.items : [];
  const components = items.map((i: any) => i.name);
  if (components.length === 0 && feeType) {
    components.push(feeType);
  }
  const hasHostelOnly = items.some((i: any) => isHostelOnlyFee(i.name)) || isHostelOnlyFee(feeType);
  const hasMessOnly = items.some((i: any) => isMessOnlyFee(i.name)) || isMessOnlyFee(feeType);
  const hasCombined = items.some((i: any) => i.name?.toLowerCase().includes("hostel & mess")) || feeType?.toLowerCase().includes("hostel & mess");

  const isHostel = hasHostelOnly || hasCombined;
  const isMess = hasMessOnly || hasCombined;
  const isAcademic = items.some((i: any) => isAcademicFee(i.name)) || (components.length === 0 && !isHostelOrMessFee(feeType));

  const result: PaidPeriodInfo[] = [];
  const addPeriod = (p: string) => {
    const trimmed = (p || "").trim();
    if (trimmed && !result.some((x) => x.period.toLowerCase() === trimmed.toLowerCase())) {
      result.push({
        period: trimmed,
        receiptNumber,
        paymentDate,
        feeType,
        isHostel,
        isMess,
        isAcademic,
        components,
      });
    }
  };

  // 1. Array of selectedPeriods
  if (Array.isArray(r?.selectedPeriods) && r.selectedPeriods.length > 0) {
    for (const p of r.selectedPeriods) {
      if (typeof p === "string") addPeriod(p);
    }
  }

  // 2. BillingPeriodValue string
  const bpVal = (r?.billingPeriodValue || "").trim();
  if (bpVal) {
    if (bpVal.startsWith("All 12 Months") || bpVal === "Full Academic Year") {
      if (targetPeriodType === "month") {
        allPeriodOptions.forEach(addPeriod);
      } else {
        addPeriod(bpVal);
      }
    } else if (bpVal.startsWith("All 4 Quarters") || bpVal.startsWith("All Quarters")) {
      if (targetPeriodType === "quarter") {
        allPeriodOptions.forEach(addPeriod);
      } else {
        addPeriod(bpVal);
      }
    } else if (bpVal.startsWith("All Semesters") || bpVal.startsWith("All 8 Semesters")) {
      if (targetPeriodType === "semester") {
        allPeriodOptions.forEach(addPeriod);
      } else {
        addPeriod(bpVal);
      }
    } else {
      const cleanBp = bpVal.replace(/\s*\(\d+[^)]*\)/g, "");
      const parts = cleanBp.split(",").map((s: string) => s.trim());
      for (const part of parts) {
        if (part) addPeriod(part);
      }
    }
  }

  // 3. Fallback to periodLabel if needed
  if (result.length === 0 && r?.periodLabel) {
    const pLabel = (r.periodLabel || "").split("•")[1]?.trim();
    if (pLabel) {
      const cleanP = pLabel.replace(/\s*\(\d+[^)]*\)/g, "");
      cleanP.split(",").forEach((s: string) => addPeriod(s.trim()));
    }
  }

  return result;
}

const formatDiscountLabel = (rawReason?: string | null): string => {
  if (!rawReason || !rawReason.trim()) return "Scholarship / Fee Concession:";
  const trimmed = rawReason.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("scholarship") ||
    lower.startsWith("merit scholarship") ||
    lower.startsWith("concession") ||
    lower.startsWith("fee concession") ||
    lower.startsWith("rebate") ||
    lower.startsWith("discount") ||
    lower.startsWith("waiver") ||
    lower.startsWith("special")
  ) {
    return `${trimmed}:`;
  }
  return `Scholarship / Concession (${trimmed}):`;
};

const buildReceiptPDFDoc = (tx: FeeTransaction, userName?: string): jsPDF => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5",
  });

  // A5 dimensions: 148mm width x 210mm height
  doc.setFillColor(13, 148, 136); // Teal 600
  doc.rect(0, 0, 148, 20, "F");

  // Parse itemized breakdown & target period
  const parsed = parseRemarks(tx.remarks);
  const isAdvanceReceipt = parsed?.isSeatBookingAdvance || tx.feeType?.toLowerCase().includes("seat booking");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ACME COLLEGE OF NURSING", 10, 9);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const feeLabel = isAdvanceReceipt
    ? "SEAT BOOKING ADVANCE PAYMENT RECEIPT"
    : tx.feeType
    ? `${String(tx.feeType).toUpperCase()} RECEIPT`
    : "OFFICIAL FEE PAYMENT RECEIPT";
  doc.text(feeLabel, 10, 15);

  const receiptNo = tx.receiptNumber || "RCP-FEE";
  const paymentDate = tx.paymentDate || format(new Date(), "yyyy-MM-dd");
  const paymentMode = (tx.paymentMode || "cash").toUpperCase();
  const amt = Number(toNum(tx.amount));

  doc.setFontSize(7.5);
  doc.text(`Receipt No: ${receiptNo}`, 138, 9, { align: "right" });
  doc.text(`Payment Date: ${paymentDate}`, 138, 15, { align: "right" });

  const acadYear = parsed?.academicYear || getAcademicYear(tx.paymentDate);
  const periodType = parsed?.billingPeriodType;
  const periodVal = parsed?.billingPeriodValue;

  let periodDetailText = "";
  if (periodVal) {
    if (periodType === "month") {
      periodDetailText = `Months: ${periodVal}`;
    } else if (periodType === "semester") {
      periodDetailText = `Semester: ${periodVal}`;
    } else if (periodType === "quarter") {
      periodDetailText = `Quarter: ${periodVal}`;
    } else if (periodType === "academic_year") {
      periodDetailText = "Full Academic Year";
    } else {
      periodDetailText = periodVal;
    }
  } else if (parsed?.periodLabel) {
    periodDetailText = parsed.periodLabel;
  } else {
    periodDetailText = "Full Academic Year";
  }

  const fullPeriodDisplay = acadYear ? `AY ${acadYear} • ${periodDetailText}` : periodDetailText;

  // Student & Payment Meta
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8);

  let metaY = 26;
  const labelX = 10;
  const valueX = 42;
  const lineSpacing = 4.5;

  // Row 1: Student Name
  doc.setFont("helvetica", "bold");
  doc.text("Student Name:", labelX, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(tx.studentName || "N/A", valueX, metaY);
  metaY += lineSpacing;

  // Row 2: Enrollment No
  doc.setFont("helvetica", "bold");
  doc.text(isAdvanceReceipt ? "Application No:" : "Enrollment No:", labelX, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(tx.enrollmentNo || "N/A", valueX, metaY);
  metaY += lineSpacing;

  // Row 3: Target Period / AY (if not advance)
  if (!isAdvanceReceipt) {
    doc.setFont("helvetica", "bold");
    doc.text("Target Period / AY:", labelX, metaY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(13, 148, 136); // Teal highlight
    const periodLines = doc.splitTextToSize(fullPeriodDisplay, 95);
    doc.text(periodLines, valueX, metaY);
    doc.setTextColor(30, 41, 59);
    metaY += periodLines.length * 3.8 + 0.8;
  }

  // Row 4: Fee Category / Items
  doc.setFont("helvetica", "bold");
  doc.text("Fee Category:", labelX, metaY);
  doc.setFont("helvetica", "normal");
  const feeTypeLines = doc.splitTextToSize(tx.feeType || (isAdvanceReceipt ? "Seat Booking Advance" : "Course Fee"), 95);
  doc.text(feeTypeLines, valueX, metaY);
  metaY += feeTypeLines.length * 3.8 + 0.8;

  // Row 5: Payment Mode
  doc.setFont("helvetica", "bold");
  doc.text("Payment Mode:", labelX, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(paymentMode, valueX, metaY);
  metaY += lineSpacing + 1.5;

  const items: Array<{ name: string; frequency: string; amount: number; multiplier?: number }> =
    Array.isArray(parsed) ? parsed : parsed?.items || [];
  const gross = Number(parsed?.grossSubtotal || 0);
  const disc = Number(parsed?.discountAmount || (tx as any)?.discountAmount || 0);
  const rawReason = parsed?.discountReason || (tx as any)?.discountReason || "Special Concession";
  const advanceAdjusted = Number(parsed?.advanceAdjustedAmount || 0);
  const advanceReceiptNo = parsed?.advanceReceiptNumber;

  const effectiveGross = gross > 0
    ? gross
    : (items.length > 0 ? items.reduce((s, it) => s + Number(it.amount || 0), 0) : (amt + disc + advanceAdjusted));

  let startY = metaY;

  if (items.length > 0) {
    const tableData = items.map((it) => {
      const scheduleLabel = it.multiplier && it.multiplier > 1
        ? `${it.frequency} (×${it.multiplier})`
        : it.frequency;
      return [
        it.name,
        scheduleLabel,
        `INR ${Number(it.amount || 0).toLocaleString()}`,
      ];
    });

    autoTable(doc, {
      startY: metaY,
      margin: { left: 10, right: 10 },
      head: [["Fee Component", "Selected Schedule / Period", "Amount"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 64 },
        1: { cellWidth: 36, halign: "center" },
        2: { cellWidth: 28, halign: "right" },
      },
    });

    startY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 4 : metaY + 28;
  } else {
    // Single row fallback table if items array is empty
    autoTable(doc, {
      startY: metaY,
      margin: { left: 10, right: 10 },
      head: [["Fee Component / Description", "Billing Schedule", "Amount"]],
      body: [
        [
          tx.feeType || "College Fee",
          periodDetailText || "Standard",
          `INR ${amt.toLocaleString()}`,
        ],
      ],
      theme: "striped",
      headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 64 },
        1: { cellWidth: 36, halign: "center" },
        2: { cellWidth: 28, halign: "right" },
      },
    });

    startY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 5 : metaY + 20;
  }

  // Subtotals, Discounts & Advance Adjustment Section (Cleanly aligned with adequate label width and auto-wrapping)
  if (effectiveGross > amt || disc > 0 || advanceAdjusted > 0) {
    doc.setFontSize(7.5);
    const summaryLabelX = 35; // Generous left start to allow long scholarship descriptions without colliding
    const summaryValueX = 138; // Aligned with the right edge of table
    const maxLabelWidth = 72; // Maximum width for label before auto-wrapping

    if (effectiveGross > 0 && (disc > 0 || advanceAdjusted > 0)) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text("Gross Component Subtotal:", summaryLabelX, startY);
      doc.text(`INR ${effectiveGross.toLocaleString()}`, summaryValueX, startY, { align: "right" });
      startY += 4.5;
    }

    if (disc > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 149, 106); // Emerald 600
      const discLabel = formatDiscountLabel(rawReason);
      const labelLines = doc.splitTextToSize(discLabel, maxLabelWidth);
      doc.text(labelLines, summaryLabelX, startY);
      doc.text(`- INR ${disc.toLocaleString()}`, summaryValueX, startY, { align: "right" });
      startY += Math.max(labelLines.length * 3.8, 4.5);
    }

    if (advanceAdjusted > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(14, 116, 144); // Cyan / Teal
      const advLabel = advanceReceiptNo
        ? `Seat Booking Advance Adjusted (${advanceReceiptNo}):`
        : "Seat Booking Advance Adjusted:";
      const labelLines = doc.splitTextToSize(advLabel, maxLabelWidth);
      doc.text(labelLines, summaryLabelX, startY);
      doc.text(`- INR ${advanceAdjusted.toLocaleString()}`, summaryValueX, startY, { align: "right" });
      startY += Math.max(labelLines.length * 3.8, 4.5);
    }

    startY += 2.5;
  } else {
    startY += 1;
  }

  // Total Box
  doc.setFillColor(240, 253, 250); // Teal 50
  doc.setDrawColor(204, 251, 241); // Teal 100
  doc.roundedRect(10, startY, 128, 12, 1.5, 1.5, "FD");

  doc.setTextColor(13, 148, 136);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text(
    (advanceAdjusted > 0 || disc > 0) ? "NET AMOUNT RECEIVED NOW:" : "TOTAL AMOUNT RECEIVED:",
    14,
    startY + 7.5
  );
  doc.setFontSize(9.5);
  doc.text(`INR ${amt.toLocaleString()}`, 134, startY + 7.5, { align: "right" });

  // Optional Note
  if (parsed?.notes) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    doc.text(`* Remarks / Note: ${parsed.notes}`, 10, startY + 16.5);
  }

  // Footer: System generated notice and Prepared by
  doc.setDrawColor(226, 232, 240); // Slate 200 divider
  doc.line(10, 195, 138, 195);

  doc.setTextColor(71, 85, 105); // Slate 600
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Prepared by: ${userName || "Cashier / Accounts Officer"}`, 10, 201);

  doc.setTextColor(148, 163, 184); // Slate 400
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "italic");
  doc.text("This is a system generated receipt.", 138, 201, { align: "right" });

  return doc;
};

const generateReceiptPDF = (tx: FeeTransaction, userName?: string) => {
  const doc = buildReceiptPDFDoc(tx, userName);
  doc.save(`Receipt-${tx.receiptNumber}.pdf`);
};

const printReceiptPDF = (tx: FeeTransaction, userName?: string) => {
  const doc = buildReceiptPDFDoc(tx, userName);
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(blobUrl, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }
};

export const formatFeeReceiptWhatsAppMessage = (tx: FeeTransaction, student?: any): string => {
  const parsed = parseRemarks(tx.remarks);
  const isAdvanceReceipt = parsed?.isSeatBookingAdvance || tx.feeType?.toLowerCase().includes("seat booking");
  const receiptTitle = isAdvanceReceipt
    ? "SEAT BOOKING ADVANCE PAYMENT RECEIPT"
    : tx.feeType
    ? `${String(tx.feeType).toUpperCase()} RECEIPT`
    : "OFFICIAL FEE PAYMENT RECEIPT";

  const acadYear = parsed?.academicYear || getAcademicYear(tx.paymentDate);
  const periodType = parsed?.billingPeriodType;
  const periodVal = parsed?.billingPeriodValue;
  let periodDetailText = "";
  if (periodVal) {
    if (periodType === "month") periodDetailText = `Months: ${periodVal}`;
    else if (periodType === "semester") periodDetailText = `Semester: ${periodVal}`;
    else if (periodType === "quarter") periodDetailText = `Quarter: ${periodVal}`;
    else if (periodType === "academic_year") periodDetailText = "Full Academic Year";
    else periodDetailText = periodVal;
  } else if (parsed?.periodLabel) {
    periodDetailText = parsed.periodLabel;
  } else {
    periodDetailText = "Full Academic Year";
  }

  const periodDisplay = acadYear ? `AY ${acadYear} • ${periodDetailText}` : periodDetailText;
  const items: Array<{ name: string; frequency: string; amount: number; multiplier?: number }> =
    Array.isArray(parsed) ? parsed : parsed?.items || [];
  const gross = Number(parsed?.grossSubtotal || 0);
  const disc = Number(parsed?.discountAmount || 0);
  const reason = parsed?.discountReason || "Special Concession";
  const advanceAdjusted = Number(parsed?.advanceAdjustedAmount || 0);
  const advanceReceiptNo = parsed?.advanceReceiptNumber;

  const lines: string[] = [];
  lines.push(`*ACME COLLEGE OF NURSING*`);
  lines.push(`🧾 *${receiptTitle}*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*Receipt No:* ${tx.receiptNumber}`);
  lines.push(`*Payment Date:* ${tx.paymentDate}`);
  lines.push(`*Student Name:* ${tx.studentName || student?.name || "Student"}`);
  lines.push(`*Enrollment No:* ${tx.enrollmentNo || student?.enrollmentNo || "N/A"}`);
  if (student?.courseName || student?.batchName) {
    lines.push(`*Program / Batch:* ${student.courseName || student.batchName}`);
  }
  if (!isAdvanceReceipt) {
    lines.push(`*Billing Period:* ${periodDisplay}`);
  }
  lines.push(`*Payment Mode:* ${(tx.paymentMode || "cash").toUpperCase()}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*FEE BREAKDOWN:*`);

  if (items.length > 0) {
    items.forEach((it) => {
      const sch = it.multiplier && it.multiplier > 1 ? ` (${it.frequency} ×${it.multiplier})` : ` (${it.frequency})`;
      lines.push(`• ${it.name}${sch}: ₹${Number(it.amount || 0).toLocaleString()}`);
    });
  } else {
    lines.push(`• ${tx.feeType || "College Fee"}: ₹${Number(toNum(tx.amount)).toLocaleString()}`);
  }

  if (gross > 0 || disc > 0 || advanceAdjusted > 0) {
    lines.push(`┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`);
    if (gross > 0) lines.push(`*Gross Subtotal:* ₹${gross.toLocaleString()}`);
    if (disc > 0) {
      const discTitle = formatDiscountLabel(reason).replace(/:$/, "");
      lines.push(`*Less ${discTitle}:* -₹${disc.toLocaleString()}`);
    }
    if (advanceAdjusted > 0) {
      const advLabel = advanceReceiptNo ? `*Advance Adjusted (#${advanceReceiptNo}):*` : `*Advance Adjusted:*`;
      lines.push(`${advLabel} -₹${advanceAdjusted.toLocaleString()}`);
    }
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*TOTAL AMOUNT PAID: ₹${Number(toNum(tx.amount)).toLocaleString()}*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  if (parsed?.notes) {
    lines.push(`_Remarks / Notes: ${parsed.notes}_`);
  }
  lines.push(`_Status: Verified Official College Receipt_`);
  lines.push(``);
  lines.push(`Thank you! For queries, contact College Accounts.`);

  return lines.join("\n");
};

export const openWhatsAppReceipt = (phone: string, text: string) => {
  let clean = (phone || "").replace(/\D/g, "");
  if (!clean) {
    toast.error("Please enter a valid recipient phone number.");
    return false;
  }
  if (clean.length === 10) {
    clean = `91${clean}`;
  }
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
  return true;
};

export const shareReceiptPDFViaWhatsApp = async (
  tx: FeeTransaction,
  phone: string,
  userName?: string
) => {
  const doc = buildReceiptPDFDoc(tx, userName);
  const filename = `Receipt-${tx.receiptNumber}.pdf`;
  const pdfBlob = doc.output("blob");
  const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });

  let cleanPhone = (phone || "").replace(/\D/g, "");
  if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

  const messageText = `ACME COLLEGE OF NURSING\nOfficial Payment Receipt #${tx.receiptNumber}\nStudent: ${tx.studentName || "Student"}\nAmount: ₹${Number(toNum(tx.amount)).toLocaleString()}\n\nOfficial PDF Receipt attached.`;

  // 1. Try Native Web Share API (attaches actual PDF file directly to WhatsApp on mobile & supported browsers)
  if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: `Receipt-${tx.receiptNumber}`,
        text: messageText,
      });
      toast.success("Receipt PDF shared via WhatsApp!");
      return true;
    } catch (err: any) {
      if (err.name === "AbortError") return false;
    }
  }

  // 2. Desktop Fallback: Automatically save the PDF and launch WhatsApp chat
  doc.save(filename);
  toast.info("Receipt PDF saved! Opening WhatsApp chat so you can attach it...");
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
  window.open(waUrl, "_blank");
  return true;
};

function FeeManagementPage() {
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const currentUserName = session.data?.user?.name || session.data?.user?.email || "Cashier / Accounts Officer";
  const [collectModalOpen, setCollectModalOpen] = React.useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  const [pendingPayload, setPendingPayload] = React.useState<any>(null);
  const [collectItems, setCollectItems] = React.useState<CollectFeeItem[]>([]);
  const [receiptTx, setReceiptTx] = React.useState<FeeTransaction | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = React.useState(false);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = React.useState(false);
  const [whatsAppTx, setWhatsAppTx] = React.useState<FeeTransaction | null>(null);
  const [whatsAppStudent, setWhatsAppStudent] = React.useState<any | null>(null);
  const [whatsAppPhone, setWhatsAppPhone] = React.useState<string>("");

  // Scholarship Rebate percentage on Course Fee state
  const [scholarshipPercent, setScholarshipPercent] = React.useState<number | "">("");
  const [discountMode, setDiscountMode] = React.useState<"scholarship_percent" | "fixed_amount">("scholarship_percent");

  const handleOpenWhatsAppModal = (tx: FeeTransaction) => {
    const st = students.find((s) => s.id === tx.studentId || s.enrollmentNo === tx.enrollmentNo);
    setWhatsAppTx(tx);
    setWhatsAppStudent(st || null);
    const defaultNum = st?.phone || st?.fatherPhone || st?.motherPhone || st?.guardianPhone || "";
    setWhatsAppPhone(defaultNum);
    setWhatsAppModalOpen(true);
  };
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>("");
  const [paymentModeFilter, setPaymentModeFilter] = React.useState<string>("all");
  const [startDateFilter, setStartDateFilter] = React.useState<string>("");
  const [endDateFilter, setEndDateFilter] = React.useState<string>("");
  const [fromPopoverOpen, setFromPopoverOpen] = React.useState<boolean>(false);
  const [toPopoverOpen, setToPopoverOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["nursing", "courses"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/courses");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["nursing", "students"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/students");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const activeStudentOptions = React.useMemo<[string, string][]>(() => {
    return students
      .filter((s) => s.status === "active")
      .map((s) => [
        String(s.id),
        `${s.name} (${s.enrollmentNo}) - ${s.courseName}${s.quotaCategory ? ` [${s.quotaCategory.toUpperCase()}]` : ""}`,
      ]);
  }, [students]);

  const { data: feeStructures = [] } = useQuery<FeeStructure[]>({
    queryKey: ["nursing", "fee-structures"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/fees/structures");
      if (!res.ok) throw new Error("Failed to fetch fee structures");
      return res.json();
    },
  });

  const { data: txResponse, isLoading: isLoadingTx } = useQuery<{
    transactions: FeeTransaction[];
    pagination: {
      page: number;
      pageSize: number;
      totalRecords: number;
      totalPages: number;
    };
    metrics: {
      totalTransactions: number;
      totalCollectedAmount: number;
      filteredCollectedAmount: number;
    };
  }>({
    queryKey: [
      "nursing",
      "fee-transactions",
      currentPage,
      pageSize,
      debouncedSearch,
      paymentModeFilter,
      startDateFilter,
      endDateFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", String(currentPage));
      params.append("pageSize", String(pageSize));
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (paymentModeFilter && paymentModeFilter !== "all") params.append("paymentMode", paymentModeFilter);
      if (startDateFilter) params.append("startDate", startDateFilter);
      if (endDateFilter) params.append("endDate", endDateFilter);

      const res = await fetch(`/api/nursing/fees/transactions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch fee transactions");
      return res.json();
    },
  });

  const feeTransactions = txResponse?.transactions || [];
  const pagination = txResponse?.pagination;
  const totalTransactionsCount = txResponse?.metrics?.totalTransactions ?? 0;
  const totalCollectedAmount = txResponse?.metrics?.totalCollectedAmount ?? 0;
  const filteredCollectedAmount = txResponse?.metrics?.filteredCollectedAmount ?? 0;

  const hasActiveFilters =
    debouncedSearch.length > 0 ||
    paymentModeFilter !== "all" ||
    startDateFilter.length > 0 ||
    endDateFilter.length > 0;

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setPaymentModeFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setCurrentPage(1);
  };

  const collectForm = useForm({
    defaultValues: {
      studentId: 0,
      feeStructureId: 0,
      targetAcademicYear: getAcademicYear(),
      billingPeriodType: "semester", // "semester" | "month" | "quarter" | "academic_year"
      billingPeriodValue: "Semester 1",
      feeType: "Course Fee",
      paymentFrequency: "annually",
      grossAmount: 0,
      discountAmount: 0,
      discountReason: "",
      amount: 0,
      paymentMode: "cash",
      paymentDate: new Date().toISOString().split("T")[0],
      remarks: "",
    },
  });

  // Dynamic period options based on billingPeriodType and academic year
  const watchTargetAcademicYear = collectForm.watch("targetAcademicYear") || getAcademicYear();
  const watchBillingPeriodType = collectForm.watch("billingPeriodType") || "semester";
  const watchStudentId = Number(collectForm.watch("studentId") || 0);
  const watchPaymentDate = collectForm.watch("paymentDate");
  const watchDiscountAmount = Number(collectForm.watch("discountAmount") || 0);

  const selectedStudentForCollect = students.find((s) => s.id === watchStudentId);
  const filteredFeeStructuresForCollect = selectedStudentForCollect?.courseId
    ? feeStructures.filter((fs) => fs.courseId === selectedStudentForCollect.courseId)
    : feeStructures;

  const currentCalYear = new Date().getFullYear();
  const academicYearOptions = [
    `${currentCalYear - 2}-${currentCalYear - 1}`,
    `${currentCalYear - 1}-${currentCalYear}`,
    `${currentCalYear}-${currentCalYear + 1}`,
    `${currentCalYear + 1}-${currentCalYear + 2}`,
    `${currentCalYear + 2}-${currentCalYear + 3}`,
  ];

  const periodValueOptions = React.useMemo(() => {
    if (watchBillingPeriodType === "semester") {
      return [
        "Semester 1",
        "Semester 2",
        "Semester 3",
        "Semester 4",
        "Semester 5",
        "Semester 6",
        "Semester 7",
        "Semester 8",
      ];
    }
    if (watchBillingPeriodType === "quarter") {
      return [
        "Q1 (Apr - Jun)",
        "Q2 (Jul - Sep)",
        "Q3 (Oct - Dec)",
        "Q4 (Jan - Mar)",
      ];
    }
    if (watchBillingPeriodType === "month") {
      const startYear = parseInt(watchTargetAcademicYear.split("-")[0], 10) || currentCalYear;
      const endYear = startYear + 1;
      return [
        `June ${startYear}`,
        `July ${startYear}`,
        `August ${startYear}`,
        `September ${startYear}`,
        `October ${startYear}`,
        `November ${startYear}`,
        `December ${startYear}`,
        `January ${endYear}`,
        `February ${endYear}`,
        `March ${endYear}`,
        `April ${endYear}`,
        `May ${endYear}`,
      ];
    }
    return ["Full Academic Year"];
  }, [watchBillingPeriodType, watchTargetAcademicYear, currentCalYear]);

  const { data: lockedStudentFrequencies = [] } = useQuery<any[]>({
    queryKey: ["nursing", "student-frequencies", watchStudentId, watchTargetAcademicYear],
    queryFn: async () => {
      if (!watchStudentId || watchStudentId <= 0) return [];
      const res = await fetch(
        `/api/nursing/fees/student-frequencies?studentId=${watchStudentId}&academicYear=${watchTargetAcademicYear}`
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!watchStudentId && watchStudentId > 0,
  });

  const { data: studentTransactions = [] } = useQuery<FeeTransaction[]>({
    queryKey: ["nursing", "student-transactions", watchStudentId],
    queryFn: async () => {
      if (!watchStudentId || watchStudentId <= 0) return [];
      const res = await fetch(`/api/nursing/fees/transactions?studentId=${watchStudentId}&pageSize=100`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.transactions || [];
    },
    enabled: !!watchStudentId && watchStudentId > 0,
  });

  // Build a map of periods that have already been paid for this student in this academic year
  const paidPeriodsMap = React.useMemo(() => {
    if (!watchStudentId || studentTransactions.length === 0) return new Map<string, PaidPeriodInfo[]>();

    const map = new Map<string, PaidPeriodInfo[]>();

    studentTransactions.forEach((tx) => {
      if (tx.status === "refunded") return;
      const r = parseRemarks(tx.remarks);
      const txAy = r?.academicYear || "";
      if (txAy && txAy !== watchTargetAcademicYear) return;

      const infos = extractPaidPeriodsFromTx(tx, periodValueOptions, watchBillingPeriodType);
      infos.forEach((info) => {
        const key = info.period.toLowerCase();
        const existing = map.get(key) || [];
        existing.push(info);
        map.set(key, existing);
      });
    });

    return map;
  }, [watchStudentId, studentTransactions, watchTargetAcademicYear, periodValueOptions, watchBillingPeriodType]);

  // Build a map of one-time fee components already paid by this student across all transactions
  const paidOneTimeMap = React.useMemo(() => {
    const map = new Map<string, { receiptNumber: string; paymentDate: string; amount: number }>();
    if (!watchStudentId || studentTransactions.length === 0) return map;

    studentTransactions.forEach((tx) => {
      if (tx.status === "refunded") return;
      const r = parseRemarks(tx.remarks);
      const items = Array.isArray(r?.items) ? r.items : (Array.isArray(r?.breakdown) ? r.breakdown : []);

      if (items.length > 0) {
        items.forEach((item: any) => {
          const isOneTime =
            item.frequencyKey === "one_time" ||
            item.selectedFrequencyKey === "one_time" ||
            (item.frequencyLabel || "").toLowerCase().includes("one-time") ||
            (item.frequency || "").toLowerCase().includes("one-time") ||
            (item.name || "").toLowerCase().includes("security deposit");

          if (isOneTime && item.name) {
            const key = item.name.trim().toLowerCase();
            if (!map.has(key)) {
              map.set(key, {
                receiptNumber: tx.receiptNumber,
                paymentDate: tx.paymentDate,
                amount: toNum(item.amount || item.unitAmount),
              });
            }
          }
        });
      } else if (tx.feeType) {
        const isOneTime =
          tx.paymentFrequency === "one_time" ||
          tx.feeType.toLowerCase().includes("security deposit") ||
          tx.feeType.toLowerCase().includes("one-time");

        if (isOneTime) {
          const key = tx.feeType.trim().toLowerCase();
          if (!map.has(key)) {
            map.set(key, {
              receiptNumber: tx.receiptNumber,
              paymentDate: tx.paymentDate,
              amount: toNum(tx.amount),
            });
          }
        }
      }
    });

    return map;
  }, [watchStudentId, studentTransactions]);

  const getPaidInfoForPeriod = React.useCallback(
    (opt: string) => {
      const list = paidPeriodsMap.get(opt.toLowerCase()) || [];
      if (list.length === 0) return null;

      const hasHostel = collectItems.some((i) => i.selected && isHostelOnlyFee(i.name));
      const hasMess = collectItems.some((i) => i.selected && isMessOnlyFee(i.name));
      const hasAcademic = collectItems.some((i) => i.selected && isAcademicFee(i.name));

      if (hasHostel && !hasMess && !hasAcademic) {
        return list.find((x) => x.isHostel) || null;
      }
      if (hasMess && !hasHostel && !hasAcademic) {
        return list.find((x) => x.isMess) || null;
      }
      if (hasHostel && hasMess) {
        return list.find((x) => x.isHostel || x.isMess) || null;
      }
      if (hasAcademic) {
        return list.find((x) => x.isAcademic) || null;
      }
      return list[0] || null;
    },
    [paidPeriodsMap, collectItems]
  );

  // Detect prior Course Fee payments made for this student in the target academic year
  const priorCoursePaymentsInYear = React.useMemo(() => {
    if (!watchStudentId || studentTransactions.length === 0) return [];
    return studentTransactions.filter((tx) => {
      if (tx.status === "refunded") return false;
      const r = parseRemarks(tx.remarks);
      const txAy = r?.academicYear || "";
      if (txAy && txAy !== watchTargetAcademicYear) return false;

      // Check if this transaction was for Course Fee
      const hasCourseItem = Array.isArray(r?.items) && r.items.some((i: any) => isTuitionFee(i.name));
      const isCourseFeeTx = isTuitionFee(tx.feeType || "") || hasCourseItem;
      return isCourseFeeTx;
    });
  }, [watchStudentId, studentTransactions, watchTargetAcademicYear]);

  // If a prior Course Fee payment has already been recorded in this academic year, lock the interval schedule for Course Fee
  const lockedPeriodIntervalType = React.useMemo(() => {
    if (priorCoursePaymentsInYear.length === 0) return null;
    for (const tx of priorCoursePaymentsInYear) {
      const r = parseRemarks(tx.remarks);
      if (r?.billingPeriodType) {
        return r.billingPeriodType as string;
      }
    }
    const firstFreq = priorCoursePaymentsInYear[0]?.paymentFrequency;
    if (firstFreq === "monthly") return "month";
    if (firstFreq === "quarterly") return "quarter";
    if (firstFreq === "semester") return "semester";
    if (firstFreq === "yearly" || firstFreq === "annually") return "academic_year";
    return null;
  }, [priorCoursePaymentsInYear]);

  const isHostelFeeSelected = collectItems.some((i) => i.selected && isHostelOnlyFee(i.name));
  const isMessFeeSelected = collectItems.some((i) => i.selected && isMessOnlyFee(i.name));
  const watchFeeType = collectForm.watch("feeType");
  const isHostelFeeType = isHostelOrMessFee(watchFeeType || "");
  const isHostelOrMessActive = isHostelFeeSelected || isMessFeeSelected || isHostelFeeType;

  // Selected hostel fee item (if any)
  const selectedHostelItem = collectItems.find((i) => i.selected && isHostelOnlyFee(i.name));
  const isHostelAnnual = selectedHostelItem?.selectedFrequencyKey === "annually";

  // Check if Course Fee is currently selected (or if no specific items are populated yet)
  const isCourseFeeActive = collectItems.length === 0 || collectItems.some((i) => i.selected && isTuitionFee(i.name));

  // Determine if period interval schedule is locked
  const isPeriodIntervalLocked =
    (isHostelFeeSelected && isHostelAnnual) ||
    (isHostelFeeSelected && !isHostelAnnual) ||
    (isMessFeeSelected && !isHostelFeeSelected) ||
    (isCourseFeeActive && !isHostelOrMessActive && !!lockedPeriodIntervalType);

  const [selectedPeriods, setSelectedPeriods] = React.useState<string[]>(["Semester 1"]);

  // Keep selectedPeriods in sync with period type changes and avoid preselecting already paid periods
  const handlePeriodTypeChange = (newType: string) => {
    if (isHostelFeeSelected && !isHostelAnnual && newType !== "month") {
      toast.error("Monthly Hostel Fee is strictly billed on a monthly schedule.");
      return;
    }
    if (isHostelFeeSelected && isHostelAnnual && newType !== "academic_year") {
      toast.error("Annual Hostel Fee is billed on a full academic year schedule.");
      return;
    }
    if (isMessFeeSelected && !isHostelFeeSelected && newType !== "month") {
      toast.error("Mess Fee is billed on a monthly schedule.");
      return;
    }

    if (!isHostelOrMessActive && isCourseFeeActive && lockedPeriodIntervalType && newType !== lockedPeriodIntervalType) {
      toast.error(
        `Period interval type cannot be changed from ${getPeriodIntervalLabel(lockedPeriodIntervalType)} because prior payments were made in AY ${watchTargetAcademicYear}.`
      );
      return;
    }

    collectForm.setValue("billingPeriodType", newType);

    const allOpts =
      newType === "semester"
        ? ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"]
        : newType === "quarter"
        ? ["Q1 (Apr - Jun)", "Q2 (Jul - Sep)", "Q3 (Oct - Dec)", "Q4 (Jan - Mar)"]
        : newType === "month"
        ? (() => {
            const sY = parseInt(watchTargetAcademicYear.split("-")[0], 10) || currentCalYear;
            const eY = sY + 1;
            return [
              `June ${sY}`,
              `July ${sY}`,
              `August ${sY}`,
              `September ${sY}`,
              `October ${sY}`,
              `November ${sY}`,
              `December ${sY}`,
              `January ${eY}`,
              `February ${eY}`,
              `March ${eY}`,
              `April ${eY}`,
              `May ${eY}`,
            ];
          })()
        : ["Full Academic Year"];

    const firstUnpaid = allOpts.find((opt) => !paidPeriodsMap.has(opt.toLowerCase())) || allOpts[0];
    setSelectedPeriods([firstUnpaid]);

    // Sync Course Fee frequency to match the new billing period type
    const newFreqKey = billingPeriodToFreqKey(newType);
    setCollectItems((prev) =>
      prev.map((item) => {
        if (!isTuitionFee(item.name)) return item;
        const targetRow = item.availableFrequencies.find((r) => r.key === newFreqKey) || item.availableFrequencies[0];
        const newUnitAmt = calcInstallmentAmount(item.baseAmount, targetRow);
        const mult = allowsPeriodMultiplier(item.name, newFreqKey) ? 1 : 1;
        return {
          ...item,
          selectedFrequencyKey: newFreqKey,
          unitAmount: newUnitAmt,
          multiplier: mult,
          amount: Math.round(newUnitAmt * mult),
          isFrequencyLocked: true,
          lockedFrequencyLabel: targetRow?.label || newFreqKey,
        };
      })
    );
  };

  // Automatically synchronize period interval type
  React.useEffect(() => {
    if (isHostelFeeSelected && isHostelAnnual && watchBillingPeriodType !== "academic_year") {
      handlePeriodTypeChange("academic_year");
    } else if (isHostelFeeSelected && !isHostelAnnual && watchBillingPeriodType !== "month") {
      handlePeriodTypeChange("month");
    } else if (isMessFeeSelected && !isHostelFeeSelected && watchBillingPeriodType !== "month") {
      handlePeriodTypeChange("month");
    } else if (!isHostelOrMessActive && isCourseFeeActive && lockedPeriodIntervalType && watchBillingPeriodType !== lockedPeriodIntervalType) {
      handlePeriodTypeChange(lockedPeriodIntervalType);
    }
  }, [isHostelFeeSelected, isHostelAnnual, isMessFeeSelected, isHostelOrMessActive, isCourseFeeActive, lockedPeriodIntervalType, watchBillingPeriodType]);

  const togglePeriodSelection = (periodStr: string) => {
    const paidInfo = getPaidInfoForPeriod(periodStr);
    if (paidInfo) {
      toast.error(
        `${periodStr} is already paid (Receipt: ${paidInfo.receiptNumber}) for AY ${watchTargetAcademicYear}. Duplicate payments of the same period are not allowed.`
      );
      return;
    }

    setSelectedPeriods((prev) => {
      if (prev.includes(periodStr)) {
        if (prev.length === 1) {
          toast.error("At least one period must remain selected.");
          return prev;
        }
        return prev.filter((p) => p !== periodStr);
      } else {
        const next = [...prev, periodStr];
        return next.sort((a, b) => {
          const idxA = periodValueOptions.indexOf(a);
          const idxB = periodValueOptions.indexOf(b);
          return idxA - idxB;
        });
      }
    });
  };

  const selectAllPeriods = () => {
    const unpaid = periodValueOptions.filter((opt) => !getPaidInfoForPeriod(opt));
    if (unpaid.length === 0) {
      toast.info("All periods for this billing schedule have already been paid.");
      return;
    }
    setSelectedPeriods(unpaid);
  };

  const selectPeriodPreset = (periods: string[]) => {
    const unpaid = periods.filter((p) => !getPaidInfoForPeriod(p));
    if (unpaid.length === 0) {
      toast.info("All periods in this preset are already paid.");
      return;
    }
    setSelectedPeriods(unpaid);
  };

  // Automatically sanitize selectedPeriods if any become paid upon student or item selection change
  React.useEffect(() => {
    if (selectedPeriods.length > 0) {
      const unpaid = selectedPeriods.filter((p) => !getPaidInfoForPeriod(p));
      if (unpaid.length !== selectedPeriods.length) {
        if (unpaid.length > 0) {
          setSelectedPeriods(unpaid);
        } else {
          const firstUnpaid = periodValueOptions.find((opt) => !getPaidInfoForPeriod(opt));
          if (firstUnpaid) {
            setSelectedPeriods([firstUnpaid]);
          }
        }
      }
    }
  }, [paidPeriodsMap, getPaidInfoForPeriod, periodValueOptions]);

  const formattedPeriodValue = React.useMemo(() => {
    if (selectedPeriods.length === 0) return periodValueOptions[0] || "Semester 1";
    if (selectedPeriods.length === 1) return selectedPeriods[0];
    if (watchBillingPeriodType === "month") {
      if (selectedPeriods.length === 12) return `All 12 Months (Full AY ${watchTargetAcademicYear})`;
      return `${selectedPeriods.join(", ")} (${selectedPeriods.length} Months)`;
    }
    if (watchBillingPeriodType === "semester") {
      if (selectedPeriods.length === periodValueOptions.length) return `All ${selectedPeriods.length} Semesters`;
      return `${selectedPeriods.join(", ")} (${selectedPeriods.length} Semesters)`;
    }
    if (watchBillingPeriodType === "quarter") {
      if (selectedPeriods.length === 4) return `All 4 Quarters (Full Year)`;
      return `${selectedPeriods.join(", ")} (${selectedPeriods.length} Quarters)`;
    }
    return selectedPeriods.join(", ");
  }, [selectedPeriods, watchBillingPeriodType, periodValueOptions, watchTargetAcademicYear]);

  React.useEffect(() => {
    collectForm.setValue("billingPeriodValue", formattedPeriodValue);
  }, [formattedPeriodValue, collectForm]);

  // Adjust component multipliers when selected period count changes
  // Adjust component multipliers when selected period count changes
  React.useEffect(() => {
    setCollectItems((prev) =>
      prev.map((item) => {
        const mult = allowsPeriodMultiplier(item.name, item.selectedFrequencyKey)
          ? selectedPeriods.length
          : 1;
        return {
          ...item,
          multiplier: mult,
          amount: Math.round(item.unitAmount * mult),
        };
      })
    );
  }, [selectedPeriods.length, watchBillingPeriodType]);

  const { data: studentAdvanceInfo, isLoading: isLoadingAdvance } = useQuery<{
    hasAdvance: boolean;
    advanceAmount: number;
    seatBookingStatus: string;
    receiptNumber: string | null;
    paymentDate: string | null;
    paymentMode: string | null;
    applicantId: number | null;
  }>({
    queryKey: ["nursing", "student-advance-balance", watchStudentId],
    queryFn: async () => {
      if (!watchStudentId || watchStudentId <= 0) return { hasAdvance: false, advanceAmount: 0, seatBookingStatus: "none", receiptNumber: null, paymentDate: null, paymentMode: null, applicantId: null };
      const res = await fetch(`/api/nursing/students/${watchStudentId}/advance-balance`);
      if (!res.ok) return { hasAdvance: false, advanceAmount: 0, seatBookingStatus: "none", receiptNumber: null, paymentDate: null, paymentMode: null, applicantId: null };
      return res.json();
    },
    enabled: !!watchStudentId && watchStudentId > 0,
  });

  const [adjustAdvance, setAdjustAdvance] = React.useState<boolean>(true);
  const [customAdvanceAdjusted, setCustomAdvanceAdjusted] = React.useState<number>(0);

  // Sync available advance amount when student advance info loads
  React.useEffect(() => {
    if (studentAdvanceInfo?.hasAdvance && studentAdvanceInfo.advanceAmount > 0) {
      setAdjustAdvance(true);
      setCustomAdvanceAdjusted(studentAdvanceInfo.advanceAmount);
    } else {
      setAdjustAdvance(false);
      setCustomAdvanceAdjusted(0);
    }
  }, [studentAdvanceInfo]);

  const grossCollectSubtotal = React.useMemo(() => {
    return collectItems
      .filter((item) => item.selected)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [collectItems]);

  const selectedCourseFeeTotal = React.useMemo(() => {
    return collectItems
      .filter((item) => item.selected && isTuitionFee(item.name))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [collectItems]);

  // Synchronize scholarship rebate percentage on Course Fee
  React.useEffect(() => {
    if (discountMode === "scholarship_percent") {
      if (typeof scholarshipPercent === "number" && scholarshipPercent > 0) {
        const baseForRebate = selectedCourseFeeTotal > 0 ? selectedCourseFeeTotal : grossCollectSubtotal;
        const rebateAmt = Math.round((baseForRebate * scholarshipPercent) / 100);
        collectForm.setValue("discountAmount", rebateAmt);
        const currentReason = collectForm.getValues("discountReason") || "";
        if (!currentReason || currentReason.startsWith("Scholarship Rebate") || currentReason.startsWith("Merit Scholarship")) {
          collectForm.setValue("discountReason", `Scholarship Rebate (${scholarshipPercent}% on Course Fee)`);
        }
      } else if (scholarshipPercent === 0 || scholarshipPercent === "") {
        const currentReason = collectForm.getValues("discountReason") || "";
        if (currentReason.startsWith("Scholarship Rebate")) {
          collectForm.setValue("discountAmount", 0);
          collectForm.setValue("discountReason", "");
        }
      }
    }
  }, [scholarshipPercent, selectedCourseFeeTotal, discountMode, grossCollectSubtotal, collectForm]);

  const remainingAfterDiscount = React.useMemo(() => {
    return Math.max(0, grossCollectSubtotal - watchDiscountAmount);
  }, [grossCollectSubtotal, watchDiscountAmount]);

  const effectiveAdvanceAdjusted = React.useMemo(() => {
    if (!adjustAdvance || !studentAdvanceInfo?.hasAdvance) return 0;
    const requested = Number(customAdvanceAdjusted || 0);
    return Math.min(requested, Math.min(studentAdvanceInfo.advanceAmount, remainingAfterDiscount));
  }, [adjustAdvance, studentAdvanceInfo, customAdvanceAdjusted, remainingAfterDiscount]);

  const finalNetPayable = React.useMemo(() => {
    return Math.max(0, remainingAfterDiscount - effectiveAdvanceAdjusted);
  }, [remainingAfterDiscount, effectiveAdvanceAdjusted]);

  React.useEffect(() => {
    collectForm.setValue("grossAmount", grossCollectSubtotal);
    collectForm.setValue("amount", finalNetPayable);
  }, [grossCollectSubtotal, finalNetPayable, collectForm]);

  // Sync locked frequencies into collectItems if query resolves after items are populated
  React.useEffect(() => {
    if (lockedStudentFrequencies.length > 0 && collectItems.length > 0) {
      setCollectItems((prev) =>
        prev.map((item) => {
          const lock = lockedStudentFrequencies.find(
            (lf) => (item.componentId && lf.componentId === item.componentId) || lf.componentName.toLowerCase() === item.name.toLowerCase()
          );
          if (lock) {
            const selRow =
              item.availableFrequencies.find((r) => r.key === lock.frequencyKey) ||
              item.availableFrequencies[0];
            const unitAmt = toNum(lock.installmentAmount) > 0 ? toNum(lock.installmentAmount) : calcInstallmentAmount(item.baseAmount, selRow);
            const mult = allowsPeriodMultiplier(item.name, lock.frequencyKey) ? selectedPeriods.length : 1;
            return {
              ...item,
              selectedFrequencyKey: lock.frequencyKey,
              unitAmount: unitAmt,
              multiplier: mult,
              amount: Math.round(unitAmt * mult),
              isFrequencyLocked: true,
              lockedFrequencyLabel: lock.frequencyLabel || selRow?.label,
            };
          }
          return item;
        })
      );
    }
  }, [lockedStudentFrequencies]);

  // Populate multi-fee collection checklist when structure selected
  const handleSelectStructureForCollect = (fsId: number) => {
    collectForm.setValue("feeStructureId", fsId);
    const fs = feeStructures.find((st) => st.id === fsId);
    if (!fs) {
      setCollectItems([]);
      collectForm.setValue("grossAmount", 0);
      collectForm.setValue("amount", 0);
      return;
    }

    let comps: FeeComponent[] = [];
    if (fs.componentsConfig) {
      try {
        comps = JSON.parse(fs.componentsConfig);
      } catch (e) {
        comps = [];
      }
    }
    if (comps.length === 0) {
      comps = [
        createDefaultComponent("1", "Course Fee", toNum(fs.tuitionFee), "annually", toNum(fs.oneTimeRebatePercent), 0),
        createDefaultComponent("2", "Admission Fee", toNum(fs.admissionFee), "annually", 0, 0),
        createDefaultComponent("4", "Uniform Fee", toNum(fs.uniformFee), "annually", 0, 0),
        createDefaultComponent("5", "Hostel Fee", toNum(fs.hostelFee) > 0 ? toNum(fs.hostelFee) : (toNum(fs.hostelMessMonthlyFee) > 0 ? toNum(fs.hostelMessMonthlyFee) * 12 * 0.6 : 36000), "monthly", 0, 0, [
          { id: "f-monthly", key: "monthly", label: "Monthly", count: 12, rebatePercent: 0, surchargePercent: 0 },
          { id: "f-annually", key: "annually", label: "Annually (5% Rebate)", count: 1, rebatePercent: 5, surchargePercent: 0 },
        ]),
        createDefaultComponent("6", "Mess Fee", toNum(fs.hostelMessMonthlyFee) > 0 ? toNum(fs.hostelMessMonthlyFee) * 12 * 0.4 : 24000, "monthly", 0, 0, [
          { id: "f-monthly", key: "monthly", label: "Monthly", count: 12, rebatePercent: 0, surchargePercent: 0 },
          { id: "f-quarterly", key: "quarterly", label: "Quarterly", count: 4, rebatePercent: 0, surchargePercent: 0 },
          { id: "f-semester", key: "semester", label: "Per-Semester", count: 2, rebatePercent: 0, surchargePercent: 0 },
          { id: "f-annually", key: "annually", label: "Annually", count: 1, rebatePercent: 0, surchargePercent: 0 },
        ]),
        createDefaultComponent("7", "Exam Fee", toNum(fs.examFee), "semester", 0, 0),
        createDefaultComponent("8", "Misc Fee", toNum(fs.miscFee), "annually", 0, 0),
      ].filter((c) => c.amount > 0);
    } else {
      comps = comps.map((comp) => {
        const isHostelOnly = comp.name?.toLowerCase().includes("hostel") && !comp.name?.toLowerCase().includes("mess");
        if (isHostelOnly && Array.isArray(comp.frequencyRows)) {
          const hasAnnual = comp.frequencyRows.some((r) => r.key === "annually");
          if (!hasAnnual) {
            return {
              ...comp,
              frequencyRows: [
                ...comp.frequencyRows,
                { id: "f-annually", key: "annually", label: "Annually (5% Rebate)", count: 1, rebatePercent: 5, surchargePercent: 0 },
              ],
            };
          }
        }
        return comp;
      });
    }

    // Ensure Security Deposit (Refundable) is always available as an optional item in collection form
    const hasSecurity = comps.some((c) => c.name.toLowerCase().includes("security"));
    if (!hasSecurity) {
      const depositAmt = toNum(fs.securityDeposit) > 0 ? toNum(fs.securityDeposit) : 5000;
      comps.push({
        id: "comp-security-deposit-opt",
        name: "Security Deposit (Refundable)",
        amount: depositAmt,
        selectedFrequencyKey: "one_time",
        frequencyRows: [
          {
            id: "f-one_time",
            key: "one_time",
            label: "One-Time (Course Duration)",
            count: 1,
            rebatePercent: 0,
            surchargePercent: 0,
          },
        ],
      });
    }

    const items: CollectFeeItem[] = comps.map((c) => {
      const rows =
        c.frequencyRows && c.frequencyRows.length > 0
          ? c.frequencyRows
          : createDefaultFrequencyRows(c.selectedFrequencyKey || "annually");

      const lock = lockedStudentFrequencies.find(
        (lf) => (c.id && lf.componentId === c.id) || lf.componentName.toLowerCase() === c.name.toLowerCase()
      );

      // Tuition Fee: force frequency to match the billing period type
      const tuitionLocked = isTuitionFee(c.name);
      const tuitionFreqKey = billingPeriodToFreqKey(watchBillingPeriodType);

      const selKey = tuitionLocked
        ? tuitionFreqKey
        : lock ? lock.frequencyKey : (c.selectedFrequencyKey || rows[0]?.key || "annually");
      const selRow = rows.find((r) => r.key === selKey) || rows[0];
      const baseAmt = Number(c.amount || 0);
      const unitAmt = lock && toNum(lock.installmentAmount) > 0 ? toNum(lock.installmentAmount) : calcInstallmentAmount(baseAmt, selRow);
      const mult = allowsPeriodMultiplier(c.name, selKey) ? selectedPeriods.length : 1;

      const isOneTime = selKey === "one_time" || c.name.toLowerCase().includes("security deposit");
      const paidOneTimeInfo = isOneTime ? paidOneTimeMap.get(c.name.trim().toLowerCase()) : null;
      const isOneTimePaid = !!paidOneTimeInfo;

      return {
        componentId: c.id,
        name: c.name,
        selected: false,
        baseAmount: baseAmt,
        availableFrequencies: rows,
        selectedFrequencyKey: selKey,
        unitAmount: unitAmt,
        multiplier: mult,
        amount: Math.round(unitAmt * mult),
        isFrequencyLocked: !!lock || tuitionLocked,
        lockedFrequencyLabel: tuitionLocked
          ? (selRow?.label || tuitionFreqKey)
          : lock ? (lock.frequencyLabel || selRow?.label) : undefined,
        isOneTimePaid,
        paidReceiptNumber: paidOneTimeInfo?.receiptNumber,
        paidDate: paidOneTimeInfo?.paymentDate,
      };
    });

    setCollectItems(items);
  };

  // Sync paid one-time fee status into collectItems if studentTransactions loads or changes
  React.useEffect(() => {
    if (collectItems.length > 0) {
      setCollectItems((prev) =>
        prev.map((item) => {
          const isOneTime = item.selectedFrequencyKey === "one_time" || item.name.toLowerCase().includes("security deposit");
          const paidOneTimeInfo = isOneTime ? paidOneTimeMap.get(item.name.trim().toLowerCase()) : null;
          const isOneTimePaid = !!paidOneTimeInfo;
          if (item.isOneTimePaid !== isOneTimePaid || item.paidReceiptNumber !== paidOneTimeInfo?.receiptNumber) {
            return {
              ...item,
              selected: isOneTimePaid ? false : item.selected,
              isOneTimePaid,
              paidReceiptNumber: paidOneTimeInfo?.receiptNumber,
              paidDate: paidOneTimeInfo?.paymentDate,
            };
          }
          return item;
        })
      );
    }
  }, [paidOneTimeMap]);

  const toggleCollectItemSelect = (compId: string) => {
    setCollectItems((prev) => {
      const target = prev.find((item) => item.componentId === compId);
      if (!target) return prev;
      if (target.isOneTimePaid) {
        toast.error(
          `${target.name} is a one-time fee that was already paid in Receipt #${target.paidReceiptNumber} (${target.paidDate}). One-time fees cannot be paid again.`
        );
        return prev;
      }
      const willSelect = !target.selected;

      if (willSelect) {
        if (isHostelOrMessFee(target.name)) {
          // Target is Hostel or Mess fee. Deselect all academic components.
          const hadAcademicSelected = prev.some((item) => item.componentId !== compId && item.selected && !isHostelOrMessFee(item.name));
          if (hadAcademicSelected) {
            toast.info("Hostel & Mess fees must be paid separately from Academic fees. Academic fee components have been deselected.");
          }
          if (isHostelOnlyFee(target.name) && target.selectedFrequencyKey === "annually") {
            handlePeriodTypeChange("academic_year");
          } else {
            handlePeriodTypeChange("month");
          }
          return prev.map((item) => {
            if (!isHostelOrMessFee(item.name)) return { ...item, selected: false };
            if (item.componentId === compId) return { ...item, selected: true };
            return item;
          });
        } else {
          // Target is academic / other fee. Deselect any hostel/mess fee components.
          const hadHostelOrMessSelected = prev.some((item) => isHostelOrMessFee(item.name) && item.selected);
          if (hadHostelOrMessSelected) {
            toast.info("Hostel & Mess fees cannot be clubbed with Academic fees. Hostel/Mess fee has been deselected.");
          }
          return prev.map((item) => {
            if (isHostelOrMessFee(item.name)) return { ...item, selected: false };
            if (item.componentId === compId) return { ...item, selected: true };
            return item;
          });
        }
      } else {
        return prev.map((item) => (item.componentId === compId ? { ...item, selected: false } : item));
      }
    });
  };

  const changeCollectItemSchedule = (compId: string, newFreqKey: string) => {
    setCollectItems((prev) =>
      prev.map((item) => {
        if (item.componentId !== compId || item.isFrequencyLocked || isTuitionFee(item.name) || item.isOneTimePaid) return item;
        const targetRow =
          item.availableFrequencies.find((r) => r.key === newFreqKey) || item.availableFrequencies[0];
        const newUnitAmt = calcInstallmentAmount(item.baseAmount, targetRow);
        const isAnnualOrOneTime = newFreqKey === "annually" || newFreqKey === "one_time";
        const mult = isAnnualOrOneTime ? 1 : (allowsPeriodMultiplier(item.name, newFreqKey) ? selectedPeriods.length : 1);
        const isOneTime = newFreqKey === "one_time" || item.name.toLowerCase().includes("security deposit");
        const paidInfo = isOneTime ? paidOneTimeMap.get(item.name.trim().toLowerCase()) : null;
        const isOneTimePaid = !!paidInfo;
        return {
          ...item,
          selectedFrequencyKey: newFreqKey,
          unitAmount: newUnitAmt,
          multiplier: mult,
          amount: Math.round(newUnitAmt * mult),
          selected: isOneTimePaid ? false : item.selected,
          isOneTimePaid,
          paidReceiptNumber: paidInfo?.receiptNumber,
          paidDate: paidInfo?.paymentDate,
        };
      })
    );

    const changedItem = collectItems.find((i) => i.componentId === compId);
    if (changedItem && isHostelOnlyFee(changedItem.name)) {
      if (newFreqKey === "annually") {
        toast.info("Hostel Fee schedule set to Annual (5% rebate applied).");
        handlePeriodTypeChange("academic_year");
      } else if (newFreqKey === "monthly") {
        toast.info("Hostel Fee schedule set to Monthly.");
        handlePeriodTypeChange("month");
      }
    }
  };



  const collectFeeMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/nursing/fees/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to record fee payment");
      }
      return res.json();
    },
    onSuccess: (tx) => {
      toast.success(`Fee Payment Recorded! Receipt: ${tx.receiptNumber}`);
      queryClient.invalidateQueries({ queryKey: ["nursing", "fee-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "student-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "student-frequencies"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "fees", "due-dashboard"] });
      setConfirmModalOpen(false);
      setCollectModalOpen(false);
      setPendingPayload(null);
      collectForm.reset();
      setCollectItems([]);

      const st = students.find((s) => s.id === tx.studentId);
      setReceiptTx({
        ...tx,
        studentName: st?.name || "Student",
        enrollmentNo: st?.enrollmentNo || "N/A",
      });
      setReceiptModalOpen(true);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record fee payment");
    },
  });



  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-teal-600" />
            Fee Collection & Payment Ledger
          </h1>
          <p className="text-sm text-muted-foreground">
            Record student fee installment collections, manage transaction receipts, and view payment history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild size="sm">
            <Link to="/college/fee-structures" className="flex items-center gap-1.5 text-xs text-teal-600 border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950">
              <Layers size={14} /> Fee Structures Master
            </Link>
          </Button>

          <Button variant="outline" asChild size="sm">
            <Link to="/college/fee-dues" className="flex items-center gap-1.5 text-xs">
              <DollarSign size={14} /> Fee Due Tracking
            </Link>
          </Button>

          <Button variant="outline" asChild size="sm">
            <Link to="/college/academic-schedules" className="flex items-center gap-1.5 text-xs">
              <Calendar size={14} /> Academic Schedules
            </Link>
          </Button>

          {/* Record Fee Payment Modal Trigger */}
          <Dialog open={collectModalOpen} onOpenChange={setCollectModalOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2"
                onClick={() => {
                  collectForm.reset();
                  setCollectItems([]);
                }}
              >
                <Plus size={16} /> Record Fee Payment
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-190"
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-teal-600">
                  <Receipt size={20} /> Multi-Component Student Fee Collection
                </DialogTitle>
              </DialogHeader>

              <form
                onSubmit={collectForm.handleSubmit((data) => {
                  const targetStudent = students.find((s) => s.id === Number(data.studentId));
                  if (!targetStudent) {
                    toast.error("Please select a valid enrolled student.");
                    return;
                  }
                  if (targetStudent.status !== "active") {
                    toast.error(`Selected student is '${targetStudent.status}'. Fees can only be recorded for active students.`);
                    return;
                  }

                  const selectedPaidItems = collectItems
                    .filter((item) => item.selected)
                    .map((item) => {
                      const selRow =
                        item.availableFrequencies.find((r) => r.key === item.selectedFrequencyKey) ||
                        item.availableFrequencies[0];
                      const mult = item.multiplier || 1;
                      return {
                        componentId: item.componentId,
                        name: item.name,
                        quantity: mult,
                        multiplier: mult,
                        unitAmount: item.unitAmount,
                        frequencyKey: item.selectedFrequencyKey,
                        frequency: mult > 1 ? `${selRow?.label || "Installment"} (×${mult})` : (selRow?.label || "Annual"),
                        frequencyLabel: selRow?.label || "Annual",
                        installmentCount: selRow?.count || 1,
                        baseAmount: item.baseAmount,
                        amount: item.amount,
                      };
                    });

                  if (selectedPaidItems.length === 0) {
                    toast.error("Please select at least one fee component to collect.");
                    return;
                  }

                  const hasHostelOrMess = selectedPaidItems.some((i) => isHostelOrMessFee(i.name));
                  const hasAcademic = selectedPaidItems.some((i) => isAcademicFee(i.name));
                  if (hasHostelOrMess && hasAcademic) {
                    toast.error("Hostel & Mess fees cannot be clubbed with Academic fees (Course, Admission, Uniform, etc.). Please collect them as separate transactions.");
                    return;
                  }

                  // Validate that interval schedule is not altered if prior Course Fee payments were recorded
                  const hasCourseFeeInSubmission = selectedPaidItems.some((i) => isTuitionFee(i.name));
                  if (hasCourseFeeInSubmission && lockedPeriodIntervalType && data.billingPeriodType !== lockedPeriodIntervalType) {
                    toast.error(
                      `Period interval type cannot be changed from ${getPeriodIntervalLabel(lockedPeriodIntervalType)} because prior payments were made in AY ${data.targetAcademicYear}.`
                    );
                    return;
                  }

                  // Verify none of the selected periods are already paid
                  for (const period of selectedPeriods) {
                    const paidInfo = getPaidInfoForPeriod(period);
                    if (paidInfo) {
                      toast.error(
                        `Cannot record payment: '${period}' has already been paid in receipt ${paidInfo.receiptNumber} (${paidInfo.paymentDate}). Duplicate payments of the same period are not allowed.`
                      );
                      return;
                    }
                  }

                  // Verify none of the selected items are already-paid one-time fees
                  for (const item of selectedPaidItems) {
                    const isOneTime = item.frequencyKey === "one_time" || item.name.toLowerCase().includes("security deposit");
                    if (isOneTime && paidOneTimeMap.has(item.name.trim().toLowerCase())) {
                      const info = paidOneTimeMap.get(item.name.trim().toLowerCase());
                      toast.error(
                        `Cannot record payment: '${item.name}' is a one-time fee that was already paid in Receipt #${info?.receiptNumber} (${info?.paymentDate}). One-time fees cannot be paid more than once.`
                      );
                      return;
                    }
                  }

                  if (finalNetPayable < 0) {
                    toast.error("Net payable amount cannot be negative.");
                    return;
                  }

                  if (watchDiscountAmount > 0) {
                    if (!data.discountReason || !data.discountReason.trim()) {
                      toast.error("Please provide a valid reason for the discount / concession.");
                      return;
                    }
                    if (watchDiscountAmount > grossCollectSubtotal) {
                      toast.error("Discount amount cannot exceed the gross fee subtotal.");
                      return;
                    }
                  }

                  const feeSummaryTitle = selectedPaidItems.map((i) => i.name).join(", ");
                  const periodLabel = `AY ${data.targetAcademicYear} • ${data.billingPeriodValue}`;
                  const payload = {
                    studentId: Number(data.studentId),
                    studentName: targetStudent.name,
                    enrollmentNo: targetStudent.enrollmentNo,
                    courseName: targetStudent.courseName,
                    feeStructureId: Number(data.feeStructureId) || null,
                    academicYear: data.targetAcademicYear,
                    billingPeriodType: data.billingPeriodType,
                    billingPeriodValue: data.billingPeriodValue,
                    periodLabel,
                    feeType: feeSummaryTitle,
                    paymentFrequency: data.paymentFrequency || "yearly",
                    grossSubtotal: grossCollectSubtotal,
                    discountAmount: watchDiscountAmount,
                    discountReason: data.discountReason ? data.discountReason.trim() : null,
                    advanceAdjustedAmount: effectiveAdvanceAdjusted,
                    advanceReceiptNumber: studentAdvanceInfo?.receiptNumber || null,
                    isAdvanceAdjustment: effectiveAdvanceAdjusted > 0,
                    amount: finalNetPayable,
                    paymentMode: data.paymentMode,
                    paymentDate: data.paymentDate,
                    items: selectedPaidItems,
                    remarks: JSON.stringify({
                      academicYear: data.targetAcademicYear,
                      billingPeriodType: data.billingPeriodType,
                      billingPeriodValue: data.billingPeriodValue,
                      periodLabel,
                      grossSubtotal: grossCollectSubtotal,
                      discountAmount: watchDiscountAmount,
                      discountReason: data.discountReason ? data.discountReason.trim() : null,
                      advanceAdjustedAmount: effectiveAdvanceAdjusted,
                      advanceReceiptNumber: studentAdvanceInfo?.receiptNumber || null,
                      isAdvanceAdjustment: effectiveAdvanceAdjusted > 0,
                      netCollected: finalNetPayable,
                      items: selectedPaidItems,
                      notes: data.remarks || null,
                    }),
                  };

                  setPendingPayload(payload);
                  setConfirmModalOpen(true);
                })}
                className="space-y-4 py-2 max-h-[80vh] overflow-y-auto pr-1"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Select Enrolled Student (Active) *</label>
                    <Controller
                      control={collectForm.control}
                      name="studentId"
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          value={field.value ? String(field.value) : ""}
                          placeholder="Search active student by name, enrollment no, or course..."
                          options={activeStudentOptions}
                          error={fieldState.error?.message}
                          onChange={(val) => {
                            const sid = Number(val) || 0;
                            field.onChange(sid);
                            collectForm.setValue("feeStructureId", 0);
                            setCollectItems([]);
                          }}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Course Fee Structure Package</label>
                    <Controller
                      control={collectForm.control}
                      name="feeStructureId"
                      render={({ field }) => (
                        <Select
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(val) => handleSelectStructureForCollect(Number(val))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="-- Select Structure --" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredFeeStructuresForCollect.map((fs) => (
                              <SelectItem key={fs.id} value={String(fs.id)}>
                                {fs.courseName} - {fs.academicYear} ({fs.quotaCategory?.toUpperCase() || "GENERAL"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                {/* Target Period & Academic Year Multi-Selection */}
                <div className="border rounded-xl p-3.5 bg-teal-50/40 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-teal-200/60 pb-2 text-xs font-semibold text-teal-800 dark:text-teal-300 gap-1">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-teal-600 shrink-0" /> Target Billing Period (Multi-Period Supported)
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      Recording for: <strong className="text-foreground font-semibold">AY {watchTargetAcademicYear} • {formattedPeriodValue}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Target Academic Year */}
                    <div>
                      <label className="text-xs font-medium mb-1 block text-foreground">Target Academic Year *</label>
                      <Controller
                        control={collectForm.control}
                        name="targetAcademicYear"
                        render={({ field }) => (
                          <Select
                            value={field.value || getAcademicYear()}
                            onValueChange={(val) => {
                              field.onChange(val);
                              if (watchBillingPeriodType === "month") {
                                const startY = parseInt(val.split("-")[0], 10) || currentCalYear;
                                setSelectedPeriods([`June ${startY}`]);
                              }
                            }}
                          >
                            <SelectTrigger className="w-full h-8 text-xs bg-background">
                              <SelectValue placeholder="Academic Year" />
                            </SelectTrigger>
                            <SelectContent>
                              {academicYearOptions.map((ay) => (
                                <SelectItem key={ay} value={ay} className="text-xs">
                                  AY {ay}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {/* Period Interval Type */}
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="text-xs font-medium block text-foreground flex items-center gap-1">
                          Period Interval Type *
                        </label>
                        {isHostelFeeSelected && isHostelAnnual ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-1.5 py-0.5 rounded font-semibold border border-purple-300 dark:border-purple-800">
                            <Lock size={10} /> Read-Only (Annual - Hostel Fee 5% Rebate)
                          </span>
                        ) : isHostelFeeSelected && !isHostelAnnual ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-1.5 py-0.5 rounded font-semibold border border-purple-300 dark:border-purple-800">
                            <Lock size={10} /> Read-Only (Monthly - Hostel Fee)
                          </span>
                        ) : isMessFeeSelected && !isHostelFeeSelected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded font-semibold border border-indigo-300 dark:border-indigo-800">
                            <Lock size={10} /> Read-Only (Monthly - Mess Fee)
                          </span>
                        ) : isPeriodIntervalLocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 rounded font-semibold border border-amber-300 dark:border-amber-800">
                            <Lock size={10} /> Locked ({getPeriodIntervalLabel(lockedPeriodIntervalType)})
                          </span>
                        ) : null}
                      </div>
                      <Controller
                        control={collectForm.control}
                        name="billingPeriodType"
                        render={({ field }) => (
                          <Select
                            disabled={isPeriodIntervalLocked}
                            value={field.value || "semester"}
                            onValueChange={handlePeriodTypeChange}
                          >
                            <SelectTrigger className={cn(
                              "w-full h-8 text-xs font-medium",
                              isPeriodIntervalLocked
                                ? isHostelOrMessActive
                                  ? "bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800 cursor-not-allowed"
                                  : "bg-muted/80 text-muted-foreground border-amber-300 dark:border-amber-800 cursor-not-allowed"
                                : "bg-background"
                            )}>
                              <div className="flex items-center gap-1 truncate">
                                {isPeriodIntervalLocked && <Lock size={11} className={cn("shrink-0", isHostelOrMessActive ? "text-purple-600 dark:text-purple-400" : "text-amber-600 dark:text-amber-400")} />}
                                <SelectValue placeholder="Period Type" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="month" className="text-xs">Monthly (Select 1 or Multiple Months)</SelectItem>
                              <SelectItem value="semester" className="text-xs">Semester-wise (Select 1 or Multiple Semesters)</SelectItem>
                              <SelectItem value="quarter" className="text-xs">Quarterly (Select 1 or Multiple Quarters)</SelectItem>
                              <SelectItem value="academic_year" className="text-xs">Annual (Full Academic Year)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {isHostelFeeSelected && isHostelAnnual ? (
                        <p className="text-[10px] text-purple-700 dark:text-purple-400 mt-1 flex items-center gap-1 font-medium">
                          <Lock size={9} className="shrink-0" /> Annual Hostel Fee (5% rebate) covers the entire academic year.
                        </p>
                      ) : isHostelFeeSelected && !isHostelAnnual ? (
                        <p className="text-[10px] text-purple-700 dark:text-purple-400 mt-1 flex items-center gap-1 font-medium">
                          <Lock size={9} className="shrink-0" /> Monthly Hostel Fee is billed on a monthly schedule.
                        </p>
                      ) : isMessFeeSelected && !isHostelFeeSelected ? (
                        <p className="text-[10px] text-indigo-700 dark:text-indigo-400 mt-1 flex items-center gap-1 font-medium">
                          <Lock size={9} className="shrink-0" /> Mess Fee is billed on a monthly schedule.
                        </p>
                      ) : (isCourseFeeActive && isPeriodIntervalLocked) ? (
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                          <Lock size={9} className="shrink-0" /> Prior Course Fee payment exists for AY {watchTargetAcademicYear}. Course Fee interval cannot be changed mid-year.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Multi-Period Toggle Selector & Presets */}
                  <div className="space-y-2 pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        Select Target {watchBillingPeriodType === "month" ? "Months" : watchBillingPeriodType === "semester" ? "Semesters" : watchBillingPeriodType === "quarter" ? "Quarters" : "Period"}:
                        <span className="text-[11px] font-normal text-teal-700 dark:text-teal-300 ml-1">
                          ({selectedPeriods.length} selected)
                        </span>
                      </span>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        {watchBillingPeriodType === "month" && (
                          <>
                            <button
                              type="button"
                              onClick={selectAllPeriods}
                              className="text-teal-600 hover:underline font-medium px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800"
                            >
                              All 12 Months
                            </button>
                            <button
                              type="button"
                              onClick={() => selectPeriodPreset(periodValueOptions.slice(0, 3))}
                              className="text-muted-foreground hover:text-foreground font-medium px-1.5 py-0.5 rounded border"
                            >
                              Q1 (Jun-Aug)
                            </button>
                            <button
                              type="button"
                              onClick={() => selectPeriodPreset(periodValueOptions.slice(3, 6))}
                              className="text-muted-foreground hover:text-foreground font-medium px-1.5 py-0.5 rounded border"
                            >
                              Q2 (Sep-Nov)
                            </button>
                            <button
                              type="button"
                              onClick={() => selectPeriodPreset(periodValueOptions.slice(6, 9))}
                              className="text-muted-foreground hover:text-foreground font-medium px-1.5 py-0.5 rounded border"
                            >
                              Q3 (Dec-Feb)
                            </button>
                            <button
                              type="button"
                              onClick={() => selectPeriodPreset(periodValueOptions.slice(9, 12))}
                              className="text-muted-foreground hover:text-foreground font-medium px-1.5 py-0.5 rounded border"
                            >
                              Q4 (Mar-May)
                            </button>
                            <button
                              type="button"
                              onClick={() => selectPeriodPreset(periodValueOptions.slice(0, 6))}
                              className="text-muted-foreground hover:text-foreground font-medium px-1.5 py-0.5 rounded border"
                            >
                              H1 (6 Mos)
                            </button>
                          </>
                        )}

                        {watchBillingPeriodType === "semester" && (
                          <>
                            <button
                              type="button"
                              onClick={selectAllPeriods}
                              className="text-teal-600 hover:underline font-medium px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800"
                            >
                              All Semesters
                            </button>
                            <button
                              type="button"
                              onClick={() => selectPeriodPreset(["Semester 1", "Semester 2"])}
                              className="text-muted-foreground hover:text-foreground font-medium px-1.5 py-0.5 rounded border"
                            >
                              Sem 1 & 2 (Yr 1)
                            </button>
                            <button
                              type="button"
                              onClick={() => selectPeriodPreset(["Semester 3", "Semester 4"])}
                              className="text-muted-foreground hover:text-foreground font-medium px-1.5 py-0.5 rounded border"
                            >
                              Sem 3 & 4 (Yr 2)
                            </button>
                            <button
                              type="button"
                              onClick={() => selectPeriodPreset(["Semester 5", "Semester 6"])}
                              className="text-muted-foreground hover:text-foreground font-medium px-1.5 py-0.5 rounded border"
                            >
                              Sem 5 & 6 (Yr 3)
                            </button>
                          </>
                        )}

                        {watchBillingPeriodType === "quarter" && (
                          <>
                            <button
                              type="button"
                              onClick={selectAllPeriods}
                              className="text-teal-600 hover:underline font-medium px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800"
                            >
                              All 4 Quarters
                            </button>
                            <button
                              type="button"
                              onClick={() => selectPeriodPreset(["Q1 (Apr - Jun)", "Q2 (Jul - Sep)"])}
                              className="text-muted-foreground hover:text-foreground font-medium px-1.5 py-0.5 rounded border"
                            >
                              H1 (Q1 & Q2)
                            </button>
                            <button
                              type="button"
                              onClick={() => selectPeriodPreset(["Q3 (Oct - Dec)", "Q4 (Jan - Mar)"])}
                              className="text-muted-foreground hover:text-foreground font-medium px-1.5 py-0.5 rounded border"
                            >
                              H2 (Q3 & Q4)
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* All Periods Paid Notice */}
                    {periodValueOptions.length > 0 && periodValueOptions.every((opt) => !!getPaidInfoForPeriod(opt)) && (
                      <div className="flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 font-medium">
                        <CheckCircle size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>All {watchBillingPeriodType === "month" ? "12 months" : watchBillingPeriodType === "semester" ? "semesters" : watchBillingPeriodType === "quarter" ? "quarters" : "periods"} for Academic Year {watchTargetAcademicYear} are already paid for this student.</span>
                      </div>
                    )}

                    {/* Pills Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                      {periodValueOptions.map((opt) => {
                        const paidInfo = getPaidInfoForPeriod(opt);
                        const isPaid = !!paidInfo;
                        const isSelected = selectedPeriods.includes(opt);

                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => togglePeriodSelection(opt)}
                            title={
                              isPaid
                                ? `Already Paid (Receipt: ${paidInfo.receiptNumber}, Date: ${paidInfo.paymentDate})`
                                : undefined
                            }
                            className={cn(
                              "flex flex-col justify-between p-2 rounded-lg text-xs font-medium border transition-all text-left relative",
                              isPaid
                                ? "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 cursor-not-allowed opacity-90 shadow-2xs"
                                : isSelected
                                ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                                : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground border-input"
                            )}
                          >
                            <div className="flex items-center justify-between w-full gap-1">
                              <span className={cn("truncate font-semibold", isPaid && "text-emerald-950 dark:text-emerald-100")}>{opt}</span>
                              {isSelected && !isPaid && <Check className="h-3.5 w-3.5 shrink-0 ml-1" />}
                              {isPaid && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white shrink-0">
                                  ✓ Paid
                                </span>
                              )}
                            </div>
                            {isPaid && (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono truncate mt-0.5">
                                #{paidInfo.receiptNumber}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Itemized Checkbox Selector for Components with Multipliers */}
                {collectItems.length > 0 && (
                  <div className="border rounded-xl p-3 bg-muted/20 space-y-3">
                    {lockedStudentFrequencies.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 font-medium">
                        <Lock size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>Payment frequencies marked with 🔒 were set in a previous installment this academic year (AY {watchTargetAcademicYear}) and cannot be changed until the next academic year.</span>
                      </div>
                    )}

                    {collectItems.some((i) => i.selected && isHostelOrMessFee(i.name)) && (
                      <div className="flex items-center gap-2 text-[11px] bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 font-medium">
                        <Info size={13} className="shrink-0 text-purple-600 dark:text-purple-400" />
                        <span>
                          {isHostelFeeSelected && !isMessFeeSelected
                            ? isHostelAnnual
                              ? "Hostel Fee is selected with Annual 5% rebate. It cannot be clubbed with Academic fees."
                              : "Hostel Fee is selected on Monthly schedule (can also be paid Annually with 5% rebate). It cannot be clubbed with Academic fees."
                            : isMessFeeSelected && !isHostelFeeSelected
                            ? "Mess Fee is selected as a standalone fee. It cannot be clubbed with Academic fees."
                            : "Hostel & Mess fees are selected. They cannot be clubbed with Course, Admission, or other Academic college fees."}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center border-b pb-1.5 text-xs font-semibold flex-wrap gap-2">
                      <span className="text-teal-800 dark:text-teal-300">Select Components to Collect:</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-medium"
                          onClick={() => setCollectItems((prev) => prev.map((i) => ({ ...i, selected: isAcademicFee(i.name) && !i.isOneTimePaid })))}
                        >
                          Select Academic Fees
                        </button>
                        <span className="text-muted-foreground">•</span>
                        <button
                          type="button"
                          className="text-[11px] text-purple-700 dark:text-purple-300 hover:underline font-semibold"
                          onClick={() => {
                            setCollectItems((prev) => prev.map((i) => ({ ...i, selected: isHostelOnlyFee(i.name) && !i.isOneTimePaid })));
                            const hostelItem = collectItems.find((i) => isHostelOnlyFee(i.name));
                            if (hostelItem?.selectedFrequencyKey === "annually") {
                              handlePeriodTypeChange("academic_year");
                            } else {
                              handlePeriodTypeChange("month");
                            }
                          }}
                        >
                          Select Hostel Only
                        </button>
                        <span className="text-muted-foreground">•</span>
                        <button
                          type="button"
                          className="text-[11px] text-indigo-700 dark:text-indigo-300 hover:underline font-semibold"
                          onClick={() => {
                            setCollectItems((prev) => prev.map((i) => ({ ...i, selected: isMessOnlyFee(i.name) && !i.isOneTimePaid })));
                            handlePeriodTypeChange("month");
                          }}
                        >
                          Select Mess Only
                        </button>
                        <span className="text-muted-foreground">•</span>
                        <button
                          type="button"
                          className="text-[11px] text-violet-700 dark:text-violet-300 hover:underline font-semibold"
                          onClick={() => {
                            setCollectItems((prev) => prev.map((i) => ({ ...i, selected: isHostelOrMessFee(i.name) && !i.isOneTimePaid })));
                            handlePeriodTypeChange("month");
                          }}
                        >
                          Select Hostel & Mess
                        </button>
                        <span className="text-muted-foreground">•</span>
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-foreground hover:underline font-medium"
                          onClick={() => setCollectItems((prev) => prev.map((i) => ({ ...i, selected: false })))}
                        >
                          Deselect All
                        </button>
                        <span className="text-muted-foreground ml-1 font-normal">
                          ({collectItems.filter((i) => i.selected).length} of {collectItems.length} selected)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {collectItems.map((item) => {
                        const isHostel = isHostelOnlyFee(item.name);
                        const isMess = isMessOnlyFee(item.name);
                        const isCombined = item.name.toLowerCase().includes("hostel & mess");
                        return (
                          <div
                            key={item.componentId}
                            className={cn(
                              "flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border text-xs gap-2 transition-colors",
                              item.isOneTimePaid
                                ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800 opacity-80"
                                : item.selected
                                ? (isHostel || isMess || isCombined)
                                  ? "bg-purple-50/70 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 shadow-xs"
                                  : "bg-card border-teal-300 dark:border-teal-800 shadow-xs"
                                : "bg-muted/40 opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="checkbox"
                                id={`item-cb-${item.componentId}`}
                                checked={item.selected}
                                disabled={item.isOneTimePaid}
                                onChange={() => toggleCollectItemSelect(item.componentId)}
                                className={cn(
                                  "h-4 w-4 rounded text-teal-600 focus:ring-teal-500",
                                  item.isOneTimePaid ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                                )}
                              />
                              <label
                                htmlFor={`item-cb-${item.componentId}`}
                                className={cn(
                                  "font-semibold text-foreground flex items-center gap-1.5 flex-wrap",
                                  item.isOneTimePaid ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer select-none"
                                )}
                              >
                                <span className={cn(item.isOneTimePaid && "line-through opacity-75")}>
                                  {item.name}
                                </span>
                                {item.isOneTimePaid && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded font-semibold border border-emerald-300 dark:border-emerald-800 not-italic no-underline">
                                    <Check size={11} className="text-emerald-600 dark:text-emerald-400" />
                                    Already Paid (#{item.paidReceiptNumber})
                                  </span>
                                )}
                                {isHostel && (
                                  <span className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-1.5 py-0.2 rounded font-medium border border-purple-200 dark:border-purple-800">
                                    Hostel Fee (Annual 5% Rebate / Monthly)
                                  </span>
                                )}
                                {isMess && (
                                  <span className="text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 px-1.5 py-0.2 rounded font-medium border border-indigo-200 dark:border-indigo-800">
                                    Mess Fee
                                  </span>
                                )}
                                {isCombined && (
                                  <span className="text-[10px] text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/80 px-1.5 py-0.2 rounded font-medium border border-violet-200 dark:border-violet-800">
                                    Hostel & Mess Fee
                                  </span>
                                )}
                                {item.isFrequencyLocked && !item.isOneTimePaid && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.2 rounded font-normal">
                                    <Lock size={9} /> Locked ({item.lockedFrequencyLabel || item.selectedFrequencyKey})
                                  </span>
                                )}
                              </label>
                            </div>

                          <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
                            {/* Schedule Select */}
                            <Select
                              disabled={!item.selected || item.isFrequencyLocked || item.isOneTimePaid}
                              value={item.selectedFrequencyKey}
                              onValueChange={(val) => changeCollectItemSchedule(item.componentId, val)}
                            >
                              <SelectTrigger className={cn("h-8 text-xs min-w-[130px]", (item.isFrequencyLocked || item.isOneTimePaid) && "bg-muted/80 text-muted-foreground border-slate-300 dark:border-slate-800")}>
                                <div className="flex items-center gap-1">
                                  {item.isFrequencyLocked && !item.isOneTimePaid && <Lock size={10} className="text-amber-600 dark:text-amber-400 shrink-0" />}
                                  <SelectValue placeholder="Schedule" />
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {item.availableFrequencies.map((r) => {
                                  const inst = calcInstallmentAmount(item.baseAmount, r);
                                  return (
                                    <SelectItem key={r.id} value={r.key} className="text-xs">
                                      {r.label} (₹{inst.toLocaleString()})
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>

                            {/* Total Line Item Amount */}
                            <div className="flex flex-col items-end min-w-[90px]">
                              <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono border",
                                item.isOneTimePaid
                                  ? "bg-slate-200/60 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700 line-through"
                                  : item.selected
                                  ? "bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800"
                                  : "bg-muted text-muted-foreground border-transparent"
                              )}>
                                ₹{item.amount.toLocaleString()}
                              </span>
                              {item.selected && item.multiplier > 1 && (
                                <span className="text-[10px] text-muted-foreground">
                                  {item.multiplier} periods × ₹{item.unitAmount.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

                {/* Gross Subtotal & Scholarship Rebate / Concession Controls */}
                <div className="border rounded-xl p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 dark:border-emerald-900/60 pb-2 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 font-bold">
                        <Percent size={14} className="text-emerald-600 dark:text-emerald-400" />
                        Course Fee Scholarship Rebate & Concession
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {selectedCourseFeeTotal > 0 && (
                        <span className="text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded font-medium border border-emerald-200 dark:border-emerald-800">
                          Course Fee Selected: <strong>₹{selectedCourseFeeTotal.toLocaleString()}</strong>
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        Gross Subtotal: <strong className="text-foreground">₹{grossCollectSubtotal.toLocaleString()}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Mode Toggle Tabs */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-lg font-medium transition-all border",
                        discountMode === "scholarship_percent"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-background text-muted-foreground hover:text-foreground border-input"
                      )}
                      onClick={() => setDiscountMode("scholarship_percent")}
                    >
                      🎓 Scholarship Rebate (%) on Course Fee
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-lg font-medium transition-all border",
                        discountMode === "fixed_amount"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-background text-muted-foreground hover:text-foreground border-input"
                      )}
                      onClick={() => {
                        setDiscountMode("fixed_amount");
                        setScholarshipPercent("");
                      }}
                    >
                      ₹ Fixed Concession Amount
                    </button>
                  </div>

                  {discountMode === "scholarship_percent" ? (
                    <div className="space-y-3 bg-card p-3 rounded-lg border border-emerald-200/70 dark:border-emerald-900/50">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            Scholarship Rebate Percentage (%) *
                          </label>
                          {typeof scholarshipPercent === "number" && scholarshipPercent > 0 && (
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                              Calculated Rebate: -₹{watchDiscountAmount.toLocaleString()} ({scholarshipPercent}%)
                            </span>
                          )}
                        </div>

                        {/* Quick Percentage Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          <span className="text-[11px] text-muted-foreground font-medium mr-1">Quick Presets:</span>
                          {[5, 10, 15, 20, 25, 50, 100].map((pct) => (
                            <Button
                              key={pct}
                              type="button"
                              size="sm"
                              variant={scholarshipPercent === pct ? "default" : "outline"}
                              className={cn(
                                "h-6 text-[11px] px-2 font-semibold",
                                scholarshipPercent === pct
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "hover:bg-emerald-50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              )}
                              onClick={() => {
                                setScholarshipPercent(pct);
                              }}
                            >
                              {pct}%
                            </Button>
                          ))}
                          {scholarshipPercent !== "" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[11px] px-1.5 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setScholarshipPercent("");
                                collectForm.setValue("discountAmount", 0);
                                collectForm.setValue("discountReason", "");
                              }}
                            >
                              <X size={12} className="mr-0.5" /> Clear
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] text-muted-foreground font-medium">Custom Rebate Percentage (0 - 100%):</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={scholarshipPercent}
                                placeholder="e.g. 10"
                                onChange={(e) => {
                                  const val = e.target.value === "" ? "" : Math.min(100, Math.max(0, Number(e.target.value)));
                                  setScholarshipPercent(val);
                                }}
                                className="w-full border rounded-md px-3 py-1.5 bg-background text-sm font-semibold focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                              />
                              <span className="p-1.5 bg-muted rounded-md border text-xs font-bold text-muted-foreground px-2.5">
                                %
                              </span>
                            </div>
                            {selectedCourseFeeTotal <= 0 && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                                Note: Course Fee component is not selected above. Rebate will apply against total selected fee subtotal.
                              </p>
                            )}
                          </div>

                          <Controller
                            control={collectForm.control}
                            name="discountReason"
                            render={({ field, fieldState }) => (
                              <Field
                                label="Scholarship / Rebate Reason / Type"
                                placeholder="e.g. Merit Scholarship, Sports Quota, Sibling Concession"
                                {...field}
                                error={fieldState.error?.message}
                              />
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 bg-card p-3 rounded-lg border border-emerald-200/70 dark:border-emerald-900/50">
                      <Controller
                        control={collectForm.control}
                        name="discountAmount"
                        render={({ field, fieldState }) => (
                          <Field
                            label="Discount / Concession Amount (₹)"
                            type="number"
                            min="0"
                            max={grossCollectSubtotal}
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            error={fieldState.error?.message}
                          />
                        )}
                      />

                      <Controller
                        control={collectForm.control}
                        name="discountReason"
                        render={({ field, fieldState }) => (
                          <Field
                            label={watchDiscountAmount > 0 ? "Reason for Discount *" : "Reason for Discount"}
                            placeholder="e.g. Special Concession, Financial Assistance"
                            {...field}
                            error={fieldState.error?.message}
                          />
                        )}
                      />
                    </div>
                  )}
                </div>

                  {/* Seat Booking Advance Adjustment Card */}
                  {studentAdvanceInfo?.hasAdvance && (
                    <div className="border rounded-xl p-3.5 bg-cyan-50/60 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-800 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-200 dark:border-cyan-800 pb-2 text-xs">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="adjust-advance-cb"
                            checked={adjustAdvance}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAdjustAdvance(checked);
                              if (checked) {
                                setCustomAdvanceAdjusted(studentAdvanceInfo.advanceAmount);
                              }
                            }}
                            className="h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                          />
                          <label htmlFor="adjust-advance-cb" className="font-bold text-cyan-950 dark:text-cyan-200 cursor-pointer flex items-center gap-1.5">
                            <Tag size={13} className="text-cyan-600" />
                            Adjust Seat Booking Advance Payment
                          </label>
                        </div>
                        <span className="text-[11px] font-mono font-semibold bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-700">
                          Available: ₹{studentAdvanceInfo.advanceAmount.toLocaleString()}
                          {studentAdvanceInfo.receiptNumber ? ` (${studentAdvanceInfo.receiptNumber})` : ""}
                        </span>
                      </div>

                      {adjustAdvance && (
                        <div className="space-y-2 pt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="text-xs font-medium block text-foreground mb-1">
                                Advance Amount to Deduct (₹) *
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={Math.min(studentAdvanceInfo.advanceAmount, remainingAfterDiscount)}
                                value={customAdvanceAdjusted}
                                onChange={(e) => setCustomAdvanceAdjusted(Number(e.target.value))}
                                className="w-full border border-cyan-300 dark:border-cyan-700 rounded-md px-3 py-1.5 text-xs bg-background font-mono font-semibold"
                              />
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Max adjustable: ₹{Math.min(studentAdvanceInfo.advanceAmount, remainingAfterDiscount).toLocaleString()}
                              </p>
                            </div>

                            <div className="bg-cyan-100/50 dark:bg-cyan-950/40 p-2.5 rounded-lg text-xs space-y-1 text-cyan-900 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                              <div className="font-semibold text-[11px]">Advance Record Reference:</div>
                              <div className="text-[11px]">Receipt: <strong className="font-mono">{studentAdvanceInfo.receiptNumber || "N/A"}</strong></div>
                              <div className="text-[11px]">Payment: {studentAdvanceInfo.paymentDate || "N/A"} • {(studentAdvanceInfo.paymentMode || "cash").toUpperCase()}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary & Net Payable Breakdown */}
                  <div className="pt-2 border-t border-emerald-200/60 space-y-1.5 text-xs">
                    {effectiveAdvanceAdjusted > 0 && (
                      <div className="flex justify-between items-center text-cyan-700 dark:text-cyan-400 font-semibold">
                        <span>Less Seat Booking Advance Adjustment:</span>
                        <span>-₹{effectiveAdvanceAdjusted.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm font-bold pt-1">
                      <span className="text-emerald-800 dark:text-emerald-300 uppercase tracking-wide text-xs">Final Net Payable Amount</span>
                      <span className="text-lg text-teal-700 dark:text-teal-300">₹{finalNetPayable.toLocaleString()}</span>
                    </div>
                  </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Payment Mode</label>
                    <Controller
                      control={collectForm.control}
                      name="paymentMode"
                      render={({ field }) => (
                        <Select
                          value={field.value || "cash"}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Payment Mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer / NEFT</SelectItem>
                            <SelectItem value="upi">UPI / GPay / PhonePe</SelectItem>
                            <SelectItem value="card">Credit / Debit Card</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {/* Calendar Date Picker with Month & Year Selection */}
                  <div>
                    <label className="text-sm font-medium mb-1 block text-foreground">Payment Date *</label>
                    <Controller
                      control={collectForm.control}
                      name="paymentDate"
                      render={({ field }) => {
                        const selectedDate = field.value ? new Date(field.value) : new Date();
                        return (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-9 border-input bg-background",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-teal-600 shrink-0" />
                                {field.value ? (
                                  format(selectedDate, "PPP")
                                ) : (
                                  <span>Pick payment date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-99999" align="start">
                              <CalendarPicker
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                  if (date) {
                                    const yyyy = date.getFullYear();
                                    const mm = String(date.getMonth() + 1).padStart(2, "0");
                                    const dd = String(date.getDate()).padStart(2, "0");
                                    field.onChange(`${yyyy}-${mm}-${dd}`);
                                  }
                                }}
                                captionLayout="dropdown"
                                startMonth={new Date(2020, 0)}
                                endMonth={new Date(2035, 11)}
                              />
                            </PopoverContent>
                          </Popover>
                        );
                      }}
                    />
                  </div>
                </div>

                <Controller
                  control={collectForm.control}
                  name="remarks"
                  render={({ field, fieldState }) => (
                    <Field label="Remarks / Transaction Ref" placeholder="Optional notes" {...field} error={fieldState.error?.message} />
                  )}
                />

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setCollectModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                    disabled={grossCollectSubtotal <= 0 || finalNetPayable < 0}
                  >
                    Proceed to Confirm (₹{finalNetPayable.toLocaleString()})
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Payment Confirmation Modal to prevent accidental double submissions */}
          <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-teal-700">
                  <CheckCircle className="h-5 w-5 text-teal-600" /> Confirm Fee Payment
                </DialogTitle>
                <DialogDescription>
                  Please verify the transaction breakdown and target billing period before recording.
                </DialogDescription>
              </DialogHeader>

              {pendingPayload && (
                <div className="space-y-3 text-xs py-2">
                  <div className="bg-muted/40 p-3 rounded-lg space-y-1.5 border">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Student:</span>
                      <span className="font-bold text-foreground">{pendingPayload.studentName} ({pendingPayload.enrollmentNo})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target Period:</span>
                      <span className="font-bold text-teal-700 dark:text-teal-300">
                        AY {pendingPayload.academicYear} • {pendingPayload.billingPeriodValue}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Components:</span>
                      <span className="font-semibold text-foreground text-right">{pendingPayload.feeType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross Amount:</span>
                      <span>₹{Number(pendingPayload.grossSubtotal || 0).toLocaleString()}</span>
                    </div>
                    {Number(pendingPayload.discountAmount) > 0 && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Discount ({pendingPayload.discountReason || "Concession"}):</span>
                        <span>-₹{Number(pendingPayload.discountAmount).toLocaleString()}</span>
                      </div>
                    )}
                    {Number(pendingPayload.advanceAdjustedAmount) > 0 && (
                      <div className="flex justify-between text-cyan-700 dark:text-cyan-400 font-semibold">
                        <span>Advance Adjusted ({pendingPayload.advanceReceiptNumber || "Seat Booking"}):</span>
                        <span>-₹{Number(pendingPayload.advanceAdjustedAmount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1.5 font-bold text-sm">
                      <span className="text-foreground">Total Net Payable:</span>
                      <span className="text-teal-600 text-base">₹{Number(pendingPayload.amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground pt-1">
                      <span>Payment Mode: <strong>{String(pendingPayload.paymentMode).toUpperCase()}</strong></span>
                      <span>Date: <strong>{pendingPayload.paymentDate}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmModalOpen(false)}
                  disabled={collectFeeMutation.isPending}
                >
                  Back to Edit
                </Button>
                <Button
                  type="button"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={collectFeeMutation.isPending}
                  onClick={() => {
                    if (pendingPayload) {
                      const { studentName, enrollmentNo, courseName, grossSubtotal, items, academicYear, billingPeriodType, billingPeriodValue, periodLabel, ...cleanPayload } = pendingPayload;
                      collectFeeMutation.mutate(cleanPayload);
                    }
                  }}
                >
                  {collectFeeMutation.isPending ? "Processing..." : "Confirm & Record Payment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Fee Transactions</p>
              <h3 className="text-xl font-bold text-foreground mt-1">{totalTransactionsCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-600">
              <Receipt size={20} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Collected Amount</p>
              <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{totalCollectedAmount.toLocaleString()}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
              <CheckCircle size={20} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Fee Structures Master</p>
              <h3 className="text-xl font-bold text-foreground mt-1">{feeStructures.length} Configured</h3>
              <Link to="/college/fee-structures" className="text-[11px] text-teal-600 hover:underline flex items-center gap-0.5 mt-0.5">
                Manage structures <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600">
              <Layers size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Ledger */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle className="text-base font-semibold">Fee Transaction Ledger</CardTitle>
            <CardDescription>Log of student payment transactions, invoices, target billing periods, and printable receipts</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search student, receipt, invoice..."
                className="pl-8 pr-7 py-1.5 border rounded-md text-xs bg-background w-48 sm:w-60 focus:outline-none focus:ring-1 focus:ring-teal-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Payment Mode Filter */}
            <select
              className="border rounded-md px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-teal-500"
              value={paymentModeFilter}
              onChange={(e) => {
                setPaymentModeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Payment Modes</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
            </select>

            {/* Date Range: Start Date */}
            <Popover open={fromPopoverOpen} onOpenChange={setFromPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 px-2.5 text-xs font-normal justify-start text-left bg-background border",
                    !startDateFilter && "text-muted-foreground",
                    startDateFilter && "text-foreground font-medium border-teal-600/40 bg-teal-50/20"
                  )}
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-teal-600 shrink-0" />
                  {startDateFilter ? (
                    <span className="flex items-center gap-1">
                      From: {format(new Date(startDateFilter + "T00:00:00"), "dd MMM yyyy")}
                      <span
                        role="button"
                        tabIndex={0}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStartDateFilter("");
                          setCurrentPage(1);
                        }}
                      >
                        <X size={11} />
                      </span>
                    </span>
                  ) : (
                    <span>From Date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <CalendarPicker
                  mode="single"
                  selected={startDateFilter ? new Date(startDateFilter + "T00:00:00") : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, "0");
                      const dd = String(date.getDate()).padStart(2, "0");
                      setStartDateFilter(`${yyyy}-${mm}-${dd}`);
                    } else {
                      setStartDateFilter("");
                    }
                    setCurrentPage(1);
                    setFromPopoverOpen(false);
                  }}
                  captionLayout="dropdown"
                  startMonth={new Date(2020, 0)}
                  endMonth={new Date(2035, 11)}
                />
              </PopoverContent>
            </Popover>

            {/* Date Range: End Date */}
            <Popover open={toPopoverOpen} onOpenChange={setToPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 px-2.5 text-xs font-normal justify-start text-left bg-background border",
                    !endDateFilter && "text-muted-foreground",
                    endDateFilter && "text-foreground font-medium border-teal-600/40 bg-teal-50/20"
                  )}
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-teal-600 shrink-0" />
                  {endDateFilter ? (
                    <span className="flex items-center gap-1">
                      To: {format(new Date(endDateFilter + "T00:00:00"), "dd MMM yyyy")}
                      <span
                        role="button"
                        tabIndex={0}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEndDateFilter("");
                          setCurrentPage(1);
                        }}
                      >
                        <X size={11} />
                      </span>
                    </span>
                  ) : (
                    <span>To Date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <CalendarPicker
                  mode="single"
                  selected={endDateFilter ? new Date(endDateFilter + "T00:00:00") : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, "0");
                      const dd = String(date.getDate()).padStart(2, "0");
                      setEndDateFilter(`${yyyy}-${mm}-${dd}`);
                    } else {
                      setEndDateFilter("");
                    }
                    setCurrentPage(1);
                    setToPopoverOpen(false);
                  }}
                  captionLayout="dropdown"
                  startMonth={new Date(2020, 0)}
                  endMonth={new Date(2035, 11)}
                />
              </PopoverContent>
            </Popover>

            {/* Clear / Reset Filters */}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleResetFilters}
                title="Reset all filters"
              >
                <RotateCcw size={12} className="mr-1" /> Reset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTx ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading transactions...</div>
          ) : feeTransactions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {hasActiveFilters ? (
                <div className="space-y-2">
                  <p>No fee transactions matching the applied filters.</p>
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
                    Clear Filters
                  </Button>
                </div>
              ) : (
                "No fee transactions found."
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                      {/* <th className="p-3">Receipt No</th> */}
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Enrollment No</th>
                      <th className="p-3">Target Period / AY</th>
                      <th className="p-3">Fee Component(s) Paid</th>
                      <th className="p-3">Discounts / Concessions</th>
                      <th className="p-3 text-right">Amount Paid</th>
                      <th className="p-3">Mode</th>
                      <th className="p-3">Payment Date</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {feeTransactions.map((tx) => {
                      const parsedDetails = parseRemarks(tx.remarks);
                      const isSeatAdvance = parsedDetails?.isSeatBookingAdvance || tx.feeType?.toLowerCase().includes("seat booking");
                      const discAmt = Number(parsedDetails?.discountAmount || 0);
                      const discReason = parsedDetails?.discountReason;
                      const advanceAdj = Number(parsedDetails?.advanceAdjustedAmount || 0);
                      const advanceReceiptRef = parsedDetails?.advanceReceiptNumber;
                      const periodLabel = parsedDetails?.periodLabel || (parsedDetails?.academicYear ? `AY ${parsedDetails.academicYear}${parsedDetails?.billingPeriodValue ? ` • ${parsedDetails.billingPeriodValue}` : ""}` : null);

                      return (
                        <tr key={tx.id} className="hover:bg-muted/30">
                          {/* <td className="p-3 font-mono font-bold text-teal-600">{tx.receiptNumber}</td> */}
                          <td className="p-3 font-medium text-foreground">{tx.studentName}</td>
                          <td className="p-3 font-mono">{tx.enrollmentNo}</td>
                          <td className="p-3">
                            {isSeatAdvance ? (
                              <span className="text-muted-foreground text-[11px]">Provisional Booking</span>
                            ) : periodLabel ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800 text-[11px]">
                                <Calendar className="h-3 w-3 text-teal-600 shrink-0" />
                                {periodLabel}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </td>
                          <td className="p-3 font-semibold text-foreground">
                            {isSeatAdvance ? (
                              <span className="inline-flex items-center gap-1 text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800 font-bold text-[11px]">
                                <Tag size={11} className="text-cyan-600" /> Seat Booking Advance
                              </span>
                            ) : (
                              tx.feeType || "Course Fee"
                            )}
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {discAmt > 0 && (
                                <span className="block text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-[11px]">
                                  -₹{discAmt.toLocaleString()} ({discReason || "Concession"})
                                </span>
                              )}
                              {advanceAdj > 0 && (
                                <span className="block text-cyan-700 dark:text-cyan-300 font-semibold bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800 text-[11px]">
                                  Advance Adj: -₹{advanceAdj.toLocaleString()} {advanceReceiptRef ? `(${advanceReceiptRef})` : ""}
                                </span>
                              )}
                              {discAmt <= 0 && advanceAdj <= 0 && (
                                <span className="text-muted-foreground">None</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right font-bold text-foreground">₹{toNum(tx.amount).toLocaleString()}</td>
                          <td className="p-3 capitalize">{tx.paymentMode}</td>
                          <td className="p-3">{tx.paymentDate}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                onClick={() => {
                                  setReceiptTx(tx);
                                  setReceiptModalOpen(true);
                                }}
                              >
                                <Printer size={13} className="mr-1" /> View
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                title="Send Receipt via WhatsApp"
                                onClick={() => handleOpenWhatsAppModal(tx)}
                              >
                                <MessageCircle size={13} className="mr-1" /> WhatsApp
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Server-Side Pagination Controls */}
              {pagination && pagination.totalRecords > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>
                      Showing{" "}
                      <strong className="text-foreground">
                        {(pagination.page - 1) * pagination.pageSize + 1}
                      </strong>{" "}
                      to{" "}
                      <strong className="text-foreground">
                        {Math.min(pagination.page * pagination.pageSize, pagination.totalRecords)}
                      </strong>{" "}
                      of{" "}
                      <strong className="text-foreground">{pagination.totalRecords}</strong> transactions
                      {hasActiveFilters && (
                        <span className="ml-1 text-teal-600 font-medium">
                          (Filtered Total: ₹{filteredCollectedAmount.toLocaleString()})
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-1.5 pl-2 border-l">
                      <select
                        className="border rounded px-1.5 py-0.5 text-xs bg-background text-foreground"
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                      >
                        <option value={10}>10 / page</option>
                        <option value={20}>20 / page</option>
                        <option value={50}>50 / page</option>
                        <option value={100}>100 / page</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setCurrentPage(1)}
                      disabled={pagination.page <= 1}
                      title="First Page"
                    >
                      <ChevronsLeft size={13} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page <= 1}
                      title="Previous Page"
                    >
                      <ChevronLeft size={13} />
                    </Button>

                    <span className="px-2 font-medium text-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={pagination.page >= pagination.totalPages}
                      title="Next Page"
                    >
                      <ChevronRight size={13} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setCurrentPage(pagination.totalPages)}
                      disabled={pagination.page >= pagination.totalPages}
                      title="Last Page"
                    >
                      <ChevronsRight size={13} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Printable & Downloadable PDF Receipt Modal */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent
          className="sm:max-w-[650px] p-0 overflow-hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="p-6 space-y-4" id="printable-fee-receipt">
            <div className="border-b pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-teal-700">ACME College of Nursing</h2>
                <p className="text-xs text-muted-foreground">Official Fee Payment Receipt</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono bg-teal-50 text-teal-700 px-2 py-1 rounded font-bold border border-teal-200 block">
                  {receiptTx?.receiptNumber}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-1">Date: {receiptTx?.paymentDate}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block">Student Name</span>
                <span className="font-bold text-foreground text-sm">{receiptTx?.studentName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">{receiptTx?.feeType?.toLowerCase().includes("seat booking") ? "Application No" : "Enrollment No"}</span>
                <span className="font-mono font-bold text-foreground">{receiptTx?.enrollmentNo}</span>
              </div>
              {(() => {
                const parsed = parseRemarks(receiptTx?.remarks);
                const isSeatAdv = parsed?.isSeatBookingAdvance || receiptTx?.feeType?.toLowerCase().includes("seat booking");
                if (isSeatAdv) return null;
                const acadYear = parsed?.academicYear || (receiptTx?.paymentDate ? getAcademicYear(receiptTx.paymentDate) : "");
                const periodType = parsed?.billingPeriodType;
                const periodVal = parsed?.billingPeriodValue;

                let periodDetailText = "";
                if (periodVal) {
                  if (periodType === "month") {
                    periodDetailText = `Months: ${periodVal}`;
                  } else if (periodType === "semester") {
                    periodDetailText = `Semester: ${periodVal}`;
                  } else if (periodType === "quarter") {
                    periodDetailText = `Quarter: ${periodVal}`;
                  } else if (periodType === "academic_year") {
                    periodDetailText = "Full Academic Year";
                  } else {
                    periodDetailText = periodVal;
                  }
                } else if (parsed?.periodLabel) {
                  periodDetailText = parsed.periodLabel;
                }

                const fullPeriodDisplay = acadYear ? `AY ${acadYear} • ${periodDetailText || "Annual"}` : periodDetailText;
                if (!fullPeriodDisplay) return null;
                return (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block">Target Billing Period / AY</span>
                    <span className="font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800 inline-block mt-0.5">
                      {fullPeriodDisplay}
                    </span>
                  </div>
                );
              })()}
              <div className="col-span-2">
                <span className="text-muted-foreground block">Fee Items Paid</span>
                <span className="font-semibold text-foreground">{receiptTx?.feeType}</span>
              </div>
            </div>

            {/* Itemized Table Breakdown & Discount on Receipt */}
            {(() => {
              const parsed = parseRemarks(receiptTx?.remarks);

              const items: Array<{ name: string; frequency: string; amount: number }> =
                Array.isArray(parsed) ? parsed : parsed?.items || [];
              const gross = Number(parsed?.grossSubtotal || 0);
              const disc = Number(parsed?.discountAmount || 0);
              const reason = parsed?.discountReason;
              const advAdjusted = Number(parsed?.advanceAdjustedAmount || 0);
              const advReceipt = parsed?.advanceReceiptNumber;

              return (
                <div className="space-y-3 font-sans">
                  {items.length > 0 && (
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-muted/60 text-muted-foreground border-b font-semibold text-[11px]">
                            <th className="p-2">Fee Component</th>
                            <th className="p-2 text-center">Selected Schedule</th>
                            <th className="p-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-xs">
                          {items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-medium text-foreground">{it.name}</td>
                              <td className="p-2 text-center">{it.frequency}</td>
                              <td className="p-2 text-right font-bold text-foreground">
                                ₹{Number(it.amount || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Summary Breakup */}
                  <div className="bg-muted/30 p-3 rounded-lg border space-y-1.5 text-xs">
                    {gross > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Gross Fee Subtotal:</span>
                        <span className="font-semibold text-foreground">₹{gross.toLocaleString()}</span>
                      </div>
                    )}

                    {disc > 0 && (
                      <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 font-semibold">
                        <span>Less {formatDiscountLabel(reason).replace(/:$/, "")}:</span>
                        <span>-₹{disc.toLocaleString()}</span>
                      </div>
                    )}

                    {advAdjusted > 0 && (
                      <div className="flex justify-between items-center text-cyan-700 dark:text-cyan-400 font-semibold">
                        <span>Less Seat Booking Advance Adjusted ({advReceipt || "Advance"}):</span>
                        <span>-₹{advAdjusted.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="border rounded-lg p-3 bg-teal-50/50 dark:bg-teal-950/20 flex justify-between items-center my-2">
              <div>
                <span className="text-xs text-teal-800 dark:text-teal-300 font-semibold block">Total Amount Paid</span>
                <span className="text-xs text-muted-foreground">Payment Mode: {receiptTx?.paymentMode.toUpperCase()}</span>
              </div>
              <span className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                ₹{toNum(receiptTx?.amount).toLocaleString()}
              </span>
            </div>

            {(() => {
              const parsed = parseRemarks(receiptTx?.remarks);
              const noteText =
                parsed?.notes ||
                (typeof receiptTx?.remarks === "string" && !receiptTx.remarks.startsWith("{")
                  ? receiptTx.remarks
                  : null);
              if (!noteText) return null;
              return (
                <div className="text-xs text-muted-foreground italic border-t pt-2">
                  Remarks: {noteText}
                </div>
              );
            })()}

            <div className="pt-8 flex justify-between items-end text-xs text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Cashier Signature</p>
                <div className="h-10 border-b border-dashed w-36"></div>
              </div>
              <div className="text-right">
                <CheckCircle className="h-6 w-6 text-teal-600 inline-block mb-1" />
                <p className="font-semibold text-teal-700">Verified System Receipt</p>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/40 border-t flex justify-end gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setReceiptModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              onClick={() => {
                if (receiptTx) generateReceiptPDF(receiptTx, currentUserName);
              }}
            >
              <Download size={15} className="mr-1.5" /> Download PDF
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                if (receiptTx) handleOpenWhatsAppModal(receiptTx);
              }}
            >
              <MessageCircle size={15} className="mr-1.5" /> WhatsApp
            </Button>
            <Button
              className="bg-teal-600 text-white"
              onClick={() => {
                if (receiptTx) printReceiptPDF(receiptTx, currentUserName);
              }}
            >
              <Printer size={15} className="mr-1.5" /> Print Receipt (PDF)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Share Modal */}
      <Dialog open={whatsAppModalOpen} onOpenChange={setWhatsAppModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 bg-emerald-600 text-white">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base text-white font-bold">
                  Send Receipt via WhatsApp
                </DialogTitle>
                <DialogDescription className="text-xs text-emerald-100">
                  Directly send official fee receipt summary to student or parents.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {whatsAppTx && (() => {
            const msg = formatFeeReceiptWhatsAppMessage(whatsAppTx, whatsAppStudent);
            const studentPhone = whatsAppStudent?.phone || "";
            const fatherPhone = whatsAppStudent?.fatherPhone || "";
            const motherPhone = whatsAppStudent?.motherPhone || "";
            const guardianPhone = whatsAppStudent?.guardianPhone || "";

            return (
              <div className="p-4 space-y-4 text-xs">
                {/* Recipient Phone Selection */}
                <div className="space-y-2">
                  <label className="font-semibold text-foreground block text-xs">
                    Select Recipient Contact:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {studentPhone && (
                      <Button
                        type="button"
                        size="sm"
                        variant={whatsAppPhone === studentPhone ? "default" : "outline"}
                        className={cn("h-7 text-xs", whatsAppPhone === studentPhone && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                        onClick={() => setWhatsAppPhone(studentPhone)}
                      >
                        📱 Student ({studentPhone})
                      </Button>
                    )}
                    {fatherPhone && (
                      <Button
                        type="button"
                        size="sm"
                        variant={whatsAppPhone === fatherPhone ? "default" : "outline"}
                        className={cn("h-7 text-xs", whatsAppPhone === fatherPhone && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                        onClick={() => setWhatsAppPhone(fatherPhone)}
                      >
                        👨 Father ({fatherPhone})
                      </Button>
                    )}
                    {motherPhone && (
                      <Button
                        type="button"
                        size="sm"
                        variant={whatsAppPhone === motherPhone ? "default" : "outline"}
                        className={cn("h-7 text-xs", whatsAppPhone === motherPhone && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                        onClick={() => setWhatsAppPhone(motherPhone)}
                      >
                        👩 Mother ({motherPhone})
                      </Button>
                    )}
                    {guardianPhone && (
                      <Button
                        type="button"
                        size="sm"
                        variant={whatsAppPhone === guardianPhone ? "default" : "outline"}
                        className={cn("h-7 text-xs", whatsAppPhone === guardianPhone && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                        onClick={() => setWhatsAppPhone(guardianPhone)}
                      >
                        🛡️ Guardian ({guardianPhone})
                      </Button>
                    )}
                  </div>

                  <div className="pt-1">
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Recipient Mobile Number (10 digits / with country code):
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="px-2.5 py-1.5 bg-muted rounded-md border text-xs font-semibold text-muted-foreground">
                        +91
                      </div>
                      <input
                        type="tel"
                        value={whatsAppPhone}
                        onChange={(e) => setWhatsAppPhone(e.target.value)}
                        placeholder="Enter 10-digit mobile number"
                        className="flex-1 border rounded-md px-3 py-1.5 bg-background text-xs font-mono font-medium focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Message Preview */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-foreground text-xs">
                      Message Content Preview:
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(msg);
                        toast.success("Receipt message copied to clipboard!");
                      }}
                    >
                      <Copy size={11} /> Copy Message
                    </Button>
                  </div>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-lg text-[11px] font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed border border-slate-800 shadow-inner">
                    {msg}
                  </div>
                </div>

                <DialogFooter className="p-0 pt-2 flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setWhatsAppModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1"
                    onClick={() => {
                      const success = openWhatsAppReceipt(whatsAppPhone, msg);
                      if (success) {
                        setWhatsAppModalOpen(false);
                      }
                    }}
                  >
                    <MessageCircle size={13} /> Send Text Summary
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold px-4 shadow-xs"
                    onClick={async () => {
                      const success = await shareReceiptPDFViaWhatsApp(whatsAppTx, whatsAppPhone, currentUserName);
                      if (success) {
                        setWhatsAppModalOpen(false);
                      }
                    }}
                  >
                    <FileText size={13} /> Send Receipt PDF (WhatsApp)
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
