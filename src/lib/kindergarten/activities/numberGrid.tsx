"use client";

import React from "react";
import { MathSquareGrid } from "../components/MathSquareGrid";
import type {
  KindergartenActivityPlugin,
  KindergartenEditorProps,
  KindergartenPrintProps,
  NumberGridCell,
  NumberGridConfig,
} from "../types";

export const numberGridDefaultConfig = (): NumberGridConfig => {
  const startNumber = 1;
  const endNumber = 50;
  const columns = 10;
  const cells: NumberGridCell[] = [];

  for (let n = startNumber; n <= endNumber; n++) {
    // Leave some cells blank for students to fill in
    const isBlank = n % 2 === 0;
    cells.push({ value: n, isBlank });
  }

  return {
    startNumber,
    endNumber,
    columns,
    step: 1,
    cells,
    instruction: "Fill in the missing numbers in the grid (1 to 50):",
  };
};

function NumberGridEditor({
  config,
  onChange,
  instructionText,
  onInstructionChange,
}: KindergartenEditorProps<NumberGridConfig>) {
  const updateRange = (start: number, end: number, cols: number, blankPattern: "NONE" | "ALTERNATE" | "EVERY_THIRD" | "ALL_BLANK") => {
    const cells: NumberGridCell[] = [];
    for (let n = start; n <= end; n++) {
      let isBlank = false;
      if (blankPattern === "ALTERNATE") isBlank = n % 2 === 0;
      if (blankPattern === "EVERY_THIRD") isBlank = n % 3 === 0;
      if (blankPattern === "ALL_BLANK") isBlank = n !== start; // only start pre-filled
      cells.push({ value: n, isBlank });
    }
    onChange({
      ...config,
      startNumber: start,
      endNumber: end,
      columns: cols,
      cells,
    });
  };

  const toggleCell = (index: number) => {
    const nextCells = [...config.cells];
    if (nextCells[index]) {
      nextCells[index] = {
        ...nextCells[index],
        isBlank: !nextCells[index].isBlank,
      };
      onChange({ ...config, cells: nextCells });
    }
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
          placeholder="e.g. Write numbers from 1 to 50 or Fill in missing numbers"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
        />
      </div>

      {/* Preset Grids */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateRange(1, 20, 5, "ALTERNATE")}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
        >
          1 to 20 (5 cols, Alternate blanks)
        </button>
        <button
          type="button"
          onClick={() => updateRange(1, 50, 10, "ALTERNATE")}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
        >
          1 to 50 (10 cols, Half missing)
        </button>
        <button
          type="button"
          onClick={() => updateRange(1, 100, 10, "ALTERNATE")}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
        >
          1 to 100 (10 cols, Half missing)
        </button>
        <button
          type="button"
          onClick={() => updateRange(1, 50, 10, "ALL_BLANK")}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
        >
          Write 1 to 50 (All blank)
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Start Number</label>
          <input
            type="number"
            value={config.startNumber}
            onChange={(e) =>
              updateRange(Number(e.target.value), config.endNumber, config.columns, "ALTERNATE")
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">End Number</label>
          <input
            type="number"
            value={config.endNumber}
            onChange={(e) =>
              updateRange(config.startNumber, Number(e.target.value), config.columns, "ALTERNATE")
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Grid Columns</label>
          <select
            value={config.columns}
            onChange={(e) =>
              updateRange(config.startNumber, config.endNumber, Number(e.target.value), "ALTERNATE")
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value={5}>5 Columns</option>
            <option value={10}>10 Columns</option>
          </select>
        </div>
      </div>

      {/* Interactive Grid Cell Toggle */}
      <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-white shadow-2xs">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Click any cell to toggle it between Blank / Pre-filled
          </span>
          <span className="text-xs text-indigo-600 font-semibold">
            {config.cells.filter((c) => c.isBlank).length} blanks to fill
          </span>
        </div>

        <div
          className="grid border-2 border-slate-900 rounded-md bg-white max-h-64 overflow-y-auto"
          style={{
            gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))`,
          }}
        >
          {config.cells.map((cell, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => toggleCell(idx)}
              className={`p-2 aspect-square text-center font-bold text-sm border-r border-b border-slate-200 transition-colors ${
                cell.isBlank
                  ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                  : "bg-white text-slate-900 hover:bg-slate-100"
              }`}
              title="Click to toggle blank"
            >
              {cell.isBlank ? `[${cell.value}]` : cell.value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NumberGridPrint({
  config,
  instructionText,
  numberLabel,
  marks,
}: KindergartenPrintProps<NumberGridConfig>) {
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

      <MathSquareGrid cells={config.cells} columns={config.columns} />
    </div>
  );
}

export const numberGridPlugin: KindergartenActivityPlugin<NumberGridConfig> = {
  type: "KDG_NUMBER_GRID",
  label: "Number Writing Grid (1 to 50 / 1 to 100)",
  shortLabel: "Number Grid",
  category: "math",
  description: "Math square boxes for numbers 1 to 100 with blank cells for students to fill in.",
  iconName: "Grid",
  defaultConfig: numberGridDefaultConfig,
  validateConfig: (cfg) => {
    if (!cfg || typeof cfg !== "object") return { valid: false, error: "Invalid config" };
    return { valid: true };
  },
  renderEditor: NumberGridEditor,
  renderPrint: NumberGridPrint,
  getSummary: (config) => {
    return `Numbers ${config.startNumber} to ${config.endNumber} (${config.columns} cols)`;
  },
};
