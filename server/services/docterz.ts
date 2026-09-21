import { pool } from "../db/client.ts";

// ─── Dev-mode logger ─────────────────────────────────────────────────────────
const IS_DEV = process.env.NODE_ENV !== "production";
function devLog(...args: unknown[]) {
  if (IS_DEV) {
    const ts = new Date().toISOString();
    console.log(`[Docterz ${ts}]`, ...args);
  }
}
function devError(...args: unknown[]) {
  if (IS_DEV) {
    const ts = new Date().toISOString();
    console.error(`[Docterz ERROR ${ts}]`, ...args);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export interface DocterzApiConfig {
  id?: number;
  authorization: string;
  apiKey: string;
  appKey: string;
  clinicId: string;
  doctorIds: string;
  baseUrl: string;
  referer: string;
  updatedAt?: string;
  updatedBy?: string | null;
}

export const DEFAULT_DOCTERZ_CONFIG: DocterzApiConfig = {
  authorization: process.env.DOCTERZ_AUTHORIZATION || "",
  apiKey: process.env.DOCTERZ_API_KEY || "",
  appKey: process.env.DOCTERZ_APP_KEY || "",
  clinicId: process.env.DOCTERZ_CLINIC_ID || "",
  doctorIds: process.env.DOCTERZ_DOCTOR_IDS || "",
  baseUrl: process.env.DOCTERZ_BASE_URL || "https://api.docterz.in/admin/reports/clinic/consultation_report",
  referer: process.env.DOCTERZ_REFERER || "https://web.docterz.in/",
};

/**
 * Parses raw HTTP headers text or a cURL command into DocterzApiConfig fields.
 */
export function parseRawHeadersOrCurl(raw: string): Partial<DocterzApiConfig> {
  const result: Partial<DocterzApiConfig> = {};
  if (!raw || typeof raw !== "string") return result;

  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim().replace(/^['"]|['"]$/g, "").replace(/\\$/, "").trim();
    if (!trimmed) continue;

    // 1. Check if this line is an HTTP header (e.g. -H "Header: val" or "Header: val")
    const headerMatch = trimmed.match(/^(?:-H\s+['"]?|--header\s+['"]?)?([^:\s]+):\s*(.+)$/i);
    if (headerMatch) {
      const key = headerMatch[1].toLowerCase();
      const value = headerMatch[2].trim().replace(/['"]$/, "").trim();

      if (key === "authorization") {
        result.authorization = value;
      } else if (key === "x-api-key") {
        result.apiKey = value;
      } else if (key === "x-app-key") {
        result.appKey = value;
      } else if (key === "referer") {
        result.referer = value;
      }
      // CRITICAL: Do NOT parse URLs inside header lines (such as Referer: https://web.docterz.in/) as the API Base URL!
      continue;
    }

    // 2. Parse request URL from curl command or direct URL line (not from header lines)
    const urlMatch = trimmed.match(/https?:\/\/[^\s'"]+/);
    if (urlMatch) {
      try {
        const u = new URL(urlMatch[0]);
        if (u.searchParams.get("clinic_id")) {
          result.clinicId = u.searchParams.get("clinic_id")!;
        }
        if (u.searchParams.get("doctor_ids")) {
          result.doctorIds = u.searchParams.get("doctor_ids")!;
        }

        // Never set baseUrl to web.docterz.in (the web app frontend); the API host is api.docterz.in
        if (u.hostname.includes("web.docterz.in")) {
          u.hostname = "api.docterz.in";
        }
        // Ensure path points to consultation report if not specified or root
        if (!u.pathname || u.pathname === "/" || !u.pathname.includes("consultation_report")) {
          u.pathname = "/admin/reports/clinic/consultation_report";
        }
        result.baseUrl = `${u.origin}${u.pathname}`;
      } catch {}
    }
  }

  return result;
}

/**
 * Retrieves the active Docterz API configuration from database or environment defaults.
 */
export async function getDocterzConfig(): Promise<DocterzApiConfig> {
  try {
    const res = await pool.query(`
      SELECT "id", "authorization", "api_key", "app_key", "clinic_id", "doctor_ids", "base_url", "referer", "updated_by", "updated_at"
      FROM "docterz_api_config"
      WHERE "is_active" = true
      ORDER BY "id" DESC
      LIMIT 1
    `);
    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        id: row.id,
        authorization: row.authorization || DEFAULT_DOCTERZ_CONFIG.authorization,
        apiKey: row.api_key || DEFAULT_DOCTERZ_CONFIG.apiKey,
        appKey: row.app_key || DEFAULT_DOCTERZ_CONFIG.appKey,
        clinicId: row.clinic_id || DEFAULT_DOCTERZ_CONFIG.clinicId,
        doctorIds: row.doctor_ids || DEFAULT_DOCTERZ_CONFIG.doctorIds,
        baseUrl: row.base_url || DEFAULT_DOCTERZ_CONFIG.baseUrl,
        referer: row.referer || DEFAULT_DOCTERZ_CONFIG.referer,
        updatedBy: row.updated_by,
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      };
    }
  } catch {
    // Database table may not yet be initialized, gracefully use defaults
  }
  return { ...DEFAULT_DOCTERZ_CONFIG };
}

/**
 * Saves or updates the active Docterz API configuration.
 */
export async function saveDocterzConfig(
  config: Partial<DocterzApiConfig>,
  userId?: string
): Promise<DocterzApiConfig> {
  const current = await getDocterzConfig();
  const authorization = config.authorization?.trim() || current.authorization;
  const apiKey = config.apiKey?.trim() || current.apiKey;
  const appKey = config.appKey?.trim() || current.appKey;
  const clinicId = config.clinicId?.trim() || current.clinicId;
  const doctorIds = config.doctorIds?.trim() || current.doctorIds;
  const rawBaseUrl = (config.baseUrl?.trim() || current.baseUrl).trim();
  const referer = config.referer?.trim() || current.referer;

  // Sanitize baseUrl to ensure api.docterz.in is used
  let baseUrl = rawBaseUrl;
  try {
    const u = new URL(rawBaseUrl);
    if (u.hostname.includes("web.docterz.in")) {
      u.hostname = "api.docterz.in";
    }
    if (!u.pathname || u.pathname === "/" || !u.pathname.includes("consultation_report")) {
      u.pathname = "/admin/reports/clinic/consultation_report";
    }
    baseUrl = `${u.origin}${u.pathname}`;
  } catch {}

  // Deactivate any previous active configs to maintain single active record
  try {
    await pool.query(`UPDATE "docterz_api_config" SET "is_active" = false WHERE "is_active" = true`);
  } catch {}

  const res = await pool.query(
    `
    INSERT INTO "docterz_api_config" (
      "authorization",
      "api_key",
      "app_key",
      "clinic_id",
      "doctor_ids",
      "base_url",
      "referer",
      "is_active",
      "updated_by",
      "updated_at"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW())
    RETURNING "id", "authorization", "api_key", "app_key", "clinic_id", "doctor_ids", "base_url", "referer", "updated_by", "updated_at"
  `,
    [authorization, apiKey, appKey, clinicId, doctorIds, baseUrl, referer, userId || null]
  );

  const row = res.rows[0];
  return {
    id: row.id,
    authorization: row.authorization,
    apiKey: row.api_key,
    appKey: row.app_key,
    clinicId: row.clinic_id,
    doctorIds: row.doctor_ids,
    baseUrl: row.base_url,
    referer: row.referer,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

/**
 * Probes the Docterz API with given or active configuration to verify headers.
 */
export async function testDocterzConnection(
  configOverride?: Partial<DocterzApiConfig>,
  testDate?: string
): Promise<{
  success: boolean;
  status: number;
  message: string;
  recordsCount?: number;
  latencyMs: number;
}> {
  const active = await getDocterzConfig();
  const config = {
    ...active,
    ...configOverride,
  };

  const startTime = Date.now();
  if (!config.authorization || !config.apiKey) {
    return {
      success: false,
      status: 400,
      message: "Docterz API credentials are not configured. Please provide an authorization token and API key.",
      latencyMs: 0,
    };
  }

  const date = testDate || new Date().toISOString().slice(0, 10);
  const rawDoctorIds = config.doctorIds || DEFAULT_DOCTERZ_CONFIG.doctorIds;
  const doctorIds = rawDoctorIds.includes("%") ? decodeURIComponent(rawDoctorIds) : rawDoctorIds;

  // Sanitize Base URL to ensure it never hits web.docterz.in (S3 frontend) instead of api.docterz.in
  const rawBaseUrl = (config.baseUrl || DEFAULT_DOCTERZ_CONFIG.baseUrl).trim();
  let sanitizedBaseUrl = rawBaseUrl;
  try {
    const u = new URL(rawBaseUrl);
    if (u.hostname.includes("web.docterz.in")) {
      u.hostname = "api.docterz.in";
    }
    if (!u.pathname || u.pathname === "/" || !u.pathname.includes("consultation_report")) {
      u.pathname = "/admin/reports/clinic/consultation_report";
    }
    sanitizedBaseUrl = `${u.origin}${u.pathname}`;
  } catch {
    sanitizedBaseUrl = DEFAULT_DOCTERZ_CONFIG.baseUrl;
  }

  const url = new URL(sanitizedBaseUrl);
  url.searchParams.set("clinic_id", config.clinicId || DEFAULT_DOCTERZ_CONFIG.clinicId);
  url.searchParams.set("doctor_ids", doctorIds);
  url.searchParams.set("format", "csv");
  url.searchParams.set("from_date", date);
  url.searchParams.set("to_date", date);
  url.searchParams.set("limit", "10");
  url.searchParams.set("page", "1");
  url.searchParams.set("report_module", "OPD");
  url.searchParams.set("search_by", "Consultation");
  url.searchParams.set("no_show", "false");
  url.searchParams.set("only_pending_amount", "false");
  url.searchParams.set("payment_pending_paid", "false");
  url.searchParams.set("show_updated_payment", "false");
  url.searchParams.set("query", "");

  const headers: Record<string, string> = {
    accept: "text/csv,application/vnd.thepediatricnetwork.v1+json",
    "accept-language": "en-US,en;q=0.9",
    authorization: config.authorization,
    "x-api-key": config.apiKey,
    "x-app-key": config.appKey,
    Referer: config.referer || "https://web.docterz.in/",
  };

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers,
    });
    const latencyMs = Date.now() - startTime;
    const rawText = await res.text();
    const contentType = res.headers.get("content-type") || "";

    if (!res.ok) {
      let errorDetail = rawText.slice(0, 150);
      try {
        const errJson = JSON.parse(rawText);
        if (errJson.message) errorDetail = errJson.message;
        else if (errJson.error) errorDetail = errJson.error;
      } catch {}

      return {
        success: false,
        status: res.status,
        message: `HTTP ${res.status} ${res.statusText}: ${errorDetail || "Access denied or token expired"}`,
        latencyMs,
      };
    }

    if (
      contentType.includes("text/html") ||
      rawText.trim().startsWith("<!DOCTYPE") ||
      rawText.trim().startsWith("<html") ||
      rawText.trim().startsWith("<?xml")
    ) {
      return {
        success: false,
        status: res.status,
        message: `Docterz returned an HTML webpage instead of JSON data. Please verify the Base URL is 'https://api.docterz.in/admin/reports/clinic/consultation_report' and not 'web.docterz.in'.`,
        latencyMs,
      };
    }

    let json: any;
    try {
      json = JSON.parse(rawText);
    } catch {
      return {
        success: false,
        status: res.status,
        message: `Invalid JSON response returned from Docterz API: ${rawText.slice(0, 100)}`,
        latencyMs,
      };
    }

    const rows = parseDocterzCsvResponse(json);

    return {
      success: true,
      status: res.status,
      message: `Connection successful! Docterz responded in ${latencyMs}ms (${rows.length} test records retrieved).`,
      recordsCount: rows.length,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      status: 0,
      message: err.message || "Failed to reach Docterz API server",
      latencyMs,
    };
  }
}

/**
 * Parses Docterz array-of-arrays CSV response into structured row objects.
 */
export function parseDocterzCsvResponse(json: any): Record<string, any>[] {
  if (!json || !Array.isArray(json.data) || json.data.length < 3) {
    return [];
  }

  const rows: any[][] = json.data;
  const headers: string[] = rows[0];
  if (!Array.isArray(headers) || headers.length === 0) {
    return [];
  }

  const records: Record<string, any>[] = [];

  // Data rows begin at index 2 (index 1 is clinic name)
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    // Stop when reaching the summary total row or payment collection footer
    if (
      row[1] === "Total" ||
      row[0] === "Mode of Payment Collection Details" ||
      row[1] === "Mode of Payment Collection Details"
    ) {
      break;
    }

    // Skip empty separator rows
    if (row.every((cell) => cell === "" || cell === null || cell === undefined)) {
      continue;
    }

    // Must have patient name or UID to be a valid record row
    if (!row[1] && !row[2]) {
      continue;
    }

    const obj: Record<string, any> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      if (header) {
        obj[header] = row[j] !== undefined ? row[j] : "";
      }
    }
    records.push(obj);
  }

  return records;
}

/**
 * Fetches a specific report type from Docterz API for a given date.
 */
export async function fetchDocterzReport(
  searchBy: "Consultation" | "test_laboratory" | "test_radiology",
  date: string,
  options?: {
    clinicId?: string;
    doctorIds?: string;
    limit?: number;
  }
): Promise<Record<string, any>[]> {
  const config = await getDocterzConfig();
  if (!config.authorization || !config.apiKey) {
    throw new Error(
      `Docterz API credentials are not configured. Please configure them via environment variables or settings.`
    );
  }
  const clinicId = options?.clinicId || config.clinicId;
  const rawDoctorIds = options?.doctorIds || config.doctorIds;
  // Ensure we do not pass already-encoded %5B to searchParams (which double-encodes to %255B)
  const doctorIds = rawDoctorIds.includes("%") ? decodeURIComponent(rawDoctorIds) : rawDoctorIds;
  const limit = options?.limit || 500;

  const rawBaseUrl = (config.baseUrl || DEFAULT_DOCTERZ_CONFIG.baseUrl).trim();
  let sanitizedBaseUrl = rawBaseUrl;
  try {
    const u = new URL(rawBaseUrl);
    if (u.hostname.includes("web.docterz.in")) {
      u.hostname = "api.docterz.in";
    }
    if (!u.pathname || u.pathname === "/" || !u.pathname.includes("consultation_report")) {
      u.pathname = "/admin/reports/clinic/consultation_report";
    }
    sanitizedBaseUrl = `${u.origin}${u.pathname}`;
  } catch {
    sanitizedBaseUrl = DEFAULT_DOCTERZ_CONFIG.baseUrl;
  }

  const url = new URL(sanitizedBaseUrl);
  url.searchParams.set("clinic_id", clinicId);
  url.searchParams.set("doctor_ids", doctorIds);
  url.searchParams.set("format", "csv");
  url.searchParams.set("from_date", date);
  url.searchParams.set("to_date", date);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("page", "1");
  url.searchParams.set("report_module", "OPD");
  url.searchParams.set("search_by", searchBy);
  url.searchParams.set("no_show", "false");
  url.searchParams.set("only_pending_amount", "false");
  url.searchParams.set("payment_pending_paid", "false");
  url.searchParams.set("show_updated_payment", "false");
  url.searchParams.set("query", "");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "text/csv,application/vnd.thepediatricnetwork.v1+json",
      "accept-language": "en-US,en;q=0.9",
      authorization: config.authorization,
      "x-api-key": config.apiKey,
      "x-app-key": config.appKey,
      Referer: config.referer || "https://web.docterz.in/",
    },
  });

  const rawText = await res.text();
  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    throw new Error(
      `Docterz API error (${res.status} ${res.statusText}) for ${searchBy}: ${rawText.slice(0, 200)}`
    );
  }

  if (
    contentType.includes("text/html") ||
    rawText.trim().startsWith("<!DOCTYPE") ||
    rawText.trim().startsWith("<html")
  ) {
    throw new Error(
      `Docterz API error: Server returned an HTML webpage instead of JSON data. Please verify Base URL is https://api.docterz.in/admin/reports/clinic/consultation_report.`
    );
  }

  let json: any;
  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error(`Docterz API error: Expected JSON but received: ${rawText.slice(0, 150)}`);
  }
  return parseDocterzCsvResponse(json);
}

/**
 * Concurrently fetches Consultation, Laboratory, and Radiology reports for a date.
 */
export async function fetchDocterzFrontOfficeData(date: string): Promise<{
  date: string;
  consultations: Record<string, any>[];
  laboratory: Record<string, any>[];
  radiology: Record<string, any>[];
  counts: {
    consultations: number;
    laboratory: number;
    radiology: number;
  };
}> {
  const [consultations, laboratory, radiology] = await Promise.all([
    fetchDocterzReport("Consultation", date),
    fetchDocterzReport("test_laboratory", date),
    fetchDocterzReport("test_radiology", date),
  ]);

  return {
    date,
    consultations,
    laboratory,
    radiology,
    counts: {
      consultations: consultations.length,
      laboratory: laboratory.length,
      radiology: radiology.length,
    },
  };
}

const patientUrlCache = new Map<
  string,
  { parentId: number; childId: number; recordsUrl: string; invoicesUrl: string }
>();

/** Docterz's invoice screen is keyed by appointment UUID, not patient ID. */
export function buildDocterzInvoiceUrl(appointmentId: string | number | null | undefined): string | null {
  const id = String(appointmentId ?? "").trim();
  if (!id) return null;
  return `https://web.docterz.in/#/appointments/${encodeURIComponent(id)}/invoice`;
}

/**
 * Resolves a patient's parent_id and child_id in Docterz and constructs direct
 * deep-link URLs to their records and invoices on web.docterz.in.
 */
export async function resolveDocterzPatientUrl(query: {
  uid?: string;
  mobile?: string;
  name?: string;
  invoiceNo?: string;
}): Promise<{
  success: boolean;
  parentId?: number;
  childId?: number;
  recordsUrl?: string;
  invoicesUrl?: string;
  message?: string;
}> {
  const config = await getDocterzConfig();
  if (!config.authorization || !config.apiKey) {
    return {
      success: false,
      message: "Docterz API credentials are not configured.",
    };
  }

  const cleanUid = (query.uid || "").trim();
  const cleanMobile = (query.mobile || "").trim();
  const cleanName = (query.name || "").trim();
  const cleanInvoiceNo = (query.invoiceNo || "").trim();

  const cacheKey = [cleanUid, cleanMobile, cleanName, cleanInvoiceNo].join("|");
  if (cacheKey.replace(/\|/g, "").length > 0 && patientUrlCache.has(cacheKey)) {
    const cached = patientUrlCache.get(cacheKey)!;
    return {
      success: true,
      ...cached,
    };
  }

  const clinicId = config.clinicId || DEFAULT_DOCTERZ_CONFIG.clinicId;
  const headers = {
    accept: "application/vnd.thepediatricnetwork.v1+json, application/json, text/plain, */*",
    authorization: config.authorization,
    "x-api-key": config.apiKey,
    "x-app-key": config.appKey,
    Referer: config.referer || "https://web.docterz.in/",
  };

  const searchTerms = [cleanUid, cleanMobile, cleanName, cleanInvoiceNo].filter(Boolean);
  if (searchTerms.length === 0) {
    return {
      success: false,
      message: "At least one search parameter (UID, mobile, name, or invoice) is required.",
    };
  }

  let matchedChildId: number | null = null;

  for (const term of searchTerms) {
    const searchUrl = new URL(
      `/children/child_search?query=${encodeURIComponent(term)}&clinic_id=${clinicId}`,
      "https://api.docterz.in"
    );

    try {
      const res = await fetch(searchUrl.toString(), { headers });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // If searching with cleanUid, prefer exact UID match if present in results
        const exactMatch = cleanUid
          ? data.find((d: any) => (d.uid || "").toLowerCase() === cleanUid.toLowerCase())
          : null;
        const selected = exactMatch || data[0];
        if (selected?.id) {
          matchedChildId = Number(selected.id);
          break;
        }
      }
    } catch {
      // Continue to next search term if any error occurs
    }
  }

  if (!matchedChildId) {
    return {
      success: false,
      message: `No matching patient record found in Docterz for ${cleanUid || cleanName || cleanInvoiceNo || "patient"}.`,
    };
  }

  try {
    let parentId: number | null = null;

    // 1. First try /parents/:child_id which works with front-office / receptionist API credentials
    try {
      const parentUrl = new URL(`/parents/${matchedChildId}`, "https://api.docterz.in");
      const parentRes = await fetch(parentUrl.toString(), { headers });
      if (parentRes.ok) {
        const parentData = (await parentRes.json()) as any;
        const parentObj = parentData?.data?.parent || parentData?.parent;
        if (parentObj?.id) {
          parentId = Number(parentObj.id);
        }
      }
    } catch {
      // Fall through to fallback
    }

    // 2. Fallback to /children/:child_id if available with current permissions
    if (!parentId) {
      try {
        const childUrl = new URL(`/children/${matchedChildId}`, "https://api.docterz.in");
        const childRes = await fetch(childUrl.toString(), { headers });
        if (childRes.ok) {
          const childData = (await childRes.json()) as any;
          const childObj = childData?.data?.child || childData?.child;
          const parents = childObj?.parents || [];
          parentId = Number(parents.find((p: any) => p.is_primary)?.id || parents[0]?.id);
        }
      } catch {
        // Fall through
      }
    }

    // 3. If parentId could not be determined, fallback to matchedChildId
    const effectiveParentId = parentId || matchedChildId;

    const recordsUrl = `https://web.docterz.in/#/patients/${effectiveParentId}/details/${matchedChildId}/records`;
    // A patient-level invoice URL does not exist in Docterz. Keep this legacy
    // field on the patient record page; individual invoices use appointment IDs.
    const invoicesUrl = recordsUrl;

    const result = {
      parentId: effectiveParentId,
      childId: matchedChildId,
      recordsUrl,
      invoicesUrl,
    };

    if (cacheKey.replace(/\|/g, "").length > 0) {
      patientUrlCache.set(cacheKey, result);
    }

    return {
      success: true,
      ...result,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Error resolving patient records in Docterz.",
    };
  }
}

export interface DocterzPatientRecord {
  id: number | string;
  name: string | null;
  testDate: string | null;
  recordType: string | null;
  fileUrl: string | null;
  fileType: string | null;
  appointmentId: string | null;
  uploadedBy: string | null;
}

export interface DocterzInvoiceRecord {
  id: string;
  appointmentId: string | null;
  invoiceNo: string | null;
  invoiceDate: string | null;
  doctorName: string | null;
  amount: number;
  pdfUrl: string;
}

function findInvoicePdfUrl(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) return null;
  if (typeof value === "string") {
    if (!/^https:\/\//i.test(value)) return null;
    try {
      const url = new URL(value);
      return /(?:^|\.)s3[.-]|amazonaws\.com$/i.test(url.hostname) || /\.pdf(?:$|[?#])/i.test(value) ? value : null;
    } catch { return null; }
  }
  if (Array.isArray(value)) {
    for (const item of value) { const found = findInvoicePdfUrl(item, depth + 1); if (found) return found; }
    return null;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const preferred = entries.filter(([key]) => /invoice.*(?:pdf|url)|(?:pdf|file).*url|attachment/i.test(key));
    for (const [, item] of [...preferred, ...entries]) {
      const found = findInvoicePdfUrl(item, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Loads the same clinical records shown by the Docterz patient Records page.
 * Patient resolution is shared with the deep-link flow so callers can use UID,
 * mobile, or name without persisting Docterz parent/child IDs locally.
 */
export async function fetchDocterzPatientRecords(query: {
  uid?: string;
  mobile?: string;
  name?: string;
}): Promise<{ records: DocterzPatientRecord[]; invoices?: DocterzInvoiceRecord[]; recordsUrl?: string; invoicePdfUrls?: Record<string, string>; warning?: string }> {
  const resolved = await resolveDocterzPatientUrl(query);
  if (!resolved.success || !resolved.parentId || !resolved.childId) {
    return { records: [], warning: resolved.message || "Patient could not be resolved in Docterz" };
  }

  const config = await getDocterzConfig();
  const url = new URL(
    `/parents/${resolved.parentId}/children/${resolved.childId}/records`,
    "https://api.docterz.in",
  );
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/vnd.thepediatricnetwork.v1+json, application/json, text/plain, */*",
        authorization: config.authorization,
        "x-api-key": config.apiKey,
        "x-app-key": config.appKey,
        Referer: config.referer || "https://web.docterz.in/",
      },
    });
    if (!response.ok) {
      return { records: [], recordsUrl: resolved.recordsUrl, warning: `Docterz records returned HTTP ${response.status}` };
    }
    const body = await response.json() as any;
    const rawRecords = Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.records)
        ? body.records
        : Array.isArray(body?.data?.records)
          ? body.data.records
          : [];
    const records = rawRecords.map((record: any): DocterzPatientRecord => ({
      id: record.id,
      name: record.name || null,
      testDate: record.test_date || record.created_at || null,
      recordType: record.record_type || record.file_type || null,
      fileUrl: /^https?:\/\//i.test(String(record.file || record.file_url || ""))
        ? String(record.file || record.file_url)
        : null,
      fileType: record.file_type || null,
      appointmentId: record.appointment_id ? String(record.appointment_id) : null,
      uploadedBy: typeof record.uploaded_by_user === "string"
        ? record.uploaded_by_user
        : record.uploaded_by_user?.name || null,
    }));
    const invoicePdfUrls: Record<string, string> = {};
    const invoiceRecords: DocterzInvoiceRecord[] = [];
    try {
      const invoicesUrl = new URL(`/parents/${resolved.parentId}/children/${resolved.childId}/invoices`, "https://api.docterz.in");
      if (config.clinicId) invoicesUrl.searchParams.set("clinic_id", config.clinicId);
      const invoiceResponse = await fetch(invoicesUrl, { headers: {
        accept: "application/vnd.thepediatricnetwork.v1+json, application/json, text/plain, */*",
        authorization: config.authorization, "x-api-key": config.apiKey, "x-app-key": config.appKey,
        Referer: config.referer || "https://web.docterz.in/",
      }});
      if (invoiceResponse.ok) {
        const invoiceBody = await invoiceResponse.json() as any;
        const invoices = Array.isArray(invoiceBody?.data) ? invoiceBody.data
          : Array.isArray(invoiceBody?.invoices) ? invoiceBody.invoices
          : Array.isArray(invoiceBody?.data?.invoices) ? invoiceBody.data.invoices : [];
        for (const invoice of invoices) {
          const appointmentId = invoice.appointment_id || invoice.appointment_uuid || invoice.appointment?.uuid || invoice.appointment?.id || invoice.billable_id;
          const invoiceNumber = invoice.invoice_no || invoice.invoice_number || invoice.bill_no
            || invoice.bill_number || invoice.receipt_no || invoice.receipt_number || invoice.uuid || invoice.id;
          const pdfUrl = findInvoicePdfUrl(invoice);
          if (pdfUrl) {
            if (appointmentId) invoicePdfUrls[`appointment:${String(appointmentId).trim().toLowerCase()}`] = pdfUrl;
            if (invoiceNumber) invoicePdfUrls[`invoice:${String(invoiceNumber).trim().toLowerCase()}`] = pdfUrl;
            invoiceRecords.push({
              id: String(invoice.id || invoice.uuid || invoiceNumber),
              appointmentId: appointmentId ? String(appointmentId) : null,
              invoiceNo: invoiceNumber ? String(invoiceNumber) : null,
              invoiceDate: invoice.invoice_date || invoice.bill_date || invoice.created_at || invoice.date || null,
              doctorName: invoice.doctor_name || invoice.doctor?.name || null,
              amount: Number(invoice.total_amount ?? invoice.grand_total ?? invoice.amount ?? invoice.total ?? 0) || 0,
              pdfUrl,
            });
          }
        }
      }
    } catch (error: any) {
      devError("Docterz invoice PDF lookup failed:", error.message);
    }
    return { records, invoices: invoiceRecords, recordsUrl: resolved.recordsUrl, invoicePdfUrls };
  } catch (error: any) {
    return { records: [], recordsUrl: resolved.recordsUrl, warning: error.message || "Docterz records lookup failed" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Patient Directory Sync
// ─────────────────────────────────────────────────────────────────────────────

export interface DocterzPatient {
  id: number;
  docterzId: number;
  uid: string | null;
  name: string | null;
  guardianName: string | null;
  mobile: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  clinicId: string | null;
  aadhaarNo: string | null;
  thirdPartyApplicationUid: string | null;
  firstSeenAt: string;
  lastSyncedAt: string;
}

export interface DocterzSyncStatus {
  latestLog: {
    id: number;
    triggeredBy: string;
    status: string;
    pagesFetched: number;
    totalFetched: number;
    newRecords: number;
    updatedRecords: number;
    errorMessage: string | null;
    startedAt: string;
    finishedAt: string | null;
  } | null;
  totalPatients: number;
  syncEnabled: boolean;
  syncIntervalMinutes: number;
}

/** Normalises the response envelopes used by different Docterz API versions. */
export function parseDocterzPatientsResponse(data: any): { children: any[]; total?: number } {
  if (Array.isArray(data)) return { children: data };

  const envelopes = [data, data?.data, data?.data?.data];
  for (const envelope of envelopes) {
    if (!envelope || typeof envelope !== "object") continue;
    const total = Number(envelope.total ?? data?.data?.total ?? data?.total);
    for (const key of ["users", "children", "records", "items"] as const) {
      if (Array.isArray(envelope[key])) {
        return {
          children: envelope[key],
          ...(Number.isFinite(total) ? { total } : {}),
        };
      }
    }
    if (Array.isArray(envelope.data)) {
      return {
        children: envelope.data,
        ...(Number.isFinite(total) ? { total } : {}),
      };
    }
  }

  // Some Docterz paginator versions return { data: {} } after the last page.
  if (data?.data && typeof data.data === "object" && Object.keys(data.data).length === 0) {
    return { children: [] };
  }

  throw new Error(
    `Docterz /children returned an unrecognised response shape: ${JSON.stringify(data).slice(0, 300)}`
  );
}

/**
 * Fetches one page of patients from the Docterz /children endpoint.
 */
export async function fetchDocterzPatients(
  page: number,
  perPage = 100,
  config?: DocterzApiConfig
): Promise<{ children: any[]; total?: number }> {
  const activeConfig = config || (await getDocterzConfig());

  const url = new URL("https://api.docterz.in/children");
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));
  if (activeConfig.clinicId) {
    url.searchParams.set("clinic_id", activeConfig.clinicId);
  }

  const FETCH_TIMEOUT_MS = 30_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: {
        accept: "application/json, text/plain, */*",
        authorization: activeConfig.authorization,
        "x-api-key": activeConfig.apiKey,
        "x-app-key": activeConfig.appKey,
        Referer: activeConfig.referer || "https://web.docterz.in/",
      },
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error(
        `Docterz /children page ${page} timed out after ${FETCH_TIMEOUT_MS / 1000}s — the API is not responding.`
      );
    }
    throw err;
  }
  clearTimeout(timer);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Docterz /children API error (${res.status}): ${body.slice(0, 200)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as any;

  devLog(`fetchDocterzPatients page=${page} — raw response shape:`, {
    isArray: Array.isArray(data),
    keys: data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data) : [],
    hasChildren: Array.isArray(data?.children),
    hasData: Array.isArray(data?.data),
    childrenLen: Array.isArray(data?.children) ? data.children.length : undefined,
    dataLen: Array.isArray(data?.data) ? data.data.length : undefined,
    topLevelLen: Array.isArray(data) ? data.length : undefined,
    total: data?.total,
  });

  const parsed = parseDocterzPatientsResponse(data);
  devLog(
    `fetchDocterzPatients page=${page} — resolved count=${parsed.children.length}, total=${parsed.total ?? "unknown"}`
  );
  return parsed;
}

/**
 * Normalises a raw Docterz child record into the fields we store locally.
 */
function mapDocterzChild(child: any, clinicId: string) {
  const name =
    [child.first_name, child.last_name].filter(Boolean).join(" ").trim() ||
    child.name ||
    child.full_name ||
    child.user_name ||
    null;

  // In Docterz child objects, parents is an array of objects: parents[0].user.name
  const parentObj = child.parents?.[0] || child.parent;
  const guardianName =
    child.guardian_name ||
    parentObj?.user?.name ||
    parentObj?.name ||
    child.parent_name ||
    child.father_name ||
    child.mother_name ||
    [parentObj?.first_name, parentObj?.last_name].filter(Boolean).join(" ").trim() ||
    null;

  const rawDob = child.dob || child.date_of_birth || null;
  const dob = rawDob ? (String(rawDob).includes("T") ? String(rawDob).split("T")[0] : String(rawDob)) : null;

  // In Docterz EHR, mobile is under child_mobile or parents[0].user.mobile
  const mobile =
    child.child_mobile ||
    parentObj?.user?.mobile ||
    parentObj?.mobile ||
    child.mobile ||
    child.phone ||
    child.phone_number ||
    child.contact_no ||
    child.primary_mobile ||
    null;

  const aadhaarNo =
    child.aadhaar_no ||
    child.aadhaar ||
    child.aadhar_no ||
    child.aadhar ||
    child.abha_number ||
    parentObj?.user?.aadhaar_no ||
    parentObj?.aadhaar_no ||
    null;

  const uid =
    child.uid ||
    child.clinic_uid ||
    child.patient_uid ||
    (child.pid ? String(child.pid) : null) ||
    child.uhid ||
    child.mrn ||
    null;

  return {
    docterzId: Number(child.id),
    uid,
    name,
    guardianName,
    mobile: mobile ? String(mobile).trim() : null,
    dob,
    gender: child.gender || null,
    address: child.address || child.city || null,
    clinicId: String(child.clinic_id || clinicId || ""),
    aadhaarNo: aadhaarNo ? String(aadhaarNo).trim() : null,
    thirdPartyApplicationUid:
      child.third_party_application_uid ||
      child.third_party_uid ||
      child.external_id ||
      null,
  };
}

/** Guard flag so only one sync runs at a time. */
let _syncRunning = false;

/**
 * Resets any stale 'running' sync log entries left over from a crashed server
 * and clears the in-memory guard. Called once on server startup.
 */
export async function resetStuckSync(): Promise<void> {
  _syncRunning = false;
  try {
    const res = await pool.query(
      `UPDATE "docterz_sync_log"
       SET "status"='error',
           "error_message"='Server restarted — sync was interrupted',
           "finished_at"=NOW()
       WHERE "status"='running'
       RETURNING "id"`
    );
    if (res.rowCount && res.rowCount > 0) {
      console.log(`[Docterz] Cleaned up ${res.rowCount} stale running sync log row(s) on startup.`);
    }
  } catch (err: any) {
    console.warn("[Docterz] Could not reset stale sync logs:", err.message);
  }
}

/**
 * Full paginated sync of all patients from Docterz /children into local DB.
 * Creates a sync log entry, iterates pages, upserts records, finalises log.
 */
export async function syncDocterzPatients(triggeredBy = "auto"): Promise<{
  success: boolean;
  newRecords: number;
  updatedRecords: number;
  totalFetched: number;
  pagesFetched: number;
  errorMessage?: string;
}> {
  if (_syncRunning) {
    return {
      success: false,
      newRecords: 0,
      updatedRecords: 0,
      totalFetched: 0,
      pagesFetched: 0,
      errorMessage: "A sync is already in progress",
    };
  }
  _syncRunning = true;

  devLog(`Sync started — triggeredBy=${triggeredBy}`);

  // Create sync log entry
  const logRes = await pool.query(
    `INSERT INTO "docterz_sync_log" ("triggered_by", "status", "started_at")
     VALUES ($1, 'running', NOW()) RETURNING "id"`,
    [triggeredBy]
  );
  const logId: number = logRes.rows[0].id;
  devLog(`Sync log created — logId=${logId}`);

  let pagesFetched = 0;
  let totalFetched = 0;
  let newRecords = 0;
  let updatedRecords = 0;

  try {
    const config = await getDocterzConfig();
    if (!config.authorization || !config.apiKey) {
      throw new Error("Docterz API credentials are not configured.");
    }
    devLog(`Using config — clinicId=${config.clinicId}, apiKey=${config.apiKey.slice(0, 6)}...`);

    const PER_PAGE = 100;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      devLog(`Fetching page ${page} (perPage=${PER_PAGE})…`);
      let children: any[];
      let reportedTotal: number | undefined;
      try {
        const result = await fetchDocterzPatients(page, PER_PAGE, config);
        children = result.children;
        reportedTotal = result.total;
      } catch (fetchErr: any) {
        devError(`Page ${page} fetch failed:`, fetchErr.message);
        throw fetchErr;
      }
      pagesFetched++;
      totalFetched += children.length;
      devLog(`Page ${page} → received ${children.length} records (total so far: ${totalFetched})`);

      if (page === 1 && children.length > 0) {
        devLog("Sample first patient record from Docterz:", JSON.stringify(children[0]).slice(0, 500));
      }

      for (const child of children) {
        const mapped = mapDocterzChild(child, config.clinicId);
        if (!mapped.docterzId || isNaN(mapped.docterzId)) {
          devError("Skipping patient record with missing or invalid id:", child);
          continue;
        }

        // Prefer the authoritative Docterz ID, then merge a provisional Front
        // Office master by UID/mobile when that ID has not been seen before.
        const existing = await pool.query(
          `SELECT "id", "docterz_id"
           FROM "docterz_patients"
           WHERE "docterz_id" = $1
              OR ($2::text IS NOT NULL AND LOWER(COALESCE("uid", '')) = LOWER($2))
              OR ($3::text IS NOT NULL AND RIGHT(REGEXP_REPLACE(COALESCE("mobile", ''), '\\D', '', 'g'), 10)
                                      = RIGHT(REGEXP_REPLACE($3, '\\D', '', 'g'), 10))
           ORDER BY CASE WHEN "docterz_id" = $1 THEN 0 ELSE 1 END, "id"
           LIMIT 1`,
          [mapped.docterzId, mapped.uid, mapped.mobile]
        );

        if (existing.rows.length > 0) {
          await pool.query(
            `UPDATE "docterz_patients" SET
               "docterz_id"                 = $1,
               "uid"                        = COALESCE($2, "uid"),
               "name"                       = COALESCE($3, "name"),
               "guardian_name"              = COALESCE($4, "guardian_name"),
               "mobile"                     = COALESCE($5, "mobile"),
               "dob"                        = COALESCE($6, "dob"),
               "gender"                     = COALESCE($7, "gender"),
               "address"                    = COALESCE($8, "address"),
               "clinic_id"                  = COALESCE($9, "clinic_id"),
               "aadhaar_no"                 = COALESCE($10, "aadhaar_no"),
               "third_party_application_uid"= COALESCE($11, "third_party_application_uid"),
               "raw_data"                   = $12,
               "last_synced_at"             = NOW()
             WHERE "id" = $13`,
            [mapped.docterzId, mapped.uid, mapped.name, mapped.guardianName, mapped.mobile,
             mapped.dob, mapped.gender, mapped.address, mapped.clinicId, mapped.aadhaarNo,
             mapped.thirdPartyApplicationUid, JSON.stringify(child), existing.rows[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO "docterz_patients" (
               "docterz_id","uid","name","guardian_name","mobile","dob",
               "gender","address","clinic_id","aadhaar_no",
               "third_party_application_uid","raw_data","last_synced_at"
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
            [mapped.docterzId, mapped.uid, mapped.name, mapped.guardianName, mapped.mobile,
             mapped.dob, mapped.gender, mapped.address, mapped.clinicId, mapped.aadhaarNo,
             mapped.thirdPartyApplicationUid, JSON.stringify(child)]
          );
        }

        if (existing.rows.length === 0) {
          newRecords++;
        } else {
          updatedRecords++;
        }
      }

      devLog(`Page ${page} upserted — new=${newRecords}, updated=${updatedRecords}`);

      // Prefer the API's authoritative total. This avoids requesting one extra
      // page when the record count is an exact multiple of PER_PAGE.
      hasMore = reportedTotal !== undefined
        ? totalFetched < reportedTotal
        : children.length >= PER_PAGE;
      page++;
    }

    devLog(`All pages fetched — pages=${pagesFetched}, total=${totalFetched}, new=${newRecords}, updated=${updatedRecords}`);

    await pool.query(
      `UPDATE "docterz_sync_log"
       SET "status"='success',"pages_fetched"=$1,"total_fetched"=$2,
           "new_records"=$3,"updated_records"=$4,"finished_at"=NOW()
       WHERE "id"=$5`,
      [pagesFetched, totalFetched, newRecords, updatedRecords, logId]
    );

    _syncRunning = false;
    return { success: true, newRecords, updatedRecords, totalFetched, pagesFetched };
  } catch (err: any) {
    const errorMessage = err.message || "Unknown sync error";
    devError(`Sync failed at page ${pagesFetched + 1}:`, errorMessage);
    await pool
      .query(
        `UPDATE "docterz_sync_log"
         SET "status"='error',"pages_fetched"=$1,"total_fetched"=$2,
             "new_records"=$3,"updated_records"=$4,
             "error_message"=$5,"finished_at"=NOW()
         WHERE "id"=$6`,
        [pagesFetched, totalFetched, newRecords, updatedRecords, errorMessage, logId]
      )
      .catch((dbErr: any) => devError("Failed to update sync log on error:", dbErr.message));
    _syncRunning = false;
    return { success: false, newRecords, updatedRecords, totalFetched, pagesFetched, errorMessage };
  }
}

/**
 * Returns the latest sync log entry, current patient count, and sync schedule config.
 */
export async function getDocterzSyncStatus(): Promise<DocterzSyncStatus> {
  const syncConfigRes = await pool.query(
    `SELECT "patient_sync_enabled","patient_sync_interval_minutes"
     FROM "docterz_api_config" WHERE "is_active"=true ORDER BY "id" DESC LIMIT 1`
  );

  let syncEnabled = false;
  let syncIntervalMinutes = 60;
  if (syncConfigRes.rows.length > 0) {
    syncEnabled = syncConfigRes.rows[0].patient_sync_enabled ?? false;
    syncIntervalMinutes = syncConfigRes.rows[0].patient_sync_interval_minutes ?? 60;
  }

  const logRes = await pool.query(
    `SELECT "id","triggered_by","status","pages_fetched","total_fetched",
            "new_records","updated_records","error_message","started_at","finished_at"
     FROM "docterz_sync_log" ORDER BY "id" DESC LIMIT 1`
  );

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM "docterz_patients"`
  );
  const totalPatients = parseInt(countRes.rows[0]?.cnt ?? "0", 10);

  const latestLog =
    logRes.rows.length > 0
      ? {
          id: logRes.rows[0].id,
          triggeredBy: logRes.rows[0].triggered_by,
          status: logRes.rows[0].status,
          pagesFetched: logRes.rows[0].pages_fetched,
          totalFetched: logRes.rows[0].total_fetched,
          newRecords: logRes.rows[0].new_records,
          updatedRecords: logRes.rows[0].updated_records,
          errorMessage: logRes.rows[0].error_message,
          startedAt: logRes.rows[0].started_at,
          finishedAt: logRes.rows[0].finished_at,
        }
      : null;

  return { latestLog, totalPatients, syncEnabled, syncIntervalMinutes };
}

/**
 * Updates the patient sync schedule on the active docterz_api_config row.
 */
export async function updateDocterzSyncConfig(
  syncEnabled: boolean,
  syncIntervalMinutes: number
): Promise<void> {
  await pool.query(
    `UPDATE "docterz_api_config"
     SET "patient_sync_enabled"=$1,"patient_sync_interval_minutes"=$2,"updated_at"=NOW()
     WHERE "is_active"=true`,
    [syncEnabled, syncIntervalMinutes]
  );
}
