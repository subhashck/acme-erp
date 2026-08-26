import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["./server/db/schema.ts", "./server/db/schema-inventory.ts", "./server/db/schema-magazine.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public", "inventory", "magazine"],
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
});
