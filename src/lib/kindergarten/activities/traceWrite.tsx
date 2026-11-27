"use client";

import { ChoiceChips, EditorShell, InstructionField, NumberStepper, TextListField, ToggleRow, joinPrompt, splitPrompt } from "../editor-kit";

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

function TraceWriteEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<TraceWriteConfig>) {
  const line = config.lines?.[0] || { promptText: "A B C D", traceDotted: false, repeatCount: 2 };

  // only the first line is edited here; keep any further lines an imported paper brought with it
  const updateLine = (patch: Partial<typeof line>) =>
    onChange({ ...config, lines: [{ ...line, ...patch }, ...(config.lines ?? []).slice(1)] });

  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_TRACE_WRITE"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <TextListField
              label="Letters or words to copy"
              values={splitPrompt(line.promptText)}
              onChange={(v) => updateLine({ promptText: joinPrompt(v) })}
              placeholder="A B C or Apple Ball"
            />
            <NumberStepper label="Writing rows" value={line.repeatCount} min={1} max={6} onChange={(n) => updateLine({ repeatCount: n })} />
          </>
        }
        advanced={
          <>
            <ChoiceChips<RulingType>
              label="Ruling"
              value={config.rulingType}
              onChange={(rulingType) => onChange({ ...config, rulingType })}
              options={[
                { value: "FOUR_LINE", label: "4-line English" },
                { value: "TWO_LINE", label: "2-line Hindi" },
                { value: "SINGLE_LINE", label: "Single line" },
                { value: "BOXES", label: "Boxes" },
              ]}
            />
            <ChoiceChips<number>
              label="Letter size"
              value={config.fontSizePt}
              onChange={(fontSizePt) => onChange({ ...config, fontSizePt })}
              options={[
                { value: 20, label: "Small (UKG)" },
                { value: 24, label: "Medium (LKG)" },
                { value: 32, label: "Large (Nursery)" },
              ]}
            />
            <ToggleRow label="Dotted letters to trace" hint="Lighter letters the child writes over" checked={line.traceDotted} onChange={(traceDotted) => updateLine({ traceDotted })} />
            {(config.lines?.length ?? 0) > 1 && (
              <p className="text-[11px] text-slate-500">This activity has {config.lines.length} lines of letters; the editor changes the first one.</p>
            )}
          </>
        }
      />
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
