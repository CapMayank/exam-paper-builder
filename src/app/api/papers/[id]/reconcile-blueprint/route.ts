import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { quotaRepresentatives } from "@/lib/blueprint";
import { assertCanModifyPaper, loadPaperView, toPlacedItems } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { reconcileBlueprintQuestions } from "@/lib/reconcileBlueprint";
import { questionCopyData, variantSubpartsColumn } from "@/lib/questionWrite";

export const POST = route(async (_req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") {
    throw new HttpError(409, "This paper is finalised. Reopen it to make adjustments.");
  }

  // Marks are owed by quota group: the lessons of one unit share a budget, so a question is only ever moved
  // between groups, never between two lessons of the same unit.
  const rep = quotaRepresentatives(paper.blueprint.chapters);
  const groups = new Map<string, { chapterId: string; title: string; marks: number }>();
  for (const c of paper.blueprint.chapters) {
    const key = rep.get(c.chapterId)!;
    const g = groups.get(key) ?? { chapterId: key, title: c.unitTitle || c.chapter?.title || `Chapter ${c.chapterId}`, marks: 0 };
    g.marks += c.marks;
    groups.set(key, g);
  }
  const blueprintChapters = [...groups.values()];

  const blueprintSections = paper.blueprint.sections.map((s) => ({
    id: s.id,
    title: s.title,
    type: s.type,
    count: s.count,
    marksEach: s.marksEach,
  }));

  const placed = toPlacedItems(paper.blueprint.sections, paper.items);
  const items = paper.items.map((i, idx) => ({
    paperItemId: i.id,
    questionId: i.question.id,
    sectionId: i.sectionId,
    chapterId: rep.get(i.question.chapterId) ?? i.question.chapterId,
    type: i.question.type,
    text: i.question.text,
    optionsJson: JSON.stringify(i.question.options || []),
    subpartsJson: i.question.subpartsJson ?? JSON.stringify(i.question.subparts || []),
    // counted exactly as the paper's progress counts it
    marks: placed[idx]?.marks,
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
        const forked = await tx.question.create({
          data: {
            ...questionCopyData(orig),
            chapterId: r.toChapterId,
            subpartsJson: variantSubpartsColumn(orig.subpartsJson, { forkedFrom: orig.id, paperId: id, reconciledToChapter: r.toChapterId }),
            createdById: user.id,
          },
        });

        const pq = await tx.paperQuestion.findUnique({
          where: { id: r.paperItemId },
          select: { orQuestionId: true },
        });

        // the OR alternative follows its main question to the new chapter
        let updatedOrId = pq?.orQuestionId ?? null;
        if (pq?.orQuestionId) {
          const origOr = await tx.question.findUnique({ where: { id: pq.orQuestionId } });
          if (origOr) {
            const forkedOr = await tx.question.create({
              data: {
                ...questionCopyData(origOr),
                chapterId: r.toChapterId,
                subpartsJson: variantSubpartsColumn(origOr.subpartsJson, { forkedFrom: origOr.id, paperId: id, reconciledToChapter: r.toChapterId }),
                createdById: user.id,
              },
            });
            updatedOrId = forkedOr.id;
          }
        }

        await tx.paperQuestion.update({
          where: { id: r.paperItemId },
          data: { questionId: forked.id, orQuestionId: updatedOrId },
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
