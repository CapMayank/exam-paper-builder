import { describe, expect, it } from "vitest";
import { buildGeneralInstructions, findPlaceholder, isDraftPaper, marksMismatch, marksMismatchMessage, plainText } from "./preflightChecks";

const sec = (id: string, position: number, title: string, count: number, marksEach: number) => ({
  id, position, title, instructions: "", type: "SHORT", count, marksEach,
});
const item = (id: string, sectionId: string, position: number, or = false) =>
  ({ id, sectionId, position, question: { id: "q" + id, type: "SHORT", text: "t" }, orQuestion: or ? { id: "o" + id } : null }) as never;
const paper = (items: never[]) =>
  ({ numberingStyle: "CONTINUOUS", items, blueprint: { sections: [sec("a", 0, "Section A", 2, 1), sec("b", 1, "Section B", 1, 3)] } }) as never;

describe("preflight checks", () => {
  it("strips tags", () => expect(plainText("<p>a&nbsp;<b>b</b></p>")).toBe("a b"));
  it("finds placeholders", () => {
    expect(findPlaceholder("Assertion (A): [Enter statement here]")).toBe("[Enter statement here]");
    expect(findPlaceholder("<p>Type the question here.</p>")).toBeTruthy();
    expect(findPlaceholder("What is [x]?")).toBeNull();
  });
  it("marks mismatch", () => {
    expect(marksMismatch({ usedMarks: 9, totalMarks: 10 })).toBe(true);
    expect(marksMismatchMessage({ usedMarks: 10, totalMarks: 10 })).toBeNull();
    expect(marksMismatchMessage({ usedMarks: 9, totalMarks: 10 })).toContain("9 marks");
  });
  it("draft when slots or marks off", () => {
    expect(isDraftPaper({ progress: { complete: true, usedMarks: 5, totalMarks: 5 } } as never)).toBe(false);
    expect(isDraftPaper({ progress: { complete: true, usedMarks: 4, totalMarks: 5 } } as never)).toBe(true);
    expect(isDraftPaper({ progress: { complete: false, usedMarks: 5, totalMarks: 5 } } as never)).toBe(true);
  });
  it("instructions follow real sections and mention choice only when present", () => {
    const items = [item("1", "a", 0), item("2", "a", 1), item("3", "b", 0)];
    const txt = buildGeneralInstructions(paper(items));
    expect(txt).toContain("Section A: Question 1–2, 1 mark(s) each.");
    expect(txt).toContain("Section B: Question 3, 3 mark(s) each.");
    expect(txt).not.toMatch(/choice/i);
    expect(buildGeneralInstructions(paper([item("1", "a", 0, true)]))).toMatch(/Internal choice/);
  });
});
