/**
 * Unit Tests — Sequence / Financial Year Service
 *
 * Tests: getCurrentFinancialYear
 * Source: server/services/sequence.ts
 *
 * Note: generateDocNumber requires a DB transaction, so it is tested
 * in integration tests instead.
 */
import { describe, it, expect } from "vitest";
import { getCurrentFinancialYear } from "../../server/services/sequence.ts";

describe("getCurrentFinancialYear", () => {
  it("should return correct FY for April (start of Indian FY)", () => {
    const date = new Date(2026, 3, 1); // April 1, 2026
    expect(getCurrentFinancialYear(date)).toBe("26-27");
  });

  it("should return correct FY for March (end of Indian FY)", () => {
    const date = new Date(2027, 2, 31); // March 31, 2027
    expect(getCurrentFinancialYear(date)).toBe("26-27");
  });

  it("should return correct FY for January (Q4 of FY)", () => {
    const date = new Date(2027, 0, 15); // January 15, 2027
    expect(getCurrentFinancialYear(date)).toBe("26-27");
  });

  it("should return correct FY for December", () => {
    const date = new Date(2026, 11, 25); // December 25, 2026
    expect(getCurrentFinancialYear(date)).toBe("26-27");
  });

  it("should return correct FY for February", () => {
    const date = new Date(2026, 1, 14); // February 14, 2026
    expect(getCurrentFinancialYear(date)).toBe("25-26");
  });

  it("should handle year boundary correctly (April vs March)", () => {
    // March 31, 2026 → FY 25-26
    expect(getCurrentFinancialYear(new Date(2026, 2, 31))).toBe("25-26");
    // April 1, 2026 → FY 26-27
    expect(getCurrentFinancialYear(new Date(2026, 3, 1))).toBe("26-27");
  });

  it("should default to current date when no argument", () => {
    const result = getCurrentFinancialYear();
    // Just verify format: "XX-YY"
    expect(result).toMatch(/^\d{2}-\d{2}$/);
    // The second number should be first + 1
    const [start, end] = result.split("-").map(Number);
    expect(end - start).toBe(1);
  });
});
