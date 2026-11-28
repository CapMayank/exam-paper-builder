import { describe, expect, it } from "vitest";
import { addMatraInstruction, matrasIn, stripMatra } from "./activities/hindiMissing";
import { getKindergartenActivity, parseKindergartenConfig } from "./registry";
import type { EvsNameConfig, HindiMissingConfig, MissingLettersConfig, NumberGridConfig } from "./types";

const load = <T>(type: string, cfg: unknown) => parseKindergartenConfig<T>(type, JSON.stringify(cfg));
const valid = (type: string, cfg: unknown) => getKindergartenActivity(type)!.validateConfig(cfg).valid;

describe("saved configs from before the new options", () => {
  it("Missing Letters without hints", () => {
    const old = { instruction: "Fill:", items: [{ word: "cat", blanks: [1], clipartId: "cat" }] };
    const cfg = load<MissingLettersConfig>("KDG_MISSING_LETTERS", old);
    expect(cfg).toMatchObject(old);
    expect(cfg.hints ?? []).toEqual([]); // no "Use these letters" box
    expect(valid("KDG_MISSING_LETTERS", old)).toBe(true);
  });

  it("Name the picture with TICK and WRITE", () => {
    for (const answer of ["TICK", "WRITE"] as const) {
      const old = { answer, instruction: "x", rows: [{ clipartId: "car", name: "Car", choices: ["Car", "Kite"] }] };
      expect(load<EvsNameConfig>("KDG_EVS_NAME", old)).toEqual(old);
      expect(valid("KDG_EVS_NAME", old)).toBe(true);
    }
  });

  it("Hindi missing VARNA and MATRA", () => {
    for (const mode of ["VARNA", "MATRA"] as const) {
      const old = { mode, instruction: "x", hints: [], rows: [{ text: "क ख ग", blanks: [1] }] };
      expect(load<HindiMissingConfig>("KDG_HINDI_MISSING", old)).toEqual(old);
      expect(valid("KDG_HINDI_MISSING", old)).toBe(true);
    }
  });

  it("Number grid stays ascending", () => {
    const old = { startNumber: 1, endNumber: 3, columns: 5, step: 1, instruction: "x", fillDirection: "ROW", cells: [{ value: 1, isBlank: false }] };
    const cfg = load<NumberGridConfig>("KDG_NUMBER_GRID", old);
    expect(cfg.descending ?? false).toBe(false);
    expect(cfg).toMatchObject(old);
  });

  it("Hindi first letter is unchanged", () => {
    const old = { answerStyle: "CIRCLE", instruction: "x", rows: [{ clipartId: "mango", word: "आम", choices: ["आ", "क"] }] };
    expect(load("KDG_HINDI_FIRST_LETTER", old)).toEqual(old);
  });
});

describe("English picture to first letter", () => {
  it("is an English activity with English defaults that print and save", () => {
    const p = getKindergartenActivity("KDG_FIRST_LETTER")!;
    expect(p.category).toBe("english");
    const cfg = p.defaultConfig("English") as { answerStyle: string; rows: { word: string }[] };
    expect(cfg.answerStyle).toBe("WRITE");
    expect(cfg.rows.map((r) => r.word)).toEqual(["Apple", "Ball", "Cat", "Duck", "Fish", "Kite"]);
    expect(p.validateConfig(cfg).valid).toBe(true);
  });
});

describe("add the matra", () => {
  it("takes the chosen matra out of the word", () => {
    expect(stripMatra("सितार", "ि")).toBe("सतार");
    expect(stripMatra("किताब", "ि")).toBe("कताब");
    expect(stripMatra("पुनः", "ः")).toBe("पुन");
    expect(stripMatra("सितार", "")).toBe("सितार");
  });

  it("lists the matras a word carries", () => {
    expect(matrasIn("मिठाई")).toEqual(["ि", "ा"]);
    expect(matrasIn("अतः")).toEqual(["ः"]);
  });

  it("words the instruction for the matra", () => {
    expect(addMatraInstruction("ि")).toBe("इ की मात्रा ( ि ) लगाइए:");
    expect(addMatraInstruction("ः")).toBe("विसर्ग ( ः ) लगाइए:");
  });
});
