/**
 * Answer-key backfill: works out which questions of a paper have no stored answer,
 * asks a generator for just those (in batches), and writes each result back without
 * ever replacing an answer that is already there.
 *
 * Pure apart from the injected `generate` / `save` callbacks, so it is unit-testable.
 * Subpart answers are read and written on the raw `subpartsJson` (not parseSubparts),
 * so every other field of a subpart and the container shape ({ attemptCount, items }) survive.
 */
import { isKindergartenType, isMcqLikeType, normalizeMcqAnswer } from "./constants";

export type AnswerSource = {
  id: string;
  type: string;
  text: string;
  optionsJson: string;
  subpartsJson: string;
  answer: string;
};

export type MissingSubpart = { path: string; label: string; text: string; options: string[] };

/** One question that still needs something written into its answer key. */
export type AnswerNeed = {
  id: string;
  type: string;
  text: string;
  options: string[];
  /** The question-level `answer` is blank and the question has no subparts. */
  main: boolean;
  /** Leaf subparts with a blank answer, addressed by raw index path ("0", "2.1"). */
  subparts: MissingSubpart[];
};

export type GeneratedAnswer = {
  answer?: string;
  subparts?: Record<string, string>;
};

export type FillFailure = { id: string; reason: string };

export type FillResult = {
  /** Questions in the paper that needed nothing (all answers already stored). */
  alreadyAnswered: number;
  /** Questions that needed an answer. */
  requested: number;
  /** Questions whose generated answer was saved (fully or partly). */
  saved: string[];
  /** Questions a teacher filled in while generation ran; their answer was kept. */
  keptTeacherAnswer: string[];
  /** Questions still missing all or part of their answer. */
  failed: FillFailure[];
};

const blank = (s: unknown) => typeof s !== "string" || s.trim() === "";

function parseJson(json: string | null | undefined): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function parseOptions(json: string | null | undefined): string[] {
  const parsed = parseJson(json);
  return Array.isArray(parsed) ? parsed.map((o) => String(o)) : [];
}

/** The subpart list inside a stored payload: a bare array, or `{ items }` / `{ subparts }`. */
function subpartList(container: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(container)) return container;
  if (container && typeof container === "object") {
    const c = container as { items?: unknown; subparts?: unknown };
    if (Array.isArray(c.items)) return c.items;
    if (Array.isArray(c.subparts)) return c.subparts;
  }
  return null;
}

function walkLeaves(
  list: Record<string, unknown>[],
  prefix: string,
  visit: (sp: Record<string, unknown>, path: string) => void,
) {
  list.forEach((sp, idx) => {
    if (!sp || typeof sp !== "object") return;
    const path = prefix ? `${prefix}.${idx}` : String(idx);
    const nested = Array.isArray(sp.subparts) ? (sp.subparts as Record<string, unknown>[]) : [];
    if (nested.some((n) => n && typeof n === "object")) walkLeaves(nested, path, visit);
    else visit(sp, path);
  });
}

export function hasSubparts(subpartsJson: string | null | undefined): boolean {
  const list = subpartList(parseJson(subpartsJson));
  return Boolean(list && list.some((sp) => sp && typeof sp === "object"));
}

/** What a question is missing, or null when its answer key is already complete. */
export function findMissingAnswer(q: AnswerSource): AnswerNeed | null {
  // Kindergarten activities are assessed by observation; they carry no model answer.
  if (isKindergartenType(q.type)) return null;
  const list = subpartList(parseJson(q.subpartsJson));
  const missing: MissingSubpart[] = [];
  let anySubpart = false;
  if (list) {
    walkLeaves(list, "", (sp, path) => {
      anySubpart = true;
      if (!blank(sp.answer)) return;
      missing.push({
        path,
        label: typeof sp.label === "string" ? sp.label : "",
        text: typeof sp.text === "string" ? sp.text : "",
        options: Array.isArray(sp.options) ? sp.options.map((o) => String(o)) : [],
      });
    });
  }
  // A question with subparts is answered part by part (that is what the key prints).
  const main = !anySubpart && blank(q.answer);
  if (!main && missing.length === 0) return null;
  return { id: q.id, type: q.type, text: q.text, options: parseOptions(q.optionsJson), main, subparts: missing };
}

/** Cleans one generated answer for storage; "" when it can't be trusted for this question type. */
export function normalizeGeneratedAnswer(type: string, options: string[], raw: unknown): string {
  if (typeof raw !== "string") return "";
  const text = raw.trim();
  if (!text) return "";
  if (isMcqLikeType(type)) {
    // objective answers are stored as the option letter; anything that doesn't map to an option is dropped
    const resolved = normalizeMcqAnswer(text, options);
    if (!resolved.letter) return "";
    const idx = resolved.letter.charCodeAt(0) - 65;
    return options.length === 0 || idx < options.length ? resolved.letter : "";
  }
  if (type === "TRUE_FALSE") {
    // \b doesn't see Devanagari letters as word characters, so the word end is spelled out
    const end = String.raw`(?=$|[\s(.,;:/|-])`;
    if (new RegExp(`^(true|सत्य|सही)${end}`, "i").test(text)) return text.replace(/^true/i, "True");
    if (new RegExp(`^(false|असत्य|गलत)${end}`, "i").test(text)) return text.replace(/^false/i, "False");
    return "";
  }
  return text;
}

/**
 * Writes generated answers into the blanks of a question's current stored values.
 * Never touches a non-blank answer, so a teacher's answer always wins.
 */
export function mergeGeneratedAnswer(
  current: Pick<AnswerSource, "type" | "optionsJson" | "subpartsJson" | "answer">,
  generated: GeneratedAnswer,
): { answer: string; subpartsJson: string; filledMain: boolean; filledPaths: string[] } {
  const options = parseOptions(current.optionsJson);
  let answer = current.answer;
  let filledMain = false;
  const container = parseJson(current.subpartsJson);
  const list = subpartList(container);
  const filledPaths: string[] = [];
  let anySubpart = false;

  if (list) {
    walkLeaves(list, "", (sp, path) => {
      anySubpart = true;
      if (!blank(sp.answer)) return;
      const spOptions = Array.isArray(sp.options) ? sp.options.map((o) => String(o)) : [];
      const value = normalizeGeneratedAnswer(spOptions.length > 0 ? "MCQ" : "SHORT", spOptions, generated.subparts?.[path]);
      if (!value) return;
      sp.answer = value;
      filledPaths.push(path);
    });
  }
  if (!anySubpart && blank(answer)) {
    const value = normalizeGeneratedAnswer(current.type, options, generated.answer);
    if (value) {
      answer = value;
      filledMain = true;
    }
  }
  return {
    answer,
    subpartsJson: filledPaths.length > 0 ? JSON.stringify(container) : current.subpartsJson,
    filledMain,
    filledPaths,
  };
}

export type SaveOutcome = "saved" | "kept" | "nothing";

/**
 * Generates answers only for the questions that lack them, saves each one, and reports
 * what is still missing. `generate` gets one batch and returns answers keyed by question id;
 * a batch that throws fails only its own questions. `save` merges into the latest stored
 * row and says whether it wrote ("saved"), found the blanks already filled ("kept"),
 * or had nothing usable to write ("nothing").
 */
export async function fillMissingAnswers(opts: {
  questions: AnswerSource[];
  generate: (batch: AnswerNeed[]) => Promise<Map<string, GeneratedAnswer>>;
  save: (id: string, generated: GeneratedAnswer) => Promise<SaveOutcome>;
  batchSize?: number;
}): Promise<FillResult> {
  const batchSize = Math.max(1, opts.batchSize ?? 10);
  const seen = new Set<string>();
  const needs: AnswerNeed[] = [];
  let alreadyAnswered = 0;
  for (const q of opts.questions) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    const need = findMissingAnswer(q);
    if (need) needs.push(need);
    else alreadyAnswered++;
  }

  const result: FillResult = { alreadyAnswered, requested: needs.length, saved: [], keptTeacherAnswer: [], failed: [] };

  for (let i = 0; i < needs.length; i += batchSize) {
    const batch = needs.slice(i, i + batchSize);
    let answers: Map<string, GeneratedAnswer>;
    try {
      answers = await opts.generate(batch);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      for (const need of batch) result.failed.push({ id: need.id, reason });
      continue;
    }
    for (const need of batch) {
      const generated = answers.get(need.id);
      if (!generated) {
        result.failed.push({ id: need.id, reason: "No answer was generated for this question." });
        continue;
      }
      const missingParts = need.subparts.filter((sp) => !normalizeGeneratedAnswer(sp.options.length > 0 ? "MCQ" : "SHORT", sp.options, generated.subparts?.[sp.path]));
      let outcome: SaveOutcome;
      try {
        outcome = await opts.save(need.id, generated);
      } catch (e) {
        result.failed.push({ id: need.id, reason: `Could not save: ${e instanceof Error ? e.message : String(e)}` });
        continue;
      }
      if (outcome === "saved") result.saved.push(need.id);
      else if (outcome === "kept") result.keptTeacherAnswer.push(need.id);
      if (outcome === "nothing") {
        result.failed.push({ id: need.id, reason: "The generated answer was empty or did not match the question's options." });
      } else if (outcome === "saved" && missingParts.length > 0) {
        result.failed.push({
          id: need.id,
          reason: `No answer generated for part${missingParts.length > 1 ? "s" : ""} ${missingParts.map((sp) => sp.label || sp.path).join(", ")}.`,
        });
      }
    }
  }
  return result;
}
