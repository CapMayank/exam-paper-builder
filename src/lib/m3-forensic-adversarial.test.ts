import { describe, expect, it } from "vitest";
import {
  evaluateArithmeticExpression,
  normalizeMathString,
  parseQuadraticEquation,
  tokenizeMath,
  validateArithmeticEquality,
  validateCoordinateGeometryQuestion,
  validateMathematicsAcademicIntegrity,
  validateQuadraticQuestion,
} from "./mathQuestionValidator";
import {
  parseChemicalFormula,
  validateChemistryAcademicIntegrity,
  validateGeneratedQuestion,
  validatePhysicsAcademicIntegrity,
  validateReactionEquation,
  type QuestionValidationIssue,
  type ValidatableQuestion,
} from "./questionValidator";
import {
  buildAndValidateGenerationContract,
  resolveChoicePolicyForSlot,
  resolveChapterCurriculumContextSync,
  type GenerationContract,
} from "./curriculumContract";

describe("Forensic Adversarial Integrity Verification: Milestone 3 Quality Gates", () => {
  function makeContract(overrides: Partial<GenerationContract> = {}): GenerationContract {
    const res = buildAndValidateGenerationContract({
      board: "MPBSE",
      className: overrides.className || "Class 10",
      subject: overrides.canonicalSubject || "Mathematics",
      subjectCode: overrides.subjectCode || "100",
      marksEach: overrides.marksEach || 2,
      questionType: overrides.questionType || "SHORT",
      difficulty: "BALANCED",
      language: overrides.language || "en",
      sectionTitle: "Section B",
      slots: [
        {
          slotIndex: 0,
          chapterId: "chap_1",
          chapterNumber: 1,
          chapterTitle: "Real Numbers",
          marks: overrides.marksEach || 2,
        },
      ],
    });
    return { ...res.contract!, ...overrides };
  }

  // ----------------------------------------------------------------------
  // Section 1: Mathematics Recursive-Descent AST Evaluator Verification
  // ----------------------------------------------------------------------
  describe("1. Authentic AST & Recursive-Descent Math Evaluator", () => {
    it("parses and evaluates multi-level nested expressions with correct operator precedence", () => {
      // 3 + 4 * 2 / (1 - 5)^2 = 3 + 8 / 16 = 3 + 0.5 = 3.5
      const expr = "3 + 4 * 2 / (1 - 5)^2";
      expect(evaluateArithmeticExpression(expr)).toBeCloseTo(3.5, 4);

      // Unary minus and right-associative exponentiation: 2^2^3 = 2^8 = 256
      const powExpr = "2^2^3";
      expect(evaluateArithmeticExpression(powExpr)).toBe(256);

      // Complex nested LaTeX fraction: \frac{\frac{1}{2} + \frac{1}{4}}{\frac{3}{8}} = (0.75) / 0.375 = 2.0
      const fracExpr = "\\frac{\\frac{1}{2} + \\frac{1}{4}}{\\frac{3}{8}}";
      expect(evaluateArithmeticExpression(fracExpr)).toBeCloseTo(2.0, 4);
    });

    it("safely handles division by zero and non-arithmetic tokens without throwing uncaught exceptions", () => {
      expect(evaluateArithmeticExpression("15 / 0")).toBeNull();
      expect(evaluateArithmeticExpression("15 / (4 - 4)")).toBeNull();
      expect(evaluateArithmeticExpression("x^2 + 2x + 1")).toBeNull();
      expect(evaluateArithmeticExpression("sin(30) + cos(60)")).toBeNull();
      expect(evaluateArithmeticExpression("")).toBeNull();
      expect(evaluateArithmeticExpression("   ")).toBeNull();
    });

    it("detects false arithmetic equality statements in text and ignores non-arithmetic/calculus equations", () => {
      // Novel false equality
      const falseResult = validateArithmeticEquality("Solving gives $25 \\times 4 + 10 = 105$ as the answer.");
      expect(falseResult.isValid).toBe(false);
      expect(falseResult.lhs).toBe(110);
      expect(falseResult.rhs).toBe(105);

      // Novel true equality
      const trueResult = validateArithmeticEquality("Solving gives $25 \\times 4 + 10 = 110$ as the answer.");
      expect(trueResult.isValid).toBe(true);

      // Calculus equation should be skipped, not error out
      const calculusResult = validateArithmeticEquality("Evaluate $\\int_0^1 2x dx = 1$.");
      expect(calculusResult.isValid).toBe(true);
    });

    it("evaluates quadratic equations and checks discriminant consistency against root nature", () => {
      // 4x^2 - 12x + 9 = 0: a=4, b=-12, c=9, D = 144 - 144 = 0 (equal roots)
      const qEqual = parseQuadraticEquation("4x^2 - 12x + 9 = 0");
      expect(qEqual).not.toBeNull();
      expect(qEqual?.discriminant).toBe(0);

      const mathCont = makeContract({ canonicalSubject: "Mathematics", subjectCode: "100" });
      const issuesEqual: QuestionValidationIssue[] = [];
      validateQuadraticQuestion(
        {
          type: "SHORT",
          text: "Show that the quadratic equation $4x^2 - 12x + 9 = 0$ has two distinct real roots.",
        },
        0,
        issuesEqual,
      );
      expect(issuesEqual.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(true);

      // Pure quadratic: 5x^2 + 20 = 0: D = -4(5)(20) = -400 < 0 (no real roots)
      const qPure = parseQuadraticEquation("5x^2 + 20 = 0");
      expect(qPure).not.toBeNull();
      expect(qPure?.discriminant).toBe(-400);

      const issuesPure: QuestionValidationIssue[] = [];
      validateQuadraticQuestion(
        {
          type: "SHORT",
          text: "The equation $5x^2 + 20 = 0$ has two distinct real roots.",
        },
        0,
        issuesPure,
      );
      expect(issuesPure.some((i) => i.code === "MATH_EQUATION_DISCRIMINANT_MISMATCH")).toBe(true);
    });

    it("verifies Euclidean coordinate distance and midpoint with negative coordinates and radicals", () => {
      const issuesDist: QuestionValidationIssue[] = [];
      // Distance between (-1, -2) and (2, 2): dx = 3, dy = 4, dist = 5
      validateCoordinateGeometryQuestion(
        {
          type: "SHORT",
          text: "Find the distance between the points $(-1, -2)$ and $(2, 2)$.",
          answer: "The distance is 9 units.",
        },
        0,
        issuesDist,
      );
      expect(issuesDist.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(true);

      const issuesMid: QuestionValidationIssue[] = [];
      // Midpoint of (-4, 6) and (2, -2) is (-1, 2)
      validateCoordinateGeometryQuestion(
        {
          type: "SHORT",
          text: "Find the midpoint of the line segment joining $(-4, 6)$ and $(2, -2)$.",
          answer: "Midpoint is $(1, 2)$.",
        },
        0,
        issuesMid,
      );
      expect(issuesMid.some((i) => i.code === "MATH_COORDINATE_GEOMETRY_ERROR")).toBe(true);
    });
  });

  // ----------------------------------------------------------------------
  // Section 2: Chemistry Stoichiometry & IUPAC Verification
  // ----------------------------------------------------------------------
  describe("2. Authentic Chemistry Stoichiometry & IUPAC Validation", () => {
    it("accurately parses complex molecules with parentheses, brackets, and hydrates", () => {
      // Aluminum sulfate: Al2(SO4)3 -> Al: 2, S: 3, O: 12
      expect(parseChemicalFormula("Al2(SO4)3")).toEqual({ Al: 2, S: 3, O: 12 });

      // Potassium ferrocyanide: K4[Fe(CN)6] -> K: 4, Fe: 1, C: 6, N: 6
      expect(parseChemicalFormula("K4[Fe(CN)6]")).toEqual({ K: 4, Fe: 1, C: 6, N: 6 });

      // Magnesium phosphate: Mg3(PO4)2 -> Mg: 3, P: 2, O: 8
      expect(parseChemicalFormula("Mg3(PO4)2")).toEqual({ Mg: 3, P: 2, O: 8 });

      // Washing soda crystal: Na2CO3.10H2O -> Na: 2, C: 1, O: 13, H: 20
      expect(parseChemicalFormula("Na2CO3.10H2O")).toEqual({ Na: 2, C: 1, O: 13, H: 20 });
    });

    it("verifies multi-element stoichiometry and isolates exact imbalanced element counts", () => {
      // Balanced propane combustion: C3H8 + 5O2 -> 3CO2 + 4H2O
      const bPropane = validateReactionEquation("C3H8 + 5O2 -> 3CO2 + 4H2O");
      expect(bPropane?.isBalanced).toBe(true);

      // Unbalanced propane combustion: C3H8 + 3O2 -> 3CO2 + 4H2O (O has 6 reactant vs 10 product)
      const uPropane = validateReactionEquation("C3H8 + 3O2 -> 3CO2 + 4H2O");
      expect(uPropane?.isBalanced).toBe(false);
      expect(uPropane?.element).toBe("O");
      expect(uPropane?.reactantCount).toBe(6);
      expect(uPropane?.productCount).toBe(10);

      // Reaction with thermodynamic heat term: 2Mg + O2 -> 2MgO + Heat (Heat filtered)
      const bHeat = validateReactionEquation("2Mg + O2 -> 2MgO + Heat");
      expect(bHeat?.isBalanced).toBe(true);

      // Double displacement: Al2(SO4)3 + 3BaCl2 -> 2AlCl3 + 3BaSO4
      const bDouble = validateReactionEquation("Al2(SO4)3 + 3BaCl2 -> 2AlCl3 + 3BaSO4");
      expect(bDouble?.isBalanced).toBe(true);

      // Unbalanced double displacement: Al2(SO4)3 + BaCl2 -> AlCl3 + BaSO4
      const uDouble = validateReactionEquation("Al2(SO4)3 + BaCl2 -> AlCl3 + BaSO4");
      expect(uDouble?.isBalanced).toBe(false);
    });

    it("rejects non-existent ketones and invalid locant IUPAC nomenclature", () => {
      const chemContract = makeContract({ canonicalSubject: "Chemistry", subjectCode: "220", className: "Class 12" });

      // ethanone does not exist (smallest ketone is propanone)
      const resEthanone = validateGeneratedQuestion(
        {
          type: "SHORT",
          text: "Write the structural formula and properties of ethanone.",
          answer: "Ethanone is...",
        },
        chemContract,
      );
      expect(resEthanone.valid).toBe(false);
      expect(resEthanone.issues.some((i) => i.code === "CHEM_INVALID_IUPAC_NAME")).toBe(true);

      // butan-3-ol violates lowest locant (must be butan-2-ol)
      const resLocant = validateGeneratedQuestion(
        {
          type: "SHORT",
          text: "What is the oxidation product of butan-3-ol?",
          answer: "Butan-2-one...",
        },
        chemContract,
      );
      expect(resLocant.valid).toBe(false);
      expect(resLocant.issues.some((i) => i.code === "CHEM_INVALID_IUPAC_NAME")).toBe(true);
    });
  });

  // ----------------------------------------------------------------------
  // Section 3: Sanskrit Paninian Morphology & Agreement Verification
  // ----------------------------------------------------------------------
  describe("3. Authentic Sanskrit Paninian Morphology & Agreement", () => {
    const sanskritContract = makeContract({
      canonicalSubject: "Sanskrit",
      subjectCode: "122",
      language: "sa",
      className: "Class 10",
      questionType: "MATCH_COLUMN",
      marksEach: 4,
    });

    it("verifies Paninian suffix rules (क्त vs क्तवतु, क्त्वा vs ल्यप्, तुमुन्, शतृ)", () => {
      // पठितवान् must have क्तवतु (Panini 3.2.102), error if matched with क्त
      const resKtavatu = validateGeneratedQuestion(
        {
          type: "MATCH_COLUMN",
          text: "उचितं मेलनं कुरुत:",
          options: ["पठितवान् ||| क्त-प्रत्ययः", "कृतम् ||| क्तवतु-प्रत्ययः"],
        },
        sanskritContract,
      );
      expect(resKtavatu.valid).toBe(false);
      expect(resKtavatu.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);

      // कृत्वा takes क्त्वा (Panini 3.4.21), error if matched with ल्यप्
      const resKtva = validateGeneratedQuestion(
        {
          type: "MATCH_COLUMN",
          text: "उचितं मेलनं कुरुत:",
          options: ["कृत्वा ||| ल्यप्-प्रत्ययः"],
        },
        sanskritContract,
      );
      expect(resKtva.valid).toBe(false);
      expect(resKtva.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);

      // सम्पूज्य is prefix-compounded, takes ल्यप् (Panini 7.1.37), error if matched with क्त्वा
      const resLyap = validateGeneratedQuestion(
        {
          type: "MATCH_COLUMN",
          text: "उचितं मेलनं कुरुत:",
          options: ["सम्पूज्य ||| क्त्वा-प्रत्ययः"],
        },
        sanskritContract,
      );
      expect(resLyap.valid).toBe(false);
      expect(resLyap.issues.some((i) => i.code === "SANSKRIT_PRATYAYA_MISMATCH")).toBe(true);
    });

    it("flags pseudo-Sanskrit Hindi calques and postposition leakages", () => {
      const saContractShort = makeContract({
        canonicalSubject: "Sanskrit",
        subjectCode: "122",
        language: "sa",
        className: "Class 10",
      });

      // Hindi passive auxiliary calque 'प्रदत्तोग्छति'
      const resCalque = validateGeneratedQuestion(
        {
          type: "SHORT",
          text: "अधोलिखितः श्लोकः प्रदत्तोग्छति, तस्य भावार्थं लिखत।",
          answer: "श्लोकस्य भावार्थः...",
        },
        saContractShort,
      );
      expect(resCalque.valid).toBe(false);
      expect(resCalque.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);

      // Hindi postposition 'बालक को'
      const resPost = validateGeneratedQuestion(
        {
          type: "SHORT",
          text: "बालक को फलम् यच्छति।",
          answer: "बालकाय फलम् यच्छति।",
        },
        saContractShort,
      );
      expect(resPost.valid).toBe(false);
      expect(resPost.issues.some((i) => i.code === "SANSKRIT_HINDI_CALQUE_ERROR")).toBe(true);
    });

    it("enforces 3-gender interrogative pronoun agreement against MCQ options", () => {
      const mcqContract = makeContract({
        canonicalSubject: "Sanskrit",
        subjectCode: "122",
        language: "sa",
        className: "Class 10",
        questionType: "MCQ",
        marksEach: 1,
      });

      // Stem uses 'कः' (masc sing) but all options are dual masculine ending in -ौ
      const resDual = validateGeneratedQuestion(
        {
          type: "MCQ",
          text: "रामायणस्य प्रसिद्धौ नायकौ कः आस्ताम्?",
          options: ["लवकुशौ", "रामलक्ष्मणौ", "भरतशत्रुघ्नौ", "सुग्रीवविभीषणौ"],
          answer: "रामलक्ष्मणौ",
        },
        mcqContract,
      );
      expect(resDual.valid).toBe(false);
      expect(resDual.issues.some((i) => i.code === "SANSKRIT_AGREEMENT_ERROR")).toBe(true);
    });
  });

  // ----------------------------------------------------------------------
  // Section 4: Physics Dimensional Analysis & Physical Bounds Verification
  // ----------------------------------------------------------------------
  describe("4. Authentic Physics Dimensional Analysis & Bounds", () => {
    const physContract = makeContract({
      canonicalSubject: "Physics",
      subjectCode: "210",
      className: "Class 12",
    });

    it("flags SI cross-quantity mismatches for resistance, power, and acceleration", () => {
      // Resistance expressed in Farads
      const resR = validateGeneratedQuestion(
        {
          type: "SHORT",
          text: "A conductor has resistance $10\\text{ F}$ across a potential difference of $20\\text{ V}$.",
          answer: "Current is...",
        },
        physContract,
      );
      expect(resR.valid).toBe(false);
      expect(resR.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);

      // Power expressed in Newtons
      const resP = validateGeneratedQuestion(
        {
          type: "SHORT",
          text: "An electric bulb consumes power of $100\\text{ N}$ when connected to $220\\text{ V}$.",
          answer: "Resistance is...",
        },
        physContract,
      );
      expect(resP.valid).toBe(false);
      expect(resP.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("enforces universal physical bounds: speed of light c, absolute zero, and refractive index", () => {
      // Speed faster than light: 6 x 10^8 m/s
      const resC = validateGeneratedQuestion(
        {
          type: "SHORT",
          text: "A proton moves with speed $6.0 \\times 10^8\\text{ m/s}$ in a cyclotron.",
          answer: "Relativistic kinetic energy...",
        },
        physContract,
      );
      expect(resC.valid).toBe(false);
      expect(resC.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);

      // Refractive index less than 1.0 (e.g. refractive index = 0.75)
      const resN = validateGeneratedQuestion(
        {
          type: "SHORT",
          text: "Light travels into a glass slab having refractive index = 0.75.",
          answer: "Speed in medium...",
        },
        physContract,
      );
      expect(resN.valid).toBe(false);
      expect(resN.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);
    });

    it("strictly verifies Cartesian optics sign conventions for mirrors and lenses", () => {
      const optContract = makeContract({
        canonicalSubject: "Science",
        subjectCode: "200",
        className: "Class 10",
      });

      // Concave lens with positive focal length f = +25 cm
      const resConcaveLens = validateGeneratedQuestion(
        {
          type: "SHORT",
          text: "A concave lens has focal length $f = +25\\text{ cm}$. Calculate its power.",
          answer: "Power P = 1/f...",
        },
        optContract,
      );
      expect(resConcaveLens.valid).toBe(false);
      expect(resConcaveLens.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);

      // Real inverted image claimed to have positive magnification m = +1.5
      const resMag = validateGeneratedQuestion(
        {
          type: "SHORT",
          text: "The image formed by a concave mirror is real and inverted with magnification $m = +1.5$.",
          answer: "Object distance is...",
        },
        optContract,
      );
      expect(resMag.valid).toBe(false);
      expect(resMag.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });
  });
});
