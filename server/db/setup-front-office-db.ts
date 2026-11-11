import { pool } from "./client.ts";

export async function createFrontOfficeSchemaAndTables() {
  console.log("Setting up and verifying PostgreSQL 'front_office' tables...");

  const ddl = `
    CREATE TABLE IF NOT EXISTS "front_office_shifts" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "start_time" TEXT NOT NULL,
      "end_time" TEXT NOT NULL,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    ALTER TABLE "front_office_daily_reports" 
    ADD COLUMN IF NOT EXISTS "shift_label" TEXT NOT NULL DEFAULT 'Full Day';

    ALTER TABLE "front_office_daily_reports" 
    ADD COLUMN IF NOT EXISTS "total_expenses" NUMERIC(12, 2) NOT NULL DEFAULT 0;

    ALTER TABLE "front_office_daily_reports" 
    ADD COLUMN IF NOT EXISTS "net_collections" NUMERIC(12, 2) NOT NULL DEFAULT 0;

    ALTER TABLE "front_office_daily_reports" 
    ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

    ALTER TABLE "front_office_daily_reports" 
    ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

    UPDATE "front_office_daily_reports"
    SET 
      "total_expenses" = COALESCE(("summary_data"->>'totalExpenses')::numeric, 0),
      "net_collections" = COALESCE(("summary_data"->>'netCollections')::numeric, "total_collected")
    WHERE "total_expenses" = 0 AND "summary_data"->>'totalExpenses' IS NOT NULL;

    -- Resolve any historical duplicates so only the highest id per date+shift is active
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY report_date, shift_label ORDER BY id DESC) as rn
      FROM front_office_daily_reports
    )
    UPDATE front_office_daily_reports f
    SET is_active = (ranked.rn = 1), version = ranked.rn
    FROM ranked
    WHERE f.id = ranked.id AND f.version = 1 AND ranked.rn > 1;

    CREATE UNIQUE INDEX IF NOT EXISTS "uq_front_office_reports_active_date_shift"
    ON "front_office_daily_reports" ("report_date", "shift_label")
    WHERE "is_active" = true;

    CREATE UNIQUE INDEX IF NOT EXISTS "uq_front_office_reports_date_shift_version"
    ON "front_office_daily_reports" ("report_date", "shift_label", "version");

    CREATE TABLE IF NOT EXISTS "docterz_api_config" (
      "id" SERIAL PRIMARY KEY,
      "authorization" TEXT NOT NULL,
      "api_key" TEXT NOT NULL,
      "app_key" TEXT NOT NULL DEFAULT '',
      "clinic_id" TEXT NOT NULL DEFAULT '',
      "doctor_ids" TEXT NOT NULL DEFAULT '',
      "base_url" TEXT NOT NULL DEFAULT 'https://api.docterz.in/admin/reports/clinic/consultation_report',
      "referer" TEXT NOT NULL DEFAULT 'https://web.docterz.in/',
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "updated_by" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Patient sync schedule columns on the existing config table
    ALTER TABLE "docterz_api_config"
      ADD COLUMN IF NOT EXISTS "patient_sync_enabled" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "patient_sync_interval_minutes" INTEGER NOT NULL DEFAULT 60;

    -- Local mirror of Docterz patient records
    CREATE TABLE IF NOT EXISTS "docterz_patients" (
      "id"                          SERIAL PRIMARY KEY,
      "docterz_id"                  INTEGER NOT NULL UNIQUE,
      "uid"                         TEXT,
      "name"                        TEXT,
      "guardian_name"               TEXT,
      "mobile"                      TEXT,
      "dob"                         TEXT,
      "gender"                      TEXT,
      "address"                     TEXT,
      "clinic_id"                   TEXT,
      "aadhaar_no"                  TEXT,
      "third_party_application_uid" TEXT,
      "raw_data"                    JSONB,
      "first_seen_at"               TIMESTAMP NOT NULL DEFAULT NOW(),
      "last_synced_at"              TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Front Office activity can discover a patient before the authoritative
    -- Docterz directory supplies its numeric ID. The later directory sync
    -- merges and fills this nullable identifier.
    ALTER TABLE "docterz_patients"
      ALTER COLUMN "docterz_id" DROP NOT NULL;
    ALTER TABLE "docterz_patients"
      ADD COLUMN IF NOT EXISTS "last_visited_at" TIMESTAMP;

    CREATE INDEX IF NOT EXISTS "idx_docterz_patients_uid"
      ON "docterz_patients" ("uid");
    CREATE INDEX IF NOT EXISTS "idx_docterz_patients_mobile"
      ON "docterz_patients" ("mobile");
    CREATE INDEX IF NOT EXISTS "idx_docterz_patients_name"
      ON "docterz_patients" (LOWER("name"));

    CREATE TABLE IF NOT EXISTS "front_office_razorpay_reconciliations" (
      "id"             SERIAL PRIMARY KEY,
      "file_name"      TEXT NOT NULL,
      "total_rows"     INTEGER NOT NULL DEFAULT 0,
      "matched_rows"   INTEGER NOT NULL DEFAULT 0,
      "review_rows"    INTEGER NOT NULL DEFAULT 0,
      "unmatched_rows" INTEGER NOT NULL DEFAULT 0,
      "ignored_rows"   INTEGER NOT NULL DEFAULT 0,
      "net_amount"     NUMERIC(14, 2) NOT NULL DEFAULT 0,
      "created_by"     TEXT REFERENCES "user"("id") ON DELETE SET NULL,
      "created_at"     TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at"     TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "front_office_razorpay_reconciliation_rows" (
      "id"                    SERIAL PRIMARY KEY,
      "reconciliation_id"     INTEGER NOT NULL REFERENCES "front_office_razorpay_reconciliations"("id") ON DELETE CASCADE,
      "source_row_number"     INTEGER NOT NULL,
      "transfer_id"           TEXT,
      "settlement_status"     TEXT NOT NULL DEFAULT 'unknown',
      "created_at_source"     TEXT,
      "appointment_id"        TEXT,
      "appointment_date"      TEXT,
      "payment_date"          TEXT,
      "doctor_name"           TEXT,
      "source_patient_name"   TEXT,
      "gross_amount"          NUMERIC(14, 2) NOT NULL DEFAULT 0,
      "reversed_amount"       NUMERIC(14, 2) NOT NULL DEFAULT 0,
      "net_amount"            NUMERIC(14, 2) NOT NULL DEFAULT 0,
      "currency"              TEXT NOT NULL DEFAULT 'INR',
      "matched_patient_id"    INTEGER REFERENCES "docterz_patients"("id") ON DELETE SET NULL,
      "matched_patient_name"  TEXT,
      "matched_patient_uid"   TEXT,
      "reconciliation_status" TEXT NOT NULL,
      "confidence"            TEXT NOT NULL,
      "match_reason"          TEXT NOT NULL,
      "is_duplicate"          BOOLEAN NOT NULL DEFAULT false,
      "raw_data"              JSONB,
      "created_at"            TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE ("reconciliation_id", "source_row_number")
    );

    CREATE INDEX IF NOT EXISTS "idx_front_office_razorpay_run_transfer"
      ON "front_office_razorpay_reconciliation_rows" ("reconciliation_id", "transfer_id");
    CREATE INDEX IF NOT EXISTS "idx_front_office_razorpay_patient"
      ON "front_office_razorpay_reconciliation_rows" ("matched_patient_id");
    CREATE INDEX IF NOT EXISTS "idx_front_office_razorpay_patient_uid"
      ON "front_office_razorpay_reconciliation_rows" (LOWER("matched_patient_uid"));
    CREATE INDEX IF NOT EXISTS "idx_front_office_razorpay_patient_name"
      ON "front_office_razorpay_reconciliation_rows" (LOWER("source_patient_name"));
    CREATE INDEX IF NOT EXISTS "idx_front_office_razorpay_appointment"
      ON "front_office_razorpay_reconciliation_rows" ("appointment_id");

    CREATE TABLE IF NOT EXISTS "front_office_patient_appointments" (
      "id"               SERIAL PRIMARY KEY,
      "source_record_key" TEXT NOT NULL UNIQUE,
      "source_label"      TEXT NOT NULL,
      "source_type"       TEXT NOT NULL,
      "patient_uid"       TEXT,
      "patient_name"      TEXT NOT NULL,
      "patient_mobile"    TEXT,
      "appointment_id"    TEXT,
      "appointment_date"  TEXT,
      "doctor_name"       TEXT,
      "service_name"      TEXT,
      "schedule"          TEXT,
      "invoice_no"        TEXT,
      "bill_amount"       NUMERIC(14, 2) NOT NULL DEFAULT 0,
      "collected_amount"  NUMERIC(14, 2) NOT NULL DEFAULT 0,
      "pending_amount"    NUMERIC(14, 2) NOT NULL DEFAULT 0,
      "payment_mode"      TEXT,
      "first_seen_at"     TIMESTAMP NOT NULL DEFAULT NOW(),
      "last_seen_at"      TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS "idx_front_office_appointments_patient_uid"
      ON "front_office_patient_appointments" ("patient_uid");
    CREATE INDEX IF NOT EXISTS "idx_front_office_appointments_patient_name"
      ON "front_office_patient_appointments" (LOWER("patient_name"));
    CREATE INDEX IF NOT EXISTS "idx_front_office_appointments_appointment_id"
      ON "front_office_patient_appointments" ("appointment_id");

    -- Audit log for every sync run
    CREATE TABLE IF NOT EXISTS "docterz_sync_log" (
      "id"               SERIAL PRIMARY KEY,
      "triggered_by"     TEXT NOT NULL DEFAULT 'auto',
      "status"           TEXT NOT NULL DEFAULT 'running',
      "pages_fetched"    INTEGER NOT NULL DEFAULT 0,
      "total_fetched"    INTEGER NOT NULL DEFAULT 0,
      "new_records"      INTEGER NOT NULL DEFAULT 0,
      "updated_records"  INTEGER NOT NULL DEFAULT 0,
      "error_message"    TEXT,
      "started_at"       TIMESTAMP NOT NULL DEFAULT NOW(),
      "finished_at"      TIMESTAMP
    );
  `;

  await pool.query(ddl);

  const countRes = await pool.query(`SELECT COUNT(*) FROM "front_office_shifts"`);
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    await pool.query(`
      INSERT INTO "front_office_shifts" ("name", "start_time", "end_time", "sort_order", "is_active")
      VALUES 
        ('Morning Shift', '00:00', '12:00', 1, true),
        ('Afternoon Shift', '12:00', '16:30', 2, true),
        ('Night Shift', '16:30', '23:59', 3, true);
    `);
  }

  console.log("PostgreSQL front office tables and shifts verified/created successfully.");
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  createFrontOfficeSchemaAndTables()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed to setup front office DB:", err);
      process.exit(1);
    });
}
