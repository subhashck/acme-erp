import { pool, db } from "./client.ts";
import { sql } from "drizzle-orm";

export async function runMigration() {
  console.log("Starting unit FK migration and inventory schema setup...");
  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    // 1. Ensure inventory schema exists
    await client.query('CREATE SCHEMA IF NOT EXISTS "inventory";');

    // 2. Ensure default unit_types exist
    const defaultUnits = [
      { name: "Piece", symbol: "pcs", category: "Count/Quantity", isBaseUnit: true },
      { name: "Box", symbol: "box", category: "Packaging", isBaseUnit: false },
      { name: "Strip", symbol: "strip", category: "Packaging", isBaseUnit: false },
      { name: "Bottle", symbol: "btl", category: "Packaging", isBaseUnit: false },
      { name: "Vial", symbol: "vial", category: "Packaging", isBaseUnit: false },
      { name: "Ampoule", symbol: "amp", category: "Packaging", isBaseUnit: false },
      { name: "Kilogram", symbol: "kg", category: "Weight/Mass", isBaseUnit: false },
      { name: "Gram", symbol: "g", category: "Weight/Mass", isBaseUnit: true },
      { name: "Liter", symbol: "L", category: "Volume/Liquid", isBaseUnit: false },
      { name: "Milliliter", symbol: "ml", category: "Volume/Liquid", isBaseUnit: true },
      { name: "Nos", symbol: "nos", category: "Count/Quantity", isBaseUnit: true },
      { name: "Pack", symbol: "pkt", category: "Packaging", isBaseUnit: false },
    ];

    for (const u of defaultUnits) {
      await client.query(`
        INSERT INTO "unit_types" ("name", "symbol", "category", "is_base_unit", "created_at", "updated_at")
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT ("name") DO NOTHING;
      `, [u.name, u.symbol, u.category, u.isBaseUnit]);
    }

    // Get default unit id (e.g. Piece)
    const pieceRes = await client.query(`SELECT id FROM "unit_types" WHERE "symbol" = 'pcs' OR "name" = 'Piece' LIMIT 1;`);
    const defaultUnitId = pieceRes.rows[0]?.id || 1;

    // Helper to find or create unit
    async function getOrCreateUnitId(symbolOrName: string | null | undefined): Promise<number> {
      if (!symbolOrName || !symbolOrName.trim()) return defaultUnitId;
      const clean = symbolOrName.trim();
      const res = await client.query(
        `SELECT id FROM "unit_types" WHERE LOWER(symbol) = LOWER($1) OR LOWER(name) = LOWER($1) LIMIT 1;`,
        [clean]
      );
      if (res.rows.length > 0) return res.rows[0].id;

      // Auto-create
      const insertRes = await client.query(
        `INSERT INTO "unit_types" ("name", "symbol", "category", "is_base_unit", "created_at", "updated_at")
         VALUES ($1, $2, 'Count/Quantity', false, NOW(), NOW()) RETURNING id;`,
        [clean, clean.toLowerCase()]
      );
      return insertRes.rows[0].id;
    }

    // 3. Migrate items table
    // Add columns if not exist
    await client.query(`
      ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "base_unit_id" INTEGER REFERENCES "unit_types"("id");
      ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "purchase_unit_id" INTEGER REFERENCES "unit_types"("id");
      ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "sale_unit_id" INTEGER REFERENCES "unit_types"("id");
    `);

    // Check if old text columns exist on items
    const itemCols = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'items';
    `);
    const itemColNames = itemCols.rows.map((r: any) => r.column_name);

    if (itemColNames.includes("unit")) {
      const itemsList = await client.query(`SELECT id, unit, purchase_unit, sale_unit FROM "items";`);
      for (const item of itemsList.rows) {
        const baseId = await getOrCreateUnitId(item.unit);
        const purId = await getOrCreateUnitId(item.purchase_unit || item.unit);
        const saleId = await getOrCreateUnitId(item.sale_unit || item.unit);

        await client.query(
          `UPDATE "items" SET "base_unit_id" = $1, "purchase_unit_id" = $2, "sale_unit_id" = $3 WHERE "id" = $4;`,
          [baseId, purId, saleId, item.id]
        );
      }

      // Default any remaining nulls
      await client.query(`UPDATE "items" SET "base_unit_id" = $1 WHERE "base_unit_id" IS NULL;`, [defaultUnitId]);
      await client.query(`UPDATE "items" SET "purchase_unit_id" = $1 WHERE "purchase_unit_id" IS NULL;`, [defaultUnitId]);
      await client.query(`UPDATE "items" SET "sale_unit_id" = $1 WHERE "sale_unit_id" IS NULL;`, [defaultUnitId]);

      // Set NOT NULL
      await client.query(`
        ALTER TABLE "items" ALTER COLUMN "base_unit_id" SET NOT NULL;
        ALTER TABLE "items" ALTER COLUMN "purchase_unit_id" SET NOT NULL;
        ALTER TABLE "items" ALTER COLUMN "sale_unit_id" SET NOT NULL;
      `);

      // Drop old columns
      await client.query(`
        ALTER TABLE "items" DROP COLUMN IF EXISTS "unit";
        ALTER TABLE "items" DROP COLUMN IF EXISTS "purchase_unit";
        ALTER TABLE "items" DROP COLUMN IF EXISTS "sale_unit";
      `);
      console.log("Migrated and dropped legacy unit text columns on 'items'.");
    }

    // 4. Migrate po_items table
    await client.query(`ALTER TABLE "po_items" ADD COLUMN IF NOT EXISTS "unit_id" INTEGER REFERENCES "unit_types"("id");`);
    const poCols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'po_items';`);
    const poColNames = poCols.rows.map((r: any) => r.column_name);

    if (poColNames.includes("unit")) {
      const poList = await client.query(`SELECT id, unit FROM "po_items";`);
      for (const row of poList.rows) {
        const uId = await getOrCreateUnitId(row.unit);
        await client.query(`UPDATE "po_items" SET "unit_id" = $1 WHERE "id" = $2;`, [uId, row.id]);
      }
      await client.query(`UPDATE "po_items" SET "unit_id" = $1 WHERE "unit_id" IS NULL;`, [defaultUnitId]);
      await client.query(`ALTER TABLE "po_items" ALTER COLUMN "unit_id" SET NOT NULL;`);
      await client.query(`ALTER TABLE "po_items" DROP COLUMN IF EXISTS "unit";`);
      console.log("Migrated and dropped legacy unit text columns on 'po_items'.");
    }

    // 5. Migrate grn_items table
    await client.query(`ALTER TABLE "grn_items" ADD COLUMN IF NOT EXISTS "unit_id" INTEGER REFERENCES "unit_types"("id");`);
    const grnCols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'grn_items';`);
    const grnColNames = grnCols.rows.map((r: any) => r.column_name);

    if (grnColNames.includes("unit")) {
      const grnList = await client.query(`SELECT id, unit FROM "grn_items";`);
      for (const row of grnList.rows) {
        const uId = await getOrCreateUnitId(row.unit);
        await client.query(`UPDATE "grn_items" SET "unit_id" = $1 WHERE "id" = $2;`, [uId, row.id]);
      }
      await client.query(`UPDATE "grn_items" SET "unit_id" = $1 WHERE "unit_id" IS NULL;`, [defaultUnitId]);
      await client.query(`ALTER TABLE "grn_items" ALTER COLUMN "unit_id" SET NOT NULL;`);
      await client.query(`ALTER TABLE "grn_items" DROP COLUMN IF EXISTS "unit";`);
      console.log("Migrated and dropped legacy unit text columns on 'grn_items'.");
    }

    // 6. Migrate item_unit_prices table
    await client.query(`ALTER TABLE "item_unit_prices" ADD COLUMN IF NOT EXISTS "unit_id" INTEGER REFERENCES "unit_types"("id");`);
    const upCols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'item_unit_prices';`);
    const upColNames = upCols.rows.map((r: any) => r.column_name);

    if (upColNames.includes("unit")) {
      const upList = await client.query(`SELECT id, unit FROM "item_unit_prices";`);
      for (const row of upList.rows) {
        const uId = await getOrCreateUnitId(row.unit);
        await client.query(`UPDATE "item_unit_prices" SET "unit_id" = $1 WHERE "id" = $2;`, [uId, row.id]);
      }
      await client.query(`UPDATE "item_unit_prices" SET "unit_id" = $1 WHERE "unit_id" IS NULL;`, [defaultUnitId]);
      await client.query(`ALTER TABLE "item_unit_prices" ALTER COLUMN "unit_id" SET NOT NULL;`);
      await client.query(`ALTER TABLE "item_unit_prices" DROP COLUMN IF EXISTS "unit";`);
      console.log("Migrated and dropped legacy unit text columns on 'item_unit_prices'.");
    }

    // 7. Update inventory schema tables for unit_id
    // Requisitions
    await client.query(`
      CREATE TABLE IF NOT EXISTS "inventory"."stock_requisitions" (
        "id" SERIAL PRIMARY KEY,
        "requisition_no" TEXT NOT NULL UNIQUE,
        "requesting_store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
        "fulfilling_store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
        "status" TEXT NOT NULL DEFAULT 'draft',
        "priority" TEXT NOT NULL DEFAULT 'normal',
        "requested_by" TEXT REFERENCES "user"("id"),
        "approved_by" TEXT REFERENCES "user"("id"),
        "remarks" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "inventory"."stock_requisition_items" (
        "id" SERIAL PRIMARY KEY,
        "requisition_id" INTEGER NOT NULL REFERENCES "inventory"."stock_requisitions"("id") ON DELETE CASCADE,
        "item_id" INTEGER NOT NULL REFERENCES "items"("id"),
        "requested_qty" NUMERIC(12, 3) NOT NULL,
        "approved_qty" NUMERIC(12, 3),
        "fulfilled_qty" NUMERIC(12, 3) NOT NULL DEFAULT 0,
        "unit_id" INTEGER NOT NULL REFERENCES "unit_types"("id")
      );
    `);

    // Transfers
    await client.query(`
      CREATE TABLE IF NOT EXISTS "inventory"."stock_transfers" (
        "id" SERIAL PRIMARY KEY,
        "transfer_no" TEXT NOT NULL UNIQUE,
        "from_store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
        "to_store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
        "requisition_id" INTEGER REFERENCES "inventory"."stock_requisitions"("id"),
        "status" TEXT NOT NULL DEFAULT 'draft',
        "dispatched_by" TEXT REFERENCES "user"("id"),
        "received_by" TEXT REFERENCES "user"("id"),
        "dispatched_at" TIMESTAMP,
        "received_at" TIMESTAMP,
        "remarks" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "inventory"."stock_transfer_items" (
        "id" SERIAL PRIMARY KEY,
        "transfer_id" INTEGER NOT NULL REFERENCES "inventory"."stock_transfers"("id") ON DELETE CASCADE,
        "item_id" INTEGER NOT NULL REFERENCES "items"("id"),
        "batch_id" INTEGER NOT NULL REFERENCES "inventory"."item_batches"("id"),
        "quantity" NUMERIC(12, 3) NOT NULL,
        "unit_id" INTEGER NOT NULL REFERENCES "unit_types"("id"),
        "unit_rate" NUMERIC(12, 2) NOT NULL DEFAULT 0
      );
    `);

    // Invoices / POS
    await client.query(`
      CREATE TABLE IF NOT EXISTS "inventory"."sales_invoices" (
        "id" SERIAL PRIMARY KEY,
        "invoice_no" TEXT NOT NULL UNIQUE,
        "invoice_date" TIMESTAMP NOT NULL DEFAULT NOW(),
        "store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
        "patient_id" INTEGER REFERENCES "patients"("id"),
        "customer_name" TEXT,
        "customer_phone" TEXT,
        "doctor_name" TEXT,
        "prescription_id" INTEGER REFERENCES "prescriptions"("id"),
        "subtotal" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "discount_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "taxable_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "cgst_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "sgst_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "igst_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "round_off" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "net_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "payment_mode" TEXT NOT NULL DEFAULT 'cash',
        "status" TEXT NOT NULL DEFAULT 'completed',
        "cashier_id" TEXT REFERENCES "user"("id"),
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "inventory"."sales_invoice_items" (
        "id" SERIAL PRIMARY KEY,
        "invoice_id" INTEGER NOT NULL REFERENCES "inventory"."sales_invoices"("id") ON DELETE CASCADE,
        "item_id" INTEGER NOT NULL REFERENCES "items"("id"),
        "batch_id" INTEGER NOT NULL REFERENCES "inventory"."item_batches"("id"),
        "quantity" NUMERIC(12, 3) NOT NULL,
        "unit_id" INTEGER NOT NULL REFERENCES "unit_types"("id"),
        "unit_rate" NUMERIC(12, 2) NOT NULL,
        "mrp" NUMERIC(12, 2) NOT NULL,
        "discount_percent" NUMERIC(5, 2) DEFAULT 0,
        "discount_amount" NUMERIC(12, 2) DEFAULT 0,
        "taxable_amount" NUMERIC(12, 2) NOT NULL,
        "gst_percent" NUMERIC(5, 2) NOT NULL DEFAULT 0,
        "cgst_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "sgst_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "igst_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "total_amount" NUMERIC(12, 2) NOT NULL
      );
    `);

    // 8. Create Purchase Invoice tables in inventory schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS "inventory"."purchase_invoices" (
        "id" SERIAL PRIMARY KEY,
        "invoice_no" TEXT NOT NULL,
        "invoice_date" DATE NOT NULL,
        "vendor_id" INTEGER NOT NULL REFERENCES "vendors"("id"),
        "grn_id" INTEGER REFERENCES "grns"("id"),
        "po_id" INTEGER REFERENCES "purchase_orders"("id"),
        "status" TEXT NOT NULL DEFAULT 'draft',
        "subtotal" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "discount_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "taxable_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "cgst_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "sgst_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "igst_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "tds_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "round_off" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "net_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "credit_days" INTEGER DEFAULT 0,
        "due_date" DATE,
        "paid_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "remarks" TEXT,
        "verified_by" TEXT REFERENCES "user"("id"),
        "approved_by" TEXT REFERENCES "user"("id"),
        "created_by" TEXT REFERENCES "user"("id"),
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "inventory"."purchase_invoice_items" (
        "id" SERIAL PRIMARY KEY,
        "invoice_id" INTEGER NOT NULL REFERENCES "inventory"."purchase_invoices"("id") ON DELETE CASCADE,
        "item_id" INTEGER NOT NULL REFERENCES "items"("id"),
        "grn_item_id" INTEGER REFERENCES "grn_items"("id"),
        "quantity" NUMERIC(12, 3) NOT NULL,
        "unit_id" INTEGER NOT NULL REFERENCES "unit_types"("id"),
        "unit_rate" NUMERIC(12, 2) NOT NULL,
        "discount_percent" NUMERIC(5, 2) DEFAULT 0,
        "discount_amount" NUMERIC(12, 2) DEFAULT 0,
        "taxable_amount" NUMERIC(12, 2) NOT NULL,
        "hsn_code" TEXT,
        "gst_percent" NUMERIC(5, 2) NOT NULL DEFAULT 0,
        "cgst_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "sgst_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "igst_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        "total_amount" NUMERIC(12, 2) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "inventory"."purchase_invoice_payments" (
        "id" SERIAL PRIMARY KEY,
        "invoice_id" INTEGER NOT NULL REFERENCES "inventory"."purchase_invoices"("id") ON DELETE CASCADE,
        "payment_date" DATE NOT NULL,
        "amount" NUMERIC(12, 2) NOT NULL,
        "payment_mode" TEXT NOT NULL,
        "reference_no" TEXT,
        "remarks" TEXT,
        "created_by" TEXT REFERENCES "user"("id"),
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query("COMMIT;");
    console.log("Migration executed successfully!");
  } catch (error) {
    await client.query("ROLLBACK;");
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
