/** The print area of an A4 page: 182 mm wide, 267 mm tall (14 mm margins). */
const A4_HEIGHT_PER_WIDTH = 267 / 182;
/** Share of the first page taken by the school header, name lines and title. */
const HEADER_PAGES = 0.12;
const MAX_PAGES = 2;
/** Past this, print scales the worksheet down so far that letters and boxes get small. */
const TINY_FROM_PAGES = 2.5;

export type FillLevel = "fits" | "shrinks" | "tiny";

/**
 * How many A4 pages the worksheet needs at full size, from a copy laid out at the print width.
 * Past two pages, print scales the whole worksheet down to fit one sheet (front and back); how far
 * depends on the print page's own fitting, so this only says whether it fits, shrinks, or shrinks a lot.
 */
export function pageFill(contentPx: number, widthPx: number): { pages: number; level: FillLevel } {
  if (contentPx <= 0 || widthPx <= 0) return { pages: 0, level: "fits" };
  const pages = +(contentPx / (widthPx * A4_HEIGHT_PER_WIDTH) + HEADER_PAGES).toFixed(2);
  const level: FillLevel = pages <= MAX_PAGES ? "fits" : pages <= TINY_FROM_PAGES ? "shrinks" : "tiny";
  return { pages, level };
}
