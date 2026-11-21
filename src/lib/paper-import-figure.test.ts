import { describe, expect, test } from "vitest";
import { mentionsFigure, parsePaperJson } from "./paperImport";

function parse(questions: Record<string, unknown>[]) {
  return parsePaperJson(JSON.stringify({ title: "T", sections: [{ title: "S", questions }] }));
}
const q = (extra: Record<string, unknown>) => ({ text: "Find x.", type: "SHORT", marks: 2, ...extra });
const missingFigureWarnings = (w: string[]) => w.filter((m) => m.includes('mentions a figure but has no "figure" description'));

describe("figure descriptions in pasted replies", () => {
  test("figure is kept, trimmed", () => {
    const res = parse([q({ figure: "  Triangle ABC, AB = 5 cm  " })]);
    expect(res.paper.sections[0].questions[0].figure).toBe("Triangle ABC, AB = 5 cm");
  });

  test("orQuestion figure kept separately", () => {
    const res = parse([q({ figure: "X", orQuestion: { text: "Find y.", marks: 2, figure: "Y" } })]);
    const got = res.paper.sections[0].questions[0];
    expect(got.figure).toBe("X");
    expect(got.orQuestion?.figure).toBe("Y");
  });

  test("blank or non-string figure dropped", () => {
    expect(parse([q({ figure: "   " })]).paper.sections[0].questions[0].figure).toBeUndefined();
    expect(parse([q({ figure: 42 })]).paper.sections[0].questions[0].figure).toBeUndefined();
  });

  test("mentionsFigure", () => {
    expect(mentionsFigure("In the given figure, find ∠ABC")).toBe(true);
    expect(mentionsFigure("दिए गए चित्र में")).toBe(true);
    expect(mentionsFigure("आकृति में दिखाए गए त्रिभुज")).toBe(true);
    expect(mentionsFigure("Study the graph below")).toBe(true);
    expect(mentionsFigure("Look at the diagram")).toBe(true);
    expect(mentionsFigure("On the given map of India")).toBe(true);
    expect(mentionsFigure("Figure out the value of x")).toBe(false);
    expect(mentionsFigure("Solve 2x + 3 = 7")).toBe(false);
  });

  test("warning when text, a subpart, or the OR question mentions a figure without one", () => {
    const res = parse([
      q({ text: "In the given figure, find x." }),
      q({ text: "Answer the following:", subparts: [{ label: "(i)", text: "Label the diagram.", marks: 2 }] }),
      q({ orQuestion: { text: "Study the graph and answer.", marks: 2 } }),
    ]);
    expect(missingFigureWarnings(res.warnings)).toHaveLength(3);
  });

  test("no warning when the figure is given", () => {
    const res = parse([q({ text: "In the given figure, find x.", figure: "Line AB" })]);
    expect(missingFigureWarnings(res.warnings)).toHaveLength(0);
  });
});

describe("figure warnings skip activity and draw questions", () => {
  test("kindergarten and DRAW questions mentioning pictures get no missing-figure warning", () => {
    const res = parse([
      { text: "Count the pictures and write the number.", type: "KDG_COUNT_ITEMS", marks: 2 },
      { text: "Colour the picture.", type: "KDG_COLOUR", marks: 2 },
      { text: "Draw a labelled diagram of the human heart.", type: "DRAW", marks: 3 },
    ]);
    expect(missingFigureWarnings(res.warnings)).toHaveLength(0);
  });
});
