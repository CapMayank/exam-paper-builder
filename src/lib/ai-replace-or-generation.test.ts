import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

// the model call is replaced: these tests check what the section pipeline is asked for, not what Gemini writes
const generated = { text: "Explain how an echo is used to measure the depth of a well." };
const generateMock = vi.fn();
vi.mock("@/lib/gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./gemini")>();
  return { ...actual, generatePaperSectionWithGemini: (input: unknown) => generateMock(input) };
});

import { POST as generateSection } from "@/app/api/papers/[id]/ai-generate-section/route";
import { DEFAULT_GENERATION_MODEL } from "./gemini";
import { OR_CHAPTER_REQUIRED } from "./internalChoiceRules";
import { prisma } from "./prisma";

/** Replace-with-AI and Change-OR-with-AI go through POST /api/papers/:id/ai-generate-section with one slot. */
describe("AI replace and OR alternative use the section pipeline", () => {
  const stamp = Date.now();
  let userId: string;
  let bookId: string;
  let ch1: string;
  let ch2: string;
  let blueprintId: string;
  let sectionId: string;
  let paperId: string;
  let itemId: string;
  const primaryText = "State the two laws of reflection of light with a labelled diagram.";

  const post = (json: Record<string, unknown>) =>
    generateSection(
      new Request(`http://localhost/api/papers/${paperId}/ai-generate-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      }),
      { params: Promise.resolve({ id: paperId }) },
    );

  const oneSlot = (over: Record<string, unknown> = {}) => ({
    sectionId,
    sectionType: "SHORT",
    marksEach: 3,
    language: "en",
    difficulty: "MEDIUM",
    answerMode: "together",
    slots: [{ slotIndex: 0, chapterId: ch1, chapterNumber: 1, chapterTitle: "Light", marks: 3, targetDifficulty: "MEDIUM" }],
    ...over,
  });

  beforeAll(async () => {
    userId = (
      await prisma.user.create({
        data: { name: `AI replace ${stamp}`, email: `ai-replace-${stamp}@test.internal`, passwordHash: "hash", role: "TEACHER", active: true },
      })
    ).id;
    bookId = (await prisma.book.create({ data: { title: `AI replace ${stamp}`, subject: "Science", className: "Class 8", academicSession: "2026–27" } })).id;
    ch1 = (await prisma.chapter.create({ data: { bookId, number: 1, title: "Light" } })).id;
    ch2 = (await prisma.chapter.create({ data: { bookId, number: 2, title: "Sound" } })).id;
    const bp = await prisma.blueprint.create({
      data: {
        name: `AI replace BP ${stamp}`,
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
        data: { title: `AI replace paper ${stamp}`, blueprintId, layout: "PAGE", schoolName: "Test School", createdById: userId, status: "DRAFT" },
      })
    ).id;
    const primary = await prisma.question.create({ data: { bookId, chapterId: ch1, type: "SHORT", text: primaryText, createdById: userId } });
    itemId = (await prisma.paperQuestion.create({ data: { paperId, sectionId, questionId: primary.id, position: 0 } })).id;
  });

  beforeEach(() => {
    mockSessionUserId = userId;
    generateMock.mockReset();
    generateMock.mockImplementation(async (input: { slots: Array<{ slotIndex: number; chapterId: string }> }) => ({
      success: true,
      isMock: false,
      data: input.slots.map((s) => ({
        slotIndex: s.slotIndex,
        chapterId: s.chapterId,
        chapterNumber: 1,
        chapterTitle: "Light",
        type: "SHORT",
        text: generated.text,
        options: [],
        subparts: [],
        answer: "Model answer",
        difficulty: "MEDIUM",
        requiresInternalChoice: true,
        orQuestion: { chapterId: s.chapterId, chapterNumber: 1, chapterTitle: "Light", type: "SHORT", text: "An OR of the alternative", options: [], subparts: [], answer: "", marks: 3, difficulty: "MEDIUM" },
      })),
    }));
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

  it("tells the model not to repeat the questions already in the paper, including the one being replaced", async () => {
    const res = await post(oneSlot());
    expect(res.status).toBe(200);
    const input = generateMock.mock.calls[0][0];
    expect(input.existingQuestionTexts).toContain(primaryText);
    expect(input.answerMode).toBe("together");
    expect(input.slots[0].targetDifficulty).toBe("MEDIUM");
  });

  it("uses the flash default model when the caller names none (never Pro, which has no free quota)", async () => {
    await post(oneSlot());
    expect(generateMock.mock.calls[0][0].model).toBe(DEFAULT_GENERATION_MODEL);
  });

  it("shows the model the main question when writing its OR alternative, and asks for no OR of its own", async () => {
    const res = await post(oneSlot({ alternateForItemId: itemId }));
    expect(res.status).toBe(200);
    const slot = generateMock.mock.calls[0][0].slots[0];
    expect(slot.topicFocus).toContain(primaryText);
    expect(slot.topicFocus).toMatch(/NOT be a paraphrase/);
    expect(slot.topicFocus).toContain("Write an equivalent question: same chapter,");
    expect(slot.requiresInternalChoice).toBe(false);
    const body = await res.json();
    expect(body.questions[0].orQuestion).toBeUndefined();
    expect(body.questions[0].requiresInternalChoice).toBe(false);
  });

  it("refuses an alternative that is a near copy of the main question", async () => {
    generated.text = primaryText;
    try {
      const res = await post(oneSlot({ alternateForItemId: itemId }));
      expect(res.status).toBe(502);
      expect((await res.json()).error).toMatch(/near copy of the main question/);
    } finally {
      generated.text = "Explain how an echo is used to measure the depth of a well.";
    }
  });

  it("from class 9, refuses an alternative from another chapter before calling the model", async () => {
    // the same-chapter rule is required from class 9 only, so this check runs on a class 10 book
    await prisma.book.update({ where: { id: bookId }, data: { className: "Class 10" } });
    try {
      const res = await post(
        oneSlot({ alternateForItemId: itemId, slots: [{ slotIndex: 0, chapterId: ch2, chapterNumber: 2, chapterTitle: "Sound", marks: 3 }] }),
      );
      expect(res.status).toBe(422);
      expect((await res.json()).error).toBe(`${OR_CHAPTER_REQUIRED} (Chapter 1: Light)`);
      expect(generateMock).not.toHaveBeenCalled();
    } finally {
      await prisma.book.update({ where: { id: bookId }, data: { className: "Class 8" } });
    }
  });

  it("up to class 8, writes an alternative from another chapter", async () => {
    const res = await post(
      oneSlot({ alternateForItemId: itemId, slots: [{ slotIndex: 0, chapterId: ch2, chapterNumber: 2, chapterTitle: "Sound", marks: 3 }] }),
    );
    expect((await res.clone().json()).error).toBeUndefined();
    expect(res.status).toBe(200);
    const slot = generateMock.mock.calls[0][0].slots[0];
    expect(slot.chapterId).toBe(ch2);
    // the model is pointed at the slot's chapter, not told to keep the main question's chapter
    expect(slot.topicFocus).toContain("Write an equivalent question: the chapter named for this slot,");
    expect(slot.topicFocus).not.toMatch(/same chapter/);
  });

  it("refuses an alternative for a question that is not in the paper", async () => {
    const res = await post(oneSlot({ alternateForItemId: "no-such-item" }));
    expect(res.status).toBe(404);
    expect(generateMock).not.toHaveBeenCalled();
  });
});

describe("rows of one printed section share its title", () => {
  const stamp = Date.now() + 1;
  let userId: string, bookId: string, chapterId: string, blueprintId: string, paperId: string, passageRowId: string;

  beforeAll(async () => {
    userId = (await prisma.user.create({ data: { name: `Rows ${stamp}`, email: `rows-${stamp}@test.internal`, passwordHash: "hash", role: "TEACHER", active: true } })).id;
    bookId = (await prisma.book.create({ data: { title: `Rows ${stamp}`, subject: "Hindi", className: "Class 8", academicSession: "2026–27" } })).id;
    chapterId = (await prisma.chapter.create({ data: { bookId, number: 1, title: "अपठित गद्यांश (Unseen Passage)" } })).id;
    const bp = await prisma.blueprint.create({
      data: {
        name: `Rows BP ${stamp}`, bookId, academicSession: "2026–27", examType: "ANNUAL", durationMin: 60,
        chapters: { create: [{ chapterId, marks: 6 }] },
        sections: {
          create: [
            { position: 1, title: "लघु उत्तरीय प्रश्न", instructions: "", type: "SHORT", count: 1, marksEach: 3, role: "LITERATURE", allowedTypesJson: '["SHORT"]' },
            { position: 2, title: "लघु उत्तरीय प्रश्न", instructions: "", type: "UNSEEN_PASSAGE", count: 1, marksEach: 3, role: "PASSAGE", allowedTypesJson: '["UNSEEN_PASSAGE"]' },
          ],
        },
      },
      include: { sections: true },
    });
    blueprintId = bp.id;
    passageRowId = bp.sections.find((s) => s.type === "UNSEEN_PASSAGE")!.id;
    paperId = (await prisma.paper.create({ data: { title: `Rows ${stamp}`, blueprintId, layout: "PAGE", schoolName: "S", createdById: userId, status: "DRAFT" } })).id;
  });

  afterAll(async () => {
    await prisma.paper.deleteMany({ where: { id: paperId } });
    await prisma.blueprintSection.deleteMany({ where: { blueprintId } });
    await prisma.blueprintChapter.deleteMany({ where: { blueprintId } });
    await prisma.blueprint.deleteMany({ where: { id: blueprintId } });
    await prisma.chapter.deleteMany({ where: { bookId } });
    await prisma.book.deleteMany({ where: { id: bookId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("generates for the row named by id, not the first row with that title", async () => {
    mockSessionUserId = userId;
    generateMock.mockReset();
    generateMock.mockImplementation(async () => ({ success: true, isMock: false, data: [] }));
    const res = await generateSection(
      new Request(`http://localhost/api/papers/${paperId}/ai-generate-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: passageRowId, sectionTitle: "लघु उत्तरीय प्रश्न", sectionType: "UNSEEN_PASSAGE", marksEach: 3,
          slots: [{ slotIndex: 0, chapterId, chapterNumber: 1, chapterTitle: "अपठित गद्यांश (Unseen Passage)", marks: 3 }],
        }),
      }),
      { params: Promise.resolve({ id: paperId }) },
    );
    expect(res.status, JSON.stringify(await res.clone().json())).toBe(200);
    expect(generateMock.mock.calls[0][0].sectionType).toBe("UNSEEN_PASSAGE");
  });
});
