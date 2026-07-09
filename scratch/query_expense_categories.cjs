const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    const resCategories = await client.query('SELECT * FROM service_categories;');
    console.log('Service Categories:', resCategories.rows);
    const resExpenseCategories = await client.query('SELECT * FROM expense_categories;');
    console.log('Expense Categories:', resExpenseCategories.rows);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
