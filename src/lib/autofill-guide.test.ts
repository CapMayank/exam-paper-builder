import { describe, expect, it } from "vitest";
import { autoFillPaper } from "./autofill";
import type { BlueprintDef } from "./blueprint";

const bp: BlueprintDef = {
  sections: [{ id: "a", title: "Section A", type: "MCQ", count: 2, marksEach: 1 }],
  chapters: [
    { chapterId: "X", marks: 1 },
    { chapterId: "Y", marks: 1 },
  ],
};

describe("auto-fill treats chapter targets as a preference", () => {
  it("fills every slot when the bank only has questions from one chapter", () => {
    const res = autoFillPaper(bp, [], [
      { id: "q1", chapterId: "X", type: "MCQ" },
      { id: "q2", chapterId: "X", type: "MCQ" },
    ]);
    expect(res.added.map((a) => a.questionId).sort()).toEqual(["q1", "q2"]);
    expect(res.unfilled).toEqual([]);
    expect(res.complete).toBe(true);
  });

  it("still prefers the under-covered chapter when the bank has both", () => {
    const res = autoFillPaper(bp, [], [
      { id: "q1", chapterId: "X", type: "MCQ" },
      { id: "q2", chapterId: "X", type: "MCQ" },
      { id: "q3", chapterId: "Y", type: "MCQ" },
    ]);
    expect(res.added.map((a) => a.chapterId).sort()).toEqual(["X", "Y"]);
  });

  it("never takes a question from a chapter the blueprint does not cover, even to fill a slot", () => {
    const res = autoFillPaper(bp, [], [
      { id: "q1", chapterId: "X", type: "MCQ" },
      { id: "q2", chapterId: "ELSEWHERE", type: "MCQ" },
    ]);
    expect(res.added.map((a) => a.questionId)).toEqual(["q1"]);
    expect(res.unfilled[0].count).toBe(1);
  });

  it("prefers a covered chapter that is over its target to an uncovered one", () => {
    const res = autoFillPaper(bp, [{ sectionId: "a", chapterId: "X", marks: 1 }, { sectionId: "a", chapterId: "X", marks: 1 }].slice(0, 1), [
      { id: "q1", chapterId: "X", type: "MCQ" },
      { id: "q2", chapterId: "ELSEWHERE", type: "MCQ" },
    ]);
    expect(res.added.map((a) => a.questionId)).toEqual(["q1"]);
  });

  it("does not place a question of the wrong type just to fill a slot", () => {
    const res = autoFillPaper(bp, [], [
      { id: "q1", chapterId: "X", type: "MCQ" },
      { id: "q2", chapterId: "X", type: "LONG" },
    ]);
    expect(res.added).toHaveLength(1);
    expect(res.unfilled[0].count).toBe(1);
  });
});
