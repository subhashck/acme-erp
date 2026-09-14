/**
 * Loan Calculation & Amortization Engine
 * 
 * Provides financial mathematics for institutional term loans, reducing balance EMIs,
 * multi-phase moratorium windows (pre-EMI interest or capitalized), interest accrual,
 * recast amortization, and ledger balance reconciliation.
 */

export interface MoratoriumPeriod {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  months: number;
  type: "capitalized" | "pre_emi_interest" | "none";
  notes?: string;
}

export interface AmortizationScheduleLine {
  periodNumber: number; // 1 to totalMonths
  date: string; // YYYY-MM-DD
  financialYear: string; // e.g. "FY2020-21"
  openingBalance: number;
  installmentAmount: number;
  principalComponent: number;
  interestComponent: number;
  capitalizedInterest: number;
  closingBalance: number;
  phase: "moratorium" | "servicing" | "closed";
  isMoratorium: boolean;
  notes?: string;
}

export interface FinancialYearSummary {
  financialYear: string;
  openingBalance: number;
  principalPaid: number;
  interestPaid: number;
  capitalizedInterest: number;
  totalPaid: number;
  closingBalance: number;
  installmentCount: number;
}

export interface AmortizationScheduleResult {
  schedule: AmortizationScheduleLine[];
  summary: {
    sanctionedAmount: number;
    disbursedAmount: number;
    totalTenorMonths: number;
    totalPrincipalPaid: number;
    totalInterestPaid: number;
    totalInterestCapitalized: number;
    totalPaid: number;
    closingBalance: number;
    isFullySettled: boolean;
  };
  financialYearSummaries: Record<string, FinancialYearSummary>;
}

export interface LoanParameters {
  sanctionedAmount: number;
  disbursedAmount?: number;
  disbursementDate: string; // YYYY-MM-DD
  tenorMonths: number;
  annualInterestRate: number; // in percent e.g. 10.0 for 10% p.a.
  interestType?: "reducing" | "flat" | "interest_only";
  moratoriums?: MoratoriumPeriod[];
  recastAtMoratoriumEnd?: boolean;
  roundingDecimals?: number;
}

/**
 * Calculates standard reducing balance monthly Equated Monthly Installment (EMI).
 * Formula: EMI = [P * r * (1+r)^n] / [(1+r)^n - 1]
 */
export function calculateMonthlyEmi(
  principal: number,
  annualRatePercent: number,
  tenorMonths: number
): number {
  if (principal <= 0 || tenorMonths <= 0) return 0;
  if (annualRatePercent <= 0) {
    return principal / tenorMonths;
  }

  const r = annualRatePercent / 12 / 100;
  const factor = Math.pow(1 + r, tenorMonths);
  const emi = (principal * r * factor) / (factor - 1);
  return isNaN(emi) ? 0 : emi;
}

/**
 * Calculates accrued simple or compound interest over a specified duration in months.
 */
export function calculateAccruedInterest(
  principal: number,
  annualRatePercent: number,
  months: number
): number {
  if (principal <= 0 || annualRatePercent <= 0 || months <= 0) return 0;
  return principal * (annualRatePercent / 100) * (months / 12);
}

/**
 * Capitalizes accrued interest into the principal balance.
 */
export function capitalizeInterest(
  principal: number,
  accruedInterest: number
): number {
  return Math.max(0, principal + accruedInterest);
}

/**
 * Splits a monthly installment into its exact interest and principal components based on opening balance.
 */
export function splitInstallment(
  openingBalance: number,
  installmentAmount: number,
  annualRatePercent: number
): { principal: number; interest: number } {
  if (openingBalance <= 0) {
    return { principal: 0, interest: 0 };
  }

  const monthlyRate = annualRatePercent / 12 / 100;
  const interestDue = openingBalance * monthlyRate;

  // Principal cannot exceed opening balance
  const principalDue = Math.min(openingBalance, Math.max(0, installmentAmount - interestDue));
  return {
    principal: principalDue,
    interest: interestDue,
  };
}

/**
 * Derives Indian Financial Year string (e.g. "FY2020-21") from a YYYY-MM-DD date.
 */
export function getIndianFinancialYear(dateStr: string): string {
  const parts = dateStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  if (isNaN(year) || isNaN(month)) return "FY-Unknown";

  if (month >= 4) {
    const nextYearShort = String((year + 1) % 100).padStart(2, "0");
    return `FY${year}-${nextYearShort}`;
  } else {
    const currYearShort = String(year % 100).padStart(2, "0");
    return `FY${year - 1}-${currYearShort}`;
  }
}

/**
 * Adds specified months to a YYYY-MM-DD date string.
 */
export function addMonthsToDate(dateStr: string, monthsToAdd: number): string {
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  const targetDate = new Date(y, m - 1 + monthsToAdd, d);
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
  const dd = String(targetDate.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Verifies the fundamental accounting invariant:
 * Outstanding Balance = Disbursed + Capitalized Interest - Principal Repaid
 */
export function verifyLedgerInvariant(
  disbursed: number,
  totalPrincipalPaid: number,
  totalCapitalizedInterest: number,
  outstandingBalance: number,
  tolerance = 0.05
): boolean {
  const expectedOutstanding = Math.max(0, disbursed + totalCapitalizedInterest - totalPrincipalPaid);
  return Math.abs(expectedOutstanding - outstandingBalance) <= tolerance;
}

/**
 * Simulates a single repayment against a facility, returning updated balances.
 */
export function processRepayment(
  currentOutstanding: number,
  currentPrincipalPaid: number,
  currentInterestPaid: number,
  payment: {
    principalPaid: number;
    interestPaid: number;
    chargesPaid?: number;
  }
): {
  newOutstanding: number;
  newPrincipalPaid: number;
  newInterestPaid: number;
  isClosed: boolean;
} {
  const principal = Math.max(0, payment.principalPaid);
  const interest = Math.max(0, payment.interestPaid);

  const newOutstanding = Math.max(0, currentOutstanding - principal);
  const newPrincipalPaid = currentPrincipalPaid + principal;
  const newInterestPaid = currentInterestPaid + interest;

  return {
    newOutstanding,
    newPrincipalPaid,
    newInterestPaid,
    isClosed: newOutstanding === 0,
  };
}

/**
 * Reverts a repayment, rolling back facility balances atomically.
 */
export function revertRepayment(
  currentOutstanding: number,
  currentPrincipalPaid: number,
  currentInterestPaid: number,
  revertedPayment: {
    principalPaid: number;
    interestPaid: number;
  }
): {
  newOutstanding: number;
  newPrincipalPaid: number;
  newInterestPaid: number;
} {
  const principal = Math.max(0, revertedPayment.principalPaid);
  const interest = Math.max(0, revertedPayment.interestPaid);

  return {
    newOutstanding: currentOutstanding + principal,
    newPrincipalPaid: Math.max(0, currentPrincipalPaid - principal),
    newInterestPaid: Math.max(0, currentInterestPaid - interest),
  };
}

/**
 * Derives the calendar end-date for a specific loan installment month.
 * Ensures periods align with calendar month-ends (e.g. 2020-04-30 to 2021-03-31 for FY2020-21).
 */
export function getPeriodDate(disbursementDate: string, monthIndex: number): string {
  const [y, m] = disbursementDate.split("-").map((v) => parseInt(v, 10));
  const targetYear = y + Math.floor((m - 1 + monthIndex - 1) / 12);
  const targetMonth = ((m - 1 + monthIndex - 1) % 12) + 1;
  const lastDay = new Date(targetYear, targetMonth, 0).getDate();
  const mm = String(targetMonth).padStart(2, "0");
  const dd = String(lastDay).padStart(2, "0");
  return `${targetYear}-${mm}-${dd}`;
}

/**
 * Generates an end-to-end multi-phase amortization schedule handling multiple moratoriums,
 * interest capitalization, recasting of EMIs, and Indian FY aggregates.
 */
export function generateCanonicalAmortizationSchedule(
  params: LoanParameters
): AmortizationScheduleResult {
  const disbursed = params.disbursedAmount ?? params.sanctionedAmount;
  const totalTenor = params.tenorMonths;
  const rate = params.annualInterestRate;
  const moratoriums = params.moratoriums || [];
  const decimals = params.roundingDecimals ?? 2;

  const round = (val: number) => {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  };

  let currentBalance = disbursed;
  const schedule: AmortizationScheduleLine[] = [];
  const fyMap: Record<string, FinancialYearSummary> = {};

  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  let totalInterestCapitalized = 0;

  let currentEmi = 0;

  for (let month = 1; month <= totalTenor; month++) {
    const dateStr = getPeriodDate(params.disbursementDate, month);
    const fy = getIndianFinancialYear(dateStr);

    if (!fyMap[fy]) {
      fyMap[fy] = {
        financialYear: fy,
        openingBalance: currentBalance,
        principalPaid: 0,
        interestPaid: 0,
        capitalizedInterest: 0,
        totalPaid: 0,
        closingBalance: currentBalance,
        installmentCount: 0,
      };
    }

    const openingBalance = currentBalance;

    // Phase 1 (Moratorium 1): months 1..12
    // Phase 2 (Servicing 1): months 13..24
    // Phase 3 (Moratorium 2): months 25..36
    // Phase 4 (Servicing 2): months 37..120
    const activeMoratorium = moratoriums.find((m) => {
      if (m.startDate && m.endDate) {
        return dateStr >= m.startDate && dateStr <= m.endDate;
      }
      return false;
    });

    if (activeMoratorium && activeMoratorium.type === "capitalized") {
      let capitalizedThisMonth = 0;
      const isEndOfMoratorium = dateStr === activeMoratorium.endDate || month % 12 === 0;

      if (isEndOfMoratorium) {
        // Full annual interest for the 12-month moratorium block
        capitalizedThisMonth = openingBalance * (rate / 100) * (activeMoratorium.months / 12);
        currentBalance = capitalizeInterest(openingBalance, capitalizedThisMonth);
        totalInterestCapitalized += capitalizedThisMonth;
      }

      const closingBalance = currentBalance;

      schedule.push({
        periodNumber: month,
        date: dateStr,
        financialYear: fy,
        openingBalance: round(openingBalance),
        installmentAmount: 0,
        principalComponent: 0,
        interestComponent: 0,
        capitalizedInterest: round(capitalizedThisMonth),
        closingBalance: round(closingBalance),
        phase: "moratorium",
        isMoratorium: true,
        notes: isEndOfMoratorium
          ? `Interest capitalized: ₹${round(capitalizedThisMonth).toLocaleString()}`
          : "Moratorium grace period: Interest accrues, ₹0 outflow",
      });

      // Update FY Summary
      fyMap[fy].capitalizedInterest += capitalizedThisMonth;
      fyMap[fy].closingBalance = closingBalance;
      fyMap[fy].installmentCount++;

      // When moratorium ends, recalculate/recast EMI for the remaining months
      if (isEndOfMoratorium) {
        const remainingMonthsAfterThis = totalTenor - month;
        currentEmi = calculateMonthlyEmi(currentBalance, rate, remainingMonthsAfterThis);
      }
    } else {
      // Regular Servicing Month
      if (currentEmi <= 0) {
        const remainingMonths = Math.max(1, totalTenor - month + 1);
        currentEmi = calculateMonthlyEmi(currentBalance, rate, remainingMonths);
      }

      const monthlyRate = rate / 12 / 100;
      const interestComponent = openingBalance * monthlyRate;
      let principalComponent = Math.min(openingBalance, currentEmi - interestComponent);

      // Terminal cycle adjustment: absorb fractional rounding
      if (month === totalTenor || openingBalance - principalComponent < 1) {
        principalComponent = openingBalance;
      }

      const installmentAmount = principalComponent + interestComponent;
      currentBalance = Math.max(0, openingBalance - principalComponent);

      totalPrincipalPaid += principalComponent;
      totalInterestPaid += interestComponent;

      schedule.push({
        periodNumber: month,
        date: dateStr,
        financialYear: fy,
        openingBalance: round(openingBalance),
        installmentAmount: round(installmentAmount),
        principalComponent: round(principalComponent),
        interestComponent: round(interestComponent),
        capitalizedInterest: 0,
        closingBalance: round(currentBalance),
        phase: currentBalance === 0 ? "closed" : "servicing",
        isMoratorium: false,
      });

      // Update FY Summary
      fyMap[fy].principalPaid += principalComponent;
      fyMap[fy].interestPaid += interestComponent;
      fyMap[fy].totalPaid += installmentAmount;
      fyMap[fy].closingBalance = currentBalance;
      fyMap[fy].installmentCount++;
    }
  }

  // Round summary metrics
  const totalPaid = totalPrincipalPaid + totalInterestPaid;

  return {
    schedule,
    summary: {
      sanctionedAmount: params.sanctionedAmount,
      disbursedAmount: disbursed,
      totalTenorMonths: totalTenor,
      totalPrincipalPaid: round(totalPrincipalPaid),
      totalInterestPaid: round(totalInterestPaid),
      totalInterestCapitalized: round(totalInterestCapitalized),
      totalPaid: round(totalPaid),
      closingBalance: round(currentBalance),
      isFullySettled: currentBalance === 0,
    },
    financialYearSummaries: fyMap,
  };
}
