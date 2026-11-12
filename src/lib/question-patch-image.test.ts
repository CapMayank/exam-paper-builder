import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { PATCH as patchQuestion } from "@/app/api/questions/[id]/route";
import { questionPatchSchema } from "./schemas";
import { prisma } from "./prisma";

const IMG = "0b9e8a52-1c34-4d6e-9f10-a1b2c3d4e5f6.png";

describe("questionPatchSchema imagePath", () => {
  it("keeps a stored image name", () => {
    expect(questionPatchSchema.parse({ imagePath: IMG }).imagePath).toBe(IMG);
  });
  it("keeps null (remove the diagram)", () => {
    expect(questionPatchSchema.parse({ imagePath: null }).imagePath).toBeNull();
  });
  it("rejects a path that is not an uploaded file name", () => {
    expect(() => questionPatchSchema.parse({ imagePath: "../../etc/passwd" })).toThrow();
  });
  it("leaves imagePath undefined when not sent", () => {
    expect(questionPatchSchema.parse({ text: "hello there" }).imagePath).toBeUndefined();
  });
});

describe("PATCH /api/questions/:id with imagePath", () => {
  const stamp = Date.now();
  let userId: string;
  let bookId: string;
  let questionId: string;

  const patch = (json: unknown) =>
    patchQuestion(
      new Request(`http://localhost/api/questions/${questionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(json) }),
      { params: Promise.resolve({ id: questionId }) },
    );

  beforeAll(async () => {
    mockSessionUserId = null;
    const user = await prisma.user.create({
      data: { name: `Img ${stamp}`, email: `img-${stamp}@test.internal`, passwordHash: "hash", role: "TEACHER", active: true },
    });
    userId = user.id;
    mockSessionUserId = userId;
    bookId = (await prisma.book.create({ data: { title: `Img ${stamp}`, subject: "Science", className: "Class 8", academicSession: "2026–27" } })).id;
    const ch = await prisma.chapter.create({ data: { bookId, number: 1, title: "Light" } });
    questionId = (await prisma.question.create({ data: { bookId, chapterId: ch.id, type: "SHORT", text: "Label the diagram.", answer: "a", createdById: userId } })).id;
  });

  afterAll(async () => {
    await prisma.question.deleteMany({ where: { bookId } });
    await prisma.chapter.deleteMany({ where: { bookId } });
    await prisma.book.deleteMany({ where: { id: bookId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("adds, then removes, the diagram", async () => {
    expect((await patch({ imagePath: IMG })).status).toBe(200);
    expect((await prisma.question.findUnique({ where: { id: questionId } }))?.imagePath).toBe(IMG);
    expect((await patch({ imagePath: null })).status).toBe(200);
    expect((await prisma.question.findUnique({ where: { id: questionId } }))?.imagePath).toBeNull();
  });
});
