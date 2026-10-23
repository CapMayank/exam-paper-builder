// Pure print-layout helpers: page packing and booklet imposition.

/**
 * Greedy-pack blocks into pages. Blocks flagged keepWithNext are glued to the block after them
 * (so a section heading or reading passage stem never sits alone at the bottom of a page).
 * A unit taller than a page gets a page to itself rather than looping forever.
 * When blockGroupIds is provided, splitting a question across a page break correctly reserves
 * height for the continuation header on the continuation page so no content is clipped.
 * Returns, per page, the indices of the blocks placed on it.
 */
export function paginate(
  heights: number[],
  keepWithNext: boolean[],
  pageHeight: number,
  blockGroupIds?: (string | null | undefined)[],
  forceBreakBefore?: boolean[]
): number[][] {
  const units: { idx: number[]; h: number; groupId?: string | null; forceBreak?: boolean }[] = [];
  let cur: { idx: number[]; h: number; groupId?: string | null; forceBreak?: boolean } | null = null;
  heights.forEach((h, i) => {
    if (!cur) cur = { idx: [], h: 0, groupId: blockGroupIds ? blockGroupIds[i] : null, forceBreak: forceBreakBefore ? forceBreakBefore[i] : false };
    cur.idx.push(i);
    cur.h += h;
    if (forceBreakBefore && forceBreakBefore[i]) {
      cur.forceBreak = true;
    }
    if (!keepWithNext[i] || i === heights.length - 1) {
      units.push(cur);
      cur = null;
    }
  });

  const pages: number[][] = [];
  let page: number[] = [];
  let used = 0;
  const CONTINUATION_EXTRA_PX = 24; // Height of continuation banner
  const seenGroupsOnEarlierPages = new Set<string>();
  const currentGroupsOnPage = new Set<string>();

  for (const u of units) {
    const isContinuation = Boolean(
      u.groupId &&
      seenGroupsOnEarlierPages.has(u.groupId) &&
      !currentGroupsOnPage.has(u.groupId)
    );
    const extraH = isContinuation ? CONTINUATION_EXTRA_PX : 0;

    const shouldBreakForForced = u.forceBreak && page.length > 0;
    const shouldBreakForHeight = page.length > 0 && used + u.h + extraH > pageHeight;

    if (shouldBreakForForced || shouldBreakForHeight) {
      pages.push(page);
      page = [];
      used = 0;
      currentGroupsOnPage.forEach((g) => seenGroupsOnEarlierPages.add(g));
      currentGroupsOnPage.clear();
    }

    const isContOnFreshPage = Boolean(
      u.groupId &&
      seenGroupsOnEarlierPages.has(u.groupId) &&
      !currentGroupsOnPage.has(u.groupId)
    );
    const appliedExtraH = isContOnFreshPage ? CONTINUATION_EXTRA_PX : 0;

    page.push(...u.idx);
    used += u.h + appliedExtraH;
    if (u.groupId) currentGroupsOnPage.add(u.groupId);
  }
  if (page.length > 0) pages.push(page);
  return pages;
}

export type Sheet = {
  /** Page indices (0-based, null = blank page) as [left, right] on each side of the A3 sheet. */
  front: [number | null, number | null];
  back: [number | null, number | null];
};

/** Booklets need a multiple of 4 pages (one A3 sheet = 4 A4 pages). */
export function bookletPageCount(pages: number) {
  return Math.max(4, Math.ceil(pages / 4) * 4);
}

/**
 * Saddle-stitch imposition for an A3-landscape sheet folded in half.
 * Print duplex, flip on the short edge. Pages >= `realPages` print as blank.
 * 4 pages: front [3,0], back [1,2]. 8 pages: sheet1 front [7,0] back [1,6]; sheet2 front [5,2] back [3,4].
 */
export function imposeBooklet(realPages: number): Sheet[] {
  const total = bookletPageCount(realPages);
  const at = (p: number) => (p < realPages ? p : null);
  const sheets: Sheet[] = [];
  for (let k = 0; k < total / 4; k++) {
    sheets.push({
      front: [at(total - 1 - 2 * k), at(2 * k)],
      back: [at(2 * k + 1), at(total - 2 - 2 * k)],
    });
  }
  return sheets;
}

import type { NumberingStyle } from "./constants";


export { NumberingStyle };

/** Formats a question number according to the chosen NumberingStyle */
export function formatQuestionNumber(
  style: NumberingStyle,
  globalIdx: number,
  sectionLetter: string,
  sectionIdx: number,
): string {
  switch (style) {
    case "PREFIXED":
      return `Q.${globalIdx + 1}`;
    case "SECTION_RELATIVE":
      return `${sectionLetter}${sectionIdx + 1}`;
    case "CONTINUOUS":
    default:
      return `${globalIdx + 1}`;
  }
}

