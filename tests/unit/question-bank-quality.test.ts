import { describe, expect, it } from "vitest";
import { generateQuestions, type QuestionDef } from "../../scripts/seed_500_questions.ts";
import { generateDepartmentQuestions } from "../../scripts/department_questions_data.ts";
import { departmentScenarios, scenarioGuidelines } from "../../scripts/department_scenarios_data.ts";
import {
  curateQuestionBank, getRetiredQuestionCodes, normalizeQuestionText,
  QUESTION_MERGES, shuffleQuestionOptions, validateQuestionBank,
} from "../../scripts/question-bank-quality.ts";

const questions = generateQuestions();
const question = (code: string) => {
  const result = questions.find(q => q.code === code);
  if (!result) throw new Error(`Missing question ${code}`);
  return result;
};
const answer = (code: string) => {
  const q = question(code);
  return q.options[q.correctOptionIndex];
};

describe("reviewed question bank", () => {
  it("emits written items once, with distinct stems, codes, options, and valid keys", () => {
    expect(questions).toHaveLength(301);
    expect(generateDepartmentQuestions()).toHaveLength(194);
    expect(() => validateQuestionBank(questions)).not.toThrow();
    expect(new Set(questions.map(q => normalizeQuestionText(q.question))).size).toBe(301);
    expect(questions.every(q => !/^\[.*#\d+\]/.test(q.question))).toBe(true);
  });

  it("keeps stable codes and original difficulty instead of cycling difficulty labels", () => {
    expect(question("MCQ-HIC-002").difficulty).toBe("basic");
    expect(question("MCQ-MOM-002").difficulty).toBe("advanced");
    expect(question("MCQ-NICU-005").difficulty).toBe("advanced");
    expect(questions.some(q => q.code === "MCQ-HIC-016")).toBe(false);
  });

  it("merges department coverage, with an empty tag list retaining global applicability", () => {
    expect(question("MCQ-PROC-010").departmentTags).toEqual(expect.arrayContaining(["Ward", "ICU/HDU", "Emergency"]));
    expect(question("MCQ-PSQ-001").departmentTags).toEqual([]);
    for (const [retired, kept, department] of QUESTION_MERGES) {
      expect(questions.some(q => q.code === retired)).toBe(false);
      expect(questions.some(q => q.code === kept)).toBe(true);
      expect(generateDepartmentQuestions().some(q => q.code === retired)).toBe(false);
      const tags = question(kept).departmentTags;
      expect(tags.length === 0 || tags.includes(department)).toBe(true);
    }
    const fixture = (code: string, tags: string[]): QuestionDef => ({
      ...question("MCQ-PSQ-001"), code, departmentTags: tags,
    });
    const source = [fixture("MCQ-OPD-002", ["OPD"]), fixture("MCQ-PSQ-001", ["Ward"])];
    // Exercise the actual merge map using the full fixture bank.
    const merged = curateQuestionBank([
      ...questions.filter(q => q.code !== "MCQ-PSQ-001"),
      ...QUESTION_MERGES.filter(([code]) => code !== "MCQ-OPD-002")
        .map(([code, kept]) => ({ ...question(kept), code })),
      ...source,
    ]);
    expect(merged.find(q => q.code === "MCQ-PSQ-001")?.departmentTags).toEqual(["Ward", "OPD"]);
    expect(source[1].departmentTags).toEqual(["Ward"]);
  });

  it("corrects the ICU suction, OT zoning, and liquid-nitrogen answer keys", () => {
    expect(answer("MCQ-PROC-007")).toBe("No more than 15 seconds");
    expect(answer("MCQ-OT-020")).toContain("controlled operating-room area");
    expect(answer("MCQ-ART-016")).toBe("Approximately -196 degrees C");
  });

  it("validates and shuffles the standalone department bank without renumbering or double shuffling", () => {
    const departments = generateDepartmentQuestions();
    expect(() => validateQuestionBank(departments)).not.toThrow();
    const raw = generateDepartmentQuestions({ shuffleOptions: false });
    expect(departments).toEqual(raw.map(shuffleQuestionOptions));
    expect(generateDepartmentQuestions()).toEqual(departments);
    for (const q of departments) {
      expect(q).toEqual(question(q.code));
    }
    const counts = Object.fromEntries(["NICU", "OPD", "WARD", "CSSD", "OT", "ICU", "ART"]
      .map(prefix => [prefix, departments.filter(q => q.code.startsWith(`MCQ-${prefix}-`)).length]));
    expect(counts).toEqual({ NICU: 20, OPD: 16, WARD: 10, CSSD: 20, OT: 20, ICU: 16, ART: 20 });
    expect(question("MCQ-WARD-004").question).toContain("Braden");
    expect(question("MCQ-WARD-020").question).toContain("potassium");
    expect(question("MCQ-ICU-010").question).toContain("cuff pressure");
  });

  it("rejects duplicate input codes instead of silently replacing an item during curation", () => {
    expect(() => curateQuestionBank([...questions, questions[0]])).toThrow("Duplicate question codes");
  });

  it("maintains answer identity across deterministic shuffling", () => {
    for (const q of questions) {
      const shuffled = shuffleQuestionOptions(q);
      expect(shuffled.options[shuffled.correctOptionIndex]).toBe(q.options[q.correctOptionIndex]);
      expect(shuffled).toEqual(shuffleQuestionOptions(q));
      expect([...shuffled.options].sort()).toEqual([...q.options].sort());
    }
    const counts = [0, 0, 0, 0];
    for (const q of questions) counts[q.correctOptionIndex]++;
    expect(counts.every(count => count >= questions.length * 0.15 && count <= questions.length * 0.35)).toBe(true);
    expect(generateQuestions()).toEqual(questions);
  });

  it("retires only historical seed codes and never removes retained questions", () => {
    const retired = getRetiredQuestionCodes(questions);
    expect(retired).toHaveLength(1041);
    expect(new Set(retired).size).toBe(retired.length);
    expect(retired).toContain("MCQ-HIC-090");
    expect(retired).toContain("MCQ-OPD-002");
    expect(retired).not.toContain("MCQ-HIC-001");
    expect(retired).not.toContain("CUSTOM-HIC-001");
    expect(retired).not.toContain("MCQ-ART-101");
    expect(retired.every(code => !questions.some(q => q.code === code))).toBe(true);
  });

  it("keeps scenario answer keys, audience and practical safety guidance aligned with the exam bank", () => {
    expect(new Set(departmentScenarios.map(s => s.code)).size).toBe(24);
    expect(new Set(departmentScenarios.map(s => s.department)).size).toBe(12);
    for (const scenario of departmentScenarios) {
      const guidelines = scenarioGuidelines(scenario);
      expect(scenario.actions.length).toBeGreaterThanOrEqual(4);
      expect(scenario.criticalFailures.length).toBeGreaterThanOrEqual(2);
      expect(guidelines.practical).toContain(scenario.source);
      for (const failure of scenario.criticalFailures) expect(guidelines.practical).toContain(failure);
      scenario.questions.forEach((q, i) => {
        const seeded = question(`MCQ-${scenario.code}-${String(i + 1).padStart(2, "0")}`);
        expect(seeded.options[seeded.correctOptionIndex]).toBe(q.choices[0]);
        expect(seeded.departmentTags).toEqual([scenario.department]);
        expect(seeded.explanation).toBe(q.rationale);
        expect(guidelines.theoretical).toContain(q.choices[0]);
      });
    }
  });

  it("includes the ACME service mix with three linked questions per practical case", () => {
    const acme = departmentScenarios.filter(s => s.code.startsWith("DS-ACME-"));
    expect(acme).toHaveLength(12);
    expect(acme.filter(s => s.department === "Maternity")).toHaveLength(4);
    expect(acme.filter(s => s.department === "OPD")).toHaveLength(2);
    expect(acme.filter(s => s.department === "ART")).toHaveLength(6);
    expect(acme.every(s => s.questions.length === 3)).toBe(true);
    expect(questions.filter(q => q.code.startsWith("MCQ-DS-ACME-"))).toHaveLength(36);
    expect(answer("MCQ-DS-ACME-ART-03-01")).toContain("does not alone determine ability to conceive");
    expect(answer("MCQ-DS-ACME-ART-05-01")).toContain("Pause disposition");
    expect(answer("MCQ-DS-ACME-OBS-02-01")).toContain("Stop oxytocin");
  });

  it("rejects repeated normalized stems, duplicate choices, and invalid keys", () => {
    const q = question("MCQ-HIC-001");
    expect(() => validateQuestionBank([q, { ...q, code: "CUSTOM-001", question: q.question.toUpperCase() }]))
      .toThrow("Duplicate question");
    expect(() => validateQuestionBank([{ ...q, options: ["Choice", " choice ", "Third", "Fourth"] }]))
      .toThrow("four distinct");
    expect(() => validateQuestionBank([{ ...q, correctOptionIndex: 4 as QuestionDef["correctOptionIndex"] }]))
      .toThrow("Invalid answer index");
    expect(() => validateQuestionBank([{ ...q, question: `[Clinical Scenario #32] ${q.question}` }]))
      .toThrow("Artificial question variant");
  });
});
