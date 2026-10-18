import type {
  AngleObj,
  BoxFields,
  BoxObj,
  Hatch,
  LineObj,
  Obj,
  Pt,
  Rect,
  ShapeObj,
} from "./types";
import { layoutText } from "./text";

/* ------------------------------------------------------------------ */
/* Basic maths                                                         */
/* ------------------------------------------------------------------ */

export const TAU = Math.PI * 2;
export const rad = (d: number) => (d * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const pt = (x: number, y: number): Pt => ({ x, y });

let idCounter = 0;
export function uid(): string {
  idCounter += 1;
  return `o${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/** Normalise an angle to (-π, π]. */
export function normAngle(a: number): number {
  let r = a % TAU;
  if (r > Math.PI) r -= TAU;
  if (r <= -Math.PI) r += TAU;
  return r;
}

export function rotateAround(p: Pt, c: Pt, ang: number): Pt {
  const cs = Math.cos(ang);
  const sn = Math.sin(ang);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * cs - dy * sn, y: c.y + dx * sn + dy * cs };
}

/** Snap the direction origin→p to multiples of `stepDeg`, preserving distance. */
export function constrainAngle(origin: Pt, p: Pt, stepDeg = 15): Pt {
  const d = dist(origin, p);
  if (d === 0) return p;
  const step = rad(stepDeg);
  const a = Math.round(Math.atan2(p.y - origin.y, p.x - origin.x) / step) * step;
  return { x: origin.x + d * Math.cos(a), y: origin.y + d * Math.sin(a) };
}

export function distToSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return dist(p, a);
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function distToPolyline(p: Pt, pts: Pt[], closed = false): number {
  let best = Infinity;
  const n = pts.length;
  if (n === 1) return dist(p, pts[0]);
  for (let i = 0; i < n - 1; i++) best = Math.min(best, distToSeg(p, pts[i], pts[i + 1]));
  if (closed && n > 2) best = Math.min(best, distToSeg(p, pts[n - 1], pts[0]));
  return best;
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/* ------------------------------------------------------------------ */
/* Rectangles                                                          */
/* ------------------------------------------------------------------ */

export function rectOfPoints(pts: Pt[]): Rect {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  if (!isFinite(x0)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
export function unionRect(a: Rect | null, b: Rect): Rect {
  if (!a) return b;
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const x1 = Math.max(a.x + a.w, b.x + b.w);
  const y1 = Math.max(a.y + a.h, b.y + b.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
export const inflate = (r: Rect, d: number): Rect => ({ x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d });
export const rectsIntersect = (a: Rect, b: Rect) =>
  a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
export const rectContainsPt = (r: Rect, p: Pt) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
export const rectCenter = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

export function normRect(a: Pt, b: Pt): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

/** Box from a drag. `square` forces equal sides; `fromCenter` treats p0 as the centre. */
export function boxFromDrag(p0: Pt, p1: Pt, o: { square?: boolean; fromCenter?: boolean } = {}): Rect {
  let dx = p1.x - p0.x;
  let dy = p1.y - p0.y;
  if (o.square) {
    const m = Math.max(Math.abs(dx), Math.abs(dy));
    dx = Math.sign(dx || 1) * m;
    dy = Math.sign(dy || 1) * m;
  }
  if (o.fromCenter) return { x: p0.x - Math.abs(dx), y: p0.y - Math.abs(dy), w: Math.abs(dx) * 2, h: Math.abs(dy) * 2 };
  return normRect(p0, { x: p0.x + dx, y: p0.y + dy });
}

/* ------------------------------------------------------------------ */
/* Box objects (rotation / flip)                                       */
/* ------------------------------------------------------------------ */

export const boxCenter = (b: BoxFields): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** Local (centre-origin, unflipped-box) point → world. */
export function boxToWorld(b: BoxFields, lx: number, ly: number): Pt {
  const fx = b.flipX ? -lx : lx;
  const fy = b.flipY ? -ly : ly;
  const cs = Math.cos(b.rot);
  const sn = Math.sin(b.rot);
  const c = boxCenter(b);
  return { x: c.x + fx * cs - fy * sn, y: c.y + fx * sn + fy * cs };
}
/** World → local (ignores flips: handles & hit boxes are symmetric under flip). */
export function worldToBox(b: BoxFields, p: Pt): Pt {
  const c = boxCenter(b);
  const cs = Math.cos(-b.rot);
  const sn = Math.sin(-b.rot);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: dx * cs - dy * sn, y: dx * sn + dy * cs };
}
export function boxCorners(b: BoxFields): Pt[] {
  const hw = b.w / 2;
  const hh = b.h / 2;
  const c = boxCenter(b);
  const cs = Math.cos(b.rot);
  const sn = Math.sin(b.rot);
  return [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([lx, ly]) => ({ x: c.x + lx * cs - ly * sn, y: c.y + lx * sn + ly * cs }));
}
export function pointInBox(b: BoxFields, p: Pt, tol = 0): boolean {
  const l = worldToBox(b, p);
  return Math.abs(l.x) <= b.w / 2 + tol && Math.abs(l.y) <= b.h / 2 + tol;
}

/* ------------------------------------------------------------------ */
/* Angle geometry                                                      */
/* ------------------------------------------------------------------ */

export interface AngleGeom {
  /** Start direction (radians, canvas coords: y down, so positive = clockwise on screen). */
  a0: number;
  /** Signed sweep drawn from arm A to arm B. */
  sweep: number;
  /** Measured value in degrees (0-360). */
  deg: number;
  dir: 1 | -1;
}

export function angleGeom(v: Pt, a: Pt, b: Pt, reflex: boolean): AngleGeom {
  const da = Math.atan2(a.y - v.y, a.x - v.x);
  const db = Math.atan2(b.y - v.y, b.x - v.x);
  const delta = normAngle(db - da);
  const sweep = reflex ? delta - (Math.sign(delta) || 1) * TAU : delta;
  return { a0: da, sweep, deg: deg(Math.abs(sweep)), dir: sweep < 0 ? -1 : 1 };
}

/** Rotate arm B so the displayed angle equals `degrees`, preserving arm length and side. */
export function withAngleDegrees(ang: Pick<AngleObj, "v" | "a" | "b" | "reflex">, degrees: number): { b: Pt; reflex: boolean } {
  const g = angleGeom(ang.v, ang.a, ang.b, ang.reflex);
  const m = clamp(degrees, 0.01, 359.99);
  const len = dist(ang.v, ang.b) || dist(ang.v, ang.a) || 80;
  const t = g.a0 + g.dir * rad(m);
  const b = { x: ang.v.x + len * Math.cos(t), y: ang.v.y + len * Math.sin(t) };
  const reflex = Math.abs(m - 180) < 1e-9 ? g.dir < 0 : m > 180;
  return { b, reflex };
}

export function formatDeg(d: number, decimals: 0 | 1): string {
  const r = decimals === 1 ? Math.round(d * 10) / 10 : Math.round(d);
  return `${decimals === 1 ? r.toFixed(1).replace(/\.0$/, "") : r}°`;
}

export function angleLabelText(a: AngleObj): string {
  if (a.labelMode === "none") return "";
  if (a.labelMode === "custom") return a.label;
  return formatDeg(angleGeom(a.v, a.a, a.b, a.reflex).deg, a.decimals);
}

export function isRightAngle(a: AngleObj): boolean {
  const g = angleGeom(a.v, a.a, a.b, a.reflex);
  return a.rightMark && !a.reflex && Math.abs(g.deg - 90) < 0.5;
}

export function angleLabelPos(a: AngleObj): Pt {
  const g = angleGeom(a.v, a.a, a.b, a.reflex);
  const mid = g.a0 + g.sweep / 2;
  const r = a.arcR + a.arcs * 3 + a.fontSize * 0.75 + 4;
  const rr = isRightAngle(a) ? a.arcR * 0.8 + a.fontSize * 0.7 : r;
  return { x: a.v.x + rr * Math.cos(mid), y: a.v.y + rr * Math.sin(mid) };
}

/* ------------------------------------------------------------------ */
/* Arcs through 3 points                                               */
/* ------------------------------------------------------------------ */

export interface ArcGeom {
  c: Pt;
  r: number;
  a0: number;
  sweep: number;
}
export function arcThrough(p0: Pt, pm: Pt, p1: Pt): ArcGeom | null {
  const d = 2 * (p0.x * (pm.y - p1.y) + pm.x * (p1.y - p0.y) + p1.x * (p0.y - pm.y));
  if (Math.abs(d) < 1e-6) return null;
  const s0 = p0.x * p0.x + p0.y * p0.y;
  const sm = pm.x * pm.x + pm.y * pm.y;
  const s1 = p1.x * p1.x + p1.y * p1.y;
  const c = {
    x: (s0 * (pm.y - p1.y) + sm * (p1.y - p0.y) + s1 * (p0.y - pm.y)) / d,
    y: (s0 * (p1.x - pm.x) + sm * (p0.x - p1.x) + s1 * (pm.x - p0.x)) / d,
  };
  const r = dist(c, p0);
  const a0 = Math.atan2(p0.y - c.y, p0.x - c.x);
  const am = Math.atan2(pm.y - c.y, pm.x - c.x);
  const a1 = Math.atan2(p1.y - c.y, p1.x - c.x);
  const mod = (x: number) => ((x % TAU) + TAU) % TAU;
  const d1 = mod(am - a0);
  const d2 = mod(a1 - a0);
  const sweep = d1 < d2 ? d2 : d2 - TAU;
  return { c, r, a0, sweep };
}
export function arcPoints(g: ArcGeom, n = 48): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = g.a0 + (g.sweep * i) / n;
    out.push({ x: g.c.x + g.r * Math.cos(t), y: g.c.y + g.r * Math.sin(t) });
  }
  return out;
}

/** The polyline that a LineObj actually follows. */
export function linePath(l: Pick<LineObj, "kind" | "pts">): Pt[] {
  if (l.kind === "arc" && l.pts.length === 3) {
    const g = arcThrough(l.pts[0], l.pts[1], l.pts[2]);
    if (g) return arcPoints(g, Math.max(24, Math.min(160, Math.round(Math.abs(g.sweep) * g.r / 6))));
    return [l.pts[0], l.pts[2]];
  }
  return l.pts;
}

/** Point and unit direction at half the path length. */
export function lineMid(l: Pick<LineObj, "kind" | "pts">): { p: Pt; dir: Pt } {
  const path = linePath(l);
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) total += dist(path[i], path[i + 1]);
  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = dist(path[i], path[i + 1]);
    if (acc + seg >= total / 2 && seg > 0) {
      const t = (total / 2 - acc) / seg;
      return {
        p: { x: path[i].x + (path[i + 1].x - path[i].x) * t, y: path[i].y + (path[i + 1].y - path[i].y) * t },
        dir: { x: (path[i + 1].x - path[i].x) / seg, y: (path[i + 1].y - path[i].y) / seg },
      };
    }
    acc += seg;
  }
  return { p: path[0] ?? { x: 0, y: 0 }, dir: { x: 1, y: 0 } };
}

export function lineLabelPos(l: LineObj): Pt {
  const { p, dir } = lineMid(l);
  let dx = -dir.y;
  let dy = dir.x;
  // keep text on the upper side of the line where possible
  if (dy > 0.001 || (Math.abs(dy) < 0.001 && dx < 0)) {
    dx = -dx;
    dy = -dy;
  }
  const off = l.kind === "dimension" ? 0 : l.labelOffset;
  return { x: p.x + dx * off, y: p.y + dy * off };
}

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export interface Contour {
  pts: Pt[];
  closed: boolean;
}

export const POLY_KINDS = new Set(["rect", "roundrect", "triangle", "rtriangle", "rhombus", "parallelogram", "trapezium", "polygon", "star", "cross"]);

export function shapeContours(s: ShapeObj): Contour[] {
  const hw = s.w / 2;
  const hh = s.h / 2;
  const W = (lx: number, ly: number) => boxToWorld(s, lx, ly);
  const poly = (pts: [number, number][], closed = true): Contour[] => [{ pts: pts.map(([x, y]) => W(x, y)), closed }];
  const ell = (rx: number, ry: number, cx = 0, cy = 0, t0 = 0, t1 = TAU): Pt[] => {
    const n = clamp(Math.round((Math.max(rx, ry) * Math.abs(t1 - t0)) / 5), 24, 220);
    const out: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const t = t0 + ((t1 - t0) * i) / n;
      out.push(W(cx + rx * Math.cos(t), cy + ry * Math.sin(t)));
    }
    return out;
  };
  switch (s.kind) {
    case "rect":
      return poly([
        [-hw, -hh],
        [hw, -hh],
        [hw, hh],
        [-hw, hh],
      ]);
    case "roundrect": {
      const r = clamp(s.radius, 0, Math.min(hw, hh));
      const pts: [number, number][] = [];
      const corners: [number, number, number][] = [
        [hw - r, -hh + r, -Math.PI / 2],
        [hw - r, hh - r, 0],
        [-hw + r, hh - r, Math.PI / 2],
        [-hw + r, -hh + r, Math.PI],
      ];
      for (const [cx, cy, a] of corners) {
        const steps = r < 1 ? 1 : 8;
        for (let i = 0; i <= steps; i++) {
          const t = a + ((Math.PI / 2) * i) / steps;
          pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
        }
      }
      return poly(pts);
    }
    case "ellipse":
      return [{ pts: ell(hw, hh).slice(0, -1), closed: true }];
    case "triangle":
      return poly([
        [0, -hh],
        [hw, hh],
        [-hw, hh],
      ]);
    case "rtriangle":
      return poly([
        [-hw, -hh],
        [-hw, hh],
        [hw, hh],
      ]);
    case "rhombus":
      return poly([
        [0, -hh],
        [hw, 0],
        [0, hh],
        [-hw, 0],
      ]);
    case "parallelogram": {
      const k = s.w * 0.22;
      return poly([
        [-hw + k, -hh],
        [hw, -hh],
        [hw - k, hh],
        [-hw, hh],
      ]);
    }
    case "trapezium": {
      const k = s.w * 0.2;
      return poly([
        [-hw + k, -hh],
        [hw - k, -hh],
        [hw, hh],
        [-hw, hh],
      ]);
    }
    case "polygon": {
      const n = clamp(Math.round(s.sides), 3, 12);
      const pts: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const t = -Math.PI / 2 + (TAU * i) / n;
        pts.push([hw * Math.cos(t), hh * Math.sin(t)]);
      }
      return poly(pts);
    }
    case "star": {
      const n = clamp(Math.round(s.sides), 3, 12);
      const pts: [number, number][] = [];
      for (let i = 0; i < n * 2; i++) {
        const t = -Math.PI / 2 + (Math.PI * i) / n;
        const k = i % 2 === 0 ? 1 : 0.45;
        pts.push([hw * k * Math.cos(t), hh * k * Math.sin(t)]);
      }
      return poly(pts);
    }
    case "semicircle":
      return [{ pts: ell(hw, s.h, 0, hh, Math.PI, TAU), closed: true }];
    case "sector": {
      let sw = rad(s.a1 - s.a0);
      sw = ((sw % TAU) + TAU) % TAU;
      if (sw < 1e-6) sw = TAU;
      const arc = ell(hw, hh, 0, 0, rad(s.a0), rad(s.a0) + sw);
      return [{ pts: [W(0, 0), ...arc], closed: true }];
    }
    case "ring": {
      const k = clamp(s.inner, 0.1, 0.9);
      return [
        { pts: ell(hw, hh).slice(0, -1), closed: true },
        { pts: ell(hw * k, hh * k).slice(0, -1), closed: true },
      ];
    }
    case "cross": {
      const tx = s.w / 6;
      const ty = s.h / 6;
      return poly([
        [-tx, -hh],
        [tx, -hh],
        [tx, -ty],
        [hw, -ty],
        [hw, ty],
        [tx, ty],
        [tx, hh],
        [-tx, hh],
        [-tx, ty],
        [-hw, ty],
        [-hw, -ty],
        [-tx, -ty],
      ]);
    }
    case "rightmark":
      return poly(
        [
          [-hw, -hh],
          [hw, -hh],
          [hw, hh],
        ],
        false,
      );
  }
}

/** True when a shape's interior can be clicked (has fill/hatch, or is inherently solid). */
export function isFilled(o: { style: { fill: string | null; hatch: Hatch } }): boolean {
  return o.style.fill !== null || o.style.hatch !== "none";
}

/* ------------------------------------------------------------------ */
/* Axes / number line layout                                           */
/* ------------------------------------------------------------------ */

export function axesLayout(a: { x: number; y: number; w: number; h: number; xMin: number; xMax: number; yMin: number; yMax: number }) {
  const spanX = Math.max(1, a.xMax - a.xMin);
  const spanY = Math.max(1, a.yMax - a.yMin);
  const cellW = a.w / spanX;
  const cellH = a.h / spanY;
  const ox = clamp((0 - a.xMin) * cellW, 0, a.w); // local to box top-left
  const oy = clamp((a.yMax - 0) * cellH, 0, a.h);
  return { cellW, cellH, ox, oy, spanX, spanY };
}

/* ------------------------------------------------------------------ */
/* Affine transforms                                                   */
/* ------------------------------------------------------------------ */

export interface Mat {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}
export const matIdentity = (): Mat => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
export const matTranslate = (dx: number, dy: number): Mat => ({ a: 1, b: 0, c: 0, d: 1, e: dx, f: dy });
export const matScaleAbout = (sx: number, sy: number, cx: number, cy: number): Mat => ({
  a: sx,
  b: 0,
  c: 0,
  d: sy,
  e: cx - sx * cx,
  f: cy - sy * cy,
});
export const matRotateAbout = (t: number, cx: number, cy: number): Mat => {
  const cs = Math.cos(t);
  const sn = Math.sin(t);
  return { a: cs, b: sn, c: -sn, d: cs, e: cx - cs * cx + sn * cy, f: cy - sn * cx - cs * cy };
};
export const matApply = (m: Mat, p: Pt): Pt => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });
const matDet = (m: Mat) => m.a * m.d - m.b * m.c;

function xformBox<T extends BoxFields>(o: T, m: Mat): T {
  const cs = Math.cos(o.rot);
  const sn = Math.sin(o.rot);
  const u2 = { x: m.a * cs + m.c * sn, y: m.b * cs + m.d * sn };
  const v2 = { x: -m.a * sn + m.c * cs, y: -m.b * sn + m.d * cs };
  const w = o.w * Math.hypot(u2.x, u2.y);
  const h = o.h * Math.hypot(v2.x, v2.y);
  const refl = u2.x * v2.y - u2.y * v2.x < 0;
  const rot = Math.atan2(u2.y, u2.x) + (refl ? Math.PI : 0);
  const n = matApply(m, boxCenter(o));
  return {
    ...o,
    x: n.x - w / 2,
    y: n.y - h / 2,
    w,
    h,
    rot: normAngle(rot),
    flipX: refl ? !o.flipX : o.flipX,
  };
}

export function textBoxSize(t: { text: string; font: BoxObjFont; size: number; bold: boolean; italic: boolean }) {
  const l = layoutText(t);
  return { w: l.w, h: l.h };
}
type BoxObjFont = import("./types").FontKey;

/** Apply an affine transform to any object (immutable). */
export function transformObj<T extends Obj>(o: T, m: Mat): T {
  const P = (p: Pt) => matApply(m, p);
  const k = Math.sqrt(Math.abs(matDet(m)));
  switch (o.type) {
    case "path": {
      const pts = o.pts.slice();
      for (let i = 0; i < pts.length; i += 2) {
        pts[i] = m.a * o.pts[i] + m.c * o.pts[i + 1] + m.e;
        pts[i + 1] = m.b * o.pts[i] + m.d * o.pts[i + 1] + m.f;
      }
      return { ...o, pts };
    }
    case "line":
      return { ...o, pts: o.pts.map(P) };
    case "angle":
      return { ...o, v: P(o.v), a: P(o.a), b: P(o.b), arcR: o.arcR * k };
    case "point": {
      const n = P(o);
      return { ...o, x: n.x, y: n.y };
    }
    case "text": {
      const c = P(boxCenter(o));
      const size = Math.max(6, o.size * k);
      const sz = textBoxSize({ ...o, size });
      const rot = normAngle(o.rot + Math.atan2(m.b, m.a));
      return { ...o, size, w: sz.w, h: sz.h, x: c.x - sz.w / 2, y: c.y - sz.h / 2, rot } as T;
    }
    default:
      return xformBox(o as BoxObj, m) as unknown as T;
  }
}

export function translateObj<T extends Obj>(o: T, dx: number, dy: number): T {
  if (dx === 0 && dy === 0) return o;
  switch (o.type) {
    case "path":
    case "line":
    case "angle":
    case "point":
      return transformObj(o, matTranslate(dx, dy));
    default:
      return { ...o, x: (o as BoxObj).x + dx, y: (o as BoxObj).y + dy } as T;
  }
}

/* ------------------------------------------------------------------ */
/* Bounds                                                              */
/* ------------------------------------------------------------------ */

const boundsCache = new WeakMap<Obj, Rect>();

export function objectBounds(o: Obj): Rect {
  const hit = boundsCache.get(o);
  if (hit) return hit;
  const r = computeBounds(o);
  boundsCache.set(o, r);
  return r;
}

function computeBounds(o: Obj): Rect {
  const pad = o.style.width / 2;
  switch (o.type) {
    case "path": {
      const pts: Pt[] = [];
      for (let i = 0; i < o.pts.length; i += 2) pts.push({ x: o.pts[i], y: o.pts[i + 1] });
      return inflate(rectOfPoints(pts), pad + (o.highlighter ? o.style.width : 0));
    }
    case "line": {
      let r = inflate(rectOfPoints(linePath(o)), pad + 2);
      if (o.start !== "none" || o.end !== "none" || o.kind === "dimension") r = inflate(r, 4 + o.style.width * 2);
      if (o.label) {
        const l = lineLabelPos(o);
        const lay = layoutText({ text: o.label, font: "sans", size: o.labelSize, bold: false, italic: false });
        r = unionRect(r, { x: l.x - lay.w / 2, y: l.y - lay.h / 2, w: lay.w, h: lay.h });
      }
      return r;
    }
    case "angle": {
      let r = inflate(rectOfPoints([o.v, o.a, o.b]), pad + 2);
      const g = angleGeom(o.v, o.a, o.b, o.reflex);
      const n = Math.max(2, Math.ceil(Math.abs(g.sweep) / (Math.PI / 6)));
      const rr = o.arcR + o.arcs * 3;
      for (let i = 0; i <= n; i++) {
        const t = g.a0 + (g.sweep * i) / n;
        r = unionRect(r, { x: o.v.x + rr * Math.cos(t), y: o.v.y + rr * Math.sin(t), w: 0, h: 0 });
      }
      const lp = angleLabelPos(o);
      const half = o.fontSize * (angleLabelText(o).length * 0.35 + 0.4);
      return unionRect(r, { x: lp.x - half, y: lp.y - o.fontSize * 0.7, w: half * 2, h: o.fontSize * 1.4 });
    }
    case "point": {
      let r = { x: o.x - o.size - 2, y: o.y - o.size - 2, w: (o.size + 2) * 2, h: (o.size + 2) * 2 };
      if (o.label) {
        const lay = layoutText({ text: o.label, font: "math", size: o.fontSize, bold: false, italic: false });
        r = unionRect(r, { x: o.x + o.lx - lay.w / 2, y: o.y + o.ly - lay.h / 2, w: lay.w, h: lay.h });
      }
      return r;
    }
    case "shape": {
      const pts = shapeContours(o).flatMap((c) => c.pts);
      return inflate(rectOfPoints(pts), pad);
    }
    default:
      return inflate(rectOfPoints(boxCorners(o)), o.type === "text" || o.type === "image" ? 0 : pad);
  }
}

export function selectionBounds(objs: Obj[]): Rect | null {
  let r: Rect | null = null;
  for (const o of objs) r = unionRect(r, objectBounds(o));
  return r;
}

/** Tight crop of the drawing for "fit canvas to drawing". */
export function contentBounds(objs: Obj[]): Rect | null {
  return selectionBounds(objs);
}

/* ------------------------------------------------------------------ */
/* Hit testing                                                         */
/* ------------------------------------------------------------------ */

export function hitTest(o: Obj, p: Pt, tol: number): boolean {
  const b = objectBounds(o);
  if (p.x < b.x - tol || p.x > b.x + b.w + tol || p.y < b.y - tol || p.y > b.y + b.h + tol) return false;
  switch (o.type) {
    case "path": {
      const pts: Pt[] = [];
      for (let i = 0; i < o.pts.length; i += 2) pts.push({ x: o.pts[i], y: o.pts[i + 1] });
      return distToPolyline(p, pts) <= tol + o.style.width / 2 + (o.highlighter ? o.style.width / 2 : 0);
    }
    case "line": {
      if (distToPolyline(p, linePath(o)) <= tol + o.style.width / 2) return true;
      if (o.label) {
        const lp = lineLabelPos(o);
        const lay = layoutText({ text: o.label, font: "sans", size: o.labelSize, bold: false, italic: false });
        return Math.abs(p.x - lp.x) <= lay.w / 2 + tol && Math.abs(p.y - lp.y) <= lay.h / 2 + tol;
      }
      return false;
    }
    case "angle": {
      const t = tol + o.style.width / 2;
      if (distToSeg(p, o.v, o.a) <= t || distToSeg(p, o.v, o.b) <= t) return true;
      const g = angleGeom(o.v, o.a, o.b, o.reflex);
      const dv = dist(p, o.v);
      if (Math.abs(dv - o.arcR) <= t + o.arcs * 3) {
        const ang = Math.atan2(p.y - o.v.y, p.x - o.v.x);
        const rel = g.sweep >= 0 ? normAngle(ang - g.a0) : normAngle(g.a0 - ang);
        const rel2 = ((rel % TAU) + TAU) % TAU;
        if (rel2 <= Math.abs(g.sweep) + 0.05) return true;
      }
      if (o.fillSector && dv <= o.arcR) return true;
      const lp = angleLabelPos(o);
      const half = o.fontSize * (angleLabelText(o).length * 0.35 + 0.4);
      return angleLabelText(o) !== "" && Math.abs(p.x - lp.x) <= half + tol && Math.abs(p.y - lp.y) <= o.fontSize * 0.7 + tol;
    }
    case "point": {
      if (dist(p, o) <= o.size + tol) return true;
      if (o.label) {
        const lay = layoutText({ text: o.label, font: "math", size: o.fontSize, bold: false, italic: false });
        return Math.abs(p.x - (o.x + o.lx)) <= lay.w / 2 + tol && Math.abs(p.y - (o.y + o.ly)) <= lay.h / 2 + tol;
      }
      return false;
    }
    case "shape": {
      const cs = shapeContours(o);
      if (isFilled(o) && o.kind !== "rightmark") {
        // even-odd across contours
        let inside = false;
        for (const c of cs) if (c.closed && pointInPolygon(p, c.pts)) inside = !inside;
        if (inside) return true;
      }
      const t = tol + o.style.width / 2;
      return cs.some((c) => distToPolyline(p, c.pts, c.closed) <= t);
    }
    case "axes": {
      if (!pointInBox(o, p, tol)) return false;
      if (o.showGrid) return true;
      const l = worldToBox(o, p);
      const lay = axesLayout(o);
      const lx = l.x + o.w / 2;
      const ly = l.y + o.h / 2;
      return Math.abs(lx - lay.ox) <= tol + 6 || Math.abs(ly - lay.oy) <= tol + 6;
    }
    default:
      return pointInBox(o, p, tol);
  }
}

/** Topmost unlocked-or-not object under a point (objects are in z-order, last = top). */
export function pickObject(objs: Obj[], p: Pt, tol: number, skipLocked = false): Obj | null {
  for (let i = objs.length - 1; i >= 0; i--) {
    const o = objs[i];
    if (skipLocked && o.locked) continue;
    if (hitTest(o, p, tol)) return o;
  }
  return null;
}

export function objectsInRect(objs: Obj[], r: Rect, mode: "intersect" | "contain" = "intersect"): Obj[] {
  return objs.filter((o) => {
    const b = objectBounds(o);
    return mode === "contain" ? b.x >= r.x && b.y >= r.y && b.x + b.w <= r.x + r.w && b.y + b.h <= r.y + r.h : rectsIntersect(b, r);
  });
}

/* ------------------------------------------------------------------ */
/* Key points, vertices, snapping                                      */
/* ------------------------------------------------------------------ */

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Vertices a user might label (A, B, C…). */
export function objectVertices(o: Obj): Pt[] {
  switch (o.type) {
    case "line":
      return o.kind === "arc" ? [o.pts[0], o.pts[o.pts.length - 1]] : o.pts;
    case "angle":
      return [o.v, o.a, o.b];
    case "shape":
      return POLY_KINDS.has(o.kind) && o.kind !== "star" && o.kind !== "cross" ? shapeContours(o)[0].pts : [];
    case "point":
      return [{ x: o.x, y: o.y }];
    default:
      return [];
  }
}

export function keyPoints(o: Obj): Pt[] {
  switch (o.type) {
    case "path":
      return o.pts.length >= 2 ? [{ x: o.pts[0], y: o.pts[1] }, { x: o.pts[o.pts.length - 2], y: o.pts[o.pts.length - 1] }] : [];
    case "line": {
      const out = o.pts.slice();
      if (o.kind === "arc") {
        const g = arcThrough(o.pts[0], o.pts[1], o.pts[2]);
        if (g) out.push(g.c);
      }
      for (let i = 0; i < o.pts.length - 1 && o.kind !== "arc"; i++) out.push(mid(o.pts[i], o.pts[i + 1]));
      return out;
    }
    case "angle":
      return [o.v, o.a, o.b, mid(o.v, o.a), mid(o.v, o.b)];
    case "point":
      return [{ x: o.x, y: o.y }];
    case "shape": {
      const c = boxCenter(o);
      const out: Pt[] = [c];
      if (o.kind === "ellipse" || o.kind === "ring" || o.kind === "sector" || o.kind === "semicircle") {
        out.push(boxToWorld(o, 0, -o.h / 2), boxToWorld(o, o.w / 2, 0), boxToWorld(o, 0, o.h / 2), boxToWorld(o, -o.w / 2, 0));
        return out;
      }
      const pts = shapeContours(o)[0].pts;
      out.push(...pts);
      for (let i = 0; i < pts.length - 1; i++) out.push(mid(pts[i], pts[i + 1]));
      if (pts.length > 2) out.push(mid(pts[pts.length - 1], pts[0]));
      return out;
    }
    default: {
      const bo = o as BoxObj;
      const cs = boxCorners(bo);
      return [boxCenter(bo), ...cs, mid(cs[0], cs[1]), mid(cs[1], cs[2]), mid(cs[2], cs[3]), mid(cs[3], cs[0])];
    }
  }
}

export interface SnapResult {
  p: Pt;
  kind: "point" | "grid" | "none";
  target?: Pt;
}

export function snapPoint(p: Pt, o: { points?: Pt[]; grid?: number | null; tol: number }): SnapResult {
  if (o.points && o.points.length) {
    let best: Pt | null = null;
    let bd = o.tol;
    for (const q of o.points) {
      const d = dist(p, q);
      if (d <= bd) {
        bd = d;
        best = q;
      }
    }
    if (best) return { p: best, kind: "point", target: best };
  }
  if (o.grid && o.grid > 0) {
    return { p: { x: Math.round(p.x / o.grid) * o.grid, y: Math.round(p.y / o.grid) * o.grid }, kind: "grid" };
  }
  return { p, kind: "none" };
}

/**
 * Find the translation correction that aligns any of `moving` points to a static key point
 * (within `tol`), else to the grid via the first moving point. Returns the delta to ADD.
 */
export function snapDelta(
  moving: Pt[],
  statics: Pt[],
  o: { grid?: number | null; tol: number },
): { dx: number; dy: number; target?: Pt } {
  let best: { dx: number; dy: number; target: Pt } | null = null;
  let bd = o.tol;
  if (statics.length) {
    for (const m of moving) {
      for (const s of statics) {
        const d = dist(m, s);
        if (d <= bd) {
          bd = d;
          best = { dx: s.x - m.x, dy: s.y - m.y, target: s };
        }
      }
    }
  }
  if (best) return best;
  if (o.grid && o.grid > 0 && moving.length) {
    const m = moving[0];
    return { dx: Math.round(m.x / o.grid) * o.grid - m.x, dy: Math.round(m.y / o.grid) * o.grid - m.y };
  }
  return { dx: 0, dy: 0 };
}

/* ------------------------------------------------------------------ */
/* Handles                                                             */
/* ------------------------------------------------------------------ */

export interface Handle {
  id: string;
  p: Pt;
}

export function objectHandles(o: Obj): Handle[] {
  switch (o.type) {
    case "line":
      return o.pts.map((p, i) => ({ id: `p${i}`, p }));
    case "angle": {
      const g = angleGeom(o.v, o.a, o.b, o.reflex);
      const mid = g.a0 + g.sweep / 2;
      return [
        { id: "v", p: o.v },
        { id: "a", p: o.a },
        { id: "b", p: o.b },
        { id: "r", p: { x: o.v.x + o.arcR * Math.cos(mid), y: o.v.y + o.arcR * Math.sin(mid) } },
      ];
    }
    case "point":
      return o.label ? [{ id: "label", p: { x: o.x + o.lx, y: o.y + o.ly } }] : [];
    case "shape":
      if (o.kind === "sector")
        return [
          { id: "a0", p: boxToWorld(o, (o.w / 2) * Math.cos(rad(o.a0)), (o.h / 2) * Math.sin(rad(o.a0))) },
          { id: "a1", p: boxToWorld(o, (o.w / 2) * Math.cos(rad(o.a1)), (o.h / 2) * Math.sin(rad(o.a1))) },
        ];
      if (o.kind === "roundrect") return [{ id: "radius", p: boxToWorld(o, -o.w / 2 + o.radius, -o.h / 2) }];
      return [];
    case "text":
    case "stamp":
    case "image":
    case "axes":
    case "numberline":
    case "path":
      return [];
  }
}

export function dragHandle(o: Obj, id: string, p: Pt, shift: boolean): Obj {
  switch (o.type) {
    case "line": {
      const i = Number(id.slice(1));
      let q = p;
      if (shift && o.kind !== "arc") {
        const ref = o.pts[i > 0 ? i - 1 : 1];
        if (ref) q = constrainAngle(ref, p);
      }
      return { ...o, pts: o.pts.map((pp, j) => (j === i ? q : pp)) };
    }
    case "angle": {
      if (id === "v") return { ...o, v: p };
      if (id === "r") return { ...o, arcR: clamp(dist(p, o.v), 8, 600) };
      const q = shift ? constrainAngle(o.v, p) : p;
      return id === "a" ? { ...o, a: q } : { ...o, b: q };
    }
    case "point":
      return { ...o, lx: p.x - o.x, ly: p.y - o.y };
    case "shape": {
      const l = worldToBox(o, p);
      if (id === "radius") return { ...o, radius: clamp(l.x + o.w / 2, 0, Math.min(o.w, o.h) / 2) };
      let a = deg(Math.atan2(l.y / (o.h / 2 || 1), l.x / (o.w / 2 || 1)));
      if (shift) a = Math.round(a / 15) * 15;
      return id === "a0" ? { ...o, a0: a } : { ...o, a1: a };
    }
    default:
      return o;
  }
}

export type BoxHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HV: Record<BoxHandle, [number, number]> = {
  nw: [-1, -1],
  n: [0, -1],
  ne: [1, -1],
  e: [1, 0],
  se: [1, 1],
  s: [0, 1],
  sw: [-1, 1],
  w: [-1, 0],
};
export const BOX_HANDLES = Object.keys(HV) as BoxHandle[];
export const handleVec = (h: BoxHandle) => HV[h];

export function boxHandlePos(b: BoxFields, h: BoxHandle): Pt {
  const [hx, hy] = HV[h];
  const c = boxCenter(b);
  const cs = Math.cos(b.rot);
  const sn = Math.sin(b.rot);
  const lx = (hx * b.w) / 2;
  const ly = (hy * b.h) / 2;
  return { x: c.x + lx * cs - ly * sn, y: c.y + lx * sn + ly * cs };
}

/** New box when dragging handle `h` to world point `p`. */
export function resizeBox(b: BoxFields, h: BoxHandle, p: Pt, o: { aspect?: boolean; center?: boolean; min?: number } = {}): Rect {
  const [hx, hy] = HV[h];
  const min = o.min ?? 2;
  const l = worldToBox(b, p);
  const ax = o.center ? 0 : (-hx * b.w) / 2;
  const ay = o.center ? 0 : (-hy * b.h) / 2;
  const mult = o.center ? 2 : 1;
  let w = hx !== 0 ? Math.max(min, (l.x - ax) * hx * mult) : b.w;
  let hgt = hy !== 0 ? Math.max(min, (l.y - ay) * hy * mult) : b.h;
  if (o.aspect && b.w > 0 && b.h > 0) {
    let s: number;
    if (hx !== 0 && hy !== 0) s = Math.max(w / b.w, hgt / b.h);
    else s = hx !== 0 ? w / b.w : hgt / b.h;
    w = Math.max(min, b.w * s);
    hgt = Math.max(min, b.h * s);
  }
  const lcx = o.center ? 0 : ax + (hx * w) / 2;
  const lcy = o.center ? 0 : ay + (hy * hgt) / 2;
  const cs = Math.cos(b.rot);
  const sn = Math.sin(b.rot);
  const c = boxCenter(b);
  const cx = c.x + lcx * cs - lcy * sn;
  const cy = c.y + lcx * sn + lcy * cs;
  return { x: cx - w / 2, y: cy - hgt / 2, w, h: hgt };
}

/* ------------------------------------------------------------------ */
/* Arrange: align / distribute / flip                                  */
/* ------------------------------------------------------------------ */

export type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";

/** Returns replacement objects (same ids) aligned to the selection bounds. */
export function alignObjects(objs: Obj[], mode: AlignMode): Obj[] {
  const sb = selectionBounds(objs);
  if (!sb || objs.length < 2) return objs;
  return objs.map((o) => {
    if (o.locked) return o;
    const b = objectBounds(o);
    let dx = 0;
    let dy = 0;
    if (mode === "left") dx = sb.x - b.x;
    else if (mode === "right") dx = sb.x + sb.w - (b.x + b.w);
    else if (mode === "center") dx = sb.x + sb.w / 2 - (b.x + b.w / 2);
    else if (mode === "top") dy = sb.y - b.y;
    else if (mode === "bottom") dy = sb.y + sb.h - (b.y + b.h);
    else dy = sb.y + sb.h / 2 - (b.y + b.h / 2);
    return translateObj(o, dx, dy);
  });
}

export function distributeObjects(objs: Obj[], axis: "h" | "v"): Obj[] {
  if (objs.length < 3) return objs;
  const items = objs.map((o) => ({ o, b: objectBounds(o) }));
  const key = (r: Rect) => (axis === "h" ? r.x : r.y);
  const size = (r: Rect) => (axis === "h" ? r.w : r.h);
  const sorted = items.slice().sort((p, q) => key(p.b) + size(p.b) / 2 - (key(q.b) + size(q.b) / 2));
  const first = sorted[0].b;
  const last = sorted[sorted.length - 1].b;
  const total = key(last) + size(last) - key(first);
  const sizes = sorted.reduce((s, it) => s + size(it.b), 0);
  const gap = (total - sizes) / (sorted.length - 1);
  const out = new Map<string, Obj>();
  let cursor = key(first);
  for (const it of sorted) {
    const d = cursor - key(it.b);
    out.set(it.o.id, it.o.locked ? it.o : axis === "h" ? translateObj(it.o, d, 0) : translateObj(it.o, 0, d));
    cursor += size(it.b) + gap;
  }
  return objs.map((o) => out.get(o.id) ?? o);
}

export function flipObjects(objs: Obj[], axis: "h" | "v"): Obj[] {
  const sb = selectionBounds(objs);
  if (!sb) return objs;
  const c = rectCenter(sb);
  const m = axis === "h" ? matScaleAbout(-1, 1, c.x, c.y) : matScaleAbout(1, -1, c.x, c.y);
  return objs.map((o) => (o.locked ? o : transformObj(o, m)));
}

/* ------------------------------------------------------------------ */
/* Hatch                                                               */
/* ------------------------------------------------------------------ */

export interface HatchGeom {
  lines: [number, number, number, number][];
  dots: Pt[];
}

/** Hatch strokes/dots covering `b` (to be clipped by the caller). */
export function hatchGeometry(b: Rect, kind: Hatch, spacing = 8): HatchGeom {
  const lines: HatchGeom["lines"] = [];
  const dots: Pt[] = [];
  const sp = Math.max(2, spacing);
  const cap = 800;
  if (kind === "none" || b.w <= 0 || b.h <= 0) return { lines, dots };
  if (kind === "diagonal" || kind === "cross") {
    for (let c = b.x - b.h, n = 0; c <= b.x + b.w && n < cap; c += sp, n++) lines.push([c, b.y + b.h, c + b.h, b.y]);
  }
  if (kind === "cross") {
    for (let c = b.x, n = 0; c <= b.x + b.w + b.h && n < cap; c += sp, n++) lines.push([c, b.y + b.h, c - b.h, b.y]);
  }
  if (kind === "horizontal") {
    for (let y = b.y + sp / 2, n = 0; y <= b.y + b.h && n < cap; y += sp, n++) lines.push([b.x, y, b.x + b.w, y]);
  }
  if (kind === "dots") {
    for (let y = b.y + sp / 2; y <= b.y + b.h; y += sp)
      for (let x = b.x + sp / 2; x <= b.x + b.w && dots.length < 4000; x += sp) dots.push({ x, y });
  }
  return { lines, dots };
}
