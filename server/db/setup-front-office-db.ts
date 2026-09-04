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
      "app_key" TEXT NOT NULL DEFAULT '79ca90b3',
      "clinic_id" TEXT NOT NULL DEFAULT '5760',
      "doctor_ids" TEXT NOT NULL DEFAULT '[11299,11300,11301,11302,11600,11601]',
      "base_url" TEXT NOT NULL DEFAULT 'https://api.docterz.in/admin/reports/clinic/consultation_report',
      "referer" TEXT NOT NULL DEFAULT 'https://web.docterz.in/',
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "updated_by" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
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
