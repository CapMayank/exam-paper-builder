import { describe, expect, it } from "vitest";
import { builderQuestionLabel, computeDisplayedPaperNumbering, groupedSubLabel } from "./layout";

const sec = (id: string, title: string, type: string, marksEach = 1) => ({ id, title, type, marksEach, count: 0 });
const item = (id: string, sectionId: string, position: number, type = "SHORT") => ({ id, sectionId, position, question: { type } });

describe("builderQuestionLabel: the label print shows", () => {
  // Section A: MCQ x2, Section A: True/False x3 (grouped), Section B: short x2
  const sections = [sec("a1", "Section A", "MCQ"), sec("a2", "Section A", "TRUE_FALSE"), sec("b", "Section B", "SHORT", 2)];
  const items = [
    item("m1", "a1", 0, "MCQ"),
    item("m2", "a1", 1, "MCQ"),
    item("t1", "a2", 0, "TRUE_FALSE"),
    item("t2", "a2", 1, "TRUE_FALSE"),
    item("t3", "a2", 2, "TRUE_FALSE"),
    item("s1", "b", 0),
    item("s2", "b", 1),
  ];

  it("numbers a grouped exercise once and labels its items with sub-labels (not by position)", () => {
    const n = computeDisplayedPaperNumbering(sections, items, "CONTINUOUS");
    expect(["m1", "m2", "t1", "t2", "t3", "s1", "s2"].map((id) => builderQuestionLabel(n, id))).toEqual([
      "1",
      "2",
      "3 (a)",
      "3 (b)",
      "3 (c)",
      "4",
      "5",
    ]);
  });

  it("prefixes as print does", () => {
    const n = computeDisplayedPaperNumbering(sections, items, "PREFIXED");
    expect(builderQuestionLabel(n, "t2")).toBe("Q.3 (b)");
    expect(builderQuestionLabel(n, "s2")).toBe("Q.5");
  });

  it("counts section-relative numbers across every row of one section, as print does", () => {
    const n = computeDisplayedPaperNumbering(sections, items, "SECTION_RELATIVE");
    expect(["m1", "m2", "t1", "t3", "s1", "s2"].map((id) => builderQuestionLabel(n, id))).toEqual([
      "A1",
      "A2",
      "A3 (a)",
      "A3 (c)",
      "B1",
      "B2",
    ]);
  });

  it("falls back to the section's place among sections with distinct titles, as print does", () => {
    const s = [sec("x1", "Objective", "MCQ"), sec("x2", "Objective", "SHORT"), sec("y", "Subjective", "LONG")];
    const it = [item("p", "x1", 0, "MCQ"), item("q", "x2", 0), item("r", "y", 0, "LONG")];
    const n = computeDisplayedPaperNumbering(s, it, "SECTION_RELATIVE");
    expect(["p", "q", "r"].map((id) => builderQuestionLabel(n, id))).toEqual(["A1", "A2", "B1"]);
  });

  it("uses Devanagari sub-labels on a Hindi or Sanskrit paper even when the title is in English", () => {
    const n = computeDisplayedPaperNumbering(sections, items, "CONTINUOUS", "hi");
    expect(builderQuestionLabel(n, "t1")).toBe("3 (क)");
    const en = computeDisplayedPaperNumbering(sections, items, "CONTINUOUS", "en");
    expect(builderQuestionLabel(en, "t1")).toBe("3 (a)");
  });

  it("has no label for an item that is not on the paper", () => {
    const n = computeDisplayedPaperNumbering(sections, items, "CONTINUOUS");
    expect(builderQuestionLabel(n, "missing")).toBeUndefined();
  });
});

describe("groupedSubLabel", () => {
  it("labels as print does: (a)…(j) then numbers; (क)…(ञ) then numbers", () => {
    expect(groupedSubLabel(0, false)).toBe("(a)");
    expect(groupedSubLabel(9, false)).toBe("(j)");
    expect(groupedSubLabel(10, false)).toBe("(11)");
    expect(groupedSubLabel(0, true)).toBe("(क)");
    expect(groupedSubLabel(10, true)).toBe("(11)");
  });
});
