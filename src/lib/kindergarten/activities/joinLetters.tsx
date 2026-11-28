"use client";

/**
 * Join the letters to make a word: A + p + p + l + e = ______.
 * Hindi words are split by Unicode code point so a matra stands as its own part, as on the paper
 * (मगर → म + ग + र, अनार → अ + न + ा + र).
 */
import { EditorShell, InstructionField, RowList, TextListField } from "../editor-kit";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, PreviewBox } from "./_shared";

export interface JoinLettersRow {
  parts: string[];
}

export interface JoinLettersConfig {
  rows: JoinLettersRow[];
  instruction: string;
}

/** Code points, not graphemes: Intl.Segmenter would glue the matras on and hide the teaching point. */
export const splitWord = (word: string): string[] => [...word.trim().replace(/\s+/g, "")];

const word = (w: string): JoinLettersRow => ({ parts: splitWord(w) });

export const joinLettersDefaultConfig = (): JoinLettersConfig => ({
  rows: ["Apple", "Ball", "Cat", "Dog", "Egg"].map(word),
  instruction: "Join the letters:",
});

export function JoinLettersBody({ config, showKey }: { config: JoinLettersConfig; showKey?: boolean }) {
  return (
    // one grid for all rows, so every "=" and answer line starts at the same place
    <div className="grid grid-cols-[auto_auto_minmax(6rem,1fr)] items-end gap-x-2 gap-y-3 text-lg font-bold text-slate-950">
      {config.rows.map((r, i) => (
        <div key={i} className="contents">
          <span className="flex items-end gap-x-1.5 whitespace-nowrap">
            {r.parts.map((part, k) => (
              <span key={k} className="flex items-end gap-1.5">
                {k > 0 && <span className="text-slate-600">+</span>}
                <span>{part}</span>
              </span>
            ))}
          </span>
          <span className="px-1 text-slate-600">=</span>
          <span className="inline-block border-b-2 border-slate-800 px-1 text-center leading-7 text-emerald-700">{showKey ? r.parts.join("") : ""}</span>
        </div>
      ))}
    </div>
  );
}

function JoinLettersEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<JoinLettersConfig>) {
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_JOIN_LETTERS"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <RowList<JoinLettersRow>
              label="Words — type the whole word"
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => ({ parts: [] })}
              max={10}
              addLabel="Add word"
              renderRow={(r, update) => (
                <div className="space-y-1.5">
                  <input
                    aria-label="Whole word"
                    placeholder="Type the word to split it into letters"
                    value={r.parts.join("")}
                    onChange={(e) => update({ parts: splitWord(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold"
                  />
                  <TextListField label="Parts (edit to group letters)" values={r.parts} onChange={(parts) => update({ parts })} hint="" />
                </div>
              )}
            />
          </>
        }
      />
      <PreviewBox>
        <JoinLettersBody config={config} showKey />
      </PreviewBox>
    </div>
  );
}

function JoinLettersPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<JoinLettersConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <JoinLettersBody config={config} />
    </ActivityFrame>
  );
}

export const validJoinLetters = (cfg: unknown) =>
  cfg && Array.isArray((cfg as JoinLettersConfig).rows) && (cfg as JoinLettersConfig).rows.length >= 1
    ? { valid: true }
    : { valid: false, error: "Add at least one word" };

export const joinLettersPlugin: KindergartenActivityPlugin<JoinLettersConfig> = {
  type: "KDG_JOIN_LETTERS",
  label: "Join the letters to make a word",
  shortLabel: "Join the Letters",
  category: "english",
  description: "Letters shown with + between them – the child writes the whole word on the line.",
  iconName: "PenTool",
  defaultConfig: joinLettersDefaultConfig,
  validateConfig: validJoinLetters,
  renderEditor: JoinLettersEditor,
  renderPrint: JoinLettersPrint,
  halfWidth: (config) => config.rows.every((r) => r.parts.length <= 5),
  getSummary: (config) => config.rows.map((r) => r.parts.join("")).join(", "),
};

export const hindiJoinLettersPlugin: KindergartenActivityPlugin<JoinLettersConfig> = {
  ...joinLettersPlugin,
  type: "KDG_HINDI_JOIN_LETTERS",
  label: "वर्णों को मिलाकर शब्द बनाइए",
  shortLabel: "वर्ण मिलाइए",
  category: "hindi",
  description: "Hindi letters and matras shown with + between them – the child writes the whole word.",
  defaultConfig: () => ({
    rows: ["शलजम", "उपवन", "सरगम", "मगर"].map(word),
    instruction: "वर्णों को मिलाकर शब्द बनाइए:",
  }),
};
