// Sets each listed bank question to its own new type (the "Check types" review in the question bank). A question
// whose paper depends on its type (a finalised paper, or a section that does not take the new type) is skipped.
import { z } from "zod";
import { HttpError, route } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { QUESTION_TYPES } from "@/lib/constants";
import { canModifyQuestion } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { placementBlock, retypeQuestionSelect } from "@/lib/retypePlan";

const retypeSchema = z.object({
  changes: z.array(z.object({ id: z.string().min(1), type: z.enum(QUESTION_TYPES) })).min(1).max(1000),
});

export const POST = route(async (req, _params, user) => {
  const parsed = retypeSchema.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, "Invalid type changes.");
  const changes = new Map(parsed.data.changes.map((c) => [c.id, c.type]));

  const existing = await prisma.question.findMany({
    where: { id: { in: [...changes.keys()] } },
    select: { ...retypeQuestionSelect, createdById: true },
  });
  if (existing.length === 0) throw new HttpError(404, "No matching questions found.");
  if (existing.some((q) => !canModifyQuestion(user, q))) {
    throw new HttpError(403, "You can only change your own questions, or questions of the classes and subjects assigned to you.");
  }

  const skipped: Array<{ id: string; why: string }> = [];
  const todo = existing.filter((q) => {
    const to = changes.get(q.id)!;
    if (to === q.type) return false;
    const why = placementBlock([...q.paperQuestions, ...q.orPaperQuestions], q.book, to);
    if (why) skipped.push({ id: q.id, why });
    return !why;
  });
  await prisma.$transaction(todo.map((q) => prisma.question.update({ where: { id: q.id }, data: { type: changes.get(q.id)! } })));

  if (todo.length > 0) {
    await recordAudit(user, "QUESTION_BULK_UPDATE", "QUESTION", undefined, {
      count: todo.length,
      retyped: todo.map((q) => ({ id: q.id, from: q.type, to: changes.get(q.id) })),
    });
  }
  return { count: todo.length, skipped };
});
