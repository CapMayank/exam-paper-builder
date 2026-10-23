import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { paperStatus } from "@/lib/blueprint";
import { resolvePaperExamType } from "@/lib/constants";
import { loadPaperView, toPlacedItems } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { paperCreateSchema } from "@/lib/schemas";

export const GET = route(async () => {
  const papers = await prisma.paper.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      blueprint: {
        select: {
          name: true,
          examType: true,
          book: { select: { title: true, subject: true, className: true } },
          sections: { select: { id: true, title: true, type: true, count: true, marksEach: true } },
          chapters: { select: { chapterId: true, marks: true } },
        },
      },
      items: {
        select: {
          sectionId: true,
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
  return papers.map(({ blueprint, items, ...p }) => {
    const resolvedExamType = resolvePaperExamType({ ...p, blueprint });
    const placedItems = toPlacedItems(blueprint.sections, items);
    const status = paperStatus(
      {
        sections: blueprint.sections,
        chapters: blueprint.chapters.map((c) => ({ chapterId: c.chapterId, marks: c.marks })),
      },
      placedItems,
    );

    const neededQuestions = status.sections.reduce((s, x) => s + x.needed, 0);
    // Effective filled questions clamped to section capacity so an overfilled section doesn't hide unplaced slots
    const filledQuestions = status.sections.reduce((s, x) => s + Math.min(x.needed, x.filled), 0);

    return {
      ...p,
      examType: resolvedExamType,
      blueprint: { name: blueprint.name, examType: resolvedExamType, book: blueprint.book },
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
  const bp = await prisma.blueprint.findUnique({ where: { id: input.blueprintId }, select: { id: true, examType: true } });
  if (!bp) {
    throw new HttpError(400, "Blueprint not found");
  }
  const resolvedExamType = resolvePaperExamType({
    examType: input.examType,
    title: input.title,
    blueprint: bp,
  });
  const paper = await prisma.paper.create({
    data: {
      ...input,
      examType: resolvedExamType,
      createdById: user.id,
    },
  });

  await recordAudit(user, "PAPER_CREATE", "PAPER", paper.id, {
    title: paper.title,
    examType: paper.examType,
    schoolName: paper.schoolName,
    blueprintId: paper.blueprintId,
    academicSession: paper.academicSession,
  });

  return loadPaperView(paper.id);
});
