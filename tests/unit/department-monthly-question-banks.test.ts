import { describe, expect, it } from "vitest";

describe("Department Monthly Question Bank Logic", () => {
  it("formats month and shifts month boundaries correctly", () => {
    function shiftMonth(monthYear: string, offset: number): string {
      const [yStr, mStr] = monthYear.split("-");
      let y = parseInt(yStr, 10);
      let m = parseInt(mStr, 10) + offset;
      while (m > 12) {
        m -= 12;
        y += 1;
      }
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      return `${y}-${String(m).padStart(2, "0")}`;
    }

    expect(shiftMonth("2026-11", -1)).toBe("2026-10");
    expect(shiftMonth("2026-11", 1)).toBe("2026-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("matches department questions with case insensitivity and general tags", () => {
    const mockQuestions = [
      { id: 1, departmentTags: ["Front Office"] },
      { id: 2, departmentTags: ["Housekeeping"] },
      { id: 3, departmentTags: ["all"] },
      { id: 4, departmentTags: ["ICU/HDU", "OT"] },
    ];

    function matchDepartmentQuestions(deptName: string, includeGeneral: boolean) {
      const trimmed = deptName.trim().toLowerCase();
      return mockQuestions.filter((q) => {
        return q.departmentTags.some((t) => {
          const tTrim = t.trim().toLowerCase();
          if (tTrim === trimmed) return true;
          if (includeGeneral && tTrim === "all") return true;
          return false;
        });
      });
    }

    const foQuestions = matchDepartmentQuestions("Front Office ", true);
    expect(foQuestions.map((q) => q.id)).toEqual([1, 3]);

    const icuQuestions = matchDepartmentQuestions("ICU/HDU", false);
    expect(icuQuestions.map((q) => q.id)).toEqual([4]);

    const hkQuestions = matchDepartmentQuestions("Housekeeping", true);
    expect(hkQuestions.map((q) => q.id)).toEqual([2, 3]);
  });

  it("applies the 'Clinical' tag to all departments marked as clinical", () => {
    const mockQuestions = [
      { id: 1, departmentTags: ["Front Office"] },
      { id: 2, departmentTags: ["Clinical"] }, // Applicable to all clinical depts
      { id: 3, departmentTags: ["all"] },
      { id: 4, departmentTags: ["ICU/HDU"] },
      { id: 5, departmentTags: ["clinical"] }, // case-insensitive
    ];

    const clinicalDepartments = new Set(["icu/hdu", "ot", "nicu", "ward", "opd", "nursing central"]);

    function matchQuestionsForDepartment(deptName: string, includeGeneral: boolean) {
      const trimmed = deptName.trim().toLowerCase();
      const isClinicalDept = clinicalDepartments.has(trimmed);
      return mockQuestions.filter((q) => {
        return q.departmentTags.some((t) => {
          const tTrim = t.trim().toLowerCase();
          if (tTrim === trimmed) return true;
          if (isClinicalDept && tTrim === "clinical") return true;
          if (includeGeneral && tTrim === "all") return true;
          return false;
        });
      });
    }

    // Clinical department ICU/HDU: should match id 2 (Clinical), id 3 (all), id 4 (ICU/HDU), id 5 (clinical)
    const icuQuestions = matchQuestionsForDepartment("ICU/HDU", true);
    expect(icuQuestions.map((q) => q.id)).toEqual([2, 3, 4, 5]);

    // Another clinical department Ward: should match id 2 (Clinical), id 3 (all), id 5 (clinical)
    const wardQuestions = matchQuestionsForDepartment("Ward", true);
    expect(wardQuestions.map((q) => q.id)).toEqual([2, 3, 5]);

    // Non-clinical department Front Office: should match id 1 (Front Office) and id 3 (all), but NOT id 2 or 5
    const foQuestions = matchQuestionsForDepartment("Front Office", true);
    expect(foQuestions.map((q) => q.id)).toEqual([1, 3]);

    // Non-clinical department Housekeeping without general: matches none
    const hkQuestions = matchQuestionsForDepartment("Housekeeping", false);
    expect(hkQuestions.map((q) => q.id)).toEqual([]);
  });
});
