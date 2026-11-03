import { z } from "zod";
import { body, HttpError, route, type SessionUser } from "@/lib/api";
import { canManageClassSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

async function assertCanEditClass(user: SessionUser, classId: string) {
  const existing = await prisma.academicClass.findUnique({ where: { id: classId } });
  if (!existing) throw new HttpError(404, "Class not found");
  if (!canManageClassSettings(user, existing.name)) {
    throw new HttpError(403, `Only an Administrator or the Class In-charge of ${existing.name} can change its settings.`);
  }
  return existing;
}

const updateSubjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  code: z.string().trim().max(40).optional().default(""),
});

export const PATCH = route(
  async (req, params, user) => {
    const { id: classId, subjectId } = params;
    const data = await body(req, updateSubjectSchema);
    await assertCanEditClass(user, classId);

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
  },
  { roles: ["ADMIN", "TEACHER"] },
);

export const DELETE = route(
  async (_req, params, user) => {
    const { id: classId, subjectId } = params;
    await assertCanEditClass(user, classId);

    const existing = await prisma.classSubject.findFirst({
      where: { id: subjectId, classId },
    });
    if (!existing) throw new HttpError(404, "Subject not found in this class");

    await prisma.classSubject.delete({
      where: { id: subjectId },
    });

    return { ok: true, deletedId: subjectId };
  },
  { roles: ["ADMIN", "TEACHER"] },
);
