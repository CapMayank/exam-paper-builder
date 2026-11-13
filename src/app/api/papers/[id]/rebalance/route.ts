import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { rebalanceProblem } from "@/lib/sectionPools";

const schema = z.object({ fromSectionId: z.string().min(1), toSectionId: z.string().min(1), slots: z.number().int().min(1).max(100) });

/** Flexible marks: move free slots between two same-mark sections of this paper (class 8 and below). */
export const POST = route(async (req, { id }, user) => {
  const input = await body(req, schema);
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") throw new HttpError(409, "This paper is finalised. Reopen it to make changes.");

  const filled = Object.fromEntries(paper.progress.sections.map((s) => [s.id, s.filled]));
  const problem = rebalanceProblem(paper.blueprint.sections, filled, input.fromSectionId, input.toSectionId, input.slots);
  if (problem) throw new HttpError(400, problem);

  // read and write inside one transaction, so two moves at once both count
  await prisma.$transaction(async (tx) => {
    const existing = await tx.paperSectionSlots.findMany({ where: { paperId: id } });
    const current = (sectionId: string) => existing.find((d) => d.sectionId === sectionId)?.delta ?? 0;
    const next: Array<[string, number]> = [
      [input.fromSectionId, current(input.fromSectionId) - input.slots],
      [input.toSectionId, current(input.toSectionId) + input.slots],
    ];
    for (const [sectionId, delta] of next) {
      if (delta === 0) await tx.paperSectionSlots.deleteMany({ where: { paperId: id, sectionId } });
      else {
        await tx.paperSectionSlots.upsert({
          where: { paperId_sectionId: { paperId: id, sectionId } },
          create: { paperId: id, sectionId, delta },
          update: { delta },
        });
      }
    }
    await tx.paper.update({ where: { id }, data: { updatedAt: new Date() } });
  });
  await recordAudit(user, "PAPER_UPDATE", "PAPER", id, { action: "PAPER_SLOTS_MOVED", ...input });
  return loadPaperView(id);
});
