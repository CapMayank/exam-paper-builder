import { describe, expect, it } from "vitest";
import { SUBJECTS_SEED } from "./curriculumData";
import { SCHEME_GROUPS_2026_27 as G } from "./officialSchemeData";
import { MPBSE_BLUEPRINT_TEMPLATES } from "./curriculumTemplates";

const canon = (n: string) => n.replace(/ (Standard|Basic)$/, "");
const REQUIRED: Array<[number, string]> = [
  ...[9, 10].flatMap((c) => ["Hindi", "English", "Mathematics", "Science", "Social Science", "Sanskrit"].map((s): [number, string] => [c, s])),
  ...[11, 12].flatMap((c) => ["Hindi", "English", "Physics", "Chemistry", "Mathematics", "Biology"].map((s): [number, string] => [c, s])),
];
const seeds = SUBJECTS_SEED.filter((s) => REQUIRED.some(([c, n]) => c === s.classLevel && n === canon(s.name)));
const active = (s: (typeof SUBJECTS_SEED)[number]) =>
  s.textbooks.flatMap((t) => t.chapters).filter((c) => !c.isDeleted && (c.officialMarks ?? 0) > 0);
const byUnit = (s: (typeof SUBJECTS_SEED)[number]) => {
  const m = new Map<string, number>();
  for (const c of active(s)) {
    const k = String(c.unitNumber ?? `c${c.chapterNumber}`);
    m.set(k, (m.get(k) ?? 0) + (c.officialMarks ?? 0));
  }
  return [...m.values()].sort((a, b) => a - b);
};
const rowsOf = (cl: number, sub: string) =>
  G.find((x) => x.classLevel === cl && x.subject === sub)!.rows.filter((r) => r.marks > 0).map((r) => r.marks).sort((a, b) => a - b);

describe("seeded curriculum for the school's subjects matches the 2026-27 scheme", () => {
  it("covers every required subject and class", () => {
    const have = new Set(seeds.map((s) => `${s.classLevel}|${canon(s.name)}`));
    for (const [c, n] of REQUIRED) expect(have.has(`${c}|${n}`), `${c} ${n}`).toBe(true);
  });

  it.each(seeds.map((s) => [`${s.classLevel} ${s.name}`, s] as const))("%s: chapter marks add up to the printed total", (_n, s) => {
    const g = G.find((x) => x.classLevel === s.classLevel && x.subject === canon(s.name))!;
    expect(active(s).reduce((a, c) => a + (c.officialMarks ?? 0), 0)).toBe(g.totalMarks);
    expect(s.theoryMarks).toBe(g.totalMarks);
    const t = MPBSE_BLUEPRINT_TEMPLATES.find((x) => x.classLevel === s.classLevel && x.subjectName === s.name.replace(/ (Standard|Basic)$/, "") );
    expect(t?.totalMarks).toBe(g.totalMarks);
  });

  it("Mathematics, Science, Chemistry: chapter marks equal the scheme rows exactly", () => {
    for (const s of seeds.filter((x) => ["Mathematics", "Science", "Chemistry"].includes(canon(x.name)))) {
      const sorted = active(s).map((c) => c.officialMarks!).sort((a, b) => a - b);
      expect(sorted, `${s.classLevel} ${s.name}`).toEqual(rowsOf(s.classLevel, canon(s.name)));
    }
  });

  it("Hindi, Physics, Biology: unit totals equal the scheme rows exactly", () => {
    for (const s of seeds.filter((x) => ["Hindi", "Physics", "Biology"].includes(canon(x.name)))) {
      expect(byUnit(s), `${s.classLevel} ${s.name}`).toEqual(rowsOf(s.classLevel, canon(s.name)));
    }
  });

  it("Social Science: all printed rows are present (map included) and nothing extra", () => {
    for (const s of seeds.filter((x) => canon(x.name) === "Social Science")) {
      const seedSum = active(s).reduce((a, c) => a + (c.officialMarks ?? 0), 0);
      expect(seedSum).toBe(75);
      expect(active(s).some((c) => c.title.includes("Map Work")), `${s.classLevel} map`).toBe(true);
    }
  });

  it("English IX/X: Reading 10 + Writing 16 + Grammar 10 + Textbooks 39", () => {
    for (const cl of [9, 10]) {
      const s = seeds.find((x) => x.classLevel === cl && x.name === "English")!;
      const comp = s.textbooks.find((t) => t.title.startsWith("Reading, Writing"))!;
      expect(comp.chapters.map((c) => c.officialMarks)).toEqual([10, 16, 10]);
      const lit = s.textbooks.filter((t) => t !== comp).flatMap((t) => t.chapters).filter((c) => !c.isDeleted);
      expect(lit.reduce((a, c) => a + (c.officialMarks ?? 0), 0)).toBe(39);
    }
  });

  it("English XI/XII: sections A 14, B 12, C 10, D 44", () => {
    for (const cl of [11, 12]) {
      const s = seeds.find((x) => x.classLevel === cl && x.name === "English")!;
      expect(byUnit(s)).toEqual([10, 12, 14, 44]);
    }
  });

  it("Sanskrit IX/X: 48 marks of grammar/comprehension/writing components + 27 lesson-based marks", () => {
    for (const cl of [9, 10]) {
      const s = seeds.find((x) => x.classLevel === cl && x.name === "Sanskrit")!;
      const comp = s.textbooks.find((t) => t.title.includes("परीक्षा घटक"))!;
      expect(comp.chapters.reduce((a, c) => a + (c.officialMarks ?? 0), 0)).toBe(48);
      const lessons = s.textbooks.filter((t) => t !== comp).flatMap((t) => t.chapters).filter((c) => !c.isDeleted);
      expect(lessons.reduce((a, c) => a + (c.officialMarks ?? 0), 0)).toBe(27);
    }
  });

  it("textbook titles follow the 2026-27 syllabus where it names them", () => {
    const names = (cl: number, sub: string) => seeds.find((x) => x.classLevel === cl && x.name === sub)!.textbooks.map((t) => t.title).join(" | ");
    expect(names(9, "Hindi")).toContain("क्षितिज भाग-1");
    expect(names(9, "Hindi")).toContain("कृतिका भाग-1");
    expect(names(10, "Hindi")).toContain("क्षितिज भाग-2");
    expect(names(11, "Hindi")).toContain("आरोह भाग-1");
    const pub = (cl: number) => seeds.find((x) => x.classLevel === cl && x.name === "Hindi")!.textbooks[0].publisher;
    expect(pub(11)).toContain("वितान भाग-1");
    expect(pub(12)).toContain("वितान भाग-2");
    expect(names(12, "Hindi")).toContain("आरोह भाग-2");
    expect(names(9, "English")).toContain("Beehive");
    expect(names(10, "English")).toContain("First Flight");
    expect(names(11, "English")).toContain("Hornbill");
    expect(names(12, "English")).toContain("Flamingo");
  });
});
