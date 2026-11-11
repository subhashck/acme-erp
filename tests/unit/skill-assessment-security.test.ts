import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { PgDialect } from "drizzle-orm/pg-core";
import type { AuthEnv } from "../../server/auth";
import { examAttempts, examConfigs, staffSkillAssessments, staffSkillAssessmentItems } from "../../server/db/schema-skill-assessment";
import { gradeExam, snapshotExamQuestions, validateAssessmentRatings } from "../../server/services/skill-assessment-engine";

const mocks = vi.hoisted(() => ({
  staff: { staffId: 10, role: "staff", name: "Candidate", department: "Ward" } as any,
  role: "staff",
  selects: [] as any[][],
  writes: [] as Array<{ table: unknown; values: any }>,
  returning: [] as any[],
  locks: 0,
  conditions: [] as any[],
  updateSettings: vi.fn(),
  moduleEnabled: true,
  db: { select: vi.fn(), update: vi.fn(), insert: vi.fn(), transaction: vi.fn(), execute: vi.fn() },
}));

vi.mock("../../server/db/client.ts", () => ({ db: mocks.db, pool: { query: vi.fn() } }));
vi.mock("../../server/db/setup-skill-assessment-db.ts", () => ({ createSkillAssessmentSchemaAndTables: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../server/services/hospital-settings.ts", () => ({
  getHospitalSettingsFromDb: vi.fn(async () => ({ name: "ACME Test Hospital", address: "Test address", enableStaffCompetencyModule: mocks.moduleEnabled })),
  updateHospitalSettingsInDb: mocks.updateSettings,
}));
vi.mock("../../server/routes/shared.ts", () => ({
  getCurrentStaff: vi.fn(async () => mocks.staff), hasHrOrAccountsViewAccess: vi.fn().mockResolvedValue(false),
}));

import { skillAssessmentRoutes } from "../../server/routes/skill-assessment";

const app = new Hono<AuthEnv>();
app.use("*", async (c, next) => {
  c.set("session", { user: { id: "candidate", role: mocks.role } } as any);
  await next();
});
app.route("/", skillAssessmentRoutes);

function query(rows: any[]) {
  const chain: any = {
    from: () => chain, where: (condition: any) => { mocks.conditions.push(condition); return chain; }, limit: () => chain,
    innerJoin: () => chain, leftJoin: () => chain, orderBy: () => chain,
    $dynamic: () => chain,
    for: () => { mocks.locks++; return chain; },
    then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
  };
  return chain;
}

const question = {
  id: 1, code: "MCQ-01", domainCode: "HIC", question: "Original question",
  options: ["Correct", "Incorrect"], correctOptionIndex: 0, explanation: "Private rationale",
  difficulty: "basic", defaultTimeSeconds: 60,
};

function attempt(overrides: Record<string, unknown> = {}) {
  return {
    id: 100, staffId: 10, assessmentId: null, departmentId: 2, attemptNo: "EXAM-2026-0100",
    startedAt: new Date(Date.now() - 10_000), totalTimeSeconds: 1200,
    questionIds: [1], questionSnapshot: [question], passPercentage: "80.00",
    answers: {}, status: "in_progress", ...overrides,
  };
}

async function request(path: string, method = "GET", body?: unknown) {
  return app.request(`/skill-assessment${path}`, {
    method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.staff = { staffId: 10, role: "staff", name: "Candidate", department: "Ward" };
  mocks.role = "staff";
  mocks.selects = [];
  mocks.writes = [];
  mocks.returning = [];
  mocks.locks = 0;
  mocks.conditions = [];
  mocks.updateSettings.mockImplementation(async updates => updates);
  mocks.moduleEnabled = true;
  mocks.db.execute.mockResolvedValue({ rows: [{ next_val: "101" }] });
  mocks.db.select.mockImplementation(() => query(mocks.selects.shift() || []));
  mocks.db.update.mockImplementation((table) => ({
    set: (values: any) => {
      mocks.writes.push({ table, values });
      return { where: () => ({ ...query([]), returning: () => Promise.resolve(mocks.returning) }) };
    },
  }));
  mocks.db.transaction.mockImplementation(async (callback) => callback(mocks.db));
  mocks.db.insert.mockImplementation((table) => ({
    values: (values: any) => {
      mocks.writes.push({ table, values });
      return { returning: () => Promise.resolve(mocks.returning) };
    },
  }));
});

describe("Assessment settings access", () => {
  it.each(["admin", "hr"])("lets %s restore staff access while the module is restricted", async role => {
    mocks.role = role;
    mocks.moduleEnabled = false;
    expect((await request("/settings")).status).toBe(200);
    const response = await request("/settings", "PUT", { enableStaffCompetencyModule: true });
    expect(response.status).toBe(200);
    expect(mocks.updateSettings).toHaveBeenCalledWith({ enableStaffCompetencyModule: true });
  });

  it.each(["staff", "incharge", "nursing_super", "management", "accounts", "hr assistant"])("blocks %s from settings and direct management API writes", async role => {
    mocks.role = role;
    mocks.staff.role = role;
    const endpoints = [
      ["/settings", "GET"], ["/settings", "PUT"], ["/criteria", "POST"], ["/criteria/1", "PUT"],
      ["/criteria/1/toggle", "PATCH"], ["/criteria/1", "DELETE"], ["/domains", "POST"],
      ["/cycles", "POST"], ["/cycles/1", "PUT"], ["/exam/config", "PUT"],
    ];
    for (const [path, method] of endpoints) {
      expect((await request(path, method, method === "GET" ? undefined : {})).status).toBe(403);
    }
    expect(mocks.writes).toEqual([]);
    expect(mocks.updateSettings).not.toHaveBeenCalled();
  });

  it.each(["admin", "hr"])("lets %s read settings and persist only the access flag", async role => {
    mocks.role = role;
    const response = await request("/settings");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ enableStaffCompetencyModule: true });
    const saved = await request("/settings", "PUT", { enableStaffCompetencyModule: false });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({ enableStaffCompetencyModule: false });
    expect(mocks.updateSettings).toHaveBeenCalledWith({ enableStaffCompetencyModule: false });
  });

  it("supports the existing exact HR staff role while rejecting a department-only match", async () => {
    mocks.staff.role = "hr";
    expect((await request("/settings")).status).toBe(200);
    mocks.staff.role = "staff";
    mocks.staff.department = "HR";
    expect((await request("/settings")).status).toBe(403);
    expect((await request("/exam/config", "PUT", {})).status).toBe(403);
  });

  it.each([{ enableStaffCompetencyModule: "false" }, { enableStaffCompetencyModule: false, name: "Other hospital" }, {}])("rejects malformed or unrelated settings fields: %j", async body => {
    mocks.role = "admin";
    expect((await request("/settings", "PUT", body)).status).toBe(400);
    expect(mocks.updateSettings).not.toHaveBeenCalled();
  });

  it.each(["admin", "hr"])("retains objective management for %s", async role => {
    mocks.role = role;
    mocks.selects = [[]];
    mocks.returning = [{ id: 1 }];
    const response = await request("/criteria", "POST", {
      domainId: 1, code: "TEST-01", title: "Safety objective", description: "Assess safe practice",
      theoreticalGuideline: "Explain safe practice", practicalGuideline: "Demonstrate safe practice",
    });
    expect(response.status).toBe(201);
    expect(mocks.writes).toHaveLength(1);
  });
});

describe("CBT access and immutable grading", () => {
  it("rejects question-mix changes by ordinary staff", async () => {
    expect((await request("/exam/config", "PUT", {})).status).toBe(403);
    expect(mocks.writes).toEqual([]);
  });

  it.each(["admin", "hr"])("persists question-mix settings for %s", async role => {
    mocks.role = role;
    mocks.selects = [[{ id: 1 }]];
    const settings = { basicPercentage: 40, mediumPercentage: 40, advancedPercentage: 20, departmentPercentage: 70 };
    mocks.returning = [{ id: 1, ...settings }];
    const response = await request("/exam/config", "PUT", settings);
    expect(response.status).toBe(200);
    expect(mocks.writes.find(w => w.table === examConfigs)?.values).toMatchObject(settings);
  });

  it.each([
    { basicPercentage: 60, mediumPercentage: 35, advancedPercentage: 15 },
    { departmentPercentage: 101 }, { basicPercentage: -1 }, { departmentPercentage: 20.5 },
  ])("rejects invalid mix percentages before writing: %j", async settings => {
    mocks.role = "hr";
    const response = await request("/exam/config", "PUT", settings);
    expect(response.status).toBe(400);
    expect(mocks.writes).toEqual([]);
  });

  it.each(["progress", "submit"])("rejects changing another candidate's %s", async (action) => {
    mocks.selects = [[attempt({ staffId: 20 })]];
    const res = await request(`/exam/100/${action}`, action === "progress" ? "PATCH" : "POST", { answers: { 1: 0 } });
    expect(res.status).toBe(403);
    expect(mocks.writes).toEqual([]);
  });

  it("rejects starting an examination for another candidate's assessment", async () => {
    mocks.selects = [[{ id: 5, staffId: 20, departmentId: 2, status: "draft" }]];
    expect((await request("/exam/start", "POST", { assessmentId: 5 })).status).toBe(403);
  });

  it("requires a staff profile even for an administrator taking an exam", async () => {
    mocks.staff = null;
    mocks.role = "admin";
    expect((await request("/exam/start", "POST", {})).status).toBe(403);
  });

  it("rejects starting an examination after self-assessment", async () => {
    mocks.selects = [[{ id: 5, staffId: 10, departmentId: 2, status: "completed" }]];
    expect((await request("/exam/start", "POST", { assessmentId: 5 })).status).toBe(409);
  });

  it("saves the configured question count, immutable questions, and passing threshold when starting", async () => {
    const questions = Array.from({ length: 5 }, (_, i) => ({ ...question, id: i + 1, departmentTags: [] }));
    mocks.selects = [
      [{ id: 5, staffId: 10, departmentId: 2, departmentName: "Ward", status: "draft" }], [], [],
      [{ totalQuestions: 5, totalTimeSeconds: 600, perQuestionTimeSeconds: 60, passPercentage: "85.00" }], questions,
    ];
    mocks.returning = [{ id: 100, attemptNo: "EXAM-2026-0101", assessmentId: 5 }];
    const res = await request("/exam/start", "POST", { assessmentId: 5 });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.totalQuestions).toBe(5);
    expect(body.passPercentage).toBe("85.00");
    expect(JSON.stringify(body)).not.toMatch(/correctOptionIndex|Private rationale/);
    expect(mocks.writes[0].values.questionSnapshot).toHaveLength(5);
    expect(mocks.writes[0].values.questionSnapshot[0].correctOptionIndex).toBe(0);
    expect(mocks.writes[0].values.passPercentage).toBe("85.00");
    expect(mocks.db.execute).toHaveBeenCalledTimes(2); // staff lock, then sequence
  });

  it("resumes an expired attempt with zero time instead of silently starting another exam", async () => {
    mocks.selects = [
      [{ id: 5, staffId: 10, departmentId: 2, departmentName: "Ward", status: "draft" }],
      [attempt({ assessmentId: 5, startedAt: new Date(Date.now() - 1201_000), answers: { 1: 0 } })],
    ];
    const res = await request("/exam/start", "POST", { assessmentId: 5 });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.isResumed).toBe(true);
    expect(body.remainingSeconds).toBe(0);
    expect(body.savedAnswers).toEqual({ 1: 0 });
    expect(mocks.writes).toEqual([]);
  });

  it("uses the saved difficulty and department mix when generating a new exam", async () => {
    let id = 0;
    const questions = ["basic", "medium", "advanced"].flatMap(difficulty =>
      [[], ["Ward"]].flatMap(departmentTags => Array.from({ length: 10 }, () => ({
        ...question, id: ++id, difficulty, departmentTags,
      }))));
    mocks.selects = [
      [{ id: 5, staffId: 10, departmentId: 2, departmentName: "Ward", status: "draft" }], [], [],
      [{ totalQuestions: 10, basicPercentage: 20, mediumPercentage: 30, advancedPercentage: 50,
        departmentPercentage: 70, totalTimeSeconds: 600, perQuestionTimeSeconds: 60, passPercentage: "60.00" }],
      questions,
    ];
    mocks.returning = [{ id: 100, attemptNo: "EXAM-2026-0101", assessmentId: 5 }];
    expect((await request("/exam/start", "POST", { assessmentId: 5 })).status).toBe(200);
    const saved = mocks.writes.find(w => w.table === examAttempts)!.values;
    expect(["basic", "medium", "advanced"].map(level => saved.questionSnapshot.filter((q: any) => q.difficulty === level).length)).toEqual([2, 3, 5]);
    const specific = new Set(questions.filter(q => q.departmentTags.includes("Ward")).map(q => q.id));
    expect(saved.questionIds.filter((id: number) => specific.has(id))).toHaveLength(7);
  });

  it.each(["staff", "hr", "admin"])("blocks a second monthly exam for %s without writing or consuming a sequence", async role => {
    mocks.role = role;
    mocks.selects = [
      [{ id: 5, staffId: 10, departmentId: 2, departmentName: "Ward", status: "draft" }],
      [], [{ id: 99 }],
    ];
    const response = await request("/exam/start", "POST", { assessmentId: 5 });
    const body = await response.json();
    expect(response.status).toBe(429);
    expect(body.code).toBe("CBT_MONTHLY_LIMIT");
    expect(body.error).toContain("one CBT exam");
    expect(new Date(body.nextEligibleAt).getTime()).toBeGreaterThan(Date.now());
    expect(mocks.writes).toEqual([]);
    expect(mocks.db.execute).toHaveBeenCalledTimes(1); // staff transaction lock only
  });

  it("blocks a standalone exam when the monthly allowance has already been used", async () => {
    mocks.selects = [[{ id: 2, name: "Ward" }], [], [{ id: 99 }]];
    const response = await request("/exam/start", "POST", {});
    expect(response.status).toBe(429);
    expect(mocks.writes).toEqual([]);
  });

  it("resumes the same staff member's active session even when another assessment is requested", async () => {
    mocks.selects = [
      [{ id: 5, staffId: 10, departmentId: 2, departmentName: "Ward", status: "draft" }],
      [attempt({ assessmentId: 3 })],
    ];
    const response = await request("/exam/start", "POST", { assessmentId: 5 });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.isResumed).toBe(true);
    expect(body.assessmentId).toBe(3);
    expect(body.attemptId).toBe(100);
    expect(mocks.writes).toEqual([]);
  });

  it("never exposes private question snapshots or answer keys during a live exam", async () => {
    mocks.selects = [[attempt({ answers: { 1: { selectedOptionIndex: 0, correctOptionIndex: 0 } } })]];
    const res = await request("/exam/attempts/100");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toMatch(/correctOptionIndex|questionSnapshot|Private rationale/);
    expect(body.review[0].question).toBe("Original question");
    expect(body.attempt.answers).toEqual({ 1: 0 });
  });

  it("rejects another staff member reading an exam or assessment", async () => {
    // Attempt, supervisor lookup, current staff role, department leadership, department, staff role.
    mocks.selects = [[attempt({ staffId: 20 })], [], [], [], [], []];
    expect((await request("/exam/attempts/100")).status).toBe(403);
    mocks.selects = [[{ id: 5, staffId: 20, departmentId: 2 }], [], [], [], [], []];
    expect((await request("/5")).status).toBe(403);
  });

  it("discards late answers and grades only answers saved before the deadline", async () => {
    mocks.selects = [[attempt({ startedAt: new Date(Date.now() - 1201_000), answers: { 1: 1 } })]];
    const res = await request("/exam/100/submit", "POST", { answers: { 1: 0 } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.expired).toBe(true);
    expect(body.score).toBe(0);
    expect(mocks.writes[0].values.status).toBe("timed_out");
    expect(body.timeSpentSeconds).toBe(1200);
  });

  it("does not save progress after the deadline", async () => {
    mocks.selects = [[attempt({ startedAt: new Date(Date.now() - 1201_000) })]];
    const res = await request("/exam/100/progress", "PATCH", { answers: { 1: 0 } });
    expect((await res.json()).isExpired).toBe(true);
    expect(mocks.writes).toEqual([]);
  });

  it.each(["submitted_to_incharge", "submitted_to_hr", "completed", "training_required"])("does not change assessment scores in %s", async (status) => {
    mocks.selects = [[attempt({ assessmentId: 5 })], [{ id: 5, staffId: 10, status }]];
    const res = await request("/exam/100/submit", "POST", { answers: { 1: 0 } });
    expect(res.status).toBe(200);
    expect((await res.json()).syncedToAssessmentId).toBeNull();
    expect(mocks.writes).toHaveLength(1);
    expect(mocks.writes[0].table).toBe(examAttempts);
    expect(mocks.locks).toBe(2);
  });

  it("saves a zero CBT rating to a draft assessment without replacing it with three", async () => {
    mocks.selects = [[attempt({ assessmentId: 5 })], [{ id: 5, staffId: 10, status: "draft", selfPracticalScore: "4.00" }], [{ theoreticalRating: "0.00", questionSnapshot: [question], answers: { 1: 1 } }], [{ criterionId: 1, domainCode: "HIC" }]];
    mocks.returning = [{ id: 5 }];
    const res = await request("/exam/100/submit", "POST", { answers: { 1: 1 } });
    expect(res.status).toBe(200);
    expect(mocks.writes.find((w) => w.table === staffSkillAssessments)?.values.selfTheoreticalScore).toBe("0.00");
    expect(mocks.writes.find((w) => w.table === staffSkillAssessmentItems)?.values.selfTheoreticalScore).toBe("0.00");
  });

  it("grades using the snapshot and the configured passing threshold", async () => {
    const questions = Array.from({ length: 5 }, (_, i) => ({ ...question, id: i + 1 }));
    mocks.selects = [[attempt({ questionIds: [1, 2, 3, 4, 5], questionSnapshot: questions })]];
    const res = await request("/exam/100/submit", "POST", { answers: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 } });
    const body = await res.json();
    expect(body.score).toBe(60);
    expect(body.passed).toBe(false);
    // No live question-bank query was needed to grade.
    expect(mocks.selects).toEqual([]);
  });

  it("keeps historical question content after editing the bank", () => {
    const original = { ...question, options: [...question.options] };
    const snapshot = snapshotExamQuestions([original]);
    original.options[0] = "Edited option";
    original.correctOptionIndex = 1;
    expect(gradeExam(snapshot, { 1: 0 }, 100).passed).toBe(true);
    expect(snapshot[0].options[0]).toBe("Correct");
  });
});

describe("CBT result certificates", () => {
  it.each(["completed", "timed_out"])("allows staff to print their own finalized %s result using its saved benchmark", async status => {
    mocks.selects = [
      [attempt({ status, completedAt: new Date("2026-10-15T10:00:00Z"), score: "70.00", passPercentage: "80.00", theoreticalRating: "3.50", totalQuestions: 20, correctCount: 14 })],
      [{ name: "Candidate", code: "EMP-10" }],
    ];
    const response = await request("/exam/attempts/100/certificate");
    const certificate = await response.json();
    expect(response.status).toBe(200);
    expect(certificate.exam).toMatchObject({ score: 70, passPercentage: 80, passed: false, status });
    expect(certificate.employee).toMatchObject({ name: "Candidate", code: "EMP-10" });
    expect(certificate.hospital.name).toBe("ACME Test Hospital");
    expect(certificate.reference).toBe("CBT-EXAM-2026-0100");
    expect(JSON.stringify(certificate)).not.toMatch(/questionSnapshot|correctOptionIndex|Private rationale|answers/);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.writes).toEqual([]);
  });

  it("rejects printing another employee's certificate", async () => {
    mocks.selects = [[attempt({ staffId: 20 })]];
    expect((await request("/exam/attempts/100/certificate")).status).toBe(403);
  });

  it.each(["admin", "hr"])("retains certificate access for %s", async role => {
    mocks.role = role;
    mocks.selects = [[attempt({ staffId: 20, status: "completed", completedAt: new Date(), score: "90.00", passPercentage: "80.00" })], [{ name: "Other employee", code: "EMP-20" }]];
    const response = await request("/exam/attempts/100/certificate");
    expect(response.status).toBe(200);
    expect((await response.json()).exam.passed).toBe(true);
  });

  it.each(["in_progress", "abandoned"])("does not issue a certificate for %s attempts", async status => {
    mocks.selects = [[attempt({ status })]];
    expect((await request("/exam/attempts/100/certificate")).status).toBe(409);
  });

  it("rejects missing result completion data", async () => {
    mocks.selects = [[attempt({ status: "completed", completedAt: null })]];
    expect((await request("/exam/attempts/100/certificate")).status).toBe(409);
  });

  it("rejects invalid attempt identifiers", async () => {
    expect((await request("/exam/attempts/not-a-number/certificate")).status).toBe(400);
  });
});

describe("Assessment ratings", () => {
  it("averages all period CBTs with inclusive India date boundaries during submission", async () => {
    mocks.selects = [
      [{ id: 5, staffId: 10, status: "draft", startDate: "2026-01-01", endDate: "2026-03-31" }],
      [{ criterionId: 1, domainCode: "HIC" }],
      [
        { theoreticalRating: "5.00", questionSnapshot: [question], answers: { 1: 0 } },
        { theoreticalRating: "0.00", questionSnapshot: [question], answers: { 1: 1 } },
      ],
    ];
    mocks.returning = [{ id: 5 }];
    const res = await request("/5/self-submit", "PUT", {
      items: [{ criterionId: 1, selfTheoreticalScore: 5, selfPracticalScore: 4 }],
    });
    expect(res.status).toBe(200);
    expect(mocks.writes[0].values.selfTheoreticalScore).toBe("2.50");
    expect(mocks.writes[1].values.selfTheoreticalScore).toBe("2.50");
    const filter = new PgDialect().sqlToQuery(mocks.conditions[2]);
    expect(filter.params).toEqual([10, "completed", "timed_out", "2025-12-31T18:30:00.000Z", "2026-03-31T18:30:00.000Z"]);
    expect(filter.sql).not.toContain("assessment_id");
  });

  it("saves matching domain ratings and permits domains omitted from CBT", async () => {
    const questions = ["HIC", "HIC", "MOM"].map((domainCode, i) => ({ ...question, id: i + 1, domainCode }));
    mocks.selects = [
      [{ id: 5, staffId: 10, status: "draft" }],
      [{ criterionId: 1, domainCode: "HIC" }, { criterionId: 2, domainCode: "MOM" }, { criterionId: 3, domainCode: "AAC" }],
      [{ theoreticalRating: "3.30", questionSnapshot: questions, answers: { 1: 0, 2: 1, 3: 0 } }],
    ];
    mocks.returning = [{ id: 5 }];
    const res = await request("/5/self-submit", "PUT", {
      items: [1, 2, 3].map(criterionId => ({ criterionId, selfTheoreticalScore: 5, selfPracticalScore: 4 })),
    });
    expect(res.status).toBe(200);
    expect(mocks.writes.filter(w => w.table === staffSkillAssessmentItems).map(w => w.values.selfTheoreticalScore)).toEqual(["2.50", "5.00", null]);
    expect(mocks.writes.find(w => w.table === staffSkillAssessments)?.values.selfTheoreticalScore).toBe("3.30");
  });

  it("allows an incomplete draft and persists missing scores as null", async () => {
    mocks.selects = [[{ id: 5, staffId: 10, status: "revision_requested" }], [{ criterionId: 1 }], []];
    mocks.returning = [{ id: 5 }];
    const res = await request("/5/self-submit", "PUT", {
      isDraftOnly: true, items: [{ criterionId: 1, selfTheoreticalScore: null, selfPracticalScore: null }],
    });
    expect(res.status).toBe(200);
    expect(mocks.writes[0].values.selfTheoreticalScore).toBeNull();
    expect(mocks.writes[0].values.selfPracticalScore).toBeNull();
    expect(mocks.writes[1].values.status).toBe("revision_requested");
  });

  it("rejects submitting an unrated criterion", async () => {
    mocks.selects = [[{ id: 5, staffId: 10, status: "draft" }], [{ criterionId: 1 }], []];
    const res = await request("/5/self-submit", "PUT", {
      items: [{ criterionId: 1, selfTheoreticalScore: null, selfPracticalScore: null }],
    });
    expect(res.status).toBe(400);
    expect(mocks.writes).toEqual([]);
  });

  it("uses the authoritative zero CBT result during self submission", async () => {
    mocks.selects = [[{ id: 5, staffId: 10, status: "draft" }], [{ criterionId: 1, domainCode: "HIC" }], [{ theoreticalRating: "0.00", questionSnapshot: [question], answers: { 1: 1 } }]];
    mocks.returning = [{ id: 5 }];
    const res = await request("/5/self-submit", "PUT", {
      items: [{ criterionId: 1, selfTheoreticalScore: 5, selfPracticalScore: 4 }],
    });
    expect(res.status).toBe(200);
    expect(mocks.writes[0].values.selfTheoreticalScore).toBe("0.00");
    expect(mocks.writes[1].values.selfOverallScore).toBe("2.00");
  });

  it("rejects manually supplied theory even when all practical ratings are complete", async () => {
    mocks.selects = [[{ id: 5, staffId: 10, status: "draft" }], [{ criterionId: 1 }], []];
    const response = await request("/5/self-submit", "PUT", {
      items: [{ criterionId: 1, selfTheoreticalScore: 5, selfPracticalScore: 4 }],
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("Complete your online CBT exam");
    expect(mocks.writes).toEqual([]);
  });

  it("clears manual draft theory when no CBT result exists", async () => {
    mocks.selects = [[{ id: 5, staffId: 10, status: "draft" }], [{ criterionId: 1 }], []];
    mocks.returning = [{ id: 5 }];
    const response = await request("/5/self-submit", "PUT", {
      isDraftOnly: true, items: [{ criterionId: 1, selfTheoreticalScore: 5, selfPracticalScore: 4 }],
    });
    expect(response.status).toBe(200);
    expect(mocks.writes[0].values.selfTheoreticalScore).toBeNull();
    expect(mocks.writes[0].values.selfPracticalScore).toBe("4.00");
  });

  it("rejects missing, duplicate, or foreign criteria and distinguishes zero theory from unrated", () => {
    expect(validateAssessmentRatings([1, 2], [{ criterionId: 1, theory: 3, practical: 3 }], false)).toBeTruthy();
    expect(validateAssessmentRatings([1, 2], [1, 1].map((criterionId) => ({ criterionId, theory: 3, practical: 3 })), false)).toBeTruthy();
    expect(validateAssessmentRatings([1], [{ criterionId: 99, theory: 3, practical: 3 }], true)).toBeTruthy();
    expect(validateAssessmentRatings([1], [{ criterionId: 1, theory: 0, practical: 3 }], false)).toBeTruthy();
    expect(validateAssessmentRatings([1], [{ criterionId: 1, theory: 0, practical: 3 }], false, true)).toBeNull();
  });
});
