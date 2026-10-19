"use client";

import React, { useState } from "react";
import { ImagePlus } from "lucide-react";
import { ClipartPickerModal } from "../components/ClipartPickerModal";
import { getClipartById } from "../clipartLibrary";
import type {
  CountItemsConfig,
  KindergartenActivityPlugin,
  KindergartenEditorProps,
  KindergartenPrintProps,
} from "../types";

export const countItemsDefaultConfig = (): CountItemsConfig => {
  return {
    clipartId: "balloon",
    count: 5,
    layout: "GRID",
    answerStyle: "SQUARE_BOX",
    choiceOptions: [3, 5, 7],
    objectName: "balloons",
    instruction: "Count the objects and write the correct number in the box:",
  };
};

function CountItemsEditor({
  config,
  onChange,
  instructionText,
  onInstructionChange,
}: KindergartenEditorProps<CountItemsConfig>) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const clipart = config.clipartId ? getClipartById(config.clipartId) : null;

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
          placeholder="e.g. Count the balloons and write the number in the box"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Choose Object Button */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Object Clipart</label>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center justify-between p-2 border border-slate-300 rounded-lg bg-white hover:border-indigo-500 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center text-slate-900">
                {config.customImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.customImageUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                ) : clipart ? (
                  clipart.renderSvg(28)
                ) : (
                  <ImagePlus size={16} />
                )}
              </div>
              <span className="text-xs font-bold text-slate-800 capitalize">
                {clipart?.name || config.objectName || "Select"}
              </span>
            </div>
            <span className="text-xs text-indigo-600 font-semibold">Change</span>
          </button>
        </div>

        {/* Count */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Number of Objects</label>
          <input
            type="number"
            min={1}
            max={20}
            value={config.count}
            onChange={(e) => onChange({ ...config, count: Math.max(1, Number(e.target.value)) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 bg-white"
          />
        </div>

        {/* Answer Style */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Answer Style</label>
          <select
            value={config.answerStyle}
            onChange={(e) =>
              onChange({
                ...config,
                answerStyle: e.target.value as CountItemsConfig["answerStyle"],
              })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="SQUARE_BOX">Square Box [ Write Number ]</option>
            <option value="CIRCLE">Circle [ Write Number ]</option>
            <option value="CHOICE_OPTIONS">Multiple Choice (Circle correct)</option>
          </select>
        </div>
      </div>

      {/* Clipart Picker Modal */}
      {pickerOpen && (
        <ClipartPickerModal
          isOpen={true}
          onClose={() => setPickerOpen(false)}
          onSelect={(item) => {
            if ("customUrl" in item) {
              onChange({
                ...config,
                customImageUrl: item.customUrl,
                clipartId: "",
                objectName: item.name,
              });
            } else {
              onChange({
                ...config,
                clipartId: item.id,
                customImageUrl: undefined,
                objectName: item.name.toLowerCase(),
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
        <CountItemsPrint config={config} instructionText={instructionText} />
      </div>
    </div>
  );
}

function CountItemsPrint({
  config,
  instructionText,
  numberLabel,
  marks,
}: KindergartenPrintProps<CountItemsConfig>) {
  const clipart = config.clipartId ? getClipartById(config.clipartId) : null;
  const items = Array.from({ length: Math.min(24, Math.max(1, config.count)) });

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

      <div className="flex items-center justify-between gap-6 py-2 px-3 border border-slate-200 rounded-xl bg-slate-50/40">
        {/* Clipart Objects Cluster */}
        <div className="flex-1 flex flex-wrap gap-3 items-center justify-start p-2">
          {items.map((_, idx) => (
            <div
              key={idx}
              className="w-14 h-14 flex items-center justify-center p-1 bg-white border border-slate-200 rounded-lg text-slate-900 shadow-2xs"
            >
              {config.customImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={config.customImageUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              ) : clipart ? (
                clipart.renderSvg(46)
              ) : (
                <span className="text-xs">★</span>
              )}
            </div>
          ))}
        </div>

        {/* Answer Space / Box */}
        <div className="shrink-0 flex flex-col items-center justify-center pl-4 border-l-2 border-dashed border-slate-300">
          <span className="text-xs font-bold text-slate-600 mb-1 select-none">Count:</span>
          {config.answerStyle === "CHOICE_OPTIONS" ? (
            <div className="flex gap-2">
              {(config.choiceOptions || [config.count - 1, config.count, config.count + 2]).map(
                (num, nIdx) => (
                  <div
                    key={nIdx}
                    className="w-10 h-10 rounded-full border-2 border-slate-900 flex items-center justify-center font-black text-lg text-slate-950 bg-white"
                  >
                    {num}
                  </div>
                )
              )}
            </div>
          ) : config.answerStyle === "CIRCLE" ? (
            <div className="w-16 h-16 rounded-full border-3 border-slate-900 bg-white flex items-center justify-center">
              <span className="text-slate-300 text-xs font-mono">•</span>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl border-3 border-slate-900 bg-white flex items-center justify-center shadow-xs">
              <span className="text-slate-300 text-xs font-mono">•</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const countItemsPlugin: KindergartenActivityPlugin<CountItemsConfig> = {
  type: "KDG_COUNT_ITEMS",
  label: "Count Objects & Write / Match Number",
  shortLabel: "Count & Write",
  category: "math",
  description: "Clusters of outline clipart objects with answer boxes for children to count and write.",
  iconName: "Hash",
  defaultConfig: countItemsDefaultConfig,
  validateConfig: (cfg) => {
    if (!cfg || typeof cfg !== "object") return { valid: false, error: "Invalid config" };
    return { valid: true };
  },
  renderEditor: CountItemsEditor,
  renderPrint: CountItemsPrint,
  getSummary: (config) => {
    return `Count ${config.count} ${config.objectName || "items"}`;
  },
};
