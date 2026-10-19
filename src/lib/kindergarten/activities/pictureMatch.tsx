"use client";

import React, { useState } from "react";
import { ImagePlus, Plus, Shuffle, Trash2 } from "lucide-react";
import { ClipartPickerModal } from "../components/ClipartPickerModal";
import { MatchingCanvas } from "../components/MatchingCanvas";
import { getClipartById } from "../clipartLibrary";
import type {
  KindergartenActivityPlugin,
  KindergartenEditorProps,
  KindergartenPrintProps,
  PictureMatchConfig,
  PictureMatchPair,
} from "../types";

export const pictureMatchDefaultConfig = (): PictureMatchConfig => {
  return {
    pairs: [
      { id: "1", clipartId: "apple", label: "Apple", matchLabel: "A" },
      { id: "2", clipartId: "ball", label: "Ball", matchLabel: "B" },
      { id: "3", clipartId: "cat", label: "Cat", matchLabel: "C" },
      { id: "4", clipartId: "duck", label: "Duck", matchLabel: "D" },
    ],
    shuffleRight: true,
    leftTitle: "Pictures",
    rightTitle: "Letters",
    instruction: "Look at the pictures and match with the correct first letter:",
  };
};

function PictureMatchEditor({
  config,
  onChange,
  instructionText,
  onInstructionChange,
}: KindergartenEditorProps<PictureMatchConfig>) {
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  const addPair = () => {
    const nextPairs = [
      ...config.pairs,
      {
        id: String(Date.now()),
        clipartId: "star",
        label: "Star",
        matchLabel: "S",
      },
    ];
    onChange({ ...config, pairs: nextPairs });
  };

  const removePair = (index: number) => {
    const nextPairs = config.pairs.filter((_, i) => i !== index);
    onChange({ ...config, pairs: nextPairs });
  };

  const updatePair = (index: number, patch: Partial<PictureMatchPair>) => {
    const nextPairs = [...config.pairs];
    if (nextPairs[index]) {
      nextPairs[index] = { ...nextPairs[index], ...patch };
      onChange({ ...config, pairs: nextPairs });
    }
  };

  const shuffleRightLabels = () => {
    const rightLabels = config.pairs.map((p) => p.matchLabel);
    // Simple Fisher-Yates shuffle
    for (let i = rightLabels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rightLabels[i], rightLabels[j]] = [rightLabels[j], rightLabels[i]];
    }
    const nextPairs = config.pairs.map((p, idx) => ({
      ...p,
      matchLabel: rightLabels[idx],
    }));
    onChange({ ...config, pairs: nextPairs });
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
          placeholder="e.g. Look at the pictures and match with the correct letter"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
        />
      </div>

      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Matching Items ({config.pairs.length} pairs)
        </h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={shuffleRightLabels}
            className="btn btn-sm bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
            title="Randomize the right column order"
          >
            <Shuffle size={13} /> Shuffle Right Column
          </button>
          <button
            type="button"
            onClick={addPair}
            className="btn btn-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
          >
            <Plus size={13} /> Add Matching Pair
          </button>
        </div>
      </div>

      {/* List of pairs */}
      <div className="space-y-2.5">
        {config.pairs.map((pair, idx) => {
          const clipart = pair.clipartId ? getClipartById(pair.clipartId) : null;

          return (
            <div
              key={pair.id || idx}
              className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-xl bg-slate-50/50"
            >
              <span className="font-bold text-xs text-slate-400 w-4">{idx + 1}.</span>

              {/* Clipart preview button */}
              <button
                type="button"
                onClick={() => setPickerIndex(idx)}
                className="w-14 h-14 shrink-0 flex items-center justify-center p-1 bg-white border border-slate-300 hover:border-indigo-500 rounded-lg transition-all text-slate-900 group"
                title="Click to choose clipart or photo"
              >
                {pair.customImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pair.customImageUrl}
                    alt={pair.label}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : clipart ? (
                  clipart.renderSvg(40)
                ) : (
                  <ImagePlus size={20} className="text-slate-400 group-hover:text-indigo-600" />
                )}
              </button>

              {/* Left label */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={pair.label}
                  onChange={(e) => updatePair(idx, { label: e.target.value })}
                  placeholder="Picture Name (e.g. Apple)"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <span className="text-slate-400 font-bold text-xs">→</span>

              {/* Right match label */}
              <div className="w-20">
                <input
                  type="text"
                  value={pair.matchLabel}
                  onChange={(e) => updatePair(idx, { matchLabel: e.target.value })}
                  placeholder="Letter (A)"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-black text-center text-slate-950 uppercase"
                />
              </div>

              {/* Delete button */}
              {config.pairs.length > 2 && (
                <button
                  type="button"
                  onClick={() => removePair(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Remove pair"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Clipart Picker Modal */}
      {pickerIndex !== null && (
        <ClipartPickerModal
          isOpen={true}
          onClose={() => setPickerIndex(null)}
          onSelect={(item) => {
            if ("customUrl" in item) {
              updatePair(pickerIndex, {
                customImageUrl: item.customUrl,
                label: item.name,
              });
            } else {
              updatePair(pickerIndex, {
                clipartId: item.id,
                customImageUrl: undefined,
                label: item.name,
                matchLabel: item.name[0]?.toUpperCase() || "A",
              });
            }
          }}
        />
      )}

      {/* Live Preview */}
      <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-white shadow-2xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Print Preview
        </span>
        <MatchingCanvas pairs={config.pairs} />
      </div>
    </div>
  );
}

function PictureMatchPrint({
  config,
  instructionText,
  numberLabel,
  marks,
}: KindergartenPrintProps<PictureMatchConfig>) {
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

      <MatchingCanvas
        pairs={config.pairs}
        leftTitle={config.leftTitle}
        rightTitle={config.rightTitle}
      />
    </div>
  );
}

export const pictureMatchPlugin: KindergartenActivityPlugin<PictureMatchConfig> = {
  type: "KDG_PICTURE_MATCH",
  label: "Picture-to-Alphabet / Word Matching",
  shortLabel: "Picture Match",
  category: "english",
  description: "Outline clipart on the left matching to letters or words on the right with connector dots.",
  iconName: "GitMerge",
  defaultConfig: pictureMatchDefaultConfig,
  validateConfig: (cfg) => {
    if (!cfg || typeof cfg !== "object") return { valid: false, error: "Invalid config" };
    return { valid: true };
  },
  renderEditor: PictureMatchEditor,
  renderPrint: PictureMatchPrint,
  getSummary: (config) => {
    return `Match ${config.pairs.length} pictures to letters`;
  },
};
