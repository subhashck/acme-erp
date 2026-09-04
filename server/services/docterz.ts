import { pool } from "../db/client.ts";

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
  authorization: process.env.DOCTERZ_AUTHORIZATION || "3ctPSDmEi6VL-N8KR1cDt7pd01teTEwq",
  apiKey:
    process.env.DOCTERZ_API_KEY ||
    "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoiOTYzOTMxOCIsImRldmljZV9pZCI6ImVmMzlkN2M3OTU3ZTYzMzliNjQ2NWI0NTM5M2ZhZDM1In0.XQzLIvI_WY1rIOpSb9zKdvaBNI0ksbiRz3PyFkRq3aI",
  appKey: process.env.DOCTERZ_APP_KEY || "79ca90b3",
  clinicId: process.env.DOCTERZ_CLINIC_ID || "5760",
  doctorIds: process.env.DOCTERZ_DOCTOR_IDS || "[11299,11300,11301,11302,11600,11601]",
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
    }

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
      SELECT id, authorization, api_key, app_key, clinic_id, doctor_ids, base_url, referer, updated_by, updated_at
      FROM docterz_api_config
      WHERE is_active = true
      ORDER BY id DESC
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
  const baseUrl = config.baseUrl?.trim() || current.baseUrl;
  const referer = config.referer?.trim() || current.referer;

  const res = await pool.query(
    `
    INSERT INTO docterz_api_config (authorization, api_key, app_key, clinic_id, doctor_ids, base_url, referer, is_active, updated_by, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW())
    RETURNING id, authorization, api_key, app_key, clinic_id, doctor_ids, base_url, referer, updated_by, updated_at
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
  const date = testDate || new Date().toISOString().slice(0, 10);
  const rawDoctorIds = config.doctorIds || DEFAULT_DOCTERZ_CONFIG.doctorIds;
  const doctorIds = rawDoctorIds.includes("%") ? decodeURIComponent(rawDoctorIds) : rawDoctorIds;

  const url = new URL(config.baseUrl || DEFAULT_DOCTERZ_CONFIG.baseUrl);
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

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      return {
        success: false,
        status: res.status,
        message: `HTTP ${res.status} ${res.statusText}: ${errorText.slice(0, 150) || "Access denied or token expired"}`,
        latencyMs,
      };
    }

    const json = await res.json();
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
  const clinicId = options?.clinicId || config.clinicId;
  const rawDoctorIds = options?.doctorIds || config.doctorIds;
  // Ensure we do not pass already-encoded %5B to searchParams (which double-encodes to %255B)
  const doctorIds = rawDoctorIds.includes("%") ? decodeURIComponent(rawDoctorIds) : rawDoctorIds;
  const limit = options?.limit || 500;

  const url = new URL(config.baseUrl || DEFAULT_DOCTERZ_CONFIG.baseUrl);
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

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      `Docterz API error (${res.status} ${res.statusText}) for ${searchBy}: ${errorText.slice(0, 200)}`
    );
  }

  const json = await res.json();
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
