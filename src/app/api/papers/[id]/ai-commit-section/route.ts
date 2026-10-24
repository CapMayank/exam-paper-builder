import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { parseMatchColumnPairs, serializeMatchColumnPair } from "@/lib/constants";
import type { GeneratedPaperQuestion } from "@/lib/gemini";
import { assertCanModifyPaper, loadPaperView } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { normalizeSubpartMarks } from "@/lib/types";

export const POST = route(async (req, { id }, user) => {
  const paper = await loadPaperView(id);
  if (!paper) throw new HttpError(404, "Paper not found");
  assertCanModifyPaper(user, paper);
  if (paper.status === "FINAL") {
    throw new HttpError(409, "This paper is finalised. Reopen it to make changes.");
  }

  const body = await req.json();
  const { sectionId, questions } = body as {
    sectionId: string;
    questions: (GeneratedPaperQuestion & { imagePath?: string })[];
  };

  if (!sectionId) throw new HttpError(400, "sectionId is required");
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new HttpError(400, "Questions array must not be empty");
  }

  const section = paper.blueprint.sections.find((s) => s.id === sectionId);
  if (!section) throw new HttpError(404, "Section not found in blueprint");

  // Determine starting position in section
  const existingSectionItems = paper.items.filter((i) => i.sectionId === sectionId);
  let nextPos = existingSectionItems.reduce((max, i) => Math.max(max, i.position), -1) + 1;

  // Persist questions and link to paper
  await prisma.$transaction(async (tx) => {
    for (const q of questions) {
      const qType = q.type || section.type;
      const isMatch = qType === "MATCH_COLUMN" || section.type === "MATCH_COLUMN";

      // Serialize MATCH_COLUMN pairs into self-contained "Left::Right" option strings
      let processedOptions = Array.isArray(q.options) ? q.options : [];
      if (isMatch) {
        const pairs = parseMatchColumnPairs(processedOptions, q.text);
        if (pairs.length > 0 && pairs.some((p) => p.left && p.right)) {
          processedOptions = pairs.map((p) => serializeMatchColumnPair(p.left, p.right));
        }
      }

      // Balance subpart marks so that their sum strictly equals the section marks
      let normalizedSubparts = Array.isArray(q.subparts) ? q.subparts : [];
      if (normalizedSubparts.length > 0) {
        normalizedSubparts = normalizeSubpartMarks(normalizedSubparts, section.marksEach);
      }

      const chapterId =
        q.chapterId && q.chapterId.trim()
          ? q.chapterId.trim()
          : paper.blueprint.chapters[0]?.chapterId || "";

      // 1. Create question in the question bank
      const createdQuestion = await tx.question.create({
        data: {
          bookId: paper.blueprint.bookId,
          chapterId,
          type: qType,
          text: q.text,
          optionsJson: JSON.stringify(processedOptions),
          subpartsJson: JSON.stringify(normalizedSubparts),
          answer: q.answer || "",
          difficulty: q.difficulty || "MEDIUM",
          imagePath: q.imagePath || null,
          createdById: user.id,
        },
      });

      // 2. Link question into this paper's section
      await tx.paperQuestion.create({
        data: {
          paperId: id,
          sectionId,
          questionId: createdQuestion.id,
          position: nextPos++,
        },
      });
    }

    await tx.paper.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  });

  await recordAudit(user, "PAPER_UPDATE", "PAPER", id, {
    action: "AI_COMMIT_SECTION",
    sectionId,
    sectionTitle: section.title,
    questionsAdded: questions.length,
  });

  const updatedPaper = await loadPaperView(id);

  return {
    success: true,
    addedCount: questions.length,
    paper: updatedPaper,
  };
});
