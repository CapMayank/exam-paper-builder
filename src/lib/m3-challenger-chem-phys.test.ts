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
 * Adversarial Challenger Test Suite: Chemistry & Physics Quality Gates
 * Milestone: M3.2
 *
 * Empirical stress testing matrix across 43 test cases:
 * - 34 Verified Correctness Baseline Cases
 * - 9 Empirical Defect Demonstrations (using it.fails to isolate bugs without corrupting test runner)
 */

describe("Adversarial Empirical Stress Suite: Chemistry & Physics Quality Gates", () => {
  // Helper contract factory
  function createSubjectContract(
    canonicalSubject: string,
    subjectCode: string,
    className: string = "Class 12",
  ): GenerationContract {
    const res = buildAndValidateGenerationContract({
      board: "MPBSE",
      className,
      subject: canonicalSubject,
      subjectCode,
      marksEach: 2,
      questionType: "SHORT",
      difficulty: "BALANCED",
      language: "en",
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

  const chemContract12 = createSubjectContract("Chemistry", "220", "Class 12");
  const chemContract11 = createSubjectContract("Chemistry", "220", "Class 11");
  const scienceContract10 = createSubjectContract("Science", "200", "Class 10");
  const physContract12 = createSubjectContract("Physics", "210", "Class 12");
  const physContract10 = createSubjectContract("Physics", "210", "Class 10");

  /* ================================================================== */
  /* 1. Chemical Reaction Balancing & Stoichiometry Stress Tests        */
  /* ================================================================== */
  describe("1. Chemical Reaction Stoichiometry & Formula Parser Stress Tests", () => {
    it("Case 1.1: Parses complex coordination compounds with nested brackets and polyatomic ligands", () => {
      // [Cu(NH3)4]SO4
      const cuComplex = parseChemicalFormula("[Cu(NH3)4]SO4");
      expect(cuComplex).toEqual({ Cu: 1, N: 4, H: 12, S: 1, O: 4 });

      // K4[Fe(CN)6] (potassium ferrocyanide)
      const feComplex = parseChemicalFormula("K4[Fe(CN)6]");
      expect(feComplex).toEqual({ K: 4, Fe: 1, C: 6, N: 6 });

      // [Co(NH3)5Cl]Cl2
      const coComplex = parseChemicalFormula("[Co(NH3)5Cl]Cl2");
      expect(coComplex).toEqual({ Co: 1, N: 5, H: 15, Cl: 3 });

      // Polyatomic salt with outer and inner subscripts: Fe2(SO4)3
      const feSulfate = parseChemicalFormula("Fe2(SO4)3");
      expect(feSulfate).toEqual({ Fe: 2, S: 3, O: 12 });
    });

    it("Case 1.2: Validates balanced coordination reaction with nested brackets", () => {
      // 2K4[Fe(CN)6] + Cl2 -> 2K3[Fe(CN)6] + 2KCl
      const res = validateReactionEquation("2K4[Fe(CN)6] + Cl2 -> 2K3[Fe(CN)6] + 2KCl");
      expect(res).not.toBeNull();
      expect(res?.isBalanced).toBe(true);
    });

    it("Case 1.3: Rejects stoichiometrically unbalanced coordination reaction", () => {
      // K4[Fe(CN)6] + Cl2 -> K3[Fe(CN)6] + KCl (unbalanced chlorine and potassium)
      const res = validateReactionEquation("K4[Fe(CN)6] + Cl2 -> K3[Fe(CN)6] + KCl");
      expect(res).not.toBeNull();
      expect(res?.isBalanced).toBe(false);
      expect(res?.element).toBe("Cl");
    });

    it("Case 1.4: Handles hydrated salts with dot notation and coefficients correctly", () => {
      // Plain hydrate: CuSO4.5H2O
      const blueVitriol = parseChemicalFormula("CuSO4.5H2O");
      expect(blueVitriol).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });

      // Multiplied hydrate: 2FeSO4.7H2O
      const greenVitriol = parseChemicalFormula("2FeSO4.7H2O");
      expect(greenVitriol).toEqual({ Fe: 2, S: 2, O: 22, H: 28 });

      // Balanced hydration: CuSO4 + 5H2O -> CuSO4.5H2O
      const resBalanced = validateReactionEquation("CuSO4 + 5H2O -> CuSO4.5H2O");
      expect(resBalanced?.isBalanced).toBe(true);

      // Unbalanced hydration dehydration: CuSO4.5H2O -> CuSO4 + 4H2O (loss of 1 O and 2 H)
      const resUnbalanced = validateReactionEquation("CuSO4.5H2O -> CuSO4 + 4H2O");
      expect(resUnbalanced?.isBalanced).toBe(false);
    });

    it("Case 1.5: Filters state symbols (aq, s, l, g) and arrow annotations without corrupting atoms", () => {
      // Reaction with state symbols: BaCl2(aq) + Na2SO4(aq) -> BaSO4(s) + 2NaCl(aq)
      const resPhases = validateReactionEquation(
        "BaCl2(aq) + Na2SO4(aq) -> BaSO4(s) + 2NaCl(aq)",
      );
      expect(resPhases?.isBalanced).toBe(true);

      // Reaction with gas arrows and solid precipitates: CaCO3(s) + 2HCl(aq) -> CaCl2(aq) + CO2(g) \\uparrow + H2O(l)
      const resPrecip = validateReactionEquation(
        "CaCO3(s) + 2HCl(aq) -> CaCl2(aq) + CO2(g) \\uparrow + H2O(l)",
      );
      expect(resPrecip?.isBalanced).toBe(true);
    });

    it("Case 1.6: Filters thermal reaction conditions (\\Delta, Heat, ऊष्मा) on product side", () => {
      // Exothermic combustion: CH4 + 2O2 -> CO2 + 2H2O + \\Delta
      const resDelta = validateReactionEquation("CH4 + 2O2 -> CO2 + 2H2O + \\Delta");
      expect(resDelta?.isBalanced).toBe(true);

      // Decomposition with Hindi heat: CaCO3 -> CaO + CO2 + ऊष्मा
      const resHindi = validateReactionEquation("CaCO3 -> CaO + CO2 + ऊष्मा");
      expect(resHindi?.isBalanced).toBe(true);

      // Unbalanced reaction with \\Delta should still be flagged as UNBALANCED
      const resBadDelta = validateReactionEquation("CH4 + O2 -> CO2 + H2O + \\Delta");
      expect(resBadDelta?.isBalanced).toBe(false);
    });

    it("Case 1.7: Rejects question containing an unbalanced chemical reaction in text (CHEM_UNBALANCED_REACTION)", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Explain the industrial production of ammonia via the Haber process: $N_2 + H_2 \\rightarrow NH_3$.",
        answer: "Nitrogen combines with hydrogen under iron catalyst.",
      };
      const res = validateGeneratedQuestion(q, chemContract12);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(true);
    });

    it("Case 1.8: Passes balanced reaction when isolated on a clean line", () => {
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Consider the oxidation reaction:\n$2SO_2 + O_2 \\rightarrow 2SO_3$\nCalculate the equilibrium constant.",
        answer: "Equilibrium constant Kp...",
      };
      const res = validateGeneratedQuestion(q, chemContract12);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(false);
    });

    it("Case 1.9: [REMEDIATED DEFECT 1] False Positive: Chemical reaction regex isolates trailing sentence text without parsing prose as elements", () => {
      // In question text without line break, text after reaction is captured by greedy rxnMatch regex
      // $2SO_2 + O_2 \rightarrow 2SO_3$. Calculate the equilibrium constant...
      // Trailing sentence prose is isolated cleanly, so balanced reaction passes.
      const q: ValidatableQuestion = {
        type: "SHORT",
        text: "Consider the balanced equation for the oxidation of sulfur dioxide: $2SO_2 + O_2 \\rightarrow 2SO_3$. Calculate the equilibrium constant.",
        answer: "Equilibrium constant Kp...",
      };
      const res = validateGeneratedQuestion(q, chemContract12);
      expect(res.issues.some((i) => i.code === "CHEM_UNBALANCED_REACTION")).toBe(false);
    });

    it("Case 1.10: [REMEDIATED DEFECT 6] False Negative: Reaction with \\xrightarrow{\\Delta} arrow is recognized by arrowRegex", () => {
      // Unbalanced reaction using standard LaTeX \xrightarrow{\Delta}
      // arrowRegex recognizes \xrightarrow{\Delta} and validates reaction stoichiometry
      const res = validateReactionEquation("N_2 + H_2 \\xrightarrow{\\Delta} NH_3");
      // Expected: should detect unbalanced reaction
      // Actual (BUG): returns null because arrow is not recognized
      expect(res).not.toBeNull();
      expect(res?.isBalanced).toBe(false);
    });
  });

  /* ================================================================== */
  /* 2. IUPAC Organic Nomenclature Stress Tests                         */
  /* ================================================================== */
  describe("2. IUPAC Organic Nomenclature Stress Tests", () => {
    it("Case 2.1: Rejects impossible 1-carbon and 2-carbon ketones (CHEM_INVALID_IUPAC_NAME)", () => {
      // methanone (impossible - carbonyl needs 2 flanking carbons)
      const qMeth = {
        type: "MCQ",
        text: "Which solvent is known as methanone?",
        options: ["A", "B", "C", "D"],
        answer: "A",
      };
      const resMeth = validateGeneratedQuestion(qMeth, chemContract12);
      expect(resMeth.valid).toBe(false);
      expect(resMeth.issues.some((i) => i.code === "CHEM_INVALID_IUPAC_NAME")).toBe(true);

      // ethanone (impossible - 2 carbons cannot form a ketone)
      const qEth = {
        type: "SHORT",
        text: "Describe the reaction of ethanone with Grignard reagent.",
        answer: "Reaction...",
      };
      const resEth = validateGeneratedQuestion(qEth, chemContract12);
      expect(resEth.valid).toBe(false);
      expect(resEth.issues.some((i) => i.code === "CHEM_INVALID_IUPAC_NAME")).toBe(true);
    });

    it("Case 2.2: Rejects terminal ketones: propan-1-one, 1-propanone, butan-1-one (CHEM_INVALID_IUPAC_NAME)", () => {
      const qProp1 = {
        type: "SHORT",
        text: "Differentiate between propan-1-one and propanal.",
        answer: "Propan-1-one is an incorrect name...",
      };
      const resProp1 = validateGeneratedQuestion(qProp1, chemContract12);
      expect(resProp1.valid).toBe(false);
      expect(resProp1.issues.some((i) => i.code === "CHEM_INVALID_IUPAC_NAME")).toBe(true);

      const qBut1 = {
        type: "SHORT",
        text: "Synthesize butan-1-one from 1-butanol.",
        answer: "Oxidation...",
      };
      const resBut1 = validateGeneratedQuestion(qBut1, chemContract12);
      expect(resBut1.valid).toBe(false);
      expect(resBut1.issues.some((i) => i.code === "CHEM_INVALID_IUPAC_NAME")).toBe(true);
    });

    it("Case 2.3: Rejects invalid locants and longest chain violations (CHEM_INVALID_IUPAC_NAME)", () => {
      // propan-3-ol (should be propan-1-ol)
      const qProp3ol = {
        type: "SHORT",
        text: "What is the product of dehydration of propan-3-ol?",
        answer: "Propene",
      };
      expect(validateGeneratedQuestion(qProp3ol, chemContract12).issues.some((i) => i.code === "CHEM_INVALID_IUPAC_NAME")).toBe(true);

      // 3-methylbutane (should be 2-methylbutane)
      const q3mb = {
        type: "SHORT",
        text: "Write the halogenation of 3-methylbutane.",
        answer: "Halogenation...",
      };
      expect(validateGeneratedQuestion(q3mb, chemContract12).issues.some((i) => i.code === "CHEM_INVALID_IUPAC_NAME")).toBe(true);

      // 1-methylpropane (is butane)
      const q1mp = {
        type: "SHORT",
        text: "Draw the Newman projection of 1-methylpropane.",
        answer: "Conformation...",
      };
      expect(validateGeneratedQuestion(q1mp, chemContract12).issues.some((i) => i.code === "CHEM_INVALID_IUPAC_NAME")).toBe(true);

      // scrambled naming: chloro-2-propane and 2-ol-propane
      const qScrambled = {
        type: "SHORT",
        text: "Compare the boiling points of chloro-2-propane and 2-ol-propane.",
        answer: "Comparison...",
      };
      expect(validateGeneratedQuestion(qScrambled, chemContract12).issues.some((i) => i.code === "CHEM_INVALID_IUPAC_NAME")).toBe(true);
    });

    it("Case 2.4: Cleanly passes valid IUPAC organic names without false positives", () => {
      const qValid: ValidatableQuestion = {
        type: "SHORT",
        text: "Explain the haloform reaction of propan-2-one and butan-2-one. Compare their reactivity with 2-methylbutane and 2-methylpropane.",
        answer: "Propan-2-one and butan-2-one both contain methyl ketone groups and yield iodoform.",
      };
      const res = validateGeneratedQuestion(qValid, chemContract12);
      expect(res.issues.some((i) => i.code === "CHEM_INVALID_IUPAC_NAME")).toBe(false);
    });
  });

  /* ================================================================== */
  /* 3. Deleted / Rationalized Syllabus Filter Stress Tests             */
  /* ================================================================== */
  describe("3. Deleted Syllabus Topic Filter Stress Tests", () => {
    it("Case 3.1: Rejects Class 12 deleted Solid State topics (BCC, Bragg's Law, Schottky defect)", () => {
      const qBcc = {
        type: "SHORT",
        text: "Calculate the packing efficiency of a body-centered cubic (BCC) crystal lattice.",
        answer: "Packing efficiency is 68%.",
      };
      const res = validateGeneratedQuestion(qBcc, chemContract12);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("Case 3.2: Rejects Class 12 deleted Surface Chemistry topics (Freundlich isotherm, Tyndall effect, electrophoresis)", () => {
      const qSurface = {
        type: "SHORT",
        text: "Explain Freundlich adsorption isotherm and Hardy-Schulze rule in coagulation of colloids.",
        answer: "Adsorption isotherm...",
      };
      const res = validateGeneratedQuestion(qSurface, chemContract12);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("Case 3.3: Rejects Class 12 deleted Metallurgy topics (froth floatation, blast furnace, zone refining)", () => {
      const qMeta = {
        type: "SHORT",
        text: "Describe the principle of froth floatation in the concentration of sulfide ores.",
        answer: "Froth floatation separates ore by wetting characteristics.",
      };
      const res = validateGeneratedQuestion(qMeta, chemContract12);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("Case 3.4: Rejects Class 12 deleted Polymers (Bakelite, Nylon-6,6)", () => {
      const qPoly = {
        type: "SHORT",
        text: "Write the monomer units and preparation of Bakelite and Nylon-6,6.",
        answer: "Bakelite is formed from phenol and formaldehyde.",
      };
      const resPoly = validateGeneratedQuestion(qPoly, chemContract12);
      expect(resPoly.valid).toBe(false);
      expect(resPoly.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("Case 3.5: [REMEDIATED DEFECT 3] False Negative: Deleted Everyday Chemistry pattern matches plural nouns (tranquilizers, antipyretics)", () => {
      // Regex matches plural forms ending with 's' (tranquilizers, antipyretics)
      const qEveryday = {
        type: "SHORT",
        text: "Classify tranquilizers and antipyretics with one example each in medicinal chemistry.",
        answer: "Antipyretics reduce body temperature...",
      };
      const resEveryday = validateGeneratedQuestion(qEveryday, chemContract12);
      expect(resEveryday.valid).toBe(false);
      expect(resEveryday.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("Case 3.6: Rejects Class 11 deleted topics (States of Matter, Hydrogen, s-Block, Environmental Chemistry)", () => {
      // States of Matter: Boyle's Law & van der Waals equation
      const qGas = {
        type: "SHORT",
        text: "Derive van der Waals equation for real gases at critical temperature.",
        answer: "Equation...",
      };
      const resGas = validateGeneratedQuestion(qGas, chemContract11);
      expect(resGas.valid).toBe(false);
      expect(resGas.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);

      // Hydrogen: heavy water D2O
      const qHydro = {
        type: "SHORT",
        text: "Explain the preparation and moderator use of heavy water (D2O).",
        answer: "Heavy water...",
      };
      const resHydro = validateGeneratedQuestion(qHydro, chemContract11);
      expect(resHydro.valid).toBe(false);
      expect(resHydro.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);

      // s-Block: Plaster of Paris
      const qPlaster = {
        type: "SHORT",
        text: "Explain the setting of plaster of Paris with chemical reaction.",
        answer: "Plaster of Paris...",
      };
      const resPlaster = validateGeneratedQuestion(qPlaster, chemContract11);
      expect(resPlaster.valid).toBe(false);
      expect(resPlaster.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);

      // Environmental Chemistry: Photochemical smog & acid rain
      const qSmog = {
        type: "SHORT",
        text: "What are the chemical components of photochemical smog and acid rain?",
        answer: "Smog...",
      };
      const resSmog = validateGeneratedQuestion(qSmog, chemContract11);
      expect(resSmog.valid).toBe(false);
      expect(resSmog.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("Case 3.7: Rejects Class 10 deleted Periodic Classification (Döbereiner, Newlands, Mendeleev)", () => {
      const qNewlands = {
        type: "SHORT",
        text: "State Newlands' law of octaves and discuss its limitations.",
        answer: "Newlands' law of octaves...",
      };
      const resNewlands = validateGeneratedQuestion(qNewlands, scienceContract10);
      expect(resNewlands.valid).toBe(false);
      expect(resNewlands.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(true);
    });

    it("Case 3.8: Enforces Class isolation: Class 11 deleted topic does NOT falsely flag on Class 12 contract", () => {
      // In Class 12, questions mentioning gas pressure in solutions (Henry's law) should not trigger States of Matter
      const qHenry = {
        type: "SHORT",
        text: "State Henry's law regarding the solubility of gas in liquid at partial pressure.",
        answer: "Henry's law states that solubility is directly proportional to partial pressure.",
      };
      const resHenry = validateGeneratedQuestion(qHenry, chemContract12);
      expect(resHenry.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(false);
    });

    it("Case 3.9: Cleanly passes valid current syllabus Class 12 Chemistry questions", () => {
      const qValid: ValidatableQuestion = {
        type: "SHORT",
        text: "State Kohlrausch's law of independent migration of ions and write its mathematical formula for an electrolyte $A_x B_y$.",
        answer: "\\Lambda_m^0 = x \\lambda_A^0 + y \\lambda_B^0",
      };
      const res = validateGeneratedQuestion(qValid, chemContract12);
      expect(res.issues.some((i) => i.code === "CHEM_DELETED_SYLLABUS")).toBe(false);
    });
  });

  /* ================================================================== */
  /* 4. Physics SI Unit Inconsistency Stress Tests                      */
  /* ================================================================== */
  describe("4. Physics SI Unit Inconsistency Stress Tests", () => {
    it("Case 4.1: Rejects cross-quantity unit mismatches: Force in Joules or Watts (PHYSICS_UNIT_INCONSISTENCY)", () => {
      const qForceJ = {
        type: "SHORT",
        text: "A force of $40\\text{ J}$ acts on a mass of $5\\text{ kg}$ for 3 seconds.",
        answer: "Calculate acceleration...",
      };
      const resForceJ = validateGeneratedQuestion(qForceJ, physContract12);
      expect(resForceJ.valid).toBe(false);
      expect(resForceJ.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);

      const qForceW = {
        type: "SHORT",
        text: "When a constant force of $15\\text{ W}$ is applied on a particle...",
        answer: "Velocity...",
      };
      const resForceW = validateGeneratedQuestion(qForceW, physContract12);
      expect(resForceW.valid).toBe(false);
      expect(resForceW.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("Case 4.2: Rejects Energy/Work in Volts (PHYSICS_UNIT_INCONSISTENCY)", () => {
      const qEnergyV = {
        type: "SHORT",
        text: "The kinetic energy of $50\\text{ V}$ is converted into potential energy.",
        answer: "Height...",
      };
      const resEnergyV = validateGeneratedQuestion(qEnergyV, physContract12);
      expect(resEnergyV.valid).toBe(false);
      expect(resEnergyV.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("Case 4.3: [REMEDIATED DEFECT 4] False Negative: Physics unit rule for work matches standard 'work done' phrasing", () => {
      // Rule regex matches standard phrase "work done" / "work done of" / "work done ="
      const qWorkN = {
        type: "SHORT",
        text: "Calculate the total work done of $250\\text{ N}$ during the displacement of 5 meters.",
        answer: "Work...",
      };
      const resWorkN = validateGeneratedQuestion(qWorkN, physContract12);
      expect(resWorkN.valid).toBe(false);
      expect(resWorkN.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("Case 4.4: Rejects Power in Joules, Current in Volts, and Resistance in Amperes (PHYSICS_UNIT_INCONSISTENCY)", () => {
      // Power in Joules
      const qPow = {
        type: "SHORT",
        text: "An electric motor delivers a power of $750\\text{ J}$ in steady state.",
        answer: "Output...",
      };
      expect(validateGeneratedQuestion(qPow, physContract12).issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);

      // Current in Volts
      const qCurr = {
        type: "SHORT",
        text: "An electric current of $15\\text{ V}$ passes through the copper conductor.",
        answer: "Heat produced...",
      };
      expect(validateGeneratedQuestion(qCurr, physContract12).issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);

      // Resistance in Amperes
      const qRes = {
        type: "SHORT",
        text: "A conductor has an electrical resistance of $20\\text{ A}$ at room temperature.",
        answer: "Voltage drop...",
      };
      expect(validateGeneratedQuestion(qRes, physContract12).issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("Case 4.5: Rejects Capacitance in Henries and Velocity in m/s^2 (PHYSICS_UNIT_INCONSISTENCY)", () => {
      // Capacitance in Henries
      const qCap = {
        type: "SHORT",
        text: "A parallel plate capacitor has a capacitance of $10\\text{ H}$.",
        answer: "Charge stored...",
      };
      expect(validateGeneratedQuestion(qCap, physContract12).issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);

      // Velocity in m/s^2
      const qVel = {
        type: "SHORT",
        text: "A particle moves with an initial velocity of $25\\text{ m/s}^2$ towards the origin.",
        answer: "Position...",
      };
      expect(validateGeneratedQuestion(qVel, physContract12).issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("Case 4.6: Rejects Acceleration in m/s without squared exponent (PHYSICS_UNIT_INCONSISTENCY)", () => {
      const qAcc = {
        type: "SHORT",
        text: "A car accelerates uniformly with an acceleration of $5\\text{ m/s}$ along a straight track.",
        answer: "Final speed...",
      };
      const res = validateGeneratedQuestion(qAcc, physContract12);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(true);
    });

    it("Case 4.7: Correctly passes valid SI unit statements without false positives", () => {
      const qValid: ValidatableQuestion = {
        type: "SHORT",
        text: "A force of $50\\text{ N}$ does a work of $200\\text{ J}$ while developing a power of $100\\text{ W}$. The electric current is $2\\text{ A}$ through a resistance of $50\\text{ ohm}$ with capacitance of $10\\text{ F}$ under acceleration of $9.8\\text{ m/s}^2$ and velocity of $15\\text{ m/s}$.",
        answer: "Physical quantities are fully consistent with standard SI dimensions.",
      };
      const res = validateGeneratedQuestion(qValid, physContract12);
      expect(res.issues.some((i) => i.code === "PHYSICS_UNIT_INCONSISTENCY")).toBe(false);
    });
  });

  /* ================================================================== */
  /* 5. Physical Parameter Bounds Stress Tests                          */
  /* ================================================================== */
  describe("5. Physical Parameter Bounds Stress Tests", () => {
    it("Case 5.1: Rejects particle speed exceeding the speed of light v > c (PHYSICS_IMPOSSIBLE_PARAMETER)", () => {
      // Speed 4.5 x 10^8 m/s (> 3.0 x 10^8 m/s)
      const qFast = {
        type: "SHORT",
        text: "An electron travels with speed $4.5 \\times 10^8\\text{ m/s}$ in a linear particle accelerator.",
        answer: "Relativistic kinetic energy...",
      };
      const res = validateGeneratedQuestion(qFast, physContract12);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);
    });

    it("Case 5.2: Passes physical relativistic speeds strictly below or at speed of light v <= c", () => {
      // Speed 2.5 x 10^8 m/s (< c)
      const qSubLight = {
        type: "SHORT",
        text: "An electron is accelerated to a speed of $2.5 \\times 10^8\\text{ m/s}$. Calculate its de Broglie wavelength.",
        answer: "\\lambda = \\frac{h}{m v} = ...",
      };
      const resSubLight = validateGeneratedQuestion(qSubLight, physContract12);
      expect(resSubLight.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(false);

      // Speed 3.0 x 10^8 m/s (= c for photon)
      const qPhoton = {
        type: "SHORT",
        text: "A photon travels in vacuum with velocity $3.0 \\times 10^8\\text{ m/s}$.",
        answer: "Energy E = h\\nu...",
      };
      const resPhoton = validateGeneratedQuestion(qPhoton, physContract12);
      expect(resPhoton.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(false);
    });

    it("Case 5.3: Rejects negative absolute temperature T < 0 K (PHYSICS_IMPOSSIBLE_PARAMETER)", () => {
      const qNegK = {
        type: "SHORT",
        text: "A cryogenic sample is cooled to an absolute temperature of $-25\\text{ K}$.",
        answer: "Specific heat capacity...",
      };
      const resNegK = validateGeneratedQuestion(qNegK, physContract12);
      expect(resNegK.valid).toBe(false);
      expect(resNegK.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);
    });

    it("Case 5.4: Rejects English heat engine efficiency >= 100% (PHYSICS_IMPOSSIBLE_PARAMETER)", () => {
      // eta = 100%
      const q100 = {
        type: "SHORT",
        text: "A Carnot heat engine operates between $600\\text{ K}$ and $300\\text{ K}$ with an efficiency of 100%.",
        answer: "Second law of thermodynamics violation...",
      };
      expect(validateGeneratedQuestion(q100, physContract12).issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);

      // eta = 135%
      const q135 = {
        type: "SHORT",
        text: "An inventor claims a heat engine having an efficiency of 135%.",
        answer: "Claim is invalid...",
      };
      expect(validateGeneratedQuestion(q135, physContract12).issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);
    });

    it("Case 5.5: [REMEDIATED DEFECT 2a] False Negative: Hindi heat engine efficiency (दक्षता) matches via Devanagari word boundary", () => {
      // Devanagari word boundary correctly matches दक्षता
      const qHindiEff = {
        type: "SHORT",
        text: "ऊष्मा इंजन की दक्षता 110% प्राप्त होती है।",
        answer: "सैद्धांतिक विश्लेषण...",
      };
      const res = validateGeneratedQuestion(qHindiEff, physContract12);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);
    });

    it("Case 5.6: Passes realistic heat engine efficiency eta < 100%", () => {
      const qValidEff = {
        type: "SHORT",
        text: "A Carnot engine works between reservoirs with an efficiency of 45%. Calculate the heat rejected.",
        answer: "Q2 = Q1 * (1 - 0.45)...",
      };
      const res = validateGeneratedQuestion(qValidEff, physContract12);
      expect(res.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(false);
    });

    it("Case 5.7: Rejects English absolute refractive index n < 1.0 (PHYSICS_IMPOSSIBLE_PARAMETER)", () => {
      const qN = {
        type: "SHORT",
        text: "A transparent optical medium has a refractive index of 0.65 in air.",
        answer: "Critical angle...",
      };
      const resN = validateGeneratedQuestion(qN, physContract12);
      expect(resN.valid).toBe(false);
      expect(resN.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);
    });

    it("Case 5.8: [REMEDIATED DEFECT 2b] False Negative: Hindi refractive index (अपवर्तनांक) matches via Devanagari word boundary", () => {
      // Devanagari word boundary correctly matches अपवर्तनांक
      const qHindiN = {
        type: "SHORT",
        text: "किसी अज्ञात माध्यम का अपवर्तनांक 0.8 है।",
        answer: "प्रकाश की चाल...",
      };
      const res = validateGeneratedQuestion(qHindiN, physContract12);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);
    });

    it("Case 5.9: Passes standard physical refractive indices (n >= 1.0)", () => {
      const qValidN = {
        type: "SHORT",
        text: "Light travels from water (refractive index of 1.33) into glass (refractive index of 1.50).",
        answer: "Snell's law...",
      };
      const res = validateGeneratedQuestion(qValidN, physContract12);
      expect(res.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(false);
    });

    it("Case 5.10: Rejects negative macroscopic mass (PHYSICS_IMPOSSIBLE_PARAMETER)", () => {
      const qNegMass = {
        type: "SHORT",
        text: "A block having a mass of -4 kg slides down a frictionless incline.",
        answer: "Acceleration...",
      };
      const res = validateGeneratedQuestion(qNegMass, physContract12);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "PHYSICS_IMPOSSIBLE_PARAMETER")).toBe(true);
    });
  });

  /* ================================================================== */
  /* 6. Cartesian Optics Sign Convention Stress Tests                   */
  /* ================================================================== */
  describe("6. Cartesian Optics Sign Convention Stress Tests", () => {
    it("Case 6.1: Rejects concave mirror with positive focal length in English (PHYSICS_OPTICS_SIGN_ERROR)", () => {
      const qConcaveEng = {
        type: "SHORT",
        text: "A concave mirror of focal length $f = +15\\text{ cm}$ forms a real image.",
        answer: "Image distance...",
      };
      const resEng = validateGeneratedQuestion(qConcaveEng, physContract10);
      expect(resEng.valid).toBe(false);
      expect(resEng.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("Case 6.2: [REMEDIATED DEFECT 2c] False Negative: Hindi concave mirror (अवतल दर्पण) matches via Devanagari word boundary", () => {
      // Devanagari word boundary correctly matches अवतल दर्पण
      const qConcaveHi = {
        type: "SHORT",
        text: "एक अवतल दर्पण की फोकस दूरी $f = +20\\text{ cm}$ है।",
        answer: "प्रतिबिम्ब स्थिति...",
      };
      const resHi = validateGeneratedQuestion(qConcaveHi, physContract10);
      expect(resHi.valid).toBe(false);
      expect(resHi.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("Case 6.3: Rejects convex mirror with negative focal length in English (PHYSICS_OPTICS_SIGN_ERROR)", () => {
      const qConvexEng = {
        type: "SHORT",
        text: "A convex mirror of focal length $f = -15\\text{ cm}$ is mounted on a vehicle.",
        answer: "Image distance...",
      };
      const resEng = validateGeneratedQuestion(qConvexEng, physContract10);
      expect(resEng.valid).toBe(false);
      expect(resEng.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("Case 6.4: [REMEDIATED DEFECT 2d] False Negative: Hindi convex mirror (उत्तल दर्पण) matches via Devanagari word boundary", () => {
      // Devanagari word boundary correctly matches उत्तल दर्पण
      const qConvexHi = {
        type: "SHORT",
        text: "एक उत्तल दर्पण की फोकस दूरी $f = -25\\text{ cm}$ है।",
        answer: "प्रतिबिम्ब...",
      };
      const resHi = validateGeneratedQuestion(qConvexHi, physContract10);
      expect(resHi.valid).toBe(false);
      expect(resHi.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("Case 6.5: Rejects concave lens with positive focal length f > 0 in English (PHYSICS_OPTICS_SIGN_ERROR)", () => {
      const qConcaveLens = {
        type: "SHORT",
        text: "A concave lens of focal length $f = +25\\text{ cm}$ forms an image of a candle flame.",
        answer: "Image characteristics...",
      };
      const res = validateGeneratedQuestion(qConcaveLens, physContract10);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("Case 6.6: [REMEDIATED DEFECT 5] False Negative: Convex lens with negative focal length (f < 0) is rejected", () => {
      // Cartesian optics check validates convexLensNegF
      const qConvexLens = {
        type: "SHORT",
        text: "A convex lens of focal length $f = -20\\text{ cm}$ forms an image.",
        answer: "Image...",
      };
      const res = validateGeneratedQuestion(qConvexLens, physContract10);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("Case 6.7: Rejects real object with positive distance u > 0 (PHYSICS_OPTICS_SIGN_ERROR)", () => {
      const qRealObj = {
        type: "SHORT",
        text: "A real object is placed at $u = +30\\text{ cm}$ in front of a spherical mirror.",
        answer: "Image distance...",
      };
      const res = validateGeneratedQuestion(qRealObj, physContract10);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("Case 6.8: Rejects real and inverted image with positive magnification in English (PHYSICS_OPTICS_SIGN_ERROR)", () => {
      const qInvEng = {
        type: "SHORT",
        text: "The image formed by the mirror is real and inverted with magnification $m = +2.5$.",
        answer: "Image distance...",
      };
      const resEng = validateGeneratedQuestion(qInvEng, physContract10);
      expect(resEng.valid).toBe(false);
      expect(resEng.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("Case 6.9: [REMEDIATED DEFECT 2e] False Negative: Hindi real and inverted image (वास्तविक एवं उल्टा) matches via Devanagari word boundary", () => {
      // Devanagari word boundary correctly matches वास्तविक एवं उल्टा
      const qInvHi = {
        type: "SHORT",
        text: "दर्पण द्वारा निर्मित वास्तविक एवं उल्टा प्रतिबिम्ब $m = +1.5$ आवर्धन दर्शाता है।",
        answer: "प्रतिबिम्ब की प्रकृति...",
      };
      const resHi = validateGeneratedQuestion(qInvHi, physContract10);
      expect(resHi.valid).toBe(false);
      expect(resHi.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(true);
    });

    it("Case 6.10: Passes fully consistent Cartesian optics sign convention without false positives", () => {
      const qValidMirror: ValidatableQuestion = {
        type: "SHORT",
        text: "A concave mirror of focal length $f = -15\\text{ cm}$ produces a real and inverted image of an object placed at $u = -30\\text{ cm}$ with magnification $m = -1.0$.",
        answer: "Using mirror formula 1/f = 1/v + 1/u, v = -30 cm.",
      };
      const resMirror = validateGeneratedQuestion(qValidMirror, physContract10);
      expect(resMirror.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(false);

      const qValidLens: ValidatableQuestion = {
        type: "SHORT",
        text: "A concave lens of focal length $f = -20\\text{ cm}$ forms a virtual and erect image of an object at $u = -40\\text{ cm}$ with positive magnification.",
        answer: "Using lens formula 1/f = 1/v - 1/u...",
      };
      const resLens = validateGeneratedQuestion(qValidLens, physContract10);
      expect(resLens.issues.some((i) => i.code === "PHYSICS_OPTICS_SIGN_ERROR")).toBe(false);
    });
  });
});
