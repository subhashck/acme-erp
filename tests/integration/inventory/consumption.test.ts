import { describe, it, expect, beforeAll } from "vitest";
import { cleanAllTables } from "../../setup/test-db.ts";
import { api } from "../../setup/auth-helper.ts";
import {
  createTestVendor,
  createTestItem,
  createTestStore,
  createTestUnitType,
  resetSeedCounters,
} from "../../setup/seed-helpers.ts";
import { db } from "../../../server/db/client.ts";
import { departments, departmentLeaders, staff, items } from "../../../server/db/schema.ts";
import { storeBatchStock, stockLedger, itemBatches } from "../../../server/db/schema-inventory.ts";
import { eq, and } from "drizzle-orm";

describe("Internal Consumables & Consumption Vouchers", () => {
  let storeId: number;
  let itemId: number;
  let vendorId: number;
  let batchId: number;
  let voucherId: number;
  let returnId: number;

  beforeAll(async () => {
    await cleanAllTables();
    resetSeedCounters();

    // 1. Create a department
    const [dept] = await db
      .insert(departments)
      .values({
        name: "Operation Theatre",
        floor: "2nd Floor",
        head: "Dr. Surgeon",
        active: true,
        isClinical: true,
      })
      .returning();

    // 2. Create store linked to this department
    const store = await createTestStore({
      name: "OT Consumables Store",
      code: "OT-STR-01",
      departmentId: dept.id,
      isDefault: true,
    });
    storeId = store.id;

    // 3. Create non-saleable consumable item
    const unit = await createTestUnitType({ name: "Pair", symbol: "PR" });
    const item = await createTestItem({
      name: "Sterile Surgical Gloves 7.5",
      mrp: 100,
      purchaseRate: 40,
      saleRate: 0,
      isSaleable: false,
    });
    itemId = item.id;

    // 4. Seed stock via GRN
    const vendor = await createTestVendor({ name: "MedSupply Corp" });
    vendorId = vendor.id;

    const grnRes = await api.post("/api/grns", {
      grnDate: new Date().toISOString().slice(0, 10),
      vendorId,
      storeId,
      status: "posted",
      noPoReason: "Initial consumables stock",
      items: [
        {
          itemId,
          itemName: "Sterile Surgical Gloves 7.5",
          receivedQty: 50,
          freeQty: 0,
          unitRate: 40,
          salePrice: 0,
          gstPercent: 5,
          batch: "GLV-2026-01",
          expiryDate: "2028-12-31",
        },
      ],
    });
    expect(grnRes.status).toBe(201);

    // Look up generated batch
    const [batch] = await db
      .select()
      .from(itemBatches)
      .where(and(eq(itemBatches.itemId, itemId), eq(itemBatches.batchNumber, "GLV-2026-01")));
    expect(batch).toBeDefined();
    batchId = batch.id;
  });

  it("should NOT return non-saleable item in POS item search", async () => {
    const res = await api.get(`/api/inventory/pos/item-search?search=Gloves&storeId=${storeId}`);
    expect(res.status).toBe(200);
    const results = await res.json();
    const found = results.find((r: any) => r.itemId === itemId);
    expect(found).toBeUndefined();
  });

  it("should create a draft consumption voucher", async () => {
    const res = await api.post("/api/inventory/consumptions", {
      storeId,
      purpose: "Emergency appendectomy surgeries",
      remarks: "Batch usage for OT room 2",
      items: [
        {
          itemId,
          batchId,
          quantity: 10,
          unitRate: 40,
          totalCost: 400,
        },
      ],
    });

    expect(res.status).toBe(201);
    const vch = await res.json();
    expect(vch.voucherNo).toMatch(/^CVCH\//);
    expect(vch.status).toBe("draft");
    expect(vch.storeId).toBe(storeId);
    voucherId = vch.id;
  });

  it("should fetch consumption voucher details with lines and derived department", async () => {
    const res = await api.get(`/api/inventory/consumptions/${voucherId}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(voucherId);
    expect(data.departmentName).toBe("Operation Theatre");
    expect(data.items.length).toBe(1);
    expect(Number(data.items[0].quantity)).toBe(10);
    expect(Number(data.items[0].totalCost)).toBe(400);
  });

  it("should post consumption voucher and decrement stock in ledger", async () => {
    // Check initial stock (should be 50)
    const [preStock] = await db
      .select()
      .from(storeBatchStock)
      .where(and(eq(storeBatchStock.storeId, storeId), eq(storeBatchStock.batchId, batchId)));
    expect(Number(preStock.quantityOnHand)).toBe(50);

    const postRes = await api.post(`/api/inventory/consumptions/${voucherId}/post`, {});
    expect(postRes.status).toBe(200);
    const postData = await postRes.json();
    expect(postData.success).toBe(true);

    // Verify stock is now 40
    const [postStock] = await db
      .select()
      .from(storeBatchStock)
      .where(and(eq(storeBatchStock.storeId, storeId), eq(storeBatchStock.batchId, batchId)));
    expect(Number(postStock.quantityOnHand)).toBe(40);

    // Verify ledger has CONSUMPTION movement
    const [ledgerEntry] = await db
      .select()
      .from(stockLedger)
      .where(
        and(
          eq(stockLedger.storeId, storeId),
          eq(stockLedger.batchId, batchId),
          eq(stockLedger.movementType, "CONSUMPTION")
        )
      );
    expect(ledgerEntry).toBeDefined();
    expect(Number(ledgerEntry.quantityChange)).toBe(-10);
    expect(ledgerEntry.referenceType).toBe("CONSUMPTION_VOUCHER");
  });

  it("should create a draft consumption return against the posted voucher", async () => {
    const res = await api.post("/api/inventory/consumption-returns", {
      storeId,
      originalVoucherId: voucherId,
      reason: "Surplus gloves returned unused in sealed pack",
      items: [
        {
          itemId,
          batchId,
          returnedQty: 3,
          unitRate: 40,
        },
      ],
    });

    expect(res.status).toBe(201);
    const ret = await res.json();
    expect(ret.returnNo).toMatch(/^CRET\//);
    expect(ret.status).toBe("draft");
    returnId = ret.id;
  });

  it("should post consumption return and restore stock in ledger", async () => {
    const postRes = await api.post(`/api/inventory/consumption-returns/${returnId}/post`, {});
    expect(postRes.status).toBe(200);

    // Verify stock is now 43 (40 + 3 returned)
    const [postStock] = await db
      .select()
      .from(storeBatchStock)
      .where(and(eq(storeBatchStock.storeId, storeId), eq(storeBatchStock.batchId, batchId)));
    expect(Number(postStock.quantityOnHand)).toBe(43);

    // Verify ledger has CONSUMPTION_RETURN movement
    const [ledgerEntry] = await db
      .select()
      .from(stockLedger)
      .where(
        and(
          eq(stockLedger.storeId, storeId),
          eq(stockLedger.batchId, batchId),
          eq(stockLedger.movementType, "CONSUMPTION_RETURN")
        )
      );
    expect(ledgerEntry).toBeDefined();
    expect(Number(ledgerEntry.quantityChange)).toBe(3);
    expect(ledgerEntry.referenceType).toBe("CONSUMPTION_RETURN");
  });
});
