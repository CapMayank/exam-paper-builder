"use client";

import { ArrowLeft, Check, LayoutTemplate, Pencil, Printer, Redo2, Sparkles, Undo2 } from "lucide-react";
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

/** Nursery–KG worksheet builder: activity library · the printed page · the editor for the picked activity. */
export function WorksheetStudio({ id }: { id: string }) {
  const confirm = useConfirm();
  const toast = useToast();
  const ws = useWorksheet(id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
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
    // on small screens the editor sits below the page: bring it into view
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => document.getElementById("ws-inspector")?.scrollIntoView({ behavior: "smooth", block: "start" }));
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
            <Link href={`/papers/${id}/print`} target={paperOutputTab(id)} className="btn btn-primary">
              <Printer size={15} /> Print preview
            </Link>
          </div>
        </div>

        <ErrorBanner message={ws.error} onDismiss={ws.clearError} />

        <div className="grid items-start gap-4 lg:grid-cols-[12.5rem_minmax(0,1fr)_19rem] 2xl:grid-cols-[16rem_minmax(0,1fr)_24rem]">
          <aside aria-label="Activity library" className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
            <ActivityLibrary subject={subject} busy={busy} onAdd={(p: AnyActivityPlugin) => withBusy(() => ws.add(p))} />
          </aside>

          <section aria-label="Worksheet page" className="min-w-0">
            <WorksheetCanvas
              activities={activities}
              selectedId={liveSelectedId}
              onSelect={select}
              onMoveTo={(a, index) => void ws.moveTo(a, index)}
              draftFor={ws.draftFor}
              emptyState={
                <EmptyState
                  icon={Sparkles}
                  title="Add your first activity"
                  description="Pick activities from the library, or start from a ready set."
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      {starter && (
                        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => withBusy(() => ws.addTemplate(starter))}>
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

          <aside id="ws-inspector" aria-label="Activity editor" className="scroll-mt-4 lg:sticky lg:top-4">
            <ActivityInspector
              activity={selected}
              index={selectedIndex}
              total={activities.length}
              draft={selected ? ws.draftFor(selected) : null}
              onEdit={(patch) => selected && ws.edit(selected, patch)}
              onMarks={(n) => selected && void ws.setMarks(selected, n)}
              onMove={(dir) => {
                if (!selected) return;
                void ws.moveTo(selected, selectedIndex + (dir === "up" ? -1 : 1)).then(() => scrollToActivity(selected.item.id));
              }}
              onDuplicate={() => selected && withBusy(() => ws.duplicate(selected))}
              onRemove={() => selected && void remove(selected)}
              onClose={() => setSelectedId(null)}
            />
          </aside>
        </div>

        {templatesOpen && (
          <TemplatesModal
            className={className}
            subject={subject ?? ""}
            worksheetTitle={paper.title}
            snapshot={ws.snapshotAll}
            onUse={async (t) => withBusy(() => ws.addTemplate(t))}
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
