import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["./server/db/schema.ts", "./server/db/schema-inventory.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public", "inventory"],
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
});
