"use client";

import { Check, GraduationCap } from "lucide-react";
import type { Assignment } from "@/lib/permissions";

export type PickerClass = { name: string; subjects: string[] };

const key = (s: string) => s.trim().toLowerCase();

/**
 * One row per class: a "Class In-charge" switch (whole class, plus its settings) and a chip per subject.
 * With In-charge on, the subject chips read as already covered.
 */
export function ClassAssignmentPicker({
  classes,
  value,
  onChange,
}: {
  classes: PickerClass[];
  value: Assignment[];
  onChange: (next: Assignment[]) => void;
}) {
  const has = (className: string, subject: string) =>
    value.some((a) => key(a.className) === key(className) && key(a.subject) === key(subject));

  const toggle = (className: string, subject: string) => {
    if (has(className, subject)) {
      onChange(value.filter((a) => !(key(a.className) === key(className) && key(a.subject) === key(subject))));
    } else if (!subject) {
      // In-charge covers every subject, so drop the per-subject lines of that class.
      onChange([...value.filter((a) => key(a.className) !== key(className)), { className, subject: "" }]);
    } else {
      onChange([...value, { className, subject }]);
    }
  };

  // Assignments for classes not in this session's list (e.g. renamed or not yet created) stay visible.
  const known = new Set(classes.map((c) => key(c.name)));
  const orphans = value.filter((a) => !known.has(key(a.className)));

  if (classes.length === 0 && orphans.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        No classes yet. Create classes on the Classes page, then come back to assign teachers.
      </p>
    );
  }

  return (
    <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
      {classes.map((c) => {
        const inCharge = has(c.name, "");
        const count = value.filter((a) => key(a.className) === key(c.name)).length;
        return (
          <fieldset
            key={c.name}
            className={`rounded-xl border p-3 transition-colors ${
              count > 0 ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <legend className="text-sm font-bold text-slate-900">{c.name}</legend>
              <button
                type="button"
                role="switch"
                aria-checked={inCharge}
                aria-label={`Class In-charge of ${c.name}`}
                onClick={() => toggle(c.name, "")}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                  inCharge
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-indigo-400"
                }`}
              >
                <GraduationCap size={14} aria-hidden /> Class In-charge
              </button>
            </div>
            {c.subjects.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {c.subjects.map((s) => {
                  const on = has(c.name, s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={inCharge || on}
                      disabled={inCharge}
                      title={inCharge ? "Covered by Class In-charge" : undefined}
                      onClick={() => toggle(c.name, s)}
                      className={`inline-flex min-h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                        inCharge
                          ? "cursor-default border-indigo-100 bg-indigo-100/70 text-indigo-700"
                          : on
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      {(on || inCharge) && <Check size={12} aria-hidden />}
                      {s}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>
        );
      })}
      {orphans.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">Assigned classes not found in the current list</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {orphans.map((a) => (
              <button
                key={`${a.className}|${a.subject}`}
                type="button"
                onClick={() => toggle(a.className, a.subject)}
                className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-medium hover:bg-amber-100"
                title="Remove this assignment"
              >
                {a.subject ? `${a.className} · ${a.subject}` : `${a.className} · In-charge`} ✕
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Compact read-only view for tables and profiles. */
export function AssignmentChips({ assignments, empty }: { assignments: Assignment[]; empty?: React.ReactNode }) {
  if (assignments.length === 0) return <>{empty ?? null}</>;
  return (
    <div className="flex min-w-[11rem] max-w-[22rem] flex-wrap gap-1">
      {assignments.map((a) => (
        <span
          key={`${a.className}|${a.subject}`}
          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
            a.subject ? "bg-emerald-50 text-emerald-800" : "bg-indigo-100 text-indigo-800"
          }`}
        >
          {!a.subject && <GraduationCap size={11} aria-hidden />}
          {a.className}
          {a.subject ? <span className="font-medium text-emerald-700">{a.subject}</span> : <span className="font-medium">In-charge</span>}
        </span>
      ))}
    </div>
  );
}
