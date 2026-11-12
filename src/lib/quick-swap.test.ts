import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { PATCH as patchPaperItem } from "@/app/api/papers/[id]/questions/[itemId]/route";
import { GET as getSiblings } from "@/app/api/papers/[id]/questions/[itemId]/siblings/route";
import { prisma } from "./prisma";

/** The contract the builder's Quick Swap relies on: siblings come back as a bare array, and PATCH replaceWithQuestionId swaps the slot. */
describe("Quick Swap routes", () => {
  const stamp = Date.now();
  let userId: string;
  let bookId: string;
  let chapterId: string;
  let blueprintId: string;
  let sectionId: string;
  let paperId: string;
  let itemId: string;
  let placedId: string;
  let siblingId: string;

  const params = () => ({ params: Promise.resolve({ id: paperId, itemId }) });

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { name: `Swap ${stamp}`, email: `swap-${stamp}@test.internal`, passwordHash: "hash", role: "TEACHER", active: true },
    });
    userId = user.id;
    const book = await prisma.book.create({ data: { title: `Swap ${stamp}`, subject: "Science", className: "Class 8", academicSession: "2026–27" } });
    bookId = book.id;
    chapterId = (await prisma.chapter.create({ data: { bookId, number: 1, title: "Light" } })).id;
    const bp = await prisma.blueprint.create({
      data: {
        name: `Swap BP ${stamp}`,
        bookId,
        academicSession: "2026–27",
        examType: "ANNUAL",
        durationMin: 120,
        chapters: { create: [{ chapterId, marks: 6 }] },
        sections: { create: [{ position: 1, title: "Short Answer", instructions: "", type: "SHORT", count: 2, marksEach: 3 }] },
      },
      include: { sections: true },
    });
    blueprintId = bp.id;
    sectionId = bp.sections[0].id;
    paperId = (
      await prisma.paper.create({
        data: { title: `Swap paper ${stamp}`, blueprintId, layout: "PAGE", schoolName: "Test School", createdById: userId, status: "DRAFT" },
      })
    ).id;
  });

  beforeEach(async () => {
    mockSessionUserId = userId;
    await prisma.paperQuestion.deleteMany({ where: { paperId } });
    await prisma.question.deleteMany({ where: { bookId } });
    placedId = (await prisma.question.create({ data: { bookId, chapterId, type: "SHORT", text: "Placed: state Snell's law.", answer: "a", createdById: userId } })).id;
    siblingId = (await prisma.question.create({ data: { bookId, chapterId, type: "SHORT", text: "Sibling: define refraction.", answer: "b", createdById: userId } })).id;
    itemId = (await prisma.paperQuestion.create({ data: { paperId, sectionId, questionId: placedId, position: 0 } })).id;
  });

  afterAll(async () => {
    await prisma.paperQuestion.deleteMany({ where: { paperId } });
    await prisma.paper.deleteMany({ where: { id: paperId } });
    await prisma.question.deleteMany({ where: { bookId } });
    await prisma.blueprintSection.deleteMany({ where: { blueprintId } });
    await prisma.blueprintChapter.deleteMany({ where: { blueprintId } });
    await prisma.blueprint.deleteMany({ where: { id: blueprintId } });
    await prisma.chapter.deleteMany({ where: { bookId } });
    await prisma.book.deleteMany({ where: { id: bookId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("lists the unused questions of the same chapter as a bare array", async () => {
    const res = await getSiblings(new Request("http://localhost/x"), params());
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.map((q: { id: string }) => q.id)).toEqual([siblingId]);
  });

  it("PATCH with replaceWithQuestionId puts the sibling in the slot", async () => {
    const res = await patchPaperItem(
      new Request("http://localhost/x", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ replaceWithQuestionId: siblingId }) }),
      params(),
    );
    expect(res.status).toBe(200);
    expect((await prisma.paperQuestion.findUnique({ where: { id: itemId } }))?.questionId).toBe(siblingId);
  });
});
