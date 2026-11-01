import { describe, expect, it } from "vitest";
import {
  buildAndValidateGenerationContract,
  type GenerationContract,
  getChapterCurriculumSpec,
  resolveChoicePolicyForSlot,
  resolveChapterCurriculumContextSync,
} from "./curriculumContract";
import {
  evaluateArithmeticExpression,
  parseQuadraticEquation,
  validateArithmeticEquality,
  validateCoordinateGeometryQuestion,
  validateMathematicsAcademicIntegrity,
  validateQuadraticQuestion,
} from "./mathQuestionValidator";
import {
  parseChemicalFormula,
  validateGeneratedQuestion,
  validateGeneratedSection,
  validateReactionEquation,
  validateSanskritAcademicIntegrity,
  type ValidatableQuestion,
} from "./questionValidator";

describe("MPBSE Deterministic Academic Quality Gates (Milestone 3)", () => {
  // Helper contract factory
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
          chapterTitle: "Real Numbers",
          marks: overrides.marksEach || 1,
        },
      ],
    });
    return {
      ...res.contract!,
      ...restOverrides,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Part A: Curriculum Generation Payload & Slot Planning Tests        */
  /* ------------------------------------------------------------------ */
  describe("Part A: Curriculum Generation Payload & Slot Planning", () => {
    it("resolves Circular 465 choice policy correctly based on marks and forbidden rules", () => {
      // 1-mark & 2-mark: NO_CHOICE
      const p1 = resolveChoicePolicyForSlot({ marks: 1 });
      expect(p1.policyType).toBe("NO_CHOICE");
      expect(p1.totalProvided).toBe(1);
      expect(p1.totalRequired).toBe(1);

      const p2 = resolveChoicePolicyForSlot({ marks: 2 });
      expect(p2.policyType).toBe("NO_CHOICE");

      // 3-mark & 4-mark: FULL_OR_ALTERNATIVE
      const p3 = resolveChoicePolicyForSlot({ marks: 3 });
      expect(p3.policyType).toBe("FULL_OR_ALTERNATIVE");
      expect(p3.totalProvided).toBe(2);
      expect(p3.totalRequired).toBe(1);
      expect(p3.poolScope).toBe("SAME_CHAPTER");

      const p4 = resolveChoicePolicyForSlot({ marks: 4 });
      expect(p4.policyType).toBe("FULL_OR_ALTERNATIVE");

      // Language elective: ATTEMPT_K_OF_N
      const pLang = resolveChoicePolicyForSlot({
        marks: 4,
        questionType: "ATTEMPT_K_OF_N",
        subject: "Sanskrit",
      });
      expect(pLang.policyType).toBe("ATTEMPT_K_OF_N");
      expect(pLang.totalProvided).toBe(3);
      expect(pLang.totalRequired).toBe(2);

      // Forbidden choice override
      const pForbid = resolveChoicePolicyForSlot({ marks: 4, forbiddenChoice: true });
      expect(pForbid.policyType).toBe("NO_CHOICE");
    });

    it("attaches stable slotId, choicePolicy, and curriculumPayload to generation contract slots", () => {
      const contract = createTestContract({
        className: "Class 10",
        canonicalSubject: "Mathematics",
        subjectCode: "100",
        marksEach: 3,
        questionType: "SHORT",
      });

      expect(contract.slots.length).toBeGreaterThan(0);
      const slot = contract.slots[0];
      expect(slot.slotId).toBeDefined();
      expect(slot.slotId).toMatch(/^slot_/);
      expect(slot.choicePolicy).toBeDefined();
      expect(slot.choicePolicy?.policyType).toBe("FULL_OR_ALTERNATIVE");
      expect(slot.curriculumPayload).toBeDefined();
      expect(slot.curriculumPayload?.board).toBe("MPBSE");
      expect(slot.curriculumPayload?.subjectCode).toBe("100");
      expect(slot.curriculumPayload?.officialMarksQuota).toBe(3);
    });

    it("synchronously resolves chapter curriculum context with included and excluded topics", () => {
      const ctx = resolveChapterCurriculumContextSync({
        chapterNumber: 1,
        chapterTitle: "Relations and Functions",
        subject: "Mathematics",
        className: "Class 12",
      });

      expect(ctx.includedTopics.length).toBeGreaterThan(0);
      expect(ctx.excludedTopics).toContain("Binary operations");
    });
  });

  /* ------------------------------------------------------------------ */
  /* Part B1: Mathematics Deterministic Quality Gates                   */
  /* ------------------------------------------------------------------ */
  describe("Part B1: Mathematics Quality Gates", () => {
    const mathContract = createTestContract({
      canonicalSubject: "Mathematics",
      subjectCode: "100",
      className: "Class 10",
    });

    it("evaluates arithmetic expressions safely without eval()", () => {
      expect(evaluateArithmeticExpression("15 + 25")).toBe(40);
      expect(evaluateArithmeticExpression("15 * 12")).toBe(180);
      expect(evaluateArithmeticExpression("100 / 4")).toBe(25);
      expect(evaluateArithmeticExpression("2^3")).toBe(8);
      expect(evaluateArithmeticExpression("((3 + 5) * 2)")).toBe(16);
      expect(evaluateArithmeticExpression("\\frac{1}{2} + \\frac{1}{4}")).toBe(0.75);
      expect(evaluateArithmeticExpression("15 \\times 12")).toBe(180);
      expect(evaluateArithmeticExpression("20 \\div 4")).toBe(5);
    });

    it("rejects questions containing false arithmetic calculation equations (MATH_CALCULATION_ERROR)", () => {
      const invalidQ: ValidatableQuestion = {
        type: "SHORT",
        text: "Calculate the total cost: $15 \\times 12 = 170$ rupees.",
        answer: "Model answer: 170",
      };

      const res = validateGeneratedQuestion(invalidQ, mathContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_CALCULATION_ERROR")).toBe(true);

      const validQ: ValidatableQuestion = {
        type: "SHORT",
        text: "Calculate the total cost: $15 \\times 12 = 180$ rupees.",
        answer: "Model answer: 180",
      };
      const validRes = validateGeneratedQuestion(validQ, mathContract);
      expect(validRes.issues.some((i) => i.code === "MATH_CALCULATION_ERROR")).toBe(false);
    });

    it("parses quadratic equations and accurately calculates the discriminant D = b^2 - 4ac", () => {
      const q1 = parseQuadraticEquation("2x^2 - 4x + 3 = 0");
      expect(q1).not.toBeNull();
      expect(q1?.a).toBe(2);
      expect(q1?.b).toBe(-4);
      expect(q1?.c).toBe(3);
      expect(q1?.discriminant).toBe(16 - 24); // -8

      const q2 = parseQuadraticEquation("x^2 - 4x + 4 = 0");
      expect(q2?.discriminant).toBe(0);

      const q3 = parseQuadraticEquation("x^2 - 5x + 6 = 0");
      expect(q3?.discriminant).toBe(1);
    });

    it("rejects quadratic equations claiming two distinct real roots when D <= 0 (MATH_EQUATION_DISCRIMINANT_MISMATCH)", () => {
      // 2x^2 - 4x + 3 = 0 has D = -8 < 0 (no real roots), but claims two distinct real roots
      const invalidQ: ValidatableQuestion = {
        type: "MCQ",
        text: "The quadratic equation $2x^2 - 4x + 3 = 0$ has two distinct real roots.",
        options: ["True", "False"],
        answer: "True",
      };
      const res = validateGeneratedQuestion(invalidQ, mathContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(true);
    });

    it("rejects quadratic equations claiming equal real roots when D != 0 (MATH_EQUATION_DISCRIMINANT_MISMATCH)", () => {
      // 2x^2 - 4x + 5 = 0 has D = 16 - 40 = -24 != 0
      const invalidQ: ValidatableQuestion = {
        type: "MCQ",
        text: "Find the condition for which $2x^2 - 4x + 5 = 0$ has equal real roots.",
        options: ["D = 0", "D > 0", "D < 0", "None"],
        answer: "D = 0",
      };
      const res = validateGeneratedQuestion(invalidQ, mathContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(true);
    });

    it("verifies Euclidean coordinate distance formula and flags errors (MATH_COORDINATE_GEOMETRY_ERROR)", () => {
      // Distance between (1, 2) and (4, 6) is sqrt((4-1)^2 + (6-2)^2) = sqrt(9 + 16) = 5
      const invalidQ: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between the points $(1, 2)$ and $(4, 6)$.",
        answer: "The distance between the points is 8 units.",
      };
      const res = validateGeneratedQuestion(invalidQ, mathContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(true);

      const validQ: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between the points $(1, 2)$ and $(4, 6)$.",
        answer: "The distance between the points is 5 units.",
      };
      const validRes = validateGeneratedQuestion(validQ, mathContract);
      expect(validRes.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("verifies midpoint formula and flags discrepancies (MATH_COORDINATE_GEOMETRY_ERROR)", () => {
      // Midpoint of (2, 4) and (6, 8) is ((2+6)/2, (4+8)/2) = (4, 6)
      const invalidQ: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the midpoint of the line segment joining $(2, 4)$ and $(6, 8)$.",
        answer: "The midpoint is $(5, 7)$.",
      };
      const res = validateGeneratedQuestion(invalidQ, mathContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(true);

      const validQ: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the midpoint of the line segment joining $(2, 4)$ and $(6, 8)$.",
        answer: "The midpoint is $(4, 6)$.",
      };
      const validRes = validateGeneratedQuestion(validQ, mathContract);
      expect(validRes.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("enforces variant complexity constraints for Basic vs Standard Mathematics (MATH_VARIANT_COMPLEXITY_MISMATCH)", () => {
      const basicContract = createTestContract({
        canonicalSubject: "Mathematics",
        subjectCode: "101",
        subjectVariant: "BASIC",
      });

      // Basic Mathematics must not test irrationality proofs
      const irrationalProofQ: ValidatableQuestion = {
        type: "SHORT",
        text: "Prove that $\\sqrt{5}$ is irrational.",
        answer: "Let us assume to the contrary...",
        marks: 3,
      };
      const basicRes = validateGeneratedQuestion(irrationalProofQ, basicContract);
      expect(basicRes.valid).toBe(false);
      expect(basicRes.issues.some((i) => i.code === "MATH_VARIANT_COMPLEXITY_MISMATCH")).toBe(true);

      // Standard Mathematics 4-mark slots must not be trivial single-step substitutions
      const standardContract = createTestContract({
        canonicalSubject: "Mathematics",
        subjectCode: "100",
        subjectVariant: "STANDARD",
        marksEach: 4,
      });
      const trivial4mQ: ValidatableQuestion = {
        type: "LONG",
        text: "Find the value of $15 + 25$.",
        answer: "40",
        marks: 4,
      };
      const standardRes = validateGeneratedQuestion(trivial4mQ, standardContract);
      expect(standardRes.valid).toBe(false);
      expect(standardRes.issues.some((i) => i.code === "MATH_VARIANT_COMPLEXITY_MISMATCH")).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Part B2: Sanskrit Deterministic Quality Gates                      */
  /* ------------------------------------------------------------------ */
  describe("Part B2: Sanskrit Quality Gates", () => {
    const sanskritContract = createTestContract({
      canonicalSubject: "Sanskrit",
      subjectCode: "122",
      language: "sa",
      className: "Class 10",
    });

    it("enforces Paninian pratyaya rules for क्त्वा, ल्यप्, and तुमुन् (SANSKRIT_PRATYAYA_MISMATCH)", () => {
      const matchContract: GenerationContract = {
        ...sanskritContract,
        questionType: "MATCH_COLUMN",
        marksEach: 4,
      };

      // Uncompounded gerund गत्वा paired with ल्यप् -> ERROR
      const invalidKtva = validateGeneratedQuestion(
        {
          type: "MATCH_COLUMN",
          text: "उचितं मेलनं कुरुत:",
          options: ["गत्वा ||| ल्यप्-प्रत्ययः", "पठितवान् ||| क्तवतु-प्रत्ययः"],
          answer: "(A)-(i), (B)-(ii)",
        },
        matchContract,
      );
      expect(invalidKtva.valid).toBe(false);
      expect(invalidKtva.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);

      // Prefix-compounded gerund विहाय paired with क्त्वा -> ERROR
      const invalidLyap = validateGeneratedQuestion(
        {
          type: "MATCH_COLUMN",
          text: "उचितं मेलनं कुरुत:",
          options: ["विहाय ||| क्त्वा-प्रत्ययः", "पठितवान् ||| क्तवतु-प्रत्ययः"],
          answer: "(A)-(i), (B)-(ii)",
        },
        matchContract,
      );
      expect(invalidLyap.valid).toBe(false);
      expect(invalidLyap.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);

      // Infinitive पठितुम् paired with क्तवतु -> ERROR
      const invalidTumun = validateGeneratedQuestion(
        {
          type: "MATCH_COLUMN",
          text: "उचितं मेलनं कुरुत:",
          options: ["पठितुम् ||| क्तवतु-प्रत्ययः", "नमस्ते ||| विसर्गसन्धिः"],
          answer: "(A)-(i), (B)-(ii)",
        },
        matchContract,
      );
      expect(invalidTumun.valid).toBe(false);
      expect(invalidTumun.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);

      // Valid pairings -> PASS
      const validMatch = validateGeneratedQuestion(
        {
          type: "MATCH_COLUMN",
          text: "उचितं मेलनं कुरुत:",
          options: [
            "गत्वा ||| क्त्वा-प्रत्ययः",
            "विहाय ||| ल्यप्-प्रत्ययः",
            "पठितुम् ||| तुमुन्-प्रत्ययः",
            "पठितवान् ||| क्तवतु-प्रत्ययः",
          ],
          answer: "(A)-(i), (B)-(ii), (C)-(iii), (D)-(iv)",
        },
        matchContract,
      );
      expect(validMatch.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(false);
    });

    it("rejects Hindi postposition and syntax interference in Sanskrit text (SANSKRIT_HINDI_CALQUE_ERROR)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "राम ने वनम् गत्वा किं कृतवान्?",
        answer: "रामः वनम् अगच्छत्।",
      };
      const res = validateGeneratedQuestion(q, sanskritContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("enforces 3-gender interrogative pronoun agreement (SANSKRIT_AGREEMENT_ERROR)", () => {
      // Stem asks masculine 'कः' but choices are feminine singular (का required)
      const femQ: ValidatableQuestion = {
        type: "MCQ",
        text: "पाठानुसारं रामस्य भार्या कः आसीत्?",
        options: ["सीता", "राधा", "उर्मिला", "प्रकृतिः"],
        answer: "सीता",
      };
      const femRes = validateGeneratedQuestion(femQ, sanskritContract);
      expect(femRes.valid).toBe(false);
      expect(femRes.issues.some((i) => i.code === "SANSKRIT_AGREEMENT_ERROR")).toBe(true);

      // Stem asks masculine 'कः' but choices are neuter singular (किम् required)
      const neutQ: ValidatableQuestion = {
        type: "MCQ",
        text: "जीवनस्य आधारभूतं तत्त्वं कः अस्ति?",
        options: ["जलम्", "वनम्", "पुस्तकम्", "मित्रम्"],
        answer: "जलम्",
      };
      const neutRes = validateGeneratedQuestion(neutQ, sanskritContract);
      expect(neutRes.valid).toBe(false);
      expect(neutRes.issues.some((i) => i.code === "SANSKRIT_AGREEMENT_ERROR")).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Part B3: Chemistry Deterministic Quality Gates                     */
  /* ------------------------------------------------------------------ */
  describe("Part B3: Chemistry Quality Gates", () => {
    const chemContract12 = createTestContract({
      canonicalSubject: "Chemistry",
      subjectCode: "220",
      className: "Class 12",
    });

    const chemContract10 = createTestContract({
      canonicalSubject: "Science",
      subjectCode: "200",
      className: "Class 10",
    });

    it("accurately parses chemical compound formulas and atom counts", () => {
      expect(parseChemicalFormula("H2O")).toEqual({ H: 2, O: 1 });
      expect(parseChemicalFormula("2H2O")).toEqual({ H: 4, O: 2 });
      expect(parseChemicalFormula("Ca(OH)2")).toEqual({ Ca: 1, O: 2, H: 2 });
      expect(parseChemicalFormula("Fe2(SO4)3")).toEqual({ Fe: 2, S: 3, O: 12 });
      expect(parseChemicalFormula("CuSO4.5H2O")).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
    });

    it("verifies chemical reaction stoichiometry and rejects unbalanced equations (CHEM_UNBALANCED_REACTION)", () => {
      // Balanced: 2H2 + O2 -> 2H2O
      const b1 = validateReactionEquation("2H2 + O2 -> 2H2O");
      expect(b1?.isBalanced).toBe(true);

      // Unbalanced: H2 + O2 -> H2O
      const u1 = validateReactionEquation("H2 + O2 -> H2O");
      expect(u1?.isBalanced).toBe(false);
      expect(u1?.element).toBe("O");
      expect(u1?.reactantCount).toBe(2);
      expect(u1?.productCount).toBe(1);

      // Unbalanced reaction in question text triggers gate
      const invalidQ: ValidatableQuestion = {
        type: "SHORT",
        text: "Explain the synthesis reaction: $H_2 + O_2 \\rightarrow H_2O$.",
        answer: "Hydrogen reacts with oxygen to produce water.",
      };
      const res = validateGeneratedQuestion(invalidQ, chemContract12);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(true);

      // Balanced complex reaction passes
      const validQ: ValidatableQuestion = {
        type: "SHORT",
        text: "Complete the precipitation reaction: $BaCl_2 + Na_2SO_4 \\rightarrow BaSO_4 + 2NaCl$.",
        answer: "Barium sulfate precipitates as a white solid.",
      };
      const validRes = validateGeneratedQuestion(validQ, chemContract12);
      expect(validRes.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(false);
    });

    it("rejects chemically impossible ketones and invalid locant IUPAC nomenclature (CHEM_INVALID_IUPAC_NAME)", () => {
      // Impossible ketone: methanone
      const qMethanone: ValidatableQuestion = {
        type: "MCQ",
        text: "What is the boiling point of methanone?",
        options: ["50 C", "60 C", "70 C", "80 C"],
        answer: "50 C",
      };
      const resMethanone = validateGeneratedQuestion(qMethanone, chemContract12);
      expect(resMethanone.valid).toBe(false);
      expect(resMethanone.issues.some((i) => i.code === "CHEM_INVALID_IUPAC_NAME")).toBe(true);

      // Locant numbering error: propan-3-ol
      const qLocant: ValidatableQuestion = {
        type: "MCQ",
        text: "Identify the product formed from propan-3-ol upon dehydration.",
        options: ["Propene", "Propyne", "Propane", "None"],
        answer: "Propene",
      };
      const resLocant = validateGeneratedQuestion(qLocant, chemContract12);
      expect(resLocant.valid).toBe(false);
      expect(resLocant.issues.some((i) => i.code === "CHEM_INVALID_IUPAC_NAME")).toBe(true);

      // Longest chain violation: 2-ethylpropane
      const qBranch: ValidatableQuestion = {
        type: "SHORT",
        text: "Draw the structure of 2-ethylpropane.",
        answer: "Structure of 2-ethylpropane...",
      };
      const resBranch = validateGeneratedQuestion(qBranch, chemContract12);
      expect(resBranch.valid).toBe(false);
      expect(resBranch.issues.some((i) => i.code === "CHEM_INVALID_IUPAC_NAME")).toBe(true);
    });

    it("strictly rejects rationalized/deleted syllabus topics in Chemistry (CHEM_DELETED_SYLLABUS)", () => {
      // Class 12: Solid State (Schottky defect)
      const qSolidState: ValidatableQuestion = {
        type: "SHORT",
        text: "Explain Schottky defect and Frenkel defect in NaCl crystal lattice.",
        answer: "Defects in solid state...",
      };
      const resSolid = validateGeneratedQuestion(qSolidState, chemContract12);
      expect(resSolid.valid).toBe(false);
      expect(resSolid.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);

      // Class 12: Metallurgy (Ellingham diagram)
      const qMetallurgy: ValidatableQuestion = {
        type: "SHORT",
        text: "Explain the role of Ellingham diagram in the extraction of iron from blast furnace.",
        answer: "Thermodynamics of metallurgy...",
      };
      const resMeta = validateGeneratedQuestion(qMetallurgy, chemContract12);
      expect(resMeta.valid).toBe(false);
      expect(resMeta.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);

      // Class 10: Periodic Classification of Elements (Döbereiner's triads)
      const qTriads: ValidatableQuestion = {
        type: "SHORT",
        text: "State Döbereiner's law of triads with an example.",
        answer: "Periodic classification triad...",
      };
      const resTriads = validateGeneratedQuestion(qTriads, chemContract10);
      expect(resTriads.valid).toBe(false);
      expect(resTriads.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Part B4: Physics Deterministic Quality Gates                       */
  /* ------------------------------------------------------------------ */
  describe("Part B4: Physics Quality Gates", () => {
    const physContract12 = createTestContract({
      canonicalSubject: "Physics",
      subjectCode: "210",
      className: "Class 12",
    });

    const physContract10 = createTestContract({
      canonicalSubject: "Science",
      subjectCode: "200",
      className: "Class 10",
    });

    it("detects cross-quantity SI unit inconsistencies (PHYSICS_UNIT_INCONSISTENCY)", () => {
      // Force expressed in Joules
      const qForce: ValidatableQuestion = {
        type: "SHORT",
        text: "A force of $50\\text{ J}$ is applied on a body of mass $2\\text{ kg}$.",
        answer: "Calculate acceleration...",
      };
      const resForce = validateGeneratedQuestion(qForce, physContract12);
      expect(resForce.valid).toBe(false);
      expect(resForce.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);

      // Current expressed in Volts
      const qCurrent: ValidatableQuestion = {
        type: "SHORT",
        text: "An electric current of $220\\text{ V}$ flows through the resistor.",
        answer: "Calculate power...",
      };
      const resCurrent = validateGeneratedQuestion(qCurrent, physContract12);
      expect(resCurrent.valid).toBe(false);
      expect(resCurrent.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("verifies physical parameter bounds: v <= c, T >= 0 K, and eta < 100% (PHYSICS_IMPOSSIBLE_PARAMETER)", () => {
      // Speed exceeding speed of light: 4.5 x 10^8 m/s
      const qFast: ValidatableQuestion = {
        type: "SHORT",
        text: "An electron moves with velocity $4.5 \\times 10^8\\text{ m/s}$ in a magnetic field.",
        answer: "Calculate magnetic force...",
      };
      const resFast = validateGeneratedQuestion(qFast, physContract12);
      expect(resFast.valid).toBe(false);
      expect(resFast.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);

      // Negative absolute temperature in Kelvin: -50 K
      const qCold: ValidatableQuestion = {
        type: "SHORT",
        text: "A gas is cooled to a temperature of $-50\\text{ K}$.",
        answer: "Calculate final volume...",
      };
      const resCold = validateGeneratedQuestion(qCold, physContract12);
      expect(resCold.valid).toBe(false);
      expect(resCold.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);

      // Heat engine efficiency >= 100%
      const qEff: ValidatableQuestion = {
        type: "SHORT",
        text: "A heat engine operates between reservoirs with an efficiency of 120%.",
        answer: "Work output...",
      };
      const resEff = validateGeneratedQuestion(qEff, physContract12);
      expect(resEff.valid).toBe(false);
      expect(resEff.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);

      // Valid parameters pass cleanly
      const qValid: ValidatableQuestion = {
        type: "SHORT",
        text: "An electron travels with speed $2.0 \\times 10^6\\text{ m/s}$ at temperature $300\\text{ K}$.",
        answer: "De Broglie wavelength is...",
      };
      const resValid = validateGeneratedQuestion(qValid, physContract12);
      expect(resValid.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(false);
    });

    it("enforces Cartesian optics sign conventions for mirrors, lenses, and magnification (PHYSICS_OPTICS_SIGN_ERROR)", () => {
      // Concave mirror with positive focal length f = +15 cm
      const qConcave: ValidatableQuestion = {
        type: "SHORT",
        text: "A concave mirror of focal length $f = +15\\text{ cm}$ forms an image of a real object.",
        answer: "Image distance...",
      };
      const resConcave = validateGeneratedQuestion(qConcave, physContract10);
      expect(resConcave.valid).toBe(false);
      expect(resConcave.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);

      // Convex mirror with negative focal length f = -20 cm
      const qConvex: ValidatableQuestion = {
        type: "SHORT",
        text: "A convex mirror of focal length $f = -20\\text{ cm}$ is used as a rear-view mirror.",
        answer: "Image distance...",
      };
      const resConvex = validateGeneratedQuestion(qConvex, physContract10);
      expect(resConvex.valid).toBe(false);
      expect(resConvex.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);

      // Real and inverted image with positive magnification m = +2
      const qInverted: ValidatableQuestion = {
        type: "SHORT",
        text: "The image formed by the spherical mirror is real and inverted with magnification $m = +2.0$.",
        answer: "Image characteristics...",
      };
      const resInverted = validateGeneratedQuestion(qInverted, physContract10);
      expect(resInverted.valid).toBe(false);
      expect(resInverted.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Part C: Pre-Commit Gate Simulation & Error Feedback Loop           */
  /* ------------------------------------------------------------------ */
  describe("Part C: Section Validation & Pre-Commit Simulation", () => {
    it("validates an entire section and isolates rejected slot indices with structured issues", () => {
      const contract = createTestContract({
        canonicalSubject: "Chemistry",
        subjectCode: "220",
        className: "Class 12",
        slots: [
          { slotIndex: 0, chapterId: "c1", chapterNumber: 1, chapterTitle: "Solutions", marks: 2 },
          { slotIndex: 1, chapterId: "c2", chapterNumber: 2, chapterTitle: "Electrochemistry", marks: 2 },
        ],
      });

      const sectionQuestions: ValidatableQuestion[] = [
        {
          slotIndex: 0,
          type: "SHORT",
          text: "State Henry's Law regarding solubility of a gas in a liquid.",
          answer: "The solubility of a gas is directly proportional to its partial pressure.",
          marks: 2,
        },
        {
          slotIndex: 1,
          type: "SHORT",
          text: "Explain the reaction: $H_2 + O_2 \\rightarrow H_2O$.",
          answer: "Synthesis of water",
          marks: 2,
        },
      ];

      const secRes = validateGeneratedSection(sectionQuestions, contract);
      expect(secRes.valid).toBe(false);
      expect(secRes.rejectedSlotIndices).toContain(1);
      expect(secRes.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Part D: Milestone 3.2 Remediation & Edge Case Verification         */
  /* ------------------------------------------------------------------ */
  describe("Part D: Milestone 3.2 Remediation & Edge Case Verification", () => {
    it("directly invokes exported validateSanskritAcademicIntegrity and verifies danda boundary", () => {
      const saContract = createTestContract({
        canonicalSubject: "Sanskrit",
        subjectCode: "122",
        language: "sa",
      });
      const issues: any[] = [];
      const qDanda: ValidatableQuestion = {
        type: "SHORT",
        text: "संस्कृतभाषा अतिप्राचीना भाषा है।",
        answer: "आम्",
      };
      validateSanskritAcademicIntegrity(qDanda, saContract, 0, issues);
      expect(issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("verifies quadratic MCQ distractor options do not cause false positive rejections", () => {
      const mathContract = createTestContract({
        canonicalSubject: "Mathematics",
        subjectCode: "100",
      });
      const qQuad: ValidatableQuestion = {
        type: "MCQ",
        text: "The nature of roots of the quadratic equation $2x^2 - 4x + 3 = 0$ is:",
        options: [
          "Two distinct real roots",
          "Two equal real roots",
          "No real roots",
          "Infinitely many roots",
        ],
        answer: "No real roots",
        explanation: "D = b^2 - 4ac = 16 - 24 = -8 < 0, hence no real roots.",
      };
      const res = validateGeneratedQuestion(qQuad, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(false);
    });

    it("verifies simplified radical coordinate geometry distance (2\\sqrt{5}) passes cleanly", () => {
      const mathContract = createTestContract({
        canonicalSubject: "Mathematics",
        subjectCode: "100",
      });
      const qDist: ValidatableQuestion = {
        type: "SHORT",
        text: "Find the distance between the points $(1, 2)$ and $(3, 6)$.",
        answer: "The distance is $2\\sqrt{5}$ units.",
      };
      const res = validateGeneratedQuestion(qDist, mathContract);
      expect(res.issues.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(false);
    });

    it("verifies convex lens with negative focal length is rejected", () => {
      const physContract = createTestContract({
        canonicalSubject: "Physics",
        subjectCode: "210",
        className: "Class 10",
      });
      const qConvexLens: ValidatableQuestion = {
        type: "SHORT",
        text: "A convex lens of focal length $f = -15\\text{ cm}$ forms a virtual image.",
        answer: "Image distance...",
      };
      const res = validateGeneratedQuestion(qConvexLens, physContract);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });
  });
});
