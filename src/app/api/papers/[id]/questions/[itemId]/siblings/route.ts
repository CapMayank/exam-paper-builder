import { HttpError, route } from "@/lib/api";
import { toQuestionDto } from "@/lib/dto";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";

/**
 * Returns alternative candidate questions from the question bank
 * belonging to the same book, chapter, and question type, that are
 * NOT currently placed in this paper.
 * Ideal for 1-click Quick Swap in the workbench.
 */
export const GET = route(async (_req, { id, itemId }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);

  const item = paper.items.find((i) => i.id === itemId);
  if (!item) throw new HttpError(404, "Paper item not found");

  const usedQuestionIds = new Set<string>();
  for (const it of paper.items) {
    usedQuestionIds.add(it.question.id);
    if (it.orQuestion) usedQuestionIds.add(it.orQuestion.id);
  }

  const siblings = await prisma.question.findMany({
    where: {
      bookId: paper.blueprint.bookId,
      chapterId: item.question.chapterId,
      type: item.question.type,
      id: { notIn: Array.from(usedQuestionIds) },
    },
    include: {
      chapter: true,
      createdBy: { select: { id: true, name: true } },
    },
    take: 8,
    orderBy: { createdAt: "desc" },
  });

  return siblings.map((q) => toQuestionDto(q));
});
