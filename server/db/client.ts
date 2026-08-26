import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.ts";
import * as inventorySchema from "./schema-inventory.ts";
import * as magazineSchema from "./schema-magazine.ts";

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.DATABASE_URL) {
  const envTest = path.resolve(process.cwd(), ".env.test");
  const candidates = process.env.NODE_ENV === "test" && fs.existsSync(envTest)
    ? [envTest]
    : [
        path.resolve(process.cwd(), ".env"),
        path.resolve(__dirname, "../../.env"),
        path.resolve(__dirname, "../.env"),
        path.resolve(__dirname, ".env"),
      ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      try {
        // @ts-ignore
        process.loadEnvFile(envPath);
        if (process.env.DATABASE_URL) break;
      } catch (e) {
        // Ignore
      }
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error("⚠️ DATABASE_URL environment variable is not defined.");
}

export const databaseUrl = process.env.DATABASE_URL!;

export const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Short timeout to fail-fast and retry
});

const fullSchema = { ...schema, ...inventorySchema, ...magazineSchema };

export const db = drizzle(pool, { schema: fullSchema });
