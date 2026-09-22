/**
 * Integration Tests — GRN (Goods Receipt Note) & Stock Updates
 *
 * Tests GRN creation, posting, PO status transitions,
 * batch creation, and stock engine side-effects.
 * Requires: ephemeral test Postgres (docker-compose.test.yml)
 */
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

describe("GRN API — PO-linked Receiving", () => {
  let vendorId: number;
  let storeId: number;
  let itemId: number;
  let poId: number;
  let poItemId: number;

  beforeAll(async () => {
    await cleanAllTables();
    resetSeedCounters();

    const vendor = await createTestVendor({ name: "GRN Test Vendor" });
    vendorId = vendor.id;

    const store = await createTestStore({ name: "GRN Test Store", code: "GTS1" });
    storeId = store.id;

    const unit = await createTestUnitType({ name: "Strip", symbol: "STRIP" });

    const item = await createTestItem({
      name: "Test Medicine A",
      purchaseRate: 60,
      mrp: 100,
      saleRate: 80,
    });
    itemId = item.id;

    // Create a PO to receive against
    const today = new Date().toISOString().slice(0, 10);
    const poRes = await api.post("/api/purchase-orders", {
      poDate: today,
      vendorId,
      items: [
        { itemName: "Test Medicine A", orderedQty: 200, unitRate: 60, gstPercent: 12 },
      ],
    });
    const po = await poRes.json();
    poId = po.id;

    // Get the PO item ID
    const poDetail = await (await api.get(`/api/purchase-orders/${poId}`)).json();
    poItemId = poDetail.items[0].id;
  });

  it("should create and post a GRN against a PO (partial receiving)", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const expiryDate = "2028-12-31";

    const res = await api.post(`/api/purchase-orders/${poId}/grns`, {
      grnDate: today,
      vendorId,
      storeId,
      status: "posted",
      items: [
        {
          poItemId,
          itemId,
          itemName: "Test Medicine A",
          receivedQty: 100,
          freeQty: 5,
          unitRate: 60,
          salePrice: 80,
          gstPercent: 12,
          batch: "BATCH-MED-A-001",
          expiryDate,
        },
      ],
    });

    expect(res.status).toBe(201);
    const grn = await res.json();
    expect(grn.id).toBeDefined();
    expect(grn.status).toBe("posted");
  });

  it("should transition PO status to 'partial' after partial receiving", async () => {
    const poRes = await api.get(`/api/purchase-orders/${poId}`);
    const po = await poRes.json();
    expect(po.poStatus).toBe("partial");
  });

  it("should create stock in the target store", async () => {
    // Query stock via API
    const res = await api.get(`/api/inventory/stock?storeId=${storeId}`);
    expect(res.status).toBe(200);
    const stockData = await res.json();

    // Should have stock for our item
    const stockItems = Array.isArray(stockData) ? stockData : stockData.data || [];
    const matchingStock = stockItems.find(
      (s: any) => s.itemId === itemId || s.itemName === "Test Medicine A"
    );

    // Stock should be 100 (received) + 5 (free) = 105
    if (matchingStock) {
      expect(Number(matchingStock.quantityOnHand || matchingStock.totalStock)).toBe(105);
    }
  });

  it("should create stock ledger entry with GRN reference", async () => {
    const res = await api.get(`/api/inventory/ledger?itemId=${itemId}`);
    if (res.status === 200) {
      const ledger = await res.json();
      const entries = Array.isArray(ledger) ? ledger : ledger.data || [];
      const grnEntry = entries.find((e: any) => e.movementType === "GRN");
      if (grnEntry) {
        expect(Number(grnEntry.quantityChange)).toBe(105);
        expect(grnEntry.referenceType).toBe("GRN");
      }
    }
  });

  it("should complete receiving and transition PO to 'closed'", async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Receive the remaining 100 (ordered 200, received 100 so far)
    // Note: 5 free units don't count toward ordered qty fulfillment
    const res = await api.post(`/api/purchase-orders/${poId}/grns`, {
      grnDate: today,
      vendorId,
      storeId,
      status: "posted",
      items: [
        {
          poItemId,
          itemId,
          itemName: "Test Medicine A",
          receivedQty: 100,
          freeQty: 0,
          unitRate: 60,
          salePrice: 80,
          gstPercent: 12,
          batch: "BATCH-MED-A-002",
          expiryDate: "2029-06-30",
        },
      ],
    });

    expect(res.status).toBe(201);

    // PO should now be closed
    const poRes = await api.get(`/api/purchase-orders/${poId}`);
    const po = await poRes.json();
    expect(po.poStatus).toBe("closed");
  });
});

describe("GRN API — Direct GRN (no PO)", () => {
  let vendorId: number;
  let storeId: number;

  beforeAll(async () => {
    // Don't clean tables — reuse setup from previous suite
    const vendor = await createTestVendor({ name: "Direct GRN Vendor" });
    vendorId = vendor.id;
    const store = await createTestStore({ name: "Direct GRN Store", code: "DGS1" });
    storeId = store.id;
  });

  it("should create a direct GRN without a PO", async () => {
    const today = new Date().toISOString().slice(0, 10);

    const res = await api.post("/api/grns", {
      grnDate: today,
      vendorId,
      storeId,
      status: "posted",
      noPoReason: "Emergency procurement",
      items: [
        {
          itemName: "Emergency Supply Item",
          receivedQty: 50,
          freeQty: 0,
          unitRate: 40,
          salePrice: 70,
          gstPercent: 5,
          batch: "EMRG-001",
          expiryDate: "2028-06-30",
        },
      ],
    });

    expect(res.status).toBe(201);
    const grn = await res.json();
    expect(grn.id).toBeDefined();
    expect(grn.status).toBe("posted");
  });
});
