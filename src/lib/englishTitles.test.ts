import { describe, expect, it } from "vitest";
import { SUBJECTS_SEED } from "./curriculumData";
import { englishTitle, englishTitleFor } from "./englishTitles";
import { builtInSyllabusPresets } from "./presets";
import { STANDARD_CURRICULUM_PRESETS } from "./syllabusImport";

const DEV = /[\u0900-\u097F]/;
const language = (s: string) => /hindi|sanskrit|हिंदी|संस्कृत/i.test(s);

describe("English book and chapter names", () => {
  it("reduces both bilingual forms to the English name", () => {
    expect(englishTitle("Crop Production and Management (फसल उत्पादन एवं प्रबंध)")).toBe("Crop Production and Management");
    expect(englishTitle("संख्या पद्धति (Number Systems)")).toBe("Number Systems");
    expect(englishTitle("Super Senses (कैसे पहचाना चींटी ने दोस्त को?)")).toBe("Super Senses");
  });

  it("keeps the part and numbering of a composite book's chapter", () => {
    expect(englishTitle("[समकालीन भारत-1 (भूगोल Class IX)] भारत आकार और स्थिति")).toBe(
      "[Contemporary India I (Geography, Class IX)] India: Size and Location",
    );
    expect(englishTitle("[History] 2. From Trade to Territory (व्यापार से साम्राज्य तक)")).toBe("[History] 2. From Trade to Territory");
  });

  it("leaves English titles and Hindi / Sanskrit books alone", () => {
    expect(englishTitle("Rational Numbers")).toBe("Rational Numbers");
    expect(englishTitleFor("Hindi", "हार की जीत")).toBe("हार की जीत");
    expect(englishTitleFor("Sanskrit / संस्कृतम्", "सुभाषितानि")).toBe("सुभाषितानि");
  });

  it("names every book and chapter of the seeded subjects in English, except Hindi and Sanskrit", () => {
    for (const s of SUBJECTS_SEED) {
      if (language(s.name)) continue;
      for (const t of s.textbooks) {
        expect(DEV.test(t.title), `${s.name}: ${t.title}`).toBe(false);
        for (const c of t.chapters) expect(DEV.test(c.title), `${s.name}: ${c.title}`).toBe(false);
      }
    }
  });

  it("names every preset chapter in English, except Hindi and Sanskrit books", () => {
    for (const list of [STANDARD_CURRICULUM_PRESETS, builtInSyllabusPresets()]) {
      for (const p of list) {
        if (language(p.subject)) continue;
        for (const c of p.chapters) expect(DEV.test(c.title), `${p.id}: ${c.title}`).toBe(false);
      }
    }
  });

  it("keeps Hindi and Sanskrit chapters in their own script", () => {
    const hindi = SUBJECTS_SEED.find((s) => s.name === "Hindi")!;
    expect(hindi.textbooks.some((t) => t.chapters.some((c) => DEV.test(c.title)))).toBe(true);
  });
});
