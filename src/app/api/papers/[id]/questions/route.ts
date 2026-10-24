import { body, HttpError, route } from "@/lib/api";
import { whyCannotAdd } from "@/lib/blueprint";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { addItemSchema } from "@/lib/schemas";
import { parseSubparts, subpartsTotalMarks } from "@/lib/types";

/** Add a question to a section. The blueprint rules are enforced here, not just in the UI. */
export const POST = route(async (req, { id }, user) => {
  const input = await body(req, addItemSchema);
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") throw new HttpError(409, "This paper is finalised. Reopen it to make changes.");

  const question = await prisma.question.findUnique({ where: { id: input.questionId } });
  if (!question) throw new HttpError(404, "Question not found");
  if (question.bookId !== paper.blueprint.bookId) throw new HttpError(400, "This question is from a different book.");
  if (paper.items.some((i) => i.question.id === question.id || i.orQuestion?.id === question.id)) {
    throw new HttpError(409, "This question is already in the paper (as primary or alternate question).");
  }

  const placedItems = paper.items.map((i) => {
    const subparts = parseSubparts(i.question.subpartsJson);
    const submarks = subpartsTotalMarks(subparts);
    return {
      sectionId: i.sectionId,
      chapterId: i.question.chapterId,
      marks: submarks > 0 ? submarks : undefined,
      subpartsCount: subparts.length > 1 ? subparts.length : undefined,
    };
  });

  const candidateSubparts = parseSubparts(question.subpartsJson);
  const candidateSubmarks = subpartsTotalMarks(candidateSubparts);

  const targetSection = paper.blueprint.sections.find((s) => s.id === input.sectionId);
  if (!targetSection) throw new HttpError(404, "Section not found");

  if (candidateSubparts.length > 0 && candidateSubmarks !== targetSection.marksEach) {
    throw new HttpError(
      400,
      `Board Guardrail Violation: Question total subpart marks (${candidateSubmarks}) must match section marks (${targetSection.marksEach}).`
    );
  }

  const reason = whyCannotAdd(
    {
      sections: paper.blueprint.sections,
      chapters: paper.blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks })),
    },
    placedItems,
    {
      sectionId: input.sectionId,
      chapterId: question.chapterId,
      type: question.type,
      marks: candidateSubmarks > 0 ? candidateSubmarks : undefined,
      subpartsCount: candidateSubparts.length > 1 ? candidateSubparts.length : undefined,
    },
  );
  if (reason) throw new HttpError(409, reason);

  const last = paper.items.filter((i) => i.sectionId === input.sectionId).at(-1);
  await prisma.paperQuestion.create({
    data: { paperId: id, sectionId: input.sectionId, questionId: question.id, position: (last?.position ?? -1) + 1 },
  });
  await prisma.paper.update({ where: { id }, data: { updatedAt: new Date() } });
  return loadPaperView(id);
});
