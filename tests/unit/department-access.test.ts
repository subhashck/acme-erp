import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../server/auth.ts", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("../../server/db/client.ts", () => ({ db: {} }));

import { auth } from "../../server/auth.ts";
import { mastersRoutes } from "../../server/routes/masters.ts";

const getSession = vi.mocked(auth.api.getSession);

describe("Department write permissions", () => {
  beforeEach(() => vi.resetAllMocks());

  for (const method of ["POST", "PUT"]) {
    const url = method === "POST" ? "/masters/departments" : "/masters/departments/1";
    const request = () => mastersRoutes.request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    it.each(["admin", "hr"])(`${method} allows %s through to body validation`, async (role) => {
      getSession.mockResolvedValue({ user: { role } } as any);
      // Invalid input stops before database writes, after authorization succeeds.
      expect((await request()).status).toBe(400);
    });

    it.each(["accounts", "user", "management", null])(`${method} denies role %s`, async (role) => {
      getSession.mockResolvedValue({ user: { role } } as any);
      const response = await request();
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Forbidden" });
    });
  }

  it("keeps unrelated master writes restricted to admin", async () => {
    getSession.mockResolvedValue({ user: { role: "hr" } } as any);
    for (const method of ["POST", "PUT"]) {
      const response = await mastersRoutes.request(
        method === "POST" ? "/masters/roles" : "/masters/roles/1",
        { method, headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      expect(response.status).toBe(403);
    }
  });
});
