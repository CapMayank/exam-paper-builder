import { cleanOptionText, parseMatchColumnPairs, serializeMatchColumnPair } from "./constants";
import { skillOf } from "./questionTagging";
import { normalizeSubpartMarks, type SubPart } from "./types";

export type AiQuestionInput = {
  text: string;
  type?: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  difficulty?: string;
  cognitiveLevel?: string;
  attemptCount?: number;
  subparts?: { label?: string; text: string; marks?: number; answer?: string; options?: string[] }[];
};

type Difficulty = "EASY" | "MEDIUM" | "HARD";

/**
 * The one place that turns a generated question into what the bank stores: match-column pairs, clean sub-parts that
 * add up to the slot's marks, "answer any N" kept only when it is a real choice, and the skill as one of the four.
 */
export function aiQuestionPayload(a: {
  generated: AiQuestionInput;
  bookId: string;
  chapterId: string;
  type: string;
  slotMarks: number;
  difficulty: Difficulty;
  skill: string;
}): {
  bookId: string;
  chapterId: string;
  type: string;
  text: string;
  options: string[];
  subparts: SubPart[];
  attemptCount?: number;
  answer: string;
  difficulty: Difficulty;
  cognitiveLevel: string | null;
  spaceMm: 0;
  showGrid: false;
} {
  const { generated, type } = a;

  let options = generated.options || [];
  if (type === "MATCH_COLUMN") {
    const pairs = parseMatchColumnPairs(generated.options || [], generated.text, generated.explanation);
    if (pairs.length > 0 && pairs.some((p) => p.left && p.right)) {
      options = pairs.map((p) => serializeMatchColumnPair(p.left, p.right));
    }
  }

  const rawSubparts: SubPart[] = (generated.subparts || []).map((sp, idx) => ({
    label: sp.label || `(${idx + 1})`,
    text: sp.text,
    marks: Number(sp.marks) || 1,
    answer: sp.answer || "",
    options: Array.isArray(sp.options) && sp.options.length > 0 ? sp.options.map((o) => cleanOptionText(String(o))) : undefined,
  }));
  const subparts = rawSubparts.length > 0 ? normalizeSubpartMarks(rawSubparts, a.slotMarks, generated.attemptCount) : [];

  const n = generated.attemptCount;
  const kept = typeof n === "number" && Number.isInteger(n) && n > 0 && n < subparts.length ? { attemptCount: n } : {};

  const g = generated.difficulty;
  const difficulty: Difficulty = g === "EASY" || g === "MEDIUM" || g === "HARD" ? g : a.difficulty;

  return {
    bookId: a.bookId,
    chapterId: a.chapterId,
    type,
    text: generated.text,
    options,
    subparts,
    ...kept,
    answer: generated.answer || "",
    difficulty,
    cognitiveLevel: skillOf(generated.cognitiveLevel) ?? skillOf(a.skill) ?? null,
    spaceMm: 0, // classes 1–12 answer in a separate copy
    showGrid: false,
  };
}
