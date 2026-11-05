import { describe, expect, it } from "vitest";
import { validateBlueprint } from "./blueprint";
import { buildSetupInput, classLevel, matchSectionIds, presetsForBook, presetTotals, suggestPreset } from "./blueprintSetupPlan";
import { builtInBlueprintPresets } from "./presets";

const presets = builtInBlueprintPresets();
const chapters = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `c${i + 1}` }));

describe("which pattern suits a book", () => {
  it("reads the class level", () => {
    expect(classLevel("Class 8")).toBe(8);
    expect(classLevel("LKG")).toBeNull();
  });

  it("offers the school pattern for Classes 1–8 and nothing for pre-primary", () => {
    const offered = presetsForBook(presets, { className: "Class 6", subject: "English" });
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.every((p) => p.classFrom <= 6 && p.classTo >= 6)).toBe(true);
    expect(presetsForBook(presets, { className: "LKG", subject: "English" })).toEqual([]);
  });

  it("prefers the board's own pattern for the subject in Classes 9–12", () => {
    const s = suggestPreset(presets, { className: "Class 10", subject: "Science" });
    expect(s).not.toBeNull();
    expect(s!.archetype).not.toBe("SCHOOL");
    expect(s!.subjectName?.toLowerCase()).toContain("science");
  });

  it("picks the closest-named board pattern, so Mathematics Basic is not given Standard", () => {
    expect(suggestPreset(presets, { className: "Class 10", subject: "Mathematics Basic" })!.title).toMatch(/Basic/);
    expect(suggestPreset(presets, { className: "Class 10", subject: "Mathematics Standard" })!.title).toMatch(/Standard/);
  });
});

describe("the blueprint a pattern makes", () => {
  it("is valid, carries the exam and gives English its grammar and passage forms", () => {
    const preset = suggestPreset(presets, { className: "Class 6", subject: "English" })!;
    const input = buildSetupInput(preset, { id: "b1", className: "Class 6", subject: "English", chapters: chapters(8) }, {
      examType: "HALF_YEARLY",
      academicSession: "2026–27",
    });
    expect(input.name).toBe("Class 6 English – Half Yearly");
    expect(input.examType).toBe("HALF_YEARLY");
    expect(input.durationMin).toBe(preset.durationMin);
    expect(validateBlueprint(input)).toEqual([]);
    expect(input.chapters.reduce((s, c) => s + c.marks, 0)).toBe(presetTotals(preset).marks);
    // English has its own pattern: grammar and the unseen passage are rows of their own in the 3-mark section
    expect(preset.subjectName).toBe("English");
    const threeMark = input.sections.filter((s) => s.marksEach === 3);
    expect(threeMark.find((s) => s.role === "GRAMMAR")!.allowedTypesJson).toContain("GRAMMAR");
    expect(JSON.parse(threeMark.find((s) => s.role === "PASSAGE")!.allowedTypesJson)).toEqual(["UNSEEN_PASSAGE"]);
  });

  it("uses the chosen time when one is given for every subject", () => {
    const preset = suggestPreset(presets, { className: "Class 3", subject: "Maths" })!;
    const input = buildSetupInput(preset, { id: "b", className: "Class 3", subject: "Maths", chapters: chapters(4) }, {
      examType: "QUARTERLY",
      academicSession: "2026–27",
      durationMin: 90,
    });
    expect(input.durationMin).toBe(90);
  });
});

describe("lining a new pattern up with an existing blueprint", () => {
  const existing = [
    { id: "A", type: "MCQ", marksEach: 1 },
    { id: "B", type: "SHORT", marksEach: 3 },
    { id: "C", type: "LONG", marksEach: 5 },
  ];

  it("keeps the same section for the same type and marks, even if the order changes", () => {
    const { sections, removedIds } = matchSectionIds(existing, [
      { type: "LONG", marksEach: 5 },
      { type: "MCQ", marksEach: 1 },
      { type: "SHORT", marksEach: 3 },
    ]);
    expect(sections.map((s) => s.id)).toEqual(["C", "A", "B"]);
    expect(removedIds).toEqual([]);
  });

  it("reuses a section at the same marks for a new form, creates what is new and drops the rest", () => {
    const { sections, removedIds } = matchSectionIds(existing, [
      { type: "FILL_BLANK", marksEach: 1 },
      { type: "VERY_SHORT", marksEach: 2 },
      { type: "SHORT", marksEach: 3 },
    ]);
    expect(sections.map((s) => s.id)).toEqual(["A", undefined, "B"]);
    expect(removedIds).toEqual(["C"]);
  });
});
