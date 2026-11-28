"use client";

/**
 * Match the columns: two columns of words, letters or numbers (a picture may stand in for either side),
 * the right one mixed up, and the child draws a line from each to its match.
 * Covers capital ↔ small letters, opposites, rhyming words, अ ↔ अनार, Fifty-nine ↔ 59 and shape ↔ shape.
 */
import { EditorShell, Field, InstructionField, PictureChip, RowList, ToggleRow } from "../editor-kit";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { mixedOrder } from "../seeded";
import { ActivityFrame, Art, PreviewBox } from "./_shared";

export interface TextMatchPair {
  left: string;
  right: string;
  /** A picture shown instead of (or beside) the left text. */
  leftClipartId?: string;
  rightClipartId?: string;
}

export interface TextMatchConfig {
  pairs: TextMatchPair[];
  /** Print the right column mixed up (always the same way for the same pairs). */
  mixRight: boolean;
  leftTitle?: string;
  rightTitle?: string;
  instruction: string;
}

const p = (left: string, right: string): TextMatchPair => ({ left, right });

export const textMatchDefaultConfig = (): TextMatchConfig => ({
  pairs: [p("Happy", "Sad"), p("Up", "Down"), p("Big", "Small"), p("Hot", "Cold"), p("Come", "Go")],
  mixRight: true,
  instruction: "Match the opposites:",
});

/** Right-column order as printed: index into pairs for each printed row. */
export function rightColumnOrder(config: TextMatchConfig): number[] {
  const n = config.pairs.length;
  if (!config.mixRight) return config.pairs.map((_, i) => i);
  return mixedOrder(n, config.pairs.map((x) => `${x.left}|${x.right}`).join("\n"));
}

function Cell({ text, clipartId, align }: { text: string; clipartId?: string; align: "left" | "right" }) {
  return (
    // right-column words start beside their dot; a picture sits on the outer side
    <span className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse justify-end" : ""}`}>
      {clipartId && <Art id={clipartId} size={44} />}
      {text && <span className="whitespace-nowrap text-lg font-bold leading-tight text-slate-950">{text}</span>}
    </span>
  );
}

const Dot = () => <span className="h-3 w-3 shrink-0 rounded-full bg-slate-900" aria-hidden />;

export function TextMatchColumns({ config, showKey }: { config: TextMatchConfig; showKey?: boolean }) {
  const order = rightColumnOrder(config);
  return (
    <div>
      {(config.leftTitle || config.rightTitle) && (
        <div className="mb-1 flex justify-between px-1 text-sm font-bold text-slate-700">
          <span>{config.leftTitle}</span>
          <span>{config.rightTitle}</span>
        </div>
      )}
      {/* one grid for every row: the text columns take the longest item's width, the gap for lines takes the rest */}
      <div className="grid grid-cols-[auto_auto_minmax(2.5rem,1fr)_auto_auto] items-center gap-x-2 gap-y-2.5">
        {config.pairs.map((pair, i) => {
          const right = config.pairs[order[i]] ?? pair;
          return (
            <div key={i} className="contents">
              <Cell text={pair.left} clipartId={pair.leftClipartId} align="left" />
              <Dot />
              {showKey ? (
                <span className="truncate text-center text-[11px] font-semibold text-emerald-700">→ {pair.right}</span>
              ) : (
                <span />
              )}
              <Dot />
              <Cell text={right.right} clipartId={right.rightClipartId} align="right" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TextMatchEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<TextMatchConfig>) {
  const input = "min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold";
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_TEXT_MATCH"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <RowList<TextMatchPair>
              label="Pairs — write each one next to its match"
              rows={config.pairs}
              onChange={(pairs) => onChange({ ...config, pairs })}
              makeRow={() => p("", "")}
              min={2}
              max={8}
              addLabel="Add pair"
              renderRow={(pair, update) => (
                <div className="flex items-center gap-1.5">
                  <input aria-label="Left" value={pair.left} onChange={(e) => update({ ...pair, left: e.target.value })} className={input} />
                  <span className="text-xs text-slate-400">↔</span>
                  <input aria-label="Its match" value={pair.right} onChange={(e) => update({ ...pair, right: e.target.value })} className={input} />
                </div>
              )}
            />
          </>
        }
        advanced={
          <>
            <ToggleRow
              label="Mix up the right column"
              hint="Always mixed the same way, and never left straight across"
              checked={config.mixRight}
              onChange={(mixRight) => onChange({ ...config, mixRight })}
            />
            <Field label="Pictures (optional)" hint="Show a picture on either side">
              <div className="space-y-1.5">
                {config.pairs.map((pair, i) => {
                  const set = (patch: Partial<TextMatchPair>) => onChange({ ...config, pairs: config.pairs.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="w-5 text-center font-bold text-slate-400">{i + 1}</span>
                      <PictureChip clipartId={pair.leftClipartId} onPick={(id) => set({ leftClipartId: id })} label={`Left picture ${i + 1}`} />
                      {pair.leftClipartId && (
                        <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => set({ leftClipartId: undefined })}>
                          remove
                        </button>
                      )}
                      <span className="flex-1" />
                      {pair.rightClipartId && (
                        <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => set({ rightClipartId: undefined })}>
                          remove
                        </button>
                      )}
                      <PictureChip clipartId={pair.rightClipartId} onPick={(id) => set({ rightClipartId: id })} label={`Right picture ${i + 1}`} />
                    </div>
                  );
                })}
              </div>
            </Field>
            <Field label="Column titles (optional)">
              <div className="flex gap-2">
                <input aria-label="Left column title" value={config.leftTitle ?? ""} onChange={(e) => onChange({ ...config, leftTitle: e.target.value })} className={input} />
                <input aria-label="Right column title" value={config.rightTitle ?? ""} onChange={(e) => onChange({ ...config, rightTitle: e.target.value })} className={input} />
              </div>
            </Field>
          </>
        }
      />
      <PreviewBox>
        <TextMatchColumns config={config} showKey />
      </PreviewBox>
    </div>
  );
}

function TextMatchPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<TextMatchConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <TextMatchColumns config={config} />
    </ActivityFrame>
  );
}

export const validTextMatch = (cfg: unknown) =>
  cfg && Array.isArray((cfg as TextMatchConfig).pairs) && (cfg as TextMatchConfig).pairs.length >= 2
    ? { valid: true }
    : { valid: false, error: "Add at least two pairs" };

export const textMatchPlugin: KindergartenActivityPlugin<TextMatchConfig> = {
  type: "KDG_TEXT_MATCH",
  label: "Match the columns (words, letters, opposites)",
  shortLabel: "Match the Columns",
  category: "english",
  description: "Two columns of words or letters – capital ↔ small, opposites, rhyming words – the child joins each pair.",
  iconName: "GitMerge",
  defaultConfig: textMatchDefaultConfig,
  validateConfig: validTextMatch,
  renderEditor: TextMatchEditor,
  renderPrint: TextMatchPrint,
  // short words with no pictures fit in half the page
  halfWidth: (config) =>
    config.pairs.every((x) => !x.leftClipartId && !x.rightClipartId && x.left.length <= 10 && x.right.length <= 10),
  getSummary: (config) => config.pairs.map((x) => `${x.left}–${x.right}`).join(", "),
};

export const hindiTextMatchPlugin: KindergartenActivityPlugin<TextMatchConfig> = {
  ...textMatchPlugin,
  type: "KDG_HINDI_TEXT_MATCH",
  label: "मिलान करो – letter to word",
  shortLabel: "मिलान करो",
  category: "hindi",
  description: "Two columns – अ ↔ अनार, प ↔ पतंग – the child joins each letter to its word.",
  defaultConfig: () => ({
    pairs: [p("अ", "अनार"), p("प", "पतंग"), p("न", "नल"), p("म", "मछली"), p("व", "वक")],
    mixRight: true,
    instruction: "मिलान करो (Match):",
  }),
};

export const numberNameMatchPlugin: KindergartenActivityPlugin<TextMatchConfig> = {
  ...textMatchPlugin,
  type: "KDG_NUMBER_NAME_MATCH",
  label: "Match numbers (same number / number name)",
  shortLabel: "Match Numbers",
  category: "math",
  description: "Two columns – 13 ↔ 13, Fifty-nine ↔ 59 – the child joins each pair.",
  defaultConfig: () => ({
    pairs: [p("Fifty-nine", "59"), p("Forty-two", "42"), p("Sixty-nine", "69"), p("Seventy-two", "72"), p("Twenty-seven", "27")],
    mixRight: true,
    instruction: "Match the number names with the numbers:",
  }),
  halfWidth: (config) => config.pairs.every((x) => !x.leftClipartId && !x.rightClipartId && x.left.length <= 14 && x.right.length <= 14),
};
