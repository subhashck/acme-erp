import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { securityDepositRefunds, securityDepositRuleChanges } from "../../server/db/schema";

const mocks = vi.hoisted(() => ({
  db: { transaction: vi.fn() },
  role: "hr", rows: [] as any[][], writes: [] as any[], locks: 0,
}));
vi.mock("../../server/db/client.ts", () => ({ db: mocks.db }));
vi.mock("../../server/routes/shared.ts", async () => {
  const { z } = await import("zod");
  return { idParam: z.object({ id: z.coerce.number() }), getCurrentStaff: vi.fn(), isManagementApprover: vi.fn() };
});
import { payrollRoutes } from "../../server/routes/payroll";

const app = new Hono();
app.use("*", async (c, next) => {
  (c as any).set("session", { user: { id: "hr-user", role: mocks.role } });
  await next();
});
app.onError((err, c) => c.json({ error: err.message }, err instanceof HTTPException ? err.status : err instanceof z.ZodError ? 400 : 500));
app.route("/", payrollRoutes);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = "hr"; mocks.locks = 0; mocks.writes = [];
  mocks.rows = [[{ staffId: 42, version: 3 }], [{ id: 8, securityDepositOpeningBalance: "100" }],
    [{ status: "Paid", securityDeposit: "500" }, { status: "Draft", securityDeposit: "1000" }], [{ amount: "200" }]];
  mocks.db.transaction.mockImplementation(async (callback) => callback({
    execute: async () => { mocks.locks++; },
    select: () => {
      const rows = mocks.rows.shift() || [];
      const chain: any = { from: () => chain, where: () => chain, limit: () => chain, for: () => chain,
        then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject) };
      return chain;
    },
    insert: (table: unknown) => ({ values: (values: any) => {
      mocks.writes.push({ table, values });
      return { returning: async () => [{ id: 1, ...values }], then: (resolve: any) => Promise.resolve().then(resolve) };
    } }),
    update: () => ({ set: (values: any) => ({ where: async () => { mocks.writes.push({ values }); } }) }),
  }));
});

function request(action: string, body: unknown, staffId = "42") {
  return app.request(`/hr/security-deposits/${staffId}/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}
const refund = { amount: 400, refundDate: "2026-10-15", notes: "Exit refund" };

describe("security deposit endpoints", () => {
  it("refunds only available paid funds under a transaction lock", async () => {
    expect((await request("refund", refund)).status).toBe(200);
    expect(mocks.locks).toBe(1);
    expect(mocks.writes[0]).toEqual({ table: securityDepositRefunds, values: expect.objectContaining({ amount: "400", processedBy: "hr-user" }) });
  });
  it("rejects an over-refund even when pending deductions would cover it", async () => {
    expect((await request("refund", { ...refund, amount: 401 })).status).toBe(400);
    expect(mocks.writes).toEqual([]);
  });
  it("rejects unknown staff", async () => {
    mocks.rows = [[]];
    expect((await request("refund", refund)).status).toBe(404);
    expect(mocks.writes).toEqual([]);
  });
  it.each([{ ...refund, refundDate: "2026-02-31" }, { ...refund, notes: " " }, { ...refund, amount: -1 }])("validates refund input", async (body) => {
    expect((await request("refund", body)).status).toBe(400);
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });
  it("restricts refunds to HR and admin", async () => {
    mocks.role = "staff";
    expect((await request("refund", refund)).status).toBe(403);
  });
  it("saves an explicit opening balance with before/after audit", async () => {
    const response = await request("target", { securityDepositTotal: 2000, securityDeposit: 500, securityDepositStartMonth: "2026-10", securityDepositOpeningBalance: 300 });
    expect(response.status).toBe(200);
    expect(mocks.writes[0].values.securityDepositOpeningBalance).toBe("300");
    expect(mocks.writes[1]).toEqual({ table: securityDepositRuleChanges, values: expect.objectContaining({
      processedBy: "hr-user", previousRules: expect.objectContaining({ securityDepositOpeningBalance: "100" }),
      newRules: expect.objectContaining({ securityDepositOpeningBalance: "300" }),
    }) });
  });
  it("does not let an opening balance change erase refunded funds", async () => {
    mocks.rows[3] = [{ amount: "700" }];
    expect((await request("target", { securityDepositTotal: 2000, securityDeposit: 500, securityDepositOpeningBalance: 0 })).status).toBe(400);
    expect(mocks.writes).toEqual([]);
  });
});
