"use client";

import { ArrowLeft, BookOpen, Copy, Eye, EyeOff, Plus, Ruler, RotateCcw, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BlueprintPresetEditor } from "@/components/presets/BlueprintPresetEditor";
import { CLASS_OPTIONS, classGroupOf, isBlueprint, matchesClass, presetMeta, type AnyPreset, type Managed } from "@/components/presets/presetUi";
import { chaptersOf, rowsOf, SyllabusPresetEditor, type ChapterRow } from "@/components/presets/SyllabusPresetEditor";
import { EmptyState, ErrorBanner, ListSkeleton, PageHeader, Spinner, useConfirm, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { blueprintTotals, type BlueprintPreset, type PresetKind } from "@/lib/presets";
import type { StandardCurriculumPreset } from "@/lib/syllabusImport";

type Status = "" | "EDITED" | "CUSTOM" | "HIDDEN";
const NEW = "__new__";

const TABS: Array<{ kind: PresetKind; label: string; icon: typeof BookOpen; lede: string }> = [
  { kind: "SYLLABUS", label: "Syllabus presets", icon: BookOpen, lede: "The chapter lists offered under Books & syllabus → Import syllabus." },
  { kind: "BLUEPRINT", label: "Blueprint patterns", icon: Ruler, lede: "The sections and marks offered when a new blueprint is started." },
];

function blankPreset(kind: PresetKind, className: string): AnyPreset {
  if (kind === "SYLLABUS") {
    return { id: NEW, title: "", className: className || "Class 1", subject: "", board: "", description: "", chapters: [{ number: 1, title: "" }] };
  }
  const level = Math.max(0, CLASS_OPTIONS.indexOf(className) - 2);
  return {
    id: NEW,
    templateCode: NEW,
    title: "",
    description: "",
    examType: "HALF_YEARLY",
    durationMin: 120,
    totalMarks: 0,
    targetClasses: "",
    archetype: "CUSTOM",
    classFrom: className ? level : 1,
    classTo: className ? level : 5,
    sections: [
      { title: "Section A – Objective questions", instructions: "Choose the correct option.", questionTypes: [{ type: "MCQ", count: 5, marksEach: 1, orChoiceMode: "NOT_REQUIRED" }] },
      { title: "Section B – Short answer questions", instructions: "", questionTypes: [{ type: "SHORT", count: 5, marksEach: 3, orChoiceMode: "NOT_REQUIRED" }] },
    ],
  } satisfies BlueprintPreset;
}

/** What a save sends: the syllabus rows folded back into chapters. */
function payloadOf(draft: AnyPreset, rows: ChapterRow[]): AnyPreset {
  return isBlueprint(draft) ? draft : { ...draft, ...chaptersOf(rows) };
}

function problemsOf(p: AnyPreset): string[] {
  const out: string[] = [];
  if (!p.title.trim()) out.push(isBlueprint(p) ? "Give the pattern a name." : "Give the book a title.");
  if (isBlueprint(p)) {
    if (p.classTo < p.classFrom) out.push("The last class comes before the first.");
    if (p.sections.some((g) => !g.title.trim())) out.push("Every section needs a title.");
    if (blueprintTotals(p.sections).marks <= 0) out.push("The pattern has no marks yet.");
    if (p.durationMin < 10) out.push("Allow at least 10 minutes.");
  } else {
    if (!p.subject.trim()) out.push("Choose a subject.");
    if (p.chapters.length === 0) out.push("Add at least one chapter.");
    if (p.chapters.some((c) => !c.title.replace(/^\[[^\]]*\]\s*\d+\.\s*/, "").trim())) out.push("Every chapter needs a title.");
  }
  return out;
}

const STATUS_BADGE: Record<Managed["origin"], { label: string; className: string } | null> = {
  BUILT_IN: null,
  EDITED: { label: "Edited", className: "badge badge-indigo" },
  CUSTOM: { label: "Added by school", className: "badge badge-success" },
};

/** Admin: edit the syllabus presets and blueprint patterns teachers start from. */
export default function PresetsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [kind, setKind] = useState<PresetKind>("SYLLABUS");
  const [items, setItems] = useState<Managed[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [status, setStatus] = useState<Status>("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnyPreset | null>(null);
  const [rows, setRows] = useState<ChapterRow[]>([]);
  const [baseline, setBaseline] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const fetchList = (k: PresetKind) => api<Managed[]>(`/api/presets?kind=${k}&manage=1`);
  const onFail = (e: unknown) => {
    const msg = (e as Error).message;
    if (/administrator|permission/i.test(msg)) setForbidden(true);
    else setError(msg);
  };
  const load = useCallback(async (k: PresetKind) => {
    try {
      const list = await fetchList(k);
      setKind(k);
      setItems(list);
      setError(null);
    } catch (e) {
      onFail(e);
    }
  }, []);

  useEffect(() => {
    const k: PresetKind = new URLSearchParams(location.search).get("kind")?.toUpperCase() === "BLUEPRINT" ? "BLUEPRINT" : "SYLLABUS";
    let cancelled = false;
    fetchList(k).then(
      (list) => {
        if (cancelled) return;
        setKind(k);
        setItems(list);
      },
      (e) => !cancelled && onFail(e),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = items?.find((p) => p.id === selectedId) ?? null;
  const current = draft ? JSON.stringify(payloadOf(draft, rows)) : "";
  const dirty = draft !== null && current !== baseline;
  const problems = draft ? problemsOf(payloadOf(draft, rows)) : [];

  function open(p: AnyPreset, id: string) {
    const copy = structuredClone(p);
    const r = isBlueprint(copy) ? [] : rowsOf(copy);
    setSelectedId(id);
    setDraft(copy);
    setRows(r);
    setBaseline(id === NEW ? "" : JSON.stringify(payloadOf(copy, r)));
  }

  async function leave(): Promise<boolean> {
    if (!dirty) return true;
    return confirm({ title: "Discard your changes?", message: "The changes to this preset have not been saved.", confirmLabel: "Discard changes", tone: "danger" });
  }

  async function switchKind(k: PresetKind) {
    if (k === kind || !(await leave())) return;
    setKind(k);
    setItems(null);
    setSelectedId(null);
    setDraft(null);
    history.replaceState(null, "", `?kind=${k.toLowerCase()}`);
    void load(k);
  }

  async function select(p: Managed) {
    if (p.id === selectedId || !(await leave())) return;
    open(p.data, p.id);
  }

  async function startNew(from?: AnyPreset) {
    if (!(await leave())) return;
    const base = from
      ? ({ ...structuredClone(from), id: NEW, title: `${from.title} (copy)`, ...(isBlueprint(from) ? { archetype: "CUSTOM", source: undefined, templateCode: NEW } : {}) } as AnyPreset)
      : blankPreset(kind, classFilter);
    open(base, NEW);
  }

  async function save() {
    if (!draft || problems.length > 0) return;
    setBusy("save");
    try {
      const data = payloadOf(draft, rows);
      if (selectedId === NEW) {
        const res = await api<{ id: string; data: AnyPreset }>("/api/presets", { method: "POST", json: { kind, data } });
        toast.success(`Added “${res.data.title}”`);
        await load(kind);
        open(res.data, res.id);
      } else if (selectedId) {
        const res = await api<{ id: string; data: AnyPreset }>(`/api/presets/${kind}/${encodeURIComponent(selectedId)}`, { method: "PUT", json: { data } });
        toast.success(`Saved “${res.data.title}”`);
        await load(kind);
        open(res.data, res.id);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function setHidden(p: Managed, hidden: boolean) {
    setBusy("hide");
    try {
      await api(`/api/presets/${kind}/${encodeURIComponent(p.id)}`, { method: "PATCH", json: { hidden } });
      toast.success(hidden ? `“${p.data.title}” is hidden from teachers` : `“${p.data.title}” is offered again`);
      await load(kind);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function restoreOrDelete(p: Managed) {
    const isCustom = p.origin === "CUSTOM";
    const ok = await confirm({
      title: isCustom ? `Delete “${p.data.title}”?` : `Restore “${p.original?.title ?? p.data.title}”?`,
      message: isCustom
        ? "Teachers will no longer be offered it. Books and blueprints already made from it stay as they are."
        : "Your changes are discarded and the preset goes back to the version that came with the app.",
      confirmLabel: isCustom ? "Delete preset" : "Restore original",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("restore");
    try {
      await api(`/api/presets/${kind}/${encodeURIComponent(p.id)}`, { method: "DELETE" });
      toast.success(isCustom ? `Deleted “${p.data.title}”` : `Restored “${p.original?.title ?? p.data.title}”`);
      await load(kind);
      if (isCustom) {
        setSelectedId(null);
        setDraft(null);
      } else if (p.original) open(p.original, p.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const groups = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    const shown = items.filter((p) => {
      if (status === "HIDDEN" ? !p.hidden : status && p.origin !== status) return false;
      if (!matchesClass(kind, p.data, classFilter)) return false;
      if (!q) return true;
      const hay = `${p.data.title} ${isBlueprint(p.data) ? (p.data.subjectName ?? "") : `${p.data.subject} ${p.data.board}`}`.toLowerCase();
      return hay.includes(q);
    });
    const map = new Map<string, { order: number; items: Managed[] }>();
    for (const p of shown) {
      const g = classGroupOf(kind, p.data);
      if (!map.has(g.key)) map.set(g.key, { order: g.order, items: [] });
      map.get(g.key)!.items.push(p);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].order - b[1].order)
      .map(([key, v]) => ({ key, items: v.items }));
  }, [items, search, status, classFilter, kind]);

  const counts = useMemo(
    () => ({
      edited: items?.filter((p) => p.origin === "EDITED").length ?? 0,
      custom: items?.filter((p) => p.origin === "CUSTOM").length ?? 0,
      hidden: items?.filter((p) => p.hidden).length ?? 0,
    }),
    [items],
  );

  if (forbidden) {
    return (
      <div className="space-y-6">
        <PageHeader title="Presets" icon={SlidersHorizontal} />
        <EmptyState icon={SlidersHorizontal} title="Only administrators can edit presets" description="Ask an administrator to change a syllabus preset or blueprint pattern." />
      </div>
    );
  }

  const tab = TABS.find((t) => t.kind === kind)!;
  const isBoardPattern = !!draft && isBlueprint(draft) && !!draft.source;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Presets"
        icon={SlidersHorizontal}
        description="Change the syllabus lists and blueprint patterns teachers start from. Changes apply to new imports and new blueprints; books and blueprints already made stay as they are."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => startNew()}>
            <Plus size={16} /> New {kind === "SYLLABUS" ? "syllabus preset" : "blueprint pattern"}
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Preset type">
        {TABS.map((t) => (
          <button
            key={t.kind}
            type="button"
            role="tab"
            aria-selected={kind === t.kind}
            onClick={() => void switchKind(t.kind)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
              kind === t.kind ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
        <p className="ml-1 text-sm text-slate-500">{tab.lede}</p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* list */}
        <aside className={`card flex min-h-0 flex-col gap-3 p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] ${draft ? "hidden lg:flex" : "flex"}`} aria-label="Presets">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input type="search" className="input pl-8" placeholder="Search by title or subject" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search presets" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className="input py-1.5 text-sm" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} aria-label="Class">
              <option value="">All classes</option>
              {CLASS_OPTIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select className="input py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value as Status)} aria-label="Status">
              <option value="">Every preset</option>
              <option value="EDITED">Edited ({counts.edited})</option>
              <option value="CUSTOM">Added by school ({counts.custom})</option>
              <option value="HIDDEN">Hidden ({counts.hidden})</option>
            </select>
          </div>

          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
            {!items ? (
              <ListSkeleton rows={6} />
            ) : groups.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No presets match. Clear the search or pick another class.</p>
            ) : (
              <div className="space-y-4">
                {groups.map((g) => (
                  <section key={g.key} aria-label={g.key}>
                    <h3 className="mb-1 px-2 text-xs font-semibold text-slate-500">{g.key}</h3>
                    <ul className="space-y-0.5">
                      {g.items.map((p) => {
                        const badge = STATUS_BADGE[p.origin];
                        const active = p.id === selectedId;
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => void select(p)}
                              aria-current={active ? "true" : undefined}
                              className={`w-full rounded-lg px-2.5 py-2 text-left transition ${
                                active ? "bg-indigo-50 ring-1 ring-indigo-200" : "hover:bg-slate-50"
                              } ${p.hidden ? "opacity-60" : ""}`}
                            >
                              <span className="flex items-start justify-between gap-2">
                                <span className={`min-w-0 text-sm font-medium ${active ? "text-indigo-900" : "text-slate-800"}`}>{p.data.title}</span>
                                <span className="flex shrink-0 gap-1">
                                  {p.hidden && <span className="badge">Hidden</span>}
                                  {badge && <span className={badge.className}>{badge.label}</span>}
                                </span>
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-slate-500">{presetMeta(p.data)}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* editor */}
        <section className={`card min-w-0 ${draft ? "" : "hidden lg:block"}`} aria-label="Preset editor">
          {!draft ? (
            <EmptyState
              icon={tab.icon}
              title={`Choose a ${kind === "SYLLABUS" ? "syllabus preset" : "blueprint pattern"} to edit`}
              description={kind === "SYLLABUS" ? "Fix a chapter title, reorder chapters or add a book your school uses." : "Change the sections, question counts and marks of a pattern, or add the school's own."}
              action={
                <button type="button" className="btn btn-primary" onClick={() => startNew()}>
                  <Plus size={16} /> New {kind === "SYLLABUS" ? "syllabus preset" : "blueprint pattern"}
                </button>
              }
            />
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="min-w-0">
                  <button type="button" className="btn btn-ghost btn-sm -ml-2 mb-1 lg:hidden" onClick={async () => (await leave()) && (setSelectedId(null), setDraft(null))}>
                    <ArrowLeft size={14} /> All presets
                  </button>
                  <h2 className="font-display text-lg font-semibold text-slate-900">
                    {selectedId === NEW ? `New ${kind === "SYLLABUS" ? "syllabus preset" : "blueprint pattern"}` : draft.title || "Untitled"}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {selectedId === NEW
                      ? "Teachers are offered it as soon as you save."
                      : selected?.origin === "BUILT_IN"
                        ? "Came with the app. Saving keeps a copy of the original you can restore."
                        : selected?.origin === "EDITED"
                          ? `Edited${selected.updatedByName ? ` by ${selected.updatedByName}` : ""}${selected.updatedAt ? ` on ${new Date(selected.updatedAt).toLocaleDateString()}` : ""}.`
                          : `Added by the school${selected?.updatedByName ? `; last saved by ${selected.updatedByName}` : ""}.`}
                    {selected?.hidden && " Hidden from teachers."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selected && (
                    <>
                      <button type="button" className="btn btn-sm" onClick={() => void startNew(draft)} title="Make a new preset from this one">
                        <Copy size={14} /> Duplicate
                      </button>
                      <button type="button" className="btn btn-sm" disabled={busy !== null} onClick={() => void setHidden(selected, !selected.hidden)}>
                        {selected.hidden ? <Eye size={14} /> : <EyeOff size={14} />} {selected.hidden ? "Show to teachers" : "Hide from teachers"}
                      </button>
                      {selected.origin !== "BUILT_IN" && (
                        <button type="button" className="btn btn-sm btn-danger" disabled={busy !== null} onClick={() => void restoreOrDelete(selected)}>
                          {selected.origin === "CUSTOM" ? <Trash2 size={14} /> : <RotateCcw size={14} />}
                          {selected.origin === "CUSTOM" ? "Delete" : "Restore original"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {isBlueprint(draft) ? (
                <BlueprintPresetEditor draft={draft} isBoardPattern={isBoardPattern} onChange={setDraft} />
              ) : (
                <SyllabusPresetEditor draft={draft as StandardCurriculumPreset} rows={rows} onChange={setDraft} onRowsChange={setRows} />
              )}

              <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
                <p className={`text-sm ${problems.length ? "text-red-700" : "text-slate-500"}`} role={problems.length ? "alert" : undefined}>
                  {problems.length ? problems[0] : dirty ? "Unsaved changes" : "No changes"}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={!dirty || busy !== null}
                    onClick={() => (selectedId === NEW ? (setSelectedId(null), setDraft(null)) : selected && open(selected.data, selected.id))}
                  >
                    {selectedId === NEW ? "Cancel" : "Undo changes"}
                  </button>
                  <button type="button" className="btn btn-primary" disabled={!dirty || problems.length > 0 || busy !== null} onClick={() => void save()}>
                    {busy === "save" && <Spinner size="sm" />} {selectedId === NEW ? "Add preset" : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
