import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import {
  matchQuestionToBlueprintSection,
  normalizeQuestionType,
  resolveQuestionChapter,
  type PaperImportData,
} from "@/lib/paperImport";

export const POST = route(async (req, { id }, user) => {
  const json = await req.json();
  const { paperData, mode = "replace" } = json as {
    paperData: PaperImportData;
    mode?: "replace" | "append";
  };

  const paper = await prisma.paper.findUnique({
    where: { id },
    include: {
      blueprint: {
        include: {
          book: { include: { chapters: true } },
          sections: { orderBy: { position: "asc" } },
          chapters: true,
        },
      },
      items: true,
    },
  });

  if (!paper) {
    throw new HttpError(404, "Paper not found");
  }
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") {
    throw new HttpError(409, "This paper is finalised. Reopen it to make changes.");
  }
  if (!paperData || !Array.isArray(paperData.sections) || paperData.sections.length === 0) {
    throw new HttpError(400, "Invalid import data: no sections found.");
  }

  const blueprint = paper.blueprint;
  const bookChapters = blueprint.book.chapters;

  const chapterByNum = new Map<number, string>();
  const chapterByTitle = new Map<string, string>();
  for (const ch of bookChapters) {
    chapterByNum.set(ch.number, ch.id);
    chapterByTitle.set(ch.title.toLowerCase().replace(/[^a-z0-9]/g, ""), ch.id);
  }
  const fallbackChapterId = bookChapters[0]?.id || "";

  // If mode === "replace", remove existing placed questions
  if (mode === "replace") {
    await prisma.paperQuestion.deleteMany({
      where: { paperId: id },
    });
  }

  let importedCount = 0;
  const bpSections = [...blueprint.sections].sort((a, b) => a.position - b.position);
  const allocatedCounts = new Map<string, number>();
  const sectionPositions = new Map<string, number>();

  for (const s of bpSections) {
    if (mode === "append") {
      const existingInSec = await prisma.paperQuestion.findMany({
        where: { paperId: id, sectionId: s.id },
        orderBy: { position: "desc" },
        take: 1,
      });
      sectionPositions.set(s.id, existingInSec.length > 0 ? existingInSec[0].position + 1 : 0);
      const existingCount = await prisma.paperQuestion.count({
        where: { paperId: id, sectionId: s.id },
      });
      allocatedCounts.set(s.id, existingCount);
    } else {
      sectionPositions.set(s.id, 0);
      allocatedCounts.set(s.id, 0);
    }
  }

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

      allocatedCounts.set(bpSec.id, (allocatedCounts.get(bpSec.id) ?? 0) + 1);
      const pos = sectionPositions.get(bpSec.id) ?? 0;
      sectionPositions.set(bpSec.id, pos + 1);

      const resolvedChapter = resolveQuestionChapter(q, impSec.title, bookChapters);
      const chapterId = resolvedChapter?.id || fallbackChapterId;

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
          (bpSec.type === "SHORT" && orType === "VERY_SHORT" && bpSec.marksEach > 1)
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
            subpartsJson: "[]",
            answer: q.orQuestion.answer?.trim() || "",
            difficulty: q.orQuestion.difficulty || "MEDIUM",
            createdById: user.id,
          },
        });
        orQuestionId = createdOr.id;
      }

      let finalType = normalizeQuestionType(q.type || bpSec.type);
      if (
        (bpSec.type === "VERY_SHORT" && finalType === "SHORT") ||
        (bpSec.type === "SHORT" && finalType === "VERY_SHORT" && bpSec.marksEach > 1)
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

      await prisma.paperQuestion.create({
        data: {
          paperId: id,
          sectionId: bpSec.id,
          questionId: createdQ.id,
          orQuestionId,
          position: pos,
        },
      });

      importedCount++;
    }
  }

  await prisma.paper.update({
    where: { id },
    data: {
      updatedAt: new Date(),
      ...(paperData.examType ? { examType: paperData.examType } : {}),
      ...(paperData.academicSession ? { academicSession: paperData.academicSession } : {}),
    },
  });

  await recordAudit(user, "PAPER_UPDATE", "PAPER", id, {
    action: "PAPER_QUESTIONS_IMPORT",
    mode,
    questionsImported: importedCount,
  });

  return {
    success: true,
    importedCount,
    paper: await loadPaperView(id),
  };
});
