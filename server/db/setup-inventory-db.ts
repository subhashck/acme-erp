import { pool } from "./client.ts";

export async function createInventorySchemaAndTables() {
  console.log("Setting up PostgreSQL 'inventory' schema and tables...");

  const ddl = `
    CREATE SCHEMA IF NOT EXISTS "inventory";

    CREATE TABLE IF NOT EXISTS "inventory"."stores" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "code" TEXT NOT NULL UNIQUE,
      "type" TEXT NOT NULL DEFAULT 'retail_pharmacy',
      "department_id" INTEGER REFERENCES "departments"("id"),
      "location" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "is_default" BOOLEAN NOT NULL DEFAULT false,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "inventory"."store_staff_assignments" (
      "id" SERIAL PRIMARY KEY,
      "staff_id" INTEGER NOT NULL,
      "store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id") ON DELETE CASCADE,
      "can_bill" BOOLEAN NOT NULL DEFAULT true,
      "can_receive" BOOLEAN NOT NULL DEFAULT true,
      "can_transfer" BOOLEAN NOT NULL DEFAULT true,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "inventory"."item_batches" (
      "id" SERIAL PRIMARY KEY,
      "item_id" INTEGER NOT NULL REFERENCES "items"("id") ON DELETE CASCADE,
      "batch_number" TEXT NOT NULL,
      "mfg_date" DATE,
      "expiry_date" DATE NOT NULL,
      "mrp" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "purchase_rate" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "sale_rate" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "barcode" TEXT,
      "supplier_id" INTEGER REFERENCES "vendors"("id"),
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "unq_item_batch" UNIQUE ("item_id", "batch_number")
    );

    CREATE TABLE IF NOT EXISTS "inventory"."store_batch_stock" (
      "id" SERIAL PRIMARY KEY,
      "store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id") ON DELETE CASCADE,
      "item_id" INTEGER NOT NULL REFERENCES "items"("id") ON DELETE CASCADE,
      "batch_id" INTEGER NOT NULL REFERENCES "inventory"."item_batches"("id") ON DELETE CASCADE,
      "quantity_on_hand" NUMERIC(12, 3) NOT NULL DEFAULT 0,
      "allocated_qty" NUMERIC(12, 3) NOT NULL DEFAULT 0,
      "available_qty" NUMERIC(12, 3) NOT NULL DEFAULT 0,
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "unq_store_batch" UNIQUE ("store_id", "batch_id")
    );

    CREATE TABLE IF NOT EXISTS "inventory"."stock_ledger" (
      "id" SERIAL PRIMARY KEY,
      "transaction_date" TIMESTAMP NOT NULL DEFAULT NOW(),
      "store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
      "item_id" INTEGER NOT NULL REFERENCES "items"("id"),
      "batch_id" INTEGER NOT NULL REFERENCES "inventory"."item_batches"("id"),
      "movement_type" TEXT NOT NULL,
      "reference_type" TEXT NOT NULL,
      "reference_id" INTEGER NOT NULL,
      "quantity_change" NUMERIC(12, 3) NOT NULL,
      "balance_after" NUMERIC(12, 3) NOT NULL,
      "cost_price" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "sale_price" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "created_by" TEXT REFERENCES "user"("id"),
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "inventory"."document_sequences" (
      "id" SERIAL PRIMARY KEY,
      "code" TEXT NOT NULL,
      "prefix" TEXT NOT NULL,
      "financial_year" TEXT NOT NULL,
      "current_val" INTEGER NOT NULL DEFAULT 0,
      "padding" INTEGER NOT NULL DEFAULT 5,
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "unq_code_fy" UNIQUE ("code", "financial_year")
    );
  `;

  await pool.query(ddl);
  console.log("PostgreSQL 'inventory' tables verified/created successfully.");
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  createInventorySchemaAndTables()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed to setup inventory DB:", err);
      process.exit(1);
    });
}
