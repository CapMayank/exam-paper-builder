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
