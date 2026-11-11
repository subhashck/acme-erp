import { describe, it, expect } from "vitest";
import {
  normalizeToIsoMonthKey,
  normalizeMonthToKey,
} from "../../src/components/college/college-receipt-utils";
import {
  normalizeToIsoMonth,
  classifyFeeCategory,
} from "../../server/routes/nursing";

describe("College Fee Dues Engine & Calculations", () => {
  describe("Month Token Normalization", () => {
    it("normalizes display month names to ISO YYYY-MM", () => {
      expect(normalizeToIsoMonth("June 2026")).toBe("2026-06");
      expect(normalizeToIsoMonth("Jun 2026")).toBe("2026-06");
      expect(normalizeToIsoMonth("October 2026")).toBe("2026-10");
      expect(normalizeToIsoMonth("January 2027")).toBe("2027-01");
      expect(normalizeToIsoMonth("Feb 2027")).toBe("2027-02");
    });

    it("normalizes ISO YYYY-MM or YYYY-M strings idempotently", () => {
      expect(normalizeToIsoMonth("2026-06")).toBe("2026-06");
      expect(normalizeToIsoMonth("2026-6")).toBe("2026-06");
      expect(normalizeToIsoMonth("2027-01")).toBe("2027-01");
    });

    it("handles 2-digit apostrophe year formats", () => {
      expect(normalizeToIsoMonth("June '26")).toBe("2026-06");
      expect(normalizeToIsoMonth("Nov '26")).toBe("2026-11");
    });

    it("client utility normalizeToIsoMonthKey matches server normalization", () => {
      expect(normalizeToIsoMonthKey("June 2026")).toBe("2026-06");
      expect(normalizeToIsoMonthKey("2026-06")).toBe("2026-06");
      expect(normalizeToIsoMonthKey("October 2026")).toBe("2026-10");
      expect(normalizeToIsoMonthKey("January 2027")).toBe("2027-01");
    });

    it("bidirectional normalization matches between ISO and display month", () => {
      const display = "June 2026";
      const iso = normalizeToIsoMonthKey(display);
      expect(iso).toBe("2026-06");
      expect(normalizeMonthToKey(iso)).toBe("June 2026");
    });
  });

  describe("Fee Category Classification", () => {
    it("classifies tuition and course fee variants as course", () => {
      expect(classifyFeeCategory("Course Fee")).toBe("course");
      expect(classifyFeeCategory("Tuition Fee")).toBe("course");
      expect(classifyFeeCategory("Tuition & Composite Fee")).toBe("course");
      expect(classifyFeeCategory("Course Tuition")).toBe("course");
    });

    it("classifies hostel accommodation variants as hostel", () => {
      expect(classifyFeeCategory("Hostel Fee")).toBe("hostel");
      expect(classifyFeeCategory("Hostel Accommodation")).toBe("hostel");
      expect(classifyFeeCategory("Lodging Charges")).toBe("hostel");
    });

    it("classifies mess and catering variants as mess", () => {
      expect(classifyFeeCategory("Mess Fee")).toBe("mess");
      expect(classifyFeeCategory("Hostel Mess & Catering Fee")).toBe("mess");
      expect(classifyFeeCategory("Dining & Meal Plan")).toBe("mess");
    });

    it("classifies one-time and institutional components as other", () => {
      expect(classifyFeeCategory("Admission Fee")).toBe("other");
      expect(classifyFeeCategory("Uniform & Kit Fee")).toBe("other");
      expect(classifyFeeCategory("Security Deposit")).toBe("other");
      expect(classifyFeeCategory("Examination Fee")).toBe("other");
      expect(classifyFeeCategory("Library & Misc Fee")).toBe("other");
    });
  });

  describe("Head Summaries & Multi-Head Invariants", () => {
    it("correctly reconciles multi-head balances without cross-head contamination", () => {
      const components = [
        {
          name: "Course Fee",
          expectedAmount: 120000,
          paidAmount: 60000,
          dueAmount: 20000,
          scheduledBalance: 40000,
        },
        {
          name: "Hostel Fee",
          expectedAmount: 36000,
          paidAmount: 36000,
          dueAmount: 0,
          scheduledBalance: 0,
        },
        {
          name: "Mess Fee",
          expectedAmount: 30000,
          paidAmount: 15000,
          dueAmount: 5000,
          scheduledBalance: 10000,
        },
      ];

      const heads = {
        course: { expected: 0, paid: 0, dueNow: 0, futureScheduled: 0 },
        hostel: { expected: 0, paid: 0, dueNow: 0, futureScheduled: 0 },
        mess: { expected: 0, paid: 0, dueNow: 0, futureScheduled: 0 },
        other: { expected: 0, paid: 0, dueNow: 0, futureScheduled: 0 },
      };

      components.forEach((comp) => {
        const cat = classifyFeeCategory(comp.name);
        heads[cat].expected += comp.expectedAmount;
        heads[cat].paid += comp.paidAmount;
        heads[cat].dueNow += comp.dueAmount;
        heads[cat].futureScheduled += comp.scheduledBalance;
      });

      expect(heads.course.expected).toBe(120000);
      expect(heads.course.dueNow).toBe(20000);
      expect(heads.hostel.dueNow).toBe(0); // Fully settled
      expect(heads.mess.dueNow).toBe(5000);
      expect(heads.course.dueNow + heads.hostel.dueNow + heads.mess.dueNow).toBe(25000);
    });

    it("computes overdue aging brackets accurately", () => {
      const categorizeDays = (days: number) => {
        if (days <= 0) return "current";
        if (days <= 30) return "1_30";
        if (days <= 60) return "31_60";
        if (days <= 90) return "61_90";
        return "90_plus";
      };

      expect(categorizeDays(0)).toBe("current");
      expect(categorizeDays(15)).toBe("1_30");
      expect(categorizeDays(30)).toBe("1_30");
      expect(categorizeDays(45)).toBe("31_60");
      expect(categorizeDays(75)).toBe("61_90");
      expect(categorizeDays(120)).toBe("90_plus");
    });
  });
});
