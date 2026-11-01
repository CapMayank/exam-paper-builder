import { parseMatchColumnPairs } from "./constants";
import { subpartsTotalMarks } from "./types";
import type { ValidatableQuestion } from "./questionValidator";

export interface PaperCompletenessInput {
  blueprint: {
    totalMarks: number;
    durationMin?: number;
    sections: Array<{
      id: string;
      title: string;
      type: string;
      count: number;
      marksEach: number;
      orChoiceMode?: string;
    }>;
    chapters?: Array<{
      chapterId: string;
      chapter?: { id: string; number: number; title: string };
      marks?: number;
    }>;
  };
  items: Array<{
    id?: string;
    itemNumber?: number;
    position: number;
    sectionId: string;
    question: ValidatableQuestion;
    orQuestion?: ValidatableQuestion | null;
  }>;
}

export interface MarksValidationResult {
  passed: boolean;
  actualTotalMarks: number;
  expectedTotalMarks: number;
  sectionMarksBreakdown: Array<{
    sectionId: string;
    sectionTitle: string;
    expectedMarks: number;
    actualMarks: number;
  }>;
  issues: string[];
}

export interface StructuralCompletenessResult {
  passed: boolean;
  totalExpectedQuestions: number;
  totalActualQuestions: number;
  missingQuestionsCount: number;
  numberingIssues: string[];
  danglingReferences: string[];
  issues: string[];
}

export interface BlueprintComplianceResult {
  passed: boolean;
  unfulfilledSections: string[];
  internalChoiceViolations: string[];
  issues: string[];
}

export interface AcademicBalanceResult {
  passed: boolean;
  difficultyDistribution: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
    percentages: { EASY: number; MEDIUM: number; HARD: number };
  };
  cognitiveDistribution: {
    REMEMBERING: number;
    UNDERSTANDING: number;
    APPLYING: number;
    ANALYZING_EVALUATING: number;
  };
  issues: string[];
}

export interface PaperCompletenessResult {
  status: "PASS" | "FAIL" | "WARN";
  overallScore: number;
  marksValidation: MarksValidationResult;
  structuralCompleteness: StructuralCompletenessResult;
  blueprintCompliance: BlueprintComplianceResult;
  academicBalance: AcademicBalanceResult;
  summary: string;
}

/**
 * Deterministically checks complete assembled question paper:
 * 1. Exact marks summation across questions, subparts, sections, and grand total.
 * 2. Structural completeness (all sections filled, question numbering without gaps or duplicates).
 * 3. Dangling asset references (diagrams, passages, tables).
 * 4. Academic balance (difficulty & cognitive distribution).
 */
export function validatePaperCompleteness(
  input: PaperCompletenessInput,
): PaperCompletenessResult {
  const { blueprint, items } = input;
  const expectedTotalMarks = blueprint.totalMarks || 0;

  // -----------------------------------------------------------------
  // 1. DETERMINISTIC MARKS VALIDATION
  // -----------------------------------------------------------------
  let actualTotalMarks = 0;
  const marksIssues: string[] = [];
  const sectionMarksBreakdown: MarksValidationResult["sectionMarksBreakdown"] = [];

  for (const sec of blueprint.sections) {
    const secItems = items.filter((it) => it.sectionId === sec.id);
    const expectedSecMarks = sec.count * sec.marksEach;
    let actualSecMarks = 0;

    for (const it of secItems) {
      const q = it.question;
      const isMatch = q.type === "MATCH_COLUMN" || sec.type === "MATCH_COLUMN";
      const subMarks = subpartsTotalMarks(q.subparts);

      let qMarks = sec.marksEach;
      if (isMatch) {
        const pairsCount = parseMatchColumnPairs(q.options, q.text, q.explanation).length;
        qMarks = sec.count === 1 ? sec.marksEach : Math.min(pairsCount * sec.marksEach, expectedSecMarks);
      } else if (subMarks > 0) {
        qMarks = subMarks;
      } else if (typeof q.marks === "number" && q.marks > 0) {
        qMarks = q.marks;
      }

      actualSecMarks += qMarks;
    }

    sectionMarksBreakdown.push({
      sectionId: sec.id,
      sectionTitle: sec.title,
      expectedMarks: expectedSecMarks,
      actualMarks: actualSecMarks,
    });

    actualTotalMarks += actualSecMarks;

    if (actualSecMarks !== expectedSecMarks) {
      marksIssues.push(
        `Section "${sec.title}" marks mismatch: Expected ${expectedSecMarks} marks, calculated ${actualSecMarks} marks.`,
      );
    }
  }

  const marksPassed = actualTotalMarks === expectedTotalMarks && marksIssues.length === 0;

  // -----------------------------------------------------------------
  // 2. STRUCTURAL COMPLETENESS & NUMBERING
  // -----------------------------------------------------------------
  const structuralIssues: string[] = [];
  const numberingIssues: string[] = [];
  const danglingReferences: string[] = [];
  let totalExpectedQuestions = 0;

  for (const sec of blueprint.sections) {
    totalExpectedQuestions += sec.count;
    const secItems = items.filter((it) => it.sectionId === sec.id);
    if (secItems.length < sec.count) {
      structuralIssues.push(
        `Section "${sec.title}" is incomplete: Expected ${sec.count} question(s), found ${secItems.length}.`,
      );
    }
  }

  const missingQuestionsCount = Math.max(0, totalExpectedQuestions - items.length);

  // Check question numbering (if itemNumber is provided)
  const numbersSeen = new Set<number>();
  const explicitNumbers = items
    .map((it) => it.itemNumber)
    .filter((n): n is number => typeof n === "number" && n > 0);

  if (explicitNumbers.length > 0) {
    for (const num of explicitNumbers) {
      if (numbersSeen.has(num)) {
        numberingIssues.push(`Duplicate question number detected: Question ${num}.`);
      }
      numbersSeen.add(num);
    }

    const sortedNums = [...numbersSeen].sort((a, b) => a - b);
    for (let i = 0; i < sortedNums.length - 1; i++) {
      if (sortedNums[i + 1] !== sortedNums[i] + 1) {
        numberingIssues.push(
          `Gap in question numbering between Question ${sortedNums[i]} and Question ${sortedNums[i + 1]}.`,
        );
      }
    }
  }

  // Check dangling references
  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    const q = it.question;
    const textLower = String(q.text || "").toLowerCase();
    const qNum = it.itemNumber ?? idx + 1;

    const mentionsDiagram =
      textLower.includes("diagram") ||
      textLower.includes("figure") ||
      textLower.includes("shown below") ||
      textLower.includes("given below");

    const hasImage = Boolean((q as any).imagePath || (q as any).figureDoc || (q as any).diagramSource);

    if (mentionsDiagram && !hasImage) {
      danglingReferences.push(
        `Question ${qNum} references a diagram or figure, but no image or vector graphic is attached.`,
      );
    }
  }

  const structuralPassed =
    missingQuestionsCount === 0 &&
    numberingIssues.length === 0 &&
    danglingReferences.length === 0 &&
    structuralIssues.length === 0;

  // -----------------------------------------------------------------
  // 3. BLUEPRINT COMPLIANCE
  // -----------------------------------------------------------------
  const bpIssues: string[] = [];
  const unfulfilledSections = blueprint.sections
    .filter((sec) => items.filter((it) => it.sectionId === sec.id).length < sec.count)
    .map((s) => s.title);

  const internalChoiceViolations: string[] = [];
  for (const sec of blueprint.sections) {
    const secItems = items.filter((it) => it.sectionId === sec.id);
    if (sec.orChoiceMode === "REQUIRED" || sec.marksEach >= 3) {
      for (let idx = 0; idx < secItems.length; idx++) {
        const it = secItems[idx];
        if (!it.orQuestion && !it.question.orQuestion) {
          internalChoiceViolations.push(
            `Section "${sec.title}" Question ${idx + 1} (${sec.marksEach}m) is missing required alternative (OR / अथवा) question.`,
          );
        }
      }
    }
  }

  if (unfulfilledSections.length > 0) {
    bpIssues.push(`Unfulfilled sections: ${unfulfilledSections.join(", ")}`);
  }
  bpIssues.push(...internalChoiceViolations);

  const bpPassed = bpIssues.length === 0;

  // -----------------------------------------------------------------
  // 4. ACADEMIC BALANCE
  // -----------------------------------------------------------------
  const balanceIssues: string[] = [];
  let easyCount = 0;
  let medCount = 0;
  let hardCount = 0;

  const cognitiveCounts = {
    REMEMBERING: 0,
    UNDERSTANDING: 0,
    APPLYING: 0,
    ANALYZING_EVALUATING: 0,
  };

  for (const it of items) {
    const diff = (it.question.difficulty || "MEDIUM").toUpperCase();
    if (diff === "EASY") easyCount++;
    else if (diff === "HARD") hardCount++;
    else medCount++;

    const cog = String((it.question as any).cognitiveLevel || "APPLYING").toUpperCase();
    if (cog.includes("REMEMBER")) cognitiveCounts.REMEMBERING++;
    else if (cog.includes("UNDERSTAND")) cognitiveCounts.UNDERSTANDING++;
    else if (cog.includes("APPLY")) cognitiveCounts.APPLYING++;
    else cognitiveCounts.ANALYZING_EVALUATING++;
  }

  const totalQ = Math.max(1, items.length);
  const diffPercentages = {
    EASY: Math.round((easyCount / totalQ) * 100),
    MEDIUM: Math.round((medCount / totalQ) * 100),
    HARD: Math.round((hardCount / totalQ) * 100),
  };

  if (items.length >= 10) {
    if (diffPercentages.HARD > 40) {
      balanceIssues.push(`Question paper is excessively difficult (${diffPercentages.HARD}% Hard questions).`);
    } else if (diffPercentages.EASY > 60) {
      balanceIssues.push(`Question paper is excessively easy (${diffPercentages.EASY}% Easy questions).`);
    }
  }

  const balancePassed = balanceIssues.length === 0;

  // -----------------------------------------------------------------
  // AGGREGATE FINAL RESULT
  // -----------------------------------------------------------------
  const overallPassed = marksPassed && structuralPassed && bpPassed;
  const status: "PASS" | "FAIL" | "WARN" = !overallPassed
    ? "FAIL"
    : !balancePassed
    ? "WARN"
    : "PASS";

  let score = 100;
  if (!marksPassed) score -= 40;
  if (!structuralPassed) score -= 30;
  if (!bpPassed) score -= 20;
  if (!balancePassed) score -= 10;
  score = Math.max(0, score);

  return {
    status,
    overallScore: score,
    marksValidation: {
      passed: marksPassed,
      actualTotalMarks,
      expectedTotalMarks,
      sectionMarksBreakdown,
      issues: marksIssues,
    },
    structuralCompleteness: {
      passed: structuralPassed,
      totalExpectedQuestions,
      totalActualQuestions: items.length,
      missingQuestionsCount,
      numberingIssues,
      danglingReferences,
      issues: structuralIssues,
    },
    blueprintCompliance: {
      passed: bpPassed,
      unfulfilledSections,
      internalChoiceViolations,
      issues: bpIssues,
    },
    academicBalance: {
      passed: balancePassed,
      difficultyDistribution: {
        EASY: easyCount,
        MEDIUM: medCount,
        HARD: hardCount,
        percentages: diffPercentages,
      },
      cognitiveDistribution: cognitiveCounts,
      issues: balanceIssues,
    },
    summary:
      status === "PASS"
        ? `Paper is 100% complete: Grand total matches ${expectedTotalMarks} marks, all sections filled, and structure is verified.`
        : `Paper completeness validation failed (${status}): ${[...marksIssues, ...structuralIssues, ...bpIssues, ...balanceIssues].slice(0, 3).join("; ")}`,
  };
}
