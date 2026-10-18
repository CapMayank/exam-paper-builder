import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import type { PaperImportData } from "@/lib/paperImport";

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

  for (let sIdx = 0; sIdx < paperData.sections.length; sIdx++) {
    const impSec = paperData.sections[sIdx];
    const bpSec =
      blueprint.sections.find(
        (s) =>
          s.title.toLowerCase().replace(/[^a-z0-9]/g, "") ===
          impSec.title.toLowerCase().replace(/[^a-z0-9]/g, "")
      ) ||
      blueprint.sections[sIdx] ||
      blueprint.sections[blueprint.sections.length - 1];

    if (!bpSec) continue;

    // Find current max position in this section
    const existingInSec = await prisma.paperQuestion.findMany({
      where: { paperId: id, sectionId: bpSec.id },
      orderBy: { position: "desc" },
      take: 1,
    });
    let startPos = existingInSec.length > 0 ? existingInSec[0].position + 1 : 0;

    for (let qIdx = 0; qIdx < impSec.questions.length; qIdx++) {
      const q = impSec.questions[qIdx];
      if (!q.text?.trim()) continue;

      let chapterId = fallbackChapterId;
      if (q.chapterNumber !== undefined && chapterByNum.has(q.chapterNumber)) {
        chapterId = chapterByNum.get(q.chapterNumber)!;
      } else if (q.chapterTitle) {
        const clean = q.chapterTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (chapterByTitle.has(clean)) {
          chapterId = chapterByTitle.get(clean)!;
        }
      }

      let orQuestionId: string | null = null;
      if (q.orQuestion && q.orQuestion.text?.trim()) {
        let orChapterId = chapterId;
        if (q.orQuestion.chapterNumber !== undefined && chapterByNum.has(q.orQuestion.chapterNumber)) {
          orChapterId = chapterByNum.get(q.orQuestion.chapterNumber)!;
        } else if (q.orQuestion.chapterTitle) {
          const cleanOr = q.orQuestion.chapterTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (chapterByTitle.has(cleanOr)) {
            orChapterId = chapterByTitle.get(cleanOr)!;
          }
        }

        const createdOr = await prisma.question.create({
          data: {
            bookId: blueprint.bookId,
            chapterId: orChapterId,
            type: q.orQuestion.type || bpSec.type,
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

      const createdQ = await prisma.question.create({
        data: {
          bookId: blueprint.bookId,
          chapterId,
          type: q.type || bpSec.type,
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
          position: startPos + qIdx,
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
