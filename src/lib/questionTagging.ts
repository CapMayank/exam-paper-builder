/**
 * Fills in a new question's chapter, difficulty and skill from what the teacher already typed, so she only has
 * to correct them, not choose them. Everything here is a suggestion shown in the form; the teacher's own choice
 * always wins.
 *
 *   Chapter    – a stated chapter number, else the chapter whose title (then whose banked questions) share the
 *                most telling words with the question; otherwise the chapter with the most marks still open in
 *                the blueprint (so the paper's quotas fill evenly).
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
/** Words that say nothing about which chapter a question is from: book furniture and the asking words of Hindi papers. */
const GENERIC = new Set(
  "chapter chapters lesson unit part book class page exercise activity introduction answers given short long brief notes explain describe define state list draw diagram neat label two three four five one some many".split(" ").concat(
    "लिखिए कीजिए दीजिए बताइए समझाइए क्या किसे कहते होता होती होते अथवा तथा इसका उसका किसी किन्हीं निम्नलिखित प्रश्न उत्तर अध्याय पाठ".split(" "),
  ),
);

/** "plants" → "plant", "studies" → "study", "boiling" → "boil": enough for matching, not a real stemmer. */
function stem(w: string): string {
  if (!/^[a-z]+$/.test(w)) return w;
  for (const [suf, rep] of [["ies", "y"], ["ing", ""], ["ed", ""], ["es", ""], ["s", ""]] as const) {
    if (w.length - suf.length >= 4 && w.endsWith(suf) && !w.endsWith("ss")) return w.slice(0, -suf.length) + rep;
  }
  return w;
}

function words(s: string): string[] {
  const raw = s.toLowerCase().replace(/<[^>]+>/g, " ").replace(/\\[a-z]+/g, " ").replace(/^\s*\[[^\]]*\]\s*/, "").match(/[\p{L}\p{M}]+/gu) ?? [];
  return [...new Set(raw.filter((w) => w.length >= 3 && !STOP.has(w) && !GENERIC.has(w)).map(stem))];
}

/**
 * Matches "photosynthesis" with "photosynthetic", "resource" with "resourc(es)": equal stems, or a shared start
 * of 6+ letters that covers most of the shorter word ("electric" and "electron" stay apart).
 */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const n = Math.min(a.length, b.length);
  if (n < 6) return false;
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i >= 6 && i >= 0.8 * n;
}

export type ChapterLite = { id: string; number: number; title: string };

/** Texts of questions already in the bank, per chapter: how the teacher has tagged before. */
export type ChapterBank = Record<string, string[]>;

export type ChapterSuggestion = { chapterId: string; reason: "title" | "bank" | "quota" } | null;

const CHAPTER_NUMBER = /\b(?:ch(?:apter)?|lesson|unit)\.?\s*(\d{1,2})\b|(?:अध्याय|पाठ)\s*[-–:]?\s*(\d{1,2})(?!\d)/i;

type ChapterIndex = {
  chapters: ChapterLite[];
  titles: Map<string, string[]>;
  titleDf: Map<string, number>;
  /** per chapter: stem → share of its bank questions that use it */
  bank: Map<string, Map<string, number>>;
  bankDf: Map<string, number>;
};

const indexCache = new WeakMap<object, { chapters: ChapterLite[]; index: ChapterIndex }>();

function buildIndex(chapters: ChapterLite[], bank?: ChapterBank): ChapterIndex {
  const titles = new Map(chapters.map((c) => [c.id, words(c.title)]));
  const titleDf = new Map<string, number>();
  for (const t of titles.values()) for (const w of t) titleDf.set(w, (titleDf.get(w) ?? 0) + 1);
  const bankMap = new Map<string, Map<string, number>>();
  const bankDf = new Map<string, number>();
  if (bank) {
    for (const c of chapters) {
      const texts = bank[c.id] ?? [];
      if (texts.length === 0) continue;
      const counts = new Map<string, number>();
      for (const t of texts) for (const w of words(t)) counts.set(w, (counts.get(w) ?? 0) + 1);
      const shares = new Map<string, number>();
      for (const [w, n] of counts) {
        shares.set(w, n / texts.length);
        bankDf.set(w, (bankDf.get(w) ?? 0) + 1);
      }
      bankMap.set(c.id, shares);
    }
  }
  return { chapters, titles, titleDf, bank: bankMap, bankDf };
}

function indexFor(chapters: ChapterLite[], bank?: ChapterBank): ChapterIndex {
  if (!bank) return buildIndex(chapters);
  const hit = indexCache.get(bank);
  if (hit && hit.chapters === chapters) return hit.index;
  const index = buildIndex(chapters, bank);
  indexCache.set(bank, { chapters, index });
  return index;
}

/**
 * The chapter a question most likely belongs to, scored on
 *   1. a stated chapter number ("Ch. 3", "अध्याय 3"),
 *   2. words shared with the chapter title, rare title words counting more than ones many titles share,
 *   3. words shared with questions already filed under the chapter in the bank,
 * and only when nothing matches, the chapter with the most marks still open in the blueprint. Ties go to the
 * chapter with more marks open, so a paper's quotas fill evenly.
 */
export function suggestChapter(
  text: string,
  chapters: ChapterLite[],
  openMarks?: Record<string, number>,
  bank?: ChapterBank,
): ChapterSuggestion {
  if (chapters.length === 0) return null;
  const plain = text.replace(/<[^>]+>/g, " ");
  const num = plain.match(CHAPTER_NUMBER);
  if (num) {
    const byNumber = chapters.find((c) => c.number === Number(num[1] ?? num[2]));
    if (byNumber) return { chapterId: byNumber.id, reason: "title" };
  }

  const q = words(plain);
  if (q.length > 0) {
    const ix = indexFor(chapters, bank);
    const n = chapters.length;
    const scored = chapters.map((c) => {
      let title = 0;
      for (const t of ix.titles.get(c.id) ?? []) {
        if (q.some((x) => sameWord(t, x))) title += Math.log(1 + n / (ix.titleDf.get(t) ?? 1));
      }
      let fromBank = 0;
      const shares = ix.bank.get(c.id);
      if (shares) {
        const banked = ix.bank.size;
        for (const x of q) {
          const share = shares.get(x);
          // a word every chapter's questions use tells nothing
          if (share) fromBank += Math.log(banked / (ix.bankDf.get(x) ?? 1) + 0.25) * Math.min(1, 3 * share);
        }
      }
      return { c, title, fromBank, total: 2 * title + fromBank, open: openMarks?.[c.id] ?? 0 };
    });
    scored.sort((a, b) => b.total - a.total || b.open - a.open || a.c.number - b.c.number);
    const [best, second] = scored;
    if (best.title > 0) return { chapterId: best.c.id, reason: "title" };
    // a bank-only match must be clear, not two words that happen to recur somewhere
    if (best.fromBank >= 1 && (!second || best.fromBank >= 1.25 * second.fromBank)) {
      return { chapterId: best.c.id, reason: "bank" };
    }
  }
  if (openMarks) {
    const roomiest = [...chapters].sort((a, b) => (openMarks[b.id] ?? 0) - (openMarks[a.id] ?? 0) || a.number - b.number)[0];
    if ((openMarks[roomiest.id] ?? 0) > 0) return { chapterId: roomiest.id, reason: "quota" };
  }
  return null;
}

/**
 * The chapter a question goes to without asking anyone: `suggestChapter`'s match when it finds one, otherwise
 * the chapter furthest below its target (`gaps` = target - used per chapter id; a missing id counts as 0, and a
 * negative value means the chapter is already over). Ties go to the lowest chapter number. Never returns an
 * empty id; throws only when there are no chapters.
 */
export function assignChapter(text: string, chapters: ChapterLite[], gaps: Record<string, number>, bank?: ChapterBank): string {
  if (chapters.length === 0) throw new Error("A blueprint needs at least one chapter to assign a question to.");
  const suggested = suggestChapter(text, chapters, gaps, bank);
  if (suggested) return suggested.chapterId;
  return [...chapters].sort((a, b) => (gaps[b.id] ?? 0) - (gaps[a.id] ?? 0) || a.number - b.number)[0].id;
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
