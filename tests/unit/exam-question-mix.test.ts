import { describe, expect, it } from "vitest";
import { DEFAULT_EXAM_MIX, difficultyCounts, isDepartmentQuestion, selectExamQuestions } from "../../src/lib/exam-question-mix";

const mix = { ...DEFAULT_EXAM_MIX, basicPercentage: 40, mediumPercentage: 40, advancedPercentage: 20, departmentPercentage: 60 };
function bank() {
  let id = 0;
  return ["basic", "medium", "advanced"].flatMap(difficulty =>
    [[], ["Ward"], ["OT"]].flatMap(departmentTags =>
      Array.from({ length: 30 }, () => ({ id: ++id, difficulty, departmentTags }))));
}
const countDept = (questions: ReturnType<typeof bank>) => questions.filter(q => isDepartmentQuestion(q.departmentTags, "Ward")).length;

describe("configured exam question selection", () => {
  it("meets difficulty and department quotas simultaneously when stock permits", () => {
    const selected = selectExamQuestions(bank(), 20, "Ward", mix);
    expect(["basic", "medium", "advanced"].map(level => selected.filter(q => q.difficulty === level).length)).toEqual([8, 8, 4]);
    expect(countDept(selected)).toBe(12);
    expect(new Set(selected.map(q => q.id)).size).toBe(20);
    expect(selected.some(q => q.departmentTags.includes("OT"))).toBe(false);
  });

  it("rounds difficulty counts without changing exam length, including ties", () => {
    expect(difficultyCounts(7, DEFAULT_EXAM_MIX)).toEqual([4, 2, 1]);
    for (let size = 5; size <= 100; size++) {
      expect(difficultyCounts(size, DEFAULT_EXAM_MIX).reduce((a, b) => a + b, 0)).toBe(size);
    }
  });

  it.each([0, 100])("supports a %i percent department target", departmentPercentage => {
    const selected = selectExamQuestions(bank(), 20, "Ward", { ...mix, departmentPercentage });
    expect(countDept(selected)).toBe(departmentPercentage / 5);
  });

  it("finds a feasible joint mix when departments are concentrated in one difficulty", () => {
    const pool = bank().filter(q => q.departmentTags.includes("Ward") ? q.difficulty === "basic" : q.difficulty !== "basic");
    const selected = selectExamQuestions(pool, 20, "Ward", { ...mix, departmentPercentage: 40 });
    expect(countDept(selected)).toBe(8);
    expect(selected.filter(q => q.difficulty === "advanced")).toHaveLength(4);
  });

  it("prioritizes difficulty when the department quota conflicts with it", () => {
    const pool = bank().filter(q => !q.departmentTags.includes("Ward") || q.difficulty === "basic");
    const selected = selectExamQuestions(pool, 20, "Ward", { ...mix, departmentPercentage: 100 });
    expect(countDept(selected)).toBe(8);
    expect(selected.filter(q => q.difficulty === "advanced")).toHaveLength(4);
    expect(selected).toHaveLength(20);
  });

  it("backfills exhausted difficulties and departments without duplicates", () => {
    const pool = bank().filter(q => q.difficulty === "basic" && q.departmentTags.length === 0).slice(0, 9);
    const selected = selectExamQuestions([...pool, pool[0]], 20, "Ward", mix);
    expect(selected).toHaveLength(9);
    expect(new Set(selected.map(q => q.id)).size).toBe(9);
    expect(countDept(selected)).toBe(0);
  });

  it("does not interpret a missing department or global tags as department-specific", () => {
    expect(isDepartmentQuestion(["Ward"], "")).toBe(false);
    expect(isDepartmentQuestion(["", "All", "Hospital-wide"], "Ward")).toBe(false);
    expect(isDepartmentQuestion(["icu/hdu"], " ICU/HDU ")).toBe(true);
    expect(selectExamQuestions([], 20, "Ward", mix)).toEqual([]);
  });

  it("allows a single difficulty and does not mutate the source bank", () => {
    const pool = bank();
    const original = structuredClone(pool);
    const selected = selectExamQuestions(pool, 20, "Ward", { ...mix, basicPercentage: 0, mediumPercentage: 0, advancedPercentage: 100 });
    expect(selected.every(q => q.difficulty === "advanced")).toBe(true);
    expect(pool).toEqual(original);
  });
});
