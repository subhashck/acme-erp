import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema.ts";

export const databaseUrl = process.env.DATABASE_URL ?? "./data/hospital.sqlite";

mkdirSync(dirname(databaseUrl), { recursive: true });

export const sqlite = new Database(databaseUrl);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Automatically ensure the notifications table exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS \`notifications\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT,
    \`user_id\` text NOT NULL REFERENCES \`user\`(\`id\`) ON DELETE CASCADE,
    \`title\` text NOT NULL,
    \`message\` text NOT NULL,
    \`type\` text NOT NULL DEFAULT 'info',
    \`link\` text,
    \`read\` integer NOT NULL DEFAULT 0,
    \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
    \`updated_at\` integer NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS \`messages\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT,
    \`sender_id\` text NOT NULL REFERENCES \`user\`(\`id\`) ON DELETE CASCADE,
    \`receiver_id\` text REFERENCES \`user\`(\`id\`) ON DELETE CASCADE,
    \`channel_type\` text NOT NULL DEFAULT 'organization',
    \`department_id\` integer REFERENCES \`departments\`(\`id\`) ON DELETE CASCADE,
    \`content\` text NOT NULL,
    \`created_at\` integer NOT NULL DEFAULT (unixepoch())
  );
`);

export const db = drizzle(sqlite, { schema });
