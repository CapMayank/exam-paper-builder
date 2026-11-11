import { describe, expect, it } from "vitest";
import { assignChapter } from "./questionTagging";
import { assignChapters } from "./pasteQuestions";

const chapters = [
  { id: "a", number: 1, title: "The Tree" },
  { id: "b", number: 2, title: "The Swing" },
  { id: "c", number: 3, title: "Plants and Photosynthesis" },
];

describe("assignChapter: a chapter is always found, without asking", () => {
  it("takes the chapter whose title the question names", () => {
    expect(assignChapter("Why does a tree give shade?", chapters, { a: 0, b: 3, c: 0 })).toBe("a");
  });

  it("falls back to the chapter furthest below its target", () => {
    expect(assignChapter("x", chapters, { a: -2, b: 3, c: 1 })).toBe("b");
  });

  it("still returns a chapter for Hindi-only text when every chapter is over target", () => {
    expect(assignChapter("यह एक प्रश्न है", chapters, { a: -3, b: -1, c: -2 })).toBe("b");
  });

  it("breaks ties toward the lowest chapter number", () => {
    expect(assignChapter("", chapters, { a: 0, b: 0, c: 0 })).toBe("a");
  });

  it("treats a chapter missing from the gaps as on target", () => {
    expect(assignChapter("x", chapters, { a: -1 })).toBe("b");
  });

  it("throws only when there are no chapters", () => {
    expect(() => assignChapter("x", [], {})).toThrow();
  });
});

describe("assignChapters: pasted questions are spread, never refused", () => {
  it("gives every question a chapter and spreads them over the chapters furthest below target", () => {
    const got = assignChapters(["q1", "q2", "q3", "q4"], chapters, { a: 1, b: 1, c: 1 }, 1);
    expect(got.every((g) => g !== null && typeof g.chapterId === "string")).toBe(true);
    expect(new Set(got.slice(0, 3).map((g) => g.chapterId)).size).toBe(3);
  });

  it("does not change the gaps it was given", () => {
    const gaps = { a: 1, b: 1, c: 1 };
    assignChapters(["q1", "q2"], chapters, gaps, 1);
    expect(gaps).toEqual({ a: 1, b: 1, c: 1 });
  });
});
