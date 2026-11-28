import { describe, expect, it } from "vitest";
import { sharedChoices, withSharedChoices } from "./sentenceBlank";

const row = (choices: string[]) => ({ text: "I am a ___.", choices });

describe("shared word box", () => {
  it("writes the one word list into every sentence, so new sentences get it too", () => {
    const rows = withSharedChoices([row(["circle", "square"]), row([])], ["circle", "square", "triangle"]);
    expect(rows.map((r) => r.choices)).toEqual([
      ["circle", "square", "triangle"],
      ["circle", "square", "triangle"],
    ]);
    expect(sharedChoices(rows)).toEqual(["circle", "square", "triangle"]);
  });

  it("drops a word removed from the box from every sentence", () => {
    const rows = withSharedChoices([row(["circle", "square"]), row(["square", "circle"])], ["circle"]);
    expect(sharedChoices(rows)).toEqual(["circle"]);
  });
});
