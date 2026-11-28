"use client";

import { EditorShell, Field, InstructionField, RowList, ToggleRow } from "../editor-kit";

import { PreviewBox } from "./_shared";
import React, { useState } from "react";
import { ImagePlus } from "lucide-react";
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

/**
 * A pair after the teacher picks a new picture. A name the teacher typed (a Hindi word, say) stays;
 * the automatic English name follows the picture, and so does the answer when it is that name's
 * first letter. A word answer ("Water" for a fish) is left alone.
 */
export function afterPicturePick(pair: PictureMatchPair, item: { id: string; name: string }): PictureMatchPair {
  const oldName = pair.clipartId ? getClipartById(pair.clipartId)?.name : undefined;
  const autoNamed = !pair.label || pair.label === oldName;
  const letterMatch = !pair.matchLabel || pair.matchLabel.toUpperCase() === (pair.label?.[0] ?? "").toUpperCase();
  return {
    ...pair,
    clipartId: item.id,
    customImageUrl: undefined,
    ...(autoNamed ? { label: item.name, ...(letterMatch ? { matchLabel: item.name[0]?.toUpperCase() || "A" } : {}) } : {}),
  };
}

function PictureMatchEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<PictureMatchConfig>) {
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const updatePair = (index: number, patch: Partial<PictureMatchPair>) =>
    onChange({ ...config, pairs: config.pairs.map((p, i) => (i === index ? { ...p, ...patch } : p)) });

  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_PICTURE_MATCH"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <RowList<PictureMatchPair>
              label="Pairs — picture, its name, and what it matches"
              rows={config.pairs}
              onChange={(pairs) => onChange({ ...config, pairs })}
              makeRow={() => ({ id: String(Date.now()), clipartId: "star", label: "Star", matchLabel: "S" })}
              min={2}
              max={8}
              addLabel="Add pair"
              renderRow={(pair, update, idx) => {
                const clipart = pair.clipartId ? getClipartById(pair.clipartId) : null;
                return (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPickerIndex(idx)}
                      aria-label="Change picture"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white p-1 text-slate-900 hover:border-indigo-500"
                    >
                      {pair.customImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pair.customImageUrl} alt={pair.label} className="max-h-full max-w-full object-contain" />
                      ) : clipart ? (
                        clipart.renderSvg(32)
                      ) : (
                        <ImagePlus size={16} className="text-slate-400" />
                      )}
                    </button>
                    <input
                      aria-label="Picture name"
                      value={pair.label}
                      onChange={(e) => update({ ...pair, label: e.target.value })}
                      placeholder="Apple"
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold"
                    />
                    <span className="text-xs font-bold text-slate-400">→</span>
                    <input
                      aria-label="Matches"
                      value={pair.matchLabel}
                      onChange={(e) => update({ ...pair, matchLabel: e.target.value })}
                      placeholder="A"
                      className="w-14 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-xs font-black text-slate-950"
                    />
                  </div>
                );
              }}
            />
          </>
        }
        advanced={
          <>
            <ToggleRow label="Mix up the right column when printing" checked={config.shuffleRight !== false} onChange={(shuffleRight) => onChange({ ...config, shuffleRight })} />
            <Field label="Column titles (optional)">
              <div className="flex gap-2">
                <input
                  aria-label="Left column title"
                  value={config.leftTitle ?? ""}
                  onChange={(e) => onChange({ ...config, leftTitle: e.target.value || undefined })}
                  placeholder="Pictures"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                />
                <input
                  aria-label="Right column title"
                  value={config.rightTitle ?? ""}
                  onChange={(e) => onChange({ ...config, rightTitle: e.target.value || undefined })}
                  placeholder="Letters"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                />
              </div>
            </Field>
          </>
        }
      />

      {pickerIndex !== null && (
        <ClipartPickerModal
          isOpen={true}
          onClose={() => setPickerIndex(null)}
          onSelect={(item) => {
            if ("customUrl" in item) {
              updatePair(pickerIndex, { customImageUrl: item.customUrl, label: item.name });
            } else {
              const pair = config.pairs[pickerIndex];
              if (pair) updatePair(pickerIndex, afterPicturePick(pair, item));
            }
            setPickerIndex(null);
          }}
        />
      )}

      <PreviewBox>
        <MatchingCanvas pairs={config.pairs} leftTitle={config.leftTitle} rightTitle={config.rightTitle} shuffle={config.shuffleRight !== false} />
      </PreviewBox>
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
        shuffle={config.shuffleRight !== false}
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
