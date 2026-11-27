"use client";

import { PreviewBox } from "./_shared";
import React from "react";
import { TraceWriteLines } from "../components/FourLineGuide";
import type {
  KindergartenActivityPlugin,
  KindergartenEditorProps,
  KindergartenPrintProps,
  RulingType,
  TraceWriteConfig,
} from "../types";

export const traceWriteDefaultConfig = (subject?: string): TraceWriteConfig => {
  const isHindi = subject?.toLowerCase().includes("hindi");
  return {
    rulingType: isHindi ? "TWO_LINE" : "FOUR_LINE",
    fontSizePt: 24,
    instruction: isHindi
      ? "सुंदर अक्षरों में लिखिए (Copy in neat handwriting):"
      : "Trace and copy the letters neatly (4-line ruling):",
    lines: [
      {
        promptText: isHindi ? "अ  आ  इ  ई  उ  ऊ" : "A  B  C  D  E  F",
        traceDotted: false,
        repeatCount: 2,
      },
    ],
  };
};

function TraceWriteEditor({
  config,
  onChange,
  instructionText,
  onInstructionChange,
}: KindergartenEditorProps<TraceWriteConfig>) {
  const line = config.lines?.[0] || {
    promptText: "A B C D",
    traceDotted: false,
    repeatCount: 2,
  };

  const updateLine = (patch: Partial<typeof line>) => {
    // only the first line is edited here; keep any further lines an imported paper brought with it
    onChange({
      ...config,
      lines: [{ ...line, ...patch }, ...(config.lines ?? []).slice(1)],
    });
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
          Activity Instruction / Prompt
        </label>
        <input
          type="text"
          value={instructionText}
          onChange={(e) => onInstructionChange(e.target.value)}
          placeholder="e.g. Write letters A to Z in 4-line guide"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Ruling Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Guide Ruling</label>
          <select
            value={config.rulingType}
            onChange={(e) => onChange({ ...config, rulingType: e.target.value as RulingType })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="FOUR_LINE">4-Line English (Red/Blue/Red)</option>
            <option value="TWO_LINE">2-Line Hindi Ruling</option>
            <option value="SINGLE_LINE">Single Line</option>
            <option value="BOXES">Letter Write-in Boxes</option>
          </select>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Letter Size</label>
          <select
            value={config.fontSizePt}
            onChange={(e) => onChange({ ...config, fontSizePt: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value={20}>Small (UKG, ~6 mm lines)</option>
            <option value={24}>Medium (LKG, ~7.5 mm lines)</option>
            <option value={32}>Large (Nursery, ~10 mm lines)</option>
          </select>
        </div>

        {/* Repeat lines */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1" title="Rows in total, counting the row with the letters">Writing Lines</label>
          <input
            type="number"
            min={1}
            max={6}
            value={line.repeatCount}
            onChange={(e) => updateLine({ repeatCount: Math.max(1, Number(e.target.value)) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
        </div>
      </div>

      {/* Letters / Words input */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
          Letters / Words to Copy or Trace
        </label>
        <input
          type="text"
          value={line.promptText}
          onChange={(e) => updateLine({ promptText: e.target.value })}
          placeholder="e.g. A  B  C  D  E  or  Apple  Ball  Cat"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold tracking-wider text-slate-900"
        />
        <div className="flex items-center gap-4 mt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={line.traceDotted}
              onChange={(e) => updateLine({ traceDotted: e.target.checked })}
              className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Dotted Tracing Style (Lighter letters for student to trace over)</span>
          </label>
        </div>
      </div>

      {(config.lines?.length ?? 0) > 1 && (
        <p className="text-[11px] text-slate-500">
          This activity has {config.lines.length} lines of letters; the editor changes the first one.
        </p>
      )}
      <PreviewBox>
        <TraceWriteLines rulingType={config.rulingType} fontSizePt={config.fontSizePt} lines={Array.isArray(config.lines) ? config.lines : []} />
      </PreviewBox>
    </div>
  );
}

function TraceWritePrint({
  config,
  instructionText,
  numberLabel,
  marks,
}: KindergartenPrintProps<TraceWriteConfig>) {
  return (
    <div className="my-2 border-2 border-slate-800 rounded-xl p-3 bg-white">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-start gap-2">
          {numberLabel && (
            <span className="font-black text-base text-slate-950 min-w-6">{numberLabel}</span>
          )}
          <span className="font-bold text-sm text-slate-900 leading-snug">
            {instructionText || config.instruction}
          </span>
        </div>
        {marks !== undefined && (
          <span className="font-black text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-sm shrink-0">
            [{marks} {marks === 1 ? "Mark" : "Marks"}]
          </span>
        )}
      </div>

      <TraceWriteLines rulingType={config.rulingType} fontSizePt={config.fontSizePt} lines={Array.isArray(config.lines) ? config.lines : []} />
    </div>
  );
}

export const traceWritePlugin: KindergartenActivityPlugin<TraceWriteConfig> = {
  type: "KDG_TRACE_WRITE",
  label: "Letter & Word Tracing / 4-Line Writing",
  shortLabel: "Trace & Write",
  category: "english",
  description: "4-line English or 2-line Hindi guide with dotted tracing letters or blank lines.",
  iconName: "PenTool",
  defaultConfig: traceWriteDefaultConfig,
  validateConfig: (cfg) => {
    if (!cfg || typeof cfg !== "object") return { valid: false, error: "Invalid config" };
    return { valid: true };
  },
  renderEditor: TraceWriteEditor,
  renderPrint: TraceWritePrint,
  getSummary: (config) => {
    const text = config.lines?.[0]?.promptText || "Writing guide";
    const kind = { FOUR_LINE: "4-Line", TWO_LINE: "2-Line", SINGLE_LINE: "1-Line", BOXES: "Boxes" }[config.rulingType] ?? "4-Line";
    const more = (config.lines?.length ?? 0) > 1 ? ` (+${config.lines.length - 1} more)` : "";
    return `${kind}: ${text}${more}`;
  },
};
