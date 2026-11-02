"use client";

import React from "react";
import type { JoinDotsConfig, JoinDotsShape, KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, EditorSection, InstructionField, PreviewBox, Stepper } from "./_shared";

/** Outline of each shape on a 200 x 150 canvas. */
const OUTLINES: Record<JoinDotsShape, [number, number][]> = {
  TRIANGLE: [[100, 15], [185, 135], [15, 135], [100, 15]],
  SQUARE: [[40, 20], [160, 20], [160, 130], [40, 130], [40, 20]],
  STAR: [[100, 10], [122, 55], [172, 60], [135, 93], [147, 140], [100, 115], [53, 140], [65, 93], [28, 60], [78, 55], [100, 10]],
  HOUSE: [[30, 135], [30, 70], [100, 15], [170, 70], [170, 135], [30, 135]],
  STAIRS: [[15, 135], [15, 100], [60, 100], [60, 65], [105, 65], [105, 30], [150, 30], [150, 135], [15, 135]],
  ZIGZAG: [[15, 110], [45, 30], [75, 110], [105, 30], [135, 110], [165, 30], [190, 110]],
  CIRCLE: [],
};

export const SHAPE_NAMES: Record<JoinDotsShape, string> = {
  TRIANGLE: "Triangle",
  SQUARE: "Square",
  STAR: "Star",
  HOUSE: "House",
  STAIRS: "Stairs",
  ZIGZAG: "Zig-zag",
  CIRCLE: "Circle",
};

/** `count` points spread evenly along the outline (closed shapes do not repeat the first point). */
export function dotPoints(shape: JoinDotsShape, count: number): { x: number; y: number }[] {
  const n = Math.max(3, Math.min(26, Math.round(count)));
  if (shape === "CIRCLE") {
    return Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return { x: 100 + 65 * Math.cos(a), y: 75 + 60 * Math.sin(a) };
    });
  }
  const path = OUTLINES[shape];
  const closed = path[0][0] === path[path.length - 1][0] && path[0][1] === path[path.length - 1][1];
  const corners = closed ? path.slice(0, -1) : path;
  const edges = closed ? corners.length : corners.length - 1;
  const edgeLen = (i: number) => {
    const p = corners[i];
    const q = corners[(i + 1) % corners.length];
    return Math.hypot(q[0] - p[0], q[1] - p[1]);
  };

  // Enough dots: every corner gets one, the rest are shared out along the longest edges.
  if (n >= corners.length) {
    const extra = n - corners.length;
    const lens = Array.from({ length: edges }, (_, i) => edgeLen(i));
    const total = lens.reduce((a, b) => a + b, 0);
    const raw = lens.map((l) => (l / total) * extra);
    const add = raw.map(Math.floor);
    let left = extra - add.reduce((a, b) => a + b, 0);
    raw
      .map((r, i) => ({ i, frac: r - Math.floor(r) }))
      .sort((x, y) => y.frac - x.frac)
      .forEach(({ i }) => {
        if (left > 0) {
          add[i]++;
          left--;
        }
      });
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < edges; i++) {
      const p = corners[i];
      const q = corners[(i + 1) % corners.length];
      for (let k = 0; k <= add[i]; k++) {
        const t = k / (add[i] + 1);
        pts.push({ x: p[0] + (q[0] - p[0]) * t, y: p[1] + (q[1] - p[1]) * t });
      }
    }
    if (!closed) pts.push({ x: corners[corners.length - 1][0], y: corners[corners.length - 1][1] });
    return pts;
  }

  // Fewer dots than corners: spread them evenly along the outline.
  const seg = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  const gaps = closed ? n : n - 1;
  return Array.from({ length: n }, (_, k) => {
    let d = (k * total) / gaps;
    let i = 0;
    while (i < seg.length - 1 && d > seg[i]) {
      d -= seg[i];
      i++;
    }
    const t = seg[i] ? d / seg[i] : 0;
    return { x: path[i][0] + (path[i + 1][0] - path[i][0]) * t, y: path[i][1] + (path[i + 1][1] - path[i][1]) * t };
  });
}

export const joinDotsDefaultConfig = (): JoinDotsConfig => ({
  shape: "STAR",
  labels: "NUMBERS",
  count: 10,
  instruction: "Join the dots in order from 1 and see the picture:",
});

export function dotLabel(i: number, labels: JoinDotsConfig["labels"]): string {
  return labels === "LETTERS" ? String.fromCharCode(65 + i) : String(i + 1);
}

function DotsFigure({ config }: { config: JoinDotsConfig }) {
  const pts = dotPoints(config.shape, config.count);
  const cx = 100;
  const cy = 75;
  return (
    <svg viewBox="-12 -18 224 186" className="h-48 w-full max-w-80" role="img" aria-label="Dot to dot">
      {pts.map((p, i) => {
        // Put the label on the outside of the shape so it never sits on the line.
        const dx = p.x - cx;
        const dy = p.y - cy;
        const len = Math.hypot(dx, dy) || 1;
        const lx = p.x + (dx / len) * 11;
        const ly = p.y + (dy / len) * 11 + 4;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={2.6} fill="#0f172a" />
            <text x={lx} y={ly} textAnchor="middle" fontSize={10} fontWeight={700} fill="#0f172a">
              {dotLabel(i, config.labels)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function JoinDotsEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<JoinDotsConfig>) {
  return (
    <div className="space-y-4">
      <InstructionField value={instructionText} onChange={onInstructionChange} placeholder="e.g. Join the dots from 1 to 10" />

      <EditorSection title="Shape">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(SHAPE_NAMES) as JoinDotsShape[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ ...config, shape: s })}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                config.shape === s ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {SHAPE_NAMES[s]}
            </button>
          ))}
        </div>
      </EditorSection>

      <div className="flex flex-wrap items-center gap-5">
        <Stepper label="Dots" value={config.count} min={4} max={26} onChange={(n) => onChange({ ...config, count: n })} />
        <div className="flex gap-1">
          {(["NUMBERS", "LETTERS"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onChange({ ...config, labels: l })}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                config.labels === l ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {l === "NUMBERS" ? "1, 2, 3…" : "A, B, C…"}
            </button>
          ))}
        </div>
      </div>

      <PreviewBox>
        <JoinDotsPrint config={config} instructionText={instructionText} />
      </PreviewBox>
    </div>
  );
}

function JoinDotsPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<JoinDotsConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} marks={marks} instruction={instructionText || config.instruction}>
      <div className="flex justify-center py-1">
        <DotsFigure config={config} />
      </div>
    </ActivityFrame>
  );
}

export const joinDotsPlugin: KindergartenActivityPlugin<JoinDotsConfig> = {
  type: "KDG_JOIN_DOTS",
  label: "Join the Dots (1, 2, 3 or A, B, C)",
  shortLabel: "Join the Dots",
  category: "general",
  description: "Numbered or lettered dots forming a shape – the child joins them in order.",
  iconName: "PenTool",
  defaultConfig: joinDotsDefaultConfig,
  validateConfig: (cfg) => {
    const c = cfg as JoinDotsConfig;
    if (!c || !c.shape || !(c.count >= 3)) return { valid: false, error: "Choose a shape and number of dots" };
    return { valid: true };
  },
  renderEditor: JoinDotsEditor,
  renderPrint: JoinDotsPrint,
  getSummary: (c) => `${SHAPE_NAMES[c.shape]} · ${c.count} dots`,
};
