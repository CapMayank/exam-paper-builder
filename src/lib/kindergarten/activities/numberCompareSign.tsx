"use client";

/** Put the correct sign ( > , < , = ) in the box between two numbers. */
import { EditorShell, InstructionField, NumberStepper, RowList, ToggleRow } from "../editor-kit";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, PreviewBox } from "./_shared";

export interface NumberCompareSignConfig {
  rows: { a: number; b: number }[];
  showHelp: boolean;
  instruction: string;
}

export const numberCompareSignDefaultConfig = (): NumberCompareSignConfig => ({
  rows: [
    { a: 6, b: 6 },
    { a: 9, b: 8 },
    { a: 68, b: 79 },
    { a: 99, b: 99 },
    { a: 82, b: 72 },
  ],
  showHelp: false,
  instruction: "Put the correct sign ( > , < or = ):",
});

export const signOf = (a: number, b: number) => (a > b ? ">" : a < b ? "<" : "=");

export function NumberCompareSignBody({ config, showKey }: { config: NumberCompareSignConfig; showKey?: boolean }) {
  return (
    <div>
      {config.showHelp && <p className="mb-2 text-xs font-semibold text-slate-700">&gt; greater than &nbsp;&nbsp; &lt; less than &nbsp;&nbsp; = equal to</p>}
      <div className="space-y-2.5">
        {config.rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3 text-lg font-bold text-slate-900">
            <span className="min-w-8 text-right">{r.a}</span>
            <span className="inline-flex h-[34px] w-[44px] items-center justify-center rounded-sm border-2 border-slate-800 text-emerald-700">
              {showKey ? signOf(r.a, r.b) : ""}
            </span>
            <span className="min-w-8">{r.b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NumberCompareSignEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<NumberCompareSignConfig>) {
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_NUMBER_COMPARE_SIGN"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <RowList<{ a: number; b: number }>
              label="Pairs of numbers"
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => ({ a: 3, b: 5 })}
              max={10}
              addLabel="Add pair"
              renderRow={(row, update) => (
                <div className="space-y-1">
                  <NumberStepper label="First" value={row.a} min={0} max={100} onChange={(a) => update({ ...row, a })} />
                  <NumberStepper label="Second" value={row.b} min={0} max={100} onChange={(b) => update({ ...row, b })} />
                </div>
              )}
            />
          </>
        }
        advanced={
          <ToggleRow
            label="Show the sign reminder"
            hint="> greater than, < less than, = equal to"
            checked={config.showHelp}
            onChange={(showHelp) => onChange({ ...config, showHelp })}
          />
        }
      />
      <PreviewBox>
        <NumberCompareSignBody config={config} showKey />
      </PreviewBox>
    </div>
  );
}

function NumberCompareSignPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<NumberCompareSignConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <NumberCompareSignBody config={config} />
    </ActivityFrame>
  );
}

export const numberCompareSignPlugin: KindergartenActivityPlugin<NumberCompareSignConfig> = {
  type: "KDG_NUMBER_COMPARE_SIGN",
  label: "Put the correct sign ( > , < , = )",
  shortLabel: "Compare Numbers",
  category: "math",
  description: "Compare two numbers and put >, < or = in the box.",
  iconName: "Scale",
  defaultConfig: numberCompareSignDefaultConfig,
  legacyDefaults: { showHelp: false },
  validateConfig: (cfg) => {
    const c = cfg as NumberCompareSignConfig;
    if (!c || !Array.isArray(c.rows) || c.rows.length === 0) return { valid: false, error: "Add at least one pair" };
    const ok = (n: number) => Number.isInteger(n) && n >= 0 && n <= 100;
    if (c.rows.some((r) => !ok(r.a) || !ok(r.b))) return { valid: false, error: "Use whole numbers from 0 to 100" };
    return { valid: true };
  },
  renderEditor: NumberCompareSignEditor,
  renderPrint: NumberCompareSignPrint,
  halfWidth: () => true,
  getSummary: (config) => config.rows.map((r) => `${r.a}?${r.b}`).join(", "),
};
