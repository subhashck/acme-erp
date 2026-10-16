export const DEFAULT_EXAM_MIX = {
  basicPercentage: 50,
  mediumPercentage: 35,
  advancedPercentage: 15,
  departmentPercentage: 50,
};

export type ExamMix = typeof DEFAULT_EXAM_MIX;
const levels = ["basic", "medium", "advanced"] as const;

/** Largest-remainder rounding keeps integer question counts equal to the exam size. */
export function difficultyCounts(total: number, mix: ExamMix): number[] {
  const exact = [mix.basicPercentage, mix.mediumPercentage, mix.advancedPercentage].map(p => total * p / 100);
  const counts = exact.map(Math.floor);
  const order = exact.map((n, i) => ({ i, fraction: n - counts[i] }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  const remaining = total - counts.reduce((a, b) => a + b, 0);
  for (let i = 0; i < remaining; i++) counts[order[i].i]++;
  return counts;
}

type SelectableQuestion = { id: number; difficulty: string; departmentTags: unknown };

function normalized(value: string) { return value.trim().toLowerCase(); }
export function isDepartmentQuestion(tags: unknown, department: string): boolean {
  const name = normalized(department);
  if (!name || !Array.isArray(tags)) return false;
  return tags.some(t => typeof t === "string" && normalized(t) &&
    !["all", "hospital-wide"].includes(normalized(t)) &&
    (name.includes(normalized(t)) || normalized(t).includes(name)));
}

/** Difficulty targets take precedence if the two requested mixes cannot both be met.
 * Exhausted buckets are backfilled; no question is repeated and sparse banks stay usable.
 */
export function selectExamQuestions<T extends SelectableQuestion>(
  questions: T[], total: number, department: string, mix: ExamMix,
  random: () => number = Math.random,
): T[] {
  const shuffle = <U>(values: U[]) => {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const unique = [...new Map(questions.map(q => [q.id, q])).values()];
  const size = Math.min(total, unique.length);
  const buckets = levels.map(level => {
    const pool = shuffle(unique.filter(q => q.difficulty === level));
    const specific = pool.filter(q => isDepartmentQuestion(q.departmentTags, department));
    const other = pool.filter(q => !isDepartmentQuestion(q.departmentTags, department));
    // Prefer hospital-wide questions over other specialties for the remaining share.
    const isGeneral = (q: T) => !Array.isArray(q.departmentTags) || !q.departmentTags.length ||
      q.departmentTags.some(t => typeof t === "string" && ["all", "hospital-wide"].includes(normalized(t)));
    return { specific, other: [...other.filter(isGeneral), ...other.filter(q => !isGeneral(q))] };
  });
  const counts = difficultyCounts(size, mix).map((count, i) => Math.min(count, buckets[i].specific.length + buckets[i].other.length));
  // Fill shortages from remaining known difficulties, prioritizing the largest deficit
  // against the requested percentage. Unknown legacy difficulty labels are last resort.
  const desired = difficultyCounts(size, mix);
  while (counts.reduce((a, b) => a + b, 0) < size) {
    const available = levels.map((_, i) => i).filter(i => counts[i] < buckets[i].specific.length + buckets[i].other.length);
    if (!available.length) break;
    available.sort((a, b) => (desired[b] - counts[b]) - (desired[a] - counts[a]) || a - b);
    counts[available[0]]++;
  }
  const minDept = counts.map((count, i) => Math.max(0, count - buckets[i].other.length));
  const maxDept = counts.map((count, i) => Math.min(count, buckets[i].specific.length));
  const deptCounts = [...minDept];
  const requestedDept = Math.round(size * mix.departmentPercentage / 100);
  const targetDept = Math.max(minDept.reduce((a, b) => a + b, 0), Math.min(requestedDept, maxDept.reduce((a, b) => a + b, 0)));
  while (deptCounts.reduce((a, b) => a + b, 0) < targetDept) {
    const available = levels.map((_, i) => i).filter(i => deptCounts[i] < maxDept[i]);
    available.sort((a, b) => (counts[b] * mix.departmentPercentage / 100 - deptCounts[b]) -
      (counts[a] * mix.departmentPercentage / 100 - deptCounts[a]) || a - b);
    deptCounts[available[0]]++;
  }
  const selected = buckets.flatMap((bucket, i) => [
    ...bucket.specific.slice(0, deptCounts[i]), ...bucket.other.slice(0, counts[i] - deptCounts[i]),
  ]);
  const ids = new Set(selected.map(q => q.id));
  selected.push(...shuffle(unique.filter(q => !ids.has(q.id))).slice(0, size - selected.length));
  return shuffle(selected);
}
