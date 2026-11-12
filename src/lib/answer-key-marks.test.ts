import { describe, expect, it } from "vitest";
import { questionSlotMarks } from "./blueprint";
import { answerKeyMarks } from "./marksDisplay";

const parts = (n: number, marks: number) =>
  Array.from({ length: n }, (_, i) => ({ label: `(${i + 1})`, text: `part ${i + 1}`, marks }));

describe("answer key totals", () => {
  it("questionSlotMarks counts one of four 5-mark parts as 5", () => {
    const section = { type: "LONG", count: 1, marksEach: 5 };
    const q = { type: "LONG", subparts: parts(4, 5), attemptCount: 1 };
    expect(questionSlotMarks(section, q).marks).toBe(5);
  });

  it("answerKeyMarks gives 5 for any 1 of 4 five-mark parts", () => {
    const section = { type: "LONG", count: 1, marksEach: 5 };
    const q = { type: "LONG", subparts: parts(4, 5), attemptCount: 1 };
    expect(answerKeyMarks(section, q)).toBe(5);
  });

  it("answerKeyMarks gives 8 for any 4 of 5 two-mark parts in an 8-mark slot", () => {
    const section = { type: "LONG", count: 1, marksEach: 8 };
    const q = { type: "LONG", subparts: parts(5, 2), attemptCount: 4 };
    expect(answerKeyMarks(section, q)).toBe(8);
  });

  it("answerKeyMarks sums all parts when all are compulsory", () => {
    const section = { type: "LONG", count: 1, marksEach: 8 };
    const q = { type: "LONG", subparts: parts(4, 2) };
    expect(answerKeyMarks(section, q)).toBe(8);
  });
});
