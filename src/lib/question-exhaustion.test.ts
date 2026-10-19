import { describe, expect, it } from "vitest";
import {
  findFreshnessConflicts,
  isExhaustedUsage,
  parseCompactExamTag,
  type CurrentPaperContext,
} from "../components/QuestionUsageHistory";
import { toQuestionDto } from "./dto";
import type { QuestionUsageTag } from "./types";

describe("Milestone 3 Requirement R3: Question Usage History & Exhaustion Tagging", () => {
  const currentPaper: CurrentPaperContext = {
    id: "paper_curr_halfyearly_c10_sci",
    academicSession: "2025–26",
    className: "Class 10",
    subject: "Science",
  };

  it("Test 1: marks earlier finalized paper in same session/class/subject as exhausted", () => {
    const usage: QuestionUsageTag = {
      paperId: "paper_prev_quarterly_c10_sci",
      paperTitle: "Quarterly Exam 2025",
      paperSet: "Set A",
      examDate: "2025-08-15",
      academicSession: "2025–26",
      className: "Class 10",
      subject: "Science",
      status: "FINAL",
      isOrChoice: false,
    };

    expect(isExhaustedUsage(usage, currentPaper)).toBe(true);
  });

  it("Test 2: does not mark draft paper in same session as exhausted (status: 'DRAFT')", () => {
    const usage: QuestionUsageTag = {
      paperId: "paper_draft_periodic_c10_sci",
      paperTitle: "Periodic Test 1",
      paperSet: "Set B",
      examDate: "2025-07-20",
      academicSession: "2025–26",
      className: "Class 10",
      subject: "Science",
      status: "DRAFT",
      isOrChoice: false,
    };

    // A draft paper causes freshness advisory but is NOT exhausted until finalized
    expect(isExhaustedUsage(usage, currentPaper)).toBe(false);
  });

  it("Test 3: does not mark paper from different academic session as exhausted (2024–25 vs 2025–26)", () => {
    const usage: QuestionUsageTag = {
      paperId: "paper_last_year_final_c10_sci",
      paperTitle: "Annual Examination 2025",
      paperSet: "Set 1",
      examDate: "2025-03-10",
      academicSession: "2024–25",
      className: "Class 10",
      subject: "Science",
      status: "FINAL",
      isOrChoice: false,
    };

    expect(isExhaustedUsage(usage, currentPaper)).toBe(false);
  });

  it("Test 4: does not mark paper from different class cohort as exhausted (Class 9 vs Class 10)", () => {
    const usage: QuestionUsageTag = {
      paperId: "paper_quarterly_c9_sci",
      paperTitle: "Quarterly Exam 2025",
      paperSet: "Set A",
      examDate: "2025-08-15",
      academicSession: "2025–26",
      className: "Class 9",
      subject: "Science",
      status: "FINAL",
      isOrChoice: false,
    };

    expect(isExhaustedUsage(usage, currentPaper)).toBe(false);
  });

  it("Test 5: does not mark paper from different subject as exhausted (Mathematics vs Science)", () => {
    const usage: QuestionUsageTag = {
      paperId: "paper_quarterly_c10_math",
      paperTitle: "Quarterly Exam 2025",
      paperSet: "Set A",
      examDate: "2025-08-15",
      academicSession: "2025–26",
      className: "Class 10",
      subject: "Mathematics",
      status: "FINAL",
      isOrChoice: false,
    };

    expect(isExhaustedUsage(usage, currentPaper)).toBe(false);
  });

  it("Test 6: normalizes Unicode en-dash vs ASCII hyphen session strings seamlessly", () => {
    // Current paper uses Unicode en-dash "2025–26" (\u2013)
    // Usage tag uses ASCII hyphen "2025-26"
    const usageAsciiHyphen: QuestionUsageTag = {
      paperId: "paper_prev_exam_ascii",
      paperTitle: "Quarterly Exam 2025",
      paperSet: "Set A",
      examDate: "2025-08-15",
      academicSession: "2025-26",
      className: "Class 10",
      subject: "Science",
      status: "FINAL",
      isOrChoice: false,
    };

    expect(isExhaustedUsage(usageAsciiHyphen, currentPaper)).toBe(true);

    // Conversely, current paper with ASCII hyphen and usage with Unicode en-dash
    const currentPaperAscii: CurrentPaperContext = {
      id: "paper_curr_ascii",
      academicSession: "2025-26",
      className: "Class 10",
      subject: "Science",
    };

    const usageUnicodeEnDash: QuestionUsageTag = {
      paperId: "paper_prev_exam_unicode",
      paperTitle: "Quarterly Exam 2025",
      paperSet: "Set A",
      examDate: "2025-08-15",
      academicSession: "2025–26",
      className: "Class 10",
      subject: "Science",
      status: "FINAL",
      isOrChoice: false,
    };

    expect(isExhaustedUsage(usageUnicodeEnDash, currentPaperAscii)).toBe(true);
  });

  it("Test 7: ignores the current paper itself (paperId === currentPaper.id or currentPaper.paperId)", () => {
    const selfUsageById: QuestionUsageTag = {
      paperId: "paper_curr_halfyearly_c10_sci",
      paperTitle: "Half-Yearly Examination",
      paperSet: "Set A",
      examDate: "2025-10-15",
      academicSession: "2025–26",
      className: "Class 10",
      subject: "Science",
      status: "FINAL",
      isOrChoice: false,
    };

    expect(isExhaustedUsage(selfUsageById, currentPaper)).toBe(false);

    const selfUsageByPaperId: QuestionUsageTag = {
      paperId: "paper_alternate_id_prop",
      paperTitle: "Half-Yearly Examination",
      paperSet: "Set A",
      examDate: "2025-10-15",
      academicSession: "2025–26",
      className: "Class 10",
      subject: "Science",
      status: "FINAL",
      isOrChoice: false,
    };

    expect(
      isExhaustedUsage(selfUsageByPaperId, {
        paperId: "paper_alternate_id_prop",
        academicSession: "2025–26",
        className: "Class 10",
      }),
    ).toBe(false);
  });

  it("Test 8: verifies toQuestionDto preserves strict backward compatibility with existing tests", () => {
    // When status and subject are omitted from the Prisma mock, toQuestionDto must output the 7 baseline properties
    const mockPrismaQuestion = {
      id: "q_legacy_101",
      bookId: "book_c10_sci",
      chapterId: "ch_acids_bases",
      type: "SHORT",
      text: "What happens when an acid reacts with a metal?",
      optionsJson: "[]",
      answer: "Hydrogen gas is evolved",
      difficulty: "MEDIUM",
      imagePath: null,
      spaceMm: 40,
      showGrid: false,
      subpartsJson: "[]",
      createdById: "user_test",
      createdAt: new Date("2025-01-01"),
      paperQuestions: [
        {
          paperId: "paper_p1",
          orQuestionId: null,
          paper: {
            title: "Periodic Test 1",
            paperSet: "Set A",
            examDate: "2025-07-20",
            academicSession: "2025–26",
            blueprint: { book: { className: "Class 10" } },
          },
        },
      ],
    };

    const dto = toQuestionDto(mockPrismaQuestion);

    // Exact object equality assertion matching m2-guardrails.test.ts lines 399-407
    expect(dto.usages?.[0]).toEqual({
      paperId: "paper_p1",
      paperTitle: "Periodic Test 1",
      paperSet: "Set A",
      examDate: "2025-07-20",
      academicSession: "2025–26",
      className: "Class 10",
      isOrChoice: false,
    });

    // When status and subject ARE supplied, toQuestionDto conditionally attaches them
    const mockPrismaQuestionWithNewFields = {
      id: "q_new_102",
      bookId: "book_c10_sci",
      chapterId: "ch_acids_bases",
      type: "SHORT",
      text: "Explain neutralization reaction.",
      optionsJson: "[]",
      answer: "Acid + Base -> Salt + Water",
      difficulty: "EASY",
      imagePath: null,
      spaceMm: 30,
      showGrid: false,
      subpartsJson: "[]",
      createdById: "user_test",
      createdAt: new Date("2025-01-01"),
      paperQuestions: [
        {
          paperId: "paper_final_qtr",
          orQuestionId: null,
          paper: {
            title: "Quarterly Examination 2025",
            paperSet: "Set 1",
            examDate: "2025-08-20",
            academicSession: "2025–26",
            status: "FINAL",
            blueprint: {
              book: { className: "Class 10", subject: "Science" },
            },
          },
        },
      ],
      orPaperQuestions: [
        {
          paperId: "paper_final_half",
          orQuestionId: "q_new_102",
          paper: {
            title: "Half-Yearly Exam 2025",
            paperSet: "Set 2",
            examDate: "2025-10-10",
            academicSession: "2025–26",
            status: "FINAL",
            blueprint: {
              book: { className: "Class 10", subject: "Science" },
            },
          },
        },
      ],
    };

    const dtoNew = toQuestionDto(mockPrismaQuestionWithNewFields);
    expect(dtoNew.usages?.[0]).toEqual({
      paperId: "paper_final_qtr",
      paperTitle: "Quarterly Examination 2025",
      paperSet: "Set 1",
      examDate: "2025-08-20",
      academicSession: "2025–26",
      className: "Class 10",
      status: "FINAL",
      subject: "Science",
      isOrChoice: false,
    });
    expect(dtoNew.usages?.[1]).toEqual({
      paperId: "paper_final_half",
      paperTitle: "Half-Yearly Exam 2025",
      paperSet: "Set 2",
      examDate: "2025-10-10",
      academicSession: "2025–26",
      className: "Class 10",
      status: "FINAL",
      subject: "Science",
      isOrChoice: true,
    });
  });

  it("treats omitted/undefined usage status as finalized for test fixture resilience", () => {
    const usageWithoutStatus: QuestionUsageTag = {
      paperId: "paper_fixture_no_status",
      paperTitle: "Quarterly Exam 2025",
      paperSet: "Set A",
      examDate: "2025-08-15",
      academicSession: "2025–26",
      className: "Class 10",
      subject: "Science",
      isOrChoice: false,
    };

    expect(isExhaustedUsage(usageWithoutStatus, currentPaper)).toBe(true);
  });

  it("correctly resolves class and subject from nested blueprint.book context", () => {
    const paperWithNestedContext: CurrentPaperContext = {
      id: "paper_nested_context",
      academicSession: "2025–26",
      blueprint: {
        book: {
          className: "Class 10",
          subject: "Science",
        },
      },
    };

    const matchingUsage: QuestionUsageTag = {
      paperId: "paper_earlier_exam",
      paperTitle: "Quarterly 2025",
      paperSet: "Set A",
      examDate: "2025-08-10",
      academicSession: "2025–26",
      className: "Class 10",
      subject: "Science",
      status: "FINAL",
      isOrChoice: false,
    };

    expect(isExhaustedUsage(matchingUsage, paperWithNestedContext)).toBe(true);

    const nonMatchingSubjectUsage: QuestionUsageTag = {
      ...matchingUsage,
      subject: "Social Science",
    };
    expect(isExhaustedUsage(nonMatchingSubjectUsage, paperWithNestedContext)).toBe(false);
  });

  it("handles case-insensitive and whitespace-padded class and subject matching", () => {
    const currentPaperPadded: CurrentPaperContext = {
      id: "paper_padded",
      academicSession: "  2025–26  ",
      className: "  class 10  ",
      subject: "  SCIENCE  ",
    };

    const usage: QuestionUsageTag = {
      paperId: "paper_prev",
      paperTitle: "Quarterly Exam",
      paperSet: "Set A",
      examDate: "2025-08-10",
      academicSession: "2025-26",
      className: "Class 10",
      subject: "science",
      status: "FINAL",
      isOrChoice: false,
    };

    expect(isExhaustedUsage(usage, currentPaperPadded)).toBe(true);
  });

  it("parses compact exam tags for display labels", () => {
    const tagInfo = parseCompactExamTag({
      paperTitle: "Quarterly Examination - Set A",
      academicSession: "2025–26",
      examDate: "2025-09-10",
    });

    expect(tagInfo.category).toBe("quarterly");
    expect(tagInfo.term).toBe("Quarterly");
    expect(tagInfo.displayLabel).toBe("Quarterly 2025");
  });
});
