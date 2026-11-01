import { describe, expect, it } from "vitest";
import {
  buildAndValidateGenerationContract,
  type GenerationContract,
} from "./curriculumContract";
import {
  evaluateArithmeticExpression,
  extractCoordinatePoints,
  normalizeMathString,
  parseQuadraticEquation,
  tokenizeMath,
  validateArithmeticEquality,
  validateCoordinateGeometryQuestion,
  validateMathematicsAcademicIntegrity,
  validateMathematicsVariantAlignment,
  validateQuadraticQuestion,
} from "./mathQuestionValidator";
import {
  validateGeneratedQuestion,
  type ValidatableQuestion,
} from "./questionValidator";

describe("Milestone 3 Adversarial Empirical Challenger: Mathematics & Sanskrit Quality Gates", () => {
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
  /* SUITE 1: Arithmetic Evaluation & Tolerance Boundary Stress         */
  /* ================================================================== */
  describe("Suite 1: Arithmetic Evaluation & Equality Gate Stress", () => {
    it("1.1 parses edge-case fractions and powers accurately", () => {
      // Fractional addition
      expect(evaluateArithmeticExpression("1/3 + 1/6")).toBeCloseTo(0.5, 6);
      // Nested fractions
      expect(evaluateArithmeticExpression("\\frac{\\frac{1}{2}}{\\frac{1}{4}}")).toBeCloseTo(2, 6);
      // Right-associative exponentiation: 2^3^2 = 2^(3^2) = 2^9 = 512
      expect(evaluateArithmeticExpression("2^3^2")).toBe(512);
      // Nested parentheses
      expect(evaluateArithmeticExpression("((2 + 3) * (7 - 2)) / 5")).toBe(5);
    });

    it("1.2 verifies high precision decimal equality within 1e-4 tolerance", () => {
      // 1/7 = 0.142857 -> error is ~1.4e-7, well within 1e-4 tolerance
      const resPass = validateArithmeticEquality("Calculate: $\\frac{1}{7} = 0.142857$.");
      expect(resPass.isValid).toBe(true);

      // 1/7 = 0.14 -> truncated error is ~0.002857, which exceeds 1e-4 tolerance
      const resFail = validateArithmeticEquality("Calculate: $\\frac{1}{7} = 0.14$.");
      expect(resFail.isValid).toBe(false);
      expect(resFail.error).toContain("Arithmetic calculation error");
    });

    it("1.3 handles floating point IEEE-754 precision without false positives", () => {
      // 0.1 + 0.2 in JS is 0.30000000000000004
      const res = validateArithmeticEquality("Check identity: $0.1 + 0.2 = 0.3$.");
      expect(res.isValid).toBe(true);
    });

    it("1.4 detects subtle arithmetic fabrication in question stem (MATH_CALCULATION_ERROR)", () => {
      // Fabricated: 25 * 24 = 605 (actual is 600)
      const q: ValidatableQuestion = {
        type: "MCQ",
        text: "Verify the multiplication: $25 \\times 24 = 605$.",
        options: ["True", "False"],
        answer: "True",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.valid).toBe(false);
      const mathIssue = res.issues.find((i) => i.code === "MATH_CALCULATION_ERROR");
      expect(mathIssue).toBeDefined();
      expect(mathIssue?.message).toContain("25 \\times 24 evaluates to 600, but is claimed to equal 605");
    });

    it("1.5 safely handles division by zero without crashing or throwing", () => {
      // Division by zero in arithmetic evaluator returns null gracefully
      const val = evaluateArithmeticExpression("10 / 0");
      expect(val).toBeNull();

      const valZeroDenom = evaluateArithmeticExpression("10 / (5 - 5)");
      expect(valZeroDenom).toBeNull();
    });

    it("1.6 safely skips calculus and higher-order expressions without false positive error", () => {
      const qCalculus: ValidatableQuestion = {
        type: "SHORT",
        text: "Evaluate the definite integral $\\int_0^1 x dx = 0.5$.",
        answer: "The integral value is 0.5.",
      };
      const res = validateGeneratedQuestion(qCalculus, mathContract);
      // Calculus expressions should be skipped by arithmetic scanner
      expect(res.issues.some((i) => i.code === "MATH_CALCULATION_ERROR")).toBe(false);
    });

    it("1.7 ignores algebraic equations with variables from arithmetic equality check", () => {
      const qAlgebra: ValidatableQuestion = {
        type: "SHORT",
        text: "Solve for x: $2x + 3 = 7$.",
        answer: "x = 2",
      };
      const res = validateGeneratedQuestion(qAlgebra, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_CALCULATION_ERROR")).toBe(false);
    });
  });

  /* ================================================================== */
  /* SUITE 2: Quadratic Equation Discriminant & Nature of Roots Stress  */
  /* ================================================================== */
  describe("Suite 2: Quadratic Discriminant & Nature of Roots Stress", () => {
    it("2.1 correctly parses pure quadratic equations with missing linear term (b = 0)", () => {
      // x^2 - 16 = 0 -> a = 1, b = 0, c = -16 -> D = -4(1)(-16) = 64
      const quad = parseQuadraticEquation("x^2 - 16 = 0");
      expect(quad).not.toBeNull();
      expect(quad?.a).toBe(1);
      expect(quad?.b).toBe(0);
      expect(quad?.c).toBe(-16);
      expect(quad?.discriminant).toBe(64);

      // x^2 + 9 = 0 -> a = 1, b = 0, c = 9 -> D = -36 < 0
      const quadNeg = parseQuadraticEquation("x^2 + 9 = 0");
      expect(quadNeg?.discriminant).toBe(-36);
    });

    it("2.2 correctly parses quadratic equations with negative leading coefficient", () => {
      // -2x^2 + 4x - 2 = 0 -> a = -2, b = 4, c = -2 -> D = 16 - 4(-2)(-2) = 16 - 16 = 0
      const quad = parseQuadraticEquation("-2x^2 + 4x - 2 = 0");
      expect(quad).not.toBeNull();
      expect(quad?.a).toBe(-2);
      expect(quad?.b).toBe(4);
      expect(quad?.c).toBe(-2);
      expect(quad?.discriminant).toBe(0);
    });

    it("2.3 correctly parses quadratic equations with decimal coefficients", () => {
      // 0.5x^2 - 2x + 2 = 0 -> a = 0.5, b = -2, c = 2 -> D = 4 - 4(0.5)(2) = 0
      const quad = parseQuadraticEquation("0.5x^2 - 2x + 2 = 0");
      expect(quad).not.toBeNull();
      expect(quad?.discriminant).toBe(0);
    });

    it("2.4 rejects negative leading coefficient quadratic claiming distinct real roots when D = 0", () => {
      const q: ValidatableQuestion = {
        type: "MCQ",
        text: "The equation $-2x^2 + 4x - 2 = 0$ has two distinct real roots.",
        options: ["True", "False"],
        answer: "True",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(true);
    });

    it("2.5 accepts pure quadratic equation with negative discriminant claiming no real roots", () => {
      const q: ValidatableQuestion = {
        type: "MCQ",
        text: "The quadratic equation $x^2 + 9 = 0$ has no real roots.",
        options: ["True", "False"],
        answer: "True",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(false);
    });

    it("2.6 rejects pure quadratic equation with negative discriminant falsely claiming real roots", () => {
      const q: ValidatableQuestion = {
        type: "MCQ",
        text: "The quadratic equation $x^2 + 9 = 0$ has two distinct real roots.",
        options: ["True", "False"],
        answer: "True",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(true);
    });

    it("2.7 rejects positive discriminant equation falsely claiming equal real roots", () => {
      // x^2 - 5x + 6 = 0 -> D = 25 - 24 = 1 != 0
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Show that $x^2 - 5x + 6 = 0$ has equal real roots.",
        answer: "Because D = 0.",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(true);
    });

    it("2.8 rejects positive discriminant equation falsely claiming no real roots", () => {
      // x^2 - 5x + 6 = 0 -> D = 1 >= 0
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "The equation $x^2 - 5x + 6 = 0$ has no real roots.",
        answer: "True",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(true);
    });

    it("2.9 recognizes Devanagari Hindi root claims for quadratic equations", () => {
      // 2x^2 - 4x + 3 = 0 -> D = -8 < 0 -> कोई वास्तविक मूल नहीं (Correct)
      const validHindiQ: ValidatableQuestion = {
        type: "SHORT",
        text: "द्विघात समीकरण $2x^2 - 4x + 3 = 0$ के कोई वास्तविक मूल नहीं हैं।",
        answer: "सत्य",
      };
      const resPass = validateGeneratedQuestion(validHindiQ, mathContract);
      expect(resPass.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(false);

      // 2x^2 - 4x + 3 = 0 -> भिन्न वास्तविक मूल (Incorrect, D <= 0)
      const invalidHindiQ: ValidatableQuestion = {
        type: "SHORT",
        text: "द्विघात समीकरण $2x^2 - 4x + 3 = 0$ के भिन्न वास्तविक मूल हैं।",
        answer: "सत्य",
      };
      const resFail = validateGeneratedQuestion(invalidHindiQ, mathContract);
      expect(resFail.valid).toBe(false);
      expect(resFail.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(true);
    });

    it("2.10 [BOUNDARY PROBE] checks MCQ with multiple quadratic equations in options", () => {
      // MCQ asking which equation has no real roots:
      // Option A: x^2 - 4x + 1 = 0 (D = 12 > 0)
      // Option B: x^2 - 4x + 5 = 0 (D = -4 < 0, correct answer)
      const qMcq: ValidatableQuestion = {
        type: "MCQ",
        text: "Which of the following quadratic equations has no real roots?",
        options: [
          "(A) $x^2 - 4x + 1 = 0$",
          "(B) $x^2 - 4x + 5 = 0$",
          "(C) $x^2 - 6x + 9 = 0$",
          "(D) $x^2 - 2x = 0$",
        ],
        answer: "(B) $x^2 - 4x + 5 = 0$",
        explanation: "For equation $x^2 - 4x + 5 = 0$, D = 16 - 20 = -4 < 0.",
      };
      const res = validateGeneratedQuestion(qMcq, mathContract);
      const hasFalsePositive = res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH");
      // Remediated: Option A distractor is isolated; correct equation in answer (D = -4 < 0) matches claim
      expect(hasFalsePositive).toBe(false);
    });
  });

  /* ================================================================== */
  /* SUITE 3: Coordinate Geometry Formula Verifier Stress               */
  /* ================================================================== */
  describe("Suite 3: Coordinate Geometry Formula Verifier Stress", () => {
    it("3.1 correctly computes distance from the origin (0, 0)", () => {
      // Distance between (0, 0) and (3, 4) is 5
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between the origin $(0, 0)$ and the point $(3, 4)$.",
        answer: "The distance is 5 units.",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("3.2 accurately evaluates distance involving all negative coordinates", () => {
      // Distance between (-2, -3) and (-6, -6) is sqrt((-4)^2 + (-3)^2) = 5
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Calculate the distance between points $(-2, -3)$ and $(-6, -6)$.",
        answer: "The required distance is 5.",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("3.3 flags incorrect distance calculation with negative coordinates (MATH_COORDINATE_GEOMETRY_ERROR)", () => {
      // Distance between (-2, -3) and (-6, -6) is 5, but claimed as 7
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Calculate the distance between points $(-2, -3)$ and $(-6, -6)$.",
        answer: "The distance between the points is 7 units.",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(true);
    });

    it("3.4 supports radical form \\sqrt{d} matching squared distance", () => {
      // Distance between (1, 1) and (3, 3) is sqrt(4 + 4) = sqrt(8)
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between $(1, 1)$ and $(3, 3)$.",
        answer: "The distance is $\\sqrt{8}$ units.",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("3.5 accurately computes midpoint involving negative coordinates and origin", () => {
      // Midpoint of (-4, 6) and (2, -2) is ((-4+2)/2, (6-2)/2) = (-1, 2)
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the midpoint of the line segment joining $(-4, 6)$ and $(2, -2)$.",
        answer: "The coordinates of the midpoint are $(-1, 2)$.",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);

      // Midpoint of (-3, -5) and (3, 5) is (0, 0)
      const qOrigin: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the midpoint of the segment joining $(-3, -5)$ and $(3, 5)$.",
        answer: "The midpoint is $(0, 0)$.",
      };
      const resOrigin = validateGeneratedQuestion(qOrigin, mathContract);
      expect(resOrigin.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("3.6 flags incorrect midpoint calculation (MATH_COORDINATE_GEOMETRY_ERROR)", () => {
      // Midpoint of (0, 0) and (4, 4) is (2, 2), claimed as (3, 3)
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the midpoint of the segment connecting $(0, 0)$ and $(4, 4)$.",
        answer: "The midpoint is $(3, 3)$.",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(true);
    });

    it("3.7 handles Devanagari Hindi phrasing for coordinate distance and midpoint", () => {
      const qHindi: ValidatableQuestion = {
        type: "SHORT",
        text: "बिन्दुओं $(1, 2)$ और $(4, 6)$ के बीच की दूरी ज्ञात कीजिए।",
        answer: "दूरी 5 मात्रक है।",
      };
      const res = validateGeneratedQuestion(qHindi, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("3.8 [BOUNDARY PROBE] checks simplified radical form like 2\\sqrt{2} for coordinate distance", () => {
      // Distance between (0, 0) and (2, 2) is sqrt(8) = 2\sqrt{2}
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between the points $(0, 0)$ and $(2, 2)$.",
        answer: "The distance is $2\\sqrt{2}$ units.",
      };
      const res = validateGeneratedQuestion(q, mathContract);
      const hasFalsePositive = res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR");
      // Remediated: 2\sqrt{2} is evaluated to d = 2.83 and d^2 = 8, matching true distance
      expect(hasFalsePositive).toBe(false);
    });
  });

  /* ================================================================== */
  /* SUITE 4: Variant Complexity Alignment (Basic vs Standard) Stress   */
  /* ================================================================== */
  describe("Suite 4: Variant Complexity Alignment Stress", () => {
    const basicContract = createTestContract({
      canonicalSubject: "Mathematics",
      subjectCode: "101",
      subjectVariant: "BASIC",
    });

    const standardContract = createTestContract({
      canonicalSubject: "Mathematics",
      subjectCode: "100",
      subjectVariant: "STANDARD",
      marksEach: 4,
    });

    it("4.1 rejects irrationality proofs in Basic Math 101 in Hindi (MATH_VARIANT_COMPLEXITY_MISMATCH)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "सिद्ध कीजिए कि $\\sqrt{3}$ एक अपरिमेय संख्या है।",
        answer: "माना कि...",
        marks: 3,
      };
      const res = validateGeneratedQuestion(q, basicContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_VARIANT_COMPLEXITY_MISMATCH")).toBe(true);
    });

    it("4.2 rejects irrationality proofs in Basic Math 101 with root symbol (MATH_VARIANT_COMPLEXITY_MISMATCH)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Prove that root 5 is irrational.",
        answer: "Proof by contradiction...",
        marks: 3,
      };
      const res = validateGeneratedQuestion(q, basicContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_VARIANT_COMPLEXITY_MISMATCH")).toBe(true);
    });

    it("4.3 permits irrationality proofs in Standard Math 100", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Prove that $\\sqrt{5}$ is irrational.",
        answer: "Proof by contradiction...",
        marks: 3,
      };
      const standard3m = { ...standardContract, marksEach: 3 };
      const res = validateGeneratedQuestion(q, standard3m);
      expect(res.issues.some((i) => i.code === "MATH_VARIANT_COMPLEXITY_MISMATCH")).toBe(false);
    });

    it("4.4 rejects trivial single-step arithmetic in Standard Math 4-mark slots in Hindi (MATH_VARIANT_COMPLEXITY_MISMATCH)", () => {
      const q: ValidatableQuestion = {
        type: "LONG",
        text: "मान ज्ञात कीजिए : 20 + 30.",
        answer: "50",
        marks: 4,
      };
      const res = validateGeneratedQuestion(q, standardContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_VARIANT_COMPLEXITY_MISMATCH")).toBe(true);
    });

    it("4.5 allows direct arithmetic in 2-mark slots of Standard Math", () => {
      const standard2m = { ...standardContract, marksEach: 2 };
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the value of $15 + 25$.",
        answer: "40",
        marks: 2,
      };
      const res = validateGeneratedQuestion(q, standard2m);
      expect(res.issues.some((i) => i.code === "MATH_VARIANT_COMPLEXITY_MISMATCH")).toBe(false);
    });

    it("4.6 accepts multi-step problem solving in Standard Math 4-mark slots", () => {
      const q: ValidatableQuestion = {
        type: "LONG",
        text: "A motor boat whose speed is 18 km/h in still water takes 1 hour more to go 24 km upstream than to return downstream to the same spot. Find the speed of the stream.",
        answer: "Let the speed of the stream be x km/h...",
        marks: 4,
      };
      const res = validateGeneratedQuestion(q, standardContract);
      expect(res.issues.some((i) => i.code === "MATH_VARIANT_COMPLEXITY_MISMATCH")).toBe(false);
    });
  });

  /* ================================================================== */
  /* SUITE 5: Sanskrit Paninian Pratyaya / Suffix Rules Stress          */
  /* ================================================================== */
  describe("Suite 5: Sanskrit Paninian Pratyaya Rules Stress", () => {
    const matchContract: GenerationContract = {
      ...sanskritContract,
      questionType: "MATCH_COLUMN",
      marksEach: 4,
    };

    it("5.1 flags feminine past active participle (-वती) paired with क्त instead of क्तवतु (SANSKRIT_PRATYAYA_MISMATCH)", () => {
      const q: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "उचितं मेलनं कुरुत:",
        options: ["कृतवती ||| क्त-प्रत्ययः", "नमस्ते ||| विसर्गसन्धिः"],
        answer: "(A)-(i), (B)-(ii)",
      };
      const res = validateGeneratedQuestion(q, matchContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);
    });

    it("5.2 flags neuter past active participle (-वत्) paired with क्त instead of क्तवतु (SANSKRIT_PRATYAYA_MISMATCH)", () => {
      const q: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "उचितं मेलनं कुरुत:",
        options: ["कृतवत् ||| क्त-प्रत्ययः", "नमस्ते ||| विसर्गसन्धिः"],
        answer: "(A)-(i), (B)-(ii)",
      };
      const res = validateGeneratedQuestion(q, matchContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);
    });

    it("5.3 flags past passive participle ending in -ता or -तम् paired with क्तवतु (SANSKRIT_PRATYAYA_MISMATCH)", () => {
      // गता taking क्तवतु-प्रत्ययः -> ERROR
      const qFem: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "उचितं मेलनं कुरुत:",
        options: ["गता ||| क्तवतु-प्रत्ययः", "नमस्ते ||| विसर्गसन्धिः"],
        answer: "(A)-(i), (B)-(ii)",
      };
      const resFem = validateGeneratedQuestion(qFem, matchContract);
      expect(resFem.valid).toBe(false);
      expect(resFem.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);

      // कृतम् taking क्तवतु-प्रत्ययः -> ERROR
      const qNeut: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "उचितं मेलनं कुरुत:",
        options: ["कृतम् ||| क्तवतु-प्रत्ययः", "नमस्ते ||| विसर्गसन्धिः"],
        answer: "(A)-(i), (B)-(ii)",
      };
      const resNeut = validateGeneratedQuestion(qNeut, matchContract);
      expect(resNeut.valid).toBe(false);
      expect(resNeut.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);
    });

    it("5.4 flags uncompounded gerunds भूत्वा and दृष्ट्वा paired with ल्यप् (SANSKRIT_PRATYAYA_MISMATCH)", () => {
      const qBhutva: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "उचितं मेलनं कुरुत:",
        options: ["भूत्वा ||| ल्यप्-प्रत्ययः", "पठितवान् ||| क्तवतु-प्रत्ययः"],
        answer: "(A)-(i), (B)-(ii)",
      };
      const res1 = validateGeneratedQuestion(qBhutva, matchContract);
      expect(res1.valid).toBe(false);
      expect(res1.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);

      const qDrishtva: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "उचितं मेलनं कुरुत:",
        options: ["दृष्ट्वा ||| ल्यप्-प्रत्ययः", "पठितवान् ||| क्तवतु-प्रत्ययः"],
        answer: "(A)-(i), (B)-(ii)",
      };
      const res2 = validateGeneratedQuestion(qDrishtva, matchContract);
      expect(res2.valid).toBe(false);
      expect(res2.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);
    });

    it("5.5 flags prefix-compounded gerunds सम्पूज्य and प्रणम्य paired with क्त्वा (SANSKRIT_PRATYAYA_MISMATCH)", () => {
      const qSampujya: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "उचितं मेलनं कुरुत:",
        options: ["सम्पूज्य ||| क्त्वा-प्रत्ययः", "पठितवान् ||| क्तवतु-प्रत्ययः"],
        answer: "(A)-(i), (B)-(ii)",
      };
      const res1 = validateGeneratedQuestion(qSampujya, matchContract);
      expect(res1.valid).toBe(false);
      expect(res1.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);

      const qPranamya: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "उचितं मेलनं कुरुत:",
        options: ["प्रणम्य ||| क्त्वा-प्रत्ययः", "पठितवान् ||| क्तवतु-प्रत्ययः"],
        answer: "(A)-(i), (B)-(ii)",
      };
      const res2 = validateGeneratedQuestion(qPranamya, matchContract);
      expect(res2.valid).toBe(false);
      expect(res2.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);
    });

    it("5.6 flags infinitives गन्तुम् and कर्तुम् paired with क्त्वा or शतृ (SANSKRIT_PRATYAYA_MISMATCH)", () => {
      const qGantum: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "उचितं मेलनं कुरुत:",
        options: ["गन्तुम् ||| क्त्वा-प्रत्ययः", "नमस्ते ||| विसर्गसन्धिः"],
        answer: "(A)-(i), (B)-(ii)",
      };
      const res1 = validateGeneratedQuestion(qGantum, matchContract);
      expect(res1.valid).toBe(false);
      expect(res1.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);

      const qKartum: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "उचितं मेलनं कुरुत:",
        options: ["कर्तुम् ||| शतृ-प्रत्ययः", "नमस्ते ||| विसर्गसन्धिः"],
        answer: "(A)-(i), (B)-(ii)",
      };
      const res2 = validateGeneratedQuestion(qKartum, matchContract);
      expect(res2.valid).toBe(false);
      expect(res2.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);
    });

    it("5.7 flags present active participle कुर्वन् paired with शानच् (SANSKRIT_PRATYAYA_MISMATCH)", () => {
      const q: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "उचितं मेलनं कुरुत:",
        options: ["कुर्वन् ||| शानच्-प्रत्ययः", "नमस्ते ||| विसर्गसन्धिः"],
        answer: "(A)-(i), (B)-(ii)",
      };
      const res = validateGeneratedQuestion(q, matchContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);
    });

    it("5.8 passes comprehensive, completely authentic Paninian matching sets", () => {
      const qValid: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "उचितं मेलनं कुरुत:",
        options: [
          "पठितवान् ||| क्तवतु-प्रत्ययः",
          "लिखितः ||| क्त-प्रत्ययः",
          "गत्वा ||| क्त्वा-प्रत्ययः",
          "विहाय ||| ल्यप्-प्रत्ययः",
          "गन्तुम् ||| तुमुन्-प्रत्ययः",
          "हसन् ||| शतृ-प्रत्ययः",
        ],
        answer: "(A)-(i), (B)-(ii), (C)-(iii), (D)-(iv), (E)-(v), (F)-(vi)",
      };
      const res = validateGeneratedQuestion(qValid, matchContract);
      expect(res.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(false);
    });
  });

  /* ================================================================== */
  /* SUITE 6: Sanskrit Anti-Calque & Hindi Syntax Leakage Stress        */
  /* ================================================================== */
  describe("Suite 6: Sanskrit Anti-Calque & Hindi Syntax Leakage Stress", () => {
    it("6.1 rejects pseudo-Sanskrit passive calque with गच्छति (SANSKRIT_HINDI_CALQUE_ERROR)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "अधोलिखितं गद्यांशं प्रदत्तोग्छति तं पठित्वा उत्तरत।",
        answer: "उत्तरम्",
      };
      const res = validateGeneratedQuestion(q, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("6.2 rejects Hindi auxiliary verbs leakage 'था' or 'है' when separated by whitespace (SANSKRIT_HINDI_CALQUE_ERROR)", () => {
      const qTha: ValidatableQuestion = {
        type: "SHORT",
        text: "प्राचीनकाले एकः नृपः था तस्य नाम किम्?",
        answer: "दशरथः",
      };
      const res1 = validateGeneratedQuestion(qTha, sanskritContract);
      expect(res1.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);

      const qHai: ValidatableQuestion = {
        type: "SHORT",
        text: "संस्कृतभाषा अतिप्राचीना भाषा है इति मन्यते।",
        answer: "आम्",
      };
      const res2 = validateGeneratedQuestion(qHai, sanskritContract);
      expect(res2.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("6.3 [BOUNDARY PROBE] exposes defect where Hindi auxiliary verbs preceding Devanagari danda escape detection", () => {
      // Because danda (। U+0964) is in the [\u0900-\u097F] range, [^\u0900-\u097F] boundary fails when followed by ।
      const qThaDanda: ValidatableQuestion = {
        type: "SHORT",
        text: "प्राचीनकाले एकः नृपः था। तस्य नाम किम्?",
        answer: "दशरथः",
      };
      const res1 = validateGeneratedQuestion(qThaDanda, sanskritContract);
      const detected1 = res1.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR");
      expect(detected1).toBe(true); // Remediated: Devanagari danda boundary catches Hindi auxiliary before ।

      const qChahiyeDanda: ValidatableQuestion = {
        type: "SHORT",
        text: "छात्रैः सदा सत्यं वक्तव्यं चाहिए।",
        answer: "आम्",
      };
      const res2 = validateGeneratedQuestion(qChahiyeDanda, sanskritContract);
      const detected2 = res2.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR");
      expect(detected2).toBe(true); // Remediated: Devanagari danda boundary catches Hindi modal before ।
    });

    it("6.4 rejects Hindi modal leakage 'चाहिए' when separated by whitespace (SANSKRIT_HINDI_CALQUE_ERROR)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "छात्रैः सदा सत्यं वक्तव्यं चाहिए इति नियमः।",
        answer: "आम्",
      };
      const res = validateGeneratedQuestion(q, sanskritContract);
      expect(res.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("6.5 rejects Hindi postposition leakage 'बालक को' or 'वृक्ष से' (SANSKRIT_HINDI_CALQUE_ERROR)", () => {
      const qKo: ValidatableQuestion = {
        type: "SHORT",
        text: "बालक को मोदकं रोचते।",
        answer: "बालकाय मोदकं रोचते।",
      };
      const res1 = validateGeneratedQuestion(qKo, sanskritContract);
      expect(res1.valid).toBe(false);
      expect(res1.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);

      const qSe: ValidatableQuestion = {
        type: "SHORT",
        text: "वृक्ष से पत्राणि पतन्ति।",
        answer: "वृक्षात् पत्राणि पतन्ति।",
      };
      const res2 = validateGeneratedQuestion(qSe, sanskritContract);
      expect(res2.valid).toBe(false);
      expect(res2.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("6.6 does NOT false-positive on authentic Sanskrit containing embedded syllables 'था' in 'यथा/तथा'", () => {
      const qYatha: ValidatableQuestion = {
        type: "SHORT",
        text: "यथा राजा तथा प्रजा इति सूक्तेः भावं वर्णयत।",
        answer: "यथा...",
      };
      const res = validateGeneratedQuestion(qYatha, sanskritContract);
      expect(res.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(false);
    });

    it("6.7 passes authentic Sanskrit passive voice using -यते inflections", () => {
      const qPassive: ValidatableQuestion = {
        type: "SHORT",
        text: "मया ग्रन्थः पठ्यते, अस्य वाक्यस्य कर्तृवाच्ये परिवर्तनं कुरुत।",
        answer: "अहं ग्रन्थं पठामि।",
      };
      const res = validateGeneratedQuestion(qPassive, sanskritContract);
      expect(res.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(false);
    });
  });

  /* ================================================================== */
  /* SUITE 7: Sanskrit Interrogative Pronoun 3-Gender Agreement Stress  */
  /* ================================================================== */
  describe("Suite 7: Sanskrit 3-Gender Pronoun Agreement Stress", () => {
    it("7.1 rejects singular masculine interrogative 'कम्' with dual masculine choices (SANSKRIT_AGREEMENT_ERROR)", () => {
      const q: ValidatableQuestion = {
        type: "MCQ",
        text: "राजा दशरथः कम् प्रीत्या अपश्यत्?",
        options: ["लवकुशौ", "रामलक्ष्मणौ", "भरतशत्रुघ्नौ", "कृष्णबलरामौ"],
        answer: "रामलक्ष्मणौ",
      };
      const res = validateGeneratedQuestion(q, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_AGREEMENT_ERROR")).toBe(true);
      expect(res.issues[0].message).toContain("dual entities");
    });

    it("7.2 rejects singular masculine 'कः' when all options are feminine singular (SANSKRIT_AGREEMENT_ERROR)", () => {
      const q: ValidatableQuestion = {
        type: "MCQ",
        text: "अस्यां कथायां काव्यात्मिका कः अस्ति?",
        options: ["लता", "सरस्वती", "माता", "प्रकृतिः"],
        answer: "सरस्वती",
      };
      const res = validateGeneratedQuestion(q, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_AGREEMENT_ERROR")).toBe(true);
      expect(res.issues[0].message).toContain("feminine interrogative 'का'");
    });

    it("7.3 rejects singular masculine 'कः' when all options are neuter singular (SANSKRIT_AGREEMENT_ERROR)", () => {
      const q: ValidatableQuestion = {
        type: "MCQ",
        text: "उद्याने सुन्दरं कः विकसति?",
        options: ["कमलम्", "पुष्पम्", "पत्रम्", "फलम्"],
        answer: "पुष्पम्",
      };
      const res = validateGeneratedQuestion(q, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_AGREEMENT_ERROR")).toBe(true);
      expect(res.issues[0].message).toContain("neuter interrogative 'किम्'");
    });

    it("7.4 detects ungrammatical dual noun inflection 'द्वौ बालको' (SANSKRIT_MORPHOLOGY_ERROR)", () => {
      const q: ValidatableQuestion = {
        type: "MCQ",
        text: "द्वौ बालको कुत्र गच्छतः?",
        options: ["ग्रामम्", "विद्यालयम्", "नगरम्", "गृहम्"],
        answer: "विद्यालयम्",
      };
      const res = validateGeneratedQuestion(q, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_MORPHOLOGY_ERROR")).toBe(true);
      expect(res.issues[0].message).toContain("द्वौ बालकौ");
    });

    it("7.5 passes grammatically concordant masculine singular question and options", () => {
      const q: ValidatableQuestion = {
        type: "MCQ",
        text: "पाठानुसारं कः श्रेष्ठः छात्रः आसीत्?",
        options: ["बालकः", "रामः", "सुरेशः", "गोपालः"],
        answer: "रामः",
      };
      const res = validateGeneratedQuestion(q, sanskritContract);
      expect(res.issues.some((i) => i.code === "SANSKRIT_AGREEMENT_ERROR")).toBe(false);
    });

    it("7.6 passes grammatically concordant feminine singular question with 'का'", () => {
      const q: ValidatableQuestion = {
        type: "MCQ",
        text: "पाठानुसारं रामस्य भार्या का आसीत्?",
        options: ["सीता", "उर्मिला", "माण्डवी", "श्रुतकीर्तिः"],
        answer: "सीता",
      };
      const res = validateGeneratedQuestion(q, sanskritContract);
      expect(res.issues.some((i) => i.code === "SANSKRIT_AGREEMENT_ERROR")).toBe(false);
    });

    it("7.7 detects typographical corruption 'एकचने' (SANSKRIT_SPELLING_ERROR)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "पदस्य एकचने रूपं लिखत।",
        answer: "बालकः",
      };
      const res = validateGeneratedQuestion(q, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_SPELLING_ERROR")).toBe(true);
    });
  });
});
