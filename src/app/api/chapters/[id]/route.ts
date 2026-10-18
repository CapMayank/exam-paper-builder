import { body, HttpError, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { chapterSchema } from "@/lib/schemas";

export const PATCH = route(async (req, { id }) => {
  const data = await body(req, chapterSchema);
  const chapter = await prisma.chapter.findUnique({ where: { id } });
  if (!chapter) throw new HttpError(404, "Chapter not found");
  const clash = await prisma.chapter.findUnique({
    where: { bookId_number: { bookId: chapter.bookId, number: data.number } },
  });
  if (clash && clash.id !== id) throw new HttpError(409, `Chapter ${data.number} already exists in this book`);
  return prisma.chapter.update({ where: { id }, data });
});

export const DELETE = route(
  async (_req, { id }) => {
    const inBlueprints = await prisma.blueprintChapter.count({ where: { chapterId: id } });
    if (inBlueprints > 0) throw new HttpError(409, "This chapter is used in a blueprint.");
    const inPapers = await prisma.paperQuestion.count({ where: { question: { chapterId: id } } });
    if (inPapers > 0) throw new HttpError(409, "Questions from this chapter are used in papers.");
    await prisma.chapter.delete({ where: { id } }); // also removes its bank questions (cascade)
  },
  { roles: ["ADMIN", "HOD"] },
);
