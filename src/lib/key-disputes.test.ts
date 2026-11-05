import { describe, expect, it } from "vitest";
import { checkedAnswerAsKey } from "./keyDisputes";

describe("accepting the key check's answer", () => {
  it("keeps the key's own words for True/False", () => {
    expect(checkedAnswerAsKey({ type: "TRUE_FALSE", storedAnswer: "सत्य", solverAnswer: "False (असत्य)" })).toBe("असत्य");
    expect(checkedAnswerAsKey({ type: "TRUE_FALSE", storedAnswer: "असत्य", solverAnswer: "True" })).toBe("सत्य");
    expect(checkedAnswerAsKey({ type: "TRUE_FALSE", storedAnswer: "आम्", solverAnswer: "False" })).toBe("न");
    expect(checkedAnswerAsKey({ type: "TRUE_FALSE", storedAnswer: "True", solverAnswer: "false" })).toBe("False");
  });

  it("uses the checker's answer as given for other types", () => {
    expect(checkedAnswerAsKey({ type: "MCQ", storedAnswer: "C", solverAnswer: " B " })).toBe("B");
  });
});
