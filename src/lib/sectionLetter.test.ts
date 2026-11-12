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

  it("does not take a one-letter word as the section letter", () => {
    expect(sectionLetter("Write a letter")).toBeUndefined();
    expect(sectionLetter("Grammar: a short note (Section C)")).toBe("C");
  });

  it("does not take a digit or a word as the section letter", () => {
    expect(sectionLetter("Section 1")).toBeUndefined();
    expect(sectionLetter("Section wise questions")).toBeUndefined();
  });

  it("reads a hyphenated or Devanagari title", () => {
    expect(sectionLetter("SECTION-B: Grammar")).toBe("B");
    expect(sectionLetter("खण्ड C")).toBe("C");
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
