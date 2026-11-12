import { questionSlotMarks } from "./blueprint";
import { DEFAULT_MARKS_STYLE, MARKS_STYLES, type MarksStyle } from "./constants";

/** k when the student answers only k of the parts (0 < k < partCount); otherwise undefined. */
export function alternativesCount(partCount: number, attemptCount?: number | null): number | undefined {
  if (typeof attemptCount !== "number" || !Number.isFinite(attemptCount)) return undefined;
  return attemptCount > 0 && attemptCount < partCount ? attemptCount : undefined;
}

/** Whether each part prints its own marks tag. */
export function showPartMarks(
  partCount: number,
  attemptCount: number | null | undefined,
  marksStyle: MarksStyle,
): boolean {
  if (marksStyle === "SUPPRESSED") return false;
  return alternativesCount(partCount, attemptCount) === undefined;
}

/**
 * The "answer any k" count that applies to the parts a question prints: its own when it has stored parts,
 * else the one read from a list typed into its text (`decomposeForSlot`).
 */
export function partsAttemptCount(
  q: { subparts?: readonly unknown[] | null; attemptCount?: number | null },
  decomposed: { attemptCount?: number } | null | undefined,
): number | undefined {
  if (q.subparts && q.subparts.length > 0) return q.attemptCount ?? undefined;
  return decomposed?.attemptCount;
}

/** Stored marks style, or INLINE when empty or unknown. */
export function resolveMarksStyle(value?: string | null): MarksStyle {
  return (MARKS_STYLES as readonly string[]).includes(value ?? "") ? (value as MarksStyle) : DEFAULT_MARKS_STYLE;
}

/** What a question is worth on the answer key: the same attempt-aware, slot-capped figure the paper prints. */
export function answerKeyMarks(
  section: Parameters<typeof questionSlotMarks>[0],
  question: Parameters<typeof questionSlotMarks>[1],
): number {
  return questionSlotMarks(section, question).marks;
}
