"use client";

/** Underline or circle chosen letters (usually the vowels) in a row of words. */
import { ChoiceChips, EditorShell, InstructionField, TextListField } from "../editor-kit";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, PreviewBox } from "./_shared";
import { followAuto } from "../autoInstruction";

export type MarkAction = "UNDERLINE" | "CIRCLE";

export interface MarkLettersConfig {
  words: string[];
  /** Letters to find, case-insensitive. */
  targets: string[];
  action: MarkAction;
  instruction: string;
}

const VOWELS = ["a", "e", "i", "o", "u"];

export const markLettersDefaultConfig = (): MarkLettersConfig => ({
  words: ["Cat", "Mug", "Tin", "Owl", "Ten"],
  targets: [...VOWELS],
  action: "UNDERLINE",
  instruction: "Underline the vowels:",
});

const isVowelSet = (targets: string[]) =>
  targets.length === 5 && VOWELS.every((v) => targets.some((t) => t.toLowerCase() === v));

/** Teacher-style instruction for the current choices. */
function instructionFor(targets: string[], action: MarkAction): string {
  const verb = action === "UNDERLINE" ? "Underline" : "Circle";
  if (isVowelSet(targets)) return `${verb} the vowels:`;
  if (targets.length === 1) return `${verb} the letter ${targets[0]}:`;
  return `${verb} the letters ${targets.join(", ")}:`;
}

export function MarkLettersWords({ config, showKey }: { config: MarkLettersConfig; showKey?: boolean }) {
  const targets = new Set(config.targets.map((t) => t.toLowerCase()));
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-2xl font-bold tracking-wide text-slate-900">
      {config.words.map((w, wi) => (
        <span key={wi} className="inline-flex">
          {Array.from(w).map((ch, i) => {
            const hit = showKey && targets.has(ch.toLowerCase());
            const mark = hit
              ? config.action === "UNDERLINE"
                ? "border-b-4 border-emerald-600"
                : "rounded-full ring-2 ring-emerald-600"
              : "";
            return (
              <span key={i} className={`inline-block px-0.5 ${mark}`}>
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
}

function MarkLettersEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<MarkLettersConfig>) {
  const update = (patch: Partial<MarkLettersConfig>) => {
    const next = { ...config, ...patch };
    if ("targets" in patch || "action" in patch) {
      // the teacher's own wording stays; only the automatic sentence follows the letters
      const instruction = followAuto(instructionText || config.instruction, instructionFor(config.targets, config.action), instructionFor(next.targets, next.action));
      next.instruction = instruction;
      onInstructionChange(instruction);
    }
    onChange(next);
  };
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_MARK_LETTERS"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <TextListField label="Words" values={config.words} onChange={(words) => update({ words })} placeholder="Cat Mug Tin" />
            <TextListField label="Letters to find" values={config.targets} onChange={(targets) => update({ targets })} placeholder="a e i" hint="Capital or small – both count" />
            <button
              type="button"
              onClick={() => update({ targets: [...VOWELS] })}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Vowels (a e i o u)
            </button>
            <ChoiceChips<MarkAction>
              label="Child should"
              value={config.action}
              options={[
                { value: "UNDERLINE", label: "Underline" },
                { value: "CIRCLE", label: "Circle" },
              ]}
              onChange={(action) => update({ action })}
            />
          </>
        }
      />
      <PreviewBox>
        <MarkLettersWords config={config} showKey />
      </PreviewBox>
    </div>
  );
}

function MarkLettersPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<MarkLettersConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <MarkLettersWords config={config} />
    </ActivityFrame>
  );
}

export const markLettersPlugin: KindergartenActivityPlugin<MarkLettersConfig> = {
  type: "KDG_MARK_LETTERS",
  label: "Underline / circle letters in words (vowels)",
  shortLabel: "Mark Letters",
  category: "english",
  description: "Words in a row – the child underlines or circles the vowels (or any chosen letters).",
  iconName: "Type",
  defaultConfig: markLettersDefaultConfig,
  validateConfig: (cfg) => {
    const c = cfg as MarkLettersConfig;
    if (!c || !Array.isArray(c.words) || c.words.length === 0) return { valid: false, error: "Add at least one word" };
    const targets = (c.targets ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (targets.length === 0) return { valid: false, error: "Choose the letters to look for" };
    // a word with none of the letters leaves the child nothing to mark
    const without = c.words.filter((w) => ![...w.toLowerCase()].some((ch) => targets.includes(ch)));
    if (without.length > 0) return { valid: false, error: `These words have none of the letters: ${without.join(", ")}` };
    return { valid: true };
  },
  renderEditor: MarkLettersEditor,
  renderPrint: MarkLettersPrint,
  halfWidth: (config) => config.words.join("").length <= 20,
  getSummary: (config) => config.words.join(", "),
};
