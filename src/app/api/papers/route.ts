import { body, route } from "@/lib/api";
import { keepActive, scopeFromRequest } from "@/lib/viewScope";
import { paperStatus } from "@/lib/blueprint";
import { resolvePaperExamType } from "@/lib/constants";
import { applySlotDeltas } from "@/lib/sectionPools";
import { withEffectiveAllowedTypes } from "@/lib/sectionTypes";
import { loadPaperView, toPlacedItems } from "@/lib/papers";
import { createPaperFromBlueprint } from "@/lib/paperCreate";
import { prisma } from "@/lib/prisma";
import { paperCreateSchema } from "@/lib/schemas";

export const GET = route(async (req) => {
  const scope = scopeFromRequest(req);
  const allPapers = await prisma.paper.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      slotMoves: true,
      blueprint: {
        select: {
          name: true,
          examType: true,
          curriculumMode: true,
          book: { select: { title: true, subject: true, className: true } },
          sections: { select: { id: true, title: true, type: true, count: true, marksEach: true, allowedTypesJson: true } },
          chapters: { select: { chapterId: true, marks: true, unitKey: true, unitTitle: true } },
        },
      },
      items: {
        select: {
          sectionId: true,
          pairMarks: true,
          question: {
            select: {
              chapterId: true,
              type: true,
              text: true,
              optionsJson: true,
              subpartsJson: true,
            },
          },
        },
      },
    },
  });
  const papers = keepActive(allPapers, (p) => p.blueprint.book, scope);
  return papers.map(({ blueprint, items, ...p }) => {
    const resolvedExamType = resolvePaperExamType({ ...p, blueprint });
    // the same flexible-marks view of each section as the builder, so the list and the builder never disagree
    const sections = applySlotDeltas(blueprint.sections.map((sec) => withEffectiveAllowedTypes(sec, blueprint.book)), p.slotMoves);
    const placedItems = toPlacedItems(sections, items);
    const status = paperStatus(
      {
        sections,
        chapters: blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks, unitKey: c.unitKey, unitTitle: c.unitTitle })),
      },
      placedItems,
    );

    const neededQuestions = status.sections.reduce((s, x) => s + x.needed, 0);
    // Effective filled questions clamped to section capacity so an overfilled section doesn't hide unplaced slots
    const filledQuestions = status.sections.reduce((s, x) => s + Math.min(x.needed, x.filled), 0);

    return {
      ...p,
      examType: resolvedExamType,
      blueprint: { name: blueprint.name, examType: resolvedExamType, curriculumMode: blueprint.curriculumMode, book: blueprint.book },
      filled: filledQuestions,
      needed: neededQuestions,
      totalMarks: status.totalMarks,
      placedMarks: status.usedMarks,
      isComplete: status.complete,
    };
  });
});

export const POST = route(async (req, _params, user) => {
  const input = await body(req, paperCreateSchema);
  const { id } = await createPaperFromBlueprint(input, user.id, user);
  return loadPaperView(id);
});
