import type { Prisma } from "@prisma/client";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { toQuestionDto } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import { questionSchema } from "@/lib/schemas";

const include = {
  chapter: true,
  _count: { select: { paperQuestions: true, orPaperQuestions: true } },
  paperQuestions: {
    select: {
      paperId: true,
      orQuestionId: true,
      paper: {
        select: {
          id: true,
          title: true,
          paperSet: true,
          examDate: true,
          academicSession: true,
          status: true,
          blueprint: { select: { book: { select: { className: true, subject: true } } } },
        },
      },
    },
  },
  orPaperQuestions: {
    select: {
      paperId: true,
      paper: {
        select: {
          id: true,
          title: true,
          paperSet: true,
          examDate: true,
          academicSession: true,
          status: true,
          blueprint: { select: { book: { select: { className: true, subject: true } } } },
        },
      },
    },
  },
} as const;

export const GET = route(async (req) => {
  const sp = new URL(req.url).searchParams;
  const where: Prisma.QuestionWhereInput = {};
  const bookId = sp.get("bookId");
  const chapterId = sp.get("chapterId");
  const type = sp.get("type");
  const difficulty = sp.get("difficulty");
  const q = sp.get("q")?.trim();
  const excludePaperId = sp.get("excludePaperId");
  if (bookId) where.bookId = bookId;
  if (chapterId) where.chapterId = chapterId;
  if (type) where.type = type;
  if (difficulty) where.difficulty = difficulty;
  if (q) where.text = { contains: q };
  if (excludePaperId) where.paperQuestions = { none: { paperId: excludePaperId } };

  const rows = await prisma.question.findMany({
    where,
    include,
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return rows.map(toQuestionDto);
});

export const POST = route(async (req, _params, user) => {
  const input = await body(req, questionSchema);
  const chapter = await prisma.chapter.findUnique({ where: { id: input.chapterId } });
  if (!chapter || chapter.bookId !== input.bookId) throw new HttpError(400, "Chapter does not belong to that book");
  const { options, subparts, ...rest } = input;
  const created = await prisma.question.create({
    data: {
      ...rest,
      optionsJson: JSON.stringify(options),
      subpartsJson: JSON.stringify(subparts ?? []),
      createdById: user.id,
    },
    include,
  });

  await recordAudit(user, "QUESTION_CREATE", "QUESTION", created.id, {
    type: created.type,
    difficulty: created.difficulty,
    bookId: created.bookId,
    chapterId: created.chapterId,
    textPreview: created.text.slice(0, 80),
  });

  return toQuestionDto(created);
});
