import { eq, and, sql } from "drizzle-orm";
import {
  itemBatches,
  storeBatchStock,
  stockLedger,
  type stockMovementTypeEnum,
} from "../db/schema-inventory.ts";

export type StockMovementType = (typeof stockMovementTypeEnum.enumValues)[number];

export interface BatchInput {
  itemId: number;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  mrp?: number;
  purchaseRate?: number;
  saleRate?: number;
  supplierId?: number | null;
  mfgDate?: string | null;
  barcode?: string | null;
}

export interface StockMovementInput {
  storeId: number;
  itemId: number;
  batchId: number;
  movementType: StockMovementType;
  referenceType?: string; // 'GRN', 'SALE_INVOICE', 'TRANSFER', 'ADJUSTMENT'
  referenceId?: number;
  quantityChange: number; // positive for inward, negative for outward
  costPrice?: number;
  salePrice?: number;
  userId?: string | null;
}

export async function findOrCreateBatch(tx: any, input: BatchInput) {
  const batchNum = input.batchNumber.trim().toUpperCase();

  const [existing] = await tx
    .select()
    .from(itemBatches)
    .where(and(eq(itemBatches.itemId, input.itemId), eq(itemBatches.batchNumber, batchNum)))
    .execute();

  if (existing) {
    return existing;
  }

  const [created] = await tx
    .insert(itemBatches)
    .values({
      itemId: input.itemId,
      batchNumber: batchNum,
      expiryDate: input.expiryDate,
      mfgDate: input.mfgDate || null,
      mrp: input.mrp ?? 0,
      purchaseRate: input.purchaseRate ?? 0,
      saleRate: input.saleRate ?? 0,
      supplierId: input.supplierId || null,
      barcode: input.barcode || null,
      isActive: true,
    })
    .returning();

  return created;
}

export async function recordStockMovement(tx: any, input: StockMovementInput) {
  const {
    storeId,
    itemId,
    batchId,
    movementType,
    referenceType,
    referenceId,
    quantityChange,
    costPrice = 0,
    salePrice = 0,
    userId = null,
  } = input;

  if (quantityChange === 0) {
    throw new Error("Quantity change cannot be zero");
  }

  // 1. Lock store_batch_stock FOR UPDATE to prevent race conditions
  const lockedRows = await tx
    .select()
    .from(storeBatchStock)
    .where(and(eq(storeBatchStock.storeId, storeId), eq(storeBatchStock.batchId, batchId)))
    .for("update")
    .execute();

  let stockRow = lockedRows[0];
  let currentOnHand = stockRow ? Number(stockRow.quantityOnHand) : 0;
  let currentAllocated = stockRow ? Number(stockRow.allocatedQty) : 0;

  const newOnHand = currentOnHand + quantityChange;

  // 2. Prevent negative stock
  if (quantityChange < 0 && newOnHand < 0) {
    throw new Error(
      `Insufficient stock available for store #${storeId}, batch #${batchId}. Current stock: ${currentOnHand}, Requested: ${Math.abs(
        quantityChange
      )}`
    );
  }

  const newAvailable = newOnHand - currentAllocated;

  // 3. Upsert store_batch_stock balance
  if (stockRow) {
    const [updated] = await tx
      .update(storeBatchStock)
      .set({
        quantityOnHand: newOnHand,
        availableQty: newAvailable,
        updatedAt: new Date(),
      })
      .where(eq(storeBatchStock.id, stockRow.id))
      .returning();
    stockRow = updated;
  } else {
    const [inserted] = await tx
      .insert(storeBatchStock)
      .values({
        storeId,
        itemId,
        batchId,
        quantityOnHand: newOnHand,
        allocatedQty: 0,
        availableQty: newOnHand,
      })
      .returning();
    stockRow = inserted;
  }

  // 4. Append row to immutable stock_ledger
  const [ledgerEntry] = await tx
    .insert(stockLedger)
    .values({
      storeId,
      itemId,
      batchId,
      movementType,
      referenceType: referenceType || String(movementType),
      referenceId: referenceId || 0,
      quantityChange,
      balanceAfter: newOnHand,
      costPrice,
      salePrice,
      createdBy: userId,
    })
    .returning();

  return { stockRow, ledgerEntry };
}
