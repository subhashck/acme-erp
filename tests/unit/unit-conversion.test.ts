import { describe, it, expect } from "vitest";
import {
  findUnit,
  getUnitConversionFactor,
  formatQtyNumber,
  UnitTypeItem,
  UnitConversionItem,
} from "../../src/lib/unit-conversion.ts";

describe("Unit Conversion Utility", () => {
  const sampleUnits: UnitTypeItem[] = [
    { id: 1, name: "Tablet", symbol: "TAB", isBaseUnit: true },
    { id: 2, name: "Strip", symbol: "STRIP", isBaseUnit: false },
    { id: 3, name: "Box", symbol: "BOX", isBaseUnit: false },
    { id: 4, name: "Bottle", symbol: "BTL", isBaseUnit: true },
    { id: 5, name: "Milliliter", symbol: "ML", isBaseUnit: true },
    { id: 6, name: "Liter", symbol: "LTR", isBaseUnit: false },
  ];

  const sampleConversions: UnitConversionItem[] = [
    // 1 BOX = 10 STRIP
    { id: 1, fromUnitId: 3, toUnitId: 2, multiplier: 10 },
    // 1 STRIP = 10 TAB
    { id: 2, fromUnitId: 2, toUnitId: 1, multiplier: 10 },
    // 1 LTR = 1000 ML
    { id: 3, fromUnitId: 6, toUnitId: 5, multiplier: 1000 },
  ];

  it("finds units by id, symbol, or name", () => {
    expect(findUnit(1, sampleUnits)?.symbol).toBe("TAB");
    expect(findUnit("tab", sampleUnits)?.id).toBe(1);
    expect(findUnit("Strip", sampleUnits)?.id).toBe(2);
    expect(findUnit("BOX", sampleUnits)?.id).toBe(3);
  });

  it("returns factor 1 when from and to units are identical", () => {
    const result = getUnitConversionFactor("TAB", "TAB", sampleUnits, sampleConversions);
    expect(result.convertible).toBe(true);
    expect(result.factor).toBe(1);
  });

  it("computes direct conversion factor correctly", () => {
    // 1 BOX to STRIP = 10
    const res = getUnitConversionFactor("BOX", "STRIP", sampleUnits, sampleConversions);
    expect(res.convertible).toBe(true);
    expect(res.factor).toBe(10);
  });

  it("computes inverse conversion factor correctly", () => {
    // 1 STRIP to BOX = 0.1
    const res = getUnitConversionFactor("STRIP", "BOX", sampleUnits, sampleConversions);
    expect(res.convertible).toBe(true);
    expect(res.factor).toBe(0.1);
  });

  it("computes multi-step BFS conversions transitively", () => {
    // 1 BOX -> STRIP (10) -> TAB (10) = 100 TAB
    const boxToTab = getUnitConversionFactor("BOX", "TAB", sampleUnits, sampleConversions);
    expect(boxToTab.convertible).toBe(true);
    expect(boxToTab.factor).toBe(100);

    // 1 TAB -> STRIP (0.1) -> BOX (0.1) = 0.01 BOX
    const tabToBox = getUnitConversionFactor("TAB", "BOX", sampleUnits, sampleConversions);
    expect(tabToBox.convertible).toBe(true);
    expect(tabToBox.factor).toBe(0.01);
  });

  it("identifies non-convertible unit pairs", () => {
    // ML and BOX have no conversion path
    const res = getUnitConversionFactor("ML", "BOX", sampleUnits, sampleConversions);
    expect(res.convertible).toBe(false);
    expect(res.factor).toBe(1);
  });

  it("formats quantities cleanly without trailing decimal zeroes", () => {
    expect(formatQtyNumber(10)).toBe("10");
    expect(formatQtyNumber(10.5)).toBe("10.5");
    expect(formatQtyNumber(0.01)).toBe("0.01");
    expect(formatQtyNumber(1000.25)).toBe("1,000.25");
  });
});
