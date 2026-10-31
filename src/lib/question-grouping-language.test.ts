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
import type { PaperData, QuestionDto } from "./types";

describe("Question Grouping and Language Quality Remediation", () => {
  describe("detectPaperLanguage", () => {
    it("detects Hindi when subject is Hindi", () => {
      const paper = {
        title: "Class 12 Midterm",
        blueprint: {
          book: { subject: "Hindi", title: "Aroh" },
        },
      };
      expect(detectPaperLanguage(paper as any)).toBe("hi");
    });

    it("detects Hindi when subject has Devanagari characters", () => {
      const paper = {
        title: "अर्धवार्षिक परीक्षा 2025-26",
        blueprint: {
          book: { subject: "हिंदी साहित्य", title: "अंतरा" },
        },
      };
      expect(detectPaperLanguage(paper as any)).toBe("hi");
    });

    it("detects Hindi when question texts are predominantly Hindi", () => {
      const paper = {
        title: "General Paper",
        blueprint: {
          book: { subject: "Language", title: "Reader" },
        },
      };
      const items = [
        { question: { text: "कविता 'छोटा मेरा खेत' के रचयिता कौन हैं?" } },
        { question: { text: "भक्तिन का वास्तविक नाम क्या था?" } },
        { question: { text: "यशोधर बाबू किस पद पर कार्यरत थे?" } },
      ];
      expect(detectPaperLanguage(paper as any, items as any)).toBe("hi");
    });

    it("detects English for standard science and math papers", () => {
      const paper = {
        title: "Class 10 Science Final Exam",
        blueprint: {
          book: { subject: "Science", title: "NCERT Science X" },
        },
      };
      const items = [
        { question: { text: "What is the chemical formula of rust?" } },
        { question: { text: "Define Ohm's law with mathematical expression." } },
      ];
      expect(detectPaperLanguage(paper as any, items as any)).toBe("en");
    });

    it("detects Sanskrit when subject is Sanskrit", () => {
      const paper = {
        title: "Class 10 Sanskrit Exam",
        blueprint: {
          book: { subject: "Sanskrit", title: "Shemushi" },
        },
      };
      expect(detectPaperLanguage(paper as any)).toBe("sa");
    });

    it("detects Sanskrit when book is Shemushi or subject is संस्कृतम्", () => {
      const paper = {
        title: "वार्षिक परीक्षा 2025-26",
        blueprint: {
          book: { subject: "संस्कृतम्", title: "शेमुषी भाग-2" },
        },
      };
      expect(detectPaperLanguage(paper as any)).toBe("sa");
    });

    it("detects Sanskrit when subject code is 122 or 512", () => {
      const paper = {
        title: "Class 10 Board Exam",
        subjectCode: "512",
        blueprint: {
          book: { subject: "Third Language", title: "Textbook" },
        },
      };
      expect(detectPaperLanguage(paper as any)).toBe("sa");
    });

    it("detects Sanskrit when questions contain distinct Sanskrit inflectional forms", () => {
      const paper = {
        title: "General Language Paper",
        blueprint: {
          book: { subject: "Language", title: "Reader" },
        },
      };
      const items = [
        { question: { text: "उचितविकल्पं चित्वा लिखत: कः पिपासिता आसीत्?" } },
        { question: { text: "रिक्तस्थानानि पूरयत: काकः ________ जलं पिबति।" } },
        { question: { text: "अधोलिखितानां प्रश्नानाम् उत्तराणि संस्कृतभाषया लिखत।" } },
      ];
      expect(detectPaperLanguage(paper as any, items as any)).toBe("sa");
    });

    it("respects explicit paper language override", () => {
      const paper = {
        title: "Bilingual Exam",
        language: "bilingual",
        blueprint: {
          book: { subject: "Hindi", title: "Aroh" },
        },
      };
      expect(detectPaperLanguage(paper as any)).toBe("bilingual");
    });

    it("respects explicit Sanskrit paper language override", () => {
      const paper = {
        title: "Special Exam",
        language: "sa",
        blueprint: {
          book: { subject: "General", title: "Book" },
        },
      };
      expect(detectPaperLanguage(paper as any)).toBe("sa");
    });
  });

  describe("getQuestionTypeLabel and Language Localization", () => {
    it("returns pure Hindi labels without English contamination for Hindi papers", () => {
      expect(getQuestionTypeLabel("TRUE_FALSE", "hi")).toBe("सत्य / असत्य");
      expect(getQuestionTypeLabel("FILL_BLANK", "hi")).toBe("रिक्त स्थानों की पूर्ति");
      expect(getQuestionTypeLabel("MCQ", "hi")).toBe("सही विकल्प चुनिए");
      expect(getQuestionTypeLabel("MATCH_COLUMN", "hi")).toBe("सही जोड़ी मिलाइए");
      expect(getQuestionTypeLabel("ASSERTION_REASON", "hi")).toBe("अभिकथन एवं तर्क");
      expect(getQuestionTypeLabel("SHORT", "hi")).toBe("लघु उत्तरीय प्रश्न");
      expect(getQuestionTypeLabel("LONG", "hi")).toBe("दीर्घ उत्तरीय प्रश्न");
    });

    it("returns English labels for English papers", () => {
      expect(getQuestionTypeLabel("TRUE_FALSE", "en")).toBe("True / False");
      expect(getQuestionTypeLabel("FILL_BLANK", "en")).toBe("Fill in the blank");
      expect(getQuestionTypeLabel("MCQ", "en")).toBe("Multiple choice");
    });

    it("returns bilingual labels for bilingual papers", () => {
      expect(getQuestionTypeLabel("TRUE_FALSE", "bilingual")).toBe("True / False (सत्य / असत्य)");
      expect(getQuestionTypeLabel("MCQ", "bilingual")).toBe("Multiple Choice / सही विकल्प चुनिए");
    });

    it("returns authentic Sanskrit labels for Sanskrit papers", () => {
      expect(getQuestionTypeLabel("MCQ", "sa")).toBe("बहुविकल्पीयप्रश्नाः (उचितविकल्पं चित्वा लिखत)");
      expect(getQuestionTypeLabel("TRUE_FALSE", "sa")).toBe("शुद्ध/अशुद्ध-वाक्यनिरूपणम् (सत्यासत्यम्)");
      expect(getQuestionTypeLabel("FILL_BLANK", "sa")).toBe("रिक्तस्थानपूर्तिः");
      expect(getQuestionTypeLabel("MATCH_COLUMN", "sa")).toBe("उचितयुग्ममेलनम्");
      expect(getQuestionTypeLabel("VERY_SHORT", "sa")).toBe("अतिलघूत्तरीयप्रश्नाः (एकपदेन / एकवाक्येन)");
      expect(getQuestionTypeLabel("SHORT", "sa")).toBe("लघूत्तरीयप्रश्नाः");
      expect(getQuestionTypeLabel("LONG", "sa")).toBe("दीर्घोत्तरीयप्रश्नाः");
    });
  });

  describe("formatMarksLabel and formatExerciseFormula", () => {
    it("formats marks in Sanskrit with authentic grammar (अङ्कः / अङ्कौ / अङ्काः)", () => {
      expect(formatMarksLabel(1, "sa")).toBe("[1 अङ्कः]");
      expect(formatMarksLabel(2, "sa")).toBe("[2 अङ्कौ]");
      expect(formatMarksLabel(3, "sa")).toBe("[3 अङ्काः]");
      expect(formatMarksLabel(6, "sa")).toBe("[6 अङ्काः]");
    });

    it("formats marks in Hindi without English 'Mark/Marks'", () => {
      expect(formatMarksLabel(1, "hi")).toBe("[1 अंक]");
      expect(formatMarksLabel(6, "hi")).toBe("[6 अंक]");
    });

    it("formats marks in English with proper singular/plural grammar", () => {
      expect(formatMarksLabel(1, "en")).toBe("[1 Mark]");
      expect(formatMarksLabel(5, "en")).toBe("[5 Marks]");
    });

    it("formats exercise formulas correctly across languages", () => {
      expect(formatExerciseFormula(6, 1, "sa")).toBe("(6 × 1 = 6 अङ्काः)");
      expect(formatExerciseFormula(6, 1, "hi")).toBe("(6 × 1 = 6 अंक)");
      expect(formatExerciseFormula(6, 1, "en")).toBe("(6 × 1 = 6 Marks)");
      expect(formatExerciseFormula(5, 2, "hi")).toBe("(5 × 2 = 10 अंक)");
    });
  });

  describe("getColumnLabels", () => {
    it("returns authentic Sanskrit column headers", () => {
      const labels = getColumnLabels("sa");
      expect(labels.colA).toBe("स्तम्भ 'अ'");
      expect(labels.colB).toBe("स्तम्भ 'ब'");
    });

    it("returns pure Hindi column headers without forced English '(Column A)'", () => {
      const labels = getColumnLabels("hi");
      expect(labels.colA).toBe("स्तम्भ 'अ'");
      expect(labels.colB).toBe("स्तम्भ 'ब'");
    });

    it("returns English column headers for English papers", () => {
      const labels = getColumnLabels("en");
      expect(labels.colA).toBe("Column A");
      expect(labels.colB).toBe("Column B");
    });

    it("returns bilingual column headers for bilingual papers", () => {
      const labels = getColumnLabels("bilingual");
      expect(labels.colA).toBe("स्तम्भ 'अ' (Column A)");
      expect(labels.colB).toBe("स्तम्भ 'ब' (Column B)");
    });
  });

  describe("getInternalChoiceSeparatorLabel", () => {
    it("returns appropriate internal choice separators per language", () => {
      expect(getInternalChoiceSeparatorLabel("sa")).toBe("(अथवा)");
      expect(getInternalChoiceSeparatorLabel("hi")).toBe("अथवा");
      expect(getInternalChoiceSeparatorLabel("en", "CBSE")).toBe("OR");
      expect(getInternalChoiceSeparatorLabel("bilingual")).toBe("OR (अथवा)");
    });
  });

  describe("localizeSectionTitle", () => {
    it("localizes English section titles into authentic Sanskrit section titles with visargas and Devanagari letters", () => {
      expect(localizeSectionTitle("SECTION A: MULTIPLE CHOICE QUESTIONS", "sa")).toBe("खण्डः 'क' : बहुविकल्पीयप्रश्नाः");
      expect(localizeSectionTitle("SECTION B: FILL IN THE BLANKS", "sa")).toBe("खण्डः 'ख' : रिक्तस्थानपूर्तिः");
      expect(localizeSectionTitle("SECTION C: TRUE OR FALSE", "sa")).toBe("खण्डः 'ग' : सत्यासत्यनिरूपणम्");
      expect(localizeSectionTitle("SECTION D: MATCH THE FOLLOWING", "sa")).toBe("खण्डः 'घ' : उचितयुग्ममेलनम्");
      expect(localizeSectionTitle("SECTION E: ONE WORD ANSWERS", "sa")).toBe("खण्डः 'ङ' : एकपदेन उत्तराणि");
      expect(localizeSectionTitle("SECTION F: VERY SHORT ANSWER QUESTIONS", "sa")).toBe("खण्डः 'च' : अतिलघूत्तरीयप्रश्नाः");
      expect(localizeSectionTitle("SECTION G: SHORT ANSWER QUESTIONS", "sa")).toBe("खण्डः 'छ' : लघूत्तरीयप्रश्नाः");
      expect(localizeSectionTitle("SECTION H: LONG ANSWER QUESTIONS", "sa")).toBe("खण्डः 'ज' : दीर्घोत्तरीयप्रश्नाः");
    });

    it("localizes English section titles into Hindi with Devanagari letters", () => {
      expect(localizeSectionTitle("SECTION A: MULTIPLE CHOICE QUESTIONS", "hi")).toBe("खण्ड 'क' : सही विकल्प चुनिए");
      expect(localizeSectionTitle("SECTION B: FILL IN THE BLANKS", "hi")).toBe("खण्ड 'ख' : रिक्त स्थानों की पूर्ति");
    });

    it("generates fallback section headers when title is empty", () => {
      expect(localizeSectionTitle(null, "sa", "A")).toBe("खण्डः 'क'");
      expect(localizeSectionTitle(null, "sa", "B")).toBe("खण्डः 'ख'");
      expect(localizeSectionTitle(null, "hi", "A")).toBe("खण्ड 'क'");
      expect(localizeSectionTitle(null, "en", "A")).toBe("SECTION A");
    });
  });

  describe("getSharedInstruction", () => {
    it("provides canonical shared instructions for objective clusters", () => {
      expect(getSharedInstruction("MCQ", "sa")).toBe("उचितविकल्पं चित्वा लिखत:");
      expect(getSharedInstruction("FILL_BLANK", "sa")).toBe("कोष्ठकेषु प्रदत्तशब्दैः रिक्तस्थानानि पूरयत:");
      expect(getSharedInstruction("TRUE_FALSE", "sa")).toBe("शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षम् 'न' इति लिखत:");
      expect(getSharedInstruction("MATCH_COLUMN", "sa")).toBe("अधोदत्तानां पदानां समुचितं मेलनं कुरुत (स्तम्भ 'अ' सह स्तम्भ 'ब'):");

      expect(getSharedInstruction("TRUE_FALSE", "hi")).toContain("सत्य / असत्य");
      expect(getSharedInstruction("FILL_BLANK", "hi")).toBe("निम्नलिखित रिक्त स्थानों की पूर्ति कीजिए:");
      expect(getSharedInstruction("MCQ", "hi")).toBe("सही विकल्प चुनकर लिखिए:");
      expect(getSharedInstruction("MATCH_COLUMN", "hi")).toBe("स्तम्भ 'अ' का स्तम्भ 'ब' से सही मिलान कीजिए:");

      expect(getSharedInstruction("TRUE_FALSE", "en")).toBe("State whether the following statements are True or False:");
      expect(getSharedInstruction("FILL_BLANK", "en")).toBe("Fill in the blanks with appropriate words:");
    });
  });

  describe("cleanQuestionStatement (Prefix Cleaning)", () => {
    it("strips Sanskrit True/False, MCQ, and Fill in the Blanks prefixes from stems", () => {
      const tf1 = "शुद्धवाक्यानां समक्षम् 'आम्' अशुद्धवाक्यानां समक्षं 'न' इति लिखत: सूर्यः पूर्वदिशायाम् उदेति।";
      expect(cleanQuestionStatement(tf1, "TRUE_FALSE")).toBe("सूर्यः पूर्वदिशायाम् उदेति।");

      const fb1 = "कोष्ठकेषु प्रदत्तशब्दैः रिक्तस्थानानि पूरयत: काकः ________ जलं पिबति।";
      expect(cleanQuestionStatement(fb1, "FILL_BLANK")).toBe("काकः ________ जलं पिबति।");

      const mcq1 = "उचितविकल्पं चित्वा लिखत: कः पिपासिता आसीत्? [1 अङ्कः]";
      expect(cleanQuestionStatement(mcq1, "MCQ")).toBe("कः पिपासिता आसीत्?");
    });
    it("strips English True/False prefixes from statement stems", () => {
      const raw1 = "State whether the following statement is True or False: Rusting of iron is an electrochemical process.";
      expect(cleanQuestionStatement(raw1, "TRUE_FALSE")).toBe("Rusting of iron is an electrochemical process.");

      const raw2 = "State whether true or false: Corrosion requires oxygen and moisture.";
      expect(cleanQuestionStatement(raw2, "TRUE_FALSE")).toBe("Corrosion requires oxygen and moisture.");

      const raw3 = "True or False: Sunlight travels in straight lines.";
      expect(cleanQuestionStatement(raw3, "TRUE_FALSE")).toBe("Sunlight travels in straight lines.");
    });

    it("strips Hindi True/False prefixes from statement stems", () => {
      const raw1 = "बताइए कि निम्नलिखित कथन सत्य है या असत्य: 'फ़िराक़ गोरखपुरी' की रुबाइयों में दीपावली के अवसर का सुंदर चित्रण किया गया है।";
      expect(cleanQuestionStatement(raw1, "TRUE_FALSE")).toBe("'फ़िराक़ गोरखपुरी' की रुबाइयों में दीपावली के अवसर का सुंदर चित्रण किया गया है।");

      const raw2 = "कथन सत्य है या असत्य लिखिए: जैनेंद्र कुमार के निबंध 'बाज़ार दर्शन' के अनुसार बाज़ार का आमंत्रण मूक होता है।";
      expect(cleanQuestionStatement(raw2, "TRUE_FALSE")).toBe("जैनेंद्र कुमार के निबंध 'बाज़ार दर्शन' के अनुसार बाज़ार का आमंत्रण मूक होता है।");

      const raw3 = "सत्य / असत्य: कविता 'छोटा मेरा खेत' में कागज़ के पन्ने को चौकोर खेत के रूप में कल्पित किया गया है।";
      expect(cleanQuestionStatement(raw3, "TRUE_FALSE")).toBe("कविता 'छोटा मेरा खेत' में कागज़ के पन्ने को चौकोर खेत के रूप में कल्पित किया गया है।");
    });

    it("strips Fill in the Blanks prompt prefixes and standardizes blank tokens", () => {
      const raw1 = "Fill in the blanks with appropriate words: The SI unit of electric current is _____ .";
      expect(cleanQuestionStatement(raw1, "FILL_BLANK")).toBe("The SI unit of electric current is ________ .");

      const raw2 = "रिक्त स्थानों की पूर्ति कीजिए: भारत की राजधानी ________ है।";
      expect(cleanQuestionStatement(raw2, "FILL_BLANK")).toBe("भारत की राजधानी ________ है।");
    });

    it("strips redundant leading item numbers (e.g. (a), (i), 1.)", () => {
      expect(cleanQuestionStatement("(a) First statement here", "TRUE_FALSE")).toBe("First statement here");
      expect(cleanQuestionStatement("1. First statement here", "TRUE_FALSE")).toBe("First statement here");
      expect(cleanQuestionStatement("(i) Subpart statement", "FILL_BLANK")).toBe("Subpart statement");
    });

    it("strips trailing marks annotations from question stems (e.g. [1 Mark], [2 Marks], (1 Mark))", () => {
      expect(cleanQuestionStatement("What is the degree of the differential equation? [1 Mark]", "MCQ")).toBe(
        "What is the degree of the differential equation?"
      );
      expect(cleanQuestionStatement("Find the value of x. [2 Marks]", "SHORT_ANSWER")).toBe(
        "Find the value of x."
      );
      expect(cleanQuestionStatement("Evaluate the integral. (3 Marks)", "SHORT_ANSWER")).toBe(
        "Evaluate the integral."
      );
      expect(cleanQuestionStatement("सिद्ध कीजिए कि... [4 अंक]", "LONG_ANSWER")).toBe(
        "सिद्ध कीजिए कि..."
      );
      expect(cleanQuestionStatement("अधोलिखितयोः द्वयोः प्रश्नयोः उत्तराणि लिखत। [2 अङ्कौ]", "SHORT")).toBe(
        "अधोलिखितयोः द्वयोः प्रश्नयोः उत्तराणि लिखत।"
      );
      expect(cleanQuestionStatement("प्रश्नोत्तराणि लिखत। [3 अङ्काः]", "SHORT")).toBe(
        "प्रश्नोत्तराणि लिखत।"
      );
    });
  });
});
