import { describe, expect, it } from "vitest";
import { rolloverBlueprintsSchema, rolloverBookSchema } from "@/lib/schemas";
import { normalizeSession } from "@/lib/academicSessionUtils";
import { STANDARD_CURRICULUM_PRESETS } from "@/lib/syllabusImport";

describe("Academic Session Rollover Schemas", () => {
  it("validates blueprint rollover request with target session", () => {
    const valid = rolloverBlueprintsSchema.parse({
      sourceBlueprintIds: ["bp-1", "bp-2"],
      targetAcademicSession: "2026-27",
      namePrefix: "[2026–27] ",
    });
    expect(valid.sourceBlueprintIds).toEqual(["bp-1", "bp-2"]);
    expect(valid.targetAcademicSession).toBe("2026-27");
  });

  it("rejects empty sourceBlueprintIds in rollover request", () => {
    expect(() =>
      rolloverBlueprintsSchema.parse({
        sourceBlueprintIds: [],
        targetAcademicSession: "2026–27",
      }),
    ).toThrow();
  });

  it("validates book rollover request with granular chapter selection", () => {
    const valid = rolloverBookSchema.parse({
      sourceBookId: "book-123",
      targetAcademicSession: "2026–27",
      title: "Science (NCERT 2026–27)",
      selectedChapterIds: ["ch-1", "ch-2", "ch-3"],
      includeQuestions: true,
    });
    expect(valid.sourceBookId).toBe("book-123");
    expect(valid.selectedChapterIds).toHaveLength(3);
    expect(valid.includeQuestions).toBe(true);
  });

  it("validates book rollover request with chapters payload", () => {
    const valid = rolloverBookSchema.parse({
      sourceBookId: "book-123",
      targetAcademicSession: "2026–27",
      title: "Science (NCERT 2026–27)",
      chapters: [
        { number: 1, title: "Chemical Reactions" },
        { number: 2, title: "Acids, Bases and Salts" },
      ],
      includeQuestions: false,
    });
    expect(valid.sourceBookId).toBe("book-123");
    expect(valid.chapters).toHaveLength(2);
    expect(valid.includeQuestions).toBe(false);
  });
});

describe("Academic Session Normalization", () => {
  it("normalizes hyphenated years to en-dash", () => {
    expect(normalizeSession("2025-26")).toBe("2025–26");
    expect(normalizeSession("2026-27")).toBe("2026–27");
  });

  it("preserves en-dash years", () => {
    expect(normalizeSession("2025–26")).toBe("2025–26");
    expect(normalizeSession("2026–27")).toBe("2026–27");
  });

  it("trims whitespace and falls back gracefully", () => {
    expect(normalizeSession("  2024-25  ")).toBe("2024–25");
    expect(normalizeSession("")).toBe("2025–26");
  });
});

describe("Curriculum Presets Catalog (Nursery–12th)", () => {
  const classes = [
    "Nursery",
    "LKG",
    "UKG",
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
    "Class 11",
    "Class 12",
  ];

  it("contains curriculum presets for every class from Nursery to Class 12", () => {
    for (const cls of classes) {
      const presetsForClass = STANDARD_CURRICULUM_PRESETS.filter((p) => p.className === cls);
      expect(presetsForClass.length, `Expected presets for ${cls}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("all presets have non-empty chapters with valid numbers and titles", () => {
    for (const p of STANDARD_CURRICULUM_PRESETS) {
      expect(p.chapters.length, `Preset ${p.id} has 0 chapters`).toBeGreaterThan(0);
      for (const ch of p.chapters) {
        expect(ch.number).toBeGreaterThan(0);
        expect(ch.title.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("contains composite multi-book presets for secondary classes", () => {
    const compositePresets = STANDARD_CURRICULUM_PRESETS.filter((p) => p.isComposite);
    expect(compositePresets.length).toBeGreaterThanOrEqual(2);
    // E.g. Class 10 Social Science (4 books combined)
    const sst10 = compositePresets.find((p) => p.id === "cbse-10-sst");
    expect(sst10).toBeDefined();
    expect(sst10?.subBooks?.length).toBe(4);

    // E.g. Class 10 English (First Flight + Footprints)
    const eng10 = compositePresets.find((p) => p.id === "cbse-10-english");
    expect(eng10).toBeDefined();
    expect(eng10?.subBooks?.length).toBe(2);
  });
});
