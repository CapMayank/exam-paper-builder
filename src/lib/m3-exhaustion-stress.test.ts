import { describe, expect, it } from "vitest";
import {
  findFreshnessConflicts,
  isExhaustedUsage,
  parseCompactExamTag,
  type CurrentPaperContext,
} from "../components/QuestionUsageHistory";
import type { QuestionUsageTag } from "./types";

describe("Milestone 3 Challenger Adversarial Stress Suite: Exhaustion Boundaries & Logic", () => {
  // Baseline valid current paper fixture
  const baseCurrentPaper: CurrentPaperContext = {
    id: "paper_curr_test_101",
    academicSession: "2025–26",
    className: "Class 10",
    subject: "Science",
  };

  // Baseline valid finalized usage fixture from another paper
  const baseExhaustedUsage: QuestionUsageTag = {
    paperId: "paper_prev_final_202",
    paperTitle: "Quarterly Examination 2025",
    paperSet: "Set A",
    examDate: "2025-08-20",
    academicSession: "2025–26",
    className: "Class 10",
    subject: "Science",
    status: "FINAL",
    isOrChoice: false,
  };

  // ---------------------------------------------------------------------------
  // 1. Unicode Dash Variations & Academic Session Stress
  // ---------------------------------------------------------------------------
  describe("1. Academic Session & Unicode Dash Variations", () => {
    it("matches en-dash (\\u2013) in current paper against ASCII hyphen in usage", () => {
      const current: CurrentPaperContext = { ...baseCurrentPaper, academicSession: "2025–26" }; // en-dash
      const usage: QuestionUsageTag = { ...baseExhaustedUsage, academicSession: "2025-26" }; // ASCII hyphen
      expect(isExhaustedUsage(usage, current)).toBe(true);
    });

    it("matches ASCII hyphen in current paper against en-dash (\\u2013) in usage", () => {
      const current: CurrentPaperContext = { ...baseCurrentPaper, academicSession: "2025-26" }; // ASCII hyphen
      const usage: QuestionUsageTag = { ...baseExhaustedUsage, academicSession: "2025–26" }; // en-dash
      expect(isExhaustedUsage(usage, current)).toBe(true);
    });

    it("matches em-dash (\\u2014) in current paper against ASCII hyphen in usage", () => {
      const current: CurrentPaperContext = { ...baseCurrentPaper, academicSession: "2025—26" }; // em-dash \u2014
      const usage: QuestionUsageTag = { ...baseExhaustedUsage, academicSession: "2025-26" }; // ASCII hyphen
      expect(isExhaustedUsage(usage, current)).toBe(true);
    });

    it("matches em-dash (\\u2014) in usage against en-dash (\\u2013) in current paper", () => {
      const current: CurrentPaperContext = { ...baseCurrentPaper, academicSession: "2025–26" }; // en-dash
      const usage: QuestionUsageTag = { ...baseExhaustedUsage, academicSession: "2025—26" }; // em-dash
      expect(isExhaustedUsage(usage, current)).toBe(true);
    });

    it("trims leading and trailing whitespace on academic session strings", () => {
      const current: CurrentPaperContext = { ...baseCurrentPaper, academicSession: "   2025–26  \t" };
      const usage: QuestionUsageTag = { ...baseExhaustedUsage, academicSession: " \n 2025-26   " };
      expect(isExhaustedUsage(usage, current)).toBe(true);
    });

    it("matches spaced sessions when formatted symmetrically with en-dash or hyphen", () => {
      const current: CurrentPaperContext = { ...baseCurrentPaper, academicSession: "2025 - 26" };
      const usageEnDashSpaced: QuestionUsageTag = { ...baseExhaustedUsage, academicSession: "2025 – 26" };
      // normSession replaces en-dash with hyphen, leaving "2025 - 26" on both sides
      expect(isExhaustedUsage(usageEnDashSpaced, current)).toBe(true);
    });

    it("differentiates unspaced '2025-26' from spaced '2025 - 26' due to internal token separation", () => {
      const current: CurrentPaperContext = { ...baseCurrentPaper, academicSession: "2025-26" };
      const usageSpaced: QuestionUsageTag = { ...baseExhaustedUsage, academicSession: "2025 - 26" };
      // normSession only trims ends and replaces dashes; internal space boundary prevents inadvertent collision
      expect(isExhaustedUsage(usageSpaced, current)).toBe(false);
    });

    it("does not match different academic years (e.g., 2024–25 vs 2025–26 or 2026–27)", () => {
      const prevYearUsage: QuestionUsageTag = { ...baseExhaustedUsage, academicSession: "2024–25" };
      const nextYearUsage: QuestionUsageTag = { ...baseExhaustedUsage, academicSession: "2026–27" };

      expect(isExhaustedUsage(prevYearUsage, baseCurrentPaper)).toBe(false);
      expect(isExhaustedUsage(nextYearUsage, baseCurrentPaper)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Class Name Case-Sensitivity & Trimming Boundaries
  // ---------------------------------------------------------------------------
  describe("2. Class Name Case-Sensitivity & Cohort Boundaries", () => {
    it("matches class names case-insensitively ('class 10' vs 'Class 10' vs 'CLASS 10')", () => {
      const currentLower: CurrentPaperContext = { ...baseCurrentPaper, className: "class 10" };
      const usageUpper: QuestionUsageTag = { ...baseExhaustedUsage, className: "CLASS 10" };
      expect(isExhaustedUsage(usageUpper, currentLower)).toBe(true);

      const currentMixed: CurrentPaperContext = { ...baseCurrentPaper, className: "cLaSs 10" };
      const usageCapitalized: QuestionUsageTag = { ...baseExhaustedUsage, className: "Class 10" };
      expect(isExhaustedUsage(usageCapitalized, currentMixed)).toBe(true);
    });

    it("trims excess whitespace around class names", () => {
      const currentPadded: CurrentPaperContext = { ...baseCurrentPaper, className: "   Class 10   " };
      const usagePadded: QuestionUsageTag = { ...baseExhaustedUsage, className: "\tClass 10\n" };
      expect(isExhaustedUsage(usagePadded, currentPadded)).toBe(true);
    });

    it("distinguishes base class from section-qualified class ('Class 10' vs 'Class 10 - A')", () => {
      const currentBase: CurrentPaperContext = { ...baseCurrentPaper, className: "Class 10" };
      const usageSectionA: QuestionUsageTag = { ...baseExhaustedUsage, className: "Class 10 - A" };
      expect(isExhaustedUsage(usageSectionA, currentBase)).toBe(false);

      const usageSectionB: QuestionUsageTag = { ...baseExhaustedUsage, className: "Class 10 - B" };
      expect(isExhaustedUsage(usageSectionB, currentBase)).toBe(false);
    });

    it("matches identical section-qualified classes case-insensitively with trimming", () => {
      const currentSectionA: CurrentPaperContext = { ...baseCurrentPaper, className: "  Class 10 - A  " };
      const usageSectionALower: QuestionUsageTag = { ...baseExhaustedUsage, className: "class 10 - a" };
      expect(isExhaustedUsage(usageSectionALower, currentSectionA)).toBe(true);
    });

    it("does not match different grade levels ('Class 9' vs 'Class 10' vs 'Class 11')", () => {
      const usageClass9: QuestionUsageTag = { ...baseExhaustedUsage, className: "Class 9" };
      const usageClass11: QuestionUsageTag = { ...baseExhaustedUsage, className: "Class 11" };

      expect(isExhaustedUsage(usageClass9, baseCurrentPaper)).toBe(false);
      expect(isExhaustedUsage(usageClass11, baseCurrentPaper)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Subject Case-Sensitivity & Trimming Boundaries
  // ---------------------------------------------------------------------------
  describe("3. Subject Case-Sensitivity & Domain Boundaries", () => {
    it("matches subjects case-insensitively ('mathematics' vs 'Mathematics' vs 'MATHEMATICS')", () => {
      const currentMath: CurrentPaperContext = { ...baseCurrentPaper, subject: "Mathematics" };
      const usageMathLower: QuestionUsageTag = { ...baseExhaustedUsage, subject: "mathematics" };
      expect(isExhaustedUsage(usageMathLower, currentMath)).toBe(true);

      const currentSciUpper: CurrentPaperContext = { ...baseCurrentPaper, subject: "SCIENCE" };
      const usageSciCapitalized: QuestionUsageTag = { ...baseExhaustedUsage, subject: "Science" };
      expect(isExhaustedUsage(usageSciCapitalized, currentSciUpper)).toBe(true);
    });

    it("trims whitespace from subject names before comparison", () => {
      const currentPadded: CurrentPaperContext = { ...baseCurrentPaper, subject: "  Social Science  " };
      const usagePadded: QuestionUsageTag = { ...baseExhaustedUsage, subject: "\nsocial science\t" };
      expect(isExhaustedUsage(usagePadded, currentPadded)).toBe(true);
    });

    it("does not match disparate subjects ('Mathematics' vs 'Science' or 'Physics' vs 'Chemistry')", () => {
      const currentMath: CurrentPaperContext = { ...baseCurrentPaper, subject: "Mathematics" };
      const usageSci: QuestionUsageTag = { ...baseExhaustedUsage, subject: "Science" };
      expect(isExhaustedUsage(usageSci, currentMath)).toBe(false);

      const currentPhys: CurrentPaperContext = { ...baseCurrentPaper, subject: "Physics" };
      const usageChem: QuestionUsageTag = { ...baseExhaustedUsage, subject: "Chemistry" };
      expect(isExhaustedUsage(usageChem, currentPhys)).toBe(false);
    });

    it("does not match prefix or substring subjects ('Math' vs 'Mathematics')", () => {
      const currentMathFull: CurrentPaperContext = { ...baseCurrentPaper, subject: "Mathematics" };
      const usageMathAbbr: QuestionUsageTag = { ...baseExhaustedUsage, subject: "Math" };
      expect(isExhaustedUsage(usageMathAbbr, currentMathFull)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Status Boundaries: FINAL, DRAFT, undefined, null, ARCHIVED
  // ---------------------------------------------------------------------------
  describe("4. Paper Status Boundaries", () => {
    it("marks FINAL usage as exhausted", () => {
      const usageFinal: QuestionUsageTag = { ...baseExhaustedUsage, status: "FINAL" };
      expect(isExhaustedUsage(usageFinal, baseCurrentPaper)).toBe(true);
    });

    it("does NOT mark DRAFT usage as exhausted", () => {
      const usageDraft: QuestionUsageTag = { ...baseExhaustedUsage, status: "DRAFT" };
      expect(isExhaustedUsage(usageDraft, baseCurrentPaper)).toBe(false);
    });

    it("does NOT mark ARCHIVED or custom non-FINAL statuses as exhausted", () => {
      const usageArchived: QuestionUsageTag = { ...baseExhaustedUsage, status: "ARCHIVED" };
      const usageReview: QuestionUsageTag = { ...baseExhaustedUsage, status: "UNDER_REVIEW" };
      const usageDiscarded: QuestionUsageTag = { ...baseExhaustedUsage, status: "DISCARDED" };

      expect(isExhaustedUsage(usageArchived, baseCurrentPaper)).toBe(false);
      expect(isExhaustedUsage(usageReview, baseCurrentPaper)).toBe(false);
      expect(isExhaustedUsage(usageDiscarded, baseCurrentPaper)).toBe(false);
    });

    it("strictly requires uppercase 'FINAL' in adherence to Prisma enum semantics", () => {
      const usageLowerFinal: QuestionUsageTag = { ...baseExhaustedUsage, status: "final" };
      expect(isExhaustedUsage(usageLowerFinal, baseCurrentPaper)).toBe(false);
    });

    it("treats omitted/undefined status as finalized for test fixture resilience", () => {
      const usageUndefinedStatus: QuestionUsageTag = { ...baseExhaustedUsage, status: undefined };
      expect(isExhaustedUsage(usageUndefinedStatus, baseCurrentPaper)).toBe(true);
    });

    it("treats null status as finalized for backward compatibility", () => {
      const usageNullStatus = { ...baseExhaustedUsage, status: null as unknown as string };
      expect(isExhaustedUsage(usageNullStatus, baseCurrentPaper)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Multi-Paper & Self-Paper Boundaries
  // ---------------------------------------------------------------------------
  describe("5. Multi-Paper & Self-Paper Boundaries", () => {
    it("excludes the current paper when matching via currentPaper.id", () => {
      const currentPaperWithId: CurrentPaperContext = {
        id: "paper_curr_same_id_999",
        academicSession: "2025–26",
        className: "Class 10",
        subject: "Science",
      };
      const selfUsage: QuestionUsageTag = {
        ...baseExhaustedUsage,
        paperId: "paper_curr_same_id_999",
      };

      // Current paper cannot exhaust itself
      expect(isExhaustedUsage(selfUsage, currentPaperWithId)).toBe(false);
    });

    it("excludes the current paper when matching via currentPaper.paperId", () => {
      const currentPaperWithPaperId: CurrentPaperContext = {
        paperId: "paper_curr_same_paperId_888",
        academicSession: "2025–26",
        className: "Class 10",
        subject: "Science",
      };
      const selfUsage: QuestionUsageTag = {
        ...baseExhaustedUsage,
        paperId: "paper_curr_same_paperId_888",
      };

      expect(isExhaustedUsage(selfUsage, currentPaperWithPaperId)).toBe(false);
    });

    it("prioritizes currentPaper.id when both id and paperId are present", () => {
      const currentPaperBoth: CurrentPaperContext = {
        id: "paper_primary_id_777",
        paperId: "paper_secondary_id_666",
        academicSession: "2025–26",
        className: "Class 10",
        subject: "Science",
      };
      const selfUsagePrimary: QuestionUsageTag = {
        ...baseExhaustedUsage,
        paperId: "paper_primary_id_777",
      };
      const usageSecondary: QuestionUsageTag = {
        ...baseExhaustedUsage,
        paperId: "paper_secondary_id_666",
      };

      // id matches primary -> excluded
      expect(isExhaustedUsage(selfUsagePrimary, currentPaperBoth)).toBe(false);
      // paperId="paper_secondary_id_666" does not match currentPaper.id ("paper_primary_id_777")
      expect(isExhaustedUsage(usageSecondary, currentPaperBoth)).toBe(true);
    });

    it("correctly identifies earlier paper when multiple usage tags are evaluated", () => {
      const currentPaper: CurrentPaperContext = {
        id: "paper_annual_c10_sci",
        academicSession: "2025–26",
        className: "Class 10",
        subject: "Science",
      };

      const usages: QuestionUsageTag[] = [
        // 1. Self paper (current Annual exam draft)
        {
          paperId: "paper_annual_c10_sci",
          paperTitle: "Annual Exam",
          paperSet: "Set A",
          examDate: "2026-03-01",
          academicSession: "2025–26",
          className: "Class 10",
          subject: "Science",
          status: "DRAFT",
          isOrChoice: false,
        },
        // 2. Quarterly exam (finalized) -> EXHAUSTED
        {
          paperId: "paper_qtr_c10_sci",
          paperTitle: "Quarterly Exam",
          paperSet: "Set A",
          examDate: "2025-08-20",
          academicSession: "2025–26",
          className: "Class 10",
          subject: "Science",
          status: "FINAL",
          isOrChoice: false,
        },
        // 3. Half-Yearly exam (draft in another section) -> NOT EXHAUSTED
        {
          paperId: "paper_half_c10_sci_draft",
          paperTitle: "Half-Yearly Exam",
          paperSet: "Set B",
          examDate: "2025-10-15",
          academicSession: "2025–26",
          className: "Class 10",
          subject: "Science",
          status: "DRAFT",
          isOrChoice: false,
        },
        // 4. Previous Year Annual (finalized) -> DIFFERENT SESSION -> NOT EXHAUSTED
        {
          paperId: "paper_annual_2024_sci",
          paperTitle: "Annual Exam 2025",
          paperSet: "Set 1",
          examDate: "2025-03-10",
          academicSession: "2024–25",
          className: "Class 10",
          subject: "Science",
          status: "FINAL",
          isOrChoice: false,
        },
        // 5. Quarterly exam in Class 9 (finalized) -> DIFFERENT CLASS -> NOT EXHAUSTED
        {
          paperId: "paper_qtr_c9_sci",
          paperTitle: "Class 9 Quarterly",
          paperSet: "Set A",
          examDate: "2025-08-20",
          academicSession: "2025–26",
          className: "Class 9",
          subject: "Science",
          status: "FINAL",
          isOrChoice: false,
        },
      ];

      const exhaustedList = usages.filter((u) => isExhaustedUsage(u, currentPaper));
      expect(exhaustedList).toHaveLength(1);
      expect(exhaustedList[0].paperId).toBe("paper_qtr_c10_sci");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Missing Fields & Resilience Against Crash
  // ---------------------------------------------------------------------------
  describe("6. Missing Fields & Crash Resilience", () => {
    it("returns false cleanly when usage is null or undefined", () => {
      expect(isExhaustedUsage(null as unknown as QuestionUsageTag, baseCurrentPaper)).toBe(false);
      expect(isExhaustedUsage(undefined as unknown as QuestionUsageTag, baseCurrentPaper)).toBe(false);
    });

    it("returns false cleanly when currentPaper is null or undefined", () => {
      expect(isExhaustedUsage(baseExhaustedUsage, null)).toBe(false);
      expect(isExhaustedUsage(baseExhaustedUsage, undefined)).toBe(false);
    });

    it("returns false cleanly when both arguments are null or undefined", () => {
      expect(isExhaustedUsage(null as unknown as QuestionUsageTag, null)).toBe(false);
      expect(isExhaustedUsage(undefined as unknown as QuestionUsageTag, undefined)).toBe(false);
    });

    it("returns false cleanly when usage or currentPaper is an empty object", () => {
      expect(isExhaustedUsage({} as QuestionUsageTag, baseCurrentPaper)).toBe(false);
      expect(isExhaustedUsage(baseExhaustedUsage, {})).toBe(false);
      expect(isExhaustedUsage({} as QuestionUsageTag, {})).toBe(false);
    });

    it("returns false cleanly when academicSession is missing or empty on either side", () => {
      const usageNoSession: QuestionUsageTag = { ...baseExhaustedUsage, academicSession: "" };
      const currentNoSession: CurrentPaperContext = { ...baseCurrentPaper, academicSession: "" };

      expect(isExhaustedUsage(usageNoSession, baseCurrentPaper)).toBe(false);
      expect(isExhaustedUsage(baseExhaustedUsage, currentNoSession)).toBe(false);

      const usageUndefinedSession = { ...baseExhaustedUsage, academicSession: undefined as unknown as string };
      expect(isExhaustedUsage(usageUndefinedSession, baseCurrentPaper)).toBe(false);
    });

    it("resiliently resolves className and subject from nested blueprint.book context", () => {
      const nestedPaper: CurrentPaperContext = {
        id: "paper_nested_curr",
        academicSession: "2025–26",
        blueprint: {
          book: {
            className: "Class 10",
            subject: "Science",
          },
        },
      };

      expect(isExhaustedUsage(baseExhaustedUsage, nestedPaper)).toBe(true);
    });

    it("handles sparse or nullish blueprint hierarchy without throwing", () => {
      const sparsePaper1: CurrentPaperContext = {
        id: "paper_sparse_1",
        academicSession: "2025–26",
        blueprint: undefined,
      };
      const sparsePaper2: CurrentPaperContext = {
        id: "paper_sparse_2",
        academicSession: "2025–26",
        blueprint: {},
      };
      const sparsePaper3: CurrentPaperContext = {
        id: "paper_sparse_3",
        academicSession: "2025–26",
        blueprint: { book: undefined },
      };

      // Since className and subject are absent on currentPaper, it does not throw
      expect(() => isExhaustedUsage(baseExhaustedUsage, sparsePaper1)).not.toThrow();
      expect(() => isExhaustedUsage(baseExhaustedUsage, sparsePaper2)).not.toThrow();
      expect(() => isExhaustedUsage(baseExhaustedUsage, sparsePaper3)).not.toThrow();
    });

    it("handles usage without className or subject without throwing", () => {
      const sparseUsage: QuestionUsageTag = {
        paperId: "paper_sparse_usage",
        paperTitle: "Sparse Exam",
        paperSet: "Set A",
        examDate: "2025-08-10",
        academicSession: "2025–26",
        className: "" as unknown as string,
        subject: undefined,
        status: "FINAL",
        isOrChoice: false,
      };

      expect(() => isExhaustedUsage(sparseUsage, baseCurrentPaper)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Freshness Conflicts & Compact Tag Parser Invariants
  // ---------------------------------------------------------------------------
  describe("7. Freshness Conflicts & Tag Parsing Synergy", () => {
    it("findFreshnessConflicts filters out self-paper and matches academic cohort", () => {
      const currentPaper: CurrentPaperContext = {
        id: "paper_active_123",
        academicSession: "2025–26",
        className: "Class 10",
      };

      const usages: QuestionUsageTag[] = [
        {
          paperId: "paper_active_123", // self -> excluded
          paperTitle: "Active Paper",
          paperSet: "Set A",
          examDate: "2025-10-01",
          academicSession: "2025–26",
          className: "Class 10",
          isOrChoice: false,
        },
        {
          paperId: "paper_other_1", // match -> conflict
          paperTitle: "Other Paper",
          paperSet: "Set B",
          examDate: "2025-08-15",
          academicSession: "2025-26", // ASCII hyphen normalized
          className: "class 10", // lowercase normalized
          isOrChoice: false,
        },
        {
          paperId: "paper_other_2", // different session -> excluded
          paperTitle: "Old Paper",
          paperSet: "Set A",
          examDate: "2024-08-15",
          academicSession: "2024–25",
          className: "Class 10",
          isOrChoice: false,
        },
      ];

      const conflicts = findFreshnessConflicts(usages, currentPaper);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].paperId).toBe("paper_other_1");
    });

    it("parseCompactExamTag extracts correct category, term, and display label across exam types", () => {
      const samples = [
        {
          input: { paperTitle: "Quarterly Exam", academicSession: "2025–26" },
          expectedTerm: "Quarterly",
          expectedCategory: "quarterly",
          expectedLabel: "Quarterly 2026",
        },
        {
          input: { paperTitle: "Half-Yearly Examination", academicSession: "2025-26" },
          expectedTerm: "Half",
          expectedCategory: "half",
          expectedLabel: "Half 2026",
        },
        {
          input: { paperTitle: "Annual Board Exam", academicSession: "2025/26" },
          expectedTerm: "Annual",
          expectedCategory: "annual",
          expectedLabel: "Annual 2026",
        },
        {
          input: { paperTitle: "Pre-Board Examination", academicSession: "2025–26" },
          expectedTerm: "Pre-Board",
          expectedCategory: "preboard",
          expectedLabel: "Pre-Board 2026",
        },
        {
          input: { paperTitle: "Periodic Test 2", academicSession: "2025–26" },
          expectedTerm: "UT-2",
          expectedCategory: "unittest",
          expectedLabel: "UT-2 2026",
        },
        {
          input: { paperTitle: "Practice Mock Test", academicSession: "2025–26" },
          expectedTerm: "Practice",
          expectedCategory: "practice",
          expectedLabel: "Practice 2026",
        },
      ];

      for (const s of samples) {
        const info = parseCompactExamTag(s.input);
        expect(info.term).toBe(s.expectedTerm);
        expect(info.category).toBe(s.expectedCategory);
        expect(info.displayLabel).toBe(s.expectedLabel);
      }
    });
  });
});
