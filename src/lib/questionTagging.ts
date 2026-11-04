/**
 * Fills in a new question's chapter, difficulty and skill from what the teacher already typed, so she only has
 * to correct them, not choose them. Everything here is a suggestion shown in the form; the teacher's own choice
 * always wins.
 *
 *   Chapter    – the chapter whose title shares the most words with the question; otherwise the chapter with
 *                the most marks still open in the blueprint (so the paper's quotas fill evenly).
 *   Difficulty – from the marks and the asking verb: recall of 1 mark is Easy, explain/compare is Average,
 *                justify/analyse or 5 marks is Difficult.
 *   Skill      – the school grid's Knowledge / Understanding / Applying / HOTS, from the asking verb.
 */
import type { Difficulty } from "./constants";

/** The school grid's names: Easy / Average / Difficult. */
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { EASY: "Easy", MEDIUM: "Average", HARD: "Difficult" };

export const SKILLS = [
  { value: "REMEMBERING", label: "Knowledge" },
  { value: "UNDERSTANDING", label: "Understanding" },
  { value: "APPLYING", label: "Applying" },
  { value: "ANALYZING", label: "HOTS" },
] as const;
export type Skill = (typeof SKILLS)[number]["value"];
/** Bloom levels stored by older AI tools, shown as the school's four skills. */
export const COGNITIVE_LEVELS = ["REMEMBERING", "UNDERSTANDING", "APPLYING", "ANALYZING", "EVALUATING", "CREATING"] as const;

export function skillOf(cognitiveLevel?: string | null): Skill | null {
  if (!cognitiveLevel) return null;
  if (cognitiveLevel === "EVALUATING" || cognitiveLevel === "CREATING") return "ANALYZING";
  return (SKILLS.find((s) => s.value === cognitiveLevel)?.value ?? null) as Skill | null;
}

const STOP = new Set(
  "the a an and or of to in on for with from by is are was were be this that these those which what who whom whose when where why how your you their his her its our we they it as at into about give write name answer following question questions each any all than then also".split(
    " ",
  ),
);

function words(s: string): string[] {
  return (s.toLowerCase().replace(/<[^>]+>/g, " ").replace(/\\[a-z]+/g, " ").replace(/^\s*\[[^\]]*\]\s*/, "").match(/[\p{L}\p{M}]+/gu) ?? []).filter(
    (w) => w.length >= 3 && !STOP.has(w),
  );
}

/** Matches "photosynthesis" with "photosynthetic", "plants" with "plant": a shared stem of 5+ letters, or equal words. */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const n = Math.min(a.length, b.length);
  if (n < 5) return false;
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i >= 5;
}

export type ChapterLite = { id: string; number: number; title: string };

export type ChapterSuggestion = { chapterId: string; reason: "title" | "quota" } | null;

export function suggestChapter(text: string, chapters: ChapterLite[], openMarks?: Record<string, number>): ChapterSuggestion {
  if (chapters.length === 0) return null;
  const q = words(text);
  let best: { id: string; score: number } | null = null;
  if (q.length > 0) {
    for (const c of chapters) {
      const t = words(c.title);
      const score = t.filter((w) => q.some((x) => sameWord(w, x))).length;
      if (score > 0 && (!best || score > best.score)) best = { id: c.id, score };
    }
  }
  if (best) return { chapterId: best.id, reason: "title" };
  if (openMarks) {
    const roomiest = [...chapters].sort((a, b) => (openMarks[b.id] ?? 0) - (openMarks[a.id] ?? 0) || a.number - b.number)[0];
    if ((openMarks[roomiest.id] ?? 0) > 0) return { chapterId: roomiest.id, reason: "quota" };
  }
  return null;
}

const HOTS = /\b(justify|evaluate|analy[sz]e|predict|what would happen|suppose|imagine|design|create|criticall?y|give reasons?|differentiate between|distinguish)\b|क्यों\s+होता|तर्क\s+दीजिए|विश्लेषण|मूल्यांकन|कल्पना\s+कीजिए/i;
const APPLY = /\b(calculate|solve|find|draw|construct|show that|prove|apply|use the|measure|convert|complete the|arrange)\b|गणना|हल\s+कीजिए|ज्ञात\s+कीजिए|बनाइए|सिद्ध\s+कीजिए/i;
const UNDERSTAND = /\b(explain|describe|why|how|compare|discuss|summari[sz]e|illustrate|give (an )?examples?|in your own words|classify|difference)\b|समझाइए|वर्णन|क्यों|कैसे|तुलना|अंतर/i;
const RECALL = /\b(what is|define|name|list|state|who|when|which|identify|recall|label|fill in|true or false|match)\b|परिभाषा|नाम\s+लिखिए|कौन|कब|लिखिए|सही\s+विकल्प/i;

export function suggestSkill(text: string, type: string): Skill {
  if (HOTS.test(text)) return "ANALYZING";
  if (APPLY.test(text)) return "APPLYING";
  if (UNDERSTAND.test(text)) return "UNDERSTANDING";
  if (RECALL.test(text)) return "REMEMBERING";
  return ["MCQ", "FILL_BLANK", "TRUE_FALSE", "MATCH_COLUMN", "VERY_SHORT"].includes(type) ? "REMEMBERING" : "UNDERSTANDING";
}

export function suggestDifficulty(text: string, type: string, marks?: number): Difficulty {
  const skill = suggestSkill(text, type);
  const m = marks ?? 0;
  if (skill === "ANALYZING" || m >= 5) return "HARD";
  if (skill === "REMEMBERING" && m <= 1) return "EASY";
  if (skill === "REMEMBERING" && m <= 2 && !["SHORT", "LONG"].includes(type)) return "EASY";
  return "MEDIUM";
}
