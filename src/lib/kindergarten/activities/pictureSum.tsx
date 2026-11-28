"use client";

import { ChoiceChips, EditorShell, InstructionField, NumberStepper, PictureChip, RowList, ToggleRow } from "../editor-kit";

import React from "react";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps, PictureSumConfig, PictureSumRow } from "../types";
import { ActivityFrame, AnswerBox, Art, PreviewBox } from "./_shared";
import { followMode } from "../autoInstruction";

export const PICTURE_SUM_INSTRUCTIONS: Record<PictureSumConfig["op"], string> = {
  ADD: "Count the pictures and add. Write the answer in the box:",
  SUBTRACT: "Count the pictures left after crossing out. Write the answer in the box:",
};

export const pictureSumDefaultConfig = (): PictureSumConfig => ({
  op: "ADD",
  showPictures: true,
  instruction: PICTURE_SUM_INSTRUCTIONS.ADD,
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
  const subtract = config.op === "SUBTRACT";

  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_PICTURE_SUM"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <ChoiceChips<PictureSumConfig["op"]>
              label="Sum type"
              value={config.op}
              onChange={(op) => {
                const instruction = followMode(instructionText || config.instruction, PICTURE_SUM_INSTRUCTIONS, op);
                onChange({ ...config, op, instruction, rows: op === "SUBTRACT" ? config.rows.map((r) => ({ ...r, a: Math.max(1, r.a), b: Math.min(r.b, Math.max(1, r.a)) })) : config.rows });
                onInstructionChange(instruction);
              }}
              options={[
                { value: "ADD", label: "+ Addition" },
                { value: "SUBTRACT", label: "− Subtraction" },
              ]}
            />
            <RowList<PictureSumRow>
              label="Sums"
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => ({ a: 2, b: 1, clipartId: "apple" })}
              max={8}
              addLabel="Add sum"
              renderRow={(r, update) => (
                <div className="flex items-start gap-2">
                  <PictureChip clipartId={r.clipartId} onPick={(id) => update({ ...r, clipartId: id })} />
                  <div className="flex-1 space-y-1">
                    <NumberStepper label="First" value={r.a} min={subtract ? 1 : 0} max={10} onChange={(n) => update({ ...r, a: n, b: subtract ? Math.min(r.b, n) : r.b })} />
                    <NumberStepper label={subtract ? "Take away" : "Second"} value={r.b} min={0} max={subtract ? r.a : 10} onChange={(n) => update({ ...r, b: n })} />
                    <p className="text-right text-xs font-bold text-slate-500">Answer: {subtract ? r.a - r.b : r.a + r.b}</p>
                  </div>
                </div>
              )}
            />
          </>
        }
        advanced={
          <ToggleRow label="Show pictures under the numbers" checked={config.showPictures} onChange={(showPictures) => onChange({ ...config, showPictures })} />
        }
      />
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
  halfWidth: (config) => !config.showPictures || config.rows.every((row) => row.a + row.b <= 4),
  getSummary: (c) => `${c.op === "ADD" ? "Addition" : "Subtraction"} · ${c.rows.length} sums`,
};
