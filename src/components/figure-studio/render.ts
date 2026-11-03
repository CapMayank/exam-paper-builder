import {
  angleGeom,
  boxCenter,
  boxCorners,
  hatchGeometry,
  normAngle,
  objectBounds,
  rad,
  rectCenter,
  rotateAround,
  shapeContours,
} from "./geometry";
import { toFraction } from "./fractions";
import { STAMP_REGISTRY } from "./stamps";
import { layoutText, setMeasurer } from "./text";
import type { AngleObj, AxesObj, BoxObj, Doc, FractionObj, GridSettings, TableObj, LineObj, NumLineObj, Obj, PathObj, PointObj, Pt, Rect, ShapeObj, Style } from "./types";

// Install browser canvas measurer
if (typeof document !== "undefined") {
  const measureCanvas = document.createElement("canvas");
  const mCtx = measureCanvas.getContext("2d");
  if (mCtx) {
    setMeasurer((css, text) => {
      mCtx.font = css;
      return mCtx.measureText(text).width;
    });
  }
}

export function applyStyle(ctx: CanvasRenderingContext2D, style: Style) {
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.width;
  ctx.globalAlpha = style.opacity;

  if (style.dash === "dashed") ctx.setLineDash([style.width * 3, style.width * 2]);
  else if (style.dash === "dotted") ctx.setLineDash([style.width, style.width * 1.5]);
  else ctx.setLineDash([]);
}

function drawArrowhead(ctx: CanvasRenderingContext2D, tip: Pt, from: Pt, kind: string, size = 10) {
  if (kind === "none") return;
  const ang = Math.atan2(tip.y - from.y, tip.x - from.x);
  const cs = Math.cos(ang);
  const sn = Math.sin(ang);

  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(ang);

  if (kind === "filled") {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.45);
    ctx.lineTo(-size * 0.75, 0);
    ctx.lineTo(-size, size * 0.45);
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  } else if (kind === "open") {
    ctx.beginPath();
    ctx.moveTo(-size, -size * 0.5);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size, size * 0.5);
    ctx.stroke();
  } else if (kind === "dot") {
    ctx.beginPath();
    ctx.arc(-size * 0.35, 0, size * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  } else if (kind === "bar") {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(0, size * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTicks(ctx: CanvasRenderingContext2D, mid: Pt, dirAngle: number, count: number, len = 10) {
  if (count <= 0) return;
  const perp = dirAngle + Math.PI / 2;
  const dx = Math.cos(dirAngle) * 5;
  const dy = Math.sin(dirAngle) * 5;
  const px = Math.cos(perp) * (len / 2);
  const py = Math.sin(perp) * (len / 2);

  const startOffset = -((count - 1) / 2);
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const k = startOffset + i;
    const mx = mid.x + dx * k;
    const my = mid.y + dy * k;
    ctx.moveTo(mx - px, my - py);
    ctx.lineTo(mx + px, my + py);
  }
  ctx.stroke();
  ctx.restore();
}

function drawParallelMarks(ctx: CanvasRenderingContext2D, mid: Pt, dirAngle: number, count: number, size = 8) {
  if (count <= 0) return;
  const cs = Math.cos(dirAngle);
  const sn = Math.sin(dirAngle);
  const startOffset = -((count - 1) / 2) * 6;

  ctx.save();
  for (let i = 0; i < count; i++) {
    const ox = mid.x + cs * (startOffset + i * 6);
    const oy = mid.y + sn * (startOffset + i * 6);
    ctx.beginPath();
    ctx.moveTo(ox - cs * size - sn * (size * 0.5), oy - sn * size + cs * (size * 0.5));
    ctx.lineTo(ox, oy);
    ctx.lineTo(ox - cs * size + sn * (size * 0.5), oy - sn * size - cs * (size * 0.5));
    ctx.stroke();
  }
  ctx.restore();
}

export function renderGrid(ctx: CanvasRenderingContext2D, w: number, h: number, grid: GridSettings) {
  if (grid.style === "none" || grid.size <= 0) return;
  const sz = grid.size;

  ctx.save();
  if (grid.style === "squares") {
    ctx.strokeStyle = "rgba(13, 45, 56, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += sz) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = 0; y <= h; y += sz) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();
  } else if (grid.style === "dots") {
    ctx.fillStyle = "rgba(13, 45, 56, 0.25)";
    for (let x = sz; x < w; x += sz) {
      for (let y = sz; y < h; y += sz) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

export function renderObj(
  ctx: CanvasRenderingContext2D,
  obj: Obj,
  imageCache?: Map<string, HTMLImageElement>,
) {
  ctx.save();
  applyStyle(ctx, obj.style);

  switch (obj.type) {
    case "path": {
      renderPath(ctx, obj);
      break;
    }
    case "line": {
      renderLine(ctx, obj);
      break;
    }
    case "angle": {
      renderAngle(ctx, obj);
      break;
    }
    case "point": {
      renderPoint(ctx, obj);
      break;
    }
    case "text": {
      renderText(ctx, obj);
      break;
    }
    case "shape": {
      renderShape(ctx, obj);
      break;
    }
    case "stamp": {
      renderStamp(ctx, obj);
      break;
    }
    case "image": {
      renderImage(ctx, obj, imageCache);
      break;
    }
    case "axes": {
      renderAxes(ctx, obj);
      break;
    }
    case "numberline": {
      renderNumberLine(ctx, obj);
      break;
    }
    case "fraction": {
      renderFraction(ctx, obj);
      break;
    }
    case "table": {
      renderTable(ctx, obj);
      break;
    }
  }

  ctx.restore();
}

function renderPath(ctx: CanvasRenderingContext2D, obj: PathObj) {
  if (obj.pts.length < 2) return;
  if (obj.highlighter) {
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(12, obj.style.width * 4);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  } else {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  ctx.beginPath();
  ctx.moveTo(obj.pts[0], obj.pts[1]);
  for (let i = 2; i < obj.pts.length; i += 2) {
    ctx.lineTo(obj.pts[i], obj.pts[i + 1]);
  }
  ctx.stroke();
}

function renderLine(ctx: CanvasRenderingContext2D, obj: LineObj) {
  const pts = obj.pts;
  if (pts.length < 2) return;

  ctx.beginPath();
  if (obj.kind === "arc" && pts.length >= 3) {
    // 3-point quadratic curve or circular arc
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
  } else {
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();

  // Arrowheads at endpoints
  if (pts.length >= 2) {
    const first = pts[0];
    const second = pts[1];
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];

    if (obj.start !== "none") drawArrowhead(ctx, first, second, obj.start, obj.style.width * 4);
    if (obj.end !== "none") drawArrowhead(ctx, last, prev, obj.end, obj.style.width * 4);
  }

  // Dimension line / Middle marks & text
  const midX = (pts[0].x + pts[pts.length - 1].x) / 2;
  const midY = (pts[0].y + pts[pts.length - 1].y) / 2;
  const angle = Math.atan2(pts[pts.length - 1].y - pts[0].y, pts[pts.length - 1].x - pts[0].x);

  if (obj.ticks > 0) drawTicks(ctx, { x: midX, y: midY }, angle, obj.ticks, obj.style.width * 5);
  if (obj.parallels > 0) drawParallelMarks(ctx, { x: midX, y: midY }, angle, obj.parallels, obj.style.width * 4);

  if (obj.label) {
    const perp = angle + Math.PI / 2;
    const lx = midX + Math.cos(perp) * obj.labelOffset;
    const ly = midY + Math.sin(perp) * obj.labelOffset;

    ctx.save();
    ctx.font = `${obj.labelSize || 14}px var(--font-heading), Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // White background pill to prevent line/wire strikethrough & visual clutter
    const metrics = ctx.measureText(obj.label);
    const tw = metrics.width;
    const th = obj.labelSize || 14;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(lx - tw / 2 - 3, ly - th / 2 - 2, tw + 6, th + 4);

    ctx.fillStyle = obj.style.stroke;
    ctx.fillText(obj.label, lx, ly);
    ctx.restore();
  }
}

function renderAngle(ctx: CanvasRenderingContext2D, obj: AngleObj) {
  const { v, a, b } = obj;
  const g = angleGeom(v, a, b, !!obj.reflex);
  const a1 = g.a0;
  const a2 = g.a0 + g.sweep;
  const anticlockwise = g.sweep < 0;

  // 1. Draw arms from vertex to a and b
  ctx.beginPath();
  ctx.moveTo(v.x, v.y);
  ctx.lineTo(a.x, a.y);
  ctx.moveTo(v.x, v.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();

  if (obj.armArrow && obj.armArrow !== "none") {
    drawArrowhead(ctx, a, v, obj.armArrow, obj.style.width * 3.5);
    drawArrowhead(ctx, b, v, obj.armArrow, obj.style.width * 3.5);
  }

  const degVal = g.deg;
  const isRight = obj.rightMark || (Math.abs(degVal - 90) < 0.6 && obj.rightMark !== false);

  // 2. Right-angle square mark
  if (isRight && !obj.reflex) {
    const r = Math.max(12, Math.min(obj.arcR, 26));
    const u1 = { x: Math.cos(a1), y: Math.sin(a1) };
    const u2 = { x: Math.cos(a2), y: Math.sin(a2) };

    const p1 = { x: v.x + u1.x * r, y: v.y + u1.y * r };
    const pCorner = { x: v.x + (u1.x + u2.x) * r, y: v.y + (u1.y + u2.y) * r };
    const p2 = { x: v.x + u2.x * r, y: v.y + u2.y * r };

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(pCorner.x, pCorner.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    if (obj.fillSector && obj.style.fill) {
      ctx.save();
      ctx.fillStyle = obj.style.fill;
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(pCorner.x, pCorner.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else {
    // 3. Curved arc(s)
    const count = Math.max(1, Math.min(3, obj.arcs || 1));
    const rStep = 4;

    for (let i = 0; i < count; i++) {
      const radius = obj.arcR + (i - (count - 1) / 2) * rStep;
      if (radius <= 3) continue;

      ctx.beginPath();
      ctx.arc(v.x, v.y, radius, a1, a2, anticlockwise);
      ctx.stroke();

      if (i === 0 && obj.fillSector && obj.style.fill) {
        ctx.save();
        ctx.fillStyle = obj.style.fill;
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.arc(v.x, v.y, radius, a1, a2, anticlockwise);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // 4. Angle Label
  let labelText = "";
  if (obj.labelMode === "auto") {
    labelText = obj.decimals === 1 ? `${degVal.toFixed(1)}°` : `${Math.round(degVal)}°`;
  } else if (obj.labelMode === "custom") {
    labelText = obj.label || "";
  }

  if (labelText) {
    const midAng = a1 + g.sweep / 2;
    const labelDist = obj.arcR + (obj.fontSize || 15) * 0.9 + 4;
    const lx = v.x + Math.cos(midAng) * labelDist;
    const ly = v.y + Math.sin(midAng) * labelDist;

    ctx.save();
    ctx.font = `${obj.fontSize || 15}px var(--font-heading), Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // White background pill for angle label
    const metrics = ctx.measureText(labelText);
    const tw = metrics.width;
    const th = obj.fontSize || 15;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(lx - tw / 2 - 2, ly - th / 2 - 2, tw + 4, th + 4);

    ctx.fillStyle = obj.style.stroke;
    ctx.fillText(labelText, lx, ly);
    ctx.restore();
  }
}

function renderPoint(ctx: CanvasRenderingContext2D, obj: PointObj) {
  const { x, y, size, mode, label, lx, ly, fontSize } = obj;

  ctx.save();
  if (mode === "dot") {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = obj.style.stroke;
    ctx.fill();
  } else if (mode === "hollow") {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.stroke();
  } else if (mode === "cross") {
    ctx.beginPath();
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.moveTo(x + size, y - size);
    ctx.lineTo(x - size, y + size);
    ctx.stroke();
  }

  if (label) {
    const px = x + (lx || 0);
    const py = y + (ly || 0);

    ctx.font = `italic ${fontSize || 16}px var(--font-heading), Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // White background pill for point letter label
    const metrics = ctx.measureText(label);
    const tw = metrics.width;
    const th = fontSize || 16;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(px - tw / 2 - 2, py - th / 2 - 2, tw + 4, th + 4);

    ctx.fillStyle = obj.style.stroke;
    ctx.fillText(label, px, py);
  }
  ctx.restore();
}

function renderText(ctx: CanvasRenderingContext2D, obj: BoxObj & { type: "text" }) {
  const { lines, lineH, w, h, pad, css } = layoutText(obj);
  const c = boxCenter(obj);

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(obj.rot);

  // Background pill / fill
  if (obj.bg === "white" || obj.style.fill) {
    ctx.fillStyle = obj.bg === "white" ? "#ffffff" : obj.style.fill || "#ffffff";
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }
  if (obj.border) {
    ctx.strokeRect(-w / 2, -h / 2, w, h);
  }

  ctx.font = css;
  ctx.fillStyle = obj.style.stroke;
  ctx.textBaseline = "top";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let tx = -w / 2 + pad;
    if (obj.align === "center") tx = 0;
    else if (obj.align === "right") tx = w / 2 - pad;

    ctx.textAlign = obj.align;
    ctx.fillText(line, tx, -h / 2 + pad + i * lineH);
  }
  ctx.restore();
}

function renderShape(ctx: CanvasRenderingContext2D, obj: ShapeObj) {
  const contours = shapeContours(obj);
  if (!contours.length) return;

  const buildPath = () => {
    ctx.beginPath();
    for (const c of contours) {
      if (c.pts.length < 2) continue;
      ctx.moveTo(c.pts[0].x, c.pts[0].y);
      for (let i = 1; i < c.pts.length; i++) {
        ctx.lineTo(c.pts[i].x, c.pts[i].y);
      }
      if (c.closed) {
        ctx.closePath();
      }
    }
  };

  buildPath();

  if (obj.style.fill) {
    ctx.fillStyle = obj.style.fill;
    ctx.fill();
  }

  // Hatch filling if requested
  if (obj.style.hatch && obj.style.hatch !== "none") {
    ctx.save();
    ctx.clip();
    const b = objectBounds(obj);
    const hGeom = hatchGeometry(b, obj.style.hatch);
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of hGeom.lines) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    if (hGeom.dots.length > 0) {
      ctx.fillStyle = obj.style.stroke;
      for (const d of hGeom.dots) {
        ctx.fillRect(d.x - 1, d.y - 1, 2, 2);
      }
    }
    ctx.restore();
  }

  // Stroke the shape border
  buildPath();
  ctx.stroke();
}

function renderStamp(ctx: CanvasRenderingContext2D, obj: BoxObj & { type: "stamp" }) {
  const def = STAMP_REGISTRY[obj.stamp];
  if (!def) return;
  const c = boxCenter(obj);

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(obj.rot);
  if (obj.flipX) ctx.scale(-1, 1);
  if (obj.flipY) ctx.scale(1, -1);

  def.draw(ctx, { x: -obj.w / 2, y: -obj.h / 2, w: obj.w, h: obj.h }, obj.style);
  ctx.restore();
}

function renderImage(
  ctx: CanvasRenderingContext2D,
  obj: BoxObj & { type: "image" },
  cache?: Map<string, HTMLImageElement>,
) {
  const c = boxCenter(obj);
  let img = cache?.get(obj.src);
  if (!img) {
    img = new Image();
    img.src = obj.src;
    cache?.set(obj.src, img);
  }

  if (img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(obj.rot);
    ctx.drawImage(img, -obj.w / 2, -obj.h / 2, obj.w, obj.h);
    ctx.restore();
  }
}

function renderAxes(ctx: CanvasRenderingContext2D, obj: AxesObj) {
  const c = boxCenter(obj);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(obj.rot);

  const hw = obj.w / 2;
  const hh = obj.h / 2;

  // Axes lines
  ctx.beginPath();
  // X axis
  ctx.moveTo(-hw, 0);
  ctx.lineTo(hw, 0);
  // Y axis
  ctx.moveTo(0, hh);
  ctx.lineTo(0, -hh);
  ctx.stroke();

  // Arrowheads
  if (obj.arrows) {
    drawArrowhead(ctx, { x: hw, y: 0 }, { x: hw - 10, y: 0 }, "open", 8);
    drawArrowhead(ctx, { x: -hw, y: 0 }, { x: -hw + 10, y: 0 }, "open", 8);
    drawArrowhead(ctx, { x: 0, y: -hh }, { x: 0, y: -hh + 10 }, "open", 8);
    drawArrowhead(ctx, { x: 0, y: hh }, { x: 0, y: hh - 10 }, "open", 8);
  }

  // Ticks and numbers
  const xSpan = obj.xMax - obj.xMin;
  const ySpan = obj.yMax - obj.yMin;
  const dx = obj.w / (xSpan || 1);
  const dy = obj.h / (ySpan || 1);

  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = obj.style.stroke;

  for (let x = obj.xMin; x <= obj.xMax; x++) {
    if (x === 0) continue;
    const px = (x - (obj.xMin + obj.xMax) / 2) * dx;
    ctx.beginPath();
    ctx.moveTo(px, -3);
    ctx.lineTo(px, 3);
    ctx.stroke();
    if (obj.showNumbers) ctx.fillText(String(x), px, 5);
  }

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let y = obj.yMin; y <= obj.yMax; y++) {
    if (y === 0) continue;
    const py = -(y - (obj.yMin + obj.yMax) / 2) * dy;
    ctx.beginPath();
    ctx.moveTo(-3, py);
    ctx.lineTo(3, py);
    ctx.stroke();
    if (obj.showNumbers) ctx.fillText(String(y), -6, py);
  }

  if (obj.names) {
    ctx.font = "italic bold 13px serif";
    ctx.textAlign = "left";
    ctx.fillText("x", hw - 12, 10);
    ctx.textAlign = "right";
    ctx.fillText("y", -8, -hh + 12);
    ctx.fillText("O", -6, 6);
  }

  ctx.restore();
}

/** Draws num over den (with a bar) centred at x, top at y. */
function drawStacked(ctx: CanvasRenderingContext2D, num: string, den: string, neg: boolean, x: number, y: number, size: number) {
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const w = Math.max(ctx.measureText(num).width, ctx.measureText(den).width) + 4;
  if (neg) ctx.fillText("−", x - w / 2 - 4, y + size * 0.45);
  ctx.fillText(num, x, y);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y + size + 2);
  ctx.lineTo(x + w / 2, y + size + 2);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillText(den, x, y + size + 3);
}

/** Draws a number or a stacked fraction centred at x with its top at y. */
function drawTickLabel(ctx: CanvasRenderingContext2D, val: number, x: number, y: number, asFraction: boolean, size = 12) {
  const frac = asFraction ? toFraction(val) : null;
  if (!frac || frac.d === 1) {
    ctx.font = `${size}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(String(frac ? frac.n : Number(val.toFixed(6))), x, y);
    return;
  }
  drawStacked(ctx, String(Math.abs(frac.n)), String(frac.d), frac.n < 0, x, y, size);
}

/** Tick values: equal steps, or the teacher's own points (start and end are always present). */
export function numberLineTicks(obj: NumLineObj): number[] {
  if (obj.tickMode === "manual") {
    const set = new Set<number>([obj.min, obj.max]);
    for (const t of obj.ticks ?? []) if (t >= obj.min - 1e-9 && t <= obj.max + 1e-9) set.add(Number(t.toFixed(9)));
    return [...set].sort((p, q) => p - q);
  }
  const span = obj.max - obj.min || 1;
  const count = Math.max(1, Math.min(200, Math.round(span / (obj.step || 1))));
  return Array.from({ length: count + 1 }, (_, i) => obj.min + i * (obj.step || 1));
}

function renderNumberLine(ctx: CanvasRenderingContext2D, obj: NumLineObj) {
  const c = boxCenter(obj);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(obj.rot);
  // In a tall box the line sits near the top, leaving room below for labels and the difference bracket.
  ctx.translate(0, obj.h > 60 ? -obj.h / 2 + 58 : 0);

  // Ticks live inside the box with a margin so end labels and arrows are never cut off.
  const lineHalf = obj.w / 2 - 20;
  const ext = obj.arrows ? 14 : 0;
  ctx.beginPath();
  ctx.moveTo(-lineHalf - ext, 0);
  ctx.lineTo(lineHalf + ext, 0);
  ctx.stroke();

  if (obj.arrows) {
    drawArrowhead(ctx, { x: lineHalf + ext, y: 0 }, { x: lineHalf + ext - 10, y: 0 }, "open", 8);
    drawArrowhead(ctx, { x: -lineHalf - ext, y: 0 }, { x: -lineHalf - ext + 10, y: 0 }, "open", 8);
  }

  const span = obj.max - obj.min || 1;
  const xOf = (v: number) => -lineHalf + ((v - obj.min) / span) * (2 * lineHalf);
  const asFraction = obj.labels === "fraction";

  const tickVals = numberLineTicks(obj);

  ctx.fillStyle = obj.style.stroke;
  const minGap = asFraction ? 26 : 22;
  let lastLabelX = -Infinity;
  tickVals.forEach((val, i) => {
    const px = xOf(val);
    const isEnd = i === 0 || i === tickVals.length - 1;
    const half = isEnd || Math.abs(val - Math.round(val)) < 1e-9 ? 6 : 4;
    ctx.beginPath();
    ctx.moveTo(px, -half);
    ctx.lineTo(px, half);
    ctx.stroke();
    // Thin the labels out when crowded so they never overlap (the end points are always labelled).
    if (obj.showNumbers && (px - lastLabelX >= minGap || isEnd)) {
      drawTickLabel(ctx, val, px, 9, asFraction);
      lastLabelX = px;
    }
  });

  // Difference bracket under the labels
  if (obj.showDifference) {
    const x1 = xOf(obj.min);
    const x2 = xOf(obj.max);
    const y0 = asFraction ? 50 : 38;
    ctx.beginPath();
    ctx.moveTo(x1, y0 - 5);
    ctx.lineTo(x1, y0);
    ctx.lineTo(x2, y0);
    ctx.lineTo(x2, y0 - 5);
    ctx.stroke();
    const mid = (x1 + x2) / 2;
    const prefix = "difference = ";
    ctx.font = "italic 12px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(prefix, mid - 4, y0 + 9);
    ctx.textAlign = "left";
    const diff = obj.max - obj.min;
    const f = toFraction(diff);
    if (f && f.d > 1) drawStacked(ctx, String(Math.abs(f.n)), String(f.d), f.n < 0, mid + 12, y0 + 4, 12);
    else {
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(f ? String(f.n) : String(Number(diff.toFixed(6))), mid, y0 + 9);
    }
  }

  // Jumps (arcs above the line)
  ctx.font = "12px system-ui, sans-serif";
  for (const j of obj.jumps ?? []) {
    const x1 = xOf(j.from);
    const x2 = xOf(j.to);
    const lift = Math.min(46, Math.max(16, Math.abs(x2 - x1) * 0.45));
    ctx.beginPath();
    ctx.moveTo(x1, -4);
    ctx.quadraticCurveTo((x1 + x2) / 2, -4 - lift * 2, x2, -4);
    ctx.stroke();
    drawArrowhead(ctx, { x: x2, y: -4 }, { x: x2 + (x2 > x1 ? -5 : 5), y: -4 - lift * 0.6 }, "filled", 8);
    const diff = j.to - j.from;
    const text = j.label || `${diff >= 0 ? "+" : "−"}${Number(Math.abs(diff).toFixed(6))}`;
    ctx.fillStyle = obj.style.stroke;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(text, (x1 + x2) / 2, -4 - lift - 3);
  }

  // Marked points (filled = included, hollow = excluded)
  for (const m of obj.marks ?? []) {
    const px = xOf(m.v);
    ctx.beginPath();
    ctx.arc(px, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = m.open ? "#ffffff" : obj.style.stroke;
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function renderTable(ctx: CanvasRenderingContext2D, obj: TableObj) {
  const c = boxCenter(obj);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(obj.rot);

  const hw = obj.w / 2;
  const hh = obj.h / 2;
  const rows = Math.max(1, obj.rows);
  const cols = Math.max(1, obj.cols);
  const cw = obj.w / cols;
  const ch = obj.h / rows;
  const ink = obj.style.stroke;

  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const x = -hw + k * cw;
      const y = -hh + r * ch;
      const head = (obj.headerRow && r === 0) || (obj.headerCol && k === 0);
      if (head) {
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(x, y, cw, ch);
      } else if (obj.style.fill) {
        ctx.fillStyle = obj.style.fill;
        ctx.fillRect(x, y, cw, ch);
      }
      ctx.strokeRect(x, y, cw, ch);

      const text = (obj.cells[r]?.[k] ?? "").trim();
      if (!text) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 1, y + 1, cw - 2, ch - 2);
      ctx.clip();
      ctx.fillStyle = ink;
      const frac = text.match(/^(-?)(\d+)\s*\/\s*(\d+)$/);
      if (frac) {
        drawStacked(ctx, frac[2], frac[3], frac[1] === "-", x + cw / 2, y + ch / 2 - obj.size * 0.9, obj.size);
      } else {
        const face = (px: number) => `${head ? "bold " : ""}${px}px system-ui, sans-serif`;
        ctx.font = face(obj.size);
        // Shrink long text so it always fits inside its cell.
        const fitW = ctx.measureText(text).width;
        if (fitW > cw - 8) ctx.font = face(Math.max(8, (obj.size * (cw - 8)) / fitW));
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + cw / 2, y + ch / 2 + 1);
      }
      ctx.restore();
    }
  }

  ctx.restore();
}

function renderFraction(ctx: CanvasRenderingContext2D, obj: FractionObj) {
  const c = boxCenter(obj);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(obj.rot);

  const hw = obj.w / 2;
  const hh = obj.h / 2;
  const shadeColor = obj.style.fill ?? "#93c5fd";
  const rows = Math.max(1, Math.min(12, Math.round(obj.rows || 1)));
  let parts = Math.max(1, Math.min(48, Math.round(obj.parts)));
  if (obj.model === "grid") parts = rows * Math.max(1, Math.round(parts / rows));
  const shaded = Math.max(0, Math.min(parts, Math.round(obj.shaded)));

  ctx.lineJoin = "round";
  if (obj.model === "circle") {
    const r = Math.min(hw, hh);
    for (let i = 0; i < parts; i++) {
      const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / parts;
      const a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / parts;
      ctx.beginPath();
      if (parts > 1) ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a0, a1);
      if (parts > 1) ctx.closePath();
      if (i < shaded) {
        ctx.fillStyle = shadeColor;
        ctx.fill();
      }
      ctx.stroke();
    }
  } else {
    const nRows = obj.model === "bar" ? 1 : rows;
    const cols = obj.model === "bar" ? parts : parts / rows;
    const cw = obj.w / cols;
    const ch = obj.h / nRows;
    for (let i = 0; i < parts; i++) {
      const x = -hw + (i % cols) * cw;
      const y = -hh + Math.floor(i / cols) * ch;
      if (i < shaded) {
        ctx.fillStyle = shadeColor;
        ctx.fillRect(x, y, cw, ch);
      }
      ctx.strokeRect(x, y, cw, ch);
    }
  }

  if (obj.showLabel) {
    ctx.fillStyle = obj.style.stroke;
    ctx.lineWidth = 1.5;
    const size = 16;
    const w = Math.max(String(shaded).length, String(parts).length) * size * 0.6 + 6;
    const y = hh + 10;
    ctx.font = `${size}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(String(shaded), 0, y);
    ctx.beginPath();
    ctx.moveTo(-w / 2, y + size + 3);
    ctx.lineTo(w / 2, y + size + 3);
    ctx.stroke();
    ctx.fillText(String(parts), 0, y + size + 5);
  }

  ctx.restore();
}

/** Padding (scene px) kept around the drawing when the export is cropped to it. */
const CROP_PADDING = 10;

/** Pixel box (in canvas pixels) that contains everything drawn by the objects, or null for an empty drawing. */
function drawingBox(doc: Doc, scale: number): { x: number; y: number; w: number; h: number } | null {
  const probe = document.createElement("canvas");
  probe.width = Math.round(doc.w * scale);
  probe.height = Math.round(doc.h * scale);
  const pctx = probe.getContext("2d", { willReadFrequently: true })!;
  pctx.scale(scale, scale);
  for (const obj of doc.objects) renderObj(pctx, obj);
  const { data, width, height } = pctx.getImageData(0, 0, probe.width, probe.height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const pad = Math.round(CROP_PADDING * scale);
  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  return { x, y, w: Math.min(width, maxX + 1 + pad) - x, h: Math.min(height, maxY + 1 + pad) - y };
}

/**
 * High-resolution export. With `crop` (default) the image is trimmed to the drawing plus a small margin,
 * so a small figure is not saved on a large empty page.
 */
export async function renderDocToBlob(
  doc: Doc,
  grid: GridSettings,
  scale = 2,
  crop = true,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(doc.w * scale);
  canvas.height = Math.round(doc.h * scale);
  const ctx = canvas.getContext("2d")!;

  ctx.scale(scale, scale);

  // Background
  if (doc.bg === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, doc.w, doc.h);
  }

  // Optional grid on export
  if (grid.include && grid.style !== "none") {
    renderGrid(ctx, doc.w, doc.h, grid);
  }

  // Draw objects
  for (const obj of doc.objects) {
    renderObj(ctx, obj);
  }

  let out = canvas;
  const box = crop ? drawingBox(doc, scale) : null;
  if (box && (box.w < canvas.width || box.h < canvas.height)) {
    out = document.createElement("canvas");
    out.width = box.w;
    out.height = box.h;
    out.getContext("2d")!.drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  }

  return new Promise<Blob>((resolve, reject) => {
    out.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });
}
