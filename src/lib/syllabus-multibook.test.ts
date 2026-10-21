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
    expect(eng10?.chapters.length).toBe(21);
    expect(eng10?.chapters[18].title).toContain("Reading Skills");
    expect(eng10?.chapters[19].title).toContain("Writing Skills");
    expect(eng10?.chapters[20].title).toContain("Grammar");

    const hindi10 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-10-hindi-a");
    expect(hindi10).toBeDefined();
    expect(hindi10?.isComposite).toBe(true);
    expect(hindi10?.chapters.length).toBe(18);
    expect(hindi10?.chapters[15].title).toContain("अपठित बोध");
    expect(hindi10?.chapters[16].title).toContain("रचनात्मक लेखन");
    expect(hindi10?.chapters[17].title).toContain("व्यावहारिक व्याकरण");
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

  it("includes complete NCERT presets for Hindi, Sanskrit, and Humanities across Senior Secondary and High School", () => {
    // Class 12 Hindi Core & Elective
    const hindi12Core = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-12-hindi-core");
    expect(hindi12Core).toBeDefined();
    expect(hindi12Core?.className).toBe("Class 12");
    expect(hindi12Core?.subject).toBe("Hindi / हिंदी");
    expect(hindi12Core?.isComposite).toBe(true);
    expect(hindi12Core?.subBooks).toEqual(["Aroh Part 2 (आरोह भाग 2)", "Vitan Part 2 (वितान भाग 2)"]);
    expect(hindi12Core?.chapters.length).toBe(21);
    expect(hindi12Core?.chapters[0].title).toContain("[आरोह]");
    expect(hindi12Core?.chapters[15].title).toContain("[वितान]");
    expect(hindi12Core?.chapters[18].title).toContain("अपठित बोध");
    expect(hindi12Core?.chapters[19].title).toContain("रचनात्मक लेखन");
    expect(hindi12Core?.chapters[20].title).toContain("व्यावहारिक व्याकरण");

    const hindi12Elective = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-12-hindi-elective");
    expect(hindi12Elective).toBeDefined();
    expect(hindi12Elective?.isComposite).toBe(true);
    expect(hindi12Elective?.subBooks).toEqual(["Antra Part 2 (अंतरा भाग 2)", "Antral Part 2 (अंतराल भाग 2)"]);
    expect(hindi12Elective?.chapters.length).toBe(23);

    // Class 11 Hindi Core, History, Pol Science, Geography, IP, Sociology, Psychology
    const hindi11 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-11-hindi-core");
    expect(hindi11).toBeDefined();
    expect(hindi11?.isComposite).toBe(true);
    expect(hindi11?.chapters.length).toBe(22);

    const hist11 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-11-history");
    expect(hist11).toBeDefined();
    expect(hist11?.chapters.length).toBe(7);

    const pol11 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-11-polscience");
    expect(pol11).toBeDefined();
    expect(pol11?.isComposite).toBe(true);
    expect(pol11?.chapters.length).toBe(17);

    const geo11 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-11-geography");
    expect(geo11).toBeDefined();
    expect(geo11?.isComposite).toBe(true);
    expect(geo11?.chapters.length).toBe(19);

    const ip11 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-11-ip");
    expect(ip11).toBeDefined();
    expect(ip11?.chapters.length).toBe(5);

    const soc11 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-11-sociology");
    expect(soc11).toBeDefined();
    expect(soc11?.chapters.length).toBe(10);

    const psych11 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-11-psychology");
    expect(psych11).toBeDefined();
    expect(psych11?.chapters.length).toBe(8);

    // Class 12 Geography, IP, Sociology, Psychology
    const geo12 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-12-geography");
    expect(geo12).toBeDefined();
    expect(geo12?.isComposite).toBe(true);
    expect(geo12?.chapters.length).toBe(17);

    const ip12 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-12-ip");
    expect(ip12).toBeDefined();
    expect(ip12?.chapters.length).toBe(6);

    const soc12 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-12-sociology");
    expect(soc12).toBeDefined();
    expect(soc12?.chapters.length).toBe(11);

    const psych12 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-12-psychology");
    expect(psych12).toBeDefined();
    expect(psych12?.chapters.length).toBe(7);

    // Class 10 Hindi Course B, Sanskrit, Artificial Intelligence
    const hindi10b = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-10-hindi-b");
    expect(hindi10b).toBeDefined();
    expect(hindi10b?.isComposite).toBe(true);
    expect(hindi10b?.chapters.length).toBe(20);
    expect(hindi10b?.chapters[17].title).toContain("अपठित बोध");
    expect(hindi10b?.chapters[18].title).toContain("रचनात्मक लेखन");
    expect(hindi10b?.chapters[19].title).toContain("व्यावहारिक व्याकरण");

    const sanskrit10 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-10-sanskrit");
    expect(sanskrit10).toBeDefined();
    expect(sanskrit10?.chapters.length).toBe(13);
    expect(sanskrit10?.chapters[10].title).toContain("अपठित-अवबोधनम्");
    expect(sanskrit10?.chapters[11].title).toContain("रचनात्मक-कार्यम्");
    expect(sanskrit10?.chapters[12].title).toContain("अनुप्रयुक्त-व्याकरणम्");

    const ai10 = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "cbse-10-ai");
    expect(ai10).toBeDefined();
    expect(ai10?.chapters.length).toBe(8);

    // Pre-primary Hindi
    const nurseryHindi = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "pre-nursery-hindi");
    expect(nurseryHindi).toBeDefined();
    expect(nurseryHindi?.className).toBe("Nursery");
    expect(nurseryHindi?.chapters.length).toBe(4);

    const lkgHindi = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "pre-lkg-hindi");
    expect(lkgHindi).toBeDefined();
    expect(lkgHindi?.className).toBe("LKG");

    const ukgHindi = STANDARD_CURRICULUM_PRESETS.find((p) => p.id === "pre-ukg-hindi");
    expect(ukgHindi).toBeDefined();
    expect(ukgHindi?.className).toBe("UKG");
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
