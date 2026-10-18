import { HttpError, route } from "@/lib/api";
import { autoFillPaper } from "@/lib/autofill";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";

/**
 * 1-Click Smart Auto-Fill:
 * Automatically assembles remaining questions for a draft paper from the question bank,
 * strictly abiding by section question types and blueprint chapter weightage quotas.
 */
export const POST = route(async (_req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") throw new HttpError(409, "This paper is finalised. Reopen it to make changes.");

  if (paper.progress.complete) {
    return {
      success: true,
      addedCount: 0,
      unfilled: [],
      complete: true,
      message: "Paper is already complete according to blueprint.",
      paper,
    };
  }

  // Fetch all available questions for this book
  const bankQuestions = await prisma.question.findMany({
    where: { bookId: paper.blueprint.bookId },
    select: { id: true, chapterId: true, type: true, difficulty: true },
  });

  const result = autoFillPaper(
    {
      sections: paper.blueprint.sections,
      chapters: paper.blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks })),
    },
    paper.items.map((i) => ({
      sectionId: i.sectionId,
      chapterId: i.question.chapterId,
      questionId: i.question.id,
    })),
    bankQuestions,
  );

  if (result.added.length === 0) {
    return {
      success: false,
      addedCount: 0,
      unfilled: result.unfilled,
      complete: false,
      message: "No matching questions found in question bank for remaining blueprint quotas.",
      paper,
    };
  }

  // Find max position per section among existing items
  const maxPosBySection = new Map<string, number>();
  for (const item of paper.items) {
    const cur = maxPosBySection.get(item.sectionId) ?? -1;
    if (item.position > cur) maxPosBySection.set(item.sectionId, item.position);
  }

  // Save new questions in a transaction
  await prisma.$transaction(async (tx) => {
    for (const item of result.added) {
      const nextPos = (maxPosBySection.get(item.sectionId) ?? -1) + 1;
      maxPosBySection.set(item.sectionId, nextPos);
      await tx.paperQuestion.create({
        data: {
          paperId: id,
          sectionId: item.sectionId,
          questionId: item.questionId,
          position: nextPos,
        },
      });
    }
    await tx.paper.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  });

  const updatedPaper = await loadPaperView(id);

  return {
    success: true,
    addedCount: result.added.length,
    unfilled: result.unfilled,
    complete: result.complete,
    message: result.complete
      ? `Successfully auto-filled ${result.added.length} questions. Paper is now complete!`
      : `Auto-filled ${result.added.length} questions. Some slots could not be filled due to bank question limits.`,
    paper: updatedPaper,
  };
});
