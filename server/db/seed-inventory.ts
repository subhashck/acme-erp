import { db, pool } from "./client.ts";
import { stores, documentSequences } from "./schema-inventory.ts";
import { getCurrentFinancialYear } from "../services/sequence.ts";
import { eq, and } from "drizzle-orm";

export async function seedInventory() {
  console.log("Seeding inventory schema and defaults...");

  // 1. Ensure PostgreSQL schema 'inventory' exists
  await pool.query('CREATE SCHEMA IF NOT EXISTS "inventory";');
  console.log("Schema 'inventory' verified.");

  // 2. Ensure Default Main Store
  const [existingMainStore] = await db
    .select()
    .from(stores)
    .where(eq(stores.code, "MAIN-WH"))
    .execute();

  if (!existingMainStore) {
    const [mainStore] = await db
      .insert(stores)
      .values({
        name: "Central Warehouse / Main Store",
        code: "MAIN-WH",
        type: "central",
        location: "Ground Floor - Main Block",
        active: true,
        isDefault: true,
      })
      .returning();
    console.log(`Created default main store: ${mainStore.name} (ID: ${mainStore.id})`);
  } else {
    console.log(`Default main store already exists: ${existingMainStore.name}`);
  }

  // 3. Ensure Default Document Sequences for current Financial Year
  const fy = getCurrentFinancialYear();
  const codes = [
    { code: "GRN", prefix: "GRN" },
    { code: "PO", prefix: "PO" },
    { code: "INV", prefix: "INV" },
    { code: "TRN", prefix: "TRN" },
    { code: "REQ", prefix: "REQ" },
    { code: "ADJ", prefix: "ADJ" },
    { code: "RET", prefix: "RET" },
    { code: "PIN", prefix: "PIN" },
  ];

  for (const item of codes) {
    const [existingSeq] = await db
      .select()
      .from(documentSequences)
      .where(and(eq(documentSequences.code, item.code), eq(documentSequences.financialYear, fy)))
      .execute();

    if (!existingSeq) {
      await db.insert(documentSequences).values({
        code: item.code,
        prefix: item.prefix,
        financialYear: fy,
        currentVal: 0,
        padding: 5,
      });
      console.log(`Seeded document sequence: ${item.code} for FY ${fy}`);
    }
  }

  console.log("Inventory seeding completed successfully.");
}

// Allow executing directly via tsx
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  seedInventory()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed to seed inventory:", err);
      process.exit(1);
    });
}
