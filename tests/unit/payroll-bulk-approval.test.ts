import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { drizzle } from "drizzle-orm/node-postgres";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), selectDistinctOn: vi.fn(), update: vi.fn(), insert: vi.fn() },
  role: "admin",
  rows: [] as any[],
  changed: true,
  selectSql: "",
  updateSql: [] as string[],
}));
vi.mock("../../server/db/client.ts", () => ({ db: mocks.db }));
vi.mock("../../server/routes/shared.ts", async () => {
  const { z } = await import("zod");
  return {
    idParam: z.object({ id: z.coerce.number() }),
    getCurrentStaff: vi.fn(async () => null),
    isManagementApprover: vi.fn(async () => false),
  };
});

import { payrollRoutes } from "../../server/routes/payroll";

const app = new Hono();
app.use("*", async (c, next) => {
  (c as any).set("session", { user: { id: "test", role: mocks.role } });
  await next();
});
app.route("/", payrollRoutes);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = "admin";
  mocks.changed = true;
  mocks.rows = [{ id: 42, status: "Draft", paymentMode: "Cash" }];
  mocks.updateSql = [];
  const builder = drizzle.mock();
  mocks.db.selectDistinctOn.mockImplementation((...args: any[]) => {
    const query = (builder.selectDistinctOn as any)(...args);
    const from = query.from.bind(query);
    query.from = (table: any) => {
      const chain = from(table);
      chain.then = (resolve: any, reject: any) => {
        mocks.selectSql = chain.toSQL().sql;
        return Promise.resolve(mocks.rows).then(resolve, reject);
      };
      return chain;
    };
    return query;
  });
  mocks.db.update.mockImplementation(() => ({
    set: (values: any) => ({
      where: (condition: any) => {
        mocks.updateSql.push(new PgDialect().sqlToQuery(condition).sql);
        return { returning: () => ({ execute: async () => mocks.changed ? [{ id: 42, ...values }] : [] }) };
      },
    }),
  }));
});

function approve(targetStatus = "Approved by HR") {
  return app.request("/hr/payroll/payslips/bulk-approve", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [{ id: 42 }, { id: 42 }], targetStatus }),
  });
}

describe("bulk payroll approval", () => {
  it("selects unique payslips using current staff and matching department versions", async () => {
    const response = await approve();
    expect(response.status).toBe(200);
    expect((await response.json()).count).toBe(1);
    expect(mocks.db.update).toHaveBeenCalledTimes(1);
    expect(mocks.selectSql).toContain('distinct on ("payslips"."id")');
    expect(mocks.selectSql).toContain('"staff"."active" =');
    expect(mocks.selectSql).toContain('"staff_departments"."staff_version" = "staff"."version"');
    expect(mocks.updateSql[0]).toContain('"payslips"."status" =');
  });

  it("does not count a payslip advanced by a concurrent request", async () => {
    mocks.changed = false;
    expect((await (await approve()).json()).count).toBe(0);
  });

  it("does not log cash expenses when another request already marked the payslip paid", async () => {
    mocks.rows[0].status = "Approved by Management";
    mocks.changed = false;
    expect((await (await approve("Paid")).json()).count).toBe(0);
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it("does not allow ordinary staff to cancel payslips in bulk", async () => {
    mocks.role = "staff";
    expect((await (await approve("Cancelled")).json()).count).toBe(0);
    expect(mocks.db.update).not.toHaveBeenCalled();
  });
});
