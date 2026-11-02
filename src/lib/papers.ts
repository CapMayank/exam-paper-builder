import "server-only";
import { HttpError, type SessionUser } from "./api";
import { isSubpartQuestionType, parseMatchColumnPairs, resolvePaperExamType } from "./constants";
import { toQuestionDto } from "./dto";
import { diagnosePaperImplications, paperStatus, questionSlotMarks, toPlacedItems } from "./blueprint";
import { componentImplications, parseComponents } from "./languageComponents";
import { blueprintInclude } from "./blueprints";
import { evaluatePaperInternalChoiceCompliance } from "./internalChoiceRules";
import { prisma } from "./prisma";
import { parseSubparts, parseSubpartsPayload, subpartsTotalMarks } from "./types";

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
      chapters: blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks, unitKey: c.unitKey, unitTitle: c.unitTitle })),
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
        unitKey: c.unitKey,
        unitTitle: c.unitTitle,
      })),
    },
    items.map((i) => {
      const sec = blueprint.sections.find((x) => x.id === i.sectionId) ?? { count: 1, marksEach: 1 };
      const { marks, units } = questionSlotMarks(sec, i.question as never);
      const multiUnitMatch =
        i.question.type === "MATCH_COLUMN" && (sec as { type?: string }).type === "MATCH_COLUMN" && sec.count > 1;
      return {
        id: i.id,
        sectionId: i.sectionId,
        chapterId: i.question.chapterId,
        type: i.question.type,
        text: i.question.text,
        marks,
        subpartsCount: multiUnitMatch ? units : undefined,
      };
    }),
  );
  const components = parseComponents((blueprint as { componentsJson?: string }).componentsJson);
  implications.push(
    ...componentImplications(
      components,
      items.map((i, idx) => ({
        componentKey: i.componentKey,
        marks: placedItems[idx]?.marks ?? 0,
      })),
    ),
  );
  const resolvedExamType = resolvePaperExamType(paper);
  const dtoItems = items.map((i) => ({
    id: i.id,
    sectionId: i.sectionId,
    position: i.position,
    pageBreakBefore: Boolean(i.pageBreakBefore),
    componentKey: i.componentKey || "",
    question: toQuestionDto(i.question),
    orQuestion: i.orQuestion ? toQuestionDto(i.orQuestion) : null,
  }));

  const internalChoiceAudit = evaluatePaperInternalChoiceCompliance({
    schoolName: rest.schoolName,
    blueprintName: blueprint.name,
    className: blueprint.book.className,
    academicSession: rest.academicSession || blueprint.academicSession,
    subject: blueprint.book.subject,
    subjectCode: rest.subjectCode || blueprint.subjectCode,
    sections: blueprint.sections.map((s) => ({
      id: s.id,
      title: s.title,
      type: s.type,
      count: s.count,
      marksEach: s.marksEach,
      instructions: s.instructions,
      orChoiceMode: (s as any).orChoiceMode,
      orAlternativeCount: (s as any).orAlternativeCount,
      orSlotsJson: (s as any).orSlotsJson,
    })),
    items: dtoItems.map((i) => ({
      id: i.id,
      sectionId: i.sectionId,
      question: {
        id: i.question.id,
        text: i.question.text,
        type: i.question.type,
        chapterId: i.question.chapter?.id || i.question.chapterId,
        answer: i.question.answer,
      },
      orQuestion: i.orQuestion
        ? {
            id: i.orQuestion.id,
            text: i.orQuestion.text,
            type: i.orQuestion.type,
            chapterId: i.orQuestion.chapter?.id || i.orQuestion.chapterId,
            answer: i.orQuestion.answer,
          }
        : null,
    })),
  });

  if (dtoItems.length > 0 && !internalChoiceAudit.compliant) {
    for (const iss of internalChoiceAudit.issues) {
      implications.push({
        code: iss.code,
        severity: iss.severity,
        sectionId: iss.sectionId,
        sectionTitle: iss.sectionTitle,
        questionId: iss.questionId,
        message: iss.message,
      });
    }
  }

  return {
    ...rest,
    examType: resolvedExamType,
    blueprint: {
      ...blueprint,
      examType: resolvedExamType,
    },
    items: dtoItems,
    progress,
    implications,
    internalChoiceAudit,
  };
}

export type PaperView = NonNullable<Awaited<ReturnType<typeof loadPaperView>>>;
