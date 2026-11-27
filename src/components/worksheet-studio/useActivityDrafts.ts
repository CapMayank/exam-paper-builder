"use client";

import { useEffect, useReducer, useState } from "react";
import { api } from "@/lib/client";
import { parseKindergartenConfig } from "@/lib/kindergarten/registry";
import { createDraftStore } from "./draftStore";
import type { Activity } from "./types";

export type Draft = { text: string; config: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const SAVE_DELAY_MS = 700;

/** The studio's view of the draft store: what each activity looks like now, and saving it to the server. */
export function useActivityDrafts(paperId: string, subject: string | undefined, onSaved: (itemId: string, draft: Draft) => void) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [error, setError] = useState<string | null>(null);
  const [labels] = useState(() => new Map<string, string>());
  // an empty instruction is saved as the activity's default one
  const savedText = (itemId: string, d: Draft) => d.text.trim() || d.config?.instruction || labels.get(itemId) || "Activity";
  const [store] = useState(() =>
    createDraftStore<Draft>({
      delayMs: SAVE_DELAY_MS,
      onChange: rerender,
      save: async (itemId, d, urgent) => {
        try {
          await api(`/api/papers/${paperId}/activities/${itemId}`, {
            method: "PUT",
            keepalive: urgent, // lets the request finish while the tab closes
            json: { text: savedText(itemId, d), options: [JSON.stringify(d.config)] },
          });
        } catch (e) {
          setError((e as Error).message);
          throw e; // the store keeps the draft
        }
      },
    }),
  );

  useEffect(() => store.subscribeSaved((itemId, d) => onSaved(itemId, { ...d, text: savedText(itemId, d) })));

  // leaving the page (another page in the app, a refresh or closing the tab) sends whatever is still waiting
  useEffect(() => {
    const flush = () => store.flushAll();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [store]);

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
