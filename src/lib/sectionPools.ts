// Flexible marks, phase C: sections of one paper that carry the same marks per question share a pool, and slots may
// move between them on that paper. The blueprint never changes; the paper keeps a per-section delta. Pure: no I/O.

const POOLABLE_TYPES = new Set(["MCQ", "FILL_BLANK", "TRUE_FALSE", "ONE_WORD", "VERY_SHORT"]);

type PoolSection = { id: string; title?: string; type: string; count: number; marksEach: number; flexible?: boolean; role?: string | null };

function poolable(s: PoolSection): boolean {
  return !!s.flexible && (s.role || "STANDARD") === "STANDARD" && POOLABLE_TYPES.has(s.type);
}

/** Ids of the sections that can lend slots to `section` (itself included): same marks each, objective, class 8 and below. */
export function poolOf(section: PoolSection, sections: PoolSection[]): string[] {
  if (!poolable(section)) return [section.id];
  return sections.filter((s) => poolable(s) && s.marksEach === section.marksEach).map((s) => s.id);
}

/**
 * Why `slots` slots cannot move from one section to another on this paper; null when they can. `sections` carry their
 * effective counts and `filled` is each section's placed units.
 */
export function rebalanceProblem(
  sections: PoolSection[],
  filled: Record<string, number>,
  fromId: string,
  toId: string,
  slots: number,
): string | null {
  const from = sections.find((s) => s.id === fromId);
  const to = sections.find((s) => s.id === toId);
  if (!from || !to) return "That section is not part of this paper.";
  if (fromId === toId) return "Choose a different section to move slots to.";
  if (!Number.isInteger(slots) || slots < 1) return "Move at least 1 slot.";
  if (!poolOf(from, sections).includes(toId)) {
    return `${from.title ?? "That section"} and ${to.title ?? "that section"} do not take the same marks per question, so slots cannot move between them.`;
  }
  const placed = filled[fromId] ?? 0;
  if (from.count - slots < placed) {
    return `${from.title ?? "That section"} already has ${placed} of its ${from.count} slots filled; only ${Math.max(0, from.count - placed)} can move.`;
  }
  if (from.count - slots < 1) return `${from.title ?? "That section"} must keep at least one slot.`;
  return null;
}

/** The sections with this paper's slot moves applied. A delta for a section that is gone is ignored. */
export function applySlotDeltas<T extends { id: string; count: number }>(
  sections: T[],
  deltas: Array<{ sectionId: string; delta: number }>,
): T[] {
  const byId = new Map(deltas.map((d) => [d.sectionId, d.delta]));
  return sections.map((s) => (byId.has(s.id) ? { ...s, count: s.count + (byId.get(s.id) ?? 0) } : s));
}
