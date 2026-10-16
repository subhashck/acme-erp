import type { QuestionDef } from "./seed_500_questions.ts";

/** Retired department code, canonical core code, and audience to preserve. */
export const QUESTION_MERGES: ReadonlyArray<readonly [string, string, string]> = [
  ["MCQ-OPD-002", "MCQ-PSQ-001", "OPD"],
  ["MCQ-OPD-008", "MCQ-MOM-005", "OPD"],
  ["MCQ-OPD-012", "MCQ-HIC-005", "OPD"],
  ["MCQ-OPD-016", "MCQ-HIC-006", "OPD"],
  ["MCQ-WARD-002", "MCQ-DOC-002", "Ward"],
  ["MCQ-WARD-003", "MCQ-PSQ-002", "Ward"],
  ["MCQ-WARD-005", "MCQ-PSQ-005", "Ward"],
  ["MCQ-WARD-006", "MCQ-PROC-009", "Ward"],
  ["MCQ-WARD-007", "MCQ-PROC-008", "Ward"],
  ["MCQ-WARD-008", "MCQ-PROC-004", "Ward"],
  ["MCQ-WARD-010", "MCQ-HIC-013", "Ward"],
  ["MCQ-WARD-012", "MCQ-PROC-003", "Ward"],
  ["MCQ-WARD-013", "MCQ-PROC-010", "Ward"],
  ["MCQ-WARD-017", "MCQ-DOC-001", "Ward"],
  ["MCQ-ICU-008", "MCQ-PROC-006", "ICU/HDU"],
  ["MCQ-ICU-009", "MCQ-PROC-007", "ICU/HDU"],
  ["MCQ-ICU-018", "MCQ-MOM-002", "ICU/HDU"],
  ["MCQ-ICU-019", "MCQ-PROC-005", "ICU/HDU"],
];

export function normalizeQuestionText(text: string): string {
  return text.replace(/^\[[^\]]*#\d+\]\s*/, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function validateQuestionBank(questions: QuestionDef[]): void {
  const codes = new Set<string>();
  const stems = new Map<string, string>();
  for (const q of questions) {
    if (codes.has(q.code)) throw new Error(`Duplicate question code: ${q.code}`);
    codes.add(q.code);
    const stem = normalizeQuestionText(q.question);
    if (!stem) throw new Error(`Empty question: ${q.code}`);
    const duplicate = stems.get(stem);
    if (duplicate) throw new Error(`Duplicate question: ${duplicate} / ${q.code}`);
    stems.set(stem, q.code);
    if (/^\[[^\]]*#\d+\]/.test(q.question)) {
      throw new Error(`Artificial question variant: ${q.code}`);
    }
    if (q.options.length !== 4 || q.options.some(o => !o.trim()) ||
      new Set(q.options.map(normalizeQuestionText)).size !== 4) {
      throw new Error(`Expected four distinct, nonempty options: ${q.code}`);
    }
    if (!Number.isInteger(q.correctOptionIndex) || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
      throw new Error(`Invalid answer index: ${q.code}`);
    }
    if (!q.explanation.trim()) throw new Error(`Missing explanation: ${q.code}`);
  }
}

/** Stable per-code shuffle removes the original bank's heavy answer-B bias. */
export function shuffleQuestionOptions(q: QuestionDef): QuestionDef {
  let state = 2166136261;
  for (const character of q.code) state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  const order = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const j = (state >>> 0) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...q,
    options: order.map(i => q.options[i]) as QuestionDef["options"],
    correctOptionIndex: order.indexOf(q.correctOptionIndex) as QuestionDef["correctOptionIndex"],
  };
}

export function curateQuestionBank(questions: QuestionDef[]): QuestionDef[] {
  if (new Set(questions.map(q => q.code)).size !== questions.length) {
    throw new Error("Duplicate question codes in curation input");
  }
  const byCode = new Map(questions.map(q => [q.code, { ...q, departmentTags: [...q.departmentTags] }]));
  for (const [duplicate, retained, department] of QUESTION_MERGES) {
    const source = byCode.get(duplicate);
    const target = byCode.get(retained);
    if (!target) throw new Error(`Missing reviewed merge target: ${duplicate} / ${retained}`);
    const sourceTags = source?.departmentTags ?? [department];
    // An empty tag list already means suitable for every department.
    target.departmentTags = !target.departmentTags.length || !sourceTags.length
      ? [] : [...new Set([...target.departmentTags, ...sourceTags])];
    byCode.delete(duplicate);
  }
  const result = [...byCode.values()].map(shuffleQuestionOptions);
  validateQuestionBank(result);
  return result;
}

/** Explicit ownership avoids disabling manually authored questions on reseeding. */
export function getRetiredQuestionCodes(questions: QuestionDef[]): string[] {
  const active = new Set(questions.map(q => q.code));
  const previousRanges: Array<[string, number]> = [
    ["HIC", 90], ["PSQ", 90], ["MOM", 90], ["BLS", 90], ["PROC", 100], ["DOC", 60], ["HR", 50],
    ["NICU", 100], ["OPD", 100], ["WARD", 100], ["CSSD", 100], ["OT", 100], ["ICU", 100], ["ART", 100],
  ];
  return previousRanges.flatMap(([prefix, count]) =>
    Array.from({ length: count }, (_, i) => `MCQ-${prefix}-${String(i + 1).padStart(3, "0")}`)
  ).filter(code => !active.has(code));
}
