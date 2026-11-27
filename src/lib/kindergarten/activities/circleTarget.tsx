"use client";

import { ChoiceChips, EditorShell, Field, InstructionField, PictureChip, RowList } from "../editor-kit";

import { PreviewBox } from "./_shared";
import React from "react";
import { X } from "lucide-react";
import { getClipartById } from "../clipartLibrary";
import type {
  CircleTargetConfig,
  CircleTargetRow,
  CircleTargetRowItem,
  KindergartenActivityPlugin,
  KindergartenEditorProps,
  KindergartenPrintProps,
} from "../types";

export const circleTargetDefaultConfig = (): CircleTargetConfig => {
  return {
    mode: "ODD_ONE_OUT",
    targetDescription: "Find and circle the odd picture in each row:",
    instruction: "Circle the odd one out in each row:",
    rows: [
      {
        rowLabel: "Row 1",
        items: [
          { id: "1", type: "CLIPART", clipartId: "apple", isTarget: false },
          { id: "2", type: "CLIPART", clipartId: "apple", isTarget: false },
          { id: "3", type: "CLIPART", clipartId: "car", isTarget: true }, // odd item
          { id: "4", type: "CLIPART", clipartId: "apple", isTarget: false },
        ],
      },
      {
        rowLabel: "Row 2",
        items: [
          { id: "5", type: "CLIPART", clipartId: "cat", isTarget: false },
          { id: "6", type: "CLIPART", clipartId: "balloon", isTarget: true }, // odd item
          { id: "7", type: "CLIPART", clipartId: "cat", isTarget: false },
          { id: "8", type: "CLIPART", clipartId: "cat", isTarget: false },
        ],
      },
    ],
  };
};

function newItem(clipartId: string, isTarget = false): CircleTargetRowItem {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: "CLIPART", clipartId, isTarget };
}

function CircleTargetEditor({ config, onChange, instructionText, onInstructionChange }: KindergartenEditorProps<CircleTargetConfig>) {
  const oddOneOut = config.mode === "ODD_ONE_OUT";
  const toggleTarget = (row: CircleTargetRow, itemIdx: number): CircleTargetRow => ({
    ...row,
    items: row.items.map((it, idx) => ({ ...it, isTarget: idx === itemIdx ? !it.isTarget : oddOneOut ? false : it.isTarget })),
  });

  return (
    <div className="space-y-4">
      <EditorShell
        memoryKey="KDG_CIRCLE_TARGET"
        basic={
          <>
            <InstructionField value={instructionText} onChange={onInstructionChange} defaultValue={config.instruction} />
            <ChoiceChips<CircleTargetConfig["mode"]>
              label="Child circles"
              value={config.mode}
              onChange={(mode) =>
                onChange({
                  ...config,
                  mode,
                  // odd one out has a single answer per row: keep only the first marked one
                  rows:
                    mode === "ODD_ONE_OUT"
                      ? config.rows.map((r) => {
                          const first = r.items.findIndex((i) => i.isTarget);
                          return { ...r, items: r.items.map((it, idx) => ({ ...it, isTarget: idx === first })) };
                        })
                      : config.rows,
                })
              }
              options={[
                { value: "ODD_ONE_OUT", label: "The odd one out" },
                { value: "FIND_TARGET", label: "Every matching one" },
              ]}
            />
            <RowList<CircleTargetRow>
              label={oddOneOut ? "Rows — tap ○ to mark the odd one" : "Rows — tap ○ on each answer"}
              rows={config.rows}
              onChange={(rows) => onChange({ ...config, rows })}
              makeRow={() => ({ rowLabel: `Row ${config.rows.length + 1}`, items: [newItem("star"), newItem("star"), newItem("sun", true), newItem("star")] })}
              max={6}
              addLabel="Add row"
              renderRow={(row, update) => (
                <div className="flex flex-wrap items-center gap-1.5">
                  {row.items.map((item, itemIdx) => (
                    <div key={item.id || itemIdx} className={`flex items-center gap-0.5 rounded-lg border-2 bg-white p-0.5 ${item.isTarget ? "border-indigo-500" : "border-slate-200"}`}>
                      <PictureChip
                        clipartId={item.clipartId}
                        size={24}
                        onPick={(id) => update({ ...row, items: row.items.map((it, k) => (k === itemIdx ? { ...it, type: "CLIPART", clipartId: id } : it)) })}
                      />
                      <button
                        type="button"
                        aria-label={`Picture ${itemIdx + 1} is an answer`}
                        aria-pressed={item.isTarget}
                        onClick={() => update(toggleTarget(row, itemIdx))}
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${item.isTarget ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}
                      >
                        ○
                      </button>
                      {row.items.length > 2 && (
                        <button
                          type="button"
                          aria-label={`Remove picture ${itemIdx + 1}`}
                          onClick={() => update({ ...row, items: row.items.filter((_, k) => k !== itemIdx) })}
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {row.items.length < 6 && (
                    <button type="button" onClick={() => update({ ...row, items: [...row.items, newItem("star")] })} className="rounded-lg border border-dashed border-indigo-300 px-2 py-1 text-xs font-semibold text-indigo-700">
                      + Picture
                    </button>
                  )}
                </div>
              )}
            />
          </>
        }
        advanced={
          <Field label="What to look for (optional)" hint="Shown under the instruction">
            <input
              value={config.targetDescription ?? ""}
              onChange={(e) => onChange({ ...config, targetDescription: e.target.value || undefined })}
              placeholder="e.g. Circle the fruits"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
        }
      />
      <PreviewBox>
        <CircleTargetPrint config={config} instructionText={instructionText} />
      </PreviewBox>
    </div>
  );
}

function CircleTargetPrint({
  config,
  instructionText,
  numberLabel,
  marks,
}: KindergartenPrintProps<CircleTargetConfig>) {
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

      <div className="space-y-3 my-1">
        {config.rows.map((row, rIdx) => (
          <div
            key={rIdx}
            className="flex items-center justify-between p-2.5 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/30"
          >
            <span className="font-black text-xs text-slate-500 w-6 select-none">
              ({rIdx + 1})
            </span>
            <div className="flex-1 flex items-center justify-around gap-2 px-2">
              {row.items.map((item, iIdx) => {
                const clipart = item.clipartId ? getClipartById(item.clipartId) : null;

                return (
                  <div
                    key={iIdx}
                    className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-2 border-2 border-slate-800 rounded-2xl bg-white text-slate-950 shadow-2xs"
                  >
                    {clipart ? clipart.renderSvg(48) : <span className="font-bold">{item.text || "★"}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const circleTargetPlugin: KindergartenActivityPlugin<CircleTargetConfig> = {
  type: "KDG_CIRCLE_TARGET",
  label: "Circle the Target / Odd One Out",
  shortLabel: "Circle Item",
  category: "general",
  description: "Rows of clipart images or letters for children to circle the odd or target item.",
  iconName: "CircleDot",
  defaultConfig: circleTargetDefaultConfig,
  validateConfig: (cfg) => {
    if (!cfg || typeof cfg !== "object") return { valid: false, error: "Invalid config" };
    return { valid: true };
  },
  renderEditor: CircleTargetEditor,
  renderPrint: CircleTargetPrint,
  getSummary: (config) => {
    return `${config.mode === "ODD_ONE_OUT" ? "Odd one out" : "Find target"} (${config.rows.length} rows)`;
  },
};
