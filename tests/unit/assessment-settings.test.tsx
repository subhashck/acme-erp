import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  permissions: { isAdmin: false, isHr: false, isLoading: false },
  metadata: { isAdmin: false, isHr: false, isDeptIncharge: false, isNursingSuper: false },
  queries: [] as any[],
  metadataError: false,
  settingsError: false,
}));
vi.mock("../../src/lib/permissions", () => ({ useUserPermissions: () => state.permissions }));
vi.mock("@tanstack/react-router", async importOriginal => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  Link: ({ to, children, ...props }: any) => React.createElement("a", { href: to, ...props }, children),
}));
vi.mock("@tanstack/react-query", async importOriginal => ({
  ...await importOriginal<typeof import("@tanstack/react-query")>(),
  useQuery: (options: any) => {
    state.queries.push(options);
    const key = options.queryKey[0];
    return {
      data: key === "skill-assessment-my-permissions" ? state.metadata : key === "assessment-settings" ? { enableStaffCompetencyModule: true } : [],
      isLoading: false, isError: key === "skill-assessment-my-permissions" ? state.metadataError : key === "assessment-settings" && state.settingsError,
      refetch: vi.fn(),
    };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { AssessmentSettingsPage } from "../../src/components/assessments/AssessmentSettingsPage";

beforeEach(() => {
  state.permissions = { isAdmin: false, isHr: false, isLoading: false };
  state.metadata = { isAdmin: false, isHr: false, isDeptIncharge: false, isNursingSuper: false };
  state.queries = [];
  state.metadataError = false;
  state.settingsError = false;
});

describe("Assessment settings route", () => {
  it.each(["staff", "incharge", "supervisor"])("does not load settings for %s", role => {
    state.metadata.isDeptIncharge = role === "incharge";
    state.metadata.isNursingSuper = role === "supervisor";
    const markup = renderToStaticMarkup(<AssessmentSettingsPage />);
    expect(markup).toContain("Only HR and Admin can access assessment settings");
    expect(state.queries.map(query => query.queryKey[0])).toEqual(["skill-assessment-my-permissions"]);
    expect(markup).not.toContain("Save staff access");
  });

  it.each(["isAdmin", "isHr"] as const)("shows consolidated settings for %s", role => {
    state.permissions[role] = true;
    const markup = renderToStaticMarkup(<AssessmentSettingsPage />);
    expect(markup).toContain("Assessment Settings");
    expect(markup).toContain("Save staff access");
    expect(markup).toContain("Manage assessment periods");
    expect(markup).toContain("CBT exam");
    expect(markup).toContain("Domains, objectives &amp; scenarios");
    expect(state.queries.find(query => query.queryKey[0] === "assessment-settings")).toBeDefined();
  });

  it("supports HR permission supplied by the backend metadata", () => {
    state.metadata.isHr = true;
    expect(renderToStaticMarkup(<AssessmentSettingsPage />)).toContain("Save staff access");
  });

  it("keeps access settings unavailable when their request fails", () => {
    state.permissions.isAdmin = true;
    state.settingsError = true;
    const markup = renderToStaticMarkup(<AssessmentSettingsPage />);
    expect(markup).toContain("Could not load access settings");
    expect(markup).not.toContain("Save staff access");
  });
});
