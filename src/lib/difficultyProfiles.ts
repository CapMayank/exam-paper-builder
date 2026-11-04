/**
 * Difficulty manager for AI paper generation.
 *
 * A profile is a whole-paper difficulty policy: the share of easy / medium / hard questions, how much of the
 * paper must test application and higher-order thinking, and what "hard" means for a question of a given size.
 * Every slot gets a concrete target (EASY | MEDIUM | HARD) so the model is told exactly how hard each question
 * must be, instead of being handed one vague word for the whole section.
 *
 * School exams are usually set a notch above the board's model paper so students are over-prepared for the
 * board, which is why SCHOOL is the default profile.
 */

export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";
export type DifficultyProfileId = "FOUNDATION" | "BOARD" | "SCHOOL" | "CHALLENGE";
/** What a request may carry: a profile id, or one of the older values (BALANCED / EASY / MEDIUM / HARD). */
export type DifficultyInput = DifficultyProfileId | "BALANCED" | "EASY" | "MEDIUM" | "HARD" | string | null | undefined;

export interface DifficultyProfile {
  id: DifficultyProfileId;
  label: string;
  short: string;
  description: string;
  /** Percent of questions at each level (adds up to 100). */
  mix: Record<DifficultyLevel, number>;
  /** Minimum percent of marks that must test application / analysis rather than recall. */
  applicationShare: number;
  /** Extra hard share (percentage points) given to 3+ mark questions, taken from easy. */
  longQuestionHardBoost: number;
  /** Lines added to the model's instructions. */
  directives: string[];
}

export const DIFFICULTY_PROFILES: Record<DifficultyProfileId, DifficultyProfile> = {
  FOUNDATION: {
    id: "FOUNDATION",
    label: "Foundation / remedial (easier than board)",
    short: "Foundation",
    description: "50% easy, 40% medium, 10% hard. For unit tests and weaker sections.",
    mix: { EASY: 50, MEDIUM: 40, HARD: 10 },
    applicationShare: 20,
    longQuestionHardBoost: 0,
    directives: [
      "Keep language simple and questions direct; test core definitions, facts and one-step applications.",
      "Numericals use clean numbers and a formula the student will recognise immediately.",
    ],
  },
  BOARD: {
    id: "BOARD",
    label: "Board model paper (MPBSE standard)",
    short: "Board standard",
    description: "30% easy, 50% medium, 20% hard — the level of the board's own model paper.",
    mix: { EASY: 30, MEDIUM: 50, HARD: 20 },
    applicationShare: 35,
    longQuestionHardBoost: 10,
    directives: [
      "Match the level of the MPBSE board examination and its model papers.",
      "3- and 4-mark questions must not be one-step recall or single substitution.",
    ],
  },
  SCHOOL: {
    id: "SCHOOL",
    label: "School exam — tougher than board (recommended)",
    short: "School exam (rigorous)",
    description: "15% easy, 50% medium, 35% hard, with more application and reasoning — prepares students above board level.",
    mix: { EASY: 15, MEDIUM: 50, HARD: 35 },
    applicationShare: 50,
    longQuestionHardBoost: 15,
    directives: [
      "This is a school examination deliberately set ABOVE board level so students are over-prepared for the board. Stay strictly inside the prescribed syllabus and textbook, but prefer questions that make students think over questions they can answer by reproducing a textbook line.",
      "Objective items must test understanding: plausible distractors built on common misconceptions, True/False statements that hinge on a real concept (not a trivially reworded textbook sentence), fill-in-the-blanks whose answer is NOT given away by the rest of the sentence.",
      "Prefer 'why / how / what would happen if / compare / justify / apply to this situation' over 'define / name / list'.",
      "Numericals should require the student to identify which relation applies, convert units or combine two steps — not plug numbers into a formula stated in the question.",
    ],
  },
  CHALLENGE: {
    id: "CHALLENGE",
    label: "Challenge / pre-board (HOTS heavy)",
    short: "Challenge",
    description: "10% easy, 40% medium, 50% hard. For toppers, pre-boards and practice papers.",
    mix: { EASY: 10, MEDIUM: 40, HARD: 50 },
    applicationShare: 65,
    longQuestionHardBoost: 15,
    directives: [
      "Emphasise higher-order thinking: multi-step problems, unfamiliar situations, data/graph interpretation, reasoning chains and justification.",
      "Every question must still be answerable from the prescribed syllabus by a well-prepared student in the time its marks allow.",
    ],
  },
};

export const DEFAULT_DIFFICULTY_PROFILE: DifficultyProfileId = "SCHOOL";

export function resolveDifficultyProfile(input: DifficultyInput): DifficultyProfile {
  const v = String(input ?? "").trim().toUpperCase();
  if (v in DIFFICULTY_PROFILES) return DIFFICULTY_PROFILES[v as DifficultyProfileId];
  if (v === "BALANCED" || v === "MEDIUM") return DIFFICULTY_PROFILES.BOARD;
  if (v === "EASY") return DIFFICULTY_PROFILES.FOUNDATION;
  if (v === "HARD") return DIFFICULTY_PROFILES.CHALLENGE;
  return DIFFICULTY_PROFILES[DEFAULT_DIFFICULTY_PROFILE];
}

/** The legacy single value older code paths (offline templates) understand. */
export function legacyDifficulty(input: DifficultyInput): "EASY" | "MEDIUM" | "HARD" | "BALANCED" {
  const p = resolveDifficultyProfile(input);
  return p.id === "FOUNDATION" ? "EASY" : p.id === "CHALLENGE" ? "HARD" : "BALANCED";
}

/** The level mix for a question of this many marks: longer questions lean harder. */
export function mixForMarks(profile: DifficultyProfile, marks: number): Record<DifficultyLevel, number> {
  const boost = marks >= 3 ? profile.longQuestionHardBoost : marks <= 1 ? -Math.round(profile.longQuestionHardBoost / 2) : 0;
  let hard = Math.max(0, profile.mix.HARD + boost);
  let easy = Math.max(0, profile.mix.EASY - boost);
  // 3+ mark questions are never pure recall in board-or-harder profiles
  if (marks >= 3 && profile.id !== "FOUNDATION") easy = Math.min(easy, 10);
  hard = Math.min(hard, 100);
  const medium = Math.max(0, 100 - hard - easy);
  return { EASY: easy, MEDIUM: medium, HARD: hard };
}

/**
 * A target level for each of `count` slots, by largest remainder so the section's mix matches the profile as
 * closely as whole questions allow. `offset` rotates the remainders between sections so small sections do not
 * all round the same way (e.g. every 3-question section losing its hard question).
 */
export function planSlotDifficulties(count: number, marks: number, input: DifficultyInput, offset = 0): DifficultyLevel[] {
  if (count <= 0) return [];
  const mix = mixForMarks(resolveDifficultyProfile(input), marks);
  const levels: DifficultyLevel[] = ["EASY", "MEDIUM", "HARD"];
  const exact = levels.map((l) => (mix[l] * count) / 100);
  const n = exact.map(Math.floor);
  let left = count - n.reduce((a, b) => a + b, 0);
  const order = levels
    .map((_, i) => i)
    .sort((a, b) => exact[b] - n[b] - (exact[a] - n[a]) || ((a + offset) % 3) - ((b + offset) % 3));
  for (let k = 0; left > 0; k++, left--) n[order[k % 3]]++;
  // interleave: easy questions first in a section, hard ones spread through the rest
  const out: DifficultyLevel[] = [];
  const pool = { EASY: n[0], MEDIUM: n[1], HARD: n[2] };
  const pattern: DifficultyLevel[] = ["EASY", "MEDIUM", "HARD", "MEDIUM"];
  for (let i = 0; out.length < count; i++) {
    const want = pattern[i % pattern.length];
    const pick = pool[want] > 0 ? want : (["MEDIUM", "HARD", "EASY"] as DifficultyLevel[]).find((l) => pool[l] > 0)!;
    pool[pick]--;
    out.push(pick);
  }
  return out;
}

/** What a target level means for a question of this size, in words the model can act on. */
export function levelMeaning(level: DifficultyLevel, marks: number): string {
  if (level === "EASY") {
    return marks <= 1 ? "direct recall or recognition of one fact/term" : "straightforward textbook explanation or one-step application";
  }
  if (level === "MEDIUM") {
    return marks <= 1
      ? "understanding — distractors from common misconceptions, or a statement whose truth depends on a concept"
      : "explanation with reasons, comparison, or a standard two-step application";
  }
  return marks <= 1
    ? "application or reasoning in one line — an unfamiliar example, a consequence, or a 'which is NOT' judgement"
    : "higher-order: apply to a new situation, analyse data/graph/diagram, multi-step numerical where the student must choose the relation, or justify/evaluate";
}

/** The block of instructions describing the profile for the system prompt. */
export function difficultyPromptBlock(input: DifficultyInput): string {
  const p = resolveDifficultyProfile(input);
  return [
    `DIFFICULTY PROFILE: ${p.label}. Paper mix ≈ ${p.mix.EASY}% easy / ${p.mix.MEDIUM}% medium / ${p.mix.HARD}% hard; at least ${p.applicationShare}% of marks must test application, analysis or reasoning rather than recall.`,
    ...p.directives.map((d) => `- ${d}`),
    `- Each slot below carries its own "Target difficulty". Write the question AT that level and set its "difficulty" field to that value. An OR alternative must be of the same difficulty as its main question.`,
  ].join("\n");
}

/** Share of each level among questions, for showing the teacher what the generated paper actually looks like. */
export function difficultyTally(items: Array<{ difficulty?: string | null; marks?: number }>): Record<DifficultyLevel, { count: number; marks: number }> {
  const t: Record<DifficultyLevel, { count: number; marks: number }> = { EASY: { count: 0, marks: 0 }, MEDIUM: { count: 0, marks: 0 }, HARD: { count: 0, marks: 0 } };
  for (const it of items) {
    const l = (["EASY", "MEDIUM", "HARD"].includes(String(it.difficulty)) ? it.difficulty : "MEDIUM") as DifficultyLevel;
    t[l].count++;
    t[l].marks += it.marks ?? 0;
  }
  return t;
}
