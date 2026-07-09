const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    const reports = await client.query('SELECT * FROM daily_closing_reports ORDER BY report_date DESC LIMIT 1;');
    if (reports.rows.length === 0) {
      console.log('No reports found');
      return;
    }
    const report = reports.rows[0];
    console.log('Latest Report:', report);
    
    const channels = await client.query('SELECT * FROM daily_payment_channels WHERE report_id = $1;', [report.id]);
    console.log('Payment Channels for Report:', channels.rows);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
