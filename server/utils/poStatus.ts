import { eq, sql } from "drizzle-orm";
import { purchaseOrders, poItems, grnItems, poPayments, grns } from "../db/schema.ts";

export const toNum = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

export function computePoStatus(items: { ordered_qty: number | string; receivedQty: number | string }[]): 'open' | 'partial' | 'closed' {
  if (items.length === 0) return 'open';
  
  const allClosed = items.every(item => toNum(item.receivedQty) >= toNum(item.ordered_qty));
  if (allClosed) return 'closed';

  const allOpen = items.every(item => toNum(item.receivedQty) === 0);
  if (allOpen) return 'open';

  return 'partial';
}

export function computePaymentStatus(totalValue: number | string, paidAmount: number | string): 'unpaid' | 'partial' | 'paid' {
  const total = toNum(totalValue);
  const paid = toNum(paidAmount);
  
  if (paid === 0) return 'unpaid';
  if (paid >= total) return 'paid';
  return 'partial';
}

/**
 * Recalculates both PO status and payment status, and saves them in the database.
 * Must be executed within a Drizzle transaction context.
 */
export async function recalculatePoStatus(db: any, poId: number): Promise<void> {
  // 1. Fetch the PO total value
  const poResult = await db.select({
    totalValue: purchaseOrders.totalValue
  }).from(purchaseOrders).where(eq(purchaseOrders.id, poId));
  
  if (poResult.length === 0) return;
  const totalValue = toNum(poResult[0].totalValue);

  // 2. Fetch the sum of payments for this PO
  const paymentsResult = await db.select({
    totalPaid: sql<string>`coalesce(sum(${poPayments.amount}), 0)`
  }).from(poPayments).where(eq(poPayments.poId, poId));
  
  const totalPaid = toNum(paymentsResult[0]?.totalPaid ?? 0);

  // 3. Fetch each PO item along with the sum of received quantities from non-draft GRNs
  const itemsWithReceived = await db.select({
    ordered_qty: poItems.orderedQty,
    receivedQty: sql<string>`coalesce(sum(case when ${grns.status} != 'draft' then ${grnItems.receivedQty} + ${grnItems.freeQty} else 0 end), 0)`
  })
  .from(poItems)
  .leftJoin(grnItems, eq(grnItems.poItemId, poItems.id))
  .leftJoin(grns, eq(grns.id, grnItems.grnId))
  .where(eq(poItems.poId, poId))
  .groupBy(poItems.id);

  // 4. Compute statuses
  const poStatus = computePoStatus(itemsWithReceived);
  const paymentStatus = computePaymentStatus(totalValue, totalPaid);

  // 5. Update purchase_orders inside the transaction
  await db.update(purchaseOrders)
    .set({
      poStatus,
      paymentStatus
    })
    .where(eq(purchaseOrders.id, poId));
}
