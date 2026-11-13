import { cleanOptionText, isMcqLikeType } from "./constants";
import { evaluatePaperInternalChoiceCompliance, orChapterRequired } from "./internalChoiceRules";
import { computeDisplayedPaperNumbering } from "./layout";
import { isTemplateFiller } from "./templateFiller";
import { findPlaceholder, marksMismatchMessage, plainText } from "./preflightChecks";
import { attemptedSubpartsMarks, unequalAnyKOfN, unequalAnyKOfNMessage, validateSubPartsSum, type PaperData } from "./types";

export type PreflightIssue = {
  code: string;
  /** Short heading for the issue; the message explains it. */
  title?: string;
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
      title: "Questions missing",
      severity: "error",
      message: `Paper does not match blueprint quotas (${paper.items.length}/${targetQuestions} questions, ${paper.progress.usedMarks}/${paper.progress.totalMarks} marks).`,
    });
  }

  // 1a. Slots full but marks off
  if (paper.progress.complete) {
    const marksMsg = marksMismatchMessage(paper.progress);
    if (marksMsg) issues.push({ code: "MARKS_MISMATCH", title: "Marks do not add up", severity: "error", message: marksMsg });
  }

  // 1b. Chapter coverage is a guide: report the difference, never block on it
  {
    const unitOf = new Map(paper.blueprint.chapters.map((c) => [c.chapterId, c.unitKey || c.chapterId]));
    const groups = new Map<string, { target: number; used: number }>();
    for (const c of paper.progress.chapters ?? []) groups.set(unitOf.get(c.chapterId) ?? c.chapterId, { target: c.target, used: c.used });
    const off = [...groups.values()].filter((g) => g.used !== g.target).length;
    if (off > 0) {
      issues.push({
        code: "CHAPTER_COVERAGE",
        severity: "info",
        message: `Chapter coverage differs from the blueprint for ${off} chapter(s). This does not stop finalising.`,
      });
    }
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
  const seenIds = new Map<string, number>();
  const blueprintChapters = new Set(paper.blueprint.chapters.map((c) => c.chapterId));
  // numbered as on the printed paper: section by section, not by raw position
  const numbering = computeDisplayedPaperNumbering(paper.blueprint.sections, paper.items, paper.numberingStyle || "CONTINUOUS");
  const sectionOrder = new Map(paper.blueprint.sections.map((s, i) => [s.id, i]));
  const orderedItems = [...paper.items].sort(
    (a, b) => (sectionOrder.get(a.sectionId) ?? 999) - (sectionOrder.get(b.sectionId) ?? 999) || a.position - b.position,
  );
  let fallbackNum = 0;

  for (const item of orderedItems) {
    fallbackNum++;
    const qNum = numbering.itemNumbers[item.id]?.questionNumber || fallbackNum;
    const q = item.question;
    const normText = q.text.trim().toLowerCase().replace(/\s+/g, " ");

    const idOf = (id: string, num: number) => {
      if (seenIds.has(id)) {
        issues.push({
          code: "DUPLICATE_QUESTION_ID",
          title: "Same question used twice",
          severity: "error",
          message: `Question ${num} is the same bank question as Question ${seenIds.get(id)}.`,
          questionNumber: num,
          questionId: id,
        });
      } else seenIds.set(id, num);
    };
    idOf(q.id, qNum);
    if (item.orQuestion) idOf(item.orQuestion.id, qNum);

    // empty or placeholder text, in the question, its OR and its parts
    const textsOf = (x: typeof q, label: string) => {
      if (!plainText(x.text)) {
        issues.push({ code: "EMPTY_QUESTION_TEXT", title: "Empty question", severity: "error", message: `${label} has no question text.`, questionNumber: qNum, questionId: q.id });
      }
      const ph = findPlaceholder(x.text);
      if (ph) {
        issues.push({ code: "PLACEHOLDER_TEXT", title: "Placeholder text left in", severity: "error", message: `${label} still contains placeholder text: ${ph}`, questionNumber: qNum, questionId: q.id });
      }
      for (const sp of x.subparts ?? []) {
        if (!plainText(sp.text)) {
          issues.push({ code: "EMPTY_PART_TEXT", title: "Empty part", severity: "error", message: `${label}, part ${sp.label || "?"} has no text.`, questionNumber: qNum, questionId: q.id });
        }
      }
    };
    textsOf(q, `Question ${qNum}`);
    if (item.orQuestion) textsOf(item.orQuestion, `Question ${qNum} (OR)`);

    if (isTemplateFiller(q) || (item.orQuestion && isTemplateFiller(item.orQuestion))) {
      issues.push({
        code: "TEMPLATE_FILLER",
        title: "Generic template question",
        severity: "warning",
        message: `Question ${qNum} is a generic template question that needs a teacher's review.`,
        questionNumber: qNum,
        questionId: q.id,
      });
    }

    if (item.orQuestion && (!item.orQuestion.answer || item.orQuestion.answer.trim() === "")) {
      issues.push({
        code: "MISSING_OR_ANSWER",
        title: "OR question has no answer",
        severity: "warning",
        message: `Question ${qNum} (OR) has no model answer recorded.`,
        questionNumber: qNum,
        questionId: item.orQuestion.id,
      });
    }

    for (const cq of [q, item.orQuestion]) {
      if (cq && cq.chapterId && blueprintChapters.size > 0 && !blueprintChapters.has(cq.chapterId)) {
        issues.push({
          code: "CHAPTER_OUTSIDE_BLUEPRINT",
          title: "Chapter not in the blueprint",
          severity: "warning",
          message: `Question ${qNum}${cq === q ? "" : " (OR)"} is from a chapter that is not in the blueprint.`,
          questionNumber: qNum,
          questionId: cq.id,
        });
      }
    }

    if (seenTexts.has(normText) && normText) {
      const priorNum = seenTexts.get(normText)!;
      issues.push({
        code: "DUPLICATE_QUESTION_TEXT",
        severity: "warning",
        message: `Question ${qNum} has identical wording to Question ${priorNum}.`,
        questionNumber: qNum,
        questionId: q.id,
      });
    } else if (normText) {
      seenTexts.set(normText, qNum);
    }
    if (item.orQuestion) {
      const orNorm = item.orQuestion.text.trim().toLowerCase().replace(/\s+/g, " ");
      if (orNorm && (orNorm === normText || seenTexts.has(orNorm))) {
        issues.push({
          code: "DUPLICATE_QUESTION_TEXT",
          title: "Repeated wording",
          severity: "warning",
          message: `Question ${qNum} (OR) has identical wording to ${orNorm === normText ? "its main question" : `Question ${seenTexts.get(orNorm)}`}.`,
          questionNumber: qNum,
          questionId: item.orQuestion.id,
        });
      } else if (orNorm) seenTexts.set(orNorm, qNum);
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
      const sec = paper.blueprint.sections.find((s) => s.id === item.sectionId);
      const attemptCount = q.attemptCount;
      const isValid = validateSubPartsSum(q.subparts, sec?.marksEach ?? 1, attemptCount);
      if (sec && !isValid) {
        const sum = attemptedSubpartsMarks(q.subparts, attemptCount);
        const unequal = unequalAnyKOfN(q.subparts, attemptCount);
        issues.push({
          code: "SUBPARTS_MARKS_MISMATCH",
          severity: "warning",
          message: unequal
            ? `Question ${qNum}: ${unequalAnyKOfNMessage(unequal)}.`
            : `Question ${qNum} subpart marks total ${sum}m, but section marks quota is ${sec.marksEach}m.`,
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
          title: "OR question from another chapter",
          severity: orChapterRequired(paper.blueprint.book.className) ? "error" : "info",
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

  // 9. Mandatory / Forbidden Internal Choice (OR / अथवा) Compliance Check
  const choiceAudit = evaluatePaperInternalChoiceCompliance({
    schoolName: paper.schoolName,
    blueprintName: paper.blueprint.name,
    className: paper.blueprint.book.className,
    academicSession: paper.academicSession || (paper.blueprint as any).academicSession,
    subject: paper.blueprint.book.subject,
    subjectCode: paper.subjectCode || (paper.blueprint as any).subjectCode,
    sections: paper.blueprint.sections.map((s) => ({
      id: s.id,
      title: s.title,
      type: s.type,
      count: s.count,
      marksEach: s.marksEach,
      instructions: s.instructions,
      // the blueprint's own "OR required / no OR" setting, as the server's audit reads it
      orChoiceMode: s.orChoiceMode,
      orAlternativeCount: s.orAlternativeCount,
      orSlotsJson: s.orSlotsJson,
    })),
    items: orderedItems.map((i) => ({
      id: i.id,
      sectionId: i.sectionId,
      question: {
        id: i.question.id,
        text: i.question.text,
        type: i.question.type,
        chapterId: i.question.chapter?.id || i.question.chapterId,
        answer: i.question.answer,
      },
      orQuestion: i.orQuestion
        ? {
            id: i.orQuestion.id,
            text: i.orQuestion.text,
            type: i.orQuestion.type,
            chapterId: i.orQuestion.chapter?.id || i.orQuestion.chapterId,
            answer: i.orQuestion.answer,
          }
        : null,
    })),
  });

  for (const choiceIss of choiceAudit.issues) {
    issues.push({
      code: choiceIss.code,
      severity: choiceIss.severity,
      message: choiceIss.message,
      questionNumber: choiceIss.questionNumber,
      questionId: choiceIss.questionId,
    });
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
