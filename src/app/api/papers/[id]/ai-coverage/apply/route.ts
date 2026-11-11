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
  // an alternate (OR) choice must keep its main question's chapter, so the two always move together
  const altIds = new Set(paper.items.flatMap((i) => (i.orQuestion ? [i.orQuestion.id] : [])));
  const partnerOf = new Map(paper.items.flatMap((i) => (i.orQuestion ? [[i.question.id, i.orQuestion.id] as const] : [])));
  const bookChapters = new Set(
    (await prisma.chapter.findMany({ where: { bookId: paper.blueprint.bookId }, select: { id: true } })).map((c) => c.id),
  );

  /** Why this question's chapter cannot be changed by this user from this paper; null when it can. */
  async function blocker(questionId: string): Promise<string | null> {
    const q = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        book: { select: { className: true, subject: true } },
        paperQuestions: { select: { paperId: true, orQuestionId: true, paper: { select: { status: true } } } },
        orPaperQuestions: { select: { paperId: true, paper: { select: { status: true } } } },
      },
    });
    if (!q) return "That question no longer exists.";
    if (!canModifyQuestion(user, q)) return "You can only change your own questions, or those of the classes and subjects assigned to you.";
    if (q.paperQuestions.some((p) => p.paper.status === "FINAL") || q.orPaperQuestions.some((p) => p.paper.status === "FINAL")) {
      return "This question is in a finalised paper and can't be changed.";
    }
    if (q.paperQuestions.some((p) => p.paperId !== id && p.orQuestionId) || q.orPaperQuestions.some((p) => p.paperId !== id)) {
      return "This question is half of an internal-choice (OR) pair in another paper, so its chapter can't change here.";
    }
    return null;
  }

  const applied: string[] = [];
  const skipped: Array<{ questionId: string; reason: string }> = [];
  for (const change of input.changes) {
    const skip = (reason: string) => skipped.push({ questionId: change.questionId, reason });
    if (!onPaper.has(change.questionId)) {
      skip("That question is not on this paper.");
      continue;
    }
    if (altIds.has(change.questionId)) {
      skip("An alternate (OR) choice follows its main question: change the main question instead.");
      continue;
    }
    if (!bookChapters.has(change.chapterId)) {
      skip("That chapter does not belong to this paper's book.");
      continue;
    }
    const group = [change.questionId, ...(partnerOf.has(change.questionId) ? [partnerOf.get(change.questionId)!] : [])];
    let reason: string | null = null;
    for (const [i, qid] of group.entries()) {
      const why = await blocker(qid);
      if (why) {
        reason = i === 0 ? why : `Its alternate (OR) choice: ${why}`;
        break;
      }
    }
    if (reason) {
      skip(reason);
      continue;
    }
    await prisma.question.updateMany({ where: { id: { in: group } }, data: { chapterId: change.chapterId } });
    applied.push(change.questionId);
  }

  if (applied.length > 0) {
    await prisma.paper.update({ where: { id }, data: { updatedAt: new Date() } });
    await recordAudit(user, "QUESTION_BULK_UPDATE", "PAPER", id, { action: "AI_COVERAGE_APPLY_CHAPTERS", questionIds: applied, skipped: skipped.length });
  }
  return { applied, skipped, paper: await loadPaperView(id) };
});
