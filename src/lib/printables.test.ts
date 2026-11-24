import { describe, expect, it } from "vitest";
import { DEFAULT_PRINTABLE_SCHOOL, fromQuery, getPrintable, gridWeight, parseOptions, PRINTABLES, schoolFontSize, toQuery } from "./printables";

describe("printables registry", () => {
  it("has unique ids and every option default is valid", () => {
    const ids = PRINTABLES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PRINTABLES) {
      const opts = parseOptions(p.id, {});
      for (const o of p.options) expect(opts[o.key]).toBe(o.default);
    }
  });

  it("every map sheet names its file and a source credit", () => {
    const maps = PRINTABLES.filter((p) => p.map);
    expect(maps.length).toBeGreaterThanOrEqual(6);
    for (const p of maps) {
      expect(p.map!.file).toMatch(/^\/printables\/maps\/[a-z-]+\.svg$/);
      expect(p.map!.credit.trim().length).toBeGreaterThan(10);
    }
  });

  it("covers each subject group", () => {
    const groups = new Set(PRINTABLES.map((p) => p.group));
    expect([...groups].sort()).toEqual(["Languages", "Maths", "Science", "Social Science"]);
  });
});

describe("parseOptions", () => {
  it("falls back to the default for an unknown select value", () => {
    expect(parseOptions("graph", { size: "7" }).size).toBe(getPrintable("graph")!.options.find((o) => o.key === "size")!.default);
  });

  it("clamps numbers into range and ignores junk", () => {
    const spec = getPrintable("number-lines")!.options.find((o) => o.key === "from")!;
    if (spec.kind !== "number") throw new Error("from must be a number option");
    expect(parseOptions("number-lines", { from: "-999" }).from).toBe(spec.min);
    expect(parseOptions("number-lines", { from: "abc" }).from).toBe(spec.default);
  });
});

describe("query round trip", () => {
  it("survives toQuery → fromQuery", () => {
    const opts = parseOptions("ruled", { spacing: "10" });
    const q = toQuery("ruled", opts, { school: "Test School", subtitle: "Class 8 · English" });
    const back = fromQuery(new URLSearchParams(q));
    expect(back).toEqual({ id: "ruled", opts, school: "Test School", subtitle: "Class 8 · English" });
  });

  it("a bogus type or missing school falls back to defaults", () => {
    const back = fromQuery(new URLSearchParams("type=bogus"));
    expect(back.id).toBe("graph");
    expect(back.school).toBe(DEFAULT_PRINTABLE_SCHOOL);
  });
});

describe("gridWeight", () => {
  it("1 mm graph: fine, mid every 5 mm, bold every 1 cm", () => {
    expect([0, 1, 4, 5, 9, 10, 15].map((i) => gridWeight(i, 1))).toEqual(["bold", "fine", "fine", "mid", "fine", "bold", "mid"]);
  });
  it("2 mm graph: only fine and bold every 1 cm (no stray mid lines)", () => {
    const w = Array.from({ length: 11 }, (_, i) => gridWeight(i, 2));
    expect(w).toEqual(["bold", "fine", "fine", "fine", "fine", "bold", "fine", "fine", "fine", "fine", "bold"]);
  });
  it("5 mm graph: fine and bold every 1 cm", () => {
    expect([0, 1, 2, 3].map((i) => gridWeight(i, 5))).toEqual(["bold", "fine", "bold", "fine"]);
  });
});

describe("schoolFontSize", () => {
  it("keeps short names at the maximum size", () => {
    expect(schoolFontSize("Sarvodaya School", 186, 6)).toBe(6);
  });
  it("shrinks a long upper-case name so a conservative estimate fits the width", () => {
    const name = "SARVODAYA ENGLISH HIGHER SECONDARY SCHOOL AND JUNIOR COLLEGE";
    const size = schoolFontSize(name, 186, 6);
    expect(size * name.length * 0.72).toBeLessThanOrEqual(186.0001);
  });
});
