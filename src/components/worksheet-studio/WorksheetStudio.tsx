"use client";

import { ArrowLeft, Check, Pencil, Printer, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorBanner, Spinner, useConfirm, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { EXAM_TYPE_LABEL, WORKSHEET_MODE, resolvePaperExamType } from "@/lib/constants";
import { EditorMemoryContext } from "@/lib/kindergarten/editor-kit";
import { getKindergartenActivity } from "@/lib/kindergarten/registry";
import type { AnyActivityPlugin } from "@/lib/kindergarten/types";
import { paperOutputTab } from "@/lib/paperTabs";
import type { PaperData } from "@/lib/types";
import { ActivityInspector } from "./ActivityInspector";
import { ActivityLibrary } from "./ActivityLibrary";
import { DetailsModal } from "./DetailsModal";
import { useActivityDrafts } from "./useActivityDrafts";
import { WorksheetCanvas, activityDomId } from "./WorksheetCanvas";
import type { Activity } from "./types";

const QUICK_STARTS: Record<string, { label: string; types: string[] }> = {
  Nursery: { label: "Nursery starter (5 activities)", types: ["KDG_PREWRITING", "KDG_JOIN_DOTS", "KDG_COLOUR", "KDG_COUNT_ITEMS", "KDG_COMPARE"] },
  LKG: { label: "LKG starter (5 activities)", types: ["KDG_TRACE_WRITE", "KDG_MISSING_LETTERS", "KDG_COUNT_ITEMS", "KDG_PATTERN", "KDG_TICK_PICTURE"] },
  UKG: { label: "UKG starter (6 activities)", types: ["KDG_TRACE_WRITE", "KDG_MISSING_LETTERS", "KDG_NUMBER_GRID", "KDG_PICTURE_SUM", "KDG_TICK_PICTURE", "KDG_JOIN_DOTS"] },
};

function scrollToActivity(itemId: string) {
  requestAnimationFrame(() => document.getElementById(activityDomId(itemId))?.scrollIntoView({ behavior: "smooth", block: "center" }));
}

/** Nursery–KG worksheet builder: activity library · the printed page · the editor for the picked activity. */
export function WorksheetStudio({ id }: { id: string }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [paper, setPaper] = useState<PaperData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState<Record<string, boolean>>({});
  const subject = paper?.blueprint.book.subject;
  // a saved draft becomes the page's own data again
  const drafts = useActivityDrafts(id, subject, (itemId, d) =>
    setPaper((p) =>
      p
        ? {
            ...p,
            items: p.items.map((i) =>
              i.id === itemId ? { ...i, question: { ...i.question, text: d.text, options: [JSON.stringify(d.config)] } } : i,
            ),
          }
        : p,
    ),
  );

  const load = useCallback(async () => {
    try {
      const p = await api<PaperData>(`/api/papers/${id}`);
      if ((p.blueprint as { curriculumMode?: string }).curriculumMode !== WORKSHEET_MODE) {
        window.location.replace(`/papers/${id}`);
        return;
      }
      setPaper(p);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    let live = true;
    api<PaperData>(`/api/papers/${id}`)
      .then((p) => {
        if (!live) return;
        if ((p.blueprint as { curriculumMode?: string }).curriculumMode !== WORKSHEET_MODE) window.location.replace(`/papers/${id}`);
        else setPaper(p);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [id]);

  // Escape puts the editor away (but not while typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "Escape" || t?.closest("input, textarea, select, [role=dialog]")) return;
      setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activities: Activity[] = useMemo(() => {
    if (!paper) return [];
    return [...paper.blueprint.sections]
      .sort((a, b) => a.position - b.position)
      .flatMap((section) => {
        const item = paper.items.find((i) => i.sectionId === section.id);
        const plugin = item ? getKindergartenActivity(item.question.type) : undefined;
        return item && plugin ? [{ item, section, plugin }] : [];
      });
  }, [paper]);

  const selectedIndex = activities.findIndex((a) => a.item.id === selectedId);
  const selected = selectedIndex >= 0 ? activities[selectedIndex] : null;

  const memory = useMemo(
    () => ({ isOpen: (k: string) => !!moreOpen[k], setOpen: (k: string, v: boolean) => setMoreOpen((m) => ({ ...m, [k]: v })) }),
    [moreOpen],
  );

  async function addActivity(plugin: AnyActivityPlugin) {
    const config = plugin.defaultConfig(subject);
    const next = await api<PaperData>(`/api/papers/${id}/activities`, {
      method: "POST",
      json: { type: plugin.type, text: config.instruction || plugin.label, options: [JSON.stringify(config)], marks: 2 },
    });
    setPaper(next);
    return next;
  }

  async function addOne(plugin: AnyActivityPlugin) {
    setBusy(true);
    setError(null);
    try {
      const next = await addActivity(plugin);
      const last = [...next.blueprint.sections].sort((a, b) => b.position - a.position)[0];
      const item = next.items.find((i) => i.sectionId === last?.id);
      if (item) {
        setSelectedId(item.id);
        scrollToActivity(item.id);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function quickStart() {
    const preset = QUICK_STARTS[paper?.blueprint.book.className ?? ""];
    if (!preset) return;
    setBusy(true);
    setError(null);
    try {
      for (const type of preset.types) {
        const plugin = getKindergartenActivity(type);
        if (plugin) await addActivity(plugin);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function setMarks(a: Activity, marks: number) {
    if (marks < 1 || marks > 20) return;
    setPaper((p) =>
      p ? { ...p, blueprint: { ...p.blueprint, sections: p.blueprint.sections.map((s) => (s.id === a.section.id ? { ...s, marksEach: marks } : s)) } } : p,
    );
    try {
      await api(`/api/papers/${id}/activities/${a.item.id}`, { method: "PUT", json: { marks } });
    } catch (e) {
      setError((e as Error).message);
      void load();
    }
  }

  async function move(a: Activity, dir: "up" | "down") {
    try {
      setPaper(await api<PaperData>(`/api/papers/${id}/activities/${a.item.id}`, { method: "PUT", json: { move: dir } }));
      scrollToActivity(a.item.id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(a: Activity) {
    const ok = await confirm({
      title: "Remove this activity?",
      message: `“${a.plugin.shortLabel}” will be removed from the worksheet.`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    try {
      setPaper(await api<PaperData>(`/api/papers/${id}/activities/${a.item.id}`, { method: "DELETE" }));
      if (selectedId === a.item.id) setSelectedId(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error && !paper) return <p className="p-8 text-red-700">{error}</p>;
  if (!paper) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm font-semibold text-slate-600">
        <Spinner size="sm" /> Loading worksheet…
      </div>
    );
  }

  const className = paper.blueprint.book.className;
  const shownError = error ?? drafts.error;

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
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700" title="Scales automatically so it never runs past 2 pages">
                A4 · fits 2 pages
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500" aria-live="polite">
              {drafts.saving ? (
                <>
                  <Spinner size="sm" /> Saving…
                </>
              ) : (
                <>
                  <Check size={13} className="text-emerald-600" /> All changes saved
                </>
              )}
            </span>
            <button type="button" className="btn" onClick={() => setDetailsOpen(true)}>
              <Pencil size={14} /> Details
            </button>
            <Link href={`/papers/${id}/print`} target={paperOutputTab(id)} className="btn btn-primary">
              <Printer size={15} /> Print preview
            </Link>
          </div>
        </div>

        <ErrorBanner
          message={shownError}
          onDismiss={() => {
            setError(null);
            drafts.clearError();
          }}
        />

        <div className="grid items-start gap-4 lg:grid-cols-[12.5rem_minmax(0,1fr)_19rem] 2xl:grid-cols-[16rem_minmax(0,1fr)_24rem]">
          <aside aria-label="Activity library" className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
            <ActivityLibrary subject={subject} busy={busy} onAdd={addOne} />
          </aside>

          <section aria-label="Worksheet page" className="min-w-0">
            <WorksheetCanvas
              activities={activities}
              selectedId={selectedId}
              onSelect={setSelectedId}
              draftFor={drafts.draftFor}
              emptyState={
                <EmptyState
                  icon={Sparkles}
                  title="Add your first activity"
                  description="Pick one from the library – or start with a ready set for this class."
                  action={
                    QUICK_STARTS[className] ? (
                      <button type="button" className="btn btn-primary" disabled={busy} onClick={quickStart}>
                        {busy ? <Spinner size="sm" /> : <Sparkles size={15} />} {QUICK_STARTS[className].label}
                      </button>
                    ) : undefined
                  }
                />
              }
            />
          </section>

          <aside aria-label="Activity editor" className="lg:sticky lg:top-4">
            <ActivityInspector
              activity={selected}
              index={selectedIndex}
              total={activities.length}
              draft={selected ? drafts.draftFor(selected) : null}
              onEdit={(patch) => selected && drafts.edit(selected, patch)}
              onMarks={(n) => selected && setMarks(selected, n)}
              onMove={(dir) => selected && move(selected, dir)}
              onRemove={() => selected && remove(selected)}
              onClose={() => setSelectedId(null)}
            />
          </aside>
        </div>

        {detailsOpen && (
          <DetailsModal
            paper={paper}
            onClose={() => setDetailsOpen(false)}
            onSaved={(p) => {
              setPaper(p);
              setDetailsOpen(false);
              toast.success("Details updated");
            }}
          />
        )}
      </div>
    </EditorMemoryContext.Provider>
  );
}
