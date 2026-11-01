import { describe, expect, it } from "vitest";
import {
  verifyQuestionAcademicQuality,
  repairOrRegenerateQuestion,
} from "./questionVerificationEngine";
import { validatePaperCompleteness } from "./paperCompletenessEngine";
import { evaluateMPBoardStandardCompliance } from "./mpbseStandardEngine";
import { auditPaperEvidenceBased } from "./evidenceAuditEngine";
import { buildAndValidateGenerationContract } from "./curriculumContract";

describe("Major Refactoring Acceptance Suite: Multi-Subject MP Board QA Pipeline", () => {
  // =========================================================================
  // 1. SUBJECT-BY-SUBJECT QUALITY VERIFICATION (8 MANDATORY SUBJECTS)
  // =========================================================================
  describe("1. Subject Verification Coverage (8 Minimum Required Subjects)", () => {
    it("verifies Class 9 Mathematics (Number Systems / Polynomials)", () => {
      const contract = buildAndValidateGenerationContract({
        className: "Class 9",
        subject: "Mathematics",
        subjectCode: "100",
        marksEach: 1,
        questionType: "MCQ",
        slots: [
          {
            slotIndex: 0,
            chapterTitle: "Number Systems",
            marks: 1,
            curriculumSpec: {
              includedTopics: ["Irrational Numbers", "Real Numbers and their Decimal Expansions"],
              deletedTopics: ["Representation of Real Numbers on the Number Line using Successive Magnification"],
              sampleMatchPairs: [],
              keyFormulasOrConcepts: ["p/q form", "non-terminating non-recurring"],
            },
          },
        ],
      }).contract!;

      const validQuestion = {
        type: "MCQ",
        text: "Which of the following numbers has a non-terminating and non-recurring decimal expansion?",
        options: ["\\sqrt{2}", "0.25", "\\frac{3}{4}", "\\sqrt{9}"],
        answer: "\\sqrt{2}",
        explanation: "\\sqrt{2} is an irrational number, so its decimal expansion is non-terminating and non-recurring.",
        marks: 1,
        difficulty: "EASY",
      };

      const result = verifyQuestionAcademicQuality(validQuestion as any, contract);
      expect(result.status).toBe("PASS");
      expect(result.dimensions.academicCorrectness.passed).toBe(true);
      expect(result.dimensions.syllabusRelevance.passed).toBe(true);
    });

    it("verifies Class 10 Science (Chemical Reactions / Light Reflection)", () => {
      const contract = buildAndValidateGenerationContract({
        className: "Class 10",
        subject: "Science",
        subjectCode: "200",
        marksEach: 2,
        questionType: "SHORT",
        slots: [
          {
            slotIndex: 0,
            chapterTitle: "Light – Reflection and Refraction",
            marks: 2,
            curriculumSpec: {
              includedTopics: ["Reflection of Light", "Spherical Mirrors", "Mirror Formula"],
              deletedTopics: [],
              sampleMatchPairs: [],
              keyFormulasOrConcepts: ["f = R/2", "1/f = 1/v + 1/u"],
            },
          },
        ],
      }).contract!;

      const validQuestion = {
        type: "SHORT",
        text: "The radius of curvature of a spherical mirror is 20 cm. Find its focal length.",
        options: [],
        answer: "Focal length f = R/2 = 20/2 = 10 cm. The focal length is 10 cm.",
        explanation: "The focal length of a spherical mirror is half its radius of curvature.",
        marks: 2,
        difficulty: "EASY",
      };

      const result = verifyQuestionAcademicQuality(validQuestion as any, contract);
      expect(result.status).toBe("PASS");
      expect(result.dimensions.academicCorrectness.passed).toBe(true);
    });

    it("verifies Class 10 Social Science (Nationalism in India / Resources)", () => {
      const contract = buildAndValidateGenerationContract({
        className: "Class 10",
        subject: "Social Science",
        subjectCode: "300",
        marksEach: 3,
        questionType: "SHORT",
        slots: [
          {
            slotIndex: 0,
            chapterTitle: "Nationalism in India",
            marks: 3,
            curriculumSpec: {
              includedTopics: ["The First World War, Khilafat and Non-Cooperation", "Differing Strands within the Movement"],
              deletedTopics: [],
              sampleMatchPairs: [],
              keyFormulasOrConcepts: ["Rowlatt Act 1919", "Jallianwala Bagh", "Non-Cooperation Movement 1920"],
            },
          },
        ],
      }).contract!;

      const validQuestion = {
        type: "SHORT",
        text: "Explain any three reasons why Mahatma Gandhi decided to withdraw the Non-Cooperation Movement in 1922.",
        options: [],
        answer: "1. The movement turned violent in several places, notably the Chauri Chaura incident in February 1922 where 22 policemen were killed.\n2. Gandhi felt satyagrahis needed proper training before launching mass struggles.\n3. Within Congress, certain leaders wanted to participate in provincial council elections under the Government of India Act 1919.",
        explanation: "Historical reasons for the withdrawal of the Non-Cooperation Movement.",
        marks: 3,
        difficulty: "MEDIUM",
      };

      const result = verifyQuestionAcademicQuality(validQuestion as any, contract);
      expect(result.status).toBe("PASS");
      expect(result.dimensions.academicCorrectness.passed).toBe(true);
    });

    it("verifies Class 11 Physics (Units & Measurements / Motion)", () => {
      const contract = buildAndValidateGenerationContract({
        className: "Class 11",
        subject: "Physics",
        subjectCode: "210",
        marksEach: 2,
        questionType: "SHORT",
        slots: [
          {
            slotIndex: 0,
            chapterTitle: "Units and Measurements",
            marks: 2,
            curriculumSpec: {
              includedTopics: ["Dimensions of Physical Quantities", "Dimensional Formulae and Equations"],
              deletedTopics: [],
              sampleMatchPairs: [],
              keyFormulasOrConcepts: ["Dimensional homogeneity"],
            },
          },
        ],
      }).contract!;

      const validQuestion = {
        type: "SHORT",
        text: "State the principle of homogeneity of dimensions and write the dimensional formula of Universal Gravitational Constant G.",
        options: [],
        answer: "Principle: The dimensions of each term of a dimensional equation on both sides must be identical. Dimensional formula of G: [M^{-1} L^3 T^{-2}].",
        marks: 2,
        difficulty: "MEDIUM",
      };

      const result = verifyQuestionAcademicQuality(validQuestion as any, contract);
      expect(result.status).toBe("PASS");
      expect(result.dimensions.academicCorrectness.passed).toBe(true);
    });

    it("verifies Class 12 Chemistry (Electrochemistry / Chemical Kinetics)", () => {
      const contract = buildAndValidateGenerationContract({
        className: "Class 12",
        subject: "Chemistry",
        subjectCode: "220",
        marksEach: 3,
        questionType: "SHORT",
        slots: [
          {
            slotIndex: 0,
            chapterTitle: "Electrochemistry",
            marks: 3,
            curriculumSpec: {
              includedTopics: ["Electrochemical Cells", "Nernst Equation", "Kohlrausch's Law"],
              deletedTopics: ["Lead accumulator", "Fuel cells"],
              sampleMatchPairs: [],
              keyFormulasOrConcepts: ["Nernst Equation", "Ecell = E0cell - (0.059/n)log Q"],
            },
          },
        ],
      }).contract!;

      const validQuestion = {
        type: "SHORT",
        text: "State Kohlrausch's law of independent migration of ions and write its mathematical formulation.",
        options: [],
        answer: "Kohlrausch's Law states that limiting molar conductivity of an electrolyte can be represented as the sum of individual contributions of the anion and cation of the electrolyte: $\\Lambda_m^\\circ = \\nu_+ \\lambda_+^\\circ + \\nu_- \\lambda_-^\\circ$.",
        marks: 3,
        difficulty: "MEDIUM",
      };

      const result = verifyQuestionAcademicQuality(validQuestion as any, contract);
      expect(result.status).toBe("PASS");
      expect(result.dimensions.academicCorrectness.passed).toBe(true);
    });

    it("verifies Class 12 English (Flamingo / Notice & Report Writing)", () => {
      const contract = buildAndValidateGenerationContract({
        className: "Class 12",
        subject: "English",
        subjectCode: "001",
        marksEach: 4,
        questionType: "SHORT",
        language: "en",
        slots: [
          {
            slotIndex: 0,
            chapterTitle: "The Last Lesson",
            marks: 4,
            curriculumSpec: {
              includedTopics: ["Linguistic Chauvinism", "The Last Lesson summary and themes"],
              deletedTopics: [],
              sampleMatchPairs: [],
              keyFormulasOrConcepts: ["Franz", "M. Hamel", "Alsace and Lorraine"],
            },
          },
        ],
      }).contract!;

      const validQuestion = {
        type: "SHORT",
        text: "What unexpected order had been received from Berlin, and how did it affect the atmosphere in M. Hamel's school room?",
        options: [],
        answer: "An order had arrived from Berlin declaring that only German would be taught in the schools of Alsace and Lorraine. This shocked the villagers, making them realize how precious their native French language was, and filled the classroom with a solemn, reverent atmosphere.",
        marks: 4,
        difficulty: "MEDIUM",
      };

      const result = verifyQuestionAcademicQuality(validQuestion as any, contract);
      expect(result.status).toBe("PASS");
      expect(result.dimensions.languageQuality.passed).toBe(true);
    });

    it("verifies Class 12 Hindi (Aroh / Kshitij / Vitan)", () => {
      const contract = buildAndValidateGenerationContract({
        className: "Class 12",
        subject: "Hindi",
        subjectCode: "051",
        marksEach: 3,
        questionType: "SHORT",
        language: "hi",
        slots: [
          {
            slotIndex: 0,
            chapterTitle: "भक्तिन",
            marks: 3,
            curriculumSpec: {
              includedTopics: ["भक्तिन का चरित्र चित्रण", "महादेवी वर्मा"],
              deletedTopics: [],
              sampleMatchPairs: [],
              keyFormulasOrConcepts: ["भक्तिन की निष्ठा"],
            },
          },
        ],
      }).contract!;

      const validQuestion = {
        type: "SHORT",
        text: "भक्तिन अपना वास्तविक नाम किसी को क्यों नहीं बताना चाहती थी? लेखिका ने उसे यह नाम क्यों दिया?",
        options: [],
        answer: "भक्तिन का वास्तविक नाम 'लछमिन' (लक्ष्मी) था जिसका अर्थ धन की देवी होता है। उसका जीवन निर्धनता और संघर्षों से भरा था, अतः वह अपने नाम और स्थिति के विरोधाभास के कारण यह नाम छिपाना चाहती थी। लेखिका ने उसके गले में कंठी माला और सादगी देखकर उसे 'भक्तिन' नाम दिया।",
        marks: 3,
        difficulty: "MEDIUM",
      };

      const result = verifyQuestionAcademicQuality(validQuestion as any, contract);
      expect(result.status).toBe("PASS");
      expect(result.dimensions.languageQuality.passed).toBe(true);
    });

    it("verifies Class 10 Sanskrit (Shemushi / Paninian Grammar)", () => {
      const contract = buildAndValidateGenerationContract({
        className: "Class 10",
        subject: "Sanskrit",
        subjectCode: "122",
        marksEach: 2,
        questionType: "SHORT",
        language: "sa",
        slots: [
          {
            slotIndex: 0,
            chapterTitle: "शुचिपर्यावरणम्",
            marks: 2,
            curriculumSpec: {
              includedTopics: ["पर्यावरण संरक्षणम्", "संधि-प्रत्ययः"],
              deletedTopics: [],
              sampleMatchPairs: [],
              keyFormulasOrConcepts: ["शुचि पर्यावरणम्"],
            },
          },
        ],
      }).contract!;

      const validQuestion = {
        type: "SHORT",
        text: "कविः किमर्थं प्रकृतेः शरणम् इच्छति?",
        options: [],
        answer: "नगरेषु जीवनं दुर्वहं जातम्, अतः कविः शुचिपर्यावरणाय प्रकृतेः शरणम् इच्छति।",
        marks: 2,
        difficulty: "MEDIUM",
      };

      const result = verifyQuestionAcademicQuality(validQuestion as any, contract);
      expect(result.status).toBe("PASS");
      expect(result.dimensions.languageQuality.passed).toBe(true);
    });
  });

  // =========================================================================
  // 2. DELIBERATELY DEFECTIVE QUESTIONS TESTS (10 DEFECT CATEGORIES)
  // =========================================================================
  describe("2. Forensic Defect Detection & Repair Verification", () => {
    const dummyContract = buildAndValidateGenerationContract({
      className: "Class 10",
      subject: "Science",
      subjectCode: "200",
      marksEach: 2,
      questionType: "MCQ",
      slots: [{ slotIndex: 0, chapterTitle: "Chemical Reactions", marks: 2 }],
    }).contract!;

    it("detects Defect 1: Incorrect numerical answers / invalid calculation", () => {
      const defective = {
        type: "SHORT",
        text: "Solve: If a car travels 100 meters in 5 seconds, what is its speed?",
        options: [],
        answer: "Speed = Distance / Time = 100 / 5 = 50 m/s.", // Wrong: 100 / 5 = 20
        marks: 2,
      };
      const res = verifyQuestionAcademicQuality(defective as any, dummyContract);
      expect(res.status).toBe("FAIL");
      expect(res.dimensions.academicCorrectness.passed).toBe(false);
      expect(res.allIssues.some((i) => i.code.includes("CALCULATION"))).toBe(true);
    });

    it("detects Defect 2: Incomplete question statements", () => {
      const defective = {
        type: "SHORT",
        text: "What?", // Empty / incomplete statement
        options: [],
        answer: "None",
        marks: 2,
      };
      const res = verifyQuestionAcademicQuality(defective as any, dummyContract);
      expect(res.status).toBe("FAIL");
      expect(res.dimensions.completeness.passed).toBe(false);
    });

    it("detects Defect 3: Missing MCQ options (< 4 options)", () => {
      const defective = {
        type: "MCQ",
        text: "Which of the following is a noble gas?",
        options: ["Helium", "Oxygen"], // only 2 options
        answer: "Helium",
        marks: 1,
      };
      const res = verifyQuestionAcademicQuality(defective as any, dummyContract);
      expect(res.status).toBe("FAIL");
      expect(res.dimensions.completeness.passed).toBe(false);
    });

    it("detects Defect 4: Ambiguous questions with duplicate options", () => {
      const defective = {
        type: "MCQ",
        text: "The powerhouse of the cell is:",
        options: ["Mitochondria", "Ribosome", "Mitochondria", "Nucleus"], // Duplicate!
        answer: "Mitochondria",
        marks: 1,
      };
      const res = verifyQuestionAcademicQuality(defective as any, dummyContract);
      expect(res.status).toBe("FAIL");
      expect(res.dimensions.completeness.passed).toBe(false);
    });

    it("detects Defect 5: Questions outside syllabus / deleted topics", () => {
      const mathContract = buildAndValidateGenerationContract({
        className: "Class 10",
        subject: "Mathematics",
        subjectCode: "100",
        marksEach: 2,
        questionType: "SHORT",
        slots: [
          {
            slotIndex: 0,
            chapterTitle: "Real Numbers",
            marks: 2,
            curriculumSpec: {
              includedTopics: ["Fundamental Theorem of Arithmetic"],
              deletedTopics: ["Euclid's Division Lemma"],
              sampleMatchPairs: [],
              keyFormulasOrConcepts: [],
            },
          },
        ],
      }).contract!;

      const defective = {
        type: "SHORT",
        text: "Use Euclid's Division Lemma to show that the square of any positive integer is of the form 3m or 3m+1.",
        options: [],
        answer: "By Euclid's division lemma, a = bq + r...",
        marks: 2,
      };

      const res = verifyQuestionAcademicQuality(defective as any, mathContract);
      expect(res.status).toBe("FAIL");
      expect(res.dimensions.syllabusRelevance.passed).toBe(false);
    });

    it("detects Defect 6: Incorrectly allocated subpart marks", () => {
      const defective = {
        type: "CASE_STUDY",
        text: "Read the case study and answer:",
        options: [],
        subparts: [
          { label: "(i)", text: "Part 1", marks: 1 },
          { label: "(ii)", text: "Part 2", marks: 1 },
        ], // Sum is 2 marks, but question marks is 4!
        marks: 4,
        answer: "Answers",
      };

      const res = verifyQuestionAcademicQuality(defective as any, dummyContract);
      expect(res.status).toBe("FAIL");
      expect(res.dimensions.marksSuitability.passed).toBe(false);
    });

    it("detects Defect 7: Duplicate questions testing identical problem", () => {
      const defective = {
        type: "SHORT",
        text: "What is the speed of light in vacuum?",
        options: [],
        answer: "3 x 10^8 m/s",
        marks: 2,
      };

      const res = verifyQuestionAcademicQuality(defective as any, dummyContract, {
        existingQuestionTexts: ["What is the speed of light in vacuum?"],
      });

      expect(res.status).toBe("FAIL");
      expect(res.dimensions.duplication.passed).toBe(false);
    });

    it("detects Defect 8: Missing diagrams or passages (dangling references)", () => {
      const defective = {
        type: "SHORT",
        text: "Study the circuit diagram shown below and calculate total resistance.", // No diagram attached!
        options: [],
        answer: "R = 10 ohms",
        marks: 2,
      };

      const res = verifyQuestionAcademicQuality(defective as any, dummyContract);
      expect(res.status).toBe("FAIL");
      expect(res.dimensions.completeness.passed).toBe(false);
    });

    it("detects Defect 9: Incorrect answer keys (declared answer not in options)", () => {
      const defective = {
        type: "MCQ",
        text: "Which planet is known as the Red Planet?",
        options: ["Venus", "Earth", "Jupiter", "Saturn"],
        answer: "Mars", // Mars is not in options!
        marks: 1,
      };

      const res = verifyQuestionAcademicQuality(defective as any, dummyContract);
      expect(res.status).toBe("FAIL");
      expect(res.dimensions.answerability.passed).toBe(false);
    });

    it("detects Defect 10: Structurally incomplete papers and marks discrepancy", () => {
      const incompletePaper = {
        blueprint: {
          totalMarks: 75,
          sections: [
            { id: "sec1", title: "Sec 1", type: "MCQ", count: 10, marksEach: 1 },
            { id: "sec2", title: "Sec 2", type: "SHORT", count: 5, marksEach: 2 },
          ],
        },
        items: [
          // Only 1 question provided instead of 15!
          {
            question: { type: "MCQ", text: "Q1", options: ["A", "B", "C", "D"], answer: "A", marks: 1 },
            sectionId: "sec1",
            position: 0,
          },
        ],
      };

      const res = validatePaperCompleteness(incompletePaper as any);
      expect(res.status).toBe("FAIL");
      expect(res.marksValidation.passed).toBe(false);
      expect(res.structuralCompleteness.passed).toBe(false);
    });
  });

  // =========================================================================
  // 3. ZERO FALSE POSITIVE AUDIT VERIFICATION (CLEAN PAPER RETURNS PASS)
  // =========================================================================
  describe("3. Zero False Positive Audit Guarantee", () => {
    it("strictly returns status PASS with 0 issues for an immaculate MP Board paper", async () => {
      const cleanPaper = {
        paperTitle: "Class 10 Science Annual Examination",
        className: "Class 10",
        subject: "Science",
        subjectCode: "200",
        totalMarks: 75,
        questions: [
          {
            id: "q1",
            number: 1,
            sectionTitle: "Section A (Objective)",
            type: "MCQ",
            text: "Which of the following is a displacement reaction?",
            options: [
              "\\text{Fe} + \\text{CuSO}_4 \\rightarrow \\text{FeSO}_4 + \\text{Cu}",
              "\\text{CaO} + \\text{H}_2\\text{O} \\rightarrow \\text{Ca(OH)}_2",
              "2\\text{H}_2 + \\text{O}_2 \\rightarrow 2\\text{H}_2\\text{O}",
              "\\text{CaCO}_3 \\rightarrow \\text{CaO} + \\text{CO}_2",
            ],
            answer: "\\text{Fe} + \\text{CuSO}_4 \\rightarrow \\text{FeSO}_4 + \\text{Cu}",
            explanation: "Iron displaces copper from copper sulfate solution because iron is more reactive than copper.",
            marks: 1,
            difficulty: "EASY",
          },
          {
            id: "q2",
            number: 2,
            sectionTitle: "Section A (Objective)",
            type: "MCQ",
            text: "The resistance of a conductor is inversely proportional to its:",
            options: ["area of cross-section", "length", "temperature", "resistivity"],
            answer: "area of cross-section",
            explanation: "R = \\rho * L / A, which shows that resistance R is inversely proportional to area A.",
            marks: 1,
            difficulty: "MEDIUM",
          },
        ],
      };

      const audit = await auditPaperEvidenceBased(cleanPaper);
      expect(audit.status).toBe("PASS");
      expect(audit.findings).toHaveLength(0);
      expect(audit.overallVerdict).toContain("PASS");
    });
  });
});
