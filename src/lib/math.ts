import katex from "katex";

export type MathSegment =
  | { type: "text"; text: string }
  | { type: "math"; tex: string; display: boolean; html: string };

const MATH_REGEX = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$/g;

const PROSE_WORDS = new Set([
  "the", "is", "are", "was", "were", "and", "or", "not", "of", "in", "to", "for", "with", "on", "at", "by",
  "from", "up", "about", "into", "over", "after", "beneath", "under", "above", "then", "than", "when",
  "where", "which", "who", "whom", "whose", "why", "how", "all", "any", "both", "each", "few", "more",
  "most", "other", "some", "such", "no", "nor", "too", "very", "can", "will", "just", "should", "now",
  "let", "defined", "domain", "relation", "function", "matrix", "matrices", "symmetric", "zero", "identity",
  "derivative", "respect", "value", "equal", "integrating", "factor", "differential", "equation", "events",
  "independent", "principal", "branch", "square", "singular", "polynomial", "continuous", "every", "point",
  "degree", "statement", "correct", "incorrect", "true", "false", "none", "neither", "either", "find",
  "calculate", "evaluate", "prove", "show", "solve", "determine", "state", "write", "explain"
]);

// Non-backtracking linear regexes for inline math constructs
const INLINE_PATTERNS = [
  // 1. Integral: ∫ ... dx
  /∫[^∫\n]+?\s+d[a-zA-Z](?:\b|(?=[,\s\.\?!;:\)\]]|$))/,
  // 2. Inverse trig: cos⁻¹(x) or cos^-1(x)
  /(?:sin|cos|tan)(?:⁻¹|\^-1)\([^\)]+\)/,
  // 3. Square root with function or standalone: cos(√x) or √x or √(x+1)
  /(?:sin|cos|tan|cot|sec|csc|log|ln)?\(?√(?:\([^\)]+\)|[a-zA-Z0-9]+)\)?/,
  // 4. Caret exponent: e^x, e^(-x), y^(3/2), (x+1)^2, 10^5, 2^n
  /(?:[a-zA-Z0-9\)\}]+|\([^\)]+\))\^(?:\([^\)]+\)|-?[a-zA-Z0-9]+)/,
  // 5. Unicode powers: x², (y')²
  /(?:[a-zA-Z0-9\)\}]+|\([^\)]+\))[²³⁴⁵⁶⁷⁸⁹⁰⁺⁻]+/
];

const INLINE_REGEX = new RegExp(INLINE_PATTERNS.map((p) => `(${p.source})`).join("|"), "g");

/**
 * Normalizes natural plain-text math notation (e.g. ∫ e^x [f(x) + f'(x)] dx, e^(-x), √x)
 * into standard LaTeX syntax for KaTeX rendering.
 */
export function convertNaturalMathToTex(raw: string): string {
  let tex = raw.trim();

  // 1. Integrals: replace unicode integral with \int
  tex = tex.replace(/∫/g, "\\int ");

  // 2. Square roots: √(x+1) -> \sqrt{x+1}, √x -> \sqrt{x}
  tex = tex.replace(/√\(([^\)]+)\)/g, "\\sqrt{$1}");
  tex = tex.replace(/√([a-zA-Z0-9]+)/g, "\\sqrt{$1}");

  // 3. Unicode superscripts to LaTeX powers
  tex = tex
    .replace(/⁻¹/g, "^{-1}")
    .replace(/⁻²/g, "^{-2}")
    .replace(/¹/g, "^1")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4")
    .replace(/⁵/g, "^5")
    .replace(/⁶/g, "^6")
    .replace(/⁷/g, "^7")
    .replace(/⁸/g, "^8")
    .replace(/⁹/g, "^9")
    .replace(/⁰/g, "^0")
    .replace(/ⁿ/g, "^n")
    .replace(/⁺/g, "^+")
    .replace(/⁻/g, "^-");

  // 4. Caret with parenthesized exponent: e^(-x) -> e^{-x}, y^(3/2) -> y^{3/2}, (x+1)^(2) -> (x+1)^{2}
  tex = tex.replace(/([\w\)\}])\^\(([^)]+)\)/g, "$1^{$2}");

  // 5. Caret with simple exponent: e^x -> e^{x}, x^2 -> x^{2}, 10^5 -> 10^{5}
  tex = tex.replace(/([\w\)\}])\^([a-zA-Z0-9\-+]+)/g, "$1^{$2}");

  // 6. Common functions in math: sin, cos, tan, sec, csc, cot, log, ln
  tex = tex.replace(/\b(sin|cos|tan|sec|csc|cot|log|ln)\b(?!\s*\{)/g, "\\$1 ");

  // 7. Differentials at end or before closing bracket: dx, dy, dt, dz
  tex = tex.replace(/(\s+)d([a-zA-Z])(?=\s*$|[\),\]])/g, " \\, d$2");

  return tex;
}

/**
 * Replaces common LaTeX syntax with clean Unicode for documents/Word export.
 */
export function cleanLatexToUnicode(str: string): string {
  return str
    .replace(/\$\$([\s\S]+?)\$\$/g, "$1")
    .replace(/\$([^\$\n]+?)\$/g, "$1")
    .replace(/\\int\b/g, "∫")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\sqrt\b/g, "√")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
    .replace(/\\times\b/g, "×")
    .replace(/\\pm\b/g, "±")
    .replace(/\\le\b/g, "≤")
    .replace(/\\ge\b/g, "≥")
    .replace(/\\ne\b/g, "≠")
    .replace(/\\infty\b/g, "∞")
    .replace(/\\pi\b/g, "π")
    .replace(/\\theta\b/g, "θ")
    .replace(/\\alpha\b/g, "α")
    .replace(/\\beta\b/g, "β")
    .replace(/\\gamma\b/g, "γ")
    .replace(/\\lambda\b/g, "λ")
    .replace(/\\in\b/g, "∈")
    .replace(/\\cap\b/g, "∩")
    .replace(/\\cup\b/g, "∪")
    .replace(/\\cdot\b/g, "·")
    .replace(/\\,/g, " ")
    .replace(/\\;/g, " ")
    .replace(/\\quad\b/g, "   ")
    .replace(/\\sin\b/g, "sin")
    .replace(/\\cos\b/g, "cos")
    .replace(/\\tan\b/g, "tan")
    .replace(/\\sec\b/g, "sec")
    .replace(/\\csc\b/g, "csc")
    .replace(/\\cot\b/g, "cot")
    .replace(/\\log\b/g, "log")
    .replace(/\\ln\b/g, "ln");
}

/**
 * Determines whether a string is predominantly a standalone math expression (such as an MCQ option,
 * short formula, set, or interval) rather than prose text.
 */
export function isEntirelyMath(str: string): boolean {
  const trimmed = str.trim();
  if (!trimmed) return false;
  if (/^\$([^\$]+)\$$|^\$\$([\s\S]+)\$\$$/.test(trimmed)) return true;

  // If text contains Devanagari script, it's prose / Hindi text
  if (/[\u0900-\u097F]/.test(trimmed)) return false;

  const words = trimmed.toLowerCase().match(/[a-z]{2,}/g) || [];
  const allowedMathWords = new Set(["sin", "cos", "tan", "cot", "sec", "csc", "log", "ln", "exp", "lim", "det", "min", "max"]);

  for (const w of words) {
    if (allowedMathWords.has(w)) continue;
    if (PROSE_WORDS.has(w)) return false;
  }

  const hasMathChars =
    trimmed.includes("^") ||
    trimmed.includes("∫") ||
    trimmed.includes("√") ||
    trimmed.includes("±") ||
    trimmed.includes("≤") ||
    trimmed.includes("≥") ||
    trimmed.includes("≠") ||
    trimmed.includes("∈") ||
    trimmed.includes("∉") ||
    trimmed.includes("∩") ||
    trimmed.includes("∪") ||
    trimmed.includes("π") ||
    trimmed.includes("⁻¹") ||
    trimmed.includes("²") ||
    trimmed.includes("³") ||
    /f'?\(x\)/.test(trimmed) ||
    /dy\/dx/.test(trimmed) ||
    /\b(sin|cos|tan|sec|log)\b/.test(trimmed) ||
    /^[0-9\.\,\s\+\-\*\/\(\)\{\}\[\]=]+$/.test(trimmed) ||
    /^[A-Za-z]\s*[\+\-\*\/=]\s*[A-Za-z0-9]/.test(trimmed);

  return hasMathChars;
}

/**
 * Scans a plain text fragment for inline natural math (e.g. ∫ e^x [f(x)+f'(x)] dx, e^(-x), √x, etc.)
 * and converts detected math fragments to KaTeX-rendered segments.
 */
function parseInlineMathFragments(plainText: string): MathSegment[] {
  if (!plainText) return [];

  // If the entire text chunk is a standalone math expression, render as one math formula
  if (isEntirelyMath(plainText)) {
    const tex = convertNaturalMathToTex(plainText.replace(/^\$|\$$/g, ""));
    try {
      const html = katex.renderToString(tex, {
        displayMode: false,
        throwOnError: false,
        output: "htmlAndMathml",
      });
      return [{ type: "math", tex, display: false, html }];
    } catch {
      return [{ type: "text", text: plainText }];
    }
  }

  const segments: MathSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  INLINE_REGEX.lastIndex = 0;

  while ((match = INLINE_REGEX.exec(plainText)) !== null) {
    const matchStart = match.index;
    const matchEnd = INLINE_REGEX.lastIndex;
    const rawMatch = match[0];

    if (matchStart > lastIndex) {
      segments.push({
        type: "text",
        text: plainText.slice(lastIndex, matchStart),
      });
    }

    const tex = convertNaturalMathToTex(rawMatch);
    try {
      const html = katex.renderToString(tex, {
        displayMode: false,
        throwOnError: false,
        output: "htmlAndMathml",
      });
      segments.push({
        type: "math",
        tex,
        display: false,
        html,
      });
    } catch {
      segments.push({
        type: "text",
        text: rawMatch,
      });
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < plainText.length) {
    segments.push({
      type: "text",
      text: plainText.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Parses a string into plain text segments and KaTeX rendered math segments.
 * Supports both explicit LaTeX ($...$, $$...$$) and natural mathematical plain text
 * (integrals, carets like e^x or y^(3/2), square roots, inverse trig, unicode powers).
 */
export function parseMathSegments(input: string): MathSegment[] {
  if (!input) return [];

  const segments: MathSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  MATH_REGEX.lastIndex = 0;

  while ((match = MATH_REGEX.exec(input)) !== null) {
    const matchStart = match.index;
    const matchEnd = MATH_REGEX.lastIndex;

    // Process preceding text slice for natural math expressions
    if (matchStart > lastIndex) {
      const slice = input.slice(lastIndex, matchStart);
      segments.push(...parseInlineMathFragments(slice));
    }

    const isDisplay = match[1] !== undefined;
    const tex = (isDisplay ? match[1] : match[2])?.trim() ?? "";

    if (tex) {
      try {
        const html = katex.renderToString(tex, {
          displayMode: isDisplay,
          throwOnError: false,
          output: "htmlAndMathml",
        });
        segments.push({
          type: "math",
          tex,
          display: isDisplay,
          html,
        });
      } catch {
        // Fallback to raw text if KaTeX encounters an unhandled error
        segments.push({
          type: "text",
          text: match[0],
        });
      }
    } else {
      segments.push({
        type: "text",
        text: match[0],
      });
    }

    lastIndex = matchEnd;
  }

  // Process remaining text slice
  if (lastIndex < input.length) {
    const slice = input.slice(lastIndex);
    segments.push(...parseInlineMathFragments(slice));
  }

  return segments;
}
