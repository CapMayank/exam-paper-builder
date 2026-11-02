import "server-only";
import { HttpError, type SessionUser } from "./api";
import { WORKSHEET_MODE, type ExamType } from "./constants";
import { assertCanModifyPaper, loadPaperView } from "./papers";
import { prisma } from "./prisma";

const WORKSHEET_CHAPTER_TITLE = "Worksheet activities";

/**
 * Nursery–KG worksheets do not need a blueprint or a book from the teacher. Behind the scenes they
 * still sit on one (so printing, the question bank and exports keep working): this finds or creates the
 * class + subject book and its single chapter.
 */
async function ensureWorksheetBook(className: string, subject: string, academicSession: string) {
  const books = await prisma.book.findMany({
    where: { className },
    include: { chapters: { orderBy: { number: "asc" }, take: 1 } },
  });
  const wanted = subject.trim().toLowerCase();
  let book = books.find((b) => b.subject.trim().toLowerCase() === wanted);
  if (!book) {
    book = await prisma.book.create({
      data: { title: `${className} ${subject} Worksheets`, subject, className, academicSession },
      include: { chapters: { orderBy: { number: "asc" }, take: 1 } },
    });
  }
  let chapter = book.chapters[0];
  if (!chapter) {
    chapter = await prisma.chapter.create({ data: { bookId: book.id, number: 1, title: WORKSHEET_CHAPTER_TITLE } });
  }
  return { book, chapter };
}

export type WorksheetInput = {
  title: string;
  className: string;
  subject: string;
  schoolName: string;
  examType: ExamType;
  examDate: string;
  academicSession: string;
  language: "en" | "hi" | "sa" | "bilingual";
};

export async function createWorksheet(user: SessionUser, input: WorksheetInput) {
  const { book } = await ensureWorksheetBook(input.className, input.subject, input.academicSession);
  const blueprint = await prisma.blueprint.create({
    data: {
      name: input.title,
      bookId: book.id,
      academicSession: input.academicSession,
      examType: input.examType,
      durationMin: 45,
      language: input.language,
      curriculumMode: WORKSHEET_MODE,
    },
  });
  return prisma.paper.create({
    data: {
      title: input.title,
      blueprintId: blueprint.id,
      layout: "PAGE", // A4 portrait
      schoolName: input.schoolName,
      academicSession: input.academicSession,
      examType: input.examType,
      examDate: input.examDate,
      language: input.language,
      numberingStyle: "CONTINUOUS",
      marksStyle: "RIGHT_COLUMN",
      showCandidateDetails: true,
      showSignatures: false,
      createdById: user.id,
    },
  });
}

/** Loads an editable worksheet paper or throws; also enforces who may change it. */
export async function loadEditableWorksheet(id: string, user: SessionUser) {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Worksheet not found");
  if ((paper.blueprint as { curriculumMode?: string }).curriculumMode !== WORKSHEET_MODE) {
    throw new HttpError(400, "This paper is built from a blueprint, not a worksheet.");
  }
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") throw new HttpError(409, "This worksheet is finalised. Reopen it to make changes.");
  return paper;
}

export type ActivityInput = {
  type: string;
  text: string;
  options: string[];
  answer: string;
  marks: number;
};

/** One activity = one question + a one-slot section of its own, appended to the end. */
export async function addWorksheetActivity(paperId: string, user: SessionUser, input: ActivityInput) {
  const paper = await loadEditableWorksheet(paperId, user);
  const bp = paper.blueprint;
  const chapter = await prisma.chapter.findFirst({ where: { bookId: bp.bookId }, orderBy: { number: "asc" } });
  if (!chapter) throw new HttpError(500, "Worksheet book has no chapter");

  const lastPosition = bp.sections.reduce((m, s) => Math.max(m, s.position), -1);
  const question = await prisma.question.create({
    data: {
      bookId: bp.bookId,
      chapterId: chapter.id,
      type: input.type,
      text: input.text,
      optionsJson: JSON.stringify(input.options),
      answer: input.answer,
      difficulty: "EASY",
      createdById: user.id,
    },
  });
  const section = await prisma.blueprintSection.create({
    data: {
      blueprintId: bp.id,
      position: lastPosition + 1,
      title: `Activity ${lastPosition + 2}`,
      type: input.type,
      count: 1,
      marksEach: input.marks,
    },
  });
  await prisma.paperQuestion.create({
    data: { paperId, sectionId: section.id, questionId: question.id, position: 0 },
  });
  await prisma.paper.update({ where: { id: paperId }, data: { updatedAt: new Date() } });
  return loadPaperView(paperId);
}

export async function updateWorksheetActivity(
  paperId: string,
  itemId: string,
  user: SessionUser,
  patch: { text?: string; options?: string[]; answer?: string; marks?: number; move?: "up" | "down" },
) {
  const paper = await loadEditableWorksheet(paperId, user);
  const item = paper.items.find((i) => i.id === itemId);
  if (!item) throw new HttpError(404, "Activity not found");

  if (patch.text !== undefined || patch.options !== undefined || patch.answer !== undefined) {
    await prisma.question.update({
      where: { id: item.question.id },
      data: {
        ...(patch.text !== undefined ? { text: patch.text } : {}),
        ...(patch.options !== undefined ? { optionsJson: JSON.stringify(patch.options) } : {}),
        ...(patch.answer !== undefined ? { answer: patch.answer } : {}),
      },
    });
  }
  if (patch.marks !== undefined) {
    await prisma.blueprintSection.update({ where: { id: item.sectionId }, data: { marksEach: patch.marks } });
  }
  if (patch.move) {
    const ordered = [...paper.blueprint.sections].sort((a, b) => a.position - b.position);
    const idx = ordered.findIndex((s) => s.id === item.sectionId);
    const other = ordered[patch.move === "up" ? idx - 1 : idx + 1];
    if (other) {
      const mine = ordered[idx];
      await prisma.$transaction([
        prisma.blueprintSection.update({ where: { id: mine.id }, data: { position: other.position } }),
        prisma.blueprintSection.update({ where: { id: other.id }, data: { position: mine.position } }),
      ]);
    }
  }
  await prisma.paper.update({ where: { id: paperId }, data: { updatedAt: new Date() } });
  return loadPaperView(paperId);
}

export async function removeWorksheetActivity(paperId: string, itemId: string, user: SessionUser) {
  const paper = await loadEditableWorksheet(paperId, user);
  const item = paper.items.find((i) => i.id === itemId);
  if (!item) throw new HttpError(404, "Activity not found");
  await prisma.paperQuestion.delete({ where: { id: itemId } });
  await prisma.blueprintSection.delete({ where: { id: item.sectionId } });
  const stillUsed = await prisma.paperQuestion.count({
    where: { OR: [{ questionId: item.question.id }, { orQuestionId: item.question.id }] },
  });
  if (stillUsed === 0) await prisma.question.delete({ where: { id: item.question.id } });
  await prisma.paper.update({ where: { id: paperId }, data: { updatedAt: new Date() } });
  return loadPaperView(paperId);
}
