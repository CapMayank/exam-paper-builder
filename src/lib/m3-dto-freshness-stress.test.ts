import { describe, expect, it } from "vitest";
import {
  findFreshnessConflicts,
  isExhaustedUsage,
  parseCompactExamTag,
  type CurrentPaperContext,
} from "../components/QuestionUsageHistory";
import { toQuestionDto, type QuestionDto } from "./dto";
import type { QuestionUsageTag } from "./types";

describe("Milestone 3 Challenger M3.2: DTO Compatibility & Freshness Stress", () => {
  // Baseline 7 properties established in Milestone 2
  const BASELINE_KEYS = [
    "paperId",
    "paperTitle",
    "paperSet",
    "examDate",
    "academicSession",
    "className",
    "isOrChoice",
  ];

  describe("1. Strict DTO Backward Compatibility & Object Equality", () => {
    it("preserves exact 7-key object equality when status and subject are undefined or omitted", () => {
      const mockPrismaQuestion = {
        id: "q_legacy_strict_1",
        bookId: "b1",
        chapterId: "c1",
        type: "SHORT",
        text: "What is Ohm's law?",
        optionsJson: "[]",
        answer: "V = IR",
        difficulty: "MEDIUM",
        imagePath: null,
        spaceMm: 25,
        showGrid: false,
        subpartsJson: "[]",
        createdById: "teacher_1",
        createdAt: new Date("2025-05-01T00:00:00Z"),
        paperQuestions: [
          {
            paperId: "paper_legacy_1",
            orQuestionId: null,
            paper: {
              title: "Quarterly Exam 2025",
              paperSet: "A",
              examDate: "2025-08-20",
              academicSession: "2025–26",
              blueprint: {
                book: {
                  className: "Class 10",
                },
              },
            },
          },
        ],
      };

      const dto = toQuestionDto(mockPrismaQuestion);
      expect(dto.usages).toBeDefined();
      expect(dto.usages).toHaveLength(1);

      const usage = dto.usages![0];
      const keys = Object.keys(usage).sort();
      expect(keys).toEqual([...BASELINE_KEYS].sort());
      expect(keys.length).toBe(7);

      // Verify strict toEqual equality matching existing tests (m2-guardrails.test.ts)
      expect(usage).toEqual({
        paperId: "paper_legacy_1",
        paperTitle: "Quarterly Exam 2025",
        paperSet: "A",
        examDate: "2025-08-20",
        academicSession: "2025–26",
        className: "Class 10",
        isOrChoice: false,
      });

      // Strict check that neither status nor subject exists as own properties (not even undefined)
      expect(Object.prototype.hasOwnProperty.call(usage, "status")).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(usage, "subject")).toBe(false);
    });

    it("does not attach status or subject if explicitly undefined, null, or empty string", () => {
      const mockWithEmptyOrNull = {
        id: "q_null_fields",
        bookId: "b1",
        chapterId: "c1",
        type: "MCQ",
        text: "Select correct option",
        optionsJson: '["A", "B"]',
        answer: "A",
        difficulty: "EASY",
        imagePath: null,
        spaceMm: 0,
        showGrid: false,
        subpartsJson: "[]",
        createdById: "teacher_1",
        createdAt: "2025-05-01",
        paperQuestions: [
          {
            paperId: "paper_null_1",
            orQuestionId: null,
            paper: {
              title: "Test Exam",
              paperSet: "B",
              examDate: "2025-09-01",
              academicSession: "2025–26",
              status: undefined,
              blueprint: {
                book: {
                  className: "Class 12",
                  subject: undefined,
                },
              },
            },
          },
          {
            paperId: "paper_empty_string",
            orQuestionId: null,
            paper: {
              title: "Test Exam 2",
              paperSet: "C",
              examDate: "2025-09-10",
              academicSession: "2025–26",
              status: "" as any,
              blueprint: {
                book: {
                  className: "Class 12",
                  subject: "" as any,
                },
              },
            },
          },
        ],
      };

      const dto = toQuestionDto(mockWithEmptyOrNull);
      expect(dto.usages).toHaveLength(2);

      for (const usage of dto.usages!) {
        expect(Object.keys(usage).length).toBe(7);
        expect(Object.prototype.hasOwnProperty.call(usage, "status")).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(usage, "subject")).toBe(false);
      }
    });

    it("handles missing paper or missing blueprint gracefully in toQuestionDto", () => {
      const mockWithMissingRelations = {
        id: "q_sparse_1",
        bookId: "b1",
        chapterId: "c1",
        type: "SHORT",
        text: "Sparse question",
        optionsJson: "[]",
        answer: "Sparse answer",
        difficulty: "EASY",
        imagePath: null,
        spaceMm: 10,
        showGrid: false,
        createdById: "teacher_1",
        createdAt: new Date(),
        paperQuestions: [
          {
            paperId: "paper_no_paper_obj",
            orQuestionId: null,
            // paper property is undefined
          },
          {
            paperId: "paper_no_blueprint",
            orQuestionId: null,
            paper: {
              title: "No Blueprint Paper",
              paperSet: "Set 1",
              examDate: "2025-10-01",
              // blueprint omitted
            },
          },
        ],
      };

      const dto = toQuestionDto(mockWithMissingRelations as any);
      expect(dto.usages).toHaveLength(2);

      expect(dto.usages![0]).toEqual({
        paperId: "paper_no_paper_obj",
        paperTitle: "",
        paperSet: "",
        examDate: "",
        academicSession: "2025–26",
        className: "",
        isOrChoice: false,
      });

      expect(dto.usages![1]).toEqual({
        paperId: "paper_no_blueprint",
        paperTitle: "No Blueprint Paper",
        paperSet: "Set 1",
        examDate: "2025-10-01",
        academicSession: "2025–26",
        className: "",
        isOrChoice: false,
      });
    });

    it("correctly attaches status and subject when present on Prisma input", () => {
      const mockPrismaQuestion = {
        id: "q_full_enrichment",
        bookId: "b1",
        chapterId: "c1",
        type: "LONG",
        text: "Explain cellular respiration in detail.",
        optionsJson: "[]",
        answer: "Glycolysis, Krebs cycle, and electron transport chain...",
        difficulty: "HARD",
        imagePath: null,
        spaceMm: 60,
        showGrid: false,
        subpartsJson: "[]",
        createdById: "teacher_1",
        createdAt: new Date(),
        paperQuestions: [
          {
            paperId: "paper_p1",
            orQuestionId: null,
            paper: {
              title: "Quarterly Examination 2025",
              paperSet: "Set A",
              examDate: "2025-08-25",
              academicSession: "2025–26",
              status: "FINAL",
              blueprint: {
                book: {
                  className: "Class 10",
                  subject: "Science",
                },
              },
            },
          },
          {
            paperId: "paper_p2",
            orQuestionId: null,
            paper: {
              title: "Periodic Assessment",
              paperSet: "Set 1",
              examDate: "2025-07-15",
              academicSession: "2025–26",
              status: "DRAFT",
              blueprint: {
                book: {
                  className: "Class 10",
                  subject: "Science",
                },
              },
            },
          },
        ],
      };

      const dto = toQuestionDto(mockPrismaQuestion);
      expect(dto.usages).toHaveLength(2);

      const finalUsage = dto.usages![0];
      expect(Object.keys(finalUsage).length).toBe(9);
      expect(finalUsage.status).toBe("FINAL");
      expect(finalUsage.subject).toBe("Science");
      expect(finalUsage).toEqual({
        paperId: "paper_p1",
        paperTitle: "Quarterly Examination 2025",
        paperSet: "Set A",
        examDate: "2025-08-25",
        academicSession: "2025–26",
        className: "Class 10",
        status: "FINAL",
        subject: "Science",
        isOrChoice: false,
      });

      const draftUsage = dto.usages![1];
      expect(draftUsage.status).toBe("DRAFT");
      expect(draftUsage.subject).toBe("Science");
    });
  });

  describe("2. OR-Choice Questions (isOrChoice: true) Exhaustion & Tracking", () => {
    const currentPaper: CurrentPaperContext = {
      id: "paper_active_annual_2026",
      academicSession: "2025–26",
      className: "Class 10",
      subject: "Science",
    };

    it("flags question as isOrChoice: true when matched via orQuestionId in paperQuestions", () => {
      const qId = "q_or_option_101";
      const mockPrisma = {
        id: qId,
        bookId: "b1",
        chapterId: "c1",
        type: "SHORT",
        text: "Alternative question text",
        optionsJson: "[]",
        answer: "Ans",
        difficulty: "MEDIUM",
        imagePath: null,
        spaceMm: 20,
        showGrid: false,
        subpartsJson: "[]",
        createdById: "teacher_1",
        createdAt: new Date(),
        paperQuestions: [
          {
            paperId: "paper_halfyearly_2025",
            orQuestionId: qId, // points to this question as the OR-choice
            paper: {
              title: "Half-Yearly Exam 2025",
              paperSet: "Set A",
              examDate: "2025-10-15",
              academicSession: "2025–26",
              status: "FINAL",
              blueprint: {
                book: {
                  className: "Class 10",
                  subject: "Science",
                },
              },
            },
          },
        ],
      };

      const dto = toQuestionDto(mockPrisma);
      expect(dto.usages).toBeDefined();
      expect(dto.usages![0].isOrChoice).toBe(true);

      // Verify that this OR-choice usage triggers exhaustion in the current paper
      expect(isExhaustedUsage(dto.usages![0], currentPaper)).toBe(true);
    });

    it("flags question as isOrChoice: true when coming via orPaperQuestions relation", () => {
      const qId = "q_or_rel_202";
      const mockPrisma = {
        id: qId,
        bookId: "b1",
        chapterId: "c1",
        type: "LONG",
        text: "Long alternative question",
        optionsJson: "[]",
        answer: "Long ans",
        difficulty: "HARD",
        imagePath: null,
        spaceMm: 50,
        showGrid: false,
        subpartsJson: "[]",
        createdById: "teacher_1",
        createdAt: new Date(),
        orPaperQuestions: [
          {
            paperId: "paper_quarterly_2025",
            orQuestionId: qId,
            paper: {
              title: "Quarterly Exam 2025",
              paperSet: "Set B",
              examDate: "2025-08-20",
              academicSession: "2025–26",
              status: "FINAL",
              blueprint: {
                book: {
                  className: "Class 10",
                  subject: "Science",
                },
              },
            },
          },
        ],
      };

      const dto = toQuestionDto(mockPrisma);
      expect(dto.usages).toBeDefined();
      expect(dto.usages![0].isOrChoice).toBe(true);
      expect(dto.usages![0].status).toBe("FINAL");
      expect(dto.usages![0].subject).toBe("Science");

      // Verify that OR-choice usage triggers exhaustion
      expect(isExhaustedUsage(dto.usages![0], currentPaper)).toBe(true);
    });

    it("does NOT mark OR-choice question as exhausted if prior paper was DRAFT", () => {
      const orUsageDraft: QuestionUsageTag = {
        paperId: "paper_draft_or_test",
        paperTitle: "Unit Test 1 (Draft)",
        paperSet: "Set 1",
        examDate: "2025-07-10",
        academicSession: "2025–26",
        className: "Class 10",
        subject: "Science",
        status: "DRAFT",
        isOrChoice: true,
      };

      expect(isExhaustedUsage(orUsageDraft, currentPaper)).toBe(false);

      // But it DOES trigger a freshness conflict advisory
      const conflicts = findFreshnessConflicts([orUsageDraft], currentPaper);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].paperId).toBe("paper_draft_or_test");
      expect(conflicts[0].isOrChoice).toBe(true);
    });

    it("does NOT mark OR-choice question as exhausted if used in current paper itself", () => {
      const orUsageSelf: QuestionUsageTag = {
        paperId: "paper_active_annual_2026", // matches currentPaper.id
        paperTitle: "Annual Exam 2026",
        paperSet: "Set A",
        examDate: "2026-03-01",
        academicSession: "2025–26",
        className: "Class 10",
        subject: "Science",
        status: "FINAL",
        isOrChoice: true,
      };

      expect(isExhaustedUsage(orUsageSelf, currentPaper)).toBe(false);
      expect(findFreshnessConflicts([orUsageSelf], currentPaper)).toHaveLength(0);
    });
  });

  describe("3. Mixed Question Sets & Freshness Conflict Scenarios", () => {
    const currentPaper: CurrentPaperContext = {
      id: "paper_board_target_2025_26",
      academicSession: "2025–26",
      className: "Class 10",
      subject: "Science",
    };

    it("accurately categorizes questions in a heterogeneous question bank", () => {
      type QuestionWithUsage = QuestionDto & { expectedExhausted: boolean; expectedConflict: boolean };

      const questionBank: QuestionWithUsage[] = [
        // Q1: Fresh question, never used
        {
          id: "q_brand_new",
          bookId: "b1",
          chapterId: "c1",
          type: "MCQ",
          text: "Never used before",
          options: ["A", "B"],
          answer: "A",
          difficulty: "EASY",
          imagePath: null,
          spaceMm: 0,
          showGrid: false,
          createdAt: "2025-01-01",
          subparts: [],
          usages: [],
          expectedExhausted: false,
          expectedConflict: false,
        },
        // Q2: Used last year (2024–25), finalized
        {
          id: "q_last_year",
          bookId: "b1",
          chapterId: "c1",
          type: "SHORT",
          text: "Used last academic year",
          options: [],
          answer: "Ans",
          difficulty: "MEDIUM",
          imagePath: null,
          spaceMm: 20,
          showGrid: false,
          createdAt: "2024-06-01",
          subparts: [],
          usages: [
            {
              paperId: "paper_annual_2024_25",
              paperTitle: "Annual Exam 2025",
              paperSet: "Set 1",
              examDate: "2025-03-15",
              academicSession: "2024–25",
              className: "Class 10",
              subject: "Science",
              status: "FINAL",
              isOrChoice: false,
            },
          ],
          expectedExhausted: false,
          expectedConflict: false,
        },
        // Q3: Used in earlier exam this session (Quarterly, Class 10, Science, FINAL) -> EXHAUSTED
        {
          id: "q_exhausted_quarterly",
          bookId: "b1",
          chapterId: "c1",
          type: "SHORT",
          text: "Used in Quarterly exam this session",
          options: [],
          answer: "Ans",
          difficulty: "MEDIUM",
          imagePath: null,
          spaceMm: 20,
          showGrid: false,
          createdAt: "2025-06-01",
          subparts: [],
          usages: [
            {
              paperId: "paper_qtr_2025",
              paperTitle: "Quarterly Exam 2025",
              paperSet: "Set A",
              examDate: "2025-08-20",
              academicSession: "2025–26",
              className: "Class 10",
              subject: "Science",
              status: "FINAL",
              isOrChoice: false,
            },
          ],
          expectedExhausted: true,
          expectedConflict: true,
        },
        // Q4: Used this session in different subject (Mathematics, Class 10, FINAL) -> NOT exhausted in Science
        {
          id: "q_diff_subject",
          bookId: "b1",
          chapterId: "c1",
          type: "MCQ",
          text: "Shared math logic question",
          options: ["1", "2"],
          answer: "1",
          difficulty: "EASY",
          imagePath: null,
          spaceMm: 0,
          showGrid: false,
          createdAt: "2025-06-01",
          subparts: [],
          usages: [
            {
              paperId: "paper_math_qtr",
              paperTitle: "Math Quarterly 2025",
              paperSet: "Set A",
              examDate: "2025-08-22",
              academicSession: "2025–26",
              className: "Class 10",
              subject: "Mathematics",
              status: "FINAL",
              isOrChoice: false,
            },
          ],
          expectedExhausted: false,
          // findFreshnessConflicts checks session and class cohort
          expectedConflict: true,
        },
        // Q5: Used this session in different class cohort (Class 9, Science, FINAL) -> NOT exhausted in Class 10
        {
          id: "q_diff_class",
          bookId: "b1",
          chapterId: "c1",
          type: "SHORT",
          text: "Shared science concept across grades",
          options: [],
          answer: "Ans",
          difficulty: "EASY",
          imagePath: null,
          spaceMm: 15,
          showGrid: false,
          createdAt: "2025-06-01",
          subparts: [],
          usages: [
            {
              paperId: "paper_c9_half",
              paperTitle: "Class 9 Half-Yearly",
              paperSet: "Set A",
              examDate: "2025-10-10",
              academicSession: "2025–26",
              className: "Class 9",
              subject: "Science",
              status: "FINAL",
              isOrChoice: false,
            },
          ],
          expectedExhausted: false,
          expectedConflict: false,
        },
        // Q6: Used in same session, class, and subject, but paper is DRAFT -> NOT exhausted (only advisory)
        {
          id: "q_draft_paper",
          bookId: "b1",
          chapterId: "c1",
          type: "LONG",
          text: "Draft periodic test question",
          options: [],
          answer: "Ans",
          difficulty: "MEDIUM",
          imagePath: null,
          spaceMm: 40,
          showGrid: false,
          createdAt: "2025-06-01",
          subparts: [],
          usages: [
            {
              paperId: "paper_draft_pt2",
              paperTitle: "Periodic Test 2 (Draft)",
              paperSet: "Set 1",
              examDate: "2025-11-05",
              academicSession: "2025–26",
              className: "Class 10",
              subject: "Science",
              status: "DRAFT",
              isOrChoice: false,
            },
          ],
          expectedExhausted: false,
          expectedConflict: true,
        },
        // Q7: Multi-use question: Used in 2024-25 (FINAL), then Quarterly 2025 (FINAL) -> EXHAUSTED
        {
          id: "q_multi_use",
          bookId: "b1",
          chapterId: "c1",
          type: "SHORT",
          text: "Multi-used classical question",
          options: [],
          answer: "Ans",
          difficulty: "HARD",
          imagePath: null,
          spaceMm: 25,
          showGrid: false,
          createdAt: "2024-05-01",
          subparts: [],
          usages: [
            {
              paperId: "paper_old_annual",
              paperTitle: "Annual Exam 2025",
              paperSet: "Set A",
              examDate: "2025-03-01",
              academicSession: "2024–25",
              className: "Class 10",
              subject: "Science",
              status: "FINAL",
              isOrChoice: false,
            },
            {
              paperId: "paper_qtr_recent",
              paperTitle: "Quarterly Exam 2025",
              paperSet: "Set 2",
              examDate: "2025-08-20",
              academicSession: "2025–26",
              className: "Class 10",
              subject: "Science",
              status: "FINAL",
              isOrChoice: false,
            },
          ],
          expectedExhausted: true,
          expectedConflict: true,
        },
        // Q8: Multi-use with OR-choice: Used in Half-Yearly as OR choice (FINAL) -> EXHAUSTED
        {
          id: "q_multi_or_choice",
          bookId: "b1",
          chapterId: "c1",
          type: "LONG",
          text: "OR-choice multi-use question",
          options: [],
          answer: "Ans",
          difficulty: "HARD",
          imagePath: null,
          spaceMm: 50,
          showGrid: false,
          createdAt: "2025-01-01",
          subparts: [],
          usages: [
            {
              paperId: "paper_halfyearly_or_final",
              paperTitle: "Half-Yearly Exam 2025",
              paperSet: "Set B",
              examDate: "2025-10-20",
              academicSession: "2025–26",
              className: "Class 10",
              subject: "Science",
              status: "FINAL",
              isOrChoice: true,
            },
          ],
          expectedExhausted: true,
          expectedConflict: true,
        },
      ];

      for (const q of questionBank) {
        const hasExhausted = Boolean(q.usages?.some((u) => isExhaustedUsage(u, currentPaper)));
        const conflicts = findFreshnessConflicts(q.usages, currentPaper);
        const hasConflict = conflicts.length > 0;

        expect(hasExhausted).toBe(q.expectedExhausted);
        expect(hasConflict).toBe(q.expectedConflict);
      }

      // Filter tests: verify question picker filtering logic
      const exhaustedQuestions = questionBank.filter((q) =>
        q.usages?.some((u) => isExhaustedUsage(u, currentPaper)),
      );
      expect(exhaustedQuestions.map((q) => q.id)).toEqual([
        "q_exhausted_quarterly",
        "q_multi_use",
        "q_multi_or_choice",
      ]);

      const conflictQuestions = questionBank.filter((q) =>
        findFreshnessConflicts(q.usages, currentPaper).length > 0,
      );
      expect(conflictQuestions.map((q) => q.id)).toEqual([
        "q_exhausted_quarterly",
        "q_diff_subject",
        "q_draft_paper",
        "q_multi_use",
        "q_multi_or_choice",
      ]);
    });
  });

  describe("4. Edge Cases, Normalization & Resilience Stress", () => {
    it("handles whitespace variations and case insensitivity in subject and className", () => {
      const currentPaper: CurrentPaperContext = {
        id: "paper_curr",
        academicSession: "2025–26",
        className: "  CLASS 10  ",
        subject: "  science  ",
      };

      const usage: QuestionUsageTag = {
        paperId: "paper_other",
        paperTitle: "Earlier Exam",
        paperSet: "A",
        examDate: "2025-08-20",
        academicSession: "2025-26",
        className: "Class 10",
        subject: "Science",
        status: "FINAL",
        isOrChoice: false,
      };

      expect(isExhaustedUsage(usage, currentPaper)).toBe(true);
    });

    it("resolves subject and className from nested blueprint.book when top-level properties are missing", () => {
      const currentPaperWithNested: CurrentPaperContext = {
        id: "paper_nested_context",
        academicSession: "2025–26",
        blueprint: {
          book: {
            className: "Class 10",
            subject: "Social Science",
          },
        },
      };

      const matchingUsage: QuestionUsageTag = {
        paperId: "paper_past_ss",
        paperTitle: "Mid-Term Social Science",
        paperSet: "Set 1",
        examDate: "2025-09-10",
        academicSession: "2025–26",
        className: "Class 10",
        subject: "Social Science",
        status: "FINAL",
        isOrChoice: false,
      };

      const differentSubjectUsage: QuestionUsageTag = {
        paperId: "paper_past_sci",
        paperTitle: "Mid-Term Science",
        paperSet: "Set 1",
        examDate: "2025-09-10",
        academicSession: "2025–26",
        className: "Class 10",
        subject: "Science",
        status: "FINAL",
        isOrChoice: false,
      };

      expect(isExhaustedUsage(matchingUsage, currentPaperWithNested)).toBe(true);
      expect(isExhaustedUsage(differentSubjectUsage, currentPaperWithNested)).toBe(false);
    });

    it("handles null or undefined inputs safely without throwing", () => {
      expect(isExhaustedUsage(null as any, null as any)).toBe(false);
      expect(isExhaustedUsage(undefined as any, undefined as any)).toBe(false);
      expect(findFreshnessConflicts(null, null)).toEqual([]);
      expect(findFreshnessConflicts(undefined, undefined)).toEqual([]);
      expect(findFreshnessConflicts([], null)).toEqual([]);
    });

    it("parses compact exam tags consistently for both standard and OR choices", () => {
      const tag1 = parseCompactExamTag({
        paperId: "p1",
        paperTitle: "Quarterly Exam 2025",
        paperSet: "Set A",
        examDate: "2025-08-15",
        academicSession: "2025–26",
        className: "Class 10",
        isOrChoice: false,
      });
      expect(tag1.category).toBe("quarterly");
      expect(tag1.term).toBe("Quarterly");
      expect(tag1.displayLabel).toBe("Quarterly 2025");

      const tag2 = parseCompactExamTag({
        paperId: "p2",
        paperTitle: "Half-Yearly Examination 2025",
        paperSet: "Set B",
        examDate: "2025-10-15",
        academicSession: "2025–26",
        className: "Class 10",
        isOrChoice: true,
      });
      expect(tag2.category).toBe("half");
      expect(tag2.term).toBe("Half");
      expect(tag2.displayLabel).toBe("Half 2025");
    });

    it("leaves dto.usages strictly undefined when relation arrays are absent", () => {
      const barePrismaQuestion = {
        id: "q_bare",
        bookId: "b1",
        chapterId: "c1",
        type: "SHORT",
        text: "Bare question without relation arrays",
        optionsJson: "[]",
        answer: "Ans",
        difficulty: "EASY",
        imagePath: null,
        spaceMm: 20,
        showGrid: false,
        createdById: "teacher_1",
        createdAt: new Date(),
      };

      const dto = toQuestionDto(barePrismaQuestion as any);
      expect(dto.usages).toBeUndefined();
      expect("usages" in dto && dto.usages === undefined).toBe(true);
    });

    it("correctly combines paperQuestions and orPaperQuestions on the same question DTO", () => {
      const qId = "q_hybrid_dual";
      const hybridPrismaQuestion = {
        id: qId,
        bookId: "b1",
        chapterId: "c1",
        type: "LONG",
        text: "Question used in both primary and OR positions across exams",
        optionsJson: "[]",
        answer: "Ans",
        difficulty: "HARD",
        imagePath: null,
        spaceMm: 50,
        showGrid: false,
        subpartsJson: "[]",
        createdById: "teacher_1",
        createdAt: new Date(),
        paperQuestions: [
          {
            paperId: "paper_primary_1",
            orQuestionId: null, // primary
            paper: {
              title: "Quarterly Exam 2025",
              paperSet: "Set 1",
              examDate: "2025-08-15",
              academicSession: "2025–26",
              status: "FINAL",
              blueprint: { book: { className: "Class 10", subject: "Science" } },
            },
          },
        ],
        orPaperQuestions: [
          {
            paperId: "paper_or_2",
            orQuestionId: qId, // OR choice
            paper: {
              title: "Half-Yearly Exam 2025",
              paperSet: "Set 2",
              examDate: "2025-10-15",
              academicSession: "2025–26",
              status: "FINAL",
              blueprint: { book: { className: "Class 10", subject: "Science" } },
            },
          },
        ],
      };

      const dto = toQuestionDto(hybridPrismaQuestion);
      expect(dto.usages).toHaveLength(2);

      // Usage 0: primary
      expect(dto.usages![0].paperId).toBe("paper_primary_1");
      expect(dto.usages![0].isOrChoice).toBe(false);
      expect(dto.usages![0].status).toBe("FINAL");
      expect(dto.usages![0].subject).toBe("Science");

      // Usage 1: OR-choice
      expect(dto.usages![1].paperId).toBe("paper_or_2");
      expect(dto.usages![1].isOrChoice).toBe(true);
      expect(dto.usages![1].status).toBe("FINAL");
      expect(dto.usages![1].subject).toBe("Science");

      // Both should trigger exhaustion against an annual exam in the same session/class/subject
      const targetPaper: CurrentPaperContext = {
        id: "paper_annual_2026",
        academicSession: "2025–26",
        className: "Class 10",
        subject: "Science",
      };

      expect(isExhaustedUsage(dto.usages![0], targetPaper)).toBe(true);
      expect(isExhaustedUsage(dto.usages![1], targetPaper)).toBe(true);
    });

    it("verifies resilience to legacy usage tags with missing status or missing subject", () => {
      const legacyUsage: QuestionUsageTag = {
        paperId: "paper_legacy_no_meta",
        paperTitle: "Mid-Term Exam",
        paperSet: "Set A",
        examDate: "2025-09-15",
        academicSession: "2025–26",
        className: "Class 10",
        // status and subject omitted
        isOrChoice: false,
      };

      const currentPaper: CurrentPaperContext = {
        id: "paper_annual_curr",
        academicSession: "2025–26",
        className: "Class 10",
        subject: "Science",
      };

      // When usage.status is omitted, it gracefully treats it as finalized
      // When usage.subject is omitted, it does not disqualify on subject
      expect(isExhaustedUsage(legacyUsage, currentPaper)).toBe(true);
    });
  });
});

