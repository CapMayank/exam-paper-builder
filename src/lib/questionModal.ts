/**
 * The rules that decide what the add/edit question modal shows, as pure functions so they can be tested without
 * rendering. The components only call these.
 */
import { QUESTION_TYPE_LABEL } from "./constants";
import { assignChapter, DIFFICULTY_LABEL, SKILLS, skillOf, suggestChapter } from "./questionTagging";
import type { ChapterBank, ChapterLite } from "./questionTagging";

export type ModalMode = "add" | "replace" | "or" | "edit";
export type SourceTab = "bank" | "write" | "ai";

/** Section types whose questions are a plain text (plus options for MCQ) and can be pasted in a list. */
export const PASTEABLE_TYPES = new Set(["MCQ", "TRUE_FALSE", "FILL_BLANK", "VERY_SHORT", "SHORT", "LONG"]);

/** Every mode opens on Write so the modal is usable at once, without waiting for the bank list. */
export function openingTab(mode: ModalMode): SourceTab {
  void mode; // kept so this stays the one place the rule is decided
  return "write";
}

export function showTypeChips(allowedTypes: string[], mode: ModalMode): boolean {
  return allowedTypes.length > 1 && mode !== "edit";
}

function typeLabel(type: string): string {
  return (QUESTION_TYPE_LABEL as Record<string, string>)[type] ?? type;
}

export function modalTitle(a: {
  mode: ModalMode;
  sectionTitle: string;
  type: string;
  marks: number;
  chips: boolean;
  target?: "primary" | "or";
}): string {
  const type = typeLabel(a.type);
  const marks = `${a.marks} ${a.marks === 1 ? "mark" : "marks"}`;
  switch (a.mode) {
    case "add":
      return a.chips ? `Add to ${a.sectionTitle} · ${marks}` : `Add to ${a.sectionTitle} — ${type} · ${marks}`;
    case "replace": {
      const head = `Replace question in ${a.sectionTitle} · ${marks}`;
      return a.chips ? head : `${head} — ${type}`;
    }
    case "or":
      return `Add OR question in ${a.sectionTitle} · ${marks}`;
    case "edit":
      return `${a.target === "or" ? "Edit OR question" : "Edit question"} — ${type}`;
  }
}

/** Easy / Average / Difficult; an old or unknown stored value is shown as stored, an empty one as Average. */
export function difficultyLabel(value?: string | null): string {
  if (!value) return "Average";
  return (DIFFICULTY_LABEL as Record<string, string>)[value.toUpperCase()] ?? value;
}

/** The school's skill name for a stored cognitive level; "" when there is none. */
export function skillLabel(cognitiveLevel?: string | null): string {
  const skill = skillOf(cognitiveLevel);
  return SKILLS.find((s) => s.value === skill)?.label ?? "";
}

export function detailsSummary(difficulty: string, cognitiveLevel?: string | null): string {
  const skill = skillLabel(cognitiveLevel);
  const diff = difficultyLabel(difficulty);
  return skill ? `${diff} · ${skill}` : diff;
}

/**
 * The chapters the chapter control offers: the locked one alone (an OR choice stays in its main question's
 * chapter); `undefined` for the bank (every chapter); on a paper the blueprint's chapters plus the question's
 * current one, so saving never silently moves it.
 */
export function chapterOptionIds(
  blueprintChapterIds: string[] | undefined,
  currentChapterId?: string | null,
  lockedChapterId?: string | null,
): string[] | undefined {
  if (lockedChapterId) return [lockedChapterId];
  if (!blueprintChapterIds) return undefined;
  return currentChapterId && !blueprintChapterIds.includes(currentChapterId)
    ? [...blueprintChapterIds, currentChapterId]
    : blueprintChapterIds;
}

/** The chapter to show: the teacher's own choice always wins; a new, untouched question gets a suggestion. */
export function chapterChoice(a: {
  isNew: boolean;
  touched: boolean;
  chosenId: string;
  text: string;
  chapters: ChapterLite[];
  openMarks?: Record<string, number>;
  bank?: ChapterBank;
}): { chapterId: string; suggested: boolean } {
  if (!a.isNew || a.touched) return { chapterId: a.chosenId, suggested: false };
  if (a.chapters.length === 0) return { chapterId: "", suggested: false };
  if (a.openMarks) return { chapterId: assignChapter(a.text, a.chapters, a.openMarks, a.bank), suggested: true };
  const s = suggestChapter(a.text, a.chapters, undefined, a.bank);
  return s ? { chapterId: s.chapterId, suggested: true } : { chapterId: a.chosenId, suggested: false };
}

export function canPasteSeveral(a: { mode: ModalMode; type: string; slotsLeft: number }): boolean {
  return a.mode === "add" && a.slotsLeft > 0 && PASTEABLE_TYPES.has(a.type);
}
