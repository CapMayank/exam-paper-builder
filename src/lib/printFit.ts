/**
 * Automatic fit for booklet papers. A BOOKLET_A4 paper is two A4 sheets folded to A5 pages,
 * so it must fit on at most BOOKLET_MAX_PAGES pages. Instead of one fixed spacing, the print
 * layout walks down FIT_LEVELS (loosest first) and keeps the first level whose measured page
 * count is within the limit. Every level stays above the readability floors below.
 */

export const BOOKLET_MAX_PAGES = 8;

/** Smallest text scale ever applied (9.5pt A5 body text -> 8.55pt). */
export const MIN_FONT_ZOOM = 0.9;
/** Smallest line-height multiplier for body text. */
export const MIN_LINE_HEIGHT = 1.2;
/** Smallest gap, in mm, kept between consecutive questions so they stay visually separate. */
export const MIN_QUESTION_GAP_MM = 1.2;

export type PrintFit = {
  /** Index into FIT_LEVELS; 0 is the paper's configured spacing. */
  level: number;
  /** Multiplier on paddings and margins between blocks. */
  gap: number;
  /** Body line-height (A5). */
  lineHeight: number;
  /** Multiplier on per-question answer space. */
  space: number;
  /** CSS zoom applied to the page content (text scale). */
  zoom: number;
  /**
   * Zoom the layout width is computed with (worksheets). Below this the layout stops getting wider and the
   * page scales uniformly, so every further step really shrinks the content.
   */
  layoutZoom?: number;
  /**
   * Extra text scale for reading passages and their stems at the tighter levels (long passages are what
   * push a booklet over its page limit). Combined with `zoom` it never drops below ~0.8 of normal size.
   */
  passageScale: number;
  /** A5 page padding in mm: left/right, top, bottom. */
  padX: number;
  padTop: number;
  padBottom: number;
};

export const FIT_LEVELS: readonly PrintFit[] = [
  { level: 0, gap: 1, lineHeight: 1.35, space: 1, zoom: 1, passageScale: 1, padX: 9, padTop: 8, padBottom: 14 },
  { level: 1, gap: 0.8, lineHeight: 1.3, space: 0.75, zoom: 1, passageScale: 1, padX: 8.5, padTop: 7.5, padBottom: 13.5 },
  { level: 2, gap: 0.65, lineHeight: 1.28, space: 0.55, zoom: 0.97, passageScale: 1, padX: 8, padTop: 7, padBottom: 13 },
  { level: 3, gap: 0.5, lineHeight: 1.25, space: 0.4, zoom: 0.95, passageScale: 0.96, padX: 7.5, padTop: 6.5, padBottom: 12.5 },
  { level: 4, gap: 0.4, lineHeight: 1.22, space: 0.3, zoom: 0.92, passageScale: 0.93, padX: 7, padTop: 6, padBottom: 12 },
  { level: 5, gap: 0.3, lineHeight: MIN_LINE_HEIGHT, space: 0.2, zoom: MIN_FONT_ZOOM, passageScale: 0.9, padX: 6.5, padTop: 6, padBottom: 12 },
];

export const LAST_FIT_LEVEL = FIT_LEVELS.length - 1;

/**
 * Nursery–KG worksheets print on one A4 sheet, front and back, so they must fit 2 pages no matter
 * how many activities were added. The whole page content is scaled down step by step (and the gaps
 * between activities tightened) until it fits. Activities are mostly pictures and boxes, so a uniform
 * scale keeps them correct; the floor of 40% is only reached by a very long worksheet.
 */
export const WORKSHEET_MAX_PAGES = 2;
export const WORKSHEET_FIT_LEVELS: readonly PrintFit[] = Array.from({ length: 16 }, (_, level) => ({
  level,
  gap: Math.max(0.3, 1 - level * 0.05),
  lineHeight: 1.4,
  space: Math.max(0.2, 1 - level * 0.06),
  zoom: +(1 - level * 0.04).toFixed(2),
  passageScale: 1,
  layoutZoom: Math.max(+(1 - level * 0.04).toFixed(2), 0.7),
  padX: 0,
  padTop: 0,
  padBottom: 0,
}));

export function getFit(level: number, levels: readonly PrintFit[] = FIT_LEVELS): PrintFit {
  return levels[Math.min(Math.max(0, Math.floor(level)), levels.length - 1)];
}

/** Scales a spacing in mm by the fit's gap multiplier, never below `floorMm`. */
export function fitMm(mm: number, fit: PrintFit, floorMm = 0.6): string {
  const scaled = fit.level === 0 ? mm : Math.max(Math.min(mm, floorMm), mm * fit.gap);
  return `${+scaled.toFixed(2)}mm`;
}

/**
 * Given the measured page count at `level`, decides the next level to try.
 * Returns null when no further step is needed (it fits, or the tightest level is already in use).
 */
export function nextFitLevel(level: number, pages: number, maxPages = BOOKLET_MAX_PAGES, lastLevel = LAST_FIT_LEVEL): number | null {
  if (pages <= maxPages) return null;
  return level >= lastLevel ? null : level + 1;
}

/**
 * What a paper of `pages` A5 pages costs in folded A4 sheets (4 pages each). A 1–2 page paper printed
 * two-up puts two copies on one sheet, so it costs half.
 */
export function sheetCost(pages: number, twoUp = false): number {
  if (twoUp && pages <= 2) return 0.5;
  return Math.max(1, Math.ceil(pages / 4));
}

/** Sides a booklet of `pages` pages leaves unprinted (5 pages -> 2 sheets -> 3 blank sides). */
export function blankSides(pages: number): number {
  return Math.max(1, Math.ceil(pages / 4)) * 4 - pages;
}

/**
 * Picks the print level from the page count measured at each level (index = level): the loosest level
 * that reaches the fewest sheets. Tightening that saves no sheet is never applied.
 */
export function chooseFitLevel(pagesByLevel: readonly number[], twoUp = false): number {
  const costs = pagesByLevel.map((p) => sheetCost(p, twoUp));
  return Math.max(0, costs.indexOf(Math.min(...costs)));
}

export type FitStatus = {
  level: number;
  pages: number;
  maxPages: number;
  /** True when auto-fit stepped the spacing below the configured level. */
  tightened: boolean;
  /** True when even the tightest level exceeds maxPages. */
  overLimit: boolean;
  /** Text scale in use (1 = full size). */
  scale: number;
};

export function describeFit(level: number, pages: number, maxPages = BOOKLET_MAX_PAGES, levels: readonly PrintFit[] = FIT_LEVELS): FitStatus {
  return { level, pages, maxPages, tightened: level > 0, overLimit: pages > maxPages, scale: getFit(level, levels).zoom };
}
