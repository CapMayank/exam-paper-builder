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
  TALLEST_SHORTEST: "Write T for tallest, S for shortest",
};

/** Instruction printed by default; the T/S mode needs a longer one than its chip label. */
export const modeInstruction = (m: CompareMode) =>
  m === "TALLEST_SHORTEST" ? "Write (T) for the tallest and (S) for the shortest:" : MODE_LABEL[m] + ":";

const TS_DEFAULT_SIZES = [2, 5, 3];

/** Heights of the pictures in a T/S row; old rows only have left/right. */
export const rowSizes = (row: CompareRow): number[] => (row.sizes && row.sizes.length > 0 ? row.sizes : [row.left, row.right]);

/** Index of the tallest and shortest picture, or -1 where two pictures tie for it. */
export function tallestShortest(sizes: number[]): { tallest: number; shortest: number } {
  const max = Math.max(...sizes);
  const min = Math.min(...sizes);
  const at = (v: number) => (sizes.filter((x) => x === v).length === 1 ? sizes.indexOf(v) : -1);
  return { tallest: at(max), shortest: at(min) };
}

export function validateCompare(c: CompareConfig): { valid: boolean; error?: string } {
  if (!c || !Array.isArray(c.rows) || c.rows.length === 0) return { valid: false, error: "Add at least one pair" };
  if (c.mode === "TALLEST_SHORTEST") {
    for (const r of c.rows) {
      const sizes = rowSizes(r);
      const { tallest, shortest } = tallestShortest(sizes);
      if (sizes.length < 2 || tallest < 0 || shortest < 0 || tallest === shortest) {
        return { valid: false, error: "Each group needs one clearly tallest and one clearly shortest picture" };
      }
    }
  }
  return { valid: true };
}

const isCount = (m: CompareMode) => m === "MORE" || m === "FEWER";

export const compareDefaultConfig = (): CompareConfig => ({
  mode: "BIGGER",
  instruction: modeInstruction("BIGGER"),
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

/** One T/S group: pictures bottom-aligned at their heights, a small box under each. */
function HeightGroup({ row, showKey }: { row: CompareRow; showKey?: boolean }) {
  const sizes = rowSizes(row);
  const { tallest, shortest } = tallestShortest(sizes);
  return (
    <div className="flex items-end gap-2 rounded-lg border-2 border-slate-300 px-3 py-2">
      {sizes.map((v, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <span className="flex items-end" style={{ height: 96 }}>
            <Art id={row.clipartId} size={24 + v * 14} />
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-sm border-2 border-slate-800 bg-white text-base font-black text-emerald-700">
            {showKey ? (i === tallest ? "T" : i === shortest ? "S" : "") : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function CompareEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<CompareConfig>) {
  const counting = isCount(config.mode);
  const heights = config.mode === "TALLEST_SHORTEST";

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
                  instruction: modeInstruction(mode),
                  rows: config.rows.map((r) => ({
                    ...r,
                    left: Math.min(r.left, cap),
                    right: Math.min(r.right, cap),
                    ...(mode === "TALLEST_SHORTEST" && !r.sizes?.length ? { sizes: [...TS_DEFAULT_SIZES] } : {}),
                  })),
                });
                onInstructionChange(modeInstruction(mode));
              }}
              options={(Object.keys(MODE_LABEL) as CompareMode[]).map((m) => ({ value: m, label: MODE_LABEL[m] }))}
            />
            <RowList<CompareRow>
              label={heights ? "Groups — height 1 (short) to 5 (tall) for each picture" : counting ? "Pairs — pictures on each side" : "Pairs — size 1 (small) to 5 (big)"}
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => (heights ? { clipartId: "ball", left: 2, right: 5, sizes: [...TS_DEFAULT_SIZES] } : { clipartId: "ball", left: 2, right: 4 })}
              max={6}
              addLabel={heights ? "Add group" : "Add pair"}
              renderRow={(r, update) =>
                heights ? (
                  <div className="flex items-start gap-2">
                    <PictureChip clipartId={r.clipartId} onPick={(id) => update({ ...r, clipartId: id })} />
                    <div className="flex-1 space-y-1">
                      {rowSizes(r).map((v, i, arr) => (
                        <NumberStepper
                          key={i}
                          label={`Picture ${i + 1}`}
                          value={v}
                          min={1}
                          max={5}
                          onChange={(n) => update({ ...r, sizes: arr.map((x, j) => (j === i ? n : x)) })}
                        />
                      ))}
                      <div className="flex gap-2">
                        {rowSizes(r).length < 5 && (
                          <button type="button" className="btn btn-sm" onClick={() => update({ ...r, sizes: [...rowSizes(r), 3] })}>
                            Add picture
                          </button>
                        )}
                        {rowSizes(r).length > 3 && (
                          <button type="button" className="btn btn-sm" onClick={() => update({ ...r, sizes: rowSizes(r).slice(0, -1) })}>
                            Remove picture
                          </button>
                        )}
                      </div>
                      {!validateCompare({ ...config, rows: [r] }).valid && (
                        <p className="text-[11px] font-semibold text-amber-700">Two pictures tie for tallest or shortest</p>
                      )}
                    </div>
                  </div>
                ) : (
                <div className="flex items-start gap-2">
                  <PictureChip clipartId={r.clipartId} onPick={(id) => update({ ...r, clipartId: id })} />
                  <div className="flex-1 space-y-1">
                    <NumberStepper label="Left" value={r.left} min={1} max={counting ? 10 : 5} onChange={(n) => update({ ...r, left: n })} />
                    <NumberStepper label="Right" value={r.right} min={1} max={counting ? 10 : 5} onChange={(n) => update({ ...r, right: n })} />
                    {r.left === r.right && <p className="text-[11px] font-semibold text-amber-700">Both equal – no right answer</p>}
                  </div>
                </div>
                )
              }
            />
          </>
        }
      />
      <PreviewBox>
        <ComparePrint config={config} instructionText={instructionText} showKey />
      </PreviewBox>
    </div>
  );
}

function ComparePrint({ config, instructionText, numberLabel, marks, showKey }: KindergartenPrintProps<CompareConfig> & { showKey?: boolean }) {
  if (config.mode === "TALLEST_SHORTEST") {
    return (
      <ActivityFrame numberLabel={numberLabel} marks={marks} instruction={instructionText || config.instruction}>
        <div className="flex flex-wrap items-end gap-3 py-1">
          {config.rows.map((r, i) => (
            <HeightGroup key={i} row={r} showKey={showKey} />
          ))}
        </div>
      </ActivityFrame>
    );
  }
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
    return validateCompare(cfg as CompareConfig);
  },
  renderEditor: CompareEditor,
  renderPrint: ComparePrint,
  // two pairs side by side fit; counting modes stay small enough to see
  halfWidth: (config) => config.mode !== "TALLEST_SHORTEST" && config.rows.length <= 2 && (!["MORE", "FEWER"].includes(config.mode) || config.rows.every((r) => Math.max(r.left, r.right) <= 3)),
  getSummary: (c) => `${MODE_LABEL[c.mode]} · ${c.rows.length} ${c.mode === "TALLEST_SHORTEST" ? "groups" : "pairs"}`,
};
