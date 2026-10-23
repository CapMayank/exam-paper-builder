import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { whyCannotAdd } from "@/lib/blueprint";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { parseSubparts, subpartsTotalMarks } from "@/lib/types";

/**
 * Add multiple questions to a section in a single batch operation.
 * Validates blueprint rules for all questions sequentially.
 */
export const POST = route(async (req, params, user) => {
  const { id } = await params;
  const raw = await req.json().catch(() => ({}));
  const sectionId = typeof raw.sectionId === "string" ? raw.sectionId.trim() : "";
  const questionIds: string[] = Array.isArray(raw.questionIds)
    ? raw.questionIds.filter((qId: unknown): qId is string => typeof qId === "string" && Boolean(qId.trim()))
    : [];

  if (!sectionId) throw new HttpError(400, "Missing sectionId.");
  if (questionIds.length === 0) throw new HttpError(400, "Please select at least one question to add.");
  if (questionIds.length > 50) throw new HttpError(400, "Maximum 50 questions can be batch-added at once.");

  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");

  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") throw new HttpError(409, "This paper is finalised. Reopen it to make changes.");

  const section = paper.blueprint.sections.find((s) => s.id === sectionId);
  if (!section) throw new HttpError(404, "Section not found in blueprint.");

  // Deduplicate requested IDs
  const uniqueQuestionIds = Array.from(new Set(questionIds));

  // Check against questions already in the paper
  const existingPaperQuestionIds = new Set(
    paper.items.flatMap((i) => [i.question.id, i.orQuestion?.id].filter(Boolean) as string[])
  );

  for (const qId of uniqueQuestionIds) {
    if (existingPaperQuestionIds.has(qId)) {
      throw new HttpError(409, `Question ${qId} is already placed in this paper.`);
    }
  }

  // Fetch all candidate questions from DB
  const questions = await prisma.question.findMany({
    where: { id: { in: uniqueQuestionIds } },
  });

  if (questions.length !== uniqueQuestionIds.length) {
    throw new HttpError(404, "One or more selected questions could not be found.");
  }

  // Verify all belong to blueprint book
  for (const q of questions) {
    if (q.bookId !== paper.blueprint.bookId) {
      throw new HttpError(400, `Question "${q.text.slice(0, 40)}…" belongs to a different book.`);
    }
  }

  // Sequentially simulate blueprint budget additions
  const placedItems = paper.items.map((i) => {
    const subparts = parseSubparts(i.question.subpartsJson);
    const submarks = subpartsTotalMarks(subparts);
    return {
      sectionId: i.sectionId,
      chapterId: i.question.chapterId,
      marks: submarks > 0 ? submarks : undefined,
      subpartsCount: subparts.length > 1 ? subparts.length : undefined,
    };
  });

  const blueprintDef = {
    sections: paper.blueprint.sections,
    chapters: paper.blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks })),
  };

  for (const q of questions) {
    const candidateSubparts = parseSubparts(q.subpartsJson);
    const candidateSubmarks = subpartsTotalMarks(candidateSubparts);

    const candidate = {
      sectionId,
      chapterId: q.chapterId,
      type: q.type,
      marks: candidateSubmarks > 0 ? candidateSubmarks : undefined,
      subpartsCount: candidateSubparts.length > 1 ? candidateSubparts.length : undefined,
    };

    const reason = whyCannotAdd(blueprintDef, placedItems, candidate);
    if (reason) {
      throw new HttpError(
        409,
        `Cannot add "${q.text.slice(0, 35)}…": ${reason}`
      );
    }

    placedItems.push(candidate);
  }

  // Find last position in section
  const sectionItems = paper.items.filter((i) => i.sectionId === sectionId);
  let nextPos = sectionItems.length > 0 ? Math.max(...sectionItems.map((i) => i.position)) + 1 : 0;

  // Insert all in a single transaction
  await prisma.$transaction(async (tx) => {
    for (const q of questions) {
      await tx.paperQuestion.create({
        data: {
          paperId: id,
          sectionId,
          questionId: q.id,
          position: nextPos++,
        },
      });
    }
    await tx.paper.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  });

  await recordAudit(user, "PAPER_UPDATE", "PAPER", id, {
    action: "BATCH_ADD_QUESTIONS",
    sectionId,
    sectionTitle: section.title,
    count: questions.length,
  });

  const updatedPaper = await loadPaperView(id);

  return {
    success: true,
    addedCount: questions.length,
    message: `Added ${questions.length} question(s) to ${section.title}.`,
    paper: updatedPaper,
  };
});
