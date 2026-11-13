import { allowedTypesFor, isTypeAllowed } from "@/lib/sectionTypes";
import { body, HttpError, route, type SessionUser } from "@/lib/api";
import { slotPlacement, subpartsMarksProblem, whyCannotAdd } from "@/lib/blueprint";
import {
  assertCanModifyPaper,
  assertCanModifyQuestion,
  assertValidOrChoice,
  itemChoiceRequirement,
  loadPaperView,
  toPlacedItems,
} from "@/lib/papers";
import { orChapterRefusal, orChapterRequired } from "@/lib/internalChoiceRules";
import { parseComponents } from "@/lib/languageComponents";
import { prisma } from "@/lib/prisma";
import { questionColumns, questionCopyData } from "@/lib/questionWrite";
import { editPaperItemSchema, moveItemSchema, replaceItemSchema } from "@/lib/schemas";
import type { z } from "zod";

async function editableItem(paperId: string, itemId: string, user: SessionUser) {
  const item = await prisma.paperQuestion.findUnique({
    where: { id: itemId },
    include: {
      paper: { select: { status: true, createdById: true, blueprint: { select: { book: { select: { className: true, subject: true } } } } } },
      question: { include: { chapter: true, book: { select: { className: true, subject: true } } } },
      section: true,
      orQuestion: { include: { chapter: true, book: { select: { className: true, subject: true } } } },
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

  if ("instruction" in raw) {
    const instruction = String(raw.instruction ?? "").trim().slice(0, 300);
    await prisma.paperQuestion.update({ where: { id: itemId }, data: { instruction } });
    await prisma.paper.update({ where: { id }, data: { updatedAt: new Date() } });
    return loadPaperView(id);
  }

  if ("componentKey" in raw) {
    const key = String(raw.componentKey ?? "").trim();
    const bp = await prisma.blueprint.findUnique({ where: { id: (await prisma.paper.findUnique({ where: { id }, select: { blueprintId: true } }))!.blueprintId }, select: { componentsJson: true } });
    const allowed = parseComponents(bp?.componentsJson).map((c) => c.key);
    if (key && !allowed.includes(key)) throw new HttpError(400, "That component is not part of this blueprint.");
    await prisma.paperQuestion.update({ where: { id: itemId }, data: { componentKey: key } });
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

    const choiceReq = itemChoiceRequirement(paper, item.sectionId, itemId);

    const itemsWithoutCurrent = toPlacedItems(
      paper.blueprint.sections,
      paper.items.filter((i) => i.id !== itemId),
    );

    const marksProblem = subpartsMarksProblem(item.section, candidate);
    if (marksProblem) throw new HttpError(400, `Board Guardrail Violation: Replacement question ${marksProblem}`);

    const reason = whyCannotAdd(
      {
        sections: paper.blueprint.sections,
        chapters: paper.blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks, unitKey: c.unitKey, unitTitle: c.unitTitle })),
      },
      itemsWithoutCurrent,
      {
        sectionId: item.sectionId,
        chapterId: candidate.chapterId,
        type: candidate.type,
        ...slotPlacement(item.section, candidate),
        passageGroupId: candidate.passageGroupId,
      },
    );
    if (reason) throw new HttpError(409, reason);

    // an OR sent along with the replacement is held to the same rules as any other OR
    if (orQuestionId && !choiceReq.forbidden) {
      await assertValidOrChoice(paper, { sectionId: item.sectionId, itemId }, candidate, orQuestionId);
    }

    const updateData: { questionId: string; orQuestionId?: string | null } = { questionId: candidate.id };
    if (choiceReq.forbidden) {
      updateData.orQuestionId = null;
    } else if (orQuestionId !== undefined) {
      updateData.orQuestionId = orQuestionId;
    } else if (item.orQuestionId && candidate.chapterId !== item.question.chapterId && orChapterRequiredFor(item)) {
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

    if (typeof orQuestionId !== "string" || !orQuestionId) throw new HttpError(400, "orQuestionId must be a question id or null");
    const paper = await loadPaperView(id);
    if (!paper) throw new HttpError(404, "Paper not found");
    const candidate = await assertValidOrChoice(paper, { sectionId: item.sectionId, itemId }, item.question, orQuestionId);

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

type EditableItem = Awaited<ReturnType<typeof editableItem>>;
type EditedQuestion = z.infer<typeof editPaperItemSchema>["question"];

/** From class 9 an OR must share the main question's chapter; up to class 8 that is only a guideline. */
function orChapterRequiredFor(item: EditableItem) {
  return orChapterRequired(item.paper.blueprint.book.className);
}

/**
 * Edits the slot's alternate (OR) question in place, under the same rules as linking one (PATCH orQuestionId):
 * same chapter as the main question (from class 9), a type the section accepts, subparts adding up to the slot's
 * marks, and not the main question itself. An OR does not use up chapter marks, so there is no quota check.
 */
async function editOrQuestion(item: EditableItem, mode: "UPDATE_MASTER" | "FORK_COPY", qInput: EditedQuestion, user: SessionUser, paperId: string) {
  const or = item.orQuestion;
  if (!item.orQuestionId || !or) throw new HttpError(400, "This slot has no alternate (OR) question to edit.");
  if (qInput.chapterId !== item.question.chapterId && orChapterRequiredFor(item)) {
    throw new HttpError(400, orChapterRefusal(item.question.chapter));
  }
  if (!isTypeAllowed(item.section, qInput.type)) {
    const allowed = allowedTypesFor(item.section);
    throw new HttpError(400, allowed.length === 1 ? `Alternate question must be of type ${allowed[0]}` : `Alternate question must be one of: ${allowed.join(", ")}`);
  }
  const marksProblem = subpartsMarksProblem(item.section, qInput);
  if (marksProblem) throw new HttpError(400, `Board Guardrail Violation: Alternate (OR) choice ${marksProblem.replace("total subpart marks", "total marks")}`);
  if (qInput.text.trim() === item.question.text.trim()) {
    throw new HttpError(400, "Alternate question cannot be identical to the primary question");
  }

  const data = questionColumns(qInput);

  if (mode === "UPDATE_MASTER") {
    assertCanModifyQuestion(user, or);
    const inFinalPapers = await prisma.paperQuestion.count({
      where: {
        OR: [{ questionId: or.id }, { orQuestionId: or.id }],
        paper: { status: "FINAL", id: { not: paperId } },
      },
    });
    if (inFinalPapers > 0) {
      throw new HttpError(409, "This question is part of another finalised paper. Choose 'Save as copy for this paper only' instead.");
    }
    await prisma.question.update({ where: { id: or.id }, data });
    return;
  }
  const forked = await prisma.question.create({ data: { ...questionCopyData(or), ...data, createdById: user.id } });
  await prisma.paperQuestion.update({ where: { id: item.id }, data: { orQuestionId: forked.id } });
}

/** Edit in place: either update master in bank, or fork a new copy for this paper only */
export const PUT = route(async (req, { id, itemId }, user) => {
  const item = await editableItem(id, itemId, user);
  const { mode, target, question: qInput } = await body(req, editPaperItemSchema);

  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");

  const chapter = await prisma.chapter.findUnique({ where: { id: qInput.chapterId } });
  if (!chapter || chapter.bookId !== paper.blueprint.bookId) {
    throw new HttpError(400, "Chapter does not belong to this paper's book");
  }

  if (target === "or") {
    await editOrQuestion(item, mode, qInput, user, id);
    await prisma.paper.update({ where: { id }, data: { updatedAt: new Date() } });
    return loadPaperView(id);
  }

  // The edited question must still fit its slot and its chapter's quota, counted exactly as when it was added.
  const itemsWithoutCurrent = toPlacedItems(
    paper.blueprint.sections,
    paper.items.filter((i) => i.id !== itemId),
  );

  const marksProblem = subpartsMarksProblem(item.section, qInput);
  if (marksProblem) throw new HttpError(400, `Board Guardrail Violation: Edited question ${marksProblem}`);

  const reason = whyCannotAdd(
    {
      sections: paper.blueprint.sections,
      chapters: paper.blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks, unitKey: c.unitKey, unitTitle: c.unitTitle })),
    },
    itemsWithoutCurrent,
    {
      sectionId: item.sectionId,
      chapterId: qInput.chapterId,
      type: qInput.type,
      ...slotPlacement(item.section, qInput),
      passageGroupId: qInput.passageGroupId,
    },
  );
  if (reason) throw new HttpError(409, reason);

  const data = questionColumns(qInput);

  if (mode === "UPDATE_MASTER") {
    // Assert user has permission to modify this question in the bank
    assertCanModifyQuestion(user, item.question);

    // If updating master in bank, verify it's not locked by a finalised paper
    const inFinalPapers = await prisma.paperQuestion.count({
      where: {
        OR: [{ questionId: item.questionId }, { orQuestionId: item.questionId }],
        paper: { status: "FINAL", id: { not: id } },
      },
    });
    if (inFinalPapers > 0) {
      throw new HttpError(
        409,
        "This question is part of another finalised paper. Choose 'Save as copy for this paper only' instead.",
      );
    }
    await prisma.question.update({ where: { id: item.questionId }, data });
    if (item.orQuestionId && item.orQuestion && item.orQuestion.chapterId !== qInput.chapterId && orChapterRequiredFor(item)) {
      await prisma.paperQuestion.update({
        where: { id: itemId },
        data: { orQuestionId: null },
      });
    }
  } else {
    // FORK_COPY: create a fresh question entry and re-point this paper's slot
    // the copy keeps what the form does not edit (figure, marking notes, provenance)
    const forked = await prisma.question.create({
      data: { ...questionCopyData(item.question), ...data, createdById: user.id },
    });
    const updateData: { questionId: string; orQuestionId?: null } = { questionId: forked.id };
    if (item.orQuestionId && item.orQuestion && item.orQuestion.chapterId !== qInput.chapterId && orChapterRequiredFor(item)) {
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
