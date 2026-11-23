"use client";

import { useState, type ReactNode } from "react";
import { getPrintable, gridWeight, schoolFontSize, type PrintableId, type PrintableOptions } from "@/lib/printables";

/**
 * One printable as a single A4 page, drawn in SVG with millimetre units so grids print true to size.
 * `preview` makes it fill its container (keeping the A4 ratio) instead of being exactly 210 × 297 mm.
 */

type Box = { x: number; y: number; w: number; h: number };
const MARGIN = 12;
const HEADER_H = 27;
const FOOT_H = 7;
const FONT = "var(--font-noto), var(--font-deva), 'Noto Sans', 'Nirmala UI', sans-serif";
const FINE = "#a3a3a3";
const MID = "#6b6b6b";
const INK = "#111";

export function sheetSize(id: PrintableId): { w: number; h: number } {
  return getPrintable(id)?.landscape ? { w: 297, h: 210 } : { w: 210, h: 297 };
}

export function PrintableSheet({
  id,
  opts,
  school,
  subtitle,
  preview = false,
}: {
  id: PrintableId;
  opts: PrintableOptions;
  school: string;
  subtitle: string;
  preview?: boolean;
}) {
  const p = getPrintable(id);
  const { w: W, h: H } = sheetSize(id);
  const body: Box = { x: MARGIN, y: MARGIN + HEADER_H + 3, w: W - 2 * MARGIN, h: H - MARGIN - HEADER_H - 3 - MARGIN - FOOT_H };
  const credit = p?.map?.credit;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      width={preview ? "100%" : `${W}mm`}
      height={preview ? undefined : `${H}mm`}
      style={{ display: "block", background: "#fff", fontFamily: FONT, aspectRatio: `${W} / ${H}` }}
      role="img"
      aria-label={`${p?.title ?? "Printable"} for ${school}`}
    >
      <Header W={W} school={school} subtitle={subtitle} />
      <Body id={id} opts={opts} box={body} />
      {credit && (
        <text x={MARGIN} y={H - MARGIN + 1} fontSize={2.3} fill={MID}>
          {credit}
        </text>
      )}
    </svg>
  );
}

function fitFont(text: string, width: number, max: number): number {
  // ~0.55 em per character for Noto Sans semibold; shrink long names so they never run off the page.
  return Math.min(max, width / Math.max(1, text.length * 0.55));
}

function Header({ W, school, subtitle }: { W: number; school: string; subtitle: string }) {
  const y0 = MARGIN;
  const inner = W - 2 * MARGIN;
  const nameSize = schoolFontSize(school, inner, 6);
  const rowY = y0 + 13;
  const boxH = 10;
  const rollW = 46;
  const qW = 24;
  const labelSize = 3.4;
  const qx = W - MARGIN - qW;
  return (
    <g>
      <text x={W / 2} y={y0 + 6} fontSize={nameSize} fontWeight={700} textAnchor="middle" fill={INK}>
        {school}
      </text>
      {/* Roll number: label then box, left */}
      <text x={MARGIN} y={rowY + boxH / 2 + labelSize / 3} fontSize={labelSize} fontWeight={600} fill={INK}>
        Roll No.
      </text>
      <rect x={MARGIN + 15} y={rowY} width={rollW} height={boxH} fill="none" stroke={INK} strokeWidth={0.4} />
      {/* Question number: label then box, right */}
      <text x={qx - 2} y={rowY + boxH / 2 + labelSize / 3} fontSize={labelSize} fontWeight={600} textAnchor="end" fill={INK}>
        Q. No.
      </text>
      <rect x={qx} y={rowY} width={qW} height={boxH} fill="none" stroke={INK} strokeWidth={0.4} />
      {subtitle.trim() && (
        <text
          x={(MARGIN + 15 + rollW + qx - 14) / 2}
          y={rowY + boxH / 2 + 1.2}
          fontSize={fitFont(subtitle, qx - 14 - (MARGIN + 15 + rollW) - 6, 3.6)}
          textAnchor="middle"
          fill={INK}
        >
          {subtitle}
        </text>
      )}
      <line x1={MARGIN} x2={W - MARGIN} y1={y0 + HEADER_H} y2={y0 + HEADER_H} stroke={INK} strokeWidth={0.35} />
    </g>
  );
}

function Body({ id, opts, box }: { id: PrintableId; opts: PrintableOptions; box: Box }) {
  const p = getPrintable(id);
  if (p?.map) return <MapBody file={p.map.file} box={box} />;
  switch (id) {
    case "graph":
      return <Graph box={box} size={Number(opts.size)} />;
    case "axes":
      return <Axes box={box} corner={opts.origin === "corner"} />;
    case "square-grid":
      return <SquareGrid box={box} size={Number(opts.size)} />;
    case "dot-grid":
      return <Dots box={box} size={Number(opts.size)} />;
    case "isometric":
      return <Isometric box={box} size={Number(opts.size)} />;
    case "number-lines":
      return <NumberLines box={box} from={Number(opts.from)} to={Number(opts.to)} lines={Number(opts.lines)} numbers={opts.numbers === "yes"} />;
    case "diagram":
      return <Diagram box={box} lines={Number(opts.lines)} />;
    case "practical":
      return <Practical box={box} table={opts.table === "yes"} />;
    case "ruled":
      return <Ruled box={box} spacing={Number(opts.spacing)} margin={opts.margin === "yes"} />;
    case "four-line":
      return <FourLine box={box} size={String(opts.size)} />;
    default:
      return null;
  }
}

/** Shrink a box to a whole number of `step` cells, centred. */
function snap(box: Box, step: number): Box {
  const w = Math.floor(box.w / step) * step;
  const h = Math.floor(box.h / step) * step;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

/** Every grid line of a snapped box as one path per weight: one element instead of hundreds per sheet. */
function gridPath(b: Box, step: number, keep: (i: number) => boolean): string {
  const d: string[] = [];
  const nx = Math.round(b.w / step);
  const ny = Math.round(b.h / step);
  for (let i = 0; i <= nx; i++) if (keep(i)) d.push(`M${(b.x + i * step).toFixed(2)} ${b.y.toFixed(2)}v${b.h.toFixed(2)}`);
  for (let j = 0; j <= ny; j++) if (keep(j)) d.push(`M${b.x.toFixed(2)} ${(b.y + j * step).toFixed(2)}h${b.w.toFixed(2)}`);
  return d.join("");
}

/** Dots as zero-length round-capped segments in a single path. */
function dotPath(points: Array<[number, number]>): string {
  return points.map(([x, y]) => `M${x.toFixed(2)} ${y.toFixed(2)}h0`).join("");
}

const DOT = { stroke: INK, strokeWidth: 0.8, strokeLinecap: "round" as const, fill: "none" };

/** Fine / 5 mm / 1 cm weights, drawn fine first so the bold lines sit on top. */
function graphLayers(b: Box, size: number) {
  return (
    <g fill="none">
      <path d={gridPath(b, size, (i) => gridWeight(i, size) === "fine")} stroke={FINE} strokeWidth={0.1} />
      <path d={gridPath(b, size, (i) => gridWeight(i, size) === "mid")} stroke={MID} strokeWidth={0.18} />
      <path d={gridPath(b, size, (i) => gridWeight(i, size) === "bold")} stroke={INK} strokeWidth={0.3} />
    </g>
  );
}

function Graph({ box, size }: { box: Box; size: number }) {
  return graphLayers(snap(box, 10), size);
}

function Axes({ box, corner }: { box: Box; corner: boolean }) {
  const b = snap(box, 10);
  const ox = corner ? b.x + 10 : b.x + Math.round(b.w / 20) * 10;
  const oy = corner ? b.y + b.h - 10 : b.y + Math.round(b.h / 20) * 10;
  const a = 2.2;
  const label = { fontSize: 3.6, fontWeight: 700, fill: INK } as const;
  return (
    <g>
      {graphLayers(b, 1)}
      <g stroke={INK} strokeWidth={0.55} fill={INK}>
        <line x1={corner ? ox : b.x} x2={b.x + b.w} y1={oy} y2={oy} />
        <line x1={ox} x2={ox} y1={b.y} y2={corner ? oy : b.y + b.h} />
        <path d={`M${b.x + b.w} ${oy} l${-a} ${-a / 2} v${a} z`} />
        <path d={`M${ox} ${b.y} l${-a / 2} ${a} h${a} z`} />
        {!corner && <path d={`M${b.x} ${oy} l${a} ${-a / 2} v${a} z`} />}
        {!corner && <path d={`M${ox} ${b.y + b.h} l${-a / 2} ${-a} h${a} z`} />}
      </g>
      <g style={{ paintOrder: "stroke" }} stroke="#fff" strokeWidth={0.8}>
        <text x={b.x + b.w - 4} y={oy - 2} {...label}>X</text>
        <text x={ox + 1.5} y={b.y + 4} {...label}>Y</text>
        <text x={ox - 4} y={oy + 4.2} {...label}>O</text>
        {!corner && <text x={b.x + 1} y={oy - 2} {...label}>X′</text>}
        {!corner && <text x={ox + 1.5} y={b.y + b.h - 2} {...label}>Y′</text>}
      </g>
    </g>
  );
}

function SquareGrid({ box, size }: { box: Box; size: number }) {
  return <path d={gridPath(snap(box, size), size, () => true)} stroke={MID} strokeWidth={0.2} fill="none" />;
}

function Dots({ box, size }: { box: Box; size: number }) {
  const b = snap(box, size);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= Math.round(b.w / size); i++) for (let j = 0; j <= Math.round(b.h / size); j++) pts.push([b.x + i * size, b.y + j * size]);
  return <path d={dotPath(pts)} {...DOT} />;
}

function Isometric({ box, size }: { box: Box; size: number }) {
  const rowH = size * Math.sin(Math.PI / 3);
  const rows = Math.floor(box.h / rowH);
  const cols = Math.floor((box.w - size / 2) / size);
  const x0 = box.x + (box.w - (cols * size + size / 2)) / 2;
  const y0 = box.y + (box.h - rows * rowH) / 2;
  const pts: Array<[number, number]> = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) pts.push([x0 + i * size + (j % 2 ? size / 2 : 0), y0 + j * rowH]);
  return <path d={dotPath(pts)} {...DOT} />;
}

function NumberLines({ box, from, to, lines, numbers }: { box: Box; from: number; to: number; lines: number; numbers: boolean }) {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to) === lo ? lo + 10 : Math.max(from, to);
  const ticks = hi - lo;
  const x0 = box.x + 6;
  const x1 = box.x + box.w - 6;
  const step = (x1 - x0) / ticks;
  // Label every tick when there is room, else every 5th / 10th.
  const every = step >= 6 ? 1 : step >= 2.4 ? 5 : 10;
  const gap = box.h / lines;
  const out: ReactNode[] = [];
  for (let n = 0; n < lines; n++) {
    const y = box.y + gap * (n + 0.5);
    out.push(
      <g key={n} stroke={INK} fill={INK}>
        <line x1={box.x} x2={box.x + box.w} y1={y} y2={y} strokeWidth={0.4} />
        <path d={`M${box.x} ${y} l2.4 -1.2 v2.4 z`} strokeWidth={0} />
        <path d={`M${box.x + box.w} ${y} l-2.4 -1.2 v2.4 z`} strokeWidth={0} />
        {Array.from({ length: ticks + 1 }, (_, k) => {
          const v = lo + k;
          const major = v % every === 0;
          if (!major && step < 1.2) return null;
          const x = x0 + k * step;
          return (
            <g key={k}>
              <line x1={x} x2={x} y1={y - (major ? 2 : 1.2)} y2={y + (major ? 2 : 1.2)} strokeWidth={major ? 0.35 : 0.2} />
              {numbers && major && (
                <text x={x} y={y + 6} fontSize={3} textAnchor="middle" strokeWidth={0}>
                  {v < 0 ? `−${-v}` : v}
                </text>
              )}
            </g>
          );
        })}
      </g>,
    );
  }
  return <g>{out}</g>;
}

function writingLines(x: number, w: number, y0: number, y1: number, spacing: number, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  for (let y = y0 + spacing, i = 0; y <= y1 + 0.01; y += spacing, i++)
    out.push(<line key={`${keyPrefix}${i}`} x1={x} x2={x + w} y1={y} y2={y} stroke={MID} strokeWidth={0.2} />);
  return out;
}

function Diagram({ box, lines }: { box: Box; lines: number }) {
  const spacing = 9;
  const linesH = lines ? lines * spacing + 4 : 0;
  const boxH = box.h - linesH;
  return (
    <g>
      <rect x={box.x} y={box.y} width={box.w} height={boxH} fill="none" stroke={INK} strokeWidth={0.4} />
      <text x={box.x + 2} y={box.y + 4.5} fontSize={3} fill={MID}>Diagram</text>
      {lines > 0 && writingLines(box.x, box.w, box.y + boxH + 4, box.y + box.h, spacing, "l")}
    </g>
  );
}

function Practical({ box, table }: { box: Box; table: boolean }) {
  const s = 8;
  const head = { fontSize: 3.4, fontWeight: 700, fill: INK } as const;
  let y = box.y + 5;
  const parts: ReactNode[] = [];
  const heading = (label: string) => {
    parts.push(<text key={`t-${label}`} x={box.x} y={y} {...head}>{label}</text>);
  };
  const lines = (n: number, key: string) => {
    parts.push(...writingLines(box.x, box.w, y - s + 3, y + (n - 1) * s + 3, s, key));
    y += n * s + 4;
  };
  parts.push(
    <text key="exp" x={box.x} y={y} {...head}>
      Experiment No. ________
    </text>,
    <text key="date" x={box.x + box.w} y={y} textAnchor="end" {...head}>
      Date ____________
    </text>,
  );
  y += 9;
  heading("Aim:");
  lines(2, "aim");
  heading("Apparatus / Materials required:");
  lines(2, "app");
  heading("Diagram:");
  const dH = table ? 62 : 80;
  parts.push(<rect key="d" x={box.x} y={y + 2} width={box.w} height={dH} fill="none" stroke={INK} strokeWidth={0.4} />);
  y += dH + 9;
  if (table) {
    heading("Observations:");
    const cols = 5;
    const rows = 6;
    const rH = 7;
    const ty = y + 2;
    for (let r = 0; r <= rows; r++)
      parts.push(<line key={`tr${r}`} x1={box.x} x2={box.x + box.w} y1={ty + r * rH} y2={ty + r * rH} stroke={INK} strokeWidth={r === 1 ? 0.4 : 0.25} />);
    for (let c = 0; c <= cols; c++)
      parts.push(<line key={`tc${c}`} x1={box.x + (c * box.w) / cols} x2={box.x + (c * box.w) / cols} y1={ty} y2={ty + rows * rH} stroke={INK} strokeWidth={0.25} />);
    parts.push(<text key="sno" x={box.x + box.w / cols / 2} y={ty + 4.8} fontSize={3} textAnchor="middle" fill={INK}>S. No.</text>);
    y = ty + rows * rH + 7;
  }
  heading("Result / Conclusion:");
  const left = Math.max(1, Math.floor((box.y + box.h - y) / s));
  lines(left, "res");
  return <g>{parts}</g>;
}

function Ruled({ box, spacing, margin }: { box: Box; spacing: number; margin: boolean }) {
  return (
    <g>
      {writingLines(box.x, box.w, box.y, box.y + box.h, spacing, "r")}
      {margin && <line x1={box.x + 22} x2={box.x + 22} y1={box.y} y2={box.y + box.h} stroke={MID} strokeWidth={0.3} />}
    </g>
  );
}

const FOUR_LINE: Record<string, number> = { large: 5, medium: 4, small: 3 };

function FourLine({ box, size }: { box: Box; size: string }) {
  const g = FOUR_LINE[size] ?? 5;
  const set = 3 * g;
  const gap = g * 1.8;
  const n = Math.floor((box.h + gap) / (set + gap));
  const out: ReactNode[] = [];
  for (let k = 0; k < n; k++) {
    const y = box.y + k * (set + gap);
    [0, 1, 2, 3].forEach((i) =>
      out.push(
        <line
          key={`${k}-${i}`}
          x1={box.x}
          x2={box.x + box.w}
          y1={y + i * g}
          y2={y + i * g}
          stroke={i === 2 ? INK : MID}
          strokeWidth={i === 2 ? 0.35 : 0.2}
          strokeDasharray={i === 1 ? "1.2 1" : undefined}
        />,
      ),
    );
  }
  return <g>{out}</g>;
}

function MapBody({ file, box }: { file: string; box: Box }) {
  const [failed, setFailed] = useState(false);
  const inset = 3;
  return (
    <g>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke={INK} strokeWidth={0.4} />
      {failed ? (
        <text x={box.x + box.w / 2} y={box.y + box.h / 2} fontSize={4} textAnchor="middle" fill={MID}>
          Map could not be loaded
        </text>
      ) : (
        <image
          href={file}
          x={box.x + inset}
          y={box.y + inset}
          width={box.w - 2 * inset}
          height={box.h - 2 * inset}
          preserveAspectRatio="xMidYMid meet"
          onError={() => setFailed(true)}
        />
      )}
      {/* North arrow */}
      <g transform={`translate(${box.x + box.w - 9} ${box.y + 5})`} fill={INK}>
        <path d="M0 0 l2.6 8 l-2.6 -2 l-2.6 2 z" />
        <text x={0} y={12.5} fontSize={3.4} fontWeight={700} textAnchor="middle">N</text>
      </g>
    </g>
  );
}
