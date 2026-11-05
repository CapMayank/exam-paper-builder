import { describe, expect, it } from "vitest";
import { buildSetupInput, suggestPreset } from "./blueprintSetupPlan";
import { planPaperSlotAssignments, type PaperAutogenInput } from "./paperAutogen";
import { builtInBlueprintPresets } from "./presets";
import { schoolPatternsForLevel } from "./schoolPatterns";
import { openSlotSpecs, rowSlotSpecs, slotPlanSummary } from "./slotPlan";
import { getLanguageNonChapterUnits } from "./syllabusImport";

const presets = builtInBlueprintPresets();

/** A teacher sees one section per form: five MCQs, not four and one. */
describe("Classes 5–8 language patterns: one row per form", () => {
  for (const [subject, level] of [["English", 8], ["Hindi", 6], ["Sanskrit", 7]] as const) {
    it(`${subject}: MCQ 5, blanks 5, very short 6, short 6, long 4, one row each`, () => {
      const t = schoolPatternsForLevel(level, subject)[0];
      expect(t.subjectName).toBe(subject);
      expect(t.sections.map((g) => g.questionTypes.length)).toEqual([1, 1, 1, 1, 1]);
      expect(t.sections.map((g) => [g.questionTypes[0].type, g.questionTypes[0].count])).toEqual([
        ["MCQ", 5],
        ["FILL_BLANK", 5],
        ["VERY_SHORT", 6],
        ["SHORT", 6],
        ["LONG", 4],
      ]);
    });
  }

  it("puts the grammar, passage and writing questions where the board paper does (English Q4, Q22, Q25-26)", () => {
    const t = schoolPatternsForLevel(8, "English")[0];
    const roles = (i: number) => rowSlotSpecs({ ...t.sections[i].questionTypes[0], slotPlanJson: JSON.stringify(t.sections[i].questionTypes[0].slotPlan ?? []) }).map((s) => s.role);
    expect(roles(0)).toEqual(["LITERATURE", "LITERATURE", "LITERATURE", "GRAMMAR", "LITERATURE"]);
    expect(roles(3)[5]).toBe("PASSAGE");
    expect(roles(4)).toEqual(["LITERATURE", "LITERATURE", "WRITING", "WRITING"]);
  });
});

describe("slot plan helpers", () => {
  const row = { type: "SHORT", count: 6, role: "LITERATURE", slotPlanJson: JSON.stringify([{ role: "LITERATURE" }, { role: "LITERATURE" }, { role: "LITERATURE" }, { role: "GRAMMAR" }, { role: "LITERATURE" }, { role: "PASSAGE", type: "UNSEEN_PASSAGE" }]) };

  it("gives each slot its role and form, and the row's own for a row with no plan", () => {
    expect(rowSlotSpecs(row).map((s) => s.type)).toEqual(["SHORT", "SHORT", "SHORT", "SHORT", "SHORT", "UNSEEN_PASSAGE"]);
    expect(rowSlotSpecs({ type: "MCQ", count: 2, role: "STANDARD" })).toEqual([{ role: "STANDARD", type: "MCQ" }, { role: "STANDARD", type: "MCQ" }]);
    expect(slotPlanSummary(row)).toBe("4 lessons · 1 grammar · 1 unseen passage");
    expect(slotPlanSummary({ type: "MCQ", count: 5, role: "STANDARD" })).toBe("");
  });

  it("a placed question uses up a slot of its own kind wherever it sits", () => {
    const open = openSlotSpecs(row, ["PASSAGE", "LESSON"]);
    expect(open.map((s) => s.role)).toEqual(["LITERATURE", "LITERATURE", "GRAMMAR", "LITERATURE"]);
  });
});

describe("the planner gives each slot its own kind of row", () => {
  const book = {
    id: "b",
    className: "Class 8",
    subject: "English",
    chapters: [
      ...Array.from({ length: 8 }, (_, i) => ({ id: `l${i + 1}`, title: `Lesson ${i + 1}` })),
      ...getLanguageNonChapterUnits("English", "Class 8").map((u) => ({ id: u.domain, title: u.title })),
    ],
  };
  const input = buildSetupInput(suggestPreset(presets, book)!, book, { examType: "ANNUAL", academicSession: "2026–27" });
  const paper: PaperAutogenInput = {
    id: "p",
    title: "t",
    blueprint: {
      sections: input.sections.map((s, i) => ({ ...s, id: `s${i}` })),
      chapters: input.chapters.map((c) => {
        const ch = book.chapters.find((x) => x.id === c.chapterId)!;
        return { chapterId: c.chapterId, marks: c.marks, chapter: { id: ch.id, number: book.chapters.indexOf(ch) + 1, title: ch.title } };
      }),
      book: { className: "Class 8", subject: "English", title: "Honeydew" },
    },
    items: [],
  };

  it("plans one grammar MCQ, and the unseen passage as its own batch in the 3-mark row", () => {
    const plan = planPaperSlotAssignments(paper);
    const mcq = plan.sections.filter((s) => s.sectionId === "s0");
    expect(mcq).toHaveLength(1);
    expect(mcq[0].slots).toHaveLength(5);
    expect(mcq[0].slots.filter((s) => s.chapterId === "grammar")).toHaveLength(1);

    const short = plan.sections.filter((s) => s.sectionId === "s3");
    expect(short.map((s) => [s.sectionType, s.slots.length])).toEqual([["SHORT", 5], ["UNSEEN_PASSAGE", 1]]);
    expect(short[1].slots[0].chapterId).toBe("reading");
    expect(short[0].slots.filter((s) => s.chapterId === "grammar")).toHaveLength(1);

    const long = plan.sections.filter((s) => s.sectionId === "s4");
    expect(long.map((s) => [s.sectionType, s.slots.length])).toEqual([["LONG", 2], ["WRITING_SKILL", 2]]);
    expect(long[1].slots.every((s) => s.chapterId === "writing")).toBe(true);
    expect(plan.totalQuestionsNeeded).toBe(26);
  });

  it("once the grammar MCQ is placed, the rest of the row goes to lessons", () => {
    const plan = planPaperSlotAssignments({ ...paper, items: [{ sectionId: "s0", question: { chapterId: "grammar" } }] });
    const mcq = plan.sections.find((s) => s.sectionId === "s0")!;
    expect(mcq.slots).toHaveLength(4);
    expect(mcq.slots.every((s) => s.chapterId.startsWith("l"))).toBe(true);
  });
});
