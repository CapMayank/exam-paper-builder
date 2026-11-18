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
