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
const isHostelFee = (name: string): boolean => {
  const n = (name || "").toLowerCase();
  return n.includes("hostel") || n.includes("mess");
};
const allowsPeriodMultiplier = (name: string, freqKey?: string): boolean => {
  if (freqKey === "annually" || freqKey === "one_time") return false;
  return isTuitionFee(name) || isHostelFee(name);
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
  const isHostel = isHostelFee(feeType) || items.some((i: any) => isHostelFee(i.name));
  const isAcademic = !isHostel || items.some((i: any) => !isHostelFee(i.name));

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

const buildReceiptPDFDoc = (tx: FeeTransaction): jsPDF => {
  const doc = new jsPDF();

  // Header Banner
  doc.setFillColor(13, 148, 136); // Teal 600
  doc.rect(0, 0, 210, 26, "F");

  // Parse itemized breakdown & target period
  const parsed = parseRemarks(tx.remarks);
  const isAdvanceReceipt = parsed?.isSeatBookingAdvance || tx.feeType?.toLowerCase().includes("seat booking");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("ACME COLLEGE OF NURSING", 14, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(isAdvanceReceipt ? "SEAT BOOKING ADVANCE PAYMENT RECEIPT" : "OFFICIAL FEE PAYMENT RECEIPT", 14, 21);

  doc.setFontSize(9);
  doc.text(`Receipt No: ${tx.receiptNumber}`, 196, 14, { align: "right" });
  doc.text(`Payment Date: ${tx.paymentDate}`, 196, 21, { align: "right" });
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
  doc.setFontSize(9.5);

  let metaY = 35;
  const labelX = 14;
  const valueX = 54;
  const lineSpacing = 6;

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

  // Row 3: Target Period (Exact Months / Semester / Academic Year)
  if (!isAdvanceReceipt) {
    doc.setFont("helvetica", "bold");
    doc.text("Target Period / AY:", labelX, metaY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(13, 148, 136); // Teal highlight for selected months/term
    const periodLines = doc.splitTextToSize(fullPeriodDisplay, 140);
    doc.text(periodLines, valueX, metaY);
    doc.setTextColor(30, 41, 59);
    metaY += periodLines.length * 5 + 1;
  }

  // Row 4: Fee Items Paid
  doc.setFont("helvetica", "bold");
  doc.text("Fee Items Paid:", labelX, metaY);
  doc.setFont("helvetica", "normal");
  const feeTypeLines = doc.splitTextToSize(tx.feeType || (isAdvanceReceipt ? "Seat Booking Advance" : "Course Fee"), 140);
  doc.text(feeTypeLines, valueX, metaY);
  metaY += feeTypeLines.length * 5 + 1;

  // Row 5: Payment Mode
  doc.setFont("helvetica", "bold");
  doc.text("Payment Mode:", labelX, metaY);
  doc.setFont("helvetica", "normal");
  doc.text((tx.paymentMode || "cash").toUpperCase(), valueX, metaY);
  metaY += lineSpacing + 2;

  const items: Array<{ name: string; frequency: string; amount: number; multiplier?: number }> =
    Array.isArray(parsed) ? parsed : parsed?.items || [];
  const gross = Number(parsed?.grossSubtotal || 0);
  const disc = Number(parsed?.discountAmount || 0);
  const reason = parsed?.discountReason || "Special Concession";
  const advanceAdjusted = Number(parsed?.advanceAdjustedAmount || 0);
  const advanceReceiptNo = parsed?.advanceReceiptNumber;

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
      head: [["Fee Component", "Selected Schedule / Period", "Amount"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 92 },
        1: { cellWidth: 50, halign: "center" },
        2: { cellWidth: 40, halign: "right" },
      },
    });

    startY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : metaY + 40;
  }

  // Subtotals, Discounts & Advance Adjustment Section (Right-aligned under table amount columns)
  if (gross > 0 || disc > 0 || advanceAdjusted > 0) {
    doc.setFontSize(9);
    const summaryLabelX = 106; // Aligned with the start of column 1 in table
    const summaryValueX = 193; // Aligned with right padding of table column 2

    if (gross > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text("Gross Component Subtotal:", summaryLabelX, startY);
      doc.text(`INR ${gross.toLocaleString()}`, summaryValueX, startY, { align: "right" });
      startY += 5;
    }

    if (disc > 0) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(16, 149, 106); // Emerald
      doc.text(`Concession / Scholarship (${reason}):`, summaryLabelX, startY);
      doc.text(`- INR ${disc.toLocaleString()}`, summaryValueX, startY, { align: "right" });
      startY += 5;
    }

    if (advanceAdjusted > 0) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(14, 116, 144); // Cyan / Teal
      const advLabel = advanceReceiptNo ? `Seat Booking Advance (${advanceReceiptNo}):` : "Seat Booking Advance Adjusted:";
      doc.text(advLabel, summaryLabelX, startY);
      doc.text(`- INR ${advanceAdjusted.toLocaleString()}`, summaryValueX, startY, { align: "right" });
      startY += 5;
    }

    startY += 2;
  }

  // Total Box
  doc.setFillColor(240, 253, 250); // Teal 50
  doc.setDrawColor(204, 251, 241); // Teal 100
  doc.roundedRect(14, startY, 182, 16, 2, 2, "FD");

  doc.setTextColor(13, 148, 136);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(advanceAdjusted > 0 ? "NET AMOUNT RECEIVED NOW:" : "TOTAL AMOUNT RECEIVED:", 20, startY + 10);
  doc.setFontSize(13);
  doc.text(`INR ${toNum(tx.amount).toLocaleString()}`, 193, startY + 10, { align: "right" });

  // Signatures
  const sigY = Math.max(startY + 30, 230);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  doc.text("Cashier / Accounts Officer", 14, sigY);
  doc.setDrawColor(203, 213, 225);
  doc.line(14, sigY + 10, 60, sigY + 10);

  doc.text("Authorized Signatory", 196, sigY, { align: "right" });
  doc.text("Verified System Receipt", 196, sigY + 12, { align: "right" });

  return doc;
};

const generateReceiptPDF = (tx: FeeTransaction) => {
  const doc = buildReceiptPDFDoc(tx);
  doc.save(`Fee_Receipt_${tx.receiptNumber}.pdf`);
};

const printReceiptPDF = (tx: FeeTransaction) => {
  const doc = buildReceiptPDFDoc(tx);
  const pdfBlobUrl = doc.output("bloburl");

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = pdfBlobUrl.toString();
  document.body.appendChild(iframe);

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      window.open(pdfBlobUrl.toString(), "_blank");
    }
  };
};

function FeeManagementPage() {
  const queryClient = useQueryClient();
  const [collectModalOpen, setCollectModalOpen] = React.useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  const [pendingPayload, setPendingPayload] = React.useState<any>(null);
  const [collectItems, setCollectItems] = React.useState<CollectFeeItem[]>([]);
  const [receiptTx, setReceiptTx] = React.useState<FeeTransaction | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = React.useState(false);
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

  const getPaidInfoForPeriod = React.useCallback(
    (opt: string) => {
      const list = paidPeriodsMap.get(opt.toLowerCase()) || [];
      if (list.length === 0) return null;

      const hasHostel = collectItems.some((i) => i.selected && isHostelFee(i.name));
      const hasAcademic = collectItems.some((i) => i.selected && !isHostelFee(i.name));

      if (hasHostel) {
        return list.find((x) => x.isHostel) || null;
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

  const isHostelFeeSelected = collectItems.some((i) => i.selected && isHostelFee(i.name));
  const watchFeeType = collectForm.watch("feeType");
  const isHostelFeeType = isHostelFee(watchFeeType || "");
  const isHostelActive = isHostelFeeSelected || isHostelFeeType;

  // Check if Course Fee is currently selected (or if no specific items are populated yet)
  const isCourseFeeActive = collectItems.length === 0 || collectItems.some((i) => i.selected && isTuitionFee(i.name));

  // Determine if period interval schedule is locked (Hostel is locked to monthly; Course Fee is locked if prior Course Fee payment exists)
  const isPeriodIntervalLocked = isHostelActive || (isCourseFeeActive && !!lockedPeriodIntervalType);

  const [selectedPeriods, setSelectedPeriods] = React.useState<string[]>(["Semester 1"]);

  // Keep selectedPeriods in sync with period type changes and avoid preselecting already paid periods
  const handlePeriodTypeChange = (newType: string) => {
    if (isHostelActive && newType !== "month") {
      toast.error("Hostel & Mess Fee is strictly billed on a monthly schedule.");
      return;
    }

    if (!isHostelActive && isCourseFeeActive && lockedPeriodIntervalType && newType !== lockedPeriodIntervalType) {
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

  // Automatically synchronize period interval type to monthly if Hostel & Mess fee is active, or to prior Course Fee payment locked type
  React.useEffect(() => {
    if (isHostelActive && watchBillingPeriodType !== "month") {
      handlePeriodTypeChange("month");
    } else if (!isHostelActive && isCourseFeeActive && lockedPeriodIntervalType && watchBillingPeriodType !== lockedPeriodIntervalType) {
      handlePeriodTypeChange(lockedPeriodIntervalType);
    }
  }, [isHostelActive, isCourseFeeActive, lockedPeriodIntervalType, watchBillingPeriodType]);

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
        createDefaultComponent("5", "Hostel & Mess Fee", toNum(fs.hostelMessMonthlyFee) * 12, "monthly", 0, 5),
        createDefaultComponent("6", "Exam Fee", toNum(fs.examFee), "semester", 0, 0),
        createDefaultComponent("7", "Misc Fee", toNum(fs.miscFee), "annually", 0, 0),
      ].filter((c) => c.amount > 0);
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
      };
    });

    setCollectItems(items);
  };

  const toggleCollectItemSelect = (compId: string) => {
    setCollectItems((prev) => {
      const target = prev.find((item) => item.componentId === compId);
      if (!target) return prev;
      const willSelect = !target.selected;

      if (willSelect) {
        if (isHostelFee(target.name)) {
          // Target is Hostel & Mess fee. Deselect all other non-hostel components and switch interval to monthly.
          const hadOtherSelected = prev.some((item) => item.componentId !== compId && item.selected);
          if (hadOtherSelected) {
            toast.info("Hostel & Mess Fee must be paid separately. Other fee components have been deselected.");
          }
          handlePeriodTypeChange("month");
          return prev.map((item) => ({
            ...item,
            selected: item.componentId === compId,
          }));
        } else {
          // Target is academic / other fee. Deselect any hostel fee components.
          const hadHostelSelected = prev.some((item) => isHostelFee(item.name) && item.selected);
          if (hadHostelSelected) {
            toast.info("Hostel & Mess Fee cannot be clubbed with other fees. Hostel fee has been deselected.");
          }
          return prev.map((item) => {
            if (isHostelFee(item.name)) return { ...item, selected: false };
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
        if (item.componentId !== compId || item.isFrequencyLocked || isTuitionFee(item.name)) return item;
        const targetRow =
          item.availableFrequencies.find((r) => r.key === newFreqKey) || item.availableFrequencies[0];
        const newUnitAmt = calcInstallmentAmount(item.baseAmount, targetRow);
        const mult = allowsPeriodMultiplier(item.name, newFreqKey) ? selectedPeriods.length : 1;
        return {
          ...item,
          selectedFrequencyKey: newFreqKey,
          unitAmount: newUnitAmt,
          multiplier: mult,
          amount: Math.round(newUnitAmt * mult),
        };
      })
    );
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

                  const hasHostel = selectedPaidItems.some((i) => isHostelFee(i.name));
                  const hasNonHostel = selectedPaidItems.some((i) => !isHostelFee(i.name));
                  if (hasHostel && hasNonHostel) {
                    toast.error("Hostel & Mess Fee cannot be clubbed with any other fee payment. Please collect it as a separate transaction.");
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
                        {isHostelActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-1.5 py-0.5 rounded font-semibold border border-purple-300 dark:border-purple-800">
                            <Lock size={10} /> Read-Only (Monthly - Hostel Fee)
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
                                ? isHostelActive
                                  ? "bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800 cursor-not-allowed"
                                  : "bg-muted/80 text-muted-foreground border-amber-300 dark:border-amber-800 cursor-not-allowed"
                                : "bg-background"
                            )}>
                              <div className="flex items-center gap-1 truncate">
                                {isPeriodIntervalLocked && <Lock size={11} className={cn("shrink-0", isHostelActive ? "text-purple-600 dark:text-purple-400" : "text-amber-600 dark:text-amber-400")} />}
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
                      {isHostelActive ? (
                        <p className="text-[10px] text-purple-700 dark:text-purple-400 mt-1 flex items-center gap-1 font-medium">
                          <Lock size={9} className="shrink-0" /> Hostel & Mess Fee is strictly billed on a monthly schedule and cannot be changed.
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

                    {collectItems.some((i) => i.selected && isHostelFee(i.name)) && (
                      <div className="flex items-center gap-2 text-[11px] bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 font-medium">
                        <Info size={13} className="shrink-0 text-purple-600 dark:text-purple-400" />
                        <span>Hostel & Mess Fee is selected as a standalone payment. It cannot be clubbed with Course, Admission, or other college fees.</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center border-b pb-1.5 text-xs font-semibold flex-wrap gap-2">
                      <span className="text-teal-800 dark:text-teal-300">Select Components to Collect:</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-medium"
                          onClick={() => setCollectItems((prev) => prev.map((i) => ({ ...i, selected: !isHostelFee(i.name) })))}
                        >
                          Select Academic Fees
                        </button>
                        <span className="text-muted-foreground">•</span>
                        <button
                          type="button"
                          className="text-[11px] text-purple-700 dark:text-purple-300 hover:underline font-semibold"
                          onClick={() => {
                            setCollectItems((prev) => prev.map((i) => ({ ...i, selected: isHostelFee(i.name) })));
                            if (watchBillingPeriodType !== "month") {
                                toast.warning("Period type forced to Monthly for Hostel/Mess fees.");
                                handlePeriodTypeChange("month");
                            }
                          }}
                        >
                          Select Hostel Only
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
                        const isHostel = isHostelFee(item.name);
                        return (
                          <div
                            key={item.componentId}
                            className={cn(
                              "flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border text-xs gap-2 transition-colors",
                              item.selected
                                ? isHostel
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
                                onChange={() => toggleCollectItemSelect(item.componentId)}
                                className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                              />
                              <label htmlFor={`item-cb-${item.componentId}`} className="font-semibold text-foreground cursor-pointer select-none flex items-center gap-1.5 flex-wrap">
                                {item.name}
                                {isHostel && (
                                  <span className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-1.5 py-0.2 rounded font-medium border border-purple-200 dark:border-purple-800">
                                    Standalone Fee
                                  </span>
                                )}
                                {item.isFrequencyLocked && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.2 rounded font-normal">
                                    <Lock size={9} /> Locked ({item.lockedFrequencyLabel || item.selectedFrequencyKey})
                                  </span>
                                )}
                              </label>
                            </div>

                          <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
                            {/* Schedule Select */}
                            <Select
                              disabled={!item.selected || item.isFrequencyLocked}
                              value={item.selectedFrequencyKey}
                              onValueChange={(val) => changeCollectItemSchedule(item.componentId, val)}
                            >
                              <SelectTrigger className={cn("h-8 text-xs min-w-[130px]", item.isFrequencyLocked && "bg-muted/80 text-muted-foreground border-amber-300 dark:border-amber-800")}>
                                <div className="flex items-center gap-1">
                                  {item.isFrequencyLocked && <Lock size={10} className="text-amber-600 dark:text-amber-400 shrink-0" />}
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
                                item.selected
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

                {/* Gross Subtotal & Discretionary Discount Controls */}
                <div className="border rounded-xl p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 space-y-3">
                  <div className="flex justify-between items-center border-b border-emerald-200/60 pb-1.5 text-xs font-semibold">
                    <span className="text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <Percent size={14} /> Fee Subtotal & Concession / Discount
                    </span>
                    <span className="text-muted-foreground">Gross Component Subtotal: <strong className="text-foreground">₹{grossCollectSubtotal.toLocaleString()}</strong></span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                          placeholder="e.g. Merit Scholarship, Financial Aid, Concession"
                          {...field}
                          error={fieldState.error?.message}
                        />
                      )}
                    />
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
                        <span>Less Concession / Discount ({reason || "Special Waiver"}):</span>
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

          <DialogFooter className="p-4 bg-muted/40 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReceiptModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              onClick={() => {
                if (receiptTx) generateReceiptPDF(receiptTx);
              }}
            >
              <Download size={15} className="mr-1.5" /> Download PDF
            </Button>
            <Button
              className="bg-teal-600 text-white"
              onClick={() => {
                if (receiptTx) printReceiptPDF(receiptTx);
              }}
            >
              <Printer size={15} className="mr-1.5" /> Print Receipt (PDF)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
