import { body, HttpError, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { chapterSchema } from "@/lib/schemas";

export const POST = route(async (req, { id }) => {
  const data = await body(req, chapterSchema);
  if (!(await prisma.book.findUnique({ where: { id }, select: { id: true } }))) throw new HttpError(404, "Book not found");
  if (await prisma.chapter.findUnique({ where: { bookId_number: { bookId: id, number: data.number } } })) {
    throw new HttpError(409, `Chapter ${data.number} already exists in this book`);
  }
  return prisma.chapter.create({ data: { ...data, bookId: id } });
});
