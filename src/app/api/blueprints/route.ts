import { body, route } from "@/lib/api";
import { assertBlueprintValid, blueprintInclude, loadBlueprint } from "@/lib/blueprints";
import { prisma } from "@/lib/prisma";
import { blueprintSchema } from "@/lib/schemas";

import { DEFAULT_ACADEMIC_SESSION } from "@/lib/constants";

export const GET = route(async (req) => {
  const url = new URL(req.url);
  const session = url.searchParams.get("session");
  const where =
    session && session !== "ALL"
      ? { academicSession: { in: [session.replace(/[–—]/g, "-"), session.replace(/-/g, "–")] } }
      : undefined;
  return prisma.blueprint.findMany({ where, orderBy: { createdAt: "desc" }, include: blueprintInclude });
});

export const POST = route(async (req) => {
  const input = await body(req, blueprintSchema);
  input.chapters = input.chapters.filter((c) => c.marks > 0);
  await assertBlueprintValid(input);
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
      curriculumTemplateId: input.curriculumTemplateId || null,
      curriculumVariantId: input.curriculumVariantId || null,
      chapters: { create: input.chapters },
      sections: {
        create: input.sections.map((s, position) => ({
          title: s.title,
          instructions: s.instructions,
          type: s.type,
          count: s.count,
          marksEach: s.marksEach,
          orChoiceMode: s.orChoiceMode || "BOARD_DEFAULT",
          orAlternativeCount: s.orAlternativeCount ?? 1,
          orSlotsJson: s.orSlotsJson || "[]",
          position,
        })),
      },
    },
  });
  return loadBlueprint(created.id);
});
