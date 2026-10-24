import { describe, expect, it } from "vitest";
import {
  cleanQuestionStatement,
  detectPaperLanguage,
  formatExerciseFormula,
  formatMarksLabel,
  getColumnLabels,
  getQuestionTypeLabel,
  getSharedInstruction,
} from "./constants";
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
  });

  describe("formatMarksLabel and formatExerciseFormula", () => {
    it("formats marks in Hindi without English 'Mark/Marks'", () => {
      expect(formatMarksLabel(1, "hi")).toBe("[1 अंक]");
      expect(formatMarksLabel(6, "hi")).toBe("[6 अंक]");
    });

    it("formats marks in English with proper singular/plural grammar", () => {
      expect(formatMarksLabel(1, "en")).toBe("[1 Mark]");
      expect(formatMarksLabel(5, "en")).toBe("[5 Marks]");
    });

    it("formats exercise formulas correctly across languages", () => {
      expect(formatExerciseFormula(6, 1, "hi")).toBe("(6 × 1 = 6 अंक)");
      expect(formatExerciseFormula(6, 1, "en")).toBe("(6 × 1 = 6 Marks)");
      expect(formatExerciseFormula(5, 2, "hi")).toBe("(5 × 2 = 10 अंक)");
    });
  });

  describe("getColumnLabels", () => {
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

  describe("getSharedInstruction", () => {
    it("provides canonical shared instructions for objective clusters", () => {
      expect(getSharedInstruction("TRUE_FALSE", "hi")).toContain("सत्य / असत्य");
      expect(getSharedInstruction("FILL_BLANK", "hi")).toBe("निम्नलिखित रिक्त स्थानों की पूर्ति कीजिए:");
      expect(getSharedInstruction("MCQ", "hi")).toBe("सही विकल्प चुनकर लिखिए:");
      expect(getSharedInstruction("MATCH_COLUMN", "hi")).toBe("स्तम्भ 'अ' का स्तम्भ 'ब' से सही मिलान कीजिए:");

      expect(getSharedInstruction("TRUE_FALSE", "en")).toBe("State whether the following statements are True or False:");
      expect(getSharedInstruction("FILL_BLANK", "en")).toBe("Fill in the blanks with appropriate words:");
    });
  });

  describe("cleanQuestionStatement (Prefix Cleaning)", () => {
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
  });
});
