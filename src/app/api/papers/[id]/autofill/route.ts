import { isTypeAllowed } from "@/lib/sectionTypes";
import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { autoFillPaper } from "@/lib/autofill";
import { slotPlacement, subpartsMarksProblem, whyCannotAdd, type PlacedItem } from "@/lib/blueprint";
import { suggestComponentsForPaper } from "@/lib/paperComponents";
import { isParaphraseOrDuplicateChoice, paperSectionChoiceRequirement } from "@/lib/internalChoiceRules";
import { assertCanModifyPaper, loadPaperView, toPlacedItems } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { isQuestionContaminated } from "@/lib/questionValidator";
import { parseMatchColumnPairs } from "@/lib/constants";
import { attemptedSubpartsMarks, parseSubpartsPayload } from "@/lib/types";
import { isVariantCopy } from "@/lib/questionWrite";

function safeJsonArray(json: string | null): string[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * 1-Click Smart Auto-Fill:
 * Automatically assembles remaining questions for a draft paper from the question bank,
 * strictly abiding by section question types and mandatory/forbidden internal choice (OR / अथवा) rules.
 * It only uses the paper's own book (its class and subject) and the chapters its blueprint covers. A slot the
 * bank cannot fill stays empty and the message says so: no generic template stands in for it, since their
 * stock content is written for other classes.
 */
export const POST = route(async (req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") throw new HttpError(409, "This paper is finalised. Reopen it to make changes.");

  const raw = await req.clone().json().catch(() => ({}));
  // the workbench's per-section button sends `targetSectionId`; `sectionId` is the older name
  const targetSectionId =
    typeof raw.sectionId === "string" ? raw.sectionId : typeof raw.targetSectionId === "string" ? raw.targetSectionId : undefined;
  const preferredDifficulty = typeof raw.difficulty === "string" ? raw.difficulty : undefined;

  const internalChoiceSectionIds = new Set<string>();
  for (const sec of paper.blueprint.sections) {
    const reqRule = paperSectionChoiceRequirement(paper, sec);
    if (reqRule.required) internalChoiceSectionIds.add(sec.id);
  }

  // Determine whether existing items in the target scope have internal choice violations
  /** What to do with each item whose internal choice breaks its slot's rule: drop a forbidden OR, or add a missing one. */
  const repairAction = new Map<string, "REMOVE" | "ADD">();
  const itemsToRepairChoice = paper.items.filter((item) => {
    if (targetSectionId && item.sectionId !== targetSectionId) return false;
    const sec = paper.blueprint.sections.find((s) => s.id === item.sectionId);
    if (!sec) return false;
    const secItems = paper.items.filter((i) => i.sectionId === item.sectionId);
    const slotIndex = secItems.indexOf(item);
    const slotReq = paperSectionChoiceRequirement(paper, sec, slotIndex >= 0 ? slotIndex : undefined);

    if (slotReq.forbidden && item.orQuestion) {
      repairAction.set(item.id, "REMOVE");
      return true;
    }
    if (slotReq.required) {
      if (
        !item.orQuestion ||
        !item.orQuestion.text?.trim() ||
        isParaphraseOrDuplicateChoice(item.question.text, item.orQuestion.text).isDuplicateOrParaphrase
      ) {
        repairAction.set(item.id, "ADD");
        return true;
      }
    }
    return false;
  });

  if (targetSectionId) {
    const sec = paper.blueprint.sections.find((s) => s.id === targetSectionId);
    // slots, not rows: a match question in a flexible section fills one per pair
    const placed = paper.progress.sections.find((s) => s.id === targetSectionId)?.filled ?? 0;
    if (sec && placed >= sec.count && itemsToRepairChoice.length === 0) {
      return {
        success: true,
        addedCount: 0,
        unfilled: [],
        complete: paper.progress.complete,
        message: `${sec.title} is already fully filled.`,
        paper,
      };
    }
  } else if (paper.progress.complete && itemsToRepairChoice.length === 0) {
    return {
      success: true,
      addedCount: 0,
      unfilled: [],
      complete: true,
      message: "Paper is already complete according to blueprint.",
      paper,
    };
  }

  // The paper's bank: its own book's questions (the book is the class and subject), from chapters of that book
  // the blueprint covers. Text/options are fetched for the subject integrity filter below.
  const bankQuestions = await prisma.question.findMany({
    where: {
      bookId: paper.blueprint.bookId,
      chapterId: { in: paper.blueprint.chapters.map((c) => c.chapterId) },
      chapter: { bookId: paper.blueprint.bookId },
    },
    select: {
      id: true,
      chapterId: true,
      type: true,
      difficulty: true,
      passageGroupId: true,
      text: true,
      optionsJson: true,
      subpartsJson: true,
      answer: true,
      explanation: true,
    },
  });

  const validBankQuestions = bankQuestions.filter(
    (q) =>
      // a shuffled or re-tagged copy belongs to the paper it was made for; its original is the bank question
      !isVariantCopy(q.subpartsJson) &&
      !isQuestionContaminated(
        {
          text: q.text,
          options: q.optionsJson,
          subparts: q.subpartsJson,
          answer: q.answer,
          explanation: q.explanation,
        },
        paper.blueprint.book.subject,
        paper.blueprint.book.className,
      ).contaminated,
  );
  const bankById = new Map(validBankQuestions.map((q) => [q.id, q]));

  const candidatePool = validBankQuestions.map((q) => {
    const payload = parseSubpartsPayload(q.subpartsJson);
    const subMarks = attemptedSubpartsMarks(payload.subparts, payload.attemptCount);
    return {
      id: q.id,
      chapterId: q.chapterId,
      type: q.type,
      difficulty: q.difficulty,
      subpartsMarks: subMarks > 0 ? subMarks : undefined,
      passageGroupId: q.passageGroupId,
      matchPairs:
        q.type === "MATCH_COLUMN"
          ? parseMatchColumnPairs(safeJsonArray(q.optionsJson), q.text, q.explanation).length
          : undefined,
    };
  });

  const orQuestionIds = paper.items
    .map((i) => i.orQuestion?.id)
    .filter((qid): qid is string => Boolean(qid));

  const blueprintDef = {
    sections: paper.blueprint.sections,
    chapters: paper.blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks, unitKey: c.unitKey, unitTitle: c.unitTitle })),
  };

  const result = autoFillPaper(
    blueprintDef,
    toPlacedItems(paper.blueprint.sections, paper.items),
    candidatePool,
    orQuestionIds,
    {
      targetSectionId,
      preferredDifficulty,
      internalChoiceSectionIds,
      isSlotChoiceRequired: (sectionId, slotIndex, defaultRequired) => {
        const sec = paper.blueprint.sections.find((s) => s.id === sectionId);
        if (!sec) return defaultRequired;
        const slotReq = paperSectionChoiceRequirement(paper, sec, slotIndex);
        return slotReq.required;
      },
    },
  );


  const sectionMap = new Map(paper.blueprint.sections.map((s) => [s.id, s]));
  const scopeLabel = `${paper.blueprint.book.className} ${paper.blueprint.book.subject}`;
  const unfilledSummary = result.unfilled.length > 0
    ? ` Still empty: ${result.unfilled.map((u) => `${u.title} (${u.count} needed)`).join(", ")}. The ${scopeLabel} question bank has no more questions that fit these slots: add some to the bank, or write them for the paper.`
    : "";

  // What the paper will hold once this auto-fill is saved: its items and the bank picks. OR alternatives are
  // checked against it.
  const plannedItems: PlacedItem[] = [
    ...toPlacedItems(paper.blueprint.sections, paper.items),
    ...result.added.map((a) => {
      const sec = sectionMap.get(a.sectionId);
      const bq = bankById.get(a.questionId);
      return { sectionId: a.sectionId, chapterId: a.chapterId, questionId: a.questionId, ...(sec && bq ? slotPlacement(sec, bq) : {}) };
    }),
  ];

  /**
   * Why `q` cannot take a slot in `sectionId`; null when it can. The same two checks a teacher's add goes
   * through (POST /api/papers/[id]/questions): its parts' marks, then the blueprint slot. An OR alternative is
   * checked as if it took its primary's slot, so `exceptQuestionId` leaves that primary out of the count.
   */
  const placementProblem = (
    sectionId: string,
    chapterId: string,
    q: Parameters<typeof slotPlacement>[1] & { passageGroupId?: string | null },
    exceptQuestionId?: string,
  ): string | null => {
    const sec = sectionMap.get(sectionId);
    if (!sec) return "That section is not part of this paper's blueprint.";
    const marksProblem = subpartsMarksProblem(sec, q);
    if (marksProblem) return marksProblem;
    const at = exceptQuestionId ? plannedItems.findIndex((p) => p.questionId === exceptQuestionId) : -1;
    const against = at >= 0 ? plannedItems.filter((_, i) => i !== at) : plannedItems;
    return whyCannotAdd(blueprintDef, against, {
      sectionId,
      chapterId,
      type: q.type,
      ...slotPlacement(sec, q),
      passageGroupId: q.passageGroupId,
    });
  };

  // Bank OR alternatives left out because they failed those checks
  const skippedBankOrIds = new Set<string>();
  // Slots that need an OR alternative but the bank had none to give
  let missingOrCount = 0;

  // Track used IDs for pairing distinct OR alternatives
  const usedIds = new Set<string>([
    ...paper.items.map((i) => i.question.id),
    ...orQuestionIds,
    ...result.added.map((a) => a.questionId),
    ...result.added.map((a) => a.orQuestionId).filter((qid): qid is string => Boolean(qid)),
  ]);

  if (result.added.length === 0 && itemsToRepairChoice.length === 0) {
    return {
      success: false,
      addedCount: 0,
      unfilled: result.unfilled,
      complete: false,
      message: `No matching questions found in the ${scopeLabel} question bank for the remaining slots.${unfilledSummary}`,
      paper,
    };
  }

  /** An unused bank question from the same chapter that can stand as `params`' OR alternative; null when there is none. */
  const pickBankOrQuestionId = (params: {
    sectionId: string;
    chapterId: string;
    primaryQuestionText: string;
    /** The primary question this OR is for; the OR is checked as if it took that question's slot. */
    primaryQuestionId?: string;
  }): string | null => {
    const sec = sectionMap.get(params.sectionId);
    if (!sec) return null;
    const bankMatch = validBankQuestions.find((q) => {
      if (
        usedIds.has(q.id) ||
        q.chapterId !== params.chapterId ||
        !isTypeAllowed(sec, q.type) ||
        isParaphraseOrDuplicateChoice(params.primaryQuestionText, q.text).isDuplicateOrParaphrase
      ) {
        return false;
      }
      if (placementProblem(params.sectionId, q.chapterId, q, params.primaryQuestionId)) {
        skippedBankOrIds.add(q.id);
        return false;
      }
      return true;
    });
    if (!bankMatch) {
      missingOrCount++;
      return null;
    }
    usedIds.add(bankMatch.id);
    return bankMatch.id;
  };

  // Find max position per section among existing items
  const maxPosBySection = new Map<string, number>();
  for (const item of paper.items) {
    const cur = maxPosBySection.get(item.sectionId) ?? -1;
    if (item.position > cur) maxPosBySection.set(item.sectionId, item.position);
  }

  let repairedChoicesCount = 0;

  // Save new questions and repair internal choice violations in a transaction
  await prisma.$transaction(async (tx) => {
    // 1. Repair existing items with missing required OR or forbidden OR
    for (const existing of itemsToRepairChoice) {
      if (repairAction.get(existing.id) === "REMOVE") {
        await tx.paperQuestion.update({
          where: { id: existing.id },
          data: { orQuestionId: null },
        });
        repairedChoicesCount++;
      } else {
        const orQId = pickBankOrQuestionId({
          sectionId: existing.sectionId,
          chapterId: existing.question.chapter?.id || existing.question.chapterId,
          primaryQuestionText: existing.question.text,
          primaryQuestionId: existing.question.id,
        });
        if (orQId) {
          await tx.paperQuestion.update({
            where: { id: existing.id },
            data: { orQuestionId: orQId },
          });
          repairedChoicesCount++;
        }
      }
    }

    // 2. Add newly auto-filled slots
    for (const item of result.added) {
      const nextPos = (maxPosBySection.get(item.sectionId) ?? -1) + 1;
      maxPosBySection.set(item.sectionId, nextPos);

      let orQuestionId = item.orQuestionId || null;
      const primaryBankQ = bankById.get(item.questionId);
      // the solver's own OR pick is held to the same placement checks; one that fails is replaced below
      const solverOr = orQuestionId ? bankById.get(orQuestionId) : undefined;
      if (solverOr && placementProblem(item.sectionId, item.chapterId, solverOr, item.questionId)) {
        skippedBankOrIds.add(solverOr.id);
        orQuestionId = null;
      }
      if (
        // the solver already decided, slot by slot, whether this one needs an OR
        (item.requiresInternalChoice ?? internalChoiceSectionIds.has(item.sectionId)) &&
        (!orQuestionId ||
          (primaryBankQ &&
            bankById.get(orQuestionId) &&
            isParaphraseOrDuplicateChoice(primaryBankQ.text, bankById.get(orQuestionId)!.text).isDuplicateOrParaphrase))
      ) {
        orQuestionId = pickBankOrQuestionId({
          sectionId: item.sectionId,
          chapterId: item.chapterId,
          primaryQuestionText: primaryBankQ?.text || "",
          primaryQuestionId: item.questionId,
        });
      }

      await tx.paperQuestion.create({
        data: {
          paperId: id,
          sectionId: item.sectionId,
          questionId: item.questionId,
          orQuestionId,
          position: nextPos,
        },
      });
    }

    await tx.paper.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  });

  const totalAdded = result.added.length;
  const finalUnfilled = result.unfilled;

  await recordAudit(user, "PAPER_UPDATE", "PAPER", id, {
    action: "PAPER_AUTOFILL",
    title: paper.title,
    addedCount: totalAdded,
    repairedChoicesCount,
    complete: finalUnfilled.length === 0,
  });

  // language papers: label the new questions with a suggested syllabus component
  await suggestComponentsForPaper(id);

  const updatedPaper = await loadPaperView(id);

  const modeNote = result.exhaustedBudget || result.solverMode === "greedy"
    ? " (Greedy mode used — manual review of chapter distribution recommended)."
    : "";
  const repairNote =
    repairedChoicesCount > 0 ? ` Synchronized ${repairedChoicesCount} internal choice (OR / अथवा) slot(s).` : "";
  const skippedNote =
    skippedBankOrIds.size > 0
      ? ` Left out ${skippedBankOrIds.size} bank OR alternative${skippedBankOrIds.size > 1 ? "s" : ""} that did not fit ${skippedBankOrIds.size > 1 ? "their" : "its"} slot's type or marks.`
      : "";
  const missingOrNote =
    missingOrCount > 0
      ? ` ${missingOrCount} question${missingOrCount > 1 ? "s need" : " needs"} an OR (अथवा) alternative, but the ${scopeLabel} bank has no other question from the same chapter that fits: add ${missingOrCount > 1 ? "them" : "it"} yourself.`
      : "";
  const complete = updatedPaper?.progress.complete ?? (finalUnfilled.length === 0);

  return {
    success: true,
    addedCount: totalAdded,
    repairedChoicesCount,
    unfilled: finalUnfilled,
    complete,
    solverMode: result.solverMode,
    message: complete
      ? `Successfully auto-filled ${totalAdded} questions from the ${scopeLabel} question bank.${repairNote} Paper is now complete!${missingOrNote}${skippedNote}${modeNote}`
      : `Auto-filled ${totalAdded} questions from the ${scopeLabel} question bank.${repairNote}${missingOrNote}${skippedNote}${unfilledSummary}${modeNote}`,
    paper: updatedPaper,
  };
});
