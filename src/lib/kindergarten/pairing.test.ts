import { describe, expect, it } from "vitest";
import { pairHalfWidth } from "./pairing";

const half = (s: string) => s.startsWith("h");

describe("pairHalfWidth", () => {
  it("puts two half-width activities that follow each other on one row", () => {
    expect(pairHalfWidth(["h1", "h2"], half)).toEqual([["h1", "h2"]]);
  });

  it("keeps the order: a full-width activity between two halves keeps them apart", () => {
    expect(pairHalfWidth(["h1", "F", "h2"], half)).toEqual([["h1"], ["F"], ["h2"]]);
  });

  it("pairs from the top, leaving an odd one out on its own row", () => {
    expect(pairHalfWidth(["h1", "h2", "h3", "F", "h4", "h5"], half)).toEqual([["h1", "h2"], ["h3"], ["F"], ["h4", "h5"]]);
  });

  it("does not pair across a forced page break", () => {
    expect(pairHalfWidth(["h1", "h2"], half, (s) => s === "h2")).toEqual([["h1"], ["h2"]]);
  });

  it("returns nothing for no activities", () => {
    expect(pairHalfWidth([], half)).toEqual([]);
  });
});
