import { describe, expect, it } from "vitest";
import { detectPaperLanguage } from "./localization";

// A Hindi-medium Maths paper: the subject alone detects as English.
const mathsBlueprint = { book: { subject: "Mathematics", title: "Ganit" } };

describe("detectPaperLanguage honours the chosen paper language", () => {
  it("a stored Hindi wins over a Maths subject and an English title", () => {
    expect(detectPaperLanguage({ title: "Half Yearly Mathematics", language: "hi", blueprint: mathsBlueprint })).toBe("hi");
  });

  it("a stored Sanskrit wins", () => {
    expect(detectPaperLanguage({ title: "Half Yearly Mathematics", language: "sa", blueprint: mathsBlueprint })).toBe("sa");
  });

  it("a stored bilingual wins", () => {
    expect(detectPaperLanguage({ title: "Half Yearly Mathematics", language: "bilingual", blueprint: mathsBlueprint })).toBe(
      "bilingual",
    );
  });

  it("a stored Hindi wins even when the questions are in English", () => {
    const items = [{ question: { text: "Solve x + 2 = 5" } }, { question: { text: "Find the area of a circle" } }];
    expect(detectPaperLanguage({ title: "Unit Test", language: "hi", blueprint: mathsBlueprint }, items)).toBe("hi");
  });

  it("no stored language: Devanagari title and instructions still detect Hindi (unchanged)", () => {
    const items = [{ question: { text: "निम्नलिखित प्रश्नों के उत्तर दीजिए" } }, { question: { text: "कविता का भावार्थ लिखिए" } }];
    expect(detectPaperLanguage({ title: "अर्धवार्षिक परीक्षा", generalInstructions: "सभी प्रश्न अनिवार्य हैं।" }, items)).toBe("hi");
    expect(
      detectPaperLanguage({ title: "अर्धवार्षिक परीक्षा", language: undefined, generalInstructions: "सभी प्रश्न अनिवार्य हैं।" }, items),
    ).toBe("hi");
  });

  it("the column default 'en' is treated as not chosen: Devanagari content detects Hindi", () => {
    const items = [{ question: { text: "निम्नलिखित प्रश्नों के उत्तर दीजिए" } }, { question: { text: "कविता का भावार्थ लिखिए" } }];
    expect(
      detectPaperLanguage({ title: "अर्धवार्षिक परीक्षा", language: "en", generalInstructions: "सभी प्रश्न अनिवार्य हैं।" }, items),
    ).toBe("hi");
  });

  it("the column default 'en' on a Maths paper still detects English (unchanged)", () => {
    expect(detectPaperLanguage({ title: "Half Yearly Mathematics", language: "en", blueprint: mathsBlueprint })).toBe("en");
  });
});
