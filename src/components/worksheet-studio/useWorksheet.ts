"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { api } from "@/lib/client";
import { WORKSHEET_MODE } from "@/lib/constants";
import { getKindergartenActivity } from "@/lib/kindergarten/registry";
import type { AnyActivityPlugin } from "@/lib/kindergarten/types";
import type { PaperData } from "@/lib/types";
import { createHistory } from "./history";
import type { Activity } from "./types";
import { useActivityDrafts, type Draft } from "./useActivityDrafts";

type Snapshot = { type: string; text: string; options: string[]; marks: number };

function activitiesOf(paper: PaperData | null): Activity[] {
  if (!paper) return [];
  return [...paper.blueprint.sections]
    .sort((a, b) => a.position - b.position)
    .flatMap((section) => {
      const item = paper.items.find((i) => i.sectionId === section.id);
      const plugin = item ? getKindergartenActivity(item.question.type) : undefined;
      return item && plugin ? [{ item, section, plugin }] : [];
    });
}

/**
 * Everything the studio does to a worksheet, each change recorded so it can be undone:
 * add, duplicate, move, remove, marks and edits. A removed activity comes back with a new id,
 * so steps remember the id they were made with and look up what it is now.
 */
export function useWorksheet(id: string) {
  const [paper, setPaperState] = useState<PaperData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const paperRef = useRef<PaperData | null>(null);
  const idMap = useRef(new Map<string, string>());
  const replaying = useRef(false);
  const [history] = useState(() => createHistory());

  const setPaper = (next: PaperData | null | ((p: PaperData | null) => PaperData | null)) => {
    setPaperState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      paperRef.current = value;
      return value;
    });
  };

  const subject = paper?.blueprint.book.subject;
  // a saved draft becomes the page's own data again
  const drafts = useActivityDrafts(id, subject, (itemId, d) =>
    setPaper((p) =>
      p ? { ...p, items: p.items.map((i) => (i.id === itemId ? { ...i, question: { ...i.question, text: d.text, options: [JSON.stringify(d.config)] } } : i)) } : p,
    ),
  );

  useEffect(() => {
    let live = true;
    api<PaperData>(`/api/papers/${id}`)
      .then((p) => {
        if (!live) return;
        if ((p.blueprint as { curriculumMode?: string }).curriculumMode !== WORKSHEET_MODE) window.location.replace(`/papers/${id}`);
        else {
          paperRef.current = p;
          setPaperState(p);
        }
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [id]);

  const activities = useMemo(() => activitiesOf(paper), [paper]);

  // ---- helpers that work on the latest data, also from undo steps run later
  const resolve = (itemId: string) => {
    let cur = itemId;
    for (let i = 0; i < 50 && idMap.current.has(cur); i++) cur = idMap.current.get(cur)!;
    return cur;
  };
  const current = () => activitiesOf(paperRef.current);
  const find = (itemId: string) => current().find((a) => a.item.id === resolve(itemId));
  const indexOf = (itemId: string) => current().findIndex((a) => a.item.id === resolve(itemId));
  const record = (step: Parameters<typeof history.push>[0]) => {
    if (replaying.current) return;
    history.push(step);
    bump();
  };
  const snapshot = (a: Activity): Snapshot => {
    const d = drafts.draftFor(a);
    return { type: a.item.question.type, text: d.text, options: [JSON.stringify(d.config)], marks: a.section.marksEach };
  };

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
      return undefined;
    }
  }

  /** Adds an activity and returns its new item id. */
  async function insert(snap: Snapshot, insertAt?: number): Promise<string | undefined> {
    const before = new Set((paperRef.current?.items ?? []).map((i) => i.id));
    const next = await api<PaperData>(`/api/papers/${id}/activities`, {
      method: "POST",
      json: { type: snap.type, text: snap.text, options: snap.options, marks: snap.marks, ...(insertAt !== undefined ? { insertAt } : {}) },
    });
    setPaper(next);
    return next.items.find((i) => !before.has(i.id))?.id;
  }

  async function deleteItem(itemId: string) {
    setPaper(await api<PaperData>(`/api/papers/${id}/activities/${resolve(itemId)}`, { method: "DELETE" }));
  }

  async function placeAt(itemId: string, index: number) {
    setPaper(await api<PaperData>(`/api/papers/${id}/activities/${resolve(itemId)}`, { method: "PUT", json: { moveTo: index } }));
  }

  async function marksTo(itemId: string, marks: number) {
    const realId = resolve(itemId);
    const a = find(realId);
    if (!a) return;
    setPaper((p) =>
      p ? { ...p, blueprint: { ...p.blueprint, sections: p.blueprint.sections.map((s) => (s.id === a.section.id ? { ...s, marksEach: marks } : s)) } } : p,
    );
    await api(`/api/papers/${id}/activities/${realId}`, { method: "PUT", json: { marks } });
  }

  /** Re-adds a removed or undone activity where it was, and points its old id at the new one. */
  async function restore(oldId: string, snap: Snapshot, index: number) {
    const newId = await insert(snap, index);
    if (newId) idMap.current.set(resolve(oldId), newId);
  }

  // ---- the actions the studio calls

  async function add(plugin: AnyActivityPlugin): Promise<string | undefined> {
    return run(async () => {
      const config = plugin.defaultConfig(subject) as { instruction?: string };
      const snap: Snapshot = { type: plugin.type, text: config.instruction || plugin.label, options: [JSON.stringify(config)], marks: 2 };
      const newId = await insert(snap);
      if (!newId) return undefined;
      const index = indexOf(newId);
      record({ label: `Add ${plugin.shortLabel}`, undo: () => deleteItem(newId), redo: () => restore(newId, snap, index) });
      return newId;
    });
  }

  async function duplicate(a: Activity): Promise<string | undefined> {
    return run(async () => {
      const snap = snapshot(a);
      const index = indexOf(a.item.id) + 1;
      const newId = await insert(snap, index);
      if (!newId) return undefined;
      record({ label: `Duplicate ${a.plugin.shortLabel}`, undo: () => deleteItem(newId), redo: () => restore(newId, snap, index) });
      return newId;
    });
  }

  async function moveTo(a: Activity, index: number) {
    const from = indexOf(a.item.id);
    const to = Math.max(0, Math.min(current().length - 1, index));
    if (from < 0 || from === to) return;
    await run(async () => {
      await placeAt(a.item.id, to);
      const itemId = a.item.id;
      record({ label: `Move ${a.plugin.shortLabel}`, undo: () => placeAt(itemId, from), redo: () => placeAt(itemId, to) });
    });
  }

  async function remove(a: Activity) {
    await run(async () => {
      const snap = snapshot(a);
      const index = indexOf(a.item.id);
      const itemId = a.item.id;
      await deleteItem(itemId);
      record({ label: `Remove ${a.plugin.shortLabel}`, undo: () => restore(itemId, snap, index), redo: () => deleteItem(itemId) });
    });
  }

  async function setMarks(a: Activity, marks: number) {
    if (marks < 1 || marks > 20) return;
    const before = a.section.marksEach;
    const itemId = a.item.id;
    await run(async () => {
      await marksTo(itemId, marks);
      record({ label: "Change marks", coalesceKey: `marks:${resolve(itemId)}`, undo: () => marksTo(itemId, before), redo: () => marksTo(itemId, marks) });
    });
  }

  function edit(a: Activity, patch: Partial<Draft>) {
    const before = drafts.draftFor(a);
    drafts.edit(a, patch);
    const after = { ...before, ...patch };
    const itemId = a.item.id;
    const apply = async (d: Draft) => {
      const target = find(itemId);
      if (target) drafts.edit(target, d);
    };
    record({ label: `Edit ${a.plugin.shortLabel}`, coalesceKey: `edit:${resolve(itemId)}`, undo: () => apply(before), redo: () => apply(after) });
  }

  async function step(kind: "undo" | "redo") {
    replaying.current = true;
    try {
      await run(() => (kind === "undo" ? history.undo() : history.redo()));
    } finally {
      replaying.current = false;
      bump();
    }
  }

  /** Adds several activities in one go (class starter set); undone one by one. */
  async function addMany(plugins: AnyActivityPlugin[]) {
    for (const p of plugins) await add(p);
  }

  return {
    paper,
    setPaper,
    activities,
    error: error ?? drafts.error,
    clearError: () => {
      setError(null);
      drafts.clearError();
    },
    saving: drafts.saving,
    draftFor: drafts.draftFor,
    resolve,
    add,
    addMany,
    duplicate,
    moveTo,
    remove,
    setMarks,
    edit,
    undo: () => step("undo"),
    redo: () => step("redo"),
    undoLabel: history.undoLabel(),
    redoLabel: history.redoLabel(),
  };
}
