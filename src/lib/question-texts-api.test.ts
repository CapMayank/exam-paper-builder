import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { GET } from "@/app/api/questions/texts/route";
import { VARIANT_MARKER } from "./questionWrite";
import { prisma } from "./prisma";
import type { QuestionText } from "./types";

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
const call = (url: string, headers?: HeadersInit) =>
  (GET as Handler)(new Request(`http://localhost${url}`, { method: "GET", headers }), { params: Promise.resolve({}) });

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
