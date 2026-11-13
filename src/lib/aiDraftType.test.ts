import { describe, expect, it } from "vitest";
import { aiDraftType } from "./aiDraftType";

describe("aiDraftType", () => {
  it("keeps a real question type", () => {
    expect(aiDraftType("LONG", [])).toBe("LONG");
    expect(aiDraftType("MCQ", ["a", "b"])).toBe("MCQ");
    expect(aiDraftType("CASE_STUDY", [])).toBe("CASE_STUDY");
  });
  it("ignores case and surrounding spaces, and accepts a type's label", () => {
    expect(aiDraftType("mcq", [])).toBe("MCQ");
    expect(aiDraftType(" short ", [])).toBe("SHORT");
    expect(aiDraftType("Long Answer", [])).toBe("LONG");
    expect(aiDraftType("Short Answer", [])).toBe("SHORT");
  });
  it("falls back to SHORT for a type the app does not have", () => {
    expect(aiDraftType("NUMERICAL", [])).toBe("SHORT");
    expect(aiDraftType("", undefined)).toBe("SHORT");
    expect(aiDraftType(undefined, [])).toBe("SHORT");
  });
  it("falls back to MCQ when the unknown type came with options", () => {
    expect(aiDraftType("NUMERICAL", ["1", "2", "3", "4"])).toBe("MCQ");
  });
});
