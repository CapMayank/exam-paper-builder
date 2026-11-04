"use client";

import { useMemo, useState } from "react";
import { Check, Printer } from "lucide-react";
import { Modal } from "@/components/ui";
import { EXAM_TYPES, EXAM_TYPE_LABEL, inferClassOrder, sortClassNames, type ExamType } from "@/lib/constants";
import { blueprintsForExport } from "@/lib/blueprintSheet";
import type { Blueprint } from "@/lib/types";

const STAGES: Array<{ label: string; match: (order: number) => boolean }> = [
  { label: "Pre-primary", match: (o) => o <= 0 },
  { label: "Primary", match: (o) => o >= 1 && o <= 5 },
  { label: "Middle", match: (o) => o >= 6 && o <= 8 },
  { label: "Secondary", match: (o) => o === 9 || o === 10 },
  { label: "Senior secondary", match: (o) => o >= 11 },
];

/**
 * Pick an exam and the classes; every blueprint made for them opens as one printable document (one page per
 * subject) to publish for students: the question pattern and the marks per chapter, no questions.
 */
export function BlueprintExportModal({
  blueprints,
  session,
  onClose,
}: {
  /** Blueprints of the session. */
  blueprints: Blueprint[];
  session: string;
  onClose: () => void;
}) {
  const examCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of blueprints) m.set(b.examType, (m.get(b.examType) ?? 0) + 1);
    return m;
  }, [blueprints]);
  const exams = EXAM_TYPES.filter((e) => examCounts.has(e));
  const [examType, setExamType] = useState<string>(
    () => [...exams].sort((a, b) => (examCounts.get(b) ?? 0) - (examCounts.get(a) ?? 0))[0] ?? "ANNUAL",
  );

  const forExam = useMemo(() => blueprints.filter((b) => b.examType === examType), [blueprints, examType]);
  const classNames = useMemo(() => sortClassNames(Array.from(new Set(forExam.map((b) => b.book.className)))), [forExam]);
  const [picked, setPicked] = useState<Set<string> | null>(null); // null = every class
  const chosen = picked ? classNames.filter((c) => picked.has(c)) : classNames;

  const selected = useMemo(
    () => blueprintsForExport(blueprints, { session, examType, classes: chosen }),
    [blueprints, session, examType, chosen],
  );

  function toggle(c: string) {
    setPicked((prev) => {
      const next = new Set(prev ?? classNames);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  function open() {
    const q = new URLSearchParams({ session, exam: examType, classes: chosen.join("|") });
    window.open(`/blueprints/print?${q.toString()}`, "_blank", "noopener");
  }

  const byClass = new Map<string, string[]>();
  for (const b of selected) byClass.set(b.book.className, [...(byClass.get(b.book.className) ?? []), b.book.subject]);

  return (
    <Modal
      size="lg"
      title="Export blueprints"
      subtitle={`One page per subject with the question pattern and marks per chapter, ready to print or save as PDF for students. Session ${session}.`}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-600" aria-live="polite">
            {selected.length === 0
              ? "Choose at least one class."
              : `${selected.length} blueprint${selected.length === 1 ? "" : "s"} from ${byClass.size} class${byClass.size === 1 ? "" : "es"}`}
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={selected.length === 0} onClick={open}>
              <Printer size={15} /> Open for printing
            </button>
          </div>
        </div>
      }
    >
      {exams.length === 0 ? (
        <p className="text-sm text-slate-600">There are no blueprints in Session {session} yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-slate-900">Exam</legend>
              <div role="radiogroup" aria-label="Exam" className="flex flex-wrap gap-2">
                {exams.map((e) => (
                  <button
                    key={e}
                    type="button"
                    role="radio"
                    aria-checked={examType === e}
                    onClick={() => {
                      setExamType(e);
                      setPicked(null);
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      examType === e
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                    }`}
                  >
                    {EXAM_TYPE_LABEL[e as ExamType]}
                    <span className={`ml-1.5 text-xs ${examType === e ? "text-indigo-100" : "text-slate-400"}`}>{examCounts.get(e)}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <legend className="text-sm font-semibold text-slate-900">Classes</legend>
                <button
                  type="button"
                  className="text-xs font-medium text-indigo-700 hover:underline"
                  onClick={() => setPicked(chosen.length === classNames.length ? new Set() : null)}
                >
                  {chosen.length === classNames.length ? "Clear all" : "Select all"}
                </button>
              </div>
              <div className="space-y-2">
                {STAGES.map((stage) => {
                  const names = classNames.filter((c) => stage.match(inferClassOrder(c)));
                  if (names.length === 0) return null;
                  return (
                    <div key={stage.label} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="w-28 shrink-0 text-xs text-slate-500">{stage.label}</span>
                      <div className="flex flex-wrap gap-2">
                        {names.map((c) => {
                          const on = chosen.includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              role="checkbox"
                              aria-checked={on}
                              onClick={() => toggle(c)}
                              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                                on ? "border-indigo-500 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              <span
                                className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                                  on ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"
                                }`}
                              >
                                {on && <Check size={10} strokeWidth={3} />}
                              </span>
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">In the document</h3>
            <div className="max-h-80 overflow-y-auto overscroll-contain rounded-xl border border-slate-200">
              {byClass.size === 0 ? (
                <p className="p-4 text-xs text-slate-500">Nothing selected.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {[...byClass].map(([cls, subjects]) => (
                    <li key={cls} className="px-3 py-2">
                      <p className="font-semibold text-slate-900">{cls}</p>
                      <p className="text-xs text-slate-500">{subjects.join(", ")}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
