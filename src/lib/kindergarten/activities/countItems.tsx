"use client";

import { ChoiceChips, EditorShell, Field, InstructionField, NumberStepper, PictureChip, RowList, TextListField } from "../editor-kit";

import { PreviewBox } from "./_shared";
import React, { useState } from "react";
import { ImagePlus } from "lucide-react";
import { ClipartPickerModal } from "../components/ClipartPickerModal";
import { getClipartById } from "../clipartLibrary";
import { hashText, seededRandom } from "../seeded";
import type {
  CountItemsConfig,
  KindergartenActivityPlugin,
  KindergartenEditorProps,
  KindergartenPrintProps,
} from "../types";

export const countItemsDefaultConfig = (): CountItemsConfig => {
  return {
    clipartId: "balloon",
    count: 5,
    layout: "GRID",
    answerStyle: "SQUARE_BOX",
    choiceOptions: [3, 5, 7],
    objectName: "balloons",
    groups: [],
    instruction: "Count the objects and write the correct number in the box:",
  };
};

type CountGroup = { clipartId: string; count: number };

/**
 * The numbers to circle from, always including the right count. When the count changes, the number
 * that was the old count is swapped for the new one; with none given, three around the count.
 */
export function choicesWithCount(count: number, options: number[] | undefined, previousCount?: number): number[] {
  const clean = [...new Set((options ?? []).filter((n) => Number.isInteger(n) && n >= 0))];
  if (clean.length === 0) {
    const lo = Math.max(1, count - 1);
    return [lo, lo + 1, lo + 2];
  }
  if (clean.includes(count)) return clean;
  const at = previousCount === undefined ? -1 : clean.indexOf(previousCount);
  const next = at >= 0 ? clean.map((n, i) => (i === at ? count : n)) : [...clean, count];
  return [...new Set(next)].sort((a, b) => a - b);
}

/** One picture to count; `data-count-item` lets tests count what printed. */
function CountPicture({ config, clipartId, size, custom }: { config: CountItemsConfig; clipartId: string; size: number; custom?: string }) {
  const art = clipartId ? getClipartById(clipartId) : null;
  return custom ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-count-item src={custom} alt="" className="max-h-full max-w-full object-contain" />
  ) : art ? (
    <span data-count-item className="inline-flex">{art.renderSvg(size)}</span>
  ) : (
    <span data-count-item className="text-xs" aria-label={config.objectName}>★</span>
  );
}

/** The main picture laid out the way the teacher chose: tiles in a grid, a plain row, or scattered about. */
function MainPictures({ config }: { config: CountItemsConfig }) {
  const n = Math.min(24, Math.max(1, config.count));
  const items = Array.from({ length: n });
  const pic = <CountPicture config={config} clipartId={config.clipartId} size={46} custom={config.customImageUrl} />;
  if (config.layout === "ROW") {
    return (
      <div className="flex flex-1 flex-wrap items-center gap-1.5 p-2">
        {items.map((_, i) => (
          <span key={i} className="flex h-12 w-12 items-center justify-center text-slate-900">{pic}</span>
        ))}
      </div>
    );
  }
  if (config.layout === "SCATTERED") {
    // the same picture and count always scatter the same way, on screen and on paper
    const rand = seededRandom(hashText(`${config.clipartId}|${config.customImageUrl ?? ""}|${n}`));
    return (
      <div className="flex flex-1 flex-wrap items-center justify-around gap-x-4 gap-y-3 p-3">
        {items.map((_, i) => {
          const dy = Math.round((rand() - 0.5) * 18);
          const turn = Math.round((rand() - 0.5) * 30);
          return (
            <span key={i} className="flex h-12 w-12 items-center justify-center text-slate-900" style={{ transform: `translateY(${dy}px) rotate(${turn}deg)` }}>
              {pic}
            </span>
          );
        })}
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-wrap gap-3 items-center justify-start p-2">
      {items.map((_, i) => (
        <div key={i} className="w-14 h-14 flex items-center justify-center p-1 bg-white border border-slate-200 rounded-lg text-slate-900 shadow-2xs">
          {pic}
        </div>
      ))}
    </div>
  );
}
const hasGroups = (c: CountItemsConfig) => !!c.groups && c.groups.length > 0;

function CountItemsEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<CountItemsConfig>) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const clipart = config.clipartId ? getClipartById(config.clipartId) : null;

  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_COUNT_ITEMS"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <Field label={hasGroups(config) ? "1 · Picture to count" : "Picture to count"}>
              <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white p-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-50 text-slate-900">
                  {config.customImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={config.customImageUrl} alt="" className="max-h-full max-w-full object-contain" />
                  ) : clipart ? (
                    clipart.renderSvg(40)
                  ) : (
                    <ImagePlus size={18} className="text-slate-400" />
                  )}
                </span>
                <span className="flex-1 text-sm font-semibold capitalize text-slate-800">{clipart?.name || config.objectName || "No picture"}</span>
                <button type="button" className="btn btn-sm" onClick={() => setPickerOpen(true)}>
                  Change
                </button>
              </div>
            </Field>
            <NumberStepper label="How many" value={config.count} min={1} max={20} onChange={(count) =>
                onChange({ ...config, count, ...(config.answerStyle === "CHOICE_OPTIONS" ? { choiceOptions: choicesWithCount(count, config.choiceOptions, config.count) } : {}) })
              } />
            <RowList<CountGroup>
              label="More groups"
              startAt={2}
              rows={config.groups ?? []}
              onChange={(groups) =>
                // several groups only have one kind of answer box, so drop the choice style
                onChange({ ...config, groups, answerStyle: groups.length > 0 && config.answerStyle === "CHOICE_OPTIONS" ? "SQUARE_BOX" : config.answerStyle })
              }
              makeRow={() => ({ clipartId: "apple", count: 3 })}
              min={0}
              max={6}
              addLabel="Add group"
              renderRow={(g, update) => (
                <div className="flex items-center gap-2">
                  <PictureChip clipartId={g.clipartId} onPick={(id) => update({ ...g, clipartId: id })} />
                  <div className="flex-1">
                    <NumberStepper label="How many" value={g.count} min={1} max={20} onChange={(n) => update({ ...g, count: n })} />
                  </div>
                </div>
              )}
            />
            <p className="text-[11px] text-slate-500">The first group is the main picture above. Each group gets its own answer box.</p>
          </>
        }
        advanced={
          <>
            <ChoiceChips<CountItemsConfig["layout"]>
              label="Arrange pictures"
              value={config.layout}
              onChange={(layout) => onChange({ ...config, layout })}
              options={[
                { value: "GRID", label: "Grid" },
                { value: "ROW", label: "In a row" },
                { value: "SCATTERED", label: "Scattered" },
              ]}
            />
            <ChoiceChips<CountItemsConfig["answerStyle"]>
              label="Answer"
              value={config.answerStyle}
              onChange={(answerStyle) =>
                onChange({ ...config, answerStyle, ...(answerStyle === "CHOICE_OPTIONS" ? { choiceOptions: choicesWithCount(config.count, config.choiceOptions) } : {}) })
              }
              options={[
                { value: "SQUARE_BOX", label: "Write in a box" },
                { value: "CIRCLE", label: "Write in a circle" },
                ...(hasGroups(config) ? [] : [{ value: "CHOICE_OPTIONS" as const, label: "Circle the number" }]),
              ]}
            />
            {config.answerStyle === "CHOICE_OPTIONS" && (
              <TextListField
                label="Numbers to choose from"
                values={(config.choiceOptions ?? []).map(String)}
                onChange={(v) => onChange({ ...config, choiceOptions: v.map(Number).filter((n) => Number.isFinite(n) && n >= 0) })}
                placeholder="e.g. 3 5 8"
                hint=""
              />
            )}
            {config.answerStyle === "CHOICE_OPTIONS" && !(config.choiceOptions ?? []).includes(config.count) && (
              <p className="text-[11px] font-semibold text-amber-700">Add {config.count} — the right count has to be one of the numbers.</p>
            )}
            <Field label="Name of the things">
              <input
                value={config.objectName}
                onChange={(e) => onChange({ ...config, objectName: e.target.value })}
                placeholder="e.g. balloons"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
          </>
        }
      />

      {pickerOpen && (
        <ClipartPickerModal
          isOpen={true}
          onClose={() => setPickerOpen(false)}
          onSelect={(item) => {
            if ("customUrl" in item) {
              onChange({ ...config, customImageUrl: item.customUrl, clipartId: "", objectName: item.name });
            } else {
              onChange({ ...config, clipartId: item.id, customImageUrl: undefined, objectName: item.name.toLowerCase() });
            }
            setPickerOpen(false);
          }}
        />
      )}

      <PreviewBox>
        <CountItemsPrint config={config} instructionText={instructionText} showKey />
      </PreviewBox>
    </div>
  );
}

/** Several groups: one row each, pictures then the answer box. */
function GroupRows({ config, showKey }: { config: CountItemsConfig; showKey?: boolean }) {
  const main: CountGroup = { clipartId: config.clipartId, count: config.count };
  const rows = [main, ...(config.groups ?? [])];
  return (
    <div className="space-y-2">
      {rows.map((g, i) => {
        const custom = i === 0 ? config.customImageUrl : undefined;
        return (
          <div key={i} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-1.5">
            {/* rows always wrap: a long row must never cut pictures off, the child has to count them all */}
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              {Array.from({ length: Math.min(20, Math.max(1, g.count)) }, (_, k) => (
                <span key={k} className="flex h-9 w-9 items-center justify-center text-slate-900">
                  <CountPicture config={config} clipartId={g.clipartId} size={32} custom={custom} />
                </span>
              ))}
            </div>
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center border-2 border-slate-900 bg-white text-xl font-black text-emerald-700 ${
                config.answerStyle === "CIRCLE" ? "rounded-full" : "rounded-lg"
              }`}
            >
              {showKey ? g.count : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CountItemsPrint({
  config,
  instructionText,
  numberLabel,
  marks,
  showKey,
}: KindergartenPrintProps<CountItemsConfig> & { showKey?: boolean }) {
  return (
    <div className="my-2 border-2 border-slate-800 rounded-xl p-3 bg-white">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-start gap-2">
          {numberLabel && (
            <span className="font-black text-base text-slate-950 min-w-6">{numberLabel}</span>
          )}
          <span className="font-bold text-sm text-slate-900 leading-snug">
            {instructionText || config.instruction}
          </span>
        </div>
        {marks !== undefined && (
          <span className="font-black text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-sm shrink-0">
            [{marks} {marks === 1 ? "Mark" : "Marks"}]
          </span>
        )}
      </div>

      {hasGroups(config) ? (
        <GroupRows config={config} showKey={showKey} />
      ) : (
      <div className="flex items-center justify-between gap-6 py-2 px-3 border border-slate-200 rounded-xl bg-slate-50/40">
        <MainPictures config={config} />

        {/* Answer Space / Box */}
        <div className="shrink-0 flex flex-col items-center justify-center pl-4 border-l-2 border-dashed border-slate-300">
          <span className="text-xs font-bold text-slate-600 mb-1 select-none">Count:</span>
          {config.answerStyle === "CHOICE_OPTIONS" ? (
            <div className="flex gap-2">
              {(config.choiceOptions?.length ? config.choiceOptions : choicesWithCount(config.count, [])).map(
                (num, nIdx) => (
                  <div
                    key={nIdx}
                    className="w-10 h-10 rounded-full border-2 border-slate-900 flex items-center justify-center font-black text-lg text-slate-950 bg-white"
                  >
                    {num}
                  </div>
                )
              )}
            </div>
          ) : config.answerStyle === "CIRCLE" ? (
            <div className="w-16 h-16 rounded-full border-3 border-slate-900 bg-white flex items-center justify-center">
              <span className="text-slate-300 text-xs font-mono">•</span>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl border-3 border-slate-900 bg-white flex items-center justify-center shadow-xs">
              <span className="text-slate-300 text-xs font-mono">•</span>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

export const countItemsPlugin: KindergartenActivityPlugin<CountItemsConfig> = {
  type: "KDG_COUNT_ITEMS",
  label: "Count Objects & Write / Match Number",
  shortLabel: "Count & Write",
  category: "math",
  description: "Clusters of outline clipart objects with answer boxes for children to count and write.",
  iconName: "Hash",
  defaultConfig: countItemsDefaultConfig,
  validateConfig: (cfg) => {
    if (!cfg || typeof cfg !== "object") return { valid: false, error: "Invalid config" };
    const groups = (cfg as CountItemsConfig).groups;
    if (groups !== undefined && !Array.isArray(groups)) return { valid: false, error: "Invalid groups" };
    const c = cfg as CountItemsConfig;
    if (c.answerStyle === "CHOICE_OPTIONS" && c.choiceOptions?.length && !c.choiceOptions.includes(c.count)) {
      return { valid: false, error: `The numbers to circle must include the right count (${c.count})` };
    }
    return { valid: true };
  },
  renderEditor: CountItemsEditor,
  renderPrint: CountItemsPrint,
  getSummary: (config) => {
    if (hasGroups(config)) return `Count pictures · ${config.groups!.length + 1} groups`;
    return `Count ${config.count} ${config.objectName || "items"}`;
  },
};
