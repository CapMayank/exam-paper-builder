"use client";

import React from "react";
import type { ColourConfig, ColourItem, KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import {
  ActivityFrame,
  AddRowButton,
  Art,
  ClipartChip,
  EditorSection,
  InstructionField,
  PreviewBox,
  RemoveButton,
} from "./_shared";

const COLOURS = ["red", "blue", "yellow", "green", "orange", "pink", "purple", "brown", "black"] as const;
const SWATCH: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  yellow: "#facc15",
  green: "#22c55e",
  orange: "#f97316",
  pink: "#ec4899",
  purple: "#a855f7",
  brown: "#92400e",
  black: "#111827",
};

export const colourDefaultConfig = (): ColourConfig => ({
  instruction: "Colour the pictures with the colour given:",
  items: [
    { clipartId: "apple", colour: "red" },
    { clipartId: "sun", colour: "yellow" },
    { clipartId: "tree", colour: "green" },
    { clipartId: "umbrella", colour: "blue" },
  ],
});

function ColourEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<ColourConfig>) {
  const setItem = (i: number, patch: Partial<ColourItem>) =>
    onChange({ ...config, items: config.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });

  return (
    <div className="space-y-4">
      <InstructionField value={instructionText} onChange={onInstructionChange} placeholder="e.g. Colour the apple red" />

      <EditorSection title="Pictures to colour">
        <div className="space-y-2">
          {config.items.map((it, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-2">
              <ClipartChip clipartId={it.clipartId} onPick={(id) => setItem(i, { clipartId: id })} />
              <div className="flex flex-wrap gap-1">
                {COLOURS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    title={c}
                    onClick={() => setItem(i, { colour: c })}
                    className={`h-7 w-7 rounded-full border-2 ${it.colour === c ? "border-slate-900 ring-2 ring-indigo-400" : "border-white"}`}
                    style={{ backgroundColor: SWATCH[c] }}
                  />
                ))}
              </div>
              <span className="text-sm font-bold capitalize text-slate-700">{it.colour}</span>
              <RemoveButton label="Remove picture" onClick={() => onChange({ ...config, items: config.items.filter((_, j) => j !== i) })} />
            </div>
          ))}
          {config.items.length < 8 && (
            <AddRowButton onClick={() => onChange({ ...config, items: [...config.items, { clipartId: "flower", colour: "pink" }] })}>Add picture</AddRowButton>
          )}
        </div>
      </EditorSection>

      <PreviewBox>
        <ColourPrint config={config} instructionText={instructionText} />
      </PreviewBox>
    </div>
  );
}

function ColourPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<ColourConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} marks={marks} instruction={instructionText || config.instruction}>
      <div className="grid grid-cols-4 gap-3 py-1">
        {config.items.map((it, i) => (
          <div key={i} className="flex flex-col items-center gap-1 rounded-lg border-2 border-slate-300 p-2">
            <Art id={it.clipartId} size={72} />
            <span className="flex items-center gap-1.5 text-sm font-bold capitalize text-slate-900">
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-slate-800" style={{ backgroundColor: "#fff" }} />
              {it.colour}
            </span>
          </div>
        ))}
      </div>
    </ActivityFrame>
  );
}

export const colourPlugin: KindergartenActivityPlugin<ColourConfig> = {
  type: "KDG_COLOUR",
  label: "Colour the Picture",
  shortLabel: "Colouring",
  category: "general",
  description: "Outline pictures with the colour name written below – children colour them in.",
  iconName: "Palette",
  defaultConfig: colourDefaultConfig,
  validateConfig: (cfg) => {
    const c = cfg as ColourConfig;
    if (!c || !Array.isArray(c.items) || c.items.length === 0) return { valid: false, error: "Add at least one picture" };
    return { valid: true };
  },
  renderEditor: ColourEditor,
  renderPrint: ColourPrint,
  getSummary: (c) => `${c.items.length} pictures to colour`,
};
