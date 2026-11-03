"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Check,
  Copy,
  FlipHorizontal,
  FlipVertical,
  Tag,
  Trash2,
} from "lucide-react";
import { angleGeom, uid, withAngleDegrees } from "./geometry";
import { LABEL, CHIP, Section, Seg, Slider, Toggle, type Update } from "./FigureInspectors";
import type { AngleObj, ArrowKind, Dash, Hatch, LineObj, Obj, PointObj, ShapeKind, ShapeObj, Style, TextObj } from "./types";
import { DEFAULT_STYLE } from "./types";

export const COLOR_SWATCHES = [
  { label: "Black", val: "#000000" },
  { label: "Graphite", val: "#4f5951" },
  { label: "Teal", val: "#1e6075" },
  { label: "Blue", val: "#1d4ed8" },
  { label: "Green", val: "#047857" },
  { label: "Red", val: "#b91c1c" },
  { label: "Amber", val: "#d97706" },
  { label: "Purple", val: "#7c3aed" },
];

export const FILL_SWATCHES: { label: string; val: string | null }[] = [
  { label: "No fill", val: null },
  { label: "White", val: "#ffffff" },
  { label: "Light teal", val: "rgba(30, 96, 117, 0.15)" },
  { label: "Light blue", val: "rgba(29, 78, 216, 0.15)" },
  { label: "Light green", val: "rgba(4, 120, 87, 0.15)" },
  { label: "Light red", val: "rgba(185, 28, 28, 0.15)" },
  { label: "Light amber", val: "rgba(217, 119, 6, 0.15)" },
  { label: "Light purple", val: "rgba(124, 58, 237, 0.15)" },
];

export const MATH_SYMBOLS = [
  "θ", "α", "β", "γ", "δ", "λ", "μ", "π", "σ", "ω", "Δ", "Ω",
  "°", "∠", "△", "⊥", "∥", "≅", "∼", "≈", "≠", "≤", "≥", "±", "×", "÷", "√", "∞", "∴", "∵",
  "²", "³", "₁", "₂", "cm", "mm", "m",
];

const SHAPE_NAMES: Record<ShapeKind, string> = {
  rect: "Rectangle",
  roundrect: "Rounded box",
  ellipse: "Circle",
  triangle: "Triangle",
  rtriangle: "Right triangle",
  rhombus: "Rhombus",
  parallelogram: "Parallelogram",
  trapezium: "Trapezium",
  polygon: "Polygon",
  star: "Star",
  semicircle: "Semicircle",
  sector: "Sector",
  ring: "Ring",
  cross: "Cross",
  rightmark: "Right-angle mark",
};

/** What a teacher would call the selected object. */
export function objectName(o: Obj): string {
  switch (o.type) {
    case "shape":
      return SHAPE_NAMES[o.kind] ?? "Shape";
    case "line":
      if (o.kind === "dimension") return "Dimension line";
      if (o.kind === "arc") return "Curve";
      if (o.kind === "polyline") return "Path";
      return o.start !== "none" && o.end !== "none" ? "Double arrow" : o.start !== "none" || o.end !== "none" ? "Ray" : "Line";
    case "path":
      return o.highlighter ? "Highlight" : "Drawing";
    case "angle":
      return "Angle";
    case "point":
      return o.label ? `Point ${o.label}` : "Point";
    case "text":
      return "Text";
    case "stamp":
      return "Symbol";
    case "image":
      return "Image";
    case "axes":
      return "Coordinate plane";
    case "numberline":
      return "Number line";
    case "fraction":
      return "Fraction model";
    case "table":
      return "Table";
  }
}

/* ------------------------------------------------------------------ Header actions */

function IconAction({ label, onClick, children, danger }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors ${
        danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

/** Title of the selection plus the things you do to any object: layer order, flip, duplicate, delete. */
export function SelectionHeader({
  title,
  detail,
  onFront,
  onForward,
  onBackward,
  onBack,
  onFlipH,
  onFlipV,
  onDuplicate,
  onDelete,
}: {
  title: string;
  detail?: string;
  onFront: () => void;
  onForward: () => void;
  onBackward: () => void;
  onBack: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="border-b border-slate-200 px-4 pb-2 pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="truncate text-[15px] font-semibold text-slate-900">{title}</h2>
        {detail && <span className="shrink-0 text-xs tabular-nums text-slate-500">{detail}</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-0.5" role="toolbar" aria-label="Arrange">
        <IconAction label="Bring to front" onClick={onFront}>
          <ArrowUpToLine size={15} />
        </IconAction>
        <IconAction label="Bring forward" onClick={onForward}>
          <ArrowUp size={15} />
        </IconAction>
        <IconAction label="Send backward" onClick={onBackward}>
          <ArrowDown size={15} />
        </IconAction>
        <IconAction label="Send to back" onClick={onBack}>
          <ArrowDownToLine size={15} />
        </IconAction>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <IconAction label="Flip left to right" onClick={onFlipH}>
          <FlipHorizontal size={15} />
        </IconAction>
        <IconAction label="Flip upside down" onClick={onFlipV}>
          <FlipVertical size={15} />
        </IconAction>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <IconAction label="Duplicate (Ctrl+D)" onClick={onDuplicate}>
          <Copy size={15} />
        </IconAction>
        <IconAction label="Delete (Del)" onClick={onDelete} danger>
          <Trash2 size={15} />
        </IconAction>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Stroke style */

/**
 * Colour, thickness and dash. Shows the selected object's own style when there is one, otherwise the
 * style new drawings will use; only the property that was changed is written.
 */
export function StyleSection({
  title,
  value,
  onChange,
  defaultOpen = true,
}: {
  title: string;
  value: Style;
  onChange: (patch: Partial<Style>) => void;
  defaultOpen?: boolean;
}) {
  const known = COLOR_SWATCHES.some((s) => s.val === value.stroke);
  return (
    <Section
      title={title}
      defaultOpen={defaultOpen}
      summary={`${COLOR_SWATCHES.find((s) => s.val === value.stroke)?.label ?? "Custom"}, ${value.width}px, ${value.dash}`}
    >
      <div>
        <span className={LABEL}>Colour</span>
        <div className="grid grid-cols-9 gap-1">
          {COLOR_SWATCHES.map((sw) => (
            <button
              key={sw.val}
              type="button"
              aria-label={sw.label}
              aria-pressed={value.stroke === sw.val}
              title={sw.label}
              className={`flex aspect-square items-center justify-center rounded-md border border-black/10 ${
                value.stroke === sw.val ? "ring-2 ring-indigo-500 ring-offset-1" : ""
              }`}
              style={{ backgroundColor: sw.val }}
              onClick={() => onChange({ stroke: sw.val })}
            >
              {value.stroke === sw.val && <Check size={13} className="text-white" />}
            </button>
          ))}
          <label
            title="Other colour"
            className={`relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-md border border-slate-300 ${
              !known ? "ring-2 ring-indigo-500 ring-offset-1" : ""
            }`}
            style={{ background: known ? "conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)" : value.stroke }}
          >
            <input
              type="color"
              aria-label="Other colour"
              className="absolute inset-0 cursor-pointer opacity-0"
              value={/^#[0-9a-f]{6}$/i.test(value.stroke) ? value.stroke : "#000000"}
              onChange={(e) => onChange({ stroke: e.target.value })}
            />
          </label>
        </div>
      </div>
      <Seg
        label="Thickness"
        value={value.width}
        options={[1, 2, 3, 4, 6].map((w) => ({
          id: w,
          title: `${w}px`,
          label: <span className="mx-auto block w-5 rounded-full bg-current" style={{ height: w }} />,
        }))}
        onChange={(w) => onChange({ width: w })}
      />
      <Seg
        label="Line type"
        value={value.dash}
        options={(["solid", "dashed", "dotted"] as Dash[]).map((d) => ({
          id: d,
          title: d,
          label: (
            <svg width="34" height="6" className="mx-auto" aria-hidden>
              <line
                x1="1"
                x2="33"
                y1="3"
                y2="3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={d === "dashed" ? "6 4" : d === "dotted" ? "0.5 4" : undefined}
              />
            </svg>
          ),
        }))}
        onChange={(d) => onChange({ dash: d })}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ Fill */

function FillSection({ obj, update }: { obj: Obj; update: Update }) {
  const fillName = FILL_SWATCHES.find((s) => s.val === obj.style.fill)?.label ?? "Custom";
  return (
    <Section title="Fill and shading" summary={`${fillName}${obj.style.hatch !== "none" ? `, ${obj.style.hatch}` : ""}`}>
      <div>
        <span className={LABEL}>Fill</span>
        <div className="grid grid-cols-8 gap-1">
          {FILL_SWATCHES.map((sw) => (
            <button
              key={sw.label}
              type="button"
              title={sw.label}
              aria-label={sw.label}
              aria-pressed={obj.style.fill === sw.val}
              className={`relative aspect-square overflow-hidden rounded-md border border-slate-300 ${
                obj.style.fill === sw.val ? "ring-2 ring-indigo-500 ring-offset-1" : ""
              }`}
              style={{ backgroundColor: sw.val ?? "#fff" }}
              onClick={() => update((o) => ({ ...o, style: { ...o.style, fill: sw.val } }))}
            >
              {!sw.val && <span className="absolute left-1/2 top-1/2 h-px w-[140%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-red-500" />}
            </button>
          ))}
        </div>
      </div>
      <Seg
        label="Hatching (for shaded-region questions)"
        value={obj.style.hatch}
        options={(["none", "diagonal", "cross", "dots", "horizontal"] as Hatch[]).map((h) => ({
          id: h,
          title: h,
          label: h === "none" ? "None" : h === "diagonal" ? "///" : h === "cross" ? "╳" : h === "dots" ? "⁘" : "≡",
        }))}
        onChange={(h) => update((o) => ({ ...o, style: { ...o.style, hatch: h } }))}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ Angle */

export function AngleInspector({ obj, update, onAddPoints }: { obj: AngleObj; update: Update; onAddPoints: (pts: Obj[]) => void }) {
  const set = (patch: Partial<AngleObj>) => update((o) => ({ ...(o as AngleObj), ...patch }));
  const deg = Math.round(angleGeom(obj.v, obj.a, obj.b, obj.reflex).deg);
  const setDeg = (d: number) =>
    update((o) => {
      const ang = o as AngleObj;
      const { b, reflex } = withAngleDegrees(ang, d);
      return { ...ang, b, reflex };
    });

  const labelPoints = () => {
    const pt = (x: number, y: number, label: string, lx: number, ly: number): Obj => ({
      id: uid(),
      type: "point",
      x,
      y,
      label,
      lx,
      ly,
      size: 3,
      mode: "dot",
      fontSize: 15,
      style: DEFAULT_STYLE,
    });
    onAddPoints([pt(obj.v.x, obj.v.y, "B", -14, 14), pt(obj.a.x, obj.a.y, "C", 14, 14), pt(obj.b.x, obj.b.y, "A", 0, -14)]);
  };

  return (
    <>
      <Section title="Size" summary={`${deg}°`}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={359}
            value={deg}
            aria-label="Angle in degrees"
            onChange={(e) => setDeg(Number(e.target.value))}
            className="min-w-0 flex-1"
          />
          <label className="flex shrink-0 items-center rounded-lg border border-slate-300 bg-white pr-2 focus-within:border-indigo-500">
            <input
              type="number"
              min={1}
              max={359}
              aria-label="Exact angle"
              value={deg}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!isNaN(val) && val >= 1 && val <= 359) setDeg(val);
              }}
              className="w-14 border-0 bg-transparent px-2 py-1.5 text-right text-sm font-semibold tabular-nums outline-none"
            />
            <span className="text-sm text-slate-500">°</span>
          </label>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {[30, 45, 60, 90, 120, 180].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={deg === d}
              className={`${CHIP} justify-center !px-0 tabular-nums aria-pressed:border-indigo-600 aria-pressed:bg-indigo-600 aria-pressed:text-white`}
              onClick={() => setDeg(d)}
            >
              {d}°
            </button>
          ))}
        </div>
        <Toggle label="Reflex angle (bigger than 180°)" checked={obj.reflex} onChange={(v) => set({ reflex: v })} />
      </Section>

      <Section title="Label" summary={obj.labelMode === "auto" ? `${deg}°` : obj.labelMode === "custom" ? obj.label || "custom" : "none"}>
        <Seg
          value={obj.labelMode}
          options={[
            { id: "auto", label: "Degrees" },
            { id: "custom", label: "Own text" },
            { id: "none", label: "None" },
          ]}
          onChange={(m) => set({ labelMode: m })}
        />
        {obj.labelMode === "custom" && (
          <>
            <input
              className="input !py-1.5 text-[13px]"
              aria-label="Angle label"
              placeholder="θ, 2x, ∠ABC"
              value={obj.label || ""}
              onChange={(e) => set({ label: e.target.value })}
            />
            <div className="flex flex-wrap gap-1">
              {["θ", "α", "β", "x", "2x", "∠A", "∠1", "∠2"].map((sym) => (
                <button key={sym} type="button" className={CHIP} onClick={() => set({ label: sym })}>
                  {sym}
                </button>
              ))}
            </div>
          </>
        )}
        <button type="button" className="btn btn-sm w-full" onClick={labelPoints}>
          <Tag size={13} /> Add points A, B, C at the corners
        </button>
      </Section>

      <Section title="Marks" summary={`${obj.arcs || 1} arc${(obj.arcs || 1) > 1 ? "s" : ""}${obj.rightMark ? ", right-angle box" : ""}`}>
        <Toggle label="Right-angle box (90°)" checked={obj.rightMark} onChange={(v) => set({ rightMark: v })} />
        <Seg
          label="Arcs (same count = equal angles)"
          value={obj.arcs || 1}
          options={[1, 2, 3].map((n) => ({ id: n, label: n === 1 ? "1 arc" : `${n} arcs` }))}
          onChange={(n) => set({ arcs: n })}
        />
        <Slider label="Arc size" value={obj.arcR} min={12} max={80} unit="px" onChange={(v) => set({ arcR: v })} />
        <div className="flex items-center justify-between">
          <Toggle
            label="Shade the angle"
            checked={obj.fillSector || false}
            onChange={(on) =>
              update((o) => ({
                ...(o as AngleObj),
                fillSector: on,
                style: { ...o.style, fill: on ? o.style.fill || "rgba(30, 96, 117, 0.2)" : null },
              }))
            }
          />
          {obj.fillSector && (
            <input
              type="color"
              aria-label="Shade colour"
              value={/^#[0-9a-f]{6}$/i.test(obj.style.fill ?? "") ? obj.style.fill! : "#1e6075"}
              onChange={(e) => update((o) => ({ ...o, style: { ...o.style, fill: e.target.value } }))}
              className="h-7 w-9 cursor-pointer rounded border border-slate-300 p-0.5"
            />
          )}
        </div>
      </Section>

      <Section title="Arms" defaultOpen={false} summary={`${obj.armArrow === "none" || !obj.armArrow ? "no arrows" : obj.armArrow}, ${obj.armTicks || 0} ticks`}>
        <Seg
          label="Ends of the arms"
          value={obj.armArrow || "none"}
          options={[
            { id: "none", label: "None" },
            { id: "filled", label: "▶", title: "Filled arrow" },
            { id: "open", label: "▷", title: "Open arrow" },
            { id: "dot", label: "●", title: "Dot" },
          ]}
          onChange={(v) => set({ armArrow: v as ArrowKind })}
        />
        <Seg
          label="Equal-length ticks on the arms"
          value={obj.armTicks || 0}
          options={[0, 1, 2, 3].map((n) => ({ id: n, label: n === 0 ? "None" : "|".repeat(n) }))}
          onChange={(n) => set({ armTicks: n })}
        />
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ Shape */

export function ShapeInspector({ obj, update }: { obj: ShapeObj; update: Update }) {
  const set = (patch: Partial<ShapeObj>) => update((o) => ({ ...(o as ShapeObj), ...patch }));
  const hasOptions = ["polygon", "star", "roundrect", "ring", "sector"].includes(obj.kind);
  return (
    <>
      {hasOptions && (
        <Section title="Shape">
          {obj.kind === "polygon" && <Slider label="Sides" value={obj.sides} min={3} max={12} onChange={(v) => set({ sides: v })} />}
          {obj.kind === "star" && <Slider label="Points" value={obj.sides} min={4} max={10} onChange={(v) => set({ sides: v })} />}
          {obj.kind === "roundrect" && (
            <Slider label="Corner roundness" value={obj.radius} min={2} max={40} unit="px" onChange={(v) => set({ radius: v })} />
          )}
          {obj.kind === "ring" && (
            <Slider
              label="Hole size"
              value={Math.round((obj.inner || 0.5) * 100)}
              min={15}
              max={85}
              unit="%"
              onChange={(v) => set({ inner: v / 100 })}
            />
          )}
          {obj.kind === "sector" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className={LABEL}>Start angle (°)</span>
                <input type="number" value={obj.a0} onChange={(e) => set({ a0: Number(e.target.value) })} className="input !py-1.5 text-[13px]" />
              </label>
              <label className="block">
                <span className={LABEL}>End angle (°)</span>
                <input type="number" value={obj.a1} onChange={(e) => set({ a1: Number(e.target.value) })} className="input !py-1.5 text-[13px]" />
              </label>
            </div>
          )}
        </Section>
      )}
      <FillSection obj={obj} update={update} />
    </>
  );
}

/* ------------------------------------------------------------------ Line */

const HEADS: { id: ArrowKind; label: string; title: string }[] = [
  { id: "none", label: "—", title: "Plain end" },
  { id: "filled", label: "▶", title: "Filled arrow" },
  { id: "open", label: "▷", title: "Open arrow" },
  { id: "dot", label: "●", title: "Dot" },
  { id: "bar", label: "|", title: "Bar" },
];

export function LineInspector({ obj, update }: { obj: LineObj; update: Update }) {
  const set = (patch: Partial<LineObj>) => update((o) => ({ ...(o as LineObj), ...patch }));
  return (
    <>
      <Section title="Label" summary={obj.label || "none"}>
        <input
          className="input !py-1.5 text-[13px]"
          aria-label="Line label"
          placeholder="5 cm, AB, r"
          value={obj.label || ""}
          onChange={(e) => set({ label: e.target.value })}
        />
      </Section>
      <Section title="Ends">
        <Seg label="Start" value={obj.start} options={HEADS} onChange={(v) => set({ start: v })} />
        <Seg label="End" value={obj.end} options={HEADS} onChange={(v) => set({ end: v })} />
      </Section>
      <Section title="Marks" defaultOpen={obj.ticks > 0 || obj.parallels > 0} summary={`${obj.ticks} ticks, ${obj.parallels} parallel`}>
        <Seg
          label="Equal-length ticks"
          value={obj.ticks}
          options={[0, 1, 2, 3].map((n) => ({ id: n, label: n === 0 ? "None" : "|".repeat(n) }))}
          onChange={(n) => set({ ticks: n })}
        />
        <Seg
          label="Parallel arrows"
          value={obj.parallels}
          options={[0, 1, 2, 3].map((n) => ({ id: n, label: n === 0 ? "None" : "›".repeat(n) }))}
          onChange={(n) => set({ parallels: n })}
        />
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ Point */

export function PointInspector({ obj, update }: { obj: PointObj; update: Update }) {
  const set = (patch: Partial<PointObj>) => update((o) => ({ ...(o as PointObj), ...patch }));
  return (
    <Section title="Point">
      <label className="block">
        <span className={LABEL}>Name</span>
        <input
          className="input !py-1.5 font-serif text-base font-bold"
          value={obj.label || ""}
          placeholder="A"
          onChange={(e) => set({ label: e.target.value })}
        />
      </label>
      <Seg
        label="Marker"
        value={obj.mode}
        options={[
          { id: "dot", label: "● Dot" },
          { id: "hollow", label: "○ Ring" },
          { id: "cross", label: "× Cross" },
        ]}
        onChange={(m) => set({ mode: m })}
      />
      <Slider label="Size" value={obj.size} min={2} max={8} step={0.5} unit="px" onChange={(v) => set({ size: v })} />
    </Section>
  );
}

/* ------------------------------------------------------------------ Text */

export function TextInspector({ obj, update }: { obj: TextObj; update: Update }) {
  const set = (patch: Partial<TextObj>) => update((o) => ({ ...(o as TextObj), ...patch }));
  const fmt = "flex h-8 flex-1 items-center justify-center rounded-md border text-sm transition-colors";
  const on = "border-indigo-600 bg-indigo-600 text-white";
  const off = "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
  return (
    <>
      <Section title="Text">
        <textarea className="input text-[13px]" rows={2} aria-label="Text" value={obj.text} onChange={(e) => set({ text: e.target.value })} />
        <div className="flex flex-wrap gap-1">
          {MATH_SYMBOLS.slice(0, 16).map((sym) => (
            <button key={sym} type="button" className={`${CHIP} !px-1.5`} onClick={() => set({ text: obj.text + sym })}>
              {sym}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Format" summary={`${obj.size}px`}>
        <div className="flex items-end gap-2">
          <label className="block w-20 shrink-0">
            <span className={LABEL}>Size</span>
            <input
              type="number"
              min={10}
              max={48}
              className="input !py-1.5 text-[13px] tabular-nums"
              value={obj.size}
              onChange={(e) => set({ size: Number(e.target.value) })}
            />
          </label>
          <div className="flex flex-1 gap-1">
            <button type="button" aria-pressed={obj.bold} title="Bold" className={`${fmt} font-bold ${obj.bold ? on : off}`} onClick={() => set({ bold: !obj.bold })}>
              B
            </button>
            <button type="button" aria-pressed={obj.italic} title="Italic" className={`${fmt} italic ${obj.italic ? on : off}`} onClick={() => set({ italic: !obj.italic })}>
              I
            </button>
          </div>
        </div>
        <Seg
          label="Alignment"
          value={obj.align}
          options={[
            { id: "left", label: <AlignLeft size={14} className="mx-auto" />, title: "Left" },
            { id: "center", label: <AlignCenter size={14} className="mx-auto" />, title: "Centre" },
            { id: "right", label: <AlignRight size={14} className="mx-auto" />, title: "Right" },
          ]}
          onChange={(a) => set({ align: a })}
        />
        <div className="grid grid-cols-2">
          <Toggle label="White box behind" checked={obj.bg === "white"} onChange={(v) => set({ bg: v ? "white" : "none" })} />
          <Toggle label="Border" checked={obj.border} onChange={(v) => set({ border: v })} />
        </div>
      </Section>
    </>
  );
}
