import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertCanCopyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { itemCopyData, paperCopyData } from "@/lib/questionWrite";

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
      blueprint: { select: { book: { select: { className: true, subject: true } } } },
      items: true,
    },
  });

  if (!source) throw new HttpError(404, "Paper not found");
  assertCanCopyPaper(user, source);

  const targetSession = typeof raw.academicSession === "string" && raw.academicSession.trim()
    ? raw.academicSession.trim()
    : source.academicSession;
  const newTitle = typeof raw.title === "string" && raw.title.trim()
    ? raw.title.trim()
    : `${source.title} (Copy)`;

  const newPaper = await prisma.paper.create({
    data: {
      ...paperCopyData(source),
      title: newTitle,
      academicSession: targetSession,
      examDate: "",
      paperSet: "",
      status: "DRAFT",
      createdById: user.id,
      // the placements, with each question's own page break, instruction and syllabus component
      items: {
        create: source.items.map((it) => ({ ...itemCopyData(it), questionId: it.questionId, orQuestionId: it.orQuestionId })),
      },
    },
  });

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
