import { describe, expect, it } from "vitest";
import { chaptersOpenForSlot, whyCannotAdd, type BlueprintDef, type PlacedItem } from "./blueprint";

// A paper whose only 5-mark question must come from chapter X: X is the only chapter with 5 marks.
const bp: BlueprintDef = {
  sections: [
    { id: "obj", title: "Section A", type: "MCQ", count: 5, marksEach: 1 },
    { id: "long", title: "Section D", type: "LONG", count: 1, marksEach: 5 },
  ],
  chapters: [
    { chapterId: "X", marks: 5 },
    { chapterId: "Y", marks: 3 },
    { chapterId: "Z", marks: 2 },
  ],
};

const mcq = (chapterId: string) => ({ sectionId: "obj", chapterId, type: "MCQ", marks: 1 });
const placedMcq = (chapterId: string): PlacedItem => ({ sectionId: "obj", chapterId, marks: 1 });

describe("placements must not strand chapter marks that later questions need", () => {
  it("refuses a 1-mark question from the only chapter that can host the 5-mark question", () => {
    const why = whyCannotAdd(bp, [], mcq("X"));
    expect(why).toMatch(/different chapter/i);
  });

  it("still allows 1-mark questions from the chapters that cannot host the 5-mark question", () => {
    expect(whyCannotAdd(bp, [], mcq("Y"))).toBeNull();
    expect(whyCannotAdd(bp, [placedMcq("Y"), placedMcq("Y"), placedMcq("Y")], mcq("Z"))).toBeNull();
  });

  it("allows the 5-mark question in X at any point", () => {
    expect(whyCannotAdd(bp, [placedMcq("Y")], { sectionId: "long", chapterId: "X", type: "LONG", marks: 5 })).toBeNull();
  });

  it("does not add a new refusal to a paper that is already stranded", () => {
    // an older paper: X already gave a mark away, so the 5-mark slot can no longer be filled exactly
    const stranded = [placedMcq("X")];
    expect(whyCannotAdd(bp, stranded, mcq("Y"))).toBeNull();
    expect(whyCannotAdd(bp, stranded, mcq("X"))).toBeNull();
  });

  it("does not interfere when sections and chapter weightage do not add up to the same total", () => {
    const uneven: BlueprintDef = { ...bp, chapters: [...bp.chapters, { chapterId: "W", marks: 4 }] };
    expect(whyCannotAdd(uneven, [], mcq("X"))).toBeNull();
  });

  it("shares a unit's quota when looking ahead", () => {
    const units: BlueprintDef = {
      sections: bp.sections,
      chapters: [
        { chapterId: "X1", marks: 3, unitKey: "u" },
        { chapterId: "X2", marks: 2, unitKey: "u" },
        { chapterId: "Y", marks: 3 },
        { chapterId: "Z", marks: 2 },
      ],
    };
    expect(whyCannotAdd(units, [], mcq("X2"))).toMatch(/different chapter/i);
    expect(whyCannotAdd(units, [], { sectionId: "long", chapterId: "X2", type: "LONG", marks: 5 })).toBeNull();
  });

  it("lists the chapters a slot may be filled from", () => {
    expect(chaptersOpenForSlot(bp, [], "obj").sort()).toEqual(["Y", "Z"]);
    expect(chaptersOpenForSlot(bp, [], "long")).toEqual(["X"]);
    // stranded paper: no chapter has 5 marks free
    expect(chaptersOpenForSlot(bp, [placedMcq("X")], "long")).toEqual([]);
  });
});

describe("replacing or editing a question already on the paper", () => {
  it("never refuses a swap that keeps the same chapter and marks, even on a paper that is over its quota", () => {
    // the blueprint was edited after the paper was built: Z now allows 2 marks but carries 3
    const over = [placedMcq("Z"), placedMcq("Z")];
    const current = placedMcq("Z");
    expect(whyCannotAdd(bp, over, mcq("Z"))).toMatch(/allows only 2 marks/);
    expect(whyCannotAdd(bp, over, mcq("Z"), { replaces: current })).toBeNull();
  });

  it("lets a stranded paper swap a question for one from another chapter", () => {
    // X gave a mark away, so the paper as it stands cannot be finished; moving that mark to Y repairs it
    expect(whyCannotAdd(bp, [], mcq("Y"), { replaces: placedMcq("X") })).toBeNull();
  });

  it("refuses a swap that would strand a paper that can still be finished", () => {
    expect(whyCannotAdd(bp, [], mcq("X"), { replaces: placedMcq("Y") })).toMatch(/different chapter/i);
  });
});
