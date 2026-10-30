import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { DIFFICULTIES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const bulkDifficultySchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1, "At least one question ID is required"),
  difficulty: z.enum(DIFFICULTIES),
});

export const POST = route(async (req, _params, user) => {
  const input = await body(req, bulkDifficultySchema);
  const { questionIds, difficulty } = input;

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
    throw new HttpError(
      409,
      `Cannot edit questions that are part of finalised exam paper "${lockedUse.paper.title}". Unlock the paper first.`
    );
  }

  const result = await prisma.question.updateMany({
    where: { id: { in: existingQuestions.map((q) => q.id) } },
    data: { difficulty },
  });

  await recordAudit(user, "QUESTION_BULK_UPDATE", "QUESTION", undefined, {
    count: result.count,
    difficulty,
  });

  return {
    success: true,
    count: result.count,
    updatedCount: result.count,
    message: `Successfully updated difficulty to ${difficulty} for ${result.count} question(s).`,
  };
});
