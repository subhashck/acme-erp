const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    const reports = await client.query('SELECT * FROM daily_closing_reports ORDER BY report_date DESC;');
    console.log(`Found ${reports.rows.length} reports`);
    for (const report of reports.rows) {
      console.log(`Report ID: ${report.id}, Date: ${report.report_date}, Closing: ${report.closing_balance}`);
      const channels = await client.query('SELECT * FROM daily_payment_channels WHERE report_id = $1 AND (bank = \'CASH\' OR channel = \'CASH\');', [report.id]);
      console.log('  Cash channels:', channels.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
