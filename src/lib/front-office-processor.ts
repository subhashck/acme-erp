/**
 * Front Office Processing & Financial Reconciliation Engine
 * Ported from Acme Fertility & Healthcare Centre Billing Dashboard
 */

export interface CompoundBreakdownPart {
  mode: string;
  amount: number;
}

export interface CompoundAmount {
  total: number;
  parts: CompoundBreakdownPart[];
}

export interface ConsultationRow {
  source: "consultation";
  srNo: number;
  patientName: string;
  patientUid: string;
  dateText: string;
  dateObj: Date | null;
  doctor: string;
  purpose: string;
  schedule: string;
  prescription: string;
  billAmount: number;
  collected: number;
  collectedRaw: string;
  collectedBreakdown: CompoundAmount | null;
  pending: number;
  consultationAmount: number;
  consultationDiscount: number;
  labAmount: number;
  procedureAmount: number;
  radiologyAmount: number;
  paymentMode: string;
  paymentModeRaw: string;
  invoiceNo?: string;
  discount: number;
  notes?: string;
  remarks?: string[];
  knownSplit?: CompoundBreakdownPart[];
  _reconciled?: boolean;
}

export interface ProcedureRow {
  source: "laboratory" | "radiology";
  category: "Laboratory" | "Radiology";
  srNo: number;
  patientName: string;
  patientUid: string;
  dateText: string;
  dateObj: Date | null;
  procedure: string;
  doctor: string;
  billAmount: number;
  serviceType: string;
  collected: number;
  collectedRaw: string;
  collectedBreakdown: CompoundAmount | null;
  pending: number;
  paymentMode: string;
  paymentModeRaw: string;
  invoiceNo?: string;
  discount: number;
  notes?: string;
  remarks?: string[];
  knownSplit?: CompoundBreakdownPart[];
  _reconciled?: boolean;
}

export type FrontOfficeRow = ConsultationRow | ProcedureRow;

export interface CompiledPatient {
  patientUid: string;
  patientName: string;
  consultations: ConsultationRow[];
  procedures: ProcedureRow[];
  totalBill: number;
  totalCollected: number;
  totalPending: number;
  totalDiscount: number;
  discountNotes?: string[];
}

export interface FrontOfficeSummaryKPIs {
  totalPatients: number;
  totalBill: number;
  totalCollected: number;
  totalPending: number;
  totalDiscount: number;
  realizationRate: number;
  patientMixText: string;
  consultationCount: number;
  serviceCount: number;
}

export interface RevenueCategorySummary {
  label: string;
  count: number;
  billAmount: number;
  discount: number;
  collected: number;
  pending: number;
}

export interface ItemBilledSummary {
  name: string;
  count: number;
  amount: number;
}

export interface FrontOfficeExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  paymentMode: string;
  voucherNumber?: string;
}

export interface FrontOfficeAdmissionRow {
  id: string;
  patientName: string;
  amount: number;
  remark: string;
}

export interface FrontOfficeDischargeRow {
  id: string;
  patientName: string;
  amount: number;
  remark: string;
}

export const FRONT_OFFICE_DENOMINATIONS = [500, 200, 100, 50, 20, 10] as const;
export type FrontOfficeDenomination = (typeof FRONT_OFFICE_DENOMINATIONS)[number];
export type FrontOfficeDenominations = Record<number, number>;

export function calculateDenominationsTotal(denoms: FrontOfficeDenominations): {
  totalCount: number;
  totalAmount: number;
  breakdown: { note: number; count: number; total: number }[];
} {
  let totalCount = 0;
  let totalAmount = 0;
  const breakdown = FRONT_OFFICE_DENOMINATIONS.map((note) => {
    const count = Math.max(0, parseInt(String(denoms[note] || 0), 10) || 0);
    const total = count * note;
    totalCount += count;
    totalAmount += total;
    return { note, count, total };
  });
  return { totalCount, totalAmount, breakdown };
}

export interface FrontOfficeHandoverSummary {
  opdCollections: number;
  admissionTotal: number;
  dischargeTotal: number;
  grandTotal: number;
  expenditure: number;
  cardSale: number;
  onlinePayments?: number;
  onlineBreakdown?: {
    app: number;
    card: number;
    upi: number;
    otherOnline?: number;
  };
  advanceHandover: number;
  cashToHandover: number;
  actualCashCounted: number;
  cashDifference: number;
}

export interface FrontOfficeSignatures {
  handedOverBy: string;
  receivedBy: string;
  remarks?: string;
}

export const formatMoney = (value: number | string | null | undefined): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatNumber = (value: number | string | null | undefined): string =>
  new Intl.NumberFormat("en-IN").format(Number(value || 0));

export function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const firstNumber = String(value).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return firstNumber ? Number(firstNumber[0]) : 0;
}

export function cleanText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

export function normalizeHeader(value: unknown): string {
  return cleanText(value)
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function getField(row: Record<string, any>, ...names: string[]): string {
  const lookup: Record<string, any> = {};
  Object.keys(row || {}).forEach((key) => {
    lookup[normalizeHeader(key)] = row[key];
  });
  for (const name of names) {
    const value = lookup[normalizeHeader(name)];
    if (value !== undefined) return String(value);
  }
  return "";
}

export function parseCompoundAmount(raw: unknown): CompoundAmount | null {
  const text = cleanText(raw);
  if (!text) return null;
  const match = text.match(/^([\d,]+(?:\.\d+)?)\s*\(([^)]*)\)\s*$/);
  if (!match) return null;

  const total = toNumber(match[1]);
  const parts: CompoundBreakdownPart[] = [];
  const pieceRegex = /([A-Za-z][A-Za-z /]*?)\s*:\s*([\d,]+(?:\.\d+)?)(?=\s*,\s*[A-Za-z]|\s*$)/g;
  let pieceMatch: RegExpExecArray | null;
  while ((pieceMatch = pieceRegex.exec(match[2])) !== null) {
    parts.push({ mode: cleanText(pieceMatch[1]), amount: toNumber(pieceMatch[2]) });
  }

  return parts.length ? { total, parts } : null;
}

export function visitTypeLabel(purpose: string): string {
  const text = cleanText(purpose);
  if (/follow[\s-]?up/i.test(text)) return "Follow-up";
  if (/consultation/i.test(text)) return "Consultation";
  return text || "Visit";
}

export function classifyPaymentMode(mode: unknown): string {
  const text = cleanText(mode).toLowerCase();
  if (!text) return "Unpaid / No Mode";
  if (text.includes("split")) return "Split Payment";
  if (text.includes("cash")) return "Cash";
  if (
    text.includes("upi") ||
    text.includes("gpay") ||
    text.includes("google pay") ||
    text.includes("phonepe") ||
    text.includes("phone pe") ||
    text.includes("paytm") ||
    text.includes("bhim") ||
    text.includes("qr")
  ) {
    return "UPI";
  }
  if (text.includes("patient app") || text.includes("app")) return "Patient APP";
  if (text.includes("credit")) return "Credit Card";
  if (text.includes("debit")) return "Debit Card";
  if (text.includes("card") || text.includes("pos")) return "Card";
  if (text.includes("online")) return "Online Payment";
  if (text.includes("net banking")) return "Net Banking";
  if (text.includes("wallet")) return "Wallet";
  return "Other";
}

export function parseDate(value: unknown): Date | null {
  const text = cleanText(value);
  if (!text) return null;

  // 12-hour format with AM/PM: 29-08-2026 10:35 AM
  let match = text.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
  if (match) {
    let [, dd, mm, yyyy, hhStr, minStr, ampm] = match;
    let hh = Number(hhStr);
    if (ampm.toUpperCase() === "PM" && hh !== 12) hh += 12;
    if (ampm.toUpperCase() === "AM" && hh === 12) hh = 0;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), hh, Number(minStr));
  }

  // 24-hour format: 29-08-2026 12:21
  match = text.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (match) {
    const [, dd, mm, yyyy, hh, min] = match;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
  }

  // Date-only: 29-08-2026
  match = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }

  const parsed = new Date(text);
  if (isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  if (year < 2015 || year > 2035) return null;
  return parsed;
}

export function getHourLabel(date: Date | string | null | undefined): string {
  if (!date) return "Unknown";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "Unknown";
  const hour = d.getHours();
  const next = hour + 1;
  const formatHour = (h: number) => {
    const suffix = h >= 12 ? "PM" : "AM";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display} ${suffix}`;
  };
  return `${formatHour(hour)} - ${formatHour(next)}`;
}

export function isSummaryRow(patientName: string, patientUid: string): boolean {
  if (patientUid) return false;
  return /^(grand\s*|sub\s*)?total$/i.test(cleanText(patientName));
}

export function addRemark(row: FrontOfficeRow, text: string): void {
  if (!row.remarks) row.remarks = [];
  if (!row.remarks.includes(text)) row.remarks.push(text);
}

export function collectedSignature(row: FrontOfficeRow): string {
  if (row.collectedBreakdown) {
    const parts = row.collectedBreakdown.parts
      .map((p) => `${p.mode.toLowerCase().replace(/\s+/g, " ").trim()}:${p.amount}`)
      .sort()
      .join(",");
    return `breakdown|${row.collectedBreakdown.total}|${parts}`;
  }
  return `plain|${toNumber(row.collectedRaw)}`;
}

export function hasBillOrCollection(row: FrontOfficeRow): boolean {
  return Number(row.billAmount || 0) > 0 || Number(row.collected || 0) > 0;
}

export function normalizeConsultationRows(rawRows: Record<string, any>[]): ConsultationRow[] {
  return rawRows
    .map((row, index) => {
      const dateText = cleanText(
        getField(row, "Consultation Revenue Date", "Consultation Date", "Date", "Visit Date")
      );
      const billAmount = toNumber(getField(row, "Total Revenue Billed", "Total Billed", "Bill Amount"));
      const collectedRaw = cleanText(getField(row, "Amount collected", "Amount Collected"));
      const collected = toNumber(collectedRaw);
      const pending = toNumber(getField(row, "Total Revenue Billed Pending Dues", "Pending Dues", "Amount Pending"));

      return {
        source: "consultation" as const,
        srNo: Number(getField(row, "Sr No", "Sr. No", "Serial No")) || index + 1,
        patientName: cleanText(getField(row, "Patient Name", "Patient")),
        patientUid: cleanText(getField(row, "Patient UID", "Patient ID", "UID")),
        dateText,
        dateObj: parseDate(dateText),
        doctor: cleanText(getField(row, "Doctor", "Doctor Name")) || "Unknown",
        purpose: cleanText(getField(row, "Purpose Of Visit", "Purpose of Visit", "Purpose")) || "Unknown",
        schedule: cleanText(getField(row, "Schedule")) || "Not Specified",
        prescription: cleanText(getField(row, "Prescription", "Prescription Status")) || "Unknown",
        billAmount,
        collected,
        collectedRaw,
        collectedBreakdown: parseCompoundAmount(collectedRaw),
        pending,
        consultationAmount: toNumber(getField(row, "Consultation Revenue Amount", "Consultation Amount")),
        consultationDiscount: toNumber(getField(row, "Consultation Revenue Discount", "Consultation Discount")),
        labAmount: toNumber(
          getField(row, "Laboratory Amount", "Laboratory Revenue Amount", "Diagnostics Revenue Amount", "Diagnostic Revenue Amount")
        ),
        procedureAmount: toNumber(getField(row, "Procedure Amount", "Procedure Revenue Amount")),
        radiologyAmount: toNumber(getField(row, "Radiology Amount", "Radiology Revenue Amount")),
        paymentModeRaw: cleanText(
          getField(row, "Mode Of Payment", "Mode of Payment", "Payment Mode", "Payment collected by", "Payment Collected By")
        ),
        paymentMode: classifyPaymentMode(
          getField(row, "Mode Of Payment", "Mode of Payment", "Payment Mode", "Payment collected by", "Payment Collected By")
        ),
        invoiceNo: cleanText(getField(row, "Invoice No.", "Invoice No", "Invoice", "Bill No")),
        discount: toNumber(getField(row, "Consultation Revenue Discount", "Consultation Discount", "Discount")),
        notes: cleanText(getField(row, "Notes", "Note", "Remarks")),
      };
    })
    .filter((r) => (r.patientUid || r.patientName) && !isSummaryRow(r.patientName, r.patientUid));
}

export function normalizeProcedureRows(rawRows: Record<string, any>[]): ProcedureRow[] {
  return rawRows
    .map((row, index) => {
      const dateText = cleanText(
        getField(row, "Procedure Date", "Procedure Revenue Date", "Consultation Date", "Date", "Procedure Date / Time", "Date / Time")
      );
      const procedureName =
        cleanText(
          getField(
            row,
            "Procedure Name",
            "Procedure",
            "Procedure Type",
            "Service Name",
            "Service",
            "Item Name",
            "Laboratory Test",
            "Test Name",
            "Description"
          )
        ) || "Laboratory Item";

      const billAmount = toNumber(
        getField(
          row,
          "Total Revenue Billed",
          "Total Billed",
          "Bill Amount",
          "Procedure Amount",
          "Procedure Revenue Amount",
          "Laboratory Amount",
          "Laboratory Revenue Amount",
          "Diagnostics Revenue Amount",
          "Diagnostic Revenue Amount",
          "Radiology Amount",
          "Amount"
        )
      );
      const collectedRaw = cleanText(getField(row, "Amount collected", "Amount Collected"));

      return {
        source: "laboratory" as const,
        category: "Laboratory" as const,
        srNo: Number(getField(row, "Sr No", "Sr. No", "Serial No")) || index + 1,
        patientName: cleanText(getField(row, "Patient Name", "Patient")),
        patientUid: cleanText(getField(row, "Patient UID", "Patient ID", "UID")),
        dateText,
        dateObj: parseDate(dateText),
        procedure: procedureName,
        doctor: cleanText(getField(row, "Doctor", "Doctor Name")),
        billAmount,
        serviceType: getField(row, "Laboratory Amount", "Laboratory Revenue Amount", "Diagnostics Revenue Amount", "Diagnostic Revenue Amount")
          ? "Laboratory"
          : "Procedure",
        collected: toNumber(collectedRaw),
        collectedRaw,
        collectedBreakdown: parseCompoundAmount(collectedRaw),
        pending: toNumber(getField(row, "Total Revenue Billed Pending Dues", "Pending Dues", "Amount Pending")),
        paymentModeRaw: cleanText(
          getField(row, "Mode Of Payment", "Mode of Payment", "Payment Mode", "Payment collected by", "Payment Collected By")
        ),
        paymentMode: classifyPaymentMode(
          getField(row, "Mode Of Payment", "Mode of Payment", "Payment Mode", "Payment collected by", "Payment Collected By")
        ),
        invoiceNo: cleanText(getField(row, "Invoice No.", "Invoice No", "Invoice", "Bill No")),
        discount: toNumber(getField(row, "Laboratory Discount", "Procedure Discount", "Discount")),
        notes: cleanText(getField(row, "Notes", "Note", "Remarks")),
      };
    })
    .filter((r) => (r.patientUid || r.patientName) && !isSummaryRow(r.patientName, r.patientUid));
}

export function normalizeRadiologyRows(rawRows: Record<string, any>[]): ProcedureRow[] {
  return rawRows
    .map((row, index) => {
      const dateText = cleanText(
        getField(row, "Radiology Date", "Radiology Revenue Date", "Consultation Date", "Date", "Radiology Date / Time", "Date / Time")
      );
      const radiologyName =
        cleanText(
          getField(
            row,
            "Radiology Name",
            "Radiology Test",
            "Radiology Type",
            "Procedure Name",
            "Procedure",
            "Service Name",
            "Service",
            "Item Name",
            "Test Name",
            "Description"
          )
        ) || "Radiology Item";

      const billAmount = toNumber(
        getField(row, "Total Revenue Billed", "Total Billed", "Bill Amount", "Radiology Amount", "Radiology Revenue Amount", "Amount")
      );
      const collectedRaw = cleanText(getField(row, "Amount collected", "Amount Collected"));

      return {
        source: "radiology" as const,
        category: "Radiology" as const,
        srNo: Number(getField(row, "Sr No", "Sr. No", "Serial No")) || index + 1,
        patientName: cleanText(getField(row, "Patient Name", "Patient")),
        patientUid: cleanText(getField(row, "Patient UID", "Patient ID", "UID")),
        dateText,
        dateObj: parseDate(dateText),
        procedure: radiologyName,
        doctor: cleanText(getField(row, "Doctor", "Doctor Name")),
        billAmount,
        serviceType: "Radiology",
        collected: toNumber(collectedRaw),
        collectedRaw,
        collectedBreakdown: parseCompoundAmount(collectedRaw),
        pending: toNumber(getField(row, "Total Revenue Billed Pending Dues", "Pending Dues", "Amount Pending")),
        paymentModeRaw: cleanText(
          getField(row, "Mode Of Payment", "Mode of Payment", "Payment Mode", "Payment collected by", "Payment Collected By")
        ),
        paymentMode: classifyPaymentMode(
          getField(row, "Mode Of Payment", "Mode of Payment", "Payment Mode", "Payment collected by", "Payment Collected By")
        ),
        invoiceNo: cleanText(getField(row, "Invoice No.", "Invoice No", "Invoice", "Bill No")),
        discount: toNumber(getField(row, "Radiology Discount", "Discount")),
        notes: cleanText(getField(row, "Notes", "Note", "Remarks")),
      };
    })
    .filter((r) => (r.patientUid || r.patientName) && !isSummaryRow(r.patientName, r.patientUid));
}

/**
 * Reconciles invoice-level collections where the parent invoice's total collection
 * was duplicated across multiple lines (e.g. 1 consultation + 1 lab/radiology row).
 */
export function reconcileInvoiceLevelCollections(
  consultationRows: ConsultationRow[],
  serviceRows: ProcedureRow[]
): void {
  const allRows: FrontOfficeRow[] = [...consultationRows, ...serviceRows];

  // Group by invoice number if present, otherwise by [patientUid, dateText, collectedRaw]
  const groups = new Map<string, FrontOfficeRow[]>();
  allRows.forEach((row) => {
    if (!row.patientUid || !row.collectedRaw) return;
    const invKey = row.invoiceNo
      ? `inv||${row.patientUid}||${row.invoiceNo}`
      : `raw||${row.patientUid}||${row.dateText}||${row.collectedRaw}`;
    if (!groups.has(invKey)) groups.set(invKey, []);
    groups.get(invKey)!.push(row);
  });

  groups.forEach((rows) => {
    if (rows.length < 2) return;

    const totalBill = rows.reduce((s, r) => s + r.billAmount, 0);
    const compoundRow = rows.find((r) => r.collectedBreakdown);
    const firstCollected = compoundRow ? compoundRow.collectedBreakdown!.total : rows[0].collected;
    const isRepeatedCollected = rows.every((r) => {
      const c = r.collectedBreakdown ? r.collectedBreakdown.total : r.collected;
      return Math.abs(c - firstCollected) < 1;
    });

    if (!isRepeatedCollected) return;

    // Case 1: Compound payment breakdown where breakdown.total matches total bill of the invoice lines
    if (compoundRow && compoundRow.collectedBreakdown) {
      const breakdown = compoundRow.collectedBreakdown;
      if (Math.abs(totalBill - breakdown.total) < 1) {
        const remainingParts = [...breakdown.parts];
        rows.forEach((r) => {
          const matchIdx = remainingParts.findIndex((p) => Math.abs(p.amount - r.billAmount) < 1);
          if (matchIdx !== -1) {
            const matched = remainingParts.splice(matchIdx, 1)[0];
            r.collected = matched.amount;
            r.paymentMode = classifyPaymentMode(matched.mode);
            r.paymentModeRaw = matched.mode;
          } else {
            r.collected = r.billAmount;
          }
          r._reconciled = true;
          addRemark(
            r,
            `Invoice #${r.invoiceNo || ""}: Combined payment of ${formatMoney(breakdown.total)} was repeated across ${rows.length} line items — attributed this line's share (${formatMoney(r.collected)}).`
          );
        });
        return;
      }
    }

    // Case 2: Plain single payment mode repeated across all line items of the invoice
    if (Math.abs(totalBill - firstCollected) < 1) {
      rows.forEach((r) => {
        r.collected = r.billAmount;
        r._reconciled = true;
        addRemark(
          r,
          `Invoice #${r.invoiceNo || ""}: Total invoice payment of ${formatMoney(firstCollected)} was repeated identically across ${rows.length} line items — attributed this line's share (${formatMoney(r.collected)}).`
        );
      });
      return;
    }
  });
}

export function reconcileCompoundCollections(consultationRows: ConsultationRow[], serviceRows: ProcedureRow[]): void {
  // 1. Reconcile cross-category invoice collections first (multi-item invoices)
  reconcileInvoiceLevelCollections(consultationRows, serviceRows);

  const groups = new Map<string, ProcedureRow[]>();
  serviceRows.forEach((row) => {
    if (!row.collectedRaw || row._reconciled) return;
    const key = [row.patientUid, collectedSignature(row)].join("||");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  });

  groups.forEach((groupRows) => {
    const breakdown = groupRows[0].collectedBreakdown;
    if (groupRows.length < 2 && !breakdown) return;

    const groupBillTotal = groupRows.reduce((s, r) => s + r.billAmount, 0);
    groupRows.forEach((r) => {
      r.collected = 0;
    });

    if (!breakdown) {
      groupRows[0].collected = toNumber(groupRows[0].collectedRaw);
      if (groupRows.length > 1) {
        addRemark(
          groupRows[0],
          `Amount Collected (${formatMoney(groupRows[0].collected)}) was repeated identically across ` +
            `${groupRows.length} line items of this invoice — counted once here, not per item.`
        );
      }
      return;
    }

    const ownPart =
      breakdown.parts.find((p) => Math.abs(p.amount - groupBillTotal) < 1) ||
      breakdown.parts.reduce((closest, p) =>
        Math.abs(p.amount - groupBillTotal) < Math.abs(closest.amount - groupBillTotal) ? p : closest
      );

    groupRows[0].collected = ownPart.amount;
    groupRows[0].paymentMode = classifyPaymentMode(ownPart.mode);
    groupRows[0].paymentModeRaw = ownPart.mode;
    addRemark(
      groupRows[0],
      `Amount Collected here (${formatMoney(ownPart.amount)}, ${classifyPaymentMode(ownPart.mode)}) is this ` +
        `record's share of a combined ${formatMoney(breakdown.total)} payment split across multiple modes.`
    );

    const patientUid = groupRows[0].patientUid;
    breakdown.parts
      .filter((p) => p !== ownPart)
      .forEach((part) => {
        const match = consultationRows.find(
          (c) => c.patientUid && c.patientUid === patientUid && !c._reconciled && Math.abs(c.billAmount - part.amount) < 1
        );

        if (!match) {
          groupRows[0].collected += part.amount;
          addRemark(
            groupRows[0],
            `⚠ ${formatMoney(part.amount)} (${part.mode}) from the combined payment could not be matched to a ` +
              `Consultation record for this patient — kept on this row; needs manual review.`
          );
          return;
        }

        const alreadyCorrect = Math.abs(match.collected - part.amount) < 1;
        const isDuplicateOfFullTotal = Math.abs(match.collected - breakdown.total) < 1;

        if (alreadyCorrect) {
          // Already exact
        } else if (match.collected === 0 || isDuplicateOfFullTotal) {
          if (isDuplicateOfFullTotal) {
            addRemark(
              match,
              `Amount Collected here previously duplicated the full combined ${formatMoney(breakdown.total)} total ` +
                `recorded elsewhere for this patient — corrected to this record's own share ` +
                `(${formatMoney(part.amount)}, ${classifyPaymentMode(part.mode)}).`
            );
          }
          match.collected = part.amount;
          match.paymentMode = classifyPaymentMode(part.mode);
          match.paymentModeRaw = part.mode;
        } else {
          groupRows[0].collected += part.amount;
          addRemark(
            groupRows[0],
            `⚠ Consultation record for this patient already shows ${formatMoney(match.collected)} collected ` +
              `(unexplained) — the ${formatMoney(part.amount)} (${part.mode}) share was kept on this row instead ` +
              `of overwriting that value; needs manual review.`
          );
          return;
        }
        match._reconciled = true;
      });
  });
}

export function applyKnownConsultationOnlySplitRule(
  consultationRows: ConsultationRow[],
  serviceRows: ProcedureRow[]
): void {
  const billByUid = new Map<string, number>();
  const serviceCountByUid = new Map<string, number>();
  const consultationCountByUid = new Map<string, number>();

  [...consultationRows, ...serviceRows].forEach((r) => {
    if (!r.patientUid) return;
    billByUid.set(r.patientUid, (billByUid.get(r.patientUid) || 0) + r.billAmount);
  });
  serviceRows.forEach((r) => {
    if (!r.patientUid) return;
    serviceCountByUid.set(r.patientUid, (serviceCountByUid.get(r.patientUid) || 0) + 1);
  });
  consultationRows.forEach((r) => {
    if (!r.patientUid) return;
    consultationCountByUid.set(r.patientUid, (consultationCountByUid.get(r.patientUid) || 0) + 1);
  });

  consultationRows.forEach((row) => {
    if (!row.patientUid) return;

    const isUnspecifiedSplit =
      row.paymentMode === "Split Payment" &&
      (!row.collectedBreakdown || row.collectedBreakdown.parts.length < 2);
    if (!isUnspecifiedSplit) return;

    const isConsultationOnly = /consultation/i.test(row.purpose) && !/follow[\s-]?up/i.test(row.purpose);
    if (!isConsultationOnly) return;

    if ((serviceCountByUid.get(row.patientUid) || 0) > 0) return;
    if ((consultationCountByUid.get(row.patientUid) || 0) > 1) return;

    const totalBilled = billByUid.get(row.patientUid) || 0;
    if (Math.abs(totalBilled - 600) >= 1 || Math.abs(row.billAmount - 600) >= 1) return;
    if (Math.abs(row.collected - 600) >= 1) return;

    row.knownSplit = [
      { mode: "Patient APP", amount: 500 },
      { mode: "Cash", amount: 100 },
    ];
    row.paymentMode = row.knownSplit.map((p) => p.mode).join(", ");
    addRemark(
      row,
      `Split Payment shown with no amount breakdown in source data — resolved via known clinic policy for ` +
        `₹600 Consultation-only bookings: ₹500 Patient APP (at booking) + ₹100 Cash (Front Office check-in).`
    );
  });
}

export function flagUnresolvedSplitPayments(rows: FrontOfficeRow[]): void {
  rows.forEach((row) => {
    if (row.remarks && row.remarks.length) return;
    const isUnspecifiedSplit =
      row.paymentMode === "Split Payment" &&
      (!row.collectedBreakdown || row.collectedBreakdown.parts.length < 2) &&
      !row.knownSplit;
    if (isUnspecifiedSplit) {
      addRemark(
        row,
        `⚠ Split Payment shown with no amount breakdown in source data — mode attribution not available. ` +
          `The ${formatMoney(row.collected)} total is accurate; it just isn't categorized by payment mode above.`
      );
    }
  });
}

export function paymentModeContributions(row: FrontOfficeRow): Record<string, number> {
  const amount = Number(row.collected || 0);
  if (amount <= 0) return {};

  if (row.knownSplit) {
    return row.knownSplit.reduce((acc, part) => {
      const label = classifyPaymentMode(part.mode) || part.mode;
      acc[label] = (acc[label] || 0) + part.amount;
      return acc;
    }, {} as Record<string, number>);
  }

  const breakdown = row.collectedBreakdown;
  if (breakdown && breakdown.parts.length > 1 && Math.abs(breakdown.total - amount) < 1) {
    return breakdown.parts.reduce((acc, part) => {
      const label = classifyPaymentMode(part.mode) || "Unpaid / No Mode";
      acc[label] = (acc[label] || 0) + part.amount;
      return acc;
    }, {} as Record<string, number>);
  }

  return { [row.paymentMode || "Unknown"]: amount };
}

export function sumCollectedByPaymentMode(rows: FrontOfficeRow[]): Record<string, number> {
  return rows.reduce((acc, row) => {
    const contributions = paymentModeContributions(row);
    Object.entries(contributions).forEach(([label, value]) => {
      acc[label] = (acc[label] || 0) + value;
    });
    return acc;
  }, {} as Record<string, number>);
}

export interface OnlinePaymentsBreakdown {
  app: number;
  card: number;
  upi: number;
  otherOnline: number;
  total: number;
}

/**
 * Calculates digital / online non-cash collections (App, Card, UPI, and other online modes)
 * from Front Office rows for shift handover reconciliation.
 */
export function calculateOnlinePayments(rows: FrontOfficeRow[]): OnlinePaymentsBreakdown {
  let app = 0;
  let card = 0;
  let upi = 0;
  let otherOnline = 0;

  for (const row of rows) {
    const contributions = paymentModeContributions(row);
    for (const [mode, amt] of Object.entries(contributions)) {
      if (amt <= 0) continue;
      const lower = mode.toLowerCase();
      // Patient APP / App
      if (lower.includes("app")) {
        app += amt;
      }
      // Card / POS / Debit / Credit
      else if (
        lower.includes("card") ||
        lower.includes("credit") ||
        lower.includes("debit") ||
        lower.includes("pos")
      ) {
        card += amt;
      }
      // UPI / GPay / PhonePe / Paytm / QR / BHIM
      else if (
        lower.includes("upi") ||
        lower.includes("gpay") ||
        lower.includes("google pay") ||
        lower.includes("phonepe") ||
        lower.includes("phone pe") ||
        lower.includes("paytm") ||
        lower.includes("qr") ||
        lower.includes("bhim")
      ) {
        upi += amt;
      }
      // Other digital/online payment modes
      else if (
        lower.includes("online") ||
        lower.includes("net banking") ||
        lower.includes("wallet") ||
        lower.includes("gateway")
      ) {
        otherOnline += amt;
      }
    }
  }

  const total = app + card + upi + otherOnline;
  return { app, card, upi, otherOnline, total };
}

/**
 * Parses a schedule time string (e.g., "10:30 AM - 11:00 AM" or "14:15") and combines it with baseDate.
 */
export function parseScheduleTime(schedule: string | undefined | null, baseDate?: Date | null): Date | null {
  if (!schedule) return null;
  const match = schedule.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;
  let [, hhStr, minStr, ampm] = match;
  let hh = Number(hhStr);
  const min = Number(minStr);
  if (ampm) {
    if (ampm.toUpperCase() === "PM" && hh !== 12) hh += 12;
    if (ampm.toUpperCase() === "AM" && hh === 12) hh = 0;
  }
  const d = baseDate && !isNaN(baseDate.getTime()) ? new Date(baseDate.getTime()) : new Date();
  d.setHours(hh, min, 0, 0);
  return d;
}

/**
 * Extracts a comparable timestamp (ms) from a consultation or procedure row.
 */
export function getRowTimestamp(row: {
  dateObj?: Date | string | null;
  dateText?: string;
  schedule?: string;
}): number {
  if (row.dateObj) {
    const d = row.dateObj instanceof Date ? row.dateObj : new Date(row.dateObj);
    if (!isNaN(d.getTime())) {
      if (d.getHours() === 0 && d.getMinutes() === 0) {
        if (row.dateText) {
          const parsed = parseDate(row.dateText);
          if (parsed && (parsed.getHours() !== 0 || parsed.getMinutes() !== 0)) {
            return parsed.getTime();
          }
        }
        if (row.schedule) {
          const schedTime = parseScheduleTime(row.schedule, d);
          if (schedTime) return schedTime.getTime();
        }
      }
      return d.getTime();
    }
  }
  if (row.dateText) {
    const parsed = parseDate(row.dateText);
    if (parsed && !isNaN(parsed.getTime())) {
      if (parsed.getHours() === 0 && parsed.getMinutes() === 0 && row.schedule) {
        const schedTime = parseScheduleTime(row.schedule, parsed);
        if (schedTime) return schedTime.getTime();
      }
      return parsed.getTime();
    }
  }
  if (row.schedule) {
    const schedTime = parseScheduleTime(row.schedule);
    if (schedTime) return schedTime.getTime();
  }
  return Infinity;
}

/**
 * Returns the earliest consultation timestamp (ms) for a patient, or Infinity if none.
 */
export function getPatientConsultationTime(patient: CompiledPatient): number {
  let earliest = Infinity;
  for (const c of patient.consultations) {
    const time = getRowTimestamp(c);
    if (time < earliest) earliest = time;
  }
  return earliest;
}

/**
 * Returns the earliest procedure timestamp (ms) for a patient, or Infinity if none.
 */
export function getPatientProcedureTime(patient: CompiledPatient): number {
  let earliest = Infinity;
  for (const pr of patient.procedures) {
    const time = getRowTimestamp(pr);
    if (time < earliest) earliest = time;
  }
  return earliest;
}

/**
 * Returns the minimum serial number for a patient across all consultations and procedures.
 */
export function getPatientSrNo(patient: CompiledPatient): number {
  let minSrNo = Infinity;
  for (const c of patient.consultations) {
    if (typeof c.srNo === "number" && !isNaN(c.srNo) && c.srNo < minSrNo) {
      minSrNo = c.srNo;
    }
  }
  if (minSrNo !== Infinity) return minSrNo;
  for (const pr of patient.procedures) {
    if (typeof pr.srNo === "number" && !isNaN(pr.srNo) && pr.srNo < minSrNo) {
      minSrNo = pr.srNo;
    }
  }
  return minSrNo === Infinity ? 999999 : minSrNo;
}

/**
 * Compares two patients by consultation timing (chronological by default).
 * If consultation timing is equal, falls back to serial number and patient name.
 * If a patient has no consultation, falls back to procedure timing.
 */
export function comparePatientConsultationTiming(
  a: CompiledPatient,
  b: CompiledPatient,
  direction: "asc" | "desc" = "asc"
): number {
  const dir = direction === "asc" ? 1 : -1;

  const aTime = getPatientConsultationTime(a);
  const bTime = getPatientConsultationTime(b);

  // Both have consultation timings
  if (aTime !== Infinity && bTime !== Infinity) {
    if (aTime !== bTime) return (aTime - bTime) * dir;
    const aSr = getPatientSrNo(a);
    const bSr = getPatientSrNo(b);
    if (aSr !== bSr) return (aSr - bSr) * dir;
    return a.patientName.localeCompare(b.patientName) * dir;
  }

  // Patient A has consultation timing, patient B does not
  if (aTime !== Infinity && bTime === Infinity) {
    return -1;
  }
  // Patient B has consultation timing, patient A does not
  if (aTime === Infinity && bTime !== Infinity) {
    return 1;
  }

  // Neither has consultation timing (e.g. walk-in lab/radiology only patients)
  const aProcTime = getPatientProcedureTime(a);
  const bProcTime = getPatientProcedureTime(b);
  if (aProcTime !== Infinity && bProcTime !== Infinity && aProcTime !== bProcTime) {
    return (aProcTime - bProcTime) * dir;
  }
  if (aProcTime !== Infinity && bProcTime === Infinity) return -1;
  if (aProcTime === Infinity && bProcTime !== Infinity) return 1;

  const aSr = getPatientSrNo(a);
  const bSr = getPatientSrNo(b);
  if (aSr !== bSr) return (aSr - bSr) * dir;

  return a.patientName.localeCompare(b.patientName) * dir;
}

export function compilePatients(consultations: ConsultationRow[], procedures: ProcedureRow[]): CompiledPatient[] {
  const map = new Map<string, CompiledPatient>();

  function ensure(uid: string, name: string): CompiledPatient {
    const key = uid || `NO_UID_${(name || "").toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, {
        patientUid: uid || "",
        patientName: name || "Unknown Patient",
        consultations: [],
        procedures: [],
        totalBill: 0,
        totalCollected: 0,
        totalPending: 0,
        totalDiscount: 0,
        discountNotes: [],
      });
    }
    return map.get(key)!;
  }

  consultations.filter(hasBillOrCollection).forEach((row) => {
    const patient = ensure(row.patientUid, row.patientName);
    if (!patient.patientName || patient.patientName === "Unknown Patient") {
      patient.patientName = row.patientName || patient.patientName;
    }
    patient.consultations.push(row);
    patient.totalBill += row.billAmount;
    patient.totalCollected += row.collected;
    patient.totalPending += row.pending;
  });

  procedures.filter(hasBillOrCollection).forEach((row) => {
    const patient = ensure(row.patientUid, row.patientName);
    if (!patient.patientName || patient.patientName === "Unknown Patient") {
      patient.patientName = row.patientName || patient.patientName;
    }
    patient.procedures.push(row);
    patient.totalBill += row.billAmount;
    patient.totalCollected += row.collected;
    patient.totalPending += row.pending;
  });

  map.forEach((patient) => {
    // Sort patient's own consultations chronologically
    patient.consultations.sort((a, b) => {
      const tA = getRowTimestamp(a);
      const tB = getRowTimestamp(b);
      if (tA !== tB) return tA - tB;
      return (a.srNo || 0) - (b.srNo || 0);
    });

    // Sort patient's own procedures chronologically
    patient.procedures.sort((a, b) => {
      const tA = getRowTimestamp(a);
      const tB = getRowTimestamp(b);
      if (tA !== tB) return tA - tB;
      return (a.srNo || 0) - (b.srNo || 0);
    });

    const allPatRows = [...patient.consultations, ...patient.procedures];
    const explicitDiscounts = allPatRows.reduce((s, r) => s + (r.discount || 0), 0);
    const implicitConcession = Math.max(0, patient.totalBill - patient.totalCollected - patient.totalPending);
    patient.totalDiscount = Math.max(explicitDiscounts, implicitConcession);

    const notes = allPatRows
      .map((r) => r.notes)
      .filter((n): n is string => Boolean(n && n.trim()))
      .map((n) => n.trim());
    patient.discountNotes = Array.from(new Set(notes));
  });

  return Array.from(map.values()).sort((a, b) => comparePatientConsultationTiming(a, b));
}

export function calculateKPIs(allRows: FrontOfficeRow[]): FrontOfficeSummaryKPIs {
  const uniquePatientUids = new Set(allRows.map((r) => r.patientUid).filter(Boolean));
  const totalPatients = uniquePatientUids.size;
  const totalBill = allRows.reduce((s, r) => s + r.billAmount, 0);
  const totalCollected = allRows.reduce((s, r) => s + r.collected, 0);
  const totalPending = allRows.reduce((s, r) => s + r.pending, 0);
  const totalDiscount = Math.max(
    allRows.reduce((s, r) => s + (r.discount || 0), 0),
    Math.max(0, totalBill - totalCollected - totalPending)
  );
  const realizationRate = totalBill > 0 ? (totalCollected / totalBill) * 100 : 0;

  const consultationCount = new Set(
    allRows
      .filter((r) => r.source === "consultation" && /consultation|follow-up/i.test((r as ConsultationRow).purpose))
      .map((r) => r.patientUid)
      .filter(Boolean)
  ).size;

  const serviceCount = new Set(
    allRows
      .filter((r) => r.source === "laboratory" || r.source === "radiology")
      .map((r) => r.patientUid)
      .filter(Boolean)
  ).size;

  return {
    totalPatients,
    totalBill,
    totalCollected,
    totalPending,
    totalDiscount,
    realizationRate,
    patientMixText: `${consultationCount} + ${serviceCount}`,
    consultationCount,
    serviceCount,
  };
}

export function calculateRevenueCategories(
  consultationRows: ConsultationRow[],
  serviceRows: ProcedureRow[]
): RevenueCategorySummary[] {
  const isFollowUp = (r: ConsultationRow) => /follow[\s-]?up/i.test(r.purpose);
  const isConsultation = (r: ConsultationRow) => /consultation/i.test(r.purpose) && !isFollowUp(r);

  const categories = [
    { label: "Consultation", rows: consultationRows.filter(isConsultation) },
    { label: "Follow-up", rows: consultationRows.filter(isFollowUp) },
    { label: "Laboratory", rows: serviceRows.filter((r) => r.source === "laboratory") },
    { label: "Radiology", rows: serviceRows.filter((r) => r.source === "radiology") },
  ];

  return categories.map(({ label, rows }) => {
    const billAmount = rows.reduce((s, r) => s + r.billAmount, 0);
    const collected = rows.reduce((s, r) => s + r.collected, 0);
    const pending = rows.reduce((s, r) => s + r.pending, 0);
    const rawDisc = rows.reduce((s, r) => s + (r.discount || 0), 0);
    const implicitDisc = Math.max(0, billAmount - collected - pending);
    const discount = Math.max(rawDisc, implicitDisc);

    return {
      label,
      count: rows.length,
      billAmount,
      discount,
      collected,
      pending,
    };
  });
}

export function calculateItemBreakdown(procedures: ProcedureRow[]): ItemBilledSummary[] {
  const grouped: Record<string, { count: number; amount: number }> = {};
  procedures.forEach((r) => {
    const label = r.procedure || "Unknown Item";
    if (!grouped[label]) grouped[label] = { count: 0, amount: 0 };
    grouped[label].count += 1;
    grouped[label].amount += Number(r.billAmount || 0);
  });

  return Object.entries(grouped)
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([name, v]) => ({ name, count: v.count, amount: v.amount }));
}

export interface FrontOfficeShift {
  id: number;
  name: string;
  startTime: string; // "HH:mm" e.g. "00:00"
  endTime: string;   // "HH:mm" e.g. "12:00"
  sortOrder: number;
  isActive: boolean;
}

/**
 * Checks if a given time falls within the shift window [startTime, endTime).
 * Supports standard day windows (e.g. 00:00 to 12:00, 12:00 to 16:30) as well as
 * overnight windows spanning midnight (e.g. 20:00 to 06:00).
 */
export function isTimeInShiftWindow(date: Date, startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) return true;
  const [startH = 0, startM = 0] = startTime.split(":").map(Number);
  const [endH = 0, endM = 0] = endTime.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  if (startMinutes <= endMinutes) {
    if (endMinutes >= 23 * 60 + 59) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight window (e.g. 21:00 to 06:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Filters rows (ConsultationRow, ProcedureRow, etc.) based on transaction timestamp
 * and the selected shift's time boundaries. If a row does not contain a valid time,
 * it is safely retained so that no data is accidentally dropped.
 */
export function filterRowsByShift<T extends { dateObj: Date | null; dateText: string }>(
  rows: T[],
  startTime: string,
  endTime: string
): T[] {
  if (!startTime || !endTime) return rows;

  return rows.filter((row) => {
    const d = row.dateObj || parseDate(row.dateText);
    if (!d || isNaN(d.getTime())) return true;
    return isTimeInShiftWindow(d, startTime, endTime);
  });
}
