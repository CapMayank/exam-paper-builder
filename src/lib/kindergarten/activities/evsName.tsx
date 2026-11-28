"use client";

import React from "react";
import { ChoiceChips, EditorShell, InstructionField, PictureChip, RowList, TextListField } from "../editor-kit";
import type { EvsNameConfig, EvsNameRow, KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, Art, PreviewBox } from "./_shared";
import { followMode } from "../autoInstruction";

export const evsNameDefaultConfig = (): EvsNameConfig => ({
  answer: "TICK",
  rows: [
    { clipartId: "elephant", name: "Elephant", choices: ["Elephant", "Dog"] },
    { clipartId: "apple", name: "Apple", choices: ["Mango", "Apple"] },
    { clipartId: "car", name: "Car", choices: ["Car", "Kite"] },
    { clipartId: "house", name: "House", choices: ["Tree", "House"] },
  ],
  instruction: "Look at the picture and tick (✓) its name:",
});

const INSTRUCTION = {
  TICK: "Look at the picture and tick (✓) its name:",
  WRITE: "Look at the picture and write its name:",
  CIRCLE: "Look at the picture and encircle its right name:",
} as const;

function NameRows({ config, showKey }: { config: EvsNameConfig; showKey?: boolean }) {
  if (config.answer === "CIRCLE") {
    return (
      <div className="grid grid-cols-4 gap-x-4 gap-y-4">
        {config.rows.map((row, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Art id={row.clipartId} size={56} />
            <span className="flex flex-wrap items-center justify-center gap-x-1 text-base font-bold text-slate-950">
              {row.choices.map((c, k) => (
                <React.Fragment key={k}>
                  {k > 0 && <span className="text-slate-500">/</span>}
                  {/* the ring is padding-neutral so the line looks the same with the key off */}
                  <span className={`rounded-full px-2 py-0.5 ${showKey && c === row.name ? "text-emerald-700 ring-2 ring-emerald-700" : ""}`}>{c}</span>
                </React.Fragment>
              ))}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      {config.rows.map((row, i) => (
        <div key={i} className="flex items-center gap-3">
          <Art id={row.clipartId} size={50} />
          {config.answer === "WRITE" ? (
            <span className="h-9 flex-1 border-b-2 border-slate-800" aria-label="write the name" />
          ) : (
            <span className="space-y-1">
              {row.choices.map((c, k) => (
                <span key={k} className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded border-2 border-slate-800 text-xs font-black text-emerald-700">
                    {showKey && c === row.name ? "✓" : ""}
                  </span>
                  {c}
                </span>
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function EvsNameEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<EvsNameConfig>) {
  /** Keeps the right name among the choices when it changes. */
  const withName = (row: EvsNameRow, name: string): EvsNameRow => ({ ...row, name, choices: row.choices.map((c) => (c === row.name ? name : c)) });
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_EVS_NAME"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <ChoiceChips<EvsNameConfig["answer"]>
              label="Child"
              value={config.answer}
              onChange={(answer) => {
                const instruction = followMode(instructionText || config.instruction, INSTRUCTION, answer);
                onChange({ ...config, answer, instruction });
                onInstructionChange(instruction);
              }}
              options={[
                { value: "TICK", label: "Ticks the right name" },
                { value: "CIRCLE", label: "Circles the right word" },
                { value: "WRITE", label: "Writes the name" },
              ]}
            />
            <RowList<EvsNameRow>
              label="Pictures"
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => ({ clipartId: "sun", name: "Sun", choices: ["Sun", "Star"] })}
              max={8}
              addLabel="Add picture"
              renderRow={(row, update) => (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <PictureChip clipartId={row.clipartId} onPick={(id) => update({ ...row, clipartId: id })} />
                    <input
                      aria-label="Right name"
                      value={row.name}
                      onChange={(e) => update(withName(row, e.target.value))}
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold"
                    />
                  </div>
                  {config.answer !== "WRITE" && (
                    <TextListField
                      label="Names to choose from (include the right one)"
                      values={row.choices}
                      onChange={(choices) => update({ ...row, choices })}
                      placeholder="Elephant, Dog"
                    />
                  )}
                </div>
              )}
            />
          </>
        }
      />
      <PreviewBox>
        <NameRows config={config} showKey />
      </PreviewBox>
    </div>
  );
}

function EvsNamePrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<EvsNameConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <NameRows config={config} />
    </ActivityFrame>
  );
}

export const evsNamePlugin: KindergartenActivityPlugin<EvsNameConfig> = {
  type: "KDG_EVS_NAME",
  label: "Name the picture",
  shortLabel: "Name the Picture",
  category: "evs",
  description: "Pictures of animals, fruits and things; the child ticks or circles the right name, or writes it.",
  iconName: "Tag",
  defaultConfig: evsNameDefaultConfig,
  validateConfig: (cfg) => (cfg && Array.isArray((cfg as EvsNameConfig).rows) ? { valid: true } : { valid: false, error: "Invalid config" }),
  renderEditor: EvsNameEditor,
  renderPrint: EvsNamePrint,
  // a name line fits beside the picture; tick-the-name choices need the width
  halfWidth: (config) => config.answer === "WRITE",
  getSummary: (config) => config.rows.map((r) => r.name).join(", "),
};
