import { describe, expect, it } from "vitest";
import {
  importedQuestionMarks,
  importedQuestionUnits,
  normalizeQuestionType,
  parsePaperJson,
  verifyPaperAgainstBlueprint,
} from "./paperImport";
import type { Blueprint, Chapter } from "./types";

const chapters = [{ id: "c1", number: 1, title: "Light" }] as unknown as Chapter[];
const blueprint = {
  name: "BP",
  book: { title: "Sci" },
  sections: [
    { id: "s1", title: "Section A", type: "MATCH_COLUMN", count: 6, marksEach: 1, position: 0, instructions: "" },
    { id: "s2", title: "Section B", type: "MCQ", count: 2, marksEach: 1, position: 1, instructions: "" },
  ],
  chapters: [{ chapterId: "c1", marks: 8 }],
} as unknown as Blueprint;

const matchQuestion = (marks: unknown) => ({
  text: "Match the following:\nColumn I:\n(A) a\n(B) b\n(C) c\n(D) d\n(E) e\n(F) f",
  type: "MATCH_COLUMN",
  marks,
  options: ["1", "2", "3", "4", "5", "6"],
  answer: "(A)-(iii), (B)-(i), (C)-(ii), (D)-(vi), (E)-(iv), (F)-(v)",
});
const mcqs = [
  { text: "q1", type: "MCQ", marks: 1, options: ["a", "b", "c", "d"], answer: "A" },
  { text: "q2", type: "MCQ", marks: 1, options: ["a", "b", "c", "d"], answer: "B" },
];
const paper = (marks: unknown) =>
  JSON.stringify({ title: "T", sections: [{ title: "Section A", questions: [matchQuestion(marks)] }, { title: "Section B", questions: mcqs }] });

describe("match-the-columns counts as one question worth all its pairs", () => {
  for (const marks of [6, "6 marks", 1]) {
    it(`marks ${JSON.stringify(marks)}: no 'missing' or marks warning`, () => {
      const parsed = parsePaperJson(paper(marks));
      const report = verifyPaperAgainstBlueprint(parsed.paper, blueprint, chapters);
      expect(report.sections[0].importedCount).toBe(6);
      expect(report.sections[0].status).toBe("MATCH");
      expect(report.totalImportedMarks).toBe(8);
      expect(report.warnings.filter((w) => /missing|mismatch|marks each/i.test(w))).toEqual([]);
    });
  }

  it("a match question with only 4 pairs against 6 slots is reported as 4 of 6", () => {
    const q = { ...matchQuestion(6), text: "Match:\nColumn I:\n(A) a\n(B) b\n(C) c\n(D) d", options: ["1", "2", "3", "4"] };
    const sec = blueprint.sections[0];
    expect(importedQuestionUnits(q as never, sec)).toBe(4);
    expect(importedQuestionMarks({ ...q, marks: 1 } as never, sec)).toBe(4);
  });

  it("warns when Column I and Column II lengths differ", () => {
    const bad = JSON.stringify({ title: "T", sections: [{ title: "A", questions: [{ ...matchQuestion(6), options: ["1", "2", "3"] }] }] });
    expect(parsePaperJson(bad).warnings.join(" ")).toMatch(/Column I has \d+ item\(s\) but Column II has \d+/);
  });
});

describe("type names", () => {
  it("'Fill in the blanks' is a fill-in-the-blank, not a long answer", () => {
    expect(normalizeQuestionType("Fill in the blanks")).toBe("FILL_BLANK");
    expect(normalizeQuestionType("LA")).toBe("LONG");
    expect(normalizeQuestionType("Long answer")).toBe("LONG");
  });
});

describe("match question without readable columns", () => {
  const sec = { type: "MATCH_COLUMN", count: 6, marksEach: 1 };
  it("a 6-mark question covers 6 slots; a 1-mark one is a single slot", () => {
    expect(importedQuestionUnits({ type: "MATCH_COLUMN", text: "Match the following", marks: 6 } as never, sec)).toBe(6);
    expect(importedQuestionUnits({ type: "MATCH_COLUMN", text: "Match the following", marks: 1 } as never, sec)).toBe(1);
  });
});

describe("paper completeness engine", () => {
  it("does not report a combined match question as 1 of 6", async () => {
    const { validatePaperCompleteness } = await import("./paperCompletenessEngine");
    const q = {
      type: "MATCH_COLUMN",
      text: "Match:\nColumn I:\n(A) a\n(B) b\n(C) c\n(D) d\n(E) e\n(F) f",
      options: ["1", "2", "3", "4", "5", "6"],
      subparts: [],
    };
    const res = validatePaperCompleteness({
      blueprint: { totalMarks: 6, sections: [{ id: "s1", title: "A", type: "MATCH_COLUMN", count: 6, marksEach: 1 }] },
      items: [{ position: 0, sectionId: "s1", question: q as never }],
    });
    expect(res.structuralCompleteness.issues).toEqual([]);
    expect(res.structuralCompleteness.missingQuestionsCount).toBe(0);
    expect(res.blueprintCompliance.unfulfilledSections).toEqual([]);
  });
});
