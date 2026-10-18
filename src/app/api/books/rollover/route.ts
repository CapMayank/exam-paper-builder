import { body, HttpError, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { rolloverBookSchema } from "@/lib/schemas";
export { rolloverBookSchema };

export const POST = route(async (req, _ctx, user) => {
  const { sourceBookId, targetAcademicSession, title, chapters, selectedChapterIds, includeQuestions } = await body(
    req,
    rolloverBookSchema,
  );
  const normalizedSession = targetAcademicSession.replace(/-/g, "–").trim();

  const sourceBook = await prisma.book.findUnique({
    where: { id: sourceBookId },
    include: {
      chapters: {
        orderBy: { number: "asc" },
        include: includeQuestions ? { questions: true } : undefined,
      },
    },
  });

  if (!sourceBook) {
    throw new HttpError(404, "Source textbook not found");
  }

  // Determine chapter items to insert
  let chapterItems: { number: number; title: string; sourceChapterId?: string }[] = [];

  if (chapters && chapters.length > 0) {
    chapterItems = chapters;
  } else if (selectedChapterIds && selectedChapterIds.length > 0) {
    const selectedSet = new Set(selectedChapterIds);
    chapterItems = sourceBook.chapters
      .filter((c) => selectedSet.has(c.id))
      .map((c) => ({ number: c.number, title: c.title, sourceChapterId: c.id }));
  } else {
    chapterItems = sourceBook.chapters.map((c) => ({
      number: c.number,
      title: c.title,
      sourceChapterId: c.id,
    }));
  }

  if (chapterItems.length === 0) {
    throw new HttpError(400, "Please select at least one chapter to roll over");
  }

  // Create new book and chapters in transaction
  const createdBook = await prisma.$transaction(async (tx) => {
    const newBook = await tx.book.create({
      data: {
        title,
        className: sourceBook.className,
        subject: sourceBook.subject,
        academicSession: normalizedSession,
        chapters: {
          create: chapterItems.map((c) => ({
            number: c.number,
            title: c.title,
          })),
        },
      },
      include: {
        chapters: { orderBy: { number: "asc" } },
        _count: { select: { questions: true, blueprints: true } },
      },
    });

    // If includeQuestions, clone questions
    if (includeQuestions) {
      const chapterMap = new Map<number, string>();
      newBook.chapters.forEach((c) => chapterMap.set(c.number, c.id));

      for (const srcCh of sourceBook.chapters) {
        const destChId = chapterMap.get(srcCh.number);
        const questionsList = (srcCh as { questions?: Array<any> }).questions;
        if (destChId && questionsList && questionsList.length > 0) {
          await tx.question.createMany({
            data: questionsList.map((q) => ({
              bookId: newBook.id,
              chapterId: destChId,
              type: q.type,
              text: q.text,
              optionsJson: q.optionsJson,
              subpartsJson: q.subpartsJson,
              answer: q.answer,
              difficulty: q.difficulty,
              imagePath: q.imagePath,
              spaceMm: q.spaceMm,
              showGrid: q.showGrid,
              createdById: user.id,
            })),
          });
        }
      }
    }

    return newBook;
  });

  return createdBook;
});
