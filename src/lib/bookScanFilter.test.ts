import { describe, expect, it } from "vitest";
import { applyBookScanFilter, computeFitDimensions, detectDeskewAngle } from "./bookScanFilter";

describe("bookScanFilter", () => {
  it("normalizes shadowed grey background to pure white while keeping dark ink dark", () => {
    const w = 16;
    const h = 16;
    const pixels = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      // Simulate shadowed grey book paper (150, 148, 142)
      pixels[i * 4] = 150;
      pixels[i * 4 + 1] = 148;
      pixels[i * 4 + 2] = 142;
      pixels[i * 4 + 3] = 255;
    }
    // Draw a dark ink pixel in the center
    const center = (8 * w + 8) * 4;
    pixels[center] = 30;
    pixels[center + 1] = 30;
    pixels[center + 2] = 30;

    const out = applyBookScanFilter(pixels, w, h, "bw", 0.5);
    // Corner paper pixel -> pure white
    expect(out[0]).toBe(255);
    expect(out[1]).toBe(255);
    expect(out[2]).toBe(255);
    // Center ink pixel -> dark
    expect(out[center]).toBeLessThanOrEqual(40);
  });

  it("keeps large solid dark regions dark instead of hollowing them out", () => {
    const w = 40;
    const h = 40;
    const pixels = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      pixels[i * 4] = 25;
      pixels[i * 4 + 1] = 25;
      pixels[i * 4 + 2] = 25;
      pixels[i * 4 + 3] = 255;
    }
    const out = applyBookScanFilter(pixels, w, h, "bw", 0.5);
    const center = (20 * w + 20) * 4;
    expect(out[center]).toBeLessThanOrEqual(40);
  });

  it("leaves pixels untouched in original mode and scales dimensions proportionally", () => {
    const src = new Uint8ClampedArray([100, 120, 140, 255]);
    expect(applyBookScanFilter(src, 1, 1, "original")).toEqual(src);
    expect(computeFitDimensions(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 });
    expect(computeFitDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe("detectDeskewAngle", () => {
  /** White page with dark horizontal "text lines", photographed tilted by `tiltDeg` (clockwise positive). */
  function tiltedPage(tiltDeg: number, w = 320, h = 240): Uint8ClampedArray {
    const px = new Uint8ClampedArray(w * h * 4).fill(235);
    const rad = (tiltDeg * Math.PI) / 180;
    const cx = w / 2;
    const cy = h / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Undo the tilt to find where this pixel sat on the level page.
        const dx = x - cx;
        const dy = y - cy;
        const ly = -dx * Math.sin(rad) + dy * Math.cos(rad) + cy;
        const lx = dx * Math.cos(rad) + dy * Math.sin(rad) + cx;
        const onLine = lx > 40 && lx < w - 40 && ly > 30 && ly < h - 30 && Math.floor(ly) % 16 < 3;
        const p = (y * w + x) * 4;
        if (onLine) px[p] = px[p + 1] = px[p + 2] = 20;
        px[p + 3] = 255;
      }
    }
    return px;
  }

  it("returns the rotation that levels a page tilted clockwise", () => {
    expect(detectDeskewAngle(tiltedPage(6), 320, 240)).toBeCloseTo(-6, 0);
  });

  it("returns the rotation that levels a page tilted anticlockwise", () => {
    expect(detectDeskewAngle(tiltedPage(-3.5), 320, 240)).toBeCloseTo(3.5, 0);
  });

  it("leaves a level page alone", () => {
    expect(detectDeskewAngle(tiltedPage(0), 320, 240)).toBe(0);
  });

  it("leaves a blank page alone", () => {
    expect(detectDeskewAngle(new Uint8ClampedArray(100 * 100 * 4).fill(240), 100, 100)).toBe(0);
  });
});
