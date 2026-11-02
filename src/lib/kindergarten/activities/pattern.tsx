"use client";

import React from "react";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps, PatternConfig, PatternRow } from "../types";
import {
  ActivityFrame,
  AddRowButton,
  Art,
  ClipartChip,
  EditorSection,
  InstructionField,
  PreviewBox,
  RemoveButton,
  SHAPE_IDS,
  ShapeGlyph,
  Stepper,
} from "./_shared";

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
      <ClipartChip clipartId={isShape(value) ? undefined : value} onPick={onChange} size={24} label="Picture" />
    </div>
  );
}

function PatternEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<PatternConfig>) {
  const setRow = (i: number, patch: Partial<PatternRow>) =>
    onChange({ ...config, rows: config.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  return (
    <div className="space-y-4">
      <InstructionField value={instructionText} onChange={onInstructionChange} placeholder="e.g. Complete the pattern" />

      <EditorSection title="Pattern rows" hint="Pick the repeating shapes or pictures, then how many times and how many to leave blank">
        <div className="space-y-2">
          {config.rows.map((row, i) => (
            <div key={i} className="space-y-2 rounded-lg bg-slate-50 p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Unit</span>
                {row.unit.map((u, k) => (
                  <div key={k} className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1">
                    <Glyph id={u} size={22} />
                    <TokenPicker value={u} onChange={(v) => setRow(i, { unit: row.unit.map((x, m) => (m === k ? v : x)) })} />
                    {row.unit.length > 1 && (
                      <RemoveButton label="Remove from unit" onClick={() => setRow(i, { unit: row.unit.filter((_, m) => m !== k) })} />
                    )}
                  </div>
                ))}
                {row.unit.length < 4 && (
                  <AddRowButton onClick={() => setRow(i, { unit: [...row.unit, "circle"] })}>Add</AddRowButton>
                )}
                <RemoveButton
                  label="Remove row"
                  onClick={() => onChange({ ...config, rows: config.rows.filter((_, j) => j !== i) })}
                />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Stepper label="Repeats" value={row.repeats} min={2} max={6} onChange={(n) => setRow(i, { repeats: n })} />
                <Stepper label="Blanks" value={row.blanksAtEnd} min={1} max={4} onChange={(n) => setRow(i, { blanksAtEnd: n })} />
              </div>
            </div>
          ))}
          {config.rows.length < 6 && (
            <AddRowButton onClick={() => onChange({ ...config, rows: [...config.rows, { unit: ["circle", "star"], repeats: 3, blanksAtEnd: 2 }] })}>
              Add pattern row
            </AddRowButton>
          )}
        </div>
      </EditorSection>

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
  getSummary: (c) => `${c.rows.length} pattern rows`,
};
