import type { Prisma } from "@prisma/client";
import { questionColumns, VARIANT_MARKER } from "@/lib/questionWrite";
import { keepActive, scopeFromRequest } from "@/lib/viewScope";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { toQuestionDto } from "@/lib/dto";
import { assertCanManageScope } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { questionSchema } from "@/lib/schemas";
import { canHaveSubparts } from "@/lib/constants";
import { attemptedSubpartsMarks, parseSubpartsPayload, type SubPart } from "@/lib/types";

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

  const scope = scopeFromRequest(req);
  if (bookId) {
    where.bookId = bookId;
  } else if (!scope.showOther) {
    // outside an explicit book, only offer questions from books of the active subjects
    const books = await prisma.book.findMany({ select: { id: true, className: true, subject: true } });
    const ids = keepActive(books, (b) => b, scope).map((b) => b.id);
    where.bookId = { in: ids };
    if (className || subject) {
      where.book = {
        ...(className && className !== "ALL" ? { className } : {}),
        ...(subject && subject !== "ALL" ? { subject } : {}),
      };
    }
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
      NOT: { subpartsJson: { contains: VARIANT_MARKER } },
    };
    if (where.AND) {
      where.AND = Array.isArray(where.AND) ? [...where.AND, notForked] : [where.AND, notForked];
    } else {
      where.AND = [notForked];
    }
  }

  // Freshness is a relation filter, so the database can do it (and count it) directly.
  const freshness = sp.get("freshness");
  if (freshness === "FRESH" || freshness === "USED") {
    const unused: Prisma.QuestionWhereInput = { paperQuestions: { none: {} }, orPaperQuestions: { none: {} } };
    addAnd(where, freshness === "FRESH" ? unused : { NOT: unused });
  }

  // Explicit book list (the bank page sends the books its class/subject filter matched).
  const bookIdsParam = sp.get("bookIds");
  if (!bookId && bookIdsParam !== null) {
    const ids = bookIdsParam.split(",").filter(Boolean);
    addAnd(where, { bookId: { in: ids } });
  }

  const marksParam = sp.get("marks");
  const targetMarks = marksParam && !isNaN(Number(marksParam)) ? Number(marksParam) : null;
  const orderBy = [{ createdAt: "desc" }, { id: "desc" }] satisfies Prisma.QuestionOrderByWithRelationInput[];

  // Paged mode: { items, total, page, pageSize }. Used by the question bank page.
  if (sp.get("paged") === "1") {
    const pageSize = clampInt(sp.get("pageSize"), 50, 1, 200);
    let page = clampInt(sp.get("page"), 1, 1, Number.MAX_SAFE_INTEGER);

    if (targetMarks === null) {
      const total = await prisma.question.count({ where });
      page = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
      const rows = await prisma.question.findMany({ where, include, orderBy, skip: (page - 1) * pageSize, take: pageSize });
      return { items: rows.map(toQuestionDto), total, page, pageSize };
    }

    // Marks depend on parsed sub-parts, so filter a light projection, then load only one page in full.
    const light = await prisma.question.findMany({ where, select: { id: true, type: true, subpartsJson: true }, orderBy });
    const ids = light.filter((r) => matchesMarks(r.type, r.subpartsJson, targetMarks)).map((r) => r.id);
    const total = ids.length;
    page = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
    const pageIds = ids.slice((page - 1) * pageSize, page * pageSize);
    const rows = pageIds.length ? await prisma.question.findMany({ where: { id: { in: pageIds } }, include, orderBy }) : [];
    return { items: rows.map(toQuestionDto), total, page, pageSize };
  }

  const takeParam = sp.get("take");
  const take = takeParam ? Math.min(1000, Math.max(1, parseInt(takeParam, 10))) : 500;
  const skipParam = sp.get("skip");
  const skip = skipParam ? Math.max(0, parseInt(skipParam, 10)) : undefined;

  const rows = await prisma.question.findMany({ where, include, orderBy, take, skip });

  let dtos = rows.map(toQuestionDto);
  if (targetMarks !== null) {
    dtos = dtos.filter((q) => matchesMarksDto(q.type, q.subparts, q.attemptCount, targetMarks));
  }

  return dtos;
});

function addAnd(where: Prisma.QuestionWhereInput, clause: Prisma.QuestionWhereInput) {
  if (!where.AND) where.AND = [clause];
  else where.AND = Array.isArray(where.AND) ? [...where.AND, clause] : [where.AND, clause];
}

function clampInt(raw: string | null, fallback: number, min: number, max: number) {
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function matchesMarks(type: string, subpartsJson: string | null, targetMarks: number) {
  if (canHaveSubparts(type) && subpartsJson) {
    const { subparts, attemptCount } = parseSubpartsPayload(subpartsJson);
    return matchesMarksDto(type, subparts, attemptCount, targetMarks);
  }
  return matchesMarksDto(type, [], undefined, targetMarks);
}

function matchesMarksDto(type: string, subparts: SubPart[] | undefined, attemptCount: number | undefined, targetMarks: number) {
  if (subparts && subparts.length > 0) {
    return attemptedSubpartsMarks(subparts, attemptCount) === targetMarks;
  }
  if (targetMarks === 1) {
    return [
      "MCQ",
      "ASSERTION_REASON",
      "TRUE_FALSE",
      "FILL_BLANK",
      "FILL_BLANKS",
      "VERY_SHORT",
      "VSA",
      "GRAMMAR",
      "ONE_WORD",
    ].includes(type);
  }
  if (targetMarks === 2) return ["SA", "SHORT", "DRAW", "VERY_SHORT", "GRAMMAR"].includes(type);
  if (targetMarks === 3) return ["SA", "SHORT", "DRAW", "GRAMMAR", "REFERENCE_CONTEXT"].includes(type);
  if (targetMarks === 4) return ["CASE_STUDY", "PASSAGE", "UNSEEN_PASSAGE", "REFERENCE_CONTEXT", "WRITING_SKILL", "MATCH_COLUMN"].includes(type);
  if (targetMarks === 5) return ["LA", "LONG", "WRITING_SKILL", "MAP_WORK", "CASE_STUDY", "MATCH_COLUMN"].includes(type);
  if (targetMarks === 6) return ["LA", "LONG", "WRITING_SKILL"].includes(type);
  return true;
}

export const POST = route(async (req, _params, user) => {
  const input = await body(req, questionSchema);
  const chapter = await prisma.chapter.findUnique({ where: { id: input.chapterId }, include: { book: { select: { className: true, subject: true } } } });
  if (!chapter || chapter.bookId !== input.bookId) throw new HttpError(400, "Chapter does not belong to that book");
  assertCanManageScope(user, chapter.book);
  const created = await prisma.question.create({
    data: { ...questionColumns(input), createdById: user.id },
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
