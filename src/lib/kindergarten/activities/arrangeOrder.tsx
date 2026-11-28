"use client";

/**
 * Arrange in order: letters in alphabetical order, numbers smallest-first or biggest-first, or a
 * jumbled word to write correctly (दबूँ → बूँद).
 */
import { ChoiceChips, EditorShell, InstructionField, RowList, TextListField } from "../editor-kit";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { mixedOrder } from "../seeded";
import { ActivityFrame, PreviewBox } from "./_shared";

export type ArrangeMode = "ALPHABETICAL" | "ASCENDING" | "DESCENDING" | "UNJUMBLE";

export interface ArrangeRow {
  items: string[];
}

export interface ArrangeOrderConfig {
  mode: ArrangeMode;
  rows: ArrangeRow[];
  instruction: string;
}

const row = (...items: (string | number)[]): ArrangeRow => ({ items: items.map(String) });

const INSTRUCTIONS: Record<ArrangeMode, string> = {
  ALPHABETICAL: "Write the following letters in alphabetical order:",
  ASCENDING: "Arrange the numbers in ascending order:",
  DESCENDING: "Arrange the numbers in descending order:",
  UNJUMBLE: "Rearrange the letters to make the right word:",
};

export const arrangeOrderDefaultConfig = (): ArrangeOrderConfig => ({
  mode: "ALPHABETICAL",
  rows: [row("c", "h", "g", "a", "l")],
  instruction: INSTRUCTIONS.ALPHABETICAL,
});

// Marks that cannot start a word: vowel signs, virama, nukta, anusvara, candrabindu, visarga.
const isHindiMark = (ch: string) => {
  const c = ch.codePointAt(0) ?? 0;
  return (c >= 0x93a && c <= 0x94f) || (c >= 0x900 && c <= 0x903) || c === 0x93c;
};

/**
 * The letters a child moves around: each letter keeps its matra, bindu and halant (बूँद → बूँ + द), as the
 * paper prints दबूँ. Splitting by code point would leave a matra on the wrong letter or on nothing.
 */
export function wordUnits(word: string): string[] {
  const text = word.trim();
  const units: string[] = [];
  for (const ch of text) {
    if (units.length && (isHindiMark(ch) || units[units.length - 1].endsWith("्"))) units[units.length - 1] += ch;
    else units.push(ch);
  }
  return units;
}

/** The word's letters in a repeatable mixed order that differs from the word (when it has 2+ letters). */
export function jumbleWord(word: string): string {
  const units = wordUnits(word);
  if (units.length < 2) return units.join("");
  const out = mixedOrder(units.length, word).map((i) => units[i]);
  // Repeated letters (e.g. "aa") can still spell the word; swap the first two different letters.
  if (out.join("") === units.join("")) {
    const k = out.findIndex((u) => u !== out[0]);
    if (k > 0) [out[0], out[k]] = [out[k], out[0]];
  }
  return out.join("");
}

const isNumeric = (s: string) => s.trim() !== "" && !Number.isNaN(Number(s));

/** The items in the order the mode asks for. */
export function sortedItems(items: string[], mode: ArrangeMode): string[] {
  const numeric = items.every(isNumeric);
  const asc = [...items].sort((a, b) => (numeric ? Number(a) - Number(b) : a.localeCompare(b)));
  return mode === "DESCENDING" ? asc.reverse() : asc;
}

function ArrangeBody({ config, showKey }: { config: ArrangeOrderConfig; showKey?: boolean }) {
  if (config.mode === "UNJUMBLE") {
    return (
      <div className="space-y-3">
        {config.rows.map((r, i) => {
          const w = r.items[0] ?? "";
          return (
            <div key={i} className="flex items-end gap-3 text-lg font-bold text-slate-950">
              <span className="tracking-widest">{jumbleWord(w)}</span>
              <span className="text-slate-600">–</span>
              <span className="inline-block min-w-24 flex-1 border-b-2 border-slate-800 px-1 text-center leading-7 text-emerald-700">{showKey ? w : ""}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {config.rows.map((r, i) => {
        const done = showKey ? sortedItems(r.items, config.mode) : [];
        return (
          // each item sits straight above its own line, as on the paper
          <div key={i} className="grid gap-x-3 gap-y-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, r.items.length)}, minmax(2.5rem, 1fr))` }}>
            {r.items.map((it, k) => (
              <span key={`i${k}`} className="text-center text-lg font-bold text-slate-950">
                {it}
              </span>
            ))}
            {r.items.map((_, k) => (
              <span key={`l${k}`} className="min-h-8 border-b-2 border-slate-800 text-center text-lg font-bold leading-8 text-emerald-700">
                {done[k]}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ArrangeEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<ArrangeOrderConfig>) {
  const setMode = (mode: ArrangeMode) => {
    // A jumbled-word row holds one word; the other modes hold a list of items.
    const rows = mode === "UNJUMBLE" ? config.rows.map((r) => ({ items: [r.items.join("")] })) : config.rows;
    onChange({ ...config, mode, rows, instruction: INSTRUCTIONS[mode] });
    onInstructionChange(INSTRUCTIONS[mode]);
  };
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_ARRANGE_ORDER"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <ChoiceChips<ArrangeMode>
              label="Arrange"
              value={config.mode}
              options={[
                { value: "ALPHABETICAL", label: "A to Z" },
                { value: "ASCENDING", label: "Smallest first" },
                { value: "DESCENDING", label: "Biggest first" },
                { value: "UNJUMBLE", label: "Jumbled word" },
              ]}
              onChange={setMode}
            />
            <RowList<ArrangeRow>
              label={config.mode === "UNJUMBLE" ? "Words — type the correct word" : "Rows — letters or numbers to arrange"}
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => ({ items: [] })}
              max={8}
              addLabel="Add row"
              renderRow={(r, update) =>
                config.mode === "UNJUMBLE" ? (
                  <input
                    aria-label="Correct word"
                    value={r.items[0] ?? ""}
                    onChange={(e) => update({ items: [e.target.value] })}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold"
                  />
                ) : (
                  <TextListField label="Items" values={r.items} onChange={(items) => update({ items })} placeholder="Type, press Enter" />
                )
              }
            />
          </>
        }
      />
      <PreviewBox>
        <ArrangeBody config={config} showKey />
      </PreviewBox>
    </div>
  );
}

function ArrangePrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<ArrangeOrderConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <ArrangeBody config={config} />
    </ActivityFrame>
  );
}

export const validArrangeOrder = (cfg: unknown) =>
  cfg && Array.isArray((cfg as ArrangeOrderConfig).rows) && (cfg as ArrangeOrderConfig).rows.length >= 1
    ? { valid: true }
    : { valid: false, error: "Add at least one row" };

export const arrangeOrderPlugin: KindergartenActivityPlugin<ArrangeOrderConfig> = {
  type: "KDG_ARRANGE_ORDER",
  label: "Write in alphabetical order",
  shortLabel: "Alphabetical Order",
  category: "english",
  description: "Letters or words jumbled in a row – the child writes them in alphabetical order.",
  iconName: "ListChecks",
  defaultConfig: arrangeOrderDefaultConfig,
  validateConfig: validArrangeOrder,
  renderEditor: ArrangeEditor,
  renderPrint: ArrangePrint,
  halfWidth: (config) => config.mode === "UNJUMBLE" || config.rows.every((r) => r.items.length <= 5),
  getSummary: (config) => config.rows.map((r) => r.items.join(" ")).join(" | "),
};

export const numberOrderPlugin: KindergartenActivityPlugin<ArrangeOrderConfig> = {
  ...arrangeOrderPlugin,
  type: "KDG_NUMBER_ORDER",
  label: "Arrange numbers in order (ascending / descending)",
  shortLabel: "Number Order",
  category: "math",
  description: "Numbers in a row – the child writes them smallest-first or biggest-first.",
  iconName: "TrendingUp",
  defaultConfig: () => ({
    mode: "ASCENDING",
    rows: [row(6, 5, 4, 3), row(8, 3, 9, 7)],
    instruction: INSTRUCTIONS.ASCENDING,
  }),
};

export const hindiUnjumblePlugin: KindergartenActivityPlugin<ArrangeOrderConfig> = {
  ...arrangeOrderPlugin,
  type: "KDG_HINDI_UNJUMBLE",
  label: "अक्षरों को उचित क्रम में लगाकर शब्द लिखिए",
  shortLabel: "शब्द बनाइए",
  category: "hindi",
  description: "A jumbled Hindi word – the child writes it correctly (दबूँ → बूँद).",
  iconName: "Type",
  defaultConfig: () => ({
    mode: "UNJUMBLE",
    rows: [row("बूँद"), row("झाँसी"), row("कमल")],
    instruction: "अक्षरों को उचित क्रम में लगाकर सही शब्द लिखिए:",
  }),
};
