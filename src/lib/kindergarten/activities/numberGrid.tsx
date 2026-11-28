"use client";

import { ChoiceChips, EditorShell, Field, InstructionField, NumberStepper } from "../editor-kit";

import React from "react";
import { MathSquareGrid } from "../components/MathSquareGrid";
import { PreviewBox } from "./_shared";
import { blankPattern, decadeLead, gridOrder, gridShape, numberCells, type BlankPattern, type GridDirection } from "../gridPlacement";
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
    fillDirection: "COLUMN",
    descending: false,
    step: 1,
    cells,
    instruction: "Fill in the missing numbers in the grid (1 to 50):",
  };
};

const BLANK_OPTIONS: { value: BlankPattern; label: string }[] = [
  { value: "NONE", label: "None" },
  { value: "ALTERNATE", label: "Every 2nd" },
  { value: "EVERY_THIRD", label: "Every 3rd" },
  { value: "ALL_BLANK", label: "All but first" },
];

const PRESETS: { label: string; start: number; end: number; columns: number; pattern: BlankPattern; descending?: boolean }[] = [
  { label: "1–20, half missing", start: 1, end: 20, columns: 5, pattern: "ALTERNATE" },
  { label: "1–50, half missing", start: 1, end: 50, columns: 5, pattern: "ALTERNATE" },
  { label: "1–100, half missing", start: 1, end: 100, columns: 10, pattern: "ALTERNATE" },
  { label: "Write 1–50", start: 1, end: 50, columns: 5, pattern: "ALL_BLANK" },
  { label: "Write 100 → 1", start: 1, end: 100, columns: 10, pattern: "ALL_BLANK", descending: true },
];

function NumberGridEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<NumberGridConfig>) {
  const pattern = blankPattern(config.cells);
  const direction = config.fillDirection ?? "ROW";
  const lead = direction === "COLUMN" ? decadeLead(config.cells) : 0;
  const shape = gridShape(config.cells.length, config.columns, direction, lead);
  const columnOptions = [5, 10].includes(config.columns) ? [5, 10] : [config.columns, 5, 10].sort((a, b) => a - b);

  /** New range or pattern; a hand-made pattern keeps the blanks it had for numbers still in range. */
  const rebuild = (start: number, end: number, next: BlankPattern | "CUSTOM" = pattern, desc: boolean = !!config.descending) => {
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    let cells: NumberGridCell[];
    if (next === "CUSTOM") {
      const was = new Map(config.cells.map((c) => [Number(c.value), c.isBlank]));
      cells = numberCells(lo, hi, "NONE", desc).map((c) => ({ ...c, isBlank: was.get(c.value) ?? false }));
    } else {
      cells = numberCells(lo, hi, next, desc);
    }
    onChange({ ...config, startNumber: lo, endNumber: hi, descending: desc, cells });
  };

  const toggleCell = (index: number) =>
    onChange({ ...config, cells: config.cells.map((c, i) => (i === index ? { ...c, isBlank: !c.isBlank } : c)) });

  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_NUMBER_GRID"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() =>
                    onChange({ ...config, startNumber: p.start, endNumber: p.end, columns: p.columns, fillDirection: p.descending ? "ROW" : "COLUMN", descending: !!p.descending, cells: numberCells(p.start, p.end, p.pattern, p.descending) })
                  }
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <NumberStepper label="From" value={config.startNumber} min={0} max={100} onChange={(n) => rebuild(n, config.endNumber)} />
            <NumberStepper label="To" value={config.endNumber} min={1} max={100} onChange={(n) => rebuild(config.startNumber, n)} />
            <ChoiceChips<BlankPattern | "CUSTOM">
              label="Numbers left blank"
              value={pattern}
              onChange={(p) => rebuild(config.startNumber, config.endNumber, p)}
              options={pattern === "CUSTOM" ? [...BLANK_OPTIONS, { value: "CUSTOM", label: "Picked by hand" }] : BLANK_OPTIONS}
            />
          </>
        }
        advanced={
          <>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <input type="checkbox" checked={!!config.descending} onChange={(e) => rebuild(config.startNumber, config.endNumber, pattern, e.target.checked)} />
              Count backwards (100 → 1)
            </label>
            <ChoiceChips<GridDirection>
              label="Count"
              value={direction}
              onChange={(fillDirection) => onChange({ ...config, fillDirection })}
              options={[
                { value: "COLUMN", label: "↓ Down each column" },
                { value: "ROW", label: "→ Across each row" },
              ]}
            />
            {/* counting down, each column is one ten (1–10, 11–20 …), so the count of columns follows the range */}
            {direction === "ROW" && (
              <ChoiceChips<number>
                label="Columns"
                value={config.columns}
                onChange={(columns) => onChange({ ...config, columns })}
                options={columnOptions.map((n) => ({ value: n, label: String(n) }))}
              />
            )}
            <Field label="Tap a box to blank it or fill it in" hint={`${config.cells.filter((c) => c.isBlank).length} blanks`}>
              <div className="grid max-h-64 overflow-y-auto rounded-md border-2 border-slate-900 bg-white" style={{ gridTemplateColumns: `repeat(${Math.max(1, shape.columns)}, minmax(0, 1fr))` }}>
                {gridOrder(config.cells.length, config.columns, direction, lead).map((idx, pos) => {
                  const cell = idx === null ? undefined : config.cells[idx];
                  if (!cell || idx === null) return <span key={pos} className="aspect-square border-r border-b border-slate-200 bg-slate-50" />;
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => toggleCell(idx)}
                      aria-pressed={cell.isBlank}
                      aria-label={`${cell.value}${cell.isBlank ? " (blank)" : ""}`}
                      className={`aspect-square border-r border-b border-slate-200 text-center text-xs font-bold transition-colors ${
                        cell.isBlank ? "bg-amber-50 text-amber-500 hover:bg-amber-100" : "bg-white text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {cell.isBlank ? "·" : cell.value}
                    </button>
                  );
                })}
              </div>
            </Field>
          </>
        }
      />
      <PreviewBox>
        <MathSquareGrid cells={config.cells} columns={config.columns} direction={direction} />
      </PreviewBox>
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

      <MathSquareGrid cells={config.cells} columns={config.columns} direction={config.fillDirection ?? "ROW"} />
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
  legacyDefaults: { fillDirection: "ROW" },
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
