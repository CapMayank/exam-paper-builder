import { describe, expect, it } from "vitest";
import { planPaperSlotAssignments } from "./paperAutogen";
import { whyCannotAdd, type PlacedItem } from "./blueprint";
import { SCHEME_GROUPS_2026_27 } from "./officialSchemeData";
import { FORMATS, formatIdFor, type FormatDef } from "./officialFormats";

const LANG = new Set(["Hindi", "English", "Sanskrit", "Urdu", "Marathi", "Punjabi", "Gujarati", "Sindhi"]);

/**
 * Plans every official non-language MPBSE scheme, then commits the plan section by section in paper order,
 * exactly as the AI generator does. Regression: Class 9 SST failed with "Question 1 cannot be placed: The
 * blueprint allows only 4 marks from this chapter; 2 are already used." because a 6-pair match question could
 * not fit any chapter and its overflow was credited to a different chapter than the planner left short.
 */
function simulate(g: (typeof SCHEME_GROUPS_2026_27)[number]): string | null {
  const f = (FORMATS as Record<string, FormatDef>)[formatIdFor(g)];
  const types = ["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN", "VERY_SHORT"];
  const sections: Array<{ id: string; title: string; type: string; count: number; marksEach: number }> = [];
  f.objective.forEach((c, i) => sections.push({ id: `o${i}`, title: `Q${i + 1}`, type: types[i], count: c, marksEach: 1 }));
  f.written.forEach((w, i) =>
    sections.push({
      id: `w${i}`,
      title: `W${i}`,
      type: w.kind === "MAP" ? "MAP_WORK" : w.marksEach === 2 ? "VERY_SHORT" : w.marksEach === 3 ? "SHORT" : "LONG",
      count: w.count,
      marksEach: w.marksEach,
    }),
  );
  const chapters = g.rows
    .filter((r) => r.marks > 0)
    .map((r, i) => ({ chapterId: `c${i}`, marks: r.marks, unitKey: null, chapter: { id: `c${i}`, number: i + 1, title: r.title } }));
  const plan = planPaperSlotAssignments({
    id: "p",
    title: "t",
    blueprint: { sections, chapters, book: { className: `Class ${g.classLevel}`, subject: g.subject } },
    items: [],
  });
  const bp = { sections, chapters: chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks, unitKey: null })) };
  const placed: PlacedItem[] = [];
  for (const s of plan.sections) {
    const isMatch = s.sectionType === "MATCH_COLUMN";
    for (const sl of isMatch ? s.slots.slice(0, 1) : s.slots) {
      const marks = isMatch ? s.slots.length * s.marksEach : s.marksEach;
      const subpartsCount = isMatch ? s.slots.length : undefined;
      const why = whyCannotAdd(bp, placed, { sectionId: s.sectionId, chapterId: sl.chapterId, type: s.sectionType, marks, subpartsCount });
      if (why) return `${s.sectionTitle} slot ${sl.slotIndex}: ${why}`;
      placed.push({ sectionId: s.sectionId, chapterId: sl.chapterId, marks, subpartsCount });
    }
  }
  return null;
}

describe("official schemes: AI plan commits without quota rejections", () => {
  const groups = SCHEME_GROUPS_2026_27.filter((g) => (FORMATS as Record<string, unknown>)[formatIdFor(g)] && !LANG.has(g.subject));
  it("covers Class 9 Social Science", () => {
    expect(groups.some((g) => g.classLevel === 9 && g.subject === "Social Science")).toBe(true);
  });
  for (const g of groups) {
    it(`Class ${g.classLevel} ${g.subject}${g.variant ? ` (${g.variant})` : ""}`, () => {
      expect(simulate(g)).toBeNull();
    });
  }
});
