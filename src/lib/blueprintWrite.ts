import "server-only";
// Writing a blueprint: create one, or change one and carry the change onto the papers built from it.
// Shared by the single-blueprint routes and the bulk setup, so both follow exactly the same rules.

import { recordAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/api";
import { type BlueprintInput } from "@/lib/blueprints";
import { finaliseBlocker, loadPaperView } from "@/lib/papers";
import { absorbingRows } from "@/lib/blueprintSetupPlan";
import { DEFAULT_ACADEMIC_SESSION } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/** Template / variant codes resolved to real row ids, so a code never trips a foreign key. */
async function curriculumRefs(input: Pick<BlueprintInput, "curriculumTemplateId" | "curriculumVariantId">) {
  let templateId: string | null = null;
  if (input.curriculumTemplateId) {
    const t = await prisma.curriculumBlueprintTemplate.findFirst({
      where: { OR: [{ id: input.curriculumTemplateId }, { templateCode: input.curriculumTemplateId }] },
      select: { id: true },
    });
    templateId = t?.id ?? null;
  }
  let variantId: string | null = null;
  if (input.curriculumVariantId) {
    const v = await prisma.curriculumSubjectVariant.findFirst({
      where: { OR: [{ id: input.curriculumVariantId }, { code: input.curriculumVariantId }] },
      select: { id: true },
    });
    variantId = v?.id ?? null;
  }
  return { templateId, variantId };
}

function sectionData(s: BlueprintInput["sections"][number], position: number) {
  return {
    title: s.title,
    instructions: s.instructions,
    type: s.type,
    count: s.count,
    marksEach: s.marksEach,
    orChoiceMode: s.orChoiceMode || "BOARD_DEFAULT",
    orAlternativeCount: s.orAlternativeCount ?? 1,
    orSlotsJson: s.orSlotsJson || "[]",
    allowedTypesJson: s.allowedTypesJson || "[]",
    slotPlanJson: s.slotPlanJson || "[]",
    role: s.role || "STANDARD",
    groupKey: s.groupKey || "",
    position,
  };
}

/** Creates a blueprint from an input that has already been validated and permission-checked. Returns its id. */
export async function createBlueprint(input: BlueprintInput): Promise<string> {
  const { templateId, variantId } = await curriculumRefs(input);
  const created = await prisma.blueprint.create({
    data: {
      name: input.name,
      bookId: input.bookId,
      academicSession: input.academicSession || DEFAULT_ACADEMIC_SESSION,
      examType: input.examType,
      durationMin: input.durationMin,
      subjectCode: input.subjectCode ?? "",
      language: input.language || "en",
      curriculumMode: input.curriculumMode || "BLANK_CUSTOM",
      curriculumTemplateId: templateId,
      curriculumVariantId: variantId,
      verificationStatus: input.verificationStatus ?? "UNVERIFIED",
      sourceRef: input.sourceRef ?? "",
      textbookVariant: input.textbookVariant ?? "",
      blueprintVersion: input.blueprintVersion ?? "",
      componentsJson: input.componentsJson ?? "[]",
      chapters: { create: input.chapters },
      sections: { create: input.sections.map((s, position) => sectionData(s, position)) },
    },
  });
  return created.id;
}

export type BlueprintUpdateResult = {
  papers: number;
  /** Finalised papers moved back to draft because the change left them out of step with the blueprint. */
  revertedToDraft: number;
  /** Placed questions taken out of papers because their section no longer exists (kept in a paper snapshot). */
  archivedQuestions: number;
};

/**
 * Changes a blueprint in place and carries the change onto its papers. Papers read sections, marks and time from
 * the blueprint, so they follow it at once; sections kept by id keep their questions. Questions in a removed
 * section are saved to a snapshot of their paper and taken out; a finalised paper the change puts out of step is
 * moved back to draft. The input must already be validated and permission-checked.
 */
export async function updateBlueprintWithPapers(id: string, input: BlueprintInput, user: SessionUser): Promise<BlueprintUpdateResult> {
  const existing = await prisma.blueprint.findUnique({
    where: { id },
    include: { sections: true, papers: { select: { id: true, title: true, status: true } } },
  });
  if (!existing) throw new Error(`Blueprint ${id} not found`);
  const { templateId, variantId } = await curriculumRefs(input);

  const existingSectionIds = new Set(existing.sections.map((s) => s.id));
  const keptIds = new Set(input.sections.map((s) => s.id).filter((sid): sid is string => Boolean(sid)));
  const removed = existing.sections.filter((s) => !keptIds.has(s.id));
  // a dropped row merged into a kept row of the same heading and marks hands its questions over
  const absorbed = absorbingRows(removed, input.sections);
  let archivedQuestions = 0;

  await prisma.$transaction(async (tx) => {
    for (const [from, to] of absorbed) {
      const last = await tx.paperQuestion.findMany({ where: { sectionId: to }, select: { paperId: true, position: true } });
      const next = new Map<string, number>();
      for (const it of last) next.set(it.paperId, Math.max(next.get(it.paperId) ?? -1, it.position));
      for (const it of await tx.paperQuestion.findMany({ where: { sectionId: from }, orderBy: { position: "asc" } })) {
        const pos = (next.get(it.paperId) ?? -1) + 1;
        next.set(it.paperId, pos);
        await tx.paperQuestion.update({ where: { id: it.id }, data: { sectionId: to, position: pos } });
      }
    }
    if (removed.length > 0) {
      const affected = await tx.paperQuestion.findMany({
        where: { sectionId: { in: removed.map((s) => s.id) } },
        include: { question: true, paper: { select: { id: true, title: true } } },
      });
      archivedQuestions = affected.length;
      const byPaper = new Map<string, typeof affected>();
      for (const it of affected) byPaper.set(it.paperId, [...(byPaper.get(it.paperId) ?? []), it]);
      for (const [paperId, items] of byPaper) {
        await tx.paperSnapshot.create({
          data: {
            paperId,
            name: `Auto-Archive: Blueprint Section Sync (${items.length} item(s))`,
            snapshotJson: JSON.stringify({ paperId, items, timestamp: new Date().toISOString() }),
            createdById: user.id,
          },
        });
      }
      await tx.paperQuestion.deleteMany({ where: { sectionId: { in: removed.map((s) => s.id) } } });
      await tx.blueprintSection.deleteMany({ where: { id: { in: removed.map((s) => s.id) } } });
    }

    for (const [position, s] of input.sections.entries()) {
      if (s.id && existingSectionIds.has(s.id)) {
        await tx.blueprintSection.update({ where: { id: s.id }, data: sectionData(s, position) });
      } else {
        await tx.blueprintSection.create({ data: { blueprintId: id, ...sectionData(s, position) } });
      }
    }

    await tx.blueprintChapter.deleteMany({ where: { blueprintId: id } });
    if (input.chapters.length > 0) {
      await tx.blueprintChapter.createMany({
        data: input.chapters.map((c) => ({ blueprintId: id, chapterId: c.chapterId, marks: c.marks, unitKey: c.unitKey ?? "", unitTitle: c.unitTitle ?? "" })),
      });
    }

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
        curriculumMode: input.curriculumMode || "BLANK_CUSTOM",
        curriculumTemplateId: templateId,
        curriculumVariantId: variantId,
        ...(input.verificationStatus ? { verificationStatus: input.verificationStatus } : {}),
        ...(input.sourceRef !== undefined ? { sourceRef: input.sourceRef } : {}),
        ...(input.textbookVariant !== undefined ? { textbookVariant: input.textbookVariant } : {}),
        ...(input.blueprintVersion !== undefined ? { blueprintVersion: input.blueprintVersion } : {}),
        ...(input.componentsJson !== undefined ? { componentsJson: input.componentsJson } : {}),
      },
    });
  });

  let revertedToDraft = 0;
  if (existing.papers.length > 0) {
    for (const p of existing.papers) {
      if (p.status !== "FINAL") continue;
      // judged exactly as finalising judges it: a paper that would still be allowed to finalise stays final
      const view = await loadPaperView(p.id);
      const blocker = view ? finaliseBlocker(view) : null;
      if (!blocker) continue;
      await prisma.paper.update({ where: { id: p.id }, data: { status: "DRAFT" } });
      revertedToDraft++;
      await recordAudit(user, "PAPER_STATUS_CHANGE", "PAPER", p.id, {
        title: p.title,
        from: "FINAL",
        to: "DRAFT",
        reason: `Reverted to DRAFT because blueprint '${input.name}' was modified. ${blocker}`,
      });
    }
    await recordAudit(user, "PAPER_UPDATE", "BLUEPRINT", id, {
      title: input.name,
      action: "BLUEPRINT_MODIFIED_WITH_PAPERS",
      papersAffected: existing.papers.length,
    });
  }

  return { papers: existing.papers.length, revertedToDraft, archivedQuestions };
}
