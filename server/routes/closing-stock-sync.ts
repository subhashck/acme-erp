import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  verifyClosingStockPushApiKey,
  generateClosingStockPushApiKey,
  getActiveClosingStockPushApiKey,
  revokeClosingStockPushApiKeys,
  getProbeResponse,
  ingestClosingStockChunk,
  purgePreviousClosingStockForStores,
  getClosingStockSessions,
  getClosingStockSessionDetails,
  getClosingStockSessionItems,
  getClosingStockSessionVariance,
  reconcileClosingStockSession,
  getClosingStockDashboardSnapshot,
  type ClosingStockBatchItemInput,
} from "../services/closing-stock-sync.ts";


const batchChunkSchema = z.object({
  probe: z.boolean().optional(),
  sync_id: z.string().optional(),
  source: z.string().default("acme-front"),
  report_date: z.string().optional(),
  pushed_at: z.string().optional(),
  pushed_by: z.string().optional().default("Operator"),
  chunk_meta: z
    .object({
      chunk_index: z.coerce.number().int().min(1),
      total_chunks: z.coerce.number().int().min(1),
      chunk_size: z.coerce.number().int().min(1),
      total_records: z.coerce.number().int().min(0),
    })
    .optional(),
  financial_summary: z
    .object({
      chunk_cost: z.coerce.number().optional().default(0),
      chunk_mrp: z.coerce.number().optional().default(0),
      total_cost: z.coerce.number().optional().default(0),
      total_mrp: z.coerce.number().optional().default(0),
    })
    .optional(),
  items: z
    .array(
      z.object({
        idempotency_key: z.string(),
        store_id: z.coerce.string(),
        store_name: z.string(),
        item_name: z.string(),
        salt_name: z.string().nullable().optional(),
        group_name: z.string().nullable().optional(),
        subgroup_name: z.string().nullable().optional(),
        company_name: z.string().nullable().optional(),
        packing: z.string().nullable().optional(),
        batch_no: z.string(),
        expiry: z.string().nullable().optional(),
        months_to_expiry: z.coerce.number().nullable().optional(),
        quantity: z.coerce.number(),
        base_unit: z.string().optional(),
        preferred_unit: z.string().optional(),
        conversion_ratio: z.coerce.number().optional().default(1),
        preferred_quantity: z.coerce.number().optional(),
        rate: z.coerce.number().optional().default(0),
        cost_amount: z.coerce.number().optional().default(0),
        mrp: z.coerce.number().optional().default(0),
        total_mrp: z.coerce.number().optional().default(0),
      })
    )
    .optional()
    .default([]),
});

export const closingStockSyncRoutes = new Hono<AuthEnv>()
  // ---------------------------------------------------------------------------
  // 1. External Push Service Ingestion Handlers (acme-front -> ACME ERP)
  // ---------------------------------------------------------------------------
  .post("/v1/inventory/closing-stock/batch", async (c) => {
    return handlePushBatch(c);
  })
  .post("/inventory/closing-stock/batch", async (c) => {
    return handlePushBatch(c);
  })

  // ---------------------------------------------------------------------------
  // 1b. On-Demand 1-Hour Push API Key Management Endpoints
  // ---------------------------------------------------------------------------
  .get("/inventory/closing-stock/api-key/active", async (c) => {
    const active = await getActiveClosingStockPushApiKey();
    return c.json(active);
  })

  .post("/inventory/closing-stock/api-key/generate", async (c) => {
    const session = c.get("session");
    const userDisplay = session?.user?.name || session?.user?.email || "Operator";
    let durationSeconds = 3600;

    try {
      const body = await c.req.json().catch(() => ({}));
      if (body?.durationSeconds && typeof body.durationSeconds === "number" && body.durationSeconds > 0) {
        durationSeconds = Math.min(body.durationSeconds, 86400);
      }
    } catch {}

    const result = await generateClosingStockPushApiKey(userDisplay, durationSeconds);
    return c.json({
      success: true,
      ...result,
      message: `Generated push API key valid for ${Math.round(durationSeconds / 60)} minutes (1 hour)`,
    });
  })

  .post("/inventory/closing-stock/api-key/revoke", async (c) => {
    const result = await revokeClosingStockPushApiKeys();
    return c.json(result);
  })

  // ---------------------------------------------------------------------------
  // 2. ERP Authenticated User Endpoints (UI / Auditing / Dashboard)
  // ---------------------------------------------------------------------------
  .get("/inventory/closing-stock/snapshot", async (c) => {
    const sessionId = c.req.query("sessionId") || undefined;
    const reportDate = c.req.query("reportDate") || undefined;
    const storeIdsStr = c.req.query("storeIds");
    const storeIds = storeIdsStr ? storeIdsStr.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

    const data = await getClosingStockDashboardSnapshot({
      sessionId,
      reportDate,
      storeIds,
    });
    return c.json(data);
  })

  .delete("/inventory/closing-stock/store-date", async (c) => {
    const reportDate = c.req.query("reportDate");
    const storeIdsStr = c.req.query("storeIds") || c.req.query("storeId");
    if (!reportDate || !storeIdsStr) {
      return c.json({ error: "reportDate and storeId(s) are required" }, 400);
    }
    const storeIds = storeIdsStr.split(",").map((s) => s.trim()).filter(Boolean);
    const result = await purgePreviousClosingStockForStores(db, {
      reportDate,
      storeIds,
    });
    return c.json({ success: true, ...result });
  })

  .get("/inventory/closing-stock/sessions", async (c) => {
    const page = Number(c.req.query("page")) || 1;
    const pageSize = Number(c.req.query("pageSize")) || 20;
    const search = c.req.query("search") || "";
    const status = c.req.query("status") || "all";
    const fromDate = c.req.query("fromDate") || "";
    const toDate = c.req.query("toDate") || "";

    const result = await getClosingStockSessions({
      page,
      pageSize,
      search,
      status,
      fromDate,
      toDate,
    });
    return c.json(result);
  })

  .get("/inventory/closing-stock/sessions/:id", async (c) => {
    const id = c.req.param("id");
    const details = await getClosingStockSessionDetails(id);
    if (!details) {
      return c.json({ error: "Closing stock session not found" }, 404);
    }
    return c.json(details);
  })

  .get("/inventory/closing-stock/sessions/:id/items", async (c) => {
    const id = c.req.param("id");
    const page = Number(c.req.query("page")) || 1;
    const pageSize = Number(c.req.query("pageSize")) || 50;
    const search = c.req.query("search") || "";
    const storeId = c.req.query("storeId") || "all";

    const result = await getClosingStockSessionItems(id, {
      page,
      pageSize,
      search,
      storeId,
    });
    return c.json(result);
  })

  .get("/inventory/closing-stock/sessions/:id/variance", async (c) => {
    const id = c.req.param("id");
    try {
      const variance = await getClosingStockSessionVariance(id);
      return c.json(variance);
    } catch (err: any) {
      return c.json({ error: err.message || "Failed to calculate stock variance" }, 400);
    }
  })

  .post("/inventory/closing-stock/sessions/:id/reconcile", async (c) => {
    const id = c.req.param("id");
    const session = c.get("session");
    const userId = session?.user?.id;

    try {
      const result = await reconcileClosingStockSession(id, userId);
      return c.json(result);
    } catch (err: any) {
      return c.json({ error: err.message || "Reconciliation failed" }, 400);
    }
  });

/**
 * Common handler for /v1/inventory/closing-stock/batch and /inventory/closing-stock/batch
 */
async function handlePushBatch(c: any) {
  const authHeader = c.req.header("Authorization") || c.req.header("X-ERP-API-Key");
  if (!(await verifyClosingStockPushApiKey(authHeader))) {
    return c.json({ error: "Unauthorized: Invalid or missing API Key" }, 401);
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON request body" }, 400);
  }

  // Handle probe / test connection request
  if (body?.probe === true) {
    return c.json(getProbeResponse());
  }

  const parsed = batchChunkSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid batch payload format",
        details: parsed.error.issues,
      },
      422
    );
  }

  const data = parsed.data;
  if (!data.sync_id || !data.report_date || !data.chunk_meta) {
    return c.json({ error: "Missing required fields: sync_id, report_date, or chunk_meta" }, 400);
  }

  const idempotencyKey =
    c.req.header("X-Idempotency-Key") ||
    `acme-cs-${data.report_date}-${data.sync_id}-chunk-${data.chunk_meta.chunk_index}`;

  try {
    const result = await ingestClosingStockChunk(
      {
        sync_id: data.sync_id,
        source: data.source,
        report_date: data.report_date,
        pushed_at: data.pushed_at,
        pushed_by: data.pushed_by,
        chunk_meta: data.chunk_meta,
        financial_summary: data.financial_summary,
        items: data.items as ClosingStockBatchItemInput[],
      },
      idempotencyKey
    );

    return c.json(result);
  } catch (err: any) {
    console.error(`[closing-stock-ingest] Error ingesting chunk for ${data.sync_id}:`, err);
    return c.json({ error: err.message || "Internal server error during chunk ingestion" }, 500);
  }
}
