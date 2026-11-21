// Questions pasted from another chat AI often carry a pattern in where the answers sit: the correct option always
// first (or always (b)), or a match question's second column listed in the same order as the first. The app
// rearranges them on import so the printed position of an answer says nothing, whatever the other AI did.

import { canonicalMcqAnswer } from "./constants";
import { LETTERS } from "./multiset";
import { normalizeQuestionType, type ImportedPaperQuestion, type ImportedPaperSubpart, type PaperImportData } from "./paperImport";

type Rand = () => number;

/** Options whose meaning depends on where they sit ("All of the above", "Both (a) and (b)", "A and B"), in English or Hindi. */
const POSITION_DEPENDENT = /\b(?:above|both|neither|none of|all of|any of)\b|\((?:[a-d])\)|\b[A-D]\s*(?:and|&|,)\s*[A-D]\b|उपरोक्त|इनमें से|दोनों|कोई नहीं|सभी/i;

function shuffled<T>(items: readonly T[], rand: Rand): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A random order of 0..n-1 in which no index stays where it was (n >= 2). */
export function derangement(n: number, rand: Rand): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return idx;
  for (let tries = 0; tries < 50; tries++) {
    const p = shuffled(idx, rand);
    if (p.every((v, i) => v !== i)) return p;
  }
  return idx.map((_, i) => (i + 1) % n); // a rotation never leaves anything in place
}

/**
 * An MCQ's options in a random order, with its answer moved to the new letter. Left as it is when an option refers
 * to another by position, or when there is an answer that cannot be pinned to one option (moving the options would
 * then make the key wrong).
 */
export function scrambleMcq(options: readonly string[], answer: string | undefined, rand: Rand): { options: string[]; answer: string | undefined } {
  const opts = [...options];
  if (opts.length < 3 || opts.some((o) => POSITION_DEPENDENT.test(o))) return { options: opts, answer };
  const raw = (answer ?? "").trim();
  let correct = -1;
  if (raw) {
    const letter = canonicalMcqAnswer(raw, opts).trim().toUpperCase();
    correct = letter.length === 1 ? LETTERS.indexOf(letter) : -1;
    if (correct < 0 || correct >= opts.length) return { options: opts, answer };
  }
  const order = shuffled(
    opts.map((_, i) => i),
    rand,
  );
  return {
    options: order.map((i) => opts[i]),
    answer: correct >= 0 ? LETTERS[order.indexOf(correct)] : answer,
  };
}

/**
 * A match question's second column moved so no item stays opposite the first-column item it was written beside.
 * Left as it is when the question already has a key (it names second-column positions) or holds ready-made pairs.
 */
export function scrambleMatch(options: readonly string[], answer: string | undefined, rand: Rand): string[] {
  const opts = [...options];
  if (opts.length < 2 || (answer ?? "").trim() || opts.some((o) => o.includes("|||"))) return opts;
  return derangement(opts.length, rand).map((i) => opts[i]);
}

type QuestionLike = {
  type?: string;
  options?: string[];
  answer?: string;
  subparts?: ImportedPaperSubpart[];
};

function scrambleQuestion<T extends QuestionLike>(q: T, fallbackType: string, rand: Rand): T {
  const type = normalizeQuestionType(q.type || fallbackType);
  const next = { ...q };
  if (Array.isArray(q.options) && q.options.length > 0) {
    if (type === "MCQ") {
      const r = scrambleMcq(q.options, q.answer, rand);
      next.options = r.options;
      if (r.answer !== undefined) next.answer = r.answer;
    } else if (type === "MATCH_COLUMN") {
      next.options = scrambleMatch(q.options, q.answer, rand);
    }
  }
  if (Array.isArray(q.subparts)) {
    // MCQ parts of a case study, passage or grammar question
    next.subparts = q.subparts.map((sp) => {
      if (!Array.isArray(sp.options) || sp.options.length === 0) return sp;
      const r = scrambleMcq(sp.options, sp.answer, rand);
      return { ...sp, options: r.options, ...(r.answer !== undefined ? { answer: r.answer } : {}) };
    });
  }
  return next;
}

/** The imported paper with every MCQ's options (and parts' options) shuffled and every match question's second column scrambled. */
export function scrambleImportedPaper(data: PaperImportData, rand: Rand = Math.random): PaperImportData {
  return {
    ...data,
    sections: (data.sections ?? []).map((sec) => ({
      ...sec,
      questions: (sec.questions ?? []).map((q: ImportedPaperQuestion) => {
        const main = scrambleQuestion(q, "", rand);
        if (!q.orQuestion) return main;
        return { ...main, orQuestion: scrambleQuestion(q.orQuestion, q.type, rand) };
      }),
    })),
  };
}
