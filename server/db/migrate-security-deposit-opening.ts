import { pool } from "./client.ts";

// Additive migration: never infer or backfill money from employment dates.
try {
  await pool.query(`ALTER TABLE staff_salaries ADD COLUMN IF NOT EXISTS security_deposit_opening_balance numeric(12,2) NOT NULL DEFAULT 0`);
  await pool.query(`CREATE TABLE IF NOT EXISTS security_deposit_rule_changes (
    id serial PRIMARY KEY, staff_id integer NOT NULL,
    previous_rules jsonb NOT NULL, new_rules jsonb NOT NULL,
    processed_by text REFERENCES "user"(id) ON DELETE SET NULL,
    created_at timestamp NOT NULL DEFAULT now()
  )`);
  console.log("Security deposit opening balance and rule audit are ready.");
} finally {
  await pool.end();
}
