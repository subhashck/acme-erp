// Work in paise so the final installment and refundable balance stay exact.
const cents = (value: unknown) => Math.round(Number(value || 0) * 100);
const pendingStatuses = new Set(["Draft", "Active", "Approved by HR", "Approved by Management", "Approved by COO"]);

export function securityDepositBalances(
  openingBalance: unknown,
  deductions: Array<{ status: string; securityDeposit: unknown }>,
  refunds: Array<{ amount: unknown }>,
) {
  const collected = cents(openingBalance) + deductions.reduce((sum, p) => sum + (p.status === "Paid" ? cents(p.securityDeposit) : 0), 0);
  const pending = deductions.reduce((sum, p) => sum + (pendingStatuses.has(p.status) ? cents(p.securityDeposit) : 0), 0);
  const refunded = refunds.reduce((sum, r) => sum + cents(r.amount), 0);
  return { totalDeducted: collected / 100, pendingDeduction: pending / 100, totalRefunded: refunded / 100, netHeld: (collected - refunded) / 100 };
}

export function nextSecurityDepositDeduction(input: {
  target: unknown; monthly: unknown; openingBalance: unknown; startMonth?: string | null; month: string;
  deductions: Array<{ status: string; securityDeposit: unknown }>;
}) {
  if (input.startMonth && input.month < input.startMonth) return 0;
  const balance = securityDepositBalances(input.openingBalance, input.deductions, []);
  const remaining = Math.max(0, cents(input.target) - cents(balance.totalDeducted) - cents(balance.pendingDeduction));
  return Math.max(0, Math.min(cents(input.monthly), remaining)) / 100;
}
