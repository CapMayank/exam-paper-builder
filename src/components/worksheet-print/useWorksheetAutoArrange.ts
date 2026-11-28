"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { WorksheetMeasure } from "@/lib/kindergarten/worksheetPack";
import type { PaperData } from "@/lib/types";
import { createArrangePlan } from "./arrangePlan";

/**
 * Print preview of a Nursery–KG worksheet: once the page has been measured at full size, put the activities
 * in the order that fills the pages best, save it (so the answer key and exports number them the same), and
 * offer Undo. Runs once per visit, plus one correction if print ends up smaller than planned (see
 * createArrangePlan); never for a finalised worksheet, one with auto-arrange off, or a user who can't edit it
 * (the server refuses the save).
 */
export function useWorksheetAutoArrange(paper: PaperData | null, setPaper: (p: PaperData) => void) {
  const [activityHeights, setActivityHeights] = useState<Record<string, number> | undefined>(undefined);
  const [previous, setPrevious] = useState<string[] | null>(null);
  const plan = useRef(createArrangePlan());
  const undoing = useRef(false);
  // the callbacks below stay the same across saves, so a save doesn't make print measure everything again
  // (updated before print's own measuring effects run, which call onMeasured)
  const paperRef = useRef(paper);
  const setPaperRef = useRef(setPaper);
  useLayoutEffect(() => {
    paperRef.current = paper;
    setPaperRef.current = setPaper;
  });

  const save = useCallback((order: string[], before: string[]) => {
    const p = paperRef.current;
    if (!p) return;
    plan.current.saved(order);
    api<PaperData>(`/api/papers/${p.id}/activities`, { method: "PUT", json: { order } })
      .then((next) => {
        setPaperRef.current(next);
        setPrevious((prev) => prev ?? before);
      })
      .catch(() => plan.current.stop()); // can't edit, finalised meanwhile, or the list changed: print as saved
  }, []);

  const onMeasured = useCallback(
    (m: WorksheetMeasure) => {
      // the first full-size measurement is kept: later ones are of the arranged page and would only drift
      setActivityHeights((h) => h ?? m.heights);
      const p = paperRef.current;
      if (!p || p.autoArrange === false || p.status === "FINAL") return;
      const next = plan.current.measured(m);
      if (next) save(next, m.order);
    },
    [save],
  );

  /** Print settled on this size (worksheets): arrange once more if it had to go smaller than planned. */
  const onFitScale = useCallback(
    (scale: number | undefined) => {
      if (scale === undefined) return;
      const check = plan.current.fitScale(scale);
      if (check?.order) save(check.order, check.order);
    },
    [save],
  );

  const undo = useCallback(async () => {
    const p = paperRef.current;
    if (!p || !previous || undoing.current) return;
    undoing.current = true;
    plan.current.stop();
    try {
      setPaperRef.current(await api<PaperData>(`/api/papers/${p.id}/activities`, { method: "PUT", json: { order: previous } }));
      setPrevious(null);
      // keep the teacher's order next time too
      setPaperRef.current(await api<PaperData>(`/api/papers/${p.id}`, { method: "PATCH", json: { autoArrange: false } }));
    } catch {
      // the order is back; if turning auto-arrange off failed, the next print preview arranges again
    } finally {
      undoing.current = false;
    }
  }, [previous]);

  return { activityHeights, onMeasured, onFitScale, arranged: previous !== null, undo };
}
