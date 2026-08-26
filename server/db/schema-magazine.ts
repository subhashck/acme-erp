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
}));

export const magazineSectionsRelations = relations(magazineSections, ({ one }) => ({
  issue: one(magazineIssues, {
    fields: [magazineSections.issueId],
    references: [magazineIssues.id],
  }),
}));
