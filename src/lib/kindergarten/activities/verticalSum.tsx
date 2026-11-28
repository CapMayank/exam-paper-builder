"use client";

/** Sums written one below the other (add, subtract, multiply), with an empty answer box under each. */
import { ChoiceChips, EditorShell, InstructionField, RowList, ToggleRow } from "../editor-kit";
import { followMode } from "../autoInstruction";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, PreviewBox } from "./_shared";

export type VerticalSumOp = "ADD" | "SUBTRACT" | "MULTIPLY";

export interface VerticalSumConfig {
  op: VerticalSumOp;
  rows: { a: number; b: number }[];
  /** Show T / O (tens / ones) column headers and keep every digit in its own column. */
  placeValue: boolean;
  instruction: string;
}

const INSTRUCTIONS: Record<VerticalSumOp, string> = {
  ADD: "Add:",
  SUBTRACT: "Subtract:",
  MULTIPLY: "Multiply:",
};
const SIGNS: Record<VerticalSumOp, string> = { ADD: "+", SUBTRACT: "−", MULTIPLY: "×" };
const HEADERS = ["O", "T", "H", "Th"];

export const verticalSumDefaultConfig = (): VerticalSumConfig => ({
  op: "ADD",
  rows: [
    { a: 5, b: 4 },
    { a: 7, b: 2 },
    { a: 3, b: 5 },
    { a: 6, b: 3 },
    { a: 5, b: 5 },
  ],
  placeValue: false,
  instruction: INSTRUCTIONS.ADD,
});

export const sumResult = (op: VerticalSumOp, a: number, b: number) => (op === "ADD" ? a + b : op === "SUBTRACT" ? a - b : a * b);

function SumBlock({ op, a, b, cols, showKey, placeValue }: { op: VerticalSumOp; a: number; b: number; cols: number; showKey?: boolean; placeValue: boolean }) {
  const result = sumResult(op, a, b);
  const resultText = String(result);
  const pad = (n: number) => String(n).padStart(cols, " ").split("");
  const cell = "flex h-8 items-center justify-center text-xl font-bold text-slate-900";
  const gridStyle = { gridTemplateColumns: `1.25rem repeat(${cols}, 1.75rem)` };
  return (
    <div className="inline-block">
      <div className="grid" style={gridStyle}>
        {placeValue &&
          [<span key="h0" />, ...Array.from({ length: cols }, (_, i) => (
            <span key={i} className="flex h-6 items-center justify-center border-b border-slate-400 text-xs font-bold text-slate-600">
              {HEADERS[cols - 1 - i] ?? ""}
            </span>
          ))]}
        <span />
        {pad(a).map((d, i) => (
          <span key={`a${i}`} className={cell}>
            {d.trim()}
          </span>
        ))}
        <span className={cell}>{SIGNS[op]}</span>
        {pad(b).map((d, i) => (
          <span key={`b${i}`} className={cell}>
            {d.trim()}
          </span>
        ))}
        <span className="col-span-full h-0.5 bg-slate-900" />
      </div>
      <div
        className="mt-1 flex h-9 items-center justify-end rounded-sm border-2 border-slate-800 px-2 text-xl font-bold text-emerald-700"
        // a one-digit sum is only one column wide; the box still needs room for a child's handwriting
        style={{ marginLeft: "1.25rem", minWidth: "3rem" }}
      >
        {showKey ? resultText.replace("-", "−") : ""}
      </div>
    </div>
  );
}

/**
 * Digit columns shared by every sum in the activity: wide enough for all numbers and answers, so every sum
 * looks the same and a wider block never hints that the answer has more digits.
 */
export const sumColumns = (config: VerticalSumConfig) =>
  Math.max(1, ...config.rows.flatMap((r) => [r.a, r.b, sumResult(config.op, r.a, r.b)].map((n) => String(Math.abs(n)).length)));

export function VerticalSumBody({ config, showKey }: { config: VerticalSumConfig; showKey?: boolean }) {
  const cols = sumColumns(config);
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-4">
      {config.rows.map((r, i) => (
        <SumBlock key={i} op={config.op} a={r.a} b={r.b} cols={cols} showKey={showKey} placeValue={config.placeValue} />
      ))}
    </div>
  );
}

function VerticalSumEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<VerticalSumConfig>) {
  const input = "w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold";
  const setOp = (op: VerticalSumOp) => {
    const instruction = followMode(instructionText || config.instruction, INSTRUCTIONS, op);
    onChange({ ...config, op, instruction });
    onInstructionChange(instruction);
  };
  const negatives = config.op === "SUBTRACT" && config.rows.some((r) => r.a < r.b);
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_VERTICAL_SUM"
        basic={
          <>
            <ChoiceChips
              label="Sign"
              value={config.op}
              options={[
                { value: "ADD", label: "+ Add" },
                { value: "SUBTRACT", label: "− Subtract" },
                { value: "MULTIPLY", label: "× Multiply" },
              ]}
              onChange={setOp}
            />
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <RowList<{ a: number; b: number }>
              label="Sums"
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => ({ a: 1, b: 1 })}
              max={10}
              addLabel="Add sum"
              renderRow={(row, update) => (
                <div className="flex items-center gap-1.5">
                  <input type="number" aria-label="First number" value={row.a} onChange={(e) => update({ ...row, a: Math.max(0, Number(e.target.value) || 0) })} className={input} />
                  <span className="text-sm font-bold text-slate-500">{SIGNS[config.op]}</span>
                  <input type="number" aria-label="Second number" value={row.b} onChange={(e) => update({ ...row, b: Math.max(0, Number(e.target.value) || 0) })} className={input} />
                </div>
              )}
            />
            {negatives && <p className="text-xs font-semibold text-amber-700">Some sums take away a bigger number, so the answer is below zero.</p>}
          </>
        }
        advanced={
          <ToggleRow
            label="Show T and O columns"
            hint="Tens and ones headings for 2-digit sums"
            checked={config.placeValue}
            onChange={(placeValue) => onChange({ ...config, placeValue })}
          />
        }
      />
      <PreviewBox>
        <VerticalSumBody config={config} showKey />
      </PreviewBox>
    </div>
  );
}

function VerticalSumPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<VerticalSumConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <VerticalSumBody config={config} />
    </ActivityFrame>
  );
}

export const verticalSumPlugin: KindergartenActivityPlugin<VerticalSumConfig> = {
  type: "KDG_VERTICAL_SUM",
  label: "Sums written one below the other (+ − ×)",
  shortLabel: "Vertical Sums",
  category: "math",
  description: "Add, subtract or multiply with the numbers stacked, and a box for the answer.",
  iconName: "Calculator",
  defaultConfig: verticalSumDefaultConfig,
  legacyDefaults: { placeValue: false },
  validateConfig: (cfg) => {
    const c = cfg as VerticalSumConfig;
    if (!c || !Array.isArray(c.rows) || c.rows.length === 0) return { valid: false, error: "Add at least one sum" };
    // KG children have not met numbers below zero
    if (c.op === "SUBTRACT" && c.rows.some((r) => r.a < r.b)) return { valid: false, error: "Each take-away needs the bigger number on top" };
    return { valid: true };
  },
  renderEditor: VerticalSumEditor,
  renderPrint: VerticalSumPrint,
  // up to 3 sums fit side by side in half the page
  halfWidth: (config) => config.rows.length <= 3,
  getSummary: (config) => config.rows.map((r) => `${r.a}${SIGNS[config.op]}${r.b}`).join(", "),
};
