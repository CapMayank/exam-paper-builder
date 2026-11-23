import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { PaperSheets } from "@/components/PaperSheets";
import { answerKeyRows } from "./answerKeyStatus";
import { SANSKRIT_CLASS10_PAPER } from "./fixtures/sanskritPaperFixture";
import { computeDisplayedPaperNumbering } from "./layout";
import type { PaperData } from "./types";

const OBJECTIVE = "खण्डः 'क' — वस्तुनिष्ठप्रश्नाः";
const OBJECTIVE_IDS = ["sec_a_mcq", "sec_b_fill", "sec_c_tf", "sec_d_match", "sec_e_vshort"];

/** The fixture paper as a board-style blueprint builds it: Q1-Q5 under one objective khand, blanks with their own title. */
function boardPaper(language: "sa" | "en"): PaperData {
  const p = SANSKRIT_CLASS10_PAPER;
  return {
    ...p,
    language,
    blueprint: {
      ...p.blueprint,
      sections: p.blueprint.sections.map((s) =>
        OBJECTIVE_IDS.includes(s.id)
          ? { ...s, title: OBJECTIVE, questionTitle: s.id === "sec_b_fill" ? "रिक्तस्थानानि पूरयत।" : "" }
          : s,
      ),
    },
  } as PaperData;
}

const printed = (paper: PaperData) =>
  renderToStaticMarkup(createElement(PaperSheets, { paper: paper as never, view: "reading" }))
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

describe("builder, print and answer key share every label", () => {
  test("answer key labels are the numbering's labels, item by item", () => {
    const paper = boardPaper("sa");
    const n = computeDisplayedPaperNumbering(paper.blueprint.sections, paper.items, "CONTINUOUS", "sa");
    const rows = answerKeyRows(paper).filter((r) => !r.isOr);
    expect(rows.length).toBe(paper.items.length);
    const byQuestion = new Map(paper.items.map((it) => [it.question.id, it.id]));
    for (const r of rows) expect(r.label).toBe(n.itemNumbers[byQuestion.get(r.questionId)!].displayLabel);
    expect(n.totalDisplayedQuestions).toBe(23);
  });

  test("the printed Sanskrit paper: one objective khand, Q1-Q5 with (क) parts, the row's own title, Q6 onwards after", () => {
    const text = printed(boardPaper("sa"));
    expect(text.split(OBJECTIVE).length - 1).toBe(1);
    expect(text).toContain("रिक्तस्थानानि पूरयत।");
    expect(text).toContain("(क)");
    expect(text).not.toMatch(/\(a\)\s/);
    const objectiveAt = text.indexOf(OBJECTIVE);
    const shortAt = text.indexOf("खण्डः 'च'");
    expect(objectiveAt).toBeGreaterThanOrEqual(0);
    expect(shortAt).toBeGreaterThan(objectiveAt);
  });

  test("each grouped part prints with the numbering's label, in the numbering's order", () => {
    const paper = boardPaper("sa");
    const text = printed(paper);
    const n = computeDisplayedPaperNumbering(paper.blueprint.sections, paper.items, "CONTINUOUS", "sa");
    const mcqs = paper.items.filter((it) => it.sectionId === "sec_a_mcq").sort((a, b) => a.position - b.position);
    let from = text.indexOf("1. ");
    for (const it of mcqs) {
      const at = text.indexOf(`${n.itemNumbers[it.id].subLabel} ${it.question.text.slice(0, 15)}`, from);
      expect(at, it.id).toBeGreaterThan(from);
      from = at;
    }
    expect(text.indexOf("2. ", from)).toBeGreaterThan(from);
  });
});
