/**
 * Stage 3 of AI paper generation: an independent check of objective answer keys.
 *
 * The setter writes an objective item together with its key (it needs the key to build the distractors).
 * A second model call solves the same item without seeing that key; when the two disagree, either the key
 * is wrong or the question has more than one defensible answer. Either way a teacher should look at it.
 * Nothing is overwritten: disagreements are reported, not "fixed".
 *
 * Pure: compares answers, no I/O.
 */
import { normalizeMcqAnswer } from "./constants";

/** Question types whose key is short enough to compare mechanically. */
export const KEY_CHECK_TYPES = new Set(["MCQ", "ASSERTION_REASON", "TRUE_FALSE", "FILL_BLANK", "MATCH_COLUMN"]);

export interface KeyDisagreement {
  questionId: string;
  /** e.g. "Section A · Q3" or "Section C · Q2 (OR)" */
  label: string;
  type: string;
  text: string;
  storedAnswer: string;
  solverAnswer: string;
}

export interface KeyCheckReport {
  /** Objective questions both answered and compared. */
  checked: number;
  disagreements: KeyDisagreement[];
  /** Questions the solver gave no comparable answer for (batch failed, or reply unreadable). */
  unchecked: number;
}

function mcqLetter(answer: string, options: string[]): string | null {
  const { letter } = normalizeMcqAnswer(answer, options);
  return /^[A-F]$/.test(letter) ? letter : null;
}

/** True / False / null (not a truth value) for English, Hindi and Sanskrit keys. False is tested first: "असत्य" contains "सत्य". */
export function truthValue(answer: string): boolean | null {
  const a = answer.trim().toLowerCase();
  if (!a) return null;
  if (/\bfalse\b|^f$|असत्य|गलत|अशुद्ध|^न[\s.।]*$|^न\s*\(/.test(a)) return false;
  if (/\btrue\b|^t$|सत्य|सही|शुद्ध|^आम्/.test(a)) return true;
  return null;
}

function plainWords(s: string): string {
  return s
    .toLowerCase()
    .replace(/\$/g, "")
    .replace(/[\s"'“”‘’.,;:!?()[\]।]+/g, " ")
    .trim();
}

/** Column I label → Column II label, from "(A)-(ii), (B) → (iv)" / "A-2, B-1" / "A: iii". Empty when unreadable. */
export function matchPairs(answer: string): Map<string, string> {
  const pairs = new Map<string, string>();
  const re = /\(?\s*([A-Za-zक-ह])\s*\)?\s*(?:-+>?|→|⟶|–|—|=|:|>)\s*\(?\s*([ivxlcdm]+|\d+|[a-zक-ह])\s*\)?/gi;
  for (let m = re.exec(answer); m; m = re.exec(answer)) pairs.set(m[1].toUpperCase(), m[2].toLowerCase());
  return pairs;
}

/**
 * Whether a stored key and the solver's answer agree. Null when they cannot be compared (unreadable answer,
 * unsupported type), which counts as "not checked" rather than as a disagreement.
 */
export function keysAgree(type: string, options: string[], stored: string, solved: string): boolean | null {
  if (!stored.trim() || !solved.trim()) return null;
  if (type === "MCQ" || type === "ASSERTION_REASON") {
    const a = mcqLetter(stored, options);
    const b = mcqLetter(solved, options);
    return a && b ? a === b : null;
  }
  if (type === "TRUE_FALSE") {
    const a = truthValue(stored);
    const b = truthValue(solved);
    return a === null || b === null ? null : a === b;
  }
  if (type === "FILL_BLANK") {
    const a = plainWords(stored);
    const b = plainWords(solved);
    if (!a || !b) return null;
    // "photosynthesis" vs "Photosynthesis." or "the mitochondria" vs "mitochondria"
    return a === b || ` ${a} `.includes(` ${b} `) || ` ${b} `.includes(` ${a} `);
  }
  if (type === "MATCH_COLUMN") {
    const a = matchPairs(stored);
    const b = matchPairs(solved);
    if (a.size < 2 || b.size < 2) return null;
    for (const [left, right] of a) {
      if (b.has(left) && b.get(left) !== right) return false;
    }
    return true;
  }
  return null;
}
