import { route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { MPBSE_BLUEPRINT_TEMPLATES } from "@/lib/curriculumTemplates";
import { ensureCurriculumSeeded } from "@/lib/curriculumInit";

export const GET = route(
  async (req) => {
    await ensureCurriculumSeeded().catch((err) => {
      console.error("❌ Failed to ensure curriculum is seeded:", err);
    });

    const url = new URL(req.url);
    const classLevelParam = url.searchParams.get("classLevel") || url.searchParams.get("class");
    const streamParam = url.searchParams.get("stream");
    const subjectCodeParam = url.searchParams.get("subjectCode");
    const sessionParam = url.searchParams.get("session");

    const where: any = {};
    if (sessionParam && sessionParam !== "ALL") {
      where.academicSession = sessionParam.replace(/[–—]/g, "-");
    }

    if (subjectCodeParam) {
      where.subject = { ...(where.subject || {}), code: subjectCodeParam };
    }

    if (classLevelParam) {
      const parsedClass = parseInt(classLevelParam.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsedClass)) {
        where.subject = {
          ...(where.subject || {}),
          curriculumClass: { classLevel: parsedClass },
        };
      }
    }

    if (streamParam && streamParam !== "ALL") {
      where.subject = {
        ...(where.subject || {}),
        stream: { code: { contains: streamParam } },
      };
    }

    const dbTemplates = await prisma.curriculumBlueprintTemplate.findMany({
      where,
      orderBy: [
        { subject: { curriculumClass: { classLevel: "asc" } } },
        { subject: { code: "asc" } },
      ],
      include: {
        subject: {
          include: {
            curriculumClass: true,
            stream: true,
            variants: true,
            textbooks: {
              include: {
                chapters: { orderBy: { chapterNumber: "asc" } },
              },
            },
            marksSchemes: true,
          },
        },
        sourceDocument: true,
      },
    });

    if (dbTemplates.length > 0) {
      return dbTemplates.map((t) => ({
        id: t.id,
        templateCode: t.templateCode,
        title: t.title,
        academicSession: t.academicSession,
        durationMin: t.durationMin,
        totalMarks: t.totalMarks,
        archetype: t.archetype,
        sectionsJson: t.sectionsJson,
        subject: {
          id: t.subject.id,
          code: t.subject.code,
          name: t.subject.name,
          classLevel: t.subject.curriculumClass.classLevel,
          className: t.subject.curriculumClass.displayName,
          streamCode: t.subject.stream?.code,
          streamName: t.subject.stream?.name,
          variants: t.subject.variants.map((v) => ({
            id: v.id,
            code: v.code,
            name: v.name,
          })),
          textbooks: t.subject.textbooks.map((tb) => ({
            id: tb.id,
            title: tb.title,
            legacyBookId: tb.legacyBookId,
            chaptersCount: tb.chapters.length,
          })),
        },
        sourceDocument: {
          id: t.sourceDocument.id,
          title: t.sourceDocument.title,
          officialUrl: t.sourceDocument.officialUrl,
          circularNumber: t.sourceDocument.circularNumber,
        },
      }));
    }

    // Fallback to static in-memory templates
    let filtered = MPBSE_BLUEPRINT_TEMPLATES;
    if (classLevelParam) {
      const parsedClass = parseInt(classLevelParam.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsedClass)) {
        filtered = filtered.filter((t) => t.classLevel === parsedClass);
      }
    }
    if (subjectCodeParam) {
      filtered = filtered.filter((t) => t.subjectCode === subjectCodeParam);
    }
    if (streamParam && streamParam !== "ALL") {
      filtered = filtered.filter((t) => t.stream?.includes(streamParam));
    }

    return filtered;
  },
  { auth: false }
);
