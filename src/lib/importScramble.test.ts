import { describe, expect, it } from "vitest";
import { derangement, scrambleImportedPaper, scrambleMatch, scrambleMcq } from "./importScramble";
import type { PaperImportData } from "./paperImport";

/** A seeded generator so shuffles are repeatable. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("scrambleMcq", () => {
  const opts = ["Fe2O3.xH2O", "FeO", "Fe3O4", "FeCl3"];

  it("keeps every option and moves a letter answer with its option", () => {
    for (let seed = 1; seed < 40; seed++) {
      const r = scrambleMcq(opts, "A", seeded(seed));
      expect([...r.options].sort()).toEqual([...opts].sort());
      expect(r.options["ABCD".indexOf(r.answer!)]).toBe("Fe2O3.xH2O");
    }
  });

  it("follows an answer given as the option text", () => {
    const r = scrambleMcq(opts, "Fe3O4", seeded(7));
    expect(r.options["ABCD".indexOf(r.answer!)]).toBe("Fe3O4");
  });

  it("puts the correct option at different positions over many questions", () => {
    const rand = seeded(42);
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) seen.add(scrambleMcq(opts, "A", rand).answer!);
    expect(seen).toEqual(new Set(["A", "B", "C", "D"]));
  });

  it("shuffles questions with no answer yet (the external AI reply)", () => {
    const rand = seeded(3);
    const firsts = new Set<string>();
    for (let i = 0; i < 30; i++) firsts.add(scrambleMcq(opts, undefined, rand).options[0]);
    expect(firsts.size).toBeGreaterThan(1);
  });

  it("leaves options alone when one refers to another by position", () => {
    const o = ["Oxygen", "Hydrogen", "Both (a) and (b)", "None of these"];
    expect(scrambleMcq(o, "C", seeded(1))).toEqual({ options: o, answer: "C" });
    const p = ["Cell", "Tissue", "Organ", "All of the above"];
    expect(scrambleMcq(p, undefined, seeded(1)).options).toEqual(p);
  });

  it("leaves options alone when the answer cannot be pinned to one option", () => {
    expect(scrambleMcq(opts, "B — because rust is hydrated", seeded(1))).toEqual({ options: opts, answer: "B — because rust is hydrated" });
  });
});

describe("scrambleMatch", () => {
  const colB = ["Chlorophyll", "Stomata", "Xylem", "Phloem", "Guard cells"];

  it("never leaves a second-column item opposite the item it was written beside", () => {
    for (let seed = 1; seed < 60; seed++) {
      const out = scrambleMatch(colB, undefined, seeded(seed));
      expect([...out].sort()).toEqual([...colB].sort());
      out.forEach((item, i) => expect(item).not.toBe(colB[i]));
    }
  });

  it("leaves a question that already has a key or ready-made pairs", () => {
    expect(scrambleMatch(colB, "A-ii, B-i", seeded(1))).toEqual(colB);
    const pairs = ["Leaf ||| Chlorophyll", "Root ||| Xylem"];
    expect(scrambleMatch(pairs, undefined, seeded(1))).toEqual(pairs);
  });

  it("derangement always moves every index", () => {
    for (let n = 2; n < 8; n++) {
      const p = derangement(n, () => 0); // worst case: the shuffle never moves anything
      expect(p.every((v, i) => v !== i)).toBe(true);
    }
  });
});

describe("scrambleImportedPaper", () => {
  const data: PaperImportData = {
    title: "T",
    sections: [
      {
        title: "A",
        questions: [
          { text: "Q1", type: "MCQ", marks: 1, options: ["w", "x", "y", "z"], answer: "A" },
          {
            text: "Q2",
            type: "SHORT",
            marks: 2,
            orQuestion: { text: "Q2 or", type: "MCQ", marks: 2, options: ["p", "q", "r", "s"], answer: "D" },
          },
          {
            text: "Case",
            type: "CASE_STUDY",
            marks: 4,
            subparts: [{ label: "(i)", text: "Pick", marks: 1, options: ["1", "2", "3", "4"], answer: "B" }],
          },
          { text: "Match", type: "MATCH_COLUMN", marks: 4, options: ["k1", "k2", "k3", "k4"] },
          { text: "Explain", type: "SHORT", marks: 3, options: [] },
          { text: "AR", type: "ASSERTION_REASON", marks: 1, options: ["a", "b", "c", "d"] },
        ],
      },
    ],
  };
  const out = scrambleImportedPaper(data, seeded(11));
  const [mcq, withOr, caseStudy, match, short, ar] = out.sections[0].questions;

  it("keeps each answer on its option: main, OR and MCQ parts", () => {
    expect(mcq.options!["ABCD".indexOf(mcq.answer!)]).toBe("w");
    expect(withOr.orQuestion!.options!["ABCD".indexOf(withOr.orQuestion!.answer!)]).toBe("s");
    const sp = caseStudy.subparts![0];
    expect(sp.options!["ABCD".indexOf(sp.answer!)]).toBe("2");
  });

  it("scrambles match columns, and leaves other types and the input untouched", () => {
    match.options!.forEach((o, i) => expect(o).not.toBe(["k1", "k2", "k3", "k4"][i]));
    expect(short).toEqual(data.sections[0].questions[4]);
    expect(ar.options).toEqual(["a", "b", "c", "d"]); // standard order stays
    expect(data.sections[0].questions[0].options).toEqual(["w", "x", "y", "z"]);
  });
});
