import { pool } from "../client.ts";

async function run() {
  try {
    const res = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'nursing_applicants';"
    );
    console.log("nursing_applicants columns:", res.rows.map(r => r.column_name));

    const txRes = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'nursing_fee_transactions';"
    );
    console.log("nursing_fee_transactions columns:", txRes.rows.map(r => r.column_name));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
