import { describe, expect, it } from "vitest";
import { sameQuestionContent } from "./orIdentity";
import { subpartsColumn } from "./questionWrite";

const essay = (topics: string[]) => ({
  text: "Write an essay on any one of the following topics.",
  optionsJson: "[]",
  subpartsJson: subpartsColumn(topics.map((t, i) => ({ label: `(${i + 1})`, text: t, marks: 5 })), 1),
  imagePath: null,
});

describe("sameQuestionContent (OR vs main question)", () => {
  it("accepts an OR that shares the opening line but has different parts", () => {
    expect(sameQuestionContent(essay(["My Hobby", "Wonder of Science"]), essay(["My School", "A Rainy Day"]))).toBe(false);
  });

  it("accepts an MCQ OR with the same stem but different options or figure", () => {
    const a = { text: "Choose the correct option.", optionsJson: '["A","B","C","D"]', subpartsJson: "[]", imagePath: null };
    expect(sameQuestionContent(a, { ...a, optionsJson: '["W","X","Y","Z"]' })).toBe(false);
    expect(sameQuestionContent(a, { ...a, imagePath: "fig.png" })).toBe(false);
  });

  it("refuses a true copy, ignoring spacing, case and markup", () => {
    expect(sameQuestionContent(essay(["My Hobby"]), essay(["my  hobby "]))).toBe(true);
    const a = { text: "Define <b>photosynthesis</b>.", optionsJson: "[]", subpartsJson: "[]", imagePath: null };
    expect(sameQuestionContent(a, { text: "define photosynthesis.", optionsJson: null, subpartsJson: null, imagePath: null })).toBe(true);
  });

  it("refuses different texts only when everything else matches too", () => {
    const a = { text: "Explain osmosis.", optionsJson: "[]", subpartsJson: "[]" };
    expect(sameQuestionContent(a, { ...a, text: "Explain diffusion." })).toBe(false);
  });
});

describe("finalise checks with a shared opening line", () => {
  const stem = "Answer any one of the following in about 120 words.";
  const main = { text: stem, options: [], subparts: [{ text: "Describe the French Revolution.", marks: 5 }], imagePath: null };
  const alt = { text: stem, options: [], subparts: [{ text: "Explain the rise of Napoleon.", marks: 5 }], imagePath: null };

  it("does not block an OR whose parts differ", async () => {
    const { isParaphraseOrDuplicateChoice } = await import("./internalChoiceRules");
    expect(isParaphraseOrDuplicateChoice(stem, stem, { primary: main, alternative: alt }).isDuplicateOrParaphrase).toBe(false);
    expect(isParaphraseOrDuplicateChoice(stem, stem, { primary: main, alternative: { ...main } }).isDuplicateOrParaphrase).toBe(true);
    expect(isParaphraseOrDuplicateChoice(stem, stem).isDuplicateOrParaphrase).toBe(true);
  });

  it("does not block an OR that differs only by its map or figure", async () => {
    const { isParaphraseOrDuplicateChoice } = await import("./internalChoiceRules");
    const a = { text: "Locate the places on the map.", imagePath: "map-a.png" };
    expect(isParaphraseOrDuplicateChoice(a.text, a.text, { primary: a, alternative: { ...a, imagePath: "map-b.png" } }).isDuplicateOrParaphrase).toBe(false);
  });

  it("gives different content keys for the repeated-wording warning", async () => {
    const { questionContentKey, questionBodiesDiffer } = await import("./orIdentity");
    expect(questionContentKey(main)).not.toBe(questionContentKey(alt));
    expect(questionContentKey({ ...main, text: " ANSWER any one of the following in about 120 words. " })).toBe(questionContentKey(main));
    expect(questionContentKey({ text: "  " })).toBe("");
    expect(questionBodiesDiffer({ options: ["a"] }, { options: ["A "] })).toBe(false);
  });
});

describe("pre-finalisation check (validatePaperPreflight)", () => {
  const paperWith = (orSubparts: { label: string; text: string; marks: number }[]) =>
    ({
      id: "p",
      examDate: "15/03/2026",
      generalInstructions: "All questions compulsory.",
      progress: { complete: true, usedMarks: 5, totalMarks: 5 },
      blueprint: {
        name: "BP",
        book: { className: "Class 9", subject: "Social Science" },
        sections: [{ id: "s", count: 1, marksEach: 5, type: "LONG", title: "Long Answer Questions", orChoiceMode: "REQUIRED" }],
        chapters: [{ chapterId: "ch", marks: 5 }],
      },
      items: [
        {
          id: "i",
          sectionId: "s",
          position: 0,
          question: { id: "q", chapterId: "ch", type: "LONG", text: "Answer the following.", answer: "a", options: [], subparts: [{ label: "(i)", text: "Describe the French Revolution.", marks: 5 }] },
          orQuestion: { id: "o", chapterId: "ch", type: "LONG", text: "Answer the following.", answer: "a", options: [], subparts: orSubparts },
        },
      ],
    }) as never;

  it("neither blocks nor warns when the OR has the same opening line but different parts", async () => {
    const { validatePaperPreflight } = await import("./preflight");
    const report = validatePaperPreflight(paperWith([{ label: "(i)", text: "Explain the rise of Napoleon.", marks: 5 }]));
    const all = [...report.errors, ...report.warnings].map((x) => x.message).join("\n");
    expect(all).not.toMatch(/identical/i);
  });

  it("still flags a real copy", async () => {
    const { validatePaperPreflight } = await import("./preflight");
    const report = validatePaperPreflight(paperWith([{ label: "(i)", text: "Describe the French Revolution.", marks: 5 }]));
    const all = [...report.errors, ...report.warnings].map((x) => x.message).join("\n");
    expect(all).toMatch(/identical/i);
  });
});

describe("OR audit numbering", () => {
  it("names the printed question number, not the slot count, after a grouped exercise", async () => {
    const { validatePaperPreflight } = await import("./preflight");
    const blank = (n: number) => ({
      id: `fb${n}`,
      sectionId: "fb",
      position: n,
      question: { id: `qf${n}`, chapterId: "ch", type: "FILL_BLANK", text: `Blank ${n} ____.`, answer: "x", options: [], subparts: [] },
      orQuestion: null,
    });
    const copy = { chapterId: "ch", type: "LONG", text: "Describe the French Revolution.", answer: "a", options: [], subparts: [] };
    const paper = {
      id: "p",
      examDate: "15/03/2026",
      generalInstructions: "x",
      progress: { complete: true, usedMarks: 10, totalMarks: 10 },
      blueprint: {
        name: "BP",
        book: { className: "Class 9", subject: "Social Science" },
        sections: [
          { id: "fb", count: 5, marksEach: 1, type: "FILL_BLANK", title: "Fill in the blanks" },
          { id: "s", count: 1, marksEach: 5, type: "LONG", title: "Long Answer Questions", orChoiceMode: "REQUIRED" },
        ],
        chapters: [{ chapterId: "ch", marks: 10 }],
      },
      items: [1, 2, 3, 4, 5].map(blank).concat([
        { id: "i", sectionId: "s", position: 0, question: { id: "q", ...copy }, orQuestion: { id: "o", ...copy } } as never,
      ]),
    } as never;
    const report = validatePaperPreflight(paper);
    const blocking = report.errors.find((e) => /identical to the primary/.test(e.message));
    expect(blocking?.message).toMatch(/^Question 2 /);
  });
});
