import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

describe("Adversarial Empirical Challenge: Milestone 1 Schema & Seed Integrity", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // 1. Board Flags Verification
  // ---------------------------------------------------------------------------
  it("Verifies board flags: Classes 10 and 12 are Board Exams, Classes 9 and 11 are School Exams", async () => {
    const classes = await prisma.curriculumClass.findMany({
      where: { board: { code: "MPBSE" } },
      orderBy: { classLevel: "asc" },
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
  });

  // ---------------------------------------------------------------------------
  // 2. Subject Code Uniqueness per Class
  // ---------------------------------------------------------------------------
  it("Verifies subject codes are strictly unique within each class", async () => {
    const subjects = await prisma.curriculumSubject.findMany({
      include: { curriculumClass: true },
    });

    const classCodes = new Map<number, Set<string>>();
    for (const s of subjects) {
      const cls = s.curriculumClass.classLevel;
      if (!classCodes.has(cls)) {
        classCodes.set(cls, new Set());
      }
      const codes = classCodes.get(cls)!;
      expect(codes.has(s.code)).toBe(false);
      codes.add(s.code);
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Legacy Synchronization
  // ---------------------------------------------------------------------------
  it("Verifies 100% of textbooks and chapters are synchronized to legacy Book and Chapter records", async () => {
    const textbooks = await prisma.curriculumTextbook.findMany({
      include: { chapters: true },
    });

    expect(textbooks.length).toBe(37);

    for (const tb of textbooks) {
      expect(tb.legacyBookId).toBeTruthy();
      const legacyBook = await prisma.book.findUnique({
        where: { id: tb.legacyBookId! },
      });
      expect(legacyBook).not.toBeNull();

      for (const ch of tb.chapters) {
        expect(ch.legacyChapterId).toBeTruthy();
        const legacyCh = await prisma.chapter.findUnique({
          where: { id: ch.legacyChapterId! },
        });
        expect(legacyCh).not.toBeNull();
        expect(legacyCh?.bookId).toBe(legacyBook?.id);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Rationalized Chapter Numbers & Deletion Flags
  // ---------------------------------------------------------------------------
  it("Verifies rationalized deletion flags on official deleted chapters", async () => {
    const deletedChapters = await prisma.curriculumChapter.findMany({
      where: { isDeleted: true },
      include: { textbook: { include: { subject: { include: { curriculumClass: true } } } } },
    });

    expect(deletedChapters.length).toBe(63);

    // Class 10 deleted chapters
    const c10Deleted = deletedChapters.filter((c) => c.textbook.subject.curriculumClass.classLevel === 10);
    const c10Titles = c10Deleted.map((c) => c.title);
    expect(c10Titles.some((t) => t.includes("रचनाएँ"))).toBe(true);
    expect(c10Titles.some((t) => t.includes("तत्वों का आवर्त वर्गीकरण"))).toBe(true);
    expect(c10Titles.some((t) => t.includes("ऊर्जा के स्रोत"))).toBe(true);
    expect(c10Titles.some((t) => t.includes("प्राकृतिक संसाधनों का संपोषित प्रबंधन"))).toBe(true);

    // Class 12 Chemistry deleted chapters
    const c12Chem = deletedChapters.filter(
      (c) => c.textbook.subject.curriculumClass.classLevel === 12 && c.textbook.subject.code === "220"
    );
    const c12ChemTitles = c12Chem.map((c) => c.title);
    expect(c12ChemTitles.some((t) => t.includes("ठोस अवस्था"))).toBe(true);
    expect(c12ChemTitles.some((t) => t.includes("पृष्ठ रसायन"))).toBe(true);
    expect(c12ChemTitles.some((t) => t.includes("बहुलक"))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 5. Stress Testing Chapter Marks Allocation (Empirical Defect Detection)
  // ---------------------------------------------------------------------------
  it("Empirically evaluates chapter marks reconciliation across all 27 subjects", async () => {
    const subjects = await prisma.curriculumSubject.findMany({
      include: {
        curriculumClass: true,
        textbooks: { include: { chapters: true } },
      },
      orderBy: [{ curriculumClass: { classLevel: "asc" } }, { code: "asc" }],
    });

    const mismatches: Array<{ subject: string; classLevel: number; theoryMarks: number; chapterSum: number; diff: number }> = [];

    for (const s of subjects) {
      const activeChapters = s.textbooks.flatMap((tb) => tb.chapters).filter((c) => !c.isDeleted);
      const chapterSum = activeChapters.reduce((acc, c) => acc + (c.officialMarks || 0), 0);
      if (chapterSum !== s.theoryMarks) {
        mismatches.push({
          subject: s.name,
          classLevel: s.curriculumClass.classLevel,
          theoryMarks: s.theoryMarks,
          chapterSum,
          diff: chapterSum - s.theoryMarks,
        });
      }
    }

    console.log("Observed Chapter Marks Mismatches:", JSON.stringify(mismatches, null, 2));

    // Verify that NO subject has an overflow (chapter marks > theory marks):
    const overflows = mismatches.filter((m) => m.diff > 0);
    expect(overflows.length).toBe(0);

    // Defect 1 Verified Fixed: Class 11 Physics has NO overflow (chapter marks sum = 70m)
    const c11PhysicsOverflow = mismatches.find((m) => m.classLevel === 11 && m.subject === "Physics" && m.diff > 0);
    expect(c11PhysicsOverflow).toBeUndefined();

    // Defect 2 Verified Fixed: Class 9 Sanskrit has NO overflow (chapter marks sum = 75m)
    const c9SanskritOverflow = mismatches.find((m) => m.classLevel === 9 && m.subject === "Sanskrit" && m.diff > 0);
    expect(c9SanskritOverflow).toBeUndefined();

    // Legitimate deficits (e.g. Map Work or Literature subsets) are preserved:
    const c9Social = mismatches.find((m) => m.classLevel === 9 && m.subject === "Social Science");
    expect(c9Social).toBeDefined();
    expect(c9Social?.chapterSum).toBe(71);
    expect(c9Social?.theoryMarks).toBe(75);

    const c9English = mismatches.find((m) => m.classLevel === 9 && m.subject === "English");
    expect(c9English?.chapterSum).toBe(55);

    const c10English = mismatches.find((m) => m.classLevel === 10 && m.subject === "English");
    expect(c10English?.chapterSum).toBe(59);
  });
});
