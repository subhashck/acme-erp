import { sql } from "drizzle-orm";
import { db, pool } from "./client.ts";

async function fixSchema() {
  console.log("Synchronizing staff_hr_profiles columns...");
  try {
    // 1. Ensure education_history and professional_history are jsonb
    const cols = ["education_history", "professional_history"];
    for (const col of cols) {
      try {
        await pool.query(`ALTER TABLE staff_hr_profiles ALTER COLUMN "${col}" DROP DEFAULT;`);
      } catch (e) {}
      await pool.query(`
        ALTER TABLE staff_hr_profiles 
        ALTER COLUMN "${col}" TYPE jsonb USING (
          CASE 
            WHEN "${col}" IS NULL OR "${col}"::text = '' OR "${col}"::text = 'null' THEN '[]'::jsonb 
            WHEN "${col}"::text LIKE '[%' OR "${col}"::text LIKE '{%' THEN "${col}"::jsonb 
            ELSE '[]'::jsonb 
          END
        );
      `);
      await pool.query(`ALTER TABLE staff_hr_profiles ALTER COLUMN "${col}" SET DEFAULT '[]'::jsonb;`);
    }

    // 2. Add missing columns from schema.ts
    await pool.query(`
      ALTER TABLE staff_hr_profiles
        ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'Indian',
        ADD COLUMN IF NOT EXISTS landmar_current_address text,
        ADD COLUMN IF NOT EXISTS landmark_permanent_address text,
        ADD COLUMN IF NOT EXISTS certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS family_members jsonb NOT NULL DEFAULT '[]'::jsonb;
    `);

    console.log("Successfully synchronized staff_hr_profiles schema!");
  } catch (err) {
    console.error("Error synchronizing schema:", err instanceof Error ? err.message : String(err));
  } finally {
    await pool.end();
  }
}

fixSchema().catch((err) => {
  console.error("Error in fixSchema:", err);
  process.exit(1);
});
