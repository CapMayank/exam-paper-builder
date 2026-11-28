import { describe, expect, it } from "vitest";
import { expandPattern } from "./pattern";

const shown = (seq: (string | null)[]) => seq.filter((x) => x !== null).length;

describe("pattern rows", () => {
  it("always shows the pattern whole at least twice before the blanks", () => {
    const seq = expandPattern({ unit: ["star", "star", "heart"], repeats: 2, blanksAtEnd: 2 });
    expect(shown(seq)).toBeGreaterThanOrEqual(6);
    expect(seq.slice(-2)).toEqual([null, null]);
  });

  it("does not change rows that already show it twice", () => {
    expect(expandPattern({ unit: ["circle", "square"], repeats: 3, blanksAtEnd: 2 })).toEqual(["circle", "square", "circle", "square", null, null]);
  });

  it("keeps the blanks a 4-shape pattern asks for", () => {
    const seq = expandPattern({ unit: ["a", "b", "c", "d"], repeats: 2, blanksAtEnd: 4 });
    expect(seq.filter((x) => x === null)).toHaveLength(4);
    expect(seq.slice(0, 8)).toEqual(["a", "b", "c", "d", "a", "b", "c", "d"]);
  });
});
