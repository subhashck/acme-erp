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
});
