import { pool } from "./client.ts";

export async function migrateConsumables() {
  console.log("Running consumables schema migration...");

  // 1. Add is_saleable to items table
  await pool.query(`
    ALTER TABLE "public"."items" ADD COLUMN IF NOT EXISTS "is_saleable" BOOLEAN NOT NULL DEFAULT true;
  `);
  console.log("Added is_saleable to public.items");

  // 2. Add CONSUMPTION and CONSUMPTION_RETURN enum values to stock_movement_type
  // In postgres, ALTER TYPE ADD VALUE cannot run inside a multi-statement block or transaction, so run separately
  try {
    await pool.query(`ALTER TYPE "inventory"."stock_movement_type" ADD VALUE IF NOT EXISTS 'CONSUMPTION'`);
  } catch (err: any) {
    console.log("Note on CONSUMPTION enum:", err.message);
  }
  try {
    await pool.query(`ALTER TYPE "inventory"."stock_movement_type" ADD VALUE IF NOT EXISTS 'CONSUMPTION_RETURN'`);
  } catch (err: any) {
    console.log("Note on CONSUMPTION_RETURN enum:", err.message);
  }
  console.log("Updated inventory.stock_movement_type enum");

  // 3. Create status enum types
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE "inventory"."consumption_voucher_status" AS ENUM ('draft', 'posted', 'cancelled');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "inventory"."consumption_return_status" AS ENUM ('draft', 'posted');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log("Created consumption status enums");

  // 4. Create consumption tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "inventory"."consumption_vouchers" (
      "id" SERIAL PRIMARY KEY,
      "voucher_no" TEXT NOT NULL UNIQUE,
      "voucher_date" TIMESTAMP NOT NULL DEFAULT NOW(),
      "store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
      "purpose" TEXT NOT NULL,
      "status" "inventory"."consumption_voucher_status" NOT NULL DEFAULT 'draft',
      "posted_by" TEXT REFERENCES "public"."user"("id"),
      "posted_at" TIMESTAMP,
      "created_by" TEXT REFERENCES "public"."user"("id"),
      "remarks" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "inventory"."consumption_voucher_items" (
      "id" SERIAL PRIMARY KEY,
      "voucher_id" INTEGER NOT NULL REFERENCES "inventory"."consumption_vouchers"("id") ON DELETE CASCADE,
      "item_id" INTEGER NOT NULL REFERENCES "public"."items"("id"),
      "batch_id" INTEGER NOT NULL REFERENCES "inventory"."item_batches"("id"),
      "quantity" NUMERIC(12, 3) NOT NULL,
      "unit_id" INTEGER NOT NULL REFERENCES "public"."unit_types"("id"),
      "unit_rate" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "total_cost" NUMERIC(12, 2) NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS "inventory"."consumption_returns" (
      "id" SERIAL PRIMARY KEY,
      "return_no" TEXT NOT NULL UNIQUE,
      "return_date" TIMESTAMP NOT NULL DEFAULT NOW(),
      "original_voucher_id" INTEGER REFERENCES "inventory"."consumption_vouchers"("id"),
      "store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
      "reason" TEXT NOT NULL,
      "status" "inventory"."consumption_return_status" NOT NULL DEFAULT 'draft',
      "posted_by" TEXT REFERENCES "public"."user"("id"),
      "posted_at" TIMESTAMP,
      "created_by" TEXT REFERENCES "public"."user"("id"),
      "remarks" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "inventory"."consumption_return_items" (
      "id" SERIAL PRIMARY KEY,
      "return_id" INTEGER NOT NULL REFERENCES "inventory"."consumption_returns"("id") ON DELETE CASCADE,
      "voucher_item_id" INTEGER REFERENCES "inventory"."consumption_voucher_items"("id"),
      "item_id" INTEGER NOT NULL REFERENCES "public"."items"("id"),
      "batch_id" INTEGER NOT NULL REFERENCES "inventory"."item_batches"("id"),
      "returned_qty" NUMERIC(12, 3) NOT NULL,
      "unit_id" INTEGER NOT NULL REFERENCES "public"."unit_types"("id"),
      "unit_rate" NUMERIC(12, 2) NOT NULL DEFAULT 0
    );
  `);
  console.log("Created consumption_vouchers, consumption_voucher_items, consumption_returns, consumption_return_items tables");
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  migrateConsumables()
    .then(() => {
      console.log("Migration complete!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
