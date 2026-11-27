import { describe, expect, it } from "vitest";
import { libraryGroups, subjectCategory } from "./library";

const cats = (subject: string, showAll = false, query = "") => libraryGroups({ subject, showAll, query }).groups.map((g) => g.category);

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
    expect(libraryGroups({ subject: "English", showAll: false, query: "" }).comingSoon).toBe(false);
  });

  it("offers English letters and fun for Hindi while Hindi has none of its own", () => {
    const r = libraryGroups({ subject: "Hindi", showAll: false, query: "" });
    expect(r.groups.map((g) => g.category)).toEqual(["english", "general"]);
    expect(r.comingSoon).toBe(true);
  });

  it("offers fun for EVS while EVS has none of its own", () => {
    const r = libraryGroups({ subject: "General Awareness (EVS)", showAll: false, query: "" });
    expect(r.groups.map((g) => g.category)).toEqual(["general"]);
    expect(r.comingSoon).toBe(true);
  });

  it("lists fun & drawing only once for Rhymes & Activities", () => {
    expect(cats("Rhymes & Activities")).toEqual(["general"]);
  });

  it("shows every non-empty group with the subject's first when showing all", () => {
    expect(cats("Mathematics", true)).toEqual(["math", "english", "general"]);
    expect(cats("English", true)).toEqual(["english", "math", "general"]);
  });

  it("searches every group by name or description", () => {
    const r = libraryGroups({ subject: "English", showAll: false, query: "COUNT" });
    const types = r.groups.flatMap((g) => g.plugins.map((p) => p.type));
    expect(types).toContain("KDG_COUNT_ITEMS");
    for (const g of r.groups) {
      for (const p of g.plugins) expect(`${p.label} ${p.shortLabel} ${p.description}`.toLowerCase()).toContain("count");
    }
  });

  it("returns no groups when nothing matches", () => {
    expect(libraryGroups({ subject: "English", showAll: false, query: "zzzz" }).groups).toEqual([]);
  });
});
