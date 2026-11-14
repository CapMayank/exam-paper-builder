import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuestionView } from "@/components/QuestionView";

const q = {
  id: "q1",
  type: "CASE_STUDY",
  text: "Read the passage and answer.",
  options: [],
  answer: "",
  subparts: [
    { label: "(i)", text: "Part one question", marks: 1 },
    { label: "(ii)", text: "Part two question", marks: 3 },
  ],
} as never;

const text = (props: Record<string, unknown>) =>
  renderToStaticMarkup(createElement(QuestionView, { q, number: 1, marks: 4, marksStyle: "INLINE", ...props } as never))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

describe("part marks in the printed paper", () => {
  it("the printed paper shows only the question's total, so the marks beside questions add up", () => {
    const t = text({ dense: true });
    expect(t).toContain("Part one question");
    expect(t).toMatch(/\[\s*4 Marks?\s*\]/);
    expect(t).not.toMatch(/\[\s*1 Marks?\s*\]/);
    expect(t).not.toMatch(/\[\s*3 Marks?\s*\]/);
  });

  it("the answer key (and the builder preview) still shows each part's marks", () => {
    expect(text({ dense: true, showAnswer: true })).toMatch(/\[\s*3 Marks?\s*\]/);
    expect(text({})).toMatch(/\[\s*3 Marks?\s*\]/);
  });
});
