import { describe, expect, it } from "vitest";
import { markLettersPlugin } from "./markLetters";
import { hindiVarnamalaPlugin } from "./hindiVarnamala";

describe("mark the letters", () => {
  const c = markLettersPlugin.defaultConfig();
  it("needs letters to look for", () => {
    expect(markLettersPlugin.validateConfig(c).valid).toBe(true);
    expect(markLettersPlugin.validateConfig({ ...c, targets: [] }).valid).toBe(false);
  });
  it("refuses a word with none of the letters, which would leave nothing to mark", () => {
    expect(markLettersPlugin.validateConfig({ ...c, words: ["Cat", "Sky"] }).valid).toBe(false);
    expect(markLettersPlugin.validateConfig({ ...c, words: ["Cat", "SKY"], targets: ["y"] }).valid).toBe(false);
    expect(markLettersPlugin.validateConfig({ ...c, words: ["Toy", "SKY"], targets: ["y"] }).valid).toBe(true);
  });
});

describe("varnamala", () => {
  it("needs at least one letter", () => {
    const c = hindiVarnamalaPlugin.defaultConfig();
    expect(hindiVarnamalaPlugin.validateConfig(c).valid).toBe(true);
    expect(hindiVarnamalaPlugin.validateConfig({ ...c, letters: [] }).valid).toBe(false);
  });
});
