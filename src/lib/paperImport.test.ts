import { describe, expect, it } from "vitest";
import {
  parsePaperCsv,
  parsePaperImport,
  parsePaperJson,
  parsePaperText,
  SAMPLE_PAPER_CSV,
  SAMPLE_PAPER_JSON,
  SAMPLE_PAPER_TEXT,
  verifyPaperAgainstBlueprint,
} from "./paperImport";
import type { Blueprint, Chapter } from "./types";

describe("Paper Import & Blueprint Verification Engine", () => {
  // ---------------------------------------------------------------------------
  // 1. JSON Parsing Tests
  // ---------------------------------------------------------------------------
  describe("1. JSON Format Parsing", () => {
    it("successfully parses sample CBSE JSON format with sections, MCQs, and subparts", () => {
      const result = parsePaperJson(SAMPLE_PAPER_JSON);
      expect(result.success).toBe(true);
      expect(result.format).toBe("json");
      expect(result.paper.title).toBe("Science Half-Yearly Examination 2026–27");
      expect(result.paper.sections.length).toBe(5);
      expect(result.totalQuestions).toBe(11);
      expect(result.totalMarks).toBe(24);

      // Section A: 5 MCQs
      const secA = result.paper.sections[0];
      expect(secA.title).toBe("Section A");
      expect(secA.questions.length).toBe(5);
      expect(secA.questions[0].type).toBe("MCQ");
      expect(secA.questions[0].options?.length).toBe(4);
      expect(secA.questions[0].answer).toBe("A");

      // Section C: OR question
      const secC = result.paper.sections[2];
      const qWithOr = secC.questions.find((q) => q.orQuestion !== undefined);
      expect(qWithOr).toBeDefined();
      expect(qWithOr?.orQuestion?.text).toContain("autotrophs");

      // Section E: Case Study with 3 subparts
      const secE = result.paper.sections[4];
      expect(secE.questions[0].type).toBe("CASE_STUDY");
      expect(secE.questions[0].subparts?.length).toBe(3);
      expect(secE.questions[0].subparts?.[0].label).toBe("(i)");
    });

    it("handles malformed JSON syntax gracefully with clear error message", () => {
      const result = parsePaperJson("{ invalid json");
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("JSON syntax error");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CSV Parsing Tests
  // ---------------------------------------------------------------------------
  describe("2. CSV Format Parsing", () => {
    it("successfully parses sample CSV format with pipe-separated options and answers", () => {
      const result = parsePaperCsv(SAMPLE_PAPER_CSV);
      expect(result.success).toBe(true);
      expect(result.format).toBe("csv");
      expect(result.paper.sections.length).toBe(5);
      expect(result.totalQuestions).toBe(11);

      const secA = result.paper.sections.find((s) => s.title === "Section A");
      expect(secA).toBeDefined();
      expect(secA?.questions.length).toBe(5);
      expect(secA?.questions[0].options?.length).toBe(4);
      expect(secA?.questions[0].options?.[0]).toBe("Hydrogen");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Text & Markdown Parsing Tests
  // ---------------------------------------------------------------------------
  describe("3. Markdown & Text Format Parsing", () => {
    it("successfully parses markdown question paper with section headers and question lines", () => {
      const result = parsePaperText(SAMPLE_PAPER_TEXT);
      expect(result.success).toBe(true);
      expect(result.format).toBe("text");
      expect(result.paper.title).toBe("Science Half-Yearly Examination 2026–27");
      expect(result.paper.sections.length).toBe(5);
      expect(result.totalQuestions).toBe(11);

      // Section A options parsed
      const secA = result.paper.sections[0];
      expect(secA.questions[0].options?.length).toBe(4);
      expect(secA.questions[0].answer).toBe("(A)");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Unified Auto-Detection Parser
  // ---------------------------------------------------------------------------
  describe("4. Unified Parser Auto-Detection", () => {
    it("automatically identifies JSON, CSV and Text formats", () => {
      const resJson = parsePaperImport(SAMPLE_PAPER_JSON);
      expect(resJson.format).toBe("json");

      const resCsv = parsePaperImport(SAMPLE_PAPER_CSV);
      expect(resCsv.format).toBe("csv");

      const resText = parsePaperImport(SAMPLE_PAPER_TEXT);
      expect(resText.format).toBe("text");
    });

    it("rejects blank input cleanly", () => {
      const res = parsePaperImport("   ");
      expect(res.success).toBe(false);
      expect(res.errors[0]).toContain("empty");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Blueprint Verification & Invariant Matching
  // ---------------------------------------------------------------------------
  describe("5. Blueprint Verification & Matching Engine", () => {
    const mockBookChapters: Chapter[] = [
      { id: "ch_1", bookId: "b_1", number: 1, title: "Chemical Reactions and Equations" },
      { id: "ch_2", bookId: "b_1", number: 2, title: "Acids, Bases and Salts" },
      { id: "ch_3", bookId: "b_1", number: 3, title: "Metals and Non-metals" },
      { id: "ch_6", bookId: "b_1", number: 6, title: "Life Processes" },
      { id: "ch_10", bookId: "b_1", number: 10, title: "Light – Reflection and Refraction" },
      { id: "ch_12", bookId: "b_1", number: 12, title: "Electricity" },
    ];

    const mockBlueprint: Blueprint = {
      id: "bp_1",
      name: "Class 10 Science 20-Mark Term Blueprint",
      bookId: "b_1",
      examType: "TERM_1",
      durationMin: 60,
      subjectCode: "086",
      book: { id: "b_1", title: "NCERT Science Class X", subject: "Science", className: "Class 10" },
      sections: [
        { id: "s_a", position: 0, title: "Section A", instructions: "", type: "MCQ", count: 5, marksEach: 1 },
        { id: "s_b", position: 1, title: "Section B", instructions: "", type: "SHORT", count: 2, marksEach: 2 },
        { id: "s_c", position: 2, title: "Section C", instructions: "", type: "SHORT", count: 2, marksEach: 3 },
        { id: "s_d", position: 3, title: "Section D", instructions: "", type: "LONG", count: 1, marksEach: 5 },
        { id: "s_e", position: 4, title: "Section E", instructions: "", type: "CASE_STUDY", count: 1, marksEach: 4 },
      ],
      chapters: [
        { chapterId: "ch_1", marks: 3, chapter: mockBookChapters[0] }, // Ch 1: 1m (MCQ) + 2m (Short) = 3m
        { chapterId: "ch_2", marks: 4, chapter: mockBookChapters[1] }, // Ch 2: 1m (MCQ) + 3m (Short) = 4m
        { chapterId: "ch_3", marks: 1, chapter: mockBookChapters[2] }, // Ch 3: 1m (MCQ) = 1m
        { chapterId: "ch_6", marks: 8, chapter: mockBookChapters[3] }, // Ch 6: 1m (MCQ) + 3m (Short) + 4m (Case) = 8m
        { chapterId: "ch_10", marks: 5, chapter: mockBookChapters[4] }, // Ch 10: 5m (Long) = 5m
        { chapterId: "ch_12", marks: 3, chapter: mockBookChapters[5] }, // Ch 12: 1m (MCQ) + 2m (Short) = 3m
      ], // Total chapter marks = 3 + 4 + 1 + 8 + 5 + 3 = 24 marks? Wait: 1+2 = 3; 1+3 = 4; 1; 1+3+4 = 8; 5; 1+2 = 3. Wait 3+4+1+8+5+3 = 24.
      // Wait, let's check blueprint total marks: 5*1 + 2*2 + 2*3 + 1*5 + 1*4 = 5 + 4 + 6 + 5 + 4 = 24 marks!
      _count: { papers: 1 },
    };

    it("verifies 100% exact match when paper perfectly conforms to blueprint sections and chapters", () => {
      // Create a paper that matches exactly 24 marks
      const parsed = parsePaperJson(SAMPLE_PAPER_JSON);
      expect(parsed.success).toBe(true);

      const report = verifyPaperAgainstBlueprint(parsed.paper, mockBlueprint, mockBookChapters);

      expect(report.isValid).toBe(true);
      expect(report.canProceed).toBe(true);
      expect(report.totalImportedQuestions).toBe(11);
      expect(report.totalBlueprintQuestions).toBe(11);

      // Check section statuses
      for (const s of report.sections) {
        expect(s.status).toBe("MATCH");
      }
    });

    it("detects underfilled sections and flags appropriate warnings", () => {
      const parsed = parsePaperJson(SAMPLE_PAPER_JSON);
      // Remove questions from Section A
      parsed.paper.sections[0].questions = parsed.paper.sections[0].questions.slice(0, 2); // 2 out of 5

      const report = verifyPaperAgainstBlueprint(parsed.paper, mockBlueprint, mockBookChapters);
      const secA = report.sections.find((s) => s.sectionTitle === "Section A");
      expect(secA?.status).toBe("UNDERFILLED");
      expect(secA?.importedCount).toBe(2);
      expect(secA?.expectedCount).toBe(5);
      expect(report.warnings.some((w) => w.includes("Section A"))).toBe(true);
    });

    it("detects chapter quota deficits and excesses", () => {
      const parsed = parsePaperJson(SAMPLE_PAPER_JSON);
      // Give chapter 1 extra marks
      parsed.paper.sections[1].questions[0].marks = 10; // Ch 1 now has 1 + 10 = 11m instead of 3m

      const report = verifyPaperAgainstBlueprint(parsed.paper, mockBlueprint, mockBookChapters);
      const ch1 = report.chapters.find((c) => c.chapterId === "ch_1");
      expect(ch1?.status).toBe("EXCESS");
      expect(ch1?.difference).toBe(8); // +8m excess
    });

    it("extracts and resolves examType across JSON, Text, and paper title fallbacks", async () => {
      const {
        inferExamTypeFromText,
        resolvePaperExamType,
        normalizeMcqAnswer,
        formatQuestionNumber,
      } = await import("./constants");

      const jsonParsed = parsePaperJson(SAMPLE_PAPER_JSON);
      expect(jsonParsed.paper.examType).toBe("HALF_YEARLY");

      expect(inferExamTypeFromText("Science Half-Yearly Examination 2026-27")).toBe("HALF_YEARLY");
      expect(inferExamTypeFromText("Quarterly Unit Test 1")).toBe("QUARTERLY");
      expect(inferExamTypeFromText("Class 10 Annual Board Exam")).toBe("ANNUAL");

      // Explicit paper.examType takes precedence over title and blueprint
      expect(
        resolvePaperExamType({
          examType: "QUARTERLY",
          title: "Science Half-Yearly Examination",
          blueprint: { examType: "ANNUAL" },
        }),
      ).toBe("QUARTERLY");

      // Inferred from title when paper.examType is empty
      expect(
        resolvePaperExamType({
          examType: "",
          title: "Science Half-Yearly Examination 2026–27",
          blueprint: { examType: "ANNUAL" },
        }),
      ).toBe("HALF_YEARLY");

      // Falls back to blueprint.examType when neither paper.examType nor title specifies a term
      expect(
        resolvePaperExamType({
          examType: "",
          title: "Class 10 Science Set A",
          blueprint: { examType: "QUARTERLY" },
        }),
      ).toBe("QUARTERLY");

      // MCQ normalization
      expect(normalizeMcqAnswer("(b)", ["Opt 1", "Opt 2", "Opt 3", "Opt 4"])).toEqual({
        letter: "B",
        optionText: "Opt 2",
        display: "(B)",
      });

      // Question numbering styles
      expect(formatQuestionNumber(5, "CONTINUOUS")).toBe("5.");
      expect(formatQuestionNumber(5, "PREFIXED")).toBe("Q.5");
      expect(formatQuestionNumber(5, "SECTION_RELATIVE", "B", 2)).toBe("B2.");
    });
  });
});
