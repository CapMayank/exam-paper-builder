"use client";

import React from "react";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps, PreWritingConfig, PreWritingStroke } from "../types";
import { ActivityFrame, AddRowButton, EditorSection, InstructionField, PreviewBox, RemoveButton } from "./_shared";

export const STROKE_LABEL: Record<PreWritingStroke, string> = {
  STANDING: "Standing lines | | |",
  SLEEPING: "Sleeping lines ― ― ―",
  SLANTING_RIGHT: "Slanting lines / / /",
  SLANTING_LEFT: "Slanting lines \\ \\ \\",
  ZIGZAG: "Zig-zag",
  CURVES: "Curves",
  WAVES: "Waves",
  LOOPS: "Loops",
  CIRCLES: "Circles",
  STEPS: "Steps",
};

/** SVG path for one practice row, 600 wide x 44 tall. */
export function strokePath(stroke: PreWritingStroke): string {
  const parts: string[] = [];
  switch (stroke) {
    case "STANDING":
      for (let i = 0; i < 24; i++) parts.push(`M${15 + i * 24} 6 L${15 + i * 24} 38`);
      break;
    case "SLEEPING":
      for (let i = 0; i < 4; i++) parts.push(`M10 ${8 + i * 10} L590 ${8 + i * 10}`);
      break;
    case "SLANTING_RIGHT":
      for (let i = 0; i < 24; i++) parts.push(`M${10 + i * 24} 38 L${24 + i * 24} 6`);
      break;
    case "SLANTING_LEFT":
      for (let i = 0; i < 24; i++) parts.push(`M${24 + i * 24} 38 L${10 + i * 24} 6`);
      break;
    case "ZIGZAG": {
      let d = "M8 38";
      for (let i = 0; i < 24; i++) d += ` L${8 + (i + 1) * 24} ${i % 2 === 0 ? 6 : 38}`;
      parts.push(d);
      break;
    }
    case "CURVES": {
      let d = "M8 38";
      for (let i = 0; i < 12; i++) d += ` q 24 -64 48 0`;
      parts.push(d);
      break;
    }
    case "WAVES": {
      let d = "M8 22";
      for (let i = 0; i < 12; i++) d += ` q 12 -26 24 0 q 12 26 24 0`;
      parts.push(d);
      break;
    }
    case "LOOPS": {
      let d = "M10 30";
      for (let i = 0; i < 12; i++) d += ` c 18 -34 38 -34 24 -4 c -8 16 -22 12 -2 -6 `;
      parts.push(d);
      break;
    }
    case "CIRCLES":
      for (let i = 0; i < 16; i++) parts.push(`M${34 + i * 36} 22 m -15 0 a 15 15 0 1 0 30 0 a 15 15 0 1 0 -30 0`);
      break;
    case "STEPS": {
      let d = "M8 38";
      for (let i = 0; i < 20; i++) d += ` l 14 0 l 0 ${i % 2 === 0 ? -16 : 16}`;
      parts.push(d);
      break;
    }
  }
  return parts.join(" ");
}

export const preWritingDefaultConfig = (): PreWritingConfig => ({
  instruction: "Trace over the dotted lines with your pencil:",
  rows: [{ stroke: "STANDING" }, { stroke: "SLEEPING" }, { stroke: "SLANTING_RIGHT" }, { stroke: "ZIGZAG" }, { stroke: "CURVES" }],
});

function PreWritingEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<PreWritingConfig>) {
  return (
    <div className="space-y-4">
      <InstructionField value={instructionText} onChange={onInstructionChange} placeholder="e.g. Trace the dotted lines" />

      <EditorSection title="Stroke practice rows" hint="One dotted row per line">
        <div className="space-y-2">
          {config.rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
              <select
                aria-label={`Row ${i + 1} stroke`}
                value={r.stroke}
                onChange={(e) => onChange({ ...config, rows: config.rows.map((x, j) => (j === i ? { stroke: e.target.value as PreWritingStroke } : x)) })}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              >
                {(Object.keys(STROKE_LABEL) as PreWritingStroke[]).map((s) => (
                  <option key={s} value={s}>
                    {STROKE_LABEL[s]}
                  </option>
                ))}
              </select>
              <RemoveButton label="Remove row" onClick={() => onChange({ ...config, rows: config.rows.filter((_, j) => j !== i) })} />
            </div>
          ))}
          {config.rows.length < 8 && <AddRowButton onClick={() => onChange({ ...config, rows: [...config.rows, { stroke: "WAVES" }] })}>Add row</AddRowButton>}
        </div>
      </EditorSection>

      <PreviewBox>
        <PreWritingPrint config={config} instructionText={instructionText} />
      </PreviewBox>
    </div>
  );
}

function PreWritingPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<PreWritingConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} marks={marks} instruction={instructionText || config.instruction}>
      <div className="space-y-2 py-1">
        {config.rows.map((r, i) => (
          <svg key={i} viewBox="0 0 600 44" className="h-12 w-full rounded-md border border-slate-200" role="img" aria-label={STROKE_LABEL[r.stroke]}>
            <path d={strokePath(r.stroke)} fill="none" stroke="#475569" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 6" />
            <circle cx={r.stroke === "SLEEPING" ? 10 : 12} cy={r.stroke === "SLEEPING" ? 8 : 38} r={3} fill="#0f172a" />
          </svg>
        ))}
      </div>
    </ActivityFrame>
  );
}

export const preWritingPlugin: KindergartenActivityPlugin<PreWritingConfig> = {
  type: "KDG_PREWRITING",
  label: "Pre-Writing Strokes (lines, curves, zig-zag)",
  shortLabel: "Pre-Writing",
  category: "general",
  description: "Dotted standing, sleeping, slanting, zig-zag and curve lines for pencil-control practice.",
  iconName: "Pencil",
  defaultConfig: preWritingDefaultConfig,
  validateConfig: (cfg) => {
    const c = cfg as PreWritingConfig;
    if (!c || !Array.isArray(c.rows) || c.rows.length === 0) return { valid: false, error: "Add at least one row" };
    return { valid: true };
  },
  renderEditor: PreWritingEditor,
  renderPrint: PreWritingPrint,
  getSummary: (c) => `${c.rows.length} stroke rows`,
};
