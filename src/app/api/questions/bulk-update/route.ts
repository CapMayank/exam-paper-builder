import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  questionIds: z.array(z.string()).min(1),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  chapterId: z.string().optional(),
});

export const POST = route(async (req, _params, user) => {
  const body = await req.json();
  const parsed = bulkUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid bulk update payload.");
  }

  const { questionIds, difficulty, chapterId } = parsed.data;

  const dataToUpdate: Record<string, unknown> = {};
  if (difficulty) dataToUpdate.difficulty = difficulty;
  if (chapterId) dataToUpdate.chapterId = chapterId;

  if (Object.keys(dataToUpdate).length === 0) {
    throw new HttpError(400, "No valid update fields specified.");
  }

  // 1. If chapterId is specified, verify it exists and retrieve its bookId
  let targetChapter: { id: string; bookId: string } | null = null;
  if (chapterId) {
    targetChapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { id: true, bookId: true },
    });
    if (!targetChapter) {
      throw new HttpError(404, "Target chapter not found.");
    }
  }

  // 2. Fetch questions to verify book consistency and ownership
  const isElevated = user.role === "ADMIN" || user.role === "HOD";
  const existingQuestions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, bookId: true, createdById: true },
  });

  if (existingQuestions.length === 0) {
    throw new HttpError(404, "No matching questions found.");
  }

  if (!isElevated && existingQuestions.some((q) => q.createdById !== user.id)) {
    throw new HttpError(403, "You do not have permission to modify questions authored by other users.");
  }

  if (targetChapter && existingQuestions.some((q) => q.bookId !== targetChapter!.bookId)) {
    throw new HttpError(400, "Cannot reassign questions to a chapter from a different book.");
  }

  // 3. Ensure none of these questions belong to a finalised paper
  const lockedUse = await prisma.paperQuestion.findFirst({
    where: {
      OR: [
        { questionId: { in: questionIds } },
        { orQuestionId: { in: questionIds } },
      ],
      paper: { status: "FINAL" },
    },
    select: { paper: { select: { title: true } } },
  });
  if (lockedUse) {
    throw new HttpError(409, `Cannot edit questions that are part of finalised exam paper "${lockedUse.paper.title}". Unlock the paper first.`);
  }

  const whereClause: Record<string, unknown> = {
    id: { in: existingQuestions.map((q) => q.id) },
  };

  const result = await prisma.question.updateMany({
    where: whereClause,
    data: dataToUpdate,
  });

  await recordAudit(user, "QUESTION_BULK_UPDATE", "QUESTION", undefined, {
    count: result.count,
    difficulty,
    chapterId,
  });

  return {
    success: true,
    count: result.count,
    message: `Successfully updated ${result.count} question(s).`,
  };
});
