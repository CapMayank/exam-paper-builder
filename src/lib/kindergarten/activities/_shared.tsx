"use client";

import React, { useState } from "react";
import { ImagePlus, Minus, Plus, X } from "lucide-react";
import { ClipartPickerModal } from "../components/ClipartPickerModal";
import { getClipartById } from "../clipartLibrary";

/** Bordered activity block with the question number, instruction and marks – same look as the other activities. */
export function ActivityFrame({
  numberLabel,
  instruction,
  marks,
  children,
}: {
  numberLabel?: string;
  instruction: string;
  marks?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="my-2 rounded-xl border-2 border-slate-800 bg-white p-3">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-start gap-2">
          {numberLabel && <span className="min-w-6 text-base font-black text-slate-950">{numberLabel}</span>}
          <span className="text-sm font-bold leading-snug text-slate-900">{instruction}</span>
        </div>
        {marks !== undefined && (
          <span className="shrink-0 rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-700">
            [{marks} {marks === 1 ? "Mark" : "Marks"}]
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function InstructionField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
        Activity Instruction / Prompt
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
      />
    </div>
  );
}

export function EditorSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function PreviewBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Print Preview</span>
      {children}
    </div>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <button
        type="button"
        aria-label={`Fewer ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        <Minus size={13} />
      </button>
      <span className="w-6 text-center text-sm font-bold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label={`More ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

export function RemoveButton({ onClick, label = "Remove" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
    >
      <X size={14} />
    </button>
  );
}

export function AddRowButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
    >
      <Plus size={13} /> {children}
    </button>
  );
}

/** Small button that shows a clipart and opens the picker. */
export function ClipartChip({
  clipartId,
  onPick,
  size = 28,
  label,
}: {
  clipartId?: string;
  onPick: (id: string) => void;
  size?: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const art = clipartId ? getClipartById(clipartId) : undefined;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={art ? `${art.name} – click to change` : "Choose a picture"}
        aria-label={label ?? "Choose picture"}
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

export function Art({ id, size = 36 }: { id?: string; size?: number }) {
  const art = id ? getClipartById(id) : undefined;
  return <span className="inline-flex items-center justify-center text-slate-900">{art ? art.renderSvg(size) : null}</span>;
}

/** Basic outline shapes used by pattern activities. */
export const SHAPE_IDS = ["circle", "square", "triangle", "star", "heart", "diamond", "rectangle"] as const;

export function ShapeGlyph({ id, size = 36 }: { id: string; size?: number }) {
  const common = { fill: "none", stroke: "#0f172a", strokeWidth: 3, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label={id}>
      {id === "circle" && <circle cx="20" cy="20" r="15" {...common} />}
      {id === "square" && <rect x="6" y="6" width="28" height="28" {...common} />}
      {id === "rectangle" && <rect x="3" y="11" width="34" height="18" {...common} />}
      {id === "triangle" && <polygon points="20,5 36,34 4,34" {...common} />}
      {id === "diamond" && <polygon points="20,3 36,20 20,37 4,20" {...common} />}
      {id === "star" && (
        <polygon points="20,3 25,15 38,16 28,24 31,37 20,30 9,37 12,24 2,16 15,15" {...common} />
      )}
      {id === "heart" && (
        <path d="M20 35 C5 24 4 13 12 9 C16 7 19 9 20 13 C21 9 24 7 28 9 C36 13 35 24 20 35 Z" {...common} />
      )}
    </svg>
  );
}

/** A dashed "write here" box. */
export function AnswerBox({ size = 40, round = false }: { size?: number; round?: boolean }) {
  return (
    <span
      className={`inline-block border-2 border-dashed border-slate-500 bg-white ${round ? "rounded-full" : "rounded-md"}`}
      style={{ width: size, height: size }}
    />
  );
}
