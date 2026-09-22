# 1. Migrate existing data (run while old DB schema is still in place)
tsx server/db/migrate-roster-to-per-day.ts

# 2. Sync Drizzle schema metadata (no-op since migration already altered the table)
pnpm db:push
