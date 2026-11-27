"use client";

import React from "react";
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

/**
 * Whether an activity editor shows its own "Print Preview". The worksheet studio turns it off because
 * its page already shows the paper live; the Question Bank form has no other preview, so it keeps this one.
 */
export const EditorPreviewContext = React.createContext(true);

export function PreviewBox({ children }: { children: React.ReactNode }) {
  const show = React.useContext(EditorPreviewContext);
  if (!show) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Print Preview</span>
      {children}
    </div>
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
