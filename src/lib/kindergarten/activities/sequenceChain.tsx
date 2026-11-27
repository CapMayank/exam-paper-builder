"use client";

import {
  ChoiceChips,
  EditorShell,
  Field,
  InstructionField,
  TextListField,
} from "../editor-kit";

import { PreviewBox } from "./_shared";
import React from "react";
import type {
  KindergartenActivityPlugin,
  KindergartenEditorProps,
  KindergartenPrintProps,
  SequenceChainConfig,
  SequenceChainItem,
} from "../types";

export const sequenceChainDefaultConfig = (): SequenceChainConfig => {
  return {
    theme: "CATERPILLAR",
    instruction: "Fill in the missing letters in the caterpillar's body:",
    items: [
      { value: "A", isBlank: false },
      { value: "B", isBlank: true },
      { value: "C", isBlank: false },
      { value: "D", isBlank: true },
      { value: "E", isBlank: false },
      { value: "F", isBlank: true },
      { value: "G", isBlank: false },
    ],
  };
};

function SequenceChainEditor({
  config,
  onChange,
  instructionText,
  onInstructionChange,
}: KindergartenEditorProps<SequenceChainConfig>) {
  const setValues = (values: string[]) => {
    // keep each item's blank choice by position; new items alternate like before
    const items: SequenceChainItem[] = values.map((value, idx) => ({
      value,
      isBlank: config.items[idx]?.isBlank ?? idx % 2 === 1,
    }));
    onChange({ ...config, items });
  };
  const toggleBlank = (idx: number) =>
    onChange({
      ...config,
      items: config.items.map((it, i) =>
        i === idx ? { ...it, isBlank: !it.isBlank } : it,
      ),
    });

  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_SEQUENCE_CHAIN"
        basic={
          <>
            <InstructionField
              value={instructionText}
              onChange={onInstructionChange}
              defaultValue={config.instruction}
            />
            <TextListField
              label="Items in order"
              values={config.items.map((i) => i.value)}
              onChange={setValues}
              placeholder="A B C D or 1 2 3 4"
            />
            <Field
              label="Tap an item to make it a blank"
              hint={`${config.items.filter((i) => i.isBlank).length} blanks`}
            >
              <div className="flex flex-wrap gap-1.5">
                {config.items.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleBlank(idx)}
                    aria-pressed={item.isBlank}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                      item.isBlank
                        ? "border-dashed border-amber-500 bg-amber-50 text-amber-600"
                        : "border-slate-900 bg-white text-slate-950"
                    }`}
                  >
                    {item.isBlank ? "_" : item.value}
                  </button>
                ))}
              </div>
            </Field>
          </>
        }
        advanced={
          <ChoiceChips<SequenceChainConfig["theme"]>
            label="Theme"
            value={config.theme}
            onChange={(theme) => onChange({ ...config, theme })}
            options={[
              { value: "CATERPILLAR", label: "Caterpillar" },
              { value: "TRAIN", label: "Train" },
              { value: "BUBBLES", label: "Bubbles" },
              { value: "APPLES", label: "Apples on a branch" },
            ]}
          />
        }
      />
      <PreviewBox>
        <SequenceChainPrint config={config} instructionText={instructionText} />
      </PreviewBox>
    </div>
  );
}

function SequenceChainPrint({
  config,
  instructionText,
  numberLabel,
  marks,
}: KindergartenPrintProps<SequenceChainConfig>) {
  const n = config.items.length;
  const lines = Math.max(1, Math.ceil(n / 10));
  const perRow = Math.max(1, Math.ceil(n / lines));
  const bubbleText = perRow <= 7 ? "text-2xl" : "text-xl";
  // room the caterpillar head / engine takes at the start of the first line; later lines are indented to match
  const headRem =
    config.theme === "CATERPILLAR" ? 4.25 : config.theme === "TRAIN" ? 5.25 : 0;
  const rows = Array.from({ length: lines }, (_, r) =>
    config.items
      .map((item, idx) => ({ item, idx }))
      .slice(r * perRow, (r + 1) * perRow),
  );
  return (
    <div className="my-2 border-2 border-slate-800 rounded-xl p-3 bg-white">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-start gap-2">
          {numberLabel && (
            <span className="font-black text-base text-slate-950 min-w-6">
              {numberLabel}
            </span>
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

      {/* Chain: up to 10 bubbles a line, shrunk to fit it; a longer chain is split into even lines, each bubble the same size */}
      <div className="space-y-4 px-2 py-4">
        {rows.map((row, r) => (
          <div key={r} className="flex items-center">
            {r === 0 ? (
              <>
                {config.theme === "CATERPILLAR" && (
                  <div className="relative mr-1 shrink-0 w-16 h-16 rounded-full border-3 border-slate-900 bg-white flex flex-col items-center justify-center text-slate-900 shadow-xs">
                    {/* Antennae */}
                    <div className="absolute -top-3.5 left-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-slate-900 rounded-tr-full" />
                    <div className="absolute -top-3.5 right-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-slate-900 rounded-tl-full" />
                    {/* Eyes */}
                    <div className="flex gap-2.5 mb-0.5">
                      <div className="w-2 h-2 rounded-full bg-slate-900" />
                      <div className="w-2 h-2 rounded-full bg-slate-900" />
                    </div>
                    {/* Smile */}
                    <div className="w-5 h-2.5 border-b-2 border-slate-900 rounded-b-full" />
                  </div>
                )}
                {/* Train Engine if theme is TRAIN */}
                {config.theme === "TRAIN" && (
                  <div className="mr-1 shrink-0 w-20 h-16 border-3 border-slate-900 rounded-lg bg-white flex flex-col items-center justify-between p-1">
                    <div className="flex justify-between w-full px-1">
                      <div className="w-3 h-4 bg-slate-900" />
                      <div className="w-5 h-4 border border-slate-900 rounded-xs" />
                    </div>
                    <span className="text-[10px] font-black tracking-widest text-slate-900">
                      ENGINE
                    </span>
                    <div className="flex gap-2">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-900" />
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-900" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              headRem > 0 && (
                <div
                  className="shrink-0"
                  style={{ width: `${headRem}rem` }}
                  aria-hidden
                />
              )
            )}
            {row.map(({ item, idx }) => (
              <div
                key={idx}
                className="flex max-w-[4.75rem] items-center"
                style={{ width: `calc((100% - ${headRem}rem) / ${perRow})` }}
              >
                {/* Connecting link */}
                <div className="h-1 w-3 shrink-0 bg-slate-900" />

                {/* Bubble */}
                <div
                  className={`aspect-square min-w-0 flex-1 rounded-full border-3 border-slate-900 flex items-center justify-center font-black ${bubbleText} ${
                    item.isBlank
                      ? "bg-slate-50/60 border-dashed border-slate-400"
                      : "bg-white text-slate-950"
                  }`}
                >
                  {item.isBlank ? (
                    <span className="text-slate-300 text-xs font-mono select-none">
                      •
                    </span>
                  ) : (
                    item.value
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export const sequenceChainPlugin: KindergartenActivityPlugin<SequenceChainConfig> =
  {
    type: "KDG_SEQUENCE_CHAIN",
    label: "Missing Sequence Chain (Caterpillar / Train)",
    shortLabel: "Missing Sequence",
    category: "general",
    description:
      "Connected chain of letters or numbers with cute caterpillar or train bubbles for missing fill-ins.",
    iconName: "TrendingUp",
    defaultConfig: sequenceChainDefaultConfig,
    validateConfig: (cfg) => {
      if (!cfg || typeof cfg !== "object")
        return { valid: false, error: "Invalid config" };
      return { valid: true };
    },
    renderEditor: SequenceChainEditor,
    renderPrint: SequenceChainPrint,
    getSummary: (config) => {
      return `${config.theme} (${config.items.length} bubbles, ${config.items.filter((i) => i.isBlank).length} missing)`;
    },
  };
