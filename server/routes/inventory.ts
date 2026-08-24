import { eq, sql, and, desc, asc, ilike, inArray, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Hono } from "hono";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  stores,
  storeStaffAssignments,
  itemBatches,
  storeBatchStock,
  stockLedger,
  stockAdjustments,
  stockAdjustmentItems,
  purchaseInvoices,
  purchaseInvoiceItems,
  purchaseInvoicePayments,
} from "../db/schema-inventory.ts";
import {
  items,
  itemTypes,
  unitTypes,
  staff,
  user,
  departments,
  vendors,
  grns,
  grnItems,
  purchaseOrders,
  poItems,
} from "../db/schema.ts";
import { generateDocNumber } from "../services/sequence.ts";
import { recordStockMovement } from "../services/stock-engine.ts";
import { idParam, jsonBody, requireAdmin } from "./shared.ts";
import { z } from "zod";

const app = new Hono<AuthEnv>();

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const storeInput = z.object({
  name: z.string().min(2, "Store name is required"),
  code: z.string().min(2, "Store code is required"),
  type: z.enum(["central", "retail_pharmacy", "ward", "college", "lab"]).default("retail_pharmacy"),
  departmentId: z.number().int().positive().optional().nullable(),
  location: z.string().optional().nullable(),
  active: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

const storeUpdateInput = storeInput.partial();

const staffAssignmentInput = z.object({
  staffId: z.number().int().positive(),
  canBill: z.boolean().default(true),
  canReceive: z.boolean().default(true),
  canTransfer: z.boolean().default(true),
  active: z.boolean().default(true),
});

const adjustmentItemInput = z.object({
  itemId: z.number().int().positive("Item is required"),
  batchId: z.number().int().positive("Batch is required"),
  systemQty: z.coerce.number().min(0),
  physicalQty: z.coerce.number().min(0),
  type: z.enum(["gain", "loss", "expired", "damaged"]).default("gain"),
});

const adjustmentInput = z.object({
  storeId: z.number().int().positive("Store is required"),
  reason: z.string().min(2, "Reason is required"),
  items: z.array(adjustmentItemInput).min(1, "At least one adjustment item is required"),
});

const purchaseInvoiceItemInput = z.object({
  id: z.number().optional(),
  itemId: z.number().int().positive("Item is required"),
  grnItemId: z.number().int().positive().optional().nullable(),
  quantity: z.coerce.number().min(0.001, "Quantity must be > 0"),
  unitId: z.number().int().positive("Unit is required"),
  unitRate: z.coerce.number().min(0, "Unit rate must be >= 0"),
  discountPercent: z.coerce.number().min(0).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  taxableAmount: z.coerce.number().min(0),
  hsnCode: z.string().optional().nullable(),
  gstPercent: z.coerce.number().min(0).default(0),
  cgstAmount: z.coerce.number().min(0).default(0),
  sgstAmount: z.coerce.number().min(0).default(0),
  igstAmount: z.coerce.number().min(0).default(0),
  totalAmount: z.coerce.number().min(0),
});

const purchaseInvoiceInput = z.object({
  invoiceNo: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  vendorId: z.number().int().positive("Vendor is required"),
  grnId: z.number().int().positive().optional().nullable(),
  poId: z.number().int().positive().optional().nullable(),
  subtotal: z.coerce.number().min(0).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  taxableAmount: z.coerce.number().min(0).default(0),
  cgstAmount: z.coerce.number().min(0).default(0),
  sgstAmount: z.coerce.number().min(0).default(0),
  igstAmount: z.coerce.number().min(0).default(0),
  tdsAmount: z.coerce.number().min(0).default(0),
  roundOff: z.coerce.number().default(0),
  netAmount: z.coerce.number().min(0),
  creditDays: z.coerce.number().min(0).default(0),
  dueDate: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  items: z.array(purchaseInvoiceItemInput).min(1, "At least one line item is required"),
});

const purchaseInvoicePaymentInput = z.object({
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  amount: z.coerce.number().min(0.01, "Amount must be > 0"),
  paymentMode: z.enum(["cash", "upi", "card", "rtgs", "cheque", "other"]),
  referenceNo: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Stores CRUD
// ---------------------------------------------------------------------------

export const inventoryRoutes = app
  .get("/inventory/stores", async (c) => {
    const query = c.req.query();
    const conditions = [];

    if (query.active === "true") {
      conditions.push(eq(stores.active, true));
    }
    if (query.type) {
      conditions.push(eq(stores.type, query.type));
    }

    let baseQuery = db
      .select({
        id: stores.id,
        name: stores.name,
        code: stores.code,
        type: stores.type,
        departmentId: stores.departmentId,
        departmentName: departments.name,
        location: stores.location,
        active: stores.active,
        isDefault: stores.isDefault,
        createdAt: stores.createdAt,
        updatedAt: stores.updatedAt,
      })
      .from(stores)
      .leftJoin(departments, eq(stores.departmentId, departments.id));

    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions)) as any;
    }

    const rows = await baseQuery.orderBy(stores.name).execute();
    return c.json(rows);
  })
  .post("/inventory/stores", async (c) => {
    const input = await jsonBody(c, storeInput);

    if (input.isDefault) {
      await db.update(stores).set({ isDefault: false });
    }

    const [row] = await db.insert(stores).values(input).returning();
    return c.json(row, 201);
  })
  .patch("/inventory/stores/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, storeUpdateInput);

    if (input.isDefault) {
      await db.update(stores).set({ isDefault: false });
    }

    const [updated] = await db.update(stores).set(input).where(eq(stores.id, id)).returning();
    if (!updated) {
      return c.json({ error: "Store not found" }, 404);
    }
    return c.json(updated);
  })
  .delete("/inventory/stores/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const [updated] = await db.update(stores).set({ active: false }).where(eq(stores.id, id)).returning();
    if (!updated) {
      return c.json({ error: "Store not found" }, 404);
    }
    return c.json({ success: true, message: "Store deactivated successfully" });
  })

  // ---------------------------------------------------------------------------
  // Store Staff Assignments
  // ---------------------------------------------------------------------------
  .get("/inventory/stores/:storeId/staff", async (c) => {
    const { storeId } = z.object({ storeId: z.coerce.number() }).parse(c.req.param());

    const assignments = await db
      .select({
        id: storeStaffAssignments.id,
        staffId: storeStaffAssignments.staffId,
        staffName: staff.name,
        staffEmail: staff.email,
        staffRole: staff.role,
        storeId: storeStaffAssignments.storeId,
        canBill: storeStaffAssignments.canBill,
        canReceive: storeStaffAssignments.canReceive,
        canTransfer: storeStaffAssignments.canTransfer,
        active: storeStaffAssignments.active,
        createdAt: storeStaffAssignments.createdAt,
      })
      .from(storeStaffAssignments)
      .leftJoin(staff, eq(storeStaffAssignments.staffId, staff.staffId))
      .where(eq(storeStaffAssignments.storeId, storeId))
      .orderBy(staff.name);

    return c.json(assignments);
  })
  .post("/inventory/stores/:storeId/staff", async (c) => {
    const { storeId } = z.object({ storeId: z.coerce.number() }).parse(c.req.param());
    const input = await jsonBody(c, staffAssignmentInput);

    const [row] = await db
      .insert(storeStaffAssignments)
      .values({
        storeId,
        staffId: input.staffId,
        canBill: input.canBill,
        canReceive: input.canReceive,
        canTransfer: input.canTransfer,
        active: input.active,
      })
      .returning();

    return c.json(row, 201);
  })
  .patch("/inventory/store-staff/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(
      c,
      z.object({
        canBill: z.boolean().optional(),
        canReceive: z.boolean().optional(),
        canTransfer: z.boolean().optional(),
        active: z.boolean().optional(),
      })
    );

    const [updated] = await db
      .update(storeStaffAssignments)
      .set(input)
      .where(eq(storeStaffAssignments.id, id))
      .returning();

    if (!updated) return c.json({ error: "Assignment not found" }, 404);
    return c.json(updated);
  })
  .delete("/inventory/store-staff/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const [deleted] = await db.delete(storeStaffAssignments).where(eq(storeStaffAssignments.id, id)).returning();
    if (!deleted) return c.json({ error: "Assignment not found" }, 404);
    return c.json({ success: true });
  })

  // ---------------------------------------------------------------------------
  // Live Stock Inquiry
  // ---------------------------------------------------------------------------
  .get("/inventory/stock", async (c) => {
    const query = c.req.query();
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.storeId) {
      conditions.push(eq(storeBatchStock.storeId, parseInt(query.storeId, 10)));
    }
    if (query.itemId) {
      conditions.push(eq(storeBatchStock.itemId, parseInt(query.itemId, 10)));
    }
    if (query.search) {
      conditions.push(ilike(items.name, `%${query.search}%`));
    }
    if (query.expiringBefore) {
      conditions.push(lte(itemBatches.expiryDate, query.expiringBefore));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(storeBatchStock)
      .leftJoin(items, eq(storeBatchStock.itemId, items.id))
      .leftJoin(itemBatches, eq(storeBatchStock.batchId, itemBatches.id))
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const rows = await db
      .select({
        id: storeBatchStock.id,
        storeId: storeBatchStock.storeId,
        storeName: stores.name,
        storeCode: stores.code,
        itemId: storeBatchStock.itemId,
        itemName: items.name,
        unit: unitTypes.symbol,
        unitName: unitTypes.name,
        itemTypeName: itemTypes.name,
        batchId: storeBatchStock.batchId,
        batchNumber: itemBatches.batchNumber,
        expiryDate: itemBatches.expiryDate,
        mrp: itemBatches.mrp,
        purchaseRate: itemBatches.purchaseRate,
        saleRate: itemBatches.saleRate,
        quantityOnHand: storeBatchStock.quantityOnHand,
        allocatedQty: storeBatchStock.allocatedQty,
        availableQty: storeBatchStock.availableQty,
        updatedAt: storeBatchStock.updatedAt,
      })
      .from(storeBatchStock)
      .leftJoin(stores, eq(storeBatchStock.storeId, stores.id))
      .leftJoin(items, eq(storeBatchStock.itemId, items.id))
      .leftJoin(unitTypes, eq(items.baseUnitId, unitTypes.id))
      .leftJoin(itemTypes, eq(items.itemTypeId, itemTypes.id))
      .leftJoin(itemBatches, eq(storeBatchStock.batchId, itemBatches.id))
      .where(whereClause)
      .orderBy(items.name, itemBatches.expiryDate)
      .limit(limit)
      .offset(offset);

    return c.json({
      data: rows,
      pagination: {
        page,
        pageSize: limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
  .get("/inventory/stock/summary", async (c) => {
    const query = c.req.query();
    const conditions = [];

    if (query.storeId) {
      conditions.push(eq(storeBatchStock.storeId, parseInt(query.storeId, 10)));
    }
    if (query.search) {
      conditions.push(ilike(items.name, `%${query.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        storeId: storeBatchStock.storeId,
        storeName: stores.name,
        itemId: storeBatchStock.itemId,
        itemName: items.name,
        unit: unitTypes.symbol,
        totalQuantityOnHand: sql<number>`sum(${storeBatchStock.quantityOnHand})`,
        totalAvailableQty: sql<number>`sum(${storeBatchStock.availableQty})`,
        batchCount: sql<number>`count(${storeBatchStock.batchId})`,
      })
      .from(storeBatchStock)
      .leftJoin(stores, eq(storeBatchStock.storeId, stores.id))
      .leftJoin(items, eq(storeBatchStock.itemId, items.id))
      .leftJoin(unitTypes, eq(items.baseUnitId, unitTypes.id))
      .where(whereClause)
      .groupBy(storeBatchStock.storeId, stores.name, storeBatchStock.itemId, items.name, unitTypes.symbol)
      .orderBy(items.name);

    return c.json(rows);
  })

  // ---------------------------------------------------------------------------
  // Immutable Stock Ledger Inquiry
  // ---------------------------------------------------------------------------
  .get("/inventory/ledger", async (c) => {
    const query = c.req.query();
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.storeId) {
      conditions.push(eq(stockLedger.storeId, parseInt(query.storeId, 10)));
    }
    if (query.itemId) {
      conditions.push(eq(stockLedger.itemId, parseInt(query.itemId, 10)));
    }
    if (query.batchId) {
      conditions.push(eq(stockLedger.batchId, parseInt(query.batchId, 10)));
    }
    if (query.movementType) {
      conditions.push(eq(stockLedger.movementType, query.movementType as any));
    }
    if (query.dateFrom) {
      conditions.push(gte(stockLedger.transactionDate, new Date(query.dateFrom)));
    }
    if (query.dateTo) {
      conditions.push(lte(stockLedger.transactionDate, new Date(query.dateTo)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stockLedger)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const rows = await db
      .select({
        id: stockLedger.id,
        transactionDate: stockLedger.transactionDate,
        storeId: stockLedger.storeId,
        storeName: stores.name,
        itemId: stockLedger.itemId,
        itemName: items.name,
        unit: unitTypes.symbol,
        batchId: stockLedger.batchId,
        batchNumber: itemBatches.batchNumber,
        expiryDate: itemBatches.expiryDate,
        movementType: stockLedger.movementType,
        referenceType: stockLedger.referenceType,
        referenceId: stockLedger.referenceId,
        quantityChange: stockLedger.quantityChange,
        balanceAfter: stockLedger.balanceAfter,
        costPrice: stockLedger.costPrice,
        salePrice: stockLedger.salePrice,
        createdBy: stockLedger.createdBy,
        createdByName: user.name,
      })
      .from(stockLedger)
      .leftJoin(stores, eq(stockLedger.storeId, stores.id))
      .leftJoin(items, eq(stockLedger.itemId, items.id))
      .leftJoin(unitTypes, eq(items.baseUnitId, unitTypes.id))
      .leftJoin(itemBatches, eq(stockLedger.batchId, itemBatches.id))
      .leftJoin(user, eq(stockLedger.createdBy, user.id))
      .where(whereClause)
      .orderBy(desc(stockLedger.transactionDate), desc(stockLedger.id))
      .limit(limit)
      .offset(offset);

    return c.json({
      data: rows,
      pagination: {
        page,
        pageSize: limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })

  // ---------------------------------------------------------------------------
  // Physical Stock Adjustments
  // ---------------------------------------------------------------------------
  .get("/inventory/adjustments", async (c) => {
    const query = c.req.query();
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (query.storeId) {
      conditions.push(eq(stockAdjustments.storeId, parseInt(query.storeId, 10)));
    }
    if (query.status) {
      conditions.push(eq(stockAdjustments.status, query.status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stockAdjustments)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const rows = await db
      .select({
        id: stockAdjustments.id,
        adjustmentNo: stockAdjustments.adjustmentNo,
        storeId: stockAdjustments.storeId,
        storeName: stores.name,
        reason: stockAdjustments.reason,
        status: stockAdjustments.status,
        createdBy: stockAdjustments.createdBy,
        createdByName: user.name,
        createdAt: stockAdjustments.createdAt,
      })
      .from(stockAdjustments)
      .leftJoin(stores, eq(stockAdjustments.storeId, stores.id))
      .leftJoin(user, eq(stockAdjustments.createdBy, user.id))
      .where(whereClause)
      .orderBy(desc(stockAdjustments.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      data: rows,
      pagination: {
        page,
        pageSize: limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
  .get("/inventory/adjustments/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());

    const [adj] = await db
      .select({
        id: stockAdjustments.id,
        adjustmentNo: stockAdjustments.adjustmentNo,
        storeId: stockAdjustments.storeId,
        storeName: stores.name,
        reason: stockAdjustments.reason,
        status: stockAdjustments.status,
        createdBy: stockAdjustments.createdBy,
        createdByName: user.name,
        createdAt: stockAdjustments.createdAt,
      })
      .from(stockAdjustments)
      .leftJoin(stores, eq(stockAdjustments.storeId, stores.id))
      .leftJoin(user, eq(stockAdjustments.createdBy, user.id))
      .where(eq(stockAdjustments.id, id));

    if (!adj) return c.json({ error: "Stock adjustment not found" }, 404);

    const itemsList = await db
      .select({
        id: stockAdjustmentItems.id,
        itemId: stockAdjustmentItems.itemId,
        itemName: items.name,
        batchId: stockAdjustmentItems.batchId,
        batchNumber: itemBatches.batchNumber,
        expiryDate: itemBatches.expiryDate,
        systemQty: stockAdjustmentItems.systemQty,
        physicalQty: stockAdjustmentItems.physicalQty,
        differenceQty: stockAdjustmentItems.differenceQty,
        type: stockAdjustmentItems.type,
      })
      .from(stockAdjustmentItems)
      .leftJoin(items, eq(stockAdjustmentItems.itemId, items.id))
      .leftJoin(itemBatches, eq(stockAdjustmentItems.batchId, itemBatches.id))
      .where(eq(stockAdjustmentItems.adjustmentId, id));

    return c.json({ ...adj, items: itemsList });
  })
  .post("/inventory/adjustments", async (c) => {
    const input = await jsonBody(c, adjustmentInput);
    const session = await c.get("session");
    const userId = session?.user?.id;

    try {
      const createdAdj = await db.transaction(async (tx) => {
        const adjustmentNo = await generateDocNumber(tx, "ADJ");

        const [adj] = await tx
          .insert(stockAdjustments)
          .values({
            adjustmentNo,
            storeId: input.storeId,
            reason: input.reason,
            status: "draft",
            createdBy: userId || null,
          })
          .returning();

        for (const item of input.items) {
          const diff = item.physicalQty - item.systemQty;
          await tx.insert(stockAdjustmentItems).values({
            adjustmentId: adj.id,
            itemId: item.itemId,
            batchId: item.batchId,
            systemQty: item.systemQty,
            physicalQty: item.physicalQty,
            differenceQty: diff,
            type: item.type as any,
          });
        }

        return adj;
      });

      return c.json(createdAdj, 201);
    } catch (err: any) {
      return c.json({ error: err.message || "Failed to create adjustment" }, 400);
    }
  })
  .patch("/inventory/adjustments/:id/post", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const session = await c.get("session");
    const userId = session?.user?.id;

    const adj = await db.query.stockAdjustments.findFirst({
      where: eq(stockAdjustments.id, id),
      with: {
        items: true,
      },
    });

    if (!adj) return c.json({ error: "Stock adjustment not found" }, 404);
    if (adj.status !== "draft") {
      return c.json({ error: `Adjustment cannot be posted from '${adj.status}' status` }, 400);
    }

    try {
      await db.transaction(async (tx) => {
        for (const item of adj.items) {
          const diff = Number(item.differenceQty);
          if (diff === 0) continue;

          if (diff > 0) {
            await recordStockMovement(tx, {
              storeId: adj.storeId,
              itemId: item.itemId,
              batchId: item.batchId,
              movementType: "ADJUSTMENT_ADD",
              referenceType: "STOCK_ADJUSTMENT",
              referenceId: adj.id,
              quantityChange: diff,
              userId: userId || null,
            });
          } else {
            await recordStockMovement(tx, {
              storeId: adj.storeId,
              itemId: item.itemId,
              batchId: item.batchId,
              movementType: item.type === "damaged" || item.type === "expired" ? "DAMAGE" : "ADJUSTMENT_SUB",
              referenceType: "STOCK_ADJUSTMENT",
              referenceId: adj.id,
              quantityChange: diff,
              userId: userId || null,
            });
          }
        }

        await tx
          .update(stockAdjustments)
          .set({
            status: "posted",
            approvedBy: userId || null,
          })
          .where(eq(stockAdjustments.id, id));
      });

      return c.json({ success: true, message: "Stock adjustment successfully posted to ledger" });
    } catch (err: any) {
      return c.json({ error: err.message || "Failed to post adjustment" }, 400);
    }
  })

  // ---------------------------------------------------------------------------
  // Purchase Invoices (Vendor Bills matched against GRNs)
  // ---------------------------------------------------------------------------
  .get("/inventory/purchase-invoices", async (c) => {
    const query = c.req.query();
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (query.vendorId) {
      conditions.push(eq(purchaseInvoices.vendorId, parseInt(query.vendorId, 10)));
    }
    if (query.status) {
      conditions.push(eq(purchaseInvoices.status, query.status as any));
    }
    if (query.search) {
      conditions.push(ilike(purchaseInvoices.invoiceNo, `%${query.search}%`));
    }
    if (query.dateFrom) {
      conditions.push(gte(purchaseInvoices.invoiceDate, query.dateFrom));
    }
    if (query.dateTo) {
      conditions.push(lte(purchaseInvoices.invoiceDate, query.dateTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(purchaseInvoices)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const rows = await db
      .select({
        id: purchaseInvoices.id,
        invoiceNo: purchaseInvoices.invoiceNo,
        invoiceDate: purchaseInvoices.invoiceDate,
        vendorId: purchaseInvoices.vendorId,
        vendorName: vendors.name,
        grnId: purchaseInvoices.grnId,
        grnNo: grns.grnNo,
        poId: purchaseInvoices.poId,
        poNo: purchaseOrders.poNo,
        status: purchaseInvoices.status,
        subtotal: purchaseInvoices.subtotal,
        discountAmount: purchaseInvoices.discountAmount,
        taxableAmount: purchaseInvoices.taxableAmount,
        cgstAmount: purchaseInvoices.cgstAmount,
        sgstAmount: purchaseInvoices.sgstAmount,
        igstAmount: purchaseInvoices.igstAmount,
        tdsAmount: purchaseInvoices.tdsAmount,
        roundOff: purchaseInvoices.roundOff,
        netAmount: purchaseInvoices.netAmount,
        paidAmount: purchaseInvoices.paidAmount,
        balanceAmount: sql<number>`(${purchaseInvoices.netAmount} - ${purchaseInvoices.paidAmount})`,
        creditDays: purchaseInvoices.creditDays,
        dueDate: purchaseInvoices.dueDate,
        remarks: purchaseInvoices.remarks,
        createdAt: purchaseInvoices.createdAt,
      })
      .from(purchaseInvoices)
      .leftJoin(vendors, eq(purchaseInvoices.vendorId, vendors.id))
      .leftJoin(grns, eq(purchaseInvoices.grnId, grns.id))
      .leftJoin(purchaseOrders, eq(purchaseInvoices.poId, purchaseOrders.id))
      .where(whereClause)
      .orderBy(desc(purchaseInvoices.invoiceDate), desc(purchaseInvoices.id))
      .limit(limit)
      .offset(offset);

    return c.json({
      data: rows,
      pagination: {
        page,
        pageSize: limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
  .get("/inventory/purchase-invoices/pending", async (c) => {
    const rows = await db
      .select({
        id: purchaseInvoices.id,
        invoiceNo: purchaseInvoices.invoiceNo,
        invoiceDate: purchaseInvoices.invoiceDate,
        vendorId: purchaseInvoices.vendorId,
        vendorName: vendors.name,
        status: purchaseInvoices.status,
        netAmount: purchaseInvoices.netAmount,
        paidAmount: purchaseInvoices.paidAmount,
        balanceAmount: sql<number>`(${purchaseInvoices.netAmount} - ${purchaseInvoices.paidAmount})`,
        dueDate: purchaseInvoices.dueDate,
        creditDays: purchaseInvoices.creditDays,
      })
      .from(purchaseInvoices)
      .leftJoin(vendors, eq(purchaseInvoices.vendorId, vendors.id))
      .where(
        and(
          inArray(purchaseInvoices.status, ["verified", "approved", "partially_paid"] as any),
          sql`(${purchaseInvoices.netAmount} - ${purchaseInvoices.paidAmount}) > 0`
        )
      )
      .orderBy(asc(purchaseInvoices.dueDate));

    return c.json(rows);
  })
  .get("/inventory/purchase-invoices/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());

    const [invoice] = await db
      .select({
        id: purchaseInvoices.id,
        invoiceNo: purchaseInvoices.invoiceNo,
        invoiceDate: purchaseInvoices.invoiceDate,
        vendorId: purchaseInvoices.vendorId,
        vendorName: vendors.name,
        vendorGst: vendors.gstNumber,
        vendorPhone: vendors.phone,
        vendorAddress: vendors.address,
        grnId: purchaseInvoices.grnId,
        grnNo: grns.grnNo,
        poId: purchaseInvoices.poId,
        poNo: purchaseOrders.poNo,
        status: purchaseInvoices.status,
        subtotal: purchaseInvoices.subtotal,
        discountAmount: purchaseInvoices.discountAmount,
        taxableAmount: purchaseInvoices.taxableAmount,
        cgstAmount: purchaseInvoices.cgstAmount,
        sgstAmount: purchaseInvoices.sgstAmount,
        igstAmount: purchaseInvoices.igstAmount,
        tdsAmount: purchaseInvoices.tdsAmount,
        roundOff: purchaseInvoices.roundOff,
        netAmount: purchaseInvoices.netAmount,
        paidAmount: purchaseInvoices.paidAmount,
        balanceAmount: sql<number>`(${purchaseInvoices.netAmount} - ${purchaseInvoices.paidAmount})`,
        creditDays: purchaseInvoices.creditDays,
        dueDate: purchaseInvoices.dueDate,
        remarks: purchaseInvoices.remarks,
        verifiedBy: purchaseInvoices.verifiedBy,
        approvedBy: purchaseInvoices.approvedBy,
        createdBy: purchaseInvoices.createdBy,
        createdAt: purchaseInvoices.createdAt,
      })
      .from(purchaseInvoices)
      .leftJoin(vendors, eq(purchaseInvoices.vendorId, vendors.id))
      .leftJoin(grns, eq(purchaseInvoices.grnId, grns.id))
      .leftJoin(purchaseOrders, eq(purchaseInvoices.poId, purchaseOrders.id))
      .where(eq(purchaseInvoices.id, id));

    if (!invoice) return c.json({ error: "Purchase invoice not found" }, 404);

    const itemsList = await db
      .select({
        id: purchaseInvoiceItems.id,
        itemId: purchaseInvoiceItems.itemId,
        itemName: items.name,
        grnItemId: purchaseInvoiceItems.grnItemId,
        quantity: purchaseInvoiceItems.quantity,
        unitId: purchaseInvoiceItems.unitId,
        unitSymbol: unitTypes.symbol,
        unitName: unitTypes.name,
        unitRate: purchaseInvoiceItems.unitRate,
        discountPercent: purchaseInvoiceItems.discountPercent,
        discountAmount: purchaseInvoiceItems.discountAmount,
        taxableAmount: purchaseInvoiceItems.taxableAmount,
        hsnCode: purchaseInvoiceItems.hsnCode,
        gstPercent: purchaseInvoiceItems.gstPercent,
        cgstAmount: purchaseInvoiceItems.cgstAmount,
        sgstAmount: purchaseInvoiceItems.sgstAmount,
        igstAmount: purchaseInvoiceItems.igstAmount,
        totalAmount: purchaseInvoiceItems.totalAmount,
        grnReceivedQty: grnItems.receivedQty,
        poOrderedQty: poItems.orderedQty,
      })
      .from(purchaseInvoiceItems)
      .leftJoin(items, eq(purchaseInvoiceItems.itemId, items.id))
      .leftJoin(unitTypes, eq(purchaseInvoiceItems.unitId, unitTypes.id))
      .leftJoin(grnItems, eq(purchaseInvoiceItems.grnItemId, grnItems.id))
      .leftJoin(poItems, eq(grnItems.poItemId, poItems.id))
      .where(eq(purchaseInvoiceItems.invoiceId, id));

    const paymentsList = await db
      .select({
        id: purchaseInvoicePayments.id,
        paymentDate: purchaseInvoicePayments.paymentDate,
        amount: purchaseInvoicePayments.amount,
        paymentMode: purchaseInvoicePayments.paymentMode,
        referenceNo: purchaseInvoicePayments.referenceNo,
        remarks: purchaseInvoicePayments.remarks,
        createdBy: purchaseInvoicePayments.createdBy,
        createdByName: user.name,
        createdAt: purchaseInvoicePayments.createdAt,
      })
      .from(purchaseInvoicePayments)
      .leftJoin(user, eq(purchaseInvoicePayments.createdBy, user.id))
      .where(eq(purchaseInvoicePayments.invoiceId, id))
      .orderBy(desc(purchaseInvoicePayments.paymentDate));

    return c.json({
      ...invoice,
      items: itemsList,
      payments: paymentsList,
    });
  })
  .post("/inventory/purchase-invoices", async (c) => {
    const input = await jsonBody(c, purchaseInvoiceInput);
    const session = await c.get("session");
    const userId = session?.user?.id;

    try {
      const createdInvoice = await db.transaction(async (tx) => {
        let computedDueDate = input.dueDate;
        if (!computedDueDate && input.creditDays) {
          const d = new Date(input.invoiceDate);
          d.setDate(d.getDate() + input.creditDays);
          computedDueDate = d.toISOString().split("T")[0];
        }

        const [invoice] = await tx
          .insert(purchaseInvoices)
          .values({
            invoiceNo: input.invoiceNo,
            invoiceDate: input.invoiceDate,
            vendorId: input.vendorId,
            grnId: input.grnId || null,
            poId: input.poId || null,
            status: "draft",
            subtotal: input.subtotal,
            discountAmount: input.discountAmount,
            taxableAmount: input.taxableAmount,
            cgstAmount: input.cgstAmount,
            sgstAmount: input.sgstAmount,
            igstAmount: input.igstAmount,
            tdsAmount: input.tdsAmount,
            roundOff: input.roundOff,
            netAmount: input.netAmount,
            creditDays: input.creditDays,
            dueDate: computedDueDate || null,
            remarks: input.remarks || null,
            createdBy: userId || null,
          })
          .returning();

        for (const item of input.items) {
          await tx.insert(purchaseInvoiceItems).values({
            invoiceId: invoice.id,
            itemId: item.itemId,
            grnItemId: item.grnItemId || null,
            quantity: item.quantity,
            unitId: item.unitId,
            unitRate: item.unitRate,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            taxableAmount: item.taxableAmount,
            hsnCode: item.hsnCode || null,
            gstPercent: item.gstPercent,
            cgstAmount: item.cgstAmount,
            sgstAmount: item.sgstAmount,
            igstAmount: item.igstAmount,
            totalAmount: item.totalAmount,
          });
        }

        return invoice;
      });

      return c.json(createdInvoice, 201);
    } catch (err: any) {
      return c.json({ error: err.message || "Failed to create purchase invoice" }, 400);
    }
  })
  .patch("/inventory/purchase-invoices/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, purchaseInvoiceInput);

    const [existing] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, id));
    if (!existing) return c.json({ error: "Purchase invoice not found" }, 404);
    if (existing.status === "paid" || existing.status === "cancelled") {
      return c.json({ error: `Cannot edit invoice in '${existing.status}' status` }, 400);
    }

    try {
      const updatedInvoice = await db.transaction(async (tx) => {
        let computedDueDate = input.dueDate;
        if (!computedDueDate && input.creditDays) {
          const d = new Date(input.invoiceDate);
          d.setDate(d.getDate() + input.creditDays);
          computedDueDate = d.toISOString().split("T")[0];
        }

        const [invoice] = await tx
          .update(purchaseInvoices)
          .set({
            invoiceNo: input.invoiceNo,
            invoiceDate: input.invoiceDate,
            vendorId: input.vendorId,
            grnId: input.grnId || null,
            poId: input.poId || null,
            subtotal: input.subtotal,
            discountAmount: input.discountAmount,
            taxableAmount: input.taxableAmount,
            cgstAmount: input.cgstAmount,
            sgstAmount: input.sgstAmount,
            igstAmount: input.igstAmount,
            tdsAmount: input.tdsAmount,
            roundOff: input.roundOff,
            netAmount: input.netAmount,
            creditDays: input.creditDays,
            dueDate: computedDueDate || null,
            remarks: input.remarks || null,
          })
          .where(eq(purchaseInvoices.id, id))
          .returning();

        // Replace items
        await tx.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, id));

        for (const item of input.items) {
          await tx.insert(purchaseInvoiceItems).values({
            invoiceId: invoice.id,
            itemId: item.itemId,
            grnItemId: item.grnItemId || null,
            quantity: item.quantity,
            unitId: item.unitId,
            unitRate: item.unitRate,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            taxableAmount: item.taxableAmount,
            hsnCode: item.hsnCode || null,
            gstPercent: item.gstPercent,
            cgstAmount: item.cgstAmount,
            sgstAmount: item.sgstAmount,
            igstAmount: item.igstAmount,
            totalAmount: item.totalAmount,
          });
        }

        return invoice;
      });

      return c.json(updatedInvoice);
    } catch (err: any) {
      return c.json({ error: err.message || "Failed to update purchase invoice" }, 400);
    }
  })
  .patch("/inventory/purchase-invoices/:id/verify", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const session = await c.get("session");
    const userId = session?.user?.id;

    const [existing] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, id));
    if (!existing) return c.json({ error: "Purchase invoice not found" }, 404);

    const [updated] = await db
      .update(purchaseInvoices)
      .set({
        status: "verified",
        verifiedBy: userId || null,
      })
      .where(eq(purchaseInvoices.id, id))
      .returning();

    return c.json({ success: true, invoice: updated });
  })
  .patch("/inventory/purchase-invoices/:id/approve", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const session = await c.get("session");
    const userId = session?.user?.id;

    const [existing] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, id));
    if (!existing) return c.json({ error: "Purchase invoice not found" }, 404);

    const [updated] = await db
      .update(purchaseInvoices)
      .set({
        status: "approved",
        approvedBy: userId || null,
      })
      .where(eq(purchaseInvoices.id, id))
      .returning();

    return c.json({ success: true, invoice: updated });
  })
  .post("/inventory/purchase-invoices/:id/payments", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, purchaseInvoicePaymentInput);
    const session = await c.get("session");
    const userId = session?.user?.id;

    const [invoice] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, id));
    if (!invoice) return c.json({ error: "Purchase invoice not found" }, 404);

    const newPaidAmount = Number(invoice.paidAmount || 0) + input.amount;
    const netAmount = Number(invoice.netAmount || 0);
    const newStatus = newPaidAmount >= netAmount ? "paid" : "partially_paid";

    try {
      const result = await db.transaction(async (tx) => {
        const [payment] = await tx
          .insert(purchaseInvoicePayments)
          .values({
            invoiceId: id,
            paymentDate: input.paymentDate,
            amount: input.amount,
            paymentMode: input.paymentMode,
            referenceNo: input.referenceNo || null,
            remarks: input.remarks || null,
            createdBy: userId || null,
          })
          .returning();

        const [updatedInvoice] = await tx
          .update(purchaseInvoices)
          .set({
            paidAmount: newPaidAmount,
            status: newStatus,
          })
          .where(eq(purchaseInvoices.id, id))
          .returning();

        return { payment, invoice: updatedInvoice };
      });

      return c.json(result, 201);
    } catch (err: any) {
      return c.json({ error: err.message || "Failed to record payment" }, 400);
    }
  })
  .delete("/inventory/purchase-invoices/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());

    const [existing] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, id));
    if (!existing) return c.json({ error: "Purchase invoice not found" }, 404);
    if (existing.status !== "draft") {
      return c.json({ error: "Only draft invoices can be deleted" }, 400);
    }

    await db.delete(purchaseInvoices).where(eq(purchaseInvoices.id, id));
    return c.json({ success: true, message: "Purchase invoice deleted successfully" });
  })

  // ---------------------------------------------------------------------------
  // Inventory Reports & Analytics
  // ---------------------------------------------------------------------------
  .get("/inventory/reports/stock-valuation", async (c) => {
    const query = c.req.query();
    const storeId = query.storeId ? parseInt(query.storeId, 10) : undefined;

    const conditions = [];
    if (storeId) {
      conditions.push(eq(storeBatchStock.storeId, storeId));
    }
    conditions.push(sql`${storeBatchStock.quantityOnHand} > 0`);

    const rows = await db
      .select({
        storeId: storeBatchStock.storeId,
        storeName: stores.name,
        itemId: storeBatchStock.itemId,
        itemName: items.name,
        unit: unitTypes.symbol,
        batchNumber: itemBatches.batchNumber,
        expiryDate: itemBatches.expiryDate,
        purchaseRate: itemBatches.purchaseRate,
        mrp: itemBatches.mrp,
        quantityOnHand: storeBatchStock.quantityOnHand,
        totalCostValue: sql<number>`round((${storeBatchStock.quantityOnHand} * coalesce(${itemBatches.purchaseRate}, 0))::numeric, 2)`,
        totalMrpValue: sql<number>`round((${storeBatchStock.quantityOnHand} * coalesce(${itemBatches.mrp}, 0))::numeric, 2)`,
      })
      .from(storeBatchStock)
      .innerJoin(stores, eq(storeBatchStock.storeId, stores.id))
      .innerJoin(items, eq(storeBatchStock.itemId, items.id))
      .leftJoin(unitTypes, eq(items.baseUnitId, unitTypes.id))
      .innerJoin(itemBatches, eq(storeBatchStock.batchId, itemBatches.id))
      .where(and(...conditions))
      .orderBy(stores.name, items.name);

    const totalValuation = rows.reduce((sum, r) => sum + Number(r.totalCostValue || 0), 0);
    const totalMrpValuation = rows.reduce((sum, r) => sum + Number(r.totalMrpValue || 0), 0);

    return c.json({
      summary: {
        totalItems: rows.length,
        totalCostValuation: Number(totalValuation.toFixed(2)),
        totalMrpValuation: Number(totalMrpValuation.toFixed(2)),
      },
      data: rows,
    });
  })
  .get("/inventory/reports/expiry-alert", async (c) => {
    const query = c.req.query();
    const daysThreshold = query.days ? parseInt(query.days, 10) : 90;
    const storeId = query.storeId ? parseInt(query.storeId, 10) : undefined;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysThreshold);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    const conditions = [
      sql`${storeBatchStock.quantityOnHand} > 0`,
      sql`${itemBatches.expiryDate} <= ${targetDateStr}`,
    ];

    if (storeId) {
      conditions.push(eq(storeBatchStock.storeId, storeId));
    }

    const atRiskBatches = await db
      .select({
        storeId: storeBatchStock.storeId,
        storeName: stores.name,
        itemId: storeBatchStock.itemId,
        itemName: items.name,
        unit: unitTypes.symbol,
        batchNumber: itemBatches.batchNumber,
        expiryDate: itemBatches.expiryDate,
        purchaseRate: itemBatches.purchaseRate,
        quantityOnHand: storeBatchStock.quantityOnHand,
        totalValue: sql<number>`round((${storeBatchStock.quantityOnHand} * coalesce(${itemBatches.purchaseRate}, 0))::numeric, 2)`,
      })
      .from(storeBatchStock)
      .innerJoin(stores, eq(storeBatchStock.storeId, stores.id))
      .innerJoin(items, eq(storeBatchStock.itemId, items.id))
      .leftJoin(unitTypes, eq(items.baseUnitId, unitTypes.id))
      .innerJoin(itemBatches, eq(storeBatchStock.batchId, itemBatches.id))
      .where(and(...conditions))
      .orderBy(asc(itemBatches.expiryDate));

    return c.json(atRiskBatches);
  })
  .get("/inventory/reports/reorder-alerts", async (c) => {
    const reorderItems = await db
      .select({
        itemId: items.id,
        itemName: items.name,
        unit: unitTypes.symbol,
        reorderLevel: items.reorderLevel,
        reorderQty: items.reorderQty,
        rate: items.rate,
        currentStock: sql<number>`coalesce(sum(${storeBatchStock.quantityOnHand}), 0)`,
      })
      .from(items)
      .leftJoin(unitTypes, eq(items.baseUnitId, unitTypes.id))
      .leftJoin(storeBatchStock, eq(items.id, storeBatchStock.itemId))
      .where(sql`${items.reorderLevel} > 0`)
      .groupBy(items.id, items.name, unitTypes.symbol, items.reorderLevel, items.reorderQty, items.rate)
      .having(sql`coalesce(sum(${storeBatchStock.quantityOnHand}), 0) <= ${items.reorderLevel}`);

    return c.json(reorderItems);
  });
