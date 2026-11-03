import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  permissions: { canAccessModule: true, currentStaff: { staffId: 10 } } as any,
  attemptsData: {
    data: [
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
      },
      {
        id: 2,
        attemptNo: "EXAM-2026-0002",
        staffId: 11,
        staffName: "Nurse Jane Smith",
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
      },
    ],
    pagination: {
      page: 1,
      pageSize: 20,
      totalRecords: 2,
      totalPages: 1,
    },
    summary: {
      totalAttempts: 2,
      completedCount: 2,
      passedCount: 1,
      failedCount: 1,
      inProgressCount: 0,
      averageScore: "67.5",
      averageRating: "3.38",
      passRate: "50.0",
    },
  } as any,
  departments: [
    { id: 1, name: "ICU/HDU" },
    { id: 2, name: "Emergency" },
  ] as any[],
  queries: [] as any[],
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children, ...props }: any) =>
    React.createElement("a", { href: typeof to === "string" ? to : "#", ...props }, children),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQuery: (options: any) => {
    state.queries.push(options);
    const key = options.queryKey[0];
    if (key === "skill-assessment-my-permissions") {
      return { data: state.permissions, isLoading: false, isError: false };
    }
    if (key === "masters-departments-list") {
      return { data: state.departments, isLoading: false, isError: false };
    }
    if (key === "cbt-results-list") {
      return { data: state.attemptsData, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() };
    }
    return { data: null, isLoading: false, isError: false };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import { CbtResultsPage } from "../../src/components/assessments/CbtResultsPage";

beforeEach(() => {
  state.queries = [];
});

describe("CbtResultsPage component", () => {
  it("renders page title, summary cards, and results table with attempts data", () => {
    const markup = renderToStaticMarkup(<CbtResultsPage />);
    expect(markup).toContain("CBT Examination Results");
    expect(markup).toContain("Total CBT Attempts");
    expect(markup).toContain("Benchmark Passed");
    expect(markup).toContain("Needs Improvement");
    expect(markup).toContain("Average Score");

    // Check table records
    expect(markup).toContain("EXAM-2026-0001");
    expect(markup).toContain("Nurse John Doe");
    expect(markup).toContain("EMP-0010");
    expect(markup).toContain("PASSED");
    expect(markup).toContain("85.0%");

    expect(markup).toContain("EXAM-2026-0002");
    expect(markup).toContain("Nurse Jane Smith");
    expect(markup).toContain("EMP-0011");
    expect(markup).toContain("NEEDS TRAINING");
    expect(markup).toContain("50.0%");
  });

  it("renders filter controls for search, department, status, and outcome", () => {
    const markup = renderToStaticMarkup(<CbtResultsPage />);
    expect(markup).toContain("Search by candidate, employee code, attempt no...");
    expect(markup).toContain("All Departments");
    expect(markup).toContain("ICU/HDU");
    expect(markup).toContain("Emergency");
    expect(markup).toContain("All Statuses");
    expect(markup).toContain("All Outcomes");
  });

  it("renders export CSV and refresh buttons", () => {
    const markup = renderToStaticMarkup(<CbtResultsPage />);
    expect(markup).toContain("Export CSV");
    expect(markup).toContain("Refresh");
  });
});
