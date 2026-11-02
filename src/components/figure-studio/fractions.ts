/** Fraction helpers shared by the number line, tables and their inspectors. */

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
