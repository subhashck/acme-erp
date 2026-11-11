import { pool } from "../server/db/client.ts";
import { fetchDocterzPatientRecords } from "../server/services/docterz.ts";

type Patient = { id: number; uid: string | null; name: string | null; mobile: string | null };

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const localOnly = args.has("--local-only");
const delayArg = process.argv.find((arg) => arg.startsWith("--delay-ms="));
const delayMs = Math.max(0, Number(delayArg?.split("=")[1] || 150) || 150);

function normalized(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizedMobile(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "").slice(-10);
}

function parseVisitDate(value: unknown): Date | null {
  const text = String(value ?? "").trim();
  if (!text || /^(?:invalid date|null|undefined|n\/?a)$/i.test(text)) return null;
  const match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?/i);
  if (match) {
    let hour = Number(match[4] || 0);
    const meridiem = match[6]?.toUpperCase();
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), hour, Number(match[5] || 0));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function latest(...dates: Array<Date | null | undefined>): Date | null {
  return dates.reduce<Date | null>((current, date) => date && (!current || date > current) ? date : current, null);
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function saveLastVisited(patientId: number, date: Date): Promise<void> {
  if (dryRun) return;
  await pool.query(
    `UPDATE "docterz_patients"
        SET "last_visited_at" = GREATEST(COALESCE("last_visited_at", $1::timestamp), $1::timestamp)
      WHERE "id" = $2`,
    [date, patientId],
  );
}

async function main() {
  const patientResult = await pool.query<Patient>(
    `SELECT "id", "uid", "name", "mobile" FROM "docterz_patients" ORDER BY "id"`,
  );
  const activityResult = await pool.query(
    `SELECT "patient_uid" AS uid, "patient_name" AS name, "patient_mobile" AS mobile,
            "appointment_date" AS visit_date
       FROM "front_office_patient_appointments"
     UNION ALL
     SELECT "matched_patient_uid" AS uid,
            COALESCE("matched_patient_name", "source_patient_name") AS name,
            NULL::text AS mobile,
            COALESCE("appointment_date", "payment_date", "created_at_source") AS visit_date
       FROM "front_office_razorpay_reconciliation_rows"
      WHERE "reconciliation_status" = 'matched'`,
  );

  const byUid = new Map<string, Date>();
  const byMobile = new Map<string, Date>();
  const byName = new Map<string, Date>();
  for (const row of activityResult.rows) {
    const date = parseVisitDate(row.visit_date);
    if (!date) continue;
    const uid = normalized(row.uid);
    const mobile = normalizedMobile(row.mobile);
    const name = normalized(row.name);
    if (uid) byUid.set(uid, latest(byUid.get(uid), date)!);
    if (mobile) byMobile.set(mobile, latest(byMobile.get(mobile), date)!);
    if (name) byName.set(name, latest(byName.get(name), date)!);
  }

  let localUpdated = 0;
  let docterzUpdated = 0;
  let failures = 0;
  for (const [index, patient] of patientResult.rows.entries()) {
    const localDate = latest(
      byUid.get(normalized(patient.uid)),
      byMobile.get(normalizedMobile(patient.mobile)),
      byName.get(normalized(patient.name)),
    );
    if (localDate) {
      await saveLastVisited(patient.id, localDate);
      localUpdated += 1;
    }

    if (!localOnly) {
      try {
        const docterz = await fetchDocterzPatientRecords({
          uid: patient.uid || undefined,
          mobile: patient.mobile || undefined,
          name: patient.name || undefined,
        });
        const remoteDate = latest(
          ...docterz.records.map((record) => parseVisitDate(record.testDate)),
          ...(docterz.invoices || []).map((invoice) => parseVisitDate(invoice.invoiceDate)),
        );
        if (remoteDate) {
          await saveLastVisited(patient.id, latest(localDate, remoteDate)!);
          docterzUpdated += 1;
        }
      } catch (error: any) {
        failures += 1;
        console.warn(`[${index + 1}/${patientResult.rows.length}] ${patient.name || patient.id}: ${error.message}`);
      }
      if (delayMs) await wait(delayMs);
    }

    if ((index + 1) % 50 === 0 || index + 1 === patientResult.rows.length) {
      console.log(`[${index + 1}/${patientResult.rows.length}] local=${localUpdated}, docterz=${docterzUpdated}, failures=${failures}`);
    }
  }

  console.log(`${dryRun ? "Dry run complete" : "Backfill complete"}: ${localUpdated} local matches, ${docterzUpdated} Docterz matches, ${failures} failures.`);
}

main()
  .catch((error) => { console.error("Last Visited backfill failed:", error); process.exitCode = 1; })
  .finally(() => pool.end());
