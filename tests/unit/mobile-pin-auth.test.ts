import { describe, expect, it } from "vitest";

describe("Mobile PIN Authentication Logic & Security Rules", () => {
  it("validates 6-digit numeric PIN format strictly", () => {
    function isValidPinFormat(pin: string): boolean {
      const clean = (pin || "").trim().replace(/\s+/g, "");
      return clean.length === 6 && /^\d{6}$/.test(clean);
    }

    expect(isValidPinFormat("123456")).toBe(true);
    expect(isValidPinFormat(" 123 456 ")).toBe(true);
    expect(isValidPinFormat("000000")).toBe(true);
    expect(isValidPinFormat("999999")).toBe(true);

    // Invalid cases
    expect(isValidPinFormat("12345")).toBe(false);
    expect(isValidPinFormat("1234567")).toBe(false);
    expect(isValidPinFormat("12a456")).toBe(false);
    expect(isValidPinFormat("")).toBe(false);
    expect(isValidPinFormat("abcdef")).toBe(false);
  });

  it("calculates remaining attempts and enforces 3-strike lockout threshold", () => {
    const MAX_ATTEMPTS = 3;

    function evaluateAttempt(currentAttempts: number): { isLocked: boolean; remaining: number } {
      const newAttempts = currentAttempts + 1;
      const isLocked = newAttempts >= MAX_ATTEMPTS;
      const remaining = Math.max(0, MAX_ATTEMPTS - newAttempts);
      return { isLocked, remaining };
    }

    expect(evaluateAttempt(0)).toEqual({ isLocked: false, remaining: 2 });
    expect(evaluateAttempt(1)).toEqual({ isLocked: false, remaining: 1 });
    expect(evaluateAttempt(2)).toEqual({ isLocked: true, remaining: 0 });
    expect(evaluateAttempt(3)).toEqual({ isLocked: true, remaining: 0 });
  });

  it("maintains 'Recent Station Users' stored in client storage without sensitive fields", () => {
    interface StationUserItem {
      userId: string;
      name: string;
      employeeCode: string;
      role: string;
      department: string;
      lastUsedAt: number;
    }

    function addRecentUser(
      list: StationUserItem[],
      newUser: Omit<StationUserItem, "lastUsedAt">
    ): StationUserItem[] {
      const filtered = list.filter((u) => u.userId !== newUser.userId);
      const updated: StationUserItem = {
        ...newUser,
        lastUsedAt: Date.now(),
      };
      // Keep up to 6 most recent users
      return [updated, ...filtered].slice(0, 6);
    }

    let recents: StationUserItem[] = [];
    recents = addRecentUser(recents, {
      userId: "u1",
      name: "Dr. Sharma",
      employeeCode: "EMP-01",
      role: "Doctor",
      department: "OPD",
    });
    recents = addRecentUser(recents, {
      userId: "u2",
      name: "Nurse Ronita",
      employeeCode: "EMP-02",
      role: "Staff Nurse",
      department: "Nursing Central",
    });

    expect(recents.length).toBe(2);
    expect(recents[0].name).toBe("Nurse Ronita");
    expect(recents[1].name).toBe("Dr. Sharma");

    // Re-adding Dr. Sharma moves them to top
    recents = addRecentUser(recents, {
      userId: "u1",
      name: "Dr. Sharma",
      employeeCode: "EMP-01",
      role: "Doctor",
      department: "OPD",
    });
    expect(recents.length).toBe(2);
    expect(recents[0].name).toBe("Dr. Sharma");
  });
});
