import { describe, expect, it } from "vitest";
import {
  findFreshnessConflicts,
  type CurrentPaperContext,
} from "../components/QuestionUsageHistory";
import { toQuestionDto } from "./dto";
import type { QuestionUsageTag } from "./types";

describe("Milestone 2 Adversarial Challenge: Question Freshness Conflict Detection", () => {
  const currentPaper: CurrentPaperContext = {
    id: "paper_target_2025_c10",
    academicSession: "2025–26",
    className: "Class 10",
  };

  it("triggers conflicts when multiple papers exist in the same academic session and class", () => {
    const usages: QuestionUsageTag[] = [
      {
        paperId: "paper_midterm_2025",
        paperTitle: "Mid-Term Examination 2025",
        paperSet: "Set A",
        examDate: "2025-09-15",
        academicSession: "2025–26",
        className: "Class 10",
        isOrChoice: false,
      },
      {
        paperId: "paper_unit_test_2",
        paperTitle: "Unit Test 2",
        paperSet: "Set 1",
        examDate: "2025-11-20",
        academicSession: "2025–26",
        className: "Class 10",
        isOrChoice: false,
      },
      {
        paperId: "paper_preboard_1",
        paperTitle: "Pre-Board I Examination",
        paperSet: "Set B",
        examDate: "2026-01-10",
        academicSession: "2025–26",
        className: "Class 10",
        isOrChoice: true,
      },
      {
        paperId: "paper_mock_final",
        paperTitle: "Mock Final Assessment",
        paperSet: "Set 3",
        examDate: "2026-02-05",
        academicSession: "2025–26",
        className: "Class 10",
        isOrChoice: false,
      },
    ];

    const conflicts = findFreshnessConflicts(usages, currentPaper);

    expect(conflicts).toHaveLength(4);
    expect(conflicts.map((c) => c.paperId)).toEqual([
      "paper_midterm_2025",
      "paper_unit_test_2",
      "paper_preboard_1",
      "paper_mock_final",
    ]);

    // Verifies all metadata is intact
    expect(conflicts[0].paperTitle).toBe("Mid-Term Examination 2025");
    expect(conflicts[0].paperSet).toBe("Set A");
    expect(conflicts[0].academicSession).toBe("2025–26");
    expect(conflicts[0].className).toBe("Class 10");
  });

  it("returns zero conflicts when papers belong to different academic sessions", () => {
    const usages: QuestionUsageTag[] = [
      {
        paperId: "paper_past_1",
        paperTitle: "Class 10 Final 2024",
        paperSet: "Set A",
        examDate: "2024-03-10",
        academicSession: "2023–24",
        className: "Class 10",
        isOrChoice: false,
      },
      {
        paperId: "paper_past_2",
        paperTitle: "Class 10 Mid-Term 2024",
        paperSet: "Set B",
        examDate: "2024-09-20",
        academicSession: "2024–25",
        className: "Class 10",
        isOrChoice: false,
      },
      {
        paperId: "paper_future_1",
        paperTitle: "Class 10 Advanced 2027",
        paperSet: "Set 1",
        examDate: "2027-01-15",
        academicSession: "2026–27",
        className: "Class 10",
        isOrChoice: true,
      },
    ];

    const conflicts = findFreshnessConflicts(usages, currentPaper);
    expect(conflicts).toEqual([]);
  });

  it("strictly ignores the current paper ID (does not report conflict with itself)", () => {
    const usages: QuestionUsageTag[] = [
      {
        paperId: "paper_target_2025_c10", // Exactly current paper ID
        paperTitle: "Current Active Draft",
        paperSet: "Set 1",
        examDate: "2025-10-15",
        academicSession: "2025–26",
        className: "Class 10",
        isOrChoice: false,
      },
      {
        paperId: "paper_another_session_paper",
        paperTitle: "Different Exam in Same Session",
        paperSet: "Set 2",
        examDate: "2025-11-01",
        academicSession: "2025–26",
        className: "Class 10",
        isOrChoice: false,
      },
    ];

    const conflicts = findFreshnessConflicts(usages, currentPaper);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].paperId).toBe("paper_another_session_paper");
  });

  it("supports currentPaper specified with paperId fallback instead of id", () => {
    const currentWithPaperId: CurrentPaperContext = {
      paperId: "paper_fallback_id",
      academicSession: "2025–26",
      className: "Class 10",
    };

    const usages: QuestionUsageTag[] = [
      {
        paperId: "paper_fallback_id", // matches paperId
        paperTitle: "Current Paper",
        paperSet: "Set 1",
        examDate: "2025-10-15",
        academicSession: "2025–26",
        className: "Class 10",
        isOrChoice: false,
      },
      {
        paperId: "paper_other",
        paperTitle: "Other Exam",
        paperSet: "Set 2",
        examDate: "2025-11-01",
        academicSession: "2025–26",
        className: "Class 10",
        isOrChoice: true,
      },
    ];

    const conflicts = findFreshnessConflicts(usages, currentWithPaperId);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].paperId).toBe("paper_other");
  });

  it("correctly counts and reports usages regardless of primary vs alternate OR choice", () => {
    const usages: QuestionUsageTag[] = [
      {
        paperId: "paper_primary_usage",
        paperTitle: "First Terminal Exam",
        paperSet: "Set A",
        examDate: "2025-08-10",
        academicSession: "2025–26",
        className: "Class 10",
        isOrChoice: false, // Primary
      },
      {
        paperId: "paper_or_usage",
        paperTitle: "Second Terminal Exam",
        paperSet: "Set B",
        examDate: "2025-12-15",
        academicSession: "2025–26",
        className: "Class 10",
        isOrChoice: true, // Alternate OR choice
      },
    ];

    const conflicts = findFreshnessConflicts(usages, currentPaper);
    expect(conflicts).toHaveLength(2);

    const primaryConflict = conflicts.find((c) => c.paperId === "paper_primary_usage");
    expect(primaryConflict?.isOrChoice).toBe(false);

    const orConflict = conflicts.find((c) => c.paperId === "paper_or_usage");
    expect(orConflict?.isOrChoice).toBe(true);
  });

  it("isolates cohorts by class (Class 9 vs Class 10 does not conflict)", () => {
    const usages: QuestionUsageTag[] = [
      {
        paperId: "paper_c9_exam",
        paperTitle: "Class 9 Annual Exam",
        paperSet: "Set 1",
        examDate: "2025-10-20",
        academicSession: "2025–26",
        className: "Class 9", // Different cohort!
        isOrChoice: false,
      },
      {
        paperId: "paper_c10_exam",
        paperTitle: "Class 10 Pre-Board",
        paperSet: "Set 1",
        examDate: "2025-10-22",
        academicSession: "2025–26",
        className: "Class 10", // Matching cohort!
        isOrChoice: false,
      },
    ];

    const conflicts = findFreshnessConflicts(usages, currentPaper);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].paperId).toBe("paper_c10_exam");
  });

  it("gracefully handles null, undefined, empty, and malformed inputs", () => {
    expect(findFreshnessConflicts(null, currentPaper)).toEqual([]);
    expect(findFreshnessConflicts(undefined, currentPaper)).toEqual([]);
    expect(findFreshnessConflicts([], currentPaper)).toEqual([]);
    expect(findFreshnessConflicts("not-an-array" as unknown as QuestionUsageTag[], currentPaper)).toEqual([]);
    expect(findFreshnessConflicts(12345 as unknown as QuestionUsageTag[], currentPaper)).toEqual([]);
    expect(findFreshnessConflicts({} as unknown as QuestionUsageTag[], currentPaper)).toEqual([]);

    expect(findFreshnessConflicts([], null)).toEqual([]);
    expect(findFreshnessConflicts([], undefined)).toEqual([]);
    expect(
      findFreshnessConflicts(
        [
          {
            paperId: "p1",
            paperTitle: "P1",
            paperSet: "Set 1",
            examDate: "2025-01-01",
            academicSession: "2025–26",
            className: "Class 10",
            isOrChoice: false,
          },
        ],
        null,
      ),
    ).toEqual([]);

    // Target paper with missing academicSession produces 0 conflicts
    expect(
      findFreshnessConflicts(
        [
          {
            paperId: "p1",
            paperTitle: "P1",
            paperSet: "Set 1",
            examDate: "2025-01-01",
            academicSession: "2025–26",
            className: "Class 10",
            isOrChoice: false,
          },
        ],
        { id: "current" },
      ),
    ).toEqual([]);
  });
});

describe("Milestone 2 Adversarial Challenge: toQuestionDto Usage Mapping (0, 1, 50+ usages)", () => {
  const baseQuestion = {
    id: "q_stress_base",
    bookId: "book_science_10",
    chapterId: "ch_chem_1",
    type: "SHORT",
    text: "Define chemical equilibrium and state Le Chatelier's principle.",
    optionsJson: "[]",
    subpartsJson: "[]",
    answer: "Equilibrium definition and principle text.",
    difficulty: "HARD",
    imagePath: null,
    spaceMm: 35,
    showGrid: false,
    createdById: "teacher_admin",
    createdAt: new Date("2026-02-01T10:00:00Z"),
    chapter: { id: "ch_chem_1", number: 1, title: "Chemical Reactions" },
  };

  it("handles questions with 0 usages correctly", () => {
    // Scenario 1: Empty relations arrays, no _count
    const qWithZeroArray = {
      ...baseQuestion,
      id: "q_zero_1",
      paperQuestions: [],
      orPaperQuestions: [],
    };
    const dto1 = toQuestionDto(qWithZeroArray);
    expect(dto1.usages).toEqual([]);
    expect(dto1.timesUsed).toBe(0);

    // Scenario 2: Omitted relations, explicit _count with 0
    const qWithZeroCount = {
      ...baseQuestion,
      id: "q_zero_2",
      _count: { paperQuestions: 0, orPaperQuestions: 0 },
    };
    const dto2 = toQuestionDto(qWithZeroCount);
    expect(dto2.usages).toBeUndefined();
    expect(dto2.timesUsed).toBe(0);

    // Scenario 3: Neither relations nor _count provided
    const qBare = {
      ...baseQuestion,
      id: "q_zero_3",
    };
    const dto3 = toQuestionDto(qBare);
    expect(dto3.usages).toBeUndefined();
    expect(dto3.timesUsed).toBeUndefined();
  });

  it("handles questions with exactly 1 usage (as primary question)", () => {
    const qWith1Primary = {
      ...baseQuestion,
      id: "q_one_primary",
      paperQuestions: [
        {
          paperId: "paper_single_1",
          orQuestionId: null,
          paper: {
            title: "Periodic Test 1",
            paperSet: "Set Alpha",
            examDate: "2025-07-15",
            academicSession: "2025–26",
            blueprint: { book: { className: "Class 10" } },
          },
        },
      ],
      orPaperQuestions: [],
    };

    const dto = toQuestionDto(qWith1Primary);
    expect(dto.usages).toBeDefined();
    expect(dto.usages).toHaveLength(1);
    expect(dto.timesUsed).toBe(1);

    expect(dto.usages?.[0]).toEqual({
      paperId: "paper_single_1",
      paperTitle: "Periodic Test 1",
      paperSet: "Set Alpha",
      examDate: "2025-07-15",
      academicSession: "2025–26",
      className: "Class 10",
      isOrChoice: false,
    });
  });

  it("handles questions with exactly 1 usage (as alternate OR choice)", () => {
    const qWith1Or = {
      ...baseQuestion,
      id: "q_one_or",
      paperQuestions: [],
      orPaperQuestions: [
        {
          paperId: "paper_single_or",
          paper: {
            title: "Pre-Board Mock Exam",
            paperSet: "Set Gamma",
            examDate: "2026-01-20",
            academicSession: "2025–26",
            blueprint: { book: { className: "Class 10" } },
          },
        },
      ],
    };

    const dto = toQuestionDto(qWith1Or);
    expect(dto.usages).toBeDefined();
    expect(dto.usages).toHaveLength(1);
    expect(dto.timesUsed).toBe(1);

    expect(dto.usages?.[0]).toEqual({
      paperId: "paper_single_or",
      paperTitle: "Pre-Board Mock Exam",
      paperSet: "Set Gamma",
      examDate: "2026-01-20",
      academicSession: "2025–26",
      className: "Class 10",
      isOrChoice: true,
    });
  });

  it("stress-tests question with 50+ usages (60 usages across primary & OR choices)", () => {
    const totalPrimaryCount = 35;
    const totalOrCount = 25;
    const totalExpected = totalPrimaryCount + totalOrCount; // 60 usages

    const paperQuestions = Array.from({ length: totalPrimaryCount }, (_, idx) => ({
      paperId: `paper_prim_${idx + 1}`,
      orQuestionId: null,
      paper: {
        title: `Terminal Assessment ${idx + 1}`,
        paperSet: `Set ${String.fromCharCode(65 + (idx % 4))}`,
        examDate: `2025-0${(idx % 8) + 1}-10`,
        academicSession: idx < 15 ? "2025–26" : "2024–25",
        blueprint: { book: { className: idx % 2 === 0 ? "Class 10" : "Class 9" } },
      },
    }));

    const orPaperQuestions = Array.from({ length: totalOrCount }, (_, idx) => ({
      paperId: `paper_or_${idx + 1}`,
      paper: {
        title: `Revision Exam ${idx + 1}`,
        paperSet: `Set ${idx + 1}`,
        examDate: `2025-1${(idx % 2) + 1}-15`,
        academicSession: idx < 10 ? "2025–26" : "2023–24",
        blueprint: { book: { className: "Class 10" } },
      },
    }));

    const qHeavy = {
      ...baseQuestion,
      id: "q_heavy_50_plus",
      paperQuestions,
      orPaperQuestions,
    };

    const dto = toQuestionDto(qHeavy);

    expect(dto.usages).toBeDefined();
    expect(dto.usages).toHaveLength(totalExpected);
    expect(dto.timesUsed).toBe(totalExpected);

    // Verify first 35 usages are primary (isOrChoice = false)
    for (let i = 0; i < totalPrimaryCount; i++) {
      expect(dto.usages?.[i].isOrChoice).toBe(false);
      expect(dto.usages?.[i].paperId).toBe(`paper_prim_${i + 1}`);
    }

    // Verify remaining 25 usages are OR choices (isOrChoice = true)
    for (let j = 0; j < totalOrCount; j++) {
      const usage = dto.usages?.[totalPrimaryCount + j];
      expect(usage?.isOrChoice).toBe(true);
      expect(usage?.paperId).toBe(`paper_or_${j + 1}`);
    }

    // Cross-system integration: Pipe 60 usages directly into findFreshnessConflicts
    // Target paper is Class 10 in 2025–26
    const targetPaper: CurrentPaperContext = {
      id: "paper_prim_1", // paper_prim_1 is current paper! (Must be filtered out)
      academicSession: "2025–26",
      className: "Class 10",
    };

    const conflicts = findFreshnessConflicts(dto.usages, targetPaper);

    // Primary matching 2025–26 & Class 10:
    // idx < 15 AND idx % 2 === 0 => indices 0, 2, 4, 6, 8, 10, 12, 14 => 8 items.
    // But idx 0 is paper_prim_1 (current paper) => 7 items from primary.
    // OR matching 2025–26 & Class 10:
    // idx < 10 AND all are Class 10 => 10 items from OR.
    // Total expected conflicts = 7 + 10 = 17 items!
    expect(conflicts).toHaveLength(17);
    expect(conflicts.find((c) => c.paperId === "paper_prim_1")).toBeUndefined();
  });

  it("tolerates sparse/corrupt entries in paperQuestions array without crashing", () => {
    const qWithSparse = {
      ...baseQuestion,
      id: "q_sparse",
      paperQuestions: [
        null as unknown as { paperId: string },
        undefined as unknown as { paperId: string },
        {
          paperId: "paper_valid",
          orQuestionId: null,
          paper: undefined, // Missing paper metadata
        },
      ],
      orPaperQuestions: [
        null as unknown as { paperId: string },
        {
          paperId: "paper_or_valid",
          paper: {
            title: "Sparse Paper",
            paperSet: "Set S",
            examDate: "2025-05-05",
            // missing academicSession, blueprint
          },
        },
      ],
    };

    expect(() => toQuestionDto(qWithSparse)).not.toThrow();
    const dto = toQuestionDto(qWithSparse);

    expect(dto.usages).toHaveLength(2);
    expect(dto.timesUsed).toBe(2);

    expect(dto.usages?.[0]).toEqual({
      paperId: "paper_valid",
      paperTitle: "",
      paperSet: "",
      examDate: "",
      academicSession: "2025–26", // default fallback
      className: "",
      isOrChoice: false,
    });

    expect(dto.usages?.[1]).toEqual({
      paperId: "paper_or_valid",
      paperTitle: "Sparse Paper",
      paperSet: "Set S",
      examDate: "2025-05-05",
      academicSession: "2025–26", // default fallback
      className: "",
      isOrChoice: true,
    });
  });

  it("handles performance stress of 5,000 usages cleanly in under 50ms", () => {
    const count = 5000;
    const largeUsages: QuestionUsageTag[] = Array.from({ length: count }, (_, i) => ({
      paperId: `p_${i}`,
      paperTitle: `Exam ${i}`,
      paperSet: `Set ${i % 3}`,
      examDate: "2025-10-10",
      academicSession: i % 2 === 0 ? "2025–26" : "2024–25",
      className: i % 4 === 0 ? "Class 10" : "Class 9",
      isOrChoice: i % 5 === 0,
    }));

    const targetPaper: CurrentPaperContext = {
      id: "p_0",
      academicSession: "2025–26",
      className: "Class 10",
    };

    const start = performance.now();
    const conflicts = findFreshnessConflicts(largeUsages, targetPaper);
    const elapsed = performance.now() - start;

    // Matches: i % 2 === 0 AND i % 4 === 0 => i % 4 === 0 (1,250 items), minus p_0 => 1,249 items.
    expect(conflicts).toHaveLength(1249);
    expect(elapsed).toBeLessThan(100); // well under 100ms
  });
});
