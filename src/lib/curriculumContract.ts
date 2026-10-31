import {
  derangeMatchColumnPairs,
  QUESTION_TYPES,
  type QuestionType,
  serializeMatchColumnPair,
} from "./constants";
import { isSectionVisuallyEligible, isSubjectChapterVisual } from "./diagram-rules";
import {
  resolveInternalChoiceRequirement,
  type InternalChoiceRequirement,
} from "./internalChoiceRules";
import { getCanonicalSubjectName, getStandardPresetForClass } from "./schoolCurriculum";
import { normalizeSubpartMarks, type SubPart } from "./types";

export type SupportedBoard = "MPBSE" | "CBSE" | "FOUNDATIONAL" | "STATE_BOARD";

export interface ChapterCurriculumSpec {
  chapterTitle: string;
  canonicalSubject: string;
  includedTopics: string[];
  deletedTopics: string[];
  keyFormulasOrConcepts: string[];
  sampleMcqs: Array<{
    text: string;
    options: [string, string, string, string];
    answer: string;
    explanation: string;
  }>;
  sampleFillBlanks: Array<{
    text: string;
    answer: string;
    explanation: string;
  }>;
  sampleTrueFalse: Array<{
    text: string;
    answer: "True" | "False";
    explanation: string;
  }>;
  sampleMatchPairs: Array<{
    left: string;
    right: string;
  }>;
  sampleVeryShort: Array<{
    text: string;
    answer: string;
  }>;
  sampleShort: Array<{
    text: string;
    answer: string;
  }>;
  sampleLong: Array<{
    text: string;
    answer: string;
  }>;
  sampleAssertionReason?: {
    assertion: string;
    reason: string;
    correctOptionIndex: 0 | 1 | 2 | 3;
    explanation: string;
  };
  sampleCaseStudy?: {
    passage: string;
    subparts: Array<{ label: string; text: string; marks: number; answer: string }>;
  };
}

export interface GenerationSlotContract {
  slotIndex: number;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  marks: number;
  requiresInternalChoice?: boolean;
  internalChoiceRequirement?: InternalChoiceRequirement;
  curriculumSpec: ChapterCurriculumSpec;
}

export interface GenerationContract {
  contractId: string;
  board: SupportedBoard;
  boardDisplayName: string;
  classId: string;
  className: string;
  academicSession: string;
  syllabusVersion: string;
  examType: string;
  bookId: string;
  subjectId: string;
  rawSubject: string;
  canonicalSubject: string;
  subjectCode: string;
  questionType: QuestionType;
  marksEach: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "BALANCED";
  language: "en" | "hi" | "sa" | "bilingual";
  requiredCount: number;
  sectionTitle: string;
  sectionInstructions?: string;
  internalChoiceRequirement: InternalChoiceRequirement;
  slots: GenerationSlotContract[];
  forbiddenCrossSubjectDomains: string[];
  provenance: {
    board: SupportedBoard;
    session: string;
    syllabusVersion: string;
    subjectCode: string;
    canonicalSubject: string;
    examinationPatternVersion?: string;
    circularReference?: string;
  };
}

export interface GenerationContractValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  contract?: GenerationContract;
}

const MPBSE_SENIOR_CODES: Record<string, string> = {
  Hindi: "051",
  English: "052",
  Sanskrit: "053",
  History: "110",
  "Political Science": "120",
  Geography: "130",
  Economics: "140",
  Mathematics: "150",
  Psychology: "163",
  Sociology: "165",
  Physics: "210",
  Chemistry: "220",
  Biology: "231",
  "Informatics Practices": "265",
  "Computer Science": "283",
  "Business Studies": "310",
  Accountancy: "320",
};

const MPBSE_SECONDARY_CODES: Record<string, string> = {
  Hindi: "401",
  English: "411",
  Sanskrit: "512",
  Mathematics: "100",
  Science: "200",
  "Social Science": "300",
};

const CBSE_SENIOR_CODES: Record<string, string> = {
  English: "301",
  Hindi: "302",
  Mathematics: "041",
  Physics: "042",
  Chemistry: "043",
  Biology: "044",
  Accountancy: "055",
  "Business Studies": "054",
  Economics: "030",
  History: "027",
  "Political Science": "028",
  Geography: "029",
  "Computer Science": "083",
  "Informatics Practices": "065",
  Psychology: "037",
  Sociology: "039",
};

const CBSE_SECONDARY_CODES: Record<string, string> = {
  English: "184",
  Hindi: "002",
  Sanskrit: "122",
  Mathematics: "041",
  Science: "086",
  "Social Science": "087",
  "Computer Science": "165",
};

/**
 * Detects the education board from explicit board input, school name, blueprint name, or section structure.
 */
export function detectEducationBoard(params: {
  board?: string | null;
  schoolName?: string | null;
  blueprintName?: string | null;
  className?: string | null;
  subject?: string | null;
  subjectCode?: string | null;
  sectionTitles?: string[];
  sectionInstructions?: string[];
}): SupportedBoard {
  const combined = [
    params.board || "",
    params.schoolName || "",
    params.blueprintName || "",
    ...(params.sectionTitles || []),
    ...(params.sectionInstructions || []),
  ]
    .join(" ")
    .toLowerCase();

  if (
    combined.includes("mpbse") ||
    combined.includes("mp board") ||
    combined.includes("madhya pradesh") ||
    combined.includes("bhopal") ||
    combined.includes("lakhnadon") ||
    combined.includes("sarvodaya") ||
    combined.includes("32 objective") ||
    combined.includes("question nos. 1 to 5: total 32")
  ) {
    return "MPBSE";
  }

  const classLower = (params.className || "").toLowerCase();
  if (
    combined.includes("foundational") ||
    classLower.includes("nursery") ||
    classLower.includes("lkg") ||
    classLower.includes("ukg")
  ) {
    return "FOUNDATIONAL";
  }

  if (combined.includes("state board")) {
    return "STATE_BOARD";
  }

  return "CBSE";
}

/**
 * Resolves the authoritative subject code for a given board, class, and subject.
 * Prevents hardcoded CBSE Math ("041") or Science ("086") codes from leaking into other subjects or boards.
 */
export function resolveBoardAndSubjectCode(params: {
  board?: string | null;
  schoolName?: string | null;
  blueprintName?: string | null;
  className?: string | null;
  subject?: string | null;
  subjectCode?: string | null;
  explicitSubjectCode?: string | null;
  academicSession?: string | null;
  sectionTitles?: string[];
  sectionInstructions?: string[];
}): { board: SupportedBoard; boardDisplayName: string; canonicalSubject: string; subjectCode: string } {
  const effectiveSubjectCode = params.subjectCode || params.explicitSubjectCode;
  const board = detectEducationBoard({ ...params, subjectCode: effectiveSubjectCode });
  const canonicalSubject = getCanonicalSubjectName(params.subject || "") || (params.subject || "").trim() || "General";
  const className = (params.className || "Class 10").trim();
  const isSenior = /\b(11|12|xi|xii)\b/i.test(className);
  const isSecondary = /\b(9|10|ix|x)\b/i.test(className) && !isSenior;

  let expectedCode = "";
  if (board === "MPBSE") {
    if (isSenior) {
      expectedCode = MPBSE_SENIOR_CODES[canonicalSubject] || "";
    } else if (isSecondary) {
      expectedCode = MPBSE_SECONDARY_CODES[canonicalSubject] || "";
    }
  }

  if (!expectedCode) {
    if (isSenior && CBSE_SENIOR_CODES[canonicalSubject]) {
      expectedCode = CBSE_SENIOR_CODES[canonicalSubject];
    } else if (isSecondary && CBSE_SECONDARY_CODES[canonicalSubject]) {
      expectedCode = CBSE_SECONDARY_CODES[canonicalSubject];
    } else {
      const preset = getStandardPresetForClass(className);
      const matched = preset?.subjects.find(
        (s) => getCanonicalSubjectName(s.name).toLowerCase() === canonicalSubject.toLowerCase(),
      );
      if (matched) expectedCode = matched.code;
    }
  }

  const rawCode = (effectiveSubjectCode || "").trim();
  let resolvedCode = rawCode;

  // Detect if rawCode is a leaked default ("041" on non-Math or MPBSE, or "086" on non-Science)
  const isLeakedCbseMathCode =
    rawCode === "041" && (canonicalSubject !== "Mathematics" || board === "MPBSE");
  const isLeakedCbseScienceCode =
    rawCode === "086" && (canonicalSubject !== "Science" || board === "MPBSE");

  if (!resolvedCode || isLeakedCbseMathCode || isLeakedCbseScienceCode) {
    resolvedCode = expectedCode || rawCode || "GEN";
  }

  const boardDisplayName =
    board === "MPBSE"
      ? "Board of Secondary Education, Madhya Pradesh (MPBSE)"
      : board === "FOUNDATIONAL"
      ? "Foundational Early Years (NCF-FS)"
      : board === "STATE_BOARD"
      ? "State Board of Secondary Education"
      : "Central Board of Secondary Education (CBSE / NCERT)";

  return {
    board,
    boardDisplayName,
    canonicalSubject,
    subjectCode: resolvedCode,
  };
}

/**
 * Cleans bilingual and part-tagged chapter titles (e.g., "[Part I] 1. Relations and Functions (संबंध एवं फलन)")
 * into a clean English base title for curriculum lookup while preserving the original title for display.
 */
export function cleanChapterTitleForLookup(rawTitle: string): string {
  return rawTitle
    .replace(/^\[Part\s+[I12V]+\]\s*/i, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\s*\([\u0900-\u097F\sA-Za-z,&\-]+\)\s*$/, "")
    .trim();
}

/**
 * Authoritative Class 12 Mathematics Curriculum Registry (MPBSE & NCERT Rationalized 2025–26 / 2026–27).
 */
const CLASS_12_MATH_CHAPTER_SPECS: Record<string, Omit<ChapterCurriculumSpec, "chapterTitle" | "canonicalSubject">> = {
  "relations and functions": {
    includedTopics: [
      "Types of relations: reflexive, symmetric, transitive, and equivalence relations",
      "One-to-one (injective) and onto (surjective) functions, bijective functions",
      "Domain, co-domain, and range of real-valued functions",
    ],
    deletedTopics: [
      "Composite functions and inverse of a general function (unless simple bijection check)",
      "Binary operations",
    ],
    keyFormulasOrConcepts: [
      "Equivalence relation R satisfies (a,a) in R, (a,b) in R => (b,a) in R, and (a,b),(b,c) in R => (a,c) in R",
      "Number of reflexive relations on a set with n elements is 2^(n(n-1))",
      "A function f: A -> B is bijective iff it is both injective (f(x1)=f(x2) => x1=x2) and surjective (range = B)",
    ],
    sampleMcqs: [
      {
        text: "Let $A = \\{1, 2, 3\\}$. The number of equivalence relations containing $(1, 2)$ on set $A$ is:",
        options: ["1", "2", "3", "4"],
        answer: "2",
        explanation: "The only equivalence relations on {1,2,3} containing (1,2) are {{1,2},{3}} and the universal relation A x A, so there are 2.",
      },
      {
        text: "If $f: \\mathbb{R} \\to \\mathbb{R}$ is defined by $f(x) = 3x - 4$, then $f$ is:",
        options: [
          "One-one and onto (bijective)",
          "One-one but not onto",
          "Onto but not one-one",
          "Neither one-one nor onto",
        ],
        answer: "One-one and onto (bijective)",
        explanation: "For any x1, x2 in R, 3x1 - 4 = 3x2 - 4 => x1 = x2 (one-one), and for every y in R, x = (y+4)/3 in R satisfies f(x) = y (onto).",
      },
    ],
    sampleFillBlanks: [
      {
        text: "A relation $R$ on a non-empty set $A$ is called an ________ relation if it is reflexive, symmetric, and transitive.",
        answer: "equivalence",
        explanation: "By definition, a relation that is simultaneously reflexive, symmetric, and transitive is an equivalence relation.",
      },
      {
        text: "The total number of injective (one-one) functions from a set $A$ with $3$ elements to itself is ________.",
        answer: "6",
        explanation: "The number of bijections/injections from a finite set of size n=3 to itself is 3! = 6.",
      },
    ],
    sampleTrueFalse: [
      {
        text: "Every identity relation on a non-empty set $A$ is an equivalence relation.",
        answer: "True",
        explanation: "The identity relation I_A = {(a,a) : a in A} is reflexive, symmetric, and transitive.",
      },
      {
        text: "The function $f: \\mathbb{N} \\to \\mathbb{N}$ given by $f(x) = 2x$ is an onto (surjective) function.",
        answer: "False",
        explanation: "Odd natural numbers have no pre-image in N under f(x) = 2x, so f is not onto.",
      },
    ],
    sampleMatchPairs: [
      { left: "Number of reflexive relations on a set of $n$ elements", right: "$2^{n(n-1)}$" },
      { left: "Condition for $f: A \\to B$ to be injective", right: "$f(x_1) = f(x_2) \\implies x_1 = x_2$" },
    ],
    sampleVeryShort: [
      {
        text: "State the condition under which a relation $R$ on a set $A$ is said to be symmetric.",
        answer: "Model Answer: A relation $R$ on set $A$ is symmetric if $(a, b) \\in R \\implies (b, a) \\in R$ for all $a, b \\in A$.",
      },
    ],
    sampleShort: [
      {
        text: "Show that the relation $R$ in the set $\\mathbb{Z}$ of integers given by $R = \\{(a, b) : 2 \\text{ divides } (a - b)\\}$ is an equivalence relation.",
        answer: "Model Answer: 1. Reflexive: $a - a = 0$ is divisible by $2$, so $(a,a) \\in R$. 2. Symmetric: If $2 \\mid (a - b)$, then $2 \\mid (b - a)$, so $(b,a) \\in R$. 3. Transitive: If $2 \\mid (a - b)$ and $2 \\mid (b - c)$, their sum $(a - c)$ is divisible by $2$, so $(a,c) \\in R$. Hence $R$ is an equivalence relation.",
      },
      {
        text: "Check whether the relation $R$ defined in the set $\\{1, 2, 3, 4, 5, 6\\}$ as $R = \\{(a, b) : b = a + 1\\}$ is reflexive, symmetric, or transitive.",
        answer: "Model Answer: 1. Not reflexive since $(a, a) \\notin R$ as $a \\neq a + 1$. 2. Not symmetric since $(1, 2) \\in R$ but $(2, 1) \\notin R$. 3. Not transitive since $(1, 2) \\in R$ and $(2, 3) \\in R$ but $(1, 3) \\notin R$.",
      },
    ],
    sampleLong: [
      {
        text: "Let $A = \\mathbb{R} - \\{3\\}$ and $B = \\mathbb{R} - \\{1\\}$. Consider the function $f: A \\to B$ defined by $f(x) = \\frac{x - 2}{x - 3}$. Prove that $f$ is one-one and onto.",
        answer: "Model Answer: 1. One-one: Let $f(x_1) = f(x_2) \\implies \\frac{x_1 - 2}{x_1 - 3} = \\frac{x_2 - 2}{x_2 - 3} \\implies (x_1 - 2)(x_2 - 3) = (x_2 - 2)(x_1 - 3) \\implies x_1 = x_2$. Thus $f$ is one-one. [2 Marks]\n2. Onto: Let $y \\in B = \\mathbb{R} - \\{1\\}$. Solving $y = \\frac{x - 2}{x - 3}$ gives $x = \\frac{3y - 2}{y - 1} \\in A$. Since $f(x) = y$ for every $y \\in B$, $f$ is onto. [2 Marks]",
      },
      {
        text: "Show that the relation $R$ in the set $A = \\{x \\in \\mathbb{Z} : 0 \\le x \\le 12\\}$ given by $R = \\{(a, b) : |a - b| \\text{ is a multiple of } 4\\}$ is an equivalence relation. Find the set of all elements related to $1$.",
        answer: "Model Answer: 1. Reflexive: $|a - a| = 0$ is a multiple of $4$. [1 Mark]\n2. Symmetric: $|a - b| = |b - a|$ is a multiple of $4$. [1 Mark]\n3. Transitive: $a - c = (a - b) + (b - c)$ is a multiple of $4$. [1 Mark]\n4. Elements related to $1$ are $\\{1, 5, 9\\}$. [1 Mark]",
      },
    ],
  },
  "inverse trigonometric functions": {
    includedTopics: [
      "Definition, domain, and principal value branch of inverse trigonometric functions",
      "Graphs of sin^-1 x, cos^-1 x, tan^-1 x, cot^-1 x, sec^-1 x, cosec^-1 x",
      "Evaluation of principal values and simplification using standard trigonometric substitutions",
    ],
    deletedTopics: ["Elementary two-variable addition properties of inverse trigonometric functions"],
    keyFormulasOrConcepts: [
      "Principal value branch of sin^-1 x is [-pi/2, pi/2] and cos^-1 x is [0, pi]",
      "Principal value branch of tan^-1 x is (-pi/2, pi/2) and cot^-1 x is (0, pi)",
      "cos^-1(-x) = pi - cos^-1(x) and sin^-1(-x) = -sin^-1(x) for x in [-1, 1]",
    ],
    sampleMcqs: [
      {
        text: "The principal value of $\\cos^{-1}\\left(-\\frac{1}{2}\\right)$ is:",
        options: ["$\\frac{2\\pi}{3}$", "$\\frac{\\pi}{3}$", "$-\\frac{\\pi}{3}$", "$\\frac{4\\pi}{3}$"],
        answer: "$\\frac{2\\pi}{3}$",
        explanation: "Using cos^-1(-x) = pi - cos^-1(x), we get pi - pi/3 = 2pi/3, which lies in [0, pi].",
      },
      {
        text: "The principal value branch (range) of $\\sin^{-1} x$ is:",
        options: [
          "$\\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right]$",
          "$[0, \\pi]$",
          "$\\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right)$",
          "$(0, \\pi)$",
        ],
        answer: "$\\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right]$",
        explanation: "The standard principal value range of sin^-1 x is the closed interval [-pi/2, pi/2].",
      },
    ],
    sampleFillBlanks: [
      {
        text: "The principal value of $\\tan^{-1}(\\sqrt{3}) - \\sec^{-1}(-2)$ is ________.",
        answer: "$-\\frac{\\pi}{3}$",
        explanation: "tan^-1(sqrt(3)) = pi/3 and sec^-1(-2) = 2pi/3, so pi/3 - 2pi/3 = -pi/3.",
      },
    ],
    sampleTrueFalse: [
      {
        text: "The domain of the function $y = \\sin^{-1} x$ is the closed interval $[-1, 1]$.",
        answer: "True",
        explanation: "sin^-1 x is defined for all real x satisfying -1 <= x <= 1.",
      },
    ],
    sampleMatchPairs: [
      { left: "Principal value range of $\\cos^{-1} x$", right: "$[0, \\pi]$" },
      { left: "Principal value range of $\\tan^{-1} x$", right: "$\\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right)$" },
    ],
    sampleVeryShort: [
      {
        text: "Find the principal value of $\\sin^{-1}\\left(-\\frac{1}{\\sqrt{2}}\\right)$.",
        answer: "Model Answer: $\\sin^{-1}\\left(-\\frac{1}{\\sqrt{2}}\\right) = -\\sin^{-1}\\left(\\frac{1}{\\sqrt{2}}\\right) = -\\frac{\\pi}{4} \\in \\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right]$.",
      },
    ],
    sampleShort: [
      {
        text: "Write the function $\\tan^{-1}\\left(\\frac{\\sqrt{1+x^2}-1}{x}\\right), x \\neq 0$, in the simplest form.",
        answer: "Model Answer: Put $x = \\tan\\theta \\implies \\theta = \\tan^{-1} x$. Then $\\frac{\\sqrt{1+\\tan^2\\theta}-1}{\\tan\\theta} = \\frac{\\sec\\theta - 1}{\\tan\\theta} = \\frac{1 - \\cos\\theta}{\\sin\\theta} = \\tan\\left(\\frac{\\theta}{2}\\right)$. Hence the expression simplifies to $\\frac{1}{2}\\tan^{-1} x$.",
      },
      {
        text: "Find the value of $\\tan^{-1}(1) + \\cos^{-1}\\left(-\\frac{1}{2}\\right) + \\sin^{-1}\\left(-\\frac{1}{2}\\right)$.",
        answer: "Model Answer: $\\tan^{-1}(1) = \\frac{\\pi}{4}$, $\\cos^{-1}\\left(-\\frac{1}{2}\\right) = \\pi - \\frac{\\pi}{3} = \\frac{2\\pi}{3}$, and $\\sin^{-1}\\left(-\\frac{1}{2}\\right) = -\\frac{\\pi}{6}$. Sum $= \\frac{\\pi}{4} + \\frac{2\\pi}{3} - \\frac{\\pi}{6} = \\frac{3\\pi}{4}$.",
      },
    ],
    sampleLong: [
      {
        text: "Evaluate $\\tan^{-1}\\left[2\\cos\\left(2\\sin^{-1}\\frac{1}{2}\\right)\\right]$ and state the domain and principal range of $\\tan^{-1} x$.",
        answer: "Model Answer: Since $\\sin^{-1}(1/2) = \\frac{\\pi}{6}$, we have $2\\sin^{-1}(1/2) = \\frac{\\pi}{3}$. Next, $2\\cos(\\pi/3) = 2 \\times \\frac{1}{2} = 1$. Therefore, $\\tan^{-1}(1) = \\frac{\\pi}{4}$. Domain of $\\tan^{-1}x$ is $\\mathbb{R}$ and principal value range is $(-\\pi/2, \\pi/2)$.",
      },
      {
        text: "Prove that $\\tan^{-1}\\left(\\frac{\\cos x}{1 - \\sin x}\\right) = \\frac{\\pi}{4} + \\frac{x}{2}$, where $-\\frac{\\pi}{2} < x < \\frac{\\pi}{2}$.",
        answer: "Model Answer: 1. Write $\\cos x = \\cos^2(x/2) - \\sin^2(x/2)$ and $1 - \\sin x = (\\cos(x/2) - \\sin(x/2))^2$. [1.5 Marks]\n2. Simplify fraction to $\\frac{\\cos(x/2) + \\sin(x/2)}{\\cos(x/2) - \\sin(x/2)} = \\tan\\left(\\frac{\\pi}{4} + \\frac{x}{2}\\right)$. [1.5 Marks]\n3. Hence $\\tan^{-1}\\left(\\tan\\left(\\frac{\\pi}{4} + \\frac{x}{2}\\right)\\right) = \\frac{\\pi}{4} + \\frac{x}{2}$. [1 Mark]",
      },
    ],
  },
  matrices: {
    includedTopics: [
      "Order, equality, and types of matrices (row, column, diagonal, scalar, identity, zero)",
      "Matrix addition, scalar multiplication, and matrix multiplication",
      "Transpose of a matrix, symmetric and skew-symmetric matrices",
      "Invertible matrices and uniqueness of inverse",
    ],
    deletedTopics: ["Elementary row and column transformations to find inverse"],
    keyFormulasOrConcepts: [
      "(AB)^T = B^T A^T and (AB)^(-1) = B^(-1) A^(-1)",
      "Every square matrix A can be uniquely expressed as P + Q where P = 1/2(A + A^T) is symmetric and Q = 1/2(A - A^T) is skew-symmetric",
      "Diagonal elements of a skew-symmetric matrix are all 0",
    ],
    sampleMcqs: [
      {
        text: "If $A$ is a square matrix such that $A^2 = A$, then $(I + A)^3 - 7A$ is equal to:",
        options: ["$I$", "$A$", "$I - A$", "$3A$"],
        answer: "$I$",
        explanation: "(I + A)^3 - 7A = I^3 + 3A + 3A^2 + A^3 - 7A = I + 3A + 3A + A - 7A = I.",
      },
      {
        text: "If a matrix has $18$ elements, what is the total number of possible orders it can have?",
        options: ["6", "4", "3", "8"],
        answer: "6",
        explanation: "The factors of 18 give the possible orders: 1x18, 18x1, 2x9, 9x2, 3x6, 6x3 (total 6).",
      },
    ],
    sampleFillBlanks: [
      {
        text: "All main diagonal elements of a skew-symmetric matrix are always equal to ________.",
        answer: "0",
        explanation: "For a skew-symmetric matrix, a_ii = -a_ii => 2a_ii = 0 => a_ii = 0.",
      },
    ],
    sampleTrueFalse: [
      {
        text: "For any two conformable matrices $A$ and $B$, $(AB)^T = B^T A^T$.",
        answer: "True",
        explanation: "The reversal law of transpose states that the transpose of a product is the product of transposes in reverse order.",
      },
    ],
    sampleMatchPairs: [
      { left: "Symmetric matrix condition", right: "$A^T = A$" },
      { left: "Skew-symmetric matrix condition", right: "$A^T = -A$" },
    ],
    sampleVeryShort: [
      {
        text: "Construct a $2 \\times 2$ matrix $A = [a_{ij}]$ whose elements are given by $a_{ij} = \\frac{(i + j)^2}{2}$.",
        answer: "Model Answer: $a_{11} = 2, a_{12} = \\frac{9}{2}, a_{21} = \\frac{9}{2}, a_{22} = 8$. Thus $A = \\begin{bmatrix} 2 & 9/2 \\\\ 9/2 & 8 \\end{bmatrix}$.",
      },
    ],
    sampleShort: [
      {
        text: "Express the matrix $A = \\begin{bmatrix} 3 & 5 \\\\ 1 & -1 \\end{bmatrix}$ as the sum of a symmetric and a skew-symmetric matrix.",
        answer: "Model Answer: Let $P = \\frac{1}{2}(A + A^T) = \\begin{bmatrix} 3 & 3 \\\\ 3 & -1 \\end{bmatrix}$ (symmetric) and $Q = \\frac{1}{2}(A - A^T) = \\begin{bmatrix} 0 & 2 \\\\ -2 & 0 \\end{bmatrix}$ (skew-symmetric). Then $P + Q = A$.",
      },
    ],
    sampleLong: [
      {
        text: "If $A = \\begin{bmatrix} 1 & 0 & 2 \\\\ 0 & 2 & 1 \\\\ 2 & 0 & 3 \\end{bmatrix}$, prove that $A^3 - 6A^2 + 7A + 2I = O$.",
        answer: "Model Answer: 1. Compute $A^2 = A \\cdot A = \\begin{bmatrix} 5 & 0 & 8 \\\\ 2 & 4 & 5 \\\\ 8 & 0 & 13 \\end{bmatrix}$. [1.5 Marks]\n2. Compute $A^3 = A^2 \\cdot A = \\begin{bmatrix} 21 & 0 & 34 \\\\ 12 & 8 & 23 \\\\ 34 & 0 & 55 \\end{bmatrix}$. [1.5 Marks]\n3. Substitute into $A^3 - 6A^2 + 7A + 2I$ entry-by-entry to obtain the zero matrix $O$. [1 Mark]",
      },
    ],
  },
  determinants: {
    includedTopics: [
      "Determinant of a square matrix of order up to 3x3",
      "Minors, cofactors, and area of a triangle using determinants",
      "Adjoint and inverse of a square matrix (A^-1 = adj(A)/|A|)",
      "Solution of system of linear equations in two or three variables using matrix inverse",
    ],
    deletedTopics: ["Row/column reduction properties of determinants without expansion"],
    keyFormulasOrConcepts: [
      "For a square matrix A of order n, |adj(A)| = |A|^(n-1) and |kA| = k^n |A|",
      "A . adj(A) = adj(A) . A = |A| I",
      "Area of triangle with vertices (x1,y1), (x2,y2), (x3,y3) is 1/2 |x1(y2-y3) + x2(y3-y1) + x3(y1-y2)|",
    ],
    sampleMcqs: [
      {
        text: "Let $A$ be a non-singular square matrix of order $3 \\times 3$. Then $|\\text{adj}(A)|$ is equal to:",
        options: ["$|A|^2$", "$|A|$", "$|A|^3$", "$3|A|$"],
        answer: "$|A|^2$",
        explanation: "For a non-singular matrix of order n, |adj(A)| = |A|^(n-1). Here n = 3, so |adj(A)| = |A|^2.",
      },
      {
        text: "If $\\begin{vmatrix} x & 2 \\\\ 18 & x \\end{vmatrix} = \\begin{vmatrix} 6 & 2 \\\\ 18 & 6 \\end{vmatrix}$, then $x$ is equal to:",
        options: ["$\\pm 6$", "$6$", "$-6$", "$0$"],
        answer: "$\\pm 6$",
        explanation: "Expanding both determinants gives x^2 - 36 = 36 - 36 = 0 => x^2 = 36 => x = +-6.",
      },
    ],
    sampleFillBlanks: [
      {
        text: "If $A$ is an invertible matrix of order $3$ and $|A| = 5$, then $|\\text{adj}(A)|$ is equal to ________.",
        answer: "25",
        explanation: "|adj(A)| = |A|^(3-1) = 5^2 = 25.",
      },
    ],
    sampleTrueFalse: [
      {
        text: "A square matrix $A$ is invertible if and only if $A$ is a non-singular matrix ($|A| \\neq 0$).",
        answer: "True",
        explanation: "A^(-1) = adj(A)/|A| exists if and only if |A| != 0.",
      },
    ],
    sampleMatchPairs: [
      { left: "Determinant of $\\text{adj}(A)$ for order $n$", right: "$|A|^{n-1}$" },
      { left: "Inverse of a non-singular matrix $A$", right: "$\\frac{1}{|A|}\\text{adj}(A)$" },
    ],
    sampleVeryShort: [
      {
        text: "Evaluate the determinant $\\Delta = \\begin{vmatrix} \\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta \\end{vmatrix}$.",
        answer: "Model Answer: $\\Delta = \\cos^2\\theta - (-\\sin^2\\theta) = \\cos^2\\theta + \\sin^2\\theta = 1$.",
      },
    ],
    sampleShort: [
      {
        text: "Find the equation of the line joining $A(1, 3)$ and $B(0, 0)$ using determinants.",
        answer: "Model Answer: Let $P(x, y)$ be any point on line $AB$. Then $\\begin{vmatrix} x & y & 1 \\\\ 1 & 3 & 1 \\\\ 0 & 0 & 1 \\end{vmatrix} = 0 \\implies 3x - y = 0 \\implies y = 3x$.",
      },
    ],
    sampleLong: [
      {
        text: "Solve the following system of linear equations by the matrix method: $3x - 2y + 3z = 8$, $2x + y - z = 1$, and $4x - 3y + 2z = 4$.",
        answer: "Model Answer: 1. Write as $AX = B$. Compute $|A| = 3(2 - 3) + 2(4 + 4) + 3(-6 - 4) = -3 + 16 - 30 = -17 \\neq 0$. [1 Mark]\n2. Compute cofactors and $\\text{adj}(A) = \\begin{bmatrix} -1 & -5 & -1 \\\\ -8 & -6 & 9 \\\\ -10 & 1 & 7 \\end{bmatrix}$. [1.5 Marks]\n3. $X = A^{-1}B = \\frac{1}{-17}\\text{adj}(A)B = \\begin{bmatrix} 1 \\\\ 2 \\\\ 3 \\end{bmatrix}$, hence $x = 1, y = 2, z = 3$. [1.5 Marks]",
      },
    ],
  },
  "continuity and differentiability": {
    includedTopics: [
      "Continuity of a function at a point and algebra of continuous functions",
      "Differentiability, chain rule, derivatives of inverse trigonometric and implicit functions",
      "Exponential and logarithmic differentiation",
      "Derivatives of parametric functions and second-order derivatives",
    ],
    deletedTopics: ["Rolle's Theorem and Lagrange's Mean Value Theorem"],
    keyFormulasOrConcepts: [
      "f(x) is continuous at x = c iff lim_(x->c-) f(x) = lim_(x->c+) f(x) = f(c)",
      "d/dx(sin^-1 x) = 1/sqrt(1-x^2), d/dx(tan^-1 x) = 1/(1+x^2), d/dx(e^x) = e^x, d/dx(ln x) = 1/x",
      "For parametric x = f(t), y = g(t), dy/dx = (dy/dt)/(dx/dt)",
    ],
    sampleMcqs: [
      {
        text: "If $y = \\log(\\cos e^x)$, then $\\frac{dy}{dx}$ is equal to:",
        options: ["$-e^x \\tan(e^x)$", "$e^x \\tan(e^x)$", "$-\\tan(e^x)$", "$-e^x \\cot(e^x)$"],
        answer: "$-e^x \\tan(e^x)$",
        explanation: "By chain rule, dy/dx = (1/cos(e^x)) * (-sin(e^x)) * e^x = -e^x tan(e^x).",
      },
      {
        text: "The derivative of $\\sin^{-1}(2x\\sqrt{1-x^2})$ with respect to $\\sin^{-1} x$ for $-\\frac{1}{\\sqrt{2}} < x < \\frac{1}{\\sqrt{2}}$ is:",
        options: ["$2$", "$1$", "$\\frac{1}{2}$", "$\\sqrt{1-x^2}$"],
        answer: "$2$",
        explanation: "Put x = sin(theta). Then u = sin^-1(sin 2theta) = 2theta = 2 sin^-1 x, so du/dv = 2.",
      },
    ],
    sampleFillBlanks: [
      {
        text: "Every differentiable function is ________, but the converse is not necessarily true.",
        answer: "continuous",
        explanation: "Differentiability at a point implies continuity at that point.",
      },
    ],
    sampleTrueFalse: [
      {
        text: "The modulus function $f(x) = |x|$ is continuous at $x = 0$ but not differentiable at $x = 0$.",
        answer: "True",
        explanation: "At x = 0, LHD = -1 and RHD = +1, so f(x) = |x| is not differentiable at x = 0.",
      },
    ],
    sampleMatchPairs: [
      { left: "$\\frac{d}{dx}(\\tan^{-1} x)$", right: "$\\frac{1}{1+x^2}$" },
      { left: "$\\frac{d}{dx}(\\sin^{-1} x)$", right: "$\\frac{1}{\\sqrt{1-x^2}}$" },
    ],
    sampleVeryShort: [
      {
        text: "Find $\\frac{dy}{dx}$ if $2x + 3y = \\sin y$.",
        answer: "Model Answer: Differentiating w.r.t. $x$: $2 + 3\\frac{dy}{dx} = \\cos y \\frac{dy}{dx} \\implies \\frac{dy}{dx} = \\frac{2}{\\cos y - 3}$.",
      },
    ],
    sampleShort: [
      {
        text: "Find the value of $k$ so that the function $f(x) = \\begin{cases} kx + 1, & \\text{if } x \\le \\pi \\\\ \\cos x, & \\text{if } x > \\pi \\end{cases}$ is continuous at $x = \\pi$.",
        answer: "Model Answer: For continuity at $x = \\pi$, $\\lim_{x \\to \\pi^-} f(x) = \\lim_{x \\to \\pi^+} f(x) \\implies k\\pi + 1 = \\cos\\pi = -1 \\implies k = -\\frac{2}{\\pi}$.",
      },
    ],
    sampleLong: [
      {
        text: "If $y = (\\tan^{-1} x)^2$, show that $(x^2 + 1)^2 y_2 + 2x(x^2 + 1)y_1 = 2$.",
        answer: "Model Answer: 1. Differentiate w.r.t. $x$: $y_1 = \\frac{2\\tan^{-1} x}{1 + x^2} \\implies (1 + x^2)y_1 = 2\\tan^{-1} x$. [1.5 Marks]\n2. Square or differentiate again w.r.t. $x$: $(1 + x^2)y_2 + 2xy_1 = \\frac{2}{1 + x^2}$. [1.5 Marks]\n3. Multiply through by $(1 + x^2)$ to get $(x^2 + 1)^2 y_2 + 2x(x^2 + 1)y_1 = 2$. [1 Mark]",
      },
    ],
  },
  "application of derivatives": {
    includedTopics: [
      "Rate of change of quantities",
      "Increasing and decreasing functions on intervals",
      "Maxima and minima: first derivative test and second derivative test",
      "Applied optimization problems (geometric and mensuration maxima/minima)",
    ],
    deletedTopics: ["Tangents and normals to curves", "Differentials and linear approximations"],
    keyFormulasOrConcepts: [
      "f(x) is strictly increasing on (a,b) if f'(x) > 0 and strictly decreasing if f'(x) < 0",
      "At a critical point c where f'(c) = 0, if f''(c) < 0 then c is a point of local maximum; if f''(c) > 0 then c is a point of local minimum",
    ],
    sampleMcqs: [
      {
        text: "The rate of change of the area of a circle with respect to its radius $r$ at $r = 6\\text{ cm}$ is:",
        options: ["$12\\pi\\text{ cm}^2/\\text{cm}$", "$10\\pi\\text{ cm}^2/\\text{cm}$", "$8\\pi\\text{ cm}^2/\\text{cm}$", "$6\\pi\\text{ cm}^2/\\text{cm}$"],
        answer: "$12\\pi\\text{ cm}^2/\\text{cm}$",
        explanation: "A = pi r^2 => dA/dr = 2pi r. At r = 6 cm, dA/dr = 12pi cm^2/cm.",
      },
      {
        text: "The interval in which $y = x^2 e^{-x}$ is increasing is:",
        options: ["$(0, 2)$", "$(-\\infty, \\infty)$", "$(-2, 0)$", "$(2, \\infty)$"],
        answer: "$(0, 2)$",
        explanation: "dy/dx = x(2 - x)e^(-x) > 0 when 0 < x < 2.",
      },
    ],
    sampleFillBlanks: [
      {
        text: "A function $f(x)$ is strictly increasing on an open interval $(a, b)$ if $f'(x)$ is ________ on $(a, b)$.",
        answer: "positive ($> 0$)",
        explanation: "By the first derivative test for monotonicity, f'(x) > 0 implies f is strictly increasing.",
      },
    ],
    sampleTrueFalse: [
      {
        text: "The function $f(x) = e^{2x}$ is strictly increasing for all $x \\in \\mathbb{R}$.",
        answer: "True",
        explanation: "f'(x) = 2e^(2x) > 0 for all real x.",
      },
    ],
    sampleMatchPairs: [
      { left: "Condition for local maximum at $f'(c)=0$", right: "$f''(c) < 0$" },
      { left: "Condition for local minimum at $f'(c)=0$", right: "$f''(c) > 0$" },
    ],
    sampleVeryShort: [
      {
        text: "Find the rate of change of the volume of a cube with respect to its edge $x$ when $x = 5\\text{ cm}$.",
        answer: "Model Answer: $V = x^3 \\implies \\frac{dV}{dx} = 3x^2$. At $x = 5\\text{ cm}$, $\\frac{dV}{dx} = 75\\text{ cm}^3/\\text{cm}$.",
      },
    ],
    sampleShort: [
      {
        text: "Find the intervals in which the function $f(x) = 2x^3 - 3x^2 - 36x + 7$ is strictly increasing or strictly decreasing.",
        answer: "Model Answer: $f'(x) = 6x^2 - 6x - 36 = 6(x - 3)(x + 2)$. Critical points are $x = -2, 3$. $f(x)$ is strictly increasing on $(-\\infty, -2) \\cup (3, \\infty)$ and strictly decreasing on $(-2, 3)$.",
      },
    ],
    sampleLong: [
      {
        text: "Show that of all the rectangles inscribed in a given fixed circle of radius $a$, the square has the maximum area.",
        answer: "Model Answer: 1. Let dimensions be $x$ and $y$ with $x^2 + y^2 = (2a)^2 = 4a^2 \\implies y = \\sqrt{4a^2 - x^2}$. [1 Mark]\n2. Area $A(x) = x\\sqrt{4a^2 - x^2}$. Maximize $S(x) = A^2 = 4a^2x^2 - x^4$. [1 Mark]\n3. $S'(x) = 8a^2x - 4x^3 = 0 \\implies x = \\sqrt{2}a$, which gives $y = \\sqrt{2}a = x$ and $S''(\\sqrt{2}a) = -16a^2 < 0$. Hence the rectangle of maximum area is a square. [2 Marks]",
      },
    ],
  },
  integrals: {
    includedTopics: [
      "Indefinite integration by substitution, partial fractions, and integration by parts",
      "Standard integrals involving 1/(x^2 +- a^2), 1/sqrt(a^2 - x^2), sqrt(a^2 +- x^2)",
      "Fundamental Theorem of Calculus and properties of definite integrals",
    ],
    deletedTopics: ["Definite integral as the limit of a Riemann sum"],
    keyFormulasOrConcepts: [
      "int e^x [f(x) + f'(x)] dx = e^x f(x) + C",
      "int_0^a f(x) dx = int_0^a f(a - x) dx",
      "int u dv = u int dv - int (du/dx int dv) dx",
    ],
    sampleMcqs: [
      {
        text: "The value of the definite integral $\\int_{-\\pi/2}^{\\pi/2} \\sin^7 x \\, dx$ is:",
        options: ["$0$", "$1$", "$\\frac{\\pi}{2}$", "$2$"],
        answer: "$0$",
        explanation: "f(x) = sin^7 x is an odd function since f(-x) = -f(x), so its integral over [-a, a] is 0.",
      },
      {
        text: "The antiderivative $\\int e^x(\\sin x + \\cos x)\\,dx$ is equal to:",
        options: ["$e^x \\sin x + C$", "$e^x \\cos x + C$", "$-e^x \\cos x + C$", "$e^x(\\sin x - \\cos x) + C$"],
        answer: "$e^x \\sin x + C$",
        explanation: "Using int e^x(f(x) + f'(x))dx = e^x f(x) + C with f(x) = sin x and f'(x) = cos x.",
      },
    ],
    sampleFillBlanks: [
      {
        text: "The standard indefinite integral $\\int \\frac{dx}{x^2 + a^2}$ is equal to ________ $+ C$.",
        answer: "$\\frac{1}{a}\\tan^{-1}\\left(\\frac{x}{a}\\right)$",
        explanation: "Standard integration formula: int dx/(x^2 + a^2) = (1/a) tan^-1(x/a) + C.",
      },
    ],
    sampleTrueFalse: [
      {
        text: "If $f(x)$ is an even continuous function, then $\\int_{-a}^{a} f(x)\\,dx = 2\\int_{0}^{a} f(x)\\,dx$.",
        answer: "True",
        explanation: "For an even function f(-x) = f(x), the integral over [-a, a] is twice the integral over [0, a].",
      },
    ],
    sampleMatchPairs: [
      { left: "$\\int \\frac{1}{x^2 + a^2}\\,dx$", right: "$\\frac{1}{a}\\tan^{-1}\\left(\\frac{x}{a}\\right) + C$" },
      { left: "$\\int \\frac{1}{\\sqrt{a^2 - x^2}}\\,dx$", right: "$\\sin^{-1}\\left(\\frac{x}{a}\\right) + C$" },
    ],
    sampleVeryShort: [
      {
        text: "Evaluate $\\int \\sec x(\\sec x + \\tan x)\\,dx$.",
        answer: "Model Answer: $\\int (\\sec^2 x + \\sec x \\tan x)\\,dx = \\tan x + \\sec x + C$.",
      },
    ],
    sampleShort: [
      {
        text: "Evaluate $\\int \\frac{x}{(x+1)(x+2)}\\,dx$ using partial fractions.",
        answer: "Model Answer: Write $\\frac{x}{(x+1)(x+2)} = \\frac{-1}{x+1} + \\frac{2}{x+2}$. Integrating gives $-\\log|x+1| + 2\\log|x+2| + C = \\log\\left|\\frac{(x+2)^2}{x+1}\\right| + C$.",
      },
    ],
    sampleLong: [
      {
        text: "Evaluate the definite integral $I = \\int_{0}^{\\pi/2} \\frac{\\sqrt{\\sin x}}{\\sqrt{\\sin x} + \\sqrt{\\cos x}}\\,dx$.",
        answer: "Model Answer: 1. Let $I = \\int_{0}^{\\pi/2} \\frac{\\sqrt{\\sin x}}{\\sqrt{\\sin x} + \\sqrt{\\cos x}}\\,dx$ ...(1). [1 Mark]\n2. Apply $\\int_{0}^{a} f(x)\\,dx = \\int_{0}^{a} f(a-x)\\,dx$ to get $I = \\int_{0}^{\\pi/2} \\frac{\\sqrt{\\cos x}}{\\sqrt{\\cos x} + \\sqrt{\\sin x}}\\,dx$ ...(2). [1.5 Marks]\n3. Adding (1) and (2): $2I = \\int_{0}^{\\pi/2} 1\\,dx = \\frac{\\pi}{2} \\implies I = \\frac{\\pi}{4}$. [1.5 Marks]",
      },
    ],
  },
  "application of integrals": {
    includedTopics: [
      "Area bounded by a curve y = f(x), the x-axis, and ordinates x = a and x = b",
      "Area enclosed by standard curves: circles, parabolas, and ellipses",
    ],
    deletedTopics: ["Area between two arbitrary intersecting curves"],
    keyFormulasOrConcepts: [
      "Area of circle x^2 + y^2 = a^2 is pi a^2",
      "Area of ellipse x^2/a^2 + y^2/b^2 = 1 is pi a b",
      "Area under y = f(x) >= 0 from x = a to x = b is int_a^b f(x) dx",
    ],
    sampleMcqs: [
      {
        text: "The area of the region bounded by the curve $y^2 = 4x$, the $y$-axis, and the line $y = 3$ is:",
        options: ["$\\frac{9}{4}$ sq. units", "$2$ sq. units", "$\\frac{9}{3}$ sq. units", "$\\frac{9}{2}$ sq. units"],
        answer: "$\\frac{9}{4}$ sq. units",
        explanation: "Area = int_0^3 (y^2 / 4) dy = [y^3 / 12]_0^3 = 27/12 = 9/4 sq. units.",
      },
    ],
    sampleFillBlanks: [
      {
        text: "The total area enclosed by the standard ellipse $\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1$ is ________ sq. units.",
        answer: "$\\pi ab$",
        explanation: "By definite integration across all 4 quadrants, the area of the ellipse is pi * a * b.",
      },
    ],
    sampleTrueFalse: [
      {
        text: "The area bounded by the circle $x^2 + y^2 = 16$ in the first quadrant is $4\\pi$ sq. units.",
        answer: "True",
        explanation: "Total area is 16pi, so the area in the first quadrant is 16pi / 4 = 4pi sq. units.",
      },
    ],
    sampleMatchPairs: [
      { left: "Area enclosed by circle $x^2 + y^2 = r^2$", right: "$\\pi r^2$" },
      { left: "Area enclosed by ellipse $\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1$", right: "$\\pi ab$" },
    ],
    sampleVeryShort: [
      {
        text: "Write the definite integral representing the area bounded by $y = x^2$, the $x$-axis, and the lines $x = 1$ and $x = 3$.",
        answer: "Model Answer: $\\text{Area} = \\int_{1}^{3} x^2\\,dx = \\left[\\frac{x^3}{3}\\right]_{1}^{3} = \\frac{26}{3}$ sq. units.",
      },
    ],
    sampleShort: [
      {
        text: "Find the area enclosed by the circle $x^2 + y^2 = a^2$ using definite integration.",
        answer: "Model Answer: By symmetry, $\\text{Area} = 4\\int_{0}^{a} \\sqrt{a^2 - x^2}\\,dx = 4\\left[\\frac{x}{2}\\sqrt{a^2-x^2} + \\frac{a^2}{2}\\sin^{-1}\\frac{x}{a}\\right]_{0}^{a} = 4\\left(\\frac{\\pi a^2}{4}\\right) = \\pi a^2$ sq. units.",
      },
    ],
    sampleLong: [
      {
        text: "Using integration, find the area of the region bounded by the ellipse $\\frac{x^2}{16} + \\frac{y^2}{9} = 1$.",
        answer: "Model Answer: 1. From the ellipse equation, in the first quadrant $y = \\frac{3}{4}\\sqrt{16 - x^2}$ for $0 \\le x \\le 4$. [1 Mark]\n2. Total Area $= 4\\int_{0}^{4} \\frac{3}{4}\\sqrt{16 - x^2}\\,dx = 3\\left[\\frac{x}{2}\\sqrt{16-x^2} + 8\\sin^{-1}\\frac{x}{4}\\right]_{0}^{4}$. [2 Marks]\n3. Evaluating at limits gives $3 \\times 8 \\times \\frac{\\pi}{2} = 12\\pi$ sq. units. [1 Mark]",
      },
    ],
  },
  "differential equations": {
    includedTopics: [
      "Order and degree of a differential equation",
      "General and particular solutions of a differential equation",
      "Solution by separation of variables",
      "Homogeneous differential equations of first order and first degree",
      "First-order linear differential equations dy/dx + Py = Q and integrating factor",
    ],
    deletedTopics: ["Formation of a differential equation whose general solution is given"],
    keyFormulasOrConcepts: [
      "Order is the order of the highest derivative; degree is the power of the highest derivative when polynomial in derivatives",
      "For dy/dx + Py = Q, Integrating Factor (I.F.) = e^(int P dx) and solution is y(I.F.) = int Q(I.F.) dx + C",
    ],
    sampleMcqs: [
      {
        text: "The degree of the differential equation $\\left(\\frac{d^2y}{dx^2}\\right)^3 + \\left(\\frac{dy}{dx}\\right)^2 + \\sin\\left(\\frac{dy}{dx}\\right) + 1 = 0$ is:",
        options: ["Not defined", "3", "2", "1"],
        answer: "Not defined",
        explanation: "Because of the term sin(dy/dx), the equation is not a polynomial in its derivatives, so its degree is not defined.",
      },
      {
        text: "The integrating factor of the linear differential equation $x\\frac{dy}{dx} - y = 2x^2$ is:",
        options: ["$\\frac{1}{x}$", "$e^{-x}$", "$e^{-y}$", "$x$"],
        answer: "$\\frac{1}{x}$",
        explanation: "Rewriting in standard form dy/dx - (1/x)y = 2x gives P = -1/x, so I.F. = e^(int -1/x dx) = e^(-ln x) = 1/x.",
      },
    ],
    sampleFillBlanks: [
      {
        text: "The number of arbitrary constants in the particular solution of a differential equation of third order is ________.",
        answer: "0",
        explanation: "A particular solution is obtained by assigning specific values to all arbitrary constants, so it contains 0 arbitrary constants.",
      },
    ],
    sampleTrueFalse: [
      {
        text: "The order of the differential equation $2x^2\\frac{d^2y}{dx^2} - 3\\frac{dy}{dx} + y = 0$ is $2$.",
        answer: "True",
        explanation: "The highest order derivative present is d^2y/dx^2, which is of order 2.",
      },
    ],
    sampleMatchPairs: [
      { left: "Integrating factor of $\\frac{dy}{dx} + Py = Q$", right: "$e^{\\int P\\,dx}$" },
      { left: "Substitution for homogeneous equation $\\frac{dy}{dx} = g(y/x)$", right: "$y = vx$" },
    ],
    sampleVeryShort: [
      {
        text: "Determine the order and degree of the differential equation $\\left(\\frac{ds}{dt}\\right)^4 + 3s\\frac{d^2s}{dt^2} = 0$.",
        answer: "Model Answer: Highest order derivative is $\\frac{d^2s}{dt^2}$, so Order $= 2$ and Degree $= 1$.",
      },
    ],
    sampleShort: [
      {
        text: "Find the general solution of the differential equation $\\frac{dy}{dx} = \\frac{1 + y^2}{1 + x^2}$.",
        answer: "Model Answer: Separating variables: $\\frac{dy}{1 + y^2} = \\frac{dx}{1 + x^2}$. Integrating both sides gives $\\tan^{-1} y = \\tan^{-1} x + C$.",
      },
    ],
    sampleLong: [
      {
        text: "Find the general solution of the linear differential equation $\\cos^2 x \\frac{dy}{dx} + y = \\tan x$ $\\left(0 \\le x < \\frac{\\pi}{2}\\right)$.",
        answer: "Model Answer: 1. Divide by $\\cos^2 x$: $\\frac{dy}{dx} + (\\sec^2 x)y = \\tan x \\sec^2 x$. Here $P = \\sec^2 x, Q = \\tan x \\sec^2 x$. [1 Mark]\n2. Integrating factor $\\text{I.F.} = e^{\\int \\sec^2 x\\,dx} = e^{\\tan x}$. [1 Mark]\n3. Solution: $y e^{\\tan x} = \\int \\tan x \\sec^2 x e^{\\tan x}\\,dx = e^{\\tan x}(\\tan x - 1) + C \\implies y = \\tan x - 1 + Ce^{-\\tan x}$. [2 Marks]",
      },
    ],
  },
  "vector algebra": {
    includedTopics: [
      "Position vector, magnitude, unit vector, and direction cosines/ratios of a vector",
      "Vector addition, components, and section formula",
      "Scalar (dot) product of vectors and projection of a vector on another vector",
      "Vector (cross) product of vectors and area of a triangle/parallelogram",
    ],
    deletedTopics: ["Scalar triple product and coplanarity of three vectors"],
    keyFormulasOrConcepts: [
      "Unit vector in the direction of vec(a) is a_hat = vec(a) / |vec(a)|",
      "Projection of vec(a) on vec(b) is (vec(a) . vec(b)) / |vec(b)|",
      "|vec(a) x vec(b)|^2 + (vec(a) . vec(b))^2 = |vec(a)|^2 |vec(b)|^2",
    ],
    sampleMcqs: [
      {
        text: "The scalar projection of the vector $\\vec{a} = 2\\hat{i} + 3\\hat{j} + 2\\hat{k}$ on the vector $\\vec{b} = \\hat{i} + 2\\hat{j} + \\hat{k}$ is:",
        options: ["$\\frac{5\\sqrt{6}}{3}$", "$\\frac{10}{3}$", "$\\frac{\\sqrt{6}}{2}$", "$\\frac{5}{\\sqrt{17}}$"],
        answer: "$\\frac{5\\sqrt{6}}{3}$",
        explanation: "Projection = (a . b)/|b| = (2*1 + 3*2 + 2*1)/sqrt(1 + 4 + 1) = 10/sqrt(6) = 5*sqrt(6)/3.",
      },
      {
        text: "If $\\vec{a}$ and $\\vec{b}$ are two vectors such that $|\\vec{a}| = 3$, $|\\vec{b}| = \\frac{\\sqrt{2}}{3}$ and $\\vec{a} \\times \\vec{b}$ is a unit vector, then the angle between $\\vec{a}$ and $\\vec{b}$ is:",
        options: ["$\\frac{\\pi}{4}$", "$\\frac{\\pi}{6}$", "$\\frac{\\pi}{3}$", "$\\frac{\\pi}{2}$"],
        answer: "$\\frac{\\pi}{4}$",
        explanation: "|a x b| = |a||b|sin(theta) = 1 => 3 * (sqrt(2)/3) * sin(theta) = 1 => sin(theta) = 1/sqrt(2) => theta = pi/4.",
      },
    ],
    sampleFillBlanks: [
      {
        text: "If vectors $\\vec{a} = 2\\hat{i} + \\lambda\\hat{j} + \\hat{k}$ and $\\vec{b} = \\hat{i} - 2\\hat{j} + 3\\hat{k}$ are perpendicular to each other, then $\\lambda$ is equal to ________.",
        answer: "$\\frac{5}{2}$",
        explanation: "For perpendicular vectors, a . b = 0 => 2(1) - 2*lambda + 3 = 0 => 2*lambda = 5 => lambda = 5/2.",
      },
    ],
    sampleTrueFalse: [
      {
        text: "For any two vectors $\\vec{a}$ and $\\vec{b}$, the cross product satisfies $\\vec{a} \\times \\vec{b} = -(\\vec{b} \\times \\vec{a})$.",
        answer: "True",
        explanation: "Vector cross product is anti-commutative: a x b = -(b x a).",
      },
    ],
    sampleMatchPairs: [
      { left: "Projection of $\\vec{a}$ on $\\vec{b}$", right: "$\\frac{\\vec{a}\\cdot\\vec{b}}{|\\vec{b}|}$" },
      { left: "Area of parallelogram with adjacent sides $\\vec{a}$ and $\\vec{b}$", right: "$|\\vec{a} \\times \\vec{b}|$" },
    ],
    sampleVeryShort: [
      {
        text: "Find the unit vector in the direction of the vector $\\vec{a} = \\hat{i} + \\hat{j} + 2\\hat{k}$.",
        answer: "Model Answer: $|\\vec{a}| = \\sqrt{1^2 + 1^2 + 2^2} = \\sqrt{6}$. Hence $\\hat{a} = \\frac{1}{\\sqrt{6}}\\hat{i} + \\frac{1}{\\sqrt{6}}\\hat{j} + \\frac{2}{\\sqrt{6}}\\hat{k}$.",
      },
    ],
    sampleShort: [
      {
        text: "Find the area of a triangle having the points $A(1, 1, 1)$, $B(1, 2, 3)$, and $C(2, 3, 1)$ as its vertices.",
        answer: "Model Answer: $\\vec{AB} = \\hat{j} + 2\\hat{k}$ and $\\vec{AC} = \\hat{i} + 2\\hat{j}$. Then $\\vec{AB} \\times \\vec{AC} = -4\\hat{i} + 2\\hat{j} - \\hat{k}$. Area $= \\frac{1}{2}|\\vec{AB} \\times \\vec{AC}| = \\frac{\\sqrt{21}}{2}$ sq. units.",
      },
    ],
    sampleLong: [
      {
        text: "Find a unit vector perpendicular to each of the vectors $\\vec{a} + \\vec{b}$ and $\\vec{a} - \\vec{b}$, where $\\vec{a} = 3\\hat{i} + 2\\hat{j} + 2\\hat{k}$ and $\\vec{b} = \\hat{i} + 2\\hat{j} - 2\\hat{k}$.",
        answer: "Model Answer: 1. $\\vec{p} = \\vec{a} + \\vec{b} = 4\\hat{i} + 4\\hat{j}$ and $\\vec{q} = \\vec{a} - \\vec{b} = 2\\hat{i} + 4\\hat{k}$. [1 Mark]\n2. $\\vec{n} = \\vec{p} \\times \\vec{q} = 16\\hat{i} - 16\\hat{j} - 8\\hat{k}$ and $|\\vec{n}| = \\sqrt{256 + 256 + 64} = 24$. [1.5 Marks]\n3. Required unit vector $= \\pm\\frac{\\vec{n}}{|\\vec{n}|} = \\pm\\left(\\frac{2}{3}\\hat{i} - \\frac{2}{3}\\hat{j} - \\frac{1}{3}\\hat{k}\\right)$. [1.5 Marks]",
      },
    ],
  },
  "three dimensional geometry": {
    includedTopics: [
      "Direction cosines (l, m, n) and direction ratios (a, b, c) of a line",
      "Vector and Cartesian equations of a line in space",
      "Angle between two lines in space",
      "Skew lines and shortest distance between two skew lines or parallel lines",
    ],
    deletedTopics: ["Cartesian and vector equations of a plane, angle between line and plane"],
    keyFormulasOrConcepts: [
      "l^2 + m^2 + n^2 = 1 for direction cosines l, m, n",
      "Vector equation of line through vec(a) parallel to vec(b) is vec(r) = vec(a) + lambda vec(b)",
      "Shortest distance between skew lines vec(r) = vec(a1) + lambda vec(b1) and vec(r) = vec(a2) + mu vec(b2) is |((vec(a2)-vec(a1)) . (vec(b1) x vec(b2)))| / |vec(b1) x vec(b2)|",
    ],
    sampleMcqs: [
      {
        text: "If a line makes angles $90^\\circ, 135^\\circ, 45^\\circ$ with the $x, y,$ and $z$-axes respectively, then its direction cosines are:",
        options: [
          "$0, -\\frac{1}{\\sqrt{2}}, \\frac{1}{\\sqrt{2}}$",
          "$0, \\frac{1}{\\sqrt{2}}, \\frac{1}{\\sqrt{2}}$",
          "$1, -\\frac{1}{\\sqrt{2}}, \\frac{1}{\\sqrt{2}}$",
          "$\\frac{1}{\\sqrt{2}}, 0, -\\frac{1}{\\sqrt{2}}$",
        ],
        answer: "$0, -\\frac{1}{\\sqrt{2}}, \\frac{1}{\\sqrt{2}}$",
        explanation: "l = cos 90 = 0, m = cos 135 = -1/sqrt(2), n = cos 45 = 1/sqrt(2).",
      },
    ],
    sampleFillBlanks: [
      {
        text: "If $l, m, n$ are the direction cosines of a line in space, then $l^2 + m^2 + n^2$ is equal to ________.",
        answer: "1",
        explanation: "The sum of squares of the direction cosines of any line in 3D space is always 1.",
      },
    ],
    sampleTrueFalse: [
      {
        text: "The direction cosines of the $z$-axis are $(0, 0, 1)$.",
        answer: "True",
        explanation: "The z-axis makes angles 90, 90, 0 degrees with the x, y, z axes, giving cosines (0, 0, 1).",
      },
    ],
    sampleMatchPairs: [
      { left: "Fundamental identity of direction cosines", right: "$l^2 + m^2 + n^2 = 1$" },
      { left: "Shortest distance between skew lines", right: "$\\left|\\frac{(\\vec{a}_2 - \\vec{a}_1)\\cdot(\\vec{b}_1 \\times \\vec{b}_2)}{|\\vec{b}_1 \\times \\vec{b}_2|}\\right|$" },
    ],
    sampleVeryShort: [
      {
        text: "Find the direction ratios of the line joining the points $P(2, 3, -4)$ and $Q(1, -2, 3)$.",
        answer: "Model Answer: Direction ratios are $(1 - 2, -2 - 3, 3 - (-4)) = (-1, -5, 7)$ or $(1, 5, -7)$.",
      },
    ],
    sampleShort: [
      {
        text: "Find the vector and Cartesian equations of the line passing through the point $(5, 2, -4)$ and parallel to the vector $3\\hat{i} + 2\\hat{j} - 8\\hat{k}$.",
        answer: "Model Answer: Vector equation: $\\vec{r} = (5\\hat{i} + 2\\hat{j} - 4\\hat{k}) + \\lambda(3\\hat{i} + 2\\hat{j} - 8\\hat{k})$. Cartesian equation: $\\frac{x - 5}{3} = \\frac{y - 2}{2} = \\frac{z + 4}{-8}$.",
      },
    ],
    sampleLong: [
      {
        text: "Find the shortest distance between the skew lines $\\vec{r} = (\\hat{i} + 2\\hat{j} + \\hat{k}) + \\lambda(\\hat{i} - \\hat{j} + \\hat{k})$ and $\\vec{r} = (2\\hat{i} - \\hat{j} - \\hat{k}) + \\mu(2\\hat{i} + \\hat{j} + 2\\hat{k})$.",
        answer: "Model Answer: 1. Here $\\vec{a}_2 - \\vec{a}_1 = \\hat{i} - 3\\hat{j} - 2\\hat{k}$, $\\vec{b}_1 = \\hat{i} - \\hat{j} + \\hat{k}$, and $\\vec{b}_2 = 2\\hat{i} + \\hat{j} + 2\\hat{k}$. [1 Mark]\n2. $\\vec{b}_1 \\times \\vec{b}_2 = -3\\hat{i} + 0\\hat{j} + 3\\hat{k}$ and $|\\vec{b}_1 \\times \\vec{b}_2| = 3\\sqrt{2}$. [1.5 Marks]\n3. $d = \\left|\\frac{(\\vec{a}_2 - \\vec{a}_1)\\cdot(\\vec{b}_1 \\times \\vec{b}_2)}{|\\vec{b}_1 \\times \\vec{b}_2|}\\right| = \\frac{|-3 - 6|}{3\\sqrt{2}} = \\frac{3\\sqrt{2}}{2}$ units. [1.5 Marks]",
      },
    ],
  },
  "linear programming": {
    includedTopics: [
      "Linear programming problem (LPP): objective function, linear constraints, non-negativity restrictions",
      "Feasible region (bounded and unbounded) and feasible solutions",
      "Corner point method for graphical maximization and minimization",
    ],
    deletedTopics: ["Formulation of complex multi-stage transportation/diet word problems"],
    keyFormulasOrConcepts: [
      "Fundamental Theorem of LPP: Optimal value of Z = ax + by occurs at a corner point (vertex) of the convex feasible region",
      "Non-negativity constraints x >= 0, y >= 0 restrict the feasible region to the first quadrant",
    ],
    sampleMcqs: [
      {
        text: "The corner points of the bounded feasible region determined by a system of linear constraints are $(0, 10), (5, 5), (15, 15),$ and $(0, 20)$. Let $Z = px + qy$, where $p, q > 0$. The condition on $p$ and $q$ so that the maximum of $Z$ occurs at both $(15, 15)$ and $(0, 20)$ is:",
        options: ["$q = 3p$", "$p = q$", "$p = 2q$", "$p = 3q$"],
        answer: "$q = 3p$",
        explanation: "Equating Z(15, 15) = Z(0, 20) gives 15p + 15q = 20q => 15p = 5q => q = 3p.",
      },
    ],
    sampleFillBlanks: [
      {
        text: "In a Linear Programming Problem, the linear function $Z = ax + by$ which is to be maximized or minimized is called the ________ function.",
        answer: "objective",
        explanation: "The linear function Z = ax + by to be optimized is called the objective function.",
      },
    ],
    sampleTrueFalse: [
      {
        text: "The feasible region of a linear programming problem is always a convex polygon/region.",
        answer: "True",
        explanation: "The intersection of closed half-planes defined by linear inequalities is always a convex set.",
      },
    ],
    sampleMatchPairs: [
      { left: "Function $Z = ax + by$ to be optimized", right: "Objective function" },
      { left: "Conditions $x \\ge 0, y \\ge 0$ in an LPP", right: "Non-negativity constraints" },
    ],
    sampleVeryShort: [
      {
        text: "Define the feasible region in a Linear Programming Problem.",
        answer: "Model Answer: The common region determined by all the constraints including non-negativity constraints $x \\ge 0, y \\ge 0$ of an LPP is called the feasible region.",
      },
    ],
    sampleShort: [
      {
        text: "Maximize $Z = 3x + 4y$ subject to the constraints $x + y \\le 4, x \\ge 0, y \\ge 0$ by the corner point method.",
        answer: "Model Answer: The bounded feasible region has corner points $O(0,0), A(4,0), B(0,4)$. Evaluating $Z$: $Z(0,0)=0, Z(4,0)=12, Z(0,4)=16$. Maximum value of $Z$ is $16$ at $(0, 4)$.",
      },
    ],
    sampleLong: [
      {
        text: "Solve the following Linear Programming Problem graphically: Minimize and Maximize $Z = 3x + 9y$ subject to the constraints $x + 3y \\le 60$, $x + y \\ge 10$, $x \\le y$, and $x \\ge 0, y \\ge 0$.",
        answer: "Model Answer: 1. Plot lines $x + 3y = 60$, $x + y = 10$, and $x = y$ in the first quadrant. [1.5 Marks]\n2. Identify corner points of the bounded feasible region: $A(5, 5), B(15, 15), C(0, 20), D(0, 10)$. [1 Mark]\n3. Evaluate $Z = 3x + 9y$: $Z(5,5) = 60$ (Minimum), $Z(15,15) = 180$ and $Z(0,20) = 180$ (Maximum along segment $BC$). [1.5 Marks]",
      },
    ],
  },
  probability: {
    includedTopics: [
      "Conditional probability P(E|F) and its properties",
      "Multiplication theorem of probability and independent events",
      "Partition of a sample space, Theorem of Total Probability, and Bayes' Theorem",
    ],
    deletedTopics: ["Mean and variance of random variable, Binomial probability distribution"],
    keyFormulasOrConcepts: [
      "P(E|F) = P(E cap F) / P(F), provided P(F) != 0",
      "Events A and B are independent iff P(A cap B) = P(A) P(B)",
      "Bayes' Theorem: P(E_i | A) = P(E_i)P(A|E_i) / sum_j P(E_j)P(A|E_j)",
    ],
    sampleMcqs: [
      {
        text: "If $P(A) = \\frac{3}{5}$ and $P(B) = \\frac{1}{5}$, find $P(A \\cap B)$ if $A$ and $B$ are independent events:",
        options: ["$\\frac{3}{25}$", "$\\frac{4}{5}$", "$\\frac{2}{5}$", "$\\frac{1}{25}$"],
        answer: "$\\frac{3}{25}$",
        explanation: "For independent events A and B, P(A cap B) = P(A) * P(B) = (3/5) * (1/5) = 3/25.",
      },
      {
        text: "If $P(A) = 0.8$, $P(B) = 0.5$, and $P(B|A) = 0.4$, then $P(A \\cap B)$ is equal to:",
        options: ["$0.32$", "$0.20$", "$0.64$", "$0.50$"],
        answer: "$0.32$",
        explanation: "P(A cap B) = P(A) * P(B|A) = 0.8 * 0.4 = 0.32.",
      },
    ],
    sampleFillBlanks: [
      {
        text: "If $E$ and $F$ are any two events of a sample space $S$ with $P(F) \\neq 0$, then $P(E|F) + P(E'|F)$ is equal to ________.",
        answer: "1",
        explanation: "By property of conditional probability, P(E|F) + P(E'|F) = P(S|F) = 1.",
      },
    ],
    sampleTrueFalse: [
      {
        text: "If $A$ and $B$ are two independent events, then $P(A \\cap B) = P(A) \\cdot P(B)$.",
        answer: "True",
        explanation: "By definition, two events A and B are independent iff P(A cap B) = P(A)P(B).",
      },
    ],
    sampleMatchPairs: [
      { left: "Conditional probability $P(A|B)$", right: "$\\frac{P(A \\cap B)}{P(B)}$" },
      { left: "Condition for independent events $A$ and $B$", right: "$P(A \\cap B) = P(A)P(B)$" },
    ],
    sampleVeryShort: [
      {
        text: "If $P(A) = \\frac{7}{13}$, $P(B) = \\frac{9}{13}$, and $P(A \\cap B) = \\frac{4}{13}$, evaluate $P(A|B)$.",
        answer: "Model Answer: $P(A|B) = \\frac{P(A \\cap B)}{P(B)} = \\frac{4/13}{9/13} = \\frac{4}{9}$.",
      },
    ],
    sampleShort: [
      {
        text: "A die is thrown twice and the sum of the numbers appearing is observed to be $6$. What is the conditional probability that the number $4$ has appeared at least once?",
        answer: "Model Answer: Let $E = \\{(2,4), (4,2)\\}$ (4 appears at least once and sum is 6) and $F = \\{(1,5),(2,4),(3,3),(4,2),(5,1)\\}$ (sum is 6). Then $P(E|F) = \\frac{n(E \\cap F)}{n(F)} = \\frac{2}{5}$.",
      },
    ],
    sampleLong: [
      {
        text: "Bag I contains $3$ red and $4$ black balls while another Bag II contains $5$ red and $6$ black balls. One ball is drawn at random from one of the bags and it is found to be red. Find the probability that it was drawn from Bag II.",
        answer: "Model Answer: 1. Let $E_1, E_2$ be selecting Bag I and Bag II ($P(E_1) = P(E_2) = \\frac{1}{2}$), and $A$ be drawing a red ball. [1 Mark]\n2. $P(A|E_1) = \\frac{3}{7}$ and $P(A|E_2) = \\frac{5}{11}$. [1 Mark]\n3. By Bayes' Theorem, $P(E_2|A) = \\frac{\\frac{1}{2}\\cdot\\frac{5}{11}}{\\frac{1}{2}\\cdot\\frac{3}{7} + \\frac{1}{2}\\cdot\\frac{5}{11}} = \\frac{35}{68}$. [2 Marks]",
      },
    ],
  },
};

/**
 * Builds a curriculum specification for any subject and chapter.
 */
export function getChapterCurriculumSpec(
  rawSubject: string,
  chapterTitle: string,
  className = "Class 12",
): ChapterCurriculumSpec {
  const canonicalSubject = getCanonicalSubjectName(rawSubject) || rawSubject.trim() || "General";
  const cleanTitle = cleanChapterTitleForLookup(chapterTitle).toLowerCase();

  if (canonicalSubject === "Mathematics") {
    if (CLASS_12_MATH_CHAPTER_SPECS[cleanTitle]) {
      return {
        chapterTitle,
        canonicalSubject,
        ...CLASS_12_MATH_CHAPTER_SPECS[cleanTitle],
      };
    }
    const sortedMathSpecs = Object.entries(CLASS_12_MATH_CHAPTER_SPECS).sort(
      (a, b) => b[0].length - a[0].length,
    );
    for (const [key, spec] of sortedMathSpecs) {
      if (cleanTitle.includes(key) || key.includes(cleanTitle)) {
        return {
          chapterTitle,
          canonicalSubject,
          ...spec,
        };
      }
    }

    // Secondary / general Mathematics fallback (Classes 1-11)
    return {
      chapterTitle,
      canonicalSubject: "Mathematics",
      includedTopics: [
        `Algebraic and geometric properties of ${cleanChapterTitleForLookup(chapterTitle)}`,
        `Standard theorems, identities, and problem-solving in ${cleanChapterTitleForLookup(chapterTitle)}`,
      ],
      deletedTopics: [],
      keyFormulasOrConcepts: [
        `Standard mathematical relations and equations for ${cleanChapterTitleForLookup(chapterTitle)}`,
      ],
      sampleMcqs: [
        {
          text: `In ${cleanChapterTitleForLookup(chapterTitle)}, if the quadratic polynomial $p(x) = x^2 - 5x + 6$ has zeroes $\\alpha$ and $\\beta$, then $\\alpha + \\beta$ is equal to:`,
          options: ["$5$", "$6$", "$-5$", "$-6$"],
          answer: "$5$",
          explanation: "For ax^2 + bx + c, sum of zeroes alpha + beta = -b/a = 5.",
        },
      ],
      sampleFillBlanks: [
        {
          text: `The discriminant of the quadratic equation $ax^2 + bx + c = 0$ ($a \\neq 0$) in ${cleanChapterTitleForLookup(chapterTitle)} is $D =$ ________.`,
          answer: "$b^2 - 4ac$",
          explanation: "The discriminant of ax^2 + bx + c = 0 is b^2 - 4ac.",
        },
      ],
      sampleTrueFalse: [
        {
          text: `For any real number $\\theta$, the trigonometric identity $\\sin^2\\theta + \\cos^2\\theta = 1$ holds true.`,
          answer: "True",
          explanation: "Fundamental Pythagorean trigonometric identity.",
        },
      ],
      sampleMatchPairs: [
        { left: "Sum of zeroes of $ax^2 + bx + c$", right: "$-\\frac{b}{a}$" },
        { left: "Product of zeroes of $ax^2 + bx + c$", right: "$\\frac{c}{a}$" },
      ],
      sampleVeryShort: [
        {
          text: `Find the roots of the equation $x^2 - 9 = 0$ in the context of ${cleanChapterTitleForLookup(chapterTitle)}.`,
          answer: "Model Answer: $x^2 = 9 \\implies x = \\pm 3$.",
        },
      ],
      sampleShort: [
        {
          text: `Solve the system of equations $x + y = 10$ and $x - y = 4$ and verify the result for ${cleanChapterTitleForLookup(chapterTitle)}.`,
          answer: "Model Answer: Adding both equations gives $2x = 14 \\implies x = 7$, and substituting gives $y = 3$.",
        },
      ],
      sampleLong: [
        {
          text: `Find the zeroes of the quadratic polynomial $f(x) = x^2 + 7x + 10$ and verify the relationship between the zeroes and the coefficients.`,
          answer: "Model Answer: 1. Factorizing $x^2 + 7x + 10 = (x + 2)(x + 5)$ gives zeroes $\\alpha = -2, \\beta = -5$. [2 Marks]\n2. Sum $\\alpha + \\beta = -7 = -b/a$ and Product $\\alpha\\beta = 10 = c/a$. [2 Marks]",
        },
      ],
    };
  }

  if (canonicalSubject === "Biology") {
    const clean = cleanChapterTitleForLookup(chapterTitle);
    return {
      chapterTitle,
      canonicalSubject: "Biology",
      includedTopics: [
        `Structure, physiology, and genetic mechanisms in ${clean}`,
        `NCERT diagram analysis and biological pathways in ${clean}`,
      ],
      deletedTopics: [],
      keyFormulasOrConcepts: [`Core biological mechanisms and regulation in ${clean}`],
      sampleMcqs: [
        {
          text: `Which cell division is responsible for producing haploid microspores from a diploid microspore mother cell in ${clean}?`,
          options: ["Meiosis", "Mitosis", "Amitosis", "Binary fission"],
          answer: "Meiosis",
          explanation: "Microsporogenesis involves reductional division (meiosis) of diploid PMC (2n) to form haploid microspores (n).",
        },
      ],
      sampleFillBlanks: [
        {
          text: `In ${clean}, the functional unit of inheritance that codes for a specific polypeptide or RNA molecule is called a ________.`,
          answer: "gene (cistron)",
          explanation: "A cistron/gene is a segment of DNA coding for a polypeptide.",
        },
      ],
      sampleTrueFalse: [
        {
          text: `Double fertilization is a unique characteristic feature of angiosperms (flowering plants).`,
          answer: "True",
          explanation: "Syngamy and triple fusion together constitute double fertilization in angiosperms.",
        },
      ],
      sampleMatchPairs: [
        { left: `Primary functional process in ${clean}`, right: `Cellular and genetic regulation in ${clean}` },
        { left: "Double fertilization in angiosperms", right: "Syngamy and triple fusion" },
      ],
      sampleVeryShort: [
        {
          text: `Name the nutritive tissue that nourishes the developing pollen grains in an anther (${clean}).`,
          answer: "Model Answer: Tapetum (the innermost wall layer of the microsporangium).",
        },
      ],
      sampleShort: [
        {
          text: `Differentiate between microsporogenesis and megasporogenesis in flowering plants (${clean}).`,
          answer: "Model Answer: 1. Microsporogenesis forms four functional haploid microspores from a pollen mother cell inside the anther. 2. Megasporogenesis forms four megaspores from a megaspore mother cell inside the ovule, of which typically one remains functional.",
        },
      ],
      sampleLong: [
        {
          text: `Explain the biological process and structural adaptations studied in ${clean} with a neat labelled diagram and step-wise mechanism.`,
          answer: `Model Answer: 1. Structural organization and specialized cells in ${clean} [1.5 Marks]. 2. Physiological mechanism and regulation [1.5 Marks]. 3. Biological significance and adaptations [1 Mark].`,
        },
      ],
    };
  }

  if (canonicalSubject === "Physics") {
    const clean = cleanChapterTitleForLookup(chapterTitle);
    return {
      chapterTitle,
      canonicalSubject: "Physics",
      includedTopics: [
        `Physical laws, mathematical derivations, and SI units in ${clean}`,
        `Circuit/ray diagrams and numerical problem-solving in ${clean}`,
      ],
      deletedTopics: [],
      keyFormulasOrConcepts: ["Ohm's Law V = IR", "Coulomb's Law F = (1/4pi epsilon_0) q1 q2 / r^2", "Lens formula 1/v - 1/u = 1/f"],
      sampleMcqs: [
        {
          text: `According to ${clean}, the SI unit of electric potential difference is:`,
          options: ["Volt ($\\text{V}$)", "Ampere ($\\text{A}$)", "Ohm ($\\Omega$)", "Coulomb ($\\text{C}$)"],
          answer: "Volt ($\\text{V}$)",
          explanation: "Electric potential difference is measured in Volts (1 V = 1 J/C).",
        },
      ],
      sampleFillBlanks: [
        {
          text: `In ${clean}, the reciprocal of electrical resistivity of a conductor is called its electrical ________.`,
          answer: "conductivity",
          explanation: "Electrical conductivity sigma = 1/rho.",
        },
      ],
      sampleTrueFalse: [
        {
          text: `According to Lenz's Law, the polarity of induced EMF always opposes the change in magnetic flux that produces it.`,
          answer: "True",
          explanation: "Lenz's law is a consequence of conservation of energy.",
        },
      ],
      sampleMatchPairs: [
        { left: "Ohm's Law relation", right: "$V = IR$" },
        { left: "Electric power dissipated in resistor", right: "$P = I^2 R$" },
      ],
      sampleVeryShort: [
        {
          text: `State the SI unit and dimensional formula of electric flux in ${clean}.`,
          answer: "Model Answer: SI unit is $\\text{N}\\cdot\\text{m}^2\\cdot\\text{C}^{-1}$ (or $\\text{V}\\cdot\\text{m}$) and dimensional formula is $[\\text{M L}^3 \\text{T}^{-3} \\text{A}^{-1}]$.",
        },
      ],
      sampleShort: [
        {
          text: `State Ohm's Law and calculate the current flowing through a $10\\,\\Omega$ resistor connected across a $12\\text{ V}$ battery (${clean}).`,
          answer: "Model Answer: By Ohm's Law, $V = IR$. Substituting $V = 12\\text{ V}$ and $R = 10\\,\\Omega$, we get $I = \\frac{12}{10} = 1.2\\text{ A}$.",
        },
      ],
      sampleLong: [
        {
          text: `Derive the expression for the equivalent capacitance of three capacitors $C_1, C_2,$ and $C_3$ connected in series and in parallel (${clean}).`,
          answer: "Model Answer: 1. In series, charge $Q$ is same and $V = V_1 + V_2 + V_3 \\implies \\frac{1}{C_s} = \\frac{1}{C_1} + \\frac{1}{C_2} + \\frac{1}{C_3}$. [2 Marks]\n2. In parallel, potential $V$ is same and $Q = Q_1 + Q_2 + Q_3 \\implies C_p = C_1 + C_2 + C_3$. [2 Marks]",
        },
      ],
    };
  }

  if (canonicalSubject === "Chemistry" || canonicalSubject === "Science") {
    const clean = cleanChapterTitleForLookup(chapterTitle);
    return {
      chapterTitle,
      canonicalSubject,
      includedTopics: [
        `Chemical equations, laws, and experimental observations in ${clean}`,
        `Scientific principles and real-world applications in ${clean}`,
      ],
      deletedTopics: [],
      keyFormulasOrConcepts: [`Balanced reactions and scientific mechanisms in ${clean}`],
      sampleMcqs: [
        {
          text: `When aqueous solutions of lead(II) nitrate and potassium iodide are mixed (${clean}), a bright yellow precipitate is formed. The chemical formula of this precipitate is:`,
          options: ["$\\text{PbI}_2$", "$\\text{KNO}_3$", "$\\text{Pb(NO}_3)_2$", "$\\text{KI}$"],
          answer: "$\\text{PbI}_2$",
          explanation: "Pb(NO3)2(aq) + 2KI(aq) -> PbI2(s) (yellow precipitate) + 2KNO3(aq).",
        },
      ],
      sampleFillBlanks: [
        {
          text: `The process of depositing a protective layer of zinc on iron to prevent rusting (${clean}) is known as ________.`,
          answer: "galvanisation",
          explanation: "Galvanisation protects iron from corrosion by sacrificial zinc coating.",
        },
      ],
      sampleTrueFalse: [
        {
          text: `Oxidation involves the loss of electrons or an increase in oxidation state during a chemical reaction.`,
          answer: "True",
          explanation: "By electronic concept, oxidation is loss of electrons.",
        },
      ],
      sampleMatchPairs: [
        { left: "Thermal decomposition of $\\text{CaCO}_3$", right: "Endothermic reaction" },
        { left: "Dissolution of quicklime ($\\text{CaO}$) in water", right: "Exothermic combination reaction" },
      ],
      sampleVeryShort: [
        {
          text: `Write the balanced chemical equation for the reaction of quicklime ($\\text{CaO}$) with water (${clean}).`,
          answer: "Model Answer: $\\text{CaO}(s) + \\text{H}_2\\text{O}(l) \\to \\text{Ca(OH)}_2(aq) + \\text{Heat}$.",
        },
      ],
      sampleShort: [
        {
          text: `Why does silver chloride turn grey when exposed to sunlight? Write the balanced chemical equation (${clean}).`,
          answer: "Model Answer: Photolytic decomposition of silver chloride into metallic silver and chlorine gas: $2\\text{AgCl}(s) \\xrightarrow{\\text{Sunlight}} 2\\text{Ag}(s) + \\text{Cl}_2(g)$.",
        },
      ],
      sampleLong: [
        {
          text: `Explain the scientific principles, experimental observations, and balanced equations associated with ${clean}.`,
          answer: `Model Answer: 1. Core principle and definition in ${clean} [1.5 Marks]. 2. Balanced equation / mathematical relation [1.5 Marks]. 3. Practical application and precautions [1 Mark].`,
        },
      ],
    };
  }

  if (canonicalSubject === "English" || canonicalSubject === "Hindi" || canonicalSubject === "Sanskrit") {
    const clean = cleanChapterTitleForLookup(chapterTitle);
    return {
      chapterTitle,
      canonicalSubject,
      includedTopics: [
        `Reading comprehension, literary analysis, and vocabulary in ${clean}`,
        `Grammar rules, formal composition, and textual appreciation in ${clean}`,
      ],
      deletedTopics: [],
      keyFormulasOrConcepts: [`Theme, tone, character sketch, and grammatical accuracy in ${clean}`],
      sampleMcqs: [
        {
          text: `Identify the primary literary theme and communicative purpose highlighted in "${clean}":`,
          options: [
            "Human resilience, linguistic reflection, and ethical responsibility",
            "Purely mechanical industrial cataloging without human characters",
            "Astronomical orbital telemetry calculations",
            "Subatomic particle collider calibration",
          ],
          answer: "Human resilience, linguistic reflection, and ethical responsibility",
          explanation: `The literary unit "${clean}" focuses on human values, expression, and thematic insight.`,
        },
      ],
      sampleFillBlanks: [
        {
          text: `Fill in the blank with the grammatically correct form: Neither the teacher nor the students ________ (was / were) absent during the session on "${clean}".`,
          answer: "were",
          explanation: "With 'neither...nor', the verb agrees with the nearer subject ('students', plural -> 'were').",
        },
      ],
      sampleTrueFalse: [
        {
          text: `In formal letter and notice writing (${clean}), clarity of subject line, date, and sender designation is mandatory.`,
          answer: "True",
          explanation: "Standard board formatting awards marks for date, salutation/heading, body, and sign-off.",
        },
      ],
      sampleMatchPairs: [
        { left: "Simile", right: "Comparison using 'like' or 'as'" },
        { left: "Alliteration", right: "Repetition of initial consonant sounds" },
      ],
      sampleVeryShort: [
        {
          text: `State the central message conveyed in "${clean}" in one or two complete sentences.`,
          answer: `Model Answer: "${clean}" emphasizes empathy, clarity of thought, and moral awareness through its central narrative.`,
        },
      ],
      sampleShort: [
        {
          text: `How does the author develop the central theme and tone in "${clean}"? Support your answer with textual references.`,
          answer: `Model Answer: The author uses vivid imagery, contrast, and reflective dialogue in "${clean}" to highlight the protagonist's transformation and the deeper moral message.`,
        },
      ],
      sampleLong: [
        {
          text: `Write a comprehensive analytical composition / critical appreciation on "${clean}" covering structure, thematic depth, and real-life relevance.`,
          answer: `Model Answer: 1. Introduction & central theme of "${clean}" [1.5 Marks]. 2. Textual evidence / format accuracy & stylistic devices [2 Marks]. 3. Conclusion & value-based takeaway [1.5 Marks].`,
        },
      ],
    };
  }

  // Social Science, Humanities, Commerce, Computer Science, EVS, etc.
  const clean = cleanChapterTitleForLookup(chapterTitle);
  return {
    chapterTitle,
    canonicalSubject,
    includedTopics: [
      `Core concepts, institutional frameworks, and analytical case studies in ${clean} (${canonicalSubject})`,
    ],
    deletedTopics: [],
    keyFormulasOrConcepts: [`Standard definitions, policy analysis, and domain principles of ${clean} in ${canonicalSubject}`],
    sampleMcqs: [
      {
        text: `Which of the following accurately describes a core principle studied in "${clean}" (${canonicalSubject})?`,
        options: [
          `Systematic analysis of institutional, economic, or societal structures in ${clean}`,
          "Enzymatic phosphorylation of glucose in mitochondrial cristae",
          "Photolytic decomposition of silver halides in a darkroom",
          "Refraction of monochromatic light through an equilateral glass prism",
        ],
        answer: `Systematic analysis of institutional, economic, or societal structures in ${clean}`,
        explanation: `"${clean}" is a core unit of ${canonicalSubject} focusing on domain-specific analysis.`,
      },
    ],
    sampleFillBlanks: [
      {
        text: `In ${canonicalSubject}, the chapter "${clean}" primarily examines ________ frameworks and their practical implications.`,
        answer: `institutional and analytical`,
        explanation: `Core curriculum focus of ${clean} in ${canonicalSubject}.`,
      },
    ],
    sampleTrueFalse: [
      {
        text: `In ${canonicalSubject}, evidence-based analysis of "${clean}" requires evaluating both primary concepts and real-world applications.`,
        answer: "True",
        explanation: `Standard board assessment criterion for ${canonicalSubject}.`,
      },
    ],
    sampleMatchPairs: [
      { left: `Foundational concept of ${clean}`, right: `Primary analytical framework in ${canonicalSubject}` },
      { left: `Applied dimension of ${clean}`, right: `Policy and real-world evaluation in ${canonicalSubject}` },
    ],
    sampleVeryShort: [
      {
        text: `Define the primary concept of "${clean}" in the context of ${className} ${canonicalSubject}.`,
        answer: `Model Answer: In ${canonicalSubject}, "${clean}" refers to the foundational principles and structured mechanisms governing this domain.`,
      },
    ],
    sampleShort: [
      {
        text: `Explain any two key features of "${clean}" studied in ${className} ${canonicalSubject}.`,
        answer: `Model Answer: 1. Structural foundation and definition in ${clean} [1 Mark]. 2. Practical application and significance in ${canonicalSubject} [1 Mark].`,
      },
    ],
    sampleLong: [
      {
        text: `Critically analyze the major features, challenges, and significance of "${clean}" in ${className} ${canonicalSubject}.`,
        answer: `Model Answer: 1. Conceptual introduction to ${clean} [1 Mark]. 2. Key analytical dimensions and examples in ${canonicalSubject} [2 Marks]. 3. Evaluation and conclusion [1 Mark].`,
      },
    ],
  };
}

/**
 * Returns the list of forbidden cross-subject domains for a target canonical subject.
 */
export function getForbiddenDomainsForSubject(canonicalSubject: string): string[] {
  const s = canonicalSubject.toLowerCase();
  if (s === "mathematics") {
    return [
      "Biology cellular metabolism and physiological pathways",
      "Enzymatic involvement and non-living abiotic systems",
      "Photosynthesis, microsporogenesis, and Punnett squares",
      "Lead nitrate, potassium iodide, silver chloride, and rusting chemistry experiments",
    ];
  }
  if (s === "physics") {
    return [
      "Biology cellular metabolism and physiological pathways",
      "Plant/human reproduction and ecological trophic pyramids",
      "Organic chemistry nomenclature and lead nitrate precipitation",
    ];
  }
  if (s === "chemistry") {
    return [
      "Biology physiological regulation and reproductive anatomy",
      "AC generator/transformer circuit derivations",
    ];
  }
  if (s === "biology") {
    return [
      "Physics electrical circuits, resistors, ammeters, voltmeters, and Ohm's law",
      "Pure calculus integration and matrix determinants",
    ];
  }
  if (["english", "hindi", "sanskrit", "history", "political science", "geography", "economics", "accountancy", "business studies", "sociology", "psychology"].includes(s)) {
    return [
      "Biology cellular metabolism, enzymatic pathways, and homeostasis",
      "Chemistry laboratory salt precipitation (PbI2, AgCl, quicklime)",
      "Physics resistor circuits and trigonometry right-triangle calculations",
    ];
  }
  return [];
}

/**
 * Builds and validates the authoritative Subject-Specific Generation Contract before AI generation.
 */
export function buildAndValidateGenerationContract(params: {
  board?: string | null;
  schoolName?: string | null;
  blueprintName?: string | null;
  classId?: string | null;
  className?: string | null;
  academicSession?: string | null;
  examType?: string | null;
  bookId?: string | null;
  subjectId?: string | null;
  subject?: string | null;
  subjectCode?: string | null;
  sectionTitle?: string | null;
  sectionInstructions?: string | null;
  questionType?: string | null;
  sectionType?: string | null;
  marksEach?: number | null;
  difficulty?: string | null;
  language?: string | null;
  requiredCount?: number | null;
  slots?: Array<{
    slotIndex: number;
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    marks: number;
    requiresInternalChoice?: boolean;
  }>;
  validBookChapterIds?: Set<string>;
}): GenerationContractValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const rawSubject = (params.subject || "").trim();
  if (!rawSubject) {
    errors.push("Subject metadata is missing from the generation request.");
  }

  const className = (params.className || "").trim();
  if (!className) {
    errors.push("Class name is missing from the generation request.");
  }

  const qTypeRaw = (params.questionType || params.sectionType || "").trim() as QuestionType;
  if (!qTypeRaw || !QUESTION_TYPES.includes(qTypeRaw)) {
    errors.push(`Invalid or unsupported question type: "${params.questionType || params.sectionType}".`);
  }

  const marksEach = Number(params.marksEach);
  if (!Number.isFinite(marksEach) || marksEach <= 0) {
    errors.push(`Invalid marks allocation (${params.marksEach}); marksEach must be a positive number.`);
  }

  const rawSlots = params.slots || [];
  if (rawSlots.length === 0) {
    errors.push("Generation contract requires at least one chapter slot.");
  }

  const { board, boardDisplayName, canonicalSubject, subjectCode } = resolveBoardAndSubjectCode({
    board: params.board,
    schoolName: params.schoolName,
    blueprintName: params.blueprintName,
    className,
    subject: rawSubject,
    subjectCode: params.subjectCode,
    sectionTitles: params.sectionTitle ? [params.sectionTitle] : [],
    sectionInstructions: params.sectionInstructions ? [params.sectionInstructions] : [],
  });

  if (params.validBookChapterIds && params.validBookChapterIds.size > 0) {
    for (const slot of rawSlots) {
      if (slot.chapterId && !params.validBookChapterIds.has(slot.chapterId)) {
        errors.push(
          `Slot ${slot.slotIndex + 1} references chapterId "${slot.chapterId}" ("${slot.chapterTitle}") which does not belong to the selected ${canonicalSubject} book.`,
        );
      }
    }
  }

  // Detect obvious cross-subject chapter titles (e.g., Biology or Physics chapter passed to Mathematics)
  const CROSS_SUBJECT_CHAPTER_SIGNATURES: Array<{ subject: string; pattern: RegExp }> = [
    {
      subject: "Biology",
      pattern:
        /\b(sexual reproduction in flowering plants|human reproduction|reproductive health|principles of inheritance and variation|molecular basis of inheritance|microbes in human welfare|biotechnology and its applications|ecosystem|biodiversity and conservation)\b/i,
    },
    {
      subject: "Physics",
      pattern:
        /\b(electric charges and fields|electrostatic potential and capacitance|moving charges and magnetism|electromagnetic induction|ray optics and optical instruments|wave optics|dual nature of radiation|semiconductor electronics)\b/i,
    },
    {
      subject: "Chemistry",
      pattern:
        /\b(electrochemistry|chemical kinetics|d and f block elements|coordination compounds|haloalkanes and haloarenes|alcohols,?\s*phenols and ethers|aldehydes,?\s*ketones and carboxylic acids)\b/i,
    },
    {
      subject: "Mathematics",
      pattern:
        /\b(inverse trigonometric functions|matrices|determinants|continuity and differentiability|application of derivatives|application of integrals|differential equations|three dimensional geometry|linear programming)\b/i,
    },
  ];

  if (canonicalSubject !== "Science" && canonicalSubject !== "EVS") {
    for (const slot of rawSlots) {
      const chClean = cleanChapterTitleForLookup(slot.chapterTitle || "");
      for (const sig of CROSS_SUBJECT_CHAPTER_SIGNATURES) {
        if (sig.subject !== canonicalSubject && sig.pattern.test(chClean)) {
          errors.push(
            `Slot ${slot.slotIndex + 1} chapter "${slot.chapterTitle}" belongs to "${sig.subject}", not "${canonicalSubject}".`,
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const academicSession = (params.academicSession || "2026–27").trim();
  const syllabusVersion = `${board}-${academicSession}-RATIONALIZED`;
  const language: "en" | "hi" | "sa" | "bilingual" =
    params.language === "sa" || params.language === "hi" || params.language === "bilingual"
      ? params.language
      : "en";
  const difficulty: "EASY" | "MEDIUM" | "HARD" | "BALANCED" =
    params.difficulty === "EASY" || params.difficulty === "MEDIUM" || params.difficulty === "HARD"
      ? params.difficulty
      : "BALANCED";

  const sectionInternalChoiceRequirement = resolveInternalChoiceRequirement({
    board,
    schoolName: params.schoolName,
    blueprintName: params.blueprintName,
    academicSession,
    className,
    subject: rawSubject,
    subjectCode,
    examType: params.examType,
    sectionTitle: params.sectionTitle,
    sectionInstructions: params.sectionInstructions,
    questionType: qTypeRaw,
    marksEach,
  });

  const slots: GenerationSlotContract[] = rawSlots.map((s, idx) => {
    const slotMarks = Number.isFinite(s.marks) && s.marks > 0 ? s.marks : marksEach;
    const slotChoiceReq = resolveInternalChoiceRequirement({
      board,
      schoolName: params.schoolName,
      blueprintName: params.blueprintName,
      academicSession,
      className,
      subject: rawSubject,
      subjectCode,
      examType: params.examType,
      sectionTitle: params.sectionTitle,
      sectionInstructions: params.sectionInstructions,
      questionType: qTypeRaw,
      marksEach: slotMarks,
    });
    const requiresInternalChoice = slotChoiceReq.forbidden
      ? false
      : typeof s.requiresInternalChoice === "boolean"
      ? s.requiresInternalChoice
      : slotChoiceReq.required;

    return {
      slotIndex: typeof s.slotIndex === "number" ? s.slotIndex : idx,
      chapterId: s.chapterId || `ch_${idx + 1}`,
      chapterNumber: s.chapterNumber || idx + 1,
      chapterTitle: s.chapterTitle || `Chapter ${idx + 1}`,
      marks: slotMarks,
      requiresInternalChoice,
      internalChoiceRequirement: slotChoiceReq,
      curriculumSpec: getChapterCurriculumSpec(rawSubject, s.chapterTitle || `Chapter ${idx + 1}`, className),
    };
  });

  const requiredCount =
    qTypeRaw === "MATCH_COLUMN"
      ? 1
      : params.requiredCount && params.requiredCount > 0
      ? params.requiredCount
      : slots.length;

  const contract: GenerationContract = {
    contractId: `gc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    board,
    boardDisplayName,
    classId: params.classId || className.toLowerCase().replace(/\s+/g, "-"),
    className,
    academicSession,
    syllabusVersion,
    examType: (params.examType || "ANNUAL").trim(),
    bookId: params.bookId || "default_book",
    subjectId: params.subjectId || canonicalSubject.toLowerCase().replace(/\s+/g, "-"),
    rawSubject,
    canonicalSubject,
    subjectCode,
    questionType: qTypeRaw,
    marksEach,
    difficulty,
    language,
    requiredCount,
    sectionTitle: (params.sectionTitle || qTypeRaw).trim(),
    sectionInstructions: params.sectionInstructions || undefined,
    internalChoiceRequirement: sectionInternalChoiceRequirement,
    slots,
    forbiddenCrossSubjectDomains: getForbiddenDomainsForSubject(canonicalSubject),
    provenance: {
      board,
      session: academicSession,
      syllabusVersion,
      subjectCode,
      canonicalSubject,
      examinationPatternVersion: sectionInternalChoiceRequirement.patternVersion,
      circularReference: sectionInternalChoiceRequirement.circularReference,
    },
  };

  return {
    valid: true,
    errors: [],
    warnings,
    contract,
  };
}

export interface GroundedGeneratedQuestion {
  slotIndex: number;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  type: QuestionType;
  text: string;
  options: string[];
  subparts: SubPart[];
  answer: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  cognitiveLevel: string;
  explanation: string;
  figurePrompt?: string;
  requiresInternalChoice?: boolean;
  orQuestion?: {
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    type: QuestionType;
    text: string;
    marks: number;
    options: string[];
    subparts: SubPart[];
    answer: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    cognitiveLevel: string;
    explanation: string;
    figurePrompt?: string;
  };
}

/**
 * Generates curriculum-grounded, subject-and-chapter-specific questions for a validated GenerationContract.
 * Used when operating in offline/test mode without a live Gemini API key.
 * Strictly honors subject, chapter, questionType, marks, internal choice rules, and diagram eligibility without ever emitting cross-subject templates.
 */
export function generateCurriculumGroundedSectionQuestions(
  contract: GenerationContract,
  opts?: { generateDiagrams?: boolean; existingQuestionTexts?: string[] },
): GroundedGeneratedQuestion[] {
  const qType = contract.questionType;
  const isSanskrit = contract.language === "sa";
  const isHindi = contract.language === "hi";
  const isBilingual = contract.language === "bilingual";
  const seenNormalizedTexts = new Set<string>(
    (opts?.existingQuestionTexts || [])
      .map((t) => (t || "").toLowerCase().replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 15),
  );

  const ensureUniqueStem = (baseText: string, cleanCh: string, spec: ChapterCurriculumSpec, idx: number, marks: number): string => {
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    let candidate = baseText;
    if (!seenNormalizedTexts.has(normalize(candidate))) {
      seenNormalizedTexts.add(normalize(candidate));
      return candidate;
    }
    const altTopic = spec.includedTopics[(idx + 1) % Math.max(1, spec.includedTopics.length)] || cleanCh;
    const altConcept = spec.keyFormulasOrConcepts[(idx + 1) % Math.max(1, spec.keyFormulasOrConcepts.length)] || cleanCh;
    candidate = isSanskrit
      ? `${baseText} (${altTopic} तथा ${altConcept} इत्यस्य सन्दर्भे स्पष्टीकुरुत - भागः ${idx + 1})`
      : isHindi
      ? `${baseText} (${altTopic} एवं ${altConcept} के संदर्भ में स्पष्ट कीजिए - भाग ${idx + 1})`
      : `${baseText} (In the context of ${altTopic} using ${altConcept} — Set Q${idx + 1}, ${marks}M)`;
    seenNormalizedTexts.add(normalize(candidate));
    return candidate;
  };

  const buildDistinctOrQuestion = (
    slot: GenerationSlotContract,
    idx: number,
    primaryText: string,
    diff: "EASY" | "MEDIUM" | "HARD",
  ): NonNullable<GroundedGeneratedQuestion["orQuestion"]> => {
    const spec = slot.curriculumSpec;
    const cleanCh = cleanChapterTitleForLookup(slot.chapterTitle);
    const targetMarks = slot.marks || contract.marksEach;

    if (qType === "CASE_STUDY" || qType === "UNSEEN_PASSAGE" || qType === "REFERENCE_CONTEXT") {
      const altTopic = spec.includedTopics[1 % Math.max(1, spec.includedTopics.length)] || spec.includedTopics[0] || cleanCh;
      const altFormula = spec.keyFormulasOrConcepts[1 % Math.max(1, spec.keyFormulasOrConcepts.length)] || spec.keyFormulasOrConcepts[0] || cleanCh;
      const altSa = spec.sampleShort[1 % Math.max(1, spec.sampleShort.length)] || spec.sampleLong[0] || spec.sampleShort[0];
      const altLa = spec.sampleLong[1 % Math.max(1, spec.sampleLong.length)] || spec.sampleLong[0] || spec.sampleShort[0];
      const rawSubparts: SubPart[] = [
        {
          label: "(i)",
          text: `Define or state the condition governing ${altTopic} in ${cleanCh}.`,
          marks: 1,
          answer: altFormula,
        },
        {
          label: "(ii)",
          text: altSa.text,
          marks: 1,
          answer: altSa.answer,
        },
        {
          label: "(iii)",
          text: altLa.text,
          marks: Math.max(1, targetMarks - 2),
          answer: altLa.answer,
        },
      ];
      const normalizedSubparts = normalizeSubpartMarks(rawSubparts, targetMarks);
      const altPassage = isBilingual
        ? `Read the following alternative ${contract.canonicalSubject} case study on ${cleanCh} and answer the sub-questions (निम्नलिखित वैकल्पिक केस स्टडी को पढ़कर प्रश्नों के उत्तर दीजिए):\nAn analytical application of "${cleanCh}" investigates ${altTopic} using the relation ${altFormula}.`
        : isHindi
        ? `अध्याय "${cleanCh}" पर आधारित निम्नलिखित वैकल्पिक केस स्टडी को पढ़कर प्रश्नों के उत्तर दीजिए:\nइस प्रकरण में ${altTopic} तथा ${altFormula} के अनुप्रयोग का विश्लेषण किया गया है।`
        : `Read the following alternative ${contract.canonicalSubject} analytical case study on ${cleanCh} and answer the questions that follow:\nAn applied investigation in "${cleanCh}" models ${altTopic} using the governing principle: ${altFormula}.`;

      return {
        chapterId: slot.chapterId,
        chapterNumber: slot.chapterNumber,
        chapterTitle: slot.chapterTitle,
        type: qType,
        text: ensureUniqueStem(altPassage, cleanCh, spec, idx + 100, targetMarks),
        marks: targetMarks,
        options: [],
        subparts: normalizedSubparts,
        answer: normalizedSubparts.map((sp) => `${sp.label} ${sp.answer}`).join(" | "),
        difficulty: diff,
        cognitiveLevel: "EVALUATING",
        explanation: `Alternative case study grounded in ${cleanCh} (${contract.canonicalSubject}) totaling ${targetMarks} marks.`,
      };
    }

    // Subjective 3m / 4m / 5m / 7m questions
    const primaryPool =
      targetMarks <= 2 || qType === "VERY_SHORT"
        ? spec.sampleVeryShort
        : targetMarks >= 4 || qType === "LONG"
        ? spec.sampleLong
        : spec.sampleShort;
    const secondaryPool =
      targetMarks >= 4 || qType === "LONG" ? spec.sampleShort : spec.sampleLong;

    let altCandidate: { text: string; answer: string } | null = null;
    if (primaryPool.length > 1) {
      altCandidate = primaryPool[(idx + 1) % primaryPool.length];
    } else if (secondaryPool.length > 0 && secondaryPool[0].text !== primaryText) {
      altCandidate = secondaryPool[idx % secondaryPool.length];
    }

    const altTopic =
      spec.includedTopics[(idx + 1) % Math.max(1, spec.includedTopics.length)] ||
      `analytical applications of ${cleanCh}`;
    const altConcept =
      spec.keyFormulasOrConcepts[(idx + 1) % Math.max(1, spec.keyFormulasOrConcepts.length)] ||
      spec.keyFormulasOrConcepts[0] ||
      `standard principles of ${cleanCh}`;

    let altText = altCandidate ? altCandidate.text : "";
    let altAnswer = altCandidate ? altCandidate.answer : "";

    // Ensure the alternative is never identical or a near-paraphrase of primaryText
    if (
      !altText ||
      altText.trim().toLowerCase() === primaryText.trim().toLowerCase()
    ) {
      if (contract.canonicalSubject === "Mathematics") {
        altText = `Establish and apply the property "${altConcept}" to solve a standard ${targetMarks}-mark problem on ${altTopic} in ${cleanCh}.`;
        altAnswer = `Model Answer: 1. State and set up the governing relation: ${altConcept}. [1 Mark]\n2. Apply step-by-step algebraic/calculus simplification for ${altTopic}. [${Math.max(1, targetMarks - 2)} Marks]\n3. Conclude the verified result in ${cleanCh}. [1 Mark]`;
      } else {
        altText = `Analyze the mechanism and practical applications of ${altTopic} in "${cleanCh}" with reference to ${altConcept}.`;
        altAnswer = `Model Answer: 1. Core principle of ${altTopic} in ${cleanCh} [1 Mark]. 2. Detailed explanation of ${altConcept} [${Math.max(1, targetMarks - 2)} Marks]. 3. Verified conclusion and significance [1 Mark].`;
      }
    }

    if (isSanskrit && !/[\u0900-\u097F]/.test(altText)) {
      altText = `पाठः "${cleanCh}" (${altTopic}) इत्यस्य सन्दर्भे: ${altText}`;
    } else if (isHindi && !/[\u0900-\u097F]/.test(altText)) {
      altText = `अध्याय "${cleanCh}" (${altTopic}) के संदर्भ में: ${altText}`;
    } else if (isBilingual && !/[\u0900-\u097F]/.test(altText)) {
      altText = `${altText}\n(अध्याय "${cleanCh}" — ${altTopic} के आधार पर हल कीजिए।)`;
    }

    altText = ensureUniqueStem(altText, cleanCh, spec, idx + 200, targetMarks);
    const formattedAltAnswer = altAnswer.startsWith("Model Answer")
      ? altAnswer
      : `Model Answer: ${altAnswer}`;

    return {
      chapterId: slot.chapterId,
      chapterNumber: slot.chapterNumber,
      chapterTitle: slot.chapterTitle,
      type: qType,
      text: altText,
      marks: targetMarks,
      options: [],
      subparts: [],
      answer: formattedAltAnswer,
      difficulty: diff,
      cognitiveLevel: targetMarks >= 4 ? "EVALUATING" : "APPLYING",
      explanation: `Alternative (OR) curriculum-verified ${contract.canonicalSubject} solution for ${cleanCh} (${targetMarks} marks).`,
    };
  };

  // Special handling for MATCH_COLUMN: 1 combined question covering all slots
  if (qType === "MATCH_COLUMN") {
    const firstSlot = contract.slots[0];
    const targetPairCount = Math.max(
      2,
      contract.slots.length > 1
        ? contract.slots.length
        : contract.marksEach > 1
        ? Math.min(contract.marksEach, 10)
        : 4,
    );

    const collectedPairs: Array<{ left: string; right: string }> = [];
    for (const s of contract.slots) {
      for (const pair of s.curriculumSpec.sampleMatchPairs) {
        if (!collectedPairs.some((p) => p.left === pair.left)) {
          collectedPairs.push({ left: pair.left, right: pair.right });
        }
      }
    }

    // Pad with chapter-specific curriculum concepts if more pairs are needed (e.g. 6 or 7 pairs)
    let padIdx = 0;
    while (collectedPairs.length < targetPairCount) {
      const slot = contract.slots[padIdx % contract.slots.length];
      const cleanCh = cleanChapterTitleForLookup(slot.chapterTitle);
      const topic =
        slot.curriculumSpec.includedTopics[padIdx % slot.curriculumSpec.includedTopics.length] ||
        `Core theorem in ${cleanCh}`;
      const concept =
        slot.curriculumSpec.keyFormulasOrConcepts[padIdx % slot.curriculumSpec.keyFormulasOrConcepts.length] ||
        `Verified relation in ${cleanCh}`;
      const suffix = collectedPairs.length + 1;
      collectedPairs.push({
        left: `${cleanCh}: ${topic.split(":")[0].trim()} (${suffix})`,
        right: `${concept} (${suffix})`,
      });
      padIdx++;
    }

    const activePairs = collectedPairs.slice(0, targetPairCount);
    const deranged = derangeMatchColumnPairs(activePairs);
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const colILines = activePairs.map(
      (p, i) => `(${letters[i] || i + 1}) ${p.left.replace(/^\([A-Za-z0-9]+\)\s*/, "")}`,
    );
    const stemHeader = isSanskrit
      ? "अधोदत्तानां पदानां समुचितं मेलनं कुरुत (स्तम्भ 'अ' सह स्तम्भ 'ब'):"
      : isHindi
      ? "स्तम्भ 'अ' के मदों का स्तम्भ 'ब' के सही विकल्पों से मिलान कीजिए:"
      : isBilingual
      ? "Match the items in Column I with their correct counterparts in Column II (स्तम्भ 'अ' का स्तम्भ 'ब' से सही मिलान कीजिए):"
      : `Match the ${contract.canonicalSubject} concepts in Column I with their correct relations in Column II:`;

    const roman = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];
    const hyphenKey = activePairs
      .map((orig, i) => {
        const dIdx = deranged.pairs.findIndex((dp) => dp.right === orig.right);
        return `(${letters[i] || i + 1})-${roman[dIdx] || `(${dIdx + 1})`}`;
      })
      .join(", ");

    return [
      {
        slotIndex: firstSlot.slotIndex,
        chapterId: firstSlot.chapterId,
        chapterNumber: firstSlot.chapterNumber,
        chapterTitle: firstSlot.chapterTitle,
        type: "MATCH_COLUMN",
        text: `${stemHeader}\nColumn I:\n${colILines.join("\n")}`,
        options: deranged.pairs.map((p) => serializeMatchColumnPair(p.left, p.right)),
        subparts: [],
        answer: `${deranged.answerKey} [${hyphenKey}]`,
        difficulty: contract.difficulty === "BALANCED" ? "MEDIUM" : contract.difficulty,
        cognitiveLevel: "UNDERSTANDING",
        explanation: `Column I items from ${contract.canonicalSubject} are paired with their verified Column II counterparts.`,
      },
    ];
  }

  // Determine which slots can receive a diagram when requested
  const sectionAllowsDiagram = Boolean(
    opts?.generateDiagrams && isSectionVisuallyEligible(qType, contract.rawSubject),
  );
  const visualSlotIndices: number[] = [];
  if (sectionAllowsDiagram) {
    contract.slots.forEach((slot, idx) => {
      if (isSubjectChapterVisual(contract.rawSubject, slot.chapterTitle, qType)) {
        visualSlotIndices.push(idx);
      }
    });
    if (visualSlotIndices.length > 1 && qType === "MCQ") {
      visualSlotIndices.splice(1);
    }
  }

  return contract.slots.map((slot, idx) => {
    const spec = slot.curriculumSpec;
    const cleanCh = cleanChapterTitleForLookup(slot.chapterTitle);
    const diff: "EASY" | "MEDIUM" | "HARD" =
      contract.difficulty === "BALANCED"
        ? idx % 3 === 0
          ? "EASY"
          : idx % 3 === 1
          ? "MEDIUM"
          : "HARD"
        : contract.difficulty;
    const isSlotVisual = visualSlotIndices.includes(idx);

    if (qType === "MCQ") {
      const sample = spec.sampleMcqs[idx % spec.sampleMcqs.length];
      let text = sample.text;
      let figurePrompt: string | undefined;
      if (isSlotVisual) {
        text = `Observe the given diagram for ${cleanCh}. ${sample.text}`;
        figurePrompt = `${contract.canonicalSubject} educational diagram for ${cleanCh} (${contract.className})`;
      }
      if (isSanskrit && !/[\u0900-\u097F]/.test(text)) {
        text = `पाठः "${cleanCh}" इत्यस्य सन्दर्भे: ${text}`;
      } else if (isHindi && !/[\u0900-\u097F]/.test(text)) {
        text = `अध्याय "${cleanCh}" के संदर्भ में: ${text}`;
      } else if (isBilingual && !/[\u0900-\u097F]/.test(text)) {
        text = `${text} (अध्याय "${cleanCh}" के आधार पर सही विकल्प चुनिए।)`;
      }
      text = ensureUniqueStem(text, cleanCh, spec, idx, slot.marks);
      return {
        slotIndex: slot.slotIndex,
        chapterId: slot.chapterId,
        chapterNumber: slot.chapterNumber,
        chapterTitle: slot.chapterTitle,
        type: "MCQ",
        text,
        options: [...sample.options],
        subparts: [],
        answer: sample.answer,
        difficulty: diff,
        cognitiveLevel: "UNDERSTANDING",
        explanation: sample.explanation,
        figurePrompt,
      };
    }

    if (qType === "ASSERTION_REASON") {
      const ar = spec.sampleAssertionReason || {
        assertion: spec.sampleTrueFalse[0]?.text || `In ${cleanCh}, ${spec.keyFormulasOrConcepts[0]}.`,
        reason: spec.sampleMcqs[0]?.explanation || `This follows directly from the fundamental principles of ${cleanCh} in ${contract.canonicalSubject}.`,
        correctOptionIndex: 0 as const,
        explanation: `Both Assertion (A) and Reason (R) are true and (R) correctly explains (A) in ${cleanCh}.`,
      };
      const options = isSanskrit
        ? [
            "अभिकथनं (A) कारणं (R) च उभे सत्ये स्तः, (R) इति (A) इत्यस्य सम्यक् व्याख्या अस्ति।",
            "अभिकथनं (A) कारणं (R) च उभे सत्ये स्तः, परन्तु (R) इति (A) इत्यस्य सम्यक् व्याख्या नास्ति।",
            "अभिकथनं (A) सत्यम् अस्ति, परन्तु कारणं (R) असत्यम् अस्ति।",
            "अभिकथनं (A) असत्यम् अस्ति, परन्तु कारणं (R) सत्यम् अस्ति।",
          ]
        : isHindi
        ? [
            "अभिकथन (A) और कारण (R) दोनों सत्य हैं तथा (R), (A) की सही व्याख्या करता है।",
            "अभिकथन (A) और कारण (R) दोनों सत्य हैं, परन्तु (R), (A) की सही व्याख्या नहीं करता है।",
            "अभिकथन (A) सत्य है, परन्तु कारण (R) असत्य है।",
            "अभिकथन (A) असत्य है, परन्तु कारण (R) सत्य है।",
          ]
        : [
            "Both (A) and (R) are true and (R) is the correct explanation of (A).",
            "Both (A) and (R) are true, but (R) is not the correct explanation of (A).",
            "(A) is true, but (R) is false.",
            "(A) is false, but (R) is true.",
          ];
      return {
        slotIndex: slot.slotIndex,
        chapterId: slot.chapterId,
        chapterNumber: slot.chapterNumber,
        chapterTitle: slot.chapterTitle,
        type: "ASSERTION_REASON",
        text: isSanskrit
          ? `अभिकथनम् (A): ${ar.assertion}\nकारणम् (R): ${ar.reason}`
          : isHindi
          ? `अभिकथन (A): ${ar.assertion}\nकारण (R): ${ar.reason}`
          : `Assertion (A): ${ar.assertion}\nReason (R): ${ar.reason}`,
        options,
        subparts: [],
        answer: options[ar.correctOptionIndex],
        difficulty: diff,
        cognitiveLevel: "ANALYZING",
        explanation: ar.explanation,
      };
    }

    if (qType === "FILL_BLANK") {
      const fb = spec.sampleFillBlanks[idx % spec.sampleFillBlanks.length];
      let text = fb.text.includes("________") ? fb.text : `${fb.text} ________.`;
      if (isSanskrit && !/[\u0900-\u097F]/.test(text)) {
        text = `पाठः "${cleanCh}": ${text}`;
      } else if (isHindi && !/[\u0900-\u097F]/.test(text)) {
        text = `अध्याय "${cleanCh}": ${text}`;
      }
      text = ensureUniqueStem(text, cleanCh, spec, idx, slot.marks);
      return {
        slotIndex: slot.slotIndex,
        chapterId: slot.chapterId,
        chapterNumber: slot.chapterNumber,
        chapterTitle: slot.chapterTitle,
        type: "FILL_BLANK",
        text,
        options: [],
        subparts: [],
        answer: fb.answer,
        difficulty: diff,
        cognitiveLevel: "REMEMBERING",
        explanation: fb.explanation,
      };
    }

    if (qType === "TRUE_FALSE") {
      const tf = spec.sampleTrueFalse[idx % spec.sampleTrueFalse.length];
      let text = tf.text;
      if (isSanskrit && !/[\u0900-\u097F]/.test(text)) {
        text = `कथनम् (${cleanCh}): ${text}`;
      } else if (isHindi && !/[\u0900-\u097F]/.test(text)) {
        text = `कथन (${cleanCh}): ${text}`;
      }
      text = ensureUniqueStem(text, cleanCh, spec, idx, slot.marks);
      return {
        slotIndex: slot.slotIndex,
        chapterId: slot.chapterId,
        chapterNumber: slot.chapterNumber,
        chapterTitle: slot.chapterTitle,
        type: "TRUE_FALSE",
        text,
        options: isSanskrit ? ["आम्", "न"] : isHindi ? ["सत्य", "असत्य"] : ["True", "False"],
        subparts: [],
        answer: isSanskrit ? (tf.answer === "True" ? "आम्" : "न") : isHindi ? (tf.answer === "True" ? "सत्य" : "असत्य") : tf.answer,
        difficulty: diff,
        cognitiveLevel: "UNDERSTANDING",
        explanation: tf.explanation,
      };
    }

    if (qType === "CASE_STUDY" || qType === "UNSEEN_PASSAGE" || qType === "REFERENCE_CONTEXT") {
      const targetMarks = slot.marks || contract.marksEach || 4;
      const vsa = spec.sampleVeryShort[0];
      const sa = spec.sampleShort[0];
      const rawSubparts: SubPart[] = [
        {
          label: "(i)",
          text: vsa.text,
          marks: 1,
          answer: vsa.answer,
        },
        {
          label: "(ii)",
          text: `State the fundamental condition or relation used in ${cleanCh}.`,
          marks: 1,
          answer: spec.keyFormulasOrConcepts[0] || vsa.answer,
        },
        {
          label: "(iii)",
          text: sa.text,
          marks: Math.max(1, targetMarks - 2),
          answer: sa.answer,
        },
      ];
      const normalizedSubparts = normalizeSubpartMarks(rawSubparts, targetMarks);
      const passage = isBilingual
        ? `Read the following ${contract.canonicalSubject} case study on ${cleanCh} carefully and answer the questions that follow (निम्नलिखित केस स्टडी को ध्यानपूर्वक पढ़िए और प्रश्नों के उत्तर दीजिए):\nIn ${contract.className} ${contract.canonicalSubject}, the chapter "${cleanCh}" covers ${spec.includedTopics.join("; ")}. A student applies ${spec.keyFormulasOrConcepts[0]} to solve a practical problem.`
        : isHindi
        ? `अध्याय "${cleanCh}" (${contract.canonicalSubject}) पर आधारित निम्नलिखित गद्यांश को पढ़कर प्रश्नों के उत्तर दीजिए:\n${cleanCh} के अंतर्गत ${spec.includedTopics[0]} का अध्ययन किया जाता है, जिसमें ${spec.keyFormulasOrConcepts[0]} का प्रयोग होता है।`
        : `Read the following ${contract.canonicalSubject} source passage on ${cleanCh} and answer the questions that follow:\nIn ${contract.className} ${contract.canonicalSubject}, "${cleanCh}" establishes ${spec.includedTopics.join("; ")}. Key governing relation: ${spec.keyFormulasOrConcepts[0]}.`;

      const primaryText = ensureUniqueStem(passage, cleanCh, spec, idx, targetMarks);
      const slotRequiresOr = Boolean(
        slot.requiresInternalChoice ?? contract.internalChoiceRequirement?.required,
      );

      return {
        slotIndex: slot.slotIndex,
        chapterId: slot.chapterId,
        chapterNumber: slot.chapterNumber,
        chapterTitle: slot.chapterTitle,
        type: qType,
        text: primaryText,
        options: [],
        subparts: normalizedSubparts,
        answer: normalizedSubparts.map((sp) => `${sp.label} ${sp.answer}`).join(" | "),
        difficulty: diff,
        cognitiveLevel: "ANALYZING",
        explanation: `Case study grounded in ${cleanCh} (${contract.canonicalSubject}) totaling ${targetMarks} marks.`,
        requiresInternalChoice: slotRequiresOr,
        orQuestion: slotRequiresOr ? buildDistinctOrQuestion(slot, idx, primaryText, diff) : undefined,
      };
    }

    // Subjective types: VERY_SHORT, SHORT, LONG, NUMERICAL, WRITING_SKILL, GRAMMAR_DRILL, DRAW, etc.
    const pool =
      slot.marks <= 1 || qType === "VERY_SHORT"
        ? spec.sampleVeryShort
        : slot.marks >= 4 || qType === "LONG"
        ? spec.sampleLong
        : spec.sampleShort;
    const item = pool[idx % pool.length];
    let text = item.text;
    let figurePrompt: string | undefined;

    if (isSlotVisual) {
      if (contract.canonicalSubject === "English" || qType === "WRITING_SKILL") {
        text = `Study the given visual stimulus carefully. ${text}`;
        figurePrompt = `Black and white educational line art visual stimulus for ${cleanCh}`;
      } else {
        text = `Refer to the given diagram for ${cleanCh}. ${text}`;
        figurePrompt = `${contract.canonicalSubject} schematic diagram for ${cleanCh} (${contract.className})`;
      }
    }

    if (isHindi && !/[\u0900-\u097F]/.test(text)) {
      text = `अध्याय "${cleanCh}" के आधार पर: ${text}`;
    } else if (isBilingual && !/[\u0900-\u097F]/.test(text)) {
      text = `${text}\n(अध्याय "${cleanCh}" के संदर्भ में उत्तर लिखिए।)`;
    }
    text = ensureUniqueStem(text, cleanCh, spec, idx, slot.marks);

    const answer = item.answer.startsWith("Model Answer")
      ? item.answer
      : `Model Answer: ${item.answer}`;

    const slotRequiresOr = Boolean(
      slot.requiresInternalChoice ?? contract.internalChoiceRequirement?.required,
    );

    return {
      slotIndex: slot.slotIndex,
      chapterId: slot.chapterId,
      chapterNumber: slot.chapterNumber,
      chapterTitle: slot.chapterTitle,
      type: qType,
      text,
      options: [],
      subparts: [],
      answer,
      difficulty: diff,
      cognitiveLevel: slot.marks >= 4 ? "EVALUATING" : slot.marks >= 2 ? "APPLYING" : "UNDERSTANDING",
      explanation: `Curriculum-verified ${contract.canonicalSubject} solution for ${cleanCh} (${slot.marks} mark${slot.marks > 1 ? "s" : ""}).`,
      figurePrompt,
      requiresInternalChoice: slotRequiresOr,
      orQuestion: slotRequiresOr ? buildDistinctOrQuestion(slot, idx, text, diff) : undefined,
    };
  });
}
