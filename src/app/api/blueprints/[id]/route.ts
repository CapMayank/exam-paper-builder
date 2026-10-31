import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { diagnosePaperImplications } from "@/lib/blueprint";
import { assertBlueprintValid, loadBlueprint } from "@/lib/blueprints";
import { prisma } from "@/lib/prisma";
import { blueprintSchema } from "@/lib/schemas";

export const GET = route(async (_req, { id }) => {
  const bp = await loadBlueprint(id);
  if (!bp) throw new HttpError(404, "Blueprint not found");
  return bp;
});

export const PUT = route(async (req, { id }, user) => {
  const input = await body(req, blueprintSchema);
  input.chapters = input.chapters.filter((c) => c.marks > 0);
  const existing = await prisma.blueprint.findUnique({
    where: { id },
    include: {
      sections: true,
      chapters: true,
      papers: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      _count: { select: { papers: true } },
    },
  });
  if (!existing) throw new HttpError(404, "Blueprint not found");

  if (existing.papers.some((p) => p.status === "FINAL") && user.role !== "ADMIN") {
    throw new HttpError(
      403,
      "Cannot modify a blueprint linked to finalised exam papers. Only an Administrator can make changes.",
    );
  }

  await assertBlueprintValid(input);

  const existingSectionIds = new Set(existing.sections.map((s) => s.id));
  const inputSectionIds = new Set(input.sections.map((s) => s.id).filter((sid): sid is string => Boolean(sid)));
  const removedSections = existing.sections.filter((s) => !inputSectionIds.has(s.id));

  // Perform atomic section, chapter, and blueprint update
  await prisma.$transaction(async (tx) => {
    // 1. If sections were removed, archive affected questions to snapshots before cleanup
    if (removedSections.length > 0) {
      const affectedItems = await tx.paperQuestion.findMany({
        where: { sectionId: { in: removedSections.map((s) => s.id) } },
        include: { question: true, paper: { select: { id: true, title: true } } },
      });
      if (affectedItems.length > 0) {
        const paperMap = new Map<string, typeof affectedItems>();
        for (const it of affectedItems) {
          const list = paperMap.get(it.paperId) ?? [];
          list.push(it);
          paperMap.set(it.paperId, list);
        }
        for (const [pId, items] of paperMap) {
          await tx.paperSnapshot.create({
            data: {
              paperId: pId,
              name: `Auto-Archive: Blueprint Section Sync (${items.length} item(s))`,
              snapshotJson: JSON.stringify({
                paperId: pId,
                items,
                timestamp: new Date().toISOString(),
              }),
              createdById: user.id,
            },
          });
        }
      }

      await tx.paperQuestion.deleteMany({
        where: { sectionId: { in: removedSections.map((s) => s.id) } },
      });
      await tx.blueprintSection.deleteMany({
        where: { id: { in: removedSections.map((s) => s.id) } },
      });
    }

    // 2. Update existing sections in-place or create new ones
    for (const [position, s] of input.sections.entries()) {
      if (s.id && existingSectionIds.has(s.id)) {
        await tx.blueprintSection.update({
          where: { id: s.id },
          data: {
            title: s.title,
            instructions: s.instructions,
            type: s.type,
            count: s.count,
            marksEach: s.marksEach,
            orChoiceMode: s.orChoiceMode || "BOARD_DEFAULT",
            orAlternativeCount: s.orAlternativeCount ?? 1,
            orSlotsJson: s.orSlotsJson || "[]",
            position,
          },
        });
      } else {
        await tx.blueprintSection.create({
          data: {
            blueprintId: id,
            title: s.title,
            instructions: s.instructions,
            type: s.type,
            count: s.count,
            marksEach: s.marksEach,
            orChoiceMode: s.orChoiceMode || "BOARD_DEFAULT",
            orAlternativeCount: s.orAlternativeCount ?? 1,
            orSlotsJson: s.orSlotsJson || "[]",
            position,
          },
        });
      }
    }

    // 3. Update chapter mark allocations
    await tx.blueprintChapter.deleteMany({ where: { blueprintId: id } });
    if (input.chapters.length > 0) {
      await tx.blueprintChapter.createMany({
        data: input.chapters.map((c) => ({
          blueprintId: id,
          chapterId: c.chapterId,
          marks: c.marks,
        })),
      });
    }

    // 4. Update core blueprint metadata
    await tx.blueprint.update({
      where: { id },
      data: {
        name: input.name,
        bookId: input.bookId,
        academicSession: input.academicSession,
        examType: input.examType,
        durationMin: input.durationMin,
        subjectCode: input.subjectCode ?? "",
        language: input.language || "en",
      },
    });
  });

  // Re-fetch updated blueprint
  const updatedBp = await loadBlueprint(id);
  if (!updatedBp) throw new HttpError(404, "Blueprint not found after update");

  // Re-evaluate connected papers and revert FINAL to DRAFT if out of sync
  if (existing.papers.length > 0) {
    for (const p of existing.papers) {
      const currentItems = await prisma.paperQuestion.findMany({
        where: { paperId: p.id },
        include: { question: { select: { id: true, chapterId: true, type: true, text: true } } },
      });

      const implications = diagnosePaperImplications(
        {
          sections: updatedBp.sections,
          chapters: updatedBp.chapters.map((c) => ({
            chapterId: c.chapterId,
            title: c.chapter.title,
            marks: c.marks,
          })),
        },
        currentItems.map((i) => ({
          id: i.id,
          sectionId: i.sectionId,
          chapterId: i.question.chapterId,
          type: i.question.type,
          text: i.question.text,
        })),
      );

      // If the paper had status FINAL but now has implications or is incomplete, revert to DRAFT
      if (p.status === "FINAL" && implications.length > 0) {
        await prisma.paper.update({
          where: { id: p.id },
          data: { status: "DRAFT" },
        });
        await recordAudit(user, "PAPER_STATUS_CHANGE", "PAPER", p.id, {
          title: p.title,
          from: "FINAL",
          to: "DRAFT",
          reason: `Reverted to DRAFT because blueprint '${input.name}' was modified (${implications.length} reconciliation item(s)).`,
        });
      }
    }

    await recordAudit(user, "PAPER_UPDATE", "BLUEPRINT", id, {
      title: input.name,
      action: "BLUEPRINT_MODIFIED_WITH_PAPERS",
      papersAffected: existing.papers.length,
    });
  }

  return updatedBp;
  },
  { roles: ["ADMIN", "HOD"] },
);

export const DELETE = route(
  async (_req, { id }) => {
    const papers = await prisma.paper.count({ where: { blueprintId: id } });
    if (papers > 0) throw new HttpError(409, `${papers} paper(s) use this blueprint. Delete them first.`);
    await prisma.blueprint.delete({ where: { id } });
  },
  { roles: ["ADMIN", "HOD"] },
);
