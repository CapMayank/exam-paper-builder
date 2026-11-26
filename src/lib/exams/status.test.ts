import { describe, expect, it } from "vitest";
import { dayRollups, examSummary, slotStatus, slotWarnings } from "./status";
import type { SlotPaper, SlotView } from "./types";

const draft: SlotPaper = { id: "p1", title: "Maths", status: "DRAFT", updatedAt: "2026-12-01T10:00:00.000Z" };
const final: SlotPaper = { ...draft, status: "FINAL" };

function slot(over: Partial<SlotView>): SlotView {
  return {
    id: Math.random().toString(36).slice(2),
    blockId: "b1",
    className: "Class 10",
    subject: "Maths",
    examDate: "2026-12-10",
    paper: null,
    hasBlueprint: true,
    printedAt: null,
    printedByName: null,
    printedPaperAt: null,
    dateChangedAfterPrint: false,
    status: "NO_PAPER",
    warnings: [],
    ...over,
  };
}

describe("slotStatus", () => {
  it("is NO_BLUEPRINT without a paper or a blueprint", () => {
    expect(slotStatus({ paper: null, hasBlueprint: false, printedAt: null })).toBe("NO_BLUEPRINT");
  });
  it("is NO_PAPER when a blueprint exists but no paper is linked", () => {
    expect(slotStatus({ paper: null, hasBlueprint: true, printedAt: null })).toBe("NO_PAPER");
  });
  it("follows the paper's draft and final state", () => {
    expect(slotStatus({ paper: draft, hasBlueprint: true, printedAt: null })).toBe("DRAFT");
    expect(slotStatus({ paper: final, hasBlueprint: true, printedAt: null })).toBe("FINAL");
  });
  it("is PRINTED once marked printed, even if the paper was reopened or deleted", () => {
    expect(slotStatus({ paper: final, hasBlueprint: true, printedAt: "2026-12-02T00:00:00Z" })).toBe("PRINTED");
    expect(slotStatus({ paper: draft, hasBlueprint: true, printedAt: "2026-12-02T00:00:00Z" })).toBe("PRINTED");
    expect(slotStatus({ paper: null, hasBlueprint: false, printedAt: "2026-12-02T00:00:00Z" })).toBe("PRINTED");
  });
});

describe("slotWarnings", () => {
  it("flags a paper changed after it was printed", () => {
    const paper = { ...draft, updatedAt: "2026-12-05T00:00:00.000Z" };
    expect(slotWarnings({ paper, printedAt: "2026-12-02T00:00:00Z", printedPaperAt: "2026-12-01T10:00:00.000Z", dateChangedAfterPrint: false })).toEqual([
      "PAPER_CHANGED_AFTER_PRINT",
    ]);
  });
  it("does not flag a paper unchanged since printing", () => {
    expect(slotWarnings({ paper: final, printedAt: "2026-12-02T00:00:00Z", printedPaperAt: final.updatedAt, dateChangedAfterPrint: false })).toEqual([]);
  });
  it("flags a moved date after printing", () => {
    expect(slotWarnings({ paper: final, printedAt: "2026-12-02T00:00:00Z", printedPaperAt: final.updatedAt, dateChangedAfterPrint: true })).toEqual([
      "DATE_CHANGED_AFTER_PRINT",
    ]);
  });
  it("has nothing to say about an unprinted slot or a deleted paper", () => {
    expect(slotWarnings({ paper: draft, printedAt: null, printedPaperAt: null, dateChangedAfterPrint: false })).toEqual([]);
    expect(slotWarnings({ paper: null, printedAt: "2026-12-02T00:00:00Z", printedPaperAt: "2026-12-01T10:00:00.000Z", dateChangedAfterPrint: false })).toEqual([]);
  });
});

describe("dayRollups", () => {
  const day = [
    slot({ status: "PRINTED" }),
    slot({ status: "FINAL" }),
    slot({ status: "DRAFT" }),
    slot({ status: "NO_PAPER", examDate: "2026-12-12" }),
  ];
  it("splits each day into printed, final-not-printed and not ready", () => {
    expect(dayRollups(day, "2026-12-08")[0]).toEqual({ date: "2026-12-10", total: 3, printed: 1, finalNotPrinted: 1, notReady: 1, urgent: true });
  });
  it("sorts days by date", () => {
    expect(dayRollups([...day].reverse(), "2026-12-01").map((d) => d.date)).toEqual(["2026-12-10", "2026-12-12"]);
  });
  it("is not urgent more than three days out, or once the day has passed", () => {
    expect(dayRollups(day, "2026-12-01")[0].urgent).toBe(false);
    expect(dayRollups(day, "2026-12-11")[0].urgent).toBe(false);
  });
  it("is not urgent when everything is ready", () => {
    expect(dayRollups([slot({ status: "FINAL" })], "2026-12-09")[0].urgent).toBe(false);
  });
  it("is empty for no slots", () => {
    expect(dayRollups([], "2026-12-01")).toEqual([]);
  });
});

describe("examSummary", () => {
  it("counts ready (final or printed) and printed papers and the days to the first exam", () => {
    const s = examSummary(
      [slot({ status: "PRINTED", examDate: "2026-12-12" }), slot({ status: "FINAL" }), slot({ status: "DRAFT", examDate: "2026-12-23" })],
      "2026-11-26",
    );
    expect(s).toEqual({ total: 3, ready: 2, printed: 1, firstDate: "2026-12-10", lastDate: "2026-12-23", daysToFirst: 14, isPast: false });
  });
  it("is past once the last date is before today", () => {
    expect(examSummary([slot({ examDate: "2026-12-10" })], "2026-12-11").isPast).toBe(true);
  });
  it("handles an exam with no slots", () => {
    expect(examSummary([], "2026-12-01")).toEqual({ total: 0, ready: 0, printed: 0, firstDate: null, lastDate: null, daysToFirst: null, isPast: false });
  });
});
