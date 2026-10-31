import { describe, expect, it } from "vitest";
import {
  cleanQuestionStatement,
  detectPaperLanguage,
  formatExerciseFormula,
  formatMarksLabel,
  getColumnLabels,
  getPaperLocale,
  getQuestionTypeLabel,
  getSharedInstruction,
  localizeSectionTitle,
} from "./constants";
import { getInternalChoiceSeparatorLabel } from "./internalChoiceRules";
import { reconcileSectionGroupInstruction, resolveGroupedExerciseInstruction } from "./layout";
import { validateGeneratedQuestion, validateGeneratedSection } from "./questionValidator";
import type { GenerationContract } from "./curriculumContract";
import type { PaperData, QuestionDto } from "./types";

describe("Comprehensive Question Paper Localization Architecture", () => {
  describe("1. Pure Sanskrit Paper Localization (MPBSE Shemushi Class 10 Exam Pattern)", () => {
    const sanskritPaper: any = {
      id: "paper-sanskrit-10th",
      title: "हाईस्कूल मुख्य परीक्षा वर्ष 2026",
      schoolName: "SARVODAYA HIGHER SECONDARY SCHOOL, LAKHNADON",
      subjectCode: "122",
      paperSet: "A",
      language: "sa",
      blueprint: {
        id: "bp-1",
        name: "Class 10 Sanskrit Annual Blueprint",
        subjectCode: "122",
        className: "Class 10",
        examType: "BOARD",
        totalMarks: 75,
        targetDurationMinutes: 180,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        book: {
          id: "book-sanskrit",
          title: "शेमुषी भाग-2",
          subject: "संस्कृतम्",
          className: "Class 10",
          chapters: [],
          subjectCode: "122",
        },
        sections: [
          { id: "s1", title: "SECTION A: MULTIPLE CHOICE QUESTIONS", type: "MCQ", count: 6, marksEach: 1 },
          { id: "s2", title: "SECTION B: FILL IN THE BLANKS", type: "FILL_BLANK", count: 6, marksEach: 1 },
          { id: "s3", title: "SECTION C: TRUE OR FALSE", type: "TRUE_FALSE", count: 6, marksEach: 1 },
          { id: "s4", title: "SECTION D: MATCH THE FOLLOWING", type: "MATCH_COLUMN", count: 6, marksEach: 1 },
          { id: "s5", title: "SECTION E: ONE WORD ANSWERS", type: "VERY_SHORT", count: 6, marksEach: 1 },
          { id: "s6", title: "SECTION F: VERY SHORT ANSWER QUESTIONS", type: "SHORT", count: 5, marksEach: 2 },
          { id: "s7", title: "SECTION G: SHORT ANSWER QUESTIONS", type: "SHORT", count: 3, marksEach: 3 },
          { id: "s8", title: "SECTION H: LONG ANSWER QUESTIONS", type: "LONG", count: 3, marksEach: 4 },
        ],
      },
    };

    it("accurately detects Sanskrit language from paper metadata", () => {
      expect(detectPaperLanguage(sanskritPaper as PaperData)).toBe("sa");
    });

    it("detects Sanskrit even when paper.language is defaulted to 'en' in SQLite DB", () => {
      const dbDefaultPaper = {
        ...sanskritPaper,
        language: "en", // DB default
      };
      expect(detectPaperLanguage(dbDefaultPaper as PaperData)).toBe("sa");
    });

    it("localizes multi-part section titles like (PART 1) and (PART 2) to authentic Sanskrit (भागः १)", () => {
      expect(localizeSectionTitle("SECTION F: SHORT ANSWER QUESTIONS (PART 1)", "sa")).toBe(
        "खण्डः 'च' : लघूत्तरीयप्रश्नाः (भागः १)"
      );
      expect(localizeSectionTitle("SECTION G: SHORT ANSWER QUESTIONS (PART 2)", "sa")).toBe(
        "खण्डः 'छ' : लघूत्तरीयप्रश्नाः (भागः २)"
      );
    });

    it("converts Hindi section titles to authentic Sanskrit for Sanskrit papers", () => {
      expect(localizeSectionTitle("खण्ड 'क' : सही विकल्प चुनिए", "sa")).toBe(
        "खण्डः 'क' : बहुविकल्पीयप्रश्नाः"
      );
      expect(localizeSectionTitle("खण्ड 'ख' : रिक्त स्थानों की पूर्ति", "sa")).toBe(
        "खण्डः 'ख' : रिक्तस्थानपूर्तिः"
      );
    });

    it("renders authentic Sanskrit section titles dynamically without English leakage", () => {
      const saLocale = getPaperLocale("sa");
      const expectedSections = [
        "खण्डः 'क' : बहुविकल्पीयप्रश्नाः",
        "खण्डः 'ख' : रिक्तस्थानपूर्तिः",
        "खण्डः 'ग' : सत्यासत्यनिरूपणम्",
        "खण्डः 'घ' : उचितयुग्ममेलनम्",
        "खण्डः 'ङ' : एकपदेन उत्तराणि",
        "खण्डः 'च' : अतिलघूत्तरीयप्रश्नाः",
        "खण्डः 'छ' : लघूत्तरीयप्रश्नाः",
        "खण्डः 'ज' : दीर्घोत्तरीयप्रश्नाः",
      ];

      sanskritPaper.blueprint?.sections.forEach((sec: any, idx: number) => {
        const localized = saLocale.section.formatSectionHeader(String.fromCharCode(65 + idx), sec.title);
        expect(localized).toBe(expectedSections[idx]);
        // Zero English words in section titles
        expect(localized).not.toMatch(/[a-zA-Z]/);
      });
    });

    it("formats Sanskrit header labels authentically with zero English leakage", () => {
      const locale = getPaperLocale("sa");
      expect(locale.header.timeAllowed).toBe("समयः :");
      expect(locale.header.maxMarks).toBe("पूर्णाङ्काः :");
      expect(locale.header.totalQuestions).toBe("कुलप्रश्नाः :");
      expect(locale.header.subjectCode).toBe("विषय-सङ्केताङ्कः :");
      expect(locale.header.set).toBe("सेट्");
      expect(locale.header.rollNo).toBe("अनुक्रमाङ्कः :");
      expect(locale.header.studentName).toBe("छात्रस्य नाम :");
      expect(locale.header.invigilatorSign).toBe("निरीक्षक-हस्ताक्षरम् :");
      expect(locale.header.date).toBe("दिनाङ्कः :");
      expect(locale.header.classLabel).toBe("कक्षा :");
      expect(locale.header.subjectLabel).toBe("विषयः :");
      expect(locale.header.generalInstructionsLabel).toBe("सामान्यनिर्देशाः");
    });

    it("formats Sanskrit exam time in hours (होराः) and minutes (निमेषाः)", () => {
      const locale = getPaperLocale("sa");
      expect(locale.header.timeFormat(180)).toBe("3 होराः (3 घण्टाः)");
      expect(locale.header.timeFormat(90)).toBe("1 होरा 30 निमेषाः");
      expect(locale.header.timeFormat(45)).toBe("45 निमेषाः");
    });

    it("uses authentic Sanskrit grammatical declension for marks (अङ्कः / अङ्कौ / अङ्काः)", () => {
      expect(formatMarksLabel(1, "sa")).toBe("[1 अङ्कः]");
      expect(formatMarksLabel(2, "sa")).toBe("[2 अङ्कौ]");
      expect(formatMarksLabel(3, "sa")).toBe("[3 अङ्काः]");
      expect(formatMarksLabel(4, "sa")).toBe("[4 अङ्काः]");
      expect(formatMarksLabel(5, "sa")).toBe("[5 अङ्काः]");
    });

    it("formats Sanskrit section group summary and exercise formulas", () => {
      const locale = getPaperLocale("sa");
      expect(locale.section.formatGroupSummary(6, 6)).toBe("6 प्रश्नाः · 6 अङ्काः");
      expect(locale.section.formatTypeFormula(6, 1, "MCQ")).toBe("6 प्रश्नाः × 1 अङ्कः = 6 अङ्काः");
      expect(locale.section.formatTypeFormula(5, 2, "SHORT")).toBe("5 प्रश्नाः × 2 अङ्कौ = 10 अङ्काः");
      expect(locale.section.formatTypeFormula(3, 4, "LONG")).toBe("3 प्रश्नाः × 4 अङ्काः = 12 अङ्काः");
      expect(formatExerciseFormula(6, 1, "sa")).toBe("(6 × 1 = 6 अङ्काः)");
    });

    it("formats Sanskrit column match labels without English (स्तम्भ 'अ' / स्तम्भ 'ब')", () => {
      const labels = getColumnLabels("sa");
      expect(labels.colA).toBe("स्तम्भ 'अ'");
      expect(labels.colB).toBe("स्तम्भ 'ब'");
      expect(labels.colA).not.toMatch(/[a-zA-Z]/);
      expect(labels.colB).not.toMatch(/[a-zA-Z]/);
    });

    it("uses pure Sanskrit internal choice separator (अथवा)", () => {
      expect(getInternalChoiceSeparatorLabel("sa")).toBe("(अथवा)");
      expect(getInternalChoiceSeparatorLabel("sa", "MPBSE")).toBe("(अथवा)");
      expect(getInternalChoiceSeparatorLabel("sa", "CBSE")).toBe("(अथवा)");
    });

    it("renders authentic Sanskrit footer and end of paper annotations", () => {
      const locale = getPaperLocale("sa");
      expect(locale.footer.pto).toBe("कृपया पृष्ठं परिवर्तयतु →");
      expect(locale.footer.endOfPaper).toBe("*** प्रश्नपत्रं समाप्तम् ***");
      expect(locale.footer.pageOf(1, 4)).toBe("पृष्ठम् 1 / 4");
    });

    it("reconciles Sanskrit section range numbers accurately", () => {
      const reconciled = reconcileSectionGroupInstruction("प्रश्नक्रमाङ्कः 1 तः 5 पर्यन्तम् वस्तुनिष्ठप्रश्नाः सन्ति", 1, 6);
      expect(reconciled).toBe("प्रश्नक्रमाङ्कः 1 तः 6 पर्यन्तम् वस्तुनिष्ठप्रश्नाः सन्ति");
    });

    it("resolves English blueprint instructions into authentic Sanskrit shared instructions", () => {
      expect(resolveGroupedExerciseInstruction("Choose the correct option", "MCQ", false, "sa")).toBe(
        "उचितविकल्पं चित्वा लिखत:"
      );
      expect(resolveGroupedExerciseInstruction("Fill in the blanks with appropriate words", "FILL_BLANK", false, "sa")).toBe(
        "कोष्ठकेषु प्रदत्तशब्दैः रिक्तस्थानानि पूरयत:"
      );
      expect(resolveGroupedExerciseInstruction("State whether true or false", "TRUE_FALSE", false, "sa")).toBe(
        "शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षम् 'न' इति लिखत:"
      );
      expect(resolveGroupedExerciseInstruction("Match the columns correctly", "MATCH_COLUMN", false, "sa")).toBe(
        "अधोदत्तानां पदानां समुचितं मेलनं कुरुत (स्तम्भ 'अ' सह स्तम्भ 'ब'):"
      );
    });
  });

  describe("2. Pure Hindi Paper Localization (MPBSE Class 10/12 Hindi Pattern)", () => {
    const hindiPaper: Partial<PaperData> = {
      title: "वार्षिक परीक्षा 2026",
      schoolName: "SARVODAYA HIGHER SECONDARY SCHOOL",
      language: "hi",
      blueprint: {
        book: { subject: "हिन्दी", title: "आरोह भाग-2" },
      } as any,
    };

    it("accurately detects Hindi language", () => {
      expect(detectPaperLanguage(hindiPaper as PaperData)).toBe("hi");
    });

    it("localizes section titles to Hindi without English words", () => {
      const hiLocale = getPaperLocale("hi");
      const title = hiLocale.section.formatSectionHeader("A", "SECTION A: MULTIPLE CHOICE QUESTIONS");
      expect(title).toBe("खण्ड 'क' : सही विकल्प चुनिए");
      expect(title).not.toMatch(/[a-zA-Z]/);
    });

    it("formats Hindi marks and exercise formulas", () => {
      expect(formatMarksLabel(1, "hi")).toBe("[1 अंक]");
      expect(formatMarksLabel(2, "hi")).toBe("[2 अंक]");
      expect(formatExerciseFormula(6, 1, "hi")).toBe("(6 × 1 = 6 अंक)");
    });

    it("uses Hindi internal choice separator अथवा", () => {
      expect(getInternalChoiceSeparatorLabel("hi")).toBe("अथवा");
    });

    it("renders Hindi footer elements", () => {
      const locale = getPaperLocale("hi");
      expect(locale.footer.pto).toBe("कृपया उलटिए → / P.T.O.");
      expect(locale.footer.endOfPaper).toBe("*** प्रश्न-पत्र समाप्त ***");
    });
  });

  describe("3. English Paper Localization (CBSE / Standard Pattern)", () => {
    const englishPaper: Partial<PaperData> = {
      title: "Secondary School Examination 2026",
      schoolName: "SARVODAYA ENGLISH SCHOOL",
      language: "en",
      blueprint: {
        book: { subject: "Science", title: "NCERT Science X" },
      } as any,
    };

    it("accurately detects English language", () => {
      expect(detectPaperLanguage(englishPaper as PaperData)).toBe("en");
    });

    it("formats English marks with proper pluralization", () => {
      expect(formatMarksLabel(1, "en")).toBe("[1 Mark]");
      expect(formatMarksLabel(2, "en")).toBe("[2 Marks]");
      expect(formatMarksLabel(5, "en")).toBe("[5 Marks]");
      expect(formatExerciseFormula(6, 1, "en")).toBe("(6 × 1 = 6 Marks)");
    });

    it("uses English internal choice separator OR for CBSE", () => {
      expect(getInternalChoiceSeparatorLabel("en", "CBSE")).toBe("OR");
    });

    it("renders English footer elements", () => {
      const locale = getPaperLocale("en");
      expect(locale.footer.pto).toBe("P.T.O. →");
      expect(locale.footer.endOfPaper).toBe("*** END OF QUESTION PAPER ***");
    });
  });

  describe("4. Bilingual Paper Localization (MPBSE Bilingual Pattern)", () => {
    it("returns bilingual labels and column headers", () => {
      expect(getQuestionTypeLabel("TRUE_FALSE", "bilingual")).toBe("True / False (सत्य / असत्य)");
      const cols = getColumnLabels("bilingual");
      expect(cols.colA).toBe("स्तम्भ 'अ' (Column A)");
      expect(cols.colB).toBe("स्तम्भ 'ब' (Column B)");
      expect(getInternalChoiceSeparatorLabel("bilingual")).toBe("OR (अथवा)");
    });
  });

  describe("5. Sanskrit True/False Question View & Validation", () => {
    it("normalizes True/False answers to 'आम्' and 'न' in Sanskrit", () => {
      const saLocale = getPaperLocale("sa");
      expect(saLocale.questionTypes.TRUE_FALSE).toBe("शुद्ध/अशुद्ध-वाक्यनिरूपणम् (सत्यासत्यम्)");
      // Verify Sanskrit question statement prefix stripping
      const cleaned = cleanQuestionStatement(
        "शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षं 'न' इति लिखत: सत्यमेव जयते नानृतम्। [1 अङ्कः]",
        "TRUE_FALSE"
      );
      expect(cleaned).toBe("सत्यमेव जयते नानृतम्।");
    });

    it("strips trailing meta-prompts like 'इति रिक्तस्थानं पूरयत' and 'अयम् आशयः सत्यः अस्ति वा?' from stems", () => {
      const fbClean = cleanQuestionStatement(
        "काकः ________ जलं पिबति इति रिक्तस्थानं पूरयत। [१ अङ्कः]",
        "FILL_BLANK"
      );
      expect(fbClean).toBe("काकः ________ जलं पिबति");

      const tfClean = cleanQuestionStatement(
        "सूर्यः पूर्वदिशायाम् उदेति अयम् आशयः सत्यः अस्ति वा? (1 Mark)",
        "TRUE_FALSE"
      );
      expect(tfClean).toBe("सूर्यः पूर्वदिशायाम् उदेति");
    });

    it("validates that Sanskrit TRUE_FALSE questions with answers 'आम्', 'न', 'शुद्धम्', 'अशुद्धम्' pass curriculum validation", () => {
      const contract: any = {
        board: "MPBSE",
        academicSession: "2025-26",
        className: "Class 10",
        rawSubject: "Sanskrit",
        canonicalSubject: "Sanskrit",
        sectionTitle: "खण्डः 'ग' : सत्यासत्यनिरूपणम्",
        questionType: "TRUE_FALSE",
        marksEach: 1,
        totalMarks: 6,
        language: "sa",
        slots: Array.from({ length: 6 }, (_, i) => ({
          slotIndex: i,
          chapterTitle: "शुचिपर्यावरणम्",
          chapterOrder: 1,
          marks: 1,
          difficulty: "EASY",
          requiresInternalChoice: false,
        })),
      };

      const generatedQuestions: any[] = [
        { type: "TRUE_FALSE", text: "दुर्दान्तैर्दशनैरमुना स्यान्नैव जनग्रसनम्।", answer: "आम्", options: ["आम्", "न"], slotIndex: 0 },
        { type: "TRUE_FALSE", text: "वायुमण्डलं भृशं दूषितं नास्ति।", answer: "न", options: ["आम्", "न"], slotIndex: 1 },
        { type: "TRUE_FALSE", text: "महानगरेषु वाहनानाम् अनन्ताः पङ्क्तयः धावन्ति।", answer: "शुद्धम्", options: ["आम्", "न"], slotIndex: 2 },
        { type: "TRUE_FALSE", text: "प्रकृत्याः संनिधौ वास्तविकं सुखं नास्ति।", answer: "अशुद्धम्", options: ["आम्", "न"], slotIndex: 3 },
        { type: "TRUE_FALSE", text: "शुचिपर्यावरणम् एव अस्माकं शरणम्।", answer: "सत्यम्", options: ["आम्", "न"], slotIndex: 4 },
        { type: "TRUE_FALSE", text: "धूमं मुञ्चति शतशकटीयानम्।", answer: "असत्यम्", options: ["आम्", "न"], slotIndex: 5 },
      ];

      const validation = validateGeneratedSection(generatedQuestions, contract);
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.acceptedQuestions).toHaveLength(6);
      expect(validation.rejectedSlotIndices).toHaveLength(0);
    });
  });
});
