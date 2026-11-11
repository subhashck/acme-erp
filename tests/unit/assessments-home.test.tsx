import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  permissions: { isAdmin: false, isHr: false },
  metadata: { canAccessModule: true, isAdmin: false, isHr: false, currentStaff: { staffId: 42 } },
  queries: [] as any[],
}));

vi.mock("@tanstack/react-router", async importOriginal => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  Link: ({ to, children, search, ...props }: any) => React.createElement("a", { href: to, ...props }, children),
}));
vi.mock("../../src/lib/permissions", () => ({ useUserPermissions: () => state.permissions }));
vi.mock("../../src/components/assessments/SkillAssessmentsPage", async importOriginal => ({
  ...await importOriginal<typeof import("../../src/components/assessments/SkillAssessmentsPage")>(),
  SkillAssessmentsPage: () => React.createElement("div", null, "Existing assessment management"),
}));
vi.mock("@tanstack/react-query", async importOriginal => ({
  ...await importOriginal<typeof import("@tanstack/react-query")>(),
  useQuery: (options: any) => {
    state.queries.push(options);
    const key = options.queryKey[0];
    const data = key === "skill-assessment-my-permissions" ? state.metadata
      : key === "skill-assessment-cycles" || key === "assessment-exam-attempts" ? []
      : { data: [], pagination: { totalRecords: 0, totalPages: 0 } };
    return { data, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { AssessmentsHomePage, StaffAssessmentHistory } from "../../src/components/assessments/AssessmentsHome";

beforeEach(() => {
  state.permissions = { isAdmin: false, isHr: false };
  state.metadata = { canAccessModule: true, isAdmin: false, isHr: false, currentStaff: { staffId: 42 } };
  state.queries = [];
  vi.unstubAllGlobals();
});

describe("Assessments staff home", () => {
  it.each(["isAdmin", "isHr"] as const)("retains the management workspace for %s", permission => {
    state.permissions[permission] = true;
    const markup = renderToStaticMarkup(<AssessmentsHomePage />);
    expect(markup).toContain("Existing assessment management");
    expect(markup).not.toContain("My assessment history");
  });

  it("shows personal history for staff and explicitly scopes both history requests", async () => {
    const markup = renderToStaticMarkup(<AssessmentsHomePage />);
    expect(markup).toContain("My assessment history");
    expect(markup).toContain("My online exam history");
    expect(markup).not.toContain("Existing assessment management");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);
    await state.queries.find(query => query.queryKey[1] === "staff-home").queryFn();
    await state.queries.find(query => query.queryKey[0] === "assessment-exam-attempts").queryFn();
    const urls = fetchMock.mock.calls.map(call => new URL(call[0], "https://example.test"));
    expect(urls[0].searchParams.get("tab")).toBe("my");
    expect(urls[0].searchParams.get("pageSize")).toBe("10");
    expect(urls[1].searchParams.get("staffId")).toBe("42");
  });

  it("shows a linked-profile explanation instead of loading someone else's history", () => {
    state.metadata.currentStaff = null as any;
    const markup = renderToStaticMarkup(<AssessmentsHomePage />);
    expect(markup).toContain("A linked staff profile is needed");
    expect(state.queries.some(query => query.queryKey[1] === "staff-home")).toBe(false);
  });

  it("preserves the administration restriction", () => {
    state.metadata.canAccessModule = false;
    const markup = renderToStaticMarkup(<AssessmentsHomePage />);
    expect(markup).toContain("paused by hospital administration");
    expect(state.queries.some(query => query.queryKey[1] === "staff-home")).toBe(false);
  });
});

describe("Personal assessment history states", () => {
  const baseProps = { loading: false, onRetry: vi.fn(), onOpen: vi.fn() };
  it("distinguishes failed and empty history", () => {
    const failed = renderToStaticMarkup(<StaffAssessmentHistory {...baseProps} records={[]} error="History is unavailable" />);
    expect(failed).toContain('role="alert"');
    expect(failed).toContain("Retry");
    expect(failed).not.toContain("No assessments found");
    const empty = renderToStaticMarkup(<StaffAssessmentHistory {...baseProps} records={[]} />);
    expect(empty).toContain("No assessments found");
  });

  it("shows finalized zero scores while leaving drafts without a fabricated final score", () => {
    const markup = renderToStaticMarkup(<StaffAssessmentHistory {...baseProps} records={[
      { id: 1, assessmentNo: "SKL-FINAL", status: "completed", finalScore: 0, createdAt: "2026-10-01" },
      { id: 2, assessmentNo: "SKL-DRAFT", status: "draft", finalScore: 0, createdAt: "2026-10-02" },
    ]} />);
    expect(markup).toContain("0.0/5");
    expect(markup.match(/Final score:/g)).toHaveLength(1);
    expect(markup).toContain("View assessment");
    expect(markup).toContain("Continue assessment");
  });
});
