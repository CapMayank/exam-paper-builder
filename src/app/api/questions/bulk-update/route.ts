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

  // Update questions where user has permission (ADMIN, HOD, or author)
  const isElevated = user.role === "ADMIN" || user.role === "HOD";
  const whereClause: Record<string, unknown> = {
    id: { in: questionIds },
  };
  if (!isElevated) {
    whereClause.createdById = user.id;
  }

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
