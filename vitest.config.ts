import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@server": path.resolve(__dirname, "./server"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    reporters: ["verbose"],
    passWithNoTests: true,
    testTimeout: 30_000,
  },
});
