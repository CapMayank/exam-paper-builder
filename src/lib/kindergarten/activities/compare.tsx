"use client";

import { ChoiceChips, EditorShell, InstructionField, NumberStepper, PictureChip, RowList } from "../editor-kit";

import React from "react";
import type { CompareConfig, CompareMode, CompareRow, KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, Art, PreviewBox } from "./_shared";

export const MODE_LABEL: Record<CompareMode, string> = {
  BIGGER: "Circle the bigger one",
  SMALLER: "Circle the smaller one",
  TALLER: "Circle the taller one",
  SHORTER: "Circle the shorter one",
  MORE: "Circle the group that has more",
  FEWER: "Circle the group that has fewer",
};

const isCount = (m: CompareMode) => m === "MORE" || m === "FEWER";

export const compareDefaultConfig = (): CompareConfig => ({
  mode: "BIGGER",
  instruction: MODE_LABEL.BIGGER + ":",
  rows: [
    { clipartId: "apple", left: 2, right: 4 },
    { clipartId: "elephant", left: 5, right: 2 },
    { clipartId: "tree", left: 3, right: 1 },
  ],
});

/** Index (0 left / 1 right) of the correct choice, or -1 when both are equal. */
export function correctSide(mode: CompareMode, row: CompareRow): number {
  if (row.left === row.right) return -1;
  const wantsHigh = mode === "BIGGER" || mode === "TALLER" || mode === "MORE";
  return (row.left > row.right) === wantsHigh ? 0 : 1;
}

function Side({ mode, clipartId, value }: { mode: CompareMode; clipartId: string; value: number }) {
  if (isCount(mode)) {
    return (
      <span className="flex max-w-40 flex-wrap items-center justify-center gap-0.5">
        {Array.from({ length: value }, (_, i) => (
          <Art key={i} id={clipartId} size={24} />
        ))}
      </span>
    );
  }
  const base = 24 + value * 12; // step 1..5 -> 36..84px
  const tall = mode === "TALLER" || mode === "SHORTER";
  return (
    <span className="flex items-end justify-center" style={{ height: 92, width: tall ? 60 : 96 }}>
      {tall ? (
        <span style={{ transform: `scaleY(${0.55 + value * 0.2})`, transformOrigin: "bottom" }}>
          <Art id={clipartId} size={56} />
        </span>
      ) : (
        <Art id={clipartId} size={base} />
      )}
    </span>
  );
}

function CompareEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<CompareConfig>) {
  const counting = isCount(config.mode);

  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_COMPARE"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <ChoiceChips<CompareMode>
              label="What to compare"
              value={config.mode}
              onChange={(mode) => {
                const cap = isCount(mode) ? 10 : 5;
                onChange({
                  ...config,
                  mode,
                  instruction: MODE_LABEL[mode] + ":",
                  rows: config.rows.map((r) => ({ ...r, left: Math.min(r.left, cap), right: Math.min(r.right, cap) })),
                });
                onInstructionChange(MODE_LABEL[mode] + ":");
              }}
              options={(Object.keys(MODE_LABEL) as CompareMode[]).map((m) => ({ value: m, label: MODE_LABEL[m] }))}
            />
            <RowList<CompareRow>
              label={counting ? "Pairs — pictures on each side" : "Pairs — size 1 (small) to 5 (big)"}
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => ({ clipartId: "ball", left: 2, right: 4 })}
              max={6}
              addLabel="Add pair"
              renderRow={(r, update) => (
                <div className="flex items-start gap-2">
                  <PictureChip clipartId={r.clipartId} onPick={(id) => update({ ...r, clipartId: id })} />
                  <div className="flex-1 space-y-1">
                    <NumberStepper label="Left" value={r.left} min={1} max={counting ? 10 : 5} onChange={(n) => update({ ...r, left: n })} />
                    <NumberStepper label="Right" value={r.right} min={1} max={counting ? 10 : 5} onChange={(n) => update({ ...r, right: n })} />
                    {r.left === r.right && <p className="text-[11px] font-semibold text-amber-700">Both equal – no right answer</p>}
                  </div>
                </div>
              )}
            />
          </>
        }
      />
      <PreviewBox>
        <ComparePrint config={config} instructionText={instructionText} />
      </PreviewBox>
    </div>
  );
}

function ComparePrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<CompareConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} marks={marks} instruction={instructionText || config.instruction}>
      <div className="grid grid-cols-3 gap-3 py-1">
        {config.rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 gap-1 rounded-lg border-2 border-slate-300">
            <div className="flex items-end justify-center border-r-2 border-slate-300 p-2">
              <Side mode={config.mode} clipartId={r.clipartId} value={r.left} />
            </div>
            <div className="flex items-end justify-center p-2">
              <Side mode={config.mode} clipartId={r.clipartId} value={r.right} />
            </div>
          </div>
        ))}
      </div>
    </ActivityFrame>
  );
}

export const comparePlugin: KindergartenActivityPlugin<CompareConfig> = {
  type: "KDG_COMPARE",
  label: "Compare: Big / Small, Tall / Short, More / Less",
  shortLabel: "Compare",
  category: "math",
  description: "Two pictures or groups side by side – the child circles the bigger, taller or the group with more.",
  iconName: "Scale",
  defaultConfig: compareDefaultConfig,
  validateConfig: (cfg) => {
    const c = cfg as CompareConfig;
    if (!c || !Array.isArray(c.rows) || c.rows.length === 0) return { valid: false, error: "Add at least one pair" };
    return { valid: true };
  },
  renderEditor: CompareEditor,
  renderPrint: ComparePrint,
  getSummary: (c) => `${MODE_LABEL[c.mode]} · ${c.rows.length} pairs`,
};
