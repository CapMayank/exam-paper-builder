import { body, HttpError, route } from "@/lib/api";
import { blueprintInclude } from "@/lib/blueprints";
import { prisma } from "@/lib/prisma";
import { rolloverBlueprintsSchema } from "@/lib/schemas";

export const POST = route(
  async (req) => {
  const { sourceBlueprintIds, targetAcademicSession, namePrefix, targetBookIdMap } = await body(
    req,
    rolloverBlueprintsSchema,
  );
  const normalizedSession = targetAcademicSession.replace(/-/g, "–").trim();

  const sources = await prisma.blueprint.findMany({
    where: { id: { in: sourceBlueprintIds } },
    include: {
      chapters: { include: { chapter: true } },
      sections: true,
      book: true,
    },
  });

  if (sources.length === 0) {
    throw new HttpError(404, "None of the requested blueprints were found");
  }

  const createdBlueprints = [];

  for (const src of sources) {
    // Generate new name: replace old session pattern e.g. [2025–26] or prepend [2026–27]
    let newName = src.name;
    const sessionTagRegex = /\[\s*20\d\d[–-]\d\d\s*\]\s*/;
    if (sessionTagRegex.test(newName)) {
      newName = newName.replace(sessionTagRegex, `[${normalizedSession}] `);
    } else if (namePrefix) {
      newName = `${namePrefix}${newName}`;
    } else {
      newName = `[${normalizedSession}] ${newName}`;
    }

    const targetBookId = targetBookIdMap?.[src.bookId] || src.bookId;
    const targetBook =
      targetBookId !== src.bookId
        ? await prisma.book.findUnique({
            where: { id: targetBookId },
            include: { chapters: true },
          })
        : null;

    const created = await prisma.blueprint.create({
      data: {
        name: newName,
        bookId: targetBookId,
        academicSession: normalizedSession,
        examType: src.examType,
        durationMin: src.durationMin,
        subjectCode: src.subjectCode,
        // everything else that defines the paper: language, curriculum link, language components
        language: src.language,
        curriculumTemplateId: src.curriculumTemplateId,
        curriculumVariantId: src.curriculumVariantId,
        curriculumMode: src.curriculumMode,
        verificationStatus: src.verificationStatus,
        sourceRef: src.sourceRef,
        textbookVariant: src.textbookVariant,
        blueprintVersion: src.blueprintVersion,
        componentsJson: src.componentsJson,
        chapters: {
          // a chapter with no match in the target book is left out rather than pointed at the old book's chapter
          create: src.chapters
            .map((c) => {
              const mappedId = targetBook
                ? targetBook.chapters.find(
                    (tc) =>
                      tc.number === c.chapter.number ||
                      tc.title.trim().toLowerCase() === c.chapter.title.trim().toLowerCase(),
                  )?.id
                : c.chapterId;
              return mappedId ? { chapterId: mappedId, marks: c.marks, unitKey: c.unitKey, unitTitle: c.unitTitle } : null;
            })
            .filter((c): c is { chapterId: string; marks: number; unitKey: string; unitTitle: string } => c !== null),
        },
        sections: {
          create: src.sections.map((s) => ({
            position: s.position,
            title: s.title,
            instructions: s.instructions,
            type: s.type,
            count: s.count,
            marksEach: s.marksEach,
            orChoiceMode: s.orChoiceMode || "BOARD_DEFAULT",
            orAlternativeCount: s.orAlternativeCount ?? 1,
            orSlotsJson: s.orSlotsJson || "[]",
            role: s.role,
            groupKey: s.groupKey,
          })),
        },
      },
      include: blueprintInclude,
    });

    createdBlueprints.push(created);
  }

  return {
    count: createdBlueprints.length,
    targetAcademicSession: normalizedSession,
    blueprints: createdBlueprints,
  };
  },
  { roles: ["ADMIN"] },
);
