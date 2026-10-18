import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const updateSubjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  code: z.string().trim().max(40).optional().default(""),
});

export const PATCH = route(async (req, params) => {
  const { id: classId, subjectId } = params;
  const data = await body(req, updateSubjectSchema);

  const existing = await prisma.classSubject.findFirst({
    where: { id: subjectId, classId },
  });
  if (!existing) throw new HttpError(404, "Subject not found in this class");

  const updated = await prisma.classSubject.update({
    where: { id: subjectId },
    data: {
      name: data.name,
      code: data.code,
    },
  });

  return updated;
});

export const DELETE = route(async (_req, params) => {
  const { id: classId, subjectId } = params;

  const existing = await prisma.classSubject.findFirst({
    where: { id: subjectId, classId },
  });
  if (!existing) throw new HttpError(404, "Subject not found in this class");

  await prisma.classSubject.delete({
    where: { id: subjectId },
  });

  return { ok: true, deletedId: subjectId };
});
