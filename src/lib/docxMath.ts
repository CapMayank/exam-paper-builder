import { TextRun } from "docx";
import { cleanLatexToUnicode } from "./math";

export interface DocxTextStyle {
  font?: string;
  size?: number;
  bold?: boolean;
  italics?: boolean;
  color?: string;
}

const SCRIPT_REGEX = /([\w\)\}\]])(?:\^|\_)(\{([^}]+)\}|\(([^)]+)\)|([a-zA-Z0-9\-+]+))/g;

/**
 * Parses a string containing mathematical text (including caret exponents like e^x, y^(3/2),
 * integrals ∫, and LaTeX math) into Word docx TextRuns with true superscripts/subscripts.
 */
export function formatMathTextRuns(
  text: string,
  baseStyle: DocxTextStyle = { font: "Times New Roman" },
): TextRun[] {
  if (!text) return [new TextRun({ text: "", ...baseStyle })];

  let cleaned = cleanLatexToUnicode(text);

  // Normalize unicode superscripts to caret notation for consistent Word OpenXML superscripting
  cleaned = cleaned
    .replace(/⁻¹/g, "^-1")
    .replace(/⁻²/g, "^-2")
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
    .replace(/⁻/g, "^-")
    .replace(/₁/g, "_1")
    .replace(/₂/g, "_2")
    .replace(/₃/g, "_3")
    .replace(/₄/g, "_4")
    .replace(/₅/g, "_5")
    .replace(/₆/g, "_6")
    .replace(/₇/g, "_7")
    .replace(/₈/g, "_8")
    .replace(/₉/g, "_9")
    .replace(/₀/g, "_0")
    .replace(/ₙ/g, "_n");

  const runs: TextRun[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  SCRIPT_REGEX.lastIndex = 0;

  while ((match = SCRIPT_REGEX.exec(cleaned)) !== null) {
    const matchStart = match.index;
    const matchEnd = SCRIPT_REGEX.lastIndex;
    const base = match[1];
    const isSuper = match[0].charAt(base.length) === "^";
    const scriptContent = match[3] || match[4] || match[5];

    // Push text before match
    if (matchStart > lastIndex) {
      runs.push(
        new TextRun({
          text: cleaned.slice(lastIndex, matchStart),
          ...baseStyle,
        }),
      );
    }

    // Push base
    runs.push(
      new TextRun({
        text: base,
        ...baseStyle,
      }),
    );

    // Push superscript or subscript
    if (isSuper) {
      runs.push(
        new TextRun({
          text: scriptContent,
          superScript: true,
          ...baseStyle,
        }),
      );
    } else {
      runs.push(
        new TextRun({
          text: scriptContent,
          subScript: true,
          ...baseStyle,
        }),
      );
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < cleaned.length) {
    runs.push(
      new TextRun({
        text: cleaned.slice(lastIndex),
        ...baseStyle,
      }),
    );
  }

  return runs.length > 0 ? runs : [new TextRun({ text: cleaned, ...baseStyle })];
}

/**
 * Formats a two-column MCQ option pair into Word TextRuns with aligned column spacing.
 */
export function formatOptionPairRuns(
  leftOpt: string,
  rightOpt: string,
  baseStyle: DocxTextStyle = { font: "Times New Roman" },
  colWidth = 45,
): TextRun[] {
  const leftRuns = formatMathTextRuns(leftOpt, baseStyle);

  if (!rightOpt) {
    return leftRuns;
  }

  // Calculate visible characters in left side (excluding caret/underscore syntax)
  const leftVisibleLen = leftOpt.replace(/[\^_\{\}\$]/g, "").length;
  const paddingLen = Math.max(2, colWidth - leftVisibleLen);

  // Add padding spaces after the last run of left option
  leftRuns.push(new TextRun({ text: " ".repeat(paddingLen), ...baseStyle }));

  const rightRuns = formatMathTextRuns(rightOpt, baseStyle);
  return [...leftRuns, ...rightRuns];
}
