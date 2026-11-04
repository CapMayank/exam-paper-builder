import { body, HttpError, route } from "@/lib/api";
import { assertCanManageBook, assertCanManageScope } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { syllabusImportSchema } from "@/lib/schemas";
import { normalizeSession } from "@/lib/academicSessionUtils";
import { ensureLanguageNonChapterUnits, isLanguageSubject, parseSyllabusContent } from "@/lib/syllabusImport";
import { importIntoSubjectBook, type ImportPart } from "@/lib/subjectBooks";

/**
 * Adds a syllabus to the ONE book of a class + subject (creating it only when the subject has none yet).
 * Several textbooks of a subject become "[Textbook] " parts of that book. Only missing chapters are added;
 * existing chapters are never renamed or removed, so blueprints and their chapter quotas stay intact.
 * `dryRun` returns the plan (which chapters are new / already there) for the preview.
 */
export const POST = route(async (req, _params, user) => {
  const data = await body(req, syllabusImportSchema);
  const { format, content, targetBookId, defaults, dryRun, customBooks, onlyChapters } = data;

  const parsed =
    customBooks && customBooks.length > 0
      ? { books: customBooks, errors: [], warnings: [] as string[] }
      : parseSyllabusContent(format as Parameters<typeof parseSyllabusContent>[0], content || "", defaults);

  if (parsed.errors.length > 0 && parsed.books.length === 0) {
    throw new HttpError(400, parsed.errors.map((e) => e.message).join("; "));
  }
  if (parsed.books.every((b) => b.chapters.length === 0)) {
    throw new HttpError(400, "No chapters found in syllabus content to import");
  }

  const target = targetBookId
    ? await prisma.book.findUnique({ where: { id: targetBookId }, include: { chapters: { orderBy: { number: "asc" } } } })
    : null;
  if (targetBookId && !target) throw new HttpError(404, "Target textbook not found");

  // One group per class + subject; with a target book everything goes into it.
  const groups = new Map<string, { className: string; subject: string; session: string; parts: ImportPart[] }>();
  for (const b of parsed.books) {
    const className = target?.className ?? b.className.trim();
    const subject = target?.subject ?? b.subject.trim();
    const session = normalizeSession(target?.academicSession ?? b.academicSession ?? defaults?.academicSession);
    const key = `${className}\u0000${subject.toLowerCase()}\u0000${session}`;
    const g = groups.get(key) ?? { className, subject, session, parts: [] };
    g.parts.push({ title: b.title, chapters: b.chapters });
    groups.set(key, g);
  }

  if (!dryRun) {
    if (target) await assertCanManageBook(user, target.id);
    else for (const g of groups.values()) assertCanManageScope(user, g);
  }

  const warnings = [...parsed.warnings];
  const languageUnits = (subject: string, className: string) =>
    isLanguageSubject(subject)
      ? (titles: string[]) => {
          const { chapters, addedUnits } = ensureLanguageNonChapterUnits(
            titles.map((title, i) => ({ number: i + 1, title })),
            subject,
            className,
          );
          if (addedUnits.length > 0) warnings.push(`Added the language exam sections (${addedUnits.join(", ")}) for ${className} ${subject}.`);
          return chapters.slice(titles.length).map((c) => c.title);
        }
      : undefined;

  const run = (db: Parameters<typeof importIntoSubjectBook>[0]) =>
    Promise.all(
      [...groups.values()].map((g) =>
        importIntoSubjectBook(
          db,
          { ...g, target: target ?? undefined },
          { dryRun, extraChapters: languageUnits(g.subject, g.className) },
        ),
      ),
    );

  if (dryRun) {
    return { dryRun: true, plans: await run(prisma), books: parsed.books, errors: parsed.errors, warnings };
  }

  // sequential inside one transaction: a group may create the book a later group of the same subject reuses
  const results = await prisma.$transaction(async (tx) => {
    const out = [];
    for (const g of groups.values()) {
      out.push(
        await importIntoSubjectBook(tx, { ...g, target: target ?? undefined }, { extraChapters: languageUnits(g.subject, g.className), onlyChapters }),
      );
    }
    return out;
  });

  const bookIds = results.map((r) => r.bookId).filter((x): x is string => Boolean(x));
  const createdChapters = results.reduce((n, r) => n + r.createdChapters, 0);
  await recordAudit(user, "BOOK_IMPORT", "BOOK", bookIds[0] ?? null, {
    action: "SYLLABUS_IMPORTED",
    format,
    books: results.map((r) => ({ bookId: r.bookId, title: r.bookTitle, createdBook: r.createsBook, createdChapters: r.createdChapters })),
  });

  return {
    success: true,
    results,
    bookIds,
    createdBooks: results.filter((r) => r.createsBook && r.createdChapters > 0).length,
    updatedBooks: results.filter((r) => !r.createsBook).length,
    createdChapters,
    warnings,
  };
});
