import { describe, expect, it } from "vitest";
import { presetsForBook, presetTotals, suggestPreset } from "./blueprintSetupPlan";
import { STANDARD_CURRICULUM_PRESETS } from "./curriculumPresets";
import { MINOR_SUBJECT_CLASSES } from "./minorSubjectPresets";
import { builtInBlueprintPresets } from "./presets";

const presets = builtInBlueprintPresets();

describe("GK and Drawing topic books", () => {
  it("covers every class from Nursery to Class 8 for both subjects", () => {
    expect(MINOR_SUBJECT_CLASSES).toEqual(["Nursery", "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"]);
    for (const className of MINOR_SUBJECT_CLASSES) {
      for (const subject of ["General Knowledge", "Drawing"]) {
        const book = STANDARD_CURRICULUM_PRESETS.find((p) => p.className === className && p.subject === subject);
        expect(book, `${className} ${subject}`).toBeTruthy();
        expect(book!.chapters.length).toBeGreaterThanOrEqual(6);
      }
    }
  });
});

describe("GK and Drawing patterns", () => {
  const gk = presets.find((p) => p.subjectName === "General Knowledge")!;
  const drawing = presets.find((p) => p.subjectName === "Drawing")!;

  it("are 50 marks each", () => {
    expect(presetTotals(gk).marks).toBe(50);
    expect(presetTotals(drawing).marks).toBe(50);
  });

  it("are offered from Nursery to Class 8, each only for its own subject", () => {
    for (const className of ["Nursery", "LKG", "UKG", "Class 1", "Class 5", "Class 8"]) {
      expect(suggestPreset(presets, { className, subject: "General Knowledge" })?.id, className).toBe(gk.id);
      expect(suggestPreset(presets, { className, subject: "Drawing" })?.id, className).toBe(drawing.id);
    }
    expect(presetsForBook(presets, { className: "Class 9", subject: "Drawing" }).map((p) => p.id)).not.toContain(drawing.id);
    expect(presetsForBook(presets, { className: "Class 5", subject: "Mathematics" }).map((p) => p.id)).not.toContain(gk.id);
  });

  it("asks drawing questions in the Drawing paper", () => {
    expect(drawing.sections.flatMap((s) => s.questionTypes.map((q) => q.type))).toEqual(expect.arrayContaining(["DRAW"]));
  });
});
