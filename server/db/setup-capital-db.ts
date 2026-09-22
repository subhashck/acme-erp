import { pool } from "./client.ts";

export async function createCapitalSchemaAndTables() {
  console.log("Setting up and verifying PostgreSQL 'capital' schema and tables...");

  const ddl = `
    CREATE SCHEMA IF NOT EXISTS "capital";

    -- 1. Borrowing Facilities & Liabilities Master
    CREATE TABLE IF NOT EXISTS "capital"."facilities" (
      "id" SERIAL PRIMARY KEY,
      "facility_code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "lender_name" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "facility_type" TEXT DEFAULT 'Term Loan',
      "sanctioned_amount" NUMERIC(15, 2) NOT NULL,
      "disbursed_amount" NUMERIC(15, 2) NOT NULL,
      "interest_rate" NUMERIC(6, 2) NOT NULL DEFAULT 0,
      "interest_type" TEXT NOT NULL DEFAULT 'reducing',
      "tenor_months" NUMERIC(6, 2) DEFAULT 0,
      "repayment_frequency" TEXT NOT NULL DEFAULT 'monthly',
      "installment_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
      "outstanding_balance" NUMERIC(15, 2) NOT NULL,
      "total_principal_paid" NUMERIC(15, 2) NOT NULL DEFAULT 0,
      "total_interest_paid" NUMERIC(15, 2) NOT NULL DEFAULT 0,
      "total_charges_paid" NUMERIC(15, 2) NOT NULL DEFAULT 0,
      "sanction_date" DATE,
      "disbursement_date" DATE,
      "maturity_date" DATE,
      "moratorium_months" NUMERIC(5, 2) DEFAULT 0,
      "moratorium_type" TEXT NOT NULL DEFAULT 'none',
      "repayment_start_date" DATE,
      "bank_account_id" INTEGER,
      "collateral_security" TEXT,
      "status" TEXT NOT NULL DEFAULT 'active',
      "notes" TEXT,
      "metadata" JSONB,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS "idx_capital_facilities_category" ON "capital"."facilities" ("category");
    CREATE INDEX IF NOT EXISTS "idx_capital_facilities_status" ON "capital"."facilities" ("status");
    CREATE INDEX IF NOT EXISTS "idx_capital_facilities_frequency" ON "capital"."facilities" ("repayment_frequency");

    -- Add moratorium columns if table already exists
    ALTER TABLE "capital"."facilities" ADD COLUMN IF NOT EXISTS "moratorium_months" NUMERIC(5, 2) DEFAULT 0;
    ALTER TABLE "capital"."facilities" ADD COLUMN IF NOT EXISTS "moratorium_type" TEXT NOT NULL DEFAULT 'none';
    ALTER TABLE "capital"."facilities" ADD COLUMN IF NOT EXISTS "repayment_start_date" DATE;

    -- 2. Debt Repayment Ledger
    CREATE TABLE IF NOT EXISTS "capital"."repayments" (
      "id" SERIAL PRIMARY KEY,
      "payment_code" TEXT NOT NULL UNIQUE,
      "facility_id" INTEGER NOT NULL REFERENCES "capital"."facilities"("id") ON DELETE CASCADE,
      "payment_date" DATE NOT NULL,
      "payment_type" TEXT NOT NULL DEFAULT 'emi',
      "principal_paid" NUMERIC(15, 2) NOT NULL DEFAULT 0,
      "interest_paid" NUMERIC(15, 2) NOT NULL DEFAULT 0,
      "charges_paid" NUMERIC(15, 2) NOT NULL DEFAULT 0,
      "total_amount" NUMERIC(15, 2) NOT NULL,
      "payment_method" TEXT NOT NULL DEFAULT 'daily_collection',
      "bank_account_id" INTEGER,
      "reference_number" TEXT,
      "status" TEXT NOT NULL DEFAULT 'completed',
      "notes" TEXT,
      "created_by" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS "idx_capital_repayments_facility" ON "capital"."repayments" ("facility_id");
    CREATE INDEX IF NOT EXISTS "idx_capital_repayments_date" ON "capital"."repayments" ("payment_date");

    -- 3. Cash Flow & Capital Infusions Ledger
    CREATE TABLE IF NOT EXISTS "capital"."cash_flow_entries" (
      "id" SERIAL PRIMARY KEY,
      "entry_code" TEXT NOT NULL UNIQUE,
      "entry_date" DATE NOT NULL,
      "transaction_type" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "party_name" TEXT,
      "description" TEXT,
      "inflow_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
      "outflow_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
      "net_amount" NUMERIC(15, 2) NOT NULL,
      "bank_account_id" INTEGER,
      "reference_number" TEXT,
      "facility_id" INTEGER REFERENCES "capital"."facilities"("id") ON DELETE SET NULL,
      "repayment_id" INTEGER REFERENCES "capital"."repayments"("id") ON DELETE SET NULL,
      "created_by" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS "idx_capital_cash_flow_date" ON "capital"."cash_flow_entries" ("entry_date");
    CREATE INDEX IF NOT EXISTS "idx_capital_cash_flow_type" ON "capital"."cash_flow_entries" ("transaction_type");
  `;

  await pool.query(ddl);
  console.log("PostgreSQL 'capital' tables successfully created / verified.");

  // Seed sample records from Google Spreadsheet if facilities table is empty
  const countRes = await pool.query('SELECT COUNT(*) FROM "capital"."facilities"');
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    console.log("Seeding initial capital facilities, repayments, and cash flow entries from spreadsheet...");

    // Insert Facilities
    const facilitiesQuery = `
      INSERT INTO "capital"."facilities" (
        "facility_code", "name", "lender_name", "category", "facility_type",
        "sanctioned_amount", "disbursed_amount", "interest_rate", "interest_type",
        "tenor_months", "repayment_frequency", "installment_amount", "outstanding_balance",
        "total_principal_paid", "total_interest_paid", "status", "notes"
      ) VALUES 
      ('2745', 'KEISHAMTHONG/GOLDEN 20K', 'M/S Golden', 'Daily Collection Financing', 'Daily Advance', 2000000, 2000000, 15.00, 'reducing', 3.33, 'daily', 20000, 1930436, 69564, 10436, 'active', 'Daily market collection financing - Keishamthong branch (100 days)'),
      ('2745-B', 'KEISHAMTHONG/GOLDEN 15K', 'M/S Golden', 'Daily Collection Financing', 'Daily Advance', 1500000, 1500000, 15.00, 'reducing', 3.33, 'daily', 15000, 1473914, 26086, 3914, 'active', 'Daily market collection financing - Keishamthong branch 15K tranche (100 days)')
      RETURNING id, name;
    `;
    const facRes = await pool.query(facilitiesQuery);
    const facMap = new Map<string, number>();
    for (const row of facRes.rows) {
      facMap.set(row.name, row.id);
    }

    const g20Id = facMap.get("KEISHAMTHONG/GOLDEN 20K");
    const g15Id = facMap.get("KEISHAMTHONG/GOLDEN 15K");

    // Insert Repayments
    if (g20Id && g15Id) {
      const repaymentsSql = `
        INSERT INTO "capital"."repayments" (
          "payment_code", "facility_id", "payment_date", "payment_type",
          "principal_paid", "interest_paid", "charges_paid", "total_amount",
          "payment_method", "reference_number", "status"
        ) VALUES 
        ('CAP-PAY-2026-0001', ${g20Id}, '2026-08-07', 'daily_collection', 17391, 2609, 0, 20000, 'daily_collection', '20867', 'completed'),
        ('CAP-PAY-2026-0002', ${g20Id}, '2026-08-08', 'daily_collection', 17391, 2609, 0, 20000, 'daily_collection', '20839', 'completed'),
        ('CAP-PAY-2026-0003', ${g20Id}, '2026-08-09', 'daily_collection', 17391, 2609, 0, 20000, 'daily_collection', '20882', 'completed'),
        ('CAP-PAY-2026-0004', ${g20Id}, '2026-08-10', 'daily_collection', 17391, 2609, 0, 20000, 'daily_collection', '22023', 'completed'),
        ('CAP-PAY-2026-0005', ${g15Id}, '2026-08-10', 'daily_collection', 13043, 1957, 0, 15000, 'daily_collection', '22023', 'completed'),
        ('CAP-PAY-2026-0006', ${g15Id}, '2026-09-09', 'daily_collection', 13043, 1957, 0, 15000, 'daily_collection', '20882', 'completed');
      `;
      await pool.query(repaymentsSql);
    }

    // Insert Cash Flow Entries
    const cashFlowSql = `
      INSERT INTO "capital"."cash_flow_entries" (
        "entry_code", "entry_date", "transaction_type", "category",
        "party_name", "description", "inflow_amount", "outflow_amount",
        "net_amount", "reference_number"
      ) VALUES
      ('CF-2026-0001', '2026-08-01', 'capital_infusion', 'Angel Investment', 'Peak Ventures', 'Seed Capital Infusion - Peak Ventures', 5000000, 0, 5000000, 'TXN-CAP-001'),
      ('CF-2026-0002', '2026-08-05', 'operating_income', 'Client Retainer', 'Alpha Corp', 'Enterprise Software Contract - Alpha Corp', 450000, 0, 450000, 'TXN-INC-101'),
      ('CF-2026-0003', '2026-08-07', 'operating_expense', 'Payroll & Wages', 'Internal Staff', 'Monthly Team Salaries', 0, 320000, -320000, 'TXN-EXP-201'),
      ('CF-2026-0004', '2026-08-12', 'operating_income', 'Product Sales', 'Direct B2B Clients', 'SaaS B2B Recurring Subscriptions', 280000, 0, 280000, 'TXN-INC-102'),
      ('CF-2026-0005', '2026-08-15', 'operating_expense', 'Office & Facilities', 'Commercial Lessor', 'Commercial Office Lease Rent', 0, 85000, -85000, 'TXN-EXP-202'),
      ('CF-2026-0006', '2026-08-20', 'operating_expense', 'Cloud & Infra', 'Amazon Web Services', 'AWS Cloud Infrastructure & Tooling', 0, 42000, -42000, 'TXN-EXP-203'),
      ('CF-2026-0007', '2026-08-25', 'capital_infusion', 'Founder Capital', 'Founding Director', 'Founder Growth Capital Infusion', 1000000, 0, 1000000, 'TXN-CAP-002'),
      ('CF-2026-0008', '2026-09-02', 'operating_income', 'Consulting & Services', 'Integration Partners', 'Custom Integration Milestone 1', 375000, 0, 375000, 'TXN-INC-103'),
      ('CF-2026-09-05', '2026-09-05', 'operating_expense', 'Payroll & Wages', 'Internal Staff', 'Monthly Team Salaries', 0, 330000, -330000, 'TXN-EXP-204'),
      ('CF-2026-09-08', '2026-09-08', 'operating_expense', 'Marketing & Growth', 'Growth Agency', 'Digital Ad Campaigns & PR', 0, 65000, -65000, 'TXN-EXP-205');
    `;
    await pool.query(cashFlowSql);

    console.log("Seeding complete: Capital facilities, repayments, and cash flow entries successfully populated!");
  }
}

// Auto-run if executed directly via tsx
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes("setup-capital-db")) {
  createCapitalSchemaAndTables()
    .then(() => {
      console.log("Capital database setup completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Capital database setup failed:", err);
      process.exit(1);
    });
}
