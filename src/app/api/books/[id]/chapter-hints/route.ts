import { route } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const PER_CHAPTER = 60;
const MAX_CHARS = 400;

/**
 * The texts of questions already filed under each chapter of a book (newest first, trimmed), so the question
 * form can suggest a chapter from how this book's questions were tagged before, not from chapter titles alone.
 */
export const GET = route(async (_req, { id }) => {
  const rows = await prisma.question.findMany({
    where: { bookId: id },
    select: { chapterId: true, text: true },
    orderBy: { createdAt: "desc" },
    take: 3000,
  });
  const out: Record<string, string[]> = {};
  for (const r of rows) {
    const list = (out[r.chapterId] ??= []);
    if (list.length >= PER_CHAPTER) continue;
    const plain = r.text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (plain) list.push(plain.slice(0, MAX_CHARS));
  }
  return out;
});
