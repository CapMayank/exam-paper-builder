"use client";

/** What comes after / before / between: a number with an empty box beside it for the missing neighbour. */
import { ChoiceChips, EditorShell, InstructionField, RowList } from "../editor-kit";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, PreviewBox } from "./_shared";

export type NeighbourMode = "AFTER" | "BEFORE" | "BETWEEN";

export interface NumberNeighboursConfig {
  mode: NeighbourMode;
  /** For BETWEEN only `a` is stored; the right-hand number is always a + 2. */
  rows: { a: number; b?: number }[];
  instruction: string;
}

const INSTRUCTIONS: Record<NeighbourMode, string> = {
  AFTER: "Write the number that comes after:",
  BEFORE: "Write the number that comes before:",
  BETWEEN: "Write the number that comes between:",
};

export const numberNeighboursDefaultConfig = (): NumberNeighboursConfig => ({
  mode: "AFTER",
  rows: [6, 15, 8, 19, 9].map((a) => ({ a })),
  instruction: INSTRUCTIONS.AFTER,
});

const answerOf = (mode: NeighbourMode, a: number) => (mode === "BEFORE" ? a - 1 : a + 1);

// a fixed width keeps the boxes in one straight column whatever the number of digits
const num = "w-10 shrink-0 text-center text-lg font-bold text-slate-900";

function Box({ answer }: { answer?: number }) {
  return (
    <span className="inline-flex h-[34px] w-[44px] items-center justify-center rounded-sm border-2 border-slate-800 text-base font-bold text-emerald-700">
      {answer}
    </span>
  );
}

export function NumberNeighboursBody({ config, showKey }: { config: NumberNeighboursConfig; showKey?: boolean }) {
  return (
    <div className="space-y-2.5">
      {config.rows.map((r, i) => {
        const ans = showKey ? answerOf(config.mode, r.a) : undefined;
        return (
          <div key={i} className="flex items-center gap-3">
            {config.mode === "BEFORE" && <Box answer={ans} />}
            <span className={num}>{r.a}</span>
            {config.mode === "AFTER" && <Box answer={ans} />}
            {config.mode === "BETWEEN" && (
              <>
                <Box answer={ans} />
                <span className={num}>{r.a + 2}</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NumberNeighboursEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<NumberNeighboursConfig>) {
  const setMode = (mode: NeighbourMode) => {
    onChange({ ...config, mode, instruction: INSTRUCTIONS[mode] });
    onInstructionChange(INSTRUCTIONS[mode]);
  };
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_NUMBER_NEIGHBOURS"
        basic={
          <>
            <ChoiceChips
              label="Find the number"
              value={config.mode}
              options={[
                { value: "AFTER", label: "After" },
                { value: "BEFORE", label: "Before" },
                { value: "BETWEEN", label: "Between" },
              ]}
              onChange={setMode}
            />
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <RowList<{ a: number; b?: number }>
              label={config.mode === "BETWEEN" ? "First number (the next one is 2 more)" : "Numbers"}
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => ({ a: 1 })}
              max={10}
              addLabel="Add number"
              renderRow={(row, update) => (
                <input
                  type="number"
                  aria-label="Number"
                  value={row.a}
                  onChange={(e) => update({ a: Number(e.target.value) || 0 })}
                  className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold"
                />
              )}
            />
          </>
        }
      />
      <PreviewBox>
        <NumberNeighboursBody config={config} showKey />
      </PreviewBox>
    </div>
  );
}

function NumberNeighboursPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<NumberNeighboursConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <NumberNeighboursBody config={config} />
    </ActivityFrame>
  );
}

export const numberNeighboursPlugin: KindergartenActivityPlugin<NumberNeighboursConfig> = {
  type: "KDG_NUMBER_NEIGHBOURS",
  label: "What comes after / before / between",
  shortLabel: "Number Neighbours",
  category: "math",
  description: "Write the number that comes after, before or between the given numbers.",
  iconName: "Hash",
  defaultConfig: numberNeighboursDefaultConfig,
  validateConfig: (cfg) =>
    cfg && Array.isArray((cfg as NumberNeighboursConfig).rows) && (cfg as NumberNeighboursConfig).rows.length > 0
      ? { valid: true }
      : { valid: false, error: "Add at least one number" },
  renderEditor: NumberNeighboursEditor,
  renderPrint: NumberNeighboursPrint,
  halfWidth: () => true,
  getSummary: (config) => `${config.mode.toLowerCase()}: ${config.rows.map((r) => r.a).join(", ")}`,
};
