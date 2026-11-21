import { describe, expect, it } from "vitest";
import { questionAnswerStatus } from "./answerKeyStatus";
import type { QuestionDto } from "./types";

const q = (over: Partial<QuestionDto>) => ({ id: "q", type: "SHORT", text: "Explain.", options: [], subparts: [], answer: "", ...over }) as QuestionDto;

describe("questionAnswerStatus", () => {
  it("reads answered, missing, partly answered and no-key questions", () => {
    expect(questionAnswerStatus(q({ answer: "Because…" })).status).toBe("answered");
    expect(questionAnswerStatus(q({})).status).toBe("missing");
    const parts = [
      { label: "(i)", text: "a", marks: 1, answer: "x" },
      { label: "(ii)", text: "b", marks: 1, answer: "" },
    ];
    expect(questionAnswerStatus(q({ type: "CASE_STUDY", subparts: parts }))).toEqual({ status: "partial", missingParts: ["(ii)"] });
    expect(questionAnswerStatus(q({ type: "CASE_STUDY", subparts: parts.map((p) => ({ ...p, answer: "" })) })).status).toBe("missing");
    expect(questionAnswerStatus(q({ type: "KDG_TRACE" })).status).toBe("not-needed");
  });
});
