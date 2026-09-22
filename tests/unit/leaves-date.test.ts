import { describe, it, expect } from "vitest";
import { formatDate } from "../../src/utils/format";
import { leaveRequestInput } from "../../server/routes/shared";

describe("Leave Date Datatype & Formatting", () => {
  describe("formatDate", () => {
    it("formats YYYY-MM-DD string accurately without timezone shift", () => {
      expect(formatDate("2026-09-08")).toBe("08 Sept 2026");
      expect(formatDate("2026-01-01")).toBe("01 Jan 2026");
      expect(formatDate("2026-12-31")).toBe("31 Dec 2026");
    });

    it("handles null or empty date gracefully", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDate(undefined)).toBe("—");
      expect(formatDate("")).toBe("—");
    });
  });

  describe("leaveRequestInput schema validation", () => {
    it("accepts valid YYYY-MM-DD dates", () => {
      const parsed = leaveRequestInput.parse({
        staffId: 1,
        leaveType: "Casual Leave",
        isHalfDay: false,
        startDate: "2026-09-08",
        endDate: "2026-09-10",
        reason: "Personal work",
      });
      expect(parsed.startDate).toBe("2026-09-08");
      expect(parsed.endDate).toBe("2026-09-10");
    });

    it("accepts ISO datetime strings by extracting date part", () => {
      const parsed = leaveRequestInput.parse({
        staffId: 1,
        leaveType: "Casual Leave",
        isHalfDay: false,
        startDate: "2026-09-08T00:00:00.000Z",
        endDate: "2026-09-10T00:00:00.000Z",
        reason: "Personal work",
      });
      expect(parsed.startDate).toBe("2026-09-08");
      expect(parsed.endDate).toBe("2026-09-10");
    });

    it("accepts half day leave when startDate equals endDate", () => {
      const parsed = leaveRequestInput.parse({
        staffId: 1,
        leaveType: "Sick Leave",
        isHalfDay: true,
        startDate: "2026-09-08",
        endDate: "2026-09-08",
        reason: "Doctor appointment",
      });
      expect(parsed.isHalfDay).toBe(true);
      expect(parsed.startDate).toBe("2026-09-08");
      expect(parsed.endDate).toBe("2026-09-08");
    });

    it("rejects half day leave when startDate does not equal endDate", () => {
      expect(() =>
        leaveRequestInput.parse({
          staffId: 1,
          leaveType: "Sick Leave",
          isHalfDay: true,
          startDate: "2026-09-08",
          endDate: "2026-09-09",
          reason: "Doctor appointment",
        })
      ).toThrow();
    });

    it("rejects when endDate is before startDate", () => {
      expect(() =>
        leaveRequestInput.parse({
          staffId: 1,
          leaveType: "Casual Leave",
          isHalfDay: false,
          startDate: "2026-09-10",
          endDate: "2026-09-08",
          reason: "Travel",
        })
      ).toThrow();
    });
  });
});
