"use client";

/**
 * Building blocks every activity editor is made of, so all of them look and behave the same:
 * the settings teachers change most come first, everything else sits under "More options".
 */

import React, { useContext, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ImagePlus, Minus, Plus, RotateCcw, X } from "lucide-react";
import { ClipartPickerModal } from "../components/ClipartPickerModal";
import { getClipartById } from "../clipartLibrary";
import { joinPrompt, splitList, splitPrompt } from "./splitList";

export { joinPrompt, splitList, splitPrompt };

/* ------------------------------------------------------------------ shell */

/** Remembers which activity types have "More options" open, so it stays open while you move between activities. */
export const EditorMemoryContext = React.createContext<{
  isOpen(key: string): boolean;
  setOpen(key: string, open: boolean): void;
} | null>(null);

export function EditorShell({ memoryKey, basic, advanced }: { memoryKey: string; basic: React.ReactNode; advanced?: React.ReactNode }) {
  const memory = useContext(EditorMemoryContext);
  const [localOpen, setLocalOpen] = useState(false);
  const open = memory ? memory.isOpen(memoryKey) : localOpen;
  const setOpen = (v: boolean) => (memory ? memory.setOpen(memoryKey, v) : setLocalOpen(v));
  return (
    <div className="space-y-4">
      <div className="space-y-4">{basic}</div>
      {advanced && (
        <div className="rounded-xl border border-slate-200">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
          >
            More options
            <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && <div className="space-y-4 border-t border-slate-200 p-3">{advanced}</div>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ fields */

const labelCls = "mb-1.5 block text-xs font-semibold text-slate-600";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function InstructionField({ value, onChange, defaultValue }: { value: string; onChange: (v: string) => void; defaultValue: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">Instruction</span>
        {value !== defaultValue && (
          <button type="button" onClick={() => onChange(defaultValue)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline">
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>
      <input
        type="text"
        aria-label="Instruction"
        value={value}
        placeholder={defaultValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
      />
    </div>
  );
}

export function NumberStepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const [text, setText] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40";
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - 1))} className={btn}>
          <Minus size={13} />
        </button>
        <input
          aria-label={label}
          inputMode="numeric"
          value={text ?? String(value)}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const n = Number(text);
            if (text !== null && text.trim() !== "" && Number.isFinite(n)) onChange(clamp(n));
            setText(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="h-8 w-12 rounded-md border border-slate-300 text-center text-sm font-bold tabular-nums"
        />
        <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + 1))} className={btn}>
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

export function ChoiceChips<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      {label && <span className={labelCls}>{label}</span>}
      <div role="radiogroup" aria-label={label || undefined} className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              o.value === value ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ToggleRow({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span>
        <span className="block text-xs font-semibold text-slate-600">{label}</span>
        {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-indigo-600" : "bg-slate-300"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-4.5" : "left-0.5"}`} />
      </button>
    </label>
  );
}

/** A list of short items (letters, words) edited as chips; typing or pasting "A B C" adds three. */
export function TextListField({
  label,
  values,
  onChange,
  placeholder = "Type and press Enter",
  hint = "Use commas to keep words together, e.g. ice cream, apple",
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const items = splitList(raw);
    if (items.length) onChange([...values, ...items]);
    setDraft("");
  };
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white p-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30">
        {values.map((v, i) => (
          <span key={`${v}-${i}`} className="inline-flex items-center gap-0.5 rounded-md bg-indigo-50 py-0.5 pr-0.5 pl-2 text-sm font-semibold text-indigo-900">
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((_, j) => j !== i))} className="rounded p-0.5 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          placeholder={values.length ? "" : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            add(draft + " " + e.clipboardData.getData("text"));
          }}
          onBlur={() => draft && add(draft)}
          className="min-w-24 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm focus:outline-none"
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ pictures */

/** Compact picture button for use inside rows: shows the picture, click to change it. */
export function PictureChip({ clipartId, onPick, size = 28, label }: { clipartId?: string; onPick: (id: string) => void; size?: number; label?: string }) {
  const [open, setOpen] = useState(false);
  const art = clipartId ? getClipartById(clipartId) : undefined;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={art ? `${art.name} – click to change` : "Choose a picture"}
        aria-label={label ?? (art ? `Change picture (${art.name})` : "Choose picture")}
        className="flex h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-1.5 text-slate-900 hover:border-indigo-500"
      >
        {art ? art.renderSvg(size) : <ImagePlus size={16} className="text-slate-400" />}
      </button>
      <ClipartPickerModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSelect={(item) => {
          if ("id" in item) onPick(item.id);
          setOpen(false);
        }}
      />
    </>
  );
}

/** Full-width picture field: thumbnail, name and a "Change" button. */
export function PicturePicker({ label, clipartId, onChange }: { label: string; clipartId?: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const art = clipartId ? getClipartById(clipartId) : undefined;
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white p-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-50 text-slate-900">
          {art ? art.renderSvg(40) : <ImagePlus size={18} className="text-slate-400" />}
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-800">{art?.name ?? "No picture"}</span>
        <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
          Change
        </button>
      </div>
      <ClipartPickerModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSelect={(item) => {
          if ("id" in item) onChange(item.id);
          setOpen(false);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ rows */

/** Repeatable rows (pairs, words, sums…) with add, remove and move. */
export function RowList<T>({
  label,
  rows,
  onChange,
  makeRow,
  max,
  min = 1,
  renderRow,
  addLabel,
  startAt = 1,
}: {
  label: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  makeRow: () => T;
  max: number;
  min?: number;
  renderRow: (row: T, update: (r: T) => void, index: number) => React.ReactNode;
  addLabel: string;
  /** Number shown on the first row, when an item above the list already counts as 1. */
  startAt?: number;
}) {
  const set = (i: number, r: T) => onChange(rows.map((x, j) => (j === i ? r : x)));
  const swap = (i: number, j: number) => {
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const iconBtn = "flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className="text-[11px] text-slate-400">
          {rows.length} / {max}
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-1.5">
            <span className="mt-1.5 w-5 shrink-0 text-center text-[11px] font-bold text-slate-400">{i + startAt}</span>
            <div className="min-w-0 flex-1">{renderRow(row, (r) => set(i, r), i)}</div>
            <div className="flex shrink-0 flex-col">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => swap(i, i - 1)} className={iconBtn}>
                <ArrowUp size={12} />
              </button>
              <button type="button" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => swap(i, i + 1)} className={iconBtn}>
                <ArrowDown size={12} />
              </button>
            </div>
            <button
              type="button"
              aria-label="Remove row"
              disabled={rows.length <= min}
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={rows.length >= max}
        onClick={() => onChange([...rows, makeRow()])}
        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-40"
      >
        <Plus size={13} /> {addLabel}
      </button>
    </div>
  );
}
