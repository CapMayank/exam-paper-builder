"use client";

/** Word search: pictures above a letter grid; the child finds the hidden words and writes them on the lines. */
import { ChoiceChips, EditorShell, InstructionField, NumberStepper, PictureChip, RowList, ToggleRow } from "../editor-kit";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { hashText, seededRandom } from "../seeded";
import { ActivityFrame, Art, PreviewBox } from "./_shared";

export interface WordSearchWord {
  word: string;
  clipartId?: string;
}

export interface WordSearchConfig {
  words: WordSearchWord[];
  rows: number;
  cols: number;
  directions: "ACROSS" | "ACROSS_DOWN";
  /** Print the words themselves; off shows only the pictures. */
  showWordList: boolean;
  /** Numbered (i), (ii)… lines under the grid. */
  answerLines: boolean;
  instruction: string;
}

export interface WordSearchResult {
  grid: string[][];
  placed: { word: string; row: number; col: number; down: boolean }[];
  skipped: string[];
}

const w = (word: string, clipartId?: string): WordSearchWord => ({ word, clipartId });

export const wordSearchDefaultConfig = (): WordSearchConfig => ({
  // cow and monkey have no clipart yet
  words: [w("DOG", "dog"), w("COW", "cow"), w("ELEPHANT", "elephant"), w("MONKEY", "monkey"), w("CAT", "cat")],
  rows: 6,
  cols: 10,
  directions: "ACROSS_DOWN",
  showWordList: false,
  answerLines: true,
  instruction: "Find the names of 5 animals in the grid and write them:",
});

export const cleanWord = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Deterministic placement: the same config always gives the same grid. */
export function buildWordSearch(config: WordSearchConfig): WordSearchResult {
  const { rows, cols } = config;
  const words = config.words.map((x) => cleanWord(x.word)).filter(Boolean);
  const rand = seededRandom(hashText(JSON.stringify([words, rows, cols, config.directions])));
  const cells: (string | null)[][] = Array.from({ length: rows }, () => Array<string | null>(cols).fill(null));
  const placed: WordSearchResult["placed"] = [];
  const skipped: string[] = [];

  // Longest first so the hard ones get the most room.
  const order = [...words].sort((a, b) => b.length - a.length);
  for (const word of order) {
    let done = false;
    for (let attempt = 0; attempt < 200 && !done; attempt++) {
      const down = config.directions === "ACROSS_DOWN" && rand() < 0.5;
      const maxRow = rows - (down ? word.length : 1);
      const maxCol = cols - (down ? 1 : word.length);
      if (maxRow < 0 || maxCol < 0) continue;
      const row = Math.floor(rand() * (maxRow + 1));
      const col = Math.floor(rand() * (maxCol + 1));
      const fits = Array.from(word).every((ch, k) => {
        const cell = cells[row + (down ? k : 0)][col + (down ? 0 : k)];
        return cell === null || cell === ch;
      });
      if (!fits) continue;
      Array.from(word).forEach((ch, k) => {
        cells[row + (down ? k : 0)][col + (down ? 0 : k)] = ch;
      });
      placed.push({ word, row, col, down });
      done = true;
    }
    if (!done) skipped.push(word);
  }

  const grid = cells.map((r) => r.map((c) => c ?? LETTERS[Math.floor(rand() * 26)]));
  return { grid, placed, skipped };
}

/** Words that made it into the grid, in the teacher's order: empty and skipped ones are left off the paper. */
function shownWords(config: WordSearchConfig): WordSearchWord[] {
  const { skipped } = buildWordSearch(config);
  return config.words.filter((x) => {
    const word = cleanWord(x.word);
    return word && !skipped.includes(word);
  });
}

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];

export function WordSearchBody({ config, showKey }: { config: WordSearchConfig; showKey?: boolean }) {
  const { grid, placed } = buildWordSearch(config);
  const shown = shownWords(config);
  const hit = new Set<string>();
  for (const p of placed) {
    for (let k = 0; k < p.word.length; k++) hit.add(`${p.row + (p.down ? k : 0)},${p.col + (p.down ? 0 : k)}`);
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
        {shown.map((x, i) => (
          <span key={i} className="flex flex-col items-center gap-0.5">
            {x.clipartId && <Art id={x.clipartId} size={44} />}
            {config.showWordList && <span className="text-sm font-bold text-slate-900">{cleanWord(x.word)}</span>}
          </span>
        ))}
      </div>
      <table className="border-collapse border-2 border-slate-800">
        <tbody>
          {grid.map((r, ri) => (
            <tr key={ri}>
              {r.map((ch, ci) => (
                <td
                  key={ci}
                  className={`h-[30px] w-[30px] border border-slate-400 p-0 text-center align-middle text-lg font-bold text-slate-900 ${
                    showKey && hit.has(`${ri},${ci}`) ? "bg-emerald-100" : ""
                  }`}
                >
                  {ch}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {config.answerLines && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {shown.map((x, i) => (
            <div key={i} className="flex items-end gap-2">
              <span className="text-sm font-bold text-slate-800">({ROMAN[i] ?? i + 1})</span>
              <span className="flex-1 border-b-2 border-slate-800 text-center text-lg font-bold leading-6 text-emerald-700">
                {showKey ? cleanWord(x.word) : " "}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WordSearchEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<WordSearchConfig>) {
  const { skipped } = buildWordSearch(config);
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_WORD_SEARCH"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <RowList<WordSearchWord>
              label="Words to hide (letters A–Z only)"
              rows={config.words}
              onChange={(words) => onChange({ ...config, words })}
              makeRow={() => w("")}
              min={3}
              max={8}
              addLabel="Add word"
              renderRow={(row, update) => (
                <div className="flex items-center gap-1.5">
                  <input
                    aria-label="Word"
                    value={row.word}
                    onChange={(e) => update({ ...row, word: cleanWord(e.target.value) })}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold uppercase"
                  />
                  <PictureChip clipartId={row.clipartId} onPick={(id) => update({ ...row, clipartId: id })} label="Picture" />
                </div>
              )}
            />
            {skipped.length > 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                These words did not fit the grid: {skipped.join(", ")}. Make the grid bigger or the words shorter.
              </p>
            )}
          </>
        }
        advanced={
          <>
            <NumberStepper label="Rows" value={config.rows} min={5} max={10} onChange={(rows) => onChange({ ...config, rows })} />
            <NumberStepper label="Columns" value={config.cols} min={6} max={12} onChange={(cols) => onChange({ ...config, cols })} />
            <ChoiceChips<WordSearchConfig["directions"]>
              label="Words run"
              value={config.directions}
              options={[
                { value: "ACROSS", label: "Across" },
                { value: "ACROSS_DOWN", label: "Across and down" },
              ]}
              onChange={(directions) => onChange({ ...config, directions })}
            />
            <ToggleRow label="Print the words" hint="Off shows only the pictures" checked={config.showWordList} onChange={(showWordList) => onChange({ ...config, showWordList })} />
            <ToggleRow label="Answer lines under the grid" checked={config.answerLines} onChange={(answerLines) => onChange({ ...config, answerLines })} />
          </>
        }
      />
      <PreviewBox>
        <WordSearchBody config={config} showKey />
      </PreviewBox>
    </div>
  );
}

function WordSearchPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<WordSearchConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <WordSearchBody config={config} />
    </ActivityFrame>
  );
}

export const wordSearchPlugin: KindergartenActivityPlugin<WordSearchConfig> = {
  type: "KDG_WORD_SEARCH",
  label: "Word search (find the words in the grid)",
  shortLabel: "Word Search",
  category: "english",
  description: "A letter grid with hidden words – the child finds them from the pictures and writes them on the lines.",
  iconName: "Grid",
  defaultConfig: wordSearchDefaultConfig,
  validateConfig: (cfg) => {
    const c = cfg as WordSearchConfig;
    if (!c || !Array.isArray(c.words) || c.words.length === 0) return { valid: false, error: "Add at least one word" };
    if (c.words.some((x) => !cleanWord(x.word))) return { valid: false, error: "Fill in every word (letters A-Z) or remove the empty ones" };
    const { skipped } = buildWordSearch(c);
    if (skipped.length > 0) return { valid: false, error: `These words do not fit the grid: ${skipped.join(", ")}. Make the grid bigger or the words shorter.` };
    return { valid: true };
  },
  renderEditor: WordSearchEditor,
  renderPrint: WordSearchPrint,
  getSummary: (config) => config.words.map((x) => cleanWord(x.word)).join(", "),
};
