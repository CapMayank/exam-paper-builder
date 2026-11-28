"use client";

/**
 * बारहखड़ी: a consonant followed by its twelve forms (क का कि की कु कू के कै को कौ कं कः).
 * The child writes the forms in empty boxes, copies them from the first row, or traces dotted ones.
 */
import { ChoiceChips, EditorShell, InstructionField, TextListField, ToggleRow } from "../editor-kit";
import type { KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, PreviewBox } from "./_shared";
import { followMode } from "../autoInstruction";

export type BarakhadiShow = "NONE" | "FIRST" | "ALL";

export interface HindiBarakhadiConfig {
  consonants: string[];
  /** NONE: blank boxes; FIRST: first consonant's forms printed as the guide; ALL: every form dotted to trace. */
  showForms: BarakhadiShow;
  /** Print the matra signs above the first row when showForms is NONE. */
  showMatraHeader?: boolean;
  instruction: string;
}

const MATRAS = ["", "ा", "ि", "ी", "ु", "ू", "े", "ै", "ो", "ौ", "ं", "ः"];

/** The twelve forms of a consonant. */
export function barakhadi(consonant: string): string[] {
  return MATRAS.map((m) => consonant + m);
}

export const hindiBarakhadiDefaultConfig = (): HindiBarakhadiConfig => ({
  consonants: ["ग", "म"],
  showForms: "NONE",
  showMatraHeader: true,
  instruction: "बारहखड़ी लिखो:", // BARAKHADI_INSTRUCTIONS.NONE
});

const BOX = "flex h-9 w-9 shrink-0 items-center justify-center rounded border-2 border-slate-800";

export function BarakhadiRows({ config, showKey }: { config: HindiBarakhadiConfig; showKey?: boolean }) {
  const header = config.showForms === "NONE" && config.showMatraHeader !== false;
  return (
    <div className="space-y-2">
      {config.consonants.map((c, row) => {
        const forms = barakhadi(c);
        return (
          <div key={`${c}-${row}`}>
            {header && row === 0 && (
              <div className="mb-0.5 flex items-center gap-1.5">
                <span className="h-4 w-11 shrink-0" />
                <div className="flex flex-wrap gap-1.5">
                  <span className="w-9" />
                  {MATRAS.slice(1).map((m) => (
                    <span key={m} className="w-9 text-center text-base font-bold leading-none text-slate-700">
                      {"◌" + m}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="flex h-9 w-11 shrink-0 items-center justify-center rounded border-2 border-slate-900 bg-slate-100 text-xl font-extrabold text-slate-950">
                {c}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {forms.map((f, i) => {
                  // The guide row prints the first consonant in full; every other row stays blank.
                  const guide = config.showForms === "FIRST" && row === 0;
                  const dotted = config.showForms === "ALL";
                  return (
                    <span key={i} className={BOX}>
                      {showKey ? (
                        <span className="text-lg font-bold text-emerald-700">{f}</span>
                      ) : guide ? (
                        <span className="text-lg font-bold text-slate-950">{f}</span>
                      ) : dotted ? (
                        <span className="text-lg font-bold text-slate-400">{f}</span>
                      ) : null}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const BARAKHADI_INSTRUCTIONS: Record<BarakhadiShow, string> = {
  ALL: "बारहखड़ी के अक्षरों पर लिखो (Trace the barakhadi):",
  FIRST: "बारहखड़ी देख कर लिखो:",
  NONE: "बारहखड़ी लिखो:",
};

function HindiBarakhadiEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<HindiBarakhadiConfig>) {
  const setShow = (showForms: BarakhadiShow) => {
    const instruction = followMode(instructionText || config.instruction, BARAKHADI_INSTRUCTIONS, showForms);
    onChange({ ...config, showForms, instruction });
    onInstructionChange(instruction);
  };
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_HINDI_BARAKHADI"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <TextListField
              label="Consonants (up to 6)"
              values={config.consonants}
              onChange={(v) => onChange({ ...config, consonants: v.slice(0, 6) })}
              placeholder="क ख ग"
              hint="Type letters separated by spaces"
            />
            <ChoiceChips<BarakhadiShow>
              label="Boxes"
              value={config.showForms}
              options={[
                { value: "NONE", label: "Blank" },
                { value: "FIRST", label: "Copy first row" },
                { value: "ALL", label: "Trace" },
              ]}
              onChange={setShow}
            />
          </>
        }
        advanced={
          <ToggleRow
            label="Show matra signs above the boxes"
            hint="Only when the boxes are blank"
            checked={config.showMatraHeader !== false}
            onChange={(showMatraHeader) => onChange({ ...config, showMatraHeader })}
          />
        }
      />
      <PreviewBox>
        <BarakhadiRows config={config} showKey />
      </PreviewBox>
    </div>
  );
}

function HindiBarakhadiPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<HindiBarakhadiConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <BarakhadiRows config={config} />
    </ActivityFrame>
  );
}

export const hindiBarakhadiPlugin: KindergartenActivityPlugin<HindiBarakhadiConfig> = {
  type: "KDG_HINDI_BARAKHADI",
  label: "बारहखड़ी लिखो (Barakhadi)",
  shortLabel: "बारहखड़ी",
  category: "hindi",
  description: "A consonant with twelve boxes for its barakhadi forms – write, copy from the first row, or trace.",
  iconName: "Pencil",
  defaultConfig: hindiBarakhadiDefaultConfig,
  validateConfig: (cfg) =>
    cfg && Array.isArray((cfg as HindiBarakhadiConfig).consonants) && (cfg as HindiBarakhadiConfig).consonants.length > 0
      ? { valid: true }
      : { valid: false, error: "Add at least one consonant" },
  renderEditor: HindiBarakhadiEditor,
  renderPrint: HindiBarakhadiPrint,
  getSummary: (config) => config.consonants.join(" "),
};
