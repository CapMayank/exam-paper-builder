"use client";

import { GripVertical, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fitsHalfWidth } from "@/lib/kindergarten/pairing";
import { PACK_SAFETY, packWorksheet, rowsFor, type PackItem } from "@/lib/kindergarten/worksheetPack";
import { pageFill, type FillLevel } from "./pageFill";
import type { Draft } from "./useActivityDrafts";
import type { Activity } from "./types";

export function activityDomId(itemId: string) {
  return `ws-activity-${itemId}`;
}

const PX_PER_MM = 96 / 25.4;
/** A4 content height, and roughly the worksheet header above the first activity on page 1 (school, name lines). */
const PAGE_MM = 267;
const HEADER_MM = 40;

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
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [slot, setSlot] = useState<number | null>(null);

  // A hidden copy of the page is laid out at the real print width (182 mm), so it wraps like
  // paper does; its height says how full the 2 pages are. Re-measured whenever it changes size.
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setFill(pageFill(el.scrollHeight, el.clientWidth));
      // each activity's height at print width, for the two-column split and Arrange to fit
      const next: Record<string, number> = {};
      el.querySelectorAll<HTMLElement>("[data-ws-item]").forEach((n) => (next[n.dataset.wsItem!] = n.getBoundingClientRect().height));
      setHeights((h) => (JSON.stringify(h) === JSON.stringify(next) ? h : next));
    });
    ro.observe(el);
    el.querySelectorAll("[data-ws-item]").forEach((n) => ro.observe(n));
    return () => ro.disconnect();
  }, [activities.length]);

  // the rows print makes: runs of small activities as two columns that end about level
  const items: PackItem[] = activities.map((a) => ({ id: a.item.id, half: fitsHalfWidth(a.plugin, draftFor(a).config), height: heights[a.item.id] ?? 1 }));
  const itemsKey = JSON.stringify(items);
  const { rows, packed } = useMemo(() => {
    const list: PackItem[] = JSON.parse(itemsKey);
    const measured = list.length > 1 && list.every((i) => i.height > 1);
    const page = PAGE_MM * PX_PER_MM;
    const order = measured
      ? packWorksheet(list, { page1: (page - HEADER_MM * PX_PER_MM) * PACK_SAFETY, page2: page * PACK_SAFETY, gap: 0 })
      : list.map((i) => i.id);
    return { rows: rowsFor(list, 0), packed: order };
  }, [itemsKey]);

  if (activities.length === 0) return <>{emptyState}</>;

  const indexOf = new Map(activities.map((a, i) => [a.item.id, i]));
  const byId = new Map(activities.map((a) => [a.item.id, a]));
  const arranged = packed.map((id) => byId.get(id)!);
  const canArrange = packed.some((id, i) => id !== activities[i].item.id);
  const rowKey = (r: (typeof rows)[number]) => (r.kind === "full" ? r.ids[0] : r.left[0]);

  const endDrag = () => {
    setDragFrom(null);
    setSlot(null);
  };

  const renderCard = (a: Activity) => {
                const idx = indexOf.get(a.item.id)!;
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
                      // the top half of the box means "before" this one
                      const before = e.clientY < r.top + r.height / 2;
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
  };

  return (
    <div className="space-y-3">
      <div className="mx-auto max-w-[760px] rounded-md bg-white px-4 py-6 shadow-md ring-1 ring-slate-200 sm:px-8 sm:py-8">
        <div className="space-y-1">
          {rows.map((row) =>
            row.kind === "full" ? (
              <div key={rowKey(row)}>{renderCard(byId.get(row.ids[0])!)}</div>
            ) : (
              <div key={rowKey(row)} className="grid grid-cols-2 items-start gap-x-[5mm]">
                <div className="min-w-0 space-y-1">{row.left.map((id) => renderCard(byId.get(id)!))}</div>
                <div className="min-w-0 space-y-1">{row.right.map((id) => renderCard(byId.get(id)!))}</div>
              </div>
            ),
          )}
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
          {rows.map((row) => {
            const measure = (id: string) => {
              const a = byId.get(id)!;
              const Print = a.plugin.renderPrint;
              const draft = draftFor(a);
              return (
                <div key={id} className="min-w-0" data-ws-item={id}>
                  <Print config={draft.config} instructionText={draft.text} numberLabel={`${indexOf.get(id)! + 1}.`} marks={a.section.marksEach} />
                </div>
              );
            };
            return row.kind === "full" ? (
              <div key={rowKey(row)}>{measure(row.ids[0])}</div>
            ) : (
              <div key={rowKey(row)} className="grid grid-cols-2 items-start gap-x-[5mm]">
                <div className="min-w-0 space-y-1">{row.left.map(measure)}</div>
                <div className="min-w-0 space-y-1">{row.right.map(measure)}</div>
              </div>
            );
          })}
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
        {onArrange && canArrange && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
            <p className="text-xs text-indigo-900">
              Some space is left empty. Print preview moves activities to fill the page; you can do it now to see how it
              will look. Numbers follow the new order.
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
