/**
 * Integration Tests — POS Sales, FEFO, and Returns
 *
 * The "crown jewel" test: full PO → GRN → Stock → POS Sale → Stock Depletion
 * pipeline. Also tests FEFO batch allocation, insufficient stock guard,
 * and sales returns with restocking.
 *
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

describe("POS Sales — Full PO-to-POS E2E Pipeline", () => {
  let vendorId: number;
  let storeId: number;
  let itemId: number;
  let batchId: number;
  let invoiceId: number;

  beforeAll(async () => {
    await cleanAllTables();
    resetSeedCounters();

    // 1. Create master data
    const vendor = await createTestVendor({ name: "E2E POS Vendor" });
    vendorId = vendor.id;

    await createTestUnitType({ name: "Strip", symbol: "STRIP" });

    const store = await createTestStore({
      name: "POS Test Pharmacy",
      code: "POS1",
      type: "retail_pharmacy",
      isDefault: true,
    });
    storeId = store.id;

    const item = await createTestItem({
      name: "Paracetamol 650mg",
      mrp: 30,
      purchaseRate: 18,
      saleRate: 25,
      gstPercent: 12,
    });
    itemId = item.id;

    // 2. Create PO
    const today = new Date().toISOString().slice(0, 10);
    const poRes = await api.post("/api/purchase-orders", {
      poDate: today,
      vendorId,
      items: [
        { itemName: "Paracetamol 650mg", orderedQty: 100, unitRate: 18, gstPercent: 12 },
      ],
    });
    const po = await poRes.json();
    const poDetail = await (await api.get(`/api/purchase-orders/${po.id}`)).json();
    const poItemId = poDetail.items[0].id;

    // 3. Post GRN to add stock
    const grnRes = await api.post(`/api/purchase-orders/${po.id}/grns`, {
      grnDate: today,
      vendorId,
      storeId,
      status: "posted",
      items: [
        {
          poItemId,
          itemId,
          itemName: "Paracetamol 650mg",
          receivedQty: 100,
          freeQty: 0,
          unitRate: 18,
          salePrice: 25,
          gstPercent: 12,
          batch: "PARA-BATCH-001",
          expiryDate: "2028-12-31",
        },
      ],
    });
    expect(grnRes.status).toBe(201);
  });

  it("should search items with available stock in POS", async () => {
    const res = await api.get(
      `/api/inventory/pos/item-search?storeId=${storeId}&search=Paracetamol`
    );
    expect(res.status).toBe(200);
    const results = await res.json();
    expect(results.length).toBeGreaterThanOrEqual(1);

    const match = results[0];
    expect(match.itemName).toContain("Paracetamol");
    expect(Number(match.quantityOnHand || match.availableQty)).toBe(100);
    expect(match.batchNumber).toBe("PARA-BATCH-001");

    // Save batchId for later
    batchId = match.batchId;
  });

  it("should complete a cash POS sale", async () => {
    const res = await api.post("/api/inventory/pos/invoices", {
      storeId,
      customerName: "John Doe",
      customerPhone: "9876543210",
      paymentMode: "cash",
      items: [
        {
          itemId,
          batchId,
          quantity: 10,
          unitRate: 25,
          mrp: 30,
          discountPercent: 0,
          gstPercent: 12,
        },
      ],
    });

    expect(res.status).toBe(201);
    const invoice = await res.json();
    expect(invoice.id).toBeDefined();
    expect(invoice.invoiceNo).toBeDefined();
    expect(invoice.status).toBe("completed");
    expect(invoice.paymentMode).toBe("cash");
    expect(invoice.customerName).toBe("John Doe");

    // Verify GST breakdown
    expect(Number(invoice.netAmount)).toBeGreaterThan(0);

    invoiceId = invoice.id;
  });

  it("should deduct stock after POS sale", async () => {
    const res = await api.get(
      `/api/inventory/pos/item-search?storeId=${storeId}&search=Paracetamol`
    );
    expect(res.status).toBe(200);
    const results = await res.json();
    const match = results.find((r: any) => r.batchNumber === "PARA-BATCH-001");

    // 100 initial - 10 sold = 90
    expect(Number(match?.quantityOnHand || match?.availableQty)).toBe(90);
  });

  it("should create a UPI POS sale", async () => {
    const res = await api.post("/api/inventory/pos/invoices", {
      storeId,
      customerName: "Jane Smith",
      paymentMode: "upi",
      items: [
        {
          itemId,
          batchId,
          quantity: 5,
          unitRate: 25,
          mrp: 30,
          gstPercent: 12,
        },
      ],
    });

    expect(res.status).toBe(201);
    const invoice = await res.json();
    expect(invoice.paymentMode).toBe("upi");
  });

  it("should reject sale when stock is insufficient", async () => {
    const res = await api.post("/api/inventory/pos/invoices", {
      storeId,
      customerName: "Greedy Buyer",
      paymentMode: "cash",
      items: [
        {
          itemId,
          batchId,
          quantity: 5000, // Way more than available
          unitRate: 25,
          mrp: 30,
          gstPercent: 12,
        },
      ],
    });

    // Should fail with 400
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.toLowerCase()).toContain("insufficient");
  });

  it("should list POS invoices with pagination", async () => {
    const res = await api.get(`/api/inventory/pos/invoices?storeId=${storeId}&page=1&limit=10`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.totalRecords).toBeGreaterThanOrEqual(2);
  });

  it("should get invoice detail by ID", async () => {
    const res = await api.get(`/api/inventory/pos/invoices/${invoiceId}`);
    expect(res.status).toBe(200);
    const invoice = await res.json();
    expect(invoice.id).toBe(invoiceId);
    expect(invoice.items).toBeDefined();
    expect(invoice.items.length).toBeGreaterThanOrEqual(1);
    expect(invoice.items[0].item).toBeDefined();
    expect(invoice.items[0].batch).toBeDefined();
  });
});

describe("POS Sales — FEFO Batch Allocation", () => {
  let storeId: number;
  let itemId: number;

  beforeAll(async () => {
    await cleanAllTables();
    resetSeedCounters();

    const vendor = await createTestVendor({ name: "FEFO Vendor" });
    await createTestUnitType({ name: "Tab", symbol: "TAB" });

    const store = await createTestStore({
      name: "FEFO Pharmacy",
      code: "FEFO1",
      isDefault: true,
    });
    storeId = store.id;

    const item = await createTestItem({
      name: "FEFO Test Drug",
      mrp: 50,
      purchaseRate: 30,
      saleRate: 40,
      gstPercent: 5,
    });
    itemId = item.id;

    // Create two batches with different expiry dates
    const today = new Date().toISOString().slice(0, 10);

    // Batch 1: Expires SOONER (2027-06-30) — should be sold first by FEFO
    await api.post("/api/grns", {
      grnDate: today,
      vendorId: vendor.id,
      storeId,
      status: "posted",
      noPoReason: "FEFO test batch 1",
      items: [
        {
          itemId,
          itemName: "FEFO Test Drug",
          receivedQty: 30,
          freeQty: 0,
          unitRate: 30,
          salePrice: 40,
          gstPercent: 5,
          batch: "FEFO-NEAR-EXPIRY",
          expiryDate: "2027-06-30",
        },
      ],
    });

    // Batch 2: Expires LATER (2029-12-31)
    await api.post("/api/grns", {
      grnDate: today,
      vendorId: vendor.id,
      storeId,
      status: "posted",
      noPoReason: "FEFO test batch 2",
      items: [
        {
          itemId,
          itemName: "FEFO Test Drug",
          receivedQty: 50,
          freeQty: 0,
          unitRate: 30,
          salePrice: 40,
          gstPercent: 5,
          batch: "FEFO-FAR-EXPIRY",
          expiryDate: "2029-12-31",
        },
      ],
    });
  });

  it("should allocate nearest-expiry batch first when batchId is null (FEFO)", async () => {
    // Sell 20 units WITHOUT specifying batchId — FEFO should pick NEAR-EXPIRY first
    const res = await api.post("/api/inventory/pos/invoices", {
      storeId,
      customerName: "FEFO Customer",
      paymentMode: "cash",
      items: [
        {
          itemId,
          // batchId intentionally omitted → triggers FEFO
          quantity: 20,
          unitRate: 40,
          mrp: 50,
          gstPercent: 5,
        },
      ],
    });

    expect(res.status).toBe(201);
    const invoice = await res.json();

    // The invoice items should reference the near-expiry batch
    if (invoice.items && invoice.items.length > 0) {
      const batchNumbers = invoice.items.map((i: any) => i.batch?.batchNumber);
      expect(batchNumbers).toContain("FEFO-NEAR-EXPIRY");
    }
  });

  it("should split across batches when first batch is insufficient", async () => {
    // Near-expiry batch has 30 - 20 = 10 left, far-expiry has 50
    // Selling 25 should take 10 from near-expiry + 15 from far-expiry
    const res = await api.post("/api/inventory/pos/invoices", {
      storeId,
      customerName: "Split Batch Customer",
      paymentMode: "cash",
      items: [
        {
          itemId,
          quantity: 25,
          unitRate: 40,
          mrp: 50,
          gstPercent: 5,
        },
      ],
    });

    expect(res.status).toBe(201);
    const invoice = await res.json();

    // Should have 2 line items (split across 2 batches)
    if (invoice.items) {
      expect(invoice.items.length).toBe(2);
      const totalQty = invoice.items.reduce(
        (sum: number, i: any) => sum + Number(i.quantity),
        0
      );
      expect(totalQty).toBe(25);
    }
  });
});

describe("POS Returns", () => {
  let storeId: number;
  let itemId: number;
  let batchId: number;
  let invoiceId: number;

  beforeAll(async () => {
    await cleanAllTables();
    resetSeedCounters();

    const vendor = await createTestVendor({ name: "Returns Vendor" });
    await createTestUnitType({ name: "Tab", symbol: "TAB" });

    const store = await createTestStore({
      name: "Returns Pharmacy",
      code: "RET1",
      isDefault: true,
    });
    storeId = store.id;

    const item = await createTestItem({
      name: "Return Test Drug",
      mrp: 100,
      purchaseRate: 60,
      saleRate: 80,
      gstPercent: 12,
    });
    itemId = item.id;

    // Stock: 50 units
    const today = new Date().toISOString().slice(0, 10);
    await api.post("/api/grns", {
      grnDate: today,
      vendorId: vendor.id,
      storeId,
      status: "posted",
      noPoReason: "Returns test stock",
      items: [
        {
          itemId,
          itemName: "Return Test Drug",
          receivedQty: 50,
          freeQty: 0,
          unitRate: 60,
          salePrice: 80,
          gstPercent: 12,
          batch: "RET-BATCH-001",
          expiryDate: "2029-01-01",
        },
      ],
    });

    // Get batchId
    const searchRes = await api.get(
      `/api/inventory/pos/item-search?storeId=${storeId}&search=Return Test Drug`
    );
    const results = await searchRes.json();
    batchId = results[0]?.batchId;

    // Sell 20 units
    const saleRes = await api.post("/api/inventory/pos/invoices", {
      storeId,
      customerName: "Return Customer",
      paymentMode: "cash",
      items: [
        { itemId, batchId, quantity: 20, unitRate: 80, mrp: 100, gstPercent: 12 },
      ],
    });
    const invoice = await saleRes.json();
    invoiceId = invoice.id;
  });

  it("should process a restockable return and increment stock", async () => {
    // Stock before return: 50 - 20 = 30
    const res = await api.post("/api/inventory/pos/returns", {
      originalInvoiceId: invoiceId,
      storeId,
      reason: "Customer changed mind",
      refundMode: "cash",
      items: [
        {
          itemId,
          batchId,
          quantity: 5,
          unitRate: 80,
          refundAmount: 400,
          condition: "restockable",
        },
      ],
    });

    expect(res.status).toBe(201);
    const returnDoc = await res.json();
    expect(returnDoc.id).toBeDefined();
    expect(returnDoc.returnNo).toBeDefined();

    // Verify stock incremented: 30 + 5 = 35
    const searchRes = await api.get(
      `/api/inventory/pos/item-search?storeId=${storeId}&search=Return Test Drug`
    );
    const results = await searchRes.json();
    const match = results.find((r: any) => r.batchNumber === "RET-BATCH-001");
    expect(Number(match?.quantityOnHand || match?.availableQty)).toBe(35);
  });

  it("should process a damaged return WITHOUT restocking", async () => {
    // Stock before: 35
    const res = await api.post("/api/inventory/pos/returns", {
      originalInvoiceId: invoiceId,
      storeId,
      reason: "Damaged packaging",
      refundMode: "cash",
      items: [
        {
          itemId,
          batchId,
          quantity: 3,
          unitRate: 80,
          refundAmount: 240,
          condition: "damaged",
        },
      ],
    });

    expect(res.status).toBe(201);

    // Stock should remain 35 (damaged items not restocked)
    const searchRes = await api.get(
      `/api/inventory/pos/item-search?storeId=${storeId}&search=Return Test Drug`
    );
    const results = await searchRes.json();
    const match = results.find((r: any) => r.batchNumber === "RET-BATCH-001");
    expect(Number(match?.quantityOnHand || match?.availableQty)).toBe(35);
  });
});
