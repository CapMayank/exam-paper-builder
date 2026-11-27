import { describe, expect, it } from "vitest";
import { firstLetter, wordTokens } from "./hindi";

describe("firstLetter", () => {
  it("gives the first letter a child writes, without its matra", () => {
    expect(firstLetter("आम")).toBe("आ");
    expect(firstLetter("पेड़")).toBe("प");
    expect(firstLetter("छाता")).toBe("छ");
    expect(firstLetter("सूरज")).toBe("स");
    expect(firstLetter("घड़ी")).toBe("घ");
  });
  it("works for English words too", () => expect(firstLetter("apple")).toBe("A"));
  it("is empty for an empty word", () => expect(firstLetter("  ")).toBe(""));
});

describe("wordTokens", () => {
  it("splits a spaced sequence into its items", () => expect(wordTokens("क ख ग घ")).toEqual(["क", "ख", "ग", "घ"]));
  it("splits a word into letters with their matras", () => expect(wordTokens("कमला")).toEqual(["क", "म", "ला"]));
  it("ignores extra spaces", () => expect(wordTokens("  अ  आ ")).toEqual(["अ", "आ"]));
});

describe("firstLetter with joined letters", () => {
  it("keeps a conjunct whole", () => {
    expect(firstLetter("क्षत्रिय")).toBe("क्ष");
    expect(firstLetter("ज्ञान")).toBe("ज्ञ");
    expect(firstLetter("त्रिभुज")).toBe("त्र");
  });
  it("keeps a joined letter in one box", () => expect(wordTokens("क्षमा")).toEqual(["क्ष", "मा"]));
  it("keeps nukta and matra with their letter", () => expect(wordTokens("पेड़")).toEqual(["पे", "ड़"]));
});
