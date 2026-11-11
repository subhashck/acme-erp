import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { staffSalaries, securityDepositRuleChanges } from "../../server/db/schema";

const mocks = vi.hoisted(() => ({
  db: { transaction: vi.fn() },
  role: "hr" as string | null, rows: [] as any[][], writes: [] as any[], locks: 0,
}));
vi.mock("../../server/db/client.ts", () => ({ db: mocks.db }));
vi.mock("../../server/routes/shared.ts", async () => {
  const { z } = await import("zod");
  return { idParam: z.object({ id: z.coerce.number() }), getCurrentStaff: vi.fn(), isManagementApprover: vi.fn() };
});
import { payrollDeductionRoutes } from "../../server/routes/payroll-deductions";

const app = new Hono();
app.use("*", async (c, next) => {
  if (mocks.role !== null) (c as any).set("session", { user: { id: "hr-user", role: mocks.role } });
  await next();
});
app.onError((err, c) => c.json({ error: err.message }, err instanceof HTTPException ? err.status : err instanceof z.ZodError ? 400 : 500));
app.route("/", payrollDeductionRoutes);

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
    update: (table: unknown) => ({ set: (values: any) => ({ where: async () => { mocks.writes.push({ table, values }); } }) }),
  }));
});

const body = { expected: { epf: 0, esi: 0, professionalTax: 0, securityDepositTotal: 0, securityDeposit: 0, securityDepositOpeningBalance: 100, securityDepositStartMonth: null }, version: 3, epf: 600, esi: 120, professionalTax: 200, securityDepositTotal: 2000, securityDeposit: 500, securityDepositOpeningBalance: 100, securityDepositStartMonth: "2026-10" };
function request(method = "PUT", input: unknown = body) {
  return app.request(`/hr/payroll-deductions/staff${method === "PUT" ? "/42" : ""}`, {
    method, headers: { "Content-Type": "application/json" }, body: method === "PUT" ? JSON.stringify(input) : undefined,
  });
}
describe("HR payroll deduction access and writes", () => {
  it.each(["staff", "accounts", "management", "manager"])("denies %s read and write access", async role => {
    mocks.role = role;
    expect((await request("GET")).status).toBe(403);
    expect((await request()).status).toBe(403);
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });
  it("requires authentication", async () => {
    mocks.role = null;
    expect((await request("GET")).status).toBe(401);
    expect((await request()).status).toBe(401);
  });
  it.each(["hr", "admin"])("allows %s to update deduction rules and writes an audit record", async role => {
    mocks.role = role;
    expect((await request()).status).toBe(200);
    expect(mocks.locks).toBe(1);
    expect(mocks.writes[0]).toEqual({ table: staffSalaries, values: expect.objectContaining({ epf: "600", esi: "120", professionalTax: "200", securityDepositOpeningBalance: "100" }) });
    expect(mocks.writes[0].values).not.toHaveProperty("basicSalary");
    expect(mocks.writes[1]).toEqual({ table: securityDepositRuleChanges, values: expect.objectContaining({ processedBy: "hr-user", newRules: expect.objectContaining({ epf: "600" }) }) });
  });
  it("requires a salary structure without creating zero earnings", async () => {
    mocks.rows[1] = [];
    expect((await request()).status).toBe(409);
    expect(mocks.writes).toEqual([]);
  });
  it("rejects stale staff versions", async () => {
    expect((await request("PUT", { ...body, version: 2 })).status).toBe(409);
    expect(mocks.writes).toEqual([]);
  });
  it("rejects edits based on stale deduction rules", async () => {
    mocks.rows[1][0].epf = "700";
    expect((await request()).status).toBe(409);
    expect(mocks.writes).toEqual([]);
  });
  it("rejects negative deductions and malformed start months", async () => {
    expect((await request("PUT", { ...body, epf: -1 })).status).toBe(400);
    expect((await request("PUT", { ...body, securityDepositStartMonth: "2026-13" })).status).toBe(400);
    expect(mocks.writes).toEqual([]);
  });
  it("protects refunded funds when editing opening balances", async () => {
    mocks.rows[3] = [{ amount: "700" }];
    expect((await request()).status).toBe(400);
    expect(mocks.writes).toEqual([]);
  });
});
