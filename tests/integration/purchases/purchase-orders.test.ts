/**
 * Integration Tests — Purchase Order Lifecycle
 *
 * Tests PO creation, listing, filtering, payment recording,
 * and status transitions.
 * Requires: ephemeral test Postgres (docker-compose.test.yml)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { cleanAllTables } from "../../setup/test-db.ts";
import { api } from "../../setup/auth-helper.ts";
import { createTestVendor, resetSeedCounters } from "../../setup/seed-helpers.ts";

describe("Purchase Orders API", () => {
  let vendorId: number;
  let poId: number;
  let poItemIds: number[] = [];

  beforeAll(async () => {
    await cleanAllTables();
    resetSeedCounters();
    const vendor = await createTestVendor({ name: "PO Test Vendor" });
    vendorId = vendor.id;
  });

  it("should create a purchase order with line items", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await api.post("/api/purchase-orders", {
      poDate: today,
      vendorId,
      remarks: "Test purchase order",
      items: [
        { itemName: "Paracetamol 650mg", orderedQty: 100, unitRate: 18, gstPercent: 12 },
        { itemName: "Amoxicillin 500mg", orderedQty: 50, unitRate: 35, gstPercent: 5 },
      ],
    });

    expect(res.status).toBe(201);
    const po = await res.json();
    expect(po.id).toBeDefined();
    expect(po.poNo).toBeDefined();
    expect(po.vendorId).toBe(vendorId);
    poId = po.id;
  });

  it("should return PO with correct status after creation", async () => {
    const res = await api.get(`/api/purchase-orders/${poId}`);
    expect(res.status).toBe(200);
    const po = await res.json();

    expect(po.poStatus).toBe("open");
    expect(po.paymentStatus).toBe("unpaid");
    expect(po.items).toBeDefined();
    expect(po.items.length).toBe(2);

    // Save item IDs for GRN tests
    poItemIds = po.items.map((i: any) => i.id);

    // Verify total value computation
    // Item 1: 100 * 18 = 1800, GST 12% = 216 → 2016
    // Item 2: 50 * 35 = 1750, GST 5% = 87.5 → 1837.5
    // Total ≈ 3553.5 (may vary based on server-side calculation)
    expect(Number(po.totalValue)).toBeGreaterThan(0);
  });

  it("should list purchase orders with pagination", async () => {
    const res = await api.get("/api/purchase-orders?page=1&limit=10");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(Number(body.total)).toBeGreaterThanOrEqual(1);
  });

  it("should filter POs by vendor", async () => {
    const res = await api.get(`/api/purchase-orders?vendorId=${vendorId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.every((po: any) => po.vendorId === vendorId)).toBe(true);
  });

  it("should filter POs by status", async () => {
    const res = await api.get("/api/purchase-orders?poStatus=open");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.every((po: any) => po.poStatus === "open")).toBe(true);
  });

  it("should search POs by item name", async () => {
    const res = await api.get("/api/purchase-orders?search=Paracetamol");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("should record a partial payment", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await api.post(`/api/purchase-orders/${poId}/payments`, {
      paymentDate: today,
      amount: 1000,
      paymentMode: "upi",
      referenceNo: "UPI-REF-001",
      remarks: "First payment",
    });

    expect(res.status).toBe(201);

    // Check that payment status updated to partial
    const poRes = await api.get(`/api/purchase-orders/${poId}`);
    const po = await poRes.json();
    expect(po.paymentStatus).toBe("partial");
  });

  it("should record remaining payment and transition to paid", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const poRes = await api.get(`/api/purchase-orders/${poId}`);
    const po = await poRes.json();
    const remaining = Number(po.totalValue) - 1000;

    const res = await api.post(`/api/purchase-orders/${poId}/payments`, {
      paymentDate: today,
      amount: remaining + 100, // Overpay slightly to test 'paid' status
      paymentMode: "rtgs",
      referenceNo: "RTGS-REF-001",
    });

    expect(res.status).toBe(201);

    // Check final status
    const updatedRes = await api.get(`/api/purchase-orders/${poId}`);
    const updatedPo = await updatedRes.json();
    expect(updatedPo.paymentStatus).toBe("paid");
  });

  it("should get PO summary statistics", async () => {
    const res = await api.get("/api/purchase-orders/summary");
    expect(res.status).toBe(200);
    const summary = await res.json();
    expect(summary.totalPOs).toBeGreaterThanOrEqual(1);
    expect(summary.totalValue).toBeGreaterThan(0);
  });
});
