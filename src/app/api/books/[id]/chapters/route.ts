import { body, HttpError, route } from "@/lib/api";
import { assertCanManageBook } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { chapterSchema } from "@/lib/schemas";

export const POST = route(async (req, { id }, user) => {
  const data = await body(req, chapterSchema);
  await assertCanManageBook(user, id);
  if (await prisma.chapter.findUnique({ where: { bookId_number: { bookId: id, number: data.number } } })) {
    throw new HttpError(409, `Chapter ${data.number} already exists in this book`);
  }
  return prisma.chapter.create({ data: { ...data, bookId: id } });
});
