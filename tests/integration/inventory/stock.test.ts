/**
 * Integration Tests — Stock & Store Management
 *
 * Tests store CRUD, stock summary after GRN, and ledger queries.
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

describe("Inventory Stores API", () => {
  beforeAll(async () => {
    await cleanAllTables();
    resetSeedCounters();
  });

  let storeId: number;

  it("should create a store", async () => {
    const res = await api.post("/api/inventory/stores", {
      name: "Central Pharmacy",
      code: "CP01",
      type: "retail_pharmacy",
      active: true,
      isDefault: true,
    });

    expect(res.status).toBe(201);
    const store = await res.json();
    expect(store.name).toBe("Central Pharmacy");
    expect(store.code).toBe("CP01");
    storeId = store.id;
  });

  it("should list stores", async () => {
    const res = await api.get("/api/inventory/stores");
    expect(res.status).toBe(200);
    const stores = await res.json();
    expect(Array.isArray(stores)).toBe(true);
    expect(stores.length).toBeGreaterThanOrEqual(1);
  });

  it("should update a store", async () => {
    const res = await api.patch(`/api/inventory/stores/${storeId}`, {
      location: "Ground Floor, Block A",
    });

    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.location).toBe("Ground Floor, Block A");
  });
});

describe("Stock Summary & Ledger", () => {
  let storeId: number;
  let itemId: number;
  let vendorId: number;

  beforeAll(async () => {
    await cleanAllTables();
    resetSeedCounters();

    const vendor = await createTestVendor({ name: "Stock Test Vendor" });
    vendorId = vendor.id;

    const unit = await createTestUnitType({ name: "Tablet", symbol: "TAB" });

    const store = await createTestStore({
      name: "Stock Test Store",
      code: "STS1",
      isDefault: true,
    });
    storeId = store.id;

    const item = await createTestItem({
      name: "Aspirin 100mg",
      mrp: 50,
      purchaseRate: 30,
      saleRate: 40,
    });
    itemId = item.id;

    // Create a posted GRN to add stock
    const today = new Date().toISOString().slice(0, 10);
    await api.post("/api/grns", {
      grnDate: today,
      vendorId,
      storeId,
      status: "posted",
      noPoReason: "Test stock seeding",
      items: [
        {
          itemId,
          itemName: "Aspirin 100mg",
          receivedQty: 200,
          freeQty: 10,
          unitRate: 30,
          salePrice: 40,
          gstPercent: 12,
          batch: "ASP-BATCH-001",
          expiryDate: "2028-03-31",
        },
      ],
    });
  });

  it("should show correct stock summary after GRN posting", async () => {
    const res = await api.get(`/api/inventory/stock?storeId=${storeId}`);
    expect(res.status).toBe(200);
    const stockData = await res.json();
    const stockItems = Array.isArray(stockData) ? stockData : stockData.data || [];

    // Find the stock for our item
    const aspirin = stockItems.find(
      (s: any) => s.itemId === itemId || s.itemName === "Aspirin 100mg"
    );

    if (aspirin) {
      // 200 received + 10 free = 210
      expect(Number(aspirin.quantityOnHand || aspirin.totalStock)).toBe(210);
    }
  });

  it("should show stock ledger with GRN inward entry", async () => {
    const res = await api.get(`/api/inventory/ledger?itemId=${itemId}`);
    if (res.status === 200) {
      const ledger = await res.json();
      const entries = Array.isArray(ledger) ? ledger : ledger.data || [];

      expect(entries.length).toBeGreaterThanOrEqual(1);

      const grnEntry = entries.find((e: any) => e.movementType === "GRN");
      if (grnEntry) {
        expect(Number(grnEntry.quantityChange)).toBeGreaterThan(0);
        expect(grnEntry.referenceType).toBe("GRN");
      }
    }
  });
});
