import { describe, it, expect } from "vitest";
import { resolveSubjectHeadingLanguage, detectPaperLanguage } from "./localization";
import { localizeSectionTitle, localizeSectionInstruction } from "./localization/dictionaries";
import { getInternalChoiceSeparatorLabel } from "./internalChoiceRules";
import { MPBSE_BLUEPRINT_TEMPLATES } from "./curriculumTemplates";
import { templateSectionsToSectionsJson, ensureCurriculumSeeded } from "./curriculumInit";
import { prisma } from "./prisma";
import fs from "fs";
import path from "path";

describe("MP Board Subject-Based Heading Language & Application Seeding", () => {
  describe("1. Subject-Based Heading Language Resolution", () => {
    it("resolves Sanskrit to 'sa'", () => {
      expect(resolveSubjectHeadingLanguage("Sanskrit", "512")).toBe("sa");
      expect(resolveSubjectHeadingLanguage("संस्कृतम्", "512")).toBe("sa");
      expect(resolveSubjectHeadingLanguage("Sanskrit General", "122")).toBe("sa");
      expect(resolveSubjectHeadingLanguage(null, null, "Shemushi Class 10")).toBe("sa");
    });

    it("resolves Hindi to 'hi'", () => {
      expect(resolveSubjectHeadingLanguage("Hindi", "401")).toBe("hi");
      expect(resolveSubjectHeadingLanguage("हिंदी", "401")).toBe("hi");
      expect(resolveSubjectHeadingLanguage("हिन्दी विशिष्ट", "051")).toBe("hi");
      expect(resolveSubjectHeadingLanguage(null, null, "Kshitij Bhag 2")).toBe("hi");
    });

    it("resolves English to 'en'", () => {
      expect(resolveSubjectHeadingLanguage("English", "411")).toBe("en");
      expect(resolveSubjectHeadingLanguage("English Core", "052")).toBe("en");
      expect(resolveSubjectHeadingLanguage("English Special", "052")).toBe("en");
    });

    it("resolves Mathematics to 'en'", () => {
      expect(resolveSubjectHeadingLanguage("Mathematics", "100")).toBe("en");
      expect(resolveSubjectHeadingLanguage("Mathematics Standard", "100")).toBe("en");
      expect(resolveSubjectHeadingLanguage("Mathematics Basic", "101")).toBe("en");
      expect(resolveSubjectHeadingLanguage("Higher Mathematics", "150")).toBe("en");
    });

    it("resolves Science to 'en'", () => {
      expect(resolveSubjectHeadingLanguage("Science", "200")).toBe("en");
      expect(resolveSubjectHeadingLanguage("विज्ञान", "200")).toBe("en");
    });

    it("resolves Social Science to 'en'", () => {
      expect(resolveSubjectHeadingLanguage("Social Science", "300")).toBe("en");
      expect(resolveSubjectHeadingLanguage("सामाजिक विज्ञान", "300")).toBe("en");
    });

    it("resolves Senior Secondary Science & Commerce subjects to 'en'", () => {
      expect(resolveSubjectHeadingLanguage("Physics", "210")).toBe("en");
      expect(resolveSubjectHeadingLanguage("भौतिक शास्त्र", "210")).toBe("en");
      expect(resolveSubjectHeadingLanguage("Chemistry", "220")).toBe("en");
      expect(resolveSubjectHeadingLanguage("रसायन शास्त्र", "220")).toBe("en");
      expect(resolveSubjectHeadingLanguage("Biology", "231")).toBe("en");
      expect(resolveSubjectHeadingLanguage("जीव विज्ञान", "231")).toBe("en");
      expect(resolveSubjectHeadingLanguage("Business Studies", "311")).toBe("en");
      expect(resolveSubjectHeadingLanguage("Accountancy", "312")).toBe("en");
      expect(resolveSubjectHeadingLanguage("Economics", "313")).toBe("en");
      expect(resolveSubjectHeadingLanguage("Urdu", "508")).toBe("en");
    });
  });

  describe("2. Section Title and Instruction Localization", () => {
    it("translates Section Titles correctly across languages", () => {
      const sampleTitle = "प्रश्न 1: सही विकल्प चुनिए (Multiple Choice Questions)";

      // English paper: Must be English without Hindi
      const enTitle = localizeSectionTitle(sampleTitle, "en");
      expect(enTitle).toBe("Question 1: Multiple Choice Questions");
      expect(/[\u0900-\u097F]/.test(enTitle)).toBe(false);

      // Sanskrit paper: Must be Sanskrit
      const saTitle = localizeSectionTitle(sampleTitle, "sa");
      expect(saTitle).toContain("बहुविकल्पीयप्रश्नाः");

      // Hindi paper: Must be Hindi
      const hiTitle = localizeSectionTitle(sampleTitle, "hi");
      expect(hiTitle).toContain("सही विकल्प चुनिए");
    });

    it("translates Range Titles (e.g. Q.6 to 17) correctly", () => {
      const sampleRangeTitle = "प्रश्न 6 से 17: अतिलघुउत्तरीय प्रश्न (Very Short Answer Questions)";

      const enRange = localizeSectionTitle(sampleRangeTitle, "en");
      expect(enRange).toBe("Questions 6 to 17: Very Short Answer Questions");
      expect(/[\u0900-\u097F]/.test(enRange)).toBe(false);

      const saRange = localizeSectionTitle(sampleRangeTitle, "sa");
      expect(saRange).toContain("पर्यन्तम्");
      expect(saRange).toContain("अतिलघूत्तरीयप्रश्नाः");

      const hiRange = localizeSectionTitle(sampleRangeTitle, "hi");
      expect(hiRange).toContain("लघु उत्तरीय प्रश्न");
    });

    it("localizes Section Instructions accurately", () => {
      const hindiInstruction = "प्रत्येक प्रश्न के लिए दिए गए विकल्पों में से सही विकल्प चुनकर लिखिए।";

      const enInst = localizeSectionInstruction(hindiInstruction, "en");
      expect(enInst).toBe("Choose and write the correct option for each question.");
      expect(/[\u0900-\u097F]/.test(enInst)).toBe(false);

      const saInst = localizeSectionInstruction(hindiInstruction, "sa");
      expect(saInst).toContain("विकल्पं चित्वा लिखत");
    });

    it("provides the appropriate internal choice separator label", () => {
      expect(getInternalChoiceSeparatorLabel("en")).toBe("OR");
      expect(getInternalChoiceSeparatorLabel("hi")).toBe("अथवा");
      expect(getInternalChoiceSeparatorLabel("sa")).toBe("(अथवा)");
      expect(getInternalChoiceSeparatorLabel("bilingual")).toBe("OR (अथवा)");
    });
  });

  describe("3. Authoritative Blueprint Templates Language Audit", () => {
    it("ensures all 27 MPBSE blueprint templates have strictly compliant languages", () => {
      expect(MPBSE_BLUEPRINT_TEMPLATES.length).toBe(27);

      for (const t of MPBSE_BLUEPRINT_TEMPLATES) {
        const lang = t.language;
        if (t.subjectName === "Sanskrit") {
          expect(lang).toBe("sa");
        } else if (t.subjectName === "Hindi") {
          expect(lang).toBe("hi");
        } else {
          expect(lang).toBe("en");
        }

        // Verify sections inside the template match the language
        const sectionsJson = templateSectionsToSectionsJson(t);
        expect(sectionsJson.length).toBeGreaterThan(0);

        if (lang === "en") {
          for (const sec of sectionsJson) {
            // No Devanagari characters allowed in English structural titles
            expect(/[\u0900-\u097F]/.test(sec.title)).toBe(false);
          }
        } else if (lang === "sa") {
          const firstSec = sectionsJson[0];
          expect(firstSec.title).toContain("विकल्पं");
        } else if (lang === "hi") {
          const firstSec = sectionsJson[0];
          expect(firstSec.title).toContain("सही विकल्प");
        }
      }
    });

    it("verifies Circular 465 compliance remains 100% intact", () => {
      for (const t of MPBSE_BLUEPRINT_TEMPLATES) {
        const sections = templateSectionsToSectionsJson(t);
        for (const sec of sections) {
          if (sec.marksEach === 2) {
            expect(sec.orChoiceMode).toBe("NO_CHOICE");
            expect(sec.orAlternativeCount).toBe(0);
          }
          if (
            (sec.marksEach === 3 || sec.marksEach === 4) &&
            (t.archetype.startsWith("STANDARD_") || t.archetype.startsWith("SCIENCE_"))
          ) {
            expect(sec.orChoiceMode).toBe("FULL_OR_ALTERNATIVE");
            expect(sec.orAlternativeCount).toBe(1);
          }
        }
      }
    });
  });

  describe("4. In-Application Blueprint Seeding & Idempotency", () => {
    it("runs ensureCurriculumSeeded without throwing and leaves database consistent", async () => {
      await expect(ensureCurriculumSeeded(prisma)).resolves.not.toThrow();

      const templates = await prisma.curriculumBlueprintTemplate.findMany();
      expect(templates.length).toBe(27);

      // Verify Math template has English section titles
      const math = templates.find((t) => t.templateCode === "mpbse-10th-mathematics-standard-100-75m");
      expect(math).toBeDefined();
      const mathSections = math?.sectionsJson as any[];
      expect(mathSections[0].title).toBe("Question 1: Multiple Choice Questions");
      expect(/[\u0900-\u097F]/.test(mathSections[0].title)).toBe(false);

      // Verify Sanskrit template has Sanskrit section titles
      const sanskrit = templates.find((t) => t.templateCode === "mpbse-10th-sanskrit-512-75m");
      expect(sanskrit).toBeDefined();
      const sanskritSections = sanskrit?.sectionsJson as any[];
      expect(sanskritSections[0].title).toContain("विकल्पं");

      // Verify Physics template has English section titles
      const physics = templates.find((t) => t.templateCode === "mpbse-11th-physics-210-70m");
      expect(physics).toBeDefined();
      const physicsSections = physics?.sectionsJson as any[];
      expect(physicsSections[0].title).toBe("Question 1: Multiple Choice Questions");
      expect(/[\u0900-\u097F]/.test(physicsSections[0].title)).toBe(false);
    });

    it("calling ensureCurriculumSeeded a second time is idempotent and does not create duplicates", async () => {
      await expect(ensureCurriculumSeeded(prisma)).resolves.not.toThrow();
      const count = await prisma.curriculumBlueprintTemplate.count();
      expect(count).toBe(27);
    });
  });

  describe("5. Deployment Script Hygiene", () => {
    it("ensures scripts/deploy.sh follows professional standards without destructive reset or seeding logic", () => {
      const deployScriptPath = path.resolve(process.cwd(), "scripts/deploy.sh");
      expect(fs.existsSync(deployScriptPath)).toBe(true);

      const content = fs.readFileSync(deployScriptPath, "utf-8");
      expect(content).not.toContain("seed:mpbse");
      expect(content).not.toContain("seed-mpbse");
      expect(content).not.toContain("prisma/seed");
      expect(content).not.toContain("reset --hard");
      expect(content).toContain("--ff-only");
      expect(content).toContain("pm2 reload");
    });
  });
});
