import { describe, it, expect } from "vitest";
import { calculateRepaymentSplit, calculateCurrentInstallmentDue } from "../../src/lib/capital-calculator.ts";

describe("Capital Calculator — calculateRepaymentSplit", () => {
  const mockFacility = {
    outstandingBalance: "1500000", // ₹15,00,000 as of today
    disbursedAmount: "2000000", // ₹20,00,000 initial
    sanctionedAmount: "2000000",
    interestRate: "12.0", // 12% p.a.
    interestType: "reducing",
    repaymentFrequency: "monthly",
    installmentAmount: "50000",
    repaymentStartDate: "2025-01-01",
    disbursementDate: "2025-01-01",
  };

  const mockRepayments = [
    {
      paymentDate: "2025-06-01",
      principalPaid: "500000", // ₹5,00,000 principal repayment
      interestPaid: "20000",
      status: "completed",
    },
  ];

  it("calculates interest using current outstanding balance when payment date is after all repayments", () => {
    // Current date after 2025-06-01
    const result = calculateRepaymentSplit({
      facility: mockFacility,
      repayments: mockRepayments,
      paymentType: "emi",
      paymentDate: "2025-07-01",
    });

    // On 2025-07-01, outstanding is ₹15,00,000. 12% p.a. monthly interest = 15,00,000 * 0.12 / 12 = ₹15,000
    expect(result.effectiveOutstanding).toBe("1500000");
    expect(result.interestPaid).toBe("15000");
    expect(result.calculationNote).toContain("₹15,00,000");
    expect(result.calculationNote).not.toContain("(as of");
  });

  it("calculates interest using historical outstanding on that day when payment date is prior to principal repayment (standard 1-month cycle)", () => {
    // Payment date is 2025-02-01 (31 days after 2025-01-01), which is prior to the 2025-06-01 principal repayment of ₹5,00,000
    const result = calculateRepaymentSplit({
      facility: mockFacility,
      repayments: mockRepayments,
      paymentType: "emi",
      paymentDate: "2025-02-01",
    });

    // Outstanding on 2025-02-01 was ₹15,00,000 + ₹5,00,000 = ₹20,00,000
    // 12% p.a. monthly interest = 20,00,000 * 0.12 / 12 = ₹20,000 (NOT ₹15,00,000)
    // EMI installment is ₹50,000 -> Principal = ₹30,000, Interest = ₹20,000
    expect(result.effectiveOutstanding).toBe("2000000");
    expect(result.interestPaid).toBe("20000");
    expect(result.principalPaid).toBe("30000");
    expect(result.totalAmount).toBe("50000");
    expect(result.calculationNote).toContain("₹20,00,000 (as of 2025-02-01)");
  });

  it("calculates pro-rata interest on historical balance when multiple months have elapsed", () => {
    // Payment date is 2025-04-01 (90 days after 2025-01-01)
    const result = calculateRepaymentSplit({
      facility: mockFacility,
      repayments: mockRepayments,
      paymentType: "interest_only",
      paymentDate: "2025-04-01",
    });

    // 90 days pro-rata on ₹20,00,000 @ 12% = 20,00,000 * 0.12 * 90 / 365 = 59,178
    expect(result.effectiveOutstanding).toBe("2000000");
    expect(result.interestPaid).toBe("59178");
    expect(result.calculationNote).toContain("90 days pro-rata @ 12% p.a. on ₹20,00,000 (as of 2025-04-01)");
  });

  it("aggregates multiple subsequent principal repayments correctly", () => {
    const multiRepayments = [
      { paymentDate: "2025-03-01", principalPaid: "200000", status: "completed" },
      { paymentDate: "2025-06-01", principalPaid: "300000", status: "completed" },
    ];
    // With facility outstandingBalance currently at ₹15,00,000:
    // If we select 2025-01-15 (prior to both repayments):
    // Outstanding should be 15,00,000 + 2,00,000 + 3,00,000 = ₹20,00,000
    const resPriorBoth = calculateRepaymentSplit({
      facility: mockFacility,
      repayments: multiRepayments,
      paymentType: "emi",
      paymentDate: "2025-01-15",
    });
    expect(resPriorBoth.effectiveOutstanding).toBe("2000000");

    // If we select 2025-04-01 (between the two repayments):
    // Outstanding should be 15,00,000 + 3,00,000 = ₹18,00,000
    const resBetween = calculateRepaymentSplit({
      facility: mockFacility,
      repayments: multiRepayments,
      paymentType: "emi",
      paymentDate: "2025-04-01",
    });
    expect(resBetween.effectiveOutstanding).toBe("1800000");
    // Prior payment is recognized as 2025-03-01, so 31 days elapsed -> 1 month standard cycle:
    // 18,00,000 * 0.12 / 12 = ₹18,000
    expect(resBetween.interestPaid).toBe("18000");
    expect(resBetween.principalPaid).toBe("32000");
  });

  it("ignores cancelled or failed subsequent repayments when reconstructing historical balance", () => {
    const repaymentsWithFailures = [
      { paymentDate: "2025-06-01", principalPaid: "500000", status: "completed" },
      { paymentDate: "2025-07-01", principalPaid: "1000000", status: "failed" },
      { paymentDate: "2025-08-01", principalPaid: "1000000", status: "cancelled" },
    ];

    const result = calculateRepaymentSplit({
      facility: mockFacility,
      repayments: repaymentsWithFailures,
      paymentType: "emi",
      paymentDate: "2025-02-01",
    });

    // Only the completed ₹5,00,000 should be added back
    expect(result.effectiveOutstanding).toBe("2000000");
    expect(result.interestPaid).toBe("20000");
  });

  it("determines prior payment date accurately based on historical sequence", () => {
    const repayments = [
      { paymentDate: "2025-02-01", principalPaid: "100000", status: "completed" },
      { paymentDate: "2025-06-01", principalPaid: "500000", status: "completed" },
    ];

    // Selected payment date: 2025-03-04 (31 days after 2025-02-01)
    const result = calculateRepaymentSplit({
      facility: mockFacility,
      repayments,
      paymentType: "emi",
      paymentDate: "2025-03-04",
      lastPaymentDate: "2025-06-01", // even if a future date was passed as lastPaymentDate
    });

    // Prior payment should be recognized as 2025-02-01 (not the future 2025-06-01)
    expect(result.daysElapsed).toBe(31);
    expect(result.effectiveOutstanding).toBe("2000000");
  });

  it("calculates interest-only split on historical balance", () => {
    const result = calculateRepaymentSplit({
      facility: mockFacility,
      repayments: mockRepayments,
      paymentType: "interest_only",
      paymentDate: "2025-02-01",
    });

    expect(result.principalPaid).toBe("0");
    expect(result.interestPaid).toBe("20000");
    expect(result.totalAmount).toBe("20000");
  });

  it("handles foreclosure on historical balance", () => {
    const result = calculateRepaymentSplit({
      facility: mockFacility,
      repayments: mockRepayments,
      paymentType: "foreclosure",
      paymentDate: "2025-02-01",
    });

    expect(result.principalPaid).toBe("2000000");
    expect(result.interestPaid).toBe("20000");
    expect(result.totalAmount).toBe("2020000");
  });

  describe("proRataDaily switch toggle behavior", () => {
    it("computes exact daily pro-rata interest when proRataDaily is enabled (true)", () => {
      // 15 days between 2025-01-01 and 2025-01-16
      const result = calculateRepaymentSplit({
        facility: mockFacility,
        repayments: mockRepayments,
        paymentType: "interest_only",
        paymentDate: "2025-01-16",
        proRataDaily: true,
      });

      // 15 days pro-rata on ₹20,00,000 @ 12% = 2000000 * 0.12 * 15 / 365 = 9,863
      expect(result.effectiveOutstanding).toBe("2000000");
      expect(result.interestPaid).toBe("9863");
      expect(result.calculationNote).toContain("15 days pro-rata @ 12% p.a.");
    });

    it("computes standard full monthly interest when proRataDaily is disabled (false)", () => {
      // Same 15 days between 2025-01-01 and 2025-01-16, but with switch disabled
      const result = calculateRepaymentSplit({
        facility: mockFacility,
        repayments: mockRepayments,
        paymentType: "interest_only",
        paymentDate: "2025-01-16",
        proRataDaily: false,
      });

      // Standard 1 month on ₹20,00,000 @ 12% = 2000000 * 0.12 / 12 = 20,000
      expect(result.effectiveOutstanding).toBe("2000000");
      expect(result.interestPaid).toBe("20000");
      expect(result.calculationNote).toContain("Standard 1 month @ 12% p.a.");
    });

    it("switches between pro-rata and standard full cycle for multi-month periods", () => {
      // 45 days (2025-01-01 to 2025-02-15)
      const proRataRes = calculateRepaymentSplit({
        facility: mockFacility,
        repayments: mockRepayments,
        paymentType: "interest_only",
        paymentDate: "2025-02-15",
        proRataDaily: true,
      });
      // 45 days pro-rata = 2000000 * 0.12 * 45 / 365 = 29,589
      expect(proRataRes.interestPaid).toBe("29589");
      expect(proRataRes.calculationNote).toContain("45 days pro-rata");

      const standardRes = calculateRepaymentSplit({
        facility: mockFacility,
        repayments: mockRepayments,
        paymentType: "interest_only",
        paymentDate: "2025-02-15",
        proRataDaily: false,
      });
      // Standard 1 month = 20,000
      expect(standardRes.interestPaid).toBe("20000");
      expect(standardRes.calculationNote).toContain("Standard 1 month");
    });
  });
});

describe("Capital Calculator — calculateCurrentInstallmentDue", () => {
  it("returns 0 and settled state when facility status is closed or outstanding balance is 0", () => {
    const closedFacility = {
      outstandingBalance: "0",
      sanctionedAmount: "1000000",
      installmentAmount: "20000",
      status: "closed",
      repaymentFrequency: "monthly",
    };
    const res = calculateCurrentInstallmentDue(closedFacility);
    expect(res.dueAmount).toBe(0);
    expect(res.isSettled).toBe(true);
    expect(res.subtitle).toContain("fully settled");
  });

  it("recalculates installment due for interest-only facilities based on reduced balance after principal payments", () => {
    // Initial facility: ₹10,00,000 sanctioned at 12% p.a. monthly -> base interest was ₹10,000/mo
    // After ₹4,00,000 repayment, outstanding balance is ₹6,00,000
    const interestOnlyFacility = {
      outstandingBalance: "600000",
      sanctionedAmount: "1000000",
      installmentAmount: "10000", // original contractual installment
      interestRate: "12.0",
      interestType: "interest_only",
      repaymentFrequency: "monthly",
      status: "active",
    };

    const res = calculateCurrentInstallmentDue(interestOnlyFacility);
    // 6,00,000 * 12% / 12 = 6,000
    expect(res.dueAmount).toBe(6000);
    expect(res.isSettled).toBe(false);
    expect(res.subtitle).toContain("Interest-only on current balance / monthly");
  });

  it("caps daily collection financing installment to remaining balance when outstanding is less than daily due", () => {
    // Base daily installment is ₹20,000, but only ₹8,500 remains outstanding
    const dailyFacility = {
      outstandingBalance: "8500",
      sanctionedAmount: "500000",
      installmentAmount: "20000",
      repaymentFrequency: "daily",
      category: "Daily Collection Financing",
      status: "active",
    };

    const res = calculateCurrentInstallmentDue(dailyFacility);
    expect(res.dueAmount).toBe(8500);
    expect(res.subtitle).toContain("Final remaining balance / daily");
  });

  it("returns full scheduled daily installment when outstanding exceeds base installment", () => {
    const dailyFacility = {
      outstandingBalance: "250000",
      sanctionedAmount: "500000",
      installmentAmount: "20000",
      repaymentFrequency: "daily",
      category: "Daily Collection Financing",
      status: "active",
    };

    const res = calculateCurrentInstallmentDue(dailyFacility);
    expect(res.dueAmount).toBe(20000);
    expect(res.subtitle).toBe("Scheduled frequency: daily");
  });

  it("caps standard amortizing loan to remaining payoff amount when remaining balance + interest is less than base EMI", () => {
    // Base EMI is ₹50,000, but outstanding principal is only ₹15,000 at 12% monthly (interest = ₹150)
    const amortizingFacility = {
      outstandingBalance: "15000",
      sanctionedAmount: "1000000",
      installmentAmount: "50000",
      interestRate: "12.0",
      interestType: "reducing",
      repaymentFrequency: "monthly",
      status: "active",
    };

    const res = calculateCurrentInstallmentDue(amortizingFacility);
    // 15,000 + 150 = 15,150
    expect(res.dueAmount).toBe(15150);
    expect(res.subtitle).toContain("Final remaining payoff / monthly");
  });

  it("handles moratorium pre_emi_interest and capitalized modes", () => {
    const preEmiFacility = {
      outstandingBalance: "50000000",
      sanctionedAmount: "50000000",
      installmentAmount: "726000",
      interestRate: "10.0",
      repaymentFrequency: "monthly",
      isInMoratorium: true,
      moratoriumType: "pre_emi_interest",
      status: "active",
    };
    const preEmiRes = calculateCurrentInstallmentDue(preEmiFacility);
    // 5Cr * 10% / 12 = 4,16,667
    expect(preEmiRes.dueAmount).toBe(416667);
    expect(preEmiRes.subtitle).toContain("Pre-EMI interest due / monthly");

    const capitalizedFacility = {
      ...preEmiFacility,
      moratoriumType: "capitalized",
    };
    const capRes = calculateCurrentInstallmentDue(capitalizedFacility);
    expect(capRes.dueAmount).toBe(0);
    expect(capRes.subtitle).toContain("holiday (capitalized)");
  });
});
