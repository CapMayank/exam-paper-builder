"use client";

import type { ReactNode } from "react";
import type { Draft } from "./useActivityDrafts";
import type { Activity } from "./types";

export function activityDomId(itemId: string) {
  return `ws-activity-${itemId}`;
}

/** The worksheet as it will print, one activity after another; click an activity to edit it. */
export function WorksheetCanvas({
  activities,
  selectedId,
  onSelect,
  draftFor,
  emptyState,
}: {
  activities: Activity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  draftFor: (a: Activity) => Draft;
  emptyState: ReactNode;
}) {
  const totalMarks = activities.reduce((n, a) => n + a.section.marksEach, 0);

  if (activities.length === 0) return <>{emptyState}</>;

  return (
    <div className="space-y-3">
      <div className="mx-auto max-w-[720px] rounded-md bg-white px-5 py-6 shadow-sm ring-1 ring-slate-200">
        <div className="space-y-1">
          {activities.map((a, idx) => {
            const draft = draftFor(a);
            const Print = a.plugin.renderPrint;
            const selected = a.item.id === selectedId;
            return (
              <div
                key={a.item.id}
                id={activityDomId(a.item.id)}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`Activity ${idx + 1}: ${a.plugin.shortLabel}`}
                onClick={() => onSelect(a.item.id)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(a.item.id);
                  }
                }}
                className={`relative cursor-pointer scroll-mt-4 rounded-lg px-1 transition focus-visible:outline-none ${
                  selected ? "bg-indigo-50/40 ring-2 ring-indigo-500" : "hover:ring-2 hover:ring-indigo-200 focus-visible:ring-2 focus-visible:ring-indigo-300"
                }`}
              >
                {selected && (
                  <span className="absolute -top-2.5 left-3 z-10 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">Editing</span>
                )}
                <Print config={draft.config} instructionText={draft.text} numberLabel={`${idx + 1}.`} marks={a.section.marksEach} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-auto flex max-w-[720px] items-center justify-between px-1 text-sm">
        <span className="text-slate-600">
          {activities.length} {activities.length === 1 ? "activity" : "activities"}
        </span>
        <span className="font-bold text-slate-900">Total: {totalMarks} marks</span>
      </div>

      {activities.length > 7 && (
        <p className="mx-auto max-w-[720px] rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900">
          With {activities.length} activities the worksheet is scaled down a lot to fit 2 pages. For bigger, easier-to-read print, keep it to about 5–7 activities.
        </p>
      )}
    </div>
  );
}
