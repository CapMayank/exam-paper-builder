import { describe, expect, it } from "vitest";
import { groupedItemPrintsOptions, optionLabel, optionMinWidth, splitStemParagraphs, subpartGridColumns } from "./compactLayout";

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

describe("optionLabel", () => {
  it("labels options as a printed question does: (a)…(j), then numbers, with no four-option limit", () => {
    expect([0, 1, 2, 3, 4, 5].map(optionLabel)).toEqual(["(a)", "(b)", "(c)", "(d)", "(e)", "(f)"]);
    expect(optionLabel(9)).toBe("(j)");
    expect(optionLabel(10)).toBe("(11)");
  });
});

describe("groupedItemPrintsOptions", () => {
  it("follows the item's own type, not the section's", () => {
    // an MCQ placed in a true/false or fill-in section keeps its options
    expect(groupedItemPrintsOptions({ type: "MCQ", options: ["x", "y"] })).toBe(true);
    expect(groupedItemPrintsOptions({ type: "ASSERTION_REASON", options: ["x", "y"] })).toBe(true);
    // a true/false item in an MCQ section prints none, even with stray options stored
    expect(groupedItemPrintsOptions({ type: "TRUE_FALSE", options: ["True", "False"] })).toBe(false);
    expect(groupedItemPrintsOptions({ type: "MCQ", options: [] })).toBe(false);
    expect(groupedItemPrintsOptions({ type: "MCQ" })).toBe(false);
  });
});
