"use client";

import { GripVertical, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { arrangeToFit, fitsHalfWidth, pairHalfWidth } from "@/lib/kindergarten/pairing";
import { pageFill, type FillLevel } from "./pageFill";
import type { Draft } from "./useActivityDrafts";
import type { Activity } from "./types";

export function activityDomId(itemId: string) {
  return `ws-activity-${itemId}`;
}

/** Where a dragged activity lands: before item `slot` (slot = count means at the end). */
function landingIndex(from: number, slot: number) {
  return slot > from ? slot - 1 : slot;
}

/**
 * The worksheet as it will print, one activity after another; two small ones in a row share a line, as in print.
 * Click an activity to edit it, drag it by its handle to move it. Below the page, a meter shows how full the
 * 2 A4 pages are.
 */
export function WorksheetCanvas({
  activities,
  selectedId,
  onSelect,
  onMoveTo,
  draftFor,
  emptyState,
  addButton,
  onArrange,
}: {
  activities: Activity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveTo: (a: Activity, index: number) => void;
  draftFor: (a: Activity) => Draft;
  emptyState: ReactNode;
  /** Shown at the foot of the page, where the next activity would go. */
  addButton?: ReactNode;
  /** Applies a new order of the activities (Arrange to fit). */
  onArrange?: (order: Activity[]) => void;
}) {
  const totalMarks = activities.reduce((n, a) => n + a.section.marksEach, 0);
  const measureRef = useRef<HTMLDivElement>(null);
  const [fill, setFill] = useState<{
    pages: number;
    level: FillLevel;
    scale: number;
  }>({ pages: 0, level: "fits", scale: 1 });
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [slot, setSlot] = useState<number | null>(null);

  // A hidden copy of the page is laid out at the real print width (182 mm), so it wraps like
  // paper does; its height says how full the 2 pages are. Re-measured whenever it changes size.
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setFill(pageFill(el.scrollHeight, el.clientWidth)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [activities.length]);

  if (activities.length === 0) return <>{emptyState}</>;

  // the same rows print makes: two half-width activities in a row share one, left then right
  const indexOf = new Map(activities.map((a, i) => [a.item.id, i]));
  const isHalf = (a: Activity) => fitsHalfWidth(a.plugin, draftFor(a).config);
  const rows = pairHalfWidth(activities, isHalf);
  // small activities kept apart by a big one could share rows if moved up beside each other
  const arranged = arrangeToFit(activities, isHalf);
  const rowsSaved = rows.length - pairHalfWidth(arranged, isHalf).length;
  const rowClass = (row: Activity[]) =>
    row.length === 2 ? "grid grid-cols-2 items-start gap-x-[5mm]" : "";

  const endDrag = () => {
    setDragFrom(null);
    setSlot(null);
  };

  return (
    <div className="space-y-3">
      <div className="mx-auto max-w-[760px] rounded-md bg-white px-4 py-6 shadow-md ring-1 ring-slate-200 sm:px-8 sm:py-8">
        <div className="space-y-1">
          {rows.map((row) => (
            <div key={row[0].item.id} className={rowClass(row)}>
              {row.map((a) => {
                const idx = indexOf.get(a.item.id)!;
                const paired = row.length === 2;
                const draft = draftFor(a);
                const Print = a.plugin.renderPrint;
                const selected = a.item.id === selectedId;
                const showLineBefore =
                  dragFrom !== null &&
                  slot === idx &&
                  landingIndex(dragFrom, idx) !== dragFrom;
                const showLineAfter =
                  dragFrom !== null &&
                  idx === activities.length - 1 &&
                  slot === activities.length &&
                  landingIndex(dragFrom, slot) !== dragFrom;
                return (
                  <div
                    key={a.item.id}
                    onDragOver={(e) => {
                      if (dragFrom === null) return;
                      e.preventDefault();
                      const r = e.currentTarget.getBoundingClientRect();
                      // side by side, left half of the box means "before" this one; stacked, the top half does
                      const before = paired
                        ? e.clientX < r.left + r.width / 2
                        : e.clientY < r.top + r.height / 2;
                      setSlot(before ? idx : idx + 1);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragFrom !== null && slot !== null) {
                        const to = landingIndex(dragFrom, slot);
                        if (to !== dragFrom) onMoveTo(activities[dragFrom], to);
                      }
                      endDrag();
                    }}
                  >
                    {showLineBefore && (
                      <div
                        className="mb-1 h-1 rounded-full bg-indigo-500"
                        aria-hidden
                      />
                    )}
                    <div
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
                      className={`group relative cursor-pointer scroll-mt-20 rounded-lg px-1 transition focus-visible:outline-none ${
                        dragFrom === idx ? "opacity-40" : ""
                      } ${selected ? "bg-indigo-50/40 ring-2 ring-indigo-500" : "hover:ring-2 hover:ring-indigo-200 focus-visible:ring-2 focus-visible:ring-indigo-300"}`}
                    >
                      <span
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", a.item.id);
                          setDragFrom(idx);
                        }}
                        onDragEnd={endDrag}
                        onClick={(e) => e.stopPropagation()}
                        title="Drag to move"
                        aria-hidden
                        className={`absolute top-2 -left-6 flex h-7 w-5 cursor-grab items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing ${
                          selected
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <GripVertical size={16} />
                      </span>
                      {selected && (
                        <span className="absolute -top-2.5 left-3 z-10 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          Editing
                        </span>
                      )}
                      <Print
                        config={draft.config}
                        instructionText={draft.text}
                        numberLabel={`${idx + 1}.`}
                        marks={a.section.marksEach}
                      />
                    </div>
                    {showLineAfter && (
                      <div
                        className="mt-1 h-1 rounded-full bg-indigo-500"
                        aria-hidden
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {addButton && <div className="no-print mt-4">{addButton}</div>}
      </div>

      {/* the same page at print width, out of sight, only to measure it */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 -left-[10000px] invisible"
        style={{ width: "182mm" }}
      >
        <div ref={measureRef} className="space-y-1">
          {rows.map((row) => (
            <div key={row[0].item.id} className={rowClass(row)}>
              {row.map((a) => {
                const Print = a.plugin.renderPrint;
                const draft = draftFor(a);
                return (
                  <div key={a.item.id} className="min-w-0">
                    <Print
                      config={draft.config}
                      instructionText={draft.text}
                      numberLabel={`${indexOf.get(a.item.id)! + 1}.`}
                      marks={a.section.marksEach}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[760px] space-y-2 px-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            {activities.length}{" "}
            {activities.length === 1 ? "activity" : "activities"}
          </span>
          <span className="font-bold text-slate-900">
            Total: {totalMarks} marks
          </span>
        </div>
        <PageFillMeter
          pages={fill.pages}
          level={fill.level}
          scale={fill.scale}
        />
        {onArrange && rowsSaved > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
            <p className="text-xs text-indigo-900">
              {rowsSaved === 1 ? "Two small activities are" : `${rowsSaved * 2} small activities are`} kept apart by bigger
              ones. Moving them side by side saves room, so print stays bigger.
            </p>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => onArrange(arranged)}>
              <Sparkles size={13} /> Arrange to fit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PageFillMeter({
  pages,
  level,
  scale,
}: {
  pages: number;
  level: FillLevel;
  scale: number;
}) {
  if (pages <= 0) return null;
  const warn = level === "tiny" || level === "overflow";
  const pct = Math.min(100, (pages / 2) * 100);
  // an upper bound: print moves whole activities to the next page, which wastes some room, so it often goes smaller
  const size = `${Math.round(scale * 100)}%`;
  const message =
    level === "fits"
      ? `About ${pages.toFixed(1)} of 2 pages (front & back) – prints at full size`
      : level === "overflow"
        ? `Needs about ${pages.toFixed(1)} pages – too much for one sheet even at the smallest size`
        : `Needs about ${pages.toFixed(1)} pages – prints at ${size} size or smaller to fit one sheet`;
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${level === "overflow" ? "border-red-300 bg-red-50" : warn ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-700">Page space</span>
        <span
          className={
            level === "fits"
              ? "text-slate-500"
              : level === "overflow"
                ? "font-semibold text-red-800"
                : "font-semibold text-amber-800"
          }
        >
          {message}
        </span>
      </div>
      <div
        className="relative h-2 overflow-hidden rounded-full bg-slate-100"
        role="meter"
        aria-label="Page space used"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={Math.min(pages, 2)}
        aria-valuetext={message}
      >
        <div
          className={`h-full rounded-full ${level === "overflow" ? "bg-red-500" : level === "tiny" ? "bg-amber-500" : level === "shrinks" ? "bg-amber-400" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
        <span
          className="absolute inset-y-0 left-1/2 w-px bg-slate-300"
          aria-hidden
        />
      </div>
      {level === "tiny" && (
        <p className="mt-1.5 text-[11px] text-amber-900">
          Letters and boxes get small for little hands. Removing an activity or
          two keeps print big – Print preview shows the exact size.
        </p>
      )}
      {level === "overflow" && (
        <p className="mt-1.5 text-[11px] text-red-900">
          This would run onto a third page. Remove a few activities, or fewer
          items in the long ones, so it fits one A4 sheet printed on both sides.
        </p>
      )}
    </div>
  );
}
