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

/** Stored marks style, or INLINE when empty or unknown. */
export function resolveMarksStyle(value?: string | null): MarksStyle {
  return (MARKS_STYLES as readonly string[]).includes(value ?? "") ? (value as MarksStyle) : DEFAULT_MARKS_STYLE;
}
