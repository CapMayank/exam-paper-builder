import { body, route } from "@/lib/api";
import { assertBlueprintValid, blueprintInclude, loadBlueprint } from "@/lib/blueprints";
import { prisma } from "@/lib/prisma";
import { blueprintSchema } from "@/lib/schemas";
import { DEFAULT_ACADEMIC_SESSION } from "@/lib/constants";
import { ensureCurriculumSeeded } from "@/lib/curriculumInit";

export const GET = route(async (req) => {
  await ensureCurriculumSeeded().catch((err) => {
    console.error("❌ Failed to ensure curriculum is seeded:", err);
  });
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

  // Safely resolve foreign key IDs so template codes never trigger constraint violations
  let validTemplateId: string | null = null;
  if (input.curriculumTemplateId) {
    const tmpl = await prisma.curriculumBlueprintTemplate.findFirst({
      where: {
        OR: [
          { id: input.curriculumTemplateId },
          { templateCode: input.curriculumTemplateId },
        ],
      },
      select: { id: true },
    });
    validTemplateId = tmpl?.id || null;
  }

  let validVariantId: string | null = null;
  if (input.curriculumVariantId) {
    const v = await prisma.curriculumSubjectVariant.findFirst({
      where: {
        OR: [
          { id: input.curriculumVariantId },
          { code: input.curriculumVariantId },
        ],
      },
      select: { id: true },
    });
    validVariantId = v?.id || null;
  }

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
      curriculumTemplateId: validTemplateId,
      curriculumVariantId: validVariantId,
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
