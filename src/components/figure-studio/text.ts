import type { FontKey } from "./types";

/**
 * Font stacks + text measurement. DOM-free by default (so geometry runs in node);
 * render.ts installs a canvas-based measurer in the browser.
 */

type Measurer = (css: string, text: string) => number;
let measurer: Measurer | null = null;
const widthCache = new Map<string, number>();

export function setMeasurer(m: Measurer | null) {
  measurer = m;
  widthCache.clear();
}

let resolved: Record<FontKey, string> | null = null;

/** next/font hashes family names, so read the real stacks from the CSS variables set on <html>. */
function cssVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function resetFontStacks() {
  resolved = null;
  widthCache.clear();
}

export function fontStack(key: FontKey): string {
  if (!resolved) {
    const ui = cssVar("--font-ui");
    const heading = cssVar("--font-heading");
    const deva = cssVar("--font-deva");
    const noto = cssVar("--font-noto");
    if (typeof document === "undefined" || !ui) {
      // Not ready (or no DOM): safe fallback, and don't cache so we retry later.
      const sans = '"Segoe UI", system-ui, "Noto Sans Devanagari", "Nirmala UI", sans-serif';
      return key === "mono"
        ? 'ui-monospace, Consolas, "Courier New", monospace'
        : key === "sans"
          ? sans
          : 'Georgia, "Times New Roman", "Noto Sans Devanagari", "Nirmala UI", serif';
    }
    const d = [deva, noto].filter(Boolean).join(", ");
    resolved = {
      sans: [ui, d, "system-ui", '"Segoe UI"', "sans-serif"].filter(Boolean).join(", "),
      serif: [heading, 'Georgia', '"Times New Roman"', d, "serif"].filter(Boolean).join(", "),
      mono: ['ui-monospace', "Consolas", '"Courier New"', d, "monospace"].filter(Boolean).join(", "),
      math: [heading, '"Cambria Math"', "Georgia", '"Times New Roman"', d, "serif"].filter(Boolean).join(", "),
    };
  }
  return resolved[key];
}

export function fontCss(key: FontKey, size: number, bold: boolean, italic: boolean): string {
  const it = italic || key === "math";
  return `${it ? "italic " : ""}${bold ? "700 " : "400 "}${size}px ${fontStack(key)}`;
}

function fallbackWidth(css: string, text: string): number {
  const m = /(\d+(?:\.\d+)?)px/.exec(css);
  const size = m ? Number(m[1]) : 16;
  let w = 0;
  for (const ch of text) w += (ch.charCodeAt(0) < 128 ? 0.55 : 0.95) * size;
  return w;
}

export function measureWidth(css: string, text: string): number {
  if (!text) return 0;
  const key = css + "|" + text;
  const hit = widthCache.get(key);
  if (hit !== undefined) return hit;
  const w = (measurer ?? fallbackWidth)(css, text);
  if (widthCache.size > 6000) widthCache.clear();
  widthCache.set(key, w);
  return w;
}

export interface TextSpec {
  text: string;
  font: FontKey;
  size: number;
  bold: boolean;
  italic: boolean;
}
export interface TextLayout {
  lines: string[];
  widths: number[];
  lineH: number;
  w: number;
  h: number;
  pad: number;
  css: string;
}

export const TEXT_PAD = 4;

export function layoutText(t: TextSpec): TextLayout {
  const css = fontCss(t.font, t.size, t.bold, t.italic);
  const lines = t.text.split("\n");
  const widths = lines.map((l) => measureWidth(css, l));
  const lineH = t.size * 1.3;
  const w = Math.max(...widths, t.size * 0.5) + TEXT_PAD * 2;
  const h = lines.length * lineH + TEXT_PAD * 2;
  return { lines, widths, lineH, w, h, pad: TEXT_PAD, css };
}
