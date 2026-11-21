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
