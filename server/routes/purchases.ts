import { eq, sql, and, or, desc, ilike, inArray, gte, lte } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  vendors,
  purchaseOrders,
  poItems,
  grns,
  grnItems,
  poPayments,
  itemTypes,
  items,
} from "../db/schema.ts";
import { idParam, jsonBody, requireAdmin } from "./shared.ts";
import { z } from "zod";
import { recalculatePoStatus, toNum } from "../utils/poStatus.ts";

const app = new Hono<AuthEnv>();

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const vendorInput = z.object({
  name: z.string().min(2),
  gstNumber: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

const vendorUpdateInput = vendorInput.partial().extend({
  active: z.boolean().optional(),
});

const poItemInput = z.object({
  id: z.number().optional(), // For updates
  itemName: z.string().min(2),
  category: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  orderedQty: z.coerce.number().min(0.01),
  unitRate: z.coerce.number().min(0),
  gstPercent: z.coerce.number().min(0).default(0),
});

const poInput = z.object({
  poNo: z.string().optional().nullable(),
  poDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vendorId: z.number().int().positive(),
  remarks: z.string().optional().nullable(),
  items: z.array(poItemInput).min(1),
});

const grnItemInput = z.object({
  id: z.number().optional(), // For updates
  poItemId: z.number().int().positive().optional().nullable(),
  itemId: z.number().int().positive().optional().nullable(),
  itemName: z.string().optional().nullable(),
  receivedQty: z.coerce.number().min(0),
  freeQty: z.coerce.number().min(0).default(0),
  unitRate: z.coerce.number().min(0).optional(),
  gstPercent: z.coerce.number().min(0).optional(),
  batch: z.string().optional().nullable(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const grnInput = z.object({
  poId: z.number().int().positive().optional().nullable(),
  vendorId: z.number().int().positive().optional().nullable(),
  noPoReason: z.string().optional().nullable(),
  grnNo: z.string().optional().nullable(),
  grnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateOfDelivery: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  remarks: z.string().optional().nullable(),
  status: z.enum(["draft", "posted", "correction"]).default("draft"),
  items: z.array(grnItemInput).min(1),
});

const paymentInput = z.object({
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.coerce.number().positive(),
  paymentMode: z.enum(["cash", "upi", "card", "rtgs", "cheque", "other"]),
  referenceNo: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const purchasesRoutes = app
  .get("/vendors", async (c) => {
  const query = c.req.query();
  const conditions = [];
  if (query.active === "true") {
    conditions.push(eq(vendors.active, true));
  }
  let baseQuery = db.select().from(vendors);
  if (conditions.length > 0) {
    baseQuery = baseQuery.where(and(...conditions)) as any;
  }
  const allVendors = await baseQuery.orderBy(vendors.name).execute();
  return c.json(allVendors);
})
  .post("/vendors", async (c) => {
  const input = await jsonBody(c, vendorInput);
  const [row] = await db.insert(vendors).values(input).returning();
  return c.json(row, 201);
})
  .patch("/vendors/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const input = await jsonBody(c, vendorUpdateInput);
  const [updated] = await db.update(vendors).set(input).where(eq(vendors.id, id)).returning();
  if (!updated) {
    return c.json({ error: "Vendor not found" }, 404);
  }
  return c.json(updated);
})
  .delete("/vendors/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  // Soft delete!
  const [updated] = await db.update(vendors).set({ active: false }).where(eq(vendors.id, id)).returning();
  if (!updated) {
    return c.json({ error: "Vendor not found" }, 404);
  }
  return c.json({ success: true, message: "Vendor deactivated successfully" });
})

// ---------------------------------------------------------------------------
// Purchase Orders
// ---------------------------------------------------------------------------
  .get("/purchase-orders", async (c) => {
  const query = c.req.query();
  
  // Parse pagination params
  const page = query.page ? parseInt(query.page, 10) : undefined;
  const limit = query.limit ? parseInt(query.limit, 10) : undefined;
  const offset = page && limit ? (page - 1) * limit : undefined;

  // Base query for items
  let baseQuery = db
    .select({
      id: purchaseOrders.id,
      poNo: purchaseOrders.poNo,
      poDate: purchaseOrders.poDate,
      vendorId: purchaseOrders.vendorId,
      vendorName: vendors.name,
      poStatus: purchaseOrders.poStatus,
      paymentStatus: purchaseOrders.paymentStatus,
      totalValue: purchaseOrders.totalValue,
      remarks: purchaseOrders.remarks,
      itemCount: sql<number>`(select count(*) from ${poItems} where ${poItems.poId} = ${purchaseOrders.id})`,
      grnCount: sql<number>`(select count(*) from ${grns} where ${grns.poId} = ${purchaseOrders.id})`,
      paymentCount: sql<number>`(select count(*) from ${poPayments} where ${poPayments.poId} = ${purchaseOrders.id})`,
      totalPaid: sql<number>`(select coalesce(sum(${poPayments.amount}), 0) from ${poPayments} where ${poPayments.poId} = ${purchaseOrders.id})`
    })
    .from(purchaseOrders)
    .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id));

  // Handle filtering
  const conditions = [];
  if (query.vendorId && query.vendorId !== "all") {
    conditions.push(eq(purchaseOrders.vendorId, parseInt(query.vendorId, 10)));
  }
  if (query.poStatus && query.poStatus !== "all") {
    conditions.push(eq(purchaseOrders.poStatus, query.poStatus as any));
  }
  if (query.paymentStatus && query.paymentStatus !== "all") {
    conditions.push(eq(purchaseOrders.paymentStatus, query.paymentStatus as any));
  }
  if (query.startDate) {
    conditions.push(sql`${purchaseOrders.poDate} >= ${query.startDate}`);
  }
  if (query.endDate) {
    conditions.push(sql`${purchaseOrders.poDate} <= ${query.endDate}`);
  }
  if (query.search) {
    const matchingPoIds = db
      .select({ id: poItems.poId })
      .from(poItems)
      .where(ilike(poItems.itemName, `%${query.search}%`));

    conditions.push(
      or(
        ilike(purchaseOrders.poNo, `%${query.search}%`),
        inArray(purchaseOrders.id, matchingPoIds)
      )
    );
  }

  if (conditions.length > 0) {
    baseQuery = baseQuery.where(and(...conditions)) as any;
  }

  // Fetch count of total items matching filters
  let countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(purchaseOrders);
    
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }
  const [countResult] = await countQuery;
  const total = countResult?.count || 0;

  // Execute baseQuery with pagination
  let finalQuery = baseQuery.orderBy(desc(purchaseOrders.createdAt));
  if (limit !== undefined && offset !== undefined) {
    finalQuery = finalQuery.limit(limit).offset(offset) as any;
  }
  const results = await finalQuery.execute();

  return c.json({
    data: results,
    total,
    page,
    limit
  });
})
  .get("/purchase-orders/summary", async (c) => {
  const query = c.req.query();

  // Handle filtering (must match listing filters exactly)
  const conditions = [];
  if (query.vendorId && query.vendorId !== "all") {
    conditions.push(eq(purchaseOrders.vendorId, parseInt(query.vendorId, 10)));
  }
  if (query.poStatus && query.poStatus !== "all") {
    conditions.push(eq(purchaseOrders.poStatus, query.poStatus as any));
  }
  if (query.paymentStatus && query.paymentStatus !== "all") {
    conditions.push(eq(purchaseOrders.paymentStatus, query.paymentStatus as any));
  }
  if (query.startDate) {
    conditions.push(sql`${purchaseOrders.poDate} >= ${query.startDate}`);
  }
  if (query.endDate) {
    conditions.push(sql`${purchaseOrders.poDate} <= ${query.endDate}`);
  }
  if (query.search) {
    const matchingPoIds = db
      .select({ id: poItems.poId })
      .from(poItems)
      .where(ilike(poItems.itemName, `%${query.search}%`));

    conditions.push(
      or(
        ilike(purchaseOrders.poNo, `%${query.search}%`),
        inArray(purchaseOrders.id, matchingPoIds)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 1. Get total values & PO status split
  let baseQuery = db
    .select({
      poStatus: purchaseOrders.poStatus,
      totalValue: purchaseOrders.totalValue,
    })
    .from(purchaseOrders)
    .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id));

  if (whereClause) {
    baseQuery = baseQuery.where(whereClause) as any;
  }

  const matchingPos = await baseQuery.execute();

  const totalPOs = matchingPos.length;
  let totalValue = 0;
  let openPOs = 0;
  let partialPOs = 0;
  let closedPOs = 0;
  let cancelledPOs = 0;

  for (const po of matchingPos) {
    totalValue += toNum(po.totalValue);
    if (po.poStatus === "open") openPOs++;
    else if (po.poStatus === "partial") partialPOs++;
    else if (po.poStatus === "closed") closedPOs++;
    else if (po.poStatus === "cancelled") cancelledPOs++;
  }

  // 2. Get quantities sum for the matching POs
  let totalOrderedQty = 0;
  let totalReceivedQty = 0;

  if (totalPOs > 0) {
    let subquery = db
      .select({ id: purchaseOrders.id })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id));

    if (whereClause) {
      subquery = subquery.where(whereClause) as any;
    }

    const [orderedRes] = await db
      .select({ sum: sql<number>`coalesce(sum(${poItems.orderedQty}), 0)` })
      .from(poItems)
      .where(inArray(poItems.poId, subquery));

    totalOrderedQty = toNum(orderedRes?.sum || 0);

    const [receivedRes] = await db
      .select({ sum: sql<number>`coalesce(sum(case when ${grns.status} != 'draft' then ${grnItems.receivedQty} else 0 end), 0)` })
      .from(grnItems)
      .innerJoin(poItems, eq(grnItems.poItemId, poItems.id))
      .innerJoin(grns, eq(grns.id, grnItems.grnId))
      .where(inArray(poItems.poId, subquery));

    totalReceivedQty = toNum(receivedRes?.sum || 0);
  }

  const pendingQty = Math.max(0, totalOrderedQty - totalReceivedQty);

  const formatQty = (v: number) => Math.round(v * 10000) / 10000;

  return c.json({
    totalPOs,
    totalValue,
    openPOs,
    partialPOs,
    closedPOs,
    cancelledPOs,
    totalOrderedQty: formatQty(totalOrderedQty),
    totalReceivedQty: formatQty(totalReceivedQty),
    pendingQty: formatQty(pendingQty),
  });
})
  .get("/purchase-orders/:id", async (c) => {
  const { id } = idParam.parse(c.req.param());
  const [po] = await db
    .select({
      id: purchaseOrders.id,
      poNo: purchaseOrders.poNo,
      poDate: purchaseOrders.poDate,
      vendorId: purchaseOrders.vendorId,
      vendorName: vendors.name,
      poStatus: purchaseOrders.poStatus,
      paymentStatus: purchaseOrders.paymentStatus,
      totalValue: purchaseOrders.totalValue,
      remarks: purchaseOrders.remarks,
    })
    .from(purchaseOrders)
    .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
    .where(eq(purchaseOrders.id, id));

  if (!po) return c.json({ error: "Not found" }, 404);

  const items = await db.select({
    id: poItems.id,
    poId: poItems.poId,
    itemName: poItems.itemName,
    category: poItems.category,
    unit: poItems.unit,
    orderedQty: poItems.orderedQty,
    unitRate: poItems.unitRate,
    gstPercent: poItems.gstPercent,
    lineValue: poItems.lineValue,
    createdAt: poItems.createdAt,
    receivedQty: sql<number>`coalesce(sum(case when ${grns.status} != 'draft' then ${grnItems.receivedQty} else 0 end), 0)`
  })
  .from(poItems)
  .leftJoin(grnItems, eq(grnItems.poItemId, poItems.id))
  .leftJoin(grns, eq(grns.id, grnItems.grnId))
  .where(eq(poItems.poId, id))
  .groupBy(poItems.id);
  
  const allGrns = await db.select().from(grns).where(eq(grns.poId, id));
  for (const grn of allGrns) {
    const gItems = await db.select().from(grnItems).where(eq(grnItems.grnId, grn.id));
    (grn as any).items = gItems;
  }
  
  const payments = await db.select().from(poPayments).where(eq(poPayments.poId, id));

  return c.json({
    ...po,
    items,
    grns: allGrns,
    payments,
  })
})
  .post("/purchase-orders", async (c) => {
  const input = await jsonBody(c, poInput);
  const session = await c.get("session");
  const userId = session?.user?.id;

  try {
    const result = await db.transaction(async (tx) => {
      let poNo = input.poNo?.trim();

      if (poNo) {
        // Check if user-provided PO number already exists
        const [existing] = await tx
          .select({ id: purchaseOrders.id })
          .from(purchaseOrders)
          .where(eq(purchaseOrders.poNo, poNo));

        if (existing) {
          throw new Error(`PO Number "${poNo}" already exists. Please use a unique PO number.`);
        }
      } else {
        // Auto-generate PO Number if left blank
        const year = new Date().getFullYear().toString().slice(-2);
        const [countResult] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(purchaseOrders);
        
        const seq = Number(countResult.count) + 1;
        poNo = `PO${seq.toString().padStart(5, '0')}-${year}`;
      }

      // Compute total value
      let totalValue = 0;
      const calculatedItems = input.items.map(item => {
        const basicValue = item.orderedQty * item.unitRate;
        const gstAmount = basicValue * (item.gstPercent / 100);
        const lineValue = basicValue + gstAmount;
        totalValue += lineValue;
        return {
          ...item,
          lineValue
        };
      });
      
      const [po] = await tx.insert(purchaseOrders).values({
        poNo,
        poDate: input.poDate,
        vendorId: input.vendorId,
        remarks: input.remarks,
        totalValue,
        createdBy: userId,
      }).returning();

      if (calculatedItems.length > 0) {
        await tx.insert(poItems).values(
          calculatedItems.map((item) => ({
            poId: po.id,
            itemName: item.itemName,
            category: item.category,
            unit: item.unit,
            orderedQty: item.orderedQty,
            unitRate: item.unitRate,
            gstPercent: item.gstPercent,
            lineValue: item.lineValue,
          }))
        );
      }

      return po;
    });

    return c.json(result, 201);
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to create purchase order" }, 400);
  }
})
  .patch("/purchase-orders/:id", async (c) => {
  const { id } = idParam.parse(c.req.param());
  const input = await jsonBody(c, poInput);

  // Check if items are received
  const [poStatusCheck] = await db
    .select({ poStatus: purchaseOrders.poStatus })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, id));

  if (!poStatusCheck) return c.json({ error: "Not found" }, 404);
  if (poStatusCheck.poStatus !== 'open') {
    return c.json({ error: "Cannot edit PO with received items or non-open status." }, 400);
  }

  try {
    const result = await db.transaction(async (tx) => {
      let poNo = input.poNo?.trim();

      if (poNo) {
        const [existing] = await tx
          .select({ id: purchaseOrders.id })
          .from(purchaseOrders)
          .where(and(eq(purchaseOrders.poNo, poNo), sql`${purchaseOrders.id} != ${id}`));

        if (existing) {
          throw new Error(`PO Number "${poNo}" already exists. Please use a unique PO number.`);
        }
      }

      // Compute total value
      let totalValue = 0;
      const calculatedItems = input.items.map(item => {
        const basicValue = item.orderedQty * item.unitRate;
        const gstAmount = basicValue * (item.gstPercent / 100);
        const lineValue = basicValue + gstAmount;
        totalValue += lineValue;
        return {
          ...item,
          lineValue
        };
      });

      const [po] = await tx.update(purchaseOrders).set({
        ...(poNo ? { poNo } : {}),
        poDate: input.poDate,
        vendorId: input.vendorId,
        remarks: input.remarks,
        totalValue,
      }).where(eq(purchaseOrders.id, id)).returning();

    // Simple strategy: delete existing open items and re-insert
    await tx.delete(poItems).where(eq(poItems.poId, id));

    if (calculatedItems.length > 0) {
      await tx.insert(poItems).values(
        calculatedItems.map((item) => ({
          poId: id,
          itemName: item.itemName,
          category: item.category,
          unit: item.unit,
          orderedQty: item.orderedQty,
          unitRate: item.unitRate,
          gstPercent: item.gstPercent,
          lineValue: item.lineValue,
        }))
      );
    }

    return po;
  });

  return c.json({ success: true, ...result });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to update purchase order" }, 400);
  }
})
  .delete("/purchase-orders/:id", requireAdmin, async (c) => {
  const { id } = idParam.parse(c.req.param());

  // Check dependencies
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
  if (!po) return c.json({ error: "Not found" }, 404);

  if (po.poStatus !== 'open' || po.paymentStatus !== 'unpaid') {
     return c.json({ error: "Cannot delete PO that has receipts or payments" }, 400);
  }

  await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  return c.json({ success: true })
})

// ---------------------------------------------------------------------------
// GRNs
// ---------------------------------------------------------------------------
  .post("/purchase-orders/:id/grns", async (c) => {
  const { id: poId } = idParam.parse(c.req.param());
  const input = await jsonBody(c, grnInput);
  const session = await c.get("session");
  const userId = session?.user?.id;

  try {
    const result = await db.transaction(async (tx) => {
      let grnNo = input.grnNo?.trim();

      if (grnNo) {
        // Validate uniqueness of grnNo
        const [existingGrn] = await tx.select().from(grns).where(eq(grns.grnNo, grnNo));
        if (existingGrn) {
          throw new Error("GRN number already exists");
        }
      } else {
        // Auto-generate GRN Number
        const year = new Date().getFullYear().toString().slice(-2);
        const [countResult] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(grns);
        
        const seq = Number(countResult.count) + 1;
        grnNo = `GRN${seq.toString().padStart(5, '0')}-${year}`;
      }

      const [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId));
      if (!po) throw new Error("Purchase Order not found");

      const [grn] = await tx.insert(grns).values({
        poId,
        vendorId: po.vendorId,
        grnNo,
        grnDate: input.grnDate,
        dateOfDelivery: input.dateOfDelivery,
        remarks: input.remarks,
        status: input.status as any,
        createdBy: userId,
      }).returning();

      if (input.items.length > 0) {
        await tx.insert(grnItems).values(
          input.items.map(item => ({
            grnId: grn.id,
            poItemId: item.poItemId ?? null,
            itemId: item.itemId ?? null,
            itemName: item.itemName ?? null,
            receivedQty: item.receivedQty,
            freeQty: item.freeQty,
            unitRate: item.unitRate ?? 0,
            gstPercent: item.gstPercent ?? 0,
            lineValue: item.unitRate ? (item.unitRate * item.receivedQty) : 0,
            batch: item.batch,
            expiryDate: item.expiryDate,
            notes: item.notes,
          }))
        );
      }

      await recalculatePoStatus(tx, poId);

      return grn;
    });

    return c.json(result, 201);
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to create GRN" }, 400);
  }
})
  .patch("/purchase-orders/:id/grns/:grnId", async (c) => {
  const { id: poId, grnId } = z.object({ id: z.coerce.number(), grnId: z.coerce.number() }).parse(c.req.param());
  const input = await jsonBody(c, grnInput);

  const [existingGrn] = await db.select().from(grns).where(eq(grns.id, grnId));
  if (!existingGrn) return c.json({ error: "GRN not found" }, 404);
  if (existingGrn.status !== 'draft') {
    return c.json({ error: "Only draft GRNs can be edited or posted" }, 400);
  }

  try {
    const result = await db.transaction(async (tx) => {
      let grnNo = input.grnNo?.trim() || existingGrn.grnNo;

      if (input.grnNo && input.grnNo !== existingGrn.grnNo) {
        const [dup] = await tx.select().from(grns).where(and(eq(grns.grnNo, grnNo), sql`${grns.id} != ${grnId}`));
        if (dup) {
          throw new Error("GRN number already exists");
        }
      }

      const [grn] = await tx.update(grns).set({
        grnNo,
        grnDate: input.grnDate,
        dateOfDelivery: input.dateOfDelivery,
        remarks: input.remarks,
        status: input.status as any,
      }).where(eq(grns.id, grnId)).returning();

      // Simple update: delete and re-insert items
      await tx.delete(grnItems).where(eq(grnItems.grnId, grnId));

      if (input.items.length > 0) {
        await tx.insert(grnItems).values(
          input.items.map(item => ({
            grnId: grnId,
            poItemId: item.poItemId ?? null,
            itemId: item.itemId ?? null,
            itemName: item.itemName ?? null,
            receivedQty: item.receivedQty,
            freeQty: item.freeQty,
            unitRate: item.unitRate ?? 0,
            gstPercent: item.gstPercent ?? 0,
            lineValue: item.unitRate ? (item.unitRate * item.receivedQty) : 0,
            batch: item.batch,
            expiryDate: item.expiryDate,
            notes: item.notes,
          }))
        );
      }

      await recalculatePoStatus(tx, poId);
      return grn;
    });

    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to update GRN" }, 400);
  }
})
  .delete("/grns/:grnId", async (c) => {
  const { id: grnId } = idParam.parse({ id: parseInt(c.req.param('grnId') as string) })
  
  try {
    await db.transaction(async (tx) => {
      const [grn] = await tx.select().from(grns).where(eq(grns.id, grnId));
      if (!grn) return;
      if (grn.status !== 'draft') {
        throw new Error("Only draft GRNs can be cancelled/deleted");
      }
      
      await tx.delete(grns).where(eq(grns.id, grnId));
      if (grn.poId) {
        await recalculatePoStatus(tx, grn.poId);
      }
    })
    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to delete GRN" }, 400);
  }
})

// ---------------------------------------------------------------------------
// Standalone GRNs (Direct)
// ---------------------------------------------------------------------------
  .get("/grns", async (c) => {
  const query = c.req.query();
  const page = query.page ? parseInt(query.page, 10) : undefined;
  const limit = query.limit ? parseInt(query.limit, 10) : undefined;
  const offset = page && limit ? (page - 1) * limit : undefined;

  const conditions = [];
  if (query.status) {
    conditions.push(eq(grns.status, query.status as any));
  }
  if (query.grnNo) {
    conditions.push(ilike(grns.grnNo, `%${query.grnNo}%`));
  }
  if (query.dateFrom) {
    conditions.push(gte(grns.grnDate, query.dateFrom));
  }
  if (query.dateTo) {
    conditions.push(lte(grns.grnDate, query.dateTo));
  }
  if (query.vendorId) {
    conditions.push(eq(grns.vendorId, parseInt(query.vendorId, 10)));
  }
  if (query.poNo) {
    conditions.push(inArray(grns.poId, db.select({ id: purchaseOrders.id }).from(purchaseOrders).where(ilike(purchaseOrders.poNo, `%${query.poNo}%`))));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(grns)
    .where(whereClause);
  const total = Number(countResult.count);

  const rows = await db.query.grns.findMany({
    where: whereClause,
    limit: limit ?? undefined,
    offset: offset ?? undefined,
    orderBy: [desc(grns.createdAt)],
    with: {
      vendor: true,
      purchaseOrder: true
    }
  });

  return c.json({
    data: rows,
    meta: {
      total,
      page: page ?? 1,
      limit: limit ?? total,
      totalPages: limit ? Math.ceil(total / limit) : 1
    }
  });
})
  .post("/grns", async (c) => {
  const input = await jsonBody(c, grnInput);
  const session = await c.get("session");
  const userId = session?.user?.id;

  if (!input.poId && !input.noPoReason) {
    return c.json({ error: "Reason is required for Direct GRNs without a PO" }, 400);
  }
  if (!input.poId && !input.vendorId) {
    return c.json({ error: "Vendor is required for Direct GRNs" }, 400);
  }

  try {
    const result = await db.transaction(async (tx) => {
      let grnNo = input.grnNo?.trim();

      if (grnNo) {
        const [existingGrn] = await tx.select().from(grns).where(eq(grns.grnNo, grnNo));
        if (existingGrn) throw new Error("GRN number already exists");
      } else {
        const year = new Date().getFullYear().toString().slice(-2);
        const [countResult] = await tx.select({ count: sql<number>`count(*)` }).from(grns);
        const seq = Number(countResult.count) + 1;
        grnNo = input.poId ? `GRN${seq.toString().padStart(5, '0')}-${year}` : `DIRECT-GRN${seq.toString().padStart(5, '0')}-${year}`;
      }

      const [grn] = await tx.insert(grns).values({
        poId: input.poId || null,
        vendorId: input.vendorId || null,
        noPoReason: input.noPoReason || null,
        grnNo,
        grnDate: input.grnDate,
        dateOfDelivery: input.dateOfDelivery,
        remarks: input.remarks,
        status: input.status as any,
        createdBy: userId,
      }).returning();

      if (input.items.length > 0) {
        await tx.insert(grnItems).values(
          input.items.map(item => ({
            grnId: grn.id,
            poItemId: item.poItemId ?? null,
            itemId: item.itemId ?? null,
            itemName: item.itemName ?? null,
            receivedQty: item.receivedQty,
            freeQty: item.freeQty,
            unitRate: item.unitRate ?? 0,
            gstPercent: item.gstPercent ?? 0,
            lineValue: item.unitRate ? (item.unitRate * item.receivedQty) : 0,
            batch: item.batch,
            expiryDate: item.expiryDate,
            notes: item.notes,
          }))
        );
      }

      if (input.poId) {
        await recalculatePoStatus(tx, input.poId);
      }

      return grn;
    });

    return c.json(result, 201);
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to create GRN" }, 400);
  }
})
  .get("/grns/:grnId", async (c) => {
  const { id: grnId } = idParam.parse({ id: parseInt(c.req.param('grnId') as string) });
  const grn = await db.query.grns.findFirst({
    where: eq(grns.id, grnId),
    with: {
      items: {
        with: {
          item: true,
          poItem: true,
        }
      },
      vendor: true,
      purchaseOrder: true,
    }
  });

  if (!grn) return c.json({ error: "GRN not found" }, 404);
  return c.json(grn);
})
  .patch("/grns/:grnId", async (c) => {
  const { id: grnId } = idParam.parse({ id: parseInt(c.req.param('grnId') as string) });
  const input = await jsonBody(c, grnInput);

  const [existingGrn] = await db.select().from(grns).where(eq(grns.id, grnId));
  if (!existingGrn) return c.json({ error: "GRN not found" }, 404);
  if (existingGrn.status !== 'draft') {
    return c.json({ error: "Only draft GRNs can be edited or posted" }, 400);
  }

  try {
    const result = await db.transaction(async (tx) => {
      let grnNo = input.grnNo?.trim() || existingGrn.grnNo;

      if (input.grnNo && input.grnNo !== existingGrn.grnNo) {
        const [dup] = await tx.select().from(grns).where(and(eq(grns.grnNo, grnNo), sql`${grns.id} != ${grnId}`));
        if (dup) throw new Error("GRN number already exists");
      }

      const [grn] = await tx.update(grns).set({
        vendorId: input.vendorId || existingGrn.vendorId,
        noPoReason: input.noPoReason || existingGrn.noPoReason,
        grnNo,
        grnDate: input.grnDate,
        dateOfDelivery: input.dateOfDelivery,
        remarks: input.remarks,
        status: input.status as any,
      }).where(eq(grns.id, grnId)).returning();

      await tx.delete(grnItems).where(eq(grnItems.grnId, grnId));

      if (input.items.length > 0) {
        await tx.insert(grnItems).values(
          input.items.map(item => ({
            grnId: grnId,
            poItemId: item.poItemId ?? null,
            itemId: item.itemId ?? null,
            itemName: item.itemName ?? null,
            receivedQty: item.receivedQty,
            freeQty: item.freeQty,
            unitRate: item.unitRate ?? 0,
            gstPercent: item.gstPercent ?? 0,
            lineValue: item.unitRate ? (item.unitRate * item.receivedQty) : 0,
            batch: item.batch,
            expiryDate: item.expiryDate,
            notes: item.notes,
          }))
        );
      }

      if (existingGrn.poId) {
        await recalculatePoStatus(tx, existingGrn.poId);
      }
      return grn;
    });

    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to update GRN" }, 400);
  }
})

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
  .post("/purchase-orders/:id/payments", async (c) => {
  const { id: poId } = idParam.parse(c.req.param());
  const input = await jsonBody(c, paymentInput);
  const session = await c.get("session");
  const userId = session?.user?.id;

  const result = await db.transaction(async (tx) => {
    const [payment] = await tx.insert(poPayments).values({
      poId,
      paymentDate: input.paymentDate,
      amount: input.amount,
      paymentMode: input.paymentMode,
      referenceNo: input.referenceNo,
      remarks: input.remarks,
      createdBy: userId,
    }).returning();

    await recalculatePoStatus(tx, poId);

    return payment;
  })

  return c.json(result, 201);
})
  .delete("/payments/:paymentId", requireAdmin, async (c) => {
  const { id: paymentId } = idParam.parse({ id: parseInt(c.req.param('paymentId') as string) })
  
  await db.transaction(async (tx) => {
    const [payment] = await tx.select().from(poPayments).where(eq(poPayments.id, paymentId));
    if (!payment) return;
    
    await tx.delete(poPayments).where(eq(poPayments.id, paymentId));
    await recalculatePoStatus(tx, payment.poId);
  })

  return c.json({ success: true  });
})
  // ---------------------------------------------------------------------------
  // Item Types & Items
  // ---------------------------------------------------------------------------
  .get("/item-types", async (c) => {
    const rows = await db.select().from(itemTypes).orderBy(itemTypes.name);
    return c.json(rows);
  })
  .post("/item-types", async (c) => {
    const input = await jsonBody(c, z.object({
      name: z.string().min(2),
      description: z.string().optional().nullable(),
    }));
    const [row] = await db.insert(itemTypes).values(input).returning();
    return c.json(row, 201);
  })
  .patch("/item-types/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, z.object({
      name: z.string().min(2).optional(),
      description: z.string().optional().nullable(),
    }));
    const [row] = await db.update(itemTypes).set(input).where(eq(itemTypes.id, id)).returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  })
  .delete("/item-types/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const [row] = await db.delete(itemTypes).where(eq(itemTypes.id, id)).returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true });
  })
  .get("/items", async (c) => {
    const query = c.req.query();
    const page = query.page ? parseInt(query.page, 10) : undefined;
    const limit = query.limit ? parseInt(query.limit, 10) : undefined;
    const offset = page && limit ? (page - 1) * limit : undefined;

    const conditions = [];
    if (query.name) {
      conditions.push(ilike(items.name, `%${query.name}%`));
    }
    if (query.itemTypeId && query.itemTypeId !== "all") {
      conditions.push(eq(items.itemTypeId, parseInt(query.itemTypeId, 10)));
    }

    // Get total count
    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(items);

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as any;
    }
    const [countResult] = await countQuery;
    const total = countResult?.count || 0;

    let baseQuery = db
      .select({
        id: items.id,
        name: items.name,
        itemTypeId: items.itemTypeId,
        itemTypeName: itemTypes.name,
        unit: items.unit,
        rate: items.rate,
        gstPercent: items.gstPercent,
        createdAt: items.createdAt,
        updatedAt: items.updatedAt,
      })
      .from(items)
      .leftJoin(itemTypes, eq(items.itemTypeId, itemTypes.id));

    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions)) as any;
    }

    let finalQuery = baseQuery.orderBy(items.name);

    if (limit !== undefined && offset !== undefined) {
      finalQuery = finalQuery.limit(limit).offset(offset) as any;
    }

    const rows = await finalQuery.execute();

    if (page !== undefined || limit !== undefined) {
      const activeLimit = limit ?? 10;
      return c.json({
        data: rows,
        total,
        page: page ?? 1,
        limit: activeLimit,
        totalPages: Math.ceil(total / activeLimit)
      });
    }

    return c.json(rows);
  })
  .post("/items", async (c) => {
    const input = await jsonBody(c, z.object({
      name: z.string().min(2),
      itemTypeId: z.number().int().positive(),
      unit: z.string().min(1),
      rate: z.coerce.number().min(0),
      gstPercent: z.coerce.number().min(0).optional().default(0),
    }));
    const [row] = await db.insert(items).values(input).returning();
    return c.json(row, 201);
  })
  .patch("/items/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, z.object({
      name: z.string().min(2).optional(),
      itemTypeId: z.number().int().positive().optional(),
      unit: z.string().min(1).optional(),
      rate: z.coerce.number().min(0).optional(),
      gstPercent: z.coerce.number().min(0).optional(),
    }));
    const [row] = await db.update(items).set(input).where(eq(items.id, id)).returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  })
  .delete("/items/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const [row] = await db.delete(items).where(eq(items.id, id)).returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true });
  })
;
export type PurchasesRoutes = typeof purchasesRoutes;