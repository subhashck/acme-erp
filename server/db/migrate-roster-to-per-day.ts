/**
 * Roster migration: date-range rows → per-day rows
 *
 * Run this BEFORE `pnpm db:push`.
 *
 * What it does:
 *   1. Reads all existing roster rows (using old start_date / end_date columns via raw SQL).
 *   2. Expands each row into individual per-day rows.
 *   3. Truncates the rosters table.
 *   4. Alters the table: drops start_date + end_date, adds date + unique constraint.
 *   5. Re-inserts the expanded per-day rows.
 */

import { sql } from "drizzle-orm";
import { db } from "./client.ts";

interface OldRosterRow {
  id: number;
  staff_id: number;
  department_id: number;
  shift_id: number;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function expandDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const curr = new Date(startDate + "T00:00:00Z");
  const last = new Date(endDate + "T00:00:00Z");
  while (curr <= last) {
    dates.push(curr.toISOString().slice(0, 10));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

async function migrate() {
  console.log("=== Roster per-day migration ===\n");

  // 1. Check if old columns still exist (idempotency guard)
  const colCheck = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'rosters'
      AND column_name IN ('start_date', 'end_date')
  `);

  const oldColsExist = colCheck.rows.length === 2;
  const newColCheck = await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'rosters' AND column_name = 'date'
  `);
  const newColExists = newColCheck.rows.length > 0;

  if (!oldColsExist && newColExists) {
    console.log("Migration already applied — rosters table already has 'date' column.");
    process.exit(0);
  }

  if (!oldColsExist && !newColExists) {
    throw new Error("Unexpected schema state: neither old nor new columns found.");
  }

  // 2. Read all existing rows
  const { rows: oldRows } = await db.execute(sql`
    SELECT id, staff_id, department_id, shift_id, start_date, end_date, notes, created_at, updated_at
    FROM rosters
    ORDER BY id
  `) as unknown as { rows: OldRosterRow[] };

  console.log(`Found ${oldRows.length} existing roster row(s).`);

  // 3. Expand to per-day rows, deduplicating on (staffId, date)
  const seen = new Set<string>();
  const expanded: Array<{
    staffId: number;
    departmentId: number;
    shiftId: number;
    date: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  }> = [];

  for (const row of oldRows) {
    const dates = expandDateRange(String(row.start_date), String(row.end_date));
    for (const date of dates) {
      const key = `${row.staff_id}-${date}`;
      if (!seen.has(key)) {
        seen.add(key);
        expanded.push({
          staffId: Number(row.staff_id),
          departmentId: Number(row.department_id),
          shiftId: Number(row.shift_id),
          date,
          notes: row.notes,
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        });
      }
    }
  }

  console.log(`Expanded to ${expanded.length} per-day row(s) (${seen.size} unique staff-date pairs).`);

  // 4. Apply schema changes
  try {
    // 4a. Truncate existing rows
    await db.execute(sql`TRUNCATE TABLE rosters`);
    console.log("Truncated rosters table.");

    // 4b. Drop old columns
    await db.execute(sql`ALTER TABLE rosters DROP COLUMN IF EXISTS start_date`);
    await db.execute(sql`ALTER TABLE rosters DROP COLUMN IF EXISTS end_date`);
    console.log("Dropped start_date and end_date columns.");

    // 4c. Add new date column (with temp default so NOT NULL works)
    await db.execute(sql`ALTER TABLE rosters ADD COLUMN IF NOT EXISTS "date" text NOT NULL DEFAULT ''`);
    await db.execute(sql`ALTER TABLE rosters ALTER COLUMN "date" DROP DEFAULT`);
    console.log("Added 'date' column.");

    // 4d. Add unique constraint (idempotent name)
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'rosters_staff_id_date_unique'
        ) THEN
          ALTER TABLE rosters ADD CONSTRAINT rosters_staff_id_date_unique UNIQUE (staff_id, "date");
        END IF;
      END $$
    `);
    console.log("Added unique constraint (staff_id, date).");

    // 4e. Insert per-day rows in batches of 500
    if (expanded.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < expanded.length; i += BATCH_SIZE) {
        const batch = expanded.slice(i, i + BATCH_SIZE);
        const valueParts = batch.map(
          (r) =>
            `(${r.staffId}, ${r.departmentId}, ${r.shiftId}, '${r.date}', ${
              r.notes ? `'${r.notes.replace(/'/g, "''")}'` : "NULL"
            }, '${r.createdAt}', '${r.updatedAt}')`
        );

        await db.execute(sql.raw(
          `INSERT INTO rosters (staff_id, department_id, shift_id, "date", notes, created_at, updated_at)
           VALUES ${valueParts.join(",\n")}
           ON CONFLICT (staff_id, "date") DO NOTHING`
        ));
      }
      console.log(`Re-inserted ${expanded.length} per-day row(s).`);
    }

    console.log("\n✅ Migration complete! You can now run `pnpm db:push`.");
  } catch (err) {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
