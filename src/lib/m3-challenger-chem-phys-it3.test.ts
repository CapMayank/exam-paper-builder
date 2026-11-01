import { describe, expect, it } from "vitest";
import {
  buildAndValidateGenerationContract,
  type GenerationContract,
} from "./curriculumContract";
import {
  parseChemicalFormula,
  validateGeneratedQuestion,
  validateReactionEquation,
  type ValidatableQuestion,
} from "./questionValidator";

/**
 * Challenger M3-2 Iteration 3: Adversarial Verification & Stress Test Suite
 *
 * Empirical verification of Worker M3-3 remediation covering:
 * 1. Chemical Reaction Balancing with varied leading prose, no colon, commas, genuine elements (Co, CO, In, Th, As)
 * 2. Hindi SI Unit Consistency without word boundary defects or false positives on compound words
 * 3. Hindi Chemistry Deleted Syllabus Rules with Devanagari boundaries, dandas, and qualified topics
 * 4. Hindi Cartesian Optics Sign Conventions across lenses, mirrors, object distances, and magnifications
 */

describe("Challenger M3-2 It3: Comprehensive Adversarial Stress Suite", () => {
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
          chapterTitle: "Academic Test Chapter",
          marks: 2,
        },
      ],
    });
    return res.contract!;
  }

  const chemContract12En = createSubjectContract("Chemistry", "220", "Class 12", "en");
  const chemContract12Hi = createSubjectContract("Chemistry", "220", "Class 12", "hi");
  const chemContract11Hi = createSubjectContract("Chemistry", "220", "Class 11", "hi");
  const chemContract11En = createSubjectContract("Chemistry", "220", "Class 11", "en");
  const sciContract10Hi = createSubjectContract("Science", "200", "Class 10", "hi");
  const physContract12En = createSubjectContract("Physics", "210", "Class 12", "en");
  const physContract12Hi = createSubjectContract("Physics", "210", "Class 12", "hi");
  const physContract10Hi = createSubjectContract("Physics", "210", "Class 10", "hi");

  /* ================================================================== */
  /* 1. Chemical Reaction Stoichiometry & Prose Boundary Stress Tests  */
  /* ================================================================== */
  describe("1. Chemical Reaction Extraction & Genuine Elements", () => {
    it("1.1: Genuine element Cobalt (Co) is preserved and balanced", () => {
      // Co + Cl2 -> CoCl2
      const res = validateReactionEquation("Co + Cl2 -> CoCl2");
      expect(res).not.toBeNull();
      expect(res?.isBalanced).toBe(true);
    });

    it("1.2: Leading prose before Cobalt 'Consider Co + Cl2 -> CoCl2' preserves Co and passes", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Consider Co + Cl2 -> CoCl2. Identify the oxidation state of cobalt in the product.",
        answer: "Co is +2.",
      };
      const res = validateGeneratedQuestion(q, chemContract12En);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(false);
    });

    it("1.3: Unbalanced Cobalt reaction 'Consider Co + Cl2 -> CoCl3' triggers error", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Consider Co + Cl2 -> CoCl3. Find the stoichiometric coefficient.",
        answer: "Unbalanced.",
      };
      const res = validateGeneratedQuestion(q, chemContract12En);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(true);
    });

    it("1.4: Carbon monoxide (CO) genuine compound with coefficient 'Given 2CO + O2 -> 2CO2' passes", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Given 2CO + O2 -> 2CO2. Calculate standard enthalpy of combustion.",
        answer: "Enthalpy...",
      };
      const res = validateGeneratedQuestion(q, chemContract12En);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(false);
    });

    it("1.5: Genuine element Indium (In) 'For the reaction 4In + 3O2 -> 2In2O3' passes", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "For the reaction 4In + 3O2 -> 2In2O3, calculate the mass of indium oxide produced.",
        answer: "Stoichiometry...",
      };
      const res = validateGeneratedQuestion(q, chemContract12En);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(false);
    });

    it("1.6: Genuine element Thorium (Th) 'Suppose Th + 2F2 -> ThF4' passes", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Suppose Th + 2F2 -> ThF4 occurs at high temperature. Determine the formula of thorium fluoride.",
        answer: "ThF4...",
      };
      const res = validateGeneratedQuestion(q, chemContract12En);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(false);
    });

    it("1.7: Genuine element Arsenic (As) 'Assume 2As + 3Cl2 -> 2AsCl3' passes", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Assume 2As + 3Cl2 -> 2AsCl3. Find the limiting reagent when 10 g As reacts with 10 g Cl2.",
        answer: "Limiting reagent...",
      };
      const res = validateGeneratedQuestion(q, chemContract12En);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(false);
    });

    it("1.8: Subordinate clause with comma 'When $2H_2 + O_2 \\rightarrow 2H_2O$, calculate heat' passes", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "When $2H_2 + O_2 \\rightarrow 2H_2O$, calculate the total heat liberated at constant volume.",
        answer: "Heat liberated...",
      };
      const res = validateGeneratedQuestion(q, chemContract12En);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(false);
    });

    it("1.9: Subordinate clause with comma and unbalanced reaction 'If $H_2 + Cl_2 \\rightarrow HCl$, find the error' triggers CHEM_UNBALANCED_REACTION", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "If $H_2 + Cl_2 \\rightarrow HCl$, identify why this equation violates the law of conservation of mass.",
        answer: "Chlorine and hydrogen are not balanced.",
      };
      const res = validateGeneratedQuestion(q, chemContract12En);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(true);
    });

    it("1.10: Hindi leading prose 'निम्नलिखित अभिक्रिया $2H_2 + O_2 \\rightarrow 2H_2O$ के लिए' passes", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "निम्नलिखित अभिक्रिया $2H_2 + O_2 \\rightarrow 2H_2O$ के लिए मानक संभवन ऊष्मा की गणना कीजिए।",
        answer: "संभवन ऊष्मा...",
      };
      const res = validateGeneratedQuestion(q, chemContract12Hi);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(false);
    });

    it("1.11: Hindi leading prose with comma and unbalanced reaction triggers CHEM_UNBALANCED_REACTION", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "अभिक्रिया $H_2 + O_2 \\rightarrow H_2O$, को संतुलित कीजिए।",
        answer: "2H2 + O2 -> 2H2O",
      };
      const res = validateGeneratedQuestion(q, chemContract12Hi);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(true);
    });

    it("1.12: English trailing prose without comma 'Consider $H_2 + O_2 \\rightarrow H_2O$ and calculate'", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Consider $H_2 + O_2 \\rightarrow H_2O$ and calculate the heat.",
        answer: "Heat...",
      };
      const res = validateGeneratedQuestion(q, chemContract12En);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(true);
    });

    it("1.13: Leading prose verbs 'Observe', 'Determine', 'Find', 'Let' without colon pass", () => {
      const verbs = [
        "Observe $2H_2 + O_2 \\rightarrow 2H_2O$ in an enclosed chamber.",
        "Determine the enthalpy of $2H_2 + O_2 \\rightarrow 2H_2O$ at elevated temperature.",
        "Determine the enthalpy of $2H_2 + O_2 \\rightarrow 2H_2O$, at 298 K.",
        "Find the equilibrium constant for $N_2 + 3H_2 \\rightarrow 2NH_3$.",
        "Let $2H_2 + O_2 \\rightarrow 2H_2O$ be an elementary reaction step.",
        "Where $2H_2 + O_2 \\rightarrow 2H_2O$ reaches dynamic equilibrium.",
      ];
      for (const text of verbs) {
        const q: ValidatableQuestion = { type: "SHORT", text, answer: "Valid" };
        const res = validateGeneratedQuestion(q, chemContract12En);
        expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION"), `Failed on: ${text}`).toBe(false);
      }
    });
  });

  /* ================================================================== */
  /* 2. Hindi SI Unit Consistency Stress Tests                          */
  /* ================================================================== */
  describe("2. Hindi SI Unit Consistency & Boundary Stress Tests", () => {
    it("2.1: Valid Hindi units pass without false positives", () => {
      const validCases = [
        "एक वस्तु पर बल 50 N आरोपित किया जाता है।",
        "पिंड द्वारा किया गया कार्य 500 J है।",
        "विद्युत मोटर की शक्ति 100 W है।",
        "परिपथ में प्रवाहित विद्युत धारा 5 A है।",
        "चालक का प्रतिरोध 10 ohm है।",
        "संधारित्र की धारिता 5 F है।",
        "कण का वेग 20 m/s है।",
        "पिंड का त्वरण 10 m/s^2 है।",
      ];
      for (const text of validCases) {
        const q: ValidatableQuestion = { type: "SHORT", text, answer: "Valid" };
        const res = validateGeneratedQuestion(q, physContract12Hi);
        const unitIssues = res.issues.filter((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY");
        expect(unitIssues, `Failed on valid text: ${text}`).toHaveLength(0);
      }
    });

    it("2.2: Hindi Force in Watts 'बल 50 W' triggers error", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "पिंड पर आरोपित बल 50 W के कारण विस्थापन ज्ञात कीजिए।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("2.3: Hindi Energy in Newtons 'ऊर्जा 150 N' triggers error", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "निकाय की गतिज ऊर्जा 150 N है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("2.4: Hindi Heat in Volts 'ऊष्मा 200 V' triggers error", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "उत्पन्न ऊष्मा 200 V का मान परिकलित कीजिए।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("2.5: Hindi Speed with acceleration unit 'चाल 30 m/s^2' triggers error", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "कार की चाल 30 m/s^2 है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("2.6: Hindi Speed with LaTeX unit 'चाल 30 m s^{-2}' triggers error", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "कार की चाल $30\\text{ m }s^{-2}$ है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("2.7: Hindi Acceleration with speed unit 'त्वरण 9.8 km/h' triggers error", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "गुरुत्वीय त्वरण 9.8 km/h दिया गया है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("2.8: Compound words like 'दुर्बल' and 'प्रबल' do not falsely trigger force error", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "दुर्बल अम्ल और प्रबल क्षार के उदासीनीकरण में 57.1 kJ ऊष्मा निकलती है।",
        answer: "उदासीनीकरण...",
      };
      const res = validateGeneratedQuestion(q, chemContract12Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(false);
    });

    it("2.9: Hindi superluminal speed 'चाल 4 x 10^8 m/s' triggers PHYSICS_IMPOSSIBLE_PARAMETER", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "प्रकाशिक फाइबर में संकेत की चाल $4.0 \\times 10^8\\text{ m/s}$ है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);
    });

    it("2.10: Hindi negative mass 'द्रव्यमान -5 kg' triggers PHYSICS_IMPOSSIBLE_PARAMETER", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "पिंड का द्रव्यमान -5 kg दिया गया है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);
    });

    it("2.11: Hindi efficiency >= 100% 'दक्षता 120 %' triggers PHYSICS_IMPOSSIBLE_PARAMETER", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "कार्नो इंजन की दक्षता 120 % है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract12Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);
    });
  });

  /* ================================================================== */
  /* 3. Hindi Chemistry Deleted Syllabus Stress Tests                   */
  /* ================================================================== */
  describe("3. Hindi Chemistry Deleted Syllabus & Boundary Stress Tests", () => {
    it("3.1: Rejects Class 12 Hindi topics ending with danda '।'", () => {
      const questions = [
        "क्रिस्टल जालक में शॉट्की त्रुटि उत्पन्न होती है।",
        "कोलॉइड विलयन में टिंडल प्रभाव देखा जाता है।",
        "सल्फाइड अयस्कों का सांद्रण झाग प्लवन विधि द्वारा किया जाता है।",
        "टेफ्लॉन और नियोप्रीन संश्लेषित बहुलक हैं।",
        "एस्पार्टेम एक कृत्रिम मधुरक है।",
      ];
      for (const text of questions) {
        const q: ValidatableQuestion = { type: "SHORT", text, answer: "Ans" };
        const res = validateGeneratedQuestion(q, chemContract12Hi);
        expect(
          res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS"),
          `Expected deleted syllabus error for: ${text}`,
        ).toBe(true);
      }
    });

    it("3.2: Rejects Class 11 Hindi deleted topics (द्रव्य की अवस्थाएं, डाल्टन का आंशिक दाब)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "डाल्टन का आंशिक दाब का नियम लिखिए एवं व्याख्या कीजिए।",
        answer: "डाल्टन...",
      };
      const res = validateGeneratedQuestion(q, chemContract11Hi);
      expect(res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("3.3: Rejects Class 11 Hindi deleted hydrogen topics (हाइड्रोजन परॉक्साइड, भारी जल)", () => {
      const q1: ValidatableQuestion = {
        type: "SHORT",
        text: "हाइड्रोजन परॉक्साइड की संरचना एवं विरंजन गुण समझाइए।",
        answer: "H2O2...",
      };
      const res1 = validateGeneratedQuestion(q1, chemContract11Hi);
      expect(res1.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);

      const q2: ValidatableQuestion = {
        type: "SHORT",
        text: "भारी जल (D2O) का निर्माण एवं उपयोग बताइए।",
        answer: "D2O...",
      };
      const res2 = validateGeneratedQuestion(q2, chemContract11Hi);
      expect(res2.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("3.4: Permitted Class 11 Hydrogen topics (Bohr hydrogen atom) do NOT trigger false positive", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "हाइड्रोजन परमाणु के लिए बोहर के परमाणु मॉडल की प्रमुख अवधारणाएं लिखिए।",
        answer: "बोहर मॉडल...",
      };
      const res = validateGeneratedQuestion(q, chemContract11Hi);
      expect(res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(false);
    });

    it("3.5: Permitted Class 11 Hydrogen bonding questions do NOT trigger false positive", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "हाइड्रोजन आबंधन (Hydrogen bonding) क्या है? इसके प्रकार समझाइए।",
        answer: "हाइड्रोजन आबंधन...",
      };
      const res = validateGeneratedQuestion(q, chemContract11Hi);
      expect(res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(false);
    });

    it("3.6: Rejects Class 10 Hindi deleted topics (न्यूलैंड्स अष्टक नियम, डोबेराइनर त्रिक)", () => {
      const q1: ValidatableQuestion = {
        type: "SHORT",
        text: "न्यूलैंड्स का अष्टक नियम क्या है? इसकी सीमाएं लिखिए।",
        answer: "अष्टक नियम...",
      };
      const res1 = validateGeneratedQuestion(q1, sciContract10Hi);
      expect(res1.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);

      const q2: ValidatableQuestion = {
        type: "SHORT",
        text: "डोबेराइनर के त्रिक नियम को एक उदाहरण द्वारा समझाइए।",
        answer: "त्रिक...",
      };
      const res2 = validateGeneratedQuestion(q2, sciContract10Hi);
      expect(res2.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });
  });

  /* ================================================================== */
  /* 4. Hindi Optics Sign Convention Stress Tests                       */
  /* ================================================================== */
  describe("4. Hindi Optics Cartesian Sign Convention Stress Tests", () => {
    it("4.1: Rejects Hindi real object with positive distance (वस्तु ... u = +15 cm रखी है)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "एक वस्तु अवतल दर्पण के सामने $u = +15\\text{ cm}$ पर रखी है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract10Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("4.2: Rejects Hindi real object with positive distance (बिम्ब ... u = +25 cm स्थित है)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "एक बिम्ब उत्तल लेंस से $u = +25\\text{ cm}$ की दूरी पर स्थित है।",
        answer: "प्रतिबिम्ब स्थिति...",
      };
      const res = validateGeneratedQuestion(q, physContract10Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("4.3: Accepts Hindi real object with negative distance (u = -20 cm)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "एक वास्तविक बिम्ब दर्पण के सामने $u = -20\\text{ cm}$ पर रखा है।",
        answer: "प्रतिबिम्ब...",
      };
      const res = validateGeneratedQuestion(q, physContract10Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(false);
    });

    it("4.4: Rejects Hindi convex lens with negative focal length (f = -15 cm)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "एक उत्तल लेंस जिसकी फोकस दूरी $f = -15\\text{ cm}$ है, प्रतिबिम्ब बनाता है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract10Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("4.5: Accepts Hindi convex lens with positive focal length (f = +15 cm)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "एक उत्तल लेंस जिसकी फोकस दूरी $f = +15\\text{ cm}$ है, प्रतिबिम्ब बनाता है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract10Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(false);
    });

    it("4.6: Rejects Hindi inverted image with positive magnification (वास्तविक एवं उल्टा ... m = +2)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "निर्मित वास्तविक एवं उल्टा प्रतिबिम्ब $m = +2.0$ आवर्धन देता है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract10Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("4.7: Accepts Hindi inverted image with negative magnification (वास्तविक एवं उल्टा ... m = -2)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "निर्मित वास्तविक एवं उल्टा प्रतिबिम्ब $m = -2.0$ आवर्धन देता है।",
        answer: "गणना...",
      };
      const res = validateGeneratedQuestion(q, physContract10Hi);
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(false);
    });
  });
});
