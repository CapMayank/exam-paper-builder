import "server-only";
import { HttpError, type SessionUser } from "./api";
import { resolvePaperExamType } from "./constants";
import { toQuestionDto } from "./dto";
import { diagnosePaperImplications, paperStatus } from "./blueprint";
import { blueprintInclude } from "./blueprints";
import { prisma } from "./prisma";

export function canModifyPaper(user: SessionUser, paper: { createdById: string }): boolean {
  return paper.createdById === user.id || user.role === "ADMIN" || user.role === "HOD";
}

export function assertCanModifyPaper(user: SessionUser, paper: { createdById: string }): void {
  if (!canModifyPaper(user, paper)) {
    throw new HttpError(
      403,
      "Only the paper creator, Department Head (HOD), or Administrator can modify or delete this paper.",
    );
  }
}

const questionUsageInclude = {
  chapter: true,
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
          blueprint: { select: { book: { select: { className: true } } } },
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
          blueprint: { select: { book: { select: { className: true } } } },
        },
      },
    },
  },
} as const;

const paperInclude = {
  blueprint: { include: blueprintInclude },
  items: {
    orderBy: { position: "asc" },
    include: {
      question: { include: questionUsageInclude },
      orQuestion: { include: questionUsageInclude },
    },
  },
} as const;

/** Everything the builder and print views need, with progress computed server-side. */
export async function loadPaperView(id: string) {
  const paper = await prisma.paper.findUnique({ where: { id }, include: paperInclude });
  if (!paper) return null;
  const { blueprint, items, ...rest } = paper;
  const progress = paperStatus(
    {
      sections: blueprint.sections,
      chapters: blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks })),
    },
    items.map((i) => ({ sectionId: i.sectionId, chapterId: i.question.chapterId })),
  );
  const implications = diagnosePaperImplications(
    {
      sections: blueprint.sections,
      chapters: blueprint.chapters.map((c) => ({
        chapterId: c.chapterId,
        title: c.chapter?.title,
        marks: c.marks,
      })),
    },
    items.map((i) => ({
      id: i.id,
      sectionId: i.sectionId,
      chapterId: i.question.chapterId,
      type: i.question.type,
      text: i.question.text,
    })),
  );
  const resolvedExamType = resolvePaperExamType(paper);
  return {
    ...rest,
    examType: resolvedExamType,
    blueprint: {
      ...blueprint,
      examType: resolvedExamType,
    },
    items: items.map((i) => ({
      id: i.id,
      sectionId: i.sectionId,
      position: i.position,
      question: toQuestionDto(i.question),
      orQuestion: i.orQuestion ? toQuestionDto(i.orQuestion) : null,
    })),
    progress,
    implications,
  };
}

export type PaperView = NonNullable<Awaited<ReturnType<typeof loadPaperView>>>;
