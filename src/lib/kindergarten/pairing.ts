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
