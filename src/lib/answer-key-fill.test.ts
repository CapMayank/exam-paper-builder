import { describe, expect, it, vi } from "vitest";
import {
  fillMissingAnswers,
  findMissingAnswer,
  mergeGeneratedAnswer,
  normalizeGeneratedAnswer,
  type AnswerNeed,
  type AnswerSource,
  type GeneratedAnswer,
} from "./answerKeyFill";

function q(partial: Partial<AnswerSource> & { id: string }): AnswerSource {
  return { type: "SHORT", text: "Explain osmosis.", optionsJson: "[]", subpartsJson: "[]", answer: "", ...partial };
}

/** An in-memory question bank whose save merges like the API route does. */
function bank(rows: AnswerSource[]) {
  const store = new Map(rows.map((r) => [r.id, { ...r }]));
  const save = vi.fn(async (id: string, generated: GeneratedAnswer) => {
    const current = store.get(id)!;
    const merged = mergeGeneratedAnswer(current, generated);
    if (!merged.filledMain && merged.filledPaths.length === 0) return findMissingAnswer(current) ? "nothing" : "kept";
    store.set(id, { ...current, answer: merged.answer, subpartsJson: merged.subpartsJson });
    return "saved" as const;
  });
  return { store, save };
}

describe("findMissingAnswer", () => {
  it("skips questions that already have an answer", () => {
    expect(findMissingAnswer(q({ id: "a", answer: "Water moves across a membrane." }))).toBeNull();
  });

  it("treats a whitespace-only answer as missing", () => {
    expect(findMissingAnswer(q({ id: "a", answer: "   " }))).toMatchObject({ id: "a", main: true, subparts: [] });
  });

  it("asks only for the subparts that are blank, including nested ones", () => {
    const subpartsJson = JSON.stringify({
      attemptCount: 2,
      items: [
        { label: "(i)", text: "Define pH", marks: 1, answer: "Negative log of H+ concentration" },
        { label: "(ii)", text: "Pick one", marks: 1, options: ["Acid", "Base"] },
        { label: "(iii)", text: "Parts", marks: 2, subparts: [{ label: "(a)", text: "x", marks: 1 }, { label: "(b)", text: "y", marks: 1, answer: "done" }] },
      ],
    });
    const need = findMissingAnswer(q({ id: "c", type: "CASE_STUDY", subpartsJson }));
    expect(need?.main).toBe(false);
    expect(need?.subparts.map((s) => s.path)).toEqual(["1", "2.0"]);
    expect(need?.subparts[0].options).toEqual(["Acid", "Base"]);
  });

  it("does not need a question-level answer when every subpart is answered", () => {
    const subpartsJson = JSON.stringify([{ label: "(i)", text: "t", marks: 1, answer: "a" }]);
    expect(findMissingAnswer(q({ id: "c", type: "CASE_STUDY", subpartsJson }))).toBeNull();
  });

  it("ignores kindergarten activities", () => {
    expect(findMissingAnswer(q({ id: "k", type: "KDG_TRACE_WRITE" }))).toBeNull();
  });
});

describe("normalizeGeneratedAnswer", () => {
  const options = ["Mitochondria", "Ribosome", "Nucleus", "Golgi body"];

  it("stores MCQ answers as an option letter", () => {
    expect(normalizeGeneratedAnswer("MCQ", options, "(c)")).toBe("C");
    expect(normalizeGeneratedAnswer("MCQ", options, "Nucleus")).toBe("C");
  });

  it("drops MCQ answers that don't map to an option", () => {
    expect(normalizeGeneratedAnswer("MCQ", options, "E")).toBe("");
    expect(normalizeGeneratedAnswer("MCQ", options, "the cell wall")).toBe("");
  });

  it("accepts True/False in English or Hindi only", () => {
    expect(normalizeGeneratedAnswer("TRUE_FALSE", [], "true (सत्य)")).toBe("True (सत्य)");
    expect(normalizeGeneratedAnswer("TRUE_FALSE", [], "असत्य")).toBe("असत्य");
    expect(normalizeGeneratedAnswer("TRUE_FALSE", [], "Maybe")).toBe("");
  });

  it("keeps match-the-column pairings and bilingual text as written", () => {
    expect(normalizeGeneratedAnswer("MATCH_COLUMN", ["x", "y"], " (A) → (ii), (B) → (i) ")).toBe("(A) → (ii), (B) → (i)");
    expect(normalizeGeneratedAnswer("SHORT", [], "Photosynthesis (प्रकाश संश्लेषण)")).toBe("Photosynthesis (प्रकाश संश्लेषण)");
  });
});

describe("mergeGeneratedAnswer", () => {
  it("never replaces an answer that is already stored", () => {
    const merged = mergeGeneratedAnswer(q({ id: "a", answer: "Teacher's answer" }), { answer: "AI answer" });
    expect(merged).toMatchObject({ answer: "Teacher's answer", filledMain: false, filledPaths: [] });
  });

  it("fills only blank subparts and keeps every other field and the container shape", () => {
    const subpartsJson = JSON.stringify({
      attemptCount: 1,
      items: [
        { id: "s1", label: "(i)", text: "a", marks: 1, answer: "kept", extra: 7 },
        { id: "s2", label: "(ii)", text: "b", marks: 1, options: ["Yes", "No"] },
      ],
    });
    const merged = mergeGeneratedAnswer(q({ id: "c", type: "CASE_STUDY", subpartsJson }), {
      subparts: { "0": "overwritten?", "1": "B" },
    });
    expect(merged.filledPaths).toEqual(["1"]);
    expect(JSON.parse(merged.subpartsJson)).toEqual({
      attemptCount: 1,
      items: [
        { id: "s1", label: "(i)", text: "a", marks: 1, answer: "kept", extra: 7 },
        { id: "s2", label: "(ii)", text: "b", marks: 1, options: ["Yes", "No"], answer: "B" },
      ],
    });
  });
});

describe("fillMissingAnswers", () => {
  it("generates and saves only the missing answers, reusing stored ones without an AI call", async () => {
    const { store, save } = bank([
      q({ id: "stored", answer: "Already here" }),
      q({ id: "mcq", type: "MCQ", text: "Powerhouse of the cell?", optionsJson: JSON.stringify(["Mitochondria", "Ribosome"]) }),
      q({ id: "long", type: "LONG" }),
    ]);
    const generate = vi.fn(async (batch: AnswerNeed[]) => new Map(batch.map((n) => [n.id, { answer: n.id === "mcq" ? "A" : "Model answer" }])));

    const result = await fillMissingAnswers({ questions: [...store.values()], generate, save });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][0].map((n) => n.id)).toEqual(["mcq", "long"]);
    expect(result).toMatchObject({ alreadyAnswered: 1, requested: 2, saved: ["mcq", "long"], failed: [] });
    expect(store.get("stored")!.answer).toBe("Already here");
    expect(store.get("mcq")!.answer).toBe("A");
    expect(store.get("long")!.answer).toBe("Model answer");
  });

  it("makes no AI call when every question already has an answer", async () => {
    const generate = vi.fn();
    const save = vi.fn();
    const result = await fillMissingAnswers({ questions: [q({ id: "a", answer: "x" })], generate, save });
    expect(generate).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(result).toMatchObject({ alreadyAnswered: 1, requested: 0 });
  });

  it("counts a question used twice in the paper only once", async () => {
    const generate = vi.fn(async (batch: AnswerNeed[]) => new Map(batch.map((n) => [n.id, { answer: "x" }])));
    const { save } = bank([q({ id: "a" })]);
    await fillMissingAnswers({ questions: [q({ id: "a" }), q({ id: "a" })], generate, save });
    expect(generate.mock.calls[0][0]).toHaveLength(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("splits into batches and keeps the successful batches when one fails", async () => {
    const rows = ["q1", "q2", "q3", "q4", "q5"].map((id) => q({ id }));
    const { store, save } = bank(rows);
    const generate = vi.fn(async (batch: AnswerNeed[]) => {
      if (batch.some((n) => n.id === "q3")) throw new Error("Gemini quota exhausted");
      return new Map(batch.map((n) => [n.id, { answer: `answer ${n.id}` }]));
    });

    const result = await fillMissingAnswers({ questions: rows, generate, save, batchSize: 2 });

    expect(generate).toHaveBeenCalledTimes(3);
    expect(result.saved).toEqual(["q1", "q2", "q5"]);
    expect(result.failed).toEqual([
      { id: "q3", reason: "Gemini quota exhausted" },
      { id: "q4", reason: "Gemini quota exhausted" },
    ]);
    expect(store.get("q3")!.answer).toBe("");
    expect(store.get("q5")!.answer).toBe("answer q5");
  });

  it("reports questions the AI skipped or answered with an unusable value", async () => {
    const rows = [
      q({ id: "skipped" }),
      q({ id: "badMcq", type: "MCQ", optionsJson: JSON.stringify(["a", "b"]) }),
      q({ id: "ok" }),
    ];
    const { save } = bank(rows);
    const generate = async () =>
      new Map<string, GeneratedAnswer>([
        ["badMcq", { answer: "Z" }],
        ["ok", { answer: "fine" }],
      ]);
    const result = await fillMissingAnswers({ questions: rows, generate, save });
    expect(result.saved).toEqual(["ok"]);
    expect(result.failed.map((f) => f.id)).toEqual(["skipped", "badMcq"]);
  });

  it("saves the subparts that came back and lists the ones still missing", async () => {
    const subpartsJson = JSON.stringify([
      { label: "(i)", text: "a", marks: 1 },
      { label: "(ii)", text: "b", marks: 1 },
    ]);
    const { store, save } = bank([q({ id: "cs", type: "CASE_STUDY", subpartsJson })]);
    const generate = async () => new Map([["cs", { subparts: { "0": "first" } }]]);

    const result = await fillMissingAnswers({ questions: [...store.values()], generate, save });

    expect(result.saved).toEqual(["cs"]);
    expect(result.failed).toEqual([{ id: "cs", reason: "No answer generated for part (ii)." }]);
    const parts = JSON.parse(store.get("cs")!.subpartsJson);
    expect(parts[0].answer).toBe("first");
    expect(parts[1].answer).toBeUndefined();
  });

  it("keeps an answer a teacher entered while generation was running", async () => {
    const { store, save } = bank([q({ id: "a" })]);
    const generate = async () => {
      store.set("a", { ...store.get("a")!, answer: "Teacher typed this" });
      return new Map([["a", { answer: "AI answer" }]]);
    };
    const result = await fillMissingAnswers({ questions: [q({ id: "a" })], generate, save });
    expect(result).toMatchObject({ saved: [], keptTeacherAnswer: ["a"], failed: [] });
    expect(store.get("a")!.answer).toBe("Teacher typed this");
  });

  it("reports a save error for that question only", async () => {
    const generate = async (batch: AnswerNeed[]) => new Map(batch.map((n) => [n.id, { answer: "x" }]));
    const save = vi.fn(async (id: string) => {
      if (id === "b") throw new Error("database is locked");
      return "saved" as const;
    });
    const result = await fillMissingAnswers({ questions: [q({ id: "a" }), q({ id: "b" })], generate, save });
    expect(result.saved).toEqual(["a"]);
    expect(result.failed).toEqual([{ id: "b", reason: "Could not save: database is locked" }]);
  });
});
