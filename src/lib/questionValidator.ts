import {
  cleanOptionText,
  isMcqLikeType,
  isSubpartQuestionType,
  parseMatchColumnPairs,
  type QuestionType,
} from "./constants";
import { cleanChapterTitleForLookup, type GenerationContract } from "./curriculumContract";
import { isParaphraseOrDuplicateChoice } from "./internalChoiceRules";
import { validateMathematicsAcademicIntegrity } from "./mathQuestionValidator";
import { getCanonicalSubjectName } from "./schoolCurriculum";
import { subpartsTotalMarks, validateSubPartsSum, type SubPart } from "./types";

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
    | "INVALID_INTERNAL_CHOICE"
    | "SANSKRIT_PRATYAYA_MISMATCH"
    | "SANSKRIT_HINDI_CALQUE_ERROR"
    | "SANSKRIT_AGREEMENT_ERROR"
    | "SANSKRIT_MORPHOLOGY_ERROR"
    | "SANSKRIT_SPELLING_ERROR"
    | "SANSKRIT_SEMANTIC_ERROR"
    | "SANSKRIT_STYLE_WARNING"
    | "EMBEDDED_OR_CHOICE_WARNING"
    // Mathematics Quality Gate Codes
    | "MATH_CALCULATION_ERROR"
    | "MATH_EQUATION_DISCRIMINANT_MISMATCH"
    | "MATH_COORDINATE_GEOMETRY_ERROR"
    | "MATH_VARIANT_COMPLEXITY_MISMATCH"
    // Chemistry Quality Gate Codes
    | "CHEM_UNBALANCED_REACTION"
    | "CHEM_INVALID_IUPAC_NAME"
    | "CHEM_DELETED_SYLLABUS"
    // Physics Quality Gate Codes
    | "PHYSICS_UNIT_INCONSISTENCY"
    | "PHYSICS_IMPOSSIBLE_PARAMETER"
    | "PHYSICS_OPTICS_SIGN_ERROR";
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
  rawSubject: string = "",
  className = "Class 12",
): { contaminated: boolean; reason?: string } {
  const canonicalSubject = getCanonicalSubjectName(rawSubject || "") || (rawSubject || "").trim();
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
 * Context-aware academic validation for Sanskrit examination questions.
 * Applies deterministic morphological and syntactic checks (e.g. क्त vs क्तवतु,
 * dual agreement, anti-calque detection) as ERRORS, and flags ambiguous linguistic
 * expressions as WARNINGS for teacher review without hard rejection.
 */
export function validateSanskritAcademicIntegrity(
  question: ValidatableQuestion,
  contract: GenerationContract,
  slotIdx: number,
  issues: QuestionValidationIssue[],
  opts?: {
    slotIndex?: number;
    existingNormalizedTexts?: Set<string>;
    skipInternalChoiceCheck?: boolean;
  },
): void {
  const isSanskrit =
    contract.language === "sa" ||
    (contract.canonicalSubject && contract.canonicalSubject.toLowerCase().includes("sanskrit")) ||
    contract.subjectCode === "122" ||
    contract.subjectCode === "512";

  if (!isSanskrit) return;

  const text = (question.text || "").trim();
  const qType = (question.type || contract.questionType) as QuestionType;
  const options = Array.isArray(question.options) ? question.options.map((o) => String(o).trim()) : [];

  // 1. MATCH_COLUMN Morphological Consistency (Deterministic Paninian Rules)
  if (qType === "MATCH_COLUMN") {
    const pairs = parseMatchColumnPairs(options, text, question.explanation);
    for (const pair of pairs) {
      const left = pair.left.trim();
      const right = pair.right.trim();

      // Rule: Past active participle ending in -वान् / -वती / -वत् (e.g. पठितवान्, कृतवान्) has क्तवतु-प्रत्ययः (Panini 3.2.102), NEVER तप्रत्ययः / क्त-प्रत्ययः.
      const isPastActiveParticiple = /(?:वान्|वती|वत्)(?:$|[^\u0900-\u097F])/.test(left);
      const claimsTaPratyaya = /(?:^|[^\u0900-\u097F])(?:त-?प्रत्यय[ः]?|क्त-?प्रत्यय[ः]?)(?:$|[^\u0900-\u097F])/.test(right) && !/क्तवतु/.test(right);

      if (isPastActiveParticiple && claimsTaPratyaya) {
        issues.push({
          code: "SANSKRIT_PRATYAYA_MISMATCH",
          severity: "ERROR",
          message: `Slot ${slotIdx + 1}: Morphological error in matching pair '${left}' ↔ '${right}'. Participle ending in '-वान्' takes 'क्तवतु-प्रत्ययः' (Panini 3.2.102), not 'तप्रत्ययः' / 'क्त-प्रत्ययः'.`,
          slotIndex: slotIdx,
        });
      }

      // Rule: Past passive participle ending in -तः / -ता / -तम् (e.g. पठितः, कृतः) has क्त-प्रत्ययः, NEVER क्तवतु.
      const isPastPassiveParticiple = /(?:तः|ता|तम्)(?:$|[^\u0900-\u097F])/.test(left);
      const claimsKtavatu = /क्तवतु-?प्रत्यय/.test(right);
      if (isPastPassiveParticiple && claimsKtavatu) {
        issues.push({
          code: "SANSKRIT_PRATYAYA_MISMATCH",
          severity: "ERROR",
          message: `Slot ${slotIdx + 1}: Morphological error in matching pair '${left}' ↔ '${right}'. Words ending in '-तः/-तम्' have 'क्त-प्रत्ययः', not 'क्तवतु-प्रत्ययः'.`,
          slotIndex: slotIdx,
        });
      }

      // Rule: Present participle ending in -न् (e.g. गच्छन्, पठन्, कुर्वन्) has शतृ-प्रत्ययः
      const isPresParticiple = /(?:गच्छन्|पठन्|कुर्वन्|पश्यन्|हसन्)(?:$|[^\u0900-\u097F])/.test(left);
      if (isPresParticiple && /क्तवतु|शानच्/.test(right)) {
        issues.push({
          code: "SANSKRIT_PRATYAYA_MISMATCH",
          severity: "ERROR",
          message: `Slot ${slotIdx + 1}: Morphological error in matching pair '${left}' ↔ '${right}'. Present active participles ending in '-न्' take 'शतृ-प्रत्ययः'.`,
          slotIndex: slotIdx,
        });
      }

      // Rule: Uncompounded gerund ending in -त्वा (e.g. गत्वा, पठित्वा, कृत्वा) takes क्त्वा (Panini 3.4.21), NEVER ल्यप्
      const isKtvaParticiple = /(?:गत्वा|पठित्वा|कृत्वा|भूत्वा|दृष्ट्वा|श्रुत्वा|स्थित्वा|मत्वा|ज्ञात्वा)(?:$|[^\u0900-\u097F])/.test(left);
      if (isKtvaParticiple && /ल्यप्/.test(right)) {
        issues.push({
          code: "SANSKRIT_PRATYAYA_MISMATCH",
          severity: "ERROR",
          message: `Slot ${slotIdx + 1}: Morphological error in matching pair '${left}' ↔ '${right}'. Uncompounded gerund '${left}' takes 'क्त्वा-प्रत्ययः' (Panini 3.4.21), not 'ल्यप्-प्रत्ययः'.`,
          slotIndex: slotIdx,
        });
      }

      // Rule: Prefix-compounded gerund ending in -य / -त्य (e.g. विहाय, प्रणम्य, आदाय) takes ल्यप् (Panini 7.1.37), NEVER क्त्वा
      const isLyapParticiple = /(?:प्रणम्य|विहाय|आदाय|सम्पूज्य|उपकृत्य|विज्ञाय|अवतीर्य|विहस्य|प्रविश्य|उत्थाय|संगृह्य)(?:$|[^\u0900-\u097F])/.test(left);
      if (isLyapParticiple && /(?:क्त्वा|क्तवतु)/.test(right)) {
        issues.push({
          code: "SANSKRIT_PRATYAYA_MISMATCH",
          severity: "ERROR",
          message: `Slot ${slotIdx + 1}: Morphological error in matching pair '${left}' ↔ '${right}'. Prefix-compounded gerund '${left}' takes 'ल्यप्-प्रत्ययः' (Panini 7.1.37), not 'क्त्वा-प्रत्ययः'.`,
          slotIndex: slotIdx,
        });
      }

      // Rule: Infinitive ending in -तुम् takes तुमुन्
      const isTumunParticiple = /(?:पठितुम्|गन्तुम्|हन्तुम्|कर्तुम्|द्रष्टुम्|भोक्तुम्|लब्धुम्)(?:$|[^\u0900-\u097F])/.test(left);
      if (isTumunParticiple && /(?:क्तवतु|क्त्वा|शतृ|शानच्)/.test(right)) {
        issues.push({
          code: "SANSKRIT_PRATYAYA_MISMATCH",
          severity: "ERROR",
          message: `Slot ${slotIdx + 1}: Morphological error in matching pair '${left}' ↔ '${right}'. Infinitive ending in '-तुम्' takes 'तुमुन्-प्रत्ययः'.`,
          slotIndex: slotIdx,
        });
      }
    }
  }

  // 2. Pseudo-Sanskrit Hindi Passive Calques & Hindi Interference (Deterministic Grammar Error)
  // Sanskrit does NOT use finite forms of √गम् ('गच्छति' / 'ग्छति') as a passive auxiliary.
  const calqueMatch = text.match(/(?:प्रदत्त|दत्त|कृत|उक्त|ज्ञात|लिखित|दर्शित)[ःो]?\s*(?:ग्छति|गच्छति)|प्रदत्तोग्छति|कृतोग्छति/);
  if (calqueMatch) {
    issues.push({
      code: "SANSKRIT_HINDI_CALQUE_ERROR",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Pseudo-Sanskrit Hindi passive calque detected ('${calqueMatch[0]}'). Sanskrit expresses passive voice using authentic passive forms ('प्रदीयते', 'दीयते', 'क्रियते') or participle with copula ('प्रदत्तः अस्ति'), never with 'गच्छति'.`,
      slotIndex: slotIdx,
    });
  }

  const hindiInterferenceMatch = text.match(
    /(?:^|[^\u0900-\u097F]|[।॥\s])(राम\s+ने|बालक\s+को|वृक्ष\s+से|है|था|थी|थे|होता\s+है|सकता\s+है|चाहिए)(?:$|[^\u0900-\u097F]|[।॥\s])/,
  );
  if (hindiInterferenceMatch) {
    issues.push({
      code: "SANSKRIT_HINDI_CALQUE_ERROR",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Hindi syntax/postposition leakage detected in Sanskrit text ('${hindiInterferenceMatch[1]}'). Questions must use pure Paninian inflections.`,
      slotIndex: slotIdx,
    });
  }

  // 3. MCQ Interrogative Pronoun & Entity Agreement (Deterministic Grammar Error)
  if (isMcqLikeType(qType)) {
    const cleanOpts = options.map((o) => cleanOptionText(o).trim());
    // Interrogative masculine singular pronoun "कः" or masculine accusative singular "कम्"
    const hasSingularInterrogative = /(?:^|[^\u0900-\u097F])(?:कः|कम्)(?:$|[^\u0900-\u097F])/.test(text);
    // All options are dual masculine nouns ending in -ौ (e.g. लवकुशौ, भरतशत्रुघ्नौ, सुग्रीवविभीषणौ, युधिष्ठिरभीमसेनौ)
    const allOptionsDual =
      cleanOpts.length >= 2 &&
      cleanOpts.every((o) => /ौ$/.test(o) && !/सर्वौ|उभौ/.test(o));

    if (hasSingularInterrogative && allOptionsDual) {
      issues.push({
        code: "SANSKRIT_AGREEMENT_ERROR",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: Grammatical agreement mismatch: question uses singular interrogative pronoun 'कः/कम्', but all answer choices are dual entities ('-ौ', e.g. '${cleanOpts[0]}'). The question stem must use dual interrogative 'कौ'.`,
        slotIndex: slotIdx,
      });
    }

    // Feminine singular options ending in -ा / -ई / -तिः (e.g. सीता, राधा, नदी, प्रकृतिः)
    const allFemSing =
      cleanOpts.length >= 2 &&
      cleanOpts.every((o) => /(?:[ाी]|तिः)$/.test(o) && !/सर्वौ|उभौ/.test(o));
    if (hasSingularInterrogative && allFemSing) {
      issues.push({
        code: "SANSKRIT_AGREEMENT_ERROR",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: Grammatical agreement mismatch: question uses masculine interrogative 'कः', but all answer choices are feminine entities (e.g. '${cleanOpts[0]}'). The question stem must use feminine interrogative 'का'.`,
        slotIndex: slotIdx,
      });
    }

    // Neuter singular options ending in -म् (e.g. जलम्, वनम्, पुस्तकम्)
    const allNeutSing = cleanOpts.length >= 2 && cleanOpts.every((o) => /म्$/.test(o));
    if (hasSingularInterrogative && allNeutSing) {
      issues.push({
        code: "SANSKRIT_AGREEMENT_ERROR",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: Grammatical agreement mismatch: question uses masculine interrogative 'कः', but all answer choices are neuter entities (e.g. '${cleanOpts[0]}'). The question stem must use neuter interrogative 'किम्'.`,
        slotIndex: slotIdx,
      });
    }

    // Invalid dual noun inflection before verbs e.g. "द्वौ बालको" (must be "द्वौ बालकौ" / "बालकाव्")
    const badDualMatch = text.match(/(?:^|[^\u0900-\u097F])द्वौ\s+([^\s]+ो)(?:$|[^\u0900-\u097F])/);
    if (badDualMatch) {
      issues.push({
        code: "SANSKRIT_MORPHOLOGY_ERROR",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: Invalid dual noun inflection '${badDualMatch[0].trim()}'. Dual masculine of akārānta nouns must end in '-ौ' ('द्वौ बालकौ'), not '-ो'.`,
        slotIndex: slotIdx,
      });
    }
  }

  // 4. Deterministic Typographical & Semantic Corruptions in Exam Stems
  if (/(?:^|[^\u0900-\u097F])एकचने(?:$|[^\u0900-\u097F])/.test(text)) {
    issues.push({
      code: "SANSKRIT_SPELLING_ERROR",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Typographical corruption 'एकचने'. Standard grammatical case form is 'एकवचने'.`,
      slotIndex: slotIdx,
    });
  }

  // Corrupted imperative 'वर्जयत' used in examination prompt where 'वर्णयत' is intended
  if (/(?:सविस्तरं|विस्तरेण|स्पष्टं|भावं|स्वरूपं)\s*वर्जयत[।.]?/.test(text)) {
    issues.push({
      code: "SANSKRIT_SEMANTIC_ERROR",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Academic semantic error: 'वर्जयत' means 'avoid/renounce'. Use 'वर्णयत' ('describe') for examination prompts.`,
      slotIndex: slotIdx,
    });
  }

  // 5. Context-Aware Linguistic Warnings (Ambiguous Phrasings - Non-Fatal WARNING for Teacher Review)
  if (!opts?.skipInternalChoiceCheck && /(?:^|[^\u0900-\u097F])अथवा(?:$|[^\u0900-\u097F])/.test(text)) {
    const isNaturalConjunction = /गद्यांशस्य\s+वा\s+पद्यांशस्य|वा\s+अथवा|चित्वा\s+.*अथवा\s+.*कुरुत/.test(text);
    if (!isNaturalConjunction && text.length > 30) {
      issues.push({
        code: "EMBEDDED_OR_CHOICE_WARNING",
        severity: "WARNING",
        message: `Slot ${slotIdx + 1}: Question stem contains 'अथवा'. Ensure that alternative questions are structured in the dedicated 'orQuestion' object rather than embedded in the stem.`,
        slotIndex: slotIdx,
      });
    }
  }

  if (/(?:^|[^\u0900-\u097F])लिखति\s+समये(?:$|[^\u0900-\u097F])/.test(text)) {
    issues.push({
      code: "SANSKRIT_STYLE_WARNING",
      severity: "WARNING",
      message: `Slot ${slotIdx + 1}: Phrasing 'लिखति समये' is non-standard. Recommended standard form is 'लेखनसमये' or 'लिखद्भिः छात्रैः'.`,
      slotIndex: slotIdx,
    });
  }

  if (/(?:^|[^\u0900-\u097F])पत्यमानं(?:$|[^\u0900-\u097F])/.test(text)) {
    issues.push({
      code: "SANSKRIT_STYLE_WARNING",
      severity: "WARNING",
      message: `Slot ${slotIdx + 1}: 'पत्यमानं' is non-standard. Standard participle from √पत् is 'पतन्तम्' or 'पतितम्' or 'निपत्यमानम्'.`,
      slotIndex: slotIdx,
    });
  }

  if (/(?:^|[^\u0900-\u097F])कुशलयवौ(?:$|[^\u0900-\u097F])/.test(text)) {
    issues.push({
      code: "SANSKRIT_STYLE_WARNING",
      severity: "WARNING",
      message: `Slot ${slotIdx + 1}: Name 'कुशलयवौ' appears to have transposed letters for 'लवकुशौ' or 'कुशलवौ'. Review character name.`,
      slotIndex: slotIdx,
    });
  }

  // 6. Q16 Fill-in-the-blank word-bank restriction
  // In the MPBSE 2026–27 model paper, Q16 textbook fill-in-the-blank exercises do NOT have a word bank (मञ्जूषा). Word bank belongs only to Q5.
  if (
    qType === "FILL_BLANK" &&
    (contract.marksEach === 2 || (question as any).marks === 2) &&
    /(?:मञ्जूषा|मंजूषा|प्रदत्तैः\s*शब्दैः|कोष्ठके\s*दत्त)/.test(text)
  ) {
    issues.push({
      code: "SANSKRIT_STYLE_WARNING",
      severity: "WARNING",
      message: `Slot ${slotIdx + 1}: Q16 textbook fill-in-the-blank exercises must be answered directly without a word-bank (मञ्जूषा). Word banks are restricted to Q5.`,
      slotIndex: slotIdx,
    });
  }
}

/* ------------------------------------------------------------------ */
/* Chemistry Academic Integrity Validators                            */
/* ------------------------------------------------------------------ */

interface ChemistryDeletedRule {
  classLevel?: number;
  pattern: RegExp;
  reason: string;
}

const CHEMISTRY_DELETED_RULES: ChemistryDeletedRule[] = [
  // Class 12 Chemistry Rationalized Topics
  {
    classLevel: 12,
    pattern: /(?:\b(?:unit\s*cell|crystal\s*lattice|schottky\s*defect|frenkel\s*defect|bragg'?s\s*law|packing\s*efficiency|body[- ]centered\s*cubic|face[- ]centered\s*cubic|bcc|fcc|hcp|ccp|piezoelectric|ferroelectric)\b|(?:^|[^\u0900-\u097F]|[\u0964\u0965])(?:ठोस\s*अवस्था|क्रिस्टल\s*जालक|इकाई\s*सेल|शॉट्की\s*त्रुटि|फ्रेंकेल\s*त्रुटि|संकुलन\s*क्षमता)(?=[^\u0900-\u097F]|[\u0964\u0965]|$))/i,
    reason: "Solid State (ठोस अवस्था) is completely deleted from MPBSE Class 12 Chemistry.",
  },
  {
    classLevel: 12,
    pattern: /(?:\b(?:freundlich\s*isotherm|langmuir\s*isotherm|adsorption\s*isotherm|tyndall\s*effect|brownian\s*movement|electrophoresis|hardy[- ]schulze\s*rule|coagulation\s*of\s*colloids|lyophilic|lyophobic|peptization|surface\s*chemistry)\b|(?:^|[^\u0900-\u097F]|[\u0964\u0965])(?:पृष्ठ\s*रसायन|अधिशोषण\s*समतापी|टिंडल\s*प्रभाव|ब्राउनी\s*गति|वैद्युत\s*कण\s*संचलन|(?:हार्ड्डी|हार्डी)[- ]*शुल्जे\s*नियम|कोलॉइड|पेप्टीकरण|द्रव[- ]?स्नेही|द्रव[- ]?विरोधी)(?=[^\u0900-\u097F]|[\u0964\u0965]|$))/i,
    reason: "Surface Chemistry (पृष्ठ रसायन) is completely deleted from MPBSE Class 12 Chemistry.",
  },
  {
    classLevel: 12,
    pattern: /(?:\b(?:metallurgy|froth\s*floatation|calcination\s*and\s*roasting|blast\s*furnace|hall[- ]h[eé]roult|zone\s*refining|mond\s*process|van\s*arkel|ellingham\s*diagram)\b|(?:^|[^\u0900-\u097F]|[\u0964\u0965])(?:तत्वों\s*के\s*निष्कर्षण|धातुकर्म|झाग\s*प्लवन|भर्जन\s*(?:एवं|तथा|और)?\s*निस्तापन|वात्या\s*भट्टी|जोन\s*शोधन|हॉल[- ]हेरॉल्ट|मॉन्ड\s*प्रक्रम|वान\s*अर्केल|एलिंगम\s*(?:चित्र|आरेख))(?=[^\u0900-\u097F]|[\u0964\u0965]|$))/i,
    reason: "General Principles and Processes of Isolation of Elements (धातुकर्म) is completely deleted from MPBSE Class 12 Chemistry.",
  },
  {
    classLevel: 12,
    pattern: /(?:\b(?:ostwald\s*process|contact\s*process\s*for\s*sulfuric\s*acid|white\s*phosphorus|red\s*phosphorus|phosphine|xenon\s*fluorides?|XeF[246]|XeO3|p[- ]block(?:\s*elements?)?)\b|(?:^|[^\u0900-\u097F]|[\u0964\u0965])(?:[pP][- ]?ब्लॉक\s*(?:के\s*)?तत्व|पी[- ]?ब्लॉक\s*(?:के\s*)?तत्व|ओस्टवाल्ड\s*विधि|संपर्क\s*विधि|फॉस्फीन|जीनॉन\s*फ्लोराइड|श्वेत\s*फ़?फा?स्फोरस|लाल\s*फ़?फा?स्फोरस)(?=[^\u0900-\u097F]|[\u0964\u0965]|$))/i,
    reason: "p-Block Elements (p-ब्लॉक के तत्व) is completely deleted from MPBSE Class 12 Chemistry.",
  },
  {
    classLevel: 12,
    pattern: /(?:\b(?:addition\s*polymer|condensation\s*polymer|nylon[- ]?6,?6?|bakelite|terylene|dacron|buna[- ][sn]|neoprene|teflon|vulcanization|phbv)\b|(?:^|[^\u0900-\u097F]|[\u0964\u0965])(?:बहुलक(?:ीकरण)?|नायलॉन|नाइलॉन|बेकेलाइट|टेरीलीन|ब्यूना[- ]?[एसएनsn]?|वल्कनीकरण|टेफ्लॉन|नियोप्रीन)(?=[^\u0900-\u097F]|[\u0964\u0965]|$))/i,
    reason: "Polymers (बहुलक) is completely deleted from MPBSE Class 12 Chemistry.",
  },
  {
    classLevel: 12,
    pattern: /(?:\b(?:antipyretics?|analgesics?|tranquilizers?|antiseptics?|disinfectants?|tincture\s*of\s*iodine|bithionol|aspartame|saccharin|sucralose|anionic\s*detergents?|cationic\s*detergents?|chemistry\s*in\s*everyday\s*life)\b|(?:^|[^\u0900-\u097F]|[\u0964\u0965])(?:दैनिक\s*जीवन\s*में\s*रसायन|ज्वरनाशी|प्रशांतक|पूतिरोधी|रोगाणुनाशी|एस्पार्टेम|सैकेरीन|सुकरालोस|पीड़ाहारी)(?=[^\u0900-\u097F]|[\u0964\u0965]|$))/i,
    reason: "Chemistry in Everyday Life (दैनिक जीवन में रसायन) is completely deleted from MPBSE Class 12 Chemistry.",
  },
  // Class 11 Chemistry Rationalized Topics
  {
    classLevel: 11,
    pattern: /(?:\b(?:boyle'?s\s*law|charles'?\s*law|gay[- ]lussac'?s\s*law|dalton'?s\s*law\s*of\s*partial\s*pressure|graham'?s\s*law\s*of\s*diffusion|van\s*der\s*waals\s*equation|critical\s*temperature\s*of\s*gas|states\s*of\s*matter)\b|(?:^|[^\u0900-\u097F]|[\u0964\u0965])(?:द्रव्य\s*की\s*अवस्था(?:एं|एँ)?|बॉयल\s*का\s*नियम|चार्ल्स\s*का\s*नियम|गे[- ]लुसाक\s*का\s*नियम|डाल्टन\s*का\s*आंशिक\s*दाब|ग्राहम\s*का\s*विसरण|वां[न]?डर\s*वाल्स\s*समीकरण)(?=[^\u0900-\u097F]|[\u0964\u0965]|$))/i,
    reason: "States of Matter (द्रव्य की अवस्थाएं) is deleted from MPBSE Class 11 Chemistry.",
  },
  {
    classLevel: 11,
    pattern: /(?:\b(?:isotopes\s*of\s*hydrogen|heavy\s*water|hydrogen\s*peroxide|D2O|H2O2)\b|(?:^|[^\u0900-\u097F]|[\u0964\u0965])(?:हाइड्रोजन\s*के\s*समस्थानिक|भारी\s*जल|हाइड्रोजन\s*पर[ॉा]क्साइड|डाइहाइड्रोजन|प्रोटियम|ड्यूटीरियम|ट्राइटियम)(?=[^\u0900-\u097F]|[\u0964\u0965]|$))/i,
    reason: "Hydrogen (हाइड्रोजन) is completely deleted from MPBSE Class 11 Chemistry.",
  },
  {
    classLevel: 11,
    pattern: /(?:\b(?:anomalous\s*behavior\s*of\s*lithium|anomalous\s*behavior\s*of\s*beryllium|plaster\s*of\s*paris|slaked\s*lime\s*preparation|s[- ]block(?:\s*elements?)?)\b|(?:^|[^\u0900-\u097F]|[\u0964\u0965])(?:[sS][- ]?ब्लॉक\s*(?:के\s*)?तत्व|एस[- ]?ब्लॉक\s*(?:के\s*)?तत्व|प्लास्टर\s*ऑफ\s*पेरिस|बुझा\s*हुआ\s*चूना|लीथियम\s*का\s*असंगत\s*व्यवहार|बेरिलियम\s*का\s*असंगत\s*व्यवहार)(?=[^\u0900-\u097F]|[\u0964\u0965]|$))/i,
    reason: "s-Block Elements (s-ब्लॉक तत्व) is completely deleted from MPBSE Class 11 Chemistry.",
  },
  {
    classLevel: 11,
    pattern: /(?:\b(?:photochemical\s*smog|acid\s*rain|ozone\s*layer\s*depletion|biochemical\s*oxygen\s*demand|bod\s*and\s*cod|green\s*chemistry|environmental\s*chemistry)\b|(?:^|[^\u0900-\u097F]|[\u0964\u0965])(?:पर्यावरणीय\s*रसायन|अम्ल(?:ीय)?\s*वर्षा|ओजोन\s*परत\s*(?:का\s*)?(?:अवक्षय|क्षरण)|हरित\s*रसायन|प्रकाश\s*रासायनिक\s*(?:धूम\s*)?कोहरा)(?=[^\u0900-\u097F]|[\u0964\u0965]|$))/i,
    reason: "Environmental Chemistry (पर्यावरणीय रसायन) is deleted from MPBSE Class 11 Chemistry.",
  },
  // Class 10 Science (Chemistry Part)
  {
    classLevel: 10,
    pattern: /(?:\b(?:d[oö]bereiner|newlands'?\s*(?:law\s*of\s*)?octaves|mendeleev|anomalies\s*of\s*mendeleev|periodic\s*classification\s*of\s*elements)\b|(?:^|[^\u0900-\u097F]|[\u0964\u0965])(?:तत्वों\s*का\s*आवर्त\s*वर्गीकरण|ड[ॉो]बेराइनर|न्यूलैंड(?:्स)?|मेंडे?लीव)(?=[^\u0900-\u097F]|[\u0964\u0965]|$))/i,
    reason: "Periodic Classification of Elements (तत्वों का आवर्त वर्गीकरण) is deleted from MPBSE Class 10 Science.",
  },
];

export function parseChemicalFormula(term: string): Record<string, number> | null {
  let s = term.trim();
  if (!s) return null;

  let hydrateMultiplier = 0;
  const hydrateMatch = s.match(/(?:\\cdot|\.|\*)\s*(\d*)\s*H2O/i);
  if (hydrateMatch) {
    hydrateMultiplier = hydrateMatch[1] ? parseInt(hydrateMatch[1], 10) : 1;
    s = s.slice(0, hydrateMatch.index).trim();
  }

  const coeffMatch = s.match(/^(\d+)/);
  let coeff = 1;
  if (coeffMatch) {
    coeff = parseInt(coeffMatch[1], 10);
    s = s.slice(coeffMatch[0].length).trim();
  }

  if (!s && hydrateMultiplier > 0) {
    return { H: 2 * hydrateMultiplier * coeff, O: hydrateMultiplier * coeff };
  }
  if (!s) return null;

  const stack: Record<string, number>[] = [{}];
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    if (ch === "(" || ch === "[") {
      stack.push({});
      i++;
    } else if (ch === ")" || ch === "]") {
      if (stack.length <= 1) return null;
      i++;
      let multStr = "";
      while (i < s.length && /[0-9]/.test(s[i])) {
        multStr += s[i];
        i++;
      }
      const mult = multStr ? parseInt(multStr, 10) : 1;
      const popped = stack.pop()!;
      const top = stack[stack.length - 1];
      for (const elem of Object.keys(popped)) {
        top[elem] = (top[elem] || 0) + popped[elem] * mult;
      }
    } else if (/[A-Z]/.test(ch)) {
      let elem = ch;
      i++;
      if (i < s.length && /[a-z]/.test(s[i])) {
        elem += s[i];
        i++;
      }
      let countStr = "";
      while (i < s.length && /[0-9]/.test(s[i])) {
        countStr += s[i];
        i++;
      }
      const count = countStr ? parseInt(countStr, 10) : 1;
      const top = stack[stack.length - 1];
      top[elem] = (top[elem] || 0) + count;
    } else if (ch === "+" || ch === "-" || ch === "^" || ch === "e" || ch === " ") {
      i++;
    } else {
      i++;
    }
  }

  if (stack.length !== 1) return null;

  const res: Record<string, number> = {};
  for (const elem of Object.keys(stack[0])) {
    res[elem] = stack[0][elem] * coeff;
  }

  if (hydrateMultiplier > 0) {
    res["H"] = (res["H"] || 0) + 2 * hydrateMultiplier * coeff;
    res["O"] = (res["O"] || 0) + hydrateMultiplier * coeff;
  }

  return res;
}

export function validateReactionEquation(
  rawEq: string,
): { isBalanced: boolean; element?: string; reactantCount?: number; productCount?: number; equation?: string } | null {
  const arrowRegex = /(?:->|-->|=>|==>|\\xrightarrow(?:\{[^{}]*\})?|\\rightarrow|\\longrightarrow|\\to|\\rightleftharpoons|⇌|<=>)/;
  if (!arrowRegex.test(rawEq)) return null;

  const parts = rawEq.split(arrowRegex);
  if (parts.length !== 2) return null;

  let leftSide = parts[0];
  let rightSide = parts[1];

  // Trim trailing sentence-ending punctuation or prose from the product side (including comma)
  const rightStop = rightSide.search(/(?:[.,?!;]|--)(?:\s+|$)/);
  if (rightStop !== -1) {
    rightSide = rightSide.slice(0, rightStop);
  }

  // Trim leading prose before a colon or sentence delimiter from the reactant side
  const leftColon = leftSide.lastIndexOf(":");
  if (leftColon !== -1) {
    leftSide = leftSide.slice(leftColon + 1);
  } else {
    // Strip common English introductory words and phrases preceding the reaction
    leftSide = leftSide.replace(
      /^(?:.*?\b(?:consider|given|suppose|assume|let|when|if|where|here|observe|determine|calculate|find|balance|complete)\b(?:\s+(?:the|an|a|following|oxidation|reduction|combustion|synthesis|decomposition|neutralization|chemical|balanced|reversible|overall))*\s+(?:reaction|equation|process|conversion)?\s*[:,-]?\s*)+/i,
      "",
    );
    // Strip leading introductory prepositions and subordinate clauses (e.g. "for the synthesis", "in the reaction")
    leftSide = leftSide.replace(
      /^(?:(?:for|in|the)\s+(?:the|this|a|an|following)?\s*(?:[A-Za-z]+\s+)?(?:reaction|synthesis|process|equation|oxidation|reduction|decomposition)\s*[:,-]?\s*)+/i,
      "",
    );
    // Strip question numbering/labels like (a), (i), 1., Q1.
    leftSide = leftSide.replace(/^(?:\(?[0-9a-zA-Z]{1,3}\)?[.:]|\bQ\d+[.:]?)\s*/i, "");
    // Strip Hindi introductory phrases
    leftSide = leftSide.replace(/^(?:(?:अभिक्रिया|समीकरण|यदि|दिए\s*गए|निम्नलिखित)\s*[:,-]?\s*)+/i, "");
  }

  const cleanSide = (sideStr: string) =>
    sideStr
      .replace(/\\(?:text|mathrm|mathbf)\{([^}]+)\}/g, "$1")
      .replace(/\((?:s|l|g|aq|solid|liquid|gas|aqueous)\)/gi, "")
      .replace(/\\(?:downarrow|uparrow)/g, "")
      .replace(/\\xrightarrow(?:\{[^{}]*\})?/g, "")
      .replace(/_\{(\d+)\}/g, "$1")
      .replace(/_(\d)/g, "$1")
      .replace(/[\$]/g, "")
      .trim();

  const isEnergyOrNonChemicalTerm = (term: string) =>
    /^(?:heat|energy|light|sound|hv|q|\\delta|\\Delta|ऊष्मा|ऊर्जा|प्रकाश)$/i.test(term.replace(/[.;,]+$/, "").trim());

  const leftTerms = cleanSide(leftSide)
    .split("+")
    .map((t) => t.replace(/[.;,]+$/, "").trim())
    .filter((t) => t.length > 0 && !isEnergyOrNonChemicalTerm(t));

  // Additional defense: if leftTerms[0] still contains multiple space-separated tokens
  // where leading tokens are words and the trailing token is a chemical formula,
  // isolate the chemical formula (preserving stoichiometric coefficient if present).
  if (leftTerms.length > 0) {
    const tokens = leftTerms[0].trim().split(/\s+/);
    if (tokens.length > 1) {
      let formulaStart = tokens.length - 1;
      if (formulaStart > 0 && /^\d+(?:\.\d+|\/\d+)?$/.test(tokens[formulaStart - 1])) {
        formulaStart--;
      }
      if (formulaStart > 0) {
        leftTerms[0] = tokens.slice(formulaStart).join(" ");
      }
    }
  }

  const rightTerms = cleanSide(rightSide)
    .split("+")
    .map((t) => t.replace(/[.;,]+$/, "").trim())
    .filter((t) => t.length > 0 && !isEnergyOrNonChemicalTerm(t));

  if (leftTerms.length === 0 || rightTerms.length === 0) return null;

  const reactantTotals: Record<string, number> = {};
  for (const term of leftTerms) {
    const counts = parseChemicalFormula(term);
    if (!counts || Object.keys(counts).length === 0) return null;
    for (const [el, count] of Object.entries(counts)) {
      reactantTotals[el] = (reactantTotals[el] || 0) + count;
    }
  }

  const productTotals: Record<string, number> = {};
  for (const term of rightTerms) {
    const counts = parseChemicalFormula(term);
    if (!counts || Object.keys(counts).length === 0) return null;
    for (const [el, count] of Object.entries(counts)) {
      productTotals[el] = (productTotals[el] || 0) + count;
    }
  }

  const allElements = Array.from(new Set([...Object.keys(reactantTotals), ...Object.keys(productTotals)]));
  for (const el of allElements) {
    const r = reactantTotals[el] || 0;
    const p = productTotals[el] || 0;
    if (r !== p) {
      return {
        isBalanced: false,
        element: el,
        reactantCount: r,
        productCount: p,
        equation: rawEq.trim(),
      };
    }
  }

  return { isBalanced: true, equation: rawEq.trim() };
}

export function validateChemistryAcademicIntegrity(
  question: ValidatableQuestion,
  contract: GenerationContract,
  slotIdx: number,
  issues: QuestionValidationIssue[],
): void {
  const isChemistry =
    (contract.canonicalSubject && /chem/i.test(contract.canonicalSubject)) ||
    (contract.canonicalSubject && /science/i.test(contract.canonicalSubject)) ||
    contract.subjectCode === "220" ||
    contract.subjectCode === "200";

  if (!isChemistry) return;

  const rawText = [
    question.text,
    ...(question.options || []),
    question.answer,
    question.explanation,
  ].filter(Boolean).join("\n");

  const fullText = rawText
    .replace(/\\(?:text|mathrm|mathbf)\{([^}]+)\}/gi, "$1")
    .replace(/[\$]/g, "");

  const classLevel = parseInt(contract.className.replace(/\D/g, "") || "12", 10);

  // 1. Chemical Reaction Balancing (CHEM_UNBALANCED_REACTION)
  const lines = fullText.split(/[\n;]/);
  for (const line of lines) {
    const rxnMatch = line.match(
      /([A-Za-z0-9()\[\]_+^\\\s\.-]+?(?:->|-->|=>|==>|\\xrightarrow(?:\{[^{}]*\})?|\\rightarrow|\\longrightarrow|\\to|\\rightleftharpoons|⇌|<=>)[A-Za-z0-9()\[\]_+^\\\s\.-]+?)(?=[.,?!;](?:\s+|$)|$)/,
    );
    if (rxnMatch) {
      let eqCandidate = rxnMatch[1].trim();
      eqCandidate = eqCandidate.replace(/[.,?!;]\s*$/, "").trim();
      const balRes = validateReactionEquation(eqCandidate);
      if (balRes && !balRes.isBalanced) {
        issues.push({
          code: "CHEM_UNBALANCED_REACTION",
          severity: "ERROR",
          message: `Slot ${slotIdx + 1}: Unbalanced chemical reaction '${balRes.equation}'. Element '${balRes.element}' has ${balRes.reactantCount} atom(s) on reactant side but ${balRes.productCount} atom(s) on product side.`,
          slotIndex: slotIdx,
        });
        break;
      }
    }
  }

  // 2. IUPAC Organic Nomenclature Validator (CHEM_INVALID_IUPAC_NAME)
  const impossibleKetone = fullText.match(/\b(methanone|ethanone|propan-1-one|1-propanone|butan-1-one)\b/i);
  if (impossibleKetone) {
    issues.push({
      code: "CHEM_INVALID_IUPAC_NAME",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Impossible IUPAC ketone name '${impossibleKetone[0]}'. Ketones require a carbonyl carbon bonded to two adjacent carbons (minimum 3 carbons, locant >= 2).`,
      slotIndex: slotIdx,
    });
  }

  const invalidLocant = fullText.match(/\b(propan-3-ol|butan-3-ol|butan-4-ol|pent-4-ene|pent-3-ene|2-ethylpropane|3-methylbutane|1-methylpropane|1-methylbutane|2-ol-propane|chloro-2-propane)\b/i);
  if (invalidLocant) {
    issues.push({
      code: "CHEM_INVALID_IUPAC_NAME",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Invalid IUPAC nomenclature '${invalidLocant[0]}'. Violates lowest locant / longest carbon chain numbering rules.`,
      slotIndex: slotIdx,
    });
  }

  // 3. Deleted Syllabus Topics Filter (CHEM_DELETED_SYLLABUS)
  for (const rule of CHEMISTRY_DELETED_RULES) {
    if (rule.classLevel && rule.classLevel !== classLevel) continue;
    if (rule.pattern.test(fullText)) {
      issues.push({
        code: "CHEM_DELETED_SYLLABUS",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: ${rule.reason}`,
        slotIndex: slotIdx,
      });
      break;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Physics Academic Integrity Validators                              */
/* ------------------------------------------------------------------ */

export function validatePhysicsAcademicIntegrity(
  question: ValidatableQuestion,
  contract: GenerationContract,
  slotIdx: number,
  issues: QuestionValidationIssue[],
): void {
  const isPhysics =
    (contract.canonicalSubject && /phys/i.test(contract.canonicalSubject)) ||
    (contract.canonicalSubject && /science/i.test(contract.canonicalSubject)) ||
    contract.subjectCode === "210" ||
    contract.subjectCode === "200";

  if (!isPhysics) return;

  const rawText = [
    question.text,
    ...(question.options || []),
    question.answer,
    question.explanation,
  ].filter(Boolean).join("\n");

  const fullText = rawText
    .replace(/\\(?:text|mathrm|mathbf)\{([^}]+)\}/gi, "$1")
    .replace(/[\$]/g, "")
    .replace(/\s+/g, " ");

  // 1. SI Unit Inconsistencies (PHYSICS_UNIT_INCONSISTENCY)
  const unitRules = [
    {
      quantity: "Force",
      pattern: /(?:\bforce|(?:^|[^\u0900-\u097F])बल)\s*(?:of\s*|=\s*)?[-+]?\d*\.?\d+(?:\s*|\s*\$)\s*(?:j|joule|joules|w|watt|watts|v|volt|volts|a|ampere|amperes|f|farad|farads|h|henry)\b/i,
      expected: "Newtons (N) or dyne",
    },
    {
      quantity: "Energy / Work",
      pattern: /(?:\b(?:work(?:\s+done)?|energy|heat)|(?:^|[^\u0900-\u097F])(?:कार्य|ऊर्जा|ऊष्मा))\s*(?:of\s*|=\s*|is\s*)?[-+]?\d*\.?\d+(?:\s*|\s*\$)\s*(?:n|newton|newtons|w|watt|watts|v|volt|volts|a|ampere|amperes|f|farad|h|henry)\b/i,
      expected: "Joules (J), calories, or electron-volts (eV)",
    },
    {
      quantity: "Power",
      pattern: /(?:\bpower|(?:^|[^\u0900-\u097F])शक्ति)\s*(?:of\s*|=\s*)?[-+]?\d*\.?\d+(?:\s*|\s*\$)\s*(?:n|newton|newtons|j|joule|joules|v|volt|volts|a|ampere|amperes|c|coulomb)\b/i,
      expected: "Watts (W) or J/s",
    },
    {
      quantity: "Electric Current",
      pattern: /(?:\bcurrent|(?:^|[^\u0900-\u097F])विद्युत\s*धारा)\s*(?:of\s*|=\s*)?[-+]?\d*\.?\d+(?:\s*|\s*\$)\s*(?:v|volt|volts|w|watt|watts|j|joule|joules|ohm|\\omega)\b/i,
      expected: "Amperes (A)",
    },
    {
      quantity: "Resistance",
      pattern: /(?:\bresistance|(?:^|[^\u0900-\u097F])प्रतिरोध)\s*(?:of\s*|=\s*)?[-+]?\d*\.?\d+(?:\s*|\s*\$)\s*(?:v|volt|volts|a|ampere|amperes|w|watt|watts|j|f|farad)\b/i,
      expected: "Ohms (Ω)",
    },
    {
      quantity: "Capacitance",
      pattern: /(?:\bcapacitance|(?:^|[^\u0900-\u097F])धारिता)\s*(?:of\s*|=\s*)?[-+]?\d*\.?\d+(?:\s*|\s*\$)\s*(?:h|henry|henrys|ohm|\\omega|w|watt|v|volt)\b/i,
      expected: "Farads (F, µF, nF, pF)",
    },
    {
      quantity: "Velocity",
      pattern: /(?:\b(?:velocity|speed)|(?:^|[^\u0900-\u097F])(?:वेग|चाल))\s*(?:of\s*|=\s*)?[-+]?\d*\.?\d+(?:\s*|\s*\$)\s*(?:m\/s\^2\b|m\s*s\^\{-2\}|(?:n|j|w)\b)/i,
      expected: "m/s or km/h",
    },
    {
      quantity: "Acceleration",
      pattern: /(?:\bacceleration|(?:^|[^\u0900-\u097F])त्वरण)\s*(?:of\s*|=\s*)?[-+]?\d*\.?\d+(?:\s*|\s*\$)\s*(?:m\/s(?![\^2])|km\/h|n|j)\b/i,
      expected: "m/s²",
    },
  ];

  for (const ur of unitRules) {
    const m = fullText.match(ur.pattern);
    if (m) {
      issues.push({
        code: "PHYSICS_UNIT_INCONSISTENCY",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: Inconsistent unit detected in '${m[0]}'. ${ur.quantity} must be expressed in ${ur.expected}.`,
        slotIndex: slotIdx,
      });
      break;
    }
  }

  // 2. Physical Parameter Bounds (PHYSICS_IMPOSSIBLE_PARAMETER)
  const speedMatch = fullText.match(/(?:\b(?:speed|velocity)|(?:^|[^\u0900-\u097F])(?:चाल|वेग))\s*(?:of\s*|=\s*|is\s*)?([0-9.]+)\s*(?:x|\*|\\times)?\s*10\^?\{?(\d+)\}?\s*m\/s/i);
  if (speedMatch) {
    const mantissa = parseFloat(speedMatch[1]);
    const exponent = parseInt(speedMatch[2], 10);
    const speed = mantissa * Math.pow(10, exponent);
    if (speed > 3.03e8) {
      issues.push({
        code: "PHYSICS_IMPOSSIBLE_PARAMETER",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: Physical bound violation: Speed ${speed.toExponential(2)} m/s exceeds the speed of light in vacuum c = 3.0 × 10⁸ m/s.`,
        slotIndex: slotIdx,
      });
    }
  }

  const negTempK = fullText.match(/[-−]\s*([0-9.]+)\s*(?:k|kelvin)\b/i);
  if (negTempK) {
    issues.push({
      code: "PHYSICS_IMPOSSIBLE_PARAMETER",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Physical bound violation: Absolute temperature cannot be negative (${negTempK[0].trim()}). Third Law of Thermodynamics strictly requires T >= 0 K.`,
      slotIndex: slotIdx,
    });
  }

  const negMass = fullText.match(/(?:\bmass|(?:^|[^\u0900-\u097F])द्रव्यमान)\s+(?:of\s+|का\s+)?[-−]\s*([0-9.]+)\s*(?:kg|g|grams?)\b/i);
  if (negMass) {
    issues.push({
      code: "PHYSICS_IMPOSSIBLE_PARAMETER",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Physical bound violation: Macroscopic mass cannot be negative (${negMass[0].trim()}).`,
      slotIndex: slotIdx,
    });
  }

  const effMatch = fullText.match(/(?:\befficiency|(?:^|[^\u0900-\u097F])दक्षता)\s*(?:of\s*|=\s*|is\s*|की\s*)?(\d+(?:\.\d+)?)\s*%/i);
  if (effMatch) {
    const eta = parseFloat(effMatch[1]);
    if (eta >= 100) {
      issues.push({
        code: "PHYSICS_IMPOSSIBLE_PARAMETER",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: Physical bound violation: Heat engine efficiency cannot equal or exceed 100% (${eta}%). Second Law of Thermodynamics strictly requires η < 100%.`,
        slotIndex: slotIdx,
      });
    }
  }

  const nMatch = fullText.match(/(?:\brefractive\s+index|(?:^|[^\u0900-\u097F])अपवर्तनांक)\s*(?:of\s*|=\s*|is\s*|का\s*)?(0\.\d+)\b/i);
  if (nMatch) {
    const n = parseFloat(nMatch[1]);
    if (n < 1.0) {
      issues.push({
        code: "PHYSICS_IMPOSSIBLE_PARAMETER",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: Physical bound violation: Absolute refractive index of a physical medium cannot be less than 1.0 (received n = ${n}).`,
        slotIndex: slotIdx,
      });
    }
  }

  // 3. Optics Cartesian Sign Convention (PHYSICS_OPTICS_SIGN_ERROR)
  const concaveMirrorPosF =
    fullText.match(/(?:\bconcave\s+mirror|(?:^|[^\u0900-\u097F])अवतल\s+दर्पण).*?f\s*=\s*\+\s*(\d+)/i) ||
    fullText.match(/f\s*=\s*\+\s*(\d+).*?(?:\bconcave\s+mirror|(?:^|[^\u0900-\u097F])अवतल\s+दर्पण)/i);
  if (concaveMirrorPosF) {
    issues.push({
      code: "PHYSICS_OPTICS_SIGN_ERROR",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Cartesian sign error: Concave mirror must have negative focal length (f < 0), but positive focal length (+${concaveMirrorPosF[1]}) was assigned.`,
      slotIndex: slotIdx,
    });
  }

  const convexMirrorNegF =
    fullText.match(/(?:\bconvex\s+mirror|(?:^|[^\u0900-\u097F])उत्तल\s+दर्पण).*?f\s*=\s*[-−]\s*(\d+)/i) ||
    fullText.match(/f\s*=\s*[-−]\s*(\d+).*?(?:\bconvex\s+mirror|(?:^|[^\u0900-\u097F])उत्तल\s+दर्पण)/i);
  if (convexMirrorNegF) {
    issues.push({
      code: "PHYSICS_OPTICS_SIGN_ERROR",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Cartesian sign error: Convex mirror must have positive focal length (f > 0), but negative focal length was assigned.`,
      slotIndex: slotIdx,
    });
  }

  const concaveLensPosF =
    fullText.match(/(?:\bconcave\s+lens|(?:^|[^\u0900-\u097F])अवतल\s+लेंस).*?f\s*=\s*\+\s*(\d+)/i) ||
    fullText.match(/f\s*=\s*\+\s*(\d+).*?(?:\bconcave\s+lens|(?:^|[^\u0900-\u097F])अवतल\s+लेंस)/i);
  if (concaveLensPosF) {
    issues.push({
      code: "PHYSICS_OPTICS_SIGN_ERROR",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Cartesian sign error: Concave lens must have negative focal length (f < 0), but positive focal length (+${concaveLensPosF[1]}) was assigned.`,
      slotIndex: slotIdx,
    });
  }

  const convexLensNegF =
    fullText.match(/(?:\bconvex\s+lens|(?:^|[^\u0900-\u097F])उत्तल\s+लेंस).*?f\s*=\s*[-−]\s*(\d+)/i) ||
    fullText.match(/f\s*=\s*[-−]\s*(\d+).*?(?:\bconvex\s+lens|(?:^|[^\u0900-\u097F])उत्तल\s+लेंस)/i);
  if (convexLensNegF) {
    issues.push({
      code: "PHYSICS_OPTICS_SIGN_ERROR",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Cartesian sign error: Convex lens must have positive focal length (f > 0), but negative focal length was assigned.`,
      slotIndex: slotIdx,
    });
  }

  const realObjPosU =
    fullText.match(/(?:\b(?:real\s+object|object\s+is\s+placed)|(?:^|[^\u0900-\u097F])(?:वास्तविक\s+(?:बिम्ब|वस्तु)|(?:बिम्ब|वस्तु)\s+.*?(?:रखा|रखी|स्थित))).*?u\s*=\s*\+\s*(\d+)/i) ||
    fullText.match(/u\s*=\s*\+\s*(\d+).*?(?:\b(?:real\s+object|object\s+is\s+placed)|(?:^|[^\u0900-\u097F])(?:वास्तविक\s+(?:बिम्ब|वस्तु)|(?:बिम्ब|वस्तु).*?(?:रखा|रखी|स्थित)))/i) ||
    fullText.match(/(?:^|[^\u0900-\u097F])(?:बिम्ब|वस्तु).*?u\s*=\s*\+\s*(\d+).*?(?:रखा|रखी|स्थित)/i);
  if (realObjPosU) {
    issues.push({
      code: "PHYSICS_OPTICS_SIGN_ERROR",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Cartesian sign error: Object distance u must be negative (u < 0) for real objects placed in front of mirror/lens.`,
      slotIndex: slotIdx,
    });
  }

  const realInvertedPosM =
    fullText.match(/(?:\breal\s+and\s+inverted|(?:^|[^\u0900-\u097F])वास्तविक\s+एवं\s+उल्टा).*?m\s*=\s*\+\s*([0-9.]+)/i) ||
    fullText.match(/m\s*=\s*\+\s*([0-9.]+).*?(?:\breal\s+and\s+inverted|(?:^|[^\u0900-\u097F])वास्तविक\s+एवं\s+उल्टा)/i);
  if (realInvertedPosM) {
    issues.push({
      code: "PHYSICS_OPTICS_SIGN_ERROR",
      severity: "ERROR",
      message: `Slot ${slotIdx + 1}: Cartesian sign contradiction: Real and inverted images must have negative magnification (m < 0), received m = +${realInvertedPosM[1]}.`,
      slotIndex: slotIdx,
    });
  }
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
  const subparts = Array.isArray(question.subparts) && question.subparts.length > 0 ? question.subparts : [];

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
    contract.rawSubject || contract.canonicalSubject || "",
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
      /सत्य|असत्य|सही|गलत|आम्|न|सत्यम्|असत्यम्|शुद्धम्|अशुद्धम्|शुद्ध|अशुद्ध/.test(answer);
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
  } else if (isSubpartQuestionType(qType) || subparts.length > 0) {
    const targetMarks = slot?.marks || contract.marksEach || 4;
    if (isSubpartQuestionType(qType) && subparts.length === 0) {
      issues.push({
        code: "QUESTION_TYPE_MISMATCH",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: ${qType} requires graded subparts.`,
        slotIndex: slotIdx,
      });
    } else if (subparts.length > 0) {
      const attemptCount = (question as any).attemptCount;
      const isValid = validateSubPartsSum(subparts, targetMarks, attemptCount);
      if (!isValid) {
        const sum = subpartsTotalMarks(subparts);
        issues.push({
          code: "MARKS_MISMATCH",
          severity: "ERROR",
          message: `Slot ${slotIdx + 1}: ${qType} subparts sum to ${sum} marks${attemptCount ? ` (attempt count: ${attemptCount})` : ""}, but slot requires ${targetMarks} marks.`,
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

  // 5b. Subject-specific Sanskrit academic integrity & morphological validation
  validateSanskritAcademicIntegrity(question, contract, slotIdx, issues, opts);

  // 5c. Subject-specific Mathematics academic integrity & calculation validation
  validateMathematicsAcademicIntegrity(question, contract, slotIdx, issues);

  // 5d. Subject-specific Chemistry academic integrity, reaction balancing, & IUPAC validation
  validateChemistryAcademicIntegrity(question, contract, slotIdx, issues);

  // 5e. Subject-specific Physics academic integrity, unit consistency, & optics sign validation
  validatePhysicsAcademicIntegrity(question, contract, slotIdx, issues);

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

    if (slotForbidsChoice && hasOr) {
      issues.push({
        code: "FORBIDDEN_INTERNAL_CHOICE",
        severity: "ERROR",
        message: `Slot ${slotIdx + 1}: Internal choice (OR / अथवा) is prohibited for this ${slotMarks}-mark slot under ${contract.internalChoiceRequirement?.patternVersion || "MPBSE 2026–27 revised rules"}.`,
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
