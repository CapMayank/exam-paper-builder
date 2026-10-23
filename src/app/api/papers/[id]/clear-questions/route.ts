import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";

export const POST = route(async (_req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") {
    throw new HttpError(409, "This paper is finalised. Reopen it to make changes.");
  }

  // Remove all placed questions for this paper
  const deleted = await prisma.paperQuestion.deleteMany({
    where: { paperId: id },
  });

  await prisma.paper.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  await recordAudit(user, "PAPER_UPDATE", "PAPER", id, {
    action: "PAPER_QUESTIONS_CLEARED",
    title: paper.title,
    deletedCount: deleted.count,
  });

  const updatedPaper = await loadPaperView(id);

  return {
    success: true,
    deletedCount: deleted.count,
    paper: updatedPaper,
  };
});
