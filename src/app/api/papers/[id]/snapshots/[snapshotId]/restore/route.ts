import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import type { PaperSnapshotPayload } from "@/lib/types";

export const POST = route(async (_req, params, user) => {
  const { id, snapshotId } = await params;
  const current = await loadPaperView(id);
  if (!current) throw new HttpError(404, "Paper not found");

  assertCanModifyPaper(user, current);
  if (current.status === "FINAL") {
    throw new HttpError(403, "Cannot restore snapshots into a finalized exam paper. Unlock paper to Draft first.");
  }

  const snapshot = await prisma.paperSnapshot.findFirst({
    where: { id: snapshotId, paperId: id },
  });
  if (!snapshot) throw new HttpError(404, "Snapshot not found");

  let rawParsed: any;
  try {
    rawParsed = JSON.parse(snapshot.snapshotJson);
  } catch {
    throw new HttpError(400, "Corrupted snapshot payload.");
  }

  // Support both standard PaperSnapshotPayload ({ items: [...] }) and legacy/auto-archive top-level arrays ([...])
  const payload = typeof rawParsed === "object" && rawParsed !== null && !Array.isArray(rawParsed) ? rawParsed : {};
  const itemsList: any[] = Array.isArray(rawParsed)
    ? rawParsed
    : Array.isArray(rawParsed?.items)
    ? rawParsed.items
    : [];

  // Verify that questions in snapshot still exist
  const questionIds = new Set<string>();
  itemsList.forEach((it) => {
    if (it.questionId) questionIds.add(it.questionId);
    if (it.orQuestionId) questionIds.add(it.orQuestionId);
  });

  const existingQuestions = await prisma.question.findMany({
    where: { id: { in: Array.from(questionIds) } },
    select: { id: true },
  });
  const existingSet = new Set(existingQuestions.map((q) => q.id));

  // Filter items whose main question still exists
  const validItems = itemsList.filter((it) => existingSet.has(it.questionId));

  if (itemsList.length > 0 && validItems.length === 0) {
    throw new HttpError(409, "None of the questions in this snapshot exist in the question bank anymore.");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Delete all current placements
    await tx.paperQuestion.deleteMany({
      where: { paperId: id },
    });

    // 2. Re-insert snapshot placements
    for (let i = 0; i < validItems.length; i++) {
      const it = validItems[i];
      await tx.paperQuestion.create({
        data: {
          paperId: id,
          sectionId: it.sectionId,
          questionId: it.questionId,
          orQuestionId: it.orQuestionId && existingSet.has(it.orQuestionId) ? it.orQuestionId : null,
          position: typeof it.position === "number" ? it.position : i,
        },
      });
    }

    // 3. Restore paper settings if present
    await tx.paper.update({
      where: { id },
      data: {
        ...(payload.generalInstructions !== undefined ? { generalInstructions: payload.generalInstructions } : {}),
        ...(payload.twoColumn !== undefined ? { twoColumn: payload.twoColumn } : {}),
        ...(payload.printDensity ? { printDensity: payload.printDensity } : {}),
        ...(payload.numberingStyle ? { numberingStyle: payload.numberingStyle } : {}),
        ...(payload.marksStyle ? { marksStyle: payload.marksStyle } : {}),
        ...(payload.showCandidateDetails !== undefined ? { showCandidateDetails: payload.showCandidateDetails } : {}),
        ...(payload.showSignatures !== undefined ? { showSignatures: payload.showSignatures } : {}),
      },
    });
  });

  await recordAudit(user, "PAPER_SNAPSHOT_RESTORE", "PAPER", id, {
    snapshotId,
    snapshotName: snapshot.name,
    restoredItemsCount: validItems.length,
    originalItemsCount: payload.items?.length || 0,
  });

  const updatedPaper = await loadPaperView(id);

  return {
    success: true,
    message: `Restored ${validItems.length} question placements from snapshot "${snapshot.name}".`,
    paper: updatedPaper,
  };
});
