import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

describe("MPBSE Curriculum Schema & Seed Data Integrity Suite (Milestone 1)", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("1. MPBSE Board record exists with verified metadata", async () => {
    const board = await prisma.curriculumBoard.findUnique({
      where: { code: "MPBSE" },
      include: { documents: true, classes: true },
    });

    expect(board).not.toBeNull();
    expect(board?.name).toContain("Madhya Pradesh Board of Secondary Education");
    expect(board?.state).toBe("Madhya Pradesh");
    expect(board?.activeSession).toBe("2026-27");
    expect(board?.classes.length).toBe(4);
    expect(board?.documents.length).toBeGreaterThanOrEqual(6);
  });

  it("2. All 6 primary source documents are registered and verified", async () => {
    const docs = await prisma.curriculumDocument.findMany({
      where: { board: { code: "MPBSE" } },
    });

    expect(docs.length).toBe(6);
    const urls = docs.map((d) => d.officialUrl);
    expect(urls).toContain("https://mpbse.nic.in/MarksScheme_2026_27.pdf");
    expect(urls).toContain("https://mpbse.nic.in/Syllabus_2026_27.pdf");
    expect(urls).toContain("https://mpbse.nic.in/Project%20%26%20Practical_2026_27.pdf");
    expect(urls).toContain("https://mpbse.nic.in/Bse_465_466.pdf");
    expect(urls).toContain("https://mpbse.nic.in/Bse_149_150.pdf");
    expect(urls).toContain("https://mpbse.nic.in/Bse_53_54_Maths(Basic%26%20Standard).pdf");

    for (const d of docs) {
      expect(d.verificationStatus).toBe("VERIFIED");
      expect(d.academicSession).toBe("2026-27");
    }
  });

  it("3. Classes 9, 10, 11, and 12 are properly structured with board exam flags", async () => {
    const classes = await prisma.curriculumClass.findMany({
      where: { board: { code: "MPBSE" } },
      orderBy: { classLevel: "asc" },
      include: { subjects: true, streams: true },
    });

    expect(classes.length).toBe(4);
    const c9 = classes.find((c) => c.classLevel === 9);
    const c10 = classes.find((c) => c.classLevel === 10);
    const c11 = classes.find((c) => c.classLevel === 11);
    const c12 = classes.find((c) => c.classLevel === 12);

    expect(c9?.isBoardExam).toBe(false);
    expect(c10?.isBoardExam).toBe(true);
    expect(c11?.isBoardExam).toBe(false);
    expect(c12?.isBoardExam).toBe(true);

    expect(c9?.subjects.length).toBe(7);
    expect(c10?.subjects.length).toBe(8);
    expect(c11?.subjects.length).toBe(6);
    expect(c12?.subjects.length).toBe(6);
  });

  it("4. Academic streams are configured for Classes 11 and 12", async () => {
    const streams = await prisma.curriculumStream.findMany({
      include: { curriculumClass: true },
    });

    const c11Streams = streams.filter((s) => s.curriculumClass.classLevel === 11);
    const c12Streams = streams.filter((s) => s.curriculumClass.classLevel === 12);

    expect(c11Streams.some((s) => s.code === "SCIENCE_BIO")).toBe(true);
    expect(c11Streams.some((s) => s.code === "SCIENCE_PCM")).toBe(true);
    expect(c12Streams.some((s) => s.code === "SCIENCE_BIO")).toBe(true);
    expect(c12Streams.some((s) => s.code === "SCIENCE_PCM")).toBe(true);
  });

  it("5. Subject codes, theory marks, and practical flags match official specifications", async () => {
    const subjects = await prisma.curriculumSubject.findMany({
      include: { curriculumClass: true, variants: true },
    });

    expect(subjects.length).toBe(27);

    // Class 10 subjects
    const c10MathStd = subjects.find((s) => s.curriculumClass.classLevel === 10 && s.code === "100");
    const c10MathBsc = subjects.find((s) => s.curriculumClass.classLevel === 10 && s.code === "101");
    const c10Sci = subjects.find((s) => s.curriculumClass.classLevel === 10 && s.code === "200");
    const c10Soc = subjects.find((s) => s.curriculumClass.classLevel === 10 && s.code === "300");

    expect(c10MathStd?.theoryMarks).toBe(75);
    expect(c10MathBsc?.theoryMarks).toBe(75);
    expect(c10Sci?.theoryMarks).toBe(75);
    expect(c10Sci?.hasPracticals).toBe(true);
    expect(c10Sci?.practicalMarks).toBe(25);
    expect(c10Soc?.theoryMarks).toBe(75);

    // Class 12 Science subjects
    const c12Physics = subjects.find((s) => s.curriculumClass.classLevel === 12 && s.code === "210");
    const c12Chemistry = subjects.find((s) => s.curriculumClass.classLevel === 12 && s.code === "220");
    const c12Biology = subjects.find((s) => s.curriculumClass.classLevel === 12 && s.code === "231");
    const c12Math = subjects.find((s) => s.curriculumClass.classLevel === 12 && s.code === "150");
    const c12Hindi = subjects.find((s) => s.curriculumClass.classLevel === 12 && s.code === "051");
    const c12English = subjects.find((s) => s.curriculumClass.classLevel === 12 && s.code === "052");

    expect(c12Physics?.theoryMarks).toBe(70);
    expect(c12Physics?.practicalMarks).toBe(30);
    expect(c12Physics?.hasPracticals).toBe(true);

    expect(c12Chemistry?.theoryMarks).toBe(70);
    expect(c12Chemistry?.practicalMarks).toBe(30);
    expect(c12Chemistry?.hasPracticals).toBe(true);

    expect(c12Biology?.theoryMarks).toBe(70);
    expect(c12Biology?.practicalMarks).toBe(30);
    expect(c12Biology?.hasPracticals).toBe(true);

    expect(c12Math?.theoryMarks).toBe(80);
    expect(c12Math?.projectMarks).toBe(20);
    expect(c12Math?.hasPracticals).toBe(false);

    expect(c12Hindi?.theoryMarks).toBe(80);
    expect(c12English?.theoryMarks).toBe(80);

    // Class 9 subjects metadata check
    const c9MathStd = subjects.find((s) => s.curriculumClass.classLevel === 9 && s.code === "100");
    const c9MathBsc = subjects.find((s) => s.curriculumClass.classLevel === 9 && s.code === "101");
    const c9Sci = subjects.find((s) => s.curriculumClass.classLevel === 9 && s.code === "200");
    const c9Soc = subjects.find((s) => s.curriculumClass.classLevel === 9 && s.code === "300");
    const c9Hindi = subjects.find((s) => s.curriculumClass.classLevel === 9 && s.code === "401");
    const c9English = subjects.find((s) => s.curriculumClass.classLevel === 9 && s.code === "411");
    const c9Sanskrit = subjects.find((s) => s.curriculumClass.classLevel === 9 && s.code === "512");

    expect(c9MathStd?.theoryMarks).toBe(75);
    expect(c9MathBsc?.theoryMarks).toBe(75);
    expect(c9Sci?.theoryMarks).toBe(75);
    expect(c9Sci?.hasPracticals).toBe(true);
    expect(c9Sci?.practicalMarks).toBe(25);
    expect(c9Soc?.theoryMarks).toBe(75);
    expect(c9Hindi?.theoryMarks).toBe(75);
    expect(c9English?.theoryMarks).toBe(75);
    expect(c9Sanskrit?.theoryMarks).toBe(75);

    // Class 11 Science & Language subjects metadata check
    const c11Physics = subjects.find((s) => s.curriculumClass.classLevel === 11 && s.code === "210");
    const c11Chemistry = subjects.find((s) => s.curriculumClass.classLevel === 11 && s.code === "220");
    const c11Biology = subjects.find((s) => s.curriculumClass.classLevel === 11 && s.code === "231");
    const c11Math = subjects.find((s) => s.curriculumClass.classLevel === 11 && s.code === "150");
    const c11Hindi = subjects.find((s) => s.curriculumClass.classLevel === 11 && s.code === "051");
    const c11English = subjects.find((s) => s.curriculumClass.classLevel === 11 && s.code === "052");

    expect(c11Physics?.theoryMarks).toBe(70);
    expect(c11Physics?.practicalMarks).toBe(30);
    expect(c11Physics?.hasPracticals).toBe(true);

    expect(c11Chemistry?.theoryMarks).toBe(70);
    expect(c11Chemistry?.practicalMarks).toBe(30);
    expect(c11Chemistry?.hasPracticals).toBe(true);

    expect(c11Biology?.theoryMarks).toBe(70);
    expect(c11Biology?.practicalMarks).toBe(30);
    expect(c11Biology?.hasPracticals).toBe(true);

    expect(c11Math?.theoryMarks).toBe(80);
    expect(c11Math?.projectMarks).toBe(20);
    expect(c11Math?.hasPracticals).toBe(false);

    expect(c11Hindi?.theoryMarks).toBe(80);
    expect(c11English?.theoryMarks).toBe(80);
  });

  it("6. Circular 465 choice rules are strictly modeled in all Blueprint templates", async () => {
    const templates = await prisma.curriculumBlueprintTemplate.findMany();
    expect(templates.length).toBe(27);

    for (const t of templates) {
      const sections = t.sectionsJson as unknown as Array<{
        type: string;
        marksEach: number;
        orChoiceMode: string;
        choicePolicy?: { policyType: string };
      }>;
      expect(Array.isArray(sections)).toBe(true);

      for (const sec of sections) {
        // Very Short Answer (2 marks) must have NO CHOICE per Circular 465
        if (sec.type === "VERY_SHORT_ANSWER" && sec.marksEach === 2) {
          expect(sec.orChoiceMode).toBe("NO_CHOICE");
          expect(sec.choicePolicy?.policyType).toBe("NO_CHOICE");
        }

        // For general subject archetypes (STANDARD_23Q_75M, SCIENCE_20Q_70M, STANDARD_23Q_80M),
        // Short Answer (3 marks) and Long Answer (4 marks) must have FULL OR CHOICE
        if (t.archetype.startsWith("STANDARD") || t.archetype.startsWith("SCIENCE")) {
          if ((sec.type === "SHORT_ANSWER" || sec.type === "LONG_ANSWER") && (sec.marksEach === 3 || sec.marksEach === 4)) {
            expect(sec.orChoiceMode).toBe("FULL_OR_ALTERNATIVE");
            expect(sec.choicePolicy?.policyType).toBe("FULL_OR_ALTERNATIVE");
          }
        }
      }
    }
  });

  it("7. Rationalized deleted chapters are correctly marked with isDeleted=true", async () => {
    const deletedChapters = await prisma.curriculumChapter.findMany({
      where: { isDeleted: true },
    });

    expect(deletedChapters.length).toBeGreaterThan(15);

    const deletedTitles = deletedChapters.map((c) => c.title);
    // Class 10 deleted chapters
    expect(deletedTitles.some((t) => t.includes("रचनाएँ"))).toBe(true);
    expect(deletedTitles.some((t) => t.includes("तत्वों का आवर्त वर्गीकरण"))).toBe(true);
    expect(deletedTitles.some((t) => t.includes("ऊर्जा के स्रोत"))).toBe(true);

    // Class 11 & 12 deleted chapters
    expect(deletedTitles.some((t) => t.includes("भौतिक जगत"))).toBe(true);
    expect(deletedTitles.some((t) => t.includes("ठोस अवस्था"))).toBe(true);
    expect(deletedTitles.some((t) => t.includes("पृष्ठ रसायन"))).toBe(true);
  });

  it("8. Textbooks and Chapters are properly linked to legacy Book and Chapter records", async () => {
    const textbooks = await prisma.curriculumTextbook.findMany({
      where: { legacyBookId: { not: null } },
      include: { chapters: true },
    });

    expect(textbooks.length).toBe(37);

    for (const tb of textbooks) {
      const book = await prisma.book.findUnique({
        where: { id: tb.legacyBookId! },
      });
      expect(book).not.toBeNull();

      for (const ch of tb.chapters) {
        if (ch.legacyChapterId) {
          const legacyCh = await prisma.chapter.findUnique({
            where: { id: ch.legacyChapterId },
          });
          expect(legacyCh).not.toBeNull();
          expect(legacyCh?.bookId).toBe(book?.id);
        }
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 9. Invariant A: Hard Ceiling (No Overflow) Across All 27 Subjects
  // ---------------------------------------------------------------------------
  it("9. Invariant A: Active chapter marks never exceed board theory ceiling across all 27 subjects (Hard ceiling)", async () => {
    const subjects = await prisma.curriculumSubject.findMany({
      include: {
        curriculumClass: true,
        textbooks: {
          include: {
            chapters: true,
          },
        },
      },
      orderBy: [{ curriculumClass: { classLevel: "asc" } }, { code: "asc" }],
    });

    expect(subjects.length).toBe(27);

    const violations: Array<{
      classLevel: number;
      subject: string;
      code: string;
      theoryMarks: number;
      chapterMarksSum: number;
      overflow: number;
    }> = [];

    for (const subject of subjects) {
      const cls = subject.curriculumClass.classLevel;
      const activeChapters = subject.textbooks
        .flatMap((tb) => tb.chapters)
        .filter((ch) => !ch.isDeleted);

      const chapterMarksSum = activeChapters.reduce(
        (sum, ch) => sum + (ch.officialMarks ?? 0),
        0
      );

      if (chapterMarksSum > subject.theoryMarks) {
        violations.push({
          classLevel: cls,
          subject: subject.name,
          code: subject.code,
          theoryMarks: subject.theoryMarks,
          chapterMarksSum,
          overflow: chapterMarksSum - subject.theoryMarks,
        });
      }

      // Individual subject assertion with descriptive message
      expect(
        chapterMarksSum,
        `Class ${cls} ${subject.name} (${subject.code}) active chapter marks sum (${chapterMarksSum}) must not exceed theoryMarks ceiling (${subject.theoryMarks})`
      ).toBeLessThanOrEqual(subject.theoryMarks);
    }

    // Consolidated verification
    expect(violations, `Found ${violations.length} subjects exceeding theory marks ceiling: ${JSON.stringify(violations)}`).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // 10. Invariant B: Core STEM & Social Subjects with Explicit Board Chapter Marks Reconcile Exactly
  // ---------------------------------------------------------------------------
  it("10. Invariant B: Core subjects with explicit board chapter marks reconcile exactly to theory total", async () => {
    const subjects = await prisma.curriculumSubject.findMany({
      include: {
        curriculumClass: true,
        textbooks: {
          include: {
            chapters: true,
          },
        },
      },
    });

    const explicitSpecs = [
      // Class 10: Math (Std & Basic), Science, Social Science
      { classLevel: 10, code: "100", name: "Mathematics Standard", expectedTheory: 75 },
      { classLevel: 10, code: "101", name: "Mathematics Basic", expectedTheory: 75 },
      { classLevel: 10, code: "200", name: "Science", expectedTheory: 75 },
      { classLevel: 10, code: "300", name: "Social Science", expectedTheory: 75 },

      // Class 12: Physics, Chemistry, Biology, Mathematics
      { classLevel: 12, code: "210", name: "Physics", expectedTheory: 70 },
      { classLevel: 12, code: "220", name: "Chemistry", expectedTheory: 70 },
      { classLevel: 12, code: "231", name: "Biology", expectedTheory: 70 },
      { classLevel: 12, code: "150", name: "Mathematics", expectedTheory: 80 },
    ];

    for (const spec of explicitSpecs) {
      const subject = subjects.find(
        (s) => s.curriculumClass.classLevel === spec.classLevel && s.code === spec.code
      );

      expect(subject, `Class ${spec.classLevel} ${spec.name} (${spec.code}) must exist in database`).toBeDefined();
      expect(subject?.theoryMarks).toBe(spec.expectedTheory);

      const activeChapters = subject!.textbooks
        .flatMap((tb) => tb.chapters)
        .filter((ch) => !ch.isDeleted);

      const activeMarksSum = activeChapters.reduce(
        (acc, ch) => acc + (ch.officialMarks ?? 0),
        0
      );

      // Verify exact equality: sum === expectedTheory
      expect(
        activeMarksSum,
        `Class ${spec.classLevel} ${spec.name} (${spec.code}) active chapter marks sum (${activeMarksSum}) must equal theoryMarks (${spec.expectedTheory})`
      ).toBe(spec.expectedTheory);

      // Verify each active chapter has a positive non-zero officialMarks
      for (const ch of activeChapters) {
        expect(
          ch.officialMarks,
          `Class ${spec.classLevel} ${spec.name} Chapter ${ch.chapterNumber} ("${ch.title}") officialMarks must be > 0`
        ).toBeGreaterThan(0);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 11. Invariant C: Class 9 Social Science 71m Chapters + 4m Map Work = 75m
  // ---------------------------------------------------------------------------
  it("11. Invariant C: Class 9 Social Science active chapters sum to 71 marks with exactly 4 marks reserved for Q23 Map Work (total 75m)", async () => {
    const c9Soc = await prisma.curriculumSubject.findFirst({
      where: {
        code: "300",
        curriculumClass: { classLevel: 9 },
      },
      include: {
        curriculumClass: true,
        textbooks: {
          include: {
            chapters: true,
          },
        },
        marksSchemes: true,
      },
    });

    expect(c9Soc, "Class 9 Social Science (300) must exist in database").not.toBeNull();
    expect(c9Soc?.theoryMarks).toBe(75);
    expect(c9Soc?.textbooks.length).toBe(4);

    const activeChapters = c9Soc!.textbooks
      .flatMap((tb) => tb.chapters)
      .filter((ch) => !ch.isDeleted);

    expect(activeChapters.length).toBe(20);

    const activeChaptersSum = activeChapters.reduce(
      (acc, ch) => acc + (ch.officialMarks ?? 0),
      0
    );

    // Active chapters sum must be exactly 71 marks
    expect(activeChaptersSum).toBe(71);

    // Exactly 4 marks are reserved for Question 23 (India Outline Map Work)
    const reservedMapMarks = c9Soc!.theoryMarks - activeChaptersSum;
    expect(reservedMapMarks).toBe(4);

    // Chapter sum + map work reservation must equal total theory marks
    expect(activeChaptersSum + reservedMapMarks).toBe(c9Soc!.theoryMarks);

    // Verify textbook-wise disciplinary breakdown
    const geography = c9Soc!.textbooks.find((tb) => tb.title.includes("समकालीन भारत") || tb.title.includes("Geography"));
    const history = c9Soc!.textbooks.find((tb) => tb.title.includes("भारत और समकालीन विश्व") || tb.title.includes("History"));
    const polSci = c9Soc!.textbooks.find((tb) => tb.title.includes("लोकतांत्रिक राजनीति") || tb.title.includes("Political"));
    const economics = c9Soc!.textbooks.find((tb) => tb.title.includes("अर्थशास्त्र") || tb.title.includes("Economics"));

    expect(geography).toBeDefined();
    expect(history).toBeDefined();
    expect(polSci).toBeDefined();
    expect(economics).toBeDefined();

    const geoSum = geography!.chapters.filter((c) => !c.isDeleted).reduce((s, c) => s + (c.officialMarks ?? 0), 0);
    const histSum = history!.chapters.filter((c) => !c.isDeleted).reduce((s, c) => s + (c.officialMarks ?? 0), 0);
    const polSum = polSci!.chapters.filter((c) => !c.isDeleted).reduce((s, c) => s + (c.officialMarks ?? 0), 0);
    const econSum = economics!.chapters.filter((c) => !c.isDeleted).reduce((s, c) => s + (c.officialMarks ?? 0), 0);

    expect(geoSum).toBe(21); // 17 theory + 4 map work
    expect(histSum).toBe(15);
    expect(polSum).toBe(20);
    expect(econSum).toBe(15);
    expect(geoSum + histSum + polSum + econSum).toBe(71);
  });

  // ---------------------------------------------------------------------------
  // 12. Invariant D: Language Subjects Literature Ceiling & Unit Breakdown Full Account
  // ---------------------------------------------------------------------------
  it("12. Invariant D: Language subjects literature chapters sum within ceiling and marks scheme unitBreakdown accounts for full theory", async () => {
    const languageSubjects = await prisma.curriculumSubject.findMany({
      where: {
        name: { in: ["English", "Hindi", "Sanskrit", "Urdu"] },
      },
      include: {
        curriculumClass: true,
        textbooks: {
          include: {
            chapters: true,
          },
        },
        marksSchemes: true,
      },
      orderBy: [{ curriculumClass: { classLevel: "asc" } }, { code: "asc" }],
    });

    expect(languageSubjects.length).toBe(11);

    for (const subject of languageSubjects) {
      const cls = subject.curriculumClass.classLevel;
      const activeChapters = subject.textbooks
        .flatMap((tb) => tb.chapters)
        .filter((ch) => !ch.isDeleted);

      // Part 1: Literature chapters either have null officialMarks or sum <= subject.theoryMarks
      const chapterMarksSum = activeChapters.reduce(
        (acc, ch) => acc + (ch.officialMarks ?? 0),
        0
      );

      expect(
        chapterMarksSum,
        `Class ${cls} ${subject.name} (${subject.code}) active chapter marks sum (${chapterMarksSum}) must not exceed theory ceiling (${subject.theoryMarks})`
      ).toBeLessThanOrEqual(subject.theoryMarks);

      for (const ch of activeChapters) {
        if (ch.officialMarks !== null && ch.officialMarks !== undefined) {
          expect(ch.officialMarks).toBeGreaterThanOrEqual(0);
          expect(ch.officialMarks).toBeLessThanOrEqual(subject.theoryMarks);
        }
      }

      // Part 2: Marks Scheme unitBreakdown accounts for full theoryMarks
      expect(subject.marksSchemes.length, `Class ${cls} ${subject.name} must have a marks scheme`).toBeGreaterThanOrEqual(1);
      const marksScheme = subject.marksSchemes[0];
      expect(marksScheme.totalTheory).toBe(subject.theoryMarks);

      const unitBreakdown = marksScheme.unitBreakdown as Array<{ title?: string; officialMarks?: number }>;
      expect(Array.isArray(unitBreakdown), `Class ${cls} ${subject.name} unitBreakdown must be an array`).toBe(true);
      expect(unitBreakdown.length).toBeGreaterThanOrEqual(1);

      const unitBreakdownSum = unitBreakdown.reduce(
        (acc, u) => acc + (typeof u.officialMarks === "number" ? u.officialMarks : 0),
        0
      );

      expect(
        unitBreakdownSum,
        `Class ${cls} ${subject.name} unitBreakdown marks sum (${unitBreakdownSum}) must account for total theoryMarks (${subject.theoryMarks})`
      ).toBe(subject.theoryMarks);
    }
  });
});
