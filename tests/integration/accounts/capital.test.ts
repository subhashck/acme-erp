import { describe, it, expect, beforeAll } from "vitest";
import { api } from "../../setup/auth-helper.ts";
import { createCapitalSchemaAndTables } from "../../../server/db/setup-capital-db.ts";

describe("Capital Finances & Multi-Source Debt Management API", () => {
  beforeAll(async () => {
    // Initialize PostgreSQL capital tables and seed spreadsheet records
    await createCapitalSchemaAndTables();
  });

  it("1. should fetch executive dashboard KPIs matching spreadsheet totals", async () => {
    const res = await api.get("/api/capital/dashboard");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.kpis).toBeDefined();
    expect(body.kpis.totalOutstandingDebt).toBeGreaterThan(0);
    expect(body.kpis.totalCapitalInfusions).toBeGreaterThan(0);
    expect(body.kpis.netCashPosition).toBeDefined();

    // Verify portfolio breakdown contains all key categories
    expect(Array.isArray(body.portfolioBreakdown)).toBe(true);
    const categories = body.portfolioBreakdown.map((b: any) => b.category);
    expect(categories).toContain("Private Lending");
    expect(categories).toContain("Chit Fund");
    expect(categories).toContain("Credit Card");

    // Verify daily collection summary
    expect(body.dailyFinancingSummary).toBeDefined();
    expect(body.dailyFinancingSummary.activeDailyFacilitiesCount).toBeGreaterThanOrEqual(1);
    expect(body.dailyFinancingSummary.dailyTargetDue).toBeGreaterThan(0);
  });

  it("2. should list borrowing facilities and filter by category", async () => {
    const res = await api.get("/api/capital/facilities");
    expect(res.status).toBe(200);

    const facilities = await res.json();
    expect(Array.isArray(facilities)).toBe(true);
    expect(facilities.length).toBeGreaterThanOrEqual(2);

    // Filter by Private Lending
    const plRes = await api.get("/api/capital/facilities?category=Private%20Lending");
    expect(plRes.status).toBe(200);
    const plFacilities = await plRes.json();
    expect(plFacilities.every((f: any) => f.category === "Private Lending")).toBe(true);
  });

  it("3. should register a new borrowing facility with auto-calculated code", async () => {
    const payload = {
      name: "Test Bank Term Loan Line",
      lenderName: "State Bank of India",
      category: "Bank Loan",
      facilityType: "Term Loan",
      sanctionedAmount: 500000,
      disbursedAmount: 500000,
      interestRate: 10.5,
      interestType: "reducing",
      tenorMonths: 24,
      repaymentFrequency: "monthly",
      installmentAmount: 23190,
      sanctionDate: "2026-09-01",
      disbursementDate: "2026-09-01",
      notes: "Test loan line for automated test validation",
      status: "active",
    };

    const res = await api.post("/api/capital/facilities", payload);
    expect(res.status).toBe(201);

    const created = await res.json();
    expect(created.id).toBeDefined();
    expect(created.facilityCode).toMatch(/^CAP-FAC-/);
    expect(parseFloat(created.outstandingBalance)).toBe(500000);

    // Fetch by ID
    const getRes = await api.get(`/api/capital/facilities/${created.id}`);
    expect(getRes.status).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.name).toBe("Test Bank Term Loan Line");
    expect(fetched.lenderName).toBe("State Bank of India");

    // Clean up created test facility
    const delRes = await api.delete(`/api/capital/facilities/${created.id}`);
    expect(delRes.status).toBe(200);
  });

  it("4. should record a repayment and atomically update facility outstanding balance", async () => {
    // 1. Create a temporary facility for repayment testing
    const createRes = await api.post("/api/capital/facilities", {
      name: "Repayment Test Facility",
      lenderName: "Test Private Financer",
      category: "Private Lending",
      sanctionedAmount: 100000,
      disbursedAmount: 100000,
      interestRate: 12,
      installmentAmount: 10000,
      status: "active",
    });
    const fac = await createRes.json();
    const facId = fac.id;
    expect(parseFloat(fac.outstandingBalance)).toBe(100000);

    // 2. Record Repayment: Principal 8000 + Interest 1000 = Total 9000
    const payRes = await api.post("/api/capital/repayments", {
      facilityId: facId,
      paymentDate: "2026-09-10",
      paymentType: "emi",
      principalPaid: 8000,
      interestPaid: 1000,
      chargesPaid: 0,
      totalAmount: 9000,
      paymentMethod: "bank_transfer",
      referenceNumber: "TEST-UTR-12345",
      postToCashFlow: true,
    });
    expect(payRes.status).toBe(201);
    const repay = await payRes.json();
    expect(repay.id).toBeDefined();

    // 3. Verify facility balances updated atomically
    const getRes = await api.get(`/api/capital/facilities/${facId}`);
    const updatedFac = await getRes.json();
    expect(parseFloat(updatedFac.outstandingBalance)).toBe(92000); // 100,000 - 8,000
    expect(parseFloat(updatedFac.totalPrincipalPaid)).toBe(8000);
    expect(parseFloat(updatedFac.totalInterestPaid)).toBe(1000);

    // 4. Test deleting / reverting the repayment
    const delRepayRes = await api.delete(`/api/capital/repayments/${repay.id}`);
    expect(delRepayRes.status).toBe(200);

    // 5. Verify facility balance restored
    const restoredFacRes = await api.get(`/api/capital/facilities/${facId}`);
    const restoredFac = await restoredFacRes.json();
    expect(parseFloat(restoredFac.outstandingBalance)).toBe(100000);
    expect(parseFloat(restoredFac.totalPrincipalPaid)).toBe(0);

    // Clean up
    await api.delete(`/api/capital/facilities/${facId}`);
  });

  it("5. should record bulk daily collections simultaneously for multiple tranches", async () => {
    // Get daily facilities
    const dailyRes = await api.get("/api/capital/daily-collections");
    expect(dailyRes.status).toBe(200);
    const dailyData = await dailyRes.json();
    expect(dailyData.facilities.length).toBeGreaterThanOrEqual(1);

    const firstFac = dailyData.facilities[0].facility;

    // Record bulk daily collection
    const bulkRes = await api.post("/api/capital/repayments/bulk-daily", {
      paymentDate: "2026-09-10",
      paymentMethod: "daily_collection",
      referenceNumber: "REC-DAILY-TEST-01",
      items: [
        {
          facilityId: firstFac.id,
          principalPaid: 500,
          interestPaid: 50,
          chargesPaid: 0,
          totalAmount: 550,
          notes: "Automated test bulk collection",
        },
      ],
    });
    expect(bulkRes.status).toBe(201);
    const bulkBody = await bulkRes.json();
    expect(bulkBody.data).toBeDefined();
    expect(bulkBody.data.length).toBe(1);

    // Clean up created repayment
    const createdRepayId = bulkBody.data[0].id;
    await api.delete(`/api/capital/repayments/${createdRepayId}`);
  });

  it("6. should fetch cash flow ledger with cumulative running balance", async () => {
    const res = await api.get("/api/capital/cash-flow");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(5);

    // Running balance should be present on every entry
    for (const entry of body.data) {
      expect(entry.runningBalance).toBeDefined();
      expect(typeof entry.runningBalance).toBe("number");
    }

    expect(body.summary.latestRunningBalance).toBeGreaterThan(0);
  });

  it("7. should support moratorium settings and compute isInMoratorium dynamically", async () => {
    // Register facility with 6-month pre-EMI interest moratorium
    const createRes = await api.post("/api/capital/facilities", {
      name: "Hospital Equipment Loan (Moratorium)",
      lenderName: "HDFC Bank",
      category: "Bank Loan",
      facilityType: "Term Loan",
      sanctionedAmount: 1200000,
      disbursedAmount: 1200000,
      interestRate: 11.5,
      interestType: "reducing",
      tenorMonths: 36,
      moratoriumMonths: 6,
      moratoriumType: "pre_emi_interest",
      sanctionDate: "2026-09-01",
      disbursementDate: "2026-09-01",
      repaymentStartDate: "2027-03-01",
      installmentAmount: 46270,
      status: "active",
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.id).toBeDefined();
    expect(Number(created.moratoriumMonths)).toBe(6);
    expect(created.moratoriumType).toBe("pre_emi_interest");

    // Fetch facility by ID and check dynamic isInMoratorium flag
    const getRes = await api.get(`/api/capital/facilities/${created.id}`);
    expect(getRes.status).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.isInMoratorium).toBe(true);
    expect(fetched.moratoriumType).toBe("pre_emi_interest");
    expect(fetched.repaymentStartDate).toBe("2027-03-01");

    // Clean up
    await api.delete(`/api/capital/facilities/${created.id}`);
  });
});
