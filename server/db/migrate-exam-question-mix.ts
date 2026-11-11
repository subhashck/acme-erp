import type { Pool } from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Schema-only migration: never runs the content seed against a live bank. */
export async function migrateExamQuestionMix(pool: Pool) {
  await pool.query(`
    ALTER TABLE skill_assessment.exam_configs
      ADD COLUMN IF NOT EXISTS basic_percentage INTEGER NOT NULL DEFAULT 50,
      ADD COLUMN IF NOT EXISTS medium_percentage INTEGER NOT NULL DEFAULT 35,
      ADD COLUMN IF NOT EXISTS advanced_percentage INTEGER NOT NULL DEFAULT 15,
      ADD COLUMN IF NOT EXISTS department_percentage INTEGER NOT NULL DEFAULT 50;
  `);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { pool } = await import("./client.ts");
  try {
    await migrateExamQuestionMix(pool);
    console.log("Exam question-mix columns ready.");
  } finally { await pool.end(); }
}
