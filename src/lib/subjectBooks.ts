/**
 * One exam book per class + subject + session.
 *
 * A subject whose exam covers several textbooks (English: First Flight + Footprints + the Reading/Writing/Grammar
 * components, Hindi: Kshitij + Kritika, ...) keeps them as *parts* of a single book: every chapter title carries a
 * "[Textbook] " prefix, the same format "Combine books" has always produced and `matchOfficialChapterMarks` reads.
 *
 * Merging never copies: chapters, questions and blueprints are moved to the kept book with their ids, so blueprint
 * chapter marks, unit quotas (incl. the grammar/writing units that have no textbook chapter) and paper links stay
 * exactly as they were. A chapter is only folded into another one when both have the same full title.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeSession } from "./academicSessionUtils";
import { getCanonicalSubjectName } from "./schoolCurriculum";

type Db = PrismaClient | Prisma.TransactionClient;

export const ALL_BOOKS_SUFFIX = "– all prescribed books";

/** Title of the single book of a subject: the textbook itself, or "<Subject> <Class> – all prescribed books". */
export function subjectBookTitle(subject: string, className: string, textbookTitles: string[]): string {
  if (textbookTitles.length === 1) return textbookTitles[0];
  return `${subject} ${className} ${ALL_BOOKS_SUFFIX}`;
}

export function partChapterTitle(part: string, title: string): string {
  return `[${part}] ${title}`;
}

/** "[First Flight] A Letter to God" → { part: "First Flight", title: "A Letter to God" } */
export function splitChapterTitle(title: string): { part: string | null; title: string } {
  const m = /^\s*\[([^\]]*)\]\s*([\s\S]*)$/.exec(title);
  return m ? { part: m[1], title: m[2] } : { part: null, title: title.trim() };
}

const normTitle = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

export function sameChapterTitle(a: string, b: string): boolean {
  return normTitle(a) === normTitle(b);
}

/** Both spellings of a session that the app has stored ("2026-27" from older seeds, "2026–27" everywhere else). */
export function sessionForms(session: string): string[] {
  const n = normalizeSession(session);
  return Array.from(new Set([n, n.replace(/–/g, "-")]));
}

export type MergeResult = {
  movedChapters: number;
  foldedChapters: number;
  movedQuestions: number;
  movedBlueprints: number;
  deletedBooks: number;
};

/**
 * Moves everything of `sources` into `keeperId`. `parts` gives the textbook name to prefix a book's un-prefixed
 * chapters with (null: leave titles as they are). Run inside a transaction.
 */
export async function mergeBooksInto(
  db: Db,
  keeperId: string,
  sourceIds: string[],
  parts: Map<string, string | null>,
): Promise<MergeResult> {
  const result: MergeResult = { movedChapters: 0, foldedChapters: 0, movedQuestions: 0, movedBlueprints: 0, deletedBooks: 0 };

  const keeperChapters = await db.chapter.findMany({ where: { bookId: keeperId }, orderBy: { number: "asc" } });
  const keeperPart = parts.get(keeperId) ?? null;
  if (keeperPart) {
    for (const ch of keeperChapters) {
      if (splitChapterTitle(ch.title).part !== null) continue;
      ch.title = partChapterTitle(keeperPart, ch.title);
      await db.chapter.update({ where: { id: ch.id }, data: { title: ch.title } });
    }
  }
  let nextNumber = keeperChapters.reduce((m, c) => Math.max(m, c.number), 0) + 1;

  for (const sourceId of sourceIds) {
    if (sourceId === keeperId) continue;
    const part = parts.get(sourceId) ?? null;
    const chapters = await db.chapter.findMany({ where: { bookId: sourceId }, orderBy: { number: "asc" } });

    for (const ch of chapters) {
      const title = part && splitChapterTitle(ch.title).part === null ? partChapterTitle(part, ch.title) : ch.title;
      const twin = keeperChapters.find((k) => sameChapterTitle(k.title, title));
      if (twin) {
        await foldChapter(db, ch.id, twin.id, keeperId);
        result.foldedChapters++;
      } else {
        const moved = await db.chapter.update({
          where: { id: ch.id },
          data: { bookId: keeperId, number: nextNumber++, title },
        });
        keeperChapters.push(moved);
        result.movedChapters++;
      }
    }

    const q = await db.question.updateMany({ where: { bookId: sourceId }, data: { bookId: keeperId } });
    result.movedQuestions += q.count;
    const bp = await db.blueprint.updateMany({ where: { bookId: sourceId }, data: { bookId: keeperId } });
    result.movedBlueprints += bp.count;
    await db.curriculumTextbook.updateMany({ where: { legacyBookId: sourceId }, data: { legacyBookId: keeperId } });

    const [leftChapters, leftQuestions, leftBlueprints] = await Promise.all([
      db.chapter.count({ where: { bookId: sourceId } }),
      db.question.count({ where: { bookId: sourceId } }),
      db.blueprint.count({ where: { bookId: sourceId } }),
    ]);
    if (leftChapters + leftQuestions + leftBlueprints === 0) {
      await db.book.delete({ where: { id: sourceId } });
      result.deletedBooks++;
    }
  }
  return result;
}

/** Re-points questions, blueprint marks and curriculum links of `fromId` to `toId`, then removes `fromId`. */
async function foldChapter(db: Db, fromId: string, toId: string, bookId: string) {
  await db.question.updateMany({ where: { chapterId: fromId }, data: { chapterId: toId, bookId } });
  const rows = await db.blueprintChapter.findMany({ where: { chapterId: fromId } });
  for (const row of rows) {
    const existing = await db.blueprintChapter.findUnique({
      where: { blueprintId_chapterId: { blueprintId: row.blueprintId, chapterId: toId } },
    });
    if (existing) {
      await db.blueprintChapter.update({ where: { id: existing.id }, data: { marks: existing.marks + row.marks } });
      await db.blueprintChapter.delete({ where: { id: row.id } });
    } else {
      await db.blueprintChapter.update({ where: { id: row.id }, data: { chapterId: toId } });
    }
  }
  await db.curriculumChapter.updateMany({ where: { legacyChapterId: fromId }, data: { legacyChapterId: toId } });
  await db.chapter.delete({ where: { id: fromId } });
}

/** Renumbers a book's chapters 1..n in the given order, without tripping the (bookId, number) unique key. */
export async function renumberChapters(db: Db, orderedIds: string[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    await db.chapter.update({ where: { id: orderedIds[i] }, data: { number: 100000 + i } });
  }
  for (let i = 0; i < orderedIds.length; i++) {
    await db.chapter.update({ where: { id: orderedIds[i] }, data: { number: i + 1 } });
  }
}

export type CurriculumSubjectBooks = {
  classLevel: number;
  name: string;
  textbooks: Array<{ title: string; chapters: Array<{ chapterNumber: number; title: string }> }>;
};

export type ConsolidationReport = {
  className: string;
  subject: string;
  session: string;
  keptBookId: string;
  keptTitle: string;
  mergedBookIds: string[];
} & MergeResult;

/**
 * Folds the per-textbook books of every multi-textbook curriculum subject (and any "– all prescribed books" copy
 * made from them) into one book per class + subject + session. Books a teacher created under another title are not
 * touched. `dryRun` only reports what would happen.
 */
export async function consolidateCurriculumBooks(
  db: PrismaClient,
  subjects: CurriculumSubjectBooks[],
  opts: { dryRun?: boolean } = {},
): Promise<ConsolidationReport[]> {
  const reports: ConsolidationReport[] = [];

  for (const s of subjects) {
    if (s.textbooks.length < 2) continue;
    const className = `Class ${s.classLevel}`;
    const allTitle = subjectBookTitle(s.name, className, s.textbooks.map((t) => t.title));
    const textbookTitles = s.textbooks.map((t) => t.title);
    const canon = getCanonicalSubjectName(s.name) || s.name;

    const candidates = (
      await db.book.findMany({
        where: { className, OR: [{ title: { in: textbookTitles } }, { title: { startsWith: allTitle } }] },
        include: { _count: { select: { questions: true, blueprints: true } } },
        orderBy: { createdAt: "asc" },
      })
    ).filter((b) => (getCanonicalSubjectName(b.subject) || b.subject) === canon);

    const bySession = new Map<string, typeof candidates>();
    for (const b of candidates) {
      const key = normalizeSession(b.academicSession);
      bySession.set(key, [...(bySession.get(key) ?? []), b]);
    }

    for (const [session, books] of bySession) {
      if (books.length === 1 && books[0].title === allTitle && books[0].academicSession === session) continue;

      const usage = (b: (typeof books)[number]) => b._count.questions + b._count.blueprints;
      const combined = books.filter((b) => b.title.startsWith(allTitle));
      const pool = combined.length > 0 ? combined : books;
      const keeper = [...pool].sort(
        (a, b) =>
          usage(b) - usage(a) ||
          Number(b.title === allTitle) - Number(a.title === allTitle) ||
          textbookTitles.indexOf(a.title) - textbookTitles.indexOf(b.title),
      )[0];
      const sources = books.filter((b) => b.id !== keeper.id).map((b) => b.id);
      const parts = new Map(books.map((b) => [b.id, textbookTitles.includes(b.title) ? b.title : null]));

      const base = { className, subject: s.name, session, keptBookId: keeper.id, keptTitle: allTitle, mergedBookIds: sources };
      if (opts.dryRun) {
        reports.push({ ...base, movedChapters: 0, foldedChapters: 0, movedQuestions: 0, movedBlueprints: 0, deletedBooks: 0 });
        continue;
      }

      const merged = await db.$transaction(
        async (tx) => {
          const r = await mergeBooksInto(tx, keeper.id, sources, parts);
          await tx.book.update({ where: { id: keeper.id }, data: { title: allTitle, academicSession: session } });
          await renumberChapters(tx, orderByTextbooks(await tx.chapter.findMany({ where: { bookId: keeper.id } }), s.textbooks));
          return r;
        },
        { timeout: 60_000 },
      );
      reports.push({ ...base, ...merged });
      console.log(
        `📚 [SubjectBooks] ${className} ${s.name} ${session}: merged ${sources.length} book(s) into "${allTitle}" ` +
          `(${merged.movedChapters} chapters moved, ${merged.foldedChapters} duplicates folded, ${merged.movedQuestions} questions, ${merged.movedBlueprints} blueprints)`,
      );
    }
  }
  return reports;
}

/** Chapter ids sorted by textbook (in curriculum order), then by official chapter order, then by current number. */
export function orderByTextbooks(
  chapters: Array<{ id: string; number: number; title: string }>,
  textbooks: CurriculumSubjectBooks["textbooks"],
): string[] {
  const rank = (c: { number: number; title: string }): [number, number, number] => {
    const { part, title } = splitChapterTitle(c.title);
    const tbIdx = part === null ? -1 : textbooks.findIndex((t) => t.title === part);
    if (tbIdx < 0) return [textbooks.length, 0, c.number];
    const official = textbooks[tbIdx].chapters;
    const chIdx = official.findIndex((oc) => sameChapterTitle(oc.title, title));
    return [tbIdx, chIdx < 0 ? official.length : chIdx, c.number];
  };
  return [...chapters]
    .sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
    })
    .map((c) => c.id);
}

/** Every book stored with "2026-27" gets the "2026–27" spelling the rest of the app uses. */
export async function normalizeBookSessions(db: Db): Promise<number> {
  const rows = await db.book.findMany({ where: { academicSession: { contains: "-" } }, select: { academicSession: true }, distinct: ["academicSession"] });
  let count = 0;
  for (const { academicSession } of rows) {
    const r = await db.book.updateMany({ where: { academicSession }, data: { academicSession: normalizeSession(academicSession) } });
    count += r.count;
  }
  return count;
}

export type ImportPart = { title: string; chapters: Array<{ number: number; title: string }> };

export type SubjectImportPlan = {
  className: string;
  subject: string;
  bookId: string | null;
  bookTitle: string;
  createsBook: boolean;
  chapters: Array<{ title: string; status: "new" | "exists" }>;
};

type ExistingBook = { id: string; title: string; chapters: Array<{ id: string; number: number; title: string }> };

/** The book a class + subject already has in a session (the most used one if there are still several). */
export async function findSubjectBook(db: Db, className: string, subject: string, session: string): Promise<ExistingBook | null> {
  const books = await db.book.findMany({
    where: { className, academicSession: { in: sessionForms(session) } },
    include: { chapters: { orderBy: { number: "asc" } }, _count: { select: { questions: true, blueprints: true } } },
    orderBy: { createdAt: "asc" },
  });
  const wanted = subject.trim().toLowerCase();
  const same = books.filter((b) => b.subject.trim().toLowerCase() === wanted);
  if (same.length === 0) return null;
  return [...same].sort(
    (a, b) =>
      b._count.questions + b._count.blueprints - (a._count.questions + a._count.blueprints) ||
      Number(b.title.endsWith(ALL_BOOKS_SUFFIX)) - Number(a.title.endsWith(ALL_BOOKS_SUFFIX)) ||
      b.chapters.length - a.chapters.length,
  )[0];
}

/**
 * Plans (and, unless `dryRun`, applies) adding a syllabus to the subject's one book. Several textbooks become
 * "[Textbook] " parts. Only missing chapters are added: existing chapters are never renamed, renumbered or removed,
 * so blueprints built on the book keep their chapter marks.
 */
export async function importIntoSubjectBook(
  db: Db,
  input: { className: string; subject: string; session: string; parts: ImportPart[]; target?: ExistingBook | null },
  opts: { dryRun?: boolean; extraChapters?: (titles: string[]) => string[]; onlyChapters?: string[] } = {},
): Promise<SubjectImportPlan & { createdChapters: number }> {
  const target = input.target !== undefined ? input.target : await findSubjectBook(db, input.className, input.subject, input.session);
  const parts = input.parts.filter((p) => p.chapters.length > 0);
  const existing = target?.chapters ?? [];
  const multi = parts.length > 1 || existing.some((c) => splitChapterTitle(c.title).part !== null);

  const wanted: string[] = [];
  for (const p of parts) {
    for (const ch of [...p.chapters].sort((a, b) => a.number - b.number)) {
      const t = ch.title.trim();
      if (!t) continue;
      const title = multi && splitChapterTitle(t).part === null ? partChapterTitle(p.title.trim(), t) : t;
      if (!wanted.some((w) => sameChapterTitle(w, title))) wanted.push(title);
    }
  }
  for (const extra of opts.extraChapters?.([...existing.map((c) => c.title), ...wanted]) ?? []) {
    if (!wanted.some((w) => sameChapterTitle(w, extra))) wanted.push(extra);
  }

  const exists = (title: string) => {
    const bare = splitChapterTitle(title);
    return existing.some(
      (c) =>
        sameChapterTitle(c.title, title) ||
        // an un-prefixed chapter of a single-textbook book that is now one part of the subject
        (splitChapterTitle(c.title).part === null && bare.part !== null && sameChapterTitle(c.title, bare.title)),
    );
  };

  const bookTitle =
    target?.title ??
    (parts.length === 1 ? parts[0].title.trim() : subjectBookTitle(input.subject, input.className, parts.map((p) => p.title.trim())));
  const plan: SubjectImportPlan = {
    className: input.className,
    subject: input.subject,
    bookId: target?.id ?? null,
    bookTitle,
    createsBook: !target,
    chapters: wanted.map((title) => ({ title, status: exists(title) ? "exists" : "new" })),
  };
  const toAdd = plan.chapters.filter(
    (c) => c.status === "new" && (!opts.onlyChapters || opts.onlyChapters.some((t) => sameChapterTitle(t, c.title))),
  );
  if (opts.dryRun || toAdd.length === 0) return { ...plan, createdChapters: 0 };

  const bookId =
    target?.id ??
    (
      await db.book.create({
        data: { title: bookTitle, className: input.className, subject: input.subject, academicSession: normalizeSession(input.session) },
      })
    ).id;
  let next = existing.reduce((m, c) => Math.max(m, c.number), 0) + 1;
  for (const c of toAdd) await db.chapter.create({ data: { bookId, number: next++, title: c.title } });
  return { ...plan, bookId, createdChapters: toAdd.length };
}

/**
 * A pasted chapter list: one chapter per line, leading numbering ("3.", "Ch 3:", "Chapter 3 -") dropped.
 * A line starting with "#" names the textbook the following chapters belong to.
 */
export function parsePastedChapters(text: string, defaultPart: string): ImportPart[] {
  const parts: ImportPart[] = [];
  let current: ImportPart | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      const title = line.replace(/^#+\s*/, "").trim();
      if (title) {
        current = { title, chapters: [] };
        parts.push(current);
      }
      continue;
    }
    const title = line
      .replace(/^(chapter|ch\.?|lesson|unit|पाठ)\s*\d+\s*[:.\-–)]?\s*/i, "")
      .replace(/^\d+\s*[:.\-–)]\s*/, "")
      .trim();
    if (!title) continue;
    if (!current) {
      current = { title: defaultPart, chapters: [] };
      parts.push(current);
    }
    current.chapters.push({ number: current.chapters.length + 1, title });
  }
  return parts.filter((p) => p.chapters.length > 0);
}
