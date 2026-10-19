"use client";

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
  const toggleBlank = (idx: number) => {
    const nextItems = [...config.items];
    if (nextItems[idx]) {
      nextItems[idx] = { ...nextItems[idx], isBlank: !nextItems[idx].isBlank };
      onChange({ ...config, items: nextItems });
    }
  };

  const handleSequenceInput = (str: string) => {
    const rawTokens = str.split(",").map((s) => s.trim()).filter(Boolean);
    const nextItems: SequenceChainItem[] = rawTokens.map((val, idx) => ({
      value: val,
      isBlank: idx % 2 === 1, // alternate blank
    }));
    onChange({ ...config, items: nextItems });
  };

  const currentCsv = config.items.map((it) => it.value).join(", ");

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
          placeholder="e.g. Fill in the missing letters in the caterpillar"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Chain Theme</label>
          <select
            value={config.theme}
            onChange={(e) =>
              onChange({
                ...config,
                theme: e.target.value as SequenceChainConfig["theme"],
              })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="CATERPILLAR">Caterpillar (Cute smiling face & antennae)</option>
            <option value="TRAIN">Train (Toy engine & carriages)</option>
            <option value="BUBBLES">Floating Bubbles</option>
            <option value="APPLES">Apples on a Branch</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Sequence Items (comma-separated)
          </label>
          <input
            type="text"
            value={currentCsv}
            onChange={(e) => handleSequenceInput(e.target.value)}
            placeholder="e.g. A, B, C, D, E, F, G  or  1, 2, 3, 4, 5, 6"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold tracking-wider text-slate-900 bg-white"
          />
        </div>
      </div>

      {/* Bubble click toggle */}
      <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-white shadow-2xs">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Click any bubble to toggle Blank (student fills in) vs Pre-filled
          </span>
          <span className="text-xs text-indigo-600 font-semibold">
            {config.items.filter((i) => i.isBlank).length} blanks
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto p-2 bg-slate-50/50 rounded-xl border border-slate-200">
          {config.items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => toggleBlank(idx)}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-base transition-all shrink-0 ${
                item.isBlank
                  ? "bg-amber-50 border-dashed border-amber-500 text-amber-600"
                  : "bg-white border-slate-900 text-slate-950 shadow-xs"
              }`}
              title="Click to toggle blank"
            >
              {item.isBlank ? `[${item.value}]` : item.value}
            </button>
          ))}
        </div>
      </div>

      {/* Live Preview */}
      <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-white shadow-2xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Print Preview
        </span>
        <SequenceChainPrint config={config} instructionText={instructionText} />
      </div>
    </div>
  );
}

function SequenceChainPrint({
  config,
  instructionText,
  numberLabel,
  marks,
}: KindergartenPrintProps<SequenceChainConfig>) {
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

      {/* Chain Graphic */}
      <div className="py-4 px-2 overflow-x-auto flex items-center justify-start gap-1 sm:gap-2">
        {/* Caterpillar Head if theme is CATERPILLAR */}
        {config.theme === "CATERPILLAR" && (
          <div className="relative shrink-0 w-16 h-16 sm:w-18 sm:h-18 rounded-full border-3 border-slate-900 bg-white flex flex-col items-center justify-center text-slate-900 shadow-xs">
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
          <div className="shrink-0 w-20 h-16 sm:h-18 border-3 border-slate-900 rounded-lg bg-white flex flex-col items-center justify-between p-1">
            <div className="flex justify-between w-full px-1">
              <div className="w-3 h-4 bg-slate-900" />
              <div className="w-5 h-4 border border-slate-900 rounded-xs" />
            </div>
            <span className="text-[10px] font-black tracking-widest text-slate-900">ENGINE</span>
            <div className="flex gap-2">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-900" />
              <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-900" />
            </div>
          </div>
        )}

        {/* Sequence Bubbles */}
        {config.items.map((item, idx) => (
          <div key={idx} className="flex items-center shrink-0">
            {/* Connecting link */}
            <div className="w-2 sm:w-3 h-1 bg-slate-900" />

            {/* Bubble */}
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-3 border-slate-900 flex items-center justify-center font-black text-xl sm:text-2xl transition-all ${
                item.isBlank
                  ? "bg-slate-50/60 border-dashed border-slate-400"
                  : "bg-white text-slate-950"
              }`}
            >
              {item.isBlank ? (
                <span className="text-slate-300 text-xs font-mono select-none">•</span>
              ) : (
                item.value
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const sequenceChainPlugin: KindergartenActivityPlugin<SequenceChainConfig> = {
  type: "KDG_SEQUENCE_CHAIN",
  label: "Missing Sequence Chain (Caterpillar / Train)",
  shortLabel: "Missing Sequence",
  category: "general",
  description: "Connected chain of letters or numbers with cute caterpillar or train bubbles for missing fill-ins.",
  iconName: "TrendingUp",
  defaultConfig: sequenceChainDefaultConfig,
  validateConfig: (cfg) => {
    if (!cfg || typeof cfg !== "object") return { valid: false, error: "Invalid config" };
    return { valid: true };
  },
  renderEditor: SequenceChainEditor,
  renderPrint: SequenceChainPrint,
  getSummary: (config) => {
    return `${config.theme} (${config.items.length} bubbles, ${config.items.filter((i) => i.isBlank).length} missing)`;
  },
};
