"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, FileText, Library, Sparkles } from "lucide-react";
import { ErrorBanner, Modal, Spinner, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { normalizeSession, useAcademicSession } from "@/lib/academicSession";
import { sortClassNames } from "@/lib/constants";
import { SUBJECTS_SEED } from "@/lib/curriculumData";
import { isSameSubjectGroup, isSubjectMatching, subjectGroupName } from "@/lib/schoolCurriculum";
import { parsePastedChapters, splitChapterTitle, type ImportPart, type SubjectImportPlan } from "@/lib/subjectBooks";
import { STANDARD_CURRICULUM_PRESETS } from "@/lib/syllabusImport";
import type { AcademicClassDto } from "@/lib/types";

interface SyllabusImportModalProps {
  onClose: () => void;
  onSuccess: (result: { bookId?: string }) => void;
  /** Import into this book (class and subject are then fixed). */
  targetBook?: { id: string; title: string; className: string; subject: string } | null;
  targetClass?: string;
  targetSubject?: string;
}

type Source = { id: string; label: string; detail: string; parts: ImportPart[] };

const PASTE_HINT = `# First Flight
A Letter to God
Nelson Mandela: Long Walk to Freedom
# Footprints without Feet
A Triumph of Surgery`;

/** Official syllabi for a class + subject: the MPBSE scheme (Classes 9-12, what blueprints and quotas use), else the presets (MP Board for Classes 5-8). */
function sourcesFor(className: string, subject: string): Source[] {
  if (!className || !subject) return [];
  const out: Source[] = [];
  for (const s of SUBJECTS_SEED) {
    if (`Class ${s.classLevel}` !== className || !isSameSubjectGroup(s.name, subject)) continue;
    out.push({
      id: `mpbse-${s.classLevel}-${s.code}`,
      label: `MPBSE ${s.name} (${s.code})`,
      detail: s.textbooks.map((t) => t.title).join(" + "),
      parts: s.textbooks.map((t) => ({
        title: t.title,
        chapters: t.chapters.map((c) => ({ number: c.chapterNumber, title: c.title })),
      })),
    });
  }
  // The school follows MPBSE: where its scheme exists, NCERT presets would only add the same lessons under other titles.
  if (out.length > 0) return out;
  for (const p of STANDARD_CURRICULUM_PRESETS) {
    if (p.className !== className || !isSubjectMatching(p.subject, subject)) continue;
    out.push({
      id: p.id,
      label: p.title,
      detail: p.subBooks?.length ? p.subBooks.join(" + ") : p.board,
      parts: [{ title: p.title, chapters: p.chapters }],
    });
  }
  return out;
}

export function SyllabusImportModal({ onClose, onSuccess, targetBook, targetClass, targetSubject }: SyllabusImportModalProps) {
  const toast = useToast();
  const { currentSession } = useAcademicSession();
  const session = normalizeSession(currentSession);

  const [classes, setClasses] = useState<AcademicClassDto[]>([]);
  const [className, setClassName] = useState(targetBook?.className ?? targetClass ?? "");
  const [subject, setSubject] = useState(targetBook?.subject ?? (targetSubject ? subjectGroupName(targetSubject) : ""));
  const [chosenMode, setMode] = useState<"official" | "paste">("official");
  const [chosenSourceId, setSourceId] = useState("");
  const [pasted, setPasted] = useState("");

  const [fetchedPlan, setPlan] = useState<SubjectImportPlan | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tidyBusy, setTidyBusy] = useState(false);

  /** A contents page copied from a private publisher's book or PDF, cleaned into a chapter list by the AI. */
  async function tidyWithAi() {
    setTidyBusy(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      const customKey = typeof window !== "undefined" ? localStorage.getItem("exam_gemini_api_key") : null;
      if (customKey) headers["x-gemini-api-key"] = customKey;
      const res = await api<{ success: boolean; isMock?: boolean; error?: string; data?: { books?: Array<{ title: string; chapters: Array<{ title: string }> }> } }>(
        "/api/ai/parse-syllabus",
        { method: "POST", headers, json: { rawText: pasted, className, subject } },
      );
      const books = (res.data?.books ?? []).filter((b) => b.chapters.length > 0);
      if (res.isMock || !res.success || books.length === 0) {
        setError(res.error || "The AI could not read this text. The list is kept as you typed it; tidy it by hand.");
        return;
      }
      setPasted(
        books
          .map((b) => [...(books.length > 1 ? [`# ${b.title}`] : []), ...b.chapters.map((c) => c.title)].join("\n"))
          .join("\n"),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTidyBusy(false);
    }
  }

  const locked = Boolean(targetBook);

  useEffect(() => {
    api<AcademicClassDto[]>("/api/classes").then(setClasses, () => {});
  }, []);

  const sessionClasses = useMemo(
    () => classes.filter((c) => normalizeSession(c.academicSession) === session),
    [classes, session],
  );
  const classOptions = useMemo(
    () => sortClassNames(Array.from(new Set([...sessionClasses.map((c) => c.name), ...(className ? [className] : [])]))),
    [sessionClasses, className],
  );
  const subjectOptions = useMemo(() => {
    const cls = sessionClasses.find((c) => c.name === className);
    const names = (cls?.subjects ?? []).map((s) => subjectGroupName(s.name));
    const unique = Array.from(new Set([...names, ...(subject ? [subject] : [])]));
    // a bare "Mathematics" next to Basic / Standard is the same subject twice
    return unique.filter((n) => n !== "Mathematics" || !unique.some((o) => o.startsWith("Mathematics ")) || n === subject);
  }, [sessionClasses, className, subject]);

  const sources = useMemo(() => sourcesFor(className, subject), [className, subject]);

  // Default to the first official syllabus; fall back to pasting when there is none.
  const mode = sources.length === 0 ? "paste" : chosenMode;
  const sourceId = sources.some((s) => s.id === chosenSourceId) ? chosenSourceId : (sources[0]?.id ?? "");

  const parts: ImportPart[] = useMemo(() => {
    if (mode === "official") return sources.find((s) => s.id === sourceId)?.parts ?? [];
    return parsePastedChapters(pasted, targetBook?.title ?? `${subject} (${className})`);
  }, [mode, sources, sourceId, pasted, targetBook, subject, className]);

  const payload = (extra: Record<string, unknown>) => ({
    format: "custom" as const,
    content: "",
    targetBookId: targetBook?.id ?? null,
    customBooks: parts.map((p) => ({ title: p.title, className, subject, academicSession: session, chapters: p.chapters })),
    ...extra,
  });

  // Preview: ask the server what would change (debounced while typing).
  const ready = Boolean(className && subject && parts.length > 0);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setPlanBusy(true);
      api<{ plans: SubjectImportPlan[] }>("/api/books/import", { method: "POST", json: payload({ dryRun: true }) })
        .then((res) => {
          if (cancelled) return;
          setPlan(res.plans[0] ?? null);
          setSkipped(new Set());
          setError(null);
        })
        .catch((e) => !cancelled && setError((e as Error).message))
        .finally(() => !cancelled && setPlanBusy(false));
    }, mode === "paste" ? 400 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, parts, className, subject, targetBook?.id, session]);

  const plan = ready ? fetchedPlan : null;
  const newChapters = plan?.chapters.filter((c) => c.status === "new") ?? [];
  const chosen = newChapters.filter((c) => !skipped.has(c.title));
  const existingCount = (plan?.chapters.length ?? 0) - newChapters.length;

  function toggle(title: string) {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  async function apply() {
    if (!plan || chosen.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ bookIds: string[]; createdChapters: number }>("/api/books/import", {
        method: "POST",
        json: payload({ onlyChapters: chosen.map((c) => c.title) }),
      });
      toast.success(`Added ${res.createdChapters} chapter${res.createdChapters === 1 ? "" : "s"} to “${plan.bookTitle}”`);
      onSuccess({ bookId: res.bookIds[0] });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Group preview rows under their textbook
  const groupedPreview = useMemo(() => {
    const groups: Array<{ part: string | null; rows: SubjectImportPlan["chapters"] }> = [];
    for (const row of plan?.chapters ?? []) {
      const { part } = splitChapterTitle(row.title);
      const last = groups[groups.length - 1];
      if (last && last.part === part) last.rows.push(row);
      else groups.push({ part, rows: [row] });
    }
    return groups;
  }, [plan]);

  return (
    <Modal
      size="lg"
      title="Import syllabus"
      subtitle="Adds missing chapters to the subject's book. Chapters already there, and the blueprints that use them, stay as they are."
      onClose={onClose}
      preventClose={busy}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-600" aria-live="polite">
            {plan
              ? `${chosen.length} new chapter${chosen.length === 1 ? "" : "s"} selected${existingCount ? ` · ${existingCount} already in the book` : ""}`
              : "Pick a class, subject and syllabus to see what will be added."}
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={apply} disabled={busy || planBusy || chosen.length === 0}>
              {busy && <Spinner />}
              {plan?.createsBook ? "Create book and add chapters" : `Add ${chosen.length} chapter${chosen.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Left: what to import */}
        <div className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-900">Class and subject</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Class</span>
                <select
                  className="input"
                  value={className}
                  disabled={locked}
                  onChange={(e) => {
                    setClassName(e.target.value);
                    setSubject("");
                  }}
                >
                  <option value="">Choose…</option>
                  {classOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Subject</span>
                <select className="input" value={subject} disabled={locked || !className} onChange={(e) => setSubject(e.target.value)}>
                  <option value="">Choose…</option>
                  {subjectOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          {className && subject && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-slate-900">Chapters from</legend>
              <div role="radiogroup" aria-label="Chapters from" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                {(
                  [
                    ["official", "Official syllabus", Library],
                    ["paste", "Type or paste", FileText],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={mode === value}
                    disabled={value === "official" && sources.length === 0}
                    onClick={() => setMode(value)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      mode === value ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              {mode === "official" ? (
                <div className="space-y-2" role="radiogroup" aria-label="Syllabus">
                  {sources.map((s) => {
                    const active = s.id === sourceId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setSourceId(s.id)}
                        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                          active ? "border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500/20" : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            active ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"
                          }`}
                        >
                          {active && <Check size={10} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">{s.label}</span>
                          <span className="block text-xs text-slate-500">{s.detail}</span>
                        </span>
                      </button>
                    );
                  })}
                  {sources.length === 0 && <p className="text-xs text-slate-500">No official syllabus is stored for {className} {subject}.</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block">
                    <span className="label">One chapter per line</span>
                    <textarea
                      className="input min-h-48 font-normal"
                      value={pasted}
                      placeholder={PASTE_HINT}
                      onChange={(e) => setPasted(e.target.value)}
                    />
                    <span className="mt-1 block text-xs text-slate-500">
                      Numbers like “3.” are removed. Start a line with # to name the textbook the next chapters belong to.
                    </span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost border border-slate-200"
                      onClick={tidyWithAi}
                      disabled={tidyBusy || pasted.trim().length < 5}
                    >
                      {tidyBusy ? <Spinner /> : <Sparkles size={14} className="text-indigo-600" />} Tidy up a copied contents page
                    </button>
                    <span className="text-xs text-slate-500">Removes page numbers, authors and stray text, one chapter per line.</span>
                  </div>
                </div>
              )}
            </fieldset>
          )}
        </div>

        {/* Right: what will change */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">What changes</h3>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
          {!plan ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              {planBusy ? <Spinner /> : <BookOpen size={20} className="text-slate-400" />}
              {planBusy ? "Checking the book…" : "The chapters to add appear here."}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50/70 px-3 py-2.5">
                <p className="text-sm font-semibold text-slate-900">{plan.bookTitle}</p>
                <p className="text-xs text-slate-500">
                  {plan.createsBook ? `New book for ${className} ${subject}` : `The ${className} ${subject} book`}
                </p>
              </div>
              <ul className="max-h-96 overflow-y-auto overscroll-contain py-1 text-sm">
                {groupedPreview.map((g, gi) => (
                  <li key={gi}>
                    {g.part !== null && <p className="px-3 pb-1 pt-2 text-[11px] font-bold text-indigo-700">{g.part}</p>}
                    <ul>
                      {g.rows.map((row) => {
                        const title = splitChapterTitle(row.title).title;
                        if (row.status === "exists") {
                          return (
                            <li key={row.title} className="flex items-center gap-2.5 px-3 py-1.5 text-slate-400">
                              <Check size={14} className="shrink-0" aria-hidden />
                              <span className="min-w-0 flex-1 truncate">{title}</span>
                              <span className="shrink-0 text-[11px]">already there</span>
                            </li>
                          );
                        }
                        const on = !skipped.has(row.title);
                        return (
                          <li key={row.title}>
                            <label className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50">
                              <input type="checkbox" className="h-4 w-4 shrink-0 accent-indigo-600" checked={on} onChange={() => toggle(row.title)} />
                              <span className={`min-w-0 flex-1 truncate ${on ? "text-slate-900" : "text-slate-400 line-through"}`}>{title}</span>
                              <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">new</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
              {newChapters.length === 0 && (
                <p className="border-t border-slate-100 px-3 py-2.5 text-xs text-slate-600">Every chapter of this syllabus is already in the book.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
