import { pool } from "./client.ts";

async function fixEnumDefaults() {
  console.log("Fixing enum column defaults and types in public and inventory schemas...");

  const queries = [
    // 1. Create Enums in public schema if not exists
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_status') THEN
        CREATE TYPE "public"."po_status" AS ENUM ('open', 'partial', 'closed', 'cancelled');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_payment_status') THEN
        CREATE TYPE "public"."po_payment_status" AS ENUM ('unpaid', 'partial', 'paid');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_mode') THEN
        CREATE TYPE "public"."payment_mode" AS ENUM ('cash', 'upi', 'card', 'rtgs', 'cheque', 'other');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grn_status') THEN
        CREATE TYPE "public"."grn_status" AS ENUM ('draft', 'posted', 'correction');
      END IF;
    END $$;`,

    // 2. Create Enums in inventory schema if not exists
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'inventory' AND t.typname = 'adjustment_type') THEN
        CREATE TYPE "inventory"."adjustment_type" AS ENUM ('gain', 'loss', 'expired', 'damaged');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'inventory' AND t.typname = 'adjustment_status') THEN
        CREATE TYPE "inventory"."adjustment_status" AS ENUM ('draft', 'posted');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'inventory' AND t.typname = 'transfer_status') THEN
        CREATE TYPE "inventory"."transfer_status" AS ENUM ('draft', 'in_transit', 'received', 'cancelled');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'inventory' AND t.typname = 'requisition_status') THEN
        CREATE TYPE "inventory"."requisition_status" AS ENUM ('draft', 'pending_approval', 'approved', 'partially_fulfilled', 'fulfilled', 'rejected');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'inventory' AND t.typname = 'requisition_priority') THEN
        CREATE TYPE "inventory"."requisition_priority" AS ENUM ('normal', 'urgent', 'emergency');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'inventory' AND t.typname = 'invoice_payment_mode') THEN
        CREATE TYPE "inventory"."invoice_payment_mode" AS ENUM ('cash', 'upi', 'card', 'credit', 'mixed');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'inventory' AND t.typname = 'invoice_status') THEN
        CREATE TYPE "inventory"."invoice_status" AS ENUM ('completed', 'cancelled', 'refunded');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'inventory' AND t.typname = 'refund_mode') THEN
        CREATE TYPE "inventory"."refund_mode" AS ENUM ('cash', 'upi', 'credit_note');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'inventory' AND t.typname = 'purchase_invoice_status') THEN
        CREATE TYPE "inventory"."purchase_invoice_status" AS ENUM ('draft', 'verified', 'approved', 'paid', 'partially_paid', 'cancelled');
      END IF;
    END $$;`,

    // 3. Drop defaults & cast columns in public schema
    `DO $$ BEGIN
      -- po_payments.payment_mode
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'po_payments' AND column_name = 'payment_mode') THEN
        ALTER TABLE "public"."po_payments" ALTER COLUMN "payment_mode" DROP DEFAULT;
        ALTER TABLE "public"."po_payments" ALTER COLUMN "payment_mode" TYPE "public"."payment_mode" USING ("payment_mode"::text)::"public"."payment_mode";
      END IF;

      -- purchase_orders.po_status
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'po_status') THEN
        ALTER TABLE "public"."purchase_orders" ALTER COLUMN "po_status" DROP DEFAULT;
        ALTER TABLE "public"."purchase_orders" ALTER COLUMN "po_status" TYPE "public"."po_status" USING ("po_status"::text)::"public"."po_status";
        ALTER TABLE "public"."purchase_orders" ALTER COLUMN "po_status" SET DEFAULT 'open';
      END IF;

      -- purchase_orders.payment_status
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'payment_status') THEN
        ALTER TABLE "public"."purchase_orders" ALTER COLUMN "payment_status" DROP DEFAULT;
        ALTER TABLE "public"."purchase_orders" ALTER COLUMN "payment_status" TYPE "public"."po_payment_status" USING ("payment_status"::text)::"public"."po_payment_status";
        ALTER TABLE "public"."purchase_orders" ALTER COLUMN "payment_status" SET DEFAULT 'unpaid';
      END IF;

      -- grns.status
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'grns' AND column_name = 'status') THEN
        ALTER TABLE "public"."grns" ALTER COLUMN "status" DROP DEFAULT;
        ALTER TABLE "public"."grns" ALTER COLUMN "status" TYPE "public"."grn_status" USING ("status"::text)::"public"."grn_status";
        ALTER TABLE "public"."grns" ALTER COLUMN "status" SET DEFAULT 'draft';
      END IF;
    END $$;`,

    // 4. Drop defaults & cast columns in inventory schema
    `DO $$ BEGIN
      -- purchase_invoice_payments.payment_mode
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory' AND table_name = 'purchase_invoice_payments' AND column_name = 'payment_mode') THEN
        ALTER TABLE "inventory"."purchase_invoice_payments" ALTER COLUMN "payment_mode" DROP DEFAULT;
        ALTER TABLE "inventory"."purchase_invoice_payments" ALTER COLUMN "payment_mode" TYPE "public"."payment_mode" USING ("payment_mode"::text)::"public"."payment_mode";
      END IF;

      -- stock_adjustment_items.type
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory' AND table_name = 'stock_adjustment_items' AND column_name = 'type') THEN
        ALTER TABLE "inventory"."stock_adjustment_items" ALTER COLUMN "type" DROP DEFAULT;
        ALTER TABLE "inventory"."stock_adjustment_items" ALTER COLUMN "type" TYPE "inventory"."adjustment_type" USING ("type"::text)::"inventory"."adjustment_type";
      END IF;

      -- stock_adjustments.status
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory' AND table_name = 'stock_adjustments' AND column_name = 'status') THEN
        ALTER TABLE "inventory"."stock_adjustments" ALTER COLUMN "status" DROP DEFAULT;
        ALTER TABLE "inventory"."stock_adjustments" ALTER COLUMN "status" TYPE "inventory"."adjustment_status" USING ("status"::text)::"inventory"."adjustment_status";
        ALTER TABLE "inventory"."stock_adjustments" ALTER COLUMN "status" SET DEFAULT 'draft';
      END IF;

      -- stock_transfers.status
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory' AND table_name = 'stock_transfers' AND column_name = 'status') THEN
        ALTER TABLE "inventory"."stock_transfers" ALTER COLUMN "status" DROP DEFAULT;
        ALTER TABLE "inventory"."stock_transfers" ALTER COLUMN "status" TYPE "inventory"."transfer_status" USING ("status"::text)::"inventory"."transfer_status";
        ALTER TABLE "inventory"."stock_transfers" ALTER COLUMN "status" SET DEFAULT 'draft';
      END IF;

      -- stock_requisitions.status
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory' AND table_name = 'stock_requisitions' AND column_name = 'status') THEN
        ALTER TABLE "inventory"."stock_requisitions" ALTER COLUMN "status" DROP DEFAULT;
        ALTER TABLE "inventory"."stock_requisitions" ALTER COLUMN "status" TYPE "inventory"."requisition_status" USING ("status"::text)::"inventory"."requisition_status";
        ALTER TABLE "inventory"."stock_requisitions" ALTER COLUMN "status" SET DEFAULT 'draft';
      END IF;

      -- stock_requisitions.priority
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory' AND table_name = 'stock_requisitions' AND column_name = 'priority') THEN
        ALTER TABLE "inventory"."stock_requisitions" ALTER COLUMN "priority" DROP DEFAULT;
        ALTER TABLE "inventory"."stock_requisitions" ALTER COLUMN "priority" TYPE "inventory"."requisition_priority" USING ("priority"::text)::"inventory"."requisition_priority";
        ALTER TABLE "inventory"."stock_requisitions" ALTER COLUMN "priority" SET DEFAULT 'normal';
      END IF;

      -- sales_invoices.payment_mode
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory' AND table_name = 'sales_invoices' AND column_name = 'payment_mode') THEN
        ALTER TABLE "inventory"."sales_invoices" ALTER COLUMN "payment_mode" DROP DEFAULT;
        ALTER TABLE "inventory"."sales_invoices" ALTER COLUMN "payment_mode" TYPE "inventory"."invoice_payment_mode" USING ("payment_mode"::text)::"inventory"."invoice_payment_mode";
        ALTER TABLE "inventory"."sales_invoices" ALTER COLUMN "payment_mode" SET DEFAULT 'cash';
      END IF;

      -- sales_invoices.status
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory' AND table_name = 'sales_invoices' AND column_name = 'status') THEN
        ALTER TABLE "inventory"."sales_invoices" ALTER COLUMN "status" DROP DEFAULT;
        ALTER TABLE "inventory"."sales_invoices" ALTER COLUMN "status" TYPE "inventory"."invoice_status" USING ("status"::text)::"inventory"."invoice_status";
        ALTER TABLE "inventory"."sales_invoices" ALTER COLUMN "status" SET DEFAULT 'completed';
      END IF;

      -- sales_returns.refund_mode
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory' AND table_name = 'sales_returns' AND column_name = 'refund_mode') THEN
        ALTER TABLE "inventory"."sales_returns" ALTER COLUMN "refund_mode" DROP DEFAULT;
        ALTER TABLE "inventory"."sales_returns" ALTER COLUMN "refund_mode" TYPE "inventory"."refund_mode" USING ("refund_mode"::text)::"inventory"."refund_mode";
        ALTER TABLE "inventory"."sales_returns" ALTER COLUMN "refund_mode" SET DEFAULT 'cash';
      END IF;

      -- purchase_invoices.status
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory' AND table_name = 'purchase_invoices' AND column_name = 'status') THEN
        ALTER TABLE "inventory"."purchase_invoices" ALTER COLUMN "status" DROP DEFAULT;
        ALTER TABLE "inventory"."purchase_invoices" ALTER COLUMN "status" TYPE "inventory"."purchase_invoice_status" USING ("status"::text)::"inventory"."purchase_invoice_status";
        ALTER TABLE "inventory"."purchase_invoices" ALTER COLUMN "status" SET DEFAULT 'draft';
      END IF;
    END $$;`
  ];

  for (const q of queries) {
    await pool.query(q);
  }

  console.log("Successfully fixed all enum defaults and column types across public & inventory schemas.");
  await pool.end();
}

fixEnumDefaults()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  });
