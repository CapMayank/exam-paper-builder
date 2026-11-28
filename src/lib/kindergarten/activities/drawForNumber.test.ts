import { describe, expect, it } from "vitest";
import { drawBoxSize, drawForNumberDefaultConfig, drawForNumberPlugin, instructionForThing } from "./drawForNumber";

describe("draw for the number", () => {
  it("gives drawn objects more room than lines", () => {
    const lines = drawBoxSize({ ...drawForNumberDefaultConfig(), numbers: [10], thing: "lines" });
    const stars = drawBoxSize({ ...drawForNumberDefaultConfig(), numbers: [10], thing: "stars" });
    expect(stars.width / 10).toBeGreaterThanOrEqual(36);
    expect(stars.width).toBeGreaterThan(lines.width);
    expect(stars.height).toBeGreaterThan(lines.height);
  });

  it("sizes every box for the biggest number, so the box never hints at the answer", () => {
    expect(drawBoxSize({ ...drawForNumberDefaultConfig(), numbers: [2, 8] }).width).toBe(drawBoxSize({ ...drawForNumberDefaultConfig(), numbers: [8] }).width);
  });

  it("goes full width when the boxes are too wide for half a page", () => {
    expect(drawForNumberPlugin.halfWidth!({ ...drawForNumberDefaultConfig(), numbers: [3, 4] })).toBe(true);
    expect(drawForNumberPlugin.halfWidth!({ ...drawForNumberDefaultConfig(), numbers: [10], thing: "stars" })).toBe(false);
  });

  it("follows the thing only while the instruction is still the automatic one", () => {
    expect(instructionForThing("Draw lines according to the given number:", "lines", "stars")).toBe("Draw stars according to the given number:");
    expect(instructionForThing("Draw st according to the given number:", "st", "sta")).toBe("Draw sta according to the given number:");
    expect(instructionForThing("Show the number with lines", "lines", "stars")).toBe("Show the number with lines");
  });
});
