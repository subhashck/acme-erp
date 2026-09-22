import { pool } from "../server/db/client.ts";

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("Checking monthly_bank_expenses table schema...");
    
    // 1. Check columns
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'monthly_bank_expenses'
    `);
    const cols = new Set(res.rows.map((r: any) => r.column_name));
    console.log("Current columns:", Array.from(cols).join(", "));

    if (cols.has("cheque_issue_date") && !cols.has("value_date")) {
      console.log("Renaming cheque_issue_date to value_date...");
      await client.query(`ALTER TABLE monthly_bank_expenses RENAME COLUMN cheque_issue_date TO value_date;`);
      console.log("Column renamed successfully.");
    } else if (!cols.has("value_date")) {
      console.log("Adding value_date column...");
      await client.query(`ALTER TABLE monthly_bank_expenses ADD COLUMN value_date text;`);
      if (cols.has("cheque_issue_date")) {
        await client.query(`UPDATE monthly_bank_expenses SET value_date = cheque_issue_date WHERE value_date IS NULL;`);
      }
      console.log("Column added successfully.");
    } else {
      console.log("Column value_date already exists.");
    }

    // 2. Make month nullable if it has a not-null constraint
    try {
      await client.query(`ALTER TABLE monthly_bank_expenses ALTER COLUMN month DROP NOT NULL;`);
      console.log("Column month constraint updated to allow null.");
    } catch (e: any) {
      console.log("Note on month constraint:", e.message);
    }

    // 3. For any existing rows where value_date is null but payment_date is set, backfill value_date
    await client.query(`
      UPDATE monthly_bank_expenses 
      SET value_date = payment_date 
      WHERE value_date IS NULL AND payment_date IS NOT NULL;
    `);
    console.log("Backfilled value_date where missing from payment_date.");

    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
