export type GridDirection = "COLUMN" | "ROW";

/** Numbers in one column when counting down: one ten (1–10, 11–20, …), like a hundred chart. */
const PER_COLUMN = 10;

/**
 * How many empty slots go above the first number so each column holds one ten: a grid that
 * starts at 5 leaves 1–4 empty, one that counts down from 95 leaves 100–96 empty.
 * Tens run 1–10 unless the grid starts at 0 (then 0–9). 0 for anything that isn't a whole number.
 */
export function decadeLead(cells: { value: number | string }[]): number {
  if (cells.length === 0) return 0;
  const values = cells.map((c) => Number(c.value));
  if (!values.every(Number.isInteger)) return 0;
  const descending = values.length > 1 && values[0] > values[1];
  const low = Math.min(...values);
  const base = low === 0 ? 0 : 1;
  const within = (((values[0] - base) % PER_COLUMN) + PER_COLUMN) % PER_COLUMN;
  return descending ? PER_COLUMN - 1 - within : within;
}

/**
 * How many rows and columns a grid of `count` numbers really uses. Across rows, the column count
 * is kept between 2 and 10 (as printed). Counting down, every column holds ten numbers, so
 * `columns` is ignored; `lead` empty slots go above the first number (see decadeLead).
 */
export function gridShape(count: number, columns: number, direction: GridDirection, lead = 0): { rows: number; columns: number } {
  if (count <= 0) return { rows: 0, columns: 0 };
  // across rows keeps the layout older papers were printed with
  if (direction === "ROW") {
    const asked = Math.max(2, Math.min(10, Math.floor(columns) || 10));
    return { rows: Math.ceil(count / asked), columns: asked };
  }
  // everything fits in one ten: one short column, no gap above
  if (count + lead <= PER_COLUMN) return { rows: count, columns: 1 };
  return { rows: PER_COLUMN, columns: Math.ceil((count + lead) / PER_COLUMN) };
}

/**
 * Where each number goes in a writing grid, in the order a CSS grid paints its slots
 * (left to right, then top to bottom). Each entry is the index of the cell shown in that slot,
 * or null for an empty slot. Lay it out with `gridShape(...).columns`.
 *
 * ROW: 1 2 3 runs across. COLUMN: 1 2 3 runs down, ten to a column, so 1–10 fill the first one.
 */
export function gridOrder(count: number, columns: number, direction: GridDirection, lead = 0): (number | null)[] {
  if (count <= 0) return [];
  if (direction === "ROW") return Array.from({ length: count }, (_, i) => i);
  const { rows, columns: cols } = gridShape(count, columns, direction, lead);
  const offset = count + lead <= PER_COLUMN ? 0 : lead;
  const out: (number | null)[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = c * rows + r - offset;
      out.push(index >= 0 && index < count ? index : null);
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
export function numberCells(start: number, end: number, pattern: BlankPattern, descending = false): { value: number; isBlank: boolean }[] {
  const out: { value: number; isBlank: boolean }[] = [];
  // descending lists high to low, and the one number left printed is then the highest
  const first = descending ? end : start;
  for (let n = start; n <= end; n++) out.push({ value: n, isBlank: isBlankFor(pattern, n, first) });
  return descending ? out.reverse() : out;
}

/** Which pattern a grid's blanks follow, or CUSTOM when the teacher toggled cells by hand. */
export function blankPattern(cells: { value: number | string; isBlank: boolean }[]): BlankPattern | "CUSTOM" {
  const start = Number(cells[0]?.value);
  const patterns: BlankPattern[] = ["ALL_BLANK", "ALTERNATE", "EVERY_THIRD", "NONE"];
  return patterns.find((p) => cells.every((c) => c.isBlank === isBlankFor(p, Number(c.value), start))) ?? "CUSTOM";
}
