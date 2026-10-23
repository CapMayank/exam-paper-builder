import { cleanOptionText, isMcqLikeType } from "./constants";
import type { PaperData } from "./types";

export type PreflightIssue = {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  questionNumber?: number;
  questionId?: string;
};

export type PreflightReport = {
  canFinalize: boolean;
  totalIssues: number;
  errors: PreflightIssue[];
  warnings: PreflightIssue[];
  info: PreflightIssue[];
};

/**
 * Pure heuristic quality and errata checker run prior to paper finalization.
 * Identifies missing answers, duplicate text, unset dates, and formatting gaps.
 */
export function validatePaperPreflight(paper: PaperData): PreflightReport {
  const issues: PreflightIssue[] = [];

  // 1. Structure & Blueprint completeness check
  if (!paper.progress.complete) {
    const targetQuestions = paper.blueprint.sections.reduce((s, x) => s + x.count, 0);
    issues.push({
      code: "BLUEPRINT_INCOMPLETE",
      severity: "error",
      message: `Paper does not match blueprint quotas (${paper.items.length}/${targetQuestions} questions, ${paper.progress.usedMarks}/${paper.progress.totalMarks} marks).`,
    });
  }

  // 2. Exam Date validation
  if (!paper.examDate || paper.examDate.trim() === "" || paper.examDate === "DD/MM/YYYY") {
    issues.push({
      code: "DATE_UNSET",
      severity: "warning",
      message: "Examination Date is not set. It will print as blank on student question sheets.",
    });
  }

  // 3. General Instructions check
  if (!paper.generalInstructions || paper.generalInstructions.trim() === "") {
    issues.push({
      code: "INSTRUCTIONS_EMPTY",
      severity: "info",
      message: "General instructions are empty. Consider specifying reading time, calculator rules, or section instructions.",
    });
  }

  // 4. Duplicate Question Text within Paper
  const seenTexts = new Map<string, number>();
  let globalQNum = 1;

  for (const item of paper.items) {
    const qNum = globalQNum++;
    const q = item.question;
    const normText = q.text.trim().toLowerCase().replace(/\s+/g, " ");

    if (seenTexts.has(normText)) {
      const priorNum = seenTexts.get(normText)!;
      issues.push({
        code: "DUPLICATE_QUESTION_TEXT",
        severity: "warning",
        message: `Question ${qNum} has identical wording to Question ${priorNum}.`,
        questionNumber: qNum,
        questionId: q.id,
      });
    } else {
      seenTexts.set(normText, qNum);
    }

    // 5. Answer Key Validation for Objective Questions
    if (isMcqLikeType(q.type) || q.type === "TRUE_FALSE" || q.type === "VERY_SHORT") {
      if (!q.answer || q.answer.trim() === "") {
        issues.push({
          code: "MISSING_ANSWER_KEY",
          severity: "warning",
          message: `Question ${qNum} (${q.type}) has no model answer recorded. Answer keys and marking schemes will show a blank answer.`,
          questionNumber: qNum,
          questionId: q.id,
        });
      }
    }

    // 6. Subparts Marks Verification
    if (q.subparts && q.subparts.length > 0) {
      const sum = q.subparts.reduce((total, sp) => total + (Number(sp.marks) || 0), 0);
      const sec = paper.blueprint.sections.find((s) => s.id === item.sectionId);
      if (sec && sum !== sec.marksEach) {
        issues.push({
          code: "SUBPARTS_MARKS_MISMATCH",
          severity: "warning",
          message: `Question ${qNum} subpart marks total ${sum}m, but section marks quota is ${sec.marksEach}m.`,
          questionNumber: qNum,
          questionId: q.id,
        });
      }
    }

    // 7. Internal Choice (OR) Validation
    if (item.orQuestion) {
      const orQ = item.orQuestion;
      if (orQ.chapterId !== q.chapterId) {
        issues.push({
          code: "OR_CHAPTER_MISMATCH",
          severity: "info",
          message: `Question ${qNum} alternate (OR) choice is from Chapter ${orQ.chapter?.number || "?"}, differing from primary Question Chapter ${q.chapter?.number || "?"}.`,
          questionNumber: qNum,
          questionId: orQ.id,
        });
      }
    }

    // 8. Session Collision Alert
    if (q.usages && q.usages.length > 0) {
      const collision = q.usages.find(
        (u) =>
          u.paperId !== paper.id &&
          u.academicSession === paper.academicSession &&
          u.status === "FINAL"
      );
      if (collision) {
        issues.push({
          code: "SESSION_COLLISION",
          severity: "info",
          message: `Question ${qNum} was already finalized in "${collision.paperTitle}" during the same session (${paper.academicSession}).`,
          questionNumber: qNum,
          questionId: q.id,
        });
      }
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const info = issues.filter((i) => i.severity === "info");

  return {
    canFinalize: errors.length === 0,
    totalIssues: issues.length,
    errors,
    warnings,
    info,
  };
}
