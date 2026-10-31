import { normalizeSession } from "./academicSessionUtils";
import { isMcqLikeType } from "./constants";
import { getCanonicalSubjectName } from "./schoolCurriculum";

export type ExaminationPatternVersionId =
  | "MPBSE_2026_27_MAIN_465"
  | "MPBSE_2026_27_NSQF_465"
  | "MPBSE_2025_26_LEGACY"
  | "CBSE_STANDARD"
  | "GENERIC_BOARD";

export type InternalChoicePolicy = "MANDATORY_EVERY_SLOT" | "FORBIDDEN" | "OPTIONAL";

export interface ExaminationPatternRuleSet {
  versionId: ExaminationPatternVersionId;
  board: "MPBSE" | "CBSE" | "OTHER";
  academicSession: string;
  circularReference?: string;
  circularDate?: string;
  subjectCategory: "MAIN" | "NSQF" | "ALL";
  targetClasses: number[];
  description: string;
  rulesByMarks: Record<number, InternalChoicePolicy>;
}

export interface InternalChoiceResolutionContext {
  board?: "MPBSE" | "CBSE" | string | null;
  schoolName?: string | null;
  blueprintName?: string | null;
  academicSession?: string | null;
  className?: string | null;
  subject?: string | null;
  subjectCode?: string | null;
  examType?: string | null;
  sectionTitle?: string | null;
  sectionInstructions?: string | null;
  questionType?: string | null;
  marksEach?: number;
  marks?: number;
  orChoiceMode?: "BOARD_DEFAULT" | "REQUIRED" | "NOT_REQUIRED" | string | null;
  orAlternativeCount?: number | null;
  orSlots?: boolean[] | null;
  orSlotsJson?: string | null;
  slotIndex?: number | null;
}

export interface InternalChoiceRequirement {
  required: boolean;
  forbidden: boolean;
  policy: InternalChoicePolicy;
  patternVersion: ExaminationPatternVersionId;
  circularReference?: string;
  board: "MPBSE" | "CBSE" | "OTHER";
  academicSession: string;
  isNsqf: boolean;
  overrideApplied?: "BLUEPRINT_DISABLE" | "BLUEPRINT_ENABLE";
  reason: string;
  rationale?: string;
}

/**
 * Versioned, configurable examination-pattern metadata registry.
 * Stores statutory board rules as structured configuration rather than hardcoded prompt strings.
 */
export const EXAMINATION_PATTERN_REGISTRY: Record<
  ExaminationPatternVersionId,
  ExaminationPatternRuleSet
> = {
  MPBSE_2026_27_MAIN_465: {
    versionId: "MPBSE_2026_27_MAIN_465",
    board: "MPBSE",
    academicSession: "2026–27",
    circularReference: "465/विद्योचित/2026",
    circularDate: "2026-10-15",
    subjectCategory: "MAIN",
    targetClasses: [9, 10, 11, 12],
    description:
      "MPBSE Revised Examination Pattern (2026–27) for Class 9–12 Main Subjects per Circular 465/विद्योचित/2026: 2-mark VSA questions have NO internal choice; 3-mark SA and 4-mark LA questions require 100% internal choice (OR / अथवा).",
    rulesByMarks: {
      1: "FORBIDDEN",
      2: "FORBIDDEN",
      3: "MANDATORY_EVERY_SLOT",
      4: "MANDATORY_EVERY_SLOT",
      5: "MANDATORY_EVERY_SLOT",
    },
  },
  MPBSE_2026_27_NSQF_465: {
    versionId: "MPBSE_2026_27_NSQF_465",
    board: "MPBSE",
    academicSession: "2026–27",
    circularReference: "465/विद्योचित/2026 (NSQF Provision)",
    circularDate: "2026-10-15",
    subjectCategory: "NSQF",
    targetClasses: [9, 10, 11, 12],
    description:
      "MPBSE Revised Examination Pattern (2026–27) for Class 9–12 NSQF Vocational Subjects per Circular 465/विद्योचित/2026: 2-mark questions have NO internal choice; 3-mark, 4-mark, 5-mark, and 7-mark questions require 100% internal choice (OR / अथवा).",
    rulesByMarks: {
      1: "FORBIDDEN",
      2: "FORBIDDEN",
      3: "MANDATORY_EVERY_SLOT",
      4: "MANDATORY_EVERY_SLOT",
      5: "MANDATORY_EVERY_SLOT",
      7: "MANDATORY_EVERY_SLOT",
    },
  },
  MPBSE_2025_26_LEGACY: {
    versionId: "MPBSE_2025_26_LEGACY",
    board: "MPBSE",
    academicSession: "2025–26",
    subjectCategory: "ALL",
    targetClasses: [9, 10, 11, 12],
    description:
      "Legacy MPBSE Examination Pattern (2025–26 and earlier): 2-mark, 3-mark, 4-mark, and 5-mark subjective questions carry internal choices.",
    rulesByMarks: {
      1: "FORBIDDEN",
      2: "MANDATORY_EVERY_SLOT",
      3: "MANDATORY_EVERY_SLOT",
      4: "MANDATORY_EVERY_SLOT",
      5: "MANDATORY_EVERY_SLOT",
    },
  },
  CBSE_STANDARD: {
    versionId: "CBSE_STANDARD",
    board: "CBSE",
    academicSession: "ALL",
    subjectCategory: "ALL",
    targetClasses: [9, 10, 11, 12],
    description:
      "CBSE Standard Board Pattern: 5-mark Long Answer sections and sections with explicit internal-choice instructions require internal choice.",
    rulesByMarks: {
      1: "FORBIDDEN",
      2: "OPTIONAL",
      3: "OPTIONAL",
      4: "OPTIONAL",
      5: "MANDATORY_EVERY_SLOT",
    },
  },
  GENERIC_BOARD: {
    versionId: "GENERIC_BOARD",
    board: "OTHER",
    academicSession: "ALL",
    subjectCategory: "ALL",
    targetClasses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    description:
      "Generic school examination pattern: internal choices governed by blueprint section instructions.",
    rulesByMarks: {
      1: "FORBIDDEN",
      2: "OPTIONAL",
      3: "OPTIONAL",
      4: "OPTIONAL",
      5: "OPTIONAL",
    },
  },
};

const NSQF_SUBJECT_CODES = new Set([
  "401",
  "402",
  "403",
  "404",
  "405",
  "406",
  "407",
  "408",
  "409",
  "410",
  "411",
  "412",
  "413",
  "414",
  "415",
  "416",
  "417",
  "801",
  "802",
  "803",
  "804",
  "805",
  "806",
  "807",
  "808",
  "809",
  "810",
  "811",
  "812",
  "813",
  "841",
  "842",
  "843",
]);

const NSQF_SUBJECT_KEYWORDS = [
  "nsqf",
  "vocational",
  "information technology",
  "artificial intelligence",
  "retail",
  "beauty and wellness",
  "beauty & wellness",
  "healthcare",
  "health care",
  "agriculture",
  "automotive",
  "electronics and hardware",
  "electronics & hardware",
  "plumbing",
  "security",
  "tourism and hospitality",
  "tourism & hospitality",
  "apparel",
  "banking",
  "financial markets",
  "food production",
  "front office",
  "media and entertainment",
  "multi skill",
  "physical activity trainer",
  "employability skills",
  "व्यावसायिक",
  "आईटी",
  "सूचना प्रौद्योगिकी",
];

const MAIN_SENIOR_COMPUTER_CODES = new Set(["083", "065"]);

/**
 * Determines whether a subject is an NSQF / Vocational subject under MPBSE / CBSE classification.
 * Note: Class 11–12 Computer Science (083) and Informatics Practices (065) are main academic electives,
 * whereas Class 9–12 Information Technology (402), AI (417), and 800-series codes are NSQF vocational subjects.
 */
export function isNsqfSubject(
  subject?: string | null,
  subjectCode?: string | null,
  className?: string | null,
): boolean {
  const cleanCode = (subjectCode || "").trim();
  if (cleanCode && MAIN_SENIOR_COMPUTER_CODES.has(cleanCode)) {
    return false;
  }
  if (cleanCode && NSQF_SUBJECT_CODES.has(cleanCode)) {
    return true;
  }

  const raw = (subject || "").trim().toLowerCase();
  if (!raw) return false;

  // Class 11/12 "Computer Science" or "Informatics Practices" are main academic subjects
  if (
    raw.includes("computer science") ||
    raw.includes("informatics practices")
  ) {
    return false;
  }

  const classNum = parseClassNumber(className);
  if (
    (raw === "information technology" ||
      raw.includes("information technology") ||
      raw === "artificial intelligence" ||
      raw.includes("artificial intelligence") ||
      raw === "it" ||
      raw === "ai") &&
    (classNum === null || (classNum >= 9 && classNum <= 12))
  ) {
    return true;
  }

  return NSQF_SUBJECT_KEYWORDS.some((kw) => raw.includes(kw));
}

export function parseClassNumber(className?: string | null): number | null {
  if (!className) return null;
  const m = className.trim().match(/\b(1[0-2]|[1-9])\b/);
  return m ? Number(m[1]) : null;
}

export function detectExaminationBoard(context: {
  board?: string | null;
  schoolName?: string | null;
  blueprintName?: string | null;
  sectionInstructions?: string | null;
}): "MPBSE" | "CBSE" | "OTHER" {
  const explicit = (context.board || "").trim().toUpperCase();
  if (explicit === "MPBSE" || explicit.includes("MP BOARD") || explicit.includes("MPBSE")) {
    return "MPBSE";
  }
  if (explicit === "CBSE") {
    return "CBSE";
  }

  const combined = [
    context.schoolName || "",
    context.blueprintName || "",
    context.sectionInstructions || "",
  ]
    .join(" ")
    .toLowerCase();

  if (
    combined.includes("cbse") ||
    combined.includes("central board of secondary education")
  ) {
    return "CBSE";
  }

  if (
    combined.includes("mpbse") ||
    combined.includes("m.p. board") ||
    combined.includes("mp board") ||
    combined.includes("madhya pradesh") ||
    combined.includes("lakhnadon") ||
    combined.includes("sarvodaya") ||
    combined.includes("अथवा") ||
    combined.includes("म.प्र.") ||
    combined.includes("माध्यमिक शिक्षा मण्डल")
  ) {
    return "MPBSE";
  }

  return "OTHER";
}

function isSession2026OrLater(session?: string | null): boolean {
  const norm = normalizeSession(session || "2026–27");
  const match = norm.match(/^(\d{4})/);
  if (!match) return true;
  return Number(match[1]) >= 2026;
}

function isLegacy2025Session(session?: string | null): boolean {
  if (!session || !session.trim()) return false;
  const norm = normalizeSession(session);
  const match = norm.match(/^(\d{4})/);
  if (!match) return false;
  return Number(match[1]) <= 2025;
}

function isObjectiveSectionOrQuestion(type: string, marksEach: number): boolean {
  const upper = (type || "").trim().toUpperCase();
  if (marksEach === 1) return true;
  return (
    isMcqLikeType(upper) ||
    upper === "MCQ" ||
    upper === "FILL_BLANK" ||
    upper === "TRUE_FALSE" ||
    upper === "MATCH_COLUMN" ||
    upper === "ONE_WORD" ||
    upper === "ASSERTION_REASON" ||
    upper.startsWith("KDG_")
  );
}

/**
 * Checks whether section instructions contain an explicit override disabling or enabling internal choice.
 */
function parseBlueprintInstructionOverride(
  instructions?: string | null,
  options?: { isMpbse2026MainTwoMark?: boolean },
): "DISABLE" | "ENABLE" | null {
  if (!instructions || !instructions.trim()) return null;
  const lower = instructions.trim().toLowerCase();

  // Explicit disable tokens / phrases
  if (
    lower.includes("[no_internal_choice]") ||
    lower.includes("no internal choice") ||
    lower.includes("without internal choice") ||
    lower.includes("internal choice is not allowed") ||
    lower.includes("internal choice not allowed") ||
    lower.includes("बिना आंतरिक विकल्प") ||
    lower.includes("आंतरिक विकल्प नहीं")
  ) {
    return "DISABLE";
  }

  // Under MPBSE 2026-27 Main Subjects, 2-mark questions are strictly forbidden from using
  // the old 2-mark internal-choice pattern unless an explicit override token is provided.
  if (options?.isMpbse2026MainTwoMark) {
    if (
      lower.includes("[force_internal_choice]") ||
      lower.includes("[allow_2m_internal_choice]") ||
      lower.includes("override: internal choice")
    ) {
      return "ENABLE";
    }
    return null;
  }

  // Explicit enable phrases for sections (e.g. CBSE or custom sections)
  if (
    lower.includes("[force_internal_choice]") ||
    lower.includes("with internal choice") ||
    lower.includes("internal choice is provided in all") ||
    lower.includes("internal choice in every question") ||
    lower.includes("internal choice in each question") ||
    lower.includes("internal choices are provided") ||
    lower.includes("internal choice is provided") ||
    lower.includes("प्रत्येक प्रश्न में आंतरिक विकल्प") ||
    lower.includes("सभी प्रश्नों में आंतरिक विकल्प") ||
    lower.includes("आंतरिक विकल्प दिया गया है")
  ) {
    return "ENABLE";
  }

  return null;
}

/**
 * Resolves the effective override from slot override, blueprint section mode, or instruction text.
 */
export function resolveEffectiveChoiceOverride(
  ctx: InternalChoiceResolutionContext,
  options?: { isMpbse2026MainTwoMark?: boolean },
): "DISABLE" | "ENABLE" | null {
  // 1. Slot-level override takes highest precedence if slotIndex is provided
  if (ctx.slotIndex !== undefined && ctx.slotIndex !== null) {
    let slots = ctx.orSlots;
    if (!slots && ctx.orSlotsJson) {
      try {
        const parsed = JSON.parse(ctx.orSlotsJson);
        if (Array.isArray(parsed)) slots = parsed;
      } catch {
        // ignore malformed json
      }
    }
    if (Array.isArray(slots)) {
      const matched: any = (slots as any[]).find(
        (s: any, idx: number) =>
          (typeof s === "object" && s !== null && s.slotIndex === ctx.slotIndex) ||
          (typeof s === "boolean" && idx === ctx.slotIndex),
      );

      if (matched !== undefined) {
        if (typeof matched === "boolean") {
          return matched ? "ENABLE" : "DISABLE";
        }
        if (typeof matched === "object" && matched !== null && typeof (matched as any).required === "boolean") {
          return (matched as any).required ? "ENABLE" : "DISABLE";
        }
      } else if (ctx.slotIndex < slots.length && typeof (slots as any)[ctx.slotIndex] === "boolean") {
        return (slots as any)[ctx.slotIndex] ? "ENABLE" : "DISABLE";
      }
    }
  }

  // 2. Blueprint Section-level choice mode
  const mode = (ctx.orChoiceMode || "").trim().toUpperCase();
  if (mode === "REQUIRED") return "ENABLE";
  if (mode === "NOT_REQUIRED") return "DISABLE";

  // 3. Instruction text override (legacy blueprints)
  return parseBlueprintInstructionOverride(ctx.sectionInstructions, options);
}

/**
 * Resolves the exact internal choice requirement for a given question slot / section
 * based on board, academic session, class, subject (Main vs NSQF), question category, marks,
 * and blueprint section instructions.
 */
function resolveInternalChoiceRequirementBase(
  ctx: InternalChoiceResolutionContext,
): InternalChoiceRequirement {
  const board = detectExaminationBoard(ctx);
  const academicSession = normalizeSession(ctx.academicSession || "2026–27");
  const classNum = parseClassNumber(ctx.className);
  const isHighSchoolOrHigher = classNum === null || (classNum >= 9 && classNum <= 12);
  const nsqf = isNsqfSubject(ctx.subject, ctx.subjectCode, ctx.className);
  const marks = Math.max(1, Number(ctx.marksEach ?? (ctx as any).marks) || 1);
  const qType = (ctx.questionType || "SHORT").trim().toUpperCase();

  // Objective / 1-mark questions default to no internal choice, unless explicitly overridden
  if (isObjectiveSectionOrQuestion(qType, marks)) {
    const patternVersion: ExaminationPatternVersionId =
      board === "MPBSE"
        ? isLegacy2025Session(ctx.academicSession)
          ? "MPBSE_2025_26_LEGACY"
          : nsqf
          ? "MPBSE_2026_27_NSQF_465"
          : "MPBSE_2026_27_MAIN_465"
        : board === "CBSE"
        ? "CBSE_STANDARD"
        : "GENERIC_BOARD";

    const override = resolveEffectiveChoiceOverride(ctx);
    if (override === "ENABLE") {
      return {
        required: true,
        forbidden: false,
        policy: "MANDATORY_EVERY_SLOT",
        patternVersion,
        circularReference:
          patternVersion.startsWith("MPBSE_2026_27")
            ? "465/विद्योचित/2026"
            : undefined,
        board,
        academicSession,
        isNsqf: nsqf,
        overrideApplied: "BLUEPRINT_ENABLE",
        reason: `Enabled via explicit blueprint configuration on objective question (${qType}, ${marks}m).`,
      };
    }

    return {
      required: false,
      forbidden: true,
      policy: "FORBIDDEN",
      patternVersion,
      circularReference:
        patternVersion.startsWith("MPBSE_2026_27")
          ? "465/विद्योचित/2026"
          : undefined,
      board,
      academicSession,
      isNsqf: nsqf,
      reason: `Objective / 1-mark questions (${qType}, ${marks}m) do not carry internal choices.`,
    };
  }

  // Case 1: MPBSE Class 9-12 in 2026-27 (or default active session)
  if (board === "MPBSE" && isHighSchoolOrHigher && isSession2026OrLater(ctx.academicSession) && !isLegacy2025Session(ctx.academicSession)) {
    const ruleSet = nsqf
      ? EXAMINATION_PATTERN_REGISTRY.MPBSE_2026_27_NSQF_465
      : EXAMINATION_PATTERN_REGISTRY.MPBSE_2026_27_MAIN_465;

    const isMpbse2026MainTwoMark = !nsqf && marks === 2;
    const override = resolveEffectiveChoiceOverride(ctx, {
      isMpbse2026MainTwoMark,
    });

    if (override === "DISABLE") {
      return {
        required: false,
        forbidden: false,
        policy: "OPTIONAL",
        patternVersion: ruleSet.versionId,
        circularReference: ruleSet.circularReference,
        board,
        academicSession,
        isNsqf: nsqf,
        overrideApplied: "BLUEPRINT_DISABLE",
        reason: `Disabled via explicit blueprint section instruction override (${ruleSet.versionId}).`,
      };
    }

    if (override === "ENABLE") {
      return {
        required: true,
        forbidden: false,
        policy: "MANDATORY_EVERY_SLOT",
        patternVersion: ruleSet.versionId,
        circularReference: ruleSet.circularReference,
        board,
        academicSession,
        isNsqf: nsqf,
        overrideApplied: "BLUEPRINT_ENABLE",
        reason: `Enabled via explicit blueprint section instruction override (${ruleSet.versionId}).`,
      };
    }

    // 2-Mark Very Short Answer Rule under MPBSE Circular 465/विद्योचित/2026
    if (marks === 2) {
      return {
        required: false,
        forbidden: true,
        policy: "FORBIDDEN",
        patternVersion: ruleSet.versionId,
        circularReference: ruleSet.circularReference,
        board,
        academicSession,
        isNsqf: nsqf,
        reason:
          "MPBSE Circular 465/विद्योचित/2026 (15 Oct 2026): 2-mark Very Short Answer questions are NOT allowed to have internal choices in 2026–27.",
      };
    }

    // 3-Mark Short Answer & 4-Mark Long Answer (plus 5m & 7m for NSQF / Long Answer)
    if (marks === 3 || marks === 4 || marks === 5 || marks === 7 || marks >= 3) {
      const categoryLabel =
        marks === 3
          ? "3-mark Short Answer"
          : marks === 4
          ? "4-mark Long/Analytical Answer"
          : `${marks}-mark ${nsqf ? "NSQF Long Answer" : "Long Answer"}`;
      return {
        required: true,
        forbidden: false,
        policy: "MANDATORY_EVERY_SLOT",
        patternVersion: ruleSet.versionId,
        circularReference: ruleSet.circularReference,
        board,
        academicSession,
        isNsqf: nsqf,
        reason: `MPBSE Circular ${ruleSet.circularReference}: Every ${categoryLabel} question slot requires a mandatory internal choice (OR / अथवा).`,
      };
    }
  }

  // Case 2: MPBSE Legacy 2025-26 Session
  if (board === "MPBSE" && isHighSchoolOrHigher && isLegacy2025Session(ctx.academicSession)) {
    const ruleSet = EXAMINATION_PATTERN_REGISTRY.MPBSE_2025_26_LEGACY;
    const override = resolveEffectiveChoiceOverride(ctx);
    if (override === "DISABLE") {
      return {
        required: false,
        forbidden: false,
        policy: "OPTIONAL",
        patternVersion: ruleSet.versionId,
        board,
        academicSession,
        isNsqf: nsqf,
        overrideApplied: "BLUEPRINT_DISABLE",
        reason: "Disabled via explicit blueprint section instruction.",
      };
    }
    const required = marks >= 2;
    return {
      required,
      forbidden: !required,
      policy: required ? "MANDATORY_EVERY_SLOT" : "FORBIDDEN",
      patternVersion: ruleSet.versionId,
      board,
      academicSession,
      isNsqf: nsqf,
      reason: required
        ? `MPBSE 2025–26 Legacy Pattern: ${marks}-mark subjective questions require internal choice (OR / अथवा).`
        : `Objective 1-mark questions do not carry internal choice.`,
    };
  }

  // Case 3: CBSE or Other Boards / Lower Classes
  const ruleSet =
    board === "CBSE"
      ? EXAMINATION_PATTERN_REGISTRY.CBSE_STANDARD
      : EXAMINATION_PATTERN_REGISTRY.GENERIC_BOARD;
  const override = resolveEffectiveChoiceOverride(ctx);

  if (override === "DISABLE") {
    return {
      required: false,
      forbidden: false,
      policy: "OPTIONAL",
      patternVersion: ruleSet.versionId,
      board,
      academicSession,
      isNsqf: nsqf,
      overrideApplied: "BLUEPRINT_DISABLE",
      reason: "Internal choice disabled by section instruction.",
    };
  }

  if (override === "ENABLE") {
    return {
      required: true,
      forbidden: false,
      policy: "MANDATORY_EVERY_SLOT",
      patternVersion: ruleSet.versionId,
      board,
      academicSession,
      isNsqf: nsqf,
      overrideApplied: "BLUEPRINT_ENABLE",
      reason: "Internal choice required by blueprint section instruction.",
    };
  }

  // For MPBSE classes below 9 (e.g. Class 6-8), if 3m/4m/5m and instructions mention OR/अथवा, or if CBSE 5m
  if (board === "CBSE" && marks >= 5) {
    return {
      required: true,
      forbidden: false,
      policy: "MANDATORY_EVERY_SLOT",
      patternVersion: ruleSet.versionId,
      board,
      academicSession,
      isNsqf: nsqf,
      reason: "CBSE Long Answer (5-mark) section requires internal choice.",
    };
  }

  return {
    required: false,
    forbidden: false,
    policy: "OPTIONAL",
    patternVersion: ruleSet.versionId,
    board,
    academicSession,
    isNsqf: nsqf,
    reason: "No mandatory internal choice rule triggered for this section.",
  };
}

export function resolveInternalChoiceRequirement(
  ctx: InternalChoiceResolutionContext,
): InternalChoiceRequirement {
  const req = resolveInternalChoiceRequirementBase(ctx);
  return {
    ...req,
    rationale: req.rationale || req.reason,
  };
}

/**
 * Returns the un-overridden board default requirement for a section or question.
 */
export function getBoardDefaultChoiceRequirement(
  ctx: InternalChoiceResolutionContext,
): InternalChoiceRequirement {
  return resolveInternalChoiceRequirementBase({
    ...ctx,
    orChoiceMode: "BOARD_DEFAULT",
    orSlots: null,
    orSlotsJson: null,
    slotIndex: null,
    sectionInstructions: "",
  });
}

export interface BoardRuleConflictResult {
  hasConflict: boolean;
  message?: string;
  ruleReference?: string;
}

/**
 * Detects if a teacher's explicit override conflicts with mandatory official board patterns.
 */
export function detectBoardRuleConflict(
  ctx: InternalChoiceResolutionContext,
): BoardRuleConflictResult {
  const mode = (ctx.orChoiceMode || "BOARD_DEFAULT").trim().toUpperCase();
  if (mode === "BOARD_DEFAULT" || !mode) {
    return { hasConflict: false };
  }

  const boardDefault = getBoardDefaultChoiceRequirement(ctx);
  const marks = Math.max(1, Number(ctx.marksEach ?? (ctx as any).marks) || 1);
  const qType = (ctx.questionType || "SHORT").trim().toUpperCase();
  const isObj = isObjectiveSectionOrQuestion(qType, marks);

  if (isObj && mode === "REQUIRED") {
    return {
      hasConflict: true,
      message: "Notice: Board patterns forbid internal choices for 1-mark/objective questions. Custom school override will generate alternatives.",
      ruleReference: boardDefault.patternVersion,
    };
  }

  if (boardDefault.board === "MPBSE" && isSession2026OrLater(ctx.academicSession)) {
    const nsqf = isNsqfSubject(ctx.subject, ctx.subjectCode, ctx.className);
    if (!nsqf && marks === 2 && mode === "REQUIRED") {
      return {
        hasConflict: true,
        message: "Notice: MPBSE Circular 465/2026 specifies no internal choice for 2-mark questions. Custom school override will be applied.",
        ruleReference: "MPBSE Circular 465/विद्योचित/2026",
      };
    }
    if (!nsqf && (marks === 3 || marks === 4) && mode === "NOT_REQUIRED") {
      return {
        hasConflict: true,
        message: `Notice: MPBSE 2026–27 pattern prescribes internal choices for ${marks}-mark questions. Custom school override will omit alternatives.`,
        ruleReference: "MPBSE Circular 465/विद्योचित/2026",
      };
    }
  }

  if (boardDefault.required && mode === "NOT_REQUIRED") {
    return {
      hasConflict: true,
      message: `Notice: Prescribed board examination pattern expects internal choice for ${marks}-mark questions. Custom school override will omit alternatives.`,
      ruleReference: boardDefault.patternVersion,
    };
  }

  if (!boardDefault.required && mode === "REQUIRED") {
    return {
      hasConflict: true,
      message: `Notice: Board pattern does not prescribe internal choices for ${marks}-mark questions. Custom school override will add alternatives.`,
      ruleReference: boardDefault.patternVersion,
    };
  }

  return { hasConflict: false };
}

/**
 * Formats the separator label between Primary and Alternative questions
 * according to paper language and examination board.
 */
export function getInternalChoiceSeparatorLabel(
  lang?: "en" | "hi" | "sa" | "bilingual" | string | null,
  board: "MPBSE" | "CBSE" | "OTHER" | string = "MPBSE",
): string {
  const normalizedLang = (lang || "en").trim().toLowerCase();
  if (normalizedLang === "sa" || normalizedLang === "sanskrit") {
    return "(अथवा)";
  }
  if (normalizedLang === "hi" || normalizedLang === "hindi") {
    return "अथवा";
  }
  if (normalizedLang === "bilingual" || String(board).toUpperCase() === "MPBSE") {
    return "OR (अथवा)";
  }
  return "OR";
}

/**
 * Normalizes / sanitizes section instructions so MPBSE 2026-27 2-mark sections never display
 * stale "internal choice" text and 3m/4m sections clearly state internal choice availability.
 */
export function normalizeSectionInstructionsForInternalChoice(
  instructions: string,
  requirement: InternalChoiceRequirement,
  marksEach: number,
): string {
  const trimmed = (instructions || "").trim();
  if (
    requirement.patternVersion === "MPBSE_2026_27_MAIN_465" ||
    requirement.patternVersion === "MPBSE_2026_27_NSQF_465"
  ) {
    if (marksEach === 2 && requirement.forbidden) {
      // Strip any legacy "internal choice is provided" phrasing from 2-mark section instructions
      const cleaned = trimmed
        .replace(/internal choices? (are|is) provided( in (all|each|every) questions?)?\.?/gi, "")
        .replace(/with internal choice\.?/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      return cleaned || `Very Short Answer Type Questions. Each question carries 2 marks. All questions are compulsory (No internal choice per MPBSE 2026–27 pattern).`;
    }
    if (requirement.required && trimmed && !/internal choice|अथवा|विकल्प/i.test(trimmed)) {
      return `${trimmed.replace(/\.$/, "")}. Internal choice (OR / अथवा) is provided in every question.`;
    }
  }
  return trimmed;
}

/**
 * Checks whether an alternative question is merely a trivial paraphrase of the primary question.
 */
export function isParaphraseOrDuplicateChoice(
  primaryText: string,
  alternativeText: string,
): { isDuplicateOrParaphrase: boolean; similarity: number; reason?: string } {
  const normA = (primaryText || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normB = (alternativeText || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normA || !normB) {
    return {
      isDuplicateOrParaphrase: true,
      similarity: 1,
      reason: "Primary or alternative question text is empty.",
    };
  }

  if (normA === normB) {
    return {
      isDuplicateOrParaphrase: true,
      similarity: 1,
      reason: "Alternative (OR) question is identical to the primary question.",
    };
  }

  const stopWords = new Set([
    "the",
    "of",
    "and",
    "to",
    "in",
    "a",
    "is",
    "that",
    "for",
    "on",
    "with",
    "as",
    "by",
    "at",
    "an",
    "be",
    "this",
    "from",
    "or",
    "are",
    "if",
    "find",
    "evaluate",
    "calculate",
    "determine",
    "prove",
    "show",
    "solve",
    "write",
    "state",
    "define",
    "explain",
    "what",
    "given",
  ]);

  const tokensA = normA.split(" ").filter((t) => t.length > 0 && !stopWords.has(t));
  const tokensB = normB.split(" ").filter((t) => t.length > 0 && !stopWords.has(t));

  if (tokensA.length === 0 || tokensB.length === 0) {
    return { isDuplicateOrParaphrase: false, similarity: 0 };
  }

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  const similarity = union > 0 ? intersection / union : 0;
  const containment = Math.min(setA.size, setB.size) > 0 ? intersection / Math.min(setA.size, setB.size) : 0;

  if (similarity >= 0.70 || (containment >= 0.80 && Math.min(setA.size, setB.size) >= 2)) {
    return {
      isDuplicateOrParaphrase: true,
      similarity: Math.max(similarity, containment),
      reason: `Alternative (OR) question is too similar (${Math.round(Math.max(similarity, containment) * 100)}% lexical overlap) to the primary question and appears to be a paraphrase.`,
    };
  }

  return { isDuplicateOrParaphrase: false, similarity };
}

export interface PaperInternalChoiceAuditItem {
  itemId?: string;
  questionNumber: number;
  sectionId: string;
  sectionTitle: string;
  marksEach: number;
  questionType: string;
  requirement: InternalChoiceRequirement;
  hasAlternative: boolean;
  status: "VALID" | "MISSING_REQUIRED_OR" | "FORBIDDEN_OR_PRESENT" | "INVALID_OR";
  issueMessage?: string;
}

export interface InternalChoiceIssue {
  code: "MISSING_INTERNAL_CHOICE" | "FORBIDDEN_INTERNAL_CHOICE" | "INVALID_INTERNAL_CHOICE";
  severity: "error";
  sectionId?: string;
  sectionTitle?: string;
  questionNumber?: number;
  questionId?: string;
  message: string;
}

export interface PaperInternalChoiceAuditReport {
  patternVersion: ExaminationPatternVersionId;
  circularReference?: string;
  board: "MPBSE" | "CBSE" | "OTHER";
  academicSession: string;
  isNsqf: boolean;
  requiredSlotsCount: number;
  validAlternativesCount: number;
  coveragePercent: number;
  missingChoiceSlots: PaperInternalChoiceAuditItem[];
  forbiddenChoiceSlots: PaperInternalChoiceAuditItem[];
  invalidChoiceSlots: PaperInternalChoiceAuditItem[];
  allSlots: PaperInternalChoiceAuditItem[];
  issues: InternalChoiceIssue[];
  compliant: boolean;
}

export type PaperInternalChoiceAudit = PaperInternalChoiceAuditReport;

/**
 * Evaluates an entire paper (and its blueprint sections + placed items) against the
 * applicable Internal Choice Rules.
 *
 * Internal Choice Coverage = (Valid alternatives generated / Question slots requiring alternatives) × 100
 * Required threshold: 100% for all eligible question categories, and 0 forbidden choices.
 */
export function evaluatePaperInternalChoiceCompliance(params: {
  board?: string | null;
  schoolName?: string | null;
  blueprintName?: string | null;
  academicSession?: string | null;
  className?: string | null;
  subject?: string | null;
  subjectCode?: string | null;
  examType?: string | null;
  sections: Array<{
    id: string;
    title: string;
    instructions?: string | null;
    type: string;
    count: number;
    marksEach: number;
    orChoiceMode?: string | null;
    orAlternativeCount?: number | null;
    orSlotsJson?: string | null;
  }>;
  items: Array<{
    id?: string;
    sectionId: string;
    question: {
      id?: string;
      chapterId: string;
      type: string;
      text: string;
      answer?: string | null;
      subparts?: Array<{ marks: number }>;
    };
    orQuestion?: {
      id?: string;
      chapterId: string;
      type: string;
      text: string;
      answer?: string | null;
      subparts?: Array<{ marks: number }>;
    } | null;
  }>;
}): PaperInternalChoiceAuditReport {
  const allSlots: PaperInternalChoiceAuditItem[] = [];
  let qNum = 1;

  const firstSec = params.sections[0];
  const headerReq = resolveInternalChoiceRequirement({
    board: params.board,
    schoolName: params.schoolName,
    blueprintName: params.blueprintName,
    academicSession: params.academicSession,
    className: params.className,
    subject: params.subject,
    subjectCode: params.subjectCode,
    examType: params.examType,
    sectionTitle: firstSec?.title,
    sectionInstructions: firstSec?.instructions,
    questionType: firstSec?.type || "SHORT",
    marksEach: firstSec?.marksEach || 3,
  });

  for (const sec of params.sections) {
    const secItems = params.items.filter((i) => i.sectionId === sec.id);
    const slotTotal = Math.max(sec.count, secItems.length);

    for (let idx = 0; idx < slotTotal; idx++) {
      const item = secItems[idx];
      const currentQNum = qNum++;

      const req = resolveInternalChoiceRequirement({
        board: params.board,
        schoolName: params.schoolName,
        blueprintName: params.blueprintName,
        academicSession: params.academicSession,
        className: params.className,
        subject: params.subject,
        subjectCode: params.subjectCode,
        examType: params.examType,
        sectionTitle: sec.title,
        sectionInstructions: sec.instructions,
        questionType: sec.type,
        marksEach: sec.marksEach,
        slotIndex: idx,
        orChoiceMode: sec.orChoiceMode,
        orAlternativeCount: sec.orAlternativeCount,
        orSlotsJson: sec.orSlotsJson,
      });

      if (!item) {
        if (req.required) {
          allSlots.push({
            questionNumber: currentQNum,
            sectionId: sec.id,
            sectionTitle: sec.title,
            marksEach: sec.marksEach,
            questionType: sec.type,
            requirement: req,
            hasAlternative: false,
            status: "MISSING_REQUIRED_OR",
            issueMessage: `Question slot ${currentQNum} in ${sec.title} (${sec.marksEach}m) is empty and requires a Primary + OR internal choice pair.`,
          });
        }
        continue;
      }

      const orQ = item.orQuestion;
      const hasOr = Boolean(orQ && orQ.text && orQ.text.trim().length > 0);

      // Check 1: Forbidden internal choice (e.g., 2-mark question in MPBSE 2026-27 Main Subject)
      if (req.forbidden && hasOr && sec.marksEach === 2) {
        allSlots.push({
          itemId: item.id,
          questionNumber: currentQNum,
          sectionId: sec.id,
          sectionTitle: sec.title,
          marksEach: sec.marksEach,
          questionType: sec.type,
          requirement: req,
          hasAlternative: true,
          status: "FORBIDDEN_OR_PRESENT",
          issueMessage: `Question ${currentQNum} (${sec.title}, 2 marks) has an internal choice (OR), which is prohibited under ${req.patternVersion} (${req.circularReference || "MPBSE 2026–27 revised rule"}).`,
        });
        continue;
      }

      // Check 2: Required internal choice
      if (req.required) {
        if (!hasOr || !orQ) {
          allSlots.push({
            itemId: item.id,
            questionNumber: currentQNum,
            sectionId: sec.id,
            sectionTitle: sec.title,
            marksEach: sec.marksEach,
            questionType: sec.type,
            requirement: req,
            hasAlternative: false,
            status: "MISSING_REQUIRED_OR",
            issueMessage: `Question ${currentQNum} (${sec.title}, ${sec.marksEach} marks) is missing its mandatory internal choice (OR / अथवा) required by ${req.patternVersion}.`,
          });
          continue;
        }

        // Validate the OR question quality, chapter, marks, and non-paraphrase
        const paraCheck = isParaphraseOrDuplicateChoice(item.question.text, orQ.text);
        if (paraCheck.isDuplicateOrParaphrase) {
          allSlots.push({
            itemId: item.id,
            questionNumber: currentQNum,
            sectionId: sec.id,
            sectionTitle: sec.title,
            marksEach: sec.marksEach,
            questionType: sec.type,
            requirement: req,
            hasAlternative: true,
            status: "INVALID_OR",
            issueMessage: `Question ${currentQNum} (${sec.title}): ${paraCheck.reason}`,
          });
          continue;
        }

        if (orQ.chapterId && item.question.chapterId && orQ.chapterId !== item.question.chapterId) {
          allSlots.push({
            itemId: item.id,
            questionNumber: currentQNum,
            sectionId: sec.id,
            sectionTitle: sec.title,
            marksEach: sec.marksEach,
            questionType: sec.type,
            requirement: req,
            hasAlternative: true,
            status: "INVALID_OR",
            issueMessage: `Question ${currentQNum} (${sec.title}): Alternative (OR) question belongs to a different chapter than the primary question.`,
          });
          continue;
        }

        if (orQ.subparts && orQ.subparts.length > 0) {
          const orSubMarks = orQ.subparts.reduce((s, sp) => s + (Number(sp.marks) || 0), 0);
          if (orSubMarks !== sec.marksEach) {
            allSlots.push({
              itemId: item.id,
              questionNumber: currentQNum,
              sectionId: sec.id,
              sectionTitle: sec.title,
              marksEach: sec.marksEach,
              questionType: sec.type,
              requirement: req,
              hasAlternative: true,
              status: "INVALID_OR",
              issueMessage: `Question ${currentQNum} (${sec.title}): Alternative (OR) question subpart marks (${orSubMarks}m) do not match slot marks (${sec.marksEach}m).`,
            });
            continue;
          }
        }

        allSlots.push({
          itemId: item.id,
          questionNumber: currentQNum,
          sectionId: sec.id,
          sectionTitle: sec.title,
          marksEach: sec.marksEach,
          questionType: sec.type,
          requirement: req,
          hasAlternative: true,
          status: "VALID",
        });
      } else {
        allSlots.push({
          itemId: item.id,
          questionNumber: currentQNum,
          sectionId: sec.id,
          sectionTitle: sec.title,
          marksEach: sec.marksEach,
          questionType: sec.type,
          requirement: req,
          hasAlternative: hasOr,
          status: "VALID",
        });
      }
    }
  }

  const requiredSlots = allSlots.filter((s) => s.requirement.required);
  const validAlternatives = requiredSlots.filter((s) => s.status === "VALID" && s.hasAlternative);
  const missingChoiceSlots = allSlots.filter((s) => s.status === "MISSING_REQUIRED_OR");
  const forbiddenChoiceSlots = allSlots.filter((s) => s.status === "FORBIDDEN_OR_PRESENT");
  const invalidChoiceSlots = allSlots.filter((s) => s.status === "INVALID_OR");

  const coveragePercent =
    requiredSlots.length === 0
      ? 100
      : Math.round((validAlternatives.length / requiredSlots.length) * 100);

  const compliant =
    missingChoiceSlots.length === 0 &&
    forbiddenChoiceSlots.length === 0 &&
    invalidChoiceSlots.length === 0 &&
    coveragePercent === 100;

  const issues: InternalChoiceIssue[] = [
    ...missingChoiceSlots.map((s) => ({
      code: "MISSING_INTERNAL_CHOICE" as const,
      severity: "error" as const,
      sectionId: s.sectionId,
      sectionTitle: s.sectionTitle,
      questionNumber: s.questionNumber,
      questionId: s.itemId,
      message: s.issueMessage || `Question ${s.questionNumber} (${s.sectionTitle}) is missing mandatory internal choice (OR).`,
    })),
    ...forbiddenChoiceSlots.map((s) => ({
      code: "FORBIDDEN_INTERNAL_CHOICE" as const,
      severity: "error" as const,
      sectionId: s.sectionId,
      sectionTitle: s.sectionTitle,
      questionNumber: s.questionNumber,
      questionId: s.itemId,
      message: s.issueMessage || `Question ${s.questionNumber} (${s.sectionTitle}) has a forbidden internal choice (OR).`,
    })),
    ...invalidChoiceSlots.map((s) => ({
      code: "INVALID_INTERNAL_CHOICE" as const,
      severity: "error" as const,
      sectionId: s.sectionId,
      sectionTitle: s.sectionTitle,
      questionNumber: s.questionNumber,
      questionId: s.itemId,
      message: s.issueMessage || `Question ${s.questionNumber} (${s.sectionTitle}) has an invalid internal choice (OR).`,
    })),
  ];

  return {
    patternVersion: headerReq.patternVersion,
    circularReference: headerReq.circularReference,
    board: headerReq.board,
    academicSession: headerReq.academicSession,
    isNsqf: headerReq.isNsqf,
    requiredSlotsCount: requiredSlots.length,
    validAlternativesCount: validAlternatives.length,
    coveragePercent,
    missingChoiceSlots,
    forbiddenChoiceSlots,
    invalidChoiceSlots,
    allSlots,
    issues,
    compliant,
  };
}
