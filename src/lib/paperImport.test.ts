import { describe, expect, it } from "vitest";
import {
  matchQuestionToBlueprintSection,
  normalizeQuestionType,
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

    it("correctly routes questions in composite multi-type sections (e.g. Class 12 Math Section A with MCQ, FIB, TF, Match, Short)", () => {
      const mathChapters: Chapter[] = [
        { id: "ch_m1", bookId: "b_math12", number: 1, title: "Relations and Functions" },
        { id: "ch_m2", bookId: "b_math12", number: 2, title: "Inverse Trigonometric Functions" },
        { id: "ch_m3", bookId: "b_math12", number: 3, title: "Matrices" },
        { id: "ch_m4", bookId: "b_math12", number: 4, title: "Determinants" },
        { id: "ch_m5", bookId: "b_math12", number: 5, title: "Continuity and Differentiability" },
        { id: "ch_m6", bookId: "b_math12", number: 6, title: "Applications of Derivatives" },
        { id: "ch_m7", bookId: "b_math12", number: 7, title: "Integrals" },
        { id: "ch_m8", bookId: "b_math12", number: 8, title: "Applications of Integrals" },
        { id: "ch_m9", bookId: "b_math12", number: 9, title: "Differential Equations" },
        { id: "ch_m10", bookId: "b_math12", number: 10, title: "Vector Algebra" },
        { id: "ch_m11", bookId: "b_math12", number: 11, title: "Three-Dimensional Geometry" },
        { id: "ch_m12", bookId: "b_math12", number: 12, title: "Linear Programming" },
        { id: "ch_m13", bookId: "b_math12", number: 13, title: "Probability" },
      ];

      // Blueprint representing MP Board / CBSE Class 12 Math (8 sections, 50 questions, 80 marks)
      const mathBlueprint: Blueprint = {
        id: "bp_math12",
        name: "Class 12 Mathematics Annual Examination",
        bookId: "b_math12",
        examType: "ANNUAL",
        durationMin: 180,
        subjectCode: "052",
        book: {
          id: "b_math12",
          title: "Mathematics (NCERT Class XII)",
          subject: "Mathematics",
          className: "Class 12",
        },
        sections: [
          { id: "sec_a_mcq", position: 0, title: "Section A", instructions: "Objective", type: "MCQ", count: 6, marksEach: 1 },
          { id: "sec_a_fib", position: 1, title: "Section A", instructions: "Objective", type: "FILL_BLANK", count: 6, marksEach: 1 },
          { id: "sec_a_tf", position: 2, title: "Section A", instructions: "Objective", type: "TRUE_FALSE", count: 6, marksEach: 1 },
          { id: "sec_a_match", position: 3, title: "Section A", instructions: "Objective", type: "MATCH_COLUMN", count: 7, marksEach: 1 },
          { id: "sec_a_short", position: 4, title: "Section A", instructions: "Objective", type: "SHORT", count: 7, marksEach: 1 },
          { id: "sec_b", position: 5, title: "Section B", instructions: "Very short", type: "VERY_SHORT", count: 10, marksEach: 2 },
          { id: "sec_c", position: 6, title: "Section C", instructions: "Short", type: "SHORT", count: 4, marksEach: 3 },
          { id: "sec_d", position: 7, title: "Section D", instructions: "Long", type: "LONG", count: 4, marksEach: 4 },
        ],
        chapters: [
          { chapterId: "ch_m1", marks: 5, chapter: mathChapters[0] },
          { chapterId: "ch_m2", marks: 6, chapter: mathChapters[1] },
          { chapterId: "ch_m3", marks: 6, chapter: mathChapters[2] },
          { chapterId: "ch_m4", marks: 6, chapter: mathChapters[3] },
          { chapterId: "ch_m5", marks: 8, chapter: mathChapters[4] },
          { chapterId: "ch_m6", marks: 6, chapter: mathChapters[5] },
          { chapterId: "ch_m7", marks: 12, chapter: mathChapters[6] },
          { chapterId: "ch_m8", marks: 3, chapter: mathChapters[7] },
          { chapterId: "ch_m9", marks: 6, chapter: mathChapters[8] },
          { chapterId: "ch_m10", marks: 7, chapter: mathChapters[9] },
          { chapterId: "ch_m11", marks: 7, chapter: mathChapters[10] },
          { chapterId: "ch_m12", marks: 3, chapter: mathChapters[11] },
          { chapterId: "ch_m13", marks: 5, chapter: mathChapters[12] },
        ],
        _count: { papers: 1 },
      };

      // Imported paper JSON structure with 4 sections where Section A contains 32 questions of 5 different types
      const importedJson = {
        title: "Class 12 Mathematics Annual Examination 2026–27",
        sections: [
          {
            title: "Section A",
            questions: [
              // 6 MCQs
              ...Array.from({ length: 6 }, (_, i) => ({
                text: `MCQ question ${i + 1}`,
                type: "MCQ",
                marks: 1,
                chapterNumber: 1,
                options: ["A", "B", "C", "D"],
                answer: "A",
              })),
              // 6 Fill in the Blanks
              ...Array.from({ length: 6 }, (_, i) => ({
                text: `Fill blank question ${i + 1} ________`,
                type: "FILL_BLANK",
                marks: 1,
                chapterNumber: 2,
                answer: "ans",
              })),
              // 6 True/False
              ...Array.from({ length: 6 }, (_, i) => ({
                text: `True or false question ${i + 1}`,
                type: "TRUE_FALSE",
                marks: 1,
                chapterNumber: 3,
                answer: "True",
              })),
              // 7 Match Column
              ...Array.from({ length: 7 }, (_, i) => ({
                text: `Match column question ${i + 1}`,
                type: "MATCH_COLUMN",
                marks: 1,
                chapterNumber: 4,
                answer: "Match",
              })),
              // 7 One-Word / Short
              ...Array.from({ length: 7 }, (_, i) => ({
                text: `Short answer question ${i + 1}`,
                type: "SHORT",
                marks: 1,
                chapterNumber: 5,
                answer: "Answer",
              })),
            ],
          },
          {
            title: "Section B",
            questions: Array.from({ length: 10 }, (_, i) => ({
              text: `Section B Very Short question ${i + 1}`,
              type: "VERY_SHORT",
              marks: 2,
              chapterNumber: 6,
              answer: "Answer",
            })),
          },
          {
            title: "Section C",
            questions: Array.from({ length: 4 }, (_, i) => ({
              text: `Section C Short question ${i + 1}`,
              type: "SHORT",
              marks: 3,
              chapterNumber: 7,
              answer: "Answer",
            })),
          },
          {
            title: "Section D",
            questions: Array.from({ length: 4 }, (_, i) => ({
              text: `Section D Long question ${i + 1}`,
              type: "LONG",
              marks: 4,
              chapterNumber: 9,
              answer: "Answer",
            })),
          },
        ],
      };

      const parsed = parsePaperJson(JSON.stringify(importedJson));
      expect(parsed.success).toBe(true);
      expect(parsed.totalQuestions).toBe(50);
      expect(parsed.totalMarks).toBe(80);

      const report = verifyPaperAgainstBlueprint(parsed.paper, mathBlueprint, mathChapters);
      expect(report.isValid).toBe(true);
      expect(report.canProceed).toBe(true);
      expect(report.matchPercentage).toBe(100);
      expect(report.totalImportedQuestions).toBe(50);
      expect(report.totalBlueprintQuestions).toBe(50);
      expect(report.totalImportedMarks).toBe(80);
      expect(report.totalBlueprintMarks).toBe(80);

      // Verify every blueprint section has 100% MATCH
      expect(report.sections).toHaveLength(8);
      for (const sec of report.sections) {
        expect(sec.status).toBe("MATCH");
        expect(sec.importedCount).toBe(sec.expectedCount);
      }

      // Check specific slot counts
      const mcqSec = report.sections.find((s) => s.expectedType === "MCQ");
      expect(mcqSec?.importedCount).toBe(6);

      const fibSec = report.sections.find((s) => s.expectedType === "FILL_BLANK");
      expect(fibSec?.importedCount).toBe(6);

      const tfSec = report.sections.find((s) => s.expectedType === "TRUE_FALSE");
      expect(tfSec?.importedCount).toBe(6);

      const matchSec = report.sections.find((s) => s.expectedType === "MATCH_COLUMN");
      expect(matchSec?.importedCount).toBe(7);

      const shortSecA = report.sections.find((s) => s.expectedType === "SHORT" && s.expectedMarksEach === 1);
      expect(shortSecA?.importedCount).toBe(7);

      const veryShortSecB = report.sections.find((s) => s.expectedType === "VERY_SHORT" && s.expectedMarksEach === 2);
      expect(veryShortSecB?.importedCount).toBe(10);

      const shortSecC = report.sections.find((s) => s.expectedType === "SHORT" && s.expectedMarksEach === 3);
      expect(shortSecC?.importedCount).toBe(4);

      const longSecD = report.sections.find((s) => s.expectedType === "LONG" && s.expectedMarksEach === 4);
      expect(longSecD?.importedCount).toBe(4);
    });

    it("handles overflow within matching type without spilling into different types", () => {
      const bpSections = [
        { id: "s_mcq", position: 0, title: "Section A", type: "MCQ", count: 5, marksEach: 1 },
        { id: "s_fib", position: 1, title: "Section A", type: "FILL_BLANK", count: 5, marksEach: 1 },
      ];
      const allocated = new Map<string, number>();

      // 5 MCQs fill quota
      for (let i = 0; i < 5; i++) {
        const match = matchQuestionToBlueprintSection(
          { text: `Q${i}`, type: "MCQ", marks: 1 },
          "Section A",
          0,
          bpSections,
          allocated
        );
        expect(match?.id).toBe("s_mcq");
        allocated.set(match!.id, (allocated.get(match!.id) ?? 0) + 1);
      }

      // 6th MCQ should remain in s_mcq as overflow rather than stealing s_fib
      const overflowMcq = matchQuestionToBlueprintSection(
        { text: "Q6", type: "MCQ", marks: 1 },
        "Section A",
        0,
        bpSections,
        allocated
      );
      expect(overflowMcq?.id).toBe("s_mcq");

      // Fill in blank question should route to s_fib
      const fibQ = matchQuestionToBlueprintSection(
        { text: "Q7", type: "FILL_BLANK", marks: 1 },
        "Section A",
        0,
        bpSections,
        allocated
      );
      expect(fibQ?.id).toBe("s_fib");
    });

    it("smartly routes questions respecting marks hierarchy (Very Short / 1m vs Short / 2m)", () => {
      const bpSections = [
        { id: "sec_a", position: 0, title: "Section A", type: "VERY_SHORT", count: 10, marksEach: 1 },
        { id: "sec_b", position: 1, title: "Section B", type: "SHORT", count: 10, marksEach: 2 },
        { id: "sec_c", position: 2, title: "Section C", type: "SHORT", count: 5, marksEach: 3 },
        { id: "sec_d", position: 3, title: "Section D", type: "LONG", count: 3, marksEach: 5 },
      ];
      const allocated = new Map<string, number>();

      // Question labeled "SHORT" with 1 mark in Section A routes to sec_a (1m)
      const q1 = matchQuestionToBlueprintSection(
        { text: "What is Ohm's law?", type: "SHORT", marks: 1 },
        "Section A",
        0,
        bpSections,
        allocated
      );
      expect(q1?.id).toBe("sec_a");

      // Question labeled "SHORT" with 1 mark without section title still routes to sec_a (1m)
      const q2 = matchQuestionToBlueprintSection(
        { text: "Name the unit of power.", type: "SHORT", marks: 1 },
        "",
        0,
        bpSections,
        allocated
      );
      expect(q2?.id).toBe("sec_a");

      // Question labeled "VERY_SHORT" with 2 marks routes to sec_b (2m) because Short has more marks
      const q3 = matchQuestionToBlueprintSection(
        { text: "Differentiate between scalar and vector quantities.", type: "VERY_SHORT", marks: 2 },
        "",
        1,
        bpSections,
        allocated
      );
      expect(q3?.id).toBe("sec_b");

      // Question with 3 marks routes to sec_c (3m)
      const q4 = matchQuestionToBlueprintSection(
        { text: "Derive lens formula.", type: "SHORT", marks: 3 },
        "Section C",
        2,
        bpSections,
        allocated
      );
      expect(q4?.id).toBe("sec_c");
    });

    it("verifies the exact user prompt JSON for Class 12 Mathematics Annual Examination", () => {
      const userPromptJson = {
        title: "Class 12 Mathematics Annual Examination 2026–27",
        examType: "ANNUAL",
        academicSession: "2026–27",
        schoolName: "Board of Secondary Education, Madhya Pradesh, Bhopal",
        examDate: "2027-03-01",
        paperSet: "SET A",
        subjectCode: "052",
        layout: "BOOKLET_A4",
        sections: [
          {
            title: "Section A",
            instructions: "Question Nos. 1 to 5: Total 32 objective-type questions, each carrying 1 mark.",
            questions: [
              { text: "Let R be a relation on N...", type: "MCQ", marks: 1, chapterNumber: 1, options: ["A", "B", "C", "D"], answer: "A" },
              { text: "If A and B are symmetric matrices...", type: "MCQ", marks: 1, chapterNumber: 3, options: ["A", "B", "C", "D"], answer: "A" },
              { text: "The derivative of cos(√x)...", type: "MCQ", marks: 1, chapterNumber: 5, options: ["A", "B", "C", "D"], answer: "A" },
              { text: "The value of ∫ e^x [f(x) + f'(x)] dx...", type: "MCQ", marks: 1, chapterNumber: 7, options: ["A", "B", "C", "D"], answer: "A" },
              { text: "The integrating factor of the differential equation...", type: "MCQ", marks: 1, chapterNumber: 9, options: ["A", "B", "C", "D"], answer: "A" },
              { text: "If P(A) = 0.5, P(B) = 0.4...", type: "MCQ", marks: 1, chapterNumber: 13, options: ["A", "B", "C", "D"], answer: "A" },

              { text: "The principal value branch of cos⁻¹(x) is ________.", type: "FILL_BLANK", marks: 1, chapterNumber: 2, answer: "[0, π]" },
              { text: "A square matrix A is said to be singular if |A| = ________.", type: "FILL_BLANK", marks: 1, chapterNumber: 3, answer: "0" },
              { text: "A polynomial function is ________ at every point of its domain.", type: "FILL_BLANK", marks: 1, chapterNumber: 5, answer: "continuous" },
              { text: "The value of ∫ tan(x) dx is ________.", type: "FILL_BLANK", marks: 1, chapterNumber: 7, answer: "log|sec(x)| + C" },
              { text: "The degree of the differential equation y'' + (y')² + 2y = 0 is ________.", type: "FILL_BLANK", marks: 1, chapterNumber: 9, answer: "1" },
              { text: "In a Linear Programming Problem, the linear function Z = ax + by...", type: "FILL_BLANK", marks: 1, chapterNumber: 12, answer: "objective" },

              { text: "sin⁻¹(x) + cos⁻¹(x) = π/2 for x ∈ [-1, 1].", type: "TRUE_FALSE", marks: 1, chapterNumber: 2, answer: "True" },
              { text: "Every scalar matrix is an identity matrix.", type: "TRUE_FALSE", marks: 1, chapterNumber: 3, answer: "False" },
              { text: "The function f(x) = x³ is strictly increasing on R.", type: "TRUE_FALSE", marks: 1, chapterNumber: 6, answer: "True" },
              { text: "∫_0^a f(x) dx = ∫_0^a f(a-x) dx.", type: "TRUE_FALSE", marks: 1, chapterNumber: 7, answer: "True" },
              { text: "The scalar product of two mutually perpendicular non-zero vectors is 1.", type: "TRUE_FALSE", marks: 1, chapterNumber: 10, answer: "False" },
              { text: "The direction ratios of the line joining points...", type: "TRUE_FALSE", marks: 1, chapterNumber: 11, answer: "True" },

              { text: "Match the following: A relation which is reflexive...", type: "MATCH_COLUMN", marks: 1, chapterNumber: 1, answer: "Equivalence" },
              { text: "Match the following: Domain of sin⁻¹(x).", type: "MATCH_COLUMN", marks: 1, chapterNumber: 2, answer: "[-1, 1]" },
              { text: "Match the following: Area of a triangle whose vertices are collinear.", type: "MATCH_COLUMN", marks: 1, chapterNumber: 4, answer: "0" },
              { text: "Match the following: The rate of change of area of a circle...", type: "MATCH_COLUMN", marks: 1, chapterNumber: 6, answer: "4π" },
              { text: "Match the following: ∫ 1/(x² + a²) dx.", type: "MATCH_COLUMN", marks: 1, chapterNumber: 7, answer: "(1/a) tan⁻¹(x/a) + C" },
              { text: "Match the following: ∫ 1/√(a² - x²) dx.", type: "MATCH_COLUMN", marks: 1, chapterNumber: 7, answer: "sin⁻¹(x/a) + C" },
              { text: "Match the following: Magnitude of the cross product...", type: "MATCH_COLUMN", marks: 1, chapterNumber: 10, answer: "1" },

              { text: "Let f(x) = x² and g(x) = sin(x). Find (g o f)(x).", type: "SHORT", marks: 1, chapterNumber: 1, answer: "sin(x²)" },
              { text: "Write the value of tan⁻¹(1).", type: "SHORT", marks: 1, chapterNumber: 2, answer: "π/4" },
              { text: "If |A| = 5 for a 2x2 matrix, what is the value of |3A|?", type: "SHORT", marks: 1, chapterNumber: 4, answer: "45" },
              { text: "Find the value of ∫_{-1}^{1} x³ cos(x) dx.", type: "SHORT", marks: 1, chapterNumber: 7, answer: "0" },
              { text: "Write the formula for the area bounded by the curve...", type: "SHORT", marks: 1, chapterNumber: 8, answer: "∫_a^b y dx" },
              { text: "What are the direction cosines of the x-axis?", type: "SHORT", marks: 1, chapterNumber: 11, answer: "1, 0, 0" },
              { text: "If P(E) = 0.2, what is P(not E)?", type: "SHORT", marks: 1, chapterNumber: 13, answer: "0.8" },
            ],
          },
          {
            title: "Section B",
            instructions: "Very short answer questions carrying 2 marks each.",
            questions: [
              { text: "Show that the function f: N → N...", type: "VERY_SHORT", marks: 2, chapterNumber: 1, answer: "one-one" },
              { text: "Find the principal value of cosec⁻¹(-√2).", type: "VERY_SHORT", marks: 2, chapterNumber: 2, answer: "-π/4" },
              { text: "Differentiate sin(cos(x²)) with respect to x.", type: "VERY_SHORT", marks: 2, chapterNumber: 5, answer: "dy/dx" },
              { text: "Find the slope of the tangent to the curve...", type: "VERY_SHORT", marks: 2, chapterNumber: 6, answer: "11" },
              { text: "Find the intervals in which f(x) = x² - 4x + 6 is strictly increasing.", type: "VERY_SHORT", marks: 2, chapterNumber: 6, answer: "(2, ∞)" },
              { text: "Evaluate ∫ x log(x) dx.", type: "VERY_SHORT", marks: 2, chapterNumber: 7, answer: "Integral" },
              { text: "Find the area of the region bounded by y = x²...", type: "VERY_SHORT", marks: 2, chapterNumber: 8, answer: "32/3" },
              { text: "Find the projection of the vector a on vector b.", type: "VERY_SHORT", marks: 2, chapterNumber: 10, answer: "10/√6" },
              { text: "Find the vector equation of the line...", type: "VERY_SHORT", marks: 2, chapterNumber: 11, answer: "r = a + λb" },
              { text: "Define optimal solution in linear programming.", type: "VERY_SHORT", marks: 2, chapterNumber: 12, answer: "optimal" },
            ],
          },
          {
            title: "Section C",
            instructions: "Short answer questions carrying 3 marks each.",
            questions: [
              { text: "Express matrix A as sum of symmetric and skew-symmetric.", type: "SHORT", marks: 3, chapterNumber: 3, answer: "P + Q" },
              { text: "Find the area of a triangle having vertices A, B, C.", type: "SHORT", marks: 3, chapterNumber: 10, answer: "√21/2" },
              { text: "Find the shortest distance between the lines.", type: "SHORT", marks: 3, chapterNumber: 11, answer: "3√2/2" },
              { text: "An urn contains 5 red and 5 black balls...", type: "SHORT", marks: 3, chapterNumber: 13, answer: "1/2" },
            ],
          },
          {
            title: "Section D",
            instructions: "Long answer questions carrying 4 marks each.",
            questions: [
              { text: "Solve system of equations by matrix method.", type: "LONG", marks: 4, chapterNumber: 4, answer: "x=1, y=2, z=3" },
              { text: "If y = (tan⁻¹x)², show differential relation.", type: "LONG", marks: 4, chapterNumber: 5, answer: "proved" },
              { text: "Evaluate ∫_{0}^{π/4} log(1 + tan(x)) dx.", type: "LONG", marks: 4, chapterNumber: 7, answer: "π/8 log 2" },
              { text: "Solve differential equation x(dy/dx) + y = x cos(x) + sin(x).", type: "LONG", marks: 4, chapterNumber: 9, answer: "y = sin x" },
            ],
          },
        ],
      };

      const parsed = parsePaperJson(JSON.stringify(userPromptJson));
      expect(parsed.success).toBe(true);
      expect(parsed.totalQuestions).toBe(50);
      expect(parsed.totalMarks).toBe(80);

      const exactChapters: Chapter[] = [
        { id: "ch1", bookId: "b_math12", number: 1, title: "Relations and Functions" },
        { id: "ch2", bookId: "b_math12", number: 2, title: "Inverse Trigonometric Functions" },
        { id: "ch3", bookId: "b_math12", number: 3, title: "Matrices" },
        { id: "ch4", bookId: "b_math12", number: 4, title: "Determinants" },
        { id: "ch5", bookId: "b_math12", number: 5, title: "Continuity and Differentiability" },
        { id: "ch6", bookId: "b_math12", number: 6, title: "Applications of Derivatives" },
        { id: "ch7", bookId: "b_math12", number: 7, title: "Integrals" },
        { id: "ch8", bookId: "b_math12", number: 8, title: "Applications of Integrals" },
        { id: "ch9", bookId: "b_math12", number: 9, title: "Differential Equations" },
        { id: "ch10", bookId: "b_math12", number: 10, title: "Vector Algebra" },
        { id: "ch11", bookId: "b_math12", number: 11, title: "Three-Dimensional Geometry" },
        { id: "ch12", bookId: "b_math12", number: 12, title: "Linear Programming" },
        { id: "ch13", bookId: "b_math12", number: 13, title: "Probability" },
      ];

      const mathBlueprint: Blueprint = {
        id: "bp_math12_exact",
        name: "Class 12 Mathematics Annual Examination",
        bookId: "b_math12",
        examType: "ANNUAL",
        durationMin: 180,
        subjectCode: "052",
        book: {
          id: "b_math12",
          title: "Mathematics (NCERT Class XII)",
          subject: "Mathematics",
          className: "Class 12",
        },
        sections: [
          { id: "sec_a_mcq", position: 0, title: "Section A", instructions: "Objective", type: "MCQ", count: 6, marksEach: 1 },
          { id: "sec_a_fib", position: 1, title: "Section A", instructions: "Objective", type: "FILL_BLANK", count: 6, marksEach: 1 },
          { id: "sec_a_tf", position: 2, title: "Section A", instructions: "Objective", type: "TRUE_FALSE", count: 6, marksEach: 1 },
          { id: "sec_a_match", position: 3, title: "Section A", instructions: "Objective", type: "MATCH_COLUMN", count: 7, marksEach: 1 },
          { id: "sec_a_short", position: 4, title: "Section A", instructions: "Objective", type: "SHORT", count: 7, marksEach: 1 },
          { id: "sec_b", position: 5, title: "Section B", instructions: "Very short", type: "VERY_SHORT", count: 10, marksEach: 2 },
          { id: "sec_c", position: 6, title: "Section C", instructions: "Short", type: "SHORT", count: 4, marksEach: 3 },
          { id: "sec_d", position: 7, title: "Section D", instructions: "Long", type: "LONG", count: 4, marksEach: 4 },
        ],
        chapters: exactChapters.map((ch, idx) => ({
          chapterId: ch.id,
          marks: [5, 6, 6, 6, 8, 6, 12, 3, 6, 7, 7, 3, 5][idx],
          chapter: { id: ch.id, number: ch.number, title: ch.title },
        })),
        _count: { papers: 1 },
      };

      const report = verifyPaperAgainstBlueprint(parsed.paper, mathBlueprint, exactChapters);

      expect(report.isValid).toBe(true);
      expect(report.canProceed).toBe(true);
      expect(report.matchPercentage).toBe(100);
      expect(report.warnings).toHaveLength(0);
      expect(report.errors).toHaveLength(0);

      // Verify that every question went to its exact section without any being forced into MCQ
      const mcqResult = report.sections.find((s) => s.blueprintSectionId === "sec_a_mcq");
      expect(mcqResult?.importedCount).toBe(6);
      expect(mcqResult?.status).toBe("MATCH");

      const fibResult = report.sections.find((s) => s.blueprintSectionId === "sec_a_fib");
      expect(fibResult?.importedCount).toBe(6);
      expect(fibResult?.status).toBe("MATCH");

      const tfResult = report.sections.find((s) => s.blueprintSectionId === "sec_a_tf");
      expect(tfResult?.importedCount).toBe(6);
      expect(tfResult?.status).toBe("MATCH");

      const matchResult = report.sections.find((s) => s.blueprintSectionId === "sec_a_match");
      expect(matchResult?.importedCount).toBe(7);
      expect(matchResult?.status).toBe("MATCH");

      const shortResult = report.sections.find((s) => s.blueprintSectionId === "sec_a_short");
      expect(shortResult?.importedCount).toBe(7);
      expect(shortResult?.status).toBe("MATCH");

      const bResult = report.sections.find((s) => s.blueprintSectionId === "sec_b");
      expect(bResult?.importedCount).toBe(10);
      expect(bResult?.status).toBe("MATCH");

      const cResult = report.sections.find((s) => s.blueprintSectionId === "sec_c");
      expect(cResult?.importedCount).toBe(4);
      expect(cResult?.status).toBe("MATCH");

      const dResult = report.sections.find((s) => s.blueprintSectionId === "sec_d");
      expect(dResult?.importedCount).toBe(4);
      expect(dResult?.status).toBe("MATCH");
    });
  });
});
