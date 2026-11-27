"use client";

import { useEffect, useReducer, useState } from "react";
import { api } from "@/lib/client";
import { parseKindergartenConfig } from "@/lib/kindergarten/registry";
import { createDraftStore } from "./draftStore";
import type { Activity } from "./types";

export type Draft = { text: string; config: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const SAVE_DELAY_MS = 700;

/** The studio's view of the draft store: what each activity looks like now, and saving it to the server. */
export function useActivityDrafts(paperId: string, subject?: string) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [error, setError] = useState<string | null>(null);
  const [labels] = useState(() => new Map<string, string>());
  const [store] = useState(() =>
    createDraftStore<Draft>({
      delayMs: SAVE_DELAY_MS,
      onChange: rerender,
      save: async (itemId, d) => {
        try {
          await api(`/api/papers/${paperId}/activities/${itemId}`, {
            method: "PUT",
            json: { text: d.text.trim() || d.config?.instruction || labels.get(itemId) || "Activity", options: [JSON.stringify(d.config)] },
          });
        } catch (e) {
          setError((e as Error).message);
        }
      },
    }),
  );

  // leaving the page sends whatever is still waiting
  useEffect(() => () => store.flushAll(), [store]);

  const draftFor = (a: Activity): Draft =>
    store.get(a.item.id) ?? {
      text: a.item.question.text,
      config: parseKindergartenConfig(a.item.question.type, a.item.question.options?.[0], subject),
    };

  function edit(a: Activity, patch: Partial<Draft>) {
    labels.set(a.item.id, a.plugin.label);
    store.edit(a.item.id, draftFor(a), patch);
  }

  return { draftFor, edit, saving: store.pending() > 0, error, clearError: () => setError(null) };
}
