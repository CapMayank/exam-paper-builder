import { describe, expect, it } from "vitest";
import { libraryGroups, subjectCategory } from "./library";

const cats = (subject: string, showAll = false, query = "") => libraryGroups({ subject, showAll, query }).map((g) => g.category);

describe("subjectCategory", () => {
  it("maps each KG subject to its activity group", () => {
    expect(subjectCategory("English")).toBe("english");
    expect(subjectCategory("Mathematics")).toBe("math");
    expect(subjectCategory("Hindi")).toBe("hindi");
    expect(subjectCategory("General Awareness (EVS)")).toBe("evs");
    expect(subjectCategory("Rhymes & Activities")).toBe("general");
  });

  it("falls back to the fun group for anything else", () => {
    expect(subjectCategory("Sanskrit")).toBe("general");
    expect(subjectCategory(undefined)).toBe("general");
  });
});

describe("libraryGroups", () => {
  it("shows the subject's own group, then fun & drawing", () => {
    expect(cats("English")).toEqual(["english", "general"]);
    expect(cats("Mathematics")).toEqual(["math", "general"]);
  });

  it("shows Hindi activities first for a Hindi worksheet", () => {
    const r = libraryGroups({ subject: "Hindi", showAll: false, query: "" });
    expect(r.map((g) => g.category)).toEqual(["hindi", "general"]);
    expect(r[0].plugins.map((p) => p.type)).toEqual(["KDG_HINDI_VARNAMALA", "KDG_HINDI_MISSING", "KDG_HINDI_FIRST_LETTER", "KDG_HINDI_LETTER_MATCH"]);
  });

  it("shows EVS activities first for an EVS worksheet", () => {
    const r = libraryGroups({ subject: "General Awareness (EVS)", showAll: false, query: "" });
    expect(r.map((g) => g.category)).toEqual(["evs", "general"]);
    expect(r[0].plugins.map((p) => p.type)).toEqual(["KDG_EVS_SORT", "KDG_EVS_NAME", "KDG_EVS_ODD_ONE", "KDG_EVS_HOME"]);
  });

  it("lists fun & drawing only once for Rhymes & Activities", () => {
    expect(cats("Rhymes & Activities")).toEqual(["general"]);
  });

  it("shows every non-empty group with the subject's first when showing all", () => {
    expect(cats("Mathematics", true)).toEqual(["math", "english", "general", "hindi", "evs"]);
    expect(cats("English", true)).toEqual(["english", "math", "general", "hindi", "evs"]);
  });

  it("searches every group by name or description", () => {
    const r = libraryGroups({ subject: "English", showAll: false, query: "COUNT" });
    const types = r.flatMap((g) => g.plugins.map((p) => p.type));
    expect(types).toContain("KDG_COUNT_ITEMS");
    for (const g of r) {
      for (const p of g.plugins) expect(`${p.label} ${p.shortLabel} ${p.description}`.toLowerCase()).toContain("count");
    }
  });

  it("returns no groups when nothing matches", () => {
    expect(libraryGroups({ subject: "English", showAll: false, query: "zzzz" })).toEqual([]);
  });

  it("gives every subject activities of its own", () => {
    for (const subject of ["English", "Mathematics", "Hindi", "General Awareness (EVS)", "Rhymes & Activities"]) {
      expect(libraryGroups({ subject, showAll: false, query: "" })[0].plugins.length, subject).toBeGreaterThanOrEqual(3);
    }
  });
});
