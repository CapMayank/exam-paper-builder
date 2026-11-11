"use client";

import { useMemo, useState } from "react";
import { Modal } from "./ui";
import { QuestionContent } from "./QuestionContent";
import {
  buildStatTableLatex,
  buildTableLatex,
  TABLE_PRESETS,
  type TablePreset,
} from "@/lib/tableUtils";
import {
  Calculator,
  Columns,
  Grid,
  Plus,
  Rows,
  Sparkles,
  Table as TableIcon,
  Trash2,
} from "lucide-react";

export interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (snippet: string) => void;
  initialMode?: "grid" | "stat";
}

export function TableModal({
  isOpen,
  onClose,
  onInsert,
  initialMode = "grid",
}: TableModalProps) {
  const [mode, setMode] = useState<"grid" | "stat">(initialMode);

  // --- Grid Table State ---
  const [colCount, setColCount] = useState<number>(3);
  const [rowCount, setRowCount] = useState<number>(3);
  const [hasHeader, setHasHeader] = useState<boolean>(true);
  const [headers, setHeaders] = useState<string[]>([
    "Parameter",
    "Sample A",
    "Sample B",
  ]);
  const [gridData, setGridData] = useState<string[][]>([
    ["Colour", "Blue", "Colourless"],
    ["pH Value", "4.5", "7.0"],
    ["Action on Litmus", "Turns red", "No change"],
  ]);

  // --- Statistics Table State (CBSE 2-row horizontal layout) ---
  const [statHeaders, setStatHeaders] = useState({
    col1: "Class Interval",
    col2: "Frequency",
  });
  const [statCols, setStatCols] = useState([
    { col1: "0-10", col2: "5" },
    { col1: "10-20", col2: "8" },
    { col1: "20-30", col2: "12" },
    { col1: "30-40", col2: "15" },
    { col1: "40-50", col2: "10" },
  ]);

  // Helper to sync dimensions when user edits rowCount / colCount directly
  function updateDimensions(newRows: number, newCols: number) {
    const clampedRows = Math.max(1, Math.min(20, newRows));
    const clampedCols = Math.max(1, Math.min(10, newCols));

    setRowCount(clampedRows);
    setColCount(clampedCols);

    // Resize headers
    setHeaders((prev) => {
      const next = [...prev];
      while (next.length < clampedCols) {
        next.push(`Column ${next.length + 1}`);
      }
      return next.slice(0, clampedCols);
    });

    // Resize grid rows
    setGridData((prev) => {
      const next: string[][] = [];
      for (let r = 0; r < clampedRows; r++) {
        const row = prev[r] ? [...prev[r]] : [];
        while (row.length < clampedCols) {
          row.push("");
        }
        next.push(row.slice(0, clampedCols));
      }
      return next;
    });
  }

  function handleAddRow() {
    updateDimensions(rowCount + 1, colCount);
  }

  function handleRemoveRow(rowIdx: number) {
    if (rowCount <= 1) return;
    setGridData((prev) => prev.filter((_, i) => i !== rowIdx));
    setRowCount((prev) => Math.max(1, prev - 1));
  }

  function handleAddCol() {
    updateDimensions(rowCount, colCount + 1);
  }

  function handleRemoveCol(colIdx: number) {
    if (colCount <= 1) return;
    setHeaders((prev) => prev.filter((_, j) => j !== colIdx));
    setGridData((prev) => prev.map((row) => row.filter((_, j) => j !== colIdx)));
    setColCount((prev) => Math.max(1, prev - 1));
  }

  function applyPreset(preset: TablePreset) {
    const pCols = preset.headers.length;
    const pRows = preset.rows.length;
    setColCount(pCols);
    setRowCount(pRows);
    setHasHeader(true);
    setHeaders([...preset.headers]);
    setGridData(preset.rows.map((r) => [...r]));
  }

  // Live snippet computation
  const previewSnippet = useMemo(() => {
    if (mode === "grid") {
      return buildTableLatex(headers, gridData, hasHeader);
    } else {
      return buildStatTableLatex(statHeaders.col1, statHeaders.col2, statCols);
    }
  }, [mode, headers, gridData, hasHeader, statHeaders, statCols]);

  function handleInsert() {
    if (!previewSnippet) return;
    onInsert(previewSnippet);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <Modal
      title="Insert Table into Question"
      subtitle="Design a custom table with required rows and columns, or a board-standard statistics table."
      onClose={onClose}
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setMode("grid")}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition ${
              mode === "grid"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Grid size={14} className="text-indigo-600" />
            Custom Grid Table (Rows × Cols)
          </button>
          <button
            type="button"
            onClick={() => setMode("stat")}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition ${
              mode === "stat"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calculator size={14} className="text-emerald-600" />
            Statistics Table (CBSE 2-Row)
          </button>
        </div>

        {/* MODE 1: CUSTOM GRID TABLE */}
        {mode === "grid" && (
          <div className="space-y-3.5">
            {/* Dimension Controls & Options */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Columns Stepper */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Columns size={13} className="text-slate-500" />
                      Columns:
                    </label>
                    <div className="flex items-center">
                      <button
                        type="button"
                        disabled={colCount <= 1}
                        onClick={() => handleRemoveCol(colCount - 1)}
                        className="h-7 w-7 rounded-l border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={colCount}
                        onChange={(e) =>
                          updateDimensions(rowCount, Number(e.target.value) || 1)
                        }
                        className="h-7 w-12 border-y border-slate-300 text-center text-xs font-semibold text-slate-800 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={colCount >= 10}
                        onClick={handleAddCol}
                        className="h-7 w-7 rounded-r border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Rows Stepper */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Rows size={13} className="text-slate-500" />
                      Rows:
                    </label>
                    <div className="flex items-center">
                      <button
                        type="button"
                        disabled={rowCount <= 1}
                        onClick={() => handleRemoveRow(rowCount - 1)}
                        className="h-7 w-7 rounded-l border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={rowCount}
                        onChange={(e) =>
                          updateDimensions(Number(e.target.value) || 1, colCount)
                        }
                        className="h-7 w-12 border-y border-slate-300 text-center text-xs font-semibold text-slate-800 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={rowCount >= 20}
                        onClick={handleAddRow}
                        className="h-7 w-7 rounded-r border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Header Row Toggle */}
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasHeader}
                      onChange={(e) => setHasHeader(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Include Header Row
                  </label>
                </div>

                {/* Quick Add Row / Col Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleAddCol}
                    disabled={colCount >= 10}
                    className="btn btn-xs bg-white text-slate-700 border border-slate-200"
                  >
                    <Plus size={12} /> Add Col
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    disabled={rowCount >= 20}
                    className="btn btn-xs bg-white text-slate-700 border border-slate-200"
                  >
                    <Plus size={12} /> Add Row
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-500" /> Presets:
                </span>
                {TABLE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="rounded bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition"
                    title={p.description}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Grid Table */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <span className="text-xs font-semibold text-slate-700 block">
                Edit Table Cells:
              </span>
              <div className="overflow-x-auto max-w-full pb-2">
                <table className="w-full min-w-max border-collapse text-xs">
                  {hasHeader && (
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200">
                        <th className="w-10 px-2 py-1.5 text-center text-[10px] font-bold text-slate-400">
                          #
                        </th>
                        {headers.map((h, colIdx) => (
                          <th key={colIdx} className="px-1.5 py-1.5">
                            <div className="flex items-center gap-1">
                              <input
                                className="input text-xs py-1 px-2 font-bold text-slate-800 bg-white border-slate-300 w-36"
                                placeholder={`Header ${colIdx + 1}`}
                                value={h}
                                onChange={(e) => {
                                  const copy = [...headers];
                                  copy[colIdx] = e.target.value;
                                  setHeaders(copy);
                                }}
                              />
                              {colCount > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCol(colIdx)}
                                  className="text-slate-400 hover:text-red-500 p-0.5 rounded"
                                  title={`Remove column ${colIdx + 1}`}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {gridData.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="border-b border-slate-100 hover:bg-slate-50/50"
                      >
                        <td className="px-2 py-1 text-center font-mono text-[11px] text-slate-400">
                          {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-1.5 py-1">
                            <input
                              className="input text-xs py-1 px-2 border-slate-200 w-36 focus:border-indigo-400"
                              placeholder={`Row ${rIdx + 1}, Col ${cIdx + 1}`}
                              value={cell}
                              onChange={(e) => {
                                const copy = gridData.map((r, i) =>
                                  i === rIdx
                                    ? r.map((c, j) =>
                                        j === cIdx ? e.target.value : c,
                                      )
                                    : r,
                                );
                                setGridData(copy);
                              }}
                            />
                          </td>
                        ))}
                        <td className="px-1.5 py-1 text-center">
                          {rowCount > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(rIdx)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded"
                              title={`Remove row ${rIdx + 1}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: CBSE STATISTICS TABLE */}
        {mode === "stat" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Header 1 (Row 1 - Interval)</label>
                <input
                  className="input text-xs"
                  value={statHeaders.col1}
                  onChange={(e) =>
                    setStatHeaders({ ...statHeaders, col1: e.target.value })
                  }
                  placeholder="e.g. Class Interval"
                />
              </div>
              <div>
                <label className="label">Header 2 (Row 2 - Frequency)</label>
                <input
                  className="input text-xs"
                  value={statHeaders.col2}
                  onChange={(e) =>
                    setStatHeaders({ ...statHeaders, col2: e.target.value })
                  }
                  placeholder="e.g. Frequency"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="label">Data Columns &amp; Values</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() =>
                    setStatCols([...statCols, { col1: "", col2: "" }])
                  }
                >
                  <Plus size={12} /> Add Column
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {statCols.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 text-xs text-slate-400">#{i + 1}</span>
                    <input
                      className="input text-xs flex-1"
                      placeholder="e.g. 0-10"
                      value={r.col1}
                      onChange={(e) => {
                        const copy = [...statCols];
                        copy[i].col1 = e.target.value;
                        setStatCols(copy);
                      }}
                    />
                    <input
                      className="input text-xs w-28"
                      placeholder="Frequency"
                      value={r.col2}
                      onChange={(e) => {
                        const copy = [...statCols];
                        copy[i].col2 = e.target.value;
                        setStatCols(copy);
                      }}
                    />
                    <button
                      type="button"
                      disabled={statCols.length <= 2}
                      className="rounded p-1 text-slate-400 hover:text-red-600 disabled:opacity-20"
                      onClick={() =>
                        setStatCols(statCols.filter((_, idx) => idx !== i))
                      }
                      title="Remove column"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live Table Preview */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
          <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
            <TableIcon size={13} className="text-indigo-600" />
            Live Table Preview (as shown in exam paper):
          </span>
          <div className="overflow-x-auto py-1">
            <QuestionContent text={previewSnippet} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary flex items-center gap-1.5"
            onClick={handleInsert}
          >
            <Plus size={14} />
            Insert Table into Question
          </button>
        </div>
      </div>
    </Modal>
  );
}
