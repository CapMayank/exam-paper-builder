import type { AnyActivityPlugin } from "./types";

/** Whether this activity, with these settings, prints well in half the page width. */
export function fitsHalfWidth(plugin: AnyActivityPlugin | undefined, config: unknown): boolean {
  if (!plugin?.halfWidth) return false;
  try {
    return plugin.halfWidth(config);
  } catch {
    return false; // a malformed saved config prints full width, as before
  }
}

/**
 * Rows of a worksheet: two half-width activities that come one after the other share a row
 * (left then right, so the numbers still read in order); everything else takes a row of its own.
 * Nothing is reordered, and no pair spans a forced page break.
 */
export function pairHalfWidth<T>(items: readonly T[], isHalf: (item: T) => boolean, breaksBefore?: (item: T) => boolean): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    const b = items[i + 1];
    if (b !== undefined && isHalf(a) && isHalf(b) && !breaksBefore?.(b)) {
      rows.push([a, b]);
      i++;
    } else {
      rows.push([a]);
    }
  }
  return rows;
}

/**
 * An order in which more small activities can share rows: walking down the worksheet, a half-width activity
 * with no half-width neighbour is joined by the next half-width one further down, which moves up beside it.
 * Everything else keeps its order, so the worksheet still reads the way the teacher built it.
 */
export function arrangeToFit<T>(items: readonly T[], isHalf: (item: T) => boolean): T[] {
  const rest = [...items];
  const out: T[] = [];
  while (rest.length) {
    const a = rest.shift()!;
    out.push(a);
    if (!isHalf(a)) continue;
    if (rest.length && isHalf(rest[0])) {
      out.push(rest.shift()!); // already has its partner
      continue;
    }
    const k = rest.findIndex(isHalf);
    if (k > 0) out.push(rest.splice(k, 1)[0]);
  }
  return out;
}
