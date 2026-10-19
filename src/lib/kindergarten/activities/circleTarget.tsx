"use client";

import React, { useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { ClipartPickerModal } from "../components/ClipartPickerModal";
import { getClipartById } from "../clipartLibrary";
import type {
  CircleTargetConfig,
  CircleTargetRow,
  CircleTargetRowItem,
  KindergartenActivityPlugin,
  KindergartenEditorProps,
  KindergartenPrintProps,
} from "../types";

export const circleTargetDefaultConfig = (): CircleTargetConfig => {
  return {
    mode: "ODD_ONE_OUT",
    targetDescription: "Find and circle the odd picture in each row:",
    instruction: "Circle the odd one out in each row:",
    rows: [
      {
        rowLabel: "Row 1",
        items: [
          { id: "1", type: "CLIPART", clipartId: "apple", isTarget: false },
          { id: "2", type: "CLIPART", clipartId: "apple", isTarget: false },
          { id: "3", type: "CLIPART", clipartId: "car", isTarget: true }, // odd item
          { id: "4", type: "CLIPART", clipartId: "apple", isTarget: false },
        ],
      },
      {
        rowLabel: "Row 2",
        items: [
          { id: "5", type: "CLIPART", clipartId: "cat", isTarget: false },
          { id: "6", type: "CLIPART", clipartId: "balloon", isTarget: true }, // odd item
          { id: "7", type: "CLIPART", clipartId: "cat", isTarget: false },
          { id: "8", type: "CLIPART", clipartId: "cat", isTarget: false },
        ],
      },
    ],
  };
};

function CircleTargetEditor({
  config,
  onChange,
  instructionText,
  onInstructionChange,
}: KindergartenEditorProps<CircleTargetConfig>) {
  const [pickerTarget, setPickerTarget] = useState<{ rowIdx: number; itemIdx: number } | null>(
    null
  );

  const addRow = () => {
    const newRow: CircleTargetRow = {
      rowLabel: `Row ${config.rows.length + 1}`,
      items: [
        { id: String(Date.now() + 1), type: "CLIPART", clipartId: "star", isTarget: false },
        { id: String(Date.now() + 2), type: "CLIPART", clipartId: "star", isTarget: false },
        { id: String(Date.now() + 3), type: "CLIPART", clipartId: "sun", isTarget: true },
        { id: String(Date.now() + 4), type: "CLIPART", clipartId: "star", isTarget: false },
      ],
    };
    onChange({ ...config, rows: [...config.rows, newRow] });
  };

  const removeRow = (rowIdx: number) => {
    onChange({ ...config, rows: config.rows.filter((_, i) => i !== rowIdx) });
  };

  const toggleTarget = (rowIdx: number, itemIdx: number) => {
    const nextRows = [...config.rows];
    const row = { ...nextRows[rowIdx] };
    const items = row.items.map((it, idx) => ({
      ...it,
      isTarget: idx === itemIdx ? !it.isTarget : config.mode === "ODD_ONE_OUT" ? false : it.isTarget,
    }));
    row.items = items;
    nextRows[rowIdx] = row;
    onChange({ ...config, rows: nextRows });
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
          placeholder="e.g. Circle the odd picture in each row or Circle all the letter B"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600">Mode:</label>
          <select
            value={config.mode}
            onChange={(e) =>
              onChange({
                ...config,
                mode: e.target.value as CircleTargetConfig["mode"],
              })
            }
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
          >
            <option value="ODD_ONE_OUT">Odd One Out (Find the different item)</option>
            <option value="FIND_TARGET">Find Target (Circle specific item/letter)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={addRow}
          className="btn btn-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
        >
          <Plus size={13} /> Add Row
        </button>
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {config.rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2"
          >
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">Row {rowIdx + 1}</span>
              {config.rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(rowIdx)}
                  className="text-slate-400 hover:text-rose-600"
                  title="Remove row"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {row.items.map((item, itemIdx) => {
                const clipart = item.clipartId ? getClipartById(item.clipartId) : null;

                return (
                  <div
                    key={item.id || itemIdx}
                    className="relative flex flex-col items-center gap-1 p-2 bg-white border-2 rounded-xl transition-all"
                    style={{
                      borderColor: item.isTarget ? "#4f46e5" : "#e2e8f0",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setPickerTarget({ rowIdx, itemIdx })}
                      className="w-12 h-12 flex items-center justify-center text-slate-900 hover:bg-slate-50 rounded-lg"
                      title="Click to change clipart"
                    >
                      {clipart ? clipart.renderSvg(38) : <ImagePlus size={18} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleTarget(rowIdx, itemIdx)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.isTarget
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {item.isTarget ? "Answer (Odd)" : "Normal"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Clipart Picker Modal */}
      {pickerTarget && (
        <ClipartPickerModal
          isOpen={true}
          onClose={() => setPickerTarget(null)}
          onSelect={(clipart) => {
            if ("id" in clipart) {
              const nextRows = [...config.rows];
              const row = { ...nextRows[pickerTarget.rowIdx] };
              const items = [...row.items];
              items[pickerTarget.itemIdx] = {
                ...items[pickerTarget.itemIdx],
                clipartId: clipart.id,
              };
              row.items = items;
              nextRows[pickerTarget.rowIdx] = row;
              onChange({ ...config, rows: nextRows });
            }
          }}
        />
      )}

      {/* Live Preview */}
      <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-white shadow-2xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Print Preview
        </span>
        <CircleTargetPrint config={config} instructionText={instructionText} />
      </div>
    </div>
  );
}

function CircleTargetPrint({
  config,
  instructionText,
  numberLabel,
  marks,
}: KindergartenPrintProps<CircleTargetConfig>) {
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

      <div className="space-y-3 my-1">
        {config.rows.map((row, rIdx) => (
          <div
            key={rIdx}
            className="flex items-center justify-between p-2.5 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/30"
          >
            <span className="font-black text-xs text-slate-500 w-6 select-none">
              ({rIdx + 1})
            </span>
            <div className="flex-1 flex items-center justify-around gap-2 px-2">
              {row.items.map((item, iIdx) => {
                const clipart = item.clipartId ? getClipartById(item.clipartId) : null;

                return (
                  <div
                    key={iIdx}
                    className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-2 border-2 border-slate-800 rounded-2xl bg-white text-slate-950 shadow-2xs"
                  >
                    {clipart ? clipart.renderSvg(48) : <span className="font-bold">{item.text || "★"}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const circleTargetPlugin: KindergartenActivityPlugin<CircleTargetConfig> = {
  type: "KDG_CIRCLE_TARGET",
  label: "Circle the Target / Odd One Out",
  shortLabel: "Circle Item",
  category: "general",
  description: "Rows of clipart images or letters for children to circle the odd or target item.",
  iconName: "CircleDot",
  defaultConfig: circleTargetDefaultConfig,
  validateConfig: (cfg) => {
    if (!cfg || typeof cfg !== "object") return { valid: false, error: "Invalid config" };
    return { valid: true };
  },
  renderEditor: CircleTargetEditor,
  renderPrint: CircleTargetPrint,
  getSummary: (config) => {
    return `${config.mode === "ODD_ONE_OUT" ? "Odd one out" : "Find target"} (${config.rows.length} rows)`;
  },
};
