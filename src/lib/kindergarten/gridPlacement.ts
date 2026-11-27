export type GridDirection = "COLUMN" | "ROW";

/**
 * Where each number goes in a writing grid, in the order a CSS grid paints its slots
 * (left to right, then top to bottom). Each entry is the index of the cell shown in that slot,
 * or null for an empty slot at the foot of the last column.
 *
 * ROW: 1 2 3 runs across. COLUMN: 1 2 3 runs down, so 1–10 fill the first column.
 */
export function gridOrder(count: number, columns: number, direction: GridDirection): (number | null)[] {
  if (count <= 0) return [];
  const cols = Math.max(1, Math.floor(columns));
  if (direction === "ROW") return Array.from({ length: count }, (_, i) => i);
  const rows = Math.ceil(count / cols);
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
