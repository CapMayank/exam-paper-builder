import { describe, expect, it } from "vitest";
import { filterByExamType, pickPaper } from "./paperMatch";

describe("pickPaper", () => {
  it("links nothing when no paper matches", () => {
    expect(pickPaper([])).toEqual({ paperId: null, ambiguous: false });
  });
  it("links the only matching paper", () => {
    expect(pickPaper([{ id: "p1" }])).toEqual({ paperId: "p1", ambiguous: false });
  });
  it("leaves the choice to the admin when several papers match", () => {
    expect(pickPaper([{ id: "p1" }, { id: "p2" }])).toEqual({ paperId: null, ambiguous: true });
  });
});

describe("filterByExamType", () => {
  it("keeps papers of the exam's type, judged by blueprint first", () => {
    const papers = [
      { id: "a", examType: "", title: "Maths", blueprint: { examType: "HALF_YEARLY" } },
      { id: "b", examType: "HALF_YEARLY", title: "Maths", blueprint: { examType: "ANNUAL" } },
      { id: "c", examType: "", title: "Half Yearly Maths", blueprint: { examType: "" } },
    ];
    expect(filterByExamType(papers, "HALF_YEARLY").map((p) => p.id)).toEqual(["a", "c"]);
  });
});
