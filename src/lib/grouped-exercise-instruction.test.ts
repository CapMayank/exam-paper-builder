import { describe, expect, it } from "vitest";
import { resolveGroupedExerciseInstruction, withoutMarksNote } from "./layout";

describe("withoutMarksNote: the exercise line carries the formula, so marks sentences are dropped", () => {
  it.each([
    ["Each question carries 1 mark.", ""],
    ["All questions carry 2 marks.", ""],
    ["Each blank is worth 1 mark.", ""],
    ["(1 mark each)", ""],
    ["Fill in the blanks with suitable words. Each question carries 1 mark.", "Fill in the blanks with suitable words."],
    ["Write True or False (1 mark each).", "Write True or False."],
    ["प्रत्येक प्रश्न 1 अंक का है।", ""],
    ["रिक्त स्थानों की पूर्ति कीजिए। प्रत्येक प्रश्न 1 अंक का है।", "रिक्त स्थानों की पूर्ति कीजिए।"],
    ["प्रत्येकं प्रश्नः 1 अङ्कः।", ""],
  ])("%s → %s", (input, expected) => {
    expect(withoutMarksNote(input)).toBe(expected);
  });

  it("leaves prompts that mention marks only in passing alone", () => {
    expect(withoutMarksNote("Fill in the blanks with the correct words.")).toBe("Fill in the blanks with the correct words.");
    expect(withoutMarksNote("Choose the correct answer.")).toBe("Choose the correct answer.");
  });
});

describe("resolveGroupedExerciseInstruction", () => {
  it("a section instruction that only states marks gives way to the form's own prompt", () => {
    expect(resolveGroupedExerciseInstruction("Each question carries 1 mark.", "FILL_BLANK", false, "en")).toMatch(/fill in the blanks/i);
    expect(resolveGroupedExerciseInstruction("प्रत्येक प्रश्न 1 अंक का है।", "TRUE_FALSE", false, "hi")).not.toMatch(/अंक/);
  });

  it("a real prompt the teacher wrote is kept", () => {
    expect(resolveGroupedExerciseInstruction("Fill in the blanks using words from the box.", "FILL_BLANK", false, "en")).toBe(
      "Fill in the blanks using words from the box.",
    );
  });
});
