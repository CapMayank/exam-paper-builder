import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { combineBooksSchema } from "@/lib/schemas";

export const POST = route(async (req, _params, user) => {
  const data = await body(req, combineBooksSchema);
  const { bookIds, compositeTitle, className, subject, keepOriginals } = data;

  // Load books
  const sourceBooks = await prisma.book.findMany({
    where: { id: { in: bookIds } },
    include: {
      chapters: { orderBy: { number: "asc" } },
      questions: true,
    },
  });

  if (sourceBooks.length < 2) {
    throw new HttpError(400, "Could not find all specified textbooks to combine");
  }

  // Preserve order of bookIds requested
  const orderedBooks = bookIds
    .map((id) => sourceBooks.find((b) => b.id === id))
    .filter(Boolean) as typeof sourceBooks;

  // Create composite book in transaction
  const result = await prisma.$transaction(async (tx) => {
    const compositeBook = await tx.book.create({
      data: {
        title: compositeTitle.trim(),
        className: className.trim(),
        subject: subject.trim(),
        academicSession: (data.academicSession || orderedBooks[0]?.academicSession || "2025–26").replace(/-/g, "–"),
      },
    });

    let currentChapterNumber = 1;
    const oldToNewChapterMap = new Map<string, string>(); // oldChapterId -> newChapterId

    for (const b of orderedBooks) {
      // Sub-book prefix e.g. "[First Flight] "
      const prefix = `[${b.title}] `;

      for (const ch of b.chapters) {
        const cleanTitle = ch.title.startsWith("[") ? ch.title : `${prefix}${ch.title}`;
        const newCh = await tx.chapter.create({
          data: {
            bookId: compositeBook.id,
            number: currentChapterNumber++,
            title: cleanTitle,
          },
        });
        oldToNewChapterMap.set(ch.id, newCh.id);
      }
    }

    // Copy questions to the new composite book
    let copiedQuestions = 0;
    for (const b of orderedBooks) {
      for (const q of b.questions) {
        const targetChapterId = oldToNewChapterMap.get(q.chapterId);
        if (!targetChapterId) continue;

        await tx.question.create({
          data: {
            bookId: compositeBook.id,
            chapterId: targetChapterId,
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
          },
        });
        copiedQuestions++;
      }
    }

    if (!keepOriginals) {
      for (const b of orderedBooks) {
        // Only delete if not used in papers or blueprints
        const [paperCount, blueprintCount] = await Promise.all([
          tx.paperQuestion.count({
            where: {
              OR: [
                { question: { bookId: b.id } },
                { orQuestion: { bookId: b.id } },
              ],
            },
          }),
          tx.blueprint.count({
            where: { bookId: b.id },
          }),
        ]);
        if (paperCount === 0 && blueprintCount === 0) {
          await tx.book.delete({ where: { id: b.id } });
        }
      }
    }

    return { compositeBook, totalChapters: currentChapterNumber - 1, copiedQuestions };
  });

  await recordAudit(user, "BOOK_IMPORT", "BOOK", result.compositeBook.id, {
    action: "COMBINED_MULTI_BOOK_SUBJECT",
    sourceBookIds: bookIds,
    compositeTitle,
    totalChapters: result.totalChapters,
    copiedQuestions: result.copiedQuestions,
  });

  const fullBook = await prisma.book.findUnique({
    where: { id: result.compositeBook.id },
    include: {
      chapters: { orderBy: { number: "asc" } },
      _count: { select: { questions: true, blueprints: true } },
    },
  });

  return {
    success: true,
    book: fullBook,
    message: `Combined ${orderedBooks.length} textbooks into "${compositeTitle}" with ${result.totalChapters} chapters and ${result.copiedQuestions} questions!`,
  };
  },
  { roles: ["ADMIN", "HOD"] },
);
