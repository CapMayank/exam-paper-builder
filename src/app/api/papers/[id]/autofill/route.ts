import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { autoFillPaper } from "@/lib/autofill";
import {
  buildAndValidateGenerationContract,
  generateCurriculumGroundedSectionQuestions,
} from "@/lib/curriculumContract";
import {
  isParaphraseOrDuplicateChoice,
  resolveInternalChoiceRequirement,
} from "@/lib/internalChoiceRules";
import { assertCanModifyPaper, loadPaperView, toPlacedItems } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { isQuestionContaminated } from "@/lib/questionValidator";
import { parseSubparts, subpartsTotalMarks } from "@/lib/types";

/**
 * 1-Click Smart Auto-Fill:
 * Automatically assembles remaining questions for a draft paper from the question bank,
 * strictly abiding by section question types, blueprint chapter weightage quotas,
 * and mandatory/forbidden internal choice (OR / अथवा) rules.
 */
export const POST = route(async (req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") throw new HttpError(409, "This paper is finalised. Reopen it to make changes.");

  const raw = await req.clone().json().catch(() => ({}));
  const targetSectionId = typeof raw.sectionId === "string" ? raw.sectionId : undefined;
  const preferredDifficulty = typeof raw.difficulty === "string" ? raw.difficulty : undefined;

  const internalChoiceSectionIds = new Set<string>();
  const forbiddenChoiceSectionIds = new Set<string>();
  for (const sec of paper.blueprint.sections) {
    const reqRule = resolveInternalChoiceRequirement({
      schoolName: paper.schoolName,
      blueprintName: paper.blueprint.name,
      className: paper.blueprint.book.className,
      academicSession: paper.academicSession || paper.blueprint.academicSession,
      subject: paper.blueprint.book.subject,
      subjectCode: paper.subjectCode || paper.blueprint.subjectCode,
      questionType: sec.type,
      marksEach: sec.marksEach,
      sectionTitle: sec.title,
      sectionInstructions: sec.instructions,
      orChoiceMode: (sec as any).orChoiceMode,
      orAlternativeCount: (sec as any).orAlternativeCount,
      orSlotsJson: (sec as any).orSlotsJson,
    });
    if (reqRule.required) internalChoiceSectionIds.add(sec.id);
    if (reqRule.forbidden) forbiddenChoiceSectionIds.add(sec.id);
  }

  // Determine whether existing items in the target scope have internal choice violations
  const itemsToRepairChoice = paper.items.filter((item) => {
    if (targetSectionId && item.sectionId !== targetSectionId) return false;
    const sec = paper.blueprint.sections.find((s) => s.id === item.sectionId);
    if (!sec) return false;
    const secItems = paper.items.filter((i) => i.sectionId === item.sectionId);
    const slotIndex = secItems.indexOf(item);
    const slotReq = resolveInternalChoiceRequirement({
      schoolName: paper.schoolName,
      blueprintName: paper.blueprint.name,
      className: paper.blueprint.book.className,
      academicSession: paper.academicSession || paper.blueprint.academicSession,
      subject: paper.blueprint.book.subject,
      subjectCode: paper.subjectCode || paper.blueprint.subjectCode,
      questionType: sec.type,
      marksEach: sec.marksEach,
      sectionTitle: sec.title,
      sectionInstructions: sec.instructions,
      slotIndex: slotIndex >= 0 ? slotIndex : undefined,
      orChoiceMode: (sec as any).orChoiceMode,
      orAlternativeCount: (sec as any).orAlternativeCount,
      orSlotsJson: (sec as any).orSlotsJson,
    });

    if (slotReq.forbidden && item.orQuestion) return true;
    if (slotReq.required) {
      if (!item.orQuestion || !item.orQuestion.text?.trim()) return true;
      if (isParaphraseOrDuplicateChoice(item.question.text, item.orQuestion.text).isDuplicateOrParaphrase) return true;
    }
    return false;
  });

  if (targetSectionId) {
    const sec = paper.blueprint.sections.find((s) => s.id === targetSectionId);
    const placed = paper.items.filter((i) => i.sectionId === targetSectionId).length;
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

  // Fetch all available questions for this book including subparts and text/options for subject integrity filtering
  const bankQuestions = await prisma.question.findMany({
    where: { bookId: paper.blueprint.bookId },
    select: {
      id: true,
      chapterId: true,
      type: true,
      difficulty: true,
      text: true,
      optionsJson: true,
      subpartsJson: true,
      answer: true,
      explanation: true,
    },
  });

  const validBankQuestions = bankQuestions.filter(
    (q) =>
      !isQuestionContaminated(
        {
          text: q.text,
          options: q.optionsJson,
          subparts: q.subpartsJson as any,
          answer: q.answer,
          explanation: q.explanation,
        },
        paper.blueprint.book.subject,
        paper.blueprint.book.className,
      ).contaminated,
  );
  const bankById = new Map(validBankQuestions.map((q) => [q.id, q]));

  const candidatePool = validBankQuestions.map((q) => {
    const sps = parseSubparts(q.subpartsJson);
    const subMarks = subpartsTotalMarks(sps);
    return {
      id: q.id,
      chapterId: q.chapterId,
      type: q.type,
      difficulty: q.difficulty,
      subpartsMarks: subMarks > 0 ? subMarks : undefined,
    };
  });

  const orQuestionIds = paper.items
    .map((i) => i.orQuestion?.id)
    .filter((qid): qid is string => Boolean(qid));

  const result = autoFillPaper(
    {
      sections: paper.blueprint.sections,
      chapters: paper.blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks })),
    },
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
        const slotReq = resolveInternalChoiceRequirement({
          schoolName: paper.schoolName,
          blueprintName: paper.blueprint.name,
          className: paper.blueprint.book.className,
          academicSession: paper.academicSession || paper.blueprint.academicSession,
          subject: paper.blueprint.book.subject,
          subjectCode: paper.subjectCode || paper.blueprint.subjectCode,
          questionType: sec.type,
          marksEach: sec.marksEach,
          sectionTitle: sec.title,
          sectionInstructions: sec.instructions,
          slotIndex,
          orChoiceMode: (sec as any).orChoiceMode,
          orAlternativeCount: (sec as any).orAlternativeCount,
          orSlotsJson: (sec as any).orSlotsJson,
        });
        return slotReq.required;
      },
    },
  );

  const unfilledSummary = result.unfilled.length > 0
    ? ` Unfilled: ${result.unfilled.map((u) => `${u.title} (${u.count} needed)`).join(", ")}.`
    : "";

  if (result.added.length === 0 && itemsToRepairChoice.length === 0) {
    return {
      success: false,
      addedCount: 0,
      unfilled: result.unfilled,
      complete: false,
      message: `No matching questions found in question bank for remaining blueprint quotas.${unfilledSummary}`,
      paper,
    };
  }

  // Track used IDs and texts for pairing/synthesizing distinct OR alternatives
  const usedIds = new Set<string>([
    ...paper.items.map((i) => i.question.id),
    ...orQuestionIds,
    ...result.added.map((a) => a.questionId),
    ...result.added.map((a) => a.orQuestionId).filter((id): id is string => Boolean(id)),
  ]);
  const usedTexts = new Set<string>(
    paper.items.flatMap((i) => [i.question.text, i.orQuestion?.text].filter((t): t is string => Boolean(t))),
  );
  for (const a of result.added) {
    const bq = bankById.get(a.questionId);
    if (bq?.text) usedTexts.add(bq.text);
    if (a.orQuestionId) {
      const oq = bankById.get(a.orQuestionId);
      if (oq?.text) usedTexts.add(oq.text);
    }
  }

  const chapterMap = new Map(paper.blueprint.chapters.map((c) => [c.chapterId, c.chapter]));
  const sectionMap = new Map(paper.blueprint.sections.map((s) => [s.id, s]));

  const pickOrSynthesizeOrQuestionId = async (
    tx: any,
    params: {
      sectionId: string;
      chapterId: string;
      primaryQuestionText: string;
    },
  ): Promise<string | null> => {
    const sec = sectionMap.get(params.sectionId);
    if (!sec) return null;

    // 1. Try finding an unused distinct bank question from the same chapter and type
    const bankMatch = validBankQuestions.find(
      (q) =>
        !usedIds.has(q.id) &&
        q.chapterId === params.chapterId &&
        q.type === sec.type &&
        !isParaphraseOrDuplicateChoice(params.primaryQuestionText, q.text),
    );
    if (bankMatch) {
      usedIds.add(bankMatch.id);
      usedTexts.add(bankMatch.text);
      return bankMatch.id;
    }

    // 2. Synthesize a curriculum-grounded distinct OR question for the same chapter
    const ch = chapterMap.get(params.chapterId) || paper.blueprint.chapters[0]?.chapter;
    const contractRes = buildAndValidateGenerationContract({
      schoolName: paper.schoolName,
      blueprintName: paper.blueprint.name,
      className: paper.blueprint.book.className,
      academicSession: paper.academicSession || paper.blueprint.academicSession,
      examType: paper.examType || paper.blueprint.examType,
      bookId: paper.blueprint.bookId,
      subject: paper.blueprint.book.subject,
      subjectCode: paper.subjectCode || paper.blueprint.subjectCode,
      sectionTitle: sec.title,
      sectionInstructions: sec.instructions,
      questionType: sec.type,
      marksEach: sec.marksEach,
      slots: [
        {
          slotIndex: 0,
          chapterId: params.chapterId,
          chapterNumber: ch?.number || 1,
          chapterTitle: ch?.title || "Syllabus Chapter",
          marks: sec.marksEach,
          requiresInternalChoice: true,
        },
      ],
    });

    if (!contractRes.valid || !contractRes.contract) return null;
    const grounded = generateCurriculumGroundedSectionQuestions(contractRes.contract, {
      generateDiagrams: false,
      existingQuestionTexts: [...Array.from(usedTexts), params.primaryQuestionText],
    })[0];
    const candidate =
      grounded?.orQuestion && !isParaphraseOrDuplicateChoice(params.primaryQuestionText, grounded.orQuestion.text)
        ? grounded.orQuestion
        : grounded;
    if (!candidate) return null;

    usedTexts.add(candidate.text);
    const createdOr = await tx.question.create({
      data: {
        bookId: paper.blueprint.bookId,
        chapterId: params.chapterId,
        type: candidate.type || sec.type,
        text: candidate.text,
        optionsJson: JSON.stringify(candidate.options || []),
        subpartsJson: JSON.stringify(candidate.subparts || []),
        answer: candidate.answer || "",
        difficulty: candidate.difficulty || "MEDIUM",
        cognitiveLevel: candidate.cognitiveLevel || "APPLYING",
        explanation: candidate.explanation || null,
        createdById: user.id,
      },
    });
    usedIds.add(createdOr.id);
    return createdOr.id;
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
      if (forbiddenChoiceSectionIds.has(existing.sectionId) && existing.orQuestion) {
        await tx.paperQuestion.update({
          where: { id: existing.id },
          data: { orQuestionId: null },
        });
        repairedChoicesCount++;
      } else if (internalChoiceSectionIds.has(existing.sectionId)) {
        const orQId = await pickOrSynthesizeOrQuestionId(tx, {
          sectionId: existing.sectionId,
          chapterId: existing.question.chapter?.id || (existing.question as any).chapterId,
          primaryQuestionText: existing.question.text,
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
      if (
        internalChoiceSectionIds.has(item.sectionId) &&
        (!orQuestionId ||
          (primaryBankQ &&
            bankById.get(orQuestionId) &&
            isParaphraseOrDuplicateChoice(primaryBankQ.text, bankById.get(orQuestionId)!.text)))
      ) {
        orQuestionId = await pickOrSynthesizeOrQuestionId(tx, {
          sectionId: item.sectionId,
          chapterId: item.chapterId,
          primaryQuestionText: primaryBankQ?.text || "",
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

  await recordAudit(user, "PAPER_UPDATE", "PAPER", id, {
    action: "PAPER_AUTOFILL",
    title: paper.title,
    addedCount: result.added.length,
    repairedChoicesCount,
    complete: result.complete,
  });

  const updatedPaper = await loadPaperView(id);

  const modeNote = result.exhaustedBudget || result.solverMode === "greedy"
    ? " (Greedy mode used — manual review of chapter distribution recommended)."
    : "";
  const repairNote =
    repairedChoicesCount > 0 ? ` Synchronized ${repairedChoicesCount} internal choice (OR / अथवा) slot(s).` : "";

  return {
    success: true,
    addedCount: result.added.length,
    repairedChoicesCount,
    unfilled: result.unfilled,
    complete: updatedPaper?.progress.complete ?? result.complete,
    solverMode: result.solverMode,
    message: updatedPaper?.progress.complete
      ? `Successfully auto-filled ${result.added.length} questions.${repairNote} Paper is now complete!${modeNote}`
      : `Auto-filled ${result.added.length} questions.${repairNote}${unfilledSummary}${modeNote}`,
    paper: updatedPaper,
  };
});
