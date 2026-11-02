"use client";

import { ArrowDown, ArrowLeft, ArrowUp, Check, Minus, Pencil, Plus, Printer, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, ErrorBanner, Field, Modal, Spinner, useConfirm, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { DEFAULT_SCHOOL_NAME, EXAM_TYPES, EXAM_TYPE_LABEL, WORKSHEET_MODE, resolvePaperExamType, type ExamType } from "@/lib/constants";
import { getAllKindergartenActivities, getKindergartenActivity, parseKindergartenConfig } from "@/lib/kindergarten/registry";
import type { KindergartenActivityPlugin, KindergartenCategory } from "@/lib/kindergarten/types";
import type { PaperData, PaperItem, Section } from "@/lib/types";

const CATEGORY_LABEL: Record<KindergartenCategory, string> = {
  english: "English & letters",
  math: "Numbers & maths",
  hindi: "Hindi",
  evs: "Our world",
  general: "Drawing, colouring & fun",
};
const CATEGORY_ORDER: KindergartenCategory[] = ["english", "math", "general", "hindi", "evs"];

const QUICK_STARTS: Record<string, { label: string; types: string[] }> = {
  Nursery: { label: "Nursery starter (5 activities)", types: ["KDG_PREWRITING", "KDG_JOIN_DOTS", "KDG_COLOUR", "KDG_COUNT_ITEMS", "KDG_COMPARE"] },
  LKG: { label: "LKG starter (5 activities)", types: ["KDG_TRACE_WRITE", "KDG_MISSING_LETTERS", "KDG_COUNT_ITEMS", "KDG_PATTERN", "KDG_TICK_PICTURE"] },
  UKG: { label: "UKG starter (6 activities)", types: ["KDG_TRACE_WRITE", "KDG_MISSING_LETTERS", "KDG_NUMBER_GRID", "KDG_PICTURE_SUM", "KDG_TICK_PICTURE", "KDG_JOIN_DOTS"] },
};

type Draft = { text: string; config: any };
type Activity = { item: PaperItem; section: Section; plugin: KindergartenActivityPlugin };

export default function WorksheetPage({ params }: PageProps<"/worksheets/[id]">) {
  const { id } = use(params);
  const confirm = useConfirm();
  const toast = useToast();
  const [paper, setPaper] = useState<PaperData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
    void load();
  }, [load]);

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

  const totalMarks = activities.reduce((n, a) => n + a.section.marksEach, 0);
  const subject = paper?.blueprint.book.subject;

  const draftFor = (a: Activity): Draft =>
    drafts[a.item.id] ?? {
      text: a.item.question.text,
      config: parseKindergartenConfig(a.item.question.type, a.item.question.options?.[0], subject),
    };

  function editActivity(a: Activity, patch: Partial<Draft>) {
    const next = { ...draftFor(a), ...patch };
    setDrafts((d) => ({ ...d, [a.item.id]: next }));
    setSaving(true);
    clearTimeout(timers.current[a.item.id]);
    timers.current[a.item.id] = setTimeout(async () => {
      try {
        await api(`/api/papers/${id}/activities/${a.item.id}`, {
          method: "PUT",
          json: { text: next.text.trim() || next.config?.instruction || a.plugin.label, options: [JSON.stringify(next.config)] },
        });
        setSaving(false);
      } catch (e) {
        setSaving(false);
        setError((e as Error).message);
      }
    }, 700);
  }

  async function addActivity(plugin: KindergartenActivityPlugin, marks = 2) {
    const config = plugin.defaultConfig(subject);
    const next = await api<PaperData>(`/api/papers/${id}/activities`, {
      method: "POST",
      json: { type: plugin.type, text: config.instruction || plugin.label, options: [JSON.stringify(config)], marks },
    });
    setPaper(next);
    return next;
  }

  async function addOne(plugin: KindergartenActivityPlugin) {
    setBusy(true);
    setError(null);
    try {
      const next = await addActivity(plugin);
      const last = [...next.blueprint.sections].sort((a, b) => b.position - a.position)[0];
      const item = next.items.find((i) => i.sectionId === last?.id);
      if (item) setOpenId(item.id);
      requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
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
      if (openId === a.item.id) setOpenId(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const grouped = useMemo(() => {
    const all = getAllKindergartenActivities();
    return CATEGORY_ORDER.map((c) => ({ category: c, plugins: all.filter((p) => p.category === c) })).filter((g) => g.plugins.length);
  }, []);

  if (error && !paper) return <p className="p-8 text-red-700">{error}</p>;
  if (!paper) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm font-semibold text-slate-600">
        <Spinner size="sm" /> Loading worksheet…
      </div>
    );
  }

  const className = paper.blueprint.book.className;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/papers" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-700">
            <ArrowLeft size={13} /> All papers
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="truncate text-xl font-bold text-slate-900">{paper.title}</h1>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">{className}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{paper.blueprint.book.subject}</span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">{EXAM_TYPE_LABEL[resolvePaperExamType(paper)]}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700" title="Scales automatically so it never runs past 2 pages">A4 · fits 2 pages (front &amp; back)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-slate-500" aria-live="polite">
            {saving ? (
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
          <Link href={`/papers/${id}/print`} target="_blank" className="btn btn-primary">
            <Printer size={15} /> Print preview
          </Link>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Activities in print order */}
        <section aria-label="Worksheet activities" className="space-y-4">
          {activities.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Add your first activity"
              description="Pick an activity from the list on the right – or start with a ready set for this class."
              action={
                QUICK_STARTS[className] ? (
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={quickStart}>
                    {busy ? <Spinner size="sm" /> : <Sparkles size={15} />} {QUICK_STARTS[className].label}
                  </button>
                ) : undefined
              }
            />
          ) : (
            activities.map((a, idx) => {
              const draft = draftFor(a);
              const Print = a.plugin.renderPrint;
              const Editor = a.plugin.renderEditor;
              const isOpen = openId === a.item.id;
              return (
                <article key={a.item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{idx + 1}</span>
                    <span className="text-sm font-bold text-slate-900">{a.plugin.shortLabel}</span>
                    <div className="ml-auto flex flex-wrap items-center gap-1.5">
                      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-0.5" title="Marks for this activity">
                        <button type="button" aria-label="Fewer marks" className="rounded p-1 hover:bg-slate-100" onClick={() => setMarks(a, a.section.marksEach - 1)}>
                          <Minus size={13} />
                        </button>
                        <span className="w-12 text-center text-xs font-bold tabular-nums">{a.section.marksEach} {a.section.marksEach === 1 ? "mark" : "marks"}</span>
                        <button type="button" aria-label="More marks" className="rounded p-1 hover:bg-slate-100" onClick={() => setMarks(a, a.section.marksEach + 1)}>
                          <Plus size={13} />
                        </button>
                      </div>
                      <button type="button" aria-label="Move up" className="btn btn-sm btn-icon" disabled={idx === 0} onClick={() => move(a, "up")}>
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" aria-label="Move down" className="btn btn-sm btn-icon" disabled={idx === activities.length - 1} onClick={() => move(a, "down")}>
                        <ArrowDown size={14} />
                      </button>
                      <button type="button" className={`btn btn-sm ${isOpen ? "btn-primary" : ""}`} onClick={() => setOpenId(isOpen ? null : a.item.id)}>
                        {isOpen ? <X size={13} /> : <Pencil size={13} />} {isOpen ? "Close editor" : "Edit"}
                      </button>
                      <button type="button" aria-label="Remove activity" className="btn btn-sm btn-icon text-red-600" onClick={() => remove(a)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* What it will look like on paper */}
                  <div className="bg-slate-100/60 p-4">
                    <div className="mx-auto max-w-[720px] rounded-md bg-white p-3 shadow-2xs">
                      <Print config={draft.config} instructionText={draft.text} numberLabel={`${idx + 1}.`} marks={a.section.marksEach} />
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-200 bg-white p-4">
                      <Editor
                        config={draft.config}
                        onChange={(config: any) => editActivity(a, { config })}
                        instructionText={draft.text}
                        onInstructionChange={(text: string) => editActivity(a, { text })}
                      />
                    </div>
                  )}
                </article>
              );
            })
          )}

          {activities.length > 7 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900">
              With {activities.length} activities the worksheet is scaled down a lot to fit 2 pages. For bigger, easier-to-read print, keep it to about 5–7 activities.
            </p>
          )}

          {activities.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <span className="text-slate-600">
                {activities.length} {activities.length === 1 ? "activity" : "activities"}
              </span>
              <span className="font-bold text-slate-900">Total: {totalMarks} marks</span>
            </div>
          )}
        </section>

        {/* Activity gallery */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Add an activity</h2>
              {busy && <Spinner size="sm" />}
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {grouped.map((g) => (
                <div key={g.category}>
                  <div className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{CATEGORY_LABEL[g.category]}</div>
                  <div className="space-y-1.5">
                    {g.plugins.map((p) => (
                      <button
                        key={p.type}
                        type="button"
                        disabled={busy}
                        onClick={() => addOne(p)}
                        className="group flex w-full items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-indigo-400 hover:bg-indigo-50/50 disabled:opacity-60"
                      >
                        <Plus size={15} className="mt-0.5 shrink-0 text-indigo-600" />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">{p.shortLabel}</span>
                          <span className="block text-[11px] leading-snug text-slate-500">{p.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
  );
}

function DetailsModal({ paper, onClose, onSaved }: { paper: PaperData; onClose: () => void; onSaved: (p: PaperData) => void }) {
  const [title, setTitle] = useState(paper.title);
  const [schoolName, setSchoolName] = useState(paper.schoolName || DEFAULT_SCHOOL_NAME);
  const [examDate, setExamDate] = useState(paper.examDate || "");
  const [examType, setExamType] = useState<ExamType>(resolvePaperExamType(paper));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/papers/${paper.id}`, { method: "PATCH", json: { title: title.trim(), schoolName: schoolName.trim(), examDate, examType } });
      onSaved(await api<PaperData>(`/api/papers/${paper.id}`));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Worksheet details"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="ws-details" className="btn btn-primary" disabled={busy}>
            Save
          </button>
        </>
      }
    >
      <form id="ws-details" onSubmit={save} className="space-y-3">
        <ErrorBanner message={error} />
        <Field label="Title">
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div>
          <span className="label">Exam</span>
          <div className="flex flex-wrap gap-1.5">
            {EXAM_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setExamType(t)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${examType === t ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700"}`}
              >
                {EXAM_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
        <Field label="School name">
          <input className="input" required value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
        </Field>
        <Field label="Date (optional)">
          <input type="date" className="input" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
