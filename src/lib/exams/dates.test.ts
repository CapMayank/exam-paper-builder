import { describe, expect, it } from "vitest";
import { daysUntil, formatDMY, monthGrid, todayIST, weekdayName } from "./dates";

describe("todayIST", () => {
  it("is the next day just after midnight in India while UTC is still on the previous day", () => {
    expect(todayIST(new Date("2026-12-09T19:00:00Z"))).toBe("2026-12-10"); // 00:30 IST
  });
  it("stays on the same day late in the evening in India", () => {
    expect(todayIST(new Date("2026-12-10T18:00:00Z"))).toBe("2026-12-10"); // 23:30 IST
  });
});

describe("daysUntil", () => {
  it("counts whole days ahead", () => {
    expect(daysUntil("2026-12-10", "2026-11-26")).toBe(14);
  });
  it("is negative for a past date", () => {
    expect(daysUntil("2026-12-09", "2026-12-10")).toBe(-1);
  });
});

describe("weekdayName and formatDMY", () => {
  it("names the weekday of the reference date sheet's dates", () => {
    expect(weekdayName("2026-12-10")).toBe("Thursday");
    expect(weekdayName("2026-12-12")).toBe("Saturday");
  });
  it("prints DD/MM/YYYY", () => {
    expect(formatDMY("2026-12-21")).toBe("21/12/2026");
  });
});

describe("monthGrid", () => {
  it("lays out Monday-first weeks for each month with an exam date", () => {
    const g = monthGrid(["2026-12-10", "2026-12-23"]);
    expect(g).toHaveLength(1);
    expect(g[0].month).toBe("December 2026");
    expect(g[0].weeks[1]).toContain("2026-12-10");
    expect(g[0].weeks.every((w) => w.length === 7)).toBe(true);
    expect(g[0].weeks[0][0]).toBeNull(); // 1 Dec 2026 is a Tuesday
    expect(g[0].weeks[0][1]).toBe("2026-12-01");
  });
  it("spans two months when an exam crosses the month end", () => {
    expect(monthGrid(["2027-01-02", "2026-12-30"]).map((m) => m.month)).toEqual(["December 2026", "January 2027"]);
  });
  it("is empty without dates", () => {
    expect(monthGrid([])).toEqual([]);
  });
});
