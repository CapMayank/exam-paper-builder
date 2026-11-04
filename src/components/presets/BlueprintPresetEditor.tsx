"use client";

import { ArrowDown, ArrowUp, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Field } from "@/components/ui";
import { QUESTION_TYPE_LABEL, STANDARD_QUESTION_TYPES, type QuestionType } from "@/lib/constants";
import type { BlueprintTemplateSectionGroup } from "@/lib/curriculumTemplates";
import { blueprintTotals, type BlueprintPreset } from "@/lib/presets";
import { EXAM_TYPES, LEVEL_OPTIONS, levelLabel, SECTION_TONES, SUBJECT_SUGGESTIONS } from "./presetUi";

type QT = BlueprintTemplateSectionGroup["questionTypes"][number];

const OR_LABEL: Record<NonNullable<QT["orChoiceMode"]>, string> = {
  NOT_REQUIRED: "No OR choice",
  REQUIRED: "OR choice on every question",
  BOARD_DEFAULT: "Board rule",
};

const sectionMarks = (g: BlueprintTemplateSectionGroup) => g.questionTypes.reduce((a, q) => a + q.count * q.marksEach, 0);

/** The paper's marks split by section: what the pattern adds up to, visible while counts are edited. */
function MarksBar({ sections }: { sections: BlueprintTemplateSectionGroup[] }) {
  const { marks, questions } = blueprintTotals(sections);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-sm text-slate-600">
          <span className="font-display text-2xl font-semibold tabular-nums text-slate-900">{marks}</span> marks in{" "}
          <span className="font-medium tabular-nums text-slate-900">{questions}</span> questions
        </p>
        <p className="text-xs text-slate-500">Total marks are worked out from the sections.</p>
      </div>
      <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-200" role="img" aria-label={sections.map((g) => `${g.title}: ${sectionMarks(g)} marks`).join("; ")}>
        {marks > 0 &&
          sections.map((g, i) => {
            const m = sectionMarks(g);
            if (m <= 0) return null;
            return (
              <span
                key={i}
                className={`${SECTION_TONES[i % SECTION_TONES.length].bar} h-full transition-[width] duration-300 motion-reduce:transition-none ${i > 0 ? "border-l-2 border-white" : ""}`}
                style={{ width: `${(m / marks) * 100}%` }}
              />
            );
          })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
        {sections.map((g, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${SECTION_TONES[i % SECTION_TONES.length].dot}`} aria-hidden />
            <span className="max-w-56 truncate">{g.title || `Section ${i + 1}`}</span>
            <span className="tabular-nums text-slate-900">{sectionMarks(g)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BlueprintPresetEditor({
  draft,
  isBoardPattern,
  onChange,
}: {
  draft: BlueprintPreset;
  /** An MPBSE pattern read from the board's marks scheme. */
  isBoardPattern: boolean;
  onChange: (next: BlueprintPreset) => void;
}) {
  const set = <K extends keyof BlueprintPreset>(k: K, v: BlueprintPreset[K]) => onChange({ ...draft, [k]: v });
  const setSections = (sections: BlueprintTemplateSectionGroup[]) => onChange({ ...draft, sections });
  const setSection = (i: number, patch: Partial<BlueprintTemplateSectionGroup>) =>
    setSections(draft.sections.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const setQT = (i: number, k: number, patch: Partial<QT>) =>
    setSection(i, { questionTypes: draft.sections[i].questionTypes.map((q, j) => (j === k ? { ...q, ...patch } : q)) });
  const moveSection = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= draft.sections.length) return;
    const next = [...draft.sections];
    [next[i], next[j]] = [next[j], next[i]];
    setSections(next);
  };
  const types = STANDARD_QUESTION_TYPES as readonly QuestionType[];

  return (
    <div className="space-y-6">
      {isBoardPattern && (
        <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          This is the MPBSE 2026–27 board pattern. Your changes apply to new blueprints only, and a paper made from it may no longer match the board&apos;s marks scheme.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pattern name" className="sm:col-span-2">
          <input className="input" value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Half-yearly, 40 marks" />
        </Field>
        <Field label="Note shown when picking a pattern" className="sm:col-span-2">
          <input className="input" value={draft.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <select className="input" value={draft.classFrom} onChange={(e) => set("classFrom", Number(e.target.value))} disabled={isBoardPattern}>
              {LEVEL_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {levelLabel(n)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="To" error={draft.classTo < draft.classFrom ? "Comes before the first class" : null}>
            <select className="input" value={draft.classTo} onChange={(e) => set("classTo", Number(e.target.value))} disabled={isBoardPattern}>
              {LEVEL_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {levelLabel(n)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Subject" helper={isBoardPattern ? undefined : "Leave empty to offer the pattern for every subject of these classes."}>
          <input
            className="input"
            list="pattern-subjects"
            value={draft.subjectName ?? ""}
            onChange={(e) => set("subjectName", e.target.value || undefined)}
            placeholder="Every subject"
            disabled={isBoardPattern}
          />
          <datalist id="pattern-subjects">
            {SUBJECT_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label="Exam">
          <select className="input" value={draft.examType} onChange={(e) => set("examType", e.target.value as BlueprintPreset["examType"])}>
            {EXAM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Time allowed (minutes)">
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min={10}
            max={600}
            step={5}
            value={draft.durationMin}
            onChange={(e) => set("durationMin", Number(e.target.value) || 0)}
          />
        </Field>
      </div>

      <MarksBar sections={draft.sections} />

      <section aria-labelledby="sections-heading" className="space-y-3">
        <h3 id="sections-heading" className="font-semibold text-slate-900">
          Sections
        </h3>
        <ol className="space-y-3">
          {draft.sections.map((g, i) => (
            <li key={i} className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-start gap-3 border-b border-slate-100 p-3">
                <span className={`mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full ${SECTION_TONES[i % SECTION_TONES.length].dot}`} aria-hidden />
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                  <input
                    className={`input py-1.5 text-sm font-medium ${g.title.trim() ? "" : "border-red-300"}`}
                    aria-label={`Title of section ${i + 1}`}
                    value={g.title}
                    onChange={(e) => setSection(i, { title: e.target.value })}
                    placeholder={`Section ${String.fromCharCode(65 + i)}`}
                  />
                  <input
                    className="input py-1.5 text-sm"
                    aria-label={`Instructions for section ${i + 1}`}
                    value={g.instructions}
                    onChange={(e) => setSection(i, { instructions: e.target.value })}
                    placeholder="Instructions printed under the heading"
                  />
                </div>
                <div className="flex shrink-0 items-center">
                  <span className="mr-2 hidden text-sm tabular-nums text-slate-500 sm:inline">{sectionMarks(g)} marks</span>
                  <button type="button" className="btn btn-ghost btn-icon" aria-label={`Move section ${i + 1} up`} disabled={i === 0} onClick={() => moveSection(i, -1)}>
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    aria-label={`Move section ${i + 1} down`}
                    disabled={i === draft.sections.length - 1}
                    onClick={() => moveSection(i, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon text-red-600 hover:text-red-700"
                    aria-label={`Remove section ${i + 1}`}
                    disabled={draft.sections.length === 1}
                    onClick={() => setSections(draft.sections.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 p-3">
                {g.questionTypes.map((q, k) => (
                  <div key={k} className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50/80 p-2">
                    <label className="min-w-48 flex-1">
                      <span className="mb-1 block text-[11px] text-slate-500">Question type</span>
                      <select className="input py-1.5 text-sm" value={q.type} onChange={(e) => setQT(i, k, { type: e.target.value as QuestionType })}>
                        {!types.includes(q.type) && <option value={q.type}>{QUESTION_TYPE_LABEL[q.type] ?? q.type}</option>}
                        {types.map((t) => (
                          <option key={t} value={t}>
                            {QUESTION_TYPE_LABEL[t]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="w-20">
                      <span className="mb-1 block text-[11px] text-slate-500">Questions</span>
                      <input
                        className="input py-1.5 text-sm tabular-nums"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        value={q.count}
                        onChange={(e) => setQT(i, k, { count: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                      />
                    </label>
                    <label className="w-20">
                      <span className="mb-1 block text-[11px] text-slate-500">Marks each</span>
                      <input
                        className="input py-1.5 text-sm tabular-nums"
                        type="number"
                        inputMode="decimal"
                        min={0.5}
                        max={100}
                        step={0.5}
                        value={q.marksEach}
                        onChange={(e) => setQT(i, k, { marksEach: Math.max(0, Number(e.target.value) || 0) })}
                      />
                    </label>
                    <label className="w-52">
                      <span className="mb-1 block text-[11px] text-slate-500">Choice</span>
                      <select
                        className="input py-1.5 text-sm"
                        value={q.orChoiceMode ?? "NOT_REQUIRED"}
                        onChange={(e) => setQT(i, k, { orChoiceMode: e.target.value as QT["orChoiceMode"] })}
                      >
                        {(Object.keys(OR_LABEL) as Array<keyof typeof OR_LABEL>).map((m) => (
                          <option key={m} value={m}>
                            {OR_LABEL[m]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="w-16 pb-2 text-right text-sm tabular-nums text-slate-700">= {Math.round(q.count * q.marksEach * 100) / 100}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon mb-0.5 text-red-600 hover:text-red-700"
                      aria-label="Remove this question type"
                      disabled={g.questionTypes.length === 1}
                      onClick={() => setSection(i, { questionTypes: g.questionTypes.filter((_, j) => j !== k) })}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-sm btn-ghost text-indigo-700"
                  onClick={() => setSection(i, { questionTypes: [...g.questionTypes, { type: "SHORT", count: 1, marksEach: 2, orChoiceMode: "NOT_REQUIRED" }] })}
                >
                  <Plus size={14} /> Add question type
                </button>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() =>
            setSections([
              ...draft.sections,
              {
                title: `Section ${String.fromCharCode(65 + draft.sections.length)}`,
                instructions: "",
                questionTypes: [{ type: "SHORT", count: 2, marksEach: 2, orChoiceMode: "NOT_REQUIRED" }],
              },
            ])
          }
        >
          <Plus size={14} /> Add section
        </button>
      </section>
    </div>
  );
}
