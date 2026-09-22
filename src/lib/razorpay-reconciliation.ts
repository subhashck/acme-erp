export interface ReconciliationPatient {
  id: number;
  docterz_id?: number;
  uid?: string | null;
  name?: string | null;
  mobile?: string | null;
  third_party_application_uid?: string | null;
}

export type ReconciliationStatus = "matched" | "review" | "unmatched" | "ignored";

export interface RazorpayReconciliationRow {
  rowNumber: number;
  paymentId: string;
  orderId: string;
  createdAt: string;
  status: string;
  method: string;
  amount: number;
  grossAmount: number;
  reversedAmount: number;
  currency: string;
  contact: string;
  email: string;
  description: string;
  notes: string;
  appointmentId: string;
  appointmentDate: string;
  paymentDate: string;
  sourcePatientName: string;
  doctorName: string;
  patient: ReconciliationPatient | null;
  reconciliationStatus: ReconciliationStatus;
  confidence: "high" | "medium" | "low" | "none";
  matchReason: string;
  duplicate: boolean;
  raw: Record<string, unknown>;
}

const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizeText = (value: unknown) => String(value ?? "").trim();
const normalizeComparable = (value: unknown) => normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizePhone = (value: unknown) => {
  const digits = normalizeText(value).replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};

function field(row: Record<string, unknown>, ...aliases: string[]): string {
  const wanted = new Set(aliases.map(normalizeHeader));
  const entry = Object.entries(row).find(([key]) => wanted.has(normalizeHeader(key)));
  return normalizeText(entry?.[1]);
}

function parseAmount(row: Record<string, unknown>): number {
  const raw = field(row, "amount", "payment amount", "credit");
  const parsed = Number(raw.replace(/[,₹\s]/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  // Razorpay's standard export stores Amount in major currency units. Only
  // explicitly paise-labelled columns are divided by 100.
  const hasPaiseHeader = Object.keys(row).some((key) => /paise/i.test(key) && normalizeText(row[key]) === raw);
  return hasPaiseHeader ? parsed / 100 : parsed;
}

interface TransferNotes {
  amount?: unknown;
  appointment_date?: unknown;
  appointment_id?: unknown;
  doctor_name?: unknown;
  patient_name?: unknown;
  payment_date?: unknown;
}

function parseTransferNotes(value: unknown): TransferNotes {
  if (value && typeof value === "object") return value as TransferNotes;
  const text = normalizeText(value);
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed as TransferNotes : {};
  } catch {
    return {};
  }
}

function transferMetadata(row: Record<string, unknown>): TransferNotes {
  const paymentNotes = parseTransferNotes(field(row, "payments_notes", "payment notes"));
  const transferNotes = parseTransferNotes(field(row, "transfers_notes", "transfer notes"));
  return { ...transferNotes, ...Object.fromEntries(Object.entries(paymentNotes).filter(([, value]) => normalizeText(value))) };
}

function searchableText(row: Record<string, unknown>): string {
  return [
    field(row, "description"),
    field(row, "notes", "note"),
    field(row, "notes[patient_uid]", "patient_uid", "patient uid", "receipt"),
    field(row, "notes[patient_name]", "patient_name", "patient name"),
    field(row, "order_id", "order id"),
  ].join(" ");
}

function matchPatient(row: Record<string, unknown>, patients: ReconciliationPatient[]) {
  const contact = normalizePhone(field(row, "contact", "phone", "mobile", "customer contact"));
  const haystack = normalizeComparable(searchableText(row));
  const metadata = transferMetadata(row);
  const sourcePatientName = normalizeComparable(metadata.patient_name);

  const uidMatches = patients.filter((patient) => {
    const ids = [patient.uid, patient.third_party_application_uid, patient.docterz_id]
      .map(normalizeComparable)
      .filter((value) => value.length >= 3);
    return ids.some((id) => haystack.includes(id));
  });
  if (uidMatches.length === 1) return { patient: uidMatches[0], confidence: "high" as const, reason: "Patient UID found in payment details" };

  if (contact.length >= 10) {
    const phoneMatches = patients.filter((patient) => normalizePhone(patient.mobile) === contact);
    if (phoneMatches.length === 1) return { patient: phoneMatches[0], confidence: "high" as const, reason: "Exact mobile number match" };
    if (phoneMatches.length > 1) return { patient: phoneMatches[0], confidence: "medium" as const, reason: "Mobile matches multiple patient records" };
  }

  if (sourcePatientName.length >= 3) {
    const exactNameMatches = patients.filter((patient) => normalizeComparable(patient.name) === sourcePatientName);
    if (exactNameMatches.length === 1) return { patient: exactNameMatches[0], confidence: "high" as const, reason: "Exact patient name from Razorpay transfer notes" };
    if (exactNameMatches.length > 1) return { patient: exactNameMatches[0], confidence: "medium" as const, reason: "Patient name matches multiple patient records" };
  }

  const nameMatches = patients.filter((patient) => {
    const name = normalizeComparable(patient.name);
    return name.length >= 5 && haystack.includes(name);
  });
  if (nameMatches.length === 1) return { patient: nameMatches[0], confidence: "medium" as const, reason: "Patient name found in payment details" };
  if (uidMatches.length > 1 || nameMatches.length > 1) return { patient: null, confidence: "low" as const, reason: "Multiple possible patient matches" };
  return { patient: null, confidence: "none" as const, reason: "No patient identifier matched" };
}

export function reconcileRazorpayRows(
  rawRows: Record<string, unknown>[],
  patients: ReconciliationPatient[],
): RazorpayReconciliationRow[] {
  const seenPaymentIds = new Set<string>();
  return rawRows.map((raw, index) => {
    const paymentId = field(raw, "id", "payment_id", "payment id", "razorpay payment id");
    const status = field(raw, "status", "payment status", "settlement_status", "settlement status").toLowerCase();
    const metadata = transferMetadata(raw);
    const grossAmount = parseAmount(raw);
    const reversedAmount = Number(field(raw, "amount_reversed", "amount reversed").replace(/[,₹\s]/g, "")) || 0;
    const duplicate = Boolean(paymentId && seenPaymentIds.has(paymentId));
    if (paymentId) seenPaymentIds.add(paymentId);
    const match = matchPatient(raw, patients);
    const fullyReversed = grossAmount > 0 && reversedAmount >= grossAmount;
    const partiallyReversed = reversedAmount > 0 && !fullyReversed;
    const ignored = ["failed", "refunded", "cancelled", "canceled"].includes(status) || fullyReversed;
    const reconciliationStatus: ReconciliationStatus = ignored
      ? "ignored"
      : duplicate || partiallyReversed || match.confidence === "medium" || match.confidence === "low"
        ? "review"
        : match.patient
          ? "matched"
          : "unmatched";

    return {
      rowNumber: index + 2,
      paymentId,
      orderId: field(raw, "order_id", "order id"),
      createdAt: field(raw, "created_at", "created at", "date"),
      status: status || "unknown",
      method: field(raw, "method", "payment method", "mode") || "—",
      amount: Math.max(0, grossAmount - reversedAmount),
      grossAmount,
      reversedAmount,
      currency: field(raw, "currency") || "INR",
      contact: field(raw, "contact", "phone", "mobile", "customer contact"),
      email: field(raw, "email", "customer email"),
      description: field(raw, "description"),
      notes: field(raw, "notes", "note", "notes[patient_uid]", "patient_uid", "patient uid", "payments_notes", "transfers_notes"),
      appointmentId: normalizeText(metadata.appointment_id),
      appointmentDate: normalizeText(metadata.appointment_date),
      paymentDate: normalizeText(metadata.payment_date),
      sourcePatientName: normalizeText(metadata.patient_name),
      doctorName: normalizeText(metadata.doctor_name),
      patient: match.patient,
      reconciliationStatus,
      confidence: match.confidence,
      matchReason: duplicate
        ? `Duplicate transfer ID; ${match.reason}`
        : fullyReversed
          ? `Fully reversed; ${match.reason}`
          : partiallyReversed
            ? `Partially reversed by ${reversedAmount}; ${match.reason}`
            : match.reason,
      duplicate,
      raw,
    };
  });
}
