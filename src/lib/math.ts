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
 * Finds the index of the matching closing brace '}' for the opening brace at startIndex.
 * Respects escaped braces '\{' and '\}'. Returns -1 if unbalanced or invalid.
 */
export function findMatchingBrace(str: string, startIndex: number): number {
  if (startIndex < 0 || startIndex >= str.length || str[startIndex] !== "{") return -1;
  let depth = 0;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === "{" && (i === 0 || str[i - 1] !== "\\")) {
      depth++;
    } else if (str[i] === "}" && (i === 0 || str[i - 1] !== "\\")) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Replaces common LaTeX syntax with clean Unicode for documents/Word export.
 * Safely handles arbitrarily nested curly braces in fractions, roots, and text formatting.
 */
export function cleanLatexToUnicode(str: string): string {
  let s = str
    .replace(/\$\$([\s\S]+?)\$\$/g, "$1")
    .replace(/\$([^\$\n]+?)\$/g, "$1");

  // 1. Dual-argument fractions (\frac, \dfrac, \tfrac, \cfrac, \binom) with balanced braces
  const fracRegex = /\\(?:[dts]?frac|binom|cfrac)\b/;
  let fMatch: RegExpMatchArray | null;
  while ((fMatch = s.match(fracRegex)) !== null && fMatch.index !== undefined) {
    const macroStart = fMatch.index;
    let idx = macroStart + fMatch[0].length;
    while (idx < s.length && /\s/.test(s[idx])) idx++;
    if (s[idx] === "{") {
      const numEnd = findMatchingBrace(s, idx);
      if (numEnd !== -1) {
        const rawNum = s.slice(idx + 1, numEnd);
        let denIdx = numEnd + 1;
        while (denIdx < s.length && /\s/.test(s[denIdx])) denIdx++;
        if (s[denIdx] === "{") {
          const denEnd = findMatchingBrace(s, denIdx);
          if (denEnd !== -1) {
            const rawDen = s.slice(denIdx + 1, denEnd);
            const cleanNum = cleanLatexToUnicode(rawNum.trim());
            const cleanDen = cleanLatexToUnicode(rawDen.trim());
            const wrapNum = /^[a-zA-Z0-9]+$/.test(cleanNum) ? cleanNum : `(${cleanNum})`;
            const wrapDen = /^[a-zA-Z0-9]+$/.test(cleanDen) ? cleanDen : `(${cleanDen})`;
            const replacement = `${wrapNum}/${wrapDen}`;
            s = s.slice(0, macroStart) + replacement + s.slice(denEnd + 1);
            continue;
          }
        }
        // Single argument: \frac{num} without denominator
        const cleanNum = cleanLatexToUnicode(rawNum.trim());
        const replacement = `(${cleanNum})`;
        s = s.slice(0, macroStart) + replacement + s.slice(numEnd + 1);
        continue;
      }
    }
    // If syntax wasn't matched with braces, strip the macro name to avoid infinite loop
    s = s.slice(0, macroStart) + s.slice(macroStart + fMatch[0].length);
  }

  // 2. Square roots (\sqrt) with balanced braces
  const sqrtRegex = /\\sqrt\b/;
  let sqMatch: RegExpMatchArray | null;
  while ((sqMatch = s.match(sqrtRegex)) !== null && sqMatch.index !== undefined) {
    const macroStart = sqMatch.index;
    let idx = macroStart + sqMatch[0].length;
    while (idx < s.length && /\s/.test(s[idx])) idx++;
    let degree = "";
    if (s[idx] === "[") {
      const closeBracket = s.indexOf("]", idx);
      if (closeBracket !== -1) {
        degree = s.slice(idx + 1, closeBracket).trim();
        idx = closeBracket + 1;
        while (idx < s.length && /\s/.test(s[idx])) idx++;
      }
    }
    if (s[idx] === "{") {
      const argEnd = findMatchingBrace(s, idx);
      if (argEnd !== -1) {
        const rawArg = s.slice(idx + 1, argEnd);
        const cleanArg = cleanLatexToUnicode(rawArg.trim());
        const prefix = degree ? `${degree}√` : "√";
        const replacement = `${prefix}(${cleanArg})`;
        s = s.slice(0, macroStart) + replacement + s.slice(argEnd + 1);
        continue;
      }
    }
    s = s.slice(0, macroStart) + "√" + s.slice(macroStart + sqMatch[0].length);
  }

  // 3. Text & font formatting macros with balanced braces
  const textMacroRegex = /\\(?:text|mathrm|textit|textbf|operatorname|mathbf|mathbb|mathcal)\b/;
  let tmMatch: RegExpMatchArray | null;
  while ((tmMatch = s.match(textMacroRegex)) !== null && tmMatch.index !== undefined) {
    const macroStart = tmMatch.index;
    let idx = macroStart + tmMatch[0].length;
    while (idx < s.length && /\s/.test(s[idx])) idx++;
    if (s[idx] === "{") {
      const argEnd = findMatchingBrace(s, idx);
      if (argEnd !== -1) {
        const rawContent = s.slice(idx + 1, argEnd);
        const replacement = cleanLatexToUnicode(rawContent);
        s = s.slice(0, macroStart) + replacement + s.slice(argEnd + 1);
        continue;
      }
    }
    s = s.slice(0, macroStart) + s.slice(macroStart + tmMatch[0].length);
  }

  // 4. Diacritics with balanced braces
  const diacriticMap: Record<string, string> = {
    vec: "\u20D7",
    hat: "\u0302",
    bar: "\u0304",
    overline: "\u0304",
    dot: "\u0307",
    ddot: "\u0308",
  };
  const diacriticRegex = /\\(vec|hat|bar|overline|dot|ddot)\b/;
  let dMatch: RegExpMatchArray | null;
  while ((dMatch = s.match(diacriticRegex)) !== null && dMatch.index !== undefined) {
    const macroStart = dMatch.index;
    const char = diacriticMap[dMatch[1]] || "";
    let idx = macroStart + dMatch[0].length;
    while (idx < s.length && /\s/.test(s[idx])) idx++;
    if (s[idx] === "{") {
      const argEnd = findMatchingBrace(s, idx);
      if (argEnd !== -1) {
        const rawContent = s.slice(idx + 1, argEnd);
        const replacement = `${cleanLatexToUnicode(rawContent)}${char}`;
        s = s.slice(0, macroStart) + replacement + s.slice(argEnd + 1);
        continue;
      }
    }
    s = s.slice(0, macroStart) + s.slice(macroStart + dMatch[0].length);
  }

  return s
    .replace(/\\int\b/g, "∫")
    .replace(/\\times\b/g, "×")
    .replace(/\\div\b/g, "÷")
    .replace(/\\pm\b/g, "±")
    .replace(/\\mp\b/g, "∓")
    .replace(/\\(?:leq?|le)\b/g, "≤")
    .replace(/\\(?:geq?|ge)\b/g, "≥")
    .replace(/\\(?:neq?|ne)\b/g, "≠")
    .replace(/\\approx\b/g, "≈")
    .replace(/\\equiv\b/g, "≡")
    .replace(/\\infty\b/g, "∞")
    .replace(/\\(?:rightarrow|to)\b/g, "→")
    .replace(/\\leftarrow\b/g, "←")
    .replace(/\\leftrightarrow\b/g, "↔")
    .replace(/\\Rightarrow\b/g, "⇒")
    .replace(/\\Leftarrow\b/g, "⇐")
    .replace(/\\Leftrightarrow\b/g, "⇔")
    .replace(/\\Delta\b/g, "Δ")
    .replace(/\\delta\b/g, "δ")
    .replace(/\\pi\b/g, "π")
    .replace(/\\theta\b/g, "θ")
    .replace(/\\alpha\b/g, "α")
    .replace(/\\beta\b/g, "β")
    .replace(/\\gamma\b/g, "γ")
    .replace(/\\lambda\b/g, "λ")
    .replace(/\\mu\b/g, "μ")
    .replace(/\\sigma\b/g, "σ")
    .replace(/\\Sigma\b/g, "Σ")
    .replace(/\\omega\b/g, "ω")
    .replace(/\\Omega\b/g, "Ω")
    .replace(/\\phi\b/g, "φ")
    .replace(/\\Phi\b/g, "Φ")
    .replace(/\\in\b/g, "∈")
    .replace(/\\notin\b/g, "∉")
    .replace(/\\subset\b/g, "⊂")
    .replace(/\\subseteq\b/g, "⊆")
    .replace(/\\supset\b/g, "⊃")
    .replace(/\\supseteq\b/g, "⊇")
    .replace(/\\cap\b/g, "∩")
    .replace(/\\cup\b/g, "∪")
    .replace(/\\emptyset\b/g, "∅")
    .replace(/\\therefore\b/g, "∴")
    .replace(/\\because\b/g, "∵")
    .replace(/\\angle\b/g, "∠")
    .replace(/\\parallel\b/g, "∥")
    .replace(/\\perp\b/g, "⊥")
    .replace(/\\triangle\b/g, "△")
    .replace(/\\(?:dots|ldots|cdots)\b/g, "…")
    .replace(/\\degree\b/g, "°")
    .replace(/\^\\circ\b/g, "°")
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
    .replace(/\\ln\b/g, "ln")
    .replace(/\\sum\b/g, "∑")
    .replace(/\\prod\b/g, "∏")
    .replace(/\\partial\b/g, "∂")
    .replace(/\\nabla\b/g, "∇")
    .replace(/\\vec\{([^}]+)\}/g, "$1⃗")
    .replace(/\\hat\{([^}]+)\}/g, "$1̂")
    .replace(/\\bar\{([^}]+)\}/g, "$1̄")
    .replace(/\\overline\{([^}]+)\}/g, "$1̄")
    .replace(/\\dot\{([^}]+)\}/g, "$1̇")
    .replace(/\\ddot\{([^}]+)\}/g, "$1̈")
    .replace(/\\circ\b/g, "°")
    .replace(/\\rho\b/g, "ρ")
    .replace(/\\tau\b/g, "τ")
    .replace(/\\epsilon\b/g, "ε")
    .replace(/\\eta\b/g, "η")
    .replace(/\\zeta\b/g, "ζ")
    .replace(/\\chi\b/g, "χ")
    .replace(/\\psi\b/g, "ψ")
    .replace(/\\Psi\b/g, "Ψ")
    .replace(/\\Gamma\b/g, "Γ")
    .replace(/\\Lambda\b/g, "Λ")
    .replace(/\\Theta\b/g, "Θ");
}

export interface ParsedTableData {
  headers: string[];
  rows: string[][];
}

export interface ExtractedTableResult {
  before: string;
  table: ParsedTableData | null;
  after: string;
  prefixText: string;
  suffixText: string;
}

/**
 * Extracts embedded LaTeX array environments (e.g. from MathToolbar) or Markdown tables
 * from a question prompt string so document exporters can render them as true native tables.
 */
export function extractTableFromText(text: string): ExtractedTableResult {
  if (!text) return { before: "", prefixText: "", table: null, after: "", suffixText: "" };

  // 1. Check for LaTeX array / tabular environment: \begin{array}{...} ... \end{array}
  const arrayMatch = text.match(/(\\begin\{(?:array|tabular)\}\s*\{[^}]*\}[\s\S]*?\\end\{(?:array|tabular)\})/);
  if (arrayMatch && arrayMatch.index !== undefined) {
    const fullMatch = arrayMatch[1];
    let before = text.slice(0, arrayMatch.index).trim();
    if (before.endsWith("$$")) before = before.slice(0, -2).trim();
    if (before.endsWith("$")) before = before.slice(0, -1).trim();
    let after = text.slice(arrayMatch.index + fullMatch.length).trim();
    if (after.startsWith("$$")) after = after.slice(2).trim();
    if (after.startsWith("$")) after = after.slice(1).trim();

    const inside = fullMatch
      .replace(/\\begin\{(?:array|tabular)\}\s*\{[^}]*\}/, "")
      .replace(/\\end\{(?:array|tabular)\}/, "");

    const hasHline = inside.includes("\\hline");

    const rawRows = inside
      .split(/\\\\|\\cr/)
      .map((r) => r.replace(/\\hline/g, "").trim())
      .filter((r) => r.length > 0);

    const parsedRows = rawRows.map((r) =>
      r.split("&").map((cell) => cleanLatexToUnicode(cell.trim())),
    );

    if (parsedRows.length > 0) {
      const headers = hasHline ? parsedRows[0] : [];
      const rows = hasHline ? parsedRows.slice(1) : parsedRows;
      return {
        before,
        prefixText: before,
        table: { headers, rows },
        after,
        suffixText: after,
      };
    }
  }

  // 2. Check for Markdown table (with or without separator row)
  const lines = text.split(/\r?\n/);
  let tableStart = -1;
  let tableEnd = -1;
  let hasSeparator = false;

  for (let i = 0; i < lines.length - 1; i++) {
    const l1 = lines[i].trim();
    const l2 = lines[i + 1].trim();
    if (l1.includes("|") && l2.includes("|")) {
      tableStart = i;
      if (/^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(l2)) {
        hasSeparator = true;
        tableEnd = i + 2;
      } else {
        hasSeparator = false;
        tableEnd = i + 1;
      }
      while (tableEnd < lines.length && lines[tableEnd].trim().includes("|")) {
        tableEnd++;
      }
      break;
    }
  }

  if (tableStart !== -1 && tableEnd > tableStart + 1) {
    const splitTableRowCells = (row: string): string[] => {
      const cells: string[] = [];
      let current = "";
      let inMath = false;
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === "$" && (i === 0 || row[i - 1] !== "\\")) {
          inMath = !inMath;
          current += ch;
        } else if (ch === "|" && !inMath) {
          cells.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      cells.push(current.trim());
      return cells.filter((c, idx, arr) => (idx === 0 && !c ? false : idx === arr.length - 1 && !c ? false : true));
    };

    const before = lines.slice(0, tableStart).join("\n").trim();
    const after = lines.slice(tableEnd).join("\n").trim();
    const headerLine = lines[tableStart].trim();
    const headers = splitTableRowCells(headerLine);

    const rows: string[][] = [];
    const rowStartIdx = hasSeparator ? tableStart + 2 : tableStart + 1;
    for (let r = rowStartIdx; r < tableEnd; r++) {
      const rowLine = lines[r].trim();
      if (!rowLine) continue;
      const cells = splitTableRowCells(rowLine);
      rows.push(cells);
    }

    return {
      before,
      prefixText: before,
      table: { headers, rows },
      after,
      suffixText: after,
    };
  }

  return { before: text, prefixText: text, table: null, after: "", suffixText: "" };
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
    /\\(frac|sqrt|alpha|beta|gamma|theta|lambda|pm|times|div|le|ge|ne|leq|geq|neq|rightarrow|to|Delta|int|sum|prod)\b/.test(trimmed) ||
    /f'?\(x\)/.test(trimmed) ||
    /dy\/dx/.test(trimmed) ||
    /\b(sin|cos|tan|sec|log)\b/.test(trimmed) ||
    /^[0-9\.\,\s\+\-\*\/\(\)\{\}\[\]=]+$/.test(trimmed) ||
    /^[A-Za-z]\s*[\+\-\*\/=]\s*[A-Za-z0-9]/.test(trimmed);

  return hasMathChars;
}

/**
 * Automatically repairs common LaTeX syntax defects produced by LLMs or user input:
 * - Unbalanced or unclosed curly braces: \frac{x -> \frac{x}{}
 * - Unfinished dual-argument macros like \frac{num} without a denominator
 * - Dangling unescaped trailing backslashes
 * - Dangling trailing carets or underscores (^ or _)
 * - Unclosed matrix/cases/aligned LaTeX environments
 */
export function repairLatex(raw: string): string {
  let tex = raw.trim();
  if (!tex) return "";

  // 1. Strip trailing unescaped backslashes (e.g. \sqrt{x}\ -> \sqrt{x})
  tex = tex.replace(/(^|[^\\])(\\\\)*\\$/, "$1").trim();

  // 2. Balance curly braces (ignoring escaped \{ and \})
  let openCount = 0;
  for (let i = 0; i < tex.length; i++) {
    if (tex[i] === "{" && (i === 0 || tex[i - 1] !== "\\")) {
      openCount++;
    } else if (tex[i] === "}" && (i === 0 || tex[i - 1] !== "\\")) {
      if (openCount > 0) openCount--;
    }
  }
  while (openCount > 0) {
    tex += "}";
    openCount--;
  }

  // 3. Dual-argument macros: if \frac{...} or \binom{...} is not followed by another '{', append '{}'
  const dualMacroRegex = /\\(?:[dts]?frac|binom|cfrac)\b/g;
  let dmMatch: RegExpExecArray | null;
  while ((dmMatch = dualMacroRegex.exec(tex)) !== null) {
    let idx = dmMatch.index + dmMatch[0].length;
    while (idx < tex.length && /\s/.test(tex[idx])) idx++;
    if (idx >= tex.length) {
      tex += "{}{}";
      break;
    }
    if (tex[idx] === "{") {
      const firstEnd = findMatchingBrace(tex, idx);
      if (firstEnd !== -1) {
        let secondIdx = firstEnd + 1;
        while (secondIdx < tex.length && /\s/.test(tex[secondIdx])) secondIdx++;
        if (secondIdx >= tex.length || tex[secondIdx] !== "{") {
          tex = tex.slice(0, firstEnd + 1) + "{}" + tex.slice(firstEnd + 1);
          dualMacroRegex.lastIndex = firstEnd + 3;
        }
      }
    }
  }

  // 4. Trailing dangling ^ or _
  tex = tex.replace(/[\^_]\s*$/, "");

  // 5. Balance unclosed \left delimiters
  const leftMatches = tex.match(/\\left[\(\[\{\|\.\\]|\\left\b/g) || [];
  const rightMatches = tex.match(/\\right[\)\]\}\|\.\\]|\\right\b/g) || [];
  let unclosedLefts = leftMatches.length - rightMatches.length;
  while (unclosedLefts > 0) {
    tex += " \\right.";
    unclosedLefts--;
  }

  // 6. Balance common unclosed LaTeX environments via stack tracking
  const envTokenRegex = /\\(begin|end)\{([a-zA-Z*]+)\}/g;
  let match: RegExpExecArray | null;
  const envStack: string[] = [];
  while ((match = envTokenRegex.exec(tex)) !== null) {
    const kind = match[1];
    const name = match[2];
    if (kind === "begin") {
      envStack.push(name);
    } else if (kind === "end") {
      const lastIdx = envStack.lastIndexOf(name);
      if (lastIdx !== -1) {
        envStack.splice(lastIdx, 1);
      }
    }
  }
  while (envStack.length > 0) {
    const unclosed = envStack.pop()!;
    tex += ` \\end{${unclosed}}`;
  }

  return tex;
}

/**
 * Safely renders a LaTeX math expression to KaTeX HTML.
 * Attempts original rendering first; if that fails, attempts auto-repair via repairLatex.
 * If all rendering attempts fail, falls back to clean Unicode/plain text rather than
 * exposing a red KaTeX parse error banner to teachers and students.
 */
export function safeRenderLatex(
  tex: string,
  isDisplay: boolean = false,
): { html: string; success: boolean; tex: string } {
  const trimmed = tex.trim();
  if (!trimmed) return { html: "", success: true, tex: "" };

  // 1. First attempt: render original LaTeX with strict throwOnError
  try {
    const html = katex.renderToString(trimmed, {
      displayMode: isDisplay,
      throwOnError: true,
      output: "htmlAndMathml",
    });
    return { html, success: true, tex: trimmed };
  } catch {
    // Original failed, try auto-repairing
  }

  // 2. Second attempt: repair broken braces, unclosed environments, missing denominators
  const repaired = repairLatex(trimmed);
  try {
    const html = katex.renderToString(repaired, {
      displayMode: isDisplay,
      throwOnError: true,
      output: "htmlAndMathml",
    });
    return { html, success: true, tex: repaired };
  } catch {
    // Repaired attempt still failed
  }

  // 3. Graceful fallback: clean readable Unicode text rather than an ugly red KaTeX error box
  const clean = cleanLatexToUnicode(trimmed)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const fallbackHtml = isDisplay
    ? `<span class="math-fallback-block my-1.5 block text-center font-sans font-medium">${clean}</span>`
    : `<span class="math-fallback-inline mx-0.5 font-sans font-medium">${clean}</span>`;

  return { html: fallbackHtml, success: false, tex: trimmed };
}

/**
 * Scans a plain text fragment for inline natural math (e.g. ∫ e^x [f(x)+f'(x)] dx, e^(-x), √x, etc.)
 * and converts detected math fragments to KaTeX-rendered segments.
 */
function parseInlineMathFragments(rawText: string): MathSegment[] {
  if (!rawText) return [];

  // Clean raw LaTeX formatting commands that were output outside math mode
  const plainText = rawText
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\mathrm\{([^}]+)\}/g, "$1")
    .replace(/\\textit\{([^}]+)\}/g, "$1")
    .replace(/\\textbf\{([^}]+)\}/g, "$1")
    .replace(/\\operatorname\{([^}]+)\}/g, "$1");

  // If the entire text chunk is a standalone math expression, render as one math formula
  if (isEntirelyMath(plainText)) {
    const tex = convertNaturalMathToTex(plainText.replace(/^\$|\$$/g, ""));
    const rendered = safeRenderLatex(tex, false);
    return [{ type: "math", tex: rendered.tex, display: false, html: rendered.html }];
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
    const rendered = safeRenderLatex(tex, false);
    segments.push({
      type: "math",
      tex: rendered.tex,
      display: false,
      html: rendered.html,
    });

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

  // If input has an unclosed single dollar ($) containing LaTeX indicators, safely close it
  let sanitizedInput = input;
  const dollarCount = (input.match(/(^|[^\\])\$/g) || []).length;
  if (dollarCount % 2 !== 0) {
    const lastDollarIdx = input.lastIndexOf("$");
    if (lastDollarIdx !== -1) {
      const trailing = input.slice(lastDollarIdx + 1);
      if (/[\\^_{}=+]/.test(trailing)) {
        sanitizedInput = input + "$";
      }
    }
  }

  const segments: MathSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  MATH_REGEX.lastIndex = 0;

  while ((match = MATH_REGEX.exec(sanitizedInput)) !== null) {
    const matchStart = match.index;
    const matchEnd = MATH_REGEX.lastIndex;

    // Process preceding text slice for natural math expressions
    if (matchStart > lastIndex) {
      const slice = sanitizedInput.slice(lastIndex, matchStart);
      segments.push(...parseInlineMathFragments(slice));
    }

    const isDisplay = match[1] !== undefined;
    const tex = (isDisplay ? match[1] : match[2])?.trim() ?? "";

    if (tex) {
      const rendered = safeRenderLatex(tex, isDisplay);
      segments.push({
        type: "math",
        tex: rendered.tex,
        display: isDisplay,
        html: rendered.html,
      });
    } else {
      segments.push({
        type: "text",
        text: match[0],
      });
    }

    lastIndex = matchEnd;
  }

  // Process remaining text slice
  if (lastIndex < sanitizedInput.length) {
    const slice = sanitizedInput.slice(lastIndex);
    segments.push(...parseInlineMathFragments(slice));
  }

  return segments;
}
