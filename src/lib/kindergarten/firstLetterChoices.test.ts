import { describe, expect, it } from "vitest";
import { firstLetterInstruction, padChoices, printedChoices } from "./firstLetterChoices";

describe("first-letter choices", () => {
  const words = ["Apple", "Ball", "Cat", "Duck", "Fish", "Kite", "Sun", "Egg"];

  it("keeps every letter and only moves the right one", () => {
    const row = { word: "Ball", choices: ["B", "D", "P"] };
    const out = printedChoices(row);
    expect([...out].sort()).toEqual(["B", "D", "P"]);
    expect(out.filter((c) => c !== "B")).toEqual(["D", "P"]);
  });

  it("does not always print the right letter first", () => {
    const places = words.map((word) => printedChoices({ word, choices: padChoices({ word, choices: [word[0]] }) }).indexOf(word[0]));
    expect(new Set(places).size).toBeGreaterThan(1);
  });

  it("prints the same way every render", () => {
    expect(printedChoices({ word: "Kite", choices: ["K", "T", "L"] })).toEqual(printedChoices({ word: "Kite", choices: ["K", "T", "L"] }));
  });

  it("leaves choices without the right letter alone", () => {
    expect(printedChoices({ word: "Kite", choices: ["X", "Y"] })).toEqual(["X", "Y"]);
  });

  it("fills a row up to three letters with the right one among them", () => {
    const en = padChoices({ word: "Apple", choices: ["A"] });
    expect(en).toHaveLength(3);
    expect(en).toContain("A");
    expect(new Set(en).size).toBe(3);
    const hi = padChoices({ word: "आम", choices: [] });
    expect(hi).toHaveLength(3);
    expect(hi).toContain("आ");
    hi.forEach((c) => expect(c).toMatch(/[\u0900-\u097F]/));
  });

  it("keeps a row that already has enough letters", () => {
    expect(padChoices({ word: "Cat", choices: ["C", "O", "G", "Q"] })).toEqual(["C", "O", "G", "Q"]);
  });

  it("words the instruction for each mode and script", () => {
    expect(firstLetterInstruction(true, "WRITE")).toMatch(/write/i);
    expect(firstLetterInstruction(true, "CIRCLE")).toMatch(/circle/i);
    expect(firstLetterInstruction(false, "WRITE")).toContain("लिखिए");
    expect(firstLetterInstruction(false, "CIRCLE")).toContain("गोला");
  });
});
