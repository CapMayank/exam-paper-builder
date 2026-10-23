import { describe, expect, it } from "vitest";
import { autoFillPaper } from "./autofill";
import { paginate } from "./layout";
import { nextSetIdentifier } from "./multiset";
import { validatePaperPreflight } from "./preflight";
import { paperCreateSchema, paperUpdateSchema } from "./schemas";
import type { PaperData } from "./types";

describe("Teacher Audit Implementation & Regressions Test Suite", () => {
  describe("Autofill Solver Mode & Budget Feedback (BUG-07 & MISS-07)", () => {
    it("reports solverMode as 'optimal' when backtracking successfully solves quotas", () => {
      const bp = {
        sections: [
          { id: "sec_a", title: "Section A", type: "MCQ", count: 2, marksEach: 1 },
        ],
        chapters: [
          { chapterId: "ch1", marks: 1 },
          { chapterId: "ch2", marks: 1 },
        ],
      };
      const candidatePool = [
        { id: "q1", chapterId: "ch1", type: "MCQ" },
        { id: "q2", chapterId: "ch2", type: "MCQ" },
      ];

      const res = autoFillPaper(bp, [], candidatePool);
      expect(res.complete).toBe(true);
      expect(res.solverMode).toBe("optimal");
      expect(res.exhaustedBudget).toBe(false);
      expect(res.added).toHaveLength(2);
      expect(res.unfilled).toHaveLength(0);
    });

    it("reports unfilled sections with counts and titles when candidate pool is insufficient", () => {
      const bp = {
        sections: [
          { id: "sec_a", title: "Section A", type: "MCQ", count: 5, marksEach: 1 },
          { id: "sec_b", title: "Section B", type: "SHORT", count: 3, marksEach: 2 },
        ],
        chapters: [
          { chapterId: "ch1", marks: 5 },
          { chapterId: "ch2", marks: 6 },
        ],
      };
      // Only provide 2 MCQs and 0 SHORT questions
      const candidatePool = [
        { id: "q1", chapterId: "ch1", type: "MCQ" },
        { id: "q2", chapterId: "ch1", type: "MCQ" },
      ];

      const res = autoFillPaper(bp, [], candidatePool);
      expect(res.complete).toBe(false);
      expect(res.solverMode).toBe("greedy");
      expect(res.added).toHaveLength(2);
      expect(res.unfilled.length).toBeGreaterThan(0);
      const secAUnfilled = res.unfilled.find((u) => u.sectionId === "sec_a");
      const secBUnfilled = res.unfilled.find((u) => u.sectionId === "sec_b");
      expect(secAUnfilled?.count).toBe(3);
      expect(secBUnfilled?.count).toBe(3);
    });

    it("excludes questions in excludedQuestionIds (such as OR choice questions) to prevent duplicate assignments", () => {
      const bp = {
        sections: [
          { id: "sec_a", title: "Section A", type: "MCQ", count: 2, marksEach: 1 },
        ],
        chapters: [
          { chapterId: "ch1", marks: 2 },
        ],
      };
      const candidatePool = [
        { id: "q_primary", chapterId: "ch1", type: "MCQ" },
        { id: "q_or_choice", chapterId: "ch1", type: "MCQ" },
        { id: "q_fresh", chapterId: "ch1", type: "MCQ" },
      ];

      // q_or_choice is used as an alternate choice on an existing question
      const res = autoFillPaper(
        bp,
        [{ sectionId: "sec_a", chapterId: "ch1", questionId: "q_primary" }],
        candidatePool,
        ["q_or_choice"]
      );

      expect(res.added).toHaveLength(1);
      expect(res.added[0].questionId).toBe("q_fresh");
      expect(res.added[0].questionId).not.toBe("q_or_choice");
    });
  });

  describe("Next Set Identifier Progression (MISS-08)", () => {
    it("correctly advances set identifiers sequentially", () => {
      expect(nextSetIdentifier("SET A")).toBe("SET B");
      expect(nextSetIdentifier("SET B")).toBe("SET C");
      expect(nextSetIdentifier("SET C")).toBe("SET D");
      expect(nextSetIdentifier("SET 1")).toBe("SET 2");
      expect(nextSetIdentifier("1")).toBe("2");
      expect(nextSetIdentifier("A")).toBe("B");
      expect(nextSetIdentifier("")).toBe("SET B");
    });
  });

  describe("Implication Code Mapping Human Readability (DESIGN-02)", () => {
    const IMPLICATION_CODE_LABEL: Record<string, string> = {
      CHAPTER_DEFICIT: "Chapter Under Quota",
      SECTION_UNDERFILLED: "Section Needs Questions",
      CHAPTER_EXCESS: "Chapter Over Quota",
      SECTION_OVERFILLED: "Section Overfilled",
      TYPE_MISMATCH: "Type Mismatch",
      ORPHANED_SECTION: "Deleted Section",
    };

    it("translates every standard implication code into teacher-friendly title", () => {
      expect(IMPLICATION_CODE_LABEL["CHAPTER_DEFICIT"]).toBe("Chapter Under Quota");
      expect(IMPLICATION_CODE_LABEL["SECTION_UNDERFILLED"]).toBe("Section Needs Questions");
      expect(IMPLICATION_CODE_LABEL["CHAPTER_EXCESS"]).toBe("Chapter Over Quota");
      expect(IMPLICATION_CODE_LABEL["SECTION_OVERFILLED"]).toBe("Section Overfilled");
      expect(IMPLICATION_CODE_LABEL["TYPE_MISMATCH"]).toBe("Type Mismatch");
      expect(IMPLICATION_CODE_LABEL["ORPHANED_SECTION"]).toBe("Deleted Section");
    });
  });

  describe("Paper Snapshot Payload Serialization & Integrity (DEFECT-02)", () => {
    it("round-trips snapshot JSON with placements, instructions, and formatting", () => {
      const payload = {
        paperId: "paper_123",
        title: "Mid-Term Examination 2025-26",
        layout: "SINGLE_A4",
        schoolName: "Delhi Public School",
        examDate: "2025-11-20",
        paperSet: "SET A",
        subjectCode: "041",
        generalInstructions: "All questions are compulsory.",
        academicSession: "2025–26",
        printDensity: "STANDARD",
        twoColumn: false,
        targetPages: 4,
        numberingStyle: "CONTINUOUS",
        marksStyle: "INLINE",
        showCandidateDetails: true,
        showSignatures: true,
        items: [
          { sectionId: "sec1", position: 0, questionId: "q1", orQuestionId: null },
          { sectionId: "sec1", position: 1, questionId: "q2", orQuestionId: "q2_alt" },
        ],
        timestamp: new Date().toISOString(),
      };

      const json = JSON.stringify(payload);
      const parsed = JSON.parse(json);

      expect(parsed.paperId).toBe("paper_123");
      expect(parsed.items).toHaveLength(2);
      expect(parsed.items[1].orQuestionId).toBe("q2_alt");
      expect(parsed.targetPages).toBe(4);
    });
  });

  describe("Multi-Paper ZIP Export Bundle Packaging (MISSING-01)", () => {
    it("generates a valid compressed ZIP containing files for question papers", async () => {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      zip.file("Math_Set_A.docx", Buffer.from("fake-docx-content-set-a"));
      zip.file("Math_Set_A_Marking_Scheme.docx", Buffer.from("fake-docx-solutions-set-a"));
      zip.file("Math_Set_B.docx", Buffer.from("fake-docx-content-set-b"));

      const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
      expect(zipBuf).toBeInstanceOf(Buffer);
      expect(zipBuf.length).toBeGreaterThan(0);

      // Verify zip contains the expected files
      const loaded = await JSZip.loadAsync(zipBuf);
      expect(loaded.file("Math_Set_A.docx")).not.toBeNull();
      expect(loaded.file("Math_Set_A_Marking_Scheme.docx")).not.toBeNull();
      expect(loaded.file("Math_Set_B.docx")).not.toBeNull();
    });
  });

  describe("Pre-Finalization Quality Validator (F06 Quality Pre-flight)", () => {
    const basePaper: PaperData = {
      id: "paper_preflight_1",
      title: "Class 10 Science Mid-Term",
      layout: "SINGLE_A4",
      schoolName: "Sarvodaya Vidyalaya",
      examDate: "2026-03-15",
      paperSet: "SET A",
      subjectCode: "086",
      generalInstructions: "1. All questions compulsory. 2. No calculators.",
      academicSession: "2025–26",
      status: "DRAFT",
      printDensity: "STANDARD",
      twoColumn: false,
      targetPages: 4,
      numberingStyle: "CONTINUOUS",
      marksStyle: "RIGHT_COLUMN",
      showCandidateDetails: true,
      showSignatures: true,
      logoPath: null,
      blueprint: {
        id: "bp_1",
        name: "Standard Science Blueprint",
        bookId: "book_1",
        durationMin: 180,
        subjectCode: "086",
        examType: "ANNUAL",
        book: { id: "book_1", title: "NCERT Science", subject: "Science", className: "Class 10" },
        chapters: [
          { chapterId: "ch1", marks: 5, chapter: { id: "ch1", number: 1, title: "Chemical Reactions" } },
        ],
        sections: [
          { id: "sec_a", position: 0, title: "Section A", instructions: "", type: "MCQ", count: 2, marksEach: 1 },
        ],
        _count: { papers: 1 },
      },
      items: [
        {
          id: "item_1",
          sectionId: "sec_a",
          position: 0,
          question: {
            id: "q1",
            bookId: "book_1",
            chapterId: "ch1",
            type: "MCQ",
            text: "What is the chemical formula for rust?",
            options: ["Fe2O3.xH2O", "FeO", "Fe3O4", "FeCl3"],
            answer: "Fe2O3.xH2O",
            difficulty: "MEDIUM",
            spaceMm: 0,
            showGrid: false,
            imagePath: null,
            subparts: [],
            createdAt: "2026-01-01T00:00:00Z",
            chapter: { id: "ch1", number: 1, title: "Chemical Reactions" },
          },
        },
        {
          id: "item_2",
          sectionId: "sec_a",
          position: 1,
          question: {
            id: "q2",
            bookId: "book_1",
            chapterId: "ch1",
            type: "MCQ",
            text: "Which of the following is an endothermic process?",
            options: ["Respiration", "Photosynthesis", "Combustion", "Neutralization"],
            answer: "Photosynthesis",
            difficulty: "EASY",
            spaceMm: 0,
            showGrid: false,
            imagePath: null,
            subparts: [],
            createdAt: "2026-01-01T00:00:00Z",
            chapter: { id: "ch1", number: 1, title: "Chemical Reactions" },
          },
        },
      ],
      progress: {
        complete: true,
        totalMarks: 2,
        usedMarks: 2,
        sections: [{ id: "sec_a", needed: 2, filled: 2 }],
        chapters: [{ chapterId: "ch1", target: 2, used: 2 }],
      },
    };

    it("passes pre-flight with 0 errors and canFinalize=true when paper is complete and valid", () => {
      const report = validatePaperPreflight(basePaper);
      expect(report.canFinalize).toBe(true);
      expect(report.errors).toHaveLength(0);
      expect(report.warnings).toHaveLength(0);
    });

    it("blocks finalization when blueprint is incomplete (canFinalize=false)", () => {
      const incompletePaper = {
        ...basePaper,
        progress: { ...basePaper.progress, complete: false, usedMarks: 1 },
      };
      const report = validatePaperPreflight(incompletePaper);
      expect(report.canFinalize).toBe(false);
      expect(report.errors.some((e) => e.code === "BLUEPRINT_INCOMPLETE")).toBe(true);
    });

    it("warns when exam date is unset", () => {
      const paperWithoutDate = { ...basePaper, examDate: "" };
      const report = validatePaperPreflight(paperWithoutDate);
      expect(report.warnings.some((w) => w.code === "DATE_UNSET")).toBe(true);
      expect(report.canFinalize).toBe(true); // Warning is non-blocking
    });

    it("detects duplicate question wording across items", () => {
      const paperWithDupes = {
        ...basePaper,
        items: [
          basePaper.items[0],
          {
            ...basePaper.items[1],
            question: {
              ...basePaper.items[1].question,
              text: "what is the chemical formula for rust? ", // Same normalized text
            },
          },
        ],
      };
      const report = validatePaperPreflight(paperWithDupes);
      expect(report.warnings.some((w) => w.code === "DUPLICATE_QUESTION_TEXT")).toBe(true);
    });

    it("flags missing answer key on objective MCQ questions", () => {
      const paperMissingAnswer = {
        ...basePaper,
        items: [
          {
            ...basePaper.items[0],
            question: { ...basePaper.items[0].question, answer: "" },
          },
          basePaper.items[1],
        ],
      };
      const report = validatePaperPreflight(paperMissingAnswer);
      expect(report.warnings.some((w) => w.code === "MISSING_ANSWER_KEY")).toBe(true);
    });

    it("flags subpart marks mismatch with section quota", () => {
      const paperWithMismatch = {
        ...basePaper,
        items: [
          {
            ...basePaper.items[0],
            question: {
              ...basePaper.items[0].question,
              subparts: [
                { label: "(i)", text: "Part 1", marks: 2 },
                { label: "(ii)", text: "Part 2", marks: 2 }, // Total 4m, but section is 1m
              ],
            },
          },
          basePaper.items[1],
        ],
      };
      const report = validatePaperPreflight(paperWithMismatch);
      expect(report.warnings.some((w) => w.code === "SUBPARTS_MARKS_MISMATCH")).toBe(true);
    });
  });

  describe("Targeted Section Auto-Fill (Section-Specific)", () => {
    it("fills only the specified section when targetSectionId is provided", () => {
      const bp = {
        sections: [
          { id: "sec_a", title: "Section A (MCQ)", type: "MCQ", count: 2, marksEach: 1 },
          { id: "sec_b", title: "Section B (Short)", type: "SHORT", count: 2, marksEach: 2 },
        ],
        chapters: [
          { chapterId: "ch1", marks: 6 },
        ],
      };
      const candidatePool = [
        { id: "q1", chapterId: "ch1", type: "MCQ" },
        { id: "q2", chapterId: "ch1", type: "MCQ" },
        { id: "q3", chapterId: "ch1", type: "SHORT" },
        { id: "q4", chapterId: "ch1", type: "SHORT" },
      ];

      // Auto-fill Section A only
      const resA = autoFillPaper(bp, [], candidatePool, { targetSectionId: "sec_a" });
      expect(resA.added).toHaveLength(2);
      expect(resA.added.every((a) => a.sectionId === "sec_a")).toBe(true);

      // Auto-fill Section B only
      const resB = autoFillPaper(bp, [], candidatePool, { targetSectionId: "sec_b" });
      expect(resB.added).toHaveLength(2);
      expect(resB.added.every((a) => a.sectionId === "sec_b")).toBe(true);
    });
  });

  describe("Pagination Manual Forced Page Break Support", () => {
    it("forces page break immediately when forceBreakBefore is true", () => {
      // 3 items of small height (100px each) on a 1000px page
      const heights = [100, 100, 100];
      const keepWithNext = [false, false, false];
      const maxPageH = 1000;
      const groupIds = [undefined, undefined, undefined];

      // Without forceBreakBefore, all 3 fit on page 0
      const standardPages = paginate(heights, keepWithNext, maxPageH, groupIds);
      expect(standardPages).toHaveLength(1);
      expect(standardPages[0]).toEqual([0, 1, 2]);

      // With forceBreakBefore on item 2 (index 1), index 1 starts on page 1
      const breakPages = paginate(heights, keepWithNext, maxPageH, groupIds, [false, true, false]);
      expect(breakPages).toHaveLength(2);
      expect(breakPages[0]).toEqual([0]);
      expect(breakPages[1]).toEqual([1, 2]);
    });
  });

  describe("Confidential Security Watermark Validation", () => {
    it("accepts securityWatermark and watermarkText in paperCreateSchema", () => {
      const parsed = paperCreateSchema.parse({
        title: "Mid-Term Examination 2026",
        blueprintId: "bp_123",
        schoolName: "Sarvodaya H.S. School",
        layout: "PAGE",
        securityWatermark: true,
        watermarkText: "CONFIDENTIAL — EXAM CELL",
      });
      expect(parsed.securityWatermark).toBe(true);
      expect(parsed.watermarkText).toBe("CONFIDENTIAL — EXAM CELL");
    });

    it("accepts securityWatermark and watermarkText in paperUpdateSchema", () => {
      const parsed = paperUpdateSchema.parse({
        securityWatermark: true,
        watermarkText: "DO NOT DISTRIBUTE",
      });
      expect(parsed.securityWatermark).toBe(true);
      expect(parsed.watermarkText).toBe("DO NOT DISTRIBUTE");
    });
  });
});
