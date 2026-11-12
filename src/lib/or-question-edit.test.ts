import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { PUT as editPaperItem } from "@/app/api/papers/[id]/questions/[itemId]/route";
import { prisma } from "./prisma";

/** Editing a slot's alternate (OR) question in place: PUT /api/papers/:id/questions/:itemId with target "or". */
describe("edit the OR question of a paper slot", () => {
  const stamp = Date.now();
  let userId: string;
  let bookId: string;
  let ch1: string;
  let ch2: string;
  let blueprintId: string;
  let sectionId: string;
  let paperId: string;
  let itemId: string;
  let primaryId: string;
  let orId: string;

  const put = (json: unknown) =>
    editPaperItem(
      new Request(`http://localhost/api/papers/${paperId}/questions/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      }),
      { params: Promise.resolve({ id: paperId, itemId }) },
    );

  const question = (over: Record<string, unknown> = {}) => ({
    bookId,
    chapterId: ch1,
    type: "SHORT",
    text: "Edited OR: explain why a plane mirror image is laterally inverted.",
    options: [],
    subparts: [],
    answer: "Each point is reflected straight back, so left and right swap.",
    difficulty: "MEDIUM",
    ...over,
  });

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { name: `OR edit ${stamp}`, email: `or-edit-${stamp}@test.internal`, passwordHash: "hash", role: "TEACHER", active: true },
    });
    userId = user.id;
    const book = await prisma.book.create({ data: { title: `OR edit ${stamp}`, subject: "Science", className: "Class 8", academicSession: "2026–27" } });
    bookId = book.id;
    ch1 = (await prisma.chapter.create({ data: { bookId, number: 1, title: "Light" } })).id;
    ch2 = (await prisma.chapter.create({ data: { bookId, number: 2, title: "Sound" } })).id;
    const bp = await prisma.blueprint.create({
      data: {
        name: `OR edit BP ${stamp}`,
        bookId,
        academicSession: "2026–27",
        examType: "ANNUAL",
        durationMin: 120,
        chapters: { create: [{ chapterId: ch1, marks: 6 }, { chapterId: ch2, marks: 6 }] },
        sections: { create: [{ position: 1, title: "Short Answer", instructions: "", type: "SHORT", count: 4, marksEach: 3 }] },
      },
      include: { sections: true },
    });
    blueprintId = bp.id;
    sectionId = bp.sections[0].id;
    paperId = (
      await prisma.paper.create({
        data: { title: `OR edit paper ${stamp}`, blueprintId, layout: "PAGE", schoolName: "Test School", createdById: userId, status: "DRAFT" },
      })
    ).id;
  });

  beforeEach(async () => {
    mockSessionUserId = userId;
    await prisma.paperQuestion.deleteMany({ where: { paperId } });
    primaryId = (
      await prisma.question.create({
        data: { bookId, chapterId: ch1, type: "SHORT", text: "State the two laws of reflection.", answer: "i = r; same plane.", createdById: userId },
      })
    ).id;
    orId = (
      await prisma.question.create({
        data: { bookId, chapterId: ch1, type: "SHORT", text: "Original OR: why is a mirror image laterally inverted?", answer: "old", createdById: userId },
      })
    ).id;
    itemId = (await prisma.paperQuestion.create({ data: { paperId, sectionId, questionId: primaryId, orQuestionId: orId, position: 0 } })).id;
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

  it("updates the OR question in the bank, leaving the main question alone", async () => {
    const res = await put({ mode: "UPDATE_MASTER", target: "or", question: question() });
    expect(res.status).toBe(200);
    const or = await prisma.question.findUnique({ where: { id: orId } });
    expect(or?.text).toMatch(/^Edited OR/);
    expect(or?.answer).toMatch(/left and right swap/);
    const item = await prisma.paperQuestion.findUnique({ where: { id: itemId } });
    expect(item).toMatchObject({ questionId: primaryId, orQuestionId: orId });
    expect((await prisma.question.findUnique({ where: { id: primaryId } }))?.text).toBe("State the two laws of reflection.");
  });

  it("saves a copy for this paper only, keeping the bank's OR question unchanged", async () => {
    const res = await put({ mode: "FORK_COPY", target: "or", question: question() });
    expect(res.status).toBe(200);
    const item = await prisma.paperQuestion.findUnique({ where: { id: itemId } });
    expect(item?.questionId).toBe(primaryId);
    expect(item?.orQuestionId).not.toBe(orId);
    expect((await prisma.question.findUnique({ where: { id: item!.orQuestionId! } }))?.text).toMatch(/^Edited OR/);
    expect((await prisma.question.findUnique({ where: { id: orId } }))?.text).toMatch(/^Original OR/);
  });

  it("returns the paper with the edited OR question in place", async () => {
    const res = await put({ mode: "UPDATE_MASTER", target: "or", question: question() });
    const view = await res.json();
    const slot = view.items.find((i: { id: string }) => i.id === itemId);
    expect(slot.question.text).toBe("State the two laws of reflection.");
    expect(slot.orQuestion.text).toMatch(/^Edited OR/);
  });

  it("refuses an OR question moved to another chapter", async () => {
    const res = await put({ mode: "UPDATE_MASTER", target: "or", question: question({ chapterId: ch2 }) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/must match primary question chapter/);
    expect((await prisma.question.findUnique({ where: { id: orId } }))?.text).toMatch(/^Original OR/);
  });

  it("refuses subparts that do not add up to the slot's marks", async () => {
    const subparts = [{ label: "(a)", text: "Part a", marks: 1, answer: "" }, { label: "(b)", text: "Part b", marks: 1, answer: "" }];
    const res = await put({ mode: "UPDATE_MASTER", target: "or", question: question({ subparts }) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/total marks \(2\) must match section marks \(3\)/);
  });

  it("refuses an OR question identical to the main question", async () => {
    const res = await put({ mode: "UPDATE_MASTER", target: "or", question: question({ text: "State the two laws of reflection." }) });
    expect(res.status).toBe(400);
  });

  it("refuses to edit an OR question on a slot that has none", async () => {
    await prisma.paperQuestion.update({ where: { id: itemId }, data: { orQuestionId: null } });
    const res = await put({ mode: "UPDATE_MASTER", target: "or", question: question() });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no alternate \(OR\) question/);
  });

  it("refuses a bank edit of a main question that another finalised paper uses as its OR question", async () => {
    const other = await prisma.question.create({
      data: { bookId, chapterId: ch1, type: "SHORT", text: "Another main question for the finalised paper.", answer: "x", createdById: userId },
    });
    const finalPaper = await prisma.paper.create({
      data: { title: `OR edit final ${stamp}`, blueprintId, layout: "PAGE", schoolName: "Test School", createdById: userId, status: "FINAL" },
    });
    try {
      await prisma.paperQuestion.create({ data: { paperId: finalPaper.id, sectionId, questionId: other.id, orQuestionId: primaryId, position: 0 } });
      const res = await put({ mode: "UPDATE_MASTER", question: question({ text: "Edited main: state the laws of reflection." }) });
      expect(res.status).toBe(409);
      expect((await res.json()).error).toMatch(/part of another finalised paper/);
      expect((await prisma.question.findUnique({ where: { id: primaryId } }))?.text).toBe("State the two laws of reflection.");
    } finally {
      await prisma.paperQuestion.deleteMany({ where: { paperId: finalPaper.id } });
      await prisma.paper.deleteMany({ where: { id: finalPaper.id } });
    }
  });

  it("still edits the main question when no target is sent", async () => {
    const res = await put({ mode: "UPDATE_MASTER", question: question({ text: "Edited main: state the laws of reflection." }) });
    expect(res.status).toBe(200);
    expect((await prisma.question.findUnique({ where: { id: primaryId } }))?.text).toMatch(/^Edited main/);
    expect((await prisma.question.findUnique({ where: { id: orId } }))?.text).toMatch(/^Original OR/);
  });
});
