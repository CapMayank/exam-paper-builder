import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { DIFFICULTIES } from "@/lib/constants";
import { canModifyQuestion } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const bulkDifficultySchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1, "At least one question ID is required"),
  difficulty: z.enum(DIFFICULTIES),
});

export const POST = route(async (req, _params, user) => {
  const input = await body(req, bulkDifficultySchema);
  const { questionIds, difficulty } = input;

  const existingQuestions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, bookId: true, createdById: true, book: { select: { className: true, subject: true } } },
  });

  if (existingQuestions.length === 0) {
    throw new HttpError(404, "No matching questions found.");
  }

  if (existingQuestions.some((q) => !canModifyQuestion(user, q))) {
    throw new HttpError(403, "You can only change your own questions, or questions of the classes and subjects assigned to you.");
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
