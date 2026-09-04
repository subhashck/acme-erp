import { relations } from "drizzle-orm";
import {
  integer,
  text,
  boolean,
  timestamp,
  serial,
  jsonb,
  unique,
  index,
  pgSchema,
} from "drizzle-orm/pg-core";
import { user } from "./schema.ts";

export const magazineSchema = pgSchema("magazine");

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
};

// Enums
export const magazineStatusEnum = magazineSchema.enum("magazine_status", [
  "draft",
  "published",
  "archived",
]);

// 1. Magazine Editors Master
export const magazineEditors = magazineSchema.table("magazine_editors", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  addedBy: text("added_by").references(() => user.id),
  active: boolean("active").notNull().default(true),
  ...timestamps,
}, (t) => ({
  unqEditorUser: unique().on(t.userId),
}));

// 2. Magazine Issues
export const magazineIssues = magazineSchema.table("magazine_issues", {
  id: serial("id").primaryKey(),
  issueNo: text("issue_no").notNull().unique(), // e.g. MAG/26-27/00001
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  coverImageUrl: text("cover_image_url"),
  description: text("description"),
  editorialTitle: text("editorial_title").default("From the Editorial Desk"),
  editorialHtml: text("editorial_html"),
  issueMonth: integer("issue_month").notNull(), // 1 - 12
  issueYear: integer("issue_year").notNull(), // e.g. 2026
  status: magazineStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  createdBy: text("created_by").references(() => user.id),
  ...timestamps,
}, (t) => ({
  unqMonthYear: unique().on(t.issueMonth, t.issueYear),
}));

// 3. Magazine Sections
export const magazineSections = magazineSchema.table("magazine_sections", {
  id: serial("id").primaryKey(),
  issueId: integer("issue_id").notNull().references(() => magazineIssues.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  authorName: text("author_name"),
  authorRole: text("author_role"),
  contentJson: jsonb("content_json").notNull().default({}),
  contentHtml: text("content_html").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (t) => ({
  idxIssueSort: index("idx_magazine_sections_issue_sort").on(t.issueId, t.sortOrder),
}));

// 4. Magazine Media Library Assets
export const magazineMedia = magazineSchema.table("magazine_media", {
  id: serial("id").primaryKey(),
  fileHash: text("file_hash").notNull().unique(), // SHA-256 hash for deduplication
  fileName: text("file_name").notNull(), // Stored file name e.g. "med_abc123.webp"
  originalName: text("original_name").notNull(), // User's original file name
  mimeType: text("mime_type").notNull().default("image/webp"),
  fileSize: integer("file_size").notNull(), // Compressed size in bytes
  originalSize: integer("original_size"), // Original size before compression
  width: integer("width"), // Image width
  height: integer("height"), // Image height
  objectKey: text("object_key").notNull(), // MinIO object key
  thumbnailKey: text("thumbnail_key"), // MinIO thumbnail key
  url: text("url").notNull(), // Public URL
  thumbnailUrl: text("thumbnail_url"), // Thumbnail URL
  tags: jsonb("tags").$type<string[]>().notNull().default([]), // Categorical user tags
  issueId: integer("issue_id").references(() => magazineIssues.id, { onDelete: "set null" }),
  uploadedBy: text("uploaded_by").references(() => user.id),
  ...timestamps,
}, (t) => ({
  idxMediaHash: index("idx_magazine_media_hash").on(t.fileHash),
  idxMediaIssue: index("idx_magazine_media_issue").on(t.issueId),
  idxMediaCreated: index("idx_magazine_media_created").on(t.createdAt),
}));

// 5. Magazine Issue Media (Many-to-Many Assignment)
export const magazineIssueMedia = magazineSchema.table("magazine_issue_media", {
  id: serial("id").primaryKey(),
  issueId: integer("issue_id").notNull().references(() => magazineIssues.id, { onDelete: "cascade" }),
  mediaId: integer("media_id").notNull().references(() => magazineMedia.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  unqIssueMedia: unique("unq_issue_media").on(t.issueId, t.mediaId),
  idxIssueMediaIssue: index("idx_magazine_issue_media_issue").on(t.issueId),
  idxIssueMediaMedia: index("idx_magazine_issue_media_media").on(t.mediaId),
}));

// Relations
export const magazineEditorsRelations = relations(magazineEditors, ({ one }) => ({
  user: one(user, {
    fields: [magazineEditors.userId],
    references: [user.id],
  }),
  addedByUser: one(user, {
    fields: [magazineEditors.addedBy],
    references: [user.id],
  }),
}));

export const magazineIssuesRelations = relations(magazineIssues, ({ one, many }) => ({
  author: one(user, {
    fields: [magazineIssues.createdBy],
    references: [user.id],
  }),
  sections: many(magazineSections),
  media: many(magazineMedia),
  issueMedia: many(magazineIssueMedia),
}));

export const magazineSectionsRelations = relations(magazineSections, ({ one }) => ({
  issue: one(magazineIssues, {
    fields: [magazineSections.issueId],
    references: [magazineIssues.id],
  }),
}));

export const magazineMediaRelations = relations(magazineMedia, ({ one, many }) => ({
  issue: one(magazineIssues, {
    fields: [magazineMedia.issueId],
    references: [magazineIssues.id],
  }),
  issueMedia: many(magazineIssueMedia),
  uploader: one(user, {
    fields: [magazineMedia.uploadedBy],
    references: [user.id],
  }),
}));

export const magazineIssueMediaRelations = relations(magazineIssueMedia, ({ one }) => ({
  issue: one(magazineIssues, {
    fields: [magazineIssueMedia.issueId],
    references: [magazineIssues.id],
  }),
  media: one(magazineMedia, {
    fields: [magazineIssueMedia.mediaId],
    references: [magazineMedia.id],
  }),
}));


