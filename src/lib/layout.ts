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
  /** Page indices (0-based, null = blank page) as [left, right] on each side of the A3/A4 sheet. */
  front: [number | null, number | null];
  back: [number | null, number | null];
};

/**
 * Impose 2-Up Cut-in-half layout for a 2-page or 1-page exam paper onto an A4 landscape sheet.
 * Prints 2 complete copies of the paper on 1 sheet that can be cut down the middle with a guillotine cutter!
 * 2 Pages: Front [Page 0, Page 0], Back [Page 1, Page 1] (duplex).
 * 1 Page: Front [Page 0, Page 0] (single-sided).
 */
export function imposeTwoUpCut(realPages: number): Sheet[] {
  if (realPages > 2) {
    throw new Error("2-Up Cut-in-Half mode is only supported for papers with 1 or 2 pages");
  }
  if (realPages <= 1) {
    return [
      {
        front: [0, 0], // Left: Copy 1 Page 1, Right: Copy 2 Page 1
        back: [null, null],
      },
    ];
  }
  return [
    {
      front: [0, 0], // Left: Copy 1 Page 1, Right: Copy 2 Page 1
      back: [1, 1],  // Left: Copy 1 Page 2, Right: Copy 2 Page 2
    },
  ];
}

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

import { getSharedInstruction, type NumberingStyle, type PaperLanguage } from "./constants";


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

export interface DisplayedItemNumber {
  questionNumber: number;
  displayLabel: string;
  subLabel?: string;
  isGroupedSubItem: boolean;
}

export interface DisplayedSectionRange {
  sectionId: string;
  startQ: number;
  endQ: number;
  displayedCount: number;
  rawItemCount: number;
  groupStartQ: number;
  groupEndQ: number;
  groupDisplayedCount: number;
  groupRawItemCount: number;
}

export interface DisplayedPaperNumbering {
  totalDisplayedQuestions: number;
  totalRawItems: number;
  hasGroupedSubItems: boolean;
  sectionRanges: Record<string, DisplayedSectionRange>;
  itemNumbers: Record<string, DisplayedItemNumber>;
}

/**
 * Computes consistent displayed question numbers across sections and items,
 * accounting for grouped objective exercises (TRUE_FALSE and FILL_BLANK with >1 item)
 * which occupy 1 top-level question number with (a), (b), ... sub-items.
 */
export function computeDisplayedPaperNumbering(
  sections: Array<{ id: string; title: string; type: string; order?: number }>,
  items: Array<{ id: string; sectionId?: string | null; position?: number; question?: { type?: string } }>,
  numberingStyle: NumberingStyle = "CONTINUOUS"
): DisplayedPaperNumbering {
  const sortedSections = [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const itemNumbers: Record<string, DisplayedItemNumber> = {};
  const rawSectionRanges: Array<{
    sectionId: string;
    title: string;
    startQ: number;
    endQ: number;
    displayedCount: number;
    rawItemCount: number;
  }> = [];

  let globalCounter = 0;

  if (sortedSections.length > 0) {
    sortedSections.forEach((sec, sIdx) => {
      const sItems = items
        .filter((it) => it.sectionId === sec.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      const sLetter =
        sec.title.match(/Section\s+([A-Z])/i)?.[1]?.toUpperCase() ||
        String.fromCharCode(65 + sIdx);

      const isGroupedObjective =
        (sec.type === "TRUE_FALSE" || sec.type === "FILL_BLANK") && sItems.length > 1;

      if (sItems.length === 0) {
        rawSectionRanges.push({
          sectionId: sec.id,
          title: sec.title.trim(),
          startQ: globalCounter + 1,
          endQ: globalCounter,
          displayedCount: 0,
          rawItemCount: 0,
        });
        return;
      }

      if (isGroupedObjective) {
        const qIdx = globalCounter++;
        const qLabel = formatQuestionNumber(numberingStyle, qIdx, sLetter, 0);
        sItems.forEach((item, localIdx) => {
          const subLetter = String.fromCharCode(97 + localIdx);
          itemNumbers[item.id] = {
            questionNumber: qIdx + 1,
            displayLabel: `${qLabel} (${subLetter})`,
            subLabel: `(${subLetter})`,
            isGroupedSubItem: true,
          };
        });
        rawSectionRanges.push({
          sectionId: sec.id,
          title: sec.title.trim(),
          startQ: qIdx + 1,
          endQ: qIdx + 1,
          displayedCount: 1,
          rawItemCount: sItems.length,
        });
      } else {
        const startQ = globalCounter + 1;
        sItems.forEach((item, localIdx) => {
          const qIdx = globalCounter++;
          const qLabel = formatQuestionNumber(numberingStyle, qIdx, sLetter, localIdx);
          itemNumbers[item.id] = {
            questionNumber: qIdx + 1,
            displayLabel: qLabel,
            isGroupedSubItem: false,
          };
        });
        rawSectionRanges.push({
          sectionId: sec.id,
          title: sec.title.trim(),
          startQ,
          endQ: globalCounter,
          displayedCount: sItems.length,
          rawItemCount: sItems.length,
        });
      }
    });
  } else {
    const sortedItems = [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    sortedItems.forEach((item, localIdx) => {
      const qIdx = globalCounter++;
      const qLabel = formatQuestionNumber(numberingStyle, qIdx, "A", localIdx);
      itemNumbers[item.id] = {
        questionNumber: qIdx + 1,
        displayLabel: qLabel,
        isGroupedSubItem: false,
      };
    });
  }

  // Group contiguous sections sharing the same title (e.g. multiple sub-sections under "Section A")
  const sectionRanges: Record<string, DisplayedSectionRange> = {};
  let i = 0;
  while (i < rawSectionRanges.length) {
    let j = i;
    while (
      j + 1 < rawSectionRanges.length &&
      rawSectionRanges[j + 1].title.toLowerCase() === rawSectionRanges[i].title.toLowerCase()
    ) {
      j++;
    }
    const groupSlice = rawSectionRanges.slice(i, j + 1);
    const nonEmptySlice = groupSlice.filter((r) => r.displayedCount > 0);
    const groupStartQ = nonEmptySlice.length > 0 ? nonEmptySlice[0].startQ : groupSlice[0].startQ;
    const groupEndQ =
      nonEmptySlice.length > 0 ? nonEmptySlice[nonEmptySlice.length - 1].endQ : groupSlice[0].endQ;
    const groupDisplayedCount = groupSlice.reduce((sum, r) => sum + r.displayedCount, 0);
    const groupRawItemCount = groupSlice.reduce((sum, r) => sum + r.rawItemCount, 0);

    for (const r of groupSlice) {
      sectionRanges[r.sectionId] = {
        sectionId: r.sectionId,
        startQ: r.startQ,
        endQ: r.endQ,
        displayedCount: r.displayedCount,
        rawItemCount: r.rawItemCount,
        groupStartQ,
        groupEndQ,
        groupDisplayedCount,
        groupRawItemCount,
      };
    }
    i = j + 1;
  }

  return {
    totalDisplayedQuestions: globalCounter,
    totalRawItems: items.length,
    hasGroupedSubItems: globalCounter !== items.length,
    sectionRanges,
    itemNumbers,
  };
}

/**
 * Reconciles hardcoded "Question Nos. X to Y" ranges inside section instructions
 * with the actual displayed question range [startQ, endQ] so section headers never
 * contradict displayed question numbering.
 */
export function reconcileSectionGroupInstruction(
  instruction: string | null | undefined,
  startQ: number,
  endQ: number
): string {
  if (!instruction) return "";
  if (startQ <= 0 || endQ < startQ) return instruction;

  let updated = instruction;
  // Replace English "Question Nos. X to Y" or "Question No. X to Y" or "Questions X to Y"
  updated = updated.replace(
    /\b(Questions?\s*(?:Nos?\.?)?\s*)\d+\s*(?:to|[-–])\s*\d+/gi,
    `$1${startQ} to ${endQ}`
  );
  // Replace Hindi "प्रश्न क्रमांक X से Y"
  updated = updated.replace(
    /(प्रश्‍?न\s*क्रमांक\s*)\d+\s*से\s*\d+/g,
    `$1${startQ} से ${endQ}`
  );
  // Replace Sanskrit "प्रश्नक्रमाङ्कः X तः Y पर्यन्तम्"
  updated = updated.replace(
    /(प्रश्नक्रमाङ्कः?\s*)\d+\s*तः\s*\d+(\s*पर्यन्तम्)?/g,
    `$1${startQ} तः ${endQ}$2`
  );
  return updated;
}

/**
 * Resolves the prompt shown on a grouped objective exercise (TRUE_FALSE or FILL_BLANK).
 * Prevents a multi-section overview instruction (such as "Question Nos. 1 to 5: Total 32 objective-type questions...")
 * from being repeated as the individual exercise prompt for Q7 (FILL_BLANK) or Q8 (TRUE_FALSE).
 */
export function resolveGroupedExerciseInstruction(
  sectionInstruction: string | null | undefined,
  sectionType: string,
  hasMultipleTypes: boolean,
  paperLang: PaperLanguage = "en"
): string {
  const shared = getSharedInstruction(sectionType, paperLang);
  const trimmed = (sectionInstruction || "").trim();
  if (!trimmed) return shared;

  const isEnglishInstruction = /^[A-Za-z0-9\s.,'":;()\-–?!/]+$/.test(trimmed);
  // If paper language is Sanskrit or Hindi, but sectionInstruction is purely English (e.g. from blueprint defaults), replace with shared localized instruction!
  if ((paperLang === "sa" || paperLang === "hi") && isEnglishInstruction) {
    return shared || trimmed;
  }

  const looksLikeSectionWideOverview =
    /\b(?:questions?\s*(?:nos?\.?)?\s*\d+\s*(?:to|[-–])\s*\d+|total\s+\d+\s+objective[- ]type|प्रश्‍?न\s*क्रमांक\s*\d+\s*से\s*\d+|प्रश्नक्रमाङ्कः?\s*\d+\s*तः\s*\d+)/i.test(
      trimmed
    );

  if (hasMultipleTypes || looksLikeSectionWideOverview) {
    return shared || trimmed;
  }
  return trimmed;
}


