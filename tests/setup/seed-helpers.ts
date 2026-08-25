/**
 * Seed Helpers — Factory Functions for Test Data
 *
 * Provides reusable helpers that create test entities via the API,
 * so tests exercise the same code paths as real users.
 */
import { api } from "./auth-helper.ts";

let vendorSeq = 0;
let itemSeq = 0;
let storeSeq = 0;
let unitSeq = 0;

// ─── Vendors ──────────────────────────────────────────────────────────────────

export async function createTestVendor(overrides: Record<string, unknown> = {}) {
  vendorSeq++;
  const res = await api.post("/api/vendors", {
    name: `Test Vendor ${Date.now()}_${vendorSeq}`,
    contactPerson: "Test Contact",
    phone: "9876500000",
    ...overrides,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create vendor: ${res.status} ${err}`);
  }
  return res.json();
}

// ─── Unit Types ───────────────────────────────────────────────────────────────

export async function createTestUnitType(overrides: Record<string, unknown> = {}) {
  unitSeq++;
  const baseName = (overrides.name as string) || "Unit";
  const baseSymbol = (overrides.symbol as string) || "U";
  const res = await api.post("/api/unit-types", {
    ...overrides,
    name: `${baseName}_${Date.now()}_${unitSeq}`,
    symbol: `${baseSymbol}${unitSeq}`,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create unit type: ${res.status} ${err}`);
  }
  return res.json();
}

// ─── Items ────────────────────────────────────────────────────────────────────

export async function createTestItem(overrides: Record<string, unknown> = {}) {
  itemSeq++;
  const res = await api.post("/api/items", {
    name: `Test Item ${Date.now()}_${itemSeq}`,
    itemTypeId: 1,
    rate: 60,
    salePrice: 80,
    hsnCode: "3004",
    gstPercent: 12,
    reorderLevel: 10,
    ...overrides,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create item: ${res.status} ${err}`);
  }
  return res.json();
}

// ─── Stores ───────────────────────────────────────────────────────────────────

export async function createTestStore(overrides: Record<string, unknown> = {}) {
  storeSeq++;
  const res = await api.post("/api/inventory/stores", {
    name: `Test Store ${Date.now()}_${storeSeq}`,
    code: `TS${Date.now().toString().slice(-4)}_${storeSeq}`,
    type: "retail_pharmacy",
    active: true,
    isDefault: false,
    ...overrides,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create store: ${res.status} ${err}`);
  }
  return res.json();
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export interface TestPoItem {
  itemName: string;
  orderedQty: number;
  unitRate: number;
  gstPercent?: number;
  unit?: string;
}

export async function createTestPurchaseOrder(
  vendorId: number,
  items: TestPoItem[],
  overrides: Record<string, unknown> = {}
) {
  const today = new Date().toISOString().slice(0, 10);
  const res = await api.post("/api/purchase-orders", {
    poDate: today,
    vendorId,
    items: items.map((item) => ({
      itemName: item.itemName,
      orderedQty: item.orderedQty,
      unitRate: item.unitRate,
      gstPercent: item.gstPercent ?? 12,
      unit: item.unit,
    })),
    ...overrides,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create PO: ${res.status} ${err}`);
  }
  return res.json();
}

// ─── GRNs ─────────────────────────────────────────────────────────────────────

export interface TestGrnItem {
  poItemId?: number;
  itemId?: number;
  itemName?: string;
  receivedQty: number;
  freeQty?: number;
  unitRate?: number;
  salePrice?: number;
  gstPercent?: number;
  batch: string;
  expiryDate: string;
  unit?: string;
}

export async function createTestGrn(
  poId: number | null,
  vendorId: number | null,
  storeId: number | null,
  items: TestGrnItem[],
  status: "draft" | "posted" = "posted",
  overrides: Record<string, unknown> = {}
) {
  const today = new Date().toISOString().slice(0, 10);

  if (poId) {
    const res = await api.post(`/api/purchase-orders/${poId}/grns`, {
      grnDate: today,
      vendorId,
      storeId,
      status,
      items: items.map((item) => ({
        poItemId: item.poItemId,
        itemId: item.itemId,
        itemName: item.itemName,
        receivedQty: item.receivedQty,
        freeQty: item.freeQty ?? 0,
        unitRate: item.unitRate ?? 60,
        salePrice: item.salePrice ?? 80,
        gstPercent: item.gstPercent ?? 12,
        batch: item.batch,
        expiryDate: item.expiryDate,
        unit: item.unit,
      })),
      ...overrides,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create PO GRN: ${res.status} ${err}`);
    }
    return res.json();
  } else {
    const res = await api.post("/api/grns", {
      grnDate: today,
      vendorId,
      storeId,
      status,
      noPoReason: "Direct procurement",
      items: items.map((item) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        receivedQty: item.receivedQty,
        freeQty: item.freeQty ?? 0,
        unitRate: item.unitRate ?? 60,
        salePrice: item.salePrice ?? 80,
        gstPercent: item.gstPercent ?? 12,
        batch: item.batch,
        expiryDate: item.expiryDate,
        unit: item.unit,
      })),
      ...overrides,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create direct GRN: ${res.status} ${err}`);
    }
    return res.json();
  }
}

// ─── POS Invoice ──────────────────────────────────────────────────────────────

export interface TestPosItem {
  itemId: number;
  batchId?: number;
  quantity: number;
  unitRate: number;
  mrp?: number;
  discountPercent?: number;
  gstPercent?: number;
}

export async function createTestPosInvoice(
  storeId: number,
  items: TestPosItem[],
  overrides: Record<string, unknown> = {}
) {
  const res = await api.post("/api/inventory/pos/invoices", {
    storeId,
    paymentMode: "cash",
    customerName: "Test Customer",
    customerPhone: "9876543210",
    items: items.map((item) => ({
      itemId: item.itemId,
      batchId: item.batchId,
      quantity: item.quantity,
      unitRate: item.unitRate,
      mrp: item.mrp ?? item.unitRate,
      discountPercent: item.discountPercent ?? 0,
      gstPercent: item.gstPercent ?? 12,
    })),
    ...overrides,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create POS invoice: ${res.status} ${err}`);
  }
  return res.json();
}

// ─── Reset counters (call in beforeAll if needed) ─────────────────────────────

export function resetSeedCounters() {
  vendorSeq = 0;
  itemSeq = 0;
  storeSeq = 0;
  unitSeq = 0;
}
