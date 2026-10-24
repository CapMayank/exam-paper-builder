import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { reconcileBlueprintQuestions } from "@/lib/reconcileBlueprint";
import { parseSubparts } from "@/lib/types";

export const POST = route(async (_req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") {
    throw new HttpError(409, "This paper is finalised. Reopen it to make adjustments.");
  }

  const blueprintChapters = paper.blueprint.chapters.map((c) => ({
    chapterId: c.chapterId,
    title: c.chapter?.title || `Chapter ${c.chapterId}`,
    marks: c.marks,
  }));

  const blueprintSections = paper.blueprint.sections.map((s) => ({
    id: s.id,
    title: s.title,
    type: s.type,
    count: s.count,
    marksEach: s.marksEach,
  }));

  const items = paper.items.map((i) => ({
    paperItemId: i.id,
    questionId: i.question.id,
    sectionId: i.sectionId,
    chapterId: i.question.chapterId,
    type: i.question.type,
    text: i.question.text,
    optionsJson: JSON.stringify(i.question.options || []),
    subpartsJson: JSON.stringify(i.question.subparts || []),
  }));

  const reconciliation = reconcileBlueprintQuestions({
    chapters: blueprintChapters,
    sections: blueprintSections,
    items,
  });

  if (reconciliation.reassignments.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const r of reconciliation.reassignments) {
        // Always fork a paper-specific question variant with the adjusted chapter so the master bank remains uncorrupted
        const orig = await tx.question.findUniqueOrThrow({ where: { id: r.questionId } });
        const origSubparts = parseSubparts(orig.subpartsJson);
        const forkedSubparts = {
          items: origSubparts,
          _forkedFrom: orig.id,
          _reconciledToChapter: r.toChapterId,
        };

        const forked = await tx.question.create({
          data: {
            bookId: orig.bookId,
            chapterId: r.toChapterId,
            type: orig.type,
            text: orig.text,
            optionsJson: orig.optionsJson,
            subpartsJson: JSON.stringify(forkedSubparts),
            answer: orig.answer,
            difficulty: orig.difficulty,
            imagePath: orig.imagePath,
            spaceMm: orig.spaceMm,
            showGrid: orig.showGrid,
            createdById: user.id,
          },
        });
        await tx.paperQuestion.update({
          where: { id: r.paperItemId },
          data: { questionId: forked.id },
        });
      }
      await tx.paper.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
    });

    await recordAudit(user, "PAPER_UPDATE", "PAPER", id, {
      action: "RECONCILE_BLUEPRINT",
      reassignmentsCount: reconciliation.reassignments.length,
      isBalanced: reconciliation.isBalanced,
      reassignments: reconciliation.reassignments,
    });
  }

  const updatedPaper = await loadPaperView(id);

  return {
    success: true,
    reassignmentsCount: reconciliation.reassignments.length,
    isBalanced: reconciliation.isBalanced,
    reassignments: reconciliation.reassignments,
    summary: reconciliation.summary,
    paper: updatedPaper,
  };
});
