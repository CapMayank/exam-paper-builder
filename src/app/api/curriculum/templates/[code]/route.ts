import { HttpError, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { MPBSE_BLUEPRINT_TEMPLATES } from "@/lib/curriculumTemplates";
import { ensureCurriculumSeeded } from "@/lib/curriculumInit";

export const GET = route(
  async (_req, params) => {
    await ensureCurriculumSeeded().catch((err) => {
      console.error("❌ Failed to ensure curriculum is seeded:", err);
    });

    const code = params.code;
    if (!code) {
      throw new HttpError(400, "Missing template identifier parameter.");
    }

    const template = await prisma.curriculumBlueprintTemplate.findFirst({
      where: {
        OR: [{ id: code }, { templateCode: code }],
      },
      include: {
        subject: {
          include: {
            curriculumClass: true,
            stream: true,
            variants: true,
            textbooks: {
              include: {
                chapters: {
                  orderBy: { chapterNumber: "asc" },
                },
              },
            },
            marksSchemes: true,
          },
        },
        sourceDocument: true,
      },
    });

    if (template) {
      const marksScheme = template.subject.marksSchemes[0] || null;
      return {
        id: template.id,
        templateCode: template.templateCode,
        title: template.title,
        academicSession: template.academicSession,
        durationMin: template.durationMin,
        totalMarks: template.totalMarks,
        archetype: template.archetype,
        sectionsJson: template.sectionsJson,
        subject: {
          id: template.subject.id,
          code: template.subject.code,
          name: template.subject.name,
          classLevel: template.subject.curriculumClass.classLevel,
          className: template.subject.curriculumClass.displayName,
          streamCode: template.subject.stream?.code,
          streamName: template.subject.stream?.name,
          theoryMarks: template.subject.theoryMarks,
          practicalMarks: template.subject.practicalMarks,
          projectMarks: template.subject.projectMarks,
          variants: template.subject.variants,
          textbooks: template.subject.textbooks.map((tb) => ({
            id: tb.id,
            title: tb.title,
            publisher: tb.publisher,
            legacyBookId: tb.legacyBookId,
            chapters: tb.chapters.map((ch) => ({
              id: ch.id,
              chapterNumber: ch.chapterNumber,
              title: ch.title,
              unitNumber: ch.unitNumber,
              unitTitle: ch.unitTitle,
              officialMarks: ch.officialMarks,
              isDeleted: ch.isDeleted,
              legacyChapterId: ch.legacyChapterId,
            })),
          })),
          marksScheme: marksScheme
            ? {
                totalTheory: marksScheme.totalTheory,
                totalPractical: marksScheme.totalPractical,
                totalProject: marksScheme.totalProject,
                unitBreakdown: marksScheme.unitBreakdown,
                practicalRubric: marksScheme.practicalRubric,
              }
            : null,
        },
        sourceDocument: {
          id: template.sourceDocument.id,
          title: template.sourceDocument.title,
          officialUrl: template.sourceDocument.officialUrl,
          circularNumber: template.sourceDocument.circularNumber,
        },
      };
    }

    // Fallback to in-memory templates
    const staticMatch = MPBSE_BLUEPRINT_TEMPLATES.find(
      (t) => t.id === code || t.templateCode === code
    );
    if (staticMatch) {
      return staticMatch;
    }

    throw new HttpError(404, `Curriculum template "${code}" not found.`);
  },
  { auth: false }
);
