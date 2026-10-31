import { body, HttpError, route, type SessionUser } from "@/lib/api";
import { whyCannotAdd } from "@/lib/blueprint";
import { parseMatchColumnPairs } from "@/lib/constants";
import { resolveInternalChoiceRequirement } from "@/lib/internalChoiceRules";
import { assertCanModifyPaper, assertCanModifyQuestion, loadPaperView, toPlacedItems } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { editPaperItemSchema, moveItemSchema, replaceItemSchema } from "@/lib/schemas";
import { parseSubparts, subpartsTotalMarks } from "@/lib/types";

async function editableItem(paperId: string, itemId: string, user: SessionUser) {
  const item = await prisma.paperQuestion.findUnique({
    where: { id: itemId },
    include: {
      paper: { select: { status: true, createdById: true } },
      question: { include: { chapter: true } },
      section: true,
      orQuestion: { include: { chapter: true } },
    },
  });
  if (!item || item.paperId !== paperId) throw new HttpError(404, "Item not found");
  assertCanModifyPaper(user, item.paper);
  if (item.paper.status === "FINAL") throw new HttpError(409, "This paper is finalised. Reopen it to make changes.");
  return item;
}

export const DELETE = route(async (_req, { id, itemId }, user) => {
  await editableItem(id, itemId, user);
  await prisma.paperQuestion.delete({ where: { id: itemId } });
  await prisma.paper.update({ where: { id }, data: { updatedAt: new Date() } });
  return loadPaperView(id);
});

/** Swap with neighbouring question, OR replace with another question from the bank */
export const PATCH = route(async (req, { id, itemId }, user) => {
  const item = await editableItem(id, itemId, user);
  const raw = await req.clone().json().catch(() => ({}));

  if ("pageBreakBefore" in raw) {
    const pageBreakBefore = Boolean(raw.pageBreakBefore);
    await prisma.paperQuestion.update({
      where: { id: itemId },
      data: { pageBreakBefore },
    });
    await prisma.paper.update({ where: { id }, data: { updatedAt: new Date() } });
    return loadPaperView(id);
  }

  if ("replaceWithQuestionId" in raw) {
    const { replaceWithQuestionId, orQuestionId } = replaceItemSchema.parse(raw);
    const paper = await loadPaperView(id);
    if (!paper) throw new HttpError(404, "Paper not found");

    const candidate = await prisma.question.findUnique({ where: { id: replaceWithQuestionId } });
    if (!candidate) throw new HttpError(404, "Replacement question not found");
    if (candidate.bookId !== paper.blueprint.bookId) throw new HttpError(400, "Replacement is from a different book");
    if (item.orQuestionId === candidate.id) {
      throw new HttpError(409, "Replacement question cannot be identical to the alternate (OR) choice of this slot");
    }
    if (paper.items.some((i) => (i.question.id === candidate.id || i.orQuestion?.id === candidate.id) && i.id !== itemId)) {
      throw new HttpError(409, "This question is already elsewhere in this paper (as primary or alternate question)");
    }

    const choiceReq = resolveInternalChoiceRequirement({
      schoolName: paper.schoolName,
      blueprintName: paper.blueprint.name,
      className: paper.blueprint.book.className,
      academicSession: paper.academicSession || paper.blueprint.academicSession,
      subject: paper.blueprint.book.subject,
      subjectCode: paper.subjectCode || paper.blueprint.subjectCode,
      questionType: item.section.type,
      marksEach: item.section.marksEach,
      sectionTitle: item.section.title,
      sectionInstructions: item.section.instructions,
    });

    const itemsWithoutCurrent = toPlacedItems(
      paper.blueprint.sections,
      paper.items.filter((i) => i.id !== itemId),
    );

    const candidateSubparts = parseSubparts(candidate.subpartsJson);
    const candidateSubmarks = subpartsTotalMarks(candidateSubparts);

    if (candidateSubparts.length > 0 && candidateSubmarks !== item.section.marksEach) {
      throw new HttpError(
        400,
        `Board Guardrail Violation: Replacement question total subpart marks (${candidateSubmarks}) must match section marks (${item.section.marksEach}).`
      );
    }

    const isTargetMatch = item.section.type === "MATCH_COLUMN";
    const isMultiUnitMatch = isTargetMatch && item.section.count > 1;
    let matchPairsCount = 0;
    if (isTargetMatch) {
      try {
        const parsed = JSON.parse(candidate.optionsJson || "[]");
        matchPairsCount = parseMatchColumnPairs(Array.isArray(parsed) ? parsed : [], candidate.text, (candidate as any).explanation).length;
      } catch {}
    }

    const candidateMarks = isTargetMatch
      ? (isMultiUnitMatch
          ? Math.min(matchPairsCount || item.section.count, item.section.count) * item.section.marksEach
          : item.section.marksEach)
      : (candidateSubmarks > 0 ? candidateSubmarks : item.section.marksEach);
    const candidateUnits = isMultiUnitMatch
      ? Math.min(matchPairsCount || item.section.count, item.section.count)
      : undefined;

    const reason = whyCannotAdd(
      {
        sections: paper.blueprint.sections,
        chapters: paper.blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks })),
      },
      itemsWithoutCurrent,
      {
        sectionId: item.sectionId,
        chapterId: candidate.chapterId,
        type: candidate.type,
        marks: candidateMarks,
        subpartsCount: candidateUnits,
      },
    );
    if (reason) throw new HttpError(409, reason);

    const updateData: { questionId: string; orQuestionId?: string | null } = { questionId: candidate.id };
    if (choiceReq.forbidden) {
      updateData.orQuestionId = null;
    } else if (orQuestionId !== undefined) {
      updateData.orQuestionId = orQuestionId;
    } else if (item.orQuestionId && candidate.chapterId !== item.question.chapterId) {
      updateData.orQuestionId = null;
    }
    await prisma.paperQuestion.update({ where: { id: itemId }, data: updateData });
    await prisma.paper.update({ where: { id }, data: { updatedAt: new Date() } });
    return loadPaperView(id);
  }

  if ("orQuestionId" in raw) {
    const { orQuestionId } = raw as { orQuestionId: string | null };
    if (orQuestionId === null) {
      await prisma.paperQuestion.update({ where: { id: itemId }, data: { orQuestionId: null } });
      await prisma.paper.update({ where: { id }, data: { updatedAt: new Date() } });
      return loadPaperView(id);
    }

    const paper = await loadPaperView(id);
    if (!paper) throw new HttpError(404, "Paper not found");

    const choiceReq = resolveInternalChoiceRequirement({
      schoolName: paper.schoolName,
      blueprintName: paper.blueprint.name,
      className: paper.blueprint.book.className,
      academicSession: paper.academicSession || paper.blueprint.academicSession,
      subject: paper.blueprint.book.subject,
      subjectCode: paper.subjectCode || paper.blueprint.subjectCode,
      questionType: item.section.type,
      marksEach: item.section.marksEach,
      sectionTitle: item.section.title,
      sectionInstructions: item.section.instructions,
    });

    if (choiceReq.forbidden) {
      throw new HttpError(
        400,
        `Board Guardrail Violation: Internal choices (OR / अथवा) are forbidden for this section (${choiceReq.rationale}).`
      );
    }

    const candidate = await prisma.question.findUnique({
      where: { id: orQuestionId },
      include: { chapter: true },
    });
    if (!candidate) throw new HttpError(404, "Alternate question not found");
    if (candidate.bookId !== paper.blueprint.bookId) throw new HttpError(400, "Alternate question is from a different book");
    if (candidate.id === item.questionId) throw new HttpError(400, "Alternate question cannot be identical to the primary question");
    if (candidate.type !== item.section.type) {
      throw new HttpError(400, `Alternate question must be of type ${item.section.type}`);
    }
    if (candidate.chapterId !== item.question.chapterId) {
      const primaryCh = item.question.chapter;
      throw new HttpError(
        400,
        `Board Guardrail Violation: Alternate (OR) choice must match primary question chapter (Chapter ${primaryCh.number}: ${primaryCh.title}).`
      );
    }
    if (candidate.subpartsJson && candidate.subpartsJson !== "[]") {
      const subparts = parseSubparts(candidate.subpartsJson);
      if (subparts.length > 0) {
        const total = subpartsTotalMarks(subparts);
        if (total !== item.section.marksEach) {
          throw new HttpError(
            400,
            `Board Guardrail Violation: Alternate (OR) choice total marks (${total}) must match section marks (${item.section.marksEach}).`
          );
        }
      }
    }
    if (paper.items.some((i) => (i.question.id === candidate.id && i.id !== itemId) || (i.orQuestion?.id === candidate.id && i.id !== itemId))) {
      throw new HttpError(409, "This question is already used in this paper");
    }

    await prisma.paperQuestion.update({ where: { id: itemId }, data: { orQuestionId: candidate.id } });
    await prisma.paper.update({ where: { id }, data: { updatedAt: new Date() } });
    return loadPaperView(id);
  }

  // Otherwise handle direction reorder
  const { direction } = moveItemSchema.parse(raw);
  const siblings = await prisma.paperQuestion.findMany({
    where: { paperId: id, sectionId: item.sectionId },
    orderBy: { position: "asc" },
  });
  const idx = siblings.findIndex((s) => s.id === itemId);
  const other = siblings[direction === "up" ? idx - 1 : idx + 1];
  if (other) {
    await prisma.$transaction([
      prisma.paperQuestion.update({ where: { id: item.id }, data: { position: other.position } }),
      prisma.paperQuestion.update({ where: { id: other.id }, data: { position: item.position } }),
    ]);
    await prisma.paper.update({ where: { id }, data: { updatedAt: new Date() } });
  }
  return loadPaperView(id);
});

/** Edit in place: either update master in bank, or fork a new copy for this paper only */
export const PUT = route(async (req, { id, itemId }, user) => {
  const item = await editableItem(id, itemId, user);
  const { mode, question: qInput } = await body(req, editPaperItemSchema);

  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");

  const chapter = await prisma.chapter.findUnique({ where: { id: qInput.chapterId } });
  if (!chapter || chapter.bookId !== paper.blueprint.bookId) {
    throw new HttpError(400, "Chapter does not belong to this paper's book");
  }

  // Validate that the updated/forked question still conforms to this section and chapter quota
  const itemsWithoutCurrent = paper.items
    .filter((i) => i.id !== itemId)
    .map((i) => {
      const sps = parseSubparts(i.question.subpartsJson);
      const sm = subpartsTotalMarks(sps);
      return {
        sectionId: i.sectionId,
        chapterId: i.question.chapterId,
        marks: sm > 0 ? sm : undefined,
        subpartsCount: sps.length > 1 ? sps.length : undefined,
      };
    });

  const candidateSubmarks = subpartsTotalMarks(qInput.subparts || []);

  if (qInput.subparts && qInput.subparts.length > 0 && candidateSubmarks !== item.section.marksEach) {
    throw new HttpError(
      400,
      `Board Guardrail Violation: Edited question total subpart marks (${candidateSubmarks}) must match section marks (${item.section.marksEach}).`
    );
  }

  const reason = whyCannotAdd(
    {
      sections: paper.blueprint.sections,
      chapters: paper.blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks })),
    },
    itemsWithoutCurrent,
    {
      sectionId: item.sectionId,
      chapterId: qInput.chapterId,
      type: qInput.type,
      marks: candidateSubmarks > 0 ? candidateSubmarks : undefined,
      subpartsCount: (qInput.subparts?.length || 0) > 1 ? qInput.subparts?.length : undefined,
    },
  );
  if (reason) throw new HttpError(409, reason);

  const { options, subparts, ...rest } = qInput;

  if (mode === "UPDATE_MASTER") {
    // Assert user has permission to modify this question in the bank
    assertCanModifyQuestion(user, item.question);

    // If updating master in bank, verify it's not locked by a finalised paper
    const inFinalPapers = await prisma.paperQuestion.count({
      where: { questionId: item.questionId, paper: { status: "FINAL", id: { not: id } } },
    });
    if (inFinalPapers > 0) {
      throw new HttpError(
        409,
        "This question is part of another finalised paper. Choose 'Save as copy for this paper only' instead.",
      );
    }
    await prisma.question.update({
      where: { id: item.questionId },
      data: {
        ...rest,
        optionsJson: JSON.stringify(options),
        subpartsJson: JSON.stringify(subparts ?? []),
      },
    });
    if (item.orQuestionId && item.orQuestion && item.orQuestion.chapterId !== qInput.chapterId) {
      await prisma.paperQuestion.update({
        where: { id: itemId },
        data: { orQuestionId: null },
      });
    }
  } else {
    // FORK_COPY: create a fresh question entry and re-point this paper's slot
    const forked = await prisma.question.create({
      data: {
        ...rest,
        optionsJson: JSON.stringify(options),
        subpartsJson: JSON.stringify(subparts ?? []),
        createdById: user.id,
      },
    });
    const updateData: { questionId: string; orQuestionId?: null } = { questionId: forked.id };
    if (item.orQuestionId && item.orQuestion && item.orQuestion.chapterId !== qInput.chapterId) {
      updateData.orQuestionId = null;
    }
    await prisma.paperQuestion.update({
      where: { id: itemId },
      data: updateData,
    });
  }

  await prisma.paper.update({ where: { id }, data: { updatedAt: new Date() } });
  return loadPaperView(id);
});
