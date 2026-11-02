import { describe, expect, it } from "vitest";
import { matchOfficialChapterMarks } from "./officialChapterMarks";

const official = [
  { title: "Kshitij", chapters: [{ chapterNumber: 1, title: "साखियाँ एवं सबद", officialMarks: 3 }, { chapterNumber: 2, title: "वाख", officialMarks: 2 }] },
  { title: "Kritika", chapters: [{ chapterNumber: 1, title: "इस जल प्रलय में", officialMarks: 3 }, { chapterNumber: 2, title: "माटी वाली", officialMarks: 0, isDeleted: true }] },
];

describe("official chapter marks onto teacher books", () => {
  it("matches a combined book whose chapters are renumbered and prefixed", () => {
    const combined = [
      { id: "a", number: 1, title: "[Kshitij] साखियाँ एवं सबद" },
      { id: "b", number: 2, title: "[Kshitij] वाख" },
      { id: "c", number: 3, title: "[Kritika] इस जल प्रलय में" },
      { id: "d", number: 4, title: "[Kritika] माटी वाली" },
    ];
    const r = matchOfficialChapterMarks(combined, official, 8);
    expect(r.marks).toEqual({ a: 3, b: 2, c: 3, d: 0 });
    expect(r.exact).toBe(true);
  });

  it("matches a single un-combined textbook by chapter number when titles differ", () => {
    const r = matchOfficialChapterMarks(
      [{ id: "x", number: 1, title: "Sakhi" }, { id: "y", number: 2, title: "Vakh" }],
      [official[0]],
      5,
    );
    expect(r.marks).toEqual({ x: 3, y: 2 });
  });

  it("prefers an explicit link, and never reuses one official chapter twice", () => {
    const r = matchOfficialChapterMarks(
      [{ id: "L1", number: 9, title: "whatever" }, { id: "dup", number: 1, title: "वाख" }, { id: "dup2", number: 2, title: "वाख" }],
      [{ chapters: [{ chapterNumber: 1, title: "वाख", officialMarks: 2, legacyChapterId: "L1" }] }],
      2,
    );
    expect(r.marks).toEqual({ L1: 2 });
    expect(r.matched).toBe(1);
  });

  it("reports an inexact total so the caller can redistribute", () => {
    const r = matchOfficialChapterMarks([{ id: "a", number: 1, title: "[Kshitij] वाख" }], official, 75);
    expect(r.exact).toBe(false);
  });
});
