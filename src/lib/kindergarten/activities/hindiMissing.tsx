"use client";

import { ChoiceChips, EditorShell, InstructionField, PictureChip, RowList, TextListField } from "../editor-kit";
import { wordTokens } from "../hindi";
import type { HindiMissingConfig, HindiMissingRow, KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, Art, PreviewBox } from "./_shared";

const VARNA_DEFAULT: HindiMissingConfig = {
  mode: "VARNA",
  rows: [
    { text: "क ख ग घ ङ", blanks: [2] },
    { text: "च छ ज झ ञ", blanks: [1, 3] },
    { text: "प फ ब भ म", blanks: [2, 4] },
  ],
  hints: [],
  instruction: "छूटे हुए अक्षर लिखिए (Write the missing letters):",
};

const MATRA_DEFAULT: HindiMissingConfig = {
  mode: "MATRA",
  rows: [
    { text: "आम", blanks: [0], clipartId: "mango" },
    { text: "पतंग", blanks: [1], clipartId: "kite" },
    { text: "छाता", blanks: [0], clipartId: "umbrella" },
  ],
  hints: ["आ", "त", "छा"],
  instruction: "चित्र देखकर छूटा हुआ अक्षर या मात्रा भरिए (Fill in the missing letter or matra):",
};

export const hindiMissingDefaultConfig = (): HindiMissingConfig => structuredClone(VARNA_DEFAULT);

function MissingRows({ config }: { config: HindiMissingConfig }) {
  return (
    <div className="space-y-3">
      {config.hints.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-400 px-3 py-1.5">
          <span className="text-xs font-bold text-slate-600">सहायता:</span>
          {config.hints.map((h, i) => (
            <span key={i} className="text-lg font-bold text-slate-900">
              {h}
            </span>
          ))}
        </div>
      )}
      {config.rows.map((row, r) => (
        <div key={r} className="flex flex-wrap items-center gap-2">
          {row.clipartId && <Art id={row.clipartId} size={42} />}
          {wordTokens(row.text).map((t, i) =>
            row.blanks.includes(i) ? (
              <span key={i} className="inline-block h-11 w-11 rounded-md border-2 border-dashed border-slate-800" aria-label="blank" />
            ) : (
              <span key={i} className="inline-flex h-11 min-w-11 items-center justify-center rounded-md border-2 border-slate-800 px-1 text-xl font-bold text-slate-950">
                {t}
              </span>
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function HindiMissingEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<HindiMissingConfig>) {
  const toggle = (row: HindiMissingRow, i: number): HindiMissingRow => ({
    ...row,
    blanks: row.blanks.includes(i) ? row.blanks.filter((b) => b !== i) : [...row.blanks, i].sort((a, b) => a - b),
  });
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_HINDI_MISSING"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <ChoiceChips<HindiMissingConfig["mode"]>
              label="What is missing"
              value={config.mode}
              onChange={(mode) => {
                const target = mode === "VARNA" ? VARNA_DEFAULT : MATRA_DEFAULT;
                const fromDefault = config.mode === "VARNA" ? VARNA_DEFAULT : MATRA_DEFAULT;
                // starting rows are swapped for the other kind's; rows the teacher wrote are kept
                const untouched = JSON.stringify(config.rows) === JSON.stringify(fromDefault.rows);
                const next = untouched ? structuredClone(target) : { ...config, mode, instruction: target.instruction };
                onChange(next);
                if (!instructionText.trim() || instructionText === fromDefault.instruction) onInstructionChange(target.instruction);
              }}
              options={[
                { value: "VARNA", label: "Letters in order (वर्ण)" },
                { value: "MATRA", label: "Letter or matra in a word" },
              ]}
            />
            <RowList<HindiMissingRow>
              label="Rows — tap a box to blank it"
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => (config.mode === "VARNA" ? { text: "त थ द ध न", blanks: [2] } : { text: "घर", blanks: [0], clipartId: "house" })}
              max={6}
              addLabel="Add row"
              renderRow={(row, update) => (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    {config.mode === "MATRA" && <PictureChip clipartId={row.clipartId} onPick={(id) => update({ ...row, clipartId: id })} label="Picture clue" />}
                    <input
                      aria-label={config.mode === "VARNA" ? "Letters, with spaces" : "Word"}
                      value={row.text}
                      onChange={(e) => {
                        const n = wordTokens(e.target.value).length;
                        update({ ...row, text: e.target.value, blanks: row.blanks.filter((b) => b < n) });
                      }}
                      placeholder={config.mode === "VARNA" ? "क ख ग घ" : "कमल"}
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-base font-semibold"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {wordTokens(row.text).map((t, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-pressed={row.blanks.includes(i)}
                        onClick={() => update(toggle(row, i))}
                        className={`flex h-9 min-w-9 items-center justify-center rounded-md border-2 px-1 text-base font-bold ${
                          row.blanks.includes(i) ? "border-dashed border-amber-500 bg-amber-50 text-amber-600" : "border-slate-800 bg-white text-slate-900"
                        }`}
                      >
                        {row.blanks.includes(i) ? "_" : t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            />
          </>
        }
        advanced={
          <TextListField
            label="Help box (letters or matras to choose from)"
            values={config.hints}
            onChange={(hints) => onChange({ ...config, hints })}
            placeholder="ा ि ी"
            hint="Leave empty for no help box."
          />
        }
      />
      <PreviewBox>
        <MissingRows config={config} />
      </PreviewBox>
    </div>
  );
}

function HindiMissingPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<HindiMissingConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <MissingRows config={config} />
    </ActivityFrame>
  );
}

export const hindiMissingPlugin: KindergartenActivityPlugin<HindiMissingConfig> = {
  type: "KDG_HINDI_MISSING",
  label: "Missing varna / matra",
  shortLabel: "Missing Varna/Matra",
  category: "hindi",
  description: "Fill the missing letter in a sequence (क _ ग घ) or the missing letter or matra in a word.",
  iconName: "Type",
  defaultConfig: hindiMissingDefaultConfig,
  validateConfig: (cfg) => (cfg && Array.isArray((cfg as HindiMissingConfig).rows) ? { valid: true } : { valid: false, error: "Invalid config" }),
  renderEditor: HindiMissingEditor,
  renderPrint: HindiMissingPrint,
  halfWidth: (config) => config.hints.length <= 6 && config.rows.every((row) => wordTokens(row.text).length <= 6),
  getSummary: (config) => config.rows.map((r) => r.text).join(" · "),
};
