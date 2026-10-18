import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { resolvePaperExamType } from "@/lib/constants";
import { loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { paperCreateSchema } from "@/lib/schemas";

export const GET = route(async () => {
  const papers = await prisma.paper.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      blueprint: {
        select: { name: true, examType: true, book: { select: { title: true, subject: true, className: true } }, sections: { select: { count: true } } },
      },
      _count: { select: { items: true } },
    },
  });
  return papers.map(({ blueprint, _count, ...p }) => {
    const resolvedExamType = resolvePaperExamType({ ...p, blueprint });
    return {
      ...p,
      examType: resolvedExamType,
      blueprint: { name: blueprint.name, examType: resolvedExamType, book: blueprint.book },
      filled: _count.items,
      needed: blueprint.sections.reduce((s, x) => s + x.count, 0),
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
