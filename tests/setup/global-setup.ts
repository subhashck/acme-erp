/**
 * Vitest Global Setup — Integration Tests
 *
 * Runs once before the entire integration test suite:
 * 1. Loads .env.test
 * 2. Starts the ephemeral test Postgres container (docker-compose.test.yml)
 * 3. Restores the full database snapshot (schema + master + seed data) into the test DB
 */
import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const snapshotPath = path.resolve(rootDir, "tests/fixtures/dev-db-snapshot.sql");

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export async function setup() {
  console.log("\n🧪 [Global Setup] Initializing test database with full data snapshot...\n");

  // 1. Load .env.test
  loadEnvFile(path.resolve(rootDir, ".env.test"));

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set. Ensure .env.test exists with the test DB connection string.");
  }

  // 2. Start the test DB container (idempotent — does nothing if already running)
  console.log("🐳 Starting test database container...");
  try {
    execSync("docker compose -f docker-compose.test.yml up -d --wait", {
      cwd: rootDir,
      stdio: "pipe",
      timeout: 60_000,
    });
  } catch (err: any) {
    console.error("⚠️  Could not start test DB container. Assuming it is already running.");
  }

  // 3. Wait for Postgres to be ready (retry loop)
  console.log("⏳ Waiting for test Postgres to accept connections...");
  const maxRetries = 20;
  for (let i = 0; i < maxRetries; i++) {
    try {
      execSync(`docker exec acme-erp-test-db pg_isready -U postgres -d acme_erp_test`, {
        stdio: "pipe",
        timeout: 5_000,
      });
      console.log("✅ Test Postgres is ready.\n");
      break;
    } catch {
      if (i === maxRetries - 1) {
        throw new Error("Test Postgres did not become ready within timeout.");
      }
      await new Promise((r) => setTimeout(r, 1_000));
    }
  }

  // 4. Restore DB Snapshot (Copy of Dev DB with all required seed/master/user data)
  if (fs.existsSync(snapshotPath)) {
    console.log("📥 Restoring database snapshot into test database...");
    try {
      execSync(
        `docker exec -i acme-erp-test-db psql -U postgres -d acme_erp_test`,
        {
          input: fs.readFileSync(snapshotPath),
          stdio: ["pipe", "pipe", "pipe"],
          timeout: 60_000,
        }
      );
      console.log("✅ Database snapshot restored successfully with full test data.\n");

      // Sync latest Drizzle schema definitions and custom setup DDL on top of the restored snapshot
      console.log("📦 Syncing Drizzle schema and module setups on restored database...");
      try {
        const migrationSql = `
          ALTER TABLE inventory.sales_invoice_items ADD COLUMN IF NOT EXISTS unit_id integer;
          ALTER TABLE inventory.sales_invoice_items ALTER COLUMN unit DROP NOT NULL;
          ALTER TABLE inventory.stock_transfer_items ADD COLUMN IF NOT EXISTS unit_id integer;
          ALTER TABLE inventory.stock_transfer_items ALTER COLUMN unit DROP NOT NULL;
          ALTER TABLE inventory.sales_return_items ADD COLUMN IF NOT EXISTS unit_id integer;
        `;
        execSync(
          `docker exec -i acme-erp-test-db psql -U postgres -d acme_erp_test -c "${migrationSql}"`,
          { stdio: "pipe", timeout: 15_000 }
        );
      } catch (colErr: any) {
        console.warn("Column migration notice:", colErr.stderr?.toString() || colErr.message);
      }

      try {
        execSync("npx tsx server/db/setup-inventory-db.ts", {
          cwd: rootDir,
          stdio: "pipe",
          timeout: 30_000,
          env: { ...process.env, DATABASE_URL: dbUrl },
        });
        execSync("npx tsx server/db/setup-magazine-db.ts", {
          cwd: rootDir,
          stdio: "pipe",
          timeout: 30_000,
          env: { ...process.env, DATABASE_URL: dbUrl },
        });
      } catch (setupErr: any) {
        console.warn("Module DB setup notice:", setupErr.stderr?.toString() || setupErr.message);
      }

      execSync("npx drizzle-kit push --force", {
        cwd: rootDir,
        stdio: "pipe",
        timeout: 30_000,
        env: { ...process.env, DATABASE_URL: dbUrl },
      });
      console.log("✅ Schema synced successfully.\n");
    } catch (err: any) {
      console.warn("⚠️  Snapshot restore warning:", err.stderr?.toString() || err.message);
      // Fallback: push schema if restore had schema issues
      execSync("npx drizzle-kit push --force", {
        cwd: rootDir,
        stdio: "pipe",
        timeout: 30_000,
        env: { ...process.env, DATABASE_URL: dbUrl },
      });
    }
  } else {
    console.log("📦 No snapshot found. Pushing Drizzle schema to test database...");
    execSync("npx drizzle-kit push --force", {
      cwd: rootDir,
      stdio: "pipe",
      timeout: 30_000,
      env: { ...process.env, DATABASE_URL: dbUrl },
    });
    console.log("✅ Schema pushed successfully.\n");
  }
}

export async function teardown() {
  console.log("\n🧹 [Global Teardown] Stopping test database container...");
  try {
    execSync("docker compose -f docker-compose.test.yml down -v", {
      cwd: rootDir,
      stdio: "pipe",
      timeout: 30_000,
    });
    console.log("✅ Test database container stopped and volumes removed.\n");
  } catch {
    console.warn("⚠️  Could not stop test DB container. You may need to run: docker compose -f docker-compose.test.yml down -v");
  }
}
