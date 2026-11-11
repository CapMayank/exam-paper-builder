import { describe, expect, it } from "vitest";
import { buildCoverageReport } from "./aiCoverage";

const targets = [
  { chapterId: "a", title: "A", target: 5 },
  { chapterId: "b", title: "B", target: 3 },
];
const items = [
  { itemId: "i1", questionId: "q1", number: 1, marks: 2, storedChapterId: "a" },
  { itemId: "i2", questionId: "q2", number: 2, marks: 3, storedChapterId: "a" },
  { itemId: "i3", questionId: "q3", number: 3, marks: 1, storedChapterId: "b" },
];

describe("buildCoverageReport", () => {
  it("spreads marks by the AI's chapters and lists the disagreements", () => {
    const rep = buildCoverageReport({
      items,
      targets,
      rows: [
        { number: 1, chapterId: "a", confidence: "HIGH" },
        { number: 2, chapterId: "b", confidence: "MEDIUM" },
        { number: 3, chapterId: "b", confidence: "LOW" },
      ],
    });
    expect(rep.spread).toEqual([
      { chapterId: "a", title: "A", target: 5, aiMarks: 2 },
      { chapterId: "b", title: "B", target: 3, aiMarks: 4 },
    ]);
    expect(rep.disagreements).toEqual([
      { itemId: "i2", questionId: "q2", number: 2, storedChapterId: "a", aiChapterId: "b", confidence: "MEDIUM" },
    ]);
    expect(rep.unclassified).toEqual([]);
  });

  it("drops rows with an unknown chapter id", () => {
    const rep = buildCoverageReport({ items, targets, rows: [{ number: 1, chapterId: "nope", confidence: "HIGH" }] });
    expect(rep.disagreements).toEqual([]);
    expect(rep.unclassified).toEqual([1, 2, 3]);
  });

  it("drops rows whose question number was never sent", () => {
    const rep = buildCoverageReport({ items, targets, rows: [{ number: 99, chapterId: "b", confidence: "HIGH" }] });
    expect(rep.disagreements).toEqual([]);
    expect(rep.spread.find((s) => s.chapterId === "b")?.aiMarks).toBe(1);
  });

  it("keeps stored chapters for questions the AI left out", () => {
    const rep = buildCoverageReport({ items, targets, rows: [{ number: 1, chapterId: "a", confidence: "HIGH" }] });
    expect(rep.unclassified).toEqual([2, 3]);
    expect(rep.spread).toEqual([
      { chapterId: "a", title: "A", target: 5, aiMarks: 5 },
      { chapterId: "b", title: "B", target: 3, aiMarks: 1 },
    ]);
  });

  it("keeps the first row when a number repeats", () => {
    const rep = buildCoverageReport({
      items,
      targets,
      rows: [
        { number: 2, chapterId: "b", confidence: "HIGH" },
        { number: 2, chapterId: "a", confidence: "HIGH" },
      ],
    });
    expect(rep.disagreements.map((d) => d.aiChapterId)).toEqual(["b"]);
  });

  it("treats an unknown confidence as LOW", () => {
    const rep = buildCoverageReport({ items, targets, rows: [{ number: 2, chapterId: "b", confidence: "maybe" }] });
    expect(rep.disagreements[0].confidence).toBe("LOW");
  });
});
