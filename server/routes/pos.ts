import { eq, sql, and, desc, ilike, or } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  stores,
  salesInvoices,
  salesInvoiceItems,
  salesReturns,
  salesReturnItems,
  storeBatchStock,
  itemBatches,
} from "../db/schema-inventory.ts";
import { items, unitTypes, user } from "../db/schema.ts";
import { generateDocNumber } from "../services/sequence.ts";
import { recordStockMovement } from "../services/stock-engine.ts";
import { allocateBatchesFefo } from "../services/fefo.ts";
import { calculateLineTax, calculateInvoiceSummary, type LineItemTaxResult } from "../services/gst.ts";
import { idParam, jsonBody, requireAdmin } from "./shared.ts";
import { z } from "zod";

const app = new Hono<AuthEnv>();

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const posItemInput = z.object({
  itemId: z.number().int().positive("Item is required"),
  batchId: z.number().int().positive().optional().nullable(), // Optional: if null, FEFO allocates
  quantity: z.coerce.number().positive("Quantity must be > 0"),
  unitId: z.coerce.number().positive().optional(),
  unit: z.string().optional(),
  unitRate: z.coerce.number().min(0),
  mrp: z.coerce.number().min(0).default(0),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  gstPercent: z.coerce.number().min(0).default(0),
});

const posInvoiceInput = z.object({
  storeId: z.number().int().positive("Store is required"),
  patientId: z.number().int().positive().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  doctorName: z.string().optional().nullable(),
  paymentMode: z.enum(["cash", "card", "upi", "credit", "split"]).default("cash"),
  isInterState: z.boolean().default(false),
  items: z.array(posItemInput).min(1, "At least one item is required"),
});

const posReturnItemInput = z.object({
  itemId: z.number().int().positive("Item is required"),
  batchId: z.number().int().positive("Batch is required"),
  quantity: z.coerce.number().positive("Quantity must be > 0"),
  unitRate: z.coerce.number().min(0),
  refundAmount: z.coerce.number().min(0),
  condition: z.enum(["restockable", "damaged", "expired"]).default("restockable"),
});

const posReturnInput = z.object({
  originalInvoiceId: z.number().int().positive().optional().nullable(),
  storeId: z.number().int().positive("Store is required"),
  reason: z.string().optional().nullable(),
  refundMode: z.enum(["cash", "card", "upi", "credit_note"]).default("cash"),
  items: z.array(posReturnItemInput).min(1, "At least one return item is required"),
});

// ---------------------------------------------------------------------------
// POS Routes
// ---------------------------------------------------------------------------

export const posRoutes = app
  // 1. Fast item lookup with live stock
  .get("/inventory/pos/item-search", async (c) => {
    const query = c.req.query();
    const search = query.search?.trim();
    const storeId = query.storeId ? parseInt(query.storeId, 10) : undefined;

    if (!search && !storeId) {
      return c.json([]);
    }

    const conditions = [sql`${storeBatchStock.quantityOnHand} > 0`];
    if (storeId) {
      conditions.push(eq(storeBatchStock.storeId, storeId));
    }

    if (search) {
      conditions.push(
        or(
          ilike(items.name, `%${search}%`),
          ilike(items.barcode, `%${search}%`),
          ilike(items.hsnCode, `%${search}%`),
          ilike(itemBatches.batchNumber, `%${search}%`)
        )
      );
    }

    const availableStock = await db
      .select({
        stockId: storeBatchStock.id,
        storeId: storeBatchStock.storeId,
        itemId: storeBatchStock.itemId,
        batchId: storeBatchStock.batchId,
        itemName: items.name,
        barcode: items.barcode,
        unitId: items.saleUnitId,
        unit: unitTypes.symbol,
        unitName: unitTypes.name,
        gstPercent: items.gstPercent,
        batchNumber: itemBatches.batchNumber,
        expiryDate: itemBatches.expiryDate,
        mrp: itemBatches.mrp,
        saleRate: itemBatches.saleRate,
        purchaseRate: itemBatches.purchaseRate,
        quantityOnHand: storeBatchStock.quantityOnHand,
        availableQty: storeBatchStock.availableQty,
      })
      .from(storeBatchStock)
      .innerJoin(items, eq(storeBatchStock.itemId, items.id))
      .leftJoin(unitTypes, eq(items.saleUnitId, unitTypes.id))
      .innerJoin(itemBatches, eq(storeBatchStock.batchId, itemBatches.id))
      .where(and(...conditions))
      .limit(50);

    return c.json(availableStock);
  })

  // 2. Create POS Sales Invoice
  .post("/inventory/pos/invoices", async (c) => {
    const input = await jsonBody(c, posInvoiceInput);
    const session = await c.get("session");
    const userId = session?.user?.id;

    try {
      const createdInvoice = await db.transaction(async (tx) => {
        const invoiceNo = await generateDocNumber(tx, "INV");

        // Process line items & FEFO batch resolution
        const resolvedLines: Array<{
          itemId: number;
          batchId: number;
          quantity: number;
          unitId: number;
          unitRate: number;
          mrp: number;
          tax: LineItemTaxResult;
        }> = [];

        for (const item of input.items) {
          let resolvedUnitId = item.unitId || 0;
          if (!resolvedUnitId) {
            const [itemRow] = await tx.select({ saleUnitId: items.saleUnitId }).from(items).where(eq(items.id, item.itemId));
            resolvedUnitId = itemRow?.saleUnitId || 0;
          }

          if (item.batchId) {
            // Explicit batch selection
            const [batch] = await tx
              .select()
              .from(itemBatches)
              .where(eq(itemBatches.id, item.batchId));

            const tax = calculateLineTax({
              quantity: item.quantity,
              unitRate: item.unitRate,
              discountPercent: item.discountPercent,
              gstPercent: item.gstPercent,
              isInterState: input.isInterState,
            });

            resolvedLines.push({
              itemId: item.itemId,
              batchId: item.batchId,
              quantity: item.quantity,
              unitId: resolvedUnitId,
              unitRate: item.unitRate,
              mrp: item.mrp || Number(batch?.mrp || item.unitRate),
              tax,
            });
          } else {
            // FEFO automatic batch allocation
            const allocations = await allocateBatchesFefo(
              tx,
              input.storeId,
              item.itemId,
              item.quantity
            );

            for (const alloc of allocations) {
              const tax = calculateLineTax({
                quantity: alloc.quantity,
                unitRate: item.unitRate || alloc.unitRate,
                discountPercent: item.discountPercent,
                gstPercent: item.gstPercent,
                isInterState: input.isInterState,
              });

              resolvedLines.push({
                itemId: item.itemId,
                batchId: alloc.batchId,
                quantity: alloc.quantity,
                unitId: resolvedUnitId,
                unitRate: item.unitRate || alloc.unitRate,
                mrp: item.mrp || alloc.mrp,
                tax,
              });
            }
          }
        }

        // Compute Invoice Level Totals
        const summary = calculateInvoiceSummary(resolvedLines.map((l) => l.tax));

        // Insert Invoice Header
        const [inv] = await tx
          .insert(salesInvoices)
          .values({
            invoiceNo,
            invoiceDate: new Date(),
            storeId: input.storeId,
            patientId: input.patientId || null,
            customerName: input.customerName || null,
            customerPhone: input.customerPhone || null,
            doctorName: input.doctorName || null,
            subtotal: summary.subtotal,
            discountAmount: summary.discountAmount,
            taxableAmount: summary.taxableAmount,
            cgstAmount: summary.cgstAmount,
            sgstAmount: summary.sgstAmount,
            igstAmount: summary.igstAmount,
            roundOff: summary.roundOff,
            netAmount: summary.netAmount,
            paymentMode: input.paymentMode as any,
            status: "completed",
            cashierId: userId || null,
          })
          .returning();

        // Insert Invoice Items and Record Stock Movements
        for (const line of resolvedLines) {
          await tx.insert(salesInvoiceItems).values({
            invoiceId: inv.id,
            itemId: line.itemId,
            batchId: line.batchId,
            quantity: line.quantity,
            unitId: line.unitId,
            unitRate: line.unitRate,
            mrp: line.mrp,
            discountPercent: line.tax.discountPercent,
            discountAmount: line.tax.discountAmount,
            taxableAmount: line.tax.taxableAmount,
            gstPercent: line.tax.gstPercent,
            cgstAmount: line.tax.cgstAmount,
            sgstAmount: line.tax.sgstAmount,
            igstAmount: line.tax.igstAmount,
            totalAmount: line.tax.totalAmount,
          });

          // Record negative SALE stock movement with row-level locking
          await recordStockMovement(tx, {
            storeId: input.storeId,
            itemId: line.itemId,
            batchId: line.batchId,
            movementType: "SALE",
            referenceType: "POS_INVOICE",
            referenceId: inv.id,
            quantityChange: -line.quantity,
            salePrice: line.unitRate,
            userId: userId || null,
          });
        }

        return inv;
      });

      const fullInvoice = await db.query.salesInvoices.findFirst({
        where: eq(salesInvoices.id, createdInvoice.id),
        with: {
          store: true,
          cashier: true,
          items: {
            with: {
              item: true,
              batch: true,
            },
          },
        },
      });

      return c.json(fullInvoice || createdInvoice, 201);
    } catch (err: any) {
      return c.json({ error: err.message || "Failed to process sale invoice" }, 400);
    }
  })

  // 3. List Invoices with pagination and filtering
  .get("/inventory/pos/invoices", async (c) => {
    const query = c.req.query();
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (query.storeId) {
      conditions.push(eq(salesInvoices.storeId, parseInt(query.storeId, 10)));
    }
    if (query.search) {
      conditions.push(
        or(
          ilike(salesInvoices.invoiceNo, `%${query.search}%`),
          ilike(salesInvoices.customerName, `%${query.search}%`),
          ilike(salesInvoices.customerPhone, `%${query.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(salesInvoices)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const invoices = await db.query.salesInvoices.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(salesInvoices.createdAt)],
      with: {
        store: true,
        cashier: true,
        items: {
          with: {
            item: true,
            batch: true,
          },
        },
      },
    });

    return c.json({
      data: invoices,
      pagination: {
        page,
        pageSize: limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })

  // 4. Get Single Invoice Detail
  .get("/inventory/pos/invoices/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());

    const invoice = await db.query.salesInvoices.findFirst({
      where: eq(salesInvoices.id, id),
      with: {
        store: true,
        cashier: true,
        items: {
          with: {
            item: true,
            batch: true,
          },
        },
      },
    });

    if (!invoice) return c.json({ error: "Invoice not found" }, 404);
    return c.json(invoice);
  })

  // 5. Process Sales Return
  .post("/inventory/pos/returns", async (c) => {
    const input = await jsonBody(c, posReturnInput);
    const session = await c.get("session");
    const userId = session?.user?.id;

    try {
      const returnDoc = await db.transaction(async (tx) => {
        const returnNo = await generateDocNumber(tx, "RET");

        const totalRefund = input.items.reduce((sum, item) => sum + Number(item.refundAmount), 0);

        const [ret] = await tx
          .insert(salesReturns)
          .values({
            returnNo,
            originalInvoiceId: input.originalInvoiceId || null,
            storeId: input.storeId,
            returnDate: new Date(),
            totalRefundAmount: Number(totalRefund.toFixed(2)),
            refundMode: input.refundMode as any,
            reason: input.reason || null,
            cashierId: userId || null,
          })
          .returning();

        for (const item of input.items) {
          await tx.insert(salesReturnItems).values({
            returnId: ret.id,
            itemId: item.itemId,
            batchId: item.batchId,
            returnedQty: item.quantity,
            unitRate: item.unitRate,
            refundAmount: item.refundAmount,
          });

          // Restock only if condition is 'restockable'
          if (item.condition === "restockable") {
            await recordStockMovement(tx, {
              storeId: input.storeId,
              itemId: item.itemId,
              batchId: item.batchId,
              movementType: "POS_RETURN",
              referenceType: "POS_RETURN",
              referenceId: ret.id,
              quantityChange: Number(item.quantity),
              salePrice: item.unitRate,
              userId: userId || null,
            });
          }
        }

        return ret;
      });

      return c.json(returnDoc, 201);
    } catch (err: any) {
      return c.json({ error: err.message || "Failed to process return" }, 400);
    }
  });
