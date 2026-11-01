import { describe, expect, it } from "vitest";
import { findFreshnessConflicts } from "../components/QuestionUsageHistory";
import { toQuestionDto } from "./dto";
import { subPartSchema } from "./schemas";
import {
  parseSubparts,
  type QuestionUsageTag,
  type SubPart,
  subpartsTotalMarks,
  validateSubPartsSum,
} from "./types";

describe("Milestone 2: Board Choice Parity Guardrails Logic", () => {
  const primaryQuestion = {
    id: "q_primary_1",
    bookId: "book_math_10",
    chapterId: "ch_1",
    chapter: { id: "ch_1", number: 1, title: "Real Numbers" },
    type: "SHORT",
  };

  const sameChapterCandidate = {
    id: "q_alt_same_ch",
    bookId: "book_math_10",
    chapterId: "ch_1",
    chapter: { id: "ch_1", number: 1, title: "Real Numbers" },
    type: "SHORT",
    subpartsJson: "[]",
  };

  const differentChapterCandidate = {
    id: "q_alt_diff_ch",
    bookId: "book_math_10",
    chapterId: "ch_2",
    chapter: { id: "ch_2", number: 2, title: "Polynomials" },
    type: "SHORT",
    subpartsJson: "[]",
  };

  const candidateWithSubpartsMismatch = {
    id: "q_alt_subparts_mismatch",
    bookId: "book_math_10",
    chapterId: "ch_1",
    chapter: { id: "ch_1", number: 1, title: "Real Numbers" },
    type: "CASE_STUDY",
    subpartsJson: JSON.stringify([
      { label: "(i)", text: "Sub 1", marks: 1 },
      { label: "(ii)", text: "Sub 2", marks: 2 },
    ]), // Total = 3 marks, but section is 4 marks
  };

  const candidateWithSubpartsMatch = {
    id: "q_alt_subparts_match",
    bookId: "book_math_10",
    chapterId: "ch_1",
    chapter: { id: "ch_1", number: 1, title: "Real Numbers" },
    type: "CASE_STUDY",
    subpartsJson: JSON.stringify([
      { label: "(i)", text: "Sub 1", marks: 1 },
      { label: "(ii)", text: "Sub 2", marks: 1 },
      { label: "(iii)", text: "Sub 3", marks: 2 },
    ]), // Total = 4 marks, matching 4m section
  };

  function validateChoiceParity(
    primary: typeof primaryQuestion,
    candidate: { id: string; bookId: string; chapterId: string; chapter: { number: number; title: string }; type: string; subpartsJson?: string },
    section: { marksEach: number; type: string },
    blueprintBookId: string,
  ): { valid: boolean; error?: string } {
    if (candidate.bookId !== blueprintBookId) {
      return { valid: false, error: "Alternate question is from a different book" };
    }
    if (candidate.id === primary.id) {
      return { valid: false, error: "Alternate question cannot be identical to the primary question" };
    }
    if (candidate.type !== section.type) {
      return { valid: false, error: `Alternate question must be of type ${section.type}` };
    }
    if (candidate.chapterId !== primary.chapterId) {
      return {
        valid: false,
        error: `Board Guardrail Violation: Alternate (OR) choice must match primary question chapter (Chapter ${primary.chapter.number}: ${primary.chapter.title}).`,
      };
    }
    if (candidate.subpartsJson && candidate.subpartsJson !== "[]") {
      const subparts = parseSubparts(candidate.subpartsJson);
      if (subparts.length > 0) {
        const total = subpartsTotalMarks(subparts);
        if (total !== section.marksEach) {
          return {
            valid: false,
            error: `Board Guardrail Violation: Alternate (OR) choice total marks (${total}) must match section marks (${section.marksEach}).`,
          };
        }
      }
    }
    return { valid: true };
  }

  it("permits alternate question pairing when chapter and type match", () => {
    const res = validateChoiceParity(primaryQuestion, sameChapterCandidate, { marksEach: 2, type: "SHORT" }, "book_math_10");
    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it("strictly forbids cross-chapter alternate pairing with verbatim board guardrail message", () => {
    const res = validateChoiceParity(primaryQuestion, differentChapterCandidate, { marksEach: 2, type: "SHORT" }, "book_math_10");
    expect(res.valid).toBe(false);
    expect(res.error).toBe(
      "Board Guardrail Violation: Alternate (OR) choice must match primary question chapter (Chapter 1: Real Numbers).",
    );
  });

  it("strictly forbids cross-book alternate candidates", () => {
    const res = validateChoiceParity(primaryQuestion, sameChapterCandidate, { marksEach: 2, type: "SHORT" }, "book_science_10");
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Alternate question is from a different book");
  });

  it("strictly forbids identical question ID for alternate choice", () => {
    const selfCandidate = { ...sameChapterCandidate, id: primaryQuestion.id };
    const res = validateChoiceParity(primaryQuestion, selfCandidate, { marksEach: 2, type: "SHORT" }, "book_math_10");
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Alternate question cannot be identical to the primary question");
  });

  it("strictly forbids question type mismatch for alternate choice", () => {
    const typeMismatchCandidate = { ...sameChapterCandidate, type: "LONG" };
    const res = validateChoiceParity(primaryQuestion, typeMismatchCandidate, { marksEach: 2, type: "SHORT" }, "book_math_10");
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Alternate question must be of type SHORT");
  });

  it("validates subpart marks sum equality for multi-part alternate candidates", () => {
    // 3m subparts candidate paired in 4m section -> reject
    const mismatchRes = validateChoiceParity(
      { ...primaryQuestion, type: "CASE_STUDY" },
      candidateWithSubpartsMismatch,
      { marksEach: 4, type: "CASE_STUDY" },
      "book_math_10",
    );
    expect(mismatchRes.valid).toBe(false);
    expect(mismatchRes.error).toBe(
      "Board Guardrail Violation: Alternate (OR) choice total marks (3) must match section marks (4).",
    );

    // 4m subparts candidate paired in 4m section -> accept
    const matchRes = validateChoiceParity(
      { ...primaryQuestion, type: "CASE_STUDY" },
      candidateWithSubpartsMatch,
      { marksEach: 4, type: "CASE_STUDY" },
      "book_math_10",
    );
    expect(matchRes.valid).toBe(true);
    expect(matchRes.error).toBeUndefined();
  });

  it("correctly identifies when primary question replacement breaks existing OR choice chapter parity", () => {
    // If primary question in Ch 1 has an OR choice in Ch 1:
    const initialPair = { primaryChapterId: "ch_1", orQuestionId: "q_alt_1", orChapterId: "ch_1" };
    expect(initialPair.primaryChapterId === initialPair.orChapterId).toBe(true);

    // When primary question is replaced with candidate from Ch 2:
    const newCandidate = { chapterId: "ch_2" };
    const shouldClearOrChoice = Boolean(initialPair.orQuestionId && newCandidate.chapterId !== initialPair.primaryChapterId);
    expect(shouldClearOrChoice).toBe(true);

    // When primary question is replaced with candidate from same Ch 1:
    const sameChCandidate = { chapterId: "ch_1" };
    const shouldClearSameCh = Boolean(initialPair.orQuestionId && sameChCandidate.chapterId !== initialPair.primaryChapterId);
    expect(shouldClearSameCh).toBe(false);
  });
});

describe("Milestone 2: Multi-Part Case Study Questions Logic & Presets", () => {
  const cbsePreset: SubPart[] = [
    { label: "(i)", text: "Find the coordinates of the base.", marks: 1, answer: "(2, 3)" },
    { label: "(ii)", text: "Calculate the perimeter of triangle ABC.", marks: 1, answer: "12 units" },
    { label: "(iii)", text: "Determine the total area enclosed.", marks: 2, answer: "6 sq units" },
  ];

  it("accurately validates the standard CBSE Section E 4-mark case study preset (1m + 1m + 2m)", () => {
    const total = subpartsTotalMarks(cbsePreset);
    expect(total).toBe(4);
    expect(validateSubPartsSum(cbsePreset, 4)).toBe(true);
  });

  it("detects unbalanced subparts when total marks deviate from target", () => {
    const unbalancedOver: SubPart[] = [
      { label: "(i)", text: "Q1", marks: 1 },
      { label: "(ii)", text: "Q2", marks: 2 },
      { label: "(iii)", text: "Q3", marks: 2 },
    ]; // Sum = 5
    expect(subpartsTotalMarks(unbalancedOver)).toBe(5);
    expect(validateSubPartsSum(unbalancedOver, 4)).toBe(false);

    const unbalancedUnder: SubPart[] = [
      { label: "(i)", text: "Q1", marks: 1 },
      { label: "(ii)", text: "Q2", marks: 1 },
    ]; // Sum = 2
    expect(subpartsTotalMarks(unbalancedUnder)).toBe(2);
    expect(validateSubPartsSum(unbalancedUnder, 4)).toBe(false);
  });

  it("validates individual subpart schemas strictly via Zod", () => {
    for (const sp of cbsePreset) {
      expect(() => subPartSchema.parse(sp)).not.toThrow();
    }

    // Missing label
    expect(() => subPartSchema.parse({ label: "", text: "Some question", marks: 1 })).toThrow();

    // Missing text
    expect(() => subPartSchema.parse({ label: "(i)", text: "   ", marks: 1 })).toThrow();

    // Zero or negative marks
    expect(() => subPartSchema.parse({ label: "(i)", text: "Valid text", marks: 0 })).toThrow();
    expect(() => subPartSchema.parse({ label: "(i)", text: "Valid text", marks: -1 })).toThrow();

    // Subpart with MCQ options
    const mcqSubpart: SubPart = {
      label: "(i)",
      text: "Which of the following is correct?",
      marks: 1,
      options: ["Alpha", "Beta", "Gamma", "Delta"],
      answer: "Alpha",
    };
    expect(() => subPartSchema.parse(mcqSubpart)).not.toThrow();
  });

  it("handles serialization and deserialization of subparts without data corruption", () => {
    const serialized = JSON.stringify(cbsePreset);
    const parsed = parseSubparts(serialized);
    expect(parsed).toEqual(cbsePreset);
    expect(parsed.length).toBe(3);
    expect(parsed[0].label).toBe("(i)");
    expect(parsed[2].marks).toBe(2);
  });
});

describe("Milestone 2: Question Usage History & Cohort Freshness Warnings", () => {
  const currentPaper = {
    id: "paper_curr_1",
    academicSession: "2025–26",
    className: "Class 10",
  };

  const sampleUsages: QuestionUsageTag[] = [
    {
      paperId: "paper_curr_1", // Current paper
      paperTitle: "Pre-Board Mathematics 2026",
      paperSet: "Set 1",
      examDate: "2026-01-15",
      academicSession: "2025–26",
      className: "Class 10",
      isOrChoice: false,
    },
    {
      paperId: "paper_other_same_session", // Conflict: same session, same class
      paperTitle: "Mid-Term Examination 2025",
      paperSet: "Set A",
      examDate: "2025-09-20",
      academicSession: "2025–26",
      className: "Class 10",
      isOrChoice: false,
    },
    {
      paperId: "paper_parallel_set", // Conflict: parallel set in same session
      paperTitle: "Pre-Board Mathematics 2026",
      paperSet: "Set 2",
      examDate: "2026-01-15",
      academicSession: "2025–26",
      className: "Class 10",
      isOrChoice: true,
    },
    {
      paperId: "paper_prev_session", // No conflict: past academic session
      paperTitle: "Annual Exam 2024",
      paperSet: "Set 1",
      examDate: "2025-03-10",
      academicSession: "2024–25",
      className: "Class 10",
      isOrChoice: false,
    },
    {
      paperId: "paper_other_class", // No conflict: different cohort/class
      paperTitle: "Diagnostic Test Class 9",
      paperSet: "Set A",
      examDate: "2025-08-10",
      academicSession: "2025–26",
      className: "Class 9",
      isOrChoice: false,
    },
  ];

  it("filters out current paper and returns zero conflicts if no prior usage matches cohort and session", () => {
    const onlyCurrent = [sampleUsages[0]];
    const conflicts = findFreshnessConflicts(onlyCurrent, currentPaper);
    expect(conflicts).toEqual([]);
  });

  it("flags freshness conflicts for same academic session and same class", () => {
    const conflicts = findFreshnessConflicts(sampleUsages, currentPaper);
    expect(conflicts.length).toBe(2);

    const conflictIds = conflicts.map((c) => c.paperId);
    expect(conflictIds).toContain("paper_other_same_session");
    expect(conflictIds).toContain("paper_parallel_set");

    // Must NOT contain past session or different class
    expect(conflictIds).not.toContain("paper_prev_session");
    expect(conflictIds).not.toContain("paper_other_class");
    expect(conflictIds).not.toContain("paper_curr_1");
  });

  it("supports currentPaper context with nested blueprint.book.className", () => {
    const nestedPaperContext = {
      id: "paper_curr_1",
      academicSession: "2025–26",
      blueprint: {
        book: {
          className: "Class 10",
        },
      },
    };
    const conflicts = findFreshnessConflicts(sampleUsages, nestedPaperContext);
    expect(conflicts.length).toBe(2);
  });

  it("returns empty array gracefully on null, undefined, or empty inputs", () => {
    expect(findFreshnessConflicts(null, currentPaper)).toEqual([]);
    expect(findFreshnessConflicts(undefined, currentPaper)).toEqual([]);
    expect(findFreshnessConflicts([], currentPaper)).toEqual([]);
    expect(findFreshnessConflicts(sampleUsages, null)).toEqual([]);
    expect(findFreshnessConflicts(sampleUsages, undefined)).toEqual([]);
  });

  it("correctly tracks isOrChoice status on usage tags", () => {
    const primaryUsage = sampleUsages.find((u) => u.paperId === "paper_other_same_session");
    expect(primaryUsage?.isOrChoice).toBe(false);

    const orUsage = sampleUsages.find((u) => u.paperId === "paper_parallel_set");
    expect(orUsage?.isOrChoice).toBe(true);
  });
});

describe("Milestone 2: toQuestionDto Usage Mapping and timesUsed Resiliency", () => {
  it("maps Prisma paperQuestions and orPaperQuestions relations into QuestionUsageTag array", () => {
    const prismaQuestion = {
      id: "q_100",
      bookId: "b_1",
      chapterId: "c_1",
      type: "SHORT",
      text: "Sample question?",
      optionsJson: "[]",
      subpartsJson: "[]",
      answer: "Sample answer",
      difficulty: "MEDIUM",
      imagePath: null,
      spaceMm: 20,
      showGrid: false,
      curriculumTopicId: null,
      competencyLevel: null,
      sourceProvenance: null,
      createdById: "user_test",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      chapter: { id: "c_1", number: 1, title: "Number Systems" },
      paperQuestions: [
        {
          paperId: "paper_p1",
          orQuestionId: null,
          paper: {
            id: "paper_p1",
            title: "Periodic Test 1",
            paperSet: "Set A",
            examDate: "2025-07-20",
            academicSession: "2025–26",
            blueprint: { book: { className: "Class 10" } },
          },
        },
      ],
      orPaperQuestions: [
        {
          paperId: "paper_p2",
          paper: {
            id: "paper_p2",
            title: "Pre-Board Exam",
            paperSet: "Set B",
            examDate: "2026-01-10",
            academicSession: "2025–26",
            blueprint: { book: { className: "Class 10" } },
          },
        },
      ],
    };

    const dto = toQuestionDto(prismaQuestion);
    expect(dto.usages).toBeDefined();
    expect(dto.usages?.length).toBe(2);

    expect(dto.usages?.[0]).toEqual({
      paperId: "paper_p1",
      paperTitle: "Periodic Test 1",
      paperSet: "Set A",
      examDate: "2025-07-20",
      academicSession: "2025–26",
      className: "Class 10",
      isOrChoice: false,
    });

    expect(dto.usages?.[1]).toEqual({
      paperId: "paper_p2",
      paperTitle: "Pre-Board Exam",
      paperSet: "Set B",
      examDate: "2026-01-10",
      academicSession: "2025–26",
      className: "Class 10",
      isOrChoice: true,
    });

    // timesUsed falls back to usages.length when _count is absent
    expect(dto.timesUsed).toBe(2);
  });
});
