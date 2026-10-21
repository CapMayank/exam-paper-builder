import "server-only";
import { HttpError, type SessionUser } from "./api";
import { resolvePaperExamType } from "./constants";
import { toQuestionDto } from "./dto";
import { diagnosePaperImplications, paperStatus } from "./blueprint";
import { blueprintInclude } from "./blueprints";
import { prisma } from "./prisma";
import { parseSubparts, subpartsTotalMarks } from "./types";

export function canModifyPaper(
  user: SessionUser,
  paper: { createdById: string; status?: string },
): boolean {
  if (paper.status === "FINAL") {
    return user.role === "ADMIN";
  }
  return (
    Boolean(paper.createdById && paper.createdById === user.id) ||
    user.role === "ADMIN" ||
    user.role === "HOD"
  );
}

export function assertCanModifyPaper(
  user: SessionUser,
  paper: { createdById: string; status?: string },
): void {
  if (paper.status === "FINAL" && user.role !== "ADMIN") {
    throw new HttpError(
      403,
      "Cannot modify or delete a finalized paper. Only an Administrator can unlock it.",
    );
  }
  if (!canModifyPaper(user, paper)) {
    throw new HttpError(
      403,
      "Only the paper creator, Department Head (HOD), or Administrator can modify or delete this paper.",
    );
  }
}

export function canModifyQuestion(
  user: SessionUser,
  question: { createdById: string },
): boolean {
  return (
    Boolean(question.createdById && question.createdById === user.id) ||
    user.role === "ADMIN" ||
    user.role === "HOD"
  );
}

export function assertCanModifyQuestion(
  user: SessionUser,
  question: { createdById: string },
): void {
  if (!canModifyQuestion(user, question)) {
    throw new HttpError(
      403,
      "Forbidden: You can only edit or delete your own questions.",
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
    items.map((i) => {
      const subparts = parseSubparts(i.question.subpartsJson);
      const submarks = subpartsTotalMarks(subparts);
      return {
        sectionId: i.sectionId,
        chapterId: i.question.chapterId,
        marks: submarks > 0 ? submarks : undefined,
        subpartsCount: subparts.length > 0 ? subparts.length : undefined,
      };
    }),
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
    items.map((i) => {
      const subparts = parseSubparts(i.question.subpartsJson);
      const submarks = subpartsTotalMarks(subparts);
      return {
        id: i.id,
        sectionId: i.sectionId,
        chapterId: i.question.chapterId,
        type: i.question.type,
        text: i.question.text,
        marks: submarks > 0 ? submarks : undefined,
        subpartsCount: subparts.length > 0 ? subparts.length : undefined,
      };
    }),
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
