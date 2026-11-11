import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config.ts";

export default mergeConfig(baseConfig, defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["./tests/setup/test-env.ts"],
    globalSetup: ["./tests/setup/global-setup.ts"],
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:testpassword@127.0.0.1:5433/acme_erp_test?sslmode=disable",
      BETTER_AUTH_SECRET: "ee3e644fc63c3c50d5a15b3ff79057725f35f43698a91f194b34f7ccbff289cd",
      BETTER_AUTH_URL: "http://localhost:8787",
      ADMIN_EMAIL: "admin@acmehospital.health",
      ADMIN_PASSWORD: "AdminAdmin@12345",
    },
  },
}));
