import { pool } from "./client.ts";

export async function createInventorySchemaAndTables() {
  console.log("Setting up and verifying PostgreSQL 'inventory' schema, all 19 tables, and column constraints...");

  const ddl = `
    CREATE SCHEMA IF NOT EXISTS "inventory";

    -- 1. Stores
    CREATE TABLE IF NOT EXISTS "inventory"."stores" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "code" TEXT NOT NULL UNIQUE,
      "type" TEXT NOT NULL DEFAULT 'retail_pharmacy',
      "department_id" INTEGER REFERENCES "public"."departments"("id"),
      "location" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "is_default" BOOLEAN NOT NULL DEFAULT false,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 2. Staff Store Assignments
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

    -- 3. Master Item Batches
    CREATE TABLE IF NOT EXISTS "inventory"."item_batches" (
      "id" SERIAL PRIMARY KEY,
      "item_id" INTEGER NOT NULL REFERENCES "public"."items"("id") ON DELETE CASCADE,
      "batch_number" TEXT NOT NULL,
      "mfg_date" DATE,
      "expiry_date" DATE NOT NULL,
      "mrp" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "purchase_rate" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "sale_rate" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "barcode" TEXT,
      "supplier_id" INTEGER REFERENCES "public"."vendors"("id"),
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "unq_item_batch" UNIQUE ("item_id", "batch_number")
    );

    -- 4. Store Batch Stock
    CREATE TABLE IF NOT EXISTS "inventory"."store_batch_stock" (
      "id" SERIAL PRIMARY KEY,
      "store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id") ON DELETE CASCADE,
      "item_id" INTEGER NOT NULL REFERENCES "public"."items"("id") ON DELETE CASCADE,
      "batch_id" INTEGER NOT NULL REFERENCES "inventory"."item_batches"("id") ON DELETE CASCADE,
      "quantity_on_hand" NUMERIC(12, 3) NOT NULL DEFAULT 0,
      "allocated_qty" NUMERIC(12, 3) NOT NULL DEFAULT 0,
      "available_qty" NUMERIC(12, 3) NOT NULL DEFAULT 0,
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "unq_store_batch" UNIQUE ("store_id", "batch_id")
    );

    -- 5. Stock Ledger
    CREATE TABLE IF NOT EXISTS "inventory"."stock_ledger" (
      "id" SERIAL PRIMARY KEY,
      "transaction_date" TIMESTAMP NOT NULL DEFAULT NOW(),
      "store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
      "item_id" INTEGER NOT NULL REFERENCES "public"."items"("id"),
      "batch_id" INTEGER NOT NULL REFERENCES "inventory"."item_batches"("id"),
      "movement_type" TEXT NOT NULL,
      "reference_type" TEXT NOT NULL,
      "reference_id" INTEGER NOT NULL,
      "quantity_change" NUMERIC(12, 3) NOT NULL,
      "balance_after" NUMERIC(12, 3) NOT NULL,
      "cost_price" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "sale_price" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "created_by" TEXT REFERENCES "public"."user"("id"),
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 6. Document Sequences
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

    -- 7. Stock Requisitions
    CREATE TABLE IF NOT EXISTS "inventory"."stock_requisitions" (
      "id" SERIAL PRIMARY KEY,
      "requisition_no" TEXT NOT NULL UNIQUE,
      "requesting_store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
      "fulfilling_store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
      "status" TEXT NOT NULL DEFAULT 'draft',
      "priority" TEXT NOT NULL DEFAULT 'normal',
      "requested_by" TEXT REFERENCES "public"."user"("id"),
      "approved_by" TEXT REFERENCES "public"."user"("id"),
      "remarks" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 8. Stock Requisition Items
    CREATE TABLE IF NOT EXISTS "inventory"."stock_requisition_items" (
      "id" SERIAL PRIMARY KEY,
      "requisition_id" INTEGER NOT NULL REFERENCES "inventory"."stock_requisitions"("id") ON DELETE CASCADE,
      "item_id" INTEGER NOT NULL REFERENCES "public"."items"("id"),
      "requested_qty" NUMERIC(12, 3) NOT NULL,
      "approved_qty" NUMERIC(12, 3),
      "fulfilled_qty" NUMERIC(12, 3) NOT NULL DEFAULT 0,
      "unit_id" INTEGER REFERENCES "public"."unit_types"("id")
    );

    -- 9. Stock Transfers
    CREATE TABLE IF NOT EXISTS "inventory"."stock_transfers" (
      "id" SERIAL PRIMARY KEY,
      "transfer_no" TEXT NOT NULL UNIQUE,
      "from_store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
      "to_store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
      "requisition_id" INTEGER REFERENCES "inventory"."stock_requisitions"("id"),
      "status" TEXT NOT NULL DEFAULT 'draft',
      "dispatched_by" TEXT REFERENCES "public"."user"("id"),
      "received_by" TEXT REFERENCES "public"."user"("id"),
      "dispatched_at" TIMESTAMP,
      "received_at" TIMESTAMP,
      "remarks" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 10. Stock Transfer Items
    CREATE TABLE IF NOT EXISTS "inventory"."stock_transfer_items" (
      "id" SERIAL PRIMARY KEY,
      "transfer_id" INTEGER NOT NULL REFERENCES "inventory"."stock_transfers"("id") ON DELETE CASCADE,
      "item_id" INTEGER NOT NULL REFERENCES "public"."items"("id"),
      "batch_id" INTEGER NOT NULL REFERENCES "inventory"."item_batches"("id"),
      "quantity" NUMERIC(12, 3) NOT NULL,
      "unit_id" INTEGER REFERENCES "public"."unit_types"("id"),
      "unit_rate" NUMERIC(12, 2) NOT NULL DEFAULT 0
    );

    -- 11. Stock Adjustments
    CREATE TABLE IF NOT EXISTS "inventory"."stock_adjustments" (
      "id" SERIAL PRIMARY KEY,
      "adjustment_no" TEXT NOT NULL UNIQUE,
      "store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
      "reason" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "created_by" TEXT REFERENCES "public"."user"("id"),
      "approved_by" TEXT REFERENCES "public"."user"("id"),
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 12. Stock Adjustment Items
    CREATE TABLE IF NOT EXISTS "inventory"."stock_adjustment_items" (
      "id" SERIAL PRIMARY KEY,
      "adjustment_id" INTEGER NOT NULL REFERENCES "inventory"."stock_adjustments"("id") ON DELETE CASCADE,
      "item_id" INTEGER NOT NULL REFERENCES "public"."items"("id"),
      "batch_id" INTEGER NOT NULL REFERENCES "inventory"."item_batches"("id"),
      "system_qty" NUMERIC(12, 3) NOT NULL,
      "physical_qty" NUMERIC(12, 3) NOT NULL,
      "difference_qty" NUMERIC(12, 3) NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'gain'
    );

    -- 13. Sales Invoices (POS)
    CREATE TABLE IF NOT EXISTS "inventory"."sales_invoices" (
      "id" SERIAL PRIMARY KEY,
      "invoice_no" TEXT NOT NULL UNIQUE,
      "invoice_date" TIMESTAMP NOT NULL DEFAULT NOW(),
      "store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
      "patient_id" INTEGER REFERENCES "public"."patients"("id"),
      "customer_name" TEXT,
      "customer_phone" TEXT,
      "doctor_name" TEXT,
      "prescription_id" INTEGER REFERENCES "public"."prescriptions"("id"),
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
      "cashier_id" TEXT REFERENCES "public"."user"("id"),
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 14. Sales Invoice Items
    CREATE TABLE IF NOT EXISTS "inventory"."sales_invoice_items" (
      "id" SERIAL PRIMARY KEY,
      "invoice_id" INTEGER NOT NULL REFERENCES "inventory"."sales_invoices"("id") ON DELETE CASCADE,
      "item_id" INTEGER NOT NULL REFERENCES "public"."items"("id"),
      "batch_id" INTEGER NOT NULL REFERENCES "inventory"."item_batches"("id"),
      "quantity" NUMERIC(12, 3) NOT NULL,
      "unit_id" INTEGER REFERENCES "public"."unit_types"("id"),
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

    -- 15. Sales Returns
    CREATE TABLE IF NOT EXISTS "inventory"."sales_returns" (
      "id" SERIAL PRIMARY KEY,
      "return_no" TEXT NOT NULL UNIQUE,
      "original_invoice_id" INTEGER REFERENCES "inventory"."sales_invoices"("id"),
      "store_id" INTEGER NOT NULL REFERENCES "inventory"."stores"("id"),
      "return_date" TIMESTAMP NOT NULL DEFAULT NOW(),
      "total_refund_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "refund_mode" TEXT NOT NULL DEFAULT 'cash',
      "reason" TEXT,
      "cashier_id" TEXT REFERENCES "public"."user"("id"),
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 16. Sales Return Items
    CREATE TABLE IF NOT EXISTS "inventory"."sales_return_items" (
      "id" SERIAL PRIMARY KEY,
      "return_id" INTEGER NOT NULL REFERENCES "inventory"."sales_returns"("id") ON DELETE CASCADE,
      "item_id" INTEGER NOT NULL REFERENCES "public"."items"("id"),
      "batch_id" INTEGER NOT NULL REFERENCES "inventory"."item_batches"("id"),
      "returned_qty" NUMERIC(12, 3) NOT NULL,
      "unit_id" INTEGER REFERENCES "public"."unit_types"("id"),
      "unit_rate" NUMERIC(12, 2) NOT NULL,
      "refund_amount" NUMERIC(12, 2) NOT NULL
    );

    -- 17. Purchase Invoices (Vendor Bills against GRNs & POs)
    CREATE TABLE IF NOT EXISTS "inventory"."purchase_invoices" (
      "id" SERIAL PRIMARY KEY,
      "invoice_no" TEXT NOT NULL,
      "invoice_date" DATE NOT NULL,
      "vendor_id" INTEGER NOT NULL REFERENCES "public"."vendors"("id"),
      "grn_id" INTEGER REFERENCES "public"."grns"("id"),
      "po_id" INTEGER REFERENCES "public"."purchase_orders"("id"),
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
      "verified_by" TEXT REFERENCES "public"."user"("id"),
      "approved_by" TEXT REFERENCES "public"."user"("id"),
      "created_by" TEXT REFERENCES "public"."user"("id"),
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 18. Purchase Invoice Items
    CREATE TABLE IF NOT EXISTS "inventory"."purchase_invoice_items" (
      "id" SERIAL PRIMARY KEY,
      "invoice_id" INTEGER NOT NULL REFERENCES "inventory"."purchase_invoices"("id") ON DELETE CASCADE,
      "item_id" INTEGER NOT NULL REFERENCES "public"."items"("id"),
      "grn_item_id" INTEGER REFERENCES "public"."grn_items"("id"),
      "quantity" NUMERIC(12, 3) NOT NULL,
      "unit_id" INTEGER REFERENCES "public"."unit_types"("id"),
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

    -- 19. Purchase Invoice Payments
    CREATE TABLE IF NOT EXISTS "inventory"."purchase_invoice_payments" (
      "id" SERIAL PRIMARY KEY,
      "invoice_id" INTEGER NOT NULL REFERENCES "inventory"."purchase_invoices"("id") ON DELETE CASCADE,
      "payment_date" DATE NOT NULL,
      "amount" NUMERIC(12, 2) NOT NULL,
      "payment_mode" TEXT NOT NULL DEFAULT 'cash',
      "reference_no" TEXT,
      "remarks" TEXT,
      "created_by" TEXT REFERENCES "public"."user"("id"),
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- -------------------------------------------------------------
    -- Idempotent Column Alterations (Ensure all columns exist)
    -- -------------------------------------------------------------
    ALTER TABLE "inventory"."stock_requisition_items" ADD COLUMN IF NOT EXISTS "unit_id" INTEGER REFERENCES "public"."unit_types"("id");
    ALTER TABLE "inventory"."stock_transfer_items" ADD COLUMN IF NOT EXISTS "unit_id" INTEGER REFERENCES "public"."unit_types"("id");
    ALTER TABLE "inventory"."sales_invoice_items" ADD COLUMN IF NOT EXISTS "unit_id" INTEGER REFERENCES "public"."unit_types"("id");
    ALTER TABLE "inventory"."sales_return_items" ADD COLUMN IF NOT EXISTS "unit_id" INTEGER REFERENCES "public"."unit_types"("id");
    ALTER TABLE "inventory"."purchase_invoices" ADD COLUMN IF NOT EXISTS "po_id" INTEGER REFERENCES "public"."purchase_orders"("id");
    ALTER TABLE "inventory"."purchase_invoices" ADD COLUMN IF NOT EXISTS "subtotal" NUMERIC(12, 2) NOT NULL DEFAULT 0;
    ALTER TABLE "inventory"."purchase_invoices" ADD COLUMN IF NOT EXISTS "discount_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0;
    ALTER TABLE "inventory"."purchase_invoices" ADD COLUMN IF NOT EXISTS "tds_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0;
    ALTER TABLE "inventory"."purchase_invoices" ADD COLUMN IF NOT EXISTS "credit_days" INTEGER DEFAULT 0;
    ALTER TABLE "inventory"."purchase_invoices" ADD COLUMN IF NOT EXISTS "approved_by" TEXT REFERENCES "public"."user"("id");
    ALTER TABLE "inventory"."purchase_invoices" ADD COLUMN IF NOT EXISTS "created_by" TEXT REFERENCES "public"."user"("id");
    ALTER TABLE "inventory"."purchase_invoice_items" ADD COLUMN IF NOT EXISTS "unit_id" INTEGER REFERENCES "public"."unit_types"("id");
    ALTER TABLE "inventory"."purchase_invoice_items" ADD COLUMN IF NOT EXISTS "hsn_code" TEXT;
    ALTER TABLE "public"."grn_items" ADD COLUMN IF NOT EXISTS "unit_id" INTEGER REFERENCES "public"."unit_types"("id");
    ALTER TABLE "public"."po_items" ADD COLUMN IF NOT EXISTS "unit_id" INTEGER REFERENCES "public"."unit_types"("id");

    -- Drop NOT NULL constraint on legacy unit text column if present
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'inventory' 
          AND table_name = 'stock_requisition_items' 
          AND column_name = 'unit'
      ) THEN
        ALTER TABLE "inventory"."stock_requisition_items" ALTER COLUMN "unit" DROP NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'inventory' 
          AND table_name = 'stock_transfer_items' 
          AND column_name = 'unit'
      ) THEN
        ALTER TABLE "inventory"."stock_transfer_items" ALTER COLUMN "unit" DROP NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'inventory' 
          AND table_name = 'sales_invoice_items' 
          AND column_name = 'unit'
      ) THEN
        ALTER TABLE "inventory"."sales_invoice_items" ALTER COLUMN "unit" DROP NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'inventory' 
          AND table_name = 'sales_return_items' 
          AND column_name = 'unit'
      ) THEN
        ALTER TABLE "inventory"."sales_return_items" ALTER COLUMN "unit" DROP NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'inventory' 
          AND table_name = 'purchase_invoice_items' 
          AND column_name = 'unit'
      ) THEN
        ALTER TABLE "inventory"."purchase_invoice_items" ALTER COLUMN "unit" DROP NOT NULL;
      END IF;
    END $$;

    -- Backfill default unit_id if any row has NULL unit_id
    UPDATE "inventory"."stock_requisition_items"
    SET "unit_id" = COALESCE((SELECT id FROM "public"."unit_types" LIMIT 1), 1)
    WHERE "unit_id" IS NULL;

    UPDATE "inventory"."stock_transfer_items"
    SET "unit_id" = COALESCE((SELECT id FROM "public"."unit_types" LIMIT 1), 1)
    WHERE "unit_id" IS NULL;

    UPDATE "inventory"."sales_invoice_items"
    SET "unit_id" = COALESCE((SELECT id FROM "public"."unit_types" LIMIT 1), 1)
    WHERE "unit_id" IS NULL;

    UPDATE "inventory"."sales_return_items"
    SET "unit_id" = COALESCE((SELECT id FROM "public"."unit_types" LIMIT 1), 1)
    WHERE "unit_id" IS NULL;

    UPDATE "inventory"."purchase_invoice_items"
    SET "unit_id" = COALESCE((SELECT id FROM "public"."unit_types" LIMIT 1), 1)
    WHERE "unit_id" IS NULL;

    UPDATE "public"."grn_items"
    SET "unit_id" = COALESCE((SELECT id FROM "public"."unit_types" LIMIT 1), 1)
    WHERE "unit_id" IS NULL;

    UPDATE "public"."po_items"
    SET "unit_id" = COALESCE((SELECT id FROM "public"."unit_types" LIMIT 1), 1)
    WHERE "unit_id" IS NULL;
  `;

  await pool.query(ddl);
  console.log("PostgreSQL 'inventory' tables & columns verified/created successfully.");
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  createInventorySchemaAndTables()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed to setup inventory DB:", err);
      process.exit(1);
    });
}
