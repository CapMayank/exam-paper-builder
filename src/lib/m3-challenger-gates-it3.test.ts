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

describe("Milestone 3 Iteration 3 Adversarial Empirical Challenger: Mathematics & Sanskrit Quality Gates", () => {
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

  const mathStandardContract = createTestContract({
    canonicalSubject: "Mathematics",
    subjectCode: "100",
    subjectVariant: "STANDARD",
    language: "en",
    className: "Class 10",
  });

  const mathBasicContract = createTestContract({
    canonicalSubject: "Mathematics",
    subjectCode: "101",
    subjectVariant: "BASIC",
    language: "en",
    className: "Class 10",
  });

  const mathHindiContract = createTestContract({
    canonicalSubject: "Mathematics",
    subjectCode: "100",
    language: "hi",
    className: "Class 10",
  });

  const mathClass12Contract = createTestContract({
    canonicalSubject: "Mathematics",
    subjectCode: "150",
    className: "Class 12",
    language: "en",
  });

  const sanskritContract = createTestContract({
    canonicalSubject: "Sanskrit",
    subjectCode: "122",
    language: "sa",
    className: "Class 10",
  });

  /* ================================================================== */
  /* SUITE 1: Quadratic Equations & MCQ Distractor Isolation Stress     */
  /* ================================================================== */
  describe("Suite 1: Quadratic Equation Discriminant & MCQ Distractor Stress", () => {
    it("1.1 parses pure quadratic equations with zero linear coefficient (ax^2 + c = 0)", () => {
      // x^2 - 16 = 0 -> a=1, b=0, c=-16 -> D = 0 - 4(1)(-16) = 64 > 0 (two distinct real roots)
      const qPurePos = parseQuadraticEquation("Solve $x^2 - 16 = 0$");
      expect(qPurePos).not.toBeNull();
      expect(qPurePos?.a).toBe(1);
      expect(qPurePos?.b).toBe(0);
      expect(qPurePos?.c).toBe(-16);
      expect(qPurePos?.discriminant).toBe(64);

      // 2x^2 + 8 = 0 -> a=2, b=0, c=8 -> D = -64 < 0 (no real roots)
      const qPureNeg = parseQuadraticEquation("Given $2x^2 + 8 = 0$");
      expect(qPureNeg).not.toBeNull();
      expect(qPureNeg?.a).toBe(2);
      expect(qPureNeg?.b).toBe(0);
      expect(qPureNeg?.c).toBe(8);
      expect(qPureNeg?.discriminant).toBe(-64);
    });

    it("1.2 parses quadratic equations with zero constant term (ax^2 + bx = 0)", () => {
      // 3x^2 - 6x = 0 -> a=3, b=-6, c=0 -> D = 36 - 0 = 36 > 0
      const qZeroC = parseQuadraticEquation("Find roots of $3x^2 - 6x = 0$");
      expect(qZeroC).not.toBeNull();
      expect(qZeroC?.a).toBe(3);
      expect(qZeroC?.b).toBe(-6);
      expect(qZeroC?.c).toBe(0);
      expect(qZeroC?.discriminant).toBe(36);
    });

    it("1.3 correctly validates negative leading coefficient equations (-x^2 + bx - c = 0)", () => {
      // -x^2 + 4x - 4 = 0 -> a=-1, b=4, c=-4 -> D = 16 - 4(-1)(-4) = 16 - 16 = 0 (equal roots)
      const qEqual: ValidatableQuestion = {
        type: "SHORT",
        text: "For the quadratic equation $-x^2 + 4x - 4 = 0$, prove that it has two equal real roots.",
        answer: "Discriminant D = 0, so roots are real and equal.",
      };
      const resEqual = validateGeneratedQuestion(qEqual, mathStandardContract);
      expect(resEqual.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(false);

      // Claiming distinct real roots for -x^2 + 4x - 4 = 0 must fail
      const qInvalid: ValidatableQuestion = {
        type: "SHORT",
        text: "The equation $-x^2 + 4x - 4 = 0$ has two distinct real roots.",
        answer: "True",
      };
      const resInvalid = validateGeneratedQuestion(qInvalid, mathStandardContract);
      expect(resInvalid.valid).toBe(false);
      expect(resInvalid.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(true);
    });

    it("1.4 handles complex roots (D < 0) without false alarms when correctly asserted", () => {
      // 2x^2 - 3x + 5 = 0 -> D = 9 - 40 = -31 < 0 -> no real roots
      const qComplex: ValidatableQuestion = {
        type: "MCQ",
        text: "What is the nature of the roots of the quadratic equation $2x^2 - 3x + 5 = 0$?",
        options: [
          "(A) Two distinct real roots",
          "(B) Two equal real roots",
          "(C) No real roots (complex roots)",
          "(D) More than two roots",
        ],
        answer: "(C) No real roots (complex roots)",
        explanation: "Since discriminant D = b^2 - 4ac = 9 - 40 = -31 < 0, there are no real roots.",
      };
      const res = validateGeneratedQuestion(qComplex, mathStandardContract);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(false);
    });

    it("1.5 flags false claim when equation with D < 0 is claimed to have real roots", () => {
      // x^2 + 2x + 5 = 0 -> D = 4 - 20 = -16 < 0
      const qFalseClaim: ValidatableQuestion = {
        type: "MCQ",
        text: "For the quadratic equation $x^2 + 2x + 5 = 0$, choose the correct statement:",
        options: [
          "(A) It has two distinct real roots",
          "(B) It has two equal real roots",
          "(C) It has real rational roots",
          "(D) None of these",
        ],
        answer: "(A) It has two distinct real roots",
        explanation: "The equation has real roots.",
      };
      const res = validateGeneratedQuestion(qFalseClaim, mathStandardContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(true);
    });

    it("1.6 flags false claim when equation with D > 0 is claimed to have equal roots", () => {
      // x^2 - 5x + 6 = 0 -> D = 25 - 24 = 1 > 0
      const qFalseEqual: ValidatableQuestion = {
        type: "SHORT",
        text: "Show that the quadratic equation $x^2 - 5x + 6 = 0$ has two equal real roots.",
        answer: "The roots are equal.",
      };
      const res = validateGeneratedQuestion(qFalseEqual, mathStandardContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(true);
    });

    it("1.7 resolves target equation in 'Which of the following' MCQ from answer, ignoring distractor Option A", () => {
      // Option A has D > 0 (x^2 - 4x + 1 = 0, D = 12)
      // Option B has D = 0 (x^2 - 4x + 4 = 0, D = 0, target answer)
      // Option C has D < 0 (x^2 - 4x + 5 = 0, D = -4)
      const qWhich: ValidatableQuestion = {
        type: "MCQ",
        text: "Which of the following quadratic equations has two equal real roots?",
        options: [
          "(A) $x^2 - 4x + 1 = 0$",
          "(B) $x^2 - 4x + 4 = 0$",
          "(C) $x^2 - 4x + 5 = 0$",
          "(D) $x^2 - 2x = 0$",
        ],
        answer: "(B) $x^2 - 4x + 4 = 0$",
        explanation: "For $x^2 - 4x + 4 = 0$, D = (-4)^2 - 4(1)(4) = 16 - 16 = 0, so it has two equal real roots.",
      };
      const res = validateGeneratedQuestion(qWhich, mathStandardContract);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(false);
    });

    it("1.8 handles Hindi Devanagari phrasing for equal and no real roots", () => {
      // 3x^2 - 6x + 3 = 0 -> D = 36 - 36 = 0 -> समान वास्तविक मूल
      const qHindiEqual: ValidatableQuestion = {
        type: "SHORT",
        text: "द्विघात समीकरण $3x^2 - 6x + 3 = 0$ के समान वास्तविक मूल हैं।",
        answer: "सत्य (D = 0)",
      };
      const resPassEqual = validateGeneratedQuestion(qHindiEqual, mathHindiContract);
      expect(resPassEqual.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(false);

      // x^2 + x + 2 = 0 -> D = 1 - 8 = -7 < 0 -> कोई वास्तविक मूल नहीं
      const qHindiNoReal: ValidatableQuestion = {
        type: "SHORT",
        text: "समीकरण $x^2 + x + 2 = 0$ के कोई वास्तविक मूल नहीं हैं।",
        answer: "सत्य क्योंकि D < 0",
      };
      const resPassNoReal = validateGeneratedQuestion(qHindiNoReal, mathHindiContract);
      expect(resPassNoReal.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(false);
    });
  });

  /* ================================================================== */
  /* SUITE 2: Coordinate Geometry Surds, Fractions & Negative Points    */
  /* ================================================================== */
  describe("Suite 2: Coordinate Geometry Surds, Negative Coordinates & Midpoint Stress", () => {
    it("2.1 handles negative coordinates across multiple quadrants in distance formula", () => {
      // (-3, -4) and (3, 4) -> dx = 6, dy = 8 -> d^2 = 100 -> d = 10
      const q10: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between the points $(-3, -4)$ and $(3, 4)$.",
        answer: "The distance between the points is 10 units.",
      };
      const res10 = validateGeneratedQuestion(q10, mathStandardContract);
      expect(res10.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);

      // (-7, 2) and (-1, -6) -> dx = 6, dy = -8 -> d^2 = 100 -> d = 10
      const q10Quad: ValidatableQuestion = {
        type: "SHORT",
        text: "Calculate the distance between $(-7, 2)$ and $(-1, -6)$.",
        answer: "d = 10",
      };
      const res10Quad = validateGeneratedQuestion(q10Quad, mathStandardContract);
      expect(res10Quad.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("2.2 verifies simplified surds of form k\\sqrt{n} (e.g. 3\\sqrt{5}, 2\\sqrt{13}, 5\\sqrt{2})", () => {
      // (1, 2) and (4, 8) -> dx = 3, dy = 6 -> d^2 = 9 + 36 = 45 -> d = 3\sqrt{5}
      const q3sqrt5: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between the points $(1, 2)$ and $(4, 8)$.",
        answer: "The distance is $3\\sqrt{5}$ units.",
      };
      const res3sqrt5 = validateGeneratedQuestion(q3sqrt5, mathStandardContract);
      expect(res3sqrt5.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);

      // (0, 0) and (4, 6) -> dx = 4, dy = 6 -> d^2 = 16 + 36 = 52 -> d = 2\sqrt{13}
      const q2sqrt13: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance of the point $(4, 6)$ from the origin $(0, 0)$.",
        answer: "Distance = $2\\sqrt{13}$",
      };
      const res2sqrt13 = validateGeneratedQuestion(q2sqrt13, mathStandardContract);
      expect(res2sqrt13.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);

      // (-5, -5) and (0, 0) -> dx = 5, dy = 5 -> d = 5\sqrt{2}
      const q5sqrt2: ValidatableQuestion = {
        type: "SHORT",
        text: "Calculate the distance between $(-5, -5)$ and $(0, 0)$.",
        answer: "Distance is $5\\sqrt{2}$ units.",
      };
      const res5sqrt2 = validateGeneratedQuestion(q5sqrt2, mathStandardContract);
      expect(res5sqrt2.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("2.3 flags mathematically wrong distance calculation in answer", () => {
      // (0, 0) and (3, 4) -> true distance is 5. Claimed as 7.
      const qWrong: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between the points $(0, 0)$ and $(3, 4)$.",
        answer: "The distance is 7 units.",
      };
      const resWrong = validateGeneratedQuestion(qWrong, mathStandardContract);
      expect(resWrong.valid).toBe(false);
      expect(resWrong.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(true);
    });

    it("2.4 verifies midpoint with negative coordinates and zero coordinates", () => {
      // (-6, 8) and (2, -4) -> midpoint is ((-6+2)/2, (8-4)/2) = (-2, 2)
      const qMid: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the coordinates of the midpoint of the line segment joining $(-6, 8)$ and $(2, -4)$.",
        answer: "Midpoint is $(-2, 2)$.",
      };
      const resMid = validateGeneratedQuestion(qMid, mathStandardContract);
      expect(resMid.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);

      // Wrong midpoint claimed: (-6, 8) and (2, -4) claimed as (2, 2)
      const qWrongMid: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the midpoint of the line segment joining $(-6, 8)$ and $(2, -4)$.",
        answer: "Midpoint is $(2, 2)$.",
      };
      const resWrongMid = validateGeneratedQuestion(qWrongMid, mathStandardContract);
      expect(resWrongMid.valid).toBe(false);
      expect(resWrongMid.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(true);
    });

    it("2.5 verifies MCQ options with coordinate distance without distractor false positives", () => {
      // Distance between (1, 2) and (4, 6) is 5
      const qMcqCoord: ValidatableQuestion = {
        type: "MCQ",
        text: "What is the distance between the points $(1, 2)$ and $(4, 6)$?",
        options: [
          "(A) 3 units",
          "(B) 4 units",
          "(C) 5 units",
          "(D) 6 units",
        ],
        answer: "(C) 5 units",
        explanation: "d = sqrt((4-1)^2 + (6-2)^2) = sqrt(9 + 16) = 5.",
      };
      const resMcq = validateGeneratedQuestion(qMcqCoord, mathStandardContract);
      expect(resMcq.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("2.6 flags MCQ with incorrect coordinate distance answer", () => {
      // Distance between (1, 2) and (4, 6) is 5, but answer claims 3 units
      const qMcqWrong: ValidatableQuestion = {
        type: "MCQ",
        text: "What is the distance between the points $(1, 2)$ and $(4, 6)$?",
        options: [
          "(A) 3 units",
          "(B) 4 units",
          "(C) 5 units",
          "(D) 6 units",
        ],
        answer: "(A) 3 units",
        explanation: "Distance is 3 units.",
      };
      const resMcqWrong = validateGeneratedQuestion(qMcqWrong, mathStandardContract);
      expect(resMcqWrong.valid).toBe(false);
      expect(resMcqWrong.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(true);
    });
  });

  /* ================================================================== */
  /* SUITE 3: Arithmetic Evaluator Precision & Tolerance Boundary       */
  /* ================================================================== */
  describe("Suite 3: Arithmetic Evaluator Precision & Tolerance Boundary", () => {
    it("3.1 evaluates complex nested BODMAS operations without eval()", () => {
      // 100 - (10 * 2^3) / 4 + 5 = 100 - 80 / 4 + 5 = 100 - 20 + 5 = 85
      expect(evaluateArithmeticExpression("100 - (10 * 2^3) / 4 + 5")).toBe(85);

      // Nested fraction: \frac{1 + \frac{1}{2}}{1 - \frac{1}{2}} = (1.5) / (0.5) = 3
      expect(evaluateArithmeticExpression("\\frac{1 + \\frac{1}{2}}{1 - \\frac{1}{2}}")).toBe(3);
    });

    it("3.2 validates calculations within 1e-4 tolerance and rejects discrepancies > 1e-4", () => {
      // Exact calculation
      const passRes = validateArithmeticEquality("Simplify: $25 \\times 4 + 15 = 115$.");
      expect(passRes.isValid).toBe(true);

      // Faulty calculation (100 + 15 = 120 instead of 115)
      const failRes = validateArithmeticEquality("Calculate: $25 \\times 4 + 15 = 120$.");
      expect(failRes.isValid).toBe(false);
      expect(failRes.error).toContain("Arithmetic calculation error");
    });

    it("3.3 ignores algebraic variable statements (F = ma, y = 2x + 1) without false alarms", () => {
      const algRes = validateArithmeticEquality("In the line equation $y = 2x + 1$, find the slope.");
      expect(algRes.isValid).toBe(true);

      const physFormula = validateArithmeticEquality("From Newton's second law, $F = m \\times a$.");
      expect(physFormula.isValid).toBe(true);
    });
  });

  /* ================================================================== */
  /* SUITE 4: Mathematics Variant Complexity Alignment & Deleted Topics */
  /* ================================================================== */
  describe("Suite 4: Mathematics Variant Complexity & Class 12 Deleted Topics", () => {
    it("4.1 disallows irrationality proofs in Basic Mathematics (Code 101)", () => {
      const qIrrationalBasic: ValidatableQuestion = {
        type: "SHORT",
        text: "Prove that $\\sqrt{5}$ is an irrational number.",
        answer: "Proof by contradiction.",
      };
      const resBasic = validateGeneratedQuestion(qIrrationalBasic, mathBasicContract);
      expect(resBasic.valid).toBe(false);
      expect(resBasic.issues.some((i) => i.code === "MATH_VARIANT_COMPLEXITY_MISMATCH")).toBe(true);
    });

    it("4.2 permits irrationality proofs in Standard Mathematics (Code 100)", () => {
      const qIrrationalStd: ValidatableQuestion = {
        type: "SHORT",
        text: "Prove that $\\sqrt{5}$ is an irrational number.",
        answer: "Proof by contradiction.",
      };
      const resStd = validateGeneratedQuestion(qIrrationalStd, mathStandardContract);
      expect(resStd.issues.some((i) => i.code === "MATH_VARIANT_COMPLEXITY_MISMATCH")).toBe(false);
    });

    it("4.3 disallows trivial 1-step arithmetic substitution in Standard Math 4-mark slots", () => {
      const qTrivial4m: ValidatableQuestion = {
        type: "LONG",
        marks: 4,
        text: "Find the value of 25 + 15.",
        answer: "40",
      };
      const res4m = validateGeneratedQuestion(qTrivial4m, mathStandardContract);
      expect(res4m.valid).toBe(false);
      expect(res4m.issues.some((i) => i.code === "MATH_VARIANT_COMPLEXITY_MISMATCH")).toBe(true);
    });

    it("4.4 detects deleted rationalized topics for Class 12 Mathematics", () => {
      // Binary operation in Relations and Functions
      const qBinary: ValidatableQuestion = {
        type: "SHORT",
        chapterTitle: "Relations and Functions",
        text: "Let * be a binary operation on R defined by a * b = a + b - ab.",
        answer: "Commutative and associative.",
      };
      const resBinary = validateGeneratedQuestion(qBinary, mathClass12Contract);
      expect(resBinary.valid).toBe(false);
      expect(resBinary.issues.some((i) => i.code === "DELETED_SYLLABUS_TOPIC")).toBe(true);

      // Rolle's Theorem in Continuity
      const qRolles: ValidatableQuestion = {
        type: "SHORT",
        chapterTitle: "Continuity and Differentiability",
        text: "Verify Rolle's theorem for the function f(x) = x^2 - 4x + 3 on [1, 3].",
        answer: "c = 2 in (1, 3).",
      };
      const resRolles = validateGeneratedQuestion(qRolles, mathClass12Contract);
      expect(resRolles.valid).toBe(false);
      expect(resRolles.issues.some((i) => i.code === "DELETED_SYLLABUS_TOPIC")).toBe(true);

      // Elementary row transformation in Matrices
      const qElemRow: ValidatableQuestion = {
        type: "LONG",
        chapterTitle: "Matrices",
        text: "Using elementary row operations, find the inverse of matrix A.",
        answer: "A^-1 found.",
      };
      const resElemRow = validateGeneratedQuestion(qElemRow, mathClass12Contract);
      expect(resElemRow.valid).toBe(false);
      expect(resElemRow.issues.some((i) => i.code === "DELETED_SYLLABUS_TOPIC")).toBe(true);

      // Limit of a sum in Integrals
      const qLimitSum: ValidatableQuestion = {
        type: "LONG",
        chapterTitle: "Integrals",
        text: "Evaluate the definite integral as the limit of a sum.",
        answer: "Value calculated.",
      };
      const resLimitSum = validateGeneratedQuestion(qLimitSum, mathClass12Contract);
      expect(resLimitSum.valid).toBe(false);
      expect(resLimitSum.issues.some((i) => i.code === "DELETED_SYLLABUS_TOPIC")).toBe(true);

      // Scalar triple product in Vectors
      const qSTP: ValidatableQuestion = {
        type: "SHORT",
        chapterTitle: "Vector Algebra",
        text: "Calculate the scalar triple product [a b c] of the vectors.",
        answer: "12",
      };
      const resSTP = validateGeneratedQuestion(qSTP, mathClass12Contract);
      expect(resSTP.valid).toBe(false);
      expect(resSTP.issues.some((i) => i.code === "DELETED_SYLLABUS_TOPIC")).toBe(true);

      // Equation of a plane in 3D Geometry
      const qPlane: ValidatableQuestion = {
        type: "LONG",
        chapterTitle: "Three Dimensional Geometry",
        text: "Find the vector equation of the plane passing through three non-collinear points.",
        answer: "r . n = d",
      };
      const resPlane = validateGeneratedQuestion(qPlane, mathClass12Contract);
      expect(resPlane.valid).toBe(false);
      expect(resPlane.issues.some((i) => i.code === "DELETED_SYLLABUS_TOPIC")).toBe(true);
    });
  });

  /* ================================================================== */
  /* SUITE 5: Sanskrit Paninian Pratyaya Rules (MATCH_COLUMN) Stress    */
  /* ================================================================== */
  describe("Suite 5: Sanskrit Paninian Pratyaya Rules (MATCH_COLUMN) Stress", () => {
    it("5.1 accepts fully authentic Paninian participle-pratyaya pairings", () => {
      const qValidMatch: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "उचितमेलनं कुरुत (क-स्तम्भे पदानि, ख-स्तम्भे प्रत्ययाः):",
        options: [
          "(A) पठितवान् - क्तवतु-प्रत्ययः",
          "(B) लिखितः - क्त-प्रत्ययः",
          "(C) गच्छन् - शतृ-प्रत्ययः",
          "(D) पठित्वा - क्त्वा-प्रत्ययः",
          "(E) सम्पूज्य - ल्यप्-प्रत्ययः",
          "(F) हन्तुम् - तुमुन्-प्रत्ययः",
        ],
        answer: "(A)-4, (B)-1, (C)-5, (D)-2, (E)-3, (F)-6",
      };
      const res = validateGeneratedQuestion(qValidMatch, sanskritContract);
      expect(res.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(false);
    });

    it("5.2 flags -वान् matched to त-प्रत्ययः / क्त-प्रत्ययः (Panini 3.2.102)", () => {
      const qBadKtavatu: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "मेलनं कुरुत:",
        options: [
          "(A) कृतवान् - क्त-प्रत्ययः",
          "(B) गतः - क्त-प्रत्ययः",
        ],
        answer: "(A)-1, (B)-2",
      };
      const res = validateGeneratedQuestion(qBadKtavatu, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);
    });

    it("5.3 flags -तः/-ता/-तम् matched to क्तवतु-प्रत्ययः", () => {
      const qBadKta: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "मेलनं कुरुत:",
        options: [
          "(A) कृतः - क्तवतु-प्रत्ययः",
          "(B) गतवान् - क्तवतु-प्रत्ययः",
        ],
        answer: "(A)-1, (B)-2",
      };
      const res = validateGeneratedQuestion(qBadKta, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);
    });

    it("5.4 flags uncompounded gerund ending in -त्वा matched to ल्यप्-प्रत्ययः (Panini 3.4.21)", () => {
      const qBadKtva: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "मेलनं कुरुत:",
        options: [
          "(A) गत्वा - ल्यप्-प्रत्ययः",
          "(B) आदाय - ल्यप्-प्रत्ययः",
        ],
        answer: "(A)-1, (B)-2",
      };
      const res = validateGeneratedQuestion(qBadKtva, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);
    });

    it("5.5 flags prefix-compounded gerund ending in -य matched to क्त्वा-प्रत्ययः (Panini 7.1.37)", () => {
      const qBadLyap: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "मेलनं कुरुत:",
        options: [
          "(A) प्रणम्य - क्त्वा-प्रत्ययः",
          "(B) श्रुत्वा - क्त्वा-प्रत्ययः",
        ],
        answer: "(A)-1, (B)-2",
      };
      const res = validateGeneratedQuestion(qBadLyap, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);
    });

    it("5.6 flags infinitive in -तुम् matched to wrong pratyayas (e.g. क्तवतु or शतृ)", () => {
      const qBadTumun: ValidatableQuestion = {
        type: "MATCH_COLUMN",
        text: "मेलनं कुरुत:",
        options: [
          "(A) पठितुम् - शतृ-प्रत्ययः",
          "(B) गच्छन् - शतृ-प्रत्ययः",
        ],
        answer: "(A)-1, (B)-2",
      };
      const res = validateGeneratedQuestion(qBadTumun, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);
    });
  });

  /* ================================================================== */
  /* SUITE 6: Sanskrit Anti-Calque, Hindi Leakage & Punctuation Stress  */
  /* ================================================================== */
  describe("Suite 6: Sanskrit Anti-Calque & Hindi Syntax Leakage Stress", () => {
    it("6.1 catches Hindi postposition leakage (राम ने, बालक को, वृक्ष से)", () => {
      const qNe: ValidatableQuestion = {
        type: "SHORT",
        text: "राम ने वनम् अगच्छत्।",
        answer: "अशुद्धम्",
      };
      const resNe = validateGeneratedQuestion(qNe, sanskritContract);
      expect(resNe.valid).toBe(false);
      expect(resNe.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);

      const qKo: ValidatableQuestion = {
        type: "SHORT",
        text: "अध्यापकः बालक को पाठयति।",
        answer: "अशुद्धम्",
      };
      const resKo = validateGeneratedQuestion(qKo, sanskritContract);
      expect(resKo.valid).toBe(false);
      expect(resKo.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("6.2 catches Hindi auxiliary verbs (है, था, थी, थे, होता है, सकता है, चाहिए) ending with danda", () => {
      const qHotaHai: ValidatableQuestion = {
        type: "SHORT",
        text: "सत्संगत्या मनुष्यस्य कल्याणं होता है।",
        answer: "अशुद्धम्",
      };
      const resHotaHai = validateGeneratedQuestion(qHotaHai, sanskritContract);
      expect(resHotaHai.valid).toBe(false);
      expect(resHotaHai.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);

      const qChahiye: ValidatableQuestion = {
        type: "SHORT",
        text: "सदा सत्यं वदेत् इति कर्तव्यं चाहिए।",
        answer: "अशुद्धम्",
      };
      const resChahiye = validateGeneratedQuestion(qChahiye, sanskritContract);
      expect(resChahiye.valid).toBe(false);
      expect(resChahiye.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("6.3 catches pseudo-Sanskrit passive calques with गच्छति / ग्छति (e.g. प्रदत्तोग्छति, कृतः गच्छति)", () => {
      const qCalque: ValidatableQuestion = {
        type: "SHORT",
        text: "अधोलिखितं प्रश्नं प्रदत्तः गच्छति।",
        answer: "अशुद्धम्",
      };
      const resCalque = validateGeneratedQuestion(qCalque, sanskritContract);
      expect(resCalque.valid).toBe(false);
      expect(resCalque.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("6.4 does NOT false-alarm on legitimate Sanskrit words containing similar phonetic syllables (यथा, तथा, कथा, गच्छति)", () => {
      // Legitimate use of गच्छति as finite verb of motion: 'बालकः ग्रामं गच्छति।'
      const qLegitGam: ValidatableQuestion = {
        type: "SHORT",
        text: "यथा बालकः ग्रामं गच्छति, तथा सः परिश्रमं करोति। अस्य वाक्यस्य भावं लिखत।",
        answer: "बालकस्य परिश्रमशीलता दर्शिता।",
      };
      const resLegitGam = validateGeneratedQuestion(qLegitGam, sanskritContract);
      expect(resLegitGam.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(false);

      // Legitimate words like कथा, तथा, अस्ति
      const qLegitWords: ValidatableQuestion = {
        type: "SHORT",
        text: "एषा कथा अस्माकं जीवने शिक्षाप्रदा अस्ति।",
        answer: "सत्यम्",
      };
      const resLegitWords = validateGeneratedQuestion(qLegitWords, sanskritContract);
      expect(resLegitWords.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(false);
    });
  });

  /* ================================================================== */
  /* SUITE 7: Sanskrit Interrogative Pronoun & Gender/Number Agreement  */
  /* ================================================================== */
  describe("Suite 7: Sanskrit Interrogative Pronoun & Gender/Number Agreement Stress", () => {
    it("7.1 flags masculine singular 'कः' when all MCQ choices are dual entities ('-ौ')", () => {
      // Stem: कः ... ? Options: रामलक्ष्मणौ, लवकुशौ, भरतशत्रुघ्नौ (all dual) -> must use कौ
      const qMismatchDual: ValidatableQuestion = {
        type: "MCQ",
        text: "सभायाम् उपविष्टः कः आसीत्?",
        options: [
          "(A) रामलक्ष्मणौ",
          "(B) लवकुशौ",
          "(C) भरतशत्रुघ्नौ",
          "(D) युधिष्ठिरभीमौ",
        ],
        answer: "(B) लवकुशौ",
      };
      const res = validateGeneratedQuestion(qMismatchDual, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_AGREEMENT_ERROR")).toBe(true);
    });

    it("7.2 accepts dual interrogative 'कौ' when options are dual entities", () => {
      const qValidDual: ValidatableQuestion = {
        type: "MCQ",
        text: "सभायाम् उपविष्टौ कौ आस्ताम्?",
        options: [
          "(A) रामलक्ष्मणौ",
          "(B) लवकुशौ",
          "(C) भरतशत्रुघ्नौ",
          "(D) युधिष्ठिरभीमौ",
        ],
        answer: "(B) लवकुशौ",
      };
      const res = validateGeneratedQuestion(qValidDual, sanskritContract);
      expect(res.issues.some((i) => i.code === "SANSKRIT_AGREEMENT_ERROR")).toBe(false);
    });

    it("7.3 flags masculine singular 'कः' when all options are feminine entities", () => {
      const qMismatchFem: ValidatableQuestion = {
        type: "MCQ",
        text: "वने निवसन्ती कः आसीत्?",
        options: [
          "(A) सीता",
          "(B) राधा",
          "(C) उर्मिला",
          "(D) प्रकृतिः",
        ],
        answer: "(A) सीता",
      };
      const res = validateGeneratedQuestion(qMismatchFem, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_AGREEMENT_ERROR")).toBe(true);
    });

    it("7.4 flags masculine singular 'कः' when all options are neuter entities", () => {
      const qMismatchNeut: ValidatableQuestion = {
        type: "MCQ",
        text: "अस्माकं प्रियं कः अस्ति?",
        options: [
          "(A) जलम्",
          "(B) वनम्",
          "(C) पुस्तकम्",
          "(D) मित्रम्",
        ],
        answer: "(C) पुस्तकम्",
      };
      const res = validateGeneratedQuestion(qMismatchNeut, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_AGREEMENT_ERROR")).toBe(true);
    });

    it("7.5 flags corrupted dual inflection 'द्वौ बालको' (must be 'द्वौ बालकौ')", () => {
      const qBadDual: ValidatableQuestion = {
        type: "MCQ",
        text: "मार्गे द्वौ बालको गच्छतः। तयोः नामनी के?",
        options: [
          "(A) रामः श्यामः च",
          "(B) हरिः कृष्णः च",
        ],
        answer: "(A) रामः श्यामः च",
      };
      const res = validateGeneratedQuestion(qBadDual, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_MORPHOLOGY_ERROR")).toBe(true);
    });
  });
});
