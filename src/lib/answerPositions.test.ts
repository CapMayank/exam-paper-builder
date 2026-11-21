import { describe, expect, it } from "vitest";
import {
  formatMatchKey,
  matchHasOppositePair,
  mcqAnswerIndex,
  parseMatchKey,
  planMatch,
  planMcqPositions,
  positionReport,
  reportNeedsBalancing,
  type McqUnit,
} from "./answerPositions";

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const mcq = (n: number, answer = "A", movable = true): McqUnit => ({
  key: `q${n}`,
  options: [`right${n}`, `w1-${n}`, `w2-${n}`, `w3-${n}`],
  answer,
  movable,
});

/** The units after applying a plan. */
function apply(units: McqUnit[], plan: Map<string, { options: string[]; answer: string }>): McqUnit[] {
  return units.map((u) => {
    const c = plan.get(u.key);
    return c ? { ...u, options: c.options, answer: c.answer } : u;
  });
}

describe("planMcqPositions", () => {
  it("spreads a paper where every answer is (a) and keeps each key on its option", () => {
    const units = Array.from({ length: 20 }, (_, i) => mcq(i));
    const after = apply(units, planMcqPositions(units, seeded(5)));
    for (const u of after) expect(u.options[mcqAnswerIndex(u.options, u.answer)!]).toMatch(/^right/);
    const r = positionReport(after, []);
    expect(r.counts).toEqual([5, 5, 5, 5]);
    expect(r.longestRun).toBeLessThan(3);
    expect(reportNeedsBalancing(positionReport(units, []))).toBe(true);
    expect(reportNeedsBalancing(r)).toBe(false);
  });

  it("leaves an already balanced paper alone", () => {
    const units = ["A", "B", "C", "D", "B", "A", "D", "C"].map((a, i) => mcq(i, a));
    expect(planMcqPositions(units, seeded(1)).size).toBe(0);
  });

  it("never moves shared questions but counts them", () => {
    const units = [mcq(1, "A", false), mcq(2, "A", false), mcq(3, "A"), mcq(4, "A")];
    const plan = planMcqPositions(units, seeded(2));
    expect(plan.has("q1")).toBe(false);
    expect(plan.has("q2")).toBe(false);
    expect(plan.get("q3")?.answer).not.toBe("A"); // a third A in a row is not allowed
  });

  it("never moves position-dependent options or unreadable keys", () => {
    const fixed: McqUnit = { key: "f", options: ["x", "y", "Both (a) and (b)", "None"], answer: "A", movable: true };
    const odd: McqUnit = { key: "o", options: ["x", "y", "z", "w"], answer: "B because…", movable: true };
    const units = [mcq(1), mcq(2), fixed, odd, mcq(3)];
    const plan = planMcqPositions(units, seeded(3));
    expect(plan.has("f")).toBe(false);
    expect(plan.has("o")).toBe(false);
  });

  it("shuffles unanswered questions only when asked, and only fresh ones", () => {
    const units = [mcq(1, ""), { ...mcq(2, ""), fresh: false }];
    expect(planMcqPositions(units, seeded(4)).size).toBe(0);
    const plan = planMcqPositions(units, seeded(4), { shuffleUnanswered: true });
    expect(plan.has("q1")).toBe(true);
    expect(plan.has("q2")).toBe(false);
    expect(plan.get("q1")!.answer).toBe("");
  });
});

describe("match the columns", () => {
  it("reads and writes keys in any of the usual forms", () => {
    expect(parseMatchKey("(A) → (iii), (B) → (i), (C) → (ii)", 3)).toEqual(new Map([[0, 2], [1, 0], [2, 1]]));
    expect(parseMatchKey("A-3, B-1, C-2", 3)).toEqual(new Map([[0, 2], [1, 0], [2, 1]]));
    expect(parseMatchKey("A-ii, B-i", 3)).toBeNull(); // a row missing
    expect(formatMatchKey(new Map([[1, 0], [0, 2]]))).toBe("(A) → (iii), (B) → (i)");
  });

  it("moves the second column so nothing sits opposite its match, rewriting the key", () => {
    const u = { key: "m", text: "Match", options: ["leaf ||| chlorophyll", "root ||| xylem", "stem ||| phloem", "pore ||| stomata"], answer: "A-i, B-ii, C-iii, D-iv", movable: true };
    expect(matchHasOppositePair(u.answer, 4)).toBe(true);
    for (let seed = 1; seed < 30; seed++) {
      const c = planMatch(u, seeded(seed))!;
      expect(matchHasOppositePair(c.answer, 4)).toBe(false);
      // the key still pairs each first-column item with its own partner
      const key = parseMatchKey(c.answer, 4)!;
      const right = (row: number) => c.options[row].split(" ||| ")[1];
      expect(right(key.get(0)!)).toBe("chlorophyll");
      expect(right(key.get(3)!)).toBe("stomata");
      expect(c.options.map((o) => o.split(" ||| ")[0])).toEqual(["leaf", "root", "stem", "pore"]);
    }
  });

  it("leaves a fine key, an unreadable key, and keyless pairs alone", () => {
    const base = { key: "m", text: "Match", movable: true };
    expect(planMatch({ ...base, options: ["a", "b", "c"], answer: "A-ii, B-iii, C-i" }, seeded(1))).toBeNull();
    expect(planMatch({ ...base, options: ["a", "b", "c"], answer: "see the textbook" }, seeded(1))).toBeNull();
    expect(planMatch({ ...base, options: ["x ||| a", "y ||| b"], answer: "" }, seeded(1), { shuffleUnanswered: true })).toBeNull();
  });

  it("deranges an imported second column with no key yet", () => {
    const opts = ["a2", "b2", "c2", "d2"];
    const c = planMatch({ key: "m", text: "Match", options: opts, answer: "", movable: true }, seeded(9), { shuffleUnanswered: true })!;
    c.options.forEach((o, i) => expect(o).not.toBe(opts[i]));
  });
});
