import { equalPartMarks, type SubPart } from "./types";

/**
 * Known sequences of subpart labels for ordered progression detection.
 */
const DEVANAGARI_CONSONANTS = [
  "क", "ख", "ग", "घ", "ङ", "च", "छ", "ज", "झ", "ञ", "ट", "ठ", "ड", "ढ", "ण", "त", "थ", "द", "ध", "न", "प", "फ", "ब", "भ", "म"
];

const DEVANAGARI_DIGITS = ["१", "२", "३", "४", "५", "६", "७", "८", "९", "१०"];

/** (1), (2), (3)... as written for lists of features, items or tasks (e.g. map work: "locate any four of the following"). */
const LATIN_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const LATIN_LOWER = [
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t"
];

const ROMAN_LOWER = [
  "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"
];

export interface DecomposedSubpartsResult {
  stem: string;
  subparts: SubPart[];
  attemptCount?: number;
}

/**
 * Detects internal choice (e.g. "Attempt any 4 of the following") in stem text.
 */
export function detectAttemptCount(stem: string): number | undefined {
  if (!stem) return undefined;

  // Sanskrit attempt indicators
  if (/केषाञ्चित्\s+चतुर्णां|केषाञ्चित्\s+चत्वारि|चत्वारि\s+वाक्यानि|चतुर्णां\s+प्रश्नानां/i.test(stem)) return 4;
  if (/केषाञ्चित्\s+त्रयाणां|केषाञ्चित्\s+त्रीणि|त्रीणि\s+वाक्यानि|त्रयाणां\s+प्रश्नानां/i.test(stem)) return 3;
  if (/द्वयोः\s+वाक्ययोः|द्वयोः\s+प्रश्नायोः|द्वे\s+वाक्ये|द्वयोः/i.test(stem)) return 2;
  if (/केषाञ्चित्\s+पञ्चानां|पञ्च\s+वाक्यानि|पञ्चानां/i.test(stem)) return 5;
  if (/केषाञ्चित्\s+षण्णां|षट्\s+वाक्यानि|षण्णां/i.test(stem)) return 6;

  // Hindi attempt indicators
  if (/किन्हीं\s*(?:चार|4)|कोई\s*(?:चार|4)/i.test(stem)) return 4;
  if (/किन्हीं\s*(?:तीन|3)|कोई\s*(?:तीन|3)/i.test(stem)) return 3;
  if (/किन्हीं\s*(?:दो|2)|कोई\s*(?:दो|2)/i.test(stem)) return 2;
  if (/किन्हीं\s*(?:पाँच|पांच|5)|कोई\s*(?:पाँच|पांच|5)/i.test(stem)) return 5;
  if (/किन्हीं\s*(?:छह|छः|6)|कोई\s*(?:छह|छः|6)/i.test(stem)) return 6;
  // "any one" is checked after the larger counts so those keep priority.
  // The word or digit must end there: "एक" not followed by a further Devanagari
  // letter, sign or digit (so not "एकल"; the danda । and ॥ may follow), "1" not
  // followed by another digit (so not "10", "12").
  if (/(?:किसी|कोई|किन्हीं)\s*(?:एक(?![\u0900-\u0963\u0966-\u097F])|1(?![0-9\u0966-\u096F]))/i.test(stem)) return 1;

  // English attempt indicators
  const enMatch = stem.match(/(?:attempt|answer)\s+any\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/i) ||
                  stem.match(/any\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:of\s+the\s+following|questions|sentences|parts|items)/i);
  if (enMatch) {
    const val = enMatch[1].toLowerCase();
    const map: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10
    };
    if (map[val]) return map[val];
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) return n;
  }

  if (/\bany\s+(?:one\b|1(?![0-9\u0966-\u096F]))/i.test(stem)) return 1;

  return undefined;
}

/**
 * A list of parts typed into the question text, with the question's marks shared equally over the parts a
 * student answers (four blanks in a 2-mark question carry ½ each). A part's marks are 0, meaning "print no
 * marks against it", when the question's marks are unknown or do not divide into quarter marks.
 */
export function decomposeForSlot(text: string, slotMarks?: number | null): DecomposedSubpartsResult | null {
  const decomposed = decomposeStemSubparts(text);
  if (!decomposed) return null;
  const n = decomposed.subparts.length;
  const answered = decomposed.attemptCount && decomposed.attemptCount < n ? decomposed.attemptCount : n;
  const each = typeof slotMarks === "number" ? equalPartMarks(slotMarks, answered) ?? 0 : 0;
  return { ...decomposed, subparts: decomposed.subparts.map((sp) => ({ ...sp, marks: each })) };
}

/**
 * Checks whether a character position in text is inside LaTeX math ($...$, $$...$$, \(...\), \[...\]).
 */
function isInsideMath(text: string, pos: number): boolean {
  // Check $$ ... $$
  let inDoubleDollar = false;
  let idx = 0;
  while ((idx = text.indexOf("$$", idx)) !== -1) {
    if (idx > pos) break;
    inDoubleDollar = !inDoubleDollar;
    idx += 2;
  }
  if (inDoubleDollar) return true;

  // Check $ ... $
  let inDollar = false;
  idx = 0;
  while ((idx = text.indexOf("$", idx)) !== -1) {
    if (idx > pos) break;
    // ensure not escaped
    if (idx === 0 || text[idx - 1] !== "\\") {
      inDollar = !inDollar;
    }
    idx += 1;
  }
  if (inDollar) return true;

  // Check \( ... \) and \[ ... \]
  const openParen = text.lastIndexOf("\\(", pos);
  const closeParen = text.lastIndexOf("\\)", pos);
  if (openParen !== -1 && openParen > closeParen) return true;

  const openBracket = text.lastIndexOf("\\[", pos);
  const closeBracket = text.lastIndexOf("\\]", pos);
  if (openBracket !== -1 && openBracket > closeBracket) return true;

  return false;
}

/**
 * Checks if a matched parenthesis looks like a chemical formula or math expression.
 * e.g. Ca(OH)2, (x + 1)(x - 2), (dy/dx)
 */
function isFalsePositiveParenthesis(text: string, matchIndex: number, matchStr: string): boolean {
  // Check chemical formula: previous non-space char is uppercase element or element abbreviation
  if (matchIndex > 0) {
    const prevChar = text[matchIndex - 1];
    if (/[A-Z][a-z]?/.test(prevChar)) {
      return true; // e.g. Ca(, Fe(
    }
  }

  // Check chemical formula: immediately followed by digit subscript, e.g. (OH)2, (SO4)3
  const afterPos = matchIndex + matchStr.length;
  if (afterPos < text.length && /^\d/.test(text.slice(afterPos))) {
    return true;
  }

  // Check mathematical expressions inside parentheses: contains +, -, *, =, ^, /
  const inner = matchStr.replace(/^\(|\)$/g, "").trim();
  if (/[+\-*=^<>]/.test(inner)) {
    return true;
  }

  // Check common parenthetical words
  if (/^(?:e\.g\.|i\.e\.|approx|see\s+fig|fig\.|figure|in\s+cm|in\s+m|marks?|or|and)$/i.test(inner)) {
    return true;
  }

  return false;
}

interface MarkerMatch {
  label: string;
  rawMarker: string;
  index: number;
  length: number;
  seqIndex: number;
}

/**
 * Tries to find an ordered sequence of markers matching a reference sequence.
 * Requires at least 2 consecutive markers starting at seqIndex 0 or 1.
 */
function findSequenceMatches(
  text: string,
  refSeq: string[],
  patternBuilder: (item: string) => RegExp
): MarkerMatch[] | null {
  const matches: MarkerMatch[] = [];
  let searchFrom = 0;

  for (let i = 0; i < refSeq.length; i++) {
    const item = refSeq[i];
    const regex = patternBuilder(item);
    regex.lastIndex = searchFrom;
    const match = regex.exec(text);
    if (!match) {
      if (matches.length >= 2) {
        // We collected at least 2 consecutive markers, reached the end of the sequence
        break;
      }
      if (i === 0) {
        // First item didn't match, sequence not present
        return null;
      }
      break;
    }

    const markerText = match[1] || match[0];
    const offsetInMatch = match[0].indexOf(markerText);
    const absIndex = match.index + (offsetInMatch >= 0 ? offsetInMatch : 0);

    // Safety checks
    if (isInsideMath(text, absIndex)) {
      return null;
    }
    if (isFalsePositiveParenthesis(text, absIndex, markerText)) {
      return null;
    }

    // Verify it's either at a newline or preceded by punctuation/whitespace
    if (absIndex > 0) {
      const charBefore = text[absIndex - 1];
      if (!/[\s\n\r।.:\-]/.test(charBefore)) {
        return null;
      }
    }

    matches.push({
      label: `(${item})`,
      rawMarker: markerText,
      index: absIndex,
      length: markerText.length,
      seqIndex: i,
    });

    searchFrom = absIndex + markerText.length;
  }

  return matches.length >= 2 ? matches : null;
}

/**
 * Conservatively decomposes question text into a stem and structured subparts
 * if and only if an unambiguous, sequential, non-mathematical subpart list is detected.
 *
 * Never alters mathematical formulas, chemical compounds, or ambiguous prose.
 */
export function decomposeStemSubparts(
  text: string,
  existingSubparts?: SubPart[],
  defaultMarksEach: number = 1
): DecomposedSubpartsResult | null {
  if (!text || typeof text !== "string") return null;

  // If subparts already exist and are non-empty, do not decompose plain text
  if (Array.isArray(existingSubparts) && existingSubparts.length > 0) {
    return null;
  }

  // 1. Try Devanagari Consonants: (क), (ख), (ग)...
  let matches = findSequenceMatches(text, DEVANAGARI_CONSONANTS, (item) => new RegExp(`(?:^|\\s|[\\n।.:\\-])(\\(${item}\\)|${item}\\.)(?=\\s|$)`, "g"));

  // 2. Try Latin Lowercase: (a), (b), (c)...
  if (!matches) {
    matches = findSequenceMatches(text, LATIN_LOWER, (item) => new RegExp(`(?:^|\\s|[\\n.:\\-])(\\(${item}\\)|${item}\\.)(?=\\s|$)`, "g"));
  }

  // 3. Try Roman Numerals: (i), (ii), (iii)...
  if (!matches) {
    matches = findSequenceMatches(text, ROMAN_LOWER, (item) => new RegExp(`(?:^|\\s|[\\n.:\\-])(\\(${item}\\)|${item}\\.)(?=\\s|$)`, "g"));
  }

  // 4. Try Devanagari Digits: (१), (२), (३)...
  if (!matches) {
    matches = findSequenceMatches(text, DEVANAGARI_DIGITS, (item) => new RegExp(`(?:^|\\s|[\\n।.:\\-])(\\(${item}\\)|${item}\\.)(?=\\s|$)`, "g"));
  }

  // 5. Try Latin digits in brackets: (1), (2), (3)... Only the bracketed form: a bare "1." is a decimal or a sentence number.
  if (!matches) {
    matches = findSequenceMatches(text, LATIN_DIGITS, (item) => new RegExp(`(?:^|\\s|[\\n।.:\\-])(\\(${item}\\))(?=\\s|$)`, "g"));
  }

  if (!matches || matches.length < 2) {
    return null;
  }

  // Ensure stem has sufficient content (e.g. instruction)
  const firstMatch = matches[0];
  const stem = text.slice(0, firstMatch.index).trim();
  if (!stem) {
    return null;
  }

  const subparts: SubPart[] = [];
  for (let i = 0; i < matches.length; i++) {
    const curr = matches[i];
    const startPos = curr.index + curr.length;
    const endPos = i + 1 < matches.length ? matches[i + 1].index : text.length;
    let itemText = text.slice(startPos, endPos).trim();
    // items run together in a sentence ("(1) a river, (2) a plateau, and (3) a state"): drop the joining punctuation
    if (i + 1 < matches.length) {
      itemText = itemText.replace(/[,;]?\s+(?:and|or)\s*$/i, "").replace(/[,;]\s*$/, "").trim();
    }

    if (!itemText) {
      // Empty subpart content indicates false match
      return null;
    }

    subparts.push({
      label: curr.label,
      text: itemText,
      marks: defaultMarksEach,
    });
  }

  if (subparts.length < 2) {
    return null;
  }

  const attemptCount = detectAttemptCount(stem);

  return {
    stem,
    subparts,
    attemptCount,
  };
}
