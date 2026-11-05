/**
 * Chapter quotas for a pattern whose slots carry roles (a language paper's unseen passage, writing tasks and
 * grammar items). Each role's marks go only to the syllabus rows of that kind: the unseen passage to the reading
 * unit, the letter and essay to the writing unit, grammar to the grammar unit, and the rest to the lessons. Before,
 * every slot was spread over every row, so a lesson could "own" the passage (making it a seen passage) and the
 * reading unit got whatever was left. Safe on client and server.
 */
import { chapterRole, type ChapterRole } from "./paperAutogen";
import { distributeSlotMarks } from "./schoolPatterns";

export type RoleSlot = { marks: number; role?: string | null };
export type RoleChapter = { id: string; title: string };

const ROW_ROLE: Record<string, ChapterRole> = { PASSAGE: "PASSAGE", WRITING: "WRITING", GRAMMAR: "GRAMMAR" };

/** True when the slots name any non-lesson role, i.e. the pattern says which marks are not lesson marks. */
export function hasComponentRoles(slots: RoleSlot[]): boolean {
  return slots.some((s) => Boolean(s.role && ROW_ROLE[s.role]));
}

/**
 * Marks per chapter id. A role with no row of its kind in the book falls back to the lessons (the caller should
 * add the missing unit first; see missingUnitRoles). Patterns without roles keep the even, whole-question spread
 * over every row, as before.
 */
export function distributeMarksByRole(slots: RoleSlot[], chapters: RoleChapter[], subject?: string | null): Record<string, number> {
  const ids = chapters.map((c) => c.id);
  if (!hasComponentRoles(slots)) return distributeSlotMarks(slots.map((s) => s.marks), ids);

  const kindOf = new Map(chapters.map((c) => [c.id, chapterRole(c.title, subject)]));
  const rowsOf = (kind: ChapterRole) => ids.filter((id) => kindOf.get(id) === kind);
  const lessons = rowsOf("LESSON");
  const lessonPool = lessons.length > 0 ? lessons : ids;

  const byKind = new Map<string, number[]>();
  for (const s of slots) {
    const want = (s.role && ROW_ROLE[s.role]) || "LESSON";
    const pool = want === "LESSON" ? lessonPool : rowsOf(want).length > 0 ? rowsOf(want) : lessonPool;
    const key = pool.join(",");
    byKind.set(key, [...(byKind.get(key) ?? []), s.marks]);
  }

  const out: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const [key, marks] of byKind) {
    const part = distributeSlotMarks(marks, key.split(","));
    for (const [id, m] of Object.entries(part)) out[id] += m;
  }
  return out;
}

/** The non-lesson roles a pattern needs that the book has no row for (e.g. a hand-made book with lessons only). */
export function missingUnitRoles(slots: RoleSlot[], chapters: RoleChapter[], subject?: string | null): Array<"PASSAGE" | "WRITING" | "GRAMMAR"> {
  const have = new Set(chapters.map((c) => chapterRole(c.title, subject)));
  const need = new Set<"PASSAGE" | "WRITING" | "GRAMMAR">();
  for (const s of slots) {
    const r = s.role && ROW_ROLE[s.role];
    if (r && r !== "LESSON" && r !== "MAP" && !have.has(r)) need.add(r as "PASSAGE" | "WRITING" | "GRAMMAR");
  }
  return [...need];
}
