import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { paperUpdateSchema } from "@/lib/schemas";

export const GET = route(async (_req, { id }) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  return paper;
});

export const PATCH = route(async (req, { id }, user) => {
  const input = await body(req, paperUpdateSchema);
  const current = await loadPaperView(id);
  if (!current) throw new HttpError(404, "Paper not found");

  assertCanModifyPaper(user, current);
  if (input.status === "FINAL") {
    if (!current.progress.complete) {
      throw new HttpError(409, "The paper doesn't match its blueprint yet, so it can't be finalised.");
    }
    if (current.internalChoiceAudit && !current.internalChoiceAudit.compliant) {
      throw new HttpError(409, "The paper does not comply with official internal choice rules. Please fix missing or forbidden choices before finalising.");
    }
  }
  await prisma.paper.update({ where: { id }, data: input });

  if (input.status && input.status !== current.status) {
    await recordAudit(user, "PAPER_STATUS_CHANGE", "PAPER", id, {
      title: current.title,
      from: current.status,
      to: input.status,
    });
  } else {
    await recordAudit(user, "PAPER_UPDATE", "PAPER", id, {
      title: input.title ?? current.title,
      updatedFields: Object.keys(input),
    });
  }

  return loadPaperView(id);
});

export const DELETE = route(async (_req, { id }, user) => {
  const paper = await prisma.paper.findUnique({
    where: { id },
    select: { status: true, title: true, createdById: true },
  });
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  await prisma.paper.delete({ where: { id } });

  // Clean up any unreferenced shuffled variant questions created for this paper
  await prisma.question.deleteMany({
    where: {
      subpartsJson: { contains: `"_paperId":"${id}"` },
      paperQuestions: { none: {} },
      orPaperQuestions: { none: {} },
    },
  });

  await recordAudit(user, "PAPER_UPDATE", "PAPER", id, {
    title: paper.title,
    action: "DELETED",
  });
});
