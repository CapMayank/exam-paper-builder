"use client";

import { EditorShell, InstructionField, RowList } from "../editor-kit";

import React from "react";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps, PreWritingConfig, PreWritingStroke } from "../types";
import { ActivityFrame, PreviewBox } from "./_shared";

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
      for (let i = 0; i < 24; i++) parts.push(`M${15 + i * 24} 6 L${15 + i * 24} 38`); // top to bottom
      break;
    case "SLEEPING":
      // three lines, far enough apart for a pencil to trace each one
      for (let i = 0; i < 3; i++) parts.push(`M10 ${8 + i * 14} L590 ${8 + i * 14}`);
      break;
    case "SLANTING_RIGHT":
      for (let i = 0; i < 24; i++) parts.push(`M${24 + i * 24} 6 L${10 + i * 24} 38`); // top to bottom
      break;
    case "SLANTING_LEFT":
      for (let i = 0; i < 24; i++) parts.push(`M${10 + i * 24} 6 L${24 + i * 24} 38`); // top to bottom
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
      // a row of joined loops like a run of cursive "l"s, left to right along the bottom
      let d = "M10 36";
      for (let i = 0; i < 18; i++) d += ` c 18 0 26 -28 16 -30 c -10 -2 -8 30 14 30`;
      parts.push(d);
      break;
    }
    case "CIRCLES":
      for (let i = 0; i < 16; i++) parts.push(`M${34 + i * 36} 7 a 15 15 0 1 0 0 30 a 15 15 0 1 0 0 -30`); // anticlockwise from the top, like "o";
      break;
    case "STEPS": {
      let d = "M8 38";
      for (let i = 0; i < 41; i++) d += ` l 14 0 l 0 ${i % 2 === 0 ? -24 : 24}`;
      parts.push(d);
      break;
    }
  }
  return parts.join(" ");
}

/** Where each separate stroke begins (every "M x y" in the path). */
export function strokeStarts(d: string): [number, number][] {
  return Array.from(d.matchAll(/M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/g), (m) => [Number(m[1]), Number(m[2])] as [number, number]);
}

export const preWritingDefaultConfig = (): PreWritingConfig => ({
  instruction: "Trace over the dotted lines with your pencil:",
  rows: [{ stroke: "STANDING" }, { stroke: "SLEEPING" }, { stroke: "SLANTING_RIGHT" }, { stroke: "ZIGZAG" }, { stroke: "CURVES" }],
});

function PreWritingEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<PreWritingConfig>) {
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_PREWRITING"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <RowList<{ stroke: PreWritingStroke }>
              label="Stroke rows (one dotted row each)"
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => ({ stroke: "WAVES" })}
              max={8}
              addLabel="Add row"
              renderRow={(r, update) => (
                <select
                  aria-label="Stroke"
                  value={r.stroke}
                  onChange={(e) => update({ stroke: e.target.value as PreWritingStroke })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                >
                  {(Object.keys(STROKE_LABEL) as PreWritingStroke[]).map((s) => (
                    <option key={s} value={s}>
                      {STROKE_LABEL[s]}
                    </option>
                  ))}
                </select>
              )}
            />
          </>
        }
      />
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
            {/* a start dot on every stroke, exactly where the pencil begins */}
            {strokeStarts(strokePath(r.stroke)).map(([x, y], k) => (
              <circle key={k} cx={x} cy={y} r={3} fill="#0f172a" />
            ))}
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
