"use client";

import { EditorShell, InstructionField, PictureChip, RowList } from "../editor-kit";

import React from "react";
import type {
  KindergartenActivityPlugin,
  KindergartenEditorProps,
  KindergartenPrintProps,
  MissingLettersConfig,
  MissingLettersItem,
} from "../types";
import { ActivityFrame, Art, PreviewBox } from "./_shared";

export const missingLettersDefaultConfig = (): MissingLettersConfig => ({
  instruction: "Look at the picture and fill in the missing letter:",
  items: [
    { word: "cat", blanks: [1], clipartId: "cat" },
    { word: "dog", blanks: [2], clipartId: "dog" },
    { word: "sun", blanks: [0], clipartId: "sun" },
    { word: "cup", blanks: [1], clipartId: "cup" },
  ],
});

function MissingLettersEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<MissingLettersConfig>) {
  const toggleBlank = (it: MissingLettersItem, idx: number): MissingLettersItem => ({
    ...it,
    blanks: it.blanks.includes(idx) ? it.blanks.filter((x) => x !== idx) : [...it.blanks, idx].sort((a, b) => a - b),
  });

  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_MISSING_LETTERS"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <RowList<MissingLettersItem>
              label="Words — tap a letter to blank it"
              rows={config.items}
              onChange={(items) => onChange({ ...config, items })}
              makeRow={() => ({ word: "", blanks: [], clipartId: undefined })}
              max={8}
              addLabel="Add word"
              renderRow={(it, update) => (
                <div className="flex flex-wrap items-center gap-1.5">
                  <PictureChip clipartId={it.clipartId} onPick={(id) => update({ ...it, clipartId: id })} label="Picture clue" />
                  <input
                    aria-label="Word"
                    value={it.word}
                    maxLength={12}
                    onChange={(e) => update({ ...it, word: e.target.value, blanks: it.blanks.filter((b) => b < e.target.value.length) })}
                    className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-bold tracking-widest"
                    placeholder="word"
                  />
                  {it.word.split("").map((ch, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => update(toggleBlank(it, idx))}
                      aria-pressed={it.blanks.includes(idx)}
                      title="Make this letter a blank"
                      className={`flex h-8 w-8 items-center justify-center rounded-md border-2 text-sm font-bold ${
                        it.blanks.includes(idx) ? "border-dashed border-amber-500 bg-amber-50 text-amber-600" : "border-slate-800 bg-white text-slate-900"
                      }`}
                    >
                      {it.blanks.includes(idx) ? "_" : ch}
                    </button>
                  ))}
                </div>
              )}
            />
          </>
        }
      />
      <PreviewBox>
        <MissingLettersPrint config={config} instructionText={instructionText} />
      </PreviewBox>
    </div>
  );
}

function MissingLettersPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<MissingLettersConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} marks={marks} instruction={instructionText || config.instruction}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-1">
        {config.items.map((it, i) => (
          <div key={i} className="flex items-center gap-3">
            <Art id={it.clipartId} size={46} />
            <div className="flex items-center gap-1.5">
              {it.word.split("").map((ch, idx) =>
                it.blanks.includes(idx) ? (
                  <span key={idx} className="inline-block h-9 w-9 rounded-md border-2 border-dashed border-slate-500" />
                ) : (
                  <span key={idx} className="flex h-9 w-9 items-center justify-center text-2xl font-black text-slate-900">
                    {ch}
                  </span>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </ActivityFrame>
  );
}

export const missingLettersPlugin: KindergartenActivityPlugin<MissingLettersConfig> = {
  type: "KDG_MISSING_LETTERS",
  label: "Fill the Missing Letter (with picture)",
  shortLabel: "Missing Letters",
  category: "english",
  description: "Picture + word with blank boxes for the missing letters (c _ t, d _ g).",
  iconName: "Type",
  defaultConfig: missingLettersDefaultConfig,
  validateConfig: (cfg) => {
    const c = cfg as MissingLettersConfig;
    if (!c || !Array.isArray(c.items) || c.items.length === 0) return { valid: false, error: "Add at least one word" };
    return { valid: true };
  },
  renderEditor: MissingLettersEditor,
  renderPrint: MissingLettersPrint,
  getSummary: (c) => `${c.items.length} words, ${c.items.reduce((n, it) => n + it.blanks.length, 0)} blanks`,
};
