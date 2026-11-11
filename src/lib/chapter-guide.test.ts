import { describe, expect, it } from "vitest";
import { diagnosePaperImplications, paperStatus, whyCannotAdd, type BlueprintDef, type PlacedItem } from "./blueprint";

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
const one = (chapterId: string): PlacedItem => ({ sectionId: "obj", chapterId, marks: 1 });

describe("chapter weightage is a guide, never a gate", () => {
  it("adds a question from a chapter that is already over its target", () => {
    const items = [one("Z"), one("Z"), one("Z")];
    expect(whyCannotAdd(bp, items, { sectionId: "obj", chapterId: "Z", type: "MCQ", marks: 1 })).toBeNull();
  });

  it("adds a question whose chapter the blueprint does not list", () => {
    expect(whyCannotAdd(bp, [], { sectionId: "obj", chapterId: "NOT_LISTED", type: "MCQ", marks: 1 })).toBeNull();
  });

  it("adds a 5-mark question when no chapter has 5 marks to spare", () => {
    const items = [one("X"), one("X"), one("Y"), one("Y"), one("Z")];
    expect(whyCannotAdd(bp, items, { sectionId: "long", chapterId: "Z", type: "LONG", marks: 5 })).toBeNull();
  });

  it("still refuses a full section and a wrong type", () => {
    const full = [one("X"), one("X"), one("X"), one("X"), one("X")];
    expect(whyCannotAdd(bp, full, { sectionId: "obj", chapterId: "Y", type: "MCQ", marks: 1 })).toMatch(/already full/);
    expect(whyCannotAdd(bp, [], { sectionId: "obj", chapterId: "Y", type: "LONG", marks: 1 })).toMatch(/only accepts/);
  });

  it("is complete when sections are full, whatever the chapter spread", () => {
    const items = [one("Z"), one("Z"), one("Z"), one("Z"), one("Z"), { sectionId: "long", chapterId: "Z", marks: 5 }];
    const st = paperStatus(bp, items);
    expect(st.complete).toBe(true);
    expect(st.chapters.find((c) => c.chapterId === "Z")).toMatchObject({ target: 2, used: 10 });
  });

  it("is not complete while a section has an empty slot", () => {
    expect(paperStatus(bp, [one("X")]).complete).toBe(false);
  });

  it("shares a unit's numbers and never blocks on them", () => {
    const units: BlueprintDef = {
      sections: bp.sections,
      chapters: [
        { chapterId: "A1", marks: 1, unitKey: "u" },
        { chapterId: "A2", marks: 1, unitKey: "u" },
        { chapterId: "B", marks: 8 },
      ],
    };
    const items = [one("A1"), one("A1"), one("A2")];
    expect(whyCannotAdd(units, items, { sectionId: "obj", chapterId: "A2", type: "MCQ", marks: 1 })).toBeNull();
    expect(paperStatus(units, items).chapters.find((c) => c.chapterId === "A2")).toMatchObject({ target: 2, used: 3 });
  });

  it("reports chapter gaps and outside-blueprint questions as warnings", () => {
    const imps = diagnosePaperImplications({ sections: bp.sections, chapters: bp.chapters }, [
      { id: "i1", sectionId: "obj", chapterId: "NOT_LISTED", type: "MCQ" },
      { id: "i2", sectionId: "obj", chapterId: "Z", type: "MCQ" },
    ]);
    expect(imps.find((i) => i.code === "CHAPTER_OUTSIDE_BLUEPRINT")).toMatchObject({ severity: "warning", details: { count: 1 } });
    const chapterGaps = imps.filter((i) => i.code === "CHAPTER_EXCESS" || i.code === "CHAPTER_DEFICIT");
    expect(chapterGaps.length).toBeGreaterThan(0);
    expect(chapterGaps.every((i) => i.severity === "warning")).toBe(true);
  });
});
