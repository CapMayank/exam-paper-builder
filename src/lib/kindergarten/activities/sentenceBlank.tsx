"use client";

/**
 * Fill in the blank in a sentence: "___ is a fan." with the choices in brackets after each sentence
 * or in one word box above all of them. Covers this/that, Hindi sentences and "my shape is ___".
 */
import { ChoiceChips, EditorShell, InstructionField, PictureChip, RowList, TextListField } from "../editor-kit";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { getClipartById } from "../clipartLibrary";
import { ActivityFrame, Art, PreviewBox } from "./_shared";

export interface SentenceBlankRow {
  /** "___" (three or more underscores) marks the blank. */
  text: string;
  answer?: string;
  choices: string[];
  clipartId?: string;
}

export type SentenceChoicesAt = "END" | "TOP";

export interface SentenceBlankConfig {
  rows: SentenceBlankRow[];
  choicesAt: SentenceChoicesAt;
  instruction: string;
}

const BLANK = /_{3,}/;
// A picture id that is not in the clipart library is dropped rather than printed as an empty gap.
const sr = (text: string, answer: string, choices: string[], clipartId?: string): SentenceBlankRow => ({
  text,
  answer,
  choices,
  ...(clipartId && getClipartById(clipartId) ? { clipartId } : {}),
});

export const sentenceBlankDefaultConfig = (): SentenceBlankConfig => ({
  choicesAt: "TOP",
  instruction: "Use 'this' and 'that':",
  rows: [
    sr("___ is a fan.", "This", ["This", "That"], "fan"),
    sr("___ is a cup.", "That", ["This", "That"], "cup"),
    sr("___ is a tree.", "This", ["This", "That"], "tree"),
  ],
});

/** Every row's choices once, in first-seen order, for the shared word box. */
export const sharedChoices = (rows: SentenceBlankRow[]): string[] => [...new Set(rows.flatMap((r) => r.choices.map((c) => c.trim()).filter(Boolean)))];

/** The word box on top is one list: every sentence carries the same choices. */
export const withSharedChoices = (rows: SentenceBlankRow[], words: string[]): SentenceBlankRow[] =>
  rows.map((r) => ({ ...r, choices: [...words] }));

function Blank({ answer, showKey }: { answer?: string; showKey?: boolean }) {
  return (
    // tight leading keeps the line just under the letters instead of at the bottom of the tall sentence line
    <span className="mx-1.5 inline-block min-w-[90px] border-b-2 border-slate-800 px-1 text-center font-bold leading-tight text-emerald-700">
      {showKey ? answer : " "}
    </span>
  );
}

export function SentenceBlankBody({ config, showKey }: { config: SentenceBlankConfig; showKey?: boolean }) {
  const top = config.choicesAt === "TOP";
  const shared = sharedChoices(config.rows);
  return (
    <div className="space-y-3">
      {top && shared.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 rounded-lg border-2 border-slate-800 px-3 py-1.5 text-lg font-bold text-slate-950">
          {shared.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
      )}
      {config.rows.map((r, i) => {
        // A sentence with no marked blank gets one at the end.
        const parts = BLANK.test(r.text) ? r.text.split(BLANK) : [r.text, ""];
        const before = parts[0];
        const after = parts.slice(1).join("");
        const choices = r.choices.map((c) => c.trim()).filter(Boolean);
        return (
          <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-lg font-bold leading-9 text-slate-950">
            {r.clipartId && <Art id={r.clipartId} size={44} />}
            <span>
              {before}
              <Blank answer={r.answer} showKey={showKey} />
              {after}
            </span>
            {!top && choices.length > 0 && <span className="text-slate-700">( {choices.join(" / ")} )</span>}
          </div>
        );
      })}
    </div>
  );
}

function SentenceBlankEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<SentenceBlankConfig>) {
  const input = "min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold";
  const top = config.choicesAt === "TOP";
  const words = sharedChoices(config.rows);
  // a key word the child can't find in the word box
  const missing = top ? [...new Set(config.rows.map((r) => r.answer?.trim() ?? "").filter((a) => a && !words.includes(a)))] : [];
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_SENTENCE_BLANK"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <ChoiceChips<SentenceChoicesAt>
              label="Show the choices"
              value={config.choicesAt}
              options={[
                { value: "END", label: "After each sentence" },
                { value: "TOP", label: "In one box on top" },
              ]}
              onChange={(choicesAt) =>
                // one box on top: every sentence shares the same words
                onChange({ ...config, choicesAt, rows: choicesAt === "TOP" ? withSharedChoices(config.rows, sharedChoices(config.rows)) : config.rows })
              }
            />
            {top && (
              <div>
                <TextListField label="Words in the box" values={words} onChange={(w) => onChange({ ...config, rows: withSharedChoices(config.rows, w) })} />
                {missing.length > 0 && (
                  <p className="mt-1 text-[11px] font-semibold text-amber-700">Not in the box: {missing.join(", ")} — add it so the child can find it.</p>
                )}
              </div>
            )}
            <RowList<SentenceBlankRow>
              label="Sentences — type ___ where the blank goes"
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => ({ text: "___ ", choices: top ? [...words] : [] })}
              max={8}
              addLabel="Add sentence"
              renderRow={(r, update) => (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input aria-label="Sentence" value={r.text} onChange={(e) => update({ ...r, text: e.target.value })} className={input} />
                    <PictureChip clipartId={r.clipartId} onPick={(id) => update({ ...r, clipartId: id })} label="Picture (optional)" />
                    {r.clipartId && (
                      <button type="button" className="text-xs text-slate-400 hover:text-red-600" onClick={() => update({ ...r, clipartId: undefined })}>
                        remove
                      </button>
                    )}
                  </div>
                  <input
                    aria-label="Correct word"
                    placeholder="Correct word (for the key)"
                    value={r.answer ?? ""}
                    onChange={(e) => update({ ...r, answer: e.target.value })}
                    className={`${input} w-full text-emerald-700`}
                  />
                  {!top && <TextListField label="Choices" values={r.choices} onChange={(choices) => update({ ...r, choices })} />}
                </div>
              )}
            />
          </>
        }
      />
      <PreviewBox>
        <SentenceBlankBody config={config} showKey />
      </PreviewBox>
    </div>
  );
}

function SentenceBlankPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<SentenceBlankConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <SentenceBlankBody config={config} />
    </ActivityFrame>
  );
}

export const validSentenceBlank = (cfg: unknown) =>
  cfg && Array.isArray((cfg as SentenceBlankConfig).rows) && (cfg as SentenceBlankConfig).rows.length >= 1
    ? { valid: true }
    : { valid: false, error: "Add at least one sentence" };

export const sentenceBlankPlugin: KindergartenActivityPlugin<SentenceBlankConfig> = {
  type: "KDG_SENTENCE_BLANK",
  label: "Fill in the blank (sentence)",
  shortLabel: "Fill the Blank",
  category: "english",
  description: "Sentences with a blank – the child picks the right word from the choices and writes it in.",
  iconName: "Type",
  defaultConfig: sentenceBlankDefaultConfig,
  validateConfig: validSentenceBlank,
  renderEditor: SentenceBlankEditor,
  renderPrint: SentenceBlankPrint,
  getSummary: (config) => config.rows.map((r) => r.text).join(" "),
};

export const hindiSentenceBlankPlugin: KindergartenActivityPlugin<SentenceBlankConfig> = {
  ...sentenceBlankPlugin,
  type: "KDG_HINDI_SENTENCE_BLANK",
  label: "सही शब्द से रिक्त स्थान भरिए",
  shortLabel: "रिक्त स्थान भरिए",
  category: "hindi",
  description: "Hindi sentences with a blank – the child picks the right word from the brackets.",
  defaultConfig: () => ({
    choicesAt: "END",
    instruction: "सही शब्द से रिक्त स्थान भरिए:",
    rows: [
      sr("जंगल में बंदर ___ खा रहा था ।", "अंगूर", ["अंगूर", "हवा"]),
      sr("पेड़ पर ___ बैठा था ।", "लंगूर", ["लंगूर", "अंगूर"]),
      sr("___ सदैव पूर्व दिशा से उगता है ।", "सूर्य", ["सूर्य", "चाँद"]),
      sr("मछली ___ की रानी है ।", "जल", ["जल", "आकाश"]),
    ],
  }),
};

export const shapeSentencePlugin: KindergartenActivityPlugin<SentenceBlankConfig> = {
  ...sentenceBlankPlugin,
  type: "KDG_SHAPE_SENTENCE",
  label: "Name the shape (I am a … my shape is ___)",
  shortLabel: "Name the Shape",
  category: "math",
  description: "'I am a coin and my shape is ___.' – the child names the shape from a word box.",
  iconName: "Shapes",
  defaultConfig: () => {
    const shapes = ["circle", "square", "rectangle", "triangle"];
    return {
      choicesAt: "TOP",
      instruction: "Name the shape of each picture:",
      rows: [
        sr("I am a coin and my shape is ___.", "circle", shapes, "coin"),
        sr("I am a chess board and my shape is ___.", "square", shapes, "chessboard"),
        sr("I am an envelope and my shape is ___.", "rectangle", shapes, "envelope"),
      ],
    };
  },
};
