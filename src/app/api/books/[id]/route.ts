import { body, HttpError, route } from "@/lib/api";
import { assertCanManageBook, assertCanManageScope } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { bookSchema } from "@/lib/schemas";

export const GET = route(async (_req, { id }) => {
  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      chapters: {
        orderBy: { number: "asc" },
      },
    },
  });
  if (!book) throw new HttpError(404, "Book not found");
  return book;
});

export const PATCH = route(async (req, { id }, user) => {
  const data = await body(req, bookSchema);
  await assertCanManageBook(user, id);
  assertCanManageScope(user, data); // moving a book needs rights on the new class/subject too
  return prisma.book.update({ where: { id }, data });
});

export const DELETE = route(
  async (_req, { id }, user) => {
    await assertCanManageBook(user, id);
    const used = await prisma.blueprint.count({ where: { bookId: id } });
    if (used > 0) throw new HttpError(409, `This book is used by ${used} blueprint(s). Delete those first.`);
    const inPapers = await prisma.paperQuestion.count({ where: { question: { bookId: id } } });
    if (inPapers > 0) throw new HttpError(409, "Questions from this book are used in papers.");
    await prisma.book.delete({ where: { id } });
  },
  { roles: ["ADMIN", "TEACHER"] },
);
