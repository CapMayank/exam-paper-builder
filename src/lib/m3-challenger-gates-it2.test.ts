import { describe, expect, it } from "vitest";
import {
  buildAndValidateGenerationContract,
  type GenerationContract,
} from "./curriculumContract";
import {
  evaluateArithmeticExpression,
  extractCoordinatePoints,
  parseQuadraticEquation,
  validateArithmeticEquality,
  validateCoordinateGeometryQuestion,
  validateMathematicsAcademicIntegrity,
  validateQuadraticQuestion,
} from "./mathQuestionValidator";
import {
  validateGeneratedQuestion,
  type ValidatableQuestion,
} from "./questionValidator";

describe("Milestone 3 Iteration 2 Adversarial Stress Testing: Math & Sanskrit Quality Gates", () => {
  function createTestContract(
    overrides: Omit<Partial<GenerationContract>, "slots"> & { slots?: any[] } = {},
  ): GenerationContract {
    const rawSlots = overrides.slots;
    const { slots: _ignoreSlots, ...restOverrides } = overrides;
    const res = buildAndValidateGenerationContract({
      board: "MPBSE",
      className: overrides.className || "Class 10",
      subject: overrides.canonicalSubject || "Mathematics",
      subjectCode: overrides.subjectCode || "100",
      marksEach: overrides.marksEach || 1,
      questionType: overrides.questionType || "MCQ",
      difficulty: "BALANCED",
      language: overrides.language || "en",
      sectionTitle: overrides.sectionTitle || "Section A",
      slots: rawSlots?.map((s: any, idx: number) => ({
        slotIndex: s.slotIndex ?? idx,
        chapterId: s.chapterId || `chap_${idx + 1}`,
        chapterNumber: s.chapterNumber || idx + 1,
        chapterTitle: s.chapterTitle || "Test Chapter",
        marks: s.marks || overrides.marksEach || 1,
        requiresInternalChoice: s.requiresInternalChoice,
      })) || [
        {
          slotIndex: 0,
          chapterId: "chap_1",
          chapterNumber: 1,
          chapterTitle: "Chapter 1",
          marks: overrides.marksEach || 1,
        },
      ],
    });
    return {
      ...res.contract!,
      ...restOverrides,
    };
  }

  const mathContract = createTestContract({
    canonicalSubject: "Mathematics",
    subjectCode: "100",
    language: "en",
  });

  const sanskritContract = createTestContract({
    canonicalSubject: "Sanskrit",
    subjectCode: "122",
    language: "sa",
    className: "Class 10",
  });

  /* ================================================================== */
  /* SUITE 1: Sanskrit Hindi Calque & Danda Boundary Stress             */
  /* ================================================================== */
  describe("Suite 1: Sanskrit Hindi Calque & Danda Boundary Stress", () => {
    it("1.1 catches Hindi past auxiliaries ending with single danda (था।, थी।, थे।)", () => {
      const qTha: ValidatableQuestion = {
        type: "SHORT",
        text: "तस्मिन् वने एकः विशालः वटवृक्षः था।",
        answer: "सत्यम्",
      };
      const resTha = validateGeneratedQuestion(qTha, sanskritContract);
      expect(resTha.valid).toBe(false);
      expect(resTha.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);

      const qThi: ValidatableQuestion = {
        type: "SHORT",
        text: "तत्र एका सुन्दरी राजकन्या थी।",
        answer: "सत्यम्",
      };
      const resThi = validateGeneratedQuestion(qThi, sanskritContract);
      expect(resThi.valid).toBe(false);
      expect(resThi.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);

      const qThe: ValidatableQuestion = {
        type: "SHORT",
        text: "सर्वे छात्राः विद्यालये उपस्थिताः थे।",
        answer: "सत्यम्",
      };
      const resThe = validateGeneratedQuestion(qThe, sanskritContract);
      expect(resThe.valid).toBe(false);
      expect(resThe.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("1.2 catches Hindi present copula ending with single danda (है।)", () => {
      const qHai: ValidatableQuestion = {
        type: "SHORT",
        text: "संस्कृतं सर्वासाम् आर्याणां जननी भाषा है।",
        answer: "सत्यम्",
      };
      const resHai = validateGeneratedQuestion(qHai, sanskritContract);
      expect(resHai.valid).toBe(false);
      expect(resHai.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("1.3 catches Hindi auxiliaries ending with double danda (था॥, है॥)", () => {
      const qThaDbl: ValidatableQuestion = {
        type: "SHORT",
        text: "पुरा अयोध्यायां दशरथो नाम राजा था॥",
        answer: "सत्यम्",
      };
      const resThaDbl = validateGeneratedQuestion(qThaDbl, sanskritContract);
      expect(resThaDbl.valid).toBe(false);
      expect(resThaDbl.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);

      const qHaiDbl: ValidatableQuestion = {
        type: "SHORT",
        text: "विद्या ददाति विनयं सत्यं है॥",
        answer: "सत्यम्",
      };
      const resHaiDbl = validateGeneratedQuestion(qHaiDbl, sanskritContract);
      expect(resHaiDbl.valid).toBe(false);
      expect(resHaiDbl.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("1.4 catches Hindi modals ending with danda (होता है।, सकता है।, चाहिए।)", () => {
      const qHotaHai: ValidatableQuestion = {
        type: "SHORT",
        text: "अनेन कर्मणा लाभः होता है।",
        answer: "सत्यम्",
      };
      const resHotaHai = validateGeneratedQuestion(qHotaHai, sanskritContract);
      expect(resHotaHai.valid).toBe(false);
      expect(resHotaHai.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);

      const qSaktaHai: ValidatableQuestion = {
        type: "SHORT",
        text: "सः बालकः पाठं पठितुं सकता है।",
        answer: "सत्यम्",
      };
      const resSaktaHai = validateGeneratedQuestion(qSaktaHai, sanskritContract);
      expect(resSaktaHai.valid).toBe(false);
      expect(resSaktaHai.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);

      const qChahiye: ValidatableQuestion = {
        type: "SHORT",
        text: "सदा सत्यं धर्मं च चरितव्यं चाहिए।",
        answer: "सत्यम्",
      };
      const resChahiye = validateGeneratedQuestion(qChahiye, sanskritContract);
      expect(resChahiye.valid).toBe(false);
      expect(resChahiye.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("1.5 catches Hindi postpositions ending with danda or punctuation (राम ने।, बालक को।, वृक्ष से।)", () => {
      const qRamNe: ValidatableQuestion = {
        type: "SHORT",
        text: "रावणं राम ने। हतवान् इति वाक्यं शुद्धम् अस्ति किम्?",
        answer: "नहि",
      };
      const resRamNe = validateGeneratedQuestion(qRamNe, sanskritContract);
      expect(resRamNe.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);

      const qBalakKo: ValidatableQuestion = {
        type: "SHORT",
        text: "फलम् बालक को। दीयताम्।",
        answer: "नहि",
      };
      const resBalakKo = validateGeneratedQuestion(qBalakKo, sanskritContract);
      expect(resBalakKo.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);

      const qVrikshSe: ValidatableQuestion = {
        type: "SHORT",
        text: "पत्राणि वृक्ष से। पतन्ति।",
        answer: "नहि",
      };
      const resVrikshSe = validateGeneratedQuestion(qVrikshSe, sanskritContract);
      expect(resVrikshSe.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("1.6 does NOT falsely trigger on authentic Sanskrit words containing homophonic substrings (यथा, तथा, कथा, सर्वथा, संस्था)", () => {
      const qAuthentic: ValidatableQuestion = {
        type: "SHORT",
        text: "यथा राजा तथा प्रजा इति प्रसिद्धं वचनम् अस्ति। पुरा एका कथा शुश्रूषिता। सर्वथा धर्मः रक्षणीयः।",
        answer: "आम्",
      };
      const res = validateGeneratedQuestion(qAuthentic, sanskritContract);
      expect(res.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(false);
    });

    it("1.7 does NOT falsely trigger on authentic Sanskrit copulas and verbs (अस्ति, सन्ति, आसीत्, आसन्, भवति) ending in danda", () => {
      const qVerbs: ValidatableQuestion = {
        type: "SHORT",
        text: "प्राचीनकाले भारते बहवः विद्वांसः आसन्। तत्र एकः नृपः आसीत्। सः धर्मात्मा भवति।",
        answer: "सत्यम्",
      };
      const res = validateGeneratedQuestion(qVerbs, sanskritContract);
      expect(res.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(false);
    });
  });

  /* ================================================================== */
  /* SUITE 2: Quadratic Root Nature MCQs & Distractor Isolation Stress  */
  /* ================================================================== */
  describe("Suite 2: Quadratic Root Nature MCQs & Distractor Isolation Stress", () => {
    it("2.1 passes MCQ asking for equal real roots (D = 0) where Option A distractor has D > 0", () => {
      // Option A: x^2 - 5x + 6 = 0 (D = 1 > 0)
      // Option B: x^2 + 2x + 5 = 0 (D = -16 < 0)
      // Option C: x^2 - 6x + 9 = 0 (D = 0, equal roots)
      // Option D: x^2 - 4 = 0 (D = 16 > 0)
      const qMcqEqual: ValidatableQuestion = {
        type: "MCQ",
        text: "Which of the following quadratic equations has two equal real roots?",
        options: [
          "(A) $x^2 - 5x + 6 = 0$",
          "(B) $x^2 + 2x + 5 = 0$",
          "(C) $x^2 - 6x + 9 = 0$",
          "(D) $x^2 - 4 = 0$",
        ],
        answer: "(C) $x^2 - 6x + 9 = 0$",
        explanation: "For equation $x^2 - 6x + 9 = 0$, D = (-6)^2 - 4(1)(9) = 36 - 36 = 0, so it has equal real roots.",
      };
      const res = validateGeneratedQuestion(qMcqEqual, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(false);
    });

    it("2.2 passes MCQ asking for two distinct real roots (D > 0) where Option A distractor has D = 0", () => {
      // Option A: x^2 - 4x + 4 = 0 (D = 0)
      // Option B: x^2 + 9 = 0 (D = -36 < 0)
      // Option C: x^2 - 3x + 2 = 0 (D = 1 > 0, distinct real roots)
      // Option D: x^2 + x + 1 = 0 (D = -3 < 0)
      const qMcqDistinct: ValidatableQuestion = {
        type: "MCQ",
        text: "Which of the following quadratic equations has two distinct real roots?",
        options: [
          "(A) $x^2 - 4x + 4 = 0$",
          "(B) $x^2 + 9 = 0$",
          "(C) $x^2 - 3x + 2 = 0$",
          "(D) $x^2 + x + 1 = 0$",
        ],
        answer: "(C) $x^2 - 3x + 2 = 0$",
        explanation: "For $x^2 - 3x + 2 = 0$, D = 9 - 8 = 1 > 0.",
      };
      const res = validateGeneratedQuestion(qMcqDistinct, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(false);
    });

    it("2.3 passes Hindi MCQ asking for no real roots (D < 0) with distractors in Option A", () => {
      // निम्न में से किस द्विघात समीकरण के कोई वास्तविक मूल नहीं हैं?
      // Option A: 2x^2 - 5x + 2 = 0 (D = 25 - 16 = 9 > 0)
      // Option B: x^2 - 2x + 1 = 0 (D = 0)
      // Option C: 2x^2 - 3x + 5 = 0 (D = 9 - 40 = -31 < 0)
      // Option D: x^2 - 16 = 0 (D = 64 > 0)
      const qHindiMcq: ValidatableQuestion = {
        type: "MCQ",
        text: "निम्न में से किस द्विघात समीकरण के कोई वास्तविक मूल नहीं हैं?",
        options: [
          "(A) $2x^2 - 5x + 2 = 0$",
          "(B) $x^2 - 2x + 1 = 0$",
          "(C) $2x^2 - 3x + 5 = 0$",
          "(D) $x^2 - 16 = 0$",
        ],
        answer: "(C) $2x^2 - 3x + 5 = 0$",
        explanation: "समीकरण $2x^2 - 3x + 5 = 0$ के लिए D = (-3)^2 - 4(2)(5) = 9 - 40 = -31 < 0 है।",
      };
      const res = validateGeneratedQuestion(qHindiMcq, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(false);
    });

    it("2.4 passes MCQ where equation is in the stem and options describe root nature", () => {
      // Stem has equation 3x^2 - 6x + 3 = 0 (D = 36 - 36 = 0)
      // Options enumerate distractor root claims
      const qStemEq: ValidatableQuestion = {
        type: "MCQ",
        text: "The nature of roots of the quadratic equation $3x^2 - 6x + 3 = 0$ is:",
        options: [
          "(A) Two distinct real roots",
          "(B) Two equal real roots",
          "(C) No real roots",
          "(D) Three real roots",
        ],
        answer: "(B) Two equal real roots",
        explanation: "D = 36 - 36 = 0, hence roots are real and equal.",
      };
      const res = validateGeneratedQuestion(qStemEq, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(false);
    });

    it("2.5 actively catches incorrect root claim when wrong option is designated as answer in MCQ", () => {
      // Equation 3x^2 - 6x + 3 = 0 has D = 0 (equal roots)
      // But answer asserts "(A) Two distinct real roots" (which requires D > 0)
      const qWrongAnswer: ValidatableQuestion = {
        type: "MCQ",
        text: "The nature of roots of the quadratic equation $3x^2 - 6x + 3 = 0$ is:",
        options: [
          "(A) Two distinct real roots",
          "(B) Two equal real roots",
          "(C) No real roots",
          "(D) Three real roots",
        ],
        answer: "(A) Two distinct real roots",
        explanation: "It has distinct real roots.",
      };
      const res = validateGeneratedQuestion(qWrongAnswer, mathContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(true);
    });

    it("2.6 actively catches MCQ where selected equation in answer does not have claimed root nature", () => {
      // Question asks for equal real roots (D = 0)
      // Answer claims Option A: x^2 - 5x + 6 = 0 (D = 1 != 0)
      const qWrongEqAns: ValidatableQuestion = {
        type: "MCQ",
        text: "Which of the following quadratic equations has two equal real roots?",
        options: [
          "(A) $x^2 - 5x + 6 = 0$",
          "(B) $x^2 + 2x + 5 = 0$",
          "(C) $x^2 - 6x + 9 = 0$",
          "(D) $x^2 - 4 = 0$",
        ],
        answer: "(A) $x^2 - 5x + 6 = 0$",
        explanation: "The equation $x^2 - 5x + 6 = 0$ has equal roots.",
      };
      const res = validateGeneratedQuestion(qWrongEqAns, mathContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(true);
    });
  });

  /* ================================================================== */
  /* SUITE 3: Coordinate Distance Simplified Surds ($k\sqrt{n}$) Stress */
  /* ================================================================== */
  describe("Suite 3: Coordinate Distance Simplified Surds Stress", () => {
    it("3.1 accepts $2\\sqrt{5}$ for distance between (1, 2) and (3, 6)", () => {
      // dx = 2, dy = 4 -> d^2 = 4 + 16 = 20 -> d = sqrt(20) = 2\sqrt{5}
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between the points $(1, 2)$ and $(3, 6)$.",
        answer: "The distance between the points is $2\\sqrt{5}$ units.",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("3.2 accepts $2 \\sqrt{5}$ with whitespace and without braces (2\\sqrt 5, 2√5)", () => {
      const qSpaced: ValidatableQuestion = {
        type: "SHORT",
        text: "Calculate the distance between $(1, 2)$ and $(3, 6)$.",
        answer: "d = $2 \\sqrt{5}$",
      };
      const resSpaced = validateGeneratedQuestion(qSpaced, mathContract);
      expect(resSpaced.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);

      const qUnicode: ValidatableQuestion = {
        type: "SHORT",
        text: "Calculate the distance between $(1, 2)$ and $(3, 6)$.",
        answer: "The distance is 2√5 units.",
      };
      const resUnicode = validateGeneratedQuestion(qUnicode, mathContract);
      expect(resUnicode.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("3.3 accepts $3\\sqrt{2}$ for distance between (1, 1) and (4, 4)", () => {
      // dx = 3, dy = 3 -> d^2 = 18 -> d = 3\sqrt{2}
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between the points $(1, 1)$ and $(4, 4)$.",
        answer: "Distance = $3\\sqrt{2}$.",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("3.4 accepts $4\\sqrt{2}$ for distance between (-2, 3) and (2, -1)", () => {
      // dx = 4, dy = -4 -> d^2 = 16 + 16 = 32 -> d = 4\sqrt{2}
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between $(-2, 3)$ and $(2, -1)$.",
        answer: "The distance is $4\\sqrt{2}$ units.",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("3.5 accepts $5\\sqrt{2}$ for distance from origin (0, 0) to (5, 5)", () => {
      // dx = 5, dy = 5 -> d^2 = 50 -> d = 5\sqrt{2}
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between the origin $(0, 0)$ and $(5, 5)$.",
        answer: "Distance = $5\\sqrt{2}$.",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("3.6 accepts unsimplified radical form $\\sqrt{20}$ for points (1, 2) and (3, 6)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between the points $(1, 2)$ and $(3, 6)$.",
        answer: "The distance is $\\sqrt{20}$ units.",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("3.7 accepts direct decimal approximation 4.47 for $2\\sqrt{5}$ (~4.4721)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between the points $(1, 2)$ and $(3, 6)$.",
        answer: "The distance is 4.47 units.",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("3.8 actively catches incorrect simplified surd (e.g. $3\\sqrt{5}$ instead of $2\\sqrt{5}$)", () => {
      // True distance is sqrt(20) = 2\sqrt{5} ~ 4.47
      // Claimed distance is 3\sqrt{5} = sqrt(45) ~ 6.71
      const qWrongSurd: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between the points $(1, 2)$ and $(3, 6)$.",
        answer: "The distance is $3\\sqrt{5}$ units.",
      };
      const res = validateGeneratedQuestion(qWrongSurd, mathContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(true);
    });

    it("3.9 handles Hindi coordinate distance questions with simplified surd answers", () => {
      // बिन्दुओं (0, 0) और (2, 4) के बीच की दूरी: dx = 2, dy = 4 -> d = 2\sqrt{5}
      const qHindiSurd: ValidatableQuestion = {
        type: "SHORT",
        text: "बिन्दुओं $(0, 0)$ और $(2, 4)$ के बीच की दूरी ज्ञात कीजिए।",
        answer: "दूरी $2\\sqrt{5}$ मात्रक है।",
      };
      const res = validateGeneratedQuestion(qHindiSurd, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });
  });

  /* ================================================================== */
  /* SUITE 4: Full Multi-Slot Paper Adversarial Integration             */
  /* ================================================================== */
  describe("Suite 4: Multi-Slot Paper Adversarial Integration", () => {
    it("4.1 validates multi-slot Math exam paper containing both MCQ discriminants and surd distances", () => {
      const mcqSectionContract = createTestContract({
        canonicalSubject: "Mathematics",
        subjectCode: "100",
        questionType: "MCQ",
        sectionTitle: "Section A - Objective",
        slots: [{ slotIndex: 0, chapterId: "chap_quad", marks: 1 }],
      });

      const shortSectionContract = createTestContract({
        canonicalSubject: "Mathematics",
        subjectCode: "100",
        questionType: "SHORT",
        sectionTitle: "Section B - Short Answer",
        slots: [{ slotIndex: 0, chapterId: "chap_coord", marks: 2 }],
      });

      const q1: ValidatableQuestion = {
        type: "MCQ",
        text: "Which of the following quadratic equations has no real roots?",
        options: [
          "(A) $x^2 - 4x + 1 = 0$",
          "(B) $x^2 - 4x + 5 = 0$",
          "(C) $x^2 - 6x + 9 = 0$",
          "(D) $x^2 - 2x = 0$",
        ],
        answer: "(B) $x^2 - 4x + 5 = 0$",
        explanation: "D = 16 - 20 = -4 < 0.",
      };

      const q2: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between $(1, 2)$ and $(3, 6)$.",
        answer: "The distance is $2\\sqrt{5}$ units.",
      };

      const res1 = validateGeneratedQuestion(q1, mcqSectionContract, { slotIndex: 0 });
      const res2 = validateGeneratedQuestion(q2, shortSectionContract, { slotIndex: 0 });

      expect(res1.valid).toBe(true);
      expect(res2.valid).toBe(true);
      expect(res1.issues.length).toBe(0);
      expect(res2.issues.length).toBe(0);
    });

    it("4.2 validates authentic multi-slot Sanskrit paper rejecting Hindi danda calques", () => {
      const multiSlotSanskritContract = createTestContract({
        canonicalSubject: "Sanskrit",
        subjectCode: "122",
        language: "sa",
        questionType: "SHORT",
        slots: [
          { slotIndex: 0, chapterId: "chap_sa1", marks: 2 },
          { slotIndex: 1, chapterId: "chap_sa2", marks: 2 },
        ],
      });

      const qPure: ValidatableQuestion = {
        type: "SHORT",
        text: "यथा राजा तथा प्रजा इति वाक्यस्य अर्थं स्पष्टीकुरुत।",
        answer: "राजा यथा आचरति प्रजा अपि तथैव आचरति।",
      };

      const qCalque: ValidatableQuestion = {
        type: "SHORT",
        text: "अस्मिन् संसारे धर्मः एव प्रधानः है।",
        answer: "आम्",
      };

      const resPure = validateGeneratedQuestion(qPure, multiSlotSanskritContract, { slotIndex: 0 });
      const resCalque = validateGeneratedQuestion(qCalque, multiSlotSanskritContract, { slotIndex: 1 });

      expect(resPure.valid).toBe(true);
      expect(resCalque.valid).toBe(false);
      expect(resCalque.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });
  });
});
