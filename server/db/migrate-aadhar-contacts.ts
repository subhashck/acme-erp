import { pool } from "./client.ts";

async function migrate() {
  console.log("Applying database migration for Aadhar and Contact Numbers in nursing_applicants and nursing_students...");
  try {
    await pool.query(`
      ALTER TABLE nursing_applicants
      ADD COLUMN IF NOT EXISTS aadhar_no TEXT,
      ADD COLUMN IF NOT EXISTS father_phone TEXT,
      ADD COLUMN IF NOT EXISTS father_aadhar_no TEXT,
      ADD COLUMN IF NOT EXISTS mother_phone TEXT,
      ADD COLUMN IF NOT EXISTS mother_aadhar_no TEXT;

      ALTER TABLE nursing_students
      ADD COLUMN IF NOT EXISTS aadhar_no TEXT,
      ADD COLUMN IF NOT EXISTS father_phone TEXT,
      ADD COLUMN IF NOT EXISTS father_aadhar_no TEXT,
      ADD COLUMN IF NOT EXISTS mother_phone TEXT,
      ADD COLUMN IF NOT EXISTS mother_aadhar_no TEXT;
    `);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
