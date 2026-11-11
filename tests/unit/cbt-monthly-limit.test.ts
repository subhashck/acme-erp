import { describe, expect, it } from "vitest";
import { cbtCalendarMonthWindow } from "../../server/services/skill-assessment-engine";

describe("CBT calendar month in India time", () => {
  it.each([
    ["2026-10-15T12:00:00Z", "2026-09-30T18:30:00.000Z", "2026-10-31T18:30:00.000Z"],
    ["2026-10-31T18:29:59.999Z", "2026-09-30T18:30:00.000Z", "2026-10-31T18:30:00.000Z"],
    ["2026-10-31T18:30:00Z", "2026-10-31T18:30:00.000Z", "2026-11-30T18:30:00.000Z"],
    ["2026-12-31T18:30:00Z", "2026-12-31T18:30:00.000Z", "2027-01-31T18:30:00.000Z"],
    ["2028-02-29T12:00:00Z", "2028-01-31T18:30:00.000Z", "2028-02-29T18:30:00.000Z"],
  ])("finds the calendar window for %s", (instant, start, next) => {
    const window = cbtCalendarMonthWindow(new Date(instant));
    expect(window.start.toISOString()).toBe(start);
    expect(window.next.toISOString()).toBe(next);
  });
});
