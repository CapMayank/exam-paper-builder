"use client";

import { FilePlus2, FileUp, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { sortClassNames } from "@/lib/constants";
import { QUESTION_TYPE_LABEL } from "@/lib/constants";
import type { BlueprintTemplate } from "@/lib/curriculumTemplates";
import { isSchoolPattern, type BlueprintPreset } from "@/lib/presets";
import { usePresets } from "@/lib/usePresets";
import { isSubjectMatching } from "@/lib/schoolCurriculum";
import type { AcademicClassDto, Book } from "@/lib/types";

const STAGES: Array<{ label: string; match: (level: number | null) => boolean }> = [
  { label: "Pre-primary", match: (l) => l === null },
  { label: "Primary", match: (l) => l !== null && l >= 1 && l <= 5 },
  { label: "Middle", match: (l) => l !== null && l >= 6 && l <= 8 },
  { label: "Secondary", match: (l) => l === 9 || l === 10 },
  { label: "Senior secondary", match: (l) => l === 11 || l === 12 },
];

function levelOf(className: string): number | null {
  const m = className.match(/\d{1,2}/);
  return m ? parseInt(m[0], 10) : null;
}

function questionCount(t: BlueprintTemplate): number {
  return t.sections.reduce((acc, g) => acc + g.questionTypes.reduce((a, q) => a + (q.type === "MATCH_COLUMN" ? 1 : q.count), 0), 0);
}

/** "MCQ, fill in the blanks, short answer": the kinds of question a pattern asks, in order. */
function questionKinds(t: BlueprintTemplate): string {
  const seen: string[] = [];
  for (const g of t.sections) for (const q of g.questionTypes) {
    const label = QUESTION_TYPE_LABEL[q.type] ?? q.type;
    if (!seen.includes(label)) seen.push(label);
  }
  return seen.join(", ");
}

const inRange = (p: BlueprintPreset, level: number | null) => level !== null && level >= p.classFrom && level <= p.classTo;

/**
 * First step of a new blueprint: which class and subject it is for, and how to start. The classes and subjects
 * are the school's own (set up under Classes & subjects). MPBSE publishes ready patterns for Classes 9-12; Classes
 * 1-8 use the school's own 50 / 60-mark pattern; any class can still start from a blank blueprint.
 */
export function BlueprintStartPicker({
  classes,
  books,
  initialClassName,
  initialSubject,
  onUsePattern,
  onAdaptPattern,
  onUseSchoolPattern,
  onBlank,
  onImport,
  onAi,
}: {
  classes: AcademicClassDto[];
  books: Book[];
  initialClassName?: string;
  initialSubject?: string;
  onUsePattern: (t: BlueprintTemplate) => void;
  onAdaptPattern: (t: BlueprintTemplate) => void;
  onUseSchoolPattern: (t: BlueprintTemplate, pick: { className: string; subject: string }) => void;
  onBlank: (pick: { className: string; subject: string }) => void;
  onImport: () => void;
  /** Read the blueprint from a circular, syllabus image, PDF or text with AI. */
  onAi?: () => void;
}) {
  const classNames = useMemo(
    () => sortClassNames(Array.from(new Set([...classes.map((c) => c.name), ...books.map((b) => b.className)]))),
    [classes, books],
  );
  const [className, setClassName] = useState<string>(
    classNames.find((c) => c.toLowerCase() === (initialClassName ?? "").toLowerCase()) ?? classNames.find((c) => levelOf(c) === 10) ?? classNames[0] ?? "",
  );
  const level = levelOf(className);

  const subjects = useMemo(() => {
    const fromClass = classes.filter((c) => c.name === className).flatMap((c) => c.subjects.map((s) => s.name));
    const fromBooks = books.filter((b) => b.className === className).map((b) => b.subject);
    const seen: string[] = [];
    for (const n of [...fromClass, ...fromBooks]) if (!seen.some((x) => isSubjectMatching(x, n))) seen.push(n);
    return seen;
  }, [classes, books, className]);

  const [subject, setSubject] = useState<string>(initialSubject ?? "");
  const activeSubject = subjects.find((s) => isSubjectMatching(s, subject)) ?? "";

  const presets = usePresets("BLUEPRINT");
  const patterns = useMemo(
    () =>
      !activeSubject
        ? []
        : presets.filter((t) => !isSchoolPattern(t) && inRange(t, level) && isSubjectMatching(t.subjectName, activeSubject)),
    [presets, level, activeSubject],
  );
  // the school's own patterns: for every subject of these classes, or for the one subject they name
  const schoolPatterns = useMemo(
    () =>
      !activeSubject
        ? []
        : presets.filter((t) => isSchoolPattern(t) && inRange(t, level) && (!t.subjectName || isSubjectMatching(t.subjectName, activeSubject))),
    [presets, level, activeSubject],
  );
  const hasBook = books.some((b) => b.className === className && isSubjectMatching(b.subject, activeSubject));

  return (
    <section className="card space-y-5" aria-labelledby="start-heading">
      <div>
        <h2 id="start-heading" className="text-lg font-semibold text-slate-900">
          Which paper is this blueprint for?
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Pick the class and subject. The pattern fills in the sections, marks and chapter weightage for you: MPBSE 2026–27
          for Classes 9–12, the school pattern for Classes 1–8.
        </p>
      </div>

      <div className="space-y-2">
        <span className="label">Class</span>
        <div className="space-y-2" role="group" aria-label="Class">
          {STAGES.map((stage) => {
            const names = classNames.filter((c) => stage.match(levelOf(c)));
            if (names.length === 0) return null;
            return (
              <div key={stage.label} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="w-32 shrink-0 text-xs text-slate-500">{stage.label}</span>
                <div className="flex flex-wrap gap-2">
                  {names.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={className === c}
                      onClick={() => {
                        setClassName(c);
                        setSubject("");
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                        className === c
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className="label">Subject</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Subject">
          {subjects.length === 0 && (
            <p className="text-sm text-slate-500">No subjects set up for {className} yet. Add them under Classes &amp; subjects.</p>
          )}
          {subjects.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={activeSubject === s}
              onClick={() => setSubject(s)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                activeSubject === s
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {activeSubject && (
        <div className="space-y-2">
          <span className="label">Pattern</span>
          {patterns.length === 0 && schoolPatterns.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">
                  {className} {activeSubject}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {level !== null && level >= 9 ? "No MPBSE pattern is published for this subject." : "MPBSE publishes no board pattern for this class."} Set the sections and marks yourself
                  {hasBook ? ", using its textbook chapters." : "; add a textbook for it under Books & syllabus first."}
                </p>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => onBlank({ className, subject: activeSubject })}>
                Start blueprint
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {patterns.length > 0 && (
              <ul className="grid gap-3 md:grid-cols-2">
                {patterns.map((t) => (
                  <li key={t.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {className} {activeSubject}
                        {t.variant ? ` – ${t.variant}` : ""}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {t.totalMarks} marks · {questionCount(t)} questions · {Math.round(t.durationMin / 60 * 10) / 10} hours
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <ShieldCheck size={13} className={t.source ? "text-emerald-600" : "text-slate-400"} />
                        {t.source ? `MPBSE 2026–27 marks scheme, page ${t.source.pdfPage}` : "School-defined pattern (not an MPBSE paper)"}
                      </p>
                    </div>
                    <div className="mt-auto flex flex-wrap gap-2">
                      <button type="button" className="btn btn-primary" onClick={() => onUsePattern(t)}>
                        Use board pattern
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost border border-slate-200"
                        onClick={() => onAdaptPattern(t)}
                        title="Quarterly, half-yearly or pre-board: choose the chapters taught and the total marks"
                      >
                        Adapt for a school exam
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              )}
              {schoolPatterns.length > 0 && (
              <ul className="grid gap-3 md:grid-cols-2">
                {schoolPatterns.map((t) => (
                  <li key={t.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {className} {activeSubject}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {t.title}
                      {t.title.includes(`${t.totalMarks} marks`) ? "" : ` · ${t.totalMarks} marks`} · {questionCount(t)} questions
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{questionKinds(t)}</p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <ShieldCheck size={13} className="text-slate-400" />
                        {t.subjectName ? `School pattern for ${t.targetClasses} ${t.subjectName}` : `School pattern for ${t.targetClasses}`}
                        {!hasBook
                          ? "; add the textbook under Books & syllabus first"
                          : t.sections.some((g) => g.questionTypes.some((q) => q.role === "PASSAGE" || q.role === "WRITING" || q.role === "GRAMMAR"))
                          ? "; the unseen passage, writing and grammar marks get their own rows, the rest go to the lessons"
                          : "; chapter marks are spread over the book's chapters"}
                      </p>
                    </div>
                    <div className="mt-auto flex flex-wrap gap-2">
                      <button type="button" className="btn btn-primary" onClick={() => onUseSchoolPattern(t, { className, subject: activeSubject })}>
                        Use school pattern
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-sm">
        <span className="text-slate-500">Or start another way:</span>
        <button type="button" className="inline-flex items-center gap-1.5 font-medium text-indigo-700 hover:underline" onClick={() => onBlank({ className, subject: activeSubject })}>
          <FilePlus2 size={15} /> Blank blueprint
        </button>
        <button type="button" className="inline-flex items-center gap-1.5 font-medium text-indigo-700 hover:underline" onClick={onImport}>
          <FileUp size={15} /> Import a file
        </button>
        {onAi && (
          <button type="button" className="inline-flex items-center gap-1.5 font-medium text-indigo-700 hover:underline" onClick={onAi}>
            <Sparkles size={15} /> Read from a document with AI
          </button>
        )}
      </div>
    </section>
  );
}
