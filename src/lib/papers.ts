import "server-only";
import { HttpError, type SessionUser } from "./api";
import { parseMatchColumnPairs, resolvePaperExamType } from "./constants";
import { toQuestionDto } from "./dto";
import { diagnosePaperImplications, paperStatus, toPlacedItems } from "./blueprint";
import { blueprintInclude } from "./blueprints";
import { prisma } from "./prisma";
import { parseSubparts, subpartsTotalMarks } from "./types";

export { toPlacedItems };

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
  const placedItems = toPlacedItems(blueprint.sections, items);
  const progress = paperStatus(
    {
      sections: blueprint.sections,
      chapters: blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks })),
    },
    placedItems,
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
      const isMatch = i.question.type === "MATCH_COLUMN";
      let matchCount = 0;
      if (isMatch) {
        let opts: string[] = [];
        try {
          const p = JSON.parse(i.question.optionsJson || "[]");
          opts = Array.isArray(p) ? p : [];
        } catch {}
        matchCount = parseMatchColumnPairs(opts, i.question.text, (i.question as any).explanation).length;
      }
      const subparts = parseSubparts(i.question.subpartsJson);
      const submarks = subpartsTotalMarks(subparts);
      const sec = blueprint.sections.find((s) => s.id === i.sectionId);
      const secMarksEach = sec?.marksEach ?? 1;
      const secCount = sec?.count ?? 1;
      const secIsMatch = sec?.type === "MATCH_COLUMN";
      const isMultiUnitMatch = isMatch && secIsMatch && secCount > 1 && secMarksEach === 1;

      const matchMarks = isMatch
        ? (isMultiUnitMatch
            ? Math.min(matchCount || secCount, secCount) * secMarksEach
            : secMarksEach)
        : 0;
      const effectiveMarks = isMatch ? matchMarks : (submarks > 0 ? submarks : secMarksEach);
      const effectiveUnits = isMultiUnitMatch
        ? Math.min(matchCount > 0 ? matchCount : secCount, secCount)
        : undefined;
      return {
        id: i.id,
        sectionId: i.sectionId,
        chapterId: i.question.chapterId,
        type: i.question.type,
        text: i.question.text,
        marks: effectiveMarks,
        subpartsCount: effectiveUnits,
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
      pageBreakBefore: Boolean(i.pageBreakBefore),
      question: toQuestionDto(i.question),
      orQuestion: i.orQuestion ? toQuestionDto(i.orQuestion) : null,
    })),
    progress,
    implications,
  };
}

export type PaperView = NonNullable<Awaited<ReturnType<typeof loadPaperView>>>;
