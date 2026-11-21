// Where the correct answers sit on a paper. A student must not be able to score from a pattern: the correct option
// always (a), the same letter three times running, or a match question whose second column is printed opposite its
// matches. This module plans option orders for a whole paper, moving each answer key with its option, and reports
// how the answers are spread. It is pure; answerPositionsDb applies a plan to the stored questions.

import { canonicalMcqAnswer } from "./constants";

export type Rand = () => number;

const LETTERS = "ABCDEF";
const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];

/** Options whose meaning depends on where they sit ("All of the above", "Both (a) and (b)", "A and B"), in English or Hindi. */
const POSITION_DEPENDENT = /\b(?:above|both|neither|none of|all of|any of)\b|\((?:[a-d])\)|\b[A-D]\s*(?:and|&|,)\s*[A-D]\b|उपरोक्त|इनमें से|दोनों|कोई नहीं|सभी/i;

/** One multiple-choice item: a whole MCQ, or an MCQ part of a case study / passage (key "questionId#path"). */
export type McqUnit = { key: string; options: string[]; answer: string; movable: boolean; /** May be shuffled while unanswered (just imported). */ fresh?: boolean };
/** One match-the-column question. `options` are its rows: "left ||| right" pairs, or second-column items only. */
export type MatchUnit = { key: string; text: string; options: string[]; answer: string; movable: boolean; fresh?: boolean };

export type McqChange = { options: string[]; answer: string };
export type MatchChange = { options: string[]; answer: string };

function shuffled<T>(items: readonly T[], rand: Rand): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The option index an MCQ's answer points to, -1 when it has none, null when it cannot be read as one option. */
export function mcqAnswerIndex(options: readonly string[], answer: string): number | null {
  const raw = (answer ?? "").trim();
  if (!raw) return -1;
  const letter = canonicalMcqAnswer(raw, [...options]).trim().toUpperCase();
  const idx = letter.length === 1 ? LETTERS.indexOf(letter) : -1;
  return idx >= 0 && idx < options.length ? idx : null;
}

export function mcqCanMove(options: readonly string[]): boolean {
  return options.length >= 3 && options.length <= LETTERS.length && !options.some((o) => POSITION_DEPENDENT.test(o));
}

/** Options reordered so the option at `from` lands at `to`, the others shuffled around it. */
function placeAt(options: readonly string[], from: number, to: number, rand: Rand): string[] {
  const others = shuffled(
    options.map((_, i) => i).filter((i) => i !== from),
    rand,
  );
  const out: string[] = [];
  let k = 0;
  for (let pos = 0; pos < options.length; pos++) out.push(pos === to ? options[from] : options[others[k++]]);
  return out;
}

/**
 * Option orders for a paper's MCQs, in paper order. Answered items are spread so each letter is used about equally
 * and no letter comes three times running; an item already in an acceptable place is left alone. Items without an
 * answer are shuffled only when `shuffleUnanswered` (their position is unknown, so a random order is the best
 * guess). Items that cannot move (shared with other papers, position-dependent options) still count in the spread.
 */
export function planMcqPositions(units: readonly McqUnit[], rand: Rand, opts: { shuffleUnanswered?: boolean } = {}): Map<string, McqChange> {
  const changes = new Map<string, McqChange>();
  const answered = units.filter((u) => {
    const idx = mcqAnswerIndex(u.options, u.answer);
    return idx !== null && idx >= 0;
  }).length;
  const cap = Math.max(1, Math.ceil(answered / 4));
  const counts = [0, 0, 0, 0, 0, 0];
  const recent: number[] = [];

  const record = (pos: number) => {
    counts[pos]++;
    recent.push(pos);
  };
  const makesRun = (pos: number) => recent.length >= 2 && recent[recent.length - 1] === pos && recent[recent.length - 2] === pos;

  for (const u of units) {
    const idx = mcqAnswerIndex(u.options, u.answer);
    if (idx === null) continue; // unreadable key: never move, never count
    const movable = u.movable && mcqCanMove(u.options);
    if (idx < 0) {
      if (movable && opts.shuffleUnanswered && u.fresh !== false) {
        const order = shuffled(
          u.options.map((_, i) => i),
          rand,
        );
        changes.set(u.key, { options: order.map((i) => u.options[i]), answer: u.answer });
      }
      continue;
    }
    if (!movable || (counts[idx] < cap && !makesRun(idx))) {
      record(idx);
      continue;
    }
    const n = u.options.length;
    const allowed = Array.from({ length: n }, (_, p) => p).filter((p) => !makesRun(p));
    const least = Math.min(...allowed.map((p) => counts[p]));
    const choices = allowed.filter((p) => counts[p] === least);
    const to = choices[Math.floor(rand() * choices.length)];
    changes.set(u.key, { options: placeAt(u.options, idx, to, rand), answer: LETTERS[to] });
    record(to);
  }
  return changes;
}

// ---------- match the columns ----------

const PAIR = /\s*\|\|\|\s*/;

/** The second-column label a key uses ("iii", "3", "c") as a row index, or -1. */
function rightIndex(label: string): number {
  const l = label.toLowerCase();
  const r = ROMAN.indexOf(l);
  if (r >= 0) return r;
  if (/^\d+$/.test(l)) return Number(l) - 1;
  if (/^[a-z]$/.test(l)) return l.charCodeAt(0) - 97;
  return -1;
}

/** "A → iii, B → i" read as first-column row → second-column row, or null when any pair is unreadable. */
export function parseMatchKey(answer: string, rows: number): Map<number, number> | null {
  const re = /\(?\s*([A-Za-z])\s*\)?\s*(?:-+>?|→|⟶|–|—|=|:|>)\s*\(?\s*([ivxlcdm]+|\d+|[a-z])\s*\)?/gi;
  const map = new Map<number, number>();
  for (let m = re.exec(answer); m; m = re.exec(answer)) {
    const left = m[1].toUpperCase().charCodeAt(0) - 65;
    const right = rightIndex(m[2]);
    if (left < 0 || left >= rows || right < 0 || right >= rows) return null;
    map.set(left, right);
  }
  return map.size === rows ? map : null;
}

export function formatMatchKey(map: Map<number, number>): string {
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([l, r]) => `(${String.fromCharCode(65 + l)}) → (${ROMAN[r] ?? r + 1})`)
    .join(", ");
}

/** True when some first-column item is printed directly opposite its match. */
export function matchHasOppositePair(answer: string, rows: number): boolean {
  const key = parseMatchKey(answer, rows);
  return Boolean(key && [...key.entries()].some(([l, r]) => l === r));
}

/**
 * A match question rearranged so no first-column item sits opposite its match, with the key rewritten.
 * Second-column items move; first-column items stay. Returns null when nothing needs to change or it cannot be
 * done safely (an unreadable key; ready-made pairs with no key, whose correct matches are unknown).
 */
export function planMatch(u: MatchUnit, rand: Rand, opts: { shuffleUnanswered?: boolean } = {}): MatchChange | null {
  const n = u.options.length;
  if (!u.movable || n < 2 || n > ROMAN.length) return null;
  const paired = u.options.some((o) => o.includes("|||"));
  const rows = u.options.map((o) => {
    const parts = o.split(PAIR);
    return paired ? { left: parts[0] ?? "", right: parts.slice(1).join(" ||| ") } : { left: "", right: o };
  });
  const hasKey = u.answer.trim().length > 0;
  const key = hasKey ? parseMatchKey(u.answer, n) : null;
  if (hasKey && !key) return null;
  if (!key && (paired || !opts.shuffleUnanswered || u.fresh === false)) return null;
  if (key && ![...key.entries()].some(([l, r]) => l === r)) return null; // already fine

  // perm[newRow] = old second-column row; with a key, A_i's match must not land on row i, otherwise nothing stays put
  const ok = (perm: number[]) =>
    key ? [...key.entries()].every(([l, r]) => perm.indexOf(r) !== l) : perm.every((old, row) => old !== row);
  let perm = Array.from({ length: n }, (_, i) => i);
  let found = false;
  for (let t = 0; t < 200 && !found; t++) {
    perm = shuffled(perm, rand);
    found = ok(perm);
  }
  if (!found) {
    perm = Array.from({ length: n }, (_, i) => (i + 1) % n);
    if (!ok(perm)) return null;
  }
  const options = perm.map((old, row) => (paired ? `${rows[row].left} ||| ${rows[old].right}` : rows[old].right));
  const answer = key ? formatMatchKey(new Map([...key.entries()].map(([l, r]) => [l, perm.indexOf(r)]))) : u.answer;
  return { options, answer };
}

// ---------- report ----------

export type PositionReport = {
  /** Answered MCQs per correct letter, A first. */
  counts: number[];
  answered: number;
  /** Longest run of one letter in paper order. */
  longestRun: number;
  /** Match questions with an item printed opposite its match. */
  matchOpposite: number;
};

export function positionReport(mcqs: readonly McqUnit[], matches: readonly MatchUnit[]): PositionReport {
  const counts = [0, 0, 0, 0];
  let answered = 0;
  let longestRun = 0;
  let run = 0;
  let prev = -1;
  for (const u of mcqs) {
    const idx = mcqAnswerIndex(u.options, u.answer);
    if (idx === null || idx < 0) continue;
    answered++;
    if (idx < 4) counts[idx]++;
    run = idx === prev ? run + 1 : 1;
    prev = idx;
    longestRun = Math.max(longestRun, run);
  }
  const matchOpposite = matches.filter((m) => matchHasOppositePair(m.answer, m.options.length)).length;
  return { counts, answered, longestRun, matchOpposite };
}

/** True when the spread is lopsided enough to tell the teacher: a run of 3+, or one letter far above its share. */
export function reportNeedsBalancing(r: PositionReport): boolean {
  if (r.matchOpposite > 0 || r.longestRun >= 3) return true;
  if (r.answered < 4) return false;
  return Math.max(...r.counts) > Math.ceil(r.answered / 4) + 1;
}
