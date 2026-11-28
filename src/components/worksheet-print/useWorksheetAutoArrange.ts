"use client";

import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/client";
import { arrangeForPrint, printZoomFor, type WorksheetMeasure } from "@/lib/kindergarten/worksheetPack";
import type { PaperData } from "@/lib/types";

/**
 * Print preview of a Nursery–KG worksheet: once the page has been measured at full size, put the activities
 * in the order that fills the pages best, save it (so the answer key and exports number them the same), and
 * offer Undo. Runs once per visit, plus one correction if print ends up smaller than expected; never for a
 * finalised worksheet, one with auto-arrange off, or a user who can't edit it (the server refuses the save).
 */
export function useWorksheetAutoArrange(paper: PaperData | null, setPaper: (p: PaperData) => void) {
  const [activityHeights, setActivityHeights] = useState<Record<string, number> | undefined>(undefined);
  const [previous, setPrevious] = useState<string[] | null>(null);
  const tried = useRef(false);
  const undoing = useRef(false);
  // what the first arrangement was based on, for the one correction once print settles on a size
  const plan = useRef<{ measure: WorksheetMeasure; zoom: number; order: string[]; corrected: boolean } | null>(null);

  const save = useCallback(
    (order: string[], before: string[]) => {
      if (!paper) return;
      api<PaperData>(`/api/papers/${paper.id}/activities`, { method: "PUT", json: { order } })
        .then((p) => {
          setPaper(p);
          setPrevious((prev) => prev ?? before);
          if (plan.current) plan.current.order = order;
        })
        .catch(() => undefined); // can't edit, finalised meanwhile, or the list changed: print as saved
    },
    [paper, setPaper],
  );

  const onMeasured = useCallback(
    (m: WorksheetMeasure) => {
      // the first full-size measurement is kept: later ones are of the arranged page and would only drift
      setActivityHeights((h) => h ?? m.heights);
      if (tried.current || !paper) return;
      tried.current = true;
      if (paper.autoArrange === false || paper.status === "FINAL") return;
      const zoom = printZoomFor(m);
      plan.current = { measure: m, zoom, order: m.order, corrected: false };
      const next = arrangeForPrint(m, zoom);
      if (next) save(next, m.order);
    },
    [paper, save],
  );

  /** Print settled on this size: if it had to go smaller than planned, arrange once more for that size. */
  const onFitScale = useCallback(
    (scale: number | undefined) => {
      const p = plan.current;
      if (!p || p.corrected || scale === undefined || scale >= p.zoom - 0.001) return;
      p.corrected = true;
      const next = arrangeForPrint({ ...p.measure, order: p.order }, scale);
      if (next) save(next, p.measure.order);
    },
    [save],
  );

  const undo = useCallback(async () => {
    if (!paper || !previous || undoing.current) return;
    undoing.current = true;
    try {
      setPaper(await api<PaperData>(`/api/papers/${paper.id}/activities`, { method: "PUT", json: { order: previous } }));
      setPrevious(null);
      if (plan.current) plan.current.corrected = true; // no more arranging this visit
      // keep the teacher's order next time too
      setPaper(await api<PaperData>(`/api/papers/${paper.id}`, { method: "PATCH", json: { autoArrange: false } }));
    } catch {
      // the order is back; if turning auto-arrange off failed, the next print preview arranges again
    } finally {
      undoing.current = false;
    }
  }, [paper, previous, setPaper]);

  return { activityHeights, onMeasured, onFitScale, arranged: previous !== null, undo };
}
