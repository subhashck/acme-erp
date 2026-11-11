import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import {
  normalizeExpiryDate,
  verifyClosingStockPushApiKey,
  generateClosingStockPushApiKey,
  getActiveClosingStockPushApiKey,
  revokeClosingStockPushApiKeys,
  clearPushKeyMemoryStoreForTesting,
  getProbeResponse,
  purgePreviousClosingStockForStores,
} from "../../server/services/closing-stock-sync.ts";


const { database, insertValues, selectWhere } = vi.hoisted(() => {
  const selectWhere = vi.fn().mockResolvedValue([]);
  const mockInsertChain = {
    onConflictDoUpdate: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 101, syncId: "job-1729759800" }]),
    }),
    onConflictDoNothing: vi.fn().mockResolvedValue([]),
    returning: vi.fn().mockResolvedValue([{ id: 101, syncId: "job-1729759800" }]),
    then: (resolve: any) => Promise.resolve([{ id: 101 }]).then(resolve),
  };
  const insertValues = vi.fn().mockReturnValue(mockInsertChain);

  const database: any = {
    insert: vi.fn(() => ({ values: insertValues })),
    delete: vi.fn(() => ({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: selectWhere,
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    })),
  };
  database.transaction = vi.fn((callback: any) => callback(database));
  return { database, insertValues, selectWhere };
});

vi.mock("../../server/db/client.ts", () => ({ db: database }));

import { closingStockSyncRoutes } from "../../server/routes/closing-stock-sync.ts";

const app = new Hono();
app.route("/api", closingStockSyncRoutes);

describe("Closing Stock Push Service Ingestion & Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Utility & Transformation Functions", () => {
    it("normalizes various expiry date formats to standard ISO dates", () => {
      expect(normalizeExpiryDate("2028-04-30")).toBe("2028-04-30");
      expect(normalizeExpiryDate("2027-11")).toBe("2027-11-28");
      expect(normalizeExpiryDate("05/27")).toBe("2027-05-28");
      expect(normalizeExpiryDate("12/2029")).toBe("2029-12-28");
      expect(normalizeExpiryDate(null)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("verifies API key authentication correctly", async () => {
      // In test/dev environment with no production secret, non-empty auth passes
      expect(await verifyClosingStockPushApiKey("Bearer test-token")).toBe(true);
      expect(await verifyClosingStockPushApiKey(undefined)).toBe(true);
    });

    it("returns probe metadata matching acme-front contract", () => {
      const probe = getProbeResponse();
      expect(probe.success).toBe(true);
      expect(probe.service).toBe("acme-erp-closing-stock-ingest");
      expect(probe.accepted_chunk_sizes).toEqual([50, 2000]);
    });
  });

  describe("On-Demand 1-Hour Push API Key Lifecycle", () => {
    beforeEach(() => {
      clearPushKeyMemoryStoreForTesting();
    });

    it("generates an on-demand key valid for 1 hour (3600s)", async () => {
      const keyData = await generateClosingStockPushApiKey("Admin Test", 3600);
      expect(keyData.key).toMatch(/^cs_live_[a-f0-9]{48}$/);
      expect(keyData.validForSeconds).toBe(3600);
      expect(new Date(keyData.expiresAt).getTime()).toBeGreaterThan(Date.now() + 3500 * 1000);
    });

    it("validates valid on-demand key and rejects unknown/invalid keys", async () => {
      const generated = await generateClosingStockPushApiKey("Test User", 3600);

      // Correct Bearer token succeeds
      expect(await verifyClosingStockPushApiKey(`Bearer ${generated.key}`)).toBe(true);

      // Unknown token fails
      expect(await verifyClosingStockPushApiKey("Bearer cs_live_invalid_bad_token_12345678")).toBe(false);
    });

    it("retrieves current active key with remaining time", async () => {
      const generated = await generateClosingStockPushApiKey("Operator", 3600);
      const active = await getActiveClosingStockPushApiKey();

      expect(active).not.toBeNull();
      expect(active.active).toBe(true);
      if (active.active) {
        expect(active.key).toBe(generated.key);
        expect(active.secondsRemaining).toBeGreaterThan(3500);
      }
    });

    it("revokes active keys immediately so verification fails", async () => {
      const generated = await generateClosingStockPushApiKey("Operator", 3600);
      expect(await verifyClosingStockPushApiKey(`Bearer ${generated.key}`)).toBe(true);

      await revokeClosingStockPushApiKeys();

      const activeAfterRevoke = await getActiveClosingStockPushApiKey();
      expect(activeAfterRevoke.active).toBe(false);
      expect(await verifyClosingStockPushApiKey(`Bearer ${generated.key}`)).toBe(false);
    });

    it("exposes REST endpoints for generating, fetching active, and revoking push key", async () => {
      // 1. Generate via REST
      const genRes = await app.request("/api/inventory/closing-stock/api-key/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationSeconds: 3600 }),
      });
      expect(genRes.status).toBe(200);
      const genBody = await genRes.json();
      expect(genBody.success).toBe(true);
      expect(genBody.key).toBeDefined();

      // 2. Query active via REST
      const activeRes = await app.request("/api/inventory/closing-stock/api-key/active");
      expect(activeRes.status).toBe(200);
      const activeBody = await activeRes.json();
      expect(activeBody.active).toBe(true);
      expect(activeBody.key).toBe(genBody.key);

      // 3. Revoke via REST
      const revokeRes = await app.request("/api/inventory/closing-stock/api-key/revoke", {
        method: "POST",
      });
      expect(revokeRes.status).toBe(200);
      const revokeBody = await revokeRes.json();
      expect(revokeBody.success).toBe(true);

      // 4. Verify no active key remains
      const finalActiveRes = await app.request("/api/inventory/closing-stock/api-key/active");
      const finalActiveBody = await finalActiveRes.json();
      expect(finalActiveBody.active).toBe(false);
    });
  });


  describe("REST Ingestion Endpoints (/api/v1/inventory/closing-stock/batch)", () => {
    it("handles connection probe from acme-front test button with HTTP 200", async () => {
      const res = await app.request("/api/v1/inventory/closing-stock/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer acme_prod_sec_test",
          "X-Source-System": "acme-front-test",
        },
        body: JSON.stringify({
          probe: true,
          test_timestamp: new Date().toISOString(),
          client: "acme-front-test-connection",
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.service).toBe("acme-erp-closing-stock-ingest");
      expect(data.message).toContain("ready");
    });

    it("rejects malformed payloads missing mandatory sync metadata", async () => {
      const res = await app.request("/api/v1/inventory/closing-stock/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer acme_prod_sec_test",
        },
        body: JSON.stringify({
          items: [{ item_name: "PARACETAMOL" }],
        }),
      });

      expect([400, 422]).toContain(res.status);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("accepts valid batch chunk and calls database transaction", async () => {
      // Mock: chunk not existing yet
      selectWhere.mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockResolvedValue([]),
      });

      const chunkPayload = {
        sync_id: "job-1729759800",
        source: "acme-front",
        report_date: "2026-10-24",
        pushed_at: new Date().toISOString(),
        chunk_meta: {
          chunk_index: 1,
          total_chunks: 2,
          chunk_size: 2,
          total_records: 4,
        },
        financial_summary: {
          chunk_cost: 1500,
          chunk_mrp: 2200,
          total_cost: 3000,
          total_mrp: 4400,
        },
        items: [
          {
            idempotency_key: "1_PARACETAMOL_650_B1_2026-10-24",
            store_id: "1",
            store_name: "Main Pharmacy",
            item_name: "PARACETAMOL 650MG",
            salt_name: "Paracetamol",
            group_name: "ANALGESICS",
            batch_no: "B1",
            expiry: "2027-05-31",
            quantity: 100,
            rate: 1.5,
            cost_amount: 150,
            mrp: 2.2,
            total_mrp: 220,
          },
        ],
      };

      const res = await app.request("/api/v1/inventory/closing-stock/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer acme_prod_sec_test",
          "X-Idempotency-Key": "acme-cs-2026-10-24-job-1729759800-chunk-1",
        },
        body: JSON.stringify(chunkPayload),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sync_id).toBe("job-1729759800");
      expect(data.chunk_index).toBe(1);
      expect(data.records_ingested).toBe(1);
      expect(database.transaction).toHaveBeenCalled();
    });

    it("returns idempotent success when duplicate chunk is re-sent", async () => {
      // Mock: chunk already exists
      selectWhere.mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ id: 888 }]),
      });

      const chunkPayload = {
        sync_id: "job-1729759800",
        report_date: "2026-10-24",
        chunk_meta: {
          chunk_index: 1,
          total_chunks: 2,
          chunk_size: 1,
          total_records: 2,
        },
        items: [],
      };

      const res = await app.request("/api/v1/inventory/closing-stock/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer acme_prod_sec_test",
          "X-Idempotency-Key": "duplicate-key",
        },
        body: JSON.stringify(chunkPayload),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.already_processed).toBe(true);
      expect(data.records_ingested).toBe(0);
    });

    it("purges previous snapshot entries for the same store and date when a fresh push arrives", async () => {
      selectWhere.mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockResolvedValue([]),
      });

      const chunkPayload = {
        sync_id: "new-job-20261024-v2",
        source: "acme-front",
        report_date: "2026-10-24",
        pushed_at: new Date().toISOString(),
        chunk_meta: {
          chunk_index: 1,
          total_chunks: 1,
          chunk_size: 1,
          total_records: 1,
        },
        items: [
          {
            idempotency_key: "18_AMOXICILLIN_500_B001_2026-10-24",
            store_id: "18",
            store_name: "ACME DISPENSARY",
            item_name: "AMOXICILLIN 500MG",
            batch_no: "B001",
            quantity: 50,
            rate: 4.5,
            mrp: 6.0,
          },
        ],
      };

      const res = await app.request("/api/v1/inventory/closing-stock/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer acme_prod_sec_test",
        },
        body: JSON.stringify(chunkPayload),
      });

      expect(res.status).toBe(200);
      // Verify database.delete was called to purge prior entries for store 18 on 2026-10-24
      expect(database.delete).toHaveBeenCalled();
    });
  });

  describe("Store + Date Uniqueness & Purge Helper", () => {
    it("safely handles empty store lists without deleting data", async () => {
      const res = await purgePreviousClosingStockForStores(database, {
        reportDate: "2026-10-24",
        storeIds: [],
      });
      expect(res.deletedItemsCount).toBe(0);
      expect(res.deletedSessionsCount).toBe(0);
    });

    it("purges snapshot items for specified stores and date excluding current syncId", async () => {
      database.delete.mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
        }),
      });

      const res = await purgePreviousClosingStockForStores(database, {
        reportDate: "2026-10-24",
        storeIds: ["18", "1"],
        excludeSyncId: "active-sync-uuid",
      });

      expect(database.delete).toHaveBeenCalled();
      expect(res.deletedItemsCount).toBe(2);
    });
  });
});
