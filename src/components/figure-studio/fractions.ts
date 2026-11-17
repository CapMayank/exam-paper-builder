/** Fraction helpers shared by the number line, tables and their inspectors. */

import type { FractionObj } from "./types";

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** Value as a fraction in lowest terms with a small denominator, or null when it is not a "nice" fraction. */
export function toFraction(val: number, maxDen = 24): { n: number; d: number } | null {
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(val * d);
    if (Math.abs(val - n / d) < 1e-9) {
      const k = gcd(n, d) || 1;
      return { n: n / k, d: d / k };
    }
  }
  return null;
}

/**
 * Reads what a teacher types: "3/4", "-1/2", "2 1/4" (mixed), "0.75", "3".
 * Returns null when the text is not a number.
 */
export function parseFraction(input: string): number | null {
  const t = input.trim().replace(/−/g, "-").replace(/÷/g, "/");
  if (!t) return null;
  let m = t.match(/^(-?)\s*(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (m) {
    const d = Number(m[4]);
    if (!d) return null;
    const v = Number(m[2]) + Number(m[3]) / d;
    return m[1] ? -v : v;
  }
  m = t.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (m) {
    const d = Number(m[2]);
    return d ? Number(m[1]) / d : null;
  }
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return Number(t);
  return null;
}

/** "3/4", "-5/2", "2" – or a rounded decimal when the value is not a simple fraction. */
export function formatFraction(val: number): string {
  const f = toFraction(val);
  if (!f) return String(Number(val.toFixed(6)));
  return f.d === 1 ? String(f.n) : `${f.n}/${f.d}`;
}

/** "2 1/4" style; falls back to formatFraction for proper fractions and integers. */
export function formatMixed(val: number): string {
  const f = toFraction(val);
  if (!f || f.d === 1 || Math.abs(f.n) < f.d) return formatFraction(val);
  const whole = Math.trunc(f.n / f.d);
  const rest = Math.abs(f.n) - Math.abs(whole) * f.d;
  return `${whole} ${rest}/${f.d}`;
}

type FractionCellSpec = Pick<FractionObj, "model" | "parts" | "rows" | "shaded" | "shadedCells">;

/** Effective part count for a fraction model (rounding grid parts to a whole multiple of rows). */
export function fractionTotalParts(obj: Pick<FractionObj, "model" | "parts" | "rows">): number {
  const rows = Math.max(1, Math.min(12, Math.round(obj.rows || 1)));
  const parts = Math.max(1, Math.min(48, Math.round(obj.parts)));
  return obj.model === "grid" ? rows * Math.max(1, Math.round(parts / rows)) : parts;
}

/**
 * Normalized 0-based shaded part indices, sorted ascending.
 * Falls back to sequential `[0..shaded-1]` when `shadedCells` is omitted.
 */
export function getShadedCells(obj: FractionCellSpec): number[] {
  const total = fractionTotalParts(obj);
  if (obj.shadedCells !== undefined) {
    const valid = new Set<number>();
    for (const idx of obj.shadedCells) {
      if (Number.isInteger(idx) && idx >= 0 && idx < total) valid.add(idx);
    }
    return Array.from(valid).sort((a, b) => a - b);
  }
  const count = Math.max(0, Math.min(total, Math.round(obj.shaded)));
  return Array.from({ length: count }, (_, i) => i);
}

/**
 * Steps the number of shaded cells to `nextCount` while preserving existing custom cell choices:
 * adds the lowest unshaded indices when growing, or drops from the end when shrinking.
 */
export function stepShadedCells(obj: FractionCellSpec, nextCount: number): number[] {
  const total = fractionTotalParts(obj);
  const target = Math.max(0, Math.min(total, Math.round(nextCount)));
  const current = getShadedCells(obj);
  if (target <= current.length) return current.slice(0, target);
  const set = new Set(current);
  for (let i = 0; i < total && set.size < target; i++) {
    set.add(i);
  }
  return Array.from(set).sort((a, b) => a - b);
}
