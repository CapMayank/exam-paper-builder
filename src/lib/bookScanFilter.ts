export type ScanFilterMode = "bw" | "grayscale" | "original";

/**
 * Scales dimensions proportionally so neither width nor height exceeds `maxEdge`.
 */
export function computeFitDimensions(
  srcW: number,
  srcH: number,
  maxEdge: number,
): { width: number; height: number } {
  if (srcW <= 0 || srcH <= 0) return { width: 1, height: 1 };
  const longest = Math.max(srcW, srcH);
  if (longest <= maxEdge) return { width: srcW, height: srcH };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  };
}

/**
 * Applies a print-ready book-scan cleanup filter to RGBA pixel data.
 * - "original": returns a copy untouched.
 * - "grayscale": high-contrast luminance grayscale.
 * - "bw": local background normalization (integral image) + smooth threshold
 *   so shadowed grey book paper becomes pure #FFFFFF and diagram ink stays dark.
 */
export function applyBookScanFilter(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  mode: ScanFilterMode,
  clarity: number = 0.5,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data);
  if (mode === "original" || width <= 0 || height <= 0) return out;

  const n = width * height;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    lum[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }

  if (mode === "grayscale") {
    // Gentle contrast stretch around mid-tones
    const contrast = 1.15 + clarity * 0.4;
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, Math.min(255, Math.round((lum[i] - 128) * contrast + 135)));
      const p = i * 4;
      out[p] = v;
      out[p + 1] = v;
      out[p + 2] = v;
    }
    return out;
  }

  // "bw": build summed-area table (integral image) for O(W*H) local background estimation
  const stride = width + 1;
  const sat = new Float64Array((height + 1) * stride);
  for (let y = 1; y <= height; y++) {
    let rowSum = 0;
    const lumRow = (y - 1) * width;
    const satRow = y * stride;
    const prevSatRow = (y - 1) * stride;
    for (let x = 1; x <= width; x++) {
      rowSum += lum[lumRow + x - 1];
      sat[satRow + x] = sat[prevSatRow + x] + rowSum;
    }
  }

  const radius = Math.max(6, Math.min(48, Math.round(Math.min(width, height) * 0.06)));
  // Higher clarity keeps more faint ink (raises whiteRatio so only pixels close to paper brightness snap to white)
  const clampedClarity = Math.max(0, Math.min(1, clarity));
  const whiteRatio = 0.8 + clampedClarity * 0.14; // 0.80 .. 0.94
  const blackRatio = 0.42 + clampedClarity * 0.14; // 0.42 .. 0.56

  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      const count = (y1 - y0 + 1) * (x1 - x0 + 1);
      const sum =
        sat[(y1 + 1) * stride + (x1 + 1)] -
        sat[y0 * stride + (x1 + 1)] -
        sat[(y1 + 1) * stride + x0] +
        sat[y0 * stride + x0];
      const localMean = sum / count;
      const idx = y * width + x;
      const ratio = localMean > 1 ? lum[idx] / localMean : 1;

      let v: number;
      if (lum[idx] < 50) {
        // Absolute dark-ink floor prevents large solid dark shapes from hollowing out
        v = 15;
      } else if (ratio >= whiteRatio) {
        v = 255;
      } else if (ratio <= blackRatio) {
        v = 15;
      } else {
        const t = (ratio - blackRatio) / (whiteRatio - blackRatio);
        v = Math.round(15 + t * t * (255 - 15));
      }

      const p = idx * 4;
      out[p] = v;
      out[p + 1] = v;
      out[p + 2] = v;
    }
  }

  return out;
}

/** Largest tilt auto-straighten looks for, in degrees either way. */
export const MAX_DESKEW_DEGREES = 15;

/**
 * Finds how far a photographed page is tilted, from the ink's lines (text rows, ruled lines, diagram edges).
 * Returns the angle in degrees to pass to a canvas rotation (positive = clockwise) to level them, or 0 when
 * the page already looks level or there is too little ink to tell.
 *
 * Method: clean the image to black-and-white, then try every angle in range and keep the one where the ink,
 * projected onto rows, piles up into the sharpest peaks (lines lie along rows when level).
 */
export function detectDeskewAngle(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  maxDegrees: number = MAX_DESKEW_DEGREES,
): number {
  if (width < 16 || height < 16) return 0;
  const bw = applyBookScanFilter(data, width, height, "bw", 0.5);

  // Ink pixel coordinates, centred, skipping a thin border (page edges and shadows).
  const margin = Math.round(Math.min(width, height) * 0.02);
  const xs: number[] = [];
  const ys: number[] = [];
  const cx = width / 2;
  const cy = height / 2;
  for (let y = margin; y < height - margin; y++) {
    for (let x = margin; x < width - margin; x++) {
      if (bw[(y * width + x) * 4] < 128) {
        xs.push(x - cx);
        ys.push(y - cy);
      }
    }
  }
  const total = xs.length;
  if (total < 60) return 0;
  // Mostly-ink images (a dark photo, a filled shape) carry no line structure to measure.
  if (total > (width - 2 * margin) * (height - 2 * margin) * 0.5) return 0;

  // Keep the work bounded on dense pages.
  const step = Math.max(1, Math.floor(total / 40000));
  const diag = Math.ceil(Math.hypot(width, height)) + 2;
  const offset = diag / 2;
  const bins = new Float64Array(diag + 1);

  function score(deg: number): number {
    const rad = (deg * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    bins.fill(0);
    for (let i = 0; i < total; i += step) {
      // Row of the point once the page is turned by `deg` (canvas rotation, y pointing down).
      const r = Math.round(xs[i] * sin + ys[i] * cos + offset);
      if (r >= 0 && r <= diag) bins[r] += 1;
    }
    let s = 0;
    for (let i = 0; i <= diag; i++) s += bins[i] * bins[i];
    return s;
  }

  let best = 0;
  let bestScore = score(0);
  const levelScore = bestScore;
  for (let deg = -maxDegrees; deg <= maxDegrees + 1e-9; deg += 0.5) {
    const s = score(deg);
    if (s > bestScore) {
      bestScore = s;
      best = deg;
    }
  }
  const coarse = best;
  for (let deg = coarse - 0.5; deg <= coarse + 0.5 + 1e-9; deg += 0.05) {
    const s = score(deg);
    if (s > bestScore) {
      bestScore = s;
      best = deg;
    }
  }

  // Leave the page alone when turning it barely helps or the tilt is too small to see.
  if (bestScore < levelScore * 1.03 || Math.abs(best) < 0.2) return 0;
  return Math.round(best * 10) / 10;
}
