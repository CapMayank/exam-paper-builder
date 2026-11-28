"use client";

/** Put the correct sign ( > , < , = ) in the box between two numbers. */
import { EditorShell, InstructionField, RowList, ToggleRow } from "../editor-kit";
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
  const input = "w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold";
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
              makeRow={() => ({ a: 0, b: 0 })}
              max={10}
              addLabel="Add pair"
              renderRow={(row, update) => (
                <div className="flex items-center gap-1.5">
                  <input type="number" aria-label="First number" value={row.a} onChange={(e) => update({ ...row, a: Number(e.target.value) || 0 })} className={input} />
                  <span className="text-xs text-slate-400">?</span>
                  <input type="number" aria-label="Second number" value={row.b} onChange={(e) => update({ ...row, b: Number(e.target.value) || 0 })} className={input} />
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
  validateConfig: (cfg) =>
    cfg && Array.isArray((cfg as NumberCompareSignConfig).rows) && (cfg as NumberCompareSignConfig).rows.length > 0
      ? { valid: true }
      : { valid: false, error: "Add at least one pair" },
  renderEditor: NumberCompareSignEditor,
  renderPrint: NumberCompareSignPrint,
  halfWidth: () => true,
  getSummary: (config) => config.rows.map((r) => `${r.a}?${r.b}`).join(", "),
};
