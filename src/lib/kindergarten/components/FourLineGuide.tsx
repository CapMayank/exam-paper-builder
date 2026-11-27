import React from "react";
import type { RulingType, TraceWriteLineItem } from "../types";

/*
 * Handwriting rulings for pre-primary sheets, drawn as SVG so the printed letters sit exactly on the lines.
 *
 * Every row is its own <svg> with a fixed viewBox width; it scales with the page, so lines and letters
 * scale together and the fit never drifts. The line heights come from the font's own letter heights:
 *
 *   4-line (Andika, bold)       2-line Hindi (Noto Sans Devanagari)
 *   ── red   top   (capitals)   ── top    (shirorekha hangs here)
 *   - - blue mid   (x-height)       letters
 *   ── blue  base  (baseline)   ── bottom (baseline)
 *   ── red   bottom (g p y tails)
 *
 * The model row shows the letters (dotted when they are for tracing); the rows after it are empty
 * copies of the same ruling; each row is closed at both ends with a small gap so it reads as its own line.
 */

const VIEW_W = 640;
/** fontSizePt -> font size in viewBox units. 24 pt gives a ~7.5 mm tall 4-line ruling on A4 (notebook size). */
const pxPerPt = (4 / 3) * 0.85;
const SIDE_PAD = 0.32; // em, left margin before the first letter

// Letter heights in em, measured in Chromium (Andika 700 / Noto Sans Devanagari 600).
const LATIN = { cap: 0.74, x: 0.5, desc: 0.24, avgUpper: 0.7, avgLower: 0.56, space: 0.27 };
const DEVA = { head: 0.72, above: 0.34, below: 0.26, avg: 0.62 }; // above/below: just room for matras

const KID_FONT = "var(--font-kid), Andika, 'Comic Sans MS', 'Century Gothic', sans-serif";
const DEVA_FONT = "var(--font-deva), 'Noto Sans Devanagari', 'Mangal', sans-serif";

const RED = "#e11d48";
const BLUE = "#2563eb";
const INK = "#0f172a";

const isDevanagari = (s: string) => /[ऀ-ॿ]/.test(s);

/** Rough rendered width in em – enough to decide where a long line wraps onto a second model row. */
function textWidthEm(text: string, tracking: number): number {
  let w = 0;
  for (const ch of text) {
    if (/\s/.test(ch)) w += LATIN.space;
    else if (/[ऀ-ॿ]/.test(ch)) w += /[ा-्ँ-ः]/.test(ch) ? 0.15 : DEVA.avg;
    else if (/[A-Z0-9]/.test(ch)) w += /[MW]/.test(ch) ? 0.92 : /[IJ1]/.test(ch) ? 0.4 : LATIN.avgUpper;
    else if (/[mw]/.test(ch)) w += 0.84;
    else if (/[ijlft]/.test(ch)) w += 0.34;
    else w += LATIN.avgLower;
    w += tracking;
  }
  return w;
}

/** Split text into rows that fit across the page, breaking only at spaces (spacing is kept). */
export function wrapForRuling(text: string, fontSizePt: number, tracking = 0.08): string[] {
  const maxEm = (VIEW_W - 2) / (fontSizePt * pxPerPt) - SIDE_PAD * 2;
  const parts = text.trim().split(/(\s+)/);
  const rows: string[] = [];
  let cur = "";
  for (let i = 0; i < parts.length; i += 2) {
    const word = parts[i];
    const gap = i > 0 ? parts[i - 1] : "";
    const next = cur ? cur + gap + word : word;
    if (cur && textWidthEm(next, tracking) > maxEm) {
      rows.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) rows.push(cur);
  return rows;
}

function splitGraphemes(text: string): string[] {
  const clean = text.replace(/\s+/g, "");
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(seg.segment(clean), (s) => s.segment);
  }
  return Array.from(clean);
}

/** Letters drawn solid (copy) or as a dotted outline on a pale fill (trace). */
function Letters({ text, x, y, size, dotted, deva, anchor = "start", tracking = 0.08 }: {
  text: string;
  x: number;
  y: number;
  size: number;
  dotted: boolean;
  deva: boolean;
  anchor?: "start" | "middle";
  tracking?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={size}
      fontWeight={deva ? 600 : 700}
      letterSpacing={anchor === "start" ? size * tracking : undefined}
      style={{ fontFamily: deva ? DEVA_FONT : KID_FONT, whiteSpace: "pre" }}
      // Tracing letters print pale grey for the child to go over. A dotted outline was tried, but at
      // notebook size (~7.5 mm rows) the dots blur into noise, in Latin and Devanagari alike.
      fill={dotted ? "#bcc5d2" : INK}
    >
      {text}
    </text>
  );
}

interface RowProps {
  rulingType: RulingType;
  size: number;
  text?: string;
  dotted?: boolean;
  deva: boolean;
  label: string;
}

/** One ruled writing row (4-line, 2-line or single line), boxed, with optional model letters on it. */
function RuledRow({ rulingType, size: F, text, dotted = false, deva, label }: RowProps) {
  let height: number;
  let base: number;
  let lines: React.ReactNode;
  const X0 = 1;
  const span = VIEW_W - X0 - 1;

  if (rulingType === "TWO_LINE") {
    const top = DEVA.above * F;
    base = top + DEVA.head * F;
    height = base + DEVA.below * F;
    lines = (
      <>
        <line x1={X0} x2={X0 + span} y1={top} y2={top} stroke={INK} strokeWidth={1.3} />
        <line x1={X0} x2={X0 + span} y1={base} y2={base} stroke={INK} strokeWidth={1.3} />
        <line x1={X0} x2={X0} y1={top} y2={base} stroke={INK} strokeWidth={1.3} />
        <line x1={X0 + span} x2={X0 + span} y1={top} y2={base} stroke={INK} strokeWidth={1.3} />
      </>
    );
  } else if (rulingType === "SINGLE_LINE") {
    const capTop = 0.18 * F;
    base = capTop + (deva ? DEVA.head + 0.12 : LATIN.cap) * F;
    height = base + (deva ? DEVA.below : LATIN.desc + 0.06) * F;
    lines = <line x1={X0} x2={X0 + span} y1={base} y2={base} stroke={INK} strokeWidth={1.3} />;
  } else {
    const top = 1;
    base = top + LATIN.cap * F;
    const mid = base - LATIN.x * F;
    const bottom = base + LATIN.desc * F;
    height = bottom + 1;
    lines = (
      <>
        <line x1={X0} x2={X0 + span} y1={top} y2={top} stroke={RED} strokeWidth={1.1} />
        <line x1={X0} x2={X0 + span} y1={mid} y2={mid} stroke={BLUE} strokeWidth={0.7} strokeDasharray="4 3" />
        <line x1={X0} x2={X0 + span} y1={base} y2={base} stroke={BLUE} strokeWidth={1.3} />
        <line x1={X0} x2={X0 + span} y1={bottom} y2={bottom} stroke={RED} strokeWidth={1.1} />
        {/* closed ends make each row a box of its own */}
        <line x1={X0} x2={X0} y1={top} y2={bottom} stroke={RED} strokeWidth={1.1} />
        <line x1={X0 + span} x2={X0 + span} y1={top} y2={bottom} stroke={RED} strokeWidth={1.1} />
      </>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${height.toFixed(1)}`}
      width="100%"
      className="block"
      role="img"
      aria-label={label}
      data-ruling-row={rulingType}
    >
      {lines}
      {text && <Letters text={text} x={X0 + SIDE_PAD * F} y={base} size={F} dotted={dotted} deva={deva} />}
    </svg>
  );
}

/** Write-in boxes: the model letters in boxes, then rows of empty boxes – one row per line. */
function BoxRows({ text, size: F, dotted, rows }: { text: string; size: number; dotted: boolean; rows: number }) {
  const letters = splitGraphemes(text);
  const deva = isDevanagari(text);
  const S = Math.round(F * 1.3);
  const GAP = Math.round(F * 0.22);
  const perRow = Math.max(1, Math.floor((VIEW_W + GAP) / (S + GAP)));
  const count = Math.max(1, letters.length);
  const chunks: number[][] = [];
  for (let i = 0; i < count; i += perRow) chunks.push(Array.from({ length: Math.min(perRow, count - i) }, (_, k) => i + k));
  // letters sit with the caps (or the shirorekha) centred in the box
  const textY = S / 2 + (deva ? DEVA.head : LATIN.cap) * F * 0.5;

  const renderRow = (model: boolean, key: string) =>
    chunks.map((idx, c) => (
      <svg key={`${key}-${c}`} viewBox={`0 0 ${VIEW_W} ${S + 4}`} width="100%" className="block" role="img" aria-label={model ? `Letters: ${text}` : "Empty boxes to write in"}>
        {idx.map((li, k) => {
          const x = 2 + k * (S + GAP);
          return (
            <g key={li}>
              <rect x={x} y={2} width={S} height={S} rx={S * 0.14} fill="#fff" stroke={model ? INK : "#64748b"} strokeWidth={model ? 2 : 1.6} />
              {model && letters[li] && (
                <Letters text={letters[li]} x={x + S / 2} y={2 + textY} size={F} dotted={dotted} deva={deva} anchor="middle" />
              )}
            </g>
          );
        })}
      </svg>
    ));

  return (
    <div className="space-y-2.5">
      {text.trim() && <div className="space-y-2.5">{renderRow(true, "model")}</div>}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="space-y-2.5">
          {renderRow(false, `blank-${r}`)}
        </div>
      ))}
    </div>
  );
}

/** Letter size in pt for a ruling. Devanagari hangs from its headline, so its 2-line band is the
 *  shirorekha-to-baseline height only; it gets 25% more so it matches a Hindi notebook (~7 mm). */
function rulingPt(rulingType: RulingType, fontSizePt: number): number {
  const pt = Math.max(14, Math.min(48, Number(fontSizePt) || 24));
  return rulingType === "TWO_LINE" ? pt * 1.25 : pt;
}

/** How many empty practice rows follow the model row. Solid (copy) letters always get at least one. */
export function practiceRowCount(line: Pick<TraceWriteLineItem, "promptText" | "traceDotted" | "repeatCount">): number {
  const total = Math.max(1, Math.round(Number(line.repeatCount) || 1));
  if (!line.promptText?.trim()) return total;
  return Math.max(total - 1, line.traceDotted ? 0 : 1);
}

interface FourLineGuideProps {
  rulingType?: RulingType;
  promptText?: string;
  traceDotted?: boolean;
  repeatCount?: number;
  fontSizePt?: number;
  className?: string;
}

/** One line item: model letters on the chosen ruling, then empty rows to copy into. */
export function FourLineGuide({
  rulingType = "FOUR_LINE",
  promptText = "",
  traceDotted = false,
  repeatCount = 1,
  fontSizePt = 24,
  className = "",
}: FourLineGuideProps) {
  const size = rulingPt(rulingType, fontSizePt) * pxPerPt;
  const practice = practiceRowCount({ promptText, traceDotted, repeatCount });

  if (rulingType === "BOXES") {
    return (
      <div className={className}>
        <BoxRows text={promptText} size={size} dotted={traceDotted} rows={practice} />
      </div>
    );
  }

  const deva = isDevanagari(promptText);
  const modelRows = promptText.trim() ? wrapForRuling(promptText, size / pxPerPt) : [];
  const kind = rulingType === "TWO_LINE" ? "2-line" : rulingType === "SINGLE_LINE" ? "single line" : "4-line";

  return (
    <div className={`${rulingType === "TWO_LINE" ? "space-y-0.5" : "space-y-2"} ${className}`}>
      {modelRows.map((t, i) => (
        <RuledRow
          key={`m${i}`}
          rulingType={rulingType}
          size={size}
          text={t}
          dotted={traceDotted}
          deva={deva}
          label={`${kind} row: ${t}`}
        />
      ))}
      {Array.from({ length: practice }).map((_, i) => {
        return <RuledRow key={`p${i}`} rulingType={rulingType} size={size} deva={deva} label={`Empty ${kind} row to write in`} />;
      })}
    </div>
  );
}

/** Every line item of a trace & write activity, in order (imported papers can carry several). */
export function TraceWriteLines({ rulingType, fontSizePt, lines }: { rulingType: RulingType; fontSizePt: number; lines: TraceWriteLineItem[] }) {
  const items = lines.length ? lines : [{ promptText: "", traceDotted: false, repeatCount: 2 }];
  return (
    <div className="my-2 space-y-2">
      {items.map((l, i) => (
        <FourLineGuide
          key={i}
          rulingType={rulingType}
          promptText={l.promptText}
          traceDotted={l.traceDotted}
          repeatCount={l.repeatCount}
          fontSizePt={fontSizePt}
        />
      ))}
    </div>
  );
}
