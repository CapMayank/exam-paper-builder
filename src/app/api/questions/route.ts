import type { Prisma } from "@prisma/client";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { toQuestionDto } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import { questionSchema } from "@/lib/schemas";
import { subpartsTotalMarks } from "@/lib/types";

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
  const className = sp.get("className")?.trim();
  const subject = sp.get("subject")?.trim();
  const type = sp.get("type");
  const difficulty = sp.get("difficulty");
  const q = sp.get("q")?.trim();
  const excludePaperId = sp.get("excludePaperId");

  if (bookId) {
    where.bookId = bookId;
  } else if (className || subject) {
    where.book = {
      ...(className && className !== "ALL" ? { className } : {}),
      ...(subject && subject !== "ALL" ? { subject } : {}),
    };
  }
  if (chapterId) where.chapterId = chapterId;
  if (type) where.type = type;
  if (difficulty) where.difficulty = difficulty;
  if (q) where.text = { contains: q };
  if (excludePaperId) {
    const excludeFilters: Prisma.QuestionWhereInput[] = [
      { paperQuestions: { none: { paperId: excludePaperId } } },
      { orPaperQuestions: { none: { paperId: excludePaperId } } },
    ];
    if (where.AND) {
      where.AND = Array.isArray(where.AND) ? [...where.AND, ...excludeFilters] : [where.AND, ...excludeFilters];
    } else {
      where.AND = excludeFilters;
    }
  }

  // Filter out internal shuffled variant clones from bank browsing by default
  if (sp.get("includeVariants") !== "true") {
    const notForked: Prisma.QuestionWhereInput = {
      NOT: { subpartsJson: { contains: "_forkedFrom" } },
    };
    if (where.AND) {
      where.AND = Array.isArray(where.AND) ? [...where.AND, notForked] : [where.AND, notForked];
    } else {
      where.AND = [notForked];
    }
  }

  const takeParam = sp.get("take");
  const take = takeParam ? Math.min(1000, Math.max(1, parseInt(takeParam, 10))) : 500;
  const skipParam = sp.get("skip");
  const skip = skipParam ? Math.max(0, parseInt(skipParam, 10)) : undefined;

  const rows = await prisma.question.findMany({
    where,
    include,
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });

  let dtos = rows.map(toQuestionDto);
  const marksParam = sp.get("marks");
  if (marksParam && !isNaN(Number(marksParam))) {
    const targetMarks = Number(marksParam);
    dtos = dtos.filter((q) => {
      if (q.subparts && q.subparts.length > 0) {
        return subpartsTotalMarks(q.subparts) === targetMarks;
      }
      if (targetMarks === 1) return ["MCQ", "VSA", "TRUE_FALSE", "FILL_BLANKS", "ASSERTION_REASON"].includes(q.type);
      if (targetMarks === 2) return ["SA", "SHORT", "DRAW"].includes(q.type);
      if (targetMarks === 3) return ["SA", "SHORT"].includes(q.type);
      if (targetMarks === 4) return ["CASE_STUDY", "PASSAGE"].includes(q.type);
      if (targetMarks === 5) return ["LA", "LONG"].includes(q.type);
      if (targetMarks === 6) return ["LA", "LONG"].includes(q.type);
      return true;
    });
  }

  return dtos;
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
