import { body, HttpError, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { syllabusImportSchema } from "@/lib/schemas";
import { ensureLanguageNonChapterUnits, isLanguageSubject, parseSyllabusContent } from "@/lib/syllabusImport";

export const POST = route(async (req, _params, user) => {
  const data = await body(req, syllabusImportSchema);
  const { format, content, targetBookId, defaults, dryRun, upsert, customBooks } = data;

  const parsed =
    customBooks && customBooks.length > 0
      ? { books: customBooks, errors: [], warnings: [] }
      : parseSyllabusContent(format as any, content || "", defaults);

  // Ensure language non-chapter units (Reading, Writing, Grammar) across all books
  for (const book of parsed.books) {
    if (isLanguageSubject(book.subject)) {
      const { chapters, addedUnits } = ensureLanguageNonChapterUnits(
        book.chapters,
        book.subject,
        book.className,
      );
      book.chapters = chapters;
      if (addedUnits.length > 0) {
        parsed.warnings.push(
          `Appended language exam sections (${addedUnits.join(", ")}) to "${book.title}".`,
        );
      }
    }
  }

  if (parsed.errors.length > 0 && parsed.books.length === 0) {
    throw new HttpError(400, parsed.errors.map((e) => e.message).join("; "));
  }

  if (dryRun) {
    return {
      dryRun: true,
      books: parsed.books,
      errors: parsed.errors,
      warnings: parsed.warnings,
    };
  }

  // If targetBookId is specified, import / append chapters directly into existing book
  if (targetBookId) {
    const targetBook = await prisma.book.findUnique({
      where: { id: targetBookId },
      include: { chapters: true },
    });
    if (!targetBook) {
      throw new HttpError(404, "Target textbook not found");
    }

    const allParsedChapters = parsed.books.flatMap((b) => b.chapters);
    if (allParsedChapters.length === 0) {
      throw new HttpError(400, "No chapters found in syllabus content to import");
    }

    if (isLanguageSubject(targetBook.subject)) {
      const combined = [
        ...targetBook.chapters.map((c) => ({ number: c.number, title: c.title })),
        ...allParsedChapters,
      ];
      const { chapters: ensuredCombined } = ensureLanguageNonChapterUnits(
        combined,
        targetBook.subject,
        targetBook.className,
      );
      const existingTitles = new Set(targetBook.chapters.map((c) => c.title));
      for (const ch of ensuredCombined) {
        if (!existingTitles.has(ch.title) && !allParsedChapters.some((c) => c.title === ch.title)) {
          allParsedChapters.push(ch);
        }
      }
    }

    let createdCount = 0;
    let updatedCount = 0;
    const existingChapterMap = new Map(targetBook.chapters.map((c) => [c.number, c]));

    await prisma.$transaction(async (tx) => {
      for (const ch of allParsedChapters) {
        const existing = existingChapterMap.get(ch.number);
        if (existing) {
          if (upsert && existing.title !== ch.title) {
            await tx.chapter.update({
              where: { id: existing.id },
              data: { title: ch.title },
            });
            updatedCount++;
          }
        } else {
          await tx.chapter.create({
            data: {
              bookId: targetBook.id,
              number: ch.number,
              title: ch.title,
            },
          });
          createdCount++;
        }
      }
    });

    await recordAudit(user, "BOOK_IMPORT", "BOOK", targetBook.id, {
      action: "CHAPTERS_BULK_IMPORTED",
      bookTitle: targetBook.title,
      format,
      createdCount,
      updatedCount,
      totalCount: allParsedChapters.length,
    });

    const updatedBook = await prisma.book.findUnique({
      where: { id: targetBookId },
      include: {
        chapters: { orderBy: { number: "asc" } },
        _count: { select: { questions: true, blueprints: true } },
      },
    });

    return {
      success: true,
      mode: "chapters",
      book: updatedBook,
      createdChapters: createdCount,
      updatedChapters: updatedCount,
      warnings: parsed.warnings,
    };
  }

  // Otherwise, import textbooks + syllabi
  let createdBooks = 0;
  let updatedBooks = 0;
  let createdChapters = 0;
  let updatedChapters = 0;
  const processedBookIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const b of parsed.books) {
      const existing = await tx.book.findFirst({
        where: {
          title: b.title,
          className: b.className,
          subject: b.subject,
        },
        include: { chapters: true },
      });

      let bookId: string;
      const existingChapterMap = new Map<number, { id: string; title: string }>();

      if (existing) {
        bookId = existing.id;
        existing.chapters.forEach((c) => existingChapterMap.set(c.number, c));
        updatedBooks++;
      } else {
        const targetSession = b.academicSession || defaults?.academicSession || "2025–26";
        const created = await tx.book.create({
          data: {
            title: b.title,
            className: b.className,
            subject: b.subject,
            academicSession: targetSession.replace(/-/g, "–"),
          },
        });
        bookId = created.id;
        createdBooks++;
      }
      processedBookIds.push(bookId);

      for (const ch of b.chapters) {
        const existingCh = existingChapterMap.get(ch.number);
        if (existingCh) {
          if (upsert && existingCh.title !== ch.title) {
            await tx.chapter.update({
              where: { id: existingCh.id },
              data: { title: ch.title },
            });
            updatedChapters++;
          }
        } else {
          await tx.chapter.create({
            data: {
              bookId,
              number: ch.number,
              title: ch.title,
            },
          });
          createdChapters++;
        }
      }
    }
  });

  await recordAudit(user, "BOOK_IMPORT", "BOOK", processedBookIds[0] ?? null, {
    action: "SYLLABUS_IMPORTED",
    format,
    createdBooks,
    updatedBooks,
    createdChapters,
    updatedChapters,
    bookCount: parsed.books.length,
  });

  return {
    success: true,
    mode: "books",
    createdBooks,
    updatedBooks,
    createdChapters,
    updatedChapters,
    bookIds: processedBookIds,
    warnings: parsed.warnings,
  };
});
