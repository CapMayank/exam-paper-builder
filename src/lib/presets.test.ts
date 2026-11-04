import { describe, expect, it } from "vitest";
import { builtInBlueprintPresets, builtInSyllabusPresets, cleanPreset, effectivePresets, mergePresets, type BlueprintPreset } from "./presets";
import type { StandardCurriculumPreset } from "./syllabusImport";

const now = new Date("2026-11-04T10:00:00Z");

describe("editable presets", () => {
  it("offers every built-in preset when the school changed nothing", () => {
    expect(effectivePresets("SYLLABUS", [])).toHaveLength(builtInSyllabusPresets().length);
    expect(effectivePresets("BLUEPRINT", [])).toHaveLength(builtInBlueprintPresets().length);
  });

  it("gives every blueprint pattern the classes it is for", () => {
    const school = builtInBlueprintPresets().find((p) => p.archetype === "SCHOOL" && p.classFrom === 5)!;
    expect(school.classTo).toBe(8);
    for (const p of builtInBlueprintPresets()) expect(p.classFrom).toBeLessThanOrEqual(p.classTo);
  });

  it("replaces an edited built-in preset and keeps the original to restore", () => {
    const base = builtInSyllabusPresets().find((p) => p.id === "mp-6-english")!;
    const edited = { ...base, title: "English Reader 6 (school copy)", chapters: base.chapters.slice(0, 3) };
    const merged = mergePresets(builtInSyllabusPresets(), [{ presetId: base.id, data: edited, hidden: false, updatedAt: now }]);
    const row = merged.find((p) => p.id === base.id)!;
    expect(row.origin).toBe("EDITED");
    expect(row.data.title).toBe("English Reader 6 (school copy)");
    expect(row.original?.title).toBe(base.title);
  });

  it("leaves hidden presets out of what teachers are offered", () => {
    const id = "mp-6-english";
    const offered = effectivePresets("SYLLABUS", [{ presetId: id, data: null, hidden: true, updatedAt: now }]);
    expect(offered.some((p) => p.id === id)).toBe(false);
    expect(offered).toHaveLength(builtInSyllabusPresets().length - 1);
  });

  it("adds the school's own presets after the built-in ones", () => {
    const custom: StandardCurriculumPreset = { id: "custom-abc", title: "Grammar Express 5", className: "Class 5", subject: "English", board: "Future Steps", description: "", chapters: [{ number: 1, title: "Nouns" }] };
    const offered = effectivePresets("SYLLABUS", [{ presetId: custom.id, data: custom, hidden: false, updatedAt: now }]);
    const found = offered.find((p) => p.id === "custom-abc")!;
    // language books get their reading / writing / grammar exam sections when offered
    expect(found.chapters.length).toBeGreaterThan(1);
    expect(found.chapters[0].title).toBe("Nouns");
  });

  it("renumbers chapters and rejects a book without chapters", () => {
    const clean = cleanPreset("SYLLABUS", "custom-x", {
      title: " Book ",
      className: "Class 3",
      subject: "EVS",
      chapters: [{ number: 7, title: "One" }, { number: 9, title: "Two" }],
    }) as StandardCurriculumPreset;
    expect(clean.title).toBe("Book");
    expect(clean.chapters.map((c) => c.number)).toEqual([1, 2]);
    expect(() => cleanPreset("SYLLABUS", "custom-x", { title: "B", className: "Class 3", subject: "EVS", chapters: [] })).toThrow();
  });

  it("works out a pattern's total marks from its sections", () => {
    const clean = cleanPreset("BLUEPRINT", "custom-p", {
      title: "Half-yearly 40",
      description: "",
      examType: "HALF_YEARLY",
      durationMin: 120,
      classFrom: 3,
      classTo: 3,
      totalMarks: 999,
      archetype: "CUSTOM",
      sections: [
        { title: "A", instructions: "", questionTypes: [{ type: "MCQ", count: 10, marksEach: 1 }] },
        { title: "B", instructions: "", questionTypes: [{ type: "SHORT", count: 10, marksEach: 3 }] },
      ],
    }) as BlueprintPreset;
    expect(clean.totalMarks).toBe(40);
    expect(clean.targetClasses).toBe("Class 3");
    expect(clean.templateCode).toBe("custom-p");
  });

  it("rejects a class range that runs backwards", () => {
    expect(() =>
      cleanPreset("BLUEPRINT", "custom-p", {
        title: "X",
        examType: "ANNUAL",
        durationMin: 60,
        classFrom: 8,
        classTo: 5,
        sections: [{ title: "A", questionTypes: [{ type: "MCQ", count: 1, marksEach: 1 }] }],
      }),
    ).toThrow();
  });

  it("keeps the official details of an edited board pattern", () => {
    const board = builtInBlueprintPresets().find((p) => p.source)!;
    const clean = cleanPreset("BLUEPRINT", board.id, { ...board, durationMin: 150 }) as BlueprintPreset;
    expect(clean.source).toEqual(board.source);
    expect(clean.subjectName).toBe(board.subjectName);
    expect(clean.durationMin).toBe(150);
  });
});
