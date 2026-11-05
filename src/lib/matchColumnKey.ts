/**
 * Lays out a "Match the Columns" question and writes its answer key.
 *
 * The model returns Column I (in the question text), Column II (in "options", usually already shuffled) and a key
 * such as "(A)-(iii), (B)-(i), (C)-(ii)". Pairing Column I[i] with options[i] by position is only correct when the
 * key is the identity; otherwise the true pairs are lost and every derived key collapses to "(A)-(i), (B)-(ii)...".
 * So the model's own key is honoured first, and only when it is missing or the identity do we shuffle Column II
 * ourselves (so the printed paper does not show every answer on the same row) and compute the key from that shuffle.
 */
import { cleanMatchItem, derangeMatchColumnPairs, parseMatchColumnPairs, type MatchColumnPair } from "./constants";
import { matchPairs } from "./answerKeyCheck";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const ROMANS = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];
const ROMAN_INDEX: Record<string, number> = Object.fromEntries(ROMANS.map((r, i) => [r.slice(1, -1), i]));

/** Column II position (0-based) per Column I item, or null unless the key is a complete one-to-one mapping for n items. */
export function parseMatchKey(answer: string, n: number): number[] | null {
  const map = matchPairs(answer || "");
  if (n < 2 || map.size < n) return null;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const label = map.get(LETTERS[i]);
    if (!label) return null;
    const idx = /^\d+$/.test(label) ? Number(label) - 1 : ROMAN_INDEX[label];
    if (idx === undefined || !(idx >= 0 && idx < n)) return null;
    out.push(idx);
  }
  return new Set(out).size === n ? out : null;
}

export function formatMatchKey(positions: number[]): string {
  return positions.map((pos, i) => `(${LETTERS[i] ?? i + 1})-${ROMANS[pos] ?? `(${pos + 1})`}`).join(", ");
}

export interface MatchColumnLayout {
  /** Column II items, in the order they are printed. */
  column2: string[];
  /** e.g. "(A)-(iii), (B)-(i), (C)-(ii)", consistent with `column2`. */
  answer: string;
}

/**
 * @param pairs        Column I item paired with the Column II item found at the same position (or the true pair when
 *                     the model wrote the options as "left ||| right").
 * @param rawOptions   The options exactly as the model returned them.
 * @param modelAnswer  The model's key.
 */
export function layoutMatchColumn(pairs: MatchColumnPair[], rawOptions: string[], modelAnswer: string): MatchColumnLayout {
  const n = pairs.length;
  const optionsAreInlinePairs = parseMatchColumnPairs(rawOptions, "", null).some((p) => p.right);

  if (!optionsAreInlinePairs) {
    // pairs[i].right is simply options[i]; the model's key says which option really belongs to each Column I item.
    const key = parseMatchKey(modelAnswer, n);
    if (key && key.some((pos, i) => pos !== i)) {
      return { column2: pairs.map((p) => cleanMatchItem(p.right)), answer: formatMatchKey(key) };
    }
  }

  // The pairs are the truth here: shuffle Column II ourselves and derive the key from that shuffle.
  if (n < 2) {
    return { column2: pairs.map((p) => cleanMatchItem(p.right)), answer: formatMatchKey(pairs.map((_, i) => i)) };
  }
  const deranged = derangeMatchColumnPairs(pairs);
  // derangeMatchColumnPairs puts the answer of item i at position (i + 1) % n.
  return {
    column2: deranged.map((p) => cleanMatchItem(p.right)),
    answer: formatMatchKey(pairs.map((_, i) => (i + 1) % n)),
  };
}
