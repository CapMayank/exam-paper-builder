import { describe, expect, it } from "vitest";
import {
  buildAndValidateGenerationContract,
  type GenerationContract,
} from "./curriculumContract";
import {
  validateGeneratedQuestion,
  validateReactionEquation,
  type ValidatableQuestion,
} from "./questionValidator";

/**
 * Adversarial Challenger Test Suite: Chemistry & Physics Quality Gates (Iteration 2)
 * Milestone: M3.2 Iteration 2
 *
 * Empirical stress testing matrix targeting subtle edge cases and residual defects
 * in src/lib/questionValidator.ts following Worker M3-2 remediation.
 */

describe("Adversarial Empirical Stress Suite (Iteration 2): Chemistry & Physics Quality Gates", () => {
  function createSubjectContract(
    canonicalSubject: string,
    subjectCode: string,
    className: string = "Class 12",
    language: string = "en",
  ): GenerationContract {
    const res = buildAndValidateGenerationContract({
      board: "MPBSE",
      className,
      subject: canonicalSubject,
      subjectCode,
      marksEach: 2,
      questionType: "SHORT",
      difficulty: "BALANCED",
      language,
      sectionTitle: "Section B",
      slots: [
        {
          slotIndex: 0,
          chapterId: "test_ch_1",
          chapterNumber: 1,
          chapterTitle: "Test Academic Chapter",
          marks: 2,
        },
      ],
    });
    return res.contract!;
  }

  const chemContract12En = createSubjectContract("Chemistry", "220", "Class 12", "en");
  const chemContract12Hi = createSubjectContract("Chemistry", "220", "Class 12", "hi");
  const chemContract11Hi = createSubjectContract("Chemistry", "220", "Class 11", "hi");
  const sciContract10Hi = createSubjectContract("Science", "200", "Class 10", "hi");
  const physContract12En = createSubjectContract("Physics", "210", "Class 12", "en");
  const physContract12Hi = createSubjectContract("Physics", "210", "Class 12", "hi");
  const physContract10Hi = createSubjectContract("Physics", "210", "Class 10", "hi");

  /* ================================================================== */
  /* 1. Chemical Reaction Stoichiometry & Prose Boundary Stress Tests  */
  /* ================================================================== */
  describe("1. Chemical Reaction Stoichiometry & Prose Boundary Stress Tests", () => {
    it("Case 1.1: Passes balanced reaction with colon preceding the equation", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Consider the oxidation reaction: $2SO_2 + O_2 \\rightarrow 2SO_3$. Calculate Kp.",
        answer: "Kp calculation...",
      };
      const res = validateGeneratedQuestion(q, chemContract12En);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(false);
    });

    it("Case 1.2: Recognizes LaTeX \\xrightarrow{\\Delta} reaction arrows correctly", () => {
      const res = validateReactionEquation("2KClO_3 \\xrightarrow{\\Delta} 2KCl + 3O_2");
      expect(res).not.toBeNull();
      expect(res?.isBalanced).toBe(true);
    });

    it("Case 1.3: [DEFECT 1.1 False Positive] Rejects question with leading English prose 'Consider $2H_2 + O_2 \\rightarrow 2H_2O$' lacking colon", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Consider $2H_2 + O_2 \\rightarrow 2H_2O$. Calculate the standard enthalpy of formation of water.",
        answer: "\\Delta H_f^\\circ = ...",
      };
      const res = validateGeneratedQuestion(q, chemContract12En);
      // Expected behavior: Valid balanced reaction should pass without CHEM_UNBALANCED_REACTION
      // Bug: 'Consider' parses as element 'Co' (Cobalt), causing false rejection
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(false);
    });

    it("Case 1.4: [DEFECT 1.1 False Positive] Rejects question with leading 'The oxidation reaction $2SO_2 + O_2 \\rightarrow 2SO_3$' lacking colon", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "The oxidation reaction $2SO_2 + O_2 \\rightarrow 2SO_3$ occurs at elevated temperature.",
        answer: "Equilibrium analysis...",
      };
      const res = validateGeneratedQuestion(q, chemContract12En);
      // Expected: Should pass
      // Bug: 'The' parses as element 'Th' (Thorium), causing false rejection
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(false);
    });

    it("Case 1.5: [DEFECT 1.1 False Positive] Rejects question starting with 'Given $2H_2 + O_2 \\rightarrow 2H_2O$'", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Given $2H_2 + O_2 \\rightarrow 2H_2O$. Find the bond enthalpy of H-O.",
        answer: "Bond enthalpy...",
      };
      const res = validateGeneratedQuestion(q, chemContract12En);
      // Expected: Should pass
      // Bug: 'Given' parses as element 'Gi', causing false rejection
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(false);
    });

    it("Case 1.6: [DEFECT 1.2 False Negative] Fails to flag unbalanced reaction followed by a comma in a subordinate clause", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "For the synthesis $N_2 + H_2 \\rightarrow NH_3$, calculate the rate of consumption of nitrogen.",
        answer: "Reaction stoichiometry...",
      };
      const res = validateGeneratedQuestion(q, chemContract12En);
      // Expected: Unbalanced reaction N2 + H2 -> NH3 must trigger CHEM_UNBALANCED_REACTION
      // Bug: rxnMatch regex terminates at comma, skipping the entire reaction
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(true);
    });
  });

  /* ================================================================== */
  /* 2. Hindi Chemistry Deleted Syllabus Stress Tests                   */
  /* ================================================================== */
  describe("2. Hindi Chemistry Deleted Syllabus Stress Tests", () => {
    it("Case 2.1: Correctly rejects English plural deleted topics (tranquilizers, antipyretics)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Classify tranquilizers and antipyretics with one example each in medicinal chemistry.",
        answer: "Classification...",
      };
      const res = validateGeneratedQuestion(q, chemContract12En);
      expect(res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("Case 2.2: [DEFECT 3.1 False Negative] Fails to flag Hindi Class 12 Solid State (ठोस अवस्था) due to ASCII \\b", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "ठोस अवस्था में शॉट्की त्रुटि को उदाहरण सहित समझाइए।",
        answer: "शॉट्की त्रुटि...",
      };
      const res = validateGeneratedQuestion(q, chemContract12Hi);
      // Expected: Deleted syllabus topic must trigger CHEM_DELETED_SYLLABUS
      // Bug: ASCII \b fails on Devanagari characters
      expect(res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("Case 2.3: [DEFECT 3.2 False Negative] Fails to flag Hindi Class 12 Surface Chemistry (पृष्ठ रसायन / टिंडल प्रभाव) due to ASCII \\b", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "पृष्ठ रसायन के अंतर्गत टिंडल प्रभाव की व्याख्या कीजिए।",
        answer: "टिंडल प्रभाव...",
      };
      const res = validateGeneratedQuestion(q, chemContract12Hi);
      // Expected: Trigger CHEM_DELETED_SYLLABUS
      expect(res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("Case 2.4: [DEFECT 3.3 False Negative] Fails to flag Hindi Class 12 Metallurgy (धातुकर्म / झाग प्लवन) due to ASCII \\b", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "सल्फाइड अयस्क के लिए झाग प्लवन विधि का वर्णन कीजिए।",
        answer: "झाग प्लवन...",
      };
      const res = validateGeneratedQuestion(q, chemContract12Hi);
      // Expected: Trigger CHEM_DELETED_SYLLABUS
      expect(res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("Case 2.5: [DEFECT 3.4 False Negative] Fails to flag Hindi Class 12 Polymers (बहुलक / नायलॉन) due to ASCII \\b", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "नायलॉन और बेकेलाइट किस प्रकार के बहुलक हैं?",
        answer: "बहुलक...",
      };
      const res = validateGeneratedQuestion(q, chemContract12Hi);
      // Expected: Trigger CHEM_DELETED_SYLLABUS
      expect(res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("Case 2.6: [DEFECT 3.5 False Negative] Fails to flag Hindi Class 12 Everyday Chemistry (ज्वरनाशी / प्रशांतक) due to ASCII \\b", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "ज्वरनाशी एवं प्रशांतक औषधियों के दो उदाहरण दीजिए।",
        answer: "ज्वरनाशी...",
      };
      const res = validateGeneratedQuestion(q, chemContract12Hi);
      // Expected: Trigger CHEM_DELETED_SYLLABUS
      expect(res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("Case 2.7: [DEFECT 3.6 False Negative] Fails to flag Hindi Class 11 States of Matter (बॉयल का नियम / वांडरवाल्स समीकरण) due to ASCII \\b", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "बॉयल का नियम लिखिए और वांडरवाल्स समीकरण समझाइए।",
        answer: "समीकरण...",
      };
      const res = validateGeneratedQuestion(q, chemContract11Hi);
      // Expected: Trigger CHEM_DELETED_SYLLABUS
      expect(res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("Case 2.8: [DEFECT 3.7 False Negative] Fails to flag Hindi Class 10 Periodic Classification (मेंडेलीव) due to ASCII \\b", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "मेंडेलीव की आवर्त सारणी के गुण एवं दोष लिखिए।",
        answer: "मेंडेलीव...",
      };
      const res = validateGeneratedQuestion(q, sciContract10Hi);
      // Expected: Trigger CHEM_DELETED_SYLLABUS
      expect(res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });
  });

  /* ================================================================== */
  /* 3. Physics SI Unit Inconsistency Stress Tests                      */
  /* ================================================================== */
  describe("3. Physics SI Unit Inconsistency Stress Tests", () => {
    it("Case 3.1: Correctly flags English 'work done of 250 N'", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Calculate the total work done of $250\\text{ N}$ during the displacement of 5 meters.",
        answer: "Work...",
      };
      const res = validateGeneratedQuestion(q, physContract12En);
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("Case 3.2: [DEFECT 2.1 False Negative] Fails to flag Hindi Force in Joules (बल 50 J) due to ASCII \\b", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "एक वस्तु पर बल 50 J आरोपित किया जाता है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      // Expected: Force cannot be in Joules (PHYSICS_UNIT_INCONSISTENCY)
      // Bug: \b(?:force|बल) fails on Devanagari
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("Case 3.3: [DEFECT 2.2 False Negative] Fails to flag Hindi Work in Newtons (कार्य 50 N) due to ASCII \\b", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "पिंड द्वारा किया गया कार्य 50 N है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      // Expected: Work cannot be in Newtons (PHYSICS_UNIT_INCONSISTENCY)
      // Bug: \b(?:work...|कार्य) fails on Devanagari
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("Case 3.4: [DEFECT 2.3 False Negative] Fails to flag Hindi Power in Joules (शक्ति 100 J) due to ASCII \\b", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "विद्युत मोटर की शक्ति 100 J है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      // Expected: Power cannot be in Joules (PHYSICS_UNIT_INCONSISTENCY)
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("Case 3.5: [DEFECT 2.4 False Negative] Fails to flag Hindi Current in Volts (विद्युत धारा 5 V) due to ASCII \\b", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "परिपथ में प्रवाहित विद्युत धारा 5 V है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      // Expected: Current cannot be in Volts (PHYSICS_UNIT_INCONSISTENCY)
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("Case 3.6: [DEFECT 2.5 False Negative] Fails to flag Hindi Resistance in Amperes (प्रतिरोध 10 A) due to ASCII \\b", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "तार का विद्युत प्रतिरोध 10 A है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      // Expected: Resistance cannot be in Amperes (PHYSICS_UNIT_INCONSISTENCY)
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("Case 3.7: [DEFECT 2.6 False Negative] Fails to flag Hindi Capacitance in Henries (धारिता 5 H) due to ASCII \\b", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "संधारित्र की धारिता 5 H है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      // Expected: Capacitance cannot be in Henries (PHYSICS_UNIT_INCONSISTENCY)
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("Case 3.8: [DEFECT 2.7 False Negative] Fails to flag Hindi Velocity in m/s^2 (वेग 20 m/s^2) due to ASCII \\b", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "कण का वेग 20 m/s^2 है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      // Expected: Velocity cannot be in m/s^2 (PHYSICS_UNIT_INCONSISTENCY)
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("Case 3.9: [DEFECT 2.8 False Negative] Fails to flag Hindi Acceleration in m/s (त्वरण 10 m/s) due to ASCII \\b", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "पिंड का त्वरण 10 m/s है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      // Expected: Acceleration cannot be in m/s (PHYSICS_UNIT_INCONSISTENCY)
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });
  });

  /* ================================================================== */
  /* 4. Optics Cartesian Sign Convention Stress Tests                   */
  /* ================================================================== */
  describe("4. Optics Cartesian Sign Convention Stress Tests", () => {
    it("Case 4.1: Correctly rejects English convex lens with negative focal length f < 0", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "A convex lens of focal length $f = -20\\text{ cm}$ forms an image.",
        answer: "Image...",
      };
      const res = validateGeneratedQuestion(q, physContract12En);
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("Case 4.2: Correctly rejects Hindi concave mirror with positive focal length f > 0", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "एक अवतल दर्पण की फोकस दूरी $f = +20\\text{ cm}$ है।",
        answer: "प्रतिबिम्ब स्थिति...",
      };
      const res = validateGeneratedQuestion(q, physContract10Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("Case 4.3: Correctly rejects Hindi convex mirror with negative focal length f < 0", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "एक उत्तल दर्पण की फोकस दूरी $f = -25\\text{ cm}$ है।",
        answer: "प्रतिबिम्ब...",
      };
      const res = validateGeneratedQuestion(q, physContract10Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("Case 4.4: Correctly rejects Hindi real and inverted image with positive magnification m > 0", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "दर्पण द्वारा निर्मित वास्तविक एवं उल्टा प्रतिबिम्ब $m = +1.5$ आवर्धन दर्शाता है।",
        answer: "प्रतिबिम्ब की प्रकृति...",
      };
      const res = validateGeneratedQuestion(q, physContract10Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("Case 4.5: [DEFECT 4.1 False Negative] Fails to flag Hindi real object distance with positive sign (u = +20 cm)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "एक वास्तविक बिम्ब दर्पण के सामने $u = +20\\text{ cm}$ पर रखा है।",
        answer: "प्रतिबिम्ब दूरी...",
      };
      const res = validateGeneratedQuestion(q, physContract10Hi);
      // Expected: Real object must have u < 0 (PHYSICS_OPTICS_SIGN_ERROR)
      // Bug: realObjPosU regex lacks Hindi phrases (वास्तविक बिम्ब / बिम्ब ... रखा)
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });
  });
});
