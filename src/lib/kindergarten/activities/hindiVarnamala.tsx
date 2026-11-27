"use client";

import { EditorShell, InstructionField, NumberStepper, TextListField, ToggleRow } from "../editor-kit";
import type { HindiVarnamalaConfig, KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, PreviewBox } from "./_shared";

const SETS: { label: string; letters: string[] }[] = [
  { label: "स्वर अ–औ", letters: ["अ", "आ", "इ", "ई", "उ", "ऊ", "ए", "ऐ", "ओ", "औ"] },
  { label: "क–ङ", letters: ["क", "ख", "ग", "घ", "ङ"] },
  { label: "च–ञ", letters: ["च", "छ", "ज", "झ", "ञ"] },
  { label: "ट–ण", letters: ["ट", "ठ", "ड", "ढ", "ण"] },
  { label: "त–न", letters: ["त", "थ", "द", "ध", "न"] },
  { label: "प–म", letters: ["प", "फ", "ब", "भ", "म"] },
  { label: "य–ज्ञ", letters: ["य", "र", "ल", "व", "श", "ष", "स", "ह", "क्ष", "त्र", "ज्ञ"] },
];

export const hindiVarnamalaDefaultConfig = (): HindiVarnamalaConfig => ({
  letters: ["क", "ख", "ग", "घ", "ङ"],
  boxesPerRow: 5,
  dotted: true,
  instruction: "अक्षर देखकर खानों में लिखिए (Write each letter in the boxes):",
});

/** A letter box; an empty one has the shirorekha (the line along the top of Hindi letters) drawn in as a writing guide. */
function LetterBox({ letter, dotted, size }: { letter?: string; dotted?: boolean; size: number }) {
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center border-2 border-slate-800 bg-white" style={{ width: size, height: size }}>
      {/* the guide line is for writing; a printed letter carries its own top line */}
      {!letter && <span className="absolute inset-x-1 border-t-2 border-slate-400" style={{ top: size * 0.3 }} aria-hidden />}
      {letter && (
        <span
          className={`relative leading-none font-bold ${dotted ? "text-transparent" : "text-slate-950"}`}
          style={{ fontSize: size * 0.62, ...(dotted ? { WebkitTextStroke: "1.2px #64748b", textShadow: "none" } : {}) }}
        >
          {letter}
        </span>
      )}
    </span>
  );
}

function VarnamalaRows({ config }: { config: HindiVarnamalaConfig }) {
  const size = 46;
  return (
    <div className="space-y-2">
      {config.letters.map((l, i) => (
        <div key={`${l}-${i}`} className="flex flex-wrap items-center gap-1.5">
          <LetterBox letter={l} size={size} />
          <span className="mx-1 text-slate-400" aria-hidden>
            →
          </span>
          {Array.from({ length: config.boxesPerRow }, (_, k) => (
            <LetterBox key={k} size={size} letter={config.dotted && k === 0 ? l : undefined} dotted={config.dotted && k === 0} />
          ))}
        </div>
      ))}
    </div>
  );
}

function HindiVarnamalaEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<HindiVarnamalaConfig>) {
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_HINDI_VARNAMALA"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <div className="flex flex-wrap gap-1.5">
              {SETS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => onChange({ ...config, letters: s.letters })}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <TextListField label="Letters (अक्षर)" values={config.letters} onChange={(letters) => onChange({ ...config, letters })} placeholder="क ख ग" hint="" />
            <NumberStepper label="Boxes per letter" value={config.boxesPerRow} min={3} max={8} onChange={(boxesPerRow) => onChange({ ...config, boxesPerRow })} />
          </>
        }
        advanced={<ToggleRow label="Dotted letter in the first box" hint="For tracing before writing alone" checked={config.dotted} onChange={(dotted) => onChange({ ...config, dotted })} />}
      />
      <PreviewBox>
        <VarnamalaRows config={config} />
      </PreviewBox>
    </div>
  );
}

function HindiVarnamalaPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<HindiVarnamalaConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <VarnamalaRows config={config} />
    </ActivityFrame>
  );
}

export const hindiVarnamalaPlugin: KindergartenActivityPlugin<HindiVarnamalaConfig> = {
  type: "KDG_HINDI_VARNAMALA",
  label: "Varnamala – trace & write Hindi letters",
  shortLabel: "Varnamala Writing",
  category: "hindi",
  description: "Each letter with shirorekha boxes to trace and copy (स्वर, क–ङ, च–ञ…).",
  iconName: "PenTool",
  defaultConfig: hindiVarnamalaDefaultConfig,
  validateConfig: (cfg) => (cfg && Array.isArray((cfg as HindiVarnamalaConfig).letters) ? { valid: true } : { valid: false, error: "Invalid config" }),
  renderEditor: HindiVarnamalaEditor,
  renderPrint: HindiVarnamalaPrint,
  getSummary: (config) => config.letters.join(" "),
};
