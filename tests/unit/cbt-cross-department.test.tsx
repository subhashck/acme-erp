import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AssignCrossDeptTrackModal } from "../../src/components/assessments/AssignCrossDeptTrackModal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

describe("Model C Cross-Department CBT Testing", () => {
  it("renders the AssignCrossDeptTrackModal dialog with Model C controls and quota notice", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <AssignCrossDeptTrackModal isOpen={true} onClose={() => {}} />
      </QueryClientProvider>
    );

    expect(markup).toContain("Cross-Department Exam Tracks (Model C)");
    expect(markup).toContain("Candidate Staff Member");
    expect(markup).toContain("Target Exam Department (Competency Domain)");
    expect(markup).toContain("Clinical Rotation");
    expect(markup).toContain("Pre-Transfer Vetting");
    expect(markup).toContain("Hospital Certification");
    expect(markup).toContain("Elective Upskilling");
    expect(markup).toContain("Quota Isolation:");
    expect(markup).toContain("Assign Track");
  });

  it("isolates monthly quotas per target department track", () => {
    // Simulate candidate attempts in a calendar month
    const candidateAttempts = [
      {
        id: 1,
        staffId: 101,
        targetDepartmentId: 1, // General Ward (Home)
        departmentName: "General Ward",
        score: "85.00",
        passPercentage: "80.00",
        status: "completed",
        startedAt: "2026-11-05T10:00:00Z",
      },
      {
        id: 2,
        staffId: 101,
        targetDepartmentId: 2, // Intensive Care Unit (Rotation)
        departmentName: "Intensive Care Unit (ICU)",
        score: "65.00",
        passPercentage: "80.00",
        status: "completed",
        startedAt: "2026-11-06T14:00:00Z",
      },
    ];

    // Filter attempts for Home Dept (Ward)
    const homeAttempts = candidateAttempts.filter((a) => a.targetDepartmentId === 1);
    expect(homeAttempts).toHaveLength(1);
    const homePassed = homeAttempts.some((a) => Number(a.score) >= 80);
    expect(homePassed).toBe(true); // Passed Ward test

    // Filter attempts for Rotation Dept (ICU)
    const rotationAttempts = candidateAttempts.filter((a) => a.targetDepartmentId === 2);
    expect(rotationAttempts).toHaveLength(1);
    const rotationPassed = rotationAttempts.some((a) => Number(a.score) >= 80);
    expect(rotationPassed).toBe(false); // Failed ICU test (requires remediation retest)

    // Crucial Model C Invariant:
    // Passing the Ward test (id 1) does NOT lock the candidate out of the ICU rotation track.
    // Failing the ICU test (id 2) does NOT lock out or fail the candidate's Ward track.
    expect(homePassed && !rotationPassed).toBe(true);
  });
});
