import { describe, expect, it } from "vitest";
import { aiQuestionPayload } from "./aiQuestionPayload";

const base = { bookId: "b", chapterId: "c", type: "SHORT", slotMarks: 4, difficulty: "MEDIUM" as const, skill: "APPLYING" };

describe("aiQuestionPayload", () => {
  it("saves the skill: generated level mapped to the four skills, else the chosen skill, else null", () => {
    expect(aiQuestionPayload({ ...base, generated: { text: "Q" } }).cognitiveLevel).toBe("APPLYING");
    expect(aiQuestionPayload({ ...base, generated: { text: "Q", cognitiveLevel: "EVALUATING" } }).cognitiveLevel).toBe("ANALYZING");
    expect(aiQuestionPayload({ ...base, generated: { text: "Q", cognitiveLevel: "CREATING" } }).cognitiveLevel).toBe("ANALYZING");
    expect(aiQuestionPayload({ ...base, skill: "", generated: { text: "Q", cognitiveLevel: "junk" } }).cognitiveLevel).toBeNull();
    expect(aiQuestionPayload({ ...base, skill: "", generated: { text: "Q" } }).cognitiveLevel).toBeNull();
  });

  it("keeps a generated difficulty only when it is one of the three values", () => {
    expect(aiQuestionPayload({ ...base, generated: { text: "Q", difficulty: "HARD" } }).difficulty).toBe("HARD");
    expect(aiQuestionPayload({ ...base, generated: { text: "Q", difficulty: "tricky" } }).difficulty).toBe("MEDIUM");
    expect(aiQuestionPayload({ ...base, generated: { text: "Q" } }).difficulty).toBe("MEDIUM");
  });

  it("cleans sub-parts, labels them and makes them add up to the slot", () => {
    const two = aiQuestionPayload({ ...base, generated: { text: "Q", subparts: [{ text: "a", marks: 1 }, { text: "b", marks: 1 }] } });
    expect(two.subparts.map((p) => p.marks)).toEqual([1, 3]); // what normalizeSubpartMarks returns today
    expect(two.subparts[0].label).toBe("(1)");
    expect(two.attemptCount).toBeUndefined();
  });

  it("keeps attemptCount only when it is a real choice among the parts", () => {
    const any = aiQuestionPayload({ ...base, generated: { text: "Q", attemptCount: 1, subparts: [{ text: "a", marks: 4 }, { text: "b", marks: 4 }] } });
    expect(any.attemptCount).toBe(1);
    expect(aiQuestionPayload({ ...base, generated: { text: "Q", attemptCount: 2, subparts: [{ text: "a" }, { text: "b" }] } }).attemptCount).toBeUndefined();
  });

  it("carries the fixed fields", () => {
    const p = aiQuestionPayload({ ...base, generated: { text: "Q", answer: "A", options: ["x"] } });
    expect(p).toMatchObject({ bookId: "b", chapterId: "c", type: "SHORT", text: "Q", answer: "A", options: ["x"], spaceMm: 0, showGrid: false });
    expect(aiQuestionPayload({ ...base, generated: { text: "Q" } }).answer).toBe("");
  });
});
