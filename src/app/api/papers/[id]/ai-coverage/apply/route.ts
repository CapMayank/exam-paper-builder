import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertCanModifyPaper, canModifyQuestion, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";

const applySchema = z.object({
  changes: z.array(z.object({ questionId: z.string().min(1), chapterId: z.string().min(1) })).min(1).max(200),
});

/**
 * Applies the chapter changes the AI coverage check suggested. The chapter is changed on the question itself (so the
 * bank agrees with the paper). Each change stands alone: one the user may not make, or that does not fit, is skipped
 * and named, and the rest are applied.
 */
export const POST = route(async (req, { id }, user) => {
  const input = await body(req, applySchema);
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") throw new HttpError(409, "This paper is finalised. Reopen it to change chapters.");

  const onPaper = new Set(paper.items.flatMap((i) => [i.question.id, i.orQuestion?.id].filter((q): q is string => Boolean(q))));
  const bookChapters = new Set(
    (await prisma.chapter.findMany({ where: { bookId: paper.blueprint.bookId }, select: { id: true } })).map((c) => c.id),
  );

  const applied: string[] = [];
  const skipped: Array<{ questionId: string; reason: string }> = [];
  for (const change of input.changes) {
    const skip = (reason: string) => skipped.push({ questionId: change.questionId, reason });
    if (!onPaper.has(change.questionId)) {
      skip("That question is not on this paper.");
      continue;
    }
    if (!bookChapters.has(change.chapterId)) {
      skip("That chapter does not belong to this paper's book.");
      continue;
    }
    const question = await prisma.question.findUnique({
      where: { id: change.questionId },
      include: {
        book: { select: { className: true, subject: true } },
        paperQuestions: { select: { paper: { select: { status: true } } } },
        orPaperQuestions: { select: { paper: { select: { status: true } } } },
      },
    });
    if (!question) {
      skip("That question no longer exists.");
      continue;
    }
    if (!canModifyQuestion(user, question)) {
      skip("You can only change your own questions, or those of the classes and subjects assigned to you.");
      continue;
    }
    if (question.paperQuestions.some((p) => p.paper.status === "FINAL") || question.orPaperQuestions.some((p) => p.paper.status === "FINAL")) {
      skip("This question is in a finalised paper and can't be changed.");
      continue;
    }
    if (question.chapterId !== change.chapterId) {
      await prisma.question.update({ where: { id: question.id }, data: { chapterId: change.chapterId } });
    }
    applied.push(question.id);
  }

  if (applied.length > 0) {
    await prisma.paper.update({ where: { id }, data: { updatedAt: new Date() } });
    await recordAudit(user, "QUESTION_BULK_UPDATE", "PAPER", id, { action: "AI_COVERAGE_APPLY_CHAPTERS", questionIds: applied, skipped: skipped.length });
  }
  return { applied, skipped, paper: await loadPaperView(id) };
});
