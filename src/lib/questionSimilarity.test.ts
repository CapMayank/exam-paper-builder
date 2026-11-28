import { describe, expect, it } from "vitest";
import {
  SIMILAR_OPEN,
  findSimilar,
  normalizeQuestionText,
  prepareCandidates,
  questionTokens,
  similarity,
} from "./questionSimilarity";

describe("questionSimilarity", () => {
  it("scores identical text after normalization as 1", () => {
    expect(similarity("What is Photosynthesis?", "what is  photosynthesis")).toBe(1);
  });
  it("scores reordered identical words as 1", () => {
    expect(
      similarity("Explain photosynthesis in green plants", "green plants explain photosynthesis in"),
    ).toBe(1);
  });
  it("ignores LaTeX macros and punctuation", () => {
    expect(normalizeQuestionText("Find \\frac{1}{2} of 10.")).toBe(normalizeQuestionText("Find {1}{2} of 10"));
  });
  it("strips HTML tags without corrupting math comparisons", () => {
    expect(similarity("<p>What is <b>photosynthesis</b>?</p>", "What is photosynthesis?")).toBe(1);
    expect(normalizeQuestionText("Solve x < 5 for positive integers")).toContain("5");
  });
  it("tokenizes Hindi text", () => {
    expect(questionTokens("प्रकाश संश्लेषण क्या है? समझाइए।").size).toBeGreaterThanOrEqual(3);
    expect(similarity("प्रकाश संश्लेषण क्या है? समझाइए।", "प्रकाश संश्लेषण क्या होता है? समझाइए।")).toBeGreaterThan(0.6);
  });
  it("matches QuestionDuplicateModal pairs at the 0.75 threshold", () => {
    // Near-duplicate pairs that QuestionDuplicateModal flags (>= 0.75)
    expect(
      similarity(
        "Which of the following is a Kharif crop grown in rainy season?",
        "Which of the following is a Kharif crop in rainy season?",
      ),
    ).toBeGreaterThanOrEqual(SIMILAR_OPEN);
    expect(
      similarity(
        "प्रकाश संश्लेषण क्या है? समझाइए।",
        "प्रकाश संश्लेषण क्या होता है? समझाइए।",
      ),
    ).toBeGreaterThanOrEqual(SIMILAR_OPEN);
    // Distinct questions sharing a topic stay below 0.75
    expect(
      similarity(
        "Explain the process of photosynthesis in green plants.",
        "List two differences between aerobic and anaerobic respiration in plants.",
      ),
    ).toBeLessThan(SIMILAR_OPEN);
  });
  it("returns nothing below the token minimum", () => {
    const c = prepareCandidates([{ id: "a", text: "Define the following." }]);
    expect(findSimilar("Define the following.", c)).toEqual([]);
  });
  it("ranks, limits to 3 and excludes ids", () => {
    const c = prepareCandidates([
      { id: "self", text: "Explain the process of photosynthesis in green plants" },
      { id: "a", text: "Explain the process of photosynthesis in plants" },
      { id: "b", text: "Explain photosynthesis process in green plants briefly" },
      { id: "c", text: "Explain the process of photosynthesis in green leaves" },
      { id: "d", text: "Explain the process of photosynthesis in green algae" },
      { id: "far", text: "Name the capital of India" },
    ]);
    const r = findSimilar("Explain the process of photosynthesis in green plants", c, { excludeIds: ["self"] });
    expect(r).toHaveLength(3);
    expect(r.map((m) => m.item.id)).not.toContain("self");
    expect(r.map((m) => m.item.id)).not.toContain("far");
    expect(r[0].score).toBeGreaterThanOrEqual(r[1].score);
  });
});
