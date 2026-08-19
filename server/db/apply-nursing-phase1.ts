import { pool } from "./client.ts";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Applying Nursing College Phase 1 migration DDL...");
  const sql = fs.readFileSync(path.join(process.cwd(), "drizzle", "0015_nursing_college_phase1.sql"), "utf-8");
  try {
    await pool.query(sql);
    console.log("Migration applied successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await pool.end();
  }
}

main();
