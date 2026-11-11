import { describe, expect, it } from "vitest";
import { buildCbtResultsWorkbook, CbtExportAttemptRecord } from "../../src/lib/cbt-results-export";

describe("cbt-results-export", () => {
  const sampleRecords: CbtExportAttemptRecord[] = [
    {
      id: 1,
      attemptNo: "EXAM-2026-0001",
      staffId: 10,
      staffName: "Nurse John Doe",
      employeeCode: "EMP-0010",
      designation: "Staff Nurse",
      departmentName: "ICU/HDU",
      status: "completed",
      totalQuestions: 20,
      score: "85.00",
      passPercentage: "60.00",
      theoreticalRating: "4.25",
      correctCount: 17,
      incorrectCount: 3,
      unansweredCount: 0,
      timeSpentSeconds: 840,
      startedAt: "2026-10-20T10:00:00.000Z",
      completedAt: "2026-10-20T10:14:00.000Z",
      isRetest: false,
      retestAuthorized: false,
    },
    {
      id: 2,
      attemptNo: "EXAM-2026-0002",
      staffId: 11,
      staffName: "Junior Nurse Jane",
      employeeCode: "EMP-0011",
      designation: "Junior Nurse",
      departmentName: "Emergency",
      status: "completed",
      totalQuestions: 20,
      score: "50.00",
      passPercentage: "60.00",
      theoreticalRating: "2.50",
      correctCount: 10,
      incorrectCount: 10,
      unansweredCount: 0,
      timeSpentSeconds: 900,
      startedAt: "2026-10-21T11:00:00.000Z",
      completedAt: "2026-10-21T11:15:00.000Z",
      isRetest: false,
      retestAuthorized: true,
      retestAuthorizedBy: "HR Admin",
      retestReason: "Completed In-Service Training",
    },
    {
      id: 3,
      attemptNo: "EXAM-2026-0003",
      staffId: 11,
      staffName: "Junior Nurse Jane",
      employeeCode: "EMP-0011",
      designation: "Junior Nurse",
      departmentName: "Emergency",
      status: "completed",
      totalQuestions: 20,
      score: "75.00",
      passPercentage: "60.00",
      theoreticalRating: "3.75",
      correctCount: 15,
      incorrectCount: 5,
      unansweredCount: 0,
      timeSpentSeconds: 780,
      startedAt: "2026-10-25T14:00:00.000Z",
      completedAt: "2026-10-25T14:13:00.000Z",
      isRetest: true,
      retestAuthorized: false,
    },
  ];

  it("builds an Excel workbook with Executive Dashboard and Directory sheets", () => {
    const wb = buildCbtResultsWorkbook({
      records: sampleRecords,
      summary: {
        totalAttempts: 3,
        completedCount: 3,
        passedCount: 2,
        failedCount: 1,
        inProgressCount: 0,
        averageScore: "70.0",
        averageRating: "3.50",
        passRate: "66.7",
      },
      filters: {
        departmentName: "All Departments",
        status: "completed",
      },
    });

    expect(wb.SheetNames).toEqual(["Executive Dashboard", "CBT Results Directory"]);

    const dashboard = wb.Sheets["Executive Dashboard"];
    expect(dashboard).toBeDefined();
    // Brand header
    expect(dashboard["A1"].v).toContain("EXECUTIVE DASHBOARD");
    // KPI Cards
    expect(dashboard["A8"].v).toBe("TOTAL CBT ATTEMPTS");
    expect(dashboard["A9"].v).toBe(3);
    // Department breakdown
    expect(dashboard["A12"].v).toBe("DEPARTMENT-WISE COMPETENCY BREAKDOWN");

    const directory = wb.Sheets["CBT Results Directory"];
    expect(directory).toBeDefined();
    // Column header
    expect(directory["A1"].v).toBe("Sl. No.");
    expect(directory["B1"].v).toBe("Attempt No");
    expect(directory["C1"].v).toBe("Attempt Type");
    expect(directory["E1"].v).toBe("Candidate Name");
    expect(directory["G1"].v).toBe("Tested Department");
    expect(directory["H1"].v).toBe("Home Department");
    expect(directory["I1"].v).toBe("Exam Track / Purpose");

    // Row 1 data (Nurse John Doe)
    expect(directory["B2"].v).toBe("EXAM-2026-0001");
    expect(directory["C2"].v).toBe("Initial Attempt");
    expect(directory["U2"].v).toBe("PASSED");

    // Row 2 data (Junior Nurse Jane - Failed)
    expect(directory["B3"].v).toBe("EXAM-2026-0002");
    expect(directory["U3"].v).toBe("FAILED");
    expect(directory["V3"].v).toBe("YES"); // Retest authorized
    expect(directory["W3"].v).toBe("HR Admin");

    // Row 3 data (Junior Nurse Jane - Retest Attempt 2)
    expect(directory["B4"].v).toBe("EXAM-2026-0003");
    expect(directory["C4"].v).toBe("Attempt 2 (Retest)");
    expect(directory["U4"].v).toBe("PASSED");
  });
});
