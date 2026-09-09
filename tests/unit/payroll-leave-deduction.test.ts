import { describe, it, expect } from "vitest";
import { calculateLeaveDeductionRate } from "../../server/routes/payroll";

describe("Payroll Leave Deduction Calculation", () => {
  describe("calculateLeaveDeductionRate", () => {
    it("returns 0% deduction for 100% payable leave (e.g. Casual Leave / Sick Leave)", () => {
      const result = calculateLeaveDeductionRate({ payable: true, paymentRate: 100 });
      expect(result).toBe(0);
    });

    it("returns 50% deduction for 50% payable leave (e.g. Half-Pay / Maternity Leave)", () => {
      const result = calculateLeaveDeductionRate({ payable: true, paymentRate: 50 });
      expect(result).toBe(50);
    });

    it("returns 25% deduction for 75% payable leave", () => {
      const result = calculateLeaveDeductionRate({ payable: true, paymentRate: 75 });
      expect(result).toBe(25);
    });

    it("returns 100% deduction for non-payable leave (e.g. Loss of Pay)", () => {
      const result = calculateLeaveDeductionRate({ payable: false, paymentRate: 0 });
      expect(result).toBe(100);
    });

    it("returns 100% deduction when payable is false even if paymentRate is non-zero", () => {
      const result = calculateLeaveDeductionRate({ payable: false, paymentRate: 100 });
      expect(result).toBe(100);
    });

    it("returns 100% deduction for undefined or missing leave type info", () => {
      expect(calculateLeaveDeductionRate(undefined)).toBe(100);
      expect(calculateLeaveDeductionRate(null)).toBe(100);
    });

    it("clamps deduction rate between 0% and 100%", () => {
      // paymentRate > 100 should clamp deduction to 0
      expect(calculateLeaveDeductionRate({ payable: true, paymentRate: 120 })).toBe(0);
      // paymentRate < 0 should clamp deduction to 100
      expect(calculateLeaveDeductionRate({ payable: true, paymentRate: -10 })).toBe(100);
    });
  });

  describe("End-to-end deduction amount logic", () => {
    const daysInMonth = 30;
    const gross = 30000;
    const dailyRate = gross / daysInMonth; // 1000 per day

    const leaveTypeMap: Record<string, { payable: boolean; paymentRate: number }> = {
      "Casual Leave": { payable: true, paymentRate: 100 },
      "Sick Leave": { payable: true, paymentRate: 100 },
      "Maternity Leave": { payable: true, paymentRate: 50 },
      "Loss of Pay": { payable: false, paymentRate: 0 },
    };

    function computeLeaveDeduction(
      leaves: Array<{ leaveType: string; days: number }>
    ): { leaveDaysTaken: number; leaveDeduction: number } {
      let leaveDaysTaken = 0;
      let leaveDeduction = 0;

      for (const lr of leaves) {
        leaveDaysTaken += lr.days;
        const lt = leaveTypeMap[lr.leaveType];
        const deductionRate = calculateLeaveDeductionRate(lt);
        leaveDeduction += dailyRate * lr.days * (deductionRate / 100);
      }

      leaveDeduction = Math.round(leaveDeduction * 100) / 100;
      return { leaveDaysTaken, leaveDeduction };
    }

    it("does not deduct any salary when taking 100% payable leaves (Casual Leave)", () => {
      const { leaveDaysTaken, leaveDeduction } = computeLeaveDeduction([
        { leaveType: "Casual Leave", days: 3 },
      ]);
      expect(leaveDaysTaken).toBe(3);
      expect(leaveDeduction).toBe(0);
      expect(gross - leaveDeduction).toBe(30000);
    });

    it("deducts half-day salary per day for 50% payable leave (Maternity / Half-Pay Leave)", () => {
      const { leaveDaysTaken, leaveDeduction } = computeLeaveDeduction([
        { leaveType: "Maternity Leave", days: 4 },
      ]);
      expect(leaveDaysTaken).toBe(4);
      // 4 days * 1000 * 50% = 2000
      expect(leaveDeduction).toBe(2000);
      expect(gross - leaveDeduction).toBe(28000);
    });

    it("deducts full daily wage for unpaid Loss of Pay", () => {
      const { leaveDaysTaken, leaveDeduction } = computeLeaveDeduction([
        { leaveType: "Loss of Pay", days: 2 },
      ]);
      expect(leaveDaysTaken).toBe(2);
      // 2 days * 1000 * 100% = 2000
      expect(leaveDeduction).toBe(2000);
      expect(gross - leaveDeduction).toBe(28000);
    });

    it("correctly handles mixed leaves (paid + unpaid)", () => {
      const { leaveDaysTaken, leaveDeduction } = computeLeaveDeduction([
        { leaveType: "Casual Leave", days: 2 }, // 0 deduction
        { leaveType: "Loss of Pay", days: 1 },   // 1000 deduction
      ]);
      expect(leaveDaysTaken).toBe(3);
      expect(leaveDeduction).toBe(1000);
      expect(gross - leaveDeduction).toBe(29000);
    });

    it("handles half-day leaves accurately", () => {
      const { leaveDaysTaken, leaveDeduction } = computeLeaveDeduction([
        { leaveType: "Casual Leave", days: 0.5 },
        { leaveType: "Loss of Pay", days: 0.5 },
      ]);
      expect(leaveDaysTaken).toBe(1);
      // Casual Leave 0.5 -> 0, Loss of Pay 0.5 * 1000 = 500
      expect(leaveDeduction).toBe(500);
    });
  });
});
