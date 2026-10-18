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
import { STAMP_REGISTRY } from "./stamps";
import { layoutText, setMeasurer } from "./text";
import type { AngleObj, AxesObj, BoxObj, Doc, GridSettings, LineObj, NumLineObj, Obj, PathObj, PointObj, Pt, Rect, ShapeObj, Style } from "./types";

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

function renderNumberLine(ctx: CanvasRenderingContext2D, obj: NumLineObj) {
  const c = boxCenter(obj);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(obj.rot);

  const hw = obj.w / 2;
  ctx.beginPath();
  ctx.moveTo(-hw, 0);
  ctx.lineTo(hw, 0);
  ctx.stroke();

  if (obj.arrows) {
    drawArrowhead(ctx, { x: hw, y: 0 }, { x: hw - 10, y: 0 }, "open", 8);
    drawArrowhead(ctx, { x: -hw, y: 0 }, { x: -hw + 10, y: 0 }, "open", 8);
  }

  const span = obj.max - obj.min;
  const step = obj.step || 1;
  const count = Math.round(span / step);
  const dx = obj.w / (count || 1);

  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = obj.style.stroke;

  for (let i = 0; i <= count; i++) {
    const val = obj.min + i * step;
    const px = -hw + i * dx;
    ctx.beginPath();
    ctx.moveTo(px, -5);
    ctx.lineTo(px, 5);
    ctx.stroke();
    if (obj.showNumbers) ctx.fillText(String(val), px, 8);
  }

  ctx.restore();
}

/**
 * High-resolution export renderer. Produces a 2x scale crisp PNG Blob.
 */
export async function renderDocToBlob(
  doc: Doc,
  grid: GridSettings,
  scale = 2,
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

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });
}
