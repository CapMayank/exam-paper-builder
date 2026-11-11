import { describe, expect, it } from "vitest";
import { diagnosePaperImplications, paperStatus, whyCannotAdd, type BlueprintDef, type PlacedItem } from "./blueprint";
import { finaliseBlocker } from "./papers";
import { validatePaperPreflight } from "./preflight";

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

describe("finalising and preflight treat chapters as information", () => {
  const paper = (complete: boolean, chapters: Array<{ chapterId: string; target: number; used: number }>) =>
    ({
      id: "p",
      examDate: "15/03/2026",
      generalInstructions: "All questions compulsory.",
      progress: { complete, usedMarks: 5, totalMarks: 5, chapters },
      blueprint: {
        name: "BP",
        book: { className: "Class 8", subject: "Science" },
        sections: [{ id: "s", count: 1, marksEach: 5, type: "LONG", title: "Section A" }],
        chapters: [{ chapterId: "c1", marks: 5 }, { chapterId: "c2", marks: 0 }],
      },
      items: [],
    }) as never;

  it("lets a paper with full sections and uneven chapters be finalised, with one info note", () => {
    const report = validatePaperPreflight(paper(true, [{ chapterId: "c1", target: 5, used: 1 }, { chapterId: "c2", target: 0, used: 4 }]));
    expect(report.canFinalize).toBe(true);
    const note = report.info.filter((i) => i.code === "CHAPTER_COVERAGE");
    expect(note).toHaveLength(1);
    expect(note[0].message).toBe("Chapter coverage differs from the blueprint for 2 chapter(s). This does not stop finalising.");
  });

  it("adds no coverage note when every chapter is on target", () => {
    const report = validatePaperPreflight(paper(true, [{ chapterId: "c1", target: 5, used: 5 }]));
    expect(report.info.some((i) => i.code === "CHAPTER_COVERAGE")).toBe(false);
  });

  it("still blocks while a section has an empty slot", () => {
    const report = validatePaperPreflight(paper(false, []));
    expect(report.errors.some((e) => e.code === "BLUEPRINT_INCOMPLETE")).toBe(true);
  });

  it("finaliseBlocker ignores chapter warnings", () => {
    const view = {
      progress: { complete: true },
      internalChoiceAudit: null,
      implications: [{ code: "CHAPTER_EXCESS", severity: "warning", message: "" }, { code: "CHAPTER_OUTSIDE_BLUEPRINT", severity: "warning", message: "" }],
    } as never;
    expect(finaliseBlocker(view)).toBeNull();
  });
});
