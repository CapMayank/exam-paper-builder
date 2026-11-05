"use client";

import { AlertTriangle, ArrowLeft, Check, CheckCircle2, CircleSlash, FilePlus2, Layers, RefreshCw, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ErrorBanner, PageHeader, Spinner, useToast } from "@/components/ui";
import { normalizeSession, useAcademicSession } from "@/lib/academicSession";
import { suggestPreset, presetsForBook, presetTotals } from "@/lib/blueprintSetupPlan";
import type { ApplyRow, PlanRow } from "@/lib/blueprintSetup";
import { api } from "@/lib/client";
import { EXAM_TYPES, EXAM_TYPE_LABEL, sortClassNames, type ExamType } from "@/lib/constants";
import { plural } from "@/lib/format";
import { canManageScope, type Actor } from "@/lib/permissions";
import { isSchoolPattern } from "@/lib/presets";
import type { Book } from "@/lib/types";
import { usePresets } from "@/lib/usePresets";

const STEPS = ["Exam", "Classes & patterns", "Existing blueprints", "Review"] as const;
type Choice = { action: "create" | "update" | "skip"; targetId?: string };

/** "School pattern, 60 marks", or the title with its marks when the title does not already say them. */
const patternLabel = (r: { presetTitle: string; totalMarks: number }) =>
  /\bmarks\b/i.test(r.presetTitle) ? r.presetTitle : `${r.presetTitle} · ${r.totalMarks} marks`;

const minutesLabel = (m: number) => (m % 60 === 0 ? `${m / 60} h` : m > 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);

/**
 * Sets up one exam's blueprints for many classes and subjects in one pass: pick the exam, tick the subjects and
 * their patterns, decide what to do where a blueprint for that exam already exists, then create / update them all.
 */
export default function BlueprintSetupPage() {
  const toast = useToast();
  const { currentSession } = useAcademicSession();
  const session = normalizeSession(currentSession);
  const presets = usePresets("BLUEPRINT");

  const [step, setStep] = useState(0);
  const [books, setBooks] = useState<Book[] | null>(null);
  const [me, setMe] = useState<Actor | null>(null);
  const [error, setError] = useState<string | null>(null);

  // step 1
  const [examType, setExamType] = useState<ExamType>("ANNUAL");
  const [customTime, setCustomTime] = useState(false);
  const [durationMin, setDurationMin] = useState(180);
  // step 2: book id -> chosen preset id ("" = not included)
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [classes, setClasses] = useState<Set<string>>(new Set());
  // step 3
  const [plan, setPlan] = useState<PlanRow[] | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [busy, setBusy] = useState(false);
  // step 4
  const [result, setResult] = useState<ApplyRow[] | null>(null);

  useEffect(() => {
    Promise.all([api<Book[]>("/api/books"), api<Actor>("/api/me").catch(() => null)]).then(
      ([b, m]) => {
        setBooks(b);
        setMe(m);
      },
      (e) => setError((e as Error).message),
    );
  }, []);

  // books of this session the user may change, grouped by class in school order
  const byClass = useMemo(() => {
    const own = (books ?? []).filter(
      (b) => (!b.academicSession || normalizeSession(b.academicSession) === session) && (!me || canManageScope(me, b)),
    );
    const names = sortClassNames(Array.from(new Set(own.map((b) => b.className))));
    return names.map((name) => ({
      name,
      books: own.filter((b) => b.className === name).sort((a, b) => a.subject.localeCompare(b.subject)),
    }));
  }, [books, me, session]);

  /** Turns a class on (its subjects start on their suggested pattern) or off (its subjects are left out). */
  function setClassOn(name: string, on: boolean) {
    const group = byClass.find((c) => c.name === name);
    setClasses((prev) => {
      const next = new Set(prev);
      if (on) next.add(name);
      else next.delete(name);
      return next;
    });
    setPicked((prev) => {
      const next = { ...prev };
      for (const b of group?.books ?? []) {
        const s = suggestPreset(presets, b);
        if (on && s && b.chapters.length > 0) next[b.id] = s.id;
        else delete next[b.id];
      }
      return next;
    });
  }
  const toggleClass = (name: string) => setClassOn(name, !classes.has(name));

  const selectedRows = useMemo(
    () =>
      byClass
        .filter((c) => classes.has(c.name))
        .flatMap((c) => c.books)
        .filter((b) => picked[b.id])
        .map((b) => ({ bookId: b.id, presetId: picked[b.id] })),
    [byClass, classes, picked],
  );

  const exam = { examType, academicSession: session, durationMin: customTime ? durationMin : null };

  async function buildPlan() {
    setBusy(true);
    setError(null);
    try {
      const rows = await api<PlanRow[]>("/api/blueprints/setup", { method: "POST", json: { mode: "plan", exam, rows: selectedRows } });
      setPlan(rows);
      // an existing blueprint is updated by default (its papers follow); new ones are created
      const next: Record<string, Choice> = {};
      for (const r of rows) {
        const target = r.existing.find((e) => !e.impact.blocked);
        next[r.bookId] = r.error ? { action: "skip" } : r.existing.length === 0 ? { action: "create" } : target ? { action: "update", targetId: target.id } : { action: "create" };
      }
      setChoices(next);
      setStep(rows.some((r) => r.existing.length > 0 && !r.error) ? 2 : 3);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      const rows = plan.map((r) => ({
        bookId: r.bookId,
        presetId: r.presetId,
        action: r.error ? ("skip" as const) : choices[r.bookId]?.action ?? "create",
        targetBlueprintId: choices[r.bookId]?.targetId,
      }));
      const res = await api<ApplyRow[]>("/api/blueprints/setup", { method: "POST", json: { mode: "apply", exam, rows } });
      setResult(res);
      const done = res.filter((r) => r.action === "created" || r.action === "updated").length;
      toast.success(`Set up ${plural(done, "blueprint")} for the ${EXAM_TYPE_LABEL[examType]} exam`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const conflicts = (plan ?? []).filter((r) => r.existing.length > 0 && !r.error);
  const setAll = (action: Choice["action"]) =>
    setChoices((c) => {
      const next = { ...c };
      for (const r of conflicts) {
        const target = r.existing.find((e) => !e.impact.blocked);
        next[r.bookId] = action === "update" ? (target ? { action, targetId: target.id } : { action: "create" }) : { action };
      }
      return next;
    });

  const summary = useMemo(() => {
    const s = { create: 0, update: 0, skip: 0, papers: 0, archived: 0, review: 0, revert: 0 };
    for (const r of plan ?? []) {
      const c = r.error ? { action: "skip" as const } : choices[r.bookId] ?? { action: "create" as const };
      s[c.action]++;
      if (c.action === "update") {
        const imp = r.existing.find((e) => e.id === c.targetId)?.impact;
        if (imp) {
          s.papers += imp.papers;
          s.archived += imp.archivedQuestions;
          s.review += imp.papersNeedingReview;
          s.revert += imp.revertToDraft;
        }
      }
    }
    return s;
  }, [plan, choices]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/blueprints" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={15} /> Blueprints
        </Link>
      </div>
      <PageHeader
        icon={Layers}
        title="Set up an exam's blueprints"
        description={`Create or update the blueprints of one exam for many classes and subjects at once, for Session ${session}.`}
      />

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Steps">
        {STEPS.map((label, i) => {
          const state = result ? "done" : i < step ? "done" : i === step ? "current" : "todo";
          return (
            <li
              key={label}
              aria-current={state === "current" ? "step" : undefined}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                state === "current"
                  ? "border-amber-300 bg-amber-50 font-semibold text-slate-900"
                  : state === "done"
                    ? "border-slate-200 bg-white text-slate-700"
                    : "border-dashed border-slate-200 text-slate-400"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  state === "done" ? "bg-indigo-600 text-white" : state === "current" ? "bg-amber-400 text-slate-900" : "bg-slate-100 text-slate-500"
                }`}
              >
                {state === "done" ? <Check size={13} /> : i + 1}
              </span>
              {label}
            </li>
          );
        })}
      </ol>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {!books ? (
        <div className="card flex items-center gap-2 text-sm text-slate-500">
          <Spinner /> Loading classes and books…
        </div>
      ) : result ? (
        <ResultView result={result} examType={examType} />
      ) : step === 0 ? (
        <section className="card space-y-6" aria-labelledby="exam-h">
          <h2 id="exam-h" className="text-lg font-semibold text-slate-900">
            Which exam are these blueprints for?
          </h2>
          <div>
            <span className="label">Exam</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Exam">
              {EXAM_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={examType === t}
                  onClick={() => setExamType(t)}
                  className={`rounded-lg border px-3.5 py-2 text-sm ${
                    examType === t ? "border-indigo-600 bg-indigo-600 font-semibold text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {EXAM_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="label">Session</span>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">{session}</p>
              <p className="mt-1 text-xs text-slate-500">Change the session from the switcher at the top of the page.</p>
            </div>
            <div>
              <span className="label">Time allowed</span>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="time" checked={!customTime} onChange={() => setCustomTime(false)} />
                Each pattern&apos;s own time
              </label>
              <label className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="time" checked={customTime} onChange={() => setCustomTime(true)} />
                The same for every subject:
                <input
                  type="number"
                  min={5}
                  max={600}
                  step={5}
                  value={durationMin}
                  onChange={(e) => {
                    setCustomTime(true);
                    setDurationMin(Number(e.target.value) || 0);
                  }}
                  className="input w-24 py-1 text-center"
                  aria-label="Minutes"
                />
                minutes
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" className="btn btn-primary" onClick={() => setStep(1)} disabled={customTime && (durationMin < 5 || durationMin > 600)}>
              Choose classes
            </button>
          </div>
        </section>
      ) : step === 1 ? (
        <section className="space-y-4" aria-labelledby="classes-h">
          <div className="card space-y-3">
            <h2 id="classes-h" className="text-lg font-semibold text-slate-900">
              Classes for the {EXAM_TYPE_LABEL[examType]} exam
            </h2>
            {byClass.length === 0 ? (
              <p className="text-sm text-slate-600">
                There are no books for Session {session} that you look after. Add them under{" "}
                <Link href="/books" className="font-medium text-indigo-700 underline">
                  Books &amp; syllabus
                </Link>{" "}
                first.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Classes">
                  {byClass.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      aria-pressed={classes.has(c.name)}
                      onClick={() => toggleClass(c.name)}
                      className={`rounded-full border px-3 py-1 text-sm ${
                        classes.has(c.name) ? "border-indigo-600 bg-indigo-50 font-semibold text-indigo-800" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 text-xs">
                  <button type="button" className="btn btn-sm" onClick={() => byClass.forEach((c) => !classes.has(c.name) && setClassOn(c.name, true))}>
                    Select all classes
                  </button>
                  {classes.size > 0 && (
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setClasses(new Set()); setPicked({}); }}>
                      Clear
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {byClass
            .filter((c) => classes.has(c.name))
            .map((c) => (
              <div key={c.name} className="card !p-0 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <h3 className="font-semibold text-slate-900">{c.name}</h3>
                  <span className="text-xs text-slate-500">
                    {c.books.filter((b) => picked[b.id]).length} of {plural(c.books.length, "subject")}
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {c.books.map((b) => {
                    const offered = presetsForBook(presets, b);
                    const chosen = presets.find((p) => p.id === picked[b.id]);
                    const totals = chosen ? presetTotals(chosen) : null;
                    const noChapters = b.chapters.length === 0;
                    const inputId = `inc-${b.id}`;
                    return (
                      <li key={b.id} className="grid items-center gap-x-3 gap-y-1.5 px-4 py-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_auto]">
                        <label htmlFor={inputId} className="flex min-w-0 items-center gap-2.5">
                          <input
                            id={inputId}
                            type="checkbox"
                            disabled={offered.length === 0 || noChapters}
                            checked={Boolean(picked[b.id])}
                            onChange={(e) => {
                              const s = suggestPreset(presets, b);
                              setPicked((p) => ({ ...p, [b.id]: e.target.checked && s ? s.id : "" }));
                            }}
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-slate-900">{b.subject}</span>
                            <span className="block truncate text-xs text-slate-500">{b.title}</span>
                          </span>
                        </label>
                        {noChapters ? (
                          <p className="text-xs text-amber-800">This book has no chapters yet; add its syllabus first.</p>
                        ) : offered.length === 0 ? (
                          <p className="text-xs text-slate-500">No pattern for this class. Start this one from New blueprint.</p>
                        ) : (
                          <select
                            className="input py-1.5 text-sm"
                            aria-label={`Pattern for ${c.name} ${b.subject}`}
                            value={picked[b.id] || ""}
                            onChange={(e) => setPicked((p) => ({ ...p, [b.id]: e.target.value }))}
                          >
                            <option value="">Leave out</option>
                            {offered.map((p) => (
                              <option key={p.id} value={p.id}>
                                {isSchoolPattern(p) || /^MPBSE/i.test(p.title) ? p.title : `MPBSE: ${p.title}`}
                                {/\bmarks\b/i.test(p.title) ? "" : ` · ${presetTotals(p).marks} marks`}
                              </option>
                            ))}
                          </select>
                        )}
                        <span className="text-right text-xs tabular-nums text-slate-600">
                          {totals && chosen ? `${totals.marks} marks · ${totals.questions} Q · ${minutesLabel(customTime ? durationMin : chosen.durationMin)}` : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

          <div className="flex items-center justify-between gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" disabled={selectedRows.length === 0 || busy} onClick={buildPlan}>
              {busy ? <Spinner size="sm" /> : null}
              Check {plural(selectedRows.length, "subject")}
            </button>
          </div>
        </section>
      ) : step === 2 ? (
        <section className="space-y-4" aria-labelledby="existing-h">
          <div className="card space-y-2">
            <h2 id="existing-h" className="text-lg font-semibold text-slate-900">
              {plural(conflicts.length, "subject")} already {conflicts.length === 1 ? "has" : "have"} {/^[AEIOU]/.test(EXAM_TYPE_LABEL[examType]) ? "an" : "a"} {EXAM_TYPE_LABEL[examType]} blueprint
            </h2>
            <p className="text-sm text-slate-600">
              Updating replaces its sections and chapter marks with the pattern; papers built from it follow at once. Creating a new one leaves the old
              blueprint and its papers as they are.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
              <span className="text-slate-600">For all of them:</span>
              <button type="button" className="btn btn-sm" onClick={() => setAll("update")}>
                Update existing
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setAll("create")}>
                Create new
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setAll("skip")}>
                Skip
              </button>
            </div>
          </div>

          <ul className="space-y-3">
            {conflicts.map((r) => {
              const c = choices[r.bookId] ?? { action: "create" };
              const target = r.existing.find((e) => e.id === c.targetId) ?? r.existing[0];
              const imp = target.impact;
              const name = `ex-${r.bookId}`;
              return (
                <li key={r.bookId} className="card space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">
                      {r.className} {r.subject}
                    </h3>
                    <span className="text-xs text-slate-500">
                      New pattern: {patternLabel(r)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`${r.className} ${r.subject}`}>
                    {(["update", "create", "skip"] as const).map((a) => {
                      const disabled = a === "update" && r.existing.every((e) => e.impact.blocked);
                      return (
                        <label
                          key={a}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                            c.action === a ? "border-indigo-600 bg-indigo-50 font-semibold text-indigo-900" : "border-slate-300 text-slate-700"
                          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                        >
                          <input
                            type="radio"
                            name={name}
                            className="sr-only"
                            disabled={disabled}
                            checked={c.action === a}
                            onChange={() =>
                              setChoices((all) => ({
                                ...all,
                                [r.bookId]: a === "update" ? { action: a, targetId: (r.existing.find((e) => !e.impact.blocked) ?? target).id } : { action: a },
                              }))
                            }
                          />
                          {a === "update" ? "Update existing" : a === "create" ? "Create new" : "Skip"}
                        </label>
                      );
                    })}
                  </div>

                  {c.action === "update" && (
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                      {r.existing.length > 1 ? (
                        <label className="flex flex-wrap items-center gap-2">
                          <span className="text-slate-600">Update</span>
                          <select
                            className="input w-auto py-1 text-sm"
                            value={c.targetId}
                            onChange={(e) => setChoices((all) => ({ ...all, [r.bookId]: { action: "update", targetId: e.target.value } }))}
                          >
                            {r.existing.map((e) => (
                              <option key={e.id} value={e.id} disabled={Boolean(e.impact.blocked)}>
                                {e.name} ({e.totalMarks} marks, {plural(e.impact.papers, "paper")})
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <p className="text-slate-800">
                          Update <span className="font-medium">{target.name}</span> ({target.totalMarks} marks)
                        </p>
                      )}
                      <ImpactLine impact={imp} />
                    </div>
                  )}
                  {c.action === "update" && imp.blocked && <p className="text-sm text-red-700">{imp.blocked}</p>}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
              Review
            </button>
          </div>
        </section>
      ) : (
        <section className="space-y-4" aria-labelledby="review-h">
          <div className="card space-y-4">
            <h2 id="review-h" className="text-lg font-semibold text-slate-900">
              Ready to set up the {EXAM_TYPE_LABEL[examType]} exam
            </h2>
            <dl className="grid gap-3 sm:grid-cols-3">
              <Stat label="New blueprints" value={summary.create} />
              <Stat label="Blueprints updated" value={summary.update} />
              <Stat label="Left as they are" value={summary.skip} />
            </dl>
            {summary.update > 0 && summary.papers > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <p className="font-medium">
                  {plural(summary.papers, "paper")} built on the updated blueprints will follow the new pattern.
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {summary.archived > 0 && <li>{plural(summary.archived, "placed question")} in dropped sections will be taken out and saved in a snapshot of the paper.</li>}
                  {summary.review > 0 && <li>{plural(summary.review, "paper")} will show mismatches to fix in the paper builder.</li>}
                  {summary.revert > 0 && <li>{plural(summary.revert, "finalised paper")} will move back to draft.</li>}
                  {summary.archived === 0 && summary.review === 0 && summary.revert === 0 && <li>Their questions all still fit.</li>}
                </ul>
              </div>
            )}
          </div>

          <div className="card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Class and subject</th>
                  <th className="px-4 py-2 font-medium">Pattern</th>
                  <th className="px-4 py-2 font-medium">What happens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(plan ?? []).map((r) => {
                  const c = r.error ? { action: "skip" as const } : choices[r.bookId] ?? { action: "create" as const };
                  const target = r.existing.find((e) => e.id === (c as Choice).targetId);
                  return (
                    <tr key={r.bookId}>
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {r.className} {r.subject}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {patternLabel(r)} · {minutesLabel(r.durationMin)}
                      </td>
                      <td className="px-4 py-2.5">
                        {r.error ? (
                          <span className="text-red-700">Left out: {r.error}</span>
                        ) : c.action === "create" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-800">
                            <FilePlus2 size={14} /> Create
                          </span>
                        ) : c.action === "update" ? (
                          <span className="inline-flex items-center gap-1 text-indigo-800">
                            <RefreshCw size={14} /> Update {target?.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <CircleSlash size={14} /> Skip
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(conflicts.length > 0 ? 2 : 1)} disabled={busy}>
              Back
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={apply} disabled={busy || summary.create + summary.update === 0}>
              {busy ? <Spinner size="sm" /> : null}
              Set up {plural(summary.create + summary.update, "blueprint")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-display text-2xl font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

function ImpactLine({ impact }: { impact: PlanRow["existing"][number]["impact"] }) {
  if (impact.papers === 0) return <p className="text-slate-600">No papers use it yet.</p>;
  const notes = [
    impact.archivedQuestions > 0 && `${plural(impact.archivedQuestions, "placed question")} in dropped sections will be taken out (kept in a snapshot)`,
    impact.papersNeedingReview > 0 && `${plural(impact.papersNeedingReview, "paper")} will need fixing`,
    impact.revertToDraft > 0 && `${plural(impact.revertToDraft, "finalised paper")} will move back to draft`,
  ].filter(Boolean) as string[];
  return (
    <div className="flex items-start gap-2 text-slate-700">
      {notes.length > 0 ? <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" /> : <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />}
      <p>
        {plural(impact.papers, "paper")} {impact.papers === 1 ? "uses" : "use"} it and will follow the new pattern.{" "}
        {notes.length > 0 ? `${notes.join("; ")}.` : "Their questions all still fit."}
      </p>
    </div>
  );
}

function ResultView({ result, examType }: { result: ApplyRow[]; examType: ExamType }) {
  const failed = result.filter((r) => r.action === "failed");
  return (
    <section className="space-y-4" aria-labelledby="done-h">
      <div className="card space-y-1">
        <h2 id="done-h" className="text-lg font-semibold text-slate-900">
          {EXAM_TYPE_LABEL[examType]} blueprints are set up
        </h2>
        <p className="text-sm text-slate-600">
          {plural(result.filter((r) => r.action === "created").length, "blueprint")} created,{" "}
          {result.filter((r) => r.action === "updated").length} updated, {result.filter((r) => r.action === "skipped").length} skipped
          {failed.length > 0 ? `, ${failed.length} could not be set up` : ""}.
        </p>
      </div>
      <ul className="card !p-0 divide-y divide-slate-100 overflow-hidden">
        {result.map((r) => (
          <li key={r.bookId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              {r.action === "failed" ? (
                <XCircle size={15} className="shrink-0 text-red-600" />
              ) : r.action === "skipped" ? (
                <CircleSlash size={15} className="shrink-0 text-slate-400" />
              ) : (
                <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              )}
              <span className="font-medium text-slate-900">
                {r.className} {r.subject}
              </span>
              <span className="text-slate-500">
                {r.action === "created" ? "created" : r.action === "updated" ? "updated" : r.action === "skipped" ? "skipped" : r.error}
                {r.update && r.update.papers > 0 ? ` · ${plural(r.update.papers, "paper")} ${r.update.papers === 1 ? "follows" : "follow"} it` : ""}
                {r.update && r.update.revertedToDraft > 0 ? ` · ${r.update.revertedToDraft} back to draft` : ""}
              </span>
            </span>
            {r.blueprintId && (
              <Link href={`/blueprints/${r.blueprintId}`} className="text-indigo-700 hover:underline">
                Open
              </Link>
            )}
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Link href="/blueprints" className="btn btn-primary">
          Back to blueprints
        </Link>
      </div>
    </section>
  );
}
