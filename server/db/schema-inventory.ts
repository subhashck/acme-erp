import { relations } from "drizzle-orm";
import {
  integer,
  text,
  boolean,
  timestamp,
  serial,
  numeric,
  date,
  unique,
  pgSchema,
} from "drizzle-orm/pg-core";
import {
  user,
  staff,
  departments,
  items,
  vendors,
  patients,
  prescriptions,
  unitTypes,
  purchaseOrders,
  grns,
  grnItems,
  paymentModeEnum,
} from "./schema.ts";

export const inventorySchema = pgSchema("inventory");

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
};

// Enums
export const stockMovementTypeEnum = inventorySchema.enum("stock_movement_type", [
  "GRN",
  "SALE",
  "POS_RETURN",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "ADJUSTMENT_ADD",
  "ADJUSTMENT_SUB",
  "DAMAGE",
]);

export const requisitionStatusEnum = inventorySchema.enum("requisition_status", [
  "draft",
  "submitted",
  "approved",
  "partially_fulfilled",
  "fulfilled",
  "rejected",
]);

export const requisitionPriorityEnum = inventorySchema.enum("requisition_priority", [
  "normal",
  "urgent",
  "emergency",
]);

export const transferStatusEnum = inventorySchema.enum("transfer_status", [
  "draft",
  "in_transit",
  "received",
  "cancelled",
]);

export const adjustmentStatusEnum = inventorySchema.enum("adjustment_status", [
  "draft",
  "posted",
]);

export const adjustmentTypeEnum = inventorySchema.enum("adjustment_type", [
  "gain",
  "loss",
  "expired",
  "damaged",
]);

export const invoicePaymentModeEnum = inventorySchema.enum("invoice_payment_mode", [
  "cash",
  "upi",
  "card",
  "credit",
  "mixed",
]);

export const invoiceStatusEnum = inventorySchema.enum("invoice_status", [
  "completed",
  "cancelled",
  "refunded",
]);

export const refundModeEnum = inventorySchema.enum("refund_mode", [
  "cash",
  "upi",
  "credit_note",
]);

export const purchaseInvoiceStatusEnum = inventorySchema.enum("purchase_invoice_status", [
  "draft",
  "verified",
  "approved",
  "paid",
  "partially_paid",
  "cancelled",
]);

// 1. Stores / Warehouses
export const stores = inventorySchema.table("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("retail_pharmacy"), // central, retail_pharmacy, ward, college, lab
  departmentId: integer("department_id").references(() => departments.id),
  location: text("location"),
  active: boolean("active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  ...timestamps,
});

// 2. Staff Store Assignments
export const storeStaffAssignments = inventorySchema.table("store_staff_assignments", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  canBill: boolean("can_bill").notNull().default(true),
  canReceive: boolean("can_receive").notNull().default(true),
  canTransfer: boolean("can_transfer").notNull().default(true),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// 3. Master Item Batches
export const itemBatches = inventorySchema.table("item_batches", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  batchNumber: text("batch_number").notNull(),
  mfgDate: date("mfg_date"),
  expiryDate: date("expiry_date").notNull(),
  mrp: numeric("mrp", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  purchaseRate: numeric("purchase_rate", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  saleRate: numeric("sale_rate", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  barcode: text("barcode"),
  supplierId: integer("supplier_id").references(() => vendors.id),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
}, (t) => ({
  unqItemBatch: unique().on(t.itemId, t.batchNumber),
}));

// 4. Live Store Batch Stock
export const storeBatchStock = inventorySchema.table("store_batch_stock", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  batchId: integer("batch_id").notNull().references(() => itemBatches.id, { onDelete: "cascade" }),
  quantityOnHand: numeric("quantity_on_hand", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
  allocatedQty: numeric("allocated_qty", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
  availableQty: numeric("available_qty", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  unqStoreBatch: unique().on(t.storeId, t.batchId),
}));

// 5. Immutable Stock Ledger
export const stockLedger = inventorySchema.table("stock_ledger", {
  id: serial("id").primaryKey(),
  transactionDate: timestamp("transaction_date").notNull().defaultNow(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  itemId: integer("item_id").notNull().references(() => items.id),
  batchId: integer("batch_id").notNull().references(() => itemBatches.id),
  movementType: stockMovementTypeEnum("movement_type").notNull(),
  referenceType: text("reference_type").notNull(), // 'GRN', 'SALE_INVOICE', 'TRANSFER', 'ADJUSTMENT'
  referenceId: integer("reference_id").notNull(),
  quantityChange: numeric("quantity_change", { precision: 12, scale: 3, mode: "number" }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 12, scale: 3, mode: "number" }).notNull(),
  costPrice: numeric("cost_price", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  salePrice: numeric("sale_price", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 6. Concurrency-Safe Sequence Numbers
export const documentSequences = inventorySchema.table("document_sequences", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(), // 'GRN', 'INV', 'PO', 'TRN', 'REQ', 'ADJ', 'RET', 'PIN'
  prefix: text("prefix").notNull(),
  financialYear: text("financial_year").notNull(), // e.g. '26-27'
  currentVal: integer("current_val").notNull().default(0),
  padding: integer("padding").notNull().default(5),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  unqCodeFy: unique().on(t.code, t.financialYear),
}));

// 7. Store Requisitions (Indents)
export const stockRequisitions = inventorySchema.table("stock_requisitions", {
  id: serial("id").primaryKey(),
  requisitionNo: text("requisition_no").notNull().unique(),
  requestingStoreId: integer("requesting_store_id").notNull().references(() => stores.id),
  fulfillingStoreId: integer("fulfilling_store_id").notNull().references(() => stores.id),
  status: requisitionStatusEnum("status").notNull().default("draft"),
  priority: requisitionPriorityEnum("priority").notNull().default("normal"),
  requestedBy: text("requested_by").references(() => user.id),
  approvedBy: text("approved_by").references(() => user.id),
  remarks: text("remarks"),
  ...timestamps,
});

// 8. Store Requisition Items
export const stockRequisitionItems = inventorySchema.table("stock_requisition_items", {
  id: serial("id").primaryKey(),
  requisitionId: integer("requisition_id").notNull().references(() => stockRequisitions.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => items.id),
  requestedQty: numeric("requested_qty", { precision: 12, scale: 3, mode: "number" }).notNull(),
  approvedQty: numeric("approved_qty", { precision: 12, scale: 3, mode: "number" }),
  fulfilledQty: numeric("fulfilled_qty", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
  unitId: integer("unit_id").notNull().references(() => unitTypes.id),
});

// 9. Stock Transfers
export const stockTransfers = inventorySchema.table("stock_transfers", {
  id: serial("id").primaryKey(),
  transferNo: text("transfer_no").notNull().unique(),
  fromStoreId: integer("from_store_id").notNull().references(() => stores.id),
  toStoreId: integer("to_store_id").notNull().references(() => stores.id),
  requisitionId: integer("requisition_id").references(() => stockRequisitions.id),
  status: transferStatusEnum("status").notNull().default("draft"),
  dispatchedBy: text("dispatched_by").references(() => user.id),
  receivedBy: text("received_by").references(() => user.id),
  dispatchedAt: timestamp("dispatched_at"),
  receivedAt: timestamp("received_at"),
  remarks: text("remarks"),
  ...timestamps,
});

// 10. Stock Transfer Items
export const stockTransferItems = inventorySchema.table("stock_transfer_items", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id").notNull().references(() => stockTransfers.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => items.id),
  batchId: integer("batch_id").notNull().references(() => itemBatches.id),
  quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" }).notNull(),
  unitId: integer("unit_id").notNull().references(() => unitTypes.id),
  unitRate: numeric("unit_rate", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
});

// 11. Physical Stock Adjustments
export const stockAdjustments = inventorySchema.table("stock_adjustments", {
  id: serial("id").primaryKey(),
  adjustmentNo: text("adjustment_no").notNull().unique(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  reason: text("reason").notNull(),
  status: adjustmentStatusEnum("status").notNull().default("draft"),
  createdBy: text("created_by").references(() => user.id),
  approvedBy: text("approved_by").references(() => user.id),
  ...timestamps,
});

// 12. Stock Adjustment Items
export const stockAdjustmentItems = inventorySchema.table("stock_adjustment_items", {
  id: serial("id").primaryKey(),
  adjustmentId: integer("adjustment_id").notNull().references(() => stockAdjustments.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => items.id),
  batchId: integer("batch_id").notNull().references(() => itemBatches.id),
  systemQty: numeric("system_qty", { precision: 12, scale: 3, mode: "number" }).notNull(),
  physicalQty: numeric("physical_qty", { precision: 12, scale: 3, mode: "number" }).notNull(),
  differenceQty: numeric("difference_qty", { precision: 12, scale: 3, mode: "number" }).notNull(),
  type: adjustmentTypeEnum("type").notNull(),
});

// 13. POS Sales Invoices
export const salesInvoices = inventorySchema.table("sales_invoices", {
  id: serial("id").primaryKey(),
  invoiceNo: text("invoice_no").notNull().unique(),
  invoiceDate: timestamp("invoice_date").notNull().defaultNow(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  patientId: integer("patient_id").references(() => patients.id),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  doctorName: text("doctor_name"),
  prescriptionId: integer("prescription_id").references(() => prescriptions.id),
  subtotal: numeric("subtotal", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  cgstAmount: numeric("cgst_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  sgstAmount: numeric("sgst_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  igstAmount: numeric("igst_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  roundOff: numeric("round_off", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  netAmount: numeric("net_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  paymentMode: invoicePaymentModeEnum("payment_mode").notNull().default("cash"),
  status: invoiceStatusEnum("status").notNull().default("completed"),
  cashierId: text("cashier_id").references(() => user.id),
  ...timestamps,
});

// 14. POS Sales Invoice Items
export const salesInvoiceItems = inventorySchema.table("sales_invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => salesInvoices.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => items.id),
  batchId: integer("batch_id").notNull().references(() => itemBatches.id),
  quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" }).notNull(),
  unitId: integer("unit_id").notNull().references(() => unitTypes.id),
  unitRate: numeric("unit_rate", { precision: 12, scale: 2, mode: "number" }).notNull(),
  mrp: numeric("mrp", { precision: 12, scale: 2, mode: "number" }).notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2, mode: "number" }).default(0),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2, mode: "number" }).default(0),
  taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  gstPercent: numeric("gst_percent", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
  cgstAmount: numeric("cgst_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  sgstAmount: numeric("sgst_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  igstAmount: numeric("igst_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
});

// 15. POS Sales Returns
export const salesReturns = inventorySchema.table("sales_returns", {
  id: serial("id").primaryKey(),
  returnNo: text("return_no").notNull().unique(),
  originalInvoiceId: integer("original_invoice_id").references(() => salesInvoices.id),
  storeId: integer("store_id").notNull().references(() => stores.id),
  returnDate: timestamp("return_date").notNull().defaultNow(),
  totalRefundAmount: numeric("total_refund_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  refundMode: refundModeEnum("refund_mode").notNull().default("cash"),
  reason: text("reason"),
  cashierId: text("cashier_id").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 16. POS Sales Return Items
export const salesReturnItems = inventorySchema.table("sales_return_items", {
  id: serial("id").primaryKey(),
  returnId: integer("return_id").notNull().references(() => salesReturns.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => items.id),
  batchId: integer("batch_id").notNull().references(() => itemBatches.id),
  returnedQty: numeric("returned_qty", { precision: 12, scale: 3, mode: "number" }).notNull(),
  unitRate: numeric("unit_rate", { precision: 12, scale: 2, mode: "number" }).notNull(),
  refundAmount: numeric("refund_amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
});

// 17. Purchase Invoices (Vendor Bills against GRNs)
export const purchaseInvoices = inventorySchema.table("purchase_invoices", {
  id: serial("id").primaryKey(),
  invoiceNo: text("invoice_no").notNull(),
  invoiceDate: date("invoice_date").notNull(),
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  grnId: integer("grn_id").references(() => grns.id),
  poId: integer("po_id").references(() => purchaseOrders.id),
  status: purchaseInvoiceStatusEnum("status").notNull().default("draft"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  cgstAmount: numeric("cgst_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  sgstAmount: numeric("sgst_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  igstAmount: numeric("igst_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  tdsAmount: numeric("tds_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  roundOff: numeric("round_off", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  netAmount: numeric("net_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  creditDays: integer("credit_days").default(0),
  dueDate: date("due_date"),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  remarks: text("remarks"),
  verifiedBy: text("verified_by").references(() => user.id),
  approvedBy: text("approved_by").references(() => user.id),
  createdBy: text("created_by").references(() => user.id),
  ...timestamps,
});

// 18. Purchase Invoice Items
export const purchaseInvoiceItems = inventorySchema.table("purchase_invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => purchaseInvoices.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => items.id),
  grnItemId: integer("grn_item_id").references(() => grnItems.id),
  quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" }).notNull(),
  unitId: integer("unit_id").notNull().references(() => unitTypes.id),
  unitRate: numeric("unit_rate", { precision: 12, scale: 2, mode: "number" }).notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2, mode: "number" }).default(0),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2, mode: "number" }).default(0),
  taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  hsnCode: text("hsn_code"),
  gstPercent: numeric("gst_percent", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
  cgstAmount: numeric("cgst_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  sgstAmount: numeric("sgst_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  igstAmount: numeric("igst_amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
});

// 19. Purchase Invoice Payments
export const purchaseInvoicePayments = inventorySchema.table("purchase_invoice_payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => purchaseInvoices.id, { onDelete: "cascade" }),
  paymentDate: date("payment_date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  paymentMode: paymentModeEnum("payment_mode").notNull(),
  referenceNo: text("reference_no"),
  remarks: text("remarks"),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations Definitions
export const storesRelations = relations(stores, ({ one, many }) => ({
  department: one(departments, { fields: [stores.departmentId], references: [departments.id] }),
  staffAssignments: many(storeStaffAssignments),
  batchStock: many(storeBatchStock),
  ledgerEntries: many(stockLedger),
}));

export const storeStaffAssignmentsRelations = relations(storeStaffAssignments, ({ one }) => ({
  store: one(stores, { fields: [storeStaffAssignments.storeId], references: [stores.id] }),
  staff: one(staff, { fields: [storeStaffAssignments.staffId], references: [staff.staffId] }),
}));

export const itemBatchesRelations = relations(itemBatches, ({ one, many }) => ({
  item: one(items, { fields: [itemBatches.itemId], references: [items.id] }),
  supplier: one(vendors, { fields: [itemBatches.supplierId], references: [vendors.id] }),
  batchStock: many(storeBatchStock),
  ledgerEntries: many(stockLedger),
}));

export const storeBatchStockRelations = relations(storeBatchStock, ({ one }) => ({
  store: one(stores, { fields: [storeBatchStock.storeId], references: [stores.id] }),
  item: one(items, { fields: [storeBatchStock.itemId], references: [items.id] }),
  batch: one(itemBatches, { fields: [storeBatchStock.batchId], references: [itemBatches.id] }),
}));

export const stockLedgerRelations = relations(stockLedger, ({ one }) => ({
  store: one(stores, { fields: [stockLedger.storeId], references: [stores.id] }),
  item: one(items, { fields: [stockLedger.itemId], references: [items.id] }),
  batch: one(itemBatches, { fields: [stockLedger.batchId], references: [itemBatches.id] }),
  createdByUser: one(user, { fields: [stockLedger.createdBy], references: [user.id] }),
}));

export const stockRequisitionsRelations = relations(stockRequisitions, ({ one, many }) => ({
  requestingStore: one(stores, { fields: [stockRequisitions.requestingStoreId], references: [stores.id], relationName: "requestingStore" }),
  fulfillingStore: one(stores, { fields: [stockRequisitions.fulfillingStoreId], references: [stores.id], relationName: "fulfillingStore" }),
  requestedByUser: one(user, { fields: [stockRequisitions.requestedBy], references: [user.id], relationName: "requestedBy" }),
  approvedByUser: one(user, { fields: [stockRequisitions.approvedBy], references: [user.id], relationName: "approvedByUser" }),
  items: many(stockRequisitionItems),
  transfers: many(stockTransfers),
}));

export const stockRequisitionItemsRelations = relations(stockRequisitionItems, ({ one }) => ({
  requisition: one(stockRequisitions, { fields: [stockRequisitionItems.requisitionId], references: [stockRequisitions.id] }),
  item: one(items, { fields: [stockRequisitionItems.itemId], references: [items.id] }),
  unit: one(unitTypes, { fields: [stockRequisitionItems.unitId], references: [unitTypes.id] }),
}));

export const stockTransfersRelations = relations(stockTransfers, ({ one, many }) => ({
  fromStore: one(stores, { fields: [stockTransfers.fromStoreId], references: [stores.id], relationName: "fromStore" }),
  toStore: one(stores, { fields: [stockTransfers.toStoreId], references: [stores.id], relationName: "toStore" }),
  requisition: one(stockRequisitions, { fields: [stockTransfers.requisitionId], references: [stockRequisitions.id] }),
  dispatchedByUser: one(user, { fields: [stockTransfers.dispatchedBy], references: [user.id], relationName: "dispatchedBy" }),
  receivedByUser: one(user, { fields: [stockTransfers.receivedBy], references: [user.id], relationName: "receivedBy" }),
  items: many(stockTransferItems),
}));

export const stockTransferItemsRelations = relations(stockTransferItems, ({ one }) => ({
  transfer: one(stockTransfers, { fields: [stockTransferItems.transferId], references: [stockTransfers.id] }),
  item: one(items, { fields: [stockTransferItems.itemId], references: [items.id] }),
  batch: one(itemBatches, { fields: [stockTransferItems.batchId], references: [itemBatches.id] }),
  unit: one(unitTypes, { fields: [stockTransferItems.unitId], references: [unitTypes.id] }),
}));

export const stockAdjustmentsRelations = relations(stockAdjustments, ({ one, many }) => ({
  store: one(stores, { fields: [stockAdjustments.storeId], references: [stores.id] }),
  createdByUser: one(user, { fields: [stockAdjustments.createdBy], references: [user.id], relationName: "createdByUser" }),
  approvedByUser: one(user, { fields: [stockAdjustments.approvedBy], references: [user.id], relationName: "approvedByUser" }),
  items: many(stockAdjustmentItems),
}));

export const stockAdjustmentItemsRelations = relations(stockAdjustmentItems, ({ one }) => ({
  adjustment: one(stockAdjustments, { fields: [stockAdjustmentItems.adjustmentId], references: [stockAdjustments.id] }),
  item: one(items, { fields: [stockAdjustmentItems.itemId], references: [items.id] }),
  batch: one(itemBatches, { fields: [stockAdjustmentItems.batchId], references: [itemBatches.id] }),
}));

export const salesInvoicesRelations = relations(salesInvoices, ({ one, many }) => ({
  store: one(stores, { fields: [salesInvoices.storeId], references: [stores.id] }),
  patient: one(patients, { fields: [salesInvoices.patientId], references: [patients.id] }),
  prescription: one(prescriptions, { fields: [salesInvoices.prescriptionId], references: [prescriptions.id] }),
  cashier: one(user, { fields: [salesInvoices.cashierId], references: [user.id] }),
  items: many(salesInvoiceItems),
  returns: many(salesReturns),
}));

export const salesInvoiceItemsRelations = relations(salesInvoiceItems, ({ one }) => ({
  invoice: one(salesInvoices, { fields: [salesInvoiceItems.invoiceId], references: [salesInvoices.id] }),
  item: one(items, { fields: [salesInvoiceItems.itemId], references: [items.id] }),
  batch: one(itemBatches, { fields: [salesInvoiceItems.batchId], references: [itemBatches.id] }),
  unit: one(unitTypes, { fields: [salesInvoiceItems.unitId], references: [unitTypes.id] }),
}));

export const salesReturnsRelations = relations(salesReturns, ({ one, many }) => ({
  originalInvoice: one(salesInvoices, { fields: [salesReturns.originalInvoiceId], references: [salesInvoices.id] }),
  store: one(stores, { fields: [salesReturns.storeId], references: [stores.id] }),
  cashier: one(user, { fields: [salesReturns.cashierId], references: [user.id] }),
  items: many(salesReturnItems),
}));

export const salesReturnItemsRelations = relations(salesReturnItems, ({ one }) => ({
  salesReturn: one(salesReturns, { fields: [salesReturnItems.returnId], references: [salesReturns.id] }),
  item: one(items, { fields: [salesReturnItems.itemId], references: [items.id] }),
  batch: one(itemBatches, { fields: [salesReturnItems.batchId], references: [itemBatches.id] }),
}));

export const purchaseInvoicesRelations = relations(purchaseInvoices, ({ one, many }) => ({
  vendor: one(vendors, { fields: [purchaseInvoices.vendorId], references: [vendors.id] }),
  grn: one(grns, { fields: [purchaseInvoices.grnId], references: [grns.id] }),
  purchaseOrder: one(purchaseOrders, { fields: [purchaseInvoices.poId], references: [purchaseOrders.id] }),
  createdByUser: one(user, { fields: [purchaseInvoices.createdBy], references: [user.id], relationName: "createdByUser" }),
  verifiedByUser: one(user, { fields: [purchaseInvoices.verifiedBy], references: [user.id], relationName: "verifiedByUser" }),
  approvedByUser: one(user, { fields: [purchaseInvoices.approvedBy], references: [user.id], relationName: "approvedByUser" }),
  items: many(purchaseInvoiceItems),
  payments: many(purchaseInvoicePayments),
}));

export const purchaseInvoiceItemsRelations = relations(purchaseInvoiceItems, ({ one }) => ({
  invoice: one(purchaseInvoices, { fields: [purchaseInvoiceItems.invoiceId], references: [purchaseInvoices.id] }),
  item: one(items, { fields: [purchaseInvoiceItems.itemId], references: [items.id] }),
  grnItem: one(grnItems, { fields: [purchaseInvoiceItems.grnItemId], references: [grnItems.id] }),
  unit: one(unitTypes, { fields: [purchaseInvoiceItems.unitId], references: [unitTypes.id] }),
}));

export const purchaseInvoicePaymentsRelations = relations(purchaseInvoicePayments, ({ one }) => ({
  invoice: one(purchaseInvoices, { fields: [purchaseInvoicePayments.invoiceId], references: [purchaseInvoices.id] }),
  createdByUser: one(user, { fields: [purchaseInvoicePayments.createdBy], references: [user.id] }),
}));
