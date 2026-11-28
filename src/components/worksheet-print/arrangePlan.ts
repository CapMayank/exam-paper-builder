import { arrangeForPrint, printZoomFor, type WorksheetMeasure } from "@/lib/kindergarten/worksheetPack";

const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

/**
 * What the print preview does with a worksheet during one visit, kept apart from React so its timing is
 * testable:
 *  1. on the first full-size measurement, arrange for the size the worksheet should print at;
 *  2. once print has drawn that arrangement and settled on a size, if the size is smaller than planned,
 *     arrange once more for the real size. A size reported for an older layout is ignored.
 */
export function createArrangePlan() {
  let base: WorksheetMeasure | null = null;
  let zoom = 1;
  /** The order print should be drawing once the last save lands. */
  let expected: string[] = [];
  /** Print has drawn `expected`, so the sizes it reports are about it. */
  let drawn = false;
  let corrected = false;
  let stopped = false;

  return {
    /** A full-size measurement; returns the order to save the first time, otherwise null. */
    measured(m: WorksheetMeasure): string[] | null {
      if (!base) {
        base = m;
        zoom = printZoomFor(m);
        const next = arrangeForPrint(m, zoom);
        expected = next ?? m.order;
        drawn = !next;
        return next;
      }
      if (!drawn && sameOrder(m.order, expected)) drawn = true;
      return null;
    },
    /** An order was saved (the first arrangement or the correction). */
    saved(order: string[]) {
      expected = order;
      drawn = false;
    },
    /**
     * Print settled on `scale`. Null when there is nothing to do; otherwise the re-check happened and
     * `order` is the order to save (or null when the current one is already best for that size).
     */
    fitScale(scale: number): { order: string[] | null } | null {
      if (!base || stopped || corrected || !drawn || scale >= zoom - 0.001) return null;
      corrected = true;
      return { order: arrangeForPrint({ ...base, order: expected }, scale) };
    },
    /** Undo: no more arranging this visit. */
    stop() {
      stopped = true;
    },
  };
}
