"use client";

import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/client";
import { arrangeForPrint, type WorksheetMeasure } from "@/lib/kindergarten/worksheetPack";
import type { PaperData } from "@/lib/types";

/**
 * Print preview of a Nursery–KG worksheet: once the page has been measured at full size, put the activities
 * in the order that fills the pages best, save it (so the answer key and exports number them the same), and
 * offer Undo. Runs once per visit; never for a finalised worksheet, one with auto-arrange off, or a user who
 * can't edit it (the server refuses the save and nothing changes).
 */
export function useWorksheetAutoArrange(paper: PaperData | null, setPaper: (p: PaperData) => void) {
  const [activityHeights, setActivityHeights] = useState<Record<string, number> | undefined>(undefined);
  const [previous, setPrevious] = useState<string[] | null>(null);
  const tried = useRef(false);
  const undoing = useRef(false);

  const onMeasured = useCallback(
    (m: WorksheetMeasure) => {
      // the first full-size measurement is kept: later ones are of the arranged page and would only drift
      setActivityHeights((h) => h ?? m.heights);
      if (tried.current || !paper) return;
      tried.current = true;
      if (paper.autoArrange === false || paper.status === "FINAL") return;
      const next = arrangeForPrint(m);
      if (!next) return;
      api<PaperData>(`/api/papers/${paper.id}/activities`, { method: "PUT", json: { order: next } })
        .then((p) => {
          setPaper(p);
          setPrevious(m.order);
        })
        .catch(() => undefined); // can't edit, finalised meanwhile, or the list changed: print as saved
    },
    [paper, setPaper],
  );

  const undo = useCallback(async () => {
    if (!paper || !previous || undoing.current) return;
    undoing.current = true;
    try {
      await api(`/api/papers/${paper.id}/activities`, { method: "PUT", json: { order: previous } });
      setPaper(await api<PaperData>(`/api/papers/${paper.id}`, { method: "PATCH", json: { autoArrange: false } }));
      setPrevious(null);
    } finally {
      undoing.current = false;
    }
  }, [paper, previous, setPaper]);

  return { activityHeights, onMeasured, arranged: previous !== null, undo };
}
