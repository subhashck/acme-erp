import type React from "react";
import { GraduationCap, Home, Utensils } from "lucide-react";

export type FeeCategoryType = "Course Fee" | "Hostel Fee" | "Mess Fee";

export interface ReceiptLineItem {
  id: string;
  category: FeeCategoryType;
  description: string;
  periodLabel?: string;
  selectedMonths?: string[];
  courseFeeMode?: "months" | "semester";
  semester?: string;
  quantity: number;
  unitPrice: number;
  baseAmount?: number;
  discountType?: "flat" | "percent";
  discountPercent?: number;
  discountAmount?: number;
  discountReason?: string;
  discountPerMonth?: number;
  surchargeType?: "flat" | "percent";
  surchargePercent?: number;
  surchargeAmount?: number;
  surchargeReason?: string;
  surchargePerMonth?: number;
  netUnitPrice?: number;
  amount: number;
}

export interface FeeCategoryCardOption {
  value: FeeCategoryType;
  label: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

export const TIMEBOUND_FEE_CATEGORIES: FeeCategoryCardOption[] = [
  {
    value: "Course Fee",
    label: "Tuition / Course Fee",
    title: "Tuition / Course Fee",
    description: "Monthly course tuition fee",
    icon: GraduationCap,
    accentColor: "border-blue-500 bg-blue-50/70 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
    badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    badgeText: "Academic",
    borderColor: "hover:border-blue-400",
  },
  {
    value: "Hostel Fee",
    label: "Hostel Accommodation Fee",
    title: "Hostel Accommodation",
    description: "Monthly room & lodging charges",
    icon: Home,
    accentColor: "border-purple-500 bg-purple-50/70 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-800",
    badgeBg: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    badgeText: "Lodging",
    borderColor: "hover:border-purple-400",
  },
  {
    value: "Mess Fee",
    label: "Hostel Mess & Catering Fee",
    title: "Mess & Catering Fee",
    description: "Monthly dining & meal plan charges",
    icon: Utensils,
    accentColor: "border-amber-500 bg-amber-50/70 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
    badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    badgeText: "Meals",
    borderColor: "hover:border-amber-400",
  },
];

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function getAcademicYearMonths(academicYear: string) {
  const startYear = parseInt(academicYear.split("-")[0], 10) || new Date().getFullYear();
  const endYear = startYear + 1;
  return [
    { key: `June ${startYear}`, name: "June", shortName: "Jun", year: startYear },
    { key: `July ${startYear}`, name: "July", shortName: "Jul", year: startYear },
    { key: `August ${startYear}`, name: "August", shortName: "Aug", year: startYear },
    { key: `September ${startYear}`, name: "September", shortName: "Sep", year: startYear },
    { key: `October ${startYear}`, name: "October", shortName: "Oct", year: startYear },
    { key: `November ${startYear}`, name: "November", shortName: "Nov", year: startYear },
    { key: `December ${startYear}`, name: "December", shortName: "Dec", year: startYear },
    { key: `January ${endYear}`, name: "January", shortName: "Jan", year: endYear },
    { key: `February ${endYear}`, name: "February", shortName: "Feb", year: endYear },
    { key: `March ${endYear}`, name: "March", shortName: "Mar", year: endYear },
    { key: `April ${endYear}`, name: "April", shortName: "Apr", year: endYear },
    { key: `May ${endYear}`, name: "May", shortName: "May", year: endYear },
    { key: `June ${endYear}`, name: "June", shortName: "Jun", year: endYear },
  ];
}

export function getNext12MonthsFromDate(baseDate: Date = new Date()) {
  const result: Array<{ key: string; name: string; shortName: string; year: number }> = [];
  const cur = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  for (let i = 0; i < 12; i++) {
    const d = new Date(cur.getFullYear(), cur.getMonth() + i, 1);
    const monthIndex = d.getMonth();
    const year = d.getFullYear();
    const name = MONTH_NAMES[monthIndex];
    const shortName = name.slice(0, 3);
    result.push({
      key: `${name} ${year}`,
      name,
      shortName,
      year,
    });
  }
  return result;
}

export function getSelectableMonthsSequence(academicYear: string, baseDate: Date = new Date()) {
  const ay = getAcademicYearMonths(academicYear);
  const next12 = getNext12MonthsFromDate(baseDate);

  const map = new Map<string, { key: string; name: string; shortName: string; year: number; sortKey: number }>();

  [...ay, ...next12].forEach((m) => {
    const monthIdx = MONTH_NAMES.indexOf(m.name as any);
    const sortKey = m.year * 100 + (monthIdx >= 0 ? monthIdx : 0);
    if (!map.has(m.key)) {
      map.set(m.key, { ...m, sortKey });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.sortKey - b.sortKey);
}

export interface PaidFeeInfo {
  receiptNumber: string;
  paymentDate?: string;
  amount?: number;
  periodLabel?: string;
}

export function normalizeCategoryName(cat: string): FeeCategoryType {
  const c = (cat || "").trim().toLowerCase();
  if (c.includes("mess")) {
    return "Mess Fee";
  }
  if (c.includes("hostel")) {
    return "Hostel Fee";
  }
  return "Course Fee";
}

export function normalizeMonthToKey(token: string): string {
  if (!token) return "";
  const trimmed = String(token).trim();

  // Format: YYYY-MM (e.g. 2026-06 or 2026-6)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    if (m >= 1 && m <= 12) {
      return `${MONTH_NAMES[m - 1]} ${y}`;
    }
  }

  // Format: "June 2026" or "Jun 2026" or "June '26"
  const wordMatch = trimmed.match(/^([A-Za-z]+)\s+['’]?(\d{2,4})$/);
  if (wordMatch) {
    const rawMon = wordMatch[1].toLowerCase();
    const rawYr = wordMatch[2];
    const fullYr = rawYr.length === 2 ? `20${rawYr}` : rawYr;
    const mIdx = MONTH_NAMES.findIndex((name) =>
      name.toLowerCase().startsWith(rawMon.slice(0, 3))
    );
    if (mIdx !== -1) {
      return `${MONTH_NAMES[mIdx]} ${fullYr}`;
    }
  }

  return trimmed;
}

export function normalizeToIsoMonthKey(token: string): string {
  if (!token) return "";
  const trimmed = String(token).trim();

  // Format: YYYY-MM or YYYY-M
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(Number(isoMatch[2])).padStart(2, "0");
    return `${y}-${m}`;
  }

  // Format: "June 2026" or "Jun 2026" or "June '26"
  const wordMatch = trimmed.match(/^([A-Za-z]+)\s+['’]?(\d{2,4})$/);
  if (wordMatch) {
    const rawMon = wordMatch[1].toLowerCase();
    const rawYr = wordMatch[2];
    const fullYr = rawYr.length === 2 ? `20${rawYr}` : rawYr;
    const mIdx = MONTH_NAMES.findIndex((name) =>
      name.toLowerCase().startsWith(rawMon.slice(0, 3))
    );
    if (mIdx !== -1) {
      return `${fullYr}-${String(mIdx + 1).padStart(2, "0")}`;
    }
  }

  return trimmed;
}

// Helper to build line item description (strictly monthly)
export const buildItemDescription = (
  cat: FeeCategoryType,
  ay: string,
  semOrMonths?: string | string[],
  months?: string[],
  feeMode?: string
) => {
  const actualMonths = Array.isArray(semOrMonths)
    ? semOrMonths
    : (Array.isArray(months) ? months : []);

  if (cat === "Course Fee") {
    return actualMonths.length > 0
      ? `Tuition Fee (${actualMonths.join(", ")})`
      : `Tuition Fee (AY ${ay})`;
  }
  if (cat === "Hostel Fee") {
    return actualMonths.length > 0
      ? `Hostel Accommodation (${actualMonths.join(", ")})`
      : `Hostel Accommodation (AY ${ay})`;
  }
  return actualMonths.length > 0
    ? `Mess & Catering Charges (${actualMonths.join(", ")})`
    : `Mess & Catering Charges (AY ${ay})`;
};

// Helper to build period label (strictly monthly)
export const buildPeriodLabel = (
  cat: FeeCategoryType,
  ay: string,
  semOrMonths?: string | string[],
  months?: string[],
  feeMode?: string
) => {
  const actualMonths = Array.isArray(semOrMonths)
    ? semOrMonths
    : (Array.isArray(months) ? months : []);
  return actualMonths.length > 0 ? actualMonths.join(", ") : "No month selected";
};

// Pure function to compute fee items given selected fee types and months (strictly monthly)
export function computeFeeItemsForSelection(
  feeTypes: FeeCategoryType[],
  months: string[],
  ay: string,
  sem?: string,
  feeMode?: "months" | "semester",
  prevItems: ReceiptLineItem[] = []
): ReceiptLineItem[] {
  return feeTypes.map((cat) => {
    const existing = prevItems.find((it) => it.category === cat);
    const itemMonths = months;
    const qty = itemMonths.length;
    const prevQty = Number(existing?.quantity || 1);
    const unitRate = Number(existing?.unitPrice || 0) || (existing?.amount && prevQty > 0 ? Math.round(Number(existing.amount) / prevQty) : 0);
    const baseAmt = Math.round(qty * unitRate);

    const discType = existing?.discountType || "flat";
    const discPct = existing?.discountPercent || 0;
    let discAmt = existing?.discountAmount || 0;
    if (qty === 0) {
      discAmt = 0;
    } else if (discType === "percent" && discPct > 0) {
      discAmt = Math.round((baseAmt * discPct) / 100);
    } else {
      discAmt = Math.min(baseAmt, discAmt);
    }
    const discReason = existing?.discountReason || "";
    const discPerMonth = qty > 0 ? Math.round(discAmt / qty) : 0;

    const surType = existing?.surchargeType || "flat";
    const surPct = existing?.surchargePercent || 0;
    let surAmt = existing?.surchargeAmount || 0;
    if (qty === 0) {
      surAmt = 0;
    } else if (surType === "percent" && surPct > 0) {
      surAmt = Math.round((baseAmt * surPct) / 100);
    }
    const surReason = existing?.surchargeReason || "";
    const surPerMonth = qty > 0 ? Math.round(surAmt / qty) : 0;

    const netUnitRate = Math.max(0, unitRate - discPerMonth + surPerMonth);
    const netTotal = Math.max(0, baseAmt - discAmt + surAmt);

    return {
      id: existing?.id || `item-${cat.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      category: cat,
      description: buildItemDescription(cat, ay, itemMonths),
      periodLabel: buildPeriodLabel(cat, ay, itemMonths),
      selectedMonths: [...itemMonths],
      quantity: qty,
      unitPrice: unitRate,
      baseAmount: baseAmt,
      discountType: discType,
      discountPercent: discPct,
      discountAmount: discAmt,
      discountReason: discReason,
      discountPerMonth: discPerMonth,
      surchargeType: surType,
      surchargePercent: surPct,
      surchargeAmount: surAmt,
      surchargeReason: surReason,
      surchargePerMonth: surPerMonth,
      netUnitPrice: netUnitRate,
      amount: netTotal,
    };
  });
}

export interface MonthlyFeeStructure {
  id: number;
  courseId: number;
  courseName?: string;
  quotaCategory: string;
  academicYear: string;
  monthlyCourseFee: number;
  monthlyHostelFee: number;
  monthlyMessFee: number;
  monthlyTotal: number;
  tuitionFee?: string;
  hostelFee?: string;
  hostelMessMonthlyFee?: string;
  totalAmount?: string;
}

