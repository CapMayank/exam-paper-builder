/**
 * Lays out a plotted graph (axes, ticks, numbers, axis titles, data lines and labelled points) as plain
 * Figure Studio objects. The AI only states the data; every position is computed here, so numbers sit on
 * their ticks, titles never cover numbers, and nothing runs off the canvas.
 */

export interface GraphPoint {
  x: number;
  y: number;
  label?: string;
}
export interface GraphSeries {
  points: GraphPoint[];
  /** "line" joins the points (default); "dots" draws them unjoined. */
  kind?: "line" | "dots";
  color?: string;
}
export interface GraphSpec {
  xLabel?: string;
  yLabel?: string;
  xMin?: number;
  xMax?: number;
  xStep?: number;
  yMin?: number;
  yMax?: number;
  yStep?: number;
  series?: GraphSeries[];
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const INK = "#0f172a";
const SERIES_COLOR = "#2563eb";
const TICK_SIZE = 12;
const TITLE_SIZE = 13;
const POINT_SIZE = 12;
const PAD = 4; // Figure Studio TEXT_PAD
const EDGE = 8; // clear margin kept inside the canvas
const TICK_LEN = 5;
const GAP = 6;

const style = (stroke = INK, width = 2) => ({ stroke, width, dash: "solid", fill: null, hatch: "none", opacity: 1 });

/** Text box size as Figure Studio draws it (sans glyphs average ~0.6em). */
function textSize(text: string, size: number): { w: number; h: number } {
  return { w: text.length * size * 0.6 + PAD * 2, h: size * 1.3 + PAD * 2 };
}

function fmt(v: number): string {
  return String(Math.round(v * 1000) / 1000);
}

/** A 1/2/5 x 10^n step giving roughly 4-8 ticks. */
export function niceStep(span: number): number {
  if (!(span > 0)) return 1;
  const raw = span / 6;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

function ticks(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  const first = Math.ceil(min / step - 1e-9) * step;
  for (let v = first; v <= max + step * 1e-9 && out.length < 50; v += step) out.push(Math.round(v / step) * step);
  return out;
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function segmentHitsBox(p: { x: number; y: number }, q: { x: number; y: number }, b: Box): boolean {
  // sample about every 2px along the segment
  const steps = Math.max(2, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = p.x + (q.x - p.x) * t;
    const y = p.y + (q.y - p.y) * t;
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return true;
  }
  return false;
}

function range(spec: GraphSpec, axis: "x" | "y"): { min: number; max: number; step: number } {
  const vals = (spec.series ?? []).flatMap((s) => s.points.map((p) => (axis === "x" ? p.x : p.y))).filter(Number.isFinite);
  const given = axis === "x" ? [spec.xMin, spec.xMax, spec.xStep] : [spec.yMin, spec.yMax, spec.yStep];
  let min = Number.isFinite(given[0]) ? Number(given[0]) : Math.min(0, ...vals);
  let max = Number.isFinite(given[1]) ? Number(given[1]) : Math.max(1, ...vals);
  if (max <= min) max = min + 1;
  const step = Number(given[2]) > 0 && (max - min) / Number(given[2]) <= 20 ? Number(given[2]) : niceStep(max - min);
  // round the ends out to whole steps so the last tick is not left hanging
  min = Math.floor(min / step + 1e-9) * step;
  max = Math.ceil(Math.max(max, ...vals) / step - 1e-9) * step;
  return { min, max, step };
}

/** The graph as Figure Studio objects, fitted inside a `canvasW` x `canvasH` canvas. */
export function layoutGraph(spec: GraphSpec, canvasW = 640, canvasH = 360, idPrefix = "graph"): Array<Record<string, unknown>> {
  const X = range(spec, "x");
  const Y = range(spec, "y");
  const xTicks = ticks(X.min, X.max, X.step);
  const yTicks = ticks(Y.min, Y.max, Y.step);
  const xLabel = (spec.xLabel ?? "").trim();
  const yLabel = (spec.yLabel ?? "").trim();

  const tickH = textSize("0", TICK_SIZE).h;
  const yTickW = Math.max(...yTicks.map((v) => textSize(fmt(v), TICK_SIZE).w));
  const titleH = textSize("X", TITLE_SIZE).h;
  const lastXW = textSize(fmt(xTicks[xTicks.length - 1] ?? 0), TICK_SIZE).w;

  // plot rectangle: room on the left for the rotated y title and numbers, below for numbers and x title,
  // above and right for the arrowheads and point labels
  const left = EDGE + (yLabel ? titleH + GAP : 0) + yTickW + TICK_LEN;
  const bottom = canvasH - (EDGE + (xLabel ? titleH + GAP : 0) + tickH + TICK_LEN);
  const top = EDGE + 28;
  const right = canvasW - Math.max(EDGE + lastXW / 2, EDGE + 48);

  const sx = (v: number) => left + ((v - X.min) / (X.max - X.min)) * (right - left);
  const sy = (v: number) => bottom - ((v - Y.min) / (Y.max - Y.min)) * (bottom - top);
  // the axes cross at 0 when 0 is in range, otherwise along the plot edge
  const axisY = sy(Y.min <= 0 && Y.max >= 0 ? 0 : Y.min);
  const axisX = sx(X.min <= 0 && X.max >= 0 ? 0 : X.min);

  const objs: Array<Record<string, unknown>> = [];
  const occupied: Box[] = [];
  let n = 0;
  const id = () => `${idPrefix}_${n++}`;
  const text = (t: string, cx: number, cy: number, size: number, extra: Record<string, unknown> = {}) => {
    const { w, h } = textSize(t, size);
    const rotated = extra.rot !== undefined;
    occupied.push(rotated ? { x: cx - h / 2, y: cy - w / 2, w: h, h: w } : { x: cx - w / 2, y: cy - h / 2, w, h });
    objs.push({
      id: id(), type: "text", text: t, x: cx - w / 2, y: cy - h / 2, w, h, rot: 0, font: "sans", size,
      bold: false, italic: false, underline: false, align: "center", bg: "none", border: false, style: style(INK, 1), ...extra,
    });
  };
  const line = (pts: { x: number; y: number }[], extra: Record<string, unknown> = {}) =>
    objs.push({ id: id(), type: "line", kind: pts.length > 2 ? "polyline" : "line", pts, start: "none", end: "none", ticks: 0, parallels: 0, label: "", labelSize: 13, labelOffset: 18, style: style(), ...extra });

  // axes, running a little past the last tick to the arrowhead
  line([{ x: left, y: axisY }, { x: right + 22, y: axisY }], { end: "filled" });
  line([{ x: axisX, y: bottom }, { x: axisX, y: top - 22 }], { end: "filled" });

  // ticks with their numbers centred on them; 0 is written once, at the origin
  const zeroBoth = axisX === sx(0) && axisY === sy(0);
  for (const v of xTicks) {
    const px = sx(v);
    if (px !== axisX) line([{ x: px, y: axisY - TICK_LEN }, { x: px, y: axisY + TICK_LEN }], { style: style(INK, 1.5) });
    if (v === 0 && zeroBoth) continue;
    text(fmt(v), px, axisY + TICK_LEN + tickH / 2, TICK_SIZE);
  }
  for (const v of yTicks) {
    const py = sy(v);
    if (py !== axisY) line([{ x: axisX - TICK_LEN, y: py }, { x: axisX + TICK_LEN, y: py }], { style: style(INK, 1.5) });
    if (v === 0 && (zeroBoth || py === axisY)) continue;
    const w = textSize(fmt(v), TICK_SIZE).w;
    text(fmt(v), axisX - TICK_LEN - w / 2, py, TICK_SIZE);
  }
  if (zeroBoth) {
    const w = textSize("0", TICK_SIZE).w;
    text("0", axisX - TICK_LEN - w / 2, axisY + TICK_LEN + tickH / 2, TICK_SIZE);
  }

  // axis titles: x centred under the numbers, y rotated beside them
  if (xLabel) text(xLabel, (left + right) / 2, canvasH - EDGE - titleH / 2, TITLE_SIZE);
  if (yLabel && axisX > left + 1) {
    // axes cross inside the plot: the title goes beside the y arrow's tip, not off at the canvas edge
    const { w, h } = textSize(yLabel, TITLE_SIZE);
    text(yLabel, Math.min(axisX + 10 + w / 2, canvasW - EDGE - w / 2), Math.max(EDGE + h / 2, top - 22 + h / 2), TITLE_SIZE);
  } else if (yLabel) {
    text(yLabel, EDGE + titleH / 2, (top + bottom) / 2, TITLE_SIZE, { rot: -Math.PI / 2 });
  }

  // data
  const segments: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];
  const labelled: Array<{ x: number; y: number; label: string; color: string }> = [];
  for (const s of spec.series ?? []) {
    const color = s.color || SERIES_COLOR;
    const pts = s.points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)).map((p) => ({ ...p, px: sx(p.x), py: sy(p.y) }));
    if (pts.length === 0) continue;
    if ((s.kind ?? "line") === "line" && pts.length >= 2) {
      const xy = pts.map((p) => ({ x: p.px, y: p.py }));
      line(xy, { style: style(color, 2.5) });
      for (let i = 1; i < xy.length; i++) segments.push([xy[i - 1], xy[i]]);
    }
    for (const p of pts) {
      if (p.label || s.kind === "dots") labelled.push({ x: p.px, y: p.py, label: (p.label ?? "").trim(), color });
    }
  }

  // each point label goes in the first spot that stays on the canvas and clears numbers, titles, axes,
  // the plotted line and the other labels
  const axisBoxes: Box[] = [
    { x: left, y: axisY - 1, w: right + 22 - left, h: 2 },
    { x: axisX - 1, y: top - 22, w: 2, h: bottom - top + 22 },
  ];
  const dirs = [[1, -1], [-1, -1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [0, 1]];
  for (const p of labelled) {
    let lx = 0;
    let ly = 0;
    if (p.label) {
      const { w, h } = textSize(p.label, POINT_SIZE);
      const fits = (b: Box) =>
        b.x >= EDGE && b.y >= EDGE && b.x + b.w <= canvasW - EDGE && b.y + b.h <= canvasH - EDGE &&
        !occupied.some((o) => boxesOverlap(o, b)) && !axisBoxes.some((o) => boxesOverlap(o, b)) &&
        !segments.some(([a, c]) => segmentHitsBox(a, c, b));
      let chosen: Box | null = null;
      for (const dist of [10, 18, 28, 40]) {
        for (const [dx, dy] of dirs) {
          const cx = p.x + dx * (dist + w / 2);
          const cy = p.y + dy * (dist + h / 2) * (dx === 0 ? 1 : 0.8);
          const b = { x: cx - w / 2, y: cy - h / 2, w, h };
          if (fits(b)) { chosen = b; break; }
        }
        if (chosen) break;
      }
      // nowhere fully clear: keep it on the canvas, above-right of the point
      chosen ??= {
        x: Math.min(Math.max(EDGE, p.x + 10), canvasW - EDGE - w),
        y: Math.min(Math.max(EDGE, p.y - 10 - h), canvasH - EDGE - h),
        w, h,
      };
      occupied.push(chosen);
      lx = Math.round(chosen.x + w / 2 - p.x);
      ly = Math.round(chosen.y + h / 2 - p.y);
    }
    objs.push({ id: id(), type: "point", x: p.x, y: p.y, label: p.label, lx, ly, size: 4, mode: "dot", fontSize: POINT_SIZE, style: style(p.color, 2) });
  }

  return objs;
}

/** Text boxes and point-label boxes of laid-out objects, for overlap checks. */
export function labelBoxes(objs: Array<Record<string, any>>): Array<Box & { text: string }> {
  return objs.flatMap((o) => {
    if (o.type === "text") {
      const { w, h } = textSize(o.text, o.size);
      const cx = o.x + o.w / 2;
      const cy = o.y + o.h / 2;
      return o.rot ? [{ x: cx - h / 2, y: cy - w / 2, w: h, h: w, text: o.text }] : [{ x: cx - w / 2, y: cy - h / 2, w, h, text: o.text }];
    }
    if (o.type === "point" && o.label) {
      const { w, h } = textSize(o.label, o.fontSize);
      return [{ x: o.x + o.lx - w / 2, y: o.y + o.ly - h / 2, w, h, text: o.label }];
    }
    return [];
  });
}
