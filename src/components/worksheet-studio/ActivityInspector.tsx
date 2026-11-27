"use client";

import { ArrowDown, ArrowUp, MousePointerClick, Trash2, X } from "lucide-react";
import { EditorPreviewContext } from "@/lib/kindergarten/activities/_shared";
import { NumberStepper } from "@/lib/kindergarten/editor-kit";
import type { Draft } from "./useActivityDrafts";
import type { Activity } from "./types";

export function ActivityInspector({
  activity,
  index,
  total,
  draft,
  onEdit,
  onMarks,
  onMove,
  onRemove,
  onClose,
}: {
  activity: Activity | null;
  index: number;
  total: number;
  draft: Draft | null;
  onEdit: (patch: Partial<Draft>) => void;
  onMarks: (n: number) => void;
  onMove: (dir: "up" | "down") => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  if (!activity || !draft) {
    return (
      <div className="hidden rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center lg:block">
        <MousePointerClick size={22} className="mx-auto mb-2 text-slate-400" />
        <p className="text-sm font-semibold text-slate-700">Click an activity on the page to edit it</p>
        <p className="mt-1 text-xs text-slate-500">Its settings show up here, and the page changes as you type.</p>
      </div>
    );
  }

  const Editor = activity.plugin.renderEditor;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs lg:max-h-[calc(100vh-2rem)]">
      <div className="flex items-start gap-2 border-b border-slate-100 px-4 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900">{activity.plugin.shortLabel}</h2>
          <p className="text-[11px] leading-snug text-slate-500">{activity.plugin.description}</p>
        </div>
        <button type="button" aria-label="Close editor" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* the page is the preview; the editor's own copy would be a second one */}
        <EditorPreviewContext.Provider value={false}>
          <Editor
            config={draft.config}
            onChange={(config: Draft["config"]) => onEdit({ config })}
            instructionText={draft.text}
            onInstructionChange={(text: string) => onEdit({ text })}
          />
        </EditorPreviewContext.Provider>
      </div>

      <div className="space-y-2.5 border-t border-slate-100 px-4 py-3">
        <NumberStepper label="Marks" value={activity.section.marksEach} min={1} max={20} onChange={onMarks} />
        <div className="flex items-center gap-1.5">
          <button type="button" className="btn btn-sm" disabled={index === 0} onClick={() => onMove("up")}>
            <ArrowUp size={13} /> Up
          </button>
          <button type="button" className="btn btn-sm" disabled={index === total - 1} onClick={() => onMove("down")}>
            <ArrowDown size={13} /> Down
          </button>
          <button type="button" className="btn btn-sm ml-auto text-red-600" onClick={onRemove}>
            <Trash2 size={13} /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}
