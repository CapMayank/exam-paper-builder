// What the paper-builder shows about chapter weightage. Weightage is a guide: nothing here blocks anything.
import type { PaperData } from "./types";

export type CoverageRow = {
  key: string;
  title: string;
  /** Number of lessons sharing this row's unit budget (1 for a plain chapter). */
  lessons: number;
  target: number;
  used: number;
  /** More than 1 mark away from the target, in either direction. */
  off: boolean;
};

export type CoverageSummary = {
  rows: CoverageRow[];
  /** Questions whose chapter the blueprint does not list. */
  outsideCount: number;
  /** Chapters (one per unit) still below their target, the largest gap first. */
  underCovered: Array<{ chapterId: string; number: number }>;
};

/** One row per quota group: lessons of one unit share a budget, so a unit is never compared with one lesson's share. */
export function coverageRows(paper: Pick<PaperData, "blueprint" | "progress" | "items">): CoverageSummary {
  const rows: CoverageRow[] = [];
  const firstOf = new Map<string, number>();
  const under: Array<{ chapterId: string; number: number; gap: number }> = [];
  for (const c of paper.blueprint.chapters) {
    const key = c.unitKey ? `u:${c.unitKey}` : `c:${c.chapterId}`;
    const at = firstOf.get(key);
    if (at !== undefined) {
      rows[at].lessons += 1;
      continue;
    }
    const prog = paper.progress.chapters.find((p) => p.chapterId === c.chapterId);
    const target = prog?.target ?? c.marks;
    const used = prog?.used ?? 0;
    firstOf.set(key, rows.length);
    rows.push({
      key,
      title: c.chapter.title.replace(/^\[[^\]]+\]\s*/, ""),
      lessons: 1,
      target,
      used,
      off: Math.abs(used - target) > 1,
    });
    if (used < target) under.push({ chapterId: c.chapterId, number: c.chapter.number, gap: target - used });
  }
  // a unit of several lessons is named after the unit
  for (const c of paper.blueprint.chapters) {
    const at = firstOf.get(c.unitKey ? `u:${c.unitKey}` : `c:${c.chapterId}`);
    if (at !== undefined && rows[at].lessons > 1 && c.unitKey && c.unitTitle) rows[at].title = c.unitTitle;
  }
  const listed = new Set(paper.blueprint.chapters.map((c) => c.chapterId));
  const outsideCount = paper.items.filter((i) => !listed.has(i.question.chapterId)).length;
  return {
    rows: rows.filter((r) => r.target > 0 || r.used > 0),
    outsideCount,
    underCovered: under.sort((a, b) => b.gap - a.gap || a.number - b.number).map(({ chapterId, number }) => ({ chapterId, number })),
  };
}
