import { body, HttpError, route } from "@/lib/api";
import { pairMarksProblem, slotPlacement, spansSlots, subpartsMarksProblem, whyCannotAdd } from "@/lib/blueprint";
import { parseMatchColumnPairs } from "@/lib/constants";
import { assertCanModifyPaper, assertValidOrChoice, loadPaperView, toPlacedItems } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { addItemSchema } from "@/lib/schemas";

function safeJsonArray(json: string | null | undefined): string[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

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

  const marksProblem = subpartsMarksProblem(targetSection, question);
  if (marksProblem) throw new HttpError(400, `Question ${marksProblem}`);

  // the pair value is chosen here, before the question counts against the section (class 8 and below)
  let pairMarks: number | null = null;
  if (input.pairMarks !== undefined && input.pairMarks !== 1) {
    if (question.type !== "MATCH_COLUMN") throw new HttpError(400, "Marks per pair only applies to a match question.");
    const pairs = parseMatchColumnPairs(safeJsonArray(question.optionsJson), question.text, question.explanation).length;
    const problem = pairMarksProblem(targetSection, pairs, input.pairMarks);
    if (problem) throw new HttpError(400, problem);
    pairMarks = input.pairMarks;
  } else if (input.pairMarks === 1 && question.type === "MATCH_COLUMN" && !spansSlots(targetSection) && targetSection.type !== "MATCH_COLUMN") {
    pairMarks = null;
  }

  const reason = whyCannotAdd(
    {
      sections: paper.blueprint.sections,
      chapters: paper.blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks, unitKey: c.unitKey, unitTitle: c.unitTitle })),
    },
    toPlacedItems(paper.blueprint.sections, paper.items),
    {
      sectionId: input.sectionId,
      chapterId: question.chapterId,
      type: question.type,
      ...slotPlacement(targetSection, { ...question, options: safeJsonArray(question.optionsJson), pairMarks } as never),
      passageGroupId: question.passageGroupId,
    },
  );
  if (reason) throw new HttpError(409, reason);

  // an OR sent along with the question is held to the same rules as one linked afterwards
  if (input.orQuestionId) {
    await assertValidOrChoice(paper, { sectionId: input.sectionId }, question, input.orQuestionId);
  }

  const last = paper.items.filter((i) => i.sectionId === input.sectionId).at(-1);
  await prisma.paperQuestion.create({
    data: {
      paperId: id,
      sectionId: input.sectionId,
      questionId: question.id,
      orQuestionId: input.orQuestionId || null,
      position: (last?.position ?? -1) + 1,
      pairMarks,
    },
  });
  await prisma.paper.update({ where: { id }, data: { updatedAt: new Date() } });
  return loadPaperView(id);
});
