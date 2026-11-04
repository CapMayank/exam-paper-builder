"use client";

import { useEffect, useState } from "react";
import { api } from "./client";
import { effectivePresets, type PresetData, type PresetKind } from "./presets";

/**
 * The presets offered to everyone (the school's edits applied, hidden ones left out). Starts from the built-in
 * list so the dialog is usable at once, then switches to the school's list when it arrives.
 */
export function usePresets<K extends PresetKind>(kind: K): PresetData<K>[] {
  const [list, setList] = useState<PresetData<K>[]>(() => effectivePresets(kind, []));
  useEffect(() => {
    let cancelled = false;
    api<PresetData<K>[]>(`/api/presets?kind=${kind}`).then(
      (rows) => !cancelled && setList(rows),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [kind]);
  return list;
}
