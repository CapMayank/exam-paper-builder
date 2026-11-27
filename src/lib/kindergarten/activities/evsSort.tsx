"use client";

import { ChoiceChips, EditorShell, Field, InstructionField, PictureChip, RowList } from "../editor-kit";
import type { EvsSortConfig, EvsSortItem, KindergartenActivityPlugin, KindergartenEditorProps, KindergartenPrintProps } from "../types";
import { ActivityFrame, Art, PreviewBox } from "./_shared";

const PRESETS: { label: string; config: Omit<EvsSortConfig, "instruction"> }[] = [
  {
    label: "Living / Non-living",
    config: {
      groupA: "Living",
      groupB: "Non-living",
      items: [
        { clipartId: "cat", group: "A" },
        { clipartId: "ball", group: "B" },
        { clipartId: "tree", group: "A" },
        { clipartId: "car", group: "B" },
        { clipartId: "fish", group: "A" },
        { clipartId: "cup", group: "B" },
      ],
    },
  },
  {
    label: "Animals / Toys",
    config: {
      groupA: "Animal",
      groupB: "Toy",
      items: [
        { clipartId: "dog", group: "A" },
        { clipartId: "teddy", group: "B" },
        { clipartId: "elephant", group: "A" },
        { clipartId: "kite", group: "B" },
        { clipartId: "duck", group: "A" },
        { clipartId: "drum", group: "B" },
      ],
    },
  },
  {
    label: "Fruits / Other things",
    config: {
      groupA: "Fruit",
      groupB: "Not a fruit",
      items: [
        { clipartId: "apple", group: "A" },
        { clipartId: "pencil", group: "B" },
        { clipartId: "mango", group: "A" },
        { clipartId: "clock", group: "B" },
        { clipartId: "grapes", group: "A" },
        { clipartId: "umbrella", group: "B" },
      ],
    },
  },
];

const instructionFor = (a: string, b: string) => `Put a tick (✓) on ${a.toLowerCase()} things and a cross (✗) on ${b.toLowerCase()} things:`;

export const evsSortDefaultConfig = (): EvsSortConfig => ({
  ...structuredClone(PRESETS[0].config),
  instruction: instructionFor(PRESETS[0].config.groupA, PRESETS[0].config.groupB),
});

function SortGrid({ config, showKey }: { config: EvsSortConfig; showKey?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 text-sm font-bold text-slate-800">
        <span>✓ = {config.groupA}</span>
        <span>✗ = {config.groupB}</span>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {config.items.map((it, i) => (
          <div key={i} className="flex flex-col items-center gap-1 rounded-lg border border-slate-300 p-1.5">
            <Art id={it.clipartId} size={40} />
            <span className="flex h-7 w-7 items-center justify-center rounded border-2 border-slate-800 text-sm font-black text-emerald-700">
              {showKey ? (it.group === "A" ? "✓" : "✗") : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EvsSortEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<EvsSortConfig>) {
  const setGroups = (groupA: string, groupB: string) => {
    const instruction = instructionFor(groupA, groupB);
    onChange({ ...config, groupA, groupB, instruction });
    // the printed instruction follows the new names unless the teacher wrote their own
    if (!instructionText.trim() || instructionText === instructionFor(config.groupA, config.groupB)) onInstructionChange(instruction);
  };
  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_EVS_SORT"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const instruction = instructionFor(p.config.groupA, p.config.groupB);
                    onChange({ ...structuredClone(p.config), instruction });
                    onInstructionChange(instruction);
                  }}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <RowList<EvsSortItem>
              label="Pictures — which group each belongs to (teacher's key, not printed)"
              rows={config.items}
              onChange={(items) => onChange({ ...config, items })}
              makeRow={() => ({ clipartId: "star", group: "B" })}
              max={12}
              min={2}
              addLabel="Add picture"
              renderRow={(it, update) => (
                <div className="flex items-center gap-2">
                  <PictureChip clipartId={it.clipartId} onPick={(id) => update({ ...it, clipartId: id })} />
                  <ChoiceChips<EvsSortItem["group"]>
                    label=""
                    value={it.group}
                    onChange={(group) => update({ ...it, group })}
                    options={[
                      { value: "A", label: `✓ ${config.groupA}` },
                      { value: "B", label: `✗ ${config.groupB}` },
                    ]}
                  />
                </div>
              )}
            />
          </>
        }
        advanced={
          <Field label="Group names">
            <div className="flex gap-2">
              <input
                aria-label="Tick group"
                value={config.groupA}
                onChange={(e) => setGroups(e.target.value, config.groupB)}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
              />
              <input
                aria-label="Cross group"
                value={config.groupB}
                onChange={(e) => setGroups(config.groupA, e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
              />
            </div>
          </Field>
        }
      />
      <PreviewBox>
        <SortGrid config={config} showKey />
      </PreviewBox>
    </div>
  );
}

function EvsSortPrint({ config, instructionText, numberLabel, marks }: KindergartenPrintProps<EvsSortConfig>) {
  return (
    <ActivityFrame numberLabel={numberLabel} instruction={instructionText || config.instruction} marks={marks}>
      <SortGrid config={config} />
    </ActivityFrame>
  );
}

export const evsSortPlugin: KindergartenActivityPlugin<EvsSortConfig> = {
  type: "KDG_EVS_SORT",
  label: "Sort into two groups (living / non-living…)",
  shortLabel: "Sort into Groups",
  category: "evs",
  description: "Pictures to tick or cross: living / non-living, animals / toys, fruits / other things.",
  iconName: "ListChecks",
  defaultConfig: evsSortDefaultConfig,
  validateConfig: (cfg) => (cfg && Array.isArray((cfg as EvsSortConfig).items) ? { valid: true } : { valid: false, error: "Invalid config" }),
  renderEditor: EvsSortEditor,
  renderPrint: EvsSortPrint,
  getSummary: (config) => `${config.groupA} / ${config.groupB} (${config.items.length} pictures)`,
};
