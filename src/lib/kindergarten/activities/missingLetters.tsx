"use client";

import React from "react";
import type {
  KindergartenActivityPlugin,
  KindergartenEditorProps,
  KindergartenPrintProps,
  MissingLettersConfig,
  MissingLettersItem,
} from "../types";
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

export const missingLettersDefaultConfig = (): MissingLettersConfig => ({
  instruction: "Look at the picture and fill in the missing letter:",
  items: [
    { word: "cat", blanks: [1], clipartId: "cat" },
    { word: "dog", blanks: [2], clipartId: "dog" },
    { word: "sun", blanks: [0], clipartId: "sun" },
    { word: "cup", blanks: [1], clipartId: "cup" },
  ],
});

function MissingLettersEditor({
  config,
  onChange,
  instructionText,
  onInstructionChange,
}: KindergartenEditorProps<MissingLettersConfig>) {
  const setItem = (i: number, patch: Partial<MissingLettersItem>) =>
    onChange({ ...config, items: config.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const toggleBlank = (i: number, idx: number) => {
    const cur = config.items[i].blanks;
    setItem(i, { blanks: cur.includes(idx) ? cur.filter((x) => x !== idx) : [...cur, idx].sort((a, b) => a - b) });
  };

  return (
    <div className="space-y-4">
      <InstructionField
        value={instructionText}
        onChange={onInstructionChange}
        placeholder="e.g. Fill in the missing letter"
      />

      <EditorSection title="Words" hint="Click a letter to make it a blank">
        <div className="space-y-2">
          {config.items.map((it, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2">
              <ClipartChip clipartId={it.clipartId} onPick={(id) => setItem(i, { clipartId: id })} />
              <input
                aria-label={`Word ${i + 1}`}
                value={it.word}
                maxLength={12}
                onChange={(e) =>
                  setItem(i, {
                    word: e.target.value,
                    blanks: it.blanks.filter((b) => b < e.target.value.length),
                  })
                }
                className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-bold tracking-widest"
                placeholder="word"
              />
              <div className="flex flex-1 flex-wrap items-center gap-1">
                {it.word.split("").map((ch, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleBlank(i, idx)}
                    title="Toggle blank"
                    className={`flex h-9 w-9 items-center justify-center rounded-md border-2 text-base font-bold ${
                      it.blanks.includes(idx)
                        ? "border-dashed border-amber-500 bg-amber-50 text-amber-600"
                        : "border-slate-800 bg-white text-slate-900"
                    }`}
                  >
                    {it.blanks.includes(idx) ? "_" : ch}
                  </button>
                ))}
              </div>
              <RemoveButton
                label="Remove word"
                onClick={() => onChange({ ...config, items: config.items.filter((_, j) => j !== i) })}
              />
            </div>
          ))}
          {config.items.length < 8 && (
            <AddRowButton onClick={() => onChange({ ...config, items: [...config.items, { word: "", blanks: [], clipartId: undefined }] })}>
              Add word
            </AddRowButton>
          )}
        </div>
      </EditorSection>

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
