"use client";

import { ChoiceChips, EditorShell, InstructionField, PictureChip, RowList, TextListField } from "../editor-kit";
import { firstLetter } from "../hindi";
import type { HindiFirstLetterConfig, HindiFirstLetterRow, KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, AnswerBox, Art, PreviewBox } from "./_shared";
import { followMode } from "../autoInstruction";
import { FIRST_LETTER_INSTRUCTIONS, padChoices, printedChoices } from "../firstLetterChoices";

export const hindiFirstLetterDefaultConfig = (): HindiFirstLetterConfig => ({
  answerStyle: "CIRCLE",
  rows: [
    { clipartId: "mango", word: "आम", choices: ["आ", "क", "म"] },
    { clipartId: "fish", word: "मछली", choices: ["ल", "म", "छ"] },
    { clipartId: "kite", word: "पतंग", choices: ["प", "त", "ग"] },
    { clipartId: "house", word: "घर", choices: ["र", "क", "घ"] },
  ],
  instruction: FIRST_LETTER_INSTRUCTIONS.hindi.CIRCLE,
});

function FirstLetterRows({ config, showWords }: { config: HindiFirstLetterConfig; showWords?: boolean }) {
  return (
    // two pictures a line, unless a row has so many letters to choose from that it needs the whole width
    <div className={`grid gap-x-6 gap-y-3 ${config.rows.some((r) => r.choices.length > 4) ? "grid-cols-1" : "grid-cols-2"}`}>
      {config.rows.map((row, i) => (
        <div key={i} className="flex min-w-0 items-center gap-3">
          <span className="flex shrink-0 flex-col items-center">
            <Art id={row.clipartId} size={48} />
            {showWords && <span className="text-[11px] text-slate-500">{row.word}</span>}
          </span>
          {config.answerStyle === "WRITE" ? (
            <AnswerBox size={46} />
          ) : (
            <span className="flex min-w-0 flex-wrap gap-2">
              {printedChoices(row).map((c, k) => (
                <span key={k} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-xl font-bold text-slate-950">
                  {c}
                </span>
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function HindiFirstLetterEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<HindiFirstLetterConfig>) {
  /** Keeps the right letter among the choices when the word changes. */
  // wording follows the script of the words, so the English variant reads right
  const latin = /[A-Za-z]/.test(config.rows[0]?.word ?? "");
  const withWord = (row: HindiFirstLetterRow, word: string): HindiFirstLetterRow => {
    const right = firstLetter(word);
    const others = row.choices.filter((c) => c !== firstLetter(row.word)).slice(0, 2);
    return { ...row, word, choices: right ? [right, ...others] : others };
  };
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_HINDI_FIRST_LETTER"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <ChoiceChips<HindiFirstLetterConfig["answerStyle"]>
              label="Child"
              value={config.answerStyle}
              onChange={(answerStyle) => {
                const instruction = followMode(instructionText || config.instruction, FIRST_LETTER_INSTRUCTIONS[latin ? "latin" : "hindi"], answerStyle);
                // circling needs letters to choose from: rows saved for writing may have only the answer
                const rows = answerStyle === "CIRCLE" ? config.rows.map((r) => ({ ...r, choices: padChoices(r) })) : config.rows;
                onChange({ ...config, answerStyle, instruction, rows });
                onInstructionChange(instruction);
              }}
              options={[
                { value: "CIRCLE", label: "Circles the letter" },
                { value: "WRITE", label: "Writes the letter" },
              ]}
            />
            <RowList<HindiFirstLetterRow>
              label="Pictures and their names"
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => (latin ? { clipartId: "sun", word: "Sun", choices: ["S", "N", "U"] } : { clipartId: "sun", word: "सूरज", choices: ["स", "र", "ज"] })}
              max={8}
              addLabel="Add picture"
              renderRow={(row, update) => (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <PictureChip clipartId={row.clipartId} onPick={(id) => update({ ...row, clipartId: id })} />
                    <input
                      aria-label="Picture's name"
                      value={row.word}
                      onChange={(e) => update(withWord(row, e.target.value))}
                      placeholder={latin ? "Apple" : "आम"}
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-base font-semibold"
                    />
                    <span className="text-xs text-slate-500">→ {firstLetter(row.word) || "?"}</span>
                  </div>
                  {config.answerStyle === "CIRCLE" && (
                    <TextListField label="Letters to circle from" values={row.choices} onChange={(choices) => update({ ...row, choices })} placeholder={latin ? "A B C" : "आ क म"} hint="" />
                  )}
                </div>
              )}
            />
          </>
        }
      />
      <PreviewBox>
        <FirstLetterRows config={config} showWords />
      </PreviewBox>
    </div>
  );
}

function HindiFirstLetterPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<HindiFirstLetterConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <FirstLetterRows config={config} />
    </ActivityFrame>
  );
}

export const hindiFirstLetterPlugin: KindergartenActivityPlugin<HindiFirstLetterConfig> = {
  type: "KDG_HINDI_FIRST_LETTER",
  label: "Picture → first letter (Hindi)",
  shortLabel: "First Letter",
  category: "hindi",
  description: "A picture (आम, मछली…); the child circles or writes the first letter of its name.",
  iconName: "Image",
  defaultConfig: hindiFirstLetterDefaultConfig,
  validateConfig: (cfg) => (cfg && Array.isArray((cfg as HindiFirstLetterConfig).rows) ? { valid: true } : { valid: false, error: "Invalid config" }),
  renderEditor: HindiFirstLetterEditor,
  renderPrint: HindiFirstLetterPrint,
  getSummary: (config) => config.rows.map((r) => r.word).join(", "),
};
