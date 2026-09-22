import { relations } from "drizzle-orm";
import {
  integer,
  text,
  timestamp,
  serial,
  numeric,
  pgSchema,
  date,
  jsonb,
} from "drizzle-orm/pg-core";
import { user, bankAccounts } from "./schema.ts";

export const capitalSchema = pgSchema("capital");

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
};

// ---------------------------------------------------------------------------
// 1. Borrowing Facilities & Liabilities Master
// ---------------------------------------------------------------------------
export const capitalFacilities = capitalSchema.table("facilities", {
  id: serial("id").primaryKey(),
  facilityCode: text("facility_code").notNull().unique(), // e.g. "CAP-FAC-001" or external reference like "2745"
  name: text("name").notNull(), // e.g. "KEISHAMTHONG/GOLDEN 20K", "Shriram Chit Fund"
  lenderName: text("lender_name").notNull(), // e.g. "M/S Golden", "Shriram Chits", "ICICI Bank"
  category: text("category").notNull(), // "Bank Loan", "NBFC", "Chit Fund", "Private Lending", "Daily Collection Financing", "Credit Card", "Other"
  facilityType: text("facility_type").default("Term Loan"), // Term Loan, Working Capital, Chit Group, Bridge Capital, Equipment Loan, Revolving Card
  sanctionedAmount: numeric("sanctioned_amount", { precision: 15, scale: 2 }).notNull(),
  disbursedAmount: numeric("disbursed_amount", { precision: 15, scale: 2 }).notNull(),
  interestRate: numeric("interest_rate", { precision: 6, scale: 2 }).notNull().default("0"), // % p.a.
  interestType: text("interest_type").notNull().default("reducing"), // "flat", "reducing", "interest_only", "chit_dividend"
  tenorMonths: numeric("tenor_months", { precision: 6, scale: 2 }).default("0"), // in months or decimal fraction
  repaymentFrequency: text("repayment_frequency").notNull().default("monthly"), // "daily", "weekly", "monthly", "quarterly", "bullet", "revolving"
  installmentAmount: numeric("installment_amount", { precision: 15, scale: 2 }).notNull().default("0"), // Daily due or monthly EMI
  outstandingBalance: numeric("outstanding_balance", { precision: 15, scale: 2 }).notNull(),
  totalPrincipalPaid: numeric("total_principal_paid", { precision: 15, scale: 2 }).notNull().default("0"),
  totalInterestPaid: numeric("total_interest_paid", { precision: 15, scale: 2 }).notNull().default("0"),
  totalChargesPaid: numeric("total_charges_paid", { precision: 15, scale: 2 }).notNull().default("0"),
  sanctionDate: date("sanction_date"),
  disbursementDate: date("disbursement_date"),
  maturityDate: date("maturity_date"),
  moratoriumMonths: numeric("moratorium_months", { precision: 5, scale: 2 }).default("0"),
  moratoriumType: text("moratorium_type").notNull().default("none"), // "none", "pre_emi_interest", "capitalized"
  repaymentStartDate: date("repayment_start_date"), // First full EMI date after moratorium
  bankAccountId: integer("bank_account_id"), // link to bank_accounts
  collateralSecurity: text("collateral_security"),
  status: text("status").notNull().default("active"), // "active", "closed", "restructured", "defaulted"
  notes: text("notes"),
  metadata: jsonb("metadata"),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// 2. Debt Repayment Ledger
// ---------------------------------------------------------------------------
export const capitalRepayments = capitalSchema.table("repayments", {
  id: serial("id").primaryKey(),
  paymentCode: text("payment_code").notNull().unique(), // e.g. "CAP-PAY-YYYY-XXXX"
  facilityId: integer("facility_id")
    .notNull()
    .references(() => capitalFacilities.id, { onDelete: "cascade" }),
  paymentDate: date("payment_date").notNull(),
  paymentType: text("payment_type").notNull().default("emi"), // "emi", "principal_part", "interest_only", "foreclosure", "chit_installment", "daily_collection", "penalty_charges"
  principalPaid: numeric("principal_paid", { precision: 15, scale: 2 }).notNull().default("0"),
  interestPaid: numeric("interest_paid", { precision: 15, scale: 2 }).notNull().default("0"),
  chargesPaid: numeric("charges_paid", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("daily_collection"), // "daily_collection", "auto_debit", "bank_transfer", "cheque", "cash", "upi"
  bankAccountId: integer("bank_account_id"),
  referenceNumber: text("reference_number"), // UTR, Cheque #, Collector receipt # e.g. "22023"
  status: text("status").notNull().default("completed"), // "completed", "pending", "failed", "cancelled"
  notes: text("notes"),
  createdBy: text("created_by").references(() => user.id),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// 3. Cash Flow & Capital Infusions Ledger
// ---------------------------------------------------------------------------
export const capitalCashFlowEntries = capitalSchema.table("cash_flow_entries", {
  id: serial("id").primaryKey(),
  entryCode: text("entry_code").notNull().unique(), // e.g. "CF-YYYY-XXXX"
  entryDate: date("entry_date").notNull(),
  transactionType: text("transaction_type").notNull(), // "capital_infusion", "operating_income", "operating_expense", "debt_inflow", "debt_servicing"
  category: text("category").notNull(), // "Angel Investment", "Founder Capital", "Client Retainer", "Payroll & Wages", "Office & Facilities", "Cloud & Infra", "Debt Servicing", etc.
  partyName: text("party_name"),
  description: text("description"),
  inflowAmount: numeric("inflow_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  outflowAmount: numeric("outflow_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  netAmount: numeric("net_amount", { precision: 15, scale: 2 }).notNull(), // Inflow - Outflow
  bankAccountId: integer("bank_account_id"),
  referenceNumber: text("reference_number"), // e.g. "TXN-CAP-001"
  facilityId: integer("facility_id").references(() => capitalFacilities.id, { onDelete: "set null" }),
  repaymentId: integer("repayment_id").references(() => capitalRepayments.id, { onDelete: "set null" }),
  createdBy: text("created_by").references(() => user.id),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const capitalFacilitiesRelations = relations(capitalFacilities, ({ many, one }) => ({
  repayments: many(capitalRepayments),
  cashFlowEntries: many(capitalCashFlowEntries),
  bankAccount: one(bankAccounts, {
    fields: [capitalFacilities.bankAccountId],
    references: [bankAccounts.id],
  }),
}));

export const capitalRepaymentsRelations = relations(capitalRepayments, ({ one }) => ({
  facility: one(capitalFacilities, {
    fields: [capitalRepayments.facilityId],
    references: [capitalFacilities.id],
  }),
  bankAccount: one(bankAccounts, {
    fields: [capitalRepayments.bankAccountId],
    references: [bankAccounts.id],
  }),
  creator: one(user, {
    fields: [capitalRepayments.createdBy],
    references: [user.id],
  }),
}));

export const capitalCashFlowEntriesRelations = relations(capitalCashFlowEntries, ({ one }) => ({
  facility: one(capitalFacilities, {
    fields: [capitalCashFlowEntries.facilityId],
    references: [capitalFacilities.id],
  }),
  repayment: one(capitalRepayments, {
    fields: [capitalCashFlowEntries.repaymentId],
    references: [capitalRepayments.id],
  }),
  bankAccount: one(bankAccounts, {
    fields: [capitalCashFlowEntries.bankAccountId],
    references: [bankAccounts.id],
  }),
  creator: one(user, {
    fields: [capitalCashFlowEntries.createdBy],
    references: [user.id],
  }),
}));
