import { describe, expect, it } from "vitest";
import { jumbleWord, sortedItems } from "./activities/arrangeOrder";
import { splitWord } from "./activities/joinLetters";
import { signOf } from "./activities/numberCompareSign";
import { sumResult } from "./activities/verticalSum";

describe("answer keys for the annual-paper activities", () => {
  it("splits a Hindi word into the letters and matras the paper prints", () => {
    expect(splitWord("मगर")).toEqual(["म", "ग", "र"]);
    expect(splitWord("अनार")).toEqual(["अ", "न", "ा", "र"]);
    expect(splitWord("Apple")).toEqual(["A", "p", "p", "l", "e"]);
  });

  it("jumbles a word into something else made of the same letters, never starting on a matra", () => {
    for (const w of ["बूँद", "झाँसी", "कमल", "cat", "Apple"]) {
      const j = jumbleWord(w);
      expect(j, w).not.toBe(w);
      expect([...j].sort().join(""), w).toBe([...w].sort().join(""));
      expect(j.charCodeAt(0) >= 0x093a && j.charCodeAt(0) <= 0x094f, w).toBe(false);
      expect(jumbleWord(w)).toBe(j);
    }
  });

  it("sorts numbers as numbers and letters alphabetically", () => {
    expect(sortedItems(["8", "10", "9", "7"], "ASCENDING")).toEqual(["7", "8", "9", "10"]);
    expect(sortedItems(["8", "10", "9", "7"], "DESCENDING")).toEqual(["10", "9", "8", "7"]);
    expect(sortedItems(["c", "h", "g", "a", "l"], "ALPHABETICAL")).toEqual(["a", "c", "g", "h", "l"]);
  });

  it("works out signs and sums", () => {
    expect([signOf(6, 6), signOf(9, 8), signOf(68, 79)]).toEqual(["=", ">", "<"]);
    expect([sumResult("ADD", 25, 13), sumResult("SUBTRACT", 27, 12), sumResult("MULTIPLY", 5, 4)]).toEqual([38, 15, 20]);
  });
});

describe("Hindi unjumble", () => {
  it("moves whole letters with their matras, as the paper does", () => {
    expect(jumbleWord("बूँद")).toBe("दबूँ");
  });
});
