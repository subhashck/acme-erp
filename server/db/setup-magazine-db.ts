import { pool } from "./client.ts";

export async function createMagazineSchemaAndTables() {
  console.log("Setting up and verifying PostgreSQL 'magazine' schema and tables...");

  const ddl = `
    CREATE SCHEMA IF NOT EXISTS "magazine";

    -- Enum
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_namespace n ON n.oid = t.typnamespace 
        WHERE t.typname = 'magazine_status' AND n.nspname = 'magazine'
      ) THEN
        CREATE TYPE "magazine"."magazine_status" AS ENUM ('draft', 'published', 'archived');
      END IF;
    END $$;

    -- 1. Magazine Editors
    CREATE TABLE IF NOT EXISTS "magazine"."magazine_editors" (
      "id" SERIAL PRIMARY KEY,
      "user_id" TEXT NOT NULL REFERENCES "public"."user"("id") ON DELETE CASCADE,
      "added_by" TEXT REFERENCES "public"."user"("id"),
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "unq_editor_user" UNIQUE ("user_id")
    );

    -- 2. Magazine Issues
    CREATE TABLE IF NOT EXISTS "magazine"."magazine_issues" (
      "id" SERIAL PRIMARY KEY,
      "issue_no" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "slug" TEXT NOT NULL UNIQUE,
      "cover_image_url" TEXT,
      "description" TEXT,
      "issue_month" INTEGER NOT NULL,
      "issue_year" INTEGER NOT NULL,
      "status" "magazine"."magazine_status" NOT NULL DEFAULT 'draft',
      "published_at" TIMESTAMP,
      "created_by" TEXT REFERENCES "public"."user"("id"),
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "unq_month_year" UNIQUE ("issue_month", "issue_year")
    );

    -- 3. Magazine Sections
    CREATE TABLE IF NOT EXISTS "magazine"."magazine_sections" (
      "id" SERIAL PRIMARY KEY,
      "issue_id" INTEGER NOT NULL REFERENCES "magazine"."magazine_issues"("id") ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "subtitle" TEXT,
      "author_name" TEXT,
      "author_role" TEXT,
      "content_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "content_html" TEXT NOT NULL DEFAULT '',
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Ensure indices on magazine_sections
    CREATE INDEX IF NOT EXISTS "idx_magazine_sections_issue_sort" 
      ON "magazine"."magazine_sections" ("issue_id", "sort_order");

    -- 4. Magazine Media Assets
    CREATE TABLE IF NOT EXISTS "magazine"."magazine_media" (
      "id" SERIAL PRIMARY KEY,
      "file_hash" TEXT NOT NULL UNIQUE,
      "file_name" TEXT NOT NULL,
      "original_name" TEXT NOT NULL,
      "mime_type" TEXT NOT NULL DEFAULT 'image/webp',
      "file_size" INTEGER NOT NULL,
      "original_size" INTEGER,
      "width" INTEGER,
      "height" INTEGER,
      "object_key" TEXT NOT NULL,
      "thumbnail_key" TEXT,
      "url" TEXT NOT NULL,
      "thumbnail_url" TEXT,
      "tags" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "issue_id" INTEGER REFERENCES "magazine"."magazine_issues"("id") ON DELETE SET NULL,
      "uploaded_by" TEXT REFERENCES "public"."user"("id"),
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    ALTER TABLE "magazine"."magazine_media" ADD COLUMN IF NOT EXISTS "tags" JSONB NOT NULL DEFAULT '[]'::jsonb;

    CREATE INDEX IF NOT EXISTS "idx_magazine_media_hash" ON "magazine"."magazine_media" ("file_hash");
    CREATE INDEX IF NOT EXISTS "idx_magazine_media_issue" ON "magazine"."magazine_media" ("issue_id");
    CREATE INDEX IF NOT EXISTS "idx_magazine_media_created" ON "magazine"."magazine_media" ("created_at");
  `;

  await pool.query(ddl);
  console.log("PostgreSQL 'magazine' schema, enum, and tables verified/created successfully.");
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  createMagazineSchemaAndTables()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed to setup magazine DB:", err);
      process.exit(1);
    });
}
