import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";

/**
 * Duplicate a paper:
 * Clones a paper and all of its question placements into a new DRAFT paper
 * with title suffixed by "(Copy)" and blank paperSet/examDate.
 */
export const POST = route(async (req, params, user) => {
  const { id } = await params;
  const raw = await req.json().catch(() => ({}));

  const source = await prisma.paper.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          question: true,
          orQuestion: true,
        },
      },
    },
  });

  if (!source) throw new HttpError(404, "Paper not found");

  const targetSession = typeof raw.academicSession === "string" && raw.academicSession.trim()
    ? raw.academicSession.trim()
    : source.academicSession;
  const newTitle = typeof raw.title === "string" && raw.title.trim()
    ? raw.title.trim()
    : `${source.title} (Copy)`;

  const newPaper = await prisma.paper.create({
    data: {
      title: newTitle,
      blueprintId: source.blueprintId,
      examType: source.examType,
      layout: source.layout,
      schoolName: source.schoolName,
      examDate: "",
      paperSet: "",
      subjectCode: source.subjectCode,
      generalInstructions: source.generalInstructions,
      academicSession: targetSession,
      schoolLogo: source.schoolLogo,
      logoPath: source.logoPath,
      printDensity: source.printDensity,
      twoColumn: source.twoColumn,
      targetPages: source.targetPages,
      numberingStyle: source.numberingStyle,
      marksStyle: source.marksStyle,
      showCandidateDetails: source.showCandidateDetails,
      showSignatures: source.showSignatures,
      status: "DRAFT",
      createdById: user.id,
    },
  });

  // Duplicate all question placements
  for (const it of source.items) {
    await prisma.paperQuestion.create({
      data: {
        paperId: newPaper.id,
        sectionId: it.sectionId,
        questionId: it.questionId,
        orQuestionId: it.orQuestionId,
        position: it.position,
      },
    });
  }

  await recordAudit(user, "PAPER_CREATE", "PAPER", newPaper.id, {
    action: "PAPER_DUPLICATE",
    sourceId: source.id,
    title: newPaper.title,
  });

  const view = await loadPaperView(newPaper.id);

  return {
    success: true,
    message: `Duplicated "${source.title}" as new draft.`,
    paper: view,
  };
});
