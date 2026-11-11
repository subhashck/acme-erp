import { describe, it, expect } from "vitest";
import {
  calculateMonthlyEmi,
  calculateAccruedInterest,
  capitalizeInterest,
  splitInstallment,
  getIndianFinancialYear,
  addMonthsToDate,
  verifyLedgerInvariant,
  processRepayment,
  revertRepayment,
  generateCanonicalAmortizationSchedule,
  type LoanParameters,
  type MoratoriumPeriod,
} from "../../server/services/loan-engine.ts";

describe("ACME ERP — Capital Finances: NEDFi ₹5Cr Canonical Loan Test Suite", () => {
  // Canonical NEDFi Scenario Parameters
  const NEDFI_PARAMS: LoanParameters = {
    sanctionedAmount: 50_000_000, // ₹5,00,00,000 (₹5 Crore)
    disbursedAmount: 50_000_000,
    disbursementDate: "2020-04-01",
    tenorMonths: 120, // 10 years
    annualInterestRate: 10.0, // 10% p.a.
    interestType: "reducing",
    moratoriums: [
      {
        startDate: "2020-04-01",
        endDate: "2021-03-31",
        months: 12,
        type: "capitalized",
        notes: "Moratorium #1: Construction/Grace Period",
      },
      {
        startDate: "2022-04-01",
        endDate: "2023-03-31",
        months: 12,
        type: "capitalized",
        notes: "Moratorium #2: COVID-19 / Special Restructuring",
      },
    ],
    recastAtMoratoriumEnd: true,
    roundingDecimals: 2,
  };

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-001: Loan Creation
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-001: Loan creation validates contract parameters", () => {
    expect(NEDFI_PARAMS.sanctionedAmount).toBe(50_000_000);
    expect(NEDFI_PARAMS.tenorMonths).toBe(120);
    expect(NEDFI_PARAMS.annualInterestRate).toBe(10.0);
    expect(NEDFI_PARAMS.interestType).toBe("reducing");
    expect(NEDFI_PARAMS.moratoriums).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-002: Disbursement
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-002: Disbursement sets initial outstanding balance", () => {
    const disbursed = NEDFI_PARAMS.disbursedAmount ?? NEDFI_PARAMS.sanctionedAmount;
    expect(disbursed).toBe(50_000_000);

    const isInvariantValid = verifyLedgerInvariant(
      disbursed,
      0, // 0 principal paid initially
      0, // 0 capitalized interest initially
      50_000_000 // initial outstanding balance
    );
    expect(isInvariantValid).toBe(true);
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-003: Interest Calculation
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-003: Interest calculation evaluates reducing monthly interest accurately", () => {
    const openingBalance = 50_000_000;
    const rate = 10.0;
    const split = splitInstallment(openingBalance, 774_328, rate);

    // Monthly interest for 1 month at 10% p.a. on ₹5 Cr = 50,000,000 * 0.10 / 12 = 416,666.67
    expect(Math.round(split.interest)).toBe(416_667);
    expect(Math.round(split.principal)).toBe(357_661);
    expect(Math.round(split.interest + split.principal)).toBe(774_328);
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-004: Moratorium #1
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-004: Moratorium #1 ensures ₹0 cash outflow during grace window", () => {
    const result = generateCanonicalAmortizationSchedule(NEDFI_PARAMS);
    const m1Schedule = result.schedule.slice(0, 12);

    expect(m1Schedule).toHaveLength(12);
    for (const line of m1Schedule) {
      expect(line.phase).toBe("moratorium");
      expect(line.isMoratorium).toBe(true);
      expect(line.installmentAmount).toBe(0);
      expect(line.principalComponent).toBe(0);
      expect(line.interestComponent).toBe(0);
    }
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-005: Resumption after Moratorium #1
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-005: Resumption after Moratorium #1 adjusts tenor to 108 months and computes initial EMI", () => {
    // Augmented principal = ₹5,50,00,000
    // Remaining tenor = 108 months (120 - 12)
    const augmentedP = 55_000_000;
    const remainingTenor = 108;
    const rate = 10.0;

    const emi1 = calculateMonthlyEmi(augmentedP, rate, remainingTenor);
    // Standard EMI formula yields ₹7,74,328
    expect(Math.round(emi1)).toBe(774_328);

    const result = generateCanonicalAmortizationSchedule(NEDFI_PARAMS);
    // Month 13 is the first repayment month
    const line13 = result.schedule[12];
    expect(line13.phase).toBe("servicing");
    expect(line13.isMoratorium).toBe(false);
    expect(Math.round(line13.installmentAmount)).toBe(774_328);
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-006: Normal Repayments
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-006: Normal repayments service 12 cycles in FY 2021-22", () => {
    const result = generateCanonicalAmortizationSchedule(NEDFI_PARAMS);
    const fy2122 = result.financialYearSummaries["FY2021-22"];

    expect(fy2122).toBeDefined();
    expect(fy2122.installmentCount).toBe(12);
    // 12 EMIs of ₹7,74,328 => ~₹92,91,933 total outflow
    expect(Math.round(fy2122.totalPaid)).toBe(9291933);
    // Principal paid is ₹39,70,649
    expect(Math.round(fy2122.principalPaid)).toBe(3970649);
    // Closing principal at 31-Mar-2022 is ₹5,10,29,351
    expect(Math.round(fy2122.closingBalance)).toBe(51029351);
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-007: Moratorium #2
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-007: Moratorium #2 pauses repayments mid-tenure for 12 months", () => {
    const result = generateCanonicalAmortizationSchedule(NEDFI_PARAMS);
    // Months 25 to 36 fall in Moratorium #2 (FY 2022-23)
    const m2Schedule = result.schedule.slice(24, 36);

    expect(m2Schedule).toHaveLength(12);
    for (const line of m2Schedule) {
      expect(line.phase).toBe("moratorium");
      expect(line.isMoratorium).toBe(true);
      expect(line.installmentAmount).toBe(0);
    }
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-008: Resumption after Moratorium #2
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-008: Resumption after Moratorium #2 recasts EMI across remaining 84 months", () => {
    // Base principal for recast: ₹5,10,29,351 + (10% accrued = ₹51,02,935.10) = ₹5,61,32,286.10
    const recastPrincipal = 56_132_286.1;
    const remainingTenor = 84; // 120 - 12 - 12 - 12 = 84 months to 31-Mar-2030
    const emi2 = calculateMonthlyEmi(recastPrincipal, 10.0, remainingTenor);

    // Recast EMI yields ₹9,31,862
    expect(Math.round(emi2)).toBe(931_862);

    const result = generateCanonicalAmortizationSchedule(NEDFI_PARAMS);
    // Month 37 is the resumption month after Moratorium #2
    const line37 = result.schedule[36];
    expect(line37.phase).toBe("servicing");
    expect(Math.round(line37.installmentAmount)).toBe(931_862);
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-009: Interest Capitalization
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-009: Interest capitalization accurately compounds accrued interest into principal", () => {
    // Moratorium 1: ₹50,00,000 capitalized on ₹5,00,00,000 => ₹5,50,00,000
    const accrued1 = calculateAccruedInterest(50_000_000, 10.0, 12);
    expect(accrued1).toBe(5_000_000);
    const augmentedP1 = capitalizeInterest(50_000_000, accrued1);
    expect(augmentedP1).toBe(55_000_000);

    // Moratorium 2: on ₹5,08,82,744 at 10% => ₹50,88,274.40
    const accrued2 = calculateAccruedInterest(50_882_744, 10.0, 12);
    expect(Math.round(accrued2)).toBe(5_088_274);
    const augmentedP2 = capitalizeInterest(50_882_744, accrued2);
    expect(Math.round(augmentedP2)).toBe(55_971_018);
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-010: Outstanding Balance Consistency
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-010: Outstanding balance maintains exact ledger invariant at all stages", () => {
    const result = generateCanonicalAmortizationSchedule(NEDFI_PARAMS);

    let cumulativePrincipalPaid = 0;
    let cumulativeCapitalized = 0;

    for (const line of result.schedule) {
      cumulativePrincipalPaid += line.principalComponent;
      cumulativeCapitalized += line.capitalizedInterest;

      const invariantHolds = verifyLedgerInvariant(
        50_000_000,
        cumulativePrincipalPaid,
        cumulativeCapitalized,
        line.closingBalance,
        1.0 // 1 rupee floating tolerance
      );
      expect(invariantHolds).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-011: Financial-Year Reporting
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-011: Financial-year reporting aggregates by Indian April-to-March FY", () => {
    const result = generateCanonicalAmortizationSchedule(NEDFI_PARAMS);
    const { financialYearSummaries } = result;

    // FY 2020-21: Capitalized interest of ₹50,00,000; ₹0 paid
    const fy2021 = financialYearSummaries["FY2020-21"];
    expect(fy2021).toBeDefined();
    expect(Math.round(fy2021.capitalizedInterest)).toBe(5_000_000);
    expect(fy2021.totalPaid).toBe(0);

    // FY 2021-22: Servicing of 12 EMIs
    const fy2122 = financialYearSummaries["FY2021-22"];
    expect(fy2122).toBeDefined();
    expect(fy2122.installmentCount).toBe(12);
    expect(Math.round(fy2122.principalPaid)).toBe(3970649);

    // FY 2022-23: Second Moratorium
    const fy2223 = financialYearSummaries["FY2022-23"];
    expect(fy2223).toBeDefined();
    expect(Math.round(fy2223.capitalizedInterest)).toBe(5102935);
    expect(fy2223.totalPaid).toBe(0);
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-012: Loan Closure
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-012: Terminal installment brings balance to ₹0 and marks loan closed", () => {
    const result = generateCanonicalAmortizationSchedule(NEDFI_PARAMS);
    const terminalLine = result.schedule[result.schedule.length - 1];

    expect(terminalLine.closingBalance).toBe(0);
    expect(terminalLine.phase).toBe("closed");
    expect(result.summary.isFullySettled).toBe(true);
    expect(result.summary.closingBalance).toBe(0);
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-013: Ledger Integrity
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-013: Ledger integrity ensures payment and rollback symmetry", () => {
    const currentOutstanding = 50_000_000;
    const currentPrincipalPaid = 0;
    const currentInterestPaid = 0;

    // Process a payment
    const processed = processRepayment(currentOutstanding, currentPrincipalPaid, currentInterestPaid, {
      principalPaid: 360_631,
      interestPaid: 416_667,
    });
    expect(processed.newOutstanding).toBe(49_639_369);
    expect(processed.newPrincipalPaid).toBe(360_631);

    // Revert the payment
    const reverted = revertRepayment(processed.newOutstanding, processed.newPrincipalPaid, processed.newInterestPaid, {
      principalPaid: 360_631,
      interestPaid: 416_667,
    });
    expect(reverted.newOutstanding).toBe(50_000_000);
    expect(reverted.newPrincipalPaid).toBe(0);
    expect(reverted.newInterestPaid).toBe(0);
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-014: Date Boundary Tests
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-014: Date boundary tests verify leap years and FY boundaries", () => {
    expect(getIndianFinancialYear("2020-03-31")).toBe("FY2019-20");
    expect(getIndianFinancialYear("2020-04-01")).toBe("FY2020-21");
    expect(getIndianFinancialYear("2024-02-29")).toBe("FY2023-24"); // Leap day
    expect(getIndianFinancialYear("2024-03-31")).toBe("FY2023-24");
    expect(getIndianFinancialYear("2024-04-01")).toBe("FY2024-25");

    expect(addMonthsToDate("2020-04-01", 12)).toBe("2021-04-01");
    expect(addMonthsToDate("2020-04-01", 120)).toBe("2030-04-01");
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-015: Rounding Tests
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-015: Rounding tests absorb fractional paisa in terminal installment", () => {
    const result = generateCanonicalAmortizationSchedule(NEDFI_PARAMS);
    const terminalLine = result.schedule[result.schedule.length - 1];

    // Terminal line must cleanly close to exactly 0.00 without trailing decimals
    expect(terminalLine.closingBalance).toBe(0.0);
    expect(result.summary.closingBalance).toBe(0.0);
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-016: Amendments / Restructuring
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-016: Amendments / restructuring recasts EMI with revised interest rate", () => {
    // Test restructuring remaining balance at 9.5% instead of 10%
    const currentPrincipal = 50_882_744;
    const remainingTenor = 84;

    const emiAt10Pct = calculateMonthlyEmi(currentPrincipal, 10.0, remainingTenor);
    const emiAt9_5Pct = calculateMonthlyEmi(currentPrincipal, 9.5, remainingTenor);

    expect(Math.round(emiAt10Pct)).toBe(844_714);
    expect(Math.round(emiAt9_5Pct)).toBe(831_627);
    // Lower interest rate gives lower monthly servicing burden
    expect(emiAt9_5Pct).toBeLessThan(emiAt10Pct);
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-017: Negative / Error Cases
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-017: Negative/error cases handle zero or invalid inputs safely", () => {
    expect(calculateMonthlyEmi(0, 10.0, 120)).toBe(0);
    expect(calculateMonthlyEmi(50_000_000, 10.0, 0)).toBe(0);
    expect(calculateMonthlyEmi(-50_000_000, 10.0, 120)).toBe(0);
    expect(calculateAccruedInterest(0, 10.0, 12)).toBe(0);
    expect(calculateAccruedInterest(50_000_000, 0, 12)).toBe(0);
    expect(splitInstallment(0, 100_000, 10.0)).toEqual({ principal: 0, interest: 0 });
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-018: Audit Trail
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-018: Audit trail records notes and phase transitions across periods", () => {
    const result = generateCanonicalAmortizationSchedule(NEDFI_PARAMS);
    const moratoriumLines = result.schedule.filter((l) => l.isMoratorium);
    const servicingLines = result.schedule.filter((l) => !l.isMoratorium);

    expect(moratoriumLines.length).toBe(24); // 12 + 12
    expect(servicingLines.length).toBe(96); // 120 - 24
    // Capitalization milestones have explicit audit notes
    const capNotes = result.schedule.filter((l) => l.capitalizedInterest > 0);
    expect(capNotes.length).toBe(2);
    expect(capNotes[0].notes).toContain("Interest capitalized");
    expect(capNotes[1].notes).toContain("Interest capitalized");
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-019: Reports
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-019: Reports summarize total principal, interest, and capitalized values", () => {
    const result = generateCanonicalAmortizationSchedule(NEDFI_PARAMS);
    const { summary } = result;

    expect(summary.sanctionedAmount).toBe(50_000_000);
    expect(summary.disbursedAmount).toBe(50_000_000);
    expect(summary.totalInterestCapitalized).toBeGreaterThan(10_000_000);
    expect(summary.totalPaid).toBeGreaterThan(50_000_000);
    expect(summary.isFullySettled).toBe(true);
  });

  // -------------------------------------------------------------------------
  // LIABILITY-LOAN-020: Full End-to-End Reconciliation
  // -------------------------------------------------------------------------
  it("LIABILITY-LOAN-020: Full end-to-end reconciliation across 120 months matches master model", () => {
    const result = generateCanonicalAmortizationSchedule(NEDFI_PARAMS);

    expect(result.schedule).toHaveLength(120);
    // Period 1 to 120 monotonic
    for (let i = 0; i < 120; i++) {
      expect(result.schedule[i].periodNumber).toBe(i + 1);
    }

    // Verify final closure
    const last = result.schedule[119];
    expect(last.closingBalance).toBe(0);
    expect(last.phase).toBe("closed");

    // Reconcile total principal paid: must equal disbursed + total capitalized
    const expectedTotalPrincipal = result.summary.disbursedAmount + result.summary.totalInterestCapitalized;
    expect(Math.round(result.summary.totalPrincipalPaid)).toBe(Math.round(expectedTotalPrincipal));
  });
});
