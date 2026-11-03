import { body, HttpError, route, type SessionUser } from "@/lib/api";
import { inferClassOrder, normalizeSectionDetails, toAcademicClassDto } from "@/lib/classes";
import { canManageClassSettings, isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { patchClassSchema } from "@/lib/schemas";

async function assertCanEditClass(user: SessionUser, classId: string) {
  const existing = await prisma.academicClass.findUnique({ where: { id: classId } });
  if (!existing) throw new HttpError(404, "Class not found");
  if (!canManageClassSettings(user, existing.name)) {
    throw new HttpError(403, `Only an Administrator or the Class In-charge of ${existing.name} can change its settings.`);
  }
  return existing;
}

export const PATCH = route(
  async (req, { id }, user) => {
  const data = await body(req, patchClassSchema);

  const existing = await assertCanEditClass(user, id);
  // Renaming a class re-keys its books and teacher assignments, so it stays with the Admin.
  if (data.name !== undefined && data.name !== existing.name && !isAdmin(user)) {
    throw new HttpError(403, "Only an Administrator can rename a class.");
  }

  if (data.addSubject) {
    await prisma.classSubject.upsert({
      where: {
        classId_name: {
          classId: id,
          name: data.addSubject.name,
        },
      },
      update: {
        code: data.addSubject.code || "",
      },
      create: {
        classId: id,
        name: data.addSubject.name,
        code: data.addSubject.code || "",
      },
    });
  }

  if (data.updateSubject) {
    await prisma.classSubject.update({
      where: { id: data.updateSubject.id },
      data: {
        name: data.updateSubject.name,
        code: data.updateSubject.code || "",
      },
    });
  }

  if (data.removeSubjectId) {
    await prisma.classSubject.deleteMany({
      where: { id: data.removeSubjectId, classId: id },
    });
  }

  if (data.name !== undefined || data.stream !== undefined || data.sections !== undefined) {
    await prisma.academicClass.update({
      where: { id },
      data: {
        ...(data.name !== undefined
          ? { name: data.name, displayOrder: inferClassOrder(data.name) }
          : {}),
        ...(data.stream !== undefined ? { stream: data.stream } : {}),
        ...(data.sections !== undefined
          ? { sectionsJson: JSON.stringify(normalizeSectionDetails(data.sections)) }
          : {}),
      },
    });
  }

  const updated = await prisma.academicClass.findUniqueOrThrow({
    where: { id },
    include: { subjects: { orderBy: { name: "asc" } } },
  });

  return toAcademicClassDto(updated);
  },
  { roles: ["ADMIN", "TEACHER"] },
);

export const DELETE = route(
  async (_req, { id }) => {
    const existing = await prisma.academicClass.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Class not found");

    await prisma.academicClass.delete({ where: { id } });
    return { ok: true };
  },
  { roles: ["ADMIN"] },
);
