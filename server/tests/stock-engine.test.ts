import { db } from "../db/client.ts";
import { findOrCreateBatch, recordStockMovement } from "../services/stock-engine.ts";
import { allocateBatchesFefo } from "../services/fefo.ts";
import { calculateLineTax, calculateInvoiceSummary } from "../services/gst.ts";
import { stores, itemBatches, storeBatchStock, stockLedger } from "../db/schema-inventory.ts";
import { items, itemTypes } from "../db/schema.ts";
import { eq } from "drizzle-orm";

async function runStockEngineTests() {
  console.log("=== Testing Stock Engine & FEFO Allocation Services ===");

  try {
    // 1. Setup or find a test store and item
    let [testStore] = await db.select().from(stores).limit(1);
    if (!testStore) {
      [testStore] = await db
        .insert(stores)
        .values({
          name: "Test Pharmacy Store",
          code: "TEST-STORE",
          type: "retail_pharmacy",
          active: true,
        })
        .returning();
    }

    let [testItemType] = await db.select().from(itemTypes).limit(1);
    if (!testItemType) {
      [testItemType] = await db
        .insert(itemTypes)
        .values({
          name: "Pharmaceuticals",
        })
        .returning();
    }

    const [testItem] = await db
      .insert(items)
      .values({
        name: `Test Medicine ${Date.now()}`,
        itemTypeId: testItemType.id,
        unit: "strip",
        rate: 50,
        salePrice: 100,
        gstPercent: 12,
        reorderLevel: 10,
        reorderQty: 50,
      })
      .returning();

    console.log(`✓ Test item created: ${testItem.name} (ID: ${testItem.id}) in Store: ${testStore.name}`);

    // 2. Create Batch A (Expiring in 60 days) and Batch B (Expiring in 30 days)
    const expDateA = new Date();
    expDateA.setDate(expDateA.getDate() + 60);
    const expDateAStr = expDateA.toISOString().split("T")[0];

    const expDateB = new Date();
    expDateB.setDate(expDateB.getDate() + 30);
    const expDateBStr = expDateB.toISOString().split("T")[0];

    let batchA: any;
    let batchB: any;

    await db.transaction(async (tx) => {
      batchA = await findOrCreateBatch(tx, {
        itemId: testItem.id,
        batchNumber: `BATCH-A-${Date.now()}`,
        expiryDate: expDateAStr,
        purchaseRate: 50,
        saleRate: 100,
        mrp: 100,
      });

      batchB = await findOrCreateBatch(tx, {
        itemId: testItem.id,
        batchNumber: `BATCH-B-${Date.now()}`,
        expiryDate: expDateBStr,
        purchaseRate: 50,
        saleRate: 100,
        mrp: 100,
      });

      // Inward movement 20 units into Batch A
      await recordStockMovement(tx, {
        storeId: testStore.id,
        itemId: testItem.id,
        batchId: batchA.id,
        movementType: "GRN",
        quantityChange: 20,
        costPrice: 50,
        salePrice: 100,
      });

      // Inward movement 30 units into Batch B (Earlier expiry)
      await recordStockMovement(tx, {
        storeId: testStore.id,
        itemId: testItem.id,
        batchId: batchB.id,
        movementType: "GRN",
        quantityChange: 30,
        costPrice: 50,
        salePrice: 100,
      });
    });

    console.log("✓ Created 2 Batches (Batch A: 20 qty @ 60d expiry, Batch B: 30 qty @ 30d expiry)");

    // 3. Test FEFO Allocation: Request 35 units
    // Should allocate all 30 from Batch B (earlier expiry) and 5 from Batch A
    console.log("Testing FEFO allocation for 35 units...");
    const allocations = await db.transaction(async (tx) => {
      return await allocateBatchesFefo(tx, testStore.id, testItem.id, 35);
    });

    console.log("FEFO Allocations:", allocations);
    if (allocations.length !== 2) {
      throw new Error(`Expected 2 allocations, got ${allocations.length}`);
    }
    if (allocations[0].batchId !== batchB.id || allocations[0].quantity !== 30) {
      throw new Error(`FEFO failure: Expected 30 qty from Batch B (ID ${batchB.id}), got ${allocations[0].quantity} from ID ${allocations[0].batchId}`);
    }
    if (allocations[1].batchId !== batchA.id || allocations[1].quantity !== 5) {
      throw new Error(`FEFO failure: Expected 5 qty from Batch A (ID ${batchA.id}), got ${allocations[1].quantity} from ID ${allocations[1].batchId}`);
    }
    console.log("✓ FEFO allocation strictly adhered to expiration date priority!");

    // 4. Test Negative Stock Prevention
    console.log("Testing Negative Stock Prevention...");
    let caughtInsufficientStock = false;
    try {
      await db.transaction(async (tx) => {
        // Try to deduct 100 units from Batch A which only has 20 units
        await recordStockMovement(tx, {
          storeId: testStore.id,
          itemId: testItem.id,
          batchId: batchA.id,
          movementType: "SALE",
          quantityChange: -100,
        });
      });
    } catch (err: any) {
      caughtInsufficientStock = true;
      console.log("✓ Negative stock successfully blocked:", err.message);
    }

    if (!caughtInsufficientStock) {
      throw new Error("Pessimistic locking failed to block negative stock!");
    }

    // 5. Test GST calculation engine
    console.log("Testing GST Calculation Service...");
    const lineResult = calculateLineTax({
      quantity: 10,
      unitRate: 100,
      discountPercent: 10, // 900
      gstPercent: 18,      // CGST 81, SGST 81
    });

    const invoiceSummary = calculateInvoiceSummary([lineResult]);

    console.log("Invoice Summary:", invoiceSummary);
    if (invoiceSummary.taxableAmount !== 900 || invoiceSummary.cgstAmount !== 81 || invoiceSummary.sgstAmount !== 81 || invoiceSummary.netAmount !== 1062) {
      throw new Error("GST Calculation mismatch!");
    }
    console.log("✓ GST calculations verified with exact intrastate CGST/SGST split and round-off!");

    console.log("\n All Stock Engine & FEFO tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Stock Engine Test Failed:", err);
    process.exit(1);
  }
}

runStockEngineTests();
