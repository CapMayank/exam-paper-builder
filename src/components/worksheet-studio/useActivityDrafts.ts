"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { parseKindergartenConfig } from "@/lib/kindergarten/registry";
import type { Activity } from "./types";

export type Draft = { text: string; config: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const SAVE_DELAY_MS = 700;

/**
 * Local copies of the activities being edited, saved to the server a moment after the last change.
 * Each activity has its own timer, so switching to another activity never drops a pending save.
 */
export function useActivityDrafts(paperId: string, subject?: string) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<Record<string, { timer: ReturnType<typeof setTimeout>; run: () => void }>>({});

  const draftFor = useCallback(
    (a: Activity): Draft =>
      drafts[a.item.id] ?? {
        text: a.item.question.text,
        config: parseKindergartenConfig(a.item.question.type, a.item.question.options?.[0], subject),
      },
    [drafts, subject],
  );

  function edit(a: Activity, patch: Partial<Draft>) {
    const next = { ...draftFor(a), ...patch };
    setDrafts((d) => ({ ...d, [a.item.id]: next }));
    const itemId = a.item.id;
    const existing = timers.current[itemId];
    if (existing) clearTimeout(existing.timer);
    else setPending((n) => n + 1);
    const run = async () => {
      delete timers.current[itemId];
      try {
        await api(`/api/papers/${paperId}/activities/${itemId}`, {
          method: "PUT",
          json: { text: next.text.trim() || next.config?.instruction || a.plugin.label, options: [JSON.stringify(next.config)] },
        });
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setPending((n) => Math.max(0, n - 1));
      }
    };
    timers.current[itemId] = { timer: setTimeout(run, SAVE_DELAY_MS), run };
  }

  // leaving the page sends whatever is still waiting
  useEffect(() => {
    const all = timers.current;
    return () => {
      for (const { timer, run } of Object.values(all)) {
        clearTimeout(timer);
        void run();
      }
    };
  }, []);

  return { draftFor, edit, saving: pending > 0, error, clearError: () => setError(null) };
}
