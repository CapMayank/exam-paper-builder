import { describe, expect, it } from "vitest";
import { questionSlotMarks, subpartsMarksProblem } from "./blueprint";
import { formatMarksLabel } from "./constants";
import { questionSchema } from "./schemas";
import { decomposeForSlot } from "./subpartExtractor";
import {
  equalPartMarks,
  formatMarksValue,
  normalizeSubpartMarks,
  snapPartMarks,
  splitMarksEvenly,
  subpartsTotalMarks,
  validateSubPartsSum,
} from "./types";

const FILL_BLANKS = "Fill in the blanks:\n(i) The sun rises in the ____.\n(ii) Water boils at ____ °C.\n(iii) A triangle has ____ sides.\n(iv) India's capital is ____.";

describe("parts of a small question share its marks", () => {
  it("gives four blanks typed into a 2-mark question ½ mark each, not 1", () => {
    const parts = decomposeForSlot(FILL_BLANKS, 2)!.subparts;
    expect(parts.map((p) => p.marks)).toEqual([0.5, 0.5, 0.5, 0.5]);
    expect(questionSlotMarks({ count: 5, marksEach: 2 }, { type: "FILL_BLANK", subparts: parts }).marks).toBe(2);
  });

  it("keeps whole marks where they fit and prints nothing where the share is not a quarter mark", () => {
    expect(decomposeForSlot(FILL_BLANKS, 4)!.subparts.every((p) => p.marks === 1)).toBe(true);
    expect(decomposeForSlot(FILL_BLANKS, 1)!.subparts.every((p) => p.marks === 0.25)).toBe(true);
    // 3 marks over 4 parts is ¾ each; 2 marks over 3 parts has no clean share, and unknown marks print none
    expect(decomposeForSlot(FILL_BLANKS, 3)!.subparts[0].marks).toBe(0.75);
    expect(decomposeForSlot("Answer:\n(i) one\n(ii) two\n(iii) three", 2)!.subparts[0].marks).toBe(0);
    expect(decomposeForSlot(FILL_BLANKS)!.subparts[0].marks).toBe(0);
  });

  it("shares over the parts answered when the stem says 'any N'", () => {
    const d = decomposeForSlot("Answer any two of the following:\n(i) a\n(ii) b\n(iii) c\n(iv) d", 1)!;
    expect(d.attemptCount).toBe(2);
    expect(d.subparts.map((p) => p.marks)).toEqual([0.5, 0.5, 0.5, 0.5]);
  });

  it("splits and formats quarter marks", () => {
    expect(equalPartMarks(2, 4)).toBe(0.5);
    expect(equalPartMarks(2, 3)).toBeNull();
    expect(splitMarksEvenly(2, 3)).toEqual([0.5, 0.75, 0.75]);
    expect(splitMarksEvenly(5, 4)).toEqual([1.25, 1.25, 1.25, 1.25]);
    expect(splitMarksEvenly(1, 8)).toBeNull();
    expect(snapPartMarks("0.5")).toBe(0.5);
    expect(snapPartMarks(0.1)).toBe(0.25);
    expect(snapPartMarks("")).toBe(0);
    expect([0.5, 0.25, 1.5, 2, 2.75].map(formatMarksValue)).toEqual(["½", "¼", "1½", "2", "2¾"]);
    expect(formatMarksLabel(0.5, "en")).toBe("[½ Mark]");
    expect(formatMarksLabel(1.5, "en")).toBe("[1½ Marks]");
    expect(formatMarksLabel(0.5, "hi")).toBe("[½ अंक]");
  });

  it("accepts half-mark parts end to end and still rejects a wrong total", () => {
    const half = Array.from({ length: 4 }, (_, i) => ({ label: `(${i + 1})`, text: "blank", marks: 0.5 }));
    expect(validateSubPartsSum(half, 2)).toBe(true);
    expect(subpartsMarksProblem({ marksEach: 2 }, { subparts: half })).toBeNull();
    expect(subpartsMarksProblem({ marksEach: 3 }, { subparts: half })).toMatch(/must match section marks \(3\)/);
    const base = { bookId: "b", chapterId: "c", type: "FILL_BLANK", text: "Fill in the blanks:" };
    expect(questionSchema.safeParse({ ...base, subparts: half }).success).toBe(true);
    expect(questionSchema.safeParse({ ...base, subparts: [{ ...half[0], marks: 0.3 }] }).success).toBe(false);
    expect(questionSchema.safeParse({ ...base, subparts: [{ ...half[0], marks: 0 }] }).success).toBe(false);
  });

  it("normalises generated parts into fractions when there are more parts than marks", () => {
    const four = Array.from({ length: 4 }, () => ({ marks: 1 }));
    expect(normalizeSubpartMarks(four, 2).map((p) => p.marks)).toEqual([0.5, 0.5, 0.5, 0.5]);
    // any 2 of 4 in a 1-mark slot: each answered part is worth ½
    expect(normalizeSubpartMarks(four, 1, 2).map((p) => p.marks)).toEqual([0.5, 0.5, 0.5, 0.5]);
    // unchanged behaviour when whole marks fit
    expect(normalizeSubpartMarks([{ marks: 1 }, { marks: 1 }, { marks: 1 }], 5).map((p) => p.marks)).toEqual([1, 1, 3]);
  });
});

describe("normalising parts keeps quarter marks and exact totals", () => {
  const onGrid = (m: number) => Math.abs(m / 0.25 - Math.round(m / 0.25)) < 1e-9;

  it("shares a 2-mark total over four parts as ½ each", () => {
    const four = [{ marks: 1 }, { marks: 1 }, { marks: 1 }, { marks: 1 }];
    expect(normalizeSubpartMarks(four, 2).map((p) => p.marks)).toEqual([0.5, 0.5, 0.5, 0.5]);
  });

  it("keeps a fractional total of 1½ without pushing parts up to a whole mark", () => {
    const result = normalizeSubpartMarks([{ marks: 0.5 }, { marks: 0.5 }], 1.5);
    expect(subpartsTotalMarks(result as never)).toBe(1.5);
    for (const p of result) {
      expect(onGrid(p.marks)).toBe(true);
      expect(p.marks).toBeGreaterThanOrEqual(0.25);
    }
  });

  it("adjusts the leaf parts of a nested part so the total is exact", () => {
    const result = normalizeSubpartMarks([{ marks: 1, subparts: [{ marks: 1 }, { marks: 1 }] }, { marks: 1 }], 4);
    expect(subpartsTotalMarks(result as never)).toBe(4);
    // the nested part last: its own marks are ignored by the total, so its leaves must change
    const up = normalizeSubpartMarks([{ marks: 1 }, { marks: 1, subparts: [{ marks: 1 }, { marks: 1 }] }], 4);
    expect(subpartsTotalMarks(up as never)).toBe(4);
    const down = normalizeSubpartMarks([{ marks: 1 }, { marks: 9, subparts: [{ marks: 2 }, { marks: 2 }] }], 3);
    expect(subpartsTotalMarks(down as never)).toBe(3);
    for (const p of down[1].subparts!) expect(p.marks).toBeGreaterThanOrEqual(0.25);
  });

  it("makes unequal \"any k of n\" parts equal at total ÷ k", () => {
    const result = normalizeSubpartMarks([{ marks: 2 }, { marks: 3 }, { marks: 2 }, { marks: 3 }], 5, 2);
    expect(result.map((p) => p.marks)).toEqual([2.5, 2.5, 2.5, 2.5]);
    expect(validateSubPartsSum(result, 5, 2)).toBe(true);
  });

  it("never changes a part when the total is already right", () => {
    const parts = [{ marks: 0.25 }, { marks: 0.75 }, { marks: 0.5 }];
    expect(normalizeSubpartMarks(parts, 1.5)).toEqual(parts);
  });
});
