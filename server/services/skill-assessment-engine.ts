export interface ExamQuestionSnapshot {
  id: number;
  code: string;
  domainCode: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string | null;
  difficulty: string;
  defaultTimeSeconds: number;
}

/** India calendar-month boundaries, expressed as UTC instants for database queries. */
export function cbtCalendarMonthWindow(now = new Date()) {
  const indiaOffset = 330 * 60 * 1000;
  const local = new Date(now.getTime() + indiaOffset);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  return {
    start: new Date(Date.UTC(year, month, 1) - indiaOffset),
    next: new Date(Date.UTC(year, month + 1, 1) - indiaOffset),
  };
}

export function snapshotExamQuestions(questions: Array<Omit<ExamQuestionSnapshot, "options"> & { options: unknown }>): ExamQuestionSnapshot[] {
  return questions.map((q) => ({
    id: q.id, code: q.code, domainCode: q.domainCode, question: q.question,
    options: [...(q.options as string[])], correctOptionIndex: q.correctOptionIndex,
    explanation: q.explanation, difficulty: q.difficulty, defaultTimeSeconds: q.defaultTimeSeconds,
  }));
}

export function publicExamQuestions(questions: ExamQuestionSnapshot[]) {
  return questions.map(({ correctOptionIndex: _key, explanation: _explanation, ...question }, index) => ({
    ...question, index: index + 1,
  }));
}

export function examRemainingSeconds(startedAt: Date | string, duration: number, now = Date.now()) {
  return Math.max(0, Math.ceil((new Date(startedAt).getTime() + duration * 1000 - now) / 1000));
}

export function examSelectedAnswers(questions: ExamQuestionSnapshot[], answers: Record<string, unknown>) {
  const selected: Record<string, number> = {};
  for (const q of questions) {
    const entry = answers[String(q.id)];
    const value = typeof entry === "object" && entry !== null && "selectedOptionIndex" in entry
      ? entry.selectedOptionIndex : entry;
    if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < q.options.length) {
      selected[String(q.id)] = value;
    }
  }
  return selected;
}

export function gradeExam(questions: ExamQuestionSnapshot[], answers: Record<string, unknown>, passPercentage: number) {
  const selected = examSelectedAnswers(questions, answers);
  const review = questions.map((q) => {
    const selectedOptionIndex = selected[String(q.id)] ?? -1;
    return { ...q, selectedOptionIndex, isCorrect: selectedOptionIndex === q.correctOptionIndex };
  });
  const correctCount = review.filter((q) => q.isCorrect).length;
  const unansweredCount = review.filter((q) => q.selectedOptionIndex === -1).length;
  const score = questions.length ? Math.round(correctCount / questions.length * 10000) / 100 : 0;
  const domainResults = [...new Set(questions.map(q => q.domainCode))].map(domainCode => {
    const items = review.filter(q => q.domainCode === domainCode);
    const correctCount = items.filter(q => q.isCorrect).length;
    return { domainCode, totalQuestions: items.length, correctCount,
      unansweredCount: items.filter(q => q.selectedOptionIndex === -1).length,
      score: Math.round(correctCount / items.length * 10000) / 100,
      theoreticalRating: Math.round(correctCount / items.length * 50) / 10 };
  });
  return {
    score, theoreticalRating: questions.length ? Math.round(correctCount / questions.length * 50) / 10 : 0,
    correctCount, unansweredCount, incorrectCount: questions.length - correctCount - unansweredCount,
    totalQuestions: questions.length, passed: score >= passPercentage, review, domainResults,
  };
}

/** Inclusive India calendar dates; the upper query boundary is exclusive. */
export function assessmentCbtPeriod(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate.slice(0, 10)}T00:00:00+05:30`);
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00+05:30`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) return null;
  return { start, next: new Date(end.getTime() + 86400000) };
}

export function averageAssessmentCbtResults(attempts: Array<{
  theoreticalRating: string | number | null;
  questionSnapshot: ExamQuestionSnapshot[] | null;
  answers: unknown;
}>) {
  const valid = attempts.filter(a => a.theoreticalRating !== null && Number.isFinite(Number(a.theoreticalRating)));
  if (!valid.length) return undefined;
  const domainValues: Record<string, number[]> = {};
  for (const attempt of valid) {
    const result = gradeExam(attempt.questionSnapshot || [], (attempt.answers || {}) as Record<string, unknown>, 0);
    for (const domain of result.domainResults) {
      (domainValues[domain.domainCode] ||= []).push(domain.theoreticalRating);
    }
  }
  const mean = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 100) / 100;
  return {
    theoreticalRating: mean(valid.map(a => Number(a.theoreticalRating))),
    domainRatings: Object.fromEntries(Object.entries(domainValues).map(([code, values]) => [code, mean(values)])),
    attemptCount: valid.length,
  };
}

// Null represents an unselected rating; zero is a valid CBT theory result.
export function validateAssessmentRatings(
  expectedIds: number[],
  items: Array<{ criterionId: number; theory: number | null; practical: number | null }>,
  draft: boolean,
  allowZeroTheory = false,
  unassessedTheoryIds: ReadonlySet<number> = new Set(),
) {
  const ids = new Set(items.map((item) => item.criterionId));
  if (ids.size !== items.length || ids.size !== expectedIds.length || expectedIds.some((id) => !ids.has(id))) {
    return "Include each assessment criterion exactly once.";
  }
  for (const item of items) {
    const ratings = item.theory === null && unassessedTheoryIds.has(item.criterionId)
      ? [[item.practical, 1]] as const
      : [[item.theory, allowZeroTheory ? 0 : 1], [item.practical, 1]] as const;
    for (const [value, minimum] of ratings) {
      if (value === null && draft) continue;
      if (value === null || !Number.isFinite(value) || value < minimum || value > 5) {
        return "Select a rating for every criterion before submitting.";
      }
    }
  }
  return null;
}
