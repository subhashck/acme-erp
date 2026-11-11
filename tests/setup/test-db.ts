/**
 * Test Database Client
 *
 * Provides a Drizzle ORM instance connected to the ephemeral test database.
 * Also exports utility functions for cleaning transactional tables between tests.
 */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "../../server/db/schema.ts";
import * as inventorySchema from "../../server/db/schema-inventory.ts";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvTest() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.resolve(__dirname, "../../.env.test");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvTest();

const testDatabaseUrl = process.env.DATABASE_URL || "postgresql://postgres:testpassword@127.0.0.1:5433/acme_erp_test?sslmode=disable";

export const testPool = new Pool({
  connectionString: testDatabaseUrl,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

const fullSchema = { ...schema, ...inventorySchema };
export const testDb = drizzle(testPool, { schema: fullSchema });

/**
 * Truncates only transactional / volatile tables between test suites,
 * preserving all master, reference, and user accounts from the DB copy.
 */
export async function cleanAllTables() {
  await testDb.execute(sql`
    DO $$
    DECLARE
      tbls TEXT[] := ARRAY[
        'sales_invoice_items', 'sales_invoices', 'sales_return_items', 'sales_returns',
        'store_batch_stock', 'stock_ledger', 'stock_adjustment_items', 'stock_adjustments',
        'store_transfer_items', 'store_transfers', 'store_requisition_items', 'store_requisitions',
        'purchase_invoice_payments', 'purchase_invoice_items', 'purchase_invoices',
        'po_payments', 'grn_items', 'grns', 'po_items', 'purchase_orders',
        'item_batches'
      ];
      r RECORD;
    BEGIN
      SET session_replication_role = 'replica';
      FOR r IN (
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname IN ('public', 'inventory')
        AND tablename = ANY(tbls)
      ) LOOP
        EXECUTE format('TRUNCATE TABLE %I.%I CASCADE', r.schemaname, r.tablename);
      END LOOP;
      SET session_replication_role = 'origin';
    END $$;
  `);
}

export async function closeTestDb() {
  await testPool.end();
}
