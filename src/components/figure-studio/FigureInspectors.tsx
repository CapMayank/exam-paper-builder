"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ChevronDown,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { formatFraction, formatMixed, parseFraction, toFraction } from "./fractions";
import { numberLineTicks } from "./render";
import type { AxesObj, FractionObj, NumLineObj, Obj, TableObj } from "./types";
import { CANVAS_PRESETS, MAX_CANVAS, MIN_CANVAS } from "./types";

export type Update = (fn: (o: Obj) => Obj) => void;

/* ------------------------------------------------------------------ Shared inspector pieces */

export const LABEL = "mb-1 block text-xs font-medium text-slate-600";
export const CHIP =
  "inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50";

/**
 * One collapsible group of the inspector. Groups sit flat on the panel, divided by a rule, so the
 * panel reads as one list instead of boxes nested inside boxes.
 */
export function Section({
  title,
  defaultOpen = true,
  summary,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  summary?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-slate-200 last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex-1 text-[13px] font-semibold text-slate-900">{title}</span>
        {!open && summary && <span className="truncate text-xs text-slate-500">{summary}</span>}
        <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-3 px-4 pb-4 pt-0.5">{children}</div>}
    </section>
  );
}

export function NumInput({
  label,
  value,
  onCommit,
  step = 1,
  className = "",
  onBlurOnly = false,
}: {
  label?: string;
  value: number;
  onCommit: (v: number) => void;
  step?: number;
  className?: string;
  /** Commit only when the field loses focus / Enter is pressed (for values that must not jump while typing). */
  onBlurOnly?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = (raw: string) => {
    const v = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(v)) onCommit(v);
    else setDraft(String(value));
  };
  return (
    <label className={`block ${className}`}>
      {label && <span className={LABEL}>{label}</span>}
      <input
        type="number"
        className="input !py-1.5 !px-2 text-[13px] w-full tabular-nums"
        value={draft}
        step={step}
        onChange={(e) => {
          setDraft(e.target.value);
          if (!onBlurOnly) {
            const v = e.target.valueAsNumber;
            if (Number.isFinite(v)) onCommit(v);
          }
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
        }}
      />
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-0.5 text-[13px] text-slate-800">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Segmented choice using the app's `.segmented` control. */
export function Seg<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: React.ReactNode; title?: string }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div>
      {label && <span className={LABEL}>{label}</span>}
      <div className="segmented w-full [&>button]:flex-1 [&>button]:!px-1.5 [&>button]:text-xs">
        {options.map((o) => (
          <button key={String(o.id)} type="button" title={o.title} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  display,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  display?: number;
}) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className="flex items-center rounded-lg border border-slate-300 bg-white">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-l-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus size={13} />
        </button>
        <span className="flex-1 text-center text-sm font-semibold tabular-nums">{display ?? value}</span>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-r-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

/** Labelled range slider with its value shown on the right. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-xs font-medium text-slate-600">
        <span>{label}</span>
        <span className="tabular-nums text-slate-900">
          {value}
          {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </label>
  );
}

/* ------------------------------------------------------------------ Fraction entry */

function decompose(val: number) {
  const f = toFraction(val);
  if (!f) return { neg: val < 0, whole: String(Number(Math.abs(val).toFixed(6))), num: "", den: "" };
  const abs = Math.abs(f.n);
  if (f.d === 1) return { neg: f.n < 0, whole: String(abs), num: "", den: "" };
  const whole = Math.floor(abs / f.d);
  return { neg: f.n < 0, whole: whole ? String(whole) : "", num: String(abs % f.d), den: String(f.d) };
}

const ENTRY_PREF = "figure-studio:fraction-entry";
function readEntryPref(): "text" | "boxes" {
  try {
    return localStorage.getItem(ENTRY_PREF) === "boxes" ? "boxes" : "text";
  } catch {
    return "text";
  }
}

/** Small stacked rendering of a value (¾, 2¼, −½) so a typed "0.75" or "3/4" can be checked at a glance. */
function StackedPreview({ value }: { value: number }) {
  const f = toFraction(value);
  if (!f || f.d === 1) return null;
  const abs = Math.abs(f.n);
  const whole = Math.floor(abs / f.d);
  return (
    <span className="flex shrink-0 items-center gap-0.5 pr-1 text-slate-500" aria-hidden>
      {f.n < 0 && <span className="text-xs">−</span>}
      {whole > 0 && <span className="text-xs font-semibold tabular-nums">{whole}</span>}
      <span className="flex flex-col items-center text-[10px] font-semibold leading-[11px] tabular-nums">
        <span>{abs % f.d}</span>
        <span className="h-px w-full min-w-2 bg-slate-400" />
        <span>{f.d}</span>
      </span>
    </span>
  );
}

/**
 * Value entry that understands fractions. Type "3/4", "2 1/4", "-5" or "0.75" (a stacked preview shows
 * what will be drawn), or switch to separate whole / numerator / denominator boxes. The choice is
 * remembered. Commits live once the entry makes a valid number; onCommit returns false to reject it.
 */
export function FractionField({
  label,
  value,
  onCommit,
  hint,
  className = "",
}: {
  label?: string;
  value: number;
  onCommit: (v: number) => boolean | void;
  hint?: string;
  className?: string;
}) {
  const init = decompose(value);
  const [neg, setNeg] = useState(init.neg);
  const [whole, setWhole] = useState(init.whole);
  const [num, setNum] = useState(init.num);
  const [den, setDen] = useState(init.den);
  // The studio renders only on the client (after mount, in a portal), so localStorage is safe here.
  const [mode, setMode] = useState<"text" | "boxes">(readEntryPref);
  const [text, setText] = useState(formatMixed(value));
  const [bad, setBad] = useState(false);
  const sent = useRef(value);

  // Pick up changes made elsewhere (presets, "split into equal parts", another field).
  useEffect(() => {
    if (Math.abs(value - sent.current) > 1e-9) {
      const d = decompose(value);
      setNeg(d.neg);
      setWhole(d.whole);
      setNum(d.num);
      setDen(d.den);
      setText(formatMixed(value));
      setBad(false);
      sent.current = value;
    }
  }, [value]);

  const send = (v: number | null) => {
    if (v === null || !Number.isFinite(v)) {
      setBad(true);
      return;
    }
    const ok = onCommit(v) !== false;
    setBad(!ok);
    if (ok) sent.current = v;
  };

  const fromBoxes = (n0: boolean, w: string, n: string, d: string): number | null => {
    const wv = w === "" ? 0 : Number(w);
    if (!Number.isFinite(wv) || wv < 0) return null;
    let v = wv;
    if (n !== "" || d !== "") {
      const nv = n === "" ? 0 : Number(n);
      const dv = Number(d);
      if (!Number.isFinite(nv) || nv < 0 || !(dv > 0)) return null;
      v += nv / dv;
    } else if (w === "") return null;
    return n0 ? -v : v;
  };

  const switchMode = () => {
    const next = mode === "text" ? "boxes" : "text";
    if (next === "text") setText(formatMixed(fromBoxes(neg, whole, num, den) ?? value));
    else {
      const d = decompose(parseFraction(text) ?? value);
      setNeg(d.neg);
      setWhole(d.whole);
      setNum(d.num);
      setDen(d.den);
    }
    setMode(next);
    try {
      localStorage.setItem(ENTRY_PREF, next);
    } catch {
      /* preference is a convenience only */
    }
  };

  const box = "h-7 w-10 rounded border border-slate-300 bg-white p-0 text-center text-[13px] tabular-nums focus:border-indigo-500 focus:outline-none";
  const typed = parseFraction(text);
  return (
    <div className={className}>
      {label && <span className={LABEL}>{label}</span>}
      <div
        className={`flex min-h-9 items-center gap-1 rounded-lg border px-1 transition focus-within:ring-3 focus-within:ring-indigo-500/20 ${
          bad ? "border-red-400 bg-red-50" : "border-slate-300 bg-white focus-within:border-indigo-500"
        }`}
      >
        {mode === "text" ? (
          <>
            <input
              type="text"
              inputMode="decimal"
              aria-label={label ?? "Value"}
              placeholder="3/4, 2 1/4, 0.5"
              className="h-8 min-w-0 flex-1 border-0 bg-transparent px-1.5 text-[13px] tabular-nums outline-none"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                send(parseFraction(e.target.value));
              }}
            />
            {typed !== null && <StackedPreview value={typed} />}
          </>
        ) : (
          <div className="flex flex-1 items-center gap-1 py-1">
            <button
              type="button"
              className={`h-7 w-6 shrink-0 rounded text-sm font-bold ${neg ? "bg-slate-800 text-white" : "border border-slate-200 text-slate-400"}`}
              title={neg ? "Negative (click to make positive)" : "Positive (click to make negative)"}
              aria-label="Toggle negative"
              aria-pressed={neg}
              onClick={() => {
                setNeg(!neg);
                send(fromBoxes(!neg, whole, num, den));
              }}
            >
              −
            </button>
            <input
              type="number"
              min={0}
              aria-label={`${label ?? "Value"} whole number`}
              placeholder="0"
              className={box}
              value={whole}
              onChange={(e) => {
                setWhole(e.target.value);
                send(fromBoxes(neg, e.target.value, num, den));
              }}
            />
            <div className="flex flex-col items-center gap-px">
              <input
                type="number"
                min={0}
                aria-label={`${label ?? "Value"} numerator`}
                placeholder="n"
                className={`${box} !h-6`}
                value={num}
                onChange={(e) => {
                  setNum(e.target.value);
                  send(fromBoxes(neg, whole, e.target.value, den));
                }}
              />
              <div className="h-px w-10 bg-slate-500" />
              <input
                type="number"
                min={1}
                aria-label={`${label ?? "Value"} denominator`}
                placeholder="d"
                className={`${box} !h-6`}
                value={den}
                onChange={(e) => {
                  setDen(e.target.value);
                  send(fromBoxes(neg, whole, num, e.target.value));
                }}
              />
            </div>
          </div>
        )}
        <button
          type="button"
          className="ml-auto flex h-7 shrink-0 items-center rounded px-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-indigo-700"
          title={mode === "text" ? "Enter with fraction boxes" : "Type the value instead"}
          onClick={switchMode}
        >
          {mode === "text" ? "a/b" : "Type"}
        </button>
      </div>
      {bad && <span className="mt-0.5 block text-[11px] text-red-600">{hint ?? "Type a number like 3, -2, 3/4 or 2 1/4"}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ Number line */

const NUMLINE_PRESETS: { label: string; min: number; max: number; step: number; labels: "number" | "fraction" }[] = [
  { label: "0 to 10", min: 0, max: 10, step: 1, labels: "number" },
  { label: "−5 to 5", min: -5, max: 5, step: 1, labels: "number" },
  { label: "Tenths", min: 0, max: 1, step: 0.1, labels: "number" },
  { label: "Quarters", min: 0, max: 1, step: 0.25, labels: "fraction" },
  { label: "Halves to 3", min: 0, max: 3, step: 0.5, labels: "fraction" },
  { label: "Eighths to 2", min: 0, max: 2, step: 0.125, labels: "fraction" },
];

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/**
 * A miniature of the number line that the teacher taps: in dot mode a tap cycles
 * none → filled dot → hollow dot → none; in jump mode two taps draw a jump arc.
 */
function TickStrip({
  obj,
  mode,
  jumpFrom,
  onTap,
}: {
  obj: NumLineObj;
  mode: "dot" | "jump";
  jumpFrom: number | null;
  onTap: (v: number) => void;
}) {
  const ticks = numberLineTicks(obj);
  const W = 300;
  const pad = 14;
  const y = 40;
  const span = obj.max - obj.min || 1;
  const xOf = (v: number) => pad + ((v - obj.min) / span) * (W - 2 * pad);
  const gap = (W - 2 * pad) / Math.max(1, ticks.length - 1);
  const labelEvery = Math.max(1, Math.ceil(26 / gap));
  const asFraction = obj.labels === "fraction";

  return (
    <svg viewBox={`0 0 ${W} 62`} className="w-full select-none" role="group" aria-label="Points on the number line">
      <line x1={pad - 6} x2={W - pad + 6} y1={y} y2={y} className="stroke-slate-400" strokeWidth={1.5} />
      {(obj.jumps ?? []).map((j, i) => {
        const x1 = xOf(j.from);
        const x2 = xOf(j.to);
        const h = Math.min(24, 8 + Math.abs(x2 - x1) * 0.25);
        return (
          <path
            key={i}
            d={`M ${x1} ${y - 3} Q ${(x1 + x2) / 2} ${y - 3 - h * 2} ${x2} ${y - 3}`}
            fill="none"
            className="stroke-indigo-500"
            strokeWidth={1.5}
          />
        );
      })}
      {ticks.map((v, i) => {
        const x = xOf(v);
        const mark = obj.marks.find((m) => near(m.v, v));
        const isFrom = jumpFrom !== null && near(jumpFrom, v);
        const showLabel = i % labelEvery === 0 || i === ticks.length - 1;
        const text = asFraction ? formatFraction(v) : String(Number(v.toFixed(4)));
        const verb = mode === "dot" ? (mark ? (mark.open ? "clear the dot at" : "make hollow dot at") : "put a dot at") : isFrom ? "cancel jump from" : jumpFrom === null ? "start a jump at" : "end the jump at";
        return (
          <g
            key={v}
            role="button"
            tabIndex={0}
            aria-label={`${verb} ${formatFraction(v)}`}
            className="group cursor-pointer outline-none"
            onClick={() => onTap(v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTap(v);
              }
            }}
          >
            <rect x={x - Math.max(6, gap / 2)} y={8} width={Math.max(12, gap)} height={54} fill="transparent" />
            <circle cx={x} cy={y} r={9} className="fill-indigo-100 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
            <line x1={x} x2={x} y1={y - 5} y2={y + 5} className="stroke-slate-500" strokeWidth={1.2} />
            {isFrom && <circle cx={x} cy={y} r={8} fill="none" className="stroke-indigo-600" strokeWidth={2} strokeDasharray="3 2" />}
            {mark && (
              <circle cx={x} cy={y} r={5} className={mark.open ? "fill-white stroke-slate-900" : "fill-slate-900 stroke-slate-900"} strokeWidth={1.6} />
            )}
            {showLabel && (
              <text x={x} y={y + 19} textAnchor="middle" className="fill-slate-600 text-[10px] tabular-nums">
                {text}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function NumberLineInspector({ obj, update }: { obj: NumLineObj; update: Update }) {
  const set = (patch: Partial<NumLineObj>) => update((o) => ({ ...(o as NumLineObj), ...patch }));
  const [tapMode, setTapMode] = useState<"dot" | "jump">("dot");
  const [jumpStart, setJumpStart] = useState<number | null>(null);
  const [showOther, setShowOther] = useState(false);
  const [markVal, setMarkVal] = useState(obj.min);
  const [jumpFrom, setJumpFrom] = useState(obj.min);
  const [jumpTo, setJumpTo] = useState(obj.max);
  const [tickVal, setTickVal] = useState((obj.min + obj.max) / 2);
  const [parts, setParts] = useState(4);

  // When the range changes, pull any entry that now falls outside it back to a sensible default.
  useEffect(() => {
    const ok = (v: number) => v >= obj.min - 1e-9 && v <= obj.max + 1e-9;
    setMarkVal((v) => (ok(v) ? v : obj.min));
    setJumpFrom((v) => (ok(v) ? v : obj.min));
    setJumpTo((v) => (ok(v) ? v : obj.max));
    setTickVal((v) => (ok(v) ? v : (obj.min + obj.max) / 2));
    setJumpStart(null);
  }, [obj.min, obj.max]);

  const manual = obj.tickMode === "manual";
  const diff = obj.max - obj.min;
  const inRange = (v: number) => v >= obj.min - 1e-9 && v <= obj.max + 1e-9;
  const stepCount = diff / (obj.step || 1);
  const uneven = !manual && Math.abs(stepCount - Math.round(stepCount)) > 1e-6;
  const rangeHint = `Pick a value from ${formatFraction(obj.min)} to ${formatFraction(obj.max)}.`;
  const tickCount = numberLineTicks(obj).length;
  const jumps = obj.jumps ?? [];
  const outside = obj.marks.filter((m) => !inRange(m.v)).length + jumps.filter((j) => !inRange(j.from) || !inRange(j.to)).length;
  const jumpLabel = (from: number, to: number) => `${to > from ? "+" : "−"}${formatFraction(Math.abs(to - from))}`;

  const switchToManual = () => {
    // Keep the points the line already shows so nothing disappears when switching.
    const count = Math.round(stepCount);
    const ticks =
      count > 0 && count <= 12 ? Array.from({ length: count + 1 }, (_, i) => Number((obj.min + i * obj.step).toFixed(9))) : [];
    set({ tickMode: "manual", ticks: ticks.slice(1, -1) });
  };

  const tap = (v: number) => {
    if (tapMode === "dot") {
      const i = obj.marks.findIndex((m) => near(m.v, v));
      if (i < 0) set({ marks: [...obj.marks, { v, open: false }] });
      else if (!obj.marks[i].open) set({ marks: obj.marks.map((m, j) => (j === i ? { ...m, open: true } : m)) });
      else set({ marks: obj.marks.filter((_, j) => j !== i) });
      return;
    }
    if (jumpStart === null) setJumpStart(v);
    else if (near(jumpStart, v)) setJumpStart(null);
    else {
      set({ jumps: [...jumps, { from: jumpStart, to: v, label: jumpLabel(jumpStart, v) }] });
      setJumpStart(null);
    }
  };

  const presetActive = (p: (typeof NUMLINE_PRESETS)[number]) =>
    !manual && near(obj.min, p.min) && near(obj.max, p.max) && near(obj.step, p.step);

  return (
    <>
      <Section title="Scale" summary={`${formatFraction(obj.min)} to ${formatFraction(obj.max)}`}>
        <div className="flex flex-wrap gap-1">
          {NUMLINE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={presetActive(p)}
              className={`${CHIP} aria-pressed:border-indigo-600 aria-pressed:bg-indigo-600 aria-pressed:text-white`}
              onClick={() => set({ min: p.min, max: p.max, step: p.step, labels: p.labels, tickMode: "step" })}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FractionField
            label="Starts at"
            value={obj.min}
            hint="Must be smaller than the end"
            onCommit={(v) => (v < obj.max ? (set({ min: v }), true) : false)}
          />
          <FractionField
            label="Ends at"
            value={obj.max}
            hint="Must be bigger than the start"
            onCommit={(v) => (v > obj.min ? (set({ max: v }), true) : false)}
          />
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span>
            Length <span className="font-semibold tabular-nums text-slate-900">{formatFraction(diff)}</span>
            {formatFraction(diff).includes("/") && <span className="text-slate-500"> = {formatMixed(diff)} = {Number(diff.toFixed(4))}</span>}
          </span>
          <label className="flex shrink-0 cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={!!obj.showDifference} onChange={(e) => set({ showDifference: e.target.checked })} />
            Show on line
          </label>
        </div>
      </Section>

      <Section title="Points on the line" summary={manual ? `${tickCount} chosen points` : `every ${formatFraction(obj.step)}`}>
        <Seg
          value={manual ? "manual" : "step"}
          options={[
            { id: "step", label: "Equal steps" },
            { id: "manual", label: "Choose points" },
          ]}
          onChange={(m) => (m === "manual" ? switchToManual() : set({ tickMode: "step" }))}
        />

        {!manual && (
          <>
            <div className="grid grid-cols-2 items-end gap-2">
              <FractionField
                label="Step"
                value={obj.step}
                hint="Step must be more than 0"
                onCommit={(v) => (v > 0 ? (set({ step: v }), true) : false)}
              />
              <Stepper label="Or split into parts" value={parts} min={1} max={50} onChange={setParts} />
            </div>
            <button type="button" className="btn btn-sm w-full" onClick={() => set({ step: diff / parts })}>
              Split into {parts} equal parts (step {formatFraction(diff / parts)})
            </button>
            {uneven && (
              <p className="text-xs text-amber-700">
                This step does not fit evenly into {formatFraction(diff)}. Try a step that divides it, or split into equal parts.
              </p>
            )}
          </>
        )}

        {manual && (
          <>
            <div className="flex items-end gap-1.5">
              <FractionField label="Add a point at" value={tickVal} onCommit={(v) => (setTickVal(v), true)} className="flex-1" />
              <button
                type="button"
                className="btn btn-sm h-9"
                disabled={!inRange(tickVal)}
                onClick={() => set({ ticks: [...new Set([...(obj.ticks ?? []), Number(tickVal.toFixed(9))])].sort((a, b) => a - b) })}
              >
                <Plus size={13} /> Add
              </button>
            </div>
            {!inRange(tickVal) && <p className="text-xs text-amber-700">{rangeHint}</p>}
            <div className="flex flex-wrap gap-1">
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{formatFraction(obj.min)} start</span>
              {(obj.ticks ?? []).map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white py-1 pl-2 pr-1 text-xs">
                  {formatFraction(t)}
                  <button
                    type="button"
                    className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove point ${formatFraction(t)}`}
                    onClick={() => set({ ticks: (obj.ticks ?? []).filter((x) => x !== t) })}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{formatFraction(obj.max)} end</span>
            </div>
          </>
        )}
      </Section>

      <Section title="Dots and jumps" summary={`${obj.marks.length} dots, ${jumps.length} jumps`}>
        <Seg
          value={tapMode}
          options={[
            { id: "dot", label: "● Mark dots" },
            { id: "jump", label: "⌒ Draw jumps" },
          ]}
          onChange={(m) => {
            setTapMode(m);
            setJumpStart(null);
          }}
        />
        {tickCount <= 61 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-1 pt-1">
            <TickStrip obj={obj} mode={tapMode} jumpFrom={jumpStart} onTap={tap} />
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            This line has too many points to tap. Use “Another value” below.
          </p>
        )}
        <p className="text-xs text-slate-500">
          {tapMode === "dot"
            ? "Tap a point: once for a filled dot, again for a hollow dot, a third time to clear it."
            : jumpStart === null
              ? "Tap where the jump starts, then where it lands."
              : `Jump starts at ${formatFraction(jumpStart)}. Now tap where it lands.`}
        </p>

        {outside > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span>
              {outside} {outside === 1 ? "dot or jump is" : "dots or jumps are"} outside {formatFraction(obj.min)} to {formatFraction(obj.max)}.
            </span>
            <button
              type="button"
              className="shrink-0 font-semibold underline-offset-2 hover:underline"
              onClick={() => set({ marks: obj.marks.filter((m) => inRange(m.v)), jumps: jumps.filter((j) => inRange(j.from) && inRange(j.to)) })}
            >
              Remove
            </button>
          </div>
        )}

        {obj.marks.length > 0 && (
          <div>
            <span className={LABEL}>Dots (tap to switch filled / hollow)</span>
            <div className="flex flex-wrap gap-1">
              {obj.marks.map((m, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center rounded-md border text-xs ${inRange(m.v) ? "border-slate-200 bg-white" : "border-amber-300 bg-amber-50 text-amber-900"}`}
                >
                  <button
                    type="button"
                    className="rounded-l-md py-1 pl-2 pr-1 hover:bg-indigo-50"
                    title={m.open ? "Hollow (not included). Click for filled." : "Filled (included). Click for hollow."}
                    onClick={() => set({ marks: obj.marks.map((x, j) => (j === i ? { ...x, open: !x.open } : x)) })}
                  >
                    {m.open ? "○" : "●"} {formatFraction(m.v)}
                  </button>
                  <button
                    type="button"
                    className="rounded-r-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove dot at ${formatFraction(m.v)}`}
                    onClick={() => set({ marks: obj.marks.filter((_, j) => j !== i) })}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {jumps.length > 0 && (
          <div className="space-y-1">
            <span className={LABEL}>Jumps and their labels</span>
            {jumps.map((j, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className={`w-20 shrink-0 text-xs tabular-nums ${inRange(j.from) && inRange(j.to) ? "text-slate-600" : "text-amber-700"}`}>
                  {formatFraction(j.from)} → {formatFraction(j.to)}
                </span>
                <input
                  className="input !py-1 !px-2 min-w-0 flex-1 text-[13px]"
                  aria-label={`Label for jump ${formatFraction(j.from)} to ${formatFraction(j.to)}`}
                  value={j.label}
                  placeholder="No label"
                  onChange={(e) => set({ jumps: jumps.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })}
                />
                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove jump"
                  onClick={() => set({ jumps: jumps.filter((_, k) => k !== i) })}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline"
            aria-expanded={showOther}
            onClick={() => setShowOther((s) => !s)}
          >
            <ChevronDown size={13} className={`transition-transform ${showOther ? "rotate-180" : ""}`} />
            Another value (between the points)
          </button>
          {showOther && (
            <div className="mt-2 space-y-3 rounded-lg bg-slate-50 p-2.5">
              {tapMode === "dot" ? (
                <>
                  <FractionField label="Dot at" value={markVal} onCommit={(v) => (setMarkVal(v), true)} />
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={!inRange(markVal)}
                      onClick={() => set({ marks: [...obj.marks, { v: markVal, open: false }] })}
                    >
                      ● Filled dot
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={!inRange(markVal)}
                      onClick={() => set({ marks: [...obj.marks, { v: markVal, open: true }] })}
                    >
                      ○ Hollow dot
                    </button>
                  </div>
                  {!inRange(markVal) && <p className="text-xs text-amber-700">{rangeHint}</p>}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <FractionField label="From" value={jumpFrom} onCommit={(v) => (setJumpFrom(v), true)} />
                    <FractionField label="To" value={jumpTo} onCommit={(v) => (setJumpTo(v), true)} />
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm w-full"
                    disabled={near(jumpFrom, jumpTo) || !inRange(jumpFrom) || !inRange(jumpTo)}
                    onClick={() => set({ jumps: [...jumps, { from: jumpFrom, to: jumpTo, label: jumpLabel(jumpFrom, jumpTo) }] })}
                  >
                    <Plus size={13} /> Add jump
                  </button>
                  {!near(jumpFrom, jumpTo) && (!inRange(jumpFrom) || !inRange(jumpTo)) && (
                    <p className="text-xs text-amber-700">Both ends must be from {formatFraction(obj.min)} to {formatFraction(obj.max)}.</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section title="Labels" defaultOpen={false} summary={obj.showNumbers ? (obj.labels === "fraction" ? "fractions" : "numbers") : "hidden"}>
        <Seg
          value={obj.labels ?? "number"}
          options={[
            { id: "number", label: "Decimals (0.5)" },
            { id: "fraction", label: "Fractions (½)" },
          ]}
          onChange={(v) => set({ labels: v })}
        />
        <div className="grid grid-cols-2">
          <Toggle label="Show labels" checked={obj.showNumbers} onChange={(v) => set({ showNumbers: v })} />
          <Toggle label="Arrows at ends" checked={obj.arrows} onChange={(v) => set({ arrows: v })} />
        </div>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ Table */

const TABLE_PRESETS: { label: string; cells: string[][]; headerRow: boolean; headerCol: boolean }[] = [
  {
    label: "Frequency table",
    cells: [
      ["Class interval", "0–10", "10–20", "20–30", "30–40"],
      ["Frequency", "5", "8", "12", "7"],
    ],
    headerRow: false,
    headerCol: true,
  },
  {
    label: "x and f(x)",
    cells: [
      ["x", "1", "2", "3", "4"],
      ["y", "", "", "", ""],
    ],
    headerRow: false,
    headerCol: true,
  },
  {
    label: "Blank 3 × 3",
    cells: [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ],
    headerRow: true,
    headerCol: false,
  },
];

export function TableInspector({ obj, update }: { obj: TableObj; update: Update }) {
  const set = (patch: Partial<TableObj>) => update((o) => ({ ...(o as TableObj), ...patch }));
  const cellW = obj.w / obj.cols;
  const cellH = obj.h / obj.rows;

  const resize = (rows: number, cols: number) => {
    rows = Math.max(1, Math.min(12, rows));
    cols = Math.max(1, Math.min(10, cols));
    const cells = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => obj.cells[r]?.[c] ?? ""));
    set({ rows, cols, cells, w: cellW * cols, h: cellH * rows });
  };
  const setCell = (r: number, c: number, v: string) =>
    set({ cells: obj.cells.map((row, ri) => (ri === r ? row.map((x, ci) => (ci === c ? v : x)) : row)) });

  return (
    <>
      <Section title="Cells" summary={`${obj.rows} × ${obj.cols}`}>
        <div className="grid grid-cols-2 gap-2">
          <Stepper label="Rows" value={obj.rows} min={1} max={12} onChange={(n) => resize(n, obj.cols)} />
          <Stepper label="Columns" value={obj.cols} min={1} max={10} onChange={(n) => resize(obj.rows, n)} />
        </div>
        <div>
          <span className={LABEL}>Type in the cells (3/4 is drawn as a stacked fraction)</span>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${obj.cols}, minmax(0, 1fr))` }}>
            {obj.cells.map((row, r) =>
              row.map((cell, c) => (
                <input
                  key={`${r}-${c}`}
                  aria-label={`Row ${r + 1} column ${c + 1}`}
                  className={`input !px-1 !py-1 text-center text-xs ${(obj.headerRow && r === 0) || (obj.headerCol && c === 0) ? "!bg-slate-100 font-semibold" : ""}`}
                  value={cell}
                  onChange={(e) => setCell(r, c, e.target.value)}
                />
              )),
            )}
          </div>
        </div>
        <div>
          <span className={LABEL}>Start from</span>
          <div className="flex flex-wrap gap-1">
            {TABLE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={CHIP}
                onClick={() =>
                  set({
                    cells: p.cells.map((r) => [...r]),
                    rows: p.cells.length,
                    cols: p.cells[0].length,
                    headerRow: p.headerRow,
                    headerCol: p.headerCol,
                    w: Math.min(90, 380 / p.cells[0].length) * p.cells[0].length,
                    h: cellH * p.cells.length,
                  })
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </Section>
      <Section title="Look" summary={`text ${obj.size}`}>
        <div className="grid grid-cols-2">
          <Toggle label="Shade first row" checked={obj.headerRow} onChange={(v) => set({ headerRow: v })} />
          <Toggle label="Shade first column" checked={obj.headerCol} onChange={(v) => set({ headerCol: v })} />
        </div>
        <Seg
          label="Text size"
          value={obj.size}
          options={[12, 14, 16, 18].map((n) => ({ id: n, label: String(n) }))}
          onChange={(v) => set({ size: v })}
        />
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ Axes */

export function AxesInspector({ obj, update }: { obj: AxesObj; update: Update }) {
  const set = (patch: Partial<AxesObj>) => update((o) => ({ ...(o as AxesObj), ...patch }));
  const presets = [
    { label: "4 quadrants", v: [-5, 5, -5, 5] },
    { label: "1st quadrant", v: [0, 10, 0, 10] },
    { label: "x ≥ 0 only", v: [0, 10, -5, 5] },
  ];
  return (
    <>
      <Section title="Range" summary={`x ${obj.xMin}…${obj.xMax}, y ${obj.yMin}…${obj.yMax}`}>
        <div className="flex flex-wrap gap-1">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              className={CHIP}
              onClick={() => set({ xMin: p.v[0], xMax: p.v[1], yMin: p.v[2], yMax: p.v[3] })}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[1.25rem_1fr_1fr] items-end gap-x-2 gap-y-2">
          <span className="pb-2 text-xs font-semibold text-slate-500">x</span>
          <NumInput label="From" value={obj.xMin} onCommit={(v) => v < obj.xMax && set({ xMin: v })} />
          <NumInput label="To" value={obj.xMax} onCommit={(v) => v > obj.xMin && set({ xMax: v })} />
          <span className="pb-2 text-xs font-semibold text-slate-500">y</span>
          <NumInput value={obj.yMin} onCommit={(v) => v < obj.yMax && set({ yMin: v })} />
          <NumInput value={obj.yMax} onCommit={(v) => v > obj.yMin && set({ yMax: v })} />
        </div>
      </Section>
      <Section title="Show">
        <div className="grid grid-cols-2">
          <Toggle label="Grid lines" checked={obj.showGrid} onChange={(v) => set({ showGrid: v })} />
          <Toggle label="Numbers" checked={obj.showNumbers} onChange={(v) => set({ showNumbers: v })} />
          <Toggle label="Arrows" checked={obj.arrows} onChange={(v) => set({ arrows: v })} />
          <Toggle label="x and y names" checked={obj.names} onChange={(v) => set({ names: v })} />
        </div>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ Fraction model */

const FRACTION_PRESETS: [number, number][] = [
  [1, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
  [3, 8],
  [5, 6],
];
const SHADE_COLORS = ["#93c5fd", "#fca5a5", "#86efac", "#fde68a", "#c4b5fd", "#fdba74", "#cbd5e1", "#1e293b"];

export function FractionInspector({ obj, update }: { obj: FractionObj; update: Update }) {
  const set = (patch: Partial<FractionObj>) => update((o) => ({ ...(o as FractionObj), ...patch }));
  const total = obj.model === "grid" ? obj.rows * Math.max(1, Math.round(obj.parts / obj.rows)) : obj.parts;
  const shadeColor = obj.style.fill ?? "#93c5fd";
  const maxParts = obj.model === "grid" ? 48 : 24;

  const setParts = (n: number) => {
    const parts = Math.max(1, Math.min(maxParts, Math.round(n)));
    set({ parts, shaded: Math.min(obj.shaded, parts) });
  };

  return (
    <>
      <Section title="Fraction" summary={`${Math.min(obj.shaded, total)}/${total}`}>
        <Seg
          value={obj.model}
          options={[
            { id: "circle", label: "Circle" },
            { id: "bar", label: "Bar" },
            { id: "grid", label: "Grid" },
          ]}
          onChange={(model) => set({ model, parts: model === "grid" ? Math.max(obj.parts, 4) : obj.parts })}
        />
        <div className="flex flex-wrap gap-1">
          {FRACTION_PRESETS.map(([n, d]) => (
            <button
              key={`${n}/${d}`}
              type="button"
              aria-pressed={obj.shaded === n && obj.parts === d}
              className={`${CHIP} aria-pressed:border-indigo-600 aria-pressed:bg-indigo-600 aria-pressed:text-white`}
              onClick={() => set({ parts: d, shaded: n })}
            >
              {n}/{d}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stepper label="Shaded parts" value={Math.min(obj.shaded, total)} min={0} max={total} onChange={(n) => set({ shaded: n })} />
          <Stepper label="Equal parts" value={obj.parts} display={total} min={1} max={maxParts} onChange={setParts} />
        </div>
        {obj.model === "grid" && (
          <NumInput label="Rows in the grid" value={obj.rows} onCommit={(v) => v >= 1 && v <= 12 && set({ rows: Math.round(v) })} />
        )}
      </Section>
      <Section title="Look">
        <div>
          <span className={LABEL}>Shade colour</span>
          <div className="flex flex-wrap gap-1.5">
            {SHADE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Shade colour ${c}`}
                aria-pressed={shadeColor === c}
                className={`h-7 w-7 rounded-md border ${shadeColor === c ? "ring-2 ring-indigo-500 ring-offset-1 border-indigo-400" : "border-slate-300"}`}
                style={{ backgroundColor: c }}
                onClick={() => update((o) => ({ ...o, style: { ...o.style, fill: c } }))}
              />
            ))}
          </div>
        </div>
        <Toggle label="Write the fraction under the model" checked={obj.showLabel} onChange={(v) => set({ showLabel: v })} />
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ Align & distribute */

export type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom" | "distH" | "distV";

export function AlignTools({ count, onAlign }: { count: number; onAlign: (m: AlignMode) => void }) {
  const items: { mode: AlignMode; label: string; icon: React.ReactNode }[] = [
    { mode: "left", label: "Align left edges", icon: <AlignStartVertical size={15} /> },
    { mode: "hcenter", label: "Centre horizontally", icon: <AlignCenterVertical size={15} /> },
    { mode: "right", label: "Align right edges", icon: <AlignEndVertical size={15} /> },
    { mode: "top", label: "Align top edges", icon: <AlignStartHorizontal size={15} /> },
    { mode: "vcenter", label: "Centre vertically", icon: <AlignCenterHorizontal size={15} /> },
    { mode: "bottom", label: "Align bottom edges", icon: <AlignEndHorizontal size={15} /> },
  ];
  return (
    <Section title={`Line up ${count} objects`}>
      <div className="grid grid-cols-6 gap-1">
        {items.map((it) => (
          <button key={it.mode} type="button" title={it.label} aria-label={it.label} className="btn btn-sm !px-0" onClick={() => onAlign(it.mode)}>
            {it.icon}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          disabled={count < 3}
          title={count < 3 ? "Select 3 or more objects" : undefined}
          className="btn btn-sm text-xs"
          onClick={() => onAlign("distH")}
        >
          Space evenly ↔
        </button>
        <button
          type="button"
          disabled={count < 3}
          title={count < 3 ? "Select 3 or more objects" : undefined}
          className="btn btn-sm text-xs"
          onClick={() => onAlign("distV")}
        >
          Space evenly ↕
        </button>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ Canvas size */

export function CanvasSizeControls({ w, h, onResize }: { w: number; h: number; onResize: (w: number, h: number) => void }) {
  const clamp = (v: number) => Math.max(MIN_CANVAS, Math.min(MAX_CANVAS, Math.round(v)));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1">
        {CANVAS_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={w === p.w && h === p.h}
            className={`btn btn-sm !justify-between !px-2 text-xs ${w === p.w && h === p.h ? "btn-primary" : ""}`}
            onClick={() => onResize(p.w, p.h)}
          >
            {p.name} <span className="tabular-nums opacity-60">{p.w}×{p.h}</span>
          </button>
        ))}
      </div>
      <div className="flex items-end gap-1.5">
        <NumInput label="Width" onBlurOnly value={w} onCommit={(v) => onResize(clamp(v), h)} className="flex-1" />
        <span className="pb-2 text-slate-400">×</span>
        <NumInput label="Height" onBlurOnly value={h} onCommit={(v) => onResize(w, clamp(v))} className="flex-1" />
      </div>
    </div>
  );
}
