import { describe, expect, it } from "vitest";
import { chapterRole } from "./paperAutogen";
import { ensureLanguageNonChapterUnits, getLanguageNonChapterUnits, hasDomainCovered } from "./syllabusImport";

const ROLE = { reading: "PASSAGE", writing: "WRITING", grammar: "GRAMMAR" } as const;

describe("language units for Classes 1-8", () => {
  for (const subject of ["English", "Hindi", "Sanskrit"]) {
    it(`${subject}: each unit is recognised as its kind, so its marks never go to a lesson`, () => {
      const units = getLanguageNonChapterUnits(subject, "Class 7");
      expect(units.map((u) => u.domain)).toEqual(["reading", "writing", "grammar"]);
      for (const u of units) {
        expect(chapterRole(u.title, subject), u.title).toBe(ROLE[u.domain]);
        expect(hasDomainCovered(u.title, u.domain), u.title).toBe(true);
      }
    });

    it(`${subject}: titles name junior topics, not board-level ones`, () => {
      const all = getLanguageNonChapterUnits(subject, "Class 6").map((u) => u.title).join(" ");
      expect(all).not.toMatch(/note making|narration|clauses|रस|छंद/i);
    });
  }

  it("keeps the senior titles for Classes 9-12", () => {
    expect(getLanguageNonChapterUnits("English", "Class 10")[0].title).toMatch(/Note Making/);
  });

  it("adds the three units once to a Class 8 English book made by hand", () => {
    const lessons = [{ number: 1, title: "The Wise Yaksha" }, { number: 2, title: "Azad's Heroism" }];
    const { chapters, addedUnits } = ensureLanguageNonChapterUnits(lessons, "English", "Class 8");
    expect(addedUnits).toEqual(["reading", "writing", "grammar"]);
    expect(ensureLanguageNonChapterUnits(chapters, "English", "Class 8").addedUnits).toEqual([]);
  });
});
