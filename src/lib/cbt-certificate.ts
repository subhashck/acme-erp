export function canPrintCbtCertificate(status: string) {
  return status === "completed" || status === "timed_out";
}

export interface CbtCertificate {
  reference: string;
  hospital: { name: string; address: string | null };
  employee: { name: string; code: string; department: string | null };
  exam: {
    attemptNo: string; completedAt: string; status: string; score: number;
    passPercentage: number; passed: boolean; totalQuestions: number;
    correctCount: number; theoreticalRating: number;
  };
}
