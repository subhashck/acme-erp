import { describe, it, expect } from "vitest";

// Pure helper functions matching the Skill Assessment engine logic
export function calculateCompositeAssessmentScore(
  selfScore: number,
  inchargeScore: number,
  nursingSuperScore: number
): number {
  if (inchargeScore > 0 && nursingSuperScore > 0 && selfScore > 0) {
    return Number((selfScore * 0.2 + inchargeScore * 0.4 + nursingSuperScore * 0.4).toFixed(2));
  } else if (inchargeScore > 0 && nursingSuperScore > 0) {
    return Number((inchargeScore * 0.5 + nursingSuperScore * 0.5).toFixed(2));
  }
  return Number((nursingSuperScore || inchargeScore || selfScore).toFixed(2));
}

export function determineNabhCompetencyLevel(
  score: number
): "Exemplary" | "Competent" | "Developing" | "Needs Immediate Training" {
  if (score >= 4.5) return "Exemplary";
  if (score >= 3.5) return "Competent";
  if (score >= 2.5) return "Developing";
  return "Needs Immediate Training";
}

export function evaluateCriteriaAverage(
  theoryScore: number,
  practicalScore: number
): { average: number; isSatisfactory: boolean } {
  const avg = Number(((theoryScore + practicalScore) / 2).toFixed(2));
  // NABH guideline standard threshold: at least 3.0 / 5.0 for competency
  const isSatisfactory = theoryScore >= 3.0 && practicalScore >= 3.0;
  return { average: avg, isSatisfactory };
}

export function getNextWorkflowStage(
  currentStage: string,
  action: "submit" | "request_revision" | "assign_training" | "approve"
): string {
  switch (currentStage) {
    case "draft":
      return action === "submit" ? "submitted_to_incharge" : "draft";
    case "submitted_to_incharge":
      if (action === "request_revision") return "revision_requested";
      return "submitted_to_nursing_super";
    case "submitted_to_nursing_super":
      if (action === "request_revision") return "revision_requested";
      return "submitted_to_hr";
    case "submitted_to_hr":
      if (action === "assign_training") return "training_required";
      if (action === "request_revision") return "revision_requested";
      return "completed";
    default:
      return currentStage;
  }
}

describe("NABH Clinical Skill Assessment Engine", () => {
  describe("Composite Weighted Score Calculation", () => {
    it("calculates 20% Self + 40% Incharge + 40% Super correctly", () => {
      // Self: 4.5, Incharge: 4.0, Super: 4.0
      // 4.5*0.2 (0.9) + 4.0*0.4 (1.6) + 4.0*0.4 (1.6) = 4.10
      const score = calculateCompositeAssessmentScore(4.5, 4.0, 4.0);
      expect(score).toBe(4.1);
    });

    it("handles full exemplary scores", () => {
      const score = calculateCompositeAssessmentScore(5.0, 5.0, 5.0);
      expect(score).toBe(5.0);
    });

    it("handles fallback to 50/50 when self score is missing", () => {
      const score = calculateCompositeAssessmentScore(0, 4.0, 3.5);
      expect(score).toBe(3.75);
    });
  });

  describe("NABH Competency Level Assignment", () => {
    it("assigns 'Exemplary' for scores >= 4.5", () => {
      expect(determineNabhCompetencyLevel(4.8)).toBe("Exemplary");
      expect(determineNabhCompetencyLevel(4.5)).toBe("Exemplary");
    });

    it("assigns 'Competent' for scores between 3.5 and 4.49", () => {
      expect(determineNabhCompetencyLevel(4.2)).toBe("Competent");
      expect(determineNabhCompetencyLevel(3.5)).toBe("Competent");
    });

    it("assigns 'Developing' for scores between 2.5 and 3.49", () => {
      expect(determineNabhCompetencyLevel(3.0)).toBe("Developing");
      expect(determineNabhCompetencyLevel(2.5)).toBe("Developing");
    });

    it("assigns 'Needs Immediate Training' for scores below 2.5", () => {
      expect(determineNabhCompetencyLevel(2.2)).toBe("Needs Immediate Training");
      expect(determineNabhCompetencyLevel(1.5)).toBe("Needs Immediate Training");
    });
  });

  describe("Criteria Average and Satisfactory Thresholds", () => {
    it("marks satisfactory when both theory and practical >= 3.0", () => {
      const result = evaluateCriteriaAverage(4.0, 4.0);
      expect(result.average).toBe(4.0);
      expect(result.isSatisfactory).toBe(true);
    });

    it("marks unsatisfactory if practical is below 3.0 despite high theory", () => {
      const result = evaluateCriteriaAverage(4.5, 2.0);
      expect(result.average).toBe(3.25);
      expect(result.isSatisfactory).toBe(false);
    });

    it("marks unsatisfactory if theory is below 3.0 despite high practical", () => {
      const result = evaluateCriteriaAverage(2.0, 4.5);
      expect(result.average).toBe(3.25);
      expect(result.isSatisfactory).toBe(false);
    });
  });

  describe("Workflow Pipeline Transitions", () => {
    it("transitions Clinical Staff self-submission to Dept Incharge", () => {
      expect(getNextWorkflowStage("draft", "submit")).toBe("submitted_to_incharge");
    });

    it("transitions Dept Incharge verification to Nursing Supervisor", () => {
      expect(getNextWorkflowStage("submitted_to_incharge", "submit")).toBe(
        "submitted_to_nursing_super"
      );
    });

    it("supports Incharge requesting revision from staff", () => {
      expect(getNextWorkflowStage("submitted_to_incharge", "request_revision")).toBe(
        "revision_requested"
      );
    });

    it("transitions Nursing Supervisor review to HR Sign-Off", () => {
      expect(getNextWorkflowStage("submitted_to_nursing_super", "submit")).toBe(
        "submitted_to_hr"
      );
    });

    it("supports HR approving or assigning training", () => {
      expect(getNextWorkflowStage("submitted_to_hr", "approve")).toBe("completed");
      expect(getNextWorkflowStage("submitted_to_hr", "assign_training")).toBe(
        "training_required"
      );
    });
  });

  describe("Analytics & KPI Computations", () => {
    it("computes compliance rate as ratio of competent/exemplary to total completed", () => {
      const assessments = [
        { status: "completed", competencyLevel: "Exemplary", finalScore: "4.8" },
        { status: "completed", competencyLevel: "Competent", finalScore: "4.0" },
        { status: "completed", competencyLevel: "Developing", finalScore: "3.2" },
        { status: "completed", competencyLevel: "Needs Immediate Training", finalScore: "2.1" },
        { status: "submitted_to_incharge", competencyLevel: null, finalScore: "0" },
      ];

      const completed = assessments.filter((a) => a.status === "completed").length;
      const compliant = assessments.filter(
        (a) =>
          a.status === "completed" &&
          (a.competencyLevel === "Exemplary" || a.competencyLevel === "Competent")
      ).length;

      const rate = completed > 0 ? `${Math.round((compliant / completed) * 100)}%` : "0%";
      expect(completed).toBe(4);
      expect(compliant).toBe(2);
      expect(rate).toBe("50%");
    });
  });

  describe("Assessment Period & Uniqueness Invariants", () => {
    it("validates that assessment end date is on or after start date", () => {
      const isValidRange = (start: string, end: string) => new Date(end) >= new Date(start);
      expect(isValidRange("2026-01-01", "2026-12-31")).toBe(true);
      expect(isValidRange("2026-06-01", "2026-06-01")).toBe(true);
      expect(isValidRange("2026-12-31", "2026-01-01")).toBe(false);
    });

    it("prevents duplicate assessments for the same staff member in the same cycle", () => {
      const existingAssessments = [
        { staffId: 57, cycleId: 1, assessmentNo: "SKL-2026-0001" },
        { staffId: 71, cycleId: 1, assessmentNo: "SKL-2026-0002" },
      ];

      const canInitiate = (staffId: number, cycleId: number) => {
        return !existingAssessments.some(
          (a) => a.staffId === staffId && a.cycleId === cycleId
        );
      };

      expect(canInitiate(57, 1)).toBe(false); // Duplicate in cycle 1
      expect(canInitiate(57, 2)).toBe(true);  // Allowed in new cycle 2
      expect(canInitiate(88, 1)).toBe(true);  // New staff in cycle 1
    });
  });

  describe("Draft Assessment Deletion Rules (Admin or Candidate Before Incharge)", () => {
    function evaluateDeletePermission(
      role: string,
      status: string,
      userStaffId?: number,
      assessmentStaffId?: number
    ): { allowed: boolean; reason?: string } {
      const isAdmin = role.toLowerCase() === "admin";
      const isCandidateSelf = Boolean(userStaffId && assessmentStaffId && userStaffId === assessmentStaffId);

      if (!isAdmin && !isCandidateSelf) {
        return {
          allowed: false,
          reason: "Unauthorized. Only administrators or the candidate staff member can delete a draft self-assessment.",
        };
      }
      if (status !== "draft") {
        return {
          allowed: false,
          reason: `Only draft self-assessments can be deleted before submission to the Department Incharge. Current status: ${status}`,
        };
      }
      return { allowed: true };
    }

    it("allows admin to delete assessments in draft status", () => {
      const result = evaluateDeletePermission("admin", "draft", 10, 50);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("allows candidate clinical staff to delete their own self-assessment in draft status", () => {
      const result = evaluateDeletePermission("staff", "draft", 57, 57);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("prevents other staff members from deleting another user's draft assessment", () => {
      const result = evaluateDeletePermission("staff", "draft", 57, 99);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Only administrators or the candidate staff member can delete");
    });

    it("prevents candidate clinical staff from deleting self-assessment once submitted to incharge", () => {
      const result = evaluateDeletePermission("staff", "submitted_to_incharge", 57, 57);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Only draft self-assessments can be deleted before submission to the Department Incharge");
    });

    it("prevents admin from deleting assessments that have progressed beyond draft", () => {
      const nonDraftStatuses = [
        "submitted_to_incharge",
        "submitted_to_nursing_super",
        "submitted_to_hr",
        "completed",
        "training_required",
        "revision_requested",
      ];

      for (const status of nonDraftStatuses) {
        const result = evaluateDeletePermission("admin", status, 1, 57);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("Only draft self-assessments can be deleted before submission to the Department Incharge");
      }
    });
  });

  describe("CBT Theoretical Exam Engine & Auto-Sync", () => {
    const mockQuestions = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      correctOptionIndex: (i % 4), // 0, 1, 2, 3
      departmentTags: i < 8 ? ["ICU/HDU"] : [],
      domainCode: i < 5 ? "HIC" : i < 10 ? "COP_BLS" : "PSQ",
    }));

    it("grades a 20-question exam and scales score to 5-point rating correctly (18/20 = 90% = 4.5/5)", () => {
      // 18 correct answers out of 20
      const answers: Record<number, number> = {};
      for (let i = 0; i < 18; i++) {
        answers[mockQuestions[i].id] = mockQuestions[i].correctOptionIndex;
      }
      // 1 wrong, 1 unanswered
      answers[mockQuestions[18].id] = (mockQuestions[18].correctOptionIndex + 1) % 4; // wrong

      const graded = gradeTheoreticalExam(mockQuestions, answers, 60);

      expect(graded.totalQuestions).toBe(20);
      expect(graded.correctCount).toBe(18);
      expect(graded.incorrectCount).toBe(1);
      expect(graded.unansweredCount).toBe(1);
      expect(graded.percentageScore).toBe(90.0);
      expect(graded.ratingOutOfFive).toBe(4.5);
      expect(graded.passed).toBe(true);
    });

    it("correctly identifies failing attempt when below benchmark (10/20 = 50% < 60%)", () => {
      const answers: Record<number, number> = {};
      for (let i = 0; i < 10; i++) {
        answers[mockQuestions[i].id] = mockQuestions[i].correctOptionIndex;
      }
      for (let i = 10; i < 20; i++) {
        answers[mockQuestions[i].id] = (mockQuestions[i].correctOptionIndex + 1) % 4;
      }

      const graded = gradeTheoreticalExam(mockQuestions, answers, 60);

      expect(graded.correctCount).toBe(10);
      expect(graded.percentageScore).toBe(50.0);
      expect(graded.ratingOutOfFive).toBe(2.5);
      expect(graded.passed).toBe(false);
    });

    it("selects at least 20 random questions blending department tags + hospital-wide clinical safety", () => {
      const all36Questions = Array.from({ length: 36 }, (_, i) => ({
        id: i + 1,
        departmentTags: i < 10 ? ["ICU/HDU"] : i < 16 ? ["OT"] : [],
        domainCode: i < 12 ? "HIC" : i < 24 ? "COP_BLS" : "PSQ",
      }));

      const selected = selectExamQuestions(all36Questions, "ICU/HDU", 20);

      expect(selected.length).toBe(20);
      // Contains questions tagged to ICU/HDU
      const hasDept = selected.some((q) => q.departmentTags.includes("ICU/HDU"));
      expect(hasDept).toBe(true);
      // Contains general hospital-wide questions
      const hasGeneral = selected.some((q) => q.departmentTags.length === 0);
      expect(hasGeneral).toBe(true);
    });
  });

  describe("Admin Competency Module Flag & Access Control Policy", () => {
    it("allows all staff roles when enableStaffCompetencyModule is TRUE", () => {
      const roles: Array<"admin" | "hr" | "nursing_super" | "incharge" | "staff"> = [
        "admin",
        "hr",
        "nursing_super",
        "incharge",
        "staff",
      ];

      for (const role of roles) {
        const policy = evaluateCompetencyModuleAccess(true, role);
        expect(policy.allowed).toBe(true);
      }
    });

    it("restricts normal staff and incharge when enableStaffCompetencyModule is FALSE, allowing only Nursing Super, HR, and Admin", () => {
      // Allowed roles when disabled
      expect(evaluateCompetencyModuleAccess(false, "admin").allowed).toBe(true);
      expect(evaluateCompetencyModuleAccess(false, "hr").allowed).toBe(true);
      expect(evaluateCompetencyModuleAccess(false, "nursing_super").allowed).toBe(true);

      // Blocked roles when disabled
      const staffPolicy = evaluateCompetencyModuleAccess(false, "staff");
      expect(staffPolicy.allowed).toBe(false);
      expect(staffPolicy.reason).toContain("restricted to Nursing Supervisors, HR, and Admin");

      const inchargePolicy = evaluateCompetencyModuleAccess(false, "incharge");
      expect(inchargePolicy.allowed).toBe(false);
      expect(inchargePolicy.reason).toContain("restricted to Nursing Supervisors, HR, and Admin");
    });
  });
});

export function evaluateCompetencyModuleAccess(
  isModuleEnabled: boolean,
  userRole: "admin" | "hr" | "nursing_super" | "incharge" | "staff"
): { allowed: boolean; reason?: string } {
  if (isModuleEnabled) {
    return { allowed: true };
  }
  if (userRole === "admin" || userRole === "hr" || userRole === "nursing_super") {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: "The Clinical Staff Competency Assessment module is temporarily restricted to Nursing Supervisors, HR, and Admin.",
  };
}

export function gradeTheoreticalExam(
  questions: Array<{ id: number; correctOptionIndex: number }>,
  answers: Record<number, number>,
  passBenchmarkPct = 60
): {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  percentageScore: number;
  ratingOutOfFive: number;
  passed: boolean;
} {
  const totalQuestions = questions.length;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  for (const q of questions) {
    const userAns = answers[q.id];
    if (userAns === undefined || userAns === null || userAns === -1) {
      unansweredCount++;
    } else if (userAns === q.correctOptionIndex) {
      correctCount++;
    } else {
      incorrectCount++;
    }
  }

  const percentageScore = Math.round((correctCount / totalQuestions) * 10000) / 100;
  const ratingOutOfFive = Math.round(((correctCount / totalQuestions) * 5) * 10) / 10;
  const passed = percentageScore >= passBenchmarkPct;

  return {
    totalQuestions,
    correctCount,
    incorrectCount,
    unansweredCount,
    percentageScore,
    ratingOutOfFive,
    passed,
  };
}

export function selectExamQuestions(
  allQuestions: Array<{ id: number; departmentTags: string[]; domainCode: string }>,
  candidateDepartment: string,
  targetCount = 20
): Array<{ id: number; departmentTags: string[]; domainCode: string }> {
  const normDept = candidateDepartment.toLowerCase();
  const deptSpecific = allQuestions.filter((q) =>
    q.departmentTags.some((t) => normDept.includes(t.toLowerCase()) || t.toLowerCase().includes(normDept))
  );
  const general = allQuestions.filter(
    (q) =>
      q.departmentTags.length === 0 ||
      q.departmentTags.some((t) => t.toLowerCase() === "all" || t.toLowerCase() === "hospital-wide") ||
      ["HIC", "PSQ", "MOM", "COP_BLS"].includes(q.domainCode)
  );

  const selected: typeof allQuestions = [];
  const maxDept = Math.min(deptSpecific.length, Math.floor(targetCount / 2));
  for (let i = 0; i < maxDept; i++) {
    selected.push(deptSpecific[i]);
  }
  for (const q of general) {
    if (selected.length >= targetCount) break;
    if (!selected.some((s) => s.id === q.id)) {
      selected.push(q);
    }
  }
  if (selected.length < targetCount) {
    for (const q of allQuestions) {
      if (selected.length >= targetCount) break;
      if (!selected.some((s) => s.id === q.id)) {
        selected.push(q);
      }
    }
  }
  return selected;
}



