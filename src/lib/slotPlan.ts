/**
 * What each slot of a blueprint row is for. A school language paper has one row of five MCQs where Q4 is a
 * grammar item, and one row of six 3-mark questions where one is the unseen passage. The row keeps one heading,
 * one count and one marks value; `slotPlanJson` says which of its slots are grammar, passage or writing, so their
 * marks go to that syllabus unit and the AI writes that kind of question. "[]" means every slot takes the row's
 * own role and type. Pure, safe on client and server.
 */
import type { ChapterRole } from "./paperAutogen";

export type SlotSpec = { role: string; type: string };
export type SlotPlanEntry = { role: string; type?: string };
type PlannedRow = { type: string; count: number; role?: string | null; slotPlanJson?: string | null };

const ROLES = new Set(["STANDARD", "PASSAGE", "GRAMMAR", "WRITING", "LITERATURE"]);

export function parseSlotPlan(json: string | null | undefined): SlotPlanEntry[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (!Array.isArray(v)) return [];
    return v.map((e) => {
      const role = typeof e === "string" ? e : typeof e?.role === "string" ? e.role : "";
      const type = typeof e === "object" && e && typeof e.type === "string" && e.type ? e.type : undefined;
      return { role: ROLES.has(role) ? role : "", ...(type ? { type } : {}) };
    });
  } catch {
    return [];
  }
}

/** The default form of a slot of this role: a passage slot is an unseen passage, a writing slot a writing task. */
function defaultTypeFor(role: string, rowType: string): string {
  if (role === "PASSAGE") return "UNSEEN_PASSAGE";
  if (role === "WRITING") return "WRITING_SKILL";
  return rowType;
}

/** One entry per slot of the row, in order: its role and its default question type. */
export function rowSlotSpecs(row: PlannedRow): SlotSpec[] {
  const plan = parseSlotPlan(row.slotPlanJson);
  const rowRole = row.role || "STANDARD";
  return Array.from({ length: Math.max(0, row.count) }, (_, i) => {
    const e = plan[i];
    const role = e?.role || rowRole;
    return { role, type: e?.type || (e?.role ? defaultTypeFor(role, row.type) : row.type) };
  });
}

/** True when the row's slots are not all of one role. */
export function hasMixedSlots(row: PlannedRow): boolean {
  return new Set(rowSlotSpecs(row).map((s) => s.role)).size > 1;
}

/** Every question slot of a pattern (template), with its marks and role. */
export function templateSlots(t: {
  sections: Array<{ questionTypes: Array<{ count: number; marksEach: number; role?: string | null; slotPlan?: Array<{ role: string }> }> }>;
}): Array<{ marks: number; role: string | null }> {
  return t.sections.flatMap((g) =>
    g.questionTypes.flatMap((q) => Array.from({ length: q.count }, (_, i) => ({ marks: q.marksEach, role: q.slotPlan?.[i]?.role ?? q.role ?? null }))),
  );
}

/** Slots of these sections with their marks and role, for the chapter quotas (see roleMarks.ts). */
export function slotsWithRoles(rows: Array<PlannedRow & { marksEach: number }>): Array<{ marks: number; role: string }> {
  return rows.flatMap((r) => rowSlotSpecs(r).map((s) => ({ marks: r.marksEach, role: s.role })));
}

const SLOT_ROLE_OF_CHAPTER: Record<ChapterRole, string> = { PASSAGE: "PASSAGE", WRITING: "WRITING", GRAMMAR: "GRAMMAR", MAP: "STANDARD", LESSON: "LITERATURE" };

/**
 * The slots still empty, given the questions already placed (each by its chapter's kind). A placed grammar
 * question uses up the grammar slot wherever it sits in the row, so reordering questions never changes which
 * kinds are still owed.
 */
export function openSlotSpecs(row: PlannedRow, placed: Array<ChapterRole | null | undefined>): SlotSpec[] {
  const left = rowSlotSpecs(row);
  for (const kind of placed) {
    if (left.length === 0) break;
    const want = kind ? SLOT_ROLE_OF_CHAPTER[kind] : "";
    const lesson = (r: string) => r === "LITERATURE" || r === "STANDARD";
    let i = left.findIndex((s) => s.role === want || (want === "LITERATURE" && lesson(s.role)));
    if (i < 0) i = left.findIndex((s) => lesson(s.role));
    if (i < 0) i = 0;
    left.splice(i, 1);
  }
  return left;
}

/** Short summary for the editor and the paper builder, e.g. "4 lessons · 1 grammar". */
export function slotPlanSummary(row: PlannedRow): string {
  const specs = rowSlotSpecs(row);
  if (!hasMixedSlots(row)) return "";
  const label: Record<string, [string, string]> = {
    LITERATURE: ["lesson", "lessons"],
    STANDARD: ["lesson", "lessons"],
    GRAMMAR: ["grammar", "grammar"],
    PASSAGE: ["unseen passage", "unseen passages"],
    WRITING: ["writing", "writing"],
  };
  const counts = new Map<string, number>();
  for (const s of specs) {
    const key = s.role === "STANDARD" ? "LITERATURE" : s.role;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([role, n]) => `${n} ${label[role]?.[n === 1 ? 0 : 1] ?? role.toLowerCase()}`)
    .join(" · ");
}

/** Every type a row's slots default to, beyond the row's own (so the row accepts them). */
export function slotPlanTypes(row: PlannedRow): string[] {
  return [...new Set(rowSlotSpecs(row).map((s) => s.type))].filter((t) => t !== row.type);
}
