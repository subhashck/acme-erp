import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { AuthEnv } from "../../server/auth";

// Hoisted mocks for database and session
const mocks = vi.hoisted(() => ({
  user: { id: "user-1", role: "admin", name: "Dr. Admin", email: "admin@acme.test" },
  profile: null as any,
  staff: null as any,
  isModAdminResult: false,
  selectResults: [] as any[][],
  insertedValues: [] as any[],
  updatedValues: [] as any[],
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../server/db/client.ts", () => ({
  db: mocks.db,
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
}));

vi.mock("../../server/auth.ts", () => ({
  auth: { api: { getSession: vi.fn().mockResolvedValue(null) } },
  trustedOrigins: [],
}));

vi.mock("better-auth/crypto", () => ({
  hashPassword: vi.fn().mockResolvedValue("mocked-hashed-password-1234"),
}));

import {
  isDoctorEmailWhitelisted,
  isDoctorCbtAdmin,
  preEnrollDoctorCandidate,
  verifyAndAuthorizeGoogleUser,
} from "../../server/services/doctor-cbt-auth";
import { doctorCbtRoutes, shuffleArray } from "../../server/routes/doctor-cbt";
import { googleAuthErrorMessage } from "../../src/lib/google-auth-errors";

function mockSelect(rows: any[]) {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    limit: () => chain,
    offset: () => chain,
    orderBy: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
  };
  return chain;
}

describe("Doctor CBT Auth & Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insertedValues = [];
    mocks.updatedValues = [];
  });

  describe("isDoctorEmailWhitelisted", () => {
    it("rejects empty or whitespace email", async () => {
      const result = await isDoctorEmailWhitelisted("   ");
      expect(result.whitelisted).toBe(false);
      expect(result.reason).toContain("Email is required");
    });

    it("returns whitelisted = false for non-enrolled email", async () => {
      mocks.db.select.mockReturnValue(mockSelect([]));
      const result = await isDoctorEmailWhitelisted("stranger@gmail.com");
      expect(result.whitelisted).toBe(false);
      expect(result.reason).toContain("not enrolled");
    });

    it("returns whitelisted = true for active enrolled doctor", async () => {
      mocks.db.select.mockReturnValue(
        mockSelect([
          {
            id: 101,
            fullName: "Dr. Rajesh Sharma",
            email: "dr.rajesh@gmail.com",
            status: "enrolled",
            candidateType: "external_trainee",
            userId: "u-101",
          },
        ])
      );
      const result = await isDoctorEmailWhitelisted("dr.rajesh@gmail.com");
      expect(result.whitelisted).toBe(true);
      expect(result.profileId).toBe(101);
      expect(result.fullName).toBe("Dr. Rajesh Sharma");
    });

    it("returns whitelisted = false for suspended doctor", async () => {
      mocks.db.select.mockReturnValue(
        mockSelect([
          {
            id: 102,
            fullName: "Dr. Suspended",
            email: "suspended@gmail.com",
            status: "suspended",
            candidateType: "external_trainee",
            userId: "u-102",
          },
        ])
      );
      const result = await isDoctorEmailWhitelisted("suspended@gmail.com");
      expect(result.whitelisted).toBe(false);
      expect(result.status).toBe("suspended");
      expect(result.reason).toContain("suspended");
    });
  });

  describe("verifyAndAuthorizeGoogleUser", () => {
    it("rejects unverified or missing email from Google profile", async () => {
      const unverified = await verifyAndAuthorizeGoogleUser({
        email: "test@gmail.com",
        email_verified: false,
      });
      expect(unverified.authorized).toBe(false);
      expect(unverified.code).toBe("account_not_allowed");

      const empty = await verifyAndAuthorizeGoogleUser({
        email: "  ",
        email_verified: true,
      });
      expect(empty.authorized).toBe(false);
      expect(empty.code).toBe("account_not_allowed");
    });

    it("authorizes active Doctor CBT candidate profile and assigns doctor_candidate role", async () => {
      mocks.db.select.mockReturnValueOnce(
        mockSelect([
          {
            id: 201,
            fullName: "Dr. Ananya Roy",
            email: "ananya.roy@gmail.com",
            status: "enrolled",
            candidateType: "external_trainee",
            userId: null,
          },
        ])
      );

      const result = await verifyAndAuthorizeGoogleUser({
        email: "ANANYA.ROY@GMAIL.COM",
        email_verified: true,
        name: "Ananya Roy",
        picture: "https://lh3.googleusercontent.com/a/photo.jpg",
      });

      expect(result.authorized).toBe(true);
      expect(result.matchedSource).toBe("doctor_profile");
      expect(result.user?.email).toBe("ananya.roy@gmail.com");
      expect(result.user?.name).toBe("Dr. Ananya Roy");
      expect(result.user?.role).toBe("doctor_candidate");
      expect(result.user?.emailVerified).toBe(true);
    });

    it("rejects suspended Doctor CBT candidate profile with account_suspended", async () => {
      mocks.db.select.mockReturnValueOnce(
        mockSelect([
          {
            id: 202,
            fullName: "Dr. Suspended Candidate",
            email: "suspended.doc@gmail.com",
            status: "suspended",
            candidateType: "external_trainee",
            userId: null,
          },
        ])
      );

      const result = await verifyAndAuthorizeGoogleUser({
        email: "suspended.doc@gmail.com",
        email_verified: true,
      });

      expect(result.authorized).toBe(false);
      expect(result.code).toBe("account_suspended");
      expect(result.reason).toContain("suspended");
    });

    it("authorizes Doctor CBT module users if not found in doctorProfiles", async () => {
      // First select is doctorProfiles -> empty
      mocks.db.select.mockReturnValueOnce(mockSelect([]));
      // Second select is moduleUsers -> found active module admin
      mocks.db.select.mockReturnValueOnce(
        mockSelect([
          {
            id: 10,
            fullName: "Dr. Faculty Lead",
            roleInModule: "module_admin",
            active: true,
            userId: null,
          },
        ])
      );

      const result = await verifyAndAuthorizeGoogleUser({
        email: "faculty.lead@gmail.com",
        email_verified: true,
      });

      expect(result.authorized).toBe(true);
      expect(result.matchedSource).toBe("module_user");
      expect(result.user?.role).toBe("staff");
      expect(result.user?.name).toBe("Dr. Faculty Lead");
    });

    it("falls back to Hospital Staff directory if not found in Doctor CBT", async () => {
      // 1. doctorProfiles -> empty
      mocks.db.select.mockReturnValueOnce(mockSelect([]));
      // 2. moduleUsers -> empty
      mocks.db.select.mockReturnValueOnce(mockSelect([]));
      // 3. staff -> active staff member found
      mocks.db.select.mockReturnValueOnce(
        mockSelect([
          {
            staffId: 55,
            name: "Nurse Incharge Mary",
            role: "nurse",
            status: "Active",
            active: true,
            userId: "u-mary-55",
          },
        ])
      );

      const result = await verifyAndAuthorizeGoogleUser({
        email: "mary.nurse@gmail.com",
        email_verified: true,
      });

      expect(result.authorized).toBe(true);
      expect(result.matchedSource).toBe("staff");
      expect(result.user?.name).toBe("Nurse Incharge Mary");
      expect(result.user?.role).toBe("nurse");
    });

    it("rejects unknown Google account not configured in Doctor CBT or Staff", async () => {
      // 1. doctorProfiles -> empty
      mocks.db.select.mockReturnValueOnce(mockSelect([]));
      // 2. moduleUsers -> empty
      mocks.db.select.mockReturnValueOnce(mockSelect([]));
      // 3. staff -> empty
      mocks.db.select.mockReturnValueOnce(mockSelect([]));

      const result = await verifyAndAuthorizeGoogleUser({
        email: "unknown.stranger@gmail.com",
        email_verified: true,
      });

      expect(result.authorized).toBe(false);
      expect(result.code).toBe("user_not_found");
      expect(result.reason).toContain("not configured in Doctor CBT or Hospital Staff directory");
    });
  });

  describe("googleAuthErrorMessage", () => {
    it("handles account_not_linked without prompting user to go to Settings", () => {
      const msg = googleAuthErrorMessage("account_not_linked");
      expect(msg).not.toContain("Settings → Profile & Security");
      expect(msg).toContain("automatically linked");
    });

    it("handles user_not_found and forbidden with helpful guidance", () => {
      const msgNotFound = googleAuthErrorMessage("user_not_found");
      expect(msgNotFound).toContain("Doctor CBT or Hospital Staff directory");

      const msgForbidden = googleAuthErrorMessage("forbidden");
      expect(msgForbidden).toContain("Doctor CBT or Hospital Staff directory");
    });

    it("preserves custom error description when provided", () => {
      const msg = googleAuthErrorMessage("custom_error", "Custom detailed failure reason from auth");
      expect(msg).toBe("Custom detailed failure reason from auth");
    });
  });

  describe("isDoctorCbtAdmin", () => {
    it("returns false if neither userId nor userEmail provided", async () => {
      const result = await isDoctorCbtAdmin(null, null);
      expect(result).toBe(false);
    });

    it("returns true when user has module_admin role in module_users", async () => {
      mocks.db.select.mockReturnValueOnce(
        mockSelect([{ id: 1, roleInModule: "module_admin", active: true }])
      );
      const result = await isDoctorCbtAdmin("user-faculty-1", "faculty@acme.test");
      expect(result).toBe(true);
    });

    it("checks module_settings assigned_module_admins list if not in module_users", async () => {
      // First select (module_users) returns empty
      mocks.db.select.mockReturnValueOnce(mockSelect([]));
      // Second select (module_settings) returns assigned admin list
      mocks.db.select.mockReturnValueOnce(
        mockSelect([{ settingValue: ["user-assigned-admin"] }])
      );
      const result = await isDoctorCbtAdmin("user-assigned-admin", "assigned@acme.test");
      expect(result).toBe(true);
    });
  });

  describe("preEnrollDoctorCandidate", () => {
    it("successfully creates user with doctor_candidate role and links enrollment", async () => {
      // 1. Program lookup
      mocks.db.select.mockReturnValueOnce(
        mockSelect([{ id: 5, title: "Fellowship in Critical Care" }])
      );
      // 2. User lookup (not found)
      mocks.db.select.mockReturnValueOnce(mockSelect([]));
      // 3. Insert into user table
      const insertUserChain: any = {
        values: (vals: any) => {
          mocks.insertedValues.push({ table: "user", vals });
          return Promise.resolve();
        },
      };
      mocks.db.insert.mockReturnValueOnce(insertUserChain);

      // Account lookup (not found)
      mocks.db.select.mockReturnValueOnce(mockSelect([]));

      // 4. Initial password provided -> insert into account table
      const insertAccountChain: any = {
        values: (vals: any) => {
          mocks.insertedValues.push({ table: "account", vals });
          return Promise.resolve();
        },
      };
      mocks.db.insert.mockReturnValueOnce(insertAccountChain);

      // 5. Doctor profile lookup (not found)
      mocks.db.select.mockReturnValueOnce(mockSelect([]));
      // 6. Insert doctor profile returning { id: 77 }
      const insertProfileChain: any = {
        values: (vals: any) => {
          mocks.insertedValues.push({ table: "doctor_profiles", vals });
          return {
            returning: () => Promise.resolve([{ id: 77 }]),
          };
        },
      };
      mocks.db.insert.mockReturnValueOnce(insertProfileChain);

      // 7. Enrollment lookup (not found)
      mocks.db.select.mockReturnValueOnce(mockSelect([]));
      // 8. Insert enrollment returning { id: 99 }
      const insertEnrollmentChain: any = {
        values: (vals: any) => {
          mocks.insertedValues.push({ table: "doctor_enrollments", vals });
          return {
            returning: () => Promise.resolve([{ id: 99 }]),
          };
        },
      };
      mocks.db.insert.mockReturnValueOnce(insertEnrollmentChain);

      const res = await preEnrollDoctorCandidate({
        fullName: "Dr. Vikram Seth",
        email: "vikram@gmail.com",
        nmcSmcNumber: "NMC-2021-0012",
        programId: 5,
        initialPassword: "securePassword123",
      });

      expect(res.success).toBe(true);
      expect(res.profileId).toBe(77);
      expect(res.enrollmentId).toBe(99);
      expect(res.email).toBe("vikram@gmail.com");

      // Verify user inserted with role doctor_candidate
      const userInsert = mocks.insertedValues.find((v) => v.table === "user");
      expect(userInsert).toBeDefined();
      expect(userInsert.vals.role).toBe("doctor_candidate");
      expect(userInsert.vals.mustChangePassword).toBe(true);

      // Verify account inserted with credential provider and hashed password
      const accountInsert = mocks.insertedValues.find((v) => v.table === "account");
      expect(accountInsert).toBeDefined();
      expect(accountInsert.vals.providerId).toBe("credential");
      expect(accountInsert.vals.password).toBe("mocked-hashed-password-1234");
    });
  });
});

describe("Doctor CBT Hono Route Handlers", () => {
  const app = new Hono<AuthEnv>();
  app.use("*", async (c, next) => {
    c.set("session", { user: mocks.user } as any);
    await next();
  });
  app.route("/", doctorCbtRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.select.mockReset();
    mocks.db.update.mockReset();
    mocks.db.insert.mockReset();
    mocks.user = { id: "user-1", role: "admin", name: "Dr. Admin", email: "admin@acme.test" };
  });

  it("GET /doctor-cbt/me returns user context and admin flag", async () => {
    // Current doctor profile lookup
    mocks.db.select.mockReturnValueOnce(
      mockSelect([
        {
          id: 1,
          fullName: "Dr. Admin",
          nmcSmcNumber: "NMC-001",
          status: "active",
        },
      ])
    );
    // Staff record lookup
    mocks.db.select.mockReturnValueOnce(mockSelect([]));
    // Enrollments lookup
    mocks.db.select.mockReturnValueOnce(mockSelect([]));

    const res = await app.request("/doctor-cbt/me");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe("admin@acme.test");
    expect(body.isDoctorCbtAdmin).toBe(true);
    expect(body.canManage).toBe(true);
  });

  it("GET /doctor-cbt/settings returns default configuration", async () => {
    mocks.db.select.mockReturnValueOnce(
      mockSelect([
        { settingKey: "default_pass_percentage", settingValue: 75.0 },
        { settingKey: "enable_google_whitelist", settingValue: true },
        { settingKey: "assigned_module_admins", settingValue: ["user-mod-1"] },
      ])
    );

    const res = await app.request("/doctor-cbt/settings");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.default_pass_percentage).toBe(75.0);
    expect(body.enable_google_whitelist).toBe(true);
    expect(body.assigned_module_admins).toEqual(["user-mod-1"]);
  });

  it("PATCH /doctor-cbt/settings updates configuration", async () => {
    // Return existing row for key lookups
    mocks.db.select.mockReturnValue(mockSelect([{ id: 1 }]));
    const updateChain: any = {
      set: () => ({
        where: () => Promise.resolve(),
      }),
    };
    mocks.db.update.mockReturnValue(updateChain);

    const res = await app.request("/doctor-cbt/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        default_pass_percentage: 80.0,
        enable_google_whitelist: true,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("GET /doctor-cbt/programs returns active programs", async () => {
    mocks.db.select.mockReturnValueOnce(
      mockSelect([
        {
          id: 1,
          code: "DOC-EM-01",
          title: "Fellowship in Emergency Medicine",
          specialty: "Emergency Medicine",
          active: true,
        },
      ])
    );

    const res = await app.request("/doctor-cbt/programs");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].code).toBe("DOC-EM-01");
  });

  it("POST /doctor-cbt/programs creates a new program", async () => {
    const insertChain: any = {
      values: (vals: any) => ({
        returning: () =>
          Promise.resolve([
            {
              id: 2,
              ...vals,
            },
          ]),
      }),
    };
    mocks.db.insert.mockReturnValueOnce(insertChain);

    const res = await app.request("/doctor-cbt/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "DOC-CC-01",
        title: "Fellowship in Critical Care Medicine",
        specialty: "Critical Care",
        durationMonths: 12,
        totalCmeCredits: 20,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(2);
    expect(body.code).toBe("DOC-CC-01");
  });

  describe("Doctor Candidate Management & Email Synchronization", () => {
    it("PATCH /doctor-cbt/candidates/:id successfully updates profile and syncs user email", async () => {
      // 1. Current profile lookup
      mocks.db.select.mockReturnValueOnce(
        mockSelect([
          {
            id: 50,
            userId: "user-candidate-1",
            fullName: "Dr. Old Name",
            email: "old.email@hospital.com",
            status: "active",
          },
        ])
      );
      // 2. Email collision check in doctorProfiles (none)
      mocks.db.select.mockReturnValueOnce(mockSelect([]));
      // 3. Email collision check in user table (none)
      mocks.db.select.mockReturnValueOnce(mockSelect([]));

      // Mock updates
      mocks.db.update.mockReturnValue({
        set: (vals: any) => ({
          where: () => ({
            returning: () =>
              Promise.resolve([
                {
                  id: 50,
                  fullName: "Dr. New Name",
                  email: "new.email@hospital.com",
                  ...vals,
                },
              ]),
          }),
        }),
      });

      const res = await app.request("/doctor-cbt/candidates/50", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Dr. New Name",
          email: "new.email@hospital.com",
          mobile: "9876543210",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.fullName).toBe("Dr. New Name");
      expect(body.message).toContain("Login email updated to new.email@hospital.com");
    });

    it("PATCH /doctor-cbt/candidates/:id rejects email collision with another candidate", async () => {
      // 1. Current profile lookup
      mocks.db.select.mockReturnValueOnce(
        mockSelect([
          {
            id: 50,
            userId: "user-candidate-1",
            fullName: "Dr. First",
            email: "first@hospital.com",
          },
        ])
      );
      // 2. Email collision check in doctorProfiles (conflict found with id 51)
      mocks.db.select.mockReturnValueOnce(
        mockSelect([
          {
            id: 51,
            email: "second@hospital.com",
          },
        ])
      );

      const res = await app.request("/doctor-cbt/candidates/50", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "second@hospital.com",
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("already registered to another doctor candidate");
    });
  });

  describe("Doctor CBT Pre-Test & Exit-Test Simple Scoring", () => {
    it("grades exam using simple percentage: (correct / total) * 100", async () => {
      // Mock session lookup
      mocks.db.select
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 10,
              attemptNo: "DOC-CBT-PRE-TEST-001",
              blueprintId: 1,
              doctorId: 101,
              examType: "pre_test",
              status: "in_progress",
              startedAt: new Date(),
              questionSnapshots: [
                { id: 1, questionPrompt: "Q1", options: ["A", "B"], correctOptionIndex: 0 },
                { id: 2, questionPrompt: "Q2", options: ["A", "B"], correctOptionIndex: 1 },
                { id: 3, questionPrompt: "Q3", options: ["A", "B"], correctOptionIndex: 0 },
                { id: 4, questionPrompt: "Q4", options: ["A", "B"], correctOptionIndex: 1 },
              ],
            },
          ])
        )
        // Blueprint lookup
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 1,
              title: "Pre-Test Assessment",
              durationMinutes: 60,
              passingPercentage: "70.00",
            },
          ])
        )
        // Existing answers in examSessionAnswers
        .mockReturnValue(mockSelect([]));

      // Mock update
      mocks.db.update.mockReturnValue({
        set: () => ({
          where: () => Promise.resolve([]),
        }),
      });
      mocks.db.insert.mockReturnValue({
        values: () => Promise.resolve([]),
      });

      // Submit 3 correct answers out of 4 (75%)
      const res = await app.request("/doctor-cbt/cbt/session/10/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: {
            "1": 0, // correct
            "2": 1, // correct
            "3": 0, // correct
            "4": 0, // wrong (correct is 1)
          },
        }),
      });

      expect(res.status).toBe(200);
      const result = await res.json();
      expect(result.totalQuestions).toBe(4);
      expect(result.correctCount).toBe(3);
      expect(result.incorrectCount).toBe(1);
      expect(result.unansweredCount).toBe(0);
      expect(result.scorePercentage).toBe(75.0);
      expect(result.passed).toBe(true);
    });

    it("correctly handles unanswered questions with simple scoring", async () => {
      mocks.db.select
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 11,
              attemptNo: "DOC-CBT-EXIT-TEST-002",
              blueprintId: 2,
              doctorId: 101,
              examType: "exit_test",
              status: "in_progress",
              startedAt: new Date(),
              questionSnapshots: [
                { id: 1, questionPrompt: "Q1", options: ["A", "B"], correctOptionIndex: 0 },
                { id: 2, questionPrompt: "Q2", options: ["A", "B"], correctOptionIndex: 1 },
              ],
            },
          ])
        )
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 2,
              title: "Exit-Test Certification Exam",
              durationMinutes: 60,
              passingPercentage: "70.00",
            },
          ])
        )
        .mockReturnValue(mockSelect([]));

      mocks.db.update.mockReturnValue({
        set: () => ({
          where: () => Promise.resolve([]),
        }),
      });
      mocks.db.insert.mockReturnValue({
        values: () => Promise.resolve([]),
      });

      // Submit 1 correct, 1 unanswered -> 50%, below 70% passing threshold
      const res = await app.request("/doctor-cbt/cbt/session/11/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: {
            "1": 0, // correct
          },
        }),
      });

      expect(res.status).toBe(200);
      const result = await res.json();
      expect(result.totalQuestions).toBe(2);
      expect(result.correctCount).toBe(1);
      expect(result.unansweredCount).toBe(1);
      expect(result.scorePercentage).toBe(50.0);
      expect(result.passed).toBe(false);
    });

    it("PATCH /doctor-cbt/cbt/exams/:examType/status allows admin to enable or disable exams individually", async () => {
      mocks.db.update.mockReturnValueOnce({
        set: () => ({
          where: () => ({
            returning: () =>
              Promise.resolve([
                {
                  id: 1,
                  examType: "pre_test",
                  active: false,
                  durationMinutes: 20,
                },
              ]),
          }),
        }),
      });

      const res = await app.request("/doctor-cbt/cbt/exams/pre_test/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.examType).toBe("pre_test");
      expect(body.active).toBe(false);
      expect(body.message).toContain("disabled");
    });

    it("PATCH /doctor-cbt/cbt/exams/:examType/status allows admin to set duration of exam", async () => {
      mocks.db.update.mockReturnValueOnce({
        set: () => ({
          where: () => ({
            returning: () =>
              Promise.resolve([
                {
                  id: 1,
                  examType: "pre_test",
                  active: true,
                  durationMinutes: 20,
                },
              ]),
          }),
        }),
      });

      const res = await app.request("/doctor-cbt/cbt/exams/pre_test/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMinutes: 20 }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.examType).toBe("pre_test");
      expect(body.durationMinutes).toBe(20);
      expect(body.message).toContain("duration set to 20 minutes");
    });

    it("POST /doctor-cbt/cbt/start rejects when exam is disabled", async () => {
      // 1. handler -> getCurrentDoctorProfile
      mocks.db.select
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 101,
              fullName: "Dr. Test",
              status: "active",
            },
          ])
        )
        // 2. handler -> enrollment lookup
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 5,
              doctorId: 101,
              programId: 1,
            },
          ])
        )
        // 3. handler -> blueprint lookup returning active: false
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 2,
              title: "Exit-Test Certification Exam",
              examType: "exit_test",
              active: false,
            },
          ])
        );

      const res = await app.request("/doctor-cbt/cbt/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType: "exit_test" }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("disabled by administration");
    });

    it("strips option prefixes (A. B. C. D.) from questions and results", async () => {
      // Mock session lookup
      mocks.db.select
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 12,
              attemptNo: "DOC-CBT-PRE-TEST-003",
              blueprintId: 1,
              doctorId: 101,
              examType: "pre_test",
              status: "in_progress",
              startedAt: new Date(),
              questionSnapshots: [
                {
                  id: 1,
                  questionPrompt: "Q1",
                  options: [
                    "A. Failure to conceive after one month",
                    "B. Failure to achieve pregnancy after 12 months",
                    "C) Five years of marriage",
                    "(D) Absence of menstruation",
                  ],
                  correctOptionIndex: 1,
                },
              ],
            },
          ])
        )
        // Blueprint lookup
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 1,
              title: "Pre-Test Assessment",
              durationMinutes: 60,
              passingPercentage: "70.00",
            },
          ])
        )
        // Existing answers
        .mockReturnValue(mockSelect([]));

      mocks.db.update.mockReturnValue({
        set: () => ({
          where: () => Promise.resolve([]),
        }),
      });
      mocks.db.insert.mockReturnValue({
        values: () => Promise.resolve([]),
      });

      const res = await app.request("/doctor-cbt/cbt/session/12/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: { "1": 1 },
        }),
      });

      expect(res.status).toBe(200);
      const result = await res.json();
      expect(result.review[0].options[0]).toBe("Failure to conceive after one month");
      expect(result.review[0].options[1]).toBe("Failure to achieve pregnancy after 12 months");
      expect(result.review[0].options[2]).toBe("Five years of marriage");
      expect(result.review[0].options[3]).toBe("Absence of menstruation");
    });

    it("POST /doctor-cbt/cbt/start blocks retake by default when previous session is completed", async () => {
      // Simulate non-admin doctor candidate
      mocks.user = { id: "user-cand", role: "doctor_candidate", name: "Dr. Candidate", email: "cand@acme.test" };

      // 1. getCurrentDoctorProfile
      mocks.db.select
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 101,
              fullName: "Dr. Candidate",
              status: "active",
            },
          ])
        )
        // 2. enrollment lookup (retake not allowed)
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 5,
              doctorId: 101,
              programId: 1,
              preTestRetakeAllowed: false,
              exitTestRetakeAllowed: false,
            },
          ])
        )
        // 3. blueprint lookup (retakes locked by default)
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 1,
              title: "Pre-Test Assessment",
              examType: "pre_test",
              active: true,
              allowRetakes: false,
              durationMinutes: 20,
            },
          ])
        )
        // 4. in-progress session check (none)
        .mockReturnValueOnce(mockSelect([]))
        // 5. completed sessions check (found previous completed session!)
        .mockReturnValueOnce(mockSelect([{ id: 88, status: "completed" }]));

      const res = await app.request("/doctor-cbt/cbt/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType: "pre_test" }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Retakes are locked by default");
    });

    it("POST /doctor-cbt/cbt/candidates/:enrollmentId/allow-retake allows admin to authorize retake", async () => {
      mocks.user = { id: "user-1", role: "admin", name: "Dr. Admin", email: "admin@acme.test" };

      mocks.db.update.mockReturnValueOnce({
        set: () => ({
          where: () => ({
            returning: () =>
              Promise.resolve([
                {
                  id: 5,
                  preTestRetakeAllowed: true,
                },
              ]),
          }),
        }),
      });

      const res = await app.request("/doctor-cbt/cbt/candidates/5/allow-retake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType: "pre_test", allowed: true }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.allowed).toBe(true);
      expect(body.message).toContain("authorized");
    });

    it("shuffleArray performs an unbiased Fisher-Yates shuffle preserving all elements", () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = shuffleArray(original);

      // Same length
      expect(shuffled).toHaveLength(original.length);
      // All elements preserved
      expect([...shuffled].sort((a, b) => a - b)).toEqual(original);

      // Handles empty and 1-element arrays safely
      expect(shuffleArray([])).toEqual([]);
      expect(shuffleArray([42])).toEqual([42]);

      // Predictable with mock RNG
      const deterministic = shuffleArray([10, 20, 30], () => 0);
      expect(deterministic).toHaveLength(3);
      expect(deterministic.sort()).toEqual([10, 20, 30]);
    });

    it("POST /doctor-cbt/cbt/start generates randomized question sequence for every new test instance", async () => {
      mocks.user = { id: "cand-1", role: "doctor_candidate", name: "Dr. Random", email: "random@acme.test" };

      // 1. getCurrentDoctorProfile
      mocks.db.select
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 101,
              fullName: "Dr. Random",
              status: "active",
            },
          ])
        )
        // 2. enrollment lookup
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 5,
              doctorId: 101,
              programId: 1,
            },
          ])
        )
        // 3. blueprint lookup
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 1,
              title: "Pre-Test Assessment",
              examType: "pre_test",
              active: true,
              totalQuestions: 4,
              durationMinutes: 20,
            },
          ])
        )
        // 4. in-progress check (none)
        .mockReturnValueOnce(mockSelect([]))
        // 5. completed check (none)
        .mockReturnValueOnce(mockSelect([]))
        // 6. topics lookup
        .mockReturnValueOnce(mockSelect([{ id: 10 }]))
        // 7. questionBank lookup returning 4 questions
        .mockReturnValueOnce(
          mockSelect([
            { id: 101, code: "Q-01", questionPrompt: "Prompt 1", options: ["A", "B"], correctOptionIndex: 0 },
            { id: 102, code: "Q-02", questionPrompt: "Prompt 2", options: ["A", "B"], correctOptionIndex: 1 },
            { id: 103, code: "Q-03", questionPrompt: "Prompt 3", options: ["A", "B"], correctOptionIndex: 0 },
            { id: 104, code: "Q-04", questionPrompt: "Prompt 4", options: ["A", "B"], correctOptionIndex: 1 },
          ])
        );

      let savedSessionValues: any = null;
      mocks.db.insert.mockReturnValueOnce({
        values: (vals: any) => {
          savedSessionValues = vals;
          return {
            returning: () =>
              Promise.resolve([
                {
                  id: 99,
                  attemptNo: vals.attemptNo,
                  examType: "pre_test",
                  questionSnapshots: vals.questionSnapshots,
                },
              ]),
          };
        },
      });

      const res = await app.request("/doctor-cbt/cbt/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType: "pre_test" }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.sessionId).toBe(99);
      expect(body.questions).toHaveLength(4);

      // Verify questionSnapshots were saved in the database for this session instance
      expect(savedSessionValues).not.toBeNull();
      expect(savedSessionValues.questionSnapshots).toHaveLength(4);
      const savedIds = savedSessionValues.questionSnapshots.map((q: any) => q.id);
      expect([...savedIds].sort((a, b) => a - b)).toEqual([101, 102, 103, 104]);

      // Returned questions match the saved sequence and 1-based indices (1, 2, 3, 4)
      expect(body.questions.map((q: any) => q.id)).toEqual(savedIds);
      expect(body.questions.map((q: any) => q.index)).toEqual([1, 2, 3, 4]);
    });
  });

  describe("Doctor Candidate Self-Profile Management (PATCH /doctor-cbt/me/profile)", () => {
    it("PATCH /doctor-cbt/me/profile updates candidate profile and syncs user table", async () => {
      mocks.user = { id: "user-doc-1", role: "doctor_candidate", name: "Dr. Initial Name", email: "initial@hospital.test" };

      // 1. getCurrentDoctorProfile lookup
      mocks.db.select
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 55,
              userId: "user-doc-1",
              fullName: "Dr. Initial Name",
              email: "initial@hospital.test",
              mobile: "9000000001",
              status: "active",
            },
          ])
        )
        // 2. Email collision check in doctorProfiles (none)
        .mockReturnValueOnce(mockSelect([]))
        // 3. Email collision check in user table (none)
        .mockReturnValueOnce(mockSelect([]));

      // Mock update to user and doctorProfiles
      let updatedUserVals: any = null;
      let updatedProfileVals: any = null;
      mocks.db.update.mockImplementation(() => ({
        set: (vals: any) => ({
          where: () => {
            if (vals.fullName !== undefined || vals.nmcSmcNumber !== undefined) {
              updatedProfileVals = vals;
            } else {
              updatedUserVals = vals;
            }
            return {
              returning: () => Promise.resolve([{ id: 55, ...vals }]),
            };
          },
        }),
      }));

      const res = await app.request("/doctor-cbt/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Dr. Updated Name",
          email: "updated@hospital.test",
          mobile: "9876543210",
          nmcSmcNumber: "NMC-998877",
          qualifications: "MBBS, MS OBGY",
          primarySpecialty: "Reproductive Medicine",
          institutionName: "Acme Medical Center",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain("updated successfully");
      expect(updatedProfileVals.fullName).toBe("Dr. Updated Name");
      expect(updatedProfileVals.email).toBe("updated@hospital.test");
      expect(updatedProfileVals.nmcSmcNumber).toBe("NMC-998877");
    });

    it("PATCH /doctor-cbt/me/profile rejects email collision if already used by another doctor candidate", async () => {
      mocks.user = { id: "user-doc-1", role: "doctor_candidate", name: "Dr. Test", email: "test@hospital.test" };

      // 1. getCurrentDoctorProfile
      mocks.db.select
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 55,
              userId: "user-doc-1",
              fullName: "Dr. Test",
              email: "test@hospital.test",
              status: "active",
            },
          ])
        )
        // 2. Email collision check in doctorProfiles returns conflicting candidate
        .mockReturnValueOnce(
          mockSelect([
            {
              id: 99,
              email: "collision@hospital.test",
            },
          ])
        );

      const res = await app.request("/doctor-cbt/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "collision@hospital.test",
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("already registered to another doctor candidate");
    });
  });
});
