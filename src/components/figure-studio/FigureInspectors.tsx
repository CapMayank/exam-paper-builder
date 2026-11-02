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
import type { AxesObj, FractionObj, NumLineObj, Obj, TableObj } from "./types";
import { CANVAS_PRESETS, MAX_CANVAS, MIN_CANVAS } from "./types";

type Update = (fn: (o: Obj) => Obj) => void;

const CARD = "rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3";
const LABEL = "text-[11px] font-semibold text-slate-700 block mb-1";

function NumInput({
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
      {label && <span className="text-[10px] font-medium text-slate-500">{label}</span>}
      <input
        type="number"
        className="input !py-1 !px-2 text-xs w-full"
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-800">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`btn btn-sm flex-1 !px-1.5 text-[11px] ${value === o.id ? "btn-primary" : ""}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Number line */

/** Collapsible, numbered block so a long inspector stays easy to scan. */
function Section({
  step,
  title,
  defaultOpen = false,
  summary,
  children,
}: {
  step?: number;
  title: string;
  defaultOpen?: boolean;
  summary?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {step !== undefined && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
            {step}
          </span>
        )}
        <span className="flex-1 text-xs font-bold text-slate-900">{title}</span>
        {!open && summary && <span className="truncate text-[10px] text-slate-500">{summary}</span>}
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-3 border-t border-slate-100 px-2.5 py-3">{children}</div>}
    </div>
  );
}

function decompose(val: number) {
  const f = toFraction(val);
  if (!f) return { neg: val < 0, whole: String(Number(Math.abs(val).toFixed(6))), num: "", den: "" };
  const abs = Math.abs(f.n);
  if (f.d === 1) return { neg: f.n < 0, whole: String(abs), num: "", den: "" };
  const whole = Math.floor(abs / f.d);
  return { neg: f.n < 0, whole: whole ? String(whole) : "", num: String(abs % f.d), den: String(f.d) };
}

/**
 * Fraction entry: [±] whole  numerator/denominator, or a plain text box (3/4, 2 1/4, 0.75).
 * Commits live as soon as the boxes make a valid number. onCommit returns false to reject the value.
 */
function FractionField({
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
  const [mode, setMode] = useState<"frac" | "text">("frac");
  const [text, setText] = useState(formatFraction(value));
  const [bad, setBad] = useState(false);
  const sent = useRef(value);

  // Pick up changes made elsewhere (presets, "divide into equal parts", another field).
  useEffect(() => {
    if (Math.abs(value - sent.current) > 1e-9) {
      const d = decompose(value);
      setNeg(d.neg);
      setWhole(d.whole);
      setNum(d.num);
      setDen(d.den);
      setText(formatFraction(value));
      setBad(false);
      sent.current = value;
    }
  }, [value]);

  const send = (v: number | null) => {
    if (v === null || !Number.isFinite(v)) return;
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

  const box = "input !p-0 h-8 w-12 text-center text-sm tabular-nums";
  return (
    <div className={className}>
      {label && <span className="mb-0.5 block text-[10px] font-medium text-slate-500">{label}</span>}
      <div className={`flex items-center gap-1.5 rounded-lg border px-1.5 py-1.5 ${bad ? "border-red-400 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
        {mode === "frac" ? (
          <>
            <button
              type="button"
              className={`h-8 w-7 shrink-0 rounded text-base font-bold ${neg ? "bg-slate-800 text-white" : "bg-white text-slate-400 border border-slate-200"}`}
              title={neg ? "Negative" : "Positive (click for negative)"}
              aria-label="Toggle negative"
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
            <div className="flex flex-col items-center">
              <input
                type="number"
                min={0}
                aria-label={`${label ?? "Value"} numerator`}
                placeholder="n"
                className={box}
                value={num}
                onChange={(e) => {
                  setNum(e.target.value);
                  send(fromBoxes(neg, whole, e.target.value, den));
                }}
              />
              <div className="my-0.5 h-px w-12 bg-slate-500" />
              <input
                type="number"
                min={1}
                aria-label={`${label ?? "Value"} denominator`}
                placeholder="d"
                className={box}
                value={den}
                onChange={(e) => {
                  setDen(e.target.value);
                  send(fromBoxes(neg, whole, num, e.target.value));
                }}
              />
            </div>
          </>
        ) : (
          <input
            type="text"
            inputMode="decimal"
            aria-label={`${label ?? "Value"} as text`}
            placeholder="3/4, 2 1/4 or 0.75"
            className="input !py-1 !px-2 h-7 min-w-0 flex-1 text-xs"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              send(parseFraction(e.target.value));
            }}
          />
        )}
        <button
          type="button"
          className="ml-auto flex h-8 shrink-0 items-center justify-center rounded px-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
          title={mode === "frac" ? "Type it instead (3/4, 2 1/4 or 0.75)" : "Use fraction boxes"}
          onClick={() => {
            if (mode === "frac") setText(formatFraction(fromBoxes(neg, whole, num, den) ?? value));
            else {
              const d = decompose(parseFraction(text) ?? value);
              setNeg(d.neg);
              setWhole(d.whole);
              setNum(d.num);
              setDen(d.den);
            }
            setMode(mode === "frac" ? "text" : "frac");
          }}
        >
          {mode === "frac" ? "abc" : "a/b"}
        </button>
      </div>
      {bad && <span className="text-[10px] text-red-600">{hint ?? "That value is not allowed here"}</span>}
    </div>
  );
}

const NUMLINE_PRESETS: { label: string; min: number; max: number; step: number; labels: "number" | "fraction" }[] = [
  { label: "0 – 10", min: 0, max: 10, step: 1, labels: "number" },
  { label: "−5 – 5", min: -5, max: 5, step: 1, labels: "number" },
  { label: "0 – 1 (tenths)", min: 0, max: 1, step: 0.1, labels: "number" },
  { label: "0 – 1 (quarters)", min: 0, max: 1, step: 0.25, labels: "fraction" },
  { label: "0 – 3 (halves)", min: 0, max: 3, step: 0.5, labels: "fraction" },
  { label: "0 – 2 (eighths)", min: 0, max: 2, step: 0.125, labels: "fraction" },
];

export function NumberLineInspector({ obj, update }: { obj: NumLineObj; update: Update }) {
  const set = (patch: Partial<NumLineObj>) => update((o) => ({ ...(o as NumLineObj), ...patch }));
  const [markVal, setMarkVal] = useState(obj.min);
  const [jumpFrom, setJumpFrom] = useState(obj.min);
  const [jumpTo, setJumpTo] = useState(obj.max);
  const [jumpLabel, setJumpLabel] = useState("");
  const [tickVal, setTickVal] = useState((obj.min + obj.max) / 2);
  const [parts, setParts] = useState(4);

  // When the range changes, pull any entry that now falls outside it back to a sensible default.
  useEffect(() => {
    const ok = (v: number) => v >= obj.min - 1e-9 && v <= obj.max + 1e-9;
    setMarkVal((v) => (ok(v) ? v : obj.min));
    setJumpFrom((v) => (ok(v) ? v : obj.min));
    setJumpTo((v) => (ok(v) ? v : obj.max));
    setTickVal((v) => (ok(v) ? v : (obj.min + obj.max) / 2));
  }, [obj.min, obj.max]);

  const manual = obj.tickMode === "manual";
  const diff = obj.max - obj.min;
  const inRange = (v: number) => v >= obj.min - 1e-9 && v <= obj.max + 1e-9;
  const stepCount = diff / (obj.step || 1);
  const uneven = !manual && Math.abs(stepCount - Math.round(stepCount)) > 1e-6;
  const rangeHint = `Pick a value between ${formatFraction(obj.min)} and ${formatFraction(obj.max)}.`;

  const switchToManual = () => {
    // Keep the points the line already shows so nothing disappears when switching.
    const count = Math.round(stepCount);
    const ticks =
      count > 0 && count <= 12 ? Array.from({ length: count + 1 }, (_, i) => Number((obj.min + i * obj.step).toFixed(9))) : [];
    set({ tickMode: "manual", ticks: ticks.slice(1, -1) });
  };

  const chip = "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px]";

  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
      <span className="block font-bold text-slate-900">Number Line</span>

      <div>
        <span className={LABEL}>Quick scales</span>
        <div className="flex flex-wrap gap-1">
          {NUMLINE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-indigo-50"
              onClick={() => set({ min: p.min, max: p.max, step: p.step, labels: p.labels, tickMode: "step" })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Section step={1} title="Start & end" defaultOpen summary={`${formatFraction(obj.min)} → ${formatFraction(obj.max)}`}>
        <div className="grid grid-cols-1 gap-3">
          <FractionField
            label="Starting point"
            value={obj.min}
            hint="Must be smaller than the end"
            onCommit={(v) => (v < obj.max ? (set({ min: v }), true) : false)}
          />
          <FractionField
            label="Ending point"
            value={obj.max}
            hint="Must be bigger than the start"
            onCommit={(v) => (v > obj.min ? (set({ max: v }), true) : false)}
          />
        </div>
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-950">
          <span className="font-semibold">Difference</span> (end − start) ={" "}
          <span className="font-bold tabular-nums">{formatFraction(diff)}</span>
          {formatFraction(diff).includes("/") && (
            <span className="text-indigo-700"> ({formatMixed(diff)} · {Number(diff.toFixed(4))})</span>
          )}
        </div>
        <Toggle label="Show the difference on the line" checked={!!obj.showDifference} onChange={(v) => set({ showDifference: v })} />
      </Section>

      <Section step={2} title="Spacing of points" defaultOpen summary={manual ? "own points" : `step ${formatFraction(obj.step)}`}>
        <Seg
          value={manual ? "manual" : "step"}
          options={[
            { id: "step", label: "Equal steps" },
            { id: "manual", label: "I'll place points" },
          ]}
          onChange={(m) => (m === "manual" ? switchToManual() : set({ tickMode: "step" }))}
        />

        {!manual && (
          <div className="space-y-2.5">
            <FractionField
              label="Step (gap between points)"
              value={obj.step}
              hint="Step must be more than 0"
              onCommit={(v) => (v > 0 ? (set({ step: v }), true) : false)}
            />
            <div className="rounded-lg bg-slate-50 p-2">
              <span className="mb-1 block text-[10px] font-medium text-slate-500">Don&apos;t know the step? Split the line into equal parts</span>
              <div className="flex items-center gap-1.5">
                <button type="button" className="btn btn-sm !px-1.5" aria-label="Fewer parts" onClick={() => setParts((n) => Math.max(1, n - 1))}>
                  <Minus size={12} />
                </button>
                <span className="w-7 text-center text-sm font-bold tabular-nums">{parts}</span>
                <button type="button" className="btn btn-sm !px-1.5" aria-label="More parts" onClick={() => setParts((n) => Math.min(50, n + 1))}>
                  <Plus size={12} />
                </button>
                <button type="button" className="btn btn-sm flex-1 text-[11px]" onClick={() => set({ step: diff / parts })}>
                  Use step {formatFraction(diff / parts)}
                </button>
              </div>
            </div>
            {uneven && (
              <p className="text-[10px] text-amber-700">
                This step does not fit evenly between the start and end. Pick a step that divides {formatFraction(diff)}.
              </p>
            )}
          </div>
        )}

        {manual && (
          <div className="space-y-2">
            <div className="flex items-end gap-1.5">
              <FractionField label="Add a point at" value={tickVal} onCommit={(v) => (setTickVal(v), true)} className="flex-1" />
              <button
                type="button"
                className="btn btn-sm mb-0.5 text-[11px]"
                disabled={!inRange(tickVal)}
                onClick={() => set({ ticks: [...new Set([...(obj.ticks ?? []), Number(tickVal.toFixed(9))])].sort((a, b) => a - b) })}
              >
                <Plus size={12} /> Add
              </button>
            </div>
            {!inRange(tickVal) && <p className="text-[10px] text-amber-700">{rangeHint}</p>}
            <div className="flex flex-wrap gap-1">
              <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[11px]">{formatFraction(obj.min)} (start)</span>
              {(obj.ticks ?? []).map((t) => (
                <span key={t} className={chip}>
                  {formatFraction(t)}
                  <button type="button" aria-label="Remove point" onClick={() => set({ ticks: (obj.ticks ?? []).filter((x) => x !== t) })}>
                    <X size={11} />
                  </button>
                </span>
              ))}
              <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[11px]">{formatFraction(obj.max)} (end)</span>
            </div>
          </div>
        )}
      </Section>

      <Section step={3} title="Labels & look" defaultOpen summary={obj.labels === "fraction" ? "fractions" : "numbers"}>
        <div>
          <span className={LABEL}>Labels on the line</span>
          <Seg
            value={obj.labels ?? "number"}
            options={[
              { id: "number", label: "Numbers (0.5)" },
              { id: "fraction", label: "Fractions (½)" },
            ]}
            onChange={(v) => set({ labels: v })}
          />
        </div>
        <div className="grid grid-cols-2 gap-y-1.5">
          <Toggle label="Show labels" checked={obj.showNumbers} onChange={(v) => set({ showNumbers: v })} />
          <Toggle label="Arrows at ends" checked={obj.arrows} onChange={(v) => set({ arrows: v })} />
        </div>
      </Section>

      <Section
        step={4}
        title="Mark points & jumps"
        summary={`${obj.marks.length} dots · ${obj.jumps?.length ?? 0} jumps`}
      >
        <div className="space-y-1.5">
          <span className={LABEL}>Dot on the line</span>
          <FractionField value={markVal} onCommit={(v) => (setMarkVal(v), true)} />
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className="btn btn-sm text-[11px]"
              title="Filled dot (included)"
              disabled={!inRange(markVal)}
              onClick={() => set({ marks: [...obj.marks, { v: markVal, open: false }] })}
            >
              ● Filled dot
            </button>
            <button
              type="button"
              className="btn btn-sm text-[11px]"
              title="Hollow dot (not included)"
              disabled={!inRange(markVal)}
              onClick={() => set({ marks: [...obj.marks, { v: markVal, open: true }] })}
            >
              ○ Hollow dot
            </button>
          </div>
          {!inRange(markVal) && <p className="text-[10px] text-amber-700">{rangeHint}</p>}
          {obj.marks.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {obj.marks.map((m, i) => (
                <span key={i} className={chip}>
                  {m.open ? "○" : "●"} {formatFraction(m.v)}
                  <button type="button" aria-label="Remove dot" onClick={() => set({ marks: obj.marks.filter((_, j) => j !== i) })}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <span className={LABEL}>Jump arc (for + and − on the line)</span>
          <div className="grid grid-cols-1 gap-3">
            <FractionField label="From" value={jumpFrom} onCommit={(v) => (setJumpFrom(v), true)} />
            <FractionField label="To" value={jumpTo} onCommit={(v) => (setJumpTo(v), true)} />
          </div>
          <label className="block">
            <span className="text-[10px] font-medium text-slate-500">Label (optional – shows the amount by default)</span>
            <input className="input !py-1 !px-2 w-full text-xs" placeholder="+3/4" value={jumpLabel} onChange={(e) => setJumpLabel(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn btn-sm w-full text-[11px]"
            disabled={jumpFrom === jumpTo || !inRange(jumpFrom) || !inRange(jumpTo)}
            onClick={() =>
              set({
                jumps: [
                  ...(obj.jumps ?? []),
                  { from: jumpFrom, to: jumpTo, label: jumpLabel || `${jumpTo > jumpFrom ? "+" : "−"}${formatFraction(Math.abs(jumpTo - jumpFrom))}` },
                ],
              })
            }
          >
            <Plus size={12} /> Add jump arc
          </button>
          {jumpFrom !== jumpTo && (!inRange(jumpFrom) || !inRange(jumpTo)) && (
            <p className="text-[10px] text-amber-700">Both ends must be between {formatFraction(obj.min)} and {formatFraction(obj.max)}.</p>
          )}
          {(obj.jumps?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1">
              {obj.jumps!.map((j, i) => (
                <span key={i} className={chip}>
                  {formatFraction(j.from)} → {formatFraction(j.to)}
                  <button type="button" aria-label="Remove jump" onClick={() => set({ jumps: obj.jumps!.filter((_, k) => k !== i) })}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Section>
    </div>
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

function Stepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number }) {
return (
  <div>
    <span className={LABEL}>{label}</span>
    <div className="flex items-center gap-1">
      <button type="button" className="btn btn-sm !px-1.5" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Minus size={12} />
      </button>
      <span className="w-7 text-center text-sm font-bold tabular-nums">{value}</span>
      <button type="button" className="btn btn-sm !px-1.5" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus size={12} />
      </button>
    </div>
  </div>
);
}

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
    <div className={CARD}>
      <span className="font-bold text-slate-900 block">Table</span>

      <div>
        <span className={LABEL}>Start from</span>
        <div className="flex flex-wrap gap-1">
          {TABLE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-indigo-50"
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

      <div className="grid grid-cols-2 gap-3">
        <Stepper label="Rows" value={obj.rows} min={1} max={12} onChange={(n) => resize(n, obj.cols)} />
        <Stepper label="Columns" value={obj.cols} min={1} max={10} onChange={(n) => resize(obj.rows, n)} />
      </div>

      <div className="grid grid-cols-2 gap-y-1.5">
        <Toggle label="Shade first row" checked={obj.headerRow} onChange={(v) => set({ headerRow: v })} />
        <Toggle label="Shade first column" checked={obj.headerCol} onChange={(v) => set({ headerCol: v })} />
      </div>

      <div>
        <span className={LABEL}>Text size</span>
        <Seg
          value={String(obj.size)}
          options={[12, 14, 16, 18].map((n) => ({ id: String(n), label: String(n) }))}
          onChange={(v) => set({ size: Number(v) })}
        />
      </div>

      <div>
        <span className={LABEL}>Cells (type 3/4 for a stacked fraction)</span>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${obj.cols}, minmax(0, 1fr))` }}>
          {obj.cells.map((row, r) =>
            row.map((cell, c) => (
              <input
                key={`${r}-${c}`}
                aria-label={`Row ${r + 1} column ${c + 1}`}
                className="input !px-1 !py-1 text-center text-[11px]"
                value={cell}
                onChange={(e) => setCell(r, c, e.target.value)}
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Axes */

export function AxesInspector({ obj, update }: { obj: AxesObj; update: Update }) {
  const set = (patch: Partial<AxesObj>) => update((o) => ({ ...(o as AxesObj), ...patch }));
  return (
    <div className={CARD}>
      <span className="font-bold text-slate-900 block">Coordinate Plane</span>
      <div className="grid grid-cols-2 gap-2">
        <NumInput label="X from" value={obj.xMin} onCommit={(v) => v < obj.xMax && set({ xMin: v })} />
        <NumInput label="X to" value={obj.xMax} onCommit={(v) => v > obj.xMin && set({ xMax: v })} />
        <NumInput label="Y from" value={obj.yMin} onCommit={(v) => v < obj.yMax && set({ yMin: v })} />
        <NumInput label="Y to" value={obj.yMax} onCommit={(v) => v > obj.yMin && set({ yMax: v })} />
      </div>
      <div className="flex flex-wrap gap-1">
        {[
          { label: "4 quadrants", v: [-5, 5, -5, 5] },
          { label: "1st quadrant", v: [0, 10, 0, 10] },
          { label: "x ≥ 0 only", v: [0, 10, -5, 5] },
        ].map((p) => (
          <button
            key={p.label}
            type="button"
            className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-indigo-50"
            onClick={() => set({ xMin: p.v[0], xMax: p.v[1], yMin: p.v[2], yMax: p.v[3] })}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-y-1.5">
        <Toggle label="Grid lines" checked={obj.showGrid} onChange={(v) => set({ showGrid: v })} />
        <Toggle label="Numbers" checked={obj.showNumbers} onChange={(v) => set({ showNumbers: v })} />
        <Toggle label="Arrows" checked={obj.arrows} onChange={(v) => set({ arrows: v })} />
        <Toggle label="X / Y names" checked={obj.names} onChange={(v) => set({ names: v })} />
      </div>
    </div>
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

  const setParts = (n: number) => {
    const parts = Math.max(1, Math.min(obj.model === "grid" ? 48 : 24, Math.round(n)));
    set({ parts, shaded: Math.min(obj.shaded, parts) });
  };

  return (
    <div className={CARD}>
      <span className="font-bold text-slate-900 block">Fraction Model</span>

      <Seg
        value={obj.model}
        options={[
          { id: "circle", label: "Circle" },
          { id: "bar", label: "Bar" },
          { id: "grid", label: "Grid" },
        ]}
        onChange={(model) => set({ model, parts: model === "grid" ? Math.max(obj.parts, 4) : obj.parts })}
      />

      <div>
        <span className={LABEL}>Quick fractions</span>
        <div className="flex flex-wrap gap-1">
          {FRACTION_PRESETS.map(([n, d]) => (
            <button
              key={`${n}/${d}`}
              type="button"
              className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold hover:bg-indigo-50"
              onClick={() => set({ parts: d, shaded: n })}
            >
              {n}/{d}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className={LABEL}>Equal parts</span>
          <div className="flex items-center gap-1">
            <button type="button" className="btn btn-sm !px-1.5" aria-label="Fewer parts" onClick={() => setParts(obj.parts - 1)}>
              <Minus size={12} />
            </button>
            <span className="w-8 text-center text-sm font-bold tabular-nums">{total}</span>
            <button type="button" className="btn btn-sm !px-1.5" aria-label="More parts" onClick={() => setParts(obj.parts + 1)}>
              <Plus size={12} />
            </button>
          </div>
        </div>
        <div>
          <span className={LABEL}>Shaded parts</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn btn-sm !px-1.5"
              aria-label="Shade fewer"
              onClick={() => set({ shaded: Math.max(0, obj.shaded - 1) })}
            >
              <Minus size={12} />
            </button>
            <span className="w-8 text-center text-sm font-bold tabular-nums">{Math.min(obj.shaded, total)}</span>
            <button
              type="button"
              className="btn btn-sm !px-1.5"
              aria-label="Shade more"
              onClick={() => set({ shaded: Math.min(total, obj.shaded + 1) })}
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>

      {obj.model === "grid" && (
        <NumInput
          label="Rows"
          value={obj.rows}
          onCommit={(v) => v >= 1 && v <= 12 && set({ rows: Math.round(v) })}
        />
      )}

      <div>
        <span className={LABEL}>Shade colour</span>
        <div className="flex flex-wrap gap-1.5">
          {SHADE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Shade ${c}`}
              className={`h-6 w-6 rounded border ${shadeColor === c ? "ring-2 ring-indigo-500 border-indigo-400" : "border-slate-300"}`}
              style={{ backgroundColor: c }}
              onClick={() => update((o) => ({ ...o, style: { ...o.style, fill: c } }))}
            />
          ))}
        </div>
      </div>

      <Toggle label="Show fraction under the model" checked={obj.showLabel} onChange={(v) => set({ showLabel: v })} />
    </div>
  );
}

/* ------------------------------------------------------------------ Align & distribute */

export type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom" | "distH" | "distV";

export function AlignTools({ count, onAlign }: { count: number; onAlign: (m: AlignMode) => void }) {
  const items: { mode: AlignMode; label: string; icon: React.ReactNode; min: number }[] = [
    { mode: "left", label: "Align left", icon: <AlignStartVertical size={14} />, min: 2 },
    { mode: "hcenter", label: "Centre horizontally", icon: <AlignCenterVertical size={14} />, min: 2 },
    { mode: "right", label: "Align right", icon: <AlignEndVertical size={14} />, min: 2 },
    { mode: "top", label: "Align top", icon: <AlignStartHorizontal size={14} />, min: 2 },
    { mode: "vcenter", label: "Centre vertically", icon: <AlignCenterHorizontal size={14} />, min: 2 },
    { mode: "bottom", label: "Align bottom", icon: <AlignEndHorizontal size={14} />, min: 2 },
  ];
  return (
    <div className="space-y-2 pt-2 border-t border-slate-200">
      <span className="font-bold text-slate-900 block text-xs">Align {count} objects</span>
      <div className="grid grid-cols-6 gap-1">
        {items.map((it) => (
          <button key={it.mode} type="button" title={it.label} aria-label={it.label} className="btn btn-sm !px-0" onClick={() => onAlign(it.mode)}>
            {it.icon}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button type="button" disabled={count < 3} className="btn btn-sm text-[11px]" onClick={() => onAlign("distH")}>
          Space evenly ↔
        </button>
        <button type="button" disabled={count < 3} className="btn btn-sm text-[11px]" onClick={() => onAlign("distV")}>
          Space evenly ↕
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Canvas size */

export function CanvasSizeControls({ w, h, onResize }: { w: number; h: number; onResize: (w: number, h: number) => void }) {
  const clamp = (v: number) => Math.max(MIN_CANVAS, Math.min(MAX_CANVAS, Math.round(v)));
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-slate-600">Page size</span>
      <div className="grid grid-cols-2 gap-1">
        {CANVAS_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`btn btn-sm !px-1.5 text-[11px] ${w === p.w && h === p.h ? "btn-primary" : ""}`}
            onClick={() => onResize(p.w, p.h)}
          >
            {p.name} <span className="opacity-60">{p.w}×{p.h}</span>
          </button>
        ))}
      </div>
      <div className="flex items-end gap-1.5">
        <NumInput label="Width" onBlurOnly value={w} onCommit={(v) => onResize(clamp(v), h)} className="flex-1" />
        <span className="pb-1.5 text-slate-400">×</span>
        <NumInput label="Height" onBlurOnly value={h} onCommit={(v) => onResize(w, clamp(v))} className="flex-1" />
      </div>
    </div>
  );
}
