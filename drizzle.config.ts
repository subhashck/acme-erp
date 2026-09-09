import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["./server/db/schema.ts", "./server/db/schema-inventory.ts", "./server/db/schema-magazine.ts", "./server/db/schema-lab.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public", "inventory", "magazine", "lab"],
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
});
