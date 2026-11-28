import { describe, expect, it } from "vitest";
import { wordTokens } from "../hindi";
import { configForMode, hindiMissingDefaultConfig } from "./hindiMissing";

const blanked = (rows: { text: string; blanks: number[] }[]) => rows.flatMap((r) => r.blanks.map((b) => wordTokens(r.text)[b]));

describe("hindi missing: switching what is missing", () => {
  it("the matra default's help box holds exactly the missing pieces", () => {
    const c = configForMode(hindiMissingDefaultConfig(), "MATRA");
    expect([...c.hints].sort()).toEqual([...blanked(c.rows)].sort());
  });

  it("swaps untouched starting rows for the other kind's", () => {
    expect(configForMode(hindiMissingDefaultConfig(), "ADD_MATRA").rows[0].answer).toBe("लिख");
  });

  it("gives teacher words a blank to fill when leaving add-the-matra", () => {
    const own = { ...configForMode(hindiMissingDefaultConfig(), "ADD_MATRA") };
    own.rows = [{ text: "कतब", answer: "किताब", blanks: [] }];
    const next = configForMode(own, "MATRA");
    expect(next.rows[0].text).toBe("किताब");
    expect(next.rows[0].blanks.length).toBeGreaterThan(0);
  });

  it("prints teacher words without their matra when moving to add-the-matra", () => {
    const own = { ...hindiMissingDefaultConfig(), mode: "MATRA" as const, rows: [{ text: "किताब", blanks: [0] }] };
    const next = configForMode(own, "ADD_MATRA");
    expect(next.matra).toBe("ि");
    expect(next.rows[0]).toMatchObject({ answer: "किताब", text: "कताब" });
  });
});
