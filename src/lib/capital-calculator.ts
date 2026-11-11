/**
 * Utility to dynamically calculate principal and interest splits for debt repayments
 * based on selected payment type, payment date, days elapsed, and current outstanding principal.
 */

export interface RecalculationParams {
  facility: {
    outstandingBalance?: number | string | null;
    disbursedAmount?: number | string | null;
    sanctionedAmount?: number | string | null;
    interestRate?: number | string | null;
    interestType?: string | null;
    repaymentFrequency?: string | null;
    installmentAmount?: number | string | null;
    repaymentStartDate?: string | null;
    disbursementDate?: string | null;
    sanctionDate?: string | null;
    repayments?: Array<{
      paymentDate?: string | null;
      principalPaid?: number | string | null;
      status?: string | null;
    }> | null;
    allRepayments?: Array<{
      paymentDate?: string | null;
      principalPaid?: number | string | null;
      status?: string | null;
    }> | null;
  } | null | undefined;
  repayments?: Array<{
    paymentDate?: string | null;
    principalPaid?: number | string | null;
    status?: string | null;
  }> | null;
  paymentType: string;
  paymentDate: string;
  lastPaymentDate?: string | null;
  currentTotalAmount?: string;
  currentPrincipalPaid?: string;
  proRataDaily?: boolean;
}

export interface RecalculationResult {
  principalPaid: string;
  interestPaid: string;
  totalAmount: string;
  daysElapsed: number;
  calculationNote: string;
  isBeforeDisbursal?: boolean;
  effectiveOutstanding?: string;
}

export function calculateRepaymentSplit({
  facility,
  repayments,
  paymentType,
  paymentDate,
  lastPaymentDate,
  currentTotalAmount,
  currentPrincipalPaid,
  proRataDaily,
}: RecalculationParams): RecalculationResult {
  if (!facility) {
    return {
      principalPaid: "0",
      interestPaid: "0",
      totalAmount: "0",
      daysElapsed: 0,
      calculationNote: "",
      isBeforeDisbursal: false,
    };
  }

  const rawOutBal = Math.max(0, parseFloat(String(facility.outstandingBalance || 0)) || 0);
  const rate = Math.max(0, parseFloat(String(facility.interestRate || 0)) || 0);
  const freq = facility.repaymentFrequency || "monthly";
  const installment = Math.max(0, parseFloat(String(facility.installmentAmount || 0)) || 0);

  function parseDateParts(dateStr?: string | null): number | null {
    if (!dateStr) return null;
    const parts = dateStr.slice(0, 10).split("-");
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return Date.UTC(y, m, d);
  }

  // Check if payment date is before facility disbursal date
  const disbursalDateStr = facility.disbursementDate || facility.sanctionDate;
  const isBeforeDisbursal = Boolean(
    disbursalDateStr &&
    paymentDate &&
    paymentDate.slice(0, 10) < disbursalDateStr.slice(0, 10)
  );

  const targetDateStr = paymentDate ? paymentDate.slice(0, 10) : "";
  const allRepayments = (repayments && repayments.length > 0)
    ? repayments
    : (facility.allRepayments || facility.repayments || []);

  // When calculating interest for a date prior to other completed repayments,
  // those subsequent principal repayments had NOT yet occurred as of targetDate.
  // We add back principal paid on dates strictly AFTER targetDate to reconstruct
  // the exact historical outstanding balance on that date.
  const subsequentPrincipal = allRepayments
    .filter((r) => {
      const status = r.status || "completed";
      if (status !== "completed") return false;
      const rDate = r.paymentDate ? r.paymentDate.slice(0, 10) : "";
      return Boolean(rDate && targetDateStr && rDate > targetDateStr);
    })
    .reduce((sum, r) => sum + (parseFloat(String(r.principalPaid || 0)) || 0), 0);

  const outBal = Math.round((rawOutBal + subsequentPrincipal) * 100) / 100;
  const hasAdjustedBalance = subsequentPrincipal > 0;

  // Determine prior payment date:
  // Find the latest completed payment date strictly prior to targetDate.
  let effectiveBaseDateStr: string | null = null;
  if (allRepayments.length > 0) {
    const priorPayments = allRepayments.filter((r) => {
      const status = r.status || "completed";
      if (status !== "completed") return false;
      const rDate = r.paymentDate ? r.paymentDate.slice(0, 10) : "";
      return Boolean(rDate && targetDateStr && rDate < targetDateStr);
    });
    if (priorPayments.length > 0) {
      effectiveBaseDateStr = priorPayments.reduce((max: string, r) => {
        const d = r.paymentDate ? r.paymentDate.slice(0, 10) : "";
        return !max || d > max ? d : max;
      }, "");
    }
  }

  // Fall back to provided lastPaymentDate only if it is before targetDate
  if (!effectiveBaseDateStr && lastPaymentDate) {
    const lpd = lastPaymentDate.slice(0, 10);
    if (!targetDateStr || lpd < targetDateStr) {
      effectiveBaseDateStr = lpd;
    }
  }

  // Otherwise fall back to facility start / disbursement date
  if (!effectiveBaseDateStr) {
    effectiveBaseDateStr =
      facility.repaymentStartDate ||
      facility.disbursementDate ||
      facility.sanctionDate ||
      null;
  }

  let daysElapsed = 0;
  const t1 = parseDateParts(effectiveBaseDateStr);
  const t2 = parseDateParts(paymentDate);
  if (t1 !== null && t2 !== null) {
    daysElapsed = Math.max(0, Math.round((t2 - t1) / (1000 * 60 * 60 * 24)));
  }

  // Calculate dynamic interest on the effective outstanding balance on targetDate
  let calculatedInterest = 0;
  let calculationNote = "";

  const balanceLabel = hasAdjustedBalance
    ? `₹${outBal.toLocaleString("en-IN")} (as of ${targetDateStr})`
    : `₹${outBal.toLocaleString("en-IN")}`;

  // Determine whether to use pro-rata daily interest or standard periodic cycle
  const shouldProRata = proRataDaily !== undefined
    ? proRataDaily
    : (freq === "daily" || (daysElapsed > 0 && (daysElapsed < 27 || daysElapsed > 33)));

  if (isBeforeDisbursal) {
    calculationNote = `⚠️ Payment date cannot be earlier than disbursal date (${disbursalDateStr?.slice(0, 10)})`;
  } else if (rate > 0 && outBal > 0) {
    if (shouldProRata) {
      const days = daysElapsed > 0 ? daysElapsed : 1;
      calculatedInterest = Math.round((outBal * (rate / 100) * days) / 365);
      calculationNote = `${days} day${days > 1 ? "s" : ""} pro-rata @ ${rate}% p.a. on ${balanceLabel}`;
    } else {
      // Standard periodic cycle (~1 month, quarter, or year)
      const periodsPerYear = freq === "quarterly" ? 4 : (freq === "weekly" ? 52 : (freq === "daily" ? 365 : 12));
      calculatedInterest = Math.round((outBal * (rate / 100)) / periodsPerYear);
      const periodName = freq === "quarterly" ? "quarter" : (freq === "weekly" ? "week" : (freq === "daily" ? "day" : "month"));
      calculationNote = `Standard 1 ${periodName} @ ${rate}% p.a. on ${balanceLabel}`;
    }
  } else if (installment > 0 && paymentType === "interest_only") {
    calculatedInterest = installment;
  }

  const isFacilityInterestOnly = facility.interestType === "interest_only";

  if (paymentType === "interest_only" || (isFacilityInterestOnly && paymentType !== "principal_part" && paymentType !== "foreclosure")) {
    return {
      principalPaid: "0",
      interestPaid: calculatedInterest.toString(),
      totalAmount: calculatedInterest.toString(),
      daysElapsed,
      calculationNote: isFacilityInterestOnly && paymentType !== "interest_only"
        ? `${calculationNote} (Interest-Only facility)`
        : calculationNote,
      isBeforeDisbursal,
      effectiveOutstanding: outBal.toString(),
    };
  }

  if (paymentType === "principal_part") {
    const prevTot = parseFloat(currentTotalAmount || "0");
    const prevPrin = parseFloat(currentPrincipalPaid || "0");
    const p = prevPrin > 0 ? prevPrin : (prevTot > 0 ? prevTot : (installment > 0 ? installment : 0));
    const finalP = Math.min(outBal > 0 ? outBal : p, p);
    return {
      principalPaid: finalP.toString(),
      interestPaid: "0",
      totalAmount: finalP.toString(),
      daysElapsed,
      calculationNote: isBeforeDisbursal
        ? `⚠️ Payment date cannot be earlier than disbursal date (${disbursalDateStr?.slice(0, 10)})`
        : `Principal reduction only (Outstanding on ${targetDateStr || "date"}: ₹${outBal.toLocaleString("en-IN")})`,
      isBeforeDisbursal,
      effectiveOutstanding: outBal.toString(),
    };
  }

  if (paymentType === "foreclosure") {
    const p = outBal;
    const total = p + calculatedInterest;
    return {
      principalPaid: p.toString(),
      interestPaid: calculatedInterest.toString(),
      totalAmount: total.toString(),
      daysElapsed,
      calculationNote: isBeforeDisbursal
        ? `⚠️ Payment date cannot be earlier than disbursal date (${disbursalDateStr?.slice(0, 10)})`
        : `Full settlement: ₹${p.toLocaleString("en-IN")} principal + ₹${calculatedInterest.toLocaleString("en-IN")} interest (as of ${targetDateStr || "date"})`,
      isBeforeDisbursal,
      effectiveOutstanding: outBal.toString(),
    };
  }

  // Standard amortizing EMI or Daily Collection
  let totalInstallment = installment;
  if (freq === "daily" && daysElapsed > 1 && shouldProRata) {
    totalInstallment = installment * daysElapsed;
  }
  if (totalInstallment <= 0) {
    totalInstallment = calculatedInterest;
  }

  const interestPortion = Math.min(totalInstallment, calculatedInterest);
  const principalPortion = Math.min(outBal, Math.max(0, totalInstallment - interestPortion));
  const finalTotal = interestPortion + principalPortion;

  return {
    principalPaid: principalPortion.toString(),
    interestPaid: interestPortion.toString(),
    totalAmount: finalTotal.toString(),
    daysElapsed,
    calculationNote,
    isBeforeDisbursal,
    effectiveOutstanding: outBal.toString(),
  };
}

export interface CurrentInstallmentDueResult {
  dueAmount: number;
  subtitle: string;
  isSettled: boolean;
  frequency: string;
}

/**
 * Dynamically computes the regular installment / amount currently due for a borrowing facility
 * taking into account outstanding balance, payments made, moratorium state, interest type, and repayment frequency.
 */
export function calculateCurrentInstallmentDue(
  facility: {
    outstandingBalance?: number | string | null;
    sanctionedAmount?: number | string | null;
    installmentAmount?: number | string | null;
    interestRate?: number | string | null;
    interestType?: string | null;
    repaymentFrequency?: string | null;
    category?: string | null;
    status?: string | null;
    isInMoratorium?: boolean | null;
    moratoriumType?: string | null;
    repaymentStartDate?: string | null;
  } | null | undefined
): CurrentInstallmentDueResult {
  if (!facility) {
    return { dueAmount: 0, subtitle: "No facility data", isSettled: false, frequency: "monthly" };
  }

  const outstanding = Math.max(0, parseFloat(String(facility.outstandingBalance || 0)) || 0);
  const baseInstallment = Math.max(0, parseFloat(String(facility.installmentAmount || 0)) || 0);
  const rate = Math.max(0, parseFloat(String(facility.interestRate || 0)) || 0);
  const freq = facility.repaymentFrequency || "monthly";
  const status = facility.status || "active";

  // 1. Fully settled or closed facility
  if (status === "closed" || outstanding <= 0) {
    return {
      dueAmount: 0,
      subtitle: "Facility fully settled",
      isSettled: true,
      frequency: freq,
    };
  }

  // 2. Check moratorium
  const todayStr = new Date().toISOString().slice(0, 10);
  const hasMoratorium = facility.moratoriumType && facility.moratoriumType !== "none";
  const isInMoratorium = facility.isInMoratorium ?? (hasMoratorium && Boolean(facility.repaymentStartDate && facility.repaymentStartDate > todayStr));

  const periodsPerYear = freq === "quarterly" ? 4 : (freq === "weekly" ? 52 : (freq === "daily" ? 365 : 12));
  const periodInterest = rate > 0 ? Math.round((outstanding * (rate / 100)) / periodsPerYear) : 0;

  if (isInMoratorium) {
    if (facility.moratoriumType === "pre_emi_interest") {
      return {
        dueAmount: periodInterest,
        subtitle: `Pre-EMI interest due / ${freq}`,
        isSettled: false,
        frequency: freq,
      };
    }
    if (facility.moratoriumType === "capitalized") {
      return {
        dueAmount: 0,
        subtitle: "Debt servicing holiday (capitalized)",
        isSettled: false,
        frequency: freq,
      };
    }
  }

  // 3. Interest-only facility: regular due is the periodic interest on current outstanding balance
  if (facility.interestType === "interest_only") {
    return {
      dueAmount: periodInterest,
      subtitle: `Interest-only on current balance / ${freq}`,
      isSettled: false,
      frequency: freq,
    };
  }

  // 4. Daily collection financing: capped at remaining balance
  if (freq === "daily" || facility.category === "Daily Collection Financing") {
    const dailyCap = baseInstallment > 0 ? Math.min(baseInstallment, outstanding) : outstanding;
    return {
      dueAmount: Math.round(dailyCap),
      subtitle: (baseInstallment > 0 && outstanding < baseInstallment)
        ? `Final remaining balance / daily`
        : `Scheduled frequency: daily`,
      isSettled: false,
      frequency: "daily",
    };
  }

  // 5. Standard amortizing loan (reducing or flat EMI)
  if (baseInstallment > 0) {
    const payoffAmount = outstanding + periodInterest;
    if (payoffAmount < baseInstallment) {
      return {
        dueAmount: Math.round(payoffAmount),
        subtitle: `Final remaining payoff / ${freq}`,
        isSettled: false,
        frequency: freq,
      };
    }
    return {
      dueAmount: baseInstallment,
      subtitle: `Scheduled frequency: ${freq}`,
      isSettled: false,
      frequency: freq,
    };
  }

  // Fallback when baseInstallment is not explicitly set
  const fallbackDue = periodInterest > 0 ? periodInterest : outstanding;
  return {
    dueAmount: fallbackDue,
    subtitle: `Scheduled frequency: ${freq}`,
    isSettled: false,
    frequency: freq,
  };
}
