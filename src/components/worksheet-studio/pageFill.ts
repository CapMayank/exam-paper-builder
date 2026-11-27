import { WORKSHEET_FIT_LEVELS, WORKSHEET_MAX_PAGES } from "@/lib/printFit";

/** The print area of an A4 page: 182 mm wide, 267 mm tall (14 mm margins). */
const A4_HEIGHT_PER_WIDTH = 267 / 182;
/** Share of the first page taken by the school header, name lines and title. */
const HEADER_PAGES = 0.12;
/** Past this, print scales the worksheet down so far that letters and boxes get small. */
const TINY_FROM_PAGES = 2.5;
/** The smallest size print ever scales a worksheet to; below it the worksheet runs onto a third page. */
const MIN_SCALE = WORKSHEET_FIT_LEVELS[WORKSHEET_FIT_LEVELS.length - 1].zoom;

export type FillLevel = "fits" | "shrinks" | "tiny" | "overflow";

/**
 * How many A4 pages the worksheet needs at full size, from a copy laid out at the print width, and
 * about what size print will use. Past two pages, print scales the whole worksheet down to fit one
 * sheet (front and back), never below MIN_SCALE; the exact size comes from the print page's own fitting.
 */
export function pageFill(contentPx: number, widthPx: number): { pages: number; level: FillLevel; scale: number } {
  if (contentPx <= 0 || widthPx <= 0) return { pages: 0, level: "fits", scale: 1 };
  const pages = +(contentPx / (widthPx * A4_HEIGHT_PER_WIDTH) + HEADER_PAGES).toFixed(2);
  const needed = WORKSHEET_MAX_PAGES / pages;
  const scale = pages <= WORKSHEET_MAX_PAGES ? 1 : Math.max(MIN_SCALE, +needed.toFixed(2));
  const level: FillLevel =
    pages <= WORKSHEET_MAX_PAGES ? "fits" : needed < MIN_SCALE ? "overflow" : pages <= TINY_FROM_PAGES ? "shrinks" : "tiny";
  return { pages, level, scale };
}
