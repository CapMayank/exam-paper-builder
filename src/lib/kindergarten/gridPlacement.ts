export type GridDirection = "COLUMN" | "ROW";

/**
 * How many rows and columns a grid of `count` numbers really uses. The column count is kept
 * between 2 and 10 (as printed). Counting down, it never uses so many that a whole column stays empty.
 */
export function gridShape(count: number, columns: number, direction: GridDirection): { rows: number; columns: number } {
  if (count <= 0) return { rows: 0, columns: 0 };
  const asked = Math.max(2, Math.min(10, Math.floor(columns) || 10));
  // across rows keeps the layout older papers were printed with
  if (direction === "ROW") return { rows: Math.ceil(count / asked), columns: asked };
  const rows = Math.ceil(count / asked);
  return { rows, columns: Math.ceil(count / rows) };
}

/**
 * Where each number goes in a writing grid, in the order a CSS grid paints its slots
 * (left to right, then top to bottom). Each entry is the index of the cell shown in that slot,
 * or null for an empty slot at the foot of the last column. Lay it out with `gridShape(...).columns`.
 *
 * ROW: 1 2 3 runs across. COLUMN: 1 2 3 runs down, so 1–10 fill the first column.
 */
export function gridOrder(count: number, columns: number, direction: GridDirection): (number | null)[] {
  if (count <= 0) return [];
  if (direction === "ROW") return Array.from({ length: count }, (_, i) => i);
  const { rows, columns: cols } = gridShape(count, columns, direction);
  const out: (number | null)[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = c * rows + r;
      out.push(index < count ? index : null);
    }
  }
  return out;
}

export type BlankPattern = "NONE" | "ALTERNATE" | "EVERY_THIRD" | "ALL_BLANK";

function isBlankFor(pattern: BlankPattern, n: number, start: number): boolean {
  if (pattern === "ALTERNATE") return n % 2 === 0;
  if (pattern === "EVERY_THIRD") return n % 3 === 0;
  if (pattern === "ALL_BLANK") return n !== start; // only the first number is printed
  return false;
}

/** The cells of a number grid from `start` to `end`, with the blanks the pattern asks for. */
export function numberCells(start: number, end: number, pattern: BlankPattern): { value: number; isBlank: boolean }[] {
  const out: { value: number; isBlank: boolean }[] = [];
  for (let n = start; n <= end; n++) out.push({ value: n, isBlank: isBlankFor(pattern, n, start) });
  return out;
}

/** Which pattern a grid's blanks follow, or CUSTOM when the teacher toggled cells by hand. */
export function blankPattern(cells: { value: number | string; isBlank: boolean }[]): BlankPattern | "CUSTOM" {
  const start = Number(cells[0]?.value);
  const patterns: BlankPattern[] = ["ALL_BLANK", "ALTERNATE", "EVERY_THIRD", "NONE"];
  return patterns.find((p) => cells.every((c) => c.isBlank === isBlankFor(p, Number(c.value), start))) ?? "CUSTOM";
}
