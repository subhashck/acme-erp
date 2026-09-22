import { generateDocNumber } from "./sequence.ts";

export type LabResultFlag = "Normal" | "High" | "Low" | "Critical";

export interface LabReferenceRangeLike {
  gender: string;
  ageMin: number;
  ageMax: number;
  lowValue?: string | number | null;
  highValue?: string | number | null;
  criticalLow?: string | number | null;
  criticalHigh?: string | number | null;
  textRange?: string | null;
  remarks?: string | null;
}

/**
 * Finds the most specific reference range matching patient demographics.
 */
export function findMatchingReferenceRange<T extends LabReferenceRangeLike>(
  ranges: T[],
  patientAge: number,
  patientGender: string
): T | undefined {
  if (!ranges || ranges.length === 0) return undefined;

  const normGender = (patientGender || "").trim().toLowerCase();

  // 1. Exact gender + age bracket
  const exactGenderAndAge = ranges.find(
    (r) =>
      r.gender.toLowerCase() === normGender &&
      patientAge >= r.ageMin &&
      patientAge <= r.ageMax
  );
  if (exactGenderAndAge) return exactGenderAndAge;

  // 2. Both genders + age bracket
  const bothGenderAndAge = ranges.find(
    (r) =>
      (r.gender === "Both" || !r.gender) &&
      patientAge >= r.ageMin &&
      patientAge <= r.ageMax
  );
  if (bothGenderAndAge) return bothGenderAndAge;

  // 3. Exact gender (any age)
  const exactGender = ranges.find((r) => r.gender.toLowerCase() === normGender);
  if (exactGender) return exactGender;

  // 4. Default to first available
  return ranges[0];
}

/**
 * Evaluates test result value against reference ranges to determine clinical flag:
 * Normal | High | Low | Critical
 */
export function evaluateResultFlag(
  value: string | number | null | undefined,
  ranges: LabReferenceRangeLike[],
  patientAge: number,
  patientGender: string
): LabResultFlag {
  if (value === null || value === undefined || value === "") {
    return "Normal";
  }

  const strVal = String(value).trim();
  const matchedRange = findMatchingReferenceRange(ranges, patientAge, patientGender);

  if (!matchedRange) {
    return "Normal";
  }

  const numericVal = parseFloat(strVal);
  const isNumeric = !isNaN(numericVal) && isFinite(numericVal);

  if (isNumeric) {
    const low = matchedRange.lowValue != null ? Number(matchedRange.lowValue) : null;
    const high = matchedRange.highValue != null ? Number(matchedRange.highValue) : null;
    const critLow = matchedRange.criticalLow != null ? Number(matchedRange.criticalLow) : null;
    const critHigh = matchedRange.criticalHigh != null ? Number(matchedRange.criticalHigh) : null;

    // Check critical thresholds first
    if (critLow !== null && numericVal < critLow) {
      return "Critical";
    }
    if (critHigh !== null && numericVal > critHigh) {
      return "Critical";
    }

    // Check normal thresholds
    if (low !== null && numericVal < low) {
      return "Low";
    }
    if (high !== null && numericVal > high) {
      return "High";
    }

    return "Normal";
  }

  // Qualitative analysis (e.g. "Positive", "Reactive", "Negative", "Nil")
  const lowerStr = strVal.toLowerCase();
  const lowerExpected = (matchedRange.textRange || "").toLowerCase();

  // If expected text contains "negative" or "nil" or "non-reactive"
  if (
    lowerExpected.includes("negative") ||
    lowerExpected.includes("nil") ||
    lowerExpected.includes("non-reactive")
  ) {
    if (
      lowerStr.includes("non-reactive") ||
      lowerStr.includes("nonreactive") ||
      lowerStr.includes("not detected") ||
      lowerStr.includes("negative") ||
      lowerStr.includes("nil") ||
      lowerStr.includes("normal")
    ) {
      return "Normal";
    }
    if (
      lowerStr.includes("positive") ||
      lowerStr.includes("reactive") ||
      lowerStr.includes("detected")
    ) {
      return "High";
    }
  }

  if (lowerExpected && lowerStr === lowerExpected) {
    return "Normal";
  }

  return "Normal";
}

/**
 * Generate unique order number via sequential counter
 */
export async function generateLabOrderNo(tx: any): Promise<string> {
  return generateDocNumber(tx, "LAB");
}

/**
 * Generate unique sample accession number via sequential counter
 */
export async function generateAccessionNo(tx: any): Promise<string> {
  return generateDocNumber(tx, "ACC");
}
