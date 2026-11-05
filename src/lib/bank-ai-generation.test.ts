import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

// the model calls are replaced: these tests check what the pipeline is asked for and how failures are reported
const sectionMock = vi.fn();
const legacyMock = vi.fn();
let keyConfigured = true;
vi.mock("@/lib/gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./gemini")>();
  return {
    ...actual,
    generatePaperSectionWithGemini: (input: unknown) => sectionMock(input),
    generateQuestionsWithGemini: (input: unknown) => legacyMock(input),
    getGeminiApiKey: () => (keyConfigured ? "AQ.test-key-0000" : null),
    quotaErrorText: () => null,
  };
});

import { POST as generateQuestions } from "@/app/api/ai/generate-questions/route";
import { DEFAULT_GENERATION_MODEL } from "./gemini";
import { prisma } from "./prisma";

/** The question bank's "AI Question Authoring Co-Pilot": POST /api/ai/generate-questions with a book and chapter. */
describe("bank AI generation uses the paper pipeline", () => {
  const stamp = Date.now();
  let userId: string;
  let bookId: string;
  let ch1: string;
  let otherBookChapter: string;
  let otherBookId: string;
  const bankText = "Define the angle of incidence for a ray striking a plane mirror.";

  const post = (json: Record<string, unknown>) =>
    generateQuestions(
      new Request("http://localhost/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      }),
      { params: Promise.resolve({}) },
    );

  const request = (over: Record<string, unknown> = {}) => ({
    bookId,
    chapterId: ch1,
    chapter: "1. Light",
    className: "Class 8",
    subject: "Science",
    type: "SHORT",
    marks: 3,
    difficulty: "HARD",
    cognitiveLevel: "ANALYZING",
    language: "en",
    count: 2,
    ...over,
  });

  const question = (text: string) => ({
    slotIndex: 0,
    chapterId: ch1,
    chapterNumber: 1,
    chapterTitle: "Light",
    type: "SHORT",
    text,
    options: [],
    subparts: [],
    answer: "Model answer",
    difficulty: "HARD",
  });

  beforeAll(async () => {
    userId = (
      await prisma.user.create({ data: { name: `Bank AI ${stamp}`, email: `bank-ai-${stamp}@test.internal`, passwordHash: "hash", role: "ADMIN", active: true } })
    ).id;
    bookId = (await prisma.book.create({ data: { title: `Bank AI ${stamp}`, subject: "Science", className: "Class 8", academicSession: "2026–27" } })).id;
    ch1 = (await prisma.chapter.create({ data: { bookId, number: 1, title: "Light" } })).id;
    otherBookId = (await prisma.book.create({ data: { title: `Bank AI other ${stamp}`, subject: "Science", className: "Class 8" } })).id;
    otherBookChapter = (await prisma.chapter.create({ data: { bookId: otherBookId, number: 1, title: "Elsewhere" } })).id;
    await prisma.question.create({ data: { bookId, chapterId: ch1, type: "SHORT", text: bankText, createdById: userId } });
  });

  beforeEach(() => {
    mockSessionUserId = userId;
    keyConfigured = true;
    sectionMock.mockReset();
    legacyMock.mockReset();
    sectionMock.mockImplementation(async () => ({ success: true, isMock: false, data: [question("Q one"), question("Q two")] }));
  });

  afterAll(async () => {
    await prisma.question.deleteMany({ where: { bookId: { in: [bookId, otherBookId] } } });
    await prisma.chapter.deleteMany({ where: { bookId: { in: [bookId, otherBookId] } } });
    await prisma.book.deleteMany({ where: { id: { in: [bookId, otherBookId] } } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("runs the paper pipeline with the chapter's bank questions as 'do not repeat'", async () => {
    const res = await post(request());
    expect(res.status).toBe(200);
    expect(legacyMock).not.toHaveBeenCalled();
    const input = sectionMock.mock.calls[0][0];
    expect(input.existingQuestionTexts).toContain(bankText);
    expect(input.model).toBe(DEFAULT_GENERATION_MODEL);
    expect(input.answerMode).toBe("together");
    expect(input.slots).toHaveLength(2);
    expect(input.slots[0]).toMatchObject({ chapterId: ch1, chapterNumber: 1, chapterTitle: "Light", marks: 3, targetDifficulty: "HARD" });
    expect(input.teacherFocus).toMatch(/ANALYZING/);
    const body = await res.json();
    expect(body.data.map((q: { text: string }) => q.text)).toEqual(["Q one", "Q two"]);
    expect(body.data[0].marks).toBe(3);
  });

  it("reports a failed model call instead of returning template questions when a key is configured", async () => {
    sectionMock.mockImplementation(async () => ({
      success: true,
      isMock: true,
      error: "Google reports the model is overloaded right now (HTTP 503).",
      data: [question("Template question")],
    }));
    const res = await post(request());
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/overloaded/);
  });

  it("still offers offline templates when no key is configured at all", async () => {
    keyConfigured = false;
    sectionMock.mockImplementation(async () => ({ success: true, isMock: true, data: [question("Template question")] }));
    const res = await post(request());
    expect(res.status).toBe(200);
    expect((await res.json()).isMock).toBe(true);
  });

  it("rejects a chapter from another book", async () => {
    const res = await post(request({ chapterId: otherBookChapter }));
    expect(res.status).toBe(400);
    expect(sectionMock).not.toHaveBeenCalled();
  });

  it("keeps kindergarten activities on their own generator", async () => {
    legacyMock.mockImplementation(async () => ({ success: true, isMock: false, data: [] }));
    const res = await post(request({ type: "KDG_TRACE_WRITE", count: 1 }));
    expect(res.status).toBe(200);
    expect(sectionMock).not.toHaveBeenCalled();
    expect(legacyMock).toHaveBeenCalledOnce();
  });

  it("does not hand back silent templates on the older path either (no book/chapter sent)", async () => {
    legacyMock.mockImplementation(async () => ({ success: true, isMock: true, error: "HTTP 503", data: [question("Template")] }));
    const res = await post(request({ bookId: undefined, chapterId: undefined }));
    expect(res.status).toBe(502);
  });
});
