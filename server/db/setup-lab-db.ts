import { pool } from "./client.ts";

export async function createLabSchemaAndTables() {
  console.log("Setting up and verifying PostgreSQL 'lab' schema and tables...");

  const ddl = `
    CREATE SCHEMA IF NOT EXISTS "lab";

    -- Enums
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_namespace n ON n.oid = t.typnamespace 
        WHERE t.typname = 'lab_order_status' AND n.nspname = 'lab'
      ) THEN
        CREATE TYPE "lab"."lab_order_status" AS ENUM ('Ordered', 'Collected', 'InProgress', 'Completed', 'Cancelled');
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_namespace n ON n.oid = t.typnamespace 
        WHERE t.typname = 'lab_priority' AND n.nspname = 'lab'
      ) THEN
        CREATE TYPE "lab"."lab_priority" AS ENUM ('Routine', 'Urgent', 'STAT');
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_namespace n ON n.oid = t.typnamespace 
        WHERE t.typname = 'lab_result_flag' AND n.nspname = 'lab'
      ) THEN
        CREATE TYPE "lab"."lab_result_flag" AS ENUM ('Normal', 'High', 'Low', 'Critical');
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_namespace n ON n.oid = t.typnamespace 
        WHERE t.typname = 'lab_result_status' AND n.nspname = 'lab'
      ) THEN
        CREATE TYPE "lab"."lab_result_status" AS ENUM ('Draft', 'Verified', 'Released');
      END IF;
    END $$;

    -- 1. Lab Test Categories
    CREATE TABLE IF NOT EXISTS "lab"."lab_test_categories" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "code" TEXT NOT NULL UNIQUE,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 2. Lab Tests
    CREATE TABLE IF NOT EXISTS "lab"."lab_tests" (
      "id" SERIAL PRIMARY KEY,
      "category_id" INTEGER NOT NULL REFERENCES "lab"."lab_test_categories"("id") ON DELETE CASCADE,
      "code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "specimen_type" TEXT NOT NULL DEFAULT 'Whole Blood',
      "unit" TEXT,
      "price" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "turnaround_hours" INTEGER NOT NULL DEFAULT 24,
      "method" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 3. Lab Test Reference Ranges
    CREATE TABLE IF NOT EXISTS "lab"."lab_test_reference_ranges" (
      "id" SERIAL PRIMARY KEY,
      "test_id" INTEGER NOT NULL REFERENCES "lab"."lab_tests"("id") ON DELETE CASCADE,
      "gender" TEXT NOT NULL DEFAULT 'Both',
      "age_min" INTEGER NOT NULL DEFAULT 0,
      "age_max" INTEGER NOT NULL DEFAULT 120,
      "low_value" NUMERIC(12, 4),
      "high_value" NUMERIC(12, 4),
      "critical_low" NUMERIC(12, 4),
      "critical_high" NUMERIC(12, 4),
      "text_range" TEXT,
      "remarks" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 4. Lab Panels
    CREATE TABLE IF NOT EXISTS "lab"."lab_panels" (
      "id" SERIAL PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "price" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 5. Lab Panel Tests
    CREATE TABLE IF NOT EXISTS "lab"."lab_panel_tests" (
      "id" SERIAL PRIMARY KEY,
      "panel_id" INTEGER NOT NULL REFERENCES "lab"."lab_panels"("id") ON DELETE CASCADE,
      "test_id" INTEGER NOT NULL REFERENCES "lab"."lab_tests"("id") ON DELETE CASCADE,
      "sort_order" INTEGER NOT NULL DEFAULT 0
    );

    -- 6. Lab Orders
    CREATE TABLE IF NOT EXISTS "lab"."lab_orders" (
      "id" SERIAL PRIMARY KEY,
      "order_no" TEXT NOT NULL UNIQUE,
      "patient_id" INTEGER NOT NULL REFERENCES "public"."patients"("id"),
      "patient_age" INTEGER NOT NULL,
      "patient_gender" TEXT NOT NULL,
      "ordered_by_staff_id" INTEGER,
      "ordered_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "status" "lab"."lab_order_status" NOT NULL DEFAULT 'Ordered',
      "priority" "lab"."lab_priority" NOT NULL DEFAULT 'Routine',
      "clinical_notes" TEXT,
      "total_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 7. Lab Order Items
    CREATE TABLE IF NOT EXISTS "lab"."lab_order_items" (
      "id" SERIAL PRIMARY KEY,
      "order_id" INTEGER NOT NULL REFERENCES "lab"."lab_orders"("id") ON DELETE CASCADE,
      "test_id" INTEGER REFERENCES "lab"."lab_tests"("id") ON DELETE SET NULL,
      "panel_id" INTEGER REFERENCES "lab"."lab_panels"("id") ON DELETE SET NULL,
      "price" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'Pending',
      "notes" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 8. Lab Samples
    CREATE TABLE IF NOT EXISTS "lab"."lab_samples" (
      "id" SERIAL PRIMARY KEY,
      "order_id" INTEGER NOT NULL REFERENCES "lab"."lab_orders"("id") ON DELETE CASCADE,
      "accession_no" TEXT NOT NULL UNIQUE,
      "specimen_type" TEXT NOT NULL,
      "collected_at" TIMESTAMP,
      "collected_by_staff_id" INTEGER,
      "received_at" TIMESTAMP,
      "received_by_staff_id" INTEGER,
      "rejected" BOOLEAN NOT NULL DEFAULT false,
      "rejection_reason" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 9. Lab Results
    CREATE TABLE IF NOT EXISTS "lab"."lab_results" (
      "id" SERIAL PRIMARY KEY,
      "order_item_id" INTEGER NOT NULL REFERENCES "lab"."lab_order_items"("id") ON DELETE CASCADE,
      "test_id" INTEGER NOT NULL REFERENCES "lab"."lab_tests"("id"),
      "value" TEXT,
      "unit" TEXT,
      "flag" "lab"."lab_result_flag" DEFAULT 'Normal',
      "entered_by_staff_id" INTEGER,
      "entered_at" TIMESTAMP,
      "verified_by_staff_id" INTEGER,
      "verified_at" TIMESTAMP,
      "status" "lab"."lab_result_status" NOT NULL DEFAULT 'Draft',
      "notes" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 10. Lab Result Audit
    CREATE TABLE IF NOT EXISTS "lab"."lab_result_audit" (
      "id" SERIAL PRIMARY KEY,
      "result_id" INTEGER NOT NULL REFERENCES "lab"."lab_results"("id") ON DELETE CASCADE,
      "changed_by_staff_id" INTEGER,
      "old_value" TEXT,
      "newValue" TEXT,
      "old_flag" TEXT,
      "new_flag" TEXT,
      "reason" TEXT,
      "changed_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Indices
    CREATE INDEX IF NOT EXISTS "idx_lab_orders_patient" ON "lab"."lab_orders" ("patient_id");
    CREATE INDEX IF NOT EXISTS "idx_lab_orders_status" ON "lab"."lab_orders" ("status");
    CREATE INDEX IF NOT EXISTS "idx_lab_orders_ordered_at" ON "lab"."lab_orders" ("ordered_at");
    CREATE INDEX IF NOT EXISTS "idx_lab_samples_order" ON "lab"."lab_samples" ("order_id");
    CREATE INDEX IF NOT EXISTS "idx_lab_order_items_order" ON "lab"."lab_order_items" ("order_id");
    CREATE INDEX IF NOT EXISTS "idx_lab_results_item" ON "lab"."lab_results" ("order_item_id");
    CREATE INDEX IF NOT EXISTS "idx_lab_ranges_test" ON "lab"."lab_test_reference_ranges" ("test_id");
  `;

  await pool.query(ddl);
  console.log("PostgreSQL 'lab' schema, enums, and tables verified/created successfully.");
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  createLabSchemaAndTables()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed to setup lab DB:", err);
      process.exit(1);
    });
}
