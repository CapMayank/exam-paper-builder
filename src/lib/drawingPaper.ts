import type { Layout } from "./constants";

/** Drawing papers always print on single portrait A4 pages, never the folded booklet. */
export const DRAWING_LAYOUT: Layout = "PAGE";

export function isDrawingSubject(subject?: string | null): boolean {
  return !!subject && /\bdrawing\b|चित्रकला|ड्राइंग/i.test(subject);
}

/** The layout a paper of this subject prints in: Drawing is always single pages; others keep their choice. */
export function layoutForSubject<L extends string>(subject: string | null | undefined, layout: L): L | typeof DRAWING_LAYOUT {
  return isDrawingSubject(subject) ? DRAWING_LAYOUT : layout;
}
