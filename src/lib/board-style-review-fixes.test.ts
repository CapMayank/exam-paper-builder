import { describe, expect, test } from "vitest";
import { answerKeyRows } from "./answerKeyStatus";
import { SANSKRIT_CLASS10_PAPER } from "./fixtures/sanskritPaperFixture";
import { computeDisplayedPaperNumbering } from "./layout";
import { omrItems } from "./omrItems";
import { buildGeneralInstructions } from "./preflightChecks";
import type { PaperData } from "./types";

const OBJECTIVE_IDS = ["sec_a_mcq", "sec_b_fill", "sec_c_tf", "sec_d_match", "sec_e_vshort"];
const withTitles = (title: (id: string, old: string) => string): PaperData =>
  ({
    ...SANSKRIT_CLASS10_PAPER,
    blueprint: {
      ...SANSKRIT_CLASS10_PAPER.blueprint,
      sections: SANSKRIT_CLASS10_PAPER.blueprint.sections.map((s) => ({ ...s, title: title(s.id, s.title) })),
    },
  }) as PaperData;
const boardPaper = withTitles((id, old) => (OBJECTIVE_IDS.includes(id) ? "खण्डः 'क' — वस्तुनिष्ठप्रश्नाः" : old));

describe("surfaces that numbered on their own", () => {
  test("general instructions count the one-word row as one question, as print does", () => {
    const text = buildGeneralInstructions(SANSKRIT_CLASS10_PAPER, "en");
    expect(text).toMatch(/Question 5, 1 mark/);
    expect(text).toMatch(/Question 6–17, 2 mark/);
  });

  test("the answer key labels parts in the paper's language even when headings are in English", () => {
    const paper = withTitles((id) => (OBJECTIVE_IDS.includes(id) ? "Section A" : "Section B"));
    const first = answerKeyRows(paper).find((r) => !r.isOr)!;
    expect(first.label).toBe("1 (क)");
  });

  test("the OMR sheet labels each bubble row as the paper numbers it", () => {
    const paper = boardPaper;
    const n = computeDisplayedPaperNumbering(paper.blueprint.sections, paper.items, "CONTINUOUS", "sa");
    const rows = omrItems(paper);
    const mcqs = paper.items.filter((it) => it.sectionId === "sec_a_mcq").sort((a, b) => a.position - b.position);
    expect(mcqs.map((it) => rows.find((r) => r.itemId === it.id)?.label)).toEqual(mcqs.map((it) => n.itemNumbers[it.id].displayLabel));
    expect(rows.find((r) => r.itemId === mcqs[0].id)?.label).toBe("1 (क)");
  });

  test("two same-form rows with different question titles stay two questions", () => {
    const sections = [
      { id: "a", title: "Section A", type: "VERY_SHORT", marksEach: 1, count: 3, questionTitle: "Name the following." },
      { id: "b", title: "Section A", type: "VERY_SHORT", marksEach: 1, count: 3, questionTitle: "Give one word for each." },
    ];
    const items = ["a", "b"].flatMap((s) => [0, 1, 2].map((i) => ({ id: `${s}${i}`, sectionId: s, position: i, question: { type: "VERY_SHORT" } })));
    const n = computeDisplayedPaperNumbering(sections, items, "CONTINUOUS", "en");
    expect(n.itemNumbers.a0.displayLabel).toBe("1 (i)");
    expect(n.itemNumbers.b0.displayLabel).toBe("2 (i)");
  });
});
