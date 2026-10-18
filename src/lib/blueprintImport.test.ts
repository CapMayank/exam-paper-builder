import { describe, expect, it } from "vitest";
import {
  SAMPLE_BLUEPRINT_CSV,
  SAMPLE_BLUEPRINT_JSON,
  matchChaptersToBook,
  normalizeExamType,
  normalizeQuestionType,
  parseBlueprintImport,
} from "./blueprintImport";

describe("blueprintImport", () => {
  describe("Type Normalization", () => {
    it("normalizes diverse question types correctly", () => {
      expect(normalizeQuestionType("MCQ")).toBe("MCQ");
      expect(normalizeQuestionType("Multiple Choice")).toBe("MCQ");
      expect(normalizeQuestionType("objective")).toBe("MCQ");
      expect(normalizeQuestionType("VSA")).toBe("SHORT");
      expect(normalizeQuestionType("Short Answer")).toBe("SHORT");
      expect(normalizeQuestionType("One word")).toBe("SHORT");
      expect(normalizeQuestionType("FILL_BLANK")).toBe("FILL_BLANK");
      expect(normalizeQuestionType("Fill in the blank")).toBe("FILL_BLANK");
      expect(normalizeQuestionType("fib")).toBe("FILL_BLANK");
      expect(normalizeQuestionType("TRUE_FALSE")).toBe("TRUE_FALSE");
      expect(normalizeQuestionType("True / False")).toBe("TRUE_FALSE");
      expect(normalizeQuestionType("tf")).toBe("TRUE_FALSE");
      expect(normalizeQuestionType("DRAW")).toBe("DRAW");
      expect(normalizeQuestionType("Draw / diagram")).toBe("DRAW");
      expect(normalizeQuestionType("sketch")).toBe("DRAW");
      expect(normalizeQuestionType("Long Answer")).toBe("LONG");
      expect(normalizeQuestionType("la")).toBe("LONG");
      expect(normalizeQuestionType("case_study")).toBe("CASE_STUDY");
      expect(normalizeQuestionType("Passage")).toBe("CASE_STUDY");
    });

    it("normalizes diverse exam types correctly", () => {
      expect(normalizeExamType("Annual")).toBe("ANNUAL");
      expect(normalizeExamType("Half Yearly")).toBe("HALF_YEARLY");
      expect(normalizeExamType("Mid-Term")).toBe("HALF_YEARLY");
      expect(normalizeExamType("Periodic Test")).toBe("PERIODIC");
      expect(normalizeExamType("PT")).toBe("PERIODIC");
      expect(normalizeExamType("Unit Test")).toBe("UNIT_TEST");
      expect(normalizeExamType("Pre-Board")).toBe("PRE_BOARD");
      expect(normalizeExamType("Quarterly")).toBe("QUARTERLY");
    });
  });

  describe("Sample JSON Blueprint Parsing", () => {
    it("successfully parses SAMPLE_BLUEPRINT_JSON with multi-type Section A", () => {
      const res = parseBlueprintImport(SAMPLE_BLUEPRINT_JSON, "json");
      expect(res.success).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.blueprint.name).toBe("Class 10 Science Annual Examination");
      expect(res.blueprint.examType).toBe("ANNUAL");
      expect(res.blueprint.durationMin).toBe(180);
      expect(res.blueprint.sections).toHaveLength(8);
      expect(res.totalSectionMarks).toBe(80);
      expect(res.totalQuestions).toBe(39);
      expect(res.blueprint.chapters).toHaveLength(12);
      expect(res.totalChapterMarks).toBe(80);
      expect(res.warnings).toHaveLength(0);

      // Verify Section A contains all 4 distinct question types
      const secA = res.blueprint.sections.filter((s) => s.title === "Section A");
      expect(secA).toHaveLength(4);
      expect(secA.map((s) => s.type)).toEqual(["MCQ", "FILL_BLANK", "TRUE_FALSE", "SHORT"]);
      expect(secA.reduce((sum, s) => sum + s.count * s.marksEach, 0)).toBe(20);
    });

    it("handles section array directly without root wrapper", () => {
      const raw = JSON.stringify([
        {
          title: "Sec A",
          questionTypes: [
            { type: "MCQ", count: 10, marksEach: 1 },
            { type: "FILL_BLANK", count: 5, marksEach: 1 },
          ],
        },
        { title: "Sec B", type: "SHORT", count: 5, marksEach: 2 },
      ]);
      const res = parseBlueprintImport(raw, "json");
      expect(res.success).toBe(true);
      expect(res.blueprint.sections).toHaveLength(3);
      expect(res.totalSectionMarks).toBe(25);
      expect(res.totalQuestions).toBe(20);
    });

    it("detects mark discrepancy between sections and chapters", () => {
      const json = {
        name: "Test Blueprint",
        sections: [{ title: "A", type: "MCQ", count: 10, marksEach: 1 }], // 10 marks
        chapters: [{ chapterNumber: 1, marks: 15 }], // 15 marks
      };
      const res = parseBlueprintImport(JSON.stringify(json), "json");
      expect(res.success).toBe(true);
      expect(res.totalSectionMarks).toBe(10);
      expect(res.totalChapterMarks).toBe(15);
      expect(res.warnings.length).toBeGreaterThan(0);
      expect(res.warnings[0]).toContain("Mark discrepancy");
    });
  });

  describe("Sample CSV Blueprint Parsing", () => {
    it("successfully parses SAMPLE_BLUEPRINT_CSV", () => {
      const res = parseBlueprintImport(SAMPLE_BLUEPRINT_CSV, "csv");
      expect(res.success).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.blueprint.name).toBe("Class 10 Science Annual Examination");
      expect(res.blueprint.examType).toBe("ANNUAL");
      expect(res.blueprint.durationMin).toBe(180);
      expect(res.blueprint.sections).toHaveLength(8);
      expect(res.totalSectionMarks).toBe(80);
      expect(res.totalQuestions).toBe(39);
      expect(res.blueprint.chapters).toHaveLength(12);
      expect(res.totalChapterMarks).toBe(80);

      // Verify Section A question types in CSV
      const secA = res.blueprint.sections.filter((s) => s.title === "Section A");
      expect(secA).toHaveLength(4);
      expect(secA.map((s) => s.type)).toEqual(["MCQ", "FILL_BLANK", "TRUE_FALSE", "SHORT"]);
    });

    it("inherits previous section title when subsequent rows leave SectionTitle blank", () => {
      const rawCsv = `SectionTitle,Type,QuestionCount,MarksEach,Instructions
Section A,MCQ,5,1,Objective questions
,FILL_BLANK,5,1
,TRUE_FALSE,5,1
Section B,SHORT,5,2,Short answers`;
      const res = parseBlueprintImport(rawCsv, "csv");
      expect(res.success).toBe(true);
      expect(res.blueprint.sections).toHaveLength(4);
      const secA = res.blueprint.sections.filter((s) => s.title === "Section A");
      expect(secA).toHaveLength(3);
      expect(secA.map((s) => s.type)).toEqual(["MCQ", "FILL_BLANK", "TRUE_FALSE"]);
    });

    it("parses raw comma-separated section lines without metadata headers", () => {
      const rawCsv = `Section A,MCQ,10,1,All questions are compulsory
Section B,SHORT,5,2,Short answer questions
Section C,LONG,3,5,Answer with detailed diagrams`;
      const res = parseBlueprintImport(rawCsv, "csv");
      expect(res.success).toBe(true);
      expect(res.blueprint.sections).toHaveLength(3);
      expect(res.totalSectionMarks).toBe(35);
      expect(res.totalQuestions).toBe(18);
    });
  });

  describe("Chapter to Book Matching", () => {
    const mockBookChapters = [
      { id: "chap-1", bookId: "b1", number: 1, title: "Chemical Reactions and Equations" },
      { id: "chap-2", bookId: "b1", number: 2, title: "Acids, Bases and Salts" },
      { id: "chap-3", bookId: "b1", number: 3, title: "Metals and Non-metals" },
    ];

    it("matches chapters by number accurately", () => {
      const imported = [
        { chapterNumber: 1, marks: 6 },
        { chapterNumber: 2, marks: 8 },
      ];
      const match = matchChaptersToBook(imported, mockBookChapters);
      expect(match.matchedCount).toBe(2);
      expect(match.unmatchedCount).toBe(0);
      expect(match.marksMap["chap-1"]).toBe(6);
      expect(match.marksMap["chap-2"]).toBe(8);
      expect(match.marksMap["chap-3"]).toBeUndefined();
    });

    it("matches chapters by title when number is missing or different", () => {
      const imported = [
        { chapterTitle: "Acids, Bases and Salts", marks: 10 },
        { chapterTitle: "Chemical Reactions", marks: 5 },
      ];
      const match = matchChaptersToBook(imported, mockBookChapters);
      expect(match.matchedCount).toBe(2);
      expect(match.marksMap["chap-2"]).toBe(10);
      expect(match.marksMap["chap-1"]).toBe(5);
    });
  });

  describe("Adversarial & Corrupt Inputs", () => {
    it("handles empty or whitespace strings gracefully", () => {
      const res = parseBlueprintImport("   ", "auto");
      expect(res.success).toBe(false);
      expect(res.errors[0]).toContain("Input is empty");
    });

    it("handles corrupt JSON with useful syntax error message", () => {
      const res = parseBlueprintImport("{ bad json: true", "json");
      expect(res.success).toBe(false);
      expect(res.errors[0]).toContain("Invalid JSON");
    });
  });
});
