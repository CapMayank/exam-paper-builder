import { body, HttpError, route } from "@/lib/api";
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

export const PATCH = route(async (req, { id }) => {
  const data = await body(req, bookSchema);
  const exists = await prisma.book.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HttpError(404, "Book not found");
  return prisma.book.update({ where: { id }, data });
});

export const DELETE = route(
  async (_req, { id }) => {
    const used = await prisma.blueprint.count({ where: { bookId: id } });
    if (used > 0) throw new HttpError(409, `This book is used by ${used} blueprint(s). Delete those first.`);
    const inPapers = await prisma.paperQuestion.count({ where: { question: { bookId: id } } });
    if (inPapers > 0) throw new HttpError(409, "Questions from this book are used in papers.");
    await prisma.book.delete({ where: { id } });
  },
  { roles: ["ADMIN", "HOD"] },
);
