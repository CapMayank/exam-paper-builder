import {
  cleanOptionText,
  isMcqLikeType,
  isSubpartQuestionType,
  parseMatchColumnPairs,
  type QuestionType,
} from "./constants";
import { cleanChapterTitleForLookup, type GenerationContract } from "./curriculumContract";
import { isParaphraseOrDuplicateChoice } from "./internalChoiceRules";
import { getCanonicalSubjectName } from "./schoolCurriculum";
import { subpartsTotalMarks, type SubPart } from "./types";

export interface ValidatableQuestion {
  slotIndex?: number;
  chapterId?: string;
  chapterNumber?: number;
  chapterTitle?: string;
  type: QuestionType | string;
  text: string;
  options?: string[];
  subparts?: SubPart[];
  answer?: string;
  explanation?: string;
  marks?: number;
  difficulty?: string;
  requiresInternalChoice?: boolean;
  orQuestion?: ValidatableQuestion | null;
}

export interface QuestionValidationIssue {
  code:
    | "CROSS_SUBJECT_CONTAMINATION"
    | "GENERIC_FALLBACK_TEMPLATE"
    | "CHAPTER_MISMATCH"
    | "DELETED_SYLLABUS_TOPIC"
    | "QUESTION_TYPE_MISMATCH"
    | "INVALID_MCQ_OPTIONS"
    | "ANSWER_OPTION_MISMATCH"
    | "MARKS_MISMATCH"
    | "LATEX_CORRUPTION"
    | "LANGUAGE_MISMATCH"
    | "DUPLICATE_QUESTION"
    | "INCOMPLETE_CONTENT"
    | "MISSING_INTERNAL_CHOICE"
    | "FORBIDDEN_INTERNAL_CHOICE"
    | "INVALID_INTERNAL_CHOICE";
  severity: "ERROR" | "WARNING";
  message: string;
  slotIndex?: number;
}

export interface QuestionValidationResult {
  valid: boolean;
  issues: QuestionValidationIssue[];
}

export interface SectionValidationResult {
  valid: boolean;
  acceptedQuestions: ValidatableQuestion[];
  rejectedSlotIndices: number[];
  issues: QuestionValidationIssue[];
}

const GENERIC_TEMPLATE_PATTERNS: RegExp[] = [
  /examine the fundamental principles of\b/i,
  /describe the core mechanisms and their biological\/scientific significance/i,
  /which of the following statements is correct regarding the core process in\b/i,
  /primary process responsible for physiological regulation in\b/i,
  /operates unidirectionally under standard physiological conditions/i,
  /response of biological specimens to varying external stimuli/i,
  /refer to standard model answer/i,
  /^question regarding\s+/i,
  /key mechanism and definition of\b/i,
  /underlying mathematical formulation and unit scale/i,
  /spectroscopic signature and energy transition state/i,
  /material property tensor response/i,
  /process x in .* is essential for maintaining cellular homeostasis/i,
];

const BIOLOGY_CONTAMINATION_PATTERNS: RegExp[] = [
  /regulated physiological pathways/i,
  /energy investment or enzymatic involvement/i,
  /non-living abiotic systems/i,
  /independent of cellular metabolism/i,
  /maintaining cellular homeostasis/i,
  /inhibits all metabolic activity/i,
  /double fertilization in angiosperms/i,
  /microsporogenesis/i,
  /megasporogenesis/i,
  /punnett square/i,
  /trophic pyramid/i,
  /stomatal transpiration/i,
  /chloroplast stroma/i,
];

const CHEMISTRY_TEMPLATE_PATTERNS: RegExp[] = [
  /aqueous solution of lead nitrate with potassium iodide/i,
  /yellow precipitate of lead\s*(?:\(ii\))?\s*iodide/i,
  /potassium iodide.*lead\s*(?:\(ii\))?\s*nitrate/i,
  /silver chloride turns grey when exposed to sunlight/i,
  /three clean iron nails are placed in separate test tubes/i,
  /depositing a protective layer of zinc on iron to prevent rusting/i,
  /when quicklime is added to water in a beaker/i,
  /allosteric control regulation/i,
  /substrate binding site/i,
];

const CLASS10_TRIANGLE_OVERRIDE_PATTERN =
  /(?:in the given right triangle abc|right-angled triangle abc)[^.]*(?:ab\s*=\s*6\s*cm|bc\s*=\s*8\s*cm)/i;

/**
 * Checks whether a question contains known cross-subject fallback templates or control-character corruption.
 * Used both by the AI validation gate and by database autofill filters.
 */
export function isQuestionContaminated(
  question: {
    text?: string | null;
    options?: string[] | string | null;
    subparts?: SubPart[] | string | null;
    answer?: string | null;
    explanation?: string | null;
    chapterTitle?: string | null;
  },
  rawSubject: string,
  className = "Class 12",
): { contaminated: boolean; reason?: string } {
  const canonicalSubject = getCanonicalSubjectName(rawSubject) || rawSubject.trim();
  const optionsArr: string[] = Array.isArray(question.options)
    ? question.options
    : typeof question.options === "string"
    ? (() => {
        try {
          const parsed = JSON.parse(question.options);
          return Array.isArray(parsed) ? parsed.map(String) : [question.options];
        } catch {
          return [question.options];
        }
      })()
    : [];

  const combinedText = [
    question.text || "",
    ...optionsArr,
    question.answer || "",
    question.explanation || "",
  ].join("\n");

  // 1. Check generic fallback templates across ALL subjects
  for (const pat of GENERIC_TEMPLATE_PATTERNS) {
    if (pat.test(combinedText)) {
      return {
        contaminated: true,
        reason: `Contains generic fallback template matching ${pat}`,
      };
    }
  }

  // 2. Check ASCII control character corruption (\x08 backspace from \beta/\begin, \x0c form-feed from \frac)
  if (/[\x08\x0c]/.test(combinedText)) {
    return {
      contaminated: true,
      reason: "Contains corrupted ASCII control characters (unescaped LaTeX \\frac or \\beta in JSON).",
    };
  }

  // 3. Check Biology cellular metabolism contamination in non-Biology / non-Science subjects
  if (canonicalSubject !== "Biology" && canonicalSubject !== "Science") {
    for (const pat of BIOLOGY_CONTAMINATION_PATTERNS) {
      if (pat.test(combinedText)) {
        return {
          contaminated: true,
          reason: `Contains Biology-specific content (${pat}) in a ${canonicalSubject} question.`,
        };
      }
    }
  }

  // 4. Even in Biology or Science, the 4 hardcoded fallback MCQ options are generic boilerplate
  if (
    /regulated physiological pathways/i.test(combinedText) &&
    /non-living abiotic systems/i.test(combinedText)
  ) {
    return {
      contaminated: true,
      reason: "Contains hardcoded generic physiological/abiotic MCQ fallback options.",
    };
  }

  // 5. Check Chemistry hardcoded fallback templates in non-Chemistry / non-Science subjects
  if (canonicalSubject !== "Chemistry" && canonicalSubject !== "Science") {
    for (const pat of CHEMISTRY_TEMPLATE_PATTERNS) {
      if (pat.test(combinedText)) {
        return {
          contaminated: true,
          reason: `Contains Chemistry-specific template (${pat}) in a ${canonicalSubject} question.`,
        };
      }
    }
  }

  // 6. Check Class 10 right-triangle override in Class 11/12 or non-triangle chapters
  if (CLASS10_TRIANGLE_OVERRIDE_PATTERN.test(question.text || "")) {
    const isSeniorClass = /\b(11|12|xi|xii)\b/i.test(className);
    const chLower = cleanChapterTitleForLookup(question.chapterTitle || "").toLowerCase();
    const isTrigOrTriangleChapter =
      !isSeniorClass && (chLower.includes("trigonometr") || chLower.includes("triangle"));
    if (!isTrigOrTriangleChapter) {
      return {
        contaminated: true,
        reason: `Contains hardcoded Class 10 right-triangle problem in ${className} chapter "${question.chapterTitle || "unknown"}".`,
      };
    }
  }

  return { contaminated: false };
}

/**
 * Checks whether an MCQ's answer actually corresponds to one of its options.
 */
function doesMcqAnswerMatchOptions(answer: string, options: string[]): boolean {
  const rawAns = (answer || "").trim();
  if (!rawAns || options.length === 0) return false;

  const cleanedAns = cleanOptionText(rawAns).toLowerCase().trim();
  const normalizedOptions = options.map((o) => cleanOptionText(o).toLowerCase().trim());

  // 1. Direct or substring match on option content
  for (const normOpt of normalizedOptions) {
    if (!normOpt) continue;
    if (cleanedAns === normOpt || rawAns.toLowerCase().includes(normOpt)) {
      return true;
    }
  }

  // 2. Option letter match: "A", "(a)", "Option B", "(c) ...", or Devanagari "(क)", "(ख)", "(ग)", "(घ)"
  const letterMatch = rawAns.match(/^\s*(?:option\s*|विकल्प\s*)?\(?([a-dA-D1-4कखगघ])\)?(?:[\s.:)\-]|$)/i);
  if (letterMatch) {
    const rawToken = letterMatch[1];
    let idx = -1;
    if (/[a-dA-D1-4]/.test(rawToken)) {
      const token = rawToken.toUpperCase();
      idx =
        token === "A" || token === "1"
          ? 0
          : token === "B" || token === "2"
          ? 1
          : token === "C" || token === "3"
          ? 2
          : 3;
    } else if (/[कखगघ]/.test(rawToken)) {
      idx = rawToken === "क" ? 0 : rawToken === "ख" ? 1 : rawToken === "ग" ? 2 : 3;
    }
    if (idx >= 0 && idx < options.length) {
      const remainder = cleanOptionText(rawAns).toLowerCase().trim();
      // If answer is just "(a)" or "(क)", or if remainder matches the option at idx
      if (!remainder || remainder.length <= 2 || normalizedOptions[idx].includes(remainder) || remainder.includes(normalizedOptions[idx])) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks deleted syllabus topics for Class 12 Mathematics (2025–26 / 2026–27).
 */
function checkDeletedSyllabusTopics(
  text: string,
  canonicalSubject: string,
  className: string,
  chapterTitle: string,
): string | null {
  if (canonicalSubject !== "Mathematics" || !/\b(12|xii)\b/i.test(className)) {
    return null;
  }
  const ch = cleanChapterTitleForLookup(chapterTitle).toLowerCase();
  const t = text.toLowerCase();

  if (ch.includes("relations") && /\bbinary operation\b/i.test(t)) {
    return "Binary operations are deleted from the rationalized Class 12 Mathematics syllabus (Relations and Functions).";
  }
  if (ch.includes("continuity") && (/\brolle'?s theorem\b/i.test(t) || /\blagrange'?s mean value theorem\b/i.test(t))) {
    return "Rolle's and Lagrange's Mean Value Theorems are deleted from the rationalized Class 12 Mathematics syllabus.";
  }
  if (ch.includes("matrices") && /\belementary (row|column) (operation|transformation)s?\b/i.test(t)) {
    return "Finding inverse by elementary row/column operations is deleted from the rationalized Class 12 Mathematics syllabus.";
  }
  if (ch.includes("integrals") && !ch.includes("application") && /\blimit of a sum\b/i.test(t)) {
    return "Definite integral as the limit of a sum is deleted from the rationalized Class 12 Mathematics syllabus.";
  }
  if (ch.includes("vector") && /\bscalar triple product\b/i.test(t)) {
    return "Scalar triple product is deleted from the rationalized Class 12 Mathematics syllabus.";
  }
  if (ch.includes("three dimensional") && /\bequation of (a |the )?plane\b/i.test(t)) {
    return "Equations of a plane are deleted from the rationalized Class 12 Mathematics syllabus (3D Geometry).";
  }

  return null;
}

/**
 * Validates a single generated question against the Subject-Specific Generation Contract.
 */
export function validateGeneratedQuestion(
  question: ValidatableQuestion,
  contract: GenerationContract,
  opts?: {
    slotIndex?: number;
    existingNormalizedTexts?: Set<string>;
    skipInternalChoiceCheck?: boolean;
  },
): QuestionValidationResult {
  const issues: QuestionValidationIssue[] = [];
  const slotIdx = opts?.slotIndex ?? question.slotIndex ?? 0;
  const slot = contract.slots.find((s) => s.slotIndex === slotIdx) || contract.slots[0];
  const chapterTitle = question.chapterTitle || slot?.chapterTitle || "";
  const qType = (question.type || contract.questionType) as QuestionType;
  const text = (question.text || "").trim();
  const answer = (question.answer || "").trim();
  const options = Array.isArray(question.options) ? question.options.map((o) => String(o).trim()) : [];
  const subparts = isSubpartQuestionType(qType) && Array.isArray(question.subparts) ? question.subparts : [];

  // 1. Content completeness check
  if (!text || text.length < 5) {
    issues.push({
      code: "INCOMPLETE_CONTENT",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Question stem text is empty or too short.`,
      slotIndex: slotIdx,
    });
  }

  // 2. Contamination & generic fallback check
  const contam = isQuestionContaminated(
    {
      text,
      options,
      subparts,
      answer,
      explanation: question.explanation,
      chapterTitle,
    },
    contract.rawSubject,
    contract.className,
  );
  if (contam.contaminated) {
    const isGeneric = /generic fallback template/i.test(contam.reason || "");
    issues.push({
      code: isGeneric ? "GENERIC_FALLBACK_TEMPLATE" : "CROSS_SUBJECT_CONTAMINATION",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: ${contam.reason}`,
      slotIndex: slotIdx,
    });
  }

  // 3. Deleted syllabus topic check
  const deletedTopicError = checkDeletedSyllabusTopics(
    text,
    contract.canonicalSubject,
    contract.className,
    chapterTitle,
  );
  if (deletedTopicError) {
    issues.push({
      code: "DELETED_SYLLABUS_TOPIC",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: ${deletedTopicError}`,
      slotIndex: slotIdx,
    });
  }

  // 4. Question-type structural and answer checks
  if (qType !== contract.questionType) {
    issues.push({
      code: "QUESTION_TYPE_MISMATCH",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Expected question type "${contract.questionType}", but received "${qType}".`,
      slotIndex: slotIdx,
    });
  }

  if (isMcqLikeType(qType)) {
    const nonEmptyOptions = options.filter((o) => o.length > 0);
    if (nonEmptyOptions.length < 4) {
      issues.push({
        code: "INVALID_MCQ_OPTIONS",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: ${qType} requires 4 non-empty options, found ${nonEmptyOptions.length}.`,
        slotIndex: slotIdx,
      });
    } else {
      const uniqueOpts = new Set(nonEmptyOptions.map((o) => cleanOptionText(o).toLowerCase()));
      if (uniqueOpts.size < 4) {
        issues.push({
          code: "INVALID_MCQ_OPTIONS",
          severity: "ERROR",
          message: `Slot ${slotIdx + 1}: ${qType} contains duplicate options.`,
          slotIndex: slotIdx,
        });
      }
    }

    if (qType === "ASSERTION_REASON") {
      const hasAssertion = /assertion\s*\(a\)|अभिकथन\s*\(a\)|कथनम्?\s*\(a\)/i.test(text);
      const hasReason = /reason\s*\(r\)|कारण\s*\(r\)|तर्क\s*\(r\)|हेतुः?\s*\(r\)/i.test(text);
      if (!hasAssertion || !hasReason) {
        issues.push({
          code: "QUESTION_TYPE_MISMATCH",
          severity: "ERROR",
          message: `Slot ${slotIdx + 1}: ASSERTION_REASON question must explicitly include both Assertion (A) and Reason (R).`,
          slotIndex: slotIdx,
        });
      }
    }

    if (!answer) {
      issues.push({
        code: "INCOMPLETE_CONTENT",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: ${qType} is missing an answer key.`,
        slotIndex: slotIdx,
      });
    } else if (nonEmptyOptions.length >= 4 && !doesMcqAnswerMatchOptions(answer, nonEmptyOptions)) {
      issues.push({
        code: "ANSWER_OPTION_MISMATCH",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: ${qType} answer "${answer}" does not match any of the 4 provided options.`,
        slotIndex: slotIdx,
      });
    }
  } else if (qType === "FILL_BLANK") {
    if (!/_{3,}|रिक्त/.test(text)) {
      issues.push({
        code: "QUESTION_TYPE_MISMATCH",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: FILL_BLANK question must contain a blank marker (________).`,
        slotIndex: slotIdx,
      });
    }
    if (!answer) {
      issues.push({
        code: "INCOMPLETE_CONTENT",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: FILL_BLANK question is missing an answer.`,
        slotIndex: slotIdx,
      });
    }
  } else if (qType === "TRUE_FALSE") {
    const isStandardTrueFalse =
      /\b(true|false|t|f)\b/i.test(answer) ||
      /सत्य|असत्य|सही|गलत|आम्|न|सत्यम्|असत्यम्/.test(answer);
    if (!answer || !isStandardTrueFalse) {
      issues.push({
        code: "ANSWER_OPTION_MISMATCH",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: TRUE_FALSE answer "${answer}" must clearly state True/False (or सत्य/असत्य or आम्/न).`,
        slotIndex: slotIdx,
      });
    }
  } else if (qType === "MATCH_COLUMN") {
    const pairs = parseMatchColumnPairs(options, text, question.explanation);
    const expectedPairs = Math.max(
      2,
      contract.slots.length > 1
        ? contract.slots.length
        : contract.marksEach > 1
        ? Math.min(contract.marksEach, 10)
        : 4,
    );
    if (pairs.length < expectedPairs) {
      issues.push({
        code: "QUESTION_TYPE_MISMATCH",
        severity: "ERROR",
        message: `MATCH_COLUMN requires ${expectedPairs} valid matching pairs, but only ${pairs.length} were found.`,
        slotIndex: slotIdx,
      });
    }
    if (!answer) {
      issues.push({
        code: "INCOMPLETE_CONTENT",
        severity: "ERROR",
        message: "MATCH_COLUMN is missing an answer key.",
        slotIndex: slotIdx,
      });
    }
  } else if (isSubpartQuestionType(qType)) {
    const targetMarks = slot?.marks || contract.marksEach || 4;
    if (subparts.length === 0) {
      issues.push({
        code: "QUESTION_TYPE_MISMATCH",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: ${qType} requires graded subparts.`,
        slotIndex: slotIdx,
      });
    } else {
      const sum = subpartsTotalMarks(subparts);
      if (sum !== targetMarks) {
        issues.push({
          code: "MARKS_MISMATCH",
          severity: "ERROR",
          message: `Slot ${slotIdx + 1}: ${qType} subparts sum to ${sum} marks, but slot requires ${targetMarks} marks.`,
          slotIndex: slotIdx,
        });
      }
    }
  } else {
    // Subjective question types (VERY_SHORT, SHORT, LONG, NUMERICAL, etc.)
    if (!answer || answer.length < 2) {
      issues.push({
        code: "INCOMPLETE_CONTENT",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: Subjective question is missing a model answer.`,
        slotIndex: slotIdx,
      });
    }
  }

  // 5. Language consistency check
  if ((contract.language === "hi" || contract.language === "sa") && !/[\u0900-\u097F]/.test(text)) {
    const langName = contract.language === "sa" ? "Sanskrit (\"sa\")" : "Hindi (\"hi\")";
    issues.push({
      code: "LANGUAGE_MISMATCH",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Requested ${langName}, but question text contains no Devanagari script.`,
      slotIndex: slotIdx,
    });
  }

  // 6. Duplication check within paper/section
  if (opts?.existingNormalizedTexts) {
    const norm = text
      .toLowerCase()
      .replace(/\$+/g, "")
      .replace(/[.,?!:;]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (norm.length > 15 && opts.existingNormalizedTexts.has(norm)) {
      issues.push({
        code: "DUPLICATE_QUESTION",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: Duplicate question text detected in the same paper.`,
        slotIndex: slotIdx,
      });
    }
  }

  // 7. Internal Choice (OR / अथवा) Completeness & Rule Compliance Check
  if (!opts?.skipInternalChoiceCheck) {
    const slotRequiresChoice = Boolean(
      slot?.requiresInternalChoice ?? contract.internalChoiceRequirement?.required,
    );
    const slotForbidsChoice = Boolean(
      slot?.internalChoiceRequirement?.forbidden ?? contract.internalChoiceRequirement?.forbidden,
    );
    const hasOr = Boolean(question.orQuestion && (question.orQuestion.text || "").trim().length > 0);
    const slotMarks = slot?.marks || contract.marksEach;

    if (slotForbidsChoice && hasOr && slotMarks === 2) {
      issues.push({
        code: "FORBIDDEN_INTERNAL_CHOICE",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: Internal choice (OR / अथवा) is prohibited for 2-mark questions under ${contract.internalChoiceRequirement?.patternVersion || "MPBSE 2026–27 revised rules"}.`,
        slotIndex: slotIdx,
      });
    } else if (slotRequiresChoice) {
      if (!hasOr || !question.orQuestion) {
        issues.push({
          code: "MISSING_INTERNAL_CHOICE",
          severity: "ERROR",
          message: `Slot ${slotIdx + 1}: Mandatory internal choice (OR / अथवा) is missing for this ${slotMarks}-mark slot (${contract.internalChoiceRequirement?.patternVersion || "board blueprint rule"}).`,
          slotIndex: slotIdx,
        });
      } else {
        const orQ = question.orQuestion;
        // Validate the alternative question itself
        const orVal = validateGeneratedQuestion(
          {
            ...orQ,
            type: orQ.type || qType,
            chapterId: orQ.chapterId || question.chapterId || slot?.chapterId,
            chapterTitle: orQ.chapterTitle || chapterTitle,
          },
          contract,
          {
            slotIndex: slotIdx,
            existingNormalizedTexts: opts?.existingNormalizedTexts,
            skipInternalChoiceCheck: true,
          },
        );

        for (const orIss of orVal.issues) {
          issues.push({
            ...orIss,
            message: `Slot ${slotIdx + 1} (OR Alternative): ${orIss.message.replace(/^Slot \d+:\s*/, "")}`,
          });
        }

        // Check that OR alternative belongs to the same chapter
        const primaryChId = question.chapterId || slot?.chapterId;
        if (orQ.chapterId && primaryChId && orQ.chapterId !== primaryChId) {
          issues.push({
            code: "CHAPTER_MISMATCH",
            severity: "ERROR",
            message: `Slot ${slotIdx + 1} (OR Alternative): Must belong to the same chapter (${chapterTitle}) as the primary question.`,
            slotIndex: slotIdx,
          });
        }

        // Check that OR alternative is not identical or a mere paraphrase of the primary question
        const paraCheck = isParaphraseOrDuplicateChoice(text, orQ.text || "");
        if (paraCheck.isDuplicateOrParaphrase) {
          issues.push({
            code: "INVALID_INTERNAL_CHOICE",
            severity: "ERROR",
            message: `Slot ${slotIdx + 1} (OR Alternative): ${paraCheck.reason || "Alternative question must not be a paraphrase of the primary question."}`,
            slotIndex: slotIdx,
          });
        }
      }
    }
  }

  const hasError = issues.some((i) => i.severity === "ERROR");
  return {
    valid: !hasError,
    issues,
  };
}

/**
 * Validates an entire generated section against the GenerationContract.
 */
export function validateGeneratedSection(
  questions: ValidatableQuestion[],
  contract: GenerationContract,
  existingPaperQuestionTexts: string[] = [],
): SectionValidationResult {
  const seenTexts = new Set<string>(
    existingPaperQuestionTexts
      .map((t) =>
        (t || "")
          .toLowerCase()
          .replace(/\$+/g, "")
          .replace(/[.,?!:;]+$/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter((t) => t.length > 15),
  );

  const acceptedQuestions: ValidatableQuestion[] = [];
  const rejectedSlotIndices: number[] = [];
  const allIssues: QuestionValidationIssue[] = [];

  if (contract.questionType === "MATCH_COLUMN") {
    const q = questions[0];
    if (!q) {
      return {
        valid: false,
        acceptedQuestions: [],
        rejectedSlotIndices: [0],
        issues: [
          {
            code: "INCOMPLETE_CONTENT",
            severity: "ERROR",
            message: "No MATCH_COLUMN question was generated.",
            slotIndex: 0,
          },
        ],
      };
    }
    const res = validateGeneratedQuestion(q, contract, {
      slotIndex: 0,
      existingNormalizedTexts: seenTexts,
    });
    allIssues.push(...res.issues);
    if (res.valid) {
      acceptedQuestions.push(q);
    } else {
      rejectedSlotIndices.push(0);
    }
    return {
      valid: res.valid && acceptedQuestions.length === 1,
      acceptedQuestions,
      rejectedSlotIndices,
      issues: allIssues,
    };
  }

  for (let i = 0; i < contract.slots.length; i++) {
    const slot = contract.slots[i];
    const q =
      questions.find((item) => item.slotIndex === slot.slotIndex) ||
      questions[i];

    if (!q) {
      rejectedSlotIndices.push(slot.slotIndex);
      allIssues.push({
        code: "INCOMPLETE_CONTENT",
        severity: "ERROR",
        message: `Slot ${slot.slotIndex + 1} (${slot.chapterTitle}): Missing generated question.`,
        slotIndex: slot.slotIndex,
      });
      continue;
    }

    const res = validateGeneratedQuestion(q, contract, {
      slotIndex: slot.slotIndex,
      existingNormalizedTexts: seenTexts,
    });
    allIssues.push(...res.issues);

    if (res.valid) {
      const norm = (q.text || "")
        .toLowerCase()
        .replace(/\$+/g, "")
        .replace(/[.,?!:;]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (norm.length > 15) seenTexts.add(norm);
      if (q.orQuestion && q.orQuestion.text) {
        const normOr = q.orQuestion.text
          .toLowerCase()
          .replace(/\$+/g, "")
          .replace(/[.,?!:;]+$/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (normOr.length > 15) seenTexts.add(normOr);
      }
      acceptedQuestions.push(q);
    } else {
      rejectedSlotIndices.push(slot.slotIndex);
    }
  }

  return {
    valid: rejectedSlotIndices.length === 0 && acceptedQuestions.length === contract.slots.length,
    acceptedQuestions,
    rejectedSlotIndices,
    issues: allIssues,
  };
}
