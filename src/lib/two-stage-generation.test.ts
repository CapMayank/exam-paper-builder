import { afterEach, describe, expect, it, vi } from "vitest";
import { keysAgree, matchPairs, truthValue } from "./answerKeyCheck";
import { generatePaperSectionWithGemini } from "./gemini";

/** A Gemini HTTP reply carrying `questions` as the model's JSON text. */
function geminiReply(questions: unknown[]): Response {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(questions) }] } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const shortQuestion = {
  slotIndex: 0,
  chapterNumber: 8,
  chapterTitle: "Motion",
  type: "SHORT",
  text: "A car covers 120 km in the first 2 hours and 60 km in the next 1 hour. Calculate its average speed for the whole journey, and state whether its motion is uniform. Give a reason.",
  options: [],
  subparts: [],
  answer: "",
  difficulty: "MEDIUM",
  cognitiveLevel: "APPLYING",
};

const section = {
  className: "Class 9",
  subject: "Science",
  sectionTitle: "Section B",
  sectionType: "SHORT",
  marksEach: 2,
  language: "en" as const,
  difficulty: "BOARD",
  generateDiagrams: false,
  apiKey: "AIzaSyFakeKeyForTwoStageTest",
  slots: [{ slotIndex: 0, chapterId: "c8", chapterNumber: 8, chapterTitle: "Motion", marks: 2 }],
};

/** Spies on fetch, answers every call with `questions`, and returns the prompts that were sent. */
function captureGemini(questions: unknown[]) {
  const prompts: string[] = [];
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    const body = JSON.parse(String((init as RequestInit)?.body ?? "{}"));
    prompts.push(
      [body.systemInstruction?.parts?.[0]?.text ?? "", ...(body.contents ?? []).flatMap((c: { parts?: Array<{ text?: string }> }) => c.parts?.map((p) => p.text ?? "") ?? [])].join("\n"),
    );
    return geminiReply(questions);
  });
  return { prompts, spy };
}

afterEach(() => vi.restoreAllMocks());

describe("two-stage generation: questions first, answers in a separate pass", () => {
  it("asks only for questions by default, and accepts a subjective question without a model answer", async () => {
    const { prompts } = captureGemini([shortQuestion]);
    const res = await generatePaperSectionWithGemini(section);

    const prompt = prompts[0];
    expect(prompt).toContain("ANSWERS ARE WRITTEN SEPARATELY");
    expect(prompt).not.toContain("Marking Scheme Rubric");
    expect(prompt).not.toContain("Model answers must be correct");
    expect(prompt).not.toContain('"explanation": "Brief explanation');

    expect(res.success).toBe(true);
    expect(res.isMock).toBe(false);
    expect(prompts).toHaveLength(1); // no retry for the missing answer
    expect(res.data[0].text).toBe(shortQuestion.text);
    expect(res.data[0].answer).toBe("");
  });

  it("still requires the short key of an objective item", async () => {
    const mcq = {
      ...shortQuestion,
      type: "MCQ",
      text: "A body moving with uniform velocity has:",
      options: ["zero acceleration", "constant non-zero acceleration", "increasing acceleration", "decreasing speed"],
    };
    const { prompts } = captureGemini([mcq]);
    const res = await generatePaperSectionWithGemini({ ...section, sectionType: "MCQ", marksEach: 1, slots: [{ ...section.slots[0], marks: 1 }] });
    expect(prompts[0]).toContain('"answer": "exact text of the correct option"');
    // the reply had no key, so it was sent back and finally replaced by the offline template
    expect(prompts.length).toBeGreaterThan(1);
    expect(prompts[1]).toMatch(/missing an answer key/);
    expect(res.isMock).toBe(true);
  });

  it("keeps the single-pass prompt when asked for answers together", async () => {
    const { prompts } = captureGemini([{ ...shortQuestion, answer: "Average speed = 180 km / 3 h = 60 km/h. Not uniform: unequal distances in equal intervals." }]);
    const res = await generatePaperSectionWithGemini({ ...section, answerMode: "together" });
    expect(prompts[0]).toContain("step-wise model answer and marking scheme");
    expect(prompts[0]).not.toContain("ANSWERS ARE WRITTEN SEPARATELY");
    expect(res.success).toBe(true);
    expect(res.data[0].answer).toMatch(/60 km\/h/);
  });
});

describe("independent answer-key check", () => {
  const opts = ["Kosi", "Gandak", "Son", "Ghaghara"];

  it("compares MCQ keys by option, whether written as a letter or as the option text", () => {
    expect(keysAgree("MCQ", opts, "A", "Kosi")).toBe(true);
    expect(keysAgree("MCQ", opts, "(a)", "A")).toBe(true);
    expect(keysAgree("MCQ", opts, "Kosi", "C")).toBe(false);
    expect(keysAgree("MCQ", opts, "A", "I am not sure")).toBeNull();
  });

  it("reads True/False in English, Hindi and Sanskrit", () => {
    expect(truthValue("True (सत्य)")).toBe(true);
    expect(truthValue("असत्य")).toBe(false);
    expect(truthValue("आम्")).toBe(true);
    expect(truthValue("न")).toBe(false);
    expect(keysAgree("TRUE_FALSE", [], "False", "असत्य")).toBe(true);
    expect(keysAgree("TRUE_FALSE", [], "True", "False")).toBe(false);
  });

  it("matches blanks loosely but not different words", () => {
    expect(keysAgree("FILL_BLANK", [], "Photosynthesis", "photosynthesis.")).toBe(true);
    expect(keysAgree("FILL_BLANK", [], "mitochondria", "the mitochondria")).toBe(true);
    expect(keysAgree("FILL_BLANK", [], "kinetic", "potential")).toBe(false);
  });

  it("compares match pairings whatever arrow is used", () => {
    expect(matchPairs("(A)-(ii), (B)-(i), (C)-(iv)").get("B")).toBe("i");
    expect(keysAgree("MATCH_COLUMN", [], "(A)-(ii), (B)-(i), (C)-(iii)", "(A) → (ii), (B) → (i), (C) → (iii)")).toBe(true);
    expect(keysAgree("MATCH_COLUMN", [], "A-2, B-1, C-3", "A-1, B-2, C-3")).toBe(false);
  });

  it("does not compare subjective answers", () => {
    expect(keysAgree("SHORT", [], "Because…", "Since…")).toBeNull();
  });
});
