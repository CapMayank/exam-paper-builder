/**
 * Worksheet packing: how activities sit on the page, and which order fills the pages best.
 *
 * A page is a stack of rows. A row is one full-width activity, or two columns of half-width
 * activities stacked (a tall one can sit beside two short ones). The rows follow from the order
 * alone: every run of consecutive half-width activities becomes one columns row.
 */

export type PackItem = { id: string; half: boolean; height: number };

export type LayoutRow = { kind: "full"; ids: [string] } | { kind: "columns"; left: string[]; right: string[] };

const stackHeight = (heights: number[], gap: number) =>
  heights.length ? heights.reduce((a, b) => a + b, 0) + gap * (heights.length - 1) : 0;

/**
 * How many of a run of half-width activities go in the left column (the rest go right), so the two
 * columns end as close to level as they can. On a tie the left column takes more, so it is never the shorter.
 */
export function splitColumns(heights: number[], gap: number): number {
  const n = heights.length;
  if (n <= 1) return n;
  let best = 1;
  let bestDiff = Infinity;
  for (let k = 1; k < n; k++) {
    const diff = Math.abs(stackHeight(heights.slice(0, k), gap) - stackHeight(heights.slice(k), gap));
    if (diff <= bestDiff) {
      best = k;
      bestDiff = diff;
    }
  }
  return best;
}

/** The rows the activities make in this order. Reading order (and numbering) is unchanged. */
export function rowsFor(items: PackItem[], gap: number): LayoutRow[] {
  const rows: LayoutRow[] = [];
  for (let i = 0; i < items.length; ) {
    if (!items[i].half) {
      rows.push({ kind: "full", ids: [items[i].id] });
      i++;
      continue;
    }
    let j = i;
    while (j < items.length && items[j].half) j++;
    const run = items.slice(i, j);
    const k = splitColumns(
      run.map((x) => x.height),
      gap,
    );
    rows.push({ kind: "columns", left: run.slice(0, k).map((x) => x.id), right: run.slice(k).map((x) => x.id) });
    i = j;
  }
  return rows;
}

/** A row's height: the activity, or the taller of the two columns. */
export function rowHeight(row: LayoutRow, heightOf: Map<string, number>, gap: number): number {
  const h = (ids: string[]) => stackHeight(ids.map((id) => heightOf.get(id) ?? 0), gap);
  return row.kind === "full" ? h(row.ids) : Math.max(h(row.left), h(row.right));
}
