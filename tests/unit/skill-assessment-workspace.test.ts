import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => ({
  data: undefined as any,
  isLoading: false,
  isError: true,
  error: new Error("Assessment record not found"),
  refetch: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-query")>(),
  useQuery: () => query,
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { AssessmentWorkspaceModal } from "../../src/components/assessments/SkillAssessmentsPage";

beforeEach(() => { query.data = undefined; query.isError = true; });

describe("Assessment workspace request failures", () => {
  it("renders the error with close and retry actions instead of a permanent loading overlay", () => {
    const markup = renderToStaticMarkup(React.createElement(AssessmentWorkspaceModal, {
      assessmentId: 999, myPerms: {}, onClose: vi.fn(),
    }));
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Assessment record not found");
    expect(markup).toMatch(/<button[^>]*>Close<\/button>/);
    expect(markup).toMatch(/<button[^>]*>Retry<\/button>/);
    expect(markup).not.toContain("Loading Assessment Workspace");
  });
});

describe("CBT-derived self theory", () => {
  it.each([null, 0, 4])("renders theory %s read-only and only offers practical score buttons", score => {
    query.isError = false;
    query.data = {
      cbtTheoryScore: score,
      cbtDomainRatings: score == null ? {} : { HIC: score },
      assessment: { id: 5, staffId: 10, status: "draft", assessmentNo: "SKL-TEST" },
      items: [{ criterionId: 1, criterionCode: "HIC-01", criterionTitle: "Hand hygiene", domainCode: "HIC" }],
    };
    const markup = renderToStaticMarkup(React.createElement(AssessmentWorkspaceModal, {
      assessmentId: 5, myPerms: { currentStaff: { staffId: 10 } }, onClose: vi.fn(),
    }));
    expect(markup).toContain(score == null ? "Pending CBT" : `${score.toFixed(1)}/5 (CBT)`);
    expect(markup.match(/title="Score 5:/g)).toHaveLength(1);
    expect(markup).toContain("What you should be able to demonstrate");
    expect(markup).not.toContain("Theoretical Knowledge Benchmark:");
  });
});
