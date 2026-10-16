export function validateOnlineCbtSearch(search: Record<string, unknown>): { assessmentId?: number } {
  if (search.assessmentId === undefined) return {};
  const value = search.assessmentId;
  if ((typeof value !== "string" && typeof value !== "number") || !/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) {
    throw new Error("Invalid assessment ID for online CBT.");
  }
  return { assessmentId: Number(value) };
}
