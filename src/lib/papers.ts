import "server-only";
import { HttpError, type SessionUser } from "./api";
import { resolvePaperExamType } from "./constants";
import { toQuestionDto } from "./dto";
import { parseMatchColumnPairs } from "./constants";
import { applySlotDeltas } from "./sectionPools";
import { diagnosePaperImplications, paperStatus, questionSlotMarks, slotPlacement, spansSlots, subpartsMarksProblem, toPlacedItems } from "./blueprint";
import { isTypeAllowed, orTypeRefusal, withEffectiveAllowedTypes } from "./sectionTypes";
import { componentImplications, parseComponents } from "./languageComponents";
import { blueprintInclude } from "./blueprints";
import {
  evaluatePaperInternalChoiceCompliance,
  orChapterRefusal,
  orChapterRequired,
  paperSectionChoiceRequirement,
} from "./internalChoiceRules";
import {
  bookScope,
  canManageScope,
  canModifyPaper,
  canModifyQuestion,
  isAdmin,
  type PaperRef,
  type QuestionRef,
} from "./permissions";
import { prisma } from "./prisma";
import { marksMismatchMessage } from "./preflightChecks";

export { toPlacedItems };

export { canModifyPaper, canModifyQuestion };

export function assertCanModifyPaper(user: SessionUser, paper: PaperRef): void {
  if (paper.status === "FINAL" && !isAdmin(user)) {
    throw new HttpError(
      403,
      "Cannot modify or delete a finalized paper. Only an Administrator can unlock it.",
    );
  }
  if (!canModifyPaper(user, paper)) {
    throw new HttpError(
      403,
      "Only the paper's creator, a teacher assigned to this class and subject, or an Administrator can modify this paper.",
    );
  }
}

export function assertCanModifyQuestion(user: SessionUser, question: QuestionRef): void {
  if (!canModifyQuestion(user, question)) {
    throw new HttpError(
      403,
      "Forbidden: you can edit your own questions, or questions of the classes and subjects assigned to you.",
    );
  }
}

/** Throws 403 unless the user may add or change content (books, blueprints, questions, papers) for this class/subject. */
export function assertCanManageScope(user: SessionUser, book: { className: string; subject: string } | null | undefined): void {
  if (!canManageScope(user, bookScope(book))) {
    const where = book ? `${book.className} · ${book.subject}` : "this class";
    throw new HttpError(403, `You are not assigned to ${where}. Ask an Administrator to assign you to this class or subject.`);
  }
}

/** Making a copy (duplicate, new set) needs rights on the paper's class/subject, or being its creator. */
export function assertCanCopyPaper(user: SessionUser, paper: PaperRef): void {
  if (paper.createdById === user.id) return;
  assertCanManageScope(user, paper.blueprint?.book);
}

/** Loads a book and checks the user may manage its class/subject. */
export async function assertCanManageBook(user: SessionUser, bookId: string) {
  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true, title: true, className: true, subject: true } });
  if (!book) throw new HttpError(404, "Book not found");
  assertCanManageScope(user, book);
  return book;
}

/** Loads the paper's class/subject and checks edit rights. For routes that have only the id at hand. */
export async function assertCanModifyPaperById(user: SessionUser, paperId: string) {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { id: true, createdById: true, status: true, blueprint: { select: { book: { select: { className: true, subject: true } } } } },
  });
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  return paper;
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
  slotMoves: true,
  items: {
    orderBy: { position: "asc" },
    include: {
      question: { include: questionUsageInclude },
      orQuestion: { include: questionUsageInclude },
    },
  },
} as const;


/** The pair value to count and print: half a mark only while it still fits (flexible section, even pair count). */
function effectivePairMarks(
  section: Parameters<typeof spansSlots>[0] | undefined,
  item: { pairMarks: number | null; question: { type: string; optionsJson: string; text: string; explanation?: string | null } },
): number | null {
  if (item.pairMarks !== 0.5 || !section || item.question.type !== "MATCH_COLUMN" || !spansSlots(section)) return null;
  let opts: string[] = [];
  try {
    const parsed = JSON.parse(item.question.optionsJson || "[]");
    opts = Array.isArray(parsed) ? parsed : [];
  } catch {}
  return parseMatchColumnPairs(opts, item.question.text, item.question.explanation).length % 2 === 0 ? 0.5 : null;
}

/** Everything the builder and print views need, with progress computed server-side. */
export async function loadPaperView(id: string) {
  const paper = await prisma.paper.findUnique({ where: { id }, include: paperInclude });
  if (!paper) return null;
  const { blueprint: stored, items, ...rest } = paper;
  // every check that reads the view (picker, add, edit, autofill, AI, mismatch flags) sees each section's effective
  // allowed types; the blueprint row itself is never changed
  // slots this paper moved between same-mark sections (flexible marks): the section counts every consumer reads
  const blueprint = {
    ...stored,
    sections: applySlotDeltas(
      stored.sections.map((s) => withEffectiveAllowedTypes(s, stored.book)),
      paper.slotMoves,
    ),
  };
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
      const { marks, subpartsCount } = slotPlacement(sec, { ...i.question, pairMarks: i.pairMarks } as never);
      return {
        id: i.id,
        sectionId: i.sectionId,
        chapterId: i.question.chapterId,
        type: i.question.type,
        text: i.question.text,
        marks,
        subpartsCount,
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
    instruction: i.instruction || "",
    // the slot's pair value rides on the question so every reader of the view counts marks the same way
    question: { ...toQuestionDto(i.question), pairMarks: effectivePairMarks(blueprint.sections.find((x) => x.id === i.sectionId), i) },
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

/** A paper's placed questions as a snapshot stores them: the slot, the questions, and the per-question settings. */
export function snapshotItems(items: PaperView["items"]) {
  return items.map((it) => ({
    sectionId: it.sectionId,
    position: it.position,
    questionId: it.question.id,
    orQuestionId: it.orQuestion?.id || null,
    pageBreakBefore: it.pageBreakBefore,
    componentKey: it.componentKey,
    instruction: it.instruction,
    pairMarks: it.question.pairMarks ?? null,
  }));
}

/**
 * Why a paper cannot be (or stay) finalised; null when it matches its blueprint and the internal-choice rules.
 * Finalising and the check after a blueprint edit both ask here, so they can never disagree.
 */
export function finaliseBlocker(view: Pick<PaperView, "progress" | "internalChoiceAudit" | "implications">): string | null {
  if (!view.progress.complete) return "The paper doesn't match its blueprint yet, so it can't be finalised.";
  const marks = marksMismatchMessage(view.progress);
  if (marks) return `${marks} It can't be finalised until they match.`;
  if (view.implications.some((i) => i.code === "TYPE_MISMATCH" || i.code === "ORPHANED_SECTION" || i.code === "SECTION_OVERFILLED")) {
    return "The paper has questions that no longer fit its blueprint, so it can't be finalised.";
  }
  if (view.internalChoiceAudit && !view.internalChoiceAudit.compliant) {
    return "The paper does not comply with official internal choice rules. Please fix missing or forbidden choices before finalising.";
  }
  return null;
}

/** The internal-choice rule for the slot a placed question occupies (its place in the section's order). */
export function itemChoiceRequirement(paper: PaperView, sectionId: string, itemId?: string | null) {
  const section = paper.blueprint.sections.find((s) => s.id === sectionId);
  if (!section) throw new HttpError(404, "Section not found");
  const inSection = paper.items.filter((i) => i.sectionId === sectionId);
  const at = itemId ? inSection.findIndex((i) => i.id === itemId) : -1;
  // a question about to be added takes the next free slot
  return paperSectionChoiceRequirement(paper, section, at >= 0 ? at : inSection.length);
}

/**
 * Checks a question may be the internal-choice alternative (OR / अथवा) of `primary` in this slot and returns it.
 * One rule for every path that links an OR: add, replace, "Change OR" and edit.
 */
export async function assertValidOrChoice(
  paper: PaperView,
  slot: { sectionId: string; itemId?: string | null },
  primary: { id: string; chapterId: string },
  orQuestionId: string,
) {
  const section = paper.blueprint.sections.find((s) => s.id === slot.sectionId);
  if (!section) throw new HttpError(404, "Section not found");
  const choiceReq = itemChoiceRequirement(paper, slot.sectionId, slot.itemId);
  if (choiceReq.forbidden) {
    throw new HttpError(
      400,
      `Internal choices (OR / अथवा) are forbidden for this section (${choiceReq.rationale}).`,
    );
  }
  const candidate = await prisma.question.findUnique({ where: { id: orQuestionId }, include: { chapter: true } });
  if (!candidate) throw new HttpError(404, "Alternate question not found");
  if (candidate.bookId !== paper.blueprint.bookId) throw new HttpError(400, "Alternate question is from a different book");
  if (candidate.id === primary.id) throw new HttpError(400, "Alternate question cannot be identical to the primary question");
  if (!isTypeAllowed(section, candidate.type)) {
    throw new HttpError(400, orTypeRefusal(section));
  }
  // up to class 8 the same chapter is only a guideline; from class 9 it is required
  if (candidate.chapterId !== primary.chapterId && orChapterRequired(paper.blueprint.book.className)) {
    throw new HttpError(400, orChapterRefusal(paper.blueprint.chapters.find((c) => c.chapterId === primary.chapterId)?.chapter));
  }
  const marksProblem = subpartsMarksProblem(section, candidate);
  if (marksProblem) throw new HttpError(400, `Alternate (OR) choice ${marksProblem.replace("total subpart marks", "total marks")}`);
  if (paper.items.some((i) => i.id !== slot.itemId && (i.question.id === candidate.id || i.orQuestion?.id === candidate.id))) {
    throw new HttpError(409, "This question is already used in this paper");
  }
  return candidate;
}
