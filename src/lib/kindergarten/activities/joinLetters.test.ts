import { describe, expect, it } from "vitest";
import { splitWord } from "./joinLetters";

describe("splitting a word into letters to join", () => {
  it("keeps English letters and Hindi matras apart", () => {
    expect(splitWord("Cat")).toEqual(["C", "a", "t"]);
    expect(splitWord("किताब")).toEqual(["क", "ि", "त", "ा", "ब"]);
  });

  it("keeps a half letter whole instead of printing a lone halant", () => {
    expect(splitWord("क्षमा")).toEqual(["क्", "ष", "म", "ा"]);
    expect(splitWord("बच्चा")).toEqual(["ब", "च्", "च", "ा"]);
  });

  it("keeps a nukta on its letter", () => {
    expect(splitWord("पेड़")).toEqual(["प", "े", "ड़"]);
  });
});
