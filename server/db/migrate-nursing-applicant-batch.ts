import { pool } from "./client.ts";

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE nursing_applicants
      ADD COLUMN IF NOT EXISTS batch_id INTEGER REFERENCES nursing_batches(id) ON DELETE SET NULL;

update nursing_applicants AS applicant
      SET batch_id = 3 where batch_id is null and course_id=1 and academic_year='2026-2027';
    `);
    console.log("Nursing applicant batch migration completed successfully.");
  } catch (error) {
    console.error("Nursing applicant batch migration failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
