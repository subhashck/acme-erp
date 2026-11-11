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
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Autocomplete } from "@/ui/autocomplete";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/Field";
import { toast } from "@/lib/toast";
import { toNum } from "@/utils/math";
import { cn } from "@/lib/utils";
import { formatCollegePaymentMode } from "@/lib/college-payment";
import { buildCollegeReceiptPDFDoc } from "@/lib/college-receipt-pdf";
import { MonthBox, MonthBoxList } from "@/components/college/MonthBox";
import { useUserPermissions } from "@/lib/permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { CollegeReceiptDialog } from "@/components/college/CollegeReceiptDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ComponentFrequencyRow,
  FeeComponent,
  FeeStructure,
  createDefaultComponent,
  createDefaultFrequencyRows,
} from "./fee-structures";

export const Route = createFileRoute("/_authenticated/college/fees")({
  component: FeeManagementPage,
});

const getAcademicYear = (dateStr?: string): string => {
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

const frequencyKeyToBillingPeriodType = (frequencyKey?: string): string => {
  switch (frequencyKey) {
    case "monthly": return "month";
    case "quarterly": return "quarter";
    case "semester": return "semester";
    case "annually":
    case "yearly":
    case "one_time":
      return "academic_year";
    default: return "month";
  }
};

const formatPeriodOption = (period: string, periodType: string): string => {
  if (periodType !== "month") return period;
  const match = period.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return period;
  return `${match[1].slice(0, 3).toUpperCase()}-${match[2].slice(-2)}`;
};

interface AcademicScheduleRow {
  id: number;
  batchId: number;
  academicYear: string;
  semester: number;
  startDate: string;
  endDate: string;
  feeDueDate?: string | null;
}

interface BillingPeriodDefinition {
  value: string;
  monthKeys: string[];
}

const getNext12MonthKeys = (baseDate: Date = new Date()): string[] => {
  const result: string[] = [];
  const cur = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  for (let i = 0; i < 12; i++) {
    const d = new Date(cur.getFullYear(), cur.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    result.push(`${y}-${m}`);
  }
  return result;
};

const fallbackAcademicYearMonths = (academicYear: string): string[] => {
  const startYear = parseInt(academicYear.split("-")[0], 10);
  const baseAy = Number.isFinite(startYear)
    ? [
        `${startYear}-06`, `${startYear}-07`, `${startYear}-08`, `${startYear}-09`,
        `${startYear}-10`, `${startYear}-11`, `${startYear}-12`, `${startYear + 1}-01`,
        `${startYear + 1}-02`, `${startYear + 1}-03`, `${startYear + 1}-04`, `${startYear + 1}-05`,
      ]
    : [];
  const next12 = getNext12MonthKeys(new Date());
  return Array.from(new Set([...baseAy, ...next12])).sort();
};

const monthKeyFromDate = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const monthKeysBetween = (startDate: string, endDate: string): string[] => {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  const result: string[] = [];
  while (cursor <= last) {
    result.push(monthKeyFromDate(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
};

const scheduledDaysInMonth = (schedule: AcademicScheduleRow, monthKey: string): number => {
  const [year, month] = monthKey.split("-").map(Number);
  const monthStart = Date.UTC(year, month - 1, 1);
  const monthEnd = Date.UTC(year, month, 0);
  const scheduleStart = new Date(`${schedule.startDate}T00:00:00Z`).getTime();
  const scheduleEnd = new Date(`${schedule.endDate}T00:00:00Z`).getTime();
  const overlapStart = Math.max(monthStart, scheduleStart);
  const overlapEnd = Math.min(monthEnd, scheduleEnd);
  return overlapEnd < overlapStart ? 0 : Math.floor((overlapEnd - overlapStart) / 86_400_000) + 1;
};

const inferScheduleMonthPlan = (schedules: AcademicScheduleRow[]) => {
  const sortedSchedules = [...schedules].sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.semester - b.semester
  );
  const candidateMonths = Array.from(
    new Set(sortedSchedules.flatMap((schedule) => monthKeysBetween(schedule.startDate, schedule.endDate)))
  ).sort();
  const semesterMonths = new Map<number, string[]>();

  // A calendar month is atomic. If two terms touch the same month, assign it
  // to the term containing the greatest number of scheduled days so it cannot
  // be charged twice (for example, January between Semester 1 and Semester 2).
  candidateMonths.forEach((monthKey) => {
    const owner = sortedSchedules
      .map((schedule) => ({ schedule, days: scheduledDaysInMonth(schedule, monthKey) }))
      .filter((entry) => entry.days > 0)
      .sort((a, b) => b.days - a.days || a.schedule.semester - b.schedule.semester)[0]?.schedule;
    if (!owner) return;
    const current = semesterMonths.get(owner.semester) || [];
    current.push(monthKey);
    semesterMonths.set(owner.semester, current);
  });

  return {
    months: candidateMonths.filter((monthKey) =>
      Array.from(semesterMonths.values()).some((semester) => semester.includes(monthKey))
    ),
    semesters: sortedSchedules.map((schedule) => ({
      schedule,
      monthKeys: semesterMonths.get(schedule.semester) || [],
    })).filter((entry) => entry.monthKeys.length > 0),
  };
};

const formatMonthKeyLong = (monthKey: string): string => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

const formatMonthKeyShort = (monthKey: string): string => {
  const [year, month] = monthKey.split("-").map(Number);
  const mon = new Date(Date.UTC(year, month - 1, 1))
    .toLocaleString("en-US", { month: "short", timeZone: "UTC" })
    .toUpperCase();
  return `${mon}-${String(year).slice(-2)}`;
};

const buildBillingPeriodDefinitions = (
  academicYear: string,
  periodType: string,
  schedules: AcademicScheduleRow[]
): BillingPeriodDefinition[] => {
  const plan = inferScheduleMonthPlan(schedules);
  const baseMonths = plan.months.length > 0 ? plan.months : fallbackAcademicYearMonths(academicYear);
  const next12 = getNext12MonthKeys(new Date());
  const months = periodType === "month"
    ? Array.from(new Set([...baseMonths, ...next12])).sort()
    : baseMonths;
  if (months.length === 0) return [];

  if (periodType === "month") {
    return months.map((monthKey) => ({ value: formatMonthKeyLong(monthKey), monthKeys: [monthKey] }));
  }
  if (periodType === "semester") {
    return plan.semesters.map(({ schedule, monthKeys }) => ({
      value: `Semester ${schedule.semester} (${formatMonthKeyShort(monthKeys[0])} - ${formatMonthKeyShort(monthKeys[monthKeys.length - 1])})`,
      monthKeys,
    }));
  }
  if (periodType === "quarter") {
    const result: BillingPeriodDefinition[] = [];
    for (let index = 0; index < months.length; index += 3) {
      const monthKeys = months.slice(index, index + 3);
      result.push({
        value: `Q${result.length + 1} (${formatMonthKeyShort(monthKeys[0])} - ${formatMonthKeyShort(monthKeys[monthKeys.length - 1])})`,
        monthKeys,
      });
    }
    return result;
  }
  return [{
    value: `Full Academic Year (${formatMonthKeyShort(months[0])} - ${formatMonthKeyShort(months[months.length - 1])})`,
    monthKeys: months,
  }];
};

const expandPeriodsToMonths = (
  academicYear: string,
  periodType: string,
  periods: string[],
  schedules: AcademicScheduleRow[] = []
): string[] => {
  const definitions = buildBillingPeriodDefinitions(academicYear, periodType, schedules);
  if (definitions.length > 0 && schedules.length > 0) {
    return Array.from(new Set(
      periods.flatMap((period) =>
        definitions.find((definition) => definition.value === period)?.monthKeys || []
      )
    )).sort();
  }

  const months = fallbackAcademicYearMonths(academicYear);
  if (months.length !== 12) return [];
  const indexes = new Set<number>();
  const addRange = (start: number, end: number) => {
    for (let index = start; index <= end; index += 1) indexes.add(index);
  };

  if (periodType === "academic_year") addRange(0, 11);
  for (const period of periods) {
    const value = period.trim().toLowerCase();
    if (periodType === "month") {
      const match = period.match(/^([A-Za-z]+)\s+(\d{4})$/);
      if (match) {
        const date = new Date(`${match[1]} 1, ${match[2]}`);
        const key = Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const index = months.indexOf(key);
        if (index >= 0) indexes.add(index);
      }
    } else if (periodType === "semester") {
      const semester = Number(value.match(/semester\s*(\d+)/)?.[1] || 1);
      addRange(semester % 2 === 0 ? 6 : 0, semester % 2 === 0 ? 11 : 5);
    } else if (periodType === "quarter") {
      const quarter = Number(value.match(/q([1-4])/)?.[1] || 1);
      addRange((quarter - 1) * 3, quarter * 3 - 1);
    }
  }
  return [...indexes].sort((a, b) => a - b).map((index) => months[index]);
};

const normalizedFeeName = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isTuitionFee = (name?: string | null): boolean => {
  const normalized = normalizedFeeName(name);
  return normalized.includes("course") || normalized.includes("tuition");
};
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

function parseRemarks(remarks: unknown): any {
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
  componentIds: string[];
}

function extractPaidPeriodsFromTx(
  tx: FeeTransaction,
  allPeriodOptions: string[],
  targetPeriodType: string,
  schedules: AcademicScheduleRow[]
): PaidPeriodInfo[] {
  const r = parseRemarks(tx.remarks);
  const receiptNumber = tx.receiptNumber;
  const paymentDate = tx.paymentDate;
  const feeType = tx.feeType || "Course Fee";
  const items = Array.isArray(r?.items) ? r.items : [];
  const components = items.map((i: any) => i.name);
  const componentIds = items
    .map((i: any) => String(i?.componentId || "").trim())
    .filter(Boolean);
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
        componentIds,
      });
    }
  };

  const receiptPeriods: string[] = Array.isArray(r?.selectedPeriods)
    ? r.selectedPeriods
    : (r?.billingPeriodValue ? [r.billingPeriodValue] : []);
  const coveredMonths = Array.isArray(r?.coveredMonths) && r.coveredMonths.length > 0
    ? r.coveredMonths.map((month: unknown) => String(month)).filter(Boolean)
    : expandPeriodsToMonths(
        String(r?.academicYear || ""),
        String(r?.billingPeriodType || ""),
        receiptPeriods,
        schedules.filter((schedule) => schedule.academicYear === r?.academicYear)
      );
  if (coveredMonths.length > 0 && r?.academicYear) {
    for (const option of allPeriodOptions) {
      const optionMonths = expandPeriodsToMonths(
        String(r.academicYear),
        targetPeriodType,
        [option],
        schedules.filter((schedule) => schedule.academicYear === r.academicYear)
      );
      if (optionMonths.some((month) => coveredMonths.includes(month))) addPeriod(option);
    }
    return result;
  }

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
  return buildCollegeReceiptPDFDoc(tx as any, userName);
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

const formatFeeReceiptWhatsAppMessage = (tx: FeeTransaction, student?: any): string => {
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
  const surcharge = Number(parsed?.surchargeAmount || 0);
  const surchargeReason = parsed?.surchargeReason || "Fee Surcharge / Late Fee";
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
  lines.push(`*Payment Mode:* ${formatCollegePaymentMode(tx.paymentMode)}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*FEE BREAKDOWN:*`);

  if (items.length > 0) {
    items.forEach((it: any) => {
      const head = it.category || it.name || it.description || "Fee";
      const months =
        it.periodLabel ||
        (Array.isArray(it.selectedMonths) && it.selectedMonths.length > 0 ? it.selectedMonths.join(", ") : it.frequency);
      const qty = it.quantity || it.multiplier;
      const periodStr = months ? ` [${months}${qty && qty > 1 ? ` · ${qty} mo` : ""}]` : "";

      const disc = Number(it.discountAmount || 0);
      const sur = Number(it.surchargeAmount || 0);
      let adj = "";
      if (disc > 0 && sur > 0) {
        adj = ` (Base: ₹${Number(it.unitPrice).toLocaleString()}/mo, -₹${it.discountPerMonth}/mo conc, +₹${it.surchargePerMonth}/mo surc)`;
      } else if (disc > 0) {
        adj = ` (Base: ₹${Number(it.unitPrice).toLocaleString()}/mo, -₹${it.discountPerMonth}/mo conc)`;
      } else if (sur > 0) {
        adj = ` (Base: ₹${Number(it.unitPrice).toLocaleString()}/mo, +₹${it.surchargePerMonth}/mo surc)`;
      }

      lines.push(`• ${head}${periodStr}: ₹${Number(it.amount || 0).toLocaleString()}${adj}`);
    });
  } else {
    lines.push(`• ${tx.feeType || "College Fee"}: ₹${Number(toNum(tx.amount)).toLocaleString()}`);
  }

  if (gross > 0 || disc > 0 || surcharge > 0 || advanceAdjusted > 0) {
    lines.push(`┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`);
    if (gross > 0) lines.push(`*Gross Subtotal:* ₹${gross.toLocaleString()}`);
    if (disc > 0) {
      const discTitle = formatDiscountLabel(reason).replace(/:$/, "");
      lines.push(`*Less ${discTitle}:* -₹${disc.toLocaleString()}`);
      const itemDiscs = items.filter((i: any) => Number(i.discountAmount || 0) > 0);
      if (itemDiscs.length > 0) {
        itemDiscs.forEach((i: any) => {
          lines.push(`  - ${i.category || i.description}: -₹${Number(i.discountAmount).toLocaleString()} (-₹${i.discountPerMonth || Math.round(Number(i.discountAmount) / Math.max(1, i.quantity || 1))}/mo)`);
        });
      }
    }
    if (surcharge > 0) {
      lines.push(`*Plus Surcharge (${surchargeReason}):* +₹${surcharge.toLocaleString()}`);
      const itemSurs = items.filter((i: any) => Number(i.surchargeAmount || 0) > 0);
      if (itemSurs.length > 0) {
        itemSurs.forEach((i: any) => {
          lines.push(`  + ${i.category || i.description}: +₹${Number(i.surchargeAmount).toLocaleString()} (+₹${i.surchargePerMonth || Math.round(Number(i.surchargeAmount) / Math.max(1, i.quantity || 1))}/mo)`);
        });
      }
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

const openWhatsAppReceipt = (phone: string, text: string) => {
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

const shareReceiptPDFViaWhatsApp = async (
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
  const { isAdmin } = useUserPermissions();
  const { session } = Route.useRouteContext() as { session?: any };
  const currentUserName = session?.data?.user?.name || session?.data?.user?.email || session?.user?.name || "Cashier / Accounts Officer";
  const [collectModalOpen, setCollectModalOpen] = React.useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  const [pendingPayload, setPendingPayload] = React.useState<any>(null);
  const [collectItems, setCollectItems] = React.useState<CollectFeeItem[]>([]);
  const [receiptTx, setReceiptTx] = React.useState<FeeTransaction | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = React.useState(false);
  const [deletingReceipt, setDeletingReceipt] = React.useState<FeeTransaction | null>(null);
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
  const [sorting, setSorting] = React.useState<{ column: string; direction: "asc" | "desc" } | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>("");
  const [paymentModeFilter, setPaymentModeFilter] = React.useState<string>("all");
  const [batchFilter, setBatchFilter] = React.useState<number>(0);
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

  const { data: batches = [] } = useQuery<any[]>({
    queryKey: ["nursing", "batches"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/batches");
      if (!res.ok) throw new Error("Failed to fetch batches");
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

  const { data: academicSchedules = [] } = useQuery<AcademicScheduleRow[]>({
    queryKey: ["nursing", "academic-schedules"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/academic-schedules");
      if (!res.ok) throw new Error("Failed to fetch academic schedules");
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
      sorting,
      currentPage,
      pageSize,
      debouncedSearch,
      paymentModeFilter,
      batchFilter,
      startDateFilter,
      endDateFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", String(currentPage));
      params.append("pageSize", String(pageSize));
      if (sorting) {
        params.append("sortBy", sorting.column);
        params.append("sortDirection", sorting.direction);
      }
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (paymentModeFilter && paymentModeFilter !== "all") params.append("paymentMode", paymentModeFilter);
      if (batchFilter > 0) params.append("batchId", String(batchFilter));
      if (startDateFilter) params.append("startDate", startDateFilter);
      if (endDateFilter) params.append("endDate", endDateFilter);

      const res = await fetch(`/api/nursing/fees/transactions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch fee transactions");
      return res.json();
    },
  });

  const feeTransactions = txResponse?.transactions || [];

  const deleteReceiptMutation = useMutation({
    mutationFn: async (receipt: FeeTransaction) => {
      const res = await fetch(`/api/nursing/fees/transactions/${receipt.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to delete fee receipt");
      return body;
    },
    onSuccess: async (_data, receipt) => {
      setDeletingReceipt(null);
      await queryClient.invalidateQueries({ queryKey: ["nursing"] });
      toast.success(`Receipt ${receipt.receiptNumber} deleted successfully`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const pagination = txResponse?.pagination;
  const totalTransactionsCount = txResponse?.metrics?.totalTransactions ?? 0;
  const totalCollectedAmount = txResponse?.metrics?.totalCollectedAmount ?? 0;
  const filteredCollectedAmount = txResponse?.metrics?.filteredCollectedAmount ?? 0;

  const hasActiveFilters =
    debouncedSearch.length > 0 ||
    paymentModeFilter !== "all" || batchFilter > 0 ||
    startDateFilter.length > 0 ||
    endDateFilter.length > 0;

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setPaymentModeFilter("all");
    setBatchFilter(0);
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
      billingPeriodValue: "",
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
  const calendarStartMonth = new Date(currentCalYear - 5, 0, 1);
  const calendarEndMonth = new Date(currentCalYear + 5, 11, 1);
  const calendarDisabledDays = {
    before: calendarStartMonth,
    after: new Date(currentCalYear + 5, 11, 31),
  };
  const fallbackAcademicYearOptions = [
    `${currentCalYear - 2}-${currentCalYear - 1}`,
    `${currentCalYear - 1}-${currentCalYear}`,
    `${currentCalYear}-${currentCalYear + 1}`,
    `${currentCalYear + 1}-${currentCalYear + 2}`,
    `${currentCalYear + 2}-${currentCalYear + 3}`,
  ];

  const selectedBatchSchedules = React.useMemo(
    () => academicSchedules.filter((schedule) => schedule.batchId === selectedStudentForCollect?.batchId),
    [academicSchedules, selectedStudentForCollect?.batchId]
  );
  const targetAcademicYearSchedules = React.useMemo(
    () => selectedBatchSchedules.filter((schedule) => schedule.academicYear === watchTargetAcademicYear),
    [selectedBatchSchedules, watchTargetAcademicYear]
  );
  const academicYearOptions = React.useMemo(() => {
    const configured = Array.from(new Set(selectedBatchSchedules.map((schedule) => schedule.academicYear))).sort();
    return configured.length > 0 ? configured : fallbackAcademicYearOptions;
  }, [selectedBatchSchedules, currentCalYear]);
  const periodDefinitions = React.useMemo(
    () => targetAcademicYearSchedules.length > 0
      ? buildBillingPeriodDefinitions(
          watchTargetAcademicYear,
          watchBillingPeriodType,
          targetAcademicYearSchedules
        )
      : [],
    [watchTargetAcademicYear, watchBillingPeriodType, targetAcademicYearSchedules]
  );
  const periodValueOptions = React.useMemo(
    () => periodDefinitions.map((definition) => definition.value),
    [periodDefinitions]
  );

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

      const infos = extractPaidPeriodsFromTx(
        tx,
        periodValueOptions,
        watchBillingPeriodType,
        targetAcademicYearSchedules
      );
      infos.forEach((info) => {
        const key = normalizedFeeName(info.period);
        if (!key) return;
        const existing = map.get(key) || [];
        existing.push(info);
        map.set(key, existing);
      });
    });

    return map;
  }, [watchStudentId, studentTransactions, watchTargetAcademicYear, periodValueOptions, watchBillingPeriodType, targetAcademicYearSchedules]);

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

      const selectedComponent = collectItems.find((item) => item.selected);
      if (!selectedComponent) return null;

      const selectedId = String(selectedComponent.componentId || "").trim();
      const selectedName = normalizedFeeName(selectedComponent.name);
      return list.find((info) => {
        if (selectedId && info.componentIds.includes(selectedId)) return true;
        if (selectedName && info.components.some((name) => normalizedFeeName(name) === selectedName)) return true;

        // Legacy receipts may not have an itemized component list. Only use
        // their fee type when it names the selected component exactly; never
        // fall back to the broad Academic/Hostel/Mess category.
        return info.componentIds.length === 0 &&
          info.components.length === 1 &&
          normalizedFeeName(info.feeType) === selectedName;
      }) || null;
    },
    [paidPeriodsMap, collectItems]
  );

  const isHostelFeeSelected = collectItems.some((i) => i.selected && isHostelOnlyFee(i.name));
  const isMessFeeSelected = collectItems.some((i) => i.selected && isMessOnlyFee(i.name));
  // Selected hostel fee item (if any)
  const selectedHostelItem = collectItems.find((i) => i.selected && isHostelOnlyFee(i.name));
  const selectedFeeComponent = collectItems.find((i) => i.selected);
  const isHostelAnnual = selectedHostelItem?.selectedFrequencyKey === "annually";
  const selectedAccommodationItem = collectItems.find((i) => i.selected && isHostelOrMessFee(i.name));
  const requiredAccommodationPeriodType = selectedAccommodationItem
    ? frequencyKeyToBillingPeriodType(selectedAccommodationItem.selectedFrequencyKey)
    : null;

  // Determine if period interval schedule is locked
  const isPeriodIntervalLocked =
    !!selectedAccommodationItem;

  const [selectedPeriods, setSelectedPeriods] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!selectedStudentForCollect) {
      setSelectedPeriods([]);
      return;
    }
    const configuredYears = Array.from(
      new Set(selectedBatchSchedules.map((schedule) => schedule.academicYear))
    ).sort();
    if (configuredYears.length === 0) {
      setSelectedPeriods([]);
      return;
    }
    const paymentAcademicYear = getAcademicYear(watchPaymentDate);
    const nextAcademicYear = configuredYears.includes(paymentAcademicYear)
      ? paymentAcademicYear
      : configuredYears[0];
    if (collectForm.getValues("targetAcademicYear") !== nextAcademicYear) {
      collectForm.setValue("targetAcademicYear", nextAcademicYear);
    }
    setSelectedPeriods([]);
  }, [selectedStudentForCollect?.id, selectedBatchSchedules]);

  React.useEffect(() => {
    if (!selectedFeeComponent) {
      if (selectedPeriods.length > 0) setSelectedPeriods([]);
      return;
    }
    const stillValid = selectedPeriods.filter(
      (period) => periodValueOptions.includes(period) && !getPaidInfoForPeriod(period)
    );
    if (stillValid.length > 0) {
      if (stillValid.length !== selectedPeriods.length) setSelectedPeriods(stillValid);
      return;
    }
    const firstUnpaid = periodValueOptions.find((period) => !getPaidInfoForPeriod(period));
    if (firstUnpaid) setSelectedPeriods([firstUnpaid]);
  }, [selectedFeeComponent?.componentId, periodValueOptions, paidPeriodsMap]);

  // Keep selectedPeriods in sync with period type changes and avoid preselecting already paid periods
  const handlePeriodTypeChange = (newType: string, forceComponentSchedule = false) => {
    if (!forceComponentSchedule && requiredAccommodationPeriodType && newType !== requiredAccommodationPeriodType) {
      toast.error(
        `${selectedAccommodationItem?.name || "Accommodation fee"} uses the ${getPeriodIntervalLabel(requiredAccommodationPeriodType)} schedule configured in the Fee Structure Master.`
      );
      return;
    }

    collectForm.setValue("billingPeriodType", newType);

    const allOpts = buildBillingPeriodDefinitions(
      watchTargetAcademicYear,
      newType,
      targetAcademicYearSchedules
    ).map((definition) => definition.value);

    const firstUnpaid = allOpts.find((opt) => !paidPeriodsMap.has(opt.toLowerCase()));
    setSelectedPeriods(firstUnpaid ? [firstUnpaid] : []);

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
    if (requiredAccommodationPeriodType && watchBillingPeriodType !== requiredAccommodationPeriodType) {
      handlePeriodTypeChange(requiredAccommodationPeriodType, true);
    }
  }, [requiredAccommodationPeriodType, watchBillingPeriodType]);

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

  const selectNext12Months = () => {
    const next12Definitions = getNext12MonthKeys(new Date()).map(formatMonthKeyLong);
    const unpaid = next12Definitions.filter(
      (opt) => periodValueOptions.includes(opt) && !getPaidInfoForPeriod(opt)
    );
    if (unpaid.length === 0) {
      toast.info("All next 12 months are already paid or not available in the current schedule.");
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
    if (selectedPeriods.length === 0) return "No period selected";
    if (selectedPeriods.length === 1) return selectedPeriods[0];
    if (watchBillingPeriodType === "month") {
      if (selectedPeriods.length === periodValueOptions.length) return `All ${selectedPeriods.length} Months (Full AY ${watchTargetAcademicYear})`;
      return `${selectedPeriods.join(", ")} (${selectedPeriods.length} Months)`;
    }
    if (watchBillingPeriodType === "semester") {
      if (selectedPeriods.length === periodValueOptions.length) return `All ${selectedPeriods.length} Semesters`;
      return `${selectedPeriods.join(", ")} (${selectedPeriods.length} Semesters)`;
    }
    if (watchBillingPeriodType === "quarter") {
      if (selectedPeriods.length === periodValueOptions.length) return `All ${selectedPeriods.length} Quarters (Full Schedule)`;
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
            (lf) =>
              (item.componentId && lf.componentId === item.componentId) ||
              (normalizedFeeName(lf.componentName) !== "" && normalizedFeeName(lf.componentName) === normalizedFeeName(item.name))
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
        createDefaultComponent("5", "Hostel Fee", toNum(fs.hostelFee), "monthly", 0, 0, [
          { id: "f-monthly", key: "monthly", label: "Monthly", count: 12, rebatePercent: 0, surchargePercent: 0 },
          { id: "f-annually", key: "annually", label: "Annually (5% Rebate)", count: 1, rebatePercent: 5, surchargePercent: 0 },
        ]),
        createDefaultComponent("6", "Mess Fee", toNum(fs.hostelMessMonthlyFee) * 12, "monthly", 0, 0, [
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
    const hasSecurity = comps.some((c) => normalizedFeeName(c.name).includes("security"));
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
        (lf) =>
          (c.id && lf.componentId === c.id) ||
          (normalizedFeeName(lf.componentName) !== "" && normalizedFeeName(lf.componentName) === normalizedFeeName(c.name))
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

      const isOneTime = selKey === "one_time" || normalizedFeeName(c.name).includes("security deposit");
      const paidOneTimeInfo = isOneTime ? paidOneTimeMap.get(normalizedFeeName(c.name)) : null;
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
      if (isHostelOrMessFee(target.name)) {
        handlePeriodTypeChange(frequencyKeyToBillingPeriodType(target.selectedFrequencyKey), true);
      }
      return prev.map((item) => ({ ...item, selected: item.componentId === compId }));
    });
  };

  const changeCollectItemSchedule = (compId: string, newFreqKey: string) => {
    const changedItem = collectItems.find((i) => i.componentId === compId);
    const pairedAccommodation = changedItem && isHostelOrMessFee(changedItem.name)
      ? collectItems.find((item) => item.componentId !== compId && item.selected && isHostelOrMessFee(item.name))
      : undefined;
    if (pairedAccommodation) {
      const pairedFrequency = pairedAccommodation.availableFrequencies.find((row) => row.key === newFreqKey);
      if (!pairedFrequency || (pairedAccommodation.isFrequencyLocked && pairedAccommodation.selectedFrequencyKey !== newFreqKey)) {
        toast.error(
          `${pairedAccommodation.name} cannot use this schedule. Deselect it or choose a frequency supported by both Hostel and Mess.`
        );
        return;
      }
    }

    setCollectItems((prev) =>
      prev.map((item) => {
        const shouldSynchronizePair = Boolean(
          pairedAccommodation && item.componentId === pairedAccommodation.componentId
        );
        if (
          (item.componentId !== compId && !shouldSynchronizePair) ||
          item.isFrequencyLocked ||
          isTuitionFee(item.name) ||
          item.isOneTimePaid
        ) return item;
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

    if (changedItem && isHostelOrMessFee(changedItem.name)) {
      const periodType = frequencyKeyToBillingPeriodType(newFreqKey);
      toast.info(`${changedItem.name} schedule set to ${getPeriodIntervalLabel(periodType)}.`);
      handlePeriodTypeChange(periodType, true);
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
      queryClient.invalidateQueries({ queryKey: ["nursing", "student-advance-balance"] });
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
    <div className="college-fees-page min-w-0 p-3 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-start gap-2">
            <Receipt className="h-6 w-6 shrink-0 text-teal-600" />
            Fee Collection & Payment Ledger
          </h1>
          <p className="text-sm text-muted-foreground">
            Record student fee installment collections, manage transaction receipts, and view payment history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild size="sm">
            <Link to="/college/fee-dues" className="flex items-center gap-1.5 text-xs">
              <DollarSign size={14} /> Fee Due Tracking
            </Link>
          </Button>

          {/* Record Fee Payment Modal Trigger */}
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2"
            onClick={() => setCollectModalOpen(true)}
          >
            <Plus size={16} /> Collect Fee / Issue Receipt
          </Button>

          <CollegeReceiptDialog
            open={collectModalOpen}
            onOpenChange={setCollectModalOpen}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["nursing", "fee-transactions"] });
              queryClient.invalidateQueries({ queryKey: ["nursing"] });
            }}
          />
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
        <CardHeader className="flex flex-col gap-4">
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

            <select
              aria-label="Filter by batch"
              className="min-w-0 max-w-full w-full sm:w-auto sm:max-w-80 border rounded-md px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-teal-500"
              value={batchFilter}
              onChange={(e) => {
                setBatchFilter(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={0}>All Batches</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {[batch.courseName, batch.name || batch.academicYear, batch.section && `Section ${batch.section}`].filter(Boolean).join(" · ")}
                </option>
              ))}
            </select>

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
              <option value="upi_bank_transfer_dr_je">UPI/Bank Transfer - Dr JE</option>
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
                  startMonth={calendarStartMonth}
                  endMonth={calendarEndMonth}
                  disabled={calendarDisabledDays}
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
                  startMonth={calendarStartMonth}
                  endMonth={calendarEndMonth}
                  disabled={calendarDisabledDays}
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
        <CardContent className="min-w-0 px-3 sm:px-5">
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
                <table className="w-full min-w-300 text-sm text-left border-collapse [&_td]:align-top">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                      <th className="p-3 whitespace-nowrap" scope="col">S.No.</th>
                      {[
                        ["studentName", "Student Name"],
                        ["enrollmentNo", "Enrollment No"],
                        ["period", "Target Period / AY"],
                        ["feeType", "Fee Component(s) Paid"],
                        ["amount", "Amount Paid"],
                        ["paymentMode", "Mode"],
                        ["paymentDate", "Payment Date"],
                      ].map(([column, label]) => {
                        const active = sorting?.column === column;
                        const SortIcon = active ? (sorting.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                        return (
                          <th key={column} scope="col" className={cn("p-3", column === "amount" && "text-right")} aria-sort={active ? (sorting.direction === "asc" ? "ascending" : "descending") : "none"}>
                            <button type="button" className="inline-flex min-h-11 items-center gap-1 text-left rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:text-foreground"
                              aria-label={`Sort ${label} ${active && sorting.direction === "asc" ? "descending" : "ascending"}`}
                              onClick={() => {
                                setSorting({ column, direction: active && sorting.direction === "asc" ? "desc" : "asc" });
                                setCurrentPage(1);
                              }}>
                              {label}<SortIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            </button>
                          </th>
                        );
                      })}
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {feeTransactions.map((tx, index) => {
                      const parsedDetails = parseRemarks(tx.remarks);
                      const isSeatAdvance = parsedDetails?.isSeatBookingAdvance || tx.feeType?.toLowerCase().includes("seat booking");
                      const discAmt = Number(parsedDetails?.discountAmount || 0);
                      const discReason = parsedDetails?.discountReason;
                      const advanceAdj = Number(parsedDetails?.advanceAdjustedAmount || 0);
                      const advanceReceiptRef = parsedDetails?.advanceReceiptNumber;
                      const periodLabel = parsedDetails?.periodLabel || (parsedDetails?.academicYear ? `AY ${parsedDetails.academicYear}${parsedDetails?.billingPeriodValue ? ` • ${parsedDetails.billingPeriodValue}` : ""}` : null);

                      return (
                        <tr key={tx.id} className="hover:bg-muted/30">
                          <td className="p-3 tabular-nums text-muted-foreground">{((pagination?.page ?? currentPage) - 1) * (pagination?.pageSize ?? pageSize) + index + 1}</td>
                          {/* <td className="p-3 font-mono font-bold text-teal-600">{tx.receiptNumber}</td> */}
                          <td className="p-3 font-medium text-foreground">{tx.studentName}</td>
                          <td className="p-3 font-mono">{tx.enrollmentNo}</td>
                          <td className="p-3">
                            {isSeatAdvance ? (
                              <span className="text-muted-foreground text-[11px]">Provisional Booking</span>
                            ) : (parsedDetails?.selectedMonths && parsedDetails.selectedMonths.length > 0) ? (
                              <div className="space-y-1">
                                {parsedDetails?.academicYear && (
                                  <span className="text-[10px] font-semibold text-teal-800 dark:text-teal-300 block font-mono">
                                    AY {parsedDetails.academicYear}
                                  </span>
                                )}
                                <MonthBoxList months={parsedDetails.selectedMonths} size="xs" />
                              </div>
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
                            <div className="mt-1 space-y-1 font-normal">
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
                            </div>
                          </td>
                          <td className="p-3 text-right font-bold text-foreground">₹{toNum(tx.amount).toLocaleString()}</td>
                          <td className="p-3">{formatCollegePaymentMode(tx.paymentMode)}</td>
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
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Delete fee receipt"
                                  onClick={() => setDeletingReceipt(tx)}
                                >
                                  <Trash2 size={13} className="mr-1" /> Delete
                                </Button>
                              )}
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
      <Dialog
        open={Boolean(deletingReceipt)}
        onOpenChange={(open) => {
          if (!open && !deleteReceiptMutation.isPending) setDeletingReceipt(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Delete fee receipt?</DialogTitle>
            <DialogDescription>
              Receipt <strong>{deletingReceipt?.receiptNumber}</strong> for ₹
              {toNum(deletingReceipt?.amount).toLocaleString()} will be permanently removed. This action is recorded in the audit log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingReceipt(null)}
              disabled={deleteReceiptMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingReceipt && deleteReceiptMutation.mutate(deletingReceipt)}
              disabled={!deletingReceipt || deleteReceiptMutation.isPending}
            >
              {deleteReceiptMutation.isPending ? "Deleting..." : "Delete Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent
          className="w-[calc(100vw-1rem)] sm:max-w-162 max-h-[92dvh] p-0 flex flex-col overflow-hidden rounded-xl"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1" id="printable-fee-receipt">
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

                // Collect breakdown items
                const breakdownItems: Array<{
                  category?: string;
                  name?: string;
                  description?: string;
                  periodLabel?: string;
                  selectedMonths?: string[];
                }> = parsed?.items || parsed?.periodDetails?.itemsBreakdown || [];

                const itemsWithPeriods = breakdownItems.filter(
                  (it) => it.periodLabel || (Array.isArray(it.selectedMonths) && it.selectedMonths.length > 0)
                );

                return (
                  <div className="col-span-2 space-y-1.5 bg-muted/20 p-2.5 rounded-lg border border-border/70">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground block font-medium">Billing Session & Covered Periods</span>
                      {acadYear && (
                        <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                          AY {acadYear}
                        </span>
                      )}
                    </div>
                    {itemsWithPeriods.length > 0 ? (
                      <div className="space-y-1.5 pt-0.5">
                        {itemsWithPeriods.map((it, idx) => {
                          const months = (it.selectedMonths && it.selectedMonths.length > 0) ? it.selectedMonths : (it.periodLabel || "");
                          const headName = it.category || it.name || "Fee";
                          return (
                            <div
                              key={idx}
                              className="flex flex-wrap items-center gap-2 text-xs bg-background p-2 rounded-lg border border-border/80"
                            >
                              <span className="font-semibold text-foreground min-w-28">{headName}:</span>
                              <MonthBoxList months={months} size="sm" />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      (parsed?.periodLabel || parsed?.billingPeriodValue) ? (
                        <div className="flex items-center gap-2 text-xs bg-background p-2 rounded-lg border border-border/80">
                          <MonthBoxList months={parsed.periodLabel || parsed.billingPeriodValue} size="sm" />
                        </div>
                      ) : null
                    )}
                  </div>
                );
              })()}
              <div className="col-span-2 flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground block">Fee Items Paid</span>
                  <span className="font-semibold text-foreground">{receiptTx?.feeType}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block">Payment Mode</span>
                  <span className="font-medium text-foreground">
                    {formatCollegePaymentMode(receiptTx?.paymentMode)}
                    {parseRemarks(receiptTx?.remarks)?.referenceNo ? ` (Ref: ${parseRemarks(receiptTx?.remarks).referenceNo})` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Itemized Table Breakdown & Discount on Receipt */}
            {(() => {
              const parsed = parseRemarks(receiptTx?.remarks);

              const items: Array<{
                name?: string;
                category?: string;
                description?: string;
                periodLabel?: string;
                selectedMonths?: string[];
                frequency?: string;
                quantity?: number;
                unitPrice?: number;
                amount: number;
                discountAmount?: number;
                discountPerMonth?: number;
                discountReason?: string;
                surchargeAmount?: number;
                surchargePerMonth?: number;
                surchargeReason?: string;
                netUnitPrice?: number;
                baseAmount?: number;
              }> = Array.isArray(parsed) ? parsed : parsed?.items || [];
              const gross = Number(parsed?.grossSubtotal || 0);
              const disc = Number(parsed?.discountAmount || 0);
              const reason = parsed?.discountReason;
              const surcharge = Number(parsed?.surchargeAmount || 0);
              const surchargeReason = parsed?.surchargeReason || "Fee Surcharge / Late Fee";
              const advAdjusted = Number(parsed?.advanceAdjustedAmount || 0);
              const advReceipt = parsed?.advanceReceiptNumber;

              const hasAnyMonths = items.some(
                (it) => it.periodLabel || (Array.isArray(it.selectedMonths) && it.selectedMonths.length > 0)
              );

              return (
                <div className="space-y-3 font-sans">
                  {items.length > 0 && (
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-muted/60 text-muted-foreground border-b font-semibold text-[11px]">
                            <th className="p-2">Fee Component</th>
                            {hasAnyMonths && <th className="p-2">Covered Month(s)</th>}
                            <th className="p-2 text-center">Qty</th>
                            <th className="p-2 text-right">Rate/Mo</th>
                            <th className="p-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-xs">
                          {items.map((it, idx) => {
                            const feeHead = it.category || it.name || it.description || "Fee Component";
                            const period =
                              it.periodLabel ||
                              (Array.isArray(it.selectedMonths) && it.selectedMonths.length > 0
                                ? it.selectedMonths.join(", ")
                                : it.frequency || "-");
                            const qty = Number(it.quantity || 1);
                            const unitRate = Number(
                              it.unitPrice || (qty > 1 ? Math.round(Number(it.amount || 0) / qty) : Number(it.amount || 0))
                            );
                            const baseRate = Number(it.unitPrice || 0);
                            const discPerMo = Number(it.discountPerMonth || (Number(it.discountAmount || 0) > 0 ? Math.round(Number(it.discountAmount) / qty) : 0));
                            const surPerMo = Number(it.surchargePerMonth || (Number(it.surchargeAmount || 0) > 0 ? Math.round(Number(it.surchargeAmount) / qty) : 0));
                            const netRate = Number(it.netUnitPrice || (baseRate - discPerMo + surPerMo)) || baseRate;
                            const baseTotal = Number(it.baseAmount || (qty * baseRate));
                            const hasAdjustments = discPerMo > 0 || surPerMo > 0;

                            return (
                              <tr key={idx} className="hover:bg-muted/30">
                                <td className="p-2">
                                  <div className="font-semibold text-foreground">{feeHead}</div>
                                  {it.description && it.description !== feeHead && (
                                    <div className="text-[11px] text-muted-foreground">{it.description}</div>
                                  )}
                                </td>
                                {hasAnyMonths && (
                                  <td className="p-2">
                                    {period !== "-" ? (
                                      <MonthBoxList
                                        months={
                                          (Array.isArray(it.selectedMonths) && it.selectedMonths.length > 0)
                                            ? it.selectedMonths
                                            : (it.periodLabel || period)
                                        }
                                        size="xs"
                                      />
                                    ) : (
                                      <span className="text-muted-foreground text-[11px]">-</span>
                                    )}
                                  </td>
                                )}
                                <td className="p-2 text-center font-mono">{qty}</td>
                                <td className="p-2 text-right font-mono text-muted-foreground">
                                  <div className="font-semibold text-foreground">₹{(hasAdjustments ? netRate : (baseRate || unitRate)).toLocaleString()}</div>
                                  {hasAdjustments && (
                                    <div className="text-[10px] space-y-0.5">
                                      <div className="line-through text-muted-foreground">Base: ₹{baseRate.toLocaleString()}</div>
                                      {discPerMo > 0 && <div className="text-amber-600 dark:text-amber-400">-₹{discPerMo}/mo</div>}
                                      {surPerMo > 0 && <div className="text-rose-600 dark:text-rose-400">+₹{surPerMo}/mo</div>}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 text-right font-bold font-mono text-foreground">
                                  <div>₹{Number(it.amount || 0).toLocaleString()}</div>
                                  {hasAdjustments && baseTotal > Number(it.amount || 0) && (
                                    <div className="text-[10px] text-muted-foreground font-normal line-through">
                                      ₹{baseTotal.toLocaleString()}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
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
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 font-semibold">
                          <span>Less {formatDiscountLabel(reason).replace(/:$/, "")}:</span>
                          <span>-₹{disc.toLocaleString()}</span>
                        </div>
                        {items.filter((i) => Number(i.discountAmount || 0) > 0).map((i, k) => (
                          <div key={k} className="flex justify-between items-center text-[11px] text-emerald-600 dark:text-emerald-400 pl-3">
                            <span>• {i.category || i.name || i.description} ({i.discountReason || "Concession"}):</span>
                            <span className="font-mono">-₹{Number(i.discountAmount).toLocaleString()} (-₹{Number(i.discountPerMonth || Math.round(Number(i.discountAmount) / Math.max(1, i.quantity || 1))).toLocaleString()}/mo)</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {surcharge > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-rose-700 dark:text-rose-400 font-semibold">
                          <span>Plus Surcharge / Late Fee ({surchargeReason}):</span>
                          <span>+₹{surcharge.toLocaleString()}</span>
                        </div>
                        {items.filter((i) => Number(i.surchargeAmount || 0) > 0).map((i, k) => (
                          <div key={k} className="flex justify-between items-center text-[11px] text-rose-600 dark:text-rose-400 pl-3">
                            <span>• {i.category || i.name || i.description} ({i.surchargeReason || "Late Fee"}):</span>
                            <span className="font-mono">+₹{Number(i.surchargeAmount).toLocaleString()} (+₹{Number(i.surchargePerMonth || Math.round(Number(i.surchargeAmount) / Math.max(1, i.quantity || 1))).toLocaleString()}/mo)</span>
                          </div>
                        ))}
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
                <span className="text-xs text-muted-foreground">Payment Mode: {formatCollegePaymentMode(receiptTx?.paymentMode)}</span>
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
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg max-h-[92dvh] p-0 flex flex-col overflow-hidden rounded-xl">
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
              <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 text-xs overflow-y-auto flex-1">
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
