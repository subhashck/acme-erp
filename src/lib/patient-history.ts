import { parseDate } from "./front-office-processor";

export interface PatientHistoryRow {
  history_key: string;
  source_kind: "front_office" | "razorpay" | "docterz_record" | "docterz_invoice" | "consolidated";
  transfer_id: string | null;
  settlement_status: string;
  appointment_id: string | null;
  appointment_date: string | null;
  payment_date: string | null;
  doctor_name: string | null;
  gross_amount: number;
  reversed_amount: number;
  net_amount: number;
  pending_amount: number;
  reconciliation_status: string;
  source_type: string;
  service_name: string | null;
  schedule: string | null;
  invoice_no: string | null;
  payment_mode: string | null;
  file_name: string;
  imported_at: string;
  razorpay_gross_amount?: number;
  razorpay_net_amount?: number;
  api_record_count?: number;
  razorpay_record_count?: number;
  docterz_record_count?: number;
  front_office_record_count?: number;
  record_url?: string | null;
  records_page_url?: string | null;
  invoice_url?: string | null;
}

const uniqueText = (values: Array<string | null | undefined>) =>
  [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].join(", ");

export const patientHistoryTime = (entry: PatientHistoryRow) => {
  const visitDate = parseDate(entry.appointment_date || entry.payment_date);
  if (visitDate) return visitDate.getTime();
  const importedAt = Date.parse(entry.imported_at || "");
  return Number.isFinite(importedAt) ? importedAt : 0;
};

export function formatPatientHistoryDate(value: string | null | undefined): string {
  if (!value?.trim()) return "Date unavailable";
  if (/^(?:invalid date|null|undefined|n\/?a)$/i.test(value.trim())) return "Date unavailable";
  const parsed = parseDate(value);
  if (!parsed) return value;
  const includesTime = /(?:T|\s)\d{1,2}:\d{2}/i.test(value);
  return new Intl.DateTimeFormat("en-IN", includesTime
    ? {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }
    : {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(parsed);
}

export function consolidatePatientHistory(rows: PatientHistoryRow[]): PatientHistoryRow[] {
  const groups = new Map<string, PatientHistoryRow[]>();
  const standalone: PatientHistoryRow[] = [];

  for (const row of rows) {
    const appointmentId = row.appointment_id?.trim();
    if (!appointmentId) {
      standalone.push(row);
      continue;
    }
    const key = appointmentId.toLowerCase();
    groups.set(key, [...(groups.get(key) || []), row]);
  }

  const consolidated: PatientHistoryRow[] = [...standalone];
  for (const [appointmentKey, group] of groups) {
    const apiRows = group.filter(
      (row) => row.source_kind === "front_office" || row.source_kind === "docterz_record",
    );
    const matchedRazorpayRows = group.filter(
      (row) => row.source_kind === "razorpay" && row.reconciliation_status === "matched",
    );
    const otherRows = group.filter(
      (row) => !apiRows.includes(row) && !matchedRazorpayRows.includes(row),
    );

    if (!apiRows.length || !matchedRazorpayRows.length) {
      consolidated.push(...group);
      continue;
    }

    // Repeated imports of the same transfer should not inflate the consolidated amount.
    const uniqueTransfers = [...new Map(
      matchedRazorpayRows.map((row) => [row.transfer_id || row.history_key, row]),
    ).values()];
    const newest = [...group].sort((a, b) => patientHistoryTime(b) - patientHistoryTime(a))[0];
    const primaryApi = apiRows[0];

    consolidated.push({
      ...primaryApi,
      history_key: `consolidated-${appointmentKey}`,
      source_kind: "consolidated",
      transfer_id: uniqueText(uniqueTransfers.map((row) => row.transfer_id)) || null,
      settlement_status: uniqueText(uniqueTransfers.map((row) => row.settlement_status)) || "matched",
      appointment_date: primaryApi.appointment_date || newest.appointment_date,
      payment_date: uniqueText(uniqueTransfers.map((row) => row.payment_date)) || null,
      doctor_name: uniqueText(apiRows.map((row) => row.doctor_name)) || null,
      gross_amount: apiRows.reduce((sum, row) => sum + Number(row.gross_amount || 0), 0),
      net_amount: apiRows.reduce((sum, row) => sum + Number(row.net_amount || 0), 0),
      pending_amount: apiRows.reduce((sum, row) => sum + Number(row.pending_amount || 0), 0),
      reversed_amount: uniqueTransfers.reduce((sum, row) => sum + Number(row.reversed_amount || 0), 0),
      reconciliation_status: "matched",
      source_type: uniqueText(apiRows.map((row) => row.source_type)) || "appointment",
      service_name: uniqueText(apiRows.map((row) => row.service_name)) || null,
      schedule: uniqueText(apiRows.map((row) => row.schedule)) || null,
      invoice_no: uniqueText(apiRows.map((row) => row.invoice_no)) || null,
      payment_mode: uniqueText(apiRows.map((row) => row.payment_mode)) || null,
      file_name: uniqueText(group.map((row) => row.file_name)),
      imported_at: newest.imported_at,
      razorpay_gross_amount: uniqueTransfers.reduce((sum, row) => sum + Number(row.gross_amount || 0), 0),
      razorpay_net_amount: uniqueTransfers.reduce((sum, row) => sum + Number(row.net_amount || 0), 0),
      api_record_count: apiRows.length,
      razorpay_record_count: uniqueTransfers.length,
      docterz_record_count: apiRows.filter((row) => row.source_kind === "docterz_record").length,
      front_office_record_count: apiRows.filter((row) => row.source_kind === "front_office").length,
      record_url: apiRows.find((row) => row.record_url)?.record_url || null,
      records_page_url: apiRows.find((row) => row.records_page_url)?.records_page_url || null,
      invoice_url: apiRows.find((row) => row.invoice_url)?.invoice_url || null,
    });
    consolidated.push(...otherRows);
  }

  return consolidated.sort((a, b) => patientHistoryTime(b) - patientHistoryTime(a));
}
