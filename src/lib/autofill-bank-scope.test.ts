import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { POST as autoFillRoute } from "@/app/api/papers/[id]/autofill/route";
import { prisma } from "./prisma";
import { isTemplateFiller } from "./templateFiller";

/**
 * Bank Auto-Fill may only place questions from the paper's own book (its class and subject), from the
 * chapters its blueprint covers. When the bank runs short it leaves the slot empty and says so; it never
 * fills the gap with generic template questions, whose stock content belongs to other classes.
 */
describe("Bank Auto-Fill stays inside the paper's class and subject", () => {
  const stamp = Date.now();
  let userId: string;
  const bookIds: string[] = [];
  let mathBookId: string;
  let mathChapterId: string;
  let blueprintId: string;
  let shortSecId: string;
  let mcqSecId: string;
  let paperId: string;
  let ownQuestionId: string;

  const run = async (body: Record<string, unknown> = {}) => {
    const req = new Request(`http://localhost/api/papers/${paperId}/autofill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const res = await autoFillRoute(req, { params: Promise.resolve({ id: paperId }) });
    return { status: res.status, data: await res.json() };
  };

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { name: `Scope ${stamp}`, email: `scope-${stamp}@test.internal`, passwordHash: "x", role: "TEACHER", department: "Mathematics", active: true },
    });
    userId = user.id;
    mockSessionUserId = userId;

    const mkBook = async (className: string, subject: string, chapterTitle: string) => {
      const book = await prisma.book.create({ data: { title: `${subject} ${className} ${stamp}`, subject, className, academicSession: "2026–27" } });
      bookIds.push(book.id);
      const ch = await prisma.chapter.create({ data: { bookId: book.id, number: 1, title: chapterTitle } });
      return { bookId: book.id, chapterId: ch.id };
    };
    const mkQuestion = (bookId: string, chapterId: string, type: string, text: string) =>
      prisma.question.create({
        data: {
          bookId,
          chapterId,
          type,
          text,
          answer: "x",
          optionsJson: type === "MCQ" ? JSON.stringify(["10", "100", "1000", "10000"]) : "[]",
          createdById: userId,
        },
      });

    const math6 = await mkBook("Class 6", "Mathematics", "Knowing Our Numbers");
    mathBookId = math6.bookId;
    mathChapterId = math6.chapterId;
    const math9 = await mkBook("Class 9", "Mathematics", "Polynomials");
    const sci6 = await mkBook("Class 6", "Science", "Components of Food");

    ownQuestionId = (await mkQuestion(mathBookId, mathChapterId, "SHORT", "Write the smallest 5-digit number and the greatest 5-digit number, then find their difference.")).id;
    // the same question types, in another class of the same subject and in the same class of another subject
    await mkQuestion(math9.bookId, math9.chapterId, "SHORT", "Find the zeroes of the polynomial x^2 - 3x + 2 and verify the relation with its coefficients.");
    await mkQuestion(math9.bookId, math9.chapterId, "MCQ", "The degree of the polynomial 4x^4 + 0x^3 + 0x^5 + 5x + 7 is:");
    await mkQuestion(sci6.bookId, sci6.chapterId, "SHORT", "Name two nutrients that give our body energy and one food rich in each.");
    await mkQuestion(sci6.bookId, sci6.chapterId, "MCQ", "Which nutrient is tested with iodine solution?");

    const bp = await prisma.blueprint.create({
      data: {
        name: `Class 6 Maths scope ${stamp}`,
        bookId: mathBookId,
        academicSession: "2026–27",
        examType: "QUARTERLY",
        durationMin: 60,
        chapters: { create: [{ chapterId: mathChapterId, marks: 10 }] },
        sections: {
          create: [
            { position: 1, title: "Section A", type: "MCQ", count: 2, marksEach: 1, orChoiceMode: "NOT_REQUIRED" },
            { position: 2, title: "Section B", type: "SHORT", count: 2, marksEach: 2, orChoiceMode: "NOT_REQUIRED" },
          ],
        },
      },
      include: { sections: true },
    });
    blueprintId = bp.id;
    mcqSecId = bp.sections.find((s) => s.type === "MCQ")!.id;
    shortSecId = bp.sections.find((s) => s.type === "SHORT")!.id;

    const paper = await prisma.paper.create({
      data: { blueprintId, title: `Class 6 Maths scope ${stamp}`, createdById: userId, status: "DRAFT", academicSession: "2026–27", schoolName: "Test School", layout: "PAGE" },
    });
    paperId = paper.id;
  });

  beforeEach(async () => {
    await prisma.paperQuestion.deleteMany({ where: { paperId } });
    // template questions an earlier run may have written into the book
    await prisma.question.deleteMany({ where: { bookId: mathBookId, NOT: { id: ownQuestionId } } });
  });

  afterAll(async () => {
    await prisma.paperQuestion.deleteMany({ where: { paperId } }).catch(() => {});
    await prisma.auditLog.deleteMany({ where: { entityType: "PAPER", entityId: paperId } }).catch(() => {});
    await prisma.paper.deleteMany({ where: { id: paperId } }).catch(() => {});
    await prisma.blueprint.deleteMany({ where: { id: blueprintId } }).catch(() => {});
    await prisma.question.deleteMany({ where: { bookId: { in: bookIds } } }).catch(() => {});
    await prisma.book.deleteMany({ where: { id: { in: bookIds } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
  });

  it("places only the paper's own bank questions and leaves the rest of the slots empty", async () => {
    const { status, data } = await run();
    expect(status).toBe(200);

    const items = await prisma.paperQuestion.findMany({ where: { paperId }, include: { question: true } });
    expect(items.map((i) => i.questionId)).toEqual([ownQuestionId]);
    for (const item of items) {
      expect(item.question.bookId).toBe(mathBookId);
      expect(isTemplateFiller(item.question)).toBe(false);
    }
    // nothing was written into the bank to stand in for missing questions
    expect(await prisma.question.count({ where: { bookId: mathBookId } })).toBe(1);

    expect(data.addedCount).toBe(1);
    expect(data.complete).toBe(false);
    expect(data.unfilled).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sectionId: mcqSecId, count: 2 }),
        expect.objectContaining({ sectionId: shortSecId, count: 1 }),
      ]),
    );
    // the teacher is told which slots are still empty and why
    expect(data.message).toMatch(/Class 6 Mathematics/);
    expect(data.message).toMatch(/Section A \(2 needed\)/);
    expect(data.message).toMatch(/Section B \(1 needed\)/);
  });

  it("says so, and adds nothing, when the bank has no matching question at all", async () => {
    await prisma.question.update({ where: { id: ownQuestionId }, data: { type: "LONG" } });
    try {
      const { data } = await run();
      expect(data.addedCount).toBe(0);
      expect(await prisma.paperQuestion.count({ where: { paperId } })).toBe(0);
      expect(data.message).toMatch(/Class 6 Mathematics/);
      expect(data.message).toMatch(/Section A \(2 needed\)/);
    } finally {
      await prisma.question.update({ where: { id: ownQuestionId }, data: { type: "SHORT" } });
    }
  });

  it("a section's own Auto-Fill (sent as targetSectionId) fills only that section", async () => {
    const { data } = await run({ targetSectionId: shortSecId });
    const items = await prisma.paperQuestion.findMany({ where: { paperId } });
    expect(items.every((i) => i.sectionId === shortSecId)).toBe(true);
    expect(data.unfilled.every((u: { sectionId: string }) => u.sectionId === shortSecId)).toBe(true);
  });

  it("leaves a required OR empty, and says so, when the bank has no second question for it", async () => {
    await prisma.blueprintSection.update({ where: { id: shortSecId }, data: { orChoiceMode: "REQUIRED" } });
    try {
      const { data } = await run({ sectionId: shortSecId });
      const items = await prisma.paperQuestion.findMany({ where: { paperId } });
      expect(items).toHaveLength(1);
      expect(items[0].questionId).toBe(ownQuestionId);
      expect(items[0].orQuestionId).toBeNull();
      expect(await prisma.question.count({ where: { bookId: mathBookId } })).toBe(1);
      expect(data.message).toMatch(/OR/);
    } finally {
      await prisma.blueprintSection.update({ where: { id: shortSecId }, data: { orChoiceMode: "NOT_REQUIRED" } });
    }
  });
});
