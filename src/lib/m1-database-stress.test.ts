import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { paperCreateSchema, paperUpdateSchema, snapshotPayloadSchema } from "./schemas";
import { toPaperDto, toQuestionDto, toSnapshotDto } from "./dto";
import { Prisma } from "@prisma/client";

describe("Milestone 1 Empirical Stress Test: Prisma & Database Integrity", () => {
  let testUserId: string;
  let testBlueprintId: string;
  let testSectionId: string;
  let testQuestionId: string;
  let testBookId: string;
  let testChapterId: string;
  let baselineCounts: {
    users: number;
    books: number;
    chapters: number;
    questions: number;
    papers: number;
    snapshots: number;
  };

  beforeAll(async () => {
    // Record baseline counts
    baselineCounts = {
      users: await prisma.user.count(),
      books: await prisma.book.count(),
      chapters: await prisma.chapter.count(),
      questions: await prisma.question.count(),
      papers: await prisma.paper.count(),
      snapshots: await prisma.paperSnapshot.count(),
    };

    // Obtain an existing user, book, chapter, blueprint, and section
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("No user found in database");
    testUserId = user.id;

    const blueprint = await prisma.blueprint.findFirst({
      include: {
        book: { include: { chapters: true } },
        sections: true,
      },
    });
    if (!blueprint) throw new Error("No blueprint found in database");
    testBlueprintId = blueprint.id;
    testBookId = blueprint.book.id;
    testChapterId = blueprint.book.chapters[0].id;
    testSectionId = blueprint.sections[0].id;

    const question = await prisma.question.findFirst({
      where: { bookId: testBookId },
    });
    if (!question) throw new Error("No question found for book in database");
    testQuestionId = question.id;
  });

  afterAll(async () => {
    // Verify that all test artifacts were cleaned up
    const finalCounts = {
      users: await prisma.user.count(),
      books: await prisma.book.count(),
      chapters: await prisma.chapter.count(),
      questions: await prisma.question.count(),
      papers: await prisma.paper.count(),
      snapshots: await prisma.paperSnapshot.count(),
    };
    expect(finalCounts).toEqual(baselineCounts);
    await prisma.$disconnect();
  });

  describe("1. PaperSnapshot CRUD & Cascade Deletions", () => {
    it("creates, queries, and cascade-deletes paperSnapshots when paper is deleted", async () => {
      // 1. Create a parent paper
      const paper = await prisma.paper.create({
        data: {
          title: "Challenger Cascade Test Paper",
          blueprintId: testBlueprintId,
          layout: "BOOKLET",
          schoolName: "Challenger Academy",
          createdById: testUserId,
        },
      });

      expect(paper.id).toBeDefined();

      // 2. Create 3 snapshots for this paper
      const snapshot1 = await prisma.paperSnapshot.create({
        data: {
          paperId: paper.id,
          name: "Snapshot 1 - Initial",
          snapshotJson: JSON.stringify({ version: 1, title: paper.title }),
          createdById: testUserId,
        },
      });

      const snapshot2 = await prisma.paperSnapshot.create({
        data: {
          paperId: paper.id,
          name: "Snapshot 2 - Review",
          snapshotJson: JSON.stringify({ version: 2, title: paper.title }),
          createdById: testUserId,
        },
      });

      const snapshot3 = await prisma.paperSnapshot.create({
        data: {
          paperId: paper.id,
          name: "Snapshot 3 - Approved",
          snapshotJson: JSON.stringify({ version: 3, title: paper.title }),
          createdById: testUserId,
        },
      });

      expect(snapshot1.id).toBeDefined();
      expect(snapshot2.id).toBeDefined();
      expect(snapshot3.id).toBeDefined();

      // 3. Query snapshots by paperId
      const snapshots = await prisma.paperSnapshot.findMany({
        where: { paperId: paper.id },
        orderBy: { createdAt: "asc" },
        include: { createdBy: { select: { name: true } } },
      });

      expect(snapshots).toHaveLength(3);
      expect(snapshots.map((s) => s.name)).toEqual([
        "Snapshot 1 - Initial",
        "Snapshot 2 - Review",
        "Snapshot 3 - Approved",
      ]);

      // Verify toSnapshotDto
      const dtos = snapshots.map(toSnapshotDto);
      expect(dtos[0].name).toBe("Snapshot 1 - Initial");
      expect(dtos[0].createdByName).toBeDefined();

      // 4. Query parent paper with included snapshots relation
      const paperWithSnapshots = await prisma.paper.findUnique({
        where: { id: paper.id },
        include: { snapshots: true },
      });
      expect(paperWithSnapshots?.snapshots).toHaveLength(3);

      // 5. CASCADE DELETION TEST: Delete the parent paper
      await prisma.paper.delete({
        where: { id: paper.id },
      });

      // 6. Verify parent paper is gone
      const deletedPaper = await prisma.paper.findUnique({
        where: { id: paper.id },
      });
      expect(deletedPaper).toBeNull();

      // 7. Verify all 3 snapshots were CASCADE-DELETED from the database
      const remainingSnapshots = await prisma.paperSnapshot.findMany({
        where: { paperId: paper.id },
      });
      expect(remainingSnapshots).toHaveLength(0);

      // Verify by individual IDs as well
      const s1 = await prisma.paperSnapshot.findUnique({ where: { id: snapshot1.id } });
      const s2 = await prisma.paperSnapshot.findUnique({ where: { id: snapshot2.id } });
      const s3 = await prisma.paperSnapshot.findUnique({ where: { id: snapshot3.id } });
      expect(s1).toBeNull();
      expect(s2).toBeNull();
      expect(s3).toBeNull();
    });

    it("verifies dual cascade deletion: deletes both PaperQuestion items and PaperSnapshots when Paper is deleted", async () => {
      // 1. Create a paper
      const paper = await prisma.paper.create({
        data: {
          title: "Dual Cascade Test Paper",
          blueprintId: testBlueprintId,
          layout: "BOOKLET",
          schoolName: "Dual Cascade Academy",
          createdById: testUserId,
        },
      });

      // 2. Add a PaperQuestion item
      const item = await prisma.paperQuestion.create({
        data: {
          paperId: paper.id,
          sectionId: testSectionId,
          questionId: testQuestionId,
          position: 1,
        },
      });

      // 3. Add a PaperSnapshot
      const snapshot = await prisma.paperSnapshot.create({
        data: {
          paperId: paper.id,
          name: "Dual Cascade Snapshot",
          snapshotJson: JSON.stringify({ items: [item.id] }),
          createdById: testUserId,
        },
      });

      expect(item.id).toBeDefined();
      expect(snapshot.id).toBeDefined();

      // 4. Delete the paper
      await prisma.paper.delete({ where: { id: paper.id } });

      // 5. Verify BOTH item and snapshot are cascade deleted
      const itemsRemaining = await prisma.paperQuestion.findMany({ where: { paperId: paper.id } });
      const snapshotsRemaining = await prisma.paperSnapshot.findMany({ where: { paperId: paper.id } });
      expect(itemsRemaining).toHaveLength(0);
      expect(snapshotsRemaining).toHaveLength(0);
    });

    it("handles large snapshotJson payloads without truncation or data corruption", async () => {
      const paper = await prisma.paper.create({
        data: {
          title: "Large Payload Test Paper",
          blueprintId: testBlueprintId,
          layout: "BOOKLET",
          schoolName: "Large Payload School",
          createdById: testUserId,
        },
      });

      // Generate a large payload (100 mock question items)
      const mockItems = Array.from({ length: 100 }, (_, i) => ({
        sectionId: `sec-${i % 5}`,
        position: i + 1,
        questionId: `q-mock-${i}`,
        text: `Long question text with math $\\sum_{k=1}^n k = \\frac{n(n+1)}{2}$ question #${i}`,
        subparts: [
          { label: "(a)", text: "Subpart a text", marks: 2 },
          { label: "(b)", text: "Subpart b text", marks: 3 },
        ],
      }));
      const serialized = JSON.stringify({ items: mockItems, meta: "large payload test" });

      const snapshot = await prisma.paperSnapshot.create({
        data: {
          paperId: paper.id,
          name: "Large Payload Snapshot",
          snapshotJson: serialized,
          createdById: testUserId,
        },
      });

      try {
        const retrieved = await prisma.paperSnapshot.findUniqueOrThrow({
          where: { id: snapshot.id },
        });

        expect(retrieved.snapshotJson).toBe(serialized);
        const parsed = JSON.parse(retrieved.snapshotJson);
        expect(parsed.items).toHaveLength(100);
      } finally {
        await prisma.paper.delete({ where: { id: paper.id } });
      }
    });

    it("enforces foreign key constraints: fails to create snapshot with invalid paperId or createdById", async () => {
      // Non-existent paperId
      await expect(
        prisma.paperSnapshot.create({
          data: {
            paperId: "non-existent-paper-id-99999",
            name: "Orphan Snapshot",
            snapshotJson: "{}",
            createdById: testUserId,
          },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

      // Non-existent createdById
      const paper = await prisma.paper.create({
        data: {
          title: "FK Test Paper",
          blueprintId: testBlueprintId,
          layout: "PAGE",
          schoolName: "FK Academy",
          createdById: testUserId,
        },
      });

      try {
        await expect(
          prisma.paperSnapshot.create({
            data: {
              paperId: paper.id,
              name: "Invalid User Snapshot",
              snapshotJson: "{}",
              createdById: "non-existent-user-id-99999",
            },
          }),
        ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
      } finally {
        await prisma.paper.delete({ where: { id: paper.id } });
      }
    });
  });

  describe("2. Legacy Payloads & Default Paper Customization Values", () => {
    it("successfully creates a paper with minimal legacy payload omitting all customization fields", async () => {
      // Legacy payload containing only pre-M1 mandatory fields
      const legacyPayload = {
        title: "Legacy Mid-Term Exam 2026",
        blueprintId: testBlueprintId,
        layout: "BOOKLET" as const,
        schoolName: "Heritage Public School",
      };

      // 1. Zod parse should populate all default values
      const parsed = paperCreateSchema.parse(legacyPayload);

      expect(parsed.academicSession).toBe("2025–26");
      expect(parsed.printDensity).toBe("STANDARD");
      expect(parsed.twoColumn).toBe(false);
      expect(parsed.targetPages).toBeNull();
      expect(parsed.numberingStyle).toBe("CONTINUOUS");
      expect(parsed.marksStyle).toBe("INLINE");
      expect(parsed.showCandidateDetails).toBe(true);
      expect(parsed.showSignatures).toBe(false);
      expect(parsed.examDate).toBe("");
      expect(parsed.paperSet).toBe("");
      expect(parsed.subjectCode).toBe("");
      expect(parsed.generalInstructions).toBe("");
      expect(parsed.schoolLogo).toBeNull();
      expect(parsed.logoPath).toBeNull();

      // 2. Insert into actual SQLite DB via Prisma
      const paper = await prisma.paper.create({
        data: {
          ...parsed,
          createdById: testUserId,
        },
      });

      try {
        expect(paper.id).toBeDefined();

        // 3. Query back from DB to verify actual SQLite row contents
        const retrieved = await prisma.paper.findUniqueOrThrow({
          where: { id: paper.id },
        });

        expect(retrieved.academicSession).toBe("2025–26");
        expect(retrieved.printDensity).toBe("STANDARD");
        expect(retrieved.twoColumn).toBe(false);
        expect(retrieved.targetPages).toBeNull();
        expect(retrieved.numberingStyle).toBe("CONTINUOUS");
        expect(retrieved.marksStyle).toBe("INLINE");
        expect(retrieved.showCandidateDetails).toBe(true);
        expect(retrieved.showSignatures).toBe(false);
        expect(retrieved.examDate).toBe("");
        expect(retrieved.paperSet).toBe("");
        expect(retrieved.subjectCode).toBe("");
        expect(retrieved.generalInstructions).toBe("");

        // 4. Verify toPaperDto mapping (requires cast because Prisma Paper model has printDensity as string, while toPaperDto parameter requires PrintDensity union)
        const dto = toPaperDto(retrieved as any);
        expect(dto.academicSession).toBe("2025–26");
        expect(dto.printDensity).toBe("STANDARD");
        expect(dto.twoColumn).toBe(false);
        expect(dto.targetPages).toBeNull();
        expect(dto.numberingStyle).toBe("CONTINUOUS");
        expect(dto.marksStyle).toBe("INLINE");
      } finally {
        await prisma.paper.delete({ where: { id: paper.id } });
      }
    });

    it("persists base64 data URLs in schoolLogo and logo file paths in logoPath", async () => {
      const base64Sample = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const paper = await prisma.paper.create({
        data: {
          title: "Branding Test Paper",
          blueprintId: testBlueprintId,
          layout: "PAGE",
          schoolName: "Branded High",
          schoolLogo: base64Sample,
          logoPath: "uploads/logo-abc.png",
          createdById: testUserId,
        },
      });

      try {
        const stored = await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } });
        expect(stored.schoolLogo).toBe(base64Sample);
        expect(stored.logoPath).toBe("uploads/logo-abc.png");
      } finally {
        await prisma.paper.delete({ where: { id: paper.id } });
      }
    });
  });

  describe("3. Edge Cases for Paper.targetPages", () => {
    it("handles targetPages: null (omitted vs explicit) and stores null in DB", async () => {
      // Omitted targetPages
      const omittedInput = paperCreateSchema.parse({
        title: "TargetPages Null Test (Omitted)",
        blueprintId: testBlueprintId,
        layout: "PAGE",
        schoolName: "Test School",
      });
      expect(omittedInput.targetPages).toBeNull();

      // Explicitly null targetPages
      const explicitNullInput = paperCreateSchema.parse({
        title: "TargetPages Null Test (Explicit)",
        blueprintId: testBlueprintId,
        layout: "PAGE",
        schoolName: "Test School",
        targetPages: null,
      });
      expect(explicitNullInput.targetPages).toBeNull();

      // Persist to DB and verify
      const paper = await prisma.paper.create({
        data: { ...explicitNullInput, createdById: testUserId },
      });

      try {
        const stored = await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } });
        expect(stored.targetPages).toBeNull();
        expect(toPaperDto(stored as any).targetPages).toBeNull();
      } finally {
        await prisma.paper.delete({ where: { id: paper.id } });
      }
    });

    it("handles targetPages with valid boundary integers (1, 4, 100) in DB", async () => {
      for (const pages of [1, 4, 100]) {
        const input = paperCreateSchema.parse({
          title: `TargetPages Boundary Test ${pages}`,
          blueprintId: testBlueprintId,
          layout: "BOOKLET",
          schoolName: "Boundary Academy",
          targetPages: pages,
        });
        expect(input.targetPages).toBe(pages);

        const paper = await prisma.paper.create({
          data: { ...input, createdById: testUserId },
        });

        try {
          const stored = await prisma.paper.findUniqueOrThrow({ where: { id: paper.id } });
          expect(stored.targetPages).toBe(pages);
          expect(toPaperDto(stored as any).targetPages).toBe(pages);
        } finally {
          await prisma.paper.delete({ where: { id: paper.id } });
        }
      }
    });

    it("rejects invalid targetPages inputs: 0, negative integers, floats, and > 100", () => {
      const base = {
        title: "Invalid TargetPages Paper",
        blueprintId: testBlueprintId,
        layout: "PAGE" as const,
        schoolName: "Error School",
      };

      // 0 pages
      expect(() => paperCreateSchema.parse({ ...base, targetPages: 0 })).toThrow();
      // Negative pages
      expect(() => paperCreateSchema.parse({ ...base, targetPages: -1 })).toThrow();
      expect(() => paperCreateSchema.parse({ ...base, targetPages: -10 })).toThrow();
      // Float
      expect(() => paperCreateSchema.parse({ ...base, targetPages: 2.5 })).toThrow();
      expect(() => paperCreateSchema.parse({ ...base, targetPages: 0.1 })).toThrow();
      // Exceeding max (100)
      expect(() => paperCreateSchema.parse({ ...base, targetPages: 101 })).toThrow();
      expect(() => paperCreateSchema.parse({ ...base, targetPages: 999 })).toThrow();
    });

    it("supports patching targetPages from integer to null and vice versa via paperUpdateSchema", async () => {
      const paper = await prisma.paper.create({
        data: {
          title: "Patch TargetPages Paper",
          blueprintId: testBlueprintId,
          layout: "BOOKLET",
          schoolName: "Patch School",
          targetPages: 4,
          createdById: testUserId,
        },
      });

      try {
        expect(paper.targetPages).toBe(4);

        // 1. Patch to null
        const updateToNull = paperUpdateSchema.parse({ targetPages: null });
        const updated1 = await prisma.paper.update({
          where: { id: paper.id },
          data: updateToNull,
        });
        expect(updated1.targetPages).toBeNull();

        // 2. Patch to 8
        const updateTo8 = paperUpdateSchema.parse({ targetPages: 8 });
        const updated2 = await prisma.paper.update({
          where: { id: paper.id },
          data: updateTo8,
        });
        expect(updated2.targetPages).toBe(8);
      } finally {
        await prisma.paper.delete({ where: { id: paper.id } });
      }
    });
  });

  describe("4. Question Subparts & CASE_STUDY Database Persistence", () => {
    it("persists subpartsJson for CASE_STUDY question and retrieves it via toQuestionDto", async () => {
      const subpartsData = [
        { label: "(a)", text: "State Gauss Law.", marks: 1, answer: "Phi = q/eps0" },
        { label: "(b)", text: "Calculate electric flux through a sphere.", marks: 1, answer: "q/eps0" },
        { label: "(c)", text: "Derive electric field near an infinite sheet.", marks: 2, answer: "sigma/(2*eps0)" },
      ];

      const question = await prisma.question.create({
        data: {
          bookId: testBookId,
          chapterId: testChapterId,
          type: "CASE_STUDY",
          text: "Electrostatics Case Study: Consider a charged spherical shell...",
          optionsJson: "[]",
          subpartsJson: JSON.stringify(subpartsData),
          difficulty: "HARD",
          createdById: testUserId,
        },
      });

      try {
        const stored = await prisma.question.findUniqueOrThrow({
          where: { id: question.id },
          include: { chapter: true },
        });

        const dto = toQuestionDto(stored);
        expect(dto.subparts).toHaveLength(3);
        expect(dto.subparts[0].label).toBe("(a)");
        expect(dto.subparts[0].marks).toBe(1);
        expect(dto.subparts[2].label).toBe("(c)");
        expect(dto.subparts[2].marks).toBe(2);

        // Verify total subpart marks
        const totalMarks = dto.subparts.reduce((sum, s) => sum + s.marks, 0);
        expect(totalMarks).toBe(4);
      } finally {
        await prisma.question.delete({ where: { id: question.id } });
      }
    });

    it("handles corrupt subpartsJson gracefully without throwing", () => {
      const rawWithCorruptSubparts = {
        id: "q-corrupt-sub",
        bookId: testBookId,
        chapterId: testChapterId,
        type: "CASE_STUDY",
        text: "Question with corrupt JSON",
        optionsJson: "[]",
        subpartsJson: "{malformed json",
        answer: "",
        difficulty: "MEDIUM",
        imagePath: null,
        spaceMm: 0,
        showGrid: false,
        createdById: testUserId,
        createdAt: new Date(),
      };

      const dto = toQuestionDto(rawWithCorruptSubparts as any);
      expect(dto.subparts).toEqual([]);
    });
  });

  describe("5. Blueprint subjectCode Persistence", () => {
    it("persists and updates subjectCode on Blueprint model", async () => {
      const original = await prisma.blueprint.findUniqueOrThrow({
        where: { id: testBlueprintId },
        select: { subjectCode: true },
      });

      // Update subjectCode
      await prisma.blueprint.update({
        where: { id: testBlueprintId },
        data: { subjectCode: "042" },
      });

      const updated = await prisma.blueprint.findUniqueOrThrow({
        where: { id: testBlueprintId },
        select: { subjectCode: true },
      });
      expect(updated.subjectCode).toBe("042");

      // Revert to original
      await prisma.blueprint.update({
        where: { id: testBlueprintId },
        data: { subjectCode: original.subjectCode },
      });
    });
  });

  describe("6. Snapshot Payload Schema Validation", () => {
    it("validates full snapshot payload with all paper customization fields", () => {
      const fullSnapshotPayload = {
        paperId: "paper-123",
        title: "Mathematics Annual Exam 2026",
        layout: "BOOKLET" as const,
        schoolName: "Delhi Public School",
        examDate: "2026-03-20",
        paperSet: "SET 1",
        subjectCode: "041",
        generalInstructions: "Section A is compulsory.",
        academicSession: "2025–26",
        logoPath: "school-logo.png",
        schoolLogo: "https://example.com/logo.png",
        printDensity: "COMPACT" as const,
        twoColumn: true,
        targetPages: 4,
        numberingStyle: "PREFIXED" as const,
        marksStyle: "RIGHT_COLUMN" as const,
        showCandidateDetails: true,
        showSignatures: true,
        items: [
          {
            sectionId: "sec-1",
            position: 0,
            questionId: "q-1",
            orQuestionId: null,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      const result = snapshotPayloadSchema.safeParse(fullSnapshotPayload);
      expect(result.success).toBe(true);
    });
  });
});
