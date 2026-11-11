import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateOnlineCbtSearch } from "../../src/lib/online-cbt";

const state = vi.hoisted(() => ({
  metadata: { canAccessModule: true, currentStaff: { staffId: 10 } } as any,
  attempts: [] as any[], queries: [] as any[],
  metadataError: false, configError: false,
}));
vi.mock("../../src/lib/permissions", () => ({ useUserPermissions: () => ({}) }));
vi.mock("../../src/components/assessments/OnlineCbtSession", () => ({ OnlineCbtSession: () => React.createElement("div", null, "Active exam") }));
vi.mock("@tanstack/react-query", async importOriginal => ({
  ...await importOriginal<typeof import("@tanstack/react-query")>(),
  useQuery: (options: any) => {
    state.queries.push(options);
    const key = options.queryKey[0];
    return { data: key === "skill-assessment-my-permissions" ? state.metadata
      : key === "assessment-exam-attempts" ? state.attempts
        : { title: "Clinical CBT", totalQuestions: 25, totalTimeSeconds: 1800, passPercentage: "80" },
    isLoading: false, isError: key === "skill-assessment-my-permissions" ? state.metadataError : key === "skill-assessment-exam-config" && state.configError,
    refetch: vi.fn() };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import { OnlineCbtPage } from "../../src/components/assessments/OnlineCbtPage";

beforeEach(() => {
  state.metadata = { canAccessModule: true, currentStaff: { staffId: 10 } };
  state.attempts = [];
  state.queries = [];
  state.metadataError = false;
  state.configError = false;
  vi.unstubAllGlobals();
});

describe("Online CBT route", () => {
  it("shows configured exam details without starting a monthly attempt", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const markup = renderToStaticMarkup(<OnlineCbtPage assessmentId={5} />);
    expect(markup).toContain("Before you begin");
    expect(markup).toContain("30 minutes");
    expect(markup).toContain("80%");
    expect(markup).toContain("Start CBT");
    expect(markup).toContain("linked to your selected self-assessment");
    expect(markup).not.toContain("Active exam");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("offers resuming the candidate's own active exam", async () => {
    state.attempts = [{ id: 100, attemptNo: "EXAM-TEST", status: "in_progress" }];
    const markup = renderToStaticMarkup(<OnlineCbtPage />);
    expect(markup).toContain("Resume CBT");
    expect(markup).toContain("EXAM-TEST");
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => state.attempts });
    vi.stubGlobal("fetch", fetch);
    await state.queries.find(query => query.queryKey[0] === "assessment-exam-attempts").queryFn();
    expect(fetch).toHaveBeenCalledWith("/api/skill-assessment/exam/attempts?staffId=10");
  });

  it("preserves the hospital module restriction before loading exam details", () => {
    state.metadata.canAccessModule = false;
    expect(renderToStaticMarkup(<OnlineCbtPage />)).toContain("paused by hospital administration");
    expect(state.queries).toHaveLength(1);
  });

  it("requires a linked staff profile even for privileged users", () => {
    state.metadata = { canAccessModule: true, isAdmin: true, currentStaff: null };
    expect(renderToStaticMarkup(<OnlineCbtPage />)).toContain("A linked staff profile is required");
    expect(state.queries).toHaveLength(1);
  });

  it("does not offer Start when exam configuration fails to load", () => {
    state.configError = true;
    const markup = renderToStaticMarkup(<OnlineCbtPage />);
    expect(markup).toContain("Could not load exam details");
    expect(markup).not.toContain("Start CBT");
  });

  it("validates optional assessment links without converting invalid IDs into standalone exams", () => {
    expect(validateOnlineCbtSearch({})).toEqual({});
    expect(validateOnlineCbtSearch({ assessmentId: "5" })).toEqual({ assessmentId: 5 });
    expect(validateOnlineCbtSearch({ assessmentId: 12 })).toEqual({ assessmentId: 12 });
    for (const value of ["", "abc", 0, -1, 1.5, true, [1], "9007199254740992"]) {
      expect(() => validateOnlineCbtSearch({ assessmentId: value })).toThrow("Invalid assessment ID");
    }
  });
});
