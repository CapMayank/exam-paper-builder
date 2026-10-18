import "server-only";
import type { z } from "zod";
import { HttpError } from "./api";
import { validateBlueprint } from "./blueprint";
import { prisma } from "./prisma";
import type { blueprintSchema } from "./schemas";

export type BlueprintInput = z.infer<typeof blueprintSchema>;

export const blueprintInclude = {
  book: { select: { id: true, title: true, subject: true, className: true } },
  chapters: { include: { chapter: { select: { id: true, number: true, title: true } } }, orderBy: { chapter: { number: "asc" } } },
  sections: { orderBy: { position: "asc" } },
  _count: { select: { papers: true } },
} as const;

export function loadBlueprint(id: string) {
  return prisma.blueprint.findUnique({ where: { id }, include: blueprintInclude });
}

/** Throws 400 unless the blueprint is internally consistent and its chapters belong to its book. */
export async function assertBlueprintValid(input: BlueprintInput) {
  const errors = validateBlueprint(input);
  if (errors.length) throw new HttpError(400, errors.join(" "));
  const chapters = await prisma.chapter.findMany({
    where: { id: { in: input.chapters.map((c) => c.chapterId) } },
    select: { id: true, bookId: true },
  });
  if (chapters.length !== input.chapters.length || chapters.some((c) => c.bookId !== input.bookId)) {
    throw new HttpError(400, "All chapters must belong to the chosen book");
  }
}
