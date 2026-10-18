import { describe, expect, it } from "vitest";
import { STANDARD_CURRICULUM_PRESETS } from "./syllabusImport";
import { parseSyllabusWithGemini } from "./gemini";

describe("Multi-Book & Granular Syllabus System", () => {
  it("includes multi-book composite presets with isComposite flag and subBooks", () => {
    const sst10 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-10-sst");
    expect(sst10).toBeDefined();
    expect(sst10?.isComposite).toBe(true);
    expect(sst10?.subBooks).toEqual(["History", "Geography", "Civics", "Economics"]);
    expect(sst10?.chapters.length).toBe(22);

    // Verify sub-book tag in chapter titles
    expect(sst10?.chapters[0].title).toContain("[History]");
    expect(sst10?.chapters[5].title).toContain("[Geography]");
    expect(sst10?.chapters[12].title).toContain("[Civics]");
    expect(sst10?.chapters[17].title).toContain("[Economics]");

    const eng10 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-10-english");
    expect(eng10).toBeDefined();
    expect(eng10?.isComposite).toBe(true);
    expect(eng10?.subBooks).toEqual(["First Flight", "Footprints Without Feet"]);
    expect(eng10?.chapters.length).toBe(18);

    const hindi10 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-10-hindi-a");
    expect(hindi10).toBeDefined();
    expect(hindi10?.isComposite).toBe(true);
    expect(hindi10?.chapters.length).toBe(15);
  });

  it("covers primary, middle, and senior classes (Classes 1 to 12)", () => {
    // Classes 1-5
    const class1Math = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-1-maths");
    expect(class1Math).toBeDefined();
    expect(class1Math?.className).toBe("Class 1");

    const class3Evs = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-3-evs");
    expect(class3Evs).toBeDefined();
    expect(class3Evs?.className).toBe("Class 3");

    const class5Math = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-5-maths");
    expect(class5Math).toBeDefined();
    expect(class5Math?.className).toBe("Class 5");

    // Classes 6-8
    const class6Sci = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-6-science");
    expect(class6Sci).toBeDefined();
    expect(class6Sci?.className).toBe("Class 6");

    const class7Sci = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-7-science");
    expect(class7Sci).toBeDefined();
    expect(class7Sci?.className).toBe("Class 7");

    const class8Sci = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-8-science");
    expect(class8Sci).toBeDefined();
    expect(class8Sci?.className).toBe("Class 8");

    const class12Chem = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-12-chemistry");
    expect(class12Chem).toBeDefined();
    expect(class12Chem?.className).toBe("Class 12");
    expect(class12Chem?.isComposite).toBe(true);
  });

  it("ensures all presets have sequential, non-duplicate, positive chapter numbers", () => {
    for (const preset of STANDARD_CURRICULUM_PRESETS) {
      const numbers = preset.chapters.map((c) => c.number);
      expect(new Set(numbers).size).toBe(numbers.length);
      for (let i = 0; i < numbers.length; i++) {
        expect(numbers[i]).toBe(i + 1);
        expect(preset.chapters[i].title.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("parses unformatted private book index text using parseSyllabusWithGemini fallback", async () => {
    const rawIndex = `TABLE OF CONTENTS
Chapter 1: Food: Where Does It Come From? (pg 5)
Chapter 2: Components of Food - Balanced Diet (pg 14)
Chapter 3: Fibre to Fabric (pg 25)
Chapter 4: Sorting Materials into Groups (pg 38)
Chapter 5: Separation of Substances (pg 51)`;

    const result = await parseSyllabusWithGemini({
      rawText: rawIndex,
      className: "Class 6",
      subject: "Science",
      apiKey: null, // forces robust fallback parser
    });

    expect(result.success).toBe(true);
    expect(result.data.books.length).toBeGreaterThanOrEqual(1);
    const book = result.data.books[0];
    expect(book.chapters.length).toBe(5);
    expect(book.chapters[0].title).toBe("Food: Where Does It Come From?");
    expect(book.chapters[1].title).toBe("Components of Food - Balanced Diet");
    expect(book.chapters[4].title).toBe("Separation of Substances");
  });
});
