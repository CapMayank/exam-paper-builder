"use client";

import { EditorShell, InstructionField, PictureChip, RowList } from "../editor-kit";

import React from "react";
import { X } from "lucide-react";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps, TickPictureConfig, TickPictureRow } from "../types";
import { ActivityFrame, Art, PreviewBox } from "./_shared";

export const tickPictureDefaultConfig = (): TickPictureConfig => ({
  instruction: "Tick (✓) the correct picture:",
  rows: [
    { question: "Which one starts with the letter b?", options: ["ball", "cat", "sun"], correctIndex: 0 },
    { question: "Which one can fly?", options: ["fish", "butterfly", "car"], correctIndex: 1 },
    { question: "Which one is a fruit?", options: ["mango", "drum", "kite"], correctIndex: 0 },
  ],
});

function TickPictureEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<TickPictureConfig>) {
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_TICK_PICTURE"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <RowList<TickPictureRow>
              label="Questions — green tick marks the answer (not printed)"
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => ({ question: "", options: ["apple", "ball", "cat"], correctIndex: 0 })}
              max={6}
              addLabel="Add question"
              renderRow={(r, update) => (
                <div className="space-y-1.5">
                  <input
                    aria-label="Question"
                    value={r.question}
                    onChange={(e) => update({ ...r, question: e.target.value })}
                    placeholder="e.g. Which one starts with b?"
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {r.options.map((o, k) => (
                      <div key={k} className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
                        <PictureChip clipartId={o} size={24} onPick={(id) => update({ ...r, options: r.options.map((x, m) => (m === k ? id : x)) })} />
                        <button
                          type="button"
                          title="Correct answer"
                          aria-label={`Picture ${k + 1} is correct`}
                          aria-pressed={r.correctIndex === k}
                          onClick={() => update({ ...r, correctIndex: k })}
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${r.correctIndex === k ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"}`}
                        >
                          ✓
                        </button>
                        {r.options.length > 2 && (
                          <button
                            type="button"
                            aria-label={`Remove picture ${k + 1}`}
                            onClick={() =>
                              update({
                                ...r,
                                options: r.options.filter((_, m) => m !== k),
                                correctIndex: r.correctIndex === k ? 0 : r.correctIndex > k ? r.correctIndex - 1 : r.correctIndex,
                              })
                            }
                            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                    {r.options.length < 4 && (
                      <button type="button" onClick={() => update({ ...r, options: [...r.options, "star"] })} className="rounded-lg border border-dashed border-indigo-300 px-2 py-1 text-xs font-semibold text-indigo-700">
                        + Picture
                      </button>
                    )}
                  </div>
                </div>
              )}
            />
          </>
        }
      />
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
  halfWidth: (config) => config.rows.every((row) => row.options.length <= 3),
  getSummary: (c) => `${c.rows.length} tick questions`,
};
