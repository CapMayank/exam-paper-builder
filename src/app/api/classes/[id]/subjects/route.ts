import { body, HttpError, route, type SessionUser } from "@/lib/api";
import { canManageClassSettings } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { classSubjectSchema } from "@/lib/schemas";

async function assertCanEditClass(user: SessionUser, classId: string) {
  const existing = await prisma.academicClass.findUnique({ where: { id: classId } });
  if (!existing) throw new HttpError(404, "Class not found");
  if (!canManageClassSettings(user, existing.name)) {
    throw new HttpError(403, `Only an Administrator or the Class In-charge of ${existing.name} can change its settings.`);
  }
  return existing;
}

export const POST = route(
  async (req, params, user) => {
    const classId = params.id;
    const data = await body(req, classSubjectSchema);
    await assertCanEditClass(user, classId);

    const subject = await prisma.classSubject.upsert({
      where: {
        classId_name: {
          classId,
          name: data.name.trim(),
        },
      },
      update: {
        code: data.code?.trim() || "",
      },
      create: {
        classId,
        name: data.name.trim(),
        code: data.code?.trim() || "",
      },
    });

    return subject;
  },
  { roles: ["ADMIN", "TEACHER"] },
);
