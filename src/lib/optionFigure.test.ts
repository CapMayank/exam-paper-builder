import { describe, expect, it } from "vitest";
import { canonicalMcqAnswer, cleanOptionText, normalizeMcqAnswer } from "./constants";
import {
  figureOptionColumns,
  fitInBox,
  hasFigureOptions,
  imageDimensions,
  joinOptionFigure,
  optionTextOnly,
  splitOptionFigure,
} from "./optionFigure";

describe("option figure marker", () => {
  it("leaves text-only options untouched", () => {
    expect(splitOptionFigure("Rhombus")).toEqual({ figure: null, text: "Rhombus" });
    expect(splitOptionFigure("$\\frac{1}{2}$")).toEqual({ figure: null, text: "$\\frac{1}{2}$" });
    expect(splitOptionFigure("[1, 2]")).toEqual({ figure: null, text: "[1, 2]" });
    expect(splitOptionFigure("")).toEqual({ figure: null, text: "" });
    expect(hasFigureOptions(["a", "b"])).toBe(false);
  });

  it("reads a figure with and without a caption", () => {
    expect(splitOptionFigure("[[fig:abc-1.png]]")).toEqual({ figure: "abc-1.png", text: "" });
    expect(splitOptionFigure("[[fig:abc-1.png]] Square")).toEqual({ figure: "abc-1.png", text: "Square" });
    expect(splitOptionFigure("(b) [[fig:x.svg]] Kite")).toEqual({ figure: "x.svg", text: "Kite" });
    expect(hasFigureOptions(["Square", "[[fig:x.png]]"])).toBe(true);
  });

  it("round-trips through join", () => {
    expect(joinOptionFigure("x.png", "")).toBe("[[fig:x.png]]");
    expect(joinOptionFigure("x.png", "Kite")).toBe("[[fig:x.png]] Kite");
    expect(joinOptionFigure(null, "Kite")).toBe("Kite");
    const s = joinOptionFigure("f.png", "Rhombus");
    expect(splitOptionFigure(s)).toEqual({ figure: "f.png", text: "Rhombus" });
    expect(optionTextOnly(s)).toBe("Rhombus");
  });

  it("is not stripped by cleanOptionText", () => {
    expect(cleanOptionText("[[fig:x.png]] Kite")).toBe("[[fig:x.png]] Kite");
    expect(splitOptionFigure(cleanOptionText("(a) [[fig:x.png]]")).figure).toBe("x.png");
  });
});

describe("MCQ answers with figure options", () => {
  const opts = ["[[fig:a.png]]", "[[fig:b.png]] Rhombus", "[[fig:c.png]]", "Square"];

  it("resolves a letter to the option's figure and caption", () => {
    expect(normalizeMcqAnswer("B", opts)).toMatchObject({ letter: "B", optionText: "Rhombus", optionFigure: "b.png", display: "(B)" });
    expect(normalizeMcqAnswer("(a)", opts)).toMatchObject({ letter: "A", optionText: undefined, optionFigure: "a.png" });
    expect(normalizeMcqAnswer("4", opts)).toMatchObject({ letter: "D", optionText: "Square" });
    expect(normalizeMcqAnswer("D", opts).optionFigure).toBeUndefined();
  });

  it("matches an answer given as the caption text", () => {
    expect(normalizeMcqAnswer("rhombus", opts).letter).toBe("B");
    expect(canonicalMcqAnswer("Rhombus", opts)).toBe("B");
  });

  it("keeps text-only behaviour unchanged", () => {
    expect(normalizeMcqAnswer("C", ["10", "3", "7", "1"])).toMatchObject({ letter: "C", optionText: "7" });
    expect(normalizeMcqAnswer("Cytokinin", ["Auxin", "Cytokinin"]).letter).toBe("B");
  });
});

describe("figure option layout", () => {
  it("puts four short options four across and long ones two across", () => {
    expect(figureOptionColumns(["[[fig:a.png]]", "[[fig:b.png]]", "[[fig:c.png]]", "[[fig:d.png]]"])).toBe(4);
    expect(figureOptionColumns(["[[fig:a.png]] A long description of the shape", "[[fig:b.png]]"])).toBe(2);
    expect(figureOptionColumns(Array.from({ length: 6 }, (_, i) => `[[fig:${i}.png]]`))).toBe(2);
  });

  it("reads PNG, GIF and JPEG sizes and fits them in a box", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47], 0);
    png.set([0, 0, 1, 44, 0, 0, 0, 150], 16); // 300 × 150
    expect(imageDimensions(png)).toEqual({ width: 300, height: 150 });

    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 40, 0, 20, 0]);
    expect(imageDimensions(gif)).toEqual({ width: 40, height: 20 });

    // SOI, APP0 (len 4), SOF0 with height 100 width 200
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0, 100, 0, 200, 3, 0, 0, 0]);
    expect(imageDimensions(jpg)).toEqual({ width: 200, height: 100 });

    expect(imageDimensions(new Uint8Array([1, 2, 3]))).toBeNull();
    expect(fitInBox({ width: 300, height: 150 }, 100, 100)).toEqual({ width: 100, height: 50 });
    expect(fitInBox(null, 90, 80)).toEqual({ width: 90, height: 80 });
  });
});
