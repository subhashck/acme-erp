import { pgTable, serial, integer, text, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./schema";

export interface IdCardTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentTextColor: string;
  cardVariant?: "default" | "acon-official-student" | string;
}

export interface IdCardHeaderConfig {
  showLogo: boolean;
  institutionTitle: string;
  institutionSubtitle?: string;
  affiliationText?: string;
}

export interface IdCardFieldConfig {
  key: string;
  label: string;
  showLabel: boolean;
  isBold?: boolean;
  side: "front" | "back";
}

export interface IdCardBarcodeConfig {
  enabled: boolean;
  type: "code128" | "qr";
  side: "front" | "back";
  valueField: "code" | "verifyUrl";
}

export interface IdCardSignatureConfig {
  enabled: boolean;
  label: string;
  signatureImageUrl?: string;
  side: "front" | "back";
}

export interface IdCardBackgroundConfig {
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  useCustomBackground?: boolean;
}

export interface IdCardElementPosition {
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
}

export interface IdCardPositionsConfig {
  photo?: IdCardElementPosition;
  name?: IdCardElementPosition;
  details?: IdCardElementPosition;
  barcode?: IdCardElementPosition;
  qrCode?: IdCardElementPosition;
  backDetails?: IdCardElementPosition;
  signature?: IdCardElementPosition;
}

export interface IdCardLayoutConfig {
  theme: IdCardTheme;
  header: IdCardHeaderConfig;
  photo: {
    shape: "rounded" | "rectangle" | "circle";
    borderWidth: number;
    borderColor: string;
  };
  fields: IdCardFieldConfig[];
  barcode: IdCardBarcodeConfig;
  signature: IdCardSignatureConfig;
  background?: IdCardBackgroundConfig;
  positions?: IdCardPositionsConfig;
  termsText?: string;
  returnAddress?: string;
  emergencyPhone?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    email?: string;
  };
}

/**
 * id_card_templates — defines layout parameters, themes, and field configs for cards
 */
export const idCardTemplates = pgTable("id_card_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  targetType: text("target_type").notNull(), // 'staff' | 'student'
  orientation: text("orientation").notNull().default("portrait"), // 'portrait' | 'landscape'
  isDefault: boolean("is_default").notNull().default(false),
  layoutConfig: jsonb("layout_config").notNull().$type<IdCardLayoutConfig>(),
  active: boolean("active").notNull().default(true),
  createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * id_card_issuances — tracks every issued card, verification token, and print count
 */
export const idCardIssuances = pgTable("id_card_issuances", {
  id: serial("id").primaryKey(),
  cardSerialNo: text("card_serial_no").notNull().unique(), // e.g. "IDC-2026-00001"
  templateId: integer("template_id").notNull().references(() => idCardTemplates.id),
  entityType: text("entity_type").notNull(), // 'staff' | 'student'
  staffId: integer("staff_id"),
  studentId: integer("student_id"),

  // Data snapshot captured at issuance time
  printedName: text("printed_name").notNull(),
  printedCode: text("printed_code").notNull(), // employee_code or enrollment_no
  printedDepartment: text("printed_department"),
  printedRole: text("printed_role"), // designation or course name
  printedBloodGroup: text("printed_blood_group"),
  printedEmergencyContact: text("printed_emergency_contact"),
  photoUrl: text("photo_url"),

  issueDate: text("issue_date").notNull(), // YYYY-MM-DD
  validUntil: text("valid_until"), // YYYY-MM-DD
  qrVerifyToken: text("qr_verify_token").notNull().unique(),
  status: text("status").notNull().default("active"), // 'active' | 'lost' | 'revoked' | 'expired'

  printCount: integer("print_count").notNull().default(1),
  lastPrintedAt: timestamp("last_printed_at").defaultNow(),
  issuedById: text("issued_by_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("id_card_issuances_qr_token_idx").on(table.qrVerifyToken),
  uniqueIndex("id_card_issuances_serial_idx").on(table.cardSerialNo),
]);

export type IdCardTemplate = typeof idCardTemplates.$inferSelect;
export type InsertIdCardTemplate = typeof idCardTemplates.$inferInsert;
export type IdCardIssuance = typeof idCardIssuances.$inferSelect;
export type InsertIdCardIssuance = typeof idCardIssuances.$inferInsert;
