import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "./prisma";

vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(null),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { buildPaperDocx } from "./paperDocx";

/** A board-style English paper whose one-word row has 12 parts: Word must label them as print does, (i)…(xii). */
describe("Word export part labels match the printed paper", () => {
  const stamp = Date.now();
  let userId = "";
  let bookId = "";
  let blueprintId = "";
  let paperId = "";
  const questionIds: string[] = [];

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { name: `Docx labels ${stamp}`, email: `docx-labels-${stamp}@school.internal`, passwordHash: "x", role: "TEACHER", active: true },
    });
    userId = user.id;
    const book = await prisma.book.create({
      data: { title: `Labels Science ${stamp}`, subject: "Science", className: "Class 10", chapters: { create: [{ number: 1, title: "Light" }] } },
      include: { chapters: true },
    });
    bookId = book.id;
    const bp = await prisma.blueprint.create({
      data: {
        name: `Labels ${stamp}`,
        bookId,
        examType: "ANNUAL",
        durationMin: 60,
        chapters: { create: [{ chapterId: book.chapters[0].id, marks: 12 }] },
        sections: {
          create: [
            { position: 1, title: "Section A — Objective Questions", type: "VERY_SHORT", count: 12, marksEach: 1, questionTitle: "Answer in one word." },
          ],
        },
      },
      include: { sections: true },
    });
    blueprintId = bp.id;
    const paper = await prisma.paper.create({
      data: { title: `Labels paper ${stamp}`, blueprintId, layout: "PAGE", schoolName: "Test School", language: "en", createdById: userId },
    });
    paperId = paper.id;
    for (let i = 0; i < 12; i++) {
      const q = await prisma.question.create({
        data: { bookId, chapterId: book.chapters[0].id, type: "VERY_SHORT", text: `Name the colour number ${i + 1}.`, answer: "Red", createdById: userId },
      });
      questionIds.push(q.id);
      await prisma.paperQuestion.create({ data: { paperId, sectionId: bp.sections[0].id, questionId: q.id, position: i } });
    }
  });

  afterAll(async () => {
    await prisma.paperQuestion.deleteMany({ where: { paperId } });
    await prisma.paper.deleteMany({ where: { id: paperId } });
    await prisma.question.deleteMany({ where: { id: { in: questionIds } } });
    await prisma.blueprintSection.deleteMany({ where: { blueprintId } });
    await prisma.blueprintChapter.deleteMany({ where: { blueprintId } });
    await prisma.blueprint.deleteMany({ where: { id: blueprintId } });
    await prisma.chapter.deleteMany({ where: { bookId } });
    await prisma.book.deleteMany({ where: { id: bookId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("labels the parts (i)…(xii) with the row's question title, never (a) or (11)", async () => {
    const user = (await prisma.user.findUnique({ where: { id: userId } }))!;
    const result = await buildPaperDocx(paperId, false, user as never);
    const { default: JSZip } = await import("jszip");
    const xml = await (await JSZip.loadAsync(result.buffer)).file("word/document.xml")!.async("string");
    const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).toContain("Answer in one word.");
    expect(text).toMatch(/\(i\)\s+Name the colour number 1\./);
    expect(text).toMatch(/\(xii\)\s+Name the colour number 12\./);
    expect(text).not.toMatch(/\(a\)\s+Name the colour/);
    expect(text).not.toMatch(/\(11\)\s+Name the colour/);
  });
});
