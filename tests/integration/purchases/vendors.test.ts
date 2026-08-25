/**
 * Integration Tests — Vendor CRUD
 *
 * Tests the full HTTP round-trip for vendor management.
 * Requires: ephemeral test Postgres (docker-compose.test.yml)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { cleanAllTables } from "../../setup/test-db.ts";
import { api } from "../../setup/auth-helper.ts";

describe("Vendors API", () => {
  beforeAll(async () => {
    await cleanAllTables();
  });

  let vendorId: number;

  it("should create a vendor", async () => {
    const res = await api.post("/api/vendors", {
      name: "Apollo Pharma Distributors",
      gstNumber: "29ABCDE1234F1ZH",
      contactPerson: "Rajesh Kumar",
      phone: "9876543210",
      address: "123 MG Road, Bangalore",
    });

    expect(res.status).toBe(201);
    const vendor = await res.json();
    expect(vendor.name).toBe("Apollo Pharma Distributors");
    expect(vendor.gstNumber).toBe("29ABCDE1234F1ZH");
    expect(vendor.id).toBeDefined();
    vendorId = vendor.id;
  });

  it("should list vendors", async () => {
    const res = await api.get("/api/vendors");
    expect(res.status).toBe(200);
    const vendors = await res.json();
    expect(Array.isArray(vendors)).toBe(true);
    expect(vendors.length).toBeGreaterThanOrEqual(1);
    expect(vendors.some((v: any) => v.id === vendorId)).toBe(true);
  });

  it("should list only active vendors when filtered", async () => {
    const res = await api.get("/api/vendors?active=true");
    expect(res.status).toBe(200);
    const vendors = await res.json();
    expect(vendors.every((v: any) => v.active === true)).toBe(true);
  });

  it("should update a vendor", async () => {
    const res = await api.patch(`/api/vendors/${vendorId}`, {
      contactPerson: "Suresh Sharma",
      phone: "9876500001",
    });

    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.contactPerson).toBe("Suresh Sharma");
    expect(updated.phone).toBe("9876500001");
    // Unchanged fields should persist
    expect(updated.name).toBe("Apollo Pharma Distributors");
  });

  it("should soft-delete (deactivate) a vendor", async () => {
    const res = await api.delete(`/api/vendors/${vendorId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify vendor is no longer in active list
    const activeRes = await api.get("/api/vendors?active=true");
    const activeVendors = await activeRes.json();
    expect(activeVendors.some((v: any) => v.id === vendorId)).toBe(false);
  });

  it("should return 404 for non-existent vendor update", async () => {
    const res = await api.patch("/api/vendors/999999", { name: "Ghost" });
    expect(res.status).toBe(404);
  });
});
