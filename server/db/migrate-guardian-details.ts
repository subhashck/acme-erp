import { pool } from "./client.ts";

async function migrate() {
  console.log("Applying database migration for guardian details...");
  try {
    await pool.query(`
      ALTER TABLE nursing_applicants
      ADD COLUMN IF NOT EXISTS has_guardian BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS guardian_name TEXT,
      ADD COLUMN IF NOT EXISTS guardian_relation TEXT,
      ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
      ADD COLUMN IF NOT EXISTS guardian_aadhar_no TEXT,
      ADD COLUMN IF NOT EXISTS guardian_occupation TEXT,
      ADD COLUMN IF NOT EXISTS guardian_organization TEXT,
      ADD COLUMN IF NOT EXISTS guardian_annual_income NUMERIC(14, 2);

      ALTER TABLE nursing_students
      ADD COLUMN IF NOT EXISTS has_guardian BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS guardian_name TEXT,
      ADD COLUMN IF NOT EXISTS guardian_relation TEXT,
      ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
      ADD COLUMN IF NOT EXISTS guardian_aadhar_no TEXT,
      ADD COLUMN IF NOT EXISTS guardian_occupation TEXT,
      ADD COLUMN IF NOT EXISTS guardian_organization TEXT,
      ADD COLUMN IF NOT EXISTS guardian_annual_income NUMERIC(14, 2);
    `);
    console.log("Migration for guardian details executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
