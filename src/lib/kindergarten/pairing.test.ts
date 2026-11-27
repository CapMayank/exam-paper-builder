import { describe, expect, it } from "vitest";
import { arrangeToFit, pairHalfWidth } from "./pairing";

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

describe("arrangeToFit", () => {
  it("pulls the next small activity up beside a small one that has no partner", () => {
    expect(arrangeToFit(["h1", "F1", "h2", "F2"], half)).toEqual(["h1", "h2", "F1", "F2"]);
  });

  it("leaves a worksheet that already pairs well as it is", () => {
    expect(arrangeToFit(["h1", "h2", "F1", "h3", "h4"], half)).toEqual(["h1", "h2", "F1", "h3", "h4"]);
  });

  it("keeps full-width activities in their order and moves only what it must", () => {
    expect(arrangeToFit(["F1", "h1", "F2", "F3", "h2", "h3"], half)).toEqual(["F1", "h1", "h2", "F2", "F3", "h3"]);
  });

  it("leaves a single small activity where it is", () => {
    expect(arrangeToFit(["F1", "h1", "F2"], half)).toEqual(["F1", "h1", "F2"]);
  });
});
