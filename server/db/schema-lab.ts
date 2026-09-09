import { relations } from "drizzle-orm";
import {
  integer,
  text,
  boolean,
  timestamp,
  serial,
  numeric,
  pgSchema,
} from "drizzle-orm/pg-core";
import { patients } from "./schema.ts";

export const labSchema = pgSchema("lab");

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
};

// Enums
export const labOrderStatusEnum = labSchema.enum("lab_order_status", [
  "Ordered",
  "Collected",
  "InProgress",
  "Completed",
  "Cancelled",
]);

export const labPriorityEnum = labSchema.enum("lab_priority", [
  "Routine",
  "Urgent",
  "STAT",
]);

export const labResultFlagEnum = labSchema.enum("lab_result_flag", [
  "Normal",
  "High",
  "Low",
  "Critical",
]);

export const labResultStatusEnum = labSchema.enum("lab_result_status", [
  "Draft",
  "Verified",
  "Released",
]);

// 1. Lab Test Categories
export const labTestCategories = labSchema.table("lab_test_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// 2. Lab Tests Master
export const labTests = labSchema.table("lab_tests", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => labTestCategories.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  specimenType: text("specimen_type").notNull().default("Whole Blood"),
  unit: text("unit"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  turnaroundHours: integer("turnaround_hours").notNull().default(24),
  method: text("method"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// 3. Lab Test Reference Ranges
export const labTestReferenceRanges = labSchema.table("lab_test_reference_ranges", {
  id: serial("id").primaryKey(),
  testId: integer("test_id")
    .notNull()
    .references(() => labTests.id, { onDelete: "cascade" }),
  gender: text("gender").notNull().default("Both"), // 'Male', 'Female', 'Both'
  ageMin: integer("age_min").notNull().default(0), // in years
  ageMax: integer("age_max").notNull().default(120), // in years
  lowValue: numeric("low_value", { precision: 12, scale: 4 }),
  highValue: numeric("high_value", { precision: 12, scale: 4 }),
  criticalLow: numeric("critical_low", { precision: 12, scale: 4 }),
  criticalHigh: numeric("critical_high", { precision: 12, scale: 4 }),
  textRange: text("text_range"), // for qualitative e.g. "Negative", "Non-Reactive"
  remarks: text("remarks"),
  ...timestamps,
});

// 4. Lab Panels / Profiles (e.g. CBC, LFT, KFT, Lipid Profile)
export const labPanels = labSchema.table("lab_panels", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// 5. Lab Panel Tests (Join Table)
export const labPanelTests = labSchema.table("lab_panel_tests", {
  id: serial("id").primaryKey(),
  panelId: integer("panel_id")
    .notNull()
    .references(() => labPanels.id, { onDelete: "cascade" }),
  testId: integer("test_id")
    .notNull()
    .references(() => labTests.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
});

// 6. Lab Orders
export const labOrders = labSchema.table("lab_orders", {
  id: serial("id").primaryKey(),
  orderNo: text("order_no").notNull().unique(),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id),
  patientAge: integer("patient_age").notNull(),
  patientGender: text("patient_gender").notNull(),
  orderedByStaffId: integer("ordered_by_staff_id"), // stable staffId, no FK
  orderedAt: timestamp("ordered_at").notNull().defaultNow(),
  status: labOrderStatusEnum("status").notNull().default("Ordered"),
  priority: labPriorityEnum("priority").notNull().default("Routine"),
  clinicalNotes: text("clinical_notes"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  ...timestamps,
});

// 7. Lab Order Items (Individual tests or panels ordered)
export const labOrderItems = labSchema.table("lab_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => labOrders.id, { onDelete: "cascade" }),
  testId: integer("test_id").references(() => labTests.id, { onDelete: "set null" }),
  panelId: integer("panel_id").references(() => labPanels.id, { onDelete: "set null" }),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("Pending"), // 'Pending', 'Collected', 'Completed', 'Cancelled'
  notes: text("notes"),
  ...timestamps,
});

// 8. Lab Samples (Specimen tracking per order)
export const labSamples = labSchema.table("lab_samples", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => labOrders.id, { onDelete: "cascade" }),
  accessionNo: text("accession_no").notNull().unique(),
  specimenType: text("specimen_type").notNull(),
  collectedAt: timestamp("collected_at"),
  collectedByStaffId: integer("collected_by_staff_id"),
  receivedAt: timestamp("received_at"),
  receivedByStaffId: integer("received_by_staff_id"),
  rejected: boolean("rejected").notNull().default(false),
  rejectionReason: text("rejection_reason"),
  ...timestamps,
});

// 9. Lab Results (Values per order item test)
export const labResults = labSchema.table("lab_results", {
  id: serial("id").primaryKey(),
  orderItemId: integer("order_item_id")
    .notNull()
    .references(() => labOrderItems.id, { onDelete: "cascade" }),
  testId: integer("test_id")
    .notNull()
    .references(() => labTests.id),
  value: text("value"), // string representation: numeric or qualitative
  unit: text("unit"),
  flag: labResultFlagEnum("flag").default("Normal"),
  enteredByStaffId: integer("entered_by_staff_id"),
  enteredAt: timestamp("entered_at"),
  verifiedByStaffId: integer("verified_by_staff_id"),
  verifiedAt: timestamp("verified_at"),
  status: labResultStatusEnum("status").notNull().default("Draft"),
  notes: text("notes"),
  ...timestamps,
});

// 10. Lab Result Audit (Regulatory change trail)
export const labResultAudit = labSchema.table("lab_result_audit", {
  id: serial("id").primaryKey(),
  resultId: integer("result_id")
    .notNull()
    .references(() => labResults.id, { onDelete: "cascade" }),
  changedByStaffId: integer("changed_by_staff_id"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  oldFlag: text("old_flag"),
  newFlag: text("new_flag"),
  reason: text("reason"),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

// Relations
export const labTestCategoriesRelations = relations(labTestCategories, ({ many }) => ({
  tests: many(labTests),
}));

export const labTestsRelations = relations(labTests, ({ one, many }) => ({
  category: one(labTestCategories, {
    fields: [labTests.categoryId],
    references: [labTestCategories.id],
  }),
  referenceRanges: many(labTestReferenceRanges),
  panelTests: many(labPanelTests),
  orderItems: many(labOrderItems),
  results: many(labResults),
}));

export const labTestReferenceRangesRelations = relations(labTestReferenceRanges, ({ one }) => ({
  test: one(labTests, {
    fields: [labTestReferenceRanges.testId],
    references: [labTests.id],
  }),
}));

export const labPanelsRelations = relations(labPanels, ({ many }) => ({
  panelTests: many(labPanelTests),
  orderItems: many(labOrderItems),
}));

export const labPanelTestsRelations = relations(labPanelTests, ({ one }) => ({
  panel: one(labPanels, {
    fields: [labPanelTests.panelId],
    references: [labPanels.id],
  }),
  test: one(labTests, {
    fields: [labPanelTests.testId],
    references: [labTests.id],
  }),
}));

export const labOrdersRelations = relations(labOrders, ({ one, many }) => ({
  patient: one(patients, {
    fields: [labOrders.patientId],
    references: [patients.id],
  }),
  items: many(labOrderItems),
  samples: many(labSamples),
}));

export const labOrderItemsRelations = relations(labOrderItems, ({ one, many }) => ({
  order: one(labOrders, {
    fields: [labOrderItems.orderId],
    references: [labOrders.id],
  }),
  test: one(labTests, {
    fields: [labOrderItems.testId],
    references: [labTests.id],
  }),
  panel: one(labPanels, {
    fields: [labOrderItems.panelId],
    references: [labPanels.id],
  }),
  results: many(labResults),
}));

export const labSamplesRelations = relations(labSamples, ({ one }) => ({
  order: one(labOrders, {
    fields: [labSamples.orderId],
    references: [labOrders.id],
  }),
}));

export const labResultsRelations = relations(labResults, ({ one, many }) => ({
  orderItem: one(labOrderItems, {
    fields: [labResults.orderItemId],
    references: [labOrderItems.id],
  }),
  test: one(labTests, {
    fields: [labResults.testId],
    references: [labTests.id],
  }),
  audits: many(labResultAudit),
}));

export const labResultAuditRelations = relations(labResultAudit, ({ one }) => ({
  result: one(labResults, {
    fields: [labResultAudit.resultId],
    references: [labResults.id],
  }),
}));
