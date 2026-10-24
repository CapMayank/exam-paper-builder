import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { autoFillPaper } from "@/lib/autofill";
import { assertCanModifyPaper, loadPaperView, toPlacedItems } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { parseSubparts, subpartsTotalMarks } from "@/lib/types";

/**
 * 1-Click Smart Auto-Fill:
 * Automatically assembles remaining questions for a draft paper from the question bank,
 * strictly abiding by section question types and blueprint chapter weightage quotas.
 */
export const POST = route(async (req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") throw new HttpError(409, "This paper is finalised. Reopen it to make changes.");

  const raw = await req.clone().json().catch(() => ({}));
  const targetSectionId = typeof raw.sectionId === "string" ? raw.sectionId : undefined;
  const preferredDifficulty = typeof raw.difficulty === "string" ? raw.difficulty : undefined;

  if (targetSectionId) {
    const sec = paper.blueprint.sections.find((s) => s.id === targetSectionId);
    const placed = paper.items.filter((i) => i.sectionId === targetSectionId).length;
    if (sec && placed >= sec.count) {
      return {
        success: true,
        addedCount: 0,
        unfilled: [],
        complete: paper.progress.complete,
        message: `${sec.title} is already fully filled.`,
        paper,
      };
    }
  } else if (paper.progress.complete) {
    return {
      success: true,
      addedCount: 0,
      unfilled: [],
      complete: true,
      message: "Paper is already complete according to blueprint.",
      paper,
    };
  }

  // Fetch all available questions for this book including subparts
  const bankQuestions = await prisma.question.findMany({
    where: { bookId: paper.blueprint.bookId },
    select: { id: true, chapterId: true, type: true, difficulty: true, subpartsJson: true },
  });

  const candidatePool = bankQuestions.map((q) => {
    const sps = parseSubparts(q.subpartsJson);
    const subMarks = subpartsTotalMarks(sps);
    return {
      id: q.id,
      chapterId: q.chapterId,
      type: q.type,
      difficulty: q.difficulty,
      subpartsMarks: subMarks > 0 ? subMarks : undefined,
    };
  });

  const orQuestionIds = paper.items
    .map((i) => i.orQuestion?.id)
    .filter((qid): qid is string => Boolean(qid));

  const result = autoFillPaper(
    {
      sections: paper.blueprint.sections,
      chapters: paper.blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks })),
    },
    toPlacedItems(paper.blueprint.sections, paper.items),
    candidatePool,
    orQuestionIds,
    { targetSectionId, preferredDifficulty },
  );

  const unfilledSummary = result.unfilled.length > 0
    ? ` Unfilled: ${result.unfilled.map((u) => `${u.title} (${u.count} needed)`).join(", ")}.`
    : "";

  if (result.added.length === 0) {
    return {
      success: false,
      addedCount: 0,
      unfilled: result.unfilled,
      complete: false,
      message: `No matching questions found in question bank for remaining blueprint quotas.${unfilledSummary}`,
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

  await recordAudit(user, "PAPER_UPDATE", "PAPER", id, {
    action: "PAPER_AUTOFILL",
    title: paper.title,
    addedCount: result.added.length,
    complete: result.complete,
  });

  const updatedPaper = await loadPaperView(id);

  const modeNote = result.exhaustedBudget || result.solverMode === "greedy"
    ? " (Greedy mode used — manual review of chapter distribution recommended)."
    : "";

  return {
    success: true,
    addedCount: result.added.length,
    unfilled: result.unfilled,
    complete: result.complete,
    solverMode: result.solverMode,
    message: result.complete
      ? `Successfully auto-filled ${result.added.length} questions. Paper is now complete!${modeNote}`
      : `Auto-filled ${result.added.length} questions.${unfilledSummary}${modeNote}`,
    paper: updatedPaper,
  };
});
