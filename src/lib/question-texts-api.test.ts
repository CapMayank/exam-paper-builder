import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { GET } from "@/app/api/questions/texts/route";
import { GET as getQuestions } from "@/app/api/questions/route";
import { VARIANT_MARKER } from "./questionWrite";
import { prisma } from "./prisma";
import type { QuestionDto } from "./dto";
import type { QuestionText } from "./types";

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
const call = (url: string, headers?: HeadersInit) =>
  (GET as Handler)(new Request(`http://localhost${url}`, { method: "GET", headers }), { params: Promise.resolve({}) });
const callQuestions = (url: string, headers?: HeadersInit) =>
  (getQuestions as Handler)(new Request(`http://localhost${url}`, { method: "GET", headers }), { params: Promise.resolve({}) });

describe("GET /api/questions/texts", () => {
  const stamp = Date.now();
  let userId: string;
  let bookId: string;
  let chapterId: string;
  let otherBookId: string;
  let otherChapterId: string;
  let firstQuestionId: string | undefined;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        name: `Texts ${stamp}`,
        email: `texts-${stamp}@test.internal`,
        passwordHash: "hash",
        role: "TEACHER",
        active: true,
      },
    });
    userId = user.id;
    mockSessionUserId = userId;

    const book = await prisma.book.create({
      data: { title: `Texts Book ${stamp}`, subject: "Science", className: "Class 8", academicSession: "2026–27" },
    });
    bookId = book.id;
    const chapter = await prisma.chapter.create({
      data: { bookId, number: 1, title: "Chapter 1" },
    });
    chapterId = chapter.id;

    const otherBook = await prisma.book.create({
      data: { title: `Other Book ${stamp}`, subject: "Math", className: "Class 8", academicSession: "2026–27" },
    });
    otherBookId = otherBook.id;
    const otherChapter = await prisma.chapter.create({
      data: { bookId: otherBookId, number: 1, title: "Other Chapter 1" },
    });
    otherChapterId = otherChapter.id;
  });

  afterAll(async () => {
    await prisma.question.deleteMany({ where: { bookId: { in: [bookId, otherBookId] } } });
    await prisma.chapter.deleteMany({ where: { bookId: { in: [bookId, otherBookId] } } });
    await prisma.book.deleteMany({ where: { id: { in: [bookId, otherBookId] } } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("returns only id, type, chapterId and text for the book", async () => {
    const q1 = await prisma.question.create({
      data: {
        bookId,
        chapterId,
        type: "MCQ",
        text: "What is photosynthesis?",
        optionsJson: JSON.stringify(["A", "B", "C", "D"]),
        answer: "A",
        createdById: userId,
      },
    });
    firstQuestionId = q1.id;

    await prisma.question.create({
      data: {
        bookId,
        chapterId,
        type: "SA",
        text: "Explain Newton's first law.",
        answer: "Law of inertia",
        createdById: userId,
      },
    });

    await prisma.question.create({
      data: {
        bookId: otherBookId,
        chapterId: otherChapterId,
        type: "MCQ",
        text: "What is 2 + 2?",
        optionsJson: JSON.stringify(["3", "4", "5", "6"]),
        answer: "4",
        createdById: userId,
      },
    });

    const res = await call(`/api/questions/texts?bookId=${bookId}`);
    expect(res.status).toBe(200);
    const items = (await res.json()) as QuestionText[];
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual(["chapterId", "id", "text", "type"]);
    }
  });

  it("excludes shuffled variant clones", async () => {
    const variant = await prisma.question.create({
      data: {
        bookId,
        chapterId,
        type: "MCQ",
        text: "Shuffled variant of photosynthesis",
        optionsJson: JSON.stringify(["D", "C", "B", "A"]),
        subpartsJson: JSON.stringify({ [VARIANT_MARKER]: firstQuestionId ?? "orig", subparts: [] }),
        answer: "D",
        createdById: userId,
      },
    });

    const res = await call(`/api/questions/texts?bookId=${bookId}`);
    expect(res.status).toBe(200);
    const items = (await res.json()) as QuestionText[];
    expect(items).toHaveLength(2);
    expect(items.some((item) => item.id === variant.id)).toBe(false);
  });

  it("returns 304 when the ETag matches", async () => {
    const first = await call(`/api/questions/texts?bookId=${bookId}`);
    expect(first.status).toBe(200);
    const etag = first.headers.get("ETag");
    expect(etag).toBeTruthy();

    const second = await call(`/api/questions/texts?bookId=${bookId}`, {
      "If-None-Match": etag!,
    });
    expect(second.status).toBe(304);
    expect(await second.text()).toBe("");
  });

  it("changes the ETag after a question's text changes", async () => {
    const targetId =
      firstQuestionId ??
      (
        await prisma.question.create({
          data: {
            bookId,
            chapterId,
            type: "SA",
            text: "Initial question text",
            answer: "Answer",
            createdById: userId,
          },
        })
      ).id;

    const before = await call(`/api/questions/texts?bookId=${bookId}`);
    expect(before.status).toBe(200);
    const etagBefore = before.headers.get("ETag");
    expect(etagBefore).toBeTruthy();

    await prisma.question.update({
      where: { id: targetId },
      data: { text: "Updated question text for ETag check" },
    });

    const after = await call(`/api/questions/texts?bookId=${bookId}`);
    expect(after.status).toBe(200);
    const etagAfter = after.headers.get("ETag");
    expect(etagAfter).toBeTruthy();
    expect(etagAfter).not.toBe(etagBefore);
  });

  it("rejects a request without bookId", async () => {
    const res = await call("/api/questions/texts");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/questions ids=", () => {
  const stamp = Date.now();
  let userId: string;
  let bookId: string;
  let chapterId: string;
  let blueprintId: string;
  let paperId: string;
  const questionIds: string[] = [];

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        name: `Ids ${stamp}`,
        email: `ids-${stamp}@test.internal`,
        passwordHash: "hash",
        role: "TEACHER",
        active: true,
      },
    });
    userId = user.id;
    mockSessionUserId = userId;

    const book = await prisma.book.create({
      data: { title: `Ids Book ${stamp}`, subject: "Science", className: "Class 8", academicSession: "2026–27" },
    });
    bookId = book.id;
    const chapter = await prisma.chapter.create({
      data: { bookId, number: 1, title: "Ids Chapter 1" },
    });
    chapterId = chapter.id;

    for (let i = 0; i < 12; i++) {
      const q = await prisma.question.create({
        data: {
          bookId,
          chapterId,
          type: "MCQ",
          text: `Ids test question ${i + 1}`,
          optionsJson: JSON.stringify(["A", "B", "C", "D"]),
          answer: "A",
          createdById: userId,
        },
      });
      questionIds.push(q.id);
    }

    const blueprint = await prisma.blueprint.create({
      data: {
        name: `Ids Blueprint ${stamp}`,
        bookId,
        examType: "QUARTERLY",
        durationMin: 60,
        academicSession: "2026–27",
      },
    });
    blueprintId = blueprint.id;

    const section = await prisma.blueprintSection.create({
      data: {
        blueprintId,
        position: 1,
        title: "Section A",
        type: "MCQ",
        count: 1,
        marksEach: 1,
      },
    });

    const paper = await prisma.paper.create({
      data: {
        title: `Ids Paper ${stamp}`,
        blueprintId,
        layout: "PAGE",
        schoolName: "Test School",
        academicSession: "2026–27",
        createdById: userId,
      },
    });
    paperId = paper.id;

    await prisma.paperQuestion.create({
      data: {
        paperId,
        sectionId: section.id,
        questionId: questionIds[0],
        position: 1,
      },
    });
  });

  afterAll(async () => {
    await prisma.paperQuestion.deleteMany({ where: { paperId } });
    await prisma.paper.deleteMany({ where: { id: paperId } });
    await prisma.blueprintSection.deleteMany({ where: { blueprintId } });
    await prisma.blueprint.deleteMany({ where: { id: blueprintId } });
    await prisma.question.deleteMany({ where: { bookId } });
    await prisma.chapter.deleteMany({ where: { bookId } });
    await prisma.book.deleteMany({ where: { id: bookId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("ids= returns just those questions with usages", async () => {
    const q1 = questionIds[0];
    const q2 = questionIds[1];
    const res = await callQuestions(`/api/questions?ids=${q1},${q2}`);
    expect(res.status).toBe(200);
    const items = (await res.json()) as QuestionDto[];
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.id).sort()).toEqual([q1, q2].sort());
    const first = items.find((item) => item.id === q1);
    const second = items.find((item) => item.id === q2);
    expect(first?.usages).toHaveLength(1);
    expect(second?.usages).toHaveLength(0);
  });

  it("ids= caps the list at 10", async () => {
    const res = await callQuestions(`/api/questions?ids=${questionIds.join(",")}`);
    expect(res.status).toBe(200);
    const items = (await res.json()) as QuestionDto[];
    expect(items.length).toBeLessThanOrEqual(10);
    expect(items).toHaveLength(10);
  });
});
