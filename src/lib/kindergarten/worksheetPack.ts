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

/** Usable heights of page 1 (below the worksheet header) and of later pages, and the gap between rows. */
export type PackPages = { page1: number; page2: number; gap: number };

type Laid = { pages: number; blank: number; orphans: number };

/** Lays the rows onto pages: a row that doesn't fit the rest of a page starts the next one. */
function layOut(order: PackItem[], pages: PackPages): Laid {
  const heightOf = new Map(order.map((i) => [i.id, i.height]));
  const rows = rowsFor(order, pages.gap);
  const halves = order.filter((i) => i.half).length;
  let count = 1;
  let used = 0;
  let blank = 0;
  let orphans = 0;
  const cap = () => (count === 1 ? pages.page1 : pages.page2);
  for (const row of rows) {
    const h = rowHeight(row, heightOf, pages.gap);
    const need = used > 0 ? used + pages.gap + h : h;
    if (need > cap() && used > 0) {
      blank += Math.max(0, cap() - used);
      count++;
      used = h;
    } else {
      used = need;
    }
    if (row.kind === "columns") {
      const col = (ids: string[]) => rowHeight({ kind: "full", ids: ids as [string] }, heightOf, pages.gap);
      // the shorter column leaves the space under it empty (half the page width)
      blank += (h - Math.min(col(row.left), col(row.right))) * 0.5;
      if (row.right.length === 0 && halves >= 2) orphans++;
    }
  }
  return { pages: count, blank, orphans };
}

/** How many pages the activities take in this order. */
export function pageCount(order: PackItem[], pages: PackPages): number {
  return layOut(order, pages).pages;
}

/** Empty space in this order: page bottoms before the last page and the space under shorter columns. */
export function blankArea(order: PackItem[], pages: PackPages): number {
  return layOut(order, pages).blank;
}

type Score = [number, number, number, number];

function score(order: PackItem[], pages: PackPages, startIndex: Map<string, number>): Score {
  const { pages: n, orphans, blank } = layOut(order, pages);
  const moved = order.reduce((s, it, k) => s + Math.abs(k - (startIndex.get(it.id) ?? k)), 0);
  return [n, orphans, Math.round(blank), moved];
}

const better = (a: Score, b: Score) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
};

/**
 * A first guess that fills each page in turn: from what is left, take the tallest piece that still fits
 * the rest of the page (a full-width activity, two small ones side by side, or one tall small one beside
 * two short ones stacked), ties going to the one that came first.
 */
function greedyFill(items: PackItem[], pages: PackPages): PackItem[] {
  const index = new Map(items.map((it, k) => [it.id, k]));
  const left = [...items];
  const out: PackItem[] = [];
  let room = pages.page1;
  let used = 0;
  const g = pages.gap;
  while (left.length) {
    const units: { items: PackItem[]; h: number }[] = [];
    const halves = left.filter((i) => i.half);
    for (const it of left) if (!it.half) units.push({ items: [it], h: it.height });
    for (let a = 0; a < halves.length; a++) {
      for (let b = a + 1; b < halves.length; b++) {
        units.push({ items: [halves[a], halves[b]], h: Math.max(halves[a].height, halves[b].height) });
        for (let c = b + 1; c < halves.length; c++) {
          const [t, s1, s2] = [halves[a], halves[b], halves[c]].sort((x, y) => y.height - x.height);
          units.push({ items: [t, s1, s2], h: Math.max(t.height, s1.height + g + s2.height) });
        }
      }
    }
    if (halves.length === 1 && units.length === 0) units.push({ items: halves, h: halves[0].height });
    const space = room - (used > 0 ? used + g : 0);
    const firstAt = (u: { items: PackItem[] }) => Math.min(...u.items.map((i) => index.get(i.id)!));
    const fitting = units.filter((u) => u.h <= space);
    let pick: { items: PackItem[]; h: number };
    if (fitting.length) {
      pick = fitting.reduce((best, u) => (u.h > best.h || (u.h === best.h && firstAt(u) < firstAt(best)) ? u : best));
    } else if (used === 0) {
      pick = units.reduce((best, u) => (firstAt(u) < firstAt(best) ? u : best)); // too tall for any page: it goes alone
    } else {
      room = pages.page2;
      used = 0;
      continue;
    }
    out.push(...pick.items);
    for (const it of pick.items) left.splice(left.indexOf(it), 1);
    used = used > 0 ? used + g + pick.h : pick.h;
  }
  return out;
}

/** One packing pass: the better of the given order and a page-filling guess, improved by swapping pairs. */
function packOnce(items: PackItem[], pages: PackPages): PackItem[] {
  const startIndex = new Map(items.map((it, k) => [it.id, k]));
  const greedy = greedyFill(items, pages);
  let best = better(score(greedy, pages, startIndex), score(items, pages, startIndex)) ? greedy : [...items];
  let bestScore = score(best, pages, startIndex);
  for (let pass = 0; pass < 200; pass++) {
    let improved = false;
    for (let i = 0; i < best.length && !improved; i++) {
      for (let j = i + 1; j < best.length && !improved; j++) {
        const next = [...best];
        [next[i], next[j]] = [next[j], next[i]];
        const s = score(next, pages, startIndex);
        if (better(s, bestScore)) {
          best = next;
          bestScore = s;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return best;
}

/**
 * The order that fills the pages best: fewest pages, then no small activity left without a partner,
 * then the least empty space, then as close to the given order as possible. The same input always gives
 * the same answer, and packing its own answer again changes nothing.
 */
export function packWorksheet(items: PackItem[], pages: PackPages): string[] {
  let order = packOnce(items, pages);
  // repeat until packing the result finds nothing better, so a second run is a no-op
  for (let k = 0; k < 5; k++) {
    const again = packOnce(order, pages);
    if (again.every((it, i) => it.id === order[i].id)) break;
    order = again;
  }
  return order.map((it) => it.id);
}
