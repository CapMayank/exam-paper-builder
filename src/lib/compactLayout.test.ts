import { describe, expect, it } from "vitest";
import { hasUniformSubpartMarks, optionMinWidth, splitStemParagraphs, statesMarksEach, subpartGridColumns } from "./compactLayout";

const sp = (...texts: string[]) => texts.map((text) => ({ text, marks: 0.5 }));

describe("subpartGridColumns", () => {
  it("puts one-word sub-items four across", () => {
    expect(subpartGridColumns(sp("Write", "Clean", "young", "bowl"), true)).toBe(4);
  });

  it("uses three columns for three medium items, never 3 + 1 for four", () => {
    expect(subpartGridColumns(sp("Uses of Trees", "Gandhiji's Life", "Elephant"), true)).toBe(3);
    expect(subpartGridColumns(sp("Uses of Trees", "Gandhiji's Life", "Elephant", "Any Festival"), true)).toBe(2);
  });

  it("keeps sentences, options and nested parts one per line", () => {
    expect(subpartGridColumns(sp("We _____(play) football in the evening.", "He _____ (eat) a sandwich for lunch."), true)).toBe(0);
    expect(subpartGridColumns([{ text: "Pick", options: ["a", "b"] }, { text: "Pick" }], true)).toBe(0);
    expect(subpartGridColumns(sp("only one"), true)).toBe(0);
  });

  it("allows longer items side by side on the wider A4 page", () => {
    const items = sp("I ____ twenty-five years old.", "I ____ from Australia. And you?");
    expect(subpartGridColumns(items, true)).toBe(2);
    expect(subpartGridColumns(sp("We _____(play) football in the evening.", "He _____ (eat) a sandwich for lunch."), false)).toBe(2);
  });
});

describe("hasUniformSubpartMarks", () => {
  it("is true only when all sub-items are worth the same", () => {
    expect(hasUniformSubpartMarks(sp("a", "b"))).toBe(true);
    expect(hasUniformSubpartMarks([{ text: "a", marks: 1 }, { text: "b", marks: 2 }])).toBe(false);
    expect(hasUniformSubpartMarks(sp("a"))).toBe(false);
  });
});

describe("optionMinWidth", () => {
  it("goes four, two or one across by option length", () => {
    expect(optionMinWidth(["100 meters", "220 meters", "400 meters", "500 meters"])).toBe("25%");
    expect(optionMinWidth(["Near the school gate", "Inside his house", "Under a cow shed", "A tree"])).toBe("50%");
    expect(optionMinWidth(["\frac{1}{2}", "2", "3", "4"])).toBe("100%");
    expect(optionMinWidth(["a", "b"], true)).toBe("100%");
  });
});

describe("splitStemParagraphs", () => {
  it("splits a passage at blank lines", () => {
    expect(splitStemParagraphs("Read the passage:\n\nPara one.\n \nPara two.")).toEqual(["Read the passage:", "Para one.", "Para two."]);
  });

  it("keeps a one-paragraph stem and display maths whole", () => {
    expect(splitStemParagraphs("One line\nsecond line")).toEqual(["One line\nsecond line"]);
    expect(splitStemParagraphs("Solve:\n\n$$x^2$$")).toHaveLength(1);
  });
});

describe("statesMarksEach", () => {
  it("recognises the per-question marks sentence", () => {
    expect(statesMarksEach("Choose the correct answer. Each question carries 1 mark.")).toBe(true);
    expect(statesMarksEach("प्रत्येक प्रश्न पर 2 अंक निर्धारित हैं।")).toBe(true);
    expect(statesMarksEach("Answer the following questions.")).toBe(false);
    expect(statesMarksEach(null)).toBe(false);
  });
});
