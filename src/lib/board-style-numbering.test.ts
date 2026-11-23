import { describe, expect, test } from "vitest";
import {
  computeDisplayedPaperNumbering,
  groupedSubLabel,
  groupedQuestionPrompt,
  isGroupedExerciseRow,
  isObjectiveRow,
  resolveGroupedExerciseInstruction,
  rowRunLabel,
} from "./layout";
import {
  cleanQuestionStatement,
  formatQuestionNumber as formatQuestionNumberLegacy,
  getQuestionTypeLabel,
  normalizeNumberingStyle,
  NUMBERING_STYLES,
} from "./constants";
import { paperCreateSchema } from "./schemas";
import { getPaperLocale } from "./localization";
import { planSectionHeadings } from "./sectionHeadingPlan";

type Row = { id: string; title: string; type: string; count: number; marksEach: number; order: number };

function itemsFor(rows: Row[]) {
  return rows.flatMap((r) =>
    Array.from({ length: r.type === "MATCH_COLUMN" ? 1 : r.count }, (_, i) => ({
      id: `${r.id}-${i}`,
      sectionId: r.id,
      position: i,
      question: { type: r.type },
    })),
  );
}

describe("one grouping rule, by question type", () => {
  test.each([
    ["MCQ", 1, true],
    ["ASSERTION_REASON", 1, true],
    ["TRUE_FALSE", 1, true],
    ["FILL_BLANK", 1, true],
    ["VERY_SHORT", 1, true],
    ["VERY_SHORT", 2, false],
    ["SHORT", 1, false],
    ["MATCH_COLUMN", 1, false],
  ])("%s at %d mark groups: %s", (type, marksEach, grouped) => {
    expect(isGroupedExerciseRow({ type, marksEach }, 6)).toBe(grouped);
    expect(isObjectiveRow({ type, marksEach })).toBe(grouped);
  });

  test("a row holding a question of another form prints its questions separately", () => {
    const rows = [{ id: "m", title: "Section A", type: "MCQ", count: 4, marksEach: 1, order: 1 }];
    const items = [
      { id: "x", sectionId: "m", position: 0, question: { type: "MATCH_COLUMN" } },
      ...[1, 2, 3].map((i) => ({ id: `m-${i}`, sectionId: "m", position: i, question: { type: "MCQ" } })),
    ];
    const n = computeDisplayedPaperNumbering(rows, items, "CONTINUOUS", "en");
    expect(n.sectionRanges.m.isGroupedExercise).toBe(false);
    expect(["x", "m-1", "m-2", "m-3"].map((id) => n.itemNumbers[id].displayLabel)).toEqual(["1", "2", "3", "4"]);
    expect(isGroupedExerciseRow({ type: "MCQ", marksEach: 1 }, 4, ["MATCH_COLUMN", "MCQ", "MCQ", "MCQ"])).toBe(false);
    expect(isGroupedExerciseRow({ type: "MCQ", marksEach: 1 }, 2, ["MCQ", undefined])).toBe(true);
  });

  test("one item never groups", () => {
    expect(isGroupedExerciseRow({ type: "MCQ", marksEach: 1 }, 1)).toBe(false);
  });

  test("MCQ rows group regardless of heading text", () => {
    const rows = [{ id: "m", title: "Section A", type: "MCQ", count: 6, marksEach: 1, order: 1 }];
    const n = computeDisplayedPaperNumbering(rows, itemsFor(rows), "CONTINUOUS", "en");
    expect(n.itemNumbers["m-0"].questionLabel).toBe("1");
    expect(n.itemNumbers["m-5"].isGroupedSubItem).toBe(true);
    expect(n.totalDisplayedQuestions).toBe(1);
  });

  test("board paper numbers run through sections", () => {
    const rows: Row[] = [
      { id: "mcq", title: "Section A — Objective", type: "MCQ", count: 6, marksEach: 1, order: 1 },
      { id: "fb", title: "Section A — Objective", type: "FILL_BLANK", count: 5, marksEach: 1, order: 2 },
      { id: "tf", title: "Section A — Objective", type: "TRUE_FALSE", count: 5, marksEach: 1, order: 3 },
      { id: "mt", title: "Section A — Objective", type: "MATCH_COLUMN", count: 5, marksEach: 1, order: 4 },
      { id: "sh", title: "Section B — Short answer", type: "SHORT", count: 3, marksEach: 2, order: 5 },
    ];
    const n = computeDisplayedPaperNumbering(rows, itemsFor(rows), "CONTINUOUS", "en");
    expect(n.itemNumbers["mcq-0"].questionLabel).toBe("1");
    expect(n.itemNumbers["fb-0"].questionLabel).toBe("2");
    expect(n.itemNumbers["tf-4"].questionLabel).toBe("3");
    expect(n.itemNumbers["mt-0"].displayLabel).toBe("4");
    expect(["sh-0", "sh-1", "sh-2"].map((id) => n.itemNumbers[id].displayLabel)).toEqual(["5", "6", "7"]);
    expect(n.totalDisplayedQuestions).toBe(7);
  });

  test("mixed section: the band counts the questions it numbers and their marks add up", () => {
    const rows: Row[] = [
      { id: "mcq", title: "Section A", type: "MCQ", count: 6, marksEach: 1, order: 1 },
      { id: "vs", title: "Section A", type: "VERY_SHORT", count: 3, marksEach: 2, order: 2 },
    ];
    const items = itemsFor(rows);
    const n = computeDisplayedPaperNumbering(rows, items, "CONTINUOUS", "en");
    const p = planSectionHeadings(rows, items, n, getPaperLocale("en"));
    expect(p.mcq.grouped).toBe(true);
    expect(p.vs.grouped).toBe(false);
    expect(p.vs.showTypeSubBand).toBe(true);
    // 1 grouped question + 3 separate = 4 questions, 6 + 6 = 12 marks
    expect(p.mcq.bandSummary).toBe(getPaperLocale("en").section.formatGroupSummary(4, 12, { displayedCount: 4 }));
  });
});

describe("the row's question title is what prints", () => {
  test("questionTitle wins over the instruction on the grouped line", () => {
    expect(groupedQuestionPrompt({ questionTitle: "Fill in the blanks.", instructions: "x", type: "FILL_BLANK" }, true, "en")).toBe(
      "Fill in the blanks.",
    );
  });

  test("an empty questionTitle falls back to the type's prompt", () => {
    expect(groupedQuestionPrompt({ questionTitle: "  ", instructions: "", type: "FILL_BLANK" }, false, "en")).toBe(
      resolveGroupedExerciseInstruction("", "FILL_BLANK", false, "en"),
    );
  });

  test("a run's sub-band names the question title, else the type", () => {
    expect(rowRunLabel({ questionTitle: "Answer in one sentence.", type: "VERY_SHORT" }, "en")).toBe("Answer in one sentence.");
    expect(rowRunLabel({ questionTitle: "", type: "VERY_SHORT" }, "hi")).toBe(getQuestionTypeLabel("VERY_SHORT", "hi"));
  });
});

describe("part labels", () => {
  test("english parts are lower roman, without a ceiling", () => {
    expect([0, 1, 3, 8, 9, 10, 11, 39].map((i) => groupedSubLabel(i, false))).toEqual([
      "(i)", "(ii)", "(iv)", "(ix)", "(x)", "(xi)", "(xii)", "(xl)",
    ]);
  });

  test("devanagari parts continue with Devanagari numerals", () => {
    expect([0, 9, 10, 11].map((i) => groupedSubLabel(i, true))).toEqual(["(क)", "(ञ)", "(११)", "(१२)"]);
  });

  test("a 12-item one-word row labels through (xii), or (१२) on a Sanskrit paper", () => {
    const rows = [{ id: "w", title: "Section A", type: "VERY_SHORT", count: 12, marksEach: 1, order: 1 }];
    const items = itemsFor(rows);
    expect(computeDisplayedPaperNumbering(rows, items, "CONTINUOUS", "en").itemNumbers["w-11"].displayLabel).toBe("1 (xii)");
    expect(computeDisplayedPaperNumbering(rows, items, "CONTINUOUS", "sa").itemNumbers["w-11"].displayLabel).toBe("1 (१२)");
  });

  test("a printed (xi) prefix is still stripped from question text", () => {
    expect(cleanQuestionStatement("(xi) The sun rises in the east.")).toBe("The sun rises in the east.");
  });
});

describe("numbering styles", () => {
  test("section-relative numbering is retired and reads as continuous", () => {
    expect(NUMBERING_STYLES).toEqual(["CONTINUOUS", "PREFIXED"]);
    expect(normalizeNumberingStyle("SECTION_RELATIVE")).toBe("CONTINUOUS");
    expect(normalizeNumberingStyle("PREFIXED")).toBe("PREFIXED");
    expect(normalizeNumberingStyle(undefined)).toBe("CONTINUOUS");
    expect(normalizeNumberingStyle("nonsense")).toBe("CONTINUOUS");
  });

  test("a paper still stored as section-relative numbers 1, 2, 3", () => {
    const rows = [
      { id: "a", title: "Section A", type: "SHORT", count: 2, marksEach: 2, order: 1 },
      { id: "b", title: "Section B", type: "LONG", count: 1, marksEach: 4, order: 2 },
    ];
    const n = computeDisplayedPaperNumbering(rows, itemsFor(rows), normalizeNumberingStyle("SECTION_RELATIVE"), "en");
    expect(["a-0", "a-1", "b-0"].map((id) => n.itemNumbers[id].displayLabel)).toEqual(["1", "2", "3"]);
    expect(formatQuestionNumberLegacy(3, "SECTION_RELATIVE", "B", 1)).toBe("3.");
  });

  test("the paper settings schema stores an old section-relative value as continuous", () => {
    expect(paperCreateSchema.shape.numberingStyle.parse("SECTION_RELATIVE")).toBe("CONTINUOUS");
  });
});
