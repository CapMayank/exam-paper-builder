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
  /** A5 page padding in mm: left/right, top, bottom. */
  padX: number;
  padTop: number;
  padBottom: number;
};

export const FIT_LEVELS: readonly PrintFit[] = [
  { level: 0, gap: 1, lineHeight: 1.35, space: 1, zoom: 1, padX: 9, padTop: 8, padBottom: 14 },
  { level: 1, gap: 0.8, lineHeight: 1.3, space: 0.75, zoom: 1, padX: 8.5, padTop: 7.5, padBottom: 13.5 },
  { level: 2, gap: 0.65, lineHeight: 1.28, space: 0.55, zoom: 0.97, padX: 8, padTop: 7, padBottom: 13 },
  { level: 3, gap: 0.5, lineHeight: 1.25, space: 0.4, zoom: 0.95, padX: 7.5, padTop: 6.5, padBottom: 12.5 },
  { level: 4, gap: 0.4, lineHeight: 1.22, space: 0.3, zoom: 0.92, padX: 7, padTop: 6, padBottom: 12 },
  { level: 5, gap: 0.3, lineHeight: MIN_LINE_HEIGHT, space: 0.2, zoom: MIN_FONT_ZOOM, padX: 6.5, padTop: 6, padBottom: 12 },
];

export const LAST_FIT_LEVEL = FIT_LEVELS.length - 1;

export function getFit(level: number): PrintFit {
  return FIT_LEVELS[Math.min(Math.max(0, Math.floor(level)), LAST_FIT_LEVEL)];
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
export function nextFitLevel(level: number, pages: number, maxPages = BOOKLET_MAX_PAGES): number | null {
  if (pages <= maxPages) return null;
  return level >= LAST_FIT_LEVEL ? null : level + 1;
}

export type FitStatus = {
  level: number;
  pages: number;
  maxPages: number;
  /** True when auto-fit stepped the spacing below the configured level. */
  tightened: boolean;
  /** True when even the tightest level exceeds maxPages. */
  overLimit: boolean;
};

export function describeFit(level: number, pages: number, maxPages = BOOKLET_MAX_PAGES): FitStatus {
  return { level, pages, maxPages, tightened: level > 0, overLimit: pages > maxPages };
}
