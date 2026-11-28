"use client";

import { ChoiceChips, EditorShell, Field, InstructionField, PictureChip, RowList, TextListField } from "../editor-kit";
import { wordTokens } from "../hindi";
import type { HindiMissingConfig, HindiMissingRow, KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, Art, PreviewBox } from "./_shared";
import { followAuto } from "../autoInstruction";

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
  // the help box holds the missing pieces as the boxes split them: पतंग → प | तं | ग
  hints: ["आ", "तं", "छा"],
  instruction: "चित्र देखकर छूटा हुआ अक्षर या मात्रा भरिए (Fill in the missing letter or matra):",
};

const ADD_MATRA_DEFAULT: HindiMissingConfig = {
  mode: "ADD_MATRA",
  matra: "ि",
  rows: [
    { text: "लख", answer: "लिख", blanks: [] },
    { text: "सतार", answer: "सितार", blanks: [] },
    { text: "मठाई", answer: "मिठाई", blanks: [] },
    { text: "गन", answer: "गिन", blanks: [] },
    { text: "कताब", answer: "किताब", blanks: [] },
  ],
  hints: [],
  instruction: "इ की मात्रा ( ि ) लगाइए:",
};

const DEFAULTS = { VARNA: VARNA_DEFAULT, MATRA: MATRA_DEFAULT, ADD_MATRA: ADD_MATRA_DEFAULT } as const;

export const hindiMissingDefaultConfig = (): HindiMissingConfig => structuredClone(VARNA_DEFAULT);

/** Matras and signs a word can carry (not the halant or nukta, which are part of a joined letter). */
const MATRA_SIGNS = /[ािीुूृेैोौॅॉंँः]/gu;
const MATRA_NAMES: Record<string, string> = {
  "ा": "आ की मात्रा", "ि": "इ की मात्रा", "ी": "ई की मात्रा", "ु": "उ की मात्रा", "ू": "ऊ की मात्रा", "ृ": "ऋ की मात्रा",
  "े": "ए की मात्रा", "ै": "ऐ की मात्रा", "ो": "ओ की मात्रा", "ौ": "औ की मात्रा", "ं": "अनुस्वार", "ँ": "चंद्रबिंदु", "ः": "विसर्ग",
};

/** The matras and signs found in a word, in order, without repeats. */
export function matrasIn(word: string): string[] {
  return [...new Set(word.match(MATRA_SIGNS) ?? [])];
}

/** The word as printed for the child: every copy of the chosen matra taken out ("सितार" − ि → "सतार"). */
export function stripMatra(word: string, matra: string): string {
  return matra ? word.split(matra).join("") : word;
}

/** "इ की मात्रा ( ि ) लगाइए:" or "विसर्ग ( ः ) लगाइए:". */
export function addMatraInstruction(matra: string): string {
  const name = MATRA_NAMES[matra];
  return name ? `${name} ( ${matra} ) लगाइए:` : ADD_MATRA_DEFAULT.instruction;
}

/**
 * The config after switching what is missing. Untouched starting rows become the other kind's
 * starting rows; rows the teacher wrote are carried over so each still has something to fill in.
 */
export function configForMode(config: HindiMissingConfig, mode: HindiMissingConfig["mode"]): HindiMissingConfig {
  const fromDefault = DEFAULTS[config.mode];
  if (JSON.stringify(config.rows) === JSON.stringify(fromDefault.rows)) return structuredClone(DEFAULTS[mode]);
  const instruction = DEFAULTS[mode].instruction;
  if (mode === "ADD_MATRA") {
    const words = config.rows.map((r) => r.answer ?? r.text);
    const matra = config.matra && words.some((w) => w.includes(config.matra!)) ? config.matra : words.flatMap(matrasIn)[0] ?? "ि";
    return {
      ...config,
      mode,
      matra,
      hints: [],
      instruction: addMatraInstruction(matra),
      rows: config.rows.map((r, i) => ({ ...r, text: stripMatra(words[i], matra), answer: words[i], blanks: [] })),
    };
  }
  // leaving add-the-matra: the full word comes back, with one box left blank
  const rows = config.rows.map((r) => {
    const text = config.mode === "ADD_MATRA" ? (r.answer ?? r.text) : r.text;
    const n = wordTokens(text).length;
    const blanks = r.blanks.filter((b) => b < n);
    return { ...r, text, answer: undefined, blanks: blanks.length || n === 0 ? blanks : [Math.min(1, n - 1)] };
  });
  return { ...config, mode, instruction, rows };
}

/** Words printed without their matra; the child writes the matra in. The key shows the full word. */
function AddMatraWords({ config, showKey }: { config: HindiMissingConfig; showKey?: boolean }) {
  return (
    <div className="flex flex-wrap items-start gap-x-10 gap-y-4 py-1">
      {config.rows.map((row, i) => (
        <div key={i} className="flex flex-col items-center">
          <span className="text-3xl font-black tracking-wide text-slate-950">{row.text}</span>
          {showKey && <span className="text-base font-bold text-emerald-700">{row.answer ?? row.text}</span>}
        </div>
      ))}
    </div>
  );
}

function MissingRows({ config, showKey }: { config: HindiMissingConfig; showKey?: boolean }) {
  if (config.mode === "ADD_MATRA") return <AddMatraWords config={config} showKey={showKey} />;
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
                const fromDefault = DEFAULTS[config.mode];
                const next = configForMode(config, mode);
                onChange(next);
                if (!instructionText.trim() || instructionText === fromDefault.instruction || instructionText === config.instruction) onInstructionChange(next.instruction);
              }}
              options={[
                { value: "VARNA", label: "Letters in order (वर्ण)" },
                { value: "MATRA", label: "Letter or matra in a word" },
                { value: "ADD_MATRA", label: "Add the matra to the word" },
              ]}
            />
            {config.mode === "ADD_MATRA" && (
              <Field label="Matra to take out of the words" hint="Tap the matra the child must add">
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set([...(config.matra ? [config.matra] : []), ...config.rows.flatMap((r) => matrasIn(r.answer ?? ""))])].map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={config.matra === m}
                      onClick={() => {
                        const instruction = followAuto(instructionText || config.instruction, addMatraInstruction(config.matra ?? ""), addMatraInstruction(m));
                        onChange({
                          ...config,
                          matra: m,
                          rows: config.rows.map((r) => ({ ...r, text: stripMatra(r.answer ?? r.text, m) })),
                          instruction,
                        });
                        onInstructionChange(instruction);
                      }}
                      className={`flex h-9 min-w-9 items-center justify-center rounded-md border-2 px-2 text-lg font-bold ${
                        config.matra === m ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-800 bg-white text-slate-900"
                      }`}
                    >
                      ◌{m}
                    </button>
                  ))}
                </div>
              </Field>
            )}
            <RowList<HindiMissingRow>
              label={config.mode === "ADD_MATRA" ? "Words — type the correct spelling" : "Rows — tap a box to blank it"}
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() =>
                config.mode === "VARNA" ? { text: "त थ द ध न", blanks: [2] } : config.mode === "ADD_MATRA" ? { text: "", answer: "", blanks: [] } : { text: "घर", blanks: [0], clipartId: "house" }
              }
              max={6}
              addLabel="Add row"
              renderRow={(row, update) =>
                config.mode === "ADD_MATRA" ? (
                  <div className="flex items-center gap-2">
                    <input
                      aria-label="Correct word"
                      value={row.answer ?? ""}
                      onChange={(e) => update({ ...row, answer: e.target.value, text: stripMatra(e.target.value, config.matra ?? ""), blanks: [] })}
                      placeholder="सितार"
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-base font-semibold"
                    />
                    <span className="text-xs text-slate-500">prints: {row.text || "—"}</span>
                  </div>
                ) : (
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
                )
              }
            />
          </>
        }
        advanced={
          // adding a matra names the matra in the instruction; there is no help box to print
          config.mode === "ADD_MATRA" ? undefined : (
          <TextListField
            label="Help box (letters or matras to choose from)"
            values={config.hints}
            onChange={(hints) => onChange({ ...config, hints })}
            placeholder="ा ि ी"
            hint="Leave empty for no help box."
          />
          )
        }
      />
      <PreviewBox>
        <MissingRows config={config} showKey />
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
  description: "Fill the missing letter in a sequence (क _ ग घ) or the missing letter or matra in a word, or add a matra to words printed without it.",
  iconName: "Type",
  defaultConfig: hindiMissingDefaultConfig,
  validateConfig: (cfg) => {
    const c = cfg as HindiMissingConfig;
    if (!c || !Array.isArray(c.rows) || c.rows.length === 0) return { valid: false, error: "Add at least one row" };
    if (c.mode === "ADD_MATRA") {
      if (c.rows.some((r) => !(r.answer ?? "").trim())) return { valid: false, error: "Type every word or remove the empty ones" };
    } else if (c.rows.some((r) => !r.text.trim() || r.blanks.length === 0)) {
      return { valid: false, error: "Every row needs letters and at least one box left blank" };
    }
    return { valid: true };
  },
  renderEditor: HindiMissingEditor,
  renderPrint: HindiMissingPrint,
  halfWidth: (config) => config.mode !== "ADD_MATRA" && config.hints.length <= 6 && config.rows.every((row) => wordTokens(row.text).length <= 6),
  getSummary: (config) => config.rows.map((r) => r.text).join(" · "),
};
