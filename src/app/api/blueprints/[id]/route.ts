import { body, HttpError, route } from "@/lib/api";
import { isAdmin } from "@/lib/permissions";
import { assertBlueprintValid, loadBlueprint } from "@/lib/blueprints";
import { updateBlueprintWithPapers } from "@/lib/blueprintWrite";
import { assertCanManageBook } from "@/lib/papers";
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
  await assertCanManageBook(user, existing.bookId);
  if (input.bookId !== existing.bookId) await assertCanManageBook(user, input.bookId);

  if (existing.papers.some((p) => p.status === "FINAL") && !isAdmin(user)) {
    throw new HttpError(
      403,
      "Cannot modify a blueprint linked to finalised exam papers. Only an Administrator can make changes.",
    );
  }

  await assertBlueprintValid(input);

  await updateBlueprintWithPapers(id, input, user);
  const updatedBp = await loadBlueprint(id);
  if (!updatedBp) throw new HttpError(404, "Blueprint not found after update");
  return updatedBp;
  },
  { roles: ["ADMIN", "TEACHER"] },
);

export const DELETE = route(
  async (_req, { id }, user) => {
    const bp = await prisma.blueprint.findUnique({ where: { id }, select: { bookId: true } });
    if (!bp) throw new HttpError(404, "Blueprint not found");
    await assertCanManageBook(user, bp.bookId);
    const papers = await prisma.paper.count({ where: { blueprintId: id } });
    if (papers > 0) throw new HttpError(409, `${papers} paper(s) use this blueprint. Delete them first.`);
    await prisma.blueprint.delete({ where: { id } });
  },
  { roles: ["ADMIN", "TEACHER"] },
);
