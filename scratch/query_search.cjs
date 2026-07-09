const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    // List all tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    
    for (const table of tables) {
      const colsRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1;
      `, [table]);
      
      const textCols = colsRes.rows
        .filter(c => ['text', 'character varying', 'varchar'].includes(c.data_type))
        .map(c => c.column_name);
        
      if (textCols.length === 0) continue;
      
      const queryStr = `
        SELECT * FROM "${table}" 
        WHERE ${textCols.map(c => `LOWER("${c}") LIKE '%acon%' OR LOWER("${c}") LIKE '%sir%' OR LOWER("${c}") LIKE '%mam%'`).join(' OR ')};
      `;
      
      try {
        const searchRes = await client.query(queryStr);
        if (searchRes.rows.length > 0) {
          console.log(`Table "${table}" has matches:`, searchRes.rows);
        }
      } catch (e) {
        // ignore errors on columns
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
