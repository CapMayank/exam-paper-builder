import { body, HttpError, route } from "@/lib/api";
import { toQuestionDto } from "@/lib/dto";
import { assertCanModifyQuestion, canModifyQuestion } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { questionPatchSchema, questionSchema } from "@/lib/schemas";

export { assertCanModifyQuestion, canModifyQuestion };

export const GET = route(async (_req, { id }) => {
  const question = await prisma.question.findUnique({
    where: { id },
    include: { chapter: true, _count: { select: { paperQuestions: true } } },
  });
  if (!question) throw new HttpError(404, "Question not found");
  return toQuestionDto(question);
});

export const PATCH = route(async (req, { id }, user) => {
  const input = await body(req, questionPatchSchema);
  const existing = await prisma.question.findUnique({
    where: { id },
    include: { paperQuestions: { select: { paper: { select: { status: true } } } } },
  });
  if (!existing) throw new HttpError(404, "Question not found");
  assertCanModifyQuestion(user, existing);
  if (existing.paperQuestions.some((p) => p.paper.status === "FINAL")) {
    throw new HttpError(409, "This question is in a finalised paper and can't be edited.");
  }
  const data: Record<string, unknown> = {};
  if (input.text !== undefined) data.text = input.text;
  if (input.options !== undefined) data.optionsJson = JSON.stringify(input.options);
  if (input.subparts !== undefined) data.subpartsJson = JSON.stringify(input.subparts);
  if (input.answer !== undefined) data.answer = input.answer;
  if (input.difficulty !== undefined) data.difficulty = input.difficulty;
  if (input.spaceMm !== undefined) data.spaceMm = input.spaceMm;
  if (input.showGrid !== undefined) data.showGrid = input.showGrid;

  const updated = await prisma.question.update({
    where: { id },
    data,
    include: { chapter: true, _count: { select: { paperQuestions: true } } },
  });
  return toQuestionDto(updated);
});

export const PUT = route(async (req, { id }, user) => {
  const input = await body(req, questionSchema);
  const existing = await prisma.question.findUnique({
    where: { id },
    include: { paperQuestions: { select: { paper: { select: { status: true } }, section: { select: { type: true } } } } },
  });
  if (!existing) throw new HttpError(404, "Question not found");
  assertCanModifyQuestion(user, existing);
  if (existing.paperQuestions.some((p) => p.paper.status === "FINAL")) {
    throw new HttpError(409, "This question is in a finalised paper and can't be edited.");
  }
  // A question already placed in a section must keep a type that section accepts.
  if (existing.paperQuestions.some((p) => p.section.type !== input.type)) {
    throw new HttpError(409, "This question is used in a paper section that needs its current type.");
  }
  const chapter = await prisma.chapter.findUnique({ where: { id: input.chapterId } });
  if (!chapter || chapter.bookId !== input.bookId) throw new HttpError(400, "Chapter does not belong to that book");
  if (existing.paperQuestions.length > 0 && (input.chapterId !== existing.chapterId || input.bookId !== existing.bookId)) {
    throw new HttpError(409, "This question is used in a paper, so its chapter can't change.");
  }
  const { options, subparts, ...rest } = input;
  const updated = await prisma.question.update({
    where: { id },
    data: {
      ...rest,
      optionsJson: JSON.stringify(options),
      subpartsJson: JSON.stringify(subparts ?? []),
    },
    include: { chapter: true, _count: { select: { paperQuestions: true } } },
  });
  return toQuestionDto(updated);
});

export const DELETE = route(async (_req, { id }, user) => {
  const existing = await prisma.question.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });
  if (!existing) throw new HttpError(404, "Question not found");
  assertCanModifyQuestion(user, existing);
  const used = await prisma.paperQuestion.count({ where: { questionId: id } });
  if (used > 0) throw new HttpError(409, `This question is used in ${used} paper(s). Remove it from them first.`);
  await prisma.question.delete({ where: { id } });
});

