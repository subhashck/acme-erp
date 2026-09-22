import { pool } from "../server/db/client.ts";

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("Checking and migrating bank_account_name columns...");

    // 1. Add bank_account_name to staff_salaries
    await client.query(`
      ALTER TABLE staff_salaries 
      ADD COLUMN IF NOT EXISTS bank_account_name text;
    `);
    console.log("staff_salaries.bank_account_name ready.");

    // 2. Add bank_account_name to payslips
    await client.query(`
      ALTER TABLE payslips 
      ADD COLUMN IF NOT EXISTS bank_account_name text;
    `);
    console.log("payslips.bank_account_name ready.");

    // 3. Backfill staff_salaries bank_account_name with staff.name if null
    const resStaff = await client.query(`
      UPDATE staff_salaries ss
      SET bank_account_name = s.name
      FROM staff s
      WHERE ss.staff_id = s.staff_id 
        AND ss.staff_version = s.version 
        AND (ss.bank_account_name IS NULL OR ss.bank_account_name = '');
    `);
    console.log(`Backfilled ${resStaff.rowCount} rows in staff_salaries with staff.name.`);

    // 4. Backfill payslips bank_account_name with staff.name if null
    const resPayslips = await client.query(`
      UPDATE payslips p
      SET bank_account_name = s.name
      FROM staff s
      WHERE p.staff_id = s.staff_id 
        AND (p.bank_account_name IS NULL OR p.bank_account_name = '');
    `);
    console.log(`Backfilled ${resPayslips.rowCount} rows in payslips with staff.name.`);

    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(() => process.exit(1));
