import { db, pool } from "./client.ts";
import { documentSequences } from "./schema-inventory.ts";
import { createMagazineSchemaAndTables } from "./setup-magazine-db.ts";
import { getCurrentFinancialYear } from "../services/sequence.ts";
import { eq, and } from "drizzle-orm";

export async function seedMagazine() {
  console.log("Seeding magazine schema and defaults...");

  // 1. Ensure PostgreSQL schema 'magazine' and tables exist
  await createMagazineSchemaAndTables();

  // 2. Ensure Default Document Sequence 'MAG' in inventory.document_sequences for current Financial Year
  const fy = getCurrentFinancialYear();
  const [existingSeq] = await db
    .select()
    .from(documentSequences)
    .where(and(eq(documentSequences.code, "MAG"), eq(documentSequences.financialYear, fy)))
    .execute();

  if (!existingSeq) {
    await db.insert(documentSequences).values({
      code: "MAG",
      prefix: "MAG",
      financialYear: fy,
      currentVal: 0,
      padding: 5,
    });
    console.log(`Seeded document sequence: MAG for FY ${fy}`);
  } else {
    console.log(`Document sequence MAG for FY ${fy} already exists.`);
  }

  console.log("Magazine seeding completed successfully.");
}

// Allow executing directly via tsx
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  seedMagazine()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed to seed magazine:", err);
      process.exit(1);
    });
}
