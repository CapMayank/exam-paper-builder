"use client";

/** What comes after / before / between: a number with an empty box beside it for the missing neighbour. */
import { ChoiceChips, EditorShell, InstructionField, NumberStepper, RowList } from "../editor-kit";
import { followMode } from "../autoInstruction";
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

/** The numbers a row may start from so the answer stays within 0–100 (no "before 0"). */
export const neighbourRange = (mode: NeighbourMode) => ({ min: mode === "BEFORE" ? 1 : 0, max: mode === "AFTER" ? 99 : mode === "BETWEEN" ? 98 : 100 });

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
    const instruction = followMode(instructionText || config.instruction, INSTRUCTIONS, mode);
    const { min, max } = neighbourRange(mode);
    onChange({ ...config, mode, instruction, rows: config.rows.map((r) => ({ ...r, a: Math.min(max, Math.max(min, r.a)) })) });
    onInstructionChange(instruction);
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
                <NumberStepper label="Number" value={row.a} {...neighbourRange(config.mode)} onChange={(a) => update({ ...row, a })} />
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
  validateConfig: (cfg) => {
    const c = cfg as NumberNeighboursConfig;
    if (!c || !Array.isArray(c.rows) || c.rows.length === 0) return { valid: false, error: "Add at least one number" };
    const { min, max } = neighbourRange(c.mode);
    if (c.rows.some((r) => !Number.isInteger(r.a) || r.a < min || r.a > max)) return { valid: false, error: `Use numbers from ${min} to ${max} so every answer is between 0 and 100` };
    return { valid: true };
  },
  renderEditor: NumberNeighboursEditor,
  renderPrint: NumberNeighboursPrint,
  halfWidth: () => true,
  getSummary: (config) => `${config.mode.toLowerCase()}: ${config.rows.map((r) => r.a).join(", ")}`,
};
