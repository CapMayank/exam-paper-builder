import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { PATCH as patchItem, PUT as editItem } from "@/app/api/papers/[id]/questions/[itemId]/route";
import { evaluatePaperInternalChoiceCompliance, OR_CHAPTER_REQUIRED, orChapterRule } from "./internalChoiceRules";
import { prisma } from "./prisma";

describe("orChapterRule", () => {
  it("is a guideline up to class 8 and for a class it cannot read as a number", () => {
    for (const c of ["Class 1", "Class 8", "8th", "Class VIII", "Nursery", "KG", "", null, undefined]) expect(orChapterRule(c)).toBe("guideline");
  });

  it("is required from class 9, in digits, ordinals or Roman numerals", () => {
    for (const c of ["Class 9", "Class 10", "10th", "Class 12 (Science)", "Class X", "Class IX", "XII"]) expect(orChapterRule(c)).toBe("required");
  });
});

/** The internal-choice audit decides whether a paper can be finalised: an OR from another chapter must not stop a class 1 to 8 paper. */
describe("internal-choice audit of an OR from another chapter", () => {
  const audit = (className: string) =>
    evaluatePaperInternalChoiceCompliance({
      schoolName: "Test School",
      blueprintName: "OR rule audit",
      className,
      academicSession: "2026-27",
      subject: "Science",
      sections: [{ id: "sec-b", title: "Section B", type: "SHORT", count: 1, marksEach: 3, orChoiceMode: "REQUIRED" }],
      items: [
        {
          sectionId: "sec-b",
          question: { id: "q1", chapterId: "ch-1", type: "SHORT", text: "State the two laws of reflection." },
          orQuestion: { id: "q1-or", chapterId: "ch-2", type: "SHORT", text: "Explain how an echo is formed." },
        },
      ],
    });

  it("is compliant up to class 8", () => {
    expect(audit("Class 6").compliant).toBe(true);
    expect(audit("Class 6").invalidChoiceSlots).toHaveLength(0);
  });

  it("is an invalid OR from class 9", () => {
    expect(audit("Class 10").compliant).toBe(false);
    expect(audit("Class 10").invalidChoiceSlots).toHaveLength(1);
  });
});

/** Linking an OR from another chapter: PATCH /api/papers/:id/questions/:itemId with { orQuestionId }. */
describe("linking an OR question from another chapter", () => {
  const stamp = Date.now();
  let userId: string;
  const bookIds: string[] = [];
  const blueprintIds: string[] = [];
  const paperIds: string[] = [];

  /** A one-section paper for a book of this class, with a main question from chapter 1 placed in its first slot. */
  async function slotFor(className: string) {
    const tag = `${stamp}-${className}-${bookIds.length}`;
    const book = await prisma.book.create({ data: { title: `OR rule ${tag}`, subject: "Science", className, academicSession: "2026–27" } });
    bookIds.push(book.id);
    const ch1 = (await prisma.chapter.create({ data: { bookId: book.id, number: 1, title: "Light" } })).id;
    const ch2 = (await prisma.chapter.create({ data: { bookId: book.id, number: 2, title: "Sound" } })).id;
    const bp = await prisma.blueprint.create({
      data: {
        name: `OR rule BP ${tag}`,
        bookId: book.id,
        academicSession: "2026–27",
        examType: "ANNUAL",
        durationMin: 120,
        chapters: { create: [{ chapterId: ch1, marks: 6 }, { chapterId: ch2, marks: 6 }] },
        sections: { create: [{ position: 1, title: "Short Answer", instructions: "", type: "SHORT", count: 4, marksEach: 3 }] },
      },
      include: { sections: true },
    });
    blueprintIds.push(bp.id);
    const paperId = (
      await prisma.paper.create({
        data: { title: `OR rule paper ${tag}`, blueprintId: bp.id, layout: "PAGE", schoolName: "Test School", createdById: userId, status: "DRAFT" },
      })
    ).id;
    paperIds.push(paperId);
    const primary = await prisma.question.create({
      data: { bookId: book.id, chapterId: ch1, type: "SHORT", text: "State the two laws of reflection.", answer: "i = r; same plane.", createdById: userId },
    });
    const otherChapter = await prisma.question.create({
      data: { bookId: book.id, chapterId: ch2, type: "SHORT", text: "Explain how an echo is formed.", answer: "Sound reflects off a far surface.", createdById: userId },
    });
    const itemId = (await prisma.paperQuestion.create({ data: { paperId, sectionId: bp.sections[0].id, questionId: primary.id, position: 0 } })).id;
    return { paperId, itemId, orId: otherChapter.id, bookId: book.id, ch1, ch2, primaryId: primary.id };
  }

  /** A slot of a paper for this class holding a main question and an OR, both from chapter 1. */
  async function pairedSlotFor(className: string) {
    const slot = await slotFor(className);
    const or = await prisma.question.create({
      data: { bookId: slot.bookId, chapterId: slot.ch1, type: "SHORT", text: "Why is a mirror image laterally inverted?", answer: "Left and right swap.", createdById: userId },
    });
    await prisma.paperQuestion.update({ where: { id: slot.itemId }, data: { orQuestionId: or.id } });
    return { ...slot, pairedOrId: or.id };
  }

  const call = (method: "PATCH" | "PUT", paperId: string, itemId: string, json: unknown) =>
    (method === "PATCH" ? patchItem : editItem)(
      new Request(`http://localhost/api/papers/${paperId}/questions/${itemId}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      }),
      { params: Promise.resolve({ id: paperId, itemId }) },
    );

  const edited = (bookId: string, chapterId: string, text: string) => ({
    bookId,
    chapterId,
    type: "SHORT",
    text,
    options: [],
    subparts: [],
    answer: "Model answer.",
    difficulty: "MEDIUM",
  });

  const link = (paperId: string, itemId: string, orQuestionId: string) => call("PATCH", paperId, itemId, { orQuestionId });

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { name: `OR rule ${stamp}`, email: `or-rule-${stamp}@test.internal`, passwordHash: "hash", role: "TEACHER", active: true },
    });
    userId = user.id;
    mockSessionUserId = userId;
  });

  afterAll(async () => {
    await prisma.paperQuestion.deleteMany({ where: { paperId: { in: paperIds } } });
    await prisma.paper.deleteMany({ where: { id: { in: paperIds } } });
    await prisma.question.deleteMany({ where: { bookId: { in: bookIds } } });
    await prisma.blueprintSection.deleteMany({ where: { blueprintId: { in: blueprintIds } } });
    await prisma.blueprintChapter.deleteMany({ where: { blueprintId: { in: blueprintIds } } });
    await prisma.blueprint.deleteMany({ where: { id: { in: blueprintIds } } });
    await prisma.chapter.deleteMany({ where: { bookId: { in: bookIds } } });
    await prisma.book.deleteMany({ where: { id: { in: bookIds } } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("is accepted on a class 6 paper", async () => {
    const { paperId, itemId, orId } = await slotFor("Class 6");
    const res = await link(paperId, itemId, orId);
    expect((await res.clone().json()).error).toBeUndefined();
    expect(res.status).toBe(200);
    expect((await prisma.paperQuestion.findUnique({ where: { id: itemId } }))?.orQuestionId).toBe(orId);
  });

  it("is refused with status 400 on a class 10 paper", async () => {
    const { paperId, itemId, orId } = await slotFor("Class 10");
    const res = await link(paperId, itemId, orId);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(`${OR_CHAPTER_REQUIRED} (Chapter 1: Light)`);
    expect((await prisma.paperQuestion.findUnique({ where: { id: itemId } }))?.orQuestionId).toBeNull();
  });

  describe("replacing or editing a slot that already has an OR", () => {
    it("replacing the main question with one from another chapter keeps the OR up to class 8, unlinks it from class 9", async () => {
      for (const [className, keeps] of [["Class 6", true], ["Class 10", false]] as const) {
        const { paperId, itemId, bookId, ch2, pairedOrId } = await pairedSlotFor(className);
        const replacement = await prisma.question.create({
          data: { bookId, chapterId: ch2, type: "SHORT", text: "What is the speed of sound in air?", answer: "About 340 m/s.", createdById: userId },
        });
        const res = await call("PATCH", paperId, itemId, { replaceWithQuestionId: replacement.id });
        expect(res.status, className).toBe(200);
        const item = await prisma.paperQuestion.findUnique({ where: { id: itemId } });
        expect(item?.questionId, className).toBe(replacement.id);
        expect(item?.orQuestionId, className).toBe(keeps ? pairedOrId : null);
      }
    });

    it("editing the OR question into another chapter is accepted up to class 8, refused from class 9", async () => {
      for (const [className, accepted] of [["Class 6", true], ["Class 10", false]] as const) {
        const { paperId, itemId, bookId, ch2, pairedOrId } = await pairedSlotFor(className);
        const res = await call("PUT", paperId, itemId, { mode: "UPDATE_MASTER", target: "or", question: edited(bookId, ch2, "Explain how an echo is formed.") });
        if (accepted) {
          expect((await res.clone().json()).error, className).toBeUndefined();
          expect(res.status, className).toBe(200);
          expect((await prisma.question.findUnique({ where: { id: pairedOrId } }))?.chapterId, className).toBe(ch2);
        } else {
          expect(res.status, className).toBe(400);
          expect((await res.json()).error, className).toBe(`${OR_CHAPTER_REQUIRED} (Chapter 1: Light)`);
        }
      }
    });

    for (const mode of ["UPDATE_MASTER", "FORK_COPY"] as const) {
      it(`editing the main question into another chapter (${mode}) keeps the OR up to class 8, unlinks it from class 9`, async () => {
        for (const [className, keeps] of [["Class 6", true], ["Class 10", false]] as const) {
          const { paperId, itemId, bookId, ch2, pairedOrId } = await pairedSlotFor(className);
          const res = await call("PUT", paperId, itemId, { mode, question: edited(bookId, ch2, "Edited main: state how sound travels.") });
          expect((await res.clone().json()).error, className).toBeUndefined();
          expect(res.status, className).toBe(200);
          expect((await prisma.paperQuestion.findUnique({ where: { id: itemId } }))?.orQuestionId, className).toBe(keeps ? pairedOrId : null);
        }
      });
    }
  });
});
