import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.ts";

if (!process.env.DATABASE_URL) {
  try {
    // @ts-ignore
    process.loadEnvFile();
  } catch (e) {
    // Ignore if .env doesn't exist
  }
}

export const databaseUrl = process.env.DATABASE_URL!;

export const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Short timeout to fail-fast and retry
});

export const db = drizzle(pool, { schema });
