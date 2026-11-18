import { describe, expect, it } from "vitest";
import { applyBookScanFilter, computeFitDimensions } from "./bookScanFilter";

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
