"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { api } from "@/lib/client";
import { WORKSHEET_MODE } from "@/lib/constants";
import { getKindergartenActivity } from "@/lib/kindergarten/registry";
import type { AnyActivityPlugin } from "@/lib/kindergarten/types";
import type { PaperData } from "@/lib/types";
import type { WorksheetTemplate } from "@/lib/worksheetTemplates";
import { createHistory, type HistoryStep } from "./history";
import { templateSnapshots, type ActivitySnapshot as Snapshot } from "./templates";
import type { Activity } from "./types";
import { useActivityDrafts, type Draft } from "./useActivityDrafts";

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

const isGone = (e: unknown) => (e as { status?: number })?.status === 404;

/**
 * Everything the studio does to a worksheet, each change recorded so it can be undone:
 * add, duplicate, move, remove, marks and edits.
 *
 * - Changes that talk to the server run one after another (a queue), so quick clicks, undo while an
 *   add is on its way, or a second drag never work from stale data or land out of order.
 * - A removed activity comes back with a new id, so steps remember the id they were made with and
 *   look up what it is now.
 * - Undo steps can be tried again after a failure: deleting something already gone is fine, and
 *   bringing back something already there is skipped.
 */
export function useWorksheet(id: string) {
  const [paper, setPaperState] = useState<PaperData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const paperRef = useRef<PaperData | null>(null);
  const idMap = useRef(new Map<string, string>());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [history] = useState(() => createHistory());

  // The ref is the latest worksheet right now (queued changes read it between renders); state follows it.
  const setPaper = (next: PaperData | null | ((p: PaperData | null) => PaperData | null)) => {
    const value = typeof next === "function" ? next(paperRef.current) : next;
    paperRef.current = value;
    setPaperState(value);
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
  const record = (step: HistoryStep) => {
    history.push(step);
    bump();
  };
  const snapshot = (a: Activity): Snapshot => {
    const d = drafts.draftFor(a);
    const config = d.config as { instruction?: string } | null;
    // an empty instruction means "the default one" (the server needs some text)
    const text = d.text.trim() || config?.instruction || a.plugin.label;
    return { type: a.item.question.type, text, options: [JSON.stringify(d.config)], marks: a.section.marksEach };
  };

  /** Runs a server change after the ones before it; errors show in the banner. Resolves to undefined on failure. */
  function serial<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setPending((n) => n + 1);
    const next = queue.current.then(async () => {
      setError(null);
      try {
        return await fn();
      } catch (e) {
        setError((e as Error).message);
        return undefined;
      } finally {
        setPending((n) => n - 1);
        bump();
      }
    });
    queue.current = next;
    return next;
  }

  /** Adds an activity and returns its new item id. */
  async function insert(snap: Snapshot, insertAt?: number): Promise<string> {
    const before = new Set((paperRef.current?.items ?? []).map((i) => i.id));
    const next = await api<PaperData>(`/api/papers/${id}/activities`, {
      method: "POST",
      json: { type: snap.type, text: snap.text, options: snap.options, marks: snap.marks, ...(insertAt !== undefined ? { insertAt } : {}) },
    });
    setPaper(next);
    const newId = next.items.find((i) => !before.has(i.id))?.id;
    if (!newId) throw new Error("The activity was added but could not be found – reload the page.");
    return newId;
  }

  /** Deletes an activity; one that is already gone counts as done. Its unsaved edits go with it. */
  async function deleteItem(itemId: string) {
    const realId = resolve(itemId);
    drafts.discard(realId);
    try {
      setPaper(await api<PaperData>(`/api/papers/${id}/activities/${realId}`, { method: "DELETE" }));
    } catch (e) {
      if (!isGone(e)) throw e;
      setPaper((p) => (p ? { ...p, items: p.items.filter((i) => i.id !== realId) } : p));
    }
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

  /** Brings back a removed or undone activity where it was (skipped if it is already there). */
  async function restore(oldId: string, snap: Snapshot, index: number) {
    if (find(oldId)) return;
    const newId = await insert(snap, index);
    idMap.current.set(resolve(oldId), newId);
  }

  // ---- the actions the studio calls

  function add(plugin: AnyActivityPlugin): Promise<string | undefined> {
    return serial(async () => {
      const config = plugin.defaultConfig(subject) as { instruction?: string };
      const snap: Snapshot = { type: plugin.type, text: config.instruction || plugin.label, options: [JSON.stringify(config)], marks: 2 };
      const newId = await insert(snap);
      const index = indexOf(newId);
      record({ label: `Add ${plugin.shortLabel}`, undo: () => deleteItem(newId), redo: () => restore(newId, snap, index) });
      return newId;
    });
  }

  function duplicate(a: Activity): Promise<string | undefined> {
    const snap = snapshot(a); // what it looks like now, edits included
    return serial(async () => {
      const index = indexOf(a.item.id) + 1;
      const newId = await insert(snap, index);
      record({ label: `Duplicate ${a.plugin.shortLabel}`, undo: () => deleteItem(newId), redo: () => restore(newId, snap, index) });
      return newId;
    });
  }

  function moveTo(a: Activity, index: number): Promise<void> {
    const itemId = a.item.id;
    return serial(async () => {
      // worked out when its turn comes, from the order as it is then
      const from = indexOf(itemId);
      const to = Math.max(0, Math.min(current().length - 1, index));
      if (from < 0 || from === to) return;
      await placeAt(itemId, to);
      record({ label: `Move ${a.plugin.shortLabel}`, undo: () => placeAt(itemId, from), redo: () => placeAt(itemId, to) });
    }).then(() => undefined);
  }

  /** Puts the activities in this order, front to back; ones removed since are skipped. */
  async function reorder(ids: string[]) {
    const live = ids.filter((itemId) => indexOf(itemId) >= 0);
    for (let k = 0; k < live.length; k++) {
      if (indexOf(live[k]) !== k) await placeAt(live[k], k);
    }
  }

  /** Changes the whole order at once (Arrange to fit); one undo puts it back. */
  function arrange(order: Activity[], label: string): Promise<void> {
    const target = order.map((a) => a.item.id);
    return serial(async () => {
      const before = current().map((a) => a.item.id);
      if (before.join() === target.map(resolve).join()) return;
      await reorder(target);
      record({ label, undo: () => reorder(before), redo: () => reorder(target) });
    }).then(() => undefined);
  }

  /** Moves one place up or down from where it is when its turn comes. */
  function nudge(a: Activity, dir: "up" | "down"): Promise<void> {
    const itemId = a.item.id;
    return serial(async () => {
      const from = indexOf(itemId);
      const to = from + (dir === "up" ? -1 : 1);
      if (from < 0 || to < 0 || to >= current().length) return;
      await placeAt(itemId, to);
      record({ label: `Move ${a.plugin.shortLabel}`, undo: () => placeAt(itemId, from), redo: () => placeAt(itemId, to) });
    }).then(() => undefined);
  }

  function remove(a: Activity): Promise<void> {
    const snap = snapshot(a);
    const itemId = a.item.id;
    return serial(async () => {
      const index = indexOf(itemId);
      await deleteItem(itemId);
      record({ label: `Remove ${a.plugin.shortLabel}`, undo: () => restore(itemId, snap, index), redo: () => deleteItem(itemId) });
    }).then(() => undefined);
  }

  function setMarks(a: Activity, marks: number): Promise<void> {
    if (marks < 1 || marks > 20) return Promise.resolve();
    const before = a.section.marksEach;
    const itemId = a.item.id;
    return serial(async () => {
      await marksTo(itemId, marks);
      record({ label: "Change marks", coalesceKey: `marks:${resolve(itemId)}`, undo: () => marksTo(itemId, before), redo: () => marksTo(itemId, marks) });
    }).then(() => undefined);
  }

  /** Edits are local (saved a moment later), so they are recorded straight away. */
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

  /**
   * Adds a template's activities at the end, as one step: undo takes them all away again.
   * Reports whether every activity went in; what did go in stays, as one undoable step.
   */
  function addTemplate(template: WorksheetTemplate): Promise<{ firstId?: string; complete: boolean }> {
    return serial(async () => {
      const snaps = templateSnapshots(template, subject);
      const added: { id: string; snap: Snapshot; index: number }[] = [];
      let failure: Error | null = null;
      for (const snap of snaps) {
        try {
          const newId = await insert(snap);
          added.push({ id: newId, snap, index: indexOf(newId) });
        } catch (e) {
          failure = e as Error;
          break;
        }
      }
      if (added.length) {
        record({
          label: `Add “${template.name}”`,
          undo: async () => {
            for (const x of [...added].reverse()) await deleteItem(x.id);
          },
          redo: async () => {
            for (const x of added) await restore(x.id, x.snap, x.index);
          },
        });
      }
      if (failure) setError(`Only ${added.length} of ${snaps.length} activities were added: ${failure.message}`);
      return { firstId: added[0]?.id, complete: !failure };
    }).then((r) => r ?? { complete: false });
  }

  /** The worksheet as it is now (with unsaved edits), for saving as a template. */
  const snapshotAll = (): Snapshot[] => current().map(snapshot);

  /** Whether print preview arranges the activities to fit the page (saved on the worksheet). */
  async function setAutoArrange(on: boolean) {
    try {
      setPaper(await api<PaperData>(`/api/papers/${id}`, { method: "PATCH", json: { autoArrange: on } }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function step(kind: "undo" | "redo") {
    return serial(() => (kind === "undo" ? history.undo() : history.redo()));
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
    saving: drafts.saving || pending > 0,
    draftFor: drafts.draftFor,
    resolve,
    add,
    duplicate,
    moveTo,
    nudge,
    arrange,
    setAutoArrange,
    remove,
    setMarks,
    edit,
    addTemplate,
    snapshotAll,
    undo: () => step("undo"),
    redo: () => step("redo"),
    undoLabel: history.undoLabel(),
    redoLabel: history.redoLabel(),
  };
}
