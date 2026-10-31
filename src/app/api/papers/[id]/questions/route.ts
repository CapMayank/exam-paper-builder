import { body, HttpError, route } from "@/lib/api";
import { whyCannotAdd } from "@/lib/blueprint";
import { parseMatchColumnPairs } from "@/lib/constants";
import { assertCanModifyPaper, loadPaperView, toPlacedItems } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { addItemSchema } from "@/lib/schemas";
import { parseSubpartsPayload, subpartsTotalMarks, validateSubPartsSum } from "@/lib/types";

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

  const targetSection = paper.blueprint.sections.find((s) => s.id === input.sectionId);
  if (!targetSection) throw new HttpError(404, "Section not found");

  const parsedCandidatePayload = parseSubpartsPayload(question.subpartsJson);
  const candidateSubparts = parsedCandidatePayload.subparts;
  const attemptCount = (question as any).attemptCount || parsedCandidatePayload.attemptCount;
  const isCandidateSubpartsValid = validateSubPartsSum(candidateSubparts, targetSection.marksEach, attemptCount);

  if (candidateSubparts.length > 0 && !isCandidateSubpartsValid) {
    const candidateSubmarks = attemptCount ? attemptCount * (candidateSubparts[0]?.marks || 1) : subpartsTotalMarks(candidateSubparts);
    throw new HttpError(
      400,
      `Board Guardrail Violation: Question total subpart marks (${candidateSubmarks}) must match section marks (${targetSection.marksEach}).`
    );
  }

  const candidateSubmarks = attemptCount
    ? attemptCount * (candidateSubparts[0]?.marks || 1)
    : subpartsTotalMarks(candidateSubparts);

  const isTargetMatch = targetSection.type === "MATCH_COLUMN";
  const isMultiUnitMatch = isTargetMatch && targetSection.count > 1;
  let matchPairsCount = 0;
  if (isTargetMatch) {
    try {
      const parsed = JSON.parse(question.optionsJson || "[]");
      matchPairsCount = parseMatchColumnPairs(Array.isArray(parsed) ? parsed : [], question.text, (question as any).explanation).length;
    } catch {}
  }

  const candidateMarks = isTargetMatch
    ? (isMultiUnitMatch
        ? Math.min(matchPairsCount || targetSection.count, targetSection.count) * targetSection.marksEach
        : targetSection.marksEach)
    : (candidateSubmarks > 0 ? Math.min(candidateSubmarks, targetSection.marksEach) : targetSection.marksEach);
  const candidateUnits = isMultiUnitMatch
    ? Math.min(matchPairsCount || targetSection.count, targetSection.count)
    : undefined;

  const placedItems = toPlacedItems(paper.blueprint.sections, paper.items);

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
      marks: candidateMarks,
      subpartsCount: candidateUnits,
    },
  );
  if (reason) throw new HttpError(409, reason);

  const last = paper.items.filter((i) => i.sectionId === input.sectionId).at(-1);
  await prisma.paperQuestion.create({
    data: {
      paperId: id,
      sectionId: input.sectionId,
      questionId: question.id,
      orQuestionId: input.orQuestionId || null,
      position: (last?.position ?? -1) + 1,
    },
  });
  await prisma.paper.update({ where: { id }, data: { updatedAt: new Date() } });
  return loadPaperView(id);
});
