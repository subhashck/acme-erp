import { describe, it, expect, beforeAll } from "vitest";
import { api } from "../../setup/auth-helper.ts";
import { db } from "../../../server/db/client.ts";
import { patients } from "../../../server/db/schema.ts";
import { labOrders, labResults } from "../../../server/db/schema-lab.ts";
import { seedLabData } from "../../../server/db/seed-lab.ts";
import { eq } from "drizzle-orm";

describe("Laboratory Module — Full End-to-End Workflow", () => {
  let patientId: number;
  let testHbId: number;
  let panelLftId: number;
  let createdOrderId: number;

  beforeAll(async () => {
    // Seed lab catalog in test database
    await seedLabData();

    // Ensure test patient exists
    let [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.mrn, "TEST-MRN-LAB-01"))
      .limit(1);

    if (!patient) {
      [patient] = await db
        .insert(patients)
        .values({
          mrn: "TEST-MRN-LAB-01",
          name: "John Lab Doe",
          age: 35,
          gender: "Male",
          phone: "9876543210",
          address: "123 Diagnostic Way",
          bloodGroup: "O+",
        })
        .returning();
    }
    patientId = patient.id;
  });

  it("1. should list lab categories and tests from seeded master data", async () => {
    const catRes = await api.get("/api/lab/categories");
    expect(catRes.status).toBe(200);
    const categories = await catRes.json();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThanOrEqual(1);

    const testRes = await api.get("/api/lab/tests");
    expect(testRes.status).toBe(200);
    const tests = await testRes.json();
    expect(Array.isArray(tests)).toBe(true);
    expect(tests.length).toBeGreaterThanOrEqual(1);

    const hbTest = tests.find((t: any) => t.code === "HB");
    expect(hbTest).toBeDefined();
    testHbId = hbTest.id;

    const panelRes = await api.get("/api/lab/panels");
    expect(panelRes.status).toBe(200);
    const panels = await panelRes.json();
    expect(Array.isArray(panels)).toBe(true);
    const lftPanel = panels.find((p: any) => p.code === "LFT");
    expect(lftPanel).toBeDefined();
    panelLftId = lftPanel.id;
  });

  it("2. should create a new lab order with items and sequential orderNo", async () => {
    const res = await api.post("/api/lab/orders", {
      patientId,
      priority: "Urgent",
      clinicalNotes: "Pre-operative evaluation",
      items: [
        { testId: testHbId, price: "120.00" },
        { panelId: panelLftId, price: "750.00" },
      ],
    });

    expect(res.status).toBe(201);
    const order = await res.json();
    expect(order.id).toBeDefined();
    expect(order.orderNo).toMatch(/^LAB\//);
    expect(order.status).toBe("Ordered");
    expect(order.priority).toBe("Urgent");
    expect(order.patientAge).toBe(35);
    expect(order.patientGender).toBe("Male");
    createdOrderId = order.id;
  });

  it("3. should retrieve order detail with items and expanded panel test placeholders", async () => {
    const res = await api.get(`/api/lab/orders/${createdOrderId}`);
    expect(res.status).toBe(200);
    const detail = await res.json();

    expect(detail.id).toBe(createdOrderId);
    expect(detail.patientName).toBe("John Lab Doe");
    expect(detail.items.length).toBe(2);
    // LFT has 7 tests + 1 HB = 8 results placeholders
    expect(detail.results.length).toBeGreaterThanOrEqual(7);
  });

  it("4. should collect sample and generate sequential accession number", async () => {
    const res = await api.post(`/api/lab/orders/${createdOrderId}/samples`, {
      specimenType: "Whole Blood EDTA & Serum",
    });

    expect(res.status).toBe(201);
    const sample = await res.json();
    expect(sample.accessionNo).toMatch(/^ACC\//);
    expect(sample.specimenType).toBe("Whole Blood EDTA & Serum");

    // Verify order status transitioned to 'Collected'
    const orderRes = await api.get(`/api/lab/orders/${createdOrderId}`);
    const order = await orderRes.json();
    expect(order.status).toBe("Collected");
  });

  it("5. should enter results with automatic reference range flag evaluation", async () => {
    // Get current results to find result IDs
    const orderRes = await api.get(`/api/lab/orders/${createdOrderId}`);
    const order = await orderRes.json();
    const hbResult = order.results.find((r: any) => r.testCode === "HB");
    expect(hbResult).toBeDefined();

    // 14.5 is normal for adult male (13.0 - 17.0)
    const res = await api.post(`/api/lab/orders/${createdOrderId}/results`, {
      results: [
        {
          resultId: hbResult.id,
          testId: testHbId,
          value: "14.5",
          notes: "Sample non-hemolyzed",
        },
      ],
    });

    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated[0].flag).toBe("Normal");
    expect(updated[0].value).toBe("14.5");

    // Now test a critical low result (5.5 < criticalLow 7.0)
    const critRes = await api.post(`/api/lab/orders/${createdOrderId}/results`, {
      results: [
        {
          resultId: hbResult.id,
          testId: testHbId,
          value: "5.5",
          notes: "Immediate critical notification required",
        },
      ],
    });

    expect(critRes.status).toBe(200);
    const critUpdated = await critRes.json();
    expect(critUpdated[0].flag).toBe("Critical");
  });

  it("6. should verify all results by pathologist", async () => {
    const res = await api.post(`/api/lab/orders/${createdOrderId}/verify-all`, {});
    expect(res.status).toBe(200);

    const orderRes = await api.get(`/api/lab/orders/${createdOrderId}`);
    const order = await orderRes.json();
    const allVerified = order.results.every((r: any) => r.status === "Verified");
    expect(allVerified).toBe(true);
  });

  it("7. should release report and mark order as Completed", async () => {
    const res = await api.post(`/api/lab/orders/${createdOrderId}/release`, {});
    expect(res.status).toBe(200);

    const orderRes = await api.get(`/api/lab/orders/${createdOrderId}`);
    const order = await orderRes.json();
    expect(order.status).toBe("Completed");

    const allReleased = order.results.every((r: any) => r.status === "Released");
    expect(allReleased).toBe(true);
  });

  it("8. should generate report payload with reference range strings and doctor info", async () => {
    const res = await api.get(`/api/lab/orders/${createdOrderId}/report`);
    expect(res.status).toBe(200);
    const report = await res.json();

    expect(report.order).toBeDefined();
    expect(report.order.orderNo).toMatch(/^LAB\//);
    expect(report.results.length).toBeGreaterThanOrEqual(1);
    const hb = report.results.find((r: any) => r.testCode === "HB");
    expect(hb).toBeDefined();
    expect(hb.normalRangeStr).toBe("13 - 17");
  });

  it("9. should return lab dashboard statistics", async () => {
    const res = await api.get("/api/lab/stats");
    expect(res.status).toBe(200);
    const stats = await res.json();

    expect(stats).toHaveProperty("todayOrders");
    expect(stats).toHaveProperty("pendingSamples");
    expect(stats).toHaveProperty("inProgress");
    expect(stats).toHaveProperty("pendingVerification");
    expect(stats).toHaveProperty("criticalCount");
  });
});
