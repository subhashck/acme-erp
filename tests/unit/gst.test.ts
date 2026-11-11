/**
 * Unit Tests — GST Calculation Service
 *
 * Tests: calculateLineTax, calculateInvoiceSummary
 * Source: server/services/gst.ts
 */
import { describe, it, expect } from "vitest";
import { calculateLineTax, calculateInvoiceSummary } from "../../server/services/gst.ts";

describe("calculateLineTax", () => {
  it("should calculate intra-state GST (CGST + SGST split)", () => {
    const result = calculateLineTax({
      quantity: 10,
      unitRate: 100,
      gstPercent: 12,
      isInterState: false,
    });

    expect(result.grossAmount).toBe(1000);
    expect(result.discountAmount).toBe(0);
    expect(result.taxableAmount).toBe(1000);
    expect(result.cgstAmount).toBe(60); // 6% of 1000
    expect(result.sgstAmount).toBe(60); // 6% of 1000
    expect(result.igstAmount).toBe(0);
    expect(result.totalAmount).toBe(1120);
  });

  it("should calculate inter-state GST (IGST only)", () => {
    const result = calculateLineTax({
      quantity: 5,
      unitRate: 200,
      gstPercent: 18,
      isInterState: true,
    });

    expect(result.grossAmount).toBe(1000);
    expect(result.taxableAmount).toBe(1000);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
    expect(result.igstAmount).toBe(180); // 18% of 1000
    expect(result.totalAmount).toBe(1180);
  });

  it("should handle zero GST", () => {
    const result = calculateLineTax({
      quantity: 3,
      unitRate: 50,
      gstPercent: 0,
    });

    expect(result.grossAmount).toBe(150);
    expect(result.taxableAmount).toBe(150);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
    expect(result.igstAmount).toBe(0);
    expect(result.totalAmount).toBe(150);
  });

  it("should apply discount before GST", () => {
    const result = calculateLineTax({
      quantity: 10,
      unitRate: 100,
      discountPercent: 10,
      gstPercent: 12,
      isInterState: false,
    });

    expect(result.grossAmount).toBe(1000);
    expect(result.discountPercent).toBe(10);
    expect(result.discountAmount).toBe(100); // 10% of 1000
    expect(result.taxableAmount).toBe(900); // 1000 - 100
    expect(result.cgstAmount).toBe(54);     // 6% of 900
    expect(result.sgstAmount).toBe(54);     // 6% of 900
    expect(result.totalAmount).toBe(1008);  // 900 + 54 + 54
  });

  it("should handle zero quantity", () => {
    const result = calculateLineTax({
      quantity: 0,
      unitRate: 100,
      gstPercent: 12,
    });

    expect(result.grossAmount).toBe(0);
    expect(result.totalAmount).toBe(0);
  });

  it("should handle zero unit rate", () => {
    const result = calculateLineTax({
      quantity: 10,
      unitRate: 0,
      gstPercent: 12,
    });

    expect(result.grossAmount).toBe(0);
    expect(result.totalAmount).toBe(0);
  });

  it("should handle decimal quantities and rates", () => {
    const result = calculateLineTax({
      quantity: 2.5,
      unitRate: 33.33,
      gstPercent: 5,
      isInterState: false,
    });

    // 2.5 * 33.33 = 83.325 → toFixed(2) = 83.32 (IEEE 754 rounding)
    expect(result.grossAmount).toBe(83.32);
    expect(result.taxableAmount).toBe(83.32);
    // CGST = 2.5% of 83.32 = 2.083 → toFixed(2) = 2.08
    expect(result.cgstAmount).toBe(2.08);
    expect(result.sgstAmount).toBe(2.08);
  });

  it("should default missing values to zero", () => {
    const result = calculateLineTax({
      quantity: undefined as any,
      unitRate: undefined as any,
    });

    expect(result.grossAmount).toBe(0);
    expect(result.totalAmount).toBe(0);
    expect(result.gstPercent).toBe(0);
    expect(result.discountPercent).toBe(0);
  });
});

describe("calculateInvoiceSummary", () => {
  it("should aggregate multiple line items", () => {
    const line1 = calculateLineTax({ quantity: 10, unitRate: 100, gstPercent: 12 });
    const line2 = calculateLineTax({ quantity: 5, unitRate: 200, gstPercent: 18 });

    const summary = calculateInvoiceSummary([line1, line2]);

    expect(summary.subtotal).toBe(2000);       // 1000 + 1000
    expect(summary.taxableAmount).toBe(2000);
    expect(summary.cgstAmount).toBe(150);       // 60 + 90
    expect(summary.sgstAmount).toBe(150);       // 60 + 90
    expect(summary.igstAmount).toBe(0);
    // net = taxable + cgst + sgst = 2000 + 150 + 150 = 2300, roundOff = 0
    expect(summary.netAmount).toBe(2300);
    expect(summary.roundOff).toBe(0);
  });

  it("should round to nearest rupee", () => {
    // Create a line that results in a non-integer total
    const line = calculateLineTax({ quantity: 3, unitRate: 99, gstPercent: 5 });
    // gross = 297, taxable = 297, cgst = 7.43, sgst = 7.43
    // raw total = 297 + 7.43 + 7.43 = 311.86
    // But toFixed(2) on (297 * 2.5 / 100) = 7.425 → 7.42 (IEEE 754)
    // raw total = 297 + 7.42 + 7.42 = 311.84 → net = 312, roundOff = 0.16

    const summary = calculateInvoiceSummary([line]);

    expect(summary.netAmount).toBe(312);
    expect(summary.roundOff).toBe(0.16);
  });

  it("should handle empty line items", () => {
    const summary = calculateInvoiceSummary([]);

    expect(summary.subtotal).toBe(0);
    expect(summary.netAmount).toBe(0);
    expect(summary.roundOff).toBe(0);
  });

  it("should handle lines with discounts", () => {
    const line = calculateLineTax({ quantity: 10, unitRate: 100, discountPercent: 20, gstPercent: 12 });

    const summary = calculateInvoiceSummary([line]);

    expect(summary.subtotal).toBe(1000);
    expect(summary.discountAmount).toBe(200);
    expect(summary.taxableAmount).toBe(800);
  });
});
