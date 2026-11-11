import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { POST as apply } from "@/app/api/papers/[id]/ai-coverage/apply/route";
import { prisma } from "./prisma";

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

async function call(handler: Handler, path: string, params: Record<string, string>, json: unknown) {
  const res = await handler(
    new Request(`http://localhost${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(json) }),
    { params: Promise.resolve(params) },
  );
  return { status: res.status, data: await res.json().catch(() => null) };
}

describe("AI coverage: apply chapter changes", () => {
  const stamp = Date.now();
  let adminId: string;
  let teacherId: string;
  let bookId: string;
  let otherBookId: string;
  let ch1: string;
  let ch2: string;
  let otherBookChapter: string;
  let blueprintId: string;
  let paperId: string;
  let ownQ: string;
  let foreignQ: string;
  let outsideQ: string;
  let sectionId: string;
  let orPaperId: string;
  let otherPaperId: string;
  let pos = 10;

  beforeAll(async () => {
    const admin = await prisma.user.create({ data: { name: `Cov admin ${stamp}`, email: `cov-admin-${stamp}@test.internal`, passwordHash: "x", role: "ADMIN", active: true } });
    const teacher = await prisma.user.create({ data: { name: `Cov teacher ${stamp}`, email: `cov-teacher-${stamp}@test.internal`, passwordHash: "x", role: "TEACHER", active: true } });
    adminId = admin.id;
    teacherId = teacher.id;
    const book = await prisma.book.create({ data: { title: `Cov ${stamp}`, subject: "Science", className: "Class 8", academicSession: "2026–27" } });
    bookId = book.id;
    ch1 = (await prisma.chapter.create({ data: { bookId, number: 1, title: "Light" } })).id;
    ch2 = (await prisma.chapter.create({ data: { bookId, number: 2, title: "Sound" } })).id;
    const other = await prisma.book.create({ data: { title: `Cov other ${stamp}`, subject: "Science", className: "Class 9", academicSession: "2026–27" } });
    otherBookId = other.id;
    otherBookChapter = (await prisma.chapter.create({ data: { bookId: other.id, number: 1, title: "Elsewhere" } })).id;
    const bp = await prisma.blueprint.create({
      data: {
        name: `Cov BP ${stamp}`,
        bookId,
        academicSession: "2026–27",
        examType: "ANNUAL",
        durationMin: 60,
        chapters: { create: [{ chapterId: ch1, marks: 3 }, { chapterId: ch2, marks: 3 }] },
        sections: { create: [{ position: 0, title: "Section A", type: "MCQ", count: 3, marksEach: 1 }] },
      },
      include: { sections: true },
    });
    blueprintId = bp.id;
    sectionId = bp.sections[0].id;
    const mk = (text: string, createdById: string) =>
      prisma.question.create({ data: { bookId, chapterId: ch1, type: "MCQ", text, optionsJson: JSON.stringify(["a", "b", "c", "d"]), answer: "A", createdById } });
    ownQ = (await mk(`Own question ${stamp}`, teacherId)).id;
    foreignQ = (await mk(`Foreign question ${stamp}`, adminId)).id;
    outsideQ = (await mk(`Not on the paper ${stamp}`, teacherId)).id;
    paperId = (await prisma.paper.create({ data: { title: `Cov paper ${stamp}`, blueprintId, layout: "PAGE", schoolName: "T", academicSession: "2026–27", createdById: teacherId, status: "DRAFT" } })).id;
    await prisma.paperQuestion.create({ data: { paperId, sectionId: bp.sections[0].id, questionId: ownQ, position: 0 } });
    await prisma.paperQuestion.create({ data: { paperId, sectionId: bp.sections[0].id, questionId: foreignQ, position: 1 } });
    const mkPaper = async (title: string) =>
      (await prisma.paper.create({ data: { title: `${title} ${stamp}`, blueprintId, layout: "PAGE", schoolName: "T", academicSession: "2026–27", createdById: teacherId, status: "DRAFT" } })).id;
    orPaperId = await mkPaper("Cov OR paper");
    otherPaperId = await mkPaper("Cov other paper");
  });

  afterAll(async () => {
    await prisma.paperQuestion.deleteMany({ where: { paper: { blueprintId } } });
    await prisma.paper.deleteMany({ where: { blueprintId } });
    await prisma.question.deleteMany({ where: { bookId } });
    await prisma.blueprint.deleteMany({ where: { id: blueprintId } });
    await prisma.chapter.deleteMany({ where: { bookId: { in: [bookId, otherBookId] } } });
    await prisma.book.deleteMany({ where: { id: { in: [bookId, otherBookId] } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: [adminId, teacherId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, teacherId] } } });
  });

  const chapterOf = async (id: string) => (await prisma.question.findUnique({ where: { id } }))!.chapterId;

  it("changes the questions the user may edit, names the rest as skipped, and touches nothing else", async () => {
    mockSessionUserId = teacherId;
    const res = await call(apply as Handler, `/api/papers/${paperId}/ai-coverage/apply`, { id: paperId }, {
      changes: [
        { questionId: ownQ, chapterId: ch2 },
        { questionId: foreignQ, chapterId: ch2 },
        { questionId: outsideQ, chapterId: ch2 },
        { questionId: foreignQ, chapterId: otherBookChapter },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.data.applied).toEqual([ownQ]);
    expect(res.data.skipped.map((s: { questionId: string }) => s.questionId).sort()).toEqual([foreignQ, foreignQ, outsideQ].sort());
    expect(await chapterOf(ownQ)).toBe(ch2);
    expect(await chapterOf(foreignQ)).toBe(ch1);
    expect(await chapterOf(outsideQ)).toBe(ch1);
    expect(res.data.paper.id).toBe(paperId);
  });

  it("refuses a finalised paper", async () => {
    mockSessionUserId = adminId;
    await prisma.paper.update({ where: { id: paperId }, data: { status: "FINAL" } });
    try {
      const res = await call(apply as Handler, `/api/papers/${paperId}/ai-coverage/apply`, { id: paperId }, { changes: [{ questionId: foreignQ, chapterId: ch2 }] });
      expect(res.status).toBe(409);
      expect(await chapterOf(foreignQ)).toBe(ch1);
    } finally {
      await prisma.paper.update({ where: { id: paperId }, data: { status: "DRAFT" } });
    }
  });

  describe("internal-choice (OR) pairs", () => {
    const mkq = (text: string, createdById: string) =>
      prisma.question.create({ data: { bookId, chapterId: ch1, type: "MCQ", text: `${text} ${stamp}-${Math.random()}`, optionsJson: JSON.stringify(["a", "b", "c", "d"]), answer: "A", createdById } });
    const pair = async (altOwner: string, onPaper = orPaperId) => {
      const main = await mkq("OR main", teacherId);
      const alt = await mkq("OR alt", altOwner);
      await prisma.paperQuestion.create({ data: { paperId: onPaper, sectionId, questionId: main.id, orQuestionId: alt.id, position: pos++ } });
      return { main: main.id, alt: alt.id };
    };
    const run = (changes: Array<{ questionId: string; chapterId: string }>) =>
      call(apply as Handler, `/api/papers/${orPaperId}/ai-coverage/apply`, { id: orPaperId }, { changes });

    it("moves the OR alternative together with its main question, so the pair keeps one chapter", async () => {
      mockSessionUserId = teacherId;
      const { main, alt } = await pair(teacherId);
      const res = await run([{ questionId: main, chapterId: ch2 }]);
      expect(res.data.applied).toEqual([main]);
      expect(await chapterOf(main)).toBe(ch2);
      expect(await chapterOf(alt)).toBe(ch2);
    });

    it("skips the change, and moves neither, when the user may not edit the alternative", async () => {
      mockSessionUserId = teacherId;
      const { main, alt } = await pair(adminId);
      const res = await run([{ questionId: main, chapterId: ch2 }]);
      expect(res.data.applied).toEqual([]);
      expect(res.data.skipped.map((s: { questionId: string }) => s.questionId)).toEqual([main]);
      expect(await chapterOf(main)).toBe(ch1);
      expect(await chapterOf(alt)).toBe(ch1);
    });

    it("never changes an alternative on its own: it follows its main question", async () => {
      mockSessionUserId = teacherId;
      const { alt } = await pair(teacherId);
      const res = await run([{ questionId: alt, chapterId: ch2 }]);
      expect(res.data.applied).toEqual([]);
      expect(res.data.skipped).toHaveLength(1);
      expect(await chapterOf(alt)).toBe(ch1);
    });

    it("skips a question that is half of an OR pair in another paper", async () => {
      mockSessionUserId = teacherId;
      const { main } = await pair(teacherId);
      const elsewhereAlt = await mkq("OR elsewhere", teacherId);
      await prisma.paperQuestion.create({ data: { paperId: otherPaperId, sectionId, questionId: main, orQuestionId: elsewhereAlt.id, position: pos++ } });
      const res = await run([{ questionId: main, chapterId: ch2 }]);
      expect(res.data.applied).toEqual([]);
      expect(await chapterOf(main)).toBe(ch1);
    });
  });
});
