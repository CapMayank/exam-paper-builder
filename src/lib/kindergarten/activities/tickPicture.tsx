"use client";

import React from "react";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps, TickPictureConfig, TickPictureRow } from "../types";
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

export const tickPictureDefaultConfig = (): TickPictureConfig => ({
  instruction: "Tick (✓) the correct picture:",
  rows: [
    { question: "Which one starts with the letter b?", options: ["ball", "cat", "sun"], correctIndex: 0 },
    { question: "Which one can fly?", options: ["fish", "butterfly", "car"], correctIndex: 1 },
    { question: "Which one is a fruit?", options: ["mango", "drum", "kite"], correctIndex: 0 },
  ],
});

function TickPictureEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<TickPictureConfig>) {
  const setRow = (i: number, patch: Partial<TickPictureRow>) =>
    onChange({ ...config, rows: config.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  return (
    <div className="space-y-4">
      <InstructionField value={instructionText} onChange={onInstructionChange} placeholder="e.g. Tick the correct picture" />

      <EditorSection title="Questions" hint="Mark the correct picture with the green tick (teacher's key – not printed)">
        <div className="space-y-2">
          {config.rows.map((r, i) => (
            <div key={i} className="space-y-2 rounded-lg bg-slate-50 p-2">
              <div className="flex items-center gap-2">
                <input
                  aria-label={`Question ${i + 1}`}
                  value={r.question}
                  onChange={(e) => setRow(i, { question: e.target.value })}
                  placeholder="e.g. Which one starts with the letter b?"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
                <RemoveButton label="Remove question" onClick={() => onChange({ ...config, rows: config.rows.filter((_, j) => j !== i) })} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {r.options.map((o, k) => (
                  <div key={k} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                    <ClipartChip clipartId={o} onPick={(id) => setRow(i, { options: r.options.map((x, m) => (m === k ? id : x)) })} />
                    <button
                      type="button"
                      title="Correct answer"
                      aria-label={`Option ${k + 1} is correct`}
                      aria-pressed={r.correctIndex === k}
                      onClick={() => setRow(i, { correctIndex: k })}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-black ${
                        r.correctIndex === k ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      ✓
                    </button>
                    {r.options.length > 2 && (
                      <RemoveButton
                        label="Remove option"
                        onClick={() =>
                          setRow(i, {
                            options: r.options.filter((_, m) => m !== k),
                            correctIndex: r.correctIndex === k ? 0 : r.correctIndex > k ? r.correctIndex - 1 : r.correctIndex,
                          })
                        }
                      />
                    )}
                  </div>
                ))}
                {r.options.length < 4 && <AddRowButton onClick={() => setRow(i, { options: [...r.options, "star"] })}>Option</AddRowButton>}
              </div>
            </div>
          ))}
          {config.rows.length < 6 && (
            <AddRowButton onClick={() => onChange({ ...config, rows: [...config.rows, { question: "", options: ["apple", "ball", "cat"], correctIndex: 0 }] })}>
              Add question
            </AddRowButton>
          )}
        </div>
      </EditorSection>

      <PreviewBox>
        <TickPicturePrint config={config} instructionText={instructionText} />
      </PreviewBox>
    </div>
  );
}

function TickPicturePrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<TickPictureConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} marks={marks} instruction={instructionText || config.instruction}>
      <div className="space-y-3 py-1">
        {config.rows.map((r, i) => (
          <div key={i}>
            {r.question && (
              <div className="mb-1 text-sm font-bold text-slate-900">
                {i + 1}. {r.question}
              </div>
            )}
            <div className="flex flex-wrap items-end gap-4">
              {r.options.map((o, k) => (
                <div key={k} className="flex flex-col items-center gap-1">
                  <div className="flex h-16 w-20 items-center justify-center rounded-lg border-2 border-slate-400">
                    <Art id={o} size={48} />
                  </div>
                  <span className="inline-block h-6 w-6 rounded-sm border-2 border-slate-700" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ActivityFrame>
  );
}

export const tickPicturePlugin: KindergartenActivityPlugin<TickPictureConfig> = {
  type: "KDG_TICK_PICTURE",
  label: "Tick the Correct Picture",
  shortLabel: "Tick the Picture",
  category: "general",
  description: "A question with 2–4 pictures – the child ticks the right one (sounds, fruits, animals, opposites).",
  iconName: "CheckSquare",
  defaultConfig: tickPictureDefaultConfig,
  validateConfig: (cfg) => {
    const c = cfg as TickPictureConfig;
    if (!c || !Array.isArray(c.rows) || c.rows.length === 0) return { valid: false, error: "Add at least one question" };
    return { valid: true };
  },
  renderEditor: TickPictureEditor,
  renderPrint: TickPicturePrint,
  getSummary: (c) => `${c.rows.length} tick questions`,
};
