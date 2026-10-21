import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import {
  DEFAULT_ACADEMIC_SESSION,
  DEFAULT_SCHOOL_NAME,
  resolvePaperExamType,
} from "@/lib/constants";
import { loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import {
  matchQuestionToBlueprintSection,
  normalizeQuestionType,
  resolveQuestionChapter,
  type PaperImportData,
} from "@/lib/paperImport";

export const POST = route(async (req, _params, user) => {
  const json = await req.json();
  const { blueprintId, paperData } = json as {
    blueprintId: string;
    paperData: PaperImportData;
  };

  if (!blueprintId) {
    throw new HttpError(400, "Please select a target blueprint.");
  }
  if (!paperData || !Array.isArray(paperData.sections) || paperData.sections.length === 0) {
    throw new HttpError(400, "Invalid paper data: no sections found.");
  }

  const blueprint = await prisma.blueprint.findUnique({
    where: { id: blueprintId },
    include: {
      book: { include: { chapters: true } },
      sections: { orderBy: { position: "asc" } },
      chapters: true,
    },
  });

  if (!blueprint) {
    throw new HttpError(404, "Target blueprint not found.");
  }

  const bookChapters = blueprint.book.chapters;
  if (bookChapters.length === 0) {
    throw new HttpError(400, "Textbook has no chapters defined.");
  }

  // Pre-index chapters
  const chapterByNum = new Map<number, string>();
  const chapterByTitle = new Map<string, string>();
  for (const ch of bookChapters) {
    chapterByNum.set(ch.number, ch.id);
    chapterByTitle.set(ch.title.toLowerCase().replace(/[^a-z0-9]/g, ""), ch.id);
  }
  const fallbackChapterId = bookChapters[0].id;

  const finalTitle = paperData.title?.trim() || `${blueprint.name} (Imported)`;
  const resolvedExamType = resolvePaperExamType({
    examType: paperData.examType,
    title: finalTitle,
    blueprint,
  });

  // 1. Create the Paper
  const paper = await prisma.paper.create({
    data: {
      title: finalTitle,
      examType: resolvedExamType,
      blueprintId: blueprint.id,
      layout: paperData.layout || "BOOKLET_A4",
      schoolName: paperData.schoolName?.trim() || DEFAULT_SCHOOL_NAME,
      examDate: paperData.examDate?.trim() || "",
      paperSet: paperData.paperSet?.trim() || "SET A",
      subjectCode: paperData.subjectCode?.trim() || blueprint.subjectCode || "",
      academicSession: paperData.academicSession?.trim() || blueprint.academicSession || DEFAULT_ACADEMIC_SESSION,
      generalInstructions: paperData.generalInstructions?.trim() || "",
      status: "DRAFT",
      createdById: user.id,
    },
  });

  // 2. Map and ingest questions section by section with smart type & marks routing
  let totalImportedQuestions = 0;
  const bpSections = [...blueprint.sections].sort((a, b) => a.position - b.position);
  const allocatedCounts = new Map<string, number>();
  const sectionPositions = new Map<string, number>();

  for (let sIdx = 0; sIdx < paperData.sections.length; sIdx++) {
    const impSec = paperData.sections[sIdx];

    for (let qIdx = 0; qIdx < impSec.questions.length; qIdx++) {
      const q = impSec.questions[qIdx];
      if (!q.text?.trim()) continue;

      // Smart match to best blueprint section slot
      const bpSec =
        matchQuestionToBlueprintSection(
          q,
          impSec.title,
          sIdx,
          bpSections,
          allocatedCounts
        ) || bpSections[0];

      const units =
        Array.isArray(q.subparts) && q.subparts.length > 0 && bpSec.count >= q.subparts.length
          ? q.subparts.length
          : 1;
      allocatedCounts.set(bpSec.id, (allocatedCounts.get(bpSec.id) ?? 0) + units);
      const pos = sectionPositions.get(bpSec.id) ?? 0;
      sectionPositions.set(bpSec.id, pos + 1);

      // Determine chapter
      const resolvedChapter = resolveQuestionChapter(q, impSec.title, bookChapters);
      const chapterId = resolvedChapter?.id || fallbackChapterId;

      // Handle optional OR question
      let orQuestionId: string | null = null;
      if (q.orQuestion && q.orQuestion.text?.trim()) {
        let orChapterId = chapterId;
        const resolvedOrCh = resolveQuestionChapter(q.orQuestion, impSec.title, bookChapters);
        if (resolvedOrCh) {
          orChapterId = resolvedOrCh.id;
        }

        let orType = normalizeQuestionType(q.orQuestion.type || bpSec.type);
        if (
          (bpSec.type === "VERY_SHORT" && orType === "SHORT") ||
          (bpSec.type === "SHORT" && orType === "VERY_SHORT" && bpSec.marksEach > 1) ||
          (bpSec.type === "LONG" && orType === "SHORT" && bpSec.marksEach <= 4)
        ) {
          orType = bpSec.type;
        }

        const createdOr = await prisma.question.create({
          data: {
            bookId: blueprint.bookId,
            chapterId: orChapterId,
            type: orType,
            text: q.orQuestion.text.trim(),
            optionsJson: JSON.stringify(q.orQuestion.options ?? []),
            subpartsJson: JSON.stringify(q.orQuestion.subparts ?? []),
            answer: q.orQuestion.answer?.trim() || "",
            difficulty: q.orQuestion.difficulty || "MEDIUM",
            createdById: user.id,
          },
        });
        orQuestionId = createdOr.id;
      }

      // Create primary question
      let finalType = normalizeQuestionType(q.type || bpSec.type);
      if (
        (bpSec.type === "VERY_SHORT" && finalType === "SHORT") ||
        (bpSec.type === "SHORT" && finalType === "VERY_SHORT" && bpSec.marksEach > 1) ||
        (bpSec.type === "LONG" && finalType === "SHORT" && bpSec.marksEach <= 4)
      ) {
        finalType = bpSec.type;
      }
      const createdQ = await prisma.question.create({
        data: {
          bookId: blueprint.bookId,
          chapterId,
          type: finalType,
          text: q.text.trim(),
          optionsJson: JSON.stringify(q.options ?? []),
          subpartsJson: JSON.stringify(q.subparts ?? []),
          answer: q.answer?.trim() || "",
          difficulty: q.difficulty || "MEDIUM",
          createdById: user.id,
        },
      });

      // Link to paper
      await prisma.paperQuestion.create({
        data: {
          paperId: paper.id,
          sectionId: bpSec.id,
          questionId: createdQ.id,
          orQuestionId,
          position: pos,
        },
      });

      totalImportedQuestions++;
    }
  }

  await recordAudit(user, "PAPER_CREATE", "PAPER", paper.id, {
    action: "PAPER_IMPORT",
    title: paper.title,
    blueprintId: blueprint.id,
    questionsCount: totalImportedQuestions,
  });

  return {
    success: true,
    paperId: paper.id,
    paper: await loadPaperView(paper.id),
  };
});
