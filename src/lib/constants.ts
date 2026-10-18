export const QUESTION_TYPES = [
  "MCQ",
  "ASSERTION_REASON",
  "TRUE_FALSE",
  "FILL_BLANK",
  "MATCH_COLUMN",
  "VERY_SHORT",
  "SHORT",
  "LONG",
  "CASE_STUDY",
  "UNSEEN_PASSAGE",
  "REFERENCE_CONTEXT",
  "WRITING_SKILL",
  "GRAMMAR",
  "DRAW",
  "MAP_WORK",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  MCQ: "Multiple choice",
  ASSERTION_REASON: "Assertion & Reason (अभिकथन एवं तर्क)",
  TRUE_FALSE: "True / False",
  FILL_BLANK: "Fill in the blank",
  MATCH_COLUMN: "Match the column (सही जोड़ी मिलाइए)",
  VERY_SHORT: "Very short / One word (अति लघु / एक वाक्य)",
  SHORT: "Short answer",
  LONG: "Long answer",
  CASE_STUDY: "Case study / Multi-part",
  UNSEEN_PASSAGE: "Unseen passage / अपठित गद्यांश-काव्यांश",
  REFERENCE_CONTEXT: "Reference to context / सन्दर्भ-प्रसंग व्याख्या",
  WRITING_SKILL: "Writing skill / रचनात्मक लेखन (पत्र, निबंध, सूचना)",
  GRAMMAR: "Grammar / व्याकरण (निर्देशानुसार)",
  DRAW: "Draw / diagram",
  MAP_WORK: "Map work / मानचित्र कार्य",
};

export function isMcqLikeType(type?: string | null): boolean {
  return type === "MCQ" || type === "ASSERTION_REASON";
}

export function isSubpartQuestionType(type?: string | null): boolean {
  return type === "CASE_STUDY" || type === "UNSEEN_PASSAGE" || type === "REFERENCE_CONTEXT";
}

export interface MatchColumnPair {
  left: string;
  right: string;
}

export function serializeMatchColumnPair(left: string, right: string): string {
  return `${left.trim()} ||| ${right.trim()}`;
}

export function parseMatchColumnPairs(options: string[] = []): MatchColumnPair[] {
  return options.map((opt) => {
    if (opt.includes("|||")) {
      const [left, ...rest] = opt.split("|||");
      return { left: left.trim(), right: rest.join("|||").trim() };
    }
    if (opt.includes("::")) {
      const [left, ...rest] = opt.split("::");
      return { left: left.trim(), right: rest.join("::").trim() };
    }
    if (opt.includes("→")) {
      const [left, ...rest] = opt.split("→");
      return { left: left.trim(), right: rest.join("→").trim() };
    }
    if (opt.includes("->")) {
      const [left, ...rest] = opt.split("->");
      return { left: left.trim(), right: rest.join("->").trim() };
    }
    if (opt.includes(" - ")) {
      const [left, ...rest] = opt.split(" - ");
      return { left: left.trim(), right: rest.join(" - ").trim() };
    }
    return { left: opt.trim(), right: "" };
  });
}

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const EXAM_TYPES = ["QUARTERLY", "HALF_YEARLY", "ANNUAL"] as const;
export type ExamType = (typeof EXAM_TYPES)[number];
export const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half Yearly",
  ANNUAL: "Annual",
};

export function inferExamTypeFromText(text?: string | null): ExamType | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes("half-yearly") || lower.includes("half yearly") || lower.includes("half_yearly") || lower.includes("mid-term") || lower.includes("mid term") || lower.includes("term 1") || lower.includes("term-1")) {
    return "HALF_YEARLY";
  }
  if (lower.includes("quarterly") || lower.includes("unit test") || lower.includes("periodic")) {
    return "QUARTERLY";
  }
  if (lower.includes("annual") || lower.includes("final exam") || lower.includes("board exam") || lower.includes("term 2") || lower.includes("term-2")) {
    return "ANNUAL";
  }
  return null;
}

export function resolvePaperExamType(paper: {
  examType?: string | null;
  title?: string | null;
  blueprint?: { examType?: string | null } | null;
}): ExamType {
  if (paper.examType && (EXAM_TYPES as readonly string[]).includes(paper.examType)) {
    return paper.examType as ExamType;
  }
  const inferred = inferExamTypeFromText(paper.title);
  if (inferred) return inferred;
  if (paper.blueprint?.examType && (EXAM_TYPES as readonly string[]).includes(paper.blueprint.examType)) {
    return paper.blueprint.examType as ExamType;
  }
  return "ANNUAL";
}

const MCQ_LETTERS = "ABCDEF";

export function normalizeMcqAnswer(
  rawAnswer: string | null | undefined,
  options: string[] = [],
): { letter: string; optionText?: string; display: string } {
  const trimmed = (rawAnswer ?? "").trim();
  if (!trimmed) return { letter: "", optionText: undefined, display: "—" };

  // Strip surrounding parentheses, trailing dot/paren, or "Option " prefix
  const cleaned = trimmed
    .replace(/^option\s+/i, "")
    .replace(/^\(([a-zA-Z0-9])\)$/, "$1")
    .replace(/^([a-zA-Z0-9])[.)]$/, "$1")
    .trim();

  if (cleaned.length === 1) {
    const upper = cleaned.toUpperCase();
    const idx = MCQ_LETTERS.indexOf(upper);
    if (idx >= 0) {
      return {
        letter: upper,
        optionText: options[idx],
        display: `(${upper})`,
      };
    }
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num >= 1 && num <= MCQ_LETTERS.length) {
      const letter = MCQ_LETTERS[num - 1];
      return {
        letter,
        optionText: options[num - 1],
        display: `(${letter})`,
      };
    }
  }

  // Match against option text
  const matchIdx = options.findIndex((o) => o.trim().toLowerCase() === trimmed.toLowerCase());
  if (matchIdx >= 0 && matchIdx < MCQ_LETTERS.length) {
    const letter = MCQ_LETTERS[matchIdx];
    return {
      letter,
      optionText: options[matchIdx],
      display: `(${letter})`,
    };
  }

  return {
    letter: cleaned.toUpperCase(),
    optionText: undefined,
    display: trimmed.startsWith("(") ? trimmed : `(${trimmed.toUpperCase()})`,
  };
}

export const LAYOUTS = ["BOOKLET_A4", "BOOKLET", "PAGE"] as const;
export type Layout = (typeof LAYOUTS)[number];
export const LAYOUT_LABEL: Record<Layout, string> = {
  BOOKLET_A4: "Booklet (A4 sheets folded to A5, 4 sides per sheet)",
  BOOKLET: "Booklet (A3 sheets folded to A4, 4 sides per sheet)",
  PAGE: "Single pages (A4 portrait)",
};

export const isBookletLayout = (layout?: string | null): boolean =>
  layout === "BOOKLET" || layout === "BOOKLET_A4";

export const DEFAULT_SCHOOL_NAME = "Sarvodaya English Higher Secondary School, Lakhnadon";
export const SCHOOL_FULL_NAME = DEFAULT_SCHOOL_NAME;
export const SCHOOL_DISPLAY_NAME = "Sarvodaya Higher Secondary School, Lakhnadon";
export const SCHOOL_SHORT_NAME = "Sarvodaya H.S. School";
export const SCHOOL_LOCATION = "Lakhnadon";
export const SCHOOL_ESTABLISHED = "Established 2002 · Lakhnadon";
export const SCHOOL_MOTTO_HI = "तमसो माँ ज्योतिर्गमय";
export const SCHOOL_MOTTO_EN = "Lead us from darkness to light";
export const DEFAULT_SCHOOL_LOGO = "/school-logo.png";

export const PRINT_DENSITIES = ["COMPACT", "STANDARD", "COMFORTABLE"] as const;
export type PrintDensity = (typeof PRINT_DENSITIES)[number];
export const PRINT_DENSITY_LABEL: Record<PrintDensity, string> = {
  COMPACT: "Compact (tight spacing, min 9pt)",
  STANDARD: "Standard (default board layout)",
  COMFORTABLE: "Comfortable (generous spacing)",
};
export const DEFAULT_PRINT_DENSITY: PrintDensity = "STANDARD";

export const NUMBERING_STYLES = ["CONTINUOUS", "PREFIXED", "SECTION_RELATIVE"] as const;
export type NumberingStyle = (typeof NUMBERING_STYLES)[number];
export const NUMBERING_STYLE_LABEL: Record<NumberingStyle, string> = {
  CONTINUOUS: "Continuous (1, 2, 3...)",
  PREFIXED: "Prefixed (Q.1, Q.2, Q.3...)",
  SECTION_RELATIVE: "Section-relative (A1, A2... / B1, B2...)",
};
export const DEFAULT_NUMBERING_STYLE: NumberingStyle = "CONTINUOUS";

export function formatQuestionNumber(
  num: number,
  numberingStyle?: string | null,
  sectionLetter?: string,
  sectionIndex?: number,
): string {
  if (numberingStyle === "PREFIXED") return `Q.${num}`;
  if (numberingStyle === "SECTION_RELATIVE" && sectionLetter && sectionIndex) {
    return `${sectionLetter}${sectionIndex}.`;
  }
  return `${num}.`;
}

export const MARKS_STYLES = ["INLINE", "RIGHT_COLUMN", "SUPPRESSED"] as const;
export type MarksStyle = (typeof MARKS_STYLES)[number];
export const MARKS_STYLE_LABEL: Record<MarksStyle, string> = {
  INLINE: "Inline [3 Marks]",
  RIGHT_COLUMN: "Right margin column",
  SUPPRESSED: "Suppressed (in section header)",
};
export const DEFAULT_MARKS_STYLE: MarksStyle = "INLINE";

export const DEFAULT_ACADEMIC_SESSION = "2025–26";
export const ACADEMIC_SESSIONS = [
  "2023–24",
  "2024–25",
  "2025–26",
  "2026–27",
  "2027–28",
] as const;
export type AcademicSession = (typeof ACADEMIC_SESSIONS)[number];


export const MAX_OPTIONS = 6;
export const MIN_OPTIONS = 2;

export const USER_ROLES = ["ADMIN", "HOD", "TEACHER", "EXAM_CELL"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const USER_ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrator / Principal",
  HOD: "Head of Department",
  TEACHER: "Subject Teacher",
  EXAM_CELL: "Exam Cell & Logistics Officer",
};

export const TIMETABLE_STATUSES = ["SCHEDULED", "DRAFTED", "MODERATED", "PRINTED", "COMPLETED"] as const;
export type TimetableStatus = (typeof TIMETABLE_STATUSES)[number];
export const TIMETABLE_STATUS_LABEL: Record<TimetableStatus, string> = {
  SCHEDULED: "Scheduled",
  DRAFTED: "Drafted",
  MODERATED: "Moderated",
  PRINTED: "Printed & Sealed",
  COMPLETED: "Exam Completed",
};

export const SESSION_SLOTS = ["MORNING", "AFTERNOON"] as const;
export type SessionSlot = (typeof SESSION_SLOTS)[number];
export const SESSION_SLOT_LABEL: Record<SessionSlot, string> = {
  MORNING: "Morning (09:00 – 12:00)",
  AFTERNOON: "Afternoon (14:00 – 17:00)",
};

