import { describe, expect, it } from "vitest";
import { QUESTION_TYPES } from "./constants";
import {
  auditPaperWithGemini,
  generatePaperSectionWithGemini,
  generateQuestionsWithGemini,
  improveQuestionWithGemini,
  isGeminiConfigured,
  normalizeFigureObjects,
  parseBlueprintWithGemini,
  promptToFigureSceneWithGemini,
} from "./gemini";

describe("Gemini AI Integration Suite", () => {
  describe("isGeminiConfigured", () => {
    it("reports configuration status correctly based on custom key or env", () => {
      expect(isGeminiConfigured("AIzaSyMockKey12345")).toBe(true);
      expect(isGeminiConfigured("")).toBe(Boolean(process.env.GEMINI_API_KEY));
    });
  });

  describe("generateQuestionsWithGemini (Offline Mock & Schema Verification)", () => {
    it("generates board-aligned MCQs with 4 options and answer", async () => {
      const res = await generateQuestionsWithGemini({
        subject: "Science",
        className: "Class 10",
        chapter: "Chemical Reactions and Equations",
        type: "MCQ",
        marks: 1,
        difficulty: "MEDIUM",
        count: 1,
        language: "en",
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data.length).toBeGreaterThanOrEqual(1);

      const q = res.data[0];
      expect(q.type).toBe("MCQ");
      expect(q.text).toBeTruthy();
      expect(q.options?.length).toBe(4);
      expect(q.answer).toBeTruthy();
      expect(["REMEMBERING", "UNDERSTANDING", "APPLYING", "ANALYZING", "EVALUATING"]).toContain(
        q.cognitiveLevel,
      );
    });

    it("generates CBSE Case Study questions with passage and graded subparts", async () => {
      const res = await generateQuestionsWithGemini({
        subject: "Science",
        className: "Class 10",
        chapter: "Metals and Non-metals",
        type: "CASE_STUDY",
        marks: 4,
        difficulty: "HARD",
        count: 1,
        language: "bilingual",
      });

      expect(res.success).toBe(true);
      expect(res.data.length).toBe(1);

      const q = res.data[0];
      expect(q.type).toBe("CASE_STUDY");
      expect(q.text).toBeTruthy();
      expect(q.subparts?.length).toBeGreaterThanOrEqual(3);
      for (const sp of q.subparts || []) {
        expect(sp.label).toBeTruthy();
        expect(sp.text).toBeTruthy();
        expect(sp.marks).toBeGreaterThan(0);
        expect(sp.answer).toBeTruthy();
      }
    });

    it("generates CBSE Assertion-Reason questions with official standard 4 options", async () => {
      const res = await generateQuestionsWithGemini({
        subject: "Science",
        className: "Class 10",
        chapter: "Life Processes",
        type: "ASSERTION_REASON",
        marks: 1,
        difficulty: "MEDIUM",
        count: 1,
        language: "en",
      });

      expect(res.success).toBe(true);
      expect(res.data.length).toBe(1);

      const q = res.data[0];
      expect(q.type).toBe("ASSERTION_REASON");
      expect(q.text).toContain("Assertion (A)");
      expect(q.text).toContain("Reason (R)");
      expect(q.options?.length).toBe(4);
      expect(q.options?.[0]).toContain("Both (A) and (R) are true");
      expect(q.options?.[1]).toContain("not the correct explanation");
      expect(q.answer).toBeTruthy();
    });
  });

  describe("improveQuestionWithGemini (Co-Pilot Rewriter)", () => {
    it("rewrites question to CBSE Board rigor standards", async () => {
      const res = await improveQuestionWithGemini({
        questionText: "What is photosynthesis and why is it important?",
        type: "SHORT",
        options: [],
        answer: "",
        task: "refine_cbse",
      });

      expect(res.success).toBe(true);
      expect(res.data.improvedText).toBeTruthy();
      expect(res.data.improvedAnswer).toBeTruthy();
      expect(res.data.critique.length).toBeGreaterThan(0);
    });

    it("generates plausible MCQ distractors with explanations", async () => {
      const res = await improveQuestionWithGemini({
        questionText: "Which of the following is a balanced equation for the reaction of zinc with sulfuric acid?",
        type: "MCQ",
        options: ["Zn + H2SO4 -> ZnSO4 + H2"],
        answer: "Zn + H2SO4 -> ZnSO4 + H2",
        task: "generate_distractors",
      });

      expect(res.success).toBe(true);
      expect(res.data.improvedOptions.length).toBe(4);
      expect(res.data.improvedAnswer).toBeTruthy();
      expect(res.data.critique.length).toBeGreaterThan(0);
    });

    it("translates question into formal Devanagari Hindi", async () => {
      const res = await improveQuestionWithGemini({
        questionText: "State Ohm's Law and derive the relation between potential difference and current.",
        type: "LONG",
        options: [],
        answer: "V = IR",
        task: "bilingual_hindi",
      });

      expect(res.success).toBe(true);
      expect(res.data.improvedText).toBeTruthy();
      expect(/[\u0900-\u097F]/.test(res.data.improvedText)).toBe(true);
    });

    it("creates a step-by-step marking scheme rubric", async () => {
      const res = await improveQuestionWithGemini({
        questionText: "Find the roots of the quadratic equation 2x^2 - 5x + 3 = 0 using the quadratic formula.",
        type: "SHORT",
        options: [],
        answer: "x = 1, 3/2",
        task: "step_marking_scheme",
      });

      expect(res.success).toBe(true);
      expect(res.data.stepMarkingScheme).toBeTruthy();
    });
  });

  describe("auditPaperWithGemini (Cognitive Balance & Flaw Detector)", () => {
    it("audits cognitive distribution against CBSE standards", async () => {
      const sampleQuestions = [
        {
          id: "q1",
          number: 1,
          sectionTitle: "Section A",
          type: "MCQ",
          text: "What is the chemical formula of rust?",
          options: ["Fe2O3.xH2O", "FeO", "Fe3O4", "FeCl3"],
          answer: "Fe2O3.xH2O",
          marks: 1,
          difficulty: "EASY",
        },
        {
          id: "q2",
          number: 2,
          sectionTitle: "Section B",
          type: "SHORT",
          text: "Explain why copper does not react with dilute hydrochloric acid.",
          options: [],
          answer: "Copper is less reactive than hydrogen.",
          marks: 3,
          difficulty: "MEDIUM",
        },
        {
          id: "q3",
          number: 3,
          sectionTitle: "Section C",
          type: "NUMERICAL",
          text: "Calculate the current flowing through a 10 ohm resistor connected to a 12V battery.",
          options: [],
          answer: "I = V/R = 1.2 A",
          marks: 3,
          difficulty: "MEDIUM",
        },
        {
          id: "q4",
          number: 4,
          sectionTitle: "Section D",
          type: "LONG",
          text: "Design an experiment to demonstrate that chlorophyll is essential for photosynthesis.",
          options: [],
          answer: "Destarched leaf test using iodine solution.",
          marks: 5,
          difficulty: "HARD",
        },
      ];

      const res = await auditPaperWithGemini({
        paperTitle: "Class 10 Science Mid-Term",
        className: "Class 10",
        subject: "Science",
        totalMarks: 12,
        questions: sampleQuestions,
      });

      expect(res.success).toBe(true);
      const audit = res.data;
      expect(audit.totalMarks).toBe(12);
      expect(audit.totalQuestions).toBe(4);
      expect(audit.cognitiveBalance.rememberingPct).toBeGreaterThan(0);
      expect(audit.cognitiveBalance.understandingPct).toBeGreaterThan(0);
      expect(audit.cognitiveBalance.applyingPct).toBeGreaterThan(0);
      expect(audit.cognitiveBalance.analyzingHotsPct).toBeGreaterThan(0);
      expect(audit.cognitiveBalance.summary).toBeTruthy();
      expect(audit.overallVerdict).toBeTruthy();
    });

    it("flags flawed questions appropriately", async () => {
      const flawedQuestions = [
        {
          id: "q1",
          number: 1,
          sectionTitle: "Section A",
          type: "MCQ",
          text: "Which of the following is true?",
          options: ["Option A", "Option A", "Option B", "Option C"], // Flawed MCQ: duplicate options
          answer: "Option A",
          marks: 1,
          difficulty: "EASY",
        },
      ];

      const res = await auditPaperWithGemini({
        paperTitle: "Flawed Test",
        className: "Class 10",
        subject: "Science",
        totalMarks: 1,
        questions: flawedQuestions,
      });

      expect(res.success).toBe(true);
      expect(res.data.issues.length).toBeGreaterThan(0);
    });
  });

  describe("promptToFigureSceneWithGemini (Natural Language to Vector Scene)", () => {
    it("translates right triangle geometry prompt into Figure Studio vector objects", async () => {
      const res = await promptToFigureSceneWithGemini({
        prompt: "Right-angled triangle ABC right angled at B, base BC = 8 cm, altitude AB = 6 cm, with an angle mark θ at vertex A",
        canvasWidth: 640,
        canvasHeight: 360,
      });

      expect(res.success).toBe(true);
      expect(res.data.objects.length).toBeGreaterThan(0);
      const objs = res.data.objects as Array<{ type: string }>;
      const hasLineOrShape = objs.some((o) => o.type === "line" || o.type === "shape" || o.type === "angle");
      expect(hasLineOrShape).toBe(true);
      const hasLabels = objs.some((o) => o.type === "text" || o.type === "point");
      expect(hasLabels).toBe(true);
    });

    it("translates circuit prompt into Figure Studio stamp & line objects", async () => {
      const res = await promptToFigureSceneWithGemini({
        prompt: "Simple series circuit with battery, resistor R = 10 Ω, open switch, and ammeter A",
        canvasWidth: 640,
        canvasHeight: 360,
      });

      expect(res.success).toBe(true);
      expect(res.data.objects.length).toBeGreaterThan(0);
      const circuitObjs = res.data.objects as Array<{ type: string }>;
      const hasStampsOrLines = circuitObjs.some((o) => o.type === "stamp" || o.type === "line");
      expect(hasStampsOrLines).toBe(true);
    });

    it("generates full Ohm's law circuit with real stamps (resistor, voltmeter, ammeter, rheostat, battery, key) connected by wires", async () => {
      const res = await promptToFigureSceneWithGemini({
        prompt: "draw a circuit for ohms law",
        canvasWidth: 640,
        canvasHeight: 360,
      });

      expect(res.success).toBe(true);
      const objs = res.data.objects as Array<Record<string, any>>;
      expect(objs.length).toBeGreaterThan(5);

      // Verify physical stamps exist (not just lines!)
      const stamps = objs.filter((o) => o.type === "stamp");
      expect(stamps.length).toBeGreaterThanOrEqual(5);
      const stampTypes = stamps.map((s) => s.stamp);
      expect(stampTypes).toContain("voltmeter");
      expect(stampTypes).toContain("resistor");
      expect(stampTypes).toContain("ammeter");
      expect(stampTypes).toContain("battery");
      expect(stampTypes).toContain("rheostat");

      // Verify stamps have direct top-level coordinates (not wrapped in box)
      for (const s of stamps) {
        expect(typeof s.x).toBe("number");
        expect(typeof s.y).toBe("number");
        expect(typeof s.w).toBe("number");
        expect(typeof s.h).toBe("number");
        expect(s.box).toBeUndefined();
      }

      // Verify connecting wires exist
      const lines = objs.filter((o) => o.type === "line");
      expect(lines.length).toBeGreaterThanOrEqual(4);

      // Verify labels have white background pills to prevent overlaps
      const textLabels = objs.filter((o) => o.type === "text");
      expect(textLabels.length).toBeGreaterThanOrEqual(2);
      expect(textLabels.every((t) => t.bg === "white")).toBe(true);
    });

    it("normalizes and deconflicts raw LLM objects with nested boxes and colliding point labels", () => {
      const rawInput = [
        {
          type: "stamp",
          stampId: "resistor",
          box: { x: 100, y: 150, w: 80, h: 30, rot: 0 },
        },
        {
          type: "stamp",
          symbol: "dc_cell",
          box: { x: 200, y: 150, w: 60, h: 40, rot: 0 },
        },
        // Triangle vertices forming a centroid at (100, 100)
        { type: "point", x: 100, y: 50, label: "A" }, // Above centroid -> should point UP (ly < 0)
        { type: "point", x: 50, y: 150, label: "B" }, // Bottom-left -> should point left/down (lx < 0, ly > 0)
        { type: "point", x: 150, y: 150, label: "C" }, // Bottom-right -> should point right/down (lx > 0, ly > 0)
      ];

      const normalized = normalizeFigureObjects(rawInput, 640, 360) as Array<Record<string, any>>;

      // Check stamp flattening & synonym mapping
      const r = normalized.find((o) => o.stamp === "resistor");
      expect(r).toBeDefined();
      expect(r?.x).toBe(100);
      expect(r?.y).toBe(150);
      expect(r?.w).toBe(80);
      expect(r?.h).toBe(30);

      const cell = normalized.find((o) => o.stamp === "battery");
      expect(cell).toBeDefined();
      expect(cell?.x).toBe(200);

      // Check point outwards orientation
      const ptA = normalized.find((o) => o.label === "A");
      const ptB = normalized.find((o) => o.label === "B");
      const ptC = normalized.find((o) => o.label === "C");

      expect(ptA).toBeDefined();
      expect(ptB).toBeDefined();
      expect(ptC).toBeDefined();

      // Vertex A is above the triangle centroid, so label offset must push UP (ly < 0)
      expect(ptA?.ly).toBeLessThan(0);
      // Vertex B is to the left, so label offset must push LEFT (lx < 0)
      expect(ptB?.lx).toBeLessThan(0);
      // Vertex C is to the right, so label offset must push RIGHT (lx > 0)
      expect(ptC?.lx).toBeGreaterThan(0);
    });
  });

  describe("parseBlueprintWithGemini (AI Blueprint Creator)", () => {
    it("extracts and auto-balances an official board blueprint from text input", async () => {
      const mockChapters = [
        { id: "ch_1", number: 1, title: "The Last Lesson" },
        { id: "ch_2", number: 2, title: "Lost Spring" },
        { id: "ch_3", number: 3, title: "Deep Water" },
        { id: "ch_4", number: 4, title: "My Mother at Sixty-Six" },
      ];

      const res = await parseBlueprintWithGemini({
        rawText: `
          Board of Secondary Education, Madhya Pradesh, Bhopal
          Higher Secondary Examination Session 2025–26
          Class: XII, Subject: English, Maximum Marks: 80, Time: 3:00 Hours
          Section A - Reading Skills: 14 Marks (Unseen passage 10m, Note making 4m)
          Section B - Writing Skills: 12 Marks (Notice 4m, Letter 4m, Article 4m)
          Section C - Grammar: 10 Marks (Fill ups 5m, Do as directed 5m)
          Section D - Textbooks: 44 Marks
        `,
        className: "Class 12",
        subject: "English",
        academicSession: "2025–26",
        bookChapters: mockChapters,
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data.name).toBeTruthy();
      expect(res.data.academicSession).toBe("2025–26");
      expect(res.data.durationMin).toBe(180);
      expect(res.data.sections.length).toBeGreaterThanOrEqual(1);

      // Verify sections total equals chapters total
      const totalSectionMarks = res.data.sections.reduce(
        (sum, s) => sum + s.count * s.marksEach,
        0,
      );
      const totalChapterMarks = res.data.chapters.reduce(
        (sum, c) => sum + c.marks,
        0,
      );

      expect(totalSectionMarks).toBe(res.data.totalMarks);
      expect(totalChapterMarks).toBe(totalSectionMarks);
    });

    it("supports multimodal file data (PDF/Image) for official board circulars", async () => {
      const mockChapters = [
        { id: "ch_math_1", number: 1, title: "Relations and Functions" },
        { id: "ch_math_2", number: 2, title: "Inverse Trigonometric Functions" },
      ];

      const res = await parseBlueprintWithGemini({
        fileData: "JVBERi0xLjQKJcTl8uXr...", // Dummy base64 PDF
        mimeType: "application/pdf",
        className: "Class 12",
        subject: "Mathematics",
        academicSession: "2025–26",
        bookChapters: mockChapters,
      });

      expect(res.success).toBe(true);
      expect(res.data.sections.length).toBeGreaterThan(0);
      const totalSec = res.data.sections.reduce((sum, s) => sum + s.count * s.marksEach, 0);
      const totalCh = res.data.chapters.reduce((sum, c) => sum + c.marks, 0);
      expect(totalCh).toBe(totalSec);
    });

    it("safely normalizes MP Board objective question types including one-word questions into valid system types", async () => {
      const mockChapters = [
        { id: "ch_1", number: 1, title: "Sexual Reproduction in Flowering Plants" },
        { id: "ch_2", number: 2, title: "Human Reproduction" },
        { id: "ch_3", number: 3, title: "Reproductive Health" },
      ];

      const res = await parseBlueprintWithGemini({
        rawText: `
          Board of Secondary Education, Madhya Pradesh, Bhopal
          Higher Secondary Examination Session 2026–27
          Marks Scheme
          Class: 12, Subject: Biology, Maximum Marks: 70
          Q1: Multiple Choice Questions – 06
          Q2: Fill in the blanks – 06
          Q3: True / False – 06
          Q4: Match the following – 05
          Q5: One-word answer – 05
          Question Nos. 6 to 12: Total 07 questions, each carrying 2 marks
        `,
        className: "Class 12",
        subject: "Biology",
        academicSession: "2026–27",
        bookChapters: mockChapters,
      });

      expect(res.success).toBe(true);
      expect(res.data.sections.length).toBeGreaterThanOrEqual(1);

      // Verify every section has a valid QuestionType from QUESTION_TYPES enum
      for (const s of res.data.sections) {
        expect(QUESTION_TYPES).toContain(s.type);
        expect(s.type).not.toBe("ONE_WORD");
      }
    });
  });

  describe("generatePaperSectionWithGemini (Section-by-Section Exam Generation)", () => {
    it("generates questions matching target chapter slots with vector diagram scene", async () => {
      const res = await generatePaperSectionWithGemini({
        className: "Class 12",
        subject: "Biology",
        sectionTitle: "Section A: Multiple Choice Questions",
        sectionType: "MCQ",
        marksEach: 1,
        language: "en",
        difficulty: "BALANCED",
        generateDiagrams: true,
        slots: [
          { slotIndex: 0, chapterId: "c1", chapterNumber: 1, chapterTitle: "Sexual Reproduction in Flowering Plants", marks: 1 },
          { slotIndex: 1, chapterId: "c2", chapterNumber: 2, chapterTitle: "Human Reproduction", marks: 1 },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.data.length).toBe(2);

      const q1 = res.data[0];
      expect(q1.slotIndex).toBe(0);
      expect(q1.chapterId).toBe("c1");
      expect(q1.chapterNumber).toBe(1);
      expect(q1.type).toBe("MCQ");
      expect(q1.options.length).toBe(4);
      expect(q1.answer).toBeTruthy();

      // First question had diagram generation enabled
      expect(q1.figurePrompt).toBeDefined();
      expect(q1.figureDoc).toBeDefined();
      expect(q1.figureDoc?.objects).toBeInstanceOf(Array);

      // Verify Biology diagram does NOT contain any physics circuit components
      const hasPhysicsComponent = (q1.figureDoc?.objects as any[]).some(
        (o) => o?.type === "stamp" && ["resistor", "battery", "ammeter", "voltmeter"].includes(o?.stamp),
      );
      expect(hasPhysicsComponent).toBe(false);
      expect(q1.text).toContain("diagram");

      const q2 = res.data[1];
      expect(q2.slotIndex).toBe(1);
      expect(q2.chapterId).toBe("c2");
      expect(q2.chapterNumber).toBe(2);
      expect(q2.type).toBe("MCQ");
      // Other MCQs do not get unnecessary diagrams
      expect(q2.figureDoc).toBeUndefined();
    });

    it("generates structured Biology Punnett square and Trophic pyramid archetypes without circuit fallback", async () => {
      const punnett = await promptToFigureSceneWithGemini({
        prompt: "Punnett square for monohybrid cross TT x tt",
        subject: "Biology",
      });
      expect(punnett.success).toBe(true);
      expect(punnett.data.objects.length).toBeGreaterThan(5);
      const hasPunnettText = punnett.data.objects.some((o: any) => o?.type === "text" && o?.text?.includes("Punnett"));
      expect(hasPunnettText).toBe(true);

      const pyramid = await promptToFigureSceneWithGemini({
        prompt: "Ecological trophic pyramid of energy",
        subject: "Biology",
      });
      expect(pyramid.success).toBe(true);
      const hasProducers = pyramid.data.objects.some((o: any) => o?.type === "text" && o?.text?.includes("Producers"));
      expect(hasProducers).toBe(true);
    });

    it("generates subjective questions with step marking schemes", async () => {
      const res = await generatePaperSectionWithGemini({
        className: "Class 12",
        subject: "Biology",
        sectionTitle: "Long Answer Questions",
        sectionType: "LONG",
        marksEach: 4,
        language: "en",
        difficulty: "HARD",
        generateDiagrams: false,
        slots: [
          { slotIndex: 0, chapterId: "c7", chapterNumber: 7, chapterTitle: "Human Health and Disease", marks: 4 },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.data.length).toBe(1);
      const q = res.data[0];
      expect(q.type).toBe("LONG");
      expect(q.text).toBeTruthy();
      expect(q.answer).toContain("Model Answer");
      expect(q.figureDoc).toBeUndefined();
    });
  });
});
