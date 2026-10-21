import { describe, expect, it } from "vitest";
import {
  SAMPLE_BLUEPRINT_CSV,
  SAMPLE_BLUEPRINT_JSON,
  SAMPLE_ENGLISH_BLUEPRINT_JSON,
  SAMPLE_HINDI_BLUEPRINT_JSON,
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

    it("successfully parses SAMPLE_ENGLISH_BLUEPRINT_JSON with skills and literature sections totaling 80m", () => {
      const res = parseBlueprintImport(SAMPLE_ENGLISH_BLUEPRINT_JSON, "json");
      expect(res.success).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.blueprint.name).toBe("Class 12 English Annual Examination (MP Board / CBSE)");
      expect(res.blueprint.examType).toBe("ANNUAL");
      expect(res.blueprint.durationMin).toBe(180);
      expect(res.blueprint.subjectCode).toBe("052");
      expect(res.totalSectionMarks).toBe(80);
      expect(res.totalQuestions).toBe(16);
      expect(res.blueprint.chapters).toHaveLength(22);
      expect(res.totalChapterMarks).toBe(80);
      expect(res.warnings).toHaveLength(0);

      // Section A (14 marks): 1x10 CASE_STUDY + 1x4 LONG
      const secA = res.blueprint.sections.filter((s) => s.title.includes("Section A"));
      expect(secA).toHaveLength(2);
      expect(secA.reduce((sum, s) => sum + s.count * s.marksEach, 0)).toBe(14);

      // Section B (12 marks): 3x4 LONG
      const secB = res.blueprint.sections.filter((s) => s.title.includes("Section B"));
      expect(secB).toHaveLength(1);
      expect(secB.reduce((sum, s) => sum + s.count * s.marksEach, 0)).toBe(12);

      // Section C (10 marks): 2x5 CASE_STUDY
      const secC = res.blueprint.sections.filter((s) => s.title.includes("Section C"));
      expect(secC).toHaveLength(1);
      expect(secC.reduce((sum, s) => sum + s.count * s.marksEach, 0)).toBe(10);

      // Section D (44 marks): 9 question type entries
      const secD = res.blueprint.sections.filter((s) => s.title.includes("Section D"));
      expect(secD).toHaveLength(9);
      expect(secD.reduce((sum, s) => sum + s.count * s.marksEach, 0)).toBe(44);
    });

    it("successfully parses SAMPLE_HINDI_BLUEPRINT_JSON with 4 sections totaling 80m and 9 units totaling 80m", () => {
      const res = parseBlueprintImport(SAMPLE_HINDI_BLUEPRINT_JSON, "json");
      expect(res.success).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.blueprint.name).toBe("Class 12 Hindi Annual Examination (MP Board) 2025–26");
      expect(res.blueprint.examType).toBe("ANNUAL");
      expect(res.blueprint.durationMin).toBe(180);
      expect(res.blueprint.academicSession).toBe("2025–26");
      expect(res.blueprint.subjectCode).toBe("051");
      expect(res.totalSectionMarks).toBe(80);
      expect(res.totalChapterMarks).toBe(80);
      expect(res.warnings).toHaveLength(0);

      // Section A: 32 objective questions (6 MCQ + 6 FIB + 6 TF + 7 Match + 7 Short/VSA = 32m)
      const secA = res.blueprint.sections.filter((s) => s.title.includes("खण्ड अ"));
      expect(secA).toHaveLength(5);
      expect(secA.reduce((sum, s) => sum + s.count * s.marksEach, 0)).toBe(32);

      // Section B: 10 x 2m = 20m
      const secB = res.blueprint.sections.filter((s) => s.title.includes("खण्ड ब"));
      expect(secB).toHaveLength(1);
      expect(secB[0].count).toBe(10);
      expect(secB[0].marksEach).toBe(2);

      // Section C: 4 x 3m = 12m
      const secC = res.blueprint.sections.filter((s) => s.title.includes("खण्ड स"));
      expect(secC).toHaveLength(1);
      expect(secC[0].count).toBe(4);
      expect(secC[0].marksEach).toBe(3);

      // Section D: 4 x 4m = 16m
      const secD = res.blueprint.sections.filter((s) => s.title.includes("खण्ड द"));
      expect(secD).toHaveLength(1);
      expect(secD[0].count).toBe(4);
      expect(secD[0].marksEach).toBe(4);

      // 9 Syllabus units exactly matching the MP Board Blueprint syllabus
      expect(res.blueprint.chapters).toHaveLength(9);
      expect(res.blueprint.chapters[0].chapterTitle).toBe("आरोह भाग – 2 (काव्य खंड)");
      expect(res.blueprint.chapters[0].marks).toBe(17);
      expect(res.blueprint.chapters[1].chapterTitle).toBe("काव्य बोध");
      expect(res.blueprint.chapters[1].marks).toBe(9);
      expect(res.blueprint.chapters[2].chapterTitle).toBe("आरोह भाग – 2 (गद्य खंड)");
      expect(res.blueprint.chapters[2].marks).toBe(17);
      expect(res.blueprint.chapters[3].chapterTitle).toBe("भाषा बोध");
      expect(res.blueprint.chapters[3].marks).toBe(12);
      expect(res.blueprint.chapters[4].chapterTitle).toBe("वितान भाग – 2");
      expect(res.blueprint.chapters[4].marks).toBe(7);
      expect(res.blueprint.chapters[5].chapterTitle).toBe("अभिव्यक्ति और माध्यम");
      expect(res.blueprint.chapters[5].marks).toBe(7);
      expect(res.blueprint.chapters[6].chapterTitle).toBe("अपठित बोध (गद्यांश / काव्यांश)");
      expect(res.blueprint.chapters[6].marks).toBe(3);
      expect(res.blueprint.chapters[7].chapterTitle).toBe("पत्र लेखन (औपचारिक / अनौपचारिक)");
      expect(res.blueprint.chapters[7].marks).toBe(4);
      expect(res.blueprint.chapters[8].chapterTitle).toBe("निबंध लेखन एवं रूपरेखा");
      expect(res.blueprint.chapters[8].marks).toBe(4);
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

  describe("Blueprint JSON Export & Round-Trip Compatibility", () => {
    it("exports blueprint to canonical JSON that parses back cleanly without errors", async () => {
      const { exportBlueprintToJsonObject, exportBlueprintToJsonString, getBlueprintJsonFilename } = await import("./blueprintExport");

      const mockBp = {
        name: "Class 10 Science Annual Examination",
        examType: "ANNUAL",
        durationMin: 180,
        academicSession: "2026–27",
        subjectCode: "086",
        book: {
          className: "Class 10",
          subject: "Science",
          title: "NCERT Science Class 10",
        },
        sections: [
          { position: 0, title: "Section A", instructions: "All compulsory", type: "MCQ", count: 10, marksEach: 1 },
          { position: 1, title: "Section A", instructions: "All compulsory", type: "FILL_BLANK", count: 10, marksEach: 1 },
          { position: 2, title: "Section B", instructions: "Short answer", type: "SHORT", count: 15, marksEach: 2 },
        ],
        chapters: [
          { marks: 20, chapter: { number: 1, title: "Chemical Reactions" } },
          { marks: 30, chapter: { number: 2, title: "Acids and Bases" } },
        ],
      };

      const jsonObj = exportBlueprintToJsonObject(mockBp);
      expect(jsonObj.name).toBe("Class 10 Science Annual Examination");
      expect(jsonObj.sections.length).toBe(2); // Grouped into Section A and Section B
      expect(jsonObj.sections[0].questionTypes.length).toBe(2); // Section A has MCQ + FILL_BLANK
      expect(jsonObj.chapters.length).toBe(2);

      const jsonStr = exportBlueprintToJsonString(mockBp);
      expect(jsonStr).toContain('"name": "Class 10 Science Annual Examination"');

      // Round-trip parse check
      const parseResult = parseBlueprintImport(jsonStr, "json");
      expect(parseResult.success).toBe(true);
      expect(parseResult.errors).toEqual([]);
      expect(parseResult.totalSectionMarks).toBe(50); // (10*1) + (10*1) + (15*2) = 50
      expect(parseResult.totalChapterMarks).toBe(50); // 20 + 30 = 50
      expect(parseResult.totalQuestions).toBe(35); // 10 + 10 + 15 = 35

      const filename = getBlueprintJsonFilename(mockBp, mockBp.book);
      expect(filename).toBe("Class_10_Science_ANNUAL_Blueprint.json");
    });
  });
});
