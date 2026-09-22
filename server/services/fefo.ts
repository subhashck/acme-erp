import { eq, and, sql, asc } from "drizzle-orm";
import { storeBatchStock, itemBatches } from "../db/schema-inventory.ts";

export type DrizzleTransaction = any;

export interface BatchAllocation {
  batchId: number;
  batchNumber: string;
  quantity: number;
  unitRate: number;
  mrp: number;
  expiryDate: string;
}

/**
 * FEFO (First-Expiry, First-Out) Batch Allocation Engine
 * Queries store batches ordered by expiryDate ASC and allocates requested quantity.
 */
export async function allocateBatchesFefo(
  tx: DrizzleTransaction,
  storeId: number,
  itemId: number,
  requiredQty: number
): Promise<BatchAllocation[]> {
  if (requiredQty <= 0) {
    throw new Error("Required quantity must be greater than zero");
  }

  // Fetch batches with available stock in the target store
  const availableBatches = await tx
    .select({
      batchId: storeBatchStock.batchId,
      batchNumber: itemBatches.batchNumber,
      expiryDate: itemBatches.expiryDate,
      purchaseRate: itemBatches.purchaseRate,
      mrp: itemBatches.mrp,
      saleRate: itemBatches.saleRate,
      availableQty: storeBatchStock.availableQty,
    })
    .from(storeBatchStock)
    .innerJoin(itemBatches, eq(storeBatchStock.batchId, itemBatches.id))
    .where(
      and(
        eq(storeBatchStock.storeId, storeId),
        eq(storeBatchStock.itemId, itemId),
        sql`${storeBatchStock.availableQty} > 0`
      )
    )
    .orderBy(asc(itemBatches.expiryDate), asc(itemBatches.id));

  let remaining = requiredQty;
  const allocations: BatchAllocation[] = [];

  for (const batch of availableBatches) {
    const avail = Number(batch.availableQty);
    if (avail <= 0) continue;

    const takeQty = Math.min(avail, remaining);
    allocations.push({
      batchId: batch.batchId,
      batchNumber: batch.batchNumber,
      quantity: takeQty,
      unitRate: Number(batch.saleRate || batch.mrp || batch.purchaseRate || 0),
      mrp: Number(batch.mrp || 0),
      expiryDate: batch.expiryDate || "",
    });

    remaining -= takeQty;
    if (remaining <= 0.0001) break; // Float tolerance
  }

  if (remaining > 0.0001) {
    const totalAvail = availableBatches.reduce((acc: number, b: any) => acc + Number(b.availableQty), 0);
    throw new Error(
      `Insufficient stock. Required: ${requiredQty}, Available: ${totalAvail} across ${availableBatches.length} batches.`
    );
  }

  return allocations;
}
