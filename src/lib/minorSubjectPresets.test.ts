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
  const drawings = presets.filter((p) => p.subjectName === "Drawing");
  const outline = drawings.find((p) => p.id === "school-drawing-outline-50m")!;
  const theme = drawings.find((p) => p.id === "school-drawing-theme-50m")!;

  it("are 50 marks each", () => {
    expect(presetTotals(gk).marks).toBe(50);
    expect(presetTotals(outline).marks).toBe(50);
    expect(presetTotals(theme).marks).toBe(50);
  });

  it("offer two kinds of Drawing paper, each one whole-page drawing question", () => {
    expect(drawings.map((d) => d.id).sort()).toEqual(["school-drawing-outline-50m", "school-drawing-theme-50m"]);
    for (const d of drawings) {
      expect(d.sections.flatMap((s) => s.questionTypes)).toEqual([expect.objectContaining({ type: "DRAW", count: 1, marksEach: 50 })]);
    }
    expect(outline.title).toMatch(/colour the outline/i);
    expect(theme.title).toMatch(/theme/i);
  });

  it("are offered from Nursery to Class 8, each only for its own subject", () => {
    for (const className of ["Nursery", "LKG", "UKG", "Class 1", "Class 5", "Class 8"]) {
      expect(suggestPreset(presets, { className, subject: "General Knowledge" })?.id, className).toBe(gk.id);
      const offered = presetsForBook(presets, { className, subject: "Drawing" }).map((p) => p.id);
      expect(offered, className).toEqual(expect.arrayContaining([outline.id, theme.id]));
      expect(offered, className).not.toContain(gk.id);
    }
    expect(presetsForBook(presets, { className: "Class 9", subject: "Drawing" }).map((p) => p.id)).not.toContain(theme.id);
    expect(presetsForBook(presets, { className: "Class 5", subject: "Mathematics" }).map((p) => p.id)).not.toContain(gk.id);
  });
});
