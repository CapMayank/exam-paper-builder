import { describe, expect, it } from "vitest";
import { detectPaperLanguage } from "./constants";
import {
  buildAndValidateGenerationContract,
  cleanChapterTitleForLookup,
  generateCurriculumGroundedSectionQuestions,
  getChapterCurriculumSpec,
  resolveBoardAndSubjectCode,
} from "./curriculumContract";
import { generatePaperSectionWithGemini, generateQuestionsWithGemini } from "./gemini";
import { getRecentGenerationTraces } from "./generationObservability";
import {
  computeDisplayedPaperNumbering,
  reconcileSectionGroupInstruction,
  resolveGroupedExerciseInstruction,
} from "./layout";
import { parseGeminiJsonWithLatexSafety, parseMathSegments, repairLatex } from "./math";
import {
  isQuestionContaminated,
  validateGeneratedQuestion,
  validateGeneratedSection,
} from "./questionValidator";

describe("MPBSE Class 12 Mathematics Regression & Subject Integrity Suite", () => {
  const MPBSE_MATH_CHAPTERS = [
    { id: "ch-1", number: 1, title: "Relations and Functions / संबंध एवं फलन" },
    { id: "ch-2", number: 2, title: "Inverse Trigonometric Functions / प्रतिलोम त्रिकोणमितीय फलन" },
    { id: "ch-3", number: 3, title: "Matrices / आव्यूह" },
    { id: "ch-4", number: 4, title: "Determinants / सारणिक" },
    { id: "ch-5", number: 5, title: "Continuity and Differentiability / सांतत्य तथा अवकलनीयता" },
    { id: "ch-6", number: 6, title: "Application of Derivatives / अवकलज के अनुप्रयोग" },
    { id: "ch-7", number: 7, title: "Integrals / समाकलन" },
    { id: "ch-8", number: 8, title: "Application of Integrals / समाकलनों के अनुप्रयोग" },
    { id: "ch-9", number: 9, title: "Differential Equations / अवकल समीकरण" },
    { id: "ch-10", number: 10, title: "Vector Algebra / सदिश बीजगणित" },
    { id: "ch-11", number: 11, title: "Three Dimensional Geometry / त्रि-विमीय ज्यामिति" },
    { id: "ch-12", number: 12, title: "Linear Programming / रैखिक प्रोग्रामन" },
    { id: "ch-13", number: 13, title: "Probability / प्रायिकता" },
  ];

  describe("1. Primary Regression Fixture: Class 12 Mathematics (Half Yearly 2026–27, 80 Marks)", () => {
    it("generates all 8 sections (80 marks) of MPBSE Class 12 Mathematics with zero Biology/Chemistry/template contamination", async () => {
      const prevKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = "";
      try {
        const validChapterIds = new Set(MPBSE_MATH_CHAPTERS.map((c) => c.id));
        const sectionsConfig = [
          {
            title: "Section A",
            type: "MCQ",
            marksEach: 1,
            slots: MPBSE_MATH_CHAPTERS.slice(0, 6).map((c, idx) => ({
              slotIndex: idx,
              chapterId: c.id,
              chapterNumber: c.number,
              chapterTitle: c.title,
              marks: 1,
            })),
          },
          {
            title: "Section A",
            type: "FILL_BLANK",
            marksEach: 1,
            slots: MPBSE_MATH_CHAPTERS.slice(1, 7).map((c, idx) => ({
              slotIndex: idx,
              chapterId: c.id,
              chapterNumber: c.number,
              chapterTitle: c.title,
              marks: 1,
            })),
          },
          {
            title: "Section A",
            type: "TRUE_FALSE",
            marksEach: 1,
            slots: MPBSE_MATH_CHAPTERS.slice(2, 8).map((c, idx) => ({
              slotIndex: idx,
              chapterId: c.id,
              chapterNumber: c.number,
              chapterTitle: c.title,
              marks: 1,
            })),
          },
          {
            title: "Section A",
            type: "MATCH_COLUMN",
            marksEach: 1,
            slots: MPBSE_MATH_CHAPTERS.slice(0, 7).map((c, idx) => ({
              slotIndex: idx,
              chapterId: c.id,
              chapterNumber: c.number,
              chapterTitle: c.title,
              marks: 1,
            })),
          },
          {
            title: "Section A",
            type: "VERY_SHORT",
            marksEach: 1,
            slots: MPBSE_MATH_CHAPTERS.slice(6, 12).map((c, idx) => ({
              slotIndex: idx,
              chapterId: c.id,
              chapterNumber: c.number,
              chapterTitle: c.title,
              marks: 1,
            })),
          },
          {
            title: "Section B",
            type: "SHORT",
            marksEach: 2,
            slots: Array.from({ length: 12 }, (_, idx) => {
              const c = MPBSE_MATH_CHAPTERS[idx % MPBSE_MATH_CHAPTERS.length];
              return {
                slotIndex: idx,
                chapterId: c.id,
                chapterNumber: c.number,
                chapterTitle: c.title,
                marks: 2,
              };
            }),
          },
          {
            title: "Section C",
            type: "SHORT",
            marksEach: 3,
            slots: [
              MPBSE_MATH_CHAPTERS[0],
              MPBSE_MATH_CHAPTERS[2],
              MPBSE_MATH_CHAPTERS[5],
              MPBSE_MATH_CHAPTERS[10],
            ].map((c, idx) => ({
              slotIndex: idx,
              chapterId: c.id,
              chapterNumber: c.number,
              chapterTitle: c.title,
              marks: 3,
            })),
          },
          {
            title: "Section D",
            type: "LONG",
            marksEach: 4,
            slots: [
              MPBSE_MATH_CHAPTERS[3],
              MPBSE_MATH_CHAPTERS[6],
              MPBSE_MATH_CHAPTERS[8],
              MPBSE_MATH_CHAPTERS[12],
            ].map((c, idx) => ({
              slotIndex: idx,
              chapterId: c.id,
              chapterNumber: c.number,
              chapterTitle: c.title,
              marks: 4,
            })),
          },
        ];

        const existingTexts: string[] = [];
        for (const sec of sectionsConfig) {
          const res = await generatePaperSectionWithGemini({
            className: "Class 12",
            subject: "Mathematics / गणित",
            sectionTitle: sec.title,
            sectionType: sec.type,
            marksEach: sec.marksEach,
            language: "en",
            difficulty: "BALANCED",
            generateDiagrams: true,
            schoolName: "Sarvodaya Higher Secondary School, Lakhnadon",
            blueprintName: "MP Board Class 12 Mathematics Blueprint 2026–27",
            academicSession: "2026–27",
            examType: "HALF_YEARLY",
            validBookChapterIds: validChapterIds,
            existingQuestionTexts: existingTexts,
            slots: sec.slots,
          });

          expect(res.success, `Section ${sec.title} (${sec.type}) failed: ${res.error}`).toBe(true);
          expect(res.data).toBeDefined();
          expect(res.contract?.board).toBe("MPBSE");
          expect(res.contract?.subjectCode).toBe("150");
          expect(res.contract?.canonicalSubject).toBe("Mathematics");

          const questions = res.data!;
          if (sec.type === "MATCH_COLUMN") {
            expect(questions.length).toBe(1);
            expect(questions[0].options.length).toBe(7);
          } else {
            expect(questions.length).toBe(sec.slots.length);
          }

          for (const q of questions) {
            // 1. Must NOT be contaminated by Biology, Chemistry, generic templates, or Class 10 right-triangle override
            const contam = isQuestionContaminated(q, "Mathematics", "Class 12");
            expect(contam.contaminated, `Contaminated question: ${q.text} (${contam.reason})`).toBe(false);

            expect(q.text).not.toMatch(/Examine the fundamental principles of/i);
            expect(q.text).not.toMatch(/biological\/scientific significance/i);
            expect(q.text).not.toMatch(/right-angled triangle ABC right-angled at B with base BC = 8 cm/i);
            expect(q.options.join(" ")).not.toMatch(
              /physiological|enzymatic|abiotic|cellular metabolism|homeostasis/i
            );

            // 2. For MCQs, answer must match one of the 4 options
            if (sec.type === "MCQ") {
              expect(q.options.length).toBe(4);
              const normAns = q.answer.trim().toLowerCase();
              const matchesOption = q.options.some((o) => o.trim().toLowerCase() === normAns);
              expect(matchesOption, `MCQ answer "${q.answer}" not in options ${JSON.stringify(q.options)}`).toBe(
                true
              );
            }

            // 3. Must NOT contain ASCII control-character corruption from unescaped JSON
            expect(q.text).not.toMatch(/[\x08\x0c]/);
            expect(q.answer).not.toMatch(/[\x08\x0c]/);

            existingTexts.push(q.text);
          }
        }

        // Verify observability traces were recorded
        const traces = getRecentGenerationTraces();
        expect(traces.length).toBeGreaterThanOrEqual(8);
        expect(traces[0].board).toBe("MPBSE");
        expect(traces[0].subjectCode).toBe("150");
      } finally {
        process.env.GEMINI_API_KEY = prevKey;
      }
    });
  });

  describe("2. Subject-Aware Question Validation & Negative Tests", () => {
    const mathContract = buildAndValidateGenerationContract({
      className: "Class 12",
      subject: "Mathematics",
      schoolName: "Sarvodaya Higher Secondary School, Lakhnadon",
      blueprintName: "MP Board Class 12 Mathematics",
      academicSession: "2026–27",
      sectionTitle: "Section A",
      sectionType: "MCQ",
      marksEach: 1,
      language: "en",
      difficulty: "BALANCED",
      slots: [
        {
          slotIndex: 0,
          chapterId: "ch-3",
          chapterNumber: 3,
          chapterTitle: "Matrices",
          marks: 1,
        },
      ],
    });

    it("rejects Biology cellular metabolism MCQ options injected into Mathematics", () => {
      const badQuestion = {
        slotIndex: 0,
        chapterId: "ch-3",
        chapterNumber: 3,
        chapterTitle: "Matrices",
        type: "MCQ",
        text: "If A is an invertible matrix of order 2, then det(A^{-1}) is equal to:",
        options: [
          "A process driven by physiological pathways in Matrices",
          "A mechanism requiring direct energy investment and enzymatic involvement",
          "A phenomenon occurring exclusively in non-living abiotic systems",
          "A reversible reaction independent of cellular metabolism",
        ],
        answer: "1 / det(A)",
      };

      const result = validateGeneratedQuestion(badQuestion, mathContract.contract!);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "CROSS_SUBJECT_CONTAMINATION")).toBe(true);
      expect(result.issues.some((i) => i.code === "ANSWER_OPTION_MISMATCH")).toBe(true);
    });

    it("rejects generic 'Examine the fundamental principles of [chapter]' template across all subjects", () => {
      const genericQuestion = {
        slotIndex: 0,
        chapterId: "ch-3",
        chapterNumber: 3,
        chapterTitle: "Matrices",
        type: "SHORT",
        text: "Examine the fundamental principles of Matrices. Describe the core mechanisms and their biological/scientific significance in standard board curriculum context.",
        options: [],
        answer: "Key Concept: Matrices principle and definition.",
      };

      for (const subj of ["Mathematics", "Physics", "Chemistry", "Biology", "English", "History", "Accountancy"]) {
        const contam = isQuestionContaminated(genericQuestion, subj, "Class 12");
        expect(contam.contaminated).toBe(true);
      }
    });

    it("rejects Class 10 right-triangle geometry override in Class 12 Mathematics", () => {
      const triangleOverride = {
        slotIndex: 0,
        chapterId: "ch-6",
        chapterNumber: 6,
        chapterTitle: "Application of Derivatives",
        type: "SHORT",
        text: "Consider a right-angled triangle ABC right-angled at B with base BC = 8 cm and perpendicular AB = 6 cm (Application of Derivatives). Refer to the given figure and find the length of hypotenuse AC.",
        options: [],
        answer: "10 cm",
      };

      const contam = isQuestionContaminated(triangleOverride, "Mathematics", "Class 12");
      expect(contam.contaminated).toBe(true);
      expect(contam.reason).toContain("Class 10 right-triangle");
    });

    it("rejects Chemistry PbI2 / AgCl / quicklime template injected into Mathematics, Physics, or Biology", () => {
      const chemTemplate = {
        slotIndex: 0,
        chapterId: "ch-1",
        chapterNumber: 1,
        chapterTitle: "Relations and Functions",
        type: "MCQ",
        text: "Regarding Relations and Functions: Which of the following observations correctly identifies that a chemical reaction has taken place when potassium iodide solution is added to lead(II) nitrate solution?",
        options: [
          "Formation of a yellow precipitate of lead(II) iodide (PbI₂)",
          "Evolution of colourless, odourless hydrogen gas",
          "Change of solution colour from blue to pale green",
          "Absorption of heat with no visible precipitate formation",
        ],
        answer: "Formation of a yellow precipitate of lead(II) iodide (PbI₂)",
      };

      expect(isQuestionContaminated(chemTemplate, "Mathematics", "Class 12").contaminated).toBe(true);
      expect(isQuestionContaminated(chemTemplate, "Physics", "Class 12").contaminated).toBe(true);
      expect(isQuestionContaminated(chemTemplate, "Biology", "Class 12").contaminated).toBe(true);
    });

    it("rejects deleted syllabus topics in Class 12 Mathematics (2026–27)", () => {
      const deletedTopicQuestion = {
        slotIndex: 0,
        chapterId: "ch-3",
        chapterNumber: 3,
        chapterTitle: "Matrices",
        type: "LONG",
        text: "Find the inverse of the matrix A = [[1, 2], [3, 7]] by using elementary row operations.",
        options: [],
        answer: "A^{-1} = [[7, -2], [-3, 1]]",
      };

      const longContract = buildAndValidateGenerationContract({
        className: "Class 12",
        subject: "Mathematics",
        academicSession: "2026–27",
        sectionTitle: "Section D",
        sectionType: "LONG",
        marksEach: 4,
        language: "en",
        difficulty: "BALANCED",
        slots: [{ slotIndex: 0, chapterId: "ch-3", chapterNumber: 3, chapterTitle: "Matrices", marks: 4 }],
      });

      const res = validateGeneratedQuestion(deletedTopicQuestion, longContract.contract!);
      expect(res.valid).toBe(false);
      expect(res.issues.some((i) => i.code === "DELETED_SYLLABUS_TOPIC")).toBe(true);
    });

    it("rejects cross-subject chapter titles in buildAndValidateGenerationContract", () => {
      const contractRes = buildAndValidateGenerationContract({
        className: "Class 12",
        subject: "Mathematics",
        sectionTitle: "Section A",
        sectionType: "MCQ",
        marksEach: 1,
        language: "en",
        difficulty: "BALANCED",
        slots: [
          {
            slotIndex: 0,
            chapterId: "bio-ch-1",
            chapterNumber: 1,
            chapterTitle: "Sexual Reproduction in Flowering Plants",
            marks: 1,
          },
        ],
      });
      expect(contractRes.valid).toBe(false);
      expect(contractRes.errors.join(" ")).toMatch(/belongs to "Biology", not "Mathematics"/i);
    });
  });

  describe("3. LaTeX JSON Escape Safety & Control-Character Repair", () => {
    it("safely parses raw LLM JSON containing single-backslash LaTeX commands without corrupting \\frac, \\beta, \\tan, \\right, \\neq", () => {
      const rawGeminiOutput = JSON.stringify([
        {
          slotIndex: 0,
          text: "Evaluate $\\int \\frac{\\sin x + \\cos x}{\\sqrt{1 + \\sin 2x}}\\,dx$ and $\\tan^{-1}(\\sqrt{3}) - \\sec^{-1}(-2)$ where $\\beta \\neq 0$ and $\\left| \\vec{a} \\right| = 1$.",
          options: ["$-\\frac{\\pi}{3}$", "$\\frac{\\pi}{3}$", "$\\frac{2\\pi}{3}$", "$\\frac{\\pi}{6}$"],
          answer: "$-\\frac{\\pi}{3}$",
        },
      ]).replace(/\\\\/g, "\\"); // Simulate LLM outputting single backslashes inside JSON strings!

      const parsed = parseGeminiJsonWithLatexSafety<Array<{ text: string; options: string[]; answer: string }>>(
        rawGeminiOutput
      );
      expect(parsed.length).toBe(1);
      expect(parsed[0].text).toContain("\\frac{\\sin x + \\cos x}{\\sqrt{1 + \\sin 2x}}");
      expect(parsed[0].text).toContain("\\tan^{-1}");
      expect(parsed[0].text).toContain("\\beta \\neq 0");
      expect(parsed[0].text).toContain("\\right|");
      expect(parsed[0].text).not.toMatch(/[\x08\x0c]/);
    });

    it("repairs legacy control-character corrupted strings (\\x0crac -> \\frac, \\x08eta -> \\beta)", () => {
      const legacyCorrupted = "Evaluate $\x0crac{dy}{dx} + \x08eta y = \tan x$";
      const repaired = repairLatex(legacyCorrupted);
      expect(repaired).toContain("\\frac{dy}{dx}");
      expect(repaired).toContain("\\beta");
      expect(repaired).toContain("\\tan");

      const segments = parseMathSegments(legacyCorrupted);
      const mathSeg = segments.find((s) => s.type === "math");
      expect(mathSeg && mathSeg.type === "math" ? mathSeg.tex : "").toContain("\\frac{dy}{dx}");
    });
  });

  describe("4. Board, Subject Code, Language, Numbering & Section Instruction Reconciliation", () => {
    it("resolves MPBSE vs CBSE subject codes accurately and prevents CBSE 041 / 086 leakage", () => {
      const mpbseMath = resolveBoardAndSubjectCode({
        subject: "Mathematics / गणित",
        className: "Class 12",
        explicitSubjectCode: "041", // Leaked CBSE default
        schoolName: "Sarvodaya Higher Secondary School, Lakhnadon",
        blueprintName: "Class 12 Mathematics Half Yearly",
        academicSession: "2026–27",
      });
      expect(mpbseMath.board).toBe("MPBSE");
      expect(mpbseMath.subjectCode).toBe("150");

      const cbseMath = resolveBoardAndSubjectCode({
        subject: "Mathematics",
        className: "Class 12",
        explicitSubjectCode: "041",
        schoolName: "Delhi Public School",
        blueprintName: "CBSE Class 12 Mathematics",
      });
      expect(cbseMath.board).toBe("CBSE");
      expect(cbseMath.subjectCode).toBe("041");

      const mpbsePhysics = resolveBoardAndSubjectCode({
        subject: "Physics",
        className: "Class 12",
        explicitSubjectCode: "086", // Leaked Class 10 Science code
        schoolName: "Sarvodaya Higher Secondary School, Lakhnadon",
      });
      expect(mpbsePhysics.board).toBe("MPBSE");
      expect(mpbsePhysics.subjectCode).toBe("210");
    });

    it("does not misclassify an English paper with bilingual book subject ('Mathematics / गणित') as bilingual", () => {
      const lang = detectPaperLanguage(
        {
          title: "Class 12 Mathematics Half Yearly Examination",
          generalInstructions: "1. All questions are compulsory.",
          blueprint: {
            book: { subject: "Mathematics / गणित" },
            sections: [{ title: "Section A", instructions: "Question Nos. 1 to 5 are objective questions." }],
          },
        },
        [
          {
            question: {
              text: "Let R be a relation on set Z defined by aRb if and only if a - b is divisible by 5.",
              options: ["Reflexive only", "Equivalence relation", "Symmetric only", "Transitive only"],
            },
          },
        ]
      );
      expect(lang).toBe("en");
    });

    it("computes displayed paper numbering (34 displayed vs 44 raw items) and reconciles section instructions", () => {
      const sections = [
        { id: "s1", title: "Section A", type: "MCQ", order: 1 },
        { id: "s2", title: "Section A", type: "FILL_BLANK", order: 2 },
        { id: "s3", title: "Section A", type: "TRUE_FALSE", order: 3 },
        { id: "s4", title: "Section A", type: "MATCH_COLUMN", order: 4 },
        { id: "s5", title: "Section A", type: "VERY_SHORT", order: 5 },
        { id: "s6", title: "Section B", type: "SHORT", order: 6 },
        { id: "s7", title: "Section C", type: "SHORT", order: 7 },
        { id: "s8", title: "Section D", type: "LONG", order: 8 },
      ];
      const items = [
        ...Array.from({ length: 6 }, (_, i) => ({ id: `mcq-${i}`, sectionId: "s1", position: i })),
        ...Array.from({ length: 6 }, (_, i) => ({ id: `fb-${i}`, sectionId: "s2", position: i })),
        ...Array.from({ length: 6 }, (_, i) => ({ id: `tf-${i}`, sectionId: "s3", position: i })),
        { id: "mc-0", sectionId: "s4", position: 0 },
        ...Array.from({ length: 5 }, (_, i) => ({ id: `vsa-${i}`, sectionId: "s5", position: i })),
        ...Array.from({ length: 12 }, (_, i) => ({ id: `sb-${i}`, sectionId: "s6", position: i })),
        ...Array.from({ length: 4 }, (_, i) => ({ id: `sc-${i}`, sectionId: "s7", position: i })),
        ...Array.from({ length: 4 }, (_, i) => ({ id: `sd-${i}`, sectionId: "s8", position: i })),
      ];

      const numbering = computeDisplayedPaperNumbering(sections, items, "CONTINUOUS");
      expect(numbering.totalRawItems).toBe(44);
      expect(numbering.totalDisplayedQuestions).toBe(34);
      expect(numbering.hasGroupedSubItems).toBe(true);

      // Q7 (a)..(f) for Fill in the Blanks, Q8 (a)..(f) for True/False
      expect(numbering.itemNumbers["fb-0"].displayLabel).toBe("7 (a)");
      expect(numbering.itemNumbers["fb-5"].displayLabel).toBe("7 (f)");
      expect(numbering.itemNumbers["tf-0"].displayLabel).toBe("8 (a)");
      expect(numbering.itemNumbers["mc-0"].displayLabel).toBe("9");
      expect(numbering.itemNumbers["vsa-0"].displayLabel).toBe("10");
      expect(numbering.itemNumbers["vsa-4"].displayLabel).toBe("14");
      expect(numbering.itemNumbers["sb-0"].displayLabel).toBe("15");
      expect(numbering.itemNumbers["sb-11"].displayLabel).toBe("26");
      expect(numbering.itemNumbers["sc-0"].displayLabel).toBe("27");
      expect(numbering.itemNumbers["sc-3"].displayLabel).toBe("30");
      expect(numbering.itemNumbers["sd-0"].displayLabel).toBe("31");
      expect(numbering.itemNumbers["sd-3"].displayLabel).toBe("34");

      // Reconcile Section B, C, D instructions with actual displayed ranges
      const secBRange = numbering.sectionRanges["s6"];
      expect(
        reconcileSectionGroupInstruction(
          "Question Nos. 6 to 17 are Short Answer Type questions. Each carries 2 marks.",
          secBRange.groupStartQ,
          secBRange.groupEndQ
        )
      ).toBe("Question Nos. 15 to 26 are Short Answer Type questions. Each carries 2 marks.");

      // Grouped exercise prompt must NOT repeat the Section A overview instruction
      const q7Prompt = resolveGroupedExerciseInstruction(
        "Question Nos. 1 to 5: Total 32 objective-type questions (1 mark each).",
        "FILL_BLANK",
        true,
        "en"
      );
      expect(q7Prompt).toBe("Fill in the blanks with appropriate words:");
    });
  });

  describe("5. Multi-Subject Generation Verification", () => {
    it.each([
      { subject: "Physics", className: "Class 12", chapter: "Electrostatic Potential and Capacitance" },
      { subject: "Chemistry", className: "Class 12", chapter: "Electrochemistry" },
      { subject: "Biology", className: "Class 12", chapter: "Principles of Inheritance and Variation" },
      { subject: "Science", className: "Class 10", chapter: "Light – Reflection and Refraction" },
      { subject: "English", className: "Class 12", chapter: "The Last Lesson" },
      { subject: "Hindi", className: "Class 12", chapter: "आत्मपरिचय" },
      { subject: "History", className: "Class 12", chapter: "Bricks, Beads and Bones" },
      { subject: "Accountancy", className: "Class 12", chapter: "Accounting for Partnership: Basic Concepts" },
    ])("generates valid, non-contaminated questions for $className $subject ($chapter)", async ({ subject, className, chapter }) => {
      const prevKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = "";
      try {
        const res = await generateQuestionsWithGemini({
          className,
          subject,
          chapter,
          type: "MCQ",
          difficulty: "MEDIUM",
          count: 2,
          marks: 1,
          language: subject === "Hindi" ? "hi" : "en",
        });
        expect(res.success).toBe(true);
        expect(res.data?.length).toBe(2);
        for (const q of res.data!) {
          const contam = isQuestionContaminated(q, subject, className);
          expect(contam.contaminated).toBe(false);
        }
      } finally {
        process.env.GEMINI_API_KEY = prevKey;
      }
    });
  });
});
