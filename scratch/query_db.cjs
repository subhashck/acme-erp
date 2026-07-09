const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    const resCategories = await client.query('SELECT * FROM service_categories;');
    console.log('Categories:', resCategories.rows);
    const resCatalog = await client.query('SELECT DISTINCT department FROM service_catalog;');
    console.log('Departments in Catalog:', resCatalog.rows.map(r => r.department));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
