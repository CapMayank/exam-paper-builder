import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";
import { inferClassOrder, toAcademicClassDto } from "@/lib/classes";
import { prisma } from "@/lib/prisma";
import { classSubjectSchema } from "@/lib/schemas";

const patchClassSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  stream: z.string().trim().max(40).optional(),
  sections: z.array(z.string().trim().min(1).max(20)).optional(),
  addSubject: classSubjectSchema.optional(),
  updateSubject: z
    .object({
      id: z.string().min(1),
      name: z.string().trim().min(1).max(80),
      code: z.string().trim().max(40).optional().default(""),
    })
    .optional(),
  removeSubjectId: z.string().min(1).optional(),
});

export const PATCH = route(async (req, { id }) => {
  const data = await body(req, patchClassSchema);

  const existing = await prisma.academicClass.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Class not found");

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
        ...(data.sections !== undefined ? { sectionsJson: JSON.stringify(data.sections) } : {}),
      },
    });
  }

  const updated = await prisma.academicClass.findUniqueOrThrow({
    where: { id },
    include: { subjects: { orderBy: { name: "asc" } } },
  });

  return toAcademicClassDto(updated);
});

export const DELETE = route(async (_req, { id }) => {
  const existing = await prisma.academicClass.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Class not found");

  await prisma.academicClass.delete({ where: { id } });
  return { ok: true };
});
