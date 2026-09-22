import { sql } from "drizzle-orm";
import { db, pool } from "../client.ts";

async function main() {
  console.log("Casting columns to jsonb...");
  try {
    await db.execute(sql`
      ALTER TABLE "staff_hr_profiles" 
        ALTER COLUMN "education_history" DROP DEFAULT,
        ALTER COLUMN "education_history" SET DATA TYPE jsonb USING "education_history"::jsonb,
        ALTER COLUMN "education_history" SET DEFAULT '[]'::jsonb,

        ALTER COLUMN "professional_history" DROP DEFAULT,
        ALTER COLUMN "professional_history" SET DATA TYPE jsonb USING "professional_history"::jsonb,
        ALTER COLUMN "professional_history" SET DEFAULT '[]'::jsonb,

        ALTER COLUMN "certifications" DROP DEFAULT,
        ALTER COLUMN "certifications" SET DATA TYPE jsonb USING "certifications"::jsonb,
        ALTER COLUMN "certifications" SET DEFAULT '[]'::jsonb;
    `);
    console.log("Columns successfully cast to jsonb.");
  } catch (error) {
    console.error("Error casting columns:", error);
  } finally {
    await pool.end();
  }
}

main();
