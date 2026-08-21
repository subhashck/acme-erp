import { pool } from "./client.ts";

async function migrate() {
  console.log("Applying database migration for father_deceased and mother_deceased...");
  try {
    await pool.query(`
      ALTER TABLE nursing_applicants
      ADD COLUMN IF NOT EXISTS father_deceased BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS mother_deceased BOOLEAN DEFAULT FALSE;

      ALTER TABLE nursing_students
      ADD COLUMN IF NOT EXISTS father_deceased BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS mother_deceased BOOLEAN DEFAULT FALSE;
    `);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
