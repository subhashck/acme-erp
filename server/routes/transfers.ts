import { eq, sql, and, desc, ilike, inArray, gte, lte } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  stores,
  stockRequisitions,
  stockRequisitionItems,
  stockTransfers,
  stockTransferItems,
  storeBatchStock,
  itemBatches,
} from "../db/schema-inventory.ts";
import { items, user } from "../db/schema.ts";
import { generateDocNumber } from "../services/sequence.ts";
import { recordStockMovement } from "../services/stock-engine.ts";
import { idParam, jsonBody, requireAdmin } from "./shared.ts";
import { z } from "zod";

const app = new Hono<AuthEnv>();

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const requisitionItemInput = z.object({
  itemId: z.number().int().positive("Item is required"),
  requestedQty: z.coerce.number().positive("Quantity must be > 0"),
  unit: z.string().min(1, "Unit is required"),
});

const requisitionInput = z.object({
  requestingStoreId: z.number().int().positive("Requesting store is required"),
  fulfillingStoreId: z.number().int().positive("Fulfilling store is required"),
  priority: z.enum(["normal", "urgent", "emergency"]).default("normal"),
  remarks: z.string().optional().nullable(),
  items: z.array(requisitionItemInput).min(1, "At least one item is required"),
});

const transferItemInput = z.object({
  itemId: z.number().int().positive("Item is required"),
  batchId: z.number().int().positive("Batch is required"),
  quantity: z.coerce.number().positive("Quantity must be > 0"),
  unit: z.string().min(1, "Unit is required"),
  unitRate: z.coerce.number().min(0).default(0),
});

const transferInput = z.object({
  fromStoreId: z.number().int().positive("Source store is required"),
  toStoreId: z.number().int().positive("Destination store is required"),
  requisitionId: z.number().int().positive().optional().nullable(),
  remarks: z.string().optional().nullable(),
  items: z.array(transferItemInput).min(1, "At least one item is required"),
});

// ---------------------------------------------------------------------------
// Store Requisitions (Indents)
// ---------------------------------------------------------------------------

export const transfersRoutes = app
  .get("/inventory/requisitions", async (c) => {
    const query = c.req.query();
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (query.status) {
      conditions.push(eq(stockRequisitions.status, query.status as any));
    }
    if (query.requestingStoreId) {
      conditions.push(eq(stockRequisitions.requestingStoreId, parseInt(query.requestingStoreId, 10)));
    }
    if (query.fulfillingStoreId) {
      conditions.push(eq(stockRequisitions.fulfillingStoreId, parseInt(query.fulfillingStoreId, 10)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stockRequisitions)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const reqs = await db.query.stockRequisitions.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(stockRequisitions.createdAt)],
      with: {
        requestingStore: true,
        fulfillingStore: true,
        requestedByUser: true,
        approvedByUser: true,
        items: {
          with: {
            item: true,
          },
        },
      },
    });

    return c.json({
      data: reqs,
      pagination: {
        page,
        pageSize: limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
  .get("/inventory/requisitions/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());

    const req = await db.query.stockRequisitions.findFirst({
      where: eq(stockRequisitions.id, id),
      with: {
        requestingStore: true,
        fulfillingStore: true,
        requestedByUser: true,
        approvedByUser: true,
        items: {
          with: {
            item: true,
          },
        },
      },
    });

    if (!req) return c.json({ error: "Requisition not found" }, 404);
    return c.json(req);
  })
  .post("/inventory/requisitions", async (c) => {
    const input = await jsonBody(c, requisitionInput);
    const session = await c.get("session");
    const userId = session?.user?.id;

    if (input.requestingStoreId === input.fulfillingStoreId) {
      return c.json({ error: "Requesting and fulfilling stores cannot be identical" }, 400);
    }

    try {
      const result = await db.transaction(async (tx) => {
        const requisitionNo = await generateDocNumber(tx, "REQ");

        const [req] = await tx
          .insert(stockRequisitions)
          .values({
            requisitionNo,
            requestingStoreId: input.requestingStoreId,
            fulfillingStoreId: input.fulfillingStoreId,
            priority: input.priority as any,
            remarks: input.remarks || null,
            status: "submitted",
            requestedBy: userId || null,
          })
          .returning();

        await tx.insert(stockRequisitionItems).values(
          input.items.map((item) => ({
            requisitionId: req.id,
            itemId: item.itemId,
            requestedQty: item.requestedQty,
            approvedQty: item.requestedQty, // Default approved = requested
            fulfilledQty: 0,
            unit: item.unit,
          }))
        );

        return req;
      });

      return c.json(result, 201);
    } catch (err: any) {
      return c.json({ error: err.message || "Failed to create requisition" }, 400);
    }
  })
  .patch("/inventory/requisitions/:id/approve", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const session = await c.get("session");
    const userId = session?.user?.id;

    const input = await jsonBody(
      c,
      z.object({
        items: z.array(
          z.object({
            id: z.number().int().positive(),
            approvedQty: z.coerce.number().min(0),
          })
        ),
        remarks: z.string().optional().nullable(),
      })
    );

    const [existing] = await db.select().from(stockRequisitions).where(eq(stockRequisitions.id, id));
    if (!existing) return c.json({ error: "Requisition not found" }, 404);

    if (existing.status !== "submitted" && existing.status !== "draft") {
      return c.json({ error: `Requisition cannot be approved in '${existing.status}' status` }, 400);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(stockRequisitions)
        .set({
          status: "approved",
          approvedBy: userId || null,
          remarks: input.remarks || existing.remarks,
        })
        .where(eq(stockRequisitions.id, id));

      for (const item of input.items) {
        await tx
          .update(stockRequisitionItems)
          .set({ approvedQty: item.approvedQty })
          .where(eq(stockRequisitionItems.id, item.id));
      }
    });

    return c.json({ success: true, message: "Requisition approved successfully" });
  })
  .patch("/inventory/requisitions/:id/reject", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const session = await c.get("session");
    const userId = session?.user?.id;
    const { remarks } = await jsonBody(c, z.object({ remarks: z.string().optional().nullable() }));

    const [existing] = await db.select().from(stockRequisitions).where(eq(stockRequisitions.id, id));
    if (!existing) return c.json({ error: "Requisition not found" }, 404);

    await db.update(stockRequisitions).set({
      status: "rejected",
      approvedBy: userId || null,
      remarks: remarks || existing.remarks,
    }).where(eq(stockRequisitions.id, id));

    return c.json({ success: true, message: "Requisition rejected" });
  })

  // ---------------------------------------------------------------------------
  // Stock Transfers (Two-Phase: Dispatch -> Receive)
  // ---------------------------------------------------------------------------
  .get("/inventory/transfers", async (c) => {
    const query = c.req.query();
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (query.status) {
      conditions.push(eq(stockTransfers.status, query.status as any));
    }
    if (query.fromStoreId) {
      conditions.push(eq(stockTransfers.fromStoreId, parseInt(query.fromStoreId, 10)));
    }
    if (query.toStoreId) {
      conditions.push(eq(stockTransfers.toStoreId, parseInt(query.toStoreId, 10)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stockTransfers)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const transfers = await db.query.stockTransfers.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(stockTransfers.createdAt)],
      with: {
        fromStore: true,
        toStore: true,
        dispatchedByUser: true,
        receivedByUser: true,
        requisition: true,
        items: {
          with: {
            item: true,
            batch: true,
          },
        },
      },
    });

    return c.json({
      data: transfers,
      pagination: {
        page,
        pageSize: limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
  .get("/inventory/transfers/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());

    const transfer = await db.query.stockTransfers.findFirst({
      where: eq(stockTransfers.id, id),
      with: {
        fromStore: true,
        toStore: true,
        dispatchedByUser: true,
        receivedByUser: true,
        requisition: true,
        items: {
          with: {
            item: true,
            batch: true,
          },
        },
      },
    });

    if (!transfer) return c.json({ error: "Stock transfer not found" }, 404);
    return c.json(transfer);
  })
  .post("/inventory/transfers", async (c) => {
    const input = await jsonBody(c, transferInput);

    if (input.fromStoreId === input.toStoreId) {
      return c.json({ error: "Source and destination stores cannot be identical" }, 400);
    }

    try {
      const result = await db.transaction(async (tx) => {
        const transferNo = await generateDocNumber(tx, "TRN");

        const [transfer] = await tx
          .insert(stockTransfers)
          .values({
            transferNo,
            fromStoreId: input.fromStoreId,
            toStoreId: input.toStoreId,
            requisitionId: input.requisitionId || null,
            status: "draft",
            remarks: input.remarks || null,
          })
          .returning();

        await tx.insert(stockTransferItems).values(
          input.items.map((item) => ({
            transferId: transfer.id,
            itemId: item.itemId,
            batchId: item.batchId,
            quantity: item.quantity,
            unit: item.unit,
            unitRate: item.unitRate ?? 0,
          }))
        );

        return transfer;
      });

      return c.json(result, 201);
    } catch (err: any) {
      return c.json({ error: err.message || "Failed to create stock transfer" }, 400);
    }
  })
  .patch("/inventory/transfers/:id/dispatch", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const session = await c.get("session");
    const userId = session?.user?.id;

    const transfer = await db.query.stockTransfers.findFirst({
      where: eq(stockTransfers.id, id),
      with: {
        items: true,
      },
    });

    if (!transfer) return c.json({ error: "Transfer not found" }, 404);
    if (transfer.status !== "draft") {
      return c.json({ error: `Transfer cannot be dispatched from '${transfer.status}' status` }, 400);
    }

    try {
      await db.transaction(async (tx) => {
        // Record TRANSFER_OUT for each item from source store
        for (const item of transfer.items) {
          await recordStockMovement(tx, {
            storeId: transfer.fromStoreId,
            itemId: item.itemId,
            batchId: item.batchId,
            movementType: "TRANSFER_OUT",
            referenceType: "TRANSFER",
            referenceId: transfer.id,
            quantityChange: -Number(item.quantity),
            costPrice: Number(item.unitRate || 0),
            userId: userId || null,
          });
        }

        await tx
          .update(stockTransfers)
          .set({
            status: "in_transit",
            dispatchedAt: new Date(),
            dispatchedBy: userId || null,
          })
          .where(eq(stockTransfers.id, id));
      });

      return c.json({ success: true, message: "Transfer dispatched successfully and stock placed in transit" });
    } catch (err: any) {
      return c.json({ error: err.message || "Failed to dispatch transfer" }, 400);
    }
  })
  .patch("/inventory/transfers/:id/receive", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const session = await c.get("session");
    const userId = session?.user?.id;

    const transfer = await db.query.stockTransfers.findFirst({
      where: eq(stockTransfers.id, id),
      with: {
        items: true,
      },
    });

    if (!transfer) return c.json({ error: "Transfer not found" }, 404);
    if (transfer.status !== "in_transit") {
      return c.json({ error: `Transfer can only be received when status is 'in_transit'` }, 400);
    }

    try {
      await db.transaction(async (tx) => {
        // Record TRANSFER_IN for each item into destination store
        for (const item of transfer.items) {
          await recordStockMovement(tx, {
            storeId: transfer.toStoreId,
            itemId: item.itemId,
            batchId: item.batchId,
            movementType: "TRANSFER_IN",
            referenceType: "TRANSFER",
            referenceId: transfer.id,
            quantityChange: Number(item.quantity),
            costPrice: Number(item.unitRate || 0),
            userId: userId || null,
          });

          // Update linked requisition fulfilled quantities if present
          if (transfer.requisitionId) {
            await tx
              .update(stockRequisitionItems)
              .set({
                fulfilledQty: sql`${stockRequisitionItems.fulfilledQty} + ${Number(item.quantity)}`,
              })
              .where(
                and(
                  eq(stockRequisitionItems.requisitionId, transfer.requisitionId),
                  eq(stockRequisitionItems.itemId, item.itemId)
                )
              );
          }
        }

        // Update requisition status if fully fulfilled
        if (transfer.requisitionId) {
          const reqItems = await tx
            .select()
            .from(stockRequisitionItems)
            .where(eq(stockRequisitionItems.requisitionId, transfer.requisitionId));

          const allFulfilled = reqItems.every(
            (ri) => Number(ri.fulfilledQty) >= Number(ri.approvedQty || ri.requestedQty)
          );

          await tx
            .update(stockRequisitions)
            .set({
              status: allFulfilled ? "fulfilled" : "partially_fulfilled",
            })
            .where(eq(stockRequisitions.id, transfer.requisitionId));
        }

        await tx
          .update(stockTransfers)
          .set({
            status: "received",
            receivedAt: new Date(),
            receivedBy: userId || null,
          })
          .where(eq(stockTransfers.id, id));
      });

      return c.json({ success: true, message: "Stock received into destination store successfully" });
    } catch (err: any) {
      return c.json({ error: err.message || "Failed to receive transfer" }, 400);
    }
  })
  .patch("/inventory/transfers/:id/cancel", async (c) => {
    const { id } = idParam.parse(c.req.param());

    const [transfer] = await db.select().from(stockTransfers).where(eq(stockTransfers.id, id));
    if (!transfer) return c.json({ error: "Transfer not found" }, 404);

    if (transfer.status !== "draft") {
      return c.json({ error: "Only draft transfers can be cancelled" }, 400);
    }

    await db.update(stockTransfers).set({ status: "cancelled" }).where(eq(stockTransfers.id, id));
    return c.json({ success: true, message: "Transfer cancelled" });
  });
