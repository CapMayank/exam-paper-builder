import { describe, expect, it } from "vitest";
import {
  verifyQuestionAcademicQuality,
  repairOrRegenerateQuestion,
  type QuestionVerificationResult,
  type VerificationDimensionResult,
} from "./questionVerificationEngine";
import type { ValidatableQuestion } from "./questionValidator";
import type { GenerationContract } from "./curriculumContract";

function makeDummyContract(overrides: Partial<GenerationContract> = {}): GenerationContract {
  return {
    board: "MPBSE",
    boardDisplayName: "Madhya Pradesh Board of Secondary Education",
    schoolName: "MP Model School",
    blueprintName: "Annual Exam Blueprint",
    academicSession: "2026-2027",
    syllabusVersion: "2026-27-rationalized",
    canonicalSubject: "Mathematics",
    rawSubject: "Mathematics",
    subjectCode: "100",
    className: "Class 10",
    classLevel: 10,
    examType: "ANNUAL",
    bookId: "b1",
    bookTitle: "Mathematics Class 10",
    sectionTitle: "Section A",
    questionType: "MCQ",
    marksEach: 1,
    difficulty: "MEDIUM",
    language: "en",
    requiredCount: 1,
    slots: [
      {
        slotIndex: 0,
        slotId: "s0",
        chapterId: "ch1",
        chapterNumber: 1,
        chapterTitle: "Real Numbers",
        marks: 1,
        curriculumSpec: {
          includedTopics: ["Fundamental Theorem of Arithmetic", "Revisiting Irrational Numbers"],
          deletedTopics: ["Euclid's Division Lemma"],
          sampleMatchPairs: [],
          keyFormulasOrConcepts: ["HCF * LCM = a * b"],
        } as any,
      },
    ],
    internalChoiceRequirement: {
      required: false,
      forbidden: true,
      patternVersion: "CIRCULAR_465_2026_27",
      rationale: "1-mark questions strictly forbid internal choice",
    } as any,
    forbiddenCrossSubjectDomains: ["biology", "chemistry"],
    ...overrides,
  } as unknown as GenerationContract;
}

describe("Question Verification Engine (TDD)", () => {
  describe("1. Academic Correctness & Completeness", () => {
    it("flags a mathematical question with an invalid/contradictory equation or calculation", () => {
      const contract = makeDummyContract();
      const question: ValidatableQuestion = {
        type: "MCQ",
        text: "If HCF(306, 657) = 9, what is LCM(306, 657)?",
        options: ["22338", "12345", "306", "657"],
        answer: "12345", // Incorrect: 306 * 657 / 9 = 22338
        explanation: "Since 306 * 657 = 201042 and 201042 / 9 = 12345, the LCM is 12345.", // Incorrect calculation!
        marks: 1,
        difficulty: "MEDIUM",
      };

      const result: QuestionVerificationResult = verifyQuestionAcademicQuality(question, contract, {
        slotIndex: 0,
      });

      expect(result.status).toBe("FAIL");
      expect(result.dimensions.academicCorrectness.passed).toBe(false);
      expect(result.dimensions.academicCorrectness.issues.length).toBeGreaterThan(0);
      expect(result.dimensions.academicCorrectness.issues[0].evidence).toBeDefined();
    });

    it("passes a mathematically rigorous question with verified calculation", () => {
      const contract = makeDummyContract();
      const question: ValidatableQuestion = {
        type: "MCQ",
        text: "Given that HCF(306, 657) = 9, find LCM(306, 657).",
        options: ["22338", "22336", "22334", "22340"],
        answer: "22338",
        explanation: "We know that HCF(a, b) * LCM(a, b) = a * b. Therefore, LCM = (306 * 657) / 9 = 34 * 657 = 22338.",
        marks: 1,
        difficulty: "MEDIUM",
      };

      const result = verifyQuestionAcademicQuality(question, contract, { slotIndex: 0 });
      expect(result.status).toBe("PASS");
      expect(result.dimensions.academicCorrectness.passed).toBe(true);
      expect(result.dimensions.completeness.passed).toBe(true);
      expect(result.dimensions.answerability.passed).toBe(true);
    });

    it("flags an incomplete question referencing a nonexistent diagram or passage", () => {
      const contract = makeDummyContract({ canonicalSubject: "Science", subjectCode: "200" });
      const question: ValidatableQuestion = {
        type: "SHORT",
        text: "In the diagram shown above, identify the parts labeled A, B, and C.",
        // No figureDoc, no imagePath, no diagram provided!
        options: [],
        answer: "A is Stigma, B is Style, C is Ovary.",
        marks: 3,
        difficulty: "MEDIUM",
      };

      const result = verifyQuestionAcademicQuality(question, contract, { slotIndex: 0 });
      expect(result.status).toBe("FAIL");
      expect(result.dimensions.completeness.passed).toBe(false);
      expect(
        result.dimensions.completeness.issues.some((i) =>
          i.message.toLowerCase().includes("diagram") || i.message.toLowerCase().includes("figure"),
        ),
      ).toBe(true);
    });

    it("flags an MCQ with fewer than 4 options or duplicate options", () => {
      const contract = makeDummyContract();
      const question: ValidatableQuestion = {
        type: "MCQ",
        text: "Which of the following is an irrational number?",
        options: ["\\sqrt{2}", "\\sqrt{4}", "\\sqrt{2}"], // Duplicate and only 3 options
        answer: "\\sqrt{2}",
        marks: 1,
        difficulty: "EASY",
      };

      const result = verifyQuestionAcademicQuality(question, contract, { slotIndex: 0 });
      expect(result.status).toBe("FAIL");
      expect(result.dimensions.completeness.passed).toBe(false);
      expect(result.dimensions.blueprintCompliance.passed).toBe(false);
    });

    it("flags an MCQ whose correct answer does not match any of the provided options", () => {
      const contract = makeDummyContract();
      const question: ValidatableQuestion = {
        type: "MCQ",
        text: "The decimal expansion of 13/3125 will terminate after how many places?",
        options: ["1", "2", "3", "4"],
        answer: "5", // Not in options
        marks: 1,
        difficulty: "MEDIUM",
      };

      const result = verifyQuestionAcademicQuality(question, contract, { slotIndex: 0 });
      expect(result.status).toBe("FAIL");
      expect(result.dimensions.answerability.passed).toBe(false);
    });
  });

  describe("2. Subject-Specific Integrity (Sanskrit, Science, Social Science, Hindi, English)", () => {
    it("flags a Sanskrit question with corrupted pratyaya or illegal Hindi-calque", () => {
      const contract = makeDummyContract({
        canonicalSubject: "Sanskrit",
        rawSubject: "Sanskrit",
        subjectCode: "122",
        language: "sa",
      });
      const question: ValidatableQuestion = {
        type: "SHORT",
        text: "'पठितवान्' अस्मिन् पदे कः प्रत्ययः अस्ति? तथा छात्राय पुस्तकं प्रदत्तोग्छति।", // प्रदत्तोग्छति is an illegal calque
        options: [],
        answer: "पठितवान् अस्मिन् पदे क्त-प्रत्ययः अस्ति।", // Wrong pratyaya: should be क्तवतु
        marks: 2,
        difficulty: "MEDIUM",
      };

      const result = verifyQuestionAcademicQuality(question, contract, { slotIndex: 0 });
      expect(result.status).toBe("FAIL");
      expect(result.dimensions.languageQuality.passed).toBe(false);
    });

    it("flags a Science question with unbalanced reaction or impossible physical parameter", () => {
      const contract = makeDummyContract({
        canonicalSubject: "Science",
        rawSubject: "Science",
        subjectCode: "200",
      });
      const question: ValidatableQuestion = {
        type: "SHORT",
        text: "Balance the chemical equation: H2 + O2 -> H2O and state the type of reaction.",
        options: [],
        answer: "H2 + O2 -> H2O is a combination reaction.", // Not balanced!
        marks: 2,
        difficulty: "MEDIUM",
      };

      const result = verifyQuestionAcademicQuality(question, contract, { slotIndex: 0 });
      expect(result.status).toBe("FAIL");
      expect(result.dimensions.academicCorrectness.passed).toBe(false);
    });
  });

  describe("3. 10 Verification Dimensions Coverage", () => {
    it("evaluates all 10 mandatory dimensions: academicCorrectness, syllabusRelevance, completeness, clarity, marksSuitability, difficulty, answerability, languageQuality, duplication, blueprintCompliance", () => {
      const contract = makeDummyContract();
      const question: ValidatableQuestion = {
        type: "MCQ",
        text: "The prime factorization of 96 is:",
        options: ["2^5 \\times 3", "2^4 \\times 3^2", "2^3 \\times 3^3", "2^6 \\times 3"],
        answer: "2^5 \\times 3",
        explanation: "96 = 2 * 2 * 2 * 2 * 2 * 3 = 2^5 * 3.",
        marks: 1,
        difficulty: "EASY",
      };

      const result = verifyQuestionAcademicQuality(question, contract, { slotIndex: 0 });
      expect(result.dimensions.academicCorrectness).toBeDefined();
      expect(result.dimensions.syllabusRelevance).toBeDefined();
      expect(result.dimensions.completeness).toBeDefined();
      expect(result.dimensions.clarity).toBeDefined();
      expect(result.dimensions.marksSuitability).toBeDefined();
      expect(result.dimensions.difficulty).toBeDefined();
      expect(result.dimensions.answerability).toBeDefined();
      expect(result.dimensions.languageQuality).toBeDefined();
      expect(result.dimensions.duplication).toBeDefined();
      expect(result.dimensions.blueprintCompliance).toBeDefined();
    });
  });

  describe("4. Question Repair & Regeneration", () => {
    it("repairs a flawed MCQ by rectifying missing/invalid distractors or miscalculated answer", async () => {
      const contract = makeDummyContract();
      const flawedQuestion: ValidatableQuestion = {
        type: "MCQ",
        text: "What is the HCF of 12 and 18?",
        options: ["6", "12", "6", "18"], // Duplicate option 6
        answer: "6",
        marks: 1,
        difficulty: "EASY",
      };

      const repairResult = await repairOrRegenerateQuestion(flawedQuestion, contract, {
        slotIndex: 0,
        maxRetries: 2,
      });

      expect(repairResult.success).toBe(true);
      expect(repairResult.question.options?.length).toBe(4);
      const uniqueOpts = new Set(repairResult.question.options);
      expect(uniqueOpts.size).toBe(4);
      expect(repairResult.verificationResult.status).toBe("PASS");
    });
  });
});
