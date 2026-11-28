"use client";

/** Draw lines (or objects) according to the given number: the child fills the empty box. */
import { EditorShell, Field, InstructionField, TextListField } from "../editor-kit";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, PreviewBox } from "./_shared";

export interface DrawForNumberConfig {
  numbers: number[];
  /** What the child draws, used in the instruction. */
  thing: string;
  instruction: string;
}

export const drawForNumberDefaultConfig = (): DrawForNumberConfig => ({
  numbers: [2, 5, 4],
  thing: "lines",
  instruction: "Draw lines according to the given number:",
});

/** Keeps whole numbers 0-10 only; anything else typed is dropped. */
const parseNumbers = (values: string[]) =>
  values.map((v) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN)).filter((n) => n >= 0 && n <= 10);

const autoInstruction = (thing: string) => `Draw ${thing.trim() || "lines"} according to the given number:`;

/** The instruction after the thing changes: it follows only while it is still the automatic text. */
export const instructionForThing = (current: string, oldThing: string, thing: string) =>
  !current.trim() || current === autoInstruction(oldThing) ? autoInstruction(thing) : current;

const isLines = (thing: string) => /^(lines?|sticks?|strokes?)$/i.test(thing.trim() || "lines");

/** One box size for every number: room for the biggest number of lines (or bigger drawn objects). */
export function drawBoxSize(config: DrawForNumberConfig): { width: number; height: number } {
  const most = Math.max(1, ...config.numbers);
  const lines = isLines(config.thing);
  return { width: Math.max(220, most * (lines ? 24 : 40) + 24), height: lines ? 44 : 56 };
}

export function DrawForNumberBody({ config, showKey }: { config: DrawForNumberConfig; showKey?: boolean }) {
  const box = drawBoxSize(config);
  return (
    <div className="space-y-3">
      {config.numbers.map((n, i) => (
        <div key={i} className="flex items-center gap-3 text-lg font-bold text-slate-900">
          <span className="w-8 text-right">{n}</span>
          <span>=</span>
          <span style={{ width: box.width, height: box.height }} className="flex max-w-full items-center gap-2 rounded-sm border-2 border-slate-800 px-3 text-xl font-bold text-emerald-700">
            {showKey && Array.from({ length: n }, (_, k) => <span key={k}>|</span>)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DrawForNumberEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<DrawForNumberConfig>) {
  const setThing = (thing: string) => {
    // the teacher's own wording is kept; only the automatic sentence follows the thing
    const instruction = instructionForThing(instructionText || config.instruction, config.thing, thing);
    onChange({ ...config, thing, instruction });
    onInstructionChange(instruction);
  };
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_DRAW_FOR_NUMBER"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <TextListField
              label="Numbers (0 to 10)"
              values={config.numbers.map(String)}
              onChange={(v) => onChange({ ...config, numbers: parseNumbers(v) })}
              placeholder="Type a number and press Enter"
              hint="Type 2 5 4 to add three numbers"
            />
            <Field label="What to draw" hint="e.g. lines, circles, stars">
              <input
                aria-label="What to draw"
                value={config.thing}
                onChange={(e) => setThing(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold"
              />
            </Field>
          </>
        }
      />
      <PreviewBox>
        <DrawForNumberBody config={config} showKey />
      </PreviewBox>
    </div>
  );
}

function DrawForNumberPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<DrawForNumberConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <DrawForNumberBody config={config} />
    </ActivityFrame>
  );
}

export const drawForNumberPlugin: KindergartenActivityPlugin<DrawForNumberConfig> = {
  type: "KDG_DRAW_FOR_NUMBER",
  label: "Draw lines / objects for the number",
  shortLabel: "Draw for the Number",
  category: "math",
  description: "The child draws that many lines or objects in the box beside each number.",
  iconName: "Pencil",
  defaultConfig: drawForNumberDefaultConfig,
  validateConfig: (cfg) =>
    cfg && Array.isArray((cfg as DrawForNumberConfig).numbers) && (cfg as DrawForNumberConfig).numbers.length > 0
      ? { valid: true }
      : { valid: false, error: "Add at least one number" },
  renderEditor: DrawForNumberEditor,
  renderPrint: DrawForNumberPrint,
  // half a page is about 300px of room for the box beside its number
  halfWidth: (config) => drawBoxSize(config).width <= 260,
  getSummary: (config) => config.numbers.join(", "),
};
