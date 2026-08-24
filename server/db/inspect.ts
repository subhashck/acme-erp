import { db, pool } from "./client.ts";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const res = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'items'`);
    console.log("items columns:", res.rows.map((r: any) => r.column_name));
    
    const itemRows = await db.execute(sql`SELECT id, name, unit, purchase_unit, sale_unit FROM items LIMIT 10`);
    console.log("Sample items:", itemRows.rows);

    const units = await db.execute(sql`SELECT * FROM unit_types`);
    console.log("unit_types rows:", units.rows);

    const poItemUnits = await db.execute(sql`SELECT DISTINCT unit FROM po_items`);
    console.log("distinct po_items units:", poItemUnits.rows);

    const grnItemUnits = await db.execute(sql`SELECT DISTINCT unit FROM grn_items`);
    console.log("distinct grn_items units:", grnItemUnits.rows);

    const inventoryTables = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'inventory'`);
    console.log("inventory tables:", inventoryTables.rows);
  } catch (err) {
    console.error("Error inspecting db:", err);
  } finally {
    await pool.end();
  }
}

main();
