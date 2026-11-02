import { describe, expect, it } from "vitest";
import { MPBSE_BLUEPRINT_TEMPLATES, type BlueprintTemplate } from "./curriculumTemplates";
import { FORMATS, formatIdFor, skeletonByMarks, skeletonMarks, MUSIC_FORMATS, type FormatDef } from "./officialFormats";
import { SCHEME_GROUPS_2026_27 } from "./officialSchemeData";
import { practicalGroups } from "./officialTemplates";

function byMarks(t: BlueprintTemplate): Record<number, number> {
  const out: Record<number, number> = {};
  for (const g of t.sections) for (const q of g.questionTypes) out[q.marksEach] = (out[q.marksEach] ?? 0) + q.count;
  return out;
}
function objectiveSplit(t: BlueprintTemplate): number[] {
  return t.sections.slice(0, 5).map((g) => g.questionTypes.reduce((a, q) => a + (q.marksEach === 1 ? q.count : 0), 0));
}

describe("official 2026-27 scheme data", () => {
  it("every group's printed rows add up to its printed total", () => {
    for (const g of SCHEME_GROUPS_2026_27) {
      const sum = g.rows.reduce((a, r) => a + r.marks, 0);
      expect(sum, `${g.classLevel} ${g.subject} (${g.pages})`).toBe(g.totalMarks);
    }
  });

  it("every question-format skeleton adds up to the printed total", () => {
    for (const f of Object.values(FORMATS)) {
      const expected = f.id.startsWith("F75") ? 75 : f.id.startsWith("F80") ? 80 : f.id === "SCHOOL_DM_50" ? 50 : 70;
      expect(skeletonMarks(f as FormatDef), f.id).toBe(expected);
    }
    expect(MUSIC_FORMATS.F50_MUSIC.objective + MUSIC_FORMATS.F50_MUSIC.written.reduce((a, w) => a + w.marksEach * w.count, 0)).toBe(50);
    expect(MUSIC_FORMATS.F25_MUSIC.objective + MUSIC_FORMATS.F25_MUSIC.written.reduce((a, w) => a + w.marksEach * w.count, 0)).toBe(25);
  });
});

const written = SCHEME_GROUPS_2026_27.filter((g) => {
  const f = formatIdFor(g);
  return f !== "PRACTICAL" && f !== "ENGLISH_IX_X" && f !== "ENGLISH_XI_XII";
});

describe.each(written.map((g) => [`${g.classLevel} ${g.subject}`, g] as const))("template conforms to the official format: Class %s", (_n, g) => {
  const templates = MPBSE_BLUEPRINT_TEMPLATES.filter((t) => t.classLevel === g.classLevel && t.subjectName === g.subject);
  const fid = formatIdFor(g);

  it("has a template (Basic and Standard Mathematics both count)", () => {
    expect(templates.length).toBeGreaterThan(0);
  });

  it("matches the printed total marks and question counts per marks value", () => {
    for (const t of templates) {
      expect(t.totalMarks).toBe(g.totalMarks);
      if (fid === "F50_MUSIC" || fid === "F25_MUSIC") {
        const m = MUSIC_FORMATS[fid];
        const expected: Record<number, number> = { 1: m.objective };
        for (const w of m.written) expected[w.marksEach] = (expected[w.marksEach] ?? 0) + w.count;
        expect(byMarks(t)).toEqual(expected);
      } else {
        const f = FORMATS[fid as keyof typeof FORMATS];
        expect(byMarks(t), `${t.templateCode}`).toEqual(skeletonByMarks(f));
        expect(objectiveSplit(t), `${t.templateCode} Q1-Q5 split`).toEqual(f.objective);
      }
    }
  });
});

describe("papers the app cannot template yet are listed, not dropped", () => {
  it("lists every studio / practical paper in the scheme", () => {
    const names = practicalGroups().map((g) => `${g.classLevel} ${g.subject}`).sort();
    expect(names).toEqual([
      "10 Painting", "11 Drawing and Designing", "11 Drawing and Painting", "11 Still Life and Design",
      "12 Drawing and Designing", "12 Drawing and Painting", "12 Still Life and Design", "9 Painting",
    ]);
  });
});

describe("English papers match the printed question-by-question tables", () => {
  const roleSums = (t: BlueprintTemplate) => {
    const out: Record<string, number> = {};
    for (const g of t.sections) for (const q of g.questionTypes) out[q.role ?? "STANDARD"] = (out[q.role ?? "STANDARD"] ?? 0) + q.count * q.marksEach;
    return out;
  };
  const countAt = (t: BlueprintTemplate, marks: number, notType?: string) =>
    t.sections.flatMap((g) => g.questionTypes).filter((q) => q.marksEach === marks && q.type !== notType).reduce((a, q) => a + q.count, 0);

  for (const lvl of [9, 10, 11, 12]) {
    it(`Class ${lvl}`, () => {
      const t = MPBSE_BLUEPRINT_TEMPLATES.find((x) => x.classLevel === lvl && x.subjectName === "English")!;
      if (lvl <= 10) {
        expect(roleSums(t)).toEqual({ PASSAGE: 10, WRITING: 16, GRAMMAR: 10, LITERATURE: 39 });
        expect([countAt(t, 2), countAt(t, 3), countAt(t, 4)]).toEqual([10, 4, 2]);
        expect(countAt(t, 5, "UNSEEN_PASSAGE")).toBe(1);
      } else {
        expect(roleSums(t)).toEqual({ PASSAGE: 10, WRITING: 16, GRAMMAR: 10, LITERATURE: 44 });
        expect([countAt(t, 2), countAt(t, 3), countAt(t, 4)]).toEqual([10, 4, 4]);
      }
      // textbook names are the ones printed in the syllabus
      const titles = t.sections.map((g) => g.title).join(" | ");
      const books = { 9: ["Beehive", "Moments"], 10: ["First Flight", "Footprints without Feet"], 11: ["Hornbill", "Snapshots"], 12: ["Flamingo", "Vistas"] }[lvl as 9 | 10 | 11 | 12];
      for (const b of books) expect(titles).toContain(b);
    });
  }
});
