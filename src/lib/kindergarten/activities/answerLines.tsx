"use client";

/**
 * Write the answer: a question (or a letter, or a number) with an answer line beside it or under it,
 * or a short numbered list of lines. Covers "What is your name?", "M ____", "9 ____" (number names)
 * and "तीन फलों के नाम लिखिए" (i) (ii) (iii).
 */
import { ChoiceChips, EditorShell, Field, InstructionField, NumberStepper, PictureChip, RowList } from "../editor-kit";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, Art, PreviewBox } from "./_shared";

export interface AnswerLinesRow {
  prompt: string;
  /** Printed in green on the line in the answer key only. */
  answer?: string;
  clipartId?: string;
}

export type AnswerLinesStyle = "BESIDE" | "BELOW" | "LIST";

export interface AnswerLinesConfig {
  rows: AnswerLinesRow[];
  style: AnswerLinesStyle;
  /** Printed before the line, e.g. "Ans." or "उत्तर". May be empty. */
  answerLabel: string;
  /** LIST style: how many (i), (ii), (iii)… lines. */
  listCount: number;
  instruction: string;
}

const row = (prompt: string, answer?: string): AnswerLinesRow => ({ prompt, ...(answer ? { answer } : {}) });

export const answerLinesDefaultConfig = (): AnswerLinesConfig => ({
  style: "BELOW",
  answerLabel: "Ans.",
  listCount: 3,
  rows: [row("What is your name?"), row("In which class do you read?")],
  instruction: "Answer the questions:",
});

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi"];

function Line({ text, showKey, className = "" }: { text?: string; showKey?: boolean; className?: string }) {
  return (
    <span className={`relative inline-block min-w-16 border-b-2 border-slate-800 ${className}`}>
      <span className="block min-h-7 px-1 text-center text-lg font-bold leading-7 text-emerald-700">{showKey ? text : ""}</span>
    </span>
  );
}

export function AnswerLinesBody({ config, showKey }: { config: AnswerLinesConfig; showKey?: boolean }) {
  // older saved configs may lack the label or the line count
  const label = (config.answerLabel ?? "").trim();
  const count = Number.isFinite(config.listCount) ? Math.min(6, Math.max(1, config.listCount)) : 3;
  // wide enough for a short Hindi phrase, so the prompt doesn't wrap onto a second line
  const besideWidth = Math.min(24, Math.max(...config.rows.map((r) => (r.prompt ?? "").length), 1) * 1.3);
  return (
    <div className="space-y-3">
      {config.rows.map((r, i) => {
        const prompt = (
          <span className="flex items-center gap-2">
            {r.clipartId && <Art id={r.clipartId} size={44} />}
            {r.prompt && <span className="text-lg font-bold leading-tight text-slate-950">{r.prompt}</span>}
          </span>
        );
        if (config.style === "BESIDE") {
          return (
            <div key={i} className="flex items-end gap-3">
              {/* prompts share one width so the answer lines start together */}
              <span className="shrink-0" style={{ minWidth: `${besideWidth}ch` }}>
                {prompt}
              </span>
              {label && <span className="text-lg font-bold text-slate-900">{label}</span>}
              <Line text={r.answer} showKey={showKey} className="flex-1" />
            </div>
          );
        }
        if (config.style === "BELOW") {
          return (
            <div key={i} className="space-y-1">
              {prompt}
              <div className="flex items-end gap-2">
                {label && <span className="text-lg font-bold text-slate-900">{label}</span>}
                <Line text={r.answer} showKey={showKey} className="flex-1" />
              </div>
            </div>
          );
        }
        const answers = (r.answer ?? "").split(",").map((x) => x.trim());
        return (
          <div key={i} className="space-y-1.5">
            {prompt}
            {Array.from({ length: count }, (_, k) => (
              <div key={k} className="flex items-end gap-2">
                {label && <span className={`text-lg font-bold text-slate-900 ${k === 0 ? "" : "invisible"}`}>{label}</span>}
                <span className="text-lg font-bold text-slate-900">({ROMAN[k]})</span>
                <Line text={answers[k]} showKey={showKey} className="flex-1" />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function AnswerLinesEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<AnswerLinesConfig>) {
  const input = "min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold";
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_ANSWER_LINES"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <ChoiceChips<AnswerLinesStyle>
              label="Answer line"
              value={config.style}
              options={[
                { value: "BELOW", label: "Under the question" },
                { value: "BESIDE", label: "Beside it" },
                { value: "LIST", label: "Numbered list" },
              ]}
              onChange={(style) => onChange({ ...config, style })}
            />
            <RowList<AnswerLinesRow>
              label="Questions"
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => row("")}
              max={10}
              addLabel="Add question"
              renderRow={(r, update) => (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input aria-label="Question" value={r.prompt} onChange={(e) => update({ ...r, prompt: e.target.value })} className={input} />
                    <PictureChip clipartId={r.clipartId} onPick={(id) => update({ ...r, clipartId: id })} label="Picture (optional)" />
                    {r.clipartId && (
                      <button type="button" className="text-xs text-slate-400 hover:text-red-600" onClick={() => update({ ...r, clipartId: undefined })}>
                        remove
                      </button>
                    )}
                  </div>
                  <input
                    aria-label="Answer for the key (optional)"
                    placeholder={config.style === "LIST" ? "Answer for the key (optional, comma between lines)" : "Answer for the key (optional)"}
                    value={r.answer ?? ""}
                    onChange={(e) => update({ ...r, answer: e.target.value })}
                    className={`${input} w-full text-emerald-700`}
                  />
                </div>
              )}
            />
          </>
        }
        advanced={
          <>
            <Field label="Word before the line" hint='e.g. "Ans." or "उत्तर"'>
              <input aria-label="Answer label" value={config.answerLabel} onChange={(e) => onChange({ ...config, answerLabel: e.target.value })} className={`${input} w-full`} />
            </Field>
            {config.style === "LIST" && <NumberStepper label="Lines in the list" value={config.listCount} min={1} max={6} onChange={(listCount) => onChange({ ...config, listCount })} />}
          </>
        }
      />
      <PreviewBox>
        <AnswerLinesBody config={config} showKey />
      </PreviewBox>
    </div>
  );
}

function AnswerLinesPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<AnswerLinesConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <AnswerLinesBody config={config} />
    </ActivityFrame>
  );
}

export const validAnswerLines = (cfg: unknown) =>
  cfg && Array.isArray((cfg as AnswerLinesConfig).rows) && (cfg as AnswerLinesConfig).rows.length >= 1
    ? { valid: true }
    : { valid: false, error: "Add at least one question" };

export const answerLinesPlugin: KindergartenActivityPlugin<AnswerLinesConfig> = {
  type: "KDG_ANSWER_LINES",
  label: "Write the answer (question & answer line)",
  shortLabel: "Write the Answer",
  category: "english",
  description: "A question with a line to write the answer on – beside it, under it, or as a numbered list.",
  iconName: "Pencil",
  defaultConfig: answerLinesDefaultConfig,
  validateConfig: validAnswerLines,
  renderEditor: AnswerLinesEditor,
  renderPrint: AnswerLinesPrint,
  // beside-style short prompts (a letter or number) fit in half the page
  halfWidth: (config) => config.style === "BESIDE" && config.rows.every((r) => r.prompt.length <= 6 && !r.clipartId),
  getSummary: (config) => config.rows.map((r) => r.prompt).join(", "),
};

export const hindiAnswerLinesPlugin: KindergartenActivityPlugin<AnswerLinesConfig> = {
  ...answerLinesPlugin,
  type: "KDG_HINDI_ANSWER_LINES",
  label: "उत्तर लिखिए (question & answer line)",
  shortLabel: "उत्तर लिखिए",
  category: "hindi",
  description: "A Hindi question with lines to write the answers – e.g. तीन फलों के नाम (i) (ii) (iii).",
  defaultConfig: () => ({
    style: "LIST",
    answerLabel: "उत्तर",
    listCount: 3,
    rows: [row("तीन फलों के नाम लिखिए ।")],
    instruction: "उत्तर लिखिए:",
  }),
};

export const numberNamesPlugin: KindergartenActivityPlugin<AnswerLinesConfig> = {
  ...answerLinesPlugin,
  type: "KDG_NUMBER_NAMES",
  label: "Write the number names",
  shortLabel: "Number Names",
  category: "math",
  description: "A number with a line beside it – the child writes its name (9 → Nine).",
  iconName: "Hash",
  defaultConfig: () => ({
    style: "BESIDE",
    answerLabel: "",
    listCount: 3,
    rows: [row("9", "Nine"), row("20", "Twenty"), row("15", "Fifteen"), row("42", "Forty-two"), row("55", "Fifty-five")],
    instruction: "Write the number names:",
  }),
};
