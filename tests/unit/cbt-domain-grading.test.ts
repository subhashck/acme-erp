import { describe, expect, it } from "vitest";
import { gradeExam, validateAssessmentRatings, assessmentCbtPeriod, averageAssessmentCbtResults, type ExamQuestionSnapshot } from "../../server/services/skill-assessment-engine";

const questions: ExamQuestionSnapshot[] = ["HIC", "HIC", "MOM", "MOM", "MOM"].map((domainCode, i) => ({
  id: i + 1, code: `Q-${i}`, domainCode, question: "Question", options: ["Correct", "Incorrect"],
  correctOptionIndex: 0, explanation: null, difficulty: "basic", defaultTimeSeconds: 60,
}));

describe("CBT domain grading", () => {
  it("uses inclusive assessment dates in India time, across multiple months", () => {
    const period = assessmentCbtPeriod("2026-01-01", "2026-03-31")!;
    expect(period.start.toISOString()).toBe("2025-12-31T18:30:00.000Z");
    expect(period.next.toISOString()).toBe("2026-03-31T18:30:00.000Z");
    expect(assessmentCbtPeriod(null, null)).toBeNull();
    expect(assessmentCbtPeriod("2026-04-01", "2026-03-31")).toBeNull();
  });

  it("averages exams equally and excludes missing domains instead of treating them as zero", () => {
    const result = averageAssessmentCbtResults([
      { theoreticalRating: "4.00", questionSnapshot: questions, answers: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 } },
      { theoreticalRating: "0.00", questionSnapshot: [questions[0]], answers: { 1: 1 } },
      { theoreticalRating: null, questionSnapshot: questions, answers: {} },
    ]);
    expect(result).toEqual({ theoreticalRating: 2, domainRatings: { HIC: 1.25, MOM: 5 }, attemptCount: 2 });
    expect(averageAssessmentCbtResults([])).toBeUndefined();
  });

  it("keeps domain ratings separate from the question-weighted overall rating", () => {
    const result = gradeExam(questions, { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 }, 80);
    expect(result.theoreticalRating).toBe(4);
    expect(result.domainResults).toEqual([
      { domainCode: "HIC", totalQuestions: 2, correctCount: 1, unansweredCount: 0, score: 50, theoreticalRating: 2.5 },
      { domainCode: "MOM", totalQuestions: 3, correctCount: 3, unansweredCount: 0, score: 100, theoreticalRating: 5 },
    ]);
  });

  it("counts unanswered questions and preserves zero without inventing absent domains", () => {
    const result = gradeExam(questions, { 1: 1 }, 80);
    expect(result.domainResults[0]).toMatchObject({ theoreticalRating: 0, unansweredCount: 1 });
    expect(result.domainResults[1]).toMatchObject({ theoreticalRating: 0, unansweredCount: 3 });
    expect(gradeExam([], {}, 80).domainResults).toEqual([]);
  });

  it("allows explicitly unassessed theory while still requiring practical ratings", () => {
    const items = [{ criterionId: 1, theory: null, practical: 4 }];
    expect(validateAssessmentRatings([1], items, false, true)).not.toBeNull();
    expect(validateAssessmentRatings([1], items, false, true, new Set([1]))).toBeNull();
    expect(validateAssessmentRatings([1], [{ ...items[0], practical: null }], false, true, new Set([1]))).not.toBeNull();
  });
});
