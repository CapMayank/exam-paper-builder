import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertCanModifyPaper, loadPaperView, snapshotItems } from "@/lib/papers";
import { parseComponents } from "@/lib/languageComponents";
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

  // Filter items whose main question still exists and whose section is still in the blueprint
  const sectionIds = new Set(current.blueprint.sections.map((sec) => sec.id));
  const validItems = itemsList.filter((it) => existingSet.has(it.questionId) && sectionIds.has(it.sectionId));
  const skippedCount = itemsList.length - validItems.length;
  const componentKeys = new Set(parseComponents((current.blueprint as { componentsJson?: string }).componentsJson).map((c) => c.key));

  if (itemsList.length > 0 && validItems.length === 0) {
    const sectionGone = itemsList.every((it) => !sectionIds.has(it.sectionId));
    throw new HttpError(
      409,
      sectionGone
        ? "This snapshot's questions belonged to a section that is no longer in the blueprint, so they cannot be put back. They are still in the question bank."
        : "None of the questions in this snapshot exist in the question bank anymore.",
    );
  }

  await prisma.$transaction(async (tx) => {
    // 0. Keep the arrangement being replaced, so a mistaken restore can be undone from the snapshot list
    await tx.paperSnapshot.create({
      data: {
        paperId: id,
        name: `Before restoring "${snapshot.name}"`.slice(0, 120),
        snapshotJson: JSON.stringify({
          paperId: current.id,
          title: current.title,
          generalInstructions: current.generalInstructions ?? "",
          twoColumn: current.twoColumn,
          printDensity: current.printDensity,
          numberingStyle: current.numberingStyle,
          marksStyle: current.marksStyle,
          showCandidateDetails: current.showCandidateDetails,
          showSignatures: current.showSignatures,
          items: snapshotItems(current.items),
          timestamp: new Date().toISOString(),
        }),
        createdById: user.id,
      },
    });

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
          // per-question settings; older snapshots do not carry them
          pageBreakBefore: it.pageBreakBefore === true,
          instruction: typeof it.instruction === "string" ? it.instruction.slice(0, 300) : "",
          componentKey: typeof it.componentKey === "string" && componentKeys.has(it.componentKey) ? it.componentKey : "",
          pairMarks: it.pairMarks === 0.5 ? 0.5 : null,
        },
      });
    }

    // the slot moves the snapshot was taken with; an older snapshot predates them, so it restores to the blueprint counts
    await tx.paperSectionSlots.deleteMany({ where: { paperId: id } });
    for (const m of Array.isArray(payload.slotMoves) ? payload.slotMoves : []) {
      if (sectionIds.has(m.sectionId) && Number.isInteger(m.delta) && m.delta !== 0) {
        await tx.paperSectionSlots.create({ data: { paperId: id, sectionId: m.sectionId, delta: m.delta } });
      }
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
    message:
      `Restored ${validItems.length} question placements from snapshot "${snapshot.name}".` +
      (skippedCount > 0
        ? ` ${skippedCount} could not be restored because their question was deleted or their section no longer exists.`
        : "") +
      " Your previous arrangement was saved as a snapshot.",
    paper: updatedPaper,
  };
});
