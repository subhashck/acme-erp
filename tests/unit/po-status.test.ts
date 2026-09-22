/**
 * Unit Tests — PO Status Computation
 *
 * Tests: toNum, computePoStatus, computePaymentStatus
 * Source: server/utils/poStatus.ts
 */
import { describe, it, expect } from "vitest";
import { toNum, computePoStatus, computePaymentStatus } from "../../server/utils/poStatus.ts";

describe("toNum", () => {
  it("should convert string numbers", () => {
    expect(toNum("123.45")).toBe(123.45);
    expect(toNum("0")).toBe(0);
    expect(toNum("-50")).toBe(-50);
  });

  it("should pass through actual numbers", () => {
    expect(toNum(42)).toBe(42);
    expect(toNum(0)).toBe(0);
    expect(toNum(-10.5)).toBe(-10.5);
  });

  it("should return 0 for non-numeric values", () => {
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
    expect(toNum("abc")).toBe(0);
    expect(toNum("")).toBe(0);
    expect(toNum(NaN)).toBe(0);
    expect(toNum(Infinity)).toBe(0);
    expect(toNum(-Infinity)).toBe(0);
  });
});

describe("computePoStatus", () => {
  it("should return 'open' for empty items array", () => {
    expect(computePoStatus([])).toBe("open");
  });

  it("should return 'open' when no items have been received", () => {
    expect(
      computePoStatus([
        { ordered_qty: 100, receivedQty: 0 },
        { ordered_qty: 50, receivedQty: 0 },
      ])
    ).toBe("open");
  });

  it("should return 'closed' when all items are fully received", () => {
    expect(
      computePoStatus([
        { ordered_qty: 100, receivedQty: 100 },
        { ordered_qty: 50, receivedQty: 50 },
      ])
    ).toBe("closed");
  });

  it("should return 'closed' when received exceeds ordered (over-delivery)", () => {
    expect(
      computePoStatus([
        { ordered_qty: 100, receivedQty: 120 },
        { ordered_qty: 50, receivedQty: 55 },
      ])
    ).toBe("closed");
  });

  it("should return 'partial' when some items are partially received", () => {
    expect(
      computePoStatus([
        { ordered_qty: 100, receivedQty: 50 },
        { ordered_qty: 50, receivedQty: 0 },
      ])
    ).toBe("partial");
  });

  it("should return 'partial' when some items are fully received and others are not", () => {
    expect(
      computePoStatus([
        { ordered_qty: 100, receivedQty: 100 },
        { ordered_qty: 50, receivedQty: 0 },
      ])
    ).toBe("partial");
  });

  it("should handle string values (Drizzle numeric columns)", () => {
    expect(
      computePoStatus([
        { ordered_qty: "100" as any, receivedQty: "100" as any },
        { ordered_qty: "50" as any, receivedQty: "50" as any },
      ])
    ).toBe("closed");
  });
});

describe("computePaymentStatus", () => {
  it("should return 'unpaid' when nothing is paid", () => {
    expect(computePaymentStatus(1000, 0)).toBe("unpaid");
  });

  it("should return 'partial' when partially paid", () => {
    expect(computePaymentStatus(1000, 500)).toBe("partial");
  });

  it("should return 'paid' when fully paid", () => {
    expect(computePaymentStatus(1000, 1000)).toBe("paid");
  });

  it("should return 'paid' when overpaid", () => {
    expect(computePaymentStatus(1000, 1500)).toBe("paid");
  });

  it("should handle string values (Drizzle numeric columns)", () => {
    expect(computePaymentStatus("1000" as any, "1000" as any)).toBe("paid");
    expect(computePaymentStatus("1000" as any, "0" as any)).toBe("unpaid");
    expect(computePaymentStatus("1000" as any, "500" as any)).toBe("partial");
  });

  it("should handle zero total value", () => {
    expect(computePaymentStatus(0, 0)).toBe("unpaid");
  });
});
