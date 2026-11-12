import { describe, expect, it } from "vitest";
import { sectionLetter } from "./sectionLetter";

describe("sectionLetter", () => {
  it("reads the letter after an English section word", () => {
    expect(sectionLetter("Section A")).toBe("A");
    expect(sectionLetter("SECTION-B: Grammar")).toBe("B");
    expect(sectionLetter("Part D – Writing")).toBe("D");
    expect(sectionLetter("section – E")).toBe("E");
  });

  it("reads the letter after a Devanagari section word", () => {
    expect(sectionLetter("खण्ड C")).toBe("C");
    expect(sectionLetter("खंड-D (वर्णनात्मक)")).toBe("D");
    expect(sectionLetter("भाग B")).toBe("B");
  });

  it("names no letter for a title without a section word and letter", () => {
    expect(sectionLetter("Write a letter")).toBeUndefined();
    expect(sectionLetter("Section 1")).toBeUndefined();
    expect(sectionLetter("आरोह भाग – 2 (काव्य खंड)")).toBeUndefined();
    expect(sectionLetter("खण्ड अ – वस्तुनिष्ठ प्रश्न")).toBeUndefined();
  });

  // The ad-hoc regexes this helper replaces, and the titles they misread.
  it("does not take a one-letter word as the section letter (old /\\b([A-Z])\\b/i in PaperSheets and the builder)", () => {
    expect("Write a letter".match(/\b([A-Z])\b/i)?.[1]).toBe("a");
    expect(sectionLetter("Write a letter")).toBeUndefined();
    expect("Section B: Write a letter".match(/\b([A-Z])\b/i)?.[1]).toBe("B");
    expect("Grammar: a short note (Section C)".match(/\b([A-Z])\b/i)?.[1]).toBe("a");
    expect(sectionLetter("Grammar: a short note (Section C)")).toBe("C");
  });

  it("does not take a digit or a word as the section letter (old /section\\s+([a-z0-9]+)/i in solutions, OMR and Word)", () => {
    expect("Section 1".match(/section\s+([a-z0-9]+)/i)?.[1]).toBe("1");
    expect(sectionLetter("Section 1")).toBeUndefined();
    expect("Section wise questions".match(/section\s+([a-z0-9]+)/i)?.[1]).toBe("wise");
    expect(sectionLetter("Section wise questions")).toBeUndefined();
  });

  it("reads a hyphenated or Devanagari title (old /Section\\s+([A-Z])/i in layout.ts missed them)", () => {
    expect("SECTION-B: Grammar".match(/Section\s+([A-Z])/i)).toBeNull();
    expect(sectionLetter("SECTION-B: Grammar")).toBe("B");
    expect("खण्ड C".match(/Section\s+([A-Z])/i)).toBeNull();
    expect(sectionLetter("खण्ड C")).toBe("C");
    expect("Section wise".match(/Section\s+([A-Z])/i)?.[1]).toBe("w");
    expect(sectionLetter("Section wise")).toBeUndefined();
  });

  it("does not read a section word inside a longer word", () => {
    expect(sectionLetter("Subsection A")).toBeUndefined();
    expect(sectionLetter("उपखण्ड A")).toBeUndefined();
  });

  it("accepts a lower-case letter and returns it upper-case; the first match wins", () => {
    expect(sectionLetter("section a")).toBe("A");
    expect(sectionLetter("खण्ड b")).toBe("B");
    expect(sectionLetter("Section wise marks")).toBeUndefined();
    expect(sectionLetter("Part a of Section B")).toBe("A");
  });
});
