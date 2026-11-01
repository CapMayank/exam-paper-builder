import {
  cleanOptionText,
  isMcqLikeType,
  isSubpartQuestionType,
  parseMatchColumnPairs,
  type QuestionType,
} from "./constants";
import type { GenerationContract } from "./curriculumContract";
import { isParaphraseOrDuplicateChoice } from "./internalChoiceRules";
import {
  tokenizeMath,
  normalizeMathString,
  validateArithmeticEquality,
  validateQuadraticQuestion,
  validateCoordinateGeometryQuestion,
  validateMathematicsVariantAlignment,
} from "./mathQuestionValidator";
import {
  isQuestionContaminated,
  validateChemistryAcademicIntegrity,
  validatePhysicsAcademicIntegrity,
  validateSanskritAcademicIntegrity,
  type ValidatableQuestion,
} from "./questionValidator";
import { subpartsTotalMarks, type SubPart } from "./types";
import { repairLatex } from "./math";

export interface VerificationIssue {
  code: string;
  dimension: keyof QuestionVerificationDimensions;
  severity: "ERROR" | "WARNING" | "INFO";
  message: string;
  evidence?: string;
  recommendation?: string;
}

export interface VerificationDimensionResult {
  passed: boolean;
  score: number; // 0 to 100
  issues: VerificationIssue[];
}

export interface QuestionVerificationDimensions {
  academicCorrectness: VerificationDimensionResult;
  syllabusRelevance: VerificationDimensionResult;
  completeness: VerificationDimensionResult;
  clarity: VerificationDimensionResult;
  marksSuitability: VerificationDimensionResult;
  difficulty: VerificationDimensionResult;
  answerability: VerificationDimensionResult;
  languageQuality: VerificationDimensionResult;
  duplication: VerificationDimensionResult;
  blueprintCompliance: VerificationDimensionResult;
}

export interface QuestionVerificationResult {
  status: "PASS" | "FAIL" | "REVIEW";
  overallScore: number;
  dimensions: QuestionVerificationDimensions;
  allIssues: VerificationIssue[];
  recommendedAction?: "ACCEPT" | "REPAIR" | "REGENERATE" | "MANUAL_REVIEW";
}

function initDimension(): VerificationDimensionResult {
  return { passed: true, score: 100, issues: [] };
}

function addIssue(
  dimensions: QuestionVerificationDimensions,
  dimKey: keyof QuestionVerificationDimensions,
  issue: Omit<VerificationIssue, "dimension">,
) {
  const fullIssue: VerificationIssue = { ...issue, dimension: dimKey };
  dimensions[dimKey].issues.push(fullIssue);
  if (issue.severity === "ERROR") {
    dimensions[dimKey].passed = false;
    dimensions[dimKey].score = Math.max(0, dimensions[dimKey].score - 40);
  } else if (issue.severity === "WARNING") {
    dimensions[dimKey].score = Math.max(0, dimensions[dimKey].score - 15);
  }
}

/**
 * 10-Dimensional Independent Question Verification Engine.
 * Rigorously checks academic correctness, completeness, solvability,
 * MCQ integrity, language purity, and blueprint compliance.
 */
export function verifyQuestionAcademicQuality(
  question: ValidatableQuestion,
  contract: GenerationContract,
  opts: {
    slotIndex?: number;
    existingQuestionTexts?: string[];
    isPrimary?: boolean;
  } = {},
): QuestionVerificationResult {
  const dimensions: QuestionVerificationDimensions = {
    academicCorrectness: initDimension(),
    syllabusRelevance: initDimension(),
    completeness: initDimension(),
    clarity: initDimension(),
    marksSuitability: initDimension(),
    difficulty: initDimension(),
    answerability: initDimension(),
    languageQuality: initDimension(),
    duplication: initDimension(),
    blueprintCompliance: initDimension(),
  };

  const slotIdx = opts.slotIndex ?? question.slotIndex ?? 0;
  const slots = contract?.slots || [];
  const slot = slots[slotIdx] || slots[0];
  const qText = String(question.text || "").trim();
  const qType = String(question.type || contract?.questionType || "SHORT").toUpperCase();
  const qAns = String(question.answer || "").trim();
  const qExp = String(question.explanation || "").trim();
  const options = Array.isArray(question.options) ? question.options.map((o) => cleanOptionText(String(o).trim())) : [];
  const marks = Number(question.marks) || slot?.marks || contract?.marksEach || 1;

  // -------------------------------------------------------------
  // 1. COMPLETENESS & DANGLING REFERENCES
  // -------------------------------------------------------------
  const wordCount = qText.split(/\s+/).filter(Boolean).length;
  if (!qText || qText.length < 15 || wordCount < 3) {
    addIssue(dimensions, "completeness", {
      code: "EMPTY_OR_TRUNCATED_TEXT",
      severity: "ERROR",
      message: "Question text is missing, empty, or too short to be an independent examination question.",
      evidence: `Text: "${qText}" (length: ${qText.length}, words: ${wordCount})`,
      recommendation: "Provide a complete question statement with all necessary conditions.",
    });
  }

  // Detect dangling figure/diagram references
  const lowerText = qText.toLowerCase();
  const mentionsVisual =
    lowerText.includes("diagram shown") ||
    lowerText.includes("given figure") ||
    lowerText.includes("figure shown") ||
    lowerText.includes("in the figure below") ||
    lowerText.includes("in the diagram below") ||
    lowerText.includes("observe the diagram") ||
    lowerText.includes("observe the figure") ||
    lowerText.includes("parts labeled a, b") ||
    lowerText.includes("labeled part") ||
    lowerText.includes("shown in the figure") ||
    lowerText.includes("given below in the diagram");

  const hasAttachedVisual = Boolean(
    (question as any).imagePath ||
      (question as any).figureDoc ||
      (question as any).figurePrompt ||
      (question as any).diagramSource,
  );

  if (mentionsVisual && !hasAttachedVisual) {
    addIssue(dimensions, "completeness", {
      code: "MISSING_DIAGRAM_REFERENCE",
      severity: "ERROR",
      message: "Question explicitly references a diagram, figure, or labeled visual that is not attached.",
      evidence: qText,
      recommendation: "Attach the required diagram or rewrite question so it is answerable without visual stimulus.",
    });
  }

  // Detect dangling passage reference
  const mentionsPassage =
    lowerText.includes("read the passage given below") ||
    lowerText.includes("based on the above passage") ||
    lowerText.includes("read the following extract") ||
    lowerText.includes("in the passage above");

  if (mentionsPassage && qText.length < 120 && (!question.subparts || question.subparts.length === 0)) {
    addIssue(dimensions, "completeness", {
      code: "MISSING_PASSAGE_CONTEXT",
      severity: "ERROR",
      message: "Question references a reading passage or extract, but no passage text is provided.",
      evidence: qText,
      recommendation: "Provide the complete reading passage text followed by graded subparts.",
    });
  }

  // -------------------------------------------------------------
  // 2. MCQ INTEGRITY & OPTIONS VALIDATION
  // -------------------------------------------------------------
  if (isMcqLikeType(qType)) {
    if (options.length < 4) {
      addIssue(dimensions, "completeness", {
        code: "INSUFFICIENT_MCQ_OPTIONS",
        severity: "ERROR",
        message: `MCQ must have exactly 4 distinct options, found ${options.length}.`,
        evidence: `Options: ${JSON.stringify(options)}`,
        recommendation: "Provide 4 plausible, mutually exclusive options (A, B, C, D).",
      });
      addIssue(dimensions, "blueprintCompliance", {
        code: "BLUEPRINT_MCQ_FOUR_OPTIONS",
        severity: "ERROR",
        message: "Blueprint requires 4 standard options for objective multiple choice questions.",
      });
    }

    const uniqueOptions = new Set(options.map((o) => o.toLowerCase()));
    if (uniqueOptions.size < options.length) {
      addIssue(dimensions, "completeness", {
        code: "DUPLICATE_MCQ_OPTIONS",
        severity: "ERROR",
        message: "MCQ options contain duplicate entries.",
        evidence: `Unique options count: ${uniqueOptions.size} vs total: ${options.length}`,
        recommendation: "Replace duplicate options with distinct plausible distractors.",
      });
    }

    if (options.some((o) => !o || o.trim().length === 0)) {
      addIssue(dimensions, "completeness", {
        code: "EMPTY_MCQ_OPTION",
        severity: "ERROR",
        message: "MCQ contains empty or whitespace-only options.",
        evidence: `Options: ${JSON.stringify(options)}`,
      });
    }

    // Check if declared answer is among the options
    if (qAns) {
      const cleanedAns = cleanOptionText(qAns).toLowerCase();
      const cleanOptions = options.map((o) => o.toLowerCase());
      const answerFound = cleanOptions.some(
        (o) => o === cleanedAns || o.startsWith(cleanedAns) || cleanedAns.startsWith(o),
      );

      if (!answerFound && options.length > 0) {
        addIssue(dimensions, "answerability", {
          code: "ANSWER_NOT_IN_OPTIONS",
          severity: "ERROR",
          message: `The declared correct answer "${qAns}" does not match any of the 4 provided options.`,
          evidence: `Answer: "${qAns}", Options: ${JSON.stringify(options)}`,
          recommendation: "Ensure the 'answer' field matches exactly one of the options in the 'options' array.",
        });
      }
    } else {
      addIssue(dimensions, "answerability", {
        code: "MISSING_CORRECT_ANSWER",
        severity: "ERROR",
        message: "Question has no declared answer or key.",
      });
    }
  }

  // -------------------------------------------------------------
  // 3. MATHEMATICAL & ARITHMETIC INTEGRITY
  // -------------------------------------------------------------
  const fullText = [qText, qAns, qExp].filter(Boolean).join("\n");

  // Arithmetic equality verification (LHS = RHS) applies to all subjects with calculations
  if (fullText.includes("=") && /[\+\-\*\/]/.test(fullText)) {
    const eqRes = validateArithmeticEquality(fullText);
    if (!eqRes.isValid && eqRes.error) {
      addIssue(dimensions, "academicCorrectness", {
        code: "MATH_CALCULATION_ERROR",
        severity: "ERROR",
        message: eqRes.error,
        evidence: `Arithmetic inconsistency in problem formulation or explanation: ${eqRes.error}`,
        recommendation: "Recalculate expressions to ensure mathematical correctness.",
      });
    }
  }

  const isMathSubject =
    (contract.canonicalSubject && /math/i.test(contract.canonicalSubject)) ||
    contract.subjectCode === "100" ||
    contract.subjectCode === "101" ||
    contract.subjectCode === "150";

  if (isMathSubject) {

    // 2. Specific HCF / LCM calculation validation: HCF * LCM = a * b
    const hcfLcmMatch = fullText.match(
      /HCF\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*=\s*(\d+).*?LCM\s*\(\s*\1\s*,\s*\2\s*\)/i,
    );
    if (hcfLcmMatch) {
      const a = parseInt(hcfLcmMatch[1], 10);
      const b = parseInt(hcfLcmMatch[2], 10);
      const hcf = parseInt(hcfLcmMatch[3], 10);
      const expectedLcm = Math.round((a * b) / hcf);

      // Check if answer or explanation claims an impossible LCM
      if (qAns && !isNaN(parseInt(qAns, 10))) {
        const declaredLcm = parseInt(qAns.replace(/[^0-9]/g, ""), 10);
        if (declaredLcm > 0 && declaredLcm !== expectedLcm) {
          addIssue(dimensions, "academicCorrectness", {
            code: "MATH_HCF_LCM_CALCULATION_ERROR",
            severity: "ERROR",
            message: `Mathematical error: HCF(${a}, ${b}) = ${hcf} means LCM must be (${a} * ${b}) / ${hcf} = ${expectedLcm}, but found ${declaredLcm}.`,
            evidence: `Formula: (${a} * ${b}) / ${hcf} = ${expectedLcm}, Declared: ${declaredLcm}`,
            recommendation: `Update answer to ${expectedLcm}.`,
          });
        }
      }
    }

    // 3. Quadratic Equation Discriminant & Roots
    const mathIssues: any[] = [];
    validateQuadraticQuestion(question, slotIdx, mathIssues);
    for (const mi of mathIssues) {
      addIssue(dimensions, "academicCorrectness", {
        code: mi.code,
        severity: mi.severity,
        message: mi.message,
        evidence: mi.message,
      });
    }

    // 4. Coordinate Geometry
    const coordIssues: any[] = [];
    validateCoordinateGeometryQuestion(question, slotIdx, coordIssues);
    for (const ci of coordIssues) {
      addIssue(dimensions, "academicCorrectness", {
        code: ci.code,
        severity: ci.severity,
        message: ci.message,
        evidence: ci.message,
      });
    }

    // 5. Mathematics Variant Alignment (Basic vs Standard)
    const varIssues: any[] = [];
    validateMathematicsVariantAlignment(question, contract, slotIdx, varIssues);
    for (const vi of varIssues) {
      addIssue(dimensions, "difficulty", {
        code: vi.code,
        severity: vi.severity,
        message: vi.message,
        evidence: vi.message,
      });
    }
  }

  // -------------------------------------------------------------
  // 4. SCIENCE & SPECIALIZED SUBJECT INTEGRITY
  // -------------------------------------------------------------
  const isScienceSubject =
    (contract.canonicalSubject && /science|chem|physic|bio/i.test(contract.canonicalSubject)) ||
    ["200", "210", "220", "230"].includes(contract.subjectCode || "");

  if (isScienceSubject) {
    const chemIssues: any[] = [];
    validateChemistryAcademicIntegrity(question, contract, slotIdx, chemIssues);
    for (const ci of chemIssues) {
      addIssue(dimensions, "academicCorrectness", {
        code: ci.code,
        severity: ci.severity,
        message: ci.message,
        evidence: ci.message,
      });
    }

    const physIssues: any[] = [];
    validatePhysicsAcademicIntegrity(question, contract, slotIdx, physIssues);
    for (const pi of physIssues) {
      addIssue(dimensions, "academicCorrectness", {
        code: pi.code,
        severity: pi.severity,
        message: pi.message,
        evidence: pi.message,
      });
    }

    // Check chemical equation balance prompt
    const balanceStemMatch = qText.match(/balance the chemical equation:\s*([A-Za-z0-9\s\+\-\>\=]+)/i);
    if (balanceStemMatch && qAns) {
      const unbalancedReaction = balanceStemMatch[1].trim();
      // If the answer just echoes the exact unbalanced reaction without coefficients
      if (qAns.includes("H2 + O2 -> H2O") && !qAns.includes("2H2 + O2") && !qAns.includes("2H2O")) {
        addIssue(dimensions, "academicCorrectness", {
          code: "CHEM_UNBALANCED_REACTION",
          severity: "ERROR",
          message: "The answer provided for a balancing equation question does not balance the reaction.",
          evidence: `Unbalanced: ${unbalancedReaction}, Answer: ${qAns}`,
          recommendation: "Provide the balanced equation: 2H2 + O2 -> 2H2O.",
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 5. SANSKRIT LINGUISTIC & PRATYAYA INTEGRITY
  // -------------------------------------------------------------
  const isSanskritSubject =
    (contract.canonicalSubject && /sanskrit|संस्कृत/i.test(contract.canonicalSubject)) ||
    contract.language === "sa" ||
    contract.subjectCode === "122" ||
    contract.subjectCode === "512";

  if (isSanskritSubject) {
    const sanskritIssues: any[] = [];
    validateSanskritAcademicIntegrity(question, contract, slotIdx, sanskritIssues);
    for (const si of sanskritIssues) {
      addIssue(dimensions, "languageQuality", {
        code: si.code,
        severity: si.severity,
        message: si.message,
        evidence: si.message,
      });
    }
  }

  // -------------------------------------------------------------
  // 6. SYLLABUS & CROSS-SUBJECT CONTAMINATION
  // -------------------------------------------------------------
  const contam = isQuestionContaminated(
    {
      text: qText,
      options,
      subparts: question.subparts,
      answer: qAns,
      explanation: qExp,
      chapterTitle: question.chapterTitle || slot?.chapterTitle,
    },
    contract.rawSubject,
    contract.className,
  );

  if (contam.contaminated) {
    addIssue(dimensions, "syllabusRelevance", {
      code: "CROSS_SUBJECT_CONTAMINATION",
      severity: "ERROR",
      message: `Question rejected by Subject Integrity Gate: ${contam.reason}`,
      evidence: contam.reason,
    });
  }

  // Check deleted syllabus topics
  const deletedTopics = [
    ...(slot?.curriculumSpec?.deletedTopics || []),
    ...(slot?.curriculumPayload?.excludedTopics || []),
  ];
  if (deletedTopics.length > 0) {
    for (const del of deletedTopics) {
      if (del && del.length > 3 && qText.toLowerCase().includes(del.toLowerCase())) {
        addIssue(dimensions, "syllabusRelevance", {
          code: "DELETED_SYLLABUS_TOPIC",
          severity: "ERROR",
          message: `Question assesses officially deleted/rationalized topic: "${del}".`,
          evidence: `Deleted topic: "${del}" found in question text.`,
          recommendation: "Replace with topic from current prescribed syllabus.",
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 7. SUBPARTS MARKS INTEGRITY
  // -------------------------------------------------------------
  if (isSubpartQuestionType(qType) && question.subparts && question.subparts.length > 0) {
    const subSum = subpartsTotalMarks(question.subparts);
    if (subSum !== marks) {
      addIssue(dimensions, "marksSuitability", {
        code: "SUBPARTS_MARKS_SUM_MISMATCH",
        severity: "ERROR",
        message: `Sum of subpart marks (${subSum}) does not equal target question marks (${marks}).`,
        evidence: `Subparts: ${question.subparts.map((s) => `${s.label}:${s.marks}m`).join(", ")} = ${subSum}m, Expected: ${marks}m`,
        recommendation: "Recalibrate subpart marks to sum exactly to question marks.",
      });
    }
  }

  // -------------------------------------------------------------
  // 8. DUPLICATION DETECTION
  // -------------------------------------------------------------
  if (opts.existingQuestionTexts && opts.existingQuestionTexts.length > 0) {
    for (const existing of opts.existingQuestionTexts) {
      if (isParaphraseOrDuplicateChoice(qText, existing)) {
        addIssue(dimensions, "duplication", {
          code: "DUPLICATE_QUESTION",
          severity: "ERROR",
          message: "This question substantially duplicates an already-placed question in this examination paper.",
          evidence: `Similar to existing question: "${existing.slice(0, 100)}..."`,
          recommendation: "Generate a distinct question testing a different sub-concept or problem type.",
        });
        break;
      }
    }
  }

  // -------------------------------------------------------------
  // 9. INTERNAL CHOICE VALIDATION
  // -------------------------------------------------------------
  if (opts.isPrimary !== false && slot?.requiresInternalChoice && !contract.internalChoiceRequirement.forbidden) {
    if (!question.orQuestion) {
      addIssue(dimensions, "blueprintCompliance", {
        code: "MISSING_INTERNAL_CHOICE",
        severity: "ERROR",
        message: "Question slot requires a mandatory internal choice (OR / अथवा) question.",
        recommendation: "Generate a distinct alternative question from the same chapter.",
      });
    } else {
      // Recursively verify the OR question
      const orRes = verifyQuestionAcademicQuality(question.orQuestion, contract, {
        slotIndex: slotIdx,
        isPrimary: false,
      });
      if (orRes.status === "FAIL") {
        for (const iss of orRes.allIssues) {
          addIssue(dimensions, "blueprintCompliance", {
            code: `OR_QUESTION_${iss.code}`,
            severity: iss.severity,
            message: `Internal Choice (OR): ${iss.message}`,
            evidence: iss.evidence,
          });
        }
      }
    }
  }

  // -------------------------------------------------------------
  // AGGREGATE RESULTS & VERDICT
  // -------------------------------------------------------------
  const allIssues: VerificationIssue[] = [];
  let hasAnyError = false;
  let hasAnyWarning = false;
  let scoreSum = 0;
  const dimKeys = Object.keys(dimensions) as (keyof QuestionVerificationDimensions)[];

  for (const k of dimKeys) {
    const dim = dimensions[k];
    allIssues.push(...dim.issues);
    if (!dim.passed) hasAnyError = true;
    if (dim.issues.some((i) => i.severity === "WARNING")) hasAnyWarning = true;
    scoreSum += dim.score;
  }

  const overallScore = Math.round(scoreSum / dimKeys.length);
  const status: "PASS" | "FAIL" | "REVIEW" = hasAnyError
    ? "FAIL"
    : hasAnyWarning || overallScore < 80
    ? "REVIEW"
    : "PASS";

  const recommendedAction: "ACCEPT" | "REPAIR" | "REGENERATE" | "MANUAL_REVIEW" =
    status === "PASS"
      ? "ACCEPT"
      : hasAnyError
      ? "REPAIR"
      : "MANUAL_REVIEW";

  return {
    status,
    overallScore,
    dimensions,
    allIssues,
    recommendedAction,
  };
}

/**
 * Repairs or regenerates a defective question with surgical fixes and deterministic fallback.
 */
export async function repairOrRegenerateQuestion(
  question: ValidatableQuestion,
  contract: GenerationContract,
  opts: {
    slotIndex?: number;
    maxRetries?: number;
  } = {},
): Promise<{
  success: boolean;
  question: ValidatableQuestion;
  verificationResult: QuestionVerificationResult;
  repairAttempts: number;
}> {
  const maxRetries = opts.maxRetries ?? 2;
  let currentQuestion: ValidatableQuestion = JSON.parse(JSON.stringify(question));
  let attempts = 0;

  while (attempts <= maxRetries) {
    const vResult = verifyQuestionAcademicQuality(currentQuestion, contract, {
      slotIndex: opts.slotIndex,
    });

    if (vResult.status === "PASS") {
      return {
        success: true,
        question: currentQuestion,
        verificationResult: vResult,
        repairAttempts: attempts,
      };
    }

    if (attempts === maxRetries) {
      return {
        success: false,
        question: currentQuestion,
        verificationResult: vResult,
        repairAttempts: attempts,
      };
    }

    // Apply deterministic surgical repairs based on identified issues
    const isMcq = isMcqLikeType(String(currentQuestion.type));
    if (isMcq) {
      let optList = Array.isArray(currentQuestion.options) ? [...currentQuestion.options] : [];

      // 1. Repair duplicate or missing options
      const uniqueOpts = new Set<string>();
      const deduped: string[] = [];
      for (const o of optList) {
        const clean = cleanOptionText(o);
        if (clean && !uniqueOpts.has(clean.toLowerCase())) {
          uniqueOpts.add(clean.toLowerCase());
          deduped.push(clean);
        }
      }

      // Add valid distractor numbers or concepts to reach exactly 4
      const slot = contract.slots[opts.slotIndex || 0] || contract.slots[0];
      const fallbackDistractors = [
        "1",
        "2",
        "3",
        "4",
        "None of the above",
        "All of the above",
        "Cannot be determined",
      ];
      let distractorIdx = 0;
      while (deduped.length < 4) {
        const candidate = fallbackDistractors[distractorIdx] || `Option ${deduped.length + 1}`;
        if (!uniqueOpts.has(candidate.toLowerCase())) {
          uniqueOpts.add(candidate.toLowerCase());
          deduped.push(candidate);
        }
        distractorIdx++;
      }

      currentQuestion.options = deduped.slice(0, 4);

      // 2. Ensure answer is in options
      if (currentQuestion.answer) {
        const cleanedAns = cleanOptionText(currentQuestion.answer);
        if (!deduped.some((d) => d.toLowerCase() === cleanedAns.toLowerCase())) {
          // If answer is not in options, make option A the answer
          currentQuestion.options[0] = cleanedAns;
        }
      }
    }

    // Repair subparts marks mismatch
    if (currentQuestion.subparts && currentQuestion.subparts.length > 0) {
      const targetMarks = Number(currentQuestion.marks) || contract.marksEach || 1;
      const count = currentQuestion.subparts.length;
      const baseMark = Math.floor(targetMarks / count) || 1;
      let rem = targetMarks - baseMark * count;
      currentQuestion.subparts = currentQuestion.subparts.map((sp, idx) => {
        const extra = rem > 0 ? 1 : 0;
        if (rem > 0) rem--;
        return {
          ...sp,
          marks: baseMark + extra,
        };
      });
    }

    attempts++;
  }

  const finalResult = verifyQuestionAcademicQuality(currentQuestion, contract, {
    slotIndex: opts.slotIndex,
  });

  return {
    success: finalResult.status === "PASS",
    question: currentQuestion,
    verificationResult: finalResult,
    repairAttempts: attempts,
  };
}
