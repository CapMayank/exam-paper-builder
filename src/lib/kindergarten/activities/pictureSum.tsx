"use client";

import React from "react";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps, PictureSumConfig, PictureSumRow } from "../types";
import {
  ActivityFrame,
  AddRowButton,
  AnswerBox,
  Art,
  ClipartChip,
  EditorSection,
  InstructionField,
  PreviewBox,
  RemoveButton,
  Stepper,
} from "./_shared";

export const pictureSumDefaultConfig = (): PictureSumConfig => ({
  op: "ADD",
  showPictures: true,
  instruction: "Count the pictures and add. Write the answer in the box:",
  rows: [
    { a: 2, b: 1, clipartId: "apple" },
    { a: 3, b: 2, clipartId: "ball" },
    { a: 1, b: 4, clipartId: "star" },
  ],
});

function Group({ id, n, crossed = 0 }: { id: string; n: number; crossed?: number }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-0.5">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="relative inline-flex">
          <Art id={id} size={26} />
          {i >= n - crossed && (
            <svg className="absolute inset-0" viewBox="0 0 26 26" width={26} height={26}>
              <path d="M3 3 L23 23 M23 3 L3 23" stroke="#0f172a" strokeWidth={2.5} />
            </svg>
          )}
        </span>
      ))}
    </span>
  );
}

function PictureSumEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<PictureSumConfig>) {
  const setRow = (i: number, patch: Partial<PictureSumRow>) =>
    onChange({ ...config, rows: config.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const subtract = config.op === "SUBTRACT";

  return (
    <div className="space-y-4">
      <InstructionField value={instructionText} onChange={onInstructionChange} placeholder="e.g. Add the pictures and write the answer" />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(["ADD", "SUBTRACT"] as const).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => onChange({ ...config, op })}
              className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${
                config.op === op ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {op === "ADD" ? "+ Addition" : "− Subtraction"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={config.showPictures} onChange={(e) => onChange({ ...config, showPictures: e.target.checked })} />
          Show pictures under the numbers
        </label>
      </div>

      <EditorSection title="Sums">
        <div className="space-y-2">
          {config.rows.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-2">
              <ClipartChip clipartId={r.clipartId} onPick={(id) => setRow(i, { clipartId: id })} />
              <Stepper label="First" value={r.a} min={subtract ? 1 : 0} max={10} onChange={(n) => setRow(i, { a: n, b: subtract ? Math.min(r.b, n) : r.b })} />
              <Stepper label={subtract ? "Take away" : "Second"} value={r.b} min={0} max={subtract ? r.a : 10} onChange={(n) => setRow(i, { b: n })} />
              <span className="ml-auto text-sm font-bold text-slate-500">
                = {subtract ? r.a - r.b : r.a + r.b}
              </span>
              <RemoveButton label="Remove sum" onClick={() => onChange({ ...config, rows: config.rows.filter((_, j) => j !== i) })} />
            </div>
          ))}
          {config.rows.length < 8 && (
            <AddRowButton onClick={() => onChange({ ...config, rows: [...config.rows, { a: 2, b: 1, clipartId: "apple" }] })}>Add sum</AddRowButton>
          )}
        </div>
      </EditorSection>

      <PreviewBox>
        <PictureSumPrint config={config} instructionText={instructionText} />
      </PreviewBox>
    </div>
  );
}

function PictureSumPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<PictureSumConfig>) {
  const subtract = config.op === "SUBTRACT";
  return (
    <ActivityFrame numberLabel={numberLabel} marks={marks} instruction={instructionText || config.instruction}>
      <div className="space-y-3 py-1">
        {config.rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {config.showPictures &&
              (subtract ? (
                <Group id={r.clipartId} n={r.a} crossed={r.b} />
              ) : (
                <>
                  <Group id={r.clipartId} n={r.a} />
                  <span className="text-xl font-black">+</span>
                  <Group id={r.clipartId} n={r.b} />
                </>
              ))}
            <span className="ml-auto flex items-center gap-2 text-2xl font-black text-slate-900">
              {r.a} {subtract ? "−" : "+"} {r.b} = <AnswerBox size={38} />
            </span>
          </div>
        ))}
      </div>
    </ActivityFrame>
  );
}

export const pictureSumPlugin: KindergartenActivityPlugin<PictureSumConfig> = {
  type: "KDG_PICTURE_SUM",
  label: "Add / Subtract with Pictures",
  shortLabel: "Picture Sums",
  category: "math",
  description: "Single-digit addition or subtraction supported by countable pictures and an answer box.",
  iconName: "Calculator",
  defaultConfig: pictureSumDefaultConfig,
  validateConfig: (cfg) => {
    const c = cfg as PictureSumConfig;
    if (!c || !Array.isArray(c.rows) || c.rows.length === 0) return { valid: false, error: "Add at least one sum" };
    return { valid: true };
  },
  renderEditor: PictureSumEditor,
  renderPrint: PictureSumPrint,
  getSummary: (c) => `${c.op === "ADD" ? "Addition" : "Subtraction"} · ${c.rows.length} sums`,
};
