import { describe, it, expect } from "vitest";
import {
  evaluateResultFlag,
  findMatchingReferenceRange,
  type LabReferenceRangeLike,
} from "../../server/services/lab-engine.ts";

describe("Lab Engine — Reference Range Matching & Auto-Flagging", () => {
  const hemoglobinRanges: LabReferenceRangeLike[] = [
    {
      gender: "Male",
      ageMin: 15,
      ageMax: 120,
      lowValue: "13.0",
      highValue: "17.0",
      criticalLow: "7.0",
      criticalHigh: "20.0",
    },
    {
      gender: "Female",
      ageMin: 15,
      ageMax: 120,
      lowValue: "12.0",
      highValue: "15.5",
      criticalLow: "7.0",
      criticalHigh: "20.0",
    },
    {
      gender: "Both",
      ageMin: 0,
      ageMax: 14,
      lowValue: "11.0",
      highValue: "14.5",
      criticalLow: "6.5",
      criticalHigh: "19.0",
    },
  ];

  describe("findMatchingReferenceRange", () => {
    it("matches adult male range correctly", () => {
      const match = findMatchingReferenceRange(hemoglobinRanges, 35, "Male");
      expect(match).toBeDefined();
      expect(match?.gender).toBe("Male");
      expect(match?.lowValue).toBe("13.0");
    });

    it("matches adult female range correctly", () => {
      const match = findMatchingReferenceRange(hemoglobinRanges, 28, "Female");
      expect(match).toBeDefined();
      expect(match?.gender).toBe("Female");
      expect(match?.lowValue).toBe("12.0");
    });

    it("matches pediatric child range (Both genders) under 15", () => {
      const match = findMatchingReferenceRange(hemoglobinRanges, 8, "Male");
      expect(match).toBeDefined();
      expect(match?.gender).toBe("Both");
      expect(match?.lowValue).toBe("11.0");
    });
  });

  describe("evaluateResultFlag — Numeric values", () => {
    it("flags Normal when value is within normal limits", () => {
      const flag = evaluateResultFlag("14.5", hemoglobinRanges, 30, "Male");
      expect(flag).toBe("Normal");
    });

    it("flags Low when value is below normal lowValue but above criticalLow", () => {
      const flag = evaluateResultFlag("11.5", hemoglobinRanges, 30, "Male");
      expect(flag).toBe("Low");
    });

    it("flags High when value is above normal highValue but below criticalHigh", () => {
      const flag = evaluateResultFlag("18.2", hemoglobinRanges, 30, "Male");
      expect(flag).toBe("High");
    });

    it("flags Critical when value is below criticalLow", () => {
      const flag = evaluateResultFlag("5.8", hemoglobinRanges, 30, "Male");
      expect(flag).toBe("Critical");
    });

    it("flags Critical when value is above criticalHigh", () => {
      const flag = evaluateResultFlag("21.5", hemoglobinRanges, 30, "Male");
      expect(flag).toBe("Critical");
    });

    it("evaluates female thresholds correctly", () => {
      // 16.0 is High for adult female (12.0 - 15.5)
      const flag = evaluateResultFlag("16.0", hemoglobinRanges, 30, "Female");
      expect(flag).toBe("High");
    });
  });

  describe("evaluateResultFlag — Qualitative values", () => {
    const widalRanges: LabReferenceRangeLike[] = [
      {
        gender: "Both",
        ageMin: 0,
        ageMax: 120,
        textRange: "Negative (< 1:80)",
      },
    ];

    it("flags Normal for negative qualitative results", () => {
      expect(evaluateResultFlag("Negative", widalRanges, 25, "Male")).toBe("Normal");
      expect(evaluateResultFlag("negative", widalRanges, 25, "Female")).toBe("Normal");
      expect(evaluateResultFlag("Non-Reactive", widalRanges, 25, "Male")).toBe("Normal");
    });

    it("flags High for positive or reactive qualitative results", () => {
      expect(evaluateResultFlag("Positive (1:160)", widalRanges, 25, "Male")).toBe("High");
      expect(evaluateResultFlag("Reactive", widalRanges, 25, "Female")).toBe("High");
    });

    it("flags Normal for null or empty values", () => {
      expect(evaluateResultFlag("", widalRanges, 25, "Male")).toBe("Normal");
      expect(evaluateResultFlag(null, widalRanges, 25, "Male")).toBe("Normal");
    });
  });
});
