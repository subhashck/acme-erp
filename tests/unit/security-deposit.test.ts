import { describe, expect, it } from "vitest";
import { nextSecurityDepositDeduction, securityDepositBalances } from "../../server/services/security-deposit";

describe("security deposit accounting", () => {
  it("counts opening funds and paid payslips, separating pending and cancelled deductions", () => {
    expect(securityDepositBalances(1000, [
      { status: "Paid", securityDeposit: 500 },
      { status: "Approved by HR", securityDeposit: 500 },
      { status: "Cancelled", securityDeposit: 500 },
      { status: "Superseded", securityDeposit: 500 },
    ], [{ amount: 200 }])).toEqual({ totalDeducted: 1500, pendingDeduction: 500, totalRefunded: 200, netHeld: 1300 });
  });

  it("does not hide actual collections above a reduced or zero target", () => {
    expect(securityDepositBalances(1000, [{ status: "Paid", securityDeposit: 500 }], []).totalDeducted).toBe(1500);
  });

  const input = { target: 1000, monthly: 300, openingBalance: 0, month: "2026-09", startMonth: "2026-09", deductions: [] };
  it("starts deductions in the selected month without inferring earlier collections", () => {
    expect(nextSecurityDepositDeduction(input)).toBe(300);
    expect(nextSecurityDepositDeduction({ ...input, month: "2026-08" })).toBe(0);
  });
  it("reserves pending payslips and caps the final installment", () => {
    expect(nextSecurityDepositDeduction({ ...input, openingBalance: 500, deductions: [{ status: "Draft", securityDeposit: 300 }] })).toBe(200);
  });
  it("releases cancelled reservations", () => {
    expect(nextSecurityDepositDeduction({ ...input, deductions: [{ status: "Cancelled", securityDeposit: 1000 }] })).toBe(300);
  });
  it("handles fractional rupees exactly", () => {
    expect(nextSecurityDepositDeduction({ ...input, target: 1, monthly: 0.7, openingBalance: 0.1, deductions: [{ status: "Paid", securityDeposit: 0.2 }] })).toBe(0.7);
  });
  it("does not restart collection after refunds", () => {
    expect(nextSecurityDepositDeduction({ ...input, openingBalance: 1000 })).toBe(0);
  });
});
