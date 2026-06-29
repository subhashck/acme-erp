import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
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

export const pool = new Pool({ connectionString: databaseUrl });

export const db = drizzle(pool, { schema });
