/**
 * Test Environment Setup
 *
 * Runs inside each Vitest test worker thread BEFORE any tests or server imports execute.
 * Ensures that DATABASE_URL points to the ephemeral test DB on port 5433.
 */
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envTestPath = path.resolve(__dirname, "../../.env.test");

process.env.NODE_ENV = "test";

if (fs.existsSync(envTestPath)) {
  const content = fs.readFileSync(envTestPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    process.env[key] = value;
  }
}
