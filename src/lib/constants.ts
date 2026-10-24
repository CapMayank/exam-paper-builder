export const KINDERGARTEN_QUESTION_TYPES = [
  "KDG_TRACE_WRITE",
  "KDG_NUMBER_GRID",
  "KDG_PICTURE_MATCH",
  "KDG_COUNT_ITEMS",
  "KDG_CIRCLE_TARGET",
  "KDG_SEQUENCE_CHAIN",
] as const;

export const STANDARD_QUESTION_TYPES = [
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

export const QUESTION_TYPES = [
  ...STANDARD_QUESTION_TYPES,
  ...KINDERGARTEN_QUESTION_TYPES,
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
  KDG_TRACE_WRITE: "Letter & Word Tracing / 4-Line Writing",
  KDG_NUMBER_GRID: "Number Writing Grid (1 to 50 / 1 to 100)",
  KDG_PICTURE_MATCH: "Picture-to-Alphabet Match",
  KDG_COUNT_ITEMS: "Count Objects & Write/Match",
  KDG_CIRCLE_TARGET: "Circle Target / Odd One Out",
  KDG_SEQUENCE_CHAIN: "Missing Sequence Chain (Caterpillar/Train)",
};

export function isKindergartenType(type?: string | null): boolean {
  if (!type) return false;
  return (
    type === "KDG_TRACE_WRITE" ||
    type === "KDG_NUMBER_GRID" ||
    type === "KDG_PICTURE_MATCH" ||
    type === "KDG_COUNT_ITEMS" ||
    type === "KDG_CIRCLE_TARGET" ||
    type === "KDG_SEQUENCE_CHAIN" ||
    type.startsWith("KDG_")
  );
}

export function isPrePrimaryClass(className?: string | null): boolean {
  if (!className) return false;
  const order = inferClassOrder(className);
  return order <= 0;
}

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

export function cleanMatchItem(text: string): string {
  if (!text) return "";
  return text
    .replace(/^[\s\u200B]*(\([A-Za-z0-9ivxIVX\u0900-\u097F]{1,6}\)|(?:[A-Za-z]|\d{1,2}|[ivxIVX]{1,4}|[\u0900-\u097F]{1,2})\s*[.)\]:-])\s*/, "")
    .trim();
}

/**
 * Strips redundant leading choice labels ((a), (A), a., 1., iv.) and unescaped LaTeX formatting macros
 * from multiple choice and objective question options without stripping legitimate English words
 * like Observation:, Definition:, Assertion:, Reason:, etc.
 */
export function cleanOptionText(text?: string | null): string {
  if (!text) return "";
  let s = text
    .replace(/^[\s\u200B]*(\([A-Za-z0-9ivxIVX\u0900-\u097F]{1,6}\)|(?:[A-Za-z]|\d{1,2}|[ivxIVX]{1,4}|[\u0900-\u097F]{1,2})\s*[.)\]:-])\s*/, "")
    .trim();
  // Strip raw unescaped LaTeX formatting macros that leaked outside $...$ only if string has no math delimiters
  if (!s.includes("$")) {
    s = s
      .replace(/\\text\{([^}]+)\}/g, "$1")
      .replace(/\\mathrm\{([^}]+)\}/g, "$1")
      .replace(/\\textit\{([^}]+)\}/g, "$1")
      .replace(/\\textbf\{([^}]+)\}/g, "$1")
      .replace(/\\operatorname\{([^}]+)\}/g, "$1");
  }
  return s;
}

/**
 * Splits a string by the first occurrence of one of the delimiters,
 * but ONLY if the delimiter is strictly outside LaTeX math mode ($...$ or $$...$$).
 */
export function splitOutsideMath(str: string, delimiters: string[]): [string, string] | null {
  if (!str) return null;
  let inInline = false;
  let inDisplay = false;
  let i = 0;

  while (i < str.length) {
    if (str.slice(i, i + 2) === "$$") {
      inDisplay = !inDisplay;
      i += 2;
      continue;
    }
    if (str[i] === "$" && !inDisplay && (i === 0 || str[i - 1] !== "\\")) {
      inInline = !inInline;
      i += 1;
      continue;
    }
    if (!inInline && !inDisplay) {
      for (const delim of delimiters) {
        if (str.slice(i, i + delim.length) === delim) {
          return [str.slice(0, i), str.slice(i + delim.length)];
        }
      }
    }
    i++;
  }
  return null;
}

export function extractColumnIItems(text?: string | null): string[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: string[] = [];
  let inColumnI = false;
  let hasExplicitColumnI = false;

  const col1Regex = /\bcolumn\s*(?:i\b|a\b|1\b)|स्तम्भ\s*['"]?(?:अ|1)['"]?|खण्ड\s*['"]?(?:क|1)['"]?/i;
  const col2Regex = /\bcolumn\s*(?:ii\b|b\b|2\b)|स्तम्भ\s*['"]?(?:ब|2)['"]?|खण्ड\s*['"]?(?:ख|2)['"]?/i;

  for (const line of lines) {
    // Check col2 first so 'Column II' is never matched as 'Column I'
    if (col2Regex.test(line)) {
      inColumnI = false;
      if (hasExplicitColumnI) {
        break; // Stop collecting Column I items once Column II is reached
      }
      continue;
    }
    if (col1Regex.test(line)) {
      inColumnI = true;
      hasExplicitColumnI = true;
      continue;
    }

    const isItemLine = /^(\([A-Za-z0-9ivxIVX\u0900-\u097F]+\)|[A-Za-z0-9ivxIVX\u0900-\u097F]+[.)\]:-])\s+/.test(line);
    if (hasExplicitColumnI) {
      if (inColumnI) {
        items.push(cleanMatchItem(line));
      }
    } else if (isItemLine) {
      items.push(cleanMatchItem(line));
    }
  }
  return items;
}

export function extractColumnIIItems(text?: string | null): string[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: string[] = [];
  let inColumnII = false;

  const col2Regex = /\bcolumn\s*(?:ii\b|b\b|2\b)|स्तम्भ\s*['"]?(?:ब|2)['"]?|खण्ड\s*['"]?(?:ख|2)['"]?/i;
  const col1Regex = /\bcolumn\s*(?:i\b|a\b|1\b)|स्तम्भ\s*['"]?(?:अ|1)['"]?|खण्ड\s*['"]?(?:क|1)['"]?/i;

  for (const line of lines) {
    if (col2Regex.test(line)) {
      inColumnII = true;
      continue;
    }
    // If another column header or new section appears, stop
    if (inColumnII && col1Regex.test(line)) {
      break;
    }

    if (inColumnII) {
      const isItemLine = /^(\([A-Za-z0-9ivxIVX\u0900-\u097F]+\)|[A-Za-z0-9ivxIVX\u0900-\u097F]+[.)\]:-])\s+/.test(line);
      if (isItemLine) {
        items.push(cleanMatchItem(line));
      } else if (!line.toLowerCase().startsWith("options") && !line.toLowerCase().startsWith("उत्तर") && !line.toLowerCase().startsWith("answer")) {
        items.push(cleanMatchItem(line));
      }
    }
  }
  return items;
}

export function getMatchColumnInstruction(text?: string | null): string {
  if (!text) return "Match the items in Column I with Column II:";
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "Match the items in Column I with Column II:";

  const colHeaderRegex = /\bcolumn\s*(?:i\b|a\b|1\b)|स्तम्भ\s*['"]?(?:अ|1)['"]?|खण्ड\s*['"]?(?:क|1)['"]?/i;
  const instructionLines: string[] = [];
  for (const line of lines) {
    if (
      colHeaderRegex.test(line) ||
      /^(\([A-Za-z0-9ivxIVX\u0900-\u097F]+\)|[A-Za-z0-9ivxIVX\u0900-\u097F]+[.)\]:-])\s+/.test(line)
    ) {
      break;
    }
    instructionLines.push(line);
  }
  const result = instructionLines.join(" ").trim();
  return result || lines[0];
}

export function serializeMatchColumnPair(left: string, right: string): string {
  return `${left.trim()} ||| ${right.trim()}`;
}

export function parseMatchColumnPairs(
  options: string[] = [],
  questionText?: string | null,
  explanation?: string | null,
): MatchColumnPair[] {
  const opts = Array.isArray(options) ? options : [];

  // Dedicated pair delimiters including equals, colons, and arrows
  const PAIR_DELIMITERS = [" ||| ", "|||", " :: ", "::", " : ", ": ", " → ", "→", " -> ", "->", " = ", "=", " - "];

  // 1. Explicit serialized pairs with triple pipes (e.g. from QuestionForm)
  const hasTriplePipe = opts.some((opt) => typeof opt === "string" && opt.includes("|||"));
  if (hasTriplePipe) {
    return opts
      .map((opt) => {
        const parts = splitOutsideMath(String(opt), [" ||| ", "|||"]);
        if (parts) {
          return { left: cleanMatchItem(parts[0]), right: cleanMatchItem(parts[1]) };
        }
        return { left: cleanMatchItem(String(opt)), right: "" };
      })
      .filter((p) => p.left || p.right);
  }

  // 2. Check if options themselves are paired strings with other standard delimiters
  const hasDelimitedOptions = opts.some((opt) => {
    if (typeof opt !== "string") return false;
    // Don't treat MCQ combination strings like "(a) A-ii, B-i" as pairs
    if (/^[A-D]\s*[-=]\s*|\([a-d]\)\s*[A-Z]-/i.test(opt.trim())) return false;
    return splitOutsideMath(opt, PAIR_DELIMITERS) !== null;
  });

  if (hasDelimitedOptions) {
    return opts
      .map((opt) => {
        const str = String(opt);
        const parts = splitOutsideMath(str, PAIR_DELIMITERS);
        if (parts) {
          return { left: cleanMatchItem(parts[0]), right: cleanMatchItem(parts[1]) };
        }
        return { left: cleanMatchItem(str), right: "" };
      })
      .filter((p) => p.left || p.right);
  }

  // 3. Check if question text defines Column I and/or Column II items
  const colIItems = questionText ? extractColumnIItems(questionText) : [];
  const colIIItems = questionText ? extractColumnIIItems(questionText) : [];

  // 3a. Both Column I and Column II extracted directly from text
  if (colIItems.length > 0 && colIIItems.length > 0) {
    const maxLen = Math.max(colIItems.length, colIIItems.length);
    const pairs: MatchColumnPair[] = [];
    for (let i = 0; i < maxLen; i++) {
      pairs.push({
        left: colIItems[i] ?? "",
        right: colIIItems[i] ?? "",
      });
    }
    return pairs;
  }

  // 3b. Column I in text, Column II provided in options
  if (colIItems.length > 0 && opts.length > 0) {
    // Check if options are MCQ match combination strings like "(a) A-ii, B-i"
    const isMcqOptions = opts.every((opt) => /^[A-D]\s*[-=]\s*|\([a-d]\)\s*[A-Z]-/i.test(String(opt).trim()));
    if (!isMcqOptions) {
      const maxLen = Math.max(colIItems.length, opts.length);
      const pairs: MatchColumnPair[] = [];
      for (let i = 0; i < maxLen; i++) {
        pairs.push({
          left: colIItems[i] ?? `Item ${i + 1}`,
          right: opts[i] !== undefined ? cleanMatchItem(String(opts[i])) : "",
        });
      }
      return pairs;
    }
  }

  // 4. Fallback if options was empty but text had Column I
  if (colIItems.length > 0) {
    return colIItems.map((item) => ({
      left: item,
      right: "",
    }));
  }

  // 5. Intelligent Fallback: Check if explanation contains matching pairs
  // e.g. "(A) \int ... = sin^-1(x/a) + C, which matches (iv). (B) \int ... = ..."
  if (explanation) {
    const recovered = extractMatchPairsFromExplanation(explanation);
    if (recovered.length > 0) {
      return recovered;
    }
  }

  // 6. Intelligent Fallback: Check if questionText has embedded pairing statements
  if (questionText) {
    const recoveredFromText = extractMatchPairsFromExplanation(questionText);
    if (recoveredFromText.length > 0) {
      return recoveredFromText;
    }
  }

  return [];
}

/**
 * Extracts matching pairs from unstructured explanation or free-text solution breakdowns.
 * Supports patterns like:
 *   "(A) Left concept = Right definition, which matches (iv)"
 *   "(A) Formula -> Evaluated expression"
 *   "(1) Item A :: Definition A"
 */
export function extractMatchPairsFromExplanation(explanation?: string | null): MatchColumnPair[] {
  if (!explanation) return [];
  const text = String(explanation).trim();
  if (!text) return [];

  // Match items starting with (A), (B), (C), (D) or A., B., C., D. or (1), (2), (3), (4)
  const regex = /(?:^|\s|\n)(?:\(([A-Da-d1-6])\)|([A-Da-d1-6])[.)\]:])\s+([^\n\r]+?)(?=(?:(?:\s|\n)(?:\([A-Da-d1-6]\)|[A-Da-d1-6][.)\]:])\s+)|$)/g;
  const matches = [...text.matchAll(regex)];

  if (matches.length >= 2) {
    const pairs: MatchColumnPair[] = [];
    for (const m of matches) {
      const full = m[3].trim();
      // Try to split on '=' or 'which matches' or 'matches' or '->' or '::' or 'corresponds to'
      const splitPoint = full.match(/\s*(?:which matches|matches|corresponds to|=|->|→|::)\s*/i);
      if (splitPoint && splitPoint.index !== undefined && splitPoint.index > 0) {
        const left = full.substring(0, splitPoint.index).trim();
        let right = full.substring(splitPoint.index + splitPoint[0].length).trim();
        // Strip trailing match indicators like ", which matches (iv)" or " (iv)" or trailing periods
        right = right.replace(/,?\s*(?:which matches|matches|corresponds to)\s*\(?[ivx0-9]+\)?[\s.]*$/i, "").trim();
        right = right.replace(/\.\s*$/, "").trim();
        if (left && right) {
          pairs.push({ left: cleanMatchItem(left), right: cleanMatchItem(right) });
        }
      }
    }
    if (pairs.length >= 2) {
      return pairs;
    }
  }

  return [];
}

/**
 * Permutes Column B items across matching pairs so that no answer is displayed
 * directly adjacent to its corresponding Column A item, eliminating answer leakage.
 * Generates the strictly mapped answer key string.
 */
export type DerangedMatchColumnResult = MatchColumnPair[] & {
  pairs: MatchColumnPair[];
  answerKey: string;
};

export function derangeMatchColumnPairs(pairs: MatchColumnPair[]): DerangedMatchColumnResult {
  if (!pairs || pairs.length <= 1) {
    const list = pairs || [];
    const res = [...list] as DerangedMatchColumnResult;
    res.pairs = list;
    res.answerKey = list && list.length === 1 ? "(A) → (i)" : "";
    return res;
  }

  const n = pairs.length;
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const romans = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];

  // Derangement mapping: target column B index for left[i] is (i + 1) % n
  // Therefore column B at position j contains the answer for item (j - 1 + n) % n
  const derangedPairs: MatchColumnPair[] = pairs.map((pair, j) => {
    const origSourceIdx = (j - 1 + n) % n;
    return {
      left: pair.left,
      right: pairs[origSourceIdx].right,
    };
  });

  const keyParts = pairs.map((_, i) => {
    const targetColBIdx = (i + 1) % n;
    const colALabel = `(${letters[i] ?? i + 1})`;
    const colBLabel = romans[targetColBIdx] ?? `(${targetColBIdx + 1})`;
    return `${colALabel} → ${colBLabel}`;
  });

  const result = [...derangedPairs] as DerangedMatchColumnResult;
  result.pairs = derangedPairs;
  result.answerKey = keyParts.join(", ");
  return result;
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
  // 1. Primary Source of Truth: Blueprint
  if (paper.blueprint?.examType && (EXAM_TYPES as readonly string[]).includes(paper.blueprint.examType)) {
    return paper.blueprint.examType as ExamType;
  }
  // 2. Direct paper field (for standalone papers or during initial paper import)
  if (paper.examType && (EXAM_TYPES as readonly string[]).includes(paper.examType)) {
    return paper.examType as ExamType;
  }
  // 3. Fallback inference from title only if neither blueprint nor paper record has an exam type
  const inferred = inferExamTypeFromText(paper.title);
  if (inferred) return inferred;

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
        optionText: options[idx] ? cleanOptionText(options[idx]) : undefined,
        display: `(${upper})`,
      };
    }
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num >= 1 && num <= MCQ_LETTERS.length) {
      const letter = MCQ_LETTERS[num - 1];
      return {
        letter,
        optionText: options[num - 1] ? cleanOptionText(options[num - 1]) : undefined,
        display: `(${letter})`,
      };
    }
  }

  // Check if answer starts with a choice prefix like "(b) \text{cry}1\text{Ab}" or "(b) cry1Ab" or "b) cry1Ab"
  const prefixMatch =
    trimmed.match(/^[\s\u200B]*\(([a-zA-Z0-9])\)\s*(.*)$/) ||
    trimmed.match(/^[\s\u200B]*([a-zA-Z0-9])[.)\]:-]\s+(.*)$/);
  if (prefixMatch) {
    const candidateLetter = prefixMatch[1].toUpperCase();
    const idx = MCQ_LETTERS.indexOf(candidateLetter);
    if (idx >= 0) {
      return {
        letter: candidateLetter,
        optionText: options[idx] ? cleanOptionText(options[idx]) : cleanOptionText(prefixMatch[2]),
        display: `(${candidateLetter})`,
      };
    }
  }

  // Match against option text
  const cleanTrimmed = cleanOptionText(trimmed).toLowerCase();
  const matchIdx = options.findIndex((o) => cleanOptionText(o).trim().toLowerCase() === cleanTrimmed);
  if (matchIdx >= 0 && matchIdx < MCQ_LETTERS.length) {
    const letter = MCQ_LETTERS[matchIdx];
    return {
      letter,
      optionText: cleanOptionText(options[matchIdx]),
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
  if (numberingStyle === "SECTION_RELATIVE" && sectionLetter) {
    const sIdx = sectionIndex != null ? (sectionIndex === 0 ? 1 : sectionIndex) : num;
    return `${sectionLetter}${sIdx}.`;
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

export function inferClassOrder(name: string): number {
  const lower = name.trim().toLowerCase();
  if (lower.includes("playgroup") || lower.includes("pre-nursery") || lower.includes("prenursery")) return -3;
  if (lower.includes("nursery")) return -2;
  if (
    lower.includes("lkg") ||
    lower.includes("l.k.g") ||
    lower.includes("kg 1") ||
    lower.includes("kg-1") ||
    lower.includes("kg1") ||
    lower.includes("kg i") ||
    lower.includes("lower kg") ||
    lower.includes("pp-1") ||
    lower.includes("pp1")
  ) {
    return -1;
  }
  if (
    lower.includes("ukg") ||
    lower.includes("u.k.g") ||
    lower.includes("kg 2") ||
    lower.includes("kg-2") ||
    lower.includes("kg2") ||
    lower.includes("kg ii") ||
    lower.includes("upper kg") ||
    lower.includes("pp-2") ||
    lower.includes("pp2")
  ) {
    return 0;
  }
  const numMatch = lower.match(/\b(1[0-2]|[1-9])\b/);
  if (numMatch) return Number(numMatch[1]);
  // Roman numeral fallback
  const romanMap: Array<[RegExp, number]> = [
    [/\bxii\b/, 12],
    [/\bxi\b/, 11],
    [/\bx\b/, 10],
    [/\bix\b/, 9],
    [/\bviii\b/, 8],
    [/\bvii\b/, 7],
    [/\bvi\b/, 6],
    [/\bv\b/, 5],
    [/\biv\b/, 4],
    [/\biii\b/, 3],
    [/\bii\b/, 2],
    [/\bi\b/, 1],
  ];
  for (const [re, val] of romanMap) {
    if (re.test(lower)) return val;
  }
  return 99;
}

export function sortClassNames(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const orderA = inferClassOrder(a);
    const orderB = inferClassOrder(b);
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  });
}

