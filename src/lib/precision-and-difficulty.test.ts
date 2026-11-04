import { describe, expect, it } from "vitest";
import { precisionIssues } from "./precisionChecks";
import {
  DEFAULT_DIFFICULTY_PROFILE,
  difficultyPromptBlock,
  legacyDifficulty,
  planSlotDifficulties,
  resolveDifficultyProfile,
} from "./difficultyProfiles";
import { getSubjectPromptDirectives, slotQuestionForm } from "./subjectPrompts";

const codes = (q: Parameters<typeof precisionIssues>[0]) => precisionIssues(q).map((i) => i.code);

describe("precision checks (errors found in a real Class 9 Science paper)", () => {
  it("flags a fill-in-the-blank that contains its own answer", () => {
    expect(
      codes({ type: "FILL_BLANK", text: "Energy possessed by an object due to its position is called ________ potential energy.", answer: "potential" }),
    ).toContain("FILL_BLANK_GIVEAWAY");
  });
  it("accepts the corrected blank and bracketed hints/choices", () => {
    expect(codes({ type: "FILL_BLANK", text: "Energy possessed by an object due to its position or configuration is called ________ energy.", answer: "potential" })).toEqual([]);
    expect(codes({ type: "FILL_BLANK", text: "Students ________ submit their work on time. (must / might)", answer: "must" })).toEqual([]);
    expect(codes({ type: "FILL_BLANK", text: "The SI unit of force is ________.", answer: "newton" })).toEqual([]);
  });

  it("flags molecular mass of an ionic compound, in words, formula, LaTeX and Hindi", () => {
    expect(codes({ type: "SHORT", text: "Calculate the molecular mass of aluminium sulphate.", answer: "342 u" })).toContain("MOLECULAR_MASS_OF_IONIC");
    expect(codes({ type: "SHORT", text: "Calculate the molecular mass of $\\text{Al}_2(\\text{SO}_4)_3$.", answer: "342 u" })).toContain("MOLECULAR_MASS_OF_IONIC");
    expect(codes({ type: "SHORT", text: "Find the molecular mass of NaCl.", answer: "58.5 u" })).toContain("MOLECULAR_MASS_OF_IONIC");
    expect(codes({ type: "SHORT", text: "एल्युमिनियम सल्फेट का आण्विक द्रव्यमान ज्ञात कीजिए।", answer: "342 u" })).toContain("MOLECULAR_MASS_OF_IONIC");
  });
  it("accepts molecular mass of molecules and formula unit mass of ionic compounds", () => {
    expect(codes({ type: "SHORT", text: "Calculate the molecular mass of H2O and CO2.", answer: "18 u, 44 u" })).toEqual([]);
    expect(codes({ type: "SHORT", text: "Calculate the formula unit mass of aluminium sulphate.", answer: "342 u" })).toEqual([]);
  });

  it("flags 'draw a textual outline' and accepts a plain drawing instruction", () => {
    expect(codes({ type: "LONG", text: "Draw a neat, well-labelled textual outline of the fractional distillation apparatus.", answer: "" })).toContain(
      "CONTRADICTORY_DRAWING_TASK",
    );
    expect(codes({ type: "LONG", text: "Draw a neat, well-labelled diagram of the fractional distillation apparatus.", answer: "" })).toEqual([]);
  });

  it("flags verifying a law with no data, accepts it when data is given", () => {
    expect(
      codes({ type: "LONG", text: "Verify the law of constant proportions using samples of carbon dioxide obtained from different sources.", answer: "" }),
    ).toContain("VERIFY_WITHOUT_DATA");
    expect(
      codes({
        type: "LONG",
        text: "Sample A of CO2 contains 3 g carbon and 8 g oxygen; sample B contains 6 g carbon and 16 g oxygen. Verify the law of constant proportions.",
        answer: "",
      }),
    ).toEqual([]);
  });
});

describe("difficulty profiles", () => {
  it("defaults to the school-exam profile (tougher than board) and maps legacy values", () => {
    expect(DEFAULT_DIFFICULTY_PROFILE).toBe("SCHOOL");
    expect(resolveDifficultyProfile(undefined).id).toBe("SCHOOL");
    expect(resolveDifficultyProfile("BALANCED").id).toBe("BOARD");
    expect(resolveDifficultyProfile("EASY").id).toBe("FOUNDATION");
    expect(resolveDifficultyProfile("HARD").id).toBe("CHALLENGE");
    expect(legacyDifficulty("SCHOOL")).toBe("BALANCED");
  });

  it("gives exactly one level per slot and follows the mix", () => {
    const levels = planSlotDifficulties(20, 2, "SCHOOL");
    expect(levels).toHaveLength(20);
    const hard = levels.filter((l) => l === "HARD").length;
    const easy = levels.filter((l) => l === "EASY").length;
    expect(hard).toBe(7); // 35%
    expect(easy).toBe(3); // 15%
  });

  it("makes long questions harder than objective ones, and the school profile harder than board", () => {
    const hardShare = (p: string, marks: number) => planSlotDifficulties(100, marks, p).filter((l) => l === "HARD").length;
    expect(hardShare("SCHOOL", 4)).toBeGreaterThan(hardShare("SCHOOL", 1));
    expect(hardShare("SCHOOL", 3)).toBeGreaterThan(hardShare("BOARD", 3));
    // a 3-question 4-mark section in the school profile gets at least one hard question
    expect(planSlotDifficulties(3, 4, "SCHOOL")).toContain("HARD");
  });

  it("describes the profile for the model", () => {
    expect(difficultyPromptBlock("SCHOOL")).toMatch(/ABOVE board level/);
    expect(difficultyPromptBlock("SCHOOL")).toMatch(/Target difficulty/);
  });
});

describe("subject directives", () => {
  it("routes Social Science to the Social Science examiner, not Science", () => {
    expect(getSubjectPromptDirectives("Social Science", "Class 9").subjectName).toBe("Social Science");
    expect(getSubjectPromptDirectives("सामाजिक विज्ञान", "Class 9").subjectName).toBe("Social Science");
    expect(getSubjectPromptDirectives("Political Science", "Class 11").subjectName).toBe("Social Science");
    expect(getSubjectPromptDirectives("Science", "Class 9").subjectName).toBe("Science");
    expect(getSubjectPromptDirectives("Biology", "Class 11").subjectName).toBe("Biology");
  });

  it("rotates Science question forms through numerical, diagram, application and graph for a Motion chapter", () => {
    const forms = [0, 1, 2, 3, 4].map((i) => slotQuestionForm("Science", "Motion", "SHORT", 3, i));
    expect(forms.some((f) => /numerical/.test(f))).toBe(true);
    expect(forms.some((f) => /graph/.test(f))).toBe(true);
    expect(forms.some((f) => /application/.test(f))).toBe(true);
    expect(slotQuestionForm("Science", "The Fundamental Unit of Life", "LONG", 4, 0)).toMatch(/diagram/);
    expect(slotQuestionForm("Hindi", "पाठ 1", "SHORT", 3, 0)).toBe("");
  });
});
