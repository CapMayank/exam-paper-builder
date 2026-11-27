"use client";

import { ArrowLeft, Check, LayoutTemplate, Pencil, Plus, Printer, Redo2, Sparkles, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorBanner, Spinner, useConfirm, useToast } from "@/components/ui";
import { EXAM_TYPE_LABEL, resolvePaperExamType } from "@/lib/constants";
import { EditorMemoryContext } from "@/lib/kindergarten/editor-kit";
import type { AnyActivityPlugin } from "@/lib/kindergarten/types";
import { paperOutputTab } from "@/lib/paperTabs";
import { ActivityInspector } from "./ActivityInspector";
import { ActivityLibrary } from "./ActivityLibrary";
import { DetailsModal } from "./DetailsModal";
import { TemplatesModal } from "./TemplatesModal";
import { BUILT_IN_TEMPLATES } from "@/lib/worksheetTemplates";
import { useWorksheet } from "./useWorksheet";
import { WorksheetCanvas, activityDomId } from "./WorksheetCanvas";
import type { Activity } from "./types";

function scrollToActivity(itemId: string) {
  requestAnimationFrame(() => document.getElementById(activityDomId(itemId))?.scrollIntoView({ behavior: "smooth", block: "center" }));
}

function typingInField(target: EventTarget | null) {
  return target instanceof Element && !!target.closest("input, textarea, select, [contenteditable=true], [role=dialog]");
}

/**
 * Nursery–KG worksheet builder. The page sits in the middle and gets the room; the activity library slides in
 * when asked for, and the editor docks beside the page (a sheet at the bottom on smaller screens) only while an
 * activity is picked.
 */
export function WorksheetStudio({ id }: { id: string }) {
  const confirm = useConfirm();
  const toast = useToast();
  const ws = useWorksheet(id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const announce = (text: string) => setAnnouncement(text);
  const [moreOpen, setMoreOpen] = useState<Record<string, boolean>>({});

  const { paper, activities } = ws;
  const subject = paper?.blueprint.book.subject;
  // a step that brought an activity back gives it a new id: follow it so the selection survives
  const liveSelectedId = selectedId ? ws.resolve(selectedId) : null;
  const selectedIndex = activities.findIndex((a) => a.item.id === liveSelectedId);
  const selected = selectedIndex >= 0 ? activities[selectedIndex] : null;

  const memory = useMemo(
    () => ({ isOpen: (k: string) => !!moreOpen[k], setOpen: (k: string, v: boolean) => setMoreOpen((m) => ({ ...m, [k]: v })) }),
    [moreOpen],
  );

  // Escape puts the editor away; Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) undo and redo – text boxes keep their own undo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typingInField(e.target)) return;
      if (e.key === "Escape") setSelectedId(null);
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        void ws.undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        void ws.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ws]);

  async function withBusy(fn: () => Promise<string | undefined | void>) {
    setBusy(true);
    try {
      const newId = await fn();
      if (newId) {
        setSelectedId(newId);
        scrollToActivity(newId);
      }
    } finally {
      setBusy(false);
    }
  }

  const select = (itemId: string) => {
    setSelectedId(itemId);
    // below xl the editor is a sheet over the lower part of the screen: lift the activity above it
    if (window.matchMedia("(max-width: 1279px)").matches) {
      requestAnimationFrame(() => document.getElementById(activityDomId(itemId))?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  async function remove(a: Activity) {
    const ok = await confirm({
      title: "Remove this activity?",
      message: `“${a.plugin.shortLabel}” will be removed from the worksheet. You can undo this.`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    if (liveSelectedId === a.item.id) setSelectedId(null);
    await ws.remove(a);
  }

  if (ws.error && !paper) return <p className="p-8 text-red-700">{ws.error}</p>;
  if (!paper) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm font-semibold text-slate-600">
        <Spinner size="sm" /> Loading worksheet…
      </div>
    );
  }

  const className = paper.blueprint.book.className;
  const starter = BUILT_IN_TEMPLATES.find((t) => t.className === className && t.subject === subject);

  return (
    <EditorMemoryContext.Provider value={memory}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/papers" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-700">
              <ArrowLeft size={13} /> All papers
            </Link>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-xl font-bold text-slate-900">{paper.title}</h1>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">{className}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{subject}</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">{EXAM_TYPE_LABEL[resolvePaperExamType(paper)]}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500" aria-live="polite">
              {ws.saving ? (
                <>
                  <Spinner size="sm" /> Saving…
                </>
              ) : (
                <>
                  <Check size={13} className="text-emerald-600" /> All changes saved
                </>
              )}
            </span>
            <div className="flex items-center">
              <button
                type="button"
                className="btn btn-icon rounded-r-none"
                aria-label={ws.undoLabel ? `Undo: ${ws.undoLabel}` : "Nothing to undo"}
                title={ws.undoLabel ? `Undo: ${ws.undoLabel} (Ctrl+Z)` : "Nothing to undo"}
                disabled={!ws.undoLabel}
                onClick={() => void ws.undo()}
              >
                <Undo2 size={15} />
              </button>
              <button
                type="button"
                className="btn btn-icon -ml-px rounded-l-none"
                aria-label={ws.redoLabel ? `Redo: ${ws.redoLabel}` : "Nothing to redo"}
                title={ws.redoLabel ? `Redo: ${ws.redoLabel} (Ctrl+Shift+Z)` : "Nothing to redo"}
                disabled={!ws.redoLabel}
                onClick={() => void ws.redo()}
              >
                <Redo2 size={15} />
              </button>
            </div>
            <button type="button" className="btn" onClick={() => setTemplatesOpen(true)}>
              <LayoutTemplate size={14} /> Templates
            </button>
            <button type="button" className="btn" onClick={() => setDetailsOpen(true)}>
              <Pencil size={14} /> Details
            </button>
            <Link href={`/papers/${id}/print`} target={paperOutputTab(id)} className="btn">
              <Printer size={15} /> Print preview
            </Link>
            <button type="button" className="btn btn-primary" onClick={() => setLibraryOpen(true)}>
              {busy ? <Spinner size="sm" /> : <Plus size={15} />} Add activity
            </button>
          </div>
        </div>

        <ErrorBanner message={ws.error} onDismiss={ws.clearError} />
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>

        <div className={`grid items-start gap-6 ${selected ? "xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]" : ""}`}>
          {/* below xl the editor sheet covers the lower screen: leave room to scroll the last activity above it */}
          <section aria-label="Worksheet page" className={`min-w-0 ${selected ? "pb-[55vh] xl:pb-0" : ""}`}>
            <WorksheetCanvas
              activities={activities}
              selectedId={liveSelectedId}
              onSelect={select}
              onMoveTo={(a, index) => void ws.moveTo(a, index).then(() => announce(`${a.plugin.shortLabel} moved to position ${index + 1}`))}
              draftFor={ws.draftFor}
              onArrange={(order) => void ws.arrange(order, "Arrange to fit").then(() => announce("Activities arranged so small ones share rows"))}
              addButton={
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setLibraryOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-700 disabled:opacity-60"
                >
                  {busy ? <Spinner size="sm" /> : <Plus size={16} />} Add an activity
                </button>
              }
              emptyState={
                <EmptyState
                  icon={Sparkles}
                  title="Add your first activity"
                  description="Pick activities from the library, or start from a ready set."
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => setLibraryOpen(true)}>
                        <Plus size={15} /> Choose activities
                      </button>
                      {starter && (
                        <button type="button" className="btn" disabled={busy} onClick={() => withBusy(async () => (await ws.addTemplate(starter)).firstId)}>
                          {busy ? <Spinner size="sm" /> : <Sparkles size={15} />} Use “{starter.name}”
                        </button>
                      )}
                      <button type="button" className="btn" onClick={() => setTemplatesOpen(true)}>
                        <LayoutTemplate size={15} /> More templates
                      </button>
                    </div>
                  }
                />
              }
            />
          </section>

          {selected && (
            <aside
              id="ws-inspector"
              aria-label="Activity editor"
              className="anim-sheet fixed inset-x-0 bottom-0 z-30 sm:inset-x-4 xl:sticky xl:inset-x-auto xl:top-20 xl:bottom-auto xl:z-auto"
            >
              <ActivityInspector
                activity={selected}
                index={selectedIndex}
                total={activities.length}
                draft={ws.draftFor(selected)}
                onEdit={(patch) => ws.edit(selected, patch)}
                onMarks={(n) => void ws.setMarks(selected, n)}
                onMove={(dir) => {
                  const moved = selected;
                  void ws.nudge(moved, dir).then(() => {
                    scrollToActivity(ws.resolve(moved.item.id));
                    announce(`${moved.plugin.shortLabel} moved ${dir}`);
                  });
                }}
                onDuplicate={() => withBusy(() => ws.duplicate(selected))}
                onRemove={() => void remove(selected)}
                onClose={() => setSelectedId(null)}
              />
            </aside>
          )}
        </div>

        {libraryOpen && (
          <ActivityLibrary
            subject={subject}
            busy={busy}
            onClose={() => setLibraryOpen(false)}
            onAdd={(p: AnyActivityPlugin) =>
              void withBusy(async () => {
                const newId = await ws.add(p);
                setLibraryOpen(false);
                if (newId) announce(`${p.shortLabel} added`);
                return newId;
              })
            }
          />
        )}

        {templatesOpen && (
          <TemplatesModal
            className={className}
            subject={subject ?? ""}
            worksheetTitle={paper.title}
            snapshot={ws.snapshotAll}
            onUse={async (t) => {
              let complete = false;
              await withBusy(async () => {
                const r = await ws.addTemplate(t);
                complete = r.complete;
                return r.firstId;
              });
              return complete;
            }}
            onClose={() => setTemplatesOpen(false)}
          />
        )}

        {detailsOpen && (
          <DetailsModal
            paper={paper}
            onClose={() => setDetailsOpen(false)}
            onSaved={(p) => {
              ws.setPaper(p);
              setDetailsOpen(false);
              toast.success("Details updated");
            }}
          />
        )}
      </div>
    </EditorMemoryContext.Provider>
  );
}
