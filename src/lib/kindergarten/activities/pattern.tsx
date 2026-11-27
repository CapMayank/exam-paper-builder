"use client";

import { EditorShell, InstructionField, NumberStepper, PictureChip, RowList } from "../editor-kit";

import React from "react";
import { X } from "lucide-react";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps, PatternConfig, PatternRow } from "../types";
import { ActivityFrame, Art, PreviewBox, SHAPE_IDS, ShapeGlyph } from "./_shared";

export const patternDefaultConfig = (): PatternConfig => ({
  instruction: "Look at the pattern and draw what comes next:",
  rows: [
    { unit: ["circle", "square"], repeats: 3, blanksAtEnd: 2 },
    { unit: ["star", "star", "heart"], repeats: 2, blanksAtEnd: 2 },
    { unit: ["triangle", "circle"], repeats: 3, blanksAtEnd: 1 },
  ],
});

const isShape = (id: string) => (SHAPE_IDS as readonly string[]).includes(id);

function Glyph({ id, size }: { id: string; size: number }) {
  return isShape(id) ? <ShapeGlyph id={id} size={size} /> : <Art id={id} size={size} />;
}

/** Expands a row into its drawn sequence; `null` marks a blank the child completes. */
export function expandPattern(row: PatternRow): (string | null)[] {
  const unit = row.unit.length ? row.unit : ["circle"];
  const total = unit.length * Math.max(1, row.repeats);
  const seq: (string | null)[] = Array.from({ length: total }, (_, i) => unit[i % unit.length]);
  const blanks = Math.min(Math.max(0, row.blanksAtEnd), total - 1);
  for (let i = 0; i < blanks; i++) seq[total - 1 - i] = null;
  return seq;
}

function TokenPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <select
        value={isShape(value) ? value : ""}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="h-11 rounded-lg border border-slate-300 bg-white px-1.5 text-xs"
        aria-label="Shape"
      >
        <option value="">Shape…</option>
        {SHAPE_IDS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <PictureChip clipartId={isShape(value) ? undefined : value} onPick={onChange} size={24} label="Picture" />
    </div>
  );
}

function PatternEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<PatternConfig>) {
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_PATTERN"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <RowList<PatternRow>
              label="Pattern rows — pick the repeating shapes"
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => ({ unit: ["circle", "star"], repeats: 3, blanksAtEnd: 2 })}
              max={6}
              addLabel="Add pattern row"
              renderRow={(row, update) => (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {row.unit.map((u, k) => (
                      <div key={k} className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1">
                        <Glyph id={u} size={22} />
                        <TokenPicker value={u} onChange={(v) => update({ ...row, unit: row.unit.map((x, m) => (m === k ? v : x)) })} />
                        {row.unit.length > 1 && (
                          <button
                            type="button"
                            aria-label="Remove from pattern"
                            onClick={() => update({ ...row, unit: row.unit.filter((_, m) => m !== k) })}
                            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                    {row.unit.length < 4 && (
                      <button type="button" onClick={() => update({ ...row, unit: [...row.unit, "circle"] })} className="rounded-lg border border-dashed border-indigo-300 px-2 py-1 text-xs font-semibold text-indigo-700">
                        + Shape
                      </button>
                    )}
                  </div>
                  <NumberStepper label="Repeats" value={row.repeats} min={2} max={6} onChange={(n) => update({ ...row, repeats: n })} />
                  <NumberStepper label="Left blank at the end" value={row.blanksAtEnd} min={1} max={4} onChange={(n) => update({ ...row, blanksAtEnd: n })} />
                </div>
              )}
            />
          </>
        }
      />
      <PreviewBox>
        <PatternPrint config={config} instructionText={instructionText} />
      </PreviewBox>
    </div>
  );
}

function PatternPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<PatternConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} marks={marks} instruction={instructionText || config.instruction}>
      <div className="space-y-3 py-1">
        {config.rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            {expandPattern(row).map((id, k) =>
              id ? (
                <span key={k} className="inline-flex h-11 w-11 items-center justify-center">
                  <Glyph id={id} size={38} />
                </span>
              ) : (
                <span key={k} className="inline-block h-11 w-11 rounded-md border-2 border-dashed border-slate-500" />
              ),
            )}
          </div>
        ))}
      </div>
    </ActivityFrame>
  );
}

export const patternPlugin: KindergartenActivityPlugin<PatternConfig> = {
  type: "KDG_PATTERN",
  label: "Complete the Pattern",
  shortLabel: "Patterns",
  category: "math",
  description: "Repeating shape or picture patterns where the child draws what comes next.",
  iconName: "Shapes",
  defaultConfig: patternDefaultConfig,
  validateConfig: (cfg) => {
    const c = cfg as PatternConfig;
    if (!c || !Array.isArray(c.rows) || c.rows.length === 0) return { valid: false, error: "Add at least one pattern row" };
    return { valid: true };
  },
  renderEditor: PatternEditor,
  renderPrint: PatternPrint,
  halfWidth: (config) => config.rows.every((row) => expandPattern(row).length <= 6),
  getSummary: (c) => `${c.rows.length} pattern rows`,
};
