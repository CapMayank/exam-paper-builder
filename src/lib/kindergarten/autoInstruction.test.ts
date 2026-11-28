import { describe, expect, it } from "vitest";
import { followAuto, followMode } from "./autoInstruction";

const AUTO = { ADD: "Count and add:", SUBTRACT: "Count and take away:" };

describe("followMode", () => {
  it("swaps an automatic instruction for the new mode's", () => {
    expect(followMode("Count and add:", AUTO, "SUBTRACT")).toBe("Count and take away:");
  });
  it("fills in a blank instruction", () => {
    expect(followMode("  ", AUTO, "ADD")).toBe("Count and add:");
  });
  it("keeps one the teacher wrote", () => {
    expect(followMode("Add the apples:", AUTO, "SUBTRACT")).toBe("Add the apples:");
  });
});

describe("followAuto", () => {
  it("follows while the text is still the old automatic one", () => {
    expect(followAuto("Underline the vowels:", "Underline the vowels:", "Circle the letter B:")).toBe("Circle the letter B:");
    expect(followAuto("", "x", "Circle the letter B:")).toBe("Circle the letter B:");
  });
  it("keeps the teacher's own wording", () => {
    expect(followAuto("Find the vowels in each word:", "Underline the vowels:", "Circle the letter B:")).toBe("Find the vowels in each word:");
  });
});
